import { AppError } from "../../../shared/errors/app-error.js";
import { storageService } from "../../arquivos/services/storage-instance.js";
import { normalizarTelefone } from "../../../utils/br-utils.js";
import { mapaCamposTextoControleVeiculos } from "../../../utils/text-format-config.js";
import { normalizarObjetoTexto } from "../../../utils/text-formatter.js";
import {
  mapDiarioBordoToResponse,
  mapLocalDestinoToResponse,
  mapMotoristaAutorizadoToResponse,
  mapVeiculoToResponse
} from "../controle-veiculos.mapper.js";
import {
  diarioBordoInputSchema,
  localDestinoInputSchema,
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
    const registroAtual = await this.repository.buscarVeiculoPorIdOuFalhar(id);
    const input = veiculoInputSchema.parse(this.normalizarPayload(rawInput));
    const registro = await this.repository.atualizarVeiculo(id, input);
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

  async removerVeiculo(rawId: string) {
    const id = this.parseId(rawId);
    const registro = await this.repository.buscarVeiculoPorIdOuFalhar(id);
    await this.repository.removerVeiculo(id);
    await storageService.rollbackArquivos([
      registro.foto_frente ?? undefined,
      registro.foto_lateral_esquerda ?? undefined,
      registro.foto_lateral_direita ?? undefined,
      registro.foto_traseira ?? undefined,
      registro.documento_veiculo_pdf ?? undefined
    ]);
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

  async listarLocaisDestino() {
    const registros = await this.repository.listarLocaisDestino();
    return registros.map(mapLocalDestinoToResponse);
  }

  async criarLocalDestino(rawInput: unknown) {
    const input = this.normalizarLocalDestinoInput(
      localDestinoInputSchema.parse(this.normalizarPayload(rawInput))
    );
    if (!input.nome) {
      throw new AppError("Informe o nome do local de destino.", 400);
    }
    const registro = await this.repository.criarLocalDestino(input);
    return mapLocalDestinoToResponse(registro);
  }

  async atualizarLocalDestino(rawId: string, rawInput: unknown) {
    const id = this.parseId(rawId);
    const input = this.normalizarLocalDestinoInput(
      localDestinoInputSchema.parse(this.normalizarPayload(rawInput))
    );
    if (!input.nome) {
      throw new AppError("Informe o nome do local de destino.", 400);
    }
    const registro = await this.repository.atualizarLocalDestino(id, input);
    return mapLocalDestinoToResponse(registro);
  }

  async removerLocalDestino(rawId: string) {
    const id = this.parseId(rawId);
    await this.repository.removerLocalDestino(id);
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

  private normalizarLocalDestinoInput(input: {
    nome?: string | null;
    endereco?: string | null;
    telefone?: string | null;
    observacoes?: string | null;
    ativo?: boolean | null;
  }) {
    return {
      ...input,
      telefone: input.telefone ? normalizarTelefone(input.telefone) : undefined
    };
  }
}
