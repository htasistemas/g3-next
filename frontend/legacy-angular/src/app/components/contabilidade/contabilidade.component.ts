import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { Router } from '@angular/router';
import { PopupErrorBuilder } from '../../utils/popup-error.builder';
import { PopupMessagesComponent } from '../compartilhado/popup-messages/popup-messages.component';
import { DialogComponent } from '../compartilhado/dialog/dialog.component';
import { TelaPadraoComponent } from '../compartilhado/tela-padrao/tela-padrao.component';
import { ConfigAcoesCrud, EstadoAcoesCrud, TelaBaseComponent } from '../compartilhado/tela-base.component';
import { ReportService } from '../../services/report.service';
import {
  ContabilidadeService,
  ContaBancariaRequest,
  ContaBancariaResponse,
  EmendaImpositivaRequest,
  EmendaImpositivaResponse,
  LancamentoFinanceiroRequest,
  LancamentoFinanceiroResponse,
  MovimentacaoFinanceiraRequest,
  MovimentacaoFinanceiraResponse,
  ReciboPagamentoResponse
} from '../../services/contabilidade.service';
import {
  faArrowTrendDown,
  faArrowTrendUp,
  faBell,
  faChartLine,
  faCalculator,
  faCircleCheck,
  faCircleDot,
  faCircleExclamation,
  faFileInvoice,
  faMoneyBillTransfer,
  faPiggyBank,
  faPrint,
  faWallet
} from '@fortawesome/free-solid-svg-icons';

interface MetricCard {
  label: string;
  value: string;
  icon: any;
  helper?: string;
  trend?: 'up' | 'down';
}

interface CashFlowEntry {
  period: string;
  receivable: number;
  payable: number;
  projection: number;
}

interface FinanceTab {
  id: 'visao-geral' | 'contas' | 'lancamentos' | 'movimentacoes' | 'emendas' | 'relatorios';
  label: string;
  badge?: string;
}

@Component({
  selector: 'app-contabilidade',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    FontAwesomeModule,
    TelaPadraoComponent,
    PopupMessagesComponent,
    DialogComponent
  ],
  templateUrl: './contabilidade.component.html',
  styleUrl: './contabilidade.component.scss'
})
export class ContabilidadeComponent extends TelaBaseComponent implements OnInit {
  readonly faPrint = faPrint;
  readonly faBell = faBell;
  readonly faFileInvoice = faFileInvoice;
  readonly faCircleCheck = faCircleCheck;
  readonly faCircleExclamation = faCircleExclamation;
  readonly faCircleDot = faCircleDot;
  readonly faMoneyBillTransfer = faMoneyBillTransfer;
  readonly faChartLine = faChartLine;
  readonly faCalculator = faCalculator;
  readonly faWallet = faWallet;
  readonly faPiggyBank = faPiggyBank;
  readonly faArrowTrendUp = faArrowTrendUp;
  readonly faArrowTrendDown = faArrowTrendDown;

  readonly acoesToolbar: Required<ConfigAcoesCrud> = this.criarConfigAcoes({    
    salvar: true,
    excluir: true,
    novo: true,
    cancelar: true,
    imprimir: true,
    buscar: true
  });

  popupErros: string[] = [];
  relatorioErro: string | null = null;
  private popupTimeout?: ReturnType<typeof setTimeout>;
  dialogConfirmacaoAberta = false;
  dialogTitulo = 'Confirmar ação';
  dialogMensagem = 'Deseja continuar?';
  dialogConfirmarLabel = 'Confirmar';
  dialogCancelarLabel = 'Cancelar';
  private dialogAcao?: () => void;

  tabs: FinanceTab[] = [
    {
      id: 'visao-geral',
      label: 'Visão geral financeira',
      badge: ''
    },
    {
      id: 'movimentacoes',
      label: 'Movimentações',
      badge: ''
    },
    {
      id: 'contas',
      label: 'Contas bancárias',
      badge: ''
    },
    {
      id: 'lancamentos',
      label: 'Lançamentos',
      badge: ''
    },
    {
      id: 'emendas',
      label: 'Emendas impositivas',
      badge: ''
    },
    {
      id: 'relatorios',
      label: 'Relatórios e documentos',
      badge: ''
    }
  ];

  bancosDisponiveis = [
    'Banco do Brasil',
    'Caixa Economica Federal',
    'Itau',
    'Bradesco',
    'Santander',
    'Banrisul',
    'Banco do Nordeste',
    'Banco da Amazonia',
    'Sicredi',
    'Sicoob',
    'Banco Inter',
    'Nubank',
    'C6 Bank',
    'Banco Original',
    'Banco Pan',
    'Neon',
    'Next',
    'PagBank',
    'Mercado Pago',
    'PicPay',
    'BTG Pactual',
    'Safra',
    'XP',
    'Daycoval',
    'Banco BMG'
  ];

  tiposConta = [
    { value: 'corrente', label: 'Conta corrente' },
    { value: 'poupanca', label: 'Conta poupanca' },
    { value: 'salario', label: 'Conta salario' },
    { value: 'pagamento', label: 'Conta pagamento' },
    { value: 'investimento', label: 'Conta investimento' },
    { value: 'digital', label: 'Conta digital' },
    { value: 'conjunta', label: 'Conta conjunta' },
    { value: 'universitaria', label: 'Conta universitaria' },
    { value: 'empresarial', label: 'Conta empresarial' },
    { value: 'projeto', label: 'Conta vinculada a projeto' }
  ];

  tiposChavePix = [
    { value: 'cnpj', label: 'CNPJ' },
    { value: 'email', label: 'Email' },
    { value: 'telefone', label: 'Telefone' },
    { value: 'aleatoria', label: 'Aleatoria' }
  ];

  activeTab: FinanceTab['id'] = 'visao-geral';

  summaryCards: MetricCard[] = [];
  cashFlow: CashFlowEntry[] = [];
  agenda: LancamentoFinanceiroResponse[] = [];
  bankAccounts: ContaBancariaResponse[] = [];
  financialMovements: MovimentacaoFinanceiraResponse[] = [];
  amendmentControls: EmendaImpositivaResponse[] = [];
  upcomingReceivables: LancamentoFinanceiroResponse[] = [];
  upcomingPayables: LancamentoFinanceiroResponse[] = [];
  alerts: string[] = [];
  reciboPagamento: ReciboPagamentoResponse | null = null;
  mostrarModalImpressao = false;
  imprimindoRelatorio = false;
  tipoRelatorioImpressao: 'extrato-mensal' | 'contas-receber' | 'contas-pagar' | 'contas-bancarias' = 'extrato-mensal';
  relatorioMesReferencia = '';
  relatorioDataReferencia = '';

  filtrosContas = {
    banco: '',
    agencia: '',
    numero: '',
    tipo: ''
  };

  filtrosLancamentos = {
    descricao: '',
    contraparte: '',
    tipo: '',
    situacao: ''
  };

  filtroResumoTipo: '' | 'receber' | 'pagar' = '';

  filtrosMovimentacoes = {
    descricao: '',
    categoria: '',
    tipo: '',
    mesReferencia: ''
  };

  filtrosEmendas = {
    identificacao: '',
    status: ''
  };

