import { createHash, randomUUID } from "node:crypto";
import PDFDocument from "pdfkit";
import { AppError } from "../../../shared/errors/app-error.js";
import { normalizarCep, normalizarCnpj, normalizarCpf, normalizarEmail, normalizarTelefone } from "../../../utils/br-utils.js";
import { trimOrUndefined } from "../../../utils/string-utils.js";
import { mapCaptacaoCampanha, mapCaptacaoComprovante, mapCaptacaoConfiguracoes, mapCaptacaoDoacao, mapCaptacaoDoador, mapCaptacaoLog, mapCaptacaoRecorrencia } from "../captacao-recursos.mapper.js";
import { captacaoCampanhaInputSchema, captacaoConfiguracoesSchema, captacaoDoacaoInputSchema, captacaoDoadorInputSchema, captacaoListFiltersSchema, captacaoPortalLoginSchema, captacaoPortalTokenSchema } from "../captacao-recursos.schema.js";
import { CaptacaoRecursosRepository } from "../repositories/captacao-recursos.repository.js";
import { MockPaymentProviderService } from "../providers/mock-payment-provider.service.js";
import { ReportsRepository } from "../../reports/repositories/reports.repository.js";
import { StorageService } from "../../arquivos/services/storage.service.js";
import { EmailService } from "../../email/services/email.service.js";
function parseUserId(value) {
    if (!value)
        return undefined;
    try {
        return BigInt(value);
    }
    catch {
        return undefined;
    }
}
function parseId(value) {
    try {
        return BigInt(value);
    }
    catch {
        throw new AppError("Identificador inválido.", 400);
    }
}
function gerarNumero(prefix) {
    return `${prefix}-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${randomUUID().slice(0, 8).toUpperCase()}`;
}
function gerarCodigoValidacao(seed) {
    return createHash("sha256").update(seed).digest("hex").slice(0, 12).toUpperCase();
}
function csvEscape(value) {
    const text = value == null ? "" : String(value);
    if (/[",;\n]/u.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
}
function normalizarDoadorPayload(input) {
    const documento = trimOrUndefined(input.cpfCnpj);
    const digits = documento?.replace(/\D/g, "");
    const cpfCnpjNorm = digits?.length === 11 ? normalizarCpf(digits) : digits?.length === 14 ? normalizarCnpj(digits) : digits;
    return {
        ...input,
        cpfCnpj: documento,
        cpfCnpjNorm,
        emailPrincipal: trimOrUndefined(input.emailPrincipal),
        emailPrincipalNorm: input.emailPrincipal ? normalizarEmail(input.emailPrincipal) : undefined,
        emailSecundario: trimOrUndefined(input.emailSecundario),
        emailSecundarioNorm: input.emailSecundario ? normalizarEmail(input.emailSecundario) : undefined,
        telefone: trimOrUndefined(input.telefone),
        telefoneNorm: input.telefone ? normalizarTelefone(input.telefone) : undefined,
        whatsapp: trimOrUndefined(input.whatsapp),
        whatsappNorm: input.whatsapp ? normalizarTelefone(input.whatsapp) : undefined,
        cep: trimOrUndefined(input.cep),
        cepNorm: input.cep ? normalizarCep(input.cep) : undefined,
        uf: input.uf?.trim().toUpperCase()
    };
}
export class CaptacaoRecursosService {
    repository = new CaptacaoRecursosRepository();
    paymentProvider = new MockPaymentProviderService();
    reportsRepository = new ReportsRepository();
    storageService = new StorageService();
    emailService = new EmailService();
    async getDashboard(rawFilters) {
        const filters = captacaoListFiltersSchema.parse(rawFilters ?? {});
        const base = await this.repository.listarDashboardBase(filters);
        const hoje = new Date();
        const inicioDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).getTime();
        const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).getTime();
        const inicioAno = new Date(hoje.getFullYear(), 0, 1).getTime();
        const doacoes = base.doacoes.map(mapCaptacaoDoacao);
        const campanhas = base.campanhas.map(mapCaptacaoCampanha);
        const doadores = base.doadores.map(mapCaptacaoDoador);
        const recorrencias = base.recorrencias.map(mapCaptacaoRecorrencia);
        const confirmadas = doacoes.filter((item) => ["pago", "confirmado"].includes(item.situacao));
        const pendentes = doacoes.filter((item) => ["pendente", "aguardando_pagamento"].includes(item.situacao));
        const canceladas = doacoes.filter((item) => item.situacao === "cancelado");
        const estornadas = doacoes.filter((item) => item.situacao === "estornado");
        const ativasRecorrencia = recorrencias.filter((item) => item.status === "ativa");
        const soma = (items) => items.reduce((acc, item) => acc + item.valorLiquido, 0);
        const totalDia = soma(confirmadas.filter((item) => (item.dataHora ? new Date(item.dataHora).getTime() : 0) >= inicioDia));
        const totalMes = soma(confirmadas.filter((item) => (item.dataHora ? new Date(item.dataHora).getTime() : 0) >= inicioMes));
        const totalAno = soma(confirmadas.filter((item) => (item.dataHora ? new Date(item.dataHora).getTime() : 0) >= inicioAno));
        const arrecadacaoPorMes = Array.from({ length: 12 }, (_, index) => {
            const label = new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(new Date(hoje.getFullYear(), index, 1));
            const valor = soma(confirmadas.filter((item) => {
                if (!item.dataHora)
                    return false;
                const data = new Date(item.dataHora);
                return data.getFullYear() === hoje.getFullYear() && data.getMonth() === index;
            }));
            return { mes: label, valor };
        });
        const agruparPor = (items, key) => {
            const mapa = new Map();
            for (const item of items) {
                const chave = key(item);
                mapa.set(chave, (mapa.get(chave) ?? 0) + item.valorLiquido);
            }
            return Array.from(mapa.entries()).map(([label, valor]) => ({ label, valor }));
        };
        const doacoesPorOrigem = agruparPor(confirmadas, (item) => item.origem);
        const doacoesPorFormaPagamento = agruparPor(confirmadas, (item) => item.formaPagamento);
        const topCampanhas = campanhas
            .map((item) => ({ label: item.nome, valor: item.valorArrecadado }))
            .sort((a, b) => b.valor - a.valor)
            .slice(0, 5);
        const topDoadores = doadores
            .map((item) => ({ label: item.nome, valor: item.totalDoado }))
            .sort((a, b) => b.valor - a.valor)
            .slice(0, 5);
        return {
            indicadores: {
                totalArrecadadoDia: totalDia,
                totalArrecadadoMes: totalMes,
                totalArrecadadoAno: totalAno,
                quantidadeDoacoesRecebidas: confirmadas.length,
                ticketMedio: confirmadas.length ? soma(confirmadas) / confirmadas.length : 0,
                quantidadeDoadoresAtivos: doadores.filter((item) => item.status === "ativo").length,
                quantidadeCampanhasAtivas: campanhas.filter((item) => item.status === "ativa").length,
                campanhaMaiorArrecadacao: topCampanhas[0]?.label,
                doacoesPendentes: pendentes.length,
                doacoesConfirmadas: confirmadas.length,
                doacoesCanceladas: canceladas.length,
                recorrenciasAtivas: ativasRecorrencia.length,
                doacoesEstornadas: estornadas.length
            },
            graficos: {
                arrecadacaoPorMes,
                arrecadacaoPorFormaPagamento: doacoesPorFormaPagamento,
                doacoesPorOrigem,
                doacoesPorCampanha: topCampanhas,
                metaPorCampanha: campanhas.map((item) => ({
                    label: item.nome,
                    meta: item.metaFinanceira,
                    arrecadado: item.valorArrecadado
                })),
                evolucaoNovosDoadores: Array.from({ length: 12 }, (_, index) => {
                    const label = new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(new Date(hoje.getFullYear(), index, 1));
                    const quantidade = doadores.filter((item) => {
                        if (!item.createdAt)
                            return false;
                        const data = new Date(item.createdAt);
                        return data.getFullYear() === hoje.getFullYear() && data.getMonth() === index;
                    }).length;
                    return { mes: label, quantidade };
                }),
                recorrenciasAtivasPorMes: Array.from({ length: 12 }, (_, index) => {
                    const label = new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(new Date(hoje.getFullYear(), index, 1));
                    const quantidade = recorrencias.filter((item) => {
                        if (!item.createdAt)
                            return false;
                        const data = new Date(item.createdAt);
                        return item.status === "ativa" && data.getMonth() <= index;
                    }).length;
                    return { mes: label, quantidade };
                }),
                topDoadores,
                topCampanhas
            }
        };
    }
    async listDoadores(rawFilters) {
        const filters = captacaoListFiltersSchema.parse(rawFilters ?? {});
        const resultado = await this.repository.listarDoadores(filters);
        return {
            pagina: Number(filters.pagina ?? 1) || 1,
            limite: Number(filters.limite ?? 20) || 20,
            total: resultado.total,
            doadores: resultado.rows.map(mapCaptacaoDoador)
        };
    }
    async getDoador(rawId) {
        const row = await this.repository.buscarDoadorPorIdOuFalhar(parseId(rawId));
        return { doador: mapCaptacaoDoador(row) };
    }
    async saveDoador(rawInput, userId, rawId) {
        const payload = normalizarDoadorPayload(captacaoDoadorInputSchema.parse(rawInput ?? {}));
        const id = rawId ? parseId(rawId) : null;
        const duplicado = await this.repository.buscarDoadorDuplicado(payload.cpfCnpjNorm, payload.emailPrincipalNorm, id ?? undefined);
        if (duplicado) {
            throw new AppError("Já existe um doador com o mesmo CPF/CNPJ ou e-mail.", 409);
        }
        const row = await this.repository.salvarDoador(id, rawId ? String(rawId) : randomUUID(), payload, parseUserId(userId));
        await this.repository.registrarLog("doador", BigInt(String(row.id)), id ? "EDICAO" : "CRIACAO", `Cadastro de doador ${payload.nome}`, { doadorId: String(row.id), nome: payload.nome }, parseUserId(userId));
        return { doador: mapCaptacaoDoador(await this.repository.buscarDoadorPorIdOuFalhar(BigInt(String(row.id)))) };
    }
    async inativarDoador(rawId, userId) {
        const row = await this.repository.inativarDoador(parseId(rawId), parseUserId(userId));
        await this.repository.registrarLog("doador", BigInt(String(row.id)), "INATIVACAO", "Doador inativado.", { doadorId: rawId }, parseUserId(userId));
        return { doador: mapCaptacaoDoador(await this.repository.buscarDoadorPorIdOuFalhar(BigInt(String(row.id)))) };
    }
    async listCampanhas(rawFilters) {
        const filters = captacaoListFiltersSchema.parse(rawFilters ?? {});
        const resultado = await this.repository.listarCampanhas(filters);
        return {
            pagina: Number(filters.pagina ?? 1) || 1,
            limite: Number(filters.limite ?? 20) || 20,
            total: resultado.total,
            campanhas: resultado.rows.map(mapCaptacaoCampanha)
        };
    }
    async getCampanha(rawId) {
        const row = await this.repository.buscarCampanhaPorIdOuFalhar(parseId(rawId));
        return { campanha: mapCaptacaoCampanha(row) };
    }
    async saveCampanha(rawInput, userId, rawId) {
        const payload = captacaoCampanhaInputSchema.parse(rawInput ?? {});
        const row = await this.repository.salvarCampanha(rawId ? parseId(rawId) : null, rawId ? String(rawId) : randomUUID(), payload, parseUserId(userId));
        await this.repository.registrarLog("campanha", BigInt(String(row.id)), rawId ? "EDICAO" : "CRIACAO", `Campanha ${payload.nome} salva.`, { campanhaId: String(row.id), nome: payload.nome }, parseUserId(userId));
        return { campanha: mapCaptacaoCampanha(await this.repository.buscarCampanhaPorIdOuFalhar(BigInt(String(row.id)))) };
    }
    async alterarStatusCampanha(rawId, status, userId) {
        const row = await this.repository.alterarStatusCampanha(parseId(rawId), status, parseUserId(userId));
        await this.repository.registrarLog("campanha", BigInt(String(row.id)), "STATUS", `Campanha alterada para ${status}.`, { status }, parseUserId(userId));
        return { campanha: mapCaptacaoCampanha(await this.repository.buscarCampanhaPorIdOuFalhar(BigInt(String(row.id)))) };
    }
    async listDoacoes(rawFilters) {
        const filters = captacaoListFiltersSchema.parse(rawFilters ?? {});
        const resultado = await this.repository.listarDoacoes(filters);
        return {
            pagina: Number(filters.pagina ?? 1) || 1,
            limite: Number(filters.limite ?? 20) || 20,
            total: resultado.total,
            doacoes: resultado.rows.map(mapCaptacaoDoacao)
        };
    }
    async getDoacao(rawId) {
        const doacaoId = parseId(rawId);
        const row = await this.repository.buscarDoacaoPorIdOuFalhar(doacaoId);
        const eventos = await this.repository.listarEventosDoacao(doacaoId);
        return {
            doacao: mapCaptacaoDoacao(row),
            eventos: eventos.map((item) => ({
                id: String(item.id),
                tipoEvento: String(item.tipo_evento),
                descricao: String(item.descricao ?? ""),
                payloadJson: item.payload_json ?? {},
                createdAt: item.created_at instanceof Date ? item.created_at.toISOString() : String(item.created_at)
            }))
        };
    }
    async saveDoacao(rawInput, userId, rawId) {
        const payload = captacaoDoacaoInputSchema.parse(rawInput ?? {});
        const currentId = rawId ? parseId(rawId) : null;
        const recorrencia = payload.recorrencia
            ? await this.repository.salvarRecorrencia(currentId ? BigInt(String(payload.recorrenciaId ?? 0)) || null : null, randomUUID(), payload.doadorId ? parseId(payload.doadorId) : null, payload.campanhaId ? parseId(payload.campanhaId) : null, payload.recorrencia, undefined, parseUserId(userId))
            : null;
        const row = await this.repository.salvarDoacao(currentId, rawId ? String(rawId) : randomUUID(), rawId ? `DOA-${rawId}` : gerarNumero("DOA"), {
            ...payload,
            recorrenciaId: recorrencia ? String(recorrencia.id) : payload.recorrenciaId
        }, parseUserId(userId));
        await this.repository.registrarEventoDoacao(BigInt(String(row.id)), rawId ? "EDICAO_MANUAL" : "CRIACAO_MANUAL", rawId ? "Doação atualizada manualmente." : "Doação cadastrada manualmente.", { formaPagamento: payload.formaPagamento, tipoDoacao: payload.tipoDoacao }, parseUserId(userId));
        await this.repository.registrarLog("doacao", BigInt(String(row.id)), rawId ? "EDICAO" : "CRIACAO", `Doação ${row.numero_doacao} salva.`, { doacaoId: String(row.id) }, parseUserId(userId));
        if (payload.campanhaId) {
            await this.repository.recalcularMetricasCampanha(parseId(payload.campanhaId), parseUserId(userId));
        }
        return this.getDoacao(String(row.id));
    }
    async gerarCobranca(rawId, userId) {
        const row = await this.repository.buscarDoacaoPorIdOuFalhar(parseId(rawId));
        const doacao = mapCaptacaoDoacao(row);
        if (["confirmado", "pago", "cancelado", "estornado"].includes(doacao.situacao)) {
            throw new AppError("A cobrança não pode ser gerada para a situação atual da doação.", 400);
        }
        const charge = await this.paymentProvider.createCharge({
            donationNumber: doacao.numeroDoacao,
            amount: doacao.valor,
            donorName: doacao.doadorNome ?? "Doador G3N",
            paymentMethod: doacao.formaPagamento,
            dueDate: doacao.dataVencimento,
            campaignName: doacao.campanhaNome
        });
        if (doacao.formaPagamento === "pix") {
            await this.repository.salvarTransacaoPix(parseId(rawId), charge, parseUserId(userId));
        }
        else if (doacao.formaPagamento === "boleto") {
            await this.repository.salvarTransacaoBoleto(parseId(rawId), charge, parseUserId(userId));
        }
        else {
            await this.repository.salvarTransacaoCartao(parseId(rawId), charge, parseUserId(userId));
        }
        await this.repository.alterarSituacaoDoacao(parseId(rawId), "aguardando_pagamento", parseUserId(userId), {
            txid: typeof charge.txid === "string" ? charge.txid : undefined,
            linkPagamento: charge.paymentLink
        });
        await this.repository.registrarEventoDoacao(parseId(rawId), "COBRANCA_GERADA", "Cobrança gerada pelo provider mock.", charge.payloadJson, parseUserId(userId));
        await this.repository.registrarLog("doacao", parseId(rawId), "COBRANCA_GERADA", `Cobrança gerada para ${doacao.numeroDoacao}.`, { paymentMethod: doacao.formaPagamento, provider: charge.provider }, parseUserId(userId));
        return this.getDoacao(rawId);
    }
    async confirmarDoacao(rawId, userId) {
        const row = await this.repository.buscarDoacaoPorIdOuFalhar(parseId(rawId));
        const doacao = mapCaptacaoDoacao(row);
        await this.repository.alterarSituacaoDoacao(parseId(rawId), "confirmado", parseUserId(userId));
        await this.repository.registrarEventoDoacao(parseId(rawId), "PAGAMENTO_CONFIRMADO", "Pagamento confirmado manualmente.", { doacaoId: rawId }, parseUserId(userId));
        if (doacao.campanhaId) {
            await this.repository.recalcularMetricasCampanha(parseId(doacao.campanhaId), parseUserId(userId));
        }
        await this.emitirComprovante(rawId, userId);
        return this.getDoacao(rawId);
    }
    async cancelarDoacao(rawId, userId, observacao) {
        const row = await this.repository.buscarDoacaoPorIdOuFalhar(parseId(rawId));
        const doacao = mapCaptacaoDoacao(row);
        await this.repository.alterarSituacaoDoacao(parseId(rawId), "cancelado", parseUserId(userId));
        await this.repository.registrarEventoDoacao(parseId(rawId), "CANCELAMENTO", observacao || "Doação cancelada.", { doacaoId: rawId }, parseUserId(userId));
        if (doacao.campanhaId) {
            await this.repository.recalcularMetricasCampanha(parseId(doacao.campanhaId), parseUserId(userId));
        }
        return this.getDoacao(rawId);
    }
    async estornarDoacao(rawId, userId, observacao) {
        const row = await this.repository.buscarDoacaoPorIdOuFalhar(parseId(rawId));
        const doacao = mapCaptacaoDoacao(row);
        await this.repository.alterarSituacaoDoacao(parseId(rawId), "estornado", parseUserId(userId));
        await this.repository.registrarEventoDoacao(parseId(rawId), "ESTORNO", observacao || "Doação estornada.", { doacaoId: rawId }, parseUserId(userId));
        if (doacao.campanhaId) {
            await this.repository.recalcularMetricasCampanha(parseId(doacao.campanhaId), parseUserId(userId));
        }
        return this.getDoacao(rawId);
    }
    async gerarBufferComprovante(doacao, mensagemAgradecimento) {
        const instituicao = await this.reportsRepository.obterInstituicaoRelatorio();
        const doc = new PDFDocument({ size: "A4", margin: 42 });
        const chunks = [];
        return new Promise((resolve, reject) => {
            doc.on("data", (chunk) => chunks.push(chunk));
            doc.on("end", () => resolve(Buffer.concat(chunks)));
            doc.on("error", reject);
            doc.fontSize(18).fillColor("#0f172a").text("Comprovante de doação", { align: "center" });
            doc.moveDown(0.5);
            doc.fontSize(10).fillColor("#334155").text(instituicao.razaoSocial, { align: "center" });
            if (instituicao.cnpj)
                doc.text(`CNPJ: ${instituicao.cnpj}`, { align: "center" });
            if (instituicao.enderecoCompleto)
                doc.text(instituicao.enderecoCompleto, { align: "center" });
            doc.moveDown();
            doc.fontSize(11).fillColor("#0f172a");
            doc.text(`Número da doação: ${doacao.numeroDoacao}`);
            doc.text(`Data e hora: ${doacao.dataHora ? new Date(doacao.dataHora).toLocaleString("pt-BR") : "-"}`);
            doc.text(`Doador: ${doacao.doadorNome ?? "Não informado"}`);
            doc.text(`Valor: ${doacao.valorLiquido.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`);
            doc.text(`Forma de pagamento: ${doacao.formaPagamento.toUpperCase()}`);
            if (doacao.campanhaNome)
                doc.text(`Campanha: ${doacao.campanhaNome}`);
            if (doacao.txid)
                doc.text(`TXID / referência: ${doacao.txid}`);
            doc.moveDown();
            doc.fontSize(10).fillColor("#475569").text(mensagemAgradecimento || "A instituição agradece o seu apoio. Este comprovante foi emitido automaticamente pelo G3N.");
            doc.end();
        });
    }
    async emitirComprovante(rawDoacaoId, userId) {
        const row = await this.repository.buscarDoacaoPorIdOuFalhar(parseId(rawDoacaoId));
        const doacao = mapCaptacaoDoacao(row);
        if (!["confirmado", "pago"].includes(doacao.situacao)) {
            throw new AppError("O comprovante só pode ser emitido para doações confirmadas.", 400);
        }
        const configuracoes = mapCaptacaoConfiguracoes(await this.repository.obterConfiguracoes());
        const numeroComprovante = gerarNumero("COMP");
        const codigoValidacao = gerarCodigoValidacao(`${doacao.numeroDoacao}:${numeroComprovante}`);
        const buffer = await this.gerarBufferComprovante(doacao, configuracoes.mensagemAgradecimento);
        const dataUrl = `data:application/pdf;base64,${buffer.toString("base64")}`;
        const arquivo = await this.storageService.salvarArquivo({
            scope: "doacao_comprovante",
            conteudo: dataUrl,
            nomeOriginal: `${numeroComprovante}.pdf`,
            mimeType: "application/pdf",
            entidadeId: parseId(rawDoacaoId),
            entidadeTipo: "captacao_doacao",
            usuarioUploadId: parseUserId(userId)
        });
        const comprovante = await this.repository.salvarComprovante(parseId(rawDoacaoId), {
            uuid: randomUUID(),
            doadorId: doacao.doadorId ? parseId(doacao.doadorId) : undefined,
            campanhaId: doacao.campanhaId ? parseId(doacao.campanhaId) : undefined,
            numeroComprovante,
            codigoValidacao,
            arquivoCaminho: arquivo.caminhoArquivo,
            mensagemAgradecimento: configuracoes.mensagemAgradecimento
        }, parseUserId(userId));
        await this.repository.alterarSituacaoDoacao(parseId(rawDoacaoId), doacao.situacao, parseUserId(userId), { comprovanteGerado: true });
        await this.repository.registrarEventoDoacao(parseId(rawDoacaoId), "COMPROVANTE_EMITIDO", "Comprovante gerado automaticamente.", { numeroComprovante, codigoValidacao }, parseUserId(userId));
        await this.repository.registrarLog("comprovante", BigInt(String(comprovante.id)), "EMISSAO", `Comprovante ${numeroComprovante} emitido.`, { doacaoId: rawDoacaoId }, parseUserId(userId));
        return { comprovante: mapCaptacaoComprovante(await this.repository.buscarComprovantePorDoacao(parseId(rawDoacaoId))) };
    }
    async listComprovantes(rawFilters) {
        const filters = captacaoListFiltersSchema.parse(rawFilters ?? {});
        const resultado = await this.repository.listarComprovantes(filters);
        return {
            pagina: Number(filters.pagina ?? 1) || 1,
            limite: Number(filters.limite ?? 20) || 20,
            total: resultado.total,
            comprovantes: resultado.rows.map(mapCaptacaoComprovante)
        };
    }
    async reenviarComprovante(rawDoacaoId, userId) {
        const comprovanteRow = await this.repository.buscarComprovantePorDoacao(parseId(rawDoacaoId));
        if (!comprovanteRow) {
            throw new AppError("Comprovante não encontrado para a doação.", 404);
        }
        const comprovante = mapCaptacaoComprovante(comprovanteRow);
        const destinatario = trimOrUndefined(String(comprovanteRow.email_principal ?? ""));
        if (!destinatario) {
            throw new AppError("O doador não possui e-mail principal cadastrado.", 400);
        }
        await this.emailService.enviarEmailSimples({
            destinatario,
            assunto: `Comprovante de doação ${comprovante.numeroComprovante}`,
            mensagem: `Olá, ${comprovante.doadorNome ?? "doador"}.\n\nSeu comprovante ${comprovante.numeroComprovante} foi emitido pela instituição.\n\nCampanha: ${comprovante.campanhaNome ?? "Não vinculada"}\nValor: ${comprovante.valorLiquido.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}\n\nAcesse o portal do doador ou solicite à equipe administrativa o download do arquivo.`
        });
        await this.repository.marcarComprovanteEnviado(parseId(comprovante.id), parseUserId(userId));
        await this.repository.registrarLog("comprovante", parseId(comprovante.id), "REENVIO", `Comprovante ${comprovante.numeroComprovante} reenviado por e-mail.`, { doacaoId: rawDoacaoId }, parseUserId(userId));
        return { sucesso: true };
    }
    async getConfiguracoes() {
        return { configuracoes: mapCaptacaoConfiguracoes(await this.repository.obterConfiguracoes()) };
    }
    async saveConfiguracoes(rawInput, userId) {
        const payload = captacaoConfiguracoesSchema.parse(rawInput ?? {});
        const row = await this.repository.salvarConfiguracoes(payload, parseUserId(userId));
        await this.repository.registrarLog("configuracoes", null, "EDICAO", "Configurações de pagamento atualizadas.", payload, parseUserId(userId));
        return { configuracoes: mapCaptacaoConfiguracoes(row) };
    }
    async listLogs() {
        const rows = await this.repository.listarLogs();
        return { logs: rows.map(mapCaptacaoLog) };
    }
    async exportarRelatorio(rawFilters, formato) {
        const doacoes = (await this.listDoacoes({ ...(captacaoListFiltersSchema.parse(rawFilters ?? {})), pagina: 1, limite: 5000 })).doacoes;
        if (formato === "excel") {
            const linhas = [
                ["Número", "Data", "Doador", "Campanha", "Valor", "Forma", "Situação", "Origem"],
                ...doacoes.map((item) => [item.numeroDoacao, item.dataHora ?? "", item.doadorNome ?? "", item.campanhaNome ?? "", item.valorLiquido, item.formaPagamento, item.situacao, item.origem])
            ];
            const csv = linhas.map((linha) => linha.map(csvEscape).join(";")).join("\n");
            return {
                filename: `captacao-recursos-${new Date().toISOString().slice(0, 10)}.csv`,
                contentType: "text/csv; charset=utf-8",
                buffer: Buffer.from(csv, "utf-8")
            };
        }
        const instituicao = await this.reportsRepository.obterInstituicaoRelatorio();
        const doc = new PDFDocument({ size: "A4", margin: 36 });
        const chunks = [];
        const buffer = await new Promise((resolve, reject) => {
            doc.on("data", (chunk) => chunks.push(chunk));
            doc.on("end", () => resolve(Buffer.concat(chunks)));
            doc.on("error", reject);
            doc.fontSize(17).text("Relatório gerencial de captação");
            doc.moveDown(0.25);
            doc.fontSize(10).fillColor("#475569").text(instituicao.razaoSocial);
            doc.text(`Emitido em ${new Date().toLocaleString("pt-BR")}`);
            doc.moveDown();
            doacoes.slice(0, 40).forEach((item) => {
                doc.fillColor("#0f172a").fontSize(10).text(`${item.numeroDoacao} | ${item.doadorNome ?? "Sem doador"} | ${item.valorLiquido.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} | ${item.situacao}`);
            });
            doc.end();
        });
        return {
            filename: `captacao-recursos-${new Date().toISOString().slice(0, 10)}.pdf`,
            contentType: "application/pdf",
            buffer
        };
    }
    async portalLogin(rawInput, metadata = {}) {
        const payload = captacaoPortalLoginSchema.parse(rawInput ?? {});
        const documentoNorm = payload.documento.replace(/\D/g, "");
        const row = await this.repository.obterDoadorPortalPorCredenciais(payload.email, documentoNorm || undefined);
        if (!row) {
            throw new AppError("Acesso ao portal não localizado para os dados informados.", 404);
        }
        const acesso = await this.repository.criarAcessoPortal(BigInt(String(row.id)), randomUUID(), { email: payload.email, ...metadata });
        await this.repository.registrarLog("portal_doador", BigInt(String(row.id)), "LOGIN_PORTAL", "Acesso ao portal doador realizado.", { email: payload.email }, undefined);
        return { token: acesso.token, expiraEm: acesso.expiraEm, doador: mapCaptacaoDoador(await this.repository.buscarDoadorPorIdOuFalhar(BigInt(String(row.id)))) };
    }
    async obterPainelPortal(rawToken) {
        const { token } = captacaoPortalTokenSchema.parse({ token: rawToken });
        const acesso = await this.repository.obterAcessoPortalValido(token);
        if (!acesso)
            throw new AppError("Sessão do portal expirada.", 401);
        await this.repository.registrarAcessoPortal(token);
        const doadorId = BigInt(String(acesso.doador_id_real ?? acesso.doador_id));
        const doador = mapCaptacaoDoador(await this.repository.buscarDoadorPorIdOuFalhar(doadorId));
        const doacoes = (await this.repository.listarDoacoesPorDoador(doadorId)).map(mapCaptacaoDoacao);
        const comprovantes = (await this.repository.listarComprovantesPorDoador(doadorId)).map(mapCaptacaoComprovante);
        const recorrencias = (await this.repository.listarRecorrenciasPorDoador(doadorId)).map(mapCaptacaoRecorrencia);
        const campanhas = (await this.repository.listarCampanhas({ pagina: 1, limite: 100, status: "ativa" })).rows.map(mapCaptacaoCampanha).filter((item) => item.visivelAoPublico);
        return { doador, doacoes, comprovantes, recorrencias, campanhas };
    }
    async atualizarPortalDoador(rawToken, rawInput) {
        const { token } = captacaoPortalTokenSchema.parse({ token: rawToken });
        const acesso = await this.repository.obterAcessoPortalValido(token);
        if (!acesso)
            throw new AppError("Sessão do portal expirada.", 401);
        const input = rawInput;
        await this.repository.atualizarDadosPortalDoador(BigInt(String(acesso.doador_id_real ?? acesso.doador_id)), {
            email: trimOrUndefined(input.email),
            emailNorm: input.email ? normalizarEmail(input.email) : undefined,
            telefone: trimOrUndefined(input.telefone),
            telefoneNorm: input.telefone ? normalizarTelefone(input.telefone) : undefined,
            whatsapp: trimOrUndefined(input.whatsapp),
            whatsappNorm: input.whatsapp ? normalizarTelefone(input.whatsapp) : undefined,
            cidade: trimOrUndefined(input.cidade),
            uf: trimOrUndefined(input.uf)?.toUpperCase()
        });
        return this.obterPainelPortal(token);
    }
    async criarDoacaoPortal(rawToken, rawInput) {
        const { token } = captacaoPortalTokenSchema.parse({ token: rawToken });
        const acesso = await this.repository.obterAcessoPortalValido(token);
        if (!acesso)
            throw new AppError("Sessão do portal expirada.", 401);
        const payload = captacaoDoacaoInputSchema.parse(rawInput ?? {});
        const salvo = await this.saveDoacao({ ...payload, doadorId: String(acesso.doador_id_real ?? acesso.doador_id), origem: "portal_doador" });
        return this.gerarCobranca(salvo.doacao.id);
    }
    async cancelarRecorrenciaPortal(rawToken, rawRecorrenciaId) {
        const { token } = captacaoPortalTokenSchema.parse({ token: rawToken });
        const acesso = await this.repository.obterAcessoPortalValido(token);
        if (!acesso)
            throw new AppError("Sessão do portal expirada.", 401);
        const row = await this.repository.cancelarRecorrenciaPortal(parseId(rawRecorrenciaId), BigInt(String(acesso.doador_id_real ?? acesso.doador_id)));
        await this.repository.registrarLog("recorrencia", BigInt(String(row.id)), "CANCELAMENTO_PORTAL", "Recorrência cancelada pelo portal do doador.", { recorrenciaId: rawRecorrenciaId }, undefined);
        return { recorrencia: mapCaptacaoRecorrencia(row) };
    }
}
