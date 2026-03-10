import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  DashboardAssistenciaResponse,
  DashboardAssistenciaService,
  DashboardAtendimento,
  DashboardFamilias,
  DashboardTop12
} from '../../services/dashboard-assistencia.service';

@Component({
  selector: 'app-dashboard-indicators',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard-indicators.component.html',
  styleUrls: ['../dashboard/dashboard.component.scss']
})
export class DashboardIndicatorsComponent implements OnInit {
  filters = {
    startDate: '',
    endDate: ''
  };

  constructor(public readonly dashboardService: DashboardAssistenciaService) {}

  ngOnInit(): void {
    this.dashboardService.fetch();
  }

  get loading(): boolean {
    return this.dashboardService.loading();
  }

  get top12(): DashboardTop12 | null {
    return this.dashboardService.data()?.top12 ?? null;
  }

  get atendimento(): DashboardAtendimento | null {
    return this.dashboardService.data()?.atendimento ?? null;
  }

  get familias(): DashboardFamilias | null {
    return this.dashboardService.data()?.familias ?? null;
  }

  get termos(): DashboardAssistenciaResponse['termos'] | null {
    return this.dashboardService.data()?.termos ?? null;
  }

  refresh(): void {
    this.dashboardService.fetch({
      startDate: this.filters.startDate || null,
      endDate: this.filters.endDate || null
    });
  }

  obterIdadesOrdenadas(atendimento: DashboardAtendimento): { idade: number; quantidade: number }[] {
    const entradas = Object.entries(atendimento.idades || {});
    return entradas
      .map(([idade, quantidade]) => ({ idade: Number(idade), quantidade }))
      .filter((item) => Number.isFinite(item.idade))
      .sort((a, b) => a.idade - b.idade);
  }

  obterTotalIdades(atendimento: DashboardAtendimento): number {
    return this.obterIdadesOrdenadas(atendimento).reduce((total, item) => total + item.quantidade, 0);
  }

  obterMaiorQuantidade(atendimento: DashboardAtendimento): number {
    return this.obterIdadesOrdenadas(atendimento).reduce((maior, item) => Math.max(maior, item.quantidade), 0);
  }

  obterPercentual(quantidade: number, total: number): number {
    if (!total) {
      return 0;
    }
    return Math.round((quantidade / total) * 100);
  }

  obterLarguraBarra(quantidade: number, maximo: number): number {
    if (!maximo) {
      return 0;
    }
    return Math.max(4, Math.round((quantidade / maximo) * 100));
  }
}

