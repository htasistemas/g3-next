import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription, debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faBullhorn } from '@fortawesome/free-solid-svg-icons';
import { BeneficiarioApiPayload, BeneficiarioApiService } from '../../services/beneficiario-api.service';
import { AssistanceUnitPayload, AssistanceUnitService } from '../../services/assistance-unit.service';
import { SenhasService, SenhaFilaResponse } from '../../services/senhas.service';
import { SalaRecord, SalasService } from '../../services/salas.service';
import { AutocompleteComponent, AutocompleteOpcao } from '../compartilhado/autocomplete/autocomplete.component';
import { PopupMessagesComponent } from '../compartilhado/popup-messages/popup-messages.component';
import { TelaPadraoComponent } from '../compartilhado/tela-padrao/tela-padrao.component';
import { ConfigAcoesCrud, EstadoAcoesCrud, TelaBaseComponent } from '../compartilhado/tela-base.component';
import { PopupErrorBuilder } from '../../utils/popup-error.builder';
import { SenhasConfigService, SenhasConfigRequest } from '../../services/senhas-config.service';

@Component({
  selector: 'app-senhas-chamar',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    FontAwesomeModule,
    TelaPadraoComponent,
    PopupMessagesComponent,
    AutocompleteComponent
  ],
  templateUrl: './senhas-chamar.component.html',
  styleUrl: './senhas-chamar.component.scss'
})
export class SenhasChamarComponent extends TelaBaseComponent implements OnInit, OnDestroy {
  abas = [
    { id: 'entrada', label: 'Entrada na fila' },
    { id: 'fila', label: 'Fila aguardando' },
    { id: 'config', label: 'Configurações do painel' }
  ];
  abaAtiva = 'entrada';
  readonly faBullhorn = faBullhorn;
  get abaAtivaIndex(): number {
    return this.abas.findIndex((aba) => aba.id === this.abaAtiva);
  }
  filaAguardando: SenhaFilaResponse[] = [];
  carregandoFila = false;
  mensagem: string | null = null;
  popupErros: string[] = [];
  tempoMedioEspera = 0;
  filaEmChamadaId: number | null = null;

  termoBusca = '';
  opcoesBeneficiarios: AutocompleteOpcao[] = [];
  carregandoBeneficiarios = false;
  beneficiarioSelecionadoId: number | null = null;
  beneficiarioSelecionadoNome: string | null = null;
  beneficiariosResultado: BeneficiarioApiPayload[] = [];

  localAtendimento = 'Guiche 01';
  salasDisponiveis: SalaRecord[] = [];
  salaSelecionadaId: string | null = null;
  salasCarregando = false;
  unidadePainelId: number | null = null;
  fraseFala = 'Beneficiário {beneficiario} dirija-se a {sala} para atendimento.';
  rssUrl = 'https://www.gov.br/pt-br/noticias/assistencia-social/RSS';
  velocidadeTicker: number | null = 60;
  modoNoticias: 'RSS' | 'MANUAL' = 'RSS';
  noticiasManuais = '';
  noticiasManuaisLista: string[] = [];
  noticiaManualInput = '';
  quantidadeUltimasChamadas: number | null = 4;
  velocidadesDisponiveis: number[] = [10, 20, 30, 45, 60, 90, 120, 300, 400, 500, 600];
  quantidadesUltimasChamadasDisponiveis: number[] = [2, 3, 4, 5, 6, 8, 10];
  tituloTela = 'Chamada de senhas';
  descricaoTela = 'Controle de fila e chamada de beneficiários.';
  prioridades: string[] = ['Normal', 'Prioridade'];
  prioridadeSelecionada = 'Normal';
  novaPrioridade = '';

  unidades: AssistanceUnitPayload[] = [];
  unidadeSelecionadaId: number | null = null;
  filtroUnidadeId: number | null = null;
  filtroPrioridade: string | null = null;

  private readonly buscarBeneficiario$ = new Subject<string>();
  private readonly subscriptions = new Subscription();
  private salvandoConfiguracoes = false;

  readonly acoesToolbar: Required<ConfigAcoesCrud> = this.criarConfigAcoes({
    salvar: true,
    cancelar: true
  });

