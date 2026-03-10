import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RuntimeConfigService } from './runtime-config.service';

export interface AlertasSistemaConfiguracao {
  alertasSelecionados: string[];
  frequenciaEnvio: string;
}

@Injectable({ providedIn: 'root' })
export class AlertasSistemaService {
  private readonly runtimeConfig = inject(RuntimeConfigService);
  private readonly baseUrl = `${this.runtimeConfig.apiUrl}/api/alertas-sistema`;

  constructor(private readonly http: HttpClient) {}

  obterConfiguracao(): Observable<AlertasSistemaConfiguracao> {
    return this.http.get<AlertasSistemaConfiguracao>(this.baseUrl);
  }

  salvarConfiguracao(
    configuracao: AlertasSistemaConfiguracao
  ): Observable<AlertasSistemaConfiguracao> {
    return this.http.post<AlertasSistemaConfiguracao>(this.baseUrl, configuracao);
  }
}
