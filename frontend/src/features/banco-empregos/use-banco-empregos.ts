import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { bancoEmpregosService } from "@/services/banco-empregos.service";
import type { JobCandidato, JobPayload } from "@/types/banco-empregos";

export function useVagasBancoEmpregos() {
  return useQuery({
    queryKey: ["banco-empregos", "vagas"],
    queryFn: () => bancoEmpregosService.listar()
  });
}

export function useVagaBancoEmpregos(id?: string) {
  return useQuery({
    queryKey: ["banco-empregos", "vaga", id],
    queryFn: () => bancoEmpregosService.buscarPorId(id as string),
    enabled: !!id
  });
}

export function useSalvarVagaBancoEmpregos() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id?: string; payload: JobPayload }) => {
      if (id) return bancoEmpregosService.atualizar(id, payload);
      return bancoEmpregosService.criar(payload);
    },
    onSuccess: async (vaga) => {
      await queryClient.invalidateQueries({ queryKey: ["banco-empregos", "vagas"] });
      await queryClient.invalidateQueries({ queryKey: ["banco-empregos", "vaga", vaga.id] });
    }
  });
}

export function useRemoverVagaBancoEmpregos() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => bancoEmpregosService.remover(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["banco-empregos", "vagas"] });
    }
  });
}

export function useCandidatosVaga(empregoId?: string) {
  return useQuery({
    queryKey: ["banco-empregos", "candidatos", empregoId],
    queryFn: () => bancoEmpregosService.listarCandidatos(empregoId as string),
    enabled: !!empregoId
  });
}

export function useCriarCandidatoVaga() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      empregoId,
      payload
    }: {
      empregoId: string;
      payload: Omit<JobCandidato, "id" | "criadoEm" | "empregoId">;
    }) => bancoEmpregosService.criarCandidato(empregoId, payload),
    onSuccess: async (_response, vars) => {
      await queryClient.invalidateQueries({
        queryKey: ["banco-empregos", "candidatos", vars.empregoId]
      });
    }
  });
}

export function useRemoverCandidatoVaga(empregoId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (candidatoId: string) => bancoEmpregosService.removerCandidato(candidatoId),
    onSuccess: async () => {
      if (empregoId) {
        await queryClient.invalidateQueries({
          queryKey: ["banco-empregos", "candidatos", empregoId]
        });
      }
      await queryClient.invalidateQueries({ queryKey: ["banco-empregos", "vagas"] });
    }
  });
}

