import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { bibliotecaService } from "@/services/biblioteca.service";
import type { BibliotecaEmprestimoCadastro, BibliotecaLivroCadastro } from "@/types/biblioteca";

export function useLivrosBiblioteca() {
  const { usuario } = useAuth();
  const tenantKey = usuario?.tenant_id ?? "sem-tenant";
  return useQuery({
    queryKey: ["biblioteca", tenantKey, "livros"],
    queryFn: () => bibliotecaService.listarLivros(),
    enabled: !!usuario
  });
}

export function useProximoCodigoLivroBiblioteca() {
  const { usuario } = useAuth();
  const tenantKey = usuario?.tenant_id ?? "sem-tenant";
  return useQuery({
    queryKey: ["biblioteca", tenantKey, "livros", "proximo-codigo"],
    queryFn: () => bibliotecaService.obterProximoCodigoLivro(),
    enabled: !!usuario
  });
}

export function useConsultarLivroIsbnBiblioteca() {
  return useMutation({
    mutationFn: (isbn: string) => bibliotecaService.consultarLivroPorIsbn(isbn)
  });
}

export function useEmprestimosBiblioteca() {
  const { usuario } = useAuth();
  const tenantKey = usuario?.tenant_id ?? "sem-tenant";
  return useQuery({
    queryKey: ["biblioteca", tenantKey, "emprestimos"],
    queryFn: () => bibliotecaService.listarEmprestimos(),
    enabled: !!usuario
  });
}

export function useAlertasBiblioteca() {
  const { usuario } = useAuth();
  const tenantKey = usuario?.tenant_id ?? "sem-tenant";
  return useQuery({
    queryKey: ["biblioteca", tenantKey, "alertas"],
    queryFn: () => bibliotecaService.listarAlertas(),
    enabled: !!usuario
  });
}

export function useSalvarLivroBiblioteca() {
  const { usuario } = useAuth();
  const queryClient = useQueryClient();
  const tenantKey = usuario?.tenant_id ?? "sem-tenant";
  return useMutation({
    mutationFn: ({ id, payload }: { id?: string; payload: BibliotecaLivroCadastro }) => {
      if (id) return bibliotecaService.atualizarLivro(id, payload);
      return bibliotecaService.criarLivro(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["biblioteca", tenantKey, "livros"] });
      await queryClient.invalidateQueries({ queryKey: ["biblioteca", tenantKey, "livros", "proximo-codigo"] });
    }
  });
}

export function useRemoverLivroBiblioteca() {
  const { usuario } = useAuth();
  const queryClient = useQueryClient();
  const tenantKey = usuario?.tenant_id ?? "sem-tenant";
  return useMutation({
    mutationFn: (id: string) => bibliotecaService.removerLivro(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["biblioteca", tenantKey, "livros"] });
      await queryClient.invalidateQueries({ queryKey: ["biblioteca", tenantKey, "emprestimos"] });
      await queryClient.invalidateQueries({ queryKey: ["biblioteca", tenantKey, "alertas"] });
    }
  });
}

export function useSalvarEmprestimoBiblioteca() {
  const { usuario } = useAuth();
  const queryClient = useQueryClient();
  const tenantKey = usuario?.tenant_id ?? "sem-tenant";
  return useMutation({
    mutationFn: ({ id, payload }: { id?: string; payload: BibliotecaEmprestimoCadastro }) => {
      if (id) return bibliotecaService.atualizarEmprestimo(id, payload);
      return bibliotecaService.criarEmprestimo(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["biblioteca", tenantKey, "emprestimos"] });
      await queryClient.invalidateQueries({ queryKey: ["biblioteca", tenantKey, "livros"] });
      await queryClient.invalidateQueries({ queryKey: ["biblioteca", tenantKey, "alertas"] });
    }
  });
}

export function useRemoverEmprestimoBiblioteca() {
  const { usuario } = useAuth();
  const queryClient = useQueryClient();
  const tenantKey = usuario?.tenant_id ?? "sem-tenant";
  return useMutation({
    mutationFn: (id: string) => bibliotecaService.removerEmprestimo(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["biblioteca", tenantKey, "emprestimos"] });
      await queryClient.invalidateQueries({ queryKey: ["biblioteca", tenantKey, "livros"] });
      await queryClient.invalidateQueries({ queryKey: ["biblioteca", tenantKey, "alertas"] });
    }
  });
}

export function useRegistrarDevolucaoBiblioteca() {
  const { usuario } = useAuth();
  const queryClient = useQueryClient();
  const tenantKey = usuario?.tenant_id ?? "sem-tenant";
  return useMutation({
    mutationFn: ({ id, dataDevolucaoReal }: { id: string; dataDevolucaoReal: string }) =>
      bibliotecaService.registrarDevolucao(id, dataDevolucaoReal),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["biblioteca", tenantKey, "emprestimos"] });
      await queryClient.invalidateQueries({ queryKey: ["biblioteca", tenantKey, "livros"] });
      await queryClient.invalidateQueries({ queryKey: ["biblioteca", tenantKey, "alertas"] });
    }
  });
}
