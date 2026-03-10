import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faArrowDown,
  faArrowUp,
  faBuilding,
  faCloudArrowUp,
  faDownload,
  faFileInvoice,
  faFloppyDisk,
  faLandmark,
  faMagnifyingGlass,
  faPrint,
  faQrcode,
  faTags,
  faTools,
  faTrash,
  faTruck
} from '@fortawesome/free-solid-svg-icons';
import { Patrimonio, PatrimonioService } from '../../services/patrimonio.service';
import { AssistanceUnitPayload, AssistanceUnitService } from '../../services/assistance-unit.service';
import { AutocompleteComponent, AutocompleteOpcao } from '../compartilhado/autocomplete/autocomplete.component';
import { ProfessionalRecord, ProfessionalService } from '../../services/professional.service';
import { SalaRecord, SalasService } from '../../services/salas.service';
import { finalize, timeout } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { TextTemplateService, TextTemplates } from '../../services/text-template.service';

import { TelaPadraoComponent } from '../compartilhado/tela-padrao/tela-padrao.component';
import { ConfigAcoesCrud, EstadoAcoesCrud } from '../compartilhado/tela-base.component';
type AssetTabId = 'dados' | 'visual' | 'localizacao' | 'dashboard' | 'listagem' | 'movimentacao';

type AssetFormTextField =
  | 'patrimonyNumber'
  | 'name'
  | 'category'
  | 'subcategory'
  | 'description'
  | 'individualNumbers'
  | 'acquisitionDate'
  | 'origin'
  | 'invoiceNumber'
  | 'supplier'
  | 'unit'
  | 'room'
  | 'address'
  | 'responsibleName'
  | 'responsibleContact'
  | 'internalCode'
  | 'observations'
  | 'warranty'
  | 'manualUrl'
  | 'lastMovement'
  | 'lastResponsible'
  | 'lastMaintenance';

interface AssetForm {
  patrimonyNumber: string;
  name: string;
  category: string;
  subcategory: string;
  description: string;
  conservation: string;
  status: string;
  quantity: number;
  individualNumbers: string;
  acquisitionDate: string;
  acquisitionValue: number;
  origin: string;
  invoiceNumber: string;
  supplier: string;
  usefulLife: number;
  depreciationStartDate: string;
  depreciationRate: number;
  unit: string;
  room: string;
  address: string;
  responsibleName: string;
  responsibleContact: string;
  internalCode: string;
  observations: string;
  warranty: string;
  manualUrl: string;
  lastMovement: string;
  lastResponsible: string;
  lastMaintenance: string;
}

@Component({
  selector: 'app-patrimonio',
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule, TelaPadraoComponent, AutocompleteComponent],
  templateUrl: './patrimonio.component.html',
  styleUrl: './patrimonio.component.scss'
})
export class PatrimonioComponent implements OnInit, OnDestroy {
  readonly faArrowDown = faArrowDown;
  readonly faArrowUp = faArrowUp;
  readonly faDownload = faDownload;
  readonly faFileInvoice = faFileInvoice;
  readonly faFloppyDisk = faFloppyDisk;
  readonly faMagnifyingGlass = faMagnifyingGlass;
  readonly faPrint = faPrint;
  readonly faQrcode = faQrcode;
  readonly faTools = faTools;
  readonly faTruck = faTruck;
  readonly faTags = faTags;
  readonly faBuilding = faBuilding;
  readonly faCloudArrowUp = faCloudArrowUp;
  readonly faTrash = faTrash;
  readonly faLandmark = faLandmark;

  readonly acoesToolbar: Required<ConfigAcoesCrud> = {
    buscar: true,
    novo: true,
    salvar: true,
    cancelar: true,
    excluir: false,
    imprimir: true
  };

  assetTabs: { id: AssetTabId; label: string; description: string }[] = [
    {
      id: 'dados',
      label: 'Dados gerais',
      description: 'Campos obrigatórios para identificação e classificação do bem.'
    },
    {
      id: 'visual',
      label: 'Identificação visual',
      description: 'Foto, etiqueta e observações gerais para rastreabilidade.'
    },
    {
      id: 'localizacao',
      label: 'Localização e responsável',
      description: 'Unidade, ambiente e responsável direto pelo patrimônio.'
    },
    {
      id: 'dashboard',
      label: 'Dashboard',
      description: 'Indicadores de uso, depreciação e status dos bens.'
    },
    {
      id: 'movimentacao',
      label: 'Movimentação',
      description: 'Registro de movimentações e baixas do patrimônio.'
    },
    {
      id: 'listagem',
      label: 'Listagem',
      description: 'Tabela geral de bens, filtros e impressão.'
    }
  ];

  activeAssetTab: AssetTabId = 'dados';
  conservationOptions = ['Novo', 'Bom', 'Regular', 'Ruim', 'Inservível'];
  statusOptions = ['Ativo', 'Em manutenção', 'Em empréstimo', 'Baixado / Inativo'];
  origins = ['Compra', 'Doação', 'Convênio', 'Transferência'];
  categories = [
    { label: 'Móveis', subcategories: ['Mesa', 'Cadeira', 'Armário', 'Estante'] },
    { label: 'Eletrodomésticos', subcategories: ['Geladeira', 'Micro-ondas', 'Bebedouro'] },
    { label: 'Informática', subcategories: ['Notebook', 'Desktop', 'Monitor', 'Impressora'] },
    { label: 'Veículos', subcategories: ['Automóvel', 'Caminhão', 'Motocicleta'] }
  ];

