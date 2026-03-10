import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faClipboardList, faHandHoldingDollar, faHandshake, faIdCard, faListCheck, faUserPlus } from '@fortawesome/free-solid-svg-icons';
import { PopupMessagesComponent } from '../compartilhado/popup-messages/popup-messages.component';
import { TelaPadraoComponent } from '../compartilhado/tela-padrao/tela-padrao.component';
import { PopupErrorBuilder } from '../../utils/popup-error.builder';
import { AutocompleteComponent, AutocompleteOpcao } from '../compartilhado/autocomplete/autocomplete.component';
import { DialogComponent } from '../compartilhado/dialog/dialog.component';
import {
  DoadorResponse,
  RecebimentoDoacaoResponse,
  RecebimentoDoacaoService
} from '../../services/recebimento-doacao.service';
import { ContabilidadeService, ContaBancariaResponse } from '../../services/contabilidade.service';
import { AlmoxarifadoService, StockItem, StockItemStatus } from '../../services/almoxarifado.service';
import { Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

interface TabItem {
  id: 'doador' | 'doadores' | 'dados' | 'recorrencia' | 'gestao' | 'lista';
  label: string;
  icon: any;
}

@Component({
  selector: 'app-recebimento-doacao',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FontAwesomeModule,
    TelaPadraoComponent,
    PopupMessagesComponent,
    AutocompleteComponent,
    DialogComponent
  ],
  templateUrl: './recebimento-doacao.component.html',
  styleUrl: './recebimento-doacao.component.scss'
})
export class RecebimentoDoacaoComponent implements OnInit {
  readonly faClipboardList = faClipboardList;
  readonly faUserPlus = faUserPlus;
  readonly faHandHoldingDollar = faHandHoldingDollar;
  readonly faHandshake = faHandshake;
  readonly faIdCard = faIdCard;
  readonly faListCheck = faListCheck;

  tabs: TabItem[] = [
    { id: 'doador', label: 'Cadastro do doador', icon: faUserPlus },
    { id: 'doadores', label: 'Listagem de doadores', icon: faClipboardList },
    { id: 'dados', label: 'Dados da doação', icon: faHandshake },
    { id: 'recorrencia', label: 'Recorrência', icon: faListCheck },
    { id: 'gestao', label: 'Gestão de doação', icon: faIdCard },
    { id: 'lista', label: 'Listagem de doações', icon: faClipboardList }
  ];

  activeTab: TabItem['id'] = 'doador';

  acoesToolbar = {
    salvar: true,
    excluir: true,
    novo: true,
    cancelar: true,
    imprimir: true,
    buscar: true
  };

  acoesDesabilitadas = {
    salvar: false,
    excluir: false,
    novo: false,
    cancelar: false,
    imprimir: false,
    buscar: false
  };

  popupErros: string[] = [];
  popupTitulo = 'Campos obrigatorios';
  mensagemSucessoDoacao = '';

  doadorForm: FormGroup;
  recebimentoForm: FormGroup;
  recorrenciaForm: FormGroup;
  gestaoForm: FormGroup;

  doadores: DoadorResponse[] = [];
  doadoresOpcoes: AutocompleteOpcao[] = [];
  doadoresCarregando = false;
  doadoresErro: string | null = null;
  termoBuscaDoador = '';
  termoBuscaItemDoado = '';
  recebimentos: RecebimentoDoacaoResponse[] = [];
  almoxarifadoItens: StockItem[] = [];
  doadorSelecionadoId: number | null = null;
  carregandoDoadores = false;
  carregandoRecebimentos = false;
  recebimentoEditandoId: number | null = null;
  dialogExcluirDoadorAberto = false;
  doadorParaExcluir: DoadorResponse | null = null;
  dialogExcluirRecebimentoAberto = false;
  recebimentoParaExcluir: RecebimentoDoacaoResponse | null = null;
  dialogContaRecebimentoAberto = false;
  contasRecebimentoLocal: ContaBancariaResponse[] = [];
  contaRecebimentoSelecionadaId: number | null = null;
  itensDoacaoOpcoes: AutocompleteOpcao[] = [];
  itemDoacaoSelecionadoId: number | null = null;
  itemDoacaoSelecionadoAlmoxarifadoId: string | null = null;
  itemDoacaoSelecionadoChave: string | null = null;
  itemDoacaoSelecionadoTemValor = false;
  categoriaItemTermo = '';
  unidadeMedidaItemTermo = '';
  localizacaoItemTermo = '';
  localizacaoInternaItemTermo = '';
  categoriasItemOpcoes: AutocompleteOpcao[] = [];
  unidadesMedidaItemOpcoes: AutocompleteOpcao[] = [];
  localizacoesItemOpcoes: AutocompleteOpcao[] = [];
  localizacoesInternasItemOpcoes: AutocompleteOpcao[] = [];
  private categoriasItemOpcoesBase: AutocompleteOpcao[] = [];
  private unidadesMedidaItemOpcoesBase: AutocompleteOpcao[] = [];
  private localizacoesItemOpcoesBase: AutocompleteOpcao[] = [];
  private localizacoesInternasItemOpcoesBase: AutocompleteOpcao[] = [];

  get isDoacaoDinheiro(): boolean {
    const tipo = (this.recebimentoForm.get('tipoDoacao')?.value ?? '').toString().toLowerCase();
    return tipo.includes('dinheiro');
  }

  get isDoacaoItens(): boolean {
    return !this.isDoacaoDinheiro;
  }

  get itemDoacaoExistenteSelecionado(): boolean {
    return this.itemDoacaoSelecionadoChave !== null;
  }

  get itemDoacaoExistenteNaoSelecionado(): boolean {
    if (!this.isDoacaoItens || this.recebimentoEditandoId) return false;
    const descricao = (this.recebimentoForm.get('descricao')?.value || '').toString();
    const descricaoNormalizada = this.normalizarTexto(descricao);
    if (!descricaoNormalizada) return false;
    const itemExistenteRecebimento = this.buscarItemExistente(descricaoNormalizada);
    const itemExistenteAlmoxarifado = this.buscarItemAlmoxarifado(descricaoNormalizada);
    const existe = !!itemExistenteRecebimento || !!itemExistenteAlmoxarifado;
    if (!existe) return false;
    return this.itemDoacaoSelecionadoChave !== descricaoNormalizada;
  }

