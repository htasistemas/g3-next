import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faClock, faUserClock } from '@fortawesome/free-solid-svg-icons';
import { PopupMessagesComponent } from '../compartilhado/popup-messages/popup-messages.component';
import { TelaPadraoComponent } from '../compartilhado/tela-padrao/tela-padrao.component';
import { DialogComponent } from '../compartilhado/dialog/dialog.component';
import { BarraAcoesCrudComponent } from '../compartilhado/barra-acoes-crud/barra-acoes-crud.component';
import { PopupErrorBuilder } from '../../utils/popup-error.builder';
import { AuthService } from '../../services/auth.service';
import {
  FolhaPontoService,
  RhConfiguracaoPontoResponse,
  RhPontoAuditoriaResponse,
  RhPontoDiaResumoResponse,
  RhPontoEspelhoResponse,
  UnidadeAssistencialResponse
} from '../../services/folha-ponto.service';
import { UserPayload, UserService } from '../../services/user.service';
import { RuntimeConfigService } from '../../services/runtime-config.service';

interface TabItem {
  id: 'registro' | 'espelho' | 'configuracao' | 'auditoria';
  label: string;
}

@Component({
  selector: 'app-folha-ponto',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    FontAwesomeModule,
    RouterModule,
    TelaPadraoComponent,
    PopupMessagesComponent,
    DialogComponent,
    BarraAcoesCrudComponent
  ],
  templateUrl: './folha-ponto.component.html',
  styleUrl: './folha-ponto.component.scss'
})
export class FolhaPontoComponent implements OnInit {
  readonly faClock = faClock;
  readonly faUserClock = faUserClock;

  tabs: TabItem[] = [
    { id: 'registro', label: 'Registro diário' },
    { id: 'espelho', label: 'Espelho mensal' },
    { id: 'configuracao', label: 'Configuração' },
    { id: 'auditoria', label: 'Auditoria' }
  ];

  activeTab: TabItem['id'] = 'registro';

  acoesToolbar = {
    buscar: true,
    imprimir: true,
    salvar: false,
    excluir: false,
    novo: false,
    cancelar: false
  };

  acoesDesabilitadas = {
    buscar: false,
    imprimir: false,
    salvar: true,
    excluir: true,
    novo: true,
    cancelar: true
  };

  popupErros: string[] = [];
  popupTitulo = 'Campos obrigatórios';

  dialogBatidaAberta = false;
  dialogOcorrenciaAberta = false;
  dialogDetalheHorarioAberta = false;
  dialogImpressaoAberta = false;
  senhaBatida = '';
  confirmandoBatida = false;
  tipoBatidaAtual: 'E1' | 'S1' | 'E2' | 'S2' | null = null;
  mobileBloqueado = false;

  espelho: RhPontoEspelhoResponse | null = null;
  configuracao: RhConfiguracaoPontoResponse | null = null;
  unidadeAssistencial: UnidadeAssistencialResponse | null = null;
  auditoria: RhPontoAuditoriaResponse[] = [];
  auditoriaCarregando = false;
  auditoriaResultado = '';
  auditoriaDataInicio = '';
  auditoriaDataFim = '';
  auditoriaLimite = 200;
  auditoriaFuncionarioId: number | null = null;
  horaAtual = '';
  usuarios: UserPayload[] = [];
  funcionarioSelecionadoId: number | null = null;
  espelhoMesSelecionado: number;
  espelhoAnoSelecionado: number;
  mesesEspelho: { valor: number; label: string }[] = [
    { valor: 1, label: 'Janeiro' },
    { valor: 2, label: 'Fevereiro' },
    { valor: 3, label: 'Março' },
    { valor: 4, label: 'Abril' },
    { valor: 5, label: 'Maio' },
    { valor: 6, label: 'Junho' },
    { valor: 7, label: 'Julho' },
    { valor: 8, label: 'Agosto' },
    { valor: 9, label: 'Setembro' },
    { valor: 10, label: 'Outubro' },
    { valor: 11, label: 'Novembro' },
    { valor: 12, label: 'Dezembro' }
  ];
  anosEspelho: number[] = [];

  configuracaoForm: FormGroup;
  horariosForm: FormGroup;
  ocorrenciaForm: FormGroup;
  pontoDiaEditandoId: number | null = null;
  usuarioDetalheHorario: UserPayload | null = null;
  diasSemana: { id: string; label: string }[] = [
    { id: 'segunda', label: 'Segunda-feira' },
    { id: 'terca', label: 'Terça-feira' },
    { id: 'quarta', label: 'Quarta-feira' },
    { id: 'quinta', label: 'Quinta-feira' },
    { id: 'sexta', label: 'Sexta-feira' },
    { id: 'sabado', label: 'Sábado' },
    { id: 'domingo', label: 'Domingo' }
  ];

