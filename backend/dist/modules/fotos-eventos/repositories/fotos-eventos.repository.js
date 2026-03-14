import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { toOptionalDate, trimOrUndefined } from "../../../utils/string-utils.js";
function normalizarTags(tags) {
    if (!tags)
        return [];
    const lista = Array.isArray(tags) ? tags : tags.split(",");
    return lista
        .map((item) => item.trim())
        .filter(Boolean);
}
function calcularTamanhoBytes(base64) {
    if (!/^[a-zA-Z0-9+/=\r\n]+$/.test(base64) && !base64.startsWith("data:")) {
        return 0;
    }
    const semPrefixo = base64.includes(",") ? base64.split(",")[1] : base64;
    const tamanho = Math.ceil((semPrefixo.length * 3) / 4);
    return Number.isFinite(tamanho) ? tamanho : 0;
}
function montarArquivoPersistido(upload) {
    if (upload.conteudo.startsWith("data:"))
        return upload.conteudo;
    if (!/^[a-zA-Z0-9+/=\r\n]+$/.test(upload.conteudo))
        return upload.conteudo;
    return `data:${upload.contentType};base64,${upload.conteudo}`;
}
export class FotosEventosRepository {
    async listar(filtros) {
        const where = [];
        const busca = trimOrUndefined(filtros.busca);
        if (busca) {
            where.push(Prisma.sql `AND (
          e.titulo ILIKE ${`%${busca}%`}
          OR COALESCE(e.descricao, '') ILIKE ${`%${busca}%`}
          OR COALESCE(e.local, '') ILIKE ${`%${busca}%`}
        )`);
        }
        const dataInicio = toOptionalDate(filtros.dataInicio);
        if (dataInicio) {
            where.push(Prisma.sql `AND e.data_evento >= ${dataInicio}`);
        }
        const dataFim = toOptionalDate(filtros.dataFim);
        if (dataFim) {
            where.push(Prisma.sql `AND e.data_evento <= ${dataFim}`);
        }
        const unidadeId = Number(filtros.unidadeId);
        if (Number.isInteger(unidadeId) && unidadeId > 0) {
            where.push(Prisma.sql `AND e.unidade_id = ${BigInt(unidadeId)}`);
        }
        const status = trimOrUndefined(filtros.status);
        if (status) {
            where.push(Prisma.sql `AND e.status = ${status}`);
        }
        const tags = normalizarTags(filtros.tags);
        for (const tag of tags) {
            where.push(Prisma.sql `AND COALESCE(e.tags, '') ILIKE ${`%${tag}%`}`);
        }
        const whereClause = where.length === 0
            ? Prisma.empty
            : where.length === 1
                ? where[0]
                : Prisma.sql `${Prisma.join(where, " ")}`;
        const tamanho = Math.max(1, Math.min(Number(filtros.tamanho) || 12, 50));
        const pagina = Math.max(0, Number(filtros.pagina) || 0);
        const offset = pagina * tamanho;
        const ordenacao = trimOrUndefined(filtros.ordenacao) ?? "MAIS_RECENTE";
        const orderClause = ordenacao === "MAIS_ANTIGO"
            ? Prisma.sql `ORDER BY e.data_evento ASC, e.id ASC`
            : ordenacao === "A_Z"
                ? Prisma.sql `ORDER BY e.titulo ASC, e.id DESC`
                : ordenacao === "Z_A"
                    ? Prisma.sql `ORDER BY e.titulo DESC, e.id DESC`
                    : ordenacao === "MAIS_FOTOS"
                        ? Prisma.sql `ORDER BY total_fotos DESC, e.id DESC`
                        : Prisma.sql `ORDER BY e.data_evento DESC, e.id DESC`;
        const totalRows = await prisma.$queryRaw(Prisma.sql `
      SELECT COUNT(*)::bigint AS total
      FROM fotos_eventos e
      WHERE 1 = 1
      ${whereClause}
    `);
        const total = Number(totalRows[0]?.total ?? 0);
        const eventos = await prisma.$queryRaw(Prisma.sql `
      SELECT
        e.id,
        e.unidade_id,
        e.titulo,
        e.descricao,
        e.data_evento,
        e.local,
        e.status,
        e.tags,
        e.foto_principal_id,
        e.criado_em,
        e.atualizado_em,
        COALESCE((
          SELECT COUNT(*)::bigint
          FROM fotos_eventos_itens fi
          WHERE fi.evento_id = e.id
        ), 0) AS total_fotos,
        principal.arquivo AS foto_principal_url
      FROM fotos_eventos e
      LEFT JOIN fotos_eventos_itens principal ON principal.id = e.foto_principal_id
      WHERE 1 = 1
      ${whereClause}
      ${orderClause}
      LIMIT ${tamanho}
      OFFSET ${offset}
    `);
        return { eventos, total, pagina, tamanho };
    }
    async buscarPorId(id) {
        const eventos = await prisma.$queryRaw(Prisma.sql `
      SELECT
        id,
        unidade_id,
        titulo,
        descricao,
        data_evento,
        local,
        status,
        tags,
        foto_principal_id,
        criado_em,
        atualizado_em
      FROM fotos_eventos
      WHERE id = ${id}
      LIMIT 1
    `);
        const evento = eventos[0];
        if (!evento)
            return null;
        const fotos = await this.listarFotosEvento(id);
        return { evento, fotos };
    }
    async buscarPorIdOuFalhar(id) {
        const registro = await this.buscarPorId(id);
        if (!registro) {
            throw new AppError("Evento de fotos nao encontrado.", 404);
        }
        return registro;
    }
    async criar(input) {
        const id = await prisma.$transaction(async (tx) => {
            const inserted = await tx.$queryRaw(Prisma.sql `
        INSERT INTO fotos_eventos (
          unidade_id,
          titulo,
          descricao,
          data_evento,
          local,
          status,
          tags,
          criado_em,
          atualizado_em
        ) VALUES (
          ${input.unidadeId ? BigInt(input.unidadeId) : null},
          ${input.titulo},
          ${trimOrUndefined(input.descricao ?? undefined)},
          ${toOptionalDate(input.dataEvento)},
          ${trimOrUndefined(input.local ?? undefined)},
          ${trimOrUndefined(input.status ?? undefined) ?? "PLANEJADO"},
          ${normalizarTags(input.tags).join(",")},
          NOW(),
          NOW()
        )
        RETURNING id
      `);
            const eventoId = inserted[0]?.id;
            if (!eventoId) {
                throw new AppError("Nao foi possivel criar o evento de fotos.", 500);
            }
            await this.salvarTags(tx, eventoId, normalizarTags(input.tags));
            if (input.fotoPrincipalUpload) {
                const foto = await this.inserirFoto(tx, eventoId, {
                    arquivo: input.fotoPrincipalUpload,
                    legenda: "Foto principal",
                    ordem: 0
                });
                await tx.$executeRaw(Prisma.sql `
          UPDATE fotos_eventos
          SET foto_principal_id = ${foto.id}
          WHERE id = ${eventoId}
        `);
            }
            else if (input.fotoPrincipalId) {
                await this.definirFotoPrincipal(tx, eventoId, BigInt(input.fotoPrincipalId));
            }
            return eventoId;
        });
        return this.buscarPorIdOuFalhar(id);
    }
    async atualizar(id, input) {
        await this.buscarPorIdOuFalhar(id);
        await prisma.$transaction(async (tx) => {
            await tx.$executeRaw(Prisma.sql `
        UPDATE fotos_eventos
        SET
          unidade_id = ${input.unidadeId ? BigInt(input.unidadeId) : null},
          titulo = ${input.titulo},
          descricao = ${trimOrUndefined(input.descricao ?? undefined)},
          data_evento = ${toOptionalDate(input.dataEvento)},
          local = ${trimOrUndefined(input.local ?? undefined)},
          status = ${trimOrUndefined(input.status ?? undefined) ?? "PLANEJADO"},
          tags = ${normalizarTags(input.tags).join(",")},
          atualizado_em = NOW()
        WHERE id = ${id}
      `);
            await this.salvarTags(tx, id, normalizarTags(input.tags));
            if (input.fotoPrincipalUpload) {
                const foto = await this.inserirFoto(tx, id, {
                    arquivo: input.fotoPrincipalUpload,
                    legenda: "Foto principal",
                    ordem: 0
                });
                await tx.$executeRaw(Prisma.sql `
          UPDATE fotos_eventos
          SET foto_principal_id = ${foto.id}
          WHERE id = ${id}
        `);
            }
            else if (input.fotoPrincipalId) {
                await this.definirFotoPrincipal(tx, id, BigInt(input.fotoPrincipalId));
            }
        });
        return this.buscarPorIdOuFalhar(id);
    }
    async remover(id) {
        await this.buscarPorIdOuFalhar(id);
        await prisma.$executeRaw(Prisma.sql `
      DELETE FROM fotos_eventos
      WHERE id = ${id}
    `);
    }
    async listarFotosEvento(eventoId) {
        return prisma.$queryRaw(Prisma.sql `
      SELECT
        id,
        evento_id,
        arquivo,
        nome_arquivo,
        mime_type,
        tamanho_bytes,
        largura,
        altura,
        legenda,
        creditos,
        tags,
        ordem,
        criado_em,
        atualizado_em
      FROM fotos_eventos_itens
      WHERE evento_id = ${eventoId}
      ORDER BY COALESCE(ordem, 9999) ASC, id ASC
    `);
    }
    async buscarFotoPorId(eventoId, fotoId) {
        const rows = await prisma.$queryRaw(Prisma.sql `
      SELECT
        id,
        evento_id,
        arquivo,
        nome_arquivo,
        mime_type,
        tamanho_bytes,
        largura,
        altura,
        legenda,
        creditos,
        tags,
        ordem,
        criado_em,
        atualizado_em
      FROM fotos_eventos_itens
      WHERE evento_id = ${eventoId}
        AND id = ${fotoId}
      LIMIT 1
    `);
        return rows[0] ?? null;
    }
    async buscarFotoPorIdOuFalhar(eventoId, fotoId) {
        const foto = await this.buscarFotoPorId(eventoId, fotoId);
        if (!foto) {
            throw new AppError("Foto do evento nao encontrada.", 404);
        }
        return foto;
    }
    async adicionarFoto(eventoId, input) {
        await this.buscarPorIdOuFalhar(eventoId);
        const foto = await prisma.$transaction(async (tx) => this.inserirFoto(tx, eventoId, input));
        return this.buscarFotoPorIdOuFalhar(eventoId, foto.id);
    }
    async atualizarFoto(eventoId, fotoId, input) {
        await this.buscarFotoPorIdOuFalhar(eventoId, fotoId);
        await prisma.$executeRaw(Prisma.sql `
      UPDATE fotos_eventos_itens
      SET
        legenda = ${trimOrUndefined(input.legenda ?? undefined)},
        creditos = ${trimOrUndefined(input.creditos ?? undefined)},
        tags = ${normalizarTags(input.tags).join(",")},
        ordem = ${input.ordem ?? null},
        atualizado_em = NOW()
      WHERE evento_id = ${eventoId}
        AND id = ${fotoId}
    `);
        return this.buscarFotoPorIdOuFalhar(eventoId, fotoId);
    }
    async removerFoto(eventoId, fotoId) {
        await this.buscarFotoPorIdOuFalhar(eventoId, fotoId);
        await prisma.$transaction(async (tx) => {
            await tx.$executeRaw(Prisma.sql `
        DELETE FROM fotos_eventos_itens
        WHERE evento_id = ${eventoId}
          AND id = ${fotoId}
      `);
            await tx.$executeRaw(Prisma.sql `
        UPDATE fotos_eventos
        SET foto_principal_id = NULL
        WHERE id = ${eventoId}
          AND foto_principal_id = ${fotoId}
      `);
        });
    }
    async inserirFoto(tx, eventoId, input) {
        const arquivo = montarArquivoPersistido(input.arquivo);
        const tamanhoBytes = input.arquivo.tamanhoBytes ?? calcularTamanhoBytes(input.arquivo.conteudo);
        const inserted = await tx.$queryRaw(Prisma.sql `
      INSERT INTO fotos_eventos_itens (
        evento_id,
        arquivo,
        nome_arquivo,
        mime_type,
        tamanho_bytes,
        legenda,
        creditos,
        tags,
        ordem,
        criado_em,
        atualizado_em
      ) VALUES (
        ${eventoId},
        ${arquivo},
        ${input.arquivo.nomeArquivo},
        ${input.arquivo.contentType},
        ${tamanhoBytes},
        ${trimOrUndefined(input.legenda ?? undefined)},
        ${trimOrUndefined(input.creditos ?? undefined)},
        ${normalizarTags(input.tags).join(",")},
        ${input.ordem ?? null},
        NOW(),
        NOW()
      )
      RETURNING id
    `);
        const fotoId = inserted[0]?.id;
        if (!fotoId) {
            throw new AppError("Nao foi possivel adicionar foto ao evento.", 500);
        }
        return { id: fotoId };
    }
    async definirFotoPrincipal(tx, eventoId, fotoPrincipalId) {
        const rows = await tx.$queryRaw(Prisma.sql `
      SELECT id
      FROM fotos_eventos_itens
      WHERE id = ${fotoPrincipalId}
        AND evento_id = ${eventoId}
      LIMIT 1
    `);
        if (!rows.length) {
            throw new AppError("Foto principal informada nao pertence ao evento.", 400);
        }
        await tx.$executeRaw(Prisma.sql `
      UPDATE fotos_eventos
      SET foto_principal_id = ${fotoPrincipalId}
      WHERE id = ${eventoId}
    `);
    }
    async salvarTags(tx, eventoId, tags) {
        await tx.$executeRaw(Prisma.sql `
      DELETE FROM fotos_eventos_tags
      WHERE evento_id = ${eventoId}
    `);
        for (const tag of tags) {
            await tx.$executeRaw(Prisma.sql `
        INSERT INTO fotos_eventos_tags (
          evento_id,
          tag
        ) VALUES (
          ${eventoId},
          ${tag}
        )
      `);
        }
    }
}
