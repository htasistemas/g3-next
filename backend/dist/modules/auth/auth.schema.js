import { z } from "zod";
export const authLoginSchema = z.object({
    nomeUsuario: z.string().trim().min(1, "Informe usuario ou e-mail."),
    senha: z.string().min(1, "Informe a senha.")
});
export const authGoogleSchema = z.object({
    idToken: z.string().trim().min(1, "Token Google obrigatorio.")
});