  constructor(
    private readonly fb: FormBuilder,
    private readonly service: FolhaPontoService,
    private readonly userService: UserService,
    private readonly auth: AuthService,
    private readonly router: Router,
    private readonly runtimeConfig: RuntimeConfigService
  ) {
    this.configuracaoForm = this.fb.group({
      cargaSemanalHoras: [40, Validators.required],
      cargaSegQuiHoras: [9, Validators.required],
      cargaSextaHoras: [4, Validators.required],
      cargaSabadoHoras: [0, Validators.required],
      cargaDomingoHoras: [0, Validators.required],
      toleranciaMinutos: [10, Validators.required],
      ignorarValidacaoRede: [false]
    });

    this.horariosForm = this.fb.group({
      horarioSegundaEntrada1: [''],
      horarioSegundaSaida1: [''],
      horarioSegundaEntrada2: [''],
      horarioSegundaSaida2: [''],
      horarioTercaEntrada1: [''],
      horarioTercaSaida1: [''],
      horarioTercaEntrada2: [''],
      horarioTercaSaida2: [''],
      horarioQuartaEntrada1: [''],
      horarioQuartaSaida1: [''],
      horarioQuartaEntrada2: [''],
      horarioQuartaSaida2: [''],
      horarioQuintaEntrada1: [''],
      horarioQuintaSaida1: [''],
      horarioQuintaEntrada2: [''],
      horarioQuintaSaida2: [''],
      horarioSextaEntrada1: [''],
      horarioSextaSaida1: [''],
      horarioSextaEntrada2: [''],
      horarioSextaSaida2: [''],
      horarioSabadoEntrada1: [''],
      horarioSabadoSaida1: [''],
      horarioSabadoEntrada2: [''],
      horarioSabadoSaida2: [''],
      horarioDomingoEntrada1: [''],
      horarioDomingoSaida1: [''],
      horarioDomingoEntrada2: [''],
      horarioDomingoSaida2: ['']
    });

    this.ocorrenciaForm = this.fb.group({
      ocorrencia: ['NORMAL', Validators.required],
      justificativa: ['', Validators.required],
      senhaAdmin: ['', Validators.required],
      entrada1: [''],
      saida1: [''],
      entrada2: [''],
      saida2: ['']
    });

    const hoje = new Date();
    this.espelhoMesSelecionado = hoje.getMonth() + 1;
    this.espelhoAnoSelecionado = hoje.getFullYear();
    const anoAtual = hoje.getFullYear();
    this.anosEspelho = [anoAtual - 2, anoAtual - 1, anoAtual, anoAtual + 1];
  }

  ngOnInit(): void {
    if (!this.isRhAdmin) {
      this.acoesToolbar.imprimir = false;
      this.acoesDesabilitadas.imprimir = true;
      this.tabs = this.tabs.filter((tab) => tab.id === 'registro' || tab.id === 'espelho');
    }
    this.mobileBloqueado = this.isMobileUserAgent();
    if (this.mobileBloqueado) {
      this.popupTitulo = 'Atenção';
      this.popupErros = new PopupErrorBuilder()
        .adicionar('Registro de ponto permitido apenas no computador da instituição.')
        .build();
    }
    this.carregarConfiguracao();
    this.carregarUnidadeAssistencial();
    this.carregarEspelhoAtual();
    this.iniciarRelogio();
    this.carregarUsuarios();
  }

  get isRhAdmin(): boolean {
    const permissoes = this.auth.user()?.permissoes ?? [];
    return permissoes.includes('RH_ADMIN') || permissoes.includes('ADMINISTRADOR');
  }

  get usuarioIdAtual(): number | null {
    const id = this.auth.user()?.id;
    return id ? Number(id) : null;
  }

  get funcionarioIdAtual(): number | null {
    return this.isRhAdmin
      ? this.funcionarioSelecionadoId ?? this.usuarioIdAtual
      : this.usuarioIdAtual;
  }

  getTabIndex(id: TabItem['id']): number {
    return this.tabs.findIndex((tab) => tab.id === id);
  }

  changeTab(tab: TabItem['id']): void {
    this.activeTab = tab;
    if (tab === 'espelho') {
      this.carregarEspelhoAtual();
    }
    if (tab === 'configuracao') {
      this.carregarConfiguracao();
    }
    if (tab === 'auditoria') {
      this.carregarAuditoria();
    }
  }