  constructor(
    private readonly fb: FormBuilder,
    private readonly service: RecebimentoDoacaoService,
    private readonly contabilidadeService: ContabilidadeService,
    private readonly almoxarifadoService: AlmoxarifadoService
  ) {
    this.doadorForm = this.fb.group({
      tipoPessoa: ['FISICA', Validators.required],
      nome: ['', [Validators.required, Validators.minLength(3)]],
      documento: ['', [Validators.required, this.cpfValidator]], 
      responsavelEmpresa: [''],
      email: ['', [Validators.email]],
      telefone: ['', [this.telefoneValidator]],
      logradouro: [''],
      numero: [''],
      complemento: [''],
      bairro: [''],
      cidade: [''],
      uf: [''],
      cep: [''],
      observacoes: ['']
    });
    this.atualizarTipoPessoaValidators();

    this.recebimentoForm = this.fb.group({
      doadorId: [null, Validators.required],
      tipoDoacao: ['', Validators.required],
      dataRecebimento: ['', Validators.required],
      valor: [''],
      quantidadeItens: [''],
      valorMedio: [''],
      valorTotal: [''],
      formaRecebimento: [''],
      status: ['Aguardando', Validators.required],
      descricao: [''],
      categoriaItem: [''],
      unidadeItem: [''],
      localizacaoItem: [''],
      localizacaoInternaItem: [''],
      estoqueAtualItem: [0],
      estoqueMinimoItem: [0],
      valorUnitarioItem: [''],
      statusItem: ['Ativo'],
      observacoes: ['']
    });
    this.atualizarValidatorsRecebimento();
    this.onTipoDoacaoChange();

    this.recorrenciaForm = this.fb.group({
      recorrente: [false],
      periodicidade: ['Mensal'],
      proximaCobranca: ['']
    });

    this.gestaoForm = this.fb.group({
      canal: ['whatsapp'],
      mensagem: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  ngOnInit(): void {
    this.carregarDoadores();
    this.carregarRecebimentos();
    this.carregarContasRecebimentoLocal();
    this.carregarItensAlmoxarifado();
  }

  changeTab(tab: TabItem['id']): void {
    this.activeTab = tab;
    if (tab !== 'dados') {
      this.mensagemSucessoDoacao = '';
    }
    if (tab === 'doador' || tab === 'doadores') {
      this.doadorSelecionadoId = null;
      this.carregarDoadores();
    }
    if (tab === 'lista') {
      this.carregarRecebimentos();
    }
    if (tab === 'dados') {
      const selectedId = this.recebimentoForm.get('doadorId')?.value;
      const selected = this.doadores.find((doador) => doador.id === Number(selectedId));
      this.termoBuscaDoador = selected?.nome || '';
      this.carregarContasRecebimentoLocal();
      this.atualizarOpcoesItensDoacao();
    }
  }

  getTabIndex(id: TabItem['id']): number {
    return this.tabs.findIndex((tab) => tab.id === id);
  }

  onSalvar(): void {
    if (this.activeTab === 'doador') {
      this.salvarDoador();
      return;
    }
    if (this.activeTab === 'dados') {
      this.salvarRecebimento();
      return;
    }
    this.popupErros = new PopupErrorBuilder()
      .adicionar('Ação disponível apenas nas abas Cadastro do doador e Dados da doação.')
      .build();
  }

  onExcluir(): void {
    if (this.recebimentoEditandoId) {
      const recebimento = this.recebimentos.find((item) => item.id === this.recebimentoEditandoId) || null;
      if (!recebimento) {
        this.popupErros = new PopupErrorBuilder()
          .adicionar('Selecione um recebimento válido para excluir.')
          .build();
        return;
      }
      this.recebimentoParaExcluir = recebimento;
      this.dialogExcluirRecebimentoAberto = true;
      return;
    }
    this.popupErros = new PopupErrorBuilder()
      .adicionar('Selecione um recebimento na listagem para excluir.')
      .build();
  }

  onNovo(): void {
    this.doadorForm.reset({ tipoPessoa: 'FISICA' });
    this.recebimentoForm.reset({ status: 'Aguardando', statusItem: 'Ativo', estoqueMinimoItem: 0 });
    this.recorrenciaForm.reset({ recorrente: false, periodicidade: 'Mensal' });
    this.gestaoForm.reset({ canal: 'whatsapp' });
    this.contaRecebimentoSelecionadaId = null;
    this.limparSelecaoItemDoacao();
    this.onTipoDoacaoChange();
    this.mensagemSucessoDoacao = '';
    this.popupErros = [];
    this.recebimentoEditandoId = null;
    this.changeTab('doador');
  }

  onCancelar(): void {
    this.onNovo();
    this.popupErros = [];
    this.popupTitulo = 'Campos obrigatorios';
  }

  onImprimir(): void {
    window.print();
  }

  onBuscar(): void {
    this.changeTab('lista');
  }

  fecharPopupErros(): void {
    this.popupErros = [];
    this.popupTitulo = 'Campos obrigatorios';
  }

  onFechar(): void {
    window.history.back();
  }

  carregarDoadores(): void {
    this.carregandoDoadores = true;
    this.doadoresCarregando = true;
    this.doadoresErro = null;
    this.service.listarDoadores().subscribe({
      next: (lista: DoadorResponse[]) => {
        this.doadores = lista;
        this.doadoresOpcoes = lista.map((doador) => ({
          id: doador.id,
          label: doador.nome
        }));
        this.carregandoDoadores = false;
        this.doadoresCarregando = false;
      },
      error: () => {
        this.doadores = [];
        this.carregandoDoadores = false;
        this.doadoresCarregando = false;
        this.doadoresErro = 'Não foi possível carregar os doadores.';
      }
    });
  }

  carregarRecebimentos(): void {
    this.carregandoRecebimentos = true;
    this.service.listarRecebimentos().subscribe({
      next: (lista: RecebimentoDoacaoResponse[]) => {
        this.recebimentos = this.ordenarRecebimentos(lista);
        this.carregandoRecebimentos = false;
        this.atualizarOpcoesItensDoacao();
      },
      error: () => {
        this.recebimentos = [];
        this.carregandoRecebimentos = false;
        this.atualizarOpcoesItensDoacao();
      }
    });
  }

  carregarContasRecebimentoLocal(): void {
    this.contabilidadeService.listarContasBancarias().subscribe({
      next: (lista) => {
        this.contasRecebimentoLocal = (lista || []).filter((conta) => conta.recebimentoLocal);
      },
      error: () => {
        this.contasRecebimentoLocal = [];
      }
    });
  }

  carregarItensAlmoxarifado(): void {
    this.almoxarifadoService.listItems().subscribe({
      next: (itens) => {
        this.almoxarifadoItens = itens || [];
        this.atualizarOpcoesAlmoxarifado(this.almoxarifadoItens);
        this.atualizarOpcoesItensDoacao();
      },
      error: () => {
        this.almoxarifadoItens = [];
        this.atualizarOpcoesAlmoxarifado([]);
        this.atualizarOpcoesItensDoacao();
      }
    });
  }

  selecionarDoador(doador: DoadorResponse): void {
    this.recebimentoForm.get('doadorId')?.setValue(doador.id);
    this.doadorSelecionadoId = doador.id;
    this.termoBuscaDoador = doador.nome;
    this.limparSelecaoItemDoacao();
    this.atualizarOpcoesItensDoacao();
  }

  abrirDialogoExcluirDoador(doador: DoadorResponse): void {
    this.doadorParaExcluir = doador;
    this.dialogExcluirDoadorAberto = true;
  }

  cancelarExcluirDoador(): void {
    this.dialogExcluirDoadorAberto = false;
    this.doadorParaExcluir = null;
  }

  confirmarExcluirDoador(): void {
    if (!this.doadorParaExcluir) {
      this.cancelarExcluirDoador();
      return;
    }
    const doador = this.doadorParaExcluir;
    this.service.excluirDoador(doador.id).subscribe({
      next: () => {
        this.doadores = this.doadores.filter((item) => item.id !== doador.id);
        this.doadoresOpcoes = this.doadores.map((item) => ({
          id: item.id,
          label: item.nome
        }));
        if (this.doadorSelecionadoId === doador.id) {
          this.doadorSelecionadoId = null;
          this.recebimentoForm.get('doadorId')?.setValue(null);
          this.termoBuscaDoador = '';
        }
        this.cancelarExcluirDoador();
      },
      error: () => {
        this.popupErros = new PopupErrorBuilder().adicionar('Não foi possível excluir o doador.').build();
      }
    });
  }

  cancelarExcluirRecebimento(): void {
    this.dialogExcluirRecebimentoAberto = false;
    this.recebimentoParaExcluir = null;
  }

  confirmarExcluirRecebimento(): void {
    if (!this.recebimentoParaExcluir) {
      this.cancelarExcluirRecebimento();
      return;
    }
    const recebimento = this.recebimentoParaExcluir;
    this.service.excluirRecebimento(recebimento.id).subscribe({
      next: () => {
        this.recebimentos = this.recebimentos.filter((registro) => registro.id !== recebimento.id);
        if (this.recebimentoEditandoId === recebimento.id) {
          this.recebimentoEditandoId = null;
        }
        this.cancelarExcluirRecebimento();
        this.changeTab('lista');
      },
      error: () => {
        this.popupErros = new PopupErrorBuilder().adicionar('Não foi possível excluir o recebimento.').build();
      }
    });
  }

  onDoadorTermoChange(termo: string): void {
    this.termoBuscaDoador = termo;
  }

  onDoadorSelecionado(opcao: AutocompleteOpcao): void {
    this.recebimentoForm.get('doadorId')?.setValue(opcao.id);
    this.doadorSelecionadoId = Number(opcao.id);
    this.termoBuscaDoador = opcao.label;
    this.limparSelecaoItemDoacao();
    this.atualizarOpcoesItensDoacao();
  }

  get doadoresFiltrados(): AutocompleteOpcao[] {
    const termo = (this.termoBuscaDoador || '').trim().toLowerCase();
    if (!termo) {
      return this.doadoresOpcoes.slice(0, 15);
    }
    return this.doadoresOpcoes
      .filter((doador) => doador.label.toLowerCase().includes(termo))
      .slice(0, 15);
  }

  onCategoriaItemTermoChange(termo: string): void {
    this.categoriaItemTermo = termo;
    this.recebimentoForm.get('categoriaItem')?.setValue(termo, { emitEvent: false });
    this.categoriasItemOpcoes = this.filtrarOpcoes(this.categoriasItemOpcoesBase, termo);
  }

  onCategoriaItemSelecionado(opcao: AutocompleteOpcao): void {
    this.categoriaItemTermo = opcao.label;
    this.recebimentoForm.get('categoriaItem')?.setValue(opcao.label, { emitEvent: false });
  }

  onUnidadeItemTermoChange(termo: string): void {
    this.unidadeMedidaItemTermo = termo;
    this.recebimentoForm.get('unidadeItem')?.setValue(termo, { emitEvent: false });
    this.unidadesMedidaItemOpcoes = this.filtrarOpcoes(this.unidadesMedidaItemOpcoesBase, termo);
  }

  onUnidadeItemSelecionado(opcao: AutocompleteOpcao): void {
    this.unidadeMedidaItemTermo = opcao.label;
    this.recebimentoForm.get('unidadeItem')?.setValue(opcao.label, { emitEvent: false });
  }

  onLocalizacaoItemTermoChange(termo: string): void {
    this.localizacaoItemTermo = termo;
    this.recebimentoForm.get('localizacaoItem')?.setValue(termo, { emitEvent: false });
    this.localizacoesItemOpcoes = this.filtrarOpcoes(this.localizacoesItemOpcoesBase, termo);
  }

  onLocalizacaoItemSelecionado(opcao: AutocompleteOpcao): void {
    this.localizacaoItemTermo = opcao.label;
    this.recebimentoForm.get('localizacaoItem')?.setValue(opcao.label, { emitEvent: false });
  }

  onLocalizacaoInternaItemTermoChange(termo: string): void {
    this.localizacaoInternaItemTermo = termo;
    this.recebimentoForm.get('localizacaoInternaItem')?.setValue(termo, { emitEvent: false });
    this.localizacoesInternasItemOpcoes = this.filtrarOpcoes(this.localizacoesInternasItemOpcoesBase, termo);
  }

  onLocalizacaoInternaItemSelecionado(opcao: AutocompleteOpcao): void {
    this.localizacaoInternaItemTermo = opcao.label;
    this.recebimentoForm.get('localizacaoInternaItem')?.setValue(opcao.label, { emitEvent: false });
  }

  onTipoDoacaoChange(): void {
    if (!this.isDoacaoDinheiro) {
      this.recebimentoForm.get('formaRecebimento')?.setValue('');
      this.recebimentoForm.get('valor')?.setValue('');
      this.recebimentoForm.get('formaRecebimento')?.disable({ emitEvent: false });
    } else {
      this.recebimentoForm.get('formaRecebimento')?.enable({ emitEvent: false });
      this.recebimentoForm.get('quantidadeItens')?.setValue('');
      this.recebimentoForm.get('valorMedio')?.setValue('');
      this.recebimentoForm.get('valorTotal')?.setValue('');
      this.recebimentoForm.get('descricao')?.setValue('');
      this.recebimentoForm.get('categoriaItem')?.setValue('');
      this.recebimentoForm.get('unidadeItem')?.setValue('');
      this.recebimentoForm.get('localizacaoItem')?.setValue('');
      this.recebimentoForm.get('localizacaoInternaItem')?.setValue('');
      this.recebimentoForm.get('estoqueAtualItem')?.setValue(0);
      this.recebimentoForm.get('estoqueMinimoItem')?.setValue(0);
      this.recebimentoForm.get('valorUnitarioItem')?.setValue('');
      this.recebimentoForm.get('statusItem')?.setValue('Ativo');
      this.termoBuscaItemDoado = '';
      this.categoriaItemTermo = '';
      this.unidadeMedidaItemTermo = '';
      this.localizacaoItemTermo = '';
      this.localizacaoInternaItemTermo = '';
      this.limparSelecaoItemDoacao();
    }
    this.atualizarValidatorsRecebimento();
    this.atualizarOpcoesItensDoacao();
  }

  private atualizarValidatorsRecebimento(): void {
    const quantidade = this.recebimentoForm.get('quantidadeItens');
    const valorMedio = this.recebimentoForm.get('valorMedio');
    const valorTotal = this.recebimentoForm.get('valorTotal');
    const valor = this.recebimentoForm.get('valor');
    const descricao = this.recebimentoForm.get('descricao');
    const categoriaItem = this.recebimentoForm.get('categoriaItem');
    const unidadeItem = this.recebimentoForm.get('unidadeItem');
    const estoqueMinimoItem = this.recebimentoForm.get('estoqueMinimoItem');
    const statusItem = this.recebimentoForm.get('statusItem');
    if (this.isDoacaoDinheiro) {
      quantidade?.clearValidators();
      valorMedio?.clearValidators();
      valorTotal?.clearValidators();
      valor?.setValidators([Validators.required]);
      descricao?.clearValidators();
      categoriaItem?.clearValidators();
      unidadeItem?.clearValidators();
      estoqueMinimoItem?.clearValidators();
      statusItem?.clearValidators();
    } else {
      quantidade?.setValidators([Validators.required]);
      descricao?.setValidators([Validators.required]);
      categoriaItem?.setValidators([Validators.required]);
      unidadeItem?.setValidators([Validators.required]);
      estoqueMinimoItem?.setValidators([Validators.required, Validators.min(0)]);
      statusItem?.setValidators([Validators.required]);
      if (this.itemDoacaoExistenteSelecionado && this.itemDoacaoSelecionadoTemValor) {
        valorMedio?.clearValidators();
        valorTotal?.clearValidators();
      } else {
        valorMedio?.setValidators([Validators.required]);
        valorTotal?.setValidators([Validators.required]);
      }
      valor?.clearValidators();
    }
    quantidade?.updateValueAndValidity({ emitEvent: false });
    valorMedio?.updateValueAndValidity({ emitEvent: false });
    valorTotal?.updateValueAndValidity({ emitEvent: false });
    valor?.updateValueAndValidity({ emitEvent: false });
    descricao?.updateValueAndValidity({ emitEvent: false });
    categoriaItem?.updateValueAndValidity({ emitEvent: false });
    unidadeItem?.updateValueAndValidity({ emitEvent: false });
    estoqueMinimoItem?.updateValueAndValidity({ emitEvent: false });
    statusItem?.updateValueAndValidity({ emitEvent: false });
  }

  private atualizarOpcoesAlmoxarifado(itens: StockItem[]): void {
    const categorias = new Set<string>();
    const unidades = new Set<string>();
    const localizacoes = new Set<string>();
    const localizacoesInternas = new Set<string>();

    (itens || []).forEach((item) => {
      if (item.category) categorias.add(item.category);
      if (item.unit) unidades.add(item.unit);
      if (item.location) localizacoes.add(item.location);
      if (item.locationDetail) localizacoesInternas.add(item.locationDetail);
    });

    this.categoriasItemOpcoesBase = Array.from(categorias).map((label) => ({ id: label, label }));
    this.unidadesMedidaItemOpcoesBase = Array.from(unidades).map((label) => ({ id: label, label }));
    this.localizacoesItemOpcoesBase = Array.from(localizacoes).map((label) => ({ id: label, label }));
    this.localizacoesInternasItemOpcoesBase = Array.from(localizacoesInternas).map((label) => ({ id: label, label }));

    this.categoriasItemOpcoes = [...this.categoriasItemOpcoesBase];
    this.unidadesMedidaItemOpcoes = [...this.unidadesMedidaItemOpcoesBase];
    this.localizacoesItemOpcoes = [...this.localizacoesItemOpcoesBase];
    this.localizacoesInternasItemOpcoes = [...this.localizacoesInternasItemOpcoesBase];
  }

  private filtrarOpcoes(opcoes: AutocompleteOpcao[], termo: string): AutocompleteOpcao[] {
    const termoNormalizado = this.normalizarTexto(termo || '');
    if (!termoNormalizado) {
      return opcoes.slice(0, 15);
    }
    return opcoes.filter((opcao) => this.normalizarTexto(opcao.label).includes(termoNormalizado)).slice(0, 15);
  }

  atualizarProximaCobranca(): void {
    if (!this.recorrenciaForm.get('recorrente')?.value) {
      return;
    }
    const base = new Date();
    base.setMonth(base.getMonth() + 1);
    const iso = base.toISOString().slice(0, 10);
    this.recorrenciaForm.get('proximaCobranca')?.setValue(iso);
  }

  aplicarTemplateMensagem(tipo: 'lembrete' | 'agradecimento' | 'transparencia'): void {
    const templates: Record<string, string> = {
      lembrete: 'Olá! Passando para lembrar sobre a doação programada. Podemos ajudar em algo?',
      agradecimento: 'Obrigado pelo apoio! Sua doação faz a diferença no atendimento social.',
      transparencia: 'Segue um resumo da aplicação dos recursos recebidos. Obrigado pela parceria.'
    };
    this.gestaoForm.get('mensagem')?.setValue(templates[tipo]);
  }

  enviarMensagemGestao(): void {
    if (this.gestaoForm.invalid) {
      this.gestaoForm.markAllAsTouched();
      return;
    }
    this.popupErros = new PopupErrorBuilder().adicionar('Mensagem preparada para envio.').build();
  }

  getNomeDoador(doadorId?: number | null): string {
    const found = this.doadores.find((item) => item.id === doadorId);
    return found?.nome || '---';
  }

  get isPessoaJuridica(): boolean {
    return this.doadorForm.get('tipoPessoa')?.value === 'JURIDICA';
  }

  get documentoLabel(): string {
    return this.isPessoaJuridica ? 'Documento (CNPJ)' : 'Documento (CPF)';
  }

  get documentoPlaceholder(): string {
    return this.isPessoaJuridica ? '00.000.000/0000-00' : '000.000.000-00';
  }

  onTipoPessoaChange(): void {
    this.doadorForm.get('documento')?.reset();
    this.doadorForm.get('responsavelEmpresa')?.reset();
    this.atualizarTipoPessoaValidators();
  }

  private atualizarTipoPessoaValidators(): void {
    const documentoControl = this.doadorForm.get('documento');
    const responsavelControl = this.doadorForm.get('responsavelEmpresa');
    if (this.isPessoaJuridica) {
      documentoControl?.setValidators([Validators.required, this.cnpjValidator]);
      responsavelControl?.setValidators([Validators.required, Validators.minLength(3)]);
    } else {
      documentoControl?.setValidators([Validators.required, this.cpfValidator]);
      responsavelControl?.clearValidators();
    }
    documentoControl?.updateValueAndValidity({ emitEvent: false });
    responsavelControl?.updateValueAndValidity({ emitEvent: false });
  }

  onDocumentoInput(event: Event): void {
    if (this.isPessoaJuridica) {
      this.onCnpjInput(event);
      return;
    }
    this.onCpfInput(event);
  }

  onCpfInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 11);
    const parts = [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 9), digits.slice(9, 11)].filter(Boolean);
    input.value = parts.length > 3 ? `${parts[0]}.${parts[1]}.${parts[2]}-${parts[3]}` : parts.join('.');
    this.doadorForm.get('documento')?.setValue(input.value, { emitEvent: false });
  }

  onCnpjInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 14);
    const parts = [
      digits.slice(0, 2),
      digits.slice(2, 5),
      digits.slice(5, 8),
      digits.slice(8, 12),
      digits.slice(12, 14)
    ].filter(Boolean);
    let masked = parts[0] ?? '';
    if (parts[1]) masked += `.${parts[1]}`;
    if (parts[2]) masked += `.${parts[2]}`;
    if (parts[3]) masked += `/${parts[3]}`;
    if (parts[4]) masked += `-${parts[4]}`;
    input.value = masked;
    this.doadorForm.get('documento')?.setValue(input.value, { emitEvent: false });
  }

  onTelefoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 11);
    const ddd = digits.slice(0, 2);
    const parte1 = digits.slice(2, digits.length > 10 ? 7 : 6);
    const parte2 = digits.slice(digits.length > 10 ? 7 : 6, 11);
    input.value = parte2 ? `(${ddd}) ${parte1}-${parte2}` : ddd ? `(${ddd}) ${parte1}` : parte1;
    this.doadorForm.get('telefone')?.setValue(input.value, { emitEvent: false });
  }

  onCepInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 8);
    const masked = digits.replace(/(\d{5})(\d{0,3})/, (_, p1, p2) => (p2 ? `${p1}-${p2}` : p1));
    input.value = masked;
    this.doadorForm.get('cep')?.setValue(masked, { emitEvent: false });
  }

  onValorInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = this.formatCurrencyInput(input, true);
    this.recebimentoForm.get('valor')?.setValue(value, { emitEvent: false });
  }

  onValorMedioInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = this.formatCurrencyInput(input, true);
    this.recebimentoForm.get('valorMedio')?.setValue(value, { emitEvent: false });
    this.atualizarValorTotalItens();
  }

  onValorTotalInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = this.formatCurrencyInput(input, true);
    this.recebimentoForm.get('valorTotal')?.setValue(value, { emitEvent: false });
  }

  onValorUnitarioItemInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = this.formatCurrencyInput(input, true);
    this.recebimentoForm.get('valorUnitarioItem')?.setValue(value, { emitEvent: false });
  }

  onQuantidadeItensChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = Number(input.value || 0);
    this.recebimentoForm.get('quantidadeItens')?.setValue(value, { emitEvent: false });
    this.atualizarValorTotalItens();
  }

  private atualizarValorTotalItens(): void {
    const quantidade = Number(this.recebimentoForm.get('quantidadeItens')?.value || 0);
    const valorMedio = this.parseCurrencyValue(this.recebimentoForm.get('valorMedio')?.value);
    if (!quantidade || !valorMedio) return;
    const total = quantidade * valorMedio;
    this.recebimentoForm
      .get('valorTotal')
      ?.setValue(this.formatCurrencyValue(total, true), { emitEvent: false });
  }

  private formatCurrencyInput(input: HTMLInputElement, comPrefixo: boolean): string {
    const digits = input.value.replace(/\D/g, '');
    const value = Number(digits) / 100;
    const formatted = value.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    const formattedValue = comPrefixo ? `R$ ${formatted}` : formatted;
    input.value = formattedValue;
    return formattedValue;
  }

  private formatCurrencyValue(value: number, comPrefixo: boolean): string {
    const formatted = value.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return comPrefixo ? `R$ ${formatted}` : formatted;
  }

  private parseCurrencyValue(value: string | number | null | undefined): number {
    if (value === null || value === undefined || value === '') {
      return 0;
    }
    if (typeof value === 'number') {
      return value;
    }
    const digits = String(value).replace(/\D/g, '');
    return digits ? Number(digits) / 100 : 0;
  }

  onSentenceCaseBlur(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = (input.value || '').trim();
    if (!value) return;
    const normalized = value
      .split(' ')
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    input.value = normalized;
    const control = this.findControlByElement(input);
    control?.setValue(normalized, { emitEvent: false });
  }

  onItemDoacaoTermoChange(termo: string): void {
    this.termoBuscaItemDoado = termo;
    this.recebimentoForm.get('descricao')?.setValue(termo, { emitEvent: false });
    const chave = this.normalizarTexto(termo);
    if (this.itemDoacaoSelecionadoChave && this.itemDoacaoSelecionadoChave !== chave) {
      this.limparSelecaoItemDoacao();
    }
  }

  onItemDoacaoSelecionado(opcao: AutocompleteOpcao): void {
    const chave = String(opcao.id);
    const itemAlmoxarifado = this.buscarItemAlmoxarifado(chave);
    const itemRecebimento = this.buscarItemExistente(chave);
    this.itemDoacaoSelecionadoChave = chave;
    this.itemDoacaoSelecionadoId = itemRecebimento?.id ?? null;
    this.itemDoacaoSelecionadoAlmoxarifadoId = itemAlmoxarifado?.id ?? null;
    this.termoBuscaItemDoado = opcao.label;
    this.recebimentoForm.get('descricao')?.setValue(opcao.label, { emitEvent: false });
    this.aplicarDadosItemAlmoxarifado(itemAlmoxarifado);
    const valorMedioBase =
      itemRecebimento?.valorMedio ??
      (itemAlmoxarifado?.unitValue ? Number(itemAlmoxarifado.unitValue) : null);
    if (valorMedioBase) {
      this.itemDoacaoSelecionadoTemValor = true;
      this.recebimentoForm
        .get('valorMedio')
        ?.setValue(this.formatCurrencyValue(Number(valorMedioBase), true), { emitEvent: false });
      this.recebimentoForm.get('valorTotal')?.setValue('', { emitEvent: false });
      this.recebimentoForm.get('valorMedio')?.disable({ emitEvent: false });
      this.recebimentoForm.get('valorTotal')?.disable({ emitEvent: false });
    } else {
      this.itemDoacaoSelecionadoTemValor = false;
      this.recebimentoForm.get('valorMedio')?.setValue('', { emitEvent: false });
      this.recebimentoForm.get('valorTotal')?.setValue('', { emitEvent: false });
      this.recebimentoForm.get('valorMedio')?.enable({ emitEvent: false });
      this.recebimentoForm.get('valorTotal')?.enable({ emitEvent: false });
    }
    this.atualizarValorTotalItens();
    this.atualizarValidatorsRecebimento();
  }

  get itensDoacaoFiltrados(): AutocompleteOpcao[] {
    const termo = this.normalizarTexto(this.termoBuscaItemDoado || '');
    if (!termo) {
      return this.itensDoacaoOpcoes.slice(0, 15);
    }
    return this.itensDoacaoOpcoes
      .filter((item) => this.normalizarTexto(item.label).includes(termo))
      .slice(0, 15);
  }

  private aplicarDadosItemAlmoxarifado(item: StockItem | null): void {
    if (!item) {
      this.habilitarCamposAlmoxarifado(true);
      return;
    }
    this.habilitarCamposAlmoxarifado(false);
    this.recebimentoForm.get('categoriaItem')?.setValue(item.category ?? '', { emitEvent: false });
    this.recebimentoForm.get('unidadeItem')?.setValue(item.unit ?? '', { emitEvent: false });
    this.recebimentoForm.get('localizacaoItem')?.setValue(item.location ?? '', { emitEvent: false });
    this.recebimentoForm.get('localizacaoInternaItem')?.setValue(item.locationDetail ?? '', { emitEvent: false });
    this.recebimentoForm.get('estoqueMinimoItem')?.setValue(item.minStock ?? 0, { emitEvent: false });
    this.recebimentoForm
      .get('valorUnitarioItem')
      ?.setValue(this.formatCurrencyValue(Number(item.unitValue || 0), true), { emitEvent: false });
    this.recebimentoForm.get('statusItem')?.setValue(item.status ?? 'Ativo', { emitEvent: false });
    this.categoriaItemTermo = item.category ?? '';
    this.unidadeMedidaItemTermo = item.unit ?? '';
    this.localizacaoItemTermo = item.location ?? '';
    this.localizacaoInternaItemTermo = item.locationDetail ?? '';
  }

  private habilitarCamposAlmoxarifado(ativo: boolean): void {
    const acao = ativo ? 'enable' : 'disable';
    this.recebimentoForm.get('categoriaItem')?.[acao]({ emitEvent: false });
    this.recebimentoForm.get('unidadeItem')?.[acao]({ emitEvent: false });
    this.recebimentoForm.get('localizacaoItem')?.[acao]({ emitEvent: false });
    this.recebimentoForm.get('localizacaoInternaItem')?.[acao]({ emitEvent: false });
    this.recebimentoForm.get('estoqueMinimoItem')?.[acao]({ emitEvent: false });
    this.recebimentoForm.get('valorUnitarioItem')?.[acao]({ emitEvent: false });
    this.recebimentoForm.get('statusItem')?.[acao]({ emitEvent: false });
  }

  private salvarDoador(manterNaAba = false): void {
    if (this.doadorForm.invalid) {
      this.doadorForm.markAllAsTouched();
      return;
    }
    this.service.criarDoador(this.doadorForm.getRawValue()).subscribe({
      next: (response: DoadorResponse) => {
        this.doadores = [response, ...this.doadores];
        this.recebimentoForm.get('doadorId')?.setValue(response.id);
        this.doadorSelecionadoId = response.id;
        this.termoBuscaDoador = response.nome;
        if (!manterNaAba) {
          this.changeTab('dados');
        }
      },
      error: () => {
        this.popupErros = new PopupErrorBuilder().adicionar('Não foi possível salvar o doador.').build();
      }
    });
  }

  salvarDoadorSemDoacao(): void {
    this.salvarDoador(true);
  }

  private salvarRecebimento(): void {
    if (this.recebimentoForm.invalid) {
      this.recebimentoForm.markAllAsTouched();
      const mensagens = this.obterErrosObrigatoriosRecebimento();
      const builder = new PopupErrorBuilder();
      if (!mensagens.length) {
        builder.adicionar('Preencha os campos obrigatórios para incluir a doação.');
      } else {
        mensagens.forEach((mensagem) => builder.adicionar(mensagem));
      }
      this.popupTitulo = 'Campos obrigatorios';
      this.popupErros = builder.build();
      return;
    }

    if (this.isDoacaoDinheiro && this.contasRecebimentoLocal.length > 1 && !this.contaRecebimentoSelecionadaId) {
      this.dialogContaRecebimentoAberto = true;
      return;
    }

    const recorrencia = this.recorrenciaForm.getRawValue();
    const raw = this.recebimentoForm.getRawValue();

    if (this.isDoacaoItens && !this.recebimentoEditandoId) {
      const descricao = (raw.descricao || '').trim();
      const descricaoNormalizada = this.normalizarTexto(descricao);
      const itemExistente = this.buscarItemExistente(descricaoNormalizada);
      const itemExistenteAlmoxarifado = this.buscarItemAlmoxarifado(descricaoNormalizada);
      if ((itemExistente || itemExistenteAlmoxarifado) && this.itemDoacaoSelecionadoChave !== descricaoNormalizada) {
        this.popupTitulo = 'Campos obrigatorios';
        this.popupErros = new PopupErrorBuilder()
          .adicionar('Item já existente. Selecione o item e informe apenas a quantidade.')
          .build();
        return;
      }
      if (itemExistente) {
        const quantidadeNova = Number(raw.quantidadeItens || 0);
        const quantidadeAtual = Number(itemExistente.quantidadeItens || 0);
        const quantidadeTotal = quantidadeAtual + quantidadeNova;
        const valorMedio = itemExistente.valorMedio ?? this.parseCurrencyValue(raw.valorMedio);
        const valorTotal = valorMedio ? quantidadeTotal * valorMedio : this.parseCurrencyValue(raw.valorTotal);
        const payloadExistente = {
          doadorId: itemExistente.doadorId ?? raw.doadorId,
          tipoDoacao: itemExistente.tipoDoacao ?? raw.tipoDoacao,
          descricao: itemExistente.descricao ?? descricao,
          quantidadeItens: quantidadeTotal,
          valorMedio: valorMedio,
          valorTotal: valorTotal,
          dataRecebimento: raw.dataRecebimento,
          formaRecebimento: raw.formaRecebimento ?? itemExistente.formaRecebimento,
          status: raw.status,
          observacoes: raw.observacoes || itemExistente.observacoes,
          recorrente: !!recorrencia.recorrente,
          periodicidade: recorrencia.periodicidade,
          proximaCobranca: recorrencia.proximaCobranca || undefined,
          contaRecebimentoId: undefined
        };
        this.service.atualizarRecebimento(itemExistente.id, payloadExistente).pipe(
          switchMap((response: RecebimentoDoacaoResponse) =>
            this.registrarEntradaAlmoxarifado(response, quantidadeNova).pipe(map(() => response))
          )
        ).subscribe({
          next: (response: RecebimentoDoacaoResponse) => {
            this.recebimentos = this.ordenarRecebimentos(
              this.recebimentos.map((item) => (item.id === response.id ? response : item))
            );
            this.recebimentoEditandoId = null;
            this.contaRecebimentoSelecionadaId = null;
            this.mensagemSucessoDoacao = 'Entrada registrada com sucesso.';
            this.changeTab('lista');
            this.popupTitulo = 'Sucesso';
            this.popupErros = new PopupErrorBuilder().adicionar('Entrada registrada com sucesso.').build();
            this.carregarItensAlmoxarifado();
          },
          error: (erro) => {
            const mensagem =
              erro?.error?.mensagem ||
              erro?.error?.message ||
              erro?.message ||
              'Não foi possível registrar o recebimento.';
            this.popupTitulo = 'Campos obrigatorios';
            this.popupErros = new PopupErrorBuilder().adicionar(mensagem).build();
          }
        });
        return;
      }
    }

    const {
      categoriaItem,
      unidadeItem,
      localizacaoItem,
      localizacaoInternaItem,
      estoqueMinimoItem,
      valorUnitarioItem,
      statusItem,
      ...dadosRecebimento
    } = raw;

    const payload = {
      ...dadosRecebimento,
      valor: this.parseCurrencyValue(raw.valor),
      valorMedio: this.parseCurrencyValue(raw.valorMedio),
      valorTotal: this.parseCurrencyValue(raw.valorTotal),
      recorrente: !!recorrencia.recorrente,
      periodicidade: recorrencia.periodicidade,
      proximaCobranca: recorrencia.proximaCobranca || undefined,
      contaRecebimentoId: this.isDoacaoDinheiro ? this.contaRecebimentoSelecionadaId ?? undefined : undefined
    };

    const action$ = this.recebimentoEditandoId
      ? this.service.atualizarRecebimento(this.recebimentoEditandoId, payload)
      : this.service.criarRecebimento(payload);

    action$
      .pipe(
        switchMap((response: RecebimentoDoacaoResponse) => {
          if (!this.isDoacaoItens || this.recebimentoEditandoId) {
            return of(response);
          }
          const quantidadeEntrada = Number(raw.quantidadeItens || 0);
          return this.registrarEntradaAlmoxarifado(response, quantidadeEntrada).pipe(map(() => response));
        })
      )
      .subscribe({
      next: (response: RecebimentoDoacaoResponse) => {
        this.recebimentos = this.recebimentoEditandoId
          ? this.ordenarRecebimentos(this.recebimentos.map((item) => (item.id === response.id ? response : item)))
          : this.ordenarRecebimentos([response, ...this.recebimentos]);
        this.recebimentoEditandoId = null;
        this.contaRecebimentoSelecionadaId = null;
        this.mensagemSucessoDoacao = 'Doação realizada com sucesso.';
        this.changeTab('lista');
        this.popupTitulo = 'Sucesso';
        this.popupErros = new PopupErrorBuilder().adicionar('Doação realizada com sucesso.').build();
        this.carregarItensAlmoxarifado();
      },
      error: (erro) => {
        const mensagem =
          erro?.error?.mensagem ||
          erro?.error?.message ||
          erro?.message ||
          'Não foi possível registrar o recebimento.';
        this.popupTitulo = 'Campos obrigatorios';
        this.popupErros = new PopupErrorBuilder().adicionar(mensagem).build();
      }
    });
  }

  private obterErrosObrigatoriosRecebimento(): string[] {
    const mensagens: string[] = [];
    const campos: Array<{ control: string; label: string }> = [
      { control: 'doadorId', label: 'Doador' },
      { control: 'tipoDoacao', label: 'Tipo de doação' },
      { control: 'dataRecebimento', label: 'Data de recebimento' },
      { control: 'quantidadeItens', label: 'Quantidade' },
      { control: 'descricao', label: 'Descrição do item doado' },
      { control: 'valorMedio', label: 'Valor médio' },
      { control: 'valorTotal', label: 'Valor total' },
      { control: 'valor', label: 'Valor' },
      { control: 'categoriaItem', label: 'Categoria' },
      { control: 'unidadeItem', label: 'Unidade de medida' },
      { control: 'estoqueMinimoItem', label: 'Estoque mínimo' },
      { control: 'statusItem', label: 'Situação' }
    ];

    campos.forEach(({ control, label }) => {
      const campo = this.recebimentoForm.get(control);
      if (campo && campo.invalid) {
        mensagens.push(`Campo obrigatório não preenchido: ${label}.`);
      }
    });

    return mensagens;
  }

  campoRecebimentoInvalido(nome: string): boolean {
    const campo = this.recebimentoForm.get(nome);
    return !!campo && campo.invalid && (campo.touched || campo.dirty);
  }

  selecionarContaRecebimento(contaId: number): void {
    this.contaRecebimentoSelecionadaId = contaId;
  }

  confirmarContaRecebimento(): void {
    if (!this.contaRecebimentoSelecionadaId) {
      this.popupErros = new PopupErrorBuilder()
        .adicionar('Selecione a conta de recebimento local.')
        .build();
      return;
    }
    this.dialogContaRecebimentoAberto = false;
    this.salvarRecebimento();
  }

  cancelarContaRecebimento(): void {
    this.dialogContaRecebimentoAberto = false;
  }

  editarRecebimento(item: RecebimentoDoacaoResponse): void {
    this.recebimentoEditandoId = item.id;
    this.mensagemSucessoDoacao = '';
    this.limparSelecaoItemDoacao();
    this.recebimentoForm.patchValue({
      doadorId: item.doadorId ?? null,
      tipoDoacao: item.tipoDoacao,
      dataRecebimento: item.dataRecebimento,
      valor: item.valor !== null && item.valor !== undefined
        ? this.formatCurrencyValue(Number(item.valor), true)
        : '',
      quantidadeItens: item.quantidadeItens ?? '',
      valorMedio: item.valorMedio !== null && item.valorMedio !== undefined
        ? this.formatCurrencyValue(Number(item.valorMedio), true)
        : '',
      valorTotal: item.valorTotal !== null && item.valorTotal !== undefined
        ? this.formatCurrencyValue(Number(item.valorTotal), true)
        : '',
      formaRecebimento: item.formaRecebimento ?? '',
      status: item.status,
      descricao: item.descricao ?? '',
      observacoes: item.observacoes ?? ''
    });
    this.contaRecebimentoSelecionadaId = item.contaRecebimentoId ?? null;
    const selected = this.doadores.find((doador) => doador.id === Number(item.doadorId));
    this.termoBuscaDoador = selected?.nome || item.doadorNome || '';
    this.termoBuscaItemDoado = item.descricao ?? '';
    const chaveItem = this.normalizarTexto(item.descricao ?? '');
    if (chaveItem) {
      this.itemDoacaoSelecionadoChave = chaveItem;
      this.itemDoacaoSelecionadoId = item.id;
      const itemAlmoxarifado = this.buscarItemAlmoxarifado(chaveItem);
      this.itemDoacaoSelecionadoAlmoxarifadoId = itemAlmoxarifado?.id ?? null;
      this.aplicarDadosItemAlmoxarifado(itemAlmoxarifado);
    }
    this.onTipoDoacaoChange();
    this.changeTab('dados');
  }

  excluirRecebimento(item: RecebimentoDoacaoResponse): void {
    this.service.excluirRecebimento(item.id).subscribe({
      next: () => {
        this.recebimentos = this.recebimentos.filter((registro) => registro.id !== item.id);
      },
      error: () => {
        this.popupErros = new PopupErrorBuilder().adicionar('Não foi possível excluir o recebimento.').build();
      }
    });
  }

  private registrarEntradaAlmoxarifado(
    recebimento: RecebimentoDoacaoResponse,
    quantidade: number
  ): Observable<void> {
    if (!this.isDoacaoItens) {
      return of(undefined);
    }
    const descricao = (this.recebimentoForm.get('descricao')?.value || '').toString().trim();
    const descricaoNormalizada = this.normalizarTexto(descricao);
    if (!descricaoNormalizada || quantidade <= 0) {
      return of(undefined);
    }
    const itemExistente = this.buscarItemAlmoxarifado(descricaoNormalizada);
    const referencia = `Recebimento de doação #${recebimento.id}`;
    const responsavel = this.getNomeDoador(recebimento.doadorId);
    const observacoes = recebimento.observacoes ?? '';
    const registrarMovimento = (item: StockItem): Observable<void> =>
      this.almoxarifadoService
        .registerMovement({
          date: recebimento.dataRecebimento,
          type: 'Entrada',
          itemCode: item.code,
          quantity: quantidade,
          reference: referencia,
          responsible: responsavel || undefined,
          notes: observacoes || undefined
        })
        .pipe(map(() => undefined));

    if (itemExistente) {
      return registrarMovimento(itemExistente);
    }

    const categoria = (this.recebimentoForm.get('categoriaItem')?.value || '').toString();
    const unidade = (this.recebimentoForm.get('unidadeItem')?.value || '').toString();
    const localizacao = (this.recebimentoForm.get('localizacaoItem')?.value || '').toString();
    const localizacaoInterna = (this.recebimentoForm.get('localizacaoInternaItem')?.value || '').toString();
    const estoqueMinimo = Number(this.recebimentoForm.get('estoqueMinimoItem')?.value || 0);
    const valorUnitario = this.parseCurrencyValue(this.recebimentoForm.get('valorUnitarioItem')?.value);
    const status = (this.recebimentoForm.get('statusItem')?.value || 'Ativo') as StockItemStatus;

    return this.almoxarifadoService.getNextItemCode().pipe(
      switchMap((codigo) =>
        this.almoxarifadoService.createItem({
          code: codigo,
          description: descricao,
          category: categoria,
          unit: unidade,
          location: localizacao || undefined,
          locationDetail: localizacaoInterna || undefined,
          currentStock: 0,
          minStock: estoqueMinimo,
          unitValue: valorUnitario,
          status: status
        })
      ),
      switchMap((item) => registrarMovimento(item)),
      map(() => undefined)
    );
  }

  private cpfValidator(control: AbstractControl): ValidationErrors | null {
    const digits = (control.value || '').replace(/\D/g, '');
    if (!digits) return null;
    if (digits.length !== 11) return { cpf: true };
    if (/^(\d)\1+$/.test(digits)) return { cpf: true };

    const calc = (slice: number) => {
      let sum = 0;
      for (let i = 0; i < slice; i++) {
        sum += parseInt(digits.charAt(i), 10) * (slice + 1 - i);
      }
      const mod = (sum * 10) % 11;
      return mod === 10 ? 0 : mod;
    };

    const dig1 = calc(9);
    const dig2 = calc(10);
    if (dig1 !== parseInt(digits.charAt(9), 10) || dig2 !== parseInt(digits.charAt(10), 10)) {
      return { cpf: true };
    }
    return null;
  }

  private cnpjValidator(control: AbstractControl): ValidationErrors | null {
    const digits = (control.value || '').replace(/\D/g, '');
    if (!digits) return null;
    if (digits.length !== 14) return { cnpj: true };
    if (/^(\d)\1+$/.test(digits)) return { cnpj: true };

    const calc = (length: number) => {
      const weights =
        length === 12
          ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
          : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
      let sum = 0;
      for (let i = 0; i < weights.length; i++) {
        sum += parseInt(digits.charAt(i), 10) * weights[i];
      }
      const mod = sum % 11;
      return mod < 2 ? 0 : 11 - mod;
    };

    const dig1 = calc(12);
    const dig2 = calc(13);
    if (dig1 !== parseInt(digits.charAt(12), 10) || dig2 !== parseInt(digits.charAt(13), 10)) {
      return { cnpj: true };
    }
    return null;
  }

  private telefoneValidator(control: AbstractControl): ValidationErrors | null {
    const digits = (control.value || '').replace(/\D/g, '');
    if (!digits) return null;
    return digits.length < 10 ? { telefone: true } : null;
  }

  private atualizarOpcoesItensDoacao(): void {
    if (!this.isDoacaoItens) {
      this.itensDoacaoOpcoes = [];
      return;
    }
    const itensMap = new Map<string, string>();
    this.almoxarifadoItens.forEach((item) => {
      if (!item.description) return;
      const chave = this.normalizarTexto(item.description);
      if (!chave) return;
      itensMap.set(chave, item.description);
    });
    this.recebimentos.forEach((item) => {
      if (!item.descricao) return;
      const chave = this.normalizarTexto(item.descricao);
      if (!chave) return;
      if (!itensMap.has(chave)) {
        itensMap.set(chave, item.descricao);
      }
    });
    this.itensDoacaoOpcoes = Array.from(itensMap.entries()).map(([chave, descricao]) => ({
      id: chave,
      label: descricao
    }));
  }

  private limparSelecaoItemDoacao(): void {
    this.itemDoacaoSelecionadoId = null;
    this.itemDoacaoSelecionadoAlmoxarifadoId = null;
    this.itemDoacaoSelecionadoChave = null;
    this.itemDoacaoSelecionadoTemValor = false;
    this.recebimentoForm.get('valorMedio')?.enable({ emitEvent: false });
    this.recebimentoForm.get('valorTotal')?.enable({ emitEvent: false });
    this.recebimentoForm.get('valorMedio')?.setValue('', { emitEvent: false });
    this.recebimentoForm.get('valorTotal')?.setValue('', { emitEvent: false });
    this.habilitarCamposAlmoxarifado(true);
    this.recebimentoForm.get('categoriaItem')?.setValue('', { emitEvent: false });
    this.recebimentoForm.get('unidadeItem')?.setValue('', { emitEvent: false });
    this.recebimentoForm.get('localizacaoItem')?.setValue('', { emitEvent: false });
    this.recebimentoForm.get('localizacaoInternaItem')?.setValue('', { emitEvent: false });
    this.recebimentoForm.get('estoqueMinimoItem')?.setValue(0, { emitEvent: false });
    this.recebimentoForm.get('valorUnitarioItem')?.setValue('', { emitEvent: false });
    this.recebimentoForm.get('statusItem')?.setValue('Ativo', { emitEvent: false });
    this.categoriaItemTermo = '';
    this.unidadeMedidaItemTermo = '';
    this.localizacaoItemTermo = '';
    this.localizacaoInternaItemTermo = '';
    this.categoriasItemOpcoes = [...this.categoriasItemOpcoesBase];
    this.unidadesMedidaItemOpcoes = [...this.unidadesMedidaItemOpcoesBase];
    this.localizacoesItemOpcoes = [...this.localizacoesItemOpcoesBase];
    this.localizacoesInternasItemOpcoes = [...this.localizacoesInternasItemOpcoesBase];
    this.atualizarValidatorsRecebimento();
  }

  private buscarItemExistente(descricaoNormalizada: string): RecebimentoDoacaoResponse | null {
    if (!descricaoNormalizada) return null;
    const encontrado = this.recebimentos.find((item) => {
      if (!item.descricao) return false;
      return this.normalizarTexto(item.descricao) === descricaoNormalizada;
    });
    return encontrado ?? null;
  }

  private buscarItemAlmoxarifado(descricaoNormalizada: string): StockItem | null {
    if (!descricaoNormalizada) return null;
    const encontrado = this.almoxarifadoItens.find(
      (item) => this.normalizarTexto(item.description) === descricaoNormalizada
    );
    return encontrado ?? null;
  }

  private buscarRecebimentoPorId(id: number): RecebimentoDoacaoResponse | null {
    const encontrado = this.recebimentos.find((item) => item.id === id);
    return encontrado ?? null;
  }

  private normalizarTexto(texto: string): string {
    return (texto || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  private ordenarRecebimentos(lista: RecebimentoDoacaoResponse[]): RecebimentoDoacaoResponse[] {
    return [...(lista || [])].sort((a, b) => {
      const dataA = this.parseDataRecebimento(a.dataRecebimento);
      const dataB = this.parseDataRecebimento(b.dataRecebimento);
      if (dataA !== dataB) {
        return dataB - dataA;
      }
      return (b.id || 0) - (a.id || 0);
    });
  }

  private parseDataRecebimento(valor?: string | null): number {
    if (!valor) return 0;
    const data = new Date(valor);
    const timestamp = data.getTime();
    return Number.isNaN(timestamp) ? 0 : timestamp;
  }

  private findControlByElement(element: HTMLInputElement | HTMLTextAreaElement): AbstractControl | null {
    const name = element.getAttribute('formControlName');
    if (!name) return null;
    if (this.doadorForm.get(name)) return this.doadorForm.get(name);
    if (this.recebimentoForm.get(name)) return this.recebimentoForm.get(name);
    if (this.recorrenciaForm.get(name)) return this.recorrenciaForm.get(name);
    if (this.gestaoForm.get(name)) return this.gestaoForm.get(name);
    return null;
  }
}



