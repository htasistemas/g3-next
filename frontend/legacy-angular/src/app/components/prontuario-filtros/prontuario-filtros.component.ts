import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AutocompleteComponent, AutocompleteOpcao } from '../compartilhado/autocomplete/autocomplete.component';
import { BeneficiarioResumo, ProntuarioFiltro } from '../../services/prontuario.service';

@Component({
  selector: 'app-prontuario-filtros',
  standalone: true,
  imports: [CommonModule, FormsModule, AutocompleteComponent],
  templateUrl: './prontuario-filtros.component.html',
  styleUrl: './prontuario-filtros.component.scss'
})
export class ProntuarioFiltrosComponent {
  @Input() mostrarBuscaBeneficiario = true;
  @Input() filtros: ProntuarioFiltro = {};
  @Input() beneficiarioSelecionado: BeneficiarioResumo | null = null;
  @Input() opcoesBeneficiarios: AutocompleteOpcao[] = [];
  @Input() opcoesProfissionais: AutocompleteOpcao[] = [];
  @Input() opcoesUnidades: AutocompleteOpcao[] = [];
  @Input() termoBusca = '';
  @Input() carregandoBeneficiarios = false;
  @Input() erroBeneficiarios: string | null = null;

  @Output() termoBuscaChange = new EventEmitter<string>();
  @Output() selecionarBeneficiario = new EventEmitter<AutocompleteOpcao>();
  @Output() filtrosChange = new EventEmitter<ProntuarioFiltro>();
  @Output() limpar = new EventEmitter<void>();

  atualizarFiltro<K extends keyof ProntuarioFiltro>(campo: K, valor: ProntuarioFiltro[K]): void {
    this.filtrosChange.emit({ ...this.filtros, [campo]: valor });
  }

  limparFiltros(): void {
    this.limpar.emit();
  }

  toNumber(valor: string | number | null | undefined): number | undefined {
    if (valor === null || valor === undefined || valor === '') {
      return undefined;
    }
    const convertido = Number(valor);
    return Number.isFinite(convertido) ? convertido : undefined;
  }
}

