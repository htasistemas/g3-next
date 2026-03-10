import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { StockItem } from '../../services/almoxarifado.service';
import { EmprestimoEventoItemResponse, TipoItemEmprestimo } from '../../services/emprestimos-eventos.service';
import { Patrimonio } from '../../services/patrimonio.service';

@Component({
  standalone: false,
  selector: 'app-emprestimos-eventos-itens',
  templateUrl: './emprestimos-eventos-itens.component.html',
  styleUrl: './emprestimos-eventos-itens.component.scss'
})
export class EmprestimosEventosItensComponent {
  @Input() form!: FormGroup;
  @Input() itens: EmprestimoEventoItemResponse[] = [];
  @Input() patrimonios: Patrimonio[] = [];
  @Input() almoxarifadoItens: StockItem[] = [];

  @Output() adicionar = new EventEmitter<void>();
  @Output() remover = new EventEmitter<number>();

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


