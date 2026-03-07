import { httpClient } from "./http-client";
import type { UsuarioAutenticado } from "@/types/auth";

type LoginResponse = {
  token: string;
  usuario: UsuarioAutenticado;
};

type MeResponse = {
  usuario: UsuarioAutenticado;
};

export const authService = {
  async login(nomeUsuario: string, senha: string): Promise<UsuarioAutenticado> {
    const { data } = await httpClient.post<LoginResponse>("/api/auth/login", {
      nomeUsuario,
      senha
    });
    return data.usuario;
  },

  async me(): Promise<UsuarioAutenticado> {
    const { data } = await httpClient.get<MeResponse>("/api/auth/me");
    return data.usuario;
  },

  async loginGoogle(idToken: string): Promise<UsuarioAutenticado> {
    const { data } = await httpClient.post<LoginResponse>("/api/auth/google", {
      idToken
    });
    return data.usuario;
  },

  async logout(): Promise<void> {
    await httpClient.post("/api/auth/logout");
  }
};
