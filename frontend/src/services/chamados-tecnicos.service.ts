import { httpClient } from "./http-client";
import type {
  ChamadoTecnicoCatalogo,
  ChamadoTecnicoDetalheResponse,
  ChamadoTecnicoFiltroSalvo,
  ChamadoTecnicoFiltros,
  ChamadoTecnicoInput,
  ChamadoTecnicoListaResponse,
  ChamadoParametroInput
} from "@/types/chamado-tecnico";

export const chamadosTecnicosService = {
  async listar(filtros: ChamadoTecnicoFiltros) {
    const { data } = await httpClient.get<ChamadoTecnicoListaResponse>("/api/chamados-tecnicos", {
      params: filtros
    });
    return data;
  },

  async buscarPorId(id: string) {
    const { data } = await httpClient.get<ChamadoTecnicoDetalheResponse>(`/api/chamados-tecnicos/${id}`);
    return data;
  },

  async listarCatalogo() {
    const { data } = await httpClient.get<ChamadoTecnicoCatalogo>("/api/chamados-tecnicos/catalogo");
    return data;
  },

  async exportar(filtros: ChamadoTecnicoFiltros, formato: "excel" | "pdf") {
    const { data, headers } = await httpClient.get<Blob>("/api/chamados-tecnicos/exportar", {
      params: {
        ...filtros,
        formato
      },
      responseType: "blob"
    });
    return {
      blob: data,
      contentDisposition: headers["content-disposition"] as string | undefined
    };
  },

  async criar(payload: ChamadoTecnicoInput) {
    const { data } = await httpClient.post<ChamadoTecnicoDetalheResponse>("/api/chamados-tecnicos", payload);
    return data;
  },

  async atualizar(id: string, payload: ChamadoTecnicoInput) {
    const { data } = await httpClient.put<ChamadoTecnicoDetalheResponse>(`/api/chamados-tecnicos/${id}`, payload);
    return data;
  },

  async alterarSituacao(id: string, payload: Record<string, unknown>) {
    const { data } = await httpClient.post<ChamadoTecnicoDetalheResponse>(
      `/api/chamados-tecnicos/${id}/situacao`,
      payload
    );
    return data;
  },

  async comentar(id: string, payload: Record<string, unknown>) {
    const { data } = await httpClient.post(`/api/chamados-tecnicos/${id}/comentarios`, payload);
    return data;
  },

  async adicionarVinculo(id: string, payload: Record<string, unknown>) {
    const { data } = await httpClient.post(`/api/chamados-tecnicos/${id}/vinculos`, payload);
    return data;
  },

  async removerVinculo(id: string, vinculoId: string) {
    await httpClient.delete(`/api/chamados-tecnicos/${id}/vinculos/${vinculoId}`);
  },

  async listarFiltrosSalvos() {
    const { data } = await httpClient.get<{ filtros: ChamadoTecnicoFiltroSalvo[] }>(
      "/api/chamados-tecnicos/filtros-salvos"
    );
    return data.filtros;
  },

  async salvarFiltro(payload: { nome: string; filtros: Record<string, unknown>; padrao?: boolean }, id?: string) {
    const { data } = id
      ? await httpClient.put<ChamadoTecnicoFiltroSalvo>(`/api/chamados-tecnicos/filtros-salvos/${id}`, payload)
      : await httpClient.post<ChamadoTecnicoFiltroSalvo>("/api/chamados-tecnicos/filtros-salvos", payload);
    return data;
  },

  async removerFiltro(id: string) {
    await httpClient.delete(`/api/chamados-tecnicos/filtros-salvos/${id}`);
  },

  async anexarArquivos(id: string, files: File[]) {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    const { data } = await httpClient.post<ChamadoTecnicoDetalheResponse>(
      `/api/chamados-tecnicos/${id}/anexos`,
      formData
    );
    return data;
  },

  async removerAnexo(id: string, arquivoId: string) {
    await httpClient.delete(`/api/chamados-tecnicos/${id}/anexos/${arquivoId}`);
  },

  async salvarParametro(payload: ChamadoParametroInput, id?: string) {
    const { data } = id
      ? await httpClient.put(`/api/chamados-tecnicos/parametros/${id}`, payload)
      : await httpClient.post("/api/chamados-tecnicos/parametros", payload);
    return data;
  },

  async remover(id: string) {
    await httpClient.delete(`/api/chamados-tecnicos/${id}`);
  }
};
