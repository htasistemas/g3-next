import type { VisitaDomiciliarRow } from "./visitas-domiciliares.types.js";

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function asArray(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => item && typeof item === "object") as Array<Record<string, unknown>>;
}

export function mapVisitaRowToResponse(row: VisitaDomiciliarRow) {
  return {
    id: Number(row.id),
    beneficiarioId: Number(row.beneficiario_id),
    beneficiarioNome: row.beneficiario_nome,
    unidade: row.unidade,
    responsavel: row.responsavel,
    dataVisita: row.data_visita.toISOString().slice(0, 10),
    horarioInicial: row.horario_inicial,
    horarioFinal: row.horario_final ?? undefined,
    tipoVisita: row.tipo_visita ?? undefined,
    situacao: row.situacao,
    usarEnderecoBeneficiario: row.usar_endereco_beneficiario,
    endereco: asObject(row.endereco),
    observacoesIniciais: row.observacoes_iniciais ?? undefined,
    condicoes: asObject(row.condicoes),
    situacaoSocial: asObject(row.situacao_social),
    registro: asObject(row.registro),
    anexos: asArray(row.anexos),
    criadoEm: row.criado_em.toISOString(),
    atualizadoEm: row.atualizado_em.toISOString()
  };
}
