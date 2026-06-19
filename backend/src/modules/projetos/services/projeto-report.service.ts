import { AppError } from "../../../shared/errors/app-error.js";
import { ReportsRepository } from "../../reports/repositories/reports.repository.js";
import {
  type RelatorioBloco,
  type RelatorioHtmlInput,
  RelatorioTemplatePadrao
} from "../../reports/templates/relatorio-template-padrao.js";
import { HtmlPdfRenderer } from "../../reports/services/html-pdf-renderer.js";
import {
  formatProjetoAreaLabel,
  formatProjetoPrioridadeLabel,
  formatProjetoStatusLabel,
  formatProjetoTarefaTipoLabel
} from "../projeto.mapper.js";
import { projetoRelatorioSchema } from "../projeto.schema.js";
import { ProjetoRepository } from "../repositories/projeto.repository.js";

type AuthUser = {
  nome?: string;
  nomeUsuario?: string;
  tenant_id?: string;
};

export class ProjetoReportService {
  private readonly repository = new ProjetoRepository();
  private readonly reportsRepository = new ReportsRepository();
  private readonly template = new RelatorioTemplatePadrao();
  private readonly renderer = new HtmlPdfRenderer();

  async gerar(tipo: string, rawFilters: unknown, authUser?: AuthUser) {
    const tenantId = this.parseTenant(authUser?.tenant_id);
    const filters = projetoRelatorioSchema.parse(rawFilters ?? {});
    const contexto = await this.montarContextoInstitucional(tenantId);

    switch (tipo) {
      case "geral":
      case "status":
      case "prioridade":
      case "atrasados":
      case "evolucao":
      case "tarefas-responsavel":
        return this.gerarRelatorioLista(tipo, filters, tenantId, contexto, authUser);
      case "individual":
        return this.gerarRelatorioIndividual(filters.projeto_id, tenantId, contexto, authUser);
      default:
        throw new AppError("Tipo de relatório de projetos inválido.", 400);
    }
  }

  private async gerarRelatorioLista(
    tipo: string,
    filters: Record<string, unknown>,
    tenantId: string,
    contexto: Awaited<ReturnType<ProjetoReportService["montarContextoInstitucional"]>>,
    authUser?: AuthUser
  ) {
    const lista = await this.repository.listar(filters, tenantId);
    const linhas = lista
      .filter((item) => {
        if (tipo === "status") return true;
        if (tipo === "prioridade") return true;
        if (tipo === "atrasados") {
          return item.projeto.status !== "CONCLUIDO" && this.isAtrasado(item.projeto.prazo_previsto);
        }
        return true;
      })
      .map((item) => [
        item.projeto.nome,
        formatProjetoStatusLabel(item.projeto.status),
        formatProjetoPrioridadeLabel(item.projeto.prioridade),
        formatProjetoAreaLabel(item.projeto.area_projeto),
        item.projeto.responsavel,
        item.projeto.data_inicio.toISOString().slice(0, 10).split("-").reverse().join("-"),
        item.projeto.prazo_previsto.toISOString().slice(0, 10).split("-").reverse().join("-"),
        `${Number(item.projeto.percentual_evolucao ?? 0)}%`
      ]);

    const tituloMap: Record<string, string> = {
      geral: "Relatório geral de projetos",
      status: "Relatório de projetos por status",
      prioridade: "Relatório de projetos por prioridade",
      atrasados: "Relatório de projetos atrasados",
      evolucao: "Relatório de evolução dos projetos",
      "tarefas-responsavel": "Relatório de tarefas por responsável"
    };

    if (tipo === "tarefas-responsavel") {
      const tarefas = lista.flatMap((item) => item.tarefas);
      const tabela: RelatorioHtmlInput = {
        titulo: tituloMap[tipo],
        subtitulo: "Administração e gestão > Projetos",
        descricao: "Distribuição de tarefas por responsável com filtros aplicados.",
        metadadosTopo: [
          { rotulo: "Emitido por", valor: authUser?.nome ?? authUser?.nomeUsuario ?? "Sistema" }
        ],
        tabela: {
          colunas: [
            { titulo: "Projeto", largura: "22%" },
            { titulo: "Tarefa", largura: "24%" },
            { titulo: "Responsável", largura: "18%" },
            { titulo: "Tipo", largura: "14%" },
            { titulo: "Status", largura: "12%" },
            { titulo: "Prazo", largura: "10%" }
          ],
          linhas: tarefas.map((tarefa) => [
            lista.find((item) => item.projeto.id === tarefa.projeto_id)?.projeto.nome ?? "---",
            tarefa.titulo,
            tarefa.responsavel,
            formatProjetoTarefaTipoLabel(tarefa.tipo_tarefa),
            formatProjetoStatusLabel(tarefa.status),
            tarefa.data_prevista
              ? tarefa.data_prevista.toISOString().slice(0, 10).split("-").reverse().join("-")
              : "---"
          ])
        },
        cabecalho: contexto.cabecalho,
        rodape: contexto.rodape
      };
      return this.render(tabela, "projetos-tarefas-por-responsavel.pdf");
    }

    const input: RelatorioHtmlInput = {
      titulo: tituloMap[tipo],
      subtitulo: "Administração e gestão > Projetos",
      descricao: "Relatório gerado a partir dos projetos visíveis para a instituição autenticada.",
      metadadosTopo: [
        { rotulo: "Emitido por", valor: authUser?.nome ?? authUser?.nomeUsuario ?? "Sistema" }
      ],
      tabela: {
        colunas: [
          { titulo: "Projeto", largura: "24%" },
          { titulo: "Status", largura: "12%" },
          { titulo: "Prioridade", largura: "12%" },
          { titulo: "Área", largura: "16%" },
          { titulo: "Responsável", largura: "16%" },
          { titulo: "Início", largura: "10%" },
          { titulo: "Prazo", largura: "10%" }
        ],
        linhas
      },
      cabecalho: contexto.cabecalho,
      rodape: contexto.rodape
    };
    return this.render(input, `projetos-${tipo}.pdf`);
  }

