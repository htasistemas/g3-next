import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { BeneficiarioApiPayload, BeneficiarioApiService } from '../../services/beneficiario-api.service';
import { FamiliaMembroPayload, FamiliaPayload, FamilyService } from '../../services/family.service';
import { Subject, forkJoin, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, finalize, map, switchMap, takeUntil } from 'rxjs/operators';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faPeopleGroup } from '@fortawesome/free-solid-svg-icons';

import { TelaPadraoComponent } from '../compartilhado/tela-padrao/tela-padrao.component';
import { ConfigAcoesCrud, EstadoAcoesCrud, TelaBaseComponent } from '../compartilhado/tela-base.component';
import { PopupMessagesComponent } from '../compartilhado/popup-messages/popup-messages.component';
import { PopupErrorBuilder } from '../../utils/popup-error.builder';
import { titleCaseWords } from '../../utils/capitalization.util';
import { criarDataLocal, formatarDataSemFuso } from '../../utils/data-format.util';
@Component({
  selector: 'app-vinculo-familiar',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FontAwesomeModule, TelaPadraoComponent, PopupMessagesComponent],
  templateUrl: './vinculo-familiar.component.html',
  styleUrl: './vinculo-familiar.component.scss'
})
export class VinculoFamiliarComponent extends TelaBaseComponent implements OnInit, OnDestroy {
  readonly faPeopleGroup = faPeopleGroup;
  familyForm: FormGroup;
  feedback: string | null = null;
  popupErros: string[] = [];
  saving = false;
  cepLookupError: string | null = null;
  principalSearch = new FormControl('');
  familySearch = new FormControl('');
  memberSearch = new FormControl('');
  principalResults: BeneficiarioApiPayload[] = [];
  familyResults: FamiliaPayload[] = [];
  memberResults: BeneficiarioApiPayload[] = [];
  principalLoading = false;
  familyLoading = false;
  memberLoading = false;
  principalError: string | null = null;
  familyError: string | null = null;
  memberError: string | null = null;
  principal: BeneficiarioApiPayload | null = null;
  selectedFamilyId: string | null = null;
  applyAddressToMembers = true;
  activeTab = 'lista';
  readonly tabs = [
    { id: 'lista', label: 'Listagem de famílias' },
    { id: 'cadastro', label: 'Cadastro da família' },
    { id: 'endereco', label: 'Endereço da família' },
    { id: 'membros', label: 'Membros vinculados' },
    { id: 'indicadores', label: 'Indicadores sociais' }
  ];
  readonly statusOptions = ['ATIVO', 'INATIVO', 'BLOQUEADO'];
  readonly relationshipOptions = [
    'Responsável familiar',
    'Cônjuge/companheiro(a)',
    'Filho(a)',
    'Enteado(a)',
    'Pai/Mãe',
    'Avô/Avó',
    'Irmão(a)',
    'Outro'
  ];
  readonly housingOptions = ['Próprio', 'Alugado', 'Cedido', 'Financiado', 'Ocupação', 'Outro'];
  readonly housingTypes = ['Casa', 'Apartamento', 'Cômodo', 'Barraco', 'Casa de madeira', 'Sítio/Chácara', 'Outro'];
  private readonly destroy$ = new Subject<void>();
  private feedbackTimeout?: ReturnType<typeof setTimeout>;
  familias: FamiliaPayload[] = [];
  familiasFiltradas: FamiliaPayload[] = [];
  familiaSelecionada: FamiliaPayload | null = null;
  paginaAtual = 1;
  readonly tamanhoPagina = 10;
  listagemForm: FormGroup;
  readonly acoesToolbar: Required<ConfigAcoesCrud> = this.criarConfigAcoes({
    salvar: true,
    excluir: false,
    novo: true,
    cancelar: true,
    imprimir: false,
    buscar: true
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly familyService: FamilyService,
    private readonly beneficiaryService: BeneficiarioApiService,
    private readonly http: HttpClient
  ) {
    super();
    this.familyForm = this.fb.group({
      status: ['ATIVO', Validators.required],
      nome_familia: ['', Validators.required],
      id_referencia_familiar: ['', Validators.required],
      cep: ['', [this.cepValidator]],
      logradouro: [''],
      numero: [''],
      complemento: [''],
      bairro: [''],
      ponto_referencia: [''],
      municipio: [''],
      uf: [''],
      zona: [''],
      situacao_imovel: [''],
      tipo_moradia: [''],
      agua_encanada: [false],
      esgoto_tipo: [''],
      coleta_lixo: [''],
      energia_eletrica: [false],
      internet: [false],
      arranjo_familiar: [''],
      qtd_membros: [null],
      qtd_criancas: [null],
      qtd_adolescentes: [null],
      qtd_idosos: [null],
      qtd_pessoas_deficiencia: [null],
      renda_familiar_total: [''],
      renda_per_capita: [''],
      faixa_renda_per_capita: [''],
      principais_fontes_renda: [''],
      situacao_inseguranca_alimentar: [''],
      possui_dividas_relevantes: [false],
      descricao_dividas: [''],
      vulnerabilidades_familia: [''],
      servicos_acompanhamento: [''],
      tecnico_responsavel: [''],
      periodicidade_atendimento: [''],
      proxima_visita_prevista: [''],
      observacoes: [''],
      membros: this.fb.array([])
    });
    this.listagemForm = this.fb.group({
      nome: [''],
      codigo: [''],
      status: ['']
    });
    this.setupCapitalizationRules();
  }

  ngOnInit(): void {
    this.loadFamilias();
    this.setupSearch(
      this.principalSearch,
      'principal'
    );
    this.setupFamilySearch();
    this.setupSearch(
      this.memberSearch,
      'member'
    );

    this.membros.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      if (!this.familyForm.get('qtd_membros')?.value) {
        this.familyForm.get('qtd_membros')?.setValue(this.membros.length, { emitEvent: false });
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.clearFeedbackTimeout();
  }

  get membros(): FormArray {
    return this.familyForm.get('membros') as FormArray;
  }

  get activeTabIndex(): number {
    return Math.max(
      this.tabs.findIndex((tab) => tab.id === this.activeTab),
      0
    );
  }

  get hasPreviousTab(): boolean {
    return this.activeTabIndex > 0;
  }

  get hasNextTab(): boolean {
    return this.activeTabIndex < this.tabs.length - 1;
  }

  get nextTabLabel(): string {
    return this.tabs[this.activeTabIndex + 1]?.label ?? '';
  }

  get acoesDesabilitadas(): EstadoAcoesCrud {
    return {
      salvar: this.saving || this.familyForm.invalid,
      excluir: true,
      novo: this.saving,
      cancelar: this.saving,
      imprimir: true,
      buscar: this.saving
    };
  }

  get familiasPaginadas(): FamiliaPayload[] {
    const inicio = (this.paginaAtual - 1) * this.tamanhoPagina;
    return this.familiasFiltradas.slice(inicio, inicio + this.tamanhoPagina);
  }

  get totalPaginas(): number {
    return Math.max(1, Math.ceil(this.familiasFiltradas.length / this.tamanhoPagina));
  }

  paginaAnterior(): void {
    this.paginaAtual = Math.max(1, this.paginaAtual - 1);
  }

  proximaPagina(): void {
    this.paginaAtual = Math.min(this.totalPaginas, this.paginaAtual + 1);
  }

  fecharPopupErros(): void {
    this.popupErros = [];
  }

  get familyAddressLabel(): string {
    const value = this.familyForm.getRawValue();
    const parts = [
      value.logradouro,
      value.numero,
      value.bairro,
      value.municipio,
      value.uf,
      value.cep
    ].filter(Boolean);
    return parts.join(', ');
  }

  get principalLabel(): string {
    if (!this.principal) return 'Selecione o Responsavel principal';
    const doc = this.principal.cpf || this.principal.nis || this.principal.codigo || '';
    return `${this.principal.nome_completo || this.principal.nome_social}${doc ? `  ${doc}` : ''}`;
  }

  selectPrincipal(beneficiary: BeneficiarioApiPayload): void {
    this.principal = beneficiary;
    this.familyForm.get('id_referencia_familiar')?.setValue(beneficiary.id_beneficiario ?? '');
    if (!this.familyForm.get('nome_familia')?.value) {
      this.familyForm.get('nome_familia')?.setValue(
        beneficiary.nome_familia || `familia ${beneficiary.nome_completo || beneficiary.nome_social || ''}`.trim()
      );
    }
    this.principalSearch.setValue(beneficiary.nome_completo || beneficiary.nome_social || '', { emitEvent: false });
    this.principalResults = [];
    this.upsertMember(beneficiary, true);
  }

  selectFamily(familia: FamiliaPayload): void {
    if (!familia.id_familia) return;
    this.familiaSelecionada = familia;
    this.familySearch.setValue(familia.nome_familia, { emitEvent: false });
    this.familyResults = [];
    this.familyLoading = true;
    this.familyError = null;

    this.familyService
      .getById(familia.id_familia)
      .pipe(finalize(() => (this.familyLoading = false)))
      .subscribe({
        next: ({ familia: loaded }) => {
          this.selectedFamilyId = loaded.id_familia ?? familia.id_familia ?? null;
          this.familyForm.patchValue({
            nome_familia: loaded.nome_familia,
            status: loaded.status ?? 'ATIVO',
            id_referencia_familiar: loaded.id_referencia_familiar ?? '',
            cep: loaded.cep ?? '',
            logradouro: loaded.logradouro ?? '',
            numero: loaded.numero ?? '',
            complemento: loaded.complemento ?? '',
            bairro: loaded.bairro ?? '',
            ponto_referencia: loaded.ponto_referencia ?? '',
            municipio: loaded.municipio ?? '',
            uf: loaded.uf ?? '',
            zona: loaded.zona ?? '',
            situacao_imovel: loaded.situacao_imovel ?? '',
            tipo_moradia: loaded.tipo_moradia ?? '',
            agua_encanada: loaded.agua_encanada ?? false,
            esgoto_tipo: loaded.esgoto_tipo ?? '',
            coleta_lixo: loaded.coleta_lixo ?? '',
            energia_eletrica: loaded.energia_eletrica ?? false,
            internet: loaded.internet ?? false,
            arranjo_familiar: loaded.arranjo_familiar ?? '',
            qtd_membros: loaded.qtd_membros ?? null,
            qtd_criancas: loaded.qtd_criancas ?? null,
            qtd_adolescentes: loaded.qtd_adolescentes ?? null,
            qtd_idosos: loaded.qtd_idosos ?? null,
            qtd_pessoas_deficiencia: loaded.qtd_pessoas_deficiencia ?? null,
            renda_familiar_total: loaded.renda_familiar_total ?? '',
            renda_per_capita: loaded.renda_per_capita ?? '',
            faixa_renda_per_capita: loaded.faixa_renda_per_capita ?? '',
            principais_fontes_renda: loaded.principais_fontes_renda ?? '',
            situacao_inseguranca_alimentar: loaded.situacao_inseguranca_alimentar ?? '',
            possui_dividas_relevantes: loaded.possui_dividas_relevantes ?? false,
            descricao_dividas: loaded.descricao_dividas ?? '',
            vulnerabilidades_familia: loaded.vulnerabilidades_familia ?? '',
            servicos_acompanhamento: loaded.servicos_acompanhamento ?? '',
            tecnico_responsavel: loaded.tecnico_responsavel ?? '',
            periodicidade_atendimento: loaded.periodicidade_atendimento ?? '',
            proxima_visita_prevista: loaded.proxima_visita_prevista ?? '',
            observacoes: loaded.observacoes ?? ''
          });

          this.membros.clear();
          (loaded.membros ?? []).forEach((member: FamiliaMembroPayload) => {
            this.membros.push(this.buildMemberControlFromExisting(member));
          });

          const referencia = loaded.referencia_familiar;
          if (referencia) {
            this.principal = referencia;
            this.principalSearch.setValue(
              referencia.nome_completo || referencia.nome_social || '',
              { emitEvent: false }
            );
          } else {
            const responsavel = loaded.membros?.find((member: FamiliaMembroPayload) => member.responsavel_familiar)?.beneficiario;
            if (responsavel) {
              this.principal = responsavel;
              this.principalSearch.setValue(
                responsavel.nome_completo || responsavel.nome_social || '',
                { emitEvent: false }
              );
            }
          }
        },
        error: () => {
          this.familyError = 'Não foi possível carregar a familia selecionada.';
        }
      });
  }

  changeTab(tabId: string): void {
    this.activeTab = tabId;
  }

  goToNextTab(): void {
    if (!this.hasNextTab) return;
    this.activeTab = this.tabs[this.activeTabIndex + 1]?.id ?? this.activeTab;
  }

  goToPreviousTab(): void {
    if (!this.hasPreviousTab) return;
    this.activeTab = this.tabs[this.activeTabIndex - 1]?.id ?? this.activeTab;
  }

  closeForm(): void {
    window.history.back();
  }

  addMember(beneficiary: BeneficiarioApiPayload): void {
    this.upsertMember(beneficiary, false);
    this.memberSearch.setValue('', { emitEvent: false });
    this.memberResults = [];
  }

  removeMember(index: number): void {
    const member = this.membros.at(index)?.value as FamiliaMembroPayload | undefined;
    if (member?.id_beneficiario && member.id_beneficiario === this.principal?.id_beneficiario) {
      this.feedback = 'O Responsável principal não pode ser removido da familia.';
      return;
    }
    this.membros.removeAt(index);
  }

  toggleAddressForAll(): void {
    this.applyAddressToMembers = !this.applyAddressToMembers;
    this.membros.controls.forEach((control) => {
      control.get('usa_endereco_familia')?.setValue(this.applyAddressToMembers);
    });
  }

  onFamilyCepInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 8);
    let formatted = digits;

    if (digits.length > 5) {
      formatted = `${digits.slice(0, 5)}-${digits.slice(5)}`;
    }

    this.familyForm.get('cep')?.setValue(formatted, { emitEvent: false });
    this.cepLookupError = null;

    if (digits.length === 8) {
      this.lookupAddressByCep(digits);
    }
  }

