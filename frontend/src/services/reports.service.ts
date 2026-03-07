import { httpClient } from "./http-client";

export const reportsService = {
  async gerarRelacaoBeneficiarios(payload: Record<string, unknown>) {
    const { data } = await httpClient.post("/api/reports/beneficiarios/relacao", payload, {
      responseType: "blob"
    });
    return data as Blob;
  },

  async gerarFichaBeneficiario(payload: { beneficiarioId: string; usuarioEmissor?: string }) {
    const { data } = await httpClient.post("/api/reports/beneficiarios/ficha", payload, {
      responseType: "blob"
    });
    return data as Blob;
  },

  async gerarTermoAutorizacao(payload: Record<string, unknown>) {
    const { data } = await httpClient.post("/api/reports/authorization-term", payload, {
      responseType: "blob"
    });
    return data as Blob;
  }
};
