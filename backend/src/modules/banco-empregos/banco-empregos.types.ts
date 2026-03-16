export type BancoEmpregosSituacaoCandidato =
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

export type BancoEmpregosSituacaoVaga =
  | "ABERTA"
  | "EM_TRIAGEM"
  | "EM_ENTREVISTA"
  | "PREENCHIDA"
  | "CANCELADA";

export type BancoEmpregosEtapaProcesso =
  | "TRIAGEM_INICIAL"
  | "PRE_SELECIONADOS"
  | "ENTREVISTA_AGENDADA"
  | "APROVADOS"
  | "REPROVADOS"
  | "CONTRATADOS"
  | "BANCO_TALENTOS";

export type BancoEmpregosStatusProcesso =
  | "EM_ANALISE"
  | "ENCAMINHADO"
  | "ENTREVISTA_MARCADA"
  | "APROVADO"
  | "REPROVADO"
  | "CONTRATADO"
  | "BANCO_TALENTOS";

export type BancoEmpregosCategoriaDocumento =
  | "CURRICULO"
  | "CERTIFICADO"
  | "DOCUMENTO_COMPLEMENTAR";

export type BancoEmpregosExperienciaInput = {
  empresa?: string | null;
  cargo?: string | null;
  dataInicio?: string | null;
  dataFim?: string | null;
  atividades?: string | null;
  motivoSaida?: string | null;
};

export type BancoEmpregosFormacaoInput = {
  curso?: string | null;
  instituicao?: string | null;
  situacao?: string | null;
  anoConclusao?: string | null;
};

export type BancoEmpregosHabilidadeInput = {
  categoria?: string | null;
  descricao?: string | null;
  nivel?: string | null;
};

export type BancoEmpregosCriterioInput = {
  criterio: string;
  peso?: number | null;
  nota?: number | null;
  observacao?: string | null;
};

export type BancoEmpregosCandidatoInput = {
  beneficiarioId?: string | null;
  nomeCompleto: string;
  cpf?: string | null;
  rg?: string | null;
  dataNascimento?: string | null;
  sexo?: string | null;
  estadoCivil?: string | null;
  telefone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  cep?: string | null;
  endereco?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
  escolaridade?: string | null;
  cursos?: string | null;
  formacaoComplementar?: string | null;
  areaInteresse?: string | null;
  cargoPretendido?: string | null;
  pretensaoSalarial?: number | null;
  disponibilidade?: string | null;
  possuiExperiencia?: boolean | null;
  ultimaEmpresa?: string | null;
  funcaoExercida?: string | null;
  tempoExperiencia?: string | null;
  resumoProfissional?: string | null;
  observacoes?: string | null;
  situacao?: BancoEmpregosSituacaoCandidato;
  experiencias?: BancoEmpregosExperienciaInput[];
  formacoes?: BancoEmpregosFormacaoInput[];
  habilidades?: BancoEmpregosHabilidadeInput[];
  curriculoExtraido?: Record<string, unknown> | null;
};

export type BancoEmpregosVagaInput = {
  titulo: string;
  empresaNome: string;
  area?: string | null;
  quantidadeVagas?: number | null;
  requisitos?: string | null;
  escolaridadeMinima?: string | null;
  experienciaMinima?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  tipoContratacao?: string | null;
  jornada?: string | null;
  faixaSalarial?: string | null;
  beneficios?: string | null;
  observacoes?: string | null;
  dataAbertura?: string | null;
  dataLimite?: string | null;
  situacao?: BancoEmpregosSituacaoVaga;
  projetoServico?: string | null;
  unidadeReferencia?: string | null;
  criterios?: BancoEmpregosCriterioInput[];
};

export type BancoEmpregosProcessoInput = {
  vagaId: string;
  candidatoId: string;
  etapa?: BancoEmpregosEtapaProcesso | null;
  status?: BancoEmpregosStatusProcesso | null;
  observacoes?: string | null;
  responsavelNome?: string | null;
  dataEntrevista?: string | null;
  dataEncaminhamento?: string | null;
  selecionado?: boolean | null;
  contratado?: boolean | null;
};

export type BancoEmpregosAvaliacaoInput = {
  criterios: BancoEmpregosCriterioInput[];
  observacaoGeral?: string | null;
};

export type BancoEmpregosDashboardFiltersInput = {
  bairro?: string | null;
  cidade?: string | null;
  escolaridade?: string | null;
  areaInteresse?: string | null;
  cargoPretendido?: string | null;
  sexo?: string | null;
  idadeExata?: number | null;
  faixaEtaria?: string | null;
  situacao?: string | null;
  possuiCurriculo?: boolean | null;
  possuiCertificados?: boolean | null;
  possuiExperiencia?: boolean | null;
  statusVaga?: string | null;
  dataCadastroDe?: string | null;
  dataCadastroAte?: string | null;
};

export type BancoEmpregosCandidatoFiltersInput = BancoEmpregosDashboardFiltersInput & {
  termo?: string | null;
  nome?: string | null;
  cpf?: string | null;
  disponibilidade?: string | null;
  pagina?: number | null;
  limite?: number | null;
};

