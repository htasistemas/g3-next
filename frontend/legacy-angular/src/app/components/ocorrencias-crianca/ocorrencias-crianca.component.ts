import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import {
  OcorrenciaCriancaAnexoPayload,
  OcorrenciaCriancaPayload,
  OcorrenciaCriancaService
} from '../../services/ocorrencia-crianca.service';
import { PopupErrorBuilder } from '../../utils/popup-error.builder';
import { ConfigAcoesCrud, EstadoAcoesCrud, TelaBaseComponent } from '../compartilhado/tela-base.component';
import { BarraAcoesCrudComponent } from '../compartilhado/barra-acoes-crud/barra-acoes-crud.component';
import { TelaPadraoComponent } from '../compartilhado/tela-padrao/tela-padrao.component';
import { PopupMessagesComponent } from '../compartilhado/popup-messages/popup-messages.component';

interface StepTab {
  id: string;
  label: string;
}

@Component({
  selector: 'app-ocorrencias-crianca',
  host: { class: 'ocorrencias-wrapper' },
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    FontAwesomeModule,
    TelaPadraoComponent,
    BarraAcoesCrudComponent,
    PopupMessagesComponent
  ],
  templateUrl: './ocorrencias-crianca.component.html',
  styleUrl: './ocorrencias-crianca.component.scss'
})
export class OcorrenciasCriancaComponent extends TelaBaseComponent implements OnInit {
  form: FormGroup;
  tabs: StepTab[] = [
    { id: 'ocorrencia', label: 'Ocorrência' },
    { id: 'vitima', label: 'Vítima' },
    { id: 'autor', label: 'Possível autor' },
    { id: 'classificacao', label: 'Classificação' },
    { id: 'relato', label: 'Relato e encaminhamento' }
  ];
  activeTab = 'ocorrencia';
  readonly faTriangleExclamation = faTriangleExclamation;
  popupErros: string[] = [];
  popupTitulo = 'Aviso';
  saving = false;
  editingId: string | null = null;
  ocorrencias: OcorrenciaCriancaPayload[] = [];
  anexos: OcorrenciaCriancaAnexoPayload[] = [];
  printMenuOpen = false;
  buscarModalOpen = false;
  termoBusca = '';

  readonly localViolenciaOpcoes = ['Na escola', 'No âmbito familiar', 'Outros espaços'];
  readonly violenciaMotivadaOpcoes = [
    'Sexismo',
    'LGBTfobia',
    'Racismo',
    'Intolerância religiosa',
    'Xenofobia',
    'Conflito geracional',
    'Capacitismo',
    'Condição econômica',
    'Outros'
  ];
  readonly violenciaPraticadaOpcoes = [
    'Criança',
    'Adolescente',
    'Pai',
    'Mãe',
    'Responsável',
    'Professor(a)',
    'Gestor(a)',
    'Funcionário',
    'Outro'
  ];
  readonly outrasViolacoesOpcoes = [
    'Abandono escolar',
    'Evasão escolar',
    'Gravidez na adolescência',
    'Trabalho Infantil'
  ];
  readonly racaCorOpcoes = ['Branca', 'Preta', 'Parda', 'Indígena', 'Amarela'];
  readonly identidadeGeneroOpcoes = [
    'Masculino Cisgênero',
    'Feminino Cisgênero',
    'Masculino Transexual',
    'Feminino Transexual',
    'Não binário'
  ];
  readonly orientacaoSexualOpcoes = [
    'Heterossexual',
    'Homossexual',
    'Bissexual',
    'Pansexual',
    'Assexual',
    'Outro'
  ];
  readonly escolaridadeOpcoes = [
    'Creche (0-3)',
    'Pré-escola (4-5)',
    '1º EF',
    '2º EF',
    '3º EF',
    '4º EF',
    '5º EF',
    '6º EF',
    '7º EF',
    '8º EF',
    '9º EF',
    '1º EM',
    '2º EM',
    '3º EM'
  ];
  readonly denunciaOrigemOpcoes = [
    'Denúncia espontânea',
    'Suspeita por observação',
    'Relato de outros alunos',
    'Familiares',
    'Denúncia anônima',
    'Comunidade',
    'Outro'
  ];
  readonly tipificacaoViolenciaOpcoes = [
    'Violência física',
    'Violência psicológica',
    'Exposição da criança/adolescente a crime violento contra membro da família ou rede de apoio',
    'Violência sexual',
    'Negligência',
    'Maus-tratos',
    'Violência institucional'
  ];
  readonly tipificacaoPsicologicaOpcoes = [
    'Ameaça',
    'Constrangimento',
    'Humilhação',
    'Manipulação',
    'Isolamento',
    'Agressão verbal e xingamento',
    'Bullying',
    'Alienação parental'
  ];
  readonly tipificacaoSexualOpcoes = ['Abuso sexual', 'Exploração sexual', 'Tráfico de pessoas', 'Violência mediada por TICS'];
  readonly violenciaAutoprovocadaOpcoes = [
    'Suicídio consumado',
    'Tentativa de suicídio',
    'Automutilação',
    'Ideação suicida'
  ];

