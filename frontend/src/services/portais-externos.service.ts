import { httpClient } from "./http-client";

function obterBaseApi() {
  return String(httpClient.defaults.baseURL ?? "").replace(/\/+$/, "");
}

export function obterUrlLogoTransparencia(slug: string) {
  return `${obterBaseApi()}/api/portais-externos/transparencia/${encodeURIComponent(slug)}/logo`;
}

export type PortalExternoTipo = "voluntario" | "beneficiario" | "transparencia" | "parceiro";

export type PortalExternoIndicador = {
  label: string;
  valor: string;
};

export type PortalExternoCard = {
  titulo: string;
  texto: string;
};

export type PortalExternoTimeline = {
  titulo: string;
  detalhe: string;
};

export type PortalExternoAtendimento = {
  id: string;
  dataHora: string;
  tipoAtendimento: string;
  setor: string;
  profissionalResponsavel: string;
  status?: string;
  resumo: string;
  observacoes?: string;
  retornoPrevisto?: string;
};

export type PortalExternoBeneficio = {
  id: string;
  origem?: string;
  data: string;
  tipo: string;
  item: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  origemRecurso?: string;
  projetoPrograma?: string;
  profissionalResponsavel?: string;
  observacoes?: string;
  cienteAlertas?: boolean;
};

export type PortalExternoAgendamento = {
  id: string;
  data: string;
  horaInicial: string;
  horaFinal?: string;
  tipoAtendimento?: string;
  setor?: string;
  profissionalNome?: string;
  sala?: string;
  status?: string;
  prioridade?: string;
  modalidade?: string;
  observacaoCurta?: string;
  documentosPendentes?: boolean;
};

export type PortalExternoDocumentoPendente = {
  id: string;
  nome: string;
  tipo?: string;
  numeroDocumento?: string;
  obrigatorio: boolean;
  caminhoArquivo?: string;
  contentType?: string;
};

export type PortalExternoInscricao = {
  id: string;
  nome: string;
  tipo?: string;
  dataInicio?: string;
  dataFinal?: string;
  situacao?: string;
  responsavel?: string;
  local?: string;
  dataInscricao?: string;
};

export type PortalExternoEncaminhamento = {
  id: string;
  data?: string;
  tipo: string;
  destino: string;
  motivo: string;
  retornoEsperado?: string;
  status?: string;
  observacoes?: string;
};

export type PortalExternoAlerta = {
  prioridade?: string;
  titulo: string;
  descricao: string;
};

export type PortalExternoCestaPendente = {
  id: string;
  item: string;
  quantidade: number;
  dataPrevista: string;
  status: string;
  observacoes?: string;
};

export type PortalExternoFaltaCurso = {
  id: string;
  curso: string;
  dataAula: string;
  status: string;
  observacao?: string;
};

export type PortalExternoTema = {
  modo: "CLARO" | "ESCURO" | "AUTOMATICO";
  preset?: string;
  paleta: {
    cor_primaria: string;
    cor_secundaria: string;
    cor_destaque: string;
    cor_botao_primario: string;
    cor_link: string;
    cor_elemento_ativo: string;
    background: string;
    foreground: string;
    border: string;
    muted: string;
    card: string;
    dashboard_card: string;
    dashboard_card_soft: string;
    danger: string;
    warning: string;
    success: string;
    info: string;
  };
};

export type PortalExternoPainel = {
  tipo: PortalExternoTipo;
  token?: string;
  instituicao?: {
    id: string;
    tenantId: string;
    nome: string;
    razaoSocial: string;
    cnpj: string;
    slug: string;
    email?: string;
    telefone?: string;
    endereco?: string;
    logoUrl?: string;
  };
  instituicoesDisponiveis?: Array<{ slug: string; nome: string; cnpj: string }>;
  instituicoesBeneficiario?: Array<{ tenantId: string; instituicaoId?: string; nome: string; cnpj?: string }>;
  checklistTransparencia?: Array<{
    codigo: string;
    titulo: string;
    status: "PUBLICADO" | "PENDENTE";
    sugestao: string;
  }>;
  parcerias?: Array<{
    id: string;
    numero: string;
    tipo: string;
    orgaoConcedente?: string;
    dataAssinatura?: string;
    objeto?: string;
    valorGlobal: number;
    situacao: string;
  }>;
  tema?: PortalExternoTema;
  pessoa?: {
    id?: string;
    nome?: string;
    documento?: string;
    email?: string;
    telefone?: string;
    dataNascimento?: string;
    idade?: number;
    endereco?: string;
    bairro?: string;
    familiaNome?: string;
    situacaoCadastral?: string;
    tenantId?: string;
  };
  atendimentos?: PortalExternoAtendimento[];
  beneficios?: PortalExternoBeneficio[];
  agendamentos?: PortalExternoAgendamento[];
  documentosPendentes?: PortalExternoDocumentoPendente[];
  inscricoes?: PortalExternoInscricao[];
  encaminhamentos?: PortalExternoEncaminhamento[];
  alertas?: PortalExternoAlerta[];
  grupoFamiliar?: {
    id: string;
    nome: string;
    responsavelFamiliar?: string;
    enderecoPrincipal?: string;
    situacaoFamiliar?: string;
    status?: string;
    membros: Array<{
      id: string;
      nomeCompleto: string;
      parentesco?: string;
      responsavelFamiliar?: boolean;
      situacaoCadastral?: string;
      telefone?: string;
    }>;
    custoMes: number;
    custoAno: number;
    custoHistorico: number;
    alertas: string[];
  } | null;
  cestasPendentes?: PortalExternoCestaPendente[];
  faltasCursos?: PortalExternoFaltaCurso[];
  movimentacoes?: Array<Record<string, unknown>>;
  indicadores: PortalExternoIndicador[];
  cards: PortalExternoCard[];
  linhaDoTempo: PortalExternoTimeline[];
  itens: Array<{
    id?: string;
    titulo?: string;
    subtitulo?: string;
    status?: string;
    percentual?: number;
  }>;
};

export const portaisExternosService = {
  async acessar(tipo: Exclude<PortalExternoTipo, "transparencia">, identificador: string, senha: string, tenantId?: string) {
    const { data } = await httpClient.post<{ painel: PortalExternoPainel }>(
      `/api/portais-externos/${tipo}/acesso`,
      { identificador, senha, tenantId }
    );
    return data.painel;
  },

  async obterTransparencia(slug?: string) {
    const rota = slug?.trim()
      ? `/api/portais-externos/transparencia/${encodeURIComponent(slug.trim())}`
      : "/api/portais-externos/transparencia";
    const { data } = await httpClient.get<{ painel: PortalExternoPainel }>(rota);
    return data.painel;
  }
};
