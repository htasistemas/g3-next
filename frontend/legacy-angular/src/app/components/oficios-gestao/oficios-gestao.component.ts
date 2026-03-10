import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faFileSignature } from '@fortawesome/free-solid-svg-icons';
import {
  OficioImagemPayload,
  OficioPayload,
  OficioPdfAssinadoPayload,
  OficioService,
  TramiteRegistro
} from '../../services/oficio.service';

import { TelaPadraoComponent } from '../compartilhado/tela-padrao/tela-padrao.component';
import { PopupMessagesComponent } from '../compartilhado/popup-messages/popup-messages.component';
import { AutocompleteComponent, AutocompleteOpcao } from '../compartilhado/autocomplete/autocomplete.component';
import { AssistanceUnitPayload, AssistanceUnitService } from '../../services/assistance-unit.service';
import { ProfessionalRecord, ProfessionalService } from '../../services/professional.service';
import { PopupErrorBuilder } from '../../utils/popup-error.builder';
import { ConfigAcoesCrud, EstadoAcoesCrud, TelaBaseComponent } from '../compartilhado/tela-base.component';
import { AuthService } from '../../services/auth.service';
import { FeriadoPayload, FeriadoService } from '../../services/feriado.service';

interface StepTab {
  id: string;
  label: string;
}

