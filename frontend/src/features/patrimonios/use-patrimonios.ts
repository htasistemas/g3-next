import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { patrimoniosService } from "@/services/patrimonios.service";
import type { Patrimonio, PatrimonioMovimento } from "@/types/patrimonio";

export function usePatrimonios() {
  return useQuery({
    queryKey: ["patrimonios"],
    queryFn: () => patrimoniosService.listar()
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
