import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faBell } from '@fortawesome/free-solid-svg-icons';
import { finalize } from 'rxjs/operators';
import { AlertasSistemaService } from '../../services/alertas-sistema.service';
import { PopupErrorBuilder } from '../../utils/popup-error.builder';
import { TelaPadraoComponent } from '../compartilhado/tela-padrao/tela-padrao.component';
import {
  ConfigAcoesCrud,
  EstadoAcoesCrud,
  TelaBaseComponent,
} from '../compartilhado/tela-base.component';
import { PopupMessagesComponent } from '../compartilhado/popup-messages/popup-messages.component';

interface AlertaOpcao {
  id: string;
  label: string;
}

@Component({
  selector: 'app-alertas-sistema',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FontAwesomeModule,
    TelaPadraoComponent,
    PopupMessagesComponent,
  ],
  templateUrl: './alertas-sistema.component.html',
  styleUrl: './alertas-sistema.component.scss',
})
export class AlertasSistemaComponent
  extends TelaBaseComponent
  implements OnInit
{
  readonly alertasDisponiveis: AlertaOpcao[] = [
    { id: 'chamados_tecnicos', label: 'Chamados técnicos' },
    { id: 'beneficiarios_novos', label: 'Novos beneficiários' },
    { id: 'beneficiarios_atualizados', label: 'Atualizações de beneficiários' },
    { id: 'estoque_baixo', label: 'Estoque baixo' },
    { id: 'tarefas_pendentes', label: 'Tarefas pendentes' },
    { id: 'vagas_cursos', label: 'Vagas de cursos e atendimentos' },
  ];
  readonly frequenciasEnvio = [
    { id: 'imediato', label: 'Imediato' },
    { id: 'diario', label: 'Diário' },
    { id: 'semanal', label: 'Semanal' },
    { id: 'mensal', label: 'Mensal' },
  ];

  formulario: FormGroup;
  popupErros: string[] = [];
  feedback: string | null = null;
  carregando = false;
  readonly faBell = faBell;

  readonly acoesToolbar: Required<ConfigAcoesCrud> = this.criarConfigAcoes({
    salvar: true,
    excluir: false,
    novo: true,
    cancelar: true,
    imprimir: false,
    buscar: false,
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly alertasService: AlertasSistemaService
  ) {
    super();
    this.formulario = this.fb.group({
      frequenciaEnvio: ['imediato', Validators.required],
      alertas: this.fb.array([]),
    });
    this.alertasDisponiveis.forEach(() =>
      this.alertasFormArray.push(new FormControl(false))
    );
  }

  ngOnInit(): void {
    this.carregarConfiguracao();
  }

  get alertasFormArray(): FormArray {
    return this.formulario.get('alertas') as FormArray;
  }

  get acoesDesabilitadas(): EstadoAcoesCrud {
    return {
      salvar: this.carregando || this.formulario.invalid,
      excluir: true,
      novo: this.carregando,
      cancelar: this.carregando,
      imprimir: true,
      buscar: true,
    };
  }

  salvar(): void {
    this.popupErros = [];
    this.feedback = null;

    const alertasSelecionados = this.obterAlertasSelecionados();
    if (alertasSelecionados.length === 0) {
      const builder = new PopupErrorBuilder();
      builder.adicionar('Selecione ao menos um alerta para enviar.');
      this.popupErros = builder.build();
      return;
    }

    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      const builder = new PopupErrorBuilder();
      builder.adicionar('Informe a frequência de envio.');
      this.popupErros = builder.build();
      return;
    }

    const frequenciaEnvio = this.formulario.get('frequenciaEnvio')?.value as string;
    this.carregando = true;

    this.alertasService
      .salvarConfiguracao({ alertasSelecionados, frequenciaEnvio })
      .pipe(finalize(() => (this.carregando = false)))
      .subscribe({
        next: () => {
          this.feedback =
            'Alertas atualizados e enviados para o e-mail da instituição.';
        },
        error: () => {
          this.feedback =
            'Não foi possível salvar os alertas do sistema. Tente novamente.';
        },
      });
  }

  novo(): void {
    this.resetarFormulario();
  }

  cancelar(): void {
    this.resetarFormulario();
  }

  fechar(): void {
    window.history.back();
  }

  fecharPopup(): void {
    this.popupErros = [];
  }

  private carregarConfiguracao(): void {
    this.carregando = true;
    this.alertasService
      .obterConfiguracao()
      .pipe(finalize(() => (this.carregando = false)))
      .subscribe({
        next: (configuracao) => {
          const selecionados = new Set(configuracao.alertasSelecionados ?? []);
          this.alertasDisponiveis.forEach((alerta, index) => {
            this.alertasFormArray.at(index).setValue(selecionados.has(alerta.id));
          });
          if (configuracao.frequenciaEnvio) {
            this.formulario
              .get('frequenciaEnvio')
              ?.setValue(configuracao.frequenciaEnvio);
          }
        },
        error: () => {
          this.feedback =
            'Não foi possível carregar os alertas do sistema. Tente novamente.';
        },
      });
  }

  private obterAlertasSelecionados(): string[] {
    return this.alertasDisponiveis
      .filter((_, index) => this.alertasFormArray.at(index).value === true)
      .map((alerta) => alerta.id);
  }

  private resetarFormulario(): void {
    this.feedback = null;
    this.popupErros = [];
    this.formulario.reset({ frequenciaEnvio: 'imediato' });
    this.alertasFormArray.controls.forEach((control) =>
      control.setValue(false)
    );
  }
}