  onBuscar(): void {
    if (this.activeTab === 'auditoria') {
      this.carregarAuditoria();
      return;
    }
    this.carregarEspelhoAtual();
  }

  onImprimir(): void {
    if (!this.funcionarioIdAtual || !this.usuarioIdAtual) {
      return;
    }
    this.dialogImpressaoAberta = true;
  }

  onFechar(): void {
    this.router.navigate(['/dashboard/visao-geral']);
  }

  fecharPopupErros(): void {
    this.popupErros = [];
    this.popupTitulo = 'Campos obrigatórios';
  }

  carregarUsuarios(): void {
    this.userService.list().subscribe({
      next: (lista) => {
        this.usuarios = lista ?? [];
        if (!this.funcionarioSelecionadoId && this.usuarioIdAtual) {
          this.funcionarioSelecionadoId = this.usuarioIdAtual;
        }
        this.atualizarHorariosFuncionario();
      },
      error: () => {
        this.usuarios = [];
      }
    });
  }

  fecharDialogImpressao(): void {
    this.dialogImpressaoAberta = false;
  }

  imprimirEspelhoMensal(): void {
    if (!this.funcionarioIdAtual || !this.usuarioIdAtual) {
      return;
    }
    const referencia = this.referenciaAtual();
    this.service
      .imprimirEspelhoPdf(referencia.mes, referencia.ano, this.funcionarioIdAtual, this.usuarioIdAtual)
      .subscribe({
        next: (arquivo) => {
          this.dialogImpressaoAberta = false;
          this.abrirPdfEmNovaGuia(arquivo);
        },
        error: () => {
          this.popupTitulo = 'Erro';
          this.popupErros = new PopupErrorBuilder().adicionar('Não foi possível gerar o espelho mensal.').build();
        }
      });
  }

  imprimirRelacaoColaboradores(): void {
    if (!this.usuarioIdAtual) {
      return;
    }
    this.service.imprimirRelacaoColaboradores(this.usuarioIdAtual).subscribe({
      next: (arquivo) => {
        this.dialogImpressaoAberta = false;
        this.abrirPdfEmNovaGuia(arquivo);
      },
      error: () => {
        this.popupTitulo = 'Erro';
        this.popupErros = new PopupErrorBuilder().adicionar('Não foi possível gerar a relação de colaboradores.').build();
      }
    });
  }

  imprimirConfiguracaoPonto(): void {
    if (!this.usuarioIdAtual) {
      return;
    }
    this.service.imprimirConfiguracaoPonto(this.usuarioIdAtual).subscribe({
      next: (arquivo) => {
        this.dialogImpressaoAberta = false;
        this.abrirPdfEmNovaGuia(arquivo);
      },
      error: () => {
        this.popupTitulo = 'Erro';
        this.popupErros = new PopupErrorBuilder().adicionar('Não foi possível gerar a configuração do ponto.').build();
      }
    });
  }

  carregarUnidadeAssistencial(): void {
    this.service.buscarUnidadeAtual().subscribe({
      next: (response) => {
        this.unidadeAssistencial = response?.unidade ?? null;
      },
      error: () => {
        this.unidadeAssistencial = null;
      }
    });
  }

  carregarConfiguracao(): void {
    this.service.buscarConfiguracao().subscribe({
      next: (config) => {
        this.configuracao = config;
        this.configuracaoForm.patchValue({
          cargaSemanalHoras: this.minutosParaHoras(config.cargaSemanalMinutos),
          cargaSegQuiHoras: this.minutosParaHoras(config.cargaSegQuiMinutos),
          cargaSextaHoras: this.minutosParaHoras(config.cargaSextaMinutos),
          cargaSabadoHoras: this.minutosParaHoras(config.cargaSabadoMinutos),
          cargaDomingoHoras: this.minutosParaHoras(config.cargaDomingoMinutos),
          toleranciaMinutos: config.toleranciaMinutos,
          ignorarValidacaoRede: Boolean(config.ignorarValidacaoRede)
        });
      },
      error: () => {
        this.configuracao = null;
      }
    });
  }

  carregarEspelhoAtual(): void {
    const referencia = this.referenciaAtual();
    const funcionarioId = this.funcionarioIdAtual;
    if (!funcionarioId) {
      return;
    }
    this.service.consultarEspelho(referencia.mes, referencia.ano, funcionarioId).subscribe({
      next: (espelho) => {
        this.espelho = espelho;
      },
      error: () => {
        this.espelho = null;
      }
    });
  }