  assetForm: AssetForm = {
    patrimonyNumber: '',
    name: '',
    category: '',
    subcategory: '',
    description: '',
    conservation: this.conservationOptions[0],
    status: this.statusOptions[0],
    quantity: 1,
    individualNumbers: '',
    acquisitionDate: '',
    acquisitionValue: 0,
    origin: this.origins[0],
    invoiceNumber: '',
    supplier: '',
    usefulLife: 0,
    depreciationStartDate: '',
    depreciationRate: 2,
    unit: '',
    room: '',
    address: '',
    responsibleName: '',
    responsibleContact: '',
    internalCode: '',
    observations: '',
    warranty: '',
    manualUrl: '',
    lastMovement: 'Não registrado',
    lastResponsible: 'Não registrado',
    lastMaintenance: 'Não registrada'
  };

  assetLibrary: Patrimonio[] = [];
  movementForm = this.createMovementForm();
  selectedAsset: Patrimonio | null = null;
  isSaving = false;
  isLoading = false;
  errorMessage: string | null = null;
  numeroPatrimonioErro: string | null = null;
  requiredErrors: {
    patrimonyNumber: string | null;
    name: string | null;
    category: string | null;
    conservation: string | null;
    status: string | null;
    acquisitionDate: string | null;
    acquisitionValue: string | null;
    origin: string | null;
    unit: string | null;
    responsibleName: string | null;
  } = {
    patrimonyNumber: null,
    name: null,
    category: null,
    conservation: null,
    status: null,
    acquisitionDate: null,
    acquisitionValue: null,
    origin: null,
    unit: null,
    responsibleName: null
  };
  modalAberto = false;
  modalTipo: 'novaCategoria' | 'editarCategorias' | 'novaSubcategoria' | 'editarSubcategorias' | null = null;
  modalTitulo = '';
  modalDescricao = '';
  modalLabel = '';
  modalPlaceholder = '';
  modalValor = '';
  modalErro: string | null = null;

  filePreview: string | ArrayBuffer | null = null;
  qrCodeValue = 'QR-PATRIMONIO-001';
  searchTerm = '';
  displayedAcquisitionValue = '';
  cessionTermPreview = '';
  loanTermPreview = '';
  printOrder: 'alphabetical' | 'patrimony' | 'value' | 'location' = 'alphabetical';
  printLocationFilter: string = 'all';
  assistanceUnit: AssistanceUnitPayload | null = null;
  editingAssetId: string | null = null;
  isRegisteringMovement = false;
  movementError: string | null = null;
  textTemplates!: TextTemplates;
  private templatesSubscription?: Subscription;
  salas: SalaRecord[] = [];
  salasOpcoes: AutocompleteOpcao[] = [];
  salasCarregando = false;
  salasErro: string | null = null;
  profissionais: ProfessionalRecord[] = [];
  profissionaisOpcoes: AutocompleteOpcao[] = [];
  profissionaisCarregando = false;
  profissionaisErro: string | null = null;
  acaoCardAberto: string | null = null;

  constructor(
    private readonly patrimonioService: PatrimonioService,
    private readonly assistanceUnitService: AssistanceUnitService,
    private readonly textTemplateService: TextTemplateService,
    private readonly salasService: SalasService,
    private readonly professionalService: ProfessionalService
  ) {}

  ngOnInit(): void {
    this.textTemplates = this.textTemplateService.getTemplates();
    this.templatesSubscription = this.textTemplateService.templates$.subscribe((templates) => {
      this.textTemplates = templates;
      this.updateCessionTermPreview();
    });
    this.loadAssets();
    this.loadAssistanceUnit();
    this.displayedAcquisitionValue = this.formatCurrency(this.assetForm.acquisitionValue);
    this.updateCessionTermPreview();
  }

  get acoesDesabilitadas(): EstadoAcoesCrud {
    return {
      salvar: this.isSaving,
      cancelar: this.isSaving,
      novo: this.isSaving,
      imprimir: this.isSaving,
      buscar: this.isSaving,
      excluir: true
    };
  }

  changeAssetTab(tabId: AssetTabId): void {
    this.activeAssetTab = tabId;
  }

  onBuscar(): void {
    this.changeAssetTab('listagem');
  }

  onNovo(): void {
    this.resetForm();
    this.changeAssetTab('dados');
  }

  onSalvar(): void {
    this.saveAsset();
  }

  onCancelar(): void {
    this.cancelEdit();
  }

  onImprimir(): void {
    this.generateCessionTerm();
  }

  closeForm(): void {
    window.history.back();
  }

  goToNextAssetTab(): void {
    if (this.hasNextAssetTab) {
      this.activeAssetTab = this.assetTabs[this.activeAssetTabIndex + 1].id;
    }
  }

