import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { toOptionalDate, trimOrUndefined } from "../../../utils/string-utils.js";
import type {
  FotoEventoFiltros,
  FotoEventoFotoAtualizacaoInput,
  FotoEventoFotoInput,
  FotoEventoFotosLoteInput,
  FotoEventoInput,
  FotoEventoItemRow,
  FotoEventoRow
} from "../fotos-eventos.types.js";

type TransactionClient = Prisma.TransactionClient;

function normalizarTags(tags?: string[] | string | null) {
  if (!tags) return [];
  const lista = Array.isArray(tags) ? tags : tags.split(",");
  return lista
    .map((item) => item.trim())
    .filter(Boolean);
}

function calcularTamanhoBytes(base64: string) {
  if (!/^[a-zA-Z0-9+/=\r\n]+$/.test(base64) && !base64.startsWith("data:")) {
    return 0;
  }
  const semPrefixo = base64.includes(",") ? base64.split(",")[1] : base64;
  const tamanho = Math.ceil((semPrefixo.length * 3) / 4);
  return Number.isFinite(tamanho) ? tamanho : 0;
}

function montarArquivoPersistido(upload: { contentType: string; conteudo: string }) {
  if (upload.conteudo.startsWith("data:")) return upload.conteudo;
  if (!/^[a-zA-Z0-9+/=\r\n]+$/.test(upload.conteudo)) return upload.conteudo;
  return `data:${upload.contentType};base64,${upload.conteudo}`;
}

const estruturaSql = [
  "ALTER TABLE fotos_eventos ADD COLUMN IF NOT EXISTS tenant_id UUID",
  "ALTER TABLE fotos_eventos_itens ADD COLUMN IF NOT EXISTS tenant_id UUID",
  "ALTER TABLE fotos_eventos_tags ADD COLUMN IF NOT EXISTS tenant_id UUID",
  "CREATE INDEX IF NOT EXISTS fotos_eventos_tenant_idx ON fotos_eventos(tenant_id, data_evento DESC, id DESC)",
  "CREATE INDEX IF NOT EXISTS fotos_eventos_itens_tenant_idx ON fotos_eventos_itens(tenant_id, evento_id, ordem, id)",
  "CREATE INDEX IF NOT EXISTS fotos_eventos_tags_tenant_idx ON fotos_eventos_tags(tenant_id, evento_id, tag)",
  `
    UPDATE fotos_eventos AS e
    SET tenant_id = ua.tenant_id
    FROM unidade_assistencial ua
    WHERE e.unidade_id = ua.id
      AND ua.tenant_id IS NOT NULL
      AND (e.tenant_id IS NULL OR e.tenant_id <> ua.tenant_id)
  `,
  `
    UPDATE fotos_eventos AS e
    SET tenant_id = ref.tenant_id
    FROM (
      SELECT tenant_id
      FROM instituicoes
      ORDER BY criado_em ASC
      LIMIT 1
    ) ref
    WHERE e.tenant_id IS NULL
  `,
  `
    UPDATE arquivos AS a
    SET tenant_id = e.tenant_id
    FROM fotos_eventos e
    WHERE a.entidade_tipo = 'evento'
      AND a.entidade_id = e.id
      AND e.tenant_id IS NOT NULL
      AND (a.tenant_id IS NULL OR a.tenant_id <> e.tenant_id)
  `,
  `
    UPDATE fotos_eventos_itens AS fi
    SET tenant_id = e.tenant_id
    FROM fotos_eventos e
    WHERE e.id = fi.evento_id
      AND e.tenant_id IS NOT NULL
      AND (fi.tenant_id IS NULL OR fi.tenant_id <> e.tenant_id)
  `,
  `
    UPDATE fotos_eventos_itens AS fi
    SET tenant_id = e.tenant_id
    FROM fotos_eventos e
    WHERE fi.tenant_id IS NULL
      AND e.id = fi.evento_id
      AND e.tenant_id IS NOT NULL
  `,
  `
    UPDATE fotos_eventos_tags AS ft
    SET tenant_id = e.tenant_id
    FROM fotos_eventos e
    WHERE e.id = ft.evento_id
      AND e.tenant_id IS NOT NULL
      AND (ft.tenant_id IS NULL OR ft.tenant_id <> e.tenant_id)
  `,
  `
    UPDATE fotos_eventos_tags AS ft
    SET tenant_id = e.tenant_id
    FROM fotos_eventos e
    WHERE ft.tenant_id IS NULL
      AND e.id = ft.evento_id
      AND e.tenant_id IS NOT NULL
  `
] as const;

