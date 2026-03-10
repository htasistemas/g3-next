import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faCarSide } from '@fortawesome/free-solid-svg-icons';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { PopupErrorBuilder } from '../../utils/popup-error.builder';
import { finalize, forkJoin } from 'rxjs';
import {
  ControleVeiculosService,
  MotoristaAutorizado,
  MotoristaAutorizadoEntrada,
  MotoristaDisponivel,
  RegistroDiarioBordo,
  RegistroDiarioBordoEntrada,
  VeiculoCadastro,
  VeiculoCadastroEntrada
} from '../../services/controle-veiculos.service';
import { AutocompleteComponent, AutocompleteOpcao } from '../compartilhado/autocomplete/autocomplete.component';
import { PopupMessagesComponent } from '../compartilhado/popup-messages/popup-messages.component';
import { TelaPadraoComponent } from '../compartilhado/tela-padrao/tela-padrao.component';
import { ConfigAcoesCrud, EstadoAcoesCrud, TelaBaseComponent } from '../compartilhado/tela-base.component';
import { DialogComponent } from '../compartilhado/dialog/dialog.component';

type AbaControleVeiculos = 'cadastro' | 'diario' | 'motoristas';

@Component({
  selector: 'app-controle-veiculos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    AutocompleteComponent,
    TelaPadraoComponent,
    PopupMessagesComponent,
    DialogComponent,
    FontAwesomeModule
  ],
  templateUrl: './controle-veiculos.component.html',
  styleUrl: './controle-veiculos.component.scss'
})
export class ControleVeiculosComponent extends TelaBaseComponent implements OnInit {
  readonly faCarSide = faCarSide;
  @ViewChild('cartaoMotoristas') cartaoMotoristas?: ElementRef<HTMLElement>;
  readonly abas: { id: AbaControleVeiculos; label: string; descricao: string }[] = [
    {
      id: 'cadastro',
      label: 'Cadastro de veiculos',
      descricao: 'Gerencie dados, condicao e status dos veiculos da frota.'
    },
    {
      id: 'diario',
      label: 'Mapa de bordo',
      descricao: 'Registre viagens e acompanhe km rodados e consumo.'
    },
    {
      id: 'motoristas',
      label: 'Motoristas autorizados',
      descricao: 'Defina quem pode conduzir os veiculos da instituicao.'
    }
  ];

  abaAtiva: AbaControleVeiculos = 'cadastro';

  readonly formularioVeiculo: FormGroup;
  readonly formularioDiario: FormGroup;
  readonly formularioMotorista: FormGroup;
  readonly tiposFoto = ['Frente', 'Lateral esquerda', 'Lateral direita', 'Traseira'];
  tipoFotoSelecionada = '';
  readonly marcasPrincipais = [
    'Chevrolet',
    'Fiat',
    'Volkswagen',
    'Ford',
    'Toyota',
    'Honda',
    'Hyundai',
    'Renault',
    'Nissan',
    'Jeep',
    'Peugeot',
    'Citroen',
    'BMW',
    'Mercedes-Benz',
    'Audi',
    'Kia',
    'Mitsubishi',
    'Chery',
    'BYD',
    'Volvo'
  ];

  veiculos: VeiculoCadastro[] = [];
  registros: RegistroDiarioBordo[] = [];
  motoristasDisponiveis: MotoristaDisponivel[] = [];
  motoristasAutorizados: MotoristaAutorizado[] = [];

  veiculoSelecionadoId: number | null = null;
  registroSelecionadoId: number | null = null;
  motoristaSelecionadoId: number | null = null;

  fotoFrentePreview: string | null = null;
  fotoLateralEsquerdaPreview: string | null = null;
  fotoLateralDireitaPreview: string | null = null;
  fotoTraseiraPreview: string | null = null;
  documentoVeiculoPdf: string | null = null;
  carteiraPdfSelecionada: string | null = null;
  carteiraPdfAberto = false;
  carteiraPdfSeguro: SafeResourceUrl | null = null;
  mostrarAlertaEdicao = false;

  termoMotorista = '';
  opcoesMotorista: AutocompleteOpcao[] = [];
  carregandoMotoristas = false;
  erroMotoristas: string | null = null;

  popupErros: string[] = [];
  mensagemFeedback: string | null = null;
  carregando = false;

  dialogoExclusaoAberto = false;
  dialogoTitulo = '';
  dialogoMensagem = '';
  dialogoConfirmarLabel = 'Excluir';
  tipoExclusao: 'veiculo' | 'registro' | 'motorista' | null = null;

