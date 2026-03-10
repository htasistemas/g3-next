import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, finalize, takeUntil } from 'rxjs';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faHeadset } from '@fortawesome/free-solid-svg-icons';
import { PopupErrorBuilder } from '../../utils/popup-error.builder';
import { AuthService } from '../../services/auth.service';
import { AssistanceUnitService } from '../../services/assistance-unit.service';
import { ConfigService } from '../../services/config.service';
import { AutocompleteComponent, AutocompleteOpcao } from '../compartilhado/autocomplete/autocomplete.component';
import {
  ChamadoImpacto,
  ChamadoPrioridade,
  ChamadoStatus,
  ChamadoTecnicoAcao,
  ChamadoTecnicoAnexo,
  ChamadoTecnicoComentario,
  ChamadoTecnicoPayload,
  ChamadoTecnicoService,
  ChamadoTipo,
} from '../../services/chamado-tecnico.service';
import { TelaBaseComponent } from '../compartilhado/tela-base.component';
import { TelaPadraoComponent } from '../compartilhado/tela-padrao/tela-padrao.component';
import { PopupMessagesComponent } from '../compartilhado/popup-messages/popup-messages.component';
import { DialogComponent } from '../compartilhado/dialog/dialog.component';
import { menuSections } from '../../layout/menu-config';
 

type AbaChamadoTecnico = 'registro' | 'acompanhamento' | 'atendimento';

@Component({
  selector: 'app-chamado-tecnico-detalhe',
  standalone: true,
  templateUrl: './chamado-tecnico-detalhe.component.html',
  styleUrl: './chamado-tecnico-detalhe.component.scss',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    FontAwesomeModule,
    TelaPadraoComponent,
    PopupMessagesComponent,
    AutocompleteComponent,
    DialogComponent,
  ],
})
export class ChamadoTecnicoDetalheComponent extends TelaBaseComponent implements OnInit, OnDestroy {
  private static readonly PERMISSAO_DESENVOLVEDOR = 'ADMINISTRADOR';
  private static readonly EMAIL_ATENDIMENTO = 'adrianomtorresbr@gmail.com';
  private static readonly RESPONSAVEL_ATENDIMENTO = 'Adriano Martins Torres';
  readonly faHeadset = faHeadset;
  readonly acoesToolbar = this.criarConfigAcoes({
    buscar: true,
    novo: true,
    salvar: true,
    cancelar: true,
    excluir: true,
    imprimir: true,
  });

  popupErros: string[] = [];
  popupTitulo = 'Campos obrigatorios';
  feedback: string | null = null;
  carregando = false;
  chamadoId: string | null = null;
  excluirAberto = false;
  activeTab: AbaChamadoTecnico = 'registro';
  tabs: { id: AbaChamadoTecnico; label: string }[] = [];
  modoTela: 'usuario' | 'desenvolvedor' = 'usuario';
  destinoChamado = 'htasistemas@gmail.com';

  statusOptions: ChamadoStatus[] = [
    'ABERTO',
    'EM_ANALISE',
    'EM_DESENVOLVIMENTO',
    'EM_TESTE',
    'AGUARDANDO_CLIENTE',
    'RESOLVIDO',
    'FECHADO',
    'REABERTO',
    'CANCELADO',
  ];
  statusAtendimento: { valor: ChamadoStatus; label: string }[] = [
    { valor: 'RESOLVIDO', label: 'Resolvido' },
    { valor: 'FECHADO', label: 'Fechado' },
    { valor: 'EM_DESENVOLVIMENTO', label: 'Em desenvolvimento' },
    { valor: 'EM_ANALISE', label: 'Em análise' },
    { valor: 'AGUARDANDO_CLIENTE', label: 'Aguardando cliente' },
    { valor: 'EM_TESTE', label: 'Em teste' },
    { valor: 'REABERTO', label: 'Reaberto' },
    { valor: 'CANCELADO', label: 'Não será implementado' },
  ];
  prioridadeOptions: ChamadoPrioridade[] = ['BAIXA', 'MEDIA', 'ALTA', 'CRITICA'];
  tipoOptions: ChamadoTipo[] = ['ERRO', 'MELHORIA', 'NOVA_IMPLEMENTACAO', 'CORRECAO'];
  impactoOptions: ChamadoImpacto[] = ['BAIXO', 'MEDIO', 'ALTO'];

