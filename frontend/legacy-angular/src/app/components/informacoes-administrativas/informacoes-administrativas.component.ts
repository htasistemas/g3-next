import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faLock, faGear, faEye, faCopy, faTrash, faPen, faFolderOpen } from '@fortawesome/free-solid-svg-icons';
import { Subject, takeUntil } from 'rxjs';
import { TelaPadraoComponent } from '../compartilhado/tela-padrao/tela-padrao.component';
import { DialogComponent } from '../compartilhado/dialog/dialog.component';
import { PopupMessagesComponent } from '../compartilhado/popup-messages/popup-messages.component';
import { PopupErrorBuilder } from '../../utils/popup-error.builder';
import { AuthService } from '../../services/auth.service';
import { ReportService } from '../../services/report.service';
import {
  InformacoesAdministrativasService,
  InformacaoAdministrativaFiltro,
  InformacaoAdministrativaPayload,
  InformacaoAdministrativaResponse
} from '../../services/informacoes-administrativas.service';
import { ConfigAcoesCrud, EstadoAcoesCrud, TelaBaseComponent } from '../compartilhado/tela-base.component';

interface TabItem {
  id: 'lista' | 'cadastro';
  label: string;
}

@Component({
  selector: 'app-informacoes-administrativas',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FontAwesomeModule,
    TelaPadraoComponent,
    DialogComponent,
    PopupMessagesComponent
  ],
  templateUrl: './informacoes-administrativas.component.html',
  styleUrl: './informacoes-administrativas.component.scss'
})
export class InformacoesAdministrativasComponent extends TelaBaseComponent implements OnInit, OnDestroy {
  readonly faLock = faLock;
  readonly faGear = faGear;
  readonly faEye = faEye;
  readonly faCopy = faCopy;
  readonly faTrash = faTrash;
  readonly faPen = faPen;
  readonly faFolderOpen = faFolderOpen;

  tabs: TabItem[] = [
    { id: 'lista', label: 'Listagem' },
    { id: 'cadastro', label: 'Cadastro' }
  ];
  activeTab: TabItem['id'] = 'lista';
  get activeTabIndex(): number {
    return this.tabs.findIndex((tab) => tab.id === this.activeTab);
  }

  tiposDisponiveis = [
    'Servidor',
    'Câmeras',
    'E-mail',
    'Rede/IP',
    'Sistema',
    'Registro/Chaves',
    'Outros'
  ];

  form: FormGroup;
  searchForm: FormGroup;
  registros: InformacaoAdministrativaResponse[] = [];
  listLoading = false;
  saving = false;
  editingId: number | null = null;
  modoVisualizacao = false;

  popupErros: string[] = [];
  popupTitulo = 'Aviso';

  dialogConfirmacaoAberta = false;
  dialogTitulo = '';
  dialogMensagem = '';
  dialogConfirmarLabel = 'Confirmar';
  dialogAcao?: () => void;

  segredoReveladoId: number | null = null;
  segredoRevelado: string | null = null;
  private segredoTimeout?: ReturnType<typeof setTimeout>;
  private readonly destroy$ = new Subject<void>();

  readonly acoesToolbar: Required<ConfigAcoesCrud> = this.criarConfigAcoes({
    buscar: true,
    novo: true,
    salvar: true,
    cancelar: true,
    excluir: true,
    imprimir: true
  });

  get acoesDesabilitadas(): EstadoAcoesCrud {
    return {
      buscar: this.listLoading || this.saving,
      novo: this.saving,
      salvar: this.saving,
      cancelar: this.saving,
      excluir: this.saving || !this.editingId,
      imprimir: this.saving
    };
  }

