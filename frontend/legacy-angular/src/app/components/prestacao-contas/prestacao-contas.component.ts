import { Component } from '@angular/core';

import { CommonModule } from '@angular/common';

import {

  FormArray,

  FormBuilder,

  FormGroup,

  ReactiveFormsModule

} from '@angular/forms';

import { Router } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

import { PopupErrorBuilder } from '../../utils/popup-error.builder';

import { titleCaseWords } from '../../utils/capitalization.util';

import { PopupMessagesComponent } from '../compartilhado/popup-messages/popup-messages.component';

import { TelaPadraoComponent } from '../compartilhado/tela-padrao/tela-padrao.component';

import { ConfigAcoesCrud, EstadoAcoesCrud, TelaBaseComponent } from '../compartilhado/tela-base.component';

import {

  Transparencia,

  TransparenciaChecklistPayload,

  TransparenciaComprovantePayload,

  TransparenciaDestinacaoPayload,

  TransparenciaPayload,

  TransparenciaRecebimentoPayload,

  TransparenciaService,

  TransparenciaTimelinePayload

} from '../../services/transparencia.service';

import {


  faArrowTrendUp,


  faBookOpen,


  faChartPie,


  faCircleCheck,


  faCircleExclamation,


  faCloudArrowUp,

  faFileLines,

  faHandHoldingHeart,

  faListCheck,

  faShareNodes,

  faReceipt

} from '@fortawesome/free-solid-svg-icons';




interface PrestacaoTab {

  id: 'resumo' | 'fluxo' | 'transparencia' | 'listagem';

  label: string;

  helper: string;

}




@Component({


  selector: 'app-prestacao-contas',

  standalone: true,

  imports: [CommonModule, ReactiveFormsModule, FontAwesomeModule, TelaPadraoComponent, PopupMessagesComponent],

  templateUrl: './prestacao-contas.component.html',

  styleUrl: './prestacao-contas.component.scss'

})

export class PrestacaoContasComponent extends TelaBaseComponent {

  readonly faBookOpen = faBookOpen;

  readonly faListCheck = faListCheck;

  readonly faFileLines = faFileLines;

  readonly faHandHoldingHeart = faHandHoldingHeart;

  readonly faShareNodes = faShareNodes;

  readonly faReceipt = faReceipt;

  readonly faCloudArrowUp = faCloudArrowUp;

  readonly faCircleCheck = faCircleCheck;


  readonly faCircleExclamation = faCircleExclamation;


  readonly faArrowTrendUp = faArrowTrendUp;

  readonly faChartPie = faChartPie;



  readonly acoesToolbar: Required<ConfigAcoesCrud> = this.criarConfigAcoes({    

    salvar: true,

    excluir: true,

    novo: true,

    cancelar: true,

    imprimir: true,

    buscar: true

  });



  popupErros: string[] = [];

  private popupTimeout?: ReturnType<typeof setTimeout>;

  saving = false;

  editingId: string | null = null;



  tabs: PrestacaoTab[] = [

    {


      id: 'resumo',


      label: 'Resumo financeiro',


      helper: 'Visão geral dos recursos recebidos, aplicados e saldo disponível.'


    },


    {


      id: 'fluxo',


      label: 'Entradas e destinação',


      helper: 'Detalhamento das fontes de recursos e o percentual aplicado em cada frente.'


    },


    {

      id: 'transparencia',

      label: 'Transparência e evidências',

      helper: 'Linha do tempo das entregas, checklist e comprovantes anexados.' 

    },

    {

      id: 'listagem',

      label: 'Listagem de registros',

      helper: 'Histórico dos registros de transparência cadastrados.'

    }

  ];



  activeTab: PrestacaoTab['id'] = this.tabs[0].id;



  statusItens = ['concluido', 'andamento', 'pendente'];



  form: FormGroup;

  registros: Transparencia[] = [];



  constructor(

    private readonly fb: FormBuilder,

    private readonly transparenciaService: TransparenciaService,

    private readonly router: Router

  ) {

    super();

    this.form = this.buildForm();

    this.loadTransparencias();

  }




  get activeTabIndex(): number {

    return this.tabs.findIndex((tab) => tab.id === this.activeTab);

  }




  get activeTabHelper(): string {


    return this.tabs[this.activeTabIndex]?.helper ?? '';


  }





