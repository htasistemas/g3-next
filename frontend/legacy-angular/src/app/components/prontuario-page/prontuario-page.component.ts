import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faNotesMedical } from '@fortawesome/free-solid-svg-icons';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { BeneficiarioApiPayload, BeneficiarioApiService } from '../../services/beneficiario-api.service';
import { ProfessionalRecord, ProfessionalService } from '../../services/professional.service';
import { AssistanceUnitPayload, AssistanceUnitService } from '../../services/assistance-unit.service';
import {
  BeneficiarioResumo,
  ProntuarioFiltro,
  ProntuarioRegistroResponse,
  ProntuarioResumoResponse,
  ProntuarioService
} from '../../services/prontuario.service';
import { TelaPadraoComponent } from '../compartilhado/tela-padrao/tela-padrao.component';
import { PopupMessagesComponent } from '../compartilhado/popup-messages/popup-messages.component';
import { ProntuarioFiltrosComponent } from '../prontuario-filtros/prontuario-filtros.component';
import { ProntuarioTimelineComponent } from '../prontuario-timeline/prontuario-timeline.component';
import { ProntuarioIndicadoresComponent } from '../prontuario-indicadores/prontuario-indicadores.component';
import { AutocompleteOpcao } from '../compartilhado/autocomplete/autocomplete.component';
import { formatarDataSemFuso } from '../../utils/data-format.util';

@Component({
  selector: 'app-prontuario-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    TelaPadraoComponent,
    PopupMessagesComponent,
    FontAwesomeModule,
    ProntuarioFiltrosComponent,
    ProntuarioTimelineComponent,
    ProntuarioIndicadoresComponent
  ],
  templateUrl: './prontuario-page.component.html',
  styleUrl: './prontuario-page.component.scss'
})
export class ProntuarioPageComponent implements OnInit, OnDestroy {
  faNotesMedical = faNotesMedical;
  beneficiarioId: number | null = null;
  resumo: ProntuarioResumoResponse | null = null;
  registros: ProntuarioRegistroResponse[] = [];
  totalRegistros = 0;
  carregandoResumo = false;
  carregandoRegistros = false;
  popupErros: string[] = [];

  filtros: ProntuarioFiltro = { page: 0, pageSize: 10 };
  termoBusca = '';
  opcoesBeneficiarios: AutocompleteOpcao[] = [];
  carregandoBeneficiarios = false;
  erroBeneficiarios: string | null = null;

  profissionais: ProfessionalRecord[] = [];
  opcoesProfissionais: AutocompleteOpcao[] = [];
  unidadesAssistenciais: AssistanceUnitPayload[] = [];
  opcoesUnidades: AutocompleteOpcao[] = [];
  unidadePrincipal: AssistanceUnitPayload | null = null;

  mapaProfissionais: Record<number, string> = {};
  mapaUnidades: Record<number, string> = {};

  modoImpressao: 'resumo' | 'completo' | null = null;

  abas = [
    { id: 'linha', label: 'Linha do tempo', tipo: '' },
    { id: 'atendimentos', label: 'Atendimentos', tipo: 'atendimento' },
    { id: 'procedimentos', label: 'Procedimentos', tipo: 'procedimento' },
    { id: 'evolucoes', label: 'Evoluções', tipo: 'evolucao' },
    { id: 'encaminhamentos', label: 'Encaminhamentos', tipo: 'encaminhamento' },
    { id: 'documentos', label: 'Documentos/Anexos', tipo: 'documento' },
    { id: 'indicadores', label: 'Indicadores', tipo: '' }
  ];
  abaAtiva = 'linha';
  private readonly mapaTipoAba: Record<string, string> = {
    atendimentos: 'atendimento',
    procedimentos: 'procedimento',
    evolucoes: 'evolucao',
    encaminhamentos: 'encaminhamento',
    documentos: 'documento',
    linha: ''
  };

  formatarDataNascimento(valor?: string | null): string {
    return formatarDataSemFuso(valor);
  }

