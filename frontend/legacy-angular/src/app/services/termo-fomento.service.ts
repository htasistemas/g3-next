import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { RuntimeConfigService } from './runtime-config.service';

export type TipoTermo = 'Uniao' | 'Estado' | 'Municipio';
export type SituacaoTermo = 'Ativo' | 'Aditivado' | 'Encerrado' | 'Cancelado';

export interface TermoDocumento {
  id?: string;
  nome: string;
  dataUrl?: string;
  tipo?: 'termo' | 'aditivo' | 'outro';
}

export interface AditivoPayload {
  id?: string;
  tipoAditivo: string;
  dataAditivo: string;
  novaDataFim?: string;
  novoValor?: number;
  observacoes?: string;
  anexo?: TermoDocumento | null;
}

export interface TermoFomentoPayload {
  id?: string;
  numeroTermo: string;
  tipoTermo: TipoTermo;
  orgaoConcedente?: string;
  dataAssinatura?: string;
  dataInicioVigencia?: string;
  dataFimVigencia?: string;
  situacao: SituacaoTermo;
  descricaoObjeto?: string;
  valorGlobal?: number;
  responsavelInterno?: string;
  termoDocumento?: TermoDocumento | null;
  documentosRelacionados?: TermoDocumento[];
  aditivos?: AditivoPayload[];
}

@Injectable({ providedIn: 'root' })
export class TermoFomentoService {
  private readonly runtimeConfig = inject(RuntimeConfigService);
  private readonly baseUrl = `${this.runtimeConfig.apiUrl}/api/termos-fomento`;

  constructor(private readonly http: HttpClient) {}

  list(): Observable<TermoFomentoPayload[]> {
    return this.http
      .get<TermoFomentoPayload[]>(this.baseUrl)
      .pipe(map((items) => (items ?? []).map((item) => this.normalizarTermo(item))))
      .pipe(catchError(this.logAndRethrow('ao carregar termos de fomento')));
  }

  getById(id: string): Observable<TermoFomentoPayload> {
    return this.http
      .get<TermoFomentoPayload>(`${this.baseUrl}/${id}`)
      .pipe(map((item) => this.normalizarTermo(item)))
      .pipe(catchError(this.logAndRethrow('ao carregar o termo de fomento')));
  }

  create(payload: TermoFomentoPayload): Observable<TermoFomentoPayload> {
    return this.http
      .post<TermoFomentoPayload>(this.baseUrl, payload)
      .pipe(map((item) => this.normalizarTermo(item)))
      .pipe(catchError(this.logAndRethrow('ao criar o termo de fomento')));
  }

  update(id: string, payload: TermoFomentoPayload): Observable<TermoFomentoPayload> {
    return this.http
      .put<TermoFomentoPayload>(`${this.baseUrl}/${id}`, payload)
      .pipe(map((item) => this.normalizarTermo(item)))
      .pipe(catchError(this.logAndRethrow('ao atualizar o termo de fomento')));
  }

  delete(id: string): Observable<void> {
    return this.http
      .delete<void>(`${this.baseUrl}/${id}`)
      .pipe(catchError(this.logAndRethrow('ao excluir o termo de fomento')));
  }

  addAditivo(termoId: string, aditivo: AditivoPayload): Observable<TermoFomentoPayload> {
    return this.http
      .post<TermoFomentoPayload>(`${this.baseUrl}/${termoId}/aditivos`, aditivo)
      .pipe(map((item) => this.normalizarTermo(item)))
      .pipe(catchError(this.logAndRethrow('ao salvar o aditivo')));
  }

  private normalizarTermo(termo: TermoFomentoPayload): TermoFomentoPayload {
    return {
      ...termo,
      id: termo.id ? String(termo.id) : undefined,
      aditivos: termo.aditivos ?? [],
      documentosRelacionados: termo.documentosRelacionados ?? []
    };
  }

  private logAndRethrow(operation: string) {
    return (error: unknown) => {
      console.error(`Erro ${operation}`, error);
      return throwError(() => error);
    };
  }
}