  carregarAuditoria(): void {
    if (!this.usuarioIdAtual || !this.isRhAdmin) {
      return;
    }
    this.auditoriaCarregando = true;
    const inicio = this.auditoriaDataInicio ? `${this.auditoriaDataInicio}T00:00:00` : null;
    const fim = this.auditoriaDataFim ? `${this.auditoriaDataFim}T23:59:59` : null;
    this.service
      .listarAuditoria(this.usuarioIdAtual, {
        funcionarioId: this.auditoriaFuncionarioId ? Number(this.auditoriaFuncionarioId) : null,
        resultado: this.auditoriaResultado || null,
        inicio,
        fim,
        limite: this.auditoriaLimite ? Number(this.auditoriaLimite) : null
      })
      .subscribe({
        next: (registros) => {
          this.auditoria = registros ?? [];
          this.auditoriaCarregando = false;
        },
        error: () => {
          this.auditoria = [];
          this.auditoriaCarregando = false;
          this.popupTitulo = 'Erro';
          this.popupErros = new PopupErrorBuilder()
            .adicionar('Não foi possível carregar a auditoria do ponto.')
            .build();
        }
      });
  }

  selecionarFuncionarioAuditoria(id: string): void {
    this.auditoriaFuncionarioId = id ? Number(id) : null;
    this.carregarAuditoria();
  }

  limparFiltrosAuditoria(): void {
    this.auditoriaResultado = '';
    this.auditoriaDataInicio = '';
    this.auditoriaDataFim = '';
    this.auditoriaFuncionarioId = null;
    this.auditoriaLimite = 200;
    this.carregarAuditoria();
  }

  obterNomeFuncionario(funcionarioId?: number | null): string {
    if (!funcionarioId) {
      return '---';
    }
    const usuario = this.usuarios.find((item) => item.id === funcionarioId);
    return usuario?.nome || usuario?.nomeUsuario || '---';
  }

  obterDescricaoModoValidacao(modo?: string | null): string {
    if (!modo) {
      return 'IP público ou rede local';
    }
    const normalizado = modo.toUpperCase();
    if (normalizado === 'IP_PUBLICO') {
      return 'IP público';
    }
    if (normalizado === 'REDE_LOCAL') {
      return 'Rede local';
    }
    return 'IP público ou rede local';
  }

  obterDescricaoResultadoAuditoria(resultado?: string | null): string {
    if (!resultado) {
      return '---';
    }
    const normalizado = resultado.toUpperCase();
    if (normalizado === 'BLOQUEADO') {
      return 'Bloqueado';
    }
    if (normalizado === 'OK') {
      return 'OK';
    }
    return resultado;
  }

  iniciarBatida(tipo: 'E1' | 'S1' | 'E2' | 'S2'): void {
    if (!this.funcionarioIdAtual) {
      return;
    }
    if (this.mobileBloqueado && !this.runtimeConfig.pontoBypass && !this.configuracao?.ignorarValidacaoRede) {
      this.popupTitulo = 'Atenção';
      this.popupErros = new PopupErrorBuilder()
        .adicionar('Registro de ponto permitido apenas no computador da instituição.')
        .build();
      return;
    }
    this.tipoBatidaAtual = tipo;
    this.senhaBatida = '';
    this.confirmandoBatida = false;
    this.dialogBatidaAberta = true;
  }

  confirmarBatida(): void {
    if (!this.tipoBatidaAtual || !this.usuarioIdAtual) {
      return;
    }
    if (this.confirmandoBatida) {
      return;
    }
    if (!this.senhaBatida) {
      this.popupTitulo = 'Campos obrigatórios';
      this.popupErros = new PopupErrorBuilder().adicionar('Informe a senha para confirmar a batida.').build();
      return;
    }
    this.confirmandoBatida = true;
    const payload = {
      tipo: this.tipoBatidaAtual,
      senha: this.senhaBatida
    };
    this.service.baterPonto(this.usuarioIdAtual, payload).subscribe({
      next: () => {
        this.dialogBatidaAberta = false;
        this.popupTitulo = 'Sucesso';
        this.popupErros = new PopupErrorBuilder().adicionar('Registro de ponto realizado com sucesso.').build();
        this.activeTab = 'registro';
        this.carregarEspelhoAtual();
        this.confirmandoBatida = false;
      },
      error: (erro) => {
        this.popupTitulo = 'Erro';
        const mensagem = erro?.error?.mensagem || erro?.message || 'Não foi possível registrar o ponto.';
        this.popupErros = new PopupErrorBuilder().adicionar(mensagem).build();
        this.confirmandoBatida = false;
      }
    });
  }

