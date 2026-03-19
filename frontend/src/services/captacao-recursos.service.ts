import { httpClient } from "./http-client";
import type {
  CaptacaoCampanha,
  CaptacaoComprovante,
  CaptacaoConfiguracoes,
  CaptacaoDashboardResponse,
  CaptacaoDoacao,
  CaptacaoDoador,
  CaptacaoListFilters,
  CaptacaoLogItem,
  CaptacaoPortalPainel
} from "@/types/captacao-recursos";

export const captacaoRecursosService = {
  async obterDashboard(filters: CaptacaoListFilters = {}) {
    const { data } = await httpClient.get<CaptacaoDashboardResponse>("/api/captacao-recursos/dashboard", { params: filters });
    return data;
  },

  async listarDoadores(filters: CaptacaoListFilters = {}) {
    const { data } = await httpClient.get<{ doadores: CaptacaoDoador[]; total: number; pagina: number; limite: number }>("/api/captacao-recursos/doadores", { params: filters });
    return data;
  },

  async buscarDoador(id: string) {
    const { data } = await httpClient.get<{ doador: CaptacaoDoador }>(`/api/captacao-recursos/doadores/${id}`);
    return data.doador;
  },

  async salvarDoador(payload: Record<string, unknown>, id?: string) {
    const { data } = id
      ? await httpClient.put<{ doador: CaptacaoDoador }>(`/api/captacao-recursos/doadores/${id}`, payload)
      : await httpClient.post<{ doador: CaptacaoDoador }>("/api/captacao-recursos/doadores", payload);
    return data.doador;
  },

  async inativarDoador(id: string) {
    const { data } = await httpClient.patch<{ doador: CaptacaoDoador }>(`/api/captacao-recursos/doadores/${id}/inativar`);
    return data.doador;
  },

  async listarCampanhas(filters: CaptacaoListFilters = {}) {
    const { data } = await httpClient.get<{ campanhas: CaptacaoCampanha[]; total: number; pagina: number; limite: number }>("/api/captacao-recursos/campanhas", { params: filters });
    return data;
  },

  async salvarCampanha(payload: Record<string, unknown>, id?: string) {
    const { data } = id
      ? await httpClient.put<{ campanha: CaptacaoCampanha }>(`/api/captacao-recursos/campanhas/${id}`, payload)
      : await httpClient.post<{ campanha: CaptacaoCampanha }>("/api/captacao-recursos/campanhas", payload);
    return data.campanha;
  },

  async alterarStatusCampanha(id: string, status: string) {
    const { data } = await httpClient.patch<{ campanha: CaptacaoCampanha }>(`/api/captacao-recursos/campanhas/${id}/status`, { status });
    return data.campanha;
  },

  async listarDoacoes(filters: CaptacaoListFilters = {}) {
    const { data } = await httpClient.get<{ doacoes: CaptacaoDoacao[]; total: number; pagina: number; limite: number }>("/api/captacao-recursos/doacoes", { params: filters });
    return data;
  },

  async buscarDoacao(id: string) {
    const { data } = await httpClient.get<{ doacao: CaptacaoDoacao; eventos: Array<Record<string, unknown>> }>(`/api/captacao-recursos/doacoes/${id}`);
    return data;
  },

  async salvarDoacao(payload: Record<string, unknown>, id?: string) {
    const { data } = id
      ? await httpClient.put<{ doacao: CaptacaoDoacao }>(`/api/captacao-recursos/doacoes/${id}`, payload)
      : await httpClient.post<{ doacao: CaptacaoDoacao }>("/api/captacao-recursos/doacoes", payload);
    return data;
  },

  async gerarCobranca(id: string) {
    const { data } = await httpClient.post<{ doacao: CaptacaoDoacao }>(`/api/captacao-recursos/doacoes/${id}/gerar-cobranca`);
    return data;
  },

  async confirmarDoacao(id: string) {
    const { data } = await httpClient.post<{ doacao: CaptacaoDoacao }>(`/api/captacao-recursos/doacoes/${id}/confirmar`);
    return data;
  },

  async cancelarDoacao(id: string, observacao?: string) {
    const { data } = await httpClient.post<{ doacao: CaptacaoDoacao }>(`/api/captacao-recursos/doacoes/${id}/cancelar`, { observacao });
    return data;
  },

  async estornarDoacao(id: string, observacao?: string) {
    const { data } = await httpClient.post<{ doacao: CaptacaoDoacao }>(`/api/captacao-recursos/doacoes/${id}/estornar`, { observacao });
    return data;
  },

  async emitirComprovante(id: string) {
    const { data } = await httpClient.post<{ comprovante: CaptacaoComprovante }>(`/api/captacao-recursos/doacoes/${id}/emitir-comprovante`);
    return data.comprovante;
  },

  async reenviarComprovante(id: string) {
    await httpClient.post(`/api/captacao-recursos/doacoes/${id}/reenviar-comprovante`);
  },

  async listarComprovantes(filters: CaptacaoListFilters = {}) {
    const { data } = await httpClient.get<{ comprovantes: CaptacaoComprovante[]; total: number; pagina: number; limite: number }>("/api/captacao-recursos/comprovantes", { params: filters });
    return data;
  },

  async obterConfiguracoes() {
    const { data } = await httpClient.get<{ configuracoes: CaptacaoConfiguracoes }>("/api/captacao-recursos/configuracoes");
    return data.configuracoes;
  },

  async salvarConfiguracoes(payload: Partial<CaptacaoConfiguracoes>) {
    const { data } = await httpClient.put<{ configuracoes: CaptacaoConfiguracoes }>("/api/captacao-recursos/configuracoes", payload);
    return data.configuracoes;
  },

  async obterLogs() {
    const { data } = await httpClient.get<{ logs: CaptacaoLogItem[] }>("/api/captacao-recursos/logs");
    return data.logs;
  },

  async exportarRelatorio(formato: "pdf" | "excel", filters: CaptacaoListFilters = {}) {
    const { data } = await httpClient.get<Blob>("/api/captacao-recursos/relatorios/exportar", {
      params: { ...filters, formato },
      responseType: "blob",
      timeout: 120000
    });
    return data;
  },

  async portalLogin(email: string, documento: string) {
    const { data } = await httpClient.post<{ token: string; expiraEm: string; doador: CaptacaoDoador }>("/api/captacao-recursos/portal/login", { email, documento });
    return data;
  },

  async obterPainelPortal(token: string) {
    const { data } = await httpClient.get<CaptacaoPortalPainel>("/api/captacao-recursos/portal/painel", {
      params: { token }
    });
    return data;
  },

  async atualizarDadosPortal(token: string, payload: Record<string, unknown>) {
    const { data } = await httpClient.put<CaptacaoPortalPainel>("/api/captacao-recursos/portal/meus-dados", payload, {
      params: { token }
    });
    return data;
  },

  async criarDoacaoPortal(token: string, payload: Record<string, unknown>) {
    const { data } = await httpClient.post<{ doacao: CaptacaoDoacao }>("/api/captacao-recursos/portal/doacoes", payload, {
      params: { token }
    });
    return data;
  },

  async cancelarRecorrenciaPortal(token: string, recorrenciaId: string) {
    const { data } = await httpClient.post(`/api/captacao-recursos/portal/recorrencias/${recorrenciaId}/cancelar`, undefined, {
      params: { token }
    });
    return data;
  }
};
