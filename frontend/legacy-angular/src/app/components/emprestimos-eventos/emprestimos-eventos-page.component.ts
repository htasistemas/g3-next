import { Component, HostListener, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PopupErrorBuilder } from '../../utils/popup-error.builder';
import { EmprestimosEventosService, EmprestimoEventoRequest, EmprestimoEventoResponse, EmprestimoEventoItemResponse, EventoEmprestimoResponse, TipoItemEmprestimo, AgendaDiaDetalheResponse, AgendaResumoDiaResponse, DisponibilidadeItemResponse, EmprestimoEventoMovimentacaoResponse } from '../../services/emprestimos-eventos.service';
import { UserPayload, UserService } from '../../services/user.service';
import { Patrimonio, PatrimonioService } from '../../services/patrimonio.service';
import { AlmoxarifadoService, StockItem } from '../../services/almoxarifado.service';
import { ReportService } from '../../services/report.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { AssistanceUnitPayload, AssistanceUnitService } from '../../services/assistance-unit.service';
import { faCalendarCheck } from '@fortawesome/free-solid-svg-icons';

interface AbaItem {
  id: string;
  label: string;
  descricao: string;
}

interface AgendaDiaView {
  data: Date;
  numero: number;
  pertenceMes: boolean;
  temBloqueio: boolean;
  qtdEmprestimos: number;
}

interface DashboardResumo {
  totalEmprestimos: number;
  emprestimosAtivos: number;
  emprestimosAgendados: number;
  emprestimosDevolvidos: number;
  itensEmprestados: number;
  itensAgendados: number;
  diasComEmprestimos: number;
}

interface DashboardItemResumo {
  nome: string;
  quantidade: number;
  tipo: TipoItemEmprestimo;
}

interface DashboardDiaResumo {
  data: string;
  quantidade: number;
}

type RespostaErro = { error?: { message?: string } };

@Component({
  standalone: false,
  selector: 'app-emprestimos-eventos-page',
  templateUrl: './emprestimos-eventos-page.component.html',
  styleUrl: './emprestimos-eventos-page.component.scss'
})
export class EmprestimosEventosPageComponent implements OnInit {
  readonly faCalendarCheck = faCalendarCheck;

  readonly abas: AbaItem[] = [
    { id: 'dashboard', label: 'Dashboard', descricao: 'Visão geral dos empréstimos e itens.' },
    { id: 'agenda', label: 'Agenda', descricao: 'Calendário de indisponibilidade e eventos.' },
    { id: 'lista', label: 'Lista', descricao: 'Resumo dos empréstimos cadastrados.' },
    { id: 'cadastro', label: 'Cadastro', descricao: 'Dados principais do empréstimo.' },
    { id: 'itens', label: 'Itens', descricao: 'Itens vinculados ao empréstimo.' },
    { id: 'disponibilidade', label: 'Disponibilidade', descricao: 'Consulta por período e item.' },
    { id: 'historico', label: 'Histórico', descricao: 'Movimentações do empréstimo.' }
  ];

  abaAtiva = 'agenda';
  acoesBarra = {
    buscar: true,
    novo: true,
    salvar: true,
    cancelar: true,
    excluir: true,
    imprimir: true
  };
  acoesDesabilitadas = {
    buscar: false,
    novo: false,
    salvar: false,
    cancelar: false,
    excluir: true,
    imprimir: false
  };

  emprestimos: EmprestimoEventoResponse[] = [];
  emprestimoSelecionado: EmprestimoEventoResponse | null = null;
  eventos: EventoEmprestimoResponse[] = [];
  eventosOpcoes: { id: number; label: string }[] = [];
  eventoTermo = '';

  responsaveis: UserPayload[] = [];
  responsaveisOpcoes: { id: number; label: string }[] = [];
  responsavelTermo = '';

  patrimonios: Patrimonio[] = [];
  almoxarifadoItens: StockItem[] = [];
  unidadeAtualId: number | null = null;

  mesAgenda = new Date();
  diasAgenda: AgendaDiaView[] = [];
  resumoAgenda: AgendaResumoDiaResponse[] = [];
  modalAgendaAberto = false;
  modalAgendaData: Date | null = null;
  modalAgendaDetalhes: AgendaDiaDetalheResponse[] = [];
  modalAgendaQtdEmprestimos = 0;
  modalAgendaEventos: string[] = [];

  formEmprestimo: FormGroup;
  formularioItem: FormGroup;
  formularioDisponibilidade: FormGroup;
  formularioEvento: FormGroup;

  itensEmprestimo: EmprestimoEventoItemResponse[] = [];
  resultadoDisponibilidade: DisponibilidadeItemResponse | null = null;

  mensagensErro: string[] = [];
  feedbackLocal: string | null = null;
  formularioEventoAberto = false;
  eventoEmEdicaoId: number | null = null;
  eventoEmEdicaoInicio: string | null = null;
  eventoEmEdicaoFim: string | null = null;
  dialogExcluirEventoAberto = false;
  eventoParaExcluir: EventoEmprestimoResponse | null = null;

