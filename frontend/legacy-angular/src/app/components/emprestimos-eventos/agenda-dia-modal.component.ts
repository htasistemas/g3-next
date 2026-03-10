import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { AgendaDiaDetalheResponse } from '../../services/emprestimos-eventos.service';

@Component({
  standalone: false,
  selector: 'app-agenda-dia-modal',
  templateUrl: './agenda-dia-modal.component.html',
  styleUrl: './agenda-dia-modal.component.scss'
})
export class AgendaDiaModalComponent {
  @Input() aberto = false;
  @Input() data: Date | null = null;
  @Input() detalhes: AgendaDiaDetalheResponse[] = [];
  @Input() qtdEmprestimosDia = 0;
  @Input() eventosDia: string[] = [];

  @Output() fechar = new EventEmitter<void>();
  @Output() abrirEmprestimo = new EventEmitter<number>();

  @HostListener('document:keydown.escape')
  onEsc(): void {
    if (this.aberto) {
      this.fechar.emit();
    }
  }

  get rotuloData(): string {
    return this.data ? this.data.toLocaleDateString('pt-BR') : '';
  }

  classeStatus(status?: string): string {
    switch ((status || '').toUpperCase()) {
      case 'RETIRADO':
        return 'status-tag status-tag--retirado';
      case 'AGENDADO':
        return 'status-tag status-tag--agendado';
      case 'DEVOLVIDO':
        return 'status-tag status-tag--devolvido';
      case 'CANCELADO':
        return 'status-tag status-tag--cancelado';
      default:
        return 'status-tag';
    }
  }
}