  readonly acoesToolbar: Required<ConfigAcoesCrud> = this.criarConfigAcoes({
    buscar: true,
    novo: true,
    salvar: true,
    cancelar: true,
    excluir: true,
    imprimir: true
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly controleVeiculosService: ControleVeiculosService,
    private readonly sanitizer: DomSanitizer
  ) {
    super();
    const hojeIso = new Date().toISOString().substring(0, 10);

    this.formularioVeiculo = this.fb.group({
      placa: ['', [this.validarPlaca]],
      modelo: [''],
      marca: [''],
      ano: [new Date().getFullYear(), [Validators.min(1900)]],
      tipoCombustivel: [''],
      mediaConsumoPadrao: [null, [Validators.min(0.1)]],
      capacidadeTanqueLitros: [null],
      observacoes: [''],
      ativo: [true],
      fotoFrente: [null],
      fotoLateralEsquerda: [null],
      fotoLateralDireita: [null],
      fotoTraseira: [null],
      documentoVeiculoPdf: [null]
    });

    this.formularioDiario = this.fb.group({
      veiculoId: [null],
      data: [hojeIso],
      condutor: [''],
      horarioSaida: [''],
      kmInicial: [null, [Validators.min(0)]],
      horarioChegada: [''],
      kmFinal: [null, [Validators.min(0)]],
      destino: [''],
      observacoes: ['']
    });

    this.formularioMotorista = this.fb.group({
      veiculoIds: [[]],
      tipoOrigem: ['PROFISSIONAL'],
      motoristaId: [null],
      numeroCarteira: [''],
      categoriaCarteira: [''],
      vencimentoCarteira: [''],
      arquivoCarteiraPdf: [null]
    });
  }

  ngOnInit(): void {
    this.carregarDados();
  }

  get acoesDesabilitadas(): EstadoAcoesCrud {
    return {
      salvar: false,
      excluir: false,
      novo: false,
      cancelar: false,
      imprimir: false,
      buscar: false
    };
  }

  mudarAba(tabId: AbaControleVeiculos): void {
    this.abaAtiva = tabId;
    this.popupErros = [];
    this.mensagemFeedback = null;
    this.carregarDados();
    if (this.abaAtiva === 'motoristas' && !this.opcoesMotorista.length) {
      this.buscarMotoristasDisponiveis(this.termoMotorista);
    }
  }

  get indiceAbaAtiva(): number {
    return this.abas.findIndex((tab) => tab.id === this.abaAtiva);
  }

  selecionarVeiculo(veiculo: VeiculoCadastro): void {
    this.veiculoSelecionadoId = veiculo.id;
    this.fotoFrentePreview = veiculo.fotoFrente ?? null;
    this.fotoLateralEsquerdaPreview = veiculo.fotoLateralEsquerda ?? null;
    this.fotoLateralDireitaPreview = veiculo.fotoLateralDireita ?? null;
    this.fotoTraseiraPreview = veiculo.fotoTraseira ?? null;
    this.documentoVeiculoPdf = veiculo.documentoVeiculoPdf ?? null;
    this.formularioVeiculo.reset({
      placa: veiculo.placa,
      modelo: veiculo.modelo,
      marca: veiculo.marca,
      ano: veiculo.ano,
      tipoCombustivel: veiculo.tipoCombustivel,
      mediaConsumoPadrao: veiculo.mediaConsumoPadrao ?? null,
      capacidadeTanqueLitros: veiculo.capacidadeTanqueLitros ?? null,
      observacoes: veiculo.observacoes ?? '',
      ativo: veiculo.ativo,
      fotoFrente: veiculo.fotoFrente ?? null,
      fotoLateralEsquerda: veiculo.fotoLateralEsquerda ?? null,
      fotoLateralDireita: veiculo.fotoLateralDireita ?? null,
      fotoTraseira: veiculo.fotoTraseira ?? null,
      documentoVeiculoPdf: veiculo.documentoVeiculoPdf ?? null
    });
    this.abaAtiva = 'cadastro';
  }

  selecionarRegistro(registro: RegistroDiarioBordo): void {
    this.registroSelecionadoId = registro.id;
    this.formularioDiario.reset({
      veiculoId: registro.veiculoId,
      data: registro.data,
      condutor: registro.condutor,
      horarioSaida: registro.horarioSaida,
      kmInicial: registro.kmInicial,
      horarioChegada: registro.horarioChegada,
      kmFinal: registro.kmFinal,
      destino: registro.destino,
      observacoes: registro.observacoes ?? ''
    });
    this.abaAtiva = 'diario';
  }

  salvar(): void {
    this.popupErros = [];
    this.mensagemFeedback = null;
    if (this.abaAtiva === 'cadastro') {
      this.salvarVeiculo();
      return;
    }
    if (this.abaAtiva === 'diario') {
      this.salvarDiario();
      return;
    }
    this.salvarMotoristaAutorizado();
  }

  novo(): void {
    if (this.abaAtiva === 'cadastro') {
      this.limparFormularioVeiculo();
      return;
    }
    if (this.abaAtiva === 'diario') {
      this.limparFormularioDiario();
      return;
    }
    this.limparFormularioMotorista();
  }

  cancelar(): void {
    if (this.abaAtiva === 'cadastro') {
      this.limparFormularioVeiculo();
      return;
    }
    if (this.abaAtiva === 'diario') {
      this.limparFormularioDiario();
      return;
    }
    this.limparFormularioMotorista();
  }

  buscar(): void {
    this.popupErros = [];
    this.mensagemFeedback = null;
    this.carregarDados();
  }

  excluir(): void {
    this.popupErros = [];
    if (this.abaAtiva === 'cadastro') {
      if (!this.veiculoSelecionadoId) {
        this.popupErros = new PopupErrorBuilder()
          .adicionar('Selecione um veiculo para excluir.')
          .build();
        return;
      }
      this.tipoExclusao = 'veiculo';
      this.dialogoTitulo = 'Excluir veiculo';
      this.dialogoMensagem =
        'Deseja excluir este veiculo? Todos os registros de bordo vinculados serao removidos.';
      this.dialogoExclusaoAberto = true;
      return;
    }
    if (this.abaAtiva === 'diario') {
      if (!this.registroSelecionadoId) {
        this.popupErros = new PopupErrorBuilder()
          .adicionar('Selecione um registro de bordo para excluir.')
          .build();
        return;
      }
      this.tipoExclusao = 'registro';
      this.dialogoTitulo = 'Excluir registro';
      this.dialogoMensagem = 'Deseja excluir este registro do diario de bordo?';
      this.dialogoExclusaoAberto = true;
      return;
    }
    if (!this.motoristaSelecionadoId) {
      this.popupErros = new PopupErrorBuilder()
        .adicionar('Selecione um motorista autorizado para excluir.')
        .build();
      return;
    }
    this.tipoExclusao = 'motorista';
    this.dialogoTitulo = 'Excluir motorista autorizado';
    this.dialogoMensagem = 'Deseja excluir este motorista autorizado?';
    this.dialogoExclusaoAberto = true;
  }

  imprimir(): void {
    window.print();
  }

  fechar(): void {
    window.history.back();
  }

  confirmarExclusao(): void {
    if (this.tipoExclusao === 'veiculo' && this.veiculoSelecionadoId) {
      this.carregando = true;
      this.controleVeiculosService
        .removerVeiculo(this.veiculoSelecionadoId)
        .pipe(finalize(() => (this.carregando = false)))
        .subscribe({
          next: () => {
            this.limparFormularioVeiculo();
            this.mensagemFeedback = 'Veiculo removido com sucesso.';
            this.carregarDados();
          },
          error: () => {
            this.popupErros = new PopupErrorBuilder()
              .adicionar('Nao foi possivel excluir o veiculo.')
              .build();
          }
        });
    }

    if (this.tipoExclusao === 'registro' && this.registroSelecionadoId) {
      this.carregando = true;
      this.controleVeiculosService
        .removerRegistro(this.registroSelecionadoId)
        .pipe(finalize(() => (this.carregando = false)))
        .subscribe({
          next: () => {
            this.limparFormularioDiario();
            this.mensagemFeedback = 'Registro removido com sucesso.';
            this.carregarDados();
          },
          error: () => {
            this.popupErros = new PopupErrorBuilder()
              .adicionar('Nao foi possivel excluir o registro.')
              .build();
          }
        });
    }

    if (this.tipoExclusao === 'motorista' && this.motoristaSelecionadoId) {
      this.carregando = true;
      this.controleVeiculosService
        .removerMotoristaAutorizado(this.motoristaSelecionadoId)
        .pipe(finalize(() => (this.carregando = false)))
        .subscribe({
          next: () => {
            this.limparFormularioMotorista();
            this.mensagemFeedback = 'Motorista autorizado removido com sucesso.';
            this.carregarDados();
          },
          error: () => {
            this.popupErros = new PopupErrorBuilder()
              .adicionar('Nao foi possivel excluir o motorista autorizado.')
              .build();
          }
        });
    }

    this.fecharDialogoExclusao();
  }

  cancelarExclusao(): void {
    this.fecharDialogoExclusao();
  }

  fecharPopup(): void {
    this.popupErros = [];
  }

  get kmRodadosCalculado(): number {
    const kmInicial = Number(this.formularioDiario.get('kmInicial')?.value || 0);
    const kmFinal = Number(this.formularioDiario.get('kmFinal')?.value || 0);
    const distancia = kmFinal - kmInicial;
    return Number.isFinite(distancia) && distancia > 0 ? distancia : 0;
  }

  get mediaConsumoCalculada(): number {
    const veiculoId = Number(this.formularioDiario.get('veiculoId')?.value || 0);
    const veiculo = this.veiculos.find((item) => item.id === veiculoId);
    const mediaPadrao = Number(veiculo?.mediaConsumoPadrao || 0);
    return mediaPadrao > 0 ? mediaPadrao : 0;
  }

  get combustivelConsumidoCalculado(): number {
    const media = this.mediaConsumoCalculada;
    if (media <= 0) {
      return 0;
    }
    return this.kmRodadosCalculado / media;
  }

  get motoristasAutorizadosPorVeiculo(): MotoristaAutorizado[] {
    const veiculoId = Number(this.formularioDiario.get('veiculoId')?.value || 0);
    const filtrados = veiculoId
      ? this.motoristasAutorizados.filter((item) => item.veiculoId === veiculoId)
      : this.motoristasAutorizados;
    const mapa = new Map<string, MotoristaAutorizado>();
    for (const item of filtrados) {
      if (!mapa.has(item.nomeMotorista)) {
        mapa.set(item.nomeMotorista, item);
      }
    }
    return Array.from(mapa.values());
  }

  get fotosAnexadas(): { tipo: string; preview: string }[] {
    const fotos: { tipo: string; preview: string }[] = [];
    if (this.fotoFrentePreview) {
      fotos.push({ tipo: 'Frente', preview: this.fotoFrentePreview });
    }
    if (this.fotoLateralEsquerdaPreview) {
      fotos.push({ tipo: 'Lateral esquerda', preview: this.fotoLateralEsquerdaPreview });
    }
    if (this.fotoLateralDireitaPreview) {
      fotos.push({ tipo: 'Lateral direita', preview: this.fotoLateralDireitaPreview });
    }
    if (this.fotoTraseiraPreview) {
      fotos.push({ tipo: 'Traseira', preview: this.fotoTraseiraPreview });
    }
    return fotos;
  }

  obterDescricaoVeiculo(veiculoId: number | string | null): string {
    if (veiculoId === null || veiculoId === undefined || veiculoId === '') {
      return 'Veiculo nao informado';
    }
    const veiculoIdNumero = Number(veiculoId);
    const veiculo = this.veiculos.find((item) => item.id === veiculoIdNumero);
    if (!veiculo) {
      return 'Veiculo nao encontrado';
    }
    return `${veiculo.placa} - ${veiculo.modelo}`;
  }

  formatarNumero(valor: number | null, casas = 1): string {
    if (valor === null || !Number.isFinite(valor) || valor === 0) {
      return '--';
    }
    return valor.toFixed(casas).replace('.', ',');
  }

  private salvarVeiculo(): void {
    const erros = this.validarFormularioVeiculo();
    if (erros.length) {
      const builder = new PopupErrorBuilder();
      erros.forEach((erro) => builder.adicionar(erro));
      this.popupErros = builder.build();
      this.formularioVeiculo.markAllAsTouched();
      return;
    }

    const placa = String(this.formularioVeiculo.get('placa')?.value || '').trim();
    const mediaConsumoPadrao = this.formularioVeiculo.get('mediaConsumoPadrao')?.value;
    if (mediaConsumoPadrao !== null && mediaConsumoPadrao !== '' && Number(mediaConsumoPadrao) <= 0) {
      this.popupErros = new PopupErrorBuilder()
        .adicionar('A media de consumo deve ser maior que zero quando informada.')
        .build();
      return;
    }
    if (placa) {
      const placaNormalizada = placa.toLowerCase();
      const duplicado = this.veiculos.find(
        (item) =>
          (item.placa ?? '').toLowerCase() === placaNormalizada &&
          item.id !== this.veiculoSelecionadoId
      );
      if (duplicado) {
        this.popupErros = new PopupErrorBuilder()
          .adicionar('Ja existe um veiculo cadastrado com esta placa.')
          .build();
        return;
      }
    }

    const dadosVeiculo: VeiculoCadastroEntrada = {
      placa,
      modelo: this.formularioVeiculo.get('modelo')?.value,
      marca: this.formularioVeiculo.get('marca')?.value,
      ano: this.formularioVeiculo.get('ano')?.value ?? null,
      tipoCombustivel: this.formularioVeiculo.get('tipoCombustivel')?.value,
      mediaConsumoPadrao:
        mediaConsumoPadrao === null || mediaConsumoPadrao === ''
          ? null
          : Number(mediaConsumoPadrao),
      capacidadeTanqueLitros: this.formularioVeiculo.get('capacidadeTanqueLitros')?.value ?? null,
      observacoes: this.formularioVeiculo.get('observacoes')?.value || undefined,
      ativo: this.formularioVeiculo.get('ativo')?.value ?? null,
      fotoFrente: this.formularioVeiculo.get('fotoFrente')?.value ?? null,
      fotoLateralEsquerda: this.formularioVeiculo.get('fotoLateralEsquerda')?.value ?? null,
      fotoLateralDireita: this.formularioVeiculo.get('fotoLateralDireita')?.value ?? null,
      fotoTraseira: this.formularioVeiculo.get('fotoTraseira')?.value ?? null,
      documentoVeiculoPdf: this.formularioVeiculo.get('documentoVeiculoPdf')?.value ?? null
    };

    this.carregando = true;
    const requisicao = this.veiculoSelecionadoId
      ? this.controleVeiculosService.atualizarVeiculo(this.veiculoSelecionadoId, dadosVeiculo)
      : this.controleVeiculosService.criarVeiculo(dadosVeiculo);

    requisicao.pipe(finalize(() => (this.carregando = false))).subscribe({
      next: (veiculo) => {
        this.veiculoSelecionadoId = veiculo.id;
        this.mensagemFeedback = 'Veiculo salvo com sucesso.';
        this.carregarDados();
      },
      error: (erro) => {
        const mensagem =
          erro?.error?.message || 'Nao foi possivel salvar o veiculo. Verifique os dados.';
        this.popupErros = new PopupErrorBuilder().adicionar(mensagem).build();
      }
    });
  }

  private salvarDiario(): void {
    const erros = this.validarFormularioDiario();
    if (erros.length) {
      const builder = new PopupErrorBuilder();
      erros.forEach((erro) => builder.adicionar(erro));
      this.popupErros = builder.build();
      this.formularioDiario.markAllAsTouched();
      return;
    }

    const veiculoId = this.formularioDiario.get('veiculoId')?.value;
    const kmInicial = this.formularioDiario.get('kmInicial')?.value;
    const kmFinal = this.formularioDiario.get('kmFinal')?.value;
    const dadosDiario: RegistroDiarioBordoEntrada = {
      veiculoId: veiculoId === null || veiculoId === '' ? null : Number(veiculoId),
      data: this.formularioDiario.get('data')?.value,
      condutor: this.formularioDiario.get('condutor')?.value,
      horarioSaida: this.formularioDiario.get('horarioSaida')?.value,
      kmInicial: kmInicial === null || kmInicial === '' ? null : Number(kmInicial),
      horarioChegada: this.formularioDiario.get('horarioChegada')?.value,
      kmFinal: kmFinal === null || kmFinal === '' ? null : Number(kmFinal),
      destino: this.formularioDiario.get('destino')?.value,
      observacoes: this.formularioDiario.get('observacoes')?.value || undefined
    };

    this.carregando = true;
    const requisicao = this.registroSelecionadoId
      ? this.controleVeiculosService.atualizarRegistro(this.registroSelecionadoId, dadosDiario)
      : this.controleVeiculosService.criarRegistro(dadosDiario);

    requisicao.pipe(finalize(() => (this.carregando = false))).subscribe({
      next: (registro) => {
        this.registroSelecionadoId = registro.id;
        this.mensagemFeedback = 'Registro de bordo salvo com sucesso.';
        this.carregarDados();
      },
      error: (erro) => {
        const mensagem =
          erro?.error?.message || 'Nao foi possivel salvar o registro de bordo.';
        this.popupErros = new PopupErrorBuilder().adicionar(mensagem).build();
      }
    });
  }

  private salvarMotoristaAutorizado(): void {
    const veiculoIds = this.formularioMotorista.get('veiculoIds')?.value as number[];
    const tipoOrigem = String(this.formularioMotorista.get('tipoOrigem')?.value || '').trim();
    const motoristaId = this.formularioMotorista.get('motoristaId')?.value;
    const numeroCarteira = this.formularioMotorista.get('numeroCarteira')?.value;
    const categoriaCarteira = this.formularioMotorista.get('categoriaCarteira')?.value;
    const vencimentoCarteira = this.formularioMotorista.get('vencimentoCarteira')?.value;
    const arquivoCarteiraPdf = this.normalizarPdf(
      this.formularioMotorista.get('arquivoCarteiraPdf')?.value
    );
    if (!Array.isArray(veiculoIds) || veiculoIds.length === 0) {
      this.popupErros = new PopupErrorBuilder().adicionar('Selecione ao menos um veiculo.').build();
      return;
    }
    if (!tipoOrigem) {
      this.popupErros = new PopupErrorBuilder().adicionar('Selecione a origem do motorista.').build();
      return;
    }
    if (!motoristaId) {
      this.popupErros = new PopupErrorBuilder().adicionar('Selecione o motorista.').build();
      return;
    }

    this.carregando = true;
    const existentes = this.motoristasAutorizados.filter(
      (item) => item.tipoOrigem === tipoOrigem && item.motoristaId === Number(motoristaId)
    );
    const existentesPorVeiculo = new Map(
      existentes.map((item) => [item.veiculoId, item])
    );

    const requisicoesCriar = veiculoIds
      .filter((veiculoId) => !existentesPorVeiculo.has(veiculoId))
      .map((veiculoId) =>
        this.controleVeiculosService.criarMotoristaAutorizado({
          veiculoId: Number(veiculoId),
          tipoOrigem,
          motoristaId: Number(motoristaId),
          numeroCarteira: numeroCarteira || null,
          categoriaCarteira: categoriaCarteira || null,
          vencimentoCarteira: vencimentoCarteira || null,
          arquivoCarteiraPdf: arquivoCarteiraPdf || null
        })
      );

    const requisicoesAtualizar = veiculoIds
      .map((veiculoId) => existentesPorVeiculo.get(veiculoId))
      .filter((item): item is MotoristaAutorizado => !!item)
      .map((existente) =>
        this.controleVeiculosService.atualizarMotoristaAutorizado(existente.id, {
          veiculoId: Number(existente.veiculoId),
          tipoOrigem,
          motoristaId: Number(motoristaId),
          numeroCarteira: numeroCarteira || null,
          categoriaCarteira: categoriaCarteira || null,
          vencimentoCarteira: vencimentoCarteira || null,
          arquivoCarteiraPdf: arquivoCarteiraPdf || null
        })
      );

    const veiculosRemover = existentes
      .filter((item) => !veiculoIds.includes(item.veiculoId))
      .map((item) => item.id);

    const requisicoesRemover = veiculosRemover.map((id) =>
      this.controleVeiculosService.removerMotoristaAutorizado(id)
    );

    const requisicoes = [
      ...requisicoesCriar,
      ...requisicoesAtualizar,
      ...requisicoesRemover
    ];

    if (!requisicoes.length) {
      this.carregando = false;
      this.mensagemFeedback = 'Nenhuma alteracao para salvar.';
      return;
    }

    forkJoin(requisicoes)
      .pipe(finalize(() => (this.carregando = false)))
      .subscribe({
        next: (resultado) => {
          const ultimo =
            resultado && Array.isArray(resultado) && resultado.length
              ? resultado[resultado.length - 1]
              : null;
          this.motoristaSelecionadoId =
            typeof ultimo === 'object' && ultimo && 'id' in ultimo ? (ultimo as any).id : null;
          this.mensagemFeedback = 'Motorista autorizado salvo com sucesso.';
          this.carregarDados();
        },
        error: (erro) => {
          const mensagem =
            erro?.error?.message || 'Nao foi possivel salvar o motorista autorizado.';
          this.popupErros = new PopupErrorBuilder().adicionar(mensagem).build();
        }
      });
  }

  private limparFormularioVeiculo(): void {
    this.veiculoSelecionadoId = null;
    this.fotoFrentePreview = null;
    this.fotoLateralEsquerdaPreview = null;
    this.fotoLateralDireitaPreview = null;
    this.fotoTraseiraPreview = null;
    this.documentoVeiculoPdf = null;
    this.formularioVeiculo.reset({
      placa: '',
      modelo: '',
      marca: '',
      ano: new Date().getFullYear(),
      tipoCombustivel: '',
      mediaConsumoPadrao: null,
      capacidadeTanqueLitros: null,
      observacoes: '',
      ativo: true,
      fotoFrente: null,
      fotoLateralEsquerda: null,
      fotoLateralDireita: null,
      fotoTraseira: null,
      documentoVeiculoPdf: null
    });
  }

  private limparFormularioDiario(): void {
    const hojeIso = new Date().toISOString().substring(0, 10);
    this.registroSelecionadoId = null;
    this.formularioDiario.reset({
      veiculoId: null,
      data: hojeIso,
      condutor: '',
      horarioSaida: '',
      kmInicial: null,
      horarioChegada: '',
      kmFinal: null,
      destino: '',
      observacoes: ''
    });
  }

  private limparFormularioMotorista(): void {
    this.motoristaSelecionadoId = null;
    this.mostrarAlertaEdicao = false;
    this.termoMotorista = '';
    this.opcoesMotorista = [];
    this.formularioMotorista.reset({
      veiculoIds: [],
      tipoOrigem: 'PROFISSIONAL',
      motoristaId: null,
      numeroCarteira: '',
      categoriaCarteira: '',
      vencimentoCarteira: '',
      arquivoCarteiraPdf: null
    });
  }

  private validarFormularioVeiculo(): string[] {
    const erros: string[] = [];
    const placaControl = this.formularioVeiculo.get('placa');
    if (placaControl?.errors?.['placaInvalida']) {
      erros.push('Informe a placa no formato LLL-NNNN ou LLLNLNN.');
    }
    return erros;
  }

  private validarFormularioDiario(): string[] {
    const erros: string[] = [];
    const kmInicial = Number(this.formularioDiario.get('kmInicial')?.value || 0);
    const kmFinal = Number(this.formularioDiario.get('kmFinal')?.value || 0);
    if ((kmInicial > 0 || kmFinal > 0) && kmFinal <= kmInicial) {
      erros.push('O km final deve ser maior que o km inicial quando informado.');
    }
    return erros;
  }

  private validarSelecoesAposAtualizar(): void {
    if (this.veiculoSelecionadoId) {
      const existe = this.veiculos.some((item) => item.id === this.veiculoSelecionadoId);
      if (!existe) {
        this.veiculoSelecionadoId = null;
      }
    }
    if (this.registroSelecionadoId) {
      const existe = this.registros.some((item) => item.id === this.registroSelecionadoId);
      if (!existe) {
        this.registroSelecionadoId = null;
      }
    }
    if (this.motoristaSelecionadoId) {
      const existe = this.motoristasAutorizados.some((item) => item.id === this.motoristaSelecionadoId);
      if (!existe) {
        this.motoristaSelecionadoId = null;
      }
    }
  }

  private carregarDados(): void {
    this.carregando = true;
    forkJoin({
      veiculos: this.controleVeiculosService.listarVeiculos(),
      registros: this.controleVeiculosService.listarRegistros(),
      motoristasAutorizados: this.controleVeiculosService.listarMotoristasAutorizados()
    })
      .pipe(finalize(() => (this.carregando = false)))
      .subscribe({
        next: ({ veiculos, registros, motoristasAutorizados }) => {
          this.veiculos = veiculos;
          this.registros = registros;
          this.motoristasAutorizados = motoristasAutorizados;
          this.validarSelecoesAposAtualizar();
        },
        error: () => {
          this.popupErros = new PopupErrorBuilder()
            .adicionar('Nao foi possivel carregar o controle de veiculos.')
            .build();
        }
      });
  }

  private fecharDialogoExclusao(): void {
    this.dialogoExclusaoAberto = false;
    this.tipoExclusao = null;
  }

  atualizarTermoMotorista(termo: string): void {
    this.termoMotorista = termo;
    this.buscarMotoristasDisponiveis(termo);
  }

  selecionarMotorista(opcao: AutocompleteOpcao): void {
    this.termoMotorista = opcao.label;
    this.formularioMotorista.get('motoristaId')?.setValue(opcao.id);
  }

  aoAlterarTipoOrigem(): void {
    this.formularioMotorista.get('motoristaId')?.reset();
    this.termoMotorista = '';
    this.opcoesMotorista = [];
  }

  selecionarMotoristaAutorizado(motorista: MotoristaAutorizado): void {
    this.motoristaSelecionadoId = motorista.id;
    this.formularioMotorista.patchValue({
      tipoOrigem: motorista.tipoOrigem,
      motoristaId: motorista.motoristaId,
      numeroCarteira: motorista.numeroCarteira ?? '',
      categoriaCarteira: motorista.categoriaCarteira ?? '',
      vencimentoCarteira: motorista.vencimentoCarteira ?? '',
      arquivoCarteiraPdf: motorista.arquivoCarteiraPdf ?? null
    });
    this.carteiraPdfSelecionada = this.normalizarPdf(motorista.arquivoCarteiraPdf);
    this.termoMotorista = motorista.nomeMotorista;
    this.opcoesMotorista = [
      {
        id: motorista.motoristaId,
        label: motorista.nomeMotorista,
        sublabel: motorista.tipoOrigem === 'PROFISSIONAL' ? 'Profissional' : 'Voluntario'
      }
    ];
    const veiculoIds = this.motoristasAutorizados
      .filter(
        (item) =>
          item.tipoOrigem === motorista.tipoOrigem &&
          item.motoristaId === motorista.motoristaId
      )
      .map((item) => item.veiculoId);
    this.formularioMotorista.get('veiculoIds')?.setValue(Array.from(new Set(veiculoIds)));
    this.mostrarAlertaEdicao = true;
    Promise.resolve().then(() => this.rolarParaCartaoMotoristas());
  }

  onCarteiraSelecionada(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      this.popupErros = new PopupErrorBuilder()
        .adicionar('Envie a carteira em formato PDF.')
        .build();
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      this.formularioMotorista.get('arquivoCarteiraPdf')?.setValue(dataUrl);
      this.carteiraPdfSelecionada = dataUrl;
      input.value = '';
    };
    reader.readAsDataURL(file);
  }

