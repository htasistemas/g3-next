import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

export interface ManualSistemaSecaoResumo {
  slug: string;
  titulo: string;
  ordem?: number;
  tags?: string | null;
  atualizadoEm?: string | null;
}

export interface ManualSistemaSecao {
  slug: string;
  titulo: string;
  conteudo?: string | null;
  ordem?: number;
  tags?: string | null;
  atualizadoEm?: string | null;
  atualizadoPor?: string | null;
  versao?: string | null;
}

export interface ManualSistemaResumoResponse {
  secoes: ManualSistemaSecaoResumo[];
  ultimaAtualizacao?: string | null;
}

export interface ManualSistemaMudanca {
  id: number;
  dataMudanca: string;
  autor?: string | null;
  modulo?: string | null;
  tela?: string | null;
  tipo?: string | null;
  descricaoCurta?: string | null;
  descricaoDetalhada?: string | null;
  versaoBuild?: string | null;
  links?: string | null;
}

export interface ManualSistemaMudancaListaResponse {
  mudancas: ManualSistemaMudanca[];
}

@Injectable({ providedIn: 'root' })
export class ManualSistemaService {
  private readonly baseUrl = `${environment.apiUrl}/api/manual-sistema`;

  constructor(private readonly http: HttpClient) {}

  buscarResumo(): Observable<ManualSistemaResumoResponse> {
    return this.http.get<ManualSistemaResumoResponse>(this.baseUrl);
  }

  buscarSecao(slug: string): Observable<ManualSistemaSecao> {
    return this.http.get<ManualSistemaSecao>(`${this.baseUrl}/secoes/${slug}`);
  }

  buscarChangelog(limite = 8): Observable<ManualSistemaMudancaListaResponse> {
    return this.http.get<ManualSistemaMudancaListaResponse>(`${this.baseUrl}/changelog`, {
      params: { limite }
    });
  }
}
