import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faChartColumn,
  faClipboardCheck,
  faFilePdf,
  faListCheck,
  faPen,
  faPlus,
  faTrash
} from '@fortawesome/free-solid-svg-icons';
import { finalize, forkJoin } from 'rxjs';
import { AssistanceUnitPayload, AssistanceUnitService } from '../../services/assistance-unit.service';
import { PopupErrorBuilder } from '../../utils/popup-error.builder';
import { ProfessionalService } from '../../services/professional.service';
import {
  ProjetoArea,
  ProjetoDashboard,
  ProjetoFilters,
  ProjetoPayload,
  ProjetoPrioridade,
  ProjetoRecord,
  ProjetosService,
  ProjetoStatus,
  ProjetoTaskPayload,
  ProjetoTaskRecord,
  ProjetoTarefaStatus,
  ProjetoTarefaTipo
} from '../../services/projetos.service';
import { PopupMessagesComponent } from '../compartilhado/popup-messages/popup-messages.component';
import { TelaPadraoComponent } from '../compartilhado/tela-padrao/tela-padrao.component';
import { DialogComponent } from '../compartilhado/dialog/dialog.component';
import { ConfigAcoesCrud, EstadoAcoesCrud, TelaBaseComponent } from '../compartilhado/tela-base.component';

type TabId = 'visao-geral' | 'projetos' | 'kanban' | 'relatorios';

@Component({
  selector: 'app-projetos',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DragDropModule,
    FontAwesomeModule,
    TelaPadraoComponent,
    PopupMessagesComponent,
    DialogComponent
  ],
  templateUrl: './projetos.component.html',
  styleUrl: './projetos.component.scss'
})
export class ProjetosComponent extends TelaBaseComponent implements OnInit {
  readonly faDiagramProject = faClipboardCheck;
  readonly faClipboardCheck = faClipboardCheck;
  readonly faChartColumn = faChartColumn;
  readonly faPlus = faPlus;
  readonly faPen = faPen;
  readonly faTrash = faTrash;
  readonly faFilePdf = faFilePdf;
  readonly faListCheck = faListCheck;

  readonly prioridades: Array<{ value: ProjetoPrioridade; label: string }> = [
    { value: 'BAIXA', label: 'Baixa' },
    { value: 'MEDIA', label: 'Média' },
    { value: 'ALTA', label: 'Alta' },
    { value: 'URGENTE', label: 'Urgente' }
  ];
  readonly statusProjeto: Array<{ value: ProjetoStatus; label: string }> = [
    { value: 'NAO_INICIADO', label: 'Não iniciado' },
    { value: 'EM_ANDAMENTO', label: 'Em andamento' },
    { value: 'PARADO', label: 'Parado' },
    { value: 'CONCLUIDO', label: 'Concluído' },
    { value: 'CANCELADO', label: 'Cancelado' }
  ];
  readonly areasProjeto: Array<{ value: ProjetoArea; label: string }> = [
    { value: 'ASSISTENCIA_SOCIAL', label: 'Assistência social' },
    { value: 'EDUCACAO', label: 'Educação' },
    { value: 'SAUDE', label: 'Saúde' },
    { value: 'ALIMENTACAO', label: 'Alimentação' },
    { value: 'CAPACITACAO_PROFISSIONAL', label: 'Capacitação profissional' },
    { value: 'CULTURA', label: 'Cultura' },
    { value: 'ESPORTE', label: 'Esporte' },
    { value: 'HABITACAO', label: 'Habitação' },
    { value: 'CAPTACAO_RECURSOS', label: 'Captação de recursos' },
    { value: 'OUTRO', label: 'Outro' }
  ];
  readonly tiposTarefa: Array<{ value: ProjetoTarefaTipo; label: string }> = [
    { value: 'PLANEJAMENTO', label: 'Planejamento' },
    { value: 'EXECUCAO', label: 'Execução' },
    { value: 'ATENDIMENTO', label: 'Atendimento' },
    { value: 'COMPRA', label: 'Compra' },
    { value: 'PRESTACAO_CONTAS', label: 'Prestação de contas' },
    { value: 'RELATORIO', label: 'Relatório' },
    { value: 'REUNIAO', label: 'Reunião' },
    { value: 'MONITORAMENTO', label: 'Monitoramento' },
    { value: 'DIVULGACAO', label: 'Divulgação' },
    { value: 'OUTRO', label: 'Outro' }
  ];
  readonly statusTarefa: Array<{ value: ProjetoTarefaStatus; label: string }> = [
    { value: 'NAO_INICIADO', label: 'Não iniciado' },
    { value: 'EM_ANDAMENTO', label: 'Em andamento' },
    { value: 'PARADO', label: 'Parado' },
    { value: 'CONCLUIDO', label: 'Concluído' }
  ];
  readonly tabs: Array<{ id: TabId; label: string }> = [
    { id: 'visao-geral', label: 'Visão geral' },
    { id: 'projetos', label: 'Projetos' },
    { id: 'kanban', label: 'Kanban' },
    { id: 'relatorios', label: 'Relatórios' }
  ];

