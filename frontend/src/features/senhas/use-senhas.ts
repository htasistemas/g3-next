import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { senhasService } from "@/services/senhas.service";
import type {
  SenhaChamarRequest,
  SenhaEmitirRequest,
  SenhaFinalizarRequest,
  SenhasConfigRequest
} from "@/types/senhas";

export function useSenhasAguardando(unidadeId?: number | null) {
  return useQuery({
    queryKey: ["senhas", "aguardando", unidadeId ?? "todas"],
    queryFn: () => senhasService.listarAguardando(unidadeId)
  });
}

export function useSenhaPainel(unidadeId?: number | null, limite = 10, refetchInterval = 5000) {
  return useQuery({
    queryKey: ["senhas", "painel", unidadeId ?? "todas", limite],
    queryFn: () => senhasService.painel(unidadeId, limite),
    refetchInterval,
    refetchIntervalInBackground: true
  });
}

export function useSenhaAtual(unidadeId?: number | null) {
  return useQuery({
    queryKey: ["senhas", "atual", unidadeId ?? "todas"],
    queryFn: () => senhasService.atual(unidadeId),
    refetchInterval: 5000,
    refetchIntervalInBackground: true
  });
}

export function useSenhasConfig() {
  return useQuery({
    queryKey: ["senhas", "config"],
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
