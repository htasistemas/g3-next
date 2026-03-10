import { CommonModule } from '@angular/common';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';

import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

import { Subject, finalize, takeUntil } from 'rxjs';



import { TelaPadraoComponent } from '../compartilhado/tela-padrao/tela-padrao.component';

import { ConfigAcoesCrud, EstadoAcoesCrud, TelaBaseComponent } from '../compartilhado/tela-base.component';

import {

  DocumentosInstituicaoService,

  DocumentoInstituicaoAnexoResponsePayload,

  DocumentoInstituicaoHistoricoResponsePayload,

  DocumentoInstituicaoRequestPayload,

  DocumentoInstituicaoResponsePayload,

  DocumentoSituacao

} from '../../services/documentos-instituicao.service';

import { AuthService } from '../../services/auth.service';

import { faFolderOpen } from '@fortawesome/free-solid-svg-icons';
import { AssistanceUnitPayload, AssistanceUnitService } from '../../services/assistance-unit.service';

type AlertaFiltro = 'hoje' | '7' | '30' | '60' | 'vencidos';



@Component({

  selector: 'app-documentos-institucionais',

  standalone: true,

  imports: [CommonModule, ReactiveFormsModule, FormsModule, TelaPadraoComponent, FontAwesomeModule],

  templateUrl: './documentos-institucionais.component.html',

  styleUrl: './documentos-institucionais.component.scss'

})

export class DocumentosInstitucionaisComponent extends TelaBaseComponent implements OnInit, OnDestroy {

  readonly faFolderOpen = faFolderOpen;



  readonly tabs = [

    { id: 'lista', label: 'Lista de Documentos' },

    { id: 'cadastro', label: 'Cadastro / Edição' },

    { id: 'anexos', label: 'Anexos e Histórico' },

    { id: 'alertas', label: 'Alertas e Vencimentos' },

    { id: 'relatorios', label: 'Relatórios / Dashboard' }

  ];



  readonly acoesToolbar: Required<ConfigAcoesCrud> = this.criarConfigAcoes({

    buscar: true,

    novo: true,

    salvar: true,

    cancelar: true,

    excluir: true,

    imprimir: true

  });



  get acoesDesabilitadas(): EstadoAcoesCrud {

    const naAbaCadastro = this.activeTab === 'cadastro';

    const naAbaLista = this.activeTab === 'lista';

    return {

      buscar: !naAbaLista,

      salvar: !naAbaCadastro,

      cancelar: !naAbaCadastro,

      excluir: !this.documentoSelecionado,

      imprimir: this.documentos.length === 0,

      novo: false

    };

  }



  activeTab: string = 'lista';

  editingId: string | null = null;

  feedback: string | null = null;

  modalNovoTipoAberto = false;

  modalNovaCategoriaAberta = false;

  modalEntradaErro: string | null = null;

  novoTipoDocumento = '';

  novaCategoria = '';

  focoNovoTipoDocumento = false;

  focoNovaCategoria = false;
  salvandoAnexo = false;



  filterForm: FormGroup;

  documentoForm: FormGroup;

  anexoForm: FormGroup;



  selectedDocumentId: string | null = null;

  alertaFiltro: AlertaFiltro = '30';



  categorias: string[] = ['Fiscal', 'Trabalhista', 'Jurídico', 'Contratos', 'Licenças', 'Segurança'];

  tiposPadrao: string[] = [

    'Certidão Negativa de Débitos Federal',

    'Certidão Negativa de Débitos Municipal',

    'Certificado de Regularidade do FGTS',

    'Alvará de Funcionamento',

    'Auto de Vistoria do Corpo de Bombeiros',

    'Contrato de Prestação de Serviços',

    'Licença Sanitária',

    'Registro de Marca no INPI'

  ];

  readonly modosRenovacao: Array<'Manual' | 'Automática'> = ['Manual', 'Automática'];



  documentos: DocumentoInstituicaoResponsePayload[] = [];



  anexos: DocumentoInstituicaoAnexoResponsePayload[] = [];



  historico: DocumentoInstituicaoHistoricoResponsePayload[] = [];

  unidadeAssistencial: AssistanceUnitPayload | null = null;



  private readonly destroy$ = new Subject<void>();
  @ViewChild('arquivoAnexoInput') arquivoAnexoInput?: ElementRef<HTMLInputElement>;



