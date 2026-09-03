export type CipaEleicao = {
  id: string;
  identificadorPublico: string;
  nome: string;
  gestao: string;
  status: string;
  unidadeId: string;
  inscricoesInicio: string;
  inscricoesFim: string;
  votacaoInicio: string;
  votacaoFim: string;
  configuracao?: {
    titulares: number;
    suplentes: number;
    votosPorEleitor: number;
    permiteVotoBranco: boolean;
    permiteVotoNulo: boolean;
    permiteVotacaoCelular?: boolean;
    permiteVotacaoPresencial?: boolean;
    regraDesempate: string;
    regrasVersao: string;
  };
};

export type CipaColaborador = {
  id: string;
  matricula: string;
  nomeCompleto: string;
  cpfMascarado: string;
  unidadeId?: string;
  cargo?: string;
  setor?: string;
  status: string;
};

export type CipaEleitor = { id: string; colaboradorId: string; nomeCompleto: string; matricula: string; cpfMascarado: string; status: string };

export type CipaDashboard = {
  eleicaoId: string;
  eleitores: { totalAptos: number; votosRealizados: number; aindaNaoVotaram: number; percentualParticipacao: number };
  candidatos: { inscritos: number; aguardandoAnalise: number; aprovados: number; reprovados: number; desistentes: number };
  participacao: {
    total: number;
    porHora: Array<{ periodo: string; total: number }>;
    porUnidade: CipaParticipacaoDimensao[];
    porSetor: CipaParticipacaoDimensao[];
    porTurno: CipaParticipacaoDimensao[];
  };
};

export type CipaParticipacaoDimensao = {
  dimensao: string;
  totalAptos: number;
  votosRealizados: number;
  aindaNaoVotaram: number;
  percentualParticipacao: number;
};
