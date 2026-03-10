import type { OcorrenciaCriancaAnexoRow, OcorrenciaCriancaRow } from "./ocorrencias-crianca.types.js";

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

export function mapOcorrenciaCriancaRowToResponse(row: OcorrenciaCriancaRow) {
  const payload = asRecord(row.payload);
  return {
    ...payload,
    id: String(row.id),
    criadoEm: row.criado_em.toISOString(),
    atualizadoEm: row.atualizado_em.toISOString()
  };
}

export function mapOcorrenciaCriancaAnexoRowToResponse(row: OcorrenciaCriancaAnexoRow) {
  return {
    id: String(row.id),
    ocorrenciaId: String(row.ocorrencia_id),
    nomeArquivo: row.nome_arquivo,
    tipoMime: row.tipo_mime,
    conteudoBase64: row.conteudo_base64,
    ordem: row.ordem,
    criadoEm: row.criado_em.toISOString(),
    atualizadoEm: row.atualizado_em.toISOString()
  };
}
