import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface AutocompleteOpcao {
  id: string | number;
  label: string;
  sublabel?: string;
}

@Component({
  selector: 'app-autocomplete',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './autocomplete.component.html',
  styleUrl: './autocomplete.component.scss'
})
export class AutocompleteComponent {
  @Input() placeholder = 'Buscar...';
  @Input() carregando = false;
  @Input() erro: string | null = null;
  @Input() opcoes: AutocompleteOpcao[] = [];
  @Input() termo = '';
  aberto = false;

  @Output() termoChange = new EventEmitter<string>();
  @Output() selecionar = new EventEmitter<AutocompleteOpcao>();

  atualizarTermo(valor: string): void {
    this.termoChange.emit(valor);
    this.aberto = !!valor;
  }

  selecionarOpcao(opcao: AutocompleteOpcao, event?: MouseEvent): void {
    event?.preventDefault();
    this.selecionar.emit(opcao);
    this.aberto = false;
  }

  abrirPainel(): void {
    this.aberto = true;
  }

  fecharPainel(): void {
    this.aberto = false;
  }
}