  constructor(
    private readonly fb: FormBuilder,
    private readonly service: InformacoesAdministrativasService,
    private readonly auth: AuthService,
    private readonly reportService: ReportService,
    private readonly router: Router
  ) {
    super();
    this.form = this.fb.group({
      tipo: ['', Validators.required],
      categoria: ['', Validators.required],
      titulo: ['', Validators.required],
      descricao: [''],
      responsavel: [''],
      hostUrl: [''],
      porta: [null],
      login: [''],
      segredo: [''],
      tags: [''],
      status: [true]
    });

    this.searchForm = this.fb.group({
      tipo: [''],
      categoria: [''],
      titulo: [''],
      tags: [''],
      status: ['']
    });
  }

  ngOnInit(): void {
    this.buscarRegistros(false);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.limparSegredoRevelado();
  }

  get usuarioIdAtual(): number | null {
    const id = this.auth.user()?.id;
    return id ? Number(id) : null;
  }

  changeTab(tab: TabItem['id']): void {
    this.activeTab = tab;
  }

  onBuscar(): void {
    this.changeTab('lista');
    this.buscarRegistros();
  }

  onBuscarEnter(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.listLoading) return;
    this.onBuscar();
  }

  onNovo(): void {
    this.modoVisualizacao = false;
    this.editingId = null;
    this.form.reset({
      tipo: '',
      categoria: '',
      titulo: '',
      descricao: '',
      responsavel: '',
      hostUrl: '',
      porta: null,
      login: '',
      segredo: '',
      tags: '',
      status: true
    });
    this.changeTab('cadastro');
  }

  onSalvar(): void {
    this.popupErros = [];
    if (this.modoVisualizacao) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.popupTitulo = 'Campos obrigatórios';
      this.popupErros = new PopupErrorBuilder()
        .adicionar('Preencha os campos obrigatórios antes de salvar.')
        .build();
      return;
    }
    const usuarioId = this.usuarioIdAtual;
    if (!usuarioId) {
      this.popupTitulo = 'Erro';
      this.popupErros = new PopupErrorBuilder().adicionar('Usuário não identificado.').build();
      return;
    }
    const payload = this.buildPayload();
    this.saving = true;
    const request$ = this.editingId
      ? this.service.atualizar(usuarioId, this.editingId, payload)
      : this.service.criar(usuarioId, payload);

    request$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (registro) => {
        this.saving = false;
        this.popupTitulo = 'Sucesso';
        this.popupErros = new PopupErrorBuilder()
          .adicionar(this.editingId ? 'Atualização realizada com sucesso.' : 'Cadastro realizado com sucesso.')
          .build();
        this.editingId = registro.id;
        this.form.patchValue({ segredo: '' });
        this.buscarRegistros(false);
        this.changeTab('lista');
      },
      error: (erro) => {
        this.saving = false;
        const mensagem = erro?.error?.mensagem || 'Não foi possível salvar o registro.';
        this.popupTitulo = 'Erro';
        this.popupErros = new PopupErrorBuilder().adicionar(mensagem).build();
      }
    });
  }

  onCancelar(): void {
    if (this.form.dirty) {
      this.abrirConfirmacao(
        'Descartar alterações',
        'Deseja descartar as alterações do cadastro?',
        'Descartar',
        () => {
          this.form.markAsPristine();
          this.onNovo();
          this.changeTab('lista');
        }
      );
      return;
    }
    this.onNovo();
    this.changeTab('lista');
  }

  limparFiltros(): void {
    this.searchForm.reset({ tipo: '', categoria: '', titulo: '', tags: '', status: '' });
    this.buscarRegistros(false);
  }

  onExcluir(): void {
    if (!this.editingId) return;
    this.abrirConfirmacao(
      'Excluir registro',
      'Tem certeza que deseja excluir este registro?',
      'Excluir',
      () => this.excluirRegistro(this.editingId!)
    );
  }

  onImprimir(): void {
    const usuarioEmissor = this.auth.user()?.nome || this.auth.user()?.nomeUsuario || 'Sistema';
    const filtros = this.buildFiltrosRelatorio(usuarioEmissor);
    this.reportService.generateInformacoesAdministrativasReport(filtros).subscribe({
      next: (arquivo: Blob) => this.abrirPdfEmNovaGuia(arquivo),
      error: () => {
        this.popupTitulo = 'Erro';
        this.popupErros = new PopupErrorBuilder().adicionar('Não foi possível gerar o relatório.').build();
      }
    });
  }

  onFechar(): void {
    if (this.form.dirty) {
      this.abrirConfirmacao(
        'Sair da tela',
        'Existem alterações pendentes. Deseja sair?',
        'Sair',
        () => this.router.navigate(['/configuracoes/parametros'])
      );
      return;
    }
    this.router.navigate(['/configuracoes/parametros']);
  }

  visualizar(registro: InformacaoAdministrativaResponse): void {
    this.modoVisualizacao = true;
    this.preencherFormulario(registro);
    this.changeTab('cadastro');
  }

  editar(registro: InformacaoAdministrativaResponse): void {
    this.modoVisualizacao = false;
    this.preencherFormulario(registro);
    this.changeTab('cadastro');
  }

  confirmarRevelar(registro: InformacaoAdministrativaResponse): void {
    this.abrirConfirmacao(
      'Revelar segredo',
      'Deseja revelar o segredo deste registro?',
      'Revelar',
      () => this.revelarSegredo(registro)
    );
  }

  confirmarCopiar(registro: InformacaoAdministrativaResponse): void {
    this.abrirConfirmacao(
      'Copiar segredo',
      'Deseja copiar o segredo deste registro?',
      'Copiar',
      () => this.copiarSegredo(registro)
    );
  }

  fecharPopupErros(): void {
    this.popupErros = [];
  }

  private buscarRegistros(exibirPopupSemResultados = true): void {
    const usuarioId = this.usuarioIdAtual;
    if (!usuarioId) {
      return;
    }
    this.listLoading = true;
    this.popupErros = [];
    const filtros = this.buildFiltros();
    this.service.listar(usuarioId, filtros)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (registros) => {
          this.registros = registros ?? [];
          this.listLoading = false;
          if (exibirPopupSemResultados && !this.registros.length) {
            this.popupTitulo = 'Aviso';
            this.popupErros = new PopupErrorBuilder().adicionar('Nenhum resultado encontrado.').build();
          }
        },
        error: (erro) => {
          this.listLoading = false;
          const mensagem = erro?.error?.mensagem || 'Não foi possível carregar a listagem.';
          this.popupTitulo = 'Erro';
          this.popupErros = new PopupErrorBuilder().adicionar(mensagem).build();
        }
      });
  }

  private buildFiltros(): InformacaoAdministrativaFiltro {
    const { tipo, categoria, titulo, tags, status } = this.searchForm.value;
    const statusValor = status === '' ? null : status === 'true' || status === true;
    return {
      tipo: tipo?.trim() || undefined,
      categoria: categoria?.trim() || undefined,
      titulo: titulo?.trim() || undefined,
      tags: tags?.trim() || undefined,
      status: statusValor
    };
  }

  private buildFiltrosRelatorio(usuarioEmissor: string): any {
    const filtros = this.buildFiltros();
    return {
      ...filtros,
      usuarioEmissor
    };
  }

  private buildPayload(): InformacaoAdministrativaPayload {
    const valor = this.form.value as any;
    return {
      tipo: valor.tipo,
      categoria: valor.categoria,
      titulo: valor.titulo,
      descricao: valor.descricao,
      responsavel: valor.responsavel,
      hostUrl: valor.hostUrl,
      porta: valor.porta ? Number(valor.porta) : null,
      login: valor.login,
      segredo: valor.segredo,
      tags: valor.tags,
      status: valor.status !== false
    };
  }

  private preencherFormulario(registro: InformacaoAdministrativaResponse): void {
    this.editingId = registro.id;
    this.form.reset({
      tipo: registro.tipo || '',
      categoria: registro.categoria || '',
      titulo: registro.titulo || '',
      descricao: registro.descricao || '',
      responsavel: registro.responsavel || '',
      hostUrl: registro.hostUrl || '',
      porta: registro.porta ?? null,
      login: registro.login || '',
      segredo: '',
      tags: registro.tags || '',
      status: registro.status !== false
    });
  }

  private excluirRegistro(id: number): void {
    const usuarioId = this.usuarioIdAtual;
    if (!usuarioId) {
      return;
    }
    this.service.remover(usuarioId, id).subscribe({
      next: () => {
        this.popupTitulo = 'Sucesso';
        this.popupErros = new PopupErrorBuilder().adicionar('Registro excluído com sucesso.').build();
        this.editingId = null;
        this.buscarRegistros(false);
      },
      error: (erro) => {
        const mensagem = erro?.error?.mensagem || 'Não foi possível excluir o registro.';
        this.popupTitulo = 'Erro';
        this.popupErros = new PopupErrorBuilder().adicionar(mensagem).build();
      }
    });
  }

  private revelarSegredo(registro: InformacaoAdministrativaResponse): void {
    const usuarioId = this.usuarioIdAtual;
    if (!usuarioId) {
      return;
    }
    this.service.revelar(usuarioId, registro.id).subscribe({
      next: (response) => {
        this.segredoReveladoId = registro.id;
        this.segredoRevelado = response.segredo;
        this.configurarTimeoutSegredo();
      },
      error: (erro) => {
        const mensagem = erro?.error?.mensagem || 'Não foi possível revelar o segredo.';
        this.popupTitulo = 'Erro';
        this.popupErros = new PopupErrorBuilder().adicionar(mensagem).build();
      }
    });
  }

  private copiarSegredo(registro: InformacaoAdministrativaResponse): void {
    const usuarioId = this.usuarioIdAtual;
    if (!usuarioId) {
      return;
    }
    this.service.revelar(usuarioId, registro.id).subscribe({
      next: (response) => {
        const segredo = response.segredo;
        navigator.clipboard.writeText(segredo).then(() => {
          this.service.registrarCopia(usuarioId, registro.id).subscribe();
          this.popupTitulo = 'Sucesso';
          this.popupErros = new PopupErrorBuilder().adicionar('Segredo copiado.').build();
        });
      },
      error: (erro) => {
        const mensagem = erro?.error?.mensagem || 'Não foi possível copiar o segredo.';
        this.popupTitulo = 'Erro';
        this.popupErros = new PopupErrorBuilder().adicionar(mensagem).build();
      }
    });
  }

  private configurarTimeoutSegredo(): void {
    this.limparSegredoRevelado();
    this.segredoTimeout = setTimeout(() => {
      this.segredoReveladoId = null;
      this.segredoRevelado = null;
      this.segredoTimeout = undefined;
    }, 15000);
  }

  private limparSegredoRevelado(): void {
    if (this.segredoTimeout) {
      clearTimeout(this.segredoTimeout);
      this.segredoTimeout = undefined;
    }
  }

  private abrirConfirmacao(titulo: string, mensagem: string, confirmarLabel: string, acao: () => void): void {
    this.dialogTitulo = titulo;
    this.dialogMensagem = mensagem;
    this.dialogConfirmarLabel = confirmarLabel;
    this.dialogAcao = acao;
    this.dialogConfirmacaoAberta = true;
  }

  confirmarDialogo(): void {
    this.dialogConfirmacaoAberta = false;
    this.dialogAcao?.();
    this.dialogAcao = undefined;
  }

  cancelarDialogo(): void {
    this.dialogConfirmacaoAberta = false;
    this.dialogAcao = undefined;
  }

  private abrirPdfEmNovaGuia(arquivo: Blob): void {
    const url = window.URL.createObjectURL(arquivo);
    window.open(url, '_blank');
  }
}





