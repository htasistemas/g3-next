import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { Router, RouterModule } from '@angular/router';
import {
  DashboardAssistenciaResponse,
  DashboardAssistenciaService,
  DashboardAtendimento,
  DashboardCadastros,
  DashboardFamilias,
  DashboardTop12
} from '../../services/dashboard-assistencia.service';
import { DoacaoRealizadaService } from '../../services/doacao-realizada.service';
import { AlmoxarifadoService } from '../../services/almoxarifado.service';      
import { CursosAtendimentosService } from '../../services/cursos-atendimentos.service';
import { BancoEmpregosService } from '../../services/banco-empregos.service';   
import { TarefasPendenciasService } from '../../services/tarefas-pendencias.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit, OnDestroy {
  private liveRefreshId?: ReturnType<typeof setInterval>;
  private readonly subscriptions = new Subscription();

  doacoesRealizadas = 0;
  empregosAbertos = 0;
  cursosComVagas = 0;
  itensAlmoxarifado = 0;
  pendenciasAbertas = 0;

  constructor(
    public readonly dashboardService: DashboardAssistenciaService,
    private readonly doacaoService: DoacaoRealizadaService,
    private readonly almoxarifadoService: AlmoxarifadoService,
    private readonly cursosService: CursosAtendimentosService,
    private readonly empregosService: BancoEmpregosService,
    private readonly tarefasService: TarefasPendenciasService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.dashboardService.fetch();
    this.startLiveUpdates();
    this.carregarMetricasExtras();
  }

  ngOnDestroy(): void {
    if (this.liveRefreshId) {
      clearInterval(this.liveRefreshId);
    }
    this.subscriptions.unsubscribe();
  }

  get loading(): boolean {
    return this.dashboardService.loading();
  }

  get error(): string | null {
    return this.dashboardService.error();
  }

  get top12(): DashboardTop12 | null {
    return this.dashboardService.data()?.top12 ?? null;
  }

  get cadastros(): DashboardCadastros | null {
    return this.dashboardService.data()?.cadastros ?? null;
  }

  get atendimento(): DashboardAtendimento | null {
    return this.dashboardService.data()?.atendimento ?? null;
  }

  get familias(): DashboardFamilias | null {
    return this.dashboardService.data()?.familias ?? null;
  }

  get realtimeHighlights() {
    return [
      {
        label: 'Beneficiarios agora',
        value: this.top12?.beneficiariosAtendidosPeriodo ?? 0,
        icon: 'monitor_heart',
        accent: 'emerald'
      },
      {
        label: 'Cursos ativos',
        value: this.top12?.cursosAtivos ?? 0,
        icon: 'cast_for_education',
        accent: 'indigo'
      },
      {
        label: 'Visitas domiciliares',
        value: this.top12?.visitasDomiciliares ?? 0,
        icon: 'home_pin',
        accent: 'amber'
      },
      {
        label: 'Execucao financeira',
        value: this.top12?.execucaoFinanceira ?? 0,
        icon: 'stacked_line_chart',
        accent: 'sky',
        suffix: '%'
      }
    ];
  }

  get termos(): DashboardAssistenciaResponse['termos'] | null {
    return this.dashboardService.data()?.termos ?? null;
  }

  get financeiro() {
    return this.dashboardService.data()?.financeiro ?? null;
  }

  get totalFinanceiro(): number {
    if (!this.financeiro) {
      return 0;
    }
    return (
      this.financeiro.valoresAReceber +
      this.financeiro.valoresEmCaixa +
      this.financeiro.valoresEmBanco
    );
  }

  get percentualAReceber(): number {
    return this.calcularPercentual(this.financeiro?.valoresAReceber ?? 0, this.totalFinanceiro);
  }

  get totalCadastros(): number {
    if (!this.cadastros) {
      return 0;
    }
    return (
      this.cadastros.beneficiarios +
      this.cadastros.profissionais +
      this.cadastros.voluntarios +
      this.cadastros.familias
    );
  }

  get percentualBeneficiarios(): number {
    return this.calcularPercentual(this.cadastros?.beneficiarios ?? 0, this.totalCadastros);
  }

  get percentualVoluntarios(): number {
    return this.calcularPercentual(this.cadastros?.voluntarios ?? 0, this.totalCadastros);
  }

  calcularPercentual(valor: number, maximo: number): number {
    if (!maximo) {
      return 0;
    }
    return Math.max(0, Math.min(100, (valor / maximo) * 100));
  }


  refresh() {
    this.dashboardService.fetch();
    this.carregarMetricasExtras();
  }

  navegarPara(rota?: string): void {
    if (!rota) return;
    this.router.navigate([rota]);
  }

  private startLiveUpdates() {
    this.liveRefreshId = setInterval(() => {
      this.dashboardService.fetch();
      this.carregarMetricasExtras();
    }, 30000);
  }

  private carregarMetricasExtras(): void {
    this.subscriptions.add(
      this.doacaoService.listar().subscribe((lista) => {
        this.doacoesRealizadas = lista.length;
      })
    );

    this.subscriptions.add(
      this.almoxarifadoService.listItems().subscribe((items) => {
        this.itensAlmoxarifado = items.length;
      })
    );

    this.subscriptions.add(
      this.cursosService.list().subscribe((records) => {
        this.cursosComVagas = records.filter((item) => (item.vagasDisponiveis ?? 0) > 0).length;
      })
    );

    this.subscriptions.add(
      this.empregosService.list().subscribe((records) => {
        this.empregosAbertos = records.filter((item) => item.dadosVaga.status === 'Aberta').length;
      })
    );

    this.subscriptions.add(
      this.tarefasService.list().subscribe((tarefas) => {
        this.pendenciasAbertas = tarefas.filter((item) => item.status !== 'Concluída').length;
      })
    );
  }

}

