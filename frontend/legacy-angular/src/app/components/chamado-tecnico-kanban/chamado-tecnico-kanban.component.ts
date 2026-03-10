import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { Subject } from 'rxjs';
import { ChamadoStatus, ChamadoTecnicoPayload, ChamadoTecnicoService } from '../../services/chamado-tecnico.service';
import { ActivatedRoute, Router } from '@angular/router';
import { TelaBaseComponent } from '../compartilhado/tela-base.component';
import { TelaPadraoComponent } from '../compartilhado/tela-padrao/tela-padrao.component';
import { PopupMessagesComponent } from '../compartilhado/popup-messages/popup-messages.component';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-chamado-tecnico-kanban',
  standalone: true,
  templateUrl: './chamado-tecnico-kanban.component.html',
  styleUrl: './chamado-tecnico-kanban.component.scss',
  imports: [CommonModule, DragDropModule, TelaPadraoComponent, PopupMessagesComponent],
})
export class ChamadoTecnicoKanbanComponent extends TelaBaseComponent implements OnInit, OnDestroy {
  readonly acoesToolbar = this.criarConfigAcoes({
    buscar: true,
    novo: true,
    salvar: false,
    excluir: false,
    cancelar: false,
    imprimir: false,
  });

  popupErros: string[] = [];
  modoTela: 'usuario' | 'desenvolvedor' = 'usuario';
  colunas: Record<ChamadoStatus, ChamadoTecnicoPayload[]> = {
    ABERTO: [],
    EM_ANALISE: [],
    EM_DESENVOLVIMENTO: [],
    EM_TESTE: [],
    AGUARDANDO_CLIENTE: [],
    RESOLVIDO: [],
    FECHADO: [],
    REABERTO: [],
    CANCELADO: [],
  };
  readonly statusOrdem: ChamadoStatus[] = [
    'ABERTO',
    'EM_ANALISE',
    'EM_DESENVOLVIMENTO',
    'EM_TESTE',
    'AGUARDANDO_CLIENTE',
    'RESOLVIDO',
    'FECHADO',
    'REABERTO',
    'CANCELADO',
  ];

  get listaStatusIds(): string[] {
    return this.statusOrdem.map((status) => `status-${status}`);
  }

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly service: ChamadoTecnicoService,
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly route: ActivatedRoute
  ) {
    super();
  }

  ngOnInit(): void {
    this.route.data.subscribe((data) => {
      this.modoTela = data['perfil'] === 'desenvolvedor' ? 'desenvolvedor' : 'usuario';
    });
    this.carregar();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onBuscar(): void {
    this.carregar();
  }

  onNovo(): void {
    if (this.modoTela === 'desenvolvedor') {
      this.router.navigate(['/configuracoes/chamados-tecnicos']);
      return;
    }
    this.router.navigate(['/configuracoes/chamados-tecnicos/novo']);
  }

  carregar(): void {
    this.service
      .listar({ pagina: 1, tamanho_pagina: 200 })
      .subscribe((response) => this.organizarColunas(response.chamados || []));
  }

  drop(event: CdkDragDrop<ChamadoTecnicoPayload[]>, statusKey: string): void {
    const usuarioId = Number(this.authService.user()?.id || 0) || null;
    if (!usuarioId) {
      return;
    }
    const status = statusKey as ChamadoStatus;
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      return;
    }
    const item = event.previousContainer.data[event.previousIndex];
    if (!item?.id) return;
    transferArrayItem(
      event.previousContainer.data,
      event.container.data,
      event.previousIndex,
      event.currentIndex
    );
    this.service.alterarStatus(item.id, status, usuarioId).subscribe({
      error: () => this.carregar(),
    });
  }

  organizarColunas(chamados: ChamadoTecnicoPayload[]): void {
    Object.keys(this.colunas).forEach((key) => (this.colunas[key as ChamadoStatus] = []));
    chamados.forEach((chamado) => {
      const status = (chamado.status || 'ABERTO') as ChamadoStatus;
      this.colunas[status].push(chamado);
    });
  }

  labelStatus(statusKey: string): string {
    return statusKey.replace(/_/g, ' ');
  }
}

