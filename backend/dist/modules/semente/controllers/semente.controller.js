import { AppError } from "../../../shared/errors/app-error.js";
import { sementeChatSchema } from "../semente.schema.js";
import { SementeService } from "../services/semente.service.js";
export class SementeController {
    service = new SementeService();
    async chat(request, response) {
        const payload = sementeChatSchema.parse(request.body);
        const usuarioAutenticadoId = request.authUser?.id;
        const usuarioIdInformado = payload.usuario_id ? String(payload.usuario_id) : undefined;
        const usuarioId = usuarioAutenticadoId ?? usuarioIdInformado;
        if (!usuarioId) {
            throw new AppError("Nao foi possivel identificar o usuario da conversa.", 401);
        }
        if (usuarioAutenticadoId && usuarioIdInformado && usuarioAutenticadoId !== usuarioIdInformado) {
            throw new AppError("Nao e permitido consultar memorias de outro usuario.", 403);
        }
        const result = await this.service.chat({
            usuarioId,
            mensagem: payload.mensagem
        });
        response.json(result);
    }
}
