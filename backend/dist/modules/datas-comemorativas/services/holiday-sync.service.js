import { AppError } from "../../../shared/errors/app-error.js";
import { DatasComemorativasRepository } from "../repositories/datas-comemorativas.repository.js";
import { ProviderFactory } from "../providers/provider-factory.js";
export class HolidaySyncService {
    repository = new DatasComemorativasRepository();
    providerFactory = new ProviderFactory();
    async syncYear(year, providerName, usuarioId) {
        if (!Number.isInteger(year) || year < 2000 || year > 2100) {
            throw new AppError("Ano invalido para sincronizacao.", 400);
        }
        const configuracoes = await this.repository.buscarConfiguracoes();
        const providers = providerName
            ? {
                primary: this.providerFactory.getHolidayProvider(providerName),
                fallback: undefined
            }
            : this.providerFactory.getHolidayProviderWithFallback(configuracoes.providerFeriadoPrincipal, configuracoes.providerFeriadoFallback);
        const logId = await this.repository.iniciarSyncLog({
            providerNome: providerName ?? providers.primary.getProviderName(),
            tipoSync: "feriados",
            parametrosExecucao: { ano: year, country: "BR" },
            executadoPor: this.parseId(usuarioId) ?? null
        });
        const counters = {
            lidos: 0,
            inseridos: 0,
            atualizados: 0,
            ignorados: 0,
            erros: 0
        };
        try {
            let providerUsado = providers.primary;
            const itens = await this.carregarComFallback(year, providers.primary, providers.fallback);
            if (!itens.length && providers.fallback) {
                providerUsado = providers.fallback;
            }
            counters.lidos = itens.length;
            for (const item of itens) {
                try {
                    const resultado = await this.repository.salvarImportado(this.mapHolidayPayload(item, providerUsado.getProviderName()), this.parseId(usuarioId) ?? null);
                    if (resultado.acao === "inserido") {
                        counters.inseridos += 1;
                    }
                    else {
                        counters.atualizados += 1;
                    }
                }
                catch {
                    counters.erros += 1;
                }
            }
            await this.repository.finalizarSyncLog({
                logId,
                quantidadeLidos: counters.lidos,
                quantidadeInseridos: counters.inseridos,
                quantidadeAtualizados: counters.atualizados,
                quantidadeIgnorados: counters.ignorados,
                quantidadeErros: counters.erros,
                statusExecucao: counters.erros > 0 ? "parcial" : "sucesso"
            });
            await this.repository.registrarAuditoria("SYNC_FERIADOS", {
                ano: year,
                provider: providerUsado.getProviderName(),
                ...counters
            }, this.parseId(usuarioId));
            return {
                ano: year,
                provider: providerUsado.getProviderName(),
                ...counters
            };
        }
        catch (error) {
            await this.repository.finalizarSyncLog({
                logId,
                quantidadeLidos: counters.lidos,
                quantidadeInseridos: counters.inseridos,
                quantidadeAtualizados: counters.atualizados,
                quantidadeIgnorados: counters.ignorados,
                quantidadeErros: counters.erros + 1,
                statusExecucao: "erro",
                detalhesErro: error instanceof Error ? error.message : "Falha ao sincronizar feriados."
            });
            throw error;
        }
    }
    async syncRange(startYear, endYear, providerName, usuarioId) {
        if (endYear < startYear) {
            throw new AppError("O ano final deve ser maior ou igual ao inicial.", 400);
        }
        const anos = Array.from({ length: endYear - startYear + 1 }, (_, indice) => startYear + indice);
        const resultados = [];
        for (const ano of anos) {
            resultados.push(await this.syncYear(ano, providerName, usuarioId));
        }
        return {
            inicio: startYear,
            fim: endYear,
            resultados
        };
    }
    async syncCurrentAndNextYear(usuarioId) {
        const anoAtual = new Date().getFullYear();
        return this.syncRange(anoAtual, anoAtual + 1, undefined, usuarioId);
    }
    mapHolidayPayload(item, providerName) {
        const dataEvento = item.dataEvento ?? null;
        const [ano, mes, dia] = (dataEvento ?? "").split("-").map(Number);
        return {
            titulo: item.titulo,
            descricao: item.descricao ?? "Feriado oficial",
            dia: Number.isFinite(dia) ? dia : item.dia ?? null,
            mes: Number.isFinite(mes) ? mes : item.mes ?? null,
            ano: Number.isFinite(ano) ? ano : item.ano ?? null,
            dataEvento,
            tipoEvento: item.tipoEvento,
            abrangencia: item.abrangencia,
            uf: item.uf ?? null,
            municipio: item.municipio ?? null,
            recorrenteAnual: false,
            fonteOrigem: `api_${providerName}`,
            origemReferencia: item.origemReferencia ?? providerName,
            corExibicao: item.corExibicao ?? "#b91c1c",
            icone: item.icone ?? "CalendarDays",
            prioridadePopup: item.prioridadePopup ?? 30,
            exibirNoPopup: item.exibirNoPopup ?? true,
            ativo: item.ativo ?? true,
            providerNome: providerName
        };
    }
    async carregarComFallback(year, primary, fallback) {
        try {
            return await primary.getHolidays(year, "BR");
        }
        catch (error) {
            if (!fallback || fallback.getProviderName() === primary.getProviderName()) {
                throw error;
            }
            return fallback.getHolidays(year, "BR");
        }
    }
    parseId(value) {
        if (!value)
            return undefined;
        return BigInt(value);
    }
}
