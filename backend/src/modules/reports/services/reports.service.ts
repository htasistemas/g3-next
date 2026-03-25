import { BeneficiarioService } from "../../beneficiarios/services/beneficiario.service.js";
import { ProfissionalService } from "../../profissionais/services/profissional.service.js";
import { MatriculaService } from "../../matriculas/services/matricula.service.js";
import { RegistroDoacaoService } from "../../registro-doacao/services/registro-doacao.service.js";
import { DoacaoRealizadaService } from "../../doacoes-realizadas/services/doacao-realizada.service.js";
import { UnidadeAssistencialService } from "../../unidades-assistenciais/services/unidade-assistencial.service.js";
import { VoluntarioService } from "../../voluntarios/services/voluntario.service.js";
import { RegistroPontoService } from "../../registro-ponto/services/registro-ponto.service.js";
import { ReportsRepository } from "../repositories/reports.repository.js";
import {
  RelatorioTemplatePadrao,
  type RelatorioBloco,
  type RelatorioBlocoCampo,
  type RelatorioHtmlInput,
  type RelatorioMetaTopo
} from "../templates/relatorio-template-padrao.js";
import { HtmlPdfRenderer } from "./html-pdf-renderer.js";
import {
  beneficiarioFichaRequestSchema,
  beneficiarioRelacaoRequestSchema,
  comprovanteMatriculaRequestSchema,
  comprovantePreMatriculaEsperaRequestSchema,
  doacaoRealizadaReciboRequestSchema,
  doacaoRealizadaRelacaoRequestSchema,
  matriculaListaPresencaRequestSchema,
  matriculasRelacaoRequestSchema,
  profissionalFichaRequestSchema,
  profissionalRelacaoRequestSchema,
  registroPontoEspelhoRequestSchema,
  registroDoacaoRelacaoRequestSchema,
  termoAutorizacaoRequestSchema,
  unidadeAssistencialRelacaoRequestSchema,
  voluntarioFichaRequestSchema,
  voluntarioRelacaoRequestSchema
} from "../reports.schema.js";

type RelatorioResultado = {
  html: string;
  pdf: Buffer;
  filename: string;
};

type BeneficiarioFicha = Awaited<ReturnType<BeneficiarioService["buscarPorId"]>>;
type ProfissionalFicha = Awaited<ReturnType<ProfissionalService["buscarPorId"]>>;
type VoluntarioFicha = Awaited<ReturnType<VoluntarioService["buscarPorId"]>>;

export class ReportsService {
  private readonly beneficiarioService = new BeneficiarioService();
  private readonly profissionalService = new ProfissionalService();
  private readonly matriculaService = new MatriculaService();
  private readonly registroDoacaoService = new RegistroDoacaoService();
  private readonly doacaoRealizadaService = new DoacaoRealizadaService();
  private readonly unidadeAssistencialService = new UnidadeAssistencialService();
  private readonly voluntarioService = new VoluntarioService();
  private readonly registroPontoService = new RegistroPontoService();
  private readonly repository = new ReportsRepository();
  private readonly template = new RelatorioTemplatePadrao();
  private readonly renderer = new HtmlPdfRenderer();

