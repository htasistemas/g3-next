import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { TelaPadraoComponent } from '../compartilhado/tela-padrao/tela-padrao.component';
import { PopupMessagesComponent } from '../compartilhado/popup-messages/popup-messages.component';
import { AutocompleteComponent, AutocompleteOpcao } from '../compartilhado/autocomplete/autocomplete.component';
import { DialogComponent } from '../compartilhado/dialog/dialog.component';
import { ConfigAcoesCrud, EstadoAcoesCrud, TelaBaseComponent } from '../compartilhado/tela-base.component';
import {
  BibliotecaAlerta,
  BibliotecaEmprestimo,
  BibliotecaEmprestimoCadastro,
  BibliotecaLivro,
  BibliotecaLivroCadastro,
  BibliotecaService
} from '../../services/biblioteca.service';
import { BeneficiaryService, BeneficiaryPayload } from '../../services/beneficiary.service';
import { ProfessionalService, ProfessionalRecord } from '../../services/professional.service';
import { VolunteerService, VolunteerPayload } from '../../services/volunteer.service';
import { PopupErrorBuilder } from '../../utils/popup-error.builder';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faBook } from '@fortawesome/free-solid-svg-icons';

interface BibliotecaAba {
  id: BibliotecaAbaId;
  label: string;
  descricao: string;
}

type BibliotecaAbaId = 'visao' | 'livros' | 'emprestimos' | 'devolucoes' | 'disponiveis' | 'alertas';

type EntidadeExclusao = 'livro' | 'emprestimo' | null;

@Component({
  selector: 'app-biblioteca-gestao',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TelaPadraoComponent,
    PopupMessagesComponent,
    AutocompleteComponent,
    DialogComponent,
    FontAwesomeModule
  ],
  templateUrl: './biblioteca-gestao.component.html',
  styleUrl: './biblioteca-gestao.component.scss'
})
export class BibliotecaGestaoComponent extends TelaBaseComponent implements OnInit, OnDestroy {
  readonly faBook = faBook;
  readonly abas: BibliotecaAba[] = [
    {
      id: 'visao',
      label: 'Visao geral',
      descricao: 'Resumo do acervo, empréstimos ativos e alertas de devolução.'
    },
    {
      id: 'livros',
      label: 'Cadastro de livros',
      descricao: 'Controle completo do acervo e da disponibilidade por exemplar.'
    },
    {
      id: 'emprestimos',
      label: 'Empréstimos',
      descricao: 'Registre empréstimos para beneficiários e acompanhe devoluções.'
    },
    {
      id: 'devolucoes',
      label: 'Devolucoes',
      descricao: 'Registre devoluções e atualize a disponibilidade dos livros.'
    },
    {
      id: 'disponiveis',
      label: 'Livros disponiveis',
      descricao: 'Relação de livros com disponibilidade imediata para empréstimo.'
    },
    {
      id: 'alertas',
      label: 'Alertas de devolucao',
      descricao: 'Alertas automáticos de livros vencidos e prestes a vencer.'
    }
  ];

  abaAtiva: BibliotecaAbaId = 'visao';

  livros: BibliotecaLivro[] = [];
  emprestimos: BibliotecaEmprestimo[] = [];
  alertas: BibliotecaAlerta[] = [];
  beneficiarios: BeneficiaryPayload[] = [];
  profissionais: ProfessionalRecord[] = [];
  voluntarios: VolunteerPayload[] = [];

  carregandoLivros = false;
  carregandoEmprestimos = false;
  carregandoAlertas = false;
  carregandoBeneficiarios = false;
  carregandoResponsaveis = false;

  termoLivro = '';
  termoEmprestimo = '';
  termoDevolucao = '';
  termoDisponiveis = '';

  formLivro: FormGroup;
  formEmprestimo: FormGroup;

  livroSelecionado: BibliotecaLivro | null = null;
  emprestimoSelecionado: BibliotecaEmprestimo | null = null;

  popupErros: string[] = [];
  mensagemFeedback: string | null = null;
  private feedbackTimeout?: ReturnType<typeof setTimeout>;

  dialogConfirmacaoAberta = false;
  dialogTitulo = '';
  dialogMensagem = '';
  dialogConfirmarLabel = 'Confirmar';
  entidadeExclusao: EntidadeExclusao = null;

  beneficiarioTermo = '';
  beneficiarioOpcoes: AutocompleteOpcao[] = [];
  responsavelTermo = '';
  responsavelOpcoes: AutocompleteOpcao[] = [];
  categoriasLivros: string[] = [
    'Administração',
    'Autoajuda',
    'Biografias',
    'Ciências',
    'Contos',
    'Culinária',
    'Didático',
    'Direito',
    'Educação',
    'Espiritualidade',
    'Ficção',
    'Ficção Científica',
    'História',
    'Infantil',
    'Juvenil',
    'Literatura Brasileira',
    'Literatura Estrangeira',
    'Medicina',
    'Psicologia',
    'Romance',
    'Saúde',
    'Tecnologia'
  ];
  estadosLivro: string[] = [
    'Novo',
    'Excelente',
    'Bom',
    'Regular',
    'Danificado',
    'Restauração',
    'Extraviado'
  ];
  codigoLivroGerado = '';

