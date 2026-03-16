import { httpClient } from "./http-client";
import type {
  BancoEmpregosAvaliacao,
  BancoEmpregosAvaliacaoPayload,
  BancoEmpregosCandidatoFiltros,
  BancoEmpregosCandidatoPayload,
  BancoEmpregosDashboard,
  BancoEmpregosDetalheCandidato,
  BancoEmpregosDetalheVaga,
  BancoEmpregosDocumento,
  BancoEmpregosHistoricoFiltros,
  BancoEmpregosListaCandidatos,
  BancoEmpregosListaHistorico,
  BancoEmpregosListaProcessos,
  BancoEmpregosListaVagas,
  BancoEmpregosProcesso,
  BancoEmpregosProcessoFiltros,
  BancoEmpregosProcessoPayload,
  BancoEmpregosVagaFiltros,
  BancoEmpregosVagaPayload
} from "@/types/banco-empregos";

export const bancoEmpregosService = {
  async dashboard(filtros?: BancoEmpregosCandidatoFiltros) {
    const { data } = await httpClient.get<BancoEmpregosDashboard>("/api/banco-empregos/dashboard", {
      params: filtros
    });
    return data;
  },

  async listarVagas(filtros?: BancoEmpregosVagaFiltros) {
    const { data } = await httpClient.get<BancoEmpregosListaVagas>("/api/banco-empregos", {
      params: filtros
    });
    return data;
  },

  async buscarVaga(id: string) {
    const { data } = await httpClient.get<BancoEmpregosDetalheVaga>(`/api/banco-empregos/${id}`);
    return data;
  },

  async criarVaga(payload: BancoEmpregosVagaPayload) {
    const { data } = await httpClient.post<BancoEmpregosDetalheVaga>("/api/banco-empregos", payload);
    return data;
  },

  async atualizarVaga(id: string, payload: BancoEmpregosVagaPayload) {
    const { data } = await httpClient.put<BancoEmpregosDetalheVaga>(`/api/banco-empregos/${id}`, payload);
    return data;
  },

  async removerVaga(id: string) {
    await httpClient.delete(`/api/banco-empregos/${id}`);
  },

  async listarCandidatos(filtros?: BancoEmpregosCandidatoFiltros) {
    const { data } = await httpClient.get<BancoEmpregosListaCandidatos>("/api/banco-empregos/candidatos", {
      params: filtros
    });
    return data;
  },

  async buscarCandidato(id: string) {
    const { data } = await httpClient.get<BancoEmpregosDetalheCandidato>(`/api/banco-empregos/candidatos/${id}`);
    return data;
  },

  async criarCandidato(payload: BancoEmpregosCandidatoPayload) {
    const { data } = await httpClient.post<BancoEmpregosDetalheCandidato>("/api/banco-empregos/candidatos", payload);
    return data;
  },

  async atualizarCandidato(id: string, payload: BancoEmpregosCandidatoPayload) {
    const { data } = await httpClient.put<BancoEmpregosDetalheCandidato>(`/api/banco-empregos/candidatos/${id}`, payload);
    return data;
  },

  async inativarCandidato(id: string) {
    await httpClient.delete(`/api/banco-empregos/candidatos/${id}`);
  },

  async listarDocumentos(candidatoId: string) {
    const { data } = await httpClient.get<BancoEmpregosDocumento[]>(
      `/api/banco-empregos/candidatos/${candidatoId}/documentos`
    );
    return data;
  },

  async uploadDocumento(
    candidatoId: string,
    payload: {
      categoria: "CURRICULO" | "CERTIFICADO" | "DOCUMENTO_COMPLEMENTAR";
      descricao?: string;
      textoExtraido?: string;
      arquivo: File;
    }
  ) {
    const formData = new FormData();
    formData.append("categoria", payload.categoria);
    if (payload.descricao?.trim()) {
      formData.append("descricao", payload.descricao.trim());
    }
    if (payload.textoExtraido?.trim()) {
      formData.append("textoExtraido", payload.textoExtraido.trim());
    }
    formData.append("arquivo", payload.arquivo);

    const { data } = await httpClient.post<BancoEmpregosDocumento>(
      `/api/banco-empregos/candidatos/${candidatoId}/documentos`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      }
    );
    return data;
  },

  async removerDocumento(documentoId: string) {
    await httpClient.delete(`/api/banco-empregos/documentos/${documentoId}`);
  },

  async listarProcessos(filtros?: BancoEmpregosProcessoFiltros) {
    const { data } = await httpClient.get<BancoEmpregosListaProcessos>("/api/banco-empregos/processos", {
      params: filtros
    });
    return data;
  },

  async buscarProcesso(id: string) {
    const { data } = await httpClient.get<BancoEmpregosProcesso>(`/api/banco-empregos/processos/${id}`);
    return data;
  },

  async criarProcesso(payload: BancoEmpregosProcessoPayload) {
    const { data } = await httpClient.post<BancoEmpregosProcesso>("/api/banco-empregos/processos", payload);
    return data;
  },

  async atualizarProcesso(id: string, payload: BancoEmpregosProcessoPayload) {
    const { data } = await httpClient.put<BancoEmpregosProcesso>(`/api/banco-empregos/processos/${id}`, payload);
    return data;
  },

  async salvarAvaliacao(processoId: string, payload: BancoEmpregosAvaliacaoPayload) {
    const { data } = await httpClient.put<BancoEmpregosAvaliacao>(
      `/api/banco-empregos/processos/${processoId}/avaliacao`,
      payload
    );
    return data;
  },

  async listarHistorico(filtros?: BancoEmpregosHistoricoFiltros) {
    const { data } = await httpClient.get<BancoEmpregosListaHistorico>("/api/banco-empregos/historico", {
      params: filtros
    });
    return data;
  },

  async exportar(tipo: "candidatos" | "vagas" | "triagem", formato: "csv" | "pdf", filtros?: Record<string, unknown>) {
    const { data } = await httpClient.get<Blob>(`/api/banco-empregos/exportar/${tipo}`, {
      params: { ...filtros, formato },
      responseType: "blob"
    });
    return data;
  },

  async gerarCarta(
    processoId: string,
    tipo: "encaminhamento" | "recomendacao" | "comprovante" | "ficha"
  ) {
    const { data } = await httpClient.get<Blob>(`/api/banco-empregos/processos/${processoId}/cartas/${tipo}`, {
      responseType: "blob"
    });
    return data;
  }
};
