import { httpClient } from "./http-client";
import type { TenantContextoLogin, UsuarioAutenticado } from "@/types/auth";

type LoginResponse = {
  usuario: UsuarioAutenticado;
};

type MeResponse = {
  usuario: UsuarioAutenticado | null;
};

type TenantContextResponse = {
  instituicao: TenantContextoLogin | null;
};

type PreferenciaAgendamentosResponse = {
  dataVisualizacao: string | null;
};

const STORAGE_KEY = "g3_session";

function persistirSessao(usuario: UsuarioAutenticado) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      user: usuario
    })
  );
}

function limparSessao() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(STORAGE_KEY);
  window.localStorage.removeItem(STORAGE_KEY);
}

export const authService = {
  async login(input: {
    cnpj?: string;
    codigoInstituicao?: string;
    slug?: string;
    email?: string;
    nomeUsuario?: string;
    senha: string;
  }): Promise<UsuarioAutenticado> {
    const { data } = await httpClient.post<LoginResponse>("/api/auth/login", {
      cnpj: input.cnpj,
      codigoInstituicao: input.codigoInstituicao,
      slug: input.slug,
      email: input.email,
      nomeUsuario: input.nomeUsuario,
      senha: input.senha
    });
    persistirSessao(data.usuario);
    return data.usuario;
  },

  async me(): Promise<UsuarioAutenticado | null> {
    const { data } = await httpClient.get<MeResponse>("/api/auth/me");
    return data.usuario;
  },

  async loginGoogle(input: {
    idToken: string;
    cnpj?: string;
    slug?: string;
    codigoInstituicao?: string;
  }): Promise<UsuarioAutenticado> {
    const { data } = await httpClient.post<LoginResponse>("/api/auth/google", {
      idToken: input.idToken,
      cnpj: input.cnpj,
      slug: input.slug,
      codigoInstituicao: input.codigoInstituicao
    });
    persistirSessao(data.usuario);
    return data.usuario;
  },

  async logout(): Promise<void> {
    try {
      await httpClient.post("/api/auth/logout");
    } finally {
      limparSessao();
    }
  },

  async esqueciSenha(input: {
    email: string;
    cnpj?: string;
    slug?: string;
    codigoInstituicao?: string;
  }): Promise<{ message: string }> {
    const { data } = await httpClient.post<{ message: string }>("/api/auth/esqueci-senha", {
      email: input.email,
      cnpj: input.cnpj,
      slug: input.slug,
      codigoInstituicao: input.codigoInstituicao
    });
    return data;
  },

  async obterTenantContexto(params: {
    cnpj?: string;
    slug?: string;
    codigoInstituicao?: string;
  }): Promise<TenantContextoLogin | null> {
    const { data } = await httpClient.get<TenantContextResponse>("/api/auth/tenant-context", {
      params
    });
    return data.instituicao;
  },

  async obterPreferenciaAgendamentos(): Promise<string | null> {
    const { data } = await httpClient.get<PreferenciaAgendamentosResponse>(
      "/api/auth/me/preferencias/agendamentos"
    );
    return data.dataVisualizacao?.trim() || null;
  },

  async salvarPreferenciaAgendamentos(dataVisualizacao: string): Promise<string | null> {
    const { data } = await httpClient.put<{ data_visualizacao: string }>(
      "/api/auth/me/preferencias/agendamentos",
      { dataVisualizacao }
    );
    return data.data_visualizacao?.trim() || null;
  }
};
