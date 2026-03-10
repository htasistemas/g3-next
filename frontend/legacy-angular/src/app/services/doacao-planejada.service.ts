import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { RuntimeConfigService } from './runtime-config.service';

export interface DoacaoPlanejadaResponse {
  id: number;
  beneficiarioId?: number;
  vinculoFamiliarId?: number;
  itemCodigo: string;
  itemDescricao: string;
  itemUnidade: string;
  quantidade: number;
  dataPrevista: string;
  prioridade: string;
  status: string;
  observacoes?: string;
  motivoCancelamento?: string;
}

export interface DoacaoPlanejadaRequest {
  beneficiarioId?: number;
  vinculoFamiliarId?: number;
  itemCodigo: string;
  quantidade: number;
  dataPrevista: string;
  prioridade: string;
  status: string;
  observacoes?: string;
  motivoCancelamento?: string;
}

@Injectable({ providedIn: 'root' })
export class DoacaoPlanejadaService {
  private readonly runtimeConfig = inject(RuntimeConfigService);
  private readonly baseUrl = `${this.runtimeConfig.apiUrl}/api/doacoes-planejadas`;

  constructor(private readonly http: HttpClient) {}

  listar(filtros?: { beneficiarioId?: number; vinculoFamiliarId?: number }): Observable<DoacaoPlanejadaResponse[]> {
    let params = new HttpParams();
    if (filtros?.beneficiarioId) {
      params = params.set('beneficiarioId', String(filtros.beneficiarioId));
    }
    if (filtros?.vinculoFamiliarId) {
      params = params.set('vinculoFamiliarId', String(filtros.vinculoFamiliarId));
    }
    return this.http
      .get<{
        doacoesPlanejadas?: DoacaoPlanejadaResponse[];
        doacaoPlanejada?: DoacaoPlanejadaResponse;
      } | DoacaoPlanejadaResponse[]>(this.baseUrl, { params })
      .pipe(
        map((response) => {
          if (Array.isArray(response)) {
            return response;
          }
          if (response?.doacoesPlanejadas?.length) {
            return response.doacoesPlanejadas;
          }
          if (response?.doacaoPlanejada) {
            return [response.doacaoPlanejada];
          }
          return [];
        })
      );
  }

  criar(payload: DoacaoPlanejadaRequest): Observable<DoacaoPlanejadaResponse> {
    return this.http
      .post<{ doacaoPlanejada: DoacaoPlanejadaResponse }>(this.baseUrl, payload)
      .pipe(map((response) => response.doacaoPlanejada));
  }

  atualizar(id: number, payload: DoacaoPlanejadaRequest): Observable<DoacaoPlanejadaResponse> {
    return this.http
      .put<{ doacaoPlanejada: DoacaoPlanejadaResponse }>(`${this.baseUrl}/${id}`, payload)
      .pipe(map((response) => response.doacaoPlanejada));
  }

  remover(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