  newEntry: LancamentoFinanceiroRequest = {
    tipo: 'receber',
    descricao: '',
    contraparte: '',
    vencimento: this.todayISO(),
    valor: 0,
    situacao: 'aberto'
  };
  valorLancamentoMascara = 'R$ 0,00';
  lancamentoEmEdicaoId: number | null = null;
  salvandoLancamento = false;
  salvandoMovimentacao = false;
  salvandoConta = false;
  salvandoEmenda = false;
  private lancamentosEmProcesso = new Set<number>();
  private pagamentosEmProcesso = new Set<number>();
  private movimentacoesEmProcesso = new Set<number>();
  private contasEmProcesso = new Set<number>();
  private emendasEmProcesso = new Set<number>();
  movimentacaoEmEdicaoId: number | null = null;
  valorMovimentacaoMascara = 'R$ 0,00';

  contaEmEdicaoId: number | null = null;
  pixOriginal = {
    pixVinculado: false,
    tipoChavePix: '',
    chavePix: ''
  };
  saldoContaMascara = '';

  newAmendment: EmendaImpositivaRequest = {
    identificacao: '',
    referenciaLegal: '',
    dataPrevista: this.todayISO(),
    valorPrevisto: 0,
    diasAlerta: 15,
    status: 'previsto',
    observacoes: ''
  };

  newMovement: MovimentacaoFinanceiraRequest = {
    descricao: '',
    contraparte: '',
    dataMovimentacao: this.todayISO(),
    contaBancariaId: undefined,
    valor: 0,
    tipo: 'entrada',
    categoria: 'Operacional'
  };

  reportTotals = {
    recebimentos: 0,
    pagamentos: 0,
    saldoProjetado: 0,
    saldoAReceber: 0
  };

  constructor(
    private readonly contabilidadeService: ContabilidadeService,
    private readonly reportService: ReportService,
    private readonly changeDetector: ChangeDetectorRef,
    private readonly router: Router
  ) {
    super();
  }

  ngOnInit(): void {
    this.carregarDados();
    this.saldoContaMascara = this.formatarValorMonetario(this.newAccount.saldo);
    this.relatorioMesReferencia = this.obterMesAtualISO();
    this.relatorioDataReferencia = this.todayISO();
  }

  get acoesDesabilitadas(): EstadoAcoesCrud {
    const bloqueado = this.bloquearAcoesToolbar();
    return {
      salvar: bloqueado,
      excluir: bloqueado,
      novo: bloqueado,
      cancelar: bloqueado,
      imprimir: false,
      buscar: false
    };
  }

  private carregarDados(): void {
    this.contabilidadeService.listarContasBancarias().subscribe((lista) => {
      this.bankAccounts = lista ?? [];
      this.refreshPanels();
      this.changeDetector.detectChanges();
    });
    this.carregarLancamentos();
    this.contabilidadeService.listarMovimentacoes().subscribe((lista) => {
      this.financialMovements = lista ?? [];
      this.refreshPanels();
      this.changeDetector.detectChanges();
    });
    this.contabilidadeService.listarEmendas().subscribe((lista) => {
      this.amendmentControls = lista ?? [];
      this.refreshPanels();
      this.changeDetector.detectChanges();
    });
  }

