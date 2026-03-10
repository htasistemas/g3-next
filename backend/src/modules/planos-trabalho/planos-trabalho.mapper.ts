import { toIsoDate, toStringId } from "../../utils/string-utils.js";
import type {
  PlanoAtividadeRow,
  PlanoCronogramaRow,
  PlanoEquipeRow,
  PlanoEtapaRow,
  PlanoMetaRow,
  PlanoTrabalhoRow
} from "./planos-trabalho.types.js";

export function mapPlanoTrabalhoToResponse(
  plano: PlanoTrabalhoRow,
  metas: PlanoMetaRow[],
  atividades: PlanoAtividadeRow[],
  etapas: PlanoEtapaRow[],
  cronograma: PlanoCronogramaRow[],
  equipe: PlanoEquipeRow[]
) {
  return {
    id: toStringId(plano.id),
    codigoInterno: plano.codigo_interno,
    titulo: plano.titulo,
    descricaoGeral: plano.descricao_geral,
    status: plano.status,
    orgaoConcedente: plano.orgao_concedente ?? undefined,
    orgaoOutroDescricao: plano.orgao_outro_descricao ?? undefined,
    areaPrograma: plano.area_programa ?? undefined,
    dataElaboracao: toIsoDate(plano.data_elaboracao),
    dataAprovacao: toIsoDate(plano.data_aprovacao),
    vigenciaInicio: toIsoDate(plano.vigencia_inicio),
    vigenciaFim: toIsoDate(plano.vigencia_fim),
    termoFomentoId: toStringId(plano.termo_fomento_id),
    numeroProcesso: plano.numero_processo ?? undefined,
    modalidade: plano.modalidade ?? undefined,
    observacoesVinculacao: plano.observacoes_vinculacao ?? undefined,
    arquivoFormato: plano.arquivo_formato ?? undefined,
    termoFomento: {
      id: toStringId(plano.termo_fomento_id),
      numero: plano.termo_numero ?? "",
      objeto: plano.termo_objeto ?? undefined
    },
    metas: metas
      .filter((meta) => meta.plano_trabalho_id === plano.id)
      .sort((a, b) => a.ordem - b.ordem)
      .map((meta) => ({
        id: toStringId(meta.id),
        codigo: meta.codigo ?? undefined,
        descricao: meta.descricao,
        indicador: meta.indicador ?? undefined,
        unidadeMedida: meta.unidade_medida ?? undefined,
        quantidadePrevista: meta.quantidade_prevista ?? undefined,
        resultadoEsperado: meta.resultado_esperado ?? undefined,
        atividades: atividades
          .filter((atividade) => atividade.meta_id === meta.id)
          .sort((a, b) => a.ordem - b.ordem)
          .map((atividade) => ({
            id: toStringId(atividade.id),
            descricao: atividade.descricao,
            justificativa: atividade.justificativa ?? undefined,
            publicoAlvo: atividade.publico_alvo ?? undefined,
            localExecucao: atividade.local_execucao ?? undefined,
            produtoEsperado: atividade.produto_esperado ?? undefined,
            etapas: etapas
              .filter((etapa) => etapa.atividade_id === atividade.id)
              .sort((a, b) => a.ordem - b.ordem)
              .map((etapa) => ({
                id: toStringId(etapa.id),
                descricao: etapa.descricao,
                status: etapa.status ?? undefined,
                dataInicioPrevista: toIsoDate(etapa.data_inicio_prevista),
                dataFimPrevista: toIsoDate(etapa.data_fim_prevista),
                dataConclusao: toIsoDate(etapa.data_conclusao),
                responsavel: etapa.responsavel ?? undefined
              }))
          }))
      })),
    cronograma: cronograma
      .filter((item) => item.plano_trabalho_id === plano.id)
      .sort((a, b) => a.ordem - b.ordem)
      .map((item) => ({
        id: toStringId(item.id),
        referenciaTipo: item.referencia_tipo ?? undefined,
        referenciaId: item.referencia_id ?? undefined,
        referenciaDescricao: item.referencia_descricao ?? undefined,
        competencia: item.competencia,
        descricaoResumida: item.descricao_resumida ?? undefined,
        valorPrevisto: item.valor_previsto ?? undefined,
        fonteRecurso: item.fonte_recurso ?? undefined,
        naturezaDespesa: item.natureza_despesa ?? undefined,
        observacoes: item.observacoes ?? undefined
      })),
    equipe: equipe
      .filter((item) => item.plano_trabalho_id === plano.id)
      .sort((a, b) => a.ordem - b.ordem)
      .map((item) => ({
        id: toStringId(item.id),
        nome: item.nome,
        funcao: item.funcao ?? undefined,
        cpf: item.cpf ?? undefined,
        cargaHoraria: item.carga_horaria ?? undefined,
        tipoVinculo: item.tipo_vinculo ?? undefined,
        contato: item.contato ?? undefined
      }))
  };
}
