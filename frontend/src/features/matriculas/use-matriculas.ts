import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { matriculasService } from "@/services/matriculas.service";
import type { Matricula, MatriculaFiltro } from "@/types/matricula";

export function useMatriculas(filtros: MatriculaFiltro) {
  return useQuery({
    queryKey: ["matriculas", filtros],
    queryFn: () => matriculasService.listar(filtros)
  });
}

export function useMatricula(id?: string) {
  return useQuery({
    queryKey: ["matricula", id],
    queryFn: () => matriculasService.buscarPorId(id as string),
    enabled: !!id
  });
}

export function useSalvarMatricula() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Matricula) => {
      if (payload.id_matricula) {
        return matriculasService.atualizar(payload.id_matricula, payload);
      }
      return matriculasService.criar(payload);
    },
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({ queryKey: ["matriculas"] });
      const id = response.matricula?.id_matricula;
      if (id) {
        await queryClient.invalidateQueries({ queryKey: ["matricula", id] });
      }
    }
  });
}

export function useRemoverMatricula() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => matriculasService.remover(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["matriculas"] });
    }
  });
}