  private readonly dateFormatter = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });

  private readonly timeFormatter = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });

  private readonly dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  private async montarContextoInstitucional() {
    const instituicao = await this.repository.obterInstituicaoRelatorio();

    const cnpj = instituicao.cnpj ? `CNPJ: ${instituicao.cnpj}` : "CNPJ: Não informado";
    const endereco = instituicao.enderecoCompleto || "Endereço: Não informado";
    const telefone = instituicao.telefone ? `Telefone: ${instituicao.telefone}` : "Telefone: Não informado";
    const email = instituicao.email ? `E-mail: ${instituicao.email}` : "E-mail: Não informado";
    const site = instituicao.site ? `Site: ${instituicao.site}` : "";

    return {
      cabecalho: {
        razaoSocial: instituicao.razaoSocial,
        logoUrl: instituicao.logoUrl
      },
      rodape: {
        linha1: instituicao.razaoSocial,
        linha2: `${cnpj} | ${endereco}`,
        linha3: site ? `${telefone} | ${email} | ${site}` : `${telefone} | ${email}`
      }
    };
  }

  private normalizarTexto(valor?: string | number | null): string | undefined {
    if (valor === null || valor === undefined) {
      return undefined;
    }

    const texto = String(valor).trim();
    return texto.length > 0 ? texto : undefined;
  }

  private formatarData(valor?: string): string {
    const texto = this.normalizarTexto(valor);
    if (!texto) return "---";

    const data = new Date(texto);
    if (Number.isNaN(data.getTime())) return texto;

    return this.dateFormatter.format(data);
  }

  private formatarDataComHifen(valor?: string): string {
    const dataFormatada = this.formatarData(valor);
    return dataFormatada === "---" ? dataFormatada : dataFormatada.replaceAll("/", "-");
  }

  private formatarDataHora(valor?: string): string {
    const texto = this.normalizarTexto(valor);
    if (!texto) return "---";

    const data = new Date(texto);
    if (Number.isNaN(data.getTime())) return texto;

    return this.dateTimeFormatter.format(data);
  }

  private formatarPeriodoCurso(dataInicial?: string, dataFinal?: string): string | undefined {
    const inicio = this.normalizarTexto(dataInicial);
    const fim = this.normalizarTexto(dataFinal);

    if (!inicio && !fim) return undefined;
    if (inicio && fim) {
      return `${this.formatarDataComHifen(inicio)} a ${this.formatarDataComHifen(fim)}`;
    }

    return this.formatarDataComHifen(inicio ?? fim);
  }

  private formatarStatus(valor?: string): string {
    const texto = this.normalizarTexto(valor);
    if (!texto) return "---";

    return this.formatarValorEnumerado(texto);
  }

  private formatarValorEnumerado(valor?: string): string {
    const texto = this.normalizarTexto(valor);
    if (!texto) return "---";

    const normalizado = texto.toUpperCase();
    const mapa: Record<string, string> = {
      NAO_INFORMADO: "Não informado",
      NAO_INFORMADA: "Não informada",
      UNIAO_ESTAVEL: "União estável",
      FEMININO: "Feminino",
      MASCULINO: "Masculino",
      OUTRO: "Outro",
      BRANCA: "Branca",
      PRETA: "Preta",
      PARDA: "Parda",
      AMARELA: "Amarela",
      INDIGENA: "Indígena",
      SOLTEIRO: "Solteiro",
      CASADO: "Casado",
      DIVORCIADO: "Divorciado",
      VIUVO: "Viúvo",
      EM_ANALISE: "Em análise",
      DESATUALIZADO: "Desatualizado",
      INCOMPLETO: "Incompleto",
      BLOQUEADO: "Bloqueado",
      ATIVO: "Ativo",
      INATIVO: "Inativo"
    };

    if (mapa[normalizado]) {
      return mapa[normalizado];
    }

    return normalizado
      .split("_")
      .filter(Boolean)
      .map((parte) => parte.charAt(0) + parte.slice(1).toLowerCase())
      .join(" ");
  }

  private montarMetadadosTopo(usuarioEmissor?: string): RelatorioMetaTopo[] {
    const agora = new Date();

    return [
      {
        rotulo: "Data",
        valor: this.dateFormatter.format(agora)
      },
      {
        rotulo: "Hora",
        valor: this.timeFormatter.format(agora)
      },
      {
        rotulo: "Emitido por",
        valor: this.normalizarTexto(usuarioEmissor) ?? "Sistema G3-Next"
      }
    ];
  }

  private campo(rotulo: string, valor?: string | number | null): RelatorioBlocoCampo {
    return {
      rotulo,
      valor: this.normalizarTexto(valor) ?? "---"
    };
  }

  private campoPreenchido(rotulo: string, valor?: string | number | null): RelatorioBlocoCampo | null {
    const texto = this.normalizarTexto(valor);
    if (!texto || texto === "---") return null;

    return {
      rotulo,
      valor: texto
    };
  }

  private blocoComCampos(
    titulo: string,
    colunas: 1 | 2 | 3,
    campos: Array<RelatorioBlocoCampo | null>,
    destaque = false
  ): RelatorioBloco | null {
    const camposPreenchidos = campos.filter((campo): campo is RelatorioBlocoCampo => !!campo);
    if (!camposPreenchidos.length) return null;

    return {
      titulo,
      colunas,
      destaque,
      campos: camposPreenchidos
    };
  }

  private formatarSimNao(valor?: boolean | null): string | undefined {
    if (valor === true) return "Sim";
    if (valor === false) return "Não";
    return undefined;
  }

  private montarBlocosFichaBeneficiario(beneficiario: BeneficiarioFicha): RelatorioBloco[] {
    const enderecoCompleto = [
      this.normalizarTexto(beneficiario.logradouro),
      this.normalizarTexto(beneficiario.numero),
      this.normalizarTexto(beneficiario.complemento),
      this.normalizarTexto(beneficiario.bairro),
      this.normalizarTexto(beneficiario.municipio),
      this.normalizarTexto(beneficiario.uf)
    ]
      .filter(Boolean)
      .join(", ");

    const telefoneRecado = [
      this.normalizarTexto(beneficiario.telefone_recado_nome),
      this.normalizarTexto(beneficiario.telefone_recado_numero)
    ]
      .filter(Boolean)
      .join(" - ");

    return [
      this.blocoComCampos(
        "Identificação do beneficiário",
        2,
        [
          this.campoPreenchido("Nome completo", beneficiario.nome_completo),
          this.campoPreenchido("Código", beneficiario.codigo)
        ],
        true
      ),
      this.blocoComCampos("Dados pessoais", 3, [
        this.campoPreenchido("Cartão benefício", beneficiario.codigo),
        this.campoPreenchido("Status", this.formatarStatus(beneficiario.status)),
        this.campoPreenchido("Nome social", beneficiario.nome_social),
        this.campoPreenchido("Data de nascimento", this.formatarData(beneficiario.data_nascimento)),
        this.campoPreenchido("Sexo", this.formatarValorEnumerado(beneficiario.sexo_biologico)),
        this.campoPreenchido("Raça/cor", this.formatarValorEnumerado(beneficiario.cor_raca)),
        this.campoPreenchido("Estado civil", this.formatarValorEnumerado(beneficiario.estado_civil)),
        this.campoPreenchido("Nacionalidade", beneficiario.nacionalidade),
        this.campoPreenchido("Naturalidade (cidade)", beneficiario.naturalidade_cidade),
        this.campoPreenchido("Naturalidade (UF)", beneficiario.naturalidade_uf),
        this.campoPreenchido("Nome da mãe", beneficiario.nome_mae),
        this.campoPreenchido("Nome do pai", beneficiario.nome_pai),
        this.campoPreenchido("Data do cadastro", this.formatarDataHora(beneficiario.data_cadastro)),
        this.campoPreenchido("Atualizado em", this.formatarDataHora(beneficiario.data_atualizacao))
      ]),
      this.blocoComCampos("Endereço", 3, [
        this.campoPreenchido("CEP", beneficiario.cep),
        this.campoPreenchido("Endereço", beneficiario.logradouro),
        this.campoPreenchido("Número", beneficiario.numero),
        this.campoPreenchido("Complemento", beneficiario.complemento),
        this.campoPreenchido("Bairro", beneficiario.bairro),
        this.campoPreenchido("Ponto de referência", beneficiario.ponto_referencia),
        this.campoPreenchido("Município", beneficiario.municipio),
        this.campoPreenchido("UF", beneficiario.uf),
        this.campoPreenchido("Zona", beneficiario.zona),
        this.campoPreenchido("Subzona", beneficiario.subzona),
        this.campoPreenchido("Endereço completo", enderecoCompleto)
      ]),
      this.blocoComCampos("Contato", 3, [
        this.campoPreenchido("Telefone principal", beneficiario.telefone_principal),
        this.campoPreenchido("Telefone secundário", beneficiario.telefone_secundario),
        this.campoPreenchido("Telefone para recado", telefoneRecado),
        this.campoPreenchido("E-mail", beneficiario.email)
      ]),
      this.blocoComCampos("Documentos", 3, [
        this.campoPreenchido("CPF", beneficiario.cpf),
        this.campoPreenchido("RG", beneficiario.rg_numero),
        this.campoPreenchido("NIS", beneficiario.nis),
        this.campoPreenchido("Título de eleitor", beneficiario.titulo_eleitor),
        this.campoPreenchido("CNH", beneficiario.cnh),
        this.campoPreenchido("Cartão do SUS", beneficiario.cartao_sus)
      ]),
      this.blocoComCampos("Situação social", 3, [
        this.campoPreenchido("Vínculo familiar", beneficiario.vinculo_familiar),
        this.campoPreenchido("Composição familiar", beneficiario.composicao_familiar),
        this.campoPreenchido("Situação de vulnerabilidade", beneficiario.situacao_vulnerabilidade),
        this.campoPreenchido("Crianças e adolescentes", beneficiario.criancas_adolescentes),
        this.campoPreenchido("Idosos", beneficiario.idosos),
        this.campoPreenchido("Acompanhamento CRAS", this.formatarSimNao(beneficiario.acompanhamento_cras)),
        this.campoPreenchido("Acompanhamento saúde", this.formatarSimNao(beneficiario.acompanhamento_saude)),
        this.campoPreenchido("Rede de apoio", beneficiario.rede_apoio)
      ]),
      this.blocoComCampos("Observações", 1, [
        this.campoPreenchido("Observações gerais", beneficiario.observacoes)
      ])
    ].filter((bloco): bloco is RelatorioBloco => !!bloco);
  }

  private montarBlocosFichaProfissional(profissional: ProfissionalFicha): RelatorioBloco[] {
    return [
      this.blocoComCampos(
        "Identificacao do profissional",
        2,
        [
          this.campoPreenchido("Nome completo", profissional.nome_completo),
          this.campoPreenchido("Categoria", profissional.categoria)
        ],
        true
      ),
      this.blocoComCampos("Dados pessoais", 3, [
        this.campoPreenchido("CPF", profissional.cpf),
        this.campoPreenchido("Data de nascimento", this.formatarData(profissional.data_nascimento)),
        this.campoPreenchido("Sexo", this.formatarValorEnumerado(profissional.sexo_biologico)),
        this.campoPreenchido("Estado civil", this.formatarValorEnumerado(profissional.estado_civil)),
        this.campoPreenchido("Nacionalidade", profissional.nacionalidade),
        this.campoPreenchido("Naturalidade (cidade)", profissional.naturalidade_cidade),
        this.campoPreenchido("Naturalidade (UF)", profissional.naturalidade_uf),
        this.campoPreenchido("Nome da mae", profissional.nome_mae),
        this.campoPreenchido("Nome do pai", profissional.nome_pai)
      ]),
      this.blocoComCampos("Perfil profissional", 3, [
        this.campoPreenchido("Vinculo", profissional.vinculo),
        this.campoPreenchido("Especialidade", profissional.especialidade),
        this.campoPreenchido("Registro conselho", profissional.registro_conselho),
        this.campoPreenchido("Status", this.formatarStatus(profissional.status)),
        this.campoPreenchido("Unidade", profissional.unidade),
        this.campoPreenchido("Sala de atendimento", profissional.sala_atendimento),
        this.campoPreenchido("Carga horaria", profissional.carga_horaria),
        this.campoPreenchido(
          "Disponibilidade",
          profissional.disponibilidade?.length ? profissional.disponibilidade.join(", ") : undefined
        ),
        this.campoPreenchido(
          "Canais de atendimento",
          profissional.canais_atendimento?.length
            ? profissional.canais_atendimento.join(", ")
            : undefined
        )
      ]),
      this.blocoComCampos("Contato e endereco", 3, [
        this.campoPreenchido("E-mail", profissional.email),
        this.campoPreenchido("Telefone", profissional.telefone),
        this.campoPreenchido("CEP", profissional.cep),
        this.campoPreenchido("Endereco", profissional.logradouro),
        this.campoPreenchido("Numero", profissional.numero),
        this.campoPreenchido("Complemento", profissional.complemento),
        this.campoPreenchido("Bairro", profissional.bairro),
        this.campoPreenchido("Ponto de referencia", profissional.ponto_referencia),
        this.campoPreenchido("Municipio", profissional.municipio),
        this.campoPreenchido("UF", profissional.uf)
      ]),
      this.blocoComCampos("Observacoes", 1, [
        this.campoPreenchido("Resumo", profissional.resumo),
        this.campoPreenchido(
          "Tags",
          profissional.tags?.length ? profissional.tags.join(", ") : undefined
        ),
        this.campoPreenchido("Observacoes internas", profissional.observacoes)
      ])
    ].filter((bloco): bloco is RelatorioBloco => !!bloco);
  }

  private montarBlocosFichaVoluntario(voluntario: VoluntarioFicha): RelatorioBloco[] {
    return [
      this.blocoComCampos(
        "Identificacao do voluntario",
        2,
        [
          this.campoPreenchido("Nome completo", voluntario.nome_completo),
          this.campoPreenchido("CPF", voluntario.cpf)
        ],
        true
      ),
      this.blocoComCampos("Dados pessoais", 3, [
        this.campoPreenchido("RG", voluntario.rg),
        this.campoPreenchido("Data de nascimento", this.formatarData(voluntario.data_nascimento)),
        this.campoPreenchido("Genero", voluntario.genero),
        this.campoPreenchido("Profissao", voluntario.profissao),
        this.campoPreenchido("Status", this.formatarStatus(voluntario.status)),
        this.campoPreenchido("Profissional vinculado", voluntario.profissional_nome),
        this.campoPreenchido("Categoria profissional", voluntario.profissional_categoria),
        this.campoPreenchido("Inicio previsto", this.formatarData(voluntario.inicio_previsto))
      ]),
      this.blocoComCampos("Contato", 3, [
        this.campoPreenchido("E-mail", voluntario.email),
        this.campoPreenchido("Telefone", voluntario.telefone),
        this.campoPreenchido("Cidade", voluntario.cidade),
        this.campoPreenchido("Estado", voluntario.estado),
        this.campoPreenchido("Area de interesse", voluntario.area_interesse),
        this.campoPreenchido("Idiomas", voluntario.idiomas),
        this.campoPreenchido("LinkedIn", voluntario.linkedin)
      ]),
      this.blocoComCampos("Endereco", 3, [
        this.campoPreenchido("CEP", voluntario.cep),
        this.campoPreenchido("Endereco", voluntario.logradouro),
        this.campoPreenchido("Numero", voluntario.numero),
        this.campoPreenchido("Complemento", voluntario.complemento),
        this.campoPreenchido("Bairro", voluntario.bairro),
        this.campoPreenchido("Ponto de referencia", voluntario.ponto_referencia),
        this.campoPreenchido("Municipio", voluntario.municipio),
        this.campoPreenchido("UF", voluntario.uf),
        this.campoPreenchido("Zona", voluntario.zona),
        this.campoPreenchido("Subzona", voluntario.subzona)
      ]),
      this.blocoComCampos("Disponibilidade", 3, [
        this.campoPreenchido(
          "Dias",
          voluntario.disponibilidade_dias?.length
            ? voluntario.disponibilidade_dias.join(", ")
            : undefined
        ),
        this.campoPreenchido(
          "Periodos",
          voluntario.disponibilidade_periodos?.length
            ? voluntario.disponibilidade_periodos.join(", ")
            : undefined
        ),
        this.campoPreenchido("Carga horaria semanal", voluntario.carga_horaria_semanal),
        this.campoPreenchido("Presencial", this.formatarSimNao(voluntario.presencial)),
        this.campoPreenchido("Remoto", this.formatarSimNao(voluntario.remoto))
      ]),
      this.blocoComCampos("Termos e observacoes", 1, [
        this.campoPreenchido("Aceite voluntariado", this.formatarSimNao(voluntario.aceite_voluntariado)),
        this.campoPreenchido("Aceite imagem", this.formatarSimNao(voluntario.aceite_imagem)),
        this.campoPreenchido("Motivacao", voluntario.motivacao),
        this.campoPreenchido("Habilidades", voluntario.habilidades),
        this.campoPreenchido("Observacoes", voluntario.observacoes),
        this.campoPreenchido("Documento identificacao", voluntario.documento_identificacao),
        this.campoPreenchido("Comprovante endereco", voluntario.comprovante_endereco),
        this.campoPreenchido("Assinatura digital", voluntario.assinatura_digital)
      ])
    ].filter((bloco): bloco is RelatorioBloco => !!bloco);
  }
  async gerarRelacaoBeneficiarios(rawPayload: unknown): Promise<RelatorioResultado> {
    const payload = beneficiarioRelacaoRequestSchema.parse(rawPayload);
    const beneficiarios = await this.beneficiarioService.listar({
      nome: payload.nome,
      cpf: payload.cpf,
      codigo: payload.codigo,
      status: payload.status,
      data_nascimento: payload.dataNascimento
    });

    const listaOrdenada = [...beneficiarios].sort((a, b) => {
      const nomeA = (a.nome_completo || "").toLowerCase();
      const nomeB = (b.nome_completo || "").toLowerCase();
      return nomeA.localeCompare(nomeB);
    });

    const contexto = await this.montarContextoInstitucional();
    const relatorioInput: RelatorioHtmlInput = {
      titulo: "Relação de Beneficiários",
      metadadosTopo: this.montarMetadadosTopo(payload.usuarioEmissor),
      descricao: "Relação de beneficiários cadastrados no sistema G3-Next.",
      tabela: {
        colunas: [
          { titulo: "Código", largura: "12%" },
          { titulo: "Nome", largura: "34%" },
          { titulo: "CPF", largura: "18%" },
          { titulo: "Nascimento", largura: "16%" },
          { titulo: "Status", largura: "20%" }
        ],
        linhas: listaOrdenada.map((item) => [
          item.codigo || "---",
          item.nome_completo || "---",
          item.cpf || "---",
          this.formatarData(item.data_nascimento),
          (item.status || "EM_ANALISE").replaceAll("_", " ")
        ])
      },
      cabecalho: contexto.cabecalho,
      rodape: contexto.rodape
    };

    const html = this.template.montarHtml(relatorioInput);
    const pdf = await this.renderer.render(html, contexto.rodape, relatorioInput);
    return { html, pdf, filename: "relacao-beneficiarios.pdf" };
  }

  async gerarFichaBeneficiario(rawPayload: unknown): Promise<RelatorioResultado> {
    const payload = beneficiarioFichaRequestSchema.parse(rawPayload);
    const beneficiario = await this.beneficiarioService.buscarPorId(payload.beneficiarioId);
    const contexto = await this.montarContextoInstitucional();

    const relatorioInput: RelatorioHtmlInput = {
      titulo: "Ficha Cadastral de Beneficiário",
      metadadosTopo: this.montarMetadadosTopo(payload.usuarioEmissor),
      fotoUrl: beneficiario.foto_3x4,
      fotoAjuste: "cover",
      blocos: this.montarBlocosFichaBeneficiario(beneficiario),
      cabecalho: contexto.cabecalho,
      rodape: contexto.rodape
    };

    const html = this.template.montarHtml(relatorioInput);
    const pdf = await this.renderer.render(html, contexto.rodape, relatorioInput);
    return { html, pdf, filename: "ficha-beneficiario.pdf" };
  }

  async gerarRelacaoProfissionais(rawPayload: unknown): Promise<RelatorioResultado> {
    const payload = profissionalRelacaoRequestSchema.parse(rawPayload);
    const profissionais = await this.profissionalService.listar({
      nome: payload.nome,
      categoria: payload.categoria,
      status: payload.status,
      cpf: payload.cpf,
      vinculo: payload.vinculo
    });

    const listaOrdenada = [...profissionais].sort((a, b) =>
      (a.nome_completo || "").toLowerCase().localeCompare((b.nome_completo || "").toLowerCase())
    );

    const contexto = await this.montarContextoInstitucional();
    const relatorioInput: RelatorioHtmlInput = {
      titulo: "Relacao de Profissionais",
      metadadosTopo: this.montarMetadadosTopo(payload.usuarioEmissor),
      descricao: "Relacao de profissionais cadastrados no sistema G3-Next.",
      tabela: {
        colunas: [
          { titulo: "Nome", largura: "30%" },
          { titulo: "Categoria", largura: "20%" },
          { titulo: "Especialidade", largura: "18%" },
          { titulo: "CPF", largura: "14%" },
          { titulo: "Status", largura: "9%" },
          { titulo: "Telefone", largura: "9%" }
        ],
        linhas: listaOrdenada.map((item) => [
          item.nome_completo || "---",
          item.categoria || "---",
          item.especialidade || "---",
          item.cpf || "---",
          this.formatarStatus(item.status),
          item.telefone || "---"
        ])
      },
      cabecalho: contexto.cabecalho,
      rodape: contexto.rodape
    };

    const html = this.template.montarHtml(relatorioInput);
    const pdf = await this.renderer.render(html, contexto.rodape, relatorioInput);
    return { html, pdf, filename: "relacao-profissionais.pdf" };
  }

  async gerarFichaProfissional(rawPayload: unknown): Promise<RelatorioResultado> {
    const payload = profissionalFichaRequestSchema.parse(rawPayload);
    const profissional = await this.profissionalService.buscarPorId(payload.profissionalId);
    const contexto = await this.montarContextoInstitucional();

    const relatorioInput: RelatorioHtmlInput = {
      titulo: "Ficha Cadastral de Profissional",
      metadadosTopo: this.montarMetadadosTopo(payload.usuarioEmissor),
      fotoUrl: profissional.foto_3x4,
      blocos: this.montarBlocosFichaProfissional(profissional),
      cabecalho: contexto.cabecalho,
      rodape: contexto.rodape
    };

    const html = this.template.montarHtml(relatorioInput);
    const pdf = await this.renderer.render(html, contexto.rodape, relatorioInput);
    return { html, pdf, filename: "ficha-profissional.pdf" };
  }

  async gerarRelacaoVoluntarios(rawPayload: unknown): Promise<RelatorioResultado> {
    const payload = voluntarioRelacaoRequestSchema.parse(rawPayload);
    const voluntarios = await this.voluntarioService.listar({
      nome: payload.nome,
      cpf: payload.cpf,
      status: payload.status,
      email: payload.email
    });

    const listaOrdenada = [...voluntarios].sort((a, b) =>
      (a.nome_completo || "").toLowerCase().localeCompare((b.nome_completo || "").toLowerCase())
    );

    const contexto = await this.montarContextoInstitucional();
    const relatorioInput: RelatorioHtmlInput = {
      titulo: "Relacao de Voluntarios",
      metadadosTopo: this.montarMetadadosTopo(payload.usuarioEmissor),
      descricao: "Relacao de voluntarios cadastrados no sistema G3-Next.",
      tabela: {
        colunas: [
          { titulo: "Nome", largura: "30%" },
          { titulo: "CPF", largura: "14%" },
          { titulo: "E-mail", largura: "24%" },
          { titulo: "Profissao", largura: "16%" },
          { titulo: "Status", largura: "8%" },
          { titulo: "Telefone", largura: "8%" }
        ],
        linhas: listaOrdenada.map((item) => [
          item.nome_completo || "---",
          item.cpf || "---",
          item.email || "---",
          item.profissao || "---",
          this.formatarStatus(item.status),
          item.telefone || "---"
        ])
      },
      cabecalho: contexto.cabecalho,
      rodape: contexto.rodape
    };

    const html = this.template.montarHtml(relatorioInput);
    const pdf = await this.renderer.render(html, contexto.rodape, relatorioInput);
    return { html, pdf, filename: "relacao-voluntarios.pdf" };
  }

  async gerarRelacaoMatriculas(rawPayload: unknown): Promise<RelatorioResultado> {
    const payload = matriculasRelacaoRequestSchema.parse(rawPayload);
    const matriculas = await this.matriculaService.listar({
      nome: payload.nome,
      tipo: payload.tipo,
      status: payload.status,
      profissional: payload.profissional,
      beneficiario: payload.beneficiario
    });

    const listaOrdenada = [...matriculas].sort((a, b) =>
      (a.nome || "").toLowerCase().localeCompare((b.nome || "").toLowerCase())
    );

    const contexto = await this.montarContextoInstitucional();
    const relatorioInput: RelatorioHtmlInput = {
      titulo: "Relacao de Matriculas",
      metadadosTopo: this.montarMetadadosTopo(payload.usuarioEmissor),
      descricao: "Relacao de cursos, atendimentos e oficinas com indicadores de matriculas.",
      tabela: {
        colunas: [
          { titulo: "Tipo", largura: "12%" },
          { titulo: "Nome", largura: "28%" },
          { titulo: "Status", largura: "12%" },
          { titulo: "Vagas", largura: "10%" },
          { titulo: "Inscritos", largura: "10%" },
          { titulo: "Fila", largura: "8%" },
          { titulo: "Profissional", largura: "20%" }
        ],
        linhas: listaOrdenada.map((item) => [
          item.tipo || "---",
          item.nome || "---",
          this.formatarStatus(item.status),
          `${item.vagas_disponiveis ?? 0}/${item.vagas_totais ?? 0}`,
          String(item.total_matriculas ?? 0),
          String(item.total_fila_espera ?? 0),
          item.profissional || "---"
        ])
      },
      cabecalho: contexto.cabecalho,
      rodape: contexto.rodape
    };

    const html = this.template.montarHtml(relatorioInput);
    const pdf = await this.renderer.render(html, contexto.rodape, relatorioInput);
    return { html, pdf, filename: "relacao-matriculas.pdf" };
  }

  async gerarListaPresencaMatricula(rawPayload: unknown): Promise<RelatorioResultado> {
    const payload = matriculaListaPresencaRequestSchema.parse(rawPayload);
    const matricula = await this.matriculaService.buscarPorId(payload.matriculaId);
    const contexto = await this.montarContextoInstitucional();
    const participantes = [...(matricula.matriculas ?? [])]
      .filter((item) => (item.status ?? "ATIVO").trim().toUpperCase() !== "CANCELADO")
      .sort((a, b) => (a.beneficiario_nome || "").localeCompare(b.beneficiario_nome || "", "pt-BR"));
    const exibirCpf = payload.exibirCpf !== false;
    const horario =
      matricula.horario_inicial && matricula.duracao_horas
        ? `${matricula.horario_inicial} (${matricula.duracao_horas}h)`
        : matricula.horario_inicial ?? undefined;
    const tabela = {
      colunas: exibirCpf
        ? [
            { titulo: "Nº", largura: "8%" },
            { titulo: "Participante", largura: "54%" },
            { titulo: "CPF", largura: "22%" },
            { titulo: "P", largura: "8%" },
            { titulo: "A", largura: "8%" }
          ]
        : [
            { titulo: "Nº", largura: "8%" },
            { titulo: "Participante", largura: "72%" },
            { titulo: "P", largura: "10%" },
            { titulo: "A", largura: "10%" }
          ],
      linhas: participantes.length
        ? participantes.map((item, index) =>
            exibirCpf
              ? [String(index + 1), item.beneficiario_nome || "---", item.cpf || "---", " ", " "]
              : [String(index + 1), item.beneficiario_nome || "---", " ", " "]
          )
        : [
            exibirCpf
              ? ["1", "Nenhum participante inscrito.", "---", " ", " "]
              : ["1", "Nenhum participante inscrito.", " ", " "]
          ]
    };

    const relatorioInput: RelatorioHtmlInput = {
      titulo: "Lista de presença do curso/atendimento",
      metadadosTopo: this.montarMetadadosTopo(payload.usuarioEmissor),
      descricao:
        "Relatório completo para acompanhamento de frequência, com identificação do curso/atendimento e espaço para marcação manual de presença.",
      blocos: [
        {
          titulo: "Identificação do curso/atendimento",
          colunas: 2,
          destaque: true,
          campos: [
            this.campo("Curso/atendimento", matricula.nome),
            this.campo("Tipo", matricula.tipo),
            this.campo("Status", this.formatarStatus(matricula.status)),
            this.campo(
              "Data da aula",
              this.normalizarTexto(payload.dataAula) ? this.formatarDataComHifen(payload.dataAula) : "Não definida"
            )
          ]
        },
        {
          titulo: "Organização da turma",
          colunas: 3,
          campos: [
            this.campo("Profissional responsável", matricula.profissional),
            this.campo("Sala", matricula.sala_nome),
            this.campo("Instituição parceira", matricula.instituicao_parceira),
            this.campo("Horário", horario),
            this.campo("Dias", matricula.dias_semana?.length ? matricula.dias_semana.join(", ") : undefined),
            this.campo("Período", this.formatarPeriodoCurso(matricula.data_triagem, matricula.data_conclusao)),
            this.campo("Carga horária", matricula.carga_horaria ? `${matricula.carga_horaria}h` : undefined),
            this.campo("Duração prevista", matricula.duracao_horas ? `${matricula.duracao_horas}h` : undefined),
            this.campo("Faixa etária", matricula.faixa_etaria?.length ? matricula.faixa_etaria.join(", ") : undefined)
          ]
        },
        {
          titulo: "Participantes e critérios",
          colunas: 3,
          campos: [
            this.campo("Participantes inscritos", String(participantes.length)),
            this.campo("Vagas totais", String(matricula.vagas_totais ?? 0)),
            this.campo("Vagas disponíveis", String(matricula.vagas_disponiveis ?? 0)),
            this.campo(
              "Sexo permitido",
              matricula.sexo_permitido ? this.formatarValorEnumerado(matricula.sexo_permitido) : "Todos"
            ),
            this.campo("Fila de espera", String(matricula.total_fila_espera ?? 0)),
            this.campo("Preferencial para idosos", this.formatarSimNao(matricula.vaga_preferencial_idosos))
          ]
        },
        this.blocoComCampos("Descrição e restrições", 1, [
          this.campoPreenchido("Descrição", matricula.descricao),
          this.campoPreenchido("Restrições", matricula.restricoes)
        ])
      ].filter((bloco): bloco is RelatorioBloco => !!bloco),
      tabela,
      secoes: [
        {
          titulo: "Orientação de preenchimento",
          conteudo:
            "Utilize a coluna P para presente e a coluna A para ausente. A marcação deve ser feita manualmente no momento da aula ou atendimento."
        },
        {
          titulo: "Assinatura do profissional responsável",
          conteudo: [
            `Profissional responsável: ${this.normalizarTexto(matricula.profissional) ?? "Não informado"}`,
            "[[espaco:3.2]]",
            "_______________________________________________________________"
          ].join("\n")
        }
      ],
      cabecalho: contexto.cabecalho,
      rodape: contexto.rodape
    };

    const html = this.template.montarHtml(relatorioInput);
    const pdf = await this.renderer.render(html, contexto.rodape, relatorioInput);
    return {
      html,
      pdf,
      filename: `lista-presenca-matricula-${matricula.id_matricula ?? payload.matriculaId}.pdf`
    };
  }

  async gerarComprovanteMatricula(rawPayload: unknown): Promise<RelatorioResultado> {
    const payload = comprovanteMatriculaRequestSchema.parse(rawPayload);
    const contexto = await this.montarContextoInstitucional();

    const relatorioInput: RelatorioHtmlInput = {
      titulo: "Comprovante de Matricula",
      metadadosTopo: this.montarMetadadosTopo(payload.usuarioEmissor),
      descricao:
        "Este comprovante confirma a matricula do beneficiario no curso/atendimento informado.",
      blocos: [
        {
          titulo: "Dados do beneficiario",
          colunas: 2,
          destaque: true,
          campos: [
            this.campo("Nome completo", payload.beneficiarioNome),
            this.campo("CPF", payload.cpf),
            this.campo("Telefone", payload.telefone),
            this.campo("Data da matricula", this.formatarData(payload.dataRegistro))
          ]
        },
        {
          titulo: "Dados da matricula",
          colunas: 3,
          campos: [
            this.campo("Curso/atendimento", payload.cursoNome),
            this.campo("Tipo", payload.cursoTipo),
            this.campo("Status", this.formatarStatus(payload.cursoStatus)),
            this.campo("Profissional responsavel", payload.cursoProfissional),
            this.campo("Sala", payload.cursoSala),
            this.campo("Horario", payload.cursoHorario),
            this.campo("Dias", payload.cursoDias),
            this.campo("Periodo", payload.cursoPeriodo),
            this.campo("Instituicao parceira", payload.cursoInstituicao)
          ]
        }
      ],
      cabecalho: contexto.cabecalho,
      rodape: contexto.rodape
    };

    const html = this.template.montarHtml(relatorioInput);
    const pdf = await this.renderer.render(html, contexto.rodape, relatorioInput);
    return { html, pdf, filename: "comprovante-matricula.pdf" };
  }

  async gerarComprovantePreMatriculaEspera(rawPayload: unknown): Promise<RelatorioResultado> {
    const payload = comprovantePreMatriculaEsperaRequestSchema.parse(rawPayload);
    const contexto = await this.montarContextoInstitucional();

    const relatorioInput: RelatorioHtmlInput = {
      titulo: "Comprovante de Pre-Matricula em Lista de Espera",
      metadadosTopo: this.montarMetadadosTopo(payload.usuarioEmissor),
      descricao:
        "Este comprovante confirma o cadastro do beneficiario na lista de espera para futura matricula.",
      blocos: [
        {
          titulo: "Dados do beneficiario",
          colunas: 2,
          destaque: true,
          campos: [
            this.campo("Nome completo", payload.beneficiarioNome),
            this.campo("CPF", payload.cpf),
            this.campo("Telefone", payload.telefone),
            this.campo("Data de entrada na fila", this.formatarData(payload.dataEntradaFila)),
            this.campo("Posicao atual na fila", payload.posicaoFila)
          ]
        },
        {
          titulo: "Curso/atendimento de referencia",
          colunas: 3,
          campos: [
            this.campo("Curso/atendimento", payload.cursoNome),
            this.campo("Tipo", payload.cursoTipo),
            this.campo("Status", this.formatarStatus(payload.cursoStatus)),
            this.campo("Profissional responsavel", payload.cursoProfissional),
            this.campo("Sala", payload.cursoSala),
            this.campo("Horario", payload.cursoHorario),
            this.campo("Dias", payload.cursoDias),
            this.campo("Periodo", payload.cursoPeriodo),
            this.campo("Instituicao parceira", payload.cursoInstituicao)
          ]
        }
      ],
      cabecalho: contexto.cabecalho,
      rodape: contexto.rodape
    };

    const html = this.template.montarHtml(relatorioInput);
    const pdf = await this.renderer.render(html, contexto.rodape, relatorioInput);
    return { html, pdf, filename: "comprovante-pre-matricula-lista-espera.pdf" };
  }

  async gerarRelacaoRegistroDoacao(rawPayload: unknown): Promise<RelatorioResultado> {
    const payload = registroDoacaoRelacaoRequestSchema.parse(rawPayload);
    const registros = await this.registroDoacaoService.listar({
      doador_nome: payload.doador_nome,
      tipo_doacao: payload.tipo_doacao,
      status: payload.status,
      data_inicial: payload.data_inicial,
      data_final: payload.data_final
    });

    const listaOrdenada = [...registros].sort((a, b) => {
      const dataA = a.data_recebimento || "";
      const dataB = b.data_recebimento || "";
      return dataB.localeCompare(dataA);
    });

    const contexto = await this.montarContextoInstitucional();
    const relatorioInput: RelatorioHtmlInput = {
      titulo: "Relacao de Registro de Doacao",
      metadadosTopo: this.montarMetadadosTopo(payload.usuarioEmissor),
      descricao: "Relacao de recebimentos de doacoes cadastrados no sistema G3-Next.",
      tabela: {
        colunas: [
          { titulo: "Data", largura: "12%" },
          { titulo: "Doador", largura: "24%" },
          { titulo: "Tipo", largura: "16%" },
          { titulo: "Status", largura: "12%" },
          { titulo: "Valor", largura: "12%" },
          { titulo: "Itens", largura: "8%" },
          { titulo: "Recorrente", largura: "8%" },
          { titulo: "Forma", largura: "8%" }
        ],
        linhas: listaOrdenada.map((item) => [
          this.formatarData(item.data_recebimento),
          item.doador_nome || "---",
          item.tipo_doacao || "---",
          this.formatarStatus(item.status),
          item.valor_total?.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
          }) ??
            item.valor?.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL"
            }) ??
            "---",
          String(item.quantidade_itens ?? item.itens?.length ?? 0),
          item.recorrente ? "Sim" : "Nao",
          item.forma_recebimento || "---"
        ])
      },
      cabecalho: contexto.cabecalho,
      rodape: contexto.rodape
    };

    const html = this.template.montarHtml(relatorioInput);
    const pdf = await this.renderer.render(html, contexto.rodape, relatorioInput);
    return { html, pdf, filename: "relacao-registro-doacao.pdf" };
  }

  async gerarRelacaoDoacoesRealizadas(rawPayload: unknown): Promise<RelatorioResultado> {
    const payload = doacaoRealizadaRelacaoRequestSchema.parse(rawPayload);
    const doacoes = await this.doacaoRealizadaService.listar({
      beneficiario_nome: payload.beneficiario_nome,
      tipo_doacao: payload.tipo_doacao,
      situacao: payload.situacao,
      data_inicial: payload.data_inicial,
      data_final: payload.data_final
    });

    const listaOrdenada = [...doacoes].sort((a, b) => {
      const dataA = a.data_doacao || "";
      const dataB = b.data_doacao || "";
      return dataB.localeCompare(dataA);
    });

    const contexto = await this.montarContextoInstitucional();
    const relatorioInput: RelatorioHtmlInput = {
      titulo: "Relacao de Doacoes Realizadas",
      metadadosTopo: this.montarMetadadosTopo(payload.usuarioEmissor),
      descricao: "Relacao de doacoes entregues a beneficiarios e familias.",
      tabela: {
        colunas: [
          { titulo: "Data", largura: "12%" },
          { titulo: "Beneficiario/Familia", largura: "28%" },
          { titulo: "Tipo", largura: "16%" },
          { titulo: "Situacao", largura: "12%" },
          { titulo: "Responsavel", largura: "22%" },
          { titulo: "Itens", largura: "10%" }
        ],
        linhas: listaOrdenada.map((item) => [
          this.formatarData(item.data_doacao),
          item.beneficiario_nome || item.familia_nome || "---",
          item.tipo_doacao || "---",
          item.situacao || "---",
          item.responsavel || "---",
          String(item.total_itens ?? item.itens?.length ?? 0)
        ])
      },
      cabecalho: contexto.cabecalho,
      rodape: contexto.rodape
    };

    const html = this.template.montarHtml(relatorioInput);
    const pdf = await this.renderer.render(html, contexto.rodape, relatorioInput);
    return { html, pdf, filename: "relacao-doacoes-realizadas.pdf" };
  }

  async gerarReciboDoacaoRealizada(rawPayload: unknown): Promise<RelatorioResultado> {
    const payload = doacaoRealizadaReciboRequestSchema.parse(rawPayload);
    const doacao = await this.doacaoRealizadaService.buscarPorId(payload.doacaoRealizadaId);
    const contexto = await this.montarContextoInstitucional();
    const beneficiarioFamilia = doacao.beneficiario_nome || doacao.familia_nome || "---";
    const possuiBeneficiario = !!this.normalizarTexto(doacao.beneficiario_nome);
    const blocos = [
      this.blocoComCampos(
        "Identificação da entrega",
        2,
        [
          this.campo("Recibo", doacao.id_doacao_realizada),
          this.campo("Data da entrega", this.formatarDataComHifen(doacao.data_doacao)),
          this.campo("Destinatário", beneficiarioFamilia),
          this.campo("Tipo de destinatário", possuiBeneficiario ? "Beneficiário" : "Família"),
          this.campo("Tipo de doação", doacao.tipo_doacao),
          this.campo("Situação", doacao.situacao)
        ],
        true
      ),
      this.blocoComCampos(
        "Responsável pelo registro",
        2,
        [
          this.campo("Responsável", doacao.responsavel),
          this.campo("Quantidade de itens", String(doacao.total_itens ?? doacao.itens.length))
        ]
      ),
      this.blocoComCampos(
        "Observações",
        1,
        [this.campoPreenchido("Observações", doacao.observacoes)]
      )
    ].filter((bloco): bloco is RelatorioBloco => !!bloco);

    const relatorioInput: RelatorioHtmlInput = {
      titulo: "Recibo de doação entregue",
      metadadosTopo: this.montarMetadadosTopo(payload.usuarioEmissor),
      descricao: "Recibo emitido com base nos parâmetros institucionais cadastrados no sistema.",
      blocos,
      tabela: {
        colunas: [
          { titulo: "Item", largura: "46%" },
          { titulo: "Unidade", largura: "14%" },
          { titulo: "Quantidade", largura: "12%" },
          { titulo: "Observações", largura: "28%" }
        ],
        linhas: doacao.itens.map((item) => [
          item.descricao_item || item.codigo_item || `Item ${item.item_id}`,
          item.unidade_item || "---",
          String(item.quantidade),
          item.observacoes || "---"
        ])
      },
      secoes: [
        {
          titulo: "Declaração",
          conteudo: "Declaro ter recebido gratuitamente os serviços ou benefícios constantes neste recibo."
        },
        {
          titulo: "Assinaturas",
          conteudo:
            "Responsável pela entrega:\n[[espaco:2.8]]\n_______________________________________________________________\n\nRecebedor:\n[[espaco:2.8]]\n_______________________________________________________________"
        }
      ],
      cabecalho: contexto.cabecalho,
      rodape: contexto.rodape
    };

    const html = this.template.montarHtml(relatorioInput);
    const pdf = await this.renderer.render(html, contexto.rodape, relatorioInput);
    return { html, pdf, filename: `recibo-doacao-realizada-${doacao.id_doacao_realizada}.pdf` };
  }

  async gerarFichaVoluntario(rawPayload: unknown): Promise<RelatorioResultado> {
    const payload = voluntarioFichaRequestSchema.parse(rawPayload);
    const voluntario = await this.voluntarioService.buscarPorId(payload.voluntarioId);
    const contexto = await this.montarContextoInstitucional();

    const relatorioInput: RelatorioHtmlInput = {
      titulo: "Ficha Cadastral de Voluntario",
      metadadosTopo: this.montarMetadadosTopo(payload.usuarioEmissor),
      fotoUrl: voluntario.foto_3x4,
      blocos: this.montarBlocosFichaVoluntario(voluntario),
      cabecalho: contexto.cabecalho,
      rodape: contexto.rodape
    };

    const html = this.template.montarHtml(relatorioInput);
    const pdf = await this.renderer.render(html, contexto.rodape, relatorioInput);
    return { html, pdf, filename: "ficha-voluntario.pdf" };
  }

  async gerarTermoAutorizacao(rawPayload: unknown): Promise<RelatorioResultado> {
    const payload = termoAutorizacaoRequestSchema.parse(rawPayload);
    const contexto = await this.montarContextoInstitucional();

    const nomeInstituicao = this.normalizarTexto(contexto.cabecalho.razaoSocial) ?? "Instituição não informada";
    const cnpjInstituicao =
      contexto.rodape.linha2.match(/CNPJ:\s*([^|]+)/i)?.[1]?.trim() ?? "Não informado";

    const nomeBeneficiario = this.normalizarTexto(payload.beneficiarioNome) ?? "Não informado";
    const rgBeneficiario = this.normalizarTexto(payload.rg) ?? "Não informado";
    const cpfBeneficiario = this.normalizarTexto(payload.cpf) ?? "Não informado";
    const enderecoBeneficiario = this.normalizarTexto(payload.enderecoCompleto) ?? "Não informado";
    const cidadeUf = [payload.cidade, payload.uf]
      .map((valor) => this.normalizarTexto(valor))
      .filter((valor): valor is string => !!valor)
      .join("-");
    const cidadeUfBeneficiario = cidadeUf || "Não informado";
    const dataAssinatura = this.formatarDataComHifen(payload.dataAssinatura);

    const secoesTermo = [
      {
        titulo: "Declaração do titular",
        conteudo: `Pelo presente instrumento, eu, ${nomeBeneficiario}, portador(a) do documento de identidade RG nº ${rgBeneficiario} e CPF nº ${cpfBeneficiario}, residente e domiciliado(a) na ${enderecoBeneficiario}, na cidade de ${cidadeUfBeneficiario} (ou o responsável legal, se aplicável), doravante denominado(a) TITULAR, declaro que consinto, de forma livre, informada e inequívoca, com o tratamento dos meus dados pessoais e com o uso da minha imagem pela instituição ${nomeInstituicao}, inscrita no CNPJ sob o nº ${cnpjInstituicao}, doravante denominada CONTROLADOR(A).`
      },
      {
        titulo: "Finalidade do tratamento e uso",
        conteudo: [
          `Tratamento de dados pessoais: ${payload.finalidadeDados || "Coleta, armazenamento e processamento de dados (como nome, CPF, endereço, renda, composição familiar e informações de saúde, se pertinentes) para fins de cadastro, análise de elegibilidade para programas sociais, acompanhamento familiar e emissão de relatórios a órgãos públicos."}`,
          `Uso de imagem: ${payload.finalidadeImagem || "Utilização de imagem, voz e/ou depoimento (em fotos, vídeos e áudios) para fins de divulgação institucional, prestação de contas a parceiros, campanhas de conscientização e publicações em canais oficiais."}`
        ].join("\n\n")
      },
      {
        titulo: "Forma de divulgação",
        conteudo:
          "A autorização para uso de imagem abrange a divulgação em todo território nacional e, se necessário, no exterior, por meio de mídias impressas (cartazes, folders e relatórios) e digitais (website, e-mail marketing e redes sociais), sem finalidade comercial."
      },
      {
        titulo: "Gratuidade e vigência",
        conteudo: `A presente autorização é concedida a título gratuito (sem qualquer remuneração). Vigência: ${payload.vigencia || "Prazo indeterminado."}`
      },
      {
        titulo: "Direitos do titular",
        conteudo: `Estou ciente de que a Lei nº 13.709/2018 (LGPD) garante direitos como acesso aos dados, correção, anonimização, bloqueio ou eliminação de dados desnecessários ou excessivos. A qualquer momento, posso revogar este consentimento, mediante manifestação expressa, por escrito, junto à instituição ${nomeInstituicao}.`
      },
      {
        titulo: "Segurança e responsabilidades",
        conteudo:
          "O(A) CONTROLADOR(A) se compromete a adotar medidas de segurança, técnicas e administrativas, aptas a proteger os dados pessoais e a imagem de acessos não autorizados e de situações acidentais ou ilícitas de destruição, perda, alteração, comunicação ou difusão."
      },
      {
        titulo: "Assinaturas",
        conteudo: [
          [payload.localAssinatura, dataAssinatura].filter(Boolean).join(", "),
          "[[espaco:5]]",
          "________________________________________",
          "Assinatura do beneficiário / responsável legal",
          `${payload.responsavelNome || nomeBeneficiario}`,
          `CPF: ${payload.responsavelCpf || cpfBeneficiario}`,
          `${payload.responsavelRelacao || "Titular dos dados / responsável legal"}`
        ].join("\n")
      }
    ];

    const relatorioInput: RelatorioHtmlInput = {
      titulo: "Termo de Consentimento para Uso de Dados Pessoais e Imagem",
      metadadosTopo: this.montarMetadadosTopo(payload.issuedBy),
      blocos: [
        {
          titulo: "Dados do beneficiário",
          colunas: 2,
          destaque: true,
          campos: [
            this.campo("Nome completo", payload.beneficiarioNome),
            this.campo("CPF", payload.cpf)
          ]
        },
        {
          titulo: "Finalidades autorizadas",
          colunas: 1,
          campos: [
            this.campo(
              "Tratamento de dados pessoais",
              payload.finalidadeDados || "Conforme autorização institucional."
            ),
            this.campo("Uso de imagem", payload.finalidadeImagem || "Conforme autorização institucional."),
            this.campo("Vigência", payload.vigencia)
          ]
        },
        {
          titulo: "Assinaturas e validação",
          colunas: 2,
          campos: [
            this.campo("Local da assinatura", payload.localAssinatura),
            this.campo("Data da assinatura", dataAssinatura),
            this.campo("Responsável legal", payload.responsavelNome),
            this.campo("CPF do responsável", payload.responsavelCpf),
            this.campo("Relação com o beneficiário", payload.responsavelRelacao)
          ]
        }
      ],
      secoes: secoesTermo,
      cabecalho: contexto.cabecalho,
      rodape: contexto.rodape
    };

    const html = this.template.montarHtml(relatorioInput);
    const pdf = await this.renderer.render(html, contexto.rodape, relatorioInput);
    return { html, pdf, filename: "termo-consentimento-lgpd.pdf" };
  }
  async gerarRelacaoUnidadesAssistenciais(rawPayload: unknown): Promise<RelatorioResultado> {
    const payload = unidadeAssistencialRelacaoRequestSchema.parse(rawPayload);
    const unidades = await this.unidadeAssistencialService.listar({
      nome_fantasia: payload.nome_fantasia,
      cnpj: payload.cnpj,
      cidade: payload.cidade,
      unidade_principal: payload.unidade_principal
    });

    const listaOrdenada = [...unidades].sort((a, b) => {
      const nomeA = (a.nome_fantasia || "").toLowerCase();
      const nomeB = (b.nome_fantasia || "").toLowerCase();
      return nomeA.localeCompare(nomeB);
    });

    const contexto = await this.montarContextoInstitucional();
    const relatorioInput: RelatorioHtmlInput = {
      titulo: "Relação de Unidades Assistenciais",
      metadadosTopo: this.montarMetadadosTopo(payload.usuarioEmissor),
      descricao: "Relação de unidades assistenciais cadastradas no sistema G3-Next.",
      tabela: {
        colunas: [
          { titulo: "Código", largura: "10%" },
          { titulo: "Nome fantasia", largura: "30%" },
          { titulo: "CNPJ", largura: "18%" },
          { titulo: "Cidade/UF", largura: "18%" },
          { titulo: "Telefone", largura: "14%" },
          { titulo: "Status", largura: "10%" }
        ],
        linhas: listaOrdenada.map((item) => [
          item.id_unidade || "---",
          item.nome_fantasia || "---",
          item.cnpj || "---",
          [item.cidade, item.estado].filter(Boolean).join("/") || "---",
          item.telefone || "---",
          item.unidade_principal ? "Principal" : "Ativa"
        ])
      },
      cabecalho: contexto.cabecalho,
      rodape: contexto.rodape
    };

    const html = this.template.montarHtml(relatorioInput);
    const pdf = await this.renderer.render(html, contexto.rodape, relatorioInput);
    return { html, pdf, filename: "relacao-unidades-assistenciais.pdf" };
  }

  private formatarMinutosRelatorio(totalMinutos?: number) {
    const valor = Number(totalMinutos ?? 0);
    const sinal = valor < 0 ? "-" : "";
    const absoluto = Math.abs(valor);
    const horas = Math.floor(absoluto / 60);
    const minutos = absoluto % 60;
    return `${sinal}${horas}h ${String(minutos).padStart(2, "0")}m`;
  }

  async gerarEspelhoPonto(rawPayload: unknown, authUser?: any): Promise<RelatorioResultado> {
    const payload = registroPontoEspelhoRequestSchema.parse(rawPayload);
    const ator = {
      id: authUser?.id ? BigInt(authUser.id) : (payload.usuario_id ? BigInt(payload.usuario_id) : undefined),
      nome_usuario: authUser?.nomeUsuario || payload.usuarioEmissor || "Sistema G3-Next",
      permissoes: authUser?.permissoes || ["ADMINISTRADOR"]
    };

    const espelhoData = await this.registroPontoService.listarEspelho(
      {
        data_inicial: payload.data_inicial,
        data_final: payload.data_final,
        usuario_id: payload.usuario_id,
        status: payload.status,
        ocorrencia: payload.ocorrencia,
        somente_alterados: payload.somente_alterados,
        somente_inconsistencias: payload.somente_inconsistencias
      },
      ator
    );

    const registros = espelhoData.registros ?? [];
    const totais = espelhoData.totais;

    const contexto = await this.montarContextoInstitucional();
    const relatorioInput: RelatorioHtmlInput = {
      titulo: "Espelho de Ponto Individual",
      metadadosTopo: this.montarMetadadosTopo(payload.usuarioEmissor),
      descricao: `Relatório detalhado de marcações de ponto e apuração de horas${
        registros[0]?.usuario_nome ? ` para o colaborador ${registros[0].usuario_nome}` : ""
      }.`,
      blocos: [
        {
          titulo: "Resumo do Período",
          colunas: 3,
          destaque: true,
          campos: [
            this.campo("Total de dias", String(totais?.total_dias ?? 0)),
            this.campo("Horas extras", this.formatarMinutosRelatorio(totais?.horas_extras_minutos)),
            this.campo("Banco de horas", this.formatarMinutosRelatorio(totais?.banco_horas_minutos)),
            this.campo("Atrasos", this.formatarMinutosRelatorio(totais?.atrasos_minutos)),
            this.campo("Faltas", this.formatarMinutosRelatorio(totais?.faltas_minutos)),
            this.campo("Ajustes realizados", String(totais?.total_ajustes ?? 0))
          ]
        }
      ],
      tabela: {
        colunas: [
          { titulo: "Data", largura: "10%" },
          { titulo: "E1", largura: "7%" },
          { titulo: "S1", largura: "7%" },
          { titulo: "E2", largura: "7%" },
          { titulo: "S2", largura: "7%" },
          { titulo: "Extra", largura: "10%" },
          { titulo: "Banco", largura: "10%" },
          { titulo: "Atraso", largura: "10%" },
          { titulo: "Falta", largura: "10%" },
          { titulo: "Ocorrências", largura: "22%" }
        ],
        linhas: registros.map((item) => [
          this.formatarData(item.data),
          item.entrada_1?.slice(0, 5) || "---",
          item.saida_1?.slice(0, 5) || "---",
          item.entrada_2?.slice(0, 5) || "---",
          item.saida_2?.slice(0, 5) || "---",
          this.formatarMinutosRelatorio(item.horas_extras_minutos),
          this.formatarMinutosRelatorio(item.banco_horas_minutos),
          this.formatarMinutosRelatorio(item.atrasos_minutos),
          this.formatarMinutosRelatorio(item.faltas_minutos),
          item.ocorrencias?.join(", ") || "---"
        ])
      },
      cabecalho: contexto.cabecalho,
      rodape: contexto.rodape
    };

    const html = this.template.montarHtml(relatorioInput);
    const pdf = await this.renderer.render(html, contexto.rodape, relatorioInput);
    return { html, pdf, filename: `espelho-ponto-${payload.usuario_id || "geral"}.pdf` };
  }
}