let estruturaPromise: Promise<void> | null = null;

export class FotosEventosRepository {
  private async ensureEstrutura() {
    if (!estruturaPromise) {
      estruturaPromise = (async () => {
        for (const sql of estruturaSql) {
          await prisma.$executeRawUnsafe(sql);
        }
      })().catch((error) => {
        estruturaPromise = null;
        throw error;
      });
    }

    await estruturaPromise;
  }

  private async repararFotosPrincipaisAusentes(tenantId: string) {
    await prisma.$executeRaw(Prisma.sql`
      UPDATE fotos_eventos e
      SET foto_principal_id = (
            SELECT fi.id
            FROM fotos_eventos_itens fi
            WHERE fi.evento_id = e.id
              AND fi.tenant_id::text = ${tenantId}
            ORDER BY COALESCE(fi.ordem, 9999) ASC, fi.id ASC
            LIMIT 1
          ),
          atualizado_em = NOW()
      WHERE e.tenant_id::text = ${tenantId}
        AND e.foto_principal_id IS NULL
        AND EXISTS (
          SELECT 1
          FROM fotos_eventos_itens fi
          WHERE fi.evento_id = e.id
            AND fi.tenant_id::text = ${tenantId}
        )
    `);

    await prisma.$executeRaw(Prisma.sql`
      UPDATE fotos_eventos e
      SET foto_principal_id = (
            SELECT fi.id
            FROM fotos_eventos_itens fi
            WHERE fi.evento_id = e.id
              AND fi.tenant_id::text = ${tenantId}
            ORDER BY COALESCE(fi.ordem, 9999) ASC, fi.id ASC
            LIMIT 1
          ),
          atualizado_em = NOW()
      WHERE e.tenant_id::text = ${tenantId}
        AND e.foto_principal_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM fotos_eventos_itens fi
          WHERE fi.evento_id = e.id
            AND fi.tenant_id::text = ${tenantId}
        )
        AND NOT EXISTS (
          SELECT 1
          FROM fotos_eventos_itens atual
          WHERE atual.id = e.foto_principal_id
            AND atual.evento_id = e.id
            AND atual.tenant_id::text = ${tenantId}
        )
    `);
  }

