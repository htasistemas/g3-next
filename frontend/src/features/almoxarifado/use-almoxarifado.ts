import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { almoxarifadoService } from "@/services/almoxarifado.service";
import type { ItemAlmoxarifado, MovimentacaoAlmoxarifado } from "@/types/almoxarifado";

export function useItensAlmoxarifado() {
  return useQuery({
    queryKey: ["almoxarifado", "itens"],
    queryFn: () => almoxarifadoService.listarItens()
  });
}

export function useMovimentacoesAlmoxarifado() {
  return useQuery({
    queryKey: ["almoxarifado", "movimentacoes"],
    queryFn: () => almoxarifadoService.listarMovimentacoes()
  });
}

export function useProximoCodigoAlmoxarifado() {
  return useQuery({
    queryKey: ["almoxarifado", "proximo-codigo"],
    queryFn: () => almoxarifadoService.obterProximoCodigo()
  });
}

export function useSalvarItemAlmoxarifado() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ItemAlmoxarifado) => {
      if (payload.id_item) {
        return almoxarifadoService.atualizarItem(payload.id_item, payload);
      }
      return almoxarifadoService.criarItem(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["almoxarifado", "itens"] });
      await queryClient.invalidateQueries({ queryKey: ["almoxarifado", "proximo-codigo"] });
    }
  });
}

export function useRemoverItemAlmoxarifado() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => almoxarifadoService.removerItem(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["almoxarifado", "itens"] });
      await queryClient.invalidateQueries({ queryKey: ["almoxarifado", "movimentacoes"] });
    }
  });
}

export function useRegistrarMovimentacaoAlmoxarifado() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: MovimentacaoAlmoxarifado) => almoxarifadoService.registrarMovimentacao(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["almoxarifado", "itens"] });
      await queryClient.invalidateQueries({ queryKey: ["almoxarifado", "movimentacoes"] });
    }
  });
}
