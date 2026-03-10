import type { FotoEventoItemRow, FotoEventoRow } from "./fotos-eventos.types.js";

function splitTags(tags?: string | null) {
  if (!tags) return [];
  return tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function mapFotoEventoToResponse(
  row: FotoEventoRow,
  totalFotos = 0,
  fotoPrincipalUrl?: string | null
) {
  return {
    id: Number(row.id),
    unidadeId: row.unidade_id ? Number(row.unidade_id) : null,
    titulo: row.titulo,
    descricao: row.descricao ?? null,
    dataEvento: row.data_evento.toISOString().slice(0, 10),
    local: row.local ?? null,
    status: row.status,
    tags: splitTags(row.tags),
    fotoPrincipalId: row.foto_principal_id ? Number(row.foto_principal_id) : null,
    fotoPrincipalUrl: fotoPrincipalUrl ?? null,
    totalFotos,
    criadoEm: row.criado_em.toISOString(),
    atualizadoEm: row.atualizado_em.toISOString()
  };
}

export function mapFotoEventoItemToResponse(row: FotoEventoItemRow) {
  return {
    id: Number(row.id),
    eventoId: Number(row.evento_id),
    arquivo: row.arquivo,
    arquivoUrl: row.arquivo,
    nomeArquivo: row.nome_arquivo ?? null,
    mimeType: row.mime_type ?? null,
    tamanhoBytes: row.tamanho_bytes ? Number(row.tamanho_bytes) : null,
    largura: row.largura ?? null,
    altura: row.altura ?? null,
    legenda: row.legenda ?? null,
    creditos: row.creditos ?? null,
    tags: splitTags(row.tags),
    ordem: row.ordem ?? null,
    criadoEm: row.criado_em.toISOString(),
    atualizadoEm: row.atualizado_em.toISOString()
  };
}