  movimentacoesEmprestimo: EmprestimoEventoMovimentacaoResponse[] = [];
  dialogImpressaoAberto = false;

  dashboardResumo: DashboardResumo = {
    totalEmprestimos: 0,
    emprestimosAtivos: 0,
    emprestimosAgendados: 0,
    emprestimosDevolvidos: 0,
    itensEmprestados: 0,
    itensAgendados: 0,
    diasComEmprestimos: 0
  };
  dashboardItensEmprestados: DashboardItemResumo[] = [];
  dashboardDiasComEmprestimos: DashboardDiaResumo[] = [];

  constructor(
    private readonly fb: FormBuilder,
    private readonly emprestimosService: EmprestimosEventosService,
    private readonly userService: UserService,
    private readonly patrimonioService: PatrimonioService,
    private readonly almoxarifadoService: AlmoxarifadoService,
    private readonly reportService: ReportService,
    private readonly authService: AuthService,
    private readonly roteador: Router,
    private readonly unidadeService: AssistanceUnitService
  ) {
    this.formEmprestimo = this.fb.group({
      eventoId: [null, Validators.required],
      dataRetiradaPrevista: ['', Validators.required],
      dataDevolucaoPrevista: ['', Validators.required],
      dataRetiradaReal: [''],
      dataDevolucaoReal: [''],
      responsavelId: [null, Validators.required],
      status: ['RASCUNHO', Validators.required],
      observacoes: ['']
    });

    this.formularioItem = this.fb.group({
      tipoItem: ['PATRIMONIO', Validators.required],
      itemId: [null, Validators.required],
      quantidade: [1, [Validators.required, Validators.min(1)]]
    });

    this.formularioDisponibilidade = this.fb.group({
      tipoItem: ['PATRIMONIO', Validators.required],
      itemId: [null, Validators.required],
      quantidade: [1, [Validators.required, Validators.min(1)]],
      inicio: ['', Validators.required],
      fim: ['', Validators.required]
    });

    this.formularioEvento = this.fb.group({
      titulo: ['', Validators.required],
      descricao: [''],
      local: [''],
      dataInicio: [''],
      dataFim: ['']
    });
  }

  ngOnInit(): void {
    this.carregarEventos();
    this.carregarResponsaveis();
    this.carregarPatrimonios();
    this.carregarAlmoxarifado();
    this.carregarEmprestimos();
    this.atualizarAgendaResumo();
    this.unidadeService.get().subscribe({
      next: (resposta: { unidade: AssistanceUnitPayload | null }) => {
        this.unidadeAtualId = resposta.unidade?.id ?? null;
      },
      error: () => {
        this.unidadeAtualId = null;
      }
    });
    this.formEmprestimo.get('status')?.valueChanges.subscribe((status) => {
      this.atualizarEstadoCampos(String(status));
    });
  }

  alterarAba(tabId: string): void {
    this.abaAtiva = tabId;
    if (tabId === 'historico' && this.emprestimoSelecionado) {
      this.carregarMovimentacoes(this.emprestimoSelecionado.id);
    }
  }

  navegarParaAba(tabId: string): void {
    this.abaAtiva = tabId;
  }

  carregarEmprestimos(): void {
    this.emprestimosService.listar({}).subscribe({
      next: (resposta: { emprestimos: EmprestimoEventoResponse[] }) => {
        this.emprestimos = resposta.emprestimos ?? [];
        this.atualizarDashboard();
      },
      error: () => {
        this.feedbackLocal = 'Não foi possível carregar os empréstimos.';
      }
    });
  }

  carregarEventos(): void {
    this.emprestimosService.listarEventos().subscribe({
      next: (eventos: EventoEmprestimoResponse[]) => {
        this.eventos = eventos ?? [];
        this.eventosOpcoes = this.eventos.map((evento) => ({
          id: evento.id,
          label: evento.titulo
        }));
      },
      error: () => {
        this.eventos = [];
        this.eventosOpcoes = [];
      }
    });
  }

  carregarResponsaveis(): void {
    this.userService.list().subscribe({
      next: (users: UserPayload[]) => {
        this.responsaveis = users ?? [];
        this.responsaveisOpcoes = this.responsaveis.map((user) => ({
          id: user.id,
          label: user.nome || user.nomeUsuario
        }));
      },
      error: () => {
        this.responsaveis = [];
        this.responsaveisOpcoes = [];
      }
    });
  }

  carregarPatrimonios(): void {
    this.patrimonioService.list().subscribe({
      next: (patrimonios: Patrimonio[]) => {
        this.patrimonios = patrimonios ?? [];
        this.atualizarDashboard();
      },
      error: () => {
        this.patrimonios = [];
      }
    });
  }

