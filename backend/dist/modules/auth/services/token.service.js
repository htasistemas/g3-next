import jwt from "jsonwebtoken";
import { env } from "../../../config/env.js";
export class TokenService {
    gerarToken(usuario) {
        const payload = {
            sub: usuario.id,
            nomeUsuario: usuario.nomeUsuario,
            permissoes: usuario.permissoes
        };
        return jwt.sign(payload, env.APP_AUTH_TOKEN_SECRET, {
            algorithm: "HS256",
            expiresIn: `${env.APP_AUTH_TOKEN_EXPIRATION_MINUTES}m`
        });
    }
    validarToken(token) {
        return jwt.verify(token, env.APP_AUTH_TOKEN_SECRET);
    }
}
