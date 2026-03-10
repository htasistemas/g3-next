export type BibliotecaStatusLivro = "ATIVO" | "INATIVO";
export type BibliotecaStatusEmprestimo = "ATIVO" | "DEVOLVIDO" | "ATRASADO" | "CANCELADO";

export type BibliotecaLivro = {
  id: string;
  codigo: string;
  titulo: string;
  autor: string;
  isbn?: string;
  editora?: string;
  anoPublicacao?: number;
  categoria?: string;
  quantidadeTotal: number;
  quantidadeDisponivel: number;
  localizacao?: string;
  status: BibliotecaStatusLivro;
  estadoLivro?: string;
  observacoes?: string;
  criadoEm?: string;
  atualizadoEm?: string;
};

export type BibliotecaLivroCadastro = {
  codigo: string;
  titulo: string;
  autor: string;
  isbn?: string | null;
  editora?: string | null;
  anoPublicacao?: number | null;
  categoria?: string | null;
  quantidadeTotal: number;
  quantidadeDisponivel: number;
  localizacao?: string | null;
  status: BibliotecaStatusLivro;
  estadoLivro?: string | null;
  observacoes?: string | null;
};

export type BibliotecaLivroIsbnConsulta = {
  isbn: string;
  titulo: string;
  subtitulo?: string;
  autor: string;
  autores: string[];
  editora?: string;
  anoPublicacao?: number;
  categoria?: string;
  sinopse?: string;
  capaUrl?: string;
};

export type BibliotecaEmprestimo = {
  id: string;
  livroId: string;
  livroTitulo?: string;
  livroCodigo?: string;
  beneficiarioId?: string;
  beneficiarioNome?: string;
  responsavelId?: string;
  responsavelNome?: string;
  dataEmprestimo: string;
  dataDevolucaoPrevista: string;
  dataDevolucaoReal?: string;
  status: BibliotecaStatusEmprestimo;
  observacoes?: string;
};

export type BibliotecaEmprestimoCadastro = {
  livroId: string;
  livroNome?: string | null;
  beneficiarioId?: string | null;
  beneficiarioNome?: string | null;
  responsavelId?: string | null;
  responsavelNome?: string | null;
  dataEmprestimo: string;
  dataDevolucaoPrevista: string;
  dataDevolucaoReal?: string | null;
  status?: BibliotecaStatusEmprestimo;
  observacoes?: string | null;
};

export type BibliotecaAlerta = {
  emprestimoId: string;
  livroTitulo: string;
  beneficiarioNome?: string;
  dataDevolucaoPrevista: string;
  diasParaVencimento: number;
  status: "ATRASADO" | "VENCENDO" | "EM_DIA";
};
