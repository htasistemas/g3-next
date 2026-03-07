import bcrypt from "bcryptjs";
import { AppError } from "../../../shared/errors/app-error.js";
import { authLoginSchema } from "../auth.schema.js";
import { AuthRepository } from "../repositories/auth.repository.js";
import { TokenService } from "./token.service.js";
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
