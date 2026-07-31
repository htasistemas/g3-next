import { httpClient } from "./http-client";
import type {
  InformacaoAdministrativa,
  InformacaoAdministrativaCategoria,
  InformacaoAdministrativaCategoriaPayload,
  InformacaoAdministrativaPayload
} from "@/types/informacao-administrativa";

export const informacoesAdministrativasService = {
  async listar(senhaConfirmacao: string) {
    const { data } = await httpClient.post<{ informacoes: InformacaoAdministrativa[] }>(
      "/api/administrativo/informacoes-administrativas/consultar",
      { senhaConfirmacao }
    );
    return data.informacoes;
  },

  async criar(payload: InformacaoAdministrativaPayload) {
    const { data } = await httpClient.post<{ informacao: InformacaoAdministrativa }>(
      "/api/administrativo/informacoes-administrativas",
      payload
    );
    return data.informacao;
  },

  async atualizar(id: string, payload: InformacaoAdministrativaPayload) {
    const { data } = await httpClient.put<{ informacao: InformacaoAdministrativa }>(
      `/api/administrativo/informacoes-administrativas/${id}`,
      payload
    );
    return data.informacao;
  },

  async excluir(id: string, senhaConfirmacao: string) {
    await httpClient.delete(`/api/administrativo/informacoes-administrativas/${id}`, {
      data: { senhaConfirmacao }
    });
  },

  async listarCategorias(senhaConfirmacao: string) {
    const { data } = await httpClient.post<{ categorias: InformacaoAdministrativaCategoria[] }>(
      "/api/administrativo/informacoes-administrativas/categorias/consultar",
      { senhaConfirmacao }
    );
    return data.categorias;
  },

  async criarCategoria(payload: InformacaoAdministrativaCategoriaPayload) {
    const { data } = await httpClient.post<{ categoria: InformacaoAdministrativaCategoria }>(
      "/api/administrativo/informacoes-administrativas/categorias",
      payload
    );
    return data.categoria;
  },

  async atualizarCategoria(id: string, payload: InformacaoAdministrativaCategoriaPayload) {
    const { data } = await httpClient.put<{ categoria: InformacaoAdministrativaCategoria }>(
      `/api/administrativo/informacoes-administrativas/categorias/${id}`,
      payload
    );
    return data.categoria;
  },

  async excluirCategoria(id: string, senhaConfirmacao: string) {
    await httpClient.delete(`/api/administrativo/informacoes-administrativas/categorias/${id}`, {
      data: { senhaConfirmacao }
    });
  }
};
