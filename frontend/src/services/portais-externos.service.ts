import { httpClient } from "./http-client";

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
  tema?: PortalExternoTema;
  pessoa?: {
    id?: string;
    nome?: string;
    documento?: string;
    email?: string;
    telefone?: string;
    tenantId?: string;
  };
  atendimentos?: PortalExternoAtendimento[];
  beneficios?: PortalExternoBeneficio[];
  agendamentos?: PortalExternoAgendamento[];
  documentosPendentes?: PortalExternoDocumentoPendente[];
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
  async acessar(tipo: Exclude<PortalExternoTipo, "transparencia">, identificador: string, senha: string) {
    const { data } = await httpClient.post<{ painel: PortalExternoPainel }>(
      `/api/portais-externos/${tipo}/acesso`,
      { identificador, senha }
    );
    return data.painel;
  },

  async obterTransparencia() {
    const { data } = await httpClient.get<{ painel: PortalExternoPainel }>("/api/portais-externos/transparencia");
    return data.painel;
  }
};
