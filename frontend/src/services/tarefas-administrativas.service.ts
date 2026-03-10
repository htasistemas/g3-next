import { httpClient } from "./http-client";
import type { TarefaAdministrativa, TarefaAdministrativaPayload } from "@/types/tarefa-administrativa";

export const tarefasAdministrativasService = {
  async listar() {
    const { data } = await httpClient.get<TarefaAdministrativa[]>("/api/administrativo/tarefas");
    return data;
  },

  async buscarPorId(id: string) {
    const { data } = await httpClient.get<TarefaAdministrativa>(`/api/administrativo/tarefas/${id}`);
    return data;
  },

  async criar(payload: TarefaAdministrativaPayload) {
    const { data } = await httpClient.post<TarefaAdministrativa>("/api/administrativo/tarefas", payload);
    return data;
  },

  async atualizar(id: string, payload: TarefaAdministrativaPayload) {
    const { data } = await httpClient.put<TarefaAdministrativa>(
      `/api/administrativo/tarefas/${id}`,
      payload
    );
    return data;
  },

  async adicionarHistorico(id: string, mensagem: string) {
    const { data } = await httpClient.post<TarefaAdministrativa>(
      `/api/administrativo/tarefas/${id}/historico`,
      { mensagem }
    );
    return data;
  },

  async excluir(id: string) {
    await httpClient.delete(`/api/administrativo/tarefas/${id}`);
  }
};
