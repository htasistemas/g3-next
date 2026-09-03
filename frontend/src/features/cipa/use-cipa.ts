import { useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { cipaService } from "@/services/cipa.service";

export function useEleicoesCipa() {
  const { usuario } = useAuth();
  return useQuery({ queryKey: ["cipa", usuario?.tenant_id ?? "sem-tenant", "eleicoes"], queryFn: cipaService.listarEleicoes, enabled: !!usuario });
}

export function useColaboradoresCipa(unidadeId?: string, termo?: string) {
  const { usuario } = useAuth();
  return useQuery({ queryKey: ["cipa", usuario?.tenant_id ?? "sem-tenant", "colaboradores", unidadeId, termo], queryFn: () => cipaService.listarColaboradores({ unidadeId, termo }), enabled: !!usuario && !!unidadeId });
}

export function useCriarEleicaoCipa() {
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? "sem-tenant";
  return useMutation({ mutationFn: cipaService.criarEleicao, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cipa", tenantId, "eleicoes"] }) });
}

export function useCriarColaboradorCipa() {
  const queryClient = useQueryClient(); const { usuario } = useAuth(); const tenantId = usuario?.tenant_id ?? "sem-tenant";
  return useMutation({ mutationFn: cipaService.criarColaborador, onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["cipa", tenantId, "colaboradores"] }) });
}

export function useEleitoresCipa(eleicaoId: string | undefined) {
  const { usuario } = useAuth();
  return useQuery({ queryKey: ["cipa", usuario?.tenant_id ?? "sem-tenant", "eleitores", eleicaoId], queryFn: () => cipaService.listarEleitores(eleicaoId as string), enabled: !!usuario && !!eleicaoId });
}

export function useDashboardCipa(eleicaoId: string | undefined) {
  const { usuario } = useAuth();
  const queryClient = useQueryClient(); const tenantId = usuario?.tenant_id ?? "sem-tenant"; const queryKey = useMemo(() => ["cipa", tenantId, "dashboard", eleicaoId], [eleicaoId, tenantId]);
  const query = useQuery({ queryKey, queryFn: () => cipaService.dashboard(eleicaoId as string), enabled: !!usuario && !!eleicaoId, refetchInterval: 60000 });
  useEffect(() => {
    if (!usuario || !eleicaoId || typeof window === "undefined" || typeof EventSource === "undefined") return undefined;
    const apiBase = window.__env?.apiUrl?.replace(/\/$/u, "") ?? "";
    const source = new EventSource(`${apiBase}/api/rh/cipa/eleicoes/${eleicaoId}/dashboard/ao-vivo`, { withCredentials: true });
    const atualizar = (event: MessageEvent<string>) => { try { queryClient.setQueryData(queryKey, JSON.parse(event.data)); } catch { void queryClient.invalidateQueries({ queryKey }); } };
    source.addEventListener("snapshot", atualizar); source.addEventListener("atualizacao", atualizar);
    return () => source.close();
  }, [eleicaoId, queryClient, queryKey, usuario]);
  return query;
}

export function useAcaoEleicaoCipa() {
  const queryClient = useQueryClient(); const { usuario } = useAuth(); const tenantId = usuario?.tenant_id ?? "sem-tenant";
  return useMutation({ mutationFn: ({ acao, eleicaoId, motivo }: { acao: "abrirInscricoes" | "encerrarInscricoes" | "publicar" | "gerarZeresima" | "abrirVotacao" | "encerrarVotacao" | "apurar" | "cancelarEleicao"; eleicaoId: string; motivo?: string }) => acao === "cancelarEleicao" ? cipaService.cancelarEleicao(eleicaoId, motivo ?? "Cancelamento solicitado pela organização") : cipaService[acao](eleicaoId), onSuccess: (_, variables) => { void queryClient.invalidateQueries({ queryKey: ["cipa", tenantId, "eleicoes"] }); void queryClient.invalidateQueries({ queryKey: ["cipa", tenantId, "dashboard", variables.eleicaoId] }); } });
}