  carregarAlmoxarifado(): void {
    this.almoxarifadoService.listItems().subscribe({
      next: (itens: StockItem[]) => {
        this.almoxarifadoItens = itens ?? [];
        this.atualizarDashboard();
      },
      error: () => {
        this.almoxarifadoItens = [];
      }
    });
  }

  onBuscar(): void {
    this.carregarEmprestimos();
  }

  onNovo(): void {
    this.emprestimoSelecionado = null;
    this.formEmprestimo.reset({
      status: 'RASCUNHO'
    });
    this.eventoTermo = '';
    this.responsavelTermo = '';
    this.itensEmprestimo = [];
    this.acoesDesabilitadas.excluir = true;
    this.abaAtiva = 'cadastro';
  }

  onCancelar(): void {
    this.onNovo();
  }

  onSalvar(): void {
    const erros = new PopupErrorBuilder();
    this.adicionarErrosObrigatoriosCadastro(erros);
    if (!this.itensEmprestimo.length) {
      erros.adicionar('Inclua ao menos um item antes de salvar.');
    }
    this.mensagensErro = erros.build();
    if (this.mensagensErro.length) {
      return;
    }

    const dados = this.montarPayloadEmprestimo();
    if (!dados) {
      return;
    }

    const requisicao = this.emprestimoSelecionado
      ? this.emprestimosService.atualizar(this.emprestimoSelecionado.id, dados)
      : this.emprestimosService.criar(dados);

    requisicao.subscribe({
      next: (resposta: EmprestimoEventoResponse) => {
        this.feedbackLocal = 'Emprestimo salvo com sucesso.';
        this.emprestimoSelecionado = resposta;
        this.itensEmprestimo = resposta.itens ?? this.itensEmprestimo;
        this.acoesDesabilitadas.excluir = false;
        this.carregarEmprestimos();
        this.carregarMovimentacoes(resposta.id);
      },
      error: (error: RespostaErro) => {
        this.feedbackLocal = error?.error?.message || 'Não foi possível salvar o empréstimo.';
      }
    });
  }

  abrirFormularioEvento(): void {
    this.formularioEvento.reset();
    this.formularioEventoAberto = true;
    this.eventoEmEdicaoId = null;
    this.eventoEmEdicaoInicio = null;
    this.eventoEmEdicaoFim = null;
  }

  @HostListener('document:keydown.escape')
  fecharFormularioEventoPorTecla(): void {
    if (this.formularioEventoAberto) {
      this.cancelarFormularioEvento();
    }
  }

  cancelarFormularioEvento(): void {
    this.formularioEvento.reset();
    this.formularioEventoAberto = false;
    this.eventoEmEdicaoId = null;
    this.eventoEmEdicaoInicio = null;
    this.eventoEmEdicaoFim = null;
  }

  salvarEvento(): void {
    const erros = new PopupErrorBuilder();
    this.adicionarErrosObrigatoriosEvento(erros);
    this.mensagensErro = erros.build();
    if (this.mensagensErro.length) {
      return;
    }
    const value = this.formularioEvento.getRawValue();
    const datas = this.obterDatasEvento(value);
    const payload = {
      titulo: value.titulo,
      descricao: value.descricao || null,
      local: value.local || null,
      dataInicio: datas.dataInicio,
      dataFim: datas.dataFim
    };
    const requisicao = this.eventoEmEdicaoId
      ? this.emprestimosService.atualizarEvento(this.eventoEmEdicaoId, payload)
      : this.emprestimosService.criarEvento(payload);
    requisicao.subscribe({
      next: (evento: EventoEmprestimoResponse) => {
        this.feedbackLocal = this.eventoEmEdicaoId
          ? 'Evento atualizado com sucesso.'
          : 'Evento criado com sucesso.';
        this.formularioEventoAberto = false;
        this.eventoEmEdicaoId = null;
        this.carregarEventos();
        this.formEmprestimo.patchValue({ eventoId: evento.id });
        this.eventoTermo = evento.titulo;
      },
      error: (error: RespostaErro) => {
        this.feedbackLocal =
          error?.error?.message || 'Não foi possível salvar o evento.';
      }
    });
  }

  onExcluir(emprestimo?: EmprestimoEventoResponse): void {
    const alvo = emprestimo ?? this.emprestimoSelecionado;
    if (!alvo) return;
    this.emprestimosService.cancelar(alvo.id).subscribe({
      next: (resposta: EmprestimoEventoResponse) => {
        this.feedbackLocal = 'Emprestimo cancelado.';
        this.emprestimoSelecionado = resposta;
        this.carregarEmprestimos();
      },
      error: () => {
        this.feedbackLocal = 'Não foi possível cancelar o empréstimo.';
      }
    });
  }

  onImprimir(): void {
    if (!this.emprestimoSelecionado) {
      this.feedbackLocal = 'Selecione um empréstimo para imprimir.';
      return;
    }

    this.dialogImpressaoAberto = true;
  }

  cancelarDialogoImpressao(): void {
    this.dialogImpressaoAberto = false;
  }

