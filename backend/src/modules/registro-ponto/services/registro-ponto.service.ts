import bcrypt from "bcryptjs";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import {
  registroPontoAjusteSchema,
  registroPontoFiltersSchema,
  registroPontoMarcarSchema,
  registroPontoOcorrenciaSchema
} from "../registro-ponto.schema.js";
import type { RegistroPontoOrigem } from "../registro-ponto.types.js";
import { RegistroPontoRepository } from "../repositories/registro-ponto.repository.js";

type AtorRaw = {
  id?: string;
  nomeUsuario?: string;
  permissoes?: string[];
};

export class RegistroPontoService {
  private readonly repository = new RegistroPontoRepository();

  async listar(rawFilters: unknown, atorRaw: AtorRaw) {
    const filters = registroPontoFiltersSchema.parse(rawFilters);
    const ator = this.parseAtor(atorRaw);
    return this.repository.listar(filters, ator);
  }

  async listarEspelho(rawFilters: unknown, atorRaw: AtorRaw) {
    const filters = registroPontoFiltersSchema.parse(rawFilters);
    const ator = this.parseAtor(atorRaw);
    return this.repository.listarEspelho(filters, ator);
  }

  async listarUsuarios(rawTermo: unknown) {
    const termo = typeof rawTermo === "string" ? rawTermo : undefined;
    return this.repository.listarUsuarios(termo);
  }

  async marcarPonto(rawInput: unknown, atorRaw: AtorRaw, origem: RegistroPontoOrigem) {
    const input = registroPontoMarcarSchema.parse(rawInput ?? {});
    const ator = this.parseAtor(atorRaw);
    await this.validarConfirmacaoUsuario(input.usuario_login, input.senha, ator);
    return this.repository.marcarPonto(input, ator, origem);
  }

  async ajustarRegistro(
    rawRegistroId: string,
    rawInput: unknown,
    atorRaw: AtorRaw,
    origem: RegistroPontoOrigem
  ) {
    const input = registroPontoAjusteSchema.parse(rawInput);
    const ator = this.parseAtor(atorRaw);
    return this.repository.ajustarRegistro(rawRegistroId, input, ator, origem);
  }

  async adicionarOcorrencia(
    rawRegistroId: string,
    rawInput: unknown,
    atorRaw: AtorRaw,
    origem: RegistroPontoOrigem
  ) {
    const input = registroPontoOcorrenciaSchema.parse(rawInput);
    const ator = this.parseAtor(atorRaw);
    return this.repository.adicionarOcorrencia(rawRegistroId, input, ator, origem);
  }

  async buscarHistorico(rawRegistroId: string, atorRaw: AtorRaw) {
    const ator = this.parseAtor(atorRaw);
    return this.repository.buscarHistorico(rawRegistroId, ator);
  }

  private parseAtor(atorRaw: AtorRaw) {
    const nome_usuario = atorRaw.nomeUsuario?.trim();
    if (!nome_usuario) {
      throw new AppError("Usuario autenticado invalido.", 401);
    }

    const idNumerico = Number(atorRaw.id);
    const id =
      Number.isInteger(idNumerico) && idNumerico > 0
        ? BigInt(idNumerico)
        : undefined;

    return {
      id,
      nome_usuario,
      permissoes: atorRaw.permissoes ?? []
    };
  }

  private async validarConfirmacaoUsuario(
    login: string,
    senha: string,
    ator: { id?: bigint; nome_usuario: string }
  ) {
    if (!ator.id) {
      throw new AppError("Usuario autenticado invalido.", 401);
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: ator.id },
      select: {
        nomeUsuario: true,
        email: true,
        senhaHash: true
      }
    });

    if (!usuario) {
      throw new AppError("Usuario autenticado nao encontrado.", 404);
    }

    const loginNormalizado = login.trim().toLowerCase();
    const nomeUsuarioNormalizado = usuario.nomeUsuario.trim().toLowerCase();
    const emailNormalizado = usuario.email?.trim().toLowerCase();

    const loginConfere =
      loginNormalizado === nomeUsuarioNormalizado ||
      (emailNormalizado ? loginNormalizado === emailNormalizado : false);

    if (!loginConfere) {
      throw new AppError("Usuario ou senha invalidos para confirmar o registro de ponto.", 401);
    }

    const senhaConfere = await bcrypt.compare(senha, usuario.senhaHash);
    if (!senhaConfere) {
      throw new AppError("Usuario ou senha invalidos para confirmar o registro de ponto.", 401);
    }
  }
}

