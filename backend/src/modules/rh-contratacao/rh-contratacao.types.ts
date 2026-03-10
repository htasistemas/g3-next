export type RhCandidatoInput = {
  nomeCompleto: string;
  cpf?: string | null;
  rg?: string | null;
  pis?: string | null;
  dataNascimento?: string | null;
  naturalidade?: string | null;
  estadoCivil?: string | null;
  nomeMae?: string | null;
  nomeConjuge?: string | null;
  vagaPretendida?: string | null;
  dataPreenchimento?: string | null;
  filhosPossui?: boolean;
  filhos?: unknown;
  deficienciaPossui?: boolean;
  deficienciaTipo?: string | null;
  deficienciaDescricao?: string | null;
  endereco?: unknown;
  telefone?: string | null;
  whatsapp?: string | null;
  anexos?: unknown;
  statusProcesso?: string | null;
};

export type RhStatusProcessoInput = {
  status: string;
};

export type RhEntrevistaInput = {
  tipoRoteiro?: string | null;
  perguntas?: unknown;
  respostas?: unknown;
  parecer?: string | null;
  observacoes?: string | null;
  dataEntrevista?: string | null;
};

export type RhFichaInput = {
  dadosPessoais?: unknown;
  dependentes?: unknown;
  dadosInternos?: unknown;
};

export type RhDocumentoInput = {
  tipoDocumento?: string | null;
  obrigatorio?: boolean;
  status?: string | null;
  observacao?: string | null;
};

export type RhArquivoInput = {
  categoria: string;
  tipoDocumento?: string | null;
  nomeArquivo: string;
  mimeType: string;
  tamanhoBytes?: number | null;
  conteudoBase64?: string | null;
  caminhoArquivo?: string | null;
};

export type RhTermoInput = {
  tipo: string;
  dados?: unknown;
  statusAssinatura?: string | null;
  dataAssinatura?: string | null;
  responsavel?: string | null;
};

export type RhPpdInput = {
  cabecalho?: unknown;
  ladoA?: unknown;
  ladoB?: unknown;
};

export type RhCartaBancoInput = {
  dados?: unknown;
};