  imprimirEmprestimosSelecionado(): void {
    if (!this.emprestimoSelecionado) {
      this.feedbackLocal = 'Selecione um empréstimo para imprimir.';
      this.dialogImpressaoAberto = false;
      return;
    }
    this.dialogImpressaoAberto = false;
    this.reportService
      .generateEmprestimoEventoRelatorio({
        emprestimoId: String(this.emprestimoSelecionado.id),
        usuarioEmissor: this.usuarioEmissor()
      })
      .subscribe({
        next: (blob: Blob) => this.abrirPdf(blob),
        error: () => {
          this.feedbackLocal = 'Não foi possível gerar o relatorio.';
        }
      });
  }

  imprimirTermoSelecionado(): void {
    if (!this.emprestimoSelecionado) {
      this.feedbackLocal = 'Selecione um empréstimo para imprimir.';
      this.dialogImpressaoAberto = false;
      return;
    }
    this.dialogImpressaoAberto = false;
    this.reportService
      .generateEmprestimoEventoTermo({
        emprestimoId: String(this.emprestimoSelecionado.id),
        usuarioEmissor: this.usuarioEmissor()
      })
      .subscribe({
        next: (blob: Blob) => this.abrirPdf(blob),
        error: () => {
          this.feedbackLocal = 'Não foi possível gerar o termo.';
        }
      });
  }

  onFechar(): void {
    this.roteador.navigate(['/administrativo/patrimonio']);
  }

  selecionarEmprestimo(emprestimo: EmprestimoEventoResponse): void {
    this.emprestimoSelecionado = emprestimo;
    this.formEmprestimo.patchValue({
      eventoId: emprestimo.evento.id,
      dataRetiradaPrevista: this.formatarDataHoraInput(emprestimo.dataRetiradaPrevista),
      dataDevolucaoPrevista: this.formatarDataHoraInput(emprestimo.dataDevolucaoPrevista),
      dataRetiradaReal: this.formatarDataHoraInput(emprestimo.dataRetiradaReal),
      dataDevolucaoReal: this.formatarDataHoraInput(emprestimo.dataDevolucaoReal),
      responsavelId: emprestimo.responsavel?.id ?? null,
      status: emprestimo.status,
      observacoes: emprestimo.observacoes ?? ''
    });
    this.eventoTermo = emprestimo.evento.titulo;
    this.responsavelTermo = emprestimo.responsavel?.nome ?? '';
    this.itensEmprestimo = emprestimo.itens ?? [];
    this.acoesDesabilitadas.excluir = false;
    this.carregarMovimentacoes(emprestimo.id);
    this.atualizarEstadoCampos(emprestimo.status);
    this.alterarAba('cadastro');
  }

  adicionarItem(): void {
    if (this.formularioItem.invalid) {
      this.feedbackLocal = 'Preencha o item antes de adicionar.';
      return;
    }
    const value = this.formularioItem.getRawValue();
    const resumoItem = this.obterResumoItemLocal(value.itemId, value.tipoItem);
    const novoItem: EmprestimoEventoItemResponse = {
      itemId: Number(value.itemId),
      tipoItem: value.tipoItem as TipoItemEmprestimo,
      quantidade: Number(value.quantidade),
      statusItem: this.formEmprestimo.get('status')?.value || 'RASCUNHO',
      nomeItem: resumoItem.nomeItem,
      numeroPatrimonio: resumoItem.numeroPatrimonio
    };
    this.validarDisponibilidadeItem(novoItem);
  }

  private validarDisponibilidadeItem(item: EmprestimoEventoItemResponse): void {
    const período = this.obterPeriodoPrevisto();
    if (!período) {
      this.feedbackLocal = 'Informe o período do empréstimo antes de adicionar itens.';
      return;
    }
    this.emprestimosService
      .disponibilidade(this.montarParametrosDisponibilidadeItem(item, período))
      .subscribe({
        next: (resposta: DisponibilidadeItemResponse) => {
          if (!resposta.disponivel) {
            this.feedbackLocal = this.montarMensagemConflito(resposta);
            return;
          }
          this.itensEmprestimo = [...this.itensEmprestimo, item];
          this.formularioItem.reset({
            tipoItem: this.formularioItem.get('tipoItem')?.value || 'PATRIMONIO',
            quantidade: 1
          });
          this.feedbackLocal = 'Item adicionado.';
        },
        error: () => {
          this.feedbackLocal = 'Não foi possível validar a disponibilidade.';
        }
      });
  }

  removerItem(index: number): void {
    this.itensEmprestimo = this.itensEmprestimo.filter((_, idx) => idx !== index);
  }

