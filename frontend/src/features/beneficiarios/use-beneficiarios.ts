import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { beneficiariosService } from "@/services/beneficiarios.service";
import type { Beneficiario, BeneficiarioFiltro } from "@/types/beneficiario";

export function useBeneficiarios(filtros: BeneficiarioFiltro) {
  return useQuery({
    queryKey: ["beneficiarios", filtros],
    queryFn: () => beneficiariosService.listar(filtros)
  });
}

export function useBeneficiario(id?: string) {
  return useQuery({
    queryKey: ["beneficiario", id],
    queryFn: () => beneficiariosService.buscarPorId(id as string),
    enabled: !!id
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
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["beneficiarios"] });
    }
  });
}

export function useRemoverBeneficiario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => beneficiariosService.remover(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["beneficiarios"] });
    }
  });
}

export function useProximoCodigo() {
  return useQuery({
    queryKey: ["beneficiarios", "proximo-codigo"],
    queryFn: () => beneficiariosService.obterProximoCodigo()
  });
}