  goToPreviousAssetTab(): void {
    if (this.hasPreviousAssetTab) {
      this.activeAssetTab = this.assetTabs[this.activeAssetTabIndex - 1].id;
    }
  }

  ngOnDestroy(): void {
    this.templatesSubscription?.unsubscribe();
  }

  get activeAssetTabIndex(): number {
    return this.assetTabs.findIndex((tab) => tab.id === this.activeAssetTab);
  }

  get hasNextAssetTab(): boolean {
    return this.activeAssetTabIndex < this.assetTabs.length - 1;
  }

  get hasPreviousAssetTab(): boolean {
    return this.activeAssetTabIndex > 0;
  }

  get nextAssetTabLabel(): string {
    const nextTab = this.assetTabs[this.activeAssetTabIndex + 1];
    return nextTab ? nextTab.label : '';
  }

  get filteredAssets(): Patrimonio[] {
    const term = this.searchTerm.toLowerCase();
    return this.assetLibrary.filter((asset) =>
      [asset.numeroPatrimonio, asset.nome, asset.responsavel ?? ''].some((value) =>
        (value || '').toLowerCase().includes(term)
      )
    );
  }

  get totalAcquisitionValue(): number {
    return this.assetLibrary.reduce((sum, asset) => sum + Number(asset.valorAquisicao ?? 0), 0);
  }

  get monthlyDepreciation(): number {
    const totalRate = this.assetLibrary.reduce((sum, asset) => sum + Number(asset.taxaDepreciacao ?? 0), 0);
    return this.assetLibrary.length ? totalRate / this.assetLibrary.length : 0;
  }

  get activeAssets(): number {
    return this.assetLibrary.filter((asset) => this.normalizeText(asset.status).includes('ativo')).length;
  }

  get loanedAssets(): Patrimonio[] {
    return this.assetLibrary.filter((asset) => this.normalizeText(asset.status).includes('emprest'));
  }

  get overdueLoanedAssets(): Patrimonio[] {
    return this.loanedAssets.filter((asset) => this.isLoanOverdue(asset));
  }

  get availableLocations(): string[] {
    const unique = new Set(
      this.assetLibrary
        .map((asset) => this.getLocationLabel(asset))
        .filter((location) => location.trim().length > 0)
    );

    return Array.from(unique);
  }

  loadAssets(): void {
    this.isLoading = true;
    this.patrimonioService.list().subscribe({
      next: (patrimonios) => {
        this.assetLibrary = patrimonios;
        this.isLoading = false;
        this.selectedAsset = patrimonios[0] ?? null;
        this.updateCessionTermPreview();
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  loadAssistanceUnit(): void {
    this.assistanceUnitService.get().subscribe(({ unidade }) => {
      this.assistanceUnit = unidade ?? null;
      this.loadSalas(this.assistanceUnit?.id);
    });
    this.loadProfissionais();
  }

  loadSalas(unidadeId?: number): void {
    this.salasCarregando = true;
    this.salasErro = null;
    this.salasService.list(unidadeId).subscribe({
      next: (salas) => {
        this.salas = salas;
        this.salasOpcoes = salas.map((sala) => ({
          id: sala.id,
          label: sala.nome
        }));
        this.salasCarregando = false;
      },
      error: () => {
        this.salasCarregando = false;
        this.salasErro = 'Não foi possível carregar as salas.';
      }
    });
  }

  loadProfissionais(nome?: string): void {
    this.profissionaisCarregando = true;
    this.profissionaisErro = null;
    this.professionalService.list(nome).subscribe({
      next: (profissionais) => {
        this.profissionais = profissionais;
        this.profissionaisOpcoes = profissionais.map((prof) => ({
          id: prof.id,
          label: prof.nomeCompleto
        }));
        this.profissionaisCarregando = false;
      },
      error: () => {
        this.profissionaisCarregando = false;
        this.profissionaisErro = 'Não foi possível carregar os profissionais.';
      }
    });
  }

  onSalaTermoChange(termo: string): void {
    this.assetForm.unit = termo;
    this.validarCampoObrigatorio('unit', termo);
  }

  onSalaSelecionada(opcao: AutocompleteOpcao): void {
    this.assetForm.unit = opcao.label;
    this.validarCampoObrigatorio('unit', this.assetForm.unit);
  }

  onResponsavelTermoChange(termo: string): void {
    this.assetForm.responsibleName = termo;
    this.validarCampoObrigatorio('responsibleName', termo);
    if (termo.trim().length >= 2) {
      this.loadProfissionais(termo);
    } else {
      this.loadProfissionais();
    }
  }

  onResponsavelSelecionado(opcao: AutocompleteOpcao): void {
    this.assetForm.responsibleName = opcao.label;
    this.validarCampoObrigatorio('responsibleName', this.assetForm.responsibleName);
  }

  toggleAcoesCard(assetId: string): void {
    this.acaoCardAberto = this.acaoCardAberto === assetId ? null : assetId;
  }

  fecharAcoesCard(): void {
    this.acaoCardAberto = null;
  }

  get salasFiltradas(): AutocompleteOpcao[] {
    return this.filtrarOpcoes(this.salasOpcoes, this.assetForm.unit);
  }

  get profissionaisFiltrados(): AutocompleteOpcao[] {
    return this.filtrarOpcoes(this.profissionaisOpcoes, this.assetForm.responsibleName);
  }

  private createMovementForm(asset?: Patrimonio) {
    return {
      tipo: 'MOVIMENTACAO' as 'MOVIMENTACAO' | 'MANUTENCAO' | 'BAIXA',
      destino: asset?.unidade ?? '',
      responsavel: asset?.responsavel ?? '',
      observacao: ''
    };
  }

  handleFileInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];

    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        this.filePreview = reader.result;
      };
      reader.readAsDataURL(file);
    }
  }

