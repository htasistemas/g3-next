import { httpClient } from "./http-client";
import type {
  OficioDocumentoContexto,
  OficioImportacaoResultado,
  OficioImagemPayload,
  OficioPayload,
  OficioPdfAssinadoPayload
} from "@/types/oficio";

export const oficiosService = {
  async listar() {
    const { data } = await httpClient.get<{ oficios: OficioPayload[] }>("/api/oficios");
    return data;
  },

  async obterProximoNumero(dataReferencia?: string) {
    const { data } = await httpClient.get<{ numero: string }>("/api/oficios/proximo-numero", {
      params: dataReferencia ? { data: dataReferencia } : undefined
    });
    return data;
  },

  async obterContextoDocumento() {
    const { data } = await httpClient.get<OficioDocumentoContexto>("/api/oficios/contexto-documento");
    return data;
  },

  async importarConteudoArquivo(arquivo: File) {
    const formData = new FormData();
    formData.append("arquivo", arquivo);

    const { data } = await httpClient.post<OficioImportacaoResultado>(
      "/api/oficios/importar-conteudo",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data"
        },
        timeout: 300000
      }
    );
    return data;
  },

  async obter(id: string) {
    const { data } = await httpClient.get<OficioPayload>(`/api/oficios/${id}`);
    return data;
  },

  async criar(payload: OficioPayload) {
    const { data } = await httpClient.post<OficioPayload>("/api/oficios", payload);
    return data;
  },

  async atualizar(id: string, payload: OficioPayload) {
    const { data } = await httpClient.put<OficioPayload>(`/api/oficios/${id}`, payload);
    return data;
  },

  async excluir(id: string) {
    await httpClient.delete(`/api/oficios/${id}`);
  },

  async salvarPdfAssinado(id: string, payload: OficioPdfAssinadoPayload) {
    const { data } = await httpClient.post<OficioPayload>(`/api/oficios/${id}/pdf-assinado`, payload);
    return data;
  },

  async obterPdfAssinado(id: string) {
    const { data } = await httpClient.get<{
      nomeArquivo: string;
      tipoMime: string;
      conteudoBase64: string;
    }>(`/api/oficios/${id}/pdf-assinado`);
    return data;
  },

  async removerPdfAssinado(id: string) {
    await httpClient.delete(`/api/oficios/${id}/pdf-assinado`);
  },

  async listarImagens(id: string) {
    const { data } = await httpClient.get<OficioImagemPayload[]>(`/api/oficios/${id}/imagens`);
    return data;
  },

  async adicionarImagem(id: string, payload: OficioImagemPayload) {
    const { data } = await httpClient.post<OficioImagemPayload>(`/api/oficios/${id}/imagens`, payload);
    return data;
  },

  async removerImagem(id: string, imagemId: string) {
    await httpClient.delete(`/api/oficios/${id}/imagens/${imagemId}`);
  },

  async obterDocumentoPdf(id: string) {
    const { data } = await httpClient.get<Blob>(`/api/oficios/${id}/documento`, {
      responseType: "blob"
    });
    return data;
  }
};
