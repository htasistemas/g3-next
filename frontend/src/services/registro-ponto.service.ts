import { httpClient } from "./http-client";
import type {
  RegistroPontoAjustePayload,
  RegistroPontoEspelhoResponse,
  RegistroPontoFiltro,
  RegistroPontoHistoricoResponse,
  RegistroPontoListaResponse,
  RegistroPontoMarcarPayload,
  RegistroPontoMarcarResponse,
  RegistroPontoOcorrenciaPayload,
  RegistroPontoUsuarioCatalogoItem
} from "@/types/registro-ponto";

export const registroPontoService = {
  async listar(filtros?: RegistroPontoFiltro): Promise<RegistroPontoListaResponse> {
    const { data } = await httpClient.get<RegistroPontoListaResponse>("/api/registro-ponto", {
      params: filtros
    });
    return data;
  },

  async listarEspelho(filtros?: RegistroPontoFiltro): Promise<RegistroPontoEspelhoResponse> {
    const { data } = await httpClient.get<RegistroPontoEspelhoResponse>("/api/registro-ponto/espelho", {
      params: filtros
    });
    return data;
  },

  async listarUsuarios(termo?: string): Promise<{ usuarios: RegistroPontoUsuarioCatalogoItem[] }> {
    const { data } = await httpClient.get<{ usuarios: RegistroPontoUsuarioCatalogoItem[] }>(
      "/api/registro-ponto/catalogo/usuarios",
      {
        params: { termo }
      }
    );
    return data;
  },

  async marcarPonto(payload: RegistroPontoMarcarPayload): Promise<RegistroPontoMarcarResponse> {
    const { data } = await httpClient.post<RegistroPontoMarcarResponse>("/api/registro-ponto/marcar", payload);
    return data;
  },

  async ajustarRegistro(id: string, payload: RegistroPontoAjustePayload) {
    const { data } = await httpClient.patch<{ registro: RegistroPontoMarcarResponse["registro"] }>(
      `/api/registro-ponto/${id}/ajuste`,
      payload
    );
    return data;
  },

  async adicionarOcorrencia(id: string, payload: RegistroPontoOcorrenciaPayload) {
    const { data } = await httpClient.post<{ registro: RegistroPontoMarcarResponse["registro"] }>(
      `/api/registro-ponto/${id}/ocorrencias`,
      payload
    );
    return data;
  },

  async buscarHistorico(id: string): Promise<RegistroPontoHistoricoResponse> {
    const { data } = await httpClient.get<RegistroPontoHistoricoResponse>(`/api/registro-ponto/${id}/historico`);
    return data;
  }
};
