export type FotoUploadPayload = {
  nomeArquivo: string;
  contentType: string;
  conteudo: string;
};

export type FotoEvento = {
  id: number;
  unidadeId?: number | null;
  titulo: string;
  descricao?: string | null;
  dataEvento: string;
  local?: string | null;
  status?: string | null;
  tags?: string[];
  fotoPrincipalId?: number | null;
  fotoPrincipalUrl?: string | null;
  totalFotos?: number;
  criadoEm?: string;
  atualizadoEm?: string;
};

export type FotoEventoItem = {
  id: number;
  eventoId: number;
  arquivo?: string | null;
  arquivoUrl?: string | null;
  nomeArquivo?: string | null;
  mimeType?: string | null;
  tamanhoBytes?: number | null;
  largura?: number | null;
  altura?: number | null;
  legenda?: string | null;
  creditos?: string | null;
  tags?: string[];
  ordem?: number | null;
  criadoEm?: string;
  atualizadoEm?: string;
};

export type FotoEventoPayload = {
  titulo: string;
  descricao?: string;
  dataEvento: string;
  local?: string;
  status?: string;
  tags?: string[];
  unidadeId?: number | null;
  fotoPrincipalUpload?: FotoUploadPayload | null;
  fotoPrincipalId?: number | null;
};
