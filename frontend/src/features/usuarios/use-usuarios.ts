import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usuariosService } from "@/services/usuarios.service";
import type { UsuarioFiltros, UsuarioPayload, UsuarioStatus } from "@/types/usuario";

export function useUsuarios(filtros: UsuarioFiltros) {
  return useQuery({
    queryKey: ["usuarios", filtros],
    queryFn: () => usuariosService.listar(filtros)
  });
}

export function useUsuario(id?: string) {
  return useQuery({
    queryKey: ["usuario", id],
    queryFn: () => usuariosService.buscarPorId(id as string),
    enabled: !!id
  });
}

export function usePermissoesUsuarios() {
  return useQuery({
    queryKey: ["usuarios", "permissoes"],
    queryFn: () => usuariosService.listarPermissoes()
  });
}

export function useSalvarUsuario() {
  const queryClient = useQueryClient();

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
      await queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      await queryClient.invalidateQueries({ queryKey: ["usuario", id] });
    }
  });
}

export function useAtualizarStatusUsuario() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id_usuario, status }: { id_usuario: string; status: UsuarioStatus }) =>
      usuariosService.atualizarStatus(id_usuario, status),
    onSuccess: async (resultado) => {
      const id = resultado.usuario.id_usuario;
      await queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      await queryClient.invalidateQueries({ queryKey: ["usuario", id] });
    }
  });
}

export function useResetarSenhaUsuario() {
  const queryClient = useQueryClient();

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
      await queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      await queryClient.invalidateQueries({ queryKey: ["usuario", id] });
    }
  });
}

export function useRemoverUsuario() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id_usuario: string) => usuariosService.remover(id_usuario),
    onSuccess: async (resultado) => {
      const id = resultado.usuario.id_usuario;
      await queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      await queryClient.invalidateQueries({ queryKey: ["usuario", id] });
    }
  });
}
