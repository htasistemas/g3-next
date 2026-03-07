import jwt from "jsonwebtoken";
import { env } from "../../../config/env.js";
import type { JwtPayload, UsuarioAutenticado } from "../auth.types.js";

export class TokenService {
  gerarToken(usuario: UsuarioAutenticado): string {
    const payload: JwtPayload = {
      sub: usuario.id,
      nomeUsuario: usuario.nomeUsuario,
      permissoes: usuario.permissoes
    };

    return jwt.sign(payload, env.APP_AUTH_TOKEN_SECRET, {
      algorithm: "HS256",
      expiresIn: `${env.APP_AUTH_TOKEN_EXPIRATION_MINUTES}m`
    });
  }

  validarToken(token: string): JwtPayload {
    return jwt.verify(token, env.APP_AUTH_TOKEN_SECRET) as JwtPayload;
  }
}
