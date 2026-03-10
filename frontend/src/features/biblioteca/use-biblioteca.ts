import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { bibliotecaService } from "@/services/biblioteca.service";
import type { BibliotecaEmprestimoCadastro, BibliotecaLivroCadastro } from "@/types/biblioteca";

export function useLivrosBiblioteca() {
  return useQuery({
    queryKey: ["biblioteca", "livros"],
    queryFn: () => bibliotecaService.listarLivros()
  });
}

export function useProximoCodigoLivroBiblioteca() {
  return useQuery({
    queryKey: ["biblioteca", "livros", "proximo-codigo"],
    queryFn: () => bibliotecaService.obterProximoCodigoLivro()
  });
}

export function useConsultarLivroIsbnBiblioteca() {
  return useMutation({
    mutationFn: (isbn: string) => bibliotecaService.consultarLivroPorIsbn(isbn)
  });
}

export function useEmprestimosBiblioteca() {
  return useQuery({
    queryKey: ["biblioteca", "emprestimos"],
    queryFn: () => bibliotecaService.listarEmprestimos()
  });
}

export function useAlertasBiblioteca() {
  return useQuery({
    queryKey: ["biblioteca", "alertas"],
    queryFn: () => bibliotecaService.listarAlertas()
  });
}

export function useSalvarLivroBiblioteca() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id?: string; payload: BibliotecaLivroCadastro }) => {
      if (id) return bibliotecaService.atualizarLivro(id, payload);
      return bibliotecaService.criarLivro(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["biblioteca", "livros"] });
      await queryClient.invalidateQueries({ queryKey: ["biblioteca", "livros", "proximo-codigo"] });
    }
  });
}

export function useRemoverLivroBiblioteca() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => bibliotecaService.removerLivro(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["biblioteca", "livros"] });
      await queryClient.invalidateQueries({ queryKey: ["biblioteca", "emprestimos"] });
      await queryClient.invalidateQueries({ queryKey: ["biblioteca", "alertas"] });
    }
  });
}

export function useSalvarEmprestimoBiblioteca() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id?: string; payload: BibliotecaEmprestimoCadastro }) => {
      if (id) return bibliotecaService.atualizarEmprestimo(id, payload);
      return bibliotecaService.criarEmprestimo(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["biblioteca", "emprestimos"] });
      await queryClient.invalidateQueries({ queryKey: ["biblioteca", "livros"] });
      await queryClient.invalidateQueries({ queryKey: ["biblioteca", "alertas"] });
    }
  });
}

export function useRemoverEmprestimoBiblioteca() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => bibliotecaService.removerEmprestimo(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["biblioteca", "emprestimos"] });
      await queryClient.invalidateQueries({ queryKey: ["biblioteca", "livros"] });
      await queryClient.invalidateQueries({ queryKey: ["biblioteca", "alertas"] });
    }
  });
}

export function useRegistrarDevolucaoBiblioteca() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dataDevolucaoReal }: { id: string; dataDevolucaoReal: string }) =>
      bibliotecaService.registrarDevolucao(id, dataDevolucaoReal),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["biblioteca", "emprestimos"] });
      await queryClient.invalidateQueries({ queryKey: ["biblioteca", "livros"] });
      await queryClient.invalidateQueries({ queryKey: ["biblioteca", "alertas"] });
    }
  });
}
