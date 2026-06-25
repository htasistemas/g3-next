import { httpClient } from "./http-client";
import type { Patrimonio, PatrimonioCategoria, PatrimonioMovimento } from "@/types/patrimonio";

export const patrimoniosService = {
  async listar() {
    const { data } = await httpClient.get<{ patrimonios: Patrimonio[] }>("/api/patrimonios");
    return data;
  },

  async listarCategorias() {
    const { data } = await httpClient.get<{ categorias: PatrimonioCategoria[] }>("/api/patrimonios/categorias");
    return data;
  },

  async criarCategoria(payload: PatrimonioCategoria) {
    const { data } = await httpClient.post<{ categoria: PatrimonioCategoria }>("/api/patrimonios/categorias", payload);
    return data;
  },

  async atualizarCategoria(id: string, payload: PatrimonioCategoria) {
    const { data } = await httpClient.put<{ categoria: PatrimonioCategoria }>(
      `/api/patrimonios/categorias/${id}`,
      payload
    );
    return data;
  },

  async removerCategoria(id: string) {
    await httpClient.delete(`/api/patrimonios/categorias/${id}`);
  },

  async criar(payload: Patrimonio) {
    const { data } = await httpClient.post<{ patrimonio: Patrimonio }>("/api/patrimonios", payload);
    return data;
  },

  async atualizar(id: string, payload: Patrimonio) {
    const { data } = await httpClient.put<{ patrimonio: Patrimonio }>(`/api/patrimonios/${id}`, payload);
    return data;
  },

  async registrarMovimento(id: string, payload: PatrimonioMovimento) {
    const { data } = await httpClient.post<{ patrimonio: Patrimonio }>(
      `/api/patrimonios/${id}/movimentos`,
      payload
    );
    return data;
  }
};
