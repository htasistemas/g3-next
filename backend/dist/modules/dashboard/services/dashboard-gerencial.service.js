import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { dashboardGerencialFiltrosSchema } from "../dashboard.schema.js";
const permissoesBaseDashboard = ["ADMINISTRADOR", "OPERADOR", "LEITURA_APENAS", "PAINEL_INDICADORES_DASHBOARD_VISUALIZAR"];
const permissoesExportar = ["ADMINISTRADOR", "PAINEL_INDICADORES_DASHBOARD_EXPORTAR"];
const permissoesPersonalizar = ["ADMINISTRADOR", "PAINEL_INDICADORES_DASHBOARD_PERSONALIZAR"];
const permissoesFinanceiro = ["ADMINISTRADOR", "PAINEL_INDICADORES_DASHBOARD_VISUALIZAR_FINANCEIRO"];
const permissoesSensiveis = ["ADMINISTRADOR", "PAINEL_INDICADORES_DASHBOARD_VISUALIZAR_DADOS_SENSIVEIS"];
function toNumber(value) {
    if (typeof value === "number" && Number.isFinite(value))
        return value;
    if (typeof value === "bigint")
        return Number(value);
    if (typeof value === "string") {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
}
function toDateOnly(value) {
    if (!value)
        return null;
    if (value instanceof Date)
        return value.toISOString().slice(0, 10);
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime()))
        return String(value).slice(0, 10) || null;
    return parsed.toISOString().slice(0, 10);
}
function formatarMes(value) {
    return value.slice(0, 7);
}
function calcularVariacao(atual, anterior) {
    if (anterior === 0)
        return atual > 0 ? 100 : 0;
    return Math.round(((atual - anterior) / anterior) * 1000) / 10;
}
function tendencia(atual, anterior) {
    const diferenca = atual - anterior;
    if (Math.abs(diferenca) <= Math.max(1, anterior * 0.02))
        return "estavel";
    return diferenca > 0 ? "alta" : "baixa";
}
function diasEntre(inicio, fim) {
    const a = new Date(`${inicio}T00:00:00.000Z`).getTime();
    const b = new Date(`${fim}T00:00:00.000Z`).getTime();
    return Math.max(0, Math.round((b - a) / 86_400_000));
}
function subtrairDias(data, dias) {
    const value = new Date(`${data}T00:00:00.000Z`);
    value.setUTCDate(value.getUTCDate() - dias);
    return value.toISOString().slice(0, 10);
}
function fimDiaAtualIso() {
    return new Date().toISOString();
}
function montarKpi(input) {
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
    tabelaCache = new Map();
    colunaCache = new Map();
    async obter(rawFilters, authUser) {
        this.validarPermissao(authUser, permissoesBaseDashboard);
        const tenantId = authUser?.tenant_id?.trim();
        if (!tenantId)
            throw new AppError("Tenant da sessao nao identificado.", 401);
        const filtros = dashboardGerencialFiltrosSchema.parse(rawFilters);
        const periodo = this.resolverPeriodo(filtros.startDate, filtros.endDate);
        const permissoes = authUser?.permissoes ?? [];
        const [instituicao, opcoes, cards, evolucaoBeneficiarios, atendimentos, doacoes, cursos, engajamento, projetos, pendencias, eventos, impactoSocial, perfilBeneficiarios, riscoTerritorial] = await Promise.all([
            this.bloco("instituicao", tenantId, () => this.obterInstituicao(authUser, tenantId), { id: authUser?.instituicao_id, nome: authUser?.instituicao_nome, logoUrl: null }),
            this.bloco("opcoes", tenantId, () => this.obterOpcoes(tenantId), { unidades: [], projetos: [], programas: [], servicos: [], profissionais: [], tiposAtendimento: [], statusBeneficiario: [], bairros: [], cidades: [], territorios: [] }),
            this.bloco("cards", tenantId, () => this.obterCards(tenantId, periodo), []),
            this.bloco("evolucao de beneficiarios", tenantId, () => this.obterEvolucaoBeneficiarios(tenantId, periodo), []),
            this.bloco("atendimentos", tenantId, () => this.obterAtendimentos(tenantId, periodo), { total: 0, pessoasUnicas: 0, taxaComparecimento: 0, taxaAusencia: 0, porStatus: [], porTipo: [], porDiaSemana: [] }),
            this.bloco("doacoes", tenantId, () => this.obterDoacoes(tenantId, periodo), { cestasEntregues: 0, cestasAEntregar: 0, cestasAtrasadas: 0, porBairro: [], porTipo: [], planejadasPorPrioridade: [] }),
            this.bloco("cursos", tenantId, () => this.obterCursos(tenantId, periodo), { aulasRegistradas: 0, presencas: 0, ausencias: 0, justificadas: 0, taxaAusencia: 0, porCurso: [], porStatus: [] }),
            this.bloco("engajamento", tenantId, () => this.obterEngajamento(tenantId, periodo), []),
            this.bloco("projetos", tenantId, () => this.obterProjetos(tenantId), []),
            this.bloco("pendencias", tenantId, () => this.obterPendencias(tenantId), []),
            this.bloco("eventos", tenantId, () => this.obterEventos(tenantId), []),
            this.bloco("impacto social", tenantId, () => this.obterImpactoSocial(tenantId, periodo, permissoes), []),
            this.bloco("perfil de beneficiarios", tenantId, () => this.obterPerfilBeneficiarios(tenantId, permissoes), { faixaEtaria: [], sexo: [], bairros: [], cidades: [], status: [], idadePorBairro: [] }),
            this.bloco("risco territorial", tenantId, () => this.obterRiscoTerritorial(tenantId, periodo), [])
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
            ...perfilBeneficiarios.avisos,
            ...doacoes.avisos,
            ...cursos.avisos,
            ...riscoTerritorial.avisos
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
            doacoes: doacoes.dados,
            cursos: cursos.dados,
            engajamento: engajamento.dados,
            projetos: projetos.dados,
            pendencias: pendencias.dados,
            eventos: eventos.dados,
            impactoSocial: impactoSocial.dados,
            perfilBeneficiarios: perfilBeneficiarios.dados,
            riscoTerritorial: riscoTerritorial.dados,
            analiseInteligente: this.montarAnalise(cards.dados, atendimentos.dados, projetos.dados, pendencias.dados, periodo, doacoes.dados, cursos.dados, riscoTerritorial.dados),
            avisos
        };
    }
    async obterInstituicao(authUser, tenantId) {
        if (!(await this.tabelaExiste("unidade_assistencial"))) {
            return { id: authUser?.instituicao_id, nome: authUser?.instituicao_nome, logoUrl: null };
        }
        const rows = await this.query(`
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
      `, [tenantId]);
        const row = rows[0];
        return {
            id: row?.id !== undefined ? String(row.id) : authUser?.instituicao_id,
            nome: row?.nome ?? authUser?.instituicao_nome,
            logoUrl: row?.logo_url ?? null
        };
    }
    async obterCards(tenantId, periodo) {
        const [beneficiariosAtivos, beneficiariosAtivosAnterior, novosBeneficiarios, novosBeneficiariosAnterior, pessoasAtendidas, pessoasAtendidasAnterior, atendimentos, atendimentosAnterior, atividades, atividadesAnterior, projetosAtivos, projetosAtivosAnterior, eventos, eventosAnterior, cestasEntregues, cestasEntreguesAnterior, cestasAEntregar, ausenciasCurso, ausenciasCursoAnterior, acoes] = await Promise.all([
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
            this.contarCestasEntregues(tenantId, periodo.startDate, periodo.endDate),
            this.contarCestasEntregues(tenantId, periodo.previousStartDate, periodo.previousEndDate),
            this.contarCestasAEntregar(tenantId, periodo.endDate),
            this.contarAusenciasCurso(tenantId, periodo.startDate, periodo.endDate),
            this.contarAusenciasCurso(tenantId, periodo.previousStartDate, periodo.previousEndDate),
            this.contarItensAcao(tenantId)
        ]);
        return [
            montarKpi({ id: "beneficiarios-ativos", titulo: "Beneficiários ativos", valor: beneficiariosAtivos, anterior: beneficiariosAtivosAnterior, interpretacao: "positiva", tooltip: "Beneficiários com cadastro ativo no fim do período.", origem: "cadastro_beneficiario", rotaDetalhe: "/cadastros/beneficiarios" }),
            montarKpi({ id: "novos-beneficiarios", titulo: "Novos beneficiários no período", valor: novosBeneficiarios, anterior: novosBeneficiariosAnterior, interpretacao: "positiva", tooltip: "Cadastros criados dentro do período analisado.", origem: "cadastro_beneficiario.criado_em", rotaDetalhe: "/cadastros/beneficiarios" }),
            montarKpi({ id: "pessoas-atendidas", titulo: "Pessoas atendidas", valor: pessoasAtendidas, anterior: pessoasAtendidasAnterior, interpretacao: "positiva", tooltip: "Pessoas únicas com atendimento registrado no período.", origem: "central_atendimento.beneficiario_id", rotaDetalhe: "/atendimentos/central-atendimentos" }),
            montarKpi({ id: "atendimentos-realizados", titulo: "Atendimentos realizados", valor: atendimentos, anterior: atendimentosAnterior, interpretacao: "positiva", tooltip: "Quantidade de atendimentos registrados no período.", origem: "central_atendimento", rotaDetalhe: "/atendimentos/central-atendimentos" }),
            montarKpi({ id: "atividades-coletivas", titulo: "Atividades coletivas realizadas", valor: atividades, anterior: atividadesAnterior, interpretacao: "positiva", tooltip: "Agendamentos ou matrículas coletivas realizadas no período.", origem: "agendamento e cursos_atendimentos_presencas", rotaDetalhe: "/atendimentos/agendamentos" }),
            montarKpi({ id: "cestas-entregues", titulo: "Cestas entregues", valor: cestasEntregues, anterior: cestasEntreguesAnterior, interpretacao: "positiva", tooltip: "Cestas básicas registradas como doação realizada no período.", origem: "doacao_realizada e doacao_realizada_item", rotaDetalhe: "/doacoes-realizadas" }),
            montarKpi({ id: "cestas-a-entregar", titulo: "Cestas a entregar", valor: cestasAEntregar, anterior: 0, interpretacao: "negativa", tooltip: "Cestas básicas planejadas com status pendente até o fim do período.", origem: "doacao_planejada", rotaDetalhe: "/doacoes-realizadas" }),
            montarKpi({ id: "ausencias-curso", titulo: "Ausências em cursos", valor: ausenciasCurso, anterior: ausenciasCursoAnterior, interpretacao: "negativa", tooltip: "Registros de falta ou ausência em aulas de cursos no período.", origem: "cursos_atendimentos_presencas.status", rotaDetalhe: "/cadastros/matriculas" }),
            montarKpi({ id: "projetos-ativos", titulo: "Projetos ativos", valor: projetosAtivos, anterior: projetosAtivosAnterior, interpretacao: "positiva", tooltip: "Projetos em execução ou ativos.", origem: "projetos", rotaDetalhe: "/setor-administrativo/projetos" }),
            montarKpi({ id: "eventos-acoes", titulo: "Eventos e ações sociais", valor: eventos, anterior: eventosAnterior, interpretacao: "positiva", tooltip: "Compromissos, eventos e ações sociais no período.", origem: "agendamento e emprestimos_eventos", rotaDetalhe: "/atendimentos/agendamentos" }),
            montarKpi({ id: "itens-acao", titulo: "Itens que pedem ação", valor: acoes, anterior: 0, interpretacao: "negativa", tooltip: "Pendências operacionais consolidadas dos módulos monitorados.", origem: "cadastros, documentos, agenda, projetos, estoque e convênios", rotaDetalhe: "/dashboard/gerencial#itens-acao" })
        ];
    }
    async obterEvolucaoBeneficiarios(tenantId, periodo) {
        const rows = await this.query(`
      SELECT to_char(date_trunc('month', criado_em), 'YYYY-MM') AS periodo,
             COUNT(*)::bigint AS novos,
             COUNT(*) FILTER (WHERE COALESCE(UPPER(TRIM(status)), 'ATIVO') NOT IN ('INATIVO', 'BLOQUEADO', 'DESLIGADO'))::bigint AS ativos
      FROM cadastro_beneficiario
      ${await this.whereComTenant("cadastro_beneficiario", ["criado_em IS NOT NULL", "CAST(criado_em AS date) >= $2", "CAST(criado_em AS date) <= $3"])}
      GROUP BY date_trunc('month', criado_em)
      ORDER BY periodo ASC
      `, [tenantId, periodo.startDate, periodo.endDate]);
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
    async obterAtendimentos(tenantId, periodo) {
        const total = await this.contarAtendimentos(tenantId, periodo.startDate, periodo.endDate);
        const pessoasUnicas = await this.contarPessoasAtendidas(tenantId, periodo.startDate, periodo.endDate);
        const porStatus = await this.contarBuckets("central_atendimento", "status", tenantId, "data", periodo.startDate, periodo.endDate);
        const porTipo = await this.contarBuckets("central_atendimento", "tipo", tenantId, "data", periodo.startDate, periodo.endDate);
        const porDiaSemana = await this.query(`
      SELECT to_char(CAST(data AS date), 'ID') AS chave,
             to_char(CAST(data AS date), 'Dy') AS rotulo,
             COUNT(*)::bigint AS total
      FROM central_atendimento
      ${await this.whereComTenant("central_atendimento", ["data IS NOT NULL", "CAST(data AS date) >= $2", "CAST(data AS date) <= $3"])}
      GROUP BY to_char(CAST(data AS date), 'ID'), to_char(CAST(data AS date), 'Dy')
      ORDER BY chave
      `, [tenantId, periodo.startDate, periodo.endDate]).then((rows) => rows.map((row) => this.bucket(row)));
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
    async obterDoacoes(tenantId, periodo) {
        const [cestasEntregues, cestasAEntregar, cestasAtrasadas, porBairro, porTipo, planejadasPorPrioridade] = await Promise.all([
            this.contarCestasEntregues(tenantId, periodo.startDate, periodo.endDate),
            this.contarCestasAEntregar(tenantId, periodo.endDate),
            this.contarCestasAtrasadas(tenantId, periodo.endDate),
            this.obterCestasEntreguesPorBairro(tenantId, periodo),
            this.obterCestasEntreguesPorTipo(tenantId, periodo),
            this.obterCestasPlanejadasPorPrioridade(tenantId, periodo)
        ]);
        return {
            cestasEntregues,
            cestasAEntregar,
            cestasAtrasadas,
            porBairro,
            porTipo,
            planejadasPorPrioridade
        };
    }
    async obterCursos(tenantId, periodo) {
        if (!(await this.tabelaExiste("cursos_atendimentos_presencas"))) {
            return { aulasRegistradas: 0, presencas: 0, ausencias: 0, justificadas: 0, taxaAusencia: 0, porCurso: [], porStatus: [] };
        }
        const [resumoRows, porCurso, porStatus] = await Promise.all([
            this.query(`
        SELECT COUNT(DISTINCT data_aula)::bigint AS aulas,
               COUNT(*) FILTER (WHERE UPPER(TRIM(COALESCE(status, ''))) IN ('PRESENTE', 'PRESENCA', 'COMPARECEU'))::bigint AS presencas,
               COUNT(*) FILTER (WHERE UPPER(TRIM(COALESCE(status, ''))) IN ('FALTA', 'AUSENTE', 'AUSENCIA', 'NAO_COMPARECEU', 'NÃO_COMPARECEU'))::bigint AS ausencias,
               COUNT(*) FILTER (WHERE UPPER(TRIM(COALESCE(status, ''))) IN ('JUSTIFICADO', 'FALTA_JUSTIFICADA'))::bigint AS justificadas
        FROM cursos_atendimentos_presencas
        ${await this.whereComTenant("cursos_atendimentos_presencas", ["data_aula IS NOT NULL", "CAST(data_aula AS date) >= $2", "CAST(data_aula AS date) <= $3"])}
        `, [tenantId, periodo.startDate, periodo.endDate]),
            this.obterAusenciasPorCurso(tenantId, periodo),
            this.contarBuckets("cursos_atendimentos_presencas", "status", tenantId, "data_aula", periodo.startDate, periodo.endDate)
        ]);
        const resumo = resumoRows[0];
        const presencas = toNumber(resumo?.presencas);
        const ausencias = toNumber(resumo?.ausencias);
        const justificadas = toNumber(resumo?.justificadas);
        const totalLancamentos = presencas + ausencias + justificadas;
        return {
            aulasRegistradas: toNumber(resumo?.aulas),
            presencas,
            ausencias,
            justificadas,
            taxaAusencia: totalLancamentos ? Math.round(((ausencias + justificadas) / totalLancamentos) * 1000) / 10 : 0,
            porCurso,
            porStatus
        };
    }
    async obterEngajamento(tenantId, periodo) {
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
    async obterProjetos(tenantId) {
        if (!(await this.tabelaExiste("projetos")))
            return [];
        const rows = await this.query(`
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
      `, [tenantId]);
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
                periodoInicio: toDateOnly(row.data_inicio),
                periodoFim: toDateOnly(row.data_fim),
                beneficiariosPrevistos: toNumber(row.beneficiarios_previstos),
                beneficiariosAtendidos: 0,
                pessoasUnicasAtendidas: 0,
                atividadesPrevistas,
                atividadesRealizadas,
                metaAtingidaPercentual: atividadesPrevistas > 0 ? Math.round((atividadesRealizadas / atividadesPrevistas) * 1000) / 10 : 0,
                orcamentoPrevisto,
                valorExecutado,
                financeiroExecutadoPercentual: orcamentoPrevisto > 0 ? Math.round((valorExecutado / orcamentoPrevisto) * 1000) / 10 : null,
                prazoConsumidoPercentual: this.calcularPrazoConsumido(toDateOnly(row.data_inicio), toDateOnly(row.data_fim)),
                pendencias: toNumber(row.pendencias),
                proximoMarco: null,
                situacao: this.classificarProjeto(String(row.status ?? ""), toNumber(row.pendencias)),
                rotaDetalhe: "/setor-administrativo/projetos"
            };
        });
    }
    async obterPendencias(tenantId) {
        const [cadastrosIncompletos, docsVencidos, docsAVencer, agendamentosAtrasados, projetosPendentes, estoqueBaixo, termosVencidos] = await Promise.all([
            this.contarCadastrosIncompletos(tenantId),
            this.contarDocumentosInstituicao(tenantId, "vencido"),
            this.contarDocumentosInstituicao(tenantId, "vence_em_breve"),
            this.contarAgendamentosAtrasados(tenantId),
            this.contarProjetosComPendencias(tenantId),
            this.contarEstoqueBaixo(tenantId),
            this.contarTermosVencidos(tenantId)
        ]);
        const pendencias = [
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
    async obterEventos(tenantId) {
        if (!(await this.tabelaExiste("agendamento")))
            return [];
        const rows = await this.query(`
      SELECT id, titulo, data_inicio, horario_inicio, local, unidade, profissional_responsavel, status
      FROM agendamento
      ${await this.whereComTenant("agendamento", ["CAST(data_inicio AS date) >= CURRENT_DATE"])}
      ORDER BY data_inicio ASC NULLS LAST, horario_inicio ASC NULLS LAST
      LIMIT 12
      `, [tenantId]);
        return rows.map((row) => {
            const data = toDateOnly(row.data_inicio);
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
    async obterImpactoSocial(tenantId, periodo, permissoes) {
        const impacto = [
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
    async obterPerfilBeneficiarios(tenantId, permissoes) {
        return {
            faixaEtaria: await this.perfilFaixaEtaria(tenantId),
            sexo: this.temPermissao(permissoes, permissoesSensiveis) ? await this.contarBuckets("cadastro_beneficiario", "sexo_biologico", tenantId) : [],
            bairros: await this.contarBucketsEndereco("bairro", tenantId),
            cidades: await this.contarBucketsEndereco("cidade", tenantId),
            status: await this.contarBuckets("cadastro_beneficiario", "status", tenantId),
            idadePorBairro: await this.obterIdadePorBairro(tenantId)
        };
    }
    async obterOpcoes(tenantId) {
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
    montarAnalise(cards, atendimentos, projetos, pendencias, periodo, doacoes, cursos, riscoTerritorial) {
        const analises = [];
        const itensAcao = cards.find((item) => item.id === "itens-acao");
        if (itensAcao && itensAcao.valor > 0) {
            analises.push({ id: "pendencias", titulo: "Há itens que pedem ação", descricao: `${itensAcao.valor} pendência(s) foram consolidadas e precisam de acompanhamento gerencial.`, indicador: "Itens que pedem ação", periodo: `${periodo.startDate} a ${periodo.endDate}`, regra: "Soma das pendências abertas nos módulos monitorados.", origem: itensAcao.origem, rotaDetalhe: itensAcao.rotaDetalhe });
        }
        if (atendimentos.total > 0 && atendimentos.taxaAusencia >= 20) {
            analises.push({ id: "ausencias", titulo: "Taxa de ausência em atenção", descricao: `A ausência está em ${atendimentos.taxaAusencia}%, acima da faixa de atenção de 20%.`, indicador: "Taxa de ausência", periodo: `${periodo.startDate} a ${periodo.endDate}`, regra: "Faltas / atendimentos totais do período.", origem: "central_atendimento.status", rotaDetalhe: "/atendimentos/central-atendimentos" });
        }
        if (doacoes.cestasAtrasadas > 0) {
            analises.push({ id: "cestas-atrasadas", titulo: "Cestas atrasadas no planejamento", descricao: `${doacoes.cestasAtrasadas} cesta(s) planejadas estão vencidas e ainda não foram marcadas como entregues.`, indicador: "Cestas atrasadas", periodo: `${periodo.startDate} a ${periodo.endDate}`, regra: "Doações planejadas de cesta com data prevista vencida e status aberto.", origem: "doacao_planejada", rotaDetalhe: "/doacoes-realizadas" });
        }
        if (cursos.taxaAusencia >= 25 && cursos.ausencias > 0) {
            analises.push({ id: "ausencia-cursos", titulo: "Ausência em cursos acima do limite", descricao: `A ausência em cursos está em ${cursos.taxaAusencia}%, indicando necessidade de busca ativa.`, indicador: "Ausências em cursos", periodo: `${periodo.startDate} a ${periodo.endDate}`, regra: "Faltas e justificativas / lançamentos de frequência.", origem: "cursos_atendimentos_presencas", rotaDetalhe: "/cadastros/matriculas" });
        }
        const territorioCritico = riscoTerritorial[0];
        if (territorioCritico && territorioCritico.criticidade > 0) {
            analises.push({ id: "territorio-critico", titulo: "Território prioritário para gestão", descricao: `${territorioCritico.bairro} concentra ${territorioCritico.beneficiarios} beneficiário(s), ${territorioCritico.cestasAEntregar} cesta(s) a entregar e ${territorioCritico.ausenciasCurso} ausência(s) em cursos.`, indicador: "Risco territorial", periodo: `${periodo.startDate} a ${periodo.endDate}`, regra: "Beneficiários ativos + cestas pendentes ponderadas + ausências em cursos ponderadas.", origem: "cadastro_beneficiario, doacao_planejada e cursos_atendimentos_presencas" });
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
    resolverPeriodo(startDate, endDate) {
        const hoje = new Date();
        const end = endDate ?? hoje.toISOString().slice(0, 10);
        const start = startDate ?? subtrairDias(end, 29);
        if (start > end)
            throw new AppError("A data final deve ser maior ou igual a data inicial.", 422);
        const intervalo = diasEntre(start, end) + 1;
        const previousEndDate = subtrairDias(start, 1);
        const previousStartDate = subtrairDias(previousEndDate, intervalo - 1);
        return { startDate: start, endDate: end, previousStartDate, previousEndDate };
    }
    validarPermissao(authUser, permissoes) {
        if (!authUser)
            throw new AppError("Nao autenticado.", 401);
        if (!this.temPermissao(authUser.permissoes ?? [], permissoes)) {
            throw new AppError("Usuario autenticado nao possui permissao para executar esta acao.", 403);
        }
    }
    temPermissao(permissoesUsuario, permissoes) {
        return permissoesUsuario.some((permissao) => permissoes.includes(permissao));
    }
    async bloco(nome, _tenantId, fn, fallback) {
        try {
            return { dados: await fn(), avisos: [] };
        }
        catch (error) {
            console.warn(`[dashboard/gerencial] Falha no bloco ${nome}.`, error);
            return { dados: fallback, avisos: [`Não foi possível carregar o bloco ${nome}.`] };
        }
    }
    async contarBeneficiariosAtivos(tenantId, ate) {
        return this.total(`
      SELECT COUNT(*)::bigint AS total
      FROM cadastro_beneficiario
      ${await this.whereComTenant("cadastro_beneficiario", ["CAST(COALESCE(criado_em, NOW()) AS date) <= $2", "COALESCE(UPPER(TRIM(status)), 'ATIVO') NOT IN ('INATIVO', 'BLOQUEADO', 'DESLIGADO')"])}
      `, [tenantId, ate]);
    }
    async contarBeneficiariosCriados(tenantId, startDate, endDate) {
        return this.contarTabelaPeriodo("cadastro_beneficiario", tenantId, "criado_em", startDate, endDate);
    }
    async contarPessoasAtendidas(tenantId, startDate, endDate) {
        if (!(await this.tabelaExiste("central_atendimento")))
            return 0;
        return this.total(`
      SELECT COUNT(DISTINCT beneficiario_id)::bigint AS total
      FROM central_atendimento
      ${await this.whereComTenant("central_atendimento", ["beneficiario_id IS NOT NULL", "CAST(data AS date) >= $2", "CAST(data AS date) <= $3"])}
      `, [tenantId, startDate, endDate]);
    }
    async contarAtendimentos(tenantId, startDate, endDate) {
        return this.contarTabelaPeriodo("central_atendimento", tenantId, "data", startDate, endDate);
    }
    async contarAtividadesColetivas(tenantId, startDate, endDate) {
        const agendamentos = await this.contarTabelaPeriodo("agendamento", tenantId, "data_inicio", startDate, endDate);
        const presencas = await this.contarTabelaPeriodo("cursos_atendimentos_presencas", tenantId, "data_aula", startDate, endDate);
        return agendamentos + presencas;
    }
    async contarCestasEntregues(tenantId, startDate, endDate) {
        if (!(await this.tabelaExiste("doacao_realizada")))
            return 0;
        const possuiItens = (await this.tabelaExiste("doacao_realizada_item")) && (await this.tabelaExiste("almoxarifado_item"));
        const joinItens = possuiItens ? "LEFT JOIN doacao_realizada_item di ON di.doacao_realizada_id = dr.id LEFT JOIN almoxarifado_item ai ON ai.id = di.almoxarifado_item_id" : "";
        const textoCesta = possuiItens ? "COALESCE(dr.tipo_doacao, '') || ' ' || COALESCE(ai.descricao, '')" : "COALESCE(dr.tipo_doacao, '')";
        return this.total(`
      SELECT COUNT(DISTINCT dr.id)::bigint AS total
      FROM doacao_realizada dr
      ${joinItens}
      WHERE dr.tenant_id::text = $1
        AND CAST(dr.data_doacao AS date) >= $2
        AND CAST(dr.data_doacao AS date) <= $3
        AND UPPER(${textoCesta}) LIKE '%CESTA%'
      `, [tenantId, startDate, endDate]);
    }
    async contarCestasAEntregar(tenantId, endDate) {
        if (!(await this.tabelaExiste("doacao_planejada")))
            return 0;
        if (!(await this.tabelaExiste("almoxarifado_item")))
            return 0;
        return this.total(`
      SELECT COALESCE(SUM(dp.quantidade), 0) AS total
      FROM doacao_planejada dp
      INNER JOIN almoxarifado_item ai ON ai.id = dp.almoxarifado_item_id
      WHERE dp.tenant_id::text = $1
        AND dp.data_prevista <= $2
        AND UPPER(COALESCE(ai.descricao, '') || ' ' || COALESCE(dp.observacoes, '')) LIKE '%CESTA%'
        AND UPPER(TRIM(COALESCE(dp.status, ''))) NOT IN ('ENTREGUE', 'CONCLUIDO', 'CONCLUIDA', 'CANCELADO', 'CANCELADA')
      `, [tenantId, endDate]);
    }
    async contarCestasAtrasadas(tenantId, endDate) {
        if (!(await this.tabelaExiste("doacao_planejada")))
            return 0;
        if (!(await this.tabelaExiste("almoxarifado_item")))
            return 0;
        return this.total(`
      SELECT COALESCE(SUM(dp.quantidade), 0) AS total
      FROM doacao_planejada dp
      INNER JOIN almoxarifado_item ai ON ai.id = dp.almoxarifado_item_id
      WHERE dp.tenant_id::text = $1
        AND dp.data_prevista < LEAST($2::date, CURRENT_DATE)
        AND UPPER(COALESCE(ai.descricao, '') || ' ' || COALESCE(dp.observacoes, '')) LIKE '%CESTA%'
        AND UPPER(TRIM(COALESCE(dp.status, ''))) NOT IN ('ENTREGUE', 'CONCLUIDO', 'CONCLUIDA', 'CANCELADO', 'CANCELADA')
      `, [tenantId, endDate]);
    }
    async contarAusenciasCurso(tenantId, startDate, endDate) {
        if (!(await this.tabelaExiste("cursos_atendimentos_presencas")))
            return 0;
        return this.total(`
      SELECT COUNT(*)::bigint AS total
      FROM cursos_atendimentos_presencas
      ${await this.whereComTenant("cursos_atendimentos_presencas", ["data_aula IS NOT NULL", "CAST(data_aula AS date) >= $2", "CAST(data_aula AS date) <= $3", "UPPER(TRIM(COALESCE(status, ''))) IN ('FALTA', 'AUSENTE', 'AUSENCIA', 'NAO_COMPARECEU', 'NÃO_COMPARECEU', 'JUSTIFICADO', 'FALTA_JUSTIFICADA')"])}
      `, [tenantId, startDate, endDate]);
    }
    async contarProjetosAtivos(tenantId) {
        if (!(await this.tabelaExiste("projetos")))
            return 0;
        return this.total(`
      SELECT COUNT(*)::bigint AS total
      FROM projetos
      ${await this.whereComTenant("projetos", ["COALESCE(UPPER(TRIM(status)), 'ATIVO') NOT IN ('CONCLUIDO', 'SUSPENSO', 'CANCELADO', 'INATIVO')"])}
      `, [tenantId]);
    }
    async contarEventosAcoes(tenantId, startDate, endDate) {
        const [agendamentos, emprestimos] = await Promise.all([
            this.contarTabelaPeriodo("agendamento", tenantId, "data_inicio", startDate, endDate),
            this.contarTabelaPeriodo("emprestimos_eventos", tenantId, "data_retirada_prevista", startDate, endDate)
        ]);
        return agendamentos + emprestimos;
    }
    async contarItensAcao(tenantId) {
        const pendencias = await this.obterPendencias(tenantId);
        return pendencias.reduce((total, item) => total + item.quantidade, 0);
    }
    async contarCadastrosIncompletos(tenantId) {
        return this.total(`
      SELECT COUNT(*)::bigint AS total
      FROM cadastro_beneficiario
      ${await this.whereComTenant("cadastro_beneficiario", ["COALESCE(UPPER(TRIM(status)), '') IN ('INCOMPLETO', 'EM_ANALISE', 'DESATUALIZADO')"])}
      `, [tenantId]);
    }
    async contarDocumentosInstituicao(tenantId, situacao) {
        if (!(await this.tabelaExiste("documentos_instituicao")))
            return 0;
        return this.total(`
      SELECT COUNT(*)::bigint AS total
      FROM documentos_instituicao
      ${await this.whereComTenant("documentos_instituicao", ["COALESCE(situacao, '') = $2"])}
      `, [tenantId, situacao]);
    }
    async contarAgendamentosAtrasados(tenantId) {
        if (!(await this.tabelaExiste("agendamento")))
            return 0;
        return this.total(`
      SELECT COUNT(*)::bigint AS total
      FROM agendamento
      ${await this.whereComTenant("agendamento", ["CAST(data_inicio AS date) < CURRENT_DATE", "COALESCE(UPPER(TRIM(status)), '') NOT IN ('CONCLUIDO', 'REALIZADO', 'CANCELADO')"])}
      `, [tenantId]);
    }
    async contarProjetosComPendencias(tenantId) {
        if (!(await this.tabelaExiste("projeto_tarefas")))
            return 0;
        return this.total(`
      SELECT COUNT(*)::bigint AS total
      FROM projeto_tarefas t
      INNER JOIN projetos p ON p.id = t.projeto_id
      WHERE p.tenant_id::text = $1
        AND COALESCE(UPPER(TRIM(t.status)), '') NOT IN ('CONCLUIDA', 'CONCLUIDO', 'FINALIZADA', 'FINALIZADO')
      `, [tenantId]);
    }
    async contarEstoqueBaixo(tenantId) {
        if (!(await this.tabelaExiste("almoxarifado_item")))
            return 0;
        const possuiMinimo = await this.colunaExiste("almoxarifado_item", "estoque_minimo");
        if (!possuiMinimo)
            return 0;
        return this.total(`
      SELECT COUNT(*)::bigint AS total
      FROM almoxarifado_item
      ${await this.whereComTenant("almoxarifado_item", ["COALESCE(quantidade_atual, 0) <= COALESCE(estoque_minimo, 0)", "COALESCE(estoque_minimo, 0) > 0"])}
      `, [tenantId]);
    }
    async contarTermosVencidos(tenantId) {
        if (!(await this.tabelaExiste("termo_fomento")))
            return 0;
        return this.total(`
      SELECT COUNT(*)::bigint AS total
      FROM termo_fomento
      ${await this.whereComTenant("termo_fomento", ["vigencia_fim IS NOT NULL", "CAST(vigencia_fim AS date) < CURRENT_DATE"])}
      `, [tenantId]);
    }
    async contarBeneficiosConcedidos(tenantId, startDate, endDate) {
        const [beneficios, doacoes] = await Promise.all([
            this.contarTabelaPeriodo("central_beneficio", tenantId, "data", startDate, endDate),
            this.contarTabelaPeriodo("doacao_realizada", tenantId, "data_doacao", startDate, endDate)
        ]);
        return beneficios + doacoes;
    }
    async somarBeneficios(tenantId, startDate, endDate) {
        if (!(await this.tabelaExiste("central_beneficio")))
            return 0;
        return this.total(`
      SELECT COALESCE(SUM(valor_total), 0) AS total
      FROM central_beneficio
      ${await this.whereComTenant("central_beneficio", ["CAST(data AS date) >= $2", "CAST(data AS date) <= $3"])}
      `, [tenantId, startDate, endDate]);
    }
    async contarBairrosAlcancados(tenantId) {
        if (!(await this.tabelaExiste("cadastro_beneficiario")))
            return 0;
        return this.total(`
      SELECT COUNT(DISTINCT NULLIF(TRIM(e.bairro), ''))::bigint AS total
      FROM cadastro_beneficiario b
      LEFT JOIN endereco e ON e.id = b.endereco_id
      WHERE b.tenant_id::text = $1
      `, [tenantId]);
    }
    async obterIdadePorBairro(tenantId) {
        if (!(await this.tabelaExiste("cadastro_beneficiario")))
            return [];
        const rows = await this.query(`
      SELECT COALESCE(NULLIF(TRIM(e.bairro), ''), 'Não informado') AS bairro,
             COUNT(*)::bigint AS total,
             COUNT(*) FILTER (WHERE b.data_nascimento IS NOT NULL AND EXTRACT(YEAR FROM age(CURRENT_DATE, b.data_nascimento)) <= 11)::bigint AS criancas,
             COUNT(*) FILTER (WHERE b.data_nascimento IS NOT NULL AND EXTRACT(YEAR FROM age(CURRENT_DATE, b.data_nascimento)) BETWEEN 12 AND 17)::bigint AS adolescentes,
             COUNT(*) FILTER (WHERE b.data_nascimento IS NOT NULL AND EXTRACT(YEAR FROM age(CURRENT_DATE, b.data_nascimento)) BETWEEN 18 AND 24)::bigint AS jovens,
             COUNT(*) FILTER (WHERE b.data_nascimento IS NOT NULL AND EXTRACT(YEAR FROM age(CURRENT_DATE, b.data_nascimento)) BETWEEN 25 AND 59)::bigint AS adultos,
             COUNT(*) FILTER (WHERE b.data_nascimento IS NOT NULL AND EXTRACT(YEAR FROM age(CURRENT_DATE, b.data_nascimento)) >= 60)::bigint AS idosos,
             COUNT(*) FILTER (WHERE b.data_nascimento IS NULL)::bigint AS nao_informada
      FROM cadastro_beneficiario b
      LEFT JOIN endereco e ON e.id = b.endereco_id
      WHERE b.tenant_id::text = $1
        AND COALESCE(UPPER(TRIM(b.status)), 'ATIVO') NOT IN ('INATIVO', 'BLOQUEADO', 'DESLIGADO')
      GROUP BY COALESCE(NULLIF(TRIM(e.bairro), ''), 'Não informado')
      ORDER BY total DESC
      LIMIT 12
      `, [tenantId]);
        return rows.map((row) => ({
            bairro: String(row.bairro ?? "Não informado"),
            total: toNumber(row.total),
            criancas: toNumber(row.criancas),
            adolescentes: toNumber(row.adolescentes),
            jovens: toNumber(row.jovens),
            adultos: toNumber(row.adultos),
            idosos: toNumber(row.idosos),
            naoInformada: toNumber(row.nao_informada)
        }));
    }
    async obterCestasEntreguesPorBairro(tenantId, periodo) {
        if (!(await this.tabelaExiste("doacao_realizada")))
            return [];
        const possuiItens = (await this.tabelaExiste("doacao_realizada_item")) && (await this.tabelaExiste("almoxarifado_item"));
        const joinItens = possuiItens ? "LEFT JOIN doacao_realizada_item di ON di.doacao_realizada_id = dr.id LEFT JOIN almoxarifado_item ai ON ai.id = di.almoxarifado_item_id" : "";
        const textoCesta = possuiItens ? "COALESCE(dr.tipo_doacao, '') || ' ' || COALESCE(ai.descricao, '')" : "COALESCE(dr.tipo_doacao, '')";
        const rows = await this.query(`
      SELECT COALESCE(NULLIF(TRIM(e.bairro), ''), 'Não informado') AS chave,
             COALESCE(NULLIF(TRIM(e.bairro), ''), 'Não informado') AS rotulo,
             COUNT(DISTINCT dr.id)::bigint AS total
      FROM doacao_realizada dr
      ${joinItens}
      LEFT JOIN cadastro_beneficiario b ON b.id = dr.beneficiario_id
      LEFT JOIN endereco e ON e.id = b.endereco_id
      WHERE dr.tenant_id::text = $1
        AND CAST(dr.data_doacao AS date) >= $2
        AND CAST(dr.data_doacao AS date) <= $3
        AND UPPER(${textoCesta}) LIKE '%CESTA%'
      GROUP BY COALESCE(NULLIF(TRIM(e.bairro), ''), 'Não informado')
      ORDER BY total DESC
      LIMIT 12
      `, [tenantId, periodo.startDate, periodo.endDate]);
        return rows.map((row) => this.bucket(row));
    }
    async obterCestasEntreguesPorTipo(tenantId, periodo) {
        if (!(await this.tabelaExiste("doacao_realizada")))
            return [];
        const possuiItens = (await this.tabelaExiste("doacao_realizada_item")) && (await this.tabelaExiste("almoxarifado_item"));
        const joinItens = possuiItens ? "LEFT JOIN doacao_realizada_item di ON di.doacao_realizada_id = dr.id LEFT JOIN almoxarifado_item ai ON ai.id = di.almoxarifado_item_id" : "";
        const textoCesta = possuiItens ? "COALESCE(dr.tipo_doacao, '') || ' ' || COALESCE(ai.descricao, '')" : "COALESCE(dr.tipo_doacao, '')";
        const rows = await this.query(`
      SELECT COALESCE(NULLIF(TRIM(dr.tipo_doacao), ''), 'Não informado') AS chave,
             COALESCE(NULLIF(TRIM(dr.tipo_doacao), ''), 'Não informado') AS rotulo,
             COUNT(DISTINCT dr.id)::bigint AS total
      FROM doacao_realizada dr
      ${joinItens}
      WHERE dr.tenant_id::text = $1
        AND CAST(dr.data_doacao AS date) >= $2
        AND CAST(dr.data_doacao AS date) <= $3
        AND UPPER(${textoCesta}) LIKE '%CESTA%'
      GROUP BY COALESCE(NULLIF(TRIM(dr.tipo_doacao), ''), 'Não informado')
      ORDER BY total DESC
      LIMIT 8
      `, [tenantId, periodo.startDate, periodo.endDate]);
        return rows.map((row) => this.bucket(row));
    }
    async obterCestasPlanejadasPorPrioridade(tenantId, periodo) {
        if (!(await this.tabelaExiste("doacao_planejada")))
            return [];
        if (!(await this.tabelaExiste("almoxarifado_item")))
            return [];
        const rows = await this.query(`
      SELECT COALESCE(NULLIF(TRIM(dp.prioridade), ''), 'Sem prioridade') AS chave,
             COALESCE(NULLIF(TRIM(dp.prioridade), ''), 'Sem prioridade') AS rotulo,
             COALESCE(SUM(dp.quantidade), 0) AS total
      FROM doacao_planejada dp
      INNER JOIN almoxarifado_item ai ON ai.id = dp.almoxarifado_item_id
      WHERE dp.tenant_id::text = $1
        AND dp.data_prevista <= $2
        AND UPPER(COALESCE(ai.descricao, '') || ' ' || COALESCE(dp.observacoes, '')) LIKE '%CESTA%'
        AND UPPER(TRIM(COALESCE(dp.status, ''))) NOT IN ('ENTREGUE', 'CONCLUIDO', 'CONCLUIDA', 'CANCELADO', 'CANCELADA')
      GROUP BY COALESCE(NULLIF(TRIM(dp.prioridade), ''), 'Sem prioridade')
      ORDER BY total DESC
      LIMIT 8
      `, [tenantId, periodo.endDate]);
        return rows.map((row) => this.bucket(row));
    }
    async obterAusenciasPorCurso(tenantId, periodo) {
        if (!(await this.tabelaExiste("cursos_atendimentos_presencas")))
            return [];
        const possuiCursos = await this.tabelaExiste("cursos_atendimentos");
        const campoCurso = possuiCursos ? "COALESCE(NULLIF(TRIM(c.nome), ''), 'Curso não informado')" : "COALESCE(p.curso_id::text, 'Curso não informado')";
        const rows = await this.query(`
      SELECT ${campoCurso} AS chave,
             ${campoCurso} AS rotulo,
             COUNT(*)::bigint AS total
      FROM cursos_atendimentos_presencas p
      ${possuiCursos ? "LEFT JOIN cursos_atendimentos c ON c.id = p.curso_id" : ""}
      WHERE p.tenant_id::text = $1
        AND p.data_aula IS NOT NULL
        AND CAST(p.data_aula AS date) >= $2
        AND CAST(p.data_aula AS date) <= $3
        AND UPPER(TRIM(COALESCE(p.status, ''))) IN ('FALTA', 'AUSENTE', 'AUSENCIA', 'NAO_COMPARECEU', 'NÃO_COMPARECEU', 'JUSTIFICADO', 'FALTA_JUSTIFICADA')
      GROUP BY COALESCE(NULLIF(TRIM(c.nome), ''), 'Curso não informado')
      ORDER BY total DESC
      LIMIT 10
      `, [tenantId, periodo.startDate, periodo.endDate]);
        return rows.map((row) => this.bucket(row));
    }
    async obterRiscoTerritorial(tenantId, periodo) {
        if (!(await this.tabelaExiste("cadastro_beneficiario")))
            return [];
        const possuiDoacaoRealizada = await this.tabelaExiste("doacao_realizada");
        const possuiItensDoacao = (await this.tabelaExiste("doacao_realizada_item")) && (await this.tabelaExiste("almoxarifado_item"));
        const possuiDoacaoPlanejada = (await this.tabelaExiste("doacao_planejada")) && (await this.tabelaExiste("almoxarifado_item"));
        const possuiPresencasCurso = await this.tabelaExiste("cursos_atendimentos_presencas");
        const possuiMatriculasCurso = await this.tabelaExiste("cursos_atendimentos_matriculas");
        const joinItensEntregues = possuiItensDoacao ? "LEFT JOIN doacao_realizada_item di ON di.doacao_realizada_id = dr.id LEFT JOIN almoxarifado_item ai ON ai.id = di.almoxarifado_item_id" : "";
        const textoCestaEntregue = possuiItensDoacao ? "COALESCE(dr.tipo_doacao, '') || ' ' || COALESCE(ai.descricao, '')" : "COALESCE(dr.tipo_doacao, '')";
        const entreguesCte = possuiDoacaoRealizada
            ? `
      entregues AS (
        SELECT COALESCE(NULLIF(TRIM(e.bairro), ''), 'Não informado') AS bairro,
               COUNT(DISTINCT dr.id)::bigint AS cestas_entregues
        FROM doacao_realizada dr
        ${joinItensEntregues}
        LEFT JOIN cadastro_beneficiario b ON b.id = dr.beneficiario_id
        LEFT JOIN endereco e ON e.id = b.endereco_id
        WHERE dr.tenant_id::text = $1
          AND CAST(dr.data_doacao AS date) >= $2
          AND CAST(dr.data_doacao AS date) <= $3
          AND UPPER(${textoCestaEntregue}) LIKE '%CESTA%'
        GROUP BY COALESCE(NULLIF(TRIM(e.bairro), ''), 'Não informado')
      )`
            : "entregues AS (SELECT NULL::text AS bairro, 0::bigint AS cestas_entregues WHERE FALSE)";
        const planejadasCte = possuiDoacaoPlanejada
            ? `
      planejadas AS (
        SELECT COALESCE(NULLIF(TRIM(e.bairro), ''), 'Não informado') AS bairro,
               COALESCE(SUM(dp.quantidade), 0) AS cestas_a_entregar
        FROM doacao_planejada dp
        INNER JOIN almoxarifado_item ai ON ai.id = dp.almoxarifado_item_id
        LEFT JOIN cadastro_beneficiario b ON b.id = dp.beneficiario_id
        LEFT JOIN endereco e ON e.id = b.endereco_id
        WHERE dp.tenant_id::text = $1
          AND dp.data_prevista <= $3
          AND UPPER(COALESCE(ai.descricao, '') || ' ' || COALESCE(dp.observacoes, '')) LIKE '%CESTA%'
          AND UPPER(TRIM(COALESCE(dp.status, ''))) NOT IN ('ENTREGUE', 'CONCLUIDO', 'CONCLUIDA', 'CANCELADO', 'CANCELADA')
        GROUP BY COALESCE(NULLIF(TRIM(e.bairro), ''), 'Não informado')
      )`
            : "planejadas AS (SELECT NULL::text AS bairro, 0::numeric AS cestas_a_entregar WHERE FALSE)";
        const ausenciasCte = possuiPresencasCurso && possuiMatriculasCurso
            ? `
      ausencias AS (
        SELECT COALESCE(NULLIF(TRIM(e.bairro), ''), 'Não informado') AS bairro,
               COUNT(*)::bigint AS ausencias_curso
        FROM cursos_atendimentos_presencas p
        LEFT JOIN cursos_atendimentos_matriculas m ON m.id = p.matricula_id
        LEFT JOIN cadastro_beneficiario b ON b.cpf = m.cpf
        LEFT JOIN endereco e ON e.id = b.endereco_id
        WHERE p.tenant_id::text = $1
          AND CAST(p.data_aula AS date) >= $2
          AND CAST(p.data_aula AS date) <= $3
          AND UPPER(TRIM(COALESCE(p.status, ''))) IN ('FALTA', 'AUSENTE', 'AUSENCIA', 'NAO_COMPARECEU', 'NÃO_COMPARECEU', 'JUSTIFICADO', 'FALTA_JUSTIFICADA')
        GROUP BY COALESCE(NULLIF(TRIM(e.bairro), ''), 'Não informado')
      )`
            : "ausencias AS (SELECT NULL::text AS bairro, 0::bigint AS ausencias_curso WHERE FALSE)";
        const rows = await this.query(`
      WITH beneficiarios AS (
        SELECT COALESCE(NULLIF(TRIM(e.bairro), ''), 'Não informado') AS bairro,
               COUNT(*)::bigint AS beneficiarios
        FROM cadastro_beneficiario b
        LEFT JOIN endereco e ON e.id = b.endereco_id
        WHERE b.tenant_id::text = $1
          AND COALESCE(UPPER(TRIM(b.status)), 'ATIVO') NOT IN ('INATIVO', 'BLOQUEADO', 'DESLIGADO')
        GROUP BY COALESCE(NULLIF(TRIM(e.bairro), ''), 'Não informado')
      ),
      ${entreguesCte},
      ${planejadasCte},
      ${ausenciasCte}
      SELECT b.bairro,
             b.beneficiarios,
             COALESCE(e.cestas_entregues, 0) AS cestas_entregues,
             COALESCE(p.cestas_a_entregar, 0) AS cestas_a_entregar,
             COALESCE(a.ausencias_curso, 0) AS ausencias_curso
      FROM beneficiarios b
      LEFT JOIN entregues e ON e.bairro = b.bairro
      LEFT JOIN planejadas p ON p.bairro = b.bairro
      LEFT JOIN ausencias a ON a.bairro = b.bairro
      ORDER BY (b.beneficiarios + COALESCE(p.cestas_a_entregar, 0) * 3 + COALESCE(a.ausencias_curso, 0) * 2) DESC
      LIMIT 12
      `, [tenantId, periodo.startDate, periodo.endDate]);
        return rows.map((row) => {
            const beneficiarios = toNumber(row.beneficiarios);
            const cestasAEntregar = toNumber(row.cestas_a_entregar);
            const ausenciasCurso = toNumber(row.ausencias_curso);
            return {
                bairro: String(row.bairro ?? "Não informado"),
                beneficiarios,
                cestasEntregues: toNumber(row.cestas_entregues),
                cestasAEntregar,
                ausenciasCurso,
                criticidade: beneficiarios + cestasAEntregar * 3 + ausenciasCurso * 2
            };
        });
    }
    async perfilFaixaEtaria(tenantId) {
        if (!(await this.tabelaExiste("cadastro_beneficiario")))
            return [];
        const rows = await this.query(`
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
      `, [tenantId]);
        return rows.map((row) => this.bucket(row));
    }
    async contarBuckets(tabela, coluna, tenantId, dataColuna, startDate, endDate) {
        if (!(await this.tabelaExiste(tabela)) || !(await this.colunaExiste(tabela, coluna)))
            return [];
        const condicoes = dataColuna && startDate && endDate
            ? [`CAST(${dataColuna} AS date) >= $2`, `CAST(${dataColuna} AS date) <= $3`]
            : [];
        const params = dataColuna && startDate && endDate ? [tenantId, startDate, endDate] : [tenantId];
        const rows = await this.query(`
      SELECT COALESCE(NULLIF(TRIM(${coluna}), ''), 'Não informado') AS chave,
             COUNT(*)::bigint AS total
      FROM ${tabela}
      ${await this.whereComTenant(tabela, condicoes)}
      GROUP BY COALESCE(NULLIF(TRIM(${coluna}), ''), 'Não informado')
      ORDER BY total DESC
      LIMIT 12
      `, params);
        return rows.map((row) => this.bucket(row));
    }
    async contarBucketsEndereco(coluna, tenantId) {
        if (!(await this.tabelaExiste("cadastro_beneficiario")))
            return [];
        const rows = await this.query(`
      SELECT COALESCE(NULLIF(TRIM(e.${coluna}), ''), 'Não informado') AS chave,
             COUNT(*)::bigint AS total
      FROM cadastro_beneficiario b
      LEFT JOIN endereco e ON e.id = b.endereco_id
      WHERE b.tenant_id::text = $1
      GROUP BY COALESCE(NULLIF(TRIM(e.${coluna}), ''), 'Não informado')
      ORDER BY total DESC
      LIMIT 12
      `, [tenantId]);
        return rows.map((row) => this.bucket(row));
    }
    async distintos(tabela, coluna, tenantId) {
        if (!(await this.tabelaExiste(tabela)) || !(await this.colunaExiste(tabela, coluna)))
            return [];
        const rows = await this.query(`
      SELECT DISTINCT NULLIF(TRIM(${coluna}), '') AS valor
      FROM ${tabela}
      ${await this.whereComTenant(tabela, [`NULLIF(TRIM(${coluna}), '') IS NOT NULL`])}
      ORDER BY valor ASC
      LIMIT 80
      `, [tenantId]);
        return rows.map((row) => row.valor).filter((valor) => Boolean(valor));
    }
    async distintosEndereco(coluna, tenantId) {
        if (!(await this.tabelaExiste("cadastro_beneficiario")))
            return [];
        const rows = await this.query(`
      SELECT DISTINCT NULLIF(TRIM(e.${coluna}), '') AS valor
      FROM cadastro_beneficiario b
      LEFT JOIN endereco e ON e.id = b.endereco_id
      WHERE b.tenant_id::text = $1
        AND NULLIF(TRIM(e.${coluna}), '') IS NOT NULL
      ORDER BY valor ASC
      LIMIT 80
      `, [tenantId]);
        return rows.map((row) => row.valor).filter((valor) => Boolean(valor));
    }
    async contarTabela(tabela, tenantId) {
        if (!(await this.tabelaExiste(tabela)))
            return 0;
        return this.total(`SELECT COUNT(*)::bigint AS total FROM ${tabela} ${await this.whereTenant(tabela)}`, [tenantId]);
    }
    async contarTabelaPeriodo(tabela, tenantId, dataColuna, startDate, endDate) {
        if (!(await this.tabelaExiste(tabela)) || !(await this.colunaExiste(tabela, dataColuna)))
            return 0;
        return this.total(`
      SELECT COUNT(*)::bigint AS total
      FROM ${tabela}
      ${await this.whereComTenant(tabela, [`CAST(${dataColuna} AS date) >= $2`, `CAST(${dataColuna} AS date) <= $3`])}
      `, [tenantId, startDate, endDate]);
    }
    calcularPrazoConsumido(inicio, fim) {
        if (!inicio || !fim)
            return 0;
        const total = diasEntre(inicio, fim);
        if (total <= 0)
            return 0;
        return Math.max(0, Math.min(100, Math.round((diasEntre(inicio, new Date().toISOString().slice(0, 10)) / total) * 1000) / 10));
    }
    classificarProjeto(status, pendencias) {
        const normalizado = status.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
        if (normalizado.includes("CONCLUID"))
            return "concluido";
        if (normalizado.includes("SUSPENS"))
            return "suspenso";
        if (pendencias >= 10)
            return "critico";
        if (pendencias > 0)
            return "atencao";
        if (normalizado.includes("ATRAS"))
            return "atrasado";
        if (normalizado.includes("ATIV") || normalizado.includes("EXEC"))
            return "dentro_da_meta";
        return "sem_dados_suficientes";
    }
    bucket(row) {
        const rotulo = row.rotulo ?? row.chave ?? "Não informado";
        return { chave: String(row.chave ?? rotulo), rotulo: String(rotulo), total: toNumber(row.total) };
    }
    async whereTenant(tabela, alias) {
        if (!(await this.colunaExiste(tabela, "tenant_id")))
            return "";
        return `WHERE ${(alias ?? tabela)}.tenant_id::text = $1`;
    }
    async whereComTenant(tabela, condicoes, alias) {
        const tenant = await this.whereTenant(tabela, alias);
        const prefixo = tenant ? [tenant.replace(/^WHERE\s+/i, "")] : [];
        const todas = [...prefixo, ...condicoes];
        return todas.length ? `WHERE ${todas.join(" AND ")}` : "";
    }
    async total(sql, params) {
        const rows = await this.query(sql, params);
        return toNumber(rows[0]?.total);
    }
    async query(sql, params) {
        try {
            return await prisma.$queryRawUnsafe(sql, ...params);
        }
        catch (error) {
            console.warn("[dashboard/gerencial] Falha ao executar consulta.", error);
            return [];
        }
    }
    async tabelaExiste(tabela) {
        if (this.tabelaCache.has(tabela))
            return this.tabelaCache.get(tabela);
        const rows = await this.query("SELECT to_regclass($1) IS NOT NULL AS existe", [`public.${tabela}`]);
        const existe = !!rows[0]?.existe;
        this.tabelaCache.set(tabela, existe);
        return existe;
    }
    async colunaExiste(tabela, coluna) {
        const key = `${tabela}.${coluna}`;
        if (this.colunaCache.has(key))
            return this.colunaCache.get(key);
        if (!(await this.tabelaExiste(tabela))) {
            this.colunaCache.set(key, false);
            return false;
        }
        const rows = await this.query(`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = $1
          AND column_name = $2
      ) AS existe
      `, [tabela, coluna]);
        const existe = !!rows[0]?.existe;
        this.colunaCache.set(key, existe);
        return existe;
    }
}