  readonly acoesToolbar: Required<ConfigAcoesCrud> = this.criarConfigAcoes({
    salvar: true,
    excluir: true,
    novo: true,
    cancelar: true,
    imprimir: true,
    buscar: true
  });

  activeTab: TabId = 'visao-geral';
  filtersForm: FormGroup;
  projectForm: FormGroup;
  taskForm: FormGroup;
  popupErros: string[] = [];
  feedback: string | null = null;
  projetos: ProjetoRecord[] = [];
  projetoSelecionado: ProjetoRecord | null = null;
  dashboard: ProjetoDashboard | null = null;
  unidades: AssistanceUnitPayload[] = [];
  responsaveisSugestoes: string[] = [];
  loading = false;
  salvandoProjeto = false;
  salvandoTarefa = false;
  gerandoRelatorio = false;
  editandoProjetoId: string | null = null;
  editandoTarefaId: string | null = null;
  dialogAberto = false;
  dialogTitulo = 'Confirmar ação';
  dialogMensagem = 'Deseja continuar?';
  dialogAcao: 'inativar' | null = null;
  reportType = 'geral';

  constructor(
    private readonly fb: FormBuilder,
    private readonly projetosService: ProjetosService,
    private readonly assistanceUnitService: AssistanceUnitService,
    private readonly professionalService: ProfessionalService
  ) {
    super();
    this.filtersForm = this.fb.group({
      nome: [''],
      responsavel: [''],
      status: [''],
      prioridade: [''],
      area_projeto: [''],
      data_inicio_de: [''],
      data_inicio_ate: [''],
      prazo_de: [''],
      prazo_ate: [''],
      atrasados: [false],
      concluidos: [false],
      unidade_assistencial_id: ['']
    });
    this.projectForm = this.fb.group({
      nome: ['', Validators.required],
      descricao_completa: [''],
      objetivo_geral: [''],
      publico_alvo: [''],
      unidade_assistencial_id: [''],
      responsavel: ['', Validators.required],
      equipe_envolvida_texto: [''],
      data_inicio: ['', Validators.required],
      prazo_previsto: ['', Validators.required],
      data_termino_real: [''],
      prioridade: ['MEDIA', Validators.required],
      status: ['NAO_INICIADO', Validators.required],
      area_projeto: ['ASSISTENCIA_SOCIAL', Validators.required],
      fonte_recurso: [''],
      observacoes: [''],
      ativo: [true]
    });
    this.taskForm = this.fb.group({
      titulo: ['', Validators.required],
      descricao: [''],
      tipo_tarefa: ['PLANEJAMENTO', Validators.required],
      responsavel: ['', Validators.required],
      prioridade: ['MEDIA', Validators.required],
      status: ['NAO_INICIADO', Validators.required],
      data_prevista: [''],
      data_conclusao: [''],
      observacoes: ['']
    });
  }

  ngOnInit(): void {
    this.carregarTudo();
  }

  get acoesDesabilitadas(): EstadoAcoesCrud {
    return {
      salvar: this.salvandoProjeto,
      excluir: !this.projetoSelecionado,
      novo: this.salvandoProjeto,
      cancelar: this.salvandoProjeto,
      imprimir: this.gerandoRelatorio,
      buscar: this.loading
    };
  }

