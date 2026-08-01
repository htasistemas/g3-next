import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { toOptionalDate, trimOrUndefined } from "../../../utils/string-utils.js";
import type {
  TermoAditivoInput,
  TermoAditivoRow,
  TermoDocumentoInput,
  TermoDocumentoRow,
  TermoFomentoInput,
  TermoFomentoRow
} from "../termos-fomento.types.js";

type TransactionClient = Prisma.TransactionClient;

const estruturaSql = [
  "ALTER TABLE IF EXISTS termo_fomento ADD COLUMN IF NOT EXISTS referencia_termo VARCHAR(250)",
  "ALTER TABLE IF EXISTS termo_fomento ADD COLUMN IF NOT EXISTS responsavel_indicacao VARCHAR(250)",
  "ALTER TABLE IF EXISTS termo_fomento ADD COLUMN IF NOT EXISTS tenant_id UUID",
  "ALTER TABLE IF EXISTS termo_fomento_aditivos ADD COLUMN IF NOT EXISTS tenant_id UUID",
  "ALTER TABLE IF EXISTS termo_fomento_documentos ADD COLUMN IF NOT EXISTS tenant_id UUID",
  "CREATE INDEX IF NOT EXISTS termo_fomento_tenant_idx ON termo_fomento(tenant_id, atualizado_em DESC, id DESC)",
  "CREATE INDEX IF NOT EXISTS termo_fomento_aditivos_tenant_idx ON termo_fomento_aditivos(tenant_id, termo_fomento_id, data_aditivo DESC, id DESC)",
  "CREATE INDEX IF NOT EXISTS termo_fomento_documentos_tenant_idx ON termo_fomento_documentos(tenant_id, termo_fomento_id, id DESC)",
  `UPDATE termo_fomento tf
    SET tenant_id = ref.tenant_id
    FROM (
      SELECT id AS tenant_id
      FROM instituicoes
      ORDER BY criado_em ASC NULLS LAST, id ASC
      LIMIT 1
    ) ref
    WHERE tf.tenant_id IS NULL`,
  `UPDATE termo_fomento_aditivos ta
    SET tenant_id = tf.tenant_id
    FROM termo_fomento tf
    WHERE ta.tenant_id IS NULL
      AND tf.id = ta.termo_fomento_id
      AND tf.tenant_id IS NOT NULL`,
  `UPDATE termo_fomento_documentos td
    SET tenant_id = tf.tenant_id
    FROM termo_fomento tf
    WHERE td.tenant_id IS NULL
      AND tf.id = td.termo_fomento_id
      AND tf.tenant_id IS NOT NULL`
] as const;

let estruturaPromise: Promise<void> | null = null;

async function ensureTermosFomentoEstrutura() {
  if (!estruturaPromise) {
    estruturaPromise = (async () => {
      for (const comando of estruturaSql) {
        await prisma.$executeRawUnsafe(comando);
      }
    })();
  }
  await estruturaPromise;
}

export class TermosFomentoRepository {
  async listar(tenantId: string) {
    await ensureTermosFomentoEstrutura();
    const termos = await prisma.$queryRaw<TermoFomentoRow[]>(Prisma.sql`
      SELECT
        id,
        numero_termo,
        tipo_termo,
        referencia_termo,
        responsavel_indicacao,
        orgao_concedente,
        data_assinatura,
        data_inicio_vigencia,
        data_fim_vigencia,
        situacao,
        descricao_objeto,
        valor_global::float8 AS valor_global,
        responsavel_interno,
        criado_em,
        atualizado_em
      FROM termo_fomento
      WHERE tenant_id::text = ${tenantId}
      ORDER BY id DESC
    `);

    const ids = termos.map((item) => item.id);
    const aditivos = ids.length ? await this.listarAditivosPorTermos(ids, tenantId) : [];
    const documentos = ids.length ? await this.listarDocumentosPorTermos(ids, tenantId) : [];
    return termos.map((termo) => ({
      termo,
      aditivos: aditivos.filter((item) => item.termo_fomento_id === termo.id),
      documentos: documentos.filter((item) => item.termo_fomento_id === termo.id)
    }));
  }

