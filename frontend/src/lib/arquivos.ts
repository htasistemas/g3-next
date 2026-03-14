import { httpClient } from "@/services/http-client";

function normalizarBaseUrl(baseUrl?: string) {
  if (!baseUrl) return "";
  return String(baseUrl).replace(/\/+$/, "");
}

export function resolverUrlArquivo(valor?: string | null) {
  if (!valor?.trim()) return "";

  const normalized = valor.trim();
  if (
    normalized.startsWith("data:") ||
    normalized.startsWith("blob:") ||
    /^https?:\/\//i.test(normalized)
  ) {
    return normalized;
  }

  const apiBaseUrl = normalizarBaseUrl(httpClient.defaults.baseURL as string | undefined);
  const path = normalized.startsWith("/") ? normalized : `/${normalized}`;

  if (normalized.startsWith("/api/arquivos/") || normalized.startsWith("api/arquivos/")) {
    return `${apiBaseUrl}${path}`;
  }

  return `${apiBaseUrl}/api/arquivos/conteudo?path=${encodeURIComponent(normalized)}`;
}

export async function obterUrlArquivoAutenticado(valor?: string | null) {
  if (!valor?.trim()) {
    return { url: "", revoke: undefined as (() => void) | undefined };
  }

  const normalized = valor.trim();
  if (
    normalized.startsWith("data:") ||
    normalized.startsWith("blob:") ||
    /^https?:\/\//i.test(normalized)
  ) {
    return { url: normalized, revoke: undefined as (() => void) | undefined };
  }

  const resposta = normalized.startsWith("/api/arquivos/") || normalized.startsWith("api/arquivos/")
    ? await httpClient.get<Blob>(normalized.startsWith("/") ? normalized : `/${normalized}`, {
        responseType: "blob"
      })
    : await httpClient.get<Blob>("/api/arquivos/conteudo", {
        params: { path: normalized },
        responseType: "blob"
      });

  const blob = resposta.data instanceof Blob ? resposta.data : new Blob([resposta.data]);
  const url = URL.createObjectURL(blob);

  return {
    url,
    revoke: () => URL.revokeObjectURL(url)
  };
}
