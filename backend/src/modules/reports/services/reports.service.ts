import { BeneficiarioService } from "../../beneficiarios/services/beneficiario.service.js";
import { BibliotecaService } from "../../biblioteca/services/biblioteca.service.js";
import { ProfissionalService } from "../../profissionais/services/profissional.service.js";
import { MatriculaService } from "../../matriculas/services/matricula.service.js";
import { RegistroDoacaoService } from "../../registro-doacao/services/registro-doacao.service.js";
import { DoacaoRealizadaService } from "../../doacoes-realizadas/services/doacao-realizada.service.js";
import { UnidadeAssistencialService } from "../../unidades-assistenciais/services/unidade-assistencial.service.js";
import { VoluntarioService } from "../../voluntarios/services/voluntario.service.js";
import { RegistroPontoService } from "../../registro-ponto/services/registro-ponto.service.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { ReportsRepository } from "../repositories/reports.repository.js";
import {
  RelatorioTemplatePadrao,
  type RelatorioBloco,
  type RelatorioBlocoCampo,
  type RelatorioHtmlInput,
  type RelatorioMetaTopo,
  type RelatorioTabela
} from "../templates/relatorio-template-padrao.js";
import { HtmlPdfRenderer } from "./html-pdf-renderer.js";
import {
  beneficiarioFichaRequestSchema,
  beneficiarioRelacaoRequestSchema,
  bibliotecaEmprestimoRelacaoRequestSchema,
  bibliotecaLivroFichaRequestSchema,
  bibliotecaLivroRelacaoRequestSchema,
  bibliotecaRelatorioRequestSchema,
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

type AuthUser = {
  id?: string;
  nome?: string;
  nomeUsuario?: string;
  tenant_id?: string;
  instituicao_id?: string;
  permissoes?: string[];
};

type BeneficiarioFicha = Awaited<ReturnType<BeneficiarioService["buscarPorId"]>>;
type ProfissionalFicha = Awaited<ReturnType<ProfissionalService["buscarPorId"]>>;
type VoluntarioFicha = Awaited<ReturnType<VoluntarioService["buscarPorId"]>>;
type BibliotecaLivroFicha = Awaited<ReturnType<BibliotecaService["listarLivros"]>>[number];

export class ReportsService {
  private readonly beneficiarioService = new BeneficiarioService();
  private readonly bibliotecaService = new BibliotecaService();
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

  private async montarContextoInstitucional(rawTenantId?: string) {
    const instituicao = await this.repository.obterInstituicaoRelatorio(this.parseTenant(rawTenantId));

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

  private parseTenant(rawTenantId?: string) {
    const tenantId = rawTenantId?.trim();
    if (!tenantId) {
      throw new AppError("Tenant da sessao nao identificado.", 401);
    }
    return tenantId;
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

    const matchIso = texto.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T)/);
    if (matchIso) {
      const [, ano, mes, dia] = matchIso;
      return `${dia}/${mes}/${ano}`;
    }

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

  private formatarIdade(valor?: string | Date | null): string {
    if (!valor) return "---";

    const data = valor instanceof Date ? valor : new Date(valor);
    if (Number.isNaN(data.getTime())) return "---";

    const hoje = new Date();
    let idade = hoje.getFullYear() - data.getFullYear();
    const mesAtual = hoje.getMonth();
    const mesNascimento = data.getMonth();
    const diaAtual = hoje.getDate();
    const diaNascimento = data.getDate();

    if (mesAtual < mesNascimento || (mesAtual === mesNascimento && diaAtual < diaNascimento)) {
      idade -= 1;
    }

    return idade >= 0 ? `${idade} ano${idade === 1 ? "" : "s"}` : "---";
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

  private formatarStatusPresencaRelatorio(valor?: string | null): string {
    const texto = this.normalizarTexto(valor);
    if (!texto) return "Não informado";

    const normalizado = texto.toUpperCase();
    const mapa: Record<string, string> = {
      PRESENTE: "Presente",
      AUSENTE: "Ausente",
      JUSTIFICADO: "Justificado",
      NAO_INFORMADO: "Não informado"
    };

    return mapa[normalizado] ?? this.formatarValorEnumerado(normalizado);
  }

  private montarMetadadosTopo(usuarioEmissor?: string): RelatorioMetaTopo[] {
    const agora = new Date();

    return [
      {
        rotulo: "Data",
        valor: this.dateFormatter.format(agora).replaceAll("/", "-")
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

  private async renderizarPdfComFallback(
    html: string,
    rodape: { linha1: string; linha2?: string; linha3?: string },
    layout: RelatorioHtmlInput,
    contextoLog: string
  ) {
    try {
      return await this.renderer.render(html, rodape, layout);
    } catch (error) {
      console.error(`[reports] falha ao renderizar PDF estruturado em ${contextoLog}`, error);
      return this.renderer.render(html, rodape);
    }
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
        "Identificação do profissional",
        2,
        [
          this.campoPreenchido("Nome completo", profissional.nome_completo),
          this.campoPreenchido("Categoria", profissional.categoria)
        ],
        true
      ),
      this.blocoComCampos("Dados pessoais", 3, [
        this.campoPreenchido("CPF", profissional.cpf),
        this.campoPreenchido("Data de nascimento", this.formatarDataComHifen(profissional.data_nascimento)),
        this.campoPreenchido("Sexo", this.formatarValorEnumerado(profissional.sexo_biologico)),
        this.campoPreenchido("Estado civil", this.formatarValorEnumerado(profissional.estado_civil)),
        this.campoPreenchido("Nacionalidade", profissional.nacionalidade),
        this.campoPreenchido("Naturalidade (cidade)", profissional.naturalidade_cidade),
        this.campoPreenchido("Naturalidade (UF)", profissional.naturalidade_uf),
        this.campoPreenchido("Nome da mãe", profissional.nome_mae),
        this.campoPreenchido("Nome do pai", profissional.nome_pai)
      ]),
      this.blocoComCampos("Perfil profissional", 3, [
        this.campoPreenchido("Vínculo", profissional.vinculo),
        this.campoPreenchido("Especialidade", profissional.especialidade),
        this.campoPreenchido("Registro conselho", profissional.registro_conselho),
        this.campoPreenchido("Status", this.formatarStatus(profissional.status)),
        this.campoPreenchido("Unidade", profissional.unidade),
        this.campoPreenchido("Sala de atendimento", profissional.sala_atendimento),
        this.campoPreenchido("Carga horária", profissional.carga_horaria),
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
      this.blocoComCampos("Contato e endereço", 3, [
        this.campoPreenchido("E-mail", profissional.email),
        this.campoPreenchido("Telefone", profissional.telefone),
        this.campoPreenchido("CEP", profissional.cep),
        this.campoPreenchido("Endereço", profissional.logradouro),
        this.campoPreenchido("Número", profissional.numero),
        this.campoPreenchido("Complemento", profissional.complemento),
        this.campoPreenchido("Bairro", profissional.bairro),
        this.campoPreenchido("Ponto de referência", profissional.ponto_referencia),
        this.campoPreenchido("Município", profissional.municipio),
        this.campoPreenchido("UF", profissional.uf)
      ]),
      this.blocoComCampos("Observações", 1, [
        this.campoPreenchido("Resumo", profissional.resumo),
        this.campoPreenchido(
          "Tags",
          profissional.tags?.length ? profissional.tags.join(", ") : undefined
        ),
        this.campoPreenchido("Observações internas", profissional.observacoes)
      ])
    ].filter((bloco): bloco is RelatorioBloco => !!bloco);
  }

  private montarBlocosFichaVoluntario(voluntario: VoluntarioFicha): RelatorioBloco[] {
    return [
      this.blocoComCampos(
        "Identificação do voluntário",
        2,
        [
          this.campoPreenchido("Nome completo", voluntario.nome_completo),
          this.campoPreenchido("CPF", voluntario.cpf)
        ],
        true
      ),
      this.blocoComCampos("Dados pessoais", 3, [
        this.campoPreenchido("RG", voluntario.rg),
        this.campoPreenchido("Data de nascimento", this.formatarDataComHifen(voluntario.data_nascimento)),
        this.campoPreenchido("Sexo", this.formatarValorEnumerado(voluntario.genero)),
        this.campoPreenchido("Profissão", voluntario.profissao),
        this.campoPreenchido("Status", this.formatarStatus(voluntario.status)),
        this.campoPreenchido("Profissional vinculado", voluntario.profissional_nome),
        this.campoPreenchido("Categoria profissional", voluntario.profissional_categoria),
        this.campoPreenchido("Início previsto", this.formatarDataComHifen(voluntario.inicio_previsto))
      ]),
      this.blocoComCampos("Contato", 3, [
        this.campoPreenchido("E-mail", voluntario.email),
        this.campoPreenchido("Telefone", voluntario.telefone),
        this.campoPreenchido("Cidade", voluntario.cidade),
        this.campoPreenchido("Estado", voluntario.estado),
        this.campoPreenchido("Área de interesse", voluntario.area_interesse),
        this.campoPreenchido("Idiomas", voluntario.idiomas),
        this.campoPreenchido("LinkedIn", voluntario.linkedin)
      ]),
      this.blocoComCampos("Endereço", 3, [
        this.campoPreenchido("CEP", voluntario.cep),
        this.campoPreenchido("Endereço", voluntario.logradouro),
        this.campoPreenchido("Número", voluntario.numero),
        this.campoPreenchido("Complemento", voluntario.complemento),
        this.campoPreenchido("Bairro", voluntario.bairro),
        this.campoPreenchido("Ponto de referência", voluntario.ponto_referencia),
        this.campoPreenchido("Município", voluntario.municipio),
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
          "Períodos",
          voluntario.disponibilidade_periodos?.length
            ? voluntario.disponibilidade_periodos.join(", ")
            : undefined
        ),
        this.campoPreenchido("Carga horária semanal", voluntario.carga_horaria_semanal),
        this.campoPreenchido("Presencial", this.formatarSimNao(voluntario.presencial)),
        this.campoPreenchido("Remoto", this.formatarSimNao(voluntario.remoto))
      ]),
      this.blocoComCampos("Termos e observações", 1, [
        this.campoPreenchido("Aceite voluntariado", this.formatarSimNao(voluntario.aceite_voluntariado)),
        this.campoPreenchido("Aceite imagem", this.formatarSimNao(voluntario.aceite_imagem)),
        this.campoPreenchido("Motivação", voluntario.motivacao),
        this.campoPreenchido("Habilidades", voluntario.habilidades),
        this.campoPreenchido("Observações", voluntario.observacoes),
        this.campoPreenchido("Documento de identificação", voluntario.documento_identificacao),
        this.campoPreenchido("Comprovante de endereço", voluntario.comprovante_endereco),
        this.campoPreenchido("Assinatura digital", voluntario.assinatura_digital)
      ])
    ].filter((bloco): bloco is RelatorioBloco => !!bloco);
  }

  private montarBlocosFichaLivroBiblioteca(livro: BibliotecaLivroFicha): RelatorioBloco[] {
    return [
      this.blocoComCampos(
        "Identificação do livro",
        2,
        [
          this.campoPreenchido("Código", livro.codigo),
          this.campoPreenchido("Título", livro.titulo),
          this.campoPreenchido("Autor", livro.autor),
          this.campoPreenchido("ISBN", livro.isbn)
        ],
        true
      ),
      this.blocoComCampos("Dados editoriais", 3, [
        this.campoPreenchido("Editora", livro.editora),
        this.campoPreenchido("Ano de publicação", livro.anoPublicacao),
        this.campoPreenchido("Categoria", livro.categoria),
        this.campoPreenchido("Estado do livro", livro.estadoLivro),
        this.campoPreenchido("Status", this.formatarStatus(livro.status))
      ]),
      this.blocoComCampos("Controle do acervo", 3, [
        this.campoPreenchido("Localização", livro.localizacao),
        this.campoPreenchido("Quantidade total", livro.quantidadeTotal),
        this.campoPreenchido("Quantidade disponível", livro.quantidadeDisponivel),
        this.campoPreenchido("Cadastrado em", this.formatarDataComHifen(livro.criadoEm)),
        this.campoPreenchido("Atualizado em", this.formatarDataComHifen(livro.atualizadoEm))
      ]),
      this.blocoComCampos("Observações", 1, [
        this.campoPreenchido("Observações", livro.observacoes)
      ])
    ].filter((bloco): bloco is RelatorioBloco => !!bloco);
  }

  async gerarRelacaoBeneficiarios(rawPayload: unknown, authUser?: AuthUser): Promise<RelatorioResultado> {
    const payload = beneficiarioRelacaoRequestSchema.parse(rawPayload);
    const tenantId = this.parseTenant(authUser?.tenant_id);
    const beneficiarios = await this.beneficiarioService.listar({
      nome: payload.nome,
      cpf: payload.cpf,
      codigo: payload.codigo,
      status: payload.status,
      data_nascimento: payload.dataNascimento
    }, tenantId);

    const listaOrdenada = [...beneficiarios].sort((a, b) => {
      const nomeA = (a.nome_completo || "").toLowerCase();
      const nomeB = (b.nome_completo || "").toLowerCase();
      return nomeA.localeCompare(nomeB);
    });

    const contexto = await this.montarContextoInstitucional(tenantId);
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

  async gerarFichaBeneficiario(rawPayload: unknown, authUser?: AuthUser): Promise<RelatorioResultado> {
    const payload = beneficiarioFichaRequestSchema.parse(rawPayload);
    const tenantId = this.parseTenant(authUser?.tenant_id);
    const beneficiario = await this.beneficiarioService.buscarPorId(payload.beneficiarioId, tenantId);
    const contexto = await this.montarContextoInstitucional(tenantId);

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

  async gerarRelacaoProfissionais(rawPayload: unknown, authUser?: AuthUser): Promise<RelatorioResultado> {
    const payload = profissionalRelacaoRequestSchema.parse(rawPayload);
    const profissionais = await this.profissionalService.listar({
      nome: payload.nome,
      categoria: payload.categoria,
      status: payload.status,
      cpf: payload.cpf,
      vinculo: payload.vinculo
    }, authUser?.tenant_id);

    const listaOrdenada = [...profissionais].sort((a, b) =>
      (a.nome_completo || "").toLowerCase().localeCompare((b.nome_completo || "").toLowerCase())
    );

    const contexto = await this.montarContextoInstitucional(authUser?.tenant_id);
    const relatorioInput: RelatorioHtmlInput = {
      titulo: "Relação de profissionais",
      metadadosTopo: this.montarMetadadosTopo(payload.usuarioEmissor),
      descricao: "Relação de profissionais cadastrados no sistema G3-Next.",
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

  async gerarFichaProfissional(rawPayload: unknown, authUser?: AuthUser): Promise<RelatorioResultado> {
    const payload = profissionalFichaRequestSchema.parse(rawPayload);
    const profissional = await this.profissionalService.buscarPorId(payload.profissionalId, authUser?.tenant_id);
    const contexto = await this.montarContextoInstitucional(authUser?.tenant_id);

    const relatorioInput: RelatorioHtmlInput = {
      titulo: "Ficha cadastral de profissional",
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

  async gerarRelacaoVoluntarios(rawPayload: unknown, authUser?: AuthUser): Promise<RelatorioResultado> {
    const payload = voluntarioRelacaoRequestSchema.parse(rawPayload);
    const voluntarios = await this.voluntarioService.listar({
      nome: payload.nome,
      cpf: payload.cpf,
      status: payload.status,
      email: payload.email
    }, authUser?.tenant_id);

    const listaOrdenada = [...voluntarios].sort((a, b) =>
      (a.nome_completo || "").toLowerCase().localeCompare((b.nome_completo || "").toLowerCase())
    );

    const contexto = await this.montarContextoInstitucional(authUser?.tenant_id);
    const relatorioInput: RelatorioHtmlInput = {
      titulo: "Relação de voluntários",
      metadadosTopo: this.montarMetadadosTopo(payload.usuarioEmissor),
      descricao: "Relação de voluntários cadastrados no sistema G3-Next.",
      tabela: {
        colunas: [
          { titulo: "Nome", largura: "30%" },
          { titulo: "CPF", largura: "14%" },
          { titulo: "E-mail", largura: "24%" },
          { titulo: "Profissão", largura: "16%" },
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

  async gerarRelacaoMatriculas(rawPayload: unknown, authUser?: AuthUser): Promise<RelatorioResultado> {
    const payload = matriculasRelacaoRequestSchema.parse(rawPayload);
    const tenantId = this.parseTenant(authUser?.tenant_id);
    const matriculas = await this.matriculaService.listar({
      nome: payload.nome,
      tipo: payload.tipo,
      status: payload.status,
      profissional: payload.profissional,
      beneficiario: payload.beneficiario
    }, tenantId);

    const listaOrdenada = [...matriculas].sort((a, b) =>
      (a.nome || "").toLowerCase().localeCompare((b.nome || "").toLowerCase())
    );

    const contexto = await this.montarContextoInstitucional(tenantId);
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

  async gerarListaPresencaMatricula(rawPayload: unknown, authUser?: AuthUser): Promise<RelatorioResultado> {
    const payload = matriculaListaPresencaRequestSchema.parse(rawPayload);
    const tenantId = this.parseTenant(authUser?.tenant_id);
    const matricula = await this.matriculaService.buscarPorId(payload.matriculaId, tenantId);
    const contexto = await this.montarContextoInstitucional(tenantId);
    const datasExistentes = await this.matriculaService.listarPresencaDatas(payload.matriculaId, false, tenantId);
    const datasOrdenadas = [...datasExistentes]
      .filter((data) => {
        if (payload.periodoInicio && data.data_aula < payload.periodoInicio) return false;
        if (payload.periodoFim && data.data_aula > payload.periodoFim) return false;
        if (!payload.periodoInicio && !payload.periodoFim && payload.dataAula) {
          return data.data_aula === payload.dataAula;
        }
        return true;
      })
      .sort((a, b) => a.data_aula.localeCompare(b.data_aula));

    const datasRelatorio =
      payload.periodoInicio || payload.periodoFim || payload.dataAula
        ? datasOrdenadas
        : datasExistentes.sort((a, b) => a.data_aula.localeCompare(b.data_aula));
    const participantes = [...(matricula.matriculas ?? [])]
      .filter((item) => (item.status ?? "ATIVO").trim().toUpperCase() !== "CANCELADO")
      .sort((a, b) => (a.beneficiario_nome || "").localeCompare(b.beneficiario_nome || "", "pt-BR"));
    const exibirCpf = payload.exibirCpf !== false;
    const horario =
      matricula.horario_inicial && matricula.duracao_horas
        ? `${matricula.horario_inicial} (${matricula.duracao_horas}h)`
        : matricula.horario_inicial ?? undefined;

    const presencasPorData = new Map<
      string,
      Array<{ matricula_id: string; beneficiario_nome: string; cpf?: string; status: string; observacao?: string }>
    >();
    for (const data of datasRelatorio) {
      const resultado = await this.matriculaService.listarPresencasPorData(payload.matriculaId, data.id, tenantId);
      presencasPorData.set(data.data_aula, resultado.presencas);
    }

    const datasCabecalho = datasRelatorio.map((data) => ({
      data: data.data_aula,
      titulo: this.formatarDataComHifen(data.data_aula)
    }));

    const matrizStatus = new Map<string, Map<string, string>>();
    for (const participante of participantes) {
      matrizStatus.set(participante.id_matricula_item ?? participante.beneficiario_nome, new Map());
    }

    for (const data of datasRelatorio) {
      const presencas = presencasPorData.get(data.data_aula) ?? [];
      const porMatricula = new Map(presencas.map((item) => [item.matricula_id, item]));
      for (const participante of participantes) {
        const chave = participante.id_matricula_item ?? participante.beneficiario_nome;
        const registro = participante.id_matricula_item ? porMatricula.get(participante.id_matricula_item) : undefined;
        const status = registro?.status ?? "NAO_INFORMADO";
        matrizStatus.get(chave)?.set(data.data_aula, status);
      }
    }

    const resumoParticipantes = participantes.map((participante, index) => {
      const chave = participante.id_matricula_item ?? participante.beneficiario_nome;
      const statusPorData = matrizStatus.get(chave) ?? new Map<string, string>();
      const statusList = datasRelatorio.map((data) => statusPorData.get(data.data_aula) ?? "NAO_INFORMADO");
      const totalPresencas = statusList.filter((status) => status === "PRESENTE").length;
      const totalAusencias = statusList.filter((status) => status === "AUSENTE").length;
      const totalJustificados = statusList.filter((status) => status === "JUSTIFICADO").length;
      const totalNaoInformados = statusList.filter((status) => status === "NAO_INFORMADO").length;
      const percentualFrequencia = datasRelatorio.length
        ? Math.round((totalPresencas / datasRelatorio.length) * 100)
        : 0;

      return {
        index: index + 1,
        participante,
        totalPresencas,
        totalAusencias,
        totalJustificados,
        totalNaoInformados,
        percentualFrequencia,
        statusList
      };
    });

    const totaisGerais = resumoParticipantes.reduce(
      (acc, item) => {
        acc.presencas += item.totalPresencas;
        acc.ausencias += item.totalAusencias;
        acc.justificados += item.totalJustificados;
        acc.naoInformados += item.totalNaoInformados;
        return acc;
      },
      { presencas: 0, ausencias: 0, justificados: 0, naoInformados: 0 }
    );

    const totalRegistros = datasRelatorio.length * Math.max(participantes.length, 1);
    const percentualFrequenciaGeral = totalRegistros
      ? Math.round((totaisGerais.presencas / totalRegistros) * 100)
      : 0;
    const periodoInicio = datasRelatorio[0]?.data_aula ?? payload.periodoInicio ?? payload.dataAula ?? undefined;
    const periodoFim = datasRelatorio[datasRelatorio.length - 1]?.data_aula ?? payload.periodoFim ?? payload.dataAula ?? undefined;

    const colunas = [
      { titulo: "Nº", largura: "5%" },
      { titulo: "Beneficiário", largura: "24%" },
      { titulo: "CPF", largura: exibirCpf ? "12%" : "0%", fonteTamanho: 8, fonteTamanhoCabecalho: 8 },
      { titulo: "Presenças", largura: "8%", fonteTamanho: 8, fonteTamanhoCabecalho: 8 },
      { titulo: "Ausências", largura: "8%", fonteTamanho: 8, fonteTamanhoCabecalho: 8 },
      { titulo: "Justificados", largura: "10%", fonteTamanho: 8, fonteTamanhoCabecalho: 8 },
      { titulo: "Frequência", largura: "8%", fonteTamanho: 8, fonteTamanhoCabecalho: 8 },
      ...datasCabecalho.map((data) => ({
        titulo: data.titulo,
        largura: datasCabecalho.length ? `${Math.max(4, Math.floor(23 / datasCabecalho.length))}%` : "23%",
        fonteTamanho: 8,
        fonteTamanhoCabecalho: 8,
        semQuebra: true
      }))
    ].filter((coluna) => coluna.largura !== "0%");

    const linhasTabela: string[][] = resumoParticipantes.length
      ? resumoParticipantes.map((item) => [
          String(item.index),
          item.participante.beneficiario_nome || "---",
          ...(exibirCpf ? [item.participante.cpf || "---"] : []),
          String(item.totalPresencas),
          String(item.totalAusencias),
          String(item.totalJustificados),
          `${item.percentualFrequencia}%`,
          ...item.statusList.map((status) => this.formatarStatusPresencaRelatorio(status))
        ])
      : exibirCpf
        ? [
            [
              "1",
              "Nenhum participante inscrito.",
              "---",
              "---",
              "---",
              "---",
              "---",
              ...datasRelatorio.map(() => "Não informado")
            ]
          ]
        : [
            [
              "1",
              "Nenhum participante inscrito.",
              "---",
              "---",
              "---",
              "---",
              ...datasRelatorio.map(() => "Não informado")
            ]
          ];

    const tabela: RelatorioTabela = {
      colunas,
      linhas: linhasTabela
    };

    const observacoesDatas = datasRelatorio
      .map((data) => {
        const texto = this.normalizarTexto(data.observacoes);
        return texto ? `${this.formatarDataComHifen(data.data_aula)}: ${texto}` : null;
      })
      .filter((item): item is string => !!item);

    const relatorioInput: RelatorioHtmlInput = {
      titulo: "Relatório de Acompanhamento de Frequência",
      subtitulo:
        periodoInicio && periodoFim
          ? `${this.formatarDataComHifen(periodoInicio)} a ${this.formatarDataComHifen(periodoFim)}`
          : this.formatarDataComHifen(periodoInicio ?? periodoFim),
      metadadosTopo: this.montarMetadadosTopo(payload.usuarioEmissor),
      descricao:
        "Relatório de acompanhamento de frequência com dados persistidos no PostgreSQL, sem campo de assinatura manual.",
      blocos: [
        {
          titulo: "Identificação da atividade",
          colunas: 2,
          destaque: true,
          campos: [
            this.campo("Curso, atendimento ou oficina", matricula.nome),
            this.campo("Tipo", matricula.tipo),
            this.campo("Turma", matricula.nome),
            this.campo("Status", this.formatarStatus(matricula.status)),
            this.campo("Profissional responsável", matricula.profissional),
            this.campo("Responsável pela emissão", payload.usuarioEmissor)
          ]
        },
        {
          titulo: "Resumo do período",
          colunas: 3,
          campos: [
            this.campo("Período", periodoInicio && periodoFim ? `${this.formatarDataComHifen(periodoInicio)} a ${this.formatarDataComHifen(periodoFim)}` : this.formatarDataComHifen(periodoInicio ?? periodoFim)),
            this.campo("Participantes", String(participantes.length)),
            this.campo("Datas registradas", String(datasRelatorio.length)),
            this.campo("Presenças", String(totaisGerais.presencas)),
            this.campo("Ausências", String(totaisGerais.ausencias)),
            this.campo("Justificados", String(totaisGerais.justificados)),
            this.campo("Não informados", String(totaisGerais.naoInformados)),
            this.campo("Frequência geral", `${percentualFrequenciaGeral}%`)
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
          titulo: "Legenda de status",
          conteudo: [
            "Presente: registro confirmado no banco.",
            "Ausente: ausência registrada no banco.",
            "Justificado: ausência justificada no banco.",
            "Não informado: ausência de registro para a data."
          ].join("\n")
        },
        observacoesDatas.length
          ? {
              titulo: "Observações registradas",
              conteudo: observacoesDatas.join("\n")
            }
          : null
      ].filter((secao): secao is { titulo: string; conteudo: string } => !!secao),
      cabecalho: contexto.cabecalho,
      rodape: contexto.rodape
    };

    const html = this.template.montarHtml(relatorioInput);
    const pdf = await this.renderer.render(html, contexto.rodape, relatorioInput);
    return {
      html,
      pdf,
      filename: `relatorio-acompanhamento-frequencia-matricula-${matricula.id_matricula ?? payload.matriculaId}.pdf`
    };
  }

  async gerarComprovanteMatricula(rawPayload: unknown, authUser?: AuthUser): Promise<RelatorioResultado> {
    const payload = comprovanteMatriculaRequestSchema.parse(rawPayload);
    const contexto = await this.montarContextoInstitucional(authUser?.tenant_id);

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

  async gerarComprovantePreMatriculaEspera(rawPayload: unknown, authUser?: AuthUser): Promise<RelatorioResultado> {
    const payload = comprovantePreMatriculaEsperaRequestSchema.parse(rawPayload);
    const contexto = await this.montarContextoInstitucional(authUser?.tenant_id);

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

  async gerarRelacaoRegistroDoacao(rawPayload: unknown, authUser?: AuthUser): Promise<RelatorioResultado> {
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

    const contexto = await this.montarContextoInstitucional(authUser?.tenant_id);
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

  async gerarRelacaoDoacoesRealizadas(rawPayload: unknown, authUser?: AuthUser): Promise<RelatorioResultado> {
    const payload = doacaoRealizadaRelacaoRequestSchema.parse(rawPayload);
    const doacoes = await this.doacaoRealizadaService.listar({
      beneficiario_nome: payload.beneficiario_nome,
      tipo_doacao: payload.tipo_doacao,
      situacao: payload.situacao,
      data_inicial: payload.data_inicial,
      data_final: payload.data_final
    }, authUser?.tenant_id);

    const listaOrdenada = [...doacoes].sort((a, b) => {
      const dataA = a.data_doacao || "";
      const dataB = b.data_doacao || "";
      return dataB.localeCompare(dataA);
    });

    const contexto = await this.montarContextoInstitucional(authUser?.tenant_id);
    const relatorioInput: RelatorioHtmlInput = {
      titulo: "Relação de doações realizadas",
      metadadosTopo: this.montarMetadadosTopo(payload.usuarioEmissor),
      descricao: "Relatório de doações entregues a beneficiários e famílias, no padrão visual do G3N.",
      tabela: {
        colunas: [
          { titulo: "Data", largura: "12%" },
          { titulo: "Beneficiário / família", largura: "27%" },
          { titulo: "Tipo", largura: "15%" },
          { titulo: "Situação", largura: "12%" },
          { titulo: "Responsável", largura: "18%" },
          { titulo: "Quantidade", largura: "16%" }
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
    const pdf = await this.renderizarPdfComFallback(
      html,
      contexto.rodape,
      relatorioInput,
      "relacao-doacoes-realizadas"
    );
    return { html, pdf, filename: "relacao-doacoes-realizadas.pdf" };
  }

  async gerarReciboDoacaoRealizada(rawPayload: unknown, authUser?: AuthUser): Promise<RelatorioResultado> {
    const payload = doacaoRealizadaReciboRequestSchema.parse(rawPayload);
    const doacao = await this.doacaoRealizadaService.buscarPorId(
      payload.doacaoRealizadaId,
      authUser?.tenant_id
    );
    const contexto = await this.montarContextoInstitucional(authUser?.tenant_id);
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
          { titulo: "Quant", largura: "12%" },
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
            "Recebedor:\n[[espaco:2.8]]\n_______________________________________________________________"
        }
      ],
      cabecalho: contexto.cabecalho,
      rodape: contexto.rodape
    };

    const html = this.template.montarHtml(relatorioInput);
    const pdf = await this.renderizarPdfComFallback(
      html,
      contexto.rodape,
      relatorioInput,
      "recibo-doacao-realizada"
    );
    return { html, pdf, filename: `recibo-doacao-realizada-${doacao.id_doacao_realizada}.pdf` };
  }

  async gerarFichaVoluntario(rawPayload: unknown, authUser?: AuthUser): Promise<RelatorioResultado> {
    const payload = voluntarioFichaRequestSchema.parse(rawPayload);
    const voluntario = await this.voluntarioService.buscarPorId(payload.voluntarioId, authUser?.tenant_id);
    const contexto = await this.montarContextoInstitucional(authUser?.tenant_id);

    const relatorioInput: RelatorioHtmlInput = {
      titulo: "Ficha cadastral de voluntário",
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

  async gerarTermoVoluntariado(rawPayload: unknown, authUser?: AuthUser): Promise<RelatorioResultado> {
    const payload = voluntarioFichaRequestSchema.parse(rawPayload);
    const voluntario = await this.voluntarioService.buscarPorId(payload.voluntarioId, authUser?.tenant_id);
    const contexto = await this.montarContextoInstitucional(authUser?.tenant_id);
    const nomeVoluntario = this.normalizarTexto(voluntario.nome_completo) ?? "voluntário(a) não informado(a)";
    const nomeInstituicao = this.normalizarTexto(contexto.cabecalho.razaoSocial) ?? "instituição não informada";
    const dataRegistro = this.formatarDataComHifen(voluntario.data_cadastro);
    const instituicao = await this.repository.obterInstituicaoRelatorio(authUser?.tenant_id);
    const localInstituicao =
      [this.normalizarTexto(instituicao.cidade), this.normalizarTexto(instituicao.uf)].filter(Boolean).join(" / ") ||
      this.normalizarTexto(instituicao.enderecoCompleto) ||
      "Local não informado";
    const enderecoInstituicao = this.normalizarTexto(instituicao.enderecoCompleto) ?? "Endereço institucional não informado";
    const modalidade = [
      voluntario.presencial ? "Presencial" : undefined,
      voluntario.remoto ? "Remoto" : undefined
    ].filter(Boolean).join(" e ");
    const disponibilidade = [
      voluntario.disponibilidade_dias?.length ? `Dias: ${voluntario.disponibilidade_dias.join(", ")}` : undefined,
      voluntario.disponibilidade_periodos?.length
        ? `Períodos: ${voluntario.disponibilidade_periodos.join(", ")}`
        : undefined,
      this.normalizarTexto(voluntario.carga_horaria_semanal)
        ? `Carga horária semanal: ${voluntario.carga_horaria_semanal}`
        : undefined
    ].filter(Boolean).join(" | ");

    const relatorioInput: RelatorioHtmlInput = {
      titulo: "Termo de voluntariado",
      metadadosTopo: this.montarMetadadosTopo(payload.usuarioEmissor),
      descricao:
        "Termo emitido a partir do cadastro de voluntariado, conforme dados registrados no sistema G3-Next.",
      blocos: [
        {
          titulo: "Identificação do voluntário",
          colunas: 2,
          destaque: true,
          campos: [
            this.campo("Nome completo", voluntario.nome_completo),
            this.campo("CPF", voluntario.cpf),
            this.campo("Data de nascimento", this.formatarDataComHifen(voluntario.data_nascimento)),
            this.campo("Sexo", this.formatarValorEnumerado(voluntario.genero)),
            this.campo("E-mail", voluntario.email),
            this.campo("Telefone", voluntario.telefone)
          ]
        },
        {
          titulo: "Atividade voluntária",
          colunas: 3,
          campos: [
            this.campo("Área de interesse", voluntario.area_interesse),
            this.campo("Profissão", voluntario.profissao),
            this.campo("Modalidade", modalidade || "---"),
            this.campo("Início previsto", this.formatarDataComHifen(voluntario.inicio_previsto)),
            this.campo("Disponibilidade", disponibilidade || "---"),
            this.campo("Aceite de uso de imagem", this.formatarSimNao(voluntario.aceite_imagem))
          ]
        }
      ],
      secoes: [
        {
          titulo: "Declaração",
          conteudo: [
            `Pelo presente termo, o voluntário ${nomeVoluntario} declara, de forma livre, expressa e consciente, sua adesão ao serviço voluntário a ser prestado à ${nomeInstituicao}, nos termos da Lei nº 9.608/1998, reconhecendo que a atividade possui natureza cívica, assistencial, educacional, cultural, recreativa ou de apoio institucional, conforme a finalidade social da entidade.`,
            "O serviço voluntário será executado sem remuneração, contraprestação econômica, habitualidade laboral subordinada ou expectativa de vínculo empregatício, funcional, previdenciário, estatutário ou de natureza semelhante. A atuação ocorrerá dentro dos limites das atividades previamente ajustadas, observada a disponibilidade cadastrada, as normas internas da instituição, a boa-fé objetiva, a urbanidade e a proteção das pessoas atendidas.",
            `O voluntário ${nomeVoluntario} declara estar ciente de que eventual ressarcimento de despesas somente poderá ocorrer quando a despesa for necessária à atividade voluntária, previamente autorizada pela instituição e devidamente comprovada, não caracterizando salário, ajuda de custo permanente, vantagem econômica ou remuneração indireta.`
          ].join("\n")
        },
        {
          titulo: "Responsabilidades",
          conteudo: [
            `O voluntário ${nomeVoluntario} compromete-se a desempenhar as atividades com zelo, diligência, assiduidade compatível com a disponibilidade informada, respeito à dignidade humana, observância das orientações técnicas e administrativas e cumprimento das políticas internas aplicáveis, inclusive regras de segurança, proteção de dados, sigilo, uso de imagem e conduta ética.`,
            `O voluntário ${nomeVoluntario} obriga-se a preservar informações pessoais, sociais, familiares, financeiras, de saúde ou quaisquer outros dados sensíveis a que tiver acesso em razão da atividade voluntária, abstendo-se de divulgar, compartilhar, copiar ou utilizar tais informações para finalidade diversa da atuação autorizada pela ${nomeInstituicao}.`,
            `A ${nomeInstituicao} compromete-se a orientar o voluntário quanto às atividades, registrar sua participação quando aplicável, indicar responsáveis de referência, disponibilizar informações necessárias à execução segura do serviço e comunicar mudanças relevantes de escala, local, atividade ou regra operacional.`
          ].join("\n")
        },
        {
          titulo: "Vigência e desligamento",
          conteudo: [
            `Este termo passa a vigorar a partir da data de registro indicada neste documento e permanecerá válido enquanto houver atividade voluntária ativa ou até manifestação de encerramento por qualquer das partes. A continuidade da atuação dependerá da necessidade institucional, da disponibilidade do voluntário ${nomeVoluntario} e da compatibilidade com as normas internas da ${nomeInstituicao}.`,
            "O desligamento poderá ocorrer a qualquer tempo, por iniciativa do voluntário ou da instituição, sem ônus, multa ou indenização, mediante comunicação simples. A instituição poderá suspender ou encerrar a participação quando houver descumprimento de normas internas, quebra de sigilo, conduta incompatível com os objetivos institucionais, risco às pessoas atendidas ou inexistência temporária de atividade compatível.",
            "O encerramento do termo não afasta o dever de confidencialidade sobre informações conhecidas durante a atuação voluntária, nem prejudica a guarda dos registros administrativos necessários à comprovação da atividade, auditoria interna, prestação de contas e cumprimento de obrigações legais."
          ].join("\n")
        },
        {
          titulo: "Assinaturas",
          conteudo: [
            `Local e data: ${localInstituicao}, ${dataRegistro}`,
            `Endereço da instituição: ${enderecoInstituicao}`,
            "[[espaco:3.8]]",
            "_______________________________________________________________",
            `Voluntário(a): ${nomeVoluntario}`,
            `CPF: ${this.normalizarTexto(voluntario.cpf) ?? "Não informado"}`,
            "[[espaco:4.4]]",
            "_______________________________________________________________",
            "Representante da instituição",
            `Instituição: ${nomeInstituicao}`
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
      filename: `termo-voluntariado-${voluntario.id_voluntario ?? payload.voluntarioId}.pdf`
    };
  }

  async gerarRelacaoLivrosBiblioteca(rawPayload: unknown, authUser?: AuthUser): Promise<RelatorioResultado> {
    const payload = bibliotecaLivroRelacaoRequestSchema.parse(rawPayload);
    const tenantId = this.parseTenant(authUser?.tenant_id);
    const termo = payload.termo?.toLocaleLowerCase("pt-BR");
    const livros = (await this.bibliotecaService.listarLivros(tenantId))
      .filter((livro) => {
        if (!termo) return true;
        return [livro.codigo, livro.titulo, livro.autor, livro.isbn, livro.categoria]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase("pt-BR")
          .includes(termo);
      })
      .sort((a, b) => a.titulo.localeCompare(b.titulo, "pt-BR"));
    const contexto = await this.montarContextoInstitucional(tenantId);
    const relatorioInput: RelatorioHtmlInput = {
      titulo: "Relação do acervo da biblioteca",
      metadadosTopo: this.montarMetadadosTopo(payload.usuarioEmissor),
      descricao: "Relação de livros cadastrados no acervo da biblioteca.",
      tabela: {
        colunas: [
          { titulo: "Código", largura: "11%" },
          { titulo: "Título", largura: "27%" },
          { titulo: "Autor", largura: "22%" },
          { titulo: "Categoria", largura: "17%" },
          { titulo: "Disponíveis", largura: "12%" },
          { titulo: "Status", largura: "11%" }
        ],
        linhas: livros.map((livro) => [
          livro.codigo || "---",
          livro.titulo || "---",
          livro.autor || "---",
          livro.categoria || "---",
          String(livro.quantidadeDisponivel),
          this.formatarStatus(livro.status)
        ])
      },
      cabecalho: contexto.cabecalho,
      rodape: contexto.rodape
    };

    const html = this.template.montarHtml(relatorioInput);
    const pdf = await this.renderer.render(html, contexto.rodape, relatorioInput);
    return { html, pdf, filename: "relacao-acervo-biblioteca.pdf" };
  }

  async gerarFichaLivroBiblioteca(rawPayload: unknown, authUser?: AuthUser): Promise<RelatorioResultado> {
    const payload = bibliotecaLivroFichaRequestSchema.parse(rawPayload);
    const tenantId = this.parseTenant(authUser?.tenant_id);
    const livro = (await this.bibliotecaService.listarLivros(tenantId)).find((item) => item.id === payload.livroId);
    if (!livro) {
      throw new AppError("Livro nao encontrado.", 404);
    }

    const contexto = await this.montarContextoInstitucional(tenantId);
    const relatorioInput: RelatorioHtmlInput = {
      titulo: "Cadastro do livro",
      metadadosTopo: this.montarMetadadosTopo(payload.usuarioEmissor),
      fotoUrl: livro.capaUrl,
      fotoAjuste: "contain",
      blocos: this.montarBlocosFichaLivroBiblioteca(livro),
      cabecalho: contexto.cabecalho,
      rodape: contexto.rodape
    };

    const html = this.template.montarHtml(relatorioInput);
    const pdf = await this.renderer.render(html, contexto.rodape, relatorioInput);
    return { html, pdf, filename: "cadastro-livro-biblioteca.pdf" };
  }

  async gerarRelacaoEmprestimosBiblioteca(rawPayload: unknown, authUser?: AuthUser): Promise<RelatorioResultado> {
    const payload = bibliotecaEmprestimoRelacaoRequestSchema.parse(rawPayload);
    const tenantId = this.parseTenant(authUser?.tenant_id);
    const termo = payload.termo?.toLocaleLowerCase("pt-BR");
    const emprestimos = (await this.bibliotecaService.listarEmprestimos(tenantId)).filter((item) => {
      if (!termo) return true;
      return [item.livroTitulo, item.livroCodigo, item.beneficiarioNome, item.responsavelNome]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("pt-BR")
        .includes(termo);
    });
    const contexto = await this.montarContextoInstitucional(tenantId);
    const relatorioInput: RelatorioHtmlInput = {
      titulo: "Relação de empréstimos da biblioteca",
      metadadosTopo: this.montarMetadadosTopo(payload.usuarioEmissor),
      descricao: "Relação de movimentações de empréstimo registradas na biblioteca.",
      tabela: {
        colunas: [
          { titulo: "Livro", largura: "25%" },
          { titulo: "Beneficiário", largura: "23%" },
          { titulo: "Empréstimo", largura: "15%" },
          { titulo: "Devolução prevista", largura: "20%" },
          { titulo: "Status", largura: "17%" }
        ],
        linhas: emprestimos.map((item) => [
          item.livroTitulo || "---",
          item.beneficiarioNome || "---",
          this.formatarDataComHifen(item.dataEmprestimo),
          this.formatarDataComHifen(item.dataDevolucaoPrevista),
          this.formatarStatus(item.status)
        ])
      },
      cabecalho: contexto.cabecalho,
      rodape: contexto.rodape
    };

    const html = this.template.montarHtml(relatorioInput);
    const pdf = await this.renderer.render(html, contexto.rodape, relatorioInput);
    return { html, pdf, filename: "relacao-emprestimos-biblioteca.pdf" };
  }

  async gerarDevolucoesPendentesBiblioteca(rawPayload: unknown, authUser?: AuthUser): Promise<RelatorioResultado> {
    const payload = bibliotecaRelatorioRequestSchema.parse(rawPayload);
    const tenantId = this.parseTenant(authUser?.tenant_id);
    const emprestimos = (await this.bibliotecaService.listarEmprestimos(tenantId)).filter(
      (item) => item.status === "ATIVO" || item.status === "ATRASADO"
    );
    const contexto = await this.montarContextoInstitucional(tenantId);
    const relatorioInput: RelatorioHtmlInput = {
      titulo: "Devoluções pendentes da biblioteca",
      metadadosTopo: this.montarMetadadosTopo(payload.usuarioEmissor),
      descricao: "Relação de empréstimos que aguardam devolução.",
      tabela: {
        colunas: [
          { titulo: "Livro", largura: "30%" },
          { titulo: "Beneficiário", largura: "30%" },
          { titulo: "Data prevista", largura: "20%" },
          { titulo: "Status", largura: "20%" }
        ],
        linhas: emprestimos.map((item) => [
          item.livroTitulo || "---",
          item.beneficiarioNome || "---",
          this.formatarDataComHifen(item.dataDevolucaoPrevista),
          this.formatarStatus(item.status)
        ])
      },
      cabecalho: contexto.cabecalho,
      rodape: contexto.rodape
    };

    const html = this.template.montarHtml(relatorioInput);
    const pdf = await this.renderer.render(html, contexto.rodape, relatorioInput);
    return { html, pdf, filename: "devolucoes-pendentes-biblioteca.pdf" };
  }

  async gerarLivrosDisponiveisBiblioteca(rawPayload: unknown, authUser?: AuthUser): Promise<RelatorioResultado> {
    const payload = bibliotecaRelatorioRequestSchema.parse(rawPayload);
    const tenantId = this.parseTenant(authUser?.tenant_id);
    const livros = (await this.bibliotecaService.listarLivros(tenantId)).filter(
      (item) => item.status === "ATIVO" && item.quantidadeDisponivel > 0
    );
    const contexto = await this.montarContextoInstitucional(tenantId);
    const relatorioInput: RelatorioHtmlInput = {
      titulo: "Livros disponíveis na biblioteca",
      metadadosTopo: this.montarMetadadosTopo(payload.usuarioEmissor),
      descricao: "Relação de livros disponíveis para novos empréstimos.",
      tabela: {
        colunas: [
          { titulo: "Código", largura: "16%" },
          { titulo: "Título", largura: "35%" },
          { titulo: "Autor", largura: "31%" },
          { titulo: "Disponíveis", largura: "18%" }
        ],
        linhas: livros.map((item) => [
          item.codigo || "---",
          item.titulo || "---",
          item.autor || "---",
          String(item.quantidadeDisponivel)
        ])
      },
      cabecalho: contexto.cabecalho,
      rodape: contexto.rodape
    };

    const html = this.template.montarHtml(relatorioInput);
    const pdf = await this.renderer.render(html, contexto.rodape, relatorioInput);
    return { html, pdf, filename: "livros-disponiveis-biblioteca.pdf" };
  }

  async gerarAlertasBiblioteca(rawPayload: unknown, authUser?: AuthUser): Promise<RelatorioResultado> {
    const payload = bibliotecaRelatorioRequestSchema.parse(rawPayload);
    const tenantId = this.parseTenant(authUser?.tenant_id);
    const alertas = await this.bibliotecaService.listarAlertas(tenantId);
    const contexto = await this.montarContextoInstitucional(tenantId);
    const relatorioInput: RelatorioHtmlInput = {
      titulo: "Alertas de devolução da biblioteca",
      metadadosTopo: this.montarMetadadosTopo(payload.usuarioEmissor),
      descricao: "Acompanhamento dos prazos de devolução de livros.",
      tabela: {
        colunas: [
          { titulo: "Livro", largura: "30%" },
          { titulo: "Beneficiário", largura: "25%" },
          { titulo: "Data prevista", largura: "19%" },
          { titulo: "Dias", largura: "10%" },
          { titulo: "Status", largura: "16%" }
        ],
        linhas: alertas.map((item) => [
          item.livroTitulo || "---",
          item.beneficiarioNome || "---",
          this.formatarDataComHifen(item.dataDevolucaoPrevista),
          String(item.diasParaVencimento),
          this.formatarStatus(item.status)
        ])
      },
      cabecalho: contexto.cabecalho,
      rodape: contexto.rodape
    };

    const html = this.template.montarHtml(relatorioInput);
    const pdf = await this.renderer.render(html, contexto.rodape, relatorioInput);
    return { html, pdf, filename: "alertas-devolucao-biblioteca.pdf" };
  }

  async gerarPainelBiblioteca(rawPayload: unknown, authUser?: AuthUser): Promise<RelatorioResultado> {
    const payload = bibliotecaRelatorioRequestSchema.parse(rawPayload);
    const tenantId = this.parseTenant(authUser?.tenant_id);
    const [livros, emprestimos, alertas] = await Promise.all([
      this.bibliotecaService.listarLivros(tenantId),
      this.bibliotecaService.listarEmprestimos(tenantId),
      this.bibliotecaService.listarAlertas(tenantId)
    ]);
    const totalExemplares = livros.reduce((total, item) => total + item.quantidadeTotal, 0);
    const disponiveis = livros.reduce((total, item) => total + item.quantidadeDisponivel, 0);
    const contexto = await this.montarContextoInstitucional(tenantId);
    const relatorioInput: RelatorioHtmlInput = {
      titulo: "Painel da biblioteca",
      metadadosTopo: this.montarMetadadosTopo(payload.usuarioEmissor),
      descricao: "Resumo operacional do acervo e dos empréstimos.",
      tabela: {
        colunas: [
          { titulo: "Indicador", largura: "70%" },
          { titulo: "Valor", largura: "30%" }
        ],
        linhas: [
          ["Títulos cadastrados", String(livros.length)],
          ["Exemplares", String(totalExemplares)],
          ["Exemplares disponíveis", String(disponiveis)],
          ["Empréstimos ativos", String(emprestimos.filter((item) => item.status === "ATIVO").length)],
          ["Empréstimos atrasados", String(emprestimos.filter((item) => item.status === "ATRASADO").length)],
          ["Alertas", String(alertas.length)]
        ]
      },
      cabecalho: contexto.cabecalho,
      rodape: contexto.rodape
    };

    const html = this.template.montarHtml(relatorioInput);
    const pdf = await this.renderer.render(html, contexto.rodape, relatorioInput);
    return { html, pdf, filename: "painel-biblioteca.pdf" };
  }

  async gerarTermoAutorizacao(rawPayload: unknown, authUser?: AuthUser): Promise<RelatorioResultado> {
    const payload = termoAutorizacaoRequestSchema.parse(rawPayload);
    const contexto = await this.montarContextoInstitucional(authUser?.tenant_id);

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
  async gerarRelacaoUnidadesAssistenciais(rawPayload: unknown, authUser?: AuthUser): Promise<RelatorioResultado> {
    const payload = unidadeAssistencialRelacaoRequestSchema.parse(rawPayload);
    const tenantId = this.parseTenant(authUser?.tenant_id);
    const unidades = await this.unidadeAssistencialService.listar({
      nome_fantasia: payload.nome_fantasia,
      cnpj: payload.cnpj,
      cidade: payload.cidade,
      unidade_principal: payload.unidade_principal
    }, tenantId);

    const listaOrdenada = [...unidades].sort((a, b) => {
      const nomeA = (a.nome_fantasia || "").toLowerCase();
      const nomeB = (b.nome_fantasia || "").toLowerCase();
      return nomeA.localeCompare(nomeB);
    });

    const contexto = await this.montarContextoInstitucional(tenantId);
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
    const tenantId = this.parseTenant(authUser?.tenant_id);
    const usuarioIdRelatorio = authUser?.id ?? payload.usuario_id;
    if (!usuarioIdRelatorio) {
      throw new AppError("Informe o funcionario para gerar o espelho de ponto.", 400);
    }

    const ator = {
      id: BigInt(usuarioIdRelatorio),
      nomeUsuario: authUser?.nomeUsuario || payload.usuarioEmissor || "Sistema G3-Next",
      tenant_id: tenantId,
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
    const periodoEspelho = espelhoData.periodo;
    const nomeColaborador = registros[0]?.usuario_nome || "Colaborador não informado";
    const descricaoPeriodo = this.formatarPeriodoCurso(
      periodoEspelho?.data_inicial ?? payload.data_inicial,
      periodoEspelho?.data_final ?? payload.data_final
    );
    const statusPeriodo = periodoEspelho?.fechado ? "Período fechado" : "Período em aberto";
    const legendaEspelho = [
      "Falta: Ausência do colaborador sem justificativa.",
      "Atraso ou Saída Antecipada: Marcações fora do horário contratual.",
      "Hora Extra: Horas trabalhadas que excedem a jornada diária.",
      "Abono ou Justificativa: Dias em que a ausência foi respaldada (Ex: atestado médico).",
      "Afastamento: Suspensão temporária do contrato (Ex: licença-maternidade ou auxílio-doença).",
      "Esquecimento: Marcações inseridas manualmente após aprovação do gestor."
    ].join("\n");
    const colunaSemQuebra = {
      classe: "coluna-compacta",
      semQuebra: true,
      fonteTamanho: 7,
      fonteTamanhoCabecalho: 7
    };
    const colunaOcorrencia = {
      classe: "coluna-ocorrencia",
      fonteTamanho: 6.5,
      fonteTamanhoCabecalho: 7
    };
    const rotuloOcorrencia = (valor: string) => {
      const normalizado = valor.trim().toUpperCase();
      if (normalizado === "ATRASO") return "Atraso";
      if (normalizado === "FALTA") return "Falta";
      if (normalizado === "HORA_EXTRA") return "Hora extra";
      if (normalizado === "BANCO_HORAS") return "Banco de horas";
      if (normalizado === "ESQUECIMENTO_BATIDA") return "Esquecimento";
      if (normalizado === "INCONSISTENCIA_SEQUENCIA") return "Inconsistência";
      if (normalizado === "CORRECAO_ADMINISTRATIVA") return "Correção";
      if (normalizado === "AJUSTE_MANUAL") return "Ajuste manual";
      if (normalizado === "OBSERVACAO_OPERACIONAL") return "Observação";
      return valor.replace(/_/g, " ");
    };

    const compactarDescricaoOcorrencia = (descricao: string) => {
      const texto = descricao.trim().replace(/\s+/g, " ").replace(/[.]+$/g, "");
      if (/^Lançado com atraso em /i.test(texto)) return texto.replace(/^Lançado com atraso em /i, "Atraso em ");
      if (/^Lançado como hora extra em /i.test(texto)) return texto.replace(/^Lançado como hora extra em /i, "Hora extra em ");
      if (/^Banco de horas com saldo de /i.test(texto)) return texto;
      if (/^Saldo de falta de /i.test(texto)) return texto.replace(/^Saldo de falta de /i, "Falta de ");
      if (/^Horas extras pendentes de autorizacao:/i.test(texto)) {
        return texto.replace(/^Horas extras pendentes de autorizacao:/i, "Horas extras pendentes:");
      }
      if (/^Sequencia de horarios inconsistente/i.test(texto)) return "Sequência de horários inconsistente";
      if (/^Existem batidas pendentes para fechamento completo do dia/i.test(texto)) return "Esquecimento de batida";
      return texto;
    };

    const renderizarOcorrenciasTexto = (item: {
      ocorrencias?: string[];
      ocorrencias_descricao?: string[];
      entrada_1?: string;
      saida_1?: string;
      entrada_2?: string;
      saida_2?: string;
      status?: string;
    }) => {
      const descricoes = (item.ocorrencias_descricao ?? []).map(compactarDescricaoOcorrencia).filter(Boolean);
      if (descricoes.length) {
        return descricoes.join(" | ");
      }

      const ocorrencias = (item.ocorrencias ?? []).filter(Boolean);
      const jornadaCompleta = !!item.entrada_1 && !!item.saida_1 && !!item.entrada_2 && !!item.saida_2;
      if (!ocorrencias.length) {
        return jornadaCompleta && item.status === "COMPLETO" ? "Lançado corretamente" : "Sem ocorrência registrada";
      }

      return ocorrencias
        .map((ocorrencia) => rotuloOcorrencia(ocorrencia))
        .join(" | ");
    };
    const totalDiasPeriodo = Number(totais?.total_dias ?? 0);
    const totalTrabalhadoPeriodo = Number(totais?.total_trabalhado_minutos ?? 0);
    const mediaDiariaPeriodo = totalDiasPeriodo > 0 ? Math.round(totalTrabalhadoPeriodo / totalDiasPeriodo) : undefined;
    const mediaSemanalPeriodo =
      typeof mediaDiariaPeriodo === "number" ? Math.round(mediaDiariaPeriodo * 7) : undefined;
    const mediaMensalPeriodo =
      typeof mediaDiariaPeriodo === "number" ? Math.round(mediaDiariaPeriodo * 30) : undefined;

    const contexto = await this.montarContextoInstitucional(tenantId);
    const relatorioInput: RelatorioHtmlInput = {
      titulo: "Espelho de ponto individual",
      metadadosTopo: [
        ...this.montarMetadadosTopo(payload.usuarioEmissor),
        ...(descricaoPeriodo
          ? [
              { rotulo: "Período", valor: `${descricaoPeriodo} - ${statusPeriodo}` }
            ]
          : [])
      ],
      descricao: "Relatório detalhado de marcações de ponto e apuração de horas.",
      secoes: [
        {
          titulo: "Legenda de ocorrências",
          conteudo: legendaEspelho
        },
        {
          titulo: "Como ler o resumo",
          conteudo:
            "Faltas representam o tempo ainda não cumprido nos dias fechados do período. As médias abaixo são normalizadas a partir da jornada total trabalhada."
        }
      ],
      blocos: [
        {
          titulo: "Colaborador",
          colunas: 1,
          destaque: true,
          campos: [this.campo("Nome", nomeColaborador)]
        },
        {
          titulo: "Resumo do período",
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
        },
        {
          titulo: "Médias de jornada",
          colunas: 3,
          destaque: true,
          campos: [
            this.campo("Média por dia", this.formatarMinutosRelatorio(mediaDiariaPeriodo)),
            this.campo("Média por semana", this.formatarMinutosRelatorio(mediaSemanalPeriodo)),
            this.campo("Média por mês", this.formatarMinutosRelatorio(mediaMensalPeriodo))
          ]
        }
      ],
      tabela: {
        colunas: [
          { titulo: "Data", largura: "12%", ...colunaSemQuebra },
          { titulo: "E1", largura: "5.5%", ...colunaSemQuebra },
          { titulo: "S1", largura: "5.5%", ...colunaSemQuebra },
          { titulo: "E2", largura: "5.5%", ...colunaSemQuebra },
          { titulo: "S2", largura: "5.5%", ...colunaSemQuebra },
          { titulo: "Extra", largura: "8%", ...colunaSemQuebra },
          { titulo: "Banco", largura: "8%", ...colunaSemQuebra },
          { titulo: "Atraso", largura: "7.5%", ...colunaSemQuebra },
          { titulo: "Falta", largura: "7.5%", ...colunaSemQuebra },
          { titulo: "Ocorrência", largura: "35%", ...colunaOcorrencia }
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
          { valor: renderizarOcorrenciasTexto(item), classe: "coluna-ocorrencia" }
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