  acoes: ChamadoTecnicoAcao[] = [];
  comentarios: ChamadoTecnicoComentario[] = [];
  anexos: ChamadoTecnicoAnexo[] = [];
  anexosPendentes: File[] = [];
  previewsAnexos: { url: string; nome: string }[] = [];

  comentarioTexto = '';
  comentarioReabrirTexto = '';

  form!: FormGroup;
  moduloTermo = '';
  menuTermo = '';
  moduloOpcoes: AutocompleteOpcao[] = [];
  menuOpcoes: AutocompleteOpcao[] = [];
  private moduloOpcoesBase: AutocompleteOpcao[] = [];
  private menuOpcoesBase: AutocompleteOpcao[] = [];

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly fb: FormBuilder,
    private readonly service: ChamadoTecnicoService,
    private readonly authService: AuthService,
    private readonly assistanceUnitService: AssistanceUnitService,
    private readonly configService: ConfigService,
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {
    super();
  }

  ngOnInit(): void {
    this.form = this.fb.group({
      titulo: ['', [Validators.required, Validators.maxLength(200)]],
      descricao: ['', [Validators.required]],
      tipo: ['NOVA_IMPLEMENTACAO' as ChamadoTipo, Validators.required],
      status: ['ABERTO' as ChamadoStatus, Validators.required],
      prioridade: ['BAIXA' as ChamadoPrioridade, Validators.required],
      impacto: ['MEDIO' as ChamadoImpacto, Validators.required],
      modulo: ['', [Validators.required, Validators.maxLength(120)]],
      menu: ['', [Validators.required, Validators.maxLength(160)]],
      cliente: ['', [Validators.required, Validators.maxLength(160)]],
      ambiente: ['PRODUCAO'],
      versao_sistema: [''],
      prazo_sla_em_horas: [''],
      responsavel_usuario_id: [''],
      responsavel_usuario_nome: [''],
      resposta_desenvolvedor: [''],
      respondido_por_usuario_id: [''],
    });
    this.configurarModuloMenu();
    this.carregarClientePrincipal();
    this.carregarDestinoChamados();
    this.route.data.pipe(takeUntil(this.destroy$)).subscribe((data) => {
      this.modoTela = data['perfil'] === 'desenvolvedor' ? 'desenvolvedor' : 'usuario';
      this.configurarTabs();
      this.validarPermissaoTela();
      if (this.ehUsuarioAtendimento()) {
        this.definirResponsavelLogado();
      }
    });
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.chamadoId = id;
        this.carregarChamado();
      } else {
        this.chamadoId = null;
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.previewsAnexos.forEach((preview) => URL.revokeObjectURL(preview.url));
  }

  onBuscar(): void {
    this.router.navigate([this.rotaBase()]);
  }

  onNovo(): void {
    if (this.modoTela === 'desenvolvedor') {
      this.router.navigate(['/configuracoes/chamados-tecnicos-dev/novo']);
      return;
    }
    this.router.navigate(['/configuracoes/chamados-tecnicos/novo']);
  }

  onCancel(): void {
    this.limparFormulario();
    if (this.chamadoId) {
      this.router.navigate([this.rotaBase()]);
    }
  }

  onFechar(): void {
    this.router.navigate([this.rotaBase()]);
  }

