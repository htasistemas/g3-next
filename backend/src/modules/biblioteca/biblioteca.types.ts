export type BibliotecaStatusLivro = "ATIVO" | "INATIVO";
export type BibliotecaStatusEmprestimo = "ATIVO" | "DEVOLVIDO" | "ATRASADO" | "CANCELADO";

export type BibliotecaLivroInput = {
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

export type BibliotecaEmprestimoInput = {
  livroId: string;
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

export type BibliotecaLivroRow = {
  id: bigint;
  codigo: string;
  titulo: string;
  autor: string;
  isbn: string | null;
  editora: string | null;
  ano_publicacao: number | null;
  categoria: string | null;
  quantidade_total: number;
  quantidade_disponivel: number;
  localizacao: string | null;
  status: string;
  estado_livro: string | null;
  observacoes: string | null;
  criado_em: Date;
  atualizado_em: Date;
};

export type BibliotecaEmprestimoRow = {
  id: bigint;
  livro_id: bigint;
  livro_titulo: string;
  livro_codigo: string;
  beneficiario_id: string | null;
  beneficiario_nome: string | null;
  responsavel_id: string | null;
  responsavel_nome: string | null;
  data_emprestimo: Date;
  data_devolucao_prevista: Date;
  data_devolucao_real: Date | null;
  status: string;
  observacoes: string | null;
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