  get activeTabIndex(): number {
    return this.tabs.findIndex((tab) => tab.id === this.activeTab);
  }

  get kanbanProjetoSelecionado(): ProjetoRecord | null {
    return this.projetoSelecionado;
  }

  changeTab(tabId: TabId): void {
    this.activeTab = tabId;
  }

  onBuscar(): void {
    this.activeTab = 'projetos';
    this.carregarProjetos();
  }

  onSalvar(): void {
    this.salvarProjeto();
  }

  onNovo(): void {
    this.novoProjeto();
  }

  onCancelar(): void {
    this.cancelarEdicaoProjeto();
  }

  onExcluir(): void {
    if (!this.projetoSelecionado) return;
    this.dialogTitulo = 'Inativar projeto';
    this.dialogMensagem = `Deseja inativar o projeto "${this.projetoSelecionado.nome}"?`;
    this.dialogAcao = 'inativar';
    this.dialogAberto = true;
  }

  onImprimir(): void {
    const filtros = this.buildFilters();
    if (this.projetoSelecionado) {
      this.gerarRelatorio('individual', { projeto_id: this.projetoSelecionado.id });
      return;
    }
    this.gerarRelatorio(this.reportType, filtros);
  }

  confirmarDialogo(): void {
    if (this.dialogAcao === 'inativar' && this.projetoSelecionado) {
      this.inativarProjeto(this.projetoSelecionado);
    }
    this.cancelarDialogo();
  }

  cancelarDialogo(): void {
    this.dialogAberto = false;
    this.dialogAcao = null;
  }

  limparFiltros(): void {
    this.filtersForm.reset({
      nome: '',
      responsavel: '',
      status: '',
      prioridade: '',
      area_projeto: '',
      data_inicio_de: '',
      data_inicio_ate: '',
      prazo_de: '',
      prazo_ate: '',
      atrasados: false,
      concluidos: false,
      unidade_assistencial_id: ''
    });
    this.carregarProjetos();
    this.carregarDashboard();
  }

