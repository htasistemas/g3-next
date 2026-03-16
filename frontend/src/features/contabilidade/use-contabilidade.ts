import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { arquivosService } from '@/services/arquivos.service';
import { contabilidadeService } from '@/services/contabilidade.service';
import type {
  CategoriaFinanceiraPayload,
  CentroCustoPayload,
  ConciliacaoFinanceiraPayload,
  ContaBancariaPayload,
  EmendaImpositivaPayload,
  LancamentoFinanceiroBaixaPayload,
  LancamentoFinanceiroPayload,
  MovimentacaoFinanceiraPayload,
  TransferenciaFinanceiraPayload
} from '@/types/contabilidade';

const baseKey = ['contabilidade'] as const;

type QueryOptions = {
  enabled?: boolean;
};

async function invalidarTudoContabilidade(queryClient: ReturnType<typeof useQueryClient>) {
  await queryClient.invalidateQueries({ queryKey: baseKey });
}

export function useContasBancarias(options?: QueryOptions) {
  return useQuery({
    queryKey: [...baseKey, 'contas-bancarias'],
    queryFn: () => contabilidadeService.listarContasBancarias(),
    enabled: options?.enabled ?? true
  });
}

export function useCategoriasFinanceiras(options?: QueryOptions) {
  return useQuery({
    queryKey: [...baseKey, 'categorias'],
    queryFn: () => contabilidadeService.listarCategorias(),
    enabled: options?.enabled ?? true
  });
}

export function useCentrosCustoContabeis(options?: QueryOptions) {
  return useQuery({
    queryKey: [...baseKey, 'centros-custo'],
    queryFn: () => contabilidadeService.listarCentrosCusto(),
    enabled: options?.enabled ?? true
  });
}

export function useLancamentosContabeis(options?: QueryOptions) {
  return useQuery({
    queryKey: [...baseKey, 'lancamentos'],
    queryFn: () => contabilidadeService.listarLancamentos(),
    enabled: options?.enabled ?? true
  });
}

export function useMovimentacoesContabeis(options?: QueryOptions) {
  return useQuery({
    queryKey: [...baseKey, 'movimentacoes'],
    queryFn: () => contabilidadeService.listarMovimentacoes(),
    enabled: options?.enabled ?? true
  });
}

export function useTransferenciasContabeis(options?: QueryOptions) {
  return useQuery({
    queryKey: [...baseKey, 'transferencias'],
    queryFn: () => contabilidadeService.listarTransferencias(),
    enabled: options?.enabled ?? true
  });
}

export function useConciliacoesContabeis(options?: QueryOptions) {
  return useQuery({
    queryKey: [...baseKey, 'conciliacoes'],
    queryFn: () => contabilidadeService.listarConciliacoes(),
    enabled: options?.enabled ?? true
  });
}

export function useHistoricoContabil(options?: QueryOptions) {
  return useQuery({
    queryKey: [...baseKey, 'historico'],
    queryFn: () => contabilidadeService.listarHistorico(),
    enabled: options?.enabled ?? true
  });
}

export function useComprasIntegradasContabilidade(options?: QueryOptions) {
  return useQuery({
    queryKey: [...baseKey, 'compras-integradas'],
    queryFn: () => contabilidadeService.listarComprasIntegradas(),
    enabled: options?.enabled ?? true
  });
}

export function useEmendasContabeis(options?: QueryOptions) {
  return useQuery({
    queryKey: [...baseKey, 'emendas'],
    queryFn: () => contabilidadeService.listarEmendas(),
    enabled: options?.enabled ?? true
  });
}

export function useArquivosLancamentoContabil(lancamentoId?: string | number) {
  return useQuery({
    queryKey: [...baseKey, 'arquivos', lancamentoId],
    queryFn: () => arquivosService.listarPorLancamentoContabil(lancamentoId as string),
    enabled: !!lancamentoId
  });
}

export function useSalvarContaBancaria() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id?: number; payload: ContaBancariaPayload }) => {
      if (id) {
        return contabilidadeService.atualizarContaBancaria(id, payload);
      }
      return contabilidadeService.criarContaBancaria(payload);
    },
    onSuccess: async () => invalidarTudoContabilidade(queryClient)
  });
}

export function useRemoverContaBancaria() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => contabilidadeService.removerContaBancaria(id),
    onSuccess: async () => invalidarTudoContabilidade(queryClient)
  });
}

export function useSalvarCategoriaFinanceira() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id?: number; payload: CategoriaFinanceiraPayload }) => {
      if (id) {
        return contabilidadeService.atualizarCategoria(id, payload);
      }
      return contabilidadeService.criarCategoria(payload);
    },
    onSuccess: async () => invalidarTudoContabilidade(queryClient)
  });
}

