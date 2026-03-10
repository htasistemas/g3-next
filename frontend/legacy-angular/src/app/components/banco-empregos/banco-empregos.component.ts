import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { PopupErrorBuilder } from '../../utils/popup-error.builder';
import { titleCaseWords } from '../../utils/capitalization.util';
import { Subject, catchError, debounceTime, distinctUntilChanged, of, takeUntil } from 'rxjs';
import { BeneficiarioApiPayload, BeneficiarioApiService } from '../../services/beneficiario-api.service';
import { TelaPadraoComponent } from '../compartilhado/tela-padrao/tela-padrao.component';
import { PopupMessagesComponent } from '../compartilhado/popup-messages/popup-messages.component';
import { DialogComponent } from '../compartilhado/dialog/dialog.component';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faBriefcase } from '@fortawesome/free-solid-svg-icons';
import { ConfigAcoesCrud, EstadoAcoesCrud, TelaBaseComponent } from '../compartilhado/tela-base.component';
import {
  BancoEmpregosService,
  JobCandidato,
  JobEncaminhamento,
  JobPayload,
  JobRecord,
  JobStatus
} from '../../services/banco-empregos.service';

@Component({
  selector: 'app-banco-empregos',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    TelaPadraoComponent,
    PopupMessagesComponent,
    DialogComponent,
    FontAwesomeModule
  ],
  templateUrl: './banco-empregos.component.html',
  styleUrl: './banco-empregos.component.scss'
})
export class BancoEmpregosComponent extends TelaBaseComponent implements OnInit, OnDestroy {
  readonly acoesToolbar: Required<ConfigAcoesCrud> = this.criarConfigAcoes({    
    salvar: true,
    excluir: true,
    novo: true,
    cancelar: true,
    imprimir: true,
    buscar: true
  });

  readonly faBriefcase = faBriefcase;

  readonly tabs = [
    { id: 'dadosVaga', label: 'Dados da Vaga' },
    { id: 'empresaLocal', label: 'Empresa e Local' },
    { id: 'requisitos', label: 'Requisitos e Descrição' },
    { id: 'encaminhamentos', label: 'Encaminhamentos' },
    { id: 'candidatos', label: 'Candidatos da Vaga' },
    { id: 'listagemVagas', label: 'Listagem de Vagas' }
  ] as const;

  activeTab: (typeof this.tabs)[number]['id'] = 'dadosVaga';
  popupErros: string[] = [];
  popupTitulo = 'Campos obrigatorios';
  private popupTimeout?: ReturnType<typeof setTimeout>;
  dialogConfirmacaoAberta = false;
  dialogTitulo = 'Confirmar acao';
  dialogMensagem = 'Deseja continuar?';
  dialogConfirmarLabel = 'Confirmar';
  dialogCancelarLabel = 'Cancelar';
  private dialogAcao?: () => void;
  saving = false;
  listLoading = false;
  deletingId: string | null = null;
  form: FormGroup;
  encaminhamentoForm: FormGroup;
  formularioCandidato: FormGroup;
  encaminhamentos: JobEncaminhamento[] = [];
  candidatos: JobCandidato[] = [];
  candidatosFiltrados: JobCandidato[] = [];
  records: JobRecord[] = [];
  filteredRecords: JobRecord[] = [];
  selectedJobId: string | null = null;
  beneficiarios: BeneficiarioApiPayload[] = [];
  beneficiarioPesquisa = new FormControl('');
  beneficiarioSelecionado: BeneficiarioApiPayload | null = null;
  pesquisaCandidato = new FormControl('');
  candidatoSelecionado: BeneficiarioApiPayload | null = null;
  resultadosCandidatos: BeneficiarioApiPayload[] = [];
  buscandoCandidatos = false;
  candidatoErro: string | null = null;
  filtroCandidatoNome = new FormControl('');
  filtroCandidatoStatus = new FormControl<'todos' | string>('todos');
  filtroCandidatoData = new FormControl('');
  curriculoNome: string | null = null;
  curriculoTipo: string | null = null;
  curriculoConteudo: string | null = null;
  buscandoBeneficiarios = false;
  beneficiarioErro: string | null = null;
  cnpjErro: string | null = null;
  listSearch = new FormControl('');
  statusFilter = new FormControl<'todos' | JobStatus>('todos');
  private readonly destroy$ = new Subject<void>();
  private readonly today = new Date().toISOString().substring(0, 10);