  constructor(

    private readonly fb: FormBuilder,

    private readonly documentosService: DocumentosInstituicaoService,

    private readonly authService: AuthService,

    private readonly assistanceUnitService: AssistanceUnitService

  ) {

    super();

    this.filterForm = this.fb.group({

      tipoDocumento: [''],

      orgaoEmissor: [''],

      situacao: [''],

      periodoVencimento: [''],

      orgaoFiltro: ['']

    });



    this.documentoForm = this.fb.group({

      tipoDocumento: ['', Validators.required],

      orgaoEmissor: ['', Validators.required],

      descricao: [''],

      categoria: ['Fiscal'],

      emissao: ['', Validators.required],

      validade: [''],

      semVencimento: [false],

      vencimentoIndeterminado: [false],

      responsavelInterno: [''],

      modoRenovacao: ['Manual'],

      observacaoRenovacao: [''],

      gerarAlerta: [true],

      diasAntecedencia: this.fb.control<number[]>([30]),

      formaAlerta: ['Sistema'],

      emRenovacao: [false]

    });

    this.documentoForm.patchValue({ responsavelInterno: this.obterUsuarioAtual() });



    this.anexoForm = this.fb.group({

      nomeArquivo: ['', Validators.required],

      tipo: ['PDF', Validators.required],

      arquivo: [null as File | null, Validators.required]

    });



  }



