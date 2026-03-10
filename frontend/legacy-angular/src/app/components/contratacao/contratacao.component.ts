import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TelaPadraoComponent } from '../compartilhado/tela-padrao/tela-padrao.component';
import { PopupMessagesComponent } from '../compartilhado/popup-messages/popup-messages.component';
import { PopupErrorBuilder } from '../../utils/popup-error.builder';
import { ContratacaoService } from './contratacao.service';

interface RhCandidatoResumo {
  candidatoId: number;
  nomeCompleto: string;
  cpf?: string;
  vagaPretendida?: string;
  status?: string;
}

interface PerguntaEntrevista {
  id: number;
  texto: string;
  selecionada: boolean;
  resposta: string;
}

interface ItemSelecionavel {
  id: number;
  texto: string;
  selecionado: boolean;
}

@Component({
  selector: 'app-contratacao',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, TelaPadraoComponent, PopupMessagesComponent],
  templateUrl: './contratacao.component.html',
  styleUrls: ['./contratacao.component.css'],
})
export class ContratacaoComponent implements OnInit {
  acoesToolbar = {
    buscar: true,
    novo: true,
    salvar: true,
    cancelar: true,
    excluir: true,
    imprimir: true,
  };

  acoesDesabilitadas = {
    buscar: false,
    novo: false,
    salvar: false,
    cancelar: false,
    excluir: true,
    imprimir: false,
  };

  abaAtiva = 'candidatos';
  subAbaCandidato = 'dadosPessoais';

  candidatos: RhCandidatoResumo[] = [];
  candidatoSelecionado: RhCandidatoResumo | null = null;
  processoSelecionado: { id: number; status: string } | null = null;
  entrevistas: Array<{ id: number; tipoRoteiro: string; dataEntrevista: string; parecer: string }> = [];
  documentos: Array<{ id: number; tipoDocumento: string; status: string; observacao: string }> = [];
  termos: Array<{ id: number; tipo: string; statusAssinatura: string }> = [];
  arquivos: Array<{ id: number; nomeArquivo: string; urlDownload: string }> = [];
  auditoria: Array<{ criadoEm: string; acao: string; detalhes: string }> = [];
  mensagensPopup: string[] = [];

  pesquisaForm: FormGroup;
  candidatoForm: FormGroup;
  entrevistaForm: FormGroup;
  fichaForm: FormGroup;
  termoMetaForm: FormGroup;
  termoLgpdForm: FormGroup;
  termoEtniaForm: FormGroup;
  valeTransporteForm: FormGroup;
  ppdForm: FormGroup;
  cartaForm: FormGroup;

  perguntasEntrevista: PerguntaEntrevista[] = [];
    perguntasDisponiveis: Record<string, string[]> = {
    'Roteiro entrevista 1': [
      'Fale sobre você e sua trajetória.',
      'Por que deseja esta vaga?',
      'O que você sabe sobre a empresa?',
      'Qual foi o motivo da sua última saída?',
      'Cite um livro, filme ou curso marcante.',
      'Como você lida com prazos sob pressão?',
      'Conte uma situação de conflito e como resolveu.',
      'Como reage a mudanças inesperadas?',
      'Quais são seus pontos fortes?',
      'Quais são seus pontos a desenvolver?',
      'O que seus colegas diriam sobre você?',
      'Qual habilidade nova aprendeu recentemente?',
      'Experiência técnica relacionada ao cargo.',
      'Como recebe feedbacks e críticas?',
    ],
    'Roteiro entrevista Administrativo': [
      'Como você organiza seu tempo entre trabalho e vida pessoal?',
      'Como define prioridades em alta demanda?',
      'Você costuma apresentar ideias novas?',
      'Descreva um projeto em que foi proativo.',
      'Quais ferramentas utiliza no dia a dia?',
      'Qual projeto profissional teve maior impacto para você?',
      'Como costuma lidar com tarefas repetitivas?',
      'Conte um projeto complexo e como solucionou.',
      'O que mais gosta na sua rotina de trabalho?',
      'Como reage a mudanças de processos?',
    ],
  };


