import { httpClient } from "./http-client";
import type {
  Agendamento,
  AgendamentoFiltros,
  AgendamentoListaEspera,
  AgendamentoOperacionalBeneficiario,
  AgendamentoOperacionalItem,
  AgendamentoOperacionalPayload,
  AgendamentoOperacionalTipo
} from "@/types/agendamento";

export const agendamentosService = {
  async listar(filtros?: AgendamentoFiltros) {
    const { data } = await httpClient.get<{ agendamentos: Agendamento[] }>("/api/agendamentos", {
      params: filtros
    });
    return data.agendamentos ?? [];
  },

  async obter(id: string | number) {
    const { data } = await httpClient.get<{ agendamento: Agendamento | null }>(`/api/agendamentos/${id}`);
    return data.agendamento;
  },

  async criar(payload: Agendamento) {
    const { data } = await httpClient.post<{ agendamento: Agendamento | null }>("/api/agendamentos", payload);
    return data.agendamento;
  },

  async criarOperacional(payload: AgendamentoOperacionalPayload) {
    const { data } = await httpClient.post<{ agendamento: Agendamento | null }>("/api/agendamentos", payload);
    return data.agendamento;
  },

  async atualizar(id: string | number, payload: Agendamento) {
    const { data } = await httpClient.put<{ agendamento: Agendamento | null }>(`/api/agendamentos/${id}`, payload);
    return data.agendamento;
  },

  async cancelar(id: string | number, motivo?: string) {
    const { data } = await httpClient.post<{ agendamento: Agendamento | null }>(`/api/agendamentos/${id}/cancelar`, { motivo });
    return data.agendamento;
  },

  async remarcar(id: string | number, payload: Partial<Agendamento>) {
    const { data } = await httpClient.post<{ agendamento: Agendamento | null }>(`/api/agendamentos/${id}/remarcar`, payload);
    return data.agendamento;
  },

  async confirmar(id: string | number, payload: { canal?: string; observacao?: string }) {
    const { data } = await httpClient.post<{ agendamento: Agendamento | null }>(`/api/agendamentos/${id}/confirmar`, payload);
    return data.agendamento;
  },

  async checkIn(id: string | number, payload: Record<string, unknown>) {
    const { data } = await httpClient.post<{ agendamento: Agendamento | null }>(`/api/agendamentos/${id}/check-in`, payload);
    return data.agendamento;
  },

  async concluir(id: string | number, payload: Record<string, unknown>) {
    const { data } = await httpClient.post<{ agendamento: Agendamento | null }>(`/api/agendamentos/${id}/concluir`, payload);
    return data.agendamento;
  },

  async listarListaEspera() {
    const { data } = await httpClient.get<{ itens: AgendamentoListaEspera[] }>("/api/agendamentos/lista-espera");
    return data.itens ?? [];
  },

  async criarListaEspera(payload: AgendamentoListaEspera) {
    const { data } = await httpClient.post<{ item: AgendamentoListaEspera | null }>("/api/agendamentos/lista-espera", payload);
    return data.item;
  },

  async converterListaEspera(id: string | number, payload: Agendamento) {
    const { data } = await httpClient.post<{ agendamento: Agendamento | null }>(`/api/agendamentos/lista-espera/${id}/converter`, payload);
    return data.agendamento;
  },

  async listarIndicadores(filtros?: AgendamentoFiltros) {
    const { data } = await httpClient.get<{ indicadores: Record<string, number> }>("/api/agendamentos/indicadores", {
      params: filtros
    });
    return data.indicadores;
  },

  async listarCatalogos() {
    const { data } = await httpClient.get<{
      unidades: string[];
      setores: string[];
      profissionais: string[];
      tiposAtendimento: string[];
      salas: string[];
      recursos: string[];
    }>("/api/agendamentos/catalogos");
    return data;
  },

  async listarItens(tipo: AgendamentoOperacionalTipo, busca?: string) {
    const { data } = await httpClient.get<{ itens: AgendamentoOperacionalItem[] }>("/api/agendamentos/itens", {
      params: { tipo, busca }
    });
    return data.itens ?? [];
  },

  async listarBeneficiarios(itemId: number) {
    const { data } = await httpClient.get<{ beneficiarios: AgendamentoOperacionalBeneficiario[] }>("/api/agendamentos/beneficiarios", {
      params: { itemId }
    });
    return data.beneficiarios ?? [];
  },

  async notificar(id: string | number, canal: "WHATSAPP" | "EMAIL") {
    const { data } = await httpClient.post<{
      canal: "WHATSAPP" | "EMAIL";
      enviados: number;
      ignorados: number;
      links?: string[];
    }>(`/api/agendamentos/${id}/notificar`, { canal });
    return data;
  }
};
