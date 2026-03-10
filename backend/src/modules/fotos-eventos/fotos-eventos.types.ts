export type FotoUploadInput = {
  nomeArquivo: string;
  contentType: string;
  conteudo: string;
};

export type FotoEventoInput = {
  titulo: string;
  descricao?: string | null;
  dataEvento: string;
  local?: string | null;
  status?: string | null;
  tags?: string[] | null;
  unidadeId?: number | null;
  fotoPrincipalUpload?: FotoUploadInput | null;
  fotoPrincipalId?: number | null;
};

export type FotoEventoFotoInput = {
  arquivo: FotoUploadInput;
  legenda?: string | null;
  creditos?: string | null;
  tags?: string[] | null;
  ordem?: number | null;
};

export type FotoEventoFotoAtualizacaoInput = {
  legenda?: string | null;
  creditos?: string | null;
  tags?: string[] | null;
  ordem?: number | null;
};

export type FotoEventoFiltros = {
  busca?: string;
  dataInicio?: string;
  dataFim?: string;
  unidadeId?: string;
  status?: string;
  tags?: string | string[];
  ordenacao?: string;
  pagina?: string;
  tamanho?: string;
};

export type FotoEventoRow = {
  id: bigint;
  unidade_id: bigint | null;
  titulo: string;
  descricao: string | null;
  data_evento: Date;
  local: string | null;
  status: string;
  tags: string | null;
  foto_principal_id: bigint | null;
  criado_em: Date;
  atualizado_em: Date;
};

export type FotoEventoItemRow = {
  id: bigint;
  evento_id: bigint;
  arquivo: string;
  nome_arquivo: string | null;
  mime_type: string | null;
  tamanho_bytes: bigint | null;
  largura: number | null;
  altura: number | null;
  legenda: string | null;
  creditos: string | null;
  tags: string | null;
  ordem: number | null;
  criado_em: Date;
  atualizado_em: Date;
};
