import { httpClient } from "./http-client";
import type {
  RegistroPontoAlertaPendente,
  RegistroPontoAjustePayload,
  RegistroPontoEspelhoResponse,
  RegistroPontoHoraExtraConfiguracao,
  RegistroPontoHoraExtraItem,
  RegistroPontoHoraExtraPendencia,
  RegistroPontoHoraExtraResumo,
  RegistroPontoFacePayload,
  RegistroPontoFaceStatus,
  RegistroPontoFiltro,
  RegistroPontoHorarioTrabalho,
  RegistroPontoHorarioTrabalhoPayload,
  RegistroPontoHistoricoResponse,
  RegistroPontoListaResponse,
  RegistroPontoMarcarPayload,
  RegistroPontoMarcarResponse,
  RegistroPontoOcorrenciaPayload,
  RegistroPontoRelatorioMensalResponse,
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

  async buscarConfiguracao(): Promise<RegistroPontoHorarioTrabalho> {
    const { data } = await httpClient.get<RegistroPontoHorarioTrabalho>("/api/registro-ponto/configuracao");
    return data;
  },

  async buscarConfiguracaoHoraExtra(): Promise<RegistroPontoHoraExtraConfiguracao> {
    const { data } = await httpClient.get<RegistroPontoHoraExtraConfiguracao>(
      "/api/registro-ponto/configuracao/hora-extra"
    );
    return data;
  },

  async buscarFace(): Promise<RegistroPontoFaceStatus> {
    const { data } = await httpClient.get<RegistroPontoFaceStatus>("/api/registro-ponto/face");
    return data;
  },

  async salvarFace(payload: RegistroPontoFacePayload): Promise<RegistroPontoFaceStatus & { mensagem: string }> {
    const { data } = await httpClient.put<RegistroPontoFaceStatus & { mensagem: string }>(
      "/api/registro-ponto/face",
      payload
    );
    return data;
  },

  async salvarConfiguracao(payload: RegistroPontoHorarioTrabalhoPayload): Promise<RegistroPontoHorarioTrabalho> {
    const { data } = await httpClient.put<RegistroPontoHorarioTrabalho>("/api/registro-ponto/configuracao", payload);
    return data;
  },

  async salvarConfiguracaoHoraExtra(
    payload: RegistroPontoHoraExtraConfiguracao
  ): Promise<RegistroPontoHoraExtraConfiguracao> {
    const { data } = await httpClient.put<RegistroPontoHoraExtraConfiguracao>(
      "/api/registro-ponto/configuracao/hora-extra",
      payload
    );
    return data;
  },

  async buscarAlertaPendente(): Promise<RegistroPontoAlertaPendente> {
    const { data } = await httpClient.get<RegistroPontoAlertaPendente>("/api/registro-ponto/alerta-pendente");
    return data;
  },

  async marcarPonto(payload: RegistroPontoMarcarPayload): Promise<RegistroPontoMarcarResponse> {
    const { data } = await httpClient.post<RegistroPontoMarcarResponse>("/api/registro-ponto/marcar", payload);
    return data;
  },

  async listarHorasExtras(params?: Record<string, unknown>): Promise<{
    registros: RegistroPontoHoraExtraItem[];
    totais: RegistroPontoHoraExtraResumo;
  }> {
    const { data } = await httpClient.get<{
      registros: RegistroPontoHoraExtraItem[];
      totais: RegistroPontoHoraExtraResumo;
    }>("/api/registro-ponto/hora-extra", { params });
    return data;
  },

  async registrarCienciaHoraExtra(id: string, payload: { justificativa_funcionario: string; ciencia_registrada: boolean }) {
    const { data } = await httpClient.post<{ registro: RegistroPontoHoraExtraItem }>(
      `/api/registro-ponto/hora-extra/${id}/ciencia`,
      payload
    );
    return data;
  },

  async decidirHoraExtra(
    id: string,
    payload: { justificativa: string; minutos_aprovados?: number; minutos_negados?: number }
  ) {
    const { data } = await httpClient.patch<{ registro: RegistroPontoHoraExtraItem }>(
      `/api/registro-ponto/hora-extra/${id}/decisao`,
      payload
    );
    return data;
  },

  async listarRelatorioMensal(params?: Record<string, unknown>): Promise<RegistroPontoRelatorioMensalResponse> {
    const { data } = await httpClient.get<RegistroPontoRelatorioMensalResponse>(
      "/api/registro-ponto/relatorio-mensal",
      { params }
    );
    return data;
  },

  async exportarRelatorioMensal(
    params?: Record<string, unknown> & { formato?: "pdf" | "excel" }
  ): Promise<Blob> {
    const { data } = await httpClient.get("/api/registro-ponto/relatorio-mensal/export", {
      params,
      responseType: "blob"
    });
    return data as Blob;
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
  },

  async gerarEspelhoPontoPdf(payload: Record<string, unknown>) {
    const { data } = await httpClient.get("/api/registro-ponto/espelho/pdf", {
      params: payload,
      responseType: "blob"
    });
    return data as Blob;
  }
};
