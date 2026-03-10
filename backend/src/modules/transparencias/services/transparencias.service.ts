import { AppError } from "../../../shared/errors/app-error.js";
import { mapaCamposTextoPrestacaoContas } from "../../../utils/text-format-config.js";
import { normalizarObjetoTexto } from "../../../utils/text-formatter.js";
import { mapTransparenciaToResponse } from "../transparencias.mapper.js";
import { transparenciaInputSchema } from "../transparencias.schema.js";
import { TransparenciasRepository } from "../repositories/transparencias.repository.js";

export class TransparenciasService {
  private readonly repository = new TransparenciasRepository();

  async listar() {
    const registros = await this.repository.listar();
    return registros.map((item) =>
      mapTransparenciaToResponse(
        item.transparencia,
        item.recebimentos,
        item.destinacoes,
        item.comprovantes,
        item.timelines,
        item.checklist
      )
    );
  }

  async obter(rawId: string) {
    const id = this.parseId(rawId);
    const registro = await this.repository.buscarPorIdOuFalhar(id);
    return mapTransparenciaToResponse(
      registro.transparencia,
      registro.recebimentos,
      registro.destinacoes,
      registro.comprovantes,
      registro.timelines,
      registro.checklist
    );
  }

  async criar(rawInput: unknown) {
    const input = transparenciaInputSchema.parse(this.normalizarPayload(rawInput));
    const registro = await this.repository.criar(input);
    return mapTransparenciaToResponse(
      registro.transparencia,
      registro.recebimentos,
      registro.destinacoes,
      registro.comprovantes,
      registro.timelines,
      registro.checklist
    );
  }

  async atualizar(rawId: string, rawInput: unknown) {
    const id = this.parseId(rawId);
    const input = transparenciaInputSchema.parse(this.normalizarPayload(rawInput));
    const registro = await this.repository.atualizar(id, input);
    return mapTransparenciaToResponse(
      registro.transparencia,
      registro.recebimentos,
      registro.destinacoes,
      registro.comprovantes,
      registro.timelines,
      registro.checklist
    );
  }

  async remover(rawId: string) {
    const id = this.parseId(rawId);
    await this.repository.remover(id);
  }

  private parseId(rawId: string): bigint {
    const parsed = Number(rawId);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new AppError("Identificador invalido.", 400);
    }
    return BigInt(parsed);
  }

  private normalizarPayload(rawInput: unknown) {
    if (!rawInput || typeof rawInput !== "object") return rawInput;
    return normalizarObjetoTexto(
      rawInput as Record<string, unknown>,
      mapaCamposTextoPrestacaoContas
    );
  }
}
