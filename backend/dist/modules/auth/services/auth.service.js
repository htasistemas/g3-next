import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import { env } from "../../../config/env.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { authGoogleSchema, authLoginSchema } from "../auth.schema.js";
import { AuthRepository } from "../repositories/auth.repository.js";
import { TokenService } from "./token.service.js";
const googleClient = new OAuth2Client();
export class AuthService {
    repository = new AuthRepository();
    tokenService = new TokenService();
    async login(rawInput) {
        const input = authLoginSchema.parse(rawInput);
        const usuario = await this.repository.buscarUsuarioPorLogin(input.nomeUsuario);
        if (!usuario) {
            console.warn(`[auth] tentativa de login invalida para usuario: ${input.nomeUsuario}`);
            throw new AppError("Credenciais invalidas.", 401);
        }
        const senhaValida = await bcrypt.compare(input.senha, usuario.senhaHash);
        if (!senhaValida) {
            console.warn(`[auth] tentativa de login invalida para usuario: ${input.nomeUsuario}`);
            throw new AppError("Credenciais invalidas.", 401);
        }
        const usuarioAutenticado = this.mapUsuarioAutenticado(usuario);
        const token = this.tokenService.gerarToken(usuarioAutenticado);
        return {
            token,
            usuario: usuarioAutenticado
        };
    }
    async loginGoogle(rawInput) {
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
            usuario = await this.repository.vincularGooglePorUsuarioId(usuarioPorEmail.id, googleId, payload.picture ?? null);
        }
        const usuarioAutenticado = this.mapUsuarioAutenticado(usuario);
        const token = this.tokenService.gerarToken(usuarioAutenticado);
        return {
            token,
            usuario: usuarioAutenticado
        };
    }
    async obterPerfilUsuario(id) {
        const numericId = Number(id);
        if (!Number.isInteger(numericId) || numericId <= 0) {
            throw new AppError("Usuario autenticado invalido.", 401);
        }
        const usuario = await this.repository.buscarUsuarioPorId(BigInt(numericId));
        if (!usuario) {
            throw new AppError("Usuario autenticado nao encontrado.", 401);
        }
        return this.mapUsuarioAutenticado(usuario);
    }
    validarToken(token) {
        return this.tokenService.validarToken(token);
    }
    async validarIdTokenGoogle(idToken, audience) {
        try {
            return await googleClient.verifyIdToken({
                idToken,
                audience
            });
        }
        catch {
            throw new AppError("Token Google invalido.", 401);
        }
    }
    mapUsuarioAutenticado(usuario) {
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
}