  palavrasPpd: ItemSelecionavel[] = [];
  palavrasBase = [
    'Adaptvel', 'Analtico', 'Autnomo', 'Calmo', 'Colaborativo', 'Competitivo', 'Comunicativo', 'Confivel',
    'Criativo', 'Detalhista', 'Dinmico', 'Disciplinado', 'Emptico', 'Enrgico', 'Flexvel', 'Focado',
    'Influente', 'Inovador', 'Lgico', 'Metdico', 'Organizado', 'Persistente', 'Pontual', 'Prudente',
    'Responsvel', 'Socivel', 'Tcnico', 'Visionrio', 'Proativo', 'Resiliente', 'Objetivo', 'Lder',
  ];

  constructor(private fb: FormBuilder, private service: ContratacaoService) {
    this.pesquisaForm = this.fb.group({
      termo: [''],
    });

    this.candidatoForm = this.fb.group({
      nomeCompleto: ['', Validators.required],
      vagaPretendida: [''],
      dataPreenchimento: [''],
      dataNascimento: [''],
      naturalidade: [''],
      estadoCivil: [''],
      nomeMae: [''],
      nomeConjuge: [''],
      rg: [''],
      cpf: [''],
      pis: [''],
      filhosPossui: [false],
      filhos: this.fb.array([]),
      deficienciaPossui: [false],
      deficienciaTipo: [''],
      deficienciaDescricao: [''],
      endereco: this.fb.group({
        logradouro: [''],
        numero: [''],
        complemento: [''],
        bairro: [''],
        cidade: [''],
        uf: [''],
        cep: [''],
      }),
      telefone: [''],
      whatsapp: [''],
    });

    this.entrevistaForm = this.fb.group({
      tipoRoteiro: ['Roteiro entrevista 1', Validators.required],
      parecer: ['Em analise'],
      observacoes: [''],
      dataEntrevista: [''],
    });

    this.fichaForm = this.fb.group({
      dadosPessoais: this.fb.group({
        nomeCompleto: [''],
        sexo: [''],
        dataNascimento: [''],
        cidadeNascimento: [''],
        ufNascimento: [''],
        cor: [''],
        estadoCivil: [''],
        nomePai: [''],
        nomeMae: [''],
        rg: [''],
        rgEmissao: [''],
        cpf: [''],
        pis: [''],
        escolaridade: [''],
        numeroFilhos: [''],
        idadesFilhos: [''],
        religiao: [''],
        endereco: [''],
        numero: [''],
        complemento: [''],
        bairro: [''],
        cidade: [''],
        uf: [''],
        cep: [''],
        telefone: [''],
        email: [''],
      }),
      dependentesIr: this.fb.array([]),
      dependentesSalario: this.fb.array([]),
      dadosInternos: this.fb.group({
        empresa: [''],
        departamentoSetor: [''],
        cargoFuncao: [''],
        salario: [''],
        contratoExperiencia: ['45+45'],
        dataProrrogacao: [''],
        beneficios: [''],
        cargaHorariaSemanal: [''],
        horarioTrabalho: [''],
        dataAdmissao: [''],
        dadosBancarios: [''],
        eventoS2200: [false],
        eventoS2220: [false],
        eventoS2240: [false],
      }),
    });

    this.termoMetaForm = this.fb.group({
      statusAssinatura: ['Pendente'],
      dataAssinatura: [''],
      responsavel: [''],
    });

    this.termoLgpdForm = this.fb.group({
      nomeCompleto: [''],
      cpf: [''],
      itensTratados: [''],
      aceite: [false],
      assinaturaDigital: ['Nao'],
    });

    this.termoEtniaForm = this.fb.group({
      nomeCompleto: [''],
      cpf: [''],
      etnia: [''],
      cidadeUf: [''],
      dataDeclaracao: [''],
      assinaturaDigital: ['Nao'],
    });

    this.valeTransporteForm = this.fb.group({
      necessita: ['Nao'],
      enderecoResidencia: [''],
      meiosTransporte: this.fb.group({
        onibus: [false],
        metro: [false],
        trem: [false],
      }),
      operadora: this.fb.group({
        nome: [''],
        valorUnitario: [''],
        telefone: [''],
        cidade: [''],
      }),
      desconto6Porcento: [true],
      declaracao: [true],
      operadoraCartao: [''],
      motivoNaoNecessita: [''],
      linhas: this.fb.array([]),
    });

    this.ppdForm = this.fb.group({
      cabecalho: this.fb.group({
        empresa: [''],
        nome: [''],
        cargo: [''],
        data: [''],
        sexo: [''],
        email: [''],
        dataNascimento: [''],
        cpf: [''],
        rg: [''],
      }),
    });

    this.cartaForm = this.fb.group({
      cidadeUf: [''],
      dataCarta: [''],
      banco: [''],
      gerente: [''],
      nome: [''],
      cpf: [''],
      identidade: [''],
      orgao: [''],
      endereco: [''],
      dataNascimento: [''],
      dataAdmissao: [''],
      cargo: [''],
      salario: [''],
      responsavel: [''],
      cnpj: [''],
    });

    this.palavrasPpd = this.palavrasBase.map((texto, index) => ({
      id: index + 1,
      texto,
      selecionado: false,
    }));
  }

