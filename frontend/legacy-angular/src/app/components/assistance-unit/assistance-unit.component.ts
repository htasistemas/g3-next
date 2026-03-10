import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormGroup, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { filter, Subscription } from 'rxjs';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faHospitalUser } from '@fortawesome/free-solid-svg-icons';
import { AssistanceUnitPayload, AssistanceUnitService, DiretoriaUnidadePayload } from '../../services/assistance-unit.service';
import { SalaRecord, SalasService } from '../../services/salas.service';
import { AuthService } from '../../services/auth.service';
import {
  ConfigAcoesCrud,
  EstadoAcoesCrud,
  TelaBaseComponent
} from '../compartilhado/tela-base.component';
import { TelaPadraoComponent } from '../compartilhado/tela-padrao/tela-padrao.component';
import { CityPayload, CityService } from '../../services/city.service';
import { formatTitleCase, isValidCnpj } from './assistance-unit.util';

interface ViaCepResponse {
  cep?: string;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
}

@Component({
  selector: 'app-assistance-unit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule, FontAwesomeModule, TelaPadraoComponent],
  templateUrl: './assistance-unit.component.html',
  styleUrl: './assistance-unit.component.scss'
})
export class AssistanceUnitComponent extends TelaBaseComponent implements OnInit, OnDestroy {
  readonly faHospitalUser = faHospitalUser;
  readonly tabs = [
    { id: 'lista', label: 'Listagem de unidades' },
    { id: 'dados', label: 'Dados da unidade' },
    { id: 'endereco', label: 'Endereço da unidade' },
    { id: 'imagens', label: 'Imagens da unidade' },
    { id: 'diretoria', label: 'Diretoria da unidade' }
  ] as const;

  unidade: AssistanceUnitPayload | null = null;
  unidades: AssistanceUnitPayload[] = [];
  unidadesOrdenadas: AssistanceUnitPayload[] = [];
  unidadePrincipal: AssistanceUnitPayload | null = null;
  salasUnidade: SalaRecord[] = [];
  salasLoading = false;
  paginaAtual = 1;
  readonly tamanhoPagina = 10;
  logoPreview: string | null = null;
  reportLogoPreview: string | null = null;
  feedback: { type: 'success' | 'error' | 'warning'; message: string } | null = null;
  deleteConfirmation = false;
  buscandoLocalizacao = false;
  activeTab: (typeof this.tabs)[number]['id'] = 'lista';
  private feedbackTimeout: ReturnType<typeof setTimeout> | null = null;
  readonly acoesToolbar: Required<ConfigAcoesCrud> = this.criarConfigAcoes({    
    salvar: true,
    excluir: true,
    novo: true,
    cancelar: true,
    imprimir: true,
    buscar: true
  });
  printDialogOpen = false;

  readonly estados = [
    'AC',
    'AL',
    'AP',
    'AM',
    'BA',
    'CE',
    'DF',
    'ES',
    'GO',
    'MA',
    'MT',
    'MS',
    'MG',
    'PA',
    'PB',
    'PR',
    'PE',
    'PI',
    'RJ',
    'RN',
    'RS',
    'RO',
    'RR',
    'SC',
    'SP',
    'SE',
    'TO'
  ];

  cidadesMG: CityPayload[] = [];
  private titleCaseSubscriptions: Subscription[] = [];
  private readonly titleCaseFields = [
    'nomeFantasia',
    'razaoSocial',
    'horarioFuncionamento',
    'endereco',
    'complemento',
    'bairro',
    'pontoReferencia',
    'cidade'
  ];

  form!: FormGroup;

  constructor(
    private readonly fb: FormBuilder,
    private readonly unitService: AssistanceUnitService,
    private readonly http: HttpClient,
    private readonly cityService: CityService,
    private readonly salasService: SalasService,
    private readonly authService: AuthService
  ) {
    super();
    this.form = this.fb.group({
      nomeFantasia: ['', [Validators.required, Validators.minLength(3)]],
      razaoSocial: ['', [this.optionalMinLength(3)]],
      cnpj: ['', this.cnpjValidator()],
      telefone: [''],
      email: ['', Validators.email],
      site: [''],
      cep: [''],
      endereco: [''],
      numeroEndereco: [''],
      complemento: [''],
      bairro: [''],
      pontoReferencia: [''],
      cidade: [''],
      zona: [''],
      subzona: [''],
      estado: [''],
      raioPontoMetros: [100, [Validators.required, Validators.min(10)]],
      accuracyMaxPontoMetros: [200, [Validators.required, Validators.min(10)]],
      latitude: [''],
      longitude: [''],
      ipValidacaoPonto: [''],
      ipsPublicosPonto: [''],
      redesLocaisPonto: [''],
      modoValidacaoPonto: ['IP_OU_REDE'],
      pingTimeoutMs: [2000, [Validators.required, Validators.min(500)]],
      observacoes: [''],
      unidadePrincipal: [false],
      logomarca: [''],
      logomarcaRelatorio: [''],
      horarioFuncionamento: [''],
      mandatoInicio: [''],
      mandatoFim: [''],
      diretoria: this.fb.array([])
    });
    this.setupTitleCaseFields();
    this.setDiretoriaForm([]);
  }

  ngOnInit(): void {
    this.loadUnit();
    this.loadUnits();
    this.loadCidadesMg();
  }

  ngOnDestroy(): void {
    this.titleCaseSubscriptions.forEach((sub) => sub.unsubscribe());
    this.clearFeedbackTimeout();
  }

  get activeTabIndex(): number {
    return this.tabs.findIndex((tab) => tab.id === this.activeTab);
  }

  get diretoriaForm(): FormArray {
    return this.form.get('diretoria') as FormArray;
  }

  addDiretoria(): void {
    this.diretoriaForm.push(this.createDiretoriaForm());
  }

