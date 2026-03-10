import { CommonModule } from '@angular/common';

import { Component, OnDestroy, OnInit } from '@angular/core';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

import {
  faCalendarAlt,
  faCheckCircle,
  faGraduationCap,
  faPrint,
  faTimesCircle
} from '@fortawesome/free-solid-svg-icons';
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons';

import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { FormsModule } from '@angular/forms';

import {

  CoursePayload,

  CourseRecord,

  CursosAtendimentosService,

  Enrollment,

  EnrollmentStatus,

  PresencaAnexoRecord,

  PresencaDataRecord,

  PresencaResponse,

  PresencaStatus,

  StatusAgendamento,

  WaitlistEntry,

} from '../../services/cursos-atendimentos.service';

import { BeneficiaryPayload } from '../../services/beneficiary.service';

import {

  BeneficiarioApiPayload,

  BeneficiarioApiService,

} from '../../services/beneficiario-api.service';

import { SalaRecord, SalasService } from '../../services/salas.service';

import { AssistanceUnitPayload, AssistanceUnitService } from '../../services/assistance-unit.service';

import { ProfessionalRecord, ProfessionalService } from '../../services/professional.service';

import { VolunteerService } from '../../services/volunteer.service';

import { catchError, debounceTime, distinctUntilChanged, finalize, firstValueFrom, forkJoin, of, Subscription, switchMap, tap, timeout } from 'rxjs';

import { titleCaseWords } from '../../utils/capitalization.util';



import { TelaPadraoComponent } from '../compartilhado/tela-padrao/tela-padrao.component';

import { DialogComponent } from '../compartilhado/dialog/dialog.component';

import { ConfigAcoesCrud, EstadoAcoesCrud, TelaBaseComponent } from '../compartilhado/tela-base.component';

import { ReportService } from '../../services/report.service';

import { AuthService } from '../../services/auth.service';

import { AutocompleteComponent, AutocompleteOpcao } from '../compartilhado/autocomplete/autocomplete.component';

import { PopupMessagesComponent } from '../compartilhado/popup-messages/popup-messages.component';

import { PopupErrorBuilder } from '../../utils/popup-error.builder';

const generateId = (): string => {

  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {

    return crypto.randomUUID();

  }



  // Fallback for environments without crypto.randomUUID

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {

    const random = (Math.random() * 16) | 0;

    const value = char === 'x' ? random : (random & 0x3) | 0x8;

    return value.toString(16);

  });

};



interface StepTab {

  id: string;

  label: string;

}



interface ProfissionalAgendaItem {

  id: string;

  nome: string;

  tipo: 'PROFISSIONAL' | 'VOLUNTARIO';

  sublabel?: string;

}



interface DashboardSnapshot {

  totalVagas: number;

  vagasDisponiveis: number;

  vagasEmUso: number;

  ocupacao: number;

  totalMatriculas: number;

  totalInscricoes: number;

  concluidos: number;

  cancelados: number;

  waitlist: number;

  waitlistPressao: number;

  cursos: number;

  atendimentos: number;

  oficinas: number;

  profissionais: number;

  mediaCargaHoraria: number;

  taxaConclusao: number;

}



interface DashboardWidget {

  id: string;

  title: string;

  description: string;

  gradient: string;

  getValue(snapshot: DashboardSnapshot): string;

  getHelper(snapshot: DashboardSnapshot): string;

  getProgress?: (snapshot: DashboardSnapshot) => number;

}



interface WidgetState {

  order: string[];

  hidden: string[];

}



@Component({

  selector: 'app-cursos-atendimentos',

  standalone: true,

  imports: [

    CommonModule,

    ReactiveFormsModule,

    FormsModule,

    FontAwesomeModule,

    TelaPadraoComponent,

    DialogComponent,

    AutocompleteComponent,

    PopupMessagesComponent

  ],

  templateUrl: './cursos-atendimentos.component.html',

  styleUrl: './cursos-atendimentos.component.scss'

})

export class CursosAtendimentosComponent extends TelaBaseComponent implements OnInit, OnDestroy {

  readonly faGraduationCap = faGraduationCap;

  readonly faPrint = faPrint;

  readonly faWhatsapp = faWhatsapp;
  readonly faCheckCircle = faCheckCircle;
  readonly faCalendarAlt = faCalendarAlt;
  readonly faTimesCircle = faTimesCircle;

  readonly tabs: StepTab[] = [

    { id: 'dashboard', label: 'Dashboard' },

    { id: 'dados', label: 'Dados de Matrículas' },

    { id: 'catalogo', label: 'Catálogo e vagas' },

    { id: 'inscricoes', label: 'Inscrições e lista de espera' },

    { id: 'agenda', label: 'Atendimentos agendados' },

    { id: 'presenca', label: 'Presença' },

    { id: 'listagem', label: 'Listagem de matrículas' }

  ];



  readonly diasSemana = [

    'Domingo',

    'Segunda-feira',

    'Terça-feira',

    'Quarta-feira',

    'Quinta-feira',

    'Sexta-feira',

    'Sábado'

  ];



  readonly faixasEtarias = [

    '0 a 5 anos',

    '6 a 11 anos',

    '12 a 17 anos',

    '18 a 29 anos',

    '30 a 59 anos',

    '60 anos ou mais'

  ];



  activeTab: StepTab['id'] = 'dashboard';

  feedback: string | null = null;

  popupErros: string[] = [];
  private popupTimeout?: ReturnType<typeof setTimeout>;

  printDialogOpen = false;

  saving = false;

  editingId: string | null = null;

  listaEsperaDialogAberto = false;

  private listaEsperaPendente: { beneficiaryName: string; cpf: string } | null = null;

  confirmacaoExclusaoAberta = false;

  confirmacaoExclusaoTipo: 'matricula' | 'fila' | null = null;
  get confirmacaoExclusaoMensagem(): string {
    if (this.confirmacaoExclusaoTipo === 'matricula') {
      return 'Deseja excluir a matrícula selecionada?';
    }
    if (this.confirmacaoExclusaoTipo === 'fila') {
      return 'Deseja remover o beneficiário da lista de espera?';
    }
    return 'Deseja confirmar esta exclusão?';
  }


  private exclusaoPendente:

    | { tipo: 'matricula'; matricula: Enrollment }

    | { tipo: 'fila'; item: WaitlistEntry }

    | null = null;

  private readonly capitalizationSubs: Subscription[] = [];



  courseForm: FormGroup;

  enrollmentForm: FormGroup;

  agendamentoForm: FormGroup;

  beneficiaryResults: BeneficiaryPayload[] = [];

  beneficiarySearchLoading = false;

  private beneficiarySearchSub?: Subscription;

  professionalResults: ProfessionalRecord[] = [];

  professionalSearchLoading = false;

  private professionalSearchSub?: Subscription;

  rooms: SalaRecord[] = [];

  roomsLoading = false;

  unidadeAtualId: number | null = null;

  dataPresencaSelecionada = '';

  presencaDataSelecionada: PresencaDataRecord | null = null;

  presencaDatas: PresencaDataRecord[] = [];

  presencaAnexos: PresencaAnexoRecord[] = [];

  presencaCarregando = false;

  presencaSalvando = false;

  presencaGerando = false;

  presencaAnexosCarregando = false;

  presencaAnexoEnviando = false;

  presencaObservacoes = '';

  presencaExibirCpf = true;

  presencaPendente = false;

  private presencasPorMatricula: Record<string, PresencaStatus> = {};

  dataAgendaSelecionada = '';

  filtroStatusAgenda = 'TODOS';

  profissionalFiltroTermo = '';

  profissionalFiltroSelecionadoId: string | null = null;

  profissionalAgendaTermo = '';

  profissionalAgendaCarregando = false;

  profissionaisAgendaBase: ProfissionalAgendaItem[] = [];

  profissionalFiltroOpcoes: AutocompleteOpcao[] = [];

  profissionalAgendaOpcoes: AutocompleteOpcao[] = [];

  beneficiarioAgendaTermo = '';

  beneficiarioAgendaOpcoes: AutocompleteOpcao[] = [];

  unidadeAtual: AssistanceUnitPayload | null = null;



  readonly statusAgendamentoOpcoes: { valor: StatusAgendamento; label: string }[] = [

    { valor: 'AGUARDANDO', label: 'Aguardando' },

    { valor: 'CONFIRMADO', label: 'Confirmado' },

    { valor: 'REMARCAR', label: 'Remarcar' },

    { valor: 'REMARCADO', label: 'Remarcado' },

    { valor: 'NAO_RESPONDEU', label: 'Não respondeu' }

  ];



  records: CourseRecord[] = [];

  dashboardSnapshot: DashboardSnapshot = this.buildDashboardSnapshot();

  widgetState: WidgetState = { order: [], hidden: [] };

