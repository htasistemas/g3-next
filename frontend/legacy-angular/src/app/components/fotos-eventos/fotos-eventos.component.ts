import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, firstValueFrom } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faImages } from '@fortawesome/free-solid-svg-icons';
import {
  FotoEventoDetalheResponse,
  FotoEventoFotoResponse,
  FotoEventoRequestPayload,
  FotoEventoResponse,
  FotosEventosService
} from '../../services/fotos-eventos.service';
import { AssistanceUnitPayload, AssistanceUnitService } from '../../services/assistance-unit.service';
import { PopupMessagesComponent } from '../compartilhado/popup-messages/popup-messages.component';
import { DialogComponent } from '../compartilhado/dialog/dialog.component';
import { PopupErrorBuilder } from '../../utils/popup-error.builder';
import { ConfigAcoesCrud, EstadoAcoesCrud, TelaBaseComponent } from '../compartilhado/tela-base.component';
import { TelaPadraoComponent } from '../compartilhado/tela-padrao/tela-padrao.component';
import { titleCaseWords } from '../../utils/capitalization.util';
import { RuntimeConfigService } from '../../services/runtime-config.service';

type FotoUploadItem = {
  arquivo: File;
  preview: string;
  legenda: string;
  creditos: string;
  tags: string;
  ordem: number | null;
  upload: { nomeArquivo: string; contentType: string; conteudo: string };
};

@Component({
  selector: 'app-fotos-eventos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    FontAwesomeModule,
    TelaPadraoComponent,
    PopupMessagesComponent,
    DialogComponent
  ],
  templateUrl: './fotos-eventos.component.html',
  styleUrl: './fotos-eventos.component.scss'
})
export class FotosEventosComponent extends TelaBaseComponent implements OnInit, OnDestroy {
  private readonly runtimeConfig = inject(RuntimeConfigService);
  readonly faImagens = faImages;
  readonly abas = [
    { id: 'lista', label: 'Listagem' },
    { id: 'detalhe', label: 'Detalhe' }
  ] as const;
  abaAtiva: (typeof this.abas)[number]['id'] = 'lista';
  filtrosForm: FormGroup;
  eventoForm: FormGroup;
  fotoForm: FormGroup;

  feedback: string | null = null;
  popupErros: string[] = [];
  listLoading = false;
  eventos: FotoEventoResponse[] = [];
  unidades: AssistanceUnitPayload[] = [];
  paginaAtual = 0;
  totalPaginas = 1;
  totalRegistros = 0;

  detalheLoading = false;
  eventoSelecionado: FotoEventoResponse | null = null;
  fotosEvento: FotoEventoFotoResponse[] = [];

  formularioAberto = false;
  eventoEmEdicaoId: number | null = null;
  uploadPrincipalPreview: string | null = null;
  salvandoEvento = false;

  galeriaUploadAberta = false;
  fotosUpload: FotoUploadItem[] = [];
  enviandoFotos = false;

  lightboxAberto = false;
  lightboxUrl: string | null = null;
  lightboxLegenda: string | null = null;

  editarFotoAberto = false;
  fotoEmEdicao: FotoEventoFotoResponse | null = null;

  confirmarExclusaoAberta = false;
  confirmarExclusaoMensagem = '';
  eventoParaExcluir: FotoEventoResponse | null = null;
  fotoParaExcluir: FotoEventoFotoResponse | null = null;

  private readonly destroy$ = new Subject<void>();
  private feedbackTimeout?: ReturnType<typeof setTimeout>;
  private detalheId: number | null = null;
  private readonly tiposImagemPermitidos = ['image/jpeg', 'image/png', 'image/webp'];

  readonly statusOpcoes = [
    { valor: 'PLANEJADO', label: 'Planejado' },
    { valor: 'REALIZADO', label: 'Realizado' },
    { valor: 'CANCELADO', label: 'Cancelado' },
    { valor: 'ARQUIVADO', label: 'Arquivado' }
  ];

  readonly ordenacaoOpcoes = [
    { valor: 'MAIS_RECENTE', label: 'Mais recente' },
    { valor: 'MAIS_ANTIGO', label: 'Mais antigo' },
    { valor: 'A_Z', label: 'A-Z' },
    { valor: 'Z_A', label: 'Z-A' },
    { valor: 'MAIS_FOTOS', label: 'Mais fotos' }
  ];