  private async gerarRelatorioIndividual(
    projetoId: string | undefined,
    tenantId: string,
    contexto: Awaited<ReturnType<ProjetoReportService["montarContextoInstitucional"]>>,
    authUser?: AuthUser
  ) {
    if (!projetoId?.trim()) {
      throw new AppError("Informe o projeto para o relatório individual.", 400);
    }
    const registro = await this.repository.buscarPorIdOuFalhar(BigInt(Number(projetoId)), tenantId);
    const blocos: RelatorioBloco[] = [
      {
        titulo: "Dados principais",
        colunas: 2,
        campos: [
          { rotulo: "Projeto", valor: registro.projeto.nome },
          { rotulo: "Responsável", valor: registro.projeto.responsavel },
          { rotulo: "Status", valor: formatProjetoStatusLabel(registro.projeto.status) },
          { rotulo: "Prioridade", valor: formatProjetoPrioridadeLabel(registro.projeto.prioridade) },
          { rotulo: "Área", valor: formatProjetoAreaLabel(registro.projeto.area_projeto) },
          { rotulo: "Unidade assistencial", valor: registro.projeto.unidade_assistencial_nome ?? "---" },
          {
            rotulo: "Início",
            valor: registro.projeto.data_inicio.toISOString().slice(0, 10).split("-").reverse().join("-")
          },
          {
            rotulo: "Prazo previsto",
            valor: registro.projeto.prazo_previsto.toISOString().slice(0, 10).split("-").reverse().join("-")
          }
        ]
      },
      {
        titulo: "Finalidade social",
        colunas: 1,
        campos: [
          { rotulo: "Objetivo geral", valor: registro.projeto.objetivo_geral ?? "---" },
          { rotulo: "Público-alvo", valor: registro.projeto.publico_alvo ?? "---" },
          { rotulo: "Descrição", valor: registro.projeto.descricao_completa ?? "---" },
          { rotulo: "Fonte de recurso", valor: registro.projeto.fonte_recurso ?? "---" }
        ]
      },
      {
        titulo: "Indicadores",
        colunas: 2,
        campos: [
          { rotulo: "Total de tarefas", valor: String(registro.tarefas.length) },
          {
            rotulo: "Tarefas concluídas",
            valor: String(registro.tarefas.filter((item) => item.status === "CONCLUIDO").length)
          },
          { rotulo: "Percentual de evolução", valor: `${Number(registro.projeto.percentual_evolucao ?? 0)}%` }
        ]
      }
    ];

    const input: RelatorioHtmlInput = {
      titulo: "Relatório completo individual do projeto",
      subtitulo: "Administração e gestão > Projetos",
      descricao: "Visão consolidada do projeto, tarefas e histórico operacional.",
      metadadosTopo: [
        { rotulo: "Emitido por", valor: authUser?.nome ?? authUser?.nomeUsuario ?? "Sistema" }
      ],
      blocos,
      secoes: [
        {
          titulo: "Equipe envolvida",
          conteudo:
            this.parseEquipe(registro.projeto.equipe_envolvida).map((item) => `• ${item}`).join("\n") ||
            "Não informada."
        },
        {
          titulo: "Observações",
          conteudo: registro.projeto.observacoes ?? "Sem observações."
        }
      ],
      tabela: {
        colunas: [
          { titulo: "Tarefa", largura: "26%" },
          { titulo: "Responsável", largura: "18%" },
          { titulo: "Tipo", largura: "14%" },
          { titulo: "Status", largura: "14%" },
          { titulo: "Prioridade", largura: "12%" },
          { titulo: "Prazo", largura: "8%" },
          { titulo: "Conclusão", largura: "8%" }
        ],
        linhas: registro.tarefas.map((item) => [
          item.titulo,
          item.responsavel,
          formatProjetoTarefaTipoLabel(item.tipo_tarefa),
          formatProjetoStatusLabel(item.status),
          formatProjetoPrioridadeLabel(item.prioridade),
          item.data_prevista
            ? item.data_prevista.toISOString().slice(0, 10).split("-").reverse().join("-")
            : "---",
          item.data_conclusao
            ? item.data_conclusao.toISOString().slice(0, 10).split("-").reverse().join("-")
            : "---"
        ])
      },
      cabecalho: contexto.cabecalho,
      rodape: contexto.rodape
    };

    return this.render(input, `projeto-${registro.projeto.id.toString()}.pdf`);
  }

