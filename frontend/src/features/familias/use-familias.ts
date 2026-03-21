import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { familiasService } from "@/services/familias.service";
import type {
  Familia,
  FamiliaDesmembramentoPayload,
  FamiliaEnderecoPayload,
  FamiliaFiltro,
  FamiliaMembro,
  FamiliaTransferenciaPayload
} from "@/types/familia";

export function useFamilias(filtros: FamiliaFiltro) {
  return useQuery({
    queryKey: ["familias", filtros],
    queryFn: () => familiasService.listar(filtros)
  });
}

export function useFamilia(id?: string) {
  return useQuery({
    queryKey: ["familia", id],
    queryFn: () => familiasService.buscarPorId(id as string),
    enabled: Boolean(id)
  });
}

export function useFamiliaHistorico(id?: string) {
  return useQuery({
    queryKey: ["familia", id, "historico"],
    queryFn: () => familiasService.listarHistorico(id as string),
    enabled: Boolean(id)
  });
}

export function useFamiliaAlertas(id?: string) {
  return useQuery({
    queryKey: ["familia", id, "alertas"],
    queryFn: () => familiasService.listarAlertas(id as string),
    enabled: Boolean(id)
  });
}

export function useValidacaoBeneficioFamiliar(id?: string, beneficioNome?: string) {
  return useQuery({
    queryKey: ["familia", id, "validacao-beneficio", beneficioNome],
    queryFn: () => familiasService.validarBeneficioFamiliar(id as string, beneficioNome as string),
    enabled: Boolean(id && beneficioNome)
  });
}

function invalidarFamilia(queryClient: ReturnType<typeof useQueryClient>, id?: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ["familias"] }),
    id ? queryClient.invalidateQueries({ queryKey: ["familia", id] }) : Promise.resolve(),
    id ? queryClient.invalidateQueries({ queryKey: ["familia", id, "historico"] }) : Promise.resolve(),
    id ? queryClient.invalidateQueries({ queryKey: ["familia", id, "alertas"] }) : Promise.resolve()
  ]);
}

export function useSalvarFamilia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Familia) => {
      if (payload.id_familia) {
        return familiasService.atualizar(payload.id_familia, payload);
      }
      return familiasService.criar(payload);
    },
    onSuccess: async (response) => {
      await invalidarFamilia(queryClient, response.familia.id_familia);
    }
  });
}

export function useRemoverFamilia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => familiasService.remover(id),
    onSuccess: async (_data, id) => {
      await queryClient.invalidateQueries({ queryKey: ["familias"] });
      await queryClient.removeQueries({ queryKey: ["familia", id] });
      await queryClient.removeQueries({ queryKey: ["familia", id, "historico"] });
      await queryClient.removeQueries({ queryKey: ["familia", id, "alertas"] });
    }
  });
}

export function useAdicionarMembroFamilia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { familiaId: string; membro: FamiliaMembro }) =>
      familiasService.adicionarMembro(payload.familiaId, payload.membro),
    onSuccess: async (response) => {
      await invalidarFamilia(queryClient, response.familia.id_familia);
    }
  });
}

export function useAtualizarMembroFamilia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { familiaId: string; membroId: string; membro: FamiliaMembro }) =>
      familiasService.atualizarMembro(payload.familiaId, payload.membroId, payload.membro),
    onSuccess: async (response) => {
      await invalidarFamilia(queryClient, response.familia.id_familia);
    }
  });
}

export function useRemoverMembroFamilia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { familiaId: string; membroId: string }) =>
      familiasService.removerMembro(payload.familiaId, payload.membroId),
    onSuccess: async (_data, variables) => {
      await invalidarFamilia(queryClient, variables.familiaId);
    }
  });
}

export function useDefinirResponsavelFamilia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { familiaId: string; beneficiarioId: string }) =>
      familiasService.definirResponsavel(payload.familiaId, payload.beneficiarioId),
    onSuccess: async (response) => {
      await invalidarFamilia(queryClient, response.familia.id_familia);
    }
  });
}

export function useAtualizarEnderecoFamilia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { familiaId: string; endereco: FamiliaEnderecoPayload }) =>
      familiasService.atualizarEndereco(payload.familiaId, payload.endereco),
    onSuccess: async (response) => {
      await invalidarFamilia(queryClient, response.familia.id_familia);
    }
  });
}

export function useTransferirMembroFamilia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { familiaId: string; transferencia: FamiliaTransferenciaPayload }) =>
      familiasService.transferirMembro(payload.familiaId, payload.transferencia),
    onSuccess: async (response) => {
      await invalidarFamilia(queryClient, response.familia_origem.id_familia);
      await invalidarFamilia(queryClient, response.familia_destino.id_familia);
    }
  });
}

export function useDesmembrarFamilia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { familiaId: string; desmembramento: FamiliaDesmembramentoPayload }) =>
      familiasService.desmembrarFamilia(payload.familiaId, payload.desmembramento),
    onSuccess: async (response) => {
      await invalidarFamilia(queryClient, response.familia_origem.id_familia);
      await invalidarFamilia(queryClient, response.familia_nova.id_familia);
    }
  });
}
