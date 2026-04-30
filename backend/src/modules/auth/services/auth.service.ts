import bcrypt from "bcryptjs";
import { randomInt } from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import { env } from "../../../config/env.js";
import { AppError } from "../../../shared/errors/app-error.js";
import {
  authEsqueciSenhaSchema,
  authGoogleSchema,
  authLoginSchema
} from "../auth.schema.js";
import { AuthRepository } from "../repositories/auth.repository.js";
import { TokenService } from "./token.service.js";
import type { UsuarioAutenticado } from "../auth.types.js";
import { EmailService } from "../../email/services/email.service.js";

const googleClient = new OAuth2Client();

export class AuthService {
  private readonly repository = new AuthRepository();
  private readonly tokenService = new TokenService();
  private readonly emailService = new EmailService();

  async login(rawInput: unknown) {
    const input = authLoginSchema.parse(rawInput);
    const usuario = await this.repository.buscarUsuarioPorLogin({
      nomeUsuario: input.nomeUsuario,
      email: input.email,
      cnpj: input.cnpj,
      slug: input.slug,
      codigoInstituicao: input.codigoInstituicao
    });
    const identificador = input.email ?? input.nomeUsuario ?? "";

    if (!usuario) {
      await this.repository.registrarEventoAcesso({
        evento: "LOGIN_FALHA",
        identificador,
        detalhes_json: {
          cnpj: input.cnpj,
          slug: input.slug,
          codigoInstituicao: input.codigoInstituicao
        }
      });
      console.warn(`[auth] tentativa de login invalida para usuario: ${identificador}`);
      throw new AppError("Credenciais invalidas.", 401);
    }

    const controle = await this.repository.buscarControleAcessoPorUsuarioId(usuario.id);
    this.validarAcessoUsuario(controle?.status, usuario.instituicaoStatus);

    const senhaValida = await bcrypt.compare(input.senha, usuario.senhaHash);
    if (!senhaValida) {
      const atualizado = await this.repository.registrarFalhaLogin(usuario.id);
      await this.repository.registrarEventoAcesso({
        tenant_id: usuario.tenantId ?? undefined,
        instituicao_id: usuario.instituicaoId ?? undefined,
        usuario_id: usuario.id,
        evento: "LOGIN_FALHA",
        identificador
      });
      console.warn(`[auth] tentativa de login invalida para usuario: ${identificador}`);
      if ((atualizado?.status ?? "").toUpperCase() === "BLOQUEADO") {
        throw new AppError("Usuario bloqueado por tentativas invalidas de acesso.", 403);
      }
      throw new AppError("Credenciais invalidas.", 401);
    }

    await this.repository.registrarLoginSucesso(usuario.id);
    await this.repository.registrarEventoAcesso({
      tenant_id: usuario.tenantId ?? undefined,
      instituicao_id: usuario.instituicaoId ?? undefined,
      usuario_id: usuario.id,
      evento: "LOGIN_SUCESSO",
      identificador
    });

    const usuarioAutenticado = this.mapUsuarioAutenticado(usuario);
    const token = this.tokenService.gerarToken(usuarioAutenticado);

    return {
      token,
      usuario: usuarioAutenticado
    };
  }