  cancelarBatida(): void {
    this.dialogBatidaAberta = false;
    this.tipoBatidaAtual = null;
    this.confirmandoBatida = false;
  }

  abrirEditarOcorrencia(dia: RhPontoDiaResumoResponse): void {
    if (!dia.pontoDiaId) {
      return;
    }
    this.pontoDiaEditandoId = dia.pontoDiaId;
    this.ocorrenciaForm.patchValue({
      ocorrencia: dia.ocorrencia || 'NORMAL',
      justificativa: '',
      senhaAdmin: '',
      entrada1: dia.entradaManha || '',
      saida1: dia.saidaManha || '',
      entrada2: dia.entradaTarde || '',
      saida2: dia.saidaTarde || ''
    });
    this.dialogOcorrenciaAberta = true;
  }

  confirmarEditarOcorrencia(): void {
    if (!this.pontoDiaEditandoId || !this.usuarioIdAtual) {
      return;
    }
    if (this.ocorrenciaForm.invalid) {
      this.ocorrenciaForm.markAllAsTouched();
      this.popupTitulo = 'Campos obrigatórios';
      this.popupErros = new PopupErrorBuilder()
        .adicionar('Informe a justificativa e a senha administrativa.')
        .build();
      return;
    }
    const payload = this.ocorrenciaForm.getRawValue();
    this.service.atualizarDia(this.pontoDiaEditandoId, this.usuarioIdAtual, payload).subscribe({
      next: () => {
        this.dialogOcorrenciaAberta = false;
        this.carregarEspelhoAtual();
        this.popupTitulo = 'Sucesso';
        this.popupErros = new PopupErrorBuilder().adicionar('Ocorrência atualizada com sucesso.').build();
      },
      error: (erro) => {
        const mensagem = erro?.error?.mensagem || 'Não foi possível atualizar a ocorrência.';
        this.popupTitulo = 'Erro';
        this.popupErros = new PopupErrorBuilder().adicionar(mensagem).build();
      }
    });
  }

  cancelarEditarOcorrencia(): void {
    this.dialogOcorrenciaAberta = false;
  }

  abrirDetalheHorario(usuario: UserPayload): void {
    this.usuarioDetalheHorario = usuario;
    this.dialogDetalheHorarioAberta = true;
  }

  fecharDetalheHorario(): void {
    this.dialogDetalheHorarioAberta = false;
    this.usuarioDetalheHorario = null;
  }

  private abrirPdfEmNovaGuia(arquivo: Blob): void {
    const url = window.URL.createObjectURL(arquivo);
    window.open(url, '_blank');
    setTimeout(() => window.URL.revokeObjectURL(url), 1000);
  }

  obterHorarioDiaAtual(): { entrada1: string; saida1: string; entrada2: string; saida2: string } {
    const dia = this.obterDiaSemanaAtual();
    const valores = this.horariosForm.getRawValue();
    return {
      entrada1: valores[`horario${dia}Entrada1`] || '',
      saida1: valores[`horario${dia}Saida1`] || '',
      entrada2: valores[`horario${dia}Entrada2`] || '',
      saida2: valores[`horario${dia}Saida2`] || ''
    };
  }

  obterHoraRegistrada(tipo: 'E1' | 'S1' | 'E2' | 'S2'): string {
    const resumo = this.getResumoDiaAtual();
    if (!resumo) {
      return '';
    }
    if (tipo === 'E1') {
      return resumo.entradaManha || '';
    }
    if (tipo === 'S1') {
      return resumo.saidaManha || '';
    }
    if (tipo === 'E2') {
      return resumo.entradaTarde || '';
    }
    return resumo.saidaTarde || '';
  }

  obterHoraExibida(tipo: 'E1' | 'S1' | 'E2' | 'S2'): string {
    return this.obterHoraRegistrada(tipo) || this.horaAtual;
  }

  campoHorario(diaId: string, campo: string): string {
    return `horario${this.capitalizar(diaId)}${campo}`;
  }