  readonly acoesToolbar: Required<ConfigAcoesCrud> = this.criarConfigAcoes({    
    novo: true,
    cancelar: true,
    buscar: true
  });

  get acoesDesabilitadas(): EstadoAcoesCrud {
    return {
      novo: this.salvandoEvento || this.enviandoFotos,
      cancelar: this.salvandoEvento || this.enviandoFotos,
      buscar: this.salvandoEvento || this.enviandoFotos
    };
  }

  get mostrandoDetalhe(): boolean {
    return this.detalheId !== null;
  }

  constructor(
    private readonly fb: FormBuilder,
    private readonly service: FotosEventosService,
    private readonly unidadeService: AssistanceUnitService,
    private readonly route: ActivatedRoute,
    private readonly router: Router
  ) {
    super();
    this.filtrosForm = this.fb.group({
      busca: [''],
      dataInicio: [''],
      dataFim: [''],
      status: [''],
      tags: [''],
      ordenacao: ['MAIS_RECENTE']
    });
    this.eventoForm = this.fb.group({
      titulo: ['', Validators.required],
      dataEvento: ['', Validators.required],
      local: [''],
      descricao: [''],
      status: ['PLANEJADO'],
      tags: [''],
      unidadeId: [''],
      fotoPrincipalUpload: [null as FotoEventoRequestPayload['fotoPrincipalUpload'] | null, Validators.required]
    });
    this.fotoForm = this.fb.group({
      legenda: [''],
      creditos: [''],
      tags: [''],
      ordem: ['']
    });
  }

