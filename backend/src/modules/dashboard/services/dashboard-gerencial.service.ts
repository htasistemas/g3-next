import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { dashboardGerencialFiltrosSchema } from "../dashboard.schema.js";
import type {
  DashboardGerencialAnalise,
  DashboardGerencialBucket,
  DashboardGerencialEvento,
  DashboardGerencialKpi,
  DashboardGerencialPendencia,
  DashboardGerencialProjeto,
  DashboardGerencialResponse
} from "../dashboard.types.js";

type AuthUser = {
  id?: string;
  tenant_id?: string;
  instituicao_id?: string;
  instituicao_nome?: string;
  permissoes?: string[];
};

type QueryResult<T> = {
  dados: T;
  avisos: string[];
};

type Periodo = {
  startDate: string;
  endDate: string;
  previousStartDate: string;
  previousEndDate: string;
};

type TotalRow = { total: unknown };
type BucketRow = { chave: string | null; rotulo?: string | null; total: unknown };

const permissoesBaseDashboard = ["ADMINISTRADOR", "OPERADOR", "LEITURA_APENAS", "PAINEL_INDICADORES_DASHBOARD_VISUALIZAR"];
const permissoesExportar = ["ADMINISTRADOR", "PAINEL_INDICADORES_DASHBOARD_EXPORTAR"];
const permissoesPersonalizar = ["ADMINISTRADOR", "PAINEL_INDICADORES_DASHBOARD_PERSONALIZAR"];
const permissoesFinanceiro = ["ADMINISTRADOR", "PAINEL_INDICADORES_DASHBOARD_VISUALIZAR_FINANCEIRO"];
const permissoesSensiveis = ["ADMINISTRADOR", "PAINEL_INDICADORES_DASHBOARD_VISUALIZAR_DADOS_SENSIVEIS"];

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function toDateOnly(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value).slice(0, 10) || null;
  return parsed.toISOString().slice(0, 10);
}

function formatarMes(value: string) {
  return value.slice(0, 7);
}

function calcularVariacao(atual: number, anterior: number) {
  if (anterior === 0) return atual > 0 ? 100 : 0;
  return Math.round(((atual - anterior) / anterior) * 1000) / 10;
}

function tendencia(atual: number, anterior: number): "alta" | "estavel" | "baixa" {
  const diferenca = atual - anterior;
  if (Math.abs(diferenca) <= Math.max(1, anterior * 0.02)) return "estavel";
  return diferenca > 0 ? "alta" : "baixa";
}