  generateQrCode(): void {
    const uniqueSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.qrCodeValue = `QR-${this.assetForm.patrimonyNumber || 'PATRIMONIO'}-${uniqueSuffix}`;
  }

  formatField(field: AssetFormTextField): void {
    const value = this.assetForm[field];
    if (typeof value === 'string') {
      const formatted = this.toProperCase(value);
      this.assetForm = { ...this.assetForm, [field]: formatted } as AssetForm;
      this.updateCessionTermPreview();
    }
  }

  validarCampoObrigatorio(
    campo:
      | 'patrimonyNumber'
      | 'name'
      | 'category'
      | 'conservation'
      | 'status'
      | 'acquisitionDate'
      | 'acquisitionValue'
      | 'origin'
      | 'unit'
      | 'responsibleName',
    valor: string | number | null | undefined
  ): void {
    let invalido = false;
    if (typeof valor === 'number') {
      invalido = valor <= 0;
    } else {
      invalido = !String(valor ?? '').trim().length;
    }
    this.requiredErrors[campo] = invalido ? 'Campo obrigatório.' : null;
  }

  validarObrigatorios(): boolean {
    this.validarCampoObrigatorio('patrimonyNumber', this.assetForm.patrimonyNumber);
    this.validarCampoObrigatorio('name', this.assetForm.name);
    this.validarCampoObrigatorio('category', this.assetForm.category);
    this.validarCampoObrigatorio('conservation', this.assetForm.conservation);
    this.validarCampoObrigatorio('status', this.assetForm.status);
    this.validarCampoObrigatorio('acquisitionDate', this.assetForm.acquisitionDate);
    this.validarCampoObrigatorio('acquisitionValue', this.assetForm.acquisitionValue);
    this.validarCampoObrigatorio('origin', this.assetForm.origin);
    this.validarCampoObrigatorio('unit', this.assetForm.unit);
    this.validarCampoObrigatorio('responsibleName', this.assetForm.responsibleName);
    return !Object.values(this.requiredErrors).some((error) => Boolean(error));
  }

  validarNumeroPatrimonio(): void {
    const numeroPatrimonio = this.assetForm.patrimonyNumber.trim();
    if (!numeroPatrimonio) {
      this.numeroPatrimonioErro = null;
      return;
    }
    const numeroDuplicado = this.assetLibrary.some((asset) => {
      if (this.editingAssetId && asset.idPatrimonio === this.editingAssetId) {
        return false;
      }
      return (asset.numeroPatrimonio || '').trim().toLowerCase() === numeroPatrimonio.toLowerCase();
    });
    this.numeroPatrimonioErro = numeroDuplicado
      ? 'Já existe um patrimônio cadastrado com este número.'
      : null;
  }

  formatMovementField(field: 'destino' | 'responsavel'): void {
    const value = this.movementForm[field];
    this.movementForm[field] = this.toProperCase(value);
  }

  saveAsset(): void {
    if (this.isSaving) return;

    if (!this.assetForm.patrimonyNumber.trim() || !this.assetForm.name.trim()) {
      this.errorMessage = 'Informe o número e o nome do patrimônio para salvar.';
      return;
    }

    if (!this.validarObrigatorios()) {
      this.errorMessage = 'Preencha os campos obrigatórios destacados.';
      return;
    }

    this.validarNumeroPatrimonio();
    const numeroPatrimonio = this.assetForm.patrimonyNumber.trim();
    if (this.numeroPatrimonioErro) {
      this.errorMessage = this.numeroPatrimonioErro;
      return;
    }

    this.errorMessage = null;
    this.isSaving = true;
    const payload = {
      numeroPatrimonio: numeroPatrimonio || `PAT-${Date.now()}`,
      nome: this.assetForm.name,
      categoria: this.assetForm.category,
      subcategoria: this.assetForm.subcategory,
      conservacao: this.assetForm.conservation,
      status: this.assetForm.status,
      dataAquisicao: this.assetForm.acquisitionDate,
      valorAquisicao: this.assetForm.acquisitionValue,
      origem: this.assetForm.origin,
      responsavel: this.assetForm.responsibleName,
      unidade: this.assetForm.unit,
      sala: this.assetForm.room,
      taxaDepreciacao: this.assetForm.depreciationRate,
      observacoes: this.assetForm.observations
    };

    const save$ = this.editingAssetId
      ? this.patrimonioService.update(this.editingAssetId, payload)
      : this.patrimonioService.create(payload);

    save$
      .pipe(
        timeout(10000),
        finalize(() => {
          this.isSaving = false;
        })
      )
      .subscribe({
        next: (patrimonio) => {
          this.assetLibrary = this.editingAssetId
            ? this.assetLibrary.map((asset) => (asset.idPatrimonio === patrimonio.idPatrimonio ? patrimonio : asset))
            : [patrimonio, ...this.assetLibrary];
          this.selectedAsset = patrimonio;
          this.resetForm();
          this.updateCessionTermPreview();
        },
        error: (error) => {
          this.errorMessage =
            error?.error?.message ??
            `Não foi possível ${this.editingAssetId ? 'atualizar' : 'salvar'} o patrimônio. Tente novamente.`;
        }
      });
  }

