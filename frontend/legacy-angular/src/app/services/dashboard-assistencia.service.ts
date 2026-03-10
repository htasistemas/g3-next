import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { finalize } from 'rxjs';
import { RuntimeConfigService } from './runtime-config.service';

export interface DashboardTop12 {
  beneficiariosAtendidosPeriodo: number;
  familiasExtremaPobreza: number;
  rendaMediaFamiliar: number;
  cursosAtivos: number;
  taxaMediaOcupacaoCursos: number;
  certificadosEmitidos: number;
  doacoesPeriodo: number;
  itensDoadoResumo: Record<string, number>;
  visitasDomiciliares: number;
  termosVencendo: number;
  execucaoFinanceira: number;
  absenteismo: number;
}

export interface DashboardAtendimento {
  totalBeneficiarios: number;
  ativos: number;
  pendentes: number;
  bloqueados: number;
  emAnalise: number;
  desatualizados: number;
  cadastroCompletoPercentual: number;
  beneficiariosPeriodo: number;
  novosBeneficiarios: number;
  reincidentes: number;
  faixaEtaria: Record<string, number>;
  idades: Record<string, number>;
  vulnerabilidades: Record<string, number>;
}

export interface DashboardFamilias {
  total: number;
  mediaPessoas: number;
  rendaMediaFamiliar: number;
  rendaPerCapitaMedia: number;
  insegurancaAlimentar: Record<string, number>;
  faixaRenda: Record<string, number>;
}

export interface DashboardTermos {
  ativos: number;
  valorTotal: number;
  alertas: { numero: string; vigenciaFim?: string | null; status?: string | null }[];
}

export interface DashboardCadastros {
  beneficiarios: number;
  profissionais: number;
  voluntarios: number;
  familias: number;
  bensPatrimonio: number;
}

export interface DashboardAssistenciaResponse {
  filters: { startDate: string | null; endDate: string | null };
  cadastros: DashboardCadastros;
  top12: DashboardTop12;
  atendimento: DashboardAtendimento;
  familias: DashboardFamilias;
  termos: DashboardTermos;
  financeiro: {
    valoresAReceber: number;
    valoresEmCaixa: number;
    valoresEmBanco: number;
  };
}

@Injectable({ providedIn: 'root' })
export class DashboardAssistenciaService {
  private readonly runtimeConfig = inject(RuntimeConfigService);
  readonly data = signal<DashboardAssistenciaResponse | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  constructor(private readonly http: HttpClient) {}

  fetch(filters?: { startDate?: string | null; endDate?: string | null }) {
    this.loading.set(true);
    this.error.set(null);

    let params = new HttpParams();
    if (filters?.startDate) params = params.set('startDate', filters.startDate);
    if (filters?.endDate) params = params.set('endDate', filters.endDate);

    this.http
      .get<DashboardAssistenciaResponse>(`${this.runtimeConfig.apiUrl}/api/dashboard/assistencia`, { params })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          this.data.set(response);
        },
        error: (error) => {
          console.error('Erro ao carregar dashboard de assistencia', error);
          this.error.set('Nao foi possivel carregar os indicadores em tempo real.');
        }
      });
  }
}
