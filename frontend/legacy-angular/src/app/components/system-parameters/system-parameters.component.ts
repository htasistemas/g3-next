import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faSliders } from '@fortawesome/free-solid-svg-icons';
import { PersonalizacaoComponent } from '../personalizacao/personalizacao.component';
import { UserManagementComponent } from '../user-management/user-management.component';
import { AlertasSistemaComponent } from '../alertas-sistema/alertas-sistema.component';
import { FeriadosGestaoComponent } from '../feriados-gestao/feriados-gestao.component';

import { TelaPadraoComponent } from '../compartilhado/tela-padrao/tela-padrao.component';
type ParameterTabId = 'alertas' | 'feriados' | 'usuarios' | 'personalizacao';

interface ParameterTab {
  id: ParameterTabId;
  label: string;
  description: string;
  badge?: string;
}

@Component({
  selector: 'app-system-parameters',
  standalone: true,
  imports: [
    CommonModule,
    FontAwesomeModule,
    UserManagementComponent,
    PersonalizacaoComponent,
    AlertasSistemaComponent,
    FeriadosGestaoComponent,
    TelaPadraoComponent
  ],
  templateUrl: './system-parameters.component.html',
  styleUrl: './system-parameters.component.scss'
})
export class SystemParametersComponent {
  readonly faSliders = faSliders;
  readonly tabs: ParameterTab[] = [
    {
      id: 'alertas',
      label: 'Alertas do sistema',
      description: 'Controle mensagens e notificações que serão exibidas para os usuários.',
      badge: 'Comunicados'
    },
    {
      id: 'feriados',
      label: 'Feriados',
      description: 'Gerencie o calendário de feriados nacionais e municipais.',
      badge: 'Calendário'
    },
    {
      id: 'usuarios',
      label: 'Usuários e permissões',
      description: 'Gerencie contas de acesso, redefina senhas e mantenha os responsáveis atualizados.',
      badge: 'Segurança'
    },
    {
      id: 'personalizacao',
      label: 'Personalização',
      description: 'Ajuste tema, cores e bordas para alinhar a identidade visual do sistema.',
      badge: 'Experiência'
    }
  ];

  activeTab: ParameterTabId = this.tabs[0].id;

  get activeTabIndex(): number {
    return this.tabs.findIndex((tab) => tab.id === this.activeTab);
  }

  get currentTab(): ParameterTab {
    return this.tabs[this.activeTabIndex] ?? this.tabs[0];
  }

  changeTab(tabId: ParameterTabId): void {
    this.activeTab = tabId;
  }
}
