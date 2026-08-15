import { AppError } from "../../../shared/errors/app-error.js";
import { agendamentoCheckInInputSchema, agendamentoConclusaoInputSchema, agendamentoCopiaInputSchema, agendamentoFiltrosSchema, agendamentoInputSchema, agendamentoListaEsperaInputSchema, agendamentoOperacionalInputSchema, agendamentoRemarcacaoInputSchema } from "../agendamentos.schema.js";
import { AgendamentosRepository } from "../repositories/agendamentos.repository.js";
export class AgendamentosService {
    repository = new AgendamentosRepository();
    presentationTenantId = process.env.G3N_PRESENTATION_TENANT_ID?.trim() || "c7ad2d88-2b7a-4a74-9d73-1e7c7a9f6c10";
    presentationSlug = (process.env.G3N_PRESENTATION_SLUG ?? "g3n-apresentacao").trim().toLowerCase();
    resolverTenantId(tenantId, instituicaoSlug) {
        const tenant = this.parseTenantId(tenantId);
        const slug = instituicaoSlug?.trim().toLowerCase();
        if (slug && slug === this.presentationSlug) {
            return this.presentationTenantId;
        }
        return tenant;
    }
    async listar(rawFilters, tenantId, instituicaoSlug) {
        const filtros = agendamentoFiltrosSchema.parse(rawFilters ?? {});
        return this.repository.listar(filtros, this.resolverTenantId(tenantId, instituicaoSlug));
    }
    async obter(rawId, tenantId, instituicaoSlug) {
        return this.repository.obter(this.parseId(rawId), this.resolverTenantId(tenantId, instituicaoSlug));
    }
    async criar(rawInput, usuario, tenantId, instituicaoSlug) {
        const tenantObrigatorio = this.resolverTenantId(tenantId, instituicaoSlug);
        const body = rawInput;
        if (body && "itemId" in body && "tipo" in body && ("beneficiariosIds" in body || "matriculasIds" in body)) {
            const input = agendamentoOperacionalInputSchema.parse(rawInput);
            if (input.id) {
                return this.repository.atualizarOperacional(this.parseId(input.id), input, usuario, tenantObrigatorio);
            }
            return this.repository.criarOperacional(input, usuario, tenantObrigatorio);
        }
        const input = agendamentoInputSchema.parse(rawInput);
        return this.repository.criar(input, usuario, tenantObrigatorio);
    }
    async atualizar(rawId, rawInput, usuario, tenantId, instituicaoSlug) {
        const input = agendamentoInputSchema.parse(rawInput);
        return this.repository.atualizar(this.parseId(rawId), input, usuario, this.resolverTenantId(tenantId, instituicaoSlug));
    }
    async cancelar(rawId, rawInput, usuario, tenantId, instituicaoSlug) {
        const body = (rawInput ?? {});
        return this.repository.cancelar(this.parseId(rawId), body.motivo, usuario, this.resolverTenantId(tenantId, instituicaoSlug));
    }
    async excluir(rawId, usuario, tenantId, instituicaoSlug) {
        return this.repository.excluir(this.parseId(rawId), usuario, this.resolverTenantId(tenantId, instituicaoSlug));
    }
    async remarcar(rawId, rawInput, usuario, tenantId, instituicaoSlug) {
        const input = agendamentoRemarcacaoInputSchema.parse(rawInput);
        return this.repository.remarcar(this.parseId(rawId), input, usuario, this.resolverTenantId(tenantId, instituicaoSlug));
    }
    async copiar(rawId, rawInput, usuario, tenantId, instituicaoSlug) {
        const input = agendamentoCopiaInputSchema.parse(rawInput);
        return this.repository.copiar(this.parseId(rawId), input.data, usuario, this.resolverTenantId(tenantId, instituicaoSlug));
    }
    async confirmar(rawId, rawInput, usuario, tenantId, instituicaoSlug) {
        const body = (rawInput ?? {});
        return this.repository.confirmar(this.parseId(rawId), body.canal, body.observacao, usuario, this.resolverTenantId(tenantId, instituicaoSlug));
    }
    async checkIn(rawId, rawInput, usuario, tenantId, instituicaoSlug) {
        const input = agendamentoCheckInInputSchema.parse(rawInput);
        return this.repository.checkIn(this.parseId(rawId), input, usuario, this.resolverTenantId(tenantId, instituicaoSlug));
    }
    async concluir(rawId, rawInput, usuario, tenantId, instituicaoSlug) {
        const input = agendamentoConclusaoInputSchema.parse(rawInput);
        return this.repository.concluir(this.parseId(rawId), input, usuario, this.resolverTenantId(tenantId, instituicaoSlug));
    }
    async listarListaEspera(tenantId, instituicaoSlug) {
        return this.repository.listarListaEspera(this.resolverTenantId(tenantId, instituicaoSlug));
    }
    async criarListaEspera(rawInput, tenantId, instituicaoSlug) {
        const input = agendamentoListaEsperaInputSchema.parse(rawInput);
        return this.repository.criarListaEspera(input, this.resolverTenantId(tenantId, instituicaoSlug));
    }
    async converterListaEspera(rawId, rawInput, usuario, tenantId, instituicaoSlug) {
        const input = agendamentoInputSchema.parse(rawInput);
        return this.repository.converterListaEspera(this.parseId(rawId), input, usuario, this.resolverTenantId(tenantId, instituicaoSlug));
    }
    async indicadores(rawFilters, tenantId, instituicaoSlug) {
        const filtros = agendamentoFiltrosSchema.parse(rawFilters ?? {});
        return this.repository.indicadores(filtros, this.resolverTenantId(tenantId, instituicaoSlug));
    }
    async catalogos(tenantId, instituicaoSlug) {
        return this.repository.catalogos(this.resolverTenantId(tenantId, instituicaoSlug));
    }
    async listarItens(rawTipo, rawBusca, tenantId, instituicaoSlug) {
        const tipo = String(rawTipo ?? "").trim().toLowerCase();
        if (!["curso", "atendimento", "oficina"].includes(tipo)) {
            throw new AppError("Tipo operacional invalido.", 400);
        }
        return this.repository.listarItensOperacionais(tipo, typeof rawBusca === "string" ? rawBusca : undefined, this.resolverTenantId(tenantId, instituicaoSlug));
    }
    async listarBeneficiarios(rawItemId, tenantId, instituicaoSlug) {
        const itemId = Number(rawItemId);
        if (!Number.isInteger(itemId) || itemId <= 0) {
            throw new AppError("Item operacional invalido.", 400);
        }
        return this.repository.listarBeneficiariosOperacionais(BigInt(itemId), this.resolverTenantId(tenantId, instituicaoSlug));
    }
    async notificar(rawId, rawBody, usuario, tenantId, instituicaoSlug) {
        const body = (rawBody ?? {});
        const canal = String(body.canal ?? "").trim().toUpperCase();
        if (canal !== "WHATSAPP" && canal !== "EMAIL") {
            throw new AppError("Canal de notificacao invalido.", 400);
        }
        return this.repository.notificar(this.parseId(rawId), canal, usuario, this.resolverTenantId(tenantId, instituicaoSlug));
    }
    parseId(rawId) {
        const parsed = Number(rawId);
        if (!Number.isInteger(parsed) || parsed <= 0) {
            throw new AppError("Identificador invalido.", 400);
        }
        return BigInt(parsed);
    }
    parseTenantId(rawTenantId) {
        const tenantId = rawTenantId?.trim();
        if (!tenantId) {
            throw new AppError("Tenant da sessao nao identificado.", 401);
        }
        return tenantId;
    }
}
