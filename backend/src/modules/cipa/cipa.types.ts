export type CipaColaboradorInput = {
  unidadeId?: string | null;
  profissionalId?: string | null;
  matricula: string;
  nomeCompleto: string;
  cpf: string;
  dataNascimento: string;
  cargo?: string | null;
  setor?: string | null;
  turno?: string | null;
  dataAdmissao: string;
  dataDesligamento?: string | null;
  status?: "ATIVO" | "AFASTADO" | "DESLIGADO" | "INATIVO";
  email?: string | null;
  telefone?: string | null;
  fotoCaminhoLogico?: string | null;
};

export type CipaEleicaoInput = {
  unidadeId: string;
  nome: string;
  gestao: string;
  descricao?: string | null;
  observacoes?: string | null;
  inscricoesInicio: string;
  inscricoesFim: string;
  divulgacaoCandidatosEm?: string | null;
  votacaoInicio: string;
  votacaoFim: string;
  apuracaoEm?: string | null;
  publicacaoPrevistaEm?: string | null;
  posseEm?: string | null;
  titulares?: number;
  suplentes?: number;
  votosPorEleitor?: number;
  permiteVotoBranco?: boolean;
  permiteVotoNulo?: boolean;
  permiteVotacaoCelular?: boolean;
  permiteVotacaoPresencial?: boolean;
  regraDesempate?: "TEMPO_SERVICO_ESTABELECIMENTO" | "SORTEIO_AUDITADO" | "REGRA_CUSTOMIZADA";
};

export type CipaCandidaturaInput = {
  colaboradorId: string;
  apresentacao?: string | null;
  proposta?: string | null;
  declaracaoCiencia: boolean;
};

export type CipaPortalFinalidade = "CANDIDATURA" | "VOTACAO";

export type CipaColaboradorFilters = {
  termo?: string;
  status?: string;
  unidadeId?: string;
  pagina?: number;
  limite?: number;
};
