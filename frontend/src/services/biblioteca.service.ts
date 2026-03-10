import { httpClient } from "./http-client";
import type {
  BibliotecaAlerta,
  BibliotecaEmprestimo,
  BibliotecaEmprestimoCadastro,
  BibliotecaLivro,
  BibliotecaLivroCadastro,
  BibliotecaLivroIsbnConsulta
} from "@/types/biblioteca";

export const bibliotecaService = {
  async listarLivros() {
    const { data } = await httpClient.get<{ livros: BibliotecaLivro[] }>("/api/biblioteca/livros");
    return data.livros ?? [];
  },

  async obterProximoCodigoLivro() {
    const { data } = await httpClient.get<{ codigo: string }>("/api/biblioteca/livros/next-code");
    return data.codigo ?? "";
  },

  async consultarLivroPorIsbn(isbn: string) {
    const { data } = await httpClient.get<{ livro: BibliotecaLivroIsbnConsulta }>(
      `/api/biblioteca/livros/isbn/${encodeURIComponent(isbn)}`
    );
    return data.livro;
  },

  async criarLivro(payload: BibliotecaLivroCadastro) {
    const { data } = await httpClient.post<{ livro: BibliotecaLivro }>("/api/biblioteca/livros", payload);
    return data.livro;
  },

  async atualizarLivro(id: string, payload: BibliotecaLivroCadastro) {
    const { data } = await httpClient.put<{ livro: BibliotecaLivro }>(`/api/biblioteca/livros/${id}`, payload);
    return data.livro;
  },

  async removerLivro(id: string) {
    await httpClient.delete(`/api/biblioteca/livros/${id}`);
  },

  async listarEmprestimos() {
    const { data } = await httpClient.get<{ emprestimos: BibliotecaEmprestimo[] }>("/api/biblioteca/emprestimos");
    return data.emprestimos ?? [];
  },

  async criarEmprestimo(payload: BibliotecaEmprestimoCadastro) {
    const { data } = await httpClient.post<{ emprestimo: BibliotecaEmprestimo }>(
      "/api/biblioteca/emprestimos",
      payload
    );
    return data.emprestimo;
  },

  async atualizarEmprestimo(id: string, payload: BibliotecaEmprestimoCadastro) {
    const { data } = await httpClient.put<{ emprestimo: BibliotecaEmprestimo }>(
      `/api/biblioteca/emprestimos/${id}`,
      payload
    );
    return data.emprestimo;
  },

  async removerEmprestimo(id: string) {
    await httpClient.delete(`/api/biblioteca/emprestimos/${id}`);
  },

  async registrarDevolucao(id: string, dataDevolucaoReal: string) {
    const { data } = await httpClient.put<{ emprestimo: BibliotecaEmprestimo }>(
      `/api/biblioteca/emprestimos/${id}/devolucao`,
      { dataDevolucaoReal }
    );
    return data.emprestimo;
  },

  async listarAlertas() {
    const { data } = await httpClient.get<{ alertas: BibliotecaAlerta[] }>("/api/biblioteca/alertas");
    return data.alertas ?? [];
  }
};