  resetForm(): void {
    this.assetForm = {
      patrimonyNumber: '',
      name: '',
      category: '',
      subcategory: '',
      description: '',
      conservation: this.conservationOptions[0],
      status: this.statusOptions[0],
      quantity: 1,
      individualNumbers: '',
      acquisitionDate: '',
      acquisitionValue: 0,
      origin: this.origins[0],
      invoiceNumber: '',
      supplier: '',
      usefulLife: 0,
      depreciationStartDate: '',
      depreciationRate: 2,
      unit: '',
      room: '',
      address: '',
      responsibleName: '',
      responsibleContact: '',
      internalCode: '',
      observations: '',
      warranty: '',
      manualUrl: '',
      lastMovement: 'Não registrado',
      lastResponsible: 'Não registrado',
      lastMaintenance: 'Não registrada'
    };
    this.filePreview = null;
    this.displayedAcquisitionValue = this.formatCurrency(0);
    this.editingAssetId = null;
    this.numeroPatrimonioErro = null;
    this.requiredErrors = {
      patrimonyNumber: null,
      name: null,
      category: null,
      conservation: null,
      status: null,
      acquisitionDate: null,
      acquisitionValue: null,
      origin: null,
      unit: null,
      responsibleName: null
    };
  }

  setSelected(asset: Patrimonio): void {
    this.selectedAsset = asset;
    this.movementForm = this.createMovementForm(asset);
    this.updateCessionTermPreview();
  }

  startEditingSelected(): void {
    if (!this.selectedAsset) return;
    this.populateFormFromAsset(this.selectedAsset);
    this.editingAssetId = this.selectedAsset.idPatrimonio;
    this.errorMessage = null;
  }

  cancelEdit(): void {
    this.resetForm();
  }

  quickMovement(asset: Patrimonio, tipo: 'MOVIMENTACAO' | 'MANUTENCAO' | 'BAIXA'): void {
    this.movementForm = { ...this.createMovementForm(asset), tipo };
    this.selectedAsset = asset;
    this.movementError = null;
    this.registerMovement();
  }

  private populateFormFromAsset(asset: Patrimonio): void {
    this.assetForm = {
      patrimonyNumber: asset.numeroPatrimonio,
      name: asset.nome,
      category: asset.categoria || '',
      subcategory: asset.subcategoria || '',
      description: asset.observacoes || '',
      conservation: asset.conservacao || this.conservationOptions[0],
      status: asset.status || this.statusOptions[0],
      quantity: 1,
      individualNumbers: '',
      acquisitionDate: asset.dataAquisicao || '',
      acquisitionValue: Number(asset.valorAquisicao ?? 0),
      origin: asset.origem || this.origins[0],
      invoiceNumber: '',
      supplier: '',
      usefulLife: 0,
      depreciationStartDate: '',
      depreciationRate: Number(asset.taxaDepreciacao ?? 0),
      unit: asset.unidade || '',
      room: asset.sala || '',
      address: '',
      responsibleName: asset.responsavel || '',
      responsibleContact: '',
      internalCode: '',
      observations: asset.observacoes || '',
      warranty: '',
      manualUrl: '',
      lastMovement: asset.movimentos?.[0]?.dataMovimento || 'Não registrado',
      lastResponsible: asset.movimentos?.[0]?.responsavel || 'Não registrado',
      lastMaintenance: asset.movimentos?.find((m) => m.tipo === 'MANUTENCAO')?.dataMovimento || 'Não registrada'
    };

    this.displayedAcquisitionValue = this.formatCurrency(this.assetForm.acquisitionValue);
    this.updateCessionTermPreview();
  }

  registerMovement(): void {
    if (!this.selectedAsset || this.isRegisteringMovement) return;

    this.isRegisteringMovement = true;
    this.movementError = null;

    this.patrimonioService
      .registerMovement(this.selectedAsset.idPatrimonio, {
        tipo: this.movementForm.tipo,
        destino: this.movementForm.destino,
        responsavel: this.movementForm.responsavel,
        observacao: this.movementForm.observacao
      })
      .pipe(finalize(() => (this.isRegisteringMovement = false)))
      .subscribe({
        next: (patrimonio) => {
          this.assetLibrary = this.assetLibrary.map((asset) =>
            asset.idPatrimonio === patrimonio.idPatrimonio ? patrimonio : asset
          );
          this.selectedAsset = patrimonio;
          this.movementForm = this.createMovementForm(patrimonio);
        },
        error: (error) => {
          this.movementError = error?.error?.message ?? 'Não foi possível registrar a movimentação';
        }
      });
  }

