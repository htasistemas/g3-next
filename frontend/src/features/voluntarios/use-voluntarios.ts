import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { voluntariosService } from "@/services/voluntarios.service";
import type {
  Voluntario,
  VoluntarioEscalaPayload,
  VoluntarioFiltro
} from "@/types/voluntario";

export function useVoluntarios(filtros: VoluntarioFiltro) {
  const { usuario } = useAuth();
  const tenantKey = usuario?.tenant_id ?? "sem-tenant";
  return useQuery({
    queryKey: ["voluntarios", tenantKey, filtros],
    queryFn: () => voluntariosService.listar(filtros)
  });
}

export function useVoluntario(id?: string) {
  const { usuario } = useAuth();
  const tenantKey = usuario?.tenant_id ?? "sem-tenant";
  return useQuery({
    queryKey: ["voluntario", tenantKey, id],
    queryFn: () => voluntariosService.buscarPorId(id as string),
    enabled: !!id
  });
}

export function useSalvarVoluntario() {
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const tenantKey = usuario?.tenant_id ?? "sem-tenant";
  return useMutation({
    mutationFn: async (payload: Voluntario) => {
      if (payload.id_voluntario) {
        return voluntariosService.atualizar(payload.id_voluntario, payload);
      }
      return voluntariosService.criar(payload);
    },
    onSuccess: async (response) => {
      const id = response.voluntario?.id_voluntario;
      await queryClient.invalidateQueries({ queryKey: ["voluntarios", tenantKey] });
      if (id) {
        await queryClient.invalidateQueries({ queryKey: ["voluntario", tenantKey, id] });
      }
    }
  });
}

export function useRemoverVoluntario() {
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const tenantKey = usuario?.tenant_id ?? "sem-tenant";
  return useMutation({
    mutationFn: (id: string) => voluntariosService.remover(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["voluntarios", tenantKey] });
    }
  });
}

export function useVoluntarioEscalas(voluntarioId?: string) {
  const { usuario } = useAuth();
  const tenantKey = usuario?.tenant_id ?? "sem-tenant";
  return useQuery({
    queryKey: ["voluntario-escalas", tenantKey, voluntarioId ?? ""],
    queryFn: async () => {
      if (!voluntarioId) return { escalas: [] };
      return voluntariosService.listarEscalas(voluntarioId);
    },
    enabled: !!voluntarioId
  });
}

export function useSalvarVoluntarioEscala(voluntarioId?: string) {
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const tenantKey = usuario?.tenant_id ?? "sem-tenant";
  return useMutation({
    mutationFn: async (payload: VoluntarioEscalaPayload) => {
      if (payload.id_escala) {
        return voluntariosService.atualizarEscala(payload.id_escala, payload);
      }
      return voluntariosService.criarEscala(payload);
    },
    onSuccess: async (response) => {
      const escala = response.escala;
      await queryClient.invalidateQueries({ queryKey: ["voluntario-escalas", tenantKey, voluntarioId ?? ""] });
      if (voluntarioId) {
        await queryClient.invalidateQueries({ queryKey: ["voluntario", tenantKey, voluntarioId] });
      }
      if (escala?.voluntario_id) {
        await queryClient.invalidateQueries({
          queryKey: ["voluntario-escalas", tenantKey, escala.voluntario_id]
        });
      }
    }
  });
}

export function useRemoverVoluntarioEscala(voluntarioId?: string) {
  const queryClient = useQueryClient();
  const { usuario } = useAuth();
  const tenantKey = usuario?.tenant_id ?? "sem-tenant";
  return useMutation({
    mutationFn: (id: string) => voluntariosService.removerEscala(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["voluntario-escalas", tenantKey, voluntarioId ?? ""] });
      if (voluntarioId) {
        await queryClient.invalidateQueries({ queryKey: ["voluntario", tenantKey, voluntarioId] });
      }
    }
  });
}
