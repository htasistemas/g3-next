import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { arquivosService } from '@/services/arquivos.service';
import { contabilidadeService } from '@/services/contabilidade.service';
import { useAuth } from '@/hooks/use-auth';
import type {
  CategoriaFinanceiraPayload,
  CentroCustoPayload,
  ConciliacaoFinanceiraPayload,
  ContaBancariaPayload,
  EmendaImpositivaPayload,
  FechamentoMensalPayload,
  LancamentoFinanceiroBaixaPayload,
  LancamentoFinanceiroPayload,
  MovimentacaoFinanceiraPayload,
  RemocaoLancamentoFinanceiroPayload,
  TransferenciaFinanceiraPayload
} from '@/types/contabilidade';

const baseKey = (tenantId: string) => ['contabilidade', tenantId] as const;

type QueryOptions = {
  enabled?: boolean;
};

async function invalidarTudoContabilidade(queryClient: ReturnType<typeof useQueryClient>, tenantId: string) {
  await queryClient.invalidateQueries({ queryKey: baseKey(tenantId) });
}

export function useContasBancarias(options?: QueryOptions) {
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? 'sem-tenant';
  return useQuery({
    queryKey: [...baseKey(tenantId), 'contas-bancarias'],
    queryFn: () => contabilidadeService.listarContasBancarias(),
    enabled: options?.enabled ?? true
  });
}

export function useCategoriasFinanceiras(options?: QueryOptions) {
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? 'sem-tenant';
  return useQuery({
    queryKey: [...baseKey(tenantId), 'categorias'],
    queryFn: () => contabilidadeService.listarCategorias(),
    enabled: options?.enabled ?? true
  });
}

export function useCentrosCustoContabeis(options?: QueryOptions) {
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? 'sem-tenant';
  return useQuery({
    queryKey: [...baseKey(tenantId), 'centros-custo'],
    queryFn: () => contabilidadeService.listarCentrosCusto(),
    enabled: options?.enabled ?? true
  });
}

export function useLancamentosContabeis(options?: QueryOptions) {
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? 'sem-tenant';
  return useQuery({
    queryKey: [...baseKey(tenantId), 'lancamentos'],
    queryFn: () => contabilidadeService.listarLancamentos(),
    enabled: options?.enabled ?? true
  });
}

export function useMovimentacoesContabeis(options?: QueryOptions) {
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? 'sem-tenant';
  return useQuery({
    queryKey: [...baseKey(tenantId), 'movimentacoes'],
    queryFn: () => contabilidadeService.listarMovimentacoes(),
    enabled: options?.enabled ?? true
  });
}

export function useTransferenciasContabeis(options?: QueryOptions) {
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? 'sem-tenant';
  return useQuery({
    queryKey: [...baseKey(tenantId), 'transferencias'],
    queryFn: () => contabilidadeService.listarTransferencias(),
    enabled: options?.enabled ?? true
  });
}

export function useConciliacoesContabeis(options?: QueryOptions) {
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? 'sem-tenant';
  return useQuery({
    queryKey: [...baseKey(tenantId), 'conciliacoes'],
    queryFn: () => contabilidadeService.listarConciliacoes(),
    enabled: options?.enabled ?? true
  });
}

export function useHistoricoContabil(options?: QueryOptions) {
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? 'sem-tenant';
  return useQuery({
    queryKey: [...baseKey(tenantId), 'historico'],
    queryFn: () => contabilidadeService.listarHistorico(),
    enabled: options?.enabled ?? true
  });
}

export function useFechamentosMensaisContabeis(options?: QueryOptions) {
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? 'sem-tenant';
  return useQuery({
    queryKey: [...baseKey(tenantId), 'fechamentos-mensais'],
    queryFn: () => contabilidadeService.listarFechamentosMensais(),
    enabled: options?.enabled ?? true
  });
}

export function useComprasIntegradasContabilidade(options?: QueryOptions) {
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? 'sem-tenant';
  return useQuery({
    queryKey: [...baseKey(tenantId), 'compras-integradas'],
    queryFn: () => contabilidadeService.listarComprasIntegradas(),
    enabled: options?.enabled ?? true
  });
}