  changeTab(tabId: PrestacaoTab['id']): void {

    this.activeTab = tabId;

  }



  onBuscar(): void {

    this.changeTab('listagem');

    this.loadTransparencias();

  }



  get recebimentos(): FormArray {

    return this.form.get('recebimentos') as FormArray;

  }



  get destinacoes(): FormArray {

    return this.form.get('destinacoes') as FormArray;

  }



  get comprovantes(): FormArray {

    return this.form.get('comprovantes') as FormArray;

  }



  get timelines(): FormArray {

    return this.form.get('timelines') as FormArray;

  }



  get checklist(): FormArray {

    return this.form.get('checklist') as FormArray;

  }



  get acoesDesabilitadas(): EstadoAcoesCrud {

    return {

      salvar: this.saving,

      excluir: !this.editingId,

      novo: this.saving,

      cancelar: this.saving,

      imprimir: this.saving,

      buscar: this.saving

    };

  }



  buildForm(): FormGroup {

    return this.fb.group({

      resumo: this.fb.group({

        totalRecebido: [''],

        totalRecebidoHelper: [''],

        totalAplicado: [''],

        totalAplicadoHelper: [''],

        saldoDisponivel: [''],

        saldoDisponivelHelper: [''],

        prestadoMes: [''],

        prestadoMesHelper: ['']

      }),

      recebimentos: this.fb.array([]),

      destinacoes: this.fb.array([]),

      comprovantes: this.fb.array([]),

      timelines: this.fb.array([]),

      checklist: this.fb.array([])

    });

  }



  addRecebimento(item?: TransparenciaRecebimentoPayload): void {

    this.recebimentos.push(

      this.fb.group({

        id: [item?.id],

        fonte: [item?.fonte || ''],

        valor: [item?.valor !== undefined && item?.valor !== null ? this.formatCurrencyValue(item.valor, true) : ''],

        periodicidade: [item?.periodicidade || ''],

        status: [item?.status || 'OK']

      })

    );

  }



  removeRecebimento(index: number): void {

    this.recebimentos.removeAt(index);

  }



  addDestinacao(item?: TransparenciaDestinacaoPayload): void {

    this.destinacoes.push(

      this.fb.group({

        id: [item?.id],

        titulo: [item?.titulo || ''],

        descricao: [item?.descricao || ''],

        percentual: [item?.percentual ?? null]

      })

    );

  }



  removeDestinacao(index: number): void {

    this.destinacoes.removeAt(index);

  }



  addComprovante(item?: TransparenciaComprovantePayload): void {

    this.comprovantes.push(

      this.fb.group({

        id: [item?.id],

        titulo: [item?.titulo || ''],

        descricao: [item?.descricao || ''],

        arquivoNome: [item?.arquivoNome || ''],

        arquivoUrl: [item?.arquivoUrl || '']

      })

    );

  }



  removeComprovante(index: number): void {

    this.comprovantes.removeAt(index);

  }



  addTimeline(item?: TransparenciaTimelinePayload): void {

    this.timelines.push(

      this.fb.group({

        id: [item?.id],

        titulo: [item?.titulo || ''],

        detalhe: [item?.detalhe || ''],

        status: [item?.status || 'pendente']

      })

    );

  }



  removeTimeline(index: number): void {

    this.timelines.removeAt(index);

  }



  addChecklist(item?: TransparenciaChecklistPayload): void {

    this.checklist.push(

      this.fb.group({

        id: [item?.id],

        titulo: [item?.titulo || ''],

        descricao: [item?.descricao || ''],

        status: [item?.status || 'pendente']

      })

    );

  }



  removeChecklist(index: number): void {

    this.checklist.removeAt(index);

  }



  onResumoValorInput(event: Event, path: (string | number)[]): void {

    const input = event.target as HTMLInputElement;

    const valor = this.formatCurrencyInput(input, true);

    this.form.get(path)?.setValue(valor, { emitEvent: false });

  }



  onRecebimentoValorInput(event: Event, index: number): void {

    const input = event.target as HTMLInputElement;

    const valor = this.formatCurrencyInput(input, true);

    this.recebimentos.at(index).get('valor')?.setValue(valor, { emitEvent: false });

  }



