import { httpClient } from "./http-client";
import type {
  Beneficiario,
  BeneficiarioAuditoriaItem,
  BeneficiarioCompletude,
  BeneficiarioConsentimento,
  BeneficiarioDuplicidade,
  BeneficiarioFiltro,
  BeneficiarioFamiliaResumo,
  BeneficiarioItemResponse,
  BeneficiarioListaResponse
} from "@/types/beneficiario";

export const beneficiariosService = {
  async listar(filtros?: BeneficiarioFiltro): Promise<BeneficiarioListaResponse> {
    const { data } = await httpClient.get<BeneficiarioListaResponse>("/api/beneficiarios", {
      params: filtros
    });
    return data;
  },

  async buscarPorId(id: string): Promise<BeneficiarioItemResponse> {
    const { data } = await httpClient.get<BeneficiarioItemResponse>(`/api/beneficiarios/${id}`);
    return data;
  },

  async criar(payload: Beneficiario): Promise<BeneficiarioItemResponse> {
    const { data } = await httpClient.post<BeneficiarioItemResponse>("/api/beneficiarios", payload);
    return data;
  },

  async criarRapido(payload: Partial<Beneficiario> & { consentimento_minimo?: boolean; observacao?: string }): Promise<BeneficiarioItemResponse> {
    const { data } = await httpClient.post<BeneficiarioItemResponse>("/api/beneficiarios/rapido", payload);
    return data;
  },

  async lerCpfPorOcr(arquivo: File): Promise<{
    tipoDocumento: "CPF";
    cpf: string;
    texto: string;
    confianca: number;
    mensagem: string;
  }> {
    const formulario = new FormData();
    formulario.append("arquivo", arquivo);
    const { data } = await httpClient.post<{
      resultado: {
        tipoDocumento: "CPF";
        cpf: string;
        texto: string;
        confianca: number;
        mensagem: string;
      };
    }>("/api/beneficiarios/ocr/cpf", formulario);
    return data.resultado;
  },

  async analisarDuplicidade(payload: Partial<Beneficiario>): Promise<{ duplicidades: BeneficiarioDuplicidade[]; total: number }> {
    const { data } = await httpClient.post<{ duplicidades: BeneficiarioDuplicidade[]; total: number }>(
      "/api/beneficiarios/duplicidades/analisar",
      payload
    );
    return data;
  },

  async atualizar(id: string, payload: Beneficiario): Promise<BeneficiarioItemResponse> {
    const { data } = await httpClient.put<BeneficiarioItemResponse>(`/api/beneficiarios/${id}`, payload);
    return data;
  },

  async remover(id: string): Promise<void> {
    await httpClient.delete(`/api/beneficiarios/${id}`);
  },

  async obterProximoCodigo(): Promise<{ codigo: string }> {
    const { data } = await httpClient.get<{ codigo: string }>("/api/beneficiarios/proximo-codigo");
    return data;
  },

  async obterCompletude(id: string): Promise<BeneficiarioCompletude> {
    const { data } = await httpClient.get<{ completude: BeneficiarioCompletude }>(`/api/beneficiarios/${id}/completude`);
    return data.completude;
  },

  async recalcularCompletude(id: string): Promise<BeneficiarioCompletude> {
    const { data } = await httpClient.post<{ completude: BeneficiarioCompletude }>(`/api/beneficiarios/${id}/completude/recalcular`);
    return data.completude;
  },

  async listarConsentimentos(id: string): Promise<{ tipos: string[]; consentimentos: BeneficiarioConsentimento[] }> {
    const { data } = await httpClient.get<{ tipos: string[]; consentimentos: BeneficiarioConsentimento[] }>(
      `/api/beneficiarios/${id}/consentimentos`
    );
    return data;
  },

  async registrarConsentimento(id: string, payload: Partial<BeneficiarioConsentimento>): Promise<{ tipos: string[]; consentimentos: BeneficiarioConsentimento[] }> {
    const { data } = await httpClient.post<{ tipos: string[]; consentimentos: BeneficiarioConsentimento[] }>(
      `/api/beneficiarios/${id}/consentimentos`,
      payload
    );
    return data;
  },

  async listarAuditoria(id: string): Promise<{ auditoria: BeneficiarioAuditoriaItem[] }> {
    const { data } = await httpClient.get<{ auditoria: BeneficiarioAuditoriaItem[] }>(`/api/beneficiarios/${id}/auditoria`);
    return data;
  },

  async obterResumoFamilia(id: string): Promise<{ familia: BeneficiarioFamiliaResumo | null }> {
    const { data } = await httpClient.get<{ familia: BeneficiarioFamiliaResumo | null }>(`/api/beneficiarios/${id}/familia-resumo`);
    return data;
  },

  async listarPendencias(filtros?: Record<string, unknown>): Promise<{ pendencias: Array<Record<string, unknown>> }> {
    const { data } = await httpClient.get<{ pendencias: Array<Record<string, unknown>> }>("/api/beneficiarios/pendencias", {
      params: filtros
    });
    return data;
  }
};
