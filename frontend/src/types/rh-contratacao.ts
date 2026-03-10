export type RhResumoCandidato = {
  candidatoId: number;
  nomeCompleto: string;
  cpf?: string;
  telefone?: string;
  vagaPretendida?: string;
  ativo: boolean;
  processoId?: number;
  status?: string;
  atualizadoEm?: string;
};

export type RhCandidatoDetalhe = {
  id: number;
  nomeCompleto: string;
  cpf?: string;
  rg?: string;
  pis?: string;
  dataNascimento?: string;
  naturalidade?: string;
  estadoCivil?: string;
  nomeMae?: string;
  nomeConjuge?: string;
  vagaPretendida?: string;
  dataPreenchimento?: string;
  filhosPossui?: boolean;
  filhos?: unknown;
  deficienciaPossui?: boolean;
  deficienciaTipo?: string;
  deficienciaDescricao?: string;
  endereco?: unknown;
  telefone?: string;
  whatsapp?: string;
  anexos?: unknown;
  ativo?: boolean;
  criadoEm?: string;
  atualizadoEm?: string;
};

export type RhCandidatoPayload = {
  nomeCompleto: string;
  cpf?: string;
  rg?: string;
  pis?: string;
  dataNascimento?: string;
  naturalidade?: string;
  estadoCivil?: string;
  nomeMae?: string;
  nomeConjuge?: string;
  vagaPretendida?: string;
  dataPreenchimento?: string;
  filhosPossui?: boolean;
  filhos?: unknown;
  deficienciaPossui?: boolean;
  deficienciaTipo?: string;
  deficienciaDescricao?: string;
  endereco?: unknown;
  telefone?: string;
  whatsapp?: string;
  anexos?: unknown;
  statusProcesso?: string;
};

export type RhProcesso = {
  id: number;
  candidatoId: number;
  status: string;
  responsavelId?: number;
  gestorId?: number;
  ultimaMovimentacaoEm?: string;
  criadoEm?: string;
  atualizadoEm?: string;
  nomeCompleto?: string;
  cpf?: string;
  telefone?: string;
  vagaPretendida?: string;
  ativo?: boolean;
};

export type RhEntrevistaPayload = {
  tipoRoteiro?: string;
  perguntas?: unknown;
  respostas?: unknown;
  parecer?: string;
  observacoes?: string;
  dataEntrevista?: string;
};

export type RhEntrevista = RhEntrevistaPayload & {
  id: number;
  processoId: number;
  criadoPor?: number;
  criadoEm?: string;
};

export type RhFichaPayload = {
  dadosPessoais?: unknown;
  dependentes?: unknown;
  dadosInternos?: unknown;
};

export type RhFicha = RhFichaPayload & {
  id: number;
  processoId: number;
  criadoEm?: string;
  atualizadoEm?: string;
};

export type RhDocumento = {
  id: number;
  processoId: number;
  tipoDocumento: string;
  obrigatorio: boolean;
  status: string;
  observacao?: string;
  atualizadoPor?: number;
  criadoEm?: string;
  atualizadoEm?: string;
};

export type RhDocumentoPayload = {
  tipoDocumento?: string;
  obrigatorio?: boolean;
  status?: string;
  observacao?: string;
};

export type RhArquivoPayload = {
  categoria: string;
  tipoDocumento?: string;
  nomeArquivo: string;
  mimeType: string;
  tamanhoBytes?: number;
  conteudoBase64?: string;
  caminhoArquivo?: string;
};

export type RhArquivo = {
  id: number;
  processoId: number;
  categoria: string;
  tipoDocumento?: string;
  nomeArquivo: string;
  mimeType: string;
  tamanhoBytes: number;
  caminhoArquivo?: string;
  versao: number;
  criadoPor?: number;
  criadoEm?: string;
};

export type RhTermoPayload = {
  tipo: string;
  dados?: unknown;
  statusAssinatura?: string;
  dataAssinatura?: string;
  responsavel?: string;
};

export type RhTermo = RhTermoPayload & {
  id: number;
  processoId: number;
  criadoEm?: string;
  atualizadoEm?: string;
};

export type RhPpdPayload = {
  cabecalho?: unknown;
  ladoA?: unknown;
  ladoB?: unknown;
};

export type RhPpd = RhPpdPayload & {
  id: number;
  processoId: number;
  criadoEm?: string;
  atualizadoEm?: string;
};

export type RhCartaBancoPayload = {
  dados?: unknown;
};

export type RhCartaBanco = RhCartaBancoPayload & {
  id: number;
  processoId: number;
  criadoEm?: string;
  atualizadoEm?: string;
};

export type RhAuditoria = {
  id: string;
  processoId: number;
  atorId?: number;
  atorNome?: string;
  acao: string;
  detalhes?: string;
  criadoEm?: string;
};
