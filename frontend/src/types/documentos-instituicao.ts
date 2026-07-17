export type DocumentoSituacao =
  | "valido"
  | "vence_em_breve"
  | "vencido"
  | "em_renovacao"
  | "sem_vencimento";

export type DocumentoInstituicao = {
  id: string;
  tipoDocumento: string;
  orgaoEmissor: string;
  descricao?: string;
  categoria?: string;
  emissao?: string;
  validade?: string;
  responsavelInterno?: string;
  modoRenovacao?: string;
  observacaoRenovacao?: string;
  gerarAlerta?: boolean;
  diasAntecedencia?: number[];
  formaAlerta?: string;
  emRenovacao?: boolean;
  semVencimento?: boolean;
  vencimentoIndeterminado?: boolean;
  situacao?: DocumentoSituacao;
  criadoEm?: string;
  atualizadoEm?: string;
};

export type DocumentoInstituicaoPayload = Omit<
  DocumentoInstituicao,
  "id" | "situacao" | "criadoEm" | "atualizadoEm"
>;

export type DocumentoInstituicaoAnexo = {
  id: string;
  arquivoId?: string;
  documentoId: string;
  nomeArquivo: string;
  tipo: string;
  tipoMime?: string;
  tamanho?: string;
  dataUpload?: string;
  usuario: string;
  arquivoUrl?: string;
  criadoEm?: string;
};

export type DocumentoInstituicaoAnexoPayload = {
  nomeArquivo: string;
  tipo: string;
  tipoMime?: string;
  conteudoBase64?: string;
  caminhoArquivo?: string;
  tamanho?: string;
  dataUpload?: string;
  usuario: string;
};

export type DocumentoInstituicaoHistorico = {
  id: string;
  documentoId: string;
  dataHora: string;
  usuario: string;
  tipoAlteracao: string;
  observacao?: string;
  criadoEm?: string;
};

export type DocumentoInstituicaoHistoricoPayload = {
  dataHora?: string;
  usuario: string;
  tipoAlteracao: string;
  observacao?: string;
};
