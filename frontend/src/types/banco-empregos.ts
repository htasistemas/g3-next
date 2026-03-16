export type BancoEmpregosDashboard = {
  cards: {
    totalCandidatos: number;
    candidatosAtivos: number;
    emAnalise: number;
    preSelecionados: number;
    emEntrevista: number;
    encaminhados: number;
    aprovados: number;
    contratados: number;
    vagasAbertas: number;
    vagasPreenchidas: number;
    entrevistasAgendadas: number;
    curriculosAnexados: number;
  };
  rankingBairros: Array<{ nome: string; total: number }>;
  rankingCidades: Array<{ nome: string; total: number }>;
  rankingAreas: Array<{ nome: string; total: number }>;
};

export type BancoEmpregosExperiencia = {
  empresa?: string;
  cargo?: string;
  dataInicio?: string;
  dataFim?: string;
  atividades?: string;
  motivoSaida?: string;
};

export type BancoEmpregosFormacao = {
  curso?: string;
  instituicao?: string;
  situacao?: string;
  anoConclusao?: string;
};

export type BancoEmpregosHabilidade = {
  categoria?: string;
  descricao?: string;
  nivel?: string;
};

export type BancoEmpregosCriterio = {
  criterio: string;
  peso?: number;
  nota?: number;
  observacao?: string;
};

export type BancoEmpregosCandidatoPayload = {
  beneficiarioId?: string;
  nomeCompleto: string;
  cpf?: string;
  rg?: string;
  dataNascimento?: string;
  sexo?: string;
  estadoCivil?: string;
  telefone?: string;
  whatsapp?: string;
  email?: string;
  cep?: string;
  endereco?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  escolaridade?: string;
  cursos?: string;
  formacaoComplementar?: string;
  areaInteresse?: string;
  cargoPretendido?: string;
  pretensaoSalarial?: number;
  disponibilidade?: string;
  possuiExperiencia?: boolean;
  ultimaEmpresa?: string;
  funcaoExercida?: string;
  tempoExperiencia?: string;
  resumoProfissional?: string;
  observacoes?: string;
  situacao?:
    | "ATIVO"
    | "EM_ANALISE"
    | "PRE_SELECIONADO"
    | "EM_ENTREVISTA"
    | "ENCAMINHADO"
    | "APROVADO"
    | "REPROVADO"
    | "CONTRATADO"
    | "BANCO_TALENTOS"
    | "INATIVO";
  experiencias?: BancoEmpregosExperiencia[];
  formacoes?: BancoEmpregosFormacao[];
  habilidades?: BancoEmpregosHabilidade[];
  curriculoExtraido?: Record<string, unknown>;
};

export type BancoEmpregosCandidato = BancoEmpregosCandidatoPayload & {
  id: string;
  ativo: boolean;
  idade?: number;
  curriculoVersao?: number;
  dataEnvioCurriculo?: string;
  totalDocumentos?: number;
  totalCurriculos?: number;
  totalCertificados?: number;
  criadoEm?: string;
  atualizadoEm?: string;
};

export type BancoEmpregosVagaPayload = {
  titulo: string;
  empresaNome: string;
  area?: string;
  quantidadeVagas?: number;
  requisitos?: string;
  escolaridadeMinima?: string;
  experienciaMinima?: string;
  bairro?: string;
  cidade?: string;
  tipoContratacao?: string;
  jornada?: string;
  faixaSalarial?: string;
  beneficios?: string;
  observacoes?: string;
  dataAbertura?: string;
  dataLimite?: string;
  situacao?: "ABERTA" | "EM_TRIAGEM" | "EM_ENTREVISTA" | "PREENCHIDA" | "CANCELADA";
  projetoServico?: string;
  unidadeReferencia?: string;
  criterios?: BancoEmpregosCriterio[];
};

export type BancoEmpregosVaga = BancoEmpregosVagaPayload & {
  id: string;
  ativo: boolean;
  totalProcessos?: number;
  totalSelecionados?: number;
  totalContratados?: number;
  criadoEm?: string;
  atualizadoEm?: string;
};

export type BancoEmpregosAvaliacaoPayload = {
  criterios: BancoEmpregosCriterio[];
  observacaoGeral?: string;
};

export type BancoEmpregosAvaliacao = BancoEmpregosAvaliacaoPayload & {
  id: string;
  processoId: string;
  notaFinal: number;
  aderenciaPercentual: number;
  atualizadoPorId?: string;
  atualizadoPorNome?: string;
  criadoEm?: string;
  atualizadoEm?: string;
};

