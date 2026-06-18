import type { ArquivoMetadataRow } from "./arquivos.types.js";

type UploadArquivoResult = {
  registro?: ArquivoMetadataRow;
  caminhoArquivo?: string;
  thumbnailCaminho?: string;
};

function toJsonNumber(value?: bigint | null) {
  if (value === null || value === undefined) {
    return null;
  }

  return Number(value);
}

function toJsonDate(value?: Date | null) {
  return value ? value.toISOString() : null;
}

export function mapArquivoMetadataToResponse(row: ArquivoMetadataRow) {
  return {
    id: Number(row.id),
    tenant_id: row.tenant_id,
    entidade_tipo: row.entidade_tipo,
    entidade_id: toJsonNumber(row.entidade_id),
    categoria: row.categoria,
    nome_original: row.nome_original,
    nome_arquivo: row.nome_arquivo,
    caminho_arquivo: row.caminho_arquivo,
    thumbnail_caminho: row.thumbnail_caminho,
    mime_type: row.mime_type,
    extensao: row.extensao,
    tamanho_bytes: Number(row.tamanho_bytes),
    data_upload: row.data_upload.toISOString(),
    usuario_upload_id: toJsonNumber(row.usuario_upload_id),
    ativo: row.ativo,
    observacao: row.observacao,
    metadados_json: row.metadados_json,
    criado_em: row.criado_em.toISOString(),
    atualizado_em: row.atualizado_em.toISOString(),
    excluido_em: toJsonDate(row.excluido_em)
  };
}

export function mapArquivoUploadToResponse(result: UploadArquivoResult) {
  const registro = result.registro ? mapArquivoMetadataToResponse(result.registro) : undefined;

  return {
    ...(registro ?? {}),
    registro,
    caminhoArquivo: result.caminhoArquivo ?? registro?.caminho_arquivo,
    thumbnailCaminho: result.thumbnailCaminho ?? registro?.thumbnail_caminho
  };
}