  get motoristasPorVeiculo(): { veiculoId: number; descricao: string; motoristas: string[] }[] {
    const mapa = new Map<number, { descricao: string; motoristas: string[] }>();
    for (const registro of this.motoristasAutorizados) {
      const descricao = `${registro.placaVeiculo ?? '--'} - ${registro.modeloVeiculo ?? ''}`.trim();
      const existente = mapa.get(registro.veiculoId);
      if (existente) {
        if (!existente.motoristas.includes(registro.nomeMotorista)) {
          existente.motoristas.push(registro.nomeMotorista);
        }
      } else {
        mapa.set(registro.veiculoId, {
          descricao,
          motoristas: [registro.nomeMotorista]
        });
      }
    }
    return Array.from(mapa.entries()).map(([veiculoId, dados]) => ({
      veiculoId,
      descricao: dados.descricao,
      motoristas: dados.motoristas
    }));
  }

  alternarVeiculoSelecionado(veiculoId: number): void {
    const veiculoIds = new Set(this.formularioMotorista.get('veiculoIds')?.value as number[]);
    if (veiculoIds.has(veiculoId)) {
      veiculoIds.delete(veiculoId);
    } else {
      veiculoIds.add(veiculoId);
    }
    this.formularioMotorista.get('veiculoIds')?.setValue(Array.from(veiculoIds));
  }