  ngOnInit(): void {
    this.buscarCandidatos();
    this.carregarPerguntas('Roteiro entrevista 1');
    this.adicionarDependenteIr();
    this.adicionarDependenteSalario();
    this.adicionarLinhaTransporte();
  }

  get filhos(): FormArray {
    return this.candidatoForm.get('filhos') as FormArray;
  }

  get fichaDadosPessoais(): FormGroup {
    return this.fichaForm.get('dadosPessoais') as FormGroup;
  }

  get fichaDadosInternos(): FormGroup {
    return this.fichaForm.get('dadosInternos') as FormGroup;
  }

  get cabecalhoPpd(): FormGroup {
    return this.ppdForm.get('cabecalho') as FormGroup;
  }

  get dependentesIr(): FormArray {
    return this.fichaForm.get('dependentesIr') as FormArray;
  }

  get dependentesSalario(): FormArray {
    return this.fichaForm.get('dependentesSalario') as FormArray;
  }

  get linhasTransporte(): FormArray {
    return this.valeTransporteForm.get('linhas') as FormArray;
  }

  adicionarFilho(): void {
    this.filhos.push(this.fb.group({ nome: [''], idade: [''] }));
  }

  removerFilho(index: number): void {
    this.filhos.removeAt(index);
  }

  adicionarDependenteIr(): void {
    this.dependentesIr.push(this.fb.group({ nome: [''], parentesco: [''] }));
  }

  removerDependenteIr(index: number): void {
    this.dependentesIr.removeAt(index);
  }

  adicionarDependenteSalario(): void {
    this.dependentesSalario.push(this.fb.group({ nome: [''], nascimento: [''] }));
  }

  removerDependenteSalario(index: number): void {
    this.dependentesSalario.removeAt(index);
  }

  adicionarLinhaTransporte(): void {
    this.linhasTransporte.push(this.fb.group({ percurso: [''], linha: [''], tarifa: [''], quantidade: [''] }));
  }

  removerLinhaTransporte(index: number): void {
    this.linhasTransporte.removeAt(index);
  }

  buscarCandidatos(): void {
    const termo = this.pesquisaForm.value.termo || '';
    this.service.listarCandidatos(termo).subscribe((lista) => {
      this.candidatos = lista || [];
    });
  }