  get acoesDesabilitadas(): EstadoAcoesCrud {
    return {
      salvar: this.salvandoConfiguracoes,
      cancelar: this.salvandoConfiguracoes
    };
  }

  constructor(
    private readonly senhaService: SenhasService,
    private readonly beneficiarioService: BeneficiarioApiService,
    private readonly unidadeService: AssistanceUnitService,
    private readonly salasService: SalasService,
    private readonly configService: SenhasConfigService
  ) {
    super();
  }

  ngOnInit(): void {
    this.carregarUnidades();
    this.carregarFila();
    this.carregarConfiguracoes();

    this.subscriptions.add(
      this.buscarBeneficiario$
        .pipe(debounceTime(350), distinctUntilChanged())
        .subscribe((termo) => this.buscarBeneficiarios(termo))
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  onBuscar(): void {
    this.carregarFila();
  }

  onNovo(): void {
    this.emitirSenha();
  }

  selecionarAba(id: string): void {
    this.abaAtiva = id;
  }

  onTermoBuscaChange(valor: string): void {
    this.termoBusca = valor;
    if (!valor || valor.length < 3) {
      this.opcoesBeneficiarios = [];
      return;
    }
    this.buscarBeneficiario$.next(valor);
  }

  selecionarBeneficiario(opcao: AutocompleteOpcao): void {
    this.beneficiarioSelecionadoId = Number(opcao.id);
    this.beneficiarioSelecionadoNome = opcao.label;
  }

  carregarFila(): void {
    this.carregandoFila = true;
    this.mensagem = null;
    this.senhaService.listarAguardando(this.unidadeSelecionadaId).subscribe({
      next: (fila) => {
        this.filaAguardando = fila;
        this.atualizarTempoMedio();
        this.carregandoFila = false;
      },
      error: () => {
        this.carregandoFila = false;
        this.mensagem = 'Nao foi possivel carregar a fila.';
      }
    });
  }

  emitirSenha(): void {
    this.popupErros = [];
    const builder = new PopupErrorBuilder();

    if (!this.beneficiarioSelecionadoId) {
      builder.adicionar('Beneficiario e obrigatorio.');
    }

    if (!this.salaSelecionadaId) {
      builder.adicionar('Sala de atendimento é obrigatória.');
    }

    if (!this.prioridadeSelecionada?.trim()) {
      builder.adicionar('Prioridade é obrigatória.');
    }

    const mensagens = builder.build();
    if (mensagens.length > 0) {
      this.popupErros = mensagens;
      return;
    }

    const salaNome = this.buscarSalaNome(this.salaSelecionadaId ?? '');
    this.senhaService
      .emitir({
        beneficiarioId: this.beneficiarioSelecionadoId!,
        prioridade: this.normalizarPrioridade(this.prioridadeSelecionada),
        unidadeId: this.unidadeSelecionadaId ?? undefined,
        salaAtendimento: salaNome ?? undefined
      })
      .subscribe({
        next: () => {
          this.mensagem = 'Beneficiario inserido na fila.';
          this.beneficiarioSelecionadoId = null;
          this.beneficiarioSelecionadoNome = null;
          this.prioridadeSelecionada = this.prioridades[0] ?? 'Normal';
          this.termoBusca = '';
          this.opcoesBeneficiarios = [];
          this.carregarFila();
        },
        error: () => {
          this.mensagem = 'Não foi possível inserir o beneficiário na fila.';
        }
      });
  }

  chamar(item: SenhaFilaResponse): void {
    this.popupErros = [];
    const salaNome = item.salaAtendimento;
    if (!salaNome) {
      this.popupErros = ['Sala de atendimento não definida na entrada da fila.'];
      return;
    }

    if (this.filaEmChamadaId === item.id) {
      return;
    }

    this.filaEmChamadaId = item.id;
    this.senhaService
      .chamar({
        filaId: item.id,
        localAtendimento: salaNome,
        unidadeId: this.unidadeSelecionadaId ?? undefined
      })
      .subscribe({
        next: () => {
          this.mensagem = `Beneficiario chamado para ${this.localAtendimento}.`;
          this.filaEmChamadaId = null;
          this.carregarFila();
        },
        error: (error) => {
          const mensagemErro = this.extrairMensagemErro(error);
          this.popupErros = [mensagemErro];
          this.mensagem = null;
          this.filaEmChamadaId = null;
          this.carregarFila();
        }
      });
  }

  concluirFila(item: SenhaFilaResponse): void {
    this.senhaService.finalizarFila(item.id).subscribe({
      next: () => {
        this.mensagem = 'Atendimento concluido.';
        this.carregarFila();
      },
      error: () => {
        this.popupErros = ['Nao foi possivel concluir o atendimento.'];
      }
    });
  }

  get filaFiltrada(): SenhaFilaResponse[] {
    return this.filaAguardando.filter((item) => {
      const passaUnidade = this.filtroUnidadeId ? item.unidadeId === this.filtroUnidadeId : true;
      const passaPrioridade = this.filtroPrioridade
        ? String(item.prioridade) === String(this.normalizarPrioridade(this.filtroPrioridade))
        : true;
      return passaUnidade && passaPrioridade;
    });
  }

  adicionarPrioridade(): void {
    const valor = this.novaPrioridade.trim();
    if (!valor) return;
    if (!this.prioridades.includes(valor)) {
      this.prioridades = [...this.prioridades, valor];
    }
    this.prioridadeSelecionada = valor;
    this.novaPrioridade = '';
  }

  private extrairMensagemErro(error: unknown): string {
    const payload = error as { error?: { message?: string; errors?: { defaultMessage?: string }[] } };
    if (payload?.error?.message) {
      return payload.error.message;
    }
    const primeira = payload?.error?.errors?.find((item) => item?.defaultMessage);
    if (primeira?.defaultMessage) {
      return primeira.defaultMessage;
    }
    return 'Não foi possível chamar o beneficiário.';
  }

  private carregarUnidades(): void {
    this.unidadeService.list().subscribe({
      next: (unidades) => {
        this.unidades = unidades ?? [];
        const principal = unidades.find((item) => item.unidadePrincipal) || unidades[0] || null;
        this.unidadeSelecionadaId = principal?.id ?? null;
        this.carregarSalas();
      },
      error: () => {
        this.unidades = [];
        this.unidadeSelecionadaId = null;
        this.salasDisponiveis = [];
      }
    });
  }

  onUnidadeSelecionada(): void {
    this.carregarSalas();
  }

  private carregarSalas(): void {
    if (!this.unidadeSelecionadaId) {
      this.salasDisponiveis = [];
      this.salaSelecionadaId = null;
      return;
    }
    this.salasCarregando = true;
    this.salasService.list(this.unidadeSelecionadaId).subscribe({
      next: (salas) => {
        this.salasDisponiveis = salas ?? [];
        this.salaSelecionadaId = this.salasDisponiveis[0]?.id ?? null;
        this.salasCarregando = false;
      },
      error: () => {
        this.salasDisponiveis = [];
        this.salaSelecionadaId = null;
        this.salasCarregando = false;
      }
    });
  }

  private buscarBeneficiarios(termo: string): void {
    this.carregandoBeneficiarios = true;
    const parametros = this.montarParametrosBuscaBeneficiario(termo);
    this.beneficiarioService.list(parametros).subscribe({
      next: ({ beneficiarios }) => {
        this.beneficiariosResultado = beneficiarios ?? [];
        this.opcoesBeneficiarios = (beneficiarios ?? []).map((item: BeneficiarioApiPayload) => ({
          id: item.id_beneficiario ?? '',
          label: item.nome_completo,
          sublabel: item.cpf || item.codigo || ''
        }));
        this.carregandoBeneficiarios = false;
      },
      error: () => {
        this.beneficiariosResultado = [];
        this.opcoesBeneficiarios = [];
        this.carregandoBeneficiarios = false;
      }
    });
  }

  calcularEspera(dataEntrada: string): number {
    if (!dataEntrada) return 0;
    const entrada = new Date(dataEntrada);
    if (Number.isNaN(entrada.getTime())) return 0;
    const diffMs = new Date().getTime() - entrada.getTime();
    const minutos = Math.max(0, Math.round(diffMs / 60000));
    return minutos;
  }

  private atualizarTempoMedio(): void {
    if (!this.filaFiltrada.length) {
      this.tempoMedioEspera = 0;
      return;
    }
    const soma = this.filaFiltrada.reduce((acc, item) => acc + this.calcularEspera(item.dataHoraEntrada), 0);
    this.tempoMedioEspera = Math.round(soma / this.filaFiltrada.length);
  }

  private normalizarPrioridade(prioridade: string): number {
    const valor = prioridade.trim().toLowerCase();
    if (valor === 'prioridade' || valor === 'alta') return 2;
    if (valor === 'normal' || valor === 'media') return 1;
    const numero = Number(prioridade);
    return Number.isNaN(numero) ? 0 : numero;
  }

  obterLabelPrioridadeFila(prioridade: number): string {
    if (prioridade >= 2) {
      return 'Prioridade';
    }
    if (prioridade === 1) {
      return 'Normal';
    }
    const texto = this.prioridades.find((item) => this.normalizarPrioridade(item) === prioridade);
    return texto ?? 'Normal';
  }

  private buscarSalaNome(salaId: string): string | null {
    const sala = this.salasDisponiveis.find((item) => item.id === salaId);
    return sala?.nome ?? null;
  }

  abrirPainel(): void {
    const unidadeId = this.unidadePainelId ?? this.unidadeSelecionadaId;
    const rota = unidadeId ? `/senhas/painel?unidadeId=${unidadeId}` : '/senhas/painel';
    window.open(rota, '_blank');
  }

  salvarConfiguracoes(): void {
    this.popupErros = [];
    this.mensagem = null;
    const builder = new PopupErrorBuilder();

    if (!this.fraseFala?.trim()) {
      builder.adicionar('Frase da chamada é obrigatória.');
    }
    if (this.fraseFala && !this.fraseFala.includes('{beneficiario}')) {
      builder.adicionar('A frase deve conter {beneficiario}.');
    }
    if (this.fraseFala && !this.fraseFala.includes('{sala}')) {
      builder.adicionar('A frase deve conter {sala}.');
    }

    if (this.modoNoticias === 'RSS' && !this.rssUrl?.trim()) {
      builder.adicionar('Feed de noticias (RSS) e obrigatorio.');
    }
    if (this.modoNoticias === 'MANUAL' && this.noticiasManuaisLista.length > 10) {
      builder.adicionar('Limite maximo de 10 noticias manuais.');
    }
    if (
      this.modoNoticias === 'MANUAL' &&
      this.noticiasManuaisLista.some((item) => item.length > 120)
    ) {
      builder.adicionar('Cada noticia manual deve ter no maximo 120 caracteres.');
    }

    if (this.velocidadeTicker == null) {
      builder.adicionar('Velocidade do ticker é obrigatória.');
    }
    if (this.quantidadeUltimasChamadas == null) {
      builder.adicionar('Quantidade de últimas chamadas é obrigatória.');
    }

    const mensagens = builder.build();
    if (mensagens.length > 0) {
      this.popupErros = mensagens;
      return;
    }

    this.salvandoConfiguracoes = true;
    const payload: SenhasConfigRequest = {
      fraseFala: this.fraseFala.trim(),
      rssUrl: this.rssUrl.trim(),
      velocidadeTicker: this.velocidadeTicker ?? 0,
      modoNoticias: this.modoNoticias,
      noticiasManuais: this.noticiasManuaisLista.join('\n') || null,
      quantidadeUltimasChamadas: this.quantidadeUltimasChamadas ?? 0,
      unidadePainelId: this.unidadePainelId,
      tituloTela: this.tituloTela,
      descricaoTela: this.descricaoTela
    };
    this.configService.atualizar(payload).subscribe({
      next: (config) => {
        this.fraseFala = config.fraseFala;
        this.rssUrl = config.rssUrl;
        this.velocidadeTicker = config.velocidadeTicker;
        this.modoNoticias = (config.modoNoticias as 'RSS' | 'MANUAL') ?? 'RSS';
        this.noticiasManuais = config.noticiasManuais ?? '';
        this.noticiasManuaisLista = this.transformarNoticiasManuais(this.noticiasManuais);
        this.quantidadeUltimasChamadas = config.quantidadeUltimasChamadas;
        this.unidadePainelId = config.unidadePainelId ?? null;
        this.tituloTela = config.tituloTela ?? this.tituloTela;
        this.descricaoTela = config.descricaoTela ?? this.descricaoTela;
        this.mensagem = 'Dados atualizados com sucesso.';
        this.salvandoConfiguracoes = false;
      },
      error: (error) => {
        const mensagemErro = this.extrairMensagemErro(error);
        this.popupErros = [mensagemErro];
        this.salvandoConfiguracoes = false;
      }
    });
  }

  cancelarConfiguracoes(): void {
    this.fraseFala = '';
    this.rssUrl = '';
    this.velocidadeTicker = null;
    this.modoNoticias = 'RSS';
    this.noticiasManuais = '';
    this.noticiasManuaisLista = [];
    this.noticiaManualInput = '';
    this.quantidadeUltimasChamadas = null;
    this.tituloTela = '';
    this.descricaoTela = '';
    this.unidadePainelId = null;
    this.mensagem = null;
    this.popupErros = [];
  }

  testarFrase(): void {
    const frase = this.fraseFala
      .replace('{beneficiario}', this.beneficiarioSelecionadoNome ?? 'Beneficiário')
      .replace('{sala}', this.buscarSalaNome(this.salaSelecionadaId ?? '') ?? 'Sala');
    if (!('speechSynthesis' in window)) {
      this.popupErros = ['Navegador não suporta chamada por voz.'];
      return;
    }
    const synth = window.speechSynthesis;
    const utter = new SpeechSynthesisUtterance(frase);
    utter.lang = 'pt-BR';
    utter.rate = 0.95;
    synth.cancel();
    synth.speak(utter);
  }

  private carregarConfiguracoes(): void {
    this.configService.obter().subscribe({
      next: (config) => {
        this.fraseFala = config.fraseFala;
        this.rssUrl = config.rssUrl;
        this.velocidadeTicker = config.velocidadeTicker;
        this.modoNoticias = (config.modoNoticias as 'RSS' | 'MANUAL') ?? 'RSS';
        this.noticiasManuais = config.noticiasManuais ?? '';
        this.noticiasManuaisLista = this.transformarNoticiasManuais(this.noticiasManuais);
        this.quantidadeUltimasChamadas = config.quantidadeUltimasChamadas;
        this.unidadePainelId = config.unidadePainelId ?? null;
        this.tituloTela = config.tituloTela ?? this.tituloTela;
        this.descricaoTela = config.descricaoTela ?? this.descricaoTela;
      }
    });
  }

  private montarParametrosBuscaBeneficiario(termo: string): {
    nome?: string;
    cpf?: string;
    codigo?: string;
  } {
    const valor = termo.trim();
    if (!valor) return {};

    const possuiLetra = /[a-zA-Z]/.test(valor);
    const apenasNumeros = valor.replace(/\D/g, '');

    if (apenasNumeros.length === 11) {
      return { cpf: apenasNumeros };
    }

    if (!possuiLetra && apenasNumeros.length > 0) {
      return { codigo: apenasNumeros };
    }

    return { nome: valor };
  }

  adicionarNoticiaManual(): void {
    const texto = this.noticiaManualInput.trim();
    if (!texto) {
      return;
    }
    const novas = this.transformarNoticiasManuais(texto);
    const combinadas = [...this.noticiasManuaisLista, ...novas];
    const unicas = Array.from(new Set(combinadas));
    this.noticiasManuaisLista = unicas.slice(0, 10);
    this.noticiaManualInput = '';
  }

  removerNoticiaManual(indice: number): void {
    this.noticiasManuaisLista = this.noticiasManuaisLista.filter((_, idx) => idx !== indice);
  }

  private transformarNoticiasManuais(texto: string): string[] {
    return texto
      .split(/[\n;]/)
      .map((linha) => linha.trim())
      .filter((linha) => linha.length > 0);
  }
}