  async listar(filtros: FotoEventoFiltros, tenantId: string) {
    await this.ensureEstrutura();
    await this.repararFotosPrincipaisAusentes(tenantId);
    const where: Prisma.Sql[] = [Prisma.sql`e.tenant_id::text = ${tenantId}`];

    const busca = trimOrUndefined(filtros.busca);
    if (busca) {
      where.push(
        Prisma.sql`(
          e.titulo ILIKE ${`%${busca}%`}
          OR COALESCE(e.descricao, '') ILIKE ${`%${busca}%`}
          OR COALESCE(e.local, '') ILIKE ${`%${busca}%`}
        )`
      );
    }

    const dataInicio = toOptionalDate(filtros.dataInicio);
    if (dataInicio) {
      where.push(Prisma.sql`e.data_evento >= ${dataInicio}`);
    }

    const dataFim = toOptionalDate(filtros.dataFim);
    if (dataFim) {
      where.push(Prisma.sql`e.data_evento <= ${dataFim}`);
    }

    const unidadeId = Number(filtros.unidadeId);
    if (Number.isInteger(unidadeId) && unidadeId > 0) {
      where.push(Prisma.sql`e.unidade_id = ${BigInt(unidadeId)}`);
    }

    const status = trimOrUndefined(filtros.status);
    if (status) {
      where.push(Prisma.sql`e.status = ${status}`);
    }

    const tags = normalizarTags(filtros.tags);
    for (const tag of tags) {
      where.push(Prisma.sql`COALESCE(e.tags, '') ILIKE ${`%${tag}%`}`);
    }

    const whereClause = Prisma.join(where, " AND ");

    const tamanho = Math.max(1, Math.min(Number(filtros.tamanho) || 12, 50));
    const pagina = Math.max(0, Number(filtros.pagina) || 0);
    const offset = pagina * tamanho;
    const ordenacao = trimOrUndefined(filtros.ordenacao) ?? "MAIS_RECENTE";

    const orderClause =
      ordenacao === "MAIS_ANTIGO"
        ? Prisma.sql`ORDER BY e.data_evento ASC, e.id ASC`
        : ordenacao === "A_Z"
          ? Prisma.sql`ORDER BY e.titulo ASC, e.id DESC`
          : ordenacao === "Z_A"
            ? Prisma.sql`ORDER BY e.titulo DESC, e.id DESC`
            : ordenacao === "MAIS_FOTOS"
              ? Prisma.sql`ORDER BY total_fotos DESC, e.id DESC`
              : Prisma.sql`ORDER BY e.data_evento DESC, e.id DESC`;

    const totalRows = await prisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`
      SELECT COUNT(*)::bigint AS total
      FROM fotos_eventos e
      WHERE ${whereClause}
    `);
    const total = Number(totalRows[0]?.total ?? 0);

    const eventos = await prisma.$queryRaw<
      Array<
        FotoEventoRow & {
          total_fotos: bigint;
          foto_principal_url: string | null;
        }
      >
    >(Prisma.sql`
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
            AND fi.tenant_id::text = ${tenantId}
        ), 0) AS total_fotos,
        COALESCE(principal.arquivo, primeira_foto.arquivo) AS foto_principal_url
      FROM fotos_eventos e
      LEFT JOIN fotos_eventos_itens principal
        ON principal.id = e.foto_principal_id
       AND principal.tenant_id::text = ${tenantId}
      LEFT JOIN LATERAL (
        SELECT fi.arquivo
        FROM fotos_eventos_itens fi
        WHERE fi.evento_id = e.id
          AND fi.tenant_id::text = ${tenantId}
        ORDER BY COALESCE(fi.ordem, 9999) ASC, fi.id ASC
        LIMIT 1
      ) primeira_foto ON TRUE
      WHERE ${whereClause}
      ${orderClause}
      LIMIT ${tamanho}
      OFFSET ${offset}
    `);

