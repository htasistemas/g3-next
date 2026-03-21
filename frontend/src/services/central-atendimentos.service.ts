import { httpClient } from "./http-client";
import type {
  CentralAtendimento,
  CentralAtendimentoForm,
  CentralBeneficio,
  CentralBeneficioForm,
  CentralBuscaBeneficiarioFiltro,
  CentralBeneficiarioBuscaItem,
  CentralEncaminhamento,
  CentralEncaminhamentoForm,
  CentralRelatorioTipo,
  CentralVisaoGeral
} from "@/types/central-atendimentos";

export const centralAtendimentosService = {
  async buscarBeneficiarios(filtros?: CentralBuscaBeneficiarioFiltro) {
    const { data } = await httpClient.get<{ beneficiarios: CentralBeneficiarioBuscaItem[] }>(
      "/api/central-atendimentos/beneficiarios/busca",
      { params: filtros }
    );
    return data;
  },

  async obterVisaoGeral(beneficiarioId: string) {
    const { data } = await httpClient.get<CentralVisaoGeral>(
      `/api/central-atendimentos/beneficiarios/${beneficiarioId}`
    );
    return data;
  },

  async criarAtendimento(beneficiarioId: string, payload: CentralAtendimentoForm) {
    const { data } = await httpClient.post<{ atendimentos: CentralAtendimento[] }>(
      `/api/central-atendimentos/beneficiarios/${beneficiarioId}/atendimentos`,
      payload
    );
    return data;
  },

  async atualizarAtendimento(beneficiarioId: string, id: string, payload: CentralAtendimentoForm) {
    const { data } = await httpClient.put<{ atendimentos: CentralAtendimento[] }>(
      `/api/central-atendimentos/beneficiarios/${beneficiarioId}/atendimentos/${id}`,
      payload
    );
    return data;
  },

  async excluirAtendimento(beneficiarioId: string, id: string) {
    await httpClient.delete(`/api/central-atendimentos/beneficiarios/${beneficiarioId}/atendimentos/${id}`);
  },

  async criarBeneficio(beneficiarioId: string, payload: CentralBeneficioForm) {
    const { data } = await httpClient.post<{ beneficios: CentralBeneficio[] }>(
      `/api/central-atendimentos/beneficiarios/${beneficiarioId}/beneficios`,
      payload
    );
    return data;
  },

  async atualizarBeneficio(beneficiarioId: string, id: string, payload: CentralBeneficioForm) {
    const { data } = await httpClient.put<{ beneficios: CentralBeneficio[] }>(
      `/api/central-atendimentos/beneficiarios/${beneficiarioId}/beneficios/${id}`,
      payload
    );
    return data;
  },

  async excluirBeneficio(beneficiarioId: string, id: string) {
    await httpClient.delete(`/api/central-atendimentos/beneficiarios/${beneficiarioId}/beneficios/${id}`);
  },

  async criarEncaminhamento(beneficiarioId: string, payload: CentralEncaminhamentoForm) {
    const { data } = await httpClient.post<{ encaminhamentos: CentralEncaminhamento[] }>(
      `/api/central-atendimentos/beneficiarios/${beneficiarioId}/encaminhamentos`,
      payload
    );
    return data;
  },

  async atualizarEncaminhamento(
    beneficiarioId: string,
    id: string,
    payload: CentralEncaminhamentoForm
  ) {
    const { data } = await httpClient.put<{ encaminhamentos: CentralEncaminhamento[] }>(
      `/api/central-atendimentos/beneficiarios/${beneficiarioId}/encaminhamentos/${id}`,
      payload
    );
    return data;
  },

  async excluirEncaminhamento(beneficiarioId: string, id: string) {
    await httpClient.delete(
      `/api/central-atendimentos/beneficiarios/${beneficiarioId}/encaminhamentos/${id}`
    );
  },

  async gerarRelatorio(beneficiarioId: string, tipo: CentralRelatorioTipo) {
    const { data } = await httpClient.get(
      `/api/central-atendimentos/beneficiarios/${beneficiarioId}/relatorios/${tipo}`
    );
    return data;
  },

  async gerarRelatorioPdf(beneficiarioId: string, tipo: CentralRelatorioTipo) {
    const { data } = await httpClient.get(
      `/api/central-atendimentos/beneficiarios/${beneficiarioId}/relatorios/${tipo}/pdf`,
      { responseType: "blob" }
    );
    return data as Blob;
  }
};