  veiculoSelecionado(veiculoId: number): boolean {
    const veiculoIds = this.formularioMotorista.get('veiculoIds')?.value as number[];
    return Array.isArray(veiculoIds) && veiculoIds.includes(veiculoId);
  }

  private buscarMotoristasDisponiveis(termo: string): void {
    this.carregandoMotoristas = true;
    this.erroMotoristas = null;
    this.controleVeiculosService
      .listarMotoristasDisponiveis(termo)
      .pipe(finalize(() => (this.carregandoMotoristas = false)))
      .subscribe({
        next: (motoristas) => {
          this.motoristasDisponiveis = motoristas;
          this.atualizarOpcoesMotorista();
        },
        error: () => {
          this.erroMotoristas = 'Nao foi possivel carregar os motoristas.';
          this.motoristasDisponiveis = [];
          this.opcoesMotorista = [];
        }
      });
  }

  private atualizarOpcoesMotorista(): void {
    const tipo = String(this.formularioMotorista.get('tipoOrigem')?.value || '');
    const termoNormalizado = this.normalizarTextoBusca(this.termoMotorista);
    const opcoes = this.motoristasDisponiveis
      .filter((motorista) => motorista.tipoOrigem === tipo)
      .filter((motorista) => {
        if (!termoNormalizado) return true;
        return this.normalizarTextoBusca(motorista.nome).includes(termoNormalizado);
      })
      .map((motorista) => ({
        id: motorista.id,
        label: motorista.nome,
        sublabel: motorista.tipoOrigem === 'PROFISSIONAL' ? 'Profissional' : 'Voluntario'
      }));
    this.opcoesMotorista = opcoes;
  }

