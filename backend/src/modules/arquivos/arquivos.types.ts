export type ArquivoAcaoAuditoria = "UPLOAD" | "UPDATE" | "DELETE" | "VIEW";

export type ArquivoCategoria =
  | "foto"
  | "documento"
  | "imagem"
  | "comprovante"
  | "anexo"
  | "outro";

export type ArquivoEntidadeTipo =
  | "beneficiario"
  | "colaborador"
  | "instituicao"
  | "doacao"
  | "curso"
  | "almoxarifado"
  | "evento"
  | "chamado_tecnico"
  | "ocorrencia_crianca"
  | "oficio"
  | "autorizacao_compra"
  | "contabilidade_lancamento"
  | "geral";

export type ArquivoMetadataRow = {
  id: bigint;
  tenant_id: string | null;
  entidade_tipo: string;
  entidade_id: bigint | null;
  categoria: string;
  nome_original: string;
  nome_arquivo: string;
  caminho_arquivo: string;
  thumbnail_caminho: string | null;
  mime_type: string;
  extensao: string | null;
  tamanho_bytes: bigint;
  data_upload: Date;
  usuario_upload_id: bigint | null;
  ativo: boolean;
  observacao: string | null;
  metadados_json: unknown;
  criado_em: Date;
  atualizado_em: Date;
  excluido_em: Date | null;
};

export type ArquivoMetadataCreateInput = {
  tenantId?: string | null;
  entidadeTipo: string;
  entidadeId?: bigint | null;
  categoria: string;
  nomeOriginal: string;
  nomeArquivo: string;
  caminhoArquivo: string;
  thumbnailCaminho?: string | null;
  mimeType: string;
  extensao?: string | null;
  tamanhoBytes: number;
  usuarioUploadId?: bigint | null;
  observacao?: string | null;
  metadadosJson?: Record<string, unknown> | null;
};

export type ArquivoListFilters = {
  tenantId?: string;
  entidadeTipo?: string;
  entidadeId?: bigint;
  categoria?: string;
  ativo?: boolean;
};
