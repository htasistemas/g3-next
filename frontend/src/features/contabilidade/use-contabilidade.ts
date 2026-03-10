import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { contabilidadeService } from "@/services/contabilidade.service";
import type {
  ContaBancariaPayload,
  EmendaImpositivaPayload,
  LancamentoFinanceiroPayload,
  MovimentacaoFinanceiraPayload
} from "@/types/contabilidade";

export function useContasBancarias() {
  return useQuery({
    queryKey: ["contabilidade", "contas-bancarias"],
    queryFn: () => contabilidadeService.listarContasBancarias()
  });
}

export function useLancamentosContabeis() {
  return useQuery({
    queryKey: ["contabilidade", "lancamentos"],
    queryFn: () => contabilidadeService.listarLancamentos()
  });
}

export function useMovimentacoesContabeis() {
  return useQuery({
    queryKey: ["contabilidade", "movimentacoes"],
    queryFn: () => contabilidadeService.listarMovimentacoes()
  });
}

export function useEmendasContabeis() {
  return useQuery({
    queryKey: ["contabilidade", "emendas"],
    queryFn: () => contabilidadeService.listarEmendas()
  });
}

export function useSalvarContaBancaria() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id?: number; payload: ContaBancariaPayload }) => {
      if (id) return contabilidadeService.atualizarContaBancaria(id, payload);
      return contabilidadeService.criarContaBancaria(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["contabilidade", "contas-bancarias"] });
    }
  });
}

export function useRemoverContaBancaria() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => contabilidadeService.removerContaBancaria(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["contabilidade", "contas-bancarias"] });
      await queryClient.invalidateQueries({ queryKey: ["contabilidade", "movimentacoes"] });
    }
  });
}

export function useSalvarLancamentoContabil() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id?: number; payload: LancamentoFinanceiroPayload }) => {
      if (id) return contabilidadeService.atualizarLancamento(id, payload);
      return contabilidadeService.criarLancamento(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["contabilidade", "lancamentos"] });
    }
  });
}

export function useRemoverLancamentoContabil() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => contabilidadeService.removerLancamento(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["contabilidade", "lancamentos"] });
    }
  });
}

export function useAtualizarSituacaoLancamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      contabilidadeService.atualizarSituacaoLancamento(id, status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["contabilidade", "lancamentos"] });
    }
  });
}

export function usePagarLancamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, responsavel }: { id: number; responsavel?: string }) =>
      contabilidadeService.pagarLancamento(id, responsavel),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["contabilidade", "lancamentos"] });
    }
  });
}

export function useSalvarMovimentacaoContabil() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id?: number; payload: MovimentacaoFinanceiraPayload }) => {
      if (id) return contabilidadeService.atualizarMovimentacao(id, payload);
      return contabilidadeService.criarMovimentacao(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["contabilidade", "movimentacoes"] });
      await queryClient.invalidateQueries({ queryKey: ["contabilidade", "contas-bancarias"] });
    }
  });
}

export function useRemoverMovimentacaoContabil() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => contabilidadeService.removerMovimentacao(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["contabilidade", "movimentacoes"] });
      await queryClient.invalidateQueries({ queryKey: ["contabilidade", "contas-bancarias"] });
    }
  });
}

export function useCriarEmendaContabil() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: EmendaImpositivaPayload) => contabilidadeService.criarEmenda(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["contabilidade", "emendas"] });
    }
  });
}

export function useAtualizarStatusEmendaContabil() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      contabilidadeService.atualizarStatusEmenda(id, status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["contabilidade", "emendas"] });
    }
  });
}
