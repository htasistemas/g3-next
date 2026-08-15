import { AppError } from "../../../shared/errors/app-error.js";
import { storageService } from "../../arquivos/services/storage-instance.js";
import { normalizarTelefone } from "../../../utils/br-utils.js";
import { mapaCamposTextoControleVeiculos } from "../../../utils/text-format-config.js";
import { normalizarObjetoTexto } from "../../../utils/text-formatter.js";
import { mapDiarioBordoToResponse, mapLocalDestinoToResponse, mapMotoristaAutorizadoToResponse, mapVeiculoToResponse } from "../controle-veiculos.mapper.js";
import { diarioBordoInputSchema, localDestinoInputSchema, motoristaAutorizadoInputSchema, veiculoInputSchema } from "../controle-veiculos.schema.js";
import { ControleVeiculosRepository } from "../repositories/controle-veiculos.repository.js";
export class ControleVeiculosService {
    repository = new ControleVeiculosRepository();
    async listarVeiculos(rawTenantId) {
        const tenantId = this.parseTenant(rawTenantId);
        const registros = await this.repository.listarVeiculos(tenantId);
        return registros.map(mapVeiculoToResponse);
    }
    async criarVeiculo(rawInput, rawTenantId) {
        const input = veiculoInputSchema.parse(this.normalizarPayload(rawInput));
        const tenantId = this.parseTenant(rawTenantId);
        const registro = await this.repository.criarVeiculo(input, tenantId);
        return mapVeiculoToResponse(registro);
    }
    async atualizarVeiculo(rawId, rawInput, rawTenantId) {
        const id = this.parseId(rawId);
        const tenantId = this.parseTenant(rawTenantId);
        const registroAtual = await this.repository.buscarVeiculoPorIdOuFalhar(id, tenantId);
        const input = veiculoInputSchema.parse(this.normalizarPayload(rawInput));
        const registro = await this.repository.atualizarVeiculo(id, input, tenantId);
        await storageService.rollbackArquivos([
            registroAtual.foto_frente && registroAtual.foto_frente !== registro.foto_frente
                ? registroAtual.foto_frente
                : undefined,
            registroAtual.foto_lateral_esquerda &&
                registroAtual.foto_lateral_esquerda !== registro.foto_lateral_esquerda
                ? registroAtual.foto_lateral_esquerda
                : undefined,
            registroAtual.foto_lateral_direita &&
                registroAtual.foto_lateral_direita !== registro.foto_lateral_direita
                ? registroAtual.foto_lateral_direita
                : undefined,
            registroAtual.foto_traseira && registroAtual.foto_traseira !== registro.foto_traseira
                ? registroAtual.foto_traseira
                : undefined,
            registroAtual.documento_veiculo_pdf &&
                registroAtual.documento_veiculo_pdf !== registro.documento_veiculo_pdf
                ? registroAtual.documento_veiculo_pdf
                : undefined
        ]);
        return mapVeiculoToResponse(registro);
    }
    async removerVeiculo(rawId, rawTenantId) {
        const id = this.parseId(rawId);
        const tenantId = this.parseTenant(rawTenantId);
        const registro = await this.repository.buscarVeiculoPorIdOuFalhar(id, tenantId);
        await this.repository.removerVeiculo(id, tenantId);
        await storageService.rollbackArquivos([
            registro.foto_frente ?? undefined,
            registro.foto_lateral_esquerda ?? undefined,
            registro.foto_lateral_direita ?? undefined,
            registro.foto_traseira ?? undefined,
            registro.documento_veiculo_pdf ?? undefined
        ]);
    }
    async listarDiario(rawTenantId) {
        const tenantId = this.parseTenant(rawTenantId);
        const registros = await this.repository.listarDiario(tenantId);
        return registros.map(mapDiarioBordoToResponse);
    }
    async criarDiario(rawInput, rawTenantId) {
        const input = diarioBordoInputSchema.parse(this.normalizarPayload(rawInput));
        const tenantId = this.parseTenant(rawTenantId);
        const registro = await this.repository.criarDiario(input, tenantId);
        return mapDiarioBordoToResponse(registro);
    }
    async atualizarDiario(rawId, rawInput, rawTenantId) {
        const id = this.parseId(rawId);
        const tenantId = this.parseTenant(rawTenantId);
        const input = diarioBordoInputSchema.parse(this.normalizarPayload(rawInput));
        const registro = await this.repository.atualizarDiario(id, input, tenantId);
        return mapDiarioBordoToResponse(registro);
    }
    async removerDiario(rawId, rawTenantId) {
        const id = this.parseId(rawId);
        const tenantId = this.parseTenant(rawTenantId);
        await this.repository.removerDiario(id, tenantId);
    }
    async listarLocaisDestino(rawTenantId) {
        const tenantId = this.parseTenant(rawTenantId);
        const registros = await this.repository.listarLocaisDestino(tenantId);
        return registros.map(mapLocalDestinoToResponse);
    }
    async criarLocalDestino(rawInput, rawTenantId) {
        const input = this.normalizarLocalDestinoInput(localDestinoInputSchema.parse(this.normalizarPayload(rawInput)));
        const tenantId = this.parseTenant(rawTenantId);
        if (!input.nome) {
            throw new AppError("Informe o nome do local de destino.", 400);
        }
        const registro = await this.repository.criarLocalDestino(input, tenantId);
        return mapLocalDestinoToResponse(registro);
    }
    async atualizarLocalDestino(rawId, rawInput, rawTenantId) {
        const id = this.parseId(rawId);
        const input = this.normalizarLocalDestinoInput(localDestinoInputSchema.parse(this.normalizarPayload(rawInput)));
        const tenantId = this.parseTenant(rawTenantId);
        if (!input.nome) {
            throw new AppError("Informe o nome do local de destino.", 400);
        }
        const registro = await this.repository.atualizarLocalDestino(id, input, tenantId);
        return mapLocalDestinoToResponse(registro);
    }
    async removerLocalDestino(rawId, rawTenantId) {
        const id = this.parseId(rawId);
        const tenantId = this.parseTenant(rawTenantId);
        await this.repository.removerLocalDestino(id, tenantId);
    }
    async listarMotoristasDisponiveis(rawNome, rawTenantId) {
        const nome = typeof rawNome === "string" ? rawNome : undefined;
        const tenantId = this.parseTenant(rawTenantId);
        const registros = await this.repository.listarMotoristasDisponiveis(nome, tenantId);
        return registros.map((item) => ({
            id: Number(item.id),
            tipoOrigem: item.tipo_origem,
            nome: item.nome
        }));
    }
    async listarMotoristasAutorizados(rawVeiculoId, rawTenantId) {
        const tenantId = this.parseTenant(rawTenantId);
        const veiculoId = typeof rawVeiculoId === "string" && rawVeiculoId.trim()
            ? Number(rawVeiculoId)
            : typeof rawVeiculoId === "number"
                ? rawVeiculoId
                : undefined;
        const registros = await this.repository.listarMotoristasAutorizados(Number.isInteger(veiculoId) && veiculoId > 0 ? veiculoId : undefined, tenantId);
        return registros.map(mapMotoristaAutorizadoToResponse);
    }
    async criarMotoristaAutorizado(rawInput, rawTenantId) {
        const input = motoristaAutorizadoInputSchema.parse(this.normalizarPayload(rawInput));
        const tenantId = this.parseTenant(rawTenantId);
        const registro = await this.repository.criarMotoristaAutorizado(input, tenantId);
        return mapMotoristaAutorizadoToResponse(registro);
    }
    async atualizarMotoristaAutorizado(rawId, rawInput, rawTenantId) {
        const id = this.parseId(rawId);
        const tenantId = this.parseTenant(rawTenantId);
        const input = motoristaAutorizadoInputSchema.parse(this.normalizarPayload(rawInput));
        const registro = await this.repository.atualizarMotoristaAutorizado(id, input, tenantId);
        return mapMotoristaAutorizadoToResponse(registro);
    }
    async removerMotoristaAutorizado(rawId, rawTenantId) {
        const id = this.parseId(rawId);
        const tenantId = this.parseTenant(rawTenantId);
        await this.repository.removerMotoristaAutorizado(id, tenantId);
    }
    parseId(rawId) {
        const id = Number(rawId);
        if (!Number.isInteger(id) || id <= 0) {
            throw new AppError("Identificador inválido.", 400);
        }
        return BigInt(id);
    }
    parseTenant(rawTenantId) {
        const tenantId = rawTenantId?.trim();
        if (!tenantId) {
            throw new AppError("Tenant da sessao nao identificado.", 401);
        }
        return tenantId;
    }
    normalizarPayload(rawInput) {
        if (!rawInput || typeof rawInput !== "object")
            return rawInput;
        return normalizarObjetoTexto(rawInput, mapaCamposTextoControleVeiculos);
    }
    normalizarLocalDestinoInput(input) {
        return {
            ...input,
            telefone: input.telefone ? normalizarTelefone(input.telefone) : undefined
        };
    }
}
