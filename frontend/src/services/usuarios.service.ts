import { httpClient } from "./http-client";
import type {
  UsuarioDetalheResponse,
  UsuarioFacePayload,
  UsuarioFaceStatus,
  UsuarioFiltros,
  UsuarioListaResponse,
  UsuarioPayload,
  UsuarioPermissoesResponse,
  UsuarioRemocaoResponse,
  UsuarioStatus
} from "@/types/usuario";
import type { UsuarioAcesso, UsuarioAcessoCatalogo, UsuarioAcessoInput } from "@/types/usuario";

export const usuariosService = {
  async listarAcessos(id: string): Promise<{ acessos: UsuarioAcesso[] }> {
    const { data } = await httpClient.get<{ acessos: UsuarioAcesso[] }>(`/api/usuarios/${id}/acessos`);
    return data;
  },

  async substituirAcessos(id: string, acessos: UsuarioAcessoInput[]): Promise<{ acessos: UsuarioAcesso[] }> {
    const { data } = await httpClient.put<{ acessos: UsuarioAcesso[] }>(`/api/usuarios/${id}/acessos`, { acessos });
    return data;
  },

  async listarCatalogoAcessos(): Promise<UsuarioAcessoCatalogo> {
    const { data } = await httpClient.get<UsuarioAcessoCatalogo>("/api/usuarios/catalogo-acessos");
    return data;
  },
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

  async buscarFace(id: string): Promise<UsuarioFaceStatus> {
    const { data } = await httpClient.get<UsuarioFaceStatus>(`/api/usuarios/${id}/face`);
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

  async salvarFace(id: string, payload: UsuarioFacePayload): Promise<UsuarioFaceStatus & { mensagem: string }> {
    const { data } = await httpClient.put<UsuarioFaceStatus & { mensagem: string }>(`/api/usuarios/${id}/face`, payload);
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

  async remover(id: string): Promise<UsuarioRemocaoResponse> {
    const { data } = await httpClient.delete<UsuarioRemocaoResponse>(`/api/usuarios/${id}`);
    return data;
  },

  async removerFace(id: string): Promise<UsuarioFaceStatus & { mensagem: string }> {
    const { data } = await httpClient.delete<UsuarioFaceStatus & { mensagem: string }>(`/api/usuarios/${id}/face`);
    return data;
  }
};
