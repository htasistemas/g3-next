import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faFileContract } from '@fortawesome/free-solid-svg-icons';
import { firstValueFrom } from 'rxjs';
import { PopupErrorBuilder } from '../../utils/popup-error.builder';
import { titleCaseWords } from '../../utils/capitalization.util';
import { PopupMessagesComponent } from '../compartilhado/popup-messages/popup-messages.component';
import { TelaPadraoComponent } from '../compartilhado/tela-padrao/tela-padrao.component';
import { ConfigAcoesCrud, EstadoAcoesCrud, TelaBaseComponent } from '../compartilhado/tela-base.component';
import {
  AditivoPayload,
  SituacaoTermo,
  TermoDocumento,
  TermoFomentoPayload,
  TermoFomentoService,
  TipoTermo
} from '../../services/termo-fomento.service';

interface StepTab {
  id: string;
  label: string;
}

@Component({
  selector: 'app-termos-fomento-gestao',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FontAwesomeModule, TelaPadraoComponent, PopupMessagesComponent],
  templateUrl: './termos-fomento-gestao.component.html',
  styleUrl: './termos-fomento-gestao.component.scss'
})
export class TermosFomentoGestaoComponent extends TelaBaseComponent {
  form: FormGroup;
  activeTab = 'dados';
  saving = false;
  feedback: string | null = null;
  editingTermoId: string | null = null;
  popupErros: string[] = [];
  readonly faFileContract = faFileContract;

  readonly acoesToolbar: Required<ConfigAcoesCrud> = this.criarConfigAcoes({    
    salvar: true,
    excluir: true,
    novo: true,
    cancelar: true,
    imprimir: true,
    buscar: true
  });

  tabs: StepTab[] = [
    { id: 'dados', label: 'Dados do Termo' },
    { id: 'anexos', label: 'Anexos' },
    { id: 'aditivos', label: 'Histórico / Aditivos' },
    { id: 'listagem', label: 'Listagem de Termos' }
  ];

  termos: TermoFomentoPayload[] = [];
  filteredTermos: TermoFomentoPayload[] = [];

  search = '';
  situacaoFiltro: SituacaoTermo | '' = '';
  somenteVencidos = false;

  constructor(
    private readonly fb: FormBuilder,
    private readonly termoService: TermoFomentoService,
    private readonly router: Router
  ) {
    super();
    this.form = this.fb.group({
      dadosTermo: this.fb.group({
        numeroTermo: ['', Validators.required],
        tipoTermo: ['Uniao' as TipoTermo, Validators.required],
        orgaoConcedente: [''],
        dataAssinatura: [''],
        dataInicioVigencia: [''],
        dataFimVigencia: [''],
        situacao: ['Ativo' as SituacaoTermo, Validators.required],
        descricaoObjeto: [''],
        valorGlobal: [''],
        responsavelInterno: ['']
      }),
      anexos: this.fb.group({
        termoDocumento: this.fb.control<TermoDocumento | null>(null),
        documentosRelacionados: this.fb.control<TermoDocumento[]>([])
      }),
      aditivo: this.fb.group({
        tipoAditivo: [''],
        dataAditivo: [''],
        novaDataFim: [''],
        novoValor: [''],
        observacoes: [''],
        anexo: this.fb.control<TermoDocumento | null>(null)
      })
    });

    this.loadTermos();
  }

  get acoesDesabilitadas(): EstadoAcoesCrud {
    return {
      salvar: this.saving,
      excluir: !this.editingTermoId,
      novo: this.saving,
      cancelar: this.saving,
      imprimir: this.saving,
      buscar: this.saving
    };
  }

  get activeTabIndex(): number {
    return this.tabs.findIndex((tab) => tab.id === this.activeTab);
  }

  get hasPreviousTab(): boolean {
    return this.activeTabIndex > 0;
  }

  get hasNextTab(): boolean {
    return this.activeTabIndex < this.tabs.length - 1;
  }

  get nextTabLabel(): string {
    return this.hasNextTab ? this.tabs[this.activeTabIndex + 1].label : '';
  }

