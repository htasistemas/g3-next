import { z } from "zod";
export const sementeChatSchema = z.object({
    usuario_id: z.coerce.number().int().positive().optional(),
    mensagem: z.string().trim().min(1, "Informe uma mensagem.")
});