  formatarHorarioDia(usuario: UserPayload, diaId: string): string {
    const chaveEntrada1 = `horario${this.capitalizar(diaId)}Entrada1` as keyof UserPayload;
    const chaveSaida1 = `horario${this.capitalizar(diaId)}Saida1` as keyof UserPayload;
    const chaveEntrada2 = `horario${this.capitalizar(diaId)}Entrada2` as keyof UserPayload;
    const chaveSaida2 = `horario${this.capitalizar(diaId)}Saida2` as keyof UserPayload;
    const entrada1 = usuario[chaveEntrada1] as string | undefined;
    const saida1 = usuario[chaveSaida1] as string | undefined;
    const entrada2 = usuario[chaveEntrada2] as string | undefined;
    const saida2 = usuario[chaveSaida2] as string | undefined;
    const primeiro = entrada1 || saida1 ? `${entrada1 || '--:--'} - ${saida1 || '--:--'}` : '--:--';
    const segundo = entrada2 || saida2 ? `${entrada2 || '--:--'} - ${saida2 || '--:--'}` : '--:--';
    return `${primeiro} | ${segundo}`;
  }

  obterValorHorarioUsuario(usuario: UserPayload, diaId: string, campo: string): string {
    const chave = this.campoHorario(diaId, campo) as keyof UserPayload;
    const valor = usuario[chave] as string | undefined;
    return valor || '';
  }

  salvarConfiguracao(): void {
    if (this.configuracaoForm.invalid || !this.usuarioIdAtual) {
      this.configuracaoForm.markAllAsTouched();
      return;
    }
    const valores = this.configuracaoForm.getRawValue();
    const payload = {
      cargaSemanalMinutos: this.horasParaMinutos(valores.cargaSemanalHoras),
      cargaSegQuiMinutos: this.horasParaMinutos(valores.cargaSegQuiHoras),
      cargaSextaMinutos: this.horasParaMinutos(valores.cargaSextaHoras),
      cargaSabadoMinutos: this.horasParaMinutos(valores.cargaSabadoHoras),
      cargaDomingoMinutos: this.horasParaMinutos(valores.cargaDomingoHoras),
      toleranciaMinutos: valores.toleranciaMinutos,
      ignorarValidacaoRede: Boolean(valores.ignorarValidacaoRede)
    };
    this.service.atualizarConfiguracao(this.usuarioIdAtual, payload).subscribe({
      next: (config) => {
        this.configuracao = config;
        this.popupTitulo = 'Sucesso';
        this.popupErros = new PopupErrorBuilder().adicionar('Configuração atualizada com sucesso.').build();
      },
      error: (erro) => {
        const mensagem = erro?.error?.mensagem || 'Não foi possível atualizar a configuração.';
        this.popupTitulo = 'Erro';
        this.popupErros = new PopupErrorBuilder().adicionar(mensagem).build();
      }
    });
  }

  selecionarFuncionario(id: string): void {
    this.funcionarioSelecionadoId = id ? Number(id) : null;
    this.carregarEspelhoAtual();
    this.atualizarHorariosFuncionario();
  }

  selecionarReferenciaEspelho(): void {
    this.carregarEspelhoAtual();
  }

  getResumoDiaAtual(): RhPontoDiaResumoResponse | null {
    if (!this.espelho) {
      return null;
    }
    const dataHoje = this.dataHojeIsoLocal();

    return this.espelho.dias.find((dia) => dia.data === dataHoje) ?? null;
  }

  proximoTipo(): 'E1' | 'S1' | 'E2' | 'S2' | null {
    const resumo = this.getResumoDiaAtual();
    if (!resumo) {
      return 'E1';
    }
    if (!resumo.entradaManha) {
      return 'E1';
    }
    if (!resumo.saidaManha) {
      return 'S1';
    }
    if (!resumo.entradaTarde) {
      return 'E2';
    }
    if (!resumo.saidaTarde) {
      return 'S2';
    }
    return null;
  }

  podeRegistrar(tipo: 'E1' | 'S1' | 'E2' | 'S2'): boolean {
    if (this.mobileBloqueado && !this.runtimeConfig.pontoBypass && !this.configuracao?.ignorarValidacaoRede) {
      return false;
    }
    return this.proximoTipo() === tipo;
  }

  formatarMinutos(minutos?: number | null): string {
    if (!minutos) {
      return '00:00';
    }
    const total = Math.max(0, minutos);
    const horas = Math.floor(total / 60);
    const resto = total % 60;
    return `${horas.toString().padStart(2, '0')}:${resto.toString().padStart(2, '0')}`;
  }

  cargaPrevistaHoje(): string {
    if (!this.configuracao) {
      return '--:--';
    }
    const diaSemana = new Date().getDay();
    if (diaSemana === 0) {
      return this.formatarMinutos(this.configuracao.cargaDomingoMinutos);
    }
    if (diaSemana === 6) {
      return this.formatarMinutos(this.configuracao.cargaSabadoMinutos);
    }
    if (diaSemana === 5) {
      return this.formatarMinutos(this.configuracao.cargaSextaMinutos);
    }
    return this.formatarMinutos(this.configuracao.cargaSegQuiMinutos);
  }