  onSave(): void {
    if (this.form.invalid) {
      this.popupErros = new PopupErrorBuilder()
        .adicionar('Preencha os campos obrigatórios antes de salvar.')
        .build();
      return;
    }
    const payload = this.buildPayload();
    if (this.chamadoId) {
      this.service.atualizar(this.chamadoId, payload).subscribe({
        next: () => {
          this.feedback = null;
          this.popupTitulo = 'Sucesso';
          this.popupErros = new PopupErrorBuilder()
            .adicionar('Chamado atualizado com sucesso.')
            .build();
          this.carregarChamado();
        },
        error: () => {
          this.popupErros = new PopupErrorBuilder()
            .adicionar('Não foi possível atualizar o chamado.')
            .build();
        },
      });
    } else {
      this.popupTitulo = 'Enviando';
      this.popupErros = new PopupErrorBuilder()
        .adicionar('Enviando chamado para o setor de desenvolvimento...')
        .build();
      this.service.criar(payload).subscribe({
        next: (novo) => {
          this.feedback = null;
          this.popupTitulo = 'Sucesso';
          this.popupErros = new PopupErrorBuilder()
            .adicionar('Seu chamado foi enviado para o setor de desenvolvimento.')
            .build();
          if (novo.id) {
            this.enviarAnexosPendentes(novo.id);
          }
          this.router.navigate([this.rotaBase()]);
        },
        error: () => {
          this.popupErros = new PopupErrorBuilder()
            .adicionar('Não foi possível criar o chamado.')
            .build();
        },
      });
    }
  }

  carregarChamado(): void {
    if (!this.chamadoId) return;
    this.carregando = true;
    this.service
      .detalhar(this.chamadoId)
      .pipe(finalize(() => (this.carregando = false)))
      .subscribe({
        next: (chamado) => {
          this.form.patchValue(chamado as any);
          if (this.ehUsuarioAtendimento()) {
            this.definirResponsavelLogado();
          }
          this.moduloTermo = chamado.modulo || '';
          this.menuTermo = chamado.menu || '';
          this.atualizarMenuOpcoes(this.moduloTermo);
          this.carregarAbaDados();
        },
        error: () => {
          this.popupErros = new PopupErrorBuilder()
            .adicionar('Não foi possível carregar o chamado.')
            .build();
        },
      });
  }

  carregarAbaDados(): void {
    if (!this.chamadoId) return;
    this.service.listarAcoes(this.chamadoId).subscribe((data) => (this.acoes = data));
    this.service.listarComentarios(this.chamadoId).subscribe((data: ChamadoTecnicoComentario[]) => {
      this.comentarios = data;
    });
    this.service.listarAnexos(this.chamadoId).subscribe((data) => (this.anexos = data));
  }

  onExcluir(): void {
    if (!this.chamadoId) {
      this.popupErros = new PopupErrorBuilder()
        .adicionar('Selecione um chamado para excluir.')
        .build();
      return;
    }
    this.excluirAberto = true;
  }

  confirmarExcluir(): void {
    if (!this.chamadoId) {
      this.excluirAberto = false;
      return;
    }
    const id = this.chamadoId;
    const usuarioId = this.usuarioAtualId;
    this.service.remover(id, usuarioId).subscribe({
      next: () => {
        this.excluirAberto = false;
        this.feedback = null;
        this.popupTitulo = 'Sucesso';
        this.popupErros = new PopupErrorBuilder()
          .adicionar('Chamado excluído com sucesso.')
          .build();
        this.router.navigate([this.rotaBase()]);
      },
      error: () => {
        this.excluirAberto = false;
        this.popupErros = new PopupErrorBuilder()
          .adicionar('Não foi possível excluir o chamado.')
          .build();
      },
    });
  }

  cancelarExcluir(): void {
    this.excluirAberto = false;
  }

  onImprimir(): void {
    window.print();
  }

