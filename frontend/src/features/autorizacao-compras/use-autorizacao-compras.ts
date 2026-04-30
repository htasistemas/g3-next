import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { arquivosService } from "@/services/arquivos.service";
import { autorizacaoComprasService } from "@/services/autorizacao-compras.service";
import type {
  AprovacaoCompraPayload,
  AutorizacaoCompraPayload,
  AutorizacaoCotacaoPayload,
  AutorizacaoPagamentoPayload,
  EscolhaFornecedorPayload,
  ReservaBancariaPayload
} from "@/types/autorizacao-compras";

export function useAutorizacoesCompras() {
  const { usuario } = useAuth();
  return useQuery({
    queryKey: ["autorizacao-compras", "lista", usuario?.tenant_id ?? "sem-tenant"],
    queryFn: () => autorizacaoComprasService.listar()
  });
}

export function usePainelAutorizacoesCompras() {
  const { usuario } = useAuth();
  return useQuery({
    queryKey: ["autorizacao-compras", "indicadores", usuario?.tenant_id ?? "sem-tenant"],
    queryFn: () => autorizacaoComprasService.listarIndicadores()
  });
}

export function useSetoresSolicitantesAutorizacao() {
  const { usuario } = useAuth();
  return useQuery({
    queryKey: ["autorizacao-compras", "catalogo", "setores-solicitantes", usuario?.tenant_id ?? "sem-tenant"],
    queryFn: () => autorizacaoComprasService.listarSetoresSolicitantes()
  });
}

export function useDetalheAutorizacaoCompra(autorizacaoId?: string | number) {
  const { usuario } = useAuth();
  return useQuery({
    queryKey: ["autorizacao-compras", "detalhe", usuario?.tenant_id ?? "sem-tenant", autorizacaoId],
    queryFn: () => autorizacaoComprasService.buscarDetalhe(autorizacaoId as string),
    enabled: !!autorizacaoId
  });
}

export function useArquivosAutorizacaoCompra(autorizacaoId?: string | number) {
  const { usuario } = useAuth();
  return useQuery({
    queryKey: ["autorizacao-compras", "arquivos", usuario?.tenant_id ?? "sem-tenant", autorizacaoId],
    queryFn: () => arquivosService.listarPorCompra(autorizacaoId as string),
    enabled: !!autorizacaoId
  });
}

async function invalidarDetalhe(
  queryClient: ReturnType<typeof useQueryClient>,
  tenantId: string,
  id?: string | number
) {
  await queryClient.invalidateQueries({ queryKey: ["autorizacao-compras", "lista", tenantId] });
  await queryClient.invalidateQueries({ queryKey: ["autorizacao-compras", "indicadores", tenantId] });
  if (id) {
    await queryClient.invalidateQueries({ queryKey: ["autorizacao-compras", "detalhe", tenantId, id] });
    await queryClient.invalidateQueries({ queryKey: ["autorizacao-compras", "arquivos", tenantId, id] });
    await queryClient.invalidateQueries({ queryKey: ["autorizacao-compras", "cotacoes", tenantId, id] });
    await queryClient.invalidateQueries({ queryKey: ["autorizacao-compras", "reservas", tenantId, id] });
  }
}

export function useSalvarAutorizacaoCompra() {
  const { usuario } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id?: string; payload: AutorizacaoCompraPayload }) => {
      if (id) return autorizacaoComprasService.atualizar(id, payload);
      return autorizacaoComprasService.criar(payload);
    },
    onSuccess: async (response) => {
      await invalidarDetalhe(queryClient, usuario?.tenant_id ?? "sem-tenant", response.id);
    }
  });
}

export function useExcluirAutorizacaoCompra() {
  const { usuario } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => autorizacaoComprasService.excluir(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["autorizacao-compras", "lista", usuario?.tenant_id ?? "sem-tenant"]
      });
    }
  });
}

export function useEnviarAutorizacaoParaAprovacao() {
  const { usuario } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => autorizacaoComprasService.enviarParaAprovacao(id),
    onSuccess: async (response) => {
      await invalidarDetalhe(queryClient, usuario?.tenant_id ?? "sem-tenant", response.id);
    }
  });
}