  consultarDisponibilidade(): void {
    if (this.formularioDisponibilidade.invalid) {
      this.feedbackLocal = 'Preencha os campos obrigatorios para consultar.';
      return;
    }
    const value = this.formularioDisponibilidade.getRawValue();
    this.emprestimosService
      .disponibilidade({
        itemId: Number(value.itemId),
        tipoItem: value.tipoItem as TipoItemEmprestimo,
        quantidade: Number(value.quantidade),
        inicio: value.inicio,
        fim: value.fim
      })
      .subscribe({
        next: (resposta: DisponibilidadeItemResponse) => {
          this.resultadoDisponibilidade = resposta;
        },
        error: () => {
          this.feedbackLocal = 'Não foi possível consultar a disponibilidade.';
        }
      });
  }

  confirmarRetirada(emprestimo?: EmprestimoEventoResponse): void {
    const alvo = emprestimo ?? this.emprestimoSelecionado;
    if (!alvo) return;
    this.emprestimosService.confirmarRetirada(alvo.id).subscribe({
      next: (resposta: EmprestimoEventoResponse) => {
        this.emprestimoSelecionado = resposta;
        this.feedbackLocal = 'Retirada confirmada.';
        this.carregarEmprestimos();
      },
      error: () => {
        this.feedbackLocal = 'Não foi possível confirmar a retirada.';
      }
    });
  }

  confirmarDevolucao(emprestimo?: EmprestimoEventoResponse): void {
    const alvo = emprestimo ?? this.emprestimoSelecionado;
    if (!alvo) return;
    this.emprestimosService.confirmarDevolucao(alvo.id).subscribe({
      next: (resposta: EmprestimoEventoResponse) => {
        this.emprestimoSelecionado = resposta;
        this.feedbackLocal = 'Devolucao confirmada.';
        this.carregarEmprestimos();
      },
      error: () => {
        this.feedbackLocal = 'Não foi possível confirmar a devolucao.';
      }
    });
  }

  atualizarAgendaResumo(): void {
    const inicio = this.obterInicioMes(this.mesAgenda);
    const fim = this.obterFimMes(this.mesAgenda);
    this.emprestimosService.agendaResumo(inicio, fim).subscribe({
      next: (resumo: AgendaResumoDiaResponse[]) => {
        this.resumoAgenda = resumo ?? [];
        this.gerarCalendário();
      },
      error: () => {
        this.resumoAgenda = [];
        this.gerarCalendário();
      }
    });
  }

  mudarMes(delta: number): void {
    const novaData = new Date(this.mesAgenda.getFullYear(), this.mesAgenda.getMonth() + delta, 1);
    this.mesAgenda = novaData;
    this.atualizarAgendaResumo();
  }

  abrirDiaAgenda(dia: AgendaDiaView): void {
    this.modalAgendaAberto = true;
    this.modalAgendaData = dia.data;
    this.modalAgendaQtdEmprestimos = dia.qtdEmprestimos ?? 0;
    this.modalAgendaEventos = this.obterEventosDoDia(dia.data);
    const dataApi = this.formatarData(dia.data);
    this.emprestimosService.agendaDia(dataApi).subscribe({
      next: (detalhes: AgendaDiaDetalheResponse[]) => {
        this.modalAgendaDetalhes = detalhes ?? [];
      },
      error: () => {
        this.modalAgendaDetalhes = [];
      }
    });
  }

  fecharModalAgenda(): void {
    this.modalAgendaAberto = false;
    this.modalAgendaDetalhes = [];
    this.modalAgendaData = null;
    this.modalAgendaQtdEmprestimos = 0;
    this.modalAgendaEventos = [];
  }

  abrirEmprestimoDoModal(emprestimoId: number): void {
    this.emprestimosService.obter(emprestimoId).subscribe({
      next: (resposta: EmprestimoEventoResponse) => {
        this.selecionarEmprestimo(resposta);
        this.fecharModalAgenda();
        this.alterarAba('cadastro');
      }
    });
  }

  carregarMovimentacoes(emprestimoId: number): void {
    this.emprestimosService.listarMovimentacoes(emprestimoId).subscribe({
      next: (resposta: { movimentacoes: EmprestimoEventoMovimentacaoResponse[] }) => {
        this.movimentacoesEmprestimo = resposta.movimentacoes ?? [];
      },
      error: () => {
        this.movimentacoesEmprestimo = [];
      }
    });
  }

  private gerarCalendário(): void {
    const inicioMes = new Date(this.mesAgenda.getFullYear(), this.mesAgenda.getMonth(), 1);
    const fimMes = new Date(this.mesAgenda.getFullYear(), this.mesAgenda.getMonth() + 1, 0);
    const primeiroDiaSemana = inicioMes.getDay();
    const dias: AgendaDiaView[] = [];
    const totalDias = fimMes.getDate();

    const dataInicioGrid = new Date(inicioMes);
    dataInicioGrid.setDate(inicioMes.getDate() - primeiroDiaSemana);

    for (let i = 0; i < 42; i += 1) {
      const dataAtual = new Date(dataInicioGrid);
      dataAtual.setDate(dataInicioGrid.getDate() + i);
      const resumo = this.resumoAgenda.find((item) => item.data === this.formatarData(dataAtual));
      dias.push({
        data: dataAtual,
        numero: dataAtual.getDate(),
        pertenceMes: dataAtual.getMonth() === this.mesAgenda.getMonth(),
        temBloqueio: resumo?.temBloqueio ?? false,
        qtdEmprestimos: resumo?.qtdEmprestimos ?? 0
      });
    }
    this.diasAgenda = dias;
  }