export type BancoEmpregosProcessoPayload = {
  vagaId: string;
  candidatoId: string;
  etapa?:
    | "TRIAGEM_INICIAL"
    | "PRE_SELECIONADOS"
    | "ENTREVISTA_AGENDADA"
    | "APROVADOS"
    | "REPROVADOS"
    | "CONTRATADOS"
    | "BANCO_TALENTOS";
  status?:
    | "EM_ANALISE"
    | "ENCAMINHADO"
    | "ENTREVISTA_MARCADA"
    | "APROVADO"
    | "REPROVADO"
    | "CONTRATADO"
    | "BANCO_TALENTOS";
  observacoes?: string;
  responsavelNome?: string;
  dataEntrevista?: string;
  dataEncaminhamento?: string;
  selecionado?: boolean;
  contratado?: boolean;
};

export type BancoEmpregosProcesso = BancoEmpregosProcessoPayload & {
  id: string;
  vagaTitulo?: string;
  empresaNome?: string;
  candidatoNome?: string;
  candidatoBairro?: string;
  candidatoCidade?: string;
  candidatoSituacao?: string;
  ativo: boolean;
  notaFinal?: number;
  aderenciaPercentual?: number;
  avaliacaoObservacao?: string;
  avaliacao?: BancoEmpregosAvaliacao | null;
  dataMovimentacao?: string;
  criadoEm?: string;
  atualizadoEm?: string;
};

export type BancoEmpregosDocumento = {
  id: string;
  candidatoId: string;
  arquivoId: string;
  categoria: "CURRICULO" | "CERTIFICADO" | "DOCUMENTO_COMPLEMENTAR";
  descricao?: string;
  versao: number;
  principal: boolean;
  extraido?: Record<string, unknown>;
  ativo: boolean;
  nomeOriginal: string;
  nomeArquivo: string;
  caminhoArquivo: string;
  mimeType: string;
  tamanhoBytes: number;
  dataUpload?: string;
  criadoEm?: string;
  atualizadoEm?: string;
};

export type BancoEmpregosHistorico = {
  id: string;
  entidadeTipo: string;
  entidadeId: string;
  candidatoId?: string;
  vagaId?: string;
  processoId?: string;
  usuarioId?: string;
  usuarioNome?: string;
  acao: string;
  observacao?: string;
  criadoEm?: string;
};

export type BancoEmpregosCandidatoFiltros = {
  termo?: string;
  nome?: string;
  cpf?: string;
  bairro?: string;
  cidade?: string;
  escolaridade?: string;
  areaInteresse?: string;
  cargoPretendido?: string;
  sexo?: string;
  idadeExata?: number;
  faixaEtaria?: string;
  situacao?: string;
  possuiExperiencia?: boolean;
  possuiCurriculo?: boolean;
  possuiCertificados?: boolean;
  disponibilidade?: string;
  dataCadastroDe?: string;
  dataCadastroAte?: string;
  pagina?: number;
  limite?: number;
};

export type BancoEmpregosVagaFiltros = {
  termo?: string;
  titulo?: string;
  empresaNome?: string;
  area?: string;
  cidade?: string;
  situacao?: string;
  dataAberturaDe?: string;
  dataAberturaAte?: string;
  semSelecionado?: boolean;
  pagina?: number;
  limite?: number;
};

export type BancoEmpregosProcessoFiltros = {
  vagaId?: string;
  candidatoId?: string;
  etapa?: string;
  status?: string;
  selecionado?: boolean;
  contratado?: boolean;
  pagina?: number;
  limite?: number;
};

export type BancoEmpregosHistoricoFiltros = {
  entidadeTipo?: string;
  candidatoId?: string;
  vagaId?: string;
  processoId?: string;
  pagina?: number;
  limite?: number;
};

export type BancoEmpregosListaCandidatos = {
  pagina: number;
  limite: number;
  total: number;
  candidatos: BancoEmpregosCandidato[];
};

export type BancoEmpregosListaVagas = {
  pagina: number;
  limite: number;
  total: number;
  vagas: BancoEmpregosVaga[];
};

export type BancoEmpregosListaProcessos = {
  pagina: number;
  limite: number;
  total: number;
  processos: BancoEmpregosProcesso[];
};

export type BancoEmpregosListaHistorico = {
  pagina: number;
  limite: number;
  total: number;
  historico: BancoEmpregosHistorico[];
};

export type BancoEmpregosDetalheCandidato = {
  candidato: BancoEmpregosCandidato;
  documentos: BancoEmpregosDocumento[];
  processos: BancoEmpregosProcesso[];
};

export type BancoEmpregosDetalheVaga = {
  vaga: BancoEmpregosVaga;
  processos: BancoEmpregosProcesso[];
};
