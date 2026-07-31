import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { informacoesAdministrativasService } from "@/services/informacoes-administrativas.service";
import type {
  InformacaoAdministrativaCategoriaPayload,
  InformacaoAdministrativaPayload
} from "@/types/informacao-administrativa";

export function useInformacoesAdministrativas(senhaConfirmacao: string, autorizado: boolean) {
  const { usuario } = useAuth();

  return useQuery({
    queryKey: ["informacoes-administrativas", usuario?.tenant_id ?? "sem-tenant"],
    queryFn: () => informacoesAdministrativasService.listar(senhaConfirmacao),
    enabled: autorizado && !!senhaConfirmacao.trim()
  });
}

export function useInformacoesAdministrativasCategorias(senhaConfirmacao: string, autorizado: boolean) {
  const { usuario } = useAuth();

  return useQuery({
    queryKey: ["informacoes-administrativas-categorias", usuario?.tenant_id ?? "sem-tenant"],
    queryFn: () => informacoesAdministrativasService.listarCategorias(senhaConfirmacao),
    enabled: autorizado && !!senhaConfirmacao.trim()
  });
}

export function useSalvarInformacaoAdministrativa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: InformacaoAdministrativaPayload & { id?: string }) => {
      if (payload.id) return informacoesAdministrativasService.atualizar(payload.id, payload);
      return informacoesAdministrativasService.criar(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["informacoes-administrativas"] });
    }
  });
}

export function useExcluirInformacaoAdministrativa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, senhaConfirmacao }: { id: string; senhaConfirmacao: string }) =>
      informacoesAdministrativasService.excluir(id, senhaConfirmacao),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["informacoes-administrativas"] });
    }
  });
}

export function useSalvarInformacaoAdministrativaCategoria() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: InformacaoAdministrativaCategoriaPayload & { id?: string }) => {
      if (payload.id) return informacoesAdministrativasService.atualizarCategoria(payload.id, payload);
      return informacoesAdministrativasService.criarCategoria(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["informacoes-administrativas-categorias"] });
      await queryClient.invalidateQueries({ queryKey: ["informacoes-administrativas"] });
    }
  });
}

export function useExcluirInformacaoAdministrativaCategoria() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, senhaConfirmacao }: { id: string; senhaConfirmacao: string }) =>
      informacoesAdministrativasService.excluirCategoria(id, senhaConfirmacao),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["informacoes-administrativas-categorias"] });
    }
  });
}
