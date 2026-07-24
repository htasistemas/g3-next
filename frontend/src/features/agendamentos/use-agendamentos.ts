import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { agendamentosService } from "@/services/agendamentos.service";
import type {
  Agendamento,
  AgendamentoFiltros,
  AgendamentoListaEspera,
  AgendamentoOperacionalPayload,
  AgendamentoOperacionalTipo
} from "@/types/agendamento";

export function useAgendamentos(filtros: AgendamentoFiltros) {
  const { usuario } = useAuth();
  return useQuery({
    queryKey: ["agendamentos", usuario?.tenant_id ?? "sem-tenant", filtros],
    queryFn: () => agendamentosService.listar(filtros),
    enabled: !!usuario
  });
}

export function useAgendamento(id?: string | number) {
  const { usuario } = useAuth();
  return useQuery({
    queryKey: ["agendamento", usuario?.tenant_id ?? "sem-tenant", id],
    queryFn: () => agendamentosService.obter(id as string),
    enabled: !!usuario && !!id
  });
}

export function useIndicadoresAgendamentos(filtros: AgendamentoFiltros) {
  const { usuario } = useAuth();
  return useQuery({
    queryKey: ["agendamentos", "indicadores", usuario?.tenant_id ?? "sem-tenant", filtros],
    queryFn: () => agendamentosService.listarIndicadores(filtros),
    enabled: !!usuario
  });
}

export function useCatalogosAgendamentos() {
  const { usuario } = useAuth();
  return useQuery({
    queryKey: ["agendamentos", "catalogos", usuario?.tenant_id ?? "sem-tenant"],
    queryFn: () => agendamentosService.listarCatalogos(),
    enabled: !!usuario
  });
}

export function useListaEsperaAgendamentos() {
  const { usuario } = useAuth();
  return useQuery({
    queryKey: ["agendamentos", "lista-espera", usuario?.tenant_id ?? "sem-tenant"],
    queryFn: () => agendamentosService.listarListaEspera(),
    enabled: !!usuario
  });
}

export function useItensOperacionaisAgendamento(tipo?: AgendamentoOperacionalTipo, busca?: string) {
  const { usuario } = useAuth();
  return useQuery({
    queryKey: ["agendamentos", "itens", usuario?.tenant_id ?? "sem-tenant", tipo, busca],
    queryFn: () => agendamentosService.listarItens(tipo as AgendamentoOperacionalTipo, busca),
    enabled: !!usuario && Boolean(tipo)
  });
}

export function useBeneficiariosOperacionaisAgendamento(itemId?: number | null) {
  const { usuario } = useAuth();
  return useQuery({
    queryKey: ["agendamentos", "beneficiarios", usuario?.tenant_id ?? "sem-tenant", itemId],
    queryFn: () => agendamentosService.listarBeneficiarios(itemId as number),
    enabled: !!usuario && Boolean(itemId)
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
      // A tela operacional faz o refetch explícito da data persistida após o
      // commit. Evitamos refetchar a data anterior e depois repetir a mesma
      // consulta para a nova data.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["agendamentos"], refetchType: "none" }),
        queryClient.invalidateQueries({ queryKey: ["agendamento"], refetchType: "none" })
      ]);
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

export function useExcluirAgendamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string | number) => agendamentosService.excluir(id),
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

export function useCopiarAgendamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string | number; payload: { data: string } }) =>
      agendamentosService.copiar(id, payload),
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
