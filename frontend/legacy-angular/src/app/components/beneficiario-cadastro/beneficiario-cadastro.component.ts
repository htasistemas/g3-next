import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, NgZone, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faCamera, faEye, faPrint, faTrash, faUpload, faUsers } from '@fortawesome/free-solid-svg-icons';
import {
  BeneficiarioApiService,
  BeneficiarioApiPayload,
} from '../../services/beneficiario-api.service';
import {
  BeneficiaryPayload,
  BeneficiaryService,
  DocumentoObrigatorio,
} from '../../services/beneficiary.service';
import {
  AssistanceUnitPayload,
  AssistanceUnitService,
} from '../../services/assistance-unit.service';
import {
  AuthorizationTermPayload,
  BeneficiaryReportFilters,
  ReportService,
} from '../../services/report.service';
import { AuthService } from '../../services/auth.service';
import { ConfigService } from '../../services/config.service';
import { Subject, firstValueFrom, of } from 'rxjs';
import { catchError, finalize, map, takeUntil } from 'rxjs/operators';
import { TelaPadraoComponent } from '../compartilhado/tela-padrao/tela-padrao.component';
import {
  ConfigAcoesCrud,
  EstadoAcoesCrud,
  TelaBaseComponent,
} from '../compartilhado/tela-base.component';
import { PopupMessagesComponent } from '../compartilhado/popup-messages/popup-messages.component';
import { DialogComponent } from '../compartilhado/dialog/dialog.component';
import { PopupErrorBuilder } from '../../utils/popup-error.builder';
import { criarDataLocal, formatarDataSemFuso } from '../../utils/data-format.util';
import { RuntimeConfigService } from '../../services/runtime-config.service';
type ViaCepResponse = {
  logradouro?: string;
  complemento?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
};
type PhoneControlName = 'telefone_principal' | 'telefone_secundario' | 'telefone_recado_numero';
type PrintOrder = 'nome' | 'data_nascimento' | 'idade' | 'bairro';
type PrintListOrder = 'alphabetical' | 'code';

