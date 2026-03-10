import { CommonModule } from '@angular/common';
import { Component, computed, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { AutocompleteComponent, AutocompleteOpcao } from '../compartilhado/autocomplete/autocomplete.component';
import { TelaPadraoComponent } from '../compartilhado/tela-padrao/tela-padrao.component';
import { ConfigAcoesCrud, EstadoAcoesCrud, TelaBaseComponent } from '../compartilhado/tela-base.component';
import { PopupMessagesComponent } from '../compartilhado/popup-messages/popup-messages.component';
import {
  faArrowTrendUp,
  faBoxArchive,
  faBoxesStacked,
  faCircleCheck,
  faCircleExclamation,
  faClipboardList,
  faDownload,
  faFilter,
  faMagnifyingGlass,
  faMoneyBillTrendUp,
  faPlus,
  faRotate,
  faSliders,
  faTriangleExclamation,
  faUser,
  faWarehouse
} from '@fortawesome/free-solid-svg-icons';
import {
  AdjustmentDirection,
  AlmoxarifadoService,
  KitComposicaoItem,
  KitVinculoMovimentacao,
  MovementType,
  StockItem,
  StockItemPayload,
  StockItemStatus,
  StockMovement
} from '../../services/almoxarifado.service';
import { PopupErrorBuilder } from '../../utils/popup-error.builder';
import { AssistanceUnitPayload, AssistanceUnitService } from '../../services/assistance-unit.service';
import { SalasService } from '../../services/salas.service';

type AlmoxTabId = 'cadastro' | 'kit' | 'itens' | 'movimentacoes' | 'dashboards';

interface ItemFilters {
  term: string;
  category: string;
  status: 'all' | StockItemStatus;
  belowMinOnly: boolean;
}

interface MovementFilters {
  startDate: string;
  endDate: string;
  type: MovementType | 'Todos';
  itemSearch: string;
  responsible: string;
}

interface ItemFormState {
  code: string;
  barcode?: string;
  description: string;
  category?: string;
  unit?: string;
  location?: string;
  locationDetail?: string;
  currentStock: number;
  minStock: number;
  unitValue: number;
  isKit: boolean;
  status: StockItemStatus;
  validity?: string;
  ignoreValidity: boolean;
  notes?: string;
}

interface MovementFormState {
  date: string;
  type: MovementType;
  itemCode: string;
  barcode: string;
  quantity: number;
  reference: string;
  responsible: string;
  notes: string;
  adjustmentDirection: AdjustmentDirection;
}

@Component({
  selector: 'app-almoxarifado',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    FontAwesomeModule,
    TelaPadraoComponent,
    PopupMessagesComponent,
    AutocompleteComponent
  ],
  templateUrl: './almoxarifado.component.html',
  styleUrl: './almoxarifado.component.scss'
})
export class AlmoxarifadoComponent extends TelaBaseComponent implements OnInit {
  readonly faBoxArchive = faBoxArchive;
  readonly faBoxesStacked = faBoxesStacked;
  readonly faTriangleExclamation = faTriangleExclamation;
  readonly faMoneyBillTrendUp = faMoneyBillTrendUp;
  readonly faArrowTrendUp = faArrowTrendUp;
  readonly faMagnifyingGlass = faMagnifyingGlass;
  readonly faFilter = faFilter;
  readonly faPlus = faPlus;
  readonly faDownload = faDownload;
  readonly faClipboardList = faClipboardList;
  readonly faRotate = faRotate;
  readonly faSliders = faSliders;
  readonly faWarehouse = faWarehouse;
  readonly faCircleCheck = faCircleCheck;
  readonly faCircleExclamation = faCircleExclamation;
  readonly faUser = faUser;

  unidadeAtual: AssistanceUnitPayload | null = null;
  categoriaTermo = '';
  unidadeMedidaTermo = '';
  localizacaoTermo = '';
  localizacaoInternaTermo = '';
  categoriasOpcoes: AutocompleteOpcao[] = [];
  unidadesMedidaOpcoes: AutocompleteOpcao[] = [];
  localizacoesOpcoes: AutocompleteOpcao[] = [];
  localizacoesInternasOpcoes: AutocompleteOpcao[] = [];
  private categoriasOpcoesBase: AutocompleteOpcao[] = [];
  private unidadesMedidaOpcoesBase: AutocompleteOpcao[] = [];
  private localizacoesOpcoesBase: AutocompleteOpcao[] = [];
  private localizacoesInternasOpcoesBase: AutocompleteOpcao[] = [];
  kitComposicao: KitComposicaoItem[] = [];
  kitComposicaoNovo: { termo: string; produtoId: string; quantidade: number } = {
    termo: '',
    produtoId: '',
    quantidade: 1
  };
  kitComposicaoErro: string | null = null;
  kitComposicaoCarregando = false;
  kitComposicaoSalvando = false;
  kitComposicaoItemId: string | null = null;

  movimentacaoKitComposicao: KitComposicaoItem[] = [];
  movimentacaoKitErro: string | null = null;
  movimentacaoKitCarregando = false;
  gerarItensKitEntrada = false;

  kitVinculos: KitVinculoMovimentacao[] = [];
  kitVinculosCarregando = false;
  kitVinculosErro: string | null = null;
  showKitVinculosModal = false;
  kitVinculosMovimentacaoSelecionada: StockMovement | null = null;

  constructor(
    private readonly almoxarifadoService: AlmoxarifadoService,
    private readonly assistanceUnitService: AssistanceUnitService,
    private readonly salasService: SalasService
  ) {
    super();
  }

  readonly tabs: { id: AlmoxTabId; label: string; description: string }[] = [
    { id: 'dashboards', label: 'Dashboards', description: 'Indicadores operacionais e visao consolidada do estoque.' },
    { id: 'cadastro', label: 'Cadastros de itens', description: 'Estruture o item com campos obrigatorios e validacoes.' },
    { id: 'kit', label: 'Composicao do kit', description: 'Defina os itens e quantidades de produtos compostos.' },
    { id: 'itens', label: 'Itens do almoxarifado', description: 'Consulte rapidamente os itens ativos e criticos.' },
    { id: 'movimentacoes', label: 'Movimentacoes', description: 'Registre e acompanhe entradas, saidas e ajustes.' }
  ];