  async buscarPorId(id: bigint, tenantId: string) {
    await ensureTermosFomentoEstrutura();
    const rows = await prisma.$queryRaw<TermoFomentoRow[]>(Prisma.sql`
      SELECT
        id,
        numero_termo,
        tipo_termo,
        referencia_termo,
        responsavel_indicacao,
        orgao_concedente,
        data_assinatura,
        data_inicio_vigencia,
        data_fim_vigencia,
        situacao,
        descricao_objeto,
        valor_global::float8 AS valor_global,
        responsavel_interno,
        criado_em,
        atualizado_em
      FROM termo_fomento
      WHERE id = ${id}
        AND tenant_id::text = ${tenantId}
      LIMIT 1
    `);
    const termo = rows[0] ?? null;
    if (!termo) return null;

    const aditivos = await prisma.$queryRaw<TermoAditivoRow[]>(Prisma.sql`
      SELECT
        id,
        termo_fomento_id,
        tipo_aditivo,
        data_aditivo,
        nova_data_fim,
        novo_valor::float8 AS novo_valor,
        observacoes,
        criado_em,
        atualizado_em
      FROM termo_fomento_aditivos
      WHERE termo_fomento_id = ${id}
        AND tenant_id::text = ${tenantId}
      ORDER BY data_aditivo DESC, id DESC
    `);

    const documentos = await prisma.$queryRaw<TermoDocumentoRow[]>(Prisma.sql`
      SELECT
        id,
        termo_fomento_id,
        aditivo_id,
        tipo_documento,
        nome,
        data_url,
        criado_em
      FROM termo_fomento_documentos
      WHERE termo_fomento_id = ${id}
        AND tenant_id::text = ${tenantId}
      ORDER BY id DESC
    `);

    return { termo, aditivos, documentos };
  }

  async buscarPorIdOuFalhar(id: bigint, tenantId: string) {
    const registro = await this.buscarPorId(id, tenantId);
    if (!registro) {
      throw new AppError("Termo de fomento nao encontrado.", 404);
    }
    return registro;
  }

