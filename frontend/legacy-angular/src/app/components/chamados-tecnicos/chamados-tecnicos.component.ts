import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faHeadset } from '@fortawesome/free-solid-svg-icons';
import { Subject, finalize, takeUntil } from 'rxjs';
import { TelaBaseComponent } from '../compartilhado/tela-base.component';
import { TelaPadraoComponent } from '../compartilhado/tela-padrao/tela-padrao.component';
import { PopupMessagesComponent } from '../compartilhado/popup-messages/popup-messages.component';
import {
  ChamadoTecnicoListaResponse,
  ChamadoTecnicoPayload,
  ChamadoTecnicoService,
  ChamadoStatus,
} from '../../services/chamado-tecnico.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-chamados-tecnicos',
  standalone: true,
  templateUrl: './chamados-tecnicos.component.html',
  styleUrl: './chamados-tecnicos.component.scss',
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    FontAwesomeModule,
    TelaPadraoComponent,
    PopupMessagesComponent
  ],
})
export class ChamadosTecnicosComponent extends TelaBaseComponent implements OnInit, OnDestroy {
  readonly acoesToolbar = this.criarConfigAcoes({
    buscar: true,
    novo: true,
    imprimir: false,
    salvar: false,
    excluir: false,
    cancelar: false,
  });

  chamados: ChamadoTecnicoPayload[] = [];
  total = 0;
  pagina = 1;
  tamanhoPagina = 12;
  carregando = false;
  erroLista: string | null = null;
  popupErros: string[] = [];
  modoTela: 'usuario' | 'desenvolvedor' = 'usuario';
  readonly faHeadset = faHeadset;

  statusOptions: ChamadoStatus[] = [
    'ABERTO',
    'EM_ANALISE',
    'EM_DESENVOLVIMENTO',
    'EM_TESTE',
    'AGUARDANDO_CLIENTE',
    'REABERTO',
    'CANCELADO',
  ];
  statusSelecionado: string = '';
  filtrarResolvidos = false;
  filtrarFechados = false;
  textoFiltro = '';

  private readonly destroy$ = new Subject<void>();
  private listarToken = 0;

  constructor(
    private readonly service: ChamadoTecnicoService,
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly changeDetector: ChangeDetectorRef
  ) {
    super();
  }