  async loginGoogle(rawInput: unknown) {
    if (env.APP_GOOGLE_CLIENT_IDS.length === 0) {
      throw new AppError("Login com Google nao configurado no servidor.", 503);
    }

    const input = authGoogleSchema.parse(rawInput);
    const ticket = await this.validarIdTokenGoogle(input.idToken, env.APP_GOOGLE_CLIENT_IDS);
    const payload = ticket.getPayload();

    if (!payload?.sub || !payload?.email) {
      throw new AppError("Token Google invalido.", 401);
    }

    if (payload.email_verified === false) {
      throw new AppError("Conta Google sem e-mail verificado.", 401);
    }

    const emailNormalizado = payload.email.trim().toLowerCase();
    const googleId = payload.sub;

    let usuario = await this.repository.buscarUsuarioPorGoogleId(googleId, {
      cnpj: input.cnpj,
      slug: input.slug,
      codigoInstituicao: input.codigoInstituicao
    });
    if (!usuario) {
      const usuarioPorEmail = await this.repository.buscarUsuarioPorEmail(emailNormalizado, {
        cnpj: input.cnpj,
        slug: input.slug,
        codigoInstituicao: input.codigoInstituicao
      });
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

    if (!usuario) {
      throw new AppError("Usuario Google nao autorizado. Solicite acesso ao administrador.", 403);
    }

    const controle = await this.repository.buscarControleAcessoPorUsuarioId(usuario.id);
    this.validarAcessoUsuario(controle?.status, usuario.instituicaoStatus);
    await this.repository.registrarLoginSucesso(usuario.id);
    await this.repository.registrarEventoAcesso({
      tenant_id: usuario.tenantId ?? undefined,
      instituicao_id: usuario.instituicaoId ?? undefined,
      usuario_id: usuario.id,
      evento: "LOGIN_SUCESSO_GOOGLE",
      identificador: emailNormalizado
    });

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
    this.validarAcessoUsuario(controle?.status, usuario.instituicaoStatus);

    return this.mapUsuarioAutenticado(usuario);
  }

  async esqueciSenha(rawInput: unknown) {
    const input = authEsqueciSenhaSchema.parse(rawInput);

    const senhaTemporaria = this.gerarSenhaTemporaria();
    const senhaHash = await bcrypt.hash(senhaTemporaria, 10);

    const usuario = await this.repository.redefinirSenhaPorEmail(input.email, senhaHash, {
      cnpj: input.cnpj,
      slug: input.slug,
      codigoInstituicao: input.codigoInstituicao
    });

    if (!usuario) {
      return {
        enviado: true
      };
    }

    if (!env.APP_EMAIL_HABILITADO && env.NODE_ENV === "development") {
      console.warn(
        `[auth] recuperacao de senha em desenvolvimento para ${usuario.email}: senha temporaria ${senhaTemporaria}`
      );
      return {
        enviado: true
      };
    }

    try {
      await this.emailService.enviarEmailRecuperacaoSenha({
        destinatario: usuario.email,
        nomeUsuario: usuario.nome ?? usuario.nome_usuario,
        senhaTemporaria
      });
    } catch (error) {
      console.error("[auth] falha ao enviar email de recuperacao", error);
      throw new AppError("Nao foi possivel enviar o email de recuperacao.", 503);
    }

    return {
      enviado: true
    };
  }

  validarToken(token: string) {
    return this.tokenService.validarToken(token);
  }

  async obterContextoTenant(rawInput: {
    cnpj?: string;
    slug?: string;
    codigoInstituicao?: string;
    host?: string;
  }) {
    return this.repository.buscarTenantContextoPublico(rawInput);
  }

  private async validarIdTokenGoogle(idToken: string, audience: string[]) {
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
      tenant_id: usuario.tenantId ?? undefined,
      instituicao_id: usuario.instituicaoId ?? undefined,
      instituicao_nome: usuario.instituicaoNome ?? undefined,
      instituicao_slug: usuario.instituicaoSlug ?? undefined,
      cnpj: usuario.instituicaoCnpj ?? undefined,
      plano: usuario.instituicaoPlano ?? undefined,
      perfil: usuario.perfilAcesso ?? (usuario.isSuperadmin ? "MASTER" : undefined),
      is_superadmin: usuario.isSuperadmin,
      permissoes: usuario.permissoes.map((item) => item.permissao.nome)
    };
  }

  private validarAcessoUsuario(status?: string | null, statusInstituicao?: string | null) {
    const statusNormalizado = (status ?? "").trim().toUpperCase();
    if (statusNormalizado === "INATIVO") {
      throw new AppError("Usuario inativo. Procure o administrador.", 403);
    }

    if (statusNormalizado === "BLOQUEADO") {
      throw new AppError("Usuario bloqueado. Procure o administrador.", 403);
    }

    const statusTenant = (statusInstituicao ?? "").trim().toUpperCase();
    if (statusTenant === "INATIVO") {
      throw new AppError("Instituicao inativa. Procure o suporte da plataforma.", 403);
    }

    if (statusTenant === "BLOQUEADO") {
      throw new AppError("Instituicao bloqueada. Regularize o acesso com o suporte da plataforma.", 403);
    }
  }

  private gerarSenhaTemporaria() {
    const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    let senha = "";
    for (let indice = 0; indice < 10; indice += 1) {
      const randomIndex = randomInt(alfabeto.length);
      senha += alfabeto[randomIndex];
    }
    return senha;
  }
}