  ngOnInit(): void {
    this.carregarUnidades();
    this.carregarEventos();

    this.filtrosForm.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.paginaAtual = 0;
    });

    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const idParam = params.get('id');
      this.detalheId = idParam ? Number(idParam) : null;
      this.abaAtiva = this.detalheId ? 'detalhe' : 'lista';
      if (this.detalheId) {
        this.carregarDetalhe(this.detalheId);
      } else {
        this.eventoSelecionado = null;
        this.fotosEvento = [];
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.feedbackTimeout) {
      clearTimeout(this.feedbackTimeout);
    }
  }

  carregarEventos(): void {
    const filtros = this.filtrosForm.value;
    this.listLoading = true;
    this.service
      .listar({
        busca: this.normalizarTexto(filtros.busca),
        dataInicio: filtros.dataInicio || undefined,
        dataFim: filtros.dataFim || undefined,
        status: filtros.status || undefined,
        tags: this.normalizarTags(filtros.tags),
        ordenacao: filtros.ordenacao || undefined,
        pagina: this.paginaAtual,
        tamanho: 12
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.eventos = (response.eventos ?? []).map((evento) => this.normalizarEvento(evento));
          this.totalPaginas = response.totalPaginas || 1;
          this.totalRegistros = response.total || 0;
          this.listLoading = false;
        },
        error: () => {
          this.listLoading = false;
          this.popupErros = new PopupErrorBuilder()
            .adicionar('Nao foi possivel carregar os eventos.')
            .build();
        }
      });
  }

  carregarUnidades(): void {
    this.unidadeService
      .list()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (unidades) => {
          this.unidades = unidades ?? [];
        },
        error: () => {
          this.unidades = [];
        }
      });
  }

  aplicarFiltros(): void {
    this.paginaAtual = 0;
    this.carregarEventos();
  }

  limparFiltros(): void {
    this.filtrosForm.reset({
      busca: '',
      dataInicio: '',
      dataFim: '',
      status: '',
      tags: '',
      ordenacao: 'MAIS_RECENTE'
    });
    this.paginaAtual = 0;
    this.carregarEventos();
  }

  onBuscar(): void {
    if (this.mostrandoDetalhe) {
      this.voltarLista();
      return;
    }
    this.aplicarFiltros();
  }

  alterarAba(id: (typeof this.abas)[number]['id']): void {
    this.abaAtiva = id;
    if (id === 'lista' && this.mostrandoDetalhe) {
      this.voltarLista();
      return;
    }
    if (id === 'detalhe' && !this.mostrandoDetalhe && this.eventoSelecionado) {
      this.abrirDetalhe(this.eventoSelecionado);
    }
  }

  proximaPagina(): void {
    if (this.paginaAtual + 1 >= this.totalPaginas) return;
    this.paginaAtual += 1;
    this.carregarEventos();
  }

  paginaAnterior(): void {
    if (this.paginaAtual <= 0) return;
    this.paginaAtual -= 1;
    this.carregarEventos();
  }

  abrirDetalhe(evento: FotoEventoResponse): void {
    this.router.navigate(['/administrativo/fotos-eventos', evento.id]);
  }

  voltarLista(): void {
    this.router.navigate(['/administrativo/fotos-eventos']);
  }

  carregarDetalhe(id: number): void {
    this.detalheLoading = true;
    this.service
      .obter(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: FotoEventoDetalheResponse) => {
          this.eventoSelecionado = this.normalizarEvento(response.evento);
          this.fotosEvento = (response.fotos ?? []).map((foto) => this.normalizarFoto(foto));
          this.detalheLoading = false;
        },
        error: () => {
          this.detalheLoading = false;
          this.popupErros = new PopupErrorBuilder()
            .adicionar('Nao foi possivel carregar o detalhe do evento.')
            .build();
        }
      });
  }

  abrirFormularioNovo(): void {
    this.formularioAberto = true;
    this.eventoEmEdicaoId = null;
    this.atualizarValidacaoFotoPrincipal(true);
    this.eventoForm.reset({
      titulo: '',
      dataEvento: '',
      local: '',
      descricao: '',
      status: 'PLANEJADO',
      tags: '',
      unidadeId: '',
      fotoPrincipalUpload: null
    });
    this.uploadPrincipalPreview = null;
  }

  abrirFormularioEdicao(evento?: FotoEventoResponse): void {
    const alvo = evento ?? this.eventoSelecionado;
    if (!alvo) return;
    this.eventoSelecionado = alvo;
    this.formularioAberto = true;
    this.eventoEmEdicaoId = alvo.id;
    this.atualizarValidacaoFotoPrincipal(false);
    this.eventoForm.reset({
      titulo: alvo.titulo || '',
      dataEvento: alvo.dataEvento || '',
      local: alvo.local || '',
      descricao: alvo.descricao || '',
      status: alvo.status || 'PLANEJADO',
      tags: (alvo.tags || []).join(', '),
      unidadeId: alvo.unidadeId ? String(alvo.unidadeId) : '',
      fotoPrincipalUpload: null
    });
    this.uploadPrincipalPreview = alvo.fotoPrincipalUrl || null;
  }

  fecharFormulario(): void {
    this.formularioAberto = false;
    this.eventoEmEdicaoId = null;
    this.uploadPrincipalPreview = null;
    this.atualizarValidacaoFotoPrincipal(true);
  }

  async salvarEvento(): Promise<void> {
    if (this.eventoForm.invalid) {
      this.eventoForm.markAllAsTouched();
      this.popupErros = new PopupErrorBuilder()
        .adicionar('Preencha os campos obrigatorios do evento.')
        .build();
      return;
    }

    const payload = this.montarPayloadEvento();
    const idEdicao = this.eventoEmEdicaoId ?? this.eventoSelecionado?.id ?? null;
    if (!payload.fotoPrincipalUpload && !idEdicao) {
      this.popupErros = new PopupErrorBuilder()
        .adicionar('Informe a foto principal do evento.')
        .build();
      return;
    }

    this.salvandoEvento = true;
    try {
      const response = idEdicao
        ? await firstValueFrom(this.service.atualizar(idEdicao, payload))
        : await firstValueFrom(this.service.criar(payload));
      this.salvandoEvento = false;
      this.formularioAberto = false;
      this.mostrarFeedback('Evento salvo com sucesso.');
      this.carregarEventos();
      this.router.navigate(['/administrativo/fotos-eventos', response.id]);
    } catch {
      this.salvandoEvento = false;
      this.popupErros = new PopupErrorBuilder()
        .adicionar('Nao foi possivel salvar o evento.')
        .build();
    }
  }

  confirmarExcluirEvento(evento?: FotoEventoResponse): void {
    const alvo = evento ?? this.eventoSelecionado;
    if (!alvo) return;
    this.confirmarExclusaoMensagem = 'Deseja excluir este evento?';
    this.eventoParaExcluir = alvo;
    this.fotoParaExcluir = null;
    this.confirmarExclusaoAberta = true;
  }

  confirmarExcluirFoto(foto: FotoEventoFotoResponse): void {
    this.confirmarExclusaoMensagem = 'Deseja remover esta foto?';
    this.eventoParaExcluir = null;
    this.fotoParaExcluir = foto;
    this.confirmarExclusaoAberta = true;
  }

  cancelarExcluir(): void {
    this.confirmarExclusaoAberta = false;
    this.eventoParaExcluir = null;
    this.fotoParaExcluir = null;
  }

  async executarExcluir(): Promise<void> {
    if (this.eventoParaExcluir) {
      const id = this.eventoParaExcluir.id;
      this.confirmarExclusaoAberta = false;
      try {
        await firstValueFrom(this.service.excluir(id));
        this.mostrarFeedback('Evento removido com sucesso.');
        this.voltarLista();
        this.carregarEventos();
      } catch {
        this.popupErros = new PopupErrorBuilder()
          .adicionar('Nao foi possivel excluir o evento.')
          .build();
      }
      return;
    }

    if (this.fotoParaExcluir && this.eventoSelecionado) {
      const eventoId = this.eventoSelecionado.id;
      const fotoId = this.fotoParaExcluir.id;
      this.confirmarExclusaoAberta = false;
      try {
        await firstValueFrom(this.service.removerFoto(eventoId, fotoId));
        this.mostrarFeedback('Foto removida com sucesso.');
        this.carregarDetalhe(eventoId);
        this.carregarEventos();
      } catch {
        this.popupErros = new PopupErrorBuilder()
          .adicionar('Nao foi possivel remover a foto.')
          .build();
      }
    }
  }

  abrirUploadFotos(evento?: FotoEventoResponse): void {
    const alvo = evento ?? this.eventoSelecionado;
    if (!alvo) return;
    this.eventoSelecionado = alvo;
    this.galeriaUploadAberta = true;
    this.fotosUpload = [];
  }

  fecharUploadFotos(): void {
    this.galeriaUploadAberta = false;
    this.fotosUpload = [];
  }

  async enviarFotos(): Promise<void> {
    if (!this.eventoSelecionado || !this.fotosUpload.length) {
      this.mostrarFeedback('Selecione ao menos uma foto para enviar.');
      return;
    }

    this.enviandoFotos = true;
    try {
      for (const foto of this.fotosUpload) {
        await firstValueFrom(
          this.service.adicionarFoto(this.eventoSelecionado.id, {
            arquivo: foto.upload,
            legenda: foto.legenda,
            creditos: foto.creditos,
            tags: this.normalizarTags(foto.tags),
            ordem: foto.ordem
          })
        );
      }
      this.enviandoFotos = false;
      this.galeriaUploadAberta = false;
      this.mostrarFeedback('Fotos adicionadas com sucesso.');
      this.carregarDetalhe(this.eventoSelecionado.id);
      this.carregarEventos();
    } catch {
      this.enviandoFotos = false;
      this.popupErros = new PopupErrorBuilder()
        .adicionar('Nao foi possivel enviar as fotos.')
        .build();
    }
  }

  abrirLightbox(foto: FotoEventoFotoResponse): void {
    this.lightboxAberto = true;
    this.lightboxUrl = foto.arquivoUrl || null;
    this.lightboxLegenda = foto.legenda || null;
  }

  fecharLightbox(): void {
    this.lightboxAberto = false;
    this.lightboxUrl = null;
    this.lightboxLegenda = null;
  }

  abrirEdicaoFoto(foto: FotoEventoFotoResponse): void {
    this.fotoEmEdicao = foto;
    this.editarFotoAberto = true;
    this.fotoForm.reset({
      legenda: foto.legenda || '',
      creditos: foto.creditos || '',
      tags: (foto.tags || []).join(', '),
      ordem: foto.ordem ?? ''
    });
  }

  fecharEdicaoFoto(): void {
    this.editarFotoAberto = false;
    this.fotoEmEdicao = null;
  }

  async salvarEdicaoFoto(): Promise<void> {
    if (!this.fotoEmEdicao || !this.eventoSelecionado) return;
    const legenda = (this.fotoForm.get('legenda')?.value as string) || '';
    const creditos = (this.fotoForm.get('creditos')?.value as string) || '';
    const tags = this.normalizarTags(this.fotoForm.get('tags')?.value as string);
    const ordemRaw = this.fotoForm.get('ordem')?.value as string;
    const ordem = ordemRaw !== '' ? Number(ordemRaw) : null;
    try {
      await firstValueFrom(
        this.service.atualizarFoto(this.eventoSelecionado.id, this.fotoEmEdicao.id, {
          legenda,
          creditos,
          tags,
          ordem
        })
      );
      this.fecharEdicaoFoto();
      this.mostrarFeedback('Foto atualizada com sucesso.');
      this.carregarDetalhe(this.eventoSelecionado.id);
    } catch {
      this.popupErros = new PopupErrorBuilder()
        .adicionar('Nao foi possivel atualizar a foto.')
        .build();
    }
  }

  async definirFotoPrincipal(foto: FotoEventoFotoResponse): Promise<void> {
    if (!this.eventoSelecionado) return;
    try {
      await firstValueFrom(
        this.service.atualizar(this.eventoSelecionado.id, {
          ...this.montarPayloadEventoSelecionado(),
          fotoPrincipalId: foto.id
        })
      );
      this.mostrarFeedback('Foto principal atualizada.');
      this.carregarDetalhe(this.eventoSelecionado.id);
      this.carregarEventos();
    } catch {
      this.popupErros = new PopupErrorBuilder()
        .adicionar('Nao foi possivel atualizar a foto principal.')
        .build();
    }
  }

  onFotoPrincipalSelecionada(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const erro = this.validarArquivoImagem(file);
    if (erro) {
      this.popupErros = new PopupErrorBuilder().adicionar(erro).build();
      input.value = '';
      return;
    }
    this.converterArquivo(file).then((upload) => {
      this.eventoForm.get('fotoPrincipalUpload')?.setValue(upload);
      this.uploadPrincipalPreview = upload.conteudo;
      input.value = '';
    });
  }

  onFotosSelecionadas(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (!files.length) return;
    files.forEach(async (file, index) => {
      const erro = this.validarArquivoImagem(file);
      if (erro) {
        this.popupErros = new PopupErrorBuilder().adicionar(erro).build();
        return;
      }
      const upload = await this.converterArquivo(file);
      this.fotosUpload.push({
        arquivo: file,
        preview: upload.conteudo,
        legenda: '',
        creditos: '',
        tags: '',
        ordem: this.fotosUpload.length + index + 1,
        upload
      });
    });
    input.value = '';
  }

  removerFotoUpload(index: number): void {
    this.fotosUpload.splice(index, 1);
  }

  acaoCancelar(): void {
    if (this.formularioAberto) {
      this.limparFormulario();
      return;
    }
    if (this.mostrandoDetalhe) {
      this.voltarLista();
      return;
    }
    this.limparFiltros();
  }

  limparFormulario(): void {
    this.eventoForm.reset({
      titulo: '',
      dataEvento: '',
      local: '',
      descricao: '',
      status: 'PLANEJADO',
      tags: '',
      unidadeId: '',
      fotoPrincipalUpload: null
    });
    this.uploadPrincipalPreview = null;
  }

  fecharPopupErros(): void {
    this.popupErros = [];
  }

  dismissFeedback(): void {
    this.feedback = null;
  }

  obterTags(tags?: string[] | null): string[] {
    if (!tags || !tags.length) return [];
    return tags.filter((item) => item && item.trim());
  }

  recortarTexto(texto?: string | null, limite = 120): string {
    if (!texto) return '';
    if (texto.length <= limite) return texto;
    return `${texto.slice(0, limite)}...`;
  }

  formatarStatus(status?: string | null): string {
    const match = this.statusOpcoes.find((item) => item.valor === status);
    return match ? match.label : 'Planejado';
  }

  classeStatus(status?: string | null): string {
    switch (status) {
      case 'REALIZADO':
        return 'pill--success';
      case 'CANCELADO':
        return 'pill--danger';
      case 'ARQUIVADO':
        return 'pill--muted';
      default:
        return 'pill--warning';
    }
  }

  totalFotos(evento: FotoEventoResponse | null): number {
    if (!evento) return 0;
    return evento.totalFotos ? Number(evento.totalFotos) : 0;
  }

  capitalizarCampo(controlName: string): void {
    const control = this.eventoForm.get(controlName) as FormControl | null;
    if (!control) return;
    const valor = control.value as string;
    if (!valor) return;
    control.setValue(titleCaseWords(valor));
  }

  private montarPayloadEvento(): FotoEventoRequestPayload {
    const value = this.eventoForm.value;
    return {
      titulo: value.titulo,
      descricao: value.descricao || undefined,
      dataEvento: value.dataEvento,
      local: value.local || undefined,
      status: value.status || 'PLANEJADO',
      tags: this.normalizarTags(value.tags),
      unidadeId: value.unidadeId ? Number(value.unidadeId) : null,
      fotoPrincipalUpload: value.fotoPrincipalUpload || undefined
    };
  }

  private montarPayloadEventoSelecionado(): FotoEventoRequestPayload {
    const evento = this.eventoSelecionado;
    if (!evento) {
      return {
        titulo: '',
        dataEvento: '',
        fotoPrincipalUpload: undefined
      };
    }
    return {
      titulo: evento.titulo,
      descricao: evento.descricao || undefined,
      dataEvento: evento.dataEvento,
      local: evento.local || undefined,
      status: evento.status || 'PLANEJADO',
      tags: evento.tags || [],
      unidadeId: evento.unidadeId ?? null,
      fotoPrincipalUpload: undefined
    };
  }

  private atualizarValidacaoFotoPrincipal(obrigatorio: boolean): void {
    const control = this.eventoForm.get('fotoPrincipalUpload') as FormControl | null;
    if (!control) return;
    control.clearValidators();
    if (obrigatorio) {
      control.setValidators([Validators.required]);
    }
    control.updateValueAndValidity({ emitEvent: false });
  }

  private normalizarEvento(evento: FotoEventoResponse): FotoEventoResponse {
    return {
      ...evento,
      fotoPrincipalUrl: this.normalizarUrl(evento.fotoPrincipalUrl)
    };
  }

  private normalizarFoto(foto: FotoEventoFotoResponse): FotoEventoFotoResponse {
    return {
      ...foto,
      arquivoUrl: this.normalizarUrl(foto.arquivoUrl)
    };
  }

  private normalizarUrl(url?: string | null): string | null {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${this.runtimeConfig.apiUrl}${url}`;
  }

  private async converterArquivo(file: File): Promise<{ nomeArquivo: string; contentType: string; conteudo: string }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const conteudo = reader.result as string;
        resolve({ nomeArquivo: file.name, contentType: file.type, conteudo });
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  private mostrarFeedback(mensagem: string): void {
    this.feedback = mensagem;
    if (this.feedbackTimeout) {
      clearTimeout(this.feedbackTimeout);
    }
    this.feedbackTimeout = setTimeout(() => {
      this.feedback = null;
    }, 10000);
  }

  private normalizarTags(tagsInput?: string | string[] | null): string[] | undefined {
    if (!tagsInput) return undefined;
    const raw = Array.isArray(tagsInput) ? tagsInput : tagsInput.split(',');
    const tags = raw
      .map((item) => item.trim())
      .filter((item) => item);
    return tags.length ? tags : undefined;
  }

  private normalizarTexto(valor?: string | null): string | undefined {
    if (!valor) return undefined;
    return valor
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  private validarArquivoImagem(file: File): string | null {
    const tipo = file.type.toLowerCase();
    const nome = file.name.toLowerCase();
    const tipoPermitido = this.tiposImagemPermitidos.includes(tipo);
    const extensaoPermitida =
      nome.endsWith('.jpg') ||
      nome.endsWith('.jpeg') ||
      nome.endsWith('.png') ||
      nome.endsWith('.webp');
    if (!tipoPermitido && !extensaoPermitida) {
      return 'Envie apenas imagens JPG, PNG ou WEBP.';
    }
    return null;
  }
}