  ngOnInit(): void {
    this.route.data.pipe(takeUntil(this.destroy$)).subscribe((data) => {
      this.modoTela = data['perfil'] === 'desenvolvedor' ? 'desenvolvedor' : 'usuario';
    });
    this.listar();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get totalPaginas(): number {
    return Math.max(1, Math.ceil(this.total / this.tamanhoPagina));
  }

  onBuscar(): void {
    this.pagina = 1;
    this.listar();
  }

  onSelecionarStatus(valor: string): void {
    this.statusSelecionado = valor || '';
    this.filtrarResolvidos = false;
    this.pagina = 1;
    this.listar();
  }

  onSelecionarResolvidos(valor: boolean): void {
    this.filtrarResolvidos = !!valor;
    if (this.filtrarResolvidos) {
      this.statusSelecionado = '';
      this.filtrarFechados = false;
    }
    this.pagina = 1;
    this.listar();
  }

  onSelecionarFechados(valor: boolean): void {
    this.filtrarFechados = !!valor;
    if (this.filtrarFechados) {
      this.statusSelecionado = '';
      this.filtrarResolvidos = false;
    }
    this.pagina = 1;
    this.listar();
  }

  onNovo(): void {
    if (this.modoTela === 'desenvolvedor') {
      this.router.navigate(['/configuracoes/chamados-tecnicos-dev/novo']);
      return;
    }
    this.router.navigate(['/configuracoes/chamados-tecnicos/novo']);
  }

  onFechar(): void {
    this.router.navigate(['/dashboard/visao-geral']);
  }

  onNew(): void {
    this.onNovo();
  }

  paginaAnterior(): void {
    if (this.pagina > 1) {
      this.pagina -= 1;
      this.listar();
    }
  }

  proximaPagina(): void {
    if (this.pagina < this.totalPaginas) {
      this.pagina += 1;
      this.listar();
    }
  }

  listar(): void {
    this.carregando = true;
    this.erroLista = null;
    const tokenAtual = ++this.listarToken;
    const filtros = this.normalizeFiltros();
    this.service
      .listar({
        ...filtros,
        pagina: this.pagina,
        tamanho_pagina: this.tamanhoPagina,
      })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.carregando = false;
          this.changeDetector.detectChanges();
        })
      )
      .subscribe({
        next: (response: ChamadoTecnicoListaResponse) => {
          if (tokenAtual !== this.listarToken) return;
          const chamadosResposta = response.chamados ?? [];
          if (this.filtrarResolvidos) {
            this.chamados = chamadosResposta.filter((chamado) => chamado.status === 'RESOLVIDO');
          } else if (this.filtrarFechados) {
            this.chamados = chamadosResposta.filter((chamado) => chamado.status === 'FECHADO');
          } else {
            this.chamados = chamadosResposta.filter(
              (chamado) => chamado.status !== 'RESOLVIDO' && chamado.status !== 'FECHADO'
            );
          }
          this.total = this.chamados.length;
          this.changeDetector.detectChanges();
        },
        error: () => {
          if (tokenAtual !== this.listarToken) return;
          this.erroLista = 'Não foi possível carregar os chamados.';
          this.changeDetector.detectChanges();
        },
      });
  }

  private normalizeFiltros(): {
    status?: string;
    tipo?: string;
    texto?: string;
  } {
    return {
      status: this.filtrarResolvidos
        ? 'RESOLVIDO'
        : this.filtrarFechados
        ? 'FECHADO'
        : this.statusSelecionado || undefined,
      texto: this.textoFiltro || undefined,
    };
  }

  limparFiltros(): void {
    this.textoFiltro = '';
    this.statusSelecionado = '';
    this.filtrarResolvidos = false;
    this.filtrarFechados = false;
    this.listar();
  }

  abrirChamado(chamado: ChamadoTecnicoPayload): void {
    if (!chamado.id) return;
    this.router.navigate([this.rotaBase(), chamado.id]);
  }


  formatStatus(status?: string): string {
    if (!status) return '---';
    return status.replace(/[_-]+/g, ' ');
  }

  formatPrioridade(prioridade?: string): string {
    if (!prioridade) return '---';
    return prioridade.replace(/_/g, ' ');
  }


  statusClass(status?: string): string {
    switch (status) {
      case 'ABERTO':
        return 'pill pill--status pill--status-aberto';
      case 'EM_ANALISE':
        return 'pill pill--status pill--status-analise';
      case 'EM_DESENVOLVIMENTO':
        return 'pill pill--status pill--status-desenvolvimento';
      case 'EM_TESTE':
        return 'pill pill--status pill--status-teste';
      case 'AGUARDANDO_CLIENTE':
        return 'pill pill--status pill--status-aguardando';
      case 'RESOLVIDO':
        return 'pill pill--status pill--status-resolvido';
      case 'REABERTO':
        return 'pill pill--status pill--status-reaberto';
      case 'CANCELADO':
        return 'pill pill--status pill--status-cancelado';
      default:
        return 'pill pill--status';
    }
  }

  prioridadeClass(prioridade?: string): string {
    switch (prioridade) {
      case 'BAIXA':
        return 'pill pill--prioridade pill--prioridade-baixa';
      case 'MEDIA':
        return 'pill pill--prioridade pill--prioridade-media';
      case 'ALTA':
        return 'pill pill--prioridade pill--prioridade-alta';
      case 'CRITICA':
        return 'pill pill--prioridade pill--prioridade-critica';
      default:
        return 'pill pill--prioridade';
    }
  }

  onTextoChange(valor: string): void {
    this.textoFiltro = valor;
    this.pagina = 1;
    this.listar();
  }

  get usuarioAtualId(): number | null {
    return Number(this.authService.user()?.id || 0) || null;
  }

  private rotaBase(): string {
    return this.modoTela === 'desenvolvedor'
      ? '/configuracoes/chamados-tecnicos-dev'
      : '/configuracoes/chamados-tecnicos';
  }

}

