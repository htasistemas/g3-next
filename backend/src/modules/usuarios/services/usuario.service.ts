import bcrypt from "bcryptjs";
import { AppError } from "../../../shared/errors/app-error.js";
import { mapaCamposTextoUsuario } from "../../../utils/text-format-config.js";
import { normalizarObjetoTexto } from "../../../utils/text-formatter.js";
import {
  atualizarStatusUsuarioSchema,
  atualizarUsuarioSchema,
  criarUsuarioSchema,
  resetarSenhaUsuarioSchema,
  usuarioFiltersSchema
} from "../usuario.schema.js";
import { mapPermissoesParaCatalogo } from "../usuario.mapper.js";
import { UsuarioRepository } from "../repositories/usuario.repository.js";

type AtorRaw = {
  id?: string;
  nomeUsuario?: string;
};

export class UsuarioService {
  private readonly repository = new UsuarioRepository();

  async listar(rawFilters: unknown) {
    const filtersNormalizados =
      rawFilters && typeof rawFilters === "object"
        ? normalizarObjetoTexto(
            rawFilters as Record<string, unknown>,
            {
              nome: "nomePessoa",
              setor: "instituicao",
              unidade: "instituicao"
            }
          )
        : rawFilters;

    const filters = usuarioFiltersSchema.parse(filtersNormalizados);
    return this.repository.listar(filters);
  }

  async buscarPorId(rawId: string) {
    const id = this.parseId(rawId);
    return this.repository.buscarPorId(id);
  }

  async listarPermissoes() {
    const permissoes = await this.repository.listarPermissoes();
    return mapPermissoesParaCatalogo(permissoes);
  }

  async criar(rawInput: unknown, atorRaw: AtorRaw) {
    const inputNormalizado = this.normalizarPayload(rawInput);
    const input = criarUsuarioSchema.parse(inputNormalizado);
    const ator = this.parseAtor(atorRaw);

    const senhaHash = await bcrypt.hash(input.senha, 10);
    return this.repository.criar(input, senhaHash, ator);
  }

  async atualizar(rawId: string, rawInput: unknown, atorRaw: AtorRaw) {
    const id = this.parseId(rawId);
    await this.validarProtecaoAdmin(id);

    const inputNormalizado = this.normalizarPayload(rawInput);
    const input = atualizarUsuarioSchema.parse(inputNormalizado);
    const ator = this.parseAtor(atorRaw);

    return this.repository.atualizar(id, input, ator);
  }

  async atualizarStatus(rawId: string, rawInput: unknown, atorRaw: AtorRaw) {
    const id = this.parseId(rawId);
    await this.validarProtecaoAdmin(id);

    const input = atualizarStatusUsuarioSchema.parse(rawInput);
    const ator = this.parseAtor(atorRaw);

    return this.repository.atualizarStatus(id, input.status, ator);
  }

  async resetarSenha(rawId: string, rawInput: unknown, atorRaw: AtorRaw) {
    const id = this.parseId(rawId);
    await this.validarProtecaoAdmin(id);

    const input = resetarSenhaUsuarioSchema.parse(rawInput);
    const ator = this.parseAtor(atorRaw);

    const novaSenhaHash = await bcrypt.hash(input.nova_senha, 10);
    return this.repository.resetarSenha(
      id,
      novaSenhaHash,
      !!input.exigir_troca_senha,
      ator
    );
  }

  async remover(rawId: string, atorRaw: AtorRaw) {
    const id = this.parseId(rawId);
    await this.validarProtecaoAdmin(id);

    const ator = this.parseAtor(atorRaw);
    return this.repository.remover(id, ator);
  }

  private async validarProtecaoAdmin(id: bigint) {
    const resultado = await this.repository.buscarPorId(id);
    const emailAdmin = "htasistemas@gmail.com";

    if (resultado.usuario.email?.toLowerCase() === emailAdmin) {
      throw new AppError(
        "Este usuario possui acesso administrador restrito e nao pode ser alterado ou removido.",
        403
      );
    }
  }

  private parseId(rawId: string): bigint {
    const id = Number(rawId);
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError("Identificador de usuario invalido.", 400);
    }
    return BigInt(id);
  }

  private parseAtor(atorRaw: AtorRaw) {
    const nome_usuario = atorRaw.nomeUsuario?.trim() || "sistema";
    const idNumerico = Number(atorRaw.id);
    const id =
      Number.isInteger(idNumerico) && idNumerico > 0
        ? BigInt(idNumerico)
        : undefined;

    return {
      id,
      nome_usuario
    };
  }

  private normalizarPayload(rawInput: unknown) {
    if (!rawInput || typeof rawInput !== "object") {
      return rawInput;
    }

    return normalizarObjetoTexto(
      rawInput as Record<string, unknown>,
      mapaCamposTextoUsuario
    );
  }
}
