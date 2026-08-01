import { toIsoDate, toStringId } from "../../utils/string-utils.js";
import type { ProntuarioStatus } from "./prontuario.types.js";

function isoDateTime(value?: Date | string | null) {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export function mapProntuarioAtendimento(row: any, podeVerRestrito: boolean) {
  return {
    id: toStringId(row.id),
    prontuario_id: toStringId(row.prontuario_id),
    beneficiario_id: toStringId(row.beneficiario_id),
    profissional_id: row.profissional_id ? toStringId(row.profissional_id) : undefined,
    profissional_nome: row.profissional_nome ?? undefined,
    profissional_categoria: row.profissional_categoria ?? undefined,
    unidade_id: row.unidade_id ? toStringId(row.unidade_id) : undefined,
    unidade_nome: row.unidade_nome ?? undefined,
    especialidade: row.especialidade,
    tipo_atendimento: row.tipo_atendimento,
    data_atendimento: toIsoDate(row.data_atendimento) ?? undefined,
    hora_inicio: isoDateTime(row.hora_inicio),
    hora_fim: isoDateTime(row.hora_fim),
    duracao_minutos: row.duracao_minutos == null ? undefined : Number(row.duracao_minutos),
    status: row.status as ProntuarioStatus,
    motivo: row.motivo ?? undefined,
    demanda_principal: row.demanda_principal ?? undefined,
    avaliacao: row.avaliacao ?? undefined,
    evolucao: row.evolucao ?? undefined,
    intervencoes: Array.isArray(row.intervencoes) ? row.intervencoes : [],
    conduta: row.conduta ?? undefined,
    retorno_data: toIsoDate(row.retorno_data) ?? undefined,
    observacoes: row.observacoes ?? undefined,
    campos_especificos: row.restrito && !podeVerRestrito ? undefined : row.campos_especificos ?? {},
    restrito: !!row.restrito,
    finalizado_em: isoDateTime(row.finalizado_em),
    criado_em: isoDateTime(row.criado_em),
    atualizado_em: isoDateTime(row.atualizado_em),
    adendos: row.adendos ?? []
  };
}

export function mapProntuarioBeneficiario(row: any) {
  return {
    id: toStringId(row.id),
    codigo: row.codigo ?? undefined,
    nome_completo: row.nome_completo,
    nome_social: row.nome_social ?? undefined,
    nome_mae: row.nome_mae ?? undefined,
    data_nascimento: toIsoDate(row.data_nascimento) ?? undefined,
    bairro: row.bairro ?? undefined,
    cpf: row.cpf ?? undefined,
    foto_3x4: row.foto_3x4 ?? undefined,
    telefone: row.telefone ?? undefined,
    unidade_nome: row.unidade_nome ?? undefined,
    unidade_assistencial: row.unidade_nome ?? undefined,
    alergias: row.alergias ?? undefined,
    cid_principal: row.condicoes_relevantes ?? undefined,
    descricao_medicacao: row.medicacao_continua ?? undefined,
    ultimo_atendimento: isoDateTime(row.ultimo_atendimento)
  };
}
