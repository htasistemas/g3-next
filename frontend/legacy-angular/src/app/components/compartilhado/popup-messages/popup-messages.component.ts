import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-popup-messages',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './popup-messages.component.html',
  styleUrl: './popup-messages.component.scss'
})
export class PopupMessagesComponent {
  @Input() mensagens: string[] = [];
  @Input() titulo = 'Campos obrigatorios';
  @Output() fechar = new EventEmitter<void>();

  get aberto(): boolean {
    return (this.mensagens ?? []).length > 0;
  }
}

