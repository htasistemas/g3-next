import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { autorizacaoComprasService } from "@/services/autorizacao-compras.service";
import type {
  AutorizacaoCompraPayload,
  AutorizacaoCotacaoPayload,
  AutorizacaoPagamentoPayload,
  ReservaBancariaPayload
} from "@/types/autorizacao-compras";

export function useAutorizacoesCompras() {
  return useQuery({
    queryKey: ["autorizacao-compras", "lista"],
    queryFn: () => autorizacaoComprasService.listar()
  });
}

export function useCotacoesAutorizacao(autorizacaoId?: string | number) {
  return useQuery({
    queryKey: ["autorizacao-compras", "cotacoes", autorizacaoId],
    queryFn: () => autorizacaoComprasService.listarCotacoes(autorizacaoId as string),
    enabled: !!autorizacaoId
  });
}

export function useReservasAutorizacao(autorizacaoId?: string | number) {
  return useQuery({
    queryKey: ["autorizacao-compras", "reservas", autorizacaoId],
    queryFn: () => autorizacaoComprasService.listarReservas(autorizacaoId as string),
    enabled: !!autorizacaoId
  });
}

export function useSalvarAutorizacaoCompra() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id?: string; payload: AutorizacaoCompraPayload }) => {
      if (id) return autorizacaoComprasService.atualizar(id, payload);
      return autorizacaoComprasService.criar(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["autorizacao-compras", "lista"] });
    }
  });
}

export function useExcluirAutorizacaoCompra() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => autorizacaoComprasService.excluir(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["autorizacao-compras", "lista"] });
    }
  });
}

export function useCriarCotacaoAutorizacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AutorizacaoCotacaoPayload }) =>
      autorizacaoComprasService.criarCotacao(id, payload),
    onSuccess: async (_response, vars) => {
      await queryClient.invalidateQueries({
        queryKey: ["autorizacao-compras", "cotacoes", vars.id]
      });
      await queryClient.invalidateQueries({ queryKey: ["autorizacao-compras", "lista"] });
    }
  });
}

export function useExcluirCotacaoAutorizacao(autorizacaoId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (cotacaoId: string) =>
      autorizacaoComprasService.excluirCotacao(autorizacaoId as string, cotacaoId),
    onSuccess: async () => {
      if (autorizacaoId) {
        await queryClient.invalidateQueries({
          queryKey: ["autorizacao-compras", "cotacoes", autorizacaoId]
        });
      }
      await queryClient.invalidateQueries({ queryKey: ["autorizacao-compras", "lista"] });
    }
  });
}

export function useRegistrarReservaAutorizacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ReservaBancariaPayload }) =>
      autorizacaoComprasService.registrarReservaBancaria(id, payload),
    onSuccess: async (_response, vars) => {
      await queryClient.invalidateQueries({
        queryKey: ["autorizacao-compras", "reservas", vars.id]
      });
      await queryClient.invalidateQueries({ queryKey: ["autorizacao-compras", "lista"] });
    }
  });
}

export function useRemoverReservaAutorizacao(autorizacaoId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (contaId: number) =>
      autorizacaoComprasService.removerReservaBancaria(autorizacaoId as string, contaId),
    onSuccess: async () => {
      if (autorizacaoId) {
        await queryClient.invalidateQueries({
          queryKey: ["autorizacao-compras", "reservas", autorizacaoId]
        });
      }
      await queryClient.invalidateQueries({ queryKey: ["autorizacao-compras", "lista"] });
    }
  });
}

export function useGerarAutorizacaoPagamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AutorizacaoPagamentoPayload }) =>
      autorizacaoComprasService.gerarAutorizacaoPagamento(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["autorizacao-compras", "lista"] });
    }
  });
}
