export type OcorrenciaCriancaInput = {
  dataPreenchimento: string;
  vitimaNome: string;
  vitimaIdade: number | null;
  resumoViolencia: string;
  [key: string]: unknown;
};

export type OcorrenciaCriancaAnexoInput = {
  nomeArquivo: string;
  tipoMime: string;
  conteudoBase64: string;
  ordem: number;
};

export type OcorrenciaCriancaRow = {
  id: bigint;
  payload: unknown;
  criado_em: Date;
  atualizado_em: Date;
};

export type OcorrenciaCriancaAnexoRow = {
  id: bigint;
  ocorrencia_id: bigint;
  nome_arquivo: string;
  tipo_mime: string;
  conteudo_base64: string;
  ordem: number;
  criado_em: Date;
  atualizado_em: Date;
};
