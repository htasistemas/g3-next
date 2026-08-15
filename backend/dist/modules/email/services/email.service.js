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
            const info = await this.enviarEmailSimples({
                destinatario,
                assunto,
                mensagem
            });
            return info;
        }
        catch (error) {
            console.error("[email][teste] falha ao enviar email", error);
            throw new AppError("Falha ao enviar email de teste.", 503);
        }
    }
    async enviarEmailRecuperacaoSenha(input) {
        if (!env.APP_EMAIL_HABILITADO) {
            throw new AppError("Envio de email desabilitado no servidor.", 503);
        }
        const nomeUsuario = input.nomeUsuario?.trim() || "usuario";
        const assunto = "Recuperacao de senha - Sistema G3 Next";
        const mensagem = [
            `Ola, ${nomeUsuario}.`,
            "",
            "Recebemos uma solicitacao de recuperacao de senha para sua conta no Sistema G3 Next.",
            `Sua senha temporaria e: ${input.senhaTemporaria}`,
            "",
            "Acesse o sistema e altere sua senha imediatamente.",
            "",
            "Se voce nao solicitou esta alteracao, entre em contato com o administrador."
        ].join("\n");
        return this.enviarEmailSimples({
            destinatario: input.destinatario,
            assunto,
            mensagem
        });
    }
    async enviarEmailCodigoMfa(input) {
        if (!env.APP_EMAIL_HABILITADO) {
            throw new AppError("Envio de email desabilitado no servidor.", 503);
        }
        const nomeUsuario = input.nomeUsuario?.trim() || "usuario";
        const assunto = "Codigo de seguranca - Sistema G3 Next";
        const mensagem = [
            `Ola, ${nomeUsuario}.`,
            "",
            "Recebemos uma tentativa de acesso ao Sistema G3 Next que exige verificacao adicional.",
            `Seu codigo de seguranca e: ${input.codigo}`,
            "",
            "O codigo expira em 10 minutos.",
            "",
            "Se voce nao tentou acessar o sistema, avise o administrador imediatamente."
        ].join("\n");
        return this.enviarEmailSimples({
            destinatario: input.destinatario,
            assunto,
            mensagem
        });
    }
    async enviarEmailSimples(input) {
        if (!env.APP_EMAIL_HABILITADO) {
            throw new AppError("Envio de email desabilitado no servidor.", 503);
        }
        try {
            const info = await this.transporter.sendMail({
                from: `${env.APP_EMAIL_NOME} <${env.APP_EMAIL_REMETENTE}>`,
                to: input.destinatario,
                subject: input.assunto,
                text: input.mensagem
            });
            return {
                destinatario: input.destinatario,
                messageId: info.messageId,
                enviadoEm: new Date().toISOString()
            };
        }
        catch (error) {
            console.error("[email] falha ao enviar mensagem", error);
            throw new AppError("Falha ao enviar e-mail. Verifique a configuração do servidor SMTP.", 503);
        }
    }
}
