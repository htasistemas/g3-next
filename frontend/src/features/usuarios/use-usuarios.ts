import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { usuariosService } from "@/services/usuarios.service";
import type { UsuarioFiltros, UsuarioPayload, UsuarioStatus } from "@/types/usuario";

export function useUsuarios(filtros: UsuarioFiltros) {
  const { usuario } = useAuth();
  return useQuery({
    queryKey: ["usuarios", usuario?.tenant_id ?? "sem-tenant", filtros],
    queryFn: () => usuariosService.listar(filtros),
    enabled: !!usuario
  });
}

export function useUsuario(id?: string) {
  const { usuario } = useAuth();
  return useQuery({
    queryKey: ["usuario", usuario?.tenant_id ?? "sem-tenant", id],
    queryFn: () => usuariosService.buscarPorId(id as string),
    enabled: !!usuario && !!id
  });
}

export function usePermissoesUsuarios() {
  const { usuario } = useAuth();
  return useQuery({
    queryKey: ["usuarios", "permissoes", usuario?.tenant_id ?? "sem-tenant"],
    queryFn: () => usuariosService.listarPermissoes(),
    enabled: !!usuario
  });
}

export function useUsuarioFace(id?: string) {
  const { usuario } = useAuth();
  return useQuery({
    queryKey: ["usuario", usuario?.tenant_id ?? "sem-tenant", id, "face"],
    queryFn: () => usuariosService.buscarFace(id as string),
    enabled: !!usuario && !!id
  });
}

export function useSalvarUsuario() {
  const { usuario } = useAuth();
  const queryClient = useQueryClient();
  const tenantKey = usuario?.tenant_id ?? "sem-tenant";

  return useMutation({
    mutationFn: async (payload: UsuarioPayload & { id_usuario?: string }) => {
      if (payload.id_usuario) {
        const { id_usuario, ...data } = payload;
        return usuariosService.atualizar(id_usuario, data);
      }

      return usuariosService.criar(payload);
    },
    onSuccess: async (resultado) => {
      const id = resultado.usuario.id_usuario;
      await queryClient.invalidateQueries({ queryKey: ["usuarios", tenantKey] });
      await queryClient.invalidateQueries({ queryKey: ["usuario", tenantKey, id] });
    }
  });
}

export function useAtualizarStatusUsuario() {
  const { usuario } = useAuth();
  const queryClient = useQueryClient();
  const tenantKey = usuario?.tenant_id ?? "sem-tenant";

  return useMutation({
    mutationFn: ({ id_usuario, status }: { id_usuario: string; status: UsuarioStatus }) =>
      usuariosService.atualizarStatus(id_usuario, status),
    onSuccess: async (resultado) => {
      const id = resultado.usuario.id_usuario;
      await queryClient.invalidateQueries({ queryKey: ["usuarios", tenantKey] });
      await queryClient.invalidateQueries({ queryKey: ["usuario", tenantKey, id] });
    }
  });
}

export function useResetarSenhaUsuario() {
  const { usuario } = useAuth();
  const queryClient = useQueryClient();
  const tenantKey = usuario?.tenant_id ?? "sem-tenant";

  return useMutation({
    mutationFn: (payload: {
      id_usuario: string;
      nova_senha: string;
      confirmar_nova_senha: string;
      exigir_troca_senha: boolean;
    }) =>
      usuariosService.resetarSenha(payload.id_usuario, {
        nova_senha: payload.nova_senha,
        confirmar_nova_senha: payload.confirmar_nova_senha,
        exigir_troca_senha: payload.exigir_troca_senha
      }),
    onSuccess: async (resultado) => {
      const id = resultado.usuario.id_usuario;
      await queryClient.invalidateQueries({ queryKey: ["usuarios", tenantKey] });
      await queryClient.invalidateQueries({ queryKey: ["usuario", tenantKey, id] });
    }
  });
}

export function useSalvarUsuarioFace() {
  const { usuario } = useAuth();
  const queryClient = useQueryClient();
  const tenantKey = usuario?.tenant_id ?? "sem-tenant";

  return useMutation({
    mutationFn: ({ id_usuario, face_imagem }: { id_usuario: string; face_imagem: string }) =>
      usuariosService.salvarFace(id_usuario, { face_imagem }),
    onSuccess: async (_resultado, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["usuarios", tenantKey] });
      await queryClient.invalidateQueries({ queryKey: ["usuario", tenantKey, variables.id_usuario] });
      await queryClient.invalidateQueries({ queryKey: ["usuario", tenantKey, variables.id_usuario, "face"] });
    }
  });
}

export function useRemoverUsuarioFace() {
  const { usuario } = useAuth();
  const queryClient = useQueryClient();
  const tenantKey = usuario?.tenant_id ?? "sem-tenant";

  return useMutation({
    mutationFn: (id_usuario: string) => usuariosService.removerFace(id_usuario),
    onSuccess: async (_resultado, id) => {
      await queryClient.invalidateQueries({ queryKey: ["usuarios", tenantKey] });
      await queryClient.invalidateQueries({ queryKey: ["usuario", tenantKey, id] });
      await queryClient.invalidateQueries({ queryKey: ["usuario", tenantKey, id, "face"] });
    }
  });
}

export function useRemoverUsuario() {
  const { usuario } = useAuth();
  const queryClient = useQueryClient();
  const tenantKey = usuario?.tenant_id ?? "sem-tenant";

  return useMutation({
    mutationFn: (id_usuario: string) => usuariosService.remover(id_usuario),
    onSuccess: async (resultado) => {
      const id = resultado.id_usuario;
      await queryClient.invalidateQueries({ queryKey: ["usuarios", tenantKey] });
      await queryClient.removeQueries({ queryKey: ["usuario", tenantKey, id] });
    }
  });
}