  private montarPayloadEmprestimo(): EmprestimoEventoRequest | null {
    const value = this.formEmprestimo.getRawValue();
    if (!value.eventoId) {
      this.feedbackLocal = 'Selecione o evento.';
      return null;
    }
    return {
      eventoId: Number(value.eventoId),
      unidadeId: this.unidadeAtualId,
      responsavelId: value.responsavelId ? Number(value.responsavelId) : null,  
      dataRetiradaPrevista: value.dataRetiradaPrevista,
      dataDevolucaoPrevista: value.dataDevolucaoPrevista,
      dataRetiradaReal: value.dataRetiradaReal || null,
      dataDevolucaoReal: value.dataDevolucaoReal || null,
      status: value.status,
      observacoes: value.observacoes,
      itens: this.itensEmprestimo.map((item) => ({
        itemId: item.itemId,
        tipoItem: item.tipoItem,
        quantidade: item.quantidade,
        statusItem: item.statusItem,
        observacaoItem: item.observacaoItem ?? null
      }))
    };
  }

  private obterPeriodoPrevisto(): { inicio: string; fim: string } | null {      
    const inicio = this.formEmprestimo.get('dataRetiradaPrevista')?.value;      
    const fim = this.formEmprestimo.get('dataDevolucaoPrevista')?.value;        
    if (!inicio || !fim) return null;
    return { inicio, fim };
  }

  private adicionarErrosObrigatoriosCadastro(erros: PopupErrorBuilder): void {
    const camposObrigatorios = [
      { controle: 'eventoId', mensagem: 'Evento e obrigatorio.' },
      { controle: 'dataRetiradaPrevista', mensagem: 'Retirada prevista e obrigatoria.' },
      { controle: 'dataDevolucaoPrevista', mensagem: 'Devolucao prevista e obrigatoria.' },
      { controle: 'responsavelId', mensagem: 'Responsavel e obrigatorio.' }
    ];
    let encontrouErro = false;
    camposObrigatorios.forEach((campo) => {
      const control = this.formEmprestimo.get(campo.controle);
      if (control?.hasError('required')) {
        erros.adicionar(campo.mensagem);
        encontrouErro = true;
      }
    });
    if (encontrouErro) {
      this.formEmprestimo.markAllAsTouched();
    }
  }

  private adicionarErrosObrigatoriosEvento(erros: PopupErrorBuilder): void {
    const camposObrigatorios = [
      { controle: 'titulo', mensagem: 'Titulo do evento e obrigatorio.' }
    ];
    let encontrouErro = false;
    camposObrigatorios.forEach((campo) => {
      const control = this.formularioEvento.get(campo.controle);
      if (control?.hasError('required')) {
        erros.adicionar(campo.mensagem);
        encontrouErro = true;
      }
    });
    if (encontrouErro) {
      this.formularioEvento.markAllAsTouched();
    }
  }

  editarEvento(evento: EventoEmprestimoResponse): void {
    this.formularioEventoAberto = true;
    this.eventoEmEdicaoId = evento.id;
    this.eventoEmEdicaoInicio = evento.dataInicio;
    this.eventoEmEdicaoFim = evento.dataFim;
    this.formularioEvento.patchValue({
      titulo: evento.titulo,
      descricao: evento.descricao || '',
      local: evento.local || ''
    });
  }

  iniciarNovoEvento(): void {
    this.formularioEvento.reset();
    this.eventoEmEdicaoId = null;
    this.eventoEmEdicaoInicio = null;
    this.eventoEmEdicaoFim = null;
  }

  abrirDialogoExcluirEvento(evento: EventoEmprestimoResponse): void {
    this.eventoParaExcluir = evento;
    this.dialogExcluirEventoAberto = true;
  }

  cancelarExcluirEvento(): void {
    this.dialogExcluirEventoAberto = false;
    this.eventoParaExcluir = null;
  }

  confirmarExcluirEvento(): void {
    if (!this.eventoParaExcluir) return;
    const eventoId = this.eventoParaExcluir.id;
    this.emprestimosService.excluirEvento(eventoId).subscribe({
      next: () => {
        if (this.formEmprestimo.get('eventoId')?.value === eventoId) {
          this.formEmprestimo.patchValue({ eventoId: null });
          this.eventoTermo = '';
        }
        this.feedbackLocal = 'Evento excluido com sucesso.';
        this.cancelarExcluirEvento();
        this.carregarEventos();
      },
      error: (error: RespostaErro) => {
        this.feedbackLocal =
          error?.error?.message || 'Não foi possível excluir o evento.';
        this.cancelarExcluirEvento();
      }
    });
  }

