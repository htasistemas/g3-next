import { httpClient } from "./http-client";
import type {
  RhArquivo,
  RhArquivoPayload,
  RhAuditoria,
  RhCandidatoDetalhe,
  RhCandidatoPayload,
  RhCartaBanco,
  RhCartaBancoPayload,
  RhDocumento,
  RhDocumentoPayload,
  RhEntrevista,
  RhEntrevistaPayload,
  RhFicha,
  RhFichaPayload,
  RhPpd,
  RhPpdPayload,
  RhProcesso,
  RhResumoCandidato,
  RhTermo,
  RhTermoPayload
} from "@/types/rh-contratacao";

const baseUrl = "/api/rh/contratacao";

export const rhContratacaoService = {
  async listarCandidatos(termo = "") {
    const { data } = await httpClient.get<RhResumoCandidato[]>(`${baseUrl}/candidatos`, {
      params: { termo }
    });
    return data;
  },

  async buscarCandidato(id: string | number) {
    const { data } = await httpClient.get<RhCandidatoDetalhe>(`${baseUrl}/candidatos/${id}`);
    return data;
  },

  async criarCandidato(payload: RhCandidatoPayload) {
    const { data } = await httpClient.post<RhProcesso>(`${baseUrl}/candidatos`, payload);
    return data;
  },

  async atualizarCandidato(id: string | number, payload: RhCandidatoPayload) {
    const { data } = await httpClient.put<RhProcesso>(`${baseUrl}/candidatos/${id}`, payload);
    return data;
  },

  async inativarCandidato(id: string | number) {
    await httpClient.delete(`${baseUrl}/candidatos/${id}`);
  },

  async buscarProcessoPorCandidato(candidatoId: string | number) {
    const { data } = await httpClient.get<RhProcesso>(
      `${baseUrl}/processos/por-candidato/${candidatoId}`
    );
    return data;
  },

  async atualizarStatus(processoId: string | number, status: string) {
    const { data } = await httpClient.put<RhProcesso>(`${baseUrl}/processos/${processoId}/status`, {
      status
    });
    return data;
  },

  async listarEntrevistas(processoId: string | number) {
    const { data } = await httpClient.get<RhEntrevista[]>(`${baseUrl}/processos/${processoId}/entrevistas`);
    return data;
  },

  async salvarEntrevista(processoId: string | number, payload: RhEntrevistaPayload) {
    const { data } = await httpClient.post<RhEntrevista>(
      `${baseUrl}/processos/${processoId}/entrevistas`,
      payload
    );
    return data;
  },

  async buscarFicha(processoId: string | number) {
    const { data } = await httpClient.get<RhFicha | null>(`${baseUrl}/processos/${processoId}/ficha`);
    return data;
  },

  async salvarFicha(processoId: string | number, payload: RhFichaPayload) {
    const { data } = await httpClient.put<RhFicha>(`${baseUrl}/processos/${processoId}/ficha`, payload);
    return data;
  },

  async listarDocumentos(processoId: string | number) {
    const { data } = await httpClient.get<RhDocumento[]>(
      `${baseUrl}/processos/${processoId}/documentos`
    );
    return data;
  },

  async atualizarDocumento(documentoId: string | number, payload: RhDocumentoPayload) {
    const { data } = await httpClient.put<RhDocumento>(`${baseUrl}/documentos/${documentoId}`, payload);
    return data;
  },

  async listarArquivos(processoId: string | number) {
    const { data } = await httpClient.get<RhArquivo[]>(`${baseUrl}/processos/${processoId}/arquivos`);
    return data;
  },

  async adicionarArquivo(processoId: string | number, payload: RhArquivoPayload) {
    const { data } = await httpClient.post<RhArquivo>(`${baseUrl}/processos/${processoId}/arquivos`, payload);
    return data;
  },

  async listarTermos(processoId: string | number) {
    const { data } = await httpClient.get<RhTermo[]>(`${baseUrl}/processos/${processoId}/termos`);
    return data;
  },

  async salvarTermo(processoId: string | number, payload: RhTermoPayload) {
    const { data } = await httpClient.post<RhTermo>(`${baseUrl}/processos/${processoId}/termos`, payload);
    return data;
  },

  async buscarPpd(processoId: string | number) {
    const { data } = await httpClient.get<RhPpd | null>(`${baseUrl}/processos/${processoId}/ppd`);
    return data;
  },

  async salvarPpd(processoId: string | number, payload: RhPpdPayload) {
    const { data } = await httpClient.put<RhPpd>(`${baseUrl}/processos/${processoId}/ppd`, payload);
    return data;
  },

  async buscarCartaBanco(processoId: string | number) {
    const { data } = await httpClient.get<RhCartaBanco | null>(
      `${baseUrl}/processos/${processoId}/carta-banco`
    );
    return data;
  },

  async salvarCartaBanco(processoId: string | number, payload: RhCartaBancoPayload) {
    const { data } = await httpClient.put<RhCartaBanco>(
      `${baseUrl}/processos/${processoId}/carta-banco`,
      payload
    );
    return data;
  },

  async listarAuditoria(processoId: string | number) {
    const { data } = await httpClient.get<RhAuditoria[]>(`${baseUrl}/processos/${processoId}/auditoria`);
    return data;
  }
};
