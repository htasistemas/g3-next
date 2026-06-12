import { useEffect, useState } from "react";
import { APP_VERSION } from "@/lib/app-version";

const CHAVE_TENTATIVA_RECARGA = "g3n:atualizacao-frontend:ultima-tentativa";
const INTERVALO_MINIMO_TENTATIVA_MS = 90_000;

function normalizarVersao(versao: string | null | undefined) {
  return versao?.trim() ?? "";
}

function montarUrlAtualizada(versaoRuntime: string) {
  const url = new URL(window.location.href);
  url.searchParams.set("g3nVersao", versaoRuntime);
  url.searchParams.set("g3nAtualizacao", Date.now().toString());
  return url.toString();
}

function podeTentarRecarregar(versaoBuild: string, versaoRuntime: string) {
  const bruto = window.localStorage.getItem(CHAVE_TENTATIVA_RECARGA);
  if (!bruto) {
    return true;
  }

  try {
    const tentativa = JSON.parse(bruto) as {
      versaoBuild?: string;
      versaoRuntime?: string;
      data?: number;
    };
    const mesmaTentativa =
      tentativa.versaoBuild === versaoBuild && tentativa.versaoRuntime === versaoRuntime;
    const tentativaRecente = Date.now() - Number(tentativa.data ?? 0) < INTERVALO_MINIMO_TENTATIVA_MS;
    return !(mesmaTentativa && tentativaRecente);
  } catch {
    return true;
  }
}

function registrarTentativaRecarregamento(versaoBuild: string, versaoRuntime: string) {
  window.localStorage.setItem(
    CHAVE_TENTATIVA_RECARGA,
    JSON.stringify({
      versaoBuild,
      versaoRuntime,
      data: Date.now()
    })
  );
}

async function removerServiceWorkersLegados() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  const registros = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registros.map((registro) => registro.unregister()));
}

export function useAutoRefreshOnVersionChange(versaoRuntime: string | null | undefined) {
  const [atualizando, setAtualizando] = useState(false);

  useEffect(() => {
    const versaoBuild = normalizarVersao(APP_VERSION);
    const versaoServidor = normalizarVersao(versaoRuntime);

    if (!versaoBuild || !versaoServidor || versaoBuild === versaoServidor || atualizando) {
      if (versaoBuild && versaoServidor && versaoBuild === versaoServidor) {
        window.localStorage.removeItem(CHAVE_TENTATIVA_RECARGA);
      }
      return;
    }

    if (!podeTentarRecarregar(versaoBuild, versaoServidor)) {
      return;
    }

    registrarTentativaRecarregamento(versaoBuild, versaoServidor);
    setAtualizando(true);

    const recarregar = async () => {
      try {
        await removerServiceWorkersLegados();
      } catch {
        // A recarga deve seguir mesmo se o navegador bloquear a limpeza.
      }

      window.setTimeout(() => {
        window.location.replace(montarUrlAtualizada(versaoServidor));
      }, 350);
    };

    void recarregar();
  }, [atualizando, versaoRuntime]);

  return { atualizando };
}
