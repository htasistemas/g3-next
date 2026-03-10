import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type AdminInfoStatus = 'ATIVO' | 'INATIVO';

export interface InformacaoAdministrativaPayload {
  tipo: string;
  categoria: string;
  titulo: string;
  descricao?: string;
  responsavel?: string;
  hostUrl?: string;
  porta?: number | null;
  login?: string;
  segredo?: string;
  tags?: string;
  status?: boolean;
}

export interface InformacaoAdministrativaResponse {
  id: number;
  tipo: string;
  categoria: string;
  titulo: string;
  descricao?: string;
  responsavel?: string;
  hostUrl?: string;
  porta?: number | null;
  login?: string;
  tags?: string;
  status?: boolean;
  criadoEm?: string;
  criadoPor?: string;
  atualizadoEm?: string;
  atualizadoPor?: string;
}

export interface InformacaoAdministrativaRevealResponse {
  segredo: string;
  expiraEm: string;
}

export interface InformacaoAdministrativaFiltro {
  tipo?: string;
  categoria?: string;
  titulo?: string;
  tags?: string;
  status?: boolean | null;
}

@Injectable({ providedIn: 'root' })
export class InformacoesAdministrativasService {
  private readonly baseUrl = `${environment.apiUrl}/api/admin-info`;

  constructor(private readonly http: HttpClient) {}

  listar(usuarioId: number, filtros: InformacaoAdministrativaFiltro = {}): Observable<InformacaoAdministrativaResponse[]> {
    let params = new HttpParams().set('usuarioId', usuarioId);
    if (filtros.tipo) params = params.set('tipo', filtros.tipo);
    if (filtros.categoria) params = params.set('categoria', filtros.categoria);
    if (filtros.titulo) params = params.set('titulo', filtros.titulo);
    if (filtros.tags) params = params.set('tags', filtros.tags);
    if (filtros.status !== null && filtros.status !== undefined) {
      params = params.set('status', String(filtros.status));
    }
    return this.http.get<InformacaoAdministrativaResponse[]>(this.baseUrl, { params });
  }

  buscarPorId(usuarioId: number, id: number): Observable<InformacaoAdministrativaResponse> {
    const params = new HttpParams().set('usuarioId', usuarioId);
    return this.http.get<InformacaoAdministrativaResponse>(`${this.baseUrl}/${id}`, { params });
  }

  criar(usuarioId: number, payload: InformacaoAdministrativaPayload): Observable<InformacaoAdministrativaResponse> {
    const params = new HttpParams().set('usuarioId', usuarioId);
    return this.http.post<InformacaoAdministrativaResponse>(this.baseUrl, payload, { params });
  }

  atualizar(usuarioId: number, id: number, payload: InformacaoAdministrativaPayload): Observable<InformacaoAdministrativaResponse> {
    const params = new HttpParams().set('usuarioId', usuarioId);
    return this.http.put<InformacaoAdministrativaResponse>(`${this.baseUrl}/${id}`, payload, { params });
  }

  remover(usuarioId: number, id: number): Observable<void> {
    const params = new HttpParams().set('usuarioId', usuarioId);
    return this.http.delete<void>(`${this.baseUrl}/${id}`, { params });
  }

  revelar(usuarioId: number, id: number): Observable<InformacaoAdministrativaRevealResponse> {
    const params = new HttpParams().set('usuarioId', usuarioId);
    return this.http.post<InformacaoAdministrativaRevealResponse>(`${this.baseUrl}/${id}/reveal`, {}, { params });
  }

  registrarCopia(usuarioId: number, id: number): Observable<void> {
    const params = new HttpParams().set('usuarioId', usuarioId);
    return this.http.post<void>(`${this.baseUrl}/${id}/copy-audit`, {}, { params });
  }
}
