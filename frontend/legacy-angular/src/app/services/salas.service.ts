import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { RuntimeConfigService } from './runtime-config.service';

export interface SalaRecord {
  id: string;
  nome: string;
  unidadeId?: number;
}

export interface SalaPayload {
  nome: string;
  unidadeId: number;
}

@Injectable({ providedIn: 'root' })
export class SalasService {
  private readonly runtimeConfig = inject(RuntimeConfigService);
  private readonly baseUrl = `${this.runtimeConfig.apiUrl}/api/salas`;

  constructor(private readonly http: HttpClient) {}

  list(unidadeId?: number): Observable<SalaRecord[]> {
    const params = unidadeId ? { params: { unidadeId } } : undefined;
    return this.http
      .get<{ rooms: SalaRecord[] }>(this.baseUrl, params)
      .pipe(map((response) => response.rooms ?? []));
  }

  create(payload: SalaPayload): Observable<SalaRecord> {
    return this.http
      .post<{ room: SalaRecord }>(this.baseUrl, { nome: payload.nome, unidade_id: payload.unidadeId })
      .pipe(map((response) => response.room));
  }

  update(id: string, payload: SalaPayload): Observable<SalaRecord> {
    return this.http
      .put<{ room: SalaRecord }>(`${this.baseUrl}/${id}`, { nome: payload.nome, unidade_id: payload.unidadeId })
      .pipe(map((response) => response.room));
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