  onAcquisitionValueChange(rawValue: string): void {
    const numericValue = Number(rawValue.replace(/\D/g, '')) / 100;
    this.assetForm.acquisitionValue = numericValue;
    this.displayedAcquisitionValue = this.formatCurrency(numericValue);
  }

  addCategory(): void {
    this.abrirModal('novaCategoria');
  }

  addSubcategory(): void {
    if (!this.assetForm.category) return;
    this.abrirModal('novaSubcategoria');
  }

  editCategories(): void {
    this.abrirModal('editarCategorias');
  }

  editSubcategories(): void {
    if (!this.assetForm.category) return;
    this.abrirModal('editarSubcategorias');
  }

  abrirModal(tipo: 'novaCategoria' | 'editarCategorias' | 'novaSubcategoria' | 'editarSubcategorias'): void {
    this.modalTipo = tipo;
    this.modalErro = null;
    this.modalValor = '';
    if (tipo === 'novaCategoria') {
      this.modalTitulo = 'Incluir categoria';
      this.modalDescricao = 'Cadastre uma nova categoria para o patrimônio.';
      this.modalLabel = 'Nome da categoria';
      this.modalPlaceholder = 'Ex.: Informática';
    }
    if (tipo === 'editarCategorias') {
      this.modalTitulo = 'Alterar categorias';
      this.modalDescricao = 'Edite as categorias separando por vírgula.';
      this.modalLabel = 'Categorias';
      this.modalPlaceholder = 'Ex.: Informática, Móveis, Veículos';
      this.modalValor = this.categories.map((category) => category.label).join(', ');
    }
    if (tipo === 'novaSubcategoria') {
      this.modalTitulo = 'Incluir subcategoria';
      this.modalDescricao = `Categoria selecionada: ${this.assetForm.category}`;
      this.modalLabel = 'Nome da subcategoria';
      this.modalPlaceholder = 'Ex.: Notebook';
    }
    if (tipo === 'editarSubcategorias') {
      const currentCategory = this.categories.find((category) => category.label === this.assetForm.category);
      this.modalTitulo = 'Alterar subcategorias';
      this.modalDescricao = `Categoria selecionada: ${this.assetForm.category}`;
      this.modalLabel = 'Subcategorias';
      this.modalPlaceholder = 'Ex.: Notebook, Desktop, Monitor';
      this.modalValor = (currentCategory?.subcategories || []).join(', ');
    }
    this.modalAberto = true;
  }

  fecharModal(): void {
    this.modalAberto = false;
    this.modalTipo = null;
    this.modalErro = null;
    this.modalValor = '';
  }

  salvarModal(): void {
    const valor = this.modalValor.trim();
    if (!this.modalTipo) return;
    if (!valor) {
      this.modalErro = 'Preencha o campo para continuar.';
      return;
    }

    if (this.modalTipo === 'novaCategoria') {
      const formatted = this.toProperCase(valor);
      const exists = this.categories.some((category) => category.label.toLowerCase() === formatted.toLowerCase());
      if (exists) {
        this.modalErro = 'Esta categoria já existe.';
        return;
      }
      this.categories = [...this.categories, { label: formatted, subcategories: [] }];
      this.assetForm.category = formatted;
      this.assetForm.subcategory = '';
    }

    if (this.modalTipo === 'editarCategorias') {
      const existingSubcategories = new Map(this.categories.map((category) => [category.label, category.subcategories]));
      const formatted = valor
        .split(',')
        .map((item) => this.toProperCase(item.trim()))
        .filter((item) => item.length > 0);
      if (!formatted.length) {
        this.modalErro = 'Informe ao menos uma categoria.';
        return;
      }
      this.categories = formatted.map((label) => ({
        label,
        subcategories: existingSubcategories.get(label) ?? []
      }));
      if (!formatted.includes(this.assetForm.category)) {
        this.assetForm.category = '';
        this.assetForm.subcategory = '';
      }
    }

    if (this.modalTipo === 'novaSubcategoria') {
      const formatted = this.toProperCase(valor);
      this.categories = this.categories.map((category) => {
        if (category.label === this.assetForm.category) {
          const exists = category.subcategories.some((sub) => sub.toLowerCase() === formatted.toLowerCase());
          if (!exists) {
            return { ...category, subcategories: [...category.subcategories, formatted] };
          }
        }
        return category;
      });
      this.assetForm.subcategory = formatted;
    }

    if (this.modalTipo === 'editarSubcategorias') {
      const formatted = valor
        .split(',')
        .map((item) => this.toProperCase(item.trim()))
        .filter((item) => item.length > 0);
      this.categories = this.categories.map((category) =>
        category.label === this.assetForm.category ? { ...category, subcategories: formatted } : category
      );
      if (!formatted.includes(this.assetForm.subcategory)) {
        this.assetForm.subcategory = '';
      }
    }

    this.fecharModal();
  }

