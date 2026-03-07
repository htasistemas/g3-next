import { BeneficiarioService } from "../../beneficiarios/services/beneficiario.service.js";
import { ProfissionalService } from "../../profissionais/services/profissional.service.js";
import { UnidadeAssistencialService } from "../../unidades-assistenciais/services/unidade-assistencial.service.js";
import { VoluntarioService } from "../../voluntarios/services/voluntario.service.js";
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
  profissionalFichaRequestSchema,
  profissionalRelacaoRequestSchema,
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
  private readonly unidadeAssistencialService = new UnidadeAssistencialService();
  private readonly voluntarioService = new VoluntarioService();
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

  private formatarDataHora(valor?: string): string {
    const texto = this.normalizarTexto(valor);
    if (!texto) return "---";

    const data = new Date(texto);
    if (Number.isNaN(data.getTime())) return texto;

    return this.dateTimeFormatter.format(data);
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

    const textoTermo = [
      `Pelo presente instrumento, eu, ${nomeBeneficiario}, portador(a) do documento de identidade RG nº ${rgBeneficiario} e CPF nº ${cpfBeneficiario}, residente e domiciliado(a) na ${enderecoBeneficiario}, na cidade de ${cidadeUfBeneficiario} (ou o responsável legal, se aplicável), doravante denominado(a) TITULAR, declaro que consinto, de forma livre, informada e inequívoca, com o tratamento dos meus dados pessoais e com o uso da minha imagem pela instituição ${nomeInstituicao}, inscrita no CNPJ sob o nº ${cnpjInstituicao}, doravante denominada CONTROLADOR(A).`,
      "",
      "DA FINALIDADE DO TRATAMENTO E USO",
      `Tratamento de Dados Pessoais: ${payload.finalidadeDados || "Coleta, armazenamento e processamento de dados (como nome, CPF, endereço, renda, composição familiar e informações de saúde, se pertinentes) para fins de cadastro, análise de elegibilidade para programas sociais, acompanhamento familiar e emissão de relatórios a órgãos públicos."}`,
      `Uso de Imagem: ${payload.finalidadeImagem || "Utilização de imagem, voz e/ou depoimento (em fotos, vídeos e áudios) para fins de divulgação institucional, prestação de contas a parceiros, campanhas de conscientização e publicações em canais oficiais."}`,
      "",
      "DA FORMA DE DIVULGAÇÃO (PARA USO DE IMAGEM)",
      "A autorização para uso de imagem abrange a divulgação em todo território nacional e, se necessário, no exterior, por meio de mídias impressas (cartazes, folders e relatórios) e digitais (website, e-mail marketing e redes sociais), sem finalidade comercial.",
      "",
      "DA GRATUIDADE E VIGÊNCIA",
      "A presente autorização é concedida a título gratuito (sem qualquer remuneração) e por prazo indeterminado.",
      "",
      "DOS DIREITOS DO TITULAR",
      `Estou ciente de que a Lei nº 13.709/2018 (LGPD) garante direitos como acesso aos dados, correção, anonimização, bloqueio ou eliminação de dados desnecessários ou excessivos. A qualquer momento, posso revogar este consentimento, mediante manifestação expressa, por escrito, junto à instituição ${nomeInstituicao}.`,
      "",
      "DA SEGURANÇA E RESPONSABILIDADES",
      "O(A) CONTROLADOR(A) se compromete a adotar medidas de segurança, técnicas e administrativas, aptas a proteger os dados pessoais e a imagem de acessos não autorizados e de situações acidentais ou ilícitas de destruição, perda, alteração, comunicação ou difusão.",
      "",
      "Por estar de acordo com os termos e condições acima, firmo o presente documento."
    ].join("\n");

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
            this.campo("Data da assinatura", payload.dataAssinatura),
            this.campo("Responsável legal", payload.responsavelNome),
            this.campo("CPF do responsável", payload.responsavelCpf),
            this.campo("Relação com o beneficiário", payload.responsavelRelacao),
            this.campo("Representante institucional", payload.representanteNome),
            this.campo("Cargo do representante", payload.representanteCargo)
          ]
        }
      ],
      secoes: [
        {
          titulo: "Termo de consentimento",
          conteudo: textoTermo
        }
      ],
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
}
