import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { datasComemorativasService } from "@/services/datas-comemorativas.service";
import type {
  DataComemorativaConfiguracoes,
  DataComemorativaFiltros,
  DataComemorativaImportPayload,
  DataComemorativaPayload
} from "@/types/datas-comemorativas";

export function useDatasComemorativas(filters: DataComemorativaFiltros) {
  return useQuery({
    queryKey: ["datas-comemorativas", "lista", filters],
    queryFn: () => datasComemorativasService.listar(filters),
    staleTime: 60_000
  });
}

export function useCalendarioDatasComemorativas(
  ano: number,
  mes: number,
  filters: Omit<DataComemorativaFiltros, "ano" | "mes">
) {
  return useQuery({
    queryKey: ["datas-comemorativas", "calendario", ano, mes, filters],
    queryFn: () => datasComemorativasService.obterCalendario(ano, mes, filters),
    staleTime: 60_000
  });
}

export function useEventosDoDiaDatasComemorativas(
  dataIso?: string,
  contexto?: { uf?: string; municipio?: string }
) {
  return useQuery({
    queryKey: ["datas-comemorativas", "dia", dataIso, contexto],
    queryFn: () => datasComemorativasService.obterEventosDoDia(String(dataIso), contexto),
    enabled: Boolean(dataIso),
    staleTime: 30_000
  });
}

export function useConfiguracoesDatasComemorativas() {
  return useQuery({
    queryKey: ["datas-comemorativas", "configuracoes"],
    queryFn: () => datasComemorativasService.obterConfiguracoes(),
    staleTime: 60_000
  });
}

export function useSyncLogsDatasComemorativas() {
  return useQuery({
    queryKey: ["datas-comemorativas", "sync-logs"],
    queryFn: () => datasComemorativasService.obterSyncLogs(),
    staleTime: 30_000
  });
}

export function useLogsDatasComemorativas() {
  return useQuery({
    queryKey: ["datas-comemorativas", "logs"],
    queryFn: () => datasComemorativasService.obterLogs(),
    staleTime: 30_000
  });
}

export function useSalvarDataComemorativa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id?: string; payload: DataComemorativaPayload }) => {
      if (id) {
        return datasComemorativasService.atualizar(id, payload);
      }
      return datasComemorativasService.criar(payload);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["datas-comemorativas", "lista"] }),
        queryClient.invalidateQueries({ queryKey: ["datas-comemorativas", "calendario"] }),
        queryClient.invalidateQueries({ queryKey: ["datas-comemorativas", "logs"] })
      ]);
    }
  });
}

export function useExcluirDataComemorativa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => datasComemorativasService.excluir(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["datas-comemorativas", "lista"] }),
        queryClient.invalidateQueries({ queryKey: ["datas-comemorativas", "calendario"] }),
        queryClient.invalidateQueries({ queryKey: ["datas-comemorativas", "logs"] })
      ]);
    }
  });
}

export function useAtivarDataComemorativa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => datasComemorativasService.ativar(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["datas-comemorativas", "lista"] }),
        queryClient.invalidateQueries({ queryKey: ["datas-comemorativas", "calendario"] })
      ]);
    }
  });
}

export function useInativarDataComemorativa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => datasComemorativasService.inativar(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["datas-comemorativas", "lista"] }),
        queryClient.invalidateQueries({ queryKey: ["datas-comemorativas", "calendario"] })
      ]);
    }
  });
}

export function useDuplicarDataComemorativa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => datasComemorativasService.duplicar(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["datas-comemorativas", "lista"] }),
        queryClient.invalidateQueries({ queryKey: ["datas-comemorativas", "calendario"] })
      ]);
    }
  });
}

export function useSincronizarFeriados() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { ano: number; provider?: string }) =>
      datasComemorativasService.sincronizarFeriados(payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["datas-comemorativas", "lista"] }),
        queryClient.invalidateQueries({ queryKey: ["datas-comemorativas", "calendario"] }),
        queryClient.invalidateQueries({ queryKey: ["datas-comemorativas", "sync-logs"] }),
        queryClient.invalidateQueries({ queryKey: ["datas-comemorativas", "logs"] })
      ]);
    }
  });
}

export function useSincronizarIntervaloDatasComemorativas() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { inicio: number; fim: number; provider?: string }) =>
      datasComemorativasService.sincronizarIntervalo(payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["datas-comemorativas", "lista"] }),
        queryClient.invalidateQueries({ queryKey: ["datas-comemorativas", "calendario"] }),
        queryClient.invalidateQueries({ queryKey: ["datas-comemorativas", "sync-logs"] }),
        queryClient.invalidateQueries({ queryKey: ["datas-comemorativas", "logs"] })
      ]);
    }
  });
}

export function useImportarDatasComemorativas() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: DataComemorativaImportPayload) =>
      datasComemorativasService.importar(payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["datas-comemorativas", "lista"] }),
        queryClient.invalidateQueries({ queryKey: ["datas-comemorativas", "calendario"] }),
        queryClient.invalidateQueries({ queryKey: ["datas-comemorativas", "sync-logs"] }),
        queryClient.invalidateQueries({ queryKey: ["datas-comemorativas", "logs"] })
      ]);
    }
  });
}

export function useSalvarConfiguracoesDatasComemorativas() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<DataComemorativaConfiguracoes>) =>
      datasComemorativasService.salvarConfiguracoes(payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["datas-comemorativas", "configuracoes"] }),
        queryClient.invalidateQueries({ queryKey: ["datas-comemorativas", "logs"] })
      ]);
    }
  });
}
