import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors, FormsModule } from '@angular/forms';
import { Subject, finalize, takeUntil } from 'rxjs';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faUserDoctor } from '@fortawesome/free-solid-svg-icons';
import {
  ProfessionalPayload,
  ProfessionalRecord,
  ProfessionalService,
  ProfessionalStatus
} from '../../services/professional.service';
import { titleCaseWords } from '../../utils/capitalization.util';

import { TelaPadraoComponent } from '../compartilhado/tela-padrao/tela-padrao.component';
import { ConfigAcoesCrud, EstadoAcoesCrud, TelaBaseComponent } from '../compartilhado/tela-base.component';
import { PopupMessagesComponent } from '../compartilhado/popup-messages/popup-messages.component';
import { DialogComponent } from '../compartilhado/dialog/dialog.component';
import { PopupErrorBuilder } from '../../utils/popup-error.builder';
import { AssistanceUnitPayload, AssistanceUnitService } from '../../services/assistance-unit.service';
import { VoluntariadoTermoPrintService } from '../../shared/print/voluntariado-termo-print.service';
import { AuthService } from '../../services/auth.service';
import { SalaRecord, SalasService } from '../../services/salas.service';
interface StepTab {
  id: string;
  label: string;
}

type ViaCepResponse = {
  logradouro?: string;
  complemento?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
};

@Component({
  selector: 'app-profissionais-cadastro',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    FontAwesomeModule,
    TelaPadraoComponent,
    PopupMessagesComponent,
    DialogComponent
  ],
  templateUrl: './profissionais-cadastro.component.html',
  styleUrl: './profissionais-cadastro.component.scss'
})
export class ProfissionaisCadastroComponent extends TelaBaseComponent implements OnInit, OnDestroy {
  readonly faUserDoctor = faUserDoctor;
  form: FormGroup;
  searchForm: FormGroup;
  feedback: string | null = null;
  private feedbackTimeout?: ReturnType<typeof setTimeout>;
  popupErros: string[] = [];
  dialogConfirmacaoAberta = false;
  dialogTitulo = '';
  dialogMensagem = '';
  dialogConfirmarLabel = 'Confirmar';
  dialogAcao?: () => void;
  professionals: ProfessionalRecord[] = [];
  filteredProfessionals: ProfessionalRecord[] = [];
  listLoading = false;
  editingId: string | null = null;
  saving = false;
  unidadeAtual: AssistanceUnitPayload | null = null;
  unidadesDisponiveis: AssistanceUnitPayload[] = [];
  salasDisponiveis: SalaRecord[] = [];
  salasLoading = false;
  photoPreview: string | null = null;
  cameraActive = false;
  captureError: string | null = null;
  private videoStream?: MediaStream;
  cepLookupError: string | null = null;
  paginaAtual = 1;
  readonly tamanhoPagina = 10;
  private readonly capitalizationSubs: Array<() => void> = [];
  private readonly destroy$ = new Subject<void>();
  tabs: StepTab[] = [
    { id: 'lista', label: 'Listagem de profissionais' },
    { id: 'dados', label: 'Dados pessoais' },
    { id: 'endereco', label: 'Endereço' },
    { id: 'perfil', label: 'Perfil profissional' },
    { id: 'agenda', label: 'Agenda e canais' },
    { id: 'resumo', label: 'Resumo e observações' }
  ];
  activeTab: StepTab['id'] = 'lista';

  categorias = ['Assistente social', 'Psicólogo(a)', 'Pedagogo(a)', 'Médico(a)', 'Nutricionista'];
  readonly disponibilidades = ['Manhã', 'Tarde', 'Noite'];
  readonly canais = ['Presencial', 'Online', 'Telefone'];
  readonly statuses: ProfessionalStatus[] = [
    'ATIVO',
    'INATIVO',
    'DESATUALIZADO',
    'INCOMPLETO',
    'EM_ANALISE',
    'BLOQUEADO'
  ];
  readonly vinculos = [
    { value: 'VOLUNTARIO', label: 'Voluntario' },
    { value: 'CLT', label: 'CLT' },
    { value: 'PJ', label: 'PJ' },
    { value: 'ESTAGIARIO', label: 'Estagiário' }
  ];
  readonly tagsSugeridas = ['Acolhimento', 'Triagem', 'Famílias', 'Juventude', 'Visitas', 'Oficinas'];
  readonly brazilianStates = [
    'AC',
    'AL',
    'AM',
    'AP',
    'BA',
    'CE',
    'DF',
    'ES',
    'GO',
    'MA',
    'MG',
    'MS',
    'MT',
    'PA',
    'PB',
    'PE',
    'PI',
    'PR',
    'RJ',
    'RN',
    'RO',
    'RR',
    'RS',
    'SC',
    'SE',
    'SP',
    'TO'
  ];
  readonly maritalStatusOptions = [
    'Solteiro(a)',
    'Casado(a)',
    'Uniao estavel',
    'Separado(a)',
    'Divorciado(a)',
    'Viuvo(a)'
  ];
  readonly nationalityOptions = [
    'Afegao(oa)',
    'Alemao(oa)',
    'Angolano(a)',
    'Argentino(a)',
    'Australiano(a)',
    'Belga',
    'Boliviano(a)',
    'Brasileira',
    'Brasileiro',
    'Canadense',
    'Chileno(a)',
    'Chinesa(o)',
    'Colombiano(a)',
    'Coreano(a)',
    'Costa-riquenho(a)',
    'Cubano(a)',
    'Dinamarquesa(o)',
    'Egipcio(a)',
    'Espanhol(a)',
    'Estadunidense',
    'Filipino(a)',
    'Finlandes(a)',
    'Frances(a)',
    'Grego(a)',
    'Haitiano(a)',
    'Holandes(a)',
    'Indiano(a)',
    'Irlandes(a)',
    'Italiano(a)',
    'Japones(a)',
    'Mexicano(a)',
    'Mocambicano(a)',
    'Noruegues(a)',
    'Paraguaio(a)',
    'Peruano(a)',
    'Portugues(a)',
    'Russo(a)',
    'Sul-africano(a)',
    'Sueco(a)',
    'Suico(a)',
    'Uruguaio(a)',
    'Venezuelano(a)'
  ];

