import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faBell } from '@fortawesome/free-solid-svg-icons';
import { LembreteDiario, LembreteDiarioRequest, LembretesDiariosService } from '../../services/lembretes-diarios.service';
import { PopupMessagesComponent } from '../compartilhado/popup-messages/popup-messages.component';
import { DialogComponent } from '../compartilhado/dialog/dialog.component';
import { TelaPadraoComponent } from '../compartilhado/tela-padrao/tela-padrao.component';
import { ConfigAcoesCrud, EstadoAcoesCrud, TelaBaseComponent } from '../compartilhado/tela-base.component';
import { PopupErrorBuilder } from '../../utils/popup-error.builder';
import { UserPayload, UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';

type TabId = 'cadastro' | 'lembretesCriados';
type FiltroStatus = 'pendentesHoje' | 'atrasados' | 'agendados' | 'concluidos' | 'todos';

@Component({
  selector: 'app-lembretes-diarios',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, FontAwesomeModule, TelaPadraoComponent, PopupMessagesComponent, DialogComponent],
  templateUrl: './lembretes-diarios.component.html',
  styleUrl: './lembretes-diarios.component.scss'
})
export class LembretesDiariosComponent extends TelaBaseComponent implements OnInit {
  readonly faBell = faBell;
  readonly tabs: { id: TabId; label: string }[] = [
    { id: 'cadastro', label: 'Cadastro de lembretes' },
    { id: 'lembretesCriados', label: 'Lembretes criados' }
  ];

  activeTab: TabId = 'cadastro';
  filtroStatus: FiltroStatus = 'pendentesHoje';
  busca = '';
  lembretes: LembreteDiario[] = [];
  lembretesFiltrados: LembreteDiario[] = [];
  lembretesCadastro: LembreteDiario[] = [];
  selecionado: LembreteDiario | null = null;
  usuarios: UserPayload[] = [];
  totalPendentesHoje = 0;
  totalAtrasados = 0;
  totalAgendados = 0;
  totalConcluidos = 0;
  editingId: number | null = null;
  popupErros: string[] = [];
  popupTitulo = 'Aviso';
  salvando = false;
  carregando = false;
  dialogConfirmacaoAberta = false;
  dialogTitulo = 'Confirmação';
  dialogMensagem = 'Deseja continuar?';
  dialogConfirmarLabel = 'Confirmar';
  dialogAcao?: () => void;

  adiarAberto = false;
  adiarData = '';
  adiarHora = '';

  form: FormGroup;

