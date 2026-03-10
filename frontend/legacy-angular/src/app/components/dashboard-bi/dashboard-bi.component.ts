import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ChartResponse, CursosMetricasResponse, DashboardBiService } from '../../services/dashboard-bi.service';

@Component({
  selector: 'app-dashboard-bi',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-bi.component.html',
  styleUrl: './dashboard-bi.component.scss'
})
export class DashboardBiComponent implements OnInit {
  beneficiariosStatus: ChartResponse = { labels: [], values: [] };
  atendimentosMes: ChartResponse = { labels: [], values: [] };
  atendimentosTipo: ChartResponse = { labels: [], values: [] };
  cursosMetricas: CursosMetricasResponse = {
    inscritos: 0,
    concluintes: 0,
    evasao: 0,
    ativos: 0
  };
  ivfFaixas: ChartResponse = { labels: [], values: [] };
  loading = false;
  error: string | null = null;

  constructor(private readonly biService: DashboardBiService) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.error = null;
    forkJoin({
      beneficiariosStatus: this.biService.getBeneficiariosStatus(),
      atendimentosMes: this.biService.getAtendimentosMes(),
      atendimentosTipo: this.biService.getAtendimentosTipo(),
      cursosMetricas: this.biService.getCursosMetricas(),
      ivfFaixas: this.biService.getIvfFaixas()
    }).subscribe({
      next: (data) => {
        this.beneficiariosStatus = data.beneficiariosStatus;
        this.atendimentosMes = data.atendimentosMes;
        this.atendimentosTipo = data.atendimentosTipo;
        this.cursosMetricas = data.cursosMetricas;
        this.ivfFaixas = data.ivfFaixas;
        this.loading = false;
      },
      error: () => {
        this.error = 'Nao foi possivel carregar os indicadores do dashboard.';
        this.loading = false;
      }
    });
  }

  trackByIndex(index: number): number {
    return index;
  }

  getIvfPercentage(index: number): number {
    const values = this.ivfFaixas?.values ?? [];
    const total = values.reduce((acc, value) => acc + (value ?? 0), 0) || 1;
    return ((values[index] ?? 0) / total) * 100;
  }

  getAtendimentosTipoPercentage(index: number): number {
    const values = this.atendimentosTipo?.values ?? [];
    const total = values.reduce((acc, value) => acc + (value ?? 0), 0) || 1;
    return ((values[index] ?? 0) / total) * 100;
  }

  getAtendimentosMesPercentage(index: number): number {
    const values = this.atendimentosMes?.values ?? [];
    const max = Math.max(...values, 1);
    return ((values[index] ?? 0) / max) * 100;
  }

  getChartValue(chart: ChartResponse, index: number): number {
    return chart?.values?.[index] ?? 0;
  }
}