  constructor(
    private readonly fb: FormBuilder,
    private readonly professionalService: ProfessionalService,
    private readonly assistanceUnitService: AssistanceUnitService,
    private readonly termoPrintService: VoluntariadoTermoPrintService,
    private readonly authService: AuthService,
    private readonly http: HttpClient,
    private readonly salasService: SalasService
  ) {
    super();
    this.form = this.fb.group({
      dadosPessoais: this.fb.group({
        nome_completo: ['', Validators.required],
        data_nascimento: [''],
        foto_3x4: [''],
        sexo_biologico: [''],
        estado_civil: [''],
        nacionalidade: [''],
        naturalidade_cidade: [''],
        naturalidade_uf: [''],
        nome_mae: [''],
      }),
      endereco: this.fb.group({
        cep: ['', [this.cepValidator]],
        logradouro: [''],
        numero: [''],
        complemento: [''],
        bairro: [''],
        ponto_referencia: [''],
        municipio: [''],
        zona: [''],
        subzona: [''],
        uf: ['']
      }),
      categoria: [this.categorias[0], Validators.required],
      cpf: ['', [this.cpfValidator]],
      vinculo: ['VOLUNTARIO'],
      registroConselho: [''],
      especialidade: [''],
      email: ['', [Validators.email]],
      telefone: [''],
      unidadeId: [null],
      unidade: [''],
      salaAtendimento: [''],
      cargaHoraria: [20, [Validators.min(1)]],
      disponibilidade: this.fb.control<string[]>([]),
      canaisAtendimento: this.fb.control<string[]>(['Presencial']),
      status: ['INCOMPLETO'],
      tags: this.fb.control<string[]>([]),
      resumo: [''],
      observacoes: ['']
    });
    this.searchForm = this.fb.group({
      nome: [''],
      categoria: [''],
      email: [''],
      status: ['']
    });

    this.setupCapitalizationRules();
  }

  ngOnInit(): void {
    this.buscarProfissionaisNaListagem(false);
    this.assistanceUnitService.get().pipe(takeUntil(this.destroy$)).subscribe({
      next: ({ unidade }) => {
        this.unidadeAtual = unidade ?? null;
        this.definirUnidadePadrao(unidade ?? null);
      },
      error: () => {
        this.unidadeAtual = null;
      }
    });

    this.assistanceUnitService.list().pipe(takeUntil(this.destroy$)).subscribe({
      next: (unidades) => {
        this.unidadesDisponiveis = unidades;
        this.sincronizarUnidadeSelecionada();
      },
      error: () => {
        this.unidadesDisponiveis = [];
      }
    });
  }

  private definirUnidadePadrao(unidade: AssistanceUnitPayload | null): void {
    if (!unidade?.id) return;

    const unidadeIdAtual = this.form.get('unidadeId')?.value;
    const unidadeNomeAtual = (this.form.get('unidade')?.value ?? '').trim();
    if (unidadeIdAtual || unidadeNomeAtual) return;

    this.form.patchValue({ unidadeId: unidade.id, unidade: unidade.nomeFantasia });
    this.carregarSalas(unidade.id);
  }

  private sincronizarUnidadeSelecionada(): void {
    const unidadeIdAtual = this.form.get('unidadeId')?.value as number | null;
    if (unidadeIdAtual) {
      this.carregarSalas(unidadeIdAtual);
      return;
    }

    const unidadeNomeAtual = (this.form.get('unidade')?.value ?? '').trim().toLowerCase();
    if (!unidadeNomeAtual) {
      this.definirUnidadePadrao(this.unidadeAtual);
      return;
    }

    const unidadeEncontrada = this.unidadesDisponiveis.find(
      (item) => (item.nomeFantasia ?? '').trim().toLowerCase() === unidadeNomeAtual
    );
    if (unidadeEncontrada?.id) {
      this.form.patchValue({ unidadeId: unidadeEncontrada.id });
      this.carregarSalas(unidadeEncontrada.id);
    }
  }

