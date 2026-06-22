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

export type PortalExternoPainel = {
  tipo: PortalExternoTipo;
  token?: string;
  pessoa?: {
    id?: string;
    nome?: string;
    documento?: string;
    email?: string;
    telefone?: string;
    tenantId?: string;
  };
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
