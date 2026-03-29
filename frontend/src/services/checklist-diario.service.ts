import { httpClient } from "./http-client";
import type {
  ChecklistConfiguracao,
  ChecklistExecucao,
  ChecklistFiltros,
  ChecklistHistorico,
  ChecklistIndicadores,
  ChecklistModelo,
  ChecklistModeloPayload
} from "@/types/checklist-diario";

export const checklistDiarioService = {
  async listar(filtros: ChecklistFiltros) {
    const { data } = await httpClient.get<ChecklistExecucao[]>("/api/administrativo/checklist-diario", {
      params: filtros
    });
    return data;
  },

  async listarSemana(filtros: ChecklistFiltros) {
    const { data } = await httpClient.get<Array<{ diaSemana: number; itens: ChecklistExecucao[] }>>(
      "/api/administrativo/checklist-diario/semana",
      { params: filtros }
    );
    return data;
  },

  async obterIndicadores(filtros: ChecklistFiltros) {
    const { data } = await httpClient.get<ChecklistIndicadores>("/api/administrativo/checklist-diario/indicadores", {
      params: filtros
    });
    return data;
  },

  async listarHistorico(params?: { execucaoId?: string; usuarioId?: number; limit?: number }) {
    const { data } = await httpClient.get<ChecklistHistorico[]>("/api/administrativo/checklist-diario/historico", {
      params
    });
    return data;
  },

  async listarModelos() {
    const { data } = await httpClient.get<ChecklistModelo[]>("/api/administrativo/checklist-diario/modelos");
    return data;
  },

  async salvarModelo(payload: ChecklistModeloPayload, id?: string) {
    if (id) {
      const { data } = await httpClient.put<ChecklistModelo>(`/api/administrativo/checklist-diario/modelos/${id}`, payload);
      return data;
    }
    const { data } = await httpClient.post<ChecklistModelo>("/api/administrativo/checklist-diario/modelos", payload);
    return data;
  },

  async clonarModelo(id: string) {
    const { data } = await httpClient.post<ChecklistModelo>(`/api/administrativo/checklist-diario/modelos/${id}/clonar`);
    return data;
  },

  async atualizarStatusModelo(id: string, ativo: boolean) {
    await httpClient.patch(`/api/administrativo/checklist-diario/modelos/${id}/status`, { ativo });
  },

  async concluirExecucao(id: string, observacao?: string) {
    const { data } = await httpClient.patch<{ execucao: ChecklistExecucao; historico: ChecklistHistorico[] }>(
      `/api/administrativo/checklist-diario/execucoes/${id}/concluir`,
      { observacao }
    );
    return data;
  },

  async dispensarExecucao(id: string, motivo: string, observacao?: string) {
    const { data } = await httpClient.patch<{ execucao: ChecklistExecucao; historico: ChecklistHistorico[] }>(
      `/api/administrativo/checklist-diario/execucoes/${id}/dispensar`,
      { motivo, observacao }
    );
    return data;
  },

  async marcarNaoSeAplica(id: string, motivo: string, observacao?: string) {
    const { data } = await httpClient.patch<{ execucao: ChecklistExecucao; historico: ChecklistHistorico[] }>(
      `/api/administrativo/checklist-diario/execucoes/${id}/nao-se-aplica`,
      { motivo, observacao }
    );
    return data;
  },

  async reabrirExecucao(id: string, motivo?: string, observacao?: string) {
    const { data } = await httpClient.patch<{ execucao: ChecklistExecucao; historico: ChecklistHistorico[] }>(
      `/api/administrativo/checklist-diario/execucoes/${id}/reabrir`,
      { motivo, observacao }
    );
    return data;
  },

  async obterConfiguracao() {
    const { data } = await httpClient.get<ChecklistConfiguracao>("/api/administrativo/checklist-diario/configuracoes");
    return data;
  },

  async atualizarConfiguracao(payload: { sabadoAtivo: boolean; domingoAtivo: boolean }) {
    const { data } = await httpClient.put<ChecklistConfiguracao>("/api/administrativo/checklist-diario/configuracoes", payload);
    return data;
  },

  async gerarSemana(payload?: { dataReferencia?: string; usuarioId?: number; forcar?: boolean }) {
    const { data } = await httpClient.post<{ semanaInicio: string; totalGerado: number }>(
      "/api/administrativo/checklist-diario/gerar-semana",
      payload ?? {}
    );
    return data;
  }
};
