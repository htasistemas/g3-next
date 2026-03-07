import nodemailer from "nodemailer";
import { env } from "../../../config/env.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { emailTesteRequestSchema } from "../email.schema.js";
export class EmailService {
    transporter = nodemailer.createTransport({
        host: env.MAIL_HOST,
        port: env.MAIL_PORT,
        secure: env.MAIL_PORT === 465,
        auth: {
            user: env.MAIL_USER,
            pass: env.MAIL_PASS
        }
    });
    async enviarEmailTeste(rawInput) {
        if (!env.APP_EMAIL_HABILITADO) {
            throw new AppError("Envio de email desabilitado no servidor.", 503);
        }
        const input = emailTesteRequestSchema.parse(rawInput);
        const destinatario = input.destinatario ?? env.MAIL_USER;
        const assunto = input.assunto ?? "Teste de email - Sistema G3 Next";
        const mensagem = input.mensagem ??
            "Este e um email de teste enviado pelo endpoint /api/email/teste do backend G3 Next.";
        try {
            await this.transporter.verify();
            const info = await this.transporter.sendMail({
                from: `${env.APP_EMAIL_NOME} <${env.APP_EMAIL_REMETENTE}>`,
                to: destinatario,
                subject: assunto,
                text: mensagem
            });
            return {
                destinatario,
                messageId: info.messageId,
                enviadoEm: new Date().toISOString()
            };
        }
        catch (error) {
            console.error("[email][teste] falha ao enviar email", error);
            throw new AppError("Falha ao enviar email de teste.", 503);
        }
    }
}
