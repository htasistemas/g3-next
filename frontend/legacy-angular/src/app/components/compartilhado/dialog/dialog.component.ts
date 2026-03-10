import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dialog.component.html',
  styleUrl: './dialog.component.scss'
})
export class DialogComponent {
  @Input() aberto = false;
  @Input() titulo = 'Confirmar acao';
  @Input() mensagem = 'Deseja continuar?';
  @Input() mensagemDestaque = false;
  @Input() confirmarLabel = 'Confirmar';
  @Input() cancelarLabel = 'Cancelar';
  @Input() cancelarAoClicarOverlay = true;

  @Output() confirmar = new EventEmitter<void>();
  @Output() cancelar = new EventEmitter<void>();
}

