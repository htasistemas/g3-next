import { AppError } from "../../../shared/errors/app-error.js";
import { TtlCache } from "../../../shared/cache/ttl-cache.js";
import { dashboardFiltrosSchema } from "../dashboard.schema.js";
import { DashboardRepository } from "../repositories/dashboard.repository.js";
function arredondarUmaCasa(valor) {
    return Math.round(valor * 10) / 10;
}
function arredondarDuasCasas(valor) {
    return Math.round(valor * 100) / 100;
}
function limitarPercentual(valor) {
    if (!Number.isFinite(valor))
        return 0;
    return Math.max(0, Math.min(100, valor));
}
function calcularIdade(dataNascimento, dataReferencia = new Date()) {
    const anoAtual = dataReferencia.getUTCFullYear();
    const mesAtual = dataReferencia.getUTCMonth();
    const diaAtual = dataReferencia.getUTCDate();
    const anoNascimento = dataNascimento.getUTCFullYear();
    const mesNascimento = dataNascimento.getUTCMonth();
    const diaNascimento = dataNascimento.getUTCDate();
    let idade = anoAtual - anoNascimento;
    if (mesAtual < mesNascimento || (mesAtual === mesNascimento && diaAtual < diaNascimento)) {
        idade -= 1;
    }
    return idade;
}
export class DashboardService {
    cache = new TtlCache(20_000, 24);
    async obterAssistencia(rawFilters, tenantId) {
        const filters = dashboardFiltrosSchema.parse(rawFilters);
        this.validarPeriodo(filters);
        const tenantNormalizado = tenantId?.trim();
        if (!tenantNormalizado) {
            throw new AppError("Tenant da sessao nao identificado.", 401);
        }
        const repository = new DashboardRepository(tenantNormalizado);
        const cacheKey = JSON.stringify({
            tenantId: tenantNormalizado,
            startDate: filters.startDate ?? null,
            endDate: filters.endDate ?? null
        });
        return this.cache.getOrSet(cacheKey, async () => this.gerarAssistencia(repository, filters));
    }
    async gerarAssistencia(repository, filters) {
        const [totalBeneficiarios, totalProfissionais, totalVoluntarios, totalFamiliasCadastradas, totalBensPatrimonio, totalItensAlmoxarifado, totalLivrosDisponiveis, totalVeiculos, beneficiariosPeriodo, porStatus, cadastrosCompletos, datasNascimento, totalSituacaoSocial, mediaPessoasBanco, rendasFamiliares, bairros, vulnerabilidades, insegurancaAlimentar, termosAtivos, termosValorTotal, termosAlertas, valoresAReceber, valoresEmCaixa, valoresEmBanco, contasFinanceirasRows, cursosAtivos, taxaMediaOcupacaoCursos, certificadosEmitidos, doacoesPeriodo, itensDoadoResumo, visitasDomiciliares, termosVencendo, execucaoFinanceira, absenteismo] = await Promise.all([
            repository.contarBeneficiarios(),
            repository.contarProfissionais(),
            repository.contarVoluntarios(),
            repository.contarFamilias(),
            repository.contarBensPatrimonio(),
            repository.contarItensAlmoxarifado(),
            repository.somarLivrosDisponiveis(),
            repository.contarVeiculos(),
            repository.contarBeneficiariosPeriodo(filters.startDate, filters.endDate),
            repository.contarBeneficiariosPorStatus(),
            repository.contarCadastroCompleto(),
            repository.listarDatasNascimento(),
            repository.contarSituacaoSocialTotal(),
            repository.calcularMediaPessoas(),
            repository.listarRendasFamiliares(),
            repository.contarBeneficiariosPorBairro(0),
            repository.contarVulnerabilidades(),
            repository.contarInsegurancaAlimentar(),
            repository.contarTermosAtivos(),
            repository.somarValorTotalTermosAtivos(),
            repository.listarAlertasTermos(),
            repository.somarValoresAReceber(),
            repository.somarValoresEmCaixa(),
            repository.somarValoresEmBanco(),
            repository.listarContasFinanceiras(),
            repository.contarCursosAtivos(),
            repository.calcularTaxaMediaOcupacaoCursos(),
            repository.contarCertificadosEmitidos(),
            repository.contarDoacoesPeriodo(filters.startDate, filters.endDate),
            repository.obterResumoItensDoacao(filters.startDate, filters.endDate),
            repository.contarVisitasDomiciliares(filters.startDate, filters.endDate),
            repository.contarTermosVencendo(),
            repository.calcularExecucaoFinanceira(),
            repository.calcularAbsenteismo()
        ]);
        const pendentes = porStatus["INCOMPLETO"] ?? 0;
        const bloqueados = porStatus["BLOQUEADO"] ?? 0;
        const emAnalise = porStatus["EM_ANALISE"] ?? 0;
        const desatualizados = porStatus["DESATUALIZADO"] ?? 0;
        const ativos = Math.max(0, totalBeneficiarios - pendentes - bloqueados - emAnalise - desatualizados);
        const cadastroCompletoPercentual = limitarPercentual(totalBeneficiarios === 0 ? 0 : (cadastrosCompletos / totalBeneficiarios) * 100);
        const faixaEtaria = this.calcularFaixaEtaria(datasNascimento);
        const idades = this.calcularIdades(datasNascimento);
        const rendas = this.parseRendas(rendasFamiliares);
        const rendaMediaFamiliar = this.calcularMedia(rendas);
        const mediaPessoas = mediaPessoasBanco || 0;
        const rendaPerCapitaMedia = mediaPessoas > 0 ? rendaMediaFamiliar / mediaPessoas : 0;
        const faixaRenda = this.calcularFaixaRenda(rendas);
        const contasFinanceiras = this.mapearContasFinanceiras(contasFinanceirasRows);
        const familiasExtremaPobreza = faixaRenda["Ate 200"] ?? 0;
        return {
            filters: {
                startDate: filters.startDate ?? null,
                endDate: filters.endDate ?? null
            },
            cadastros: {
                beneficiarios: totalBeneficiarios,
                profissionais: totalProfissionais,
                voluntarios: totalVoluntarios,
                familias: totalFamiliasCadastradas,
                bensPatrimonio: totalBensPatrimonio,
                itensAlmoxarifado: totalItensAlmoxarifado,
                livrosDisponiveis: totalLivrosDisponiveis,
                veiculos: totalVeiculos
            },
            top12: {
                beneficiariosAtendidosPeriodo: beneficiariosPeriodo,
                familiasExtremaPobreza,
                rendaMediaFamiliar: arredondarUmaCasa(rendaMediaFamiliar),
                cursosAtivos,
                taxaMediaOcupacaoCursos: arredondarUmaCasa(taxaMediaOcupacaoCursos),
                certificadosEmitidos,
                doacoesPeriodo,
                itensDoadoResumo,
                visitasDomiciliares,
                termosVencendo,
                execucaoFinanceira: arredondarUmaCasa(execucaoFinanceira),
                absenteismo: arredondarUmaCasa(absenteismo)
            },
            atendimento: {
                totalBeneficiarios,
                ativos,
                pendentes,
                bloqueados,
                emAnalise,
                desatualizados,
                cadastroCompletoPercentual: arredondarUmaCasa(cadastroCompletoPercentual),
                beneficiariosPeriodo,
                novosBeneficiarios: beneficiariosPeriodo,
                reincidentes: 0,
                faixaEtaria,
                idades,
                vulnerabilidades,
                bairros
            },
            familias: {
                total: totalSituacaoSocial === 0 ? totalBeneficiarios : totalSituacaoSocial,
                mediaPessoas: arredondarUmaCasa(mediaPessoas),
                rendaMediaFamiliar: arredondarUmaCasa(rendaMediaFamiliar),
                rendaPerCapitaMedia: arredondarUmaCasa(rendaPerCapitaMedia),
                insegurancaAlimentar,
                faixaRenda
            },
            termos: {
                ativos: termosAtivos,
                valorTotal: arredondarUmaCasa(termosValorTotal),
                alertas: this.normalizarAlertasTermos(termosAlertas)
            },
            financeiro: {
                valoresAReceber: arredondarDuasCasas(valoresAReceber),
                valoresEmCaixa: arredondarDuasCasas(valoresEmCaixa),
                valoresEmBanco: arredondarDuasCasas(valoresEmBanco),
                contas: contasFinanceiras.map((item) => ({
                    ...item,
                    saldo: arredondarDuasCasas(item.saldo)
                }))
            }
        };
    }
    validarPeriodo(filters) {
        if (!filters.startDate || !filters.endDate) {
            return;
        }
        const inicio = new Date(`${filters.startDate}T00:00:00.000Z`);
        const fim = new Date(`${filters.endDate}T00:00:00.000Z`);
        if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime())) {
            throw new AppError("Datas de filtro invalidas.", 422);
        }
        if (inicio.getTime() > fim.getTime()) {
            throw new AppError("A data final deve ser maior ou igual a data inicial.", 422);
        }
    }
    calcularFaixaEtaria(datasNascimento) {
        const faixas = {
            "0-12": 0,
            "13-17": 0,
            "18-29": 0,
            "30-59": 0,
            "60+": 0
        };
        for (const dataNascimento of datasNascimento) {
            const idade = calcularIdade(dataNascimento);
            if (idade < 0)
                continue;
            if (idade <= 12) {
                faixas["0-12"] += 1;
            }
            else if (idade <= 17) {
                faixas["13-17"] += 1;
            }
            else if (idade <= 29) {
                faixas["18-29"] += 1;
            }
            else if (idade <= 59) {
                faixas["30-59"] += 1;
            }
            else {
                faixas["60+"] += 1;
            }
        }
        return faixas;
    }
    mapearContasFinanceiras(rows) {
        return rows
            .map((row) => {
            const banco = row.banco?.trim() || null;
            const numero = row.numero?.trim() || null;
            const tipo = row.tipo?.trim() || null;
            const saldo = this.toNumber(row.saldo);
            const categoria = this.classificarContaFinanceira(tipo, row.recebimento_local);
            const partesNome = [
                banco,
                numero ? `Conta ${numero}` : null,
                !banco && !numero ? categoria : null
            ].filter((item) => Boolean(item));
            return {
                id: String(row.id),
                nome: partesNome.join(" - "),
                banco,
                numero,
                tipo,
                categoria,
                saldo
            };
        })
            .filter((item) => item.saldo > 0)
            .sort((a, b) => b.saldo - a.saldo || a.nome.localeCompare(b.nome, "pt-BR"));
    }
    classificarContaFinanceira(tipo, recebimentoLocal) {
        if (recebimentoLocal) {
            return "Caixa";
        }
        const tipoNormalizado = this.normalizarTexto(tipo);
        return tipoNormalizado.includes("caixa") ? "Caixa" : "Banco";
    }
    normalizarTexto(valor) {
        return String(valor ?? "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLocaleLowerCase("pt-BR")
            .trim();
    }
    toNumber(value) {
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
    calcularIdades(datasNascimento) {
        const contador = new Map();
        for (const dataNascimento of datasNascimento) {
            const idade = calcularIdade(dataNascimento);
            if (idade < 0)
                continue;
            contador.set(idade, (contador.get(idade) ?? 0) + 1);
        }
        return [...contador.entries()]
            .sort(([idadeA], [idadeB]) => idadeA - idadeB)
            .reduce((acc, [idade, quantidade]) => {
            acc[String(idade)] = quantidade;
            return acc;
        }, {});
    }
    parseRendas(rendas) {
        return rendas
            .map((renda) => this.parseValorMonetario(renda))
            .filter((valor) => typeof valor === "number");
    }
    parseValorMonetario(valor) {
        if (!valor?.trim())
            return null;
        let normalizado = valor.replace("R$", "").trim();
        normalizado = normalizado.replace(/[^0-9,.\-]/g, "");
        if (normalizado.includes(",")) {
            normalizado = normalizado.replaceAll(".", "").replace(",", ".");
        }
        else if (normalizado.includes(".")) {
            const partes = normalizado.split(".");
            if (partes.length > 2) {
                const decimal = partes.pop();
                normalizado = `${partes.join("")}.${decimal}`;
            }
        }
        const numero = Number(normalizado);
        if (!Number.isFinite(numero))
            return null;
        return numero;
    }
    calcularMedia(valores) {
        if (!valores.length)
            return 0;
        const soma = valores.reduce((total, valor) => total + valor, 0);
        return soma / valores.length;
    }
    calcularFaixaRenda(rendas) {
        const faixas = {
            "Ate 200": 0,
            "201-500": 0,
            "501-1000": 0,
            "Acima 1000": 0
        };
        for (const renda of rendas) {
            if (renda <= 200) {
                faixas["Ate 200"] += 1;
            }
            else if (renda <= 500) {
                faixas["201-500"] += 1;
            }
            else if (renda <= 1000) {
                faixas["501-1000"] += 1;
            }
            else {
                faixas["Acima 1000"] += 1;
            }
        }
        return faixas;
    }
    normalizarAlertasTermos(alertas) {
        return alertas.map((alerta) => ({
            numero: alerta.numero,
            vigenciaFim: alerta.vigenciaFim,
            status: alerta.status
        }));
    }
}
