import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { matriculasService } from "@/services/matriculas.service";
import type { Matricula, MatriculaFiltro } from "@/types/matricula";

export function useMatriculas(filtros: MatriculaFiltro) {
  const { usuario } = useAuth();
  return useQuery({
    queryKey: ["matriculas", usuario?.tenant_id ?? "sem-tenant", filtros],
    queryFn: () => matriculasService.listar(filtros),
    enabled: !!usuario
  });
}

export function useMatricula(id?: string) {
  const { usuario } = useAuth();
  return useQuery({
    queryKey: ["matricula", usuario?.tenant_id ?? "sem-tenant", id],
    queryFn: () => matriculasService.buscarPorId(id as string),
    enabled: !!usuario && !!id
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
