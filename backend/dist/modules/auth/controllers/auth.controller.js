import { env } from "../../../config/env.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { AUTH_COOKIE_NAME } from "../middlewares/auth.middleware.js";
import { AuthService } from "../services/auth.service.js";
const authService = new AuthService();
function authCookieOptions() {
    return {
        httpOnly: true,
        sameSite: "lax",
        secure: env.NODE_ENV === "production",
        maxAge: env.APP_AUTH_TOKEN_EXPIRATION_MINUTES * 60 * 1000,
        path: "/"
    };
}
export class AuthController {
    async login(request, response) {
        const data = await authService.login(request.body);
        response.cookie(AUTH_COOKIE_NAME, data.token, authCookieOptions());
        return response.json(data);
    }
    async loginGoogle(request, response) {
        const data = await authService.loginGoogle(request.body);
        response.cookie(AUTH_COOKIE_NAME, data.token, authCookieOptions());
        return response.json(data);
    }
    async me(request, response) {
        if (!request.authUser?.id) {
            throw new AppError("Nao autenticado.", 401);
        }
        const usuario = await authService.obterPerfilUsuario(request.authUser.id);
        return response.json({ usuario });
    }
    async logout(_request, response) {
        response.clearCookie(AUTH_COOKIE_NAME, {
            ...authCookieOptions(),
            maxAge: 0
        });
        return response.status(204).send();
    }
}