  constructor(
    private readonly fb: FormBuilder,
    private readonly router: Router,
    private readonly service: BancoEmpregosService,
    private readonly beneficiarioService: BeneficiarioApiService
  ) {
    super();
    this.form = this.fb.group({
      dadosVaga: this.fb.group({
        titulo: ['', Validators.required],
        status: ['Aberta', Validators.required],
        dataAbertura: ['', Validators.required],
        dataEncerramento: [''],
        tipoContrato: [''],
        cargaHoraria: [''],
        salario: ['']
      }),
      empresaLocal: this.fb.group({
        nomeEmpresa: ['', Validators.required],
        cnpj: [''],
        cidade: ['', Validators.required],
        endereco: [''],
        bairro: ['']
      }),
      requisitos: this.fb.group({
        requisitos: [''],
        descricao: ['', Validators.required],
        observacoes: ['']
      })
    });

    this.encaminhamentoForm = this.fb.group({
      beneficiarioId: ['', Validators.required],
      beneficiarioNome: ['', Validators.required],
      data: [this.today, Validators.required],
      status: ['Aguardando contato', Validators.required],
      observacoes: ['']
    });

    this.formularioCandidato = this.fb.group({
      beneficiarioId: ['', Validators.required],
      beneficiarioNome: ['', Validators.required],
      necessidadesProfissionais: ['', Validators.required],
      status: ['EM_ANALISE', Validators.required],
      curriculoNome: [''],
      curriculoTipo: [''],
      curriculoConteudo: ['']
    });
  }