  readonly acoesToolbar: Required<ConfigAcoesCrud> = this.criarConfigAcoes({
    buscar: true,
    novo: true,
    salvar: true,
    cancelar: true,
    excluir: true,
    imprimir: false
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly service: LembretesDiariosService,
    private readonly serviceUsuarios: UserService,
    private readonly auth: AuthService,
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {
    super();
    this.form = this.fb.group({
      titulo: ['', [Validators.required, Validators.minLength(3)]],
      descricao: [''],
      dataInicial: ['', Validators.required],
      usuarioId: [null],
      todosUsuarios: [false],
      horaAviso: ['09:00']
    });
  }

  ngOnInit(): void {
    this.carregarUsuarios();
    this.carregar();
    this.form.get('todosUsuarios')?.valueChanges.subscribe((todos) => {
      const usuarioControl = this.form.get('usuarioId');
      if (todos) {
        usuarioControl?.disable({ emitEvent: false });
        usuarioControl?.setValue(null, { emitEvent: false });
      } else {
        usuarioControl?.enable({ emitEvent: false });
        if (!usuarioControl?.value) {
          usuarioControl?.setValue(this.usuarioPadraoId(), { emitEvent: false });
        }
      }
    });
    this.route.queryParamMap.subscribe((params) => {
      const aba = params.get('aba');
      if (aba === 'lembretesCriados') {
        this.changeTab('lembretesCriados');
      }
    });
  }

  get acoesDesabilitadas(): EstadoAcoesCrud {
    return {
      salvar: this.salvando,
      cancelar: this.salvando,
      novo: this.salvando,
      excluir: !this.editingId,
      imprimir: true,
      buscar: this.salvando
    };
  }

  get activeTabIndex(): number {
    return this.tabs.findIndex((tab) => tab.id === this.activeTab);
  }

  changeTab(tab: TabId | string): void {
    this.activeTab = tab as TabId;
  }

  onBuscar(): void {
    this.changeTab('lembretesCriados');
    this.carregar();
  }

  onFechar(): void {
    this.router.navigate(['/dashboard/visao-geral']);
  }

  startNew(): void {
    this.resetForm();
  }

  resetForm(voltarParaCadastro = true): void {
    this.form.reset({ titulo: '', descricao: '', dataInicial: '', horaAviso: '09:00', usuarioId: this.usuarioPadraoId(), todosUsuarios: false });
    this.selecionado = null;
    this.editingId = null;
    this.popupErros = [];
    this.popupTitulo = 'Aviso';
    if (voltarParaCadastro) {
      this.changeTab('cadastro');
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.popupTitulo = 'Campos obrigatórios';
      this.popupErros = new PopupErrorBuilder()
        .adicionar('Preencha os campos obrigatórios antes de salvar.')
        .build();
      return;
    }

    const payload: LembreteDiarioRequest = {
      titulo: this.form.value.titulo,
      descricao: this.form.value.descricao,
      dataInicial: this.form.value.dataInicial,
      usuarioId: this.form.value.todosUsuarios ? null : this.form.value.usuarioId,
      todosUsuarios: this.form.value.todosUsuarios,
      horaAviso: this.form.value.horaAviso
    };

    if (!payload.todosUsuarios && !payload.usuarioId) {
      this.popupTitulo = 'Campos obrigatórios';
      this.popupErros = new PopupErrorBuilder()
        .adicionar('Selecione um usuário ou marque a opção para todos.')
        .build();
      return;
    }

    this.salvando = true;
    const request$ = this.editingId
      ? this.service.atualizar(this.editingId, payload)
      : this.service.criar(payload);

    request$.subscribe({
      next: () => {
        this.popupTitulo = 'Sucesso';
        this.popupErros = new PopupErrorBuilder()
          .adicionar('Lembrete salvo com sucesso.')
          .build();
        this.carregar();
        this.resetForm(false);
        this.changeTab('lembretesCriados');
      },
      error: () => {
        this.popupTitulo = 'Erro ao salvar';
        this.popupErros = new PopupErrorBuilder()
          .adicionar('Não foi possível salvar o lembrete.')
          .build();
      },
      complete: () => {
        this.salvando = false;
      }
    });
  }

  selecionar(lembrete: LembreteDiario): void {
    this.selecionado = lembrete;
    this.editingId = lembrete.id;
    this.form.patchValue({
      titulo: lembrete.titulo,
      descricao: lembrete.descricao ?? '',
      dataInicial: lembrete.dataInicial,
      horaAviso: lembrete.horaAviso ?? '09:00',
      usuarioId: lembrete.usuarioId,
      todosUsuarios: lembrete.todosUsuarios ?? false
    });
    this.changeTab('cadastro');
  }

  excluirSelecionado(): void {
    if (!this.editingId) return;
    this.abrirDialogoConfirmacao(
      'Excluir lembrete',
      'Deseja realmente excluir este lembrete?',
      'Excluir',
      () => this.executarExclusao(this.editingId as number)
    );
  }

  excluirItem(lembrete: LembreteDiario): void {
    this.abrirDialogoConfirmacao(
      'Excluir lembrete',
      `Deseja realmente excluir o lembrete "${lembrete.titulo}"?`,
      'Excluir',
      () => this.executarExclusao(lembrete.id)
    );
  }

  concluir(lembrete: LembreteDiario): void {
    this.service.concluir(lembrete.id).subscribe({
      next: () => {
        this.carregar();
      }
    });
  }

  abrirModalAdiar(lembrete: LembreteDiario): void {
    this.selecionado = lembrete;
    this.adiarData = '';
    this.adiarHora = '09:00';
    this.adiarAberto = true;
  }

  fecharModalAdiar(): void {
    this.adiarAberto = false;
    this.adiarData = '';
    this.adiarHora = '';
  }

  confirmarAdiar(): void {
    if (!this.selecionado || !this.adiarData || !this.adiarHora) {
      return;
    }
    const dataHora = `${this.adiarData}T${this.adiarHora}:00`;
    this.service.adiar(this.selecionado.id, { novaDataHora: dataHora }).subscribe({
      next: () => {
        this.carregar();
        this.fecharModalAdiar();
      }
    });
  }

  aplicarFiltro(): void {
    const termo = this.busca.trim().toLowerCase();
    const hoje = new Date();
    const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 0, 0, 0);
    const fimHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59);
    const base = this.lembretes;
    this.totalConcluidos = base.filter((item) => item.status === 'CONCLUIDO').length;
    this.totalPendentesHoje = base.filter((item) => {
      if (item.status !== 'PENDENTE') return false;
      const execucao = new Date(item.proximaExecucaoEm);
      return execucao >= inicioHoje && execucao <= fimHoje;
    }).length;
    this.totalAtrasados = base.filter((item) => {
      if (item.status !== 'PENDENTE') return false;
      const execucao = new Date(item.proximaExecucaoEm);
      return execucao < inicioHoje;
    }).length;
    this.totalAgendados = base.filter((item) => {
      if (item.status !== 'PENDENTE') return false;
      const execucao = new Date(item.proximaExecucaoEm);
      return execucao > fimHoje;
    }).length;

    this.lembretesFiltrados = this.lembretes.filter((item) => {
      if (termo) {
        const alvo = `${item.titulo} ${item.descricao ?? ''}`.toLowerCase();
        if (!alvo.includes(termo)) return false;
      }
      if (this.filtroStatus === 'todos') return true;
      const dataExecucao = new Date(item.proximaExecucaoEm);
      if (this.filtroStatus === 'concluidos') {
        return item.status === 'CONCLUIDO';
      }
      if (item.status !== 'PENDENTE') return false;
      if (this.filtroStatus === 'pendentesHoje') {
        return dataExecucao >= inicioHoje && dataExecucao <= fimHoje;
      }
      if (this.filtroStatus === 'atrasados') {
        return dataExecucao < inicioHoje;
      }
      if (this.filtroStatus === 'agendados') {
        return dataExecucao > fimHoje;
      }
      return true;
    });
  }

