import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { chamadosTecnicosService } from "@/services/chamados-tecnicos.service";
import type {
  ChamadoParametroInput,
  ChamadoTecnicoFiltros,
  ChamadoTecnicoInput
} from "@/types/chamado-tecnico";

export function useChamadosTecnicos(filtros: ChamadoTecnicoFiltros) {
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? "sem-tenant";
  return useQuery({
    queryKey: ["chamados-tecnicos", tenantId, filtros],
    queryFn: () => chamadosTecnicosService.listar(filtros)
  });
}

export function useChamadoTecnico(id?: string) {
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? "sem-tenant";
  return useQuery({
    queryKey: ["chamados-tecnicos", tenantId, "detalhe", id],
    queryFn: () => chamadosTecnicosService.buscarPorId(id as string),
    enabled: !!id
  });
}

export function useChamadosTecnicosCatalogo() {
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? "sem-tenant";
  return useQuery({
    queryKey: ["chamados-tecnicos", tenantId, "catalogo"],
    queryFn: () => chamadosTecnicosService.listarCatalogo(),
    staleTime: 300_000
  });
}

export function useChamadosTecnicosFiltrosSalvos() {
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? "sem-tenant";
  return useQuery({
    queryKey: ["chamados-tecnicos", tenantId, "filtros-salvos"],
    queryFn: () => chamadosTecnicosService.listarFiltrosSalvos()
  });
}

export function useSalvarChamadoTecnico() {
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? "sem-tenant";
  return useMutation({
    mutationFn: (payload: { id?: string; data: ChamadoTecnicoInput }) =>
      payload.id
        ? chamadosTecnicosService.atualizar(payload.id, payload.data)
        : chamadosTecnicosService.criar(payload.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["chamados-tecnicos", tenantId] });
    }
  });
}

export function useAlterarSituacaoChamadoTecnico() {
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? "sem-tenant";
  return useMutation({
    mutationFn: (payload: { id: string; data: Record<string, unknown> }) =>
      chamadosTecnicosService.alterarSituacao(payload.id, payload.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["chamados-tecnicos", tenantId] });
    }
  });
}

export function useComentarChamadoTecnico() {
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? "sem-tenant";
  return useMutation({
    mutationFn: (payload: { id: string; data: Record<string, unknown> }) =>
      chamadosTecnicosService.comentar(payload.id, payload.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["chamados-tecnicos", tenantId] });
    }
  });
}

export function useAdicionarVinculoChamadoTecnico() {
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? "sem-tenant";
  return useMutation({
    mutationFn: (payload: { id: string; data: Record<string, unknown> }) =>
      chamadosTecnicosService.adicionarVinculo(payload.id, payload.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["chamados-tecnicos", tenantId] });
    }
  });
}

export function useRemoverVinculoChamadoTecnico() {
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? "sem-tenant";
  return useMutation({
    mutationFn: (payload: { id: string; vinculoId: string }) =>
      chamadosTecnicosService.removerVinculo(payload.id, payload.vinculoId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["chamados-tecnicos", tenantId] });
    }
  });
}

export function useSalvarFiltroChamadoTecnico() {
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? "sem-tenant";
  return useMutation({
    mutationFn: (payload: { id?: string; nome: string; filtros: Record<string, unknown>; padrao?: boolean }) =>
      chamadosTecnicosService.salvarFiltro(payload, payload.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["chamados-tecnicos", tenantId, "filtros-salvos"] });
    }
  });
}

export function useRemoverFiltroChamadoTecnico() {
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? "sem-tenant";
  return useMutation({
    mutationFn: (id: string) => chamadosTecnicosService.removerFiltro(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["chamados-tecnicos", tenantId, "filtros-salvos"] });
    }
  });
}

export function useAnexarArquivosChamadoTecnico() {
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? "sem-tenant";
  return useMutation({
    mutationFn: (payload: { id: string; files: File[] }) =>
      chamadosTecnicosService.anexarArquivos(payload.id, payload.files),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["chamados-tecnicos", tenantId] });
    }
  });
}

export function useRemoverAnexoChamadoTecnico() {
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? "sem-tenant";
  return useMutation({
    mutationFn: (payload: { id: string; arquivoId: string }) =>
      chamadosTecnicosService.removerAnexo(payload.id, payload.arquivoId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["chamados-tecnicos", tenantId] });
    }
  });
}

export function useSalvarParametroChamadoTecnico() {
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? "sem-tenant";
  return useMutation({
    mutationFn: (payload: { id?: string; data: ChamadoParametroInput }) =>
      chamadosTecnicosService.salvarParametro(payload.data, payload.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["chamados-tecnicos", tenantId, "catalogo"] });
    }
  });
}