export function useRegistrarAprovacaoCompra() {
  const { usuario } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AprovacaoCompraPayload }) =>
      autorizacaoComprasService.registrarAprovacao(id, payload),
    onSuccess: async (response) => {
      await invalidarDetalhe(queryClient, usuario?.tenant_id ?? "sem-tenant", response.id);
    }
  });
}

export function useCotacoesAutorizacao(autorizacaoId?: string | number) {
  const { usuario } = useAuth();
  return useQuery({
    queryKey: ["autorizacao-compras", "cotacoes", usuario?.tenant_id ?? "sem-tenant", autorizacaoId],
    queryFn: () => autorizacaoComprasService.listarCotacoes(autorizacaoId as string),
    enabled: !!autorizacaoId
  });
}

export function useCriarCotacaoAutorizacao() {
  const { usuario } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AutorizacaoCotacaoPayload }) =>
      autorizacaoComprasService.criarCotacao(id, payload),
    onSuccess: async (_response, vars) => {
      await invalidarDetalhe(queryClient, usuario?.tenant_id ?? "sem-tenant", vars.id);
    }
  });
}

export function useExcluirCotacaoAutorizacao(autorizacaoId?: string) {
  const { usuario } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (cotacaoId: string) =>
      autorizacaoComprasService.excluirCotacao(autorizacaoId as string, cotacaoId),
    onSuccess: async () => {
      await invalidarDetalhe(queryClient, usuario?.tenant_id ?? "sem-tenant", autorizacaoId);
    }
  });
}

export function useDefinirFornecedorAutorizacao() {
  const { usuario } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: EscolhaFornecedorPayload }) =>
      autorizacaoComprasService.definirFornecedor(id, payload),
    onSuccess: async (response) => {
      await invalidarDetalhe(queryClient, usuario?.tenant_id ?? "sem-tenant", response.id);
    }
  });
}

export function useReservasAutorizacao(autorizacaoId?: string | number) {
  const { usuario } = useAuth();
  return useQuery({
    queryKey: ["autorizacao-compras", "reservas", usuario?.tenant_id ?? "sem-tenant", autorizacaoId],
    queryFn: () => autorizacaoComprasService.listarReservas(autorizacaoId as string),
    enabled: !!autorizacaoId
  });
}

export function useRegistrarReservaAutorizacao() {
  const { usuario } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ReservaBancariaPayload }) =>
      autorizacaoComprasService.registrarReservaBancaria(id, payload),
    onSuccess: async (_response, vars) => {
      await invalidarDetalhe(queryClient, usuario?.tenant_id ?? "sem-tenant", vars.id);
    }
  });
}

export function useRemoverReservaAutorizacao(autorizacaoId?: string) {
  const { usuario } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reservaId: number | string) =>
      autorizacaoComprasService.removerReservaBancaria(autorizacaoId as string, reservaId),
    onSuccess: async () => {
      await invalidarDetalhe(queryClient, usuario?.tenant_id ?? "sem-tenant", autorizacaoId);
    }
  });
}

export function useGerarAutorizacaoPagamento() {
  const { usuario } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AutorizacaoPagamentoPayload }) =>
      autorizacaoComprasService.gerarAutorizacaoPagamento(id, payload),
    onSuccess: async (response) => {
      await invalidarDetalhe(queryClient, usuario?.tenant_id ?? "sem-tenant", response.id);
    }
  });
}

export function useUploadArquivoAutorizacaoCompra(autorizacaoId?: string) {
  const { usuario } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ arquivo, observacao }: { arquivo: File; observacao?: string }) =>
      arquivosService.uploadParaCompra(autorizacaoId as string, arquivo, observacao),
    onSuccess: async () => {
      await invalidarDetalhe(queryClient, usuario?.tenant_id ?? "sem-tenant", autorizacaoId);
    }
  });
}

export function useExcluirArquivoAutorizacaoCompra(autorizacaoId?: string) {
  const { usuario } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (arquivoId: string | number) => arquivosService.excluir(arquivoId),
    onSuccess: async () => {
      await invalidarDetalhe(queryClient, usuario?.tenant_id ?? "sem-tenant", autorizacaoId);
    }
  });
}
