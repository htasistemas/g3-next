import type { VisitaDomiciliarRow } from "./visitas-domiciliares.types.js";

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function asArray(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => item && typeof item === "object") as Array<Record<string, unknown>>;
}

function formatarDataIso(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "string") {
    const valor = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
      return valor;
    }

    const parsed = new Date(valor);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
  }

  return new Date().toISOString().slice(0, 10);
}

function formatarHorario(value: unknown): string | undefined {
  if (!value) return undefined;

  if (value instanceof Date) {
    return value.toISOString().slice(11, 16);
  }

  if (typeof value === "string") {
    const valor = value.trim();

    if (/^\d{2}:\d{2}(:\d{2})?$/.test(valor)) {
      return valor.slice(0, 5);
    }

    const horarioIso = valor.match(/T(\d{2}:\d{2})/);
    if (horarioIso?.[1]) {
      return horarioIso[1];
    }

    const parsed = new Date(valor);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(11, 16);
    }
  }

  return undefined;
}

function formatarDateTimeIso(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "string") {
    const valor = value.trim();
    const parsed = new Date(valor);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return new Date().toISOString();
}

export function mapVisitaRowToResponse(row: VisitaDomiciliarRow) {
  return {
    id: Number(row.id),
    beneficiarioId: Number(row.beneficiario_id),
    beneficiarioNome: row.beneficiario_nome,
    unidade: row.unidade,
    responsavel: row.responsavel,
    dataVisita: formatarDataIso(row.data_visita),
    horarioInicial: formatarHorario(row.horario_inicial) ?? "",
    horarioFinal: formatarHorario(row.horario_final) ?? undefined,
    tipoVisita: row.tipo_visita ?? undefined,
    situacao: row.situacao,
    usarEnderecoBeneficiario: row.usar_endereco_beneficiario,
    endereco: asObject(row.endereco),
    observacoesIniciais: row.observacoes_iniciais ?? undefined,
    condicoes: asObject(row.condicoes),
    situacaoSocial: asObject(row.situacao_social),
    registro: asObject(row.registro),
    anexos: asArray(row.anexos),
    criadoEm: formatarDateTimeIso(row.criado_em),
    atualizadoEm: formatarDateTimeIso(row.atualizado_em)
  };
}