  private normalizarTextoBusca(texto: string): string {
    if (!texto) return '';
    return texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  onFotoSelecionada(
    tipo: 'frente' | 'lateralEsquerda' | 'lateralDireita' | 'traseira',
    event: Event
  ): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      if (tipo === 'frente') {
        this.fotoFrentePreview = dataUrl;
        this.formularioVeiculo.get('fotoFrente')?.setValue(dataUrl);
      }
      if (tipo === 'lateralEsquerda') {
        this.fotoLateralEsquerdaPreview = dataUrl;
        this.formularioVeiculo.get('fotoLateralEsquerda')?.setValue(dataUrl);
      }
      if (tipo === 'lateralDireita') {
        this.fotoLateralDireitaPreview = dataUrl;
        this.formularioVeiculo.get('fotoLateralDireita')?.setValue(dataUrl);
      }
      if (tipo === 'traseira') {
        this.fotoTraseiraPreview = dataUrl;
        this.formularioVeiculo.get('fotoTraseira')?.setValue(dataUrl);
      }
      input.value = '';
    };
    reader.readAsDataURL(file);
  }

  onFotoTipoSelecionada(event: Event): void {
    const tipo = this.mapearTipoFoto(this.tipoFotoSelecionada);
    if (!tipo) {
      this.popupErros = new PopupErrorBuilder()
        .adicionar('Selecione o tipo de foto antes de anexar.')
        .build();
      return;
    }
    this.onFotoSelecionada(tipo, event);
  }

  removerFoto(tipo: 'frente' | 'lateralEsquerda' | 'lateralDireita' | 'traseira'): void {
    if (tipo === 'frente') {
      this.fotoFrentePreview = null;
      this.formularioVeiculo.get('fotoFrente')?.reset();
    }
    if (tipo === 'lateralEsquerda') {
      this.fotoLateralEsquerdaPreview = null;
      this.formularioVeiculo.get('fotoLateralEsquerda')?.reset();
    }
    if (tipo === 'lateralDireita') {
      this.fotoLateralDireitaPreview = null;
      this.formularioVeiculo.get('fotoLateralDireita')?.reset();
    }
    if (tipo === 'traseira') {
      this.fotoTraseiraPreview = null;
      this.formularioVeiculo.get('fotoTraseira')?.reset();
    }
  }

  removerFotoPorTipo(tipo: string): void {
    const tipoMapeado = this.mapearTipoFoto(tipo);
    if (tipoMapeado) {
      this.removerFoto(tipoMapeado);
    }
  }

  visualizarFoto(tipo: string): void {
    const preview = this.obterPreviewPorTipo(tipo);
    if (!preview) return;
    window.open(preview, '_blank');
  }

  onDocumentoVeiculoSelecionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      this.popupErros = new PopupErrorBuilder()
        .adicionar('Envie o documento do veiculo em formato PDF.')
        .build();
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      this.documentoVeiculoPdf = dataUrl;
      this.formularioVeiculo.get('documentoVeiculoPdf')?.setValue(dataUrl);
      input.value = '';
    };
    reader.readAsDataURL(file);
  }

  visualizarDocumentoVeiculo(): void {
    if (!this.documentoVeiculoPdf) return;
    window.open(this.documentoVeiculoPdf, '_blank');
  }

  visualizarCarteiraPdf(arquivo: string | null | undefined): void {
    if (!arquivo) return;
    const arquivoNormalizado = this.normalizarPdf(arquivo);
    if (!arquivoNormalizado) return;
    this.carteiraPdfSelecionada = arquivoNormalizado;
    this.carteiraPdfSeguro = this.sanitizer.bypassSecurityTrustResourceUrl(arquivoNormalizado);
    this.carteiraPdfAberto = true;
  }

  fecharCarteiraPdf(): void {
    this.carteiraPdfAberto = false;
    this.carteiraPdfSeguro = null;
  }

  imprimirCarteiraPdf(): void {
    const arquivo = this.carteiraPdfSelecionada;
    if (!arquivo) return;
    const janela = window.open(arquivo, '_blank', 'width=900,height=1100');
    if (!janela) return;
    janela.addEventListener(
      'load',
      () => {
        janela.focus();
        janela.print();
      },
      { once: true }
    );
  }

  private obterPreviewPorTipo(tipo: string): string | null {
    if (tipo === 'Frente') return this.fotoFrentePreview;
    if (tipo === 'Lateral esquerda') return this.fotoLateralEsquerdaPreview;
    if (tipo === 'Lateral direita') return this.fotoLateralDireitaPreview;
    if (tipo === 'Traseira') return this.fotoTraseiraPreview;
    return null;
  }

  private mapearTipoFoto(
    tipo: string
  ): 'frente' | 'lateralEsquerda' | 'lateralDireita' | 'traseira' | null {
    if (tipo === 'Frente') return 'frente';
    if (tipo === 'Lateral esquerda') return 'lateralEsquerda';
    if (tipo === 'Lateral direita') return 'lateralDireita';
    if (tipo === 'Traseira') return 'traseira';
    return null;
  }

  private normalizarPdf(arquivo: string | null | undefined): string | null {
    if (!arquivo) return null;
    if (arquivo.startsWith('data:application/pdf')) return arquivo;
    return `data:application/pdf;base64,${arquivo}`;
  }

  private rolarParaCartaoMotoristas(): void {
    if (!this.cartaoMotoristas?.nativeElement) return;
    this.cartaoMotoristas.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  private validarPlaca(control: AbstractControl): ValidationErrors | null {
    const valor = String(control.value || '').trim();
    if (!valor) {
      return null;
    }
    const placaNormalizada = valor.toUpperCase();
    const placaAntiga = /^[A-Z]{3}-\d{4}$/.test(placaNormalizada);
    const placaAntigaSemHifen = /^[A-Z]{3}\d{4}$/.test(placaNormalizada);
    const placaMercosul = /^[A-Z]{3}\d[A-Z]\d{2}$/.test(placaNormalizada);
    if (!placaAntiga && !placaAntigaSemHifen && !placaMercosul) {
      return { placaInvalida: true };
    }
    return null;
  }
}