    return { eventos, total, pagina, tamanho };
  }

  async resumo(tenantId: string) {
    await this.ensureEstrutura();
    await this.repararFotosPrincipaisAusentes(tenantId);
    const rows = await prisma.$queryRaw<Array<{ total_albuns: bigint; total_fotos: bigint }>>(Prisma.sql`
      SELECT
        COUNT(*)::bigint AS total_albuns,
        COALESCE((
          SELECT COUNT(*)::bigint
          FROM fotos_eventos_itens fi
          INNER JOIN fotos_eventos e ON e.id = fi.evento_id
          WHERE e.tenant_id::text = ${tenantId}
            AND fi.tenant_id::text = ${tenantId}
        ), 0::bigint) AS total_fotos
      FROM fotos_eventos e
      WHERE e.tenant_id::text = ${tenantId}
    `);

    const row = rows[0];
    return {
      totalAlbuns: Number(row?.total_albuns ?? 0n),
      totalFotos: Number(row?.total_fotos ?? 0n)
    };
  }

  async buscarPorId(id: bigint, tenantId: string) {
    await this.ensureEstrutura();
    await this.repararFotosPrincipaisAusentes(tenantId);
    const eventos = await prisma.$queryRaw<FotoEventoRow[]>(Prisma.sql`
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
        AND tenant_id::text = ${tenantId}
      LIMIT 1
    `);

    const evento = eventos[0];
    if (!evento) return null;

    const fotos = await this.listarFotosEvento(id, tenantId);
    return { evento, fotos };
  }

  async buscarPorIdOuFalhar(id: bigint, tenantId: string) {
    const registro = await this.buscarPorId(id, tenantId);
    if (!registro) {
      throw new AppError("Evento de fotos nao encontrado.", 404);
    }
    return registro;
  }

  async criar(input: FotoEventoInput, tenantId: string) {
    await this.ensureEstrutura();
    const id = await prisma.$transaction(async (tx) => {
      const inserted = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
        INSERT INTO fotos_eventos (
          tenant_id,
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
          CAST(${tenantId} AS UUID),
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

      await this.salvarTags(tx, eventoId, normalizarTags(input.tags), tenantId);

      if (input.fotoPrincipalUpload) {
        const foto = await this.inserirFoto(tx, eventoId, input.fotoPrincipalUpload ? {
          arquivo: input.fotoPrincipalUpload,
          legenda: "Foto principal",
          ordem: 0
        } : undefined as never, tenantId);
        await tx.$executeRaw(Prisma.sql`
          UPDATE fotos_eventos
          SET foto_principal_id = ${foto.id}
          WHERE id = ${eventoId}
            AND tenant_id::text = ${tenantId}
        `);
      } else if (input.fotoPrincipalId) {
        await this.definirFotoPrincipal(tx, eventoId, BigInt(input.fotoPrincipalId), tenantId);
      }

      return eventoId;
    });

    return this.buscarPorIdOuFalhar(id, tenantId);
  }

  async atualizar(id: bigint, input: FotoEventoInput, tenantId: string) {
    await this.ensureEstrutura();
    await this.buscarPorIdOuFalhar(id, tenantId);

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`
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
          AND tenant_id::text = ${tenantId}
      `);

      await this.salvarTags(tx, id, normalizarTags(input.tags), tenantId);

      if (input.fotoPrincipalUpload) {
        const foto = await this.inserirFoto(tx, id, {
          arquivo: input.fotoPrincipalUpload,
          legenda: "Foto principal",
          ordem: 0
        }, tenantId);
        await tx.$executeRaw(Prisma.sql`
          UPDATE fotos_eventos
          SET foto_principal_id = ${foto.id}
          WHERE id = ${id}
            AND tenant_id::text = ${tenantId}
        `);
      } else if (input.fotoPrincipalId) {
        await this.definirFotoPrincipal(tx, id, BigInt(input.fotoPrincipalId), tenantId);
      }
    });

    return this.buscarPorIdOuFalhar(id, tenantId);
  }

  async remover(id: bigint, tenantId: string) {
    await this.ensureEstrutura();
    await this.buscarPorIdOuFalhar(id, tenantId);
    await prisma.$executeRaw(Prisma.sql`
      DELETE FROM fotos_eventos
      WHERE id = ${id}
        AND tenant_id::text = ${tenantId}
    `);
  }

  async listarFotosEvento(eventoId: bigint, tenantId: string) {
    await this.ensureEstrutura();
    return prisma.$queryRaw<FotoEventoItemRow[]>(Prisma.sql`
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
        AND tenant_id::text = ${tenantId}
      ORDER BY COALESCE(ordem, 9999) ASC, id ASC
    `);
  }

  async buscarFotoPorId(eventoId: bigint, fotoId: bigint, tenantId: string) {
    await this.ensureEstrutura();
    const rows = await prisma.$queryRaw<FotoEventoItemRow[]>(Prisma.sql`
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
        AND tenant_id::text = ${tenantId}
      LIMIT 1
    `);
    return rows[0] ?? null;
  }

  async buscarFotoPorIdOuFalhar(eventoId: bigint, fotoId: bigint, tenantId: string) {
    const foto = await this.buscarFotoPorId(eventoId, fotoId, tenantId);
    if (!foto) {
      throw new AppError("Foto do evento nao encontrada.", 404);
    }
    return foto;
  }

  async adicionarFoto(eventoId: bigint, input: FotoEventoFotoInput, tenantId: string) {
    await this.buscarPorIdOuFalhar(eventoId, tenantId);
    const foto = await prisma.$transaction(async (tx) =>
      this.inserirFoto(tx, eventoId, input, tenantId)
    );
    return this.buscarFotoPorIdOuFalhar(eventoId, foto.id, tenantId);
  }

  async adicionarFotosLote(
    eventoId: bigint,
    input: FotoEventoFotosLoteInput,
    tenantId: string
  ): Promise<FotoEventoItemRow[]> {
    await this.buscarPorIdOuFalhar(eventoId, tenantId);

    return prisma.$transaction(async (tx) => {
      const eventoRows = await tx.$queryRaw<Array<{ foto_principal_id: bigint | null }>>(Prisma.sql`
        SELECT foto_principal_id
        FROM fotos_eventos
        WHERE id = ${eventoId}
          AND tenant_id::text = ${tenantId}
        LIMIT 1
      `);

      const fotosInseridas: bigint[] = [];
      for (const fotoInput of input.fotos) {
        const foto = await this.inserirFoto(tx, eventoId, fotoInput, tenantId);
        fotosInseridas.push(foto.id);
      }

      const indiceCapa =
        typeof input.fotoPrincipalIndex === "number" &&
        input.fotoPrincipalIndex >= 0 &&
        input.fotoPrincipalIndex < fotosInseridas.length
          ? input.fotoPrincipalIndex
          : null;

      const fotoPrincipalId =
        indiceCapa != null
          ? fotosInseridas[indiceCapa]
          : !eventoRows[0]?.foto_principal_id && fotosInseridas.length
            ? fotosInseridas[0]
            : null;

      if (fotoPrincipalId) {
        await this.definirFotoPrincipal(tx, eventoId, fotoPrincipalId, tenantId);
      }

      if (!fotosInseridas.length) {
        return [];
      }

      return tx.$queryRaw<FotoEventoItemRow[]>(Prisma.sql`
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
          AND tenant_id::text = ${tenantId}
          AND id IN (${Prisma.join(fotosInseridas)})
        ORDER BY COALESCE(ordem, 9999) ASC, id ASC
      `);
    });
  }

  async atualizarFoto(
    eventoId: bigint,
    fotoId: bigint,
    input: FotoEventoFotoAtualizacaoInput,
    tenantId: string
  ) {
    await this.buscarFotoPorIdOuFalhar(eventoId, fotoId, tenantId);
    await prisma.$executeRaw(Prisma.sql`
      UPDATE fotos_eventos_itens
      SET
        legenda = ${trimOrUndefined(input.legenda ?? undefined)},
        creditos = ${trimOrUndefined(input.creditos ?? undefined)},
        tags = ${normalizarTags(input.tags).join(",")},
        ordem = ${input.ordem ?? null},
        atualizado_em = NOW()
      WHERE evento_id = ${eventoId}
        AND id = ${fotoId}
        AND tenant_id::text = ${tenantId}
    `);
    return this.buscarFotoPorIdOuFalhar(eventoId, fotoId, tenantId);
  }

  async removerFoto(eventoId: bigint, fotoId: bigint, tenantId: string) {
    await this.buscarFotoPorIdOuFalhar(eventoId, fotoId, tenantId);
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`
        DELETE FROM fotos_eventos_itens
        WHERE evento_id = ${eventoId}
          AND id = ${fotoId}
          AND tenant_id::text = ${tenantId}
      `);
      await tx.$executeRaw(Prisma.sql`
        UPDATE fotos_eventos
        SET foto_principal_id = NULL
        WHERE id = ${eventoId}
          AND tenant_id::text = ${tenantId}
          AND foto_principal_id = ${fotoId}
      `);
    });
  }

  async definirFotoPrincipalPorId(eventoId: bigint, fotoId: bigint, tenantId: string) {
    await this.buscarPorIdOuFalhar(eventoId, tenantId);
    await prisma.$transaction(async (tx) => {
      await this.definirFotoPrincipal(tx, eventoId, fotoId, tenantId);
      await tx.$executeRaw(Prisma.sql`
        UPDATE fotos_eventos
        SET atualizado_em = NOW()
        WHERE id = ${eventoId}
          AND tenant_id::text = ${tenantId}
      `);
    });
    return this.buscarFotoPorIdOuFalhar(eventoId, fotoId, tenantId);
  }

  async reordenarFotos(eventoId: bigint, fotoIds: number[], tenantId: string) {
    await this.buscarPorIdOuFalhar(eventoId, tenantId);
    const ids = fotoIds.map((item) => BigInt(item));
    const fotos = await this.listarFotosEvento(eventoId, tenantId);
    const fotosEventoIds = new Set(fotos.map((item) => Number(item.id)));

    if (ids.some((item) => !fotosEventoIds.has(Number(item)))) {
      throw new AppError("A ordem informada contem fotos que nao pertencem ao evento.", 400);
    }

    await prisma.$transaction(async (tx) => {
      for (let index = 0; index < ids.length; index += 1) {
        await tx.$executeRaw(Prisma.sql`
          UPDATE fotos_eventos_itens
          SET ordem = ${index + 1},
              atualizado_em = NOW()
          WHERE evento_id = ${eventoId}
            AND id = ${ids[index]}
            AND tenant_id::text = ${tenantId}
        `);
      }
    });

    return this.listarFotosEvento(eventoId, tenantId);
  }

  private async inserirFoto(
    tx: TransactionClient,
    eventoId: bigint,
    input: FotoEventoFotoInput,
    tenantId: string
  ) {
    const arquivo = montarArquivoPersistido(input.arquivo);
    const tamanhoBytes = input.arquivo.tamanhoBytes ?? calcularTamanhoBytes(input.arquivo.conteudo);

    const inserted = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
      INSERT INTO fotos_eventos_itens (
        tenant_id,
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
        CAST(${tenantId} AS UUID),
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

  private async definirFotoPrincipal(
    tx: TransactionClient,
    eventoId: bigint,
    fotoPrincipalId: bigint,
    tenantId: string
  ) {
    const rows = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
      SELECT id
      FROM fotos_eventos_itens
      WHERE id = ${fotoPrincipalId}
        AND evento_id = ${eventoId}
        AND tenant_id::text = ${tenantId}
      LIMIT 1
    `);

    if (!rows.length) {
      throw new AppError("Foto principal informada nao pertence ao evento.", 400);
    }

    await tx.$executeRaw(Prisma.sql`
      UPDATE fotos_eventos
      SET foto_principal_id = ${fotoPrincipalId}
      WHERE id = ${eventoId}
        AND tenant_id::text = ${tenantId}
    `);
  }

  private async salvarTags(
    tx: TransactionClient,
    eventoId: bigint,
    tags: string[],
    tenantId: string
  ) {
    await tx.$executeRaw(Prisma.sql`
      DELETE FROM fotos_eventos_tags
      WHERE evento_id = ${eventoId}
        AND tenant_id::text = ${tenantId}
    `);

    for (const tag of tags) {
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO fotos_eventos_tags (
          tenant_id,
          evento_id,
          tag
        ) VALUES (
          CAST(${tenantId} AS UUID),
          ${eventoId},
          ${tag}
        )
      `);
    }
  }
}
