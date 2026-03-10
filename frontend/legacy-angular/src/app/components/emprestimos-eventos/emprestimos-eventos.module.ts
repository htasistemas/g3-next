import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TelaPadraoComponent } from '../compartilhado/tela-padrao/tela-padrao.component';
import { AutocompleteComponent } from '../compartilhado/autocomplete/autocomplete.component';
import { PopupMessagesComponent } from '../compartilhado/popup-messages/popup-messages.component';
import { DialogComponent } from '../compartilhado/dialog/dialog.component';
import { EmprestimosEventosRoutingModule } from './emprestimos-eventos-routing.module';
import { EmprestimosEventosPageComponent } from './emprestimos-eventos-page.component';
import { EmprestimosEventosAgendaComponent } from './emprestimos-eventos-agenda.component';
import { EmprestimosEventosListaComponent } from './emprestimos-eventos-lista.component';
import { EmprestimosEventosFormComponent } from './emprestimos-eventos-form.component';
import { EmprestimosEventosItensComponent } from './emprestimos-eventos-itens.component';
import { EmprestimosEventosDisponibilidadeComponent } from './emprestimos-eventos-disponibilidade.component';
import { EmprestimosEventosHistoricoComponent } from './emprestimos-eventos-historico.component';
import { AgendaDiaModalComponent } from './agenda-dia-modal.component';

@NgModule({
  declarations: [
    EmprestimosEventosPageComponent,
    EmprestimosEventosAgendaComponent,
    EmprestimosEventosListaComponent,
    EmprestimosEventosFormComponent,
    EmprestimosEventosItensComponent,
    EmprestimosEventosDisponibilidadeComponent,
    EmprestimosEventosHistoricoComponent,
    AgendaDiaModalComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    FontAwesomeModule,
    EmprestimosEventosRoutingModule,
    TelaPadraoComponent,
    AutocompleteComponent,
    PopupMessagesComponent,
    DialogComponent
  ]
})
export class EmprestimosEventosModule {}