  onUnidadeSelecionada(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    const unidadeId = value ? Number(value) : null;
    if (!unidadeId) {
      this.form.patchValue({ unidadeId: null, unidade: '', salaAtendimento: '' });
      this.salasDisponiveis = [];
      return;
    }

    const unidade = this.unidadesDisponiveis.find((item) => item.id === unidadeId);
    this.form.patchValue({
      unidadeId,
      unidade: unidade?.nomeFantasia ?? '',
      salaAtendimento: ''
    });
    this.carregarSalas(unidadeId);
  }

  private carregarSalas(unidadeId: number | null): void {
    if (!unidadeId) {
      this.salasDisponiveis = [];
      return;
    }

    this.salasLoading = true;
    this.salasService
      .list(unidadeId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (salas) => {
          this.salasDisponiveis = salas;
          this.salasLoading = false;
        },
        error: () => {
          this.salasDisponiveis = [];
          this.salasLoading = false;
        }
      });
  }

  ngOnDestroy(): void {
    this.capitalizationSubs.forEach((unsubscribe) => unsubscribe());
    this.destroy$.next();
    this.destroy$.complete();
    this.clearFeedbackTimeout();
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

  get professionalsPaginados(): ProfessionalRecord[] {
    const inicio = (this.paginaAtual - 1) * this.tamanhoPagina;
    return this.filteredProfessionals.slice(inicio, inicio + this.tamanhoPagina);
  }

  get totalPaginas(): number {
    return Math.max(1, Math.ceil(this.filteredProfessionals.length / this.tamanhoPagina));
  }

  readonly acoesToolbar: Required<ConfigAcoesCrud> = this.criarConfigAcoes({
    salvar: true,
    excluir: true,
    novo: true,
    cancelar: true,
    imprimir: true,
    buscar: true
  });

  get acoesDesabilitadas(): EstadoAcoesCrud {
    return {
      salvar: this.saving,
      excluir: !this.editingId,
      novo: this.saving,
      cancelar: this.saving,
      imprimir: this.saving,
      buscar: this.saving || this.listLoading
    };
  }

  fecharPopupErros(): void {
    this.popupErros = [];
  }

  changeTab(tab: StepTab['id']): void {
    this.activeTab = tab;
  }

  clearSearchFilters(): void {
    this.searchForm.reset({ nome: '', categoria: '', email: '', status: '' });
    this.buscarProfissionaisNaListagem(false);
  }

  paginaAnterior(): void {
    this.paginaAtual = Math.max(1, this.paginaAtual - 1);
  }

  proximaPagina(): void {
    this.paginaAtual = Math.min(this.totalPaginas, this.paginaAtual + 1);
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

  get totalDisponiveis(): number {
    return this.professionals.filter((p) => p.status === 'ATIVO').length;
  }

  get totalOnline(): number {
    return this.professionals.filter((p) => p.canaisAtendimento?.includes('Online')).length;
  }

  get totalPresencial(): number {
    return this.professionals.filter((p) => p.canaisAtendimento?.includes('Presencial')).length;
  }

  submit(): void {
    this.clearFeedback();
    this.popupErros = [];
    const statusCalculado = this.definirStatusProfissional();
    this.form.patchValue({ status: statusCalculado }, { emitEvent: false });
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      const builder = new PopupErrorBuilder();
      const requiredFields: { path: string; label: string }[] = [
        { path: 'dadosPessoais.nome_completo', label: 'Nome completo' },
        { path: 'categoria', label: 'Categoria' }
      ];

      requiredFields.forEach(({ path, label }) => {
        const control = this.form.get(path);
        const value = String(control?.value ?? '').trim();
        if (!value) {
          builder.adicionar(`${label} e obrigatorio.`);
        }
      });
      if (this.form.get('cpf')?.errors?.['cpfInvalid']) {
        builder.adicionar('CPF invalido.');
      }
      if (this.form.get('email')?.errors?.['email']) {
        builder.adicionar('E-mail invalido.');
      }
      if (this.form.get(['endereco', 'cep'])?.errors?.['cep']) {
        builder.adicionar('CEP invalido.');
      }
      this.popupErros = builder.build();
      this.setFeedback('Preencha os campos obrigatorios para salvar o profissional.');
      return;
    }

    this.saving = true;
    const payload = this.buildPayload();
    const request = this.editingId
      ? this.professionalService.update(this.editingId, payload)
      : this.professionalService.create(payload);

    request.pipe(takeUntil(this.destroy$)).subscribe({
      next: (record) => {
        if (this.editingId) {
          this.professionals = this.professionals.map((item) => (item.id === record.id ? record : item));
          this.setFeedback('Profissional atualizado com sucesso.');
        } else {
          this.professionals = [record, ...this.professionals];
          this.setFeedback('Profissional cadastrado com sucesso.');
        }
        this.saving = false;
        this.resetForm();
        this.changeTab('dados');
        this.applyListFilters();
      },
      error: () => {
        this.setFeedback('Não foi possível salvar o profissional. Tente novamente.');
        this.saving = false;
      }
    });
  }

  addCategoria(value: string): void {
    const formatted = titleCaseWords(value.trim());
    if (!formatted) return;

    if (this.categorias.includes(formatted)) {
      this.form.patchValue({ categoria: formatted });
      return;
    }

    this.categorias = [...this.categorias, formatted];
    this.form.patchValue({ categoria: formatted });
  }

  editCategoria(actual: string): void {
    const next = window.prompt('Atualizar categoria', actual);
    const formatted = titleCaseWords((next ?? '').trim());
    if (!formatted || actual === formatted) return;

    this.categorias = this.categorias.map((item) => (item === actual ? formatted : item));

    if (this.form.value.categoria === actual) {
      this.form.patchValue({ categoria: formatted });
    }
  }

  removeCategoria(target: string): void {
    if (this.categorias.length === 1) return;
    this.abrirDialogoConfirmacao(
      'Remover categoria',
      `Deseja remover a categoria "${target}"?`,
      'Remover',
      () => {
        this.categorias = this.categorias.filter((categoria) => categoria !== target);

        if (this.form.value.categoria === target) {
          this.form.patchValue({ categoria: this.categorias[0] ?? '' });
        }
      }
    );
  }

  startNew(): void {
    this.editingId = null;
    this.changeTab('dados');
    this.resetForm();
  }

  edit(record: ProfessionalRecord): void {
    this.editingId = record.id;
    this.changeTab('dados');
    this.form.patchValue({
      dadosPessoais: {
        nome_completo: record.nomeCompleto,
        data_nascimento: record.dataNascimento ?? '',
        foto_3x4: record.foto3x4 ?? '',
        sexo_biologico: record.sexoBiologico ?? '',
        estado_civil: record.estadoCivil ?? '',
        nacionalidade: record.nacionalidade ?? '',
        naturalidade_cidade: record.naturalidadeCidade ?? '',
        naturalidade_uf: record.naturalidadeUf ?? '',
        nome_mae: record.nomeMae ?? ''
      },
      endereco: {
        cep: record.cep ? this.formatCep(record.cep) : '',
        logradouro: record.logradouro ?? '',
        numero: record.numero ?? '',
        complemento: record.complemento ?? '',
        bairro: record.bairro ?? '',
        ponto_referencia: record.pontoReferencia ?? '',
        municipio: record.municipio ?? '',
        zona: record.zona ?? '',
        subzona: record.subzona ?? '',
        uf: record.uf ?? ''
      },
      categoria: record.categoria,
      cpf: record.cpf ? this.formatCpf(record.cpf) : '',
      vinculo: record.vinculo ?? 'VOLUNTARIO',
      registroConselho: record.registroConselho,
      especialidade: record.especialidade,
      email: record.email,
      telefone: record.telefone,
      salaAtendimento: record.salaAtendimento ?? '',
      unidade: record.unidade,
      cargaHoraria: record.cargaHoraria,
      disponibilidade: record.disponibilidade ?? [],
      canaisAtendimento: record.canaisAtendimento ?? [],
      status: record.status,
      tags: record.tags ?? [],
      resumo: record.resumo,
      observacoes: record.observacoes
    });
    this.photoPreview = record.foto3x4 ?? null;
    this.sincronizarUnidadeSelecionada();
  }

  remove(record: ProfessionalRecord): void {
    this.abrirDialogoConfirmacao(
      'Excluir profissional',
      `Deseja remover ${record.nomeCompleto} do cadastro? Esta ação não pode ser desfeita.`,
      'Excluir',
      () => {
        this.professionalService
          .delete(record.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.professionals = this.professionals.filter((item) => item.id !== record.id);
              this.resetForm();
              this.changeTab('dados');
              this.applyListFilters();
            },
            error: () => {
              this.setFeedback('Não foi possível remover o profissional. Tente novamente.');
            }
          });
      }
    );
  }

  toggleSelection(path: (string | number)[], option: string): void {
    const control = this.form.get(path);
    const current = new Set(control?.value ?? []);
    current.has(option) ? current.delete(option) : current.add(option);
    control?.setValue(Array.from(current));
  }

  selectionChecked(path: (string | number)[], option: string): boolean {
    const control = this.form.get(path);
    return (control?.value as string[] | undefined)?.includes(option) ?? false;
  }

  addTag(tag: string): void {
    if (!tag.trim()) return;
    const control = this.form.get('tags');
    const formatted = titleCaseWords(tag.trim());
    const current = new Set(control?.value ?? []);
    current.add(formatted || tag.trim());
    control?.setValue(Array.from(current));
  }

  removeTag(tag: string): void {
    const control = this.form.get('tags');
    const current = new Set(control?.value ?? []);
    current.delete(tag);
    control?.setValue(Array.from(current));
  }

  resetForm(): void {
    this.editingId = null;
    this.form.reset({
      dadosPessoais: {
        nome_completo: '',
        data_nascimento: '',
        foto_3x4: '',
        sexo_biologico: '',
        estado_civil: '',
        nacionalidade: '',
        naturalidade_cidade: '',
        naturalidade_uf: '',
        nome_mae: ''
      },
      endereco: {
        cep: '',
        logradouro: '',
        numero: '',
        complemento: '',
        bairro: '',
        ponto_referencia: '',
        municipio: '',
        zona: '',
        subzona: '',
        uf: ''
      },
      categoria: this.categorias[0],
      cpf: '',
      vinculo: 'VOLUNTARIO',
      registroConselho: '',
      especialidade: '',
      email: '',
      telefone: '',
      unidadeId: null,
      unidade: '',
      salaAtendimento: '',
      cargaHoraria: 20,
      disponibilidade: [],
      canaisAtendimento: ['Presencial'],
      status: 'INCOMPLETO',
      tags: [],
      resumo: '',
      observacoes: ''
    });
    this.photoPreview = null;
    this.cepLookupError = null;
    this.salasDisponiveis = [];
    this.definirUnidadePadrao(this.unidadeAtual);
  }

  clearFeedback(): void {
    this.feedback = null;
    this.clearFeedbackTimeout();
  }

  private setFeedback(message: string, timeoutMs = 10000): void {
    this.feedback = message;
    this.clearFeedbackTimeout();
    this.feedbackTimeout = setTimeout(() => {
      this.feedback = null;
      this.feedbackTimeout = undefined;
    }, timeoutMs);
  }

  private clearFeedbackTimeout(): void {
    if (this.feedbackTimeout) {
      clearTimeout(this.feedbackTimeout);
      this.feedbackTimeout = undefined;
    }
  }

  printProfessional(): void {
    const record = this.editingId ? this.professionals.find((item) => item.id === this.editingId) : null;
    const data = record ?? (this.buildPayload() as ProfessionalPayload);

    const disponibilidade = (data.disponibilidade ?? []).join(' | ') || 'Não informado';
    const canais = (data.canaisAtendimento ?? []).join(' | ') || 'Não informado';
    const tags = (data.tags ?? []).join(', ') || 'Sem tags definidas';

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Dados do profissional</title>
          <style>
            @page { size: A4; margin: 12mm; }
            body { font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif; color: #0f172a; }
            h1 { font-size: 1.4rem; margin-bottom: 0.25rem; }
            p { margin: 0.1rem 0 0.35rem; color: #475569; }
            dl { display: grid; grid-template-columns: 180px 1fr; gap: 0.25rem 0.75rem; margin: 1rem 0; }
            dt { font-weight: 700; color: #0f172a; }
            dd { margin: 0; color: #1f2937; }
            .pill { display: inline-flex; align-items: center; padding: 0.2rem 0.6rem; border-radius: 999px; background: #ecfdf3; color: #166534; font-weight: 700; font-size: 0.82rem; }
          </style>
        </head>
        <body>
          <h1>Perfil profissional</h1>
          <p class="pill">${data.status || 'Sem status'}</p>
          <dl>
            <dt>Nome completo</dt>
            <dd>${data.nomeCompleto || 'Não informado'}</dd>
            <dt>Categoria</dt>
            <dd>${data.categoria || 'Não informado'}</dd>
            <dt>Especialidade</dt>
            <dd>${data.especialidade || 'Não informado'}</dd>
            <dt>Registro em conselho</dt>
            <dd>${data.registroConselho || 'Não informado'}</dd>
            <dt>E-mail</dt>
            <dd>${data.email || 'Não informado'}</dd>
            <dt>Telefone/WhatsApp</dt>
            <dd>${data.telefone || 'Não informado'}</dd>
            <dt>Unidade de atendimento</dt>
            <dd>${data.unidade || 'Não informado'}</dd>
            <dt>Carga horaria</dt>
            <dd>${data.cargaHoraria ? data.cargaHoraria + 'h semanais' : 'Não informado'}</dd>
            <dt>Disponibilidade</dt>
            <dd>${disponibilidade}</dd>
            <dt>Canais de atendimento</dt>
            <dd>${canais}</dd>
            <dt>Palavras-chave</dt>
            <dd>${tags}</dd>
            <dt>Resumo breve</dt>
            <dd>${data.resumo || 'Sem resumo'}</dd>
            <dt>Observações internas</dt>
            <dd>${data.observacoes || 'Sem observacoes'}</dd>
          </dl>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  removeCurrent(): void {
    if (!this.editingId) return;

    const current = this.professionals.find((item) => item.id === this.editingId);
    if (!current) {
      this.startNew();
      return;
    }

    this.abrirDialogoConfirmacao(
      'Excluir profissional',
      `Deseja remover ${current.nomeCompleto} do cadastro? Esta ação não pode ser desfeita.`,
      'Excluir',
      () => {
        this.professionalService
          .delete(current.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.professionals = this.professionals.filter((item) => item.id !== current.id);
              this.startNew();
            },
            error: () => {
              this.setFeedback('Não foi possível remover o profissional. Tente novamente.');
            }
          });
      }
    );
  }

  abrirDialogoConfirmacao(
    titulo: string,
    mensagem: string,
    confirmarLabel: string,
    acao: () => void
  ): void {
    this.dialogTitulo = titulo;
    this.dialogMensagem = mensagem;
    this.dialogConfirmarLabel = confirmarLabel;
    this.dialogAcao = acao;
    this.dialogConfirmacaoAberta = true;
  }

  confirmarDialogo(): void {
    const acao = this.dialogAcao;
    this.dialogConfirmacaoAberta = false;
    this.dialogAcao = undefined;
    acao?.();
  }

  cancelarDialogo(): void {
    this.dialogConfirmacaoAberta = false;
    this.dialogAcao = undefined;
  }

  closeForm(): void {
    window.history.back();
  }

  onSave(): void {
    this.submit();
  }

  onCancel(): void {
    this.resetForm();
  }

  onDelete(): void {
    this.removeCurrent();
  }

  onNew(): void {
    this.startNew();
  }

  onPrint(): void {
    const profissionalAtual = this.editingId
      ? this.professionals.find((item) => item.id === this.editingId)
      : this.buildPayload();
    if (!profissionalAtual) {
      this.setFeedback('Não foi possível obter os dados do profissional para imprimir.');
      return;
    }

    const usuarioEmissor =
      this.authService.user()?.nome || this.authService.user()?.nomeUsuario || 'Sistema';
    const vinculoTipo =
      (profissionalAtual as ProfessionalRecord)?.vinculo ||
      (profissionalAtual as ProfessionalPayload)?.vinculo ||
      this.form.get('vinculo')?.value ||
      'VOLUNTARIO';

    this.termoPrintService.printTermoVoluntariado(
      this.mapUnidadeParaTermo(this.unidadeAtual),
      this.mapProfissionalParaTermo(profissionalAtual),
      usuarioEmissor,
      vinculoTipo
    );
  }

  onClose(): void {
    this.closeForm();
  }

  private mapUnidadeParaTermo(unidade: AssistanceUnitPayload | null): any {
    return {
      nomeFantasia: unidade?.nomeFantasia,
      razaoSocial: unidade?.razaoSocial,
      cnpj: unidade?.cnpj,
      endereco: unidade?.endereco,
      numeroEndereco: unidade?.numeroEndereco,
      complemento: unidade?.complemento,
      bairro: unidade?.bairro,
      cidade: unidade?.cidade,
      estado: unidade?.estado,
      inscricaoMunicipal: (unidade as any)?.inscricaoMunicipal,
      coordenadorNome: (unidade as any)?.coordenadorNome,
      logomarca: unidade?.logomarca,
      logomarcaRelatorio: unidade?.logomarcaRelatorio
    };
  }

  private mapProfissionalParaTermo(profissional: ProfessionalRecord | ProfessionalPayload): any {
    const value = profissional as ProfessionalPayload;
    return {
      nome: value.nomeCompleto,
      cpf: value.cpf,
      email: value.email,
      telefoneCelular: value.telefone,
      voluntariadoAtividades: value.tags ?? [],
      voluntariadoOutros: value.resumo,
      voluntariadoPeriodo: value.unidade
    };
  }

  onBuscar(): void {
    this.changeTab('lista');
    this.buscarProfissionaisNaListagem();
  }

  onBuscarEnter(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.listLoading) return;
    this.onBuscar();
  }

  private buscarProfissionaisNaListagem(exibirPopupSemResultados = true): void {
    if (this.listLoading) return;

    this.listLoading = true;
    this.popupErros = [];
    const { nome } = this.searchForm.value;
    const filtroNome = (nome ?? '').toString().trim();

    this.professionalService
      .list(filtroNome || undefined)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.listLoading = false;
        })
      )
      .subscribe({
        next: (records) => {
          this.professionals = records;
          this.applyListFilters();
          if (exibirPopupSemResultados && !this.filteredProfessionals.length) {
            const builder = new PopupErrorBuilder();
            builder.adicionar('Nenhum resultado encontrado.');
            this.popupErros = builder.build();
          }
        },
        error: () => {
          this.setFeedback('Não foi possível carregar os profissionais.');
        }
      });
  }

  private applyListFilters(): void {
    const { nome, categoria, email, status } = this.searchForm.value;
    const filtroNome = this.normalizeText(nome);
    const filtroCategoria = this.normalizeText(categoria);
    const filtroEmail = this.normalizeText(email);
    const filtroStatus = (status ?? '').toString().trim();

    this.filteredProfessionals = (this.professionals ?? [])
      .filter((item) => {
        if (filtroNome && !this.normalizeText(item.nomeCompleto).includes(filtroNome)) return false;
        if (filtroCategoria && !this.normalizeText(item.categoria).includes(filtroCategoria)) return false;
        if (filtroEmail && !this.normalizeText(item.email).includes(filtroEmail)) return false;
        if (filtroStatus && item.status !== filtroStatus) return false;
        return true;
      })
      .sort((a, b) => this.normalizeText(a.nomeCompleto).localeCompare(this.normalizeText(b.nomeCompleto), 'pt-BR'));

    this.paginaAtual = 1;
  }

  private normalizeText(value?: string | null): string {
    return (value ?? '')
      .toString()
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  onCpfInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const formatted = this.formatCpf(input.value);
    input.value = formatted;
    this.form.get('cpf')?.setValue(formatted, { emitEvent: false });
  }

  private normalizeCpf(value?: string | null): string {
    return (value ?? '').toString().replace(/\D/g, '');
  }

  private formatCpf(value?: string | null): string {
    const digits = this.normalizeCpf(value);
    const p1 = digits.slice(0, 3);
    const p2 = digits.slice(3, 6);
    const p3 = digits.slice(6, 9);
    const p4 = digits.slice(9, 11);

    if (digits.length <= 3) return p1;
    if (digits.length <= 6) return `${p1}.${p2}`;
    if (digits.length <= 9) return `${p1}.${p2}.${p3}`;
    return `${p1}.${p2}.${p3}-${p4}`;
  }

  private cpfValidator = (control: AbstractControl): ValidationErrors | null => {
    const value = this.normalizeCpf(control.value as string);
    if (!value) return null;
    if (value.length !== 11 || /^(\d)\1+$/.test(value)) return { cpfInvalid: true };

    let sum = 0;
    for (let i = 0; i < 9; i += 1) sum += Number(value.charAt(i)) * (10 - i);
    let digit = 11 - (sum % 11);
    if (digit > 9) digit = 0;
    if (digit !== Number(value.charAt(9))) return { cpfInvalid: true };

    sum = 0;
    for (let i = 0; i < 10; i += 1) sum += Number(value.charAt(i)) * (11 - i);
    digit = 11 - (sum % 11);
    if (digit > 9) digit = 0;
    return digit === Number(value.charAt(10)) ? null : { cpfInvalid: true };
  };

  private definirStatusProfissional(): ProfessionalStatus {
    const camposObrigatorios = [
      'dadosPessoais.nome_completo',
      'dadosPessoais.data_nascimento',
      'dadosPessoais.nome_mae',
      'cpf',
      'email',
      'categoria',
      'vinculo'
    ];

    const completo = camposObrigatorios.every((path) => {
      const control = this.form.get(path);
      const valor = String(control?.value ?? '').trim();
      if (!valor) return false;
      if (control?.invalid) return false;
      return true;
    });

    return completo ? 'ATIVO' : 'INCOMPLETO';
  }

  private buildPayload(): ProfessionalPayload {
    const value = this.form.value as any;
    const dados = value.dadosPessoais ?? {};
    const endereco = value.endereco ?? {};
    return {
      nomeCompleto: dados.nome_completo,
      cpf: this.normalizeCpf(value.cpf),
      dataNascimento: dados.data_nascimento,
      foto3x4: dados.foto_3x4,
      sexoBiologico: dados.sexo_biologico,
      estadoCivil: dados.estado_civil,
      nacionalidade: dados.nacionalidade,
      naturalidadeCidade: dados.naturalidade_cidade,
      naturalidadeUf: dados.naturalidade_uf,
      nomeMae: dados.nome_mae,
      cep: this.normalizeCep(endereco.cep),
      logradouro: endereco.logradouro,
      numero: endereco.numero,
      complemento: endereco.complemento,
      bairro: endereco.bairro,
      pontoReferencia: endereco.ponto_referencia,
      municipio: endereco.municipio,
      zona: endereco.zona,
      subzona: endereco.subzona,
      uf: endereco.uf,
      categoria: value.categoria,
      vinculo: value.vinculo,
      registroConselho: value.registroConselho,
      especialidade: value.especialidade,
      email: value.email,
      telefone: value.telefone,
      unidade: value.unidade,
      salaAtendimento: value.salaAtendimento,
      cargaHoraria: value.cargaHoraria,
      disponibilidade: value.disponibilidade ?? [],
      canaisAtendimento: value.canaisAtendimento ?? [],
      status: this.definirStatusProfissional(),
      tags: value.tags ?? [],
      resumo: value.resumo,
      observacoes: value.observacoes
    };
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      this.setPhotoPreview(dataUrl);
      input.value = '';
    };
    reader.readAsDataURL(file);
  }

  removePhoto(): void {
    this.photoPreview = null;
    this.form.get(['dadosPessoais', 'foto_3x4'])?.reset();
  }

  private setPhotoPreview(dataUrl: string): void {
    this.photoPreview = dataUrl;
    this.form.get(['dadosPessoais', 'foto_3x4'])?.setValue(dataUrl);
  }

  @ViewChild('videoElement') videoElement?: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement?: ElementRef<HTMLCanvasElement>;

  async handleCameraCapture(): Promise<void> {
    if (this.cameraActive) {
      this.capturePhoto();
      return;
    }

    await this.startCamera();
  }

  private async startCamera(): Promise<void> {
    this.captureError = null;
    try {
      this.videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
      const video = this.videoElement?.nativeElement;
      if (video) {
        video.srcObject = this.videoStream;
        this.cameraActive = true;
        await video.play();
      }
    } catch (error) {
      console.error('Erro ao iniciar camera', error);
      this.captureError = 'Não foi possível acessar a câmera.';
      this.cameraActive = false;
      if (this.videoStream) {
        this.videoStream.getTracks().forEach((track) => track.stop());
        this.videoStream = undefined;
      }
    }
  }

  private capturePhoto(): void {
    const video = this.videoElement?.nativeElement;
    const canvas = this.canvasElement?.nativeElement;
    if (!video || !canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    canvas.width = 480;
    canvas.height = 640;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/png');
    this.setPhotoPreview(dataUrl);
    this.stopCamera();
  }

  stopCamera(): void {
    if (this.videoStream) {
      this.videoStream.getTracks().forEach((track) => track.stop());
      this.videoStream = undefined;
    }
    const video = this.videoElement?.nativeElement;
    if (video) {
      video.srcObject = null;
    }
    this.cameraActive = false;
  }

  private cepValidator = (control: AbstractControl): ValidationErrors | null => {
    const value = (control.value as string | null | undefined)?.replace(/\D/g, '') ?? '';
    if (!value) return null;
    return value.length === 8 ? null : { cep: true };
  };

  onCepInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 8);
    let formatted = digits;

    if (digits.length > 5) {
      formatted = `${digits.slice(0, 5)}-${digits.slice(5)}`;
    }

    this.form.get(['endereco', 'cep'])?.setValue(formatted, { emitEvent: false });
    this.cepLookupError = null;

    if (digits.length === 8) {
      this.lookupAddressByCep(digits);
    }
  }

  onCepBlur(): void {
    const cepControl = this.form.get(['endereco', 'cep']);
    if (!cepControl) return;

    if (cepControl.invalid) {
      this.cepLookupError = cepControl.value ? 'Informe um CEP valido para consultar o endereco.' : null;
      return;
    }

    const digits = this.normalizeCep(cepControl.value as string);
    if (digits?.length === 8) {
      this.lookupAddressByCep(digits);
    }
  }

  private lookupAddressByCep(cep: string): void {
    this.cepLookupError = null;
    this.http
      .get<ViaCepResponse>(`https://viacep.com.br/ws/${cep}/json/`)
      .pipe()
      .subscribe({
        next: (response) => {
          if (response?.erro) {
            this.cepLookupError = 'CEP n?o encontrado.';
            return;
          }

          this.form.get('endereco')?.patchValue({
            logradouro: response.logradouro ?? '',
            bairro: response.bairro ?? '',
            municipio: response.localidade ?? '',
            uf: response.uf ?? ''
          });
        },
        error: () => {
          this.cepLookupError = 'Não foi possível consultar o CEP.';
        }
      });
  }

  private formatCep(value?: string | null): string {
    const digits = this.normalizeCep(value ?? '');
    if (!digits) return '';
    return digits.length === 8 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
  }

  private normalizeCep(value?: string | null): string | undefined {
    const digits = (value ?? '').replace(/\D/g, '');
    return digits || undefined;
  }

  private setupCapitalizationRules(): void {
    const applyRule = (controlName: string) => {
      const control = this.form.get(controlName);
      if (!control) return;

      const subscription = control.valueChanges.subscribe((value) => {
        if (typeof value !== 'string') return;
        if (controlName === 'email') return;

        this.applyCapitalization(controlName);
      });

      this.capitalizationSubs.push(() => subscription.unsubscribe());
    };

    [
      'dadosPessoais.nome_completo',
      'dadosPessoais.naturalidade_cidade',
      'dadosPessoais.nome_mae',
      'endereco.logradouro',
      'endereco.complemento',
      'endereco.bairro',
      'endereco.ponto_referencia',
      'endereco.municipio',
      'categoria',
      'registroConselho',
      'especialidade',
      'telefone',
      'unidade'
    ].forEach(applyRule);
  }

  applyCapitalization(controlName: string, rawValue?: string): void {
    const control = this.form.get(controlName);
    if (!control) return;
    if (controlName === 'email') return;

    const currentValue = rawValue ?? control.value;
    if (typeof currentValue !== 'string') return;

    const transformed = titleCaseWords(currentValue);
    if (transformed && transformed !== currentValue) {
      control.setValue(transformed, { emitEvent: false });
    }
  }
}


