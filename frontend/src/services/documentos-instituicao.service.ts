import { httpClient } from "./http-client";
import type {
  DocumentoInstituicao,
  DocumentoInstituicaoAnexo,
  DocumentoInstituicaoAnexoPayload,
  DocumentoInstituicaoHistorico,
  DocumentoInstituicaoHistoricoPayload,
  DocumentoInstituicaoPayload
} from "@/types/documentos-instituicao";

type UploadAnexoDocumentoResponse = {
  arquivo: {
    registro?: {
      id: number;
      nome_original?: string;
      mime_type?: string;
      tamanho_bytes?: number;
    };
    caminhoArquivo: string;
  };
};

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
      { timeout: 120000 }
    );
    return data;
  },

  async substituirAnexo(id: string, anexoId: string, payload: DocumentoInstituicaoAnexoPayload) {
    const { data } = await httpClient.put<DocumentoInstituicaoAnexo>(
      `/api/documentos-instituicao/${id}/anexos/${anexoId}`,
      payload,
      { timeout: 120000 }
    );
    return data;
  },

  async uploadArquivoAnexo(id: string, arquivo: File) {
    const formData = new FormData();
    formData.append("scope", "instituicao_documento");
    formData.append("entidadeTipo", "instituicao");
    formData.append("entidadeId", id);
    formData.append("observacao", "Anexo de documento institucional");
    formData.append("arquivo", arquivo);

    const { data } = await httpClient.post<UploadAnexoDocumentoResponse>(
      "/api/arquivos/upload",
      formData,
      { timeout: 120000 }
    );

    return {
      id: data.arquivo.registro?.id,
      caminhoArquivo: data.arquivo.caminhoArquivo,
      nomeOriginal: data.arquivo.registro?.nome_original,
      mimeType: data.arquivo.registro?.mime_type,
      tamanhoBytes: data.arquivo.registro?.tamanho_bytes
    };
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
