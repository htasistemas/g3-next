import { AppError } from "../../../shared/errors/app-error.js";
import { TtlCache } from "../../../shared/cache/ttl-cache.js";
import { dashboardPowerBiFiltrosSchema } from "../power-bi.schema.js";
import { DashboardPowerBiRepository } from "../repositories/dashboard-power-bi.repository.js";
function formatarIsoDate(data) {
    return data.toISOString().slice(0, 10);
}
function arredondarUmaCasa(valor) {
    return Math.round(valor * 10) / 10;
}
function calcularTendencia(atual, anterior) {
    if (atual > anterior)
        return "subiu";
    if (atual < anterior)
        return "caiu";
    return "estavel";
}
function diferencaDias(inicio, fim) {
    const dataInicio = new Date(`${inicio}T00:00:00.000Z`);
    const dataFim = new Date(`${fim}T00:00:00.000Z`);
    const diferenca = Math.floor((dataFim.getTime() - dataInicio.getTime()) / 86_400_000);
    return Math.max(diferenca, 0);
}
export class DashboardPowerBiService {
    repository = new DashboardPowerBiRepository();
    cache = new TtlCache(120_000, 40);
    detalhamentoCache = new TtlCache(120_000, 120);
    async obterPowerBi(rawFilters, usuario) {
        const filtros = this.normalizarFiltros(rawFilters);
        const filtrosPeriodoAnterior = this.calcularPeriodoAnterior(filtros);
        const mascararIdentificacao = this.deveMascararIdentificacao(usuario);
        console.info("[dashboard/power-bi] acesso", {
            usuarioId: usuario?.id ?? null,
            nomeUsuario: usuario?.nomeUsuario ?? null,
            periodPreset: filtros.periodPreset,
            startDate: filtros.startDate,
            endDate: filtros.endDate
        });
        const cacheKey = this.criarCacheKey(filtros, mascararIdentificacao);
        return this.cache.getOrSet(cacheKey, async () => this.gerarPowerBi(filtros, filtrosPeriodoAnterior, mascararIdentificacao));
    }
    async obterDetalhamento(detalhamentoId, rawFilters, usuario) {
        const filtros = this.normalizarFiltros(rawFilters);
        const mascararIdentificacao = this.deveMascararIdentificacao(usuario);
        const cacheKey = this.criarCacheKey(filtros, mascararIdentificacao, detalhamentoId);
        return this.detalhamentoCache.getOrSet(cacheKey, async () => this.repository.obterDetalhamento(detalhamentoId, filtros, mascararIdentificacao));
    }
    async gerarPowerBi(filtros, filtrosPeriodoAnterior, mascararIdentificacao) {
        const [filtrosDisponiveis, totalFamilias, totalBeneficiarios, grupoStatus, novasInscricoes, totalAtendimentos, atendimentosMes, totalEncaminhamentos, totalBeneficios, totalVisitas, pendencias, casosPrioritarios, documentacoesPendentes, projetosAtivos, acoesColetivas, participantesOficinas, instituicoesParceiras, conveniosAtivos, familiasAcompanhamento, seriesCadastros, seriesAtendimentos, statusDistribuicao, familiasPorBairro, beneficiariosPorFaixaEtaria, beneficiariosPorGenero, beneficiariosPorTerritorio, faixaRenda, porTecnico, porUnidade, porTipoAtendimento, presenciaisRemotos, casosAbertosEncerrados, beneficiosPorMes, beneficiosPorTipo, beneficiosDeferidosIndeferidos, encaminhamentosPorMes, encaminhamentosPorTipo, encaminhamentosPorInstituicao, encaminhamentosPendentesRetorno, participacaoPorMes, projetosPorAdesao, participacaoFaixaEtariaProjeto, conveniosPorTipo, conveniosPorInstituicao, conveniosPorVencimento, pendenciasCriticas, indicadoresResumo, detalhamentos, totalFamiliasAnterior, totalBeneficiariosAnterior, novasInscricoesAnterior, totalAtendimentosAnterior, totalEncaminhamentosAnterior, totalBeneficiosAnterior, pendenciasAnterior] = await Promise.all([
            this.repository.listarOpcoesFiltros(),
            this.repository.contarFamilias(filtros),
            this.repository.contarBeneficiarios(filtros),
            this.repository.contarBeneficiariosPorGrupoStatus(filtros),
            this.repository.contarNovosCadastros(filtros),
            this.repository.contarAtendimentos(filtros),
            this.repository.contarAtendimentos(this.criarFiltrosMesAtual(filtros)),
            this.repository.contarEncaminhamentos(filtros),
            this.repository.contarBeneficios(filtros),
            this.repository.contarVisitasDomiciliares(filtros),
            this.repository.contarPendencias(filtros),
            this.repository.contarCasosPrioritarios(filtros),
            this.repository.contarDocumentacoesPendentes(filtros),
            this.repository.contarProjetosAtivos(filtros),
            this.repository.contarAcoesColetivas(filtros),
            this.repository.contarParticipantesOficinas(filtros),
            this.repository.contarInstituicoesParceiras(filtros),
            this.repository.contarConveniosAtivos(),
            this.repository.contarFamiliasAcompanhamento(filtros),
            this.repository.listarCadastrosPorMes(filtros),
            this.repository.listarAtendimentosPorMes(filtros),
            this.repository.listarBeneficiariosPorStatus(filtros),
            this.repository.listarFamiliasPorBairro(filtros),
            this.repository.listarBeneficiariosPorFaixaEtaria(filtros),
            this.repository.listarBeneficiariosPorGenero(filtros),
            this.repository.listarBeneficiariosPorTerritorio(filtros),
            this.repository.listarFamiliasPorFaixaRenda(filtros),
            this.repository.listarAtendimentosPorTecnico(filtros),
            this.repository.listarAtendimentosPorUnidade(filtros),
            this.repository.listarAtendimentosPorTipo(filtros),
            this.repository.listarAtendimentosPresenciaisRemotos(filtros),
            this.repository.listarCasosAbertosEncerrados(filtros),
            this.repository.listarBeneficiosPorMes(filtros),
            this.repository.listarBeneficiosPorTipo(filtros),
            this.repository.listarBeneficiosDeferidosIndeferidos(filtros),
            this.repository.listarEncaminhamentosPorMes(filtros),
            this.repository.listarEncaminhamentosPorTipo(filtros),
            this.repository.listarEncaminhamentosPorInstituicao(filtros),
            this.repository.listarEncaminhamentosPendentesRetorno(filtros),
            this.repository.listarParticipacaoPorMes(filtros),
            this.repository.listarProjetosPorAdesao(filtros),
            this.repository.listarParticipacaoPorFaixaEtariaProjeto(filtros),
            this.repository.listarConveniosPorTipo(),
            this.repository.listarConveniosPorInstituicao(),
            this.repository.listarConveniosPorVencimento(),
            this.repository.listarPendenciasCriticas(filtros),
            this.repository.calcularIndicadoresResumo(filtros),
            Promise.resolve({}),
            this.repository.contarFamilias(filtrosPeriodoAnterior),
            this.repository.contarBeneficiarios(filtrosPeriodoAnterior),
            this.repository.contarNovosCadastros(filtrosPeriodoAnterior),
            this.repository.contarAtendimentos(filtrosPeriodoAnterior),
            this.repository.contarEncaminhamentos(filtrosPeriodoAnterior),
            this.repository.contarBeneficios(filtrosPeriodoAnterior),
            this.repository.contarPendencias(filtrosPeriodoAnterior)
        ]);
        const territorial = familiasPorBairro;
        const rankingUnidades = porUnidade;
        const cardsGerenciais = [
            this.criarCard("familias", "Total de famílias cadastradas", totalFamilias, totalFamiliasAnterior, "Famílias acompanhadas no recorte atual.", "users-round", "familias"),
            this.criarCard("beneficiarios", "Total de beneficiários cadastrados", totalBeneficiarios, totalBeneficiariosAnterior, "Beneficiários localizados para os filtros atuais.", "user-round", "beneficiarios"),
            this.criarCard("familiasAcompanhamento", "Famílias em acompanhamento", familiasAcompanhamento, totalFamiliasAnterior, "Famílias com técnico ou serviço de acompanhamento informado.", "hand-heart", "familias"),
            this.criarCard("beneficiariosAtivos", "Beneficiários ativos", grupoStatus.ativos, grupoStatus.ativos, "Cadastros ativos ou em situação regular.", "badge-check", "beneficiarios"),
            this.criarCard("beneficiariosInativos", "Beneficiários inativos", grupoStatus.inativos, grupoStatus.inativos, "Cadastros inativos ou bloqueados.", "user-x", "beneficiarios"),
            this.criarCard("novosCadastros", "Novos cadastros no período", novasInscricoes, novasInscricoesAnterior, "Cadastros criados no período filtrado.", "sparkles", "beneficiarios"),
            this.criarCard("atendimentos", "Total de atendimentos realizados", totalAtendimentos, totalAtendimentosAnterior, "Visitas e atendimentos registrados no período.", "activity", "atendimentos"),
            this.criarCard("atendimentosMes", "Atendimentos no mês", atendimentosMes, totalAtendimentosAnterior, "Visitas registradas no mês corrente.", "calendar-range", "atendimentos"),
            this.criarCard("porTecnico", "Atendimentos por técnico", porTecnico[0]?.valor ?? 0, porTecnico[1]?.valor ?? 0, "Maior volume de atendimentos por técnico no recorte.", "stethoscope", "atendimentos"),
            this.criarCard("encaminhamentos", "Encaminhamentos realizados", totalEncaminhamentos, totalEncaminhamentosAnterior, "Encaminhamentos para rede e empregabilidade.", "send", "encaminhamentos"),
            this.criarCard("beneficios", "Benefícios concedidos", totalBeneficios, totalBeneficiosAnterior, "Concessões sociais registradas no período.", "gift", "beneficios"),
            this.criarCard("visitas", "Visitas domiciliares realizadas", totalVisitas, totalAtendimentosAnterior, "Visitas domiciliares concluídas no recorte.", "house", "atendimentos"),
            this.criarCard("pendencias", "Pendências em aberto", pendencias, pendenciasAnterior, "Tarefas e demandas em aberto para acompanhamento.", "badge-alert", "alertas"),
            this.criarCard("prioritarios", "Casos prioritários / vulnerabilidade alta", casosPrioritarios, casosPrioritarios, "Beneficiários ou famílias com vulnerabilidade alta.", "shield-alert", "beneficiarios"),
            this.criarCard("documentos", "Documentações pendentes", documentacoesPendentes, documentacoesPendentes, "Cadastros com documentação obrigatória pendente.", "files", "alertas"),
            this.criarCard("projetos", "Projetos ativos", projetosAtivos, projetosAtivos, "Projetos, cursos e serviços ativos.", "folder-open", undefined),
            this.criarCard("acoes", "Oficinas / ações coletivas realizadas", acoesColetivas, acoesColetivas, "Ações coletivas registradas no período.", "image-icon", undefined),
            this.criarCard("participantes", "Participantes em oficinas", participantesOficinas, participantesOficinas, "Participações registradas em cursos e oficinas.", "users", undefined),
            this.criarCard("parceiras", "Quantidade de instituições parceiras", instituicoesParceiras, instituicoesParceiras, "Instituições parceiras vinculadas aos projetos e convênios.", "building-2", "convenios"),
            this.criarCard("convenios", "Quantidade de convênios ativos", conveniosAtivos, conveniosAtivos, "Convênios ativos e em vigência.", "landmark", "convenios")
        ];
        return {
            atualizadoEm: new Date().toISOString(),
            filtrosAplicados: filtros,
            filtrosDisponiveis,
            cardsGerenciais,
            indicadoresResumo: {
                ...indicadoresResumo,
                composicaoFamiliarMedia: arredondarUmaCasa(indicadoresResumo.composicaoFamiliarMedia),
                tempoMedioEntreAtendimentosDias: arredondarUmaCasa(indicadoresResumo.tempoMedioEntreAtendimentosDias),
                tempoMedioConcessaoDias: arredondarUmaCasa(indicadoresResumo.tempoMedioConcessaoDias),
                taxaRetornoRede: arredondarUmaCasa(indicadoresResumo.taxaRetornoRede),
                taxaPresenca: arredondarUmaCasa(indicadoresResumo.taxaPresenca)
            },
            visaoGeral: {
                resumo: [
                    { nome: "Beneficiários", valor: totalBeneficiarios },
                    { nome: "Famílias", valor: totalFamilias },
                    { nome: "Atendimentos", valor: totalAtendimentos },
                    { nome: "Encaminhamentos", valor: totalEncaminhamentos }
                ],
                series: seriesAtendimentos,
                distribuicoes: statusDistribuicao,
                rankings: rankingUnidades,
                tabelaId: "beneficiarios",
                statusDistribuicao,
                territorial,
                rankingUnidades
            },
            cadastrosSociais: {
                resumo: [
                    { nome: "Composição familiar média", valor: arredondarUmaCasa(indicadoresResumo.composicaoFamiliarMedia) },
                    { nome: "Famílias com crianças", valor: indicadoresResumo.familiasComCriancas },
                    { nome: "Famílias com idosos", valor: indicadoresResumo.familiasComIdosos },
                    { nome: "Famílias com PCD", valor: indicadoresResumo.familiasComPcd },
                    { nome: "Famílias monoparentais", valor: indicadoresResumo.familiasMonoparentais }
                ],
                series: seriesCadastros,
                distribuicoes: familiasPorBairro,
                rankings: territorial,
                tabelaId: "beneficiarios",
                faixasEtarias: beneficiariosPorFaixaEtaria,
                generos: beneficiariosPorGenero,
                territorios: beneficiariosPorTerritorio,
                ativosInativos: [
                    { nome: "Ativos", valor: grupoStatus.ativos },
                    { nome: "Inativos", valor: grupoStatus.inativos }
                ],
                faixaRenda
            },
            atendimentos: {
                resumo: [
                    { nome: "Tempo médio entre atendimentos (dias)", valor: arredondarUmaCasa(indicadoresResumo.tempoMedioEntreAtendimentosDias) },
                    { nome: "Casos sem atualização", valor: indicadoresResumo.casosSemAtualizacao }
                ],
                series: seriesAtendimentos,
                distribuicoes: porTipoAtendimento,
                rankings: porTecnico,
                tabelaId: "atendimentos",
                porTecnico,
                porUnidade,
                porTipo: porTipoAtendimento,
                presenciaisRemotos,
                casosAbertosEncerrados
            },
            beneficiosConcessoes: {
                resumo: [
                    { nome: "Benefícios concedidos", valor: totalBeneficios },
                    { nome: "Tempo médio de concessão (dias)", valor: arredondarUmaCasa(indicadoresResumo.tempoMedioConcessaoDias) }
                ],
                series: beneficiosPorMes,
                distribuicoes: beneficiosPorTipo,
                rankings: beneficiosDeferidosIndeferidos,
                tabelaId: "beneficios",
                porTipo: beneficiosPorTipo,
                deferidosIndeferidos: beneficiosDeferidosIndeferidos
            },
            acompanhamentoSocial: {
                resumo: [
                    { nome: "Famílias em acompanhamento", valor: familiasAcompanhamento },
                    { nome: "Casos prioritários", valor: casosPrioritarios },
                    { nome: "Sem atualização", valor: indicadoresResumo.casosSemAtualizacao }
                ],
                series: seriesCadastros,
                distribuicoes: territorial,
                rankings: porTecnico,
                tabelaId: "familias",
                porVulnerabilidade: territorial,
                porResponsavel: porTecnico
            },
            encaminhamentosRede: {
                resumo: [
                    { nome: "Encaminhamentos", valor: totalEncaminhamentos },
                    { nome: "Taxa de retorno da rede (%)", valor: arredondarUmaCasa(indicadoresResumo.taxaRetornoRede) }
                ],
                series: encaminhamentosPorMes,
                distribuicoes: encaminhamentosPorTipo,
                rankings: encaminhamentosPorInstituicao,
                tabelaId: "encaminhamentos",
                porTipo: encaminhamentosPorTipo,
                porInstituicao: encaminhamentosPorInstituicao,
                pendentesRetorno: encaminhamentosPendentesRetorno
            },
            projetosAcoes: {
                resumo: [
                    { nome: "Projetos ativos", valor: projetosAtivos },
                    { nome: "Ações coletivas", valor: acoesColetivas },
                    { nome: "Taxa de presença (%)", valor: arredondarUmaCasa(indicadoresResumo.taxaPresenca) }
                ],
                series: participacaoPorMes,
                distribuicoes: projetosPorAdesao,
                rankings: projetosPorAdesao,
                porOficina: projetosPorAdesao,
                participacaoFaixaEtaria: participacaoFaixaEtariaProjeto
            },
            conveniosParcerias: {
                resumo: [
                    { nome: "Convênios ativos", valor: conveniosAtivos },
                    { nome: "Instituições parceiras", valor: instituicoesParceiras },
                    { nome: "A vencer em 60 dias", valor: conveniosPorVencimento.find((item) => item.nome === "A vencer")?.valor ?? 0 }
                ],
                distribuicoes: conveniosPorTipo,
                rankings: conveniosPorInstituicao,
                tabelaId: "convenios",
                porTipo: conveniosPorTipo,
                porInstituicao: conveniosPorInstituicao,
                vencimentos: conveniosPorVencimento
            },
            pendenciasAlertas: {
                resumo: [
                    { nome: "Pendências em aberto", valor: pendencias },
                    { nome: "Documentações pendentes", valor: documentacoesPendentes },
                    { nome: "Convênios vencidos", valor: conveniosPorVencimento.find((item) => item.nome === "Vencidos")?.valor ?? 0 }
                ],
                distribuicoes: pendenciasCriticas,
                rankings: pendenciasCriticas,
                tabelaId: "alertas",
                criticos: pendenciasCriticas
            },
            detalhamentos
        };
    }
    deveMascararIdentificacao(usuario) {
        return !(usuario?.permissoes ?? []).some((permissao) => ["ADMINISTRADOR", "OPERADOR"].includes(permissao));
    }
    criarCacheKey(filtros, mascararIdentificacao, detalhamentoId) {
        return JSON.stringify({
            mascararIdentificacao,
            detalhamentoId: detalhamentoId ?? null,
            filtros: {
                ...filtros,
                unidades: [...filtros.unidades].sort(),
                municipios: [...filtros.municipios].sort(),
                bairros: [...filtros.bairros].sort(),
                programas: [...filtros.programas].sort(),
                situacoesCadastro: [...filtros.situacoesCadastro].sort(),
                faixasEtarias: [...filtros.faixasEtarias].sort(),
                generos: [...filtros.generos].sort(),
                responsaveisTecnicos: [...filtros.responsaveisTecnicos].sort(),
                tiposAtendimento: [...filtros.tiposAtendimento].sort(),
                origensEncaminhamento: [...filtros.origensEncaminhamento].sort(),
                statusAcompanhamento: [...filtros.statusAcompanhamento].sort()
            }
        });
    }
    normalizarFiltros(rawFilters) {
        const parsed = dashboardPowerBiFiltrosSchema.parse(rawFilters);
        const periodo = this.resolverPeriodo(parsed);
        if (!periodo.startDate || !periodo.endDate) {
            throw new AppError("Nao foi possivel definir o periodo do painel Power BI.", 422);
        }
        return {
            periodPreset: periodo.periodPreset,
            startDate: periodo.startDate,
            endDate: periodo.endDate,
            unidades: parsed.unidades ?? [],
            municipios: parsed.municipios ?? [],
            bairros: parsed.bairros ?? [],
            programas: parsed.programas ?? [],
            situacoesCadastro: parsed.situacoesCadastro ?? [],
            faixasEtarias: parsed.faixasEtarias ?? [],
            generos: parsed.generos ?? [],
            responsaveisTecnicos: parsed.responsaveisTecnicos ?? [],
            tiposAtendimento: parsed.tiposAtendimento ?? [],
            origensEncaminhamento: parsed.origensEncaminhamento ?? [],
            statusAcompanhamento: parsed.statusAcompanhamento ?? [],
            familiaBeneficiario: parsed.familiaBeneficiario ?? "",
            tecnicoUsuario: parsed.tecnicoUsuario ?? ""
        };
    }
    resolverPeriodo(filtros) {
        const hoje = new Date();
        const hojeUtc = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate()));
        const periodPreset = filtros.periodPreset ?? "ultimos30dias";
        if (periodPreset === "personalizado" && filtros.startDate && filtros.endDate) {
            return {
                periodPreset,
                startDate: filtros.startDate,
                endDate: filtros.endDate
            };
        }
        if (periodPreset === "hoje") {
            const iso = formatarIsoDate(hojeUtc);
            return { periodPreset, startDate: iso, endDate: iso };
        }
        if (periodPreset === "ultimos7dias") {
            const inicio = new Date(hojeUtc);
            inicio.setUTCDate(inicio.getUTCDate() - 6);
            return { periodPreset, startDate: formatarIsoDate(inicio), endDate: formatarIsoDate(hojeUtc) };
        }
        if (periodPreset === "mesAtual") {
            const inicio = new Date(Date.UTC(hojeUtc.getUTCFullYear(), hojeUtc.getUTCMonth(), 1));
            return { periodPreset, startDate: formatarIsoDate(inicio), endDate: formatarIsoDate(hojeUtc) };
        }
        if (periodPreset === "anoAtual") {
            const inicio = new Date(Date.UTC(hojeUtc.getUTCFullYear(), 0, 1));
            return { periodPreset, startDate: formatarIsoDate(inicio), endDate: formatarIsoDate(hojeUtc) };
        }
        const inicio = new Date(hojeUtc);
        inicio.setUTCDate(inicio.getUTCDate() - 29);
        return {
            periodPreset: "ultimos30dias",
            startDate: formatarIsoDate(inicio),
            endDate: formatarIsoDate(hojeUtc)
        };
    }
    calcularPeriodoAnterior(filtros) {
        const totalDias = diferencaDias(filtros.startDate, filtros.endDate) + 1;
        const inicioAtual = new Date(`${filtros.startDate}T00:00:00.000Z`);
        const fimAnterior = new Date(inicioAtual);
        fimAnterior.setUTCDate(fimAnterior.getUTCDate() - 1);
        const inicioAnterior = new Date(fimAnterior);
        inicioAnterior.setUTCDate(inicioAnterior.getUTCDate() - (totalDias - 1));
        return {
            ...filtros,
            periodPreset: "personalizado",
            startDate: formatarIsoDate(inicioAnterior),
            endDate: formatarIsoDate(fimAnterior)
        };
    }
    criarFiltrosMesAtual(filtros) {
        const fim = new Date(`${filtros.endDate}T00:00:00.000Z`);
        const inicio = new Date(Date.UTC(fim.getUTCFullYear(), fim.getUTCMonth(), 1));
        return {
            ...filtros,
            periodPreset: "mesAtual",
            startDate: formatarIsoDate(inicio),
            endDate: formatarIsoDate(fim)
        };
    }
    criarCard(id, titulo, valor, comparacaoValor, descricao, icone, detalheDatasetId) {
        return {
            id,
            titulo,
            valor,
            descricao,
            comparacaoValor,
            comparacaoRotulo: "Período anterior",
            tendencia: calcularTendencia(valor, comparacaoValor),
            icone,
            detalheDatasetId,
            tooltip: descricao
        };
    }
}
