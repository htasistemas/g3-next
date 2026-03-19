import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { captacaoRecursosService } from "@/services/captacao-recursos.service";
import type { CaptacaoConfiguracoes, CaptacaoListFilters } from "@/types/captacao-recursos";

export function useCaptacaoDashboard(filters: CaptacaoListFilters, enabled = true) {
  return useQuery({
    queryKey: ["captacao-recursos", "dashboard", filters],
    queryFn: () => captacaoRecursosService.obterDashboard(filters),
    enabled,
    staleTime: 60_000
  });
}

export function useCaptacaoDoadores(filters: CaptacaoListFilters, enabled = true) {
  return useQuery({
    queryKey: ["captacao-recursos", "doadores", filters],
    queryFn: () => captacaoRecursosService.listarDoadores(filters),
    enabled,
    staleTime: 30_000
  });
}

export function useCaptacaoCampanhas(filters: CaptacaoListFilters, enabled = true) {
  return useQuery({
    queryKey: ["captacao-recursos", "campanhas", filters],
    queryFn: () => captacaoRecursosService.listarCampanhas(filters),
    enabled,
    staleTime: 30_000
  });
}

export function useCaptacaoDoacoes(filters: CaptacaoListFilters, enabled = true) {
  return useQuery({
    queryKey: ["captacao-recursos", "doacoes", filters],
    queryFn: () => captacaoRecursosService.listarDoacoes(filters),
    enabled,
    staleTime: 30_000
  });
}

export function useCaptacaoComprovantes(filters: CaptacaoListFilters, enabled = true) {
  return useQuery({
    queryKey: ["captacao-recursos", "comprovantes", filters],
    queryFn: () => captacaoRecursosService.listarComprovantes(filters),
    enabled,
    staleTime: 30_000
  });
}

export function useCaptacaoConfiguracoes(enabled = true) {
  return useQuery({
    queryKey: ["captacao-recursos", "configuracoes"],
    queryFn: () => captacaoRecursosService.obterConfiguracoes(),
    enabled,
    staleTime: 60_000
  });
}

export function useCaptacaoLogs(enabled = true) {
  return useQuery({
    queryKey: ["captacao-recursos", "logs"],
    queryFn: () => captacaoRecursosService.obterLogs(),
    enabled,
    staleTime: 30_000
  });
}

function invalidateBase(queryClient: ReturnType<typeof useQueryClient>) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ["captacao-recursos", "dashboard"] }),
    queryClient.invalidateQueries({ queryKey: ["captacao-recursos", "doadores"] }),
    queryClient.invalidateQueries({ queryKey: ["captacao-recursos", "campanhas"] }),
    queryClient.invalidateQueries({ queryKey: ["captacao-recursos", "doacoes"] }),
    queryClient.invalidateQueries({ queryKey: ["captacao-recursos", "comprovantes"] }),
    queryClient.invalidateQueries({ queryKey: ["captacao-recursos", "logs"] })
  ]);
}

export function useSalvarDoadorCaptacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ payload, id }: { payload: Record<string, unknown>; id?: string }) => captacaoRecursosService.salvarDoador(payload, id),
    onSuccess: () => invalidateBase(queryClient)
  });
}

export function useInativarDoadorCaptacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => captacaoRecursosService.inativarDoador(id),
    onSuccess: () => invalidateBase(queryClient)
  });
}

export function useSalvarCampanhaCaptacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ payload, id }: { payload: Record<string, unknown>; id?: string }) => captacaoRecursosService.salvarCampanha(payload, id),
    onSuccess: () => invalidateBase(queryClient)
  });
}

export function useAlterarStatusCampanhaCaptacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => captacaoRecursosService.alterarStatusCampanha(id, status),
    onSuccess: () => invalidateBase(queryClient)
  });
}

export function useSalvarDoacaoCaptacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ payload, id }: { payload: Record<string, unknown>; id?: string }) => captacaoRecursosService.salvarDoacao(payload, id),
    onSuccess: () => invalidateBase(queryClient)
  });
}

export function useGerarCobrancaCaptacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => captacaoRecursosService.gerarCobranca(id),
    onSuccess: () => invalidateBase(queryClient)
  });
}

export function useConfirmarDoacaoCaptacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => captacaoRecursosService.confirmarDoacao(id),
    onSuccess: () => invalidateBase(queryClient)
  });
}

export function useCancelarDoacaoCaptacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, observacao }: { id: string; observacao?: string }) => captacaoRecursosService.cancelarDoacao(id, observacao),
    onSuccess: () => invalidateBase(queryClient)
  });
}

export function useEstornarDoacaoCaptacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, observacao }: { id: string; observacao?: string }) => captacaoRecursosService.estornarDoacao(id, observacao),
    onSuccess: () => invalidateBase(queryClient)
  });
}

export function useEmitirComprovanteCaptacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => captacaoRecursosService.emitirComprovante(id),
    onSuccess: () => invalidateBase(queryClient)
  });
}

export function useReenviarComprovanteCaptacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => captacaoRecursosService.reenviarComprovante(id),
    onSuccess: () => invalidateBase(queryClient)
  });
}

export function useSalvarConfiguracoesCaptacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<CaptacaoConfiguracoes>) => captacaoRecursosService.salvarConfiguracoes(payload),
    onSuccess: async () => {
      await invalidateBase(queryClient);
      await queryClient.invalidateQueries({ queryKey: ["captacao-recursos", "configuracoes"] });
    }
  });
}
