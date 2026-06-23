export type ArquivoMetadata = {
  id: number;
  entidadeTipo: string;
  entidadeId?: number;
  categoria: string;
  nomeOriginal: string;
  nomeArquivo: string;
  caminhoArquivo: string;
  thumbnailCaminho?: string;
  mimeType: string;
  observacao?: string;
  dataUpload: string;
};