  get abaAtivaIndex(): number {
    return this.abas.findIndex((aba) => aba.id === this.abaAtiva);
  }

  get labelAbaAtiva(): string {
    return this.abas.find((aba) => aba.id === this.abaAtiva)?.label || 'Registros';
  }

  get registrosVisiveis(): ProntuarioRegistroResponse[] {
    if (this.abaAtiva === 'linha') {
      return this.registros;
    }
    if (this.abaAtiva === 'indicadores') {
      return [];
    }
    const tipo = this.mapaTipoAba[this.abaAtiva] ?? this.abaAtiva;
    return this.registros.filter((registro) => registro.tipo === tipo);
  }

  get totalRegistrosVisiveis(): number {
    if (this.abaAtiva === 'linha') {
      return this.totalRegistros;
    }
    if (this.abaAtiva === 'indicadores') {
      return 0;
    }
    return this.registrosVisiveis.length;
  }

  private buscarBeneficiario$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  acoesTopo = {
    imprimir: true,
    buscar: true
  };

  acoesDesabilitadas = {
    imprimir: false,
    buscar: false
  };

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly prontuarioService: ProntuarioService,
    private readonly beneficiarioService: BeneficiarioApiService,
    private readonly professionalService: ProfessionalService,
    private readonly unidadeService: AssistanceUnitService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const id = params.get('beneficiarioId');
      this.beneficiarioId = id ? Number(id) : null;
      if (this.beneficiarioId) {
        this.carregarResumo();
        this.carregarRegistros(true);
      } else {
        this.resumo = null;
        this.registros = [];
        this.totalRegistros = 0;
      }
    });

    this.buscarBeneficiario$
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((termo) => this.buscarBeneficiarios(termo));

    this.carregarProfissionais();
    this.carregarUnidadesAssistenciais();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
    this.router.navigate(['/atendimentos/prontuario', opcao.id]);
  }

  atualizarFiltros(filtros: ProntuarioFiltro): void {
    this.filtros = { ...filtros, page: 0, pageSize: this.filtros.pageSize ?? 10 };
    if (this.beneficiarioId) {
      this.carregarRegistros(true);
    }
  }

  limparFiltros(): void {
    this.filtros = { page: 0, pageSize: this.filtros.pageSize ?? 10 };
    if (this.beneficiarioId) {
      this.carregarRegistros(true);
    }
  }

  onBuscar(): void {
    if (this.beneficiarioId) {
      this.carregarRegistros(true);
      return;
    }
    this.buscarBeneficiario$.next(this.termoBusca);
  }

  selecionarAba(id: string, tipo: string): void {
    this.abaAtiva = id;
    if (id === 'linha') {
      this.atualizarFiltros({ ...this.filtros, tipo: '' });
      return;
    }
    if (id === 'indicadores') {
      return;
    }
    this.atualizarFiltros({ ...this.filtros, tipo });
  }

  carregarMais(): void {
    if (!this.beneficiarioId) {
      return;
    }
    this.filtros = { ...this.filtros, page: (this.filtros.page ?? 0) + 1 };
    this.carregarRegistros(false);
  }

  imprimirResumo(): void {
    this.modoImpressao = 'resumo';
    setTimeout(() => {
      window.print();
      this.modoImpressao = null;
    }, 200);
  }

  imprimirCompleto(): void {
    this.modoImpressao = 'completo';
    setTimeout(() => {
      window.print();
      this.modoImpressao = null;
    }, 200);
  }

  cancelarSelecao(): void {
    this.router.navigate(['/atendimentos/prontuario']);
  }

  aplicarFiltroTipo(tipo: string): void {
    const aba = this.abas.find((item) => item.tipo === tipo);
    if (aba) {
      this.abaAtiva = aba.id;
    }
    this.atualizarFiltros({ ...this.filtros, tipo });
  }

  aplicarFiltroProfissional(id: number): void {
    this.atualizarFiltros({ ...this.filtros, profissionalId: id });
  }

  aplicarFiltroUnidade(id: number): void {
    this.atualizarFiltros({ ...this.filtros, unidadeId: id });
  }

  private carregarResumo(): void {
    if (!this.beneficiarioId) {
      return;
    }
    this.carregandoResumo = true;
    this.prontuarioService.obterResumo(this.beneficiarioId).subscribe({
      next: (resumo) => {
        this.resumo = resumo;
        this.carregandoResumo = false;
      },
      error: () => {
        this.popupErros = ['Não foi possível carregar o resumo do prontuário.'];
        this.carregandoResumo = false;
      }
    });
  }

  private carregarRegistros(reset: boolean): void {
    if (!this.beneficiarioId) {
      return;
    }
    this.carregandoRegistros = true;
    const filtros = { ...this.filtros };
    this.prontuarioService.listarRegistros(this.beneficiarioId, filtros).subscribe({
      next: (lista) => {
        this.totalRegistros = lista.total;
        this.registros = reset ? lista.registros : [...this.registros, ...lista.registros];
        this.carregandoRegistros = false;
      },
      error: () => {
        this.popupErros = ['Não foi possível carregar os registros do prontuário.'];
        this.carregandoRegistros = false;
      }
    });
  }

  private buscarBeneficiarios(termo: string): void {
    this.carregandoBeneficiarios = true;
    this.erroBeneficiarios = null;
    const params = this.montarParametrosBuscaBeneficiario(termo);
    this.beneficiarioService.list(params).subscribe({
      next: ({ beneficiarios }) => {
        this.opcoesBeneficiarios = (beneficiarios ?? []).map((item: BeneficiarioApiPayload) => ({
          id: item.id_beneficiario ?? '',
          label: item.nome_completo,
          sublabel: item.cpf || item.codigo || ''
        }));
        this.carregandoBeneficiarios = false;
      },
      error: () => {
        this.erroBeneficiarios = 'Não foi possível buscar beneficiários.';
        this.carregandoBeneficiarios = false;
      }
    });
  }

  get beneficiarioSelecionado(): BeneficiarioResumo | null {
    return this.resumo?.beneficiario ?? null;
  }

  private carregarProfissionais(): void {
    this.professionalService.list().subscribe({
      next: (profissionais) => {
        this.profissionais = profissionais;
        this.opcoesProfissionais = profissionais.map((profissional) => ({
          id: Number(profissional.id),
          label: profissional.nomeCompleto,
          sublabel: profissional.especialidade || profissional.categoria
        }));
        this.mapaProfissionais = profissionais.reduce<Record<number, string>>((acc, profissional) => {
          const id = Number(profissional.id);
          if (!Number.isNaN(id)) {
            acc[id] = profissional.nomeCompleto;
          }
          return acc;
        }, {});
      },
      error: () => {
        this.opcoesProfissionais = [];
        this.mapaProfissionais = {};
      }
    });
  }

  private carregarUnidadesAssistenciais(): void {
    this.unidadeService.list().subscribe({
      next: (unidades) => {
        this.unidadesAssistenciais = unidades ?? [];
        this.unidadePrincipal =
          unidades.find((unidade) => unidade.unidadePrincipal) || unidades[0] || null;
        this.opcoesUnidades = unidades.map((unidade) => ({
          id: unidade.id ?? 0,
          label: unidade.nomeFantasia,
          sublabel: unidade.cidade || unidade.estado
        }));
        this.mapaUnidades = unidades.reduce<Record<number, string>>((acc, unidade) => {
          const id = unidade.id ?? 0;
          if (id) {
            acc[id] = unidade.nomeFantasia;
          }
          return acc;
        }, {});
      },
      error: () => {
        this.opcoesUnidades = [];
        this.mapaUnidades = {};
        this.unidadePrincipal = null;
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

    const apenasNumeros = valor.replace(/\D/g, '');
    const somenteNumeros = /^\d+$/.test(valor);

    if (apenasNumeros.length === 11) {
      return { cpf: apenasNumeros };
    }

    if (somenteNumeros && apenasNumeros.length > 0) {
      return { codigo: apenasNumeros };
    }

    return { nome: valor };
  }
}


