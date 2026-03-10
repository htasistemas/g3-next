import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { toOptionalDate, trimOrUndefined } from "../../../utils/string-utils.js";
import type {
  PlanoAtividadeInput,
  PlanoAtividadeRow,
  PlanoCronogramaInput,
  PlanoCronogramaRow,
  PlanoEquipeInput,
  PlanoEquipeRow,
  PlanoEtapaInput,
  PlanoEtapaRow,
  PlanoMetaInput,
  PlanoMetaRow,
  PlanoTrabalhoInput,
  PlanoTrabalhoRow
} from "../planos-trabalho.types.js";

type TransactionClient = Prisma.TransactionClient;

export class PlanosTrabalhoRepository {
  async listar() {
    const planos = await prisma.$queryRaw<PlanoTrabalhoRow[]>(Prisma.sql`
      SELECT
        p.id,
        p.codigo_interno,
        p.titulo,
        p.descricao_geral,
        p.status,
        p.orgao_concedente,
        p.orgao_outro_descricao,
        p.area_programa,
        p.data_elaboracao,
        p.data_aprovacao,
        p.vigencia_inicio,
        p.vigencia_fim,
        p.termo_fomento_id,
        p.numero_processo,
        p.modalidade,
        p.observacoes_vinculacao,
        p.arquivo_formato,
        p.criado_em,
        p.atualizado_em,
        t.numero_termo AS termo_numero,
        t.descricao_objeto AS termo_objeto
      FROM plano_trabalho p
      INNER JOIN termo_fomento t ON t.id = p.termo_fomento_id
      ORDER BY p.id DESC
    `);

    const ids = planos.map((item) => item.id);
    const metas = ids.length ? await this.listarMetas(ids) : [];
    const atividades = metas.length ? await this.listarAtividades(metas.map((item) => item.id)) : [];
    const etapas = atividades.length ? await this.listarEtapas(atividades.map((item) => item.id)) : [];
    const cronograma = ids.length ? await this.listarCronograma(ids) : [];
    const equipe = ids.length ? await this.listarEquipe(ids) : [];

    return planos.map((plano) => ({
      plano,
      metas,
      atividades,
      etapas,
      cronograma,
      equipe
    }));
  }

  async buscarPorId(id: bigint) {
    const rows = await prisma.$queryRaw<PlanoTrabalhoRow[]>(Prisma.sql`
      SELECT
        p.id,
        p.codigo_interno,
        p.titulo,
        p.descricao_geral,
        p.status,
        p.orgao_concedente,
        p.orgao_outro_descricao,
        p.area_programa,
        p.data_elaboracao,
        p.data_aprovacao,
        p.vigencia_inicio,
        p.vigencia_fim,
        p.termo_fomento_id,
        p.numero_processo,
        p.modalidade,
        p.observacoes_vinculacao,
        p.arquivo_formato,
        p.criado_em,
        p.atualizado_em,
        t.numero_termo AS termo_numero,
        t.descricao_objeto AS termo_objeto
      FROM plano_trabalho p
      INNER JOIN termo_fomento t ON t.id = p.termo_fomento_id
      WHERE p.id = ${id}
      LIMIT 1
    `);
    const plano = rows[0] ?? null;
    if (!plano) return null;
    const metas = await this.listarMetas([id]);
    const atividades = metas.length ? await this.listarAtividades(metas.map((item) => item.id)) : [];
    const etapas = atividades.length ? await this.listarEtapas(atividades.map((item) => item.id)) : [];
    const cronograma = await this.listarCronograma([id]);
    const equipe = await this.listarEquipe([id]);
    return { plano, metas, atividades, etapas, cronograma, equipe };
  }

  async buscarPorIdOuFalhar(id: bigint) {
    const registro = await this.buscarPorId(id);
    if (!registro) {
      throw new AppError("Plano de trabalho nao encontrado.", 404);
    }
    return registro;
  }

