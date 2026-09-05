import { httpClient } from "./http-client";
import type {
  Projeto,
  ProjetoDashboard,
  ProjetoFiltros,
  ProjetoPayload,
  ProjetoTarefa,
  ProjetoTarefaPayload,
  ProjetoTarefaStatus
  ,ProjetoImpactoDashboard, ProjetoIndicador, ProjetoIndicadorEvidencia, ProjetoIndicadorMedicao, ProjetoIndicadorPayload
} from "@/types/projeto";

export const projetosService = {
  async listar(filtros: ProjetoFiltros = {}) {
    const { data } = await httpClient.get<{ projetos: Projeto[] }>("/api/administrativo/projetos", {
      params: filtros
    });
    return data.projetos ?? [];
  },

  async dashboard(filtros: ProjetoFiltros = {}) {
    const { data } = await httpClient.get<ProjetoDashboard>("/api/administrativo/projetos/dashboard", {
      params: filtros
    });
    return data;
  },

  async buscarPorId(id: string) {
    const { data } = await httpClient.get<{ projeto: Projeto }>(`/api/administrativo/projetos/${id}`);
    return data.projeto;
  },

  async criar(payload: ProjetoPayload) {
    const { data } = await httpClient.post<{ projeto: Projeto }>("/api/administrativo/projetos", payload);
    return data.projeto;
  },

  async atualizar(id: string, payload: ProjetoPayload) {
    const { data } = await httpClient.put<{ projeto: Projeto }>(`/api/administrativo/projetos/${id}`, payload);
    return data.projeto;
  },

  async inativar(id: string) {
    await httpClient.delete(`/api/administrativo/projetos/${id}`);
  },

  async historico(id: string) {
    const { data } = await httpClient.get<{ historico: Projeto["historico"] }>(
      `/api/administrativo/projetos/${id}/historico`
    );
    return data.historico ?? [];
  },

  async criarTarefa(projetoId: string, payload: ProjetoTarefaPayload) {
    const { data } = await httpClient.post<{ tarefa: ProjetoTarefa }>(
      `/api/administrativo/projetos/${projetoId}/tarefas`,
      payload
    );
    return data.tarefa;
  },

  async atualizarTarefa(projetoId: string, tarefaId: string, payload: ProjetoTarefaPayload) {
    const { data } = await httpClient.put<{ tarefa: ProjetoTarefa }>(
      `/api/administrativo/projetos/${projetoId}/tarefas/${tarefaId}`,
      payload
    );
    return data.tarefa;
  },

  async moverTarefa(projetoId: string, tarefaId: string, status: ProjetoTarefaStatus) {
    const { data } = await httpClient.patch<{ tarefa: ProjetoTarefa }>(
      `/api/administrativo/projetos/${projetoId}/tarefas/${tarefaId}/status`,
      { status }
    );
    return data.tarefa;
  },

  async relatorioPdf(tipo: string, payload: Record<string, unknown>) {
    const { data } = await httpClient.post(`/api/administrativo/projetos/relatorios/${tipo}/pdf`, payload, {
      responseType: "blob"
    });
    return data as Blob;
  },

  async listarIndicadores(projetoId: string) {
    const { data } = await httpClient.get<{ indicadores: ProjetoIndicador[] }>(`/api/administrativo/projetos/${projetoId}/indicadores`);
    return data.indicadores ?? [];
  },

  async dashboardIndicadores(params?: { projeto_id?: string; periodo_de?: string; periodo_ate?: string; unidade_id?: string }) {
    const { data } = await httpClient.get<ProjetoImpactoDashboard>("/api/administrativo/projetos/indicadores/dashboard", { params });
    return data;
  },

  async criarIndicador(projetoId: string, payload: ProjetoIndicadorPayload) {
    const { data } = await httpClient.post<{ indicador: ProjetoIndicador }>(`/api/administrativo/projetos/${projetoId}/indicadores`, payload);
    return data.indicador;
  },

  async listarMedicoes(projetoId: string, indicadorId: number) {
    const { data } = await httpClient.get<{ medicoes: ProjetoIndicadorMedicao[] }>(`/api/administrativo/projetos/${projetoId}/indicadores/${indicadorId}/medicoes`);
    return data.medicoes ?? [];
  },

  async registrarMedicao(projetoId: string, indicadorId: number, payload: { competencia: string; valor: number; observacao?: string; evidencia_id?: number }) {
    const { data } = await httpClient.post<{ medicao: ProjetoIndicadorMedicao }>(`/api/administrativo/projetos/${projetoId}/indicadores/${indicadorId}/medicoes`, payload);
    return data.medicao;
  },

  async listarEvidencias(projetoId: string, indicadorId: number) {
    const { data } = await httpClient.get<{ evidencias: ProjetoIndicadorEvidencia[] }>(`/api/administrativo/projetos/${projetoId}/indicadores/${indicadorId}/evidencias`);
    return data.evidencias ?? [];
  },

  async enviarEvidencia(projetoId: string, indicadorId: number, arquivo: File) {
    const formData = new FormData();
    formData.append("arquivo", arquivo);
    const { data } = await httpClient.post<{ evidencia: ProjetoIndicadorEvidencia }>(`/api/administrativo/projetos/${projetoId}/indicadores/${indicadorId}/evidencias`, formData);
    return data.evidencia;
  }
};

