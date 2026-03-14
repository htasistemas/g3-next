import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

const listaKey = ["autorizacao-compras", "lista"] as const;

export function useAutorizacoesCompras() {
  return useQuery({
    queryKey: listaKey,
    queryFn: () => autorizacaoComprasService.listar()
  });
}

export function usePainelAutorizacoesCompras() {
  return useQuery({
    queryKey: ["autorizacao-compras", "indicadores"],
    queryFn: () => autorizacaoComprasService.listarIndicadores()
  });
}

export function useSetoresSolicitantesAutorizacao() {
  return useQuery({
    queryKey: ["autorizacao-compras", "catalogo", "setores-solicitantes"],
    queryFn: () => autorizacaoComprasService.listarSetoresSolicitantes()
  });
}

export function useDetalheAutorizacaoCompra(autorizacaoId?: string | number) {
  return useQuery({
    queryKey: ["autorizacao-compras", "detalhe", autorizacaoId],
    queryFn: () => autorizacaoComprasService.buscarDetalhe(autorizacaoId as string),
    enabled: !!autorizacaoId
  });
}

export function useArquivosAutorizacaoCompra(autorizacaoId?: string | number) {
  return useQuery({
    queryKey: ["autorizacao-compras", "arquivos", autorizacaoId],
    queryFn: () => arquivosService.listarPorCompra(autorizacaoId as string),
    enabled: !!autorizacaoId
  });
}

async function invalidarDetalhe(queryClient: ReturnType<typeof useQueryClient>, id?: string | number) {
  await queryClient.invalidateQueries({ queryKey: listaKey });
  await queryClient.invalidateQueries({ queryKey: ["autorizacao-compras", "indicadores"] });
  if (id) {
    await queryClient.invalidateQueries({ queryKey: ["autorizacao-compras", "detalhe", id] });
    await queryClient.invalidateQueries({ queryKey: ["autorizacao-compras", "arquivos", id] });
    await queryClient.invalidateQueries({ queryKey: ["autorizacao-compras", "cotacoes", id] });
    await queryClient.invalidateQueries({ queryKey: ["autorizacao-compras", "reservas", id] });
  }
}

export function useSalvarAutorizacaoCompra() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id?: string; payload: AutorizacaoCompraPayload }) => {
      if (id) return autorizacaoComprasService.atualizar(id, payload);
      return autorizacaoComprasService.criar(payload);
    },
    onSuccess: async (response) => {
      await invalidarDetalhe(queryClient, response.id);
    }
  });
}

export function useExcluirAutorizacaoCompra() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => autorizacaoComprasService.excluir(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: listaKey });
    }
  });
}

export function useEnviarAutorizacaoParaAprovacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => autorizacaoComprasService.enviarParaAprovacao(id),
    onSuccess: async (response) => {
      await invalidarDetalhe(queryClient, response.id);
    }
  });
}

export function useRegistrarAprovacaoCompra() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AprovacaoCompraPayload }) =>
      autorizacaoComprasService.registrarAprovacao(id, payload),
    onSuccess: async (response) => {
      await invalidarDetalhe(queryClient, response.id);
    }
  });
}

export function useCotacoesAutorizacao(autorizacaoId?: string | number) {
  return useQuery({
    queryKey: ["autorizacao-compras", "cotacoes", autorizacaoId],
    queryFn: () => autorizacaoComprasService.listarCotacoes(autorizacaoId as string),
    enabled: !!autorizacaoId
  });
}

export function useCriarCotacaoAutorizacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AutorizacaoCotacaoPayload }) =>
      autorizacaoComprasService.criarCotacao(id, payload),
    onSuccess: async (_response, vars) => {
      await invalidarDetalhe(queryClient, vars.id);
    }
  });
}

export function useExcluirCotacaoAutorizacao(autorizacaoId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (cotacaoId: string) =>
      autorizacaoComprasService.excluirCotacao(autorizacaoId as string, cotacaoId),
    onSuccess: async () => {
      await invalidarDetalhe(queryClient, autorizacaoId);
    }
  });
}

export function useDefinirFornecedorAutorizacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: EscolhaFornecedorPayload }) =>
      autorizacaoComprasService.definirFornecedor(id, payload),
    onSuccess: async (response) => {
      await invalidarDetalhe(queryClient, response.id);
    }
  });
}

export function useReservasAutorizacao(autorizacaoId?: string | number) {
  return useQuery({
    queryKey: ["autorizacao-compras", "reservas", autorizacaoId],
    queryFn: () => autorizacaoComprasService.listarReservas(autorizacaoId as string),
    enabled: !!autorizacaoId
  });
}

export function useRegistrarReservaAutorizacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ReservaBancariaPayload }) =>
      autorizacaoComprasService.registrarReservaBancaria(id, payload),
    onSuccess: async (_response, vars) => {
      await invalidarDetalhe(queryClient, vars.id);
    }
  });
}

export function useRemoverReservaAutorizacao(autorizacaoId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reservaId: number | string) =>
      autorizacaoComprasService.removerReservaBancaria(autorizacaoId as string, reservaId),
    onSuccess: async () => {
      await invalidarDetalhe(queryClient, autorizacaoId);
    }
  });
}

export function useGerarAutorizacaoPagamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AutorizacaoPagamentoPayload }) =>
      autorizacaoComprasService.gerarAutorizacaoPagamento(id, payload),
    onSuccess: async (response) => {
      await invalidarDetalhe(queryClient, response.id);
    }
  });
}

export function useUploadArquivoAutorizacaoCompra(autorizacaoId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ arquivo, observacao }: { arquivo: File; observacao?: string }) =>
      arquivosService.uploadParaCompra(autorizacaoId as string, arquivo, observacao),
    onSuccess: async () => {
      await invalidarDetalhe(queryClient, autorizacaoId);
    }
  });
}

export function useExcluirArquivoAutorizacaoCompra(autorizacaoId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (arquivoId: string | number) => arquivosService.excluir(arquivoId),
    onSuccess: async () => {
      await invalidarDetalhe(queryClient, autorizacaoId);
    }
  });
}
