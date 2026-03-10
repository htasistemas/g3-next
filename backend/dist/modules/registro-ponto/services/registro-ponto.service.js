import { AppError } from "../../../shared/errors/app-error.js";
import { registroPontoAjusteSchema, registroPontoFiltersSchema, registroPontoMarcarSchema, registroPontoOcorrenciaSchema } from "../registro-ponto.schema.js";
import { RegistroPontoRepository } from "../repositories/registro-ponto.repository.js";
export class RegistroPontoService {
    repository = new RegistroPontoRepository();
    async listar(rawFilters, atorRaw) {
        const filters = registroPontoFiltersSchema.parse(rawFilters);
        const ator = this.parseAtor(atorRaw);
        return this.repository.listar(filters, ator);
    }
    async listarEspelho(rawFilters, atorRaw) {
        const filters = registroPontoFiltersSchema.parse(rawFilters);
        const ator = this.parseAtor(atorRaw);
        return this.repository.listarEspelho(filters, ator);
    }
    async listarUsuarios(rawTermo) {
        const termo = typeof rawTermo === "string" ? rawTermo : undefined;
        return this.repository.listarUsuarios(termo);
    }
    async marcarPonto(rawInput, atorRaw, origem) {
        const input = registroPontoMarcarSchema.parse(rawInput ?? {});
        const ator = this.parseAtor(atorRaw);
        return this.repository.marcarPonto(input, ator, origem);
    }
    async ajustarRegistro(rawRegistroId, rawInput, atorRaw, origem) {
        const input = registroPontoAjusteSchema.parse(rawInput);
        const ator = this.parseAtor(atorRaw);
        return this.repository.ajustarRegistro(rawRegistroId, input, ator, origem);
    }
    async adicionarOcorrencia(rawRegistroId, rawInput, atorRaw, origem) {
        const input = registroPontoOcorrenciaSchema.parse(rawInput);
        const ator = this.parseAtor(atorRaw);
        return this.repository.adicionarOcorrencia(rawRegistroId, input, ator, origem);
    }
    async buscarHistorico(rawRegistroId, atorRaw) {
        const ator = this.parseAtor(atorRaw);
        return this.repository.buscarHistorico(rawRegistroId, ator);
    }
    parseAtor(atorRaw) {
        const nome_usuario = atorRaw.nomeUsuario?.trim();
        if (!nome_usuario) {
            throw new AppError("Usuario autenticado invalido.", 401);
        }
        const idNumerico = Number(atorRaw.id);
        const id = Number.isInteger(idNumerico) && idNumerico > 0
            ? BigInt(idNumerico)
            : undefined;
        return {
            id,
            nome_usuario,
            permissoes: atorRaw.permissoes ?? []
        };
    }
}
