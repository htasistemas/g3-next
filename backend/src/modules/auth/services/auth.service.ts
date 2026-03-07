import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import { env } from "../../../config/env.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { authGoogleSchema, authLoginSchema } from "../auth.schema.js";
import { AuthRepository } from "../repositories/auth.repository.js";
import { TokenService } from "./token.service.js";
import type { UsuarioAutenticado } from "../auth.types.js";

const googleClient = new OAuth2Client();

export class AuthService {
  private readonly repository = new AuthRepository();
  private readonly tokenService = new TokenService();

  async login(rawInput: unknown) {
    const input = authLoginSchema.parse(rawInput);
    const usuario = await this.repository.buscarUsuarioPorLogin(input.nomeUsuario);

    if (!usuario) {
      console.warn(`[auth] tentativa de login invalida para usuario: ${input.nomeUsuario}`);
      throw new AppError("Credenciais invalidas.", 401);
    }

    const controle = await this.repository.buscarControleAcessoPorUsuarioId(usuario.id);
    this.validarAcessoUsuario(controle?.status);

    const senhaValida = await bcrypt.compare(input.senha, usuario.senhaHash);
    if (!senhaValida) {
      const atualizado = await this.repository.registrarFalhaLogin(usuario.id);
      console.warn(`[auth] tentativa de login invalida para usuario: ${input.nomeUsuario}`);
      if ((atualizado?.status ?? "").toUpperCase() === "BLOQUEADO") {
        throw new AppError("Usuario bloqueado por tentativas invalidas de acesso.", 403);
      }
      throw new AppError("Credenciais invalidas.", 401);
    }

    await this.repository.registrarLoginSucesso(usuario.id);

    const usuarioAutenticado = this.mapUsuarioAutenticado(usuario);
    const token = this.tokenService.gerarToken(usuarioAutenticado);

    return {
      token,
      usuario: usuarioAutenticado
    };
  }

  async loginGoogle(rawInput: unknown) {
    if (!env.APP_GOOGLE_CLIENT_ID) {
      throw new AppError("Login com Google nao configurado no servidor.", 503);
    }

    const input = authGoogleSchema.parse(rawInput);
    const ticket = await this.validarIdTokenGoogle(input.idToken, env.APP_GOOGLE_CLIENT_ID);
    const payload = ticket.getPayload();

    if (!payload?.sub || !payload?.email) {
      throw new AppError("Token Google invalido.", 401);
    }

    if (payload.email_verified === false) {
      throw new AppError("Conta Google sem e-mail verificado.", 401);
    }

    const emailNormalizado = payload.email.trim().toLowerCase();
    const googleId = payload.sub;

    let usuario = await this.repository.buscarUsuarioPorGoogleId(googleId);
    if (!usuario) {
      const usuarioPorEmail = await this.repository.buscarUsuarioPorEmail(emailNormalizado);
      if (!usuarioPorEmail) {
        console.warn(`[auth] login google nao autorizado para email: ${emailNormalizado}`);
        throw new AppError("Usuario Google nao autorizado. Solicite acesso ao administrador.", 403);
      }

      usuario = await this.repository.vincularGooglePorUsuarioId(
        usuarioPorEmail.id,
        googleId,
        payload.picture ?? null
      );
    }

    const controle = await this.repository.buscarControleAcessoPorUsuarioId(usuario.id);
    this.validarAcessoUsuario(controle?.status);
    await this.repository.registrarLoginSucesso(usuario.id);

    const usuarioAutenticado = this.mapUsuarioAutenticado(usuario);
    const token = this.tokenService.gerarToken(usuarioAutenticado);

    return {
      token,
      usuario: usuarioAutenticado
    };
  }

  async obterPerfilUsuario(id: string) {
    const numericId = Number(id);
    if (!Number.isInteger(numericId) || numericId <= 0) {
      throw new AppError("Usuario autenticado invalido.", 401);
    }

    const usuario = await this.repository.buscarUsuarioPorId(BigInt(numericId));
    if (!usuario) {
      throw new AppError("Usuario autenticado nao encontrado.", 401);
    }

    const controle = await this.repository.buscarControleAcessoPorUsuarioId(usuario.id);
    this.validarAcessoUsuario(controle?.status);

    return this.mapUsuarioAutenticado(usuario);
  }

  validarToken(token: string) {
    return this.tokenService.validarToken(token);
  }

  private async validarIdTokenGoogle(idToken: string, audience: string) {
    try {
      return await googleClient.verifyIdToken({
        idToken,
        audience
      });
    } catch {
      throw new AppError("Token Google invalido.", 401);
    }
  }

  private mapUsuarioAutenticado(usuario: Awaited<ReturnType<AuthRepository["buscarUsuarioPorLogin"]>>): UsuarioAutenticado {
    if (!usuario) {
      throw new AppError("Usuario nao encontrado.", 401);
    }

    return {
      id: usuario.id.toString(),
      nomeUsuario: usuario.nomeUsuario,
      nome: usuario.nome ?? undefined,
      email: usuario.email ?? undefined,
      permissoes: usuario.permissoes.map((item) => item.permissao.nome)
    };
  }

  private validarAcessoUsuario(status?: string | null) {
    const statusNormalizado = (status ?? "").trim().toUpperCase();
    if (statusNormalizado === "INATIVO") {
      throw new AppError("Usuario inativo. Procure o administrador.", 403);
    }

    if (statusNormalizado === "BLOQUEADO") {
      throw new AppError("Usuario bloqueado. Procure o administrador.", 403);
    }
  }
}