  onComprovanteSelecionado(event: Event, index: number): void {

    const input = event.target as HTMLInputElement;

    const file = input.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {

      this.comprovantes.at(index).patchValue({

        arquivoNome: file.name,

        arquivoUrl: typeof reader.result === 'string' ? reader.result : ''

      });

    };

    reader.readAsDataURL(file);

    input.value = '';

  }



  capitalizarCampo(caminho: (string | number)[]): void {

    const control = this.form.get(caminho);

    const valor = control?.value as string;

    if (!control || !valor) return;

    control.setValue(titleCaseWords(valor), { emitEvent: false });

  }



  salvar(): void {

    this.popupErros = [];

    this.saving = true;

    const resumo = this.form.get('resumo')?.value || {};

    const payload: TransparenciaPayload = {

      totalRecebido: this.parseCurrencyValue(resumo.totalRecebido),

      totalRecebidoHelper: resumo.totalRecebidoHelper,

      totalAplicado: this.parseCurrencyValue(resumo.totalAplicado),

      totalAplicadoHelper: resumo.totalAplicadoHelper,

      saldoDisponivel: this.parseCurrencyValue(resumo.saldoDisponivel),

      saldoDisponivelHelper: resumo.saldoDisponivelHelper,

      prestadoMes: this.parseCurrencyValue(resumo.prestadoMes),

      prestadoMesHelper: resumo.prestadoMesHelper,

      recebimentos: this.mapRecebimentos(),

      destinacoes: this.mapDestinacoes(),

      comprovantes: this.mapComprovantes(),

      timelines: this.timelines.value,

      checklist: this.checklist.value

    };

    const request$ = this.editingId

      ? this.transparenciaService.update(this.editingId, payload)

      : this.transparenciaService.create(payload);

    request$.subscribe({

      next: (registro: Transparencia) => {

        this.saving = false;

        this.editingId = registro.id;

        this.loadTransparencias();

        this.mostrarPopup('Transparência salva com sucesso.');

      },

      error: () => {

        this.saving = false;

        this.mostrarPopup('Não foi possível salvar a transparência.');

      }

    });

  }



  excluir(): void {

    if (!this.editingId) return;

    if (!confirm('Deseja excluir este registro de transparência?')) return;

    this.transparenciaService.delete(this.editingId).subscribe({

      next: () => {

        this.mostrarPopup('Transparencia excluída com sucesso.');

        this.novo();

        this.loadTransparencias();

      },

      error: () => {

        this.mostrarPopup('Não foi possível excluir a transparência.');

      }

    });

  }



  novo(): void {

    this.editingId = null;

    this.form = this.buildForm();

    this.recebimentos.clear();

    this.destinacoes.clear();

    this.comprovantes.clear();

    this.timelines.clear();

    this.checklist.clear();

  }



  cancelar(): void {

    if (this.registros.length) {

      this.patchForm(this.registros[0]);

    } else {

      this.novo();

    }

  }



  editarRegistro(registro: Transparencia): void {

    this.patchForm(registro);

    this.activeTab = 'resumo';

  }



  excluirRegistro(registro: Transparencia): void {

    if (!registro.id) return;

    if (!confirm('Deseja excluir este registro de transparência?')) return;

    this.transparenciaService.delete(registro.id).subscribe({

      next: () => {

        this.mostrarPopup('Transparencia excluída com sucesso.');

        this.loadTransparencias();

        if (this.editingId === registro.id) {

          this.novo();

        }

      },

      error: () => {

        this.mostrarPopup('Não foi possível excluir a transparência.');

      }

    });

  }



  imprimirRegistro(registro: Transparencia): void {

    this.patchForm(registro);

    this.imprimir();

  }



  imprimir(): void {

    const resumo = this.form.get('resumo')?.value || {};

    const payload = {

      resumo,

      recebimentos: this.recebimentos.value,

      destinacoes: this.destinacoes.value,

      comprovantes: this.comprovantes.value,

      timelines: this.timelines.value,

      checklist: this.checklist.value

    };

    const popup = window.open('', '_blank', 'width=900,height=700');

    if (!popup) return;

    popup.document.write('<pre>' + JSON.stringify(payload, null, 2) + '</pre>');

  }



  fechar(): void {

    this.router.navigate(['/financeiro/prestacao-contas']);

  }



  fecharPopupErros(): void {

    this.popupErros = [];

    if (this.popupTimeout) {

      clearTimeout(this.popupTimeout);

      this.popupTimeout = undefined;

    }

  }



