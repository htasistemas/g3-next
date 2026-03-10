import { CommonModule } from '@angular/common';
import { Component, DoCheck, EventEmitter, Input, Output } from '@angular/core';
import { AcaoCrud, ConfigAcoesCrud, EstadoAcoesCrud } from '../tela-base.component';

@Component({
  selector: 'app-barra-acoes-crud',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './barra-acoes-crud.component.html',
  styleUrl: './barra-acoes-crud.component.scss'
})
export class BarraAcoesCrudComponent implements DoCheck {
  private static readonly ACOES: AcaoCrud[] = ['buscar', 'novo', 'salvar', 'cancelar', 'excluir', 'imprimir'];

  @Input({ required: true }) acoes: ConfigAcoesCrud = {};
  @Input() desabilitado: EstadoAcoesCrud = {};
  @Input() carregando: EstadoAcoesCrud = {};
  @Input() mostrarFechar = false;
  @Input() bloquearCliqueDuplicadoMs = 500;

  @Output() salvar = new EventEmitter<void>();
  @Output() excluir = new EventEmitter<void>();
  @Output() novo = new EventEmitter<void>();
  @Output() cancelar = new EventEmitter<void>();
  @Output() imprimir = new EventEmitter<void>();
  @Output() buscar = new EventEmitter<void>();
  @Output() fechar = new EventEmitter<void>();

  private cooldownPorAcao: Partial<Record<AcaoCrud, number>> = {};
  private pendentePorAcao: Partial<Record<AcaoCrud, boolean>> = {};
  private fecharCooldownAte = 0;

  ngDoCheck(): void {
    for (const acao of BarraAcoesCrudComponent.ACOES) {
      if (this.pendentePorAcao[acao] && !this.desabilitado[acao] && !this.carregando[acao]) {
        this.pendentePorAcao[acao] = false;
      }
    }
  }

  dispararAcao(acao: AcaoCrud, evento: EventEmitter<void>): void {
    if (this.isActionDisabled(acao)) {
      return;
    }
    this.pendentePorAcao[acao] = true;
    this.cooldownPorAcao[acao] = Date.now() + this.bloquearCliqueDuplicadoMs;
    evento.emit();
  }

  fecharUmaVez(): void {
    if (Date.now() < this.fecharCooldownAte) {
      return;
    }
    this.fecharCooldownAte = Date.now() + this.bloquearCliqueDuplicadoMs;
    this.fechar.emit();
  }

  isActionDisabled(acao: AcaoCrud): boolean {
    return Boolean(this.desabilitado[acao] || this.carregando[acao]) || this.isInCooldown(acao);
  }

  isActionLoading(acao: AcaoCrud): boolean {
    if (this.carregando[acao]) {
      return true;
    }
    return Boolean(this.pendentePorAcao[acao] && this.desabilitado[acao]);
  }

  getActionLabel(acao: AcaoCrud, padrao: string): string {
    if (!this.isActionLoading(acao)) {
      return padrao;
    }
    switch (acao) {
      case 'buscar':
        return 'Buscando...';
      case 'salvar':
        return 'Salvando...';
      case 'excluir':
        return 'Excluindo...';
      case 'imprimir':
        return 'Gerando...';
      case 'novo':
        return 'Abrindo...';
      case 'cancelar':
        return 'Cancelando...';
      default:
        return padrao;
    }
  }

  private isInCooldown(acao: AcaoCrud): boolean {
    const limite = this.cooldownPorAcao[acao] ?? 0;
    return limite > Date.now();
  }
}
