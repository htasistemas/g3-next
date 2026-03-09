import { toIsoDate, toStringId } from "../../utils/string-utils.js";
import type {
  RegistroPontoHistoricoItem,
  RegistroPontoListaItem,
  RegistroPontoOcorrenciaTipo,
  RegistroPontoUsuarioCatalogoItem
} from "./registro-ponto.types.js";

type ListaRow = {
  id: bigint;
  usuario_id: bigint;
  usuario_nome: string | null;
  usuario_login: string;
  unidade: string | null;
  data_referencia: Date;
  entrada_1: string | null;
  saida_1: string | null;
  entrada_2: string | null;
  saida_2: string | null;
  horas_extras_minutos: number | bigint | null;
  banco_horas_minutos: number | bigint | null;
  faltas_minutos: number | bigint | null;
  atrasos_minutos: number | bigint | null;
  observacoes: string | null;
  alterado_manualmente: boolean;
  status_registro: "COMPLETO" | "INCOMPLETO";
  ocorrencias: string[] | null;
  total_trabalhado_minutos: number | bigint | null;
  criado_em: Date;
  atualizado_em: Date;
};

type HistoricoRow = {
  id: bigint;
  acao: string;
  usuario_id: bigint | null;
  usuario_nome: string | null;
  justificativa: string | null;
  observacao: string | null;
  ip_origem: string | null;
  dados_antes: Record<string, unknown> | null;
  dados_depois: Record<string, unknown> | null;
  criado_em: Date;
};

type OcorrenciaRow = {
  id: bigint;
  tipo: string;
  descricao: string | null;
  origem: string;
  criado_por_nome: string | null;
  criado_em: Date;
};

type UsuarioCatalogoRow = {
  id: bigint;
  nome: string | null;
  nome_usuario: string;
  unidade: string | null;
};

function toNumber(value: number | bigint | null | undefined) {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  return 0;
}

function normalizarHora(value: string | null) {
  if (!value) return undefined;
  const normalized = value.slice(0, 8);
  return normalized;
}

function obterProximaBatida(item: {
  entrada_1?: string;
  saida_1?: string;
  entrada_2?: string;
  saida_2?: string;
}) {
  if (!item.entrada_1) return "Entrada 1";
  if (!item.saida_1) return "Saida 1";
  if (!item.entrada_2) return "Entrada 2";
  if (!item.saida_2) return "Saida 2";
  return undefined;
}

export function mapRegistroPontoRowToResponse(row: ListaRow): RegistroPontoListaItem {
  const entrada_1 = normalizarHora(row.entrada_1);
  const saida_1 = normalizarHora(row.saida_1);
  const entrada_2 = normalizarHora(row.entrada_2);
  const saida_2 = normalizarHora(row.saida_2);

  return {
    id: toStringId(row.id),
    usuario_id: toStringId(row.usuario_id),
    usuario_nome: row.usuario_nome?.trim() || row.usuario_login,
    usuario_login: row.usuario_login,
    unidade: row.unidade ?? undefined,
    data: toIsoDate(row.data_referencia) ?? "",
    entrada_1,
    saida_1,
    entrada_2,
    saida_2,
    horas_extras_minutos: toNumber(row.horas_extras_minutos),
    banco_horas_minutos: toNumber(row.banco_horas_minutos),
    faltas_minutos: toNumber(row.faltas_minutos),
    atrasos_minutos: toNumber(row.atrasos_minutos),
    observacoes: row.observacoes ?? undefined,
    ocorrencias: row.ocorrencias?.filter(Boolean) ?? [],
    alterado_manualmente: !!row.alterado_manualmente,
    status: row.status_registro,
    proxima_batida: obterProximaBatida({ entrada_1, saida_1, entrada_2, saida_2 }),
    total_trabalhado_minutos: toNumber(row.total_trabalhado_minutos),
    criado_em: row.criado_em.toISOString(),
    atualizado_em: row.atualizado_em.toISOString()
  };
}

export function mapHistoricoRowToResponse(row: HistoricoRow): RegistroPontoHistoricoItem {
  return {
    id: toStringId(row.id),
    acao: row.acao,
    usuario_id: row.usuario_id ? toStringId(row.usuario_id) : undefined,
    usuario_nome: row.usuario_nome ?? undefined,
    justificativa: row.justificativa ?? undefined,
    observacao: row.observacao ?? undefined,
    ip_origem: row.ip_origem ?? undefined,
    dados_antes: row.dados_antes ?? undefined,
    dados_depois: row.dados_depois ?? undefined,
    criado_em: row.criado_em.toISOString()
  };
}

export function mapOcorrenciaRowToResponse(row: OcorrenciaRow) {
  return {
    id: toStringId(row.id),
    tipo: row.tipo as RegistroPontoOcorrenciaTipo,
    descricao: row.descricao ?? undefined,
    origem: row.origem,
    criado_por_nome: row.criado_por_nome ?? undefined,
    criado_em: row.criado_em.toISOString()
  };
}

export function mapUsuarioCatalogoRowToResponse(row: UsuarioCatalogoRow): RegistroPontoUsuarioCatalogoItem {
  return {
    id: toStringId(row.id),
    nome: row.nome?.trim() || row.nome_usuario,
    login: row.nome_usuario,
    unidade: row.unidade ?? undefined
  };
}

export type {
  HistoricoRow,
  ListaRow,
  OcorrenciaRow,
  UsuarioCatalogoRow
};