  ngOnInit(): void {

    this.carregarDocumentos();


    this.assistanceUnitService
      .get()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.unidadeAssistencial = response?.unidade ?? null;
        },
        error: () => {
          this.unidadeAssistencial = null;
        }
      });
  }



  ngOnDestroy(): void {

    this.destroy$.next();

    this.destroy$.complete();

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

    return this.hasNextTab ? this.tabs[this.activeTabIndex + 1].label : '';

  }



  onBuscarToolbar(): void {

    this.changeTab('lista');

    this.aplicarFiltros();

  }



  onNovoToolbar(): void {

    this.prepararNovoDocumento();

  }



  onSalvarToolbar(): void {

    this.salvarDocumento();

  }



  onCancelarToolbar(): void {

    this.prepararNovoDocumento();

  }



  onExcluirToolbar(): void {

    if (!this.documentoSelecionado) {

      this.feedback = 'Selecione um documento para excluir.';

      return;

    }

    this.excluirDocumento(this.documentoSelecionado);

  }



  onImprimirToolbar(): void {

    this.imprimirRelatorioTexto();

  }



  onFecharToolbar(): void {

    window.history.back();

  }



  get documentosFiltrados(): DocumentoInstituicaoResponsePayload[] {

    const { tipoDocumento, orgaoEmissor, situacao, periodoVencimento } = this.filterForm.value;

    const tipoNormalizado = this.normalizarTexto(tipoDocumento as string);

    const orgaoNormalizado = this.normalizarTexto(orgaoEmissor as string);

    return this.documentos

      .filter((doc) => !tipoNormalizado || this.normalizarTexto(doc.tipoDocumento).includes(tipoNormalizado))

      .filter((doc) => !orgaoNormalizado || this.normalizarTexto(doc.orgaoEmissor).includes(orgaoNormalizado))

      .filter((doc) => !situacao || doc.situacao === situacao)

      .filter((doc) => this.filtrarPorPeriodo(doc, periodoVencimento as string))

      .sort((a, b) => (a.validade || '').localeCompare(b.validade || ''));

  }



  get documentoSelecionado(): DocumentoInstituicaoResponsePayload | undefined {

    return this.documentos.find((doc) => doc.id === this.selectedDocumentId);

  }



  get anexosSelecionados(): DocumentoInstituicaoAnexoResponsePayload[] {

    if (!this.selectedDocumentId) return [];

    return this.anexos.filter((anexo) => anexo.documentoId === this.selectedDocumentId);

  }



  get historicoSelecionado(): DocumentoInstituicaoHistoricoResponsePayload[] {

    if (!this.selectedDocumentId) return [];

    return this.historico.filter((registro) => registro.documentoId === this.selectedDocumentId);

  }



  get contadorSituacao() {

    return {

      total: this.documentos.length,

      ativos: this.documentos.filter((doc) => doc.situacao === 'valido' || doc.situacao === 'sem_vencimento').length,

      inativos: this.documentos.filter((doc) => doc.situacao === 'em_renovacao').length,

      vencidos: this.documentos.filter((doc) => doc.situacao === 'vencido').length,

      aVencer: this.documentos.filter((doc) => doc.situacao === 'vence_em_breve').length

    };

  }



  get documentosCriticos(): DocumentoInstituicaoResponsePayload[] {

    const ordered = [...this.documentos].sort((a, b) => (a.validade || '').localeCompare(b.validade || ''));

    const vencidos = ordered.filter((d) => d.situacao === 'vencido');

    const proximos = ordered.filter((d) => d.situacao === 'vence_em_breve');

    return [...vencidos, ...proximos].filter((doc) => this.filtrarAlertas(doc));

  }



  changeTab(tab: string): void {

    this.feedback = null;

    this.activeTab = tab;

    if (tab === 'anexos') {

      this.selectedDocumentId = this.documentos[this.documentos.length - 1]?.id ?? null;

      this.carregarAnexosHistorico();

    }

  }



  onSelecionarDocumento(documentoId: string | null): void {

    this.selectedDocumentId = documentoId;

    if (this.activeTab === 'anexos') {

      this.carregarAnexosHistorico();

    }

  }



  private carregarDocumentos(): void {

    this.documentosService

      .listar()

      .pipe(takeUntil(this.destroy$))

      .subscribe({

        next: (documentos) => {

          this.documentos = documentos;

          this.refreshSituacoes();

          this.selectedDocumentId = this.documentos[0]?.id ?? null;

          if (this.activeTab === 'anexos') {

            this.carregarAnexosHistorico();

          }

        },

        error: () => {

          this.feedback = 'Não foi possível carregar os documentos institucionais.';

        }

      });

  }



  private carregarAnexosHistorico(): void {

    if (!this.selectedDocumentId) {

      this.anexos = [];

      this.historico = [];

      return;

    }

    this.carregarAnexos(this.selectedDocumentId);

    this.carregarHistorico(this.selectedDocumentId);

  }



  private carregarAnexos(documentoId: string): void {

    this.documentosService

      .listarAnexos(documentoId)

      .pipe(takeUntil(this.destroy$))

      .subscribe({

        next: (anexos) => {

          this.anexos = anexos;

        },

        error: () => {

          this.feedback = 'Não foi possível carregar os anexos.';

        }

      });

  }



  private carregarHistorico(documentoId: string): void {

    this.documentosService

      .listarHistorico(documentoId)

      .pipe(takeUntil(this.destroy$))

      .subscribe({

        next: (historico) => {

          this.historico = historico;

        },

        error: () => {

          this.feedback = 'Não foi possível carregar o histórico.';

        }

      });

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



  limparFiltros(): void {

    this.filterForm.reset({ situacao: '', periodoVencimento: '' });

  }



  aplicarFiltros(): void {

    this.selectedDocumentId = this.documentosFiltrados[0]?.id ?? null;

    if (this.activeTab === 'anexos') {

      this.carregarAnexosHistorico();

    }

  }



  irParaNovoDocumento(): void {

    this.prepararNovoDocumento();

    this.changeTab('cadastro');

  }



  prepararNovoDocumento(): void {

    this.editingId = null;

    this.documentoForm.reset({

      tipoDocumento: '',

      orgaoEmissor: '',

      descricao: '',

      categoria: 'Fiscal',

      emissao: '',

      validade: '',

      semVencimento: false,

      vencimentoIndeterminado: false,

      responsavelInterno: this.obterUsuarioAtual(),

      modoRenovacao: 'Manual',

      observacaoRenovacao: '',

      gerarAlerta: true,

      diasAntecedencia: [30],

      formaAlerta: 'Sistema',

      emRenovacao: false

    });

    this.activeTab = 'cadastro';

  }



  editarDocumento(doc: DocumentoInstituicaoResponsePayload): void {

    this.editingId = doc.id;

    this.documentoForm.patchValue({

      ...doc,

      validade: doc.validade || '',

      diasAntecedencia: doc.diasAntecedencia ?? [30]

    });

    this.activeTab = 'cadastro';

  }



  abrirModalNovoTipoDocumento(): void {

    this.modalNovoTipoAberto = true;

    this.modalEntradaErro = null;

    this.novoTipoDocumento = '';

    this.focoNovoTipoDocumento = true;

    this.focoNovaCategoria = false;

  }



  fecharModalNovoTipoDocumento(): void {

    this.modalNovoTipoAberto = false;

    this.modalEntradaErro = null;

    this.novoTipoDocumento = '';

    this.focoNovoTipoDocumento = false;

  }



  confirmarNovoTipoDocumento(): void {

    this.feedback = null;

    const novoTipo = this.novoTipoDocumento.trim();

    if (!novoTipo) {

      this.modalEntradaErro = 'Informe o nome do tipo de documento.';

      return;

    }



    const existe = this.tiposPadrao.some(

      (tipo) => this.normalizarTexto(tipo) === this.normalizarTexto(novoTipo)

    );

    if (existe) {

      this.modalEntradaErro = 'Esse tipo de documento já está cadastrado na lista.';

      return;

    }



    this.tiposPadrao = [...this.tiposPadrao, novoTipo];

    this.documentoForm.get('tipoDocumento')?.setValue(novoTipo);

    this.feedback = 'Novo tipo de documento incluído.';

    this.fecharModalNovoTipoDocumento();

  }



  abrirModalNovaCategoria(): void {

    this.modalNovaCategoriaAberta = true;

    this.modalEntradaErro = null;

    this.novaCategoria = '';

    this.focoNovaCategoria = true;

    this.focoNovoTipoDocumento = false;

  }



  fecharModalNovaCategoria(): void {

    this.modalNovaCategoriaAberta = false;

    this.modalEntradaErro = null;

    this.novaCategoria = '';

    this.focoNovaCategoria = false;

  }



  @HostListener('document:keydown.escape')

  fecharModaisEntrada(): void {

    if (this.modalNovoTipoAberto) {

      this.fecharModalNovoTipoDocumento();

    }

    if (this.modalNovaCategoriaAberta) {

      this.fecharModalNovaCategoria();

    }

  }



  confirmarNovaCategoria(): void {

    this.feedback = null;

    const novaCategoria = this.novaCategoria.trim();

    if (!novaCategoria) {

      this.modalEntradaErro = 'Informe o nome da categoria.';

      return;

    }



    const existe = this.categorias.some(

      (categoria) => this.normalizarTexto(categoria) === this.normalizarTexto(novaCategoria)

    );

    if (existe) {

      this.modalEntradaErro = 'Essa categoria já está disponível.';

      return;

    }



    this.categorias = [...this.categorias, novaCategoria];

    this.documentoForm.get('categoria')?.setValue(novaCategoria);

    this.feedback = 'Categoria adicionada para uso imediato.';

    this.fecharModalNovaCategoria();

  }



  selecionarDocumento(documento: DocumentoInstituicaoResponsePayload): void {

    this.selectedDocumentId = documento.id;

    if (this.activeTab === 'anexos') {

      this.carregarAnexosHistorico();

    }

  }



  salvarDocumento(): void {

    this.feedback = null;

    if (this.documentoForm.invalid) {

      this.feedback = 'Preencha os campos obrigatórios do documento.';

      this.documentoForm.markAllAsTouched();

      return;

    }



    const valor = this.documentoForm.value as DocumentoInstituicaoRequestPayload;

    if (!valor.semVencimento && valor.validade && valor.emissao && valor.validade < valor.emissao) {

      this.feedback = 'A data de vencimento não pode ser anterior à data de emissão.';

      return;

    }



    const payload = this.montarPayloadDocumento(valor);



    if (this.editingId) {

      this.documentosService

        .atualizar(this.editingId, payload)

        .pipe(takeUntil(this.destroy$))

        .subscribe({

          next: (documento) => {

            this.documentos = this.documentos.map((doc) => (doc.id === this.editingId ? documento : doc));

            this.feedback = 'Documento atualizado com sucesso.';

            this.selectedDocumentId = documento.id;

            this.refreshSituacoes();

            this.changeTab('anexos');

          },

          error: () => {

            this.feedback = 'Não foi possível atualizar o documento.';

          }

        });

      return;

    }



    this.documentosService

      .criar(payload)

      .pipe(takeUntil(this.destroy$))

      .subscribe({

        next: (documento) => {

          this.documentos = [...this.documentos, documento];

          this.feedback = 'Documento cadastrado com sucesso.';

          this.selectedDocumentId = documento.id;

          this.refreshSituacoes();

          this.changeTab('anexos');

        },

        error: () => {

          this.feedback = 'Não foi possível cadastrar o documento.';

        }

      });

  }



  excluirDocumento(doc: DocumentoInstituicaoResponsePayload): void {

    this.documentosService

      .excluir(doc.id)

      .pipe(takeUntil(this.destroy$))

      .subscribe({

        next: () => {

          this.documentos = this.documentos.filter((d) => d.id !== doc.id);

          if (this.selectedDocumentId === doc.id) {

            this.selectedDocumentId = this.documentos[0]?.id ?? null;

            this.carregarAnexosHistorico();

          }

          this.refreshSituacoes();

        },

        error: () => {

          this.feedback = 'Não foi possível excluir o documento.';

        }

      });

  }

  async adicionarAnexo(): Promise<void> {

    this.feedback = null;

    if (!this.selectedDocumentId) {

      this.feedback = 'Selecione um documento antes de anexar o arquivo digitalizado.';

      return;

    }



    if (this.anexoForm.invalid) {

      this.feedback = 'Preencha o nome e selecione o arquivo digitalizado.';

      this.anexoForm.markAllAsTouched();

      return;

    }



    const arquivo = this.anexoForm.value.arquivo as File | null;

    if (!arquivo) return;



    let conteudoBase64: string;

    try {

      conteudoBase64 = await this.lerArquivoBase64(arquivo);

    } catch {

      this.feedback = 'Não foi possível ler o arquivo selecionado.';

      return;

    }



    this.salvandoAnexo = true;
    this.documentosService

      .adicionarAnexo(this.selectedDocumentId, {

        nomeArquivo: this.anexoForm.value.nomeArquivo,

        tipo: this.anexoForm.value.tipo,

        tipoMime: arquivo.type || this.obterTipoMime(arquivo.name),

        conteudoBase64,

        dataUpload: new Date().toISOString().slice(0, 10),

        usuario: this.obterUsuarioAtual(),

        tamanho: this.formatarTamanho(arquivo.size)

      })

      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.salvandoAnexo = false;
        })
      )

      .subscribe({

        next: (anexo) => {

          this.anexos = [anexo, ...this.anexos];

          this.anexoForm.reset({ tipo: 'PDF', arquivo: null, nomeArquivo: '' });
          if (this.arquivoAnexoInput) {
            this.arquivoAnexoInput.nativeElement.value = '';
          }
          this.feedback = 'Anexo salvo com sucesso.';

        },

        error: () => {

          this.feedback = 'Não foi possível salvar o anexo.';

        }

      });

  }

  visualizarAnexo(anexo: DocumentoInstituicaoAnexoResponsePayload): void {

    if (!anexo.arquivoUrl) {

      this.feedback = 'Arquivo do anexo não encontrado.';

      return;

    }

    window.open(anexo.arquivoUrl, '_blank');

  }



  registrarHistorico(mensagem: string, tipoAlteracao: string): void {

    if (!this.selectedDocumentId) return;



    this.documentosService

      .adicionarHistorico(this.selectedDocumentId, {

        dataHora: new Date().toISOString(),

        usuario: this.obterUsuarioAtual(),

        tipoAlteracao,

        observacao: mensagem

      })

      .pipe(takeUntil(this.destroy$))

      .subscribe({

        next: (registro) => {

          this.historico = [registro, ...this.historico];

        },

        error: () => {

          this.feedback = 'Não foi possível registrar o histórico.';

        }

      });

  }



  private montarPayloadDocumento(valor: DocumentoInstituicaoRequestPayload): DocumentoInstituicaoRequestPayload {

    return {

      tipoDocumento: valor.tipoDocumento,

      orgaoEmissor: valor.orgaoEmissor,

      descricao: valor.descricao,

      categoria: valor.categoria,

      emissao: valor.emissao,

      validade: valor.semVencimento ? null : valor.validade || null,

      responsavelInterno: valor.responsavelInterno,

      modoRenovacao: valor.modoRenovacao,

      observacaoRenovacao: valor.observacaoRenovacao,

      gerarAlerta: valor.gerarAlerta,

      diasAntecedencia: valor.diasAntecedencia,

      formaAlerta: valor.formaAlerta,

      emRenovacao: valor.emRenovacao,

      semVencimento: valor.semVencimento,

      vencimentoIndeterminado: valor.vencimentoIndeterminado

    };

  }



  private obterUsuarioAtual(): string {

    const usuario = this.authService.user();

    return usuario?.nome ?? usuario?.nomeUsuario ?? 'Sistema';

  }



  imprimirDocumento(doc: DocumentoInstituicaoResponsePayload): void {

    const janela = window.open('', '_blank', 'width=900,height=1200');

    if (!janela) return;


    const unidade = this.unidadeAssistencial;
    const razaoSocial = unidade?.razaoSocial || unidade?.nomeFantasia || "Instituição";
    const cnpj = unidade?.cnpj || "";
    const enderecoLinha = [unidade?.endereco, unidade?.numeroEndereco, unidade?.complemento]
      .filter((valor) => (valor ?? "").toString().trim().length > 0)
      .join(", ");
    const linhaEndereco = [cnpj ? `CNPJ: ${cnpj}` : "", enderecoLinha, unidade?.bairro, unidade?.cidade]
      .filter((valor) => (valor ?? "").toString().trim().length > 0)
      .join(" | ") || "Endereço não informado";
    const linhaContato = [
      unidade?.telefone ? `Telefone: ${unidade.telefone}` : "",
      unidade?.email ? `E-mail: ${unidade.email}` : "",
      unidade?.site ? `Site: ${unidade.site}` : ""
    ]
      .filter((valor) => (valor ?? "").toString().trim().length > 0)
      .join(" | ");


    const situacao = this.labelSituacao(doc.situacao ?? this.calcularSituacao(doc));



    janela.document.write(`

      <html>

        <head>

          <title>Documento institucional</title>

          <style>

            body { font-family: Arial, sans-serif; padding: 24px; line-height: 1.5; }

            h1 { font-size: 20px; margin-bottom: 4px; }

            h2 { font-size: 16px; margin-top: 24px; }

            table { border-collapse: collapse; width: 100%; margin-top: 12px; }

            th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }

            .pill { display: inline-block; padding: 4px 10px; border-radius: 999px; background: #e0f2fe; color: #0369a1; }

            footer { margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 8px; font-size: 11px; color: #475569; text-align: center; page-break-inside: avoid; }
            .page-number:before { content: "Página " counter(page) " de " counter(pages); }
          </style>

        </head>

        <body>

          <h1>Ficha do documento</h1>

          <p class="pill">${situacao}</p>

          <table>

            <tr><th>Tipo</th><td>${doc.tipoDocumento}</td></tr>

            <tr><th>Órgão emissor</th><td>${doc.orgaoEmissor}</td></tr>

            <tr><th>Categoria</th><td>${doc.categoria}</td></tr>

            <tr><th>Emissão</th><td>${doc.emissao}</td></tr>

            <tr><th>Validade</th><td>${doc.validade || 'Sem vencimento'}</td></tr>

            <tr><th>Responsável</th><td>${doc.responsavelInterno || '-'} </td></tr>

            <tr><th>Renovação</th><td>${doc.modoRenovacao}</td></tr>

            <tr><th>Observações</th><td>${doc.descricao || doc.observacaoRenovacao || '-'}</td></tr>

          </table>\n          <footer>
             <p>${razaoSocial}</p>
             <p>${linhaEndereco}</p>
             <p>${linhaContato}</p>
             <p class="page-number"></p>
           </footer>

        </body>

      </html>

    `);



    janela.document.close();

    janela.focus();

    janela.print();

  }



  labelSituacao(situacao: DocumentoSituacao): string {

    const labels: Record<DocumentoSituacao, string> = {

      valido: 'Válido',

      vence_em_breve: 'Vence em breve',

      vencido: 'Vencido',

      em_renovacao: 'Em renovação',

      sem_vencimento: 'Sem vencimento'

    };

    return labels[situacao];

  }



  classeSituacao(situacao?: DocumentoSituacao): string {

    const mapa: Record<DocumentoSituacao, string> = {

      valido: 'status status--valido',

      vence_em_breve: 'status status--aviso',

      vencido: 'status status--critico',

      em_renovacao: 'status status--info',

      sem_vencimento: 'status status--neutro'

    };

    return situacao ? mapa[situacao] : 'status';

  }



  alternarDiasAntecedencia(dia: number): void {

    const control = this.documentoForm.get('diasAntecedencia');

    const atual = new Set<number>(control?.value ?? []);

    if (atual.has(dia)) {

      atual.delete(dia);

    } else {

      atual.add(dia);

    }

    control?.setValue(Array.from(atual));

  }



  contarVencendo(maxDias: number, minDias = 0): number {

    return this.documentos.filter((d) => {

      const diff = this.diferencaDias(d.validade);

      return diff <= maxDias && diff >= minDias;

    }).length;

  }



  contarPorCategoria(categoria: string): number {

    return this.documentos.filter((d) => d.categoria === categoria).length;

  }



  exportarRelatorioPDF(): void {

    const janela = window.open('', '_blank', 'width=900,height=1200');

    if (!janela) return;



    janela.document.write(this.gerarHtmlRelatorio());

    janela.document.close();

    janela.focus();

    janela.print();

  }



  exportarRelatorioExcel(): void {

    const cabecalho = [

      'Tipo de Documento',

      'Categoria',

      'Vencimento',

      'Situação',

      'Órgão emissor',

      'Responsável interno'

    ];



    const linhas = this.documentos.map((doc) => [

      doc.tipoDocumento,

      doc.categoria,

      doc.validade || 'Sem vencimento',

      this.labelSituacao(doc.situacao ?? this.calcularSituacao(doc)),

      doc.orgaoEmissor,

      doc.responsavelInterno || '—'

    ]);



    const csv = [cabecalho, ...linhas]

      .map((linha) => linha.map((valor) => this.escapeCsv(valor)).join(';'))

      .join('\n');



    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });

    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');

    link.href = url;

    link.download = 'relatorio-documentos.csv';

    link.click();

    URL.revokeObjectURL(url);

  }



  imprimirRelatorioTexto(): void {


    const unidade = this.unidadeAssistencial;
    const razaoSocial = unidade?.razaoSocial || unidade?.nomeFantasia || "Instituição";
    const cnpj = unidade?.cnpj || "";
    const enderecoLinha = [unidade?.endereco, unidade?.numeroEndereco, unidade?.complemento]
      .filter((valor) => (valor ?? "").toString().trim().length > 0)
      .join(", ");
    const linhaEndereco = [cnpj ? `CNPJ: ${cnpj}` : "", enderecoLinha, unidade?.bairro, unidade?.cidade]
      .filter((valor) => (valor ?? "").toString().trim().length > 0)
      .join(" | ") || "Endereço não informado";
    const linhaContato = [
      unidade?.telefone ? `Telefone: ${unidade.telefone}` : "",
      unidade?.email ? `E-mail: ${unidade.email}` : "",
      unidade?.site ? `Site: ${unidade.site}` : ""
    ]
      .filter((valor) => (valor ?? "").toString().trim().length > 0)
      .join(" | ");
    const janela = window.open('', '_blank', 'width=900,height=1200');

    if (!janela) return;



    const headers = ['Tipo', 'Categoria', 'Vencimento', 'Situação'];

    const linhas = this.documentos.map((doc) => [

      doc.tipoDocumento.padEnd(36, ' '),

      (doc.categoria ?? '').padEnd(14, ' '),

      (doc.validade || 'Sem vencimento').padEnd(16, ' '),

      this.labelSituacao(doc.situacao ?? this.calcularSituacao(doc))

    ]);



    const conteudo = [

      'RELATÓRIO TEXTO - LISTA DE DOCUMENTOS',

      'Atualizado em: ' + new Date().toLocaleString('pt-BR'),

      ''.padEnd(90, '='),

      headers.map((h) => h.padEnd(18, ' ')).join(''),

      ''.padEnd(90, '-'),

      ...linhas.map((linha) => linha.join('')),


      '',
      razaoSocial,
      linhaEndereco,
      linhaContato
    ].join('\n');



    janela.document.write(`

      <html>

        <head>

          <title>Relação resumida de documentos</title>

          <style>

            body { font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace; padding: 24px; }

            pre { font-size: 14px; white-space: pre; }

          </style>

        </head>

        <body>

          <pre>${conteudo}</pre>

        </body>

      </html>

    `);



    janela.document.close();

    janela.focus();

    janela.print();

  }



  onFileSelected(event: Event): void {

    const input = event.target as HTMLInputElement;

    const file = input.files?.[0];

    if (!file) return;



    this.anexoForm.patchValue({

      nomeArquivo: file.name,

      tipo: this.detectarTipoArquivo(file),

      arquivo: file

    });

  }



  private gerarHtmlRelatorio(): string {


    const unidade = this.unidadeAssistencial;
    const razaoSocial = unidade?.razaoSocial || unidade?.nomeFantasia || "Instituição";
    const cnpj = unidade?.cnpj || "";
    const enderecoLinha = [unidade?.endereco, unidade?.numeroEndereco, unidade?.complemento]
      .filter((valor) => (valor ?? "").toString().trim().length > 0)
      .join(", ");
    const linhaEndereco = [cnpj ? `CNPJ: ${cnpj}` : "", enderecoLinha, unidade?.bairro, unidade?.cidade]
      .filter((valor) => (valor ?? "").toString().trim().length > 0)
      .join(" | ") || "Endereço não informado";
    const linhaContato = [
      unidade?.telefone ? `Telefone: ${unidade.telefone}` : "",
      unidade?.email ? `E-mail: ${unidade.email}` : "",
      unidade?.site ? `Site: ${unidade.site}` : ""
    ]
      .filter((valor) => (valor ?? "").toString().trim().length > 0)
      .join(" | ");
    const linhas = this.documentos

      .map(

        (doc) => `

        <tr>

          <td>${doc.tipoDocumento}</td>

          <td>${doc.categoria}</td>

          <td>${doc.validade || 'Sem vencimento'}</td>

          <td>${this.labelSituacao(doc.situacao ?? this.calcularSituacao(doc))}</td>

          <td>${doc.orgaoEmissor}</td>

          <td>${doc.responsavelInterno || '—'}</td>

        </tr>`

      )

      .join('');



    return `

      <html>

        <head>

          <title>Relatório de documentos institucionais</title>

          <style>

            body { font-family: Arial, sans-serif; padding: 24px; }

            h1 { margin: 0 0 12px; }

            table { border-collapse: collapse; width: 100%; font-size: 13px; }

            th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }

            th { background: #f1f5f9; }

            footer { margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 8px; font-size: 11px; color: #475569; text-align: center; page-break-inside: avoid; }
            .page-number:before { content: "Página " counter(page) " de " counter(pages); }
          </style>

        </head>

        <body>

          <h1>Relatório completo de documentos</h1>

          <p>Gerado em ${new Date().toLocaleString('pt-BR')}</p>

          <table>

            <thead>

              <tr>

                <th>Tipo</th>

                <th>Categoria</th>

                <th>Vencimento</th>

                <th>Situação</th>

                <th>Órgão emissor</th>

                <th>Responsável</th>

              </tr>

            </thead>

            <tbody>${linhas}</tbody>

          </table>\n          <footer>
             <p>${razaoSocial}</p>
             <p>${linhaEndereco}</p>
             <p>${linhaContato}</p>
             <p class="page-number"></p>
           </footer>

        </body>

      </html>

    `;

  }



  private escapeCsv(valor: string | number | null | undefined): string {

    const texto = (valor ?? '').toString().replace(/"/g, '""');

    return `"${texto}"`;

  }



  private detectarTipoArquivo(file: File): string {

    if (file.type.includes('pdf') || file.name.toLowerCase().endsWith('.pdf')) return 'PDF';

    if (file.type.includes('png') || file.name.toLowerCase().endsWith('.png')) return 'PNG';

    if (file.type.includes('jpg') || file.type.includes('jpeg') || file.name.toLowerCase().match(/\.jpe?g$/)) return 'JPG';

    return 'PDF';

  }



  private formatarTamanho(bytes: number): string {

    if (!bytes) return '—';

    const mb = bytes / (1024 * 1024);

    return mb >= 1 ? `${mb.toFixed(2)} MB` : `${(bytes / 1024).toFixed(0)} KB`;

  }



  private lerArquivoBase64(arquivo: File): Promise<string> {

    return new Promise((resolve, reject) => {

      const reader = new FileReader();

      reader.onload = () => resolve(reader.result as string);

      reader.onerror = () => reject(reader.error);

      reader.readAsDataURL(arquivo);

    });

  }



  private obterTipoMime(nomeArquivo: string): string {

    const nome = (nomeArquivo || '').toLowerCase();

    if (nome.endsWith('.pdf')) return 'application/pdf';

    if (nome.endsWith('.png')) return 'image/png';

    if (nome.endsWith('.jpg') || nome.endsWith('.jpeg')) return 'image/jpeg';

    return 'application/octet-stream';

  }

  private normalizarTexto(valor: string): string {

    if (!valor) return '';

    return valor

      .normalize('NFD')

      .replace(/[\u0300-\u036f]/g, '')

      .toLowerCase();

  }



  private filtrarPorPeriodo(doc: DocumentoInstituicaoResponsePayload, periodo?: string): boolean {

    if (!periodo) return true;

    if (!doc.validade) return periodo === 'sem_vencimento';



    const dias = Number(periodo);

    const diff = this.diferencaDias(doc.validade);

    return diff <= dias && diff >= 0;

  }



  private filtrarAlertas(doc: DocumentoInstituicaoResponsePayload): boolean {

    if (this.alertaFiltro === 'vencidos') return doc.situacao === 'vencido';

    if (this.alertaFiltro === 'hoje') return this.diferencaDias(doc.validade) === 0;



    const dias = Number(this.alertaFiltro);

    if (isNaN(dias)) return true;

    const diff = this.diferencaDias(doc.validade);

    return diff >= 0 && diff <= dias;

  }



  private refreshSituacoes(): void {

    this.documentos = this.documentos.map((doc) => ({

      ...doc,

      situacao: this.calcularSituacao(doc)

    }));

  }



  private calcularSituacao(doc: DocumentoInstituicaoResponsePayload): DocumentoSituacao {

    if (doc.emRenovacao) return 'em_renovacao';

    if (doc.semVencimento) return 'sem_vencimento';

    if (!doc.validade) return 'valido';



    const diff = this.diferencaDias(doc.validade);

    if (diff < 0) return 'vencido';

    if (diff <= 30) return 'vence_em_breve';

    return 'valido';

  }



  diferencaDias(data?: string | null): number {

    if (!data) return Number.MAX_SAFE_INTEGER;

    const hoje = new Date();

    const vencimento = new Date(data);

    const diffTime = vencimento.getTime() - hoje.getTime();

    return Math.floor(diffTime / (1000 * 60 * 60 * 24));

  }



}