  onFamilyCepBlur(): void {
    const cepControl = this.familyForm.get('cep');
    if (!cepControl) return;

    if (cepControl.invalid) {
      this.cepLookupError = cepControl.value ? 'Informe um CEP vlido para consultar o Endereço.' : null;
      return;
    }

    const digits = this.normalizeCep(cepControl.value as string);
    if (digits?.length === 8) {
      this.lookupAddressByCep(digits);
    }
  }

  saveFamily(): void {
    this.popupErros = [];
    if (this.familyForm.invalid) {
      this.familyForm.markAllAsTouched();
      const builder = new PopupErrorBuilder();
      const requiredFields: { path: string; label: string }[] = [
        { path: 'nome_familia', label: 'Nome da familia' },
        { path: 'id_referencia_familiar', label: 'Responsavel principal' }
      ];
      requiredFields.forEach(({ path, label }) => {
        const control = this.familyForm.get(path);
        if (!control?.value) {
          builder.adicionar(`${label} e obrigatorio.`);
        }
      });
      this.popupErros = builder.build();
      this.setFeedback('Revise os campos obrigatorios antes de salvar o vinculo familiar.');
      return;
    }

    if (!this.membros.length) {
      this.setFeedback('Inclua pelo menos um beneficiario vinculado a familia.');
      return;
    }

    this.saving = true;
    this.clearFeedback();

    const payload = this.buildPayload(!this.selectedFamilyId);

    const request$ = this.selectedFamilyId
      ? this.familyService.update(this.selectedFamilyId, payload).pipe(
          switchMap(({ familia }) =>
            this.persistMembers(familia.id_familia ?? this.selectedFamilyId ?? '')
              .pipe(map(() => ({ familia })))
          )
        )
      : this.familyService.create(payload);

    request$
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: ({ familia }) => {
          this.selectedFamilyId = familia.id_familia ?? this.selectedFamilyId;
          const nomeFamilia = familia.nome_familia || this.familyForm.get('nome_familia')?.value || '';
          this.setFeedback(`Familia ${nomeFamilia} registrada com sucesso.`);
          this.loadFamilias();
        },
        error: () => {
          this.setFeedback('Não foi possível salvar o vinculo familiar. Tente novamente.');
        }
      });
  }

  startNewFamily(): void {
    this.selectedFamilyId = null;
    this.principal = null;
    this.principalSearch.setValue('', { emitEvent: false });
    this.familySearch.setValue('', { emitEvent: false });
    this.memberSearch.setValue('', { emitEvent: false });
    this.principalResults = [];
    this.familyResults = [];
    this.memberResults = [];
    this.membros.clear();
    this.applyAddressToMembers = true;
    this.familyForm.reset({
      status: 'ATIVO',
      nome_familia: '',
      id_referencia_familiar: '',
      cep: '',
      logradouro: '',
      numero: '',
      complemento: '',
      bairro: '',
      ponto_referencia: '',
      municipio: '',
      uf: '',
      zona: '',
      situacao_imovel: '',
      tipo_moradia: '',
      agua_encanada: false,
      esgoto_tipo: '',
      coleta_lixo: '',
      energia_eletrica: false,
      internet: false,
      arranjo_familiar: '',
      qtd_membros: null,
      qtd_criancas: null,
      qtd_adolescentes: null,
      qtd_idosos: null,
      qtd_pessoas_deficiencia: null,
      renda_familiar_total: '',
      renda_per_capita: '',
      faixa_renda_per_capita: '',
      principais_fontes_renda: '',
      situacao_inseguranca_alimentar: '',
      possui_dividas_relevantes: false,
      descricao_dividas: '',
      vulnerabilidades_familia: '',
      servicos_acompanhamento: '',
      tecnico_responsavel: '',
      periodicidade_atendimento: '',
      proxima_visita_prevista: '',
      observacoes: '',
      membros: []
    });
    this.activeTab = 'lista';
    this.clearFeedback();
    this.popupErros = [];
  }

  aplicarFiltrosListagem(): void {
    this.applyListFilters();
  }

  limparFiltrosListagem(): void {
    this.listagemForm.reset({ nome: '', codigo: '', status: '' });
    this.applyListFilters();
  }

  onBuscar(): void {
    this.changeTab('lista');
    this.applyListFilters();
  }

  selecionarFamiliaNaLista(familia: FamiliaPayload): void {
    this.familiaSelecionada = familia;
  }

  editarFamiliaNaLista(familia: FamiliaPayload): void {
    if (!familia.id_familia) return;
    this.selectFamily(familia);
    this.changeTab('cadastro');
  }

  formatarStatusLabel(status?: string | null): string {
    if (!status) return '---';
    return status
      .toLowerCase()
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  getStatusClass(status?: string | null): string {
    switch (status) {
      case 'ATIVO':
        return 'pill--status pill--status-ativo';
      case 'INATIVO':
        return 'pill--status pill--status-inativo';
      case 'BLOQUEADO':
        return 'pill--status pill--status-bloqueado';
      default:
        return 'pill--status';
    }
  }

  private buildPayload(includeMembers: boolean): FamiliaPayload {
    const rawValue = this.familyForm.getRawValue();
    const membros = includeMembers
      ? this.membros.controls.map((control) => this.mapMemberPayload(control.value))
      : undefined;

    return {
      ...(rawValue as FamiliaPayload),
      membros,
      qtd_membros: rawValue.qtd_membros || (membros ? membros.length : this.membros.length)
    };
  }

  private mapMemberPayload(member: any): FamiliaMembroPayload {
    return {
      id_familia_membro: member.id_familia_membro,
      id_beneficiario: member.id_beneficiario,
      parentesco: member.parentesco,
      responsavel_familiar: member.responsavel_familiar,
      contribui_renda: member.contribui_renda,
      renda_individual: member.renda_individual,
      participa_servicos: member.participa_servicos,
      observacoes: member.observacoes,
      usa_endereco_familia: member.usa_endereco_familia
    };
  }

  private persistMembers(familiaId: string) {
    const requests = this.membros.controls.map((control) => {
      const payload = this.mapMemberPayload(control.value);
      if (payload.id_familia_membro) {
        return this.familyService.updateMember(familiaId, payload.id_familia_membro, payload);
      }
      return this.familyService.addMember(familiaId, payload);
    });

    return requests.length ? forkJoin(requests) : of([]);
  }

  private loadFamilias(): void {
    this.familyService.list().subscribe({
      next: ({ familias }) => {
        const unique = new Map<string, FamiliaPayload>();
        (familias ?? []).forEach((familia: FamiliaPayload) => {
          const id = String(familia.id_familia ?? '');
          const key = id || familia.nome_familia || '';
          if (!unique.has(key)) {
            unique.set(key, familia);
          }
        });
        this.familias = Array.from(unique.values());
        this.applyListFilters();
      },
      error: () => {
        this.setFeedback('Não foi possível carregar a listagem de familias.');
      }
    });
  }

  private applyListFilters(): void {
    const { nome, codigo, status } = this.listagemForm.getRawValue();
    const filtroNome = this.normalizeText(nome);
    const filtroCodigo = this.normalizeText(codigo);
    const filtroStatus = this.normalizeText(status);

    this.familiasFiltradas = (this.familias ?? [])
      .filter((familia) => {
        const referencia = this.getReferenciaFamilia(familia);
        const nomeFamilia = this.normalizeText(familia.nome_familia);
        const codigoReferencia = this.normalizeText(referencia?.codigo);
        const statusFamilia = this.normalizeText(familia.status);

        if (filtroNome && !nomeFamilia.includes(filtroNome)) return false;
        if (filtroCodigo && !codigoReferencia.includes(filtroCodigo) && !this.normalizeText(familia.id_familia).includes(filtroCodigo)) {
          return false;
        }
        if (filtroStatus && statusFamilia !== filtroStatus) return false;
        return true;
      })
      .sort((a, b) => this.normalizeText(a.nome_familia).localeCompare(this.normalizeText(b.nome_familia), 'pt-BR'));

    this.paginaAtual = 1;
  }

  getReferenciaFamilia(familia: FamiliaPayload): BeneficiarioApiPayload | null {
    if (familia.referencia_familiar) {
      return familia.referencia_familiar;
    }
    const membroResponsavel = (familia.membros ?? []).find((membro) => membro.responsavel_familiar);
    return membroResponsavel?.beneficiario ?? null;
  }

  formatAge(dataNascimento?: string | null): string {
    if (!dataNascimento) return '--';
    const birth = criarDataLocal(dataNascimento);
    if (!birth) return '--';
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff == 0 && today.getDate() < birth.getDate())) {
      age -= 1;
    }
    return age.toString();
  }

  formatarMembrosFamilia(familia: FamiliaPayload): string {
    const nomes = (familia.membros ?? [])
      .map((membro) => membro.beneficiario?.nome_completo || membro.beneficiario?.nome_social || '')
      .map((nome) => nome.trim())
      .filter((nome) => nome.length > 0);

    return nomes.length ? nomes.join(', ') : 'Nenhum membro vinculado';
  }

  formatDate(dataNascimento?: string | null): string {
    return formatarDataSemFuso(dataNascimento);
  }

  private normalizeText(value?: string | number | null): string {
    return (value ?? '')
      .toString()
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  private setupCapitalizationRules(): void {
    const campos = [
      'nome_familia',
      'logradouro',
      'complemento',
      'bairro',
      'ponto_referencia',
      'municipio',
      'zona',
      'arranjo_familiar',
      'principais_fontes_renda',
      'tecnico_responsavel',
      'periodicidade_atendimento'
    ];

    campos.forEach((campo) => {
      const control = this.familyForm.get(campo);
      control?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((value) => {
        if (typeof value !== 'string' || !value.trim()) {
          return;
        }
        const formatted = titleCaseWords(value);
        if (formatted !== value) {
          control.setValue(formatted, { emitEvent: false });
        }
      });
    });
  }

  clearFeedback(): void {
    this.feedback = null;
    this.clearFeedbackTimeout();
  }

  private setFeedback(message: string, timeoutMs = 10000): void {
    this.feedback = message;
    this.clearFeedbackTimeout();
    this.feedbackTimeout = setTimeout(() => {
      this.feedback = null;
      this.feedbackTimeout = undefined;
    }, timeoutMs);
  }

  private clearFeedbackTimeout(): void {
    if (this.feedbackTimeout) {
      clearTimeout(this.feedbackTimeout);
      this.feedbackTimeout = undefined;
    }
  }

  private setupSearch(control: FormControl, context: 'principal' | 'member'): void {
    control.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((value) => this.searchBeneficiaries(value ?? '', context)),
        takeUntil(this.destroy$)
      )
      .subscribe((results) => {
        if (context === 'principal') {
          this.principalResults = results;
        } else {
          this.memberResults = results;
        }
      });
  }

  private setupFamilySearch(): void {
    this.familySearch.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((value) => {
          const query = (value ?? '').trim();
          if (!query) {
            this.familyResults = [];
            this.familyError = null;
            this.familyLoading = false;
            return of([] as FamiliaPayload[]);
          }
          this.familyLoading = true;
          this.familyError = null;
          return this.familyService.list({ nome_familia: query }).pipe(
            map(({ familias }) => familias ?? []),
            catchError(() => {
              this.familyError = 'Não foi possível buscar familias agora.';
              return of([] as FamiliaPayload[]);
            }),
            finalize(() => {
              this.familyLoading = false;
            })
          );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe((results) => {
        this.familyResults = results;
      });
  }

  private searchBeneficiaries(term: string, context: 'principal' | 'member') {
    const query = term.trim();

    if (!query) {
      this.setSearchState(context, false, null);
      return of([] as BeneficiarioApiPayload[]);
    }

    this.setSearchState(context, true, null);

    const digits = query.replace(/\D/g, '');
    const params =
      digits.length === 11
        ? { cpf: digits, nis: digits }
        : digits.length >= 4 && /^\d+$/.test(digits)
          ? { codigo: digits }
          : { nome: query };

    return this.beneficiaryService.list(params).pipe(
      map(({ beneficiarios }) => beneficiarios ?? []),
      catchError(() => {
        this.setSearchState(context, false, 'Não foi possível buscar beneficiarios agora.');
        return of([] as BeneficiarioApiPayload[]);
      }),
      finalize(() => {
        if (context === 'principal') {
          this.principalLoading = false;
        } else {
          this.memberLoading = false;
        }
      })
    );
  }

  private setSearchState(context: 'principal' | 'member', loading: boolean, error: string | null): void {
    if (context === 'principal') {
      this.principalLoading = loading;
      this.principalError = error;
    } else {
      this.memberLoading = loading;
      this.memberError = error;
    }
  }

  private upsertMember(beneficiary: BeneficiarioApiPayload, isReference: boolean): void {
    if (!beneficiary.id_beneficiario) return;

    const existingIndex = this.membros.controls.findIndex(
      (control) => control.get('id_beneficiario')?.value === beneficiary.id_beneficiario
    );

    if (existingIndex >= 0) {
      const control = this.membros.at(existingIndex);
      if (isReference) {
        control.get('responsavel_familiar')?.setValue(true);
        control.get('parentesco')?.setValue('Responsavel familiar');
      }
      this.feedback = 'Este beneficiario ja esta vinculado  familia.';
      return;
    }

    this.membros.push(this.buildMemberControl(beneficiary, isReference));
    if (isReference && !this.principal) {
      this.principal = beneficiary;
    }
  }

  private buildMemberControl(beneficiary: BeneficiarioApiPayload, isReference: boolean): FormGroup {
    return this.fb.group({
      id_familia_membro: [null],
      id_beneficiario: [beneficiary.id_beneficiario, Validators.required],
      nome: [beneficiary.nome_completo || beneficiary.nome_social || 'beneficiario'],
      documento: [beneficiary.cpf || beneficiary.nis || beneficiary.codigo || ''],
      parentesco: [isReference ? 'Responsavel familiar' : '', Validators.required],
      responsavel_familiar: [isReference],
      contribui_renda: [false],
      renda_individual: [''],
      participa_servicos: [false],
      observacoes: [''],
      usa_endereco_familia: [this.applyAddressToMembers]
    });
  }

  private buildMemberControlFromExisting(member: FamiliaMembroPayload): FormGroup {
    const beneficiary = member.beneficiario;
    const displayName = beneficiary?.nome_completo || beneficiary?.nome_social || 'beneficiario';
    const document = beneficiary?.cpf || beneficiary?.nis || beneficiary?.codigo || '';

    return this.fb.group({
      id_familia_membro: [member.id_familia_membro ?? null],
      id_beneficiario: [member.id_beneficiario, Validators.required],
      nome: [displayName],
      documento: [document],
      parentesco: [member.parentesco ?? '', Validators.required],
      responsavel_familiar: [member.responsavel_familiar ?? false],
      contribui_renda: [member.contribui_renda ?? false],
      renda_individual: [member.renda_individual ?? ''],
      participa_servicos: [member.participa_servicos ?? false],
      observacoes: [member.observacoes ?? ''],
      usa_endereco_familia: [member.usa_endereco_familia ?? this.applyAddressToMembers]
    });
  }

  private lookupAddressByCep(cep: string): void {
    this.cepLookupError = null;
    this.http
      .get<ViaCepResponse>(`https://viacep.com.br/ws/${cep}/json/`)
      .pipe(finalize(() => this.familyForm.get('cep')?.markAsTouched()))
      .subscribe({
        next: (response) => {
          if (response?.erro) {
            this.cepLookupError = 'CEP no encontrado.';
            return;
          }

          this.familyForm.patchValue({
            logradouro: response.logradouro ?? '',
            bairro: response.bairro ?? '',
            municipio: response.localidade ?? '',
            uf: response.uf ?? ''
          });
        },
        error: () => {
          this.cepLookupError = 'Não foi possível consultar o CEP.';
        }
      });
  }

  private normalizeCep(value?: string | null): string | undefined {
    const digits = (value ?? '').replace(/\D/g, '');
    return digits || undefined;
  }

  private cepValidator = (control: AbstractControl): ValidationErrors | null => {
    const value = (control.value as string | null | undefined)?.replace(/\D/g, '') ?? '';
    if (!value) return null;
    return value.length === 8 ? null : { cep: true };
  };
}

interface ViaCepResponse {
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
}



