  async criar(input: TermoFomentoInput, tenantId: string) {
    await ensureTermosFomentoEstrutura();
    const inserted = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
        INSERT INTO termo_fomento (
          tenant_id,
          numero_termo,
          tipo_termo,
          referencia_termo,
          responsavel_indicacao,
          orgao_concedente,
          data_assinatura,
          data_inicio_vigencia,
          data_fim_vigencia,
          situacao,
          descricao_objeto,
          valor_global,
          responsavel_interno,
          criado_em,
          atualizado_em
        ) VALUES (
          ${tenantId}::uuid,
          ${input.numeroTermo},
          ${input.tipoTermo},
          ${trimOrUndefined(input.referenciaTermo ?? undefined)},
          ${trimOrUndefined(input.responsavelIndicacao ?? undefined)},
          ${trimOrUndefined(input.orgaoConcedente ?? undefined)},
          ${toOptionalDate(input.dataAssinatura ?? undefined)},
          ${toOptionalDate(input.dataInicioVigencia ?? undefined)},
          ${toOptionalDate(input.dataFimVigencia ?? undefined)},
          ${input.situacao},
          ${trimOrUndefined(input.descricaoObjeto ?? undefined)},
          ${input.valorGlobal ?? null},
          ${trimOrUndefined(input.responsavelInterno ?? undefined)},
          NOW(),
          NOW()
        )
        RETURNING id
      `);
      const termoId = rows[0]?.id;
      if (!termoId) throw new AppError("Nao foi possivel criar termo de fomento.", 500);
      await this.salvarRelacionamentos(tx, termoId, input, tenantId);
      return termoId;
    });
    return this.buscarPorIdOuFalhar(inserted, tenantId);
  }

  async atualizar(id: bigint, input: TermoFomentoInput, tenantId: string) {
    await ensureTermosFomentoEstrutura();
    await this.buscarPorIdOuFalhar(id, tenantId);
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`
        UPDATE termo_fomento
        SET
          numero_termo = ${input.numeroTermo},
          tipo_termo = ${input.tipoTermo},
          referencia_termo = ${trimOrUndefined(input.referenciaTermo ?? undefined)},
          responsavel_indicacao = ${trimOrUndefined(input.responsavelIndicacao ?? undefined)},
          orgao_concedente = ${trimOrUndefined(input.orgaoConcedente ?? undefined)},
          data_assinatura = ${toOptionalDate(input.dataAssinatura ?? undefined)},
          data_inicio_vigencia = ${toOptionalDate(input.dataInicioVigencia ?? undefined)},
          data_fim_vigencia = ${toOptionalDate(input.dataFimVigencia ?? undefined)},
          situacao = ${input.situacao},
          descricao_objeto = ${trimOrUndefined(input.descricaoObjeto ?? undefined)},
          valor_global = ${input.valorGlobal ?? null},
          responsavel_interno = ${trimOrUndefined(input.responsavelInterno ?? undefined)},
          atualizado_em = NOW()
        WHERE id = ${id}
          AND tenant_id::text = ${tenantId}
      `);
      await this.salvarRelacionamentos(tx, id, input, tenantId);
    });
    return this.buscarPorIdOuFalhar(id, tenantId);
  }

  async remover(id: bigint, tenantId: string) {
    await ensureTermosFomentoEstrutura();
    await this.buscarPorIdOuFalhar(id, tenantId);
    await prisma.$executeRaw(Prisma.sql`
      DELETE FROM termo_fomento
      WHERE id = ${id}
        AND tenant_id::text = ${tenantId}
    `);
  }

  async adicionarAditivo(termoId: bigint, input: TermoAditivoInput, tenantId: string) {
    await ensureTermosFomentoEstrutura();
    await this.buscarPorIdOuFalhar(termoId, tenantId);
    await prisma.$transaction(async (tx) => {
      const aditivoId = await this.inserirAditivo(tx, termoId, input, tenantId);
      if (input.anexo) {
        await this.inserirDocumento(tx, termoId, "aditivo", input.anexo, aditivoId, tenantId);
      }
    });
    return this.buscarPorIdOuFalhar(termoId, tenantId);
  }

  private async listarAditivosPorTermos(termosIds: bigint[], tenantId: string) {
    return prisma.$queryRaw<TermoAditivoRow[]>(Prisma.sql`
      SELECT
        id,
        termo_fomento_id,
        tipo_aditivo,
        data_aditivo,
        nova_data_fim,
        novo_valor::float8 AS novo_valor,
        observacoes,
        criado_em,
        atualizado_em
      FROM termo_fomento_aditivos
      WHERE termo_fomento_id IN (${Prisma.join(termosIds)})
        AND tenant_id::text = ${tenantId}
      ORDER BY data_aditivo DESC, id DESC
    `);
  }

  private async listarDocumentosPorTermos(termosIds: bigint[], tenantId: string) {
    return prisma.$queryRaw<TermoDocumentoRow[]>(Prisma.sql`
      SELECT
        id,
        termo_fomento_id,
        aditivo_id,
        tipo_documento,
        nome,
        data_url,
        criado_em
      FROM termo_fomento_documentos
      WHERE termo_fomento_id IN (${Prisma.join(termosIds)})
        AND tenant_id::text = ${tenantId}
      ORDER BY id DESC
    `);
  }

  private async salvarRelacionamentos(
    tx: TransactionClient,
    termoId: bigint,
    input: TermoFomentoInput,
    tenantId: string
  ) {
    await tx.$executeRaw(Prisma.sql`
      DELETE FROM termo_fomento_documentos
      WHERE termo_fomento_id = ${termoId}
        AND tenant_id::text = ${tenantId}
    `);
    await tx.$executeRaw(Prisma.sql`
      DELETE FROM termo_fomento_aditivos
      WHERE termo_fomento_id = ${termoId}
        AND tenant_id::text = ${tenantId}
    `);

    const aditivos = input.aditivos ?? [];
    const aditivoIds: Array<bigint | null> = [];
    for (const aditivo of aditivos) {
      const aditivoId = await this.inserirAditivo(tx, termoId, aditivo, tenantId);
      aditivoIds.push(aditivoId);
    }

    if (input.termoDocumento) {
      await this.inserirDocumento(tx, termoId, "termo", input.termoDocumento, null, tenantId);
    }

    for (const documento of input.documentosRelacionados ?? []) {
      const tipoDocumento = documento.tipo === "aditivo" ? "outro" : documento.tipo ?? "outro";
      await this.inserirDocumento(tx, termoId, tipoDocumento, documento, null, tenantId);
    }

    for (let index = 0; index < aditivos.length; index += 1) {
      const aditivo = aditivos[index];
      const aditivoId = aditivoIds[index];
      if (aditivo?.anexo && aditivoId) {
        await this.inserirDocumento(tx, termoId, "aditivo", aditivo.anexo, aditivoId, tenantId);
      }
    }
  }

  private async inserirAditivo(
    tx: TransactionClient,
    termoId: bigint,
    input: TermoAditivoInput,
    tenantId: string
  ) {
    const rows = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
      INSERT INTO termo_fomento_aditivos (
        tenant_id,
        termo_fomento_id,
        tipo_aditivo,
        data_aditivo,
        nova_data_fim,
        novo_valor,
        observacoes,
        criado_em,
        atualizado_em
      ) VALUES (
        ${tenantId}::uuid,
        ${termoId},
        ${input.tipoAditivo},
        ${toOptionalDate(input.dataAditivo)},
        ${toOptionalDate(input.novaDataFim ?? undefined)},
        ${input.novoValor ?? null},
        ${trimOrUndefined(input.observacoes ?? undefined)},
        NOW(),
        NOW()
      )
      RETURNING id
    `);
    const aditivoId = rows[0]?.id;
    if (!aditivoId) throw new AppError("Nao foi possivel salvar aditivo.", 500);
    return aditivoId;
  }

  private async inserirDocumento(
    tx: TransactionClient,
    termoId: bigint,
    tipoDocumento: string,
    input: TermoDocumentoInput,
    aditivoId: bigint | null,
    tenantId: string
  ) {
    await tx.$executeRaw(Prisma.sql`
      INSERT INTO termo_fomento_documentos (
        tenant_id,
        termo_fomento_id,
        aditivo_id,
        tipo_documento,
        nome,
        data_url,
        criado_em
      ) VALUES (
        ${tenantId}::uuid,
        ${termoId},
        ${aditivoId},
        ${tipoDocumento},
        ${input.nome},
        ${trimOrUndefined(input.dataUrl ?? undefined)},
        NOW()
      )
    `);
  }
}