  activeTab: AlmoxTabId = 'dashboards';

  private readonly todayIso = new Date().toISOString().substring(0, 10);

  items = signal<StockItem[]>([]);

  movements = signal<StockMovement[]>([]);

  itemFilters: ItemFilters = {
    term: '',
    category: 'all',
    status: 'all',
    belowMinOnly: false
  };

  movementFilters: MovementFilters = {
    startDate: '',
    endDate: '',
    type: 'Todos',
    itemSearch: '',
    responsible: ''
  };

  formError: string | null = null;
  movementError: string | null = null;
  successMessage: string | null = null;
  popupErros: string[] = [];
  saving = false;
  valorUnitarioMascara = '';

  itemForm: ItemFormState = this.createEmptyItemForm();
  editingItemId: string | null = null;
  editingItemCode: string | null = null;

  movementForm: MovementFormState = {
    date: this.todayIso,
    type: 'Entrada',
    itemCode: '',
    barcode: '',
    quantity: 1,
    reference: '',
    responsible: '',
    notes: '',
    adjustmentDirection: 'increase'
  };

  showMovementModal = false;
  showHistoryModal = false;
  historicoItemSelecionado: StockItem | null = null;

  readonly acoesToolbar: Required<ConfigAcoesCrud> = this.criarConfigAcoes({
    salvar: true,
    excluir: true,
    novo: true,
    cancelar: true,
    imprimir: true,
    buscar: true
  });

  ngOnInit(): void {
    this.loadItems();
    this.loadMovements();
    this.loadNextItemCode();
    this.loadUnidadeAtual();
    this.valorUnitarioMascara = this.formatarValorMonetario(this.itemForm.unitValue);
  }

  private loadItems(): void {
    this.formError = null;
    this.almoxarifadoService.listItems().subscribe({
      next: (items) => {
        this.items.set(items);
        this.atualizarOpcoesCadastro(items);
      },
      error: () => {
        this.formError = 'não foi possível carregar os itens do almoxarifado.';
        this.popupErros = [this.formError];
      }
    });
  }


  private loadNextItemCode(): void {
    if (this.editingItemId) {
      return;
    }

    this.almoxarifadoService.getNextItemCode().subscribe({
      next: (code) => {
        if (!this.editingItemId) {
          this.itemForm = { ...this.itemForm, code };
        }
      },
      error: () => {
        this.formError = this.formError || 'não foi possível gerar o próximo codigo do item.';
        if (this.formError) {
          this.popupErros = [this.formError];
        }
      }
    });
  }

  private loadMovements(): void {
    this.movementError = null;
    this.almoxarifadoService.listMovements().subscribe({
      next: (movements) => this.movements.set(movements),
      error: () => {
        this.movementError = 'Nao foi possivel carregar as movimentacoes do almoxarifado.';
      }
    });
  }

  changeTab(tabId: AlmoxTabId): void {
    this.activeTab = tabId;
    if (tabId === 'kit') {
      this.garantirComposicaoCarregada();
    }
  }

  goToNextTab(): void {
    if (this.hasNextTab) {
      this.activeTab = this.tabs[this.activeTabIndex + 1].id;
    }
  }

  goToPreviousTab(): void {
    if (this.hasPreviousTab) {
      this.activeTab = this.tabs[this.activeTabIndex - 1].id;
    }
  }

  get activeTabIndex(): number {
    return this.tabs.findIndex((tab) => tab.id === this.activeTab);
  }

  get hasNextTab(): boolean {
    return this.activeTabIndex < this.tabs.length - 1;
  }

  get hasPreviousTab(): boolean {
    return this.activeTabIndex > 0;
  }

  get nextTabLabel(): string {
    const nextTab = this.tabs[this.activeTabIndex + 1];
    return nextTab ? nextTab.label : '';
  }

  get acoesDesabilitadas(): EstadoAcoesCrud {
    const desabilitarPorAba = this.activeTab !== 'cadastro';
    return {
      salvar: this.saving || desabilitarPorAba,
      excluir: true,
      novo: this.saving,
      cancelar: this.saving,
      imprimir: this.saving,
      buscar: this.saving
    };
  }

  onSalvarToolbar(): void {
    if (this.activeTab !== 'cadastro') {
      return;
    }

    this.saveItem();
  }

  onNovoToolbar(): void {
    this.activeTab = 'cadastro';
    this.saving = false;
    this.resetItemForm();
  }

  onCancelarToolbar(): void {
    this.saving = false;
    this.resetItemForm();
  }

  onBuscarToolbar(): void {
    this.changeTab('itens');
    this.loadItems();
  }

  onExcluirToolbar(): void {
    this.popupErros = ['Ação indisponivel para itens do almoxarifado.'];
  }