  readonly acoesToolbar: Required<ConfigAcoesCrud> = this.criarConfigAcoes({
    salvar: true,
    excluir: true,
    novo: true,
    cancelar: true,
    imprimir: true,
    buscar: true
  });

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly servicoBiblioteca: BibliotecaService,
    private readonly servicoBeneficiario: BeneficiaryService,
    private readonly servicoProfissional: ProfessionalService,
    private readonly servicoVoluntario: VolunteerService
  ) {
    super();
    this.formLivro = this.criarLivroForm();
    this.formEmprestimo = this.criarEmprestimoForm();
  }

  ngOnInit(): void {
    this.carregarDadosIniciais();
  }

  ngOnDestroy(): void {
    if (this.feedbackTimeout) {
      clearTimeout(this.feedbackTimeout);
      this.feedbackTimeout = undefined;
    }
  }

  carregarDadosIniciais(): void {
    this.carregarLivros();
    this.carregarEmprestimos();
    this.carregarAlertas();
    this.carregarBeneficiarios();
    this.carregarResponsaveis();
    this.carregarProximoCodigoLivro();
  }

  get acoesDesabilitadas(): EstadoAcoesCrud {
    const salvarDesabilitado =
      this.abaAtiva === 'alertas' ||
      this.abaAtiva === 'visao' ||
      this.abaAtiva === 'devolucoes' ||
      this.abaAtiva === 'disponiveis';
    const excluirDesabilitado =
      (this.abaAtiva === 'livros' && !this.livroSelecionado) ||
      (this.abaAtiva === 'emprestimos' && !this.emprestimoSelecionado) ||
      salvarDesabilitado;
    return {
      salvar: salvarDesabilitado,
      excluir: excluirDesabilitado,
      novo: false,
      cancelar: false,
      imprimir: false,
      buscar: false
    };
  }

  alterarAba(abaId: BibliotecaAbaId): void {
    this.abaAtiva = abaId;
    if (abaId === 'devolucoes' || abaId === 'emprestimos') {
      this.carregarEmprestimos();
      this.carregarLivros();
      return;
    }
    if (abaId === 'disponiveis') {
      this.carregarLivros();
    }
  }

  get indiceAbaAtiva(): number {
    return this.abas.findIndex((aba) => aba.id === this.abaAtiva);
  }

  aoSalvarToolbar(): void {
    if (this.abaAtiva === 'livros') {
      this.salvarLivro();
      return;
    }
    if (this.abaAtiva === 'emprestimos') {
      this.salvarEmprestimo();
      return;
    }
    this.popupErros = new PopupErrorBuilder().adicionar('Selecione uma aba de cadastro para salvar.').build();
  }

  aoNovoToolbar(): void {
    this.mensagemFeedback = null;
    this.abaAtiva = 'livros';
    this.resetarLivroForm();
  }

  aoCancelarToolbar(): void {
    this.mensagemFeedback = null;
    if (this.abaAtiva === 'emprestimos') {
      this.resetarEmprestimoForm();
      return;
    }
    if (this.abaAtiva === 'livros') {
      this.resetarLivroForm();
    }
  }

  aoBuscarToolbar(): void {
    this.mensagemFeedback = null;
    this.abaAtiva = 'livros';
    this.carregarLivros();
  }

  aoExcluirToolbar(): void {
    if (this.abaAtiva === 'livros' && this.livroSelecionado) {
      this.abrirDialogoExclusao('livro');
      return;
    }
    if (this.abaAtiva === 'emprestimos' && this.emprestimoSelecionado) {
      this.abrirDialogoExclusao('emprestimo');
      return;
    }
    this.popupErros = new PopupErrorBuilder()
      .adicionar('Selecione um registro para excluir antes de continuar.')
      .build();
  }

  aoImprimirToolbar(): void {
    if (this.abaAtiva === 'livros') {
      this.imprimirLivros();
      return;
    }
    if (this.abaAtiva === 'emprestimos') {
      this.imprimirEmprestimos();
      return;
    }
    this.popupErros = new PopupErrorBuilder().adicionar('Selecione uma aba com listagem para imprimir.').build();
  }

  aoFecharToolbar(): void {
    window.history.back();
  }

  carregarLivros(): void {
    this.carregandoLivros = true;
    this.servicoBiblioteca.listarLivros().subscribe({
      next: (livros) => {
        this.livros = livros;
        this.carregandoLivros = false;
        if (!this.livroSelecionado) {
          this.carregarProximoCodigoLivro();
        }
      },
      error: () => {
        this.carregandoLivros = false;
        this.popupErros = new PopupErrorBuilder().adicionar('Não foi possível carregar os livros.').build();
      }
    });
  }

  carregarEmprestimos(): void {
    this.carregandoEmprestimos = true;
    this.servicoBiblioteca.listarEmprestimos().subscribe({
      next: (emprestimos) => {
        this.emprestimos = emprestimos;
        this.carregandoEmprestimos = false;
      },
      error: () => {
        this.carregandoEmprestimos = false;
        this.popupErros = new PopupErrorBuilder().adicionar('Não foi possível carregar os empréstimos.').build();
      }
    });
  }

  carregarAlertas(): void {
    this.carregandoAlertas = true;
    this.servicoBiblioteca.listarAlertas().subscribe({
      next: (alertas) => {
        this.alertas = alertas;
        this.carregandoAlertas = false;
      },
      error: () => {
        this.carregandoAlertas = false;
        this.popupErros = new PopupErrorBuilder().adicionar('Não foi possível carregar os alertas de devolução.').build();
      }
    });
  }

  private carregarBeneficiarios(): void {
    this.carregandoBeneficiarios = true;
    this.servicoBeneficiario.list().subscribe({
      next: ({ beneficiarios }) => {
        this.beneficiarios = beneficiarios;
        this.beneficiarioOpcoes = this.mapearBeneficiariosParaOpcoes(beneficiarios);
        this.carregandoBeneficiarios = false;
      },
      error: () => {
        this.carregandoBeneficiarios = false;
        this.beneficiarioOpcoes = [];
      }
    });
  }

  private carregarResponsaveis(): void {
    this.carregandoResponsaveis = true;
    this.servicoProfissional.list().subscribe({
      next: (profissionais) => {
        this.profissionais = profissionais ?? [];
        this.atualizarOpcoesResponsaveis();
      },
      error: () => {
        this.profissionais = [];
        this.atualizarOpcoesResponsaveis();
      }
    });
    this.servicoVoluntario.list().subscribe({
      next: (voluntarios) => {
        this.voluntarios = voluntarios ?? [];
        this.atualizarOpcoesResponsaveis();
      },
      error: () => {
        this.voluntarios = [];
        this.atualizarOpcoesResponsaveis();
      }
    });
  }

  private mapearBeneficiariosParaOpcoes(beneficiarios: BeneficiaryPayload[]): AutocompleteOpcao[] {
    return beneficiarios.map((beneficiario) => ({
      id: beneficiario.id || '',
      label: this.montarLabelBeneficiario(beneficiario),
      sublabel: beneficiario.cpf || beneficiario.codigo || ''
    }));
  }

  private obterNomeBeneficiario(beneficiario: BeneficiaryPayload): string {
    const fonte = beneficiario as BeneficiaryPayload & {
      nome_completo?: string;
      nome_social?: string;
      apelido?: string;
    };
    return (
      beneficiario.nomeCompleto ||
      fonte.nome_completo ||
      beneficiario.nomeSocial ||
      fonte.nome_social ||
      beneficiario.apelido ||
      fonte.apelido ||
      'Beneficiário sem nome'
    );
  }

  private montarLabelBeneficiario(beneficiario: BeneficiaryPayload): string {
    const nome = this.obterNomeBeneficiario(beneficiario);
    const documento = this.formatarDocumentoBeneficiario(beneficiario.cpf, beneficiario.codigo);
    if (!documento) {
      return nome;
    }
    return `${nome} - ${documento}`;
  }

  private formatarDocumentoBeneficiario(cpf?: string, codigo?: string): string | undefined {
    if (cpf) {
      const apenasNumeros = cpf.replace(/\D/g, '');
      if (apenasNumeros.length === 11) {
        return apenasNumeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
      }
      return cpf;
    }
    return codigo || undefined;
  }

  atualizarBeneficiarioTermo(termo: string): void {
    this.beneficiarioTermo = termo;
    const termoNormalizado = this.normalizarTermo(termo);
    this.beneficiarioOpcoes = this.mapearBeneficiariosParaOpcoes(this.beneficiarios).filter((opcao) =>
      this.normalizarTermo(opcao.label).includes(termoNormalizado)
    );
    this.formEmprestimo.patchValue({
      beneficiarioNome: termo
    });
  }

  selecionarBeneficiario(opcao: AutocompleteOpcao): void {
    this.beneficiarioTermo = opcao.label;
    this.formEmprestimo.patchValue({
      beneficiarioId: opcao.id,
      beneficiarioNome: opcao.label
    });
  }

  atualizarResponsavelTermo(termo: string): void {
    this.responsavelTermo = termo;
    this.atualizarOpcoesResponsaveis();
    this.formEmprestimo.patchValue({
      responsavelNome: termo,
      responsavelId: ''
    });
  }

  selecionarResponsavel(opcao: AutocompleteOpcao): void {
    this.responsavelTermo = opcao.label;
    this.formEmprestimo.patchValue({
      responsavelId: opcao.id,
      responsavelNome: opcao.label
    });
  }

  selecionarLivro(livro: BibliotecaLivro): void {
    this.livroSelecionado = livro;
    this.codigoLivroGerado = livro.codigo;
    this.formLivro.patchValue({
      codigo: livro.codigo,
      titulo: livro.titulo,
      autor: livro.autor,
      isbn: livro.isbn,
      editora: livro.editora,
      anoPublicacao: livro.anoPublicacao,
      categoria: livro.categoria,
      quantidadeTotal: livro.quantidadeTotal,
      quantidadeDisponivel: livro.quantidadeDisponivel,
      localizacao: livro.localizacao,
      status: livro.status,
      estadoLivro: livro.estadoLivro || 'Bom',
      observacoes: livro.observacoes
    });
  }

  selecionarEmprestimo(emprestimo: BibliotecaEmprestimo): void {
    this.emprestimoSelecionado = emprestimo;
    this.formEmprestimo.patchValue({
      livroId: emprestimo.livroId,
      beneficiarioId: emprestimo.beneficiarioId,
      beneficiarioNome: emprestimo.beneficiarioNome,
      responsavelId: emprestimo.responsavelId || '',
      responsavelNome: emprestimo.responsavelNome,
      dataEmprestimo: emprestimo.dataEmprestimo,
      dataDevolucaoPrevista: emprestimo.dataDevolucaoPrevista,
      dataDevolucaoReal: emprestimo.dataDevolucaoReal || null,
      observacoes: emprestimo.observacoes
    });
    this.beneficiarioTermo = emprestimo.beneficiarioNome || '';
    this.responsavelTermo = emprestimo.responsavelNome || '';
  }

  salvarLivro(): void {
    this.popupErros = [];
    if (this.formLivro.invalid) {
      this.formLivro.markAllAsTouched();
      this.popupErros = this.validarLivroObrigatorio();
      return;
    }

    if (!this.formLivro.get('codigo')?.value && !this.codigoLivroGerado && !this.livroSelecionado) {
      this.servicoBiblioteca.obterProximoCodigoLivro().subscribe({
        next: (codigo) => {
          this.codigoLivroGerado = codigo;
          this.formLivro.patchValue({ codigo });
          this.salvarLivroComCodigo();
        },
        error: () => {
          this.popupErros = new PopupErrorBuilder()
            .adicionar('Não foi possível gerar o código do livro automaticamente.')
            .build();
        }
      });
      return;
    }

    this.salvarLivroComCodigo();
  }

  private salvarLivroComCodigo(): void {
    const dados = this.criarCadastroLivro();

    if (this.livroSelecionado) {
      this.servicoBiblioteca.atualizarLivro(this.livroSelecionado.id, dados).subscribe({
        next: (livro) => {
          this.livros = this.livros.map((item) => (item.id === livro.id ? livro : item));
          this.livroSelecionado = livro;
          this.mostrarFeedbackTemporario('Livro atualizado com sucesso.');
        },
        error: (erro) => {
          this.popupErros = new PopupErrorBuilder()
            .adicionar(erro?.error?.mensagem || 'Não foi possível atualizar o livro.')
            .build();
        }
      });
      return;
    }

    this.servicoBiblioteca.criarLivro(dados).subscribe({
      next: (livro) => {
        this.livros = [livro, ...this.livros];
        this.livroSelecionado = livro;
        this.mostrarFeedbackTemporario('Livro cadastrado com sucesso.');
      },
      error: (erro) => {
        this.popupErros = new PopupErrorBuilder()
          .adicionar(erro?.error?.mensagem || 'Não foi possível cadastrar o livro.')
          .build();
      }
    });
  }

  aplicarCapitalizacaoCampo(campo: string): void {
    const valor = this.formLivro.get(campo)?.value;
    if (!valor || typeof valor !== 'string') return;
    const valorFormatado = this.capitalizarTexto(valor);
    if (valorFormatado !== valor) {
      this.formLivro.patchValue({ [campo]: valorFormatado });
    }
  }

  private capitalizarTexto(texto: string): string {
    return (texto || '')
      .toLowerCase()
      .replace(/(^|\\s)([\\p{L}])/gu, (match, espaco, letra) => `${espaco}${letra.toUpperCase()}`)
      .trim();
  }

  salvarEmprestimo(): void {
    this.popupErros = [];
    if (this.formEmprestimo.invalid) {
      this.formEmprestimo.markAllAsTouched();
      this.popupErros = this.validarEmprestimoObrigatorio();
      return;
    }

    const dados = this.criarCadastroEmprestimo();
    const livroSelecionado = this.livros.find((livro) => livro.id === dados.livroId);
    if (livroSelecionado && this.obterDisponibilidadeLivro(livroSelecionado) <= 0) {
      this.popupErros = new PopupErrorBuilder()
        .adicionar('Livro selecionado sem disponibilidade para empréstimo.')
        .build();
      return;
    }

    if (this.emprestimoSelecionado) {
      this.servicoBiblioteca.atualizarEmprestimo(this.emprestimoSelecionado.id, dados).subscribe({
        next: (emprestimo) => {
          this.emprestimos = this.emprestimos.map((item) => (item.id === emprestimo.id ? emprestimo : item));
          this.emprestimoSelecionado = emprestimo;
          this.mostrarFeedbackTemporario('Empréstimo atualizado com sucesso.');
          this.carregarLivros();
          this.carregarAlertas();
        },
        error: (erro) => {
          this.popupErros = new PopupErrorBuilder()
            .adicionar(erro?.error?.mensagem || 'Não foi possível atualizar o empréstimo.')
            .build();
        }
      });
      return;
    }

    this.servicoBiblioteca.criarEmprestimo(dados).subscribe({
      next: (emprestimo) => {
        this.emprestimos = [emprestimo, ...this.emprestimos];
        this.emprestimoSelecionado = emprestimo;
        this.mostrarFeedbackTemporario('Empréstimo registrado com sucesso.');
        this.carregarLivros();
        this.carregarAlertas();
      },
      error: (erro) => {
        this.popupErros = new PopupErrorBuilder()
          .adicionar(erro?.error?.mensagem || 'Não foi possível registrar o empréstimo.')
          .build();
      }
    });
  }

  registrarDevolucao(emprestimo: BibliotecaEmprestimo): void {
    const dataDevolucao = this.dataHojeIso();
    this.servicoBiblioteca.registrarDevolucao(emprestimo.id, dataDevolucao).subscribe({
      next: (atualizado) => {
        this.emprestimos = this.emprestimos.map((item) => (item.id === atualizado.id ? atualizado : item));
        this.carregarLivros();
        this.carregarAlertas();
      },
      error: () => {
        this.popupErros = new PopupErrorBuilder().adicionar('Não foi possível registrar a devolução.').build();
      }
    });
  }

  abrirDialogoExclusao(entidade: EntidadeExclusao): void {
    this.entidadeExclusao = entidade;
    this.dialogTitulo = entidade === 'livro' ? 'Excluir livro' : 'Excluir empréstimo';
    this.dialogMensagem =
      entidade === 'livro'
        ? 'Deseja realmente excluir o livro selecionado?'
        : 'Deseja realmente excluir o empréstimo selecionado?';
    this.dialogConfirmarLabel = 'Excluir';
    this.dialogConfirmacaoAberta = true;
  }

  confirmarDialogo(): void {
    if (this.entidadeExclusao === 'livro') {
      this.removerLivroSelecionado();
    }
    if (this.entidadeExclusao === 'emprestimo') {
      this.removerEmprestimoSelecionado();
    }
    this.dialogConfirmacaoAberta = false;
    this.entidadeExclusao = null;
  }

  cancelarDialogo(): void {
    this.dialogConfirmacaoAberta = false;
    this.entidadeExclusao = null;
  }

  private removerLivroSelecionado(): void {
    if (!this.livroSelecionado) {
      return;
    }
    const livroId = this.livroSelecionado.id;
    this.servicoBiblioteca.excluirLivro(livroId).subscribe({
      next: () => {
        this.livros = this.livros.filter((livro) => livro.id !== livroId);
        this.resetarLivroForm();
        this.mostrarFeedbackTemporario('Livro excluido com sucesso.');
      },
      error: (erro) => {
        this.popupErros = new PopupErrorBuilder()
          .adicionar(erro?.error?.mensagem || 'Não foi possível excluir o livro.')
          .build();
      }
    });
  }

  private removerEmprestimoSelecionado(): void {
    if (!this.emprestimoSelecionado) {
      return;
    }
    const emprestimoId = this.emprestimoSelecionado.id;
    this.servicoBiblioteca.excluirEmprestimo(emprestimoId).subscribe({
      next: () => {
        this.emprestimos = this.emprestimos.filter((emprestimo) => emprestimo.id !== emprestimoId);
        this.resetarEmprestimoForm();
        this.carregarLivros();
        this.carregarAlertas();
        this.mostrarFeedbackTemporario('Empréstimo excluído com sucesso.');
      },
      error: (erro) => {
        this.popupErros = new PopupErrorBuilder()
          .adicionar(erro?.error?.mensagem || 'Não foi possível excluir o empréstimo.')
          .build();
      }
    });
  }

  private criarCadastroLivro(): BibliotecaLivroCadastro {
    const valores = this.formLivro.value;
    const quantidadeTotal = Number(valores.quantidadeTotal) || 0;
    const quantidadeDisponivel =
      valores.quantidadeDisponivel === null || valores.quantidadeDisponivel === undefined
        ? quantidadeTotal
        : Number(valores.quantidadeDisponivel);
    return {
      codigo: valores.codigo?.trim() || this.codigoLivroGerado || '',
      titulo: valores.titulo?.trim() || '',
      autor: valores.autor?.trim() || '',
      isbn: valores.isbn?.trim() || undefined,
      editora: valores.editora?.trim() || undefined,
      anoPublicacao: valores.anoPublicacao ? Number(valores.anoPublicacao) : null,
      categoria: valores.categoria?.trim() || undefined,
      quantidadeTotal,
      quantidadeDisponivel,
      localizacao: valores.localizacao?.trim() || undefined,
      status: valores.status,
      estadoLivro: valores.estadoLivro?.trim() || undefined,
      observacoes: valores.observacoes?.trim() || undefined
    };
  }

  private criarCadastroEmprestimo(): BibliotecaEmprestimoCadastro {
    const valores = this.formEmprestimo.value;
    return {
      livroId: valores.livroId,
      beneficiarioId: valores.beneficiarioId || null,
      beneficiarioNome: valores.beneficiarioNome || null,
      responsavelId: valores.responsavelId || null,
      responsavelNome: valores.responsavelNome || null,
      dataEmprestimo: valores.dataEmprestimo,
      dataDevolucaoPrevista: valores.dataDevolucaoPrevista,
      dataDevolucaoReal: valores.dataDevolucaoReal || null,
      observacoes: valores.observacoes || null
    };
  }

  private validarLivroObrigatorio(): string[] {
    const builder = new PopupErrorBuilder();
    const campos = [
      { campo: 'titulo', label: 'Título' },
      { campo: 'autor', label: 'Autor' },
      { campo: 'quantidadeTotal', label: 'Quantidade total' },
      { campo: 'status', label: 'Status' },
      { campo: 'estadoLivro', label: 'Estado do livro' }
    ];

    campos.forEach(({ campo, label }) => {
      const valor = this.formLivro.get(campo)?.value;
      if (valor === null || valor === undefined || valor === '') {
        builder.adicionar(`Campo obrigatório não preenchido: ${label}.`);
      }
    });

    return builder.build();
  }

  private validarEmprestimoObrigatorio(): string[] {
    const builder = new PopupErrorBuilder();
    const campos = [
      { campo: 'livroId', label: 'Livro' },
      { campo: 'beneficiarioNome', label: 'Beneficiário' },
      { campo: 'dataEmprestimo', label: 'Data de empréstimo' },
      { campo: 'dataDevolucaoPrevista', label: 'Data prevista de devolução' }
    ];

    campos.forEach(({ campo, label }) => {
      const valor = this.formEmprestimo.get(campo)?.value;
      if (valor === null || valor === undefined || valor === '') {
        builder.adicionar(`Campo obrigatório não preenchido: ${label}.`);
      }
    });

    return builder.build();
  }

  private criarLivroForm(): FormGroup {
    return this.formBuilder.group({
      codigo: [''],
      titulo: ['', Validators.required],
      autor: ['', Validators.required],
      isbn: [''],
      editora: [''],
      anoPublicacao: [''],
      categoria: [''],
      quantidadeTotal: [1, [Validators.required, Validators.min(1)]],
      quantidadeDisponivel: [1, [Validators.min(0)]],
      localizacao: [''],
      status: ['ATIVO', Validators.required],
      estadoLivro: ['Bom'],
      observacoes: ['']
    });
  }

  private criarEmprestimoForm(): FormGroup {
    return this.formBuilder.group({
      livroId: ['', Validators.required],
      beneficiarioId: [''],
      beneficiarioNome: ['', Validators.required],
      responsavelId: [''],
      responsavelNome: [''],
      dataEmprestimo: [this.dataHojeIso(), Validators.required],
      dataDevolucaoPrevista: ['', Validators.required],
      dataDevolucaoReal: [''],
      observacoes: ['']
    });
  }

  private dataHojeIso(): string {
    return new Date().toISOString().substring(0, 10);
  }

  resetarLivroForm(): void {
    this.livroSelecionado = null;
    this.formLivro.reset({
      codigo: '',
      titulo: '',
      autor: '',
      isbn: '',
      editora: '',
      anoPublicacao: '',
      categoria: '',
      quantidadeTotal: 1,
      quantidadeDisponivel: 1,
      localizacao: '',
      status: 'ATIVO',
      estadoLivro: 'Bom',
      observacoes: ''
    });
    this.carregarProximoCodigoLivro();
  }

  resetarEmprestimoForm(): void {
    this.emprestimoSelecionado = null;
    this.beneficiarioTermo = '';
    this.responsavelTermo = '';
    this.formEmprestimo.reset({
      livroId: '',
      beneficiarioId: '',
      beneficiarioNome: '',
      responsavelId: '',
      responsavelNome: '',
      dataEmprestimo: this.dataHojeIso(),
      dataDevolucaoPrevista: '',
      dataDevolucaoReal: '',
      observacoes: ''
    });
  }

  obterDescricaoAba(abaId: BibliotecaAbaId): string {
    return this.abas.find((aba) => aba.id === abaId)?.descricao || '';
  }

  private carregarProximoCodigoLivro(): void {
    if (this.livroSelecionado) {
      return;
    }
    this.servicoBiblioteca.obterProximoCodigoLivro().subscribe({
      next: (codigo) => {
        this.codigoLivroGerado = codigo;
        this.formLivro.patchValue({ codigo });
      },
      error: () => {
        this.codigoLivroGerado = '';
      }
    });
  }

  limparMensagemFeedback(): void {
    if (this.feedbackTimeout) {
      clearTimeout(this.feedbackTimeout);
      this.feedbackTimeout = undefined;
    }
    this.mensagemFeedback = null;
  }

  private mostrarFeedbackTemporario(mensagem: string): void {
    this.mensagemFeedback = mensagem;
    if (this.feedbackTimeout) {
      clearTimeout(this.feedbackTimeout);
    }
    this.feedbackTimeout = setTimeout(() => {
      this.mensagemFeedback = null;
      this.feedbackTimeout = undefined;
    }, 10000);
  }

  get livrosFiltrados(): BibliotecaLivro[] {
    const termo = this.normalizarTermo(this.termoLivro);
    if (!termo) return this.livros;
    return this.livros.filter((livro) =>
      [livro.titulo, livro.autor, livro.codigo, livro.categoria, livro.isbn]
        .filter(Boolean)
        .some((valor) => this.normalizarTermo(String(valor)).includes(termo))
    );
  }

  get emprestimosFiltrados(): BibliotecaEmprestimo[] {
    const termo = this.normalizarTermo(this.termoEmprestimo);
    if (!termo) return this.emprestimos;
    return this.emprestimos.filter((emprestimo) =>
      [emprestimo.livroTitulo, emprestimo.beneficiarioNome, emprestimo.livroCodigo]
        .filter(Boolean)
        .some((valor) => this.normalizarTermo(String(valor)).includes(termo))
    );
  }

  get emprestimosParaDevolucao(): BibliotecaEmprestimo[] {
    const termo = this.normalizarTermo(this.termoDevolucao);
    const base = this.emprestimos.filter((emprestimo) =>
      ['ATIVO', 'ATRASADO'].includes((emprestimo.status || '').toUpperCase())
    );
    if (!termo) return base;
    return base.filter((emprestimo) =>
      [emprestimo.livroTitulo, emprestimo.beneficiarioNome, emprestimo.livroCodigo]
        .filter(Boolean)
        .some((valor) => this.normalizarTermo(String(valor)).includes(termo))
    );
  }

  get livrosDisponiveis(): BibliotecaLivro[] {
    return this.livros.filter(
      (livro) => (livro.status || '').toUpperCase() === 'ATIVO' && this.obterDisponibilidadeLivro(livro) > 0
    );
  }

  get livrosParaEmprestimo(): BibliotecaLivro[] {
    return this.livros.filter((livro) => (livro.status || '').toUpperCase() === 'ATIVO' || !livro.status);
  }

  private atualizarOpcoesResponsaveis(): void {
    const termo = this.normalizarTermo(this.responsavelTermo);
    const profissionais = (this.profissionais ?? []).map((profissional) => ({
      id: profissional.id,
      label: profissional.nomeCompleto,
      sublabel: profissional.cpf || 'Profissional'
    }));
    const voluntarios = (this.voluntarios ?? []).map((voluntario) => ({
      id: voluntario.id || '',
      label: voluntario.nome,
      sublabel: voluntario.cpf || 'Voluntario'
    }));
    const opcoes = [...profissionais, ...voluntarios].filter((opcao) =>
      termo ? this.normalizarTermo(opcao.label).includes(termo) : true
    );
    this.responsavelOpcoes = opcoes.slice(0, 15);
    this.carregandoResponsaveis = false;
  }

  obterDisponibilidadeLivro(livro: BibliotecaLivro): number {
    if (livro.quantidadeDisponivel !== null && livro.quantidadeDisponivel !== undefined) {
      return Number(livro.quantidadeDisponivel) || 0;
    }
    if (livro.quantidadeTotal !== null && livro.quantidadeTotal !== undefined) {
      return Number(livro.quantidadeTotal) || 0;
    }
    return 0;
  }

  editarLivroDisponivel(livro: BibliotecaLivro): void {
    this.selecionarLivro(livro);
    this.abaAtiva = 'livros';
  }

  get livrosDisponiveisFiltrados(): BibliotecaLivro[] {
    const termo = this.normalizarTermo(this.termoDisponiveis);
    if (!termo) return this.livrosDisponiveis;
    return this.livrosDisponiveis.filter((livro) =>
      [livro.titulo, livro.autor, livro.codigo, livro.categoria, livro.isbn]
        .filter(Boolean)
        .some((valor) => this.normalizarTermo(String(valor)).includes(termo))
    );
  }

  get totalTitulosDisponiveis(): number {
    return this.livrosDisponiveis.length;
  }

  get totalUnidadesDisponiveis(): number {
    return this.livrosDisponiveis.reduce(
      (total, livro) => total + this.obterDisponibilidadeLivro(livro),
      0
    );
  }

  get estoquePorCategoria(): { categoria: string; titulos: number; unidades: number; percentual: number }[] {
    const mapa = new Map<string, { categoria: string; titulos: number; unidades: number }>();
    this.livrosDisponiveis.forEach((livro) => {
      const categoria = (livro.categoria || 'Sem categoria').trim() || 'Sem categoria';
      const registro = mapa.get(categoria) || { categoria, titulos: 0, unidades: 0 };
      registro.titulos += 1;
      registro.unidades += this.obterDisponibilidadeLivro(livro);
      mapa.set(categoria, registro);
    });
    return Array.from(mapa.values())
      .map((registro) => ({
        ...registro,
        percentual: this.totalUnidadesDisponiveis
          ? Math.round((registro.unidades / this.totalUnidadesDisponiveis) * 100)
          : 0
      }))
      .sort((a, b) => a.categoria.localeCompare(b.categoria));
  }

  isCategoriaBaixa(unidades: number): boolean {
    return unidades <= 2;
  }

  get totalLivros(): number {
    return this.livros.length;
  }

  get totalEmprestimosAtivos(): number {
    return this.emprestimos.filter((emprestimo) => emprestimo.status === 'ATIVO').length;
  }

  get totalEmprestimosAtrasados(): number {
    return this.emprestimos.filter((emprestimo) => emprestimo.status === 'ATRASADO').length;
  }

  get totalDisponiveis(): number {
    return this.livros.reduce((total, livro) => total + (Number(livro.quantidadeDisponivel) || 0), 0);
  }

  private normalizarTermo(valor: string): string {
    return (valor || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  private imprimirLivros(): void {
    if (!this.livros.length) {
      this.popupErros = new PopupErrorBuilder().adicionar('Não há livros cadastrados para imprimir.').build();
      return;
    }
    const html = `
      <html>
        <head>
          <title>Relatório de livros</title>
          <style>
            @page { size: A4; margin: 18mm; }
            body { font-family: Arial, sans-serif; color: #111827; }
            h1 { font-size: 18px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border-bottom: 1px solid #e5e7eb; padding: 6px; text-align: left; }
            th { background: #f3f4f6; }
          </style>
        </head>
        <body>
          <h1>Relatório de livros</h1>
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Título</th>
                <th>Autor</th>
                <th>Categoria</th>
                <th>Disponíveis</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${this.livros
                .map(
                  (livro) => `
                    <tr>
                      <td>${livro.codigo}</td>
                      <td>${livro.titulo}</td>
                      <td>${livro.autor}</td>
                      <td>${livro.categoria || '-'}
                      </td>
                      <td>${livro.quantidadeDisponivel}</td>
                      <td>${livro.status}</td>
                    </tr>
                  `
                )
                .join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;
    const janelaImpressao = window.open('', '_blank');
    if (!janelaImpressao) {
      this.popupErros = new PopupErrorBuilder().adicionar('Não foi possível abrir a janela de impressão.').build();
      return;
    }
    janelaImpressao.document.write(html);
    janelaImpressao.document.close();
    janelaImpressao.focus();
    janelaImpressao.print();
  }

  private imprimirEmprestimos(): void {
    if (!this.emprestimos.length) {
      this.popupErros = new PopupErrorBuilder().adicionar('Não há empréstimos cadastrados para imprimir.').build();
      return;
    }
    const html = `
      <html>
        <head>
          <title>Relatório de empréstimos</title>
          <style>
            @page { size: A4; margin: 18mm; }
            body { font-family: Arial, sans-serif; color: #111827; }
            h1 { font-size: 18px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border-bottom: 1px solid #e5e7eb; padding: 6px; text-align: left; }
            th { background: #f3f4f6; }
          </style>
        </head>
        <body>
          <h1>Relatório de empréstimos</h1>
          <table>
            <thead>
              <tr>
                <th>Livro</th>
                <th>Beneficiário</th>
                <th>Empréstimo</th>
                <th>Previsto</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${this.emprestimos
                .map(
                  (emprestimo) => `
                    <tr>
                      <td>${emprestimo.livroTitulo || '-'}</td>
                      <td>${emprestimo.beneficiarioNome || '-'}</td>
                      <td>${emprestimo.dataEmprestimo || '-'}</td>
                      <td>${emprestimo.dataDevolucaoPrevista || '-'}</td>
                      <td>${emprestimo.status}</td>
                    </tr>
                  `
                )
                .join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;
    const janelaImpressao = window.open('', '_blank');
    if (!janelaImpressao) {
      this.popupErros = new PopupErrorBuilder().adicionar('Não foi possível abrir a janela de impressão.').build();
      return;
    }
    janelaImpressao.document.write(html);
    janelaImpressao.document.close();
    janelaImpressao.focus();
    janelaImpressao.print();
  }

  get alertaResumo(): { atrasados: number; vencendo: number; emDia: number } {
    const atrasados = this.alertas.filter((alerta) => alerta.status === 'ATRASADO').length;
    const vencendo = this.alertas.filter((alerta) => alerta.status === 'VENCENDO').length;
    const emDia = this.alertas.filter((alerta) => alerta.status === 'EM_DIA').length;
    return { atrasados, vencendo, emDia };
  }

  getLivroSelecionadoTitulo(): string {
    return this.livroSelecionado ? this.livroSelecionado.titulo : 'Nenhum livro selecionado';
  }

  getEmprestimoSelecionadoTitulo(): string {
    if (!this.emprestimoSelecionado) {
      return 'Nenhum empréstimo selecionado';
    }
    return `${this.emprestimoSelecionado.livroTitulo || 'Livro'} - ${this.emprestimoSelecionado.beneficiarioNome || ''}`;
  }
}








