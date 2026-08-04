import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { beneficiariosService } from "@/services/beneficiarios.service";
import type { Beneficiario, BeneficiarioFiltro } from "@/types/beneficiario";

type UseBeneficiariosOptions = {
  enabled?: boolean;
};

export function useBeneficiarios(filtros: BeneficiarioFiltro, options?: UseBeneficiariosOptions) {
  const { usuario } = useAuth();
  return useQuery({
    queryKey: ["beneficiarios", usuario?.tenant_id ?? "sem-tenant", filtros],
    queryFn: () => beneficiariosService.listar(filtros),
    enabled: (options?.enabled ?? true) && !!usuario
  });
}

export function useBeneficiario(id?: string) {
  const { usuario } = useAuth();
  return useQuery({
    queryKey: ["beneficiario", usuario?.tenant_id ?? "sem-tenant", id],
    queryFn: () => beneficiariosService.buscarPorId(id as string),
    enabled: !!usuario && !!id
  });
}

export function useBeneficiarioCompletude(id?: string) {
  const { usuario } = useAuth();
  return useQuery({
    queryKey: ["beneficiario", usuario?.tenant_id ?? "sem-tenant", id, "completude"],
    queryFn: () => beneficiariosService.obterCompletude(id as string),
    enabled: !!usuario && !!id
  });
}

export function useBeneficiarioFamiliaResumo(id?: string) {
  const { usuario } = useAuth();
  return useQuery({
    queryKey: ["beneficiario", usuario?.tenant_id ?? "sem-tenant", id, "familia-resumo"],
    queryFn: () => beneficiariosService.obterResumoFamilia(id as string),
    enabled: !!usuario && !!id
  });
}

export function useBeneficiarioConsentimentos(id?: string) {
  const { usuario } = useAuth();
  return useQuery({
    queryKey: ["beneficiario", usuario?.tenant_id ?? "sem-tenant", id, "consentimentos"],
    queryFn: () => beneficiariosService.listarConsentimentos(id as string),
    enabled: !!usuario && !!id
  });
}

export function useBeneficiarioAuditoria(id?: string) {
  const { usuario } = useAuth();
  return useQuery({
    queryKey: ["beneficiario", usuario?.tenant_id ?? "sem-tenant", id, "auditoria"],
    queryFn: () => beneficiariosService.listarAuditoria(id as string),
    enabled: !!usuario && !!id
  });
}

export function useSalvarBeneficiario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Beneficiario) => {
      if (payload.id_beneficiario) {
        return beneficiariosService.atualizar(payload.id_beneficiario, payload);
      }
      return beneficiariosService.criar(payload);
    },
    onSuccess: async (data, variables) => {
      const beneficiarioId = data.beneficiario.id_beneficiario ?? variables.id_beneficiario;
      await queryClient.invalidateQueries({ queryKey: ["beneficiarios"] });
      if (beneficiarioId) {
        await queryClient.invalidateQueries({ queryKey: ["beneficiario", beneficiarioId] });
      } else {
        await queryClient.invalidateQueries({ queryKey: ["beneficiario"] });
      }
    }
  });
}

export function useCriarBeneficiarioRapido() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Beneficiario> & { consentimento_minimo?: boolean; observacao?: string }) =>
      beneficiariosService.criarRapido(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["beneficiarios"] });
    }
  });
}

export function useAnalisarDuplicidadeBeneficiario() {
  return useMutation({
    mutationFn: (payload: Partial<Beneficiario>) => beneficiariosService.analisarDuplicidade(payload)
  });
}

export function useRecalcularCompletudeBeneficiario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => beneficiariosService.recalcularCompletude(id),
    onSuccess: async (_data, id) => {
      await queryClient.invalidateQueries({ queryKey: ["beneficiario"] });
      await queryClient.invalidateQueries({ queryKey: ["beneficiario", id] });
    }
  });
}

export function useRegistrarConsentimentoBeneficiario(id?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { tipo: string; situacao: string; observacao?: string; validade?: string; versao_termo?: string; finalidade?: string; canal_coleta?: string }) =>
      beneficiariosService.registrarConsentimento(id as string, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["beneficiario"] });
    }
  });
}

export function useRemoverBeneficiario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => beneficiariosService.remover(id),
    onSuccess: async (_data, id) => {
      await queryClient.invalidateQueries({ queryKey: ["beneficiarios"] });
      await queryClient.removeQueries({ queryKey: ["beneficiario", id] });
    }
  });
}

export function useProximoCodigo() {
  const { usuario } = useAuth();
  return useQuery({
    queryKey: ["beneficiarios", "proximo-codigo", usuario?.tenant_id ?? "sem-tenant"],
    queryFn: () => beneficiariosService.obterProximoCodigo(),
    enabled: !!usuario
  });
}