  onImprimirToolbar(): void {
    const itens = this.items();
    if (!itens.length) {
      this.popupErros = ['não ha itens cadastrados para gerar o relatorio.'];
      return;
    }

    const html = this.buildRelatorioEstoqueHtml(itens, this.unidadeAtual);
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      this.popupErros = ['não foi possível abrir a janela de impressão.'];
      return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  onFecharToolbar(): void {
    window.history.back();
  }

  private buildRelatorioEstoqueHtml(itens: StockItem[], unidade: AssistanceUnitPayload | null): string {
    const logo = unidade?.logomarcaRelatorio || unidade?.logomarca || '';
    const razaoSocial = unidade?.razaoSocial || unidade?.nomeFantasia || 'Instituição';
    const nomeRelatorio = 'Relatório de Controle de Estoque';
    const cnpj = unidade?.cnpj || '';
    const enderecoLinha = [unidade?.endereco, unidade?.numeroEndereco, unidade?.complemento]
      .filter((valor) => (valor ?? '').toString().trim().length > 0)
      .join(', ');
    const bairroLinha = unidade?.bairro || '';
    const cidadeLinha = unidade?.cidade || '';
    const telefone = unidade?.telefone || '';
    const email = unidade?.email || '';
    const site = unidade?.site || '';
    const linhaEndereco = [cnpj ? `CNPJ: ${cnpj}` : '', enderecoLinha, bairroLinha, cidadeLinha]
      .filter((valor) => (valor ?? '').toString().trim().length > 0)
      .join(' | ') || 'Endereço não informado';
    const linhaContato = [
      telefone ? `Telefone: ${telefone}` : '',
      email ? `E-mail: ${email}` : '',
      site ? `Site: ${site}` : ''
    ]
      .filter((valor) => (valor ?? '').toString().trim().length > 0)
      .join(' | ');
    const dataEmissao = new Date().toLocaleDateString('pt-BR');

    const itensRows = itens
      .map((item) => {
        const validade = item.ignoreValidity || !item.validity ? 'Não informado' : item.validity;
        const valorTotal = this.formatarMoeda(item.currentStock * (Number(item.unitValue) || 0));
        return `
          <tr>
            <td>${this.escapeHtml(item.code)}</td>
            <td>${this.escapeHtml(item.description)}</td>
            <td>${this.escapeHtml(item.category || 'Não informado')}</td>
            <td>${this.escapeHtml(item.unit || 'Não informado')}</td>
            <td>${this.escapeHtml(item.location || 'Não informado')}</td>
            <td class="right">${item.currentStock}</td>
            <td class="right">${item.minStock}</td>
            <td>${this.escapeHtml(item.status)}</td>
            <td>${this.escapeHtml(validade)}</td>
            <td class="right">${valorTotal}</td>
          </tr>
        `;
      })
      .join('');

    const porCategoria = this.groupByCategoria(itens)
      .map((linha) => {
        return `
          <tr>
            <td>${this.escapeHtml(linha.nome)}</td>
            <td class="right">${linha.totalItens}</td>
            <td class="right">${linha.totalEstoque}</td>
            <td class="right">${this.formatarMoeda(linha.valorTotal)}</td>
          </tr>
        `;
      })
      .join('');

    const porLocalizacao = this.groupByLocalizacao(itens)
      .map((linha) => {
        return `
          <tr>
            <td>${this.escapeHtml(linha.nome)}</td>
            <td class="right">${linha.totalItens}</td>
            <td class="right">${linha.totalEstoque}</td>
            <td class="right">${this.formatarMoeda(linha.valorTotal)}</td>
          </tr>
        `;
      })
      .join('');

    const logoHtml = logo
      ? `<img src="${logo}" alt="Logomarca da unidade" />`
      : `<div class="logo-placeholder">Logomarca</div>`;

    return `
      <html>
        <head>
          <title>${nomeRelatorio}</title>
          <style>
            @page { size: A4; margin: 18mm; }
            * { box-sizing: border-box; }
            body { margin: 0; font-family: Arial, sans-serif; color: #0f172a; }
            .report { display: flex; flex-direction: column; gap: 16px; }
            header.report-header { display: grid; grid-template-columns: 120px 1fr; gap: 16px; align-items: center; }
            header.report-header img { width: 120px; height: auto; object-fit: contain; }
            .logo-placeholder { width: 120px; height: 80px; border: 1px dashed #94a3b8; display: flex; align-items: center; justify-content: center; color: #64748b; font-size: 12px; }
            .report-title { font-size: 20px; font-weight: 700; margin: 4px 0; }
            .report-subtitle { font-size: 12px; color: #475569; margin: 0; }
            .meta { display: flex; gap: 16px; flex-wrap: wrap; font-size: 12px; color: #475569; }
            section { border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; }
            h2 { font-size: 14px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.04em; color: #0f766e; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: left; vertical-align: top; }
            th { background: #f1f5f9; font-weight: 700; }
            td.right, th.right { text-align: right; }
            footer.report-footer { font-size: 11px; color: #475569; border-top: 1px solid #e2e8f0; padding-top: 8px; }
          </style>
        </head>
        <body>
          <div class="report">
            <header class="report-header">
              ${logoHtml}
              <div>
                <div class="report-title">${this.escapeHtml(razaoSocial)}</div>
                <p class="report-subtitle">${nomeRelatorio}</p>
                <div class="meta">
                  <span>CNPJ: ${this.escapeHtml(cnpj)}</span>
                  <span>Emissao: ${this.escapeHtml(dataEmissao)}</span>
                </div>
              </div>
            </header>

            <section>
              <h2>Itens em estoque</h2>
              <table>
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Descrição</th>
                    <th>Categoria</th>
                    <th>Unidade</th>
                    <th>Localizacao</th>
                    <th class="right">Estoque</th>
                    <th class="right">Minimo</th>
                    <th>Situação</th>
                    <th>Validade</th>
                    <th class="right">Valor total</th>
                  </tr>
                </thead>
                <tbody>${itensRows}</tbody>
              </table>
            </section>

            <section>
              <h2>Resumo por categoria</h2>
              <table>
                <thead>
                  <tr>
                    <th>Categoria</th>
                    <th class="right">Itens</th>
                    <th class="right">Estoque</th>
                    <th class="right">Valor total</th>
                  </tr>
                </thead>
                <tbody>${porCategoria}</tbody>
              </table>
            </section>

            <section>
              <h2>Resumo por localizacao</h2>
              <table>
                <thead>
                  <tr>
                    <th>Localizacao</th>
                    <th class="right">Itens</th>
                    <th class="right">Estoque</th>
                    <th class="right">Valor total</th>
                  </tr>
                </thead>
                <tbody>${porLocalizacao}</tbody>
              </table>
            </section>

            <footer class="report-footer">
              <div>${this.escapeHtml(razaoSocial)}</div>
              <div>${this.escapeHtml(linhaEndereco)}</div>
              <div>${this.escapeHtml(linhaContato)}</div>
            </footer>
          </div>
        </body>
      </html>
    `;
  }

  private groupByCategoria(
    itens: StockItem[]
  ): Array<{ nome: string; totalItens: number; totalEstoque: number; valorTotal: number }> {
    const mapa = new Map<string, { totalItens: number; totalEstoque: number; valorTotal: number }>();
    itens.forEach((item) => {
      const chave = (item.category || 'Sem categoria').trim() || 'Sem categoria';
      const registro = mapa.get(chave) || { totalItens: 0, totalEstoque: 0, valorTotal: 0 };
      registro.totalItens += 1;
      registro.totalEstoque += item.currentStock;
      registro.valorTotal += item.currentStock * (Number(item.unitValue) || 0);
      mapa.set(chave, registro);
    });
    return Array.from(mapa.entries()).map(([nome, valores]) => ({ nome, ...valores }));
  }

  private groupByLocalizacao(
    itens: StockItem[]
  ): Array<{ nome: string; totalItens: number; totalEstoque: number; valorTotal: number }> {
    const mapa = new Map<string, { totalItens: number; totalEstoque: number; valorTotal: number }>();
    itens.forEach((item) => {
      const chave = (item.location || 'Sem localizacao').trim() || 'Sem localizacao';
      const registro = mapa.get(chave) || { totalItens: 0, totalEstoque: 0, valorTotal: 0 };
      registro.totalItens += 1;
      registro.totalEstoque += item.currentStock;
      registro.valorTotal += item.currentStock * (Number(item.unitValue) || 0);
      mapa.set(chave, registro);
    });
    return Array.from(mapa.entries()).map(([nome, valores]) => ({ nome, ...valores }));
  }

  formatarMoeda(valor: number): string {
    const numero = Number.isFinite(valor) ? valor : 0;
    return numero.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  private escapeHtml(texto: string): string {
    return String(texto)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  readonly indicatorTotals = computed(() => {
    const allItems = this.items();
    const belowMin = allItems.filter((item) => item.currentStock < item.minStock).length;
    const totalValue = allItems.reduce(
      (sum, item) => sum + item.currentStock * (Number(item.unitValue) || 0),
      0
    );
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentMovements = this.movements().filter((movement) =>
      new Date(movement.date) >= thirtyDaysAgo
    ).length;

    return {
      totalItems: allItems.length,
      belowMin,
      totalValue,
      recentMovements
    };
  });

  get categories(): string[] {
    const raw = this.items().map((item) => item.category).filter(Boolean) as string[];
    const unique = Array.from(new Set(raw));
    return unique.sort();
  }

  get filteredItems(): StockItem[] {
    const term = this.itemFilters.term.toLowerCase();
    return this.items().filter((item) => {
      const matchesTerm =
        !term || item.description.toLowerCase().includes(term) || item.code.toLowerCase().includes(term);
      const matchesCategory =
        this.itemFilters.category === 'all' || item.category === this.itemFilters.category;
      const matchesStatus =
        this.itemFilters.status === 'all' || item.status === this.itemFilters.status;
      const matchesMin = !this.itemFilters.belowMinOnly || item.currentStock < item.minStock;
      return matchesTerm && matchesCategory && matchesStatus && matchesMin;
    });
  }

  private loadUnidadeAtual(): void {
    this.assistanceUnitService.get().subscribe({
      next: ({ unidade }) => {
        this.unidadeAtual = unidade ?? null;
        this.carregarSalas(unidade?.id);
      },
      error: () => {
        this.unidadeAtual = null;
        this.carregarSalas(undefined);
      }
    });
  }

  get alertaVencimentoPorItem(): Map<string, 'vencido' | 'vencendo'> {
    const hoje = new Date();
    const limite = new Date();
    limite.setDate(limite.getDate() + 30);
    const alertas = new Map<string, 'vencido' | 'vencendo'>();

    this.items().forEach((item) => {
      if (item.ignoreValidity || !item.validity) {
        return;
      }
      const dataValidade = new Date(item.validity);
      if (Number.isNaN(dataValidade.getTime())) {
        return;
      }
      if (dataValidade < hoje) {
        alertas.set(item.id, 'vencido');
      } else if (dataValidade <= limite) {
        alertas.set(item.id, 'vencendo');
      }
    });

    return alertas;
  }

  get filteredMovements(): StockMovement[] {
    return this.movements().filter((movement) => {
      if (this.movementFilters.type !== 'Todos' && movement.type !== this.movementFilters.type) {
        return false;
      }

      if (this.movementFilters.startDate && movement.date < this.movementFilters.startDate) {
        return false;
      }

      if (this.movementFilters.endDate && movement.date > this.movementFilters.endDate) {
        return false;
      }

      if (
        this.movementFilters.itemSearch &&
        !(`${movement.itemCode} ${movement.itemDescription}`
          .toLowerCase()
          .includes(this.movementFilters.itemSearch.toLowerCase()))
      ) {
        return false;
      }

      if (
        this.movementFilters.responsible &&
        !(movement.responsible ?? '').toLowerCase().includes(this.movementFilters.responsible.toLowerCase())
      ) {
        return false;
      }

      return true;
    });
  }

  editItem(item: StockItem): void {
    this.itemForm = {
      code: item.code,
      barcode: item.barcode ?? '',
      description: item.description,
      category: item.category ?? '',
      unit: item.unit ?? '',
      location: item.location ?? '',
      locationDetail: item.locationDetail ?? '',
      currentStock: item.currentStock,
      minStock: item.minStock,
      unitValue: item.unitValue,
      isKit: item.isKit ?? false,
      status: item.status,
      validity: item.validity ?? '',
      ignoreValidity: item.ignoreValidity ?? false,
      notes: item.notes ?? ''
    };
    this.categoriaTermo = this.itemForm.category ?? '';
    this.unidadeMedidaTermo = this.itemForm.unit ?? '';
    this.localizacaoTermo = this.itemForm.location ?? '';
    this.localizacaoInternaTermo = this.itemForm.locationDetail ?? '';
    this.categoriasOpcoes = this.filtrarOpcoes(this.categoriasOpcoesBase, this.categoriaTermo);
    this.unidadesMedidaOpcoes = this.filtrarOpcoes(
      this.unidadesMedidaOpcoesBase,
      this.unidadeMedidaTermo
    );
    this.localizacoesOpcoes = this.filtrarOpcoes(this.localizacoesOpcoesBase, this.localizacaoTermo);
    this.localizacoesInternasOpcoes = this.filtrarOpcoes(
      this.localizacoesInternasOpcoesBase,
      this.localizacaoInternaTermo
    );
    this.editingItemId = item.id;
    this.editingItemCode = item.code;
    this.formError = null;
    this.successMessage = null;
    this.activeTab = 'cadastro';
    this.valorUnitarioMascara = this.formatarValorMonetario(item.unitValue);
    this.resetarKitComposicaoSeNecessario();
    if (this.itemForm.isKit) {
      this.carregarComposicaoKit(item.id);
    }
  }

  resetItemForm(): void {
    this.itemForm = this.createEmptyItemForm();
    this.editingItemId = null;
    this.editingItemCode = null;
    this.formError = null;
    this.successMessage = null;
    this.popupErros = [];
    this.valorUnitarioMascara = this.formatarValorMonetario(this.itemForm.unitValue);
    this.categoriaTermo = '';
    this.unidadeMedidaTermo = '';
    this.localizacaoTermo = '';
    this.localizacaoInternaTermo = '';
    this.categoriasOpcoes = [...this.categoriasOpcoesBase];
    this.unidadesMedidaOpcoes = [...this.unidadesMedidaOpcoesBase];
    this.localizacoesOpcoes = [...this.localizacoesOpcoesBase];
    this.localizacoesInternasOpcoes = [...this.localizacoesInternasOpcoesBase];
    this.kitComposicao = [];
    this.kitComposicaoNovo = { termo: '', produtoId: '', quantidade: 1 };
    this.kitComposicaoErro = null;
    this.kitComposicaoItemId = null;
    this.loadNextItemCode();
  }

  saveItem(): void {
    const validationErrors = this.validateItemForm();

    const erroDuplicidade = this.validarDuplicidadeLocal();
    if (erroDuplicidade) {
      validationErrors.push(erroDuplicidade);
    }

    if (validationErrors.length) {
      const builder = new PopupErrorBuilder();
      validationErrors.forEach((message) => builder.adicionar(message));
      this.popupErros = builder.build();
      this.formError = validationErrors.join(' | ');
      return;
    }

    this.popupErros = [];
    this.formError = null;
    this.saving = true;
    const formData: StockItemPayload = {
      code: this.itemForm.code,
      barcode: this.itemForm.barcode ?? undefined,
      description: this.itemForm.description,
      category: this.itemForm.category ?? '',
      unit: this.itemForm.unit ?? '',
      location: this.itemForm.location || undefined,
      locationDetail: this.itemForm.locationDetail || undefined,
      currentStock: Number(this.itemForm.currentStock) || 0,
      minStock: Number(this.itemForm.minStock),
      unitValue: Number(this.itemForm.unitValue) || 0,
      isKit: this.itemForm.isKit,
      status: this.itemForm.status,
      validity: this.itemForm.validity || undefined,
      ignoreValidity: this.itemForm.ignoreValidity,
      notes: this.itemForm.notes || undefined
    };

    const request$ = this.editingItemId
      ? this.almoxarifadoService.updateItem(this.editingItemId, formData)
      : this.almoxarifadoService.createItem(formData);

    request$.subscribe({
      next: (item) => {
        const updatedItems = this.editingItemId
          ? this.items().map((existing) => (existing.id === item.id ? item : existing))
          : [item, ...this.items()];

        this.items.set(updatedItems);
        this.atualizarOpcoesCadastro(updatedItems);
        this.successMessage = this.editingItemId
          ? 'Item atualizado com sucesso e pronto para novas movimentacoes.'
          : 'Item cadastrado com sucesso no almoxarifado.';
        this.saving = false;
        if (this.itemForm.isKit) {
          this.editingItemId = item.id;
          this.editingItemCode = item.code;
          this.itemForm = {
            code: item.code,
            barcode: item.barcode ?? '',
            description: item.description,
            category: item.category ?? '',
            unit: item.unit ?? '',
            location: item.location ?? '',
            locationDetail: item.locationDetail ?? '',
            currentStock: item.currentStock,
            minStock: item.minStock,
            unitValue: item.unitValue,
            isKit: item.isKit ?? true,
            status: item.status,
            validity: item.validity ?? '',
            ignoreValidity: item.ignoreValidity ?? false,
            notes: item.notes ?? ''
          };
          this.activeTab = 'kit';
          this.carregarComposicaoKit(item.id);
        } else {
          this.resetItemForm();
        }
      },
      error: (error) => {
        this.formError = error?.error?.message || 'N?o foi poss?vel salvar o item de estoque.';
        this.popupErros = this.formError ? [this.formError] : [];
        this.saving = false;
      }
    });
  }

  openMovementModal(item?: StockItem): void {
    this.movementError = null;
    this.movementForm = {
      date: this.todayIso,
      type: 'Entrada',
      itemCode: item?.code ?? '',
      barcode: item?.barcode ?? '',
      quantity: 1,
      reference: '',
      responsible: '',
      notes: '',
      adjustmentDirection: 'increase'
    };
    this.gerarItensKitEntrada = false;
    this.movimentacaoKitComposicao = [];
    this.movimentacaoKitErro = null;
    this.movimentacaoKitCarregando = false;
    if (item?.code) {
      this.atualizarKitMovimentacaoPorItem(item.code);
    }
    this.showMovementModal = true;
  }

  onCodigoBarrasCadastroInput(valor: string): void {
    const codigoBarras = valor?.trim() ?? '';
    this.itemForm = { ...this.itemForm, barcode: codigoBarras };
    if (!codigoBarras) {
      return;
    }

    const itemEncontrado = this.items().find(
      (item) => (item.barcode ?? '').toLowerCase() === codigoBarras.toLowerCase()
    );
    if (itemEncontrado) {
      this.editItem(itemEncontrado);
    }
  }

  onCodigoBarrasMovimentacaoInput(valor: string): void {
    const codigoBarras = valor?.trim() ?? '';
    this.movementForm = { ...this.movementForm, barcode: codigoBarras };
    if (!codigoBarras) {
      return;
    }

    const itemEncontrado = this.items().find(
      (item) => (item.barcode ?? '').toLowerCase() === codigoBarras.toLowerCase()
    );
    if (itemEncontrado) {
      this.movementForm = { ...this.movementForm, itemCode: itemEncontrado.code };
      this.atualizarKitMovimentacaoPorItem(itemEncontrado.code);
    }
  }

  onValorUnitarioInput(valor: string): void {
    const apenasNumeros = (valor ?? '').replace(/\D/g, '');
    const numero = Number(apenasNumeros || 0) / 100;
    this.itemForm = { ...this.itemForm, unitValue: numero };
    this.valorUnitarioMascara = this.formatarValorMonetario(numero);
  }

  abrirEntradaProdutos(): void {
    this.openMovementModal();
  }

  atualizarTermoCategoria(termo: string): void {
    this.categoriaTermo = termo;
    this.itemForm = { ...this.itemForm, category: termo };
    this.categoriasOpcoes = this.filtrarOpcoes(this.categoriasOpcoesBase, termo);
  }

  selecionarCategoria(opcao: AutocompleteOpcao): void {
    this.categoriaTermo = opcao.label;
    this.itemForm = { ...this.itemForm, category: opcao.label };
  }

  atualizarTermoUnidadeMedida(termo: string): void {
    this.unidadeMedidaTermo = termo;
    this.itemForm = { ...this.itemForm, unit: termo };
    this.unidadesMedidaOpcoes = this.filtrarOpcoes(this.unidadesMedidaOpcoesBase, termo);
  }

  selecionarUnidadeMedida(opcao: AutocompleteOpcao): void {
    this.unidadeMedidaTermo = opcao.label;
    this.itemForm = { ...this.itemForm, unit: opcao.label };
  }

  atualizarTermoLocalizacao(termo: string): void {
    this.localizacaoTermo = termo;
    this.itemForm = { ...this.itemForm, location: termo };
    this.localizacoesOpcoes = this.filtrarOpcoes(this.localizacoesOpcoesBase, termo);
  }

  selecionarLocalizacao(opcao: AutocompleteOpcao): void {
    this.localizacaoTermo = opcao.label;
    this.itemForm = { ...this.itemForm, location: opcao.label };
  }

  atualizarTermoLocalizacaoInterna(termo: string): void {
    this.localizacaoInternaTermo = termo;
    this.itemForm = { ...this.itemForm, locationDetail: termo };
    this.localizacoesInternasOpcoes = this.filtrarOpcoes(
      this.localizacoesInternasOpcoesBase,
      termo
    );
  }

  selecionarLocalizacaoInterna(opcao: AutocompleteOpcao): void {
    this.localizacaoInternaTermo = opcao.label;
    this.itemForm = { ...this.itemForm, locationDetail: opcao.label };
  }

  onIgnorarValidadeChange(valor: boolean): void {
    if (valor) {
      this.itemForm = { ...this.itemForm, ignoreValidity: true, validity: '' };
      return;
    }
    this.itemForm = { ...this.itemForm, ignoreValidity: false };
  }

  private formatarValorMonetario(valor: number): string {
    const numero = Number.isFinite(valor) ? valor : 0;
    return numero.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  private carregarSalas(unidadeId?: number): void {
    if (!unidadeId) {
      this.localizacoesOpcoesBase = [];
      this.localizacoesOpcoes = [];
      return;
    }
    this.salasService.list(unidadeId).subscribe({
      next: (salas) => {
        this.localizacoesOpcoesBase = salas.map((sala) => ({ id: sala.id, label: sala.nome }));
        this.localizacoesOpcoes = this.filtrarOpcoes(this.localizacoesOpcoesBase, this.localizacaoTermo);
      },
      error: () => {
        this.localizacoesOpcoesBase = [];
        this.localizacoesOpcoes = [];
      }
    });
  }

  private atualizarOpcoesCadastro(itens: StockItem[]): void {
    const categorias = new Set<string>();
    const unidades = new Set<string>();
    const locaisInternos = new Set<string>();
    itens.forEach((item) => {
      if (item.category) {
        categorias.add(item.category);
      }
      if (item.unit) {
        unidades.add(item.unit);
      }
      if (item.locationDetail) {
        locaisInternos.add(item.locationDetail);
      }
    });
    this.categoriasOpcoesBase = Array.from(categorias)
      .sort((a, b) => a.localeCompare(b))
      .map((item) => ({ id: item, label: item }));
    this.unidadesMedidaOpcoesBase = Array.from(unidades)
      .sort((a, b) => a.localeCompare(b))
      .map((item) => ({ id: item, label: item }));
    this.localizacoesInternasOpcoesBase = Array.from(locaisInternos)
      .sort((a, b) => a.localeCompare(b))
      .map((item) => ({ id: item, label: item }));

    this.categoriasOpcoes = this.filtrarOpcoes(this.categoriasOpcoesBase, this.categoriaTermo);
    this.unidadesMedidaOpcoes = this.filtrarOpcoes(
      this.unidadesMedidaOpcoesBase,
      this.unidadeMedidaTermo
    );
    this.localizacoesInternasOpcoes = this.filtrarOpcoes(
      this.localizacoesInternasOpcoesBase,
      this.localizacaoInternaTermo
    );
  }

  private filtrarOpcoes(opcoes: AutocompleteOpcao[], termo: string): AutocompleteOpcao[] {
    const filtrado = this.normalizarTermoFiltro(termo);
    if (!filtrado) {
      return opcoes;
    }
    return opcoes.filter((opcao) =>
      this.normalizarTermoFiltro(opcao.label).includes(filtrado)
    );
  }

  private normalizarTermoFiltro(valor: string): string {
    return (valor || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  openHistoryModal(item: StockItem): void {
    this.historicoItemSelecionado = item;
    this.showHistoryModal = true;
  }

  closeHistoryModal(): void {
    this.showHistoryModal = false;
    this.historicoItemSelecionado = null;
  }

  get historicoMovimentacoes(): StockMovement[] {
    if (!this.historicoItemSelecionado) {
      return [];
    }
    return this.movements().filter((movement) => movement.itemCode === this.historicoItemSelecionado?.code);
  }

  saveMovement(): void {
    this.movementError = null;
    const { date, type, itemCode, quantity, reference, responsible, notes, adjustmentDirection } =
      this.movementForm;

    if (!type || !itemCode || !quantity || quantity <= 0) {
      this.movementError = 'Preencha os campos obrigatorios e informe uma quantidade valida.';
      return;
    }

    if (type === 'Ajuste') {
      const adjustNegative = adjustmentDirection === 'decrease';

      const message = adjustNegative
        ? 'Confirma reduzir o estoque deste item? Este ajuste e permanente.'
        : 'Confirma aumentar o estoque deste item com este ajuste?';

      const confirmed = window.confirm(message);
      if (!confirmed) {
        return;
      }
    }

    this.almoxarifadoService
      .registerMovement({
        date,
        type,
        itemCode,
        quantity,
        reference,
        responsible,
        notes: notes || undefined,
        adjustmentDirection,
        gerarItensKit: type === 'Entrada' && this.movimentacaoSelecionadaEhKit ? this.gerarItensKitEntrada : undefined
      })
      .subscribe({
        next: ({ movement, item }) => {
          this.movements.set([movement, ...this.movements()]);
          this.items.set(this.items().map((existing) => (existing.id === item.id ? item : existing)));
          this.showMovementModal = false;
        },
        error: (error) => {
          this.movementError = error?.error?.message || 'Nao foi possivel registrar a movimentacao.';
        }
      });
  }

  private validateItemForm(): string[] {
    const errors: string[] = [];
    const requiredFields: Array<keyof ItemFormState> = [
      'code',
      'description',
      'category',
      'unit',
      'minStock'
    ];

    requiredFields.forEach((field) => {
      const value = this.itemForm[field];
      const isEmpty = value === '' || value === null || value === undefined;
      if (isEmpty || (typeof value === 'string' && !value.trim())) {
        errors.push('Campo obrigatorio nao preenchido: ' + this.translateFieldLabel(field));
      }
    });

    if (this.itemForm.minStock < 0) {
      errors.push('O estoque minimo deve ser maior ou igual a zero.');
    }

    if (this.itemForm.currentStock < 0) {
      errors.push('O estoque atual nao pode ser negativo.');
    }

    return errors;
  }

  private validarDuplicidadeLocal(): string | null {
    const descricao = this.normalizarTexto(this.itemForm.description);
    const categoria = this.normalizarTexto(this.itemForm.category);
    const unidade = this.normalizarTexto(this.itemForm.unit);
    const localizacao = this.normalizarTexto(this.itemForm.location);
    const localizacaoInterna = this.normalizarTexto(this.itemForm.locationDetail);

    const duplicado = this.items().find((item) => {
      if (this.editingItemId && item.id === this.editingItemId) {
        return false;
      }
      return (
        this.normalizarTexto(item.description) === descricao &&
        this.normalizarTexto(item.category) === categoria &&
        this.normalizarTexto(item.unit) === unidade &&
        this.normalizarTexto(item.location) === localizacao &&
        this.normalizarTexto(item.locationDetail) === localizacaoInterna
      );
    });

    if (duplicado) {
      return 'Item ja cadastrado com a mesma descricao, categoria, unidade e localizacao.';
    }
    return null;
  }

  private normalizarTexto(valor?: string | null): string {
    if (!valor) {
      return '';
    }
    return valor.trim().toLowerCase();
  }

  private translateFieldLabel(field: keyof ItemFormState): string {
    const map: Record<keyof ItemFormState, string> = {
      code: 'Codigo',
      barcode: 'Codigo de barras',
      description: 'Descricao',
      category: 'Categoria',
      unit: 'Unidade de medida',
      location: 'Localizacao',
      locationDetail: 'Localizacao interna',
      currentStock: 'Estoque atual',
      minStock: 'Estoque minimo',
      unitValue: 'Valor unitario',
      isKit: 'Produto composto',
      status: 'Situacao',
      validity: 'Validade',
      ignoreValidity: 'Ignorar validade',
      notes: 'Observacoes'
    };

    return map[field];
  }

  private createEmptyItemForm(): ItemFormState {
    return {
      code: '',
      barcode: '',
      description: '',
      category: '',
      unit: '',
      location: '',
      locationDetail: '',
      currentStock: 0,
      minStock: 0,
      unitValue: 0,
      isKit: false,
      status: 'Ativo',
      validity: '',
      ignoreValidity: false,
      notes: ''
    };
  }

  onIsKitChange(valor: boolean): void {
    this.itemForm = { ...this.itemForm, isKit: valor };
    if (!valor) {
      this.resetarKitComposicaoSeNecessario();
      return;
    }
    if (this.editingItemId) {
      this.carregarComposicaoKit(this.editingItemId);
    }
  }

  private resetarKitComposicaoSeNecessario(): void {
    this.kitComposicao = [];
    this.kitComposicaoNovo = { termo: '', produtoId: '', quantidade: 1 };
    this.kitComposicaoErro = null;
    this.kitComposicaoItemId = null;
  }

  get opcoesProdutosKit(): AutocompleteOpcao[] {
    return this.items()
      .filter((item) => item.id !== this.editingItemId)
      .map((item) => ({
        id: item.id,
        label: `${item.code} - ${item.description}`,
        sublabel: item.unit || ''
      }));
  }

  onKitTermoChange(termo: string): void {
    this.kitComposicaoNovo = { ...this.kitComposicaoNovo, termo };
    if (!termo) {
      this.kitComposicaoNovo = { ...this.kitComposicaoNovo, produtoId: '' };
    }
  }

  onKitSelecionado(opcao: AutocompleteOpcao): void {
    this.kitComposicaoNovo = {
      ...this.kitComposicaoNovo,
      termo: opcao.label,
      produtoId: String(opcao.id)
    };
  }

  adicionarItemComposicao(): void {
    this.kitComposicaoErro = null;
    if (!this.editingItemId) {
      this.kitComposicaoErro = 'Salve o produto antes de definir a composicao do kit.';
      return;
    }
    if (!this.kitComposicaoNovo.produtoId) {
      this.kitComposicaoErro = 'Selecione o item da composicao.';
      return;
    }
    if (!this.kitComposicaoNovo.quantidade || this.kitComposicaoNovo.quantidade <= 0) {
      this.kitComposicaoErro = 'Informe uma quantidade maior que zero.';
      return;
    }
    if (this.kitComposicao.some((item) => item.produtoItemId === this.kitComposicaoNovo.produtoId)) {
      this.kitComposicaoErro = 'Item ja adicionado na composicao.';
      return;
    }
    if (this.kitComposicaoNovo.produtoId === this.editingItemId) {
      this.kitComposicaoErro = 'Nao e permitido adicionar o proprio kit na composicao.';
      return;
    }
    const itemSelecionado = this.items().find((item) => item.id === this.kitComposicaoNovo.produtoId);
    this.kitComposicao = [
      ...this.kitComposicao,
      {
        produtoItemId: this.kitComposicaoNovo.produtoId,
        produtoItemCodigo: itemSelecionado?.code,
        produtoItemDescricao: itemSelecionado?.description,
        quantidadeItem: this.kitComposicaoNovo.quantidade
      }
    ];
    this.kitComposicaoNovo = { termo: '', produtoId: '', quantidade: 1 };
  }

  removerItemComposicao(item: KitComposicaoItem): void {
    this.kitComposicao = this.kitComposicao.filter((registro) => registro !== item);
  }

  salvarComposicaoKit(): void {
    this.kitComposicaoErro = null;
    if (!this.editingItemId) {
      this.kitComposicaoErro = 'Salve o produto antes de definir a composicao do kit.';
      return;
    }
    if (!this.itemForm.isKit) {
      this.kitComposicaoErro = 'Marque o produto como kit para salvar a composicao.';
      return;
    }
    if (!this.kitComposicao.length) {
      this.kitComposicaoErro = 'Informe ao menos um item na composicao do kit.';
      return;
    }
    this.kitComposicaoSalvando = true;
    this.almoxarifadoService.salvarKitComposicao(this.editingItemId, this.kitComposicao).subscribe({
      next: (itens) => {
        this.kitComposicao = itens;
        this.kitComposicaoSalvando = false;
        this.kitComposicaoErro = null;
      },
      error: (error) => {
        this.kitComposicaoErro = error?.error?.message || 'Nao foi possivel salvar a composicao do kit.';
        this.kitComposicaoSalvando = false;
      }
    });
  }

  private garantirComposicaoCarregada(): void {
    if (!this.itemForm.isKit || !this.editingItemId) {
      return;
    }
    if (this.kitComposicaoItemId === this.editingItemId) {
      return;
    }
    this.carregarComposicaoKit(this.editingItemId);
  }

  private carregarComposicaoKit(itemId: string): void {
    this.kitComposicaoCarregando = true;
    this.kitComposicaoErro = null;
    this.almoxarifadoService.getKitComposicao(itemId).subscribe({
      next: (itens) => {
        this.kitComposicao = itens;
        this.kitComposicaoCarregando = false;
        this.kitComposicaoItemId = itemId;
      },
      error: (error) => {
        this.kitComposicaoErro = error?.error?.message || 'Nao foi possivel carregar a composicao do kit.';
        this.kitComposicaoCarregando = false;
      }
    });
  }

  onMovimentacaoItemChange(codigo: string): void {
    this.movementForm = { ...this.movementForm, itemCode: codigo };
    this.atualizarKitMovimentacaoPorItem(codigo);
  }

  private atualizarKitMovimentacaoPorItem(codigo: string): void {
    const itemSelecionado = this.items().find((item) => item.code === codigo);
    if (!itemSelecionado || !itemSelecionado.isKit) {
      this.movimentacaoKitComposicao = [];
      this.movimentacaoKitErro = null;
      this.movimentacaoKitCarregando = false;
      return;
    }
    this.movimentacaoKitCarregando = true;
    this.movimentacaoKitErro = null;
    this.almoxarifadoService.getKitComposicao(itemSelecionado.id).subscribe({
      next: (itens) => {
        this.movimentacaoKitComposicao = itens;
        this.movimentacaoKitCarregando = false;
      },
      error: (error) => {
        this.movimentacaoKitErro = error?.error?.message || 'Nao foi possivel carregar a composicao do kit.';
        this.movimentacaoKitCarregando = false;
      }
    });
  }

  get movimentacaoSelecionadaEhKit(): boolean {
    const itemSelecionado = this.items().find((item) => item.code === this.movementForm.itemCode);
    return !!itemSelecionado?.isKit;
  }

  calcularQuantidadeKit(quantidadeItem: number): number {
    return (Number(quantidadeItem) || 0) * (Number(this.movementForm.quantity) || 0);
  }

  abrirVinculosKit(movement: StockMovement): void {
    this.kitVinculosMovimentacaoSelecionada = movement;
    this.kitVinculos = [];
    this.kitVinculosErro = null;
    this.showKitVinculosModal = true;
    this.kitVinculosCarregando = true;
    this.almoxarifadoService.listarMovimentacaoKitVinculos(movement.id).subscribe({
      next: (itens) => {
        this.kitVinculos = itens;
        this.kitVinculosCarregando = false;
      },
      error: (error) => {
        this.kitVinculosErro = error?.error?.message || 'Nao foi possivel carregar os itens do kit.';
        this.kitVinculosCarregando = false;
      }
    });
  }

  fecharVinculosKit(): void {
    this.showKitVinculosModal = false;
    this.kitVinculosMovimentacaoSelecionada = null;
  }

  get movimentosComKit(): Record<string, boolean> {
    const mapa: Record<string, boolean> = {};
    this.movements().forEach((movement) => {
      const item = this.items().find((registro) => registro.code === movement.itemCode);
      mapa[movement.id] = !!item?.isKit;
    });
    return mapa;
  }
}