  selecionarCandidato(candidato: RhCandidatoResumo): void {
    this.candidatoSelecionado = candidato;
    if (!candidato?.candidatoId) {
      return;
    }
    this.service.buscarCandidato(candidato.candidatoId).subscribe((detalhe) => {
      this.candidatoForm.patchValue({
        nomeCompleto: detalhe.nomeCompleto,
        vagaPretendida: detalhe.vagaPretendida,
        dataPreenchimento: detalhe.dataPreenchimento,
        dataNascimento: detalhe.dataNascimento,
        naturalidade: detalhe.naturalidade,
        estadoCivil: detalhe.estadoCivil,
        nomeMae: detalhe.nomeMae,
        nomeConjuge: detalhe.nomeConjuge,
        rg: detalhe.rg,
        cpf: detalhe.cpf,
        pis: detalhe.pis,
        filhosPossui: detalhe.filhosPossui,
        deficienciaPossui: detalhe.deficienciaPossui,
        deficienciaTipo: detalhe.deficienciaTipo,
        deficienciaDescricao: detalhe.deficienciaDescricao,
        telefone: detalhe.telefone,
        whatsapp: detalhe.whatsapp,
      });
      this.carregarFilhos(detalhe.filhosJson);
      this.carregarEndereco(detalhe.enderecoJson);
    });

    this.service.buscarProcessoPorCandidato(candidato.candidatoId).subscribe((processo) => {
      this.processoSelecionado = processo;
      this.carregarDependencias();
    });
    this.acaoSelecionar();
  }

  carregarDependencias(): void {
    if (!this.processoSelecionado?.id) {
      return;
    }
    const processoId = this.processoSelecionado.id;
    this.service.listarEntrevistas(processoId).subscribe((dados) => (this.entrevistas = dados || []));
    this.service.buscarFicha(processoId).subscribe((dados) => {
      if (dados) {
        this.carregarFicha(dados);
      }
    });
    this.service.listarDocumentos(processoId).subscribe((dados) => (this.documentos = dados || []));
    this.service.listarTermos(processoId).subscribe((dados) => (this.termos = dados || []));
    this.service.buscarPpd(processoId).subscribe((dados) => {
      if (dados) {
        this.carregarPpd(dados);
      }
    });
    this.service.buscarCartaBanco(processoId).subscribe((dados) => {
      if (dados) {
        this.carregarCarta(dados);
      }
    });
    this.service.listarArquivos(processoId).subscribe((dados) => (this.arquivos = dados || []));
    this.service.listarAuditoria(processoId).subscribe((dados) => (this.auditoria = dados || []));
  }

  novoCandidato(): void {
    this.candidatoSelecionado = null;
    this.processoSelecionado = null;
    this.candidatoForm.reset({
      filhosPossui: false,
      deficienciaPossui: false,
    });
    this.filhos.clear();
    this.adicionarFilho();
    this.fichaForm.reset();
    this.dependentesIr.clear();
    this.dependentesSalario.clear();
    this.adicionarDependenteIr();
    this.adicionarDependenteSalario();
    this.entrevistaForm.reset({ tipoRoteiro: 'Roteiro entrevista 1', parecer: 'Em analise' });
    this.carregarPerguntas('Roteiro entrevista 1');
    this.termoMetaForm.reset({ statusAssinatura: 'Pendente' });
    this.termoLgpdForm.reset({ assinaturaDigital: 'Nao', aceite: false });
    this.termoEtniaForm.reset({ assinaturaDigital: 'Nao' });
    this.valeTransporteForm.reset({ necessita: 'Nao', desconto6Porcento: true, declaracao: true });
    this.linhasTransporte.clear();
    this.adicionarLinhaTransporte();
    this.ppdForm.reset();
    this.cartaForm.reset();
    this.documentos = [];
    this.entrevistas = [];
    this.arquivos = [];
    this.termos = [];
    this.auditoria = [];
    this.acaoSelecionar();
  }