  async criar(input: PlanoTrabalhoInput) {
    const id = await prisma.$transaction(async (tx) => {
      const codigoInterno = trimOrUndefined(input.codigoInterno ?? undefined) ?? (await this.gerarCodigoInterno());
      const insert = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
        INSERT INTO plano_trabalho (
          codigo_interno,
          titulo,
          descricao_geral,
          status,
          orgao_concedente,
          orgao_outro_descricao,
          area_programa,
          data_elaboracao,
          data_aprovacao,
          vigencia_inicio,
          vigencia_fim,
          termo_fomento_id,
          numero_processo,
          modalidade,
          observacoes_vinculacao,
          arquivo_formato,
          criado_em,
          atualizado_em
        ) VALUES (
          ${codigoInterno},
          ${input.titulo},
          ${input.descricaoGeral},
          ${input.status},
          ${trimOrUndefined(input.orgaoConcedente ?? undefined)},
          ${trimOrUndefined(input.orgaoOutroDescricao ?? undefined)},
          ${trimOrUndefined(input.areaPrograma ?? undefined)},
          ${toOptionalDate(input.dataElaboracao ?? undefined)},
          ${toOptionalDate(input.dataAprovacao ?? undefined)},
          ${toOptionalDate(input.vigenciaInicio ?? undefined)},
          ${toOptionalDate(input.vigenciaFim ?? undefined)},
          ${BigInt(input.termoFomentoId)},
          ${trimOrUndefined(input.numeroProcesso ?? undefined)},
          ${trimOrUndefined(input.modalidade ?? undefined)},
          ${trimOrUndefined(input.observacoesVinculacao ?? undefined)},
          ${trimOrUndefined(input.arquivoFormato ?? undefined)},
          NOW(),
          NOW()
        )
        RETURNING id
      `);
      const planoId = insert[0]?.id;
      if (!planoId) throw new AppError("Nao foi possivel criar plano de trabalho.", 500);
      await this.salvarRelacionamentos(tx, planoId, input);
      return planoId;
    });
    return this.buscarPorIdOuFalhar(id);
  }

  async atualizar(id: bigint, input: PlanoTrabalhoInput) {
    await this.buscarPorIdOuFalhar(id);
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`
        UPDATE plano_trabalho
        SET
          codigo_interno = ${trimOrUndefined(input.codigoInterno ?? undefined) ?? (await this.gerarCodigoInterno())},
          titulo = ${input.titulo},
          descricao_geral = ${input.descricaoGeral},
          status = ${input.status},
          orgao_concedente = ${trimOrUndefined(input.orgaoConcedente ?? undefined)},
          orgao_outro_descricao = ${trimOrUndefined(input.orgaoOutroDescricao ?? undefined)},
          area_programa = ${trimOrUndefined(input.areaPrograma ?? undefined)},
          data_elaboracao = ${toOptionalDate(input.dataElaboracao ?? undefined)},
          data_aprovacao = ${toOptionalDate(input.dataAprovacao ?? undefined)},
          vigencia_inicio = ${toOptionalDate(input.vigenciaInicio ?? undefined)},
          vigencia_fim = ${toOptionalDate(input.vigenciaFim ?? undefined)},
          termo_fomento_id = ${BigInt(input.termoFomentoId)},
          numero_processo = ${trimOrUndefined(input.numeroProcesso ?? undefined)},
          modalidade = ${trimOrUndefined(input.modalidade ?? undefined)},
          observacoes_vinculacao = ${trimOrUndefined(input.observacoesVinculacao ?? undefined)},
          arquivo_formato = ${trimOrUndefined(input.arquivoFormato ?? undefined)},
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
      DELETE FROM plano_trabalho
      WHERE id = ${id}
    `);
  }

  private async gerarCodigoInterno() {
    const rows = await prisma.$queryRaw<Array<{ proximo: number }>>(Prisma.sql`
      SELECT COALESCE(MAX(id), 0) + 1 AS proximo
      FROM plano_trabalho
    `);
    const proximo = rows[0]?.proximo ?? 1;
    return `PLN-${String(proximo).padStart(4, "0")}`;
  }

  private async listarMetas(planosIds: bigint[]) {
    return prisma.$queryRaw<PlanoMetaRow[]>(Prisma.sql`
      SELECT
        id,
        plano_trabalho_id,
        codigo,
        descricao,
        indicador,
        unidade_medida,
        quantidade_prevista::float8 AS quantidade_prevista,
        resultado_esperado,
        ordem
      FROM plano_trabalho_metas
      WHERE plano_trabalho_id IN (${Prisma.join(planosIds)})
      ORDER BY plano_trabalho_id, ordem, id
    `);
  }

  private async listarAtividades(metaIds: bigint[]) {
    return prisma.$queryRaw<PlanoAtividadeRow[]>(Prisma.sql`
      SELECT
        id,
        meta_id,
        descricao,
        justificativa,
        publico_alvo,
        local_execucao,
        produto_esperado,
        ordem
      FROM plano_trabalho_atividades
      WHERE meta_id IN (${Prisma.join(metaIds)})
      ORDER BY meta_id, ordem, id
    `);
  }

  private async listarEtapas(atividadeIds: bigint[]) {
    return prisma.$queryRaw<PlanoEtapaRow[]>(Prisma.sql`
      SELECT
        id,
        atividade_id,
        descricao,
        status,
        data_inicio_prevista,
        data_fim_prevista,
        data_conclusao,
        responsavel,
        ordem
      FROM plano_trabalho_etapas
      WHERE atividade_id IN (${Prisma.join(atividadeIds)})
      ORDER BY atividade_id, ordem, id
    `);
  }

  private async listarCronograma(planosIds: bigint[]) {
    return prisma.$queryRaw<PlanoCronogramaRow[]>(Prisma.sql`
      SELECT
        id,
        plano_trabalho_id,
        referencia_tipo,
        referencia_id,
        referencia_descricao,
        competencia,
        descricao_resumida,
        valor_previsto::float8 AS valor_previsto,
        fonte_recurso,
        natureza_despesa,
        observacoes,
        ordem
      FROM plano_trabalho_cronograma
      WHERE plano_trabalho_id IN (${Prisma.join(planosIds)})
      ORDER BY plano_trabalho_id, ordem, id
    `);
  }

  private async listarEquipe(planosIds: bigint[]) {
    return prisma.$queryRaw<PlanoEquipeRow[]>(Prisma.sql`
      SELECT
        id,
        plano_trabalho_id,
        nome,
        funcao,
        cpf,
        carga_horaria,
        tipo_vinculo,
        contato,
        ordem
      FROM plano_trabalho_equipe
      WHERE plano_trabalho_id IN (${Prisma.join(planosIds)})
      ORDER BY plano_trabalho_id, ordem, id
    `);
  }

  private async salvarRelacionamentos(
    tx: TransactionClient,
    planoId: bigint,
    input: PlanoTrabalhoInput
  ) {
    await tx.$executeRaw(Prisma.sql`
      DELETE FROM plano_trabalho_cronograma
      WHERE plano_trabalho_id = ${planoId}
    `);
    await tx.$executeRaw(Prisma.sql`
      DELETE FROM plano_trabalho_equipe
      WHERE plano_trabalho_id = ${planoId}
    `);
    await tx.$executeRaw(Prisma.sql`
      DELETE FROM plano_trabalho_metas
      WHERE plano_trabalho_id = ${planoId}
    `);

    await this.inserirMetas(tx, planoId, input.metas ?? []);
    await this.inserirCronograma(tx, planoId, input.cronograma ?? []);
    await this.inserirEquipe(tx, planoId, input.equipe ?? []);
  }

  private async inserirMetas(tx: TransactionClient, planoId: bigint, metas: PlanoMetaInput[]) {
    for (let metaIndex = 0; metaIndex < metas.length; metaIndex += 1) {
      const meta = metas[metaIndex];
      const insertedMeta = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
        INSERT INTO plano_trabalho_metas (
          plano_trabalho_id,
          codigo,
          descricao,
          indicador,
          unidade_medida,
          quantidade_prevista,
          resultado_esperado,
          ordem
        ) VALUES (
          ${planoId},
          ${trimOrUndefined(meta.codigo ?? undefined)},
          ${meta.descricao},
          ${trimOrUndefined(meta.indicador ?? undefined)},
          ${trimOrUndefined(meta.unidadeMedida ?? undefined)},
          ${meta.quantidadePrevista ?? null},
          ${trimOrUndefined(meta.resultadoEsperado ?? undefined)},
          ${metaIndex}
        )
        RETURNING id
      `);
      const metaId = insertedMeta[0]?.id;
      if (!metaId) throw new AppError("Nao foi possivel salvar meta do plano.", 500);
      await this.inserirAtividades(tx, metaId, meta.atividades ?? []);
    }
  }

