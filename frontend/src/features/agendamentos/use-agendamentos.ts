import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { agendamentosService } from "@/services/agendamentos.service";
import type {
  Agendamento,
  AgendamentoFiltros,
  AgendamentoListaEspera,
  AgendamentoOperacionalPayload,
  AgendamentoOperacionalTipo
} from "@/types/agendamento";

export function useAgendamentos(filtros: AgendamentoFiltros) {
  return useQuery({
    queryKey: ["agendamentos", filtros],
    queryFn: () => agendamentosService.listar(filtros)
  });
}

export function useAgendamento(id?: string | number) {
  return useQuery({
    queryKey: ["agendamento", id],
    queryFn: () => agendamentosService.obter(id as string),
    enabled: !!id
  });
}

export function useIndicadoresAgendamentos(filtros: AgendamentoFiltros) {
  return useQuery({
    queryKey: ["agendamentos", "indicadores", filtros],
    queryFn: () => agendamentosService.listarIndicadores(filtros)
  });
}

export function useCatalogosAgendamentos() {
  return useQuery({
    queryKey: ["agendamentos", "catalogos"],
    queryFn: () => agendamentosService.listarCatalogos()
  });
}

export function useListaEsperaAgendamentos() {
  return useQuery({
    queryKey: ["agendamentos", "lista-espera"],
    queryFn: () => agendamentosService.listarListaEspera()
  });
}

export function useItensOperacionaisAgendamento(tipo?: AgendamentoOperacionalTipo, busca?: string) {
  return useQuery({
    queryKey: ["agendamentos", "itens", tipo, busca],
    queryFn: () => agendamentosService.listarItens(tipo as AgendamentoOperacionalTipo, busca),
    enabled: Boolean(tipo)
  });
}

export function useBeneficiariosOperacionaisAgendamento(itemId?: number | null) {
  return useQuery({
    queryKey: ["agendamentos", "beneficiarios", itemId],
    queryFn: () => agendamentosService.listarBeneficiarios(itemId as number),
    enabled: Boolean(itemId)
  });
}

function invalidarAgendamentos(queryClient: ReturnType<typeof useQueryClient>) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ["agendamentos"] }),
    queryClient.invalidateQueries({ queryKey: ["agendamento"] })
  ]);
}

export function useSalvarAgendamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Agendamento) => {
      if (payload.id) return agendamentosService.atualizar(payload.id, payload);
      return agendamentosService.criar(payload);
    },
    onSuccess: async () => {
      await invalidarAgendamentos(queryClient);
    }
  });
}

export function useSalvarAgendamentoOperacional() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AgendamentoOperacionalPayload) => agendamentosService.criarOperacional(payload),
    onSuccess: async () => {
      await invalidarAgendamentos(queryClient);
    }
  });
}

export function useCancelarAgendamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, motivo }: { id: string | number; motivo?: string }) =>
      agendamentosService.cancelar(id, motivo),
    onSuccess: async () => {
      await invalidarAgendamentos(queryClient);
    }
  });
}

export function useRemarcarAgendamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string | number; payload: Partial<Agendamento> }) =>
      agendamentosService.remarcar(id, payload),
    onSuccess: async () => {
      await invalidarAgendamentos(queryClient);
    }
  });
}

export function useConfirmarAgendamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string | number; payload: { canal?: string; observacao?: string } }) =>
      agendamentosService.confirmar(id, payload),
    onSuccess: async () => {
      await invalidarAgendamentos(queryClient);
    }
  });
}

export function useCheckInAgendamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string | number; payload: Record<string, unknown> }) =>
      agendamentosService.checkIn(id, payload),
    onSuccess: async () => {
      await invalidarAgendamentos(queryClient);
    }
  });
}

export function useConcluirAgendamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string | number; payload: Record<string, unknown> }) =>
      agendamentosService.concluir(id, payload),
    onSuccess: async () => {
      await invalidarAgendamentos(queryClient);
    }
  });
}

export function useCriarListaEsperaAgendamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AgendamentoListaEspera) => agendamentosService.criarListaEspera(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["agendamentos", "lista-espera"] });
    }
  });
}

export function useConverterListaEsperaAgendamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string | number; payload: Agendamento }) =>
      agendamentosService.converterListaEspera(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["agendamentos", "lista-espera"] });
      await invalidarAgendamentos(queryClient);
    }
  });
}

export function useNotificarAgendamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, canal }: { id: string | number; canal: "WHATSAPP" | "EMAIL" }) =>
      agendamentosService.notificar(id, canal),
    onSuccess: async () => {
      await invalidarAgendamentos(queryClient);
    }
  });
}