  readonly acoesToolbar: Required<ConfigAcoesCrud> = this.criarConfigAcoes({
    buscar: true,
    novo: true,
    salvar: true,
    cancelar: true,
    excluir: true,
    imprimir: true
  });

  constructor(private readonly fb: FormBuilder, private readonly service: OcorrenciaCriancaService) {
    super();
    this.form = this.fb.group({
      dataPreenchimento: [this.obterDataAtual(), Validators.required],
      localViolencia: [''],
      localViolenciaOutro: [''],
      violenciaMotivadaPor: [[]],
      violenciaMotivadaOutro: [''],
      violenciaPraticadaPor: [[]],
      violenciaPraticadaOutro: [''],
      outrasViolacoes: [[]],
      vitimaNome: ['', Validators.required],
      vitimaIdade: [null, Validators.required],
      vitimaRacaCor: [''],
      vitimaIdentidadeGenero: [''],
      vitimaOrientacaoSexual: [''],
      vitimaOrientacaoOutro: [''],
      vitimaEscolaridade: [''],
      vitimaResponsavelTipo: [''],
      vitimaResponsavelNome: [''],
      vitimaTelefoneResponsavel: [''],
      vitimaEnderecoLogradouro: [''],
      vitimaEnderecoComplemento: [''],
      vitimaEnderecoBairro: [''],
      vitimaEnderecoMunicipio: [''],
      autorNome: [''],
      autorIdade: [null],
      autorNaoConsta: [false],
      autorParentesco: [''],
      autorParentescoGrau: [''],
      autorResponsavelTipo: [''],
      autorResponsavelNome: [''],
      autorResponsavelTelefone: [''],
      autorResponsavelNaoConsta: [false],
      autorEnderecoLogradouro: [''],
      autorEnderecoComplemento: [''],
      autorEnderecoBairro: [''],
      autorEnderecoMunicipio: [''],
      autorEnderecoNaoConsta: [false],
      tipificacaoViolencia: [[]],
      tipificacaoPsicologica: [[]],
      tipificacaoSexual: [[]],
      violenciaAutoprovocada: [[]],
      outroTipoViolenciaDescricao: [''],
      resumoViolencia: ['', Validators.required],
      encaminharConselho: [null],
      encaminharMotivo: [''],
      dataEnvioConselho: [''],
      denunciaOrigem: [[]],
      denunciaOrigemOutro: ['']
    });
  }

