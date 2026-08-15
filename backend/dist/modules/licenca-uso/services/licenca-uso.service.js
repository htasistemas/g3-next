import { normalizarCnpj, normalizarEmail } from "../../../utils/br-utils.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { EmailService } from "../../email/services/email.service.js";
import { UnidadeAssistencialRepository } from "../../unidades-assistenciais/repositories/unidade-assistencial.repository.js";
import { atualizarLicencaUsoPayloadSchema, licencaUsoConfiguracaoSchema } from "../licenca-uso.schema.js";
import { LicencaUsoRepository } from "../repositories/licenca-uso.repository.js";
import { InfinitePayService } from "./infinitepay.service.js";
const planosBase = {
    essencial: { nome: "Essencial", valorMensal: 297, implantacao: 497 },
    profissional: { nome: "Profissional", valorMensal: 497, implantacao: 897 },
    premium: { nome: "Premium", valorMensal: 697, implantacao: 1500 },
    enterprise: { nome: "Enterprise", valorMensal: 797, implantacao: 1500 }
};
const descontoPorCiclo = {
    mensal: 0,
    semestral: 10,
    anual: 20
};
const fatorMesesPorCiclo = {
    mensal: 1,
    semestral: 6,
    anual: 12
};
const configuracaoPadrao = {
    planoId: "profissional",
    cicloCobranca: "mensal",
    vigenciaInicialDias: 30,
    valorBaseMensal: planosBase.profissional.valorMensal,
    percentualDesconto: 0,
    valorCobranca: planosBase.profissional.valorMensal,
    valorImplantacao: planosBase.profissional.implantacao,
    implantacaoIsenta: false,
    statusLicenca: "sem_vigencia",
    alertasEmailAtivos: true,
    diasAlertaEmail: [30, 15, 7, 1],
    emailsAlerta: [],
    pixAmbiente: "sandbox",
    pixExpiracaoMinutos: 1440,
    pixProvider: "infinitypay",
    cartaoProvider: "infinitypay",
    cartaoAmbiente: "sandbox",
    cartaoTentativasFalha: 2,
    boletoProvider: "infinitypay",
    boletoAmbiente: "sandbox",
    boletoPrazoVencimentoDias: 5,
    checkoutHandle: "Torresoft",
    mensagemCobranca: "Licença de uso do G3N vinculada ao CNPJ da instituição principal. O sistema permanece ativo e envia alertas apenas por e-mail."
};
function gerarOrderNsu() {
    return `LIC-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
}
function mesesPorCiclo(ciclo) {
    if (ciclo === "anual")
        return 12;
    if (ciclo === "semestral")
        return 6;
    return 1;
}
function adicionarMeses(dataIso, meses) {
    const data = new Date(`${dataIso}T00:00:00.000Z`);
    data.setUTCMonth(data.getUTCMonth() + meses);
    data.setUTCDate(data.getUTCDate() - 1);
    return data.toISOString().slice(0, 10);
}
function adicionarDias(dataIso, dias) {
    const data = new Date(`${dataIso}T00:00:00.000Z`);
    data.setUTCDate(data.getUTCDate() + Math.max(dias, 1) - 1);
    return data.toISOString().slice(0, 10);
}
function normalizarDataParaInicioDia(dataIso) {
    return new Date(`${dataIso}T00:00:00.000Z`);
}
function diferencaDias(dataFinalIso) {
    if (!dataFinalIso)
        return undefined;
    const hoje = new Date();
    const referenciaHoje = Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate());
    const vencimento = normalizarDataParaInicioDia(dataFinalIso);
    const referenciaVencimento = Date.UTC(vencimento.getUTCFullYear(), vencimento.getUTCMonth(), vencimento.getUTCDate());
    return Math.floor((referenciaVencimento - referenciaHoje) / (24 * 60 * 60 * 1000));
}
function calcularStatusLicenca(dataVencimento) {
    const dias = diferencaDias(dataVencimento);
    if (dias == null)
        return "sem_vigencia";
    if (dias < 0)
        return "vencida";
    if (dias === 0)
        return "vence_hoje";
    return "ativa";
}
function calcularCobranca(planoId, ciclo) {
    const plano = planosBase[planoId];
    const percentualDesconto = descontoPorCiclo[ciclo];
    const fatorMeses = fatorMesesPorCiclo[ciclo];
    const valorBruto = plano.valorMensal * fatorMeses;
    const valorComDesconto = Number((valorBruto * (1 - percentualDesconto / 100)).toFixed(2));
    const implantacaoIsenta = ciclo === "anual";
    const valorImplantacao = implantacaoIsenta ? 0 : plano.implantacao;
    return {
        valorBaseMensal: plano.valorMensal,
        percentualDesconto,
        valorCobranca: valorComDesconto,
        valorImplantacao,
        implantacaoIsenta
    };
}
function calcularVigencia(configuracao, dataInicio) {
    const vigenciaDias = Number(configuracao.vigenciaInicialDias ?? 0);
    if (vigenciaDias > 0) {
        return {
            vigenciaInicio: dataInicio,
            vigenciaFim: adicionarDias(dataInicio, vigenciaDias),
            vigenciaDias
        };
    }
    return {
        vigenciaInicio: dataInicio,
        vigenciaFim: adicionarMeses(dataInicio, mesesPorCiclo(configuracao.cicloCobranca)),
        vigenciaDias: undefined
    };
}
function montarResumo(configuracao) {
    const diasParaVencimento = diferencaDias(configuracao.dataVencimento);
    const proximos = [...(configuracao.diasAlertaEmail ?? [])]
        .filter((item) => diasParaVencimento != null && item >= (diasParaVencimento ?? 9999))
        .sort((a, b) => a - b);
    return {
        diasParaVencimento,
        proximoAlertaDias: proximos[0],
        bloqueiaSistema: false
    };
}
export class LicencaUsoService {
    repository = new LicencaUsoRepository();
    unidadeRepository = new UnidadeAssistencialRepository();
    emailService = new EmailService();
    infinitePayService = new InfinitePayService();
    parseTenant(rawTenantId) {
        const tenantId = String(rawTenantId ?? "").trim();
        if (!tenantId) {
            throw new AppError("Tenant da sessao nao identificado.", 401);
        }
        return tenantId;
    }
    async montarResposta(configuracao, tenantId) {
        const pagamentos = await this.repository.listarPagamentos(tenantId);
        return {
            configuracao,
            resumo: montarResumo(configuracao),
            historico: {
                pendentes: pagamentos.filter((item) => item.status === "pendente"),
                realizados: pagamentos.filter((item) => item.status === "pago")
            },
            atualizado_em: null
        };
    }
    async obterConfiguracao(rawTenantId) {
        const tenantId = this.parseTenant(rawTenantId);
        const unidadeAtual = await this.unidadeRepository.buscarAtual(tenantId);
        const registro = await this.repository.buscarConfiguracao(tenantId);
        const base = licencaUsoConfiguracaoSchema.parse({
            ...configuracaoPadrao,
            ...registro,
            instituicaoNome: unidadeAtual?.nomeFantasia?.trim() ||
                unidadeAtual?.razaoSocial?.trim() ||
                registro?.instituicaoNome ||
                undefined,
            instituicaoCnpj: normalizarCnpj(unidadeAtual?.cnpj) ||
                normalizarCnpj(registro?.instituicaoCnpj) ||
                undefined,
            statusLicenca: calcularStatusLicenca(registro?.dataVencimento)
        });
        return this.montarResposta(base, tenantId);
    }
    async atualizarConfiguracao(rawPayload, usuarioAtualizacao, rawTenantId) {
        const tenantId = this.parseTenant(rawTenantId);
        const payload = atualizarLicencaUsoPayloadSchema.parse(rawPayload);
        const atual = await this.repository.buscarConfiguracao(tenantId);
        const unidadeAtual = await this.unidadeRepository.buscarAtual(tenantId);
        const planoId = (payload.configuracao.planoId ?? atual?.planoId ?? configuracaoPadrao.planoId);
        const cicloCobranca = (payload.configuracao.cicloCobranca ??
            atual?.cicloCobranca ??
            configuracaoPadrao.cicloCobranca);
        const cobrancaCalculada = calcularCobranca(planoId, cicloCobranca);
        const implantacaoIsentaCalculada = payload.configuracao.implantacaoIsenta ?? cobrancaCalculada.implantacaoIsenta;
        const dataInicioVigencia = payload.configuracao.dataInicioVigencia ?? atual?.dataInicioVigencia ?? new Date().toISOString().slice(0, 10);
        const vigenciaCalculada = calcularVigencia({
            cicloCobranca,
            vigenciaInicialDias: payload.configuracao.vigenciaInicialDias ??
                atual?.vigenciaInicialDias ??
                configuracaoPadrao.vigenciaInicialDias
        }, dataInicioVigencia);
        const normalizado = licencaUsoConfiguracaoSchema.parse({
            ...configuracaoPadrao,
            ...atual,
            ...payload.configuracao,
            instituicaoNome: unidadeAtual?.nomeFantasia?.trim() ||
                unidadeAtual?.razaoSocial?.trim() ||
                payload.configuracao.instituicaoNome ||
                atual?.instituicaoNome ||
                undefined,
            instituicaoCnpj: normalizarCnpj(unidadeAtual?.cnpj) ||
                normalizarCnpj(payload.configuracao.instituicaoCnpj) ||
                normalizarCnpj(atual?.instituicaoCnpj) ||
                undefined,
            planoId,
            cicloCobranca,
            vigenciaInicialDias: payload.configuracao.vigenciaInicialDias ??
                atual?.vigenciaInicialDias ??
                configuracaoPadrao.vigenciaInicialDias,
            dataInicioVigencia,
            dataVencimento: payload.configuracao.dataVencimento ?? vigenciaCalculada.vigenciaFim,
            valorBaseMensal: payload.configuracao.valorBaseMensal ?? cobrancaCalculada.valorBaseMensal,
            percentualDesconto: payload.configuracao.percentualDesconto ?? cobrancaCalculada.percentualDesconto,
            valorCobranca: payload.configuracao.valorCobranca ?? cobrancaCalculada.valorCobranca,
            valorImplantacao: implantacaoIsentaCalculada
                ? 0
                : payload.configuracao.valorImplantacao ?? cobrancaCalculada.valorImplantacao,
            implantacaoIsenta: implantacaoIsentaCalculada,
            emailsAlerta: (payload.configuracao.emailsAlerta ?? atual?.emailsAlerta ?? []).map((email) => normalizarEmail(email)),
            checkoutHandle: payload.configuracao.checkoutHandle ?? atual?.checkoutHandle ?? configuracaoPadrao.checkoutHandle,
            diasAlertaEmail: payload.configuracao.diasAlertaEmail?.length
                ? [...payload.configuracao.diasAlertaEmail].sort((a, b) => b - a)
                : atual?.diasAlertaEmail?.length
                    ? [...atual.diasAlertaEmail].sort((a, b) => b - a)
                    : configuracaoPadrao.diasAlertaEmail,
            statusLicenca: calcularStatusLicenca(payload.configuracao.dataVencimento ?? vigenciaCalculada.vigenciaFim)
        });
        const salvo = await this.repository.salvarConfiguracao(normalizado, usuarioAtualizacao, tenantId);
        return this.montarResposta(salvo, tenantId);
    }
    async gerarCheckoutLink(rawTenantId) {
        const tenantId = this.parseTenant(rawTenantId);
        const { configuracao } = await this.obterConfiguracao(tenantId);
        if (!configuracao.checkoutHandle?.trim()) {
            throw new AppError("Configure o handle da InfinitePay antes de gerar o checkout.", 422);
        }
        if (!configuracao.checkoutRedirectUrl?.trim()) {
            throw new AppError("Configure a URL de retorno do checkout antes de gerar o checkout.", 422);
        }
        const plano = planosBase[configuracao.planoId];
        const orderNsu = gerarOrderNsu();
        const dataInicio = configuracao.dataInicioVigencia ?? new Date().toISOString().slice(0, 10);
        const vigencia = calcularVigencia(configuracao, dataInicio);
        const itens = [
            {
                quantity: 1,
                price: Math.round(configuracao.valorCobranca * 100),
                description: `Licença de uso G3N - ${plano.nome} (${configuracao.cicloCobranca})`
            }
        ];
        if (!configuracao.implantacaoIsenta && configuracao.valorImplantacao > 0) {
            itens.push({
                quantity: 1,
                price: Math.round(configuracao.valorImplantacao * 100),
                description: "Implantação do G3N"
            });
        }
        const customerName = configuracao.instituicaoNome?.trim() || configuracao.checkoutHandle?.trim() || "Cliente G3N";
        const customerEmail = configuracao.emailsAlerta.find((email) => Boolean(email?.trim()))?.trim();
        const resposta = await this.infinitePayService.createCheckoutLink({
            handle: configuracao.checkoutHandle,
            order_nsu: orderNsu,
            items: itens,
            redirect_url: configuracao.checkoutRedirectUrl,
            webhook_url: configuracao.pixWebhookUrl,
            customer: {
                name: customerName,
                email: customerEmail
            }
        });
        const salvo = await this.repository.salvarConfiguracao(licencaUsoConfiguracaoSchema.parse({
            ...configuracao,
            ultimoCheckoutUrl: resposta.url,
            ultimoOrderNsu: resposta.order_nsu ?? orderNsu,
            ultimoInvoiceSlug: resposta.invoice_slug,
            ultimoCheckoutPago: false
        }), "infinitepay-checkout", tenantId);
        await this.repository.registrarPagamentoPendente({
            tenantId,
            descricao: `Licença G3N ${plano.nome}`,
            planoId: configuracao.planoId,
            cicloCobranca: configuracao.cicloCobranca,
            vigenciaInicio: vigencia.vigenciaInicio,
            vigenciaFim: vigencia.vigenciaFim,
            vigenciaDias: vigencia.vigenciaDias,
            valorLicenca: configuracao.valorCobranca,
            valorImplantacao: configuracao.implantacaoIsenta ? 0 : configuracao.valorImplantacao,
            valorTotal: configuracao.valorCobranca + (configuracao.implantacaoIsenta ? 0 : configuracao.valorImplantacao),
            orderNsu: resposta.order_nsu ?? orderNsu,
            invoiceSlug: resposta.invoice_slug,
            checkoutUrl: resposta.url
        });
        const respostaCompleta = await this.montarResposta(salvo, tenantId);
        return {
            ...respostaCompleta,
            checkoutUrl: resposta.url,
            orderNsu: resposta.order_nsu ?? orderNsu,
            invoiceSlug: resposta.invoice_slug
        };
    }
    async confirmarPagamentoRetorno(rawPayload) {
        const payload = rawPayload;
        const orderNsu = String(payload.order_nsu ?? "").trim();
        const transactionNsu = String(payload.transaction_nsu ?? "").trim();
        const slug = String(payload.slug ?? "").trim();
        if (!orderNsu || !transactionNsu || !slug) {
            throw new AppError("ParÃ¢metros de retorno do checkout incompletos.", 422);
        }
        const pagamento = orderNsu ? await this.repository.buscarPagamentoPorOrderNsu(orderNsu) : null;
        const tenantId = this.parseTenant(pagamento?.tenant_id);
        const { configuracao } = await this.obterConfiguracao(tenantId);
        if (!configuracao.checkoutHandle?.trim()) {
            throw new AppError("Handle da InfinitePay não configurado.", 422);
        }
        if (!orderNsu || !transactionNsu || !slug) {
            throw new AppError("Parâmetros de retorno do checkout incompletos.", 422);
        }
        const resposta = await this.infinitePayService.checkPayment({
            handle: configuracao.checkoutHandle,
            order_nsu: orderNsu,
            transaction_nsu: transactionNsu,
            slug
        });
        const pago = Boolean(resposta.paid);
        const hoje = new Date().toISOString().slice(0, 10);
        const vigencia = pago ? calcularVigencia(configuracao, hoje) : undefined;
        const valorPago = Number((resposta.paid_amount ?? resposta.amount ?? 0) / 100);
        const valorImplantacao = configuracao.implantacaoIsenta ? 0 : configuracao.valorImplantacao;
        const salvo = await this.repository.salvarConfiguracao(licencaUsoConfiguracaoSchema.parse({
            ...configuracao,
            dataInicioVigencia: pago ? vigencia?.vigenciaInicio : configuracao.dataInicioVigencia,
            dataVencimento: pago ? vigencia?.vigenciaFim : configuracao.dataVencimento,
            statusLicenca: pago ? "ativa" : calcularStatusLicenca(configuracao.dataVencimento),
            ultimoOrderNsu: resposta.order_nsu ?? orderNsu,
            ultimoInvoiceSlug: resposta.slug ?? slug,
            ultimaTransactionNsu: resposta.transaction_nsu ?? transactionNsu,
            ultimoReceiptUrl: resposta.receipt_url ?? payload.receipt_url ?? configuracao.ultimoReceiptUrl,
            ultimoCheckoutPago: pago,
            ultimoValorPago: valorPago
        }), "infinitepay-retorno", tenantId);
        if (pago) {
            await this.repository.marcarPagamentoComoPago({
                tenantId,
                orderNsu: resposta.order_nsu ?? orderNsu,
                invoiceSlug: resposta.slug ?? slug,
                transactionNsu: resposta.transaction_nsu ?? transactionNsu,
                receiptUrl: resposta.receipt_url ?? payload.receipt_url ?? configuracao.ultimoReceiptUrl,
                valorTotal: valorPago || configuracao.valorCobranca + valorImplantacao,
                vigenciaInicio: vigencia?.vigenciaInicio,
                vigenciaFim: vigencia?.vigenciaFim,
                vigenciaDias: vigencia?.vigenciaDias
            });
        }
        const respostaCompleta = await this.montarResposta(salvo, tenantId);
        return {
            pago,
            ...respostaCompleta,
            retorno: resposta
        };
    }
    async processarWebhookInfinitePay(rawPayload) {
        const payload = (rawPayload ?? {});
        const orderNsu = String(payload.order_nsu ?? "").trim();
        const pagamento = orderNsu ? await this.repository.buscarPagamentoPorOrderNsu(orderNsu) : null;
        if (!orderNsu || !pagamento?.tenant_id) {
            return { acknowledged: true, ignored: true };
        }
        return this.confirmarPagamentoRetorno({
            order_nsu: payload.order_nsu,
            transaction_nsu: payload.transaction_nsu,
            slug: payload.invoice_slug,
            receipt_url: payload.receipt_url
        });
    }
    async processarAlertasEmailPendentes() {
        const tenants = await this.repository.listarTenantsComConfiguracao();
        const alertasProcessados = [];
        for (const tenantId of tenants) {
            const { configuracao } = await this.obterConfiguracao(tenantId);
            if (!configuracao.alertasEmailAtivos)
                continue;
            if (!configuracao.dataVencimento)
                continue;
            if (!configuracao.emailsAlerta.length)
                continue;
            const diasParaVencimento = diferencaDias(configuracao.dataVencimento);
            if (diasParaVencimento == null)
                continue;
            const diasElegiveis = diasParaVencimento < 0
                ? [-1]
                : configuracao.diasAlertaEmail.filter((dia) => diasParaVencimento <= dia);
            if (!diasElegiveis.length)
                continue;
            for (const destinatario of configuracao.emailsAlerta) {
                for (const diasAntecedencia of diasElegiveis) {
                    const jaEnviado = await this.repository.alertaJaEnviado(tenantId, destinatario, diasAntecedencia, configuracao.dataVencimento);
                    if (jaEnviado)
                        continue;
                    try {
                        await this.emailService.enviarEmailSimples({
                            destinatario,
                            assunto: diasAntecedencia < 0
                                ? "Licença de uso do G3N vencida"
                                : `Licença de uso do G3N vence em ${diasParaVencimento} dia(s)`,
                            mensagem: this.montarMensagemAlerta(configuracao, diasParaVencimento)
                        });
                        const processado = {
                            destinatario,
                            diasAntecedencia,
                            referenciaVencimento: configuracao.dataVencimento,
                            statusEnvio: "enviado"
                        };
                        await this.repository.registrarAlerta(tenantId, processado);
                        alertasProcessados.push(processado);
                    }
                    catch (error) {
                        const processado = {
                            destinatario,
                            diasAntecedencia,
                            referenciaVencimento: configuracao.dataVencimento,
                            statusEnvio: "falha",
                            erro: error?.message ?? "Falha ao enviar alerta de licença."
                        };
                        await this.repository.registrarAlerta(tenantId, processado);
                        alertasProcessados.push(processado);
                    }
                }
            }
        }
        return alertasProcessados;
    }
    montarMensagemAlerta(configuracao, diasParaVencimento) {
        const plano = planosBase[configuracao.planoId];
        const statusTexto = diasParaVencimento < 0
            ? "A licença de uso está vencida."
            : diasParaVencimento === 0
                ? "A licença de uso vence hoje."
                : `A licença de uso vence em ${diasParaVencimento} dia(s).`;
        return [
            `Instituição: ${configuracao.instituicaoNome ?? "Não informada"}`,
            `CNPJ vinculado: ${configuracao.instituicaoCnpj ?? "Não informado"}`,
            `Plano: ${plano.nome}`,
            `Ciclo de cobrança: ${configuracao.cicloCobranca}`,
            `Vencimento: ${configuracao.dataVencimento ?? "Não informado"}`,
            `Valor da cobrança: R$ ${configuracao.valorCobranca.toFixed(2).replace(".", ",")}`,
            "",
            statusTexto,
            "",
            "O G3N não bloqueia a operação por vencimento. Este e-mail é apenas um alerta preventivo."
        ].join("\n");
    }
}