  removeDiretoria(index: number): void {
    if (this.diretoriaForm.length <= 1) {
      this.diretoriaForm.at(0)?.reset();
      return;
    }

    this.diretoriaForm.removeAt(index);
  }


  get acoesDesabilitadas(): EstadoAcoesCrud {
    return {
      salvar: this.form?.invalid ?? false,
      excluir: !this.unidade?.id,
      imprimir: !this.unidade,
      buscar: false
    };
  }

  onBuscar(): void {
    this.activeTab = 'lista';
    this.loadUnits();
  }

  get podeMarcarPrincipal(): boolean {
    if (!this.unidadePrincipal) {
      return true;
    }

    return this.form.get('unidadePrincipal')?.value === true;
  }

  selecionarUnidade(unidade: AssistanceUnitPayload): void {
    this.unidade = unidade;
    this.form.patchValue(unidade);
    const enderecoFallback = (unidade as any)?.['endereco'] ?? '';
    this.form.get('endereco')?.setValue(unidade.endereco ?? enderecoFallback, { emitEvent: false });
    this.setDiretoriaForm(unidade.diretoria ?? []);
    this.logoPreview = unidade.logomarca || null;
    this.reportLogoPreview = unidade.logomarcaRelatorio || null;
    this.unitService.setActiveUnit(unidade.nomeFantasia, unidade.logomarca || null);
    this.loadSalasUnidade(unidade.id);
    this.activeTab = 'dados';
    this.deleteConfirmation = false;
    this.dismissFeedback();
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.coordenadasPendentes()) {
      this.setFeedback({
        type: 'error',
        message: 'Preencha a latitude e longitude para salvar o endereco.'
      });
      return;
    }

    const { itens: diretoria, invalido } = this.buildDiretoriaPayload();
    if (invalido) {
      this.setFeedback({
        type: 'error',
        message: 'Preencha nome completo, documento e função para cada membro da diretoria.'
      });
      return;
    }

    const { mandatoInicio, mandatoFim, ...dadosFormulario } = this.form.value;
    const payload: AssistanceUnitPayload = {
      ...dadosFormulario,
      id: this.unidade?.id,
      diretoria
    };

