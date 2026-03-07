import { EmailService } from "../services/email.service.js";
const service = new EmailService();
export class EmailController {
    async enviarTeste(request, response) {
        const resultado = await service.enviarEmailTeste(request.body);
        return response.status(200).json({
            message: "Email de teste enviado com sucesso.",
            resultado
        });
    }
}