  private async inserirAtividades(
    tx: TransactionClient,
    metaId: bigint,
    atividades: PlanoAtividadeInput[]
  ) {
    for (let atividadeIndex = 0; atividadeIndex < atividades.length; atividadeIndex += 1) {
      const atividade = atividades[atividadeIndex];
      const insertedAtividade = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
        INSERT INTO plano_trabalho_atividades (
          meta_id,
          descricao,
          justificativa,
          publico_alvo,
          local_execucao,
          produto_esperado,
          ordem
        ) VALUES (
          ${metaId},
          ${atividade.descricao},
          ${trimOrUndefined(atividade.justificativa ?? undefined)},
          ${trimOrUndefined(atividade.publicoAlvo ?? undefined)},
          ${trimOrUndefined(atividade.localExecucao ?? undefined)},
          ${trimOrUndefined(atividade.produtoEsperado ?? undefined)},
          ${atividadeIndex}
        )
        RETURNING id
      `);
      const atividadeId = insertedAtividade[0]?.id;
      if (!atividadeId) throw new AppError("Nao foi possivel salvar atividade da meta.", 500);
      await this.inserirEtapas(tx, atividadeId, atividade.etapas ?? []);
    }
  }

  private async inserirEtapas(tx: TransactionClient, atividadeId: bigint, etapas: PlanoEtapaInput[]) {
    for (let etapaIndex = 0; etapaIndex < etapas.length; etapaIndex += 1) {
      const etapa = etapas[etapaIndex];
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO plano_trabalho_etapas (
          atividade_id,
          descricao,
          status,
          data_inicio_prevista,
          data_fim_prevista,
          data_conclusao,
          responsavel,
          ordem
        ) VALUES (
          ${atividadeId},
          ${etapa.descricao},
          ${trimOrUndefined(etapa.status ?? undefined)},
          ${toOptionalDate(etapa.dataInicioPrevista ?? undefined)},
          ${toOptionalDate(etapa.dataFimPrevista ?? undefined)},
          ${toOptionalDate(etapa.dataConclusao ?? undefined)},
          ${trimOrUndefined(etapa.responsavel ?? undefined)},
          ${etapaIndex}
        )
      `);
    }
  }

  private async inserirCronograma(
    tx: TransactionClient,
    planoId: bigint,
    cronograma: PlanoCronogramaInput[]
  ) {
    for (let index = 0; index < cronograma.length; index += 1) {
      const item = cronograma[index];
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO plano_trabalho_cronograma (
          plano_trabalho_id,
          referencia_tipo,
          referencia_id,
          referencia_descricao,
          competencia,
          descricao_resumida,
          valor_previsto,
          fonte_recurso,
          natureza_despesa,
          observacoes,
          ordem
        ) VALUES (
          ${planoId},
          ${trimOrUndefined(item.referenciaTipo ?? undefined)},
          ${trimOrUndefined(item.referenciaId ?? undefined)},
          ${trimOrUndefined(item.referenciaDescricao ?? undefined)},
          ${item.competencia},
          ${trimOrUndefined(item.descricaoResumida ?? undefined)},
          ${item.valorPrevisto ?? null},
          ${trimOrUndefined(item.fonteRecurso ?? undefined)},
          ${trimOrUndefined(item.naturezaDespesa ?? undefined)},
          ${trimOrUndefined(item.observacoes ?? undefined)},
          ${index}
        )
      `);
    }
  }

  private async inserirEquipe(tx: TransactionClient, planoId: bigint, equipe: PlanoEquipeInput[]) {
    for (let index = 0; index < equipe.length; index += 1) {
      const item = equipe[index];
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO plano_trabalho_equipe (
          plano_trabalho_id,
          nome,
          funcao,
          cpf,
          carga_horaria,
          tipo_vinculo,
          contato,
          ordem
        ) VALUES (
          ${planoId},
          ${item.nome},
          ${trimOrUndefined(item.funcao ?? undefined)},
          ${trimOrUndefined(item.cpf ?? undefined)},
          ${trimOrUndefined(item.cargaHoraria ?? undefined)},
          ${trimOrUndefined(item.tipoVinculo ?? undefined)},
          ${trimOrUndefined(item.contato ?? undefined)},
          ${index}
        )
      `);
    }
  }
}