  salvarCandidato(): void {
    if (this.candidatoForm.invalid) {
      this.mensagensPopup = new PopupErrorBuilder()
        .adicionar('Preencha os campos obrigatrios do candidato.')
        .build();
      return;
    }

    const dados = this.candidatoForm.getRawValue();
    const payload = {
      nomeCompleto: dados.nomeCompleto,
      vagaPretendida: dados.vagaPretendida,
      dataPreenchimento: dados.dataPreenchimento,
      dataNascimento: dados.dataNascimento,
      naturalidade: dados.naturalidade,
      estadoCivil: dados.estadoCivil,
      nomeMae: dados.nomeMae,
      nomeConjuge: dados.nomeConjuge,
      rg: dados.rg,
      cpf: dados.cpf,
      pis: dados.pis,
      filhosPossui: dados.filhosPossui,
      filhosJson: JSON.stringify(dados.filhos || []),
      deficienciaPossui: dados.deficienciaPossui,
      deficienciaTipo: dados.deficienciaTipo,
      deficienciaDescricao: dados.deficienciaDescricao,
      enderecoJson: JSON.stringify(dados.endereco || {}),
      telefone: dados.telefone,
      whatsapp: dados.whatsapp,
    };

    const usuarioId = this.service.usuarioIdAtual();
    const requisicao = this.candidatoSelecionado?.candidatoId
      ? this.service.atualizarCandidato(this.candidatoSelecionado.candidatoId, payload, usuarioId)
      : this.service.criarCandidato(payload, usuarioId);

    requisicao.subscribe(() => {
      this.mensagensPopup = ['Candidato salvo com sucesso.'];
      this.buscarCandidatos();
    });
  }

  inativarCandidato(): void {
    if (!this.candidatoSelecionado?.candidatoId) {
      return;
    }
    const usuarioId = this.service.usuarioIdAtual();
    this.service.inativarCandidato(this.candidatoSelecionado.candidatoId, usuarioId).subscribe(() => {
      this.mensagensPopup = ['Candidato inativado.'];
      this.buscarCandidatos();
    });
  }

  salvarEntrevista(): void {
    if (!this.processoSelecionado?.id) {
      return;
    }
    const usuarioId = this.service.usuarioIdAtual();
    const selecionadas = this.perguntasEntrevista.filter((item) => item.selecionada);
    const payload = {
      tipoRoteiro: this.entrevistaForm.value.tipoRoteiro,
      parecer: this.entrevistaForm.value.parecer,
      observacoes: this.entrevistaForm.value.observacoes,
      dataEntrevista: this.entrevistaForm.value.dataEntrevista,
      perguntasJson: JSON.stringify(selecionadas.map((item) => item.texto)),
      respostasJson: JSON.stringify(selecionadas.map((item) => ({ pergunta: item.texto, resposta: item.resposta }))),
    };

    this.service.salvarEntrevista(this.processoSelecionado.id, payload, usuarioId).subscribe(() => {
      this.mensagensPopup = ['Entrevista registrada com sucesso.'];
      this.carregarDependencias();
    });
  }

  salvarFicha(): void {
    if (!this.processoSelecionado?.id) {
      return;
    }
    const usuarioId = this.service.usuarioIdAtual();
    const payload = {
      dadosPessoaisJson: JSON.stringify(this.fichaForm.get('dadosPessoais')?.value || {}),
      dependentesJson: JSON.stringify({
        ir: this.dependentesIr.value,
        salarioFamilia: this.dependentesSalario.value,
      }),
      dadosInternosJson: JSON.stringify(this.fichaForm.get('dadosInternos')?.value || {}),
    };

    this.service.salvarFicha(this.processoSelecionado.id, payload, usuarioId).subscribe(() => {
      this.mensagensPopup = ['Ficha de admisso atualizada.'];
      this.carregarDependencias();
    });
  }

