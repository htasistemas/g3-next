import { Component, EventEmitter, Input, Output } from '@angular/core';

interface AgendaDiaView {
  data: Date;
  numero: number;
  pertenceMes: boolean;
  temBloqueio: boolean;
  qtdEmprestimos: number;
}

@Component({
  standalone: false,
  selector: 'app-emprestimos-eventos-agenda',
  templateUrl: './emprestimos-eventos-agenda.component.html',
  styleUrl: './emprestimos-eventos-agenda.component.scss'
})
export class EmprestimosEventosAgendaComponent {
  @Input() mesReferencia: Date = new Date();
  @Input() dias: AgendaDiaView[] = [];

  @Output() selecionarDia = new EventEmitter<AgendaDiaView>();
  @Output() mudarMes = new EventEmitter<number>();

  get rotuloMes(): string {
    return this.mesReferencia.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }

  alterarMes(delta: number): void {
    this.mudarMes.emit(delta);
  }

  selecionar(dia: AgendaDiaView): void {
    this.selecionarDia.emit(dia);
  }
}



