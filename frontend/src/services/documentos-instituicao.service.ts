import { httpClient } from "./http-client";
import type {
  DocumentoInstituicao,
  DocumentoInstituicaoAnexo,
  DocumentoInstituicaoAnexoPayload,
  DocumentoInstituicaoHistorico,
  DocumentoInstituicaoHistoricoPayload,
  DocumentoInstituicaoPayload
} from "@/types/documentos-instituicao";

export const documentosInstituicaoService = {
  async listar() {
    const { data } = await httpClient.get<DocumentoInstituicao[]>("/api/documentos-instituicao");
    return data;
  },

  async criar(payload: DocumentoInstituicaoPayload) {
    const { data } = await httpClient.post<DocumentoInstituicao>(
      "/api/documentos-instituicao",
      payload
    );
    return data;
  },

  async atualizar(id: string, payload: DocumentoInstituicaoPayload) {
    const { data } = await httpClient.put<DocumentoInstituicao>(
      `/api/documentos-instituicao/${id}`,
      payload
    );
    return data;
  },

  async excluir(id: string) {
    await httpClient.delete(`/api/documentos-instituicao/${id}`);
  },

  async listarAnexos(id: string) {
    const { data } = await httpClient.get<DocumentoInstituicaoAnexo[]>(
      `/api/documentos-instituicao/${id}/anexos`
    );
    return data;
  },

  async adicionarAnexo(id: string, payload: DocumentoInstituicaoAnexoPayload) {
    const { data } = await httpClient.post<DocumentoInstituicaoAnexo>(
      `/api/documentos-instituicao/${id}/anexos`,
      payload,
      { timeout: 300000 }
    );
    return data;
  },

  async substituirAnexo(id: string, anexoId: string, payload: DocumentoInstituicaoAnexoPayload) {
    const { data } = await httpClient.put<DocumentoInstituicaoAnexo>(
      `/api/documentos-instituicao/${id}/anexos/${anexoId}`,
      payload,
      { timeout: 300000 }
    );
    return data;
  },

  async excluirAnexo(id: string, anexoId: string) {
    await httpClient.delete(`/api/documentos-instituicao/${id}/anexos/${anexoId}`);
  },

  async listarHistorico(id: string) {
    const { data } = await httpClient.get<DocumentoInstituicaoHistorico[]>(
      `/api/documentos-instituicao/${id}/historico`
    );
    return data;
  },

  async adicionarHistorico(id: string, payload: DocumentoInstituicaoHistoricoPayload) {
    const { data } = await httpClient.post<DocumentoInstituicaoHistorico>(
      `/api/documentos-instituicao/${id}/historico`,
      payload
    );
    return data;
  }
};