  readonly dashboardWidgets: DashboardWidget[] = [

    {

      id: 'ocupacao',

      title: 'Taxa de ocupação',

      description: 'Quanto das vagas está preenchido nos cursos e atendimentos.',

      gradient: 'teal',

      getValue: (snapshot) => `${snapshot.ocupacao}%`,

      getHelper: (snapshot) => `${snapshot.vagasEmUso}/${snapshot.totalVagas || 0} vagas em uso`,

      getProgress: (snapshot) => snapshot.ocupacao

    },

    {

      id: 'profissionais',

      title: 'Profissionais ativos',

      description: 'Responsáveis vinculados às ofertas cadastradas.',

      gradient: 'teal',

      getValue: (snapshot) => `${snapshot.profissionais}`,

      getHelper: (snapshot) => `${snapshot.mediaCargaHoraria}h média de carga semanal`

    },

    {

      id: 'matriculas',

      title: 'Inscrições ativas',

      description: 'Matrículas em andamento e fila de espera.',

      gradient: 'teal',

      getValue: (snapshot) => `${snapshot.totalMatriculas}`,

      getHelper: (snapshot) => `${snapshot.totalInscricoes} registros + ${snapshot.waitlist} em espera`,

      getProgress: (snapshot) => Math.min(100, Math.max(10, 100 - snapshot.waitlistPressao))

    },

    {

      id: 'conclusao',

      title: 'Taxa de conclusão',

      description: 'Percentual de beneficiários que concluíram as atividades.',

      gradient: 'teal',

      getValue: (snapshot) => `${snapshot.taxaConclusao}%`,

      getHelper: (snapshot) => `${snapshot.concluidos} concluídos • ${snapshot.cancelados} cancelamentos`,

      getProgress: (snapshot) => snapshot.taxaConclusao

    },

    {

      id: 'portfolio',

      title: 'Portfólio de ofertas',

      description: 'Distribuição entre cursos, atendimentos e oficinas.',

      gradient: 'teal',

      getValue: (snapshot) => `${snapshot.cursos + snapshot.atendimentos + snapshot.oficinas}`,

      getHelper: (snapshot) => `${snapshot.cursos} cursos • ${snapshot.atendimentos} atendimentos • ${snapshot.oficinas} oficinas`

    },

    

  ];

  private readonly widgetPrefsKey = 'g3.cursos.dashboard.widgets';



  readonly acoesToolbar: Required<ConfigAcoesCrud> = this.criarConfigAcoes({

    buscar: true,

    novo: true,

    salvar: true,

    cancelar: true,

    excluir: true,

    imprimir: true

  });



  constructor(

    private readonly fb: FormBuilder,

    private readonly service: CursosAtendimentosService,

    private readonly beneficiarioApiService: BeneficiarioApiService,

    private readonly salasService: SalasService,

    private readonly professionalService: ProfessionalService,

    private readonly volunteerService: VolunteerService,

    private readonly unitService: AssistanceUnitService,

    private readonly reportService: ReportService,

    private readonly authService: AuthService

  ) {

    super();

    this.courseForm = this.fb.group({

      tipo: ['Curso', Validators.required],

      nome: ['', Validators.required],

      descricao: ['', Validators.required],

      imagem: [''],

      vagasTotais: [10, [Validators.required, Validators.min(1)]],

      cargaHoraria: [null],

      horarioInicial: ['', Validators.required],

      duracaoHoras: [1, [Validators.required, Validators.min(1)]],

      diasSemana: this.fb.control<string[]>([], Validators.required),

      faixasEtarias: this.fb.control<string[]>([]),

      vagaPreferencialIdosos: [false],

      sexoPermitido: ['Todos'],

      restricoes: [''],

      profissional: ['', Validators.required],

      instituicaoParceira: [''],

      salaId: [null, Validators.required]

    });



    this.enrollmentForm = this.fb.group({

      courseId: [null, Validators.required],

      beneficiaryName: ['', Validators.required],

      cpf: ['', Validators.required]

    });



    this.agendamentoForm = this.fb.group({

      matriculaId: [null, Validators.required],

      dataAgendada: ['', Validators.required],

      horaAgendada: ['', Validators.required],

      profissionalId: ['', Validators.required],

      profissionalNome: ['', Validators.required],

      profissionalTipo: ['', Validators.required],

      statusAgendamento: ['AGUARDANDO', Validators.required]

    });

  }



  ngOnInit(): void {

    this.setupCapitalizationRules();

    this.loadWidgetPreferences();

    this.fetchRecords();

    this.setupBeneficiarySearch();

    this.setupProfessionalSearch();

    this.carregarProfissionaisAgenda();

    this.dataAgendaSelecionada = new Date().toISOString().slice(0, 10);

    this.unitService.get().subscribe({

      next: ({ unidade }) => {

        this.unidadeAtualId = unidade?.id ?? null;

        this.unidadeAtual = unidade ?? null;

        this.fetchRooms();

      },

      error: () => {

        this.unidadeAtualId = null;

        this.fetchRooms();

      }

    });

  }



  ngOnDestroy(): void {

    this.beneficiarySearchSub?.unsubscribe();

    this.professionalSearchSub?.unsubscribe();

    this.capitalizationSubs.forEach((sub) => sub.unsubscribe());

  }



  fetchRooms(): void {

    this.roomsLoading = true;

    this.salasService.list(this.unidadeAtualId ?? undefined).subscribe({

      next: (rooms) => {

        this.rooms = rooms;

        this.roomsLoading = false;

      },

      error: () => {

        this.roomsLoading = false;

        this.feedback = 'Não foi possível carregar as salas. Tente novamente.';

      }

    });

  }

  get estadoAcoesToolbar(): EstadoAcoesCrud {

    return {

      excluir: !this.editingId,

      imprimir: true

    };

  }



  get activeTabIndex(): number {

    return Math.max(

      0,

      this.tabs.findIndex((tab) => tab.id === this.activeTab)

    );

  }



  get hasPreviousTab(): boolean {

    return this.activeTabIndex > 0;

  }



  get hasNextTab(): boolean {

    return this.activeTabIndex < this.tabs.length - 1;

  }



  get nextTabLabel(): string {

    if (!this.hasNextTab) return '';

    return this.tabs[this.activeTabIndex + 1].label;

  }



  get currentCourse(): CourseRecord | null {

    const courseId = this.editingId ?? this.enrollmentForm.value.courseId;

    if (!courseId) return null;

    return this.records.find((record) => record.id === courseId) ?? null;

  }



  get matriculasAtivas(): Enrollment[] {

    return (this.currentCourse?.enrollments ?? []).filter((matricula) => matricula.status === 'Ativo');

  }



  get agendamentosFiltrados(): Enrollment[] {

    return this.obterAgendamentosDoDia()

      .filter((matricula) => {

        if (this.filtroStatusAgenda === 'TODOS') return true;

        return (matricula.statusAgendamento || 'AGUARDANDO') === this.filtroStatusAgenda;

      })

      .sort((a, b) => (a.horaAgendada || '').localeCompare(b.horaAgendada || ''));

  }

