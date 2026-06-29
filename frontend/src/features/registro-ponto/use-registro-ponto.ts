import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { registroPontoService } from "@/services/registro-ponto.service";
import type {
  RegistroPontoAjustePayload,
  RegistroPontoFacePayload,
  RegistroPontoFiltro,
  RegistroPontoHoraExtraConfiguracao,
  RegistroPontoHoraExtraPendencia,
  RegistroPontoHoraExtraItem,
  RegistroPontoHoraExtraResumo,
  RegistroPontoHorarioTrabalhoPayload,
  RegistroPontoMarcarPayload,
  RegistroPontoOcorrenciaPayload
} from "@/types/registro-ponto";

function useRegistroPontoTenantKey() {
  const { usuario } = useAuth();
  return usuario?.tenant_id ?? "sem-tenant";
}

export function useRegistrosPonto(filtros: RegistroPontoFiltro) {
  const tenantId = useRegistroPontoTenantKey();
  return useQuery({
    queryKey: ["registro-ponto", tenantId, "lista", filtros],
    queryFn: () => registroPontoService.listar(filtros)
  });
}

export function useEspelhoPonto(filtros: RegistroPontoFiltro) {
  const tenantId = useRegistroPontoTenantKey();
  return useQuery({
    queryKey: ["registro-ponto", tenantId, "espelho", filtros],
    queryFn: () => registroPontoService.listarEspelho(filtros)
  });
}

export function useCatalogoUsuariosRegistroPonto(termo?: string) {
  const tenantId = useRegistroPontoTenantKey();
  return useQuery({
    queryKey: ["registro-ponto", tenantId, "usuarios", termo ?? ""],
    queryFn: () => registroPontoService.listarUsuarios(termo),
    enabled: termo !== undefined && (termo.trim().length === 0 || termo.trim().length >= 2)
  });
}

export function useConfiguracaoRegistroPonto() {
  const tenantId = useRegistroPontoTenantKey();
  return useQuery({
    queryKey: ["registro-ponto", tenantId, "configuracao"],
    queryFn: () => registroPontoService.buscarConfiguracao()
  });
}

export function useConfiguracaoHoraExtraRegistroPonto() {
  const tenantId = useRegistroPontoTenantKey();
  return useQuery({
    queryKey: ["registro-ponto", tenantId, "configuracao-hora-extra"],
    queryFn: () => registroPontoService.buscarConfiguracaoHoraExtra()
  });
}

export function useFaceRegistroPonto() {
  const tenantId = useRegistroPontoTenantKey();
  return useQuery({
    queryKey: ["registro-ponto", tenantId, "face"],
    queryFn: () => registroPontoService.buscarFace()
  });
}

export function useMarcarPonto() {
  const queryClient = useQueryClient();
  const tenantId = useRegistroPontoTenantKey();

  return useMutation({
    mutationFn: (payload: RegistroPontoMarcarPayload) => registroPontoService.marcarPonto(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["registro-ponto", tenantId, "lista"] });
      await queryClient.invalidateQueries({ queryKey: ["registro-ponto", tenantId, "espelho"] });
    }
  });
}

export function useSalvarConfiguracaoHoraExtraRegistroPonto() {
  const queryClient = useQueryClient();
  const tenantId = useRegistroPontoTenantKey();

  return useMutation({
    mutationFn: (payload: RegistroPontoHoraExtraConfiguracao) =>
      registroPontoService.salvarConfiguracaoHoraExtra(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["registro-ponto", tenantId, "configuracao-hora-extra"]
      });
    }
  });
}

export function useHorasExtrasRegistroPonto(params?: Record<string, unknown>) {
  const tenantId = useRegistroPontoTenantKey();
  return useQuery({
    queryKey: ["registro-ponto", tenantId, "hora-extra", params ?? {}],
    queryFn: () => registroPontoService.listarHorasExtras(params)
  });
}

export function useRegistrarCienciaHoraExtraRegistroPonto() {
  const queryClient = useQueryClient();
  const tenantId = useRegistroPontoTenantKey();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { justificativa_funcionario: string; ciencia_registrada: boolean } }) =>
      registroPontoService.registrarCienciaHoraExtra(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["registro-ponto", tenantId, "hora-extra"] });
      await queryClient.invalidateQueries({ queryKey: ["registro-ponto", tenantId, "lista"] });
      await queryClient.invalidateQueries({ queryKey: ["registro-ponto", tenantId, "espelho"] });
    }
  });
}

export function useDecidirHoraExtraRegistroPonto() {
  const queryClient = useQueryClient();
  const tenantId = useRegistroPontoTenantKey();

  return useMutation({
    mutationFn: ({
      id,
      payload
    }: {
      id: string;
      payload: { justificativa: string; minutos_aprovados?: number; minutos_negados?: number };
    }) => registroPontoService.decidirHoraExtra(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["registro-ponto", tenantId, "hora-extra"] });
      await queryClient.invalidateQueries({ queryKey: ["registro-ponto", tenantId, "lista"] });
      await queryClient.invalidateQueries({ queryKey: ["registro-ponto", tenantId, "espelho"] });
    }
  });
}

export function useRelatorioMensalHoraExtraRegistroPonto(params?: Record<string, unknown>) {
  const tenantId = useRegistroPontoTenantKey();
  return useQuery({
    queryKey: ["registro-ponto", tenantId, "relatorio-mensal", params ?? {}],
    queryFn: () => registroPontoService.listarRelatorioMensal(params)
  });
}

export function useAjustarRegistroPonto() {
  const queryClient = useQueryClient();
  const tenantId = useRegistroPontoTenantKey();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: RegistroPontoAjustePayload }) =>
      registroPontoService.ajustarRegistro(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["registro-ponto", tenantId, "lista"] });
      await queryClient.invalidateQueries({ queryKey: ["registro-ponto", tenantId, "espelho"] });
    }
  });
}

export function useAdicionarOcorrenciaPonto() {
  const queryClient = useQueryClient();
  const tenantId = useRegistroPontoTenantKey();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: RegistroPontoOcorrenciaPayload }) =>
      registroPontoService.adicionarOcorrencia(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["registro-ponto", tenantId, "lista"] });
      await queryClient.invalidateQueries({ queryKey: ["registro-ponto", tenantId, "espelho"] });
    }
  });
}

export function useHistoricoRegistroPonto(id?: string) {
  const tenantId = useRegistroPontoTenantKey();
  return useQuery({
    queryKey: ["registro-ponto", tenantId, "historico", id],
    queryFn: () => registroPontoService.buscarHistorico(id as string),
    enabled: !!id
  });
}

export function useSalvarConfiguracaoRegistroPonto() {
  const queryClient = useQueryClient();
  const tenantId = useRegistroPontoTenantKey();

  return useMutation({
    mutationFn: (payload: RegistroPontoHorarioTrabalhoPayload) =>
      registroPontoService.salvarConfiguracao(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["registro-ponto", tenantId, "configuracao"]
      });
    }
  });
}

export function useSalvarFaceRegistroPonto() {
  const queryClient = useQueryClient();
  const tenantId = useRegistroPontoTenantKey();

  return useMutation({
    mutationFn: (payload: RegistroPontoFacePayload) => registroPontoService.salvarFace(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["registro-ponto", tenantId, "face"] });
    }
  });
}
