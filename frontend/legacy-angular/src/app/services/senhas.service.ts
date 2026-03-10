import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { RuntimeConfigService } from './runtime-config.service';

export interface SenhaFilaResponse {
  id: number;
  beneficiarioId: number;
  nomeBeneficiario: string;
  status: string;
  prioridade: number;
  dataHoraEntrada: string;
  unidadeId?: number | null;
  salaAtendimento?: string | null;
}

export interface SenhaChamadaResponse {
  id: string;
  filaId: number;
  beneficiarioId: number;
  nomeBeneficiario: string;
  localAtendimento: string;
  status: string;
  dataHoraChamada: string;
  unidadeId?: number | null;
  chamadoPor: string;
}

export interface SenhaEmitirRequest {
  beneficiarioId: number;
  prioridade?: number | null;
  unidadeId?: number | null;
  usuarioId?: number | null;
  salaAtendimento?: string | null;
}

export interface SenhaChamarRequest {
  filaId: number;
  localAtendimento: string;
  unidadeId?: number | null;
  usuarioId?: number | null;
}

export interface SenhaFinalizarRequest {
  chamadaId: string;
}

@Injectable({ providedIn: 'root' })
export class SenhasService {
  private readonly runtimeConfig = inject(RuntimeConfigService);
  private readonly baseUrl = `${this.runtimeConfig.apiUrl}/api/senhas`;

  constructor(private readonly http: HttpClient) {}

  private normalizarChamada(payload: any): SenhaChamadaResponse {
    if (!payload) {
      return payload as SenhaChamadaResponse;
    }
    return {
      id: payload.id,
      filaId: payload.filaId ?? payload.fila_id,
      beneficiarioId: payload.beneficiarioId ?? payload.beneficiario_id,
      nomeBeneficiario: payload.nomeBeneficiario ?? payload.nome_beneficiario,
      localAtendimento: payload.localAtendimento ?? payload.local_atendimento,
      status: payload.status,
      dataHoraChamada: payload.dataHoraChamada ?? payload.data_hora_chamada,
      unidadeId: payload.unidadeId ?? payload.unidade_id,
      chamadoPor: payload.chamadoPor ?? payload.chamado_por
    } as SenhaChamadaResponse;
  }

  listarAguardando(unidadeId?: number | null): Observable<SenhaFilaResponse[]> {
    let params = new HttpParams();
    if (unidadeId) {
      params = params.set('unidadeId', unidadeId);
    }
    return this.http.get<SenhaFilaResponse[]>(`${this.baseUrl}/aguardando`, { params });
  }

  emitir(request: SenhaEmitirRequest): Observable<SenhaFilaResponse> {
    return this.http.post<SenhaFilaResponse>(`${this.baseUrl}/emitir`, request);
  }

  chamar(request: SenhaChamarRequest): Observable<SenhaChamadaResponse> {
    return this.http
      .post<SenhaChamadaResponse>(`${this.baseUrl}/chamar`, request)
      .pipe(map((payload) => this.normalizarChamada(payload)));
  }

  finalizar(request: SenhaFinalizarRequest): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/finalizar`, request);
  }

  finalizarFila(filaId: number): Observable<void> {
    const params = new HttpParams().set('filaId', filaId);
    return this.http.post<void>(`${this.baseUrl}/finalizar-fila`, null, { params });
  }

  painel(unidadeId?: number | null, limite = 10): Observable<SenhaChamadaResponse[]> {
    let params = new HttpParams().set('limite', limite);
    if (unidadeId) {
      params = params.set('unidadeId', unidadeId);
    }
    return this.http
      .get<SenhaChamadaResponse[]>(`${this.baseUrl}/painel`, { params })
      .pipe(
        map((lista) => {
          const fonte: any =
            Array.isArray(lista)
              ? lista
              : (lista as any)?.dados ?? (lista as any)?.content ?? (lista as any)?.items ?? [];
          return (fonte ?? []).map((item: any) => this.normalizarChamada(item));
        })
      );
  }

  atual(unidadeId?: number | null): Observable<SenhaChamadaResponse | null> {
    let params = new HttpParams();
    if (unidadeId) {
      params = params.set('unidadeId', unidadeId);
    }
    return this.http
      .get<SenhaChamadaResponse | null>(`${this.baseUrl}/atual`, { params })
      .pipe(map((payload) => (payload ? this.normalizarChamada(payload) : null)));
  }
}
