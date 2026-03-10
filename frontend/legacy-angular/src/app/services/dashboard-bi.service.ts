import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { RuntimeConfigService } from './runtime-config.service';

export interface ChartResponse {
  labels: string[];
  values: number[];
}

export interface CursosMetricasResponse {
  inscritos: number;
  concluintes: number;
  evasao: number;
  ativos: number;
}

@Injectable({ providedIn: 'root' })
export class DashboardBiService {
  private readonly runtimeConfig = inject(RuntimeConfigService);
  private readonly baseUrl = `${this.runtimeConfig.apiUrl}/api/dashboard/bi`;

  constructor(private readonly http: HttpClient) {}

  getBeneficiariosStatus(): Observable<ChartResponse> {
    return this.http.get<ChartResponse>(`${this.baseUrl}/beneficiarios-status`);
  }

  getAtendimentosMes(): Observable<ChartResponse> {
    return of({ labels: [], values: [] });
  }

  getAtendimentosTipo(): Observable<ChartResponse> {
    return of({ labels: [], values: [] });
  }

  getCursosMetricas(): Observable<CursosMetricasResponse> {
    return of({ inscritos: 0, concluintes: 0, evasao: 0, ativos: 0 });
  }

  getIvfFaixas(): Observable<ChartResponse> {
    return of({ labels: [], values: [] });
  }
}