@Component({
  selector: 'app-oficios-gestao',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    FontAwesomeModule,
    TelaPadraoComponent,
    PopupMessagesComponent,
    AutocompleteComponent
  ],
  templateUrl: './oficios-gestao.component.html',
  styleUrl: './oficios-gestao.component.scss'
})
export class OficiosGestaoComponent extends TelaBaseComponent implements OnInit {
  form: FormGroup;
  tabs: StepTab[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'identificacao', label: 'Identificação e protocolo' },
    { id: 'conteudo', label: 'Redação do ofício' },
    { id: 'tramitacao', label: 'Tramitação e acompanhamento' },
    { id: 'listagem', label: 'Ofícios registrados' }
  ];
  activeTab = 'identificacao';
  saving = false;
  popupErros: string[] = [];
  popupTitulo = 'Aviso';
  tramites: TramiteRegistro[] = [];
  oficios: OficioPayload[] = [];
  termoBuscarOficio = '';
  filtroOficioTermo = '';
  filtroOficioCampo = 'numero';
  popupAnexoAberto = false;
  oficioAnexoSelecionado: OficioPayload | null = null;
  imagensAnexo: OficioImagemPayload[] = [];
  editingId: string | null = null;
  unidades: AssistanceUnitPayload[] = [];
  unidadeTermo = '';
  unidadeOpcoes: AutocompleteOpcao[] = [];
  profissionais: ProfessionalRecord[] = [];
  responsavelTermo = '';
  responsavelOpcoes: AutocompleteOpcao[] = [];
  unidadeSelecionada: AssistanceUnitPayload | null = null;
  unidadeAtual: AssistanceUnitPayload | null = null;
  responsavelCargos: string[] = [];
  feriados: FeriadoPayload[] = [];
  feriadosSet = new Set<string>();
  faFileSignature = faFileSignature;

  readonly saudacoes = ['Sr.', 'Sra.', 'Exmo. Sr.', 'Exma. Sra.', 'Prezados', 'Prezada', 'Prezado'];
  readonly statusOptions = ['Rascunho', 'Em preparacao', 'Enviado', 'Recebido', 'Em analise', 'Arquivado'];
  readonly meiosEnvio = ['E-mail', 'Correio', 'Entrega presencial', 'Sistema G3'];
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
    private readonly oficioService: OficioService,
    private readonly unidadeService: AssistanceUnitService,
    private readonly profissionalService: ProfessionalService,
    private readonly authService: AuthService,
    private readonly feriadoService: FeriadoService
  ) {
    super();
    const initialState = this.buildInitialFormValue();
    this.form = this.fb.group({
      identificacao: this.fb.group({
        tipo: [initialState.identificacao.tipo, Validators.required],
        numero: [initialState.identificacao.numero],
        data: [initialState.identificacao.data, Validators.required],
        setorOrigem: [initialState.identificacao.setorOrigem, Validators.required],
        responsavel: [initialState.identificacao.responsavel, Validators.required],
        meioEnvio: [initialState.identificacao.meioEnvio, Validators.required],
        prazoResposta: [initialState.identificacao.prazoResposta],
        classificacao: [initialState.identificacao.classificacao]
      }),
      conteudo: this.fb.group({
        razaoSocial: [initialState.conteudo.razaoSocial, Validators.required],
        logoUrl: [initialState.conteudo.logoUrl],
        titulo: [initialState.conteudo.titulo],
        saudacao: [initialState.conteudo.saudacao],
        para: [initialState.conteudo.para],
        cargoPara: [initialState.conteudo.cargoPara],
        assunto: [initialState.conteudo.assunto],
        corpo: [initialState.conteudo.corpo, Validators.required],
        finalizacao: [initialState.conteudo.finalizacao],
        assinaturaNome: [initialState.conteudo.assinaturaNome],
        assinaturaCargo: [initialState.conteudo.assinaturaCargo],
        rodape: [initialState.conteudo.rodape]
      }),
      protocolo: this.fb.group({
        status: [initialState.protocolo.status, Validators.required],
        protocoloEnvio: [initialState.protocolo.protocoloEnvio],
        dataEnvio: [initialState.protocolo.dataEnvio],
        protocoloRecebimento: [initialState.protocolo.protocoloRecebimento],
        dataRecebimento: [initialState.protocolo.dataRecebimento],
        proximoDestino: [initialState.protocolo.proximoDestino],
        observacoes: [initialState.protocolo.observacoes]
      }),
      tramitacao: this.fb.group({
        data: [initialState.tramitacao.data],
        origem: [initialState.tramitacao.origem],
        destino: [initialState.tramitacao.destino],
        responsavel: [initialState.tramitacao.responsavel],
        acao: [initialState.tramitacao.acao],
        observacoes: [initialState.tramitacao.observacoes]
      })
    });
  }

  ngOnInit(): void {
    this.loadOficios();
    this.carregarUnidades();
    this.carregarProfissionais();
    this.carregarUnidadeAtual();
    this.carregarFeriados();
    this.definirResponsavelAutenticado();
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

  get acoesDesabilitadas(): EstadoAcoesCrud {
    return {
      salvar: this.saving,
      cancelar: this.saving,
      novo: this.saving,
      excluir: !this.editingId,
      imprimir: this.saving,
      buscar: this.saving
    };
  }

  get oficiosFiltrados(): OficioPayload[] {
    const termo = this.normalizarTextoBusca(this.filtroOficioTermo);
    if (!termo) return this.oficios;
    return this.oficios.filter((oficio) => this.correspondeFiltro(oficio, termo));
  }

  changeTab(tab: string): void {
    this.activeTab = tab;
    if (tab === 'conteudo' && this.editingId && this.imagensAnexo.length === 0) {
      this.carregarImagensOficio(this.editingId);
    }
  }

  get quantidadeOficiosCriados(): number {
    return this.oficios.length;
  }

  get quantidadeOficiosRecebidos(): number {
    return this.oficios.filter((oficio) => oficio.identificacao?.tipo === 'recebimento').length;
  }

  get quantidadeOficiosEnviados(): number {
    return this.oficios.filter((oficio) => (oficio.protocolo?.status || '') === 'Enviado').length;
  }

  get quantidadeOficiosEmAnalise(): number {
    return this.oficios.filter((oficio) => (oficio.protocolo?.status || '') === 'Em analise').length;
  }

  get quantidadeOficiosEmPreparacao(): number {
    return this.oficios.filter((oficio) => (oficio.protocolo?.status || '') === 'Em preparacao').length;
  }

  get quantidadeOficiosRecebidosStatus(): number {
    return this.oficios.filter((oficio) => (oficio.protocolo?.status || '') === 'Recebido').length;
  }

  get quantidadeOficiosRascunho(): number {
    return this.oficios.filter((oficio) => (oficio.protocolo?.status || '') === 'Rascunho').length;
  }

  get quantidadeOficiosArquivados(): number {
    return this.oficios.filter((oficio) => (oficio.protocolo?.status || '') === 'Arquivado').length;
  }

  get quantidadeOficiosComAnexo(): number {
    return this.oficios.filter((oficio) => !!oficio.pdfAssinadoNome).length;
  }

  get quantidadeComProtocoloEnvio(): number {
    return this.oficios.filter((oficio) => !!oficio.protocolo?.protocoloEnvio).length;
  }

  get quantidadeComProtocoloRecebimento(): number {
    return this.oficios.filter((oficio) => !!oficio.protocolo?.protocoloRecebimento).length;
  }

  get quantidadeSemProtocolo(): number {
    return this.oficios.filter(
      (oficio) => !oficio.protocolo?.protocoloEnvio && !oficio.protocolo?.protocoloRecebimento
    ).length;
  }

  get quantidadeEmAtraso(): number {
    const hoje = new Date();
    return this.oficios.filter((oficio) => {
      const dias = this.parseNumeroDias(oficio.identificacao?.prazoResposta);
      if (!dias || dias <= 0) return false;
      const dataOficio = this.parseDate(oficio.identificacao?.data);
      if (!dataOficio) return false;
      const status = oficio.protocolo?.status || '';
      if (status === 'Arquivado' || status === 'Recebido') return false;
      const limite = this.adicionarDiasUteis(dataOficio, dias);
      return limite < hoje;
    }).length;
  }

  get responsavelComMaisOficios(): { nome: string; quantidade: number } {
    const contagem = new Map<string, number>();
    for (const oficio of this.oficios) {
      const nome = (oficio.identificacao?.responsavel || '').trim();
      if (!nome) continue;
      contagem.set(nome, (contagem.get(nome) || 0) + 1);
    }
    let nomeTop = '-';
    let qtdTop = 0;
    contagem.forEach((quantidade, nome) => {
      if (quantidade > qtdTop) {
        qtdTop = quantidade;
        nomeTop = nome;
      }
    });
    return { nome: nomeTop, quantidade: qtdTop };
  }

  private parseDate(valor?: string): Date | null {
    if (!valor) return null;
    const data = new Date(valor);
    if (Number.isNaN(data.getTime())) return null;
    return data;
  }

  private parseNumeroDias(valor?: string): number | null {
    if (!valor) return null;
    const numero = Number(String(valor).replace(/\D/g, ''));
    if (!Number.isFinite(numero) || numero <= 0) return null;
    return numero;
  }

  private adicionarDiasUteis(dataInicial: Date, diasUteis: number): Date {
    const resultado = new Date(dataInicial.getTime());
    let adicionados = 0;
    while (adicionados < diasUteis) {
      resultado.setDate(resultado.getDate() + 1);
      if (this.eDiaUtil(resultado)) {
        adicionados += 1;
      }
    }
    return resultado;
  }

  private eDiaUtil(data: Date): boolean {
    const diaSemana = data.getDay();
    if (diaSemana === 0 || diaSemana === 6) {
      return false;
    }
    const chave = this.formatarDataChave(data);
    return !this.feriadosSet.has(chave);
  }

  private formatarDataChave(data: Date): string {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }

  private formatarDataChaveString(valor: string): string | null {
    if (!valor) return null;
    const parte = valor.trim().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(parte)) {
      return null;
    }
    return parte;
  }

  private carregarFeriados(): void {
    this.feriadoService.listar().subscribe({
      next: (feriados) => {
        this.feriados = feriados ?? [];
        const chaves = this.feriados
          .map((item) => this.formatarDataChaveString(item.data))
          .filter((item): item is string => !!item);
        this.feriadosSet = new Set(chaves);
      },
      error: () => {
        this.feriados = [];
        this.feriadosSet = new Set<string>();
      }
    });
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

  addTramite(): void {
    const grupo = this.form.get('tramitacao') as FormGroup;
    if (!grupo.valid) {
      grupo.markAllAsTouched();
      return;
    }

    const novo: TramiteRegistro = { ...grupo.value };
    this.tramites = [novo, ...this.tramites];
    grupo.reset({ data: new Date().toISOString().split('T')[0], acao: '' });
  }

  submit(): void {
    this.saving = true;

    const payload: OficioPayload = {
      identificacao: this.form.value.identificacao,
      conteudo: this.form.value.conteudo,
      protocolo: {
        ...this.form.value.protocolo,
        status: this.form.value.protocolo?.status ?? 'Rascunho'
      },
      tramites: this.tramites
    };

    if (this.editingId) {
      this.oficioService.update(this.editingId, payload).subscribe({
        next: (resposta) => {
          this.popupTitulo = 'Sucesso';
          this.popupErros = new PopupErrorBuilder().adicionar('Registro de ofício atualizado com sucesso.').build();
          const id = resposta.id ? String(resposta.id) : this.editingId;
          if (!id) {
            this.loadOficios();
            this.resetState();
            return;
          }
          this.salvarImagensPendentes(id, () => {
            this.loadOficios();
            this.resetState();
          });
        },
        error: () => {
          this.popupTitulo = 'Erro ao salvar';
          this.popupErros = new PopupErrorBuilder().adicionar('Não foi possível salvar o ofício.').build();
        },
        complete: () => {
          this.saving = false;
        }
      });
      return;
    }

    this.oficioService.create(payload).subscribe({
      next: (resposta) => {
        this.popupTitulo = 'Sucesso';
        this.popupErros = new PopupErrorBuilder().adicionar('Ofício cadastrado e protocolado com sucesso.').build();
        const id = resposta.id ? String(resposta.id) : '';
        if (!id) {
          this.loadOficios();
          this.resetState();
          return;
        }
        this.salvarImagensPendentes(id, () => {
          this.loadOficios();
          this.resetState();
        });
      },
      error: () => {
        this.popupTitulo = 'Erro ao salvar';
        this.popupErros = new PopupErrorBuilder().adicionar('Não foi possível salvar o ofício.').build();
      },
      complete: () => {
        this.saving = false;
      }
    });
  }

  imprimirRascunho(): void {
    if (!this.form.value.identificacao || !this.form.value.conteudo || !this.form.value.protocolo) {
      return;
    }

    const payload: OficioPayload = {
      identificacao: this.form.value.identificacao,
      conteudo: this.form.value.conteudo,
      protocolo: this.form.value.protocolo,
      tramites: this.tramites
    };

    this.imprimirModelo(payload);
  }

  edit(oficio: OficioPayload): void {
    this.editingId = oficio.id ?? null;
    this.tramites = oficio.tramites ?? [];
    this.form.patchValue({
      identificacao: oficio.identificacao,
      conteudo: oficio.conteudo,
      protocolo: oficio.protocolo,
      tramitacao: {
        data: new Date().toISOString().split('T')[0],
        origem: oficio.identificacao.setorOrigem,
        destino: oficio.conteudo.para || '',
        responsavel: oficio.identificacao.responsavel,
        acao: '',
        observacoes: ''
      }
    });
    this.activeTab = 'identificacao';
    this.popupTitulo = 'Edição ativa';
    this.popupErros = new PopupErrorBuilder().adicionar('Edição ativa. Atualize os dados e salve para registrar a nova versão.').build();
    if (this.editingId) {
      this.carregarImagensOficio(this.editingId);
    } else {
      this.imagensAnexo = [];
    }
  }

  delete(id: string | undefined): void {
    if (!id) return;
    this.oficioService.delete(id).subscribe({
      next: () => {
        this.popupTitulo = 'Sucesso';
        this.popupErros = new PopupErrorBuilder().adicionar('Oficio excluido com sucesso.').build();
        this.loadOficios();
        if (this.editingId === id) {
          this.resetState();
        }
      },
      error: () => {
        this.popupTitulo = 'Erro ao excluir';
        this.popupErros = new PopupErrorBuilder().adicionar('Não foi possível excluir o ofício.').build();
      }
    });
  }

  printCurrent(): void {
    const payload: OficioPayload = {
      identificacao: this.form.value.identificacao,
      conteudo: this.form.value.conteudo,
      protocolo: {
        ...this.form.value.protocolo,
        status: this.form.value.protocolo?.status ?? 'Rascunho'
      },
      tramites: this.tramites
    };

    this.imprimirModelo(payload);
  }

  registrarEnvio(): void {
    const protocoloGroup = this.form.get('protocolo');
    const hoje = new Date().toISOString().split('T')[0];
    protocoloGroup?.patchValue({
      dataEnvio: hoje,
      protocoloEnvio: protocoloGroup?.value.protocoloEnvio || crypto.randomUUID().slice(0, 8),
      status: 'Enviado'
    });
  }

  registrarRecebimento(): void {
    const protocoloGroup = this.form.get('protocolo');
    const hoje = new Date().toISOString().split('T')[0];
    protocoloGroup?.patchValue({
      dataRecebimento: hoje,
      protocoloRecebimento: protocoloGroup?.value.protocoloRecebimento || crypto.randomUUID().slice(0, 8),
      status: 'Recebido'
    });
  }

  loadOficios(): void {
    this.oficioService.list().subscribe({
      next: (oficios) => {
        this.oficios = oficios;
        this.atualizarNumeroOficioSeNecessario();
      },
      error: () => {
        this.popupTitulo = 'Erro ao carregar';
        this.popupErros = new PopupErrorBuilder().adicionar('Não foi possível carregar os ofícios.').build();
      }
    });
  }

  carregarUnidades(): void {
    this.unidadeService.list().subscribe({
      next: (unidades) => {
        this.unidades = unidades ?? [];
        this.atualizarOpcoesUnidade();
      },
      error: () => {
        this.unidadeOpcoes = [];
      }
    });
  }

  carregarUnidadeAtual(): void {
    this.unidadeService.get().subscribe({
      next: (resultado) => {
        this.unidadeAtual = resultado?.unidade ?? null;
        if (this.unidadeAtual && !this.unidadeSelecionada) {
          this.unidadeSelecionada = this.unidadeAtual;
          this.form.get('identificacao.setorOrigem')?.setValue(this.obterTituloUnidade(this.unidadeAtual));
        }
        this.preencherConteudoDaUnidade(this.unidadeAtual);
      }
    });
  }

  carregarProfissionais(): void {
    this.profissionalService.list().subscribe({
      next: (profissionais) => {
        this.profissionais = profissionais ?? [];
        this.atualizarOpcoesResponsavel();
        const nomeAutenticado = this.form.get('conteudo.assinaturaNome')?.value;
        if (nomeAutenticado) {
          this.definirAssinaturaAutenticada(nomeAutenticado);
        }
      },
      error: () => {
        this.responsavelOpcoes = [];
      }
    });
  }

  onUnidadeTermoChange(termo: string): void {
    this.unidadeTermo = termo;
    this.atualizarOpcoesUnidade();
  }

  selecionarUnidade(opcao: AutocompleteOpcao): void {
    const selecionada = this.unidades.find((item) => String(item.id) === String(opcao.id));
    if (!selecionada) return;
    this.unidadeSelecionada = selecionada;
    this.unidadeTermo = opcao.label;
    this.form.get('identificacao.setorOrigem')?.setValue(this.obterTituloUnidade(selecionada));
    this.preencherConteudoDaUnidade(selecionada);
  }

  onResponsavelTermoChange(termo: string): void {
    this.responsavelTermo = termo;
    this.atualizarOpcoesResponsavel();
  }

  selecionarResponsavel(opcao: AutocompleteOpcao): void {
    const profissional = this.profissionais.find((item) => String(item.id) === String(opcao.id));
    if (!profissional) return;
    this.responsavelTermo = opcao.label;
    this.form.get('identificacao.responsavel')?.setValue(profissional.nomeCompleto);
    this.form.get('conteudo.assinaturaNome')?.setValue(profissional.nomeCompleto);
    const cargos = this.extrairCargosProfissional(profissional);
    this.responsavelCargos = cargos;
    if (cargos.length > 0) {
      this.form.get('conteudo.assinaturaCargo')?.setValue(cargos[0]);
    }
  }

  resetForm(): void {
    if (this.editingId) {
      const registro = this.oficios.find((oficio) => oficio.id === this.editingId);
      if (registro) {
        this.tramites = registro.tramites ?? [];
        this.form.reset({
          identificacao: registro.identificacao,
          conteudo: registro.conteudo,
          protocolo: registro.protocolo,
          tramitacao: {
            data: new Date().toISOString().split('T')[0],
            origem: registro.identificacao.setorOrigem,
            destino: registro.conteudo.para || '',
            responsavel: registro.identificacao.responsavel,
            acao: '',
            observacoes: ''
          }
        });
        this.changeTab('identificacao');
        this.popupErros = [];
        this.definirResponsavelAutenticado();
        if (this.editingId) {
          this.carregarImagensOficio(this.editingId);
        }
        return;
      }
    }

    this.resetState();
  }

  startNew(): void {
    this.resetState();
  }

  onBuscar(): void {
    this.changeTab('listagem');
  }

  closeForm(): void {
    window.history.back();
  }

  getLocalAtual(oficio: OficioPayload): string {
    if (oficio.tramites && oficio.tramites.length > 0) {
      return oficio.tramites[0].destino || oficio.tramites[0].origem || 'Em trânsito';
    }
    return oficio.protocolo?.proximoDestino || oficio.conteudo.para || '-';
  }

  imprimirModelo(oficio: OficioPayload): void {
    if (oficio.id) {
      this.oficioService.listarImagens(String(oficio.id)).subscribe({
        next: (imagens) => {
          this.renderizarImpressao(oficio, imagens);
        },
        error: () => {
          this.popupTitulo = 'Aviso';
          this.popupErros = new PopupErrorBuilder()
            .adicionar('Não foi possível carregar as imagens do ofício.')
            .build();
          this.renderizarImpressao(oficio, []);
        }
      });
      return;
    }
    this.renderizarImpressao(oficio, this.imagensAnexo);
  }

  private renderizarImpressao(oficio: OficioPayload, imagens: OficioImagemPayload[]): void {
    const w = window.open('', '_blank', 'width=900,height=1200');
    if (!w) return;
    const { identificacao, conteudo } = oficio;
    const logoUrl = this.obterLogomarcaParaImpressao(conteudo.logoUrl);
    const logo = logoUrl ? `<img src="${logoUrl}" alt="Logo" class="header-logo" />` : '';
    const unidadeCabecalho = this.unidadeSelecionada ?? this.unidadeAtual;
    const razaoSocialUnidade = unidadeCabecalho?.razaoSocial || unidadeCabecalho?.nomeFantasia || '';
    const dataExtenso = this.formatarDataExtenso(identificacao.data);
    const localData = this.formatarLocalData(dataExtenso);
    const numeroOficio = identificacao.numero ? `Oficio nº ${identificacao.numero}` : '';
    const corpoFormatado = this.formatarTextoOficio(conteudo.corpo || '')
      .map((trecho) => `<p>${trecho}</p>`)
      .join('');
    const unidadeRodape =
      unidadeCabecalho ?? this.unidadeAtual ?? this.unidades.find((item) => item.unidadePrincipal) ?? null;
    const rodapeUnidade = unidadeRodape ? this.montarRodapeUnidade(unidadeRodape) : '';
    const rodapeBase =
      conteudo.rodape && conteudo.rodape.trim().length > 0 ? conteudo.rodape : rodapeUnidade;
    const normalizarRodape = (texto: string) =>
      (texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const razaoNormalizada = normalizarRodape(razaoSocialUnidade);
    let rodapeComUnidade =
      rodapeUnidade && (!rodapeBase || !rodapeBase.includes('CNPJ'))
        ? [rodapeBase, rodapeUnidade].filter((item) => item && item.trim().length > 0).join('\n')
        : rodapeBase;
    if (razaoSocialUnidade && !normalizarRodape(rodapeComUnidade || '').includes(razaoNormalizada)) {
      const linhasRodape = (rodapeComUnidade || '')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .split('\n')
        .map((linha) => linha.trim())
        .filter((linha) => linha.length > 0);
      if (linhasRodape.length > 0) {
        linhasRodape[0] = `${razaoSocialUnidade} - ${linhasRodape[0]}`;
        rodapeComUnidade = linhasRodape.join('\n');
      }
    }
    let rodapeFormatado = this.formatarRodapeImpressao(rodapeComUnidade, razaoSocialUnidade);
    if (!rodapeFormatado && rodapeUnidade) {
      rodapeFormatado = this.formatarRodapeImpressao(rodapeUnidade, razaoSocialUnidade);
    }
    const imagensOrdenadas = [...(imagens ?? [])]
      .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
    const imagensHtml = imagensOrdenadas
      .map((imagem) => {
        const url = `data:${imagem.tipoMime};base64,${imagem.conteudoBase64}`;
        const nome = imagem.nomeArquivo || 'Imagem anexada';
        return `<div class="imagem-anexo"><img src="${url}" alt="${nome}" /></div>`;
      })
      .join('');

    w.document.write(`
      <html>
        <head>
          <title>${conteudo.titulo || 'Oficio'}</title>
          <style>
            @page { size: A4; margin: 3cm 2cm 2cm 3cm; }
            body { font-family: Arial, sans-serif; margin: 0; color: #000; height: 100vh; --rodape-altura: 72px; }
            .oficio { padding: 0 0 calc(var(--rodape-altura) + 12pt); min-height: 100vh; display: flex; flex-direction: column; box-sizing: border-box; }
            .header { display: flex; align-items: center; gap: 16px; }
            .header-logo { height: 90px; }
            .header-titulo { text-align: center; width: 100%; font-size: 11pt; font-weight: 600; text-transform: uppercase; }
            .linha-divisoria { border-top: 1px solid #000; margin: 8px 0 12px; }
            .meta-direita { text-align: right; font-size: 12pt; margin: 0 0 12px; }
            .numero-oficio { font-weight: 600; font-size: 12pt; margin: 6px 0 18pt; }
            .meta-tight { margin-bottom: 18pt; }
            .meta-tight p { margin: 0; }
            .assunto { font-weight: 600; margin: 0 0 18pt; }
            .corpo { text-align: justify; font-size: 12pt; line-height: 1.5; }
            .corpo p { margin: 0 0 18pt; text-indent: 1.25cm; }
            .imagens-anexo { margin-top: 12px; display: grid; gap: 12px; }
            .imagem-anexo img { max-width: 100%; height: auto; display: block; }
            .finalizacao { text-align: justify; font-size: 12pt; line-height: 1.5; margin-top: 12px; text-indent: 1.25cm; }
            .assinatura { margin-top: 96px; }
            .rodape { position: fixed; bottom: 0; left: 0; right: 0; font-size: 8.5pt; text-align: center; border-top: 1px solid #000; padding: 6px 0 8px; line-height: 1.2; background: #fff; height: var(--rodape-altura); box-sizing: border-box; }
            .rodape-linha { margin: 0; }
          </style>
        </head>
        <body>
          <div class="oficio">
            <div class="header">
              ${logo}
              <div class="header-titulo">${razaoSocialUnidade}</div>
            </div>
            <div class="linha-divisoria"></div>
            <p class="meta-direita">${localData}</p>
            <p class="numero-oficio">${numeroOficio}</p>
            <div class="meta-tight">
              <p>A ${conteudo.razaoSocial || ''}</p>
              <p>${conteudo.saudacao || ''} ${conteudo.para || ''}</p>
              <p>${conteudo.cargoPara || ''}</p>
            </div>
            <p class="assunto">Assunto: ${conteudo.assunto || ''}</p>
            <div class="corpo">${corpoFormatado}</div>
            ${imagensHtml ? `<div class="imagens-anexo">${imagensHtml}</div>` : ''}
            <div class="finalizacao">${conteudo.finalizacao || ''}</div>
            <div class="assinatura">
              <div>${conteudo.assinaturaNome || ''}</div>
              <div>${conteudo.assinaturaCargo || ''}</div>
            </div>
            <div class="rodape">
              ${rodapeFormatado}
            </div>
          </div>
        </body>
      </html>
    `);
    w.document.close();
    w.focus();
    w.onload = () => {
      w.print();
    };
  }

  buscarOficioParaReaproveitar(): void {
    const termo = (this.termoBuscarOficio || '').trim();
    if (!termo) {
      this.popupTitulo = 'Aviso';
      this.popupErros = new PopupErrorBuilder()
        .adicionar('Informe o número e ano do ofício para buscar.')
        .build();
      return;
    }
    const oficioEncontrado = this.oficios.find(
      (item) => this.normalizarNumeroOficio(item.identificacao?.numero) === this.normalizarNumeroOficio(termo)
    );
    if (!oficioEncontrado) {
      this.popupTitulo = 'Aviso';
      this.popupErros = new PopupErrorBuilder()
        .adicionar('Ofício não encontrado para o número informado.')
        .build();
      return;
    }

    const numeroAtual = this.form.get('identificacao.numero')?.value as string;
    this.form.patchValue({
      identificacao: {
        ...oficioEncontrado.identificacao
      },
      conteudo: {
        ...oficioEncontrado.conteudo
      },
      protocolo: {
        ...oficioEncontrado.protocolo
      }
    });

    if (!this.editingId) {
      this.form.get('identificacao.numero')?.setValue(numeroAtual || '');
      this.atualizarNumeroOficioSeNecessario();
    }

    this.popupTitulo = 'Sucesso';
    this.popupErros = new PopupErrorBuilder()
      .adicionar('Ofício copiado com sucesso. Ajuste os dados se necessário.')
      .build();
  }

  onPdfAssinadoSelecionado(evento: Event, oficio: OficioPayload): void {
    const input = evento.target as HTMLInputElement;
    const arquivo = input.files?.[0];
    if (!arquivo || !oficio.id) {
      return;
    }
    if (arquivo.type !== 'application/pdf') {
      this.popupTitulo = 'Aviso';
      this.popupErros = new PopupErrorBuilder().adicionar('Envie apenas arquivo PDF.').build();
      input.value = '';
      return;
    }
    const leitor = new FileReader();
    leitor.onload = () => {
      const conteudo = typeof leitor.result === 'string' ? leitor.result : '';
      const base64 = conteudo.includes(',') ? conteudo.split(',')[1] : conteudo;
      const payload: OficioPdfAssinadoPayload = {
        nomeArquivo: arquivo.name,
        tipoMime: arquivo.type || 'application/pdf',
        conteudoBase64: base64
      };
      this.oficioService.salvarPdfAssinado(oficio.id as string, payload).subscribe({
        next: (resposta) => {
          this.oficios = this.oficios.map((item) =>
            item.id === oficio.id ? resposta : item
          );
          this.popupTitulo = 'Sucesso';
          this.popupErros = new PopupErrorBuilder()
            .adicionar('PDF assinado anexado com sucesso.')
            .build();
        },
        error: () => {
          this.popupTitulo = 'Erro ao anexar';
          this.popupErros = new PopupErrorBuilder()
            .adicionar('Não foi possível anexar o PDF assinado.')
            .build();
        }
      });
    };
    leitor.readAsDataURL(arquivo);
    input.value = '';
  }

  onImagensSelecionadas(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const arquivos = Array.from(input.files ?? []);
    if (arquivos.length === 0) {
      return;
    }
    if (this.imagensAnexo.length + arquivos.length > 10) {
      this.popupTitulo = 'Aviso';
      this.popupErros = new PopupErrorBuilder()
        .adicionar('Limite máximo de 10 imagens por ofício.')
        .build();
      input.value = '';
      return;
    }
    const validos = arquivos.filter((arquivo) => this.validarImagemArquivo(arquivo));
    if (validos.length === 0) {
      input.value = '';
      return;
    }
    this.lerImagensSequencialmente(validos, 0);
    input.value = '';
  }

  removerImagemAnexo(imagem: OficioImagemPayload): void {
    if (imagem.id && this.editingId) {
      this.oficioService.removerImagem(this.editingId, imagem.id).subscribe({
        next: () => {
          this.imagensAnexo = this.imagensAnexo.filter((item) => item.id !== imagem.id);
          this.reordenarImagens();
        },
        error: () => {
          this.popupTitulo = 'Erro ao remover';
          this.popupErros = new PopupErrorBuilder()
            .adicionar('Não foi possível remover a imagem anexada.')
            .build();
        }
      });
      return;
    }
    this.imagensAnexo = this.imagensAnexo.filter((item) => item !== imagem);
    this.reordenarImagens();
  }

  obterImagemPreview(imagem: OficioImagemPayload): string {
    if (!imagem.conteudoBase64) {
      return '';
    }
    return `data:${imagem.tipoMime};base64,${imagem.conteudoBase64}`;
  }

  abrirPdfAssinado(oficio: OficioPayload): void {
    if (!oficio.id) return;
    const url = this.oficioService.obterPdfAssinadoUrl(oficio.id);
    window.open(url, '_blank');
  }

  imprimirPdfAssinado(oficio: OficioPayload): void {
    if (!oficio.id) return;
    const url = this.oficioService.obterPdfAssinadoUrl(oficio.id);
    const janela = window.open(url, '_blank');
    if (!janela) return;
    janela.onload = () => {
      janela.print();
    };
  }

  abrirPopupAnexo(oficio: OficioPayload): void {
    this.oficioAnexoSelecionado = oficio;
    this.popupAnexoAberto = true;
  }

  fecharPopupAnexo(): void {
    this.popupAnexoAberto = false;
    this.oficioAnexoSelecionado = null;
  }

  visualizarAnexo(): void {
    if (!this.oficioAnexoSelecionado) return;
    this.abrirPdfAssinado(this.oficioAnexoSelecionado);
    this.fecharPopupAnexo();
  }

  imprimirAnexo(): void {
    if (!this.oficioAnexoSelecionado) return;
    this.imprimirPdfAssinado(this.oficioAnexoSelecionado);
    this.fecharPopupAnexo();
  }

  removerPdfAssinado(oficio: OficioPayload): void {
    if (!oficio.id) return;
    this.oficioService.removerPdfAssinado(oficio.id).subscribe({
      next: () => {
        this.oficios = this.oficios.map((item) =>
          item.id === oficio.id
            ? { ...item, pdfAssinadoNome: undefined, pdfAssinadoUrl: undefined }
            : item
        );
        this.popupTitulo = 'Sucesso';
        this.popupErros = new PopupErrorBuilder()
          .adicionar('PDF assinado removido com sucesso.')
          .build();
      },
      error: () => {
        this.popupTitulo = 'Erro ao remover';
        this.popupErros = new PopupErrorBuilder()
          .adicionar('Não foi possível remover o PDF assinado.')
          .build();
      }
    });
  }

  formatarTextoOficio(texto: string): string[] {
    if (!texto) return [];

    const normalizado = texto.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    return normalizado
      .split('\n')
      .map((linha) => linha.replace(/^\s+/, '').replace(/\s{2,}/g, ' ').trim())
      .filter((linha) => linha.length > 0);
  }

  private formatarRodapeImpressao(rodape: string, razaoSocial: string): string {
    if (!rodape) return '';
    const linhas = rodape
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split('\n')
      .map((linha) => linha.trim())
      .filter((linha) => linha.length > 0);
    const normalizar = (texto: string) =>
      texto.toLowerCase().replace(/\s+/g, ' ').trim();
    const razaoNormalizada = normalizar(razaoSocial || '');
    const filtradas = linhas
      .map((linha) => {
        const normalizada = normalizar(linha);
        if (!razaoNormalizada) return linha;
        if (normalizada === razaoNormalizada) return '';
        if (normalizada.startsWith(razaoNormalizada)) {
          const contemCnpj = /\bcnpj\b/i.test(linha);
          if (contemCnpj) return linha;
          const semRazao = linha.slice(razaoSocial.length).replace(/^\s*[-–—]\s*/, '');
          return semRazao.trim();
        }
        return linha;
      })
      .filter((linha) => linha.length > 0);
    const linhasRodape = filtradas.slice(0, 3);
    return linhasRodape
      .map((linha) => `<div class="rodape-linha">${linha}</div>`)
      .join('');
  }

  private reagruparRodapeEmDuasLinhas(linhas: string[]): string[] {
    const primeira = linhas[0] || '';
    const conteudo = linhas.length > 1 ? linhas.slice(1).join(' - ') : '';
    if (!conteudo) return primeira ? [primeira] : [];

    const matchCep = conteudo.match(/\bCEP\b\s*[:\-]?\s*\d{5}-?\d{3}/i);
    if (!matchCep || matchCep.index === undefined) {
      return [primeira, conteudo].filter((linha) => linha && linha.length > 0);
    }

    const indiceCep = matchCep.index;
    const antesCep = conteudo.slice(0, indiceCep).trim();
    const aPartirCep = conteudo.slice(indiceCep).trim();
    return [primeira, antesCep, aPartirCep].filter((linha) => linha && linha.length > 0);
  }

  formatarLocalData(dataExtenso: string): string {
    const unidade = this.unidadeSelecionada ?? this.unidadeAtual;
    if (!unidade?.cidade || !unidade.estado) {
      return dataExtenso ? dataExtenso : '';
    }
    return `${unidade.cidade}-${unidade.estado}, ${dataExtenso}`;
  }

  formatarDataExtenso(data?: string): string {
    if (!data) return '';
    const [ano, mes, dia] = data.split('-').map(Number);
    const meses = [
      'janeiro',
      'fevereiro',
      'março',
      'abril',
      'maio',
      'junho',
      'julho',
      'agosto',
      'setembro',
      'outubro',
      'novembro',
      'dezembro'
    ];
    const nomeMes = meses[mes - 1] || '';
    return `${String(dia).padStart(2, '0')} de ${nomeMes} de ${ano}`;
  }

  private atualizarNumeroOficioSeNecessario(): void {
    if (this.editingId) return;
    const numeroAtual = this.form.get('identificacao.numero')?.value as string;
    if (numeroAtual) return;

    const anoAtual = new Date().getFullYear();
    const numerosDoAno = this.oficios
      .map((item) => item.identificacao?.numero || '')
      .map((numero) => this.extrairNumeroAno(numero))
      .filter((item) => item && item.ano === anoAtual) as { numero: number; ano: number }[];

    const maiorNumero = numerosDoAno.reduce((acc, item) => Math.max(acc, item.numero), 0);
    const proximoNumero = String(maiorNumero + 1).padStart(4, '0');
    this.form.get('identificacao.numero')?.setValue(`${proximoNumero}/${anoAtual}`);
  }

  private extrairNumeroAno(numero: string): { numero: number; ano: number } | null {
    if (!numero) return null;
    const partes = numero.split('/');
    if (partes.length !== 2) return null;
    const numeroParte = Number(partes[0]);
    const anoParte = Number(partes[1]);
    if (!Number.isFinite(numeroParte) || !Number.isFinite(anoParte)) return null;
    return { numero: numeroParte, ano: anoParte };
  }

  private normalizarNumeroOficio(numero: string | undefined): string {
    if (!numero) return '';
    return numero.replace(/\s+/g, '').replace(/[^0-9/]/g, '');
  }

  private correspondeFiltro(oficio: OficioPayload, termo: string): boolean {
    switch (this.filtroOficioCampo) {
      case 'numero':
        return this.normalizarTextoBusca(oficio.identificacao?.numero || '').includes(termo);
      case 'assunto':
        return this.normalizarTextoBusca(oficio.conteudo?.assunto || '').includes(termo);
      case 'resp':
        return this.normalizarTextoBusca(oficio.conteudo?.para || '').includes(termo);
      case 'para':
        return this.normalizarTextoBusca(oficio.conteudo?.razaoSocial || '').includes(termo);
      case 'data':
        return this.normalizarTextoBusca(oficio.identificacao?.data || '').includes(termo);
      default:
        return true;
    }
  }

  formatarStatus(status?: string): string {
    if (!status) return '-';
    const normalizado = this.normalizarTextoBusca(status);
    if (normalizado === 'em preparacao') return 'Em preparação';
    if (normalizado === 'em analise') return 'Em análise';
    return status;
  }

  obterClasseStatus(status: string | undefined): string {
    const normalizado = this.normalizarTextoBusca(status || '');
    if (normalizado === 'enviado') return 'status-pill--enviado';
    if (normalizado === 'em preparacao') return 'status-pill--preparacao';
    if (normalizado === 'em analise') return 'status-pill--analise';
    if (normalizado === 'recebido') return 'status-pill--recebido';
    if (normalizado === 'arquivado') return 'status-pill--arquivado';
    if (normalizado === 'rascunho') return 'status-pill--rascunho';
    return '';
  }

  private obterTituloUnidade(unidade: AssistanceUnitPayload): string {
    return unidade.nomeFantasia || unidade.razaoSocial || '';
  }

  private preencherConteudoDaUnidade(unidade: AssistanceUnitPayload | null): void {
    if (!unidade) return;
    const conteudoGroup = this.form.get('conteudo');
    if (!conteudoGroup) return;

    if (!conteudoGroup.get('logoUrl')?.value) {
      conteudoGroup.get('logoUrl')?.setValue(unidade.logomarcaRelatorio || unidade.logomarca || '');
    }

    if (!conteudoGroup.get('rodape')?.value) {
      conteudoGroup.get('rodape')?.setValue(this.montarRodapeUnidade(unidade));
    }
  }

  private montarRodapeUnidade(unidade: AssistanceUnitPayload): string {
    const linhaCnpj = [
      unidade.razaoSocial || unidade.nomeFantasia || '',
      unidade.cnpj ? `CNPJ: ${unidade.cnpj}` : ''
    ]
      .filter((item) => item && String(item).trim().length > 0)
      .join(' - ');

    const linhaEndereco = [
      unidade.endereco,
      unidade.numeroEndereco ? `no ${unidade.numeroEndereco}` : '',
      unidade.bairro ? `Bairro ${unidade.bairro}` : '',
      unidade.cep ? `CEP: ${unidade.cep}` : '',
      unidade.cidade,
      unidade.estado
    ]
      .filter((item) => item && String(item).trim().length > 0)
      .join(' - ');

    const linhaContato = [
      unidade.telefone ? `Fone: ${unidade.telefone}` : '',
      unidade.email ? `Email: ${unidade.email}` : '',
      unidade.site ? `site: ${unidade.site}` : ''
    ]
      .filter((item) => item && String(item).trim().length > 0)
      .join(' - ');

    return [linhaCnpj, linhaEndereco, linhaContato]
      .filter((item) => item && String(item).trim().length > 0)
      .join('\n');
  }

  private atualizarOpcoesUnidade(): void {
    const termo = this.normalizarTextoBusca(this.unidadeTermo);
    const opcoes = (this.unidades ?? [])
      .filter((item) => this.normalizarTextoBusca(this.obterTituloUnidade(item)).includes(termo))
      .map((item) => ({ id: String(item.id ?? ''), label: this.obterTituloUnidade(item) }));
    this.unidadeOpcoes = opcoes.slice(0, 8);
  }

  private atualizarOpcoesResponsavel(): void {
    const termo = this.normalizarTextoBusca(this.responsavelTermo);
    const opcoes = (this.profissionais ?? [])
      .filter((item) => this.normalizarTextoBusca(item.nomeCompleto).includes(termo))
      .map((item) => ({ id: String(item.id), label: item.nomeCompleto }));
    this.responsavelOpcoes = opcoes.slice(0, 8);
  }

  private extrairCargosProfissional(profissional: ProfessionalRecord): string[] {
    if (!profissional.categoria) return [];
    return profissional.categoria
      .split(/[;,/]/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  private normalizarTextoBusca(texto: string): string {
    return (texto || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  private obterLogomarcaParaImpressao(logoUrl?: string): string {
    if (logoUrl) return logoUrl;
    return this.unidadeAtual?.logomarcaRelatorio || this.unidadeAtual?.logomarca || '';
  }

  private buildInitialFormValue() {
    const today = new Date().toISOString().split('T')[0];

    return {
      identificacao: {
        tipo: 'emissao',
        numero: '',
        data: today,
        setorOrigem: '',
        responsavel: '',
        meioEnvio: 'E-mail',
        prazoResposta: '',
        classificacao: ''
      },
      conteudo: {
        razaoSocial: '',
        logoUrl: '',
        titulo: '',
        saudacao: '',
        para: '',
        cargoPara: '',
        assunto: '',
        corpo: '',
        finalizacao:
          'Sem mais para o momento, colocamo-nos à inteira disposição de Vossa Senhoria para quaisquer esclarecimentos que se façam necessários, reiterando protestos de elevada estima e consideração',
        assinaturaNome: '',
        assinaturaCargo: '',
        rodape: ''
      },
      protocolo: {
        status: 'Rascunho',
        protocoloEnvio: '',
        dataEnvio: '',
        protocoloRecebimento: '',
        dataRecebimento: '',
        proximoDestino: '',
        observacoes: ''
      },
      tramitacao: {
        data: today,
        origem: '',
        destino: '',
        responsavel: '',
        acao: '',
        observacoes: ''
      }
    };
  }

  private resetState(): void {
    const initialState = this.buildInitialFormValue();
    this.tramites = [];
    this.editingId = null;
    this.termoBuscarOficio = '';
    this.imagensAnexo = [];
    this.form.reset(initialState);
    this.popupErros = [];
    this.saving = false;
    this.changeTab('identificacao');
    this.definirResponsavelAutenticado();
    this.atualizarNumeroOficioSeNecessario();
  }

  fecharPopupErros(): void {
    this.popupErros = [];
  }

  private definirResponsavelAutenticado(): void {
    const usuario = this.authService.user();
    const nome = usuario?.nome || usuario?.nomeUsuario || '';
    const control = this.form.get('identificacao.responsavel');
    if (!control) return;
    control.setValue(nome);
    this.definirAssinaturaAutenticada(nome);
  }

  private definirAssinaturaAutenticada(nome: string): void {
    if (!nome) return;
    this.form.get('conteudo.assinaturaNome')?.setValue(nome);
    const profissional = this.profissionais.find((item) => item.nomeCompleto === nome);
    if (!profissional) return;
    const cargos = this.extrairCargosProfissional(profissional);
    this.responsavelCargos = cargos;
    if (cargos.length > 0) {
      this.form.get('conteudo.assinaturaCargo')?.setValue(cargos[0]);
    }
  }

  private carregarImagensOficio(oficioId: string): void {
    this.oficioService.listarImagens(oficioId).subscribe({
      next: (imagens) => {
        this.imagensAnexo = [...(imagens ?? [])].sort(
          (a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)
        );
        this.reordenarImagens();
      },
      error: () => {
        this.imagensAnexo = [];
        this.popupTitulo = 'Aviso';
        this.popupErros = new PopupErrorBuilder()
          .adicionar('Não foi possível carregar as imagens do ofício.')
          .build();
      }
    });
  }

  private salvarImagensPendentes(oficioId: string, aoFinal: () => void): void {
    const pendentes = this.imagensAnexo.filter((imagem) => !imagem.id);
    if (pendentes.length === 0) {
      aoFinal();
      return;
    }
    const enviar = (index: number) => {
      if (index >= pendentes.length) {
        aoFinal();
        return;
      }
      const imagem = pendentes[index];
      this.oficioService.adicionarImagem(oficioId, imagem).subscribe({
        next: (salva) => {
          this.imagensAnexo = this.imagensAnexo.map((item) => (item === imagem ? salva : item));
          enviar(index + 1);
        },
        error: () => {
          this.popupTitulo = 'Erro ao anexar';
          this.popupErros = new PopupErrorBuilder()
            .adicionar('Não foi possível anexar uma das imagens do ofício.')
            .build();
          aoFinal();
        }
      });
    };
    enviar(0);
  }

  private validarImagemArquivo(arquivo: File): boolean {
    if (!['image/jpeg', 'image/png'].includes(arquivo.type)) {
      this.popupTitulo = 'Aviso';
      this.popupErros = new PopupErrorBuilder()
        .adicionar('Envie apenas imagens JPG ou PNG.')
        .build();
      return false;
    }
    if (arquivo.size > 10 * 1024 * 1024) {
      this.popupTitulo = 'Aviso';
      this.popupErros = new PopupErrorBuilder()
        .adicionar('Imagem excede o limite de 10MB.')
        .build();
      return false;
    }
    return true;
  }

  private lerImagensSequencialmente(arquivos: File[], indice: number): void {
    if (indice >= arquivos.length) {
      this.reordenarImagens();
      return;
    }
    const arquivo = arquivos[indice];
    const leitor = new FileReader();
    leitor.onload = () => {
      const conteudo = typeof leitor.result === 'string' ? leitor.result : '';
      const base64 = conteudo.includes(',') ? conteudo.split(',')[1] : conteudo;
      this.imagensAnexo = [
        ...this.imagensAnexo,
        {
          nomeArquivo: arquivo.name,
          tipoMime: arquivo.type || 'image/jpeg',
          conteudoBase64: base64,
          ordem: this.imagensAnexo.length + 1
        }
      ];
      this.lerImagensSequencialmente(arquivos, indice + 1);
    };
    leitor.readAsDataURL(arquivo);
  }

  private reordenarImagens(): void {
    this.imagensAnexo = this.imagensAnexo.map((imagem, index) => ({
      ...imagem,
      ordem: index + 1
    }));
  }
}

