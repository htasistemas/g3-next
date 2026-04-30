import jwt from "jsonwebtoken";
import { env } from "../../../config/env.js";
import type { JwtPayload, UsuarioAutenticado } from "../auth.types.js";

export class TokenService {
  gerarToken(usuario: UsuarioAutenticado): string {
    const payload: JwtPayload = {
      sub: usuario.id,
      nomeUsuario: usuario.nomeUsuario,
      nome: usuario.nome,
      tenant_id: usuario.tenant_id,
      instituicao_id: usuario.instituicao_id,
      instituicao_nome: usuario.instituicao_nome,
      instituicao_slug: usuario.instituicao_slug,
      cnpj: usuario.cnpj,
      plano: usuario.plano,
      perfil: usuario.perfil,
      is_superadmin: usuario.is_superadmin,
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