    this.unitService.save(payload).subscribe({
      next: (created) => {
        this.unidade = created;
        this.form.patchValue(created);
        this.setDiretoriaForm(created.diretoria ?? []);
        this.logoPreview = created.logomarca || null;
        this.reportLogoPreview = created.logomarcaRelatorio || null;
        this.unitService.setActiveUnit(created.nomeFantasia, created.logomarca || null);
        this.loadSalasUnidade(created.id);
        this.deleteConfirmation = false;
        this.loadUnits();
        this.setFeedback(
          {
            type: 'success',
            message: payload.id ? 'Unidade atualizada com sucesso.' : 'Unidade salva com sucesso.'
          },
          { autoDismiss: true }
        );
      },
      error: (error) => {
        console.error('Erro ao salvar unidade', error);
        this.setFeedback({
          type: 'error',
          message: 'Não foi possível salvar a unidade. Tente novamente.'
        });
      }
    });
  }

  private coordenadasPendentes(): boolean {
    const endereco = this.form.get('endereco')?.value as string | undefined;
    const numero = this.form.get('numeroEndereco')?.value as string | undefined;
    const cidade = this.form.get('cidade')?.value as string | undefined;
    const estado = this.form.get('estado')?.value as string | undefined;
    const latitude = this.form.get('latitude')?.value as string | undefined;
    const longitude = this.form.get('longitude')?.value as string | undefined;
    const enderecoInformado =
      !!endereco?.trim() || !!numero?.trim() || !!cidade?.trim() || !!estado?.trim();
    if (!enderecoInformado) {
      return false;
    }
    return !latitude?.trim() || !longitude?.trim();
  }

  buscarLocalizacao(): void {
    if (!this.unidade?.id) {
      this.setFeedback({ type: 'error', message: 'Salve a unidade antes de buscar a localização.' });
      return;
    }
    const faltantes = this.obterCamposEnderecoPendentes();
    if (faltantes.length) {
      this.setFeedback({
        type: 'error',
        message: `Preencha endereço completo antes de localizar: ${faltantes.join(', ')}.`
      });
      return;
    }
    if (this.buscandoLocalizacao) {
      return;
    }
    this.buscandoLocalizacao = true;
    this.unitService.geocodificarEndereco(this.unidade.id).subscribe({
      next: (atualizada: AssistanceUnitPayload) => {
        this.unidade = atualizada;
        this.form.patchValue(atualizada);
        this.form.get('endereco')?.setValue(atualizada.endereco ?? '', { emitEvent: false });
        this.setFeedback({ type: 'success', message: 'Latitude e longitude atualizadas com sucesso.' }, { autoDismiss: true });
        this.buscandoLocalizacao = false;
      },
      error: (erro: unknown) => {
        const erroResposta = erro as { error?: { mensagem?: string; message?: string } } | null;
        const mensagem =
          erroResposta?.error?.mensagem ||
          erroResposta?.error?.message ||
          'Não foi possível localizar a latitude e longitude do endereço.';
        this.setFeedback({ type: 'error', message: mensagem });
        this.buscandoLocalizacao = false;
      }
    });
  }

  usarLocalizacaoAtual(): void {
    if (!navigator.geolocation) {
      this.setFeedback({ type: 'error', message: 'Geolocalização indisponível no navegador.' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (posicao) => {
        const { latitude, longitude } = posicao.coords;
        this.form.patchValue({
          latitude: latitude.toFixed(6),
          longitude: longitude.toFixed(6)
        });
        this.setFeedback(
          { type: 'success', message: 'Latitude e longitude preenchidas com a localização atual.' },
          { autoDismiss: true }
        );
      },
      () => {
        this.setFeedback({ type: 'error', message: 'Permita o acesso à localização para preencher os dados.' });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  private obterCamposEnderecoPendentes(): string[] {
    const endereco = this.form.get('endereco')?.value as string | undefined;
    const numero = this.form.get('numeroEndereco')?.value as string | undefined;
    const cidade = this.form.get('cidade')?.value as string | undefined;
    const estado = this.form.get('estado')?.value as string | undefined;
    const faltantes: string[] = [];
    if (!endereco || !endereco.trim()) {
      faltantes.push('endereço');
    }
    if (!numero || !numero.trim()) {
      faltantes.push('número');
    }
    if (!cidade || !cidade.trim()) {
      faltantes.push('cidade');
    }
    if (!estado || !estado.trim()) {
      faltantes.push('estado');
    }
    return faltantes;
  }

  requestDeletion(): void {
    if (!this.unidade?.id) {
      return;
    }

    this.deleteConfirmation = true;
    this.setFeedback(
      {
        type: 'warning',
        message: 'Você está excluindo a unidade. Tem certeza? Esta ação é irreversível.'
      },
      { autoDismiss: false }
    );
  }

  cancelDeletion(): void {
    this.deleteConfirmation = false;
    this.dismissFeedback();
  }

  confirmDeletion(): void {
    if (!this.unidade?.id) {
      return;
    }

    this.unitService.remove(this.unidade.id).subscribe({
      next: () => {
        this.unidade = null;
        this.form.reset();
        this.setDiretoriaForm([]);
        this.logoPreview = null;
        this.reportLogoPreview = null;
        this.deleteConfirmation = false;
        this.loadUnits();
        this.setFeedback({ type: 'success', message: 'Unidade excluída com sucesso.' }, { autoDismiss: true });
      },
      error: (error) => {
        console.error('Erro ao excluir unidade', error);
        this.setFeedback({
          type: 'error',
          message: 'Não foi possível excluir a unidade. Tente novamente.'
        });
      }
    });
  }

  private loadUnit(): void {
    this.unitService.get().subscribe({
      next: ({ unidade }) => {
        this.unidade = unidade;
        if (unidade) {
          this.form.patchValue(unidade);
          const enderecoFallback = (unidade as any)?.['endereco'] ?? '';
          this.form
            .get('endereco')
            ?.setValue(unidade.endereco ?? enderecoFallback, { emitEvent: false });
          this.setDiretoriaForm(unidade.diretoria ?? []);
          this.logoPreview = unidade.logomarca || null;
          this.reportLogoPreview = unidade.logomarcaRelatorio || null;
          if (unidade.cep) {
            this.form.get('cep')?.setValue(this.formatCep(unidade.cep), { emitEvent: false });
          }
          this.unitService.setActiveUnit(unidade.nomeFantasia, unidade.logomarca || null);
          this.loadSalasUnidade(unidade.id);
          return;
        }
        this.form.reset();
        this.setDiretoriaForm([]);
        this.logoPreview = null;
        this.reportLogoPreview = null;
        this.unitService.setActiveUnit('Navegação', null);
        this.salasUnidade = [];
      },
      error: (error) => console.error('Erro ao carregar unidade', error)
    });
  }

  addSala(value: string): void {
    const nomeSala = formatTitleCase(value.trim());
    if (!nomeSala) {
      return;
    }
    if (!this.unidade?.id) {
      this.setFeedback({ type: 'error', message: 'Salve a unidade antes de cadastrar salas.' });
      return;
    }

    this.salasService.create({ nome: nomeSala, unidadeId: this.unidade.id }).subscribe({
      next: (sala) => {
        this.salasUnidade = [...this.salasUnidade, sala];
        this.loadSalasUnidade(this.unidade?.id);
        this.setFeedback(
          { type: 'success', message: 'Sala adicionada com sucesso.' },
          { autoDismiss: true }
        );
      },
      error: () => {
        this.setFeedback({ type: 'error', message: 'Não foi possível salvar a sala.' });
      }
    });
  }

  editSala(sala: SalaRecord): void {
    if (!this.unidade?.id) {
      return;
    }
    const next = window.prompt('Atualizar sala', sala.nome);
    const nomeSala = formatTitleCase((next ?? '').trim());
    if (!nomeSala || nomeSala === sala.nome) {
      return;
    }

    this.salasService.update(sala.id, { nome: nomeSala, unidadeId: this.unidade.id }).subscribe({
      next: (updated) => {
        this.salasUnidade = this.salasUnidade.map((item) => (item.id === updated.id ? updated : item));
        this.setFeedback(
          { type: 'success', message: 'Sala atualizada com sucesso.' },
          { autoDismiss: true }
        );
      },
      error: () => {
        this.setFeedback({ type: 'error', message: 'Não foi possível atualizar a sala.' });
      }
    });
  }

  removeSala(sala: SalaRecord): void {
    if (!window.confirm(`Remover a sala "${sala.nome}"?`)) {
      return;
    }

    this.salasService.remove(sala.id).subscribe({
      next: () => {
        this.salasUnidade = this.salasUnidade.filter((item) => item.id !== sala.id);
        this.setFeedback(
          { type: 'success', message: 'Sala removida com sucesso.' },
          { autoDismiss: true }
        );
      },
      error: () => {
        this.setFeedback({ type: 'error', message: 'Não foi possível remover a sala.' });
      }
    });
  }

  private loadUnits(): void {
    this.unitService.list().subscribe({
      next: (unidades) => {
        this.unidades = unidades;
        this.ordenarUnidades();
      },
      error: (error) => console.error('Erro ao listar unidades', error)
    });
  }

  private loadSalasUnidade(unidadeId?: number): void {
    if (!unidadeId) {
      this.salasUnidade = [];
      return;
    }

    this.salasLoading = true;
    this.salasService.list(unidadeId).subscribe({
      next: (salas) => {
        this.salasUnidade = salas;
        this.salasLoading = false;
      },
      error: () => {
        this.salasUnidade = [];
        this.salasLoading = false;
      }
    });
  }

  private loadCidadesMg(): void {
    this.cityService.list().subscribe({
      next: (cidades) => {
        this.cidadesMG = cidades;
      },
      error: (error) => {
        console.error('Erro ao carregar cidades de Minas Gerais', error);
      }
    });
  }

  get unidadesPaginadas(): AssistanceUnitPayload[] {
    const unidadesListadas = this.obterUnidadesListadas();
    const inicio = (this.paginaAtual - 1) * this.tamanhoPagina;
    return unidadesListadas.slice(inicio, inicio + this.tamanhoPagina);
  }

  get totalPaginas(): number {
    const total = this.obterUnidadesListadas().length;
    return Math.max(1, Math.ceil(total / this.tamanhoPagina));
  }

  proximaPagina(): void {
    if (this.paginaAtual < this.totalPaginas) {
      this.paginaAtual += 1;
    }
  }

  paginaAnterior(): void {
    if (this.paginaAtual > 1) {
      this.paginaAtual -= 1;
    }
  }

  private ordenarUnidades(): void {
    const ordenadas = [...this.unidades].sort((a, b) =>
      this.normalizarTexto(a.nomeFantasia).localeCompare(this.normalizarTexto(b.nomeFantasia))
    );
    this.unidadePrincipal = ordenadas.find((unidade) => unidade.unidadePrincipal) ?? null;
    this.unidadesOrdenadas = ordenadas.sort((a, b) => {
      const principalA = a.unidadePrincipal ? 0 : 1;
      const principalB = b.unidadePrincipal ? 0 : 1;
      if (principalA !== principalB) {
        return principalA - principalB;
      }
      return this.normalizarTexto(a.nomeFantasia).localeCompare(this.normalizarTexto(b.nomeFantasia));
    });
    this.paginaAtual = 1;
  }

  private obterUnidadesListadas(): AssistanceUnitPayload[] {
    if (!this.unidadePrincipal) {
      return this.unidadesOrdenadas;
    }

    return this.unidadesOrdenadas.filter((unidade) => !unidade.unidadePrincipal);
  }

  changeTab(tabId: (typeof this.tabs)[number]['id']): void {
    this.activeTab = tabId;
  }

  getTabLabel(tabId: (typeof this.tabs)[number]['id']): string {
    return this.tabs.find((tab) => tab.id === tabId)?.label ?? '';
  }

  private createDiretoriaForm(item?: DiretoriaUnidadePayload): FormGroup {
    const formGroup = this.fb.group({
      nomeCompleto: [item?.nomeCompleto ?? ''],
      documento: [item?.documento ?? '', [this.optionalCpfValidator()]],
      funcao: [item?.funcao ?? '']
    });
    formGroup.setValidators(this.diretoriaGrupoValidator());
    this.attachDiretoriaTitleCase(formGroup);
    return formGroup;
  }

  private setDiretoriaForm(diretoria: DiretoriaUnidadePayload[]): void {
    this.diretoriaForm.clear();
    if (!diretoria.length) {
      this.diretoriaForm.push(this.createDiretoriaForm());
      return;
    }
    diretoria.forEach((item) => this.diretoriaForm.push(this.createDiretoriaForm(item)));
  }

  private attachDiretoriaTitleCase(formGroup: FormGroup): void {
    ['nomeCompleto', 'funcao'].forEach((field) => {
      const control = formGroup.get(field);
      if (!control) {
        return;
      }

      const subscription = control.valueChanges.subscribe((value) => {
        const stringValue = String(value ?? '');
        const formatted = formatTitleCase(stringValue);
        if (formatted && formatted !== stringValue) {
          control.setValue(formatted, { emitEvent: false });
        }
      });

      this.titleCaseSubscriptions.push(subscription);
    });
  }

  private diretoriaGrupoValidator(): ValidatorFn {
    return (control: AbstractControl) => {
      const group = control as FormGroup;
      const nomeCompleto = String(group.get('nomeCompleto')?.value || '').trim();
      const documento = String(group.get('documento')?.value || '').trim();
      const funcao = String(group.get('funcao')?.value || '').trim();
      const possuiAlgum = Boolean(nomeCompleto || documento || funcao);

      this.setDiretoriaErro(group.get('nomeCompleto'), !nomeCompleto && possuiAlgum);
      this.setDiretoriaErro(group.get('documento'), !documento && possuiAlgum);
      this.setDiretoriaErro(group.get('funcao'), !funcao && possuiAlgum);

      return possuiAlgum && (!nomeCompleto || !documento || !funcao) ? { diretoriaIncompleta: true } : null;
    };
  }

  private setDiretoriaErro(control: AbstractControl | null | undefined, aplicar: boolean): void {
    if (!control) {
      return;
    }
    const erros = { ...(control.errors || {}) };
    if (aplicar) {
      erros['requiredDiretoria'] = true;
      control.setErrors(erros);
      return;
    }
    if (erros['requiredDiretoria']) {
      delete erros['requiredDiretoria'];
      control.setErrors(Object.keys(erros).length ? erros : null);
    }
  }

  private buildDiretoriaPayload(): { itens: DiretoriaUnidadePayload[]; invalido: boolean } {
    const itens: DiretoriaUnidadePayload[] = [];
    let invalido = false;
    const mandatoInicio = String(this.form.get('mandatoInicio')?.value || '').trim();
    const mandatoFim = String(this.form.get('mandatoFim')?.value || '').trim();

    this.diretoriaForm.controls.forEach((control) => {
      const valor = control.value as DiretoriaUnidadePayload;
      const nomeCompleto = (valor.nomeCompleto || '').trim();
      const documento = (valor.documento || '').trim();
      const funcao = (valor.funcao || '').trim();

      if (!nomeCompleto && !documento && !funcao) {
        return;
      }

      if (!nomeCompleto || !documento || !funcao) {
        invalido = true;
        return;
      }

      itens.push({ nomeCompleto, documento, funcao, mandatoInicio, mandatoFim });
    });

    return { itens, invalido };
  }

  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      this.form.get('logomarca')?.setValue(base64);
      this.logoPreview = base64;
    };

    reader.readAsDataURL(file);
  }

  clearLogo(): void {
    this.form.get('logomarca')?.setValue('');
    this.logoPreview = null;
  }

  onReportLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      this.form.get('logomarcaRelatorio')?.setValue(base64);
      this.reportLogoPreview = base64;
    };

    reader.readAsDataURL(file);
  }

  clearReportLogo(): void {
    this.form.get('logomarcaRelatorio')?.setValue('');
    this.reportLogoPreview = null;
  }

  resetForm(): void {
    this.startNew();
  }

  startNew(): void {
    this.unidade = null;
    this.form.reset();
    this.setDiretoriaForm([]);
    this.logoPreview = null;
    this.reportLogoPreview = null;
    this.deleteConfirmation = false;
    this.activeTab = 'dados';
    this.unitService.setActiveUnit('Navegação', null);
    this.dismissFeedback();
  }

  private setupTitleCaseFields(): void {
    this.titleCaseFields.forEach((field) => {
      const control = this.form.get(field);
      if (!control) {
        return;
      }

      const subscription = control.valueChanges.subscribe((value) => {
        const stringValue = String(value ?? '');
        const formatted = formatTitleCase(stringValue);
        if (formatted && formatted !== stringValue) {
          control.setValue(formatted, { emitEvent: false });
        }
      });

      this.titleCaseSubscriptions.push(subscription);
    });
  }

  closeForm(): void {
    window.history.back();
  }

  openPrintDialog(): void {
    this.printDialogOpen = true;
  }

  closePrintDialog(): void {
    this.printDialogOpen = false;
  }

  printUnidadePrincipal(): void {
    const unidade = this.unidadePrincipal ?? this.unidade;
    if (!unidade) {
      this.setFeedback({ type: 'warning', message: 'Nenhuma unidade disponivel para imprimir.' });
      return;
    }
    this.closePrintDialog();
    this.unidade = unidade;
    this.printUnit();
  }

  printUnit(): void {
    if (!this.unidade) {
      return;
    }

    const unidade = this.unidade;
    const printLogo = unidade.logomarcaRelatorio || unidade.logomarca;
    const emissor =
      this.authService.user()?.nome ||
      this.authService.user()?.nomeUsuario ||
      'Usuario';
    const dataHora = new Date().toLocaleString('pt-BR');
    const content = `
      <html>
        <head>
          <title>Relatorio do cadastro da unidade</title>
          <style>
            @page {
              size: A4;
              margin: 20mm;
            }
            *, *::before, *::after { box-sizing: border-box; }
            body {
              font-family: Arial, sans-serif;
              background: #ffffff;
              color: #000000;
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              font-size: 12px;
            }
            .report {
              width: 100%;
              margin: 0 auto;
              background: #ffffff;
              border: none;
              display: flex;
              flex-direction: column;
              position: relative;
              min-height: calc(297mm - 40mm);
            }
            .header {
              display: grid;
              grid-template-columns: 80px 1fr;
              gap: 12px;
              align-items: center;
              padding: 8px 10px;
              border-radius: 6px;
              border: 1px solid #000000;
              box-sizing: border-box;
              width: 100%;
            }
            .header-logo {
              width: 80px;
              height: 50px;
              border: none;
              display: grid;
              place-items: center;
              overflow: hidden;
            }
            .header-logo img {
              max-width: 100%;
              max-height: 100%;
              object-fit: contain;
            }
            .header-title {
              text-align: center;
            }
            .header-title .instituicao {
              font-size: 14px;
              font-weight: 700;
              margin: 0;
            }
            .header-title .relatorio {
              font-size: 16px;
              font-weight: 700;
              margin: 4px 0 0;
            }
            .hero {
              position: relative;
              padding: 24px 26px;
              background: linear-gradient(135deg, #0ea5e9, #6366f1, #8b5cf6);
              color: #ffffff;
              display: flex;
              gap: 20px;
              align-items: center;
            }
            .hero::after {
              content: '';
              position: absolute;
              inset: 0;
              background: radial-gradient(circle at 20% 20%, rgba(255,255,255,0.25), transparent 35%),
                          radial-gradient(circle at 80% 0%, rgba(255,255,255,0.18), transparent 40%);
              pointer-events: none;
            }
            .logo-badge {
              position: relative;
              z-index: 1;
              width: 96px;
              height: 96px;
              border-radius: 20px;
              overflow: hidden;
              border: 1px solid rgba(255, 255, 255, 0.65);
              background: #ffffff;
              display: grid;
              place-items: center;
              backdrop-filter: none;
              box-shadow: none;
            }
            .logo-badge img {
              max-width: 90%;
              max-height: 90%;
              object-fit: contain;
              filter: none;
            }
            .logo-placeholder {
              font-size: 14px;
              font-weight: 600;
              color: #e0f2fe;
              text-align: center;
              padding: 12px;
            }
            .hero-content { position: relative; z-index: 1; }
            .eyebrow {
              text-transform: uppercase;
              letter-spacing: 0.12em;
              font-size: 11px;
              font-weight: 700;
              margin: 0 0 6px;
              color: #c7d2fe;
            }
            h1 {
              margin: 0 0 6px;
              font-size: 26px;
              font-weight: 800;
              line-height: 1.15;
            }
            .hero-subtitle {
              margin: 0;
              color: #e0f2fe;
              font-size: 14px;
              display: flex;
              gap: 10px;
              align-items: center;
              flex-wrap: wrap;
            }
            .badge {
              display: inline-flex;
              align-items: center;
              gap: 8px;
              background: rgba(255, 255, 255, 0.16);
              color: #fff;
              padding: 8px 12px;
              border-radius: 12px;
              font-weight: 600;
              font-size: 12px;
              border: 1px solid rgba(255, 255, 255, 0.18);
              backdrop-filter: blur(6px);
            }
            .body {
              padding: 18px 20px 22px;
              display: grid;
              gap: 18px;
            }
            .section-card {
              border: 1px solid #000000;
              border-radius: 6px;
              padding: 8px 10px;
              background: #ffffff;
              box-shadow: none;
              width: 100%;
              box-sizing: border-box;
            }
            .section-card--no-border {
              border: none;
              padding: 0;
            }
            .section-title {
              margin: 0 0 6px;
              font-size: 11px;
              letter-spacing: 0.08em;
              color: #000000;
              font-weight: 800;
              text-transform: uppercase;
              background: #e2e8f0;
              padding: 8px 10px;
              border-radius: 4px;
              display: block;
              width: 100%;
              box-sizing: border-box;
            }
            .section-card--compact .data-grid {
              gap: 4px 8px;
            }
            .data-grid {
              display: grid;
              gap: 16px 18px;
              grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
            }
            .data-item {
              display: grid;
              gap: 4px;
              padding: 4px 0;
            }
            .label {
              display: block;
              font-size: 9px;
              letter-spacing: 0.08em;
              text-transform: uppercase;
              margin-bottom: 2px;
              font-weight: 700;
            }
            .value { font-size: 12px; font-weight: 700; color: #000000; margin: 0; }
            .muted { color: #000000; font-weight: 500; font-size: 11px; margin: 0; }
            .footer-note {
              padding: 8px 10px;
              background: transparent;
              color: #000000;
              border-radius: 6px;
              border: 1px solid #000000;
              margin-bottom: 0;
              width: 100%;
              box-sizing: border-box;
            }
            .footer {
              margin-top: auto;
              font-size: 11px;
              display: flex;
              flex-direction: column;
              align-items: center;
              text-align: center;
              gap: 4px;
              border-radius: 6px;
              border: 1px solid #000000;
              padding: 3px 6px;
              line-height: 1.2;
              page-break-inside: avoid;
              margin-bottom: 0;
              width: 100%;
              box-sizing: border-box;
            }
            .footer > div {
              width: 100%;
            }
            .report-meta-top {
              font-size: 9px;
              color: #000000;
              text-align: right;
              margin-bottom: 4px;
            }
            .footer,
            .footer-note,
            .header {
              width: 100%;
              box-sizing: border-box;
            }
            .hero {
              display: none;
            }
          </style>
        </head>
        <body>
          <div class="report">
            <div class="report-meta-top">Emitido por ${emissor} · ${dataHora}</div>
            <div class="header">
              <div class="header-logo">
                ${
                  printLogo
                    ? `<img src="${printLogo}" alt="Imagem institucional" />`
                    : `<span>Logo</span>`
                }
              </div>
              <div class="header-title">
                <p class="instituicao">${unidade.razaoSocial || unidade.nomeFantasia || 'Instituicao'}</p>
                <p class="relatorio">Relatorio do cadastro da unidade</p>
              </div>
            </div>
            <div class="hero">
              <div class="logo-badge">
                ${
                  printLogo
                    ? `<img src="${printLogo}" alt="Imagem institucional" />`
                    : `<div class="logo-placeholder">Logo da unidade</div>`
                }
              </div>
              <div class="hero-content">
                <p class="eyebrow">Cadastro da unidade</p>
                <h1>${unidade.nomeFantasia || 'Unidade assistencial'}</h1>
                <p class="hero-subtitle">
                  <span class="badge">${unidade.cidade || 'Cidade não informada'} · ${unidade.estado || 'UF'}</span>
                  <span class="badge">${unidade.horarioFuncionamento || 'Horário não informado'}</span>
                </p>
              </div>
            </div>

            <div class="body">
              <div>
                <p class="section-title">Identidade e contato</p>
                <div class="section-card section-card--compact">
                <div class="data-grid">
                  <div class="data-item">
                    <span class="label">Razão social</span>
                    <p class="value">${unidade.razaoSocial || 'Não informada'}</p>
                  </div>
                  <div class="data-item">
                    <span class="label">CNPJ</span>
                    <p class="value">${unidade.cnpj || 'Não informado'}</p>
                  </div>
                  <div class="data-item">
                    <span class="label">Telefone</span>
                    <p class="value">${unidade.telefone || 'Não informado'}</p>
                  </div>
                  <div class="data-item">
                    <span class="label">E-mail</span>
                    <p class="value">${unidade.email || 'Não informado'}</p>
                  </div>
                  <div class="data-item">
                    <span class="label">CEP</span>
                    <p class="value">${unidade.cep || 'Não informado'}</p>
                  </div>
                  <div class="data-item">
                    <span class="label">Horário de funcionamento</span>
                    <p class="value">${unidade.horarioFuncionamento || 'Não informado'}</p>
                  </div>
                </div>
              </div>
              </div>

              <div>
                <p class="section-title">Localização</p>
                <div class="section-card">
                <div class="data-grid">
                  <div class="data-item">
                    <span class="label">Endereço</span>
                    <p class="value">${unidade.endereco || 'Endereço não informado'} ${unidade.numeroEndereco || ''}</p>
                  </div>
                  <div class="data-item">
                    <span class="label">Cidade / Estado</span>
                    <p class="value">${unidade.cidade || 'Sem cidade'} / ${unidade.estado || 'UF'}</p>
                  </div>
                </div>
              </div>
              </div>
              <div>
                <p class="section-title">Diretor institucional</p>
                <div class="section-card">
                <div class="data-grid">
                  ${
                    unidade.diretoria && unidade.diretoria.length
                      ? unidade.diretoria
                          .map(
                            (membro) => `
                              <div class="data-item">
                                <span class="label">${membro.funcao || 'Funcao'}</span>
                                <p class="value">${membro.nomeCompleto || 'Não informado'}</p>
                                <p class="muted">${membro.documento || 'Documento n?o informado'}</p>
                                <p class="muted">Mandato: ${membro.mandatoInicio || 'Não informado'} - ${membro.mandatoFim || 'Não informado'}</p>
                              </div>
                            `
                          )
                          .join('')
                      : `<div class="data-item">
                          <span class="label">Diretoria</span>
                          <p class="value">N?o informada</p>
                        </div>`
                  }
                </div>
              </div>
              </div>
              <div>
                <p class="section-title">Estrutura da unidade</p>
                <div class="section-card">
                <div class="data-grid">
                  ${
                    this.salasUnidade && this.salasUnidade.length
                      ? `
                        <div class="data-item" style="grid-column: 1 / -1;">
                          <span class="label">Salas</span>
                          <p class="value">${this.salasUnidade
                            .map((sala) => sala.nome)
                            .filter(Boolean)
                            .join(', ') || 'Nao cadastradas'}</p>
                        </div>
                      `
                      : `<div class="data-item" style="grid-column: 1 / -1;">
                          <span class="label">Salas</span>
                          <p class="value">Nao cadastradas</p>
                        </div>`
                  }
                </div>
              </div>
              </div>
              </div>

              <div class="section-card section-card--no-border">
                <p class="section-title">Observações</p>
                <div class="footer-note">
                  ${unidade.observacoes || 'Nenhuma observação registrada até o momento.'}
                </div>
              </div>
              <div class="footer">
                <div>
                  ${unidade.razaoSocial || unidade.nomeFantasia || 'Instituicao'} · ${unidade.cnpj || 'CNPJ nao informado'}
                </div>
                <div>
                  ${unidade.endereco || 'Endereco nao informado'} ${unidade.numeroEndereco || ''} · ${unidade.bairro || ''}
                  · ${unidade.cidade || ''} ${unidade.estado || ''} · ${unidade.telefone || 'Telefone nao informado'}
                  · ${unidade.email || 'Email nao informado'}
                </div>
            </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=900,height=1200');

    if (!printWindow) {
      return;
    }

    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.document.title = '';
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  }

  printUnitList(): void {
    if (!this.unidadesOrdenadas.length) {
      this.setFeedback({ type: 'warning', message: 'Nenhuma unidade cadastrada para listar.' });
      return;
    }
    this.closePrintDialog();

    const unidadeReferencia = this.unidadePrincipal ?? this.unidade ?? this.unidadesOrdenadas[0];
    const printLogo = unidadeReferencia?.logomarcaRelatorio || unidadeReferencia?.logomarca;
    const emissor =
      this.authService.user()?.nome ||
      this.authService.user()?.nomeUsuario ||
      'Usuario';
    const dataHora = new Date().toLocaleString('pt-BR');

    const linhas = this.unidadesOrdenadas
      .map(
        (item, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${item.nomeFantasia || 'Nao informado'}</td>
            <td>${item.razaoSocial || 'Nao informado'}</td>
            <td>${item.cnpj || 'Nao informado'}</td>
            <td>${item.cidade || 'Nao informado'} / ${item.estado || 'UF'}</td>
            <td>${item.telefone || 'Nao informado'}</td>
          </tr>
        `
      )
      .join('');

    const content = `
      <html>
        <head>
          <title>Listagem de unidades</title>
          <style>
            @page {
              size: A4;
              margin: 20mm;
            }
            *, *::before, *::after { box-sizing: border-box; }
            body {
              font-family: Arial, sans-serif;
              background: #ffffff;
              color: #000000;
              margin: 0;
              padding: 0;
              font-size: 11px;
            }
            .report {
              width: 100%;
              min-height: calc(297mm - 40mm);
              display: flex;
              flex-direction: column;
              gap: 12px;
              position: relative;
            }
            .report-meta-top {
              font-size: 9px;
              color: #000000;
              text-align: right;
              margin-bottom: 4px;
            }
            .header {
              display: grid;
              grid-template-columns: 80px 1fr;
              gap: 12px;
              align-items: center;
              padding: 8px 10px;
              border-radius: 12px;
              border: 1px solid #000000;
              width: 100%;
            }
            .header-logo {
              width: 80px;
              height: 50px;
              border: none;
              display: grid;
              place-items: center;
              overflow: hidden;
            }
            .header-logo img {
              max-width: 100%;
              max-height: 100%;
              object-fit: contain;
            }
            .header-title {
              text-align: center;
            }
            .header-title .instituicao {
              font-size: 14px;
              font-weight: 700;
              margin: 0;
            }
            .header-title .relatorio {
              font-size: 16px;
              font-weight: 700;
              margin: 4px 0 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 10px;
            }
            th, td {
              border: 1px solid #000000;
              padding: 4px 6px;
              text-align: left;
            }
            th {
              background: #e2e8f0;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.06em;
            }
            .footer {
              margin-top: auto;
              border-top: 1px solid #000000;
              font-size: 10px;
              display: flex;
              flex-direction: column;
              align-items: center;
              text-align: center;
              gap: 4px;
              border-radius: 6px;
              border: 1px solid #000000;
              padding: 4px 6px;
              line-height: 1.2;
              width: 100%;
            }
          </style>
        </head>
        <body>
          <div class="report">
            <div class="report-meta-top">Emitido por ${emissor} · ${dataHora}</div>
            <div class="header">
              <div class="header-logo">
                ${
                  printLogo
                    ? `<img src="${printLogo}" alt="Imagem institucional" />`
                    : `<span>Logo</span>`
                }
              </div>
              <div class="header-title">
                <p class="instituicao">${unidadeReferencia?.razaoSocial || unidadeReferencia?.nomeFantasia || 'Instituicao'}</p>
              <p class="relatorio">Listagem de unidades</p>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Nome fantasia</th>
                  <th>Razao social</th>
                  <th>CNPJ</th>
                  <th>Cidade/UF</th>
                  <th>Telefone</th>
                </tr>
              </thead>
              <tbody>
                ${linhas}
              </tbody>
            </table>

            <div class="footer">
              <div>
                ${unidadeReferencia?.razaoSocial || unidadeReferencia?.nomeFantasia || 'Instituicao'} · ${
      unidadeReferencia?.cnpj || 'CNPJ nao informado'
    }
              </div>
              <div>
                ${unidadeReferencia?.endereco || 'Endereco nao informado'} ${unidadeReferencia?.numeroEndereco || ''} · ${
      unidadeReferencia?.bairro || ''
    }
                · ${unidadeReferencia?.cidade || ''} ${unidadeReferencia?.estado || ''} · ${
      unidadeReferencia?.telefone || 'Telefone nao informado'
    }
                · ${unidadeReferencia?.email || 'Email nao informado'}
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=900,height=1200');
    if (!printWindow) {
      return;
    }
    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.document.title = '';
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  }

  onPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const formatted = this.formatPhone(input.value);
    this.form.get('telefone')?.setValue(formatted, { emitEvent: false });
  }

  onCnpjInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 14);
    const formatted = this.formatCnpj(digits);
    this.form.get('cnpj')?.setValue(formatted, { emitEvent: false });
  }

  onCepInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 8);
    const masked = this.formatCep(digits);

    this.form.get('cep')?.setValue(masked, { emitEvent: false });

    if (digits.length === 8) {
      this.fetchAddress(digits);
    }
  }

  onCidadeInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const valor = input.value.trim();
    if (!valor) {
      this.form.get('estado')?.setValue('');
      return;
    }

    const match = this.cidadesMG.find((cidade) => cidade.nome.toLowerCase() === valor.toLowerCase());

    if (match) {
      this.form.get('estado')?.setValue(match.uf);
    }
  }

  private formatPhone(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 11);

    if (digits.length <= 2) {
      return digits;
    }

    if (digits.length <= 6) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    }

    if (digits.length <= 10) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6, 10)}`;
    }

    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  }

  private formatCep(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 8);

    if (digits.length <= 5) {
      return digits;
    }

    return `${digits.slice(0, 5)}-${digits.slice(5, 8)}`;
  }

  private formatCnpj(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 14);

    if (digits.length <= 2) {
      return digits;
    }

    if (digits.length <= 5) {
      return `${digits.slice(0, 2)}.${digits.slice(2)}`;
    }

    if (digits.length <= 8) {
      return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
    }

    if (digits.length <= 12) {
      return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
    }

    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(
      8,
      12
    )}-${digits.slice(12, 14)}`;
  }

  private formatCpf(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 11);

    if (digits.length <= 3) {
      return digits;
    }

    if (digits.length <= 6) {
      return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    }

    if (digits.length <= 9) {
      return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    }

    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
  }

  private optionalMinLength(length: number) {
    return (control: AbstractControl) => {
      const value = (control.value || '').trim();

      if (!value) {
        return null;
      }

      return value.length >= length
        ? null
        : { minlength: { requiredLength: length, actualLength: value.length } };
    };
  }

  private optionalCpfValidator() {
    return (control: AbstractControl) => {
      const digits = (control.value || '').replace(/\D/g, '');

      if (!digits) {
        return null;
      }

      if (digits.length !== 11 || /^([0-9])\1{10}$/.test(digits)) {
        return { cpfInvalid: true };
      }

      const calculateVerifier = (base: string, factor: number) => {
        let total = 0;
        for (let i = 0; i < base.length; i += 1) {
          total += parseInt(base.charAt(i), 10) * (factor - i);
        }

        const remainder = (total * 10) % 11;
        return remainder === 10 ? 0 : remainder;
      };

      const firstVerifier = calculateVerifier(digits.slice(0, 9), 10);
      const secondVerifier = calculateVerifier(digits.slice(0, 10), 11);

      const isValid = firstVerifier === Number(digits.charAt(9)) && secondVerifier === Number(digits.charAt(10));

      return isValid ? null : { cpfInvalid: true };
    };
  }

  onDiretoriaCpfInput(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const formatted = this.formatCpf(input.value);
    this.diretoriaForm.at(index)?.get('documento')?.setValue(formatted, { emitEvent: false });
  }

  private cnpjValidator() {
    return (control: AbstractControl) => {
      const digits = (control.value || '').replace(/\D/g, '');

      if (!digits) {
        return null;
      }

      return isValidCnpj(digits) ? null : { cnpjInvalid: true };
    };
  }

  private setFeedback(
    feedback: { type: 'success' | 'error' | 'warning'; message: string },
    options: { autoDismiss?: boolean; duration?: number } = {}
  ): void {
    this.clearFeedbackTimeout();
    this.feedback = feedback;

    const shouldAutoDismiss = options.autoDismiss ?? true;

    if (shouldAutoDismiss) {
      const duration = options.duration ?? 4500;
      this.feedbackTimeout = setTimeout(() => {
        this.dismissFeedback();
      }, duration);
    }
  }

  private clearFeedbackTimeout(): void {
    if (this.feedbackTimeout) {
      clearTimeout(this.feedbackTimeout);
      this.feedbackTimeout = null;
    }
  }

  public dismissFeedback(): void {
    this.clearFeedbackTimeout();
    this.feedback = null;
  }

  private fetchAddress(cep: string): void {
    this.http
      .get<ViaCepResponse>(`https://viacep.com.br/ws/${cep}/json/`)
      .pipe(filter((response) => !response.erro))
      .subscribe((response) => {
        this.form.patchValue({
          cep: this.formatCep(response.cep ?? cep),
          endereco: response.logradouro || this.form.value.endereco,
          bairro: response.bairro || this.form.value.bairro,
          cidade: response.localidade || this.form.value.cidade,
          estado: response.uf || this.form.value.estado
        });
      });
  }

  private normalizarTexto(valor: string): string {
    if (!valor) {
      return '';
    }

    return valor
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .trim();
  }
}




