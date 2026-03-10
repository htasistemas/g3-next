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

export class TermosFomentoRepository {
  async listar() {
    const termos = await prisma.$queryRaw<TermoFomentoRow[]>(Prisma.sql`
      SELECT
        id,
        numero_termo,
        tipo_termo,
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
      ORDER BY id DESC
    `);

    const ids = termos.map((item) => item.id);
    const aditivos = ids.length ? await this.listarAditivosPorTermos(ids) : [];
    const documentos = ids.length ? await this.listarDocumentosPorTermos(ids) : [];
    return termos.map((termo) => ({
      termo,
      aditivos: aditivos.filter((item) => item.termo_fomento_id === termo.id),
      documentos: documentos.filter((item) => item.termo_fomento_id === termo.id)
    }));
  }

  async buscarPorId(id: bigint) {
    const rows = await prisma.$queryRaw<TermoFomentoRow[]>(Prisma.sql`
      SELECT
        id,
        numero_termo,
        tipo_termo,
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
      ORDER BY id DESC
    `);

    return { termo, aditivos, documentos };
  }

  async buscarPorIdOuFalhar(id: bigint) {
    const registro = await this.buscarPorId(id);
    if (!registro) {
      throw new AppError("Termo de fomento nao encontrado.", 404);
    }
    return registro;
  }

  async criar(input: TermoFomentoInput) {
    const inserted = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
        INSERT INTO termo_fomento (
          numero_termo,
          tipo_termo,
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
          ${input.numeroTermo},
          ${input.tipoTermo},
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
      await this.salvarRelacionamentos(tx, termoId, input);
      return termoId;
    });
    return this.buscarPorIdOuFalhar(inserted);
  }

  async atualizar(id: bigint, input: TermoFomentoInput) {
    await this.buscarPorIdOuFalhar(id);
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`
        UPDATE termo_fomento
        SET
          numero_termo = ${input.numeroTermo},
          tipo_termo = ${input.tipoTermo},
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
      `);
      await this.salvarRelacionamentos(tx, id, input);
    });
    return this.buscarPorIdOuFalhar(id);
  }

  async remover(id: bigint) {
    await this.buscarPorIdOuFalhar(id);
    await prisma.$executeRaw(Prisma.sql`
      DELETE FROM termo_fomento
      WHERE id = ${id}
    `);
  }

  async adicionarAditivo(termoId: bigint, input: TermoAditivoInput) {
    await this.buscarPorIdOuFalhar(termoId);
    await prisma.$transaction(async (tx) => {
      const aditivoId = await this.inserirAditivo(tx, termoId, input);
      if (input.anexo) {
        await this.inserirDocumento(tx, termoId, "aditivo", input.anexo, aditivoId);
      }
    });
    return this.buscarPorIdOuFalhar(termoId);
  }

  private async listarAditivosPorTermos(termosIds: bigint[]) {
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
      ORDER BY data_aditivo DESC, id DESC
    `);
  }

  private async listarDocumentosPorTermos(termosIds: bigint[]) {
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
      ORDER BY id DESC
    `);
  }

  private async salvarRelacionamentos(
    tx: TransactionClient,
    termoId: bigint,
    input: TermoFomentoInput
  ) {
    await tx.$executeRaw(Prisma.sql`
      DELETE FROM termo_fomento_documentos
      WHERE termo_fomento_id = ${termoId}
    `);
    await tx.$executeRaw(Prisma.sql`
      DELETE FROM termo_fomento_aditivos
      WHERE termo_fomento_id = ${termoId}
    `);

    const aditivos = input.aditivos ?? [];
    const aditivoIds: Array<bigint | null> = [];
    for (const aditivo of aditivos) {
      const aditivoId = await this.inserirAditivo(tx, termoId, aditivo);
      aditivoIds.push(aditivoId);
    }

    if (input.termoDocumento) {
      await this.inserirDocumento(tx, termoId, "termo", input.termoDocumento, null);
    }

    for (const documento of input.documentosRelacionados ?? []) {
      const tipoDocumento = documento.tipo === "aditivo" ? "outro" : documento.tipo ?? "outro";
      await this.inserirDocumento(tx, termoId, tipoDocumento, documento, null);
    }

    for (let index = 0; index < aditivos.length; index += 1) {
      const aditivo = aditivos[index];
      const aditivoId = aditivoIds[index];
      if (aditivo?.anexo && aditivoId) {
        await this.inserirDocumento(tx, termoId, "aditivo", aditivo.anexo, aditivoId);
      }
    }
  }

  private async inserirAditivo(
    tx: TransactionClient,
    termoId: bigint,
    input: TermoAditivoInput
  ) {
    const rows = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
      INSERT INTO termo_fomento_aditivos (
        termo_fomento_id,
        tipo_aditivo,
        data_aditivo,
        nova_data_fim,
        novo_valor,
        observacoes,
        criado_em,
        atualizado_em
      ) VALUES (
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
    aditivoId: bigint | null
  ) {
    await tx.$executeRaw(Prisma.sql`
      INSERT INTO termo_fomento_documentos (
        termo_fomento_id,
        aditivo_id,
        tipo_documento,
        nome,
        data_url,
        criado_em
      ) VALUES (
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