  horasTrabalhadasHoje(): string {
    const resumo = this.getResumoDiaAtual();
    if (!resumo) {
      return '00:00';
    }
    return this.formatarMinutos(resumo.totalTrabalhadoMinutos);
  }

  bancoHorasHoje(): string {
    const resumo = this.getResumoDiaAtual();
    if (!resumo) {
      return '00:00';
    }
    return this.formatarMinutos(resumo.bancoHorasMinutos ?? 0);
  }

  cargaDiariaSugerida(): string {
    const horasSemana = this.configuracaoForm?.get('cargaSemanalHoras')?.value;
    if (horasSemana === null || horasSemana === undefined || horasSemana === '') {
      return '--:--';
    }
    const minutos = Math.round(Number(horasSemana) * 60 / 5);
    return this.formatarMinutos(minutos);
  }

  salvarHorariosFuncionario(): void {
    if (!this.funcionarioIdAtual || !this.isRhAdmin) {
      return;
    }
    const usuario = this.usuarios.find((item) => item.id === this.funcionarioIdAtual);
    if (!usuario) {
      return;
    }
    const valores = this.limparHorarios(this.horariosForm.getRawValue());
    const payload = {
      nome: usuario.nome || usuario.nomeUsuario,
      email: usuario.email || usuario.nomeUsuario,
      permissoes: usuario.permissoes || [],
      ...valores,
      horarioEntrada1: valores['horarioSegundaEntrada1'] || undefined,
      horarioSaida1: valores['horarioSegundaSaida1'] || undefined,
      horarioEntrada2: valores['horarioSegundaEntrada2'] || undefined,
      horarioSaida2: valores['horarioSegundaSaida2'] || undefined
    };
    const usuarioId = this.usuarioIdAtual;
    if (!usuarioId) {
      this.popupTitulo = 'Erro';
      this.popupErros = new PopupErrorBuilder()
        .adicionar('Usuário atual não identificado.')
        .build();
      return;
    }
    this.userService.update(this.funcionarioIdAtual, payload, usuarioId).subscribe({
      next: (usuario) => {
        const indice = this.usuarios.findIndex((item) => item.id === usuario.id);
        if (indice >= 0) {
          this.usuarios[indice] = usuario;
        }
        this.atualizarHorariosFuncionario();
        this.popupTitulo = 'Sucesso';
        this.popupErros = new PopupErrorBuilder()
          .adicionar('Horários do funcionário atualizados com sucesso.')
          .build();
      },
      error: () => {
        this.popupTitulo = 'Erro';
        this.popupErros = new PopupErrorBuilder()
          .adicionar('Não foi possível atualizar os horários do funcionário.')
          .build();
      }
    });
  }

  private limparHorarios(valores: Record<string, string>): Record<string, string | null> {
    const resultado: Record<string, string | null> = {};
    Object.keys(valores).forEach((chave) => {
      const valor = valores[chave];
      resultado[chave] = valor && valor.trim() ? valor : null;
    });
    return resultado;
  }

  copiarHorarioDia(indice: number): void {
    if (indice <= 0 || indice >= this.diasSemana.length) {
      return;
    }
    const diaAtual = this.diasSemana[indice].id;
    const diaAnterior = this.diasSemana[indice - 1].id;
    const valores = this.horariosForm.getRawValue();
    const copiar = {
      [`horario${this.capitalizar(diaAtual)}Entrada1`]: valores[`horario${this.capitalizar(diaAnterior)}Entrada1`] || '',
      [`horario${this.capitalizar(diaAtual)}Saida1`]: valores[`horario${this.capitalizar(diaAnterior)}Saida1`] || '',
      [`horario${this.capitalizar(diaAtual)}Entrada2`]: valores[`horario${this.capitalizar(diaAnterior)}Entrada2`] || '',
      [`horario${this.capitalizar(diaAtual)}Saida2`]: valores[`horario${this.capitalizar(diaAnterior)}Saida2`] || ''
    };
    this.horariosForm.patchValue(copiar);
  }

  private referenciaAtual(): { mes: number; ano: number } {
    return { mes: this.espelhoMesSelecionado, ano: this.espelhoAnoSelecionado };
  }