export function useRemoverCategoriaFinanceira() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => contabilidadeService.removerCategoria(id),
    onSuccess: async () => invalidarTudoContabilidade(queryClient)
  });
}

export function useSalvarCentroCustoContabil() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id?: number; payload: CentroCustoPayload }) => {
      if (id) {
        return contabilidadeService.atualizarCentroCusto(id, payload);
      }
      return contabilidadeService.criarCentroCusto(payload);
    },
    onSuccess: async () => invalidarTudoContabilidade(queryClient)
  });
}

export function useRemoverCentroCustoContabil() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => contabilidadeService.removerCentroCusto(id),
    onSuccess: async () => invalidarTudoContabilidade(queryClient)
  });
}

export function useSalvarLancamentoContabil() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id?: number; payload: LancamentoFinanceiroPayload }) => {
      if (id) {
        return contabilidadeService.atualizarLancamento(id, payload);
      }
      return contabilidadeService.criarLancamento(payload);
    },
    onSuccess: async () => invalidarTudoContabilidade(queryClient)
  });
}

export function useRemoverLancamentoContabil() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => contabilidadeService.removerLancamento(id),
    onSuccess: async () => invalidarTudoContabilidade(queryClient)
  });
}

export function useAtualizarSituacaoLancamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      contabilidadeService.atualizarSituacaoLancamento(id, status),
    onSuccess: async () => invalidarTudoContabilidade(queryClient)
  });
}

export function usePagarLancamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: LancamentoFinanceiroBaixaPayload }) =>
      contabilidadeService.pagarLancamento(id, payload),
    onSuccess: async () => invalidarTudoContabilidade(queryClient)
  });
}

export function useEstornarLancamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => contabilidadeService.estornarLancamento(id),
    onSuccess: async () => invalidarTudoContabilidade(queryClient)
  });
}

export function useSalvarMovimentacaoContabil() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id?: number; payload: MovimentacaoFinanceiraPayload }) => {
      if (id) {
        return contabilidadeService.atualizarMovimentacao(id, payload);
      }
      return contabilidadeService.criarMovimentacao(payload);
    },
    onSuccess: async () => invalidarTudoContabilidade(queryClient)
  });
}

export function useRemoverMovimentacaoContabil() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => contabilidadeService.removerMovimentacao(id),
    onSuccess: async () => invalidarTudoContabilidade(queryClient)
  });
}

export function useCriarTransferenciaContabil() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: TransferenciaFinanceiraPayload) =>
      contabilidadeService.criarTransferencia(payload),
    onSuccess: async () => invalidarTudoContabilidade(queryClient)
  });
}

export function useEstornarTransferenciaContabil() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => contabilidadeService.estornarTransferencia(id),
    onSuccess: async () => invalidarTudoContabilidade(queryClient)
  });
}

export function useCriarConciliacaoContabil() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ConciliacaoFinanceiraPayload) =>
      contabilidadeService.criarConciliacao(payload),
    onSuccess: async () => invalidarTudoContabilidade(queryClient)
  });
}

export function useAtualizarSituacaoConciliacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, situacao }: { id: number; situacao: string }) =>
      contabilidadeService.atualizarSituacaoConciliacao(id, situacao),
    onSuccess: async () => invalidarTudoContabilidade(queryClient)
  });
}

export function useGerarObrigacaoFinanceiraCompra() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (compraId: number) => contabilidadeService.gerarObrigacaoFinanceiraPorCompra(compraId),
    onSuccess: async () => invalidarTudoContabilidade(queryClient)
  });
}

export function useCriarEmendaContabil() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: EmendaImpositivaPayload) => contabilidadeService.criarEmenda(payload),
    onSuccess: async () => invalidarTudoContabilidade(queryClient)
  });
}

export function useAtualizarStatusEmendaContabil() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      contabilidadeService.atualizarStatusEmenda(id, status),
    onSuccess: async () => invalidarTudoContabilidade(queryClient)
  });
}

export function useUploadArquivoLancamentoContabil(lancamentoId?: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ arquivo, observacao }: { arquivo: File; observacao?: string }) =>
      arquivosService.uploadParaLancamentoContabil(lancamentoId as number, arquivo, observacao),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [...baseKey, 'arquivos', lancamentoId] });
    }
  });
}

export function useExcluirArquivoLancamentoContabil(lancamentoId?: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (arquivoId: number) => arquivosService.excluir(arquivoId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [...baseKey, 'arquivos', lancamentoId] });
    }
  });
}
