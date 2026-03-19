import { dataComemorativaConfiguracaoSchema } from "../datas-comemorativas.schema.js";
import { DatasComemorativasRepository } from "../repositories/datas-comemorativas.repository.js";
export class SettingsCommemorativeService {
    repository = new DatasComemorativasRepository();
    async get() {
        const configuracoes = await this.repository.buscarConfiguracoes();
        return { configuracoes };
    }
    async save(rawInput, usuarioId) {
        const input = dataComemorativaConfiguracaoSchema.parse(rawInput ?? {});
        const configuracoes = await this.repository.salvarConfiguracoes(input, this.parseId(usuarioId));
        await this.repository.registrarAuditoria("CONFIGURACAO", { chavesAtualizadas: Object.keys(input) }, this.parseId(usuarioId));
        return { configuracoes };
    }
    parseId(value) {
        if (!value)
            return undefined;
        return BigInt(value);
    }
}