  reabrirChamado(): void {
    if (!this.chamadoId) return;
    if (!this.comentarioReabrirTexto.trim()) {
      this.popupErros = new PopupErrorBuilder()
        .adicionar('Informe um comentário para reabrir o chamado.')
        .build();
      return;
    }
    const usuarioId = this.usuarioAtualId;
    const comentario = this.comentarioReabrirTexto.trim();
    this.service.alterarStatus(this.chamadoId, 'REABERTO', usuarioId).subscribe({
      next: () => {
        this.service.adicionarComentario(this.chamadoId!, comentario, usuarioId).subscribe({
          next: () => {
            this.popupTitulo = 'Sucesso';
            this.popupErros = new PopupErrorBuilder()
              .adicionar('Chamado reaberto com sucesso.')
              .build();
            this.comentarioReabrirTexto = '';
            this.carregarChamado();
          },
          error: () => {
            this.popupErros = new PopupErrorBuilder()
              .adicionar('Chamado reaberto, mas não foi possível salvar o comentário.')
              .build();
            this.comentarioReabrirTexto = '';
            this.carregarChamado();
          },
        });
      },
      error: () => {
        this.popupErros = new PopupErrorBuilder()
          .adicionar('Não foi possível reabrir o chamado.')
          .build();
      },
    });
  }

  encerrarChamado(): void {
    if (!this.chamadoId) return;
    const usuarioId = this.usuarioAtualId;
    const comentario = 'Chamado encerrado pelo usuário.';
    this.service.alterarStatus(this.chamadoId, 'FECHADO', usuarioId).subscribe({
      next: () => {
        this.service.adicionarComentario(this.chamadoId!, comentario, usuarioId).subscribe({
          next: () => {
            this.popupTitulo = 'Sucesso';
            this.popupErros = new PopupErrorBuilder()
              .adicionar('Chamado encerrado com sucesso.')
              .build();
            this.carregarChamado();
          },
          error: () => {
            this.popupErros = new PopupErrorBuilder()
              .adicionar('Chamado encerrado, mas não foi possível salvar o comentário.')
              .build();
            this.carregarChamado();
          },
        });
      },
      error: () => {
        this.popupErros = new PopupErrorBuilder()
          .adicionar('Não foi possível encerrar o chamado.')
          .build();
      },
    });
  }

  adicionarComentario(): void {
    if (!this.chamadoId || !this.comentarioTexto.trim()) return;
    const usuarioId = this.usuarioAtualId;
    this.service.adicionarComentario(this.chamadoId, this.comentarioTexto.trim(), usuarioId).subscribe({
      next: (comentario) => {
        this.comentarios = [comentario, ...this.comentarios];
        this.comentarioTexto = '';
      },
      error: () => {
        this.popupErros = new PopupErrorBuilder()
          .adicionar('Não foi possível adicionar o comentário.')
          .build();
      },
    });
  }

  selecionarArquivo(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.adicionarPreview(file);
    if (!this.chamadoId) {
      this.anexosPendentes = [...this.anexosPendentes, file];
      return;
    }
    this.enviarAnexoArquivo(this.chamadoId, file);
  }