export function useEmendasContabeis(options?: QueryOptions) {
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? 'sem-tenant';
  return useQuery({
    queryKey: [...baseKey(tenantId), 'emendas'],
    queryFn: () => contabilidadeService.listarEmendas(),
    enabled: options?.enabled ?? true
  });
}

export function useFecharMesContabil() {
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? 'sem-tenant';
  return useMutation({
    mutationFn: (payload: FechamentoMensalPayload) => contabilidadeService.fecharMes(payload),
    onSuccess: async () => invalidarTudoContabilidade(queryClient, tenantId)
  });
}

export function useArquivosLancamentoContabil(lancamentoId?: string | number) {
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? 'sem-tenant';
  return useQuery({
    queryKey: [...baseKey(tenantId), 'arquivos', lancamentoId],
    queryFn: () => arquivosService.listarPorLancamentoContabil(lancamentoId as string),
    enabled: !!lancamentoId
  });
}

export function useSalvarContaBancaria() {
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? 'sem-tenant';
  return useMutation({
    mutationFn: async ({ id, payload }: { id?: number; payload: ContaBancariaPayload }) => {
      if (id) {
        return contabilidadeService.atualizarContaBancaria(id, payload);
      }
      return contabilidadeService.criarContaBancaria(payload);
    },
    onSuccess: async () => invalidarTudoContabilidade(queryClient, tenantId)
  });
}

export function useRemoverContaBancaria() {
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? 'sem-tenant';
  return useMutation({
    mutationFn: (id: number) => contabilidadeService.removerContaBancaria(id),
    onSuccess: async () => invalidarTudoContabilidade(queryClient, tenantId)
  });
}

export function useSalvarCategoriaFinanceira() {
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? 'sem-tenant';
  return useMutation({
    mutationFn: async ({ id, payload }: { id?: number; payload: CategoriaFinanceiraPayload }) => {
      if (id) {
        return contabilidadeService.atualizarCategoria(id, payload);
      }
      return contabilidadeService.criarCategoria(payload);
    },
    onSuccess: async () => invalidarTudoContabilidade(queryClient, tenantId)
  });
}

export function useRemoverCategoriaFinanceira() {
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? 'sem-tenant';
  return useMutation({
    mutationFn: (id: number) => contabilidadeService.removerCategoria(id),
    onSuccess: async () => invalidarTudoContabilidade(queryClient, tenantId)
  });
}

export function useSalvarCentroCustoContabil() {
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? 'sem-tenant';
  return useMutation({
    mutationFn: async ({ id, payload }: { id?: number; payload: CentroCustoPayload }) => {
      if (id) {
        return contabilidadeService.atualizarCentroCusto(id, payload);
      }
      return contabilidadeService.criarCentroCusto(payload);
    },
    onSuccess: async () => invalidarTudoContabilidade(queryClient, tenantId)
  });
}

export function useRemoverCentroCustoContabil() {
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? 'sem-tenant';
  return useMutation({
    mutationFn: (id: number) => contabilidadeService.removerCentroCusto(id),
    onSuccess: async () => invalidarTudoContabilidade(queryClient, tenantId)
  });
}

export function useSalvarLancamentoContabil() {
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? 'sem-tenant';
  return useMutation({
    mutationFn: async ({ id, payload }: { id?: number; payload: LancamentoFinanceiroPayload }) => {
      if (id) {
        return contabilidadeService.atualizarLancamento(id, payload);
      }
      return contabilidadeService.criarLancamento(payload);
    },
    onSuccess: async () => invalidarTudoContabilidade(queryClient, tenantId)
  });
}

export function useRemoverLancamentoContabil() {
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? 'sem-tenant';
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: RemocaoLancamentoFinanceiroPayload }) =>
      contabilidadeService.removerLancamento(id, payload),
    onSuccess: async () => invalidarTudoContabilidade(queryClient, tenantId)
  });
}

export function useAtualizarSituacaoLancamento() {
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? 'sem-tenant';
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      contabilidadeService.atualizarSituacaoLancamento(id, status),
    onSuccess: async () => invalidarTudoContabilidade(queryClient, tenantId)
  });
}

