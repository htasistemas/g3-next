import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { prestacaoContasService } from "@/services/prestacao-contas.service";
import type { PrestacaoContasPayload, PrestacaoIaConfig, PrestacaoProfissionalEntidade } from "@/types/prestacao-contas";

export function usePrestacoesContas() {
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? "sem-tenant";
  return useQuery({
    queryKey: ["prestacao-contas", tenantId, "lista"],
    queryFn: () => prestacaoContasService.listar()
  });
}

export function useSalvarPrestacaoContas() {
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? "sem-tenant";
  return useMutation({
    mutationFn: async ({ id, payload }: { id?: string; payload: PrestacaoContasPayload }) => {
      if (id) return prestacaoContasService.atualizar(id, payload);
      return prestacaoContasService.criar(payload);
    },
    onSuccess: async (registro) => {
      await queryClient.invalidateQueries({ queryKey: ["prestacao-contas", tenantId, "lista"] });
      await queryClient.invalidateQueries({ queryKey: ["prestacao-contas", tenantId, "item", registro.id] });
    }
  });
}

export function useExcluirPrestacaoContas() {
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? "sem-tenant";
  return useMutation({
    mutationFn: (id: string) => prestacaoContasService.excluir(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["prestacao-contas", tenantId, "lista"] });
    }
  });
}

export function useAlterarWorkflowPrestacao() {
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? "sem-tenant";
  return useMutation({
    mutationFn: ({ id, acao }: { id: string; acao: string }) => prestacaoContasService.alterarWorkflow(id, acao),
    onSuccess: async (registro) => {
      await queryClient.invalidateQueries({ queryKey: ["prestacao-contas", tenantId, "lista"] });
      await queryClient.invalidateQueries({ queryKey: ["prestacao-contas", tenantId, "item", registro.id] });
    }
  });
}

export function usePublicarPrestacao() {
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? "sem-tenant";
  return useMutation({ mutationFn: (id: string) => prestacaoContasService.publicar(id), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["prestacao-contas", tenantId] }); } });
}

export function useRetirarPublicacaoPrestacao() {
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? "sem-tenant";
  return useMutation({ mutationFn: ({ id, motivo }: { id: string; motivo?: string }) => prestacaoContasService.retirarPublicacao(id, motivo), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["prestacao-contas", tenantId] }); } });
}

export function usePrazosPrestacao(status?: string) {
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? "sem-tenant";
  return useQuery({ queryKey: ["prestacao-contas", tenantId, "prazos", status ?? "todos"], queryFn: () => prestacaoContasService.listarPrazos(status), staleTime: 30_000 });
}

export function useDashboardFinanceiroSocial() {
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? "sem-tenant";
  return useQuery({ queryKey: ["prestacao-contas", tenantId, "dashboard-financeiro-social"], queryFn: () => prestacaoContasService.dashboardFinanceiroSocial(), staleTime: 30_000 });
}

export function usePrestacaoProfissionalVisaoGeral() {
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? "sem-tenant";
  return useQuery({
    queryKey: ["prestacao-contas", tenantId, "profissional", "visao-geral"],
    queryFn: () => prestacaoContasService.obterVisaoGeralProfissional()
  });
}

export function usePrestacaoProfissionalLista(entidade: PrestacaoProfissionalEntidade) {
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? "sem-tenant";
  return useQuery({
    queryKey: ["prestacao-contas", tenantId, "profissional", entidade],
    queryFn: () => prestacaoContasService.listarProfissional(entidade)
  });
}

export function useCriarPrestacaoProfissional(entidade: PrestacaoProfissionalEntidade) {
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? "sem-tenant";
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => prestacaoContasService.criarProfissional(entidade, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["prestacao-contas", tenantId, "profissional", entidade] });
      await queryClient.invalidateQueries({ queryKey: ["prestacao-contas", tenantId, "profissional", "visao-geral"] });
    }
  });
}

export function usePrestacaoAuditoriaProfissional() {
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? "sem-tenant";
  return useQuery({
    queryKey: ["prestacao-contas", tenantId, "profissional", "auditoria"],
    queryFn: () => prestacaoContasService.listarAuditoriaProfissional()
  });
}

export function usePrestacaoIaConfiguracoes() {
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? "sem-tenant";
  return useQuery({
    queryKey: ["prestacao-contas", tenantId, "profissional", "ia"],
    queryFn: () => prestacaoContasService.listarConfiguracoesIa()
  });
}

export function useSalvarPrestacaoIaConfiguracao() {
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? "sem-tenant";
  return useMutation({
    mutationFn: (payload: PrestacaoIaConfig & { credencial?: string }) => prestacaoContasService.salvarConfiguracaoIa(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["prestacao-contas", tenantId, "profissional", "ia"] });
    }
  });
}
