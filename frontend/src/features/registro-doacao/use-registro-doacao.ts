import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { registroDoacaoService } from "@/services/registro-doacao.service";
import type { Doador, RegistroDoacao, RegistroDoacaoFiltro } from "@/types/registro-doacao";

export { useItensAlmoxarifado } from "@/features/almoxarifado/use-almoxarifado";

export function useRegistrosDoacao(filtros: RegistroDoacaoFiltro) {
  return useQuery({
    queryKey: ["registro-doacao", filtros],
    queryFn: () => registroDoacaoService.listar(filtros)
  });
}

export function useRegistroDoacao(id?: string) {
  return useQuery({
    queryKey: ["registro-doacao-item", id],
    queryFn: () => registroDoacaoService.buscarPorId(id as string),
    enabled: !!id
  });
}

export function useSalvarRegistroDoacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: RegistroDoacao) => {
      if (payload.id_registro_doacao) {
        return registroDoacaoService.atualizar(payload.id_registro_doacao, payload);
      }
      return registroDoacaoService.criar(payload);
    },
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ["registro-doacao"] });
      await queryClient.invalidateQueries({ queryKey: ["almoxarifado", "itens"] });
      await queryClient.invalidateQueries({ queryKey: ["almoxarifado", "movimentacoes"] });
      const id = response.registro?.id_registro_doacao;
      if (id) {
        await queryClient.invalidateQueries({ queryKey: ["registro-doacao-item", id] });
      }
    }
  });
}

export function useRemoverRegistroDoacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => registroDoacaoService.remover(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["registro-doacao"] });
    }
  });
}

export function useDoadores(termo?: string) {
  return useQuery({
    queryKey: ["registro-doacao", "doadores", termo ?? ""],
    queryFn: () => registroDoacaoService.listarDoadores(termo),
    enabled: termo === undefined || (termo?.trim().length ?? 0) >= 2
  });
}

export function useCriarDoador() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Doador) => registroDoacaoService.criarDoador(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["registro-doacao", "doadores"] });
    }
  });
}

export function useRemoverDoador() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => registroDoacaoService.removerDoador(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["registro-doacao", "doadores"] });
    }
  });
}
