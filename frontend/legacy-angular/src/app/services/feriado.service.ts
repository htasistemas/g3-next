import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { RuntimeConfigService } from './runtime-config.service';

export interface FeriadoPayload {
  id?: string;
  data: string;
  descricao: string;
}

@Injectable({ providedIn: 'root' })
export class FeriadoService {
  private readonly runtimeConfig = inject(RuntimeConfigService);
  private readonly baseUrl = `${this.runtimeConfig.apiUrl}/api/feriados`;

  constructor(private readonly http: HttpClient) {}

  listar(): Observable<FeriadoPayload[]> {
    return this.http
      .get<FeriadoPayload[]>(this.baseUrl)
      .pipe(
        map((feriados) => (feriados ?? []).map((item) => this.normalizar(item))),
        catchError(this.logAndRethrow('ao carregar feriados'))
      );
  }

  listarPublicos(ano: number, pais = 'BR'): Observable<FeriadoPayload[]> {
    return this.http
      .get<FeriadoPayload[]>(`${this.baseUrl}/publicos`, { params: { ano, pais } })
      .pipe(
        map((feriados) => (feriados ?? []).map((item) => this.normalizar(item))),
        catchError(this.logAndRethrow('ao carregar feriados publicos'))
      );
  }

  criar(payload: FeriadoPayload): Observable<FeriadoPayload> {
    return this.http
      .post<FeriadoPayload>(this.baseUrl, payload)
      .pipe(
        map((item) => this.normalizar(item)),
        catchError(this.logAndRethrow('ao criar feriado'))
      );
  }

  atualizar(id: string, payload: FeriadoPayload): Observable<FeriadoPayload> {
    return this.http
      .put<FeriadoPayload>(`${this.baseUrl}/${id}`, payload)
      .pipe(
        map((item) => this.normalizar(item)),
        catchError(this.logAndRethrow('ao atualizar feriado'))
      );
  }

  excluir(id: string): Observable<void> {
    return this.http
      .delete<void>(`${this.baseUrl}/${id}`)
      .pipe(catchError(this.logAndRethrow('ao excluir feriado')));
  }

  private normalizar(feriado: FeriadoPayload): FeriadoPayload {
    return {
      ...feriado,
      id: feriado.id ? String(feriado.id) : undefined,
    };
  }

  private logAndRethrow(operacao: string) {
    return (error: unknown) => {
      console.error(`Erro ${operacao}`, error);
      return throwError(() => error);
    };
  }
}