  private async montarContextoInstitucional(tenantId: string) {
    const instituicao = await this.reportsRepository.obterInstituicaoRelatorio(tenantId);
    const cnpj = instituicao.cnpj ? `CNPJ: ${instituicao.cnpj}` : "CNPJ: Não informado";
    const endereco = instituicao.enderecoCompleto || "Endereço: Não informado";
    const telefone = instituicao.telefone ? `Telefone: ${instituicao.telefone}` : "Telefone: Não informado";
    const email = instituicao.email ? `E-mail: ${instituicao.email}` : "E-mail: Não informado";
    return {
      cabecalho: {
        razaoSocial: instituicao.razaoSocial,
        logoUrl: instituicao.logoUrl
      },
      rodape: {
        linha1: instituicao.razaoSocial,
        linha2: `${cnpj} | ${endereco}`,
        linha3: `${telefone} | ${email}`
      }
    };
  }

  private render(input: RelatorioHtmlInput, filename: string) {
    const html = this.template.montarHtml(input);
    return this.renderer.render(html, input.rodape, input).then((pdf) => ({
      html,
      pdf,
      filename
    }));
  }

  private parseTenant(rawTenantId?: string) {
    const tenantId = rawTenantId?.trim();
    if (!tenantId) throw new AppError("Tenant da sessao nao identificado.", 401);
    return tenantId;
  }

  private parseEquipe(value: unknown) {
    if (Array.isArray(value)) return value.map((item) => String(item ?? "").trim()).filter(Boolean);
    if (typeof value !== "string") return [];
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item ?? "").trim()).filter(Boolean);
      }
    } catch {}
    return [];
  }

  private isAtrasado(date: Date) {
    return date.getTime() < new Date(new Date().toDateString()).getTime();
  }
}