  get termoEmEdicao(): TermoFomentoPayload | undefined {
    return this.editingTermoId ? this.termos.find((t) => t.id === this.editingTermoId) : undefined;
  }

  changeTab(tab: string): void {
    this.activeTab = tab;
  }

  goToNextTab(): void {
    if (this.hasNextTab) {
      this.changeTab(this.tabs[this.activeTabIndex + 1].id);
    }
  }

  goToPreviousTab(): void {
    if (this.hasPreviousTab) {
      this.changeTab(this.tabs[this.activeTabIndex - 1].id);
    }
  }

  loadTermos(): void {
    this.termoService.list().subscribe({
      next: (termos) => {
        this.termos = termos;
        this.applyFilters();
      },
      error: () => {
        this.termos = [];
        this.applyFilters();
        this.popupErros = new PopupErrorBuilder()
          .adicionar('Não foi possível carregar os termos de fomento.')
          .build();
      }
    });
  }

  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    this.search = target?.value ?? '';
    this.applyFilters();
  }

  onSituacaoFiltroChange(event: Event): void {
    const target = event.target as HTMLSelectElement | null;
    const value = target?.value ?? '';
    this.situacaoFiltro = (value as SituacaoTermo) || '';
    this.applyFilters();
  }

  onBuscar(): void {
    this.changeTab('listagem');
    this.applyFilters();
  }

  applyFilters(): void {
    const query = this.normalizarTexto(this.search);
    this.filteredTermos = this.termos.filter((termo) => {
      const matchesQuery =
        !query ||
        this.normalizarTexto(termo.numeroTermo).includes(query) ||
        this.normalizarTexto(termo.orgaoConcedente ?? '').includes(query) ||
        this.normalizarTexto(termo.responsavelInterno ?? '').includes(query);
      const matchesSituacao = !this.situacaoFiltro || termo.situacao === this.situacaoFiltro;
      const matchesVencido = !this.somenteVencidos || this.isVencido(termo);
      return matchesQuery && matchesSituacao && matchesVencido;
    });
  }

  resetForm(): void {
    this.form.reset({
      dadosTermo: {
        numeroTermo: '',
        tipoTermo: 'Uniao' as TipoTermo,
        orgaoConcedente: '',
        dataAssinatura: '',
        dataInicioVigencia: '',
        dataFimVigencia: '',
        situacao: 'Ativo' as SituacaoTermo,
        descricaoObjeto: '',
        valorGlobal: '',
        responsavelInterno: ''
      },
      anexos: {
        termoDocumento: null,
        documentosRelacionados: []
      },
      aditivo: {
        tipoAditivo: '',
        dataAditivo: '',
        novaDataFim: '',
        novoValor: '',
        observacoes: '',
        anexo: null
      }
    });
    this.editingTermoId = null;
    this.feedback = null;
    this.activeTab = 'dados';
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.popupErros = new PopupErrorBuilder()
        .adicionar('Preencha os campos obrigatórios antes de salvar.')
        .build();
      return;
    }

    this.saving = true;
    const value = this.form.value;
    const payload: TermoFomentoPayload = {
      id: this.editingTermoId ?? undefined,
      numeroTermo: value.dadosTermo?.numeroTermo ?? '',
      tipoTermo: value.dadosTermo?.tipoTermo ?? 'Uniao',
      orgaoConcedente: value.dadosTermo?.orgaoConcedente ?? '',
      dataAssinatura: value.dadosTermo?.dataAssinatura ?? '',
      dataInicioVigencia: value.dadosTermo?.dataInicioVigencia ?? '',
      dataFimVigencia: value.dadosTermo?.dataFimVigencia ?? '',
      situacao: value.dadosTermo?.situacao ?? 'Ativo',
      descricaoObjeto: value.dadosTermo?.descricaoObjeto ?? '',
      valorGlobal: this.parseCurrencyValue(value.dadosTermo?.valorGlobal),
      responsavelInterno: value.dadosTermo?.responsavelInterno ?? '',
      termoDocumento: value.anexos?.termoDocumento ?? null,
      documentosRelacionados: value.anexos?.documentosRelacionados ?? [],
      aditivos: this.termoEmEdicao?.aditivos ?? []
    };

    try {
      if (this.editingTermoId) {
        const updated = await firstValueFrom(this.termoService.update(this.editingTermoId, payload));
        this.editingTermoId = updated.id ?? null;
        this.feedback = 'Termo atualizado com sucesso.';
      } else {
        const created = await firstValueFrom(this.termoService.create(payload));
        this.editingTermoId = created.id ?? null;
        this.feedback = 'Termo criado e salvo.';
      }
      this.loadTermos();
    } catch {
      this.popupErros = new PopupErrorBuilder()
        .adicionar('Não foi possível salvar o termo de fomento.')
        .build();
    } finally {
      this.saving = false;
    }
  }

  editTermo(termo: TermoFomentoPayload): void {
    this.editingTermoId = termo.id ?? null;
    this.form.patchValue({
      dadosTermo: {
        numeroTermo: termo.numeroTermo,
        tipoTermo: termo.tipoTermo,
        orgaoConcedente: termo.orgaoConcedente,
        dataAssinatura: termo.dataAssinatura,
        dataInicioVigencia: termo.dataInicioVigencia,
        dataFimVigencia: termo.dataFimVigencia,
        situacao: termo.situacao,
        descricaoObjeto: termo.descricaoObjeto,
        valorGlobal:
          termo.valorGlobal !== undefined && termo.valorGlobal !== null
            ? this.formatCurrencyValue(termo.valorGlobal, true)
            : '',
        responsavelInterno: termo.responsavelInterno
      },
      anexos: {
        termoDocumento: termo.termoDocumento ?? null,
        documentosRelacionados: termo.documentosRelacionados ?? []
      }
    });
    this.activeTab = 'dados';
    this.feedback = 'Editando termo selecionado.';
  }

  async deleteTermo(termo: TermoFomentoPayload): Promise<void> {
    if (!termo.id) return;
    try {
      await firstValueFrom(this.termoService.delete(termo.id));
      this.loadTermos();
      if (this.editingTermoId === termo.id) {
        this.resetForm();
      }
      this.feedback = 'Termo excluído com sucesso.';
    } catch {
      this.popupErros = new PopupErrorBuilder()
        .adicionar('Não foi possível excluir o termo de fomento.')
        .build();
    }
  }

  async saveAditivo(): Promise<void> {
    if (!this.editingTermoId) {
      this.popupErros = new PopupErrorBuilder()
        .adicionar('Salve o termo antes de registrar um aditivo.')
        .build();
      return;
    }

    const value = this.form.get('aditivo')?.value;
    if (!value?.tipoAditivo || !value?.dataAditivo) {
      this.popupErros = new PopupErrorBuilder()
        .adicionar('Preencha os campos obrigatórios do aditivo.')
        .build();
      return;
    }

    const aditivo: AditivoPayload = {
      tipoAditivo: value.tipoAditivo,
      dataAditivo: value.dataAditivo,
      novaDataFim: value.novaDataFim,
      novoValor: this.parseCurrencyValue(value.novoValor),
      observacoes: value.observacoes,
      anexo: value.anexo ?? null
    };

    try {
      const updated = await firstValueFrom(this.termoService.addAditivo(this.editingTermoId, aditivo));
      this.feedback = 'Aditivo salvo e histórico atualizado.';
      this.termos = this.termos.map((item) => (item.id === updated.id ? updated : item));
      this.applyFilters();
      this.form.patchValue({
        dadosTermo: {
          dataFimVigencia: updated.dataFimVigencia,
          valorGlobal:
            updated.valorGlobal !== undefined && updated.valorGlobal !== null
              ? this.formatCurrencyValue(updated.valorGlobal, true)
              : '',
          situacao: updated.situacao
        }
      });
      this.form.get('aditivo')?.reset({
        tipoAditivo: '',
        dataAditivo: '',
        novaDataFim: '',
        novoValor: '',
        observacoes: '',
        anexo: null
      });
      this.activeTab = 'aditivos';
    } catch {
      this.popupErros = new PopupErrorBuilder()
        .adicionar('Não foi possível salvar o aditivo.')
        .build();
    }
  }

  onFileSelected(event: Event, controlPath: (string | number)[], tipo: TermoDocumento['tipo']): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const documento: TermoDocumento = {
        id: crypto.randomUUID(),
        nome: file.name,
        dataUrl: typeof reader.result === 'string' ? reader.result : undefined,
        tipo
      };

      const control = this.form.get(controlPath);
      if (Array.isArray(control?.value)) {
        control?.setValue([documento, ...(control.value as TermoDocumento[])]);
      } else {
        control?.setValue(documento);
      }
    };

    reader.readAsDataURL(file);
    input.value = '';
  }

  onValorGlobalInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const valor = this.formatCurrencyInput(input, true);
    this.form.get(['dadosTermo', 'valorGlobal'])?.setValue(valor, { emitEvent: false });
  }

  onNovoValorInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const valor = this.formatCurrencyInput(input, true);
    this.form.get(['aditivo', 'novoValor'])?.setValue(valor, { emitEvent: false });
  }

  capitalizarCampo(caminho: (string | number)[]): void {
    const control = this.form.get(caminho);
    const valor = control?.value as string;
    if (!control || !valor) return;
    control.setValue(titleCaseWords(valor), { emitEvent: false });
  }

  isVencido(termo: TermoFomentoPayload): boolean {
    if (!termo.dataFimVigencia) return false;
    const fim = new Date(termo.dataFimVigencia);
    const hoje = new Date();
    return fim.getTime() < hoje.setHours(0, 0, 0, 0);
  }

  isProximoVencimento(termo: TermoFomentoPayload): boolean {
    if (!termo.dataFimVigencia || this.isVencido(termo)) return false;
    const fim = new Date(termo.dataFimVigencia).getTime();
    const hoje = new Date().setHours(0, 0, 0, 0);
    const diasRestantes = (fim - hoje) / (1000 * 60 * 60 * 24);
    return diasRestantes <= 30;
  }

  statusBadge(termo: TermoFomentoPayload): { label: string; tone: 'danger' | 'warning' | 'info' | 'success' } | null {
    if (this.isVencido(termo)) {
      return { label: 'Vencido', tone: 'danger' };
    }
    if (this.isProximoVencimento(termo)) {
      return { label: 'Próximo do vencimento', tone: 'warning' };
    }
    if (termo.situacao === 'Aditivado') {
      return { label: 'Aditivado', tone: 'info' };
    }
    return { label: 'Em vigor', tone: 'success' };
  }

  formatCurrency(value?: number): string {
    if (value === undefined || value === null || Number.isNaN(value)) return '—';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }

  formatDate(value?: string): string {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('pt-BR').format(date);
  }

  visualizarTermo(termo: TermoFomentoPayload): void {
    if (!termo.termoDocumento?.dataUrl) {
      this.popupErros = new PopupErrorBuilder()
        .adicionar('Ainda não há PDF do termo de fomento vinculado.')
        .build();
      return;
    }

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(
      `<iframe src="${termo.termoDocumento.dataUrl}" style="width:100%;height:100%" frameborder="0"></iframe>`
    );
  }

  imprimir(): void {
    if (this.termoEmEdicao) {
      this.visualizarTermo(this.termoEmEdicao);
    } else {
      this.popupErros = new PopupErrorBuilder()
        .adicionar('Selecione um termo para imprimir.')
        .build();
    }
  }

  cancelar(): void {
    this.resetForm();
  }

  fechar(): void {
    this.router.navigate(['/juridico/termos-fomento']);
  }

  fecharPopupErros(): void {
    this.popupErros = [];
  }

  private normalizarTexto(valor: string): string {
    return valor
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
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
}

