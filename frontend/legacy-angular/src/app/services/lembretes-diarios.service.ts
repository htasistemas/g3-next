import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface LembreteDiario {
  id: number;
  titulo: string;
  descricao?: string;
  dataInicial: string;
  usuarioId: number;
  todosUsuarios?: boolean;
  recorrencia: string;
  horaAviso?: string;
  status: 'PENDENTE' | 'CONCLUIDO';
  proximaExecucaoEm: string;
  adiadoAte?: string;
  concluidoEm?: string;
  criadoEm?: string;
  atualizadoEm?: string;
}

export interface LembreteDiarioRequest {
  titulo: string;
  descricao?: string;
  dataInicial: string;
  usuarioId: number | null;
  todosUsuarios?: boolean;
  horaAviso?: string | null;
}

export interface LembreteDiarioAdiarRequest {
  novaDataHora: string;
}

@Injectable({ providedIn: 'root' })
export class LembretesDiariosService {
  private readonly baseUrl = `${environment.apiUrl}/api/lembretes-diarios`;

  constructor(private readonly http: HttpClient) {}

  listar(usuarioId?: number): Observable<LembreteDiario[]> {
    const params = usuarioId ? { usuario_id: String(usuarioId) } : undefined;
    return this.http.get<LembreteDiario[]>(this.baseUrl, { params });
  }

  criar(payload: LembreteDiarioRequest): Observable<LembreteDiario> {
    return this.http.post<LembreteDiario>(this.baseUrl, payload);
  }

  atualizar(id: number, payload: LembreteDiarioRequest): Observable<LembreteDiario> {
    return this.http.put<LembreteDiario>(`${this.baseUrl}/${id}`, payload);
  }

  concluir(id: number): Observable<LembreteDiario> {
    return this.http.patch<LembreteDiario>(`${this.baseUrl}/${id}/concluir`, {});
  }

  adiar(id: number, payload: LembreteDiarioAdiarRequest): Observable<LembreteDiario> {
    return this.http.patch<LembreteDiario>(`${this.baseUrl}/${id}/adiar`, payload);
  }

  excluir(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
