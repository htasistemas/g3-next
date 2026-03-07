import { httpClient } from "./http-client";
import type {
  UsuarioDetalheResponse,
  UsuarioFiltros,
  UsuarioListaResponse,
  UsuarioPayload,
  UsuarioPermissoesResponse,
  UsuarioStatus
} from "@/types/usuario";

export const usuariosService = {
  async listar(filtros: UsuarioFiltros): Promise<UsuarioListaResponse> {
    const { data } = await httpClient.get<UsuarioListaResponse>("/api/usuarios", {
      params: filtros
    });
    return data;
  },

  async buscarPorId(id: string): Promise<UsuarioDetalheResponse> {
    const { data } = await httpClient.get<UsuarioDetalheResponse>(`/api/usuarios/${id}`);
    return data;
  },

  async listarPermissoes(): Promise<UsuarioPermissoesResponse> {
    const { data } = await httpClient.get<UsuarioPermissoesResponse>("/api/usuarios/permissoes");
    return data;
  },

  async criar(payload: UsuarioPayload): Promise<UsuarioDetalheResponse> {
    const { data } = await httpClient.post<UsuarioDetalheResponse>("/api/usuarios", payload);
    return data;
  },

  async atualizar(id: string, payload: UsuarioPayload): Promise<UsuarioDetalheResponse> {
    const { data } = await httpClient.put<UsuarioDetalheResponse>(`/api/usuarios/${id}`, payload);
    return data;
  },

  async atualizarStatus(id: string, status: UsuarioStatus): Promise<UsuarioDetalheResponse> {
    const { data } = await httpClient.patch<UsuarioDetalheResponse>(`/api/usuarios/${id}/status`, {
      status
    });
    return data;
  },

  async resetarSenha(
    id: string,
    payload: { nova_senha: string; confirmar_nova_senha: string; exigir_troca_senha: boolean }
  ): Promise<UsuarioDetalheResponse> {
    const { data } = await httpClient.post<UsuarioDetalheResponse>(
      `/api/usuarios/${id}/reset-senha`,
      payload
    );
    return data;
  },

  async remover(id: string): Promise<UsuarioDetalheResponse> {
    const { data } = await httpClient.delete<UsuarioDetalheResponse>(`/api/usuarios/${id}`);
    return data;
  }
};
