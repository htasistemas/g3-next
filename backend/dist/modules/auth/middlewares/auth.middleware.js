import { AppError } from "../../../shared/errors/app-error.js";
import { AuthService } from "../services/auth.service.js";
const authService = new AuthService();
const AUTH_COOKIE_NAME = "g3_auth_token";
function obterTokenDaRequisicao(request) {
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
        return authHeader.slice("Bearer ".length).trim();
    }
    const cookieToken = request.cookies?.[AUTH_COOKIE_NAME];
    return cookieToken ?? null;
}
export function ensureAuthenticated(request, _response, next) {
    const token = obterTokenDaRequisicao(request);
    if (!token) {
        throw new AppError("Nao autenticado.", 401);
    }
    try {
        const payload = authService.validarToken(token);
        request.authUser = {
            id: payload.sub,
            nomeUsuario: payload.nomeUsuario,
            permissoes: payload.permissoes ?? []
        };
        return next();
    }
    catch {
        throw new AppError("Token de autenticacao invalido.", 401);
    }
}
export function hydrateAuthenticatedUser(request, _response, next) {
    const token = obterTokenDaRequisicao(request);
    if (!token) {
        return next();
    }
    try {
        const payload = authService.validarToken(token);
        request.authUser = {
            id: payload.sub,
            nomeUsuario: payload.nomeUsuario,
            permissoes: payload.permissoes ?? []
        };
    }
    catch {
        request.authUser = undefined;
    }
    return next();
}
export function ensurePermissions(permissoesPermitidas) {
    return (request, _response, next) => {
        const usuario = request.authUser;
        if (!usuario) {
            throw new AppError("Nao autenticado.", 401);
        }
        const temPermissao = usuario.permissoes.some((permissao) => permissoesPermitidas.includes(permissao));
        if (!temPermissao) {
            throw new AppError("Usuario autenticado nao possui permissao para executar esta acao.", 403);
        }
        return next();
    };
}
export { AUTH_COOKIE_NAME };