  get agendamentosPorProfissional(): { profissional: string; itens: Enrollment[] }[] {

    const grupos = new Map<string, Enrollment[]>();

    this.agendamentosFiltrados.forEach((matricula) => {

      const profissional = (matricula.profissionalNome || 'Profissional não informado').trim();

      const lista = grupos.get(profissional) ?? [];

      lista.push(matricula);

      grupos.set(profissional, lista);

    });

    return Array.from(grupos.entries())

      .sort(([a], [b]) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }))

      .map(([profissional, itens]) => ({ profissional, itens }));

  }



  get visibleWidgets(): DashboardWidget[] {

    const order = this.normalizeWidgetState();

    return order

      .map((id) => this.dashboardWidgets.find((widget) => widget.id === id))

      .filter((widget): widget is DashboardWidget => Boolean(widget))

      .filter((widget) => !this.widgetState.hidden.includes(widget.id));

  }



  trackWidget(_: number, widget: DashboardWidget): string {

    return widget.id;

  }



  isWidgetEnabled(id: string): boolean {

    return !this.widgetState.hidden.includes(id);

  }



  toggleWidget(id: string): void {

    const hidden = new Set(this.widgetState.hidden);

    if (hidden.has(id)) {

      hidden.delete(id);

    } else {

      hidden.add(id);

    }

    this.widgetState = { ...this.widgetState, hidden: Array.from(hidden) };

    this.persistWidgetPreferences();

  }



  moveWidget(id: string, direction: 'up' | 'down'): void {

    const order = [...this.normalizeWidgetState()];

    const index = order.indexOf(id);

    if (index < 0) return;



    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= order.length) return;



    const [removed] = order.splice(index, 1);

    order.splice(targetIndex, 0, removed);

    this.widgetState = { ...this.widgetState, order };

    this.persistWidgetPreferences();

  }



  changeTab(tabId: StepTab['id']): void {

    if (this.activeTab === tabId) return;

    this.activeTab = tabId;

  }



  goToPreviousTab(): void {

    if (!this.hasPreviousTab) return;

    this.changeTab(this.tabs[this.activeTabIndex - 1].id);

  }



  goToNextTab(): void {

    if (!this.hasNextTab) return;

    this.changeTab(this.tabs[this.activeTabIndex + 1].id);

  }



  dismissFeedback(): void {

    this.feedback = null;

  }



  fecharPopupErros(): void {

    this.popupErros = [];

  }

  private abrirPopupTemporario(): void {
    if (this.popupTimeout) {
      clearTimeout(this.popupTimeout);
    }
    this.popupTimeout = setTimeout(() => {
      this.fecharPopupErros();
    }, 10000);
  }



  selectionChecked(path: string[], value: string): boolean {

    const control = this.courseForm.get(path);

    const current = control?.value as string[] | null;

    return Array.isArray(current) && current.includes(value);

  }



  toggleSelection(path: string[], value: string): void {

    const control = this.courseForm.get(path);

    if (!control) return;

    const current = (control.value as string[] | null) ?? [];

    const updated = current.includes(value)

      ? current.filter((item) => item !== value)

      : [...current, value];

    control.setValue(updated);

    control.markAsDirty();

  }



  getRoomName(course: CourseRecord): string {
    const roomId = this.normalizarSalaId(course.salaId ?? course.sala?.id);

    if (roomId !== null) {
      const room = this.rooms.find(
        (item) => this.normalizarSalaId(item.id) === roomId
      );

      if (room) return room.nome;
    }

    return course.sala?.nome ?? 'Não informado';
  }



  submit(): void {

    this.feedback = null;

    if (this.courseForm.invalid) {

      this.courseForm.markAllAsTouched();

      this.feedback = 'Preencha os campos obrigatorios antes de salvar.';

      this.changeTab('dados');

      return;

    }



    const formValue = this.courseForm.getRawValue();

    const basePayload = {

      ...formValue,

      diasSemana: formValue.diasSemana ?? [],

      imagem: formValue.imagem || null,

      restricoes: formValue.restricoes || null,

      salaId: this.normalizarSalaId(formValue.salaId)

    };

    const existing = this.currentCourse;

    const payload = {

      ...basePayload,

      enrollments: existing?.enrollments ?? [],

      waitlist: existing?.waitlist ?? [],

      vagasDisponiveis: existing?.vagasDisponiveis ?? basePayload.vagasTotais

    };



    this.saving = true;

    const request$ = this.editingId

      ? this.service.update(this.editingId, payload)

      : this.service.create(payload);



    request$.subscribe({

      next: (record) => {

        const normalized = this.normalizeRecord(record);

        if (this.editingId) {

          this.replaceRecord(normalized);

        } else {

          this.records = [normalized, ...this.records];

          this.refreshDashboardSnapshot();

          this.loadCourse(normalized.id);

        }

        this.saving = false;

      },

      error: () => {

        this.feedback = 'Não foi possível salvar o cadastro. Tente novamente.';

        this.saving = false;

      }

    });

  }



  fetchRecords(): void {

    this.feedback = null;

    this.service.list().subscribe({

      next: (records) => {

        this.records = records.map((record) => this.normalizeRecord(record));

        this.refreshDashboardSnapshot();

        if (this.editingId) {

          this.loadCourse(this.editingId);

        }

      },

      error: () => {

        this.feedback = 'Não foi possível carregar os registros. Tente novamente.';

      }

    });

  }



  onBuscar(): void {

    this.changeTab('catalogo');

  }



  onCancelar(): void {

    this.startNew();

  }



  onExcluir(): void {

    if (!this.currentCourse) return;

    this.deleteCourse(this.currentCourse);

  }



  onImprimir(): void {

    this.printDialogOpen = true;

  }



  closeForm(): void {

    window.history.back();

  }



  closePrintDialog(): void {

    this.printDialogOpen = false;

  }



  async imprimirRelacao(): Promise<void> {

    this.printDialogOpen = false;

    try {

      const blob = await firstValueFrom(

        this.reportService.generateCursosAtendimentosList({

          usuarioEmissor: this.usuarioEmissor()

        })

      );

      this.openPdfInNewWindow(blob);

    } catch (error) {

      console.error('Erro ao gerar relação de cursos e atendimentos', error);

      this.feedback = 'Falha ao gerar a relação de cursos e atendimentos.';

    }

  }



  async imprimirFichaSelecionada(): Promise<void> {

    const cursoId = this.currentCourse?.id;

    if (!cursoId) {

      this.feedback = 'Selecione um curso/atendimento antes de gerar a ficha.';

      this.printDialogOpen = false;

      return;

    }

    this.printDialogOpen = false;

    try {

      const blob = await firstValueFrom(

        this.reportService.generateCursoAtendimentoFicha({

          cursoId: String(cursoId),

          usuarioEmissor: this.usuarioEmissor()

        })

      );

      this.openPdfInNewWindow(blob);

    } catch (error) {

      console.error('Erro ao gerar ficha do curso/atendimento', error);

      this.feedback = 'Falha ao gerar a ficha do curso/atendimento.';

    }

  }



  private usuarioEmissor(): string {

    return (

      this.authService.user()?.nome ||

      this.authService.user()?.nomeUsuario ||

      'Sistema'

    );

  }



  private openPdfInNewWindow(blob: Blob, autoPrint = true): void {
    const url = URL.createObjectURL(blob);
    const documentWindow = window.open(url, '_blank', 'width=900,height=1100');
    if (!documentWindow) {
      this.feedback = 'Permita a abertura de pop-ups para visualizar o relatório.';
      URL.revokeObjectURL(url);
      return;
    }

    if (!autoPrint) {
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      return;
    }

    let printed = false;
    const triggerPrint = () => {
      if (printed) return;
      printed = true;
      documentWindow.focus();
      documentWindow.print();
    };

    documentWindow.addEventListener('load', triggerPrint, { once: true });
    setTimeout(triggerPrint, 1200);
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }



  loadCourse(courseId: string): void {

    const course = this.records.find((item) => item.id === courseId);

    if (!course) return;



    this.editingId = course.id;

    this.courseForm.reset({

      tipo: course.tipo,

      nome: course.nome,

      descricao: course.descricao,

      imagem: course.imagem ?? '',

      vagasTotais: course.vagasTotais,

      cargaHoraria: course.cargaHoraria ?? null,

      horarioInicial: course.horarioInicial,

      duracaoHoras: course.duracaoHoras,

      diasSemana: course.diasSemana,

      faixasEtarias: course.faixasEtarias ?? [],

      vagaPreferencialIdosos: course.vagaPreferencialIdosos ?? false,

      sexoPermitido: course.sexoPermitido ?? 'Todos',

      restricoes: course.restricoes ?? '',

      profissional: course.profissional,

      instituicaoParceira: course.instituicaoParceira ?? '',

      salaId: course.salaId ?? course.sala?.id ?? null

    });

    this.enrollmentForm.patchValue({ courseId: course.id });

    this.agendamentoForm.reset({

      matriculaId: null,

      dataAgendada: this.dataAgendaSelecionada,

      horaAgendada: '',

      profissionalId: '',

      profissionalNome: '',

      profissionalTipo: '',

      statusAgendamento: 'AGUARDANDO'

    });

    this.atualizarOpcoesBeneficiarioAgenda();

    this.resetPresenca();

    this.carregarPresencaDatas();

  }



  startNew(): void {

    this.editingId = null;

    this.courseForm.reset({

      tipo: 'Curso',

      nome: '',

      descricao: '',

      imagem: '',

      vagasTotais: 10,

      cargaHoraria: null,

      horarioInicial: '',

      duracaoHoras: 1,

      diasSemana: [],

      faixasEtarias: [],

      vagaPreferencialIdosos: false,

      sexoPermitido: 'Todos',

      restricoes: '',

      profissional: '',

      instituicaoParceira: '',

      salaId: null

    });

    this.enrollmentForm.patchValue({ courseId: null });

    this.changeTab('dados');

  }



  getCardAccent(course: CourseRecord): string {

    switch (course.tipo) {

      case 'Atendimento':

        return 'accent-sky';

      case 'Oficina':

        return 'accent-violet';

      default:

        return 'accent-emerald';

    }

  }



  deleteCourse(course: CourseRecord): void {

    if (!window.confirm(`Remover ${course.tipo.toLowerCase()} "${course.nome}"?`)) return;



    this.saving = true;

    this.service.delete(course.id).subscribe({

      next: () => {

        this.records = this.records.filter((item) => item.id !== course.id);



        if (this.editingId === course.id) {

          if (this.records.length) {

            this.loadCourse(this.records[0].id);

          } else {

            this.startNew();

          }

        }



        this.refreshDashboardSnapshot();

        this.saving = false;

      },

      error: () => {

        this.feedback = 'Não foi possível excluir o cadastro. Tente novamente.';

        this.saving = false;

      }

    });

  }



  private setupCapitalizationRules(): void {

    const applyRule = (form: FormGroup, controlName: string) => {

      const control = form.get(controlName);

      if (!control) return;



      const sub = control.valueChanges.subscribe((value) => {

        if (typeof value !== 'string') return;

        this.applyCapitalization(form, controlName);

      });



      this.capitalizationSubs.push(sub);

    };



    ['nome', 'profissional', 'instituicaoParceira'].forEach((controlName) => applyRule(this.courseForm, controlName));

    applyRule(this.enrollmentForm, 'beneficiaryName');

  }



  applyCapitalization(form: FormGroup, controlName: string, rawValue?: string): void {

    const control = form.get(controlName);

    if (!control) return;

    if (controlName.toLowerCase().includes('descricao')) return;



    const currentValue = rawValue ?? control.value;

    if (typeof currentValue !== 'string') return;



    const transformed = titleCaseWords(currentValue);



    if (transformed && transformed !== currentValue) {

      control.setValue(transformed, { emitEvent: false });

    }

  }



  handleImage(event: Event): void {

    const file = (event.target as HTMLInputElement)?.files?.[0];

    if (!file) return;



    const reader = new FileReader();

    reader.onload = () => this.courseForm.patchValue({ imagem: reader.result as string });

    reader.readAsDataURL(file);

  }



  enroll(): void {

    this.feedback = null;

    if (!this.currentCourse) {

      this.feedback = 'Selecione um curso/atendimento para gerenciar as inscrições.';

      return;

    }



    if (this.enrollmentForm.invalid) {

      this.enrollmentForm.markAllAsTouched();

      if (!this.enrollmentForm.value.courseId) {

        this.feedback = 'Selecione o curso/atendimento antes de inscrever.';

      }

      return;

    }



    const { beneficiaryName, cpf } = this.enrollmentForm.value;

    const normalizedCpf = (cpf || '').replace(/\D/g, '');

    const alreadyRegistered = this.currentCourse.enrollments.some(

      (enrollment) =>

        (normalizedCpf && (enrollment.cpf || '').replace(/\D/g, '') === normalizedCpf) ||

        enrollment.beneficiaryName.toLowerCase() === beneficiaryName.toLowerCase()

    );

    const alreadyOnWaitlist = this.currentCourse.waitlist.some(

      (entry) =>

        (normalizedCpf && (entry.cpf || '').replace(/\D/g, '') === normalizedCpf) ||

        entry.beneficiaryName.toLowerCase() === beneficiaryName.toLowerCase()

    );



    if (alreadyRegistered || alreadyOnWaitlist) {

      this.feedback = 'Este beneficiário já está inscrito ou aguardando neste curso/atendimento.';

      return;

    }



    if (this.currentCourse.vagasDisponiveis > 0) {

      const enrollment: Enrollment = {

        id: generateId(),

        beneficiaryName,

        cpf,

        status: 'Ativo',

        enrolledAt: new Date().toISOString()

      };

      this.currentCourse.enrollments.push(enrollment);

      this.currentCourse.vagasDisponiveis = this.calculateAvailable(this.currentCourse);

      this.persistCurrentCourse();

      this.enrollmentForm.reset({ courseId: this.currentCourse.id, beneficiaryName: '', cpf: '' });

    } else {

      this.abrirDialogListaEspera(beneficiaryName, cpf);

    }

  }



  updateEnrollmentStatus(enrollment: Enrollment, status: EnrollmentStatus): void {

    if (!this.currentCourse) return;



    const previous = enrollment.status;

    enrollment.status = status;



    if (previous === 'Ativo' && status !== 'Ativo') {

      this.currentCourse.vagasDisponiveis = Math.min(

        this.currentCourse.vagasTotais,

        this.currentCourse.vagasDisponiveis + 1

      );

    }



    if (status === 'Ativo') {

      if (this.currentCourse.vagasDisponiveis > 0) {

        this.currentCourse.vagasDisponiveis -= 1;

      } else {

        enrollment.status = previous;

        return;

      }

    }



    this.tryPromoteWaitlist();

    this.persistCurrentCourse();

  }



  removeEnrollment(enrollment: Enrollment): void {

    if (!this.currentCourse) return;

    this.exclusaoPendente = { tipo: 'matricula', matricula: enrollment };

    this.confirmacaoExclusaoTipo = 'matricula';

    this.confirmacaoExclusaoAberta = true;

  }



  private confirmarRemocaoMatricula(enrollment: Enrollment): void {

    if (!this.currentCourse) return;



    const statusAnterior = enrollment.status;

    this.currentCourse.enrollments = this.currentCourse.enrollments.filter(

      (item) => item.id !== enrollment.id

    );



    if (statusAnterior === 'Ativo') {

      this.currentCourse.vagasDisponiveis = Math.min(

        this.currentCourse.vagasTotais,

        this.currentCourse.vagasDisponiveis + 1

      );

    }



    this.persistCurrentCourse();

  }



  abrirDialogListaEspera(beneficiaryName: string, cpf: string): void {

    this.listaEsperaPendente = { beneficiaryName, cpf };

    this.listaEsperaDialogAberto = true;

  }



  cancelarDialogListaEspera(): void {

    this.listaEsperaDialogAberto = false;

    this.listaEsperaPendente = null;

  }



  confirmarDialogListaEspera(): void {

    if (!this.currentCourse || !this.listaEsperaPendente) {

      this.cancelarDialogListaEspera();

      return;

    }



    const entry: WaitlistEntry = {

      id: generateId(),

      beneficiaryName: this.listaEsperaPendente.beneficiaryName,

      cpf: this.listaEsperaPendente.cpf,

      joinedAt: new Date().toISOString()

    };

    this.currentCourse.waitlist.push(entry);

    this.persistCurrentCourse();

    this.enrollmentForm.reset({ courseId: this.currentCourse.id, beneficiaryName: '', cpf: '' });

    this.cancelarDialogListaEspera();

  }



  confirmarExclusao(): void {
    if (!this.exclusaoPendente) {
      this.cancelarExclusao();
      return;
    }

    const exclusaoPendente = this.exclusaoPendente;

    if (exclusaoPendente.tipo === 'matricula') {
      this.confirmarRemocaoMatricula(exclusaoPendente.matricula);
    }

    if (exclusaoPendente.tipo === 'fila') {
      if (!this.currentCourse) {
        this.cancelarExclusao();
        return;
      }
      this.currentCourse.waitlist = this.currentCourse.waitlist.filter(
        (item) => item.id !== exclusaoPendente.item.id
      );
      this.persistCurrentCourse();
    }

    this.cancelarExclusao();
  }



  cancelarExclusao(): void {

    this.confirmacaoExclusaoAberta = false;

    this.exclusaoPendente = null;

    this.confirmacaoExclusaoTipo = null;

  }



  removeFromWaitlist(entry: WaitlistEntry, course?: CourseRecord): void {

    const targetCourse = course ?? this.currentCourse;

    if (!targetCourse) return;

    this.exclusaoPendente = { tipo: 'fila', item: entry };

    this.confirmacaoExclusaoTipo = 'fila';

    this.confirmacaoExclusaoAberta = true;

  }



  tryPromoteWaitlist(): void {

    if (!this.currentCourse) return;

    if (this.currentCourse.vagasDisponiveis <= 0) return;

    if (this.currentCourse.waitlist.length === 0) return;



    const [first, ...rest] = this.currentCourse.waitlist;

    const enrollment: Enrollment = {

      id: generateId(),

      beneficiaryName: first.beneficiaryName,

      cpf: first.cpf,

      status: 'Ativo',

      enrolledAt: new Date().toISOString()

    };

    this.currentCourse.waitlist = rest;

    this.currentCourse.enrollments.push(enrollment);

    this.currentCourse.vagasDisponiveis = this.calculateAvailable(this.currentCourse);

    this.persistCurrentCourse();

  }



  convertWaitlist(entry: WaitlistEntry): void {

    if (!this.currentCourse || this.currentCourse.vagasDisponiveis <= 0) return;



    this.currentCourse.waitlist = this.currentCourse.waitlist.filter((item) => item.id !== entry.id);

    const enrollment: Enrollment = {

      id: generateId(),

      beneficiaryName: entry.beneficiaryName,

      cpf: entry.cpf,

      status: 'Ativo',

      enrolledAt: new Date().toISOString()

    };

    this.currentCourse.enrollments.push(enrollment);

    this.currentCourse.vagasDisponiveis = this.calculateAvailable(this.currentCourse);

    this.persistCurrentCourse();

  }



  calculateAvailable(course: CourseRecord): number {

    const active = course.enrollments.filter((e) => e.status === 'Ativo').length;

    return Math.max(course.vagasTotais - active, 0);

  }



  dashboardTotals() {

    const ativosCurso = this.records.filter((c) => c.tipo === 'Curso').length;

    const ativosAtendimento = this.records.filter((c) => c.tipo === 'Atendimento').length;

    const snapshot = this.dashboardSnapshot;



    return {

      ativosCurso,

      ativosAtendimento,

      totalMatriculas: snapshot.totalMatriculas,

      totalVagas: snapshot.totalVagas,

      vagasDisponiveis: snapshot.vagasDisponiveis,

      listaEspera: snapshot.waitlist

    };

  }



  fillFromCourse(course: CourseRecord): void {

    this.loadCourse(course.id);

    this.changeTab('dados');

  }



  selectCourseForEnrollment(courseId: string): void {

    if (!courseId) {

      this.editingId = null;

      return;

    }

    this.loadCourse(courseId);

    if (this.currentCourse?.tipo === 'Atendimento' && this.activeTab === 'inscricoes') {

      this.changeTab('agenda');

    }

  }



  selectFromCatalog(courseId: string): void {

    this.loadCourse(courseId);

    if (this.currentCourse?.tipo === 'Atendimento') {

      this.changeTab('agenda');

      return;

    }

    this.changeTab('inscricoes');

  }



  atualizarDataPresenca(event: Event): void {

    const input = event.target as HTMLInputElement;

    this.dataPresencaSelecionada = input.value;

    this.presencaDataSelecionada = null;

    this.presencaObservacoes = '';

    this.presencaAnexos = [];

    this.presencaPendente = false;

  }



  atualizarPresenca(matricula: Enrollment, status: PresencaStatus): void {

    if (!this.presencaDataSelecionada) return;

    const atual = this.presencasPorMatricula[matricula.id];

    this.presencasPorMatricula[matricula.id] = atual === status ? 'AUSENTE' : status;

    this.presencaPendente = true;

  }



  obterPresenca(matricula: Enrollment): PresencaStatus {

    return this.presencasPorMatricula[matricula.id] ?? 'AUSENTE';

  }



  private resetPresenca(): void {

    this.dataPresencaSelecionada = '';

    this.presencaDataSelecionada = null;

    this.presencasPorMatricula = {};

    this.presencaObservacoes = '';

    this.presencaAnexos = [];

    this.presencaPendente = false;

  }



  selecionarPresencaData(presencaData: PresencaDataRecord): void {

    this.presencaDataSelecionada = presencaData;

    this.dataPresencaSelecionada = presencaData.dataAula;

    this.presencaObservacoes = presencaData.observacoes ?? '';

    this.carregarPresencas();

    this.carregarPresencaAnexos();

  }



  async carregarPresencaDatas(): Promise<void> {

    const curso = this.currentCourse;

    if (!curso) {

      this.presencaDatas = [];

      return;

    }

    try {

      const response = await firstValueFrom(this.service.listarPresencaDatas(curso.id, false));

      this.presencaDatas = response.datas ?? [];

      if (this.presencaDataSelecionada) {

        const atualizada = this.presencaDatas.find((item) => item.id === this.presencaDataSelecionada?.id);

        if (atualizada) {

          this.presencaDataSelecionada = atualizada;

          this.presencaObservacoes = atualizada.observacoes ?? this.presencaObservacoes;

        }

      }

    } catch (error) {

      console.error('Erro ao carregar datas de presença', error);

      this.presencaDatas = [];

    }

  }



  salvarObservacoesPresenca(): void {

    const curso = this.currentCourse;

    const presencaData = this.presencaDataSelecionada;

    if (!curso || !presencaData) return;

    this.presencaSalvando = true;

    this.service

      .atualizarPresencaData(curso.id, presencaData.id, {

        observacoes: this.presencaObservacoes?.trim() || null

      })

      .pipe(finalize(() => (this.presencaSalvando = false)))

      .subscribe({

        next: (response) => {

          this.presencaDataSelecionada = response;

          this.carregarPresencaDatas();

        },

        error: () => {

          this.feedback = 'Não foi possível salvar as observações.';

        }

      });

  }



  cancelarPresencaData(): void {

    const curso = this.currentCourse;

    const presencaData = this.presencaDataSelecionada;

    if (!curso || !presencaData) return;

    if (!window.confirm('Confirmar cancelamento da data selecionada?')) return;

    this.presencaSalvando = true;

    this.service

      .cancelarPresencaData(curso.id, presencaData.id)

      .pipe(finalize(() => (this.presencaSalvando = false)))

      .subscribe({

        next: (response) => {

          this.presencaDataSelecionada = response;

          this.carregarPresencaDatas();

        },

        error: () => {

          this.feedback = 'Não foi possível cancelar a data selecionada.';

        }

      });

  }



  removerPresencaData(): void {

    const curso = this.currentCourse;

    const presencaData = this.presencaDataSelecionada;

    if (!curso || !presencaData) return;

    if (!window.confirm('Excluir a data selecionada? Esta ação é irreversível.')) return;

    this.presencaSalvando = true;

    this.service

      .removerPresencaData(curso.id, presencaData.id)

      .pipe(finalize(() => (this.presencaSalvando = false)))

      .subscribe({

        next: () => {

          this.presencaDataSelecionada = null;

          this.carregarPresencaDatas();

          this.presencasPorMatricula = {};

          this.presencaAnexos = [];

        },

        error: () => {

          this.feedback = 'Não foi possível excluir a data selecionada.';

        }

      });

  }



  carregarPresencaAnexos(): void {

    const curso = this.currentCourse;

    const presencaData = this.presencaDataSelecionada;

    if (!curso || !presencaData) {

      this.presencaAnexos = [];

      return;

    }

    this.presencaAnexosCarregando = true;

    this.service

      .listarPresencaAnexos(curso.id, presencaData.id)

      .pipe(finalize(() => (this.presencaAnexosCarregando = false)))

      .subscribe({

        next: (anexos) => {

          this.presencaAnexos = anexos ?? [];

        },

        error: () => {

          this.presencaAnexos = [];

          this.feedback = 'Não foi possível carregar os anexos.';

        }

      });

  }



  async anexarListaPresenca(event: Event): Promise<void> {

    const curso = this.currentCourse;

    const presencaData = this.presencaDataSelecionada;

    const input = event.target as HTMLInputElement;

    const arquivo = input?.files?.[0];

    if (!curso || !presencaData || !arquivo) {

      if (input) input.value = '';

      return;

    }

    if (!arquivo.type.includes('pdf') && !arquivo.name.toLowerCase().endsWith('.pdf')) {

      this.feedback = 'Envie apenas arquivo PDF.';

      if (input) input.value = '';

      return;

    }

    this.presencaAnexoEnviando = true;

    try {

      const conteudoBase64 = await this.lerArquivoBase64(arquivo);

      const anexo = await firstValueFrom(

        this.service.adicionarPresencaAnexo(curso.id, presencaData.id, {

          nomeArquivo: arquivo.name,

          tipoMime: arquivo.type || 'application/pdf',

          conteudoBase64,

          tamanho: this.formatarTamanho(arquivo.size),

          dataUpload: new Date().toISOString().slice(0, 10),

          usuario: this.usuarioEmissor()

        })

      );

      this.presencaAnexos = [anexo, ...this.presencaAnexos];

    } catch (error) {

      console.error('Erro ao enviar anexo da presença', error);

      this.feedback = 'Não foi possível salvar o anexo.';

    } finally {

      this.presencaAnexoEnviando = false;

      if (input) input.value = '';

      this.carregarPresencaDatas();

    }

  }



  async imprimirListaPresenca(): Promise<void> {

    this.feedback = null;

    const curso = this.currentCourse;

    const dataAula = this.dataPresencaSelecionada || this.presencaDataSelecionada?.dataAula;

    if (!curso) {

      this.feedback = 'Selecione um curso/atendimento para gerar a lista de presença.';

      return;

    }

    if (!dataAula) {

      this.feedback = 'Informe a data da aula para imprimir a lista de presença.';

      return;

    }

    if (this.presencaGerando) return;

    this.presencaGerando = true;

    try {

      const presencaData = await firstValueFrom(

        this.service.criarPresencaData(curso.id, {

          dataAula,

          observacoes: this.presencaObservacoes?.trim() || null

        })

      );

      this.presencaDataSelecionada = presencaData;

      this.dataPresencaSelecionada = dataAula;

      await this.carregarPresencaDatas();

      const blob = await firstValueFrom(

        this.reportService.generateCursoAtendimentoListaPresenca({

          cursoId: String(curso.id),

          dataAula,

          usuarioEmissor: this.usuarioEmissor(),

          exibirCpf: this.presencaExibirCpf

        })

      );

      this.openPdfInNewWindow(blob);

    } catch (error) {

      console.error('Erro ao gerar lista de presença', error);

      this.feedback = 'Não foi possível gerar a lista de presença.';

    } finally {

      this.presencaGerando = false;

    }

  }



  selectBeneficiary(beneficiary: BeneficiaryPayload): void {

    this.enrollmentForm.patchValue({

      beneficiaryName: beneficiary.nomeCompleto || beneficiary.nomeSocial || '',

      cpf: beneficiary.cpf || ''

    });

    this.beneficiaryResults = [];

  }



  selectProfessional(professional: ProfessionalRecord): void {

    this.courseForm.patchValue({ profissional: professional.nomeCompleto });

    this.professionalResults = [];

  }



  atualizarBeneficiarioAgendaTermo(termo: string): void {

    this.beneficiarioAgendaTermo = termo;

    this.atualizarOpcoesBeneficiarioAgenda();

  }



  selecionarBeneficiarioAgenda(opcao: AutocompleteOpcao): void {

    this.beneficiarioAgendaTermo = opcao.label;

    this.agendamentoForm.patchValue({ matriculaId: opcao.id });

  }



  atualizarProfissionalAgendaTermo(termo: string): void {

    this.profissionalAgendaTermo = termo;

    this.profissionalAgendaOpcoes = this.filtrarProfissionaisAgenda(termo);

  }



  selecionarProfissionalAgenda(opcao: AutocompleteOpcao): void {

    const profissional = this.profissionaisAgendaBase.find((item) => item.id === String(opcao.id));

    this.profissionalAgendaTermo = opcao.label;

    if (!profissional) return;

    this.agendamentoForm.patchValue({

      profissionalId: profissional.id,

      profissionalNome: profissional.nome,

      profissionalTipo: profissional.tipo

    });

  }



  atualizarProfissionalFiltro(termo: string): void {

    this.profissionalFiltroTermo = termo;

    this.profissionalFiltroOpcoes = this.filtrarProfissionaisAgenda(termo);

  }



  selecionarProfissionalFiltro(opcao: AutocompleteOpcao): void {

    this.profissionalFiltroTermo = opcao.label;

    this.profissionalFiltroSelecionadoId = String(opcao.id);

  }



  limparFiltroProfissional(): void {

    this.profissionalFiltroTermo = '';

    this.profissionalFiltroSelecionadoId = null;

  }



  agendarAtendimento(): void {

    if (!this.currentCourse) {

      this.popupErros = new PopupErrorBuilder()

        .adicionar('Selecione um atendimento antes de agendar.')

        .build();

      return;

    }

    if (this.currentCourse.tipo !== 'Atendimento') {

      this.popupErros = new PopupErrorBuilder()

        .adicionar('A agenda está disponível apenas para atendimentos.')

        .build();

      return;

    }

    if (this.agendamentoForm.invalid) {

      this.agendamentoForm.markAllAsTouched();

      const builder = new PopupErrorBuilder();

      if (this.campoInvalido(this.agendamentoForm, 'matriculaId')) {

        builder.adicionar('Selecione o beneficiário.');

      }

      if (this.campoInvalido(this.agendamentoForm, 'dataAgendada')) {

        builder.adicionar('Informe a data do atendimento.');

      }

      if (this.campoInvalido(this.agendamentoForm, 'horaAgendada')) {

        builder.adicionar('Informe o horário do atendimento.');

      }

      if (this.campoInvalido(this.agendamentoForm, 'profissionalId')) {

        builder.adicionar('Selecione o profissional.');

      }

      if (this.campoInvalido(this.agendamentoForm, 'statusAgendamento')) {

        builder.adicionar('Selecione a situação do atendimento.');

      }

      this.popupErros = builder

        .adicionar('Preencha os campos obrigatorios para agendar.')

        .build();

      return;

    }

    const formValue = this.agendamentoForm.getRawValue();

    const matricula = this.currentCourse.enrollments.find((item) => item.id === String(formValue.matriculaId));

    if (!matricula) {

      this.feedback = 'Beneficiário não encontrado na matrícula selecionada.';

      return;

    }



    const status =

      (formValue.statusAgendamento as StatusAgendamento) || ('AGUARDANDO' as StatusAgendamento);

    matricula.dataAgendada = formValue.dataAgendada;

    matricula.horaAgendada = formValue.horaAgendada;

    matricula.statusAgendamento = status;

    matricula.profissionalId = formValue.profissionalId;

    matricula.profissionalNome = formValue.profissionalNome;

    matricula.profissionalTipo = formValue.profissionalTipo;

    matricula.confirmacaoPresenca = false;



    this.persistCurrentCourse();

    this.popupErros = new PopupErrorBuilder()

      .adicionar('Agendamento salvo com sucesso.')

      .build();

  }



  atualizarStatusAgendamento(matricula: Enrollment, status: StatusAgendamento): void {

    matricula.statusAgendamento = status;

    if (status === 'CONFIRMADO') {

      matricula.confirmacaoPresenca = true;

    }

    this.persistCurrentCourse();

  }



  confirmarPresencaAgendamento(matricula: Enrollment): void {

    matricula.confirmacaoPresenca = true;

    matricula.statusAgendamento = 'CONFIRMADO';

    this.persistCurrentCourse();

  }



  marcarNaoRespondeu(matricula: Enrollment): void {

    matricula.statusAgendamento = 'NAO_RESPONDEU';

    matricula.confirmacaoPresenca = false;

    this.persistCurrentCourse();

  }



  marcarRemarcar(matricula: Enrollment): void {

    matricula.statusAgendamento = 'REMARCAR';

    matricula.confirmacaoPresenca = false;

    this.persistCurrentCourse();

  }

  enviarWhatsappAgendamento(matricula: Enrollment): void {

    const cpf = (matricula.cpf || '').replace(/\D/g, '');

    if (!cpf) {

      this.popupErros = new PopupErrorBuilder()

        .adicionar('CPF n\u00e3o informado para este benefici\u00e1rio.')

        .build();

      this.abrirPopupTemporario();

      return;

    }

    this.beneficiarioApiService

      .list({ cpf })

      .subscribe({

        next: ({ beneficiarios }) => {

          const beneficiario = (beneficiarios ?? [])[0];

          const telefone = (beneficiario?.telefone_principal || '').toString();

          const digits = telefone.replace(/\D/g, '');

          if (!digits) {

            this.popupErros = new PopupErrorBuilder()

              .adicionar('Telefone principal do benefici\u00e1rio n\u00e3o informado.')

              .build();

            this.abrirPopupTemporario();

            return;

          }

          const mensagem = this.buildMensagemWhatsApp(matricula);

          const url = `https://wa.me/${digits}?text=${encodeURIComponent(mensagem)}`;

          window.open(url, '_blank');

        },

        error: () => {

          this.popupErros = new PopupErrorBuilder()

            .adicionar('N\u00e3o foi poss\u00edvel localizar os dados do benefici\u00e1rio.')

            .build();

          this.abrirPopupTemporario();

        }

      });

  }

  private formatDate(value: string | Date): string {
    if (!value) return '';
    const parsed = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';
    return parsed.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  private buildMensagemWhatsApp(matricula: Enrollment): string {

    const nome = matricula.beneficiaryName || 'beneficiário';

    const data = matricula.dataAgendada ? this.formatDate(matricula.dataAgendada) : 'data a confirmar';

    const hora = matricula.horaAgendada || 'horário a confirmar';

    return `Olá, ${nome}. Seu atendimento está agendado para ${data} às ${hora}.`;

  }



  contarStatusAgenda(status: StatusAgendamento): number {

    return this.obterAgendamentosDoDia().filter(

      (item) => (item.statusAgendamento || 'AGUARDANDO') === status

    ).length;

  }



  imprimirAgendaDoDia(): void {

    if (!this.currentCourse || this.currentCourse.tipo !== 'Atendimento') {

      this.popupErros = new PopupErrorBuilder()

        .adicionar('Selecione um atendimento para imprimir a agenda.')

        .build();

      return;

    }

    if (!this.dataAgendaSelecionada) {

      this.popupErros = new PopupErrorBuilder()

        .adicionar('Informe a data da agenda para imprimir.')

        .build();

      return;

    }



    const agendamentos = this.obterAgendamentosDoDia();

    const unidade = this.unidadeAtual;

    const agendamentosPorProfissional = agendamentos.reduce((acc, item) => {

      const chave = item.profissionalNome || 'Profissional não informado';

      if (!acc[chave]) acc[chave] = [];

      acc[chave].push(item);

      return acc;

    }, {} as Record<string, Enrollment[]>);

    const blocos = Object.entries(agendamentosPorProfissional)

      .map(([profissional, itens]) => {

        const linhas = itens

          .map((item, index) => {

            const status = item.statusAgendamento || 'AGUARDANDO';

            const statusLabel =

              this.statusAgendamentoOpcoes.find((option) => option.valor === status)?.label || status;

            return `

              <tr>

                <td>${index + 1}</td>

                <td>${item.horaAgendada || '--:--'}</td>

                <td>${item.beneficiaryName}</td>

                <td>${item.cpf || ''}</td>

                <td>${statusLabel}</td>

                <td></td>

              </tr>

            `;

          })

          .join('');

        return `

          <div class="agenda-profissional">

            <p class="agenda-profissional__titulo">Profissional responsável: ${profissional}</p>

            <table>

              <thead>

                <tr>

                  <th>#</th>

                  <th>Hora</th>

                  <th>Beneficiário</th>

                  <th>CPF</th>

                  <th>Situação</th>

                  <th>Presença</th>

                </tr>

              </thead>

              <tbody>

                ${linhas || '<tr><td colspan="6">Nenhum atendimento agendado.</td></tr>'}

              </tbody>

            </table>

          </div>

        `;

      })

      .join('');



    const janela = window.open('', '_blank', 'width=900,height=1100');

    if (!janela) {

      this.feedback = 'Permita a abertura de pop-ups para visualizar a impressao.';

      return;

    }



    const nomeUnidade = unidade?.razaoSocial || unidade?.nomeFantasia || 'G3 Assistencial';

    const cnpj = unidade?.cnpj || '';

    const nomeParceiro = this.currentCourse?.instituicaoParceira || 'Instituição parceira';

    const subtituloParceiro = this.currentCourse?.nome || 'Atendimento';

    const emissao = this.formatarDataHoraEmissao(new Date());

    const usuario = this.usuarioEmissor();

    const dataAgendaTexto = this.formatarDataAgenda(this.dataAgendaSelecionada);

    const instituicaoPrincipal = nomeUnidade;

    const instituicaoPrincipalCnpj = cnpj ? `CNPJ: ${cnpj}` : '';

    const enderecoLinha = [unidade?.endereco, unidade?.numeroEndereco, unidade?.complemento]

      .filter(Boolean)

      .join(', ');

    const linhaEndereco = [cnpj ? `CNPJ: ${cnpj}` : '', enderecoLinha, unidade?.bairro, unidade?.cidade]

      .filter((valor) => (valor ?? '').toString().trim().length > 0)

      .join(' | ') || 'Endereço não informado';

    const linhaContato = [

      unidade?.telefone ? `Telefone: ${unidade.telefone}` : '',

      unidade?.email ? `E-mail: ${unidade.email}` : '',

      unidade?.site ? `Site: ${unidade.site}` : ''

    ]

      .filter((valor) => (valor ?? '').toString().trim().length > 0)

      .join(' | ');



    janela.document.write(`

      <!doctype html>

      <html lang="pt-BR">

        <head>

          <meta charset="utf-8" />

          <title>Agenda de atendimentos</title>

          <style>

            @page { size: A4; margin: 20mm; }

            * { box-sizing: border-box; }

            body { margin: 0; font-family: Arial, sans-serif; color: #111827; }

            .report { display: flex; flex-direction: column; gap: 14px; }

            header.report-header { border-bottom: 1px solid #111827; padding-bottom: 8px; margin-bottom: 16px; }

            .header-meta { width: 100%; font-size: 10px; margin-bottom: 8px; text-align: right; }

            .header-meta span { display: block; }

            .header-brand { width: 100%; margin-bottom: 8px; }

            .header-brand-table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }

            .header-brand-logo { width: 30%; vertical-align: middle; text-align: left; }

            .header-brand-razao { text-align: center; vertical-align: middle; padding-left: 10px; }

            .header-logo { max-height: 72px; max-width: 180px; display: block; }

            .header-razao { font-size: 14px; font-weight: 600; text-transform: uppercase; }

            .header-center { text-align: center; }

            .report-title { font-size: 20px; font-weight: 700; margin: 0; text-transform: uppercase; text-align: center; }

            .report-subtitle { font-size: 13px; color: #111827; margin: 4px 0 0; text-align: center; font-weight: 600; text-transform: uppercase; }

            .report-partner { font-size: 11px; color: #4b5563; margin: 4px 0 0; text-align: center; font-weight: 600; }

            .report-instituicao { font-size: 14px; font-weight: 700; margin: 0; text-align: center; text-transform: uppercase; }

            .report-instituicao-cnpj { font-size: 11px; margin: 2px 0 0; text-align: center; color: #475569; }

            .report-instituicao-info { font-size: 10px; margin: 2px 0 0; text-align: center; color: #64748b; }

            .agenda-date { font-size: 16px; font-weight: 700; color: #111827; text-align: center; margin-top: 6px; }

            .meta { display: flex; gap: 14px; flex-wrap: wrap; font-size: 12px; color: #4b5563; justify-content: center; }

            table { width: 100%; border-collapse: collapse; margin-top: 8px; }

            th, td { border: 1px solid #d1d5db; padding: 6px 8px; font-size: 12px; }

            th { background: #f3f4f6; text-align: left; }

            thead { display: table-header-group; }

            tfoot { display: table-footer-group; }

            .agenda-profissional { margin-top: 14px; }

            .agenda-profissional__titulo { font-size: 13px; font-weight: 600; margin: 0 0 6px; }

            footer.report-footer {

              text-align: center;

              padding: 6px 0;

              border-top: 1px solid #e2e8f0;

              margin-top: 12px;

              font-size: 10px;

              color: #111827;

              page-break-inside: avoid;

              font-weight: 400;

              position: fixed;

              left: 20mm;

              right: 20mm;

              bottom: 8mm;

              background: #fff;

            }

            footer.report-footer .footer-info { margin: 0; }

            footer.report-footer .page-number { display: block; text-align: right; }

            .page-number:before { content: "Página " counter(page) " de " counter(pages); }

          </style>

        </head>

        <body>

          <div class="report">

            <header class="report-header">

              <div class="header-meta">

                <span>Usuario: ${usuario}</span>

                <span>Emissao: ${emissao}</span>

              </div>

              <div class="header-brand">

                <div class="header-center">

                  <p class="report-instituicao">${instituicaoPrincipal}</p>

                  ${instituicaoPrincipalCnpj ? `<p class="report-instituicao-cnpj">${instituicaoPrincipalCnpj}</p>` : ''}

                  ${linhaEndereco ? `<p class="report-instituicao-info">${linhaEndereco}</p>` : ''}

                  ${linhaContato ? `<p class="report-instituicao-info">${linhaContato}</p>` : ''}

                  <p class="report-title">${subtituloParceiro}</p>

                  <p class="report-partner">Instituição parceira: ${nomeParceiro}</p>

                  <div class="agenda-date">Agenda do dia: ${dataAgendaTexto}</div>

                </div>

              </div>

            </header>

            <main>

              ${blocos || '<table><tr><td>Nenhum atendimento agendado.</td></tr></table>'}

            </main>

          </div>

          <footer class="report-footer">

            <p class="footer-info">${nomeUnidade}</p>

            <p class="footer-info">${linhaEndereco}</p>

            <p class="footer-info">${linhaContato}</p>

            <span class="page-number"></span>

          </footer>

        </body>

      </html>

    `);

    janela.document.close();

    janela.focus();

    janela.print();

  }



  courseStatus(course: CourseRecord): { label: string; tone: 'green' | 'amber' | 'red' } {

    if (course.vagasDisponiveis <= 0) return { label: 'Esgotado', tone: 'red' };

    if (course.vagasDisponiveis <= Math.max(1, Math.floor(course.vagasTotais * 0.3))) {

      return { label: 'Encerrando', tone: 'amber' };

    }

    return { label: 'Abertas', tone: 'green' };

  }



  get presencaDatasPendentes(): PresencaDataRecord[] {

    return this.presencaDatas.filter((item) => item.status === 'GERADA');

  }



  private carregarPresencas(): void {

    const curso = this.currentCourse;

    if (!curso || !this.presencaDataSelecionada) return;

    this.presencaCarregando = true;

    this.service

      .listarPresencasPorData(curso.id, this.presencaDataSelecionada.id)

      .pipe(finalize(() => (this.presencaCarregando = false)))

      .subscribe({

        next: (response) => {

          this.presencasPorMatricula = {};

          response.presencas.forEach((presenca) => {

            this.presencasPorMatricula[presenca.matriculaId] = presenca.status;

          });

          this.matriculasAtivas.forEach((matricula) => {

            if (!this.presencasPorMatricula[matricula.id]) {

              this.presencasPorMatricula[matricula.id] = 'AUSENTE';

            }

          });

          this.presencaPendente = false;

        },

        error: () => {

          this.feedback = 'Não foi possível carregar a presença desta data.';

        },

      });

  }



  salvarPresencas(): void {

    const curso = this.currentCourse;

    if (!curso || !this.presencaDataSelecionada) return;

    const payload = this.montarPayloadPresenca();

    this.presencaSalvando = true;

    this.service

      .salvarPresencasPorData(curso.id, this.presencaDataSelecionada.id, payload)

      .pipe(finalize(() => (this.presencaSalvando = false)))

      .subscribe({

        next: (response) => {

          this.presencasPorMatricula = {};

          response.presencas.forEach((presenca) => {

            this.presencasPorMatricula[presenca.matriculaId] = presenca.status;

          });

          this.presencaPendente = false;

          this.carregarPresencaDatas();

        },

        error: () => {

          this.feedback = 'Não foi possível salvar a presença.';

        },

      });

  }



  private montarPayloadPresenca(): PresencaResponse {

    const presencas = this.matriculasAtivas.map((matricula) => ({

      matriculaId: matricula.id,

      status: this.obterPresenca(matricula),

    }));

    return {

      dataAula: this.presencaDataSelecionada?.dataAula || this.dataPresencaSelecionada,

      presencas,

    };

  }



  private lerArquivoBase64(arquivo: File): Promise<string> {

    return new Promise((resolve, reject) => {

      const reader = new FileReader();

      reader.onerror = () => reject(new Error('Falha ao ler arquivo.'));

      reader.onload = () => resolve(reader.result as string);

      reader.readAsDataURL(arquivo);

    });

  }



  private formatarTamanho(bytes: number): string {

    if (!bytes && bytes !== 0) return '';

    if (bytes < 1024) return `${bytes} B`;

    const kb = bytes / 1024;

    if (kb < 1024) return `${kb.toFixed(1)} KB`;

    const mb = kb / 1024;

    return `${mb.toFixed(1)} MB`;

  }



  private setupBeneficiarySearch(): void {

    const beneficiaryControl = this.enrollmentForm.get('beneficiaryName');

    if (!beneficiaryControl) return;



    this.beneficiarySearchSub = beneficiaryControl.valueChanges

      .pipe(

        debounceTime(300),

        distinctUntilChanged(),

        tap((term) => {

          if (!term) {

            this.beneficiaryResults = [];

            this.beneficiarySearchLoading = false;

          } else {

            this.beneficiarySearchLoading = true;

          }

        }),

        switchMap((term) => {

          if (!term) return of({ beneficiarios: [] });

          return this.beneficiarioApiService

            .list({ nome: term })

            .pipe(catchError(() => of({ beneficiarios: [] })));

        })

      )

      .subscribe(({ beneficiarios }) => {

        this.beneficiaryResults = beneficiarios

          .map((beneficiario) => this.mapearbeneficiarioParaBusca(beneficiario))

          .slice(0, 5);

        this.beneficiarySearchLoading = false;

      });

  }



  private mapearbeneficiarioParaBusca(beneficiario: BeneficiarioApiPayload): BeneficiaryPayload {

    return {

      id: beneficiario.id_beneficiario ? Number(beneficiario.id_beneficiario) : undefined,

      nomeCompleto: beneficiario.nome_completo || '',

      nomeSocial: beneficiario.nome_social,

      cpf: beneficiario.cpf || undefined,

      cep: beneficiario.cep || '',

      documentos: '',

      dataNascimento: beneficiario.data_nascimento || '',

      email: '',

      documentosAnexos: []

    };

  }



  private setupProfessionalSearch(): void {

    const professionalControl = this.courseForm.get('profissional');

    if (!professionalControl) return;



    this.professionalSearchSub = professionalControl.valueChanges

      .pipe(

        debounceTime(250),

        distinctUntilChanged(),

        tap((term) => {

          if (!term) {

            this.professionalResults = [];

            this.professionalSearchLoading = false;

          } else {

            this.professionalSearchLoading = true;

          }

        }),

        switchMap((term) => {

          if (!term) return of([]);

          return this.professionalService.list(term).pipe(catchError(() => of([])));

        })

      )

      .subscribe((records) => {

        this.professionalResults = (records ?? []).slice(0, 8);

        this.professionalSearchLoading = false;

      });

  }



  private carregarProfissionaisAgenda(): void {

    this.profissionalAgendaCarregando = true;

    forkJoin({

      profissionais: this.professionalService.list().pipe(catchError(() => of([]))),

      voluntarios: this.volunteerService.list().pipe(catchError(() => of([]))),

    }).subscribe({

      next: ({ profissionais, voluntarios }) => {

        const profissionaisMapeados = (profissionais ?? []).map((item) => ({

          id: `P-${item.id}`,

          nome: item.nomeCompleto,

          tipo: 'PROFISSIONAL' as const,

          sublabel: item.especialidade || item.categoria || item.email || undefined

        }));

        const voluntariosMapeados = (voluntarios ?? []).map((item) => ({

          id: `V-${item.id}`,

          nome: item.nome,

          tipo: 'VOLUNTARIO' as const,

          sublabel: item.profissao || item.areaInteresse || item.email || undefined

        }));



        this.profissionaisAgendaBase = [...profissionaisMapeados, ...voluntariosMapeados];

        this.profissionalAgendaOpcoes = this.filtrarProfissionaisAgenda(this.profissionalAgendaTermo);

        this.profissionalFiltroOpcoes = this.filtrarProfissionaisAgenda(this.profissionalFiltroTermo);

        this.profissionalAgendaCarregando = false;

      },

      error: () => {

        this.profissionalAgendaCarregando = false;

        this.feedback = 'Não foi possível carregar profissionais e voluntários.';

      }

    });

  }



  private filtrarProfissionaisAgenda(termo: string): AutocompleteOpcao[] {

    const termoNormalizado = this.normalizarTexto(termo);

    const base = this.profissionaisAgendaBase;

    const filtrado = termoNormalizado

      ? base.filter((item) =>

          this.normalizarTexto(item.nome).includes(termoNormalizado) ||

          this.normalizarTexto(item.sublabel || '').includes(termoNormalizado)

        )

      : base;

    return filtrado.slice(0, 10).map((item) => ({

      id: item.id,

      label: item.nome,

      sublabel: item.sublabel

    }));

  }



  private loadWidgetPreferences(): void {

    try {

      const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(this.widgetPrefsKey) : null;

      if (saved) {

        this.widgetState = { ...this.widgetState, ...(JSON.parse(saved) as WidgetState) };

      }

    } catch (error) {

      console.warn('Não foi possível carregar as preferências do dashboard', error);

    }



    this.normalizeWidgetState();

  }



  private persistWidgetPreferences(): void {

    try {

      if (typeof localStorage !== 'undefined') {

        localStorage.setItem(this.widgetPrefsKey, JSON.stringify(this.widgetState));

      }

    } catch (error) {

      console.warn('Não foi possível salvar as preferências do dashboard', error);

    }

  }



  private normalizeWidgetState(): string[] {

    const availableIds = this.dashboardWidgets.map((widget) => widget.id);

    const order = this.widgetState.order.filter((id) => availableIds.includes(id));

    availableIds.forEach((id) => {

      if (!order.includes(id)) order.push(id);

    });



    const hidden = this.widgetState.hidden.filter((id) => availableIds.includes(id));

    this.widgetState = { order, hidden };

    return order;

  }



  private buildDashboardSnapshot(): DashboardSnapshot {

    const totalVagas = this.records.reduce((sum, c) => sum + c.vagasTotais, 0);

    const vagasDisponiveis = this.records.reduce((sum, c) => sum + c.vagasDisponiveis, 0);

    const vagasEmUso = Math.max(totalVagas - vagasDisponiveis, 0);

    const totalMatriculas = this.records.reduce(

      (sum, c) => sum + c.enrollments.filter((e) => e.status === 'Ativo').length,

      0

    );

    const totalInscricoes = this.records.reduce((sum, c) => sum + c.enrollments.length, 0);

    const concluidos = this.records.reduce(

      (sum, c) => sum + c.enrollments.filter((e) => e.status === 'Concluído').length,

      0

    );

    const cancelados = this.records.reduce(

      (sum, c) => sum + c.enrollments.filter((e) => e.status === 'Cancelado').length,

      0

    );

    const waitlist = this.records.reduce((sum, c) => sum + c.waitlist.length, 0);



    const cursos = this.records.filter((c) => c.tipo === 'Curso').length;

    const atendimentos = this.records.filter((c) => c.tipo === 'Atendimento').length;

    const oficinas = this.records.filter((c) => c.tipo === 'Oficina').length;

    const profissionais = new Set(this.records.map((c) => c.profissional).filter(Boolean)).size;

    const mediaCargaHoraria = this.records.length

      ? Math.round(

          this.records.reduce((sum, c) => sum + (c.cargaHoraria ?? 0), 0) / this.records.length

        )

      : 0;



    const ocupacao = totalVagas ? Math.round((vagasEmUso / totalVagas) * 100) : 0;

    const baseConclusao = totalMatriculas + concluidos + cancelados;

    const taxaConclusao = baseConclusao ? Math.round((concluidos / baseConclusao) * 100) : 0;

    const waitlistPressao = totalMatriculas

      ? Math.min(100, Math.round((waitlist / totalMatriculas) * 100))

      : 0;

    return {

      totalVagas,

      vagasDisponiveis,

      vagasEmUso,

      ocupacao,

      totalMatriculas,

      totalInscricoes,

      concluidos,

      cancelados,

      waitlist,

      waitlistPressao,

      cursos,

      atendimentos,

      oficinas,

      profissionais,

      mediaCargaHoraria,

      taxaConclusao

    };

  }



  private refreshDashboardSnapshot(): void {

    this.dashboardSnapshot = this.buildDashboardSnapshot();

  }



  private normalizeRecord(record: CourseRecord): CourseRecord {

    return {

      ...record,

      id: String(record.id ?? ''),

      imagem: record.imagem ?? null,

      restricoes: record.restricoes ?? null,

      diasSemana: record.diasSemana ?? [],

      faixasEtarias: record.faixasEtarias ?? [],

      vagaPreferencialIdosos: record.vagaPreferencialIdosos ?? false,

      sexoPermitido: record.sexoPermitido ?? 'Todos',

      salaId: record.salaId ? String(record.salaId) : record.sala?.id ? String(record.sala.id) : null,

      instituicaoParceira: record.instituicaoParceira ?? null,

      enrollments: (record.enrollments ?? []).map((enrollment) => ({

        ...enrollment,

        enrolledAt: enrollment.enrolledAt ?? new Date().toISOString(),

        dataAgendada: enrollment.dataAgendada ?? null,

        horaAgendada: enrollment.horaAgendada ?? null,

        statusAgendamento: enrollment.statusAgendamento ?? null,

        profissionalId: enrollment.profissionalId ?? null,

        profissionalNome: enrollment.profissionalNome ?? null,

        profissionalTipo: enrollment.profissionalTipo ?? null,

        confirmacaoPresenca: enrollment.confirmacaoPresenca ?? false

      })),

      waitlist: (record.waitlist ?? []).map((entry) => ({

        ...entry,

        joinedAt: entry.joinedAt ?? new Date().toISOString()

      }))

    };

  }



  private replaceRecord(updated: CourseRecord): void {

    const normalized = this.normalizeRecord(updated);

    this.records = this.records.map((record) => (record.id === normalized.id ? normalized : record));

    this.refreshDashboardSnapshot();

    if (!this.editingId) this.editingId = normalized.id;

    if (this.editingId === normalized.id) {

      this.loadCourse(normalized.id);

    }

  }



  private persistCourse(course: CourseRecord): void {

    const payload = this.montarPayloadCurso(course);

    this.service.update(course.id, payload).subscribe({

      next: (record) => this.replaceRecord(record),

      error: () => {

        this.feedback = 'Não foi possível salvar as alterações. Tente novamente.';

      }

    });

  }



  private persistCurrentCourse(): void {

    if (!this.currentCourse) return;

    this.persistCourse(this.currentCourse);

  }



  private atualizarOpcoesBeneficiarioAgenda(): void {

    const curso = this.currentCourse;

    const termoBruto = this.beneficiarioAgendaTermo || '';
    const termo = this.normalizarTexto(termoBruto);
    const termoNumerico = termoBruto.replace(/\D/g, '');

    if (!curso) {

      this.beneficiarioAgendaOpcoes = [];

      return;

    }

    const opcoes = curso.enrollments

      .filter((item) => item.status === 'Ativo')

      .map((item) => ({

        id: item.id,

        label: item.beneficiaryName,

        sublabel: item.cpf || 'CPF não informado'

      }))

      .filter((opcao) => {
        if (!termo && !termoNumerico) return true;
        const nomeNormalizado = this.normalizarTexto(opcao.label);
        const cpfNormalizado = (opcao.sublabel || '').replace(/\D/g, '');
        return (
          (termo && nomeNormalizado.includes(termo)) ||
          (termoNumerico && cpfNormalizado.includes(termoNumerico))
        );
      })

      .slice(0, 10);

    this.beneficiarioAgendaOpcoes = opcoes;

  }



  private normalizarTexto(texto: string): string {

    return (texto || '')

      .normalize('NFD')

      .replace(/[\u0300-\u036f]/g, '')

      .toLowerCase()

      .trim();

  }



  campoInvalido(form: FormGroup, campo: string): boolean {

    const control = form.get(campo);

    return !!control && control.invalid && (control.dirty || control.touched);

  }



  private formatarDataHoraEmissao(data: Date): string {

    try {

      return new Intl.DateTimeFormat('pt-BR', {

        day: '2-digit',

        month: '2-digit',

        year: 'numeric',

        hour: '2-digit',

        minute: '2-digit'

      }).format(data);

    } catch {

      return data.toISOString();

    }

  }



  private formatarDataAgenda(data: string): string {

    try {

      const dataBase = new Date(`${data}T00:00:00`);

      const texto = new Intl.DateTimeFormat('pt-BR', {

        weekday: 'long',

        day: '2-digit',

        month: 'long',

        year: 'numeric'

      }).format(dataBase);

      return texto.charAt(0).toUpperCase() + texto.slice(1);

    } catch {

      return data;

    }

  }



  private toLocalDateTimeString(valor?: string | null): string {

    if (!valor) return new Date().toISOString().slice(0, 19);

    if (valor.includes('T')) {

      return valor.replace('Z', '').slice(0, 19);

    }

    return `${valor}T00:00:00`;

  }



  private normalizarSalaId(valor?: string | number | null): number | null {

    if (valor === null || valor === undefined || valor === '') return null;

    const numero = typeof valor === 'number' ? valor : Number(valor);

    return Number.isNaN(numero) ? null : numero;

  }



  private montarPayloadCurso(course: CourseRecord): CoursePayload {

    return {

      tipo: course.tipo,

      nome: course.nome,

      descricao: course.descricao,

      imagem: course.imagem ?? null,

      vagasTotais: course.vagasTotais,

      vagasDisponiveis: course.vagasDisponiveis,

      cargaHoraria: course.cargaHoraria ?? null,

      horarioInicial: course.horarioInicial,

      duracaoHoras: course.duracaoHoras,

      diasSemana: course.diasSemana ?? [],

      faixasEtarias: course.faixasEtarias ?? [],

      vagaPreferencialIdosos: course.vagaPreferencialIdosos ?? false,

      sexoPermitido: course.sexoPermitido ?? 'Todos',

      restricoes: course.restricoes ?? null,

      profissional: course.profissional,

      instituicaoParceira: course.instituicaoParceira ?? null,

      salaId: this.normalizarSalaId(course.salaId),

      status: course.status,

      dataTriagem: course.dataTriagem ?? null,

      dataEncaminhamento: course.dataEncaminhamento ?? null,

      dataConclusao: course.dataConclusao ?? null,

      enrollments: (course.enrollments ?? []).map((matricula) => ({

        id: matricula.id,

        beneficiaryName: matricula.beneficiaryName,

        cpf: matricula.cpf,

        status: matricula.status,

        enrolledAt: this.toLocalDateTimeString(matricula.enrolledAt),

        dataAgendada: matricula.dataAgendada ?? null,

        horaAgendada: matricula.horaAgendada ?? null,

        statusAgendamento: matricula.statusAgendamento ?? null,

        profissionalId: matricula.profissionalId ?? null,

        profissionalNome: matricula.profissionalNome ?? null,

        profissionalTipo: matricula.profissionalTipo ?? null,

        confirmacaoPresenca: matricula.confirmacaoPresenca ?? false

      })),

      waitlist: (course.waitlist ?? []).map((entry) => ({

        id: entry.id,

        beneficiaryName: entry.beneficiaryName,

        cpf: entry.cpf,

        joinedAt: this.toLocalDateTimeString(entry.joinedAt)

      }))

    };

  }



  private obterAgendamentosDoDia(): Enrollment[] {

    const dataSelecionada = this.dataAgendaSelecionada;

    if (!dataSelecionada) return [];

    const curso = this.currentCourse;

    if (!curso) return [];

    return curso.enrollments

      .filter((matricula) => matricula.dataAgendada === dataSelecionada)

      .filter((matricula) => {

        if (!this.profissionalFiltroSelecionadoId) return true;

        return matricula.profissionalId === this.profissionalFiltroSelecionadoId;

      });

  }

}























































