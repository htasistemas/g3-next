import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AutocompleteOpcao } from '../compartilhado/autocomplete/autocomplete.component';
import { FormGroup } from '@angular/forms';

@Component({
  standalone: false,
  selector: 'app-emprestimos-eventos-form',
  templateUrl: './emprestimos-eventos-form.component.html',
  styleUrl: './emprestimos-eventos-form.component.scss'
})
export class EmprestimosEventosFormComponent {
  @Input() form!: FormGroup;
  @Input() eventos: { id: number; label: string }[] = [];
  @Input() responsaveis: { id: number; label: string }[] = [];
  @Input() eventoTermo = '';
  @Input() responsavelTermo = '';

  @Output() eventoTermoChange = new EventEmitter<string>();
  @Output() eventoSelecionado = new EventEmitter<AutocompleteOpcao>();
  @Output() criarEvento = new EventEmitter<void>();
  @Output() responsavelTermoChange = new EventEmitter<string>();
  @Output() responsavelSelecionado = new EventEmitter<AutocompleteOpcao>();
}


