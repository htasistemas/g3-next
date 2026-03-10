import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RuntimeConfigService } from './runtime-config.service';

export interface SenhasConfigResponse {
  fraseFala: string;
  rssUrl: string;
  velocidadeTicker: number;
  modoNoticias?: string | null;
  noticiasManuais?: string | null;
  quantidadeUltimasChamadas: number;
  unidadePainelId?: number | null;
  tituloTela?: string | null;
  descricaoTela?: string | null;
}

export interface SenhasConfigRequest {
  fraseFala: string;
  rssUrl: string;
  velocidadeTicker: number;
  modoNoticias?: string | null;
  noticiasManuais?: string | null;
  quantidadeUltimasChamadas: number;
  unidadePainelId?: number | null;
  tituloTela?: string | null;
  descricaoTela?: string | null;
}

@Injectable({ providedIn: 'root' })
export class SenhasConfigService {
  private readonly runtimeConfig = inject(RuntimeConfigService);
  private readonly baseUrl = `${this.runtimeConfig.apiUrl}/api/senhas/config`;

  constructor(private readonly http: HttpClient) {}

  obter(): Observable<SenhasConfigResponse> {
    return this.http.get<SenhasConfigResponse>(this.baseUrl);
  }

  atualizar(payload: SenhasConfigRequest): Observable<SenhasConfigResponse> {
    return this.http.put<SenhasConfigResponse>(this.baseUrl, payload);
  }
}