  carregarTudo(): void {
    this.loading = true;
    forkJoin({
      unidades: this.assistanceUnitService.list(),
      profissionais: this.professionalService.list(),
      projetos: this.projetosService.list(this.buildFilters()),
      dashboard: this.projetosService.dashboard(this.buildFilters())
    })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: ({ unidades, profissionais, projetos, dashboard }) => {
          this.unidades = unidades ?? [];
          this.responsaveisSugestoes = Array.from(
            new Set((profissionais ?? []).map((item) => item.nomeCompleto).filter(Boolean))
          );
          this.projetos = projetos ?? [];
          this.dashboard = dashboard;
          this.projetoSelecionado = this.projetos[0] ?? null;
        },
        error: () => {
          this.popupErros = new PopupErrorBuilder()
            .adicionar('Não foi possível carregar a tela de projetos.')
            .build();
        }
      });
  }

  carregarProjetos(): void {
    this.loading = true;
    this.projetosService
      .list(this.buildFilters())
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (projetos) => {
          this.projetos = projetos;
          if (!this.projetoSelecionado || !projetos.some((item) => item.id === this.projetoSelecionado?.id)) {
            this.projetoSelecionado = projetos[0] ?? null;
          }
        },
        error: () => {
          this.popupErros = new PopupErrorBuilder()
            .adicionar('Não foi possível carregar os projetos.')
            .build();
        }
      });
  }

  carregarDashboard(): void {
    this.projetosService.dashboard(this.buildFilters()).subscribe({
      next: (dashboard) => {
        this.dashboard = dashboard;
      }
    });
  }

  selecionarProjeto(projeto: ProjetoRecord): void {
    this.projetoSelecionado = projeto;
    this.projetosService.get(projeto.id).subscribe({
      next: (detalhe) => {
        this.projetoSelecionado = detalhe;
        this.atualizarProjetoNaLista(detalhe);
      }
    });
  }

  verDetalhes(projeto: ProjetoRecord): void {
    this.selecionarProjeto(projeto);
    this.activeTab = 'projetos';
  }

  editarProjeto(projeto: ProjetoRecord): void {
    this.selecionarProjeto(projeto);
    this.editandoProjetoId = projeto.id;
    this.projectForm.patchValue({
      nome: projeto.nome,
      descricao_completa: projeto.descricaoCompleta,
      objetivo_geral: projeto.objetivoGeral,
      publico_alvo: projeto.publicoAlvo,
      unidade_assistencial_id: projeto.unidadeAssistencialId ?? '',
      responsavel: projeto.responsavel,
      equipe_envolvida_texto: projeto.equipeEnvolvida.join(', '),
      data_inicio: projeto.dataInicio ?? '',
      prazo_previsto: projeto.prazoPrevisto ?? '',
      data_termino_real: projeto.dataTerminoReal ?? '',
      prioridade: projeto.prioridade,
      status: projeto.status,
      area_projeto: projeto.areaProjeto,
      fonte_recurso: projeto.fonteRecurso,
      observacoes: projeto.observacoes,
      ativo: projeto.ativo
    });
  }

  novoProjeto(): void {
    this.editandoProjetoId = null;
    this.projectForm.reset({
      nome: '',
      descricao_completa: '',
      objetivo_geral: '',
      publico_alvo: '',
      unidade_assistencial_id: '',
      responsavel: '',
      equipe_envolvida_texto: '',
      data_inicio: '',
      prazo_previsto: '',
      data_termino_real: '',
      prioridade: 'MEDIA',
      status: 'NAO_INICIADO',
      area_projeto: 'ASSISTENCIA_SOCIAL',
      fonte_recurso: '',
      observacoes: '',
      ativo: true
    });
    this.activeTab = 'projetos';
  }

  cancelarEdicaoProjeto(): void {
    this.novoProjeto();
    this.popupErros = [];
  }

  salvarProjeto(): void {
    this.popupErros = [];
    if (this.projectForm.invalid) {
      this.projectForm.markAllAsTouched();
      this.popupErros = new PopupErrorBuilder()
        .adicionar('Preencha os campos obrigatórios do projeto.')
        .build();
      return;
    }
    const projetoFormValue = this.projectForm.getRawValue();
    if (
      projetoFormValue.data_inicio &&
      projetoFormValue.prazo_previsto &&
      projetoFormValue.prazo_previsto < projetoFormValue.data_inicio
    ) {
      this.popupErros = new PopupErrorBuilder()
        .adicionar('O prazo previsto não pode ser menor que a data de início.')
        .build();
      return;
    }
    if (projetoFormValue.status === 'CONCLUIDO' && !projetoFormValue.data_termino_real) {
      this.popupErros = new PopupErrorBuilder()
        .adicionar('Projeto concluído deve informar a data de conclusão.')
        .build();
      return;
    }
    if (
      projetoFormValue.data_termino_real &&
      projetoFormValue.data_inicio &&
      projetoFormValue.data_termino_real < projetoFormValue.data_inicio
    ) {
      this.popupErros = new PopupErrorBuilder()
        .adicionar('A data de término não pode ser menor que a data de início.')
        .build();
      return;
    }
    const payload = this.buildProjetoPayload();
    this.salvandoProjeto = true;
    const request = this.editandoProjetoId
      ? this.projetosService.update(this.editandoProjetoId, payload)
      : this.projetosService.create(payload);
    request
      .pipe(finalize(() => (this.salvandoProjeto = false)))
      .subscribe({
        next: (projeto) => {
          this.atualizarProjetoNaLista(projeto);
          this.projetoSelecionado = projeto;
          this.editandoProjetoId = projeto.id;
          this.feedback = 'Projeto salvo com sucesso.';
          this.carregarDashboard();
        },
        error: () => {
          this.popupErros = new PopupErrorBuilder()
            .adicionar('Não foi possível salvar o projeto.')
            .build();
        }
      });
  }

  inativarProjeto(projeto: ProjetoRecord): void {
    this.projetosService.delete(projeto.id).subscribe({
      next: () => {
        this.projetos = this.projetos.filter((item) => item.id !== projeto.id);
        this.projetoSelecionado = this.projetos[0] ?? null;
        this.feedback = 'Projeto inativado com sucesso.';
        this.carregarDashboard();
      },
      error: () => {
        this.popupErros = new PopupErrorBuilder()
          .adicionar('Não foi possível inativar o projeto.')
          .build();
      }
    });
  }

  salvarTarefa(): void {
    if (!this.projetoSelecionado) {
      this.popupErros = new PopupErrorBuilder()
        .adicionar('Selecione um projeto antes de registrar tarefas.')
        .build();
      return;
    }
    if (this.taskForm.invalid) {
      this.taskForm.markAllAsTouched();
      this.popupErros = new PopupErrorBuilder()
        .adicionar('Preencha os campos obrigatórios da tarefa.')
        .build();
      return;
    }
    const tarefaFormValue = this.taskForm.getRawValue();
    if (tarefaFormValue.status === 'CONCLUIDO' && !tarefaFormValue.data_conclusao) {
      this.popupErros = new PopupErrorBuilder()
        .adicionar('Tarefa concluída deve informar a data de conclusão.')
        .build();
      return;
    }
    const payload = this.buildTaskPayload();
    this.salvandoTarefa = true;
    const request = this.editandoTarefaId
      ? this.projetosService.updateTask(this.projetoSelecionado.id, this.editandoTarefaId, payload)
      : this.projetosService.createTask(this.projetoSelecionado.id, payload);
    request
      .pipe(finalize(() => (this.salvandoTarefa = false)))
      .subscribe({
        next: (tarefa) => {
          if (!this.projetoSelecionado) return;
          const tarefas = this.projetoSelecionado.tarefas.filter((item) => item.id !== tarefa.id);
          this.projetoSelecionado = {
            ...this.projetoSelecionado,
            tarefas: [...tarefas, tarefa]
          };
          this.atualizarProjetoNaLista(this.projetoSelecionado);
          this.feedback = 'Tarefa salva com sucesso.';
          this.resetTaskForm();
          this.carregarProjetos();
          this.carregarDashboard();
        },
        error: () => {
          this.popupErros = new PopupErrorBuilder()
            .adicionar('Não foi possível salvar a tarefa.')
            .build();
        }
      });
  }

  editarTarefa(tarefa: ProjetoTaskRecord): void {
    this.editandoTarefaId = tarefa.id;
    this.taskForm.patchValue({
      titulo: tarefa.titulo,
      descricao: tarefa.descricao,
      tipo_tarefa: tarefa.tipoTarefa,
      responsavel: tarefa.responsavel,
      prioridade: tarefa.prioridade,
      status: tarefa.status,
      data_prevista: tarefa.dataPrevista ?? '',
      data_conclusao: tarefa.dataConclusao ?? '',
      observacoes: tarefa.observacoes
    });
  }

  novaTarefa(): void {
    this.resetTaskForm();
  }

  moverTarefa(event: CdkDragDrop<ProjetoTaskRecord[]>, status: ProjetoTarefaStatus): void {
    if (event.previousContainer === event.container) return;
    const tarefa = event.item.data as ProjetoTaskRecord;
    if (!tarefa || !this.projetoSelecionado) return;
    this.projetosService.moveTask(this.projetoSelecionado.id, tarefa.id, status).subscribe({
      next: (atualizada) => {
        this.projetoSelecionado = {
          ...this.projetoSelecionado,
          tarefas: this.projetoSelecionado!.tarefas.map((item) => (item.id === atualizada.id ? atualizada : item))
        };
        this.atualizarProjetoNaLista(this.projetoSelecionado);
        this.feedback = 'Tarefa movida no Kanban com sucesso.';
        this.carregarProjetos();
        this.carregarDashboard();
      },
      error: () => {
        this.popupErros = new PopupErrorBuilder()
          .adicionar('Não foi possível mover a tarefa.')
          .build();
      }
    });
  }

  getTarefasPorStatus(status: ProjetoTarefaStatus): ProjetoTaskRecord[] {
    return (this.kanbanProjetoSelecionado?.tarefas ?? []).filter((item) => item.status === status);
  }

  gerarRelatorio(tipo: string, filtros: Record<string, unknown>): void {
    this.gerandoRelatorio = true;
    this.projetosService
      .generateReport(tipo, filtros)
      .pipe(finalize(() => (this.gerandoRelatorio = false)))
      .subscribe({
        next: (blob) => this.baixarBlob(blob, `projetos-${tipo}.pdf`),
        error: () => {
          this.popupErros = new PopupErrorBuilder()
            .adicionar('Não foi possível gerar o relatório.')
            .build();
        }
      });
  }

  larguraGrafico(total: number, maximo: number): string {
    if (!maximo) return '0%';
    return `${Math.max(8, Math.round((total / maximo) * 100))}%`;
  }

  maximoGrafico(items: Array<{ total: number }>): number {
    return Math.max(...items.map((item) => item.total), 0);
  }

  classeIndicador(indicador: ProjetoRecord['indicadorPrazo']): string {
    if (indicador === 'ATRASADO') return 'danger';
    if (indicador === 'CONCLUIDO') return 'success';
    return 'neutral';
  }

  classeKanban(status: ProjetoTarefaStatus): string {
    if (status === 'NAO_INICIADO') return 'nao-iniciado';
    if (status === 'EM_ANDAMENTO') return 'em-andamento';
    if (status === 'PARADO') return 'parado';
    return 'concluido';
  }

  private buildProjetoPayload(): ProjetoPayload {
    const value = this.projectForm.getRawValue();
    return {
      nome: value.nome,
      descricao_completa: value.descricao_completa || undefined,
      objetivo_geral: value.objetivo_geral || undefined,
      publico_alvo: value.publico_alvo || undefined,
      unidade_assistencial_id: value.unidade_assistencial_id || undefined,
      responsavel: value.responsavel,
      equipe_envolvida: String(value.equipe_envolvida_texto || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      data_inicio: value.data_inicio,
      prazo_previsto: value.prazo_previsto,
      data_termino_real: value.data_termino_real || undefined,
      prioridade: value.prioridade,
      status: value.status,
      area_projeto: value.area_projeto,
      fonte_recurso: value.fonte_recurso || undefined,
      observacoes: value.observacoes || undefined,
      ativo: !!value.ativo
    };
  }

  private buildTaskPayload(): ProjetoTaskPayload {
    const value = this.taskForm.getRawValue();
    return {
      titulo: value.titulo,
      descricao: value.descricao || undefined,
      tipo_tarefa: value.tipo_tarefa,
      responsavel: value.responsavel,
      prioridade: value.prioridade,
      status: value.status,
      data_prevista: value.data_prevista || undefined,
      data_conclusao: value.data_conclusao || undefined,
      observacoes: value.observacoes || undefined
    };
  }

  buildFilters(): ProjetoFilters {
    const value = this.filtersForm.getRawValue();
    return {
      nome: value.nome || undefined,
      responsavel: value.responsavel || undefined,
      status: value.status || undefined,
      prioridade: value.prioridade || undefined,
      area_projeto: value.area_projeto || undefined,
      data_inicio_de: value.data_inicio_de || undefined,
      data_inicio_ate: value.data_inicio_ate || undefined,
      prazo_de: value.prazo_de || undefined,
      prazo_ate: value.prazo_ate || undefined,
      atrasados: !!value.atrasados || undefined,
      concluidos: !!value.concluidos || undefined,
      unidade_assistencial_id: value.unidade_assistencial_id || undefined
    };
  }

  private resetTaskForm(): void {
    this.editandoTarefaId = null;
    this.taskForm.reset({
      titulo: '',
      descricao: '',
      tipo_tarefa: 'PLANEJAMENTO',
      responsavel: this.projetoSelecionado?.responsavel ?? '',
      prioridade: 'MEDIA',
      status: 'NAO_INICIADO',
      data_prevista: '',
      data_conclusao: '',
      observacoes: ''
    });
  }

  private atualizarProjetoNaLista(projeto: ProjetoRecord): void {
    const semAtual = this.projetos.filter((item) => item.id !== projeto.id);
    this.projetos = [projeto, ...semAtual];
  }

  private baixarBlob(blob: Blob, nome: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nome;
    link.click();
    URL.revokeObjectURL(url);
  }
}
