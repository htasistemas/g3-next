import { Component, Input } from '@angular/core';

@Component({
  standalone: false,
  selector: 'app-emprestimos-eventos-historico',
  templateUrl: './emprestimos-eventos-historico.component.html',
  styleUrl: './emprestimos-eventos-historico.component.scss'
})
export class EmprestimosEventosHistoricoComponent {
  @Input() movimentacoes: any[] = [];
}


