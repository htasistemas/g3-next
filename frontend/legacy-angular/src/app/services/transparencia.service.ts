import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { RuntimeConfigService } from './runtime-config.service';

export type StatusTransparencia = 'concluido' | 'andamento' | 'pendente';

export interface TransparenciaRecebimentoPayload {
  id?: string;
  fonte: string;
  valor?: number;
  periodicidade?: string;
  status?: string;
}

export interface TransparenciaDestinacaoPayload {
  id?: string;
  titulo: string;
  descricao?: string;
  percentual?: number;
}

export interface TransparenciaComprovantePayload {
  id?: string;
  titulo: string;
  descricao?: string;
  arquivoNome?: string;
  arquivoUrl?: string;
}

export interface TransparenciaTimelinePayload {
  id?: string;
  titulo: string;
  detalhe?: string;
  status?: StatusTransparencia;
}

export interface TransparenciaChecklistPayload {
  id?: string;
  titulo: string;
  descricao?: string;
  status?: StatusTransparencia;
}

export interface TransparenciaPayload {
  id?: string;
  unidadeId?: string;
  totalRecebido?: number;
  totalRecebidoHelper?: string;
  totalAplicado?: number;
  totalAplicadoHelper?: string;
  saldoDisponivel?: number;
  saldoDisponivelHelper?: string;
  prestadoMes?: number;
  prestadoMesHelper?: string;
  recebimentos: TransparenciaRecebimentoPayload[];
  destinacoes: TransparenciaDestinacaoPayload[];
  comprovantes: TransparenciaComprovantePayload[];
  timelines: TransparenciaTimelinePayload[];
  checklist: TransparenciaChecklistPayload[];
}

export interface Transparencia extends TransparenciaPayload {
  id: string;
}

@Injectable({ providedIn: 'root' })
export class TransparenciaService {
  private readonly runtimeConfig = inject(RuntimeConfigService);
  private readonly baseUrl = `${this.runtimeConfig.apiUrl}/api/transparencias`;

  constructor(private readonly http: HttpClient) {}

  list(): Observable<Transparencia[]> {
    return this.http
      .get<{ transparencias: Transparencia[] }>(this.baseUrl)
      .pipe(map((response) => response.transparencias));
  }

  get(id: string): Observable<Transparencia> {
    return this.http
      .get<{ transparencia: Transparencia }>(`${this.baseUrl}/${id}`)
      .pipe(map((response) => response.transparencia));
  }

  create(payload: TransparenciaPayload): Observable<Transparencia> {
    return this.http
      .post<{ transparencia: Transparencia }>(this.baseUrl, payload)
      .pipe(map((response) => response.transparencia));
  }

  update(id: string, payload: TransparenciaPayload): Observable<Transparencia> {
    return this.http
      .put<{ transparencia: Transparencia }>(`${this.baseUrl}/${id}`, payload)
      .pipe(map((response) => response.transparencia));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
