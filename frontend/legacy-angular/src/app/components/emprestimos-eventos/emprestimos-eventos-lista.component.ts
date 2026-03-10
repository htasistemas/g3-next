import { Component, EventEmitter, Input, Output } from '@angular/core';
import { EmprestimoEventoResponse } from '../../services/emprestimos-eventos.service';

@Component({
  standalone: false,
  selector: 'app-emprestimos-eventos-lista',
  templateUrl: './emprestimos-eventos-lista.component.html',
  styleUrl: './emprestimos-eventos-lista.component.scss'
})
export class EmprestimosEventosListaComponent {
  @Input() emprestimos: EmprestimoEventoResponse[] = [];

  @Output() selecionar = new EventEmitter<EmprestimoEventoResponse>();
  @Output() confirmarRetirada = new EventEmitter<EmprestimoEventoResponse>();
  @Output() confirmarDevolucao = new EventEmitter<EmprestimoEventoResponse>();
  @Output() cancelar = new EventEmitter<EmprestimoEventoResponse>();

  abrir(emprestimo: EmprestimoEventoResponse): void {
    this.selecionar.emit(emprestimo);
  }
}


