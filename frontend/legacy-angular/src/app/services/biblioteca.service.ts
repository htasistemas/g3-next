import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { RuntimeConfigService } from './runtime-config.service';

export type BibliotecaStatusLivro = 'ATIVO' | 'INATIVO';
export type BibliotecaStatusEmprestimo = 'ATIVO' | 'DEVOLVIDO' | 'ATRASADO' | 'CANCELADO';

export interface BibliotecaLivro {
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
}

export interface BibliotecaLivroCadastro {
  codigo: string;
  titulo: string;
  autor: string;
  isbn?: string;
  editora?: string;
  anoPublicacao?: number | null;
  categoria?: string;
  quantidadeTotal: number;
  quantidadeDisponivel: number;
  localizacao?: string;
  status: BibliotecaStatusLivro;
  estadoLivro?: string;
  observacoes?: string;
}

export interface BibliotecaEmprestimo {
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
  dataDevolucaoReal?: string | null;
  status: BibliotecaStatusEmprestimo;
  observacoes?: string;
}

export interface BibliotecaEmprestimoCadastro {
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
}

export interface BibliotecaAlerta {
  emprestimoId: string;
  livroTitulo: string;
  beneficiarioNome?: string;
  dataDevolucaoPrevista: string;
  diasParaVencimento: number;
  status: 'ATRASADO' | 'VENCENDO' | 'EM_DIA';
}

@Injectable({ providedIn: 'root' })
export class BibliotecaService {
  private readonly runtimeConfig = inject(RuntimeConfigService);
  private readonly apiUrlBase = this.runtimeConfig.apiUrl.replace(/\/api\/?$/, '');
  private readonly urlBase = `${this.apiUrlBase}/api/biblioteca`;

  constructor(private readonly http: HttpClient) {}

  listarLivros(): Observable<BibliotecaLivro[]> {
    return this.http
      .get<{ livros: BibliotecaLivro[] }>(`${this.urlBase}/livros`)
      .pipe(map((resposta) => resposta.livros || []));
  }

  obterProximoCodigoLivro(): Observable<string> {
    return this.http
      .get<{ codigo: string }>(`${this.urlBase}/livros/next-code`)
      .pipe(map((resposta) => resposta.codigo || ''));
  }

  criarLivro(dados: BibliotecaLivroCadastro): Observable<BibliotecaLivro> {
    return this.http
      .post<{ livro: BibliotecaLivro }>(`${this.urlBase}/livros`, dados)
      .pipe(map((resposta) => resposta.livro));
  }

  atualizarLivro(id: string, dados: BibliotecaLivroCadastro): Observable<BibliotecaLivro> {
    return this.http
      .put<{ livro: BibliotecaLivro }>(`${this.urlBase}/livros/${id}`, dados)
      .pipe(map((resposta) => resposta.livro));
  }

  excluirLivro(id: string): Observable<void> {
    return this.http.delete<void>(`${this.urlBase}/livros/${id}`);
  }

  listarEmprestimos(): Observable<BibliotecaEmprestimo[]> {
    return this.http
      .get<{ emprestimos: BibliotecaEmprestimo[] }>(`${this.urlBase}/emprestimos`)
      .pipe(map((resposta) => resposta.emprestimos || []));
  }

  criarEmprestimo(dados: BibliotecaEmprestimoCadastro): Observable<BibliotecaEmprestimo> {
    return this.http
      .post<{ emprestimo: BibliotecaEmprestimo }>(`${this.urlBase}/emprestimos`, dados)
      .pipe(map((resposta) => resposta.emprestimo));
  }

  atualizarEmprestimo(id: string, dados: BibliotecaEmprestimoCadastro): Observable<BibliotecaEmprestimo> {
    return this.http
      .put<{ emprestimo: BibliotecaEmprestimo }>(`${this.urlBase}/emprestimos/${id}`, dados)
      .pipe(map((resposta) => resposta.emprestimo));
  }

  excluirEmprestimo(id: string): Observable<void> {
    return this.http.delete<void>(`${this.urlBase}/emprestimos/${id}`);
  }

  registrarDevolucao(id: string, dataDevolucaoReal: string): Observable<BibliotecaEmprestimo> {
    return this.http
      .put<{ emprestimo: BibliotecaEmprestimo }>(`${this.urlBase}/emprestimos/${id}/devolucao`, {
        dataDevolucaoReal
      })
      .pipe(map((resposta) => resposta.emprestimo));
  }

  listarAlertas(): Observable<BibliotecaAlerta[]> {
    return this.http
      .get<{ alertas: BibliotecaAlerta[] }>(`${this.urlBase}/alertas`)
      .pipe(map((resposta) => resposta.alertas || []));
  }
}
