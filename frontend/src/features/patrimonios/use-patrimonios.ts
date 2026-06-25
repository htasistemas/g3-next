import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { patrimoniosService } from "@/services/patrimonios.service";
import type { Patrimonio, PatrimonioCategoria, PatrimonioMovimento } from "@/types/patrimonio";

export function usePatrimonios() {
  const { usuario } = useAuth();
  return useQuery({
    queryKey: ["patrimonios", usuario?.tenant_id ?? "sem-tenant"],
    queryFn: () => patrimoniosService.listar()
  });
}

export function usePatrimonioCategorias() {
  const { usuario } = useAuth();
  return useQuery({
    queryKey: ["patrimonio-categorias", usuario?.tenant_id ?? "sem-tenant"],
    queryFn: () => patrimoniosService.listarCategorias(),
    enabled: !!usuario
  });
}

export function useSalvarPatrimonioCategoria() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: PatrimonioCategoria) => {
      if (payload.id) {
        return patrimoniosService.atualizarCategoria(payload.id, payload);
      }
      return patrimoniosService.criarCategoria(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["patrimonio-categorias"] });
    }
  });
}

export function useRemoverPatrimonioCategoria() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => patrimoniosService.removerCategoria(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["patrimonio-categorias"] });
    }
  });
}

export function useSalvarPatrimonio() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Patrimonio) => {
      if (payload.idPatrimonio) {
        return patrimoniosService.atualizar(payload.idPatrimonio, payload);
      }
      return patrimoniosService.criar(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["patrimonios"] });
    }
  });
}

export function useRegistrarMovimentoPatrimonio() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: PatrimonioMovimento }) =>
      patrimoniosService.registrarMovimento(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["patrimonios"] });
    }
  });
}

export function useAtualizarPatrimoniosEmLote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (atualizacoes: Array<{ id: string; payload: Patrimonio }>) => {
      const respostas: Array<{ patrimonio: Patrimonio }> = [];

      for (const atualizacao of atualizacoes) {
        const resposta = await patrimoniosService.atualizar(atualizacao.id, atualizacao.payload);
        respostas.push(resposta);
      }

      return respostas;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["patrimonios"] });
    }
  });
}
