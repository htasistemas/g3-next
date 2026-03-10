import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RuntimeConfigService } from './runtime-config.service';

export interface NoticiaAssistenciaResponse {
  titulo: string;
  link: string;
  publicadoEm?: string | null;
}

@Injectable({ providedIn: 'root' })
export class NoticiasAssistenciaService {
  private readonly runtimeConfig = inject(RuntimeConfigService);
  private readonly baseUrl = `${this.runtimeConfig.apiUrl}/api/noticias/assistencia`;

  constructor(private readonly http: HttpClient) {}

  listar(limite = 10, rssUrl?: string | null): Observable<NoticiaAssistenciaResponse[]> {
    let params = new HttpParams().set('limite', limite);
    if (rssUrl) {
      params = params.set('rss', rssUrl);
    }
    return this.http.get<NoticiaAssistenciaResponse[]>(this.baseUrl, { params });
  }
}
