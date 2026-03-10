import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { RuntimeConfigService } from './runtime-config.service';

export interface PatrimonioMovimento {
  idMovimento: string;
  tipo: 'MOVIMENTACAO' | 'MANUTENCAO' | 'BAIXA';
  destino?: string;
  responsavel?: string;
  observacao?: string;
  dataMovimento: string;
}

export interface Patrimonio {
  idPatrimonio: string;
  numeroPatrimonio: string;
  nome: string;
  categoria?: string;
  subcategoria?: string;
  conservacao?: string;
  status?: string;
  dataAquisicao?: string;
  valorAquisicao?: number;
  origem?: string;
  responsavel?: string;
  unidade?: string;
  sala?: string;
  taxaDepreciacao?: number;
  observacoes?: string;
  movimentos?: PatrimonioMovimento[];
}

export interface PatrimonioPayload {
  numeroPatrimonio: string;
  nome: string;
  categoria?: string;
  subcategoria?: string;
  conservacao?: string;
  status?: string;
  dataAquisicao?: string;
  valorAquisicao?: number;
  origem?: string;
  responsavel?: string;
  unidade?: string;
  sala?: string;
  taxaDepreciacao?: number;
  observacoes?: string;
}

@Injectable({ providedIn: 'root' })
export class PatrimonioService {
  private readonly runtimeConfig = inject(RuntimeConfigService);
  private readonly apiBaseUrl = this.runtimeConfig.apiUrl.replace(/\/api\/?$/, '');
  private readonly baseUrl = `${this.apiBaseUrl}/api/patrimonios`;

  constructor(private readonly http: HttpClient) {}

  list(): Observable<Patrimonio[]> {
    return this.http
      .get<{ patrimonios: Patrimonio[] }>(this.baseUrl)
      .pipe(map((response) => response.patrimonios));
  }

  create(payload: PatrimonioPayload): Observable<Patrimonio> {
    return this.http
      .post<{ patrimonio: Patrimonio }>(this.baseUrl, payload)
      .pipe(map((response) => response.patrimonio));
  }

  update(id: string, payload: PatrimonioPayload): Observable<Patrimonio> {
    return this.http
      .put<{ patrimonio: Patrimonio }>(`${this.baseUrl}/${id}`, payload)
      .pipe(map((response) => response.patrimonio));
  }

  registerMovement(
    patrimonioId: string,
    movement: { tipo: PatrimonioMovimento['tipo']; destino?: string; responsavel?: string; observacao?: string }
  ): Observable<Patrimonio> {
    return this.http
      .post<{ patrimonio: Patrimonio }>(`${this.baseUrl}/${patrimonioId}/movimentos`, movement)
      .pipe(map((response) => response.patrimonio));
  }
}
