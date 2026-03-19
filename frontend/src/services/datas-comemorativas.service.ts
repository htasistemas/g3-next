import { httpClient } from "./http-client";
import type {
  DataComemorativaCalendarioResponse,
  DataComemorativaConfiguracoes,
  DataComemorativaEvento,
  DataComemorativaFiltros,
  DataComemorativaImportPayload,
  DataComemorativaListaResponse,
  DataComemorativaLogItem,
  DataComemorativaPayload,
  DataComemorativaPopupPayload,
  DataComemorativaSyncLog
} from "@/types/datas-comemorativas";

export const datasComemorativasService = {
  async listar(filters: DataComemorativaFiltros) {
    const { data } = await httpClient.get<DataComemorativaListaResponse>(
      "/api/datas-comemorativas",
      { params: filters }
    );
    return data;
  },

  async buscarPorId(id: string) {
    const { data } = await httpClient.get<{ evento: DataComemorativaEvento }>(
      `/api/datas-comemorativas/${id}`
    );
    return data.evento;
  },

  async criar(payload: DataComemorativaPayload) {
    const { data } = await httpClient.post<{ evento: DataComemorativaEvento }>(
      "/api/datas-comemorativas",
      payload
    );
    return data.evento;
  },

  async atualizar(id: string, payload: DataComemorativaPayload) {
    const { data } = await httpClient.put<{ evento: DataComemorativaEvento }>(
      `/api/datas-comemorativas/${id}`,
      payload
    );
    return data.evento;
  },

  async excluir(id: string) {
    await httpClient.delete(`/api/datas-comemorativas/${id}`);
  },

  async ativar(id: string) {
    const { data } = await httpClient.patch<{ evento: DataComemorativaEvento }>(
      `/api/datas-comemorativas/${id}/ativar`
    );
    return data.evento;
  },

  async inativar(id: string) {
    const { data } = await httpClient.patch<{ evento: DataComemorativaEvento }>(
      `/api/datas-comemorativas/${id}/inativar`
    );
    return data.evento;
  },

  async duplicar(id: string) {
    const { data } = await httpClient.post<{ evento: DataComemorativaEvento }>(
      `/api/datas-comemorativas/${id}/duplicar`
    );
    return data.evento;
  },

  async obterCalendario(
    ano: number,
    mes: number,
    filters: Omit<DataComemorativaFiltros, "ano" | "mes"> = {}
  ) {
    const { data } = await httpClient.get<DataComemorativaCalendarioResponse>(
      "/api/datas-comemorativas/calendario",
      {
        params: {
          ...filters,
          ano,
          mes
        }
      }
    );
    return data;
  },

  async obterEventosDoDia(dataIso: string, contexto?: { uf?: string; municipio?: string }) {
    const { data } = await httpClient.get<{ data: string; eventos: DataComemorativaEvento[] }>(
      "/api/datas-comemorativas/do-dia",
      {
        params: {
          data: dataIso,
          uf: contexto?.uf,
          municipio: contexto?.municipio
        }
      }
    );
    return data;
  },

  async exportar(formato: "pdf" | "excel", filters: DataComemorativaFiltros) {
    const { data } = await httpClient.get<Blob>("/api/datas-comemorativas/exportar", {
      params: {
        ...filters,
        formato
      },
      responseType: "blob",
      timeout: 120000
    });
    return data;
  },

  async sincronizarFeriados(payload: { ano: number; provider?: string }) {
    const { data } = await httpClient.post("/api/datas-comemorativas/sync/feriados", payload);
    return data;
  },

  async sincronizarIntervalo(payload: { inicio: number; fim: number; provider?: string }) {
    const { data } = await httpClient.post(
      "/api/datas-comemorativas/sync/feriados/intervalo",
      payload
    );
    return data;
  },

  async importar(payload: DataComemorativaImportPayload) {
    const { data } = await httpClient.post("/api/datas-comemorativas/importar", payload, {
      timeout: 120000
    });
    return data;
  },

  async obterSyncLogs() {
    const { data } = await httpClient.get<{ logs: DataComemorativaSyncLog[] }>(
      "/api/datas-comemorativas/sync/logs"
    );
    return data.logs;
  },

  async obterConfiguracoes() {
    const { data } = await httpClient.get<{ configuracoes: DataComemorativaConfiguracoes }>(
      "/api/datas-comemorativas/configuracoes"
    );
    return data.configuracoes;
  },

  async salvarConfiguracoes(payload: Partial<DataComemorativaConfiguracoes>) {
    const { data } = await httpClient.put<{ configuracoes: DataComemorativaConfiguracoes }>(
      "/api/datas-comemorativas/configuracoes",
      payload
    );
    return data.configuracoes;
  },

  async obterPopupHoje(params?: { data?: string; uf?: string; municipio?: string }) {
    const { data } = await httpClient.get<DataComemorativaPopupPayload>(
      "/api/datas-comemorativas/popup/hoje",
      { params }
    );
    return data;
  },

  async registrarVisualizacao(payload: { data: string; eventIds?: string[]; acao?: string }) {
    await httpClient.post("/api/datas-comemorativas/popup/registrar-visualizacao", payload);
  },

  async dispensarHoje(payload: { data: string }) {
    await httpClient.post("/api/datas-comemorativas/popup/dispensar-hoje", payload);
  },

  async obterLogs() {
    const { data } = await httpClient.get<{ logs: DataComemorativaLogItem[] }>(
      "/api/datas-comemorativas/logs"
    );
    return data.logs;
  }
};
