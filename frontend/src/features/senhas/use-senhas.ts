import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { senhasService } from "@/services/senhas.service";
import type {
  SenhaChamarRequest,
  SenhaEmitirRequest,
  SenhaFinalizarRequest,
  SenhasConfigRequest
} from "@/types/senhas";

export function useSenhasAguardando(unidadeId?: number | null) {
  const { usuario } = useAuth();

  return useQuery({
    queryKey: ["senhas", "aguardando", usuario?.tenant_id ?? "sem-tenant", unidadeId ?? "todas"],
    queryFn: () => senhasService.listarAguardando(unidadeId)
  });
}

export function useSenhaPainel(unidadeId?: number | null, limite = 10, refetchInterval = 5000) {
  const { usuario } = useAuth();

  return useQuery({
    queryKey: ["senhas", "painel", usuario?.tenant_id ?? "sem-tenant", unidadeId ?? "todas", limite],
    queryFn: () => senhasService.painel(unidadeId, limite),
    refetchInterval,
    refetchIntervalInBackground: true
  });
}

export function useSenhaAtual(unidadeId?: number | null) {
  const { usuario } = useAuth();

  return useQuery({
    queryKey: ["senhas", "atual", usuario?.tenant_id ?? "sem-tenant", unidadeId ?? "todas"],
    queryFn: () => senhasService.atual(unidadeId),
    refetchInterval: 5000,
    refetchIntervalInBackground: true
  });
}

export function useSenhasConfig() {
  const { usuario } = useAuth();

  return useQuery({
    queryKey: ["senhas", "config", usuario?.tenant_id ?? "sem-tenant"],
    queryFn: () => senhasService.obterConfig()
  });
}

export function useEmitirSenha() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SenhaEmitirRequest) => senhasService.emitir(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["senhas", "aguardando"] });
      await queryClient.invalidateQueries({ queryKey: ["senhas", "painel"] });
    }
  });
}

export function useChamarSenha() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SenhaChamarRequest) => senhasService.chamar(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["senhas", "aguardando"] });
      await queryClient.invalidateQueries({ queryKey: ["senhas", "painel"] });
      await queryClient.invalidateQueries({ queryKey: ["senhas", "atual"] });
    }
  });
}

export function useFinalizarSenha() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SenhaFinalizarRequest) => senhasService.finalizar(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["senhas", "aguardando"] });
      await queryClient.invalidateQueries({ queryKey: ["senhas", "painel"] });
      await queryClient.invalidateQueries({ queryKey: ["senhas", "atual"] });
    }
  });
}

export function useFinalizarSenhaFila() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (filaId: number) => senhasService.finalizarFila(filaId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["senhas", "aguardando"] });
      await queryClient.invalidateQueries({ queryKey: ["senhas", "painel"] });
      await queryClient.invalidateQueries({ queryKey: ["senhas", "atual"] });
    }
  });
}

export function useAtualizarSenhasConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SenhasConfigRequest) => senhasService.atualizarConfig(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["senhas", "config"] });
    }
  });
}