  selecionarFiltro(filtro: FiltroStatus): void {
    this.filtroStatus = filtro;
    this.aplicarFiltro();
  }

  private carregarUsuarios(): void {
    this.serviceUsuarios.list().subscribe({
      next: (usuarios) => {
        this.usuarios = usuarios ?? [];
        const usuarioPadrao = this.usuarioPadraoId();
        if (usuarioPadrao) {
          this.form.patchValue({ usuarioId: usuarioPadrao });
        }
      },
      error: () => {
        this.usuarios = [];
      }
    });
  }

  private usuarioPadraoId(): number | null {
    const usuario = this.auth.user();
    if (!usuario?.id) return null;
    const id = Number(usuario.id);
    return Number.isNaN(id) ? null : id;
  }

  private carregar(): void {
    this.carregando = true;
    this.service.listar().subscribe({
      next: (lembretes) => {
        this.lembretes = lembretes ?? [];
        this.lembretesCadastro = this.ordenarLembretes(this.lembretes);
        this.aplicarFiltro();
      },
      error: () => {
        this.lembretes = [];
        this.lembretesFiltrados = [];
        this.lembretesCadastro = [];
        this.popupTitulo = 'Erro ao carregar';
        this.popupErros = new PopupErrorBuilder()
          .adicionar('Não foi possível carregar os lembretes.')
          .build();
      },
      complete: () => {
        this.carregando = false;
      }
    });
  }

  private ordenarLembretes(lembretes: LembreteDiario[]): LembreteDiario[] {
    return [...lembretes].sort((a, b) => {
      const dataA = new Date(a.proximaExecucaoEm).getTime();
      const dataB = new Date(b.proximaExecucaoEm).getTime();
      return dataB - dataA;
    });
  }

  obterNomeUsuario(lembrete: LembreteDiario): string {
    if (lembrete.todosUsuarios) return 'Todos';
    const usuario = this.usuarios.find((item) => item.id === lembrete.usuarioId);
    return usuario?.nome ?? usuario?.nomeUsuario ?? 'Usuário não informado';
  }

  private executarExclusao(id: number): void {
    this.service.excluir(id).subscribe({
      next: () => {
        this.popupTitulo = 'Sucesso';
        this.popupErros = new PopupErrorBuilder()
          .adicionar('Lembrete excluído com sucesso.')
          .build();
        this.carregar();
        this.resetForm();
      },
      error: () => {
        this.popupTitulo = 'Erro ao excluir';
        this.popupErros = new PopupErrorBuilder()
          .adicionar('Não foi possível excluir o lembrete.')
          .build();
      }
    });
  }

  private abrirDialogoConfirmacao(
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
}