  private carregarLancamentos(): void {
    this.contabilidadeService.listarLancamentos().subscribe((lista) => {
      this.agenda = lista ?? [];
      this.refreshPanels();
      this.changeDetector.detectChanges();
    });
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

  get previousTabLabel(): string {
    return this.hasPreviousTab ? this.tabs[this.activeTabIndex - 1].label : '';
  }

  goToPreviousTab(): void {
    if (this.hasPreviousTab) {
      this.changeTab(this.tabs[this.activeTabIndex - 1].id);
    }
  }

  goToNextTab(): void {
    if (this.hasNextTab) {
      this.changeTab(this.tabs[this.activeTabIndex + 1].id);
    }
  }

  get counterpartySuggestions(): string[] {
    const fromEntries = this.agenda.map((item) => item.contraparte);
    const fromMovements = this.financialMovements.map((item) => item.contraparte || '');
    return Array.from(new Set([...fromEntries, ...fromMovements])).filter(Boolean);
  }

  get contasFiltradas(): ContaBancariaResponse[] {
    const filtradas = this.bankAccounts.filter((conta) => {
      const banco = this.normalizeString(conta.banco);
      const numero = this.normalizeString(conta.numero);
      const agencia = this.normalizeString(conta.agencia || '');
      const tipo = this.normalizeString(conta.tipo);
      return (
        (!this.filtrosContas.banco || banco.includes(this.normalizeString(this.filtrosContas.banco))) &&
        (!this.filtrosContas.agencia || agencia.includes(this.normalizeString(this.filtrosContas.agencia))) &&
        (!this.filtrosContas.numero || numero.includes(this.normalizeString(this.filtrosContas.numero))) &&
        (!this.filtrosContas.tipo || tipo === this.normalizeString(this.filtrosContas.tipo))
      );
    });

    const ordemTipo: Record<string, number> = {
      corrente: 0,
      projeto: 1
    };

    return filtradas.slice().sort((a, b) => {
      const ordemA = ordemTipo[a.tipo] ?? 2;
      const ordemB = ordemTipo[b.tipo] ?? 2;
      if (ordemA !== ordemB) {
        return ordemA - ordemB;
      }
      return this.normalizeString(a.banco).localeCompare(this.normalizeString(b.banco));
    });
  }

  get lancamentosFiltrados(): LancamentoFinanceiroResponse[] {
    return this.agenda.filter((item) => {
      const descricao = this.normalizeString(item.descricao);
      const contraparte = this.normalizeString(item.contraparte);
      const tipo = this.normalizeString(item.tipo);
      const situacao = this.normalizeString(item.situacao);
      return (
        (!this.filtrosLancamentos.descricao ||
          descricao.includes(this.normalizeString(this.filtrosLancamentos.descricao))) &&
        (!this.filtrosLancamentos.contraparte ||
          contraparte.includes(this.normalizeString(this.filtrosLancamentos.contraparte))) &&
        (!this.filtrosLancamentos.tipo || tipo === this.normalizeString(this.filtrosLancamentos.tipo)) &&
        (!this.filtrosLancamentos.situacao || situacao === this.normalizeString(this.filtrosLancamentos.situacao))
      );
    });
  }

  get movimentacoesFiltradas(): MovimentacaoFinanceiraResponse[] {
    const filtradas = this.financialMovements.filter((item) => {
      const descricao = this.normalizeString(item.descricao);
      const categoria = this.normalizeString(item.categoria || '');
      const tipo = this.normalizeString(item.tipo);
      const mesReferencia = this.filtrosMovimentacoes.mesReferencia || '';
      const mesMovimentacao = this.obterMesReferenciaMovimentacao(item.dataMovimentacao);
      return (
        (!this.filtrosMovimentacoes.descricao ||
          descricao.includes(this.normalizeString(this.filtrosMovimentacoes.descricao))) &&
        (!this.filtrosMovimentacoes.categoria ||
          categoria.includes(this.normalizeString(this.filtrosMovimentacoes.categoria))) &&
        (!this.filtrosMovimentacoes.tipo || tipo === this.normalizeString(this.filtrosMovimentacoes.tipo)) &&
        (!mesReferencia || mesMovimentacao === mesReferencia)
      );
    });
    return filtradas
      .slice()
      .sort((a, b) => {
        const dataA = this.parseDate(a.dataMovimentacao)?.getTime();
        const dataB = this.parseDate(b.dataMovimentacao)?.getTime();
        const valorA = dataA ?? Number.MIN_SAFE_INTEGER;
        const valorB = dataB ?? Number.MIN_SAFE_INTEGER;
        if (valorA !== valorB) {
          return valorA - valorB;
        }
        const idA = a.id ?? 0;
        const idB = b.id ?? 0;
        return idA - idB;
      });
  }

  get emendasFiltradas(): EmendaImpositivaResponse[] {
    return this.amendmentControls.filter((item) => {
      const identificacao = this.normalizeString(item.identificacao);
      const status = this.normalizeString(item.status);
      return (
        (!this.filtrosEmendas.identificacao ||
          identificacao.includes(this.normalizeString(this.filtrosEmendas.identificacao))) &&
        (!this.filtrosEmendas.status || status === this.normalizeString(this.filtrosEmendas.status))
      );
    });
  }

  changeTab(tabId: FinanceTab['id']): void {
    this.activeTab = tabId;
    if (tabId === 'visao-geral') {
      this.carregarLancamentos();
    }
  }

  registerEntry(): void {
    this.onValorLancamentoInput(this.valorLancamentoMascara);
    if (
      !this.newEntry.descricao ||
      !this.newEntry.contraparte ||
      !this.newEntry.vencimento ||
      !this.newEntry.valor
    ) {
      this.popupErros = new PopupErrorBuilder()
        .adicionar('Preencha os campos obrigatórios do lançamento.')
        .build();
      this.abrirPopupTemporario();
      return;
    }
    if (this.salvandoLancamento) {
      return;
    }
    this.salvandoLancamento = true;
    const request$ = this.lancamentoEmEdicaoId
      ? this.contabilidadeService.atualizarLancamento(this.lancamentoEmEdicaoId, this.newEntry)
      : this.contabilidadeService.criarLancamento(this.newEntry);
    const subscription = request$.subscribe((response) => {
      if (this.lancamentoEmEdicaoId) {
        this.agenda = this.agenda.map((item) => (item.id === response.id ? response : item));
      } else {
        this.agenda = [...this.agenda, response];
      }
      this.newEntry = {
        tipo: 'receber',
        descricao: '',
        contraparte: '',
        vencimento: this.todayISO(),
        valor: 0,
        situacao: 'aberto'
      };
      this.valorLancamentoMascara = this.formatarValorMonetario(0);
      this.lancamentoEmEdicaoId = null;
      this.salvandoLancamento = false;
      this.refreshPanels();
    });
    subscription.add(() => {
      this.salvandoLancamento = false;
    });
  }

  editarLancamento(item: LancamentoFinanceiroResponse): void {
    this.lancamentoEmEdicaoId = item.id;
    this.newEntry = {
      tipo: item.tipo,
      descricao: item.descricao,
      contraparte: item.contraparte,
      vencimento: item.vencimento,
      valor: Number(item.valor || 0),
      situacao: item.situacao
    };
    this.valorLancamentoMascara = this.formatarValorMonetario(Number(item.valor || 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelarEdicaoLancamento(): void {
    this.newEntry = {
      tipo: 'receber',
      descricao: '',
      contraparte: '',
      vencimento: this.todayISO(),
      valor: 0,
      situacao: 'aberto'
    };
    this.valorLancamentoMascara = this.formatarValorMonetario(0);
    this.lancamentoEmEdicaoId = null;
  }

  novoLancamento(): void {
    this.cancelarEdicaoLancamento();
  }

  onValorLancamentoInput(valor: string): void {
    const apenasNumeros = (valor ?? '').replace(/\D/g, '');
    const numero = Number(apenasNumeros || 0) / 100;
    this.newEntry = { ...this.newEntry, valor: numero };
    this.valorLancamentoMascara = this.formatarValorMonetario(numero);
  }

  newAccount: ContaBancariaRequest = {
    banco: '',
    agencia: '',
    numero: '',
    tipo: 'corrente',
    projetoVinculado: '',
    pixVinculado: false,
    recebimentoLocal: false,
    tipoChavePix: '',
    chavePix: '',
    saldo: 0,
    dataAtualizacao: this.todayISO()
  };
  erroChavePix: string | null = null;

  registerMovement(): void {
    this.onValorMovimentacaoInput(this.valorMovimentacaoMascara);
    if (!this.newMovement.descricao || !this.newMovement.contaBancariaId || !this.newMovement.dataMovimentacao) {
    this.popupErros = new PopupErrorBuilder()
      .adicionar('Preencha os campos obrigatórios da movimentação.')
      .build();
      this.abrirPopupTemporario();
      return;
    }
    if (this.salvandoMovimentacao) {
      return;
    }
    this.salvandoMovimentacao = true;
    const request$ = this.movimentacaoEmEdicaoId
      ? this.contabilidadeService.atualizarMovimentacao(this.movimentacaoEmEdicaoId, this.newMovement)
      : this.contabilidadeService.criarMovimentacao(this.newMovement);
    const subscription = request$.subscribe((response) => {
      if (this.movimentacaoEmEdicaoId) {
        this.financialMovements = this.financialMovements.map((item) => (item.id === response.id ? response : item));
      } else {
        this.financialMovements = [...this.financialMovements, response];
      }
      this.contabilidadeService.listarContasBancarias().subscribe((contas) => {
        this.bankAccounts = contas ?? [];
        this.refreshPanels();
      });
      this.popupErros = new PopupErrorBuilder()
        .adicionar('Registro realizado com sucesso.')
        .build();
      this.changeDetector.detectChanges();
      this.abrirPopupTemporario();
      this.newMovement = {
        descricao: '',
        contraparte: '',
        dataMovimentacao: this.todayISO(),
        contaBancariaId: undefined,
        valor: 0,
        tipo: 'entrada',
        categoria: 'Operacional'
      };
      this.valorMovimentacaoMascara = this.formatarValorMonetario(0);
      this.movimentacaoEmEdicaoId = null;
    });
    subscription.add(() => {
      this.salvandoMovimentacao = false;
    });
  }

  editarMovimentacao(movement: MovimentacaoFinanceiraResponse): void {
    if (!this.isMovimentacaoEntrada(movement)) {
      this.popupErros = new PopupErrorBuilder()
        .adicionar('Apenas receitas podem ser editadas.')
        .build();
      this.abrirPopupTemporario();
      return;
    }
    this.movimentacaoEmEdicaoId = movement.id;
    this.newMovement = {
      tipo: this.normalizarTipoMovimentacao(movement.tipo),
      descricao: movement.descricao,
      contraparte: movement.contraparte || '',
      categoria: movement.categoria || 'Operacional',
      contaBancariaId: movement.contaBancariaId,
      dataMovimentacao: movement.dataMovimentacao,
      valor: Number(movement.valor || 0)
    };
    this.valorMovimentacaoMascara = this.formatarValorMonetario(Number(movement.valor || 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  removerMovimentacao(movement: MovimentacaoFinanceiraResponse): void {
    if (!movement.id || this.movimentacoesEmProcesso.has(movement.id)) {
      return;
    }
    this.abrirDialogoConfirmacao(
      'Excluir movimentação',
      'Confirma a exclusão desta movimentação registrada?',
      'Excluir',
      () => {
        if (this.movimentacoesEmProcesso.has(movement.id!)) {
          return;
        }
        this.movimentacoesEmProcesso.add(movement.id!);
        this.contabilidadeService.removerMovimentacao(movement.id).subscribe({
          next: () => {
            this.financialMovements = this.financialMovements.filter((item) => item.id !== movement.id);
            if (this.movimentacaoEmEdicaoId === movement.id) {
              this.cancelarEdicaoMovimentacao();
            }
            this.contabilidadeService.listarContasBancarias().subscribe((contas) => {
              this.bankAccounts = contas ?? [];
              this.refreshPanels();
            });
            this.popupErros = new PopupErrorBuilder()
              .adicionar('Movimentação excluída com sucesso.')
              .build();
            this.abrirPopupTemporario();
            this.movimentacoesEmProcesso.delete(movement.id!);
          },
          error: () => {
            this.movimentacoesEmProcesso.delete(movement.id!);
          }
        });
      }
    );
  }

  removerLancamento(entry: LancamentoFinanceiroResponse): void {
    if (!entry.id || this.lancamentosEmProcesso.has(entry.id)) {
      return;
    }
    this.abrirDialogoConfirmacao(
      'Excluir lançamento',
      'Confirma a exclusão deste lançamento? Os dados serão removidos.',
      'Excluir',
      () => {
        if (this.lancamentosEmProcesso.has(entry.id!)) {
          return;
        }
        this.lancamentosEmProcesso.add(entry.id!);
        this.contabilidadeService.removerLancamento(entry.id).subscribe({
          next: () => {
            this.agenda = this.agenda.filter((item) => item.id !== entry.id);
            if (this.lancamentoEmEdicaoId === entry.id) {
              this.cancelarEdicaoLancamento();
            }
            this.refreshPanels();
            this.popupErros = new PopupErrorBuilder()
              .adicionar('Lançamento excluído com sucesso.')
              .build();
            this.abrirPopupTemporario();
            this.lancamentosEmProcesso.delete(entry.id!);
          },
          error: () => {
            this.popupErros = new PopupErrorBuilder()
              .adicionar('Não foi possível excluir o lançamento.')
              .build();
            this.abrirPopupTemporario();
            this.lancamentosEmProcesso.delete(entry.id!);
          }
        });
      }
    );
  }

  cancelarEdicaoMovimentacao(): void {
    this.newMovement = {
      descricao: '',
      contraparte: '',
      dataMovimentacao: this.todayISO(),
      contaBancariaId: undefined,
      valor: 0,
      tipo: 'entrada',
      categoria: 'Operacional'
    };
    this.movimentacaoEmEdicaoId = null;
    this.valorMovimentacaoMascara = this.formatarValorMonetario(0);
  }

  onValorMovimentacaoInput(valor: string): void {
    const apenasNumeros = (valor ?? '').replace(/\D/g, '');
    const numero = Number(apenasNumeros || 0) / 100;
    this.newMovement = { ...this.newMovement, valor: numero };
    this.valorMovimentacaoMascara = this.formatarValorMonetario(numero);
  }

  isMovimentacaoEntrada(movement: MovimentacaoFinanceiraResponse): boolean {
    return this.normalizarTipoMovimentacao(movement.tipo) === 'entrada';
  }

  private normalizarTipoMovimentacao(tipo?: string): string {
    return (tipo ?? '').toLowerCase();
  }

  private obterMesReferenciaMovimentacao(dataMovimentacao?: string): string {
    if (!dataMovimentacao) {
      return '';
    }
    return String(dataMovimentacao).slice(0, 7);
  }

  addBankAccount(): void {
    this.onSaldoContaInput(this.saldoContaMascara);
    if (!this.newAccount.banco || !this.newAccount.numero) {
      this.popupErros = new PopupErrorBuilder()
        .adicionar('Informe banco e número da conta.')
        .build();
      this.abrirPopupTemporario();
      return;
    }
    if (!this.newAccount.dataAtualizacao) {
      this.popupErros = new PopupErrorBuilder()
        .adicionar('Informe a data da última atualização da conta.')
        .build();
      this.abrirPopupTemporario();
      return;
    }
    if (this.newAccount.tipo === 'projeto' && !this.newAccount.projetoVinculado) {
      this.popupErros = new PopupErrorBuilder()
        .adicionar('Informe o projeto vinculado para conta de projeto.')
        .build();
      this.abrirPopupTemporario();
      return;
    }
    if (this.salvandoConta) {
      return;
    }
    this.erroChavePix = this.validarChavePix();
    const podeIgnorarPixInvalido = this.contaEmEdicaoId && !this.isPixAlterado();
    if (this.erroChavePix && !podeIgnorarPixInvalido) {
      this.popupErros = new PopupErrorBuilder().adicionar(this.erroChavePix).build();
      this.abrirPopupTemporario();
      return;
    }
    this.salvandoConta = true;
    const payload = {
      ...this.newAccount,
      recebimentoLocal: Boolean(this.newAccount.recebimentoLocal),
      tipoChavePix: (this.newAccount.tipoChavePix || '').trim(),
      chavePix: (this.newAccount.chavePix || '').trim()
    };
    const request$ = this.contaEmEdicaoId
      ? this.contabilidadeService.atualizarContaBancaria(this.contaEmEdicaoId, payload)
      : this.contabilidadeService.criarContaBancaria(payload);
    const estavaEditando = Boolean(this.contaEmEdicaoId);
      request$.subscribe({
        next: (response) => {
          if (estavaEditando) {
            this.bankAccounts = this.bankAccounts.map((conta) => (conta.id === response.id ? response : conta));
          } else {
            this.bankAccounts = [...this.bankAccounts, response];
          }
          this.resetContaBancariaForm();
          this.refreshPanels();
          this.popupErros = new PopupErrorBuilder()
            .adicionar(estavaEditando ? 'Conta atualizada com sucesso.' : 'Conta cadastrada com sucesso.')
            .build();
          this.abrirPopupTemporario();
          this.changeDetector.detectChanges();
          this.salvandoConta = false;
        },
        error: (erro) => {
          const mensagem =
            erro?.error?.message ||
            erro?.message ||
            'Não foi possível atualizar a conta bancária. Verifique os dados informados.';
          this.popupErros = new PopupErrorBuilder().adicionar(mensagem).build();
          this.abrirPopupTemporario();
          this.salvandoConta = false;
        }
      });
  }

  editarContaBancaria(conta: ContaBancariaResponse): void {
    this.contaEmEdicaoId = conta.id;
    this.pixOriginal = {
      pixVinculado: Boolean(conta.pixVinculado),
      tipoChavePix: (conta.tipoChavePix || '').trim(),
      chavePix: (conta.chavePix || '').trim()
    };
    this.newAccount = {
      banco: conta.banco,
      agencia: conta.agencia || '',
      numero: conta.numero,
      tipo: conta.tipo,
      projetoVinculado: conta.projetoVinculado || '',
      pixVinculado: Boolean(conta.pixVinculado),
      recebimentoLocal: Boolean(conta.recebimentoLocal),
      tipoChavePix: conta.tipoChavePix || '',
      chavePix: conta.chavePix || '',
      saldo: Number(conta.saldo || 0),
      dataAtualizacao: this.formatarDataInput(conta.dataAtualizacao)
    };
    this.saldoContaMascara = this.formatarValorMonetario(Number(conta.saldo || 0));
    this.erroChavePix = this.validarChavePix();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelarEdicaoContaBancaria(): void {
    this.resetContaBancariaForm();
  }

  removerContaBancaria(conta: ContaBancariaResponse): void {
    if (!conta.id || this.contasEmProcesso.has(conta.id)) {
      return;
    }
    this.abrirDialogoConfirmacao(
      'Excluir conta bancária',
      'Deseja excluir esta conta bancária? Esta ação não pode ser desfeita.',
      'Excluir',
      () => {
        if (this.contasEmProcesso.has(conta.id!)) {
          return;
        }
        this.contasEmProcesso.add(conta.id!);
        this.contabilidadeService.removerContaBancaria(conta.id).subscribe({
          next: () => {
            this.bankAccounts = this.bankAccounts.filter((item) => item.id !== conta.id);
            if (this.contaEmEdicaoId === conta.id) {
              this.resetContaBancariaForm();
            }
            this.refreshPanels();
            this.contasEmProcesso.delete(conta.id!);
          },
          error: () => {
            this.contasEmProcesso.delete(conta.id!);
          }
        });
      }
    );
  }

  onSaldoContaInput(valor: string): void {
    const apenasNumeros = (valor ?? '').replace(/\D/g, '');
    const numero = Number(apenasNumeros || 0) / 100;
    this.newAccount = { ...this.newAccount, saldo: numero };
    this.saldoContaMascara = this.formatarValorMonetario(numero);
  }

  addAmendment(): void {
    if (!this.newAmendment.identificacao || !this.newAmendment.dataPrevista || !this.newAmendment.valorPrevisto) {
      this.popupErros = new PopupErrorBuilder()
      .adicionar('Preencha os campos obrigatórios da emenda.')
        .build();
      this.abrirPopupTemporario();
      return;
    }
    if (this.salvandoEmenda) {
      return;
    }
    this.salvandoEmenda = true;
    const subscription = this.contabilidadeService.criarEmenda(this.newAmendment).subscribe((response) => {
      this.amendmentControls = [...this.amendmentControls, response];
      this.newAmendment = {
        identificacao: '',
        referenciaLegal: '',
        dataPrevista: this.todayISO(),
        valorPrevisto: 0,
        diasAlerta: 15,
        status: 'previsto',
        observacoes: ''
      };
      this.refreshPanels();
    });
    subscription.add(() => {
      this.salvandoEmenda = false;
    });
  }

  setEntryStatus(entry: LancamentoFinanceiroResponse, status: string): void {
    if (!entry.id) return;
    if (this.lancamentosEmProcesso.has(entry.id)) {
      return;
    }
    const mensagem =
      status === 'pago'
        ? 'Confirmar registro de pagamento deste lançamento?'
        : 'Confirmar marcação de atraso deste lançamento?';
    this.abrirDialogoConfirmacao('Confirmar alteracao', mensagem, 'Confirmar', () => {
      if (this.lancamentosEmProcesso.has(entry.id!)) {
        return;
      }
      this.lancamentosEmProcesso.add(entry.id!);
      this.contabilidadeService.atualizarSituacaoLancamento(entry.id, status).subscribe((response) => {
        this.agenda = this.agenda.map((item) => (item.id === entry.id ? response : item));
        this.refreshPanels();
        this.lancamentosEmProcesso.delete(entry.id!);
      }, () => {
        this.lancamentosEmProcesso.delete(entry.id!);
      });
    });
  }

  pagarLancamento(entry: LancamentoFinanceiroResponse): void {
    if (!entry.id) return;
    if (this.pagamentosEmProcesso.has(entry.id)) {
      return;
    }
    this.abrirDialogoConfirmacao('Confirmar pagamento', 'Confirmar pagamento deste lançamento?', 'Confirmar', () => {
      if (this.pagamentosEmProcesso.has(entry.id!)) {
        return;
      }
      this.pagamentosEmProcesso.add(entry.id!);
      this.contabilidadeService.pagarLancamento(entry.id).subscribe((response) => {
        this.reciboPagamento = response;
        this.agenda = this.agenda.map((item) =>
          item.id === entry.id ? { ...item, situacao: 'pago' } : item
        );
        this.refreshPanels();
        this.contabilidadeService.listarMovimentacoes().subscribe((lista) => {
          this.financialMovements = lista ?? [];
          this.refreshPanels();
        });
        this.contabilidadeService.listarContasBancarias().subscribe((contas) => {
          this.bankAccounts = contas ?? [];
          this.refreshPanels();
        });
        window.print();
        this.pagamentosEmProcesso.delete(entry.id!);
      }, () => {
        this.pagamentosEmProcesso.delete(entry.id!);
      });
    });
  }

  setAmendmentStatus(amendment: EmendaImpositivaResponse, status: string): void {
    if (!amendment.id) return;
    if (this.emendasEmProcesso.has(amendment.id)) {
      return;
    }
    this.emendasEmProcesso.add(amendment.id);
    this.contabilidadeService.atualizarStatusEmenda(amendment.id, status).subscribe((response) => {
      this.amendmentControls = this.amendmentControls.map((item) => (item.id === amendment.id ? response : item));
      this.refreshPanels();
      this.emendasEmProcesso.delete(amendment.id!);
    }, () => {
      this.emendasEmProcesso.delete(amendment.id!);
    });
  }

  printResumo(): void {
    window.print();
  }

  onSalvar(): void {
    switch (this.activeTab) {
      case 'visao-geral':
      case 'lancamentos':
        this.registerEntry();
        return;
      case 'contas':
        this.addBankAccount();
        return;
      case 'movimentacoes':
        this.registerMovement();
        return;
      case 'emendas':
        this.addAmendment();
        return;
      default:
        this.popupErros = new PopupErrorBuilder()
          .adicionar('Nada para salvar nesta aba.')
          .build();
        this.abrirPopupTemporario();
    }
  }

  onExcluir(): void {
    if (this.activeTab === 'contas') {
      const conta = this.bankAccounts.find((item) => item.id === this.contaEmEdicaoId);
      if (!conta) {
        this.popupErros = new PopupErrorBuilder()
          .adicionar('Selecione uma conta para excluir.')
          .build();
        this.abrirPopupTemporario();
        return;
      }
      this.removerContaBancaria(conta);
      return;
    }

    if (this.activeTab === 'movimentacoes') {
      const movimento = this.financialMovements.find((item) => item.id === this.movimentacaoEmEdicaoId);
      if (!movimento) {
        this.popupErros = new PopupErrorBuilder()
          .adicionar('Selecione uma movimentação para excluir.')
          .build();
        this.abrirPopupTemporario();
        return;
      }
      this.removerMovimentacao(movimento);
      return;
    }

    if (this.activeTab === 'lancamentos' || this.activeTab === 'visao-geral') {
      const lancamento = this.agenda.find((item) => item.id === this.lancamentoEmEdicaoId);
      if (!lancamento) {
        this.popupErros = new PopupErrorBuilder()
          .adicionar('Selecione um lançamento para excluir.')
          .build();
        this.abrirPopupTemporario();
        return;
      }
      this.removerLancamento(lancamento);
      return;
    }

    this.popupErros = new PopupErrorBuilder()
      .adicionar('Exclusão não disponível nesta aba.')
      .build();
    this.abrirPopupTemporario();
  }

  onNovo(): void {
    switch (this.activeTab) {
      case 'visao-geral':
      case 'lancamentos':
        this.novoLancamento();
        return;
      case 'contas':
        this.resetContaBancariaForm();
        return;
      case 'movimentacoes':
        this.newMovement = {
          descricao: '',
          contraparte: '',
          dataMovimentacao: this.todayISO(),
          contaBancariaId: undefined,
          valor: 0,
          tipo: 'entrada',
          categoria: 'Operacional'
        };
        this.movimentacaoEmEdicaoId = null;
        return;
      case 'emendas':
        this.newAmendment = {
          identificacao: '',
          referenciaLegal: '',
          dataPrevista: this.todayISO(),
          valorPrevisto: 0,
          diasAlerta: 15,
          status: 'previsto',
          observacoes: ''
        };
        return;
      default:
        this.popupErros = new PopupErrorBuilder()
          .adicionar('Nada para limpar nesta aba.')
          .build();
        this.abrirPopupTemporario();
    }
  }

  onCancelar(): void {
    if (this.activeTab === 'visao-geral' || this.activeTab === 'lancamentos') {
      this.cancelarEdicaoLancamento();
      return;
    }
    if (this.activeTab === 'contas') {
      this.cancelarEdicaoContaBancaria();
      return;
    }
    this.onNovo();
  }

  onImprimir(): void {
    this.abrirModalImpressao();
  }

  onBuscar(): void {
    this.popupErros = [];
    switch (this.activeTab) {
      case 'visao-geral':
      case 'lancamentos':
        this.carregarLancamentos();
        break;
      case 'contas':
        this.contabilidadeService.listarContasBancarias().subscribe((contas) => {
          this.bankAccounts = contas ?? [];
          this.refreshPanels();
          this.changeDetector.detectChanges();
        });
        break;
      case 'movimentacoes':
        this.contabilidadeService.listarMovimentacoes().subscribe((lista) => {
          this.financialMovements = lista ?? [];
          this.refreshPanels();
          this.changeDetector.detectChanges();
        });
        break;
      case 'emendas':
        this.contabilidadeService.listarEmendas().subscribe((lista) => {
          this.amendmentControls = lista ?? [];
          this.refreshPanels();
          this.changeDetector.detectChanges();
        });
        break;
      default:
        this.carregarDados();
    }
    this.popupErros = new PopupErrorBuilder()
      .adicionar('Dados atualizados com sucesso.')
      .build();
    this.abrirPopupTemporario();
  }

  onFechar(): void {
    this.router.navigate(['/financeiro/contabilidade']);
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

  abrirModalImpressao(): void {
    this.relatorioErro = null;
    if (this.filtrosMovimentacoes.mesReferencia) {
      this.relatorioMesReferencia = this.filtrosMovimentacoes.mesReferencia;
    }
    if (!this.relatorioMesReferencia) {
      this.relatorioMesReferencia = this.obterMesAtualISO();
    }
    if (!this.relatorioDataReferencia) {
      this.relatorioDataReferencia = this.todayISO();
    }
    this.mostrarModalImpressao = true;
  }

  fecharModalImpressao(): void {
    this.mostrarModalImpressao = false;
    this.relatorioErro = null;
  }

  confirmarImpressao(): void {
    if (this.imprimindoRelatorio) {
      return;
    }
    this.relatorioErro = null;
    const janelaRelatorio = window.open('', '_blank', 'width=900,height=1100');
    if (!janelaRelatorio) {
      this.relatorioErro = 'Permita pop-ups para visualizar o relatório.';
      return;
    }
    this.prepararJanelaRelatorio(janelaRelatorio, 'Gerando relatório. Aguarde...');
    this.imprimindoRelatorio = true;

    let request$;
    switch (this.tipoRelatorioImpressao) {
      case 'extrato-mensal':
        request$ = this.reportService.generateExtratoMensalContabilidade({
          mesReferencia: this.relatorioMesReferencia || this.obterMesAtualISO()
        });
        break;
      case 'contas-receber':
        request$ = this.reportService.generateContasAReceber({});
        break;
      case 'contas-pagar':
        request$ = this.reportService.generateContasAPagar({});
        break;
      case 'contas-bancarias':
        request$ = this.reportService.generateContasBancarias({
          dataReferencia: this.relatorioDataReferencia || this.todayISO()
        });
        break;
      default:
        request$ = this.reportService.generateExtratoMensalContabilidade({
          mesReferencia: this.relatorioMesReferencia || this.obterMesAtualISO()
        });
    }

    const subscription = request$.subscribe({
      next: (blob) => {
        this.openPdfInWindow(blob, janelaRelatorio);
        this.fecharModalImpressao();
      },
      error: () => {
        this.relatorioErro = 'Não foi possível gerar o relatório. Tente novamente.';
        this.prepararJanelaRelatorio(
          janelaRelatorio,
          'Não foi possível gerar o relatório. Verifique os dados e tente novamente.'
        );
      }
    });
    subscription.add(() => {
      this.imprimindoRelatorio = false;
    });
  }

  private openPdfInWindow(blob: Blob, janelaRelatorio: Window | null): void {
    const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
    if (janelaRelatorio && !janelaRelatorio.closed) {
      janelaRelatorio.location.href = url;
    } else {
      window.open(url, '_blank', 'width=900,height=1100');
    }
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  private prepararJanelaRelatorio(janelaRelatorio: Window, mensagem: string): void {
    if (janelaRelatorio.closed) {
      return;
    }
    try {
      janelaRelatorio.document.open();
      janelaRelatorio.document.write(`
        <!DOCTYPE html>
        <html lang="pt-BR">
          <head>
            <meta charset="UTF-8" />
            <title>Relatório</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 32px; color: #0f172a; }
              .box { border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; background: #f8fafc; }
              h1 { font-size: 18px; margin: 0 0 8px; }
              p { margin: 0; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="box">
              <h1>Relatório</h1>
              <p>${mensagem}</p>
            </div>
          </body>
        </html>
      `);
      janelaRelatorio.document.close();
    } catch {
      // ignora falha de escrita em janela externa
    }
  }

  isLancamentoProcessando(entry: LancamentoFinanceiroResponse): boolean {
    if (!entry.id) return false;
    return this.lancamentosEmProcesso.has(entry.id) || this.pagamentosEmProcesso.has(entry.id);
  }

  isPagamentoProcessando(entry: LancamentoFinanceiroResponse): boolean {
    if (!entry.id) return false;
    return this.pagamentosEmProcesso.has(entry.id);
  }

  isMovimentacaoProcessando(movement: MovimentacaoFinanceiraResponse): boolean {
    if (!movement.id) return false;
    return this.movimentacoesEmProcesso.has(movement.id);
  }

  isContaProcessando(conta: ContaBancariaResponse): boolean {
    if (!conta.id) return false;
    return this.contasEmProcesso.has(conta.id);
  }

  isEmendaProcessando(amendment: EmendaImpositivaResponse): boolean {
    if (!amendment.id) return false;
    return this.emendasEmProcesso.has(amendment.id);
  }

  private bloquearAcoesToolbar(): boolean {
    switch (this.activeTab) {
      case 'visao-geral':
      case 'lancamentos':
        return this.salvandoLancamento || this.lancamentosEmProcesso.size > 0 || this.pagamentosEmProcesso.size > 0;
      case 'movimentacoes':
        return this.salvandoMovimentacao || this.movimentacoesEmProcesso.size > 0;
      case 'contas':
        return this.salvandoConta || this.contasEmProcesso.size > 0;
      case 'emendas':
        return this.salvandoEmenda || this.emendasEmProcesso.size > 0;
      default:
        return false;
    }
  }

  getStatusLabel(entry: LancamentoFinanceiroResponse): string {
    switch (entry.situacao) {
      case 'pago':
        return 'Pago';
      case 'atrasado':
        return 'Em atraso';
      default:
        return entry.tipo === 'receber' ? 'A receber' : 'A pagar';
    }
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    }).format(value || 0);
  }

  formatDate(date: string | Date): string {
    const parsed = this.parseDate(date);
    if (!parsed) return '';
    return parsed.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  getTipoContaLabel(tipo: string): string {
    const encontrado = this.tiposConta.find((item) => item.value === tipo);
    return encontrado ? encontrado.label : tipo;
  }

  getTipoChavePixLabel(tipo: string | undefined): string {
    if (!tipo) {
      return 'chave';
    }
    const encontrado = this.tiposChavePix.find((item) => item.value === tipo);
    return encontrado ? encontrado.label : tipo;
  }

  private resetContaBancariaForm(): void {
    this.contaEmEdicaoId = null;
    this.pixOriginal = {
      pixVinculado: false,
      tipoChavePix: '',
      chavePix: ''
    };
    this.newAccount = {
      banco: '',
      agencia: '',
      numero: '',
      tipo: 'corrente',
      projetoVinculado: '',
      pixVinculado: false,
      recebimentoLocal: false,
      tipoChavePix: '',
      chavePix: '',
      saldo: 0,
      dataAtualizacao: this.todayISO()
    };
    this.saldoContaMascara = this.formatarValorMonetario(0);
  }

  corrigirPix(conta: ContaBancariaResponse): void {
    this.editarContaBancaria(conta);
    if (this.newAccount.pixVinculado) {
      this.erroChavePix = this.validarChavePix();
    }
  }

  isChavePixInvalida(conta: ContaBancariaResponse): boolean {
    if (!conta.pixVinculado) {
      return false;
    }
    const tipo = (conta.tipoChavePix || '').trim().toLowerCase();
    const chave = (conta.chavePix || '').trim();
    if (!tipo || !chave) {
      return true;
    }
    if (tipo === 'cnpj') {
      return !this.validarCnpj(chave);
    }
    if (tipo === 'email') {
      return !this.validarEmail(chave);
    }
    if (tipo === 'telefone') {
      return !this.validarTelefone(chave);
    }
    if (tipo === 'aleatoria') {
      return !this.validarChaveAleatoria(chave);
    }
    return false;
  }

  isPixAlterado(): boolean {
    const pixVinculado = Boolean(this.newAccount.pixVinculado);
    const tipo = (this.newAccount.tipoChavePix || '').trim();
    const chave = (this.newAccount.chavePix || '').trim();
    return (
      pixVinculado !== this.pixOriginal.pixVinculado ||
      tipo !== this.pixOriginal.tipoChavePix ||
      chave !== this.pixOriginal.chavePix
    );
  }

  onPixVinculadoChange(valor: boolean): void {
    this.newAccount = {
      ...this.newAccount,
      pixVinculado: valor,
      tipoChavePix: valor ? this.newAccount.tipoChavePix : '',
      chavePix: valor ? this.newAccount.chavePix : ''
    };
    this.erroChavePix = null;
  }

  onTipoChavePixChange(valor: string): void {
    this.newAccount = { ...this.newAccount, tipoChavePix: valor, chavePix: '' };
    this.erroChavePix = null;
  }

  onChavePixInput(valor: string): void {
    const tipo = this.newAccount.tipoChavePix;
    let atualizado = valor || '';
    if (tipo === 'cnpj') {
      atualizado = this.aplicarMascaraCnpj(atualizado);
    } else if (tipo === 'telefone') {
      atualizado = this.aplicarMascaraTelefone(atualizado);
    }
    this.newAccount = { ...this.newAccount, chavePix: atualizado };
    this.erroChavePix = null;
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

  private aplicarMascaraTelefone(valor: string): string {
    const numeros = (valor ?? '').replace(/\D/g, '').slice(0, 11);
    if (!numeros) {
      return '';
    }
    const ddd = numeros.slice(0, 2);
    const corpo = numeros.slice(2);
    if (corpo.length <= 4) {
      return `(${ddd}) ${corpo}`;
    }
    if (corpo.length <= 9) {
      return `(${ddd}) ${corpo.slice(0, 5)}-${corpo.slice(5)}`;
    }
    return `(${ddd}) ${corpo.slice(0, 5)}-${corpo.slice(5, 9)}`;
  }

  private validarChavePix(): string | null {
    if (!this.newAccount.pixVinculado) {
      return null;
    }
    const tipo = this.newAccount.tipoChavePix || '';
    const chave = (this.newAccount.chavePix || '').trim();
    if (!tipo) {
      return 'Informe o tipo da chave Pix.';
    }
    if (!chave) {
      return 'Informe a chave Pix.';
    }
    if (tipo === 'cnpj' && !this.validarCnpj(chave)) {
      return 'CNPJ inválido na chave Pix.';
    }
    if (tipo === 'email' && !this.validarEmail(chave)) {
      return 'Email inválido na chave Pix.';
    }
    if (tipo === 'telefone' && !this.validarTelefone(chave)) {
      return 'Telefone inválido na chave Pix.';
    }
    if (tipo === 'aleatoria' && !this.validarChaveAleatoria(chave)) {
      return 'Chave aleatoria invalida.';
    }
    return null;
  }

  private validarCnpj(valor: string): boolean {
    const cnpj = valor.replace(/\D/g, '');
    if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) {
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

  private validarEmail(valor: string): boolean {
    const email = valor.trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private validarTelefone(valor: string): boolean {
    const telefone = valor.replace(/\D/g, '');
    return telefone.length === 10 || telefone.length === 11;
  }

  private validarChaveAleatoria(valor: string): boolean {
    const chave = valor.trim();
    return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
      chave
    );
  }

  private formatarValorMonetario(valor: number): string {
    const numero = Number.isFinite(valor) ? valor : 0;
    return `R$ ${numero.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  private refreshPanels(): void {
    this.refreshMetrics();
    this.refreshPipelines();
    this.refreshCashFlow();
    this.refreshAlerts();
    this.refreshReport();
  }

  private refreshMetrics(): void {
    const receivable = this.sumEntries('receber', 30);
    const payable = this.sumEntries('pagar', 30);
    const cashBalance = this.totalCashBalance();
    const investments = this.bankAccounts
      .filter((account) => account.tipo !== 'corrente')
      .reduce((total, account) => total + Number(account.saldo || 0), 0);

    const baseReceivable = this.filtroResumoTipo === 'pagar' ? 0 : receivable;
    const basePayable = this.filtroResumoTipo === 'receber' ? 0 : payable;

    this.summaryCards = [
      {
        label: 'A receber (30 dias)',
        value: this.formatCurrency(baseReceivable),
        icon: faWallet,
        trend: baseReceivable >= basePayable ? 'up' : undefined
      },
      {
        label: 'A pagar (30 dias)',
        value: this.formatCurrency(basePayable),
        icon: faMoneyBillTransfer,
        trend: basePayable > baseReceivable ? 'down' : undefined
      },
      {
        label: 'Em caixa',
        value: this.formatCurrency(cashBalance),
        icon: faPiggyBank
      },
      {
        label: 'Aplicado em bancos',
        value: this.formatCurrency(investments),
        icon: faChartLine
      }
    ];
  }

  private refreshPipelines(): void {
    const ordered = [...this.agenda].sort((a, b) => {
      const dateA = this.parseDate(a.vencimento)?.getTime() ?? 0;
      const dateB = this.parseDate(b.vencimento)?.getTime() ?? 0;
      return dateA - dateB;
    });

    this.upcomingReceivables = ordered.filter((item) => item.tipo === 'receber' && item.situacao !== 'pago');
    this.upcomingPayables = ordered.filter((item) => item.tipo === 'pagar' && item.situacao !== 'pago');
  }

  private refreshCashFlow(): void {
    const start = this.startOfWeek(new Date());
    let runningBalance = this.totalCashBalance();

    this.cashFlow = Array.from({ length: 4 }).map((_, index) => {
      const startWeek = new Date(start);
      startWeek.setDate(startWeek.getDate() + index * 7);
      const endWeek = new Date(startWeek);
      endWeek.setDate(endWeek.getDate() + 6);

      const receivable = this.sumEntriesInRange('receber', startWeek, endWeek);
      const payable = this.sumEntriesInRange('pagar', startWeek, endWeek);
      runningBalance += receivable - payable;

      return {
        period: `${this.formatDate(startWeek)} - ${this.formatDate(endWeek)}`,
        receivable,
        payable,
        projection: runningBalance
      };
    });
  }

  get cashFlowMax(): number {
    if (!this.cashFlow.length) {
      return 0;
    }
    return this.cashFlow.reduce((maximo, item) => {
      const maior = Math.max(item.receivable, item.payable);
      return maior > maximo ? maior : maximo;
    }, 0);
  }

  calcularPercentual(valor: number, maximo: number): number {
    if (!maximo) {
      return 0;
    }
    return Math.max(0, Math.min(100, (valor / maximo) * 100));
  }

  private refreshAlerts(): void {
    const today = new Date();
    const dueSoon = this.agenda
      .filter((item) => item.situacao !== 'pago')
      .filter((item) => {
        const parsed = this.parseDate(item.vencimento);
        if (!parsed) return false;
        const diff = this.daysBetween(today, parsed);
        return diff <= 7;
      })
      .map((item) => `${item.descricao} vence em ${this.formatDate(item.vencimento)}`);

    const amendmentAlerts = this.amendmentControls
      .filter((amendment) => amendment.status !== 'recebido')
      .filter((amendment) => {
        const parsed = this.parseDate(amendment.dataPrevista);
        if (!parsed) return false;
        const diff = this.daysBetween(today, parsed);
        return diff <= (amendment.diasAlerta ?? 15);
      })
      .map((amendment) => `Emenda ${amendment.identificacao} prevista para ${this.formatDate(amendment.dataPrevista)}`);

    this.alerts = [...dueSoon, ...amendmentAlerts];
  }

  private refreshReport(): void {
    const recebimentos = this.financialMovements
      .filter((movement) => movement.tipo === 'entrada')
      .reduce((total, movement) => total + Number(movement.valor || 0), 0);
    const pagamentos = this.financialMovements
      .filter((movement) => movement.tipo === 'saida')
      .reduce((total, movement) => total + Number(movement.valor || 0), 0);
    const saldoAReceber = this.agenda
      .filter((item) => item.tipo === 'receber' && item.situacao !== 'pago')
      .reduce((total, item) => total + Number(item.valor || 0), 0);

    this.reportTotals = {
      recebimentos,
      pagamentos,
      saldoProjetado: this.totalCashBalance() + saldoAReceber - pagamentos,
      saldoAReceber
    };
  }

  private sumEntries(type: string, daysAhead: number): number {
    const today = this.toDateOnly(new Date());
    const start = this.toDateOnly(new Date());
    start.setDate(start.getDate() - daysAhead);
    const limit = this.toDateOnly(new Date());
    limit.setDate(limit.getDate() + daysAhead);

    return this.agenda
      .filter((item) => item.tipo === type && item.situacao !== 'pago')
      .filter((item) => {
        const parsed = this.parseDate(item.vencimento);
        if (!parsed) return false;
        const data = this.toDateOnly(parsed);
        return data <= limit && data >= start;
      })
      .reduce((total, item) => total + Number(item.valor || 0), 0);
  }

  private sumEntriesInRange(type: string, start: Date, end: Date): number {
    return this.agenda
      .filter((item) => item.tipo === type && item.situacao !== 'pago')
      .filter((item) => {
        const parsed = this.parseDate(item.vencimento);
        if (!parsed) return false;
        const data = this.toDateOnly(parsed);
        const inicio = this.toDateOnly(start);
        const fim = this.toDateOnly(end);
        return data >= inicio && data <= fim;
      })
      .reduce((total, item) => total + Number(item.valor || 0), 0);
  }

  private totalCashBalance(): number {
    return this.bankAccounts.reduce((total, account) => total + Number(account.saldo || 0), 0);
  }

  private todayISO(): string {
    return this.formatLocalISO(new Date());
  }

  private obterMesAtualISO(): string {
    const hoje = new Date();
    const year = hoje.getFullYear();
    const month = String(hoje.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  private formatarDataInput(date: string | Date | null | undefined): string {
    const parsed = this.parseDate(date);
    if (!parsed) {
      return this.todayISO();
    }
    return this.formatLocalISO(parsed);
  }

  private startOfWeek(date: Date): Date {
    const result = new Date(date);
    const day = result.getDay();
    const diff = result.getDate() - day + (day === 0 ? -6 : 1);
    result.setDate(diff);
    return result;
  }

  private parseDate(date: string | Date | null | undefined): Date | null {
    if (!date) return null;
    if (typeof date === 'string') {
      const trimmed = date.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        const [year, month, day] = trimmed.split('-').map((part) => Number(part));
        return new Date(year, month - 1, day);
      }
    }
    const parsed = new Date(date as any);
    if (isNaN(parsed.getTime())) return null;
    return parsed;
  }

  private formatLocalISO(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private toDateOnly(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private daysBetween(start: Date, end: Date): number {
    const diff = end.getTime() - start.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  private normalizeString(value: string): string {
    return (value || '').toString().trim().toLowerCase();
  }
}