  generateCessionTerm(): void {
    const asset = this.selectedAsset ?? this.buildAssetSnapshot();
    const content = this.fillTemplate(this.textTemplates.cession, asset);

    this.cessionTermPreview = content;
    const formatted = content
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line) => `<p>${line}</p>`)
      .join('');
    this.openPrintWindow('Termo de cessão', formatted);
  }

  generateLoanTerm(): void {
    const asset = this.selectedAsset ?? this.buildAssetSnapshot();
    const content = this.fillTemplate(this.textTemplates.loan, asset);

    this.loanTermPreview = content;
    this.openPrintWindow(
      'Termo de responsabilidade de empréstimo de bens a terceiros',
      content
        .split('\n')
        .filter((line) => line.trim().length > 0)
        .map((line) => `<p>${line}</p>`)
        .join('')
    );
  }

  printAssets(): void {
    const filtered = this.assetLibrary.filter((asset) => {
      if (this.printLocationFilter === 'all') return true;
      return this.getLocationLabel(asset) === this.printLocationFilter;
    });

    const assets = [...filtered].sort((a, b) => {
      switch (this.printOrder) {
        case 'patrimony':
          return (a.numeroPatrimonio || '').localeCompare(b.numeroPatrimonio || '');
        case 'value':
          return (Number(b.valorAquisicao) || 0) - (Number(a.valorAquisicao) || 0);
        case 'location':
          return this.getLocationLabel(a).localeCompare(this.getLocationLabel(b));
        default:
          return (a.nome || '').localeCompare(b.nome || '');
      }
    });

    const unitTitle = [this.assistanceUnit?.nomeFantasia, this.assistanceUnit?.cidade]
      .filter(Boolean)
      .join(' • ');

    const items = assets
      .map(
        (asset) => {
          const location = this.getLocationLabel(asset) || 'Local não informado';
          const value = this.formatCurrency(asset.valorAquisicao || 0);
          return `<p style="margin-bottom:10px;">${
            asset.numeroPatrimonio || 'Sem número'
          } — ${asset.nome || 'Sem nome'} • ${location} • Valor: ${value}</p>`;
        }
      )
      .join('');

    const header = unitTitle ? `<p class="report-highlight">${unitTitle}</p>` : '';

    this.openPrintWindow('Relação de bens patrimoniais', `${header}${items}`);
  }

  private fillTemplate(template: string, asset: Patrimonio): string {
    const dataEmissao = this.formatDate(new Date());
    const dataAquisicao = asset.dataAquisicao ? this.formatDate(new Date(asset.dataAquisicao)) : 'Não informada';
    const replacements: Record<string, string> = {
      nome: asset.nome || 'Não identificado',
      numeroPatrimonio: asset.numeroPatrimonio || 'não informado',
      local: this.getLocationLabel(asset) || 'Local não informado',
      responsavel: this.getResponsible(asset),
      valor: this.formatCurrency(asset.valorAquisicao || this.assetForm.acquisitionValue),
      categoria: asset.categoria || 'Não informada',
      subcategoria: asset.subcategoria ? `(${asset.subcategoria})` : '',
      conservacao: asset.conservacao || 'Não informada',
      status: asset.status || 'Não informada',
      dataAquisicao,
      dataEmissao
    };

    return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => replacements[key] ?? '');
  }

  private getResponsible(asset: Patrimonio): string {
    return asset.responsavel || this.assetForm.responsibleName || 'Não informado';
  }

  private normalizeText(value?: string): string {
    return (value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  private filtrarOpcoes(opcoes: AutocompleteOpcao[], termo: string): AutocompleteOpcao[] {
    const normalizado = this.normalizeText(termo ?? '');
    if (!normalizado) {
      return opcoes.slice(0, 20);
    }
    return opcoes.filter((opcao) => this.normalizeText(opcao.label).includes(normalizado)).slice(0, 20);
  }

  private isLoanOverdue(asset: Patrimonio): boolean {
    const dueDate = this.getLoanDueDate(asset);
    if (!dueDate) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dueDate < today;
  }

  private getLoanDueDate(asset: Patrimonio): Date | null {
    const candidates = [asset.observacoes, ...(asset.movimentos ?? []).map((movement) => movement.observacao)];
    for (const text of candidates) {
      const parsed = this.parseDateFromText(text);
      if (parsed) return parsed;
    }
    return null;
  }

  private parseDateFromText(text?: string | null): Date | null {
    if (!text) return null;

    const match = text.match(/(\d{4}-\d{2}-\d{2})|(\d{2}\/\d{2}\/\d{4})/);
    if (!match) return null;

    const value = match[0];
    const parts = value.split(/[-\/]/).map(Number);
    const date = value.includes('-')
      ? new Date(parts[0], parts[1] - 1, parts[2])
      : new Date(parts[2], parts[1] - 1, parts[0]);

    return isNaN(date.getTime()) ? null : date;
  }

  private toProperCase(value: string): string {
    return value
      .toLowerCase()
      .split(' ')
      .filter((word) => word.trim().length)
      .map((word) => word[0].toUpperCase() + word.substring(1))
      .join(' ');
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value || 0);
  }

  private buildAssetSnapshot(): Patrimonio {
    return {
      idPatrimonio: this.selectedAsset?.idPatrimonio ?? '',
      numeroPatrimonio: this.assetForm.patrimonyNumber,
      nome: this.assetForm.name,
      categoria: this.assetForm.category,
      subcategoria: this.assetForm.subcategory,
      conservacao: this.assetForm.conservation,
      status: this.assetForm.status,
      dataAquisicao: this.assetForm.acquisitionDate,
      valorAquisicao: this.assetForm.acquisitionValue,
      origem: this.assetForm.origin,
      unidade: this.assetForm.unit,
      sala: this.assetForm.room,
      responsavel: this.assetForm.responsibleName,
      taxaDepreciacao: this.assetForm.depreciationRate,
      observacoes: this.assetForm.observations
    } as Patrimonio;
  }

  private updateCessionTermPreview(): void {
    const asset = this.selectedAsset ?? this.buildAssetSnapshot();
    this.cessionTermPreview = this.fillTemplate(this.textTemplates.cession, asset);
    this.loanTermPreview = this.fillTemplate(this.textTemplates.loan, asset);
  }

  getLocationLabel(asset: Patrimonio): string {
    return [asset.unidade, asset.sala].filter((value) => (value ?? '').trim().length > 0).join(' - ');
  }

  getPrimeiroNome(nome?: string | null): string {
    const valor = (nome ?? '').trim();
    if (!valor) {
      return 'Não informado';
    }
    return valor.split(/\s+/)[0];
  }

  private openPrintWindow(title: string, content: string): void {
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;

    const unitTitle = this.assistanceUnit?.razaoSocial || this.assistanceUnit?.nomeFantasia || 'Instituição';
    const unitName = this.assistanceUnit?.nomeFantasia || this.assistanceUnit?.razaoSocial || '';
    const unitCnpj = this.assistanceUnit?.cnpj || '';
    const unitPhone = this.assistanceUnit?.telefone || '';
    const unitEmail = this.assistanceUnit?.email || '';
    const unitSite = this.assistanceUnit?.site || '';
    const enderecoLinha = [
      this.assistanceUnit?.endereco,
      this.assistanceUnit?.numeroEndereco,
      this.assistanceUnit?.complemento
    ]
      .filter((item) => (item ?? '').toString().trim().length > 0)
      .join(', ');
    const linhaEndereco = [
      unitCnpj ? `CNPJ: ${unitCnpj}` : '',
      enderecoLinha,
      this.assistanceUnit?.bairro,
      this.assistanceUnit?.cidade
    ]
      .filter((item) => (item ?? '').toString().trim().length > 0)
      .join(' | ') || 'Endereço não informado';
    const linhaContato = [
      unitPhone ? `Telefone: ${unitPhone}` : '',
      unitEmail ? `E-mail: ${unitEmail}` : '',
      unitSite ? `Site: ${unitSite}` : ''
    ]
      .filter((item) => (item ?? '').toString().trim().length > 0)
      .join(' | ');
    const timestamp = new Date();
    const timestampLabel = this.formatDateTime(timestamp);
    const logo = this.assistanceUnit?.logomarcaRelatorio || this.assistanceUnit?.logomarca || '';

    win.document.write(`<!doctype html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            @page { size: A4; margin: 20mm; }
            body { font-family: Arial, sans-serif; color: #000000; font-size: 12pt; }
            .report { min-height: 100%; position: relative; }
            .report-header { text-align: center; margin-bottom: 6mm; }
            .report-header__logo { max-height: 40mm; margin: 0 auto 6mm; display: block; }
            .report-header__title { font-size: 14pt; font-weight: 700; margin: 0 0 2mm; }
            .report-header__subtitle { font-size: 16pt; font-weight: 600; margin: 0 0 4mm; }
            .divider { border-top: 1px solid #000; margin: 4mm 0; }
            .report-body { font-size: 12pt; line-height: 1.5; text-align: justify; }
            .report-body p { margin: 0 0 8px; text-indent: 1.25cm; }
            .report-highlight { margin: 0 0 8px; font-weight: 600; text-align: left; }
            .report-footer { position: fixed; bottom: 0; left: 0; right: 0; font-size: 10pt; color: #000; }
            .report-footer__line { border-top: 1px solid #000; margin-bottom: 2mm; }
            .report-footer__content { display: flex; flex-direction: column; gap: 2mm; align-items: center; }
            .page-number::before { content: "Página " counter(page) " de " counter(pages); }
          </style>
        </head>
        <body>
          <div class="report">
            <header class="report-header">
              ${logo ? `<img src="${logo}" alt="Logomarca" class="report-header__logo" />` : ''}
              <p class="report-header__title">${unitTitle}</p>
              <p class="report-header__subtitle">${title}</p>
              <div class="divider"></div>
            </header>
            <section class="report-body">
              ${content}
            </section>
            <footer class="report-footer">
              <div class="report-footer__line"></div>
              <div class="report-footer__content">
                <div>${unitName || unitTitle}</div>
                <div>${linhaEndereco}</div>
                <div>${linhaContato}</div>
                <div class="page-number"></div>
                <div>Gerado em ${timestampLabel}</div>
              </div>
            </footer>
          </div>
        </body>
      </html>`);
    win.document.close();
    win.print();
  }

  private formatDate(value: Date): string {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(value);
  }

  private formatDateTime(value: Date): string {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(value);
  }
}

