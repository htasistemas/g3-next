import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faClipboardUser } from '@fortawesome/free-solid-svg-icons';
import {
  SituacaoVisita,
  VisitaAnexo,
  VisitaDomiciliar,
  VisitaDomiciliarService
} from '../../services/visita-domiciliar.service';
import { BeneficiaryPayload } from '../../services/beneficiary.service';
import { AssistanceUnitService } from '../../services/assistance-unit.service';
import {
  BeneficiarioApiPayload,
  BeneficiarioApiService
} from '../../services/beneficiario-api.service';

import {
  ConfigAcoesCrud,
  EstadoAcoesCrud,
  TelaBaseComponent
} from '../compartilhado/tela-base.component';
import { TelaPadraoComponent } from '../compartilhado/tela-padrao/tela-padrao.component';
import {
  AutocompleteComponent,
  AutocompleteOpcao
} from '../compartilhado/autocomplete/autocomplete.component';
interface StepTab {
  id: string;
  label: string;
}

@Component({
  selector: 'app-visita-domiciliar-gestao',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FontAwesomeModule,
    TelaPadraoComponent,
    AutocompleteComponent
  ],
  templateUrl: './visita-domiciliar-gestao.component.html',
  styleUrl: './visita-domiciliar-gestao.component.scss'
})
export class VisitaDomiciliarGestaoComponent
  extends TelaBaseComponent
  implements OnInit
{
  tabs: StepTab[] = [
    { id: 'identificacao', label: 'Identificação da visita' },
    { id: 'condicoes', label: 'Condições do domicílio' },
    { id: 'social', label: 'Situação familiar e social' },
    { id: 'registro', label: 'Registro da visita' },
    { id: 'anexos', label: 'Anexos' },
    { id: 'historico', label: 'Histórico do beneficiário' }
  ];
  readonly faClipboardUser = faClipboardUser;

  readonly tiposVisita = ['Social', 'Técnica', 'Acompanhamento', 'Retorno'];
  readonly situacoes: SituacaoVisita[] = ['Agendada', 'Em andamento', 'Realizada', 'Cancelada'];
  unidades: string[] = [];
  unidadePrincipalNome: string | null = null;
  readonly responsaveis = ['Equipe Social', 'Equipe Técnica', 'Voluntário dedicado'];
  readonly acoesToolbar: Required<ConfigAcoesCrud> = this.criarConfigAcoes({    
    salvar: true,
    excluir: true,
    novo: true,
    cancelar: true,
    imprimir: true,
    buscar: true
  });
  beneficiariosDados: BeneficiaryPayload[] = [];
  beneficiarioOpcoes: AutocompleteOpcao[] = [];
  beneficiarioTermo = '';
  beneficiariosLoading = false;
  beneficiariosError: string | null = null;
  beneficiarioSelecionado: BeneficiaryPayload | null = null;
  beneficiarioSelecionadoId: number | null = null;

  readonly situacaoMoradia = ['Própria', 'Alugada', 'Cedida', 'Ocupação'];
  readonly situacaoPosse = ['Regular', 'Irregular'];
  readonly saneamento = ['Rede geral', 'Fossa', 'Céu aberto'];
  readonly abastecimentoAgua = ['Rede geral', 'Poço', 'Carro-pipa'];
  readonly energia = ['Regular', 'Ligação alternativa', 'Sem energia'];
  readonly higiene = ['Boa', 'Regular', 'Ruim'];
  readonly riscos = ['Risco estrutural', 'Risco ambiental', 'Violência', 'Sem risco estrutural'];
  readonly beneficiosSociais = ['Bolsa Família', 'BPC', 'Auxílio aluguel', 'Outros'];
  readonly faixasRenda = ['Até 1 salário', '1 a 2 salários', '2 a 3 salários', 'Acima de 3 salários'];

  activeTab: StepTab['id'] = 'identificacao';
  visitForm: FormGroup;
  filterForm: FormGroup;
  anexoForm: FormGroup;

  visitas: VisitaDomiciliar[] = [];
  filteredVisitas: VisitaDomiciliar[] = [];

  feedback: string | null = null;
  saving = false;
  editingId: number | null = null;

  constructor(
    private readonly fb: FormBuilder,
    private readonly visitaService: VisitaDomiciliarService,
    private readonly beneficiarioApiService: BeneficiarioApiService,
    private readonly assistanceUnitService: AssistanceUnitService
  ) {
    super();
    this.visitForm = this.fb.group({
      identificacao: this.fb.group({
        unidade: ['', Validators.required],
        beneficiario: ['', Validators.required],
        responsavel: ['', Validators.required],
        dataVisita: ['', Validators.required],
        horarioInicial: ['', Validators.required],
        horarioFinal: [''],
        tipoVisita: ['Social'],
        situacao: ['Agendada', Validators.required],
        usarEnderecoBeneficiario: [true],
        endereco: this.fb.group({
          logradouro: [''],
          numero: [''],
          bairro: [''],
          cidade: [''],
          uf: [''],
          cep: ['']
        }),
        observacoesIniciais: ['']
      }),
      condicoes: this.fb.group({
        tipoMoradia: [''],
        situacaoPosse: [''],
        comodos: [null],
        saneamento: [''],
        abastecimentoAgua: [''],
        energiaEletrica: [''],
        condicoesHigiene: [''],
        situacaoRisco: this.fb.control<string[]>([]),
        observacoes: ['']
      }),
      situacaoSocial: this.fb.group({
        rendaFamiliar: [''],
        faixaRenda: [''],
        beneficios: this.fb.control<string[]>([]),
        redeApoio: [''],
        vinculos: [''],
        observacoes: ['']
      }),
      registro: this.fb.group({
        relato: [''],
        necessidades: [''],
        encaminhamentos: [''],
        orientacoes: [''],
        plano: [''],
        optaReceberCestaBasica: [null],
        aptoReceberCestaBasica: [null],
        motivoNaoReceberCestaBasica: ['']
      }),
      anexos: this.fb.control<VisitaAnexo[]>([])
    });

    this.filterForm = this.fb.group({
      dataInicial: [''],
      dataFinal: [''],
      unidade: [''],
      situacao: [''],
      beneficiario: [''],
      responsavel: ['']
    });

    this.anexoForm = this.fb.group({
      nome: ['', Validators.required],
      tipo: ['PDF', Validators.required],
      tamanho: ['']
    });
  }

  ngOnInit(): void {
    this.loadUnidadePrincipal();
    this.loadBeneficiarios();
    this.loadVisitas();
  }

  private loadBeneficiarios(): void {
    this.beneficiariosLoading = true;
    this.beneficiariosError = null;

    this.beneficiarioApiService.list().subscribe({
      next: ({ beneficiarios }) => {
        this.beneficiariosDados = (beneficiarios ?? []).map((item) =>
          this.mapBeneficiarioApi(item)
        );
        this.atualizarOpcoesBeneficiario();
        this.beneficiariosLoading = false;
      },
      error: () => {
        this.beneficiariosDados = [];
        this.beneficiariosError = 'Não foi possível carregar os beneficiários.';
        this.beneficiarioOpcoes = [];
        this.beneficiariosLoading = false;
      }
    });
  }

  private loadUnidadePrincipal(): void {
    this.assistanceUnitService.get().subscribe({
      next: ({ unidade }) => {
        const nome =
          unidade?.nomeFantasia?.trim() || unidade?.razaoSocial?.trim() || '';
        if (!nome) return;
        this.unidadePrincipalNome = nome;
        this.unidades = [nome];
        this.visitForm
          .get('identificacao.unidade')
          ?.setValue(nome, { emitEvent: false });
      },
      error: () => {
        this.unidadePrincipalNome = null;
        this.unidades = [];
      }
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

  get acoesDesabilitadas(): EstadoAcoesCrud {
    return {
      salvar: this.saving || this.visitForm.invalid,
      excluir: !this.editingId,
      imprimir: !this.editingId,
      buscar: false
    };
  }

  get beneficiarioAptidao(): boolean {
    if (!this.beneficiarioSelecionado) return false;
    return (
      this.beneficiarioSelecionado.aptoReceberCestaBasica !== undefined ||
      this.beneficiarioSelecionado.optaReceberCestaBasica !== undefined
    );
  }

  get historicoBeneficiario(): VisitaDomiciliar[] {
    const beneficiario = this.visitForm.get('identificacao.beneficiario')?.value;
    if (!beneficiario) return [];
    return this.visitas.filter((visit) => visit.beneficiario === beneficiario);
  }

  changeTab(tab: StepTab['id']): void {
    this.activeTab = tab;
  }

  goToNextTab(): void {
    if (this.hasNextTab) this.changeTab(this.tabs[this.activeTabIndex + 1].id);
  }

  goToPreviousTab(): void {
    if (this.hasPreviousTab) this.changeTab(this.tabs[this.activeTabIndex - 1].id);
  }

  toggleSelection(path: (string | number)[], option: string): void {
    const control = this.visitForm.get(path);
    const current = new Set(control?.value ?? []);
    current.has(option) ? current.delete(option) : current.add(option);
    control?.setValue(Array.from(current));
  }

  selectionChecked(path: (string | number)[], option: string): boolean {
    const control = this.visitForm.get(path);
    return (control?.value as string[] | undefined)?.includes(option) ?? false;
  }

  addAnexo(): void {
    if (this.anexoForm.invalid) {
      this.anexoForm.markAllAsTouched();
      return;
    }

    const anexos = this.visitForm.get('anexos')?.value ?? [];
    const novo: VisitaAnexo = {
      id: Date.now(),
      nome: this.anexoForm.value.nome,
      tipo: this.anexoForm.value.tipo,
      tamanho: this.anexoForm.value.tamanho
    };
    this.visitForm.get('anexos')?.setValue([novo, ...anexos]);
    this.anexoForm.reset({ tipo: 'PDF' });
  }

  removerAnexo(anexo: VisitaAnexo): void {
    const anexos = (this.visitForm.get('anexos')?.value as VisitaAnexo[]) ?? [];
    this.visitForm
      .get('anexos')
      ?.setValue(anexos.filter((item) => item.id !== anexo.id));
  }

  aplicarFiltros(): void {
    const filtros = this.filterForm.value;
    this.filteredVisitas = this.visitas.filter((visita) => {
      const dataVisita = new Date(visita.dataVisita);
      const dataInicial = filtros.dataInicial ? new Date(filtros.dataInicial) : null;
      const dataFinal = filtros.dataFinal ? new Date(filtros.dataFinal) : null;

      const matchDataInicial = dataInicial ? dataVisita >= dataInicial : true;
      const matchDataFinal = dataFinal ? dataVisita <= dataFinal : true;
      const matchUnidade = filtros.unidade ? visita.unidade === filtros.unidade : true;
      const matchSituacao = filtros.situacao ? visita.situacao === filtros.situacao : true;
      const matchBeneficiario = filtros.beneficiario
        ? visita.beneficiario.toLowerCase().includes(filtros.beneficiario.toLowerCase())
        : true;
      const matchResponsavel = filtros.responsavel
        ? visita.responsavel.toLowerCase().includes(filtros.responsavel.toLowerCase())
        : true;

      return (
        matchDataInicial &&
        matchDataFinal &&
        matchUnidade &&
        matchSituacao &&
        matchBeneficiario &&
        matchResponsavel
      );
    });

    this.filteredVisitas.sort((a, b) => (a.dataVisita < b.dataVisita ? 1 : -1));
  }

  onBuscar(): void {
    this.changeTab('historico');
    this.aplicarFiltros();
  }

  submit(): void {
    if (this.visitForm.invalid) {
      this.visitForm.markAllAsTouched();
      this.feedback = 'Preencha os campos obrigatórios para salvar a visita.';
      return;
    }

    const situacao = this.visitForm.get('identificacao.situacao')?.value as SituacaoVisita;
    const relato = this.visitForm.get('registro.relato')?.value as string;

    if (situacao === 'Realizada' && !relato?.trim()) {
      this.feedback = 'Visitas realizadas exigem o relato técnico preenchido.';
      this.changeTab('registro');
      return;
    }

    this.feedback = null;
    this.saving = true;

    const payload = this.buildPayload();
    const request$ = this.editingId
      ? this.visitaService.update(this.editingId, payload)
      : this.visitaService.create(payload);

    request$.subscribe({
      next: () => {
        this.feedback = this.editingId
          ? 'Visita domiciliar atualizada com sucesso.'
          : 'Visita domiciliar registrada com sucesso.';
        this.loadVisitas();
        this.editingId = null;
        this.resetForm();
      },
      error: () => {
        this.feedback = 'Não foi possível salvar a visita domiciliar.';
      },
      complete: () => {
        this.saving = false;
      }
    });
  }

  editarVisita(visita: VisitaDomiciliar): void {
    this.editingId = visita.id;
    this.changeTab('identificacao');
    this.beneficiarioSelecionadoId = visita.beneficiarioId;
    this.beneficiarioTermo = visita.beneficiario;
    this.beneficiarioSelecionado =
      this.beneficiariosDados.find(
        (beneficiario) => Number(beneficiario.id) === visita.beneficiarioId
      ) ?? null;
    this.visitForm.patchValue({
      identificacao: {
        unidade: visita.unidade,
        beneficiario: visita.beneficiario,
        responsavel: visita.responsavel,
        dataVisita: visita.dataVisita,
        horarioInicial: visita.horarioInicial,
        horarioFinal: visita.horarioFinal,
        tipoVisita: visita.tipoVisita,
        situacao: visita.situacao,
        usarEnderecoBeneficiario: visita.usarEnderecoBeneficiario,
        endereco: visita.endereco,
        observacoesIniciais: visita.observacoesIniciais
      },
      condicoes: visita.condicoes,
      situacaoSocial: visita.situacaoSocial,
      registro: visita.registro,
      anexos: visita.anexos
    });
  }

  cancelarVisita(visita: VisitaDomiciliar): void {
    if (visita.situacao === 'Realizada') {
      this.feedback = 'Visitas realizadas não podem ser canceladas ou excluídas.';
      return;
    }

    const atualizado = { ...visita, situacao: 'Cancelada' as SituacaoVisita };
    this.visitaService.update(visita.id, atualizado).subscribe({
      next: () => {
        this.feedback = 'Visita cancelada e registrada com sucesso.';
        this.loadVisitas();
      },
      error: () => {
        this.feedback = 'Não foi possível cancelar a visita.';
      }
    });
  }

  excluirVisita(visita: VisitaDomiciliar): void {
    if (visita.situacao === 'Realizada') {
      this.feedback =
        'Visitas realizadas não podem ser excluídas. Utilize a ação de cancelamento se necessário.';
      return;
    }

    this.visitaService.delete(visita.id).subscribe({
      next: () => {
        this.feedback = 'Visita removida do histórico.';
        if (this.editingId === visita.id) {
          this.editingId = null;
          this.resetForm();
        }
        this.loadVisitas();
      },
      error: () => {
        this.feedback = 'Não foi possível excluir a visita.';
      }
    });
  }

  novaVisita(): void {
    this.editingId = null;
    this.resetForm();
  }

  private loadVisitas(): void {
    this.visitaService.list().subscribe({
      next: (visitas) => {
        this.visitas = visitas;
        this.aplicarFiltros();
      },
      error: () => {
        this.visitas = [];
        this.filteredVisitas = [];
        this.feedback = 'Não foi possível carregar as visitas domiciliares.';
      }
    });
  }

  resetForm(): void {
    this.visitForm.reset({
      identificacao: {
        unidade: this.unidadePrincipalNome ?? '',
        beneficiario: '',
        responsavel: '',
        dataVisita: '',
        horarioInicial: '',
        horarioFinal: '',
        tipoVisita: 'Social',
        situacao: 'Agendada',
        usarEnderecoBeneficiario: true,
        endereco: {
          logradouro: '',
          numero: '',
          bairro: '',
          cidade: '',
          uf: '',
          cep: ''
        },
        observacoesIniciais: ''
      },
      condicoes: {
        tipoMoradia: '',
        situacaoPosse: '',
        comodos: null,
        saneamento: '',
        abastecimentoAgua: '',
        energiaEletrica: '',
        condicoesHigiene: '',
        situacaoRisco: [],
        observacoes: ''
      },
      situacaoSocial: {
        rendaFamiliar: '',
        faixaRenda: '',
        beneficios: [],
        redeApoio: '',
        vinculos: '',
        observacoes: ''
      },
      registro: {
        relato: '',
        necessidades: '',
        encaminhamentos: '',
        orientacoes: '',
        plano: '',
        optaReceberCestaBasica: null,
        aptoReceberCestaBasica: null,
        motivoNaoReceberCestaBasica: ''
      },
      anexos: []
    });
    this.anexoForm.reset({ tipo: 'PDF' });
    this.activeTab = 'identificacao';
    this.beneficiarioSelecionado = null;
    this.beneficiarioSelecionadoId = null;
    this.beneficiarioTermo = '';
    this.beneficiarioOpcoes = [];
  }

  dismissFeedback(): void {
    this.feedback = null;
  }

  closeForm(): void {
    window.history.back();
  }

  handleExcluir(): void {
    if (!this.editingId) {
      this.feedback = 'Selecione uma visita para excluir.';
      return;
    }
    const visita = this.visitas.find((item) => item.id === this.editingId);
    if (!visita) {
      this.feedback = 'Visita não encontrada para exclusão.';
      return;
    }
    this.excluirVisita(visita);
  }

  imprimirVisita(): void {
    window.print();
  }

  formatarAptidaoDoacoes(): string {
    const beneficiario = this.beneficiarioSelecionado;
    if (!beneficiario) return 'Não informado';
    if (beneficiario.optaReceberCestaBasica === false) {
      return 'Não opta por cesta básica';
    }
    if (beneficiario.aptoReceberCestaBasica === true) {
      return 'Apto para receber doações';
    }
    if (beneficiario.aptoReceberCestaBasica === false) {
      return 'Não apto para receber doações';
    }
    return 'Não informado';
  }

  atualizarTermoBeneficiario(termo: string): void {
    this.beneficiarioTermo = termo;
    this.atualizarOpcoesBeneficiario();
  }

  selecionarBeneficiario(opcao: AutocompleteOpcao): void {
    this.beneficiarioTermo = opcao.label;
    this.visitForm.get('identificacao.beneficiario')?.setValue(opcao.label);
    this.beneficiarioSelecionadoId = Number(opcao.id);
    this.beneficiarioSelecionado =
      this.beneficiariosDados.find(
        (beneficiario) => Number(beneficiario.id) === this.beneficiarioSelecionadoId
      ) ?? null;
    this.atualizarOpcoesBeneficiario();
    this.onToggleEnderecoBeneficiario();
  }

  onToggleEnderecoBeneficiario(): void {
    const usarEndereco =
      this.visitForm.get('identificacao.usarEnderecoBeneficiario')?.value ?? false;
    if (!usarEndereco || !this.beneficiarioSelecionado) return;

    const beneficiario = this.beneficiarioSelecionado;
    this.visitForm.get('identificacao.endereco')?.patchValue({
      logradouro: beneficiario.logradouro ?? beneficiario.endereco ?? '',
      numero: beneficiario.numero ?? beneficiario.numeroEndereco ?? '',
      bairro: beneficiario.bairro ?? '',
      cidade: beneficiario.cidade ?? '',
      uf: beneficiario.uf ?? beneficiario.estado ?? '',
      cep: beneficiario.cep ?? ''
    });
  }

  onOptaCestaBasicaChange(): void {
    const opta = this.visitForm.get('registro.optaReceberCestaBasica')?.value;
    if (opta !== true) {
      this.visitForm.get('registro.aptoReceberCestaBasica')?.setValue(null);
      this.visitForm.get('registro.motivoNaoReceberCestaBasica')?.setValue('');
    }
  }

  onAptoCestaBasicaChange(): void {
    const apto = this.visitForm.get('registro.aptoReceberCestaBasica')?.value;
    if (apto === true) {
      this.visitForm.get('registro.motivoNaoReceberCestaBasica')?.setValue('');
    }
  }

  marcarVisitaRealizada(visita: VisitaDomiciliar): void {
    if (visita.situacao === 'Realizada') return;
    const atualizado = { ...visita, situacao: 'Realizada' as SituacaoVisita };
    this.visitaService.update(visita.id, atualizado).subscribe({
      next: () => {
        this.feedback = 'Visita marcada como realizada.';
        this.loadVisitas();
      },
      error: () => {
        this.feedback = 'Não foi possível atualizar a visita.';
      }
    });
  }

  private atualizarOpcoesBeneficiario(): void {
    const termoNormalizado = this.normalizarTexto(this.beneficiarioTermo);
    this.beneficiarioOpcoes = this.beneficiariosDados
      .filter((beneficiario) => {
        if (!termoNormalizado) return true;
        const nome = beneficiario.nomeCompleto ?? '';
        return this.normalizarTexto(nome).includes(termoNormalizado);
      })
      .slice(0, 20)
      .map((beneficiario) => ({
        id: beneficiario.id ?? '',
        label: beneficiario.nomeCompleto || 'Beneficiário'
      }));
  }

  private normalizarTexto(valor: string): string {
    return valor
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  private mapBeneficiarioApi(beneficiario: BeneficiarioApiPayload): BeneficiaryPayload {
    const nomeCompleto =
      beneficiario.nome_completo || beneficiario.nome_social || 'Beneficiário';
    return {
      id: beneficiario.id_beneficiario ? Number(beneficiario.id_beneficiario) : undefined,
      nomeCompleto,
      cep: beneficiario.cep ?? '',
      documentos: beneficiario.cpf ?? '',
      dataNascimento: beneficiario.data_nascimento ?? '',
      email: beneficiario.email ?? '',
      logradouro: beneficiario.logradouro ?? '',
      endereco: beneficiario.logradouro ?? '',
      numero: beneficiario.numero ?? '',
      numeroEndereco: beneficiario.numero ?? '',
      bairro: beneficiario.bairro ?? '',
      cidade: beneficiario.municipio ?? '',
      uf: beneficiario.uf ?? '',
      optaReceberCestaBasica: beneficiario.opta_receber_cesta_basica,
      aptoReceberCestaBasica: beneficiario.apto_receber_cesta_basica,
      documentosAnexos: []
    };
  }

  private buildPayload(): VisitaDomiciliar {
    const value = this.visitForm.value;
    return {
      id: this.editingId ?? 0,
      beneficiarioId: this.beneficiarioSelecionadoId ?? 0,
      unidade: value.identificacao?.unidade || '',
      beneficiario: value.identificacao?.beneficiario || '',
      responsavel: value.identificacao?.responsavel || '',
      dataVisita: value.identificacao?.dataVisita || '',
      horarioInicial: value.identificacao?.horarioInicial || '',
      horarioFinal: value.identificacao?.horarioFinal || '',
      tipoVisita: value.identificacao?.tipoVisita || 'Social',
      situacao: (value.identificacao?.situacao as SituacaoVisita) || 'Agendada',
      usarEnderecoBeneficiario: value.identificacao?.usarEnderecoBeneficiario ?? true,
      endereco: value.identificacao?.endereco || {},
      observacoesIniciais: value.identificacao?.observacoesIniciais,
      condicoes: value.condicoes || {},
      situacaoSocial: value.situacaoSocial || {},
      registro: value.registro || {},
      anexos: value.anexos ?? [],
      createdAt: this.editingId
        ? this.visitas.find((v) => v.id === this.editingId)?.createdAt ?? new Date().toISOString()
        : new Date().toISOString()
    };
  }
}