  private obterDatasEvento(value: {
    dataInicio?: string | null;
    dataFim?: string | null;
  }): { dataInicio: string; dataFim: string } {
    if (value.dataInicio && value.dataFim) {
      return { dataInicio: value.dataInicio, dataFim: value.dataFim };
    }
    if (this.eventoEmEdicaoInicio && this.eventoEmEdicaoFim) {
      return { dataInicio: this.eventoEmEdicaoInicio, dataFim: this.eventoEmEdicaoFim };
    }
    const agora = new Date();
    const fim = new Date(agora.getTime() + 60 * 60 * 1000);
    return {
      dataInicio: this.formatarDataHoraInput(agora.toISOString()),
      dataFim: this.formatarDataHoraInput(fim.toISOString())
    };
  }

  private montarParametrosDisponibilidadeItem(
    item: EmprestimoEventoItemResponse,
    período: { inicio: string; fim: string }
  ): {
    itemId: number;
    tipoItem: TipoItemEmprestimo;
    quantidade?: number;
    inicio: string;
    fim: string;
    emprestimoId?: number;
  } {
    const parametros = {
      itemId: item.itemId,
      tipoItem: item.tipoItem,
      quantidade: item.quantidade,
      inicio: período.inicio,
      fim: período.fim
    };
    if (this.emprestimoSelecionado?.id) {
      return { ...parametros, emprestimoId: this.emprestimoSelecionado.id };
    }
    return parametros;
  }

  private montarMensagemConflito(resposta: DisponibilidadeItemResponse): string {
    if (!resposta?.conflitos?.length) {
      return 'Item indisponivel para o período informado.';
    }
    const conflito = resposta.conflitos[0];
    return `Item indisponivel: evento ${conflito.eventoTitulo} (${conflito.inicio} a ${conflito.fim}).`;
  }