  onColarImagem(event: ClipboardEvent): void {
    const itens = event.clipboardData?.items;
    if (!itens?.length) return;
    const imagens: File[] = [];
    for (const item of itens) {
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const blob = item.getAsFile();
        if (blob) {
          const nomeArquivo = `print-${new Date().getTime()}.${blob.type.split('/')[1] ?? 'png'}`;
          imagens.push(new File([blob], nomeArquivo, { type: blob.type }));
        }
      }
    }
    if (!imagens.length) return;
    event.preventDefault();
    imagens.forEach((arquivo) => this.adicionarPreview(arquivo));
    if (!this.chamadoId) {
      this.anexosPendentes = [...this.anexosPendentes, ...imagens];
      return;
    }
    imagens.forEach((arquivo) => this.enviarAnexoArquivo(this.chamadoId!, arquivo));
  }

  changeTab(tab: AbaChamadoTecnico): void {
    this.activeTab = tab;
  }

  get activeTabIndex(): number {
    return this.tabs.findIndex((tab) => tab.id === this.activeTab);
  }

  formatStatus(status?: string): string {
    if (!status) return '---';
    return status.replace(/[_-]+/g, ' ');
  }

  formatarTipoAcao(tipo: string): string {
    return tipo ? tipo.replace(/_/g, ' ') : '---';
  }

  formatTipo(tipo?: string): string {
    switch (tipo) {
      case 'ERRO':
        return 'Erro';
      case 'MELHORIA':
        return 'Melhoria';
      case 'NOVA_IMPLEMENTACAO':
        return 'Nova implementação';
      case 'CORRECAO':
        return 'Correção';
      default:
        return '---';
    }
  }

  detalhesAcao(acao: ChamadoTecnicoAcao): string[] {
    const detalhes: string[] = [];
    if (acao.de_status || acao.para_status) {
      detalhes.push(
        `Status: ${this.formatStatus(acao.de_status || '')} -> ${this.formatStatus(acao.para_status || '')}`
      );
    }
    if (acao.de_responsavel_id || acao.para_responsavel_id) {
      detalhes.push(
        `Responsável: ${acao.de_responsavel_id ?? '---'} -> ${acao.para_responsavel_id ?? '---'}`
      );
    }
    if (acao.criado_por_usuario_id) {
      detalhes.push(`Registrado por: ${acao.criado_por_usuario_id}`);
    }
    if (acao.tipo) {
      detalhes.unshift(`Tipo: ${this.formatarTipoAcao(acao.tipo)}`);
    }
    return detalhes;
  }

  nomeRegistradoPor(acao: ChamadoTecnicoAcao): string {
    const usuarioId = this.usuarioAtualId;
    if (usuarioId && acao.criado_por_usuario_id === usuarioId) {
      return this.nomeUsuarioLogado() || 'Você';
    }
    return acao.criado_por_usuario_id ? String(acao.criado_por_usuario_id) : '---';
  }

  nomeRegistradoPorComentario(comentario: ChamadoTecnicoComentario): string {
    const usuarioId = this.usuarioAtualId;
    if (usuarioId && comentario.criado_por_usuario_id === usuarioId) {
      return this.nomeUsuarioLogado() || 'Você';
    }
    return this.nomeUsuarioLogado() || (comentario.criado_por_usuario_id ? String(comentario.criado_por_usuario_id) : '---');
  }

  isImagemAnexo(anexo: ChamadoTecnicoAnexo): boolean {
    const mime = (anexo.mime_type || '').toLowerCase();
    return mime.startsWith('image/');
  }

  private enviarAnexoArquivo(chamadoId: string, file: File): void {
    const reader = new FileReader();
    reader.onload = () => {
      const conteudo = (reader.result as string) || '';
      const usuarioId = this.usuarioAtualId;
      this.service
        .adicionarAnexo(
          chamadoId,
          {
            nome_arquivo: file.name,
            mime_type: file.type,
            tamanho_bytes: file.size,
            conteudo_base64: conteudo,
          },
          usuarioId
        )
        .subscribe({
          next: (anexo) => {
            this.anexos = [anexo, ...this.anexos];
          },
          error: () => {
            this.popupErros = new PopupErrorBuilder()
              .adicionar('Não foi possível adicionar o anexo.')
              .build();
          },
        });
    };
    reader.readAsDataURL(file);
  }

  private enviarAnexosPendentes(chamadoId: string): void {
    if (!this.anexosPendentes.length) return;
    const pendentes = [...this.anexosPendentes];
    this.anexosPendentes = [];
    pendentes.forEach((arquivo) => this.enviarAnexoArquivo(chamadoId, arquivo));
  }

  private adicionarPreview(file: File): void {
    const url = URL.createObjectURL(file);
    this.previewsAnexos = [...this.previewsAnexos, { url, nome: file.name }];
  }

  private buildPayload(): ChamadoTecnicoPayload {
    const usuarioId = this.usuarioAtualId;
    const raw = this.form.getRawValue();
    const payload: ChamadoTecnicoPayload = {
      ...raw,
      criado_por_usuario_id: usuarioId ?? undefined,
      respondido_por_usuario_id:
        this.ehUsuarioAtendimento() && raw.resposta_desenvolvedor
          ? usuarioId ?? undefined
          : undefined,
      responsavel_usuario_id: this.ehUsuarioAtendimento()
        ? usuarioId ?? undefined
        : raw.responsavel_usuario_id
        ? Number(raw.responsavel_usuario_id)
        : undefined,
      prazo_sla_em_horas: raw.prazo_sla_em_horas ? Number(raw.prazo_sla_em_horas) : undefined,
    };
    delete (payload as any).responsavel_usuario_nome;
    if (!this.chamadoId) {
      delete payload.resposta_desenvolvedor;
      delete payload.respondido_por_usuario_id;
    }
    if (!this.ehUsuarioAtendimento()) {
      delete payload.resposta_desenvolvedor;
      delete payload.respondido_por_usuario_id;
    }
    return payload;
  }

  abrirChamadoSelecionado(chamado: ChamadoTecnicoPayload): void {
    if (!chamado.id) return;
    this.router.navigate([this.rotaBase(), chamado.id]);
  }

  get usuarioAtualId(): number | null {
    return Number(this.authService.user()?.id || 0) || null;
  }

  private configurarTabs(): void {
    const baseTabs: { id: AbaChamadoTecnico; label: string }[] = [
      { id: 'registro', label: 'Registro do chamado' },
      { id: 'acompanhamento', label: 'Acompanhamento' },
    ];
    if (this.ehUsuarioAtendimento()) {
      baseTabs.push({ id: 'atendimento', label: 'Desenvolvimento' });
    }
    this.tabs = baseTabs;
    if (!this.tabs.find((tab) => tab.id === this.activeTab)) {
      this.activeTab = 'registro';
    }
  }

  private validarPermissaoTela(): void {
    if (this.modoTela !== 'desenvolvedor') return;
    if (this.ehUsuarioAtendimento()) return;
    const permissoes = this.authService.user()?.permissoes ?? [];
    if (!permissoes.includes(ChamadoTecnicoDetalheComponent.PERMISSAO_DESENVOLVEDOR)) {
      this.router.navigate(['/configuracoes/chamados-tecnicos']);
    }
  }

  private ehUsuarioAtendimento(): boolean {
    const usuario = this.authService.user();
    const email = (usuario?.email || '').trim().toLowerCase();
    const nomeUsuario = (usuario?.nomeUsuario || '').trim().toLowerCase();
    return (
      email === ChamadoTecnicoDetalheComponent.EMAIL_ATENDIMENTO
      || nomeUsuario === ChamadoTecnicoDetalheComponent.EMAIL_ATENDIMENTO
    );
  }

  private rotaBase(): string {
    return this.modoTela === 'desenvolvedor'
      ? '/configuracoes/chamados-tecnicos-dev'
      : '/configuracoes/chamados-tecnicos';
  }

  private configurarModuloMenu(): void {
    this.moduloOpcoesBase = menuSections.map((section) => ({
      id: section.label,
      label: section.label,
    }));
    this.menuOpcoesBase = this.listarMenus();
    this.moduloOpcoes = [...this.moduloOpcoesBase];
    this.menuOpcoes = [...this.menuOpcoesBase];
  }

  atualizarTermoModulo(termo: string): void {
    this.moduloTermo = termo;
    this.form.patchValue({ modulo: termo });
    this.moduloOpcoes = this.filtrarOpcoes(this.moduloOpcoesBase, termo);
    this.atualizarMenuOpcoes(termo);
  }

  selecionarModulo(opcao: AutocompleteOpcao): void {
    this.moduloTermo = opcao.label;
    this.form.patchValue({ modulo: opcao.label });
    this.atualizarMenuOpcoes(opcao.label);
  }

  atualizarTermoMenu(termo: string): void {
    this.menuTermo = termo;
    this.form.patchValue({ menu: termo });
    this.menuOpcoes = this.filtrarOpcoes(this.menuOpcoesBase, termo);
  }

  selecionarMenu(opcao: AutocompleteOpcao): void {
    this.menuTermo = opcao.label;
    this.form.patchValue({ menu: opcao.label });
    if (opcao.sublabel) {
      this.moduloTermo = opcao.sublabel;
      this.form.patchValue({ modulo: opcao.sublabel });
      this.moduloOpcoes = this.filtrarOpcoes(this.moduloOpcoesBase, opcao.sublabel);
    }
  }

  onVersaoInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = (input.value || '').replace(/\D/g, '').slice(0, 6);
    let formatted = digits;
    if (digits.length > 1) {
      formatted = `${digits.slice(0, 1)}.${digits.slice(1)}`;
    }
    if (digits.length > 3) {
      formatted = `${digits.slice(0, 1)}.${digits.slice(1, 3)}.${digits.slice(3)}`;
    }
    input.value = formatted;
    this.form.get('versao_sistema')?.setValue(formatted, { emitEvent: false });
  }

  private atualizarMenuOpcoes(moduloSelecionado: string): void {
    const moduloNormalizado = this.normalizarTermo(moduloSelecionado);
    if (!moduloNormalizado) {
      this.menuOpcoesBase = this.listarMenus();
      this.menuOpcoes = this.filtrarOpcoes(this.menuOpcoesBase, this.menuTermo);
      return;
    }
    const filtrados = menuSections
      .filter((section) => this.normalizarTermo(section.label) === moduloNormalizado)
      .flatMap((section) =>
        (section.children ?? []).map((child) => ({
          id: child.label,
          label: child.label,
          sublabel: section.label,
        }))
      );
    this.menuOpcoesBase = filtrados.length ? filtrados : this.listarMenus();
    this.menuOpcoes = this.filtrarOpcoes(this.menuOpcoesBase, this.menuTermo);
  }

  private listarMenus(): AutocompleteOpcao[] {
    return menuSections.flatMap((section) =>
      (section.children ?? []).map((child) => ({
        id: child.label,
        label: child.label,
        sublabel: section.label,
      }))
    );
  }

  private filtrarOpcoes(opcoes: AutocompleteOpcao[], termo: string): AutocompleteOpcao[] {
    const filtrado = this.normalizarTermo(termo);
    if (!filtrado) {
      return opcoes;
    }
    return opcoes.filter((opcao) =>
      this.normalizarTermo(opcao.label).includes(filtrado)
    );
  }

  private normalizarTermo(valor: string): string {
    return (valor || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  private carregarClientePrincipal(): void {
    this.assistanceUnitService.get().subscribe({
      next: (response) => {
        const nome = response.unidade?.nomeFantasia || response.unidade?.razaoSocial;
        if (nome) {
          this.form.patchValue({ cliente: nome });
        }
      },
    });
  }

  private carregarDestinoChamados(): void {
    this.configService.getDestinoChamados().subscribe({
      next: (response) => {
        this.destinoChamado = response?.destino || this.destinoChamado;
      },
    });
  }


  private limparFormulario(): void {
    this.form.reset({
      titulo: '',
      descricao: '',
      tipo: 'NOVA_IMPLEMENTACAO',
      status: 'ABERTO',
      prioridade: 'BAIXA',
      impacto: 'MEDIO',
      modulo: '',
      menu: '',
      cliente: this.form.get('cliente')?.value ?? '',
      ambiente: 'PRODUCAO',
      versao_sistema: '',
      prazo_sla_em_horas: '',
      responsavel_usuario_id: this.ehUsuarioAtendimento() ? this.usuarioAtualId : '',
      responsavel_usuario_nome: this.ehUsuarioAtendimento() ? this.nomeUsuarioLogado() : '',
      resposta_desenvolvedor: '',
      respondido_por_usuario_id: '',
    });
    this.moduloTermo = '';
    this.menuTermo = '';
  }

  private definirResponsavelLogado(): void {
    const usuarioId = this.usuarioAtualId;
    if (!usuarioId) return;
    this.form.patchValue({
      responsavel_usuario_id: usuarioId,
      responsavel_usuario_nome: this.nomeUsuarioLogado(),
    });
  }

  private nomeUsuarioLogado(): string {
    const usuario = this.authService.user();
    return usuario?.nome || usuario?.nomeUsuario || '';
  }
}

