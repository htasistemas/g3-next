import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { captacaoRecursosService } from "@/services/captacao-recursos.service";
import { useAuth } from "@/hooks/use-auth";
import type { CaptacaoConfiguracoes, CaptacaoListFilters } from "@/types/captacao-recursos";

export function useCaptacaoDashboard(filters: CaptacaoListFilters, enabled = true) {
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? "sem-tenant";
  return useQuery({
    queryKey: ["captacao-recursos", tenantId, "dashboard", filters],
    queryFn: () => captacaoRecursosService.obterDashboard(filters),
    enabled,
    staleTime: 60_000
  });
}

export function useCaptacaoDoadores(filters: CaptacaoListFilters, enabled = true) {
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? "sem-tenant";
  return useQuery({
    queryKey: ["captacao-recursos", tenantId, "doadores", filters],
    queryFn: () => captacaoRecursosService.listarDoadores(filters),
    enabled,
    staleTime: 30_000
  });
}

export function useCaptacaoCampanhas(filters: CaptacaoListFilters, enabled = true) {
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? "sem-tenant";
  return useQuery({
    queryKey: ["captacao-recursos", tenantId, "campanhas", filters],
    queryFn: () => captacaoRecursosService.listarCampanhas(filters),
    enabled,
    staleTime: 30_000
  });
}

export function useCaptacaoDoacoes(filters: CaptacaoListFilters, enabled = true) {
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? "sem-tenant";
  return useQuery({
    queryKey: ["captacao-recursos", tenantId, "doacoes", filters],
    queryFn: () => captacaoRecursosService.listarDoacoes(filters),
    enabled,
    staleTime: 30_000
  });
}

export function useCaptacaoComprovantes(filters: CaptacaoListFilters, enabled = true) {
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? "sem-tenant";
  return useQuery({
    queryKey: ["captacao-recursos", tenantId, "comprovantes", filters],
    queryFn: () => captacaoRecursosService.listarComprovantes(filters),
    enabled,
    staleTime: 30_000
  });
}

export function useCaptacaoConfiguracoes(enabled = true) {
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? "sem-tenant";
  return useQuery({
    queryKey: ["captacao-recursos", tenantId, "configuracoes"],
    queryFn: () => captacaoRecursosService.obterConfiguracoes(),
    enabled,
    staleTime: 60_000
  });
}

export function useCaptacaoLogs(enabled = true) {
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? "sem-tenant";
  return useQuery({
    queryKey: ["captacao-recursos", tenantId, "logs"],
    queryFn: () => captacaoRecursosService.obterLogs(),
    enabled,
    staleTime: 30_000
  });
}

function invalidateBase(queryClient: ReturnType<typeof useQueryClient>, tenantId: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ["captacao-recursos", tenantId, "dashboard"] }),
    queryClient.invalidateQueries({ queryKey: ["captacao-recursos", tenantId, "doadores"] }),
    queryClient.invalidateQueries({ queryKey: ["captacao-recursos", tenantId, "campanhas"] }),
    queryClient.invalidateQueries({ queryKey: ["captacao-recursos", tenantId, "doacoes"] }),
    queryClient.invalidateQueries({ queryKey: ["captacao-recursos", tenantId, "comprovantes"] }),
    queryClient.invalidateQueries({ queryKey: ["captacao-recursos", tenantId, "logs"] })
  ]);
}

export function useSalvarDoadorCaptacao() {
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? "sem-tenant";
  return useMutation({
    mutationFn: ({ payload, id }: { payload: Record<string, unknown>; id?: string }) => captacaoRecursosService.salvarDoador(payload, id),
    onSuccess: () => invalidateBase(queryClient, tenantId)
  });
}

export function useInativarDoadorCaptacao() {
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? "sem-tenant";
  return useMutation({
    mutationFn: (id: string) => captacaoRecursosService.inativarDoador(id),
    onSuccess: () => invalidateBase(queryClient, tenantId)
  });
}

export function useSalvarCampanhaCaptacao() {
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? "sem-tenant";
  return useMutation({
    mutationFn: ({ payload, id }: { payload: Record<string, unknown>; id?: string }) => captacaoRecursosService.salvarCampanha(payload, id),
    onSuccess: () => invalidateBase(queryClient, tenantId)
  });
}

export function useAlterarStatusCampanhaCaptacao() {
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? "sem-tenant";
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => captacaoRecursosService.alterarStatusCampanha(id, status),
    onSuccess: () => invalidateBase(queryClient, tenantId)
  });
}

export function useSalvarDoacaoCaptacao() {
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? "sem-tenant";
  return useMutation({
    mutationFn: ({ payload, id }: { payload: Record<string, unknown>; id?: string }) => captacaoRecursosService.salvarDoacao(payload, id),
    onSuccess: () => invalidateBase(queryClient, tenantId)
  });
}

export function useGerarCobrancaCaptacao() {
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? "sem-tenant";
  return useMutation({
    mutationFn: (id: string) => captacaoRecursosService.gerarCobranca(id),
    onSuccess: () => invalidateBase(queryClient, tenantId)
  });
}

export function useConfirmarDoacaoCaptacao() {
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? "sem-tenant";
  return useMutation({
    mutationFn: (id: string) => captacaoRecursosService.confirmarDoacao(id),
    onSuccess: () => invalidateBase(queryClient, tenantId)
  });
}

export function useCancelarDoacaoCaptacao() {
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? "sem-tenant";
  return useMutation({
    mutationFn: ({ id, observacao }: { id: string; observacao?: string }) => captacaoRecursosService.cancelarDoacao(id, observacao),
    onSuccess: () => invalidateBase(queryClient, tenantId)
  });
}

export function useEstornarDoacaoCaptacao() {
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? "sem-tenant";
  return useMutation({
    mutationFn: ({ id, observacao }: { id: string; observacao?: string }) => captacaoRecursosService.estornarDoacao(id, observacao),
    onSuccess: () => invalidateBase(queryClient, tenantId)
  });
}

export function useEmitirComprovanteCaptacao() {
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? "sem-tenant";
  return useMutation({
    mutationFn: (id: string) => captacaoRecursosService.emitirComprovante(id),
    onSuccess: () => invalidateBase(queryClient, tenantId)
  });
}

export function useReenviarComprovanteCaptacao() {
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? "sem-tenant";
  return useMutation({
    mutationFn: (id: string) => captacaoRecursosService.reenviarComprovante(id),
    onSuccess: () => invalidateBase(queryClient, tenantId)
  });
}

export function useSalvarConfiguracoesCaptacao() {
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? "sem-tenant";
  return useMutation({
    mutationFn: (payload: Partial<CaptacaoConfiguracoes>) => captacaoRecursosService.salvarConfiguracoes(payload),
    onSuccess: async () => {
      await invalidateBase(queryClient, tenantId);
      await queryClient.invalidateQueries({ queryKey: ["captacao-recursos", tenantId, "configuracoes"] });
    }
  });
}