  ngOnInit(): void {
    this.loadRecords();
    this.setupBeneficiaryLookup();
    this.configurarBuscaCandidato();
    this.setupFilters();
    this.configurarFiltrosCandidatos();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get acoesDesabilitadas(): EstadoAcoesCrud {
    return {
      salvar: this.saving,
      excluir: this.saving || !this.selectedJobId,
      novo: this.saving,
      cancelar: this.saving,
      imprimir: false,
      buscar: false
    };
  }

  get activeTabIndex(): number {
    return this.tabs.findIndex((tab) => tab.id === this.activeTab);
  }

  changeTab(tabId: (typeof this.tabs)[number]['id']): void {
    this.activeTab = tabId;
  }

  startNew(): void {
    this.form.reset({
      dadosVaga: { status: 'Aberta', dataAbertura: this.today },
      empresaLocal: {},
      requisitos: {}
    });
    this.popupErros = [];

    this.activeTab = 'dadosVaga';
    this.selectedJobId = null;
    this.encaminhamentos = [];
    this.candidatos = [];
    this.candidatosFiltrados = [];
    this.encaminhamentoForm.reset({
      beneficiarioId: '',
      beneficiarioNome: '',
      data: this.today,
      status: 'Aguardando contato',
      observacoes: ''
    });
    this.resetarFormularioCandidato();
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.popupTitulo = 'Campos obrigatorios';
      this.popupErros = new PopupErrorBuilder()
        .adicionar('Preencha os campos obrigatorios para salvar a vaga.')
        .build();
      this.abrirPopupTemporario();
      return;
    }
    if (!this.validarCnpjEmpresa()) {
      return;
    }

    const payloadBase = this.form.getRawValue() as JobPayload;
    const payload = this.aplicarCapitalizacaoPayload(payloadBase);
    const payloadFinal: JobPayload = {
      ...payload,
      encaminhamentos: this.encaminhamentos
    };

    this.saving = true;
    const request$ = this.selectedJobId
      ? this.service.update(this.selectedJobId, payloadFinal)
      : this.service.create(payloadFinal);

    request$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (record: JobRecord) => {
          this.selectedJobId = record.id;
          this.mostrarPopup('Sucesso', ['Dados da vaga salvos com sucesso.']);
          this.carregarCandidatos(record.id);
          this.applyFilters();
        },
        error: () => {
          this.popupTitulo = 'Erro';
          this.popupErros = new PopupErrorBuilder()
            .adicionar('Nao foi possivel salvar a vaga no momento.')
            .build();
          this.abrirPopupTemporario();
        }
      })
      .add(() => (this.saving = false));
  }

  cancel(): void {
    if (this.selectedJobId) {
      const record = this.records.find((item) => item.id === this.selectedJobId);
      if (record) {
        this.populateForm(record);
        return;
      }
    }
    this.startNew();
  }

  close(): void {
    this.router.navigate(['/atendimentos/banco-empregos']);
  }

  print(): void {
    window.print();
  }

  addEncaminhamento(): void {
    if (this.encaminhamentoForm.invalid) {
      this.encaminhamentoForm.markAllAsTouched();
      this.popupTitulo = 'Campos obrigatorios';
      this.popupErros = new PopupErrorBuilder()
        .adicionar('Preencha os campos obrigatorios do encaminhamento.')
        .build();
      this.abrirPopupTemporario();
      return;
    }

    const { beneficiarioId, beneficiarioNome, data, status, observacoes } = this.encaminhamentoForm.getRawValue();

    const novoEncaminhamento: JobEncaminhamento = {
      id: this.generateId(),
      beneficiarioId: beneficiarioId ?? '',
      beneficiarioNome: beneficiarioNome ?? '',
      data: data ?? this.today,
      status: status ?? 'Aguardando contato',
      observacoes: observacoes ?? ''
    };

    this.encaminhamentos = [novoEncaminhamento, ...this.encaminhamentos];
    this.encaminhamentoForm.patchValue({
      data: this.today,
      status: 'Aguardando contato',
      observacoes: ''
    });
  }

  removeEncaminhamento(id: string): void {
    this.encaminhamentos = this.encaminhamentos.filter((item) => item.id !== id);
  }

  selectBeneficiario(beneficiario: BeneficiarioApiPayload): void {
    const id = beneficiario.id_beneficiario ?? beneficiario.codigo ?? beneficiario.cpf ?? '';
    const nome = beneficiario.nome_completo ?? beneficiario.nome_social ?? 'Beneficiário sem nome';
    this.beneficiarioSelecionado = beneficiario;
    this.encaminhamentoForm.patchValue({ beneficiarioId: id, beneficiarioNome: nome });
  }

  selecionarCandidato(beneficiario: BeneficiarioApiPayload): void {
    const id = beneficiario.id_beneficiario ?? beneficiario.codigo ?? beneficiario.cpf ?? '';
    const nome = beneficiario.nome_completo ?? beneficiario.nome_social ?? 'Beneficiário sem nome';
    this.candidatoSelecionado = beneficiario;
    this.formularioCandidato.patchValue({ beneficiarioId: id, beneficiarioNome: nome });
  }

  editRecord(record: JobRecord): void {
    this.populateForm(record);
    this.activeTab = 'dadosVaga';
    this.carregarCandidatos(record.id);
  }

  deleteRecord(record: JobRecord): void {
    this.abrirDialogoConfirmacao(
      'Excluir vaga',
      'Deseja excluir esta vaga? Esta acao nao pode ser desfeita.',
      'Excluir',
      () => this.confirmarExclusao(record.id)
    );
  }

  private populateForm(record: JobRecord): void {
    this.selectedJobId = record.id;
    this.encaminhamentos = [...(record.encaminhamentos ?? [])];
    this.form.patchValue({
      dadosVaga: record.dadosVaga,
      empresaLocal: record.empresaLocal,
      requisitos: record.requisitos
    });
  }

  private loadRecords(): void {
    this.listLoading = true;
    this.service
      .list()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (records) => {
          this.records = records;
          this.applyFilters();
        },
        error: () => {
          this.popupTitulo = 'Erro';
          this.popupErros = new PopupErrorBuilder()
            .adicionar('Nao foi possivel carregar a listagem de vagas.')
            .build();
          this.abrirPopupTemporario();
        }
      })
      .add(() => (this.listLoading = false));
  }

  private setupFilters(): void {
    this.listSearch.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => this.applyFilters());
    this.statusFilter.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => this.applyFilters());
  }

  private applyFilters(): void {
    const term = (this.listSearch.value ?? '').toString().toLowerCase().trim(); 
    const status = this.statusFilter.value ?? 'todos';

    this.filteredRecords = this.records.filter((record) => {
      const matchesTerm = term
        ? [
            record.dadosVaga?.titulo,
            record.empresaLocal?.nomeEmpresa,
            record.empresaLocal?.cidade,
            record.requisitos?.descricao
          ]
            .filter(Boolean)
            .some((field) => field!.toString().toLowerCase().includes(term))
        : true;

      const matchesStatus = status === 'todos' ? true : record.dadosVaga?.status === status;
      return matchesTerm && matchesStatus;
    });
  }

  onBuscar(): void {
    this.applyFilters();
  }

  onLimparListagem(): void {
    this.listSearch.setValue('');
    this.statusFilter.setValue('todos');
    this.applyFilters();
  }

  private setupBeneficiaryLookup(): void {
    this.beneficiarioPesquisa.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((value) => this.buscarBeneficiarios(value ?? ''));
  }

  private configurarBuscaCandidato(): void {
    this.pesquisaCandidato.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((value) => this.buscarCandidatos(value ?? ''));
  }

  private buscarBeneficiarios(term: string): void {
    const query = term.trim();
    this.beneficiarioErro = null;

    if (!query) {
      this.beneficiarios = [];
      this.beneficiarioSelecionado = null;
      return;
    }

    this.buscandoBeneficiarios = true;
    this.beneficiarioService
      .list({ nome: query })
      .pipe(
        catchError(() => {
          this.beneficiarioErro = 'Nao foi possivel buscar beneficiarios no momento.';
          return of({ beneficiarios: [] });
        }),
        takeUntil(this.destroy$)
      )
      .subscribe((response: { beneficiarios?: BeneficiarioApiPayload[] }) => {
        this.beneficiarios = response.beneficiarios ?? [];
        this.buscandoBeneficiarios = false;
      });
  }

  private buscarCandidatos(term: string): void {
    const query = term.trim();
    this.candidatoErro = null;

    if (!query) {
      this.resultadosCandidatos = [];
      this.candidatoSelecionado = null;
      return;
    }

    this.buscandoCandidatos = true;
    this.beneficiarioService
      .list({ nome: query })
      .pipe(
        catchError(() => {
          this.candidatoErro = 'Nao foi possivel buscar beneficiarios no momento.';
          return of({ beneficiarios: [] });
        }),
        takeUntil(this.destroy$)
      )
      .subscribe((response: { beneficiarios?: BeneficiarioApiPayload[] }) => {
        this.resultadosCandidatos = response.beneficiarios ?? [];
        this.buscandoCandidatos = false;
      });
  }

  private generateId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }

    return `enc-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  }

  adicionarCandidato(): void {
    if (!this.selectedJobId) {
      this.popupTitulo = 'Campos obrigatorios';
      this.popupErros = new PopupErrorBuilder()
        .adicionar('Salve a vaga antes de cadastrar candidatos.')
        .build();
      this.abrirPopupTemporario();
      return;
    }
    if (this.formularioCandidato.invalid) {
      this.formularioCandidato.markAllAsTouched();
      this.popupTitulo = 'Campos obrigatorios';
      this.popupErros = new PopupErrorBuilder()
        .adicionar('Preencha os campos obrigatorios do candidato.')
        .build();
      this.abrirPopupTemporario();
      return;
    }

    if (!this.curriculoConteudo) {
      this.popupTitulo = 'Campos obrigatorios';
      this.popupErros = new PopupErrorBuilder()
        .adicionar('Anexe o curriculo do candidato antes de salvar.')
        .build();
      this.abrirPopupTemporario();
      return;
    }

    const payload = this.formularioCandidato.getRawValue();
    this.saving = true;
    this.service
      .criarCandidato(this.selectedJobId, {
        beneficiarioId: payload.beneficiarioId,
        beneficiarioNome: payload.beneficiarioNome,
        necessidadesProfissionais: payload.necessidadesProfissionais,
        status: payload.status,
        curriculoNome: this.curriculoNome,
        curriculoTipo: this.curriculoTipo,
        curriculoConteudo: this.curriculoConteudo
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (candidato) => {
          this.candidatos = [candidato, ...this.candidatos];
          this.aplicarFiltrosCandidatos();
          this.resetarFormularioCandidato();
        },
        error: () => {
          this.popupTitulo = 'Erro';
          this.popupErros = new PopupErrorBuilder()
            .adicionar('Nao foi possivel cadastrar o candidato.')
            .build();
          this.abrirPopupTemporario();
        }
      })
      .add(() => (this.saving = false));
  }

  removerCandidato(id: string): void {
    this.service
      .removerCandidato(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.candidatos = this.candidatos.filter((item) => item.id !== id);
          this.aplicarFiltrosCandidatos();
        },
        error: () => {
          this.popupTitulo = 'Erro';
          this.popupErros = new PopupErrorBuilder()
            .adicionar('Nao foi possivel remover o candidato.')
            .build();
          this.abrirPopupTemporario();
        }
      });
  }

  onCurriculoSelecionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const arquivo = input.files?.[0];
    if (!arquivo) {
      this.curriculoNome = null;
      this.curriculoTipo = null;
      this.curriculoConteudo = null;
      return;
    }
    this.curriculoNome = arquivo.name;
    this.curriculoTipo = arquivo.type || 'application/octet-stream';
    const leitor = new FileReader();
    leitor.onload = () => {
      const resultado = leitor.result?.toString() ?? '';
      const base64 = resultado.includes(',') ? resultado.split(',')[1] : resultado;
      this.curriculoConteudo = base64;
      this.formularioCandidato.patchValue({
        curriculoNome: this.curriculoNome,
        curriculoTipo: this.curriculoTipo,
        curriculoConteudo: this.curriculoConteudo
      });
    };
    leitor.readAsDataURL(arquivo);
  }

  private carregarCandidatos(empregoId: string): void {
    this.service
      .listarCandidatos(empregoId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (candidatos) => {
          this.candidatos = candidatos ?? [];
          this.aplicarFiltrosCandidatos();
        },
        error: () => {
          this.candidatos = [];
          this.candidatosFiltrados = [];
        }
      });
  }

  private resetarFormularioCandidato(): void {
    this.formularioCandidato.reset({
      beneficiarioId: '',
      beneficiarioNome: '',
      necessidadesProfissionais: '',
      status: 'EM_ANALISE',
      curriculoNome: '',
      curriculoTipo: '',
      curriculoConteudo: ''
    });
    this.pesquisaCandidato.setValue('', { emitEvent: false });
    this.resultadosCandidatos = [];
    this.candidatoSelecionado = null;
    this.curriculoNome = null;
    this.curriculoTipo = null;
    this.curriculoConteudo = null;
  }

  baixarCurriculo(candidato: JobCandidato): void {
    if (!candidato.curriculoConteudo) {
      return;
    }
    const tipo = candidato.curriculoTipo || 'application/octet-stream';
    const nome = candidato.curriculoNome || 'curriculo';
    const link = document.createElement('a');
    link.href = `data:${tipo};base64,${candidato.curriculoConteudo}`;
    link.download = nome;
    link.click();
  }

  private configurarFiltrosCandidatos(): void {
    this.filtroCandidatoNome.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.aplicarFiltrosCandidatos());
    this.filtroCandidatoStatus.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.aplicarFiltrosCandidatos());
    this.filtroCandidatoData.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.aplicarFiltrosCandidatos());
  }

  private aplicarFiltrosCandidatos(): void {
    const nome = (this.filtroCandidatoNome.value ?? '').toString().toLowerCase().trim();
    const status = this.filtroCandidatoStatus.value ?? 'todos';
    const data = (this.filtroCandidatoData.value ?? '').toString();
    this.candidatosFiltrados = this.candidatos.filter((candidato) => {
      const nomeMatch = nome
        ? candidato.beneficiarioNome?.toLowerCase().includes(nome)
        : true;
      const statusMatch = status === 'todos' ? true : candidato.status === status;
      const dataCandidato = (candidato.criadoEm ?? '').toString().slice(0, 10);
      const dataMatch = data ? dataCandidato === data : true;
      return nomeMatch && statusMatch && dataMatch;
    });
  }

  onSalvar(): void {
    this.save();
  }

  onExcluir(): void {
    if (!this.selectedJobId) {
      this.popupTitulo = 'Campos obrigatorios';
      this.popupErros = new PopupErrorBuilder()
        .adicionar('Selecione uma vaga para excluir.')
        .build();
      this.abrirPopupTemporario();
      return;
    }
    const record = this.records.find((item) => item.id === this.selectedJobId);
    if (!record) {
      this.popupTitulo = 'Erro';
      this.popupErros = new PopupErrorBuilder()
        .adicionar('Nao foi possivel localizar a vaga selecionada.')
        .build();
      this.abrirPopupTemporario();
      return;
    }
    this.deleteRecord(record);
  }

  onNovo(): void {
    this.startNew();
  }

  onCancelar(): void {
    this.cancel();
  }

  onImprimir(): void {
    this.print();
  }

  onFechar(): void {
    this.close();
  }

  fecharPopupErros(): void {
    this.popupErros = [];
    if (this.popupTimeout) {
      clearTimeout(this.popupTimeout);
      this.popupTimeout = undefined;
    }
  }

  private abrirPopupTemporario(): void {
    if (this.popupTimeout) {
      clearTimeout(this.popupTimeout);
    }
    this.popupTimeout = setTimeout(() => {
      this.fecharPopupErros();
    }, 10000);
  }

  abrirDialogoConfirmacao(titulo: string, mensagem: string, confirmarLabel: string, acao: () => void): void {
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
    if (acao) {
      acao();
    }
  }

  cancelarDialogo(): void {
    this.dialogConfirmacaoAberta = false;
    this.dialogAcao = undefined;
  }

  private confirmarExclusao(id: string): void {
    this.deletingId = id;
    this.service
      .remove(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          if (this.selectedJobId === id) {
            this.startNew();
          }
          this.applyFilters();
        },
        error: () => {
          this.popupTitulo = 'Erro';
          this.popupErros = new PopupErrorBuilder()
            .adicionar('Nao foi possivel remover a vaga.')
            .build();
          this.abrirPopupTemporario();
        }
      })
      .add(() => (this.deletingId = null));
  }

  private mostrarPopup(titulo: string, mensagens: string[]): void {
    this.popupTitulo = titulo;
    this.popupErros = mensagens;
    this.abrirPopupTemporario();
  }

  private aplicarCapitalizacaoPayload(payload: JobPayload): JobPayload {
    const dadosVaga = { ...(payload.dadosVaga || {}) };
    const empresaLocal = payload.empresaLocal ? { ...payload.empresaLocal } : undefined;
    const requisitos = payload.requisitos ? { ...payload.requisitos } : undefined;
    if (dadosVaga.titulo) {
      dadosVaga.titulo = titleCaseWords(dadosVaga.titulo);
    }
    if (dadosVaga.area) {
      dadosVaga.area = titleCaseWords(dadosVaga.area);
    }
    if (dadosVaga.tipo) {
      dadosVaga.tipo = titleCaseWords(dadosVaga.tipo);
    }
    if (dadosVaga.nivel) {
      dadosVaga.nivel = titleCaseWords(dadosVaga.nivel);
    }
    if (dadosVaga.modelo) {
      dadosVaga.modelo = titleCaseWords(dadosVaga.modelo);
    }
    if (dadosVaga.tipoContrato) {
      dadosVaga.tipoContrato = titleCaseWords(dadosVaga.tipoContrato);
    }
    if (dadosVaga.cargaHoraria) {
      dadosVaga.cargaHoraria = titleCaseWords(dadosVaga.cargaHoraria);
    }
    if (empresaLocal?.nomeEmpresa) {
      empresaLocal.nomeEmpresa = titleCaseWords(empresaLocal.nomeEmpresa);
    }
    if (empresaLocal?.cidade) {
      empresaLocal.cidade = titleCaseWords(empresaLocal.cidade);
    }
    if (empresaLocal?.endereco) {
      empresaLocal.endereco = titleCaseWords(empresaLocal.endereco);
    }
    if (empresaLocal?.bairro) {
      empresaLocal.bairro = titleCaseWords(empresaLocal.bairro);
    }
    if (empresaLocal?.cnpj) {
      empresaLocal.cnpj = this.aplicarMascaraCnpj(empresaLocal.cnpj);
    }
    if (requisitos?.escolaridade) {
      requisitos.escolaridade = titleCaseWords(requisitos.escolaridade);
    }
    if (requisitos?.experiencia) {
      requisitos.experiencia = titleCaseWords(requisitos.experiencia);
    }
    if (requisitos?.habilidades) {
      requisitos.habilidades = titleCaseWords(requisitos.habilidades);
    }
    if (requisitos?.observacoes) {
      requisitos.observacoes = titleCaseWords(requisitos.observacoes);
    }
    return {
      ...payload,
      dadosVaga,
      ...(empresaLocal ? { empresaLocal } : {}),
      ...(requisitos ? { requisitos } : {})
    };
  }

  onCnpjInput(valor: string): void {
    const dados = this.form.get('empresaLocal') as FormGroup;
    const mascarado = this.aplicarMascaraCnpj(valor || '');
    dados.patchValue({ cnpj: mascarado }, { emitEvent: false });
    this.cnpjErro = null;
  }

  private validarCnpjEmpresa(): boolean {
    const dados = this.form.get('empresaLocal') as FormGroup;
    const cnpj = (dados.get('cnpj')?.value || '').toString();
    if (!cnpj) {
      this.cnpjErro = null;
      return true;
    }
    if (!this.validarCnpj(cnpj)) {
      this.cnpjErro = 'CNPJ invalido.';
      this.popupTitulo = 'Campos obrigatorios';
      this.popupErros = new PopupErrorBuilder().adicionar('CNPJ invalido.').build();
      this.abrirPopupTemporario();
      return false;
    }
    this.cnpjErro = null;
    return true;
  }

  private aplicarMascaraCnpj(valor: string): string {
    const numeros = (valor ?? '').replace(/\D/g, '').slice(0, 14);
    const parte1 = numeros.slice(0, 2);
    const parte2 = numeros.slice(2, 5);
    const parte3 = numeros.slice(5, 8);
    const parte4 = numeros.slice(8, 12);
    const parte5 = numeros.slice(12, 14);
    let resultado = '';
    if (parte1) {
      resultado = parte1;
    }
    if (parte2) {
      resultado += `.${parte2}`;
    }
    if (parte3) {
      resultado += `.${parte3}`;
    }
    if (parte4) {
      resultado += `/${parte4}`;
    }
    if (parte5) {
      resultado += `-${parte5}`;
    }
    return resultado;
  }

  private validarCnpj(valor: string): boolean {
    const cnpj = valor.replace(/\D/g, '');
    if (cnpj.length != 14 || /^(\d)\1+$/.test(cnpj)) {
      return false;
    }
    const pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const calcular = (pesos: number[]) => {
      let soma = 0;
      for (let i = 0; i < pesos.length; i += 1) {
        soma += Number(cnpj.charAt(i)) * pesos[i];
      }
      const resto = soma % 11;
      return resto < 2 ? 0 : 11 - resto;
    };
    const digito1 = calcular(pesos1);
    const digito2 = calcular(pesos2);
    return (
      digito1 === Number(cnpj.charAt(12)) &&
      digito2 === Number(cnpj.charAt(13))
    );
  }

}

