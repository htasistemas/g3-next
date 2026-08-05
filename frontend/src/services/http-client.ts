import axios from "axios";

const runtimeApiUrl = window.__env?.apiUrl?.trim();
const apiBaseUrl =
  runtimeApiUrl ??
  import.meta.env["VITE_API_URL"] ??
  (import.meta.env.PROD ? window.location.origin : "http://localhost:3333");

declare global {
  interface Window {
    __env?: {
      apiUrl?: string;
      googleClientId?: string;
      googleAllowedOrigins?: string;
    };
  }
}

export const httpClient = axios.create({
  baseURL: apiBaseUrl,
  timeout: 15000,
  withCredentials: true
});

type SessaoG3 = {
  token?: string;
};

function obterTokenSessao(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const chaves = ["g3_session"];
  for (const chave of chaves) {
    const bruto = window.sessionStorage.getItem(chave) ?? window.localStorage.getItem(chave);
    if (!bruto) continue;

    try {
      const sessao = JSON.parse(bruto) as SessaoG3;
      const token = sessao?.token?.trim();
      if (token) {
        return token;
      }
    } catch {
      // Ignora sessao invalida e tenta a proxima origem.
    }
  }

  return null;
}

httpClient.interceptors.request.use((config) => {
  const token = obterTokenSessao();
  if (token && !config.headers?.Authorization) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
