import { httpClient } from "./http-client";
import type { InstituicaoPayload, InstituicaoResumo } from "@/types/instituicao";
import type { UsuarioDetalheResponse, UsuarioListaResponse, UsuarioPayload } from "@/types/usuario";

export const instituicoesService = {
  async listar(): Promise<InstituicaoResumo[]> {
    const { data } = await httpClient.get<{ instituicoes: InstituicaoResumo[] }>("/api/master/instituicoes");
    return data.instituicoes ?? [];
  },

  async criar(payload: InstituicaoPayload): Promise<InstituicaoResumo> {
    const { data } = await httpClient.post<{ instituicao: InstituicaoResumo }>(
      "/api/master/instituicoes",
      payload
    );
    return data.instituicao;
  },

  async atualizar(id: string, payload: Partial<InstituicaoPayload>): Promise<InstituicaoResumo> {
    const { data } = await httpClient.put<{ instituicao: InstituicaoResumo }>(
      `/api/master/instituicoes/${id}`,
      payload
    );
    return data.instituicao;
  },

  async resetarAdmin(id: string, payload: { email?: string; nova_senha: string }) {
    const { data } = await httpClient.post<{ sucesso: boolean }>(
      `/api/master/instituicoes/${id}/resetar-admin`,
      payload
    );
    return data;
  },

  async desbloquearAcesso(id: string) {
    const { data } = await httpClient.post<{
      sucesso: boolean;
      instituicoes_desbloqueadas: number;
      usuarios_desbloqueados: number;
    }>(`/api/master/instituicoes/${id}/desbloquear-acesso`);
    return data;
  },

  async listarUsuarios(id: string): Promise<UsuarioListaResponse> {
    const { data } = await httpClient.get<UsuarioListaResponse>(`/api/master/instituicoes/${id}/usuarios`);
    return data;
  },

  async criarUsuario(id: string, payload: UsuarioPayload): Promise<UsuarioDetalheResponse> {
    const { data } = await httpClient.post<UsuarioDetalheResponse>(`/api/master/instituicoes/${id}/usuarios`, payload);
    return data;
  },

  async atualizarUsuario(id: string, usuarioId: string, payload: UsuarioPayload): Promise<UsuarioDetalheResponse> {
    const { data } = await httpClient.put<UsuarioDetalheResponse>(
      `/api/master/instituicoes/${id}/usuarios/${usuarioId}`,
      payload
    );
    return data;
  },

  async resetarSenhaUsuario(
    id: string,
    usuarioId: string,
    payload: { nova_senha: string; confirmar_nova_senha: string; exigir_troca_senha?: boolean }
  ): Promise<UsuarioDetalheResponse> {
    const { data } = await httpClient.post<UsuarioDetalheResponse>(
      `/api/master/instituicoes/${id}/usuarios/${usuarioId}/reset-senha`,
      payload
    );
    return data;
  }
};