  salvarTermoLgpd(): void {
    this.salvarTermo('LGPD', this.termoLgpdForm.value);
  }

  salvarTermoEtnia(): void {
    this.salvarTermo('ETNIA', this.termoEtniaForm.value);
  }

  salvarTermoVale(): void {
    this.salvarTermo('VT', this.valeTransporteForm.value);
  }

  salvarTermo(tipo: string, dados: unknown): void {
    if (!this.processoSelecionado?.id) {
      return;
    }
    const usuarioId = this.service.usuarioIdAtual();
    const payload = {
      tipo,
      dadosJson: JSON.stringify(dados),
      statusAssinatura: this.termoMetaForm.value.statusAssinatura,
      dataAssinatura: this.termoMetaForm.value.dataAssinatura,
      responsavel: this.termoMetaForm.value.responsavel,
    };

    this.service.salvarTermo(this.processoSelecionado.id, payload, usuarioId).subscribe(() => {
      this.mensagensPopup = ['Termo atualizado.'];
      this.carregarDependencias();
    });
  }

  salvarPpd(): void {
    if (!this.processoSelecionado?.id) {
      return;
    }
    const usuarioId = this.service.usuarioIdAtual();
    const selecionadosA = this.palavrasPpd.filter((item) => item.selecionado).map((item) => item.texto);
    const selecionadosB = this.palavrasPpd.filter((item) => item.selecionado).map((item) => item.texto);

    const payload = {
      cabecalhoJson: JSON.stringify(this.ppdForm.get('cabecalho')?.value || {}),
      ladoAJson: JSON.stringify(selecionadosA),
      ladoBJson: JSON.stringify(selecionadosB),
    };

    this.service.salvarPpd(this.processoSelecionado.id, payload, usuarioId).subscribe(() => {
      this.mensagensPopup = ['PPD atualizado.'];
      this.carregarDependencias();
    });
  }

  salvarCarta(): void {
    if (!this.processoSelecionado?.id) {
      return;
    }
    const usuarioId = this.service.usuarioIdAtual();
    const payload = {
      dadosJson: JSON.stringify(this.cartaForm.value || {}),
    };

    this.service.salvarCartaBanco(this.processoSelecionado.id, payload, usuarioId).subscribe(() => {
      this.mensagensPopup = ['Carta atualizada.'];
      this.carregarDependencias();
    });
  }

  atualizarDocumento(item: { id: number; status: string; observacao: string }): void {
    const usuarioId = this.service.usuarioIdAtual();
    this.service.atualizarDocumento(item.id, {
      status: item.status,
      observacao: item.observacao,
    }, usuarioId).subscribe(() => {
      this.mensagensPopup = ['Documento atualizado.'];
      this.carregarDependencias();
    });
  }

