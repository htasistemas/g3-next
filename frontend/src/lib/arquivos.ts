import { httpClient } from "@/services/http-client";

type ArquivoAutenticado = {
  url: string;
  revoke?: () => void;
};

type OpcoesUrlArquivoAutenticado = {
  cache?: boolean;
  auditar?: boolean;
};

const cacheUrlArquivoAutenticado = new Map<string, Promise<ArquivoAutenticado>>();

function normalizarBaseUrl(baseUrl?: string) {
  if (!baseUrl) return "";
  return String(baseUrl).replace(/\/+$/, "");
}

function escapeHtml(valor: string) {
  return valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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

  if (normalized.startsWith("/api/") || normalized.startsWith("api/")) {
    return `${apiBaseUrl}${path}`;
  }

  return `${apiBaseUrl}/api/arquivos/conteudo?path=${encodeURIComponent(normalized)}`;
}

export async function obterUrlArquivoAutenticado(
  valor?: string | null,
  opcoes: OpcoesUrlArquivoAutenticado = {}
) {
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

  const usarCache = opcoes.cache ?? true;
  const auditar = opcoes.auditar ?? true;
  const cacheKey = `${normalized}|audit:${auditar ? "1" : "0"}`;
  if (usarCache && cacheUrlArquivoAutenticado.has(cacheKey)) {
    return cacheUrlArquivoAutenticado.get(cacheKey) as Promise<ArquivoAutenticado>;
  }

  const carregar = (async (): Promise<ArquivoAutenticado> => {
    const resposta = normalized.startsWith("/api/") || normalized.startsWith("api/")
      ? await httpClient.get<Blob>(normalized.startsWith("/") ? normalized : `/${normalized}`, {
          params: { audit: auditar ? undefined : "false" },
          responseType: "blob"
        })
      : await httpClient.get<Blob>("/api/arquivos/conteudo", {
          params: { path: normalized, audit: auditar ? undefined : "false" },
          responseType: "blob"
        });

    const blob = resposta.data instanceof Blob ? resposta.data : new Blob([resposta.data]);
    const url = URL.createObjectURL(blob);

    return usarCache
      ? { url }
      : {
          url,
          revoke: () => URL.revokeObjectURL(url)
        };
  })();

  if (usarCache) {
    cacheUrlArquivoAutenticado.set(cacheKey, carregar);
    carregar.catch(() => cacheUrlArquivoAutenticado.delete(cacheKey));
  }

  return carregar;
}

export async function abrirArquivoAutenticado(valor?: string | null, titulo = "Arquivo") {
  const janela = window.open("", "_blank", "width=1200,height=900");
  if (!janela) {
    throw new Error("O navegador bloqueou a abertura do arquivo.");
  }

  try {
    janela.opener = null;
  } catch {
    // Alguns navegadores podem bloquear o ajuste do opener.
  }

  janela.document.write(`<!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${escapeHtml(titulo)}</title>
        <style>
          body {
            margin: 0;
            min-height: 100vh;
            display: grid;
            place-items: center;
            background: #f8fafc;
            color: #0f172a;
            font-family: Arial, sans-serif;
          }
        </style>
      </head>
      <body>Carregando arquivo...</body>
    </html>`);
  janela.document.close();

  const arquivo = await obterUrlArquivoAutenticado(valor);
  if (!arquivo.url) {
    janela.close();
    throw new Error("Arquivo nao disponivel para visualizacao.");
  }

  try {
    janela.location.replace(arquivo.url);
  } catch {
    janela.location.href = arquivo.url;
  }

  window.setTimeout(() => arquivo.revoke?.(), 60_000);
}

export async function imprimirArquivoAutenticado(valor?: string | null, titulo = "Documento") {
  const janela = window.open("", "_blank", "width=1200,height=900");
  if (!janela) {
    throw new Error("O navegador bloqueou a abertura da impressao.");
  }

  try {
    janela.opener = null;
  } catch {
    // Alguns navegadores podem bloquear o ajuste do opener.
  }

  const arquivo = await obterUrlArquivoAutenticado(valor);
  if (!arquivo.url) {
    janela.close();
    throw new Error("Arquivo nao disponivel para impressao.");
  }

  janela.document.write(`<!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${escapeHtml(titulo)}</title>
        <style>
          html, body {
            margin: 0;
            height: 100%;
            background: #e2e8f0;
          }

          iframe {
            width: 100%;
            height: 100%;
            border: 0;
            background: white;
          }
        </style>
      </head>
      <body>
        <iframe id="g3-print-frame" title="${escapeHtml(titulo)}"></iframe>
        <script>
          const frame = document.getElementById("g3-print-frame");
          frame.src = ${JSON.stringify(arquivo.url)};
          frame.addEventListener("load", () => {
            window.setTimeout(() => {
              try {
                window.focus();
                frame.contentWindow?.focus();
                frame.contentWindow?.print();
              } catch {
                window.print();
              }
            }, 700);
          });
        </script>
      </body>
    </html>`);
  janela.document.close();

  const limpar = () => arquivo.revoke?.();
  janela.addEventListener("afterprint", limpar, { once: true });
  janela.addEventListener("beforeunload", limpar, { once: true });
  window.setTimeout(limpar, 60_000);
}