export function usePagarLancamento() {
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? 'sem-tenant';
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: LancamentoFinanceiroBaixaPayload }) =>
      contabilidadeService.pagarLancamento(id, payload),
    onSuccess: async () => invalidarTudoContabilidade(queryClient, tenantId)
  });
}

export function useEstornarLancamento() {
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? 'sem-tenant';
  return useMutation({
    mutationFn: (id: number) => contabilidadeService.estornarLancamento(id),
    onSuccess: async () => invalidarTudoContabilidade(queryClient, tenantId)
  });
}

export function useSalvarMovimentacaoContabil() {
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? 'sem-tenant';
  return useMutation({
    mutationFn: async ({ id, payload }: { id?: number; payload: MovimentacaoFinanceiraPayload }) => {
      if (id) {
        return contabilidadeService.atualizarMovimentacao(id, payload);
      }
      return contabilidadeService.criarMovimentacao(payload);
    },
    onSuccess: async () => invalidarTudoContabilidade(queryClient, tenantId)
  });
}

export function useRemoverMovimentacaoContabil() {
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? 'sem-tenant';
  return useMutation({
    mutationFn: (id: number) => contabilidadeService.removerMovimentacao(id),
    onSuccess: async () => invalidarTudoContabilidade(queryClient, tenantId)
  });
}

export function useCriarTransferenciaContabil() {
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? 'sem-tenant';
  return useMutation({
    mutationFn: (payload: TransferenciaFinanceiraPayload) =>
      contabilidadeService.criarTransferencia(payload),
    onSuccess: async () => invalidarTudoContabilidade(queryClient, tenantId)
  });
}

export function useEstornarTransferenciaContabil() {
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? 'sem-tenant';
  return useMutation({
    mutationFn: (id: number) => contabilidadeService.estornarTransferencia(id),
    onSuccess: async () => invalidarTudoContabilidade(queryClient, tenantId)
  });
}

export function useCriarConciliacaoContabil() {
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? 'sem-tenant';
  return useMutation({
    mutationFn: (payload: ConciliacaoFinanceiraPayload) =>
      contabilidadeService.criarConciliacao(payload),
    onSuccess: async () => invalidarTudoContabilidade(queryClient, tenantId)
  });
}

export function useAtualizarSituacaoConciliacao() {
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? 'sem-tenant';
  return useMutation({
    mutationFn: ({ id, situacao }: { id: number; situacao: string }) =>
      contabilidadeService.atualizarSituacaoConciliacao(id, situacao),
    onSuccess: async () => invalidarTudoContabilidade(queryClient, tenantId)
  });
}

export function useGerarObrigacaoFinanceiraCompra() {
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? 'sem-tenant';
  return useMutation({
    mutationFn: (compraId: number) => contabilidadeService.gerarObrigacaoFinanceiraPorCompra(compraId),
    onSuccess: async () => invalidarTudoContabilidade(queryClient, tenantId)
  });
}

export function useCriarEmendaContabil() {
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? 'sem-tenant';
  return useMutation({
    mutationFn: (payload: EmendaImpositivaPayload) => contabilidadeService.criarEmenda(payload),
    onSuccess: async () => invalidarTudoContabilidade(queryClient, tenantId)
  });
}

export function useAtualizarStatusEmendaContabil() {
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? 'sem-tenant';
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      contabilidadeService.atualizarStatusEmenda(id, status),
    onSuccess: async () => invalidarTudoContabilidade(queryClient, tenantId)
  });
}

export function useUploadArquivoLancamentoContabil(lancamentoId?: number) {
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? 'sem-tenant';
  return useMutation({
    mutationFn: ({ arquivo, observacao }: { arquivo: File; observacao?: string }) =>
      arquivosService.uploadParaLancamentoContabil(lancamentoId as number, arquivo, observacao),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [...baseKey(tenantId), 'arquivos', lancamentoId] });
    }
  });
}

export function useExcluirArquivoLancamentoContabil(lancamentoId?: number) {
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? 'sem-tenant';
  return useMutation({
    mutationFn: (arquivoId: number) => arquivosService.excluir(arquivoId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [...baseKey(tenantId), 'arquivos', lancamentoId] });
    }
  });
}
