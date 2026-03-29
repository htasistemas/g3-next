import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { checklistDiarioService } from "@/services/checklist-diario.service";
import type { ChecklistFiltros, ChecklistModeloPayload } from "@/types/checklist-diario";

export function useChecklistDiario(filtros: ChecklistFiltros) {
  return useQuery({
    queryKey: ["checklist-diario", "lista", filtros],
    queryFn: () => checklistDiarioService.listar(filtros)
  });
}

export function useChecklistSemanal(filtros: ChecklistFiltros) {
  return useQuery({
    queryKey: ["checklist-diario", "semana", filtros],
    queryFn: () => checklistDiarioService.listarSemana(filtros)
  });
}

export function useChecklistIndicadores(filtros: ChecklistFiltros) {
  return useQuery({
    queryKey: ["checklist-diario", "indicadores", filtros],
    queryFn: () => checklistDiarioService.obterIndicadores(filtros)
  });
}

export function useChecklistHistorico(execucaoId?: string) {
  return useQuery({
    queryKey: ["checklist-diario", "historico", execucaoId ?? ""],
    queryFn: () => checklistDiarioService.listarHistorico(execucaoId ? { execucaoId } : undefined)
  });
}

export function useChecklistModelos() {
  return useQuery({
    queryKey: ["checklist-diario", "modelos"],
    queryFn: () => checklistDiarioService.listarModelos()
  });
}

export function useChecklistConfiguracao() {
  return useQuery({
    queryKey: ["checklist-diario", "configuracao"],
    queryFn: () => checklistDiarioService.obterConfiguracao()
  });
}

function invalidateChecklist(queryClient: ReturnType<typeof useQueryClient>) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ["checklist-diario"] }),
    queryClient.invalidateQueries({ queryKey: ["usuarios"] }),
    queryClient.invalidateQueries({ queryKey: ["unidades-assistenciais"] })
  ]);
}

export function useConcluirChecklistExecucao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, observacao }: { id: string; observacao?: string }) =>
      checklistDiarioService.concluirExecucao(id, observacao),
    onSuccess: async () => {
      await invalidateChecklist(queryClient);
    }
  });
}

export function useDispensarChecklistExecucao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, motivo, observacao }: { id: string; motivo: string; observacao?: string }) =>
      checklistDiarioService.dispensarExecucao(id, motivo, observacao),
    onSuccess: async () => {
      await invalidateChecklist(queryClient);
    }
  });
}

export function useNaoSeAplicaChecklistExecucao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, motivo, observacao }: { id: string; motivo: string; observacao?: string }) =>
      checklistDiarioService.marcarNaoSeAplica(id, motivo, observacao),
    onSuccess: async () => {
      await invalidateChecklist(queryClient);
    }
  });
}

export function useReabrirChecklistExecucao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, motivo, observacao }: { id: string; motivo?: string; observacao?: string }) =>
      checklistDiarioService.reabrirExecucao(id, motivo, observacao),
    onSuccess: async () => {
      await invalidateChecklist(queryClient);
    }
  });
}

export function useSalvarChecklistModelo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id?: string; payload: ChecklistModeloPayload }) =>
      checklistDiarioService.salvarModelo(payload, id),
    onSuccess: async () => {
      await invalidateChecklist(queryClient);
    }
  });
}

export function useClonarChecklistModelo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => checklistDiarioService.clonarModelo(id),
    onSuccess: async () => {
      await invalidateChecklist(queryClient);
    }
  });
}

export function useAtualizarChecklistModeloStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) =>
      checklistDiarioService.atualizarStatusModelo(id, ativo),
    onSuccess: async () => {
      await invalidateChecklist(queryClient);
    }
  });
}

export function useAtualizarChecklistConfiguracao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { sabadoAtivo: boolean; domingoAtivo: boolean }) =>
      checklistDiarioService.atualizarConfiguracao(payload),
    onSuccess: async () => {
      await invalidateChecklist(queryClient);
    }
  });
}

export function useGerarChecklistSemana() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload?: { dataReferencia?: string; usuarioId?: number; forcar?: boolean }) =>
      checklistDiarioService.gerarSemana(payload),
    onSuccess: async () => {
      await invalidateChecklist(queryClient);
    }
  });
}