  private formatarData(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatarDataHoraInput(value?: string | null): string {
    if (!value) return '';
    return value.slice(0, 16);
  }

  private atualizarDashboard(): void {
    const emprestimosValidos = this.emprestimos.filter((emprestimo) => emprestimo.status !== 'CANCELADO');
    const emprestimosAtivos = emprestimosValidos.filter((emprestimo) => emprestimo.status === 'RETIRADO');
    const emprestimosAgendados = emprestimosValidos.filter((emprestimo) => emprestimo.status === 'AGENDADO');
    const emprestimosDevolvidos = emprestimosValidos.filter((emprestimo) => emprestimo.status === 'DEVOLVIDO');

    const itensEmprestados = this.calcularTotalItens(emprestimosAtivos);
    const itensAgendados = this.calcularTotalItens(emprestimosAgendados);
    const diasResumo = this.calcularDiasComEmprestimos(emprestimosValidos);
    const itensResumo = this.calcularItensEmprestadosResumo(emprestimosAtivos);

    this.dashboardResumo = {
      totalEmprestimos: emprestimosValidos.length,
      emprestimosAtivos: emprestimosAtivos.length,
      emprestimosAgendados: emprestimosAgendados.length,
      emprestimosDevolvidos: emprestimosDevolvidos.length,
      itensEmprestados,
      itensAgendados,
      diasComEmprestimos: diasResumo.length
    };
    this.dashboardDiasComEmprestimos = diasResumo.slice(0, 8);
    this.dashboardItensEmprestados = itensResumo.slice(0, 6);
  }

  private calcularTotalItens(emprestimos: EmprestimoEventoResponse[]): number {
    return emprestimos.reduce((total, emprestimo) => {
      const itens = emprestimo.itens ?? [];
      return (
        total +
        itens.reduce((soma, item) => soma + (item.quantidade ?? 0), 0)
      );
    }, 0);
  }

  private calcularDiasComEmprestimos(emprestimos: EmprestimoEventoResponse[]): DashboardDiaResumo[] {
    const mapaDias = new Map<string, Set<number>>();
    emprestimos.forEach((emprestimo) => {
      const inicio = this.converterParaData(emprestimo.dataRetiradaPrevista);
      const fim = this.converterParaData(emprestimo.dataDevolucaoPrevista);
      if (!inicio || !fim) {
        return;
      }
      const dias = this.listarDiasIntervalo(inicio, fim);
      dias.forEach((dia) => {
        const chave = this.formatarData(dia);
        if (!mapaDias.has(chave)) {
          mapaDias.set(chave, new Set<number>());
        }
        mapaDias.get(chave)?.add(emprestimo.id);
      });
    });

    return Array.from(mapaDias.entries())
      .sort(([dataA], [dataB]) => dataA.localeCompare(dataB))
      .map(([data, ids]) => ({
        data: this.formatarDataCurta(data),
        quantidade: ids.size
      }));
  }

  private calcularItensEmprestadosResumo(
    emprestimos: EmprestimoEventoResponse[]
  ): DashboardItemResumo[] {
    const mapaItens = new Map<string, DashboardItemResumo>();
    emprestimos.forEach((emprestimo) => {
      const itens = emprestimo.itens ?? [];
      itens.forEach((item) => {
        const nome = this.obterNomeItem(item);
        const chave = `${item.tipoItem}-${item.itemId}-${nome}`;
        const atual = mapaItens.get(chave) ?? {
          nome,
          quantidade: 0,
          tipo: item.tipoItem
        };
        atual.quantidade += item.quantidade ?? 0;
        mapaItens.set(chave, atual);
      });
    });

    return Array.from(mapaItens.values()).sort((a, b) => b.quantidade - a.quantidade);
  }

  private obterNomeItem(item: EmprestimoEventoItemResponse): string {
    const nomeDireto = item.nomeItem || item.numeroPatrimonio;
    if (nomeDireto) {
      return nomeDireto;
    }
    const local = this.obterResumoItemLocal(item.itemId, item.tipoItem);
    return local.nomeItem || local.numeroPatrimonio || `Item ${item.itemId}`;
  }

  private converterParaData(valor?: string | null): Date | null {
    if (!valor) {
      return null;
    }
    const data = new Date(valor);
    if (Number.isNaN(data.getTime())) {
      return null;
    }
    data.setHours(0, 0, 0, 0);
    return data;
  }

  private listarDiasIntervalo(inicio: Date, fim: Date): Date[] {
    const dias: Date[] = [];
    const limiteDias = 180;
    const totalDias = Math.ceil((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
    if (totalDias > limiteDias) {
      dias.push(new Date(inicio));
      dias.push(new Date(fim));
      return dias;
    }
    const cursor = new Date(inicio);
    while (cursor <= fim) {
      dias.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return dias;
  }

  private obterEventosDoDia(data: Date): string[] {
    const eventos = new Set<string>();
    const alvo = new Date(data);
    alvo.setHours(0, 0, 0, 0);
    this.emprestimos.forEach((emprestimo) => {
      if (emprestimo.status === 'CANCELADO') {
        return;
      }
      const inicio = this.converterParaData(emprestimo.dataRetiradaPrevista);
      const fim = this.converterParaData(emprestimo.dataDevolucaoPrevista);
      if (!inicio || !fim) {
        return;
      }
      if (alvo >= inicio && alvo <= fim) {
        eventos.add(emprestimo.evento?.titulo || 'Evento não informado');
      }
    });
    return Array.from(eventos);
  }

  private formatarDataCurta(valor: string): string {
    const data = new Date(valor);
    if (Number.isNaN(data.getTime())) {
      return valor;
    }
    return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  }

  private obterInicioMes(date: Date): string {
    const inicio = new Date(date.getFullYear(), date.getMonth(), 1);
    return this.formatarData(inicio);
  }

  private obterFimMes(date: Date): string {
    const fim = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    return this.formatarData(fim);
  }

  private usuarioEmissor(): string {
    return (
      this.authService.user()?.nome ||
      this.authService.user()?.nomeUsuario ||
      'Sistema'
    );
  }

  private abrirPdf(blob: Blob): void {
    const url = window.URL.createObjectURL(blob);
    const win = window.open(url, '_blank', 'width=900,height=1100');
    if (!win) {
      this.feedbackLocal = 'Permita a abertura de pop-ups para visualizar o relatorio.';
      return;
    }
    win.addEventListener('load', () => {
      win.focus();
      win.print();
    }, { once: true });
    setTimeout(() => window.URL.revokeObjectURL(url), 60000);
  }

  private atualizarEstadoCampos(status: string): void {
    const bloquear = ['RETIRADO', 'DEVOLVIDO', 'CANCELADO'].includes(status);
    const campos = [
      'eventoId',
      'dataRetiradaPrevista',
      'dataDevolucaoPrevista',
      'responsavelId',
      'observacoes'
    ];
    campos.forEach((campo) => {
      const control = this.formEmprestimo.get(campo);
      if (!control) return;
      if (bloquear) {
        control.disable({ emitEvent: false });
      } else {
        control.enable({ emitEvent: false });
      }
    });
    this.acoesDesabilitadas.salvar = status === 'DEVOLVIDO' || status === 'CANCELADO';
    this.acoesDesabilitadas.excluir = status === 'DEVOLVIDO' || status === 'CANCELADO';
  }

  private obterResumoItemLocal(itemId: number, tipoItem: TipoItemEmprestimo): { nomeItem?: string; numeroPatrimonio?: string } {
    if (tipoItem === 'PATRIMONIO') {
      const patrimonio = this.patrimonios.find((item) => Number(item.idPatrimonio) === Number(itemId));
      if (patrimonio) {
        return { nomeItem: patrimonio.nome, numeroPatrimonio: patrimonio.numeroPatrimonio };
      }
    }
    if (tipoItem === 'ALMOXARIFADO') {
      const item = this.almoxarifadoItens.find((almox) => Number(almox.id) === Number(itemId));
      if (item) {
        return { nomeItem: item.description };
      }
    }
    return {};
  }
}