function diasEntre(inicio: string, fim: string) {
  const a = new Date(`${inicio}T00:00:00.000Z`).getTime();
  const b = new Date(`${fim}T00:00:00.000Z`).getTime();
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

function subtrairDias(data: string, dias: number) {
  const value = new Date(`${data}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() - dias);
  return value.toISOString().slice(0, 10);
}

function fimDiaAtualIso() {
  return new Date().toISOString();
}

function montarKpi(input: {
  id: string;
  titulo: string;
  valor: number;
  anterior: number;
  interpretacao: "positiva" | "negativa" | "neutra";
  tooltip: string;
  origem: string;
  rotaDetalhe?: string;
  meta?: number | null;
}): DashboardGerencialKpi {
  const percentualMeta = input.meta && input.meta > 0 ? Math.round((input.valor / input.meta) * 1000) / 10 : null;
  return {
    id: input.id,
    titulo: input.titulo,
    valor: input.valor,
    comparacaoAnterior: input.anterior,
    variacaoPercentual: calcularVariacao(input.valor, input.anterior),
    tendencia: tendencia(input.valor, input.anterior),
    interpretacao: input.interpretacao,
    meta: input.meta ?? null,
    percentualMeta,
    tooltip: input.tooltip,
    origem: input.origem,
    rotaDetalhe: input.rotaDetalhe
  };
}

export class DashboardGerencialService {
  private tabelaCache = new Map<string, boolean>();
  private colunaCache = new Map<string, boolean>();

  async obter(rawFilters: unknown, authUser?: AuthUser): Promise<DashboardGerencialResponse> {
    this.validarPermissao(authUser, permissoesBaseDashboard);
    const tenantId = authUser?.tenant_id?.trim();
    if (!tenantId) throw new AppError("Tenant da sessao nao identificado.", 401);

    const filtros = dashboardGerencialFiltrosSchema.parse(rawFilters);
    const periodo = this.resolverPeriodo(filtros.startDate, filtros.endDate);
    const permissoes = authUser?.permissoes ?? [];

    const [
      instituicao,
      opcoes,
      cards,
      evolucaoBeneficiarios,
      atendimentos,
      engajamento,
      projetos,
      pendencias,
      eventos,
      impactoSocial,
      perfilBeneficiarios
    ] = await Promise.all([
      this.bloco("instituicao", tenantId, () => this.obterInstituicao(authUser, tenantId), { id: authUser?.instituicao_id, nome: authUser?.instituicao_nome, logoUrl: null }),
      this.bloco("opcoes", tenantId, () => this.obterOpcoes(tenantId), { unidades: [], projetos: [], programas: [], servicos: [], profissionais: [], tiposAtendimento: [], statusBeneficiario: [], bairros: [], cidades: [], territorios: [] }),
      this.bloco("cards", tenantId, () => this.obterCards(tenantId, periodo), [] as DashboardGerencialKpi[]),
      this.bloco("evolucao de beneficiarios", tenantId, () => this.obterEvolucaoBeneficiarios(tenantId, periodo), []),
      this.bloco("atendimentos", tenantId, () => this.obterAtendimentos(tenantId, periodo), { total: 0, pessoasUnicas: 0, taxaComparecimento: 0, taxaAusencia: 0, porStatus: [], porTipo: [], porDiaSemana: [] }),
      this.bloco("engajamento", tenantId, () => this.obterEngajamento(tenantId, periodo), []),
      this.bloco("projetos", tenantId, () => this.obterProjetos(tenantId), [] as DashboardGerencialProjeto[]),
      this.bloco("pendencias", tenantId, () => this.obterPendencias(tenantId), [] as DashboardGerencialPendencia[]),
      this.bloco("eventos", tenantId, () => this.obterEventos(tenantId), [] as DashboardGerencialEvento[]),
      this.bloco("impacto social", tenantId, () => this.obterImpactoSocial(tenantId, periodo, permissoes), [] as DashboardGerencialBucket[]),
      this.bloco("perfil de beneficiarios", tenantId, () => this.obterPerfilBeneficiarios(tenantId, permissoes), { faixaEtaria: [], sexo: [], bairros: [], cidades: [], status: [] })
    ]);

    const avisos = [
      ...instituicao.avisos,
      ...opcoes.avisos,
      ...cards.avisos,
      ...evolucaoBeneficiarios.avisos,
      ...atendimentos.avisos,
      ...engajamento.avisos,
      ...projetos.avisos,
      ...pendencias.avisos,
      ...eventos.avisos,
      ...impactoSocial.avisos,
      ...perfilBeneficiarios.avisos
    ];

    return {
      filtros: { startDate: periodo.startDate, endDate: periodo.endDate },
      instituicao: instituicao.dados,
      ultimaAtualizacao: fimDiaAtualIso(),
      permissoes: {
        podeExportar: this.temPermissao(permissoes, permissoesExportar),
        podePersonalizar: this.temPermissao(permissoes, permissoesPersonalizar),
        podeVerFinanceiro: this.temPermissao(permissoes, permissoesFinanceiro),
        podeVerDadosSensiveis: this.temPermissao(permissoes, permissoesSensiveis)
      },
      opcoes: opcoes.dados,
      cards: cards.dados,
      evolucaoBeneficiarios: evolucaoBeneficiarios.dados,
      atendimentos: atendimentos.dados,
      engajamento: engajamento.dados,
      projetos: projetos.dados,
      pendencias: pendencias.dados,
      eventos: eventos.dados,
      impactoSocial: impactoSocial.dados,
      perfilBeneficiarios: perfilBeneficiarios.dados,
      analiseInteligente: this.montarAnalise(cards.dados, atendimentos.dados, projetos.dados, pendencias.dados, periodo),
      avisos
    };
  }

  private async obterInstituicao(authUser: AuthUser | undefined, tenantId: string) {
    if (!(await this.tabelaExiste("unidade_assistencial"))) {
      return { id: authUser?.instituicao_id, nome: authUser?.instituicao_nome, logoUrl: null };
    }
    const rows = await this.query<{ id: unknown; nome: string | null; logo_url: string | null }>(
      `
      SELECT u.id, COALESCE(NULLIF(TRIM(u.nome_fantasia), ''), NULLIF(TRIM(u.razao_social), '')) AS nome,
             iu.caminho_arquivo AS logo_url
      FROM unidade_assistencial u
      LEFT JOIN LATERAL (
        SELECT caminho_arquivo
        FROM imagens_unidade
        WHERE unidade_id = u.id
        ORDER BY id DESC
        LIMIT 1
      ) iu ON TRUE
      WHERE u.tenant_id::text = $1
      ORDER BY u.id ASC
      LIMIT 1
      `,
      [tenantId]
    );
    const row = rows[0];
    return {
      id: row?.id !== undefined ? String(row.id) : authUser?.instituicao_id,
      nome: row?.nome ?? authUser?.instituicao_nome,
      logoUrl: row?.logo_url ?? null
    };
  }

  private async obterCards(tenantId: string, periodo: Periodo): Promise<DashboardGerencialKpi[]> {
    const [
      beneficiariosAtivos,
      beneficiariosAtivosAnterior,
      novosBeneficiarios,
      novosBeneficiariosAnterior,
      pessoasAtendidas,
      pessoasAtendidasAnterior,
      atendimentos,
      atendimentosAnterior,
      atividades,
      atividadesAnterior,
      projetosAtivos,
      projetosAtivosAnterior,
      eventos,
      eventosAnterior,
      acoes
    ] = await Promise.all([
      this.contarBeneficiariosAtivos(tenantId, periodo.endDate),
      this.contarBeneficiariosAtivos(tenantId, periodo.previousEndDate),
      this.contarBeneficiariosCriados(tenantId, periodo.startDate, periodo.endDate),
      this.contarBeneficiariosCriados(tenantId, periodo.previousStartDate, periodo.previousEndDate),
      this.contarPessoasAtendidas(tenantId, periodo.startDate, periodo.endDate),
      this.contarPessoasAtendidas(tenantId, periodo.previousStartDate, periodo.previousEndDate),
      this.contarAtendimentos(tenantId, periodo.startDate, periodo.endDate),
      this.contarAtendimentos(tenantId, periodo.previousStartDate, periodo.previousEndDate),
      this.contarAtividadesColetivas(tenantId, periodo.startDate, periodo.endDate),
      this.contarAtividadesColetivas(tenantId, periodo.previousStartDate, periodo.previousEndDate),
      this.contarProjetosAtivos(tenantId),
      this.contarProjetosAtivos(tenantId),
      this.contarEventosAcoes(tenantId, periodo.startDate, periodo.endDate),
      this.contarEventosAcoes(tenantId, periodo.previousStartDate, periodo.previousEndDate),
      this.contarItensAcao(tenantId)
    ]);

    return [
      montarKpi({ id: "beneficiarios-ativos", titulo: "Beneficiários ativos", valor: beneficiariosAtivos, anterior: beneficiariosAtivosAnterior, interpretacao: "positiva", tooltip: "Beneficiários com cadastro ativo no fim do período.", origem: "cadastro_beneficiario", rotaDetalhe: "/cadastros/beneficiarios" }),
      montarKpi({ id: "novos-beneficiarios", titulo: "Novos beneficiários no período", valor: novosBeneficiarios, anterior: novosBeneficiariosAnterior, interpretacao: "positiva", tooltip: "Cadastros criados dentro do período analisado.", origem: "cadastro_beneficiario.criado_em", rotaDetalhe: "/cadastros/beneficiarios" }),
      montarKpi({ id: "pessoas-atendidas", titulo: "Pessoas atendidas", valor: pessoasAtendidas, anterior: pessoasAtendidasAnterior, interpretacao: "positiva", tooltip: "Pessoas únicas com atendimento registrado no período.", origem: "central_atendimento.beneficiario_id", rotaDetalhe: "/atendimentos/central-atendimentos" }),
      montarKpi({ id: "atendimentos-realizados", titulo: "Atendimentos realizados", valor: atendimentos, anterior: atendimentosAnterior, interpretacao: "positiva", tooltip: "Quantidade de atendimentos registrados no período.", origem: "central_atendimento", rotaDetalhe: "/atendimentos/central-atendimentos" }),
      montarKpi({ id: "atividades-coletivas", titulo: "Atividades coletivas realizadas", valor: atividades, anterior: atividadesAnterior, interpretacao: "positiva", tooltip: "Agendamentos ou matrículas coletivas realizadas no período.", origem: "agendamento e cursos_atendimentos_presencas", rotaDetalhe: "/atendimentos/agendamentos" }),
      montarKpi({ id: "projetos-ativos", titulo: "Projetos ativos", valor: projetosAtivos, anterior: projetosAtivosAnterior, interpretacao: "positiva", tooltip: "Projetos em execução ou ativos.", origem: "projetos", rotaDetalhe: "/setor-administrativo/projetos" }),
      montarKpi({ id: "eventos-acoes", titulo: "Eventos e ações sociais", valor: eventos, anterior: eventosAnterior, interpretacao: "positiva", tooltip: "Compromissos, eventos e ações sociais no período.", origem: "agendamento e emprestimos_eventos", rotaDetalhe: "/atendimentos/agendamentos" }),
      montarKpi({ id: "itens-acao", titulo: "Itens que pedem ação", valor: acoes, anterior: 0, interpretacao: "negativa", tooltip: "Pendências operacionais consolidadas dos módulos monitorados.", origem: "cadastros, documentos, agenda, projetos, estoque e convênios", rotaDetalhe: "/dashboard/gerencial#itens-acao" })
    ];
  }

  private async obterEvolucaoBeneficiarios(tenantId: string, periodo: Periodo) {
    const rows = await this.query<{ periodo: string; novos: unknown; ativos: unknown }>(
      `
      SELECT to_char(date_trunc('month', criado_em), 'YYYY-MM') AS periodo,
             COUNT(*)::bigint AS novos,
             COUNT(*) FILTER (WHERE COALESCE(UPPER(TRIM(status)), 'ATIVO') NOT IN ('INATIVO', 'BLOQUEADO', 'DESLIGADO'))::bigint AS ativos
      FROM cadastro_beneficiario
      ${await this.whereComTenant("cadastro_beneficiario", ["criado_em IS NOT NULL", "CAST(criado_em AS date) >= $2", "CAST(criado_em AS date) <= $3"])}
      GROUP BY date_trunc('month', criado_em)
      ORDER BY periodo ASC
      `,
      [tenantId, periodo.startDate, periodo.endDate]
    );
    let acumulado = 0;
    return rows.map((row) => {
      acumulado += toNumber(row.novos);
      return {
        periodo: formatarMes(row.periodo),
        ativos: toNumber(row.ativos),
        novos: toNumber(row.novos),
        desligados: 0,
        reativados: 0,
        acumulado
      };
    });
  }

  private async obterAtendimentos(tenantId: string, periodo: Periodo) {
    const total = await this.contarAtendimentos(tenantId, periodo.startDate, periodo.endDate);
    const pessoasUnicas = await this.contarPessoasAtendidas(tenantId, periodo.startDate, periodo.endDate);
    const porStatus = await this.contarBuckets("central_atendimento", "status", tenantId, "data", periodo.startDate, periodo.endDate);
    const porTipo = await this.contarBuckets("central_atendimento", "tipo", tenantId, "data", periodo.startDate, periodo.endDate);
    const porDiaSemana = await this.query<BucketRow>(
      `
      SELECT to_char(CAST(data AS date), 'ID') AS chave,
             to_char(CAST(data AS date), 'Dy') AS rotulo,
             COUNT(*)::bigint AS total
      FROM central_atendimento
      ${await this.whereComTenant("central_atendimento", ["data IS NOT NULL", "CAST(data AS date) >= $2", "CAST(data AS date) <= $3"])}
      GROUP BY to_char(CAST(data AS date), 'ID'), to_char(CAST(data AS date), 'Dy')
      ORDER BY chave
      `,
      [tenantId, periodo.startDate, periodo.endDate]
    ).then((rows) => rows.map((row) => this.bucket(row)));
    const faltas = porStatus.filter((item) => ["FALTA", "AUSENTE", "NAO COMPARECEU"].includes(item.rotulo.toUpperCase())).reduce((totalAtual, item) => totalAtual + item.total, 0);
    return {
      total,
      pessoasUnicas,
      taxaComparecimento: total ? Math.round(((total - faltas) / total) * 1000) / 10 : 0,
      taxaAusencia: total ? Math.round((faltas / total) * 1000) / 10 : 0,
      porStatus,
      porTipo,
      porDiaSemana
    };
  }

  private async obterEngajamento(tenantId: string, periodo: Periodo) {
    const buckets = await this.contarBuckets("central_atendimento", "tipo", tenantId, "data", periodo.startDate, periodo.endDate);
    return buckets.slice(0, 8).map((item) => ({
      frente: item.rotulo,
      beneficiariosVinculados: item.total,
      atividades: 0,
      atendimentos: item.total,
      frequenciaPercentual: 0,
      taxaParticipacao: item.total > 0 ? 100 : 0,
      formula: "Taxa de participação = atendimentos da frente / atendimentos com a mesma frente no período. Frequência é exibida apenas quando houver presença registrada."
    }));
  }

  private async obterProjetos(tenantId: string): Promise<DashboardGerencialProjeto[]> {
    if (!(await this.tabelaExiste("projetos"))) return [];
    const rows = await this.query<Record<string, unknown>>(
      `
      SELECT p.id, p.nome, p.programa, p.responsavel, p.unidade, p.data_inicio, p.data_fim,
             COALESCE(p.publico_estimado, p.beneficiarios_previstos, 0) AS beneficiarios_previstos,
             COALESCE(p.meta_atividades, 0) AS atividades_previstas,
             COALESCE(p.orcamento_previsto, p.valor_previsto, 0) AS orcamento_previsto,
             COALESCE(p.valor_executado, 0) AS valor_executado,
             COALESCE(p.status, 'sem dados suficientes') AS status,
             (
               SELECT COUNT(*) FROM projeto_tarefas t
               WHERE t.projeto_id = p.id
                 AND COALESCE(UPPER(TRIM(t.status)), '') NOT IN ('CONCLUIDA', 'CONCLUIDO', 'FINALIZADA', 'FINALIZADO')
             ) AS pendencias
      FROM projetos p
      ${await this.whereTenant("projetos", "p")}
      ORDER BY p.atualizado_em DESC NULLS LAST, p.id DESC
      LIMIT 12
      `,
      [tenantId]
    );
    return rows.map((row) => {
      const atividadesPrevistas = toNumber(row.atividades_previstas);
      const atividadesRealizadas = 0;
      const orcamentoPrevisto = toNumber(row.orcamento_previsto);
      const valorExecutado = toNumber(row.valor_executado);
      return {
        id: String(row.id),
        projeto: String(row.nome ?? "Projeto"),
        programa: row.programa ? String(row.programa) : null,
        responsavel: row.responsavel ? String(row.responsavel) : null,
        unidade: row.unidade ? String(row.unidade) : null,
        periodoInicio: toDateOnly(row.data_inicio as Date | string | null),
        periodoFim: toDateOnly(row.data_fim as Date | string | null),
        beneficiariosPrevistos: toNumber(row.beneficiarios_previstos),
        beneficiariosAtendidos: 0,
        pessoasUnicasAtendidas: 0,
        atividadesPrevistas,
        atividadesRealizadas,
        metaAtingidaPercentual: atividadesPrevistas > 0 ? Math.round((atividadesRealizadas / atividadesPrevistas) * 1000) / 10 : 0,
        orcamentoPrevisto,
        valorExecutado,
        financeiroExecutadoPercentual: orcamentoPrevisto > 0 ? Math.round((valorExecutado / orcamentoPrevisto) * 1000) / 10 : null,
        prazoConsumidoPercentual: this.calcularPrazoConsumido(toDateOnly(row.data_inicio as Date | string | null), toDateOnly(row.data_fim as Date | string | null)),
        pendencias: toNumber(row.pendencias),
        proximoMarco: null,
        situacao: this.classificarProjeto(String(row.status ?? ""), toNumber(row.pendencias)),
        rotaDetalhe: "/setor-administrativo/projetos"
      };
    });
  }

  private async obterPendencias(tenantId: string): Promise<DashboardGerencialPendencia[]> {
    const [cadastrosIncompletos, docsVencidos, docsAVencer, agendamentosAtrasados, projetosPendentes, estoqueBaixo, termosVencidos] = await Promise.all([
      this.contarCadastrosIncompletos(tenantId),
      this.contarDocumentosInstituicao(tenantId, "vencido"),
      this.contarDocumentosInstituicao(tenantId, "vence_em_breve"),
      this.contarAgendamentosAtrasados(tenantId),
      this.contarProjetosComPendencias(tenantId),
      this.contarEstoqueBaixo(tenantId),
      this.contarTermosVencidos(tenantId)
    ]);
    const pendencias: DashboardGerencialPendencia[] = [
      { id: "cadastros-incompletos", titulo: "Cadastros incompletos", descricao: "Beneficiários com status incompleto, em análise ou desatualizado.", modulo: "Beneficiários", prioridade: "alta", quantidade: cadastrosIncompletos, rotaDetalhe: "/cadastros/beneficiarios" },
      { id: "documentos-vencidos", titulo: "Documentos vencidos", descricao: "Documentos institucionais com vencimento ultrapassado.", modulo: "Gestão de documentos", prioridade: "critica", quantidade: docsVencidos, rotaDetalhe: "/setor-administrativo/gestao-documentos" },
      { id: "documentos-a-vencer", titulo: "Documentos próximos do vencimento", descricao: "Documentos institucionais que pedem renovação preventiva.", modulo: "Gestão de documentos", prioridade: "media", quantidade: docsAVencer, rotaDetalhe: "/setor-administrativo/gestao-documentos" },
      { id: "agendas-atrasadas", titulo: "Agendas atrasadas", descricao: "Agendamentos vencidos sem conclusão registrada.", modulo: "Agendamentos", prioridade: "alta", quantidade: agendamentosAtrasados, rotaDetalhe: "/atendimentos/agendamentos" },
      { id: "projetos-pendentes", titulo: "Projetos com pendências", descricao: "Tarefas de projetos ainda abertas ou atrasadas.", modulo: "Projetos", prioridade: "media", quantidade: projetosPendentes, rotaDetalhe: "/setor-administrativo/projetos" },
      { id: "estoque-baixo", titulo: "Estoque abaixo do mínimo", descricao: "Itens do almoxarifado com quantidade abaixo do mínimo cadastrado.", modulo: "Almoxarifado", prioridade: "alta", quantidade: estoqueBaixo, rotaDetalhe: "/setor-administrativo/almoxarifado" },
      { id: "convenios-vencidos", titulo: "Convênios vencidos", descricao: "Termos de fomento com vigência encerrada.", modulo: "Termos de fomento", prioridade: "critica", quantidade: termosVencidos, rotaDetalhe: "/setor-juridico/termo-fomento" }
    ];
    return pendencias.filter((item) => item.quantidade > 0);
  }

  private async obterEventos(tenantId: string): Promise<DashboardGerencialEvento[]> {
    if (!(await this.tabelaExiste("agendamento"))) return [];
    const rows = await this.query<Record<string, unknown>>(
      `
      SELECT id, titulo, data_inicio, horario_inicio, local, unidade, profissional_responsavel, status
      FROM agendamento
      ${await this.whereComTenant("agendamento", ["CAST(data_inicio AS date) >= CURRENT_DATE"])}
      ORDER BY data_inicio ASC NULLS LAST, horario_inicio ASC NULLS LAST
      LIMIT 12
      `,
      [tenantId]
    );
    return rows.map((row) => {
      const data = toDateOnly(row.data_inicio as Date | string | null);
      return {
        id: String(row.id),
        titulo: String(row.titulo ?? "Agenda"),
        data,
        horario: row.horario_inicio ? String(row.horario_inicio) : null,
        local: row.local ? String(row.local) : null,
        unidade: row.unidade ? String(row.unidade) : null,
        responsavel: row.profissional_responsavel ? String(row.profissional_responsavel) : null,
        inscritos: null,
        vagasDisponiveis: null,
        situacao: row.status ? String(row.status) : null,
        prazoRestanteDias: data ? diasEntre(new Date().toISOString().slice(0, 10), data) : null,
        rotaDetalhe: "/atendimentos/agendamentos"
      };
    });
  }

  private async obterImpactoSocial(tenantId: string, periodo: Periodo, permissoes: string[]) {
    const impacto: DashboardGerencialBucket[] = [
      { chave: "pessoas-unicas-atendidas", rotulo: "Pessoas únicas atendidas", total: await this.contarPessoasAtendidas(tenantId, periodo.startDate, periodo.endDate) },
      { chave: "familias-acompanhadas", rotulo: "Famílias cadastradas", total: await this.contarTabela("vinculo_familiar", tenantId) },
      { chave: "beneficios-concedidos", rotulo: "Benefícios concedidos", total: await this.contarBeneficiosConcedidos(tenantId, periodo.startDate, periodo.endDate) },
      { chave: "doacoes-entregues", rotulo: "Doações entregues", total: await this.contarTabelaPeriodo("doacao_realizada", tenantId, "data_doacao", periodo.startDate, periodo.endDate) },
      { chave: "alcance-territorial", rotulo: "Bairros alcançados", total: await this.contarBairrosAlcancados(tenantId) }
    ];
    if (this.temPermissao(permissoes, permissoesFinanceiro)) {
      impacto.push({ chave: "custo-beneficios", rotulo: "Valor social registrado", total: await this.somarBeneficios(tenantId, periodo.startDate, periodo.endDate) });
    }
    return impacto;
  }

  private async obterPerfilBeneficiarios(tenantId: string, permissoes: string[]) {
    return {
      faixaEtaria: await this.perfilFaixaEtaria(tenantId),
      sexo: this.temPermissao(permissoes, permissoesSensiveis) ? await this.contarBuckets("cadastro_beneficiario", "sexo_biologico", tenantId) : [],
      bairros: await this.contarBucketsEndereco("bairro", tenantId),
      cidades: await this.contarBucketsEndereco("cidade", tenantId),
      status: await this.contarBuckets("cadastro_beneficiario", "status", tenantId)
    };
  }

  private async obterOpcoes(tenantId: string) {
    return {
      unidades: await this.distintos("unidade_assistencial", "nome_fantasia", tenantId),
      projetos: await this.distintos("projetos", "nome", tenantId),
      programas: await this.distintos("projetos", "programa", tenantId),
      servicos: await this.distintos("central_atendimento", "tipo", tenantId),
      profissionais: await this.distintos("central_atendimento", "profissional_responsavel", tenantId),
      tiposAtendimento: await this.distintos("central_atendimento", "tipo", tenantId),
      statusBeneficiario: await this.distintos("cadastro_beneficiario", "status", tenantId),
      bairros: await this.distintosEndereco("bairro", tenantId),
      cidades: await this.distintosEndereco("cidade", tenantId),
      territorios: await this.distintosEndereco("zona", tenantId)
    };
  }

  private montarAnalise(cards: DashboardGerencialKpi[], atendimentos: DashboardGerencialResponse["atendimentos"], projetos: DashboardGerencialProjeto[], pendencias: DashboardGerencialPendencia[], periodo: Periodo): DashboardGerencialAnalise[] {
    const analises: DashboardGerencialAnalise[] = [];
    const itensAcao = cards.find((item) => item.id === "itens-acao");
    if (itensAcao && itensAcao.valor > 0) {
      analises.push({ id: "pendencias", titulo: "Há itens que pedem ação", descricao: `${itensAcao.valor} pendência(s) foram consolidadas e precisam de acompanhamento gerencial.`, indicador: "Itens que pedem ação", periodo: `${periodo.startDate} a ${periodo.endDate}`, regra: "Soma das pendências abertas nos módulos monitorados.", origem: itensAcao.origem, rotaDetalhe: itensAcao.rotaDetalhe });
    }
    if (atendimentos.total > 0 && atendimentos.taxaAusencia >= 20) {
      analises.push({ id: "ausencias", titulo: "Taxa de ausência em atenção", descricao: `A ausência está em ${atendimentos.taxaAusencia}%, acima da faixa de atenção de 20%.`, indicador: "Taxa de ausência", periodo: `${periodo.startDate} a ${periodo.endDate}`, regra: "Faltas / atendimentos totais do período.", origem: "central_atendimento.status", rotaDetalhe: "/atendimentos/central-atendimentos" });
    }
    const projetosCriticos = projetos.filter((item) => ["critico", "atrasado"].includes(item.situacao)).length;
    if (projetosCriticos > 0) {
      analises.push({ id: "projetos", titulo: "Projetos exigem acompanhamento", descricao: `${projetosCriticos} projeto(s) foram classificados como crítico ou atrasado.`, indicador: "Situação de projetos", periodo: `${periodo.startDate} a ${periodo.endDate}`, regra: "Status do projeto e pendências abertas.", origem: "projetos e projeto_tarefas", rotaDetalhe: "/setor-administrativo/projetos" });
    }
    if (!analises.length) {
      analises.push({ id: "sem-alertas", titulo: "Sem alertas gerenciais automáticos", descricao: "Os dados atuais não acionaram regras críticas de tendência ou pendência.", indicador: "Regras do dashboard", periodo: `${periodo.startDate} a ${periodo.endDate}`, regra: "Avaliação de pendências, ausência e projetos.", origem: "Dados agregados do G3N" });
    }
    return analises;
  }

  private resolverPeriodo(startDate?: string, endDate?: string): Periodo {
    const hoje = new Date();
    const end = endDate ?? hoje.toISOString().slice(0, 10);
    const start = startDate ?? subtrairDias(end, 29);
    if (start > end) throw new AppError("A data final deve ser maior ou igual a data inicial.", 422);
    const intervalo = diasEntre(start, end) + 1;
    const previousEndDate = subtrairDias(start, 1);
    const previousStartDate = subtrairDias(previousEndDate, intervalo - 1);
    return { startDate: start, endDate: end, previousStartDate, previousEndDate };
  }

  private validarPermissao(authUser: AuthUser | undefined, permissoes: string[]) {
    if (!authUser) throw new AppError("Nao autenticado.", 401);
    if (!this.temPermissao(authUser.permissoes ?? [], permissoes)) {
      throw new AppError("Usuario autenticado nao possui permissao para executar esta acao.", 403);
    }
  }

  private temPermissao(permissoesUsuario: string[], permissoes: string[]) {
    return permissoesUsuario.some((permissao) => permissoes.includes(permissao));
  }

  private async bloco<T>(nome: string, _tenantId: string, fn: () => Promise<T>, fallback: T): Promise<QueryResult<T>> {
    try {
      return { dados: await fn(), avisos: [] };
    } catch (error) {
      console.warn(`[dashboard/gerencial] Falha no bloco ${nome}.`, error);
      return { dados: fallback, avisos: [`Não foi possível carregar o bloco ${nome}.`] };
    }
  }

  private async contarBeneficiariosAtivos(tenantId: string, ate: string) {
    return this.total(
      `
      SELECT COUNT(*)::bigint AS total
      FROM cadastro_beneficiario
      ${await this.whereComTenant("cadastro_beneficiario", ["CAST(COALESCE(criado_em, NOW()) AS date) <= $2", "COALESCE(UPPER(TRIM(status)), 'ATIVO') NOT IN ('INATIVO', 'BLOQUEADO', 'DESLIGADO')"])}
      `,
      [tenantId, ate]
    );
  }

  private async contarBeneficiariosCriados(tenantId: string, startDate: string, endDate: string) {
    return this.contarTabelaPeriodo("cadastro_beneficiario", tenantId, "criado_em", startDate, endDate);
  }

  private async contarPessoasAtendidas(tenantId: string, startDate: string, endDate: string) {
    if (!(await this.tabelaExiste("central_atendimento"))) return 0;
    return this.total(
      `
      SELECT COUNT(DISTINCT beneficiario_id)::bigint AS total
      FROM central_atendimento
      ${await this.whereComTenant("central_atendimento", ["beneficiario_id IS NOT NULL", "CAST(data AS date) >= $2", "CAST(data AS date) <= $3"])}
      `,
      [tenantId, startDate, endDate]
    );
  }

  private async contarAtendimentos(tenantId: string, startDate: string, endDate: string) {
    return this.contarTabelaPeriodo("central_atendimento", tenantId, "data", startDate, endDate);
  }

  private async contarAtividadesColetivas(tenantId: string, startDate: string, endDate: string) {
    const agendamentos = await this.contarTabelaPeriodo("agendamento", tenantId, "data_inicio", startDate, endDate);
    const presencas = await this.contarTabelaPeriodo("cursos_atendimentos_presencas", tenantId, "data", startDate, endDate);
    return agendamentos + presencas;
  }

  private async contarProjetosAtivos(tenantId: string) {
    if (!(await this.tabelaExiste("projetos"))) return 0;
    return this.total(
      `
      SELECT COUNT(*)::bigint AS total
      FROM projetos
      ${await this.whereComTenant("projetos", ["COALESCE(UPPER(TRIM(status)), 'ATIVO') NOT IN ('CONCLUIDO', 'SUSPENSO', 'CANCELADO', 'INATIVO')"])}
      `,
      [tenantId]
    );
  }

  private async contarEventosAcoes(tenantId: string, startDate: string, endDate: string) {
    const [agendamentos, emprestimos] = await Promise.all([
      this.contarTabelaPeriodo("agendamento", tenantId, "data_inicio", startDate, endDate),
      this.contarTabelaPeriodo("emprestimos_eventos", tenantId, "data_retirada_prevista", startDate, endDate)
    ]);
    return agendamentos + emprestimos;
  }

  private async contarItensAcao(tenantId: string) {
    const pendencias = await this.obterPendencias(tenantId);
    return pendencias.reduce((total, item) => total + item.quantidade, 0);
  }

  private async contarCadastrosIncompletos(tenantId: string) {
    return this.total(
      `
      SELECT COUNT(*)::bigint AS total
      FROM cadastro_beneficiario
      ${await this.whereComTenant("cadastro_beneficiario", ["COALESCE(UPPER(TRIM(status)), '') IN ('INCOMPLETO', 'EM_ANALISE', 'DESATUALIZADO')"])}
      `,
      [tenantId]
    );
  }

  private async contarDocumentosInstituicao(tenantId: string, situacao: string) {
    if (!(await this.tabelaExiste("documentos_instituicao"))) return 0;
    return this.total(
      `
      SELECT COUNT(*)::bigint AS total
      FROM documentos_instituicao
      ${await this.whereComTenant("documentos_instituicao", ["COALESCE(situacao, '') = $2"])}
      `,
      [tenantId, situacao]
    );
  }

  private async contarAgendamentosAtrasados(tenantId: string) {
    if (!(await this.tabelaExiste("agendamento"))) return 0;
    return this.total(
      `
      SELECT COUNT(*)::bigint AS total
      FROM agendamento
      ${await this.whereComTenant("agendamento", ["CAST(data_inicio AS date) < CURRENT_DATE", "COALESCE(UPPER(TRIM(status)), '') NOT IN ('CONCLUIDO', 'REALIZADO', 'CANCELADO')"])}
      `,
      [tenantId]
    );
  }

  private async contarProjetosComPendencias(tenantId: string) {
    if (!(await this.tabelaExiste("projeto_tarefas"))) return 0;
    return this.total(
      `
      SELECT COUNT(*)::bigint AS total
      FROM projeto_tarefas t
      INNER JOIN projetos p ON p.id = t.projeto_id
      WHERE p.tenant_id::text = $1
        AND COALESCE(UPPER(TRIM(t.status)), '') NOT IN ('CONCLUIDA', 'CONCLUIDO', 'FINALIZADA', 'FINALIZADO')
      `,
      [tenantId]
    );
  }

  private async contarEstoqueBaixo(tenantId: string) {
    if (!(await this.tabelaExiste("almoxarifado_item"))) return 0;
    const possuiMinimo = await this.colunaExiste("almoxarifado_item", "estoque_minimo");
    if (!possuiMinimo) return 0;
    return this.total(
      `
      SELECT COUNT(*)::bigint AS total
      FROM almoxarifado_item
      ${await this.whereComTenant("almoxarifado_item", ["COALESCE(quantidade_atual, 0) <= COALESCE(estoque_minimo, 0)", "COALESCE(estoque_minimo, 0) > 0"])}
      `,
      [tenantId]
    );
  }

  private async contarTermosVencidos(tenantId: string) {
    if (!(await this.tabelaExiste("termo_fomento"))) return 0;
    return this.total(
      `
      SELECT COUNT(*)::bigint AS total
      FROM termo_fomento
      ${await this.whereComTenant("termo_fomento", ["vigencia_fim IS NOT NULL", "CAST(vigencia_fim AS date) < CURRENT_DATE"])}
      `,
      [tenantId]
    );
  }

  private async contarBeneficiosConcedidos(tenantId: string, startDate: string, endDate: string) {
    const [beneficios, doacoes] = await Promise.all([
      this.contarTabelaPeriodo("central_beneficio", tenantId, "data", startDate, endDate),
      this.contarTabelaPeriodo("doacao_realizada", tenantId, "data_doacao", startDate, endDate)
    ]);
    return beneficios + doacoes;
  }

  private async somarBeneficios(tenantId: string, startDate: string, endDate: string) {
    if (!(await this.tabelaExiste("central_beneficio"))) return 0;
    return this.total(
      `
      SELECT COALESCE(SUM(valor_total), 0) AS total
      FROM central_beneficio
      ${await this.whereComTenant("central_beneficio", ["CAST(data AS date) >= $2", "CAST(data AS date) <= $3"])}
      `,
      [tenantId, startDate, endDate]
    );
  }

  private async contarBairrosAlcancados(tenantId: string) {
    if (!(await this.tabelaExiste("cadastro_beneficiario"))) return 0;
    return this.total(
      `
      SELECT COUNT(DISTINCT NULLIF(TRIM(e.bairro), ''))::bigint AS total
      FROM cadastro_beneficiario b
      LEFT JOIN endereco e ON e.id = b.endereco_id
      WHERE b.tenant_id::text = $1
      `,
      [tenantId]
    );
  }

  private async perfilFaixaEtaria(tenantId: string) {
    if (!(await this.tabelaExiste("cadastro_beneficiario"))) return [];
    const rows = await this.query<BucketRow>(
      `
      SELECT
        CASE
          WHEN data_nascimento IS NULL THEN 'Não informada'
          WHEN EXTRACT(YEAR FROM age(CURRENT_DATE, data_nascimento)) <= 11 THEN 'Crianças'
          WHEN EXTRACT(YEAR FROM age(CURRENT_DATE, data_nascimento)) <= 17 THEN 'Adolescentes'
          WHEN EXTRACT(YEAR FROM age(CURRENT_DATE, data_nascimento)) <= 24 THEN 'Jovens'
          WHEN EXTRACT(YEAR FROM age(CURRENT_DATE, data_nascimento)) <= 59 THEN 'Adultos'
          ELSE 'Idosos'
        END AS chave,
        COUNT(*)::bigint AS total
      FROM cadastro_beneficiario
      ${await this.whereTenant("cadastro_beneficiario")}
      GROUP BY chave
      ORDER BY total DESC
      `,
      [tenantId]
    );
    return rows.map((row) => this.bucket(row));
  }

  private async contarBuckets(tabela: string, coluna: string, tenantId: string, dataColuna?: string, startDate?: string, endDate?: string) {
    if (!(await this.tabelaExiste(tabela)) || !(await this.colunaExiste(tabela, coluna))) return [];
    const condicoes = dataColuna && startDate && endDate
      ? [`CAST(${dataColuna} AS date) >= $2`, `CAST(${dataColuna} AS date) <= $3`]
      : [];
    const params = dataColuna && startDate && endDate ? [tenantId, startDate, endDate] : [tenantId];
    const rows = await this.query<BucketRow>(
      `
      SELECT COALESCE(NULLIF(TRIM(${coluna}), ''), 'Não informado') AS chave,
             COUNT(*)::bigint AS total
      FROM ${tabela}
      ${await this.whereComTenant(tabela, condicoes)}
      GROUP BY COALESCE(NULLIF(TRIM(${coluna}), ''), 'Não informado')
      ORDER BY total DESC
      LIMIT 12
      `,
      params
    );
    return rows.map((row) => this.bucket(row));
  }

  private async contarBucketsEndereco(coluna: "bairro" | "cidade" | "zona", tenantId: string) {
    if (!(await this.tabelaExiste("cadastro_beneficiario"))) return [];
    const rows = await this.query<BucketRow>(
      `
      SELECT COALESCE(NULLIF(TRIM(e.${coluna}), ''), 'Não informado') AS chave,
             COUNT(*)::bigint AS total
      FROM cadastro_beneficiario b
      LEFT JOIN endereco e ON e.id = b.endereco_id
      WHERE b.tenant_id::text = $1
      GROUP BY COALESCE(NULLIF(TRIM(e.${coluna}), ''), 'Não informado')
      ORDER BY total DESC
      LIMIT 12
      `,
      [tenantId]
    );
    return rows.map((row) => this.bucket(row));
  }

  private async distintos(tabela: string, coluna: string, tenantId: string) {
    if (!(await this.tabelaExiste(tabela)) || !(await this.colunaExiste(tabela, coluna))) return [];
    const rows = await this.query<{ valor: string | null }>(
      `
      SELECT DISTINCT NULLIF(TRIM(${coluna}), '') AS valor
      FROM ${tabela}
      ${await this.whereComTenant(tabela, [`NULLIF(TRIM(${coluna}), '') IS NOT NULL`])}
      ORDER BY valor ASC
      LIMIT 80
      `,
      [tenantId]
    );
    return rows.map((row) => row.valor).filter((valor): valor is string => Boolean(valor));
  }

  private async distintosEndereco(coluna: "bairro" | "cidade" | "zona", tenantId: string) {
    if (!(await this.tabelaExiste("cadastro_beneficiario"))) return [];
    const rows = await this.query<{ valor: string | null }>(
      `
      SELECT DISTINCT NULLIF(TRIM(e.${coluna}), '') AS valor
      FROM cadastro_beneficiario b
      LEFT JOIN endereco e ON e.id = b.endereco_id
      WHERE b.tenant_id::text = $1
        AND NULLIF(TRIM(e.${coluna}), '') IS NOT NULL
      ORDER BY valor ASC
      LIMIT 80
      `,
      [tenantId]
    );
    return rows.map((row) => row.valor).filter((valor): valor is string => Boolean(valor));
  }

  private async contarTabela(tabela: string, tenantId: string) {
    if (!(await this.tabelaExiste(tabela))) return 0;
    return this.total(`SELECT COUNT(*)::bigint AS total FROM ${tabela} ${await this.whereTenant(tabela)}`, [tenantId]);
  }

  private async contarTabelaPeriodo(tabela: string, tenantId: string, dataColuna: string, startDate: string, endDate: string) {
    if (!(await this.tabelaExiste(tabela)) || !(await this.colunaExiste(tabela, dataColuna))) return 0;
    return this.total(
      `
      SELECT COUNT(*)::bigint AS total
      FROM ${tabela}
      ${await this.whereComTenant(tabela, [`CAST(${dataColuna} AS date) >= $2`, `CAST(${dataColuna} AS date) <= $3`])}
      `,
      [tenantId, startDate, endDate]
    );
  }

  private calcularPrazoConsumido(inicio: string | null, fim: string | null) {
    if (!inicio || !fim) return 0;
    const total = diasEntre(inicio, fim);
    if (total <= 0) return 0;
    return Math.max(0, Math.min(100, Math.round((diasEntre(inicio, new Date().toISOString().slice(0, 10)) / total) * 1000) / 10));
  }

  private classificarProjeto(status: string, pendencias: number): DashboardGerencialProjeto["situacao"] {
    const normalizado = status.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
    if (normalizado.includes("CONCLUID")) return "concluido";
    if (normalizado.includes("SUSPENS")) return "suspenso";
    if (pendencias >= 10) return "critico";
    if (pendencias > 0) return "atencao";
    if (normalizado.includes("ATRAS")) return "atrasado";
    if (normalizado.includes("ATIV") || normalizado.includes("EXEC")) return "dentro_da_meta";
    return "sem_dados_suficientes";
  }

  private bucket(row: BucketRow): DashboardGerencialBucket {
    const rotulo = row.rotulo ?? row.chave ?? "Não informado";
    return { chave: String(row.chave ?? rotulo), rotulo: String(rotulo), total: toNumber(row.total) };
  }

  private async whereTenant(tabela: string, alias?: string) {
    if (!(await this.colunaExiste(tabela, "tenant_id"))) return "";
    return `WHERE ${(alias ?? tabela)}.tenant_id::text = $1`;
  }

  private async whereComTenant(tabela: string, condicoes: string[], alias?: string) {
    const tenant = await this.whereTenant(tabela, alias);
    const prefixo = tenant ? [tenant.replace(/^WHERE\s+/i, "")] : [];
    const todas = [...prefixo, ...condicoes];
    return todas.length ? `WHERE ${todas.join(" AND ")}` : "";
  }

  private async total(sql: string, params: unknown[]) {
    const rows = await this.query<TotalRow>(sql, params);
    return toNumber(rows[0]?.total);
  }

  private async query<T>(sql: string, params: unknown[]) {
    try {
      return await prisma.$queryRawUnsafe<T[]>(sql, ...params);
    } catch (error) {
      console.warn("[dashboard/gerencial] Falha ao executar consulta.", error);
      return [] as T[];
    }
  }

  private async tabelaExiste(tabela: string) {
    if (this.tabelaCache.has(tabela)) return this.tabelaCache.get(tabela) as boolean;
    const rows = await this.query<{ existe: boolean }>("SELECT to_regclass($1) IS NOT NULL AS existe", [`public.${tabela}`]);
    const existe = !!rows[0]?.existe;
    this.tabelaCache.set(tabela, existe);
    return existe;
  }

  private async colunaExiste(tabela: string, coluna: string) {
    const key = `${tabela}.${coluna}`;
    if (this.colunaCache.has(key)) return this.colunaCache.get(key) as boolean;
    if (!(await this.tabelaExiste(tabela))) {
      this.colunaCache.set(key, false);
      return false;
    }
    const rows = await this.query<{ existe: boolean }>(
      `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = $1
          AND column_name = $2
      ) AS existe
      `,
      [tabela, coluna]
    );
    const existe = !!rows[0]?.existe;
    this.colunaCache.set(key, existe);
    return existe;
  }
}