type DocumentOverviewRow = {
  label: string;
  field?: string;
  uploadName: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
};
@Component({
  selector: 'app-beneficiario-cadastro',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule,
    FontAwesomeModule,
    TelaPadraoComponent,
    PopupMessagesComponent,
    DialogComponent,
  ],
  templateUrl: './beneficiario-cadastro.component.html',
  styleUrl: './beneficiario-cadastro.component.scss',
})
export class BeneficiarioCadastroComponent extends TelaBaseComponent implements OnInit, OnDestroy {
  private readonly runtimeConfig = inject(RuntimeConfigService);
  readonly faUsuarios = faUsers;
  readonly faEnviarArquivo = faUpload;
  readonly faCapturarCamera = faCamera;
  readonly faVisualizarDocumento = faEye;
  readonly faImprimirDocumento = faPrint;
  readonly faExcluirDocumento = faTrash;
  form: FormGroup;
  searchForm: FormGroup;
  activeTab = 'lista';
  saving = false;
  feedback: string | null = null;
  popupErros: string[] = [];
  popupMensagens: string[] = [];
  popupTitulo = 'Aviso';
  beneficiarioId: string | null = null;
  documentosObrigatorios: DocumentoObrigatorio[] = [];
  readonly documentOverviewRows: DocumentOverviewRow[] = [
    {
      label: 'CPF',
      field: 'cpf',
      uploadName: 'CPF',
      description: 'Número oficial do CPF',
      placeholder: '000.000.000-00',
      required: true,
    },
    { label: 'CNH', field: 'cnh', uploadName: 'CNH', description: 'Carteira Nacional de Habilitação' },
    {
      label: 'Certidão de Nascimento',
      uploadName: 'Certidão de Nascimento',
      description: 'Documento civil de nascimento',
    },
    {
      label: 'Certidão de Casamento',
      uploadName: 'Certidão de Casamento',
      description: 'Documento civil de casamento',
    },
    { label: 'Carteira de Trabalho', uploadName: 'Carteira de Trabalho' },
    { label: 'Título de eleitor', field: 'titulo_eleitor', uploadName: 'Título de eleitor' },
    { label: 'Cartão SUS', field: 'cartao_sus', uploadName: 'Cartão SUS' },
    {
      label: 'Comprovante de endereço',
      uploadName: 'Comprovante de endereço',
      description: 'Comprovante com CEP e logradouro atualizados',
    },
  ];
  pendingDocumentCaptureName: string | null = null;
  beneficiaryAge: number | null = null;
  beneficiaryCode: string | null = null;
  selectedBeneficiary: BeneficiarioApiPayload | null = null;
  paginaAtual = 1;
  readonly tamanhoPagina = 10;
  nextSequentialCode = '0001';
  beneficiarios: BeneficiarioApiPayload[] = [];
  filteredBeneficiarios: BeneficiarioApiPayload[] = [];
  familyRegistration: string | null = null;
  createdAt: string | null = null;
  lastUpdatedAt: string | null = null;
  assistanceUnit: AssistanceUnitPayload | undefined | null = null;
  printOrderBy: PrintOrder = 'nome';
  printListOrder: PrintListOrder = 'alphabetical';
  printMenuOpen = false;
  printByNameOpen = false;
  printByNameQuery = '';
  readonly printOrderOptions: { value: PrintOrder; label: string }[] = [
    { value: 'nome', label: 'Nome' },
    { value: 'data_nascimento', label: 'Data de nascimento' },
    { value: 'idade', label: 'Idade' },
    { value: 'bairro', label: 'Bairro' },
  ];
  genderIdentityOptions = [
    'Mulher cisgenero',
    'Homem cisgenero',
    'Mulher transgenero',
    'Homem transgenero',
    'Pessoa nao binaria',
    'Travesti',
    'Genero fluido',
    'Outro',
    'Prefiro nao informar',
  ];
  maritalStatusOptions = [
    'Solteiro(a)',
    'Casado(a)',
    'Uniao estavel',
    'Separado(a)',
    'Divorciado(a)',
    'Viuvo(a)',
  ];
  nationalityOptions = [
    'Afega(o)',
    'Alema(o)',
    'Angolana(o)',
    'Argentina(o)',
    'Australiana(o)',
    'Belga',
    'Boliviana(o)',
    'Brasileira',
    'Brasileiro',
    'Canadense',
    'Chilena(o)',
    'Chinesa(o)',
    'Colombiana(o)',
    'Coreana(o)',
    'Costa-riquenha(o)',
    'Cubana(o)',
    'Dinamarquesa(o)',
    'Egipcia(o)',
    'Espanhola(o)',
    'Estadunidense',
    'Filipina(o)',
    'Finlandesa(o)',
    'Francesa(o)',
    'Grega(o)',
    'Haitiana(o)',
    'Holandesa(o)',
    'Indiana(o)',
    'Inglesa(o)',
    'Iraniana(o)',
    'Iraquiana(o)',
    'Irlandesa(o)',
    'Israelense',
    'Italiana(o)',
    'Japonesa(e)',
    'Marroquina(o)',
    'Mexicana(o)',
    'Mocambicana(o)',
    'Norueguesa(o)',
    'Paraguaia(o)',
    'Peruana(o)',
    'Polonesa(o)',
    'Portuguesa(o)',
    'Russa(o)',
    'Senegalesa(o)',
    'Sul-africana(o)',
    'Sueca(o)',
    'Suica(o)',
    'Turca(o)',
    'Uruguaia(o)',
    'Venezuelana(o)',
  ];
  brazilianStates = [
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
    'TO',
  ];
  listLoading = false;
  listError: string | null = null;
  preferredContactOptions = [
    { value: 'MANHA', label: 'Manha' },
    { value: 'TARDE', label: 'Tarde' },
    { value: 'NOITE', label: 'Noite' },
    { value: 'COMERCIAL', label: 'Horario comercial' },
    { value: 'QUALQUER', label: 'Qualquer horario' },
  ];
  statusOptions: BeneficiarioApiPayload['status'][] = [
    'ATIVO',
    'INATIVO',
    'DESATUALIZADO',
    'INCOMPLETO',
    'EM_ANALISE',
    'BLOQUEADO',
  ];
  blockReasonModalOpen = false;
  blockReasonError: string | null = null;
  lastStatus: BeneficiarioApiPayload['status'] | null = 'EM_ANALISE';
  previousStatusBeforeBlock: BeneficiarioApiPayload['status'] | null = 'EM_ANALISE';
  statusDirty = false;
  private ignoreStatusChange = false;
  photoPreview: string | null = null;
  cameraActive = false;
  captureError: string | null = null;
  cepLookupError: string | null = null;
  quickSearchModalOpen = false;
  mapaModalOpen = false;
  mapaEnderecoUrl: SafeResourceUrl | null = null;
  mapaEnderecoLink = '';
  situacaoImovelOptions = ['Proprio', 'Alugado', 'Cedido', 'Financiado', 'Ocupacao', 'Outro'];
  tipoMoradiaOptions = [
    'Casa',
    'Apartamento',
    'Comodo',
    'Barraco',
    'Casa de madeira',
    'Sitio/Chacara',
    'Outro',
  ];
  private isUpdatingNationality = false;
  private nationalityManuallyChanged = false;
  private videoStream?: MediaStream;
  private readonly destroy$ = new Subject<void>();
  private hasLoadedExistingDocuments = false;
  private feedbackTimeout?: ReturnType<typeof setTimeout>;
  uploadProgress: Record<number, number> = {};
  uploadingDocuments = false;
  private sequentialLoading = false;
  documentoTipoSelecionado = '';
  tiposDocumento = ['CPF', 'RG', 'Certidao', 'Titulo', 'CNH', 'Cartao SUS', 'Outros'];
  filtroTipoDocumento = '';
  ordenarDocumentosAsc = true;
  private readonly documentosOrdenacaoKey = 'g3.documentos.ordenacao';
  missingFieldsModalOpen = false;
  missingFieldMessages: string[] = [];
  pdfErrorDialogOpen = false;
  pdfErrorMessage: string | null = null;
  dialogConfirmacaoAberta = false;
  dialogTitulo = 'Confirmar acao';
  dialogMensagem = 'Deseja continuar?';
  dialogConfirmarLabel = 'Confirmar';
  private dialogAcao?: () => void;
  private readonly documentoObrigatorioUnico = 'CPF';
  private documentNameKey(name?: string): string {
    return (name ?? '').trim().toLowerCase();
  }
  private isRequiredDocument(name?: string): boolean {
    return this.documentNameKey(name) === this.documentNameKey(this.documentoObrigatorioUnico);
  }
  @ViewChild('videoElement') videoElement?: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement?: ElementRef<HTMLCanvasElement>;
  private readonly sentenceCaseFields: (string | number)[][] = [
    ['dadosPessoais', 'nome_completo'],
    ['dadosPessoais', 'nome_social'],
    ['dadosPessoais', 'apelido'],
    ['dadosPessoais', 'naturalidade_cidade'],
    ['dadosPessoais', 'nome_mae'],
    ['dadosPessoais', 'nome_pai'],
    ['endereco', 'logradouro'],
    ['endereco', 'complemento'],
    ['endereco', 'bairro'],
    ['endereco', 'ponto_referencia'],
    ['endereco', 'municipio'],
    ['contato', 'telefone_recado_nome'],
    ['documentos', 'certidao_tipo'],
    ['documentos', 'certidao_livro'],
    ['documentos', 'certidao_folha'],
    ['documentos', 'certidao_termo'],
    ['documentos', 'certidao_cartorio'],
    ['documentos', 'certidao_municipio'],
    ['documentos', 'titulo_eleitor'],
    ['documentos', 'cnh'],
    ['documentos', 'cartao_sus'],
    ['familiar', 'vinculo_familiar'],
    ['familiar', 'composicao_familiar'],
    ['familiar', 'participa_comunidade'],
    ['familiar', 'rede_apoio'],
    ['familiar', 'situacao_vulnerabilidade'],
    ['escolaridade', 'ocupacao'],
    ['escolaridade', 'situacao_trabalho'],
    ['escolaridade', 'local_trabalho'],
    ['saude', 'tipo_deficiencia'],
    ['saude', 'descricao_medicacao'],
    ['saude', 'servico_saude_referencia'],
    ['beneficios', 'beneficios_descricao'],
    ['observacoes', 'observacoes'],
  ];
  educationLevelOptions: string[] = [
    'Sem escolaridade formal',
    'Ensino fundamental incompleto',
    'Ensino fundamental completo',
    'Ensino medio incompleto',
    'Ensino medio completo',
    'Ensino tecnico',
    'Ensino superior incompleto',
    'Ensino superior completo',
    'Pos-graduacao',
    'Mestrado',
    'Doutorado',
  ];
  availableBenefits: string[] = [
    'Bolsa Familia / PTR',
    'BPC - Idoso',
    'BPC - Pessoa com deficiencia',
    'Beneficio eventual',
    'Programa de moradia',
    'Auxilio-doenca',
    'Seguro-desemprego',
    'Outros',
  ];
  tabs = [
    { id: 'lista', label: 'Listagem de beneficiários' },
    { id: 'dados', label: 'Dados Pessoais' },
    { id: 'endereco', label: 'Endereço' },
    { id: 'contato', label: 'Contato' },
    { id: 'documentos', label: 'Documentos' },
    { id: 'familiar', label: 'Situação Familiar e Social' },
    { id: 'escolaridade', label: 'Escolaridade e trabalho' },
    { id: 'saude', label: 'Saúde' },
    { id: 'beneficios', label: 'Benefícios' },
    { id: 'observacoes', label: 'Observações e aceite' },
  ];
  readonly acoesToolbar: Required<ConfigAcoesCrud> = this.criarConfigAcoes({
    buscar: true,
    salvar: true,
    excluir: true,
    novo: true,
    cancelar: true,
    imprimir: true,
  });
  get acoesDesabilitadas(): EstadoAcoesCrud {
    return {
      buscar: this.saving || this.uploadingDocuments,
      salvar: this.saving || this.uploadingDocuments,
      excluir: !this.selectedBeneficiary,
      novo: this.saving || this.uploadingDocuments,
      cancelar: this.saving || this.uploadingDocuments,
      imprimir: this.saving || this.uploadingDocuments,
    };
  }
  get activeTabIndex(): number {
    return this.tabs.findIndex((tab) => tab.id === this.activeTab);
  }
  get beneficiariosPaginados(): BeneficiarioApiPayload[] {
    const inicio = (this.paginaAtual - 1) * this.tamanhoPagina;
    return this.filteredBeneficiarios.slice(inicio, inicio + this.tamanhoPagina);
  }
  get totalPaginas(): number {
    return Math.max(1, Math.ceil(this.filteredBeneficiarios.length / this.tamanhoPagina));
  }
  paginaAnterior(): void {
    if (this.paginaAtual > 1) {
      this.paginaAtual -= 1;
    }
  }
  proximaPagina(): void {
    if (this.paginaAtual < this.totalPaginas) {
      this.paginaAtual += 1;
    }
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
  fecharPopupErros(): void {
    this.popupErros = [];
  }
  fecharPopupMensagens(): void {
    this.popupMensagens = [];
  }
  getTabLabel(id: string): string {
    return this.tabs.find((tab) => tab.id === id)?.label ?? '';
  }
  private normalizeBeneficiaryCode(code?: string | null): string | null {
    const numericCode = this.extractNumericCode(code);
    if (numericCode === null) return code ?? null;
    return this.formatSequentialCode(numericCode);
  }
  private extractNumericCode(code?: string | null): number | null {
    if (!code) return null;
    const numericPart = (code.match(/\d+/g) ?? []).join('');
    if (!numericPart) return null;
    const parsed = Number.parseInt(numericPart, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  private formatSequentialCode(value: number): string {
    const clamped = Number.isFinite(value) && value > 0 ? value : 1;
    return clamped.toString().padStart(4, '0').slice(-4);
  }
  private updateSequentialCode(): void {
    const numericCodes = (this.beneficiarios ?? [])
      .map((beneficiario) => this.extractNumericCode(beneficiario.codigo))
      .filter((value): value is number => value !== null);
    const highestCode = Math.max(0, ...numericCodes);
    this.nextSequentialCode = this.formatSequentialCode(highestCode + 1);
    if (!this.beneficiarioId) {
      this.beneficiaryCode = this.nextSequentialCode;
    }
  }
  get motivoBloqueioControl(): FormControl<string | null> {
    return this.form.get('motivo_bloqueio') as FormControl<string | null>;
  }
  constructor(
    private readonly fb: FormBuilder,
    private readonly service: BeneficiarioApiService,
    private readonly beneficiaryService: BeneficiaryService,
    private readonly configService: ConfigService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly http: HttpClient,
    private readonly assistanceUnitService: AssistanceUnitService,
    private readonly reportService: ReportService,
    private readonly authService: AuthService,
    private readonly ngZone: NgZone,
    private readonly sanitizer: DomSanitizer,
  ) {
    super();
    this.searchForm = this.fb.group({
      nome: [''],
      codigo: [''],
      cpf: [''],
      data_nascimento: [''],
      status: [''],
    });
    this.form = this.fb.group({
      status: ['EM_ANALISE', Validators.required],
      motivo_bloqueio: [''],
      foto_3x4: [''],
      dadosPessoais: this.fb.group({
        nome_completo: ['', Validators.required],
        nome_social: [''],
        apelido: [''],
        data_nascimento: ['', Validators.required],
        sexo_biologico: [''],
        identidade_genero: [''],
        cor_raca: [''],
        estado_civil: [''],
        nacionalidade: [''],
        naturalidade_cidade: [''],
        naturalidade_uf: [''],
        nome_mae: ['', Validators.required],
        nome_pai: [''],
      }),
      endereco: this.fb.group({
        usa_endereco_familia: [true],
        cep: ['', [Validators.required, this.cepValidator]],
        logradouro: [''],
        numero: [''],
        complemento: [''],
        bairro: [''],
        ponto_referencia: [''],
        municipio: [''],
        uf: [''],
        latitude: [''],
        longitude: [''],
        zona: ['URBANA'],
        subzona: [''],
      }),
      contato: this.fb.group({
        telefone_principal: ['', Validators.required],
        telefone_principal_whatsapp: [false],
        telefone_secundario: [''],
        telefone_recado_nome: [''],
        telefone_recado_numero: [''],
        email: ['', [Validators.email]],
        permite_contato_tel: [true],
        permite_contato_whatsapp: [true],
        permite_contato_sms: [false],
        permite_contato_email: [false],
        horario_preferencial_contato: [''],
      }),
      documentos: this.fb.group({
        cpf: ['', [Validators.required, this.cpfValidator]],
        rg_numero: [''],
        rg_orgao_emissor: [''],
        rg_uf: [''],
        rg_data_emissao: [''],
        nis: [''],
        certidao_tipo: [''],
        certidao_livro: [''],
        certidao_folha: [''],
        certidao_termo: [''],
        certidao_cartorio: [''],
        certidao_municipio: [''],
        certidao_uf: [''],
        titulo_eleitor: [''],
        cnh: [''],
        cartao_sus: [''],
        anexos: this.fb.array([]),
      }),
      familiar: this.fb.group({
        mora_com_familia: [false],
        responsavel_legal: [false],
        vinculo_familiar: [''],
        situacao_vulnerabilidade: [''],
        composicao_familiar: [''],
        criancas_adolescentes: [''],
        idosos: [''],
        acompanhamento_cras: [false],
        acompanhamento_saude: [false],
        participa_comunidade: [''],
        rede_apoio: [''],
      }),
      escolaridade: this.fb.group({
        sabe_ler_escrever: [false],
        nivel_escolaridade: [''],
        estuda_atualmente: [false],
        ocupacao: [''],
        situacao_trabalho: [''],
        local_trabalho: [''],
        renda_mensal: [''],
        fonte_renda: [''],
      }),
      saude: this.fb.group({
        possui_deficiencia: [false],
        tipo_deficiencia: [''],
        cid_principal: [''],
        usa_medicacao_continua: [false],
        descricao_medicacao: [''],
        servico_saude_referencia: [''],
      }),
      beneficios: this.fb.group({
        recebe_beneficio: [false],
        beneficios_descricao: [''],
        valor_total_beneficios: [''],
        beneficios_recebidos: this.fb.control<string[]>([]),
      }),
      observacoes: this.fb.group({
        aceite_lgpd: [false, Validators.requiredTrue],
        data_aceite_lgpd: [''],
        observacoes: [''],
      }),
    });
  }
  private loadAssistanceUnit(): void {
    this.assistanceUnitService.get().subscribe({
      next: ({ unidade }) => {
        this.assistanceUnit = unidade ?? undefined;
      },
      error: () => {
        this.assistanceUnit = undefined;
      },
    });
  }
  goToNextTab(): void {
    if (this.uploadingDocuments) {
      this.feedback = 'Aguarde o envio dos documentos antes de continuar.';
      return;
    }
    if (!this.hasNextTab) return;
    const targetTab = this.tabs[this.activeTabIndex + 1].id;
    this.changeTab(targetTab);
  }
  goToPreviousTab(): void {
    if (this.hasPreviousTab) {
      this.changeTab(this.tabs[this.activeTabIndex - 1].id);
    }
  }
  ngOnInit(): void {
    this.loadRequiredDocuments();
    this.loadAssistanceUnit();
    this.refreshSequentialCode();
    this.watchBirthDate();
    this.setupNationalityAutomation();
    this.setupEducationControls();
    this.watchStatusChanges();
    this.setupSentenceCaseFormatting();
    this.carregarOrdenacaoDocumentos();
    this.searchBeneficiaries();
    this.searchForm
      .get('status')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => this.applyListFilters());
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.beneficiarioId = id;
        this.service.getById(id).subscribe(({ beneficiario }) => {
          const normalizedBeneficiary = {
            ...beneficiario,
            codigo: this.normalizeBeneficiaryCode(beneficiario.codigo) || undefined,
          };
          this.selectedBeneficiary = normalizedBeneficiary;
          this.form.patchValue(this.mapToForm(normalizedBeneficiary));
          this.photoPreview = normalizedBeneficiary.foto_3x4 ?? null;
          this.lastStatus = normalizedBeneficiary.status ?? 'EM_ANALISE';
          this.previousStatusBeforeBlock = this.lastStatus;
          this.nationalityManuallyChanged = !!normalizedBeneficiary.nacionalidade;
          this.applyLoadedDocuments(this.getDocumentList(normalizedBeneficiary));
          this.applyAutomaticStatusFromDates(normalizedBeneficiary.status);
        });
      }
    });
  }
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopCamera();
    if (this.feedbackTimeout) {
      clearTimeout(this.feedbackTimeout);
    }
  }
  get anexos(): FormArray {
    return this.form.get(['documentos', 'anexos']) as FormArray;
  }
  get documentosAnexados(): { control: FormGroup; index: number }[] {
    const documentos = this.anexos.controls
      .map((control, index) => ({ control: control as FormGroup, index }))
      .filter(
        (item) =>
          (!!item.control.get('nomeArquivo')?.value || !!item.control.get('conteudo')?.value) &&
          (!this.filtroTipoDocumento ||
            this.documentNameKey(item.control.get('nome')?.value) ===
              this.documentNameKey(this.filtroTipoDocumento)),
      );
    return documentos.sort((a, b) => {
      const nomeA = this.documentNameKey(a.control.get('nome')?.value);
      const nomeB = this.documentNameKey(b.control.get('nome')?.value);
      const comparison = nomeA.localeCompare(nomeB);
      return this.ordenarDocumentosAsc ? comparison : -comparison;
    });
  }
  private findDocumentIndex(uploadName?: string | null): number {
    if (!uploadName) return -1;
    const normalized = this.documentNameKey(uploadName);
    if (!normalized) return -1;
    return this.anexos.controls.findIndex(
      (control) => this.documentNameKey(control.get('nome')?.value) === normalized,
    );
  }

  getDocumentIndex(uploadName: string): number | null {
    const index = this.findDocumentIndex(uploadName);
    return index >= 0 ? index : null;
  }

  getDocumentControl(uploadName: string): FormGroup | null {
    const index = this.findDocumentIndex(uploadName);
    if (index < 0) return null;
    return this.anexos.at(index) as FormGroup;
  }

  private ensureDocumentControl(uploadName: string): number {
    const existingIndex = this.findDocumentIndex(uploadName);
    if (existingIndex >= 0) {
      return existingIndex;
    }
    this.anexos.push(this.buildDocumentControl({ nome: uploadName, obrigatorio: false }));
    return this.anexos.length - 1;
  }

  handlePrimaryDocumentFile(event: Event, uploadName: string): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !uploadName) {
      input.value = '';
      return;
    }
    const index = this.ensureDocumentControl(uploadName);
    const control = this.anexos.at(index) as FormGroup;
    this.applyFileToDocument(control, file, index);
    input.value = '';
  }

  getDocumentFileName(uploadName: string): string | null {
    const control = this.getDocumentControl(uploadName);
    return (control?.get('nomeArquivo')?.value as string) || null;
  }

  hasDocumentContent(uploadName: string): boolean {
    const control = this.getDocumentControl(uploadName);
    return !!control && (!!control.get('nomeArquivo')?.value || !!control.get('conteudo')?.value);
  }

  removeDocumentByUploadName(uploadName: string): void {
    const index = this.getDocumentIndex(uploadName);
    if (index === null) {
      this.feedback = 'Nenhum arquivo anexado para remover.';
      return;
    }
    const control = this.anexos.at(index) as FormGroup;
    const nomeDocumento = (control.get('nome')?.value as string) || uploadName;
    const nomeArquivo = (control.get('nomeArquivo')?.value as string) || '';
    const mensagem = nomeArquivo
      ? `Tem certeza que deseja excluir o documento "${nomeDocumento}" (${nomeArquivo})?`
      : `Tem certeza que deseja excluir o documento "${nomeDocumento}"?`;

    this.abrirDialogoConfirmacao('Excluir documento', mensagem, 'Excluir', () => {
      const latestIndex = this.getDocumentIndex(uploadName);
      if (latestIndex === null) return;
      this.removeUploadedDocument(latestIndex);
      this.feedback = 'Documento excluído com sucesso.';
    });
  }

  isDocumentUploading(index: number | null): boolean {
    if (index === null) return false;
    const progress = this.uploadProgress[index];
    return progress !== undefined && progress < 100;
  }

  getDocumentStatusClass(index: number | null, control: FormGroup | null): string {
    if (this.isDocumentUploading(index)) {
      return 'document-status document-status--loading';
    }
    if (control && (control.get('nomeArquivo')?.value || control.get('conteudo')?.value)) {
      return 'document-status document-status--saved';
    }
    return 'document-status document-status--pending';
  }

  getDocumentStatusLabel(index: number | null, control: FormGroup | null): string {
    if (this.isDocumentUploading(index)) {
      return 'Enviando';
    }
    if (control && (control.get('nomeArquivo')?.value || control.get('conteudo')?.value)) {
      return 'Anexado';
    }
    return 'Pendente';
  }

  private normalizarTextoNome(valor?: string | null): string {
    if (!valor) return '';
    return this.toSentenceCase(valor.toString());
  }

  private normalizarCamposNome(beneficiario: BeneficiarioApiPayload): BeneficiarioApiPayload {
    return {
      ...beneficiario,
      nome_completo: this.normalizarTextoNome(beneficiario.nome_completo),
      nome_social: this.normalizarTextoNome(beneficiario.nome_social),
      apelido: this.normalizarTextoNome(beneficiario.apelido),
      nome_mae: this.normalizarTextoNome(beneficiario.nome_mae),
      nome_pai: this.normalizarTextoNome(beneficiario.nome_pai),
      naturalidade_cidade: this.normalizarTextoNome(beneficiario.naturalidade_cidade),
    };
  }

  formatarNomeListagem(beneficiario: BeneficiarioApiPayload): string {
    const nome = beneficiario.nome_completo || beneficiario.nome_social || '';
    return this.normalizarTextoNome(nome) || '---';
  }

  mapToForm(beneficiario: BeneficiarioApiPayload) {
    const beneficiarioNormalizado = this.normalizarCamposNome(beneficiario);
    this.applyBeneficiaryMetadata(beneficiarioNormalizado);
    this.beneficiaryCode = this.normalizeBeneficiaryCode(beneficiarioNormalizado.codigo);
    return {
      status: beneficiarioNormalizado.status ?? 'EM_ANALISE',
      motivo_bloqueio: beneficiarioNormalizado.motivo_bloqueio,
      foto_3x4: beneficiarioNormalizado.foto_3x4,
      dadosPessoais: {
        nome_completo: beneficiarioNormalizado.nome_completo,
        nome_social: beneficiarioNormalizado.nome_social,
        apelido: beneficiarioNormalizado.apelido,
        data_nascimento: beneficiarioNormalizado.data_nascimento,
        sexo_biologico: beneficiarioNormalizado.sexo_biologico,
        identidade_genero: beneficiarioNormalizado.identidade_genero,
        cor_raca: beneficiarioNormalizado.cor_raca,
        estado_civil: beneficiarioNormalizado.estado_civil,
        nacionalidade: beneficiarioNormalizado.nacionalidade,
        naturalidade_cidade: beneficiarioNormalizado.naturalidade_cidade,
        naturalidade_uf: beneficiarioNormalizado.naturalidade_uf,
        nome_mae: beneficiarioNormalizado.nome_mae,
        nome_pai: beneficiarioNormalizado.nome_pai,
      },
      endereco: {
        usa_endereco_familia: beneficiarioNormalizado.usa_endereco_familia,
        cep: this.formatCep(beneficiarioNormalizado.cep),
        logradouro: beneficiarioNormalizado.logradouro,
        numero: beneficiarioNormalizado.numero,
        complemento: beneficiarioNormalizado.complemento,
        bairro: beneficiarioNormalizado.bairro,
        ponto_referencia: beneficiarioNormalizado.ponto_referencia,
        municipio: beneficiarioNormalizado.municipio,
        uf: beneficiarioNormalizado.uf,
        latitude: beneficiarioNormalizado.latitude,
        longitude: beneficiarioNormalizado.longitude,
        zona: beneficiarioNormalizado.zona || 'URBANA',
        subzona: beneficiarioNormalizado.subzona,
        situacao_imovel: beneficiarioNormalizado.situacao_imovel,
        tipo_moradia: beneficiarioNormalizado.tipo_moradia,
        agua_encanada: beneficiarioNormalizado.agua_encanada,
        esgoto_tipo: beneficiarioNormalizado.esgoto_tipo,
        coleta_lixo: beneficiarioNormalizado.coleta_lixo,
        energia_eletrica: beneficiarioNormalizado.energia_eletrica,
        internet: beneficiarioNormalizado.internet,
      },
      contato: {
        telefone_principal: this.formatPhoneValue(beneficiarioNormalizado.telefone_principal),
        telefone_principal_whatsapp: beneficiarioNormalizado.telefone_principal_whatsapp,
        telefone_secundario: this.formatPhoneValue(beneficiarioNormalizado.telefone_secundario),
        telefone_recado_nome: beneficiarioNormalizado.telefone_recado_nome,
        telefone_recado_numero: this.formatPhoneValue(beneficiarioNormalizado.telefone_recado_numero),
        email: beneficiarioNormalizado.email,
        permite_contato_tel: beneficiarioNormalizado.permite_contato_tel,
        permite_contato_whatsapp: beneficiarioNormalizado.permite_contato_whatsapp,
        permite_contato_sms: beneficiarioNormalizado.permite_contato_sms,
        permite_contato_email: beneficiarioNormalizado.permite_contato_email,
        horario_preferencial_contato: beneficiarioNormalizado.horario_preferencial_contato,
      },
      documentos: {
        cpf: this.formatCpf(beneficiarioNormalizado.cpf),
        rg_numero: beneficiarioNormalizado.rg_numero,
        rg_orgao_emissor: beneficiarioNormalizado.rg_orgao_emissor,
        rg_uf: beneficiarioNormalizado.rg_uf,
        rg_data_emissao: beneficiarioNormalizado.rg_data_emissao,
        nis: beneficiarioNormalizado.nis,
        certidao_tipo: beneficiarioNormalizado.certidao_tipo,
        certidao_livro: beneficiarioNormalizado.certidao_livro,
        certidao_folha: beneficiarioNormalizado.certidao_folha,
        certidao_termo: beneficiarioNormalizado.certidao_termo,
        certidao_cartorio: beneficiarioNormalizado.certidao_cartorio,
        certidao_municipio: beneficiarioNormalizado.certidao_municipio,
        certidao_uf: beneficiarioNormalizado.certidao_uf,
        titulo_eleitor: beneficiarioNormalizado.titulo_eleitor,
        cnh: beneficiarioNormalizado.cnh,
        cartao_sus: beneficiarioNormalizado.cartao_sus,
      },
      familiar: {
        mora_com_familia: beneficiarioNormalizado.mora_com_familia,
        responsavel_legal: beneficiarioNormalizado.responsavel_legal,
        vinculo_familiar: beneficiarioNormalizado.vinculo_familiar,
        situacao_vulnerabilidade: beneficiarioNormalizado.situacao_vulnerabilidade,
        composicao_familiar: beneficiarioNormalizado.composicao_familiar,
        criancas_adolescentes: beneficiarioNormalizado.criancas_adolescentes,
        idosos: beneficiarioNormalizado.idosos,
        acompanhamento_cras: beneficiarioNormalizado.acompanhamento_cras,
        acompanhamento_saude: beneficiarioNormalizado.acompanhamento_saude,
        participa_comunidade: beneficiarioNormalizado.participa_comunidade,
        rede_apoio: beneficiarioNormalizado.rede_apoio,
      },
      escolaridade: {
        sabe_ler_escrever: beneficiarioNormalizado.sabe_ler_escrever,
        nivel_escolaridade: beneficiarioNormalizado.nivel_escolaridade,
        estuda_atualmente: beneficiarioNormalizado.estuda_atualmente,
        ocupacao: beneficiarioNormalizado.ocupacao,
        situacao_trabalho: beneficiarioNormalizado.situacao_trabalho,
        local_trabalho: beneficiarioNormalizado.local_trabalho,
        renda_mensal: beneficiarioNormalizado.renda_mensal,
        fonte_renda: beneficiarioNormalizado.fonte_renda,
      },
      saude: {
        possui_deficiencia: beneficiarioNormalizado.possui_deficiencia,
        tipo_deficiencia: beneficiarioNormalizado.tipo_deficiencia,
        cid_principal: beneficiarioNormalizado.cid_principal,
        usa_medicacao_continua: beneficiarioNormalizado.usa_medicacao_continua,
        descricao_medicacao: beneficiarioNormalizado.descricao_medicacao,
        servico_saude_referencia: beneficiarioNormalizado.servico_saude_referencia,
      },
      beneficios: {
        recebe_beneficio: beneficiario.recebe_beneficio,
        beneficios_descricao: beneficiario.beneficios_descricao,
        valor_total_beneficios: beneficiario.valor_total_beneficios,
        beneficios_recebidos: beneficiario.beneficios_recebidos || [],
      },
      observacoes: {
        aceite_lgpd: beneficiario.aceite_lgpd,
        data_aceite_lgpd: this.formatarAceiteParaDateTimeLocal(beneficiario.data_aceite_lgpd),
        observacoes: beneficiario.observacoes,
      },
    };
  }
  private applyBeneficiaryMetadata(beneficiario: BeneficiarioApiPayload | null): void {
    this.createdAt = beneficiario?.data_cadastro ?? null;
    this.lastUpdatedAt = beneficiario?.data_atualizacao ?? beneficiario?.data_cadastro ?? null;
    this.familyRegistration = this.getFamilyRegistrationValue(beneficiario);
  }
  formatDateTime(dateValue: string | null): string {
    if (!dateValue) return 'N??o informado';
    const parsed = new Date(dateValue);
    if (isNaN(parsed.getTime())) return 'N??o informado';
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
      parsed,
    );
  }
  getFamilyRegistrationLabel(): string {
    return this.familyRegistration || 'N??o vinculado';
  }
  private getFamilyRegistrationValue(beneficiario: BeneficiarioApiPayload | null): string | null {
    if (!beneficiario) return null;
    return (
      beneficiario.registro_familia ||
      beneficiario.codigo_familia ||
      beneficiario.id_familia ||
      beneficiario.nome_familia ||
      null
    );
  }
  private loadRequiredDocuments(): void {
    this.configService
      .getBeneficiaryDocuments()
      .pipe(
        map(({ documents }) =>
          (documents ?? []).map(
            (doc) => ({ nome: doc.nome, obrigatorio: !!doc.obrigatorio }) as DocumentoObrigatorio,
          ),
        ),
        catchError(() =>
          this.beneficiaryService.getRequiredDocuments().pipe(
            map(({ documents }) => documents ?? []),
            catchError(() => of([])),
          ),
        ),
      )
      .subscribe({
        next: (documents) => {
          this.documentosObrigatorios = documents;
          if (this.hasLoadedExistingDocuments) {
            this.mergeRequiredDocumentsWithExisting();
          } else {
            this.resetDocumentArray();
          }
        },
        error: () => {
          this.documentosObrigatorios = [];
          if (!this.hasLoadedExistingDocuments) {
            this.resetDocumentArray();
          }
        },
      });
  }
  private normalizeDocumentList(
    documents: Partial<DocumentoObrigatorio>[],
  ): DocumentoObrigatorio[] {
    const seen = new Set<string>();
    return documents
      .map((doc) => this.normalizeDocumentData(doc))
      .filter((doc) => {
        const key = this.documentNameKey(doc.nome);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }
  private resetDocumentArray(existing?: DocumentoObrigatorio[]): void {
    this.anexos.clear();
    this.uploadProgress = {};
    this.uploadingDocuments = false;
    const configDocs = this.normalizeDocumentList(this.documentosObrigatorios ?? []);
    const existingDocs = this.normalizeDocumentList(existing ?? []);
    if (configDocs.length) {
      configDocs.forEach((doc) => {
        const match = existingDocs.find(
          (existingDoc) =>
            this.documentNameKey(existingDoc.nome) === this.documentNameKey(doc.nome),
        );
        this.anexos.push(
          this.buildDocumentControl({
            ...doc,
            nomeArquivo: match?.nomeArquivo ?? doc.nomeArquivo,
            conteudo: match?.conteudo ?? doc.conteudo,
            contentType: match?.contentType ?? doc.contentType,
          }),
        );
      });
      existingDocs
        .filter(
          (doc) =>
            !configDocs.some(
              (cfg) => this.documentNameKey(cfg.nome) === this.documentNameKey(doc.nome),
            ),
        )
        .forEach((doc) => this.anexos.push(this.buildDocumentControl(doc)));
      return;
    }
    existingDocs.forEach((doc) => this.anexos.push(this.buildDocumentControl(doc)));
  }
  private mergeRequiredDocumentsWithExisting(): void {
    if (!this.documentosObrigatorios.length) return;
    const currentDocuments = this.anexos.controls.map(
      (control) => control.value as DocumentoObrigatorio,
    );
    this.resetDocumentArray(currentDocuments);
  }
  private normalizeDocumentData(doc: Partial<DocumentoObrigatorio>): DocumentoObrigatorio {
    const obrigatorio = this.isRequiredDocument(doc.nome);
    const nomeArquivo = doc.nomeArquivo ?? (doc.conteudo ? doc.nome : '');
    return {
      id: doc.id,
      nome: doc.nome ?? '',
      obrigatorio,
      nomeArquivo: nomeArquivo ?? '',
      caminhoArquivo: doc.caminhoArquivo,
      conteudo: doc.conteudo,
      contentType: doc.contentType,
    } as DocumentoObrigatorio;
  }
  private buildDocumentControl(doc: Partial<DocumentoObrigatorio>): FormGroup {
    return this.fb.group({
      id: [doc.id ?? null],
      nome: [doc.nome ?? '', Validators.required],
      obrigatorio: [doc.obrigatorio ?? false],
      nomeArquivo: [doc.nomeArquivo ?? ''],
      caminhoArquivo: [doc.caminhoArquivo ?? ''],
      conteudo: [doc.conteudo ?? ''],
      contentType: [doc.contentType ?? ''],
      file: [doc.file ?? null],
    });
  }
  addOptionalDocument(): void {
    this.anexos.push(
      this.buildDocumentControl({ nome: 'Documento adicional', obrigatorio: false }),
    );
  }
  applyLoadedDocuments(documents?: DocumentoObrigatorio[]): void {
    if (documents?.length) {
      this.hasLoadedExistingDocuments = true;
      const normalizedDocuments = documents.map((doc) => this.normalizeDocumentData(doc));
      this.resetDocumentArray(normalizedDocuments);
      if (this.documentosObrigatorios.length) {
        this.mergeRequiredDocumentsWithExisting();
      }
    }
  }
  private getDocumentList(
    beneficiario: BeneficiarioApiPayload,
  ): DocumentoObrigatorio[] | undefined {
    return (beneficiario as any).documentos_obrigatorios ?? beneficiario.documentosObrigatorios;
  }
  onDocumentFileSelected(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const control = this.anexos.at(index) as FormGroup;
    if (file) {
      this.applyFileToDocument(control, file, index);
      input.value = '';
    }
  }
  onDocumentTypeFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!this.documentoTipoSelecionado) {
      this.feedback = 'Selecione o tipo de documento antes de anexar.';
      input.value = '';
      return;
    }
    const existingIndex = this.anexos.controls.findIndex(
      (control) =>
        this.documentNameKey(control.get('nome')?.value) ===
        this.documentNameKey(this.documentoTipoSelecionado),
    );
    let indexToUse = existingIndex;
    if (indexToUse < 0) {
      this.anexos.push(
        this.buildDocumentControl({ nome: this.documentoTipoSelecionado, obrigatorio: false }),
      );
      indexToUse = this.anexos.length - 1;
    }
    const control = this.anexos.at(indexToUse) as FormGroup;
    this.applyFileToDocument(control, file, indexToUse);
    input.value = '';
  }
  printDocument(index: number | null): void {
    if (index === null) {
      this.feedback = 'Nenhum arquivo disponível para imprimir.';
      return;
    }
    const control = this.anexos.at(index) as FormGroup;
    const content = control.get('conteudo')?.value as string;
    const contentType = (control.get('contentType')?.value as string) || 'application/octet-stream';
    const fileName =
      (control.get('nomeArquivo')?.value as string) ||
      (control.get('nome')?.value as string) ||
      'documento';
    const documentoId = control.get('id')?.value as number | string | null;
    const beneficiarioId = this.beneficiarioId || this.selectedBeneficiary?.id_beneficiario;
    if (!content) {
      if (documentoId && beneficiarioId) {
        const url = `${this.runtimeConfig.apiUrl}/api/beneficiarios/${beneficiarioId}/documentos/${documentoId}`;
        const janela = window.open(url, '_blank', 'width=900,height=1100');
        if (janela) {
          janela.addEventListener('load', () => janela.print(), { once: true });
        }
        return;
      }
      this.feedback = 'Nenhum arquivo disponivel para imprimir.';
      return;
    }
    const dataUrl = content.startsWith('data:') ? content : `data:${contentType};base64,${content}`;
    const documentWindow = window.open('', '_blank', 'width=900,height=1100');
    if (!documentWindow) return;
    documentWindow.document.write(
      `      <html>        <head>          <title>${fileName}</title>        </head>        <body style="margin:0; padding:0;">          <iframe src="${dataUrl}" style="border:0; width:100%; height:100%;"></iframe>        </body>      </html>    `,
    );
    documentWindow.document.close();
    documentWindow.focus();
    documentWindow.addEventListener('load', () => documentWindow.print(), { once: true });
  }
  toggleOrdenacaoDocumentos(): void {
    this.ordenarDocumentosAsc = !this.ordenarDocumentosAsc;
    localStorage.setItem(this.documentosOrdenacaoKey, this.ordenarDocumentosAsc ? 'asc' : 'desc');
  }
  private carregarOrdenacaoDocumentos(): void {
    const valor = localStorage.getItem(this.documentosOrdenacaoKey);
    if (valor === 'asc') {
      this.ordenarDocumentosAsc = true;
    } else if (valor === 'desc') {
      this.ordenarDocumentosAsc = false;
    }
  }
  private applyFileToDocument(control: FormGroup, file: File, index: number): void {
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      this.feedback = 'Envie apenas arquivos JPG, PNG ou PDF.';
      return;
    }
    const reader = new FileReader();
    this.feedback = null;
    this.uploadProgress[index] = 0;
    this.uploadingDocuments = true;
    reader.onprogress = (progressEvent) => {
      if (!progressEvent.lengthComputable) return;
      const percent = Math.round((progressEvent.loaded / progressEvent.total) * 100);
      this.uploadProgress[index] = percent;
      this.updateUploadState();
    };
    reader.onload = () => {
      const result = reader.result as string;
      control.patchValue({
        file,
        nomeArquivo: file.name,
        conteudo: result,
        contentType: file.type,
      });
      this.uploadProgress[index] = 100;
    };
    reader.onerror = () => {
      this.feedback = 'N??o foi poss??vel carregar o arquivo selecionado. Tente novamente.';
      delete this.uploadProgress[index];
    };
    reader.onabort = () => {
      delete this.uploadProgress[index];
    };
    reader.onloadend = () => {
      this.updateUploadState();
    };
    reader.readAsDataURL(file);
    control.markAsDirty();
  }
  private applyCapturedDocumentContent(documentName: string, dataUrl: string): void {
    if (!documentName?.trim()) return;
    const index = this.ensureDocumentControl(documentName);
    if (index < 0) return;
    const control = this.anexos.at(index) as FormGroup;
    const safeName =
      documentName
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') ||
      'documento';
    control.patchValue({
      conteudo: dataUrl,
      contentType: 'image/png',
      nomeArquivo: `${safeName}.png`,
      file: null,
    });
    this.uploadProgress[index] = 100;
    this.updateUploadState();
    control.markAsDirty();
  }

  removeUploadedDocument(index: number): void {
    const control = this.anexos.at(index) as FormGroup | undefined;
    if (!control) return;
    control.patchValue({
      id: null,
      nomeArquivo: '',
      caminhoArquivo: '',
      conteudo: '',
      contentType: '',
      file: null,
    });
    delete this.uploadProgress[index];
    this.updateUploadState();
    control.markAsDirty();
  }
  hasUploadedDocuments(): boolean {
    return this.anexos.controls.some(
      (control) => !!control.get('nomeArquivo')?.value || !!control.get('conteudo')?.value,
    );
  }
  private updateUploadState(): void {
    const highestIndex = this.anexos.length - 1;
    Object.keys(this.uploadProgress).forEach((key) => {
      const index = Number(key);
      if (!Number.isInteger(index) || index < 0 || index > highestIndex) {
        delete this.uploadProgress[index];
      }
    });
    this.uploadingDocuments = Object.values(this.uploadProgress).some((value) => value < 100);
  }
  viewDocument(index: number | null): void {
    if (index === null) {
      this.feedback = 'Nenhum arquivo disponivel para este documento.';
      return;
    }
    const control = this.anexos.at(index) as FormGroup;
    const content = control.get('conteudo')?.value as string;
    const contentType = (control.get('contentType')?.value as string) || 'application/octet-stream';
    const fileName =
      (control.get('nomeArquivo')?.value as string) ||
      (control.get('nome')?.value as string) ||
      'documento';
    const documentoId = control.get('id')?.value as number | string | null;
    const beneficiarioId = this.beneficiarioId || this.selectedBeneficiary?.id_beneficiario;
    if (!content) {
      if (documentoId && beneficiarioId) {
        const url = `${this.runtimeConfig.apiUrl}/api/beneficiarios/${beneficiarioId}/documentos/${documentoId}`;
        window.open(url, '_blank');
        return;
      }
      this.feedback = 'Nenhum arquivo disponivel para este documento.';
      return;
    }
    const dataUrl = content.startsWith('data:') ? content : `data:${contentType};base64,${content}`;
    const documentWindow = window.open('', '_blank', 'width=900,height=1100');
    if (!documentWindow) return;
    documentWindow.document.write(
      `      <html>        <head>          <title>${fileName}</title>        </head>        <body style="margin:0; padding:0;">          <iframe src="${dataUrl}" style="border:0; width:100%; height:100%;"></iframe>        </body>      </html>    `,
    );
    documentWindow.document.close();
    documentWindow.focus();
  }
  private getMissingRequiredDocuments(): string[] {
    return this.anexos.controls
      .filter(
        (control) =>
          control.get('obrigatorio')?.value &&
          !control.get('nomeArquivo')?.value &&
          !control.get('conteudo')?.value,
      )
      .map((control) => control.get('nome')?.value as string);
  }
  private validateRequiredDocuments(): boolean {
    const missing = this.getMissingRequiredDocuments();
    if (missing.length) {
      this.feedback = `Envie os documentos obrigat??rios: ${missing.join(', ')}`;
      this.changeTab('documentos');
      return false;
    }
    return true;
  }
  confirmDocuments(): void {
    const missing = this.getMissingRequiredDocuments();
    if (missing.length) {
      this.feedback = `Envie os documentos obrigat??rios: ${missing.join(', ')}`;
      this.changeTab('documentos');
      return;
    }
    this.showTemporaryFeedback('Documentos conferidos com sucesso.');
  }
  private collectFieldIssues(): string[] {
    const requiredFields: {
      path: (string | number)[];
      label: string;
      message?: string;
      validate?: (control: AbstractControl) => boolean;
    }[] = [
      { path: ['status'], label: 'Status do beneficiario' },
      { path: ['dadosPessoais', 'nome_completo'], label: 'Nome completo' },
      { path: ['dadosPessoais', 'data_nascimento'], label: 'Data de nascimento' },
      { path: ['dadosPessoais', 'nome_mae'], label: 'Nome da m??e' },
      { path: ['endereco', 'cep'], label: 'CEP', message: 'Informe um CEP v??lido.' },
      { path: ['contato', 'telefone_principal'], label: 'Telefone principal' },
      { path: ['documentos', 'cpf'], label: 'CPF', message: 'Informe um CPF v??lido.' },
      {
        path: ['contato', 'email'],
        label: 'E-mail',
        message: 'Informe um e-mail v??lido ou deixe o campo vazio.',
        validate: (control) => !!control.value && control.invalid,
      },
      {
        path: ['observacoes', 'aceite_lgpd'],
        label: 'Aceite LGPD',
        message: 'Confirme o aceite LGPD para continuar.',
        validate: (control) => control.invalid,
      },
    ];
    return requiredFields
      .filter(({ path, validate }) => {
        const control = this.form.get(path);
        if (!control) return false;
        if (validate) return validate(control);
        return control.invalid;
      })
      .map(({ label, message }) => message ?? `${label} ?? obrigat??rio.`);
  }
  private showMissingFieldsModal(messages: string[]): void {
    this.missingFieldMessages = messages;
    this.missingFieldsModalOpen = true;
  }
  closeMissingFieldsModal(): void {
    this.missingFieldsModalOpen = false;
    this.missingFieldMessages = [];
  }
  private showTemporaryFeedback(message: string): void {
    this.ngZone.run(() => {
      this.feedback = message;
    });
    if (this.feedbackTimeout) {
      clearTimeout(this.feedbackTimeout);
    }
    this.feedbackTimeout = setTimeout(() => {
      this.ngZone.run(() => {
        this.feedback = null;
      });
    }, 4000);
  }
  dismissFeedback(): void {
    if (this.feedbackTimeout) {
      clearTimeout(this.feedbackTimeout);
      this.feedbackTimeout = undefined;
    }
    this.feedback = null;
  }
  dismissListError(): void {
    this.listError = null;
  }
  saveStatusChange(): void {
    if (this.saving) return;
    if (!this.beneficiarioId) {
      this.feedback = 'Selecione um beneficiario salvo para atualizar o status.';
      return;
    }
    this.submit(true);
  }
  private isOutdatedDate(dateValue?: string | null): boolean {
    if (!dateValue) return false;
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return false;
    const oneYearMs = 1000 * 60 * 60 * 24 * 365;
    return Date.now() - date.getTime() > oneYearMs;
  }
  private applyAutomaticStatusFromDates(statusFromApi?: string | null): void {
    const outdated = this.isOutdatedDate(this.lastUpdatedAt || this.createdAt);
    if (outdated && statusFromApi !== 'BLOQUEADO' && statusFromApi !== 'INCOMPLETO') {
      this.form.get('status')?.setValue('DESATUALIZADO');
      this.lastStatus = 'DESATUALIZADO';
    }
  }
  private determineStatusForSave(
    allowStatusOnlyUpdate = false,
    missingDocuments: string[] = [],
  ): BeneficiarioApiPayload['status'] {
    const manualStatus =
      (this.form.get('status')?.value as BeneficiarioApiPayload['status']) ?? 'EM_ANALISE';
    const hasPendingDocuments = !allowStatusOnlyUpdate && missingDocuments.length > 0;
    const hasPendingData = !allowStatusOnlyUpdate && (this.form.invalid || hasPendingDocuments);
    if (hasPendingData && manualStatus === 'BLOQUEADO') {
      return manualStatus;
    }
    if (hasPendingData) {
      if (manualStatus && manualStatus !== 'EM_ANALISE' && manualStatus !== 'INCOMPLETO') {
        return manualStatus;
      }
      return 'INCOMPLETO';
    }
    return manualStatus;
  }
  toggleBenefit(option: string): void {
    const control = this.form.get(['beneficios', 'beneficios_recebidos']);
    const current = new Set(control?.value ?? []);
    if (current.has(option)) {
      current.delete(option);
    } else {
      current.add(option);
    }
    control?.setValue(Array.from(current));
  }
  selectionChecked(option: string): boolean {
    const control = this.form.get(['beneficios', 'beneficios_recebidos']);
    return (control?.value as string[] | undefined)?.includes(option) ?? false;
  }
  formatCurrency(
    event: Event,
    groupName = 'beneficios',
    controlName = 'valor_total_beneficios',
  ): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '');
    const numeric = Number(digits || '0') / 100;
    const formatted = numeric
      .toFixed(2)
      .replace('.', ',')
      .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const control = this.form.get([groupName, controlName]);
    control?.setValue(numeric ? numeric.toFixed(2) : '');
    input.value = numeric ? `R$ ${formatted}` : '';
  }
  async handleLgpdToggle(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const dateControl = this.form.get(['observacoes', 'data_aceite_lgpd']);
    if (input.checked) {
      if (!dateControl?.value) {
        dateControl?.setValue(this.getCurrentLocalDateTime());
      }
      await this.printConsentDocument();
    } else {
      dateControl?.setValue('');
    }
  }
  reimprimirTermoConsentimento(): void {
    const aceite = this.form.get(['observacoes', 'aceite_lgpd'])?.value;
    if (!aceite) {
      this.showTemporaryFeedback('Confirme o aceite LGPD antes de reimprimir o termo.');
      return;
    }
    void this.printConsentDocument();
  }
  private getCurrentLocalDateTime(): string {
    const now = new Date();
    const offsetMs = now.getTimezoneOffset() * 60000;
    const local = new Date(now.getTime() - offsetMs);
    return local.toISOString().slice(0, 16);
  }
  async printConsentDocument(): Promise<void> {
    const payload = this.buildAuthorizationTermPayload();
    try {
      const response = await firstValueFrom(this.reportService.generateAuthorizationTerm(payload));
      const pdfBlob = await this.extractPdfFromResponse(response);
      this.openPdfInNewWindow(pdfBlob);
      this.closePdfErrorDialog();
    } catch (error) {
      console.error('Erro ao gerar termo de autoriza????o', error);
      const message = await this.extractPdfErrorMessage(error);
      this.pdfErrorMessage = message;
      this.pdfErrorDialogOpen = true;
    }
  }
  private buildAuthorizationTermPayload(): AuthorizationTermPayload {
    const value = this.form.value as any;
    const personal = value.dadosPessoais ?? {};
    const documents = value.documentos ?? {};
    const address = value.endereco ?? {};
    const now = new Date();
    const today = this.formatDate(now.toISOString());
    const issuedBy =
      this.authService.user()?.nome ||
      this.authService.user()?.nomeUsuario ||
      'Usuario nao informado';
    const beneficiarioNome = personal.nome_completo || personal.nome_social || 'Beneficiario';
    const enderecoCompleto = this.formatAddress(address);
    const cidade = address.municipio || address.cidade || '';
    const uf = address.uf || '';
    return {
      beneficiarioNome,
      rg: documents.rg_numero,
      cpf: documents.cpf,
      enderecoCompleto,
      cidade,
      uf,
      localAssinatura: this.joinParts([cidade, uf], '-'),
      dataAssinatura: today,
      representanteNome: issuedBy,
      issuedBy,
    };
  }
  private openPdfInNewWindow(blob: Blob): void {
    const url = URL.createObjectURL(blob);
    const documentWindow = window.open(url, '_blank', 'width=900,height=1100');
    if (!documentWindow) {
      this.feedback = 'Permita a abertura de pop-ups para visualizar o termo.';
      URL.revokeObjectURL(url);
      return;
    }
    const triggerPrint = () => {
      documentWindow.focus();
      documentWindow.print();
    };
    documentWindow.addEventListener('load', triggerPrint, { once: true });
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
  private async extractPdfFromResponse(response: HttpResponse<Blob>): Promise<Blob> {
    if (!response.ok) {
      throw new Error('Falha ao gerar o PDF.');
    }
    const contentType = response.headers.get('content-type') ?? '';
    const body = response.body;
    if (!body) {
      throw new Error('Falha ao carregar documento PDF.');
    }
    if (!contentType.toLowerCase().includes('pdf')) {
      const text = await body.text();
      throw new Error(text || 'Falha ao carregar documento PDF.');
    }
    return body;
  }
  private async extractPdfErrorMessage(error: unknown): Promise<string> {
    if (error instanceof HttpErrorResponse) {
      if (error.error instanceof Blob) {
        const text = await error.error.text();
        try {
          const parsed = JSON.parse(text);
          if (parsed?.message) return parsed.message;
        } catch {
          /* ignore parse errors */
        }
        if (text) return text;
      }
      if (typeof error.error === 'string' && error.error.trim().length) {
        return error.error;
      }
      if (error.message) return error.message;
    }
    if (error instanceof Error && error.message) {
      return error.message;
    }
    return 'Falha ao carregar documento PDF.';
  }
  closePdfErrorDialog(): void {
    this.pdfErrorDialogOpen = false;
    this.pdfErrorMessage = null;
  }
  retryAuthorizationTerm(): void {
    this.closePdfErrorDialog();
    void this.printConsentDocument();
  }
  async printBeneficiaryList(): Promise<void> {
    const filters: BeneficiaryReportFilters = {
      nome: this.searchForm.value?.nome,
      cpf: this.searchForm.value?.cpf,
      codigo: this.searchForm.value?.codigo,
      status: this.searchForm.value?.status,
      dataNascimento: this.searchForm.value?.data_nascimento,
      ordenarPor: 'nome',
      ordem: 'asc',
      usuarioEmissor: this.usuarioEmissor(),
    };
    try {
      const blob = await firstValueFrom(this.reportService.generateBeneficiaryList(filters));
      this.openPdfInNewWindow(blob);
    } catch (error) {
      console.error('Erro ao gerar rela????o de beneficiarios', error);
      this.feedback = 'Falha ao gerar a rela????o de beneficiarios. Tente novamente.';
    }
  }
  async printIndividualRecord(): Promise<void> {
    const beneficiarioId = this.beneficiarioId || this.selectedBeneficiary?.id_beneficiario;
    if (!beneficiarioId) {
      this.feedback = 'Selecione ou salve o beneficiario antes de gerar a ficha.';
      return;
    }
    await this.printIndividualRecordById(String(beneficiarioId));
  }
  async printIndividualRecordById(beneficiarioId: string): Promise<void> {
    try {
      const blob = await firstValueFrom(
        this.reportService.generateBeneficiaryProfile({
          beneficiarioId,
          usuarioEmissor: this.usuarioEmissor(),
        }),
      );
      this.openPdfInNewWindow(blob);
    } catch (error) {
      console.error('Erro ao gerar ficha individual', error);
      this.feedback = 'Falha ao gerar a ficha individual do beneficiario.';
    }
  }
  imprimirFichaPorNome(beneficiario: BeneficiarioApiPayload): void {
    if (!beneficiario.id_beneficiario) {
      this.feedback = 'Selecione um beneficiario valido para imprimir a ficha.';
      return;
    }
    this.closePrintByName();
    void this.printIndividualRecordById(beneficiario.id_beneficiario);
  }
  private usuarioEmissor(): string {
    return this.authService.user()?.nome || this.authService.user()?.nomeUsuario || 'Sistema';
  }
  private buildIndividualReportTemplate(options: {
    age: number | null;
    address: any;
    beneficiaryName: string;
    benefits: any;
    city: string | null;
    codigo: string;
    contact: any;
    documents: any;
    familyMembers: any;
    formattedBirthDate: string;
    formattedGeneratedAt: string;
    formattedInclusionDate: string;
    formattedNaturalidade: string | null;
    institutionAddress: string;
    logo?: string | null;
    observacoes?: string;
    personal: any;
    photoUrl: string;
    rendaFamiliar: string | null;
    rendaPerCapita: string | null;
    socialName: string;
    status?: string;
    statusLabel: string;
    unit?: AssistanceUnitPayload | null;
  }): string {
    const {
      age,
      address,
      beneficiaryName,
      benefits,
      city,
      codigo,
      contact,
      documents,
      familyMembers,
      formattedBirthDate,
      formattedGeneratedAt,
      formattedInclusionDate,
      formattedNaturalidade,
      institutionAddress,
      logo,
      observacoes,
      personal,
      photoUrl,
      rendaFamiliar,
      rendaPerCapita,
      socialName,
      status,
      statusLabel,
      unit,
    } = options;
    const displayValue = (val?: string | number | null, placeholder = '---'): string =>
      this.hasValue(val) ? String(val) : placeholder;
    const addressLabel =
      this.joinParts([
        this.joinParts([address.logradouro, address.numero], ', '),
        address.complemento,
        address.bairro,
        city,
        address.cep,
      ]) || '---';
    const statusClass = status === 'BLOQUEADO' ? 'status status--blocked' : 'status status--active';
    const benefitsLabel = benefits.recebe_beneficio
      ? displayValue(benefits.beneficios_descricao, 'Sim')
      : 'N??o';
    const programaVinculado = displayValue(personal.programa_vinculado);
    return `      <!DOCTYPE html>      <html lang="pt-BR">        <head>          <meta charset="UTF-8" />          <meta name="viewport" content="width=device-width, initial-scale=1.0" />          <title>Ficha Individual do Benefici??rio - Sistema G3</title>          <style>            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');            :root {              --brand-50: #f0f7ff;              --brand-100: #d9e9ff;              --brand-500: #1d7ed2;              --brand-700: #0d4d8c;              --slate-700: #334155;              --slate-500: #64748b;              --slate-300: #cbd5e1;              --accent: #fbbf24;            }            @page { size: A4; margin: 12mm; }            * { box-sizing: border-box; }            body { font-family: 'Inter', system-ui, -apple-system, sans-serif; margin: 0; padding: 16px; background: #e2e8f0; color: #0f172a; -webkit-print-color-adjust: exact; print-color-adjust: exact; }            .report { width: 100%; max-width: 100%; margin: 0 auto; background: #ffffff; border-radius: 16px; box-shadow: 0 14px 36px rgba(15, 23, 42, 0.08); overflow: hidden; }            .report__inner { padding: 26px; }            .header { display: flex; justify-content: space-between; align-items: center; gap: 16px; border-bottom: 3px solid var(--brand-100); padding-bottom: 14px; }            .identity { display: flex; align-items: center; gap: 14px; }            .logo { width: 72px; height: 72px; border: 1px solid var(--slate-300); border-radius: 12px; display: flex; align-items: center; justify-content: center; background: var(--brand-50); overflow: hidden; }            .logo img { width: 100%; height: 100%; object-fit: contain; }            .unit-name { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.4px; text-transform: uppercase; color: var(--slate-700); }            .unit-meta { margin: 2px 0; color: var(--slate-500); font-size: 12px; }            .header__title { text-align: right; }            .header__title h1 { margin: 0; font-size: 18px; color: var(--brand-700); letter-spacing: 0.3px; }            .header__title p { margin: 2px 0 0; font-size: 12px; color: var(--slate-500); }            .hero { margin: 20px 0 12px; }            .hero-card { display: flex; gap: 20px; align-items: stretch; flex-wrap: nowrap; padding: 16px; border-radius: 14px; background: #ffffff; border: 1px solid #e2e8f0; box-shadow: 0 8px 20px rgba(15, 23, 42, 0.05); }            .hero__media { width: 210px; flex: 0 0 210px; display: flex; flex-direction: column; }            .photo { width: 100%; height: 220px; border-radius: 14px; overflow: hidden; border: 2px solid var(--slate-300); box-shadow: inset 0 0 0 1px #e2e8f0; background: #fff; }            .photo img { width: 100%; height: 100%; object-fit: cover; }            .status { display: inline-flex; align-items: center; gap: 6px; padding: 6px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2px; margin-top: 10px; border: 1px solid #cbd5e1; }            .status.status--blocked { color: #b91c1c; background: #fee2e2; border-color: #fecdd3; }            .status.status--active { color: #166534; background: #dcfce7; border-color: #bbf7d0; }            .headline { padding: 14px 16px; border-radius: 12px; background: linear-gradient(135deg, #f8fafc, #eef2ff); border: 1px solid #e2e8f0; box-shadow: 0 6px 18px rgba(15, 23, 42, 0.04); flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; }            .hero__content { flex: 1; min-width: 0; display: flex; }            .headline__name { margin: 0 0 6px; font-size: 24px; font-weight: 800; letter-spacing: 0.4px; text-transform: uppercase; color: #0f172a; }            .chips { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; }            .chip { padding: 10px 12px; border: 1px dashed #e2e8f0; border-radius: 10px; background: #fff; font-size: 13px; }            .chip strong { display: block; font-size: 12px; color: var(--slate-500); text-transform: uppercase; letter-spacing: 0.3px; }            .grid { display: grid; gap: 16px; margin: 14px 0; }            .grid--two { grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); }            .card { border: 1px solid #e2e8f0; border-radius: 12px; background: #fff; padding: 16px; box-shadow: 0 8px 20px rgba(15, 23, 42, 0.04); page-break-inside: avoid; }            .card__title { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }            .card__title h2 { margin: 0; font-size: 15px; color: var(--brand-700); letter-spacing: 0.3px; }            .fields { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }            .card--pessoais .fields { grid-template-columns: repeat(2, minmax(0, 1fr)); }            .field { padding: 10px 12px; border-radius: 10px; background: #f8fafc; border: 1px solid #e2e8f0; }            .field__label { margin: 0 0 4px; font-size: 11px; color: var(--slate-500); text-transform: uppercase; letter-spacing: 0.25px; }            .field__value { margin: 0; font-size: 14px; color: #0f172a; font-weight: 600; word-break: break-word; }            .note { margin-top: 10px; padding: 12px; background: #fef9c3; border: 1px solid #fef08a; border-radius: 10px; font-size: 13px; color: #713f12; line-height: 1.5; }            footer { text-align: center; padding: 18px; border-top: 1px solid #e2e8f0; margin-top: 8px; font-size: 12px; color: var(--slate-500); page-break-inside: avoid; }            footer .footer-name { font-weight: 800; letter-spacing: 0.3px; color: #0f172a; }            @media print {              body { background: #fff; padding: 0; }              .report { box-shadow: none; border: none; border-radius: 0; }              .report__inner { padding: 18px 12px; }              .hero-card { display: flex; flex-wrap: nowrap; }            }          </style>        </head>        <body>          <article class="report">            <div class="report__inner">              <header class="header">                <div class="identity">                  <div class="logo">${logo ? `<img src="${logo}" alt="Logomarca da unidade" />` : '<span aria-hidden="true">???????</span>'}</div>                  <div>                    <p class="unit-name">${socialName}</p>                    ${unit?.nomeFantasia && unit?.nomeFantasia !== unit?.razaoSocial ? `<p class="unit-meta">${unit.nomeFantasia}</p>` : ''}                    ${unit?.cnpj ? `<p class="unit-meta">CNPJ: ${unit.cnpj}</p>` : ''}                  </div>                </div>                <div class="header__title">                  <h1>Ficha Individual</h1>                  <p>Gerado em ${formattedGeneratedAt}</p>                </div>              </header>              <section class="hero">                <div class="hero-card">                  <div class="hero__media">                  <div class="photo">                    <img src="${photoUrl}" alt="Foto do beneficiario" />                  </div>                  <div class="${statusClass}" aria-label="Status do beneficiario">${statusLabel}</div>                </div>                <div class="hero__content">                  <div class="headline">                  <p class="headline__name">${beneficiaryName}</p>                  <div class="chips">                    <div class="chip"><strong>C??digo</strong>${codigo}</div>                    <div class="chip"><strong>CPF</strong>${displayValue(documents.cpf)}</div>                    <div class="chip"><strong>Data de inclus??o</strong>${formattedInclusionDate}</div>                    <div class="chip"><strong>Categoria</strong>${displayValue(personal.categoria || personal.tipo_cadastro)}</div>                  </div>                  <div class="chip" style="margin-top: 10px; border-style: solid; border-color: #e0f2fe; background: #f0f9ff;">                    <strong>Programa vinculado</strong>${programaVinculado}                  </div>                </div>                </div>              </div>              </section>              <section class="grid grid--two">                <div class="card card--pessoais">                  <div class="card__title">                    <h2>Dados pessoais</h2>                  </div>                  <div class="fields">                    <div class="field">                      <p class="field__label">RG / ??rg??o emissor</p>                      <p class="field__value">${this.joinParts([documents.rg_numero, documents.rg_orgao_emissor], ' / ') || '---'}</p>                    </div>                    <div class="field">                      <p class="field__label">UF emissor</p>                      <p class="field__value">${displayValue(documents.rg_uf)}</p>                    </div>                    <div class="field">                      <p class="field__label">Nascimento</p>                      <p class="field__value">${formattedBirthDate}${age !== null ? ` (${age} anos)` : ''}</p>                    </div>                    <div class="field">                      <p class="field__label">Sexo</p>                      <p class="field__value">${displayValue(personal.sexo_biologico)}</p>                    </div>                    <div class="field">                      <p class="field__label">Nome da m??e</p>                      <p class="field__value">${displayValue(personal.nome_mae)}</p>                    </div>                    <div class="field">                      <p class="field__label">Nome do pai</p>                      <p class="field__value">${displayValue(personal.nome_pai)}</p>                    </div>                    <div class="field">                      <p class="field__label">Estado civil</p>                      <p class="field__value">${displayValue(personal.estado_civil)}</p>                    </div>                    <div class="field">                      <p class="field__label">Naturalidade</p>                      <p class="field__value">${displayValue(formattedNaturalidade)}</p>                    </div>                  </div>                </div>                <div class="card">                  <div class="card__title">                    <h2>Endere??o & contato</h2>                  </div>                  <div class="fields">                    <div class="field" style="grid-column: span 2;">                      <p class="field__label">Endere??o</p>                      <p class="field__value">${addressLabel}</p>                    </div>                    <div class="field">                      <p class="field__label">Ponto de refer??ncia</p>                      <p class="field__value">${displayValue(address.ponto_referencia)}</p>                    </div>                    <div class="field">                      <p class="field__label">Zona</p>                      <p class="field__value">${displayValue(address.zona)}</p>                    </div>                    <div class="field">                      <p class="field__label">Celular</p>                      <p class="field__value">${displayValue(contact.telefone_principal)}</p>                    </div>                    <div class="field">                      <p class="field__label">E-mail</p>                      <p class="field__value">${displayValue(contact.email)}</p>                    </div>                  </div>                </div>              </section>              <section class="card">                <div class="card__title">                  <h2>Dados socioecon??micos</h2>                </div>                <div class="fields" style="grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));">                  <div class="field">                    <p class="field__label">Renda familiar</p>                    <p class="field__value">${displayValue(rendaFamiliar)}</p>                  </div>                  <div class="field">                    <p class="field__label">Renda per capita</p>                    <p class="field__value">${displayValue(rendaPerCapita)}</p>                  </div>                  <div class="field">                    <p class="field__label">Membros da familia</p>                    <p class="field__value">${displayValue(familyMembers)}</p>                  </div>                  <div class="field">                    <p class="field__label">Benef??cio governamental</p>                    <p class="field__value">${benefitsLabel}</p>                  </div>                </div>                <div class="note">                  <strong>Observa????es do assistente social:</strong><br />                  ${displayValue(observacoes, 'Sem observa????es registradas.')}                </div>              </section>            </div>            <footer>              <p class="footer-name">${socialName}</p>              ${unit?.cnpj ? `<p>CNPJ: ${unit.cnpj}</p>` : ''}              <p>${institutionAddress}</p>              ${this.joinParts([unit?.telefone, unit?.email], ' | ') || ''}              <div style="margin-top: 10px; font-size: 11px; color: var(--slate-300);">Documento gerado eletronicamente pelo Sistema G3 em ${formattedGeneratedAt}.</div>            </footer>          </article>        </body>      </html>    `;
  }
  private printStyles(): string {
    return `      <style>        * { box-sizing: border-box; }        @page { size: A4; margin: 12mm; }        body { font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif; padding: 0; line-height: 1.6; color: #0f172a; background: #e2e8f0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }        h1 { margin: 0 0 4px; letter-spacing: 0.2px; color: #0f172a; }        h2 { margin: 0; }        p { margin: 0; }        .muted { color: #475569; font-size: 12px; }        .print-page { width: 100%; padding: 8px 0 16px; }        .report-wrapper { max-width: 100%; margin: 0 auto; background: #ffffff; padding: 26px 28px; border-radius: 18px; box-shadow: 0 14px 38px rgba(15, 23, 42, 0.08); }        .report-header { display: flex; justify-content: center; align-items: center; gap: 16px; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 14px; }        .report-header__logo { max-height: 72px; object-fit: contain; border-radius: 12px; background: #f8fafc; padding: 6px; border: 1px solid #e2e8f0; }        .report-header__identity { text-align: center; }        .report-header__name { font-weight: 800; font-size: 15pt; margin: 0; letter-spacing: 0.2px; text-transform: uppercase; }        .report-header__fantasy { margin: 2px 0 0; font-size: 12pt; color: #1f2937; }        .report-meta { text-align: center; margin: 10px 0 6px; }        .report-meta h1 { font-size: 22px; font-weight: 800; }        .print-table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 11.5px; background: #fff; border-radius: 12px; overflow: hidden; }        .print-table th, .print-table td { border: 1px solid #e2e8f0; padding: 9px 10px; text-align: left; }        .print-table th { background: linear-gradient(135deg, #f8fafc, #eef2ff); font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.2px; }        .print-table tbody tr:nth-child(even) { background: #f8fafc; }        .print-table th:nth-child(3), .print-table td:nth-child(3) { text-align: center; }        .print-table th:nth-child(2), .print-table th:nth-child(4) { width: 16%; }        .print-table th:nth-child(5), .print-table td:nth-child(5) { width: 15%; }        @media print { body { background: #fff; } .report-wrapper { box-shadow: none; border-radius: 0; padding: 18px 12px; } }      </style>    `;
  }
  private formatInstitutionAddress(unit: AssistanceUnitPayload): string {
    const parts = [
      unit.endereco,
      unit.numeroEndereco,
      unit.bairro,
      unit.cidade,
      unit.estado,
      unit.cep,
    ]
      .filter(Boolean)
      .join(', ');
    return parts || '---';
  }
  onPrintOrderChange(order: PrintOrder): void {
    this.printOrderBy = order;
  }
  private formatAddress(address: any): string {
    const parts = [
      address.logradouro,
      address.numero,
      address.bairro,
      address.municipio,
      address.uf,
      address.cep,
    ]
      .filter(Boolean)
      .join(', ');
    return parts || '---';
  }
  formatListAddress(beneficiario: BeneficiarioApiPayload): string {
    const parts = [
      beneficiario.logradouro,
      beneficiario.numero,
      beneficiario.bairro,
      beneficiario.municipio,
      beneficiario.uf,
      beneficiario.cep,
    ]
      .filter(Boolean)
      .join(', ');
    return parts || '---';
  }
  formatListAddressLinha1(beneficiario: BeneficiarioApiPayload): string {
    const parts = [beneficiario.logradouro, beneficiario.numero, beneficiario.bairro].filter(
      Boolean,
    );
    return parts.length ? parts.join(', ') : '---';
  }
  formatListAddressLinha2(beneficiario: BeneficiarioApiPayload): string | null {
    const parts = [beneficiario.municipio, beneficiario.uf, beneficiario.cep].filter(Boolean);
    return parts.length ? parts.join(', ') : null;
  }
  formatListPhone(beneficiario: BeneficiarioApiPayload): string {
    return beneficiario.telefone_principal || beneficiario.telefone_secundario || '---';
  }

  formatarDataNascimentoListagem(valor?: string | null): string {
    return formatarDataSemFuso(valor);
  }

  private formatarAceiteParaDateTimeLocal(valor?: string | null): string {
    if (!valor) return '';
    if (valor.includes('T')) return valor.slice(0, 16);
    return `${valor}T00:00`;
  }
  formatListAddressCompleto(beneficiario: BeneficiarioApiPayload): string {
    const linha1 = this.formatListAddressLinha1(beneficiario);
    const linha2 = this.formatListAddressLinha2(beneficiario);
    if (linha2) {
      return `${linha1} - ${linha2}`;
    }
    return linha1;
  }
  private joinParts(
    parts: (string | number | null | undefined)[],
    separator = ', ',
  ): string | null {
    const filtered = parts
      .filter((part) => this.hasValue(part))
      .map((part) => part?.toString().trim() ?? '')
      .filter((part) => part && part !== '---');
    if (!filtered.length) return null;
    return filtered.join(separator);
  }
  private hasValue(value: any): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'boolean') return value === true;
    return true;
  }
  private formatCurrencyValue(value: any): string | null {
    if (value === null || value === undefined || value === '') return null;
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return null;
    return numeric.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
  private formatCity(city?: string, uf?: string): string {
    if (!city && !uf) return '---';
    return [city, uf].filter(Boolean).join(' - ');
  }
  private formatBoolean(value?: boolean): string {
    return value ? 'Sim' : 'N??o';
  }
  formatDate(value?: string | null): string {
    return formatarDataSemFuso(value);
  }
  formatAge(value?: string | null): string {
    const age = this.getAgeFromDate(value ?? null);
    if (age === null) return '---';
    return `${age} anos`;
  }
  private getAgeFromDate(dateValue: string | null): number | null {
    if (!dateValue) return null;
    const birthDate = criarDataLocal(dateValue);
    if (!birthDate) return null;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    const dayDiff = today.getDate() - birthDate.getDate();
    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
      age--;
    }
    return Math.max(age, 0);
  }
  private normalizeSortString(value?: string | null): string {
    return (value ?? '').toString().toLowerCase().trim();
  }
  private normalizeSearchTerm(value?: string | null): string {
    const raw = (value ?? '').toString().toLowerCase().trim();
    if (!raw) return '';
    return raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }
  private normalizeDigits(value?: string | null): string {
    return (value ?? '').toString().replace(/\D+/g, '');
  }
  private normalizeCodeForComparison(value?: string | null): string {
    const digits = this.normalizeDigits(value);
    if (!digits) return '';
    const semZeros = digits.replace(/^0+/, '');
    return semZeros || '0';
  }
  private normalizeDateForFilter(value?: string | null): string {
    if (!value) return '';
    const raw = value.toString().trim();
    if (!raw) return '';
    if (raw.includes('T')) {
      return raw.split('T')[0] ?? '';
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
      return raw.slice(0, 10);
    }
    const parsed = new Date(raw);
    if (isNaN(parsed.getTime())) return '';
    return parsed.toISOString().slice(0, 10);
  }
  private sortBeneficiariesForPrint(a: BeneficiarioApiPayload, b: BeneficiarioApiPayload): number {
    if (this.printListOrder === 'code') {
      return this.normalizeSortString(a.codigo).localeCompare(this.normalizeSortString(b.codigo));
    }
    switch (this.printOrderBy) {
      case 'bairro':
        return this.normalizeSortString(a.bairro).localeCompare(this.normalizeSortString(b.bairro));
      case 'data_nascimento': {
        const aTime = new Date(a.data_nascimento ?? '').getTime();
        const bTime = new Date(b.data_nascimento ?? '').getTime();
        return (isNaN(aTime) ? Infinity : aTime) - (isNaN(bTime) ? Infinity : bTime);
      }
      case 'idade': {
        const ageA = this.getAgeFromDate(a.data_nascimento);
        const ageB = this.getAgeFromDate(b.data_nascimento);
        return (ageB ?? -1) - (ageA ?? -1);
      }
      case 'nome':
      default:
        return this.normalizeSortString(a.nome_completo || a.nome_social).localeCompare(
          this.normalizeSortString(b.nome_completo || b.nome_social),
        );
    }
  }
  changeTab(tab: string) {
    if (this.uploadingDocuments) {
      this.feedback = 'Aguarde o envio dos documentos antes de continuar.';
      return;
    }
    this.popupErros = [];
    this.activeTab = tab;
  }
  private validateCurrentTabRequirements(targetTab: string): boolean {
    if (targetTab === 'lista') {
      return true;
    }
    const currentIndex = this.activeTabIndex;
    const targetIndex = this.tabs.findIndex((item) => item.id === targetTab);
    if (targetIndex <= currentIndex) return true;
    const tabId = this.tabs[currentIndex]?.id;
    if (tabId === 'dados') {
      const builder = new PopupErrorBuilder();
      const requiredFields: { path: (string | number)[]; label: string }[] = [
        { path: ['dadosPessoais', 'nome_completo'], label: 'Nome completo' },
        { path: ['dadosPessoais', 'data_nascimento'], label: 'Data de nascimento' },
        { path: ['dadosPessoais', 'nome_mae'], label: 'Nome da mae' },
      ];
      requiredFields.forEach(({ path, label }) => {
        const control = this.form.get(path);
        const value = String(control?.value ?? '').trim();
        if (!value) {
          builder.adicionar(`${label} e obrigatorio.`);
        } else {
          this.changeTab('lista');
        }
      });
      const mensagens = builder.build();
      if (mensagens.length) {
        this.form.get('dadosPessoais')?.markAllAsTouched();
        this.popupErros = mensagens;
        return false;
      }
      this.popupErros = [];
    }
    const requirements: Record<
      string,
      { controlPath: (string | number)[]; message: string; markGroup?: string }
    > = {
      endereco: {
        controlPath: ['endereco', 'cep'],
        message: 'Preencha o CEP (campo obrigat??rio) antes de avan??ar.',
        markGroup: 'endereco',
      },
      contato: {
        controlPath: ['contato', 'telefone_principal'],
        message: 'Informe o telefone principal (campo obrigat??rio) antes de avan??ar.',
        markGroup: 'contato',
      },
      observacoes: {
        controlPath: ['observacoes', 'aceite_lgpd'],
        message: 'Confirme o aceite LGPD antes de avan??ar.',
        markGroup: 'observacoes',
      },
      documentos: {
        controlPath: ['documentos', 'cpf'],
        message: 'Informe um CPF valido antes de avancar.',
        markGroup: 'documentos',
      },
    };
    const requirement = tabId ? requirements[tabId] : undefined;
    if (!requirement) return true;
    const control = this.form.get(requirement.controlPath);
    if (control?.valid && this.popupErros.length) {
      this.popupErros = [];
    }
    if (!control || control.valid) return true;
    this.popupErros = [requirement.message];
    if (requirement.markGroup) {
      this.form.get(requirement.markGroup)?.markAllAsTouched();
    }
    return false;
  }
  async submit(skipValidation = false) {
    const missingDocuments = skipValidation ? [] : this.getMissingRequiredDocuments();
    const statusForSave = this.determineStatusForSave(skipValidation, missingDocuments);
    this.form.get('status')?.setValue(statusForSave);
    if (!skipValidation && missingDocuments.length) {
      this.feedback = `Envie os documentos obrigat??rios: ${missingDocuments.join(', ')}`;
      this.changeTab('documentos');
      return;
    }
    const fieldIssues = !skipValidation ? this.collectFieldIssues() : [];
    if (!skipValidation && fieldIssues.length) {
      this.form.markAllAsTouched();
      this.showMissingFieldsModal(fieldIssues);
      this.feedback =
        'Cadastro salvo como incompleto. Preencha os campos obrigat??rios para ativar.';
    }
    if (!skipValidation && this.form.invalid && !this.feedback) {
      this.form.markAllAsTouched();
      this.feedback =
        'Cadastro salvo como incompleto. Preencha os campos obrigat??rios para ativar.';
    }
    if (
      !skipValidation &&
      this.form.get('status')?.value === 'INCOMPLETO' &&
      statusForSave === 'INCOMPLETO'
    ) {
      this.feedback =
        this.feedback ??
        'Cadastro salvo como incompleto. Preencha os campos obrigat??rios para ativar.';
    }
    if (this.uploadingDocuments) {
      this.feedback = 'Aguarde o envio dos documentos antes de salvar o cadastro.';
      return;
    }
    if (
      this.form.get('status')?.value === 'BLOQUEADO' &&
      !this.form.get('motivo_bloqueio')?.value
    ) {
      this.feedback = 'Informe o motivo do bloqueio antes de salvar.';
      this.blockReasonModalOpen = true;
      return;
    }
    this.saving = true;
    try {
      const payload = await this.toPayload(statusForSave);
      const request = this.beneficiarioId
        ? this.service.update(this.beneficiarioId, payload)
        : this.service.create(payload);
      request.pipe(finalize(() => this.ngZone.run(() => (this.saving = false)))).subscribe({
        next: ({ beneficiario }) => {
          this.ngZone.run(() => {
            if (beneficiario) {
              const normalized = {
                ...this.normalizarCamposNome(beneficiario),
                codigo: this.normalizeBeneficiaryCode(beneficiario.codigo) || undefined,
              };
              this.selectedBeneficiary = normalized;
              this.beneficiarioId = normalized.id_beneficiario ?? this.beneficiarioId;
              this.ignoreStatusChange = true;
              this.form.patchValue(this.mapToForm(normalized));
              this.ignoreStatusChange = false;
              this.photoPreview = normalized.foto_3x4 ?? null;
              this.lastStatus = normalized.status ?? 'EM_ANALISE';
              this.previousStatusBeforeBlock = this.lastStatus;
              this.statusDirty = false;
              this.applyLoadedDocuments(this.getDocumentList(normalized));
              this.applyAutomaticStatusFromDates(normalized.status);
            } else {
              this.statusDirty = false;
            }
            this.feedback = null;
            this.searchBeneficiaries();
            this.changeTab('lista');
            this.popupTitulo = 'Sucesso';
            this.popupMensagens = new PopupErrorBuilder()
              .adicionar('Cadastro realizado com sucesso.')
              .build();
          });
        },
        error: (error: HttpErrorResponse) => {
          console.error('Erro ao salvar beneficiario', error);
          const serverMessage =
            typeof error?.error === 'string'
              ? error.error
              : error?.error?.message || error.message || 'Erro ao salvar beneficiario';
          if (error.status === 0) {
            this.feedback =
              'N??o foi poss??vel comunicar com a API. Verifique a conex??o e tente novamente.';
            return;
          }
          this.feedback = serverMessage;
        },
      });
    } catch (error) {
      console.error('Erro ao preparar salvamento', error);
      this.feedback = 'N??o foi poss??vel salvar o beneficiario. Tente novamente.';
      this.saving = false;
    }
  }
  private async toPayload(
    statusForSave: BeneficiarioApiPayload['status'],
  ): Promise<BeneficiarioApiPayload> {
    const value = this.form.value;
    const documentosObrigatorios = await this.buildDocumentPayload();
    const endereco = {
      ...(value.endereco as any),
      cep: this.normalizeCep(value.endereco?.cep as string),
    };
    const contato = {
      ...(value.contato as any),
      telefone_principal: this.normalizePhone(value.contato?.telefone_principal as string),
      telefone_secundario: this.normalizePhone(value.contato?.telefone_secundario as string),
      telefone_recado_numero: this.normalizePhone(value.contato?.telefone_recado_numero as string),
    };
    const documentos = {
      ...(value.documentos as any),
      cpf: this.normalizeCpf(value.documentos?.cpf as string),
    };
    const observacoes = { ...(value.observacoes as any) };
    const dataAceite = observacoes.data_aceite_lgpd as string | null | undefined;
    observacoes.data_aceite_lgpd = dataAceite ? dataAceite.split('T')[0] : null;
    return {
      codigo: this.beneficiaryCode || this.nextSequentialCode,
      status: statusForSave,
      motivo_bloqueio: value.motivo_bloqueio,
      foto_3x4: value.foto_3x4,
      ...(value.dadosPessoais as any),
      ...(endereco as any),
      ...(contato as any),
      ...(documentos as any),
      ...(value.familiar as any),
      ...(value.escolaridade as any),
      ...(value.saude as any),
      ...(value.beneficios as any),
      ...(observacoes as any),
      documentosObrigatorios,
    };
  }
  geocodificarEnderecoBeneficiario(forcar = false): void {
    if (!this.beneficiarioId) {
      this.feedback = 'Salve o beneficiario antes de geocodificar o endereco.';
      return;
    }
    this.feedback = null;
    this.service.geocodificarEndereco(String(this.beneficiarioId), forcar).subscribe({
      next: ({ beneficiario }) => {
        this.form
          .get('endereco')
          ?.patchValue({
            latitude: beneficiario.latitude ?? '',
            longitude: beneficiario.longitude ?? '',
          });
        this.feedback = 'Endere??o geocodificado com sucesso.';
      },
      error: (error) => {
        const serverMessage =
          typeof error?.error === 'string'
            ? error.error
            : error?.error?.message || 'N??o foi poss??vel geocodificar o endereco.';
        this.feedback = serverMessage;
      },
    });
  }
  private async buildDocumentPayload(): Promise<DocumentoObrigatorio[]> {
    const documents = this.anexos.controls.map(
      (control) => control.value as DocumentoObrigatorio & { file?: File | null },
    );
    return documents.map((doc) => {
      const file = doc.file as File | undefined;
      return {
        id: doc.id,
        nome: doc.nome,
        obrigatorio: doc.obrigatorio,
        nomeArquivo: file ? file.name : doc.nomeArquivo,
        conteudo: doc.conteudo,
        contentType: doc.contentType,
        caminhoArquivo: file ? undefined : doc.caminhoArquivo,
      } as DocumentoObrigatorio;
    });
  }
  private setupSentenceCaseFormatting(): void {
    this.sentenceCaseFields.forEach((path) => {
      const control = this.form.get(path);
      control?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((value) => {
        if (typeof value !== 'string') return;
        const formatted = this.toSentenceCase(value);
        if (formatted !== value) {
          control.setValue(formatted, { emitEvent: false });
        }
      });
    });
  }
  private setupEducationControls(): void {
    const literacyControl = this.form.get(['escolaridade', 'sabe_ler_escrever']);
    const levelControl = this.form.get(['escolaridade', 'nivel_escolaridade']);
    const setNoEducation = () => {
      if (!levelControl) return;
      if (!levelControl.value) {
        levelControl.setValue('Sem escolaridade formal', { emitEvent: false });
      }
      levelControl.enable({ emitEvent: false });
    };
    if (!literacyControl?.value) setNoEducation();
    literacyControl?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((canRead) => {
      levelControl?.enable({ emitEvent: false });
      if (!canRead) {
        setNoEducation();
      }
      levelControl?.markAsUntouched();
    });
  }
  private toSentenceCase(value: string): string {
    const normalized = value.toLowerCase();
    if (!normalized.trim()) return '';
    return normalized.replace(/(^|\s)([A-Za-zÀ-ÖØ-öø-ÿ])/g, (match) => match.toUpperCase());
  }

  private watchBirthDate(): void {
    const control = this.form.get(['dadosPessoais', 'data_nascimento']);
    control?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((value) => {
      this.calculateAge(value as string);
    });
  }
  private setupNationalityAutomation(): void {
    const nationalityControl = this.form.get(['dadosPessoais', 'nacionalidade']);
    const sexControl = this.form.get(['dadosPessoais', 'sexo_biologico']);
    nationalityControl?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      if (this.isUpdatingNationality) return;
      this.nationalityManuallyChanged = true;
    });
    sexControl?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((sex) => {
      this.applyNationalityDefault(sex as string | null);
    });
    this.applyNationalityDefault(sexControl?.value as string | null);
  }
  private applyNationalityDefault(sex: string | null | undefined): void {
    const nationalityControl = this.form.get(['dadosPessoais', 'nacionalidade']);
    if (!nationalityControl) return;
    if (this.nationalityManuallyChanged && nationalityControl.value) return;
    const suggested =
      sex === 'FEMININO'
        ? 'Brasileira'
        : sex === 'MASCULINO'
          ? 'Brasileiro'
          : nationalityControl.value || '';
    this.isUpdatingNationality = true;
    nationalityControl.setValue(suggested, { emitEvent: false });
    this.isUpdatingNationality = false;
  }
  private calculateAge(dateValue: string | null): void {
    this.beneficiaryAge = this.getAgeFromDate(dateValue);
  }
  private watchStatusChanges(): void {
    const control = this.form.get('status');
    this.lastStatus = control?.value ?? 'EM_ANALISE';
    control?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((status) => {
      if (this.ignoreStatusChange) {
        this.lastStatus = status ?? null;
        return;
      }
      const previous = this.lastStatus;
      this.lastStatus = status ?? null;
      this.statusDirty = !!this.beneficiarioId && status !== previous;
      if (status === 'BLOQUEADO') {
        this.previousStatusBeforeBlock = previous;
        this.blockReasonModalOpen = true;
        this.blockReasonError = null;
      } else {
        this.form.get('motivo_bloqueio')?.setValue('');
      }
    });
  }
  confirmBlockReason(): void {
    const reason = this.form.get('motivo_bloqueio')?.value as string | undefined;
    if (!reason?.trim()) {
      this.blockReasonError = 'Informe o motivo do bloqueio.';
      return;
    }
    this.blockReasonModalOpen = false;
    this.blockReasonError = null;
  }
  cancelBlockReason(): void {
    this.blockReasonModalOpen = false;
    this.blockReasonError = null;
    this.form.get('status')?.setValue(this.previousStatusBeforeBlock ?? 'EM_ANALISE');
    this.form.get('motivo_bloqueio')?.setValue('');
  }
  openQuickSearch(): void {
    this.quickSearchModalOpen = true;
    if (!this.beneficiarios.length && !this.listLoading) {
      this.searchBeneficiaries();
    }
  }
  closeQuickSearch(): void {
    this.quickSearchModalOpen = false;
  }
  closeForm(): void {
    this.router.navigate(['/']);
  }
  abrirProntuario(): void {
    const id = this.beneficiarioId || this.selectedBeneficiary?.id_beneficiario;
    if (!id) {
      return;
    }
    this.router.navigate(['/acompanhamento/prontu??rio', id]);
  }
  startNewBeneficiario(): void {
    this.beneficiarioId = null;
    this.photoPreview = null;
    this.applyBeneficiaryMetadata(null);
    this.selectedBeneficiary = null;
    this.beneficiaryCode = this.nextSequentialCode;
    this.lastStatus = 'EM_ANALISE';
    this.previousStatusBeforeBlock = 'EM_ANALISE';
    this.activeTab = 'dados';
    this.form.reset();
    this.form.patchValue({
      status: 'EM_ANALISE',
      motivo_bloqueio: '',
      foto_3x4: '',
      endereco: { usa_endereco_familia: true, zona: 'URBANA', subzona: '' },
      beneficios: { beneficios_recebidos: [] },
    });
    this.resetDocumentArray();
    this.refreshSequentialCode();
  }

  private refreshSequentialCode(): void {
    if (this.sequentialLoading) return;
    this.sequentialLoading = true;
    this.service
      .list()
      .pipe(finalize(() => (this.sequentialLoading = false)))
      .subscribe({
        next: ({ beneficiarios }: { beneficiarios?: BeneficiarioApiPayload[] }) => {
          this.applySequentialFromList(beneficiarios ?? []);
        },
        error: () => {
          this.beneficiaryService
            .list({})
            .pipe(finalize(() => (this.sequentialLoading = false)))
            .subscribe({
              next: ({ beneficiarios }: { beneficiarios?: BeneficiaryPayload[] }) => {
                const normalized = (beneficiarios ?? []).map((beneficiario) =>
                  this.mapBeneficiaryPayload(beneficiario),
                );
                this.applySequentialFromList(normalized);
              },
              error: () => {
                this.updateSequentialCode();
                if (!this.beneficiarioId) {
                  this.beneficiaryCode = this.nextSequentialCode;
                }
              },
            });
        },
      });
  }

  private applySequentialFromList(beneficiarios: BeneficiarioApiPayload[]): void {
    const numericCodes = (beneficiarios ?? [])
      .map((beneficiario) => this.extractNumericCode(beneficiario.codigo))
      .filter((value): value is number => value !== null);
    const highestCode = Math.max(0, ...numericCodes);
    this.nextSequentialCode = this.formatSequentialCode(highestCode + 1);
    if (!this.beneficiarioId) {
      this.beneficiaryCode = this.nextSequentialCode;
    }
  }
  togglePrintMenu(): void {
    this.printMenuOpen = !this.printMenuOpen;
  }
  closePrintMenu(): void {
    this.printMenuOpen = false;
  }
  @HostListener('document:keydown', ['$event'])
  handleGlobalKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Escape') return;
    if (this.printMenuOpen) this.closePrintMenu();
    if (this.printByNameOpen) this.closePrintByName();
    if (this.quickSearchModalOpen) this.closeQuickSearch();
    if (this.mapaModalOpen) this.fecharMapaEndereco();
    if (this.blockReasonModalOpen) this.cancelBlockReason();
    if (this.missingFieldsModalOpen) this.closeMissingFieldsModal();
    if (this.pdfErrorDialogOpen) this.closePdfErrorDialog();
  }
  openPrintByName(): void {
    this.printByNameQuery = '';
    this.printByNameOpen = true;
    this.closePrintMenu();
  }
  closePrintByName(): void {
    this.printByNameOpen = false;
    this.printByNameQuery = '';
  }
  get printByNameResults(): BeneficiarioApiPayload[] {
    const term = this.normalizeSearchTerm(this.printByNameQuery);
    if (!term) {
      return this.beneficiarios ?? [];
    }
    return (this.beneficiarios ?? []).filter((beneficiario) => {
      const nome = this.normalizeSearchTerm(
        beneficiario.nome_completo || beneficiario.nome_social || '',
      );
      return nome.includes(term);
    });
  }
  setPrintListOrder(order: PrintListOrder): void {
    this.printListOrder = order;
  }
  handlePrintSelection(option: 'list' | 'individual' | 'authorization'): void {
    switch (option) {
      case 'list':
        this.printBeneficiaryList();
        break;
      case 'individual':
        this.printIndividualRecord();
        break;
      case 'authorization':
        this.reimprimirTermoConsentimento();
        break;
    }
    this.closePrintMenu();
  }
  onPrint(): void {
    const opcoes = this.getPrintOptions();
    if (opcoes.length <= 1) {
      if (opcoes[0]) {
        this.handlePrintSelection(opcoes[0]);
      }
      return;
    }
    this.togglePrintMenu();
  }
  private getPrintOptions(): Array<'list' | 'individual' | 'authorization'> {
    return ['individual', 'authorization', 'list'];
  }
  onSave(): void {
    if (this.statusDirty && this.beneficiarioId && this.form.invalid) {
      this.submit(true);
      return;
    }
    this.submit();
  }
  onCancel(): void {
    this.startNewBeneficiario();
  }
  onDelete(): void {
    this.handleDeleteSelected();
  }
  onNew(): void {
    this.startNewBeneficiario();
  }
  onClose(): void {
    this.closeForm();
  }
  clearSearchFilters(): void {
    this.searchForm.reset({ nome: '', codigo: '', cpf: '', data_nascimento: '', status: '' });
    this.searchBeneficiaries();
  }
  searchBeneficiaries(): void {
    const { nome, cpf, codigo, data_nascimento, status } = this.searchForm.value;
    const codigoNormalizado = this.normalizeBeneficiaryCode(codigo) || codigo || undefined;
    this.listLoading = true;
    this.listError = null;
    this.service
      .list({
        nome: nome || undefined,
        cpf: cpf || undefined,
        codigo: codigoNormalizado,
        data_nascimento: data_nascimento || undefined,
        status: status || undefined,
      })
      .pipe(finalize(() => (this.listLoading = false)))
      .subscribe({
        next: ({ beneficiarios }: { beneficiarios?: BeneficiarioApiPayload[] }) => {
          this.handleBeneficiaryResponse(beneficiarios ?? []);
        },
        error: () => {
          this.loadBeneficiariesFromFallback({ nome, cpf, codigo, data_nascimento, status });
        },
      });
  }
  applyListFilters(): void {
    const { nome, cpf, codigo, data_nascimento, status } =
      this.searchForm.value;
    const nomeFiltro = this.normalizeSearchTerm(nome);
    const cpfFiltro = this.normalizeDigits(cpf);
    const codigoFiltro = this.normalizeCodeForComparison(codigo);
    const dataFiltro = this.normalizeDateForFilter(data_nascimento);
    this.filteredBeneficiarios = (this.beneficiarios ?? [])
      .filter((beneficiario) => {
        if (status && beneficiario.status !== status) return false;
        if (nomeFiltro) {
          const nomeBeneficiario = this.normalizeSearchTerm(
            beneficiario.nome_completo ||
              beneficiario.nome_social ||
              beneficiario.apelido ||
              '',
          );
          if (!nomeBeneficiario.includes(nomeFiltro)) return false;
        }
        if (cpfFiltro) {
          const cpfBeneficiario = this.normalizeDigits(beneficiario.cpf);
          if (cpfBeneficiario !== cpfFiltro) return false;
        }
        if (codigoFiltro) {
          const codigoBeneficiario = this.normalizeCodeForComparison(beneficiario.codigo);
          if (codigoBeneficiario !== codigoFiltro) return false;
        }
        if (dataFiltro) {
          const dataBeneficiario = this.normalizeDateForFilter(
            beneficiario.data_nascimento,
          );
          if (dataBeneficiario !== dataFiltro) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const nomeA = (a.nome_completo || a.nome_social || '').toString();
        const nomeB = (b.nome_completo || b.nome_social || '').toString();
        return nomeA.localeCompare(nomeB, 'pt-BR', { sensitivity: 'base' });
      });
    this.paginaAtual = 1;
  }
  onBeneficiarioSelected(beneficiario: BeneficiarioApiPayload): void {
    this.selectBeneficiario(beneficiario);
    this.changeTab('dados');
    this.quickSearchModalOpen = false;
  }
  selectBeneficiario(beneficiario: BeneficiarioApiPayload): void {
    if (!beneficiario.id_beneficiario) return;
    const beneficiarioNormalizado = this.normalizarCamposNome(beneficiario);
    this.selectedBeneficiary = {
      ...beneficiarioNormalizado,
      codigo: this.normalizeBeneficiaryCode(beneficiario.codigo) || undefined,
    };
    const beneficiarioId = beneficiarioNormalizado.id_beneficiario;
    if (!beneficiarioId) return;
    this.beneficiarioId = beneficiarioId;
    this.service.getById(beneficiarioId).subscribe(({ beneficiario: details }) => {
      const normalizedDetails = {
        ...this.normalizarCamposNome(details),
        codigo: this.normalizeBeneficiaryCode(details.codigo) || undefined,
      };
      this.selectedBeneficiary = normalizedDetails;
      this.ignoreStatusChange = true;
      this.form.patchValue(this.mapToForm(normalizedDetails));
      this.ignoreStatusChange = false;
      this.photoPreview = normalizedDetails.foto_3x4 ?? null;
      this.lastStatus = normalizedDetails.status ?? 'EM_ANALISE';
      this.previousStatusBeforeBlock = this.lastStatus;
      this.statusDirty = false;
      this.applyLoadedDocuments(this.getDocumentList(normalizedDetails));
      this.applyAutomaticStatusFromDates(normalizedDetails.status);
    });
  }
  private loadBeneficiariesFromFallback(filters: {
    nome?: string;
    cpf?: string;
    codigo?: string;
    data_nascimento?: string;
    status?: string;
  }): void {
    this.beneficiaryService
      .list({
        nome: filters.nome || undefined,
        cpf: filters.cpf || undefined,
        codigo: filters.codigo || undefined,
        data_nascimento: filters.data_nascimento || undefined,
      })
      .pipe(finalize(() => (this.listLoading = false)))
      .subscribe({
        next: ({ beneficiarios }: { beneficiarios?: BeneficiaryPayload[] }) => {
          const normalized = (beneficiarios ?? [])
            .map((beneficiario) => this.mapBeneficiaryPayload(beneficiario))
            .filter((beneficiario) => !filters.status || beneficiario.status === filters.status);
          this.handleBeneficiaryResponse(normalized);
        },
        error: () => {
          this.listError = 'N??o foi poss??vel carregar os beneficiarios. Tente novamente.';
        },
      });
  }
  private handleBeneficiaryResponse(beneficiarios: BeneficiarioApiPayload[]): void {
    const vistos = new Set<string>();
    const unicos = (beneficiarios ?? []).filter((beneficiario) => {
      const chave = this.getBeneficiarioChaveUnica(beneficiario);
      if (!chave) {
        return true;
      }
      if (vistos.has(chave)) {
        return false;
      }
      vistos.add(chave);
      return true;
    });
    this.beneficiarios = unicos.map((beneficiario) => ({
      ...this.normalizarCamposNome(beneficiario),
      codigo: this.normalizeBeneficiaryCode(beneficiario.codigo) || undefined,
      status: (beneficiario.status as BeneficiarioApiPayload['status']) || 'EM_ANALISE',
    }));
    this.selectedBeneficiary = null;
    this.applyListFilters();
    if (!this.hasActiveSearchFilters()) {
      this.updateSequentialCode();
      if (!this.beneficiarioId) {
        this.beneficiaryCode = this.nextSequentialCode;
      }
    }
  }
  private hasActiveSearchFilters(): boolean {
    const { nome, cpf, codigo, data_nascimento, status } = this.searchForm.value ?? {};
    return !!(nome || cpf || codigo || data_nascimento || status);
  }
  private getBeneficiarioChaveUnica(beneficiario: BeneficiarioApiPayload): string {
    const codigo = this.normalizeCodeForComparison(beneficiario.codigo);
    if (codigo) return `codigo:${codigo}`;
    const cpf = this.normalizeDigits(beneficiario.cpf);
    if (cpf) return `cpf:${cpf}`;
    if (beneficiario.id_beneficiario) return `id:${beneficiario.id_beneficiario}`;
    const nome = this.normalizeSearchTerm(
      (beneficiario.nome_completo || beneficiario.nome_social || '').toString().trim(),
    );
    return nome ? `nome:${nome}` : '';
  }
  private mapBeneficiaryPayload(beneficiary: BeneficiaryPayload): BeneficiarioApiPayload {
    const codigoPayload = (beneficiary as any).codigo_beneficiario ?? (beneficiary as any).codigoBeneficiario ?? beneficiary.codigo;
    const nomeCompletoPayload = (beneficiary as any).nome_completo ?? beneficiary.nomeCompleto;
    const nomeMaePayload = (beneficiary as any).nome_mae ?? beneficiary.nomeMae;
    const dataNascimentoPayload = (beneficiary as any).data_nascimento ?? beneficiary.dataNascimento;
    const statusPayload = (beneficiary as any).status;
    return {
      id_beneficiario: beneficiary.id ? String(beneficiary.id) : undefined,
      codigo: codigoPayload,
      nome_completo: this.normalizarTextoNome(nomeCompletoPayload),
      nome_mae: this.normalizarTextoNome(nomeMaePayload ?? ''),
      data_nascimento: dataNascimentoPayload,
      cpf: beneficiary.cpf ?? (beneficiary as any).cpf ?? beneficiary.documentos ?? null,
      status: (statusPayload as BeneficiarioApiPayload['status']) || 'EM_ANALISE',
    };
  }
  buscarBeneficiariosNaListagem(): void {
    this.changeTab('lista');
    this.searchBeneficiaries();
  }
  onBuscarEnter(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.listLoading) return;
    this.buscarBeneficiariosNaListagem();
  }
  deleteBeneficiario(beneficiario: BeneficiarioApiPayload): void {
    const beneficiarioId = beneficiario.id_beneficiario;
    if (!beneficiarioId) return;
    this.abrirDialogoConfirmacao(
      'Excluir beneficiario',
      `Deseja excluir o beneficiario ${beneficiario.nome_completo || 'selecionado'}? Esta acao nao pode ser desfeita.`,
      'Excluir',
      () => {
        this.listLoading = true;
        this.service.delete(beneficiarioId).subscribe({
          next: () => {
            if (this.beneficiarioId === beneficiarioId) {
              this.form.reset({
                status: 'EM_ANALISE',
                motivo_bloqueio: '',
                foto_3x4: '',
                endereco: { zona: 'URBANA', subzona: '' },
              });
              this.beneficiarioId = null;
              this.photoPreview = null;
              this.applyBeneficiaryMetadata(null);
              this.beneficiaryCode = null;
              this.selectedBeneficiary = null;
            }
            this.searchBeneficiaries();
          },
          error: () => {
            this.listError = 'Nao foi possivel excluir o beneficiario.';
            this.listLoading = false;
          },
        });
      },
    );
  }
  handleEditSelected(): void {
    if (this.selectedBeneficiary?.id_beneficiario) {
      this.editBeneficiario(this.selectedBeneficiary);
    }
  }
  handleDeleteSelected(): void {
    if (this.selectedBeneficiary?.id_beneficiario) {
      this.deleteBeneficiario(this.selectedBeneficiary);
    }
  }
  abrirDialogoConfirmacao(
    titulo: string,
    mensagem: string,
    confirmarLabel: string,
    acao: () => void,
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
  handleAlterSelected(): void {
    if (this.selectedBeneficiary?.id_beneficiario) {
      this.selectBeneficiario(this.selectedBeneficiary);
      this.changeTab('dados');
    }
  }
  selecionarBeneficiarioNaLista(beneficiario: BeneficiarioApiPayload): void {
    this.selectBeneficiario(beneficiario);
    this.changeTab('dados');
  }
  editBeneficiario(beneficiario: BeneficiarioApiPayload): void {
    if (!beneficiario.id_beneficiario) return;
    this.router.navigate(['/cadastros/beneficiarios', beneficiario.id_beneficiario]);
  }
  async startCamera(): Promise<void> {
    this.captureError = null;
    if (!(navigator && navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) {
      this.captureError = 'Seu navegador n??o permite capturar a c??mera.';
      return;
    }
    try {
      this.cameraActive = true;
      await new Promise((resolve) => setTimeout(resolve, 0));
      this.videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
      const video = this.videoElement?.nativeElement;
      if (video) {
        video.srcObject = this.videoStream;
        await video.play();
      }
    } catch (error) {
      console.error('Erro ao iniciar c??mera', error);
      this.captureError = 'N??o foi poss??vel acessar a c??mera.';
      this.cameraActive = false;
      if (this.videoStream) {
        this.videoStream.getTracks().forEach((track) => track.stop());
        this.videoStream = undefined;
      }
    }
  }
  async handleCameraCapture(documentName?: string): Promise<void> {
    if (this.cameraActive) {
      this.capturePhoto(documentName);
      return;
    }
    this.pendingDocumentCaptureName = documentName ?? null;
    await this.startCamera();
  }
  capturePhoto(documentName?: string): void {
    const video = this.videoElement?.nativeElement;
    const canvas = this.canvasElement?.nativeElement;
    if (!video || !canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    canvas.width = 480;
    canvas.height = 640;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/png');
    if (documentName) {
      this.applyCapturedDocumentContent(documentName, dataUrl);
    } else {
      this.setPhotoPreview(dataUrl);
    }
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
    this.pendingDocumentCaptureName = null;
  }
  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      this.ngZone.run(() => {
        this.setPhotoPreview(dataUrl);
        input.value = '';
      });
    };
    reader.readAsDataURL(file);
  }
  removePhoto(): void {
    this.photoPreview = null;
    this.form.get('foto_3x4')?.reset();
  }
  private setPhotoPreview(dataUrl: string): void {
    this.ngZone.run(() => {
      this.photoPreview = dataUrl;
      this.form.get('foto_3x4')?.setValue(dataUrl);
    });
  }
  onCpfInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 11);
    const formatted = this.formatCpf(digits);
    this.form.get(['documentos', 'cpf'])?.setValue(formatted, { emitEvent: false });
    input.value = formatted;
    if (
      this.feedback === 'Informe um CPF v??lido antes de continuar.' &&
      this.form.get(['documentos', 'cpf'])?.valid
    ) {
      this.feedback = null;
    }
  }
  onPhoneInput(
    event: Event,
    controlName: 'telefone_principal' | 'telefone_secundario' | 'telefone_recado_numero',
  ): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 11);
    const formatted = this.formatPhoneValue(digits);
    this.form.get(['contato', controlName])?.setValue(formatted, { emitEvent: false });
    input.value = formatted;
  }
  private formatPhoneValue(value?: string | null): string {
    const digits = (value ?? '').replace(/\D/g, '').slice(0, 11);
    if (!digits) return '';
    const hasNineDigits = digits.length > 10;
    const part1 = digits.slice(0, 2);
    const part2 = digits.slice(2, hasNineDigits ? 7 : 6);
    const part3 = digits.slice(hasNineDigits ? 7 : 6, hasNineDigits ? 11 : 10);
    return part3 ? `(${part1}) ${part2}-${part3}` : part2 ? `(${part1}) ${part2}` : `(${part1}`;
  }
  private normalizePhone(value?: string | null): string | undefined {
    const digits = (value ?? '').replace(/\D/g, '');
    return digits || undefined;
  }
  openWhatsapp(controlName: PhoneControlName): void {
    const digits = this.getPhoneDigits(controlName);
    if (!digits) {
      this.showTemporaryFeedback('Informe um telefone v??lido para abrir o WhatsApp.');
      return;
    }
    window.open(`https://wa.me/${digits}`, '_blank');
  }
  startCall(controlName: PhoneControlName): void {
    const digits = this.getPhoneDigits(controlName);
    if (!digits) {
      this.showTemporaryFeedback('Informe um telefone v??lido para iniciar a liga????o.');
      return;
    }
    window.open(`tel:${digits}`, '_self');
  }
  sendSms(controlName: PhoneControlName): void {
    const digits = this.getPhoneDigits(controlName);
    if (!digits) {
      this.showTemporaryFeedback('Informe um telefone v??lido para enviar SMS.');
      return;
    }
    window.open(`sms:${digits}`, '_self');
  }
  openEmailClient(): void {
    const email = this.form.get(['contato', 'email'])?.value as string | undefined;
    if (!email) {
      this.showTemporaryFeedback('Informe um e-mail para abrir o cliente de mensagens.');
      return;
    }
    window.open(`mailto:${email}`);
  }
  hasPhoneValue(controlName: PhoneControlName): boolean {
    return !!this.getPhoneDigits(controlName);
  }
  private getPhoneDigits(controlName: PhoneControlName): string | null {
    const value = this.form.get(['contato', controlName])?.value as string | undefined;
    const normalized = this.normalizePhone(value);
    return normalized || null;
  }
  private formatCpf(value?: string | null): string {
    const digits = (value ?? '').replace(/\D/g, '').slice(0, 11);
    if (!digits) return '';
    const part1 = digits.slice(0, 3);
    const part2 = digits.slice(3, 6);
    const part3 = digits.slice(6, 9);
    const part4 = digits.slice(9, 11);
    return [part1, part2, part3].filter(Boolean).join('.') + (part4 ? `-${part4}` : '');
  }
  private normalizeCpf(value?: string | null): string | undefined {
    const digits = (value ?? '').replace(/\D/g, '');
    return digits || undefined;
  }
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
      this.cepLookupError = cepControl.value
        ? 'Informe um CEP v??lido para consultar o endereco.'
        : null;
      return;
    }
    const digits = this.normalizeCep(cepControl.value as string);
    if (digits?.length === 8) {
      this.lookupAddressByCep(digits);
    }
  }
  abrirMapaEndereco(): void {
    const coordenadas = this.obterCoordenadasEndereco();
    if (coordenadas) {
      this.definirMapaEndereco(coordenadas);
      return;
    }
    const consulta = this.montarConsultaEndereco();
    if (!consulta) {
      this.showTemporaryFeedback('Informe o endereco completo para consultar no Google Maps.');
      return;
    }
    this.definirMapaEndereco(consulta);
  }
  fecharMapaEndereco(): void {
    this.mapaModalOpen = false;
    this.mapaEnderecoUrl = null;
    this.mapaEnderecoLink = '';
  }
  private obterCoordenadasEndereco(): string | null {
    const latitude = (
      this.form.get(['endereco', 'latitude'])?.value as string | null | undefined
    )?.trim();
    const longitude = (
      this.form.get(['endereco', 'longitude'])?.value as string | null | undefined
    )?.trim();
    if (!latitude || !longitude) {
      return null;
    }
    return `${latitude},${longitude}`;
  }
  private montarConsultaEndereco(): string | null {
    const endereco = this.form.get('endereco')?.value as
      | {
          logradouro?: string | null;
          numero?: string | null;
          bairro?: string | null;
          municipio?: string | null;
          uf?: string | null;
          cep?: string | null;
        }
      | null
      | undefined;
    if (!endereco) {
      return null;
    }
    const partes = [
      endereco.logradouro,
      endereco.numero,
      endereco.bairro,
      endereco.municipio,
      endereco.uf,
      endereco.cep,
    ]
      .map((valor) => (valor ?? '').toString().trim())
      .filter((valor) => valor);
    return partes.length ? partes.join(', ') : null;
  }
  private definirMapaEndereco(consulta: string): void {
    const query = encodeURIComponent(consulta);
    const link = `https://www.google.com/maps?q=${query}`;
    this.mapaEnderecoLink = link;
    this.mapaEnderecoUrl = this.sanitizer.bypassSecurityTrustResourceUrl(`${link}&output=embed`);
    this.mapaModalOpen = true;
  }
  private lookupAddressByCep(cep: string): void {
    this.cepLookupError = null;
    this.http
      .get<ViaCepResponse>(`https://viacep.com.br/ws/${cep}/json/`)
      .pipe(finalize(() => this.form.get(['endereco', 'cep'])?.markAsTouched()))
      .subscribe({
        next: (response) => {
          if (response?.erro) {
            this.cepLookupError = 'CEP n??o encontrado.';
            return;
          }
          this.form
            .get('endereco')
            ?.patchValue({
              logradouro: response.logradouro ?? '',
              bairro: response.bairro ?? '',
              municipio: response.localidade ?? '',
              uf: response.uf ?? '',
            });
        },
        error: () => {
          this.cepLookupError = 'N??o foi poss??vel consultar o CEP.';
        },
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
  private cpfValidator = (control: AbstractControl): ValidationErrors | null => {
    const value = (control.value as string | null | undefined)?.replace(/\D/g, '') ?? '';
    if (!value || value.length !== 11 || /^([0-9])\1*$/.test(value)) {
      return { cpf: true };
    }
    const calculateDigit = (slice: number) => {
      const numbers = value.slice(0, slice).split('').map(Number);
      const factorStart = slice + 1;
      const sum = numbers.reduce((acc, num, index) => acc + num * (factorStart - index), 0);
      const remainder = (sum * 10) % 11;
      return remainder === 10 ? 0 : remainder;
    };
    const digit1 = calculateDigit(9);
    const digit2 = calculateDigit(10);
    return digit1 === Number(value[9]) && digit2 === Number(value[10]) ? null : { cpf: true };
  };
  private cepValidator = (control: AbstractControl): ValidationErrors | null => {
    const value = (control.value as string | null | undefined)?.replace(/\D/g, '') ?? '';
    if (!value) return null;
    return value.length === 8 ? null : { cep: true };
  };
  formatStatusLabel(status?: string | null): string {
    if (!status) return '???';
    return status
      .toLowerCase()
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }
  getStatusClass(status?: string | null): string {
    switch (status) {
      case 'ATIVO':
        return 'pill--status pill--status-ativo';
      case 'INATIVO':
        return 'pill--status pill--status-inativo';
      case 'DESATUALIZADO':
        return 'pill--status pill--status-desatualizado';
      case 'BLOQUEADO':
        return 'pill--status pill--status-bloqueado';
      case 'INCOMPLETO':
        return 'pill--status pill--status-incompleto';
      case 'EM_ANALISE':
        return 'pill--status pill--status-analise';
      default:
        return 'pill--status';
    }
  }
}



