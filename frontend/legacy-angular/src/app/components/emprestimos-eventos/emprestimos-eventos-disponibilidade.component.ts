import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { StockItem } from '../../services/almoxarifado.service';
import { Patrimonio } from '../../services/patrimonio.service';
import { TipoItemEmprestimo } from '../../services/emprestimos-eventos.service';

@Component({
  standalone: false,
  selector: 'app-emprestimos-eventos-disponibilidade',
  templateUrl: './emprestimos-eventos-disponibilidade.component.html',
  styleUrl: './emprestimos-eventos-disponibilidade.component.scss'
})
export class EmprestimosEventosDisponibilidadeComponent {
  @Input() form!: FormGroup;
  @Input() patrimonios: Patrimonio[] = [];
  @Input() almoxarifadoItens: StockItem[] = [];
  @Input() resultado: any;

  @Output() consultar = new EventEmitter<void>();

  itemTermo = '';

  get tipoItem(): TipoItemEmprestimo {
    return this.form.get('tipoItem')?.value as TipoItemEmprestimo;
  }

  get opcoesItens(): { id: number; label: string }[] {
    if (this.tipoItem === 'ALMOXARIFADO') {
      return this.almoxarifadoItens.map((item) => ({
        id: Number(item.id),
        label: `${item.description} (${item.code})`
      }));
    }
    return this.patrimonios.map((item) => ({
      id: Number(item.idPatrimonio),
      label: `${item.nome} (${item.numeroPatrimonio})`
    }));
  }
}


