import { httpClient } from "./http-client";
import type {
  Matricula,
  MatriculaBeneficiarioCatalogo,
  MatriculaFiltro,
  MatriculaItemResponse,
  MatriculaListaResponse,
  MatriculaPresencaData,
  MatriculaPresencaItem,
  MatriculaPresencaResponse,
  MatriculaProfissionalCatalogo,
  MatriculaResumoCatalogo,
  MatriculaSalaCatalogo
} from "@/types/matricula";

type MatriculaPresencaSalvarPayload = {
  data_aula: string;
  observacoes?: string;
  senha_confirmacao?: string;
  presencas: Array<MatriculaPresencaItem & { matricula_id: string }>;
};

export const matriculasService = {
  async listar(filtros?: MatriculaFiltro): Promise<MatriculaListaResponse> {
    const { data } = await httpClient.get<MatriculaListaResponse>("/api/matriculas", {
      params: filtros
    });
    return data;
  },

  async obterResumoCatalogo() {
    const { data } = await httpClient.get<{ resumo: MatriculaResumoCatalogo }>("/api/matriculas/resumo");
    return data.resumo;
  },

  async buscarPorId(id: string): Promise<MatriculaItemResponse> {
    const { data } = await httpClient.get<MatriculaItemResponse>(`/api/matriculas/${id}`);
    return data;
  },

  async criar(payload: Matricula): Promise<MatriculaItemResponse> {
    const { data } = await httpClient.post<MatriculaItemResponse>("/api/matriculas", payload);
    return data;
  },

  async atualizar(id: string, payload: Matricula): Promise<MatriculaItemResponse> {
    const { data } = await httpClient.put<MatriculaItemResponse>(`/api/matriculas/${id}`, payload);
    return data;
  },

  async remover(id: string): Promise<void> {
    await httpClient.delete(`/api/matriculas/${id}`);
  },

  async listarBeneficiarios(termo?: string) {
    const { data } = await httpClient.get<{ beneficiarios: MatriculaBeneficiarioCatalogo[] }>(
      "/api/matriculas/catalogo/beneficiarios",
      { params: { termo } }
    );
    return data;
  },

  async listarProfissionais(termo?: string) {
    const { data } = await httpClient.get<{ profissionais: MatriculaProfissionalCatalogo[] }>(
      "/api/matriculas/catalogo/profissionais",
      { params: { termo } }
    );
    return data;
  },

  async listarSalas() {
    const { data } = await httpClient.get<{ salas: MatriculaSalaCatalogo[] }>("/api/matriculas/catalogo/salas");
    return data;
  },

  async listarPresencaDatas(cursoId: string, somentePendentes = false) {
    const { data } = await httpClient.get<{ datas: MatriculaPresencaData[] }>(
      `/api/matriculas/${cursoId}/presencas/datas`,
      { params: { pendentes: somentePendentes } }
    );
    return data;
  },

  async removerPresencaData(cursoId: string, presencaDataId: string) {
    await httpClient.delete(`/api/matriculas/${cursoId}/presencas/datas/${presencaDataId}`);
  },

  async listarPresencasPorData(cursoId: string, presencaDataId: string) {
    const { data } = await httpClient.get<MatriculaPresencaResponse>(
      `/api/matriculas/${cursoId}/presencas/datas/${presencaDataId}/itens`
    );
    return data;
  },

  async salvarPresencasPorData(cursoId: string, presencaDataId: string, payload: MatriculaPresencaSalvarPayload) {
    const { data } = await httpClient.post<MatriculaPresencaResponse>(
      `/api/matriculas/${cursoId}/presencas/datas/${presencaDataId}/itens`,
      payload
    );
    return data;
  },

  async validarSenhaPresenca(cursoId: string, presencaDataId: string, senha: string) {
    const { data } = await httpClient.post<{ valido: boolean }>(
      `/api/matriculas/${cursoId}/presencas/datas/${presencaDataId}/validar-senha`,
      { senha }
    );
    return data;
  },

  async enviarLembreteEmail(payload: { destinatario: string; assunto: string; mensagem: string }) {
    const { data } = await httpClient.post<{ message: string; resultado: { destinatario: string; messageId: string } }>(
      "/api/email/simples",
      payload
    );
    return data;
  }
};