  loadTransparencias(): void {

    this.transparenciaService.list().subscribe({

      next: (registros: Transparencia[]) => {

        this.registros = registros;

        if (registros.length) {

          const ultimo = [...registros].sort((a, b) => Number(b.id) - Number(a.id))[0];

          this.patchForm(ultimo);

        }

      },

      error: () => {

        this.mostrarPopup('Não foi possível carregar os registros de transparência.');

      }

    });

  }



  patchForm(registro: Transparencia): void {

    this.editingId = registro.id;

    this.recebimentos.clear();

    this.destinacoes.clear();

    this.comprovantes.clear();

    this.timelines.clear();

    this.checklist.clear();

    this.form.patchValue({

      resumo: {

        totalRecebido:

          registro.totalRecebido !== undefined && registro.totalRecebido !== null

            ? this.formatCurrencyValue(registro.totalRecebido, true)

            : '',

        totalRecebidoHelper: registro.totalRecebidoHelper || '',

        totalAplicado:

          registro.totalAplicado !== undefined && registro.totalAplicado !== null

            ? this.formatCurrencyValue(registro.totalAplicado, true)

            : '',

        totalAplicadoHelper: registro.totalAplicadoHelper || '',

        saldoDisponivel:

          registro.saldoDisponivel !== undefined && registro.saldoDisponivel !== null

            ? this.formatCurrencyValue(registro.saldoDisponivel, true)

            : '',

        saldoDisponivelHelper: registro.saldoDisponivelHelper || '',

        prestadoMes:

          registro.prestadoMes !== undefined && registro.prestadoMes !== null

            ? this.formatCurrencyValue(registro.prestadoMes, true)

            : '',

        prestadoMesHelper: registro.prestadoMesHelper || ''

      }

    });

    (registro.recebimentos || []).forEach((item: TransparenciaRecebimentoPayload) => this.addRecebimento(item));

    (registro.destinacoes || []).forEach((item: TransparenciaDestinacaoPayload) => this.addDestinacao(item));

    (registro.comprovantes || []).forEach((item: TransparenciaComprovantePayload) => this.addComprovante(item));

    (registro.timelines || []).forEach((item: TransparenciaTimelinePayload) => this.addTimeline(item));

    (registro.checklist || []).forEach((item: TransparenciaChecklistPayload) => this.addChecklist(item));

  }



  mostrarPopup(mensagem: string): void {

    this.popupErros = new PopupErrorBuilder().adicionar(mensagem).build();

    if (this.popupTimeout) {

      clearTimeout(this.popupTimeout);

    }

    this.popupTimeout = setTimeout(() => {

      this.popupErros = [];

      this.popupTimeout = undefined;

    }, 10000);

  }



  private mapRecebimentos(): TransparenciaRecebimentoPayload[] {

    return (this.recebimentos.value as TransparenciaRecebimentoPayload[]).map((item) => ({

      ...item,

      valor: this.parseCurrencyValue(item.valor)

    }));

  }



  private mapDestinacoes(): TransparenciaDestinacaoPayload[] {

    return this.destinacoes.value as TransparenciaDestinacaoPayload[];

  }



  private mapComprovantes(): TransparenciaComprovantePayload[] {

    return this.comprovantes.value as TransparenciaComprovantePayload[];

  }



  private formatCurrencyInput(input: HTMLInputElement, comPrefixo: boolean): string {

    const digits = (input.value || '').replace(/\D/g, '');

    const numberValue = digits ? Number(digits) / 100 : 0;

    const masked = this.formatCurrencyValue(numberValue, comPrefixo);

    input.value = masked;

    return masked;

  }



  private formatCurrencyValue(value: number, comPrefixo: boolean): string {

    const formatted = new Intl.NumberFormat('pt-BR', {

      style: 'currency',

      currency: 'BRL'

    }).format(value);

    return comPrefixo ? formatted : formatted.replace('R$', '').trim();

  }



  private parseCurrencyValue(value: string | number | null | undefined): number | undefined {

    if (value === null || value === undefined) return undefined;

    if (typeof value === 'number') return value;

    const digits = value.toString().replace(/\D/g, '');

    if (!digits) return undefined;

    return Number(digits) / 100;

  }



  formatCurrency(value?: number | null): string {

    if (value === null || value === undefined || Number.isNaN(value)) return '—';

    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  }

}




