export type DocumentoSituacao =
  | "valido"
  | "vence_em_breve"
  | "vencido"
  | "em_renovacao"
  | "sem_vencimento";

export type DocumentoInstituicaoInput = {
  tipoDocumento: string;
  orgaoEmissor: string;
  descricao?: string | null;
  categoria?: string | null;
  emissao: string;
  validade?: string | null;
  responsavelInterno?: string | null;
  modoRenovacao?: string | null;
  observacaoRenovacao?: string | null;
  gerarAlerta?: boolean;
  diasAntecedencia?: number[] | null;
  formaAlerta?: string | null;
  emRenovacao?: boolean;
  semVencimento?: boolean;
  vencimentoIndeterminado?: boolean;
};

export type DocumentoInstituicaoAnexoInput = {
  nomeArquivo: string;
  tipo: string;
  tipoMime?: string | null;
  conteudoBase64: string;
  tamanho?: string | null;
  dataUpload?: string | null;
  usuario: string;
};

export type DocumentoInstituicaoHistoricoInput = {
  dataHora?: string | null;
  usuario: string;
  tipoAlteracao: string;
  observacao?: string | null;
};

export type DocumentoInstituicaoRow = {
  id: bigint;
  tipo_documento: string;
  orgao_emissor: string;
  descricao: string | null;
  categoria: string | null;
  emissao: Date;
  validade: Date | null;
  responsavel_interno: string | null;
  modo_renovacao: string | null;
  observacao_renovacao: string | null;
  gerar_alerta: boolean;
  dias_antecedencia: unknown;
  forma_alerta: string | null;
  em_renovacao: boolean;
  sem_vencimento: boolean;
  vencimento_indeterminado: boolean;
  situacao: string | null;
  criado_em: Date;
  atualizado_em: Date;
};

export type DocumentoInstituicaoAnexoRow = {
  id: bigint;
  documento_id: bigint;
  nome_arquivo: string;
  tipo: string;
  tipo_mime: string | null;
  tamanho: string | null;
  caminho_arquivo: string | null;
  data_upload: Date;
  usuario: string;
  criado_em: Date;
};

export type DocumentoInstituicaoHistoricoRow = {
  id: bigint;
  documento_id: bigint;
  data_hora: Date;
  usuario: string;
  tipo_alteracao: string;
  observacao: string | null;
  criado_em: Date;
};
