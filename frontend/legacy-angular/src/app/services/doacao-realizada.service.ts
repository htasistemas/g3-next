import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { RuntimeConfigService } from './runtime-config.service';

export interface DoacaoRealizadaItemResponse {
  id: number;
  itemId: number;
  codigoItem: string;
  descricaoItem: string;
  unidadeItem: string;
  quantidade: number;
  observacoes?: string;
}

export interface DoacaoRealizadaResponse {
  id: number;
  beneficiarioId?: number;
  vinculoFamiliarId?: number;
  beneficiarioNome?: string;
  familiaNome?: string;
  tipoDoacao: string;
  situacao: string;
  responsavel?: string;
  observacoes?: string;
  dataDoacao: string;
  itens: DoacaoRealizadaItemResponse[];
}

export interface DoacaoRealizadaRequest {
  beneficiarioId?: number;
  vinculoFamiliarId?: number;
  tipoDoacao: string;
  situacao: string;
  responsavel?: string;
  observacoes?: string;
  dataDoacao: string;
  itens: Array<{
    itemId: number;
    quantidade: number;
    observacoes?: string;
  }>;
}

@Injectable({ providedIn: 'root' })
export class DoacaoRealizadaService {
  private readonly runtimeConfig = inject(RuntimeConfigService);
  private readonly baseUrl = `${this.runtimeConfig.apiUrl}/api/doacoes-realizadas`;

  constructor(private readonly http: HttpClient) {}

  listar(): Observable<DoacaoRealizadaResponse[]> {
    return this.http
      .get<{ doacoes: DoacaoRealizadaResponse[] }>(this.baseUrl)
      .pipe(map((response) => response.doacoes ?? []));
  }

  criar(payload: DoacaoRealizadaRequest): Observable<DoacaoRealizadaResponse> {
    return this.http
      .post<{ doacao: DoacaoRealizadaResponse }>(this.baseUrl, payload)
      .pipe(map((response) => response.doacao));
  }

  atualizar(
    id: number,
    payload: DoacaoRealizadaRequest
  ): Observable<DoacaoRealizadaResponse> {
    return this.http
      .put<{ doacao: DoacaoRealizadaResponse }>(`${this.baseUrl}/${id}`, payload)
      .pipe(map((response) => response.doacao));
  }
}
