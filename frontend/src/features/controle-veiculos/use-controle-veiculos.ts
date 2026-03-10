import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { controleVeiculosService } from "@/services/controle-veiculos.service";
import type {
  MotoristaAutorizado,
  RegistroDiarioBordo,
  VeiculoCadastro
} from "@/types/controle-veiculos";

export function useVeiculos() {
  return useQuery({
    queryKey: ["controle-veiculos", "veiculos"],
    queryFn: () => controleVeiculosService.listarVeiculos()
  });
}

export function useDiarioBordo() {
  return useQuery({
    queryKey: ["controle-veiculos", "diario-bordo"],
    queryFn: () => controleVeiculosService.listarDiario()
  });
}

export function useMotoristasAutorizados(veiculoId?: number | null) {
  return useQuery({
    queryKey: ["controle-veiculos", "motoristas-autorizados", veiculoId ?? "todos"],
    queryFn: () => controleVeiculosService.listarMotoristasAutorizados(veiculoId)
  });
}

export function useMotoristasDisponiveis(nome?: string) {
  return useQuery({
    queryKey: ["controle-veiculos", "motoristas-disponiveis", nome ?? ""],
    queryFn: () => controleVeiculosService.listarMotoristasDisponiveis(nome),
    enabled: (nome?.trim().length ?? 0) >= 2
  });
}

export function useSalvarVeiculo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: VeiculoCadastro) => {
      if (payload.id) return controleVeiculosService.atualizarVeiculo(payload.id, payload);
      return controleVeiculosService.criarVeiculo(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["controle-veiculos", "veiculos"] });
    }
  });
}

export function useRemoverVeiculo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => controleVeiculosService.removerVeiculo(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["controle-veiculos"] });
    }
  });
}

export function useSalvarDiarioBordo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: RegistroDiarioBordo) => {
      if (payload.id) return controleVeiculosService.atualizarDiario(payload.id, payload);
      return controleVeiculosService.criarDiario(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["controle-veiculos", "diario-bordo"] });
    }
  });
}

export function useRemoverDiarioBordo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => controleVeiculosService.removerDiario(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["controle-veiculos", "diario-bordo"] });
    }
  });
}

export function useSalvarMotoristaAutorizado() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: MotoristaAutorizado) => {
      if (payload.id) {
        return controleVeiculosService.atualizarMotoristaAutorizado(payload.id, payload);
      }
      return controleVeiculosService.criarMotoristaAutorizado(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["controle-veiculos", "motoristas-autorizados"] });
    }
  });
}

export function useRemoverMotoristaAutorizado() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => controleVeiculosService.removerMotoristaAutorizado(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["controle-veiculos", "motoristas-autorizados"] });
    }
  });
}