  enviarArquivo(event: Event, categoria: string, tipoDocumento?: string): void {
    if (!this.processoSelecionado?.id) {
      return;
    }
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }
    const arquivo = input.files[0];
    const leitor = new FileReader();
    leitor.onload = () => {
      const base64 = (leitor.result as string).split(',')[1];
      const usuarioId = this.service.usuarioIdAtual();
      this.service.adicionarArquivo(this.processoSelecionado!.id, {
        categoria,
        tipoDocumento: tipoDocumento || '',
        nomeArquivo: arquivo.name,
        mimeType: arquivo.type,
        tamanhoBytes: arquivo.size,
        conteudoBase64: base64,
      }, usuarioId).subscribe(() => {
        this.mensagensPopup = ['Arquivo enviado com sucesso.'];
        this.carregarDependencias();
      });
    };
    leitor.readAsDataURL(arquivo);
  }

  alterarStatusProcesso(status: string): void {
    if (!this.processoSelecionado?.id) {
      return;
    }
    const usuarioId = this.service.usuarioIdAtual();
    this.service.atualizarStatus(this.processoSelecionado.id, { status }, usuarioId)
      .subscribe((novo) => {
        this.processoSelecionado = novo;
        this.mensagensPopup = ['Status atualizado.'];
      });
  }

  selecionarAba(aba: string): void {
    this.abaAtiva = aba;
  }

  selecionarSubAba(sub: string): void {
    this.subAbaCandidato = sub;
  }

  carregarPerguntas(roteiro: string): void {
    this.perguntasEntrevista = (this.perguntasDisponiveis[roteiro] || []).map((texto, index) => ({
      id: index + 1,
      texto,
      selecionada: false,
      resposta: '',
    }));
  }

  onRoteiroChange(): void {
    const roteiro = this.entrevistaForm.value.tipoRoteiro || 'Roteiro entrevista 1';
    this.carregarPerguntas(roteiro);
  }

  private carregarFilhos(json: string): void {
    this.filhos.clear();
    if (!json) {
      this.adicionarFilho();
      return;
    }
    try {
      const lista = JSON.parse(json);
      if (Array.isArray(lista)) {
        lista.forEach((filho) => {
          this.filhos.push(this.fb.group({ nome: [filho.nome || ''], idade: [filho.idade || ''] }));
        });
      }
    } catch {
      this.adicionarFilho();
    }
    if (this.filhos.length === 0) {
      this.adicionarFilho();
    }
  }

  private carregarEndereco(json: string): void {
    if (!json) {
      return;
    }
    try {
      const endereco = JSON.parse(json);
      this.candidatoForm.get('endereco')?.patchValue(endereco || {});
    } catch {
      // ignora
    }
  }

  private carregarFicha(dados: { dadosPessoaisJson?: string; dependentesJson?: string; dadosInternosJson?: string }): void {
    if (dados.dadosPessoaisJson) {
      try {
        this.fichaForm.get('dadosPessoais')?.patchValue(JSON.parse(dados.dadosPessoaisJson));
      } catch {
        // ignora
      }
    }
    if (dados.dadosInternosJson) {
      try {
        this.fichaForm.get('dadosInternos')?.patchValue(JSON.parse(dados.dadosInternosJson));
      } catch {
        // ignora
      }
    }
    if (dados.dependentesJson) {
      try {
        const dependentes = JSON.parse(dados.dependentesJson);
        this.dependentesIr.clear();
        this.dependentesSalario.clear();
        (dependentes.ir || []).forEach((item: { nome: string; parentesco: string }) => {
          this.dependentesIr.push(this.fb.group({ nome: [item.nome || ''], parentesco: [item.parentesco || ''] }));
        });
        (dependentes.salarioFamilia || []).forEach((item: { nome: string; nascimento: string }) => {
          this.dependentesSalario.push(this.fb.group({ nome: [item.nome || ''], nascimento: [item.nascimento || ''] }));
        });
      } catch {
        // ignora
      }
    }
  }

  private carregarPpd(dados: { cabecalhoJson?: string; ladoAJson?: string; ladoBJson?: string }): void {
    if (dados.cabecalhoJson) {
      try {
        this.ppdForm.get('cabecalho')?.patchValue(JSON.parse(dados.cabecalhoJson));
      } catch {
        // ignora
      }
    }
    if (dados.ladoAJson) {
      try {
        const selecionadas = JSON.parse(dados.ladoAJson);
        this.palavrasPpd.forEach((item) => {
          item.selecionado = Array.isArray(selecionadas) && selecionadas.includes(item.texto);
        });
      } catch {
        // ignora
      }
    }
  }

  private carregarCarta(dados: { dadosJson?: string }): void {
    if (!dados.dadosJson) {
      return;
    }
    try {
      this.cartaForm.patchValue(JSON.parse(dados.dadosJson));
    } catch {
      // ignora
    }
  }

  private acaoSelecionar(): void {
    this.acoesDesabilitadas.excluir = !this.candidatoSelecionado?.candidatoId;
  }
}