export type BancoEmpregosVagaFiltersInput = {
  termo?: string | null;
  titulo?: string | null;
  empresaNome?: string | null;
  area?: string | null;
  cidade?: string | null;
  situacao?: string | null;
  dataAberturaDe?: string | null;
  dataAberturaAte?: string | null;
  semSelecionado?: boolean | null;
  pagina?: number | null;
  limite?: number | null;
};

export type BancoEmpregosProcessoFiltersInput = {
  vagaId?: string | null;
  candidatoId?: string | null;
  etapa?: string | null;
  status?: string | null;
  selecionado?: boolean | null;
  contratado?: boolean | null;
  pagina?: number | null;
  limite?: number | null;
};

export type BancoEmpregosHistoricoFiltersInput = {
  entidadeTipo?: string | null;
  candidatoId?: string | null;
  vagaId?: string | null;
  processoId?: string | null;
  pagina?: number | null;
  limite?: number | null;
};

export type BancoEmpregosDocumentoUploadInput = {
  categoria: BancoEmpregosCategoriaDocumento;
  descricao?: string | null;
  textoExtraido?: string | null;
};

export type BancoEmpregosDocumentoRow = {
  id: bigint;
  candidato_id: bigint;
  arquivo_id: bigint;
  categoria: string;
  descricao: string | null;
  versao: number;
  principal: boolean;
  extraido_json: unknown;
  ativo: boolean;
  criado_em: Date;
  atualizado_em: Date;
  nome_original: string;
  nome_arquivo: string;
  caminho_arquivo: string;
  mime_type: string;
  tamanho_bytes: bigint | number;
  data_upload: Date;
};

export type BancoEmpregosCandidatoRow = {
  id: bigint;
  beneficiario_id: bigint | null;
  nome_completo: string;
  cpf: string | null;
  rg: string | null;
  data_nascimento: Date | null;
  sexo: string | null;
  estado_civil: string | null;
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
  cep: string | null;
  endereco: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  escolaridade: string | null;
  cursos: string | null;
  formacao_complementar: string | null;
  area_interesse: string | null;
  cargo_pretendido: string | null;
  pretensao_salarial: number | null;
  disponibilidade: string | null;
  possui_experiencia: boolean;
  ultima_empresa: string | null;
  funcao_exercida: string | null;
  tempo_experiencia: string | null;
  resumo_profissional: string | null;
  observacoes: string | null;
  situacao: string;
  ativo: boolean;
  experiencias_json: unknown;
  formacoes_json: unknown;
  habilidades_json: unknown;
  curriculo_extraido_json: unknown;
  curriculo_versao: number;
  data_envio_curriculo: Date | null;
  criado_em: Date;
  atualizado_em: Date;
  total_documentos?: number | bigint | null;
  total_curriculos?: number | bigint | null;
  total_certificados?: number | bigint | null;
  idade?: number | null;
};

export type BancoEmpregosVagaRow = {
  id: bigint;
  titulo: string;
  empresa_nome: string;
  area: string | null;
  quantidade_vagas: number;
  requisitos: string | null;
  escolaridade_minima: string | null;
  experiencia_minima: string | null;
  bairro: string | null;
  cidade: string | null;
  tipo_contratacao: string | null;
  jornada: string | null;
  faixa_salarial: string | null;
  beneficios: string | null;
  observacoes: string | null;
  data_abertura: Date | null;
  data_limite: Date | null;
  situacao: string;
  projeto_servico: string | null;
  unidade_referencia: string | null;
  criterios_json: unknown;
  ativo: boolean;
  criado_em: Date;
  atualizado_em: Date;
  total_processos?: number | bigint | null;
  total_selecionados?: number | bigint | null;
  total_contratados?: number | bigint | null;
};

export type BancoEmpregosProcessoRow = {
  id: bigint;
  vaga_id: bigint;
  candidato_id: bigint;
  etapa: string;
  status: string;
  observacoes: string | null;
  responsavel_id: bigint | null;
  responsavel_nome: string | null;
  data_movimentacao: Date;
  data_entrevista: Date | null;
  data_encaminhamento: Date | null;
  selecionado: boolean;
  contratado: boolean;
  ativo: boolean;
  criado_em: Date;
  atualizado_em: Date;
  vaga_titulo?: string;
  empresa_nome?: string;
  candidato_nome?: string;
  candidato_bairro?: string | null;
  candidato_cidade?: string | null;
  candidato_situacao?: string | null;
  nota_final?: number | null;
  aderencia_percentual?: number | null;
  avaliacao_observacao?: string | null;
};

export type BancoEmpregosAvaliacaoRow = {
  id: bigint;
  processo_id: bigint;
  criterios_json: unknown;
  nota_final: number;
  aderencia_percentual: number;
  observacao_geral: string | null;
  atualizado_por_id: bigint | null;
  atualizado_por_nome: string | null;
  criado_em: Date;
  atualizado_em: Date;
};

export type BancoEmpregosHistoricoRow = {
  id: bigint;
  entidade_tipo: string;
  entidade_id: bigint;
  candidato_id: bigint | null;
  vaga_id: bigint | null;
  processo_id: bigint | null;
  usuario_id: bigint | null;
  usuario_nome: string | null;
  acao: string;
  observacao: string | null;
  criado_em: Date;
};
