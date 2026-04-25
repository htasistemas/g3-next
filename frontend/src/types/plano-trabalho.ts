export type PlanoStatus =
  | "RASCUNHO"
  | "EM_ANALISE"
  | "APROVADO"
  | "EM_EXECUCAO"
  | "CONCLUIDO"
  | "CANCELADO"
  | "REPROVADO";

export type PlanoObjetivoEspecifico = {
  id?: string;
  descricao: string;
  resultadoEsperado?: string;
  metasVinculadas: string[];
};

export type PlanoMetaEtapa = {
  id?: string;
  nome: string;
  acaoExecutar?: string;
  descricaoDetalhada?: string;
  publicoAtendido?: string;
  quantidade?: number;
  unidade?: string;
  local?: string;
  dataInicio?: string;
  dataFim?: string;
  valorEstimado?: number;
  documentoComprobatorioEsperado?: string;
  responsavel?: string;
  situacao?: string;
};

export type PlanoMeta = {
  id?: string;
  numeroMeta: string;
  descricao: string;
  indicadorResultado?: string;
  unidadeMedida?: string;
  quantidadePrevista?: number;
  meioVerificacao?: string;
  dataInicio?: string;
  dataFim?: string;
  responsavel?: string;
  situacao?: string;
  etapas: PlanoMetaEtapa[];
};

export type PlanoAplicacaoRecurso = {
  id?: string;
  categoriaDespesa: string;
  item: string;
  descricao?: string;
  quantidade?: number;
  unidade?: string;
  valorUnitario?: number;
  valorTotal?: number;
  fonteRecurso?: string;
  metaNumero?: string;
  etapaNome?: string;
  naturezaDespesa?: string;
  observacao?: string;
};

export type PlanoDesembolso = {
  id?: string;
  mesAno: string;
  valorPrevisto?: number;
  fonteRecurso?: string;
  metaNumero?: string;
  observacao?: string;
};

export type PlanoChecklistPrestacao = {
  id?: string;
  descricao: string;
  obrigatorio?: boolean;
  concluido?: boolean;
};

export type PlanoTrabalhoPayload = {
  id?: string;
  codigoInterno?: string;
  titulo: string;
  tipoParceria: string;
  orgaoParceiro: string;
  editalChamamento?: string;
  periodoInicio: string;
  periodoFim: string;
  status: PlanoStatus | string;
  responsavelTecnico: string;
  responsavelLegal: string;
  termoFomentoId?: string;
  numeroProcesso?: string;
  razaoSocial: string;
  nomeFantasia?: string;
  cnpj: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  telefone?: string;
  email?: string;
  representanteLegal: string;
  representanteCpf: string;
  representanteCargo?: string;
  bancoNome?: string;
  bancoAgencia?: string;
  bancoConta?: string;
  bancoOperacao?: string;
  bancoPix?: string;
  bancoObservacao?: string;
  historicoOsc?: string;
  finalidadeInstitucional?: string;
  experienciaAnterior?: string;
  conselhosCertificacoes?: string;
  publicoAtendidoAtual?: string;
  capacidadeTecnicaOperacional?: string;
  descricaoObjeto: string;
  areaAtuacao: string;
  localExecucao: string;
  abrangenciaTerritorial?: string;
  publicoAlvo: string;
  quantidadeBeneficiarios?: number;
  criteriosSelecao?: string;
  problemaSocial: string;
  causasConsequencias?: string;
  dadosIndicadores?: string;
  capacidadeExecucao?: string;
  impactoEsperado?: string;
  objetivoGeral: string;
  objetivosEspecificos: PlanoObjetivoEspecifico[];
  metas: PlanoMeta[];
  aplicacaoRecursos: PlanoAplicacaoRecurso[];
  desembolso: PlanoDesembolso[];
  formaAcompanhamento?: string;
  indicadoresMonitoramento?: string;
  periodicidadeMonitoramento?: string;
  responsavelColetaDados?: string;
  instrumentosMonitoramento: string[];
  resultadoEsperadoMonitoramento?: string;
  evidenciasObrigatorias?: string;
  periodicidadePrestacao?: string;
  dataLimitePrestacao?: string;
  documentosExigidos?: string;
  responsavelPrestacao?: string;
  observacoesPrestacao?: string;
  checklistPrestacao: PlanoChecklistPrestacao[];
  localDeclaracao?: string;
  dataDeclaracao?: string;
  nomeRepresentanteDeclaracao?: string;
  cpfRepresentanteDeclaracao?: string;
  cargoRepresentanteDeclaracao?: string;
  declaracaoVeracidade?: boolean;
  aprovacaoInterna?: string;
  situacaoAprovacao?: string;
  observacaoAprovador?: string;
  arquivoFormato?: string;
};

export type PlanoCronogramaExecucaoItem = {
  metaNumero: string;
  etapaNome: string;
  especificacao: string;
  unidade?: string;
  quantidade?: number;
  inicio?: string;
  termino?: string;
  responsavel?: string;
  status?: string;
  valorEstimado?: number;
};

export type PlanoTrabalho = PlanoTrabalhoPayload & {
  id: string;
  codigoInterno: string;
  termoFomento?: { id: string; numero: string; objeto?: string };
};
