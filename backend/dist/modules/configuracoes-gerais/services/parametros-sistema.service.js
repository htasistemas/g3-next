import { atualizarCarenciaDoacaoRealizadaPayloadSchema, atualizarPersonalizacaoPayloadSchema, carenciaDoacaoRealizadaSchema, personalizacaoSistemaSchema } from "../parametros-sistema.schema.js";
import { ParametrosSistemaRepository } from "../repositories/parametros-sistema.repository.js";
const personalizacaoPadrao = {
    modo: "CLARO",
    preset: "PADRAO_VERDE",
    paleta: {
        cor_primaria: "#0f7a43",
        cor_secundaria: "#1d4ed8",
        cor_destaque: "#f59e0b",
        cor_botao_primario: "#0f7a43",
        cor_link: "#0f7a43",
        cor_elemento_ativo: "#0f7a43",
        background: "#f5faf7",
        foreground: "#0f172a",
        border: "#dbe7e0",
        muted: "#64748b",
        card: "#ffffff",
        danger: "#dc2626",
        warning: "#d97706",
        success: "#16a34a",
        info: "#0284c7"
    }
};
const carenciaDoacaoRealizadaPadrao = {
    tempo_carencia_dias: 0
};
export class ParametrosSistemaService {
    repository = new ParametrosSistemaRepository();
    async obterPersonalizacao() {
        const registro = await this.repository.buscarPersonalizacao();
        if (!registro) {
            return {
                personalizacao: personalizacaoPadrao,
                atualizado_em: null
            };
        }
        const normalizado = personalizacaoSistemaSchema.parse({
            ...personalizacaoPadrao,
            ...registro.valor,
            paleta: {
                ...personalizacaoPadrao.paleta,
                ...(registro.valor?.paleta ?? {})
            }
        });
        return {
            personalizacao: normalizado,
            atualizado_em: registro.atualizado_em.toISOString()
        };
    }
    async atualizarPersonalizacao(rawPayload, usuarioAtualizacao) {
        const payload = atualizarPersonalizacaoPayloadSchema.parse(rawPayload);
        const normalizado = personalizacaoSistemaSchema.parse({
            ...personalizacaoPadrao,
            ...payload.personalizacao,
            paleta: {
                ...personalizacaoPadrao.paleta,
                ...(payload.personalizacao.paleta ?? {})
            }
        });
        const salvo = await this.repository.salvarPersonalizacao(normalizado, usuarioAtualizacao);
        return {
            personalizacao: normalizado,
            atualizado_em: salvo.atualizado_em.toISOString()
        };
    }
    getPersonalizacaoPadrao() {
        return personalizacaoPadrao;
    }
    async obterCarenciaDoacaoRealizada() {
        const registro = await this.repository.buscarCarenciaDoacaoRealizada();
        if (!registro) {
            return {
                carencia: carenciaDoacaoRealizadaPadrao,
                atualizado_em: null
            };
        }
        const normalizado = carenciaDoacaoRealizadaSchema.parse({
            ...carenciaDoacaoRealizadaPadrao,
            ...registro.valor
        });
        return {
            carencia: normalizado,
            atualizado_em: registro.atualizado_em.toISOString()
        };
    }
    async atualizarCarenciaDoacaoRealizada(rawPayload, usuarioAtualizacao) {
        const payload = atualizarCarenciaDoacaoRealizadaPayloadSchema.parse(rawPayload);
        const normalizado = carenciaDoacaoRealizadaSchema.parse({
            ...carenciaDoacaoRealizadaPadrao,
            ...payload.carencia
        });
        const salvo = await this.repository.salvarCarenciaDoacaoRealizada(normalizado, usuarioAtualizacao);
        return {
            carencia: normalizado,
            atualizado_em: salvo.atualizado_em.toISOString()
        };
    }
    getCarenciaDoacaoRealizadaPadrao() {
        return carenciaDoacaoRealizadaPadrao;
    }
}
