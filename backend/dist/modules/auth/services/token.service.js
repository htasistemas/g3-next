import jwt from "jsonwebtoken";
import { env } from "../../../config/env.js";
export class TokenService {
    gerarToken(usuario) {
        const payload = {
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
            permissoes: usuario.permissoes,
            contexto: usuario.contexto
        };
        return jwt.sign(payload, env.APP_AUTH_TOKEN_SECRET, {
            algorithm: "HS256",
            expiresIn: `${env.APP_AUTH_TOKEN_EXPIRATION_MINUTES}m`
        });
    }
    validarToken(token) {
        return jwt.verify(token, env.APP_AUTH_TOKEN_SECRET);
    }
    gerarTicketSelecao(identidadeId, usuarioIds) {
        return jwt.sign({ sub: identidadeId, tipo: "SELECAO_AMBIENTE", usuario_ids: usuarioIds }, env.APP_AUTH_TOKEN_SECRET, {
            algorithm: "HS256",
            expiresIn: "5m"
        });
    }
    validarTicketSelecao(token) {
        const payload = jwt.verify(token, env.APP_AUTH_TOKEN_SECRET);
        if (payload.tipo !== "SELECAO_AMBIENTE" || !payload.sub || !Array.isArray(payload.usuario_ids)) {
            throw new Error("Ticket de selecao invalido");
        }
        return payload;
    }
}
