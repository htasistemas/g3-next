import { AppError } from "../../../shared/errors/app-error.js";
import { mapaCamposTextoControleVeiculos } from "../../../utils/text-format-config.js";
import { normalizarObjetoTexto } from "../../../utils/text-formatter.js";
import {
  mapDiarioBordoToResponse,
  mapMotoristaAutorizadoToResponse,
  mapVeiculoToResponse
} from "../controle-veiculos.mapper.js";
import {
  diarioBordoInputSchema,
  motoristaAutorizadoInputSchema,
  veiculoInputSchema
} from "../controle-veiculos.schema.js";
import { ControleVeiculosRepository } from "../repositories/controle-veiculos.repository.js";

export class ControleVeiculosService {
  private readonly repository = new ControleVeiculosRepository();

  async listarVeiculos() {
    const registros = await this.repository.listarVeiculos();
    return registros.map(mapVeiculoToResponse);
  }

  async criarVeiculo(rawInput: unknown) {
    const input = veiculoInputSchema.parse(this.normalizarPayload(rawInput));
    const registro = await this.repository.criarVeiculo(input);
    return mapVeiculoToResponse(registro);
  }

  async atualizarVeiculo(rawId: string, rawInput: unknown) {
    const id = this.parseId(rawId);
    const input = veiculoInputSchema.parse(this.normalizarPayload(rawInput));
    const registro = await this.repository.atualizarVeiculo(id, input);
    return mapVeiculoToResponse(registro);
  }

  async removerVeiculo(rawId: string) {
    const id = this.parseId(rawId);
    await this.repository.removerVeiculo(id);
  }

  async listarDiario() {
    const registros = await this.repository.listarDiario();
    return registros.map(mapDiarioBordoToResponse);
  }

  async criarDiario(rawInput: unknown) {
    const input = diarioBordoInputSchema.parse(this.normalizarPayload(rawInput));
    const registro = await this.repository.criarDiario(input);
    return mapDiarioBordoToResponse(registro);
  }

  async atualizarDiario(rawId: string, rawInput: unknown) {
    const id = this.parseId(rawId);
    const input = diarioBordoInputSchema.parse(this.normalizarPayload(rawInput));
    const registro = await this.repository.atualizarDiario(id, input);
    return mapDiarioBordoToResponse(registro);
  }

  async removerDiario(rawId: string) {
    const id = this.parseId(rawId);
    await this.repository.removerDiario(id);
  }

  async listarMotoristasDisponiveis(rawNome?: unknown) {
    const nome = typeof rawNome === "string" ? rawNome : undefined;
    const registros = await this.repository.listarMotoristasDisponiveis(nome);
    return registros.map((item) => ({
      id: Number(item.id),
      tipoOrigem: item.tipo_origem,
      nome: item.nome
    }));
  }

  async listarMotoristasAutorizados(rawVeiculoId?: unknown) {
    const veiculoId =
      typeof rawVeiculoId === "string" && rawVeiculoId.trim()
        ? Number(rawVeiculoId)
        : typeof rawVeiculoId === "number"
          ? rawVeiculoId
          : undefined;

    const registros = await this.repository.listarMotoristasAutorizados(
      Number.isInteger(veiculoId) && (veiculoId as number) > 0 ? (veiculoId as number) : undefined
    );
    return registros.map(mapMotoristaAutorizadoToResponse);
  }

  async criarMotoristaAutorizado(rawInput: unknown) {
    const input = motoristaAutorizadoInputSchema.parse(this.normalizarPayload(rawInput));
    const registro = await this.repository.criarMotoristaAutorizado(input);
    return mapMotoristaAutorizadoToResponse(registro);
  }

  async atualizarMotoristaAutorizado(rawId: string, rawInput: unknown) {
    const id = this.parseId(rawId);
    const input = motoristaAutorizadoInputSchema.parse(this.normalizarPayload(rawInput));
    const registro = await this.repository.atualizarMotoristaAutorizado(id, input);
    return mapMotoristaAutorizadoToResponse(registro);
  }

  async removerMotoristaAutorizado(rawId: string) {
    const id = this.parseId(rawId);
    await this.repository.removerMotoristaAutorizado(id);
  }

  private parseId(rawId: string): bigint {
    const id = Number(rawId);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError("Identificador inválido.", 400);
    }
    return BigInt(id);
  }

  private normalizarPayload(rawInput: unknown) {
    if (!rawInput || typeof rawInput !== "object") return rawInput;
    return normalizarObjetoTexto(
      rawInput as Record<string, unknown>,
      mapaCamposTextoControleVeiculos
    );
  }
}
