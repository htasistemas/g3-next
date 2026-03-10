import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { emprestimosEventosService } from "@/services/emprestimos-eventos.service";
import type { EmprestimoEventoPayload, EventoEmprestimo } from "@/types/emprestimos-eventos";

type FiltrosEmprestimo = {
  inicio?: string;
  fim?: string;
  status?: string;
  evento?: number;
  item?: number;
  unidade?: number;
};

export function useEmprestimosEventos(filtros: FiltrosEmprestimo) {
  return useQuery({
    queryKey: ["emprestimos-eventos", filtros],
    queryFn: () => emprestimosEventosService.listar(filtros)
  });
}

export function useEmprestimoEvento(id?: number) {
  return useQuery({
    queryKey: ["emprestimos-eventos", "detalhe", id ?? 0],
    queryFn: () => emprestimosEventosService.obter(id as number),
    enabled: !!id
  });
}

export function useEventosEmprestimo() {
  return useQuery({
    queryKey: ["emprestimos-eventos", "eventos"],
    queryFn: () => emprestimosEventosService.listarEventos()
  });
}

export function useAgendaResumoEmprestimos(inicio?: string, fim?: string) {
  return useQuery({
    queryKey: ["emprestimos-eventos", "agenda-resumo", inicio ?? "", fim ?? ""],
    queryFn: () => emprestimosEventosService.agendaResumo(inicio ?? "", fim ?? ""),
    enabled: Boolean(inicio && fim)
  });
}

export function useAgendaDiaEmprestimos(dataRef?: string) {
  return useQuery({
    queryKey: ["emprestimos-eventos", "agenda-dia", dataRef ?? ""],
    queryFn: () => emprestimosEventosService.agendaDia(dataRef as string),
    enabled: !!dataRef
  });
}

export function useSalvarEmprestimoEvento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: EmprestimoEventoPayload & { id?: number }) => {
      if (payload.id) return emprestimosEventosService.atualizar(payload.id, payload);
      return emprestimosEventosService.criar(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["emprestimos-eventos"] });
    }
  });
}

export function useRemoverEmprestimoEvento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => emprestimosEventosService.excluir(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["emprestimos-eventos"] });
    }
  });
}

export function useSalvarEventoEmprestimo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: EventoEmprestimo) => {
      if (payload.id) {
        return emprestimosEventosService.atualizarEvento(payload.id, {
          titulo: payload.titulo,
          descricao: payload.descricao,
          local: payload.local,
          dataInicio: payload.dataInicio,
          dataFim: payload.dataFim,
          status: payload.status
        });
      }
      return emprestimosEventosService.criarEvento({
        titulo: payload.titulo,
        descricao: payload.descricao,
        local: payload.local,
        dataInicio: payload.dataInicio,
        dataFim: payload.dataFim,
        status: payload.status
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["emprestimos-eventos", "eventos"] });
    }
  });
}

export function useRemoverEventoEmprestimo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => emprestimosEventosService.excluirEvento(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["emprestimos-eventos", "eventos"] });
      await queryClient.invalidateQueries({ queryKey: ["emprestimos-eventos"] });
    }
  });
}