  ngOnInit(): void {
    this.carregarOcorrencias();
    this.configurarRegrasCondicionais();
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
      salvar: this.saving,
      cancelar: this.saving,
      novo: this.saving,
      excluir: !this.editingId,
      imprimir: this.saving,
      buscar: this.saving
    };
  }

  changeTab(tab: string): void {
    this.activeTab = tab;
  }

  goToNextTab(): void {
    if (this.hasNextTab) {
      this.changeTab(this.tabs[this.activeTabIndex + 1].id);
    }
  }

  goToPreviousTab(): void {
    if (this.hasPreviousTab) {
      this.changeTab(this.tabs[this.activeTabIndex - 1].id);
    }
  }

  abrirBusca(): void {
    this.buscarModalOpen = true;
  }

  fecharBusca(): void {
    this.buscarModalOpen = false;
  }

  get ocorrenciasFiltradas(): OcorrenciaCriancaPayload[] {
    const termo = this.normalizarTextoBusca(this.termoBusca);
    if (!termo) return this.ocorrencias;
    return this.ocorrencias.filter((item) => {
      return (
        this.normalizarTextoBusca(item.vitimaNome).includes(termo) ||
        this.normalizarTextoBusca(item.dataPreenchimento).includes(termo)
      );
    });
  }

  onNovo(): void {
    this.resetState();
  }

  onCancelar(): void {
    this.resetState();
  }

  onSalvar(): void {
    if (!this.validarCamposObrigatorios()) {
      return;
    }
    this.saving = true;
    const payload = this.montarPayload();
    if (this.editingId) {
      this.service.atualizar(this.editingId, payload).subscribe({
        next: (resposta) => {
          const id = resposta.id ?? this.editingId;
          if (id) {
            this.salvarAnexosPendentes(id, () => this.finalizarSalvar());
          } else {
            this.finalizarSalvar();
          }
        },
        error: () => {
          this.popupTitulo = 'Erro ao salvar';
          this.popupErros = new PopupErrorBuilder().adicionar('Não foi possível salvar a ocorrência.').build();
        },
        complete: () => {
          this.saving = false;
        }
      });
      return;
    }

    this.service.criar(payload).subscribe({
      next: (resposta) => {
        const id = resposta.id ?? '';
        if (id) {
          this.salvarAnexosPendentes(id, () => this.finalizarSalvar());
        } else {
          this.finalizarSalvar();
        }
      },
      error: () => {
        this.popupTitulo = 'Erro ao salvar';
        this.popupErros = new PopupErrorBuilder().adicionar('Não foi possível salvar a ocorrência.').build();
      },
      complete: () => {
        this.saving = false;
      }
    });
  }

  onExcluir(): void {
    if (!this.editingId) return;
    this.service.remover(this.editingId).subscribe({
      next: () => {
        this.popupTitulo = 'Sucesso';
        this.popupErros = new PopupErrorBuilder().adicionar('Ocorrência removida com sucesso.').build();
        this.carregarOcorrencias();
        this.resetState();
      },
      error: () => {
        this.popupTitulo = 'Erro ao excluir';
        this.popupErros = new PopupErrorBuilder().adicionar('Não foi possível remover a ocorrência.').build();
      }
    });
  }

  onImprimir(): void {
    if (!this.editingId) {
      this.popupTitulo = 'Aviso';
      this.popupErros = new PopupErrorBuilder()
        .adicionar('Salve a ocorrência antes de gerar a impressão.')
        .build();
      return;
    }
    this.printMenuOpen = true;
  }

  fecharMenuImpressao(): void {
    this.printMenuOpen = false;
  }

  imprimirDenuncia(): void {
    if (!this.editingId) return;
    const url = this.service.obterPdfDenunciaUrl(this.editingId);
    window.open(url, '_blank');
    this.fecharMenuImpressao();
  }

  imprimirConselhoTutelar(): void {
    if (!this.editingId) return;
    const url = this.service.obterPdfConselhoTutelarUrl(this.editingId);
    window.open(url, '_blank');
    this.fecharMenuImpressao();
  }

  imprimirConselhoTutelarDireto(): void {
    if (!this.editingId) return;
    const url = this.service.obterPdfConselhoTutelarUrl(this.editingId);
    window.open(url, '_blank');
  }

  selecionarOcorrencia(ocorrencia: OcorrenciaCriancaPayload): void {
    if (!ocorrencia.id) return;
    this.editingId = ocorrencia.id;
    this.form.patchValue(ocorrencia);
    this.activeTab = 'ocorrencia';
    this.carregarAnexos(ocorrencia.id);
    this.fecharBusca();
  }

  alternarSelecao(controlName: string, valor: string): void {
    const control = this.form.get(controlName);
    if (!control) return;
    const atual = (control.value as string[]) ?? [];
    if (atual.includes(valor)) {
      control.setValue(atual.filter((item) => item !== valor));
      return;
    }
    control.setValue([...atual, valor]);
  }

  possuiSelecao(controlName: string, valor: string): boolean {
    const control = this.form.get(controlName);
    if (!control) return false;
    const atual = (control.value as string[]) ?? [];
    return atual.includes(valor);
  }

  onAnexosSelecionados(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const arquivos = Array.from(input.files ?? []);
    if (arquivos.length === 0) return;
    if (this.anexos.length + arquivos.length > 10) {
      this.popupTitulo = 'Aviso';
      this.popupErros = new PopupErrorBuilder().adicionar('Limite máximo de 10 anexos por ocorrência.').build();
      input.value = '';
      return;
    }
    const validos = arquivos.filter((arquivo) => this.validarArquivo(arquivo));
    if (validos.length === 0) {
      input.value = '';
      return;
    }
    this.lerArquivosSequencial(validos, 0);
    input.value = '';
  }

  removerAnexo(anexo: OcorrenciaCriancaAnexoPayload): void {
    if (anexo.id && this.editingId) {
      this.service.removerAnexo(this.editingId, anexo.id).subscribe({
        next: () => {
          this.anexos = this.anexos.filter((item) => item.id !== anexo.id);
          this.reordenarAnexos();
        },
        error: () => {
          this.popupTitulo = 'Erro ao remover';
          this.popupErros = new PopupErrorBuilder().adicionar('Não foi possível remover o anexo.').build();
        }
      });
      return;
    }
    this.anexos = this.anexos.filter((item) => item !== anexo);
    this.reordenarAnexos();
  }

  abrirAnexo(anexo: OcorrenciaCriancaAnexoPayload): void {
    if (!anexo.conteudoBase64) return;
    const url = `data:${anexo.tipoMime};base64,${anexo.conteudoBase64}`;
    window.open(url, '_blank');
  }

  fecharPopupErros(): void {
    this.popupErros = [];
  }

  closeForm(): void {
    window.history.back();
  }

  setEncaminharConselho(valor: boolean): void {
    const control = this.form.get('encaminharConselho');
    if (!control) return;
    control.setValue(valor);
    control.markAsTouched();
  }

  private carregarOcorrencias(): void {
    this.service.listar().subscribe({
      next: (lista) => {
        this.ocorrencias = lista ?? [];
      },
      error: () => {
        this.popupTitulo = 'Erro ao carregar';
        this.popupErros = new PopupErrorBuilder().adicionar('Não foi possível carregar as ocorrências.').build();
      }
    });
  }

  private carregarAnexos(ocorrenciaId: string): void {
    this.service.listarAnexos(ocorrenciaId).subscribe({
      next: (anexos) => {
        this.anexos = [...(anexos ?? [])].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
        this.reordenarAnexos();
      },
      error: () => {
        this.anexos = [];
        this.popupTitulo = 'Aviso';
        this.popupErros = new PopupErrorBuilder().adicionar('Não foi possível carregar os anexos.').build();
      }
    });
  }

  private salvarAnexosPendentes(ocorrenciaId: string, aoFinal: () => void): void {
    const pendentes = this.anexos.filter((anexo) => !anexo.id);
    if (pendentes.length === 0) {
      aoFinal();
      return;
    }
    const enviar = (index: number) => {
      if (index >= pendentes.length) {
        aoFinal();
        return;
      }
      const anexo = pendentes[index];
      this.service.adicionarAnexo(ocorrenciaId, anexo).subscribe({
        next: (salvo) => {
          this.anexos = this.anexos.map((item) => (item === anexo ? salvo : item));
          enviar(index + 1);
        },
        error: () => {
          this.popupTitulo = 'Erro ao anexar';
          this.popupErros = new PopupErrorBuilder().adicionar('Não foi possível anexar um dos arquivos.').build();
          aoFinal();
        }
      });
    };
    enviar(0);
  }

  private validarArquivo(arquivo: File): boolean {
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(arquivo.type)) {
      this.popupTitulo = 'Aviso';
      this.popupErros = new PopupErrorBuilder().adicionar('Envie apenas PDF, JPG ou PNG.').build();
      return false;
    }
    if (arquivo.size > 10 * 1024 * 1024) {
      this.popupTitulo = 'Aviso';
      this.popupErros = new PopupErrorBuilder().adicionar('Anexo excede o limite de 10MB.').build();
      return false;
    }
    return true;
  }

  private lerArquivosSequencial(arquivos: File[], indice: number): void {
    if (indice >= arquivos.length) {
      this.reordenarAnexos();
      return;
    }
    const arquivo = arquivos[indice];
    const leitor = new FileReader();
    leitor.onload = () => {
      const conteudo = typeof leitor.result === 'string' ? leitor.result : '';
      const base64 = conteudo.includes(',') ? conteudo.split(',')[1] : conteudo;
      this.anexos = [
        ...this.anexos,
        {
          nomeArquivo: arquivo.name,
          tipoMime: arquivo.type || 'application/pdf',
          conteudoBase64: base64,
          ordem: this.anexos.length + 1
        }
      ];
      this.lerArquivosSequencial(arquivos, indice + 1);
    };
    leitor.readAsDataURL(arquivo);
  }

  private reordenarAnexos(): void {
    this.anexos = this.anexos.map((anexo, index) => ({
      ...anexo,
      ordem: index + 1
    }));
  }

  private montarPayload(): OcorrenciaCriancaPayload {
    const valor = this.form.value;
    return {
      dataPreenchimento: valor.dataPreenchimento,
      localViolencia: valor.localViolencia,
      localViolenciaOutro: valor.localViolenciaOutro,
      violenciaMotivadaPor: valor.violenciaMotivadaPor ?? [],
      violenciaMotivadaOutro: valor.violenciaMotivadaOutro,
      violenciaPraticadaPor: valor.violenciaPraticadaPor ?? [],
      violenciaPraticadaOutro: valor.violenciaPraticadaOutro,
      outrasViolacoes: valor.outrasViolacoes ?? [],
      vitimaNome: valor.vitimaNome,
      vitimaIdade: valor.vitimaIdade,
      vitimaRacaCor: valor.vitimaRacaCor,
      vitimaIdentidadeGenero: valor.vitimaIdentidadeGenero,
      vitimaOrientacaoSexual: valor.vitimaOrientacaoSexual,
      vitimaOrientacaoOutro: valor.vitimaOrientacaoOutro,
      vitimaEscolaridade: valor.vitimaEscolaridade,
      vitimaResponsavelTipo: valor.vitimaResponsavelTipo,
      vitimaResponsavelNome: valor.vitimaResponsavelNome,
      vitimaTelefoneResponsavel: valor.vitimaTelefoneResponsavel,
      vitimaEnderecoLogradouro: valor.vitimaEnderecoLogradouro,
      vitimaEnderecoComplemento: valor.vitimaEnderecoComplemento,
      vitimaEnderecoBairro: valor.vitimaEnderecoBairro,
      vitimaEnderecoMunicipio: valor.vitimaEnderecoMunicipio,
      autorNome: valor.autorNome,
      autorIdade: valor.autorIdade,
      autorNaoConsta: valor.autorNaoConsta,
      autorParentesco: valor.autorParentesco,
      autorParentescoGrau: valor.autorParentescoGrau,
      autorResponsavelTipo: valor.autorResponsavelTipo,
      autorResponsavelNome: valor.autorResponsavelNome,
      autorResponsavelTelefone: valor.autorResponsavelTelefone,
      autorResponsavelNaoConsta: valor.autorResponsavelNaoConsta,
      autorEnderecoLogradouro: valor.autorEnderecoLogradouro,
      autorEnderecoComplemento: valor.autorEnderecoComplemento,
      autorEnderecoBairro: valor.autorEnderecoBairro,
      autorEnderecoMunicipio: valor.autorEnderecoMunicipio,
      autorEnderecoNaoConsta: valor.autorEnderecoNaoConsta,
      tipificacaoViolencia: valor.tipificacaoViolencia ?? [],
      tipificacaoPsicologica: valor.tipificacaoPsicologica ?? [],
      tipificacaoSexual: valor.tipificacaoSexual ?? [],
      violenciaAutoprovocada: valor.violenciaAutoprovocada ?? [],
      outroTipoViolenciaDescricao: valor.outroTipoViolenciaDescricao,
      resumoViolencia: valor.resumoViolencia,
      encaminharConselho: valor.encaminharConselho,
      encaminharMotivo: valor.encaminharMotivo,
      dataEnvioConselho: valor.dataEnvioConselho,
      denunciaOrigem: valor.denunciaOrigem ?? [],
      denunciaOrigemOutro: valor.denunciaOrigemOutro
    };
  }

  private resetState(): void {
    this.form.reset({
      dataPreenchimento: this.obterDataAtual(),
      violenciaMotivadaPor: [],
      violenciaPraticadaPor: [],
      outrasViolacoes: [],
      tipificacaoViolencia: [],
      tipificacaoPsicologica: [],
      tipificacaoSexual: [],
      violenciaAutoprovocada: [],
      denunciaOrigem: [],
      autorNaoConsta: false,
      autorResponsavelNaoConsta: false,
      autorEnderecoNaoConsta: false,
      encaminharConselho: null
    });
    this.editingId = null;
    this.anexos = [];
    this.activeTab = 'ocorrencia';
    this.popupErros = [];
  }

  private finalizarSalvar(): void {
    this.popupTitulo = 'Sucesso';
    this.popupErros = new PopupErrorBuilder().adicionar('Ocorrência salva com sucesso.').build();
    this.carregarOcorrencias();
    this.resetState();
  }

  private configurarRegrasCondicionais(): void {
    this.form.get('autorNaoConsta')?.valueChanges.subscribe((valor) => {
      const campos = ['autorNome', 'autorIdade', 'autorParentesco', 'autorParentescoGrau'];
      this.aplicarBloqueioCampos(campos, valor);
    });
    this.form.get('autorResponsavelNaoConsta')?.valueChanges.subscribe((valor) => {
      const campos = ['autorResponsavelTipo', 'autorResponsavelNome', 'autorResponsavelTelefone'];
      this.aplicarBloqueioCampos(campos, valor);
    });
    this.form.get('autorEnderecoNaoConsta')?.valueChanges.subscribe((valor) => {
      const campos = ['autorEnderecoLogradouro', 'autorEnderecoComplemento', 'autorEnderecoBairro', 'autorEnderecoMunicipio'];
      this.aplicarBloqueioCampos(campos, valor);
    });
    this.form.get('autorParentesco')?.valueChanges.subscribe((valor) => {
      const campoGrau = this.form.get('autorParentescoGrau');
      if (!campoGrau) return;
      if (valor === 'Sim') {
        campoGrau.setValidators([Validators.required]);
      } else {
        campoGrau.clearValidators();
        campoGrau.setValue('');
      }
      campoGrau.updateValueAndValidity({ emitEvent: false });
    });
    this.form.get('encaminharConselho')?.valueChanges.subscribe((valor) => {
      const campoData = this.form.get('dataEnvioConselho');
      const campoMotivo = this.form.get('encaminharMotivo');
      if (!campoData || !campoMotivo) return;
      if (valor === true) {
        campoData.setValidators([Validators.required]);
        campoMotivo.clearValidators();
        campoMotivo.setValue('');
      } else if (valor === false) {
        campoMotivo.setValidators([Validators.required]);
        campoData.clearValidators();
        campoData.setValue('');
      } else {
        campoData.clearValidators();
        campoMotivo.clearValidators();
      }
      campoData.updateValueAndValidity({ emitEvent: false });
      campoMotivo.updateValueAndValidity({ emitEvent: false });
    });
    this.form.get('localViolencia')?.valueChanges.subscribe((valor) => {
      const campoOutro = this.form.get('localViolenciaOutro');
      if (!campoOutro) return;
      if (valor === 'Outros espaços') {
        campoOutro.setValidators([Validators.required]);
      } else {
        campoOutro.clearValidators();
        campoOutro.setValue('');
      }
      campoOutro.updateValueAndValidity({ emitEvent: false });
    });
    this.form.get('vitimaOrientacaoSexual')?.valueChanges.subscribe((valor) => {
      const campoOutro = this.form.get('vitimaOrientacaoOutro');
      if (!campoOutro) return;
      if (valor === 'Outro') {
        campoOutro.setValidators([Validators.required]);
      } else {
        campoOutro.clearValidators();
        campoOutro.setValue('');
      }
      campoOutro.updateValueAndValidity({ emitEvent: false });
    });
    this.form.get('violenciaMotivadaPor')?.valueChanges.subscribe((valores: string[]) => {
      const campoOutro = this.form.get('violenciaMotivadaOutro');
      if (!campoOutro) return;
      if (valores?.includes('Outros')) {
        campoOutro.setValidators([Validators.required]);
      } else {
        campoOutro.clearValidators();
        campoOutro.setValue('');
      }
      campoOutro.updateValueAndValidity({ emitEvent: false });
    });
    this.form.get('violenciaPraticadaPor')?.valueChanges.subscribe((valores: string[]) => {
      const campoOutro = this.form.get('violenciaPraticadaOutro');
      if (!campoOutro) return;
      if (valores?.includes('Outro')) {
        campoOutro.setValidators([Validators.required]);
      } else {
        campoOutro.clearValidators();
        campoOutro.setValue('');
      }
      campoOutro.updateValueAndValidity({ emitEvent: false });
    });
    this.form.get('denunciaOrigem')?.valueChanges.subscribe((valores: string[]) => {
      const campoOutro = this.form.get('denunciaOrigemOutro');
      if (!campoOutro) return;
      if (valores?.includes('Outro')) {
        campoOutro.setValidators([Validators.required]);
      } else {
        campoOutro.clearValidators();
        campoOutro.setValue('');
      }
      campoOutro.updateValueAndValidity({ emitEvent: false });
    });
  }

  private aplicarBloqueioCampos(campos: string[], bloqueado: boolean): void {
    campos.forEach((campo) => {
      const control = this.form.get(campo);
      if (!control) return;
      if (bloqueado) {
        control.disable({ emitEvent: false });
        control.setValue('', { emitEvent: false });
      } else {
        control.enable({ emitEvent: false });
      }
    });
  }

  private validarCamposObrigatorios(): boolean {
    const pendentes: string[] = [];
    if (!this.form.get('dataPreenchimento')?.value) {
      pendentes.push('Data de preenchimento');
    }
    if (!this.form.get('vitimaNome')?.value) {
      pendentes.push('Nome da vitima');
    }
    if (!this.form.get('vitimaIdade')?.value) {
      pendentes.push('Idade da vitima');
    }
    if (!this.form.get('resumoViolencia')?.value) {
      pendentes.push('Resumo da violencia');
    }
    if (this.form.get('localViolenciaOutro')?.invalid) {
      pendentes.push('Local da violencia (outros)');
    }
    if (this.form.get('violenciaMotivadaOutro')?.invalid) {
      pendentes.push('Violencia motivada por (outros)');
    }
    if (this.form.get('violenciaPraticadaOutro')?.invalid) {
      pendentes.push('Violencia praticada por (outro)');
    }
    if (this.form.get('vitimaOrientacaoOutro')?.invalid) {
      pendentes.push('Orientacao sexual (outro)');
    }
    if (this.form.get('denunciaOrigemOutro')?.invalid) {
      pendentes.push('Origem da denuncia (outro)');
    }
    if (this.form.get('autorParentesco')?.value === 'Sim' && !this.form.get('autorParentescoGrau')?.value) {
      pendentes.push('Grau de parentesco');
    }
    if (this.form.get('encaminharConselho')?.value === true && !this.form.get('dataEnvioConselho')?.value) {
      pendentes.push('Data de envio ao Conselho Tutelar');
    }
    if (this.form.get('encaminharConselho')?.value === false && !this.form.get('encaminharMotivo')?.value) {
      pendentes.push('Motivo do não encaminhamento');
    }
    if (pendentes.length > 0) {
      this.form.markAllAsTouched();
      this.popupTitulo = 'Campos obrigatorios';
      const builder = new PopupErrorBuilder().adicionar('Preencha os campos obrigatorios antes de salvar.');
      pendentes.forEach((campo) => builder.adicionar(campo));
      this.popupErros = builder.build();
      return false;
    }
    return true;
  }

  private obterDataAtual(): string {
    return new Date().toISOString().split('T')[0];
  }

  private normalizarTextoBusca(texto: string): string {
    return (texto || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }
}