  private dataHojeIsoLocal(): string {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const dia = String(hoje.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }

  private obterDiaSemanaAtual(): string {
    const dia = new Date().getDay();
    if (dia === 0) {
      return 'Domingo';
    }
    if (dia === 1) {
      return 'Segunda';
    }
    if (dia === 2) {
      return 'Terca';
    }
    if (dia === 3) {
      return 'Quarta';
    }
    if (dia === 4) {
      return 'Quinta';
    }
    if (dia === 5) {
      return 'Sexta';
    }
    return 'Sabado';
  }

  private capitalizar(valor: string): string {
    if (!valor) {
      return '';
    }
    return valor.charAt(0).toUpperCase() + valor.slice(1);
  }

  dataHojeCompleta(): string {
    const hoje = new Date();
    return hoje.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  }

  private iniciarRelogio(): void {
    const atualizar = () => {
      const agora = new Date();
      const horas = String(agora.getHours()).padStart(2, '0');
      const minutos = String(agora.getMinutes()).padStart(2, '0');
      this.horaAtual = `${horas}:${minutos}`;
    };
    atualizar();
    setInterval(atualizar, 60000);
  }

  private isMobileUserAgent(): boolean {
    const userAgent = navigator.userAgent || '';
    const normalizado = userAgent.toLowerCase();
    return /android|iphone|ipad|ipod|windows phone|iemobile|blackberry|opera mini|opera mobi|mobile|tablet/.test(
      normalizado
    );
  }

  private atualizarHorariosFuncionario(): void {
    const id = this.funcionarioIdAtual;
    if (!id) {
      return;
    }
    const usuario = this.usuarios.find((item) => item.id === id) ?? null;
    if (!usuario) {
      return;
    }
    this.horariosForm.patchValue(
      {
        horarioSegundaEntrada1: usuario.horarioSegundaEntrada1 || usuario.horarioEntrada1 || '',
        horarioSegundaSaida1: usuario.horarioSegundaSaida1 || usuario.horarioSaida1 || '',
        horarioSegundaEntrada2: usuario.horarioSegundaEntrada2 || usuario.horarioEntrada2 || '',
        horarioSegundaSaida2: usuario.horarioSegundaSaida2 || usuario.horarioSaida2 || '',
        horarioTercaEntrada1: usuario.horarioTercaEntrada1 || '',
        horarioTercaSaida1: usuario.horarioTercaSaida1 || '',
        horarioTercaEntrada2: usuario.horarioTercaEntrada2 || '',
        horarioTercaSaida2: usuario.horarioTercaSaida2 || '',
        horarioQuartaEntrada1: usuario.horarioQuartaEntrada1 || '',
        horarioQuartaSaida1: usuario.horarioQuartaSaida1 || '',
        horarioQuartaEntrada2: usuario.horarioQuartaEntrada2 || '',
        horarioQuartaSaida2: usuario.horarioQuartaSaida2 || '',
        horarioQuintaEntrada1: usuario.horarioQuintaEntrada1 || '',
        horarioQuintaSaida1: usuario.horarioQuintaSaida1 || '',
        horarioQuintaEntrada2: usuario.horarioQuintaEntrada2 || '',
        horarioQuintaSaida2: usuario.horarioQuintaSaida2 || '',
        horarioSextaEntrada1: usuario.horarioSextaEntrada1 || '',
        horarioSextaSaida1: usuario.horarioSextaSaida1 || '',
        horarioSextaEntrada2: usuario.horarioSextaEntrada2 || '',
        horarioSextaSaida2: usuario.horarioSextaSaida2 || '',
        horarioSabadoEntrada1: usuario.horarioSabadoEntrada1 || '',
        horarioSabadoSaida1: usuario.horarioSabadoSaida1 || '',
        horarioSabadoEntrada2: usuario.horarioSabadoEntrada2 || '',
        horarioSabadoSaida2: usuario.horarioSabadoSaida2 || '',
        horarioDomingoEntrada1: usuario.horarioDomingoEntrada1 || '',
        horarioDomingoSaida1: usuario.horarioDomingoSaida1 || '',
        horarioDomingoEntrada2: usuario.horarioDomingoEntrada2 || '',
        horarioDomingoSaida2: usuario.horarioDomingoSaida2 || ''
      },
      { emitEvent: false }
    );
  }

  converterNumero(valor: string | number | null | undefined): number | null {
    if (valor === null || valor === undefined || valor === '') {
      return null;
    }
    const numero = typeof valor === 'number' ? valor : Number(valor);
    return Number.isNaN(numero) ? null : numero;
  }

  private minutosParaHoras(minutos?: number | null): number {
    if (!minutos) {
      return 0;
    }
    return Number((minutos / 60).toFixed(2));
  }

  private horasParaMinutos(horas?: number | null): number {
    if (!horas) {
      return 0;
    }
    return Math.round(Number(horas) * 60);
  }
}

