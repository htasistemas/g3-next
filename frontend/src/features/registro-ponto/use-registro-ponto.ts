import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { registroPontoService } from "@/services/registro-ponto.service";
import type {
  RegistroPontoAjustePayload,
  RegistroPontoFiltro,
  RegistroPontoMarcarPayload,
  RegistroPontoOcorrenciaPayload
} from "@/types/registro-ponto";

export function useRegistrosPonto(filtros: RegistroPontoFiltro) {
  return useQuery({
    queryKey: ["registro-ponto", "lista", filtros],
    queryFn: () => registroPontoService.listar(filtros)
  });
}

export function useEspelhoPonto(filtros: RegistroPontoFiltro) {
  return useQuery({
    queryKey: ["registro-ponto", "espelho", filtros],
    queryFn: () => registroPontoService.listarEspelho(filtros)
  });
}

export function useCatalogoUsuariosRegistroPonto(termo?: string) {
  return useQuery({
    queryKey: ["registro-ponto", "usuarios", termo ?? ""],
    queryFn: () => registroPontoService.listarUsuarios(termo),
    enabled: (termo?.trim().length ?? 0) >= 2
  });
}

export function useMarcarPonto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: RegistroPontoMarcarPayload) => registroPontoService.marcarPonto(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["registro-ponto", "lista"] });
      await queryClient.invalidateQueries({ queryKey: ["registro-ponto", "espelho"] });
    }
  });
}

export function useAjustarRegistroPonto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: RegistroPontoAjustePayload }) =>
      registroPontoService.ajustarRegistro(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["registro-ponto", "lista"] });
      await queryClient.invalidateQueries({ queryKey: ["registro-ponto", "espelho"] });
    }
  });
}

export function useAdicionarOcorrenciaPonto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: RegistroPontoOcorrenciaPayload }) =>
      registroPontoService.adicionarOcorrencia(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["registro-ponto", "lista"] });
      await queryClient.invalidateQueries({ queryKey: ["registro-ponto", "espelho"] });
    }
  });
}

export function useHistoricoRegistroPonto(id?: string) {
  return useQuery({
    queryKey: ["registro-ponto", "historico", id],
    queryFn: () => registroPontoService.buscarHistorico(id as string),
    enabled: !!id
  });
}
