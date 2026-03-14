import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { ensureArquivosEstrutura } from "./arquivos-estrutura.repository.js";
export class ArquivosRepository {
    async criar(input) {
        await ensureArquivosEstrutura(prisma);
        const rows = await prisma.$queryRaw(Prisma.sql `
      INSERT INTO arquivos (
        entidade_tipo,
        entidade_id,
        categoria,
        nome_original,
        nome_arquivo,
        caminho_arquivo,
        thumbnail_caminho,
        mime_type,
        extensao,
        tamanho_bytes,
        data_upload,
        usuario_upload_id,
        ativo,
        observacao,
        metadados_json,
        criado_em,
        atualizado_em
      ) VALUES (
        ${input.entidadeTipo},
        ${input.entidadeId ?? null},
        ${input.categoria},
        ${input.nomeOriginal},
        ${input.nomeArquivo},
        ${input.caminhoArquivo},
        ${input.thumbnailCaminho ?? null},
        ${input.mimeType},
        ${input.extensao ?? null},
        ${BigInt(Math.max(0, input.tamanhoBytes))},
        NOW(),
        ${input.usuarioUploadId ?? null},
        TRUE,
        ${input.observacao ?? null},
        ${input.metadadosJson ? JSON.stringify(input.metadadosJson) : null}::jsonb,
        NOW(),
        NOW()
      )
      RETURNING
        id,
        entidade_tipo,
        entidade_id,
        categoria,
        nome_original,
        nome_arquivo,
        caminho_arquivo,
        thumbnail_caminho,
        mime_type,
        extensao,
        tamanho_bytes,
        data_upload,
        usuario_upload_id,
        ativo,
        observacao,
        metadados_json,
        criado_em,
        atualizado_em,
        excluido_em
    `);
        const arquivo = rows[0];
        if (!arquivo) {
            throw new AppError("Nao foi possivel registrar os metadados do arquivo.", 500);
        }
        return arquivo;
    }
    async listar(filters) {
        await ensureArquivosEstrutura(prisma);
        const clauses = [Prisma.sql `1 = 1`];
        if (filters.entidadeTipo) {
            clauses.push(Prisma.sql `entidade_tipo = ${filters.entidadeTipo}`);
        }
        if (typeof filters.entidadeId === "bigint") {
            clauses.push(Prisma.sql `entidade_id = ${filters.entidadeId}`);
        }
        if (filters.categoria) {
            clauses.push(Prisma.sql `categoria = ${filters.categoria}`);
        }
        if (typeof filters.ativo === "boolean") {
            clauses.push(Prisma.sql `ativo = ${filters.ativo}`);
        }
        return prisma.$queryRaw(Prisma.sql `
      SELECT
        id,
        entidade_tipo,
        entidade_id,
        categoria,
        nome_original,
        nome_arquivo,
        caminho_arquivo,
        thumbnail_caminho,
        mime_type,
        extensao,
        tamanho_bytes,
        data_upload,
        usuario_upload_id,
        ativo,
        observacao,
        metadados_json,
        criado_em,
        atualizado_em,
        excluido_em
      FROM arquivos
      WHERE ${Prisma.join(clauses, " AND ")}
      ORDER BY data_upload DESC, id DESC
    `);
    }
    async buscarPorId(id) {
        await ensureArquivosEstrutura(prisma);
        const rows = await prisma.$queryRaw(Prisma.sql `
      SELECT
        id,
        entidade_tipo,
        entidade_id,
        categoria,
        nome_original,
        nome_arquivo,
        caminho_arquivo,
        thumbnail_caminho,
        mime_type,
        extensao,
        tamanho_bytes,
        data_upload,
        usuario_upload_id,
        ativo,
        observacao,
        metadados_json,
        criado_em,
        atualizado_em,
        excluido_em
      FROM arquivos
      WHERE id = ${id}
      LIMIT 1
    `);
        return rows[0] ?? null;
    }
    async buscarPorIdOuFalhar(id) {
        const arquivo = await this.buscarPorId(id);
        if (!arquivo) {
            throw new AppError("Arquivo nao encontrado.", 404);
        }
        return arquivo;
    }
    async buscarAtivoPorCaminho(caminhoArquivo) {
        await ensureArquivosEstrutura(prisma);
        const rows = await prisma.$queryRaw(Prisma.sql `
      SELECT
        id,
        entidade_tipo,
        entidade_id,
        categoria,
        nome_original,
        nome_arquivo,
        caminho_arquivo,
        thumbnail_caminho,
        mime_type,
        extensao,
        tamanho_bytes,
        data_upload,
        usuario_upload_id,
        ativo,
        observacao,
        metadados_json,
        criado_em,
        atualizado_em,
        excluido_em
      FROM arquivos
      WHERE caminho_arquivo = ${caminhoArquivo}
        AND ativo = TRUE
      LIMIT 1
    `);
        return rows[0] ?? null;
    }
    async vincularEntidadePorCaminho(caminhoArquivo, entidadeId) {
        await ensureArquivosEstrutura(prisma);
        await prisma.$executeRaw(Prisma.sql `
      UPDATE arquivos
      SET entidade_id = ${entidadeId},
          atualizado_em = NOW()
      WHERE caminho_arquivo = ${caminhoArquivo}
    `);
    }
    async desativarPorId(id) {
        await ensureArquivosEstrutura(prisma);
        await prisma.$executeRaw(Prisma.sql `
      UPDATE arquivos
      SET ativo = FALSE,
          excluido_em = COALESCE(excluido_em, NOW()),
          atualizado_em = NOW()
      WHERE id = ${id}
    `);
    }
    async desativarPorCaminho(caminhoArquivo) {
        await ensureArquivosEstrutura(prisma);
        await prisma.$executeRaw(Prisma.sql `
      UPDATE arquivos
      SET ativo = FALSE,
          excluido_em = COALESCE(excluido_em, NOW()),
          atualizado_em = NOW()
      WHERE caminho_arquivo = ${caminhoArquivo}
    `);
    }
    async registrarAuditoria(payload) {
        try {
            await prisma.$executeRawUnsafe(`
          INSERT INTO auditoria_evento (usuario_id, acao, entidade, entidade_id, dados_json, criado_em)
          VALUES ($1, $2, 'ARQUIVO', $3, $4::jsonb, NOW())
        `, payload.atorId ?? null, payload.acao, payload.entidadeId, JSON.stringify(payload.dados));
        }
        catch (error) {
            console.warn("[arquivos] nao foi possivel registrar auditoria:", error);
        }
    }
}
