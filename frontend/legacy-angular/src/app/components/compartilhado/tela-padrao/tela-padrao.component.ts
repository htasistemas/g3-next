import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { BarraAcoesCrudComponent } from '../barra-acoes-crud/barra-acoes-crud.component';
import { ConfigAcoesCrud, EstadoAcoesCrud } from '../tela-base.component';

@Component({
  selector: 'app-tela-padrao',
  standalone: true,
  imports: [CommonModule, BarraAcoesCrudComponent],
  templateUrl: './tela-padrao.component.html',
  styleUrl: './tela-padrao.component.scss'
})
export class TelaPadraoComponent {
  @Input() acoes: ConfigAcoesCrud = {};
  @Input() desabilitado: EstadoAcoesCrud = {};
  @Input() carregando: EstadoAcoesCrud = {};
  @Input() mostrarToolbar = true;
  @Input() mostrarFechar = false;
  @Input() fullWidth = false;

  @Output() salvar = new EventEmitter<void>();
  @Output() excluir = new EventEmitter<void>();
  @Output() novo = new EventEmitter<void>();
  @Output() cancelar = new EventEmitter<void>();
  @Output() imprimir = new EventEmitter<void>();
  @Output() buscar = new EventEmitter<void>();
  @Output() fechar = new EventEmitter<void>();
}

