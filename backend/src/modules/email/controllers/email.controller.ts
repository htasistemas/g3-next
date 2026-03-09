import type { Request, Response } from "express";
import { EmailService } from "../services/email.service.js";
import { emailSimplesRequestSchema } from "../email.schema.js";

const service = new EmailService();

export class EmailController {
  async enviarTeste(request: Request, response: Response) {
    const resultado = await service.enviarEmailTeste(request.body);

    return response.status(200).json({
      message: "Email de teste enviado com sucesso.",
      resultado
    });
  }

  async enviarSimples(request: Request, response: Response) {
    const input = emailSimplesRequestSchema.parse(request.body);
    const resultado = await service.enviarEmailSimples(input);

    return response.status(200).json({
      message: "Email enviado com sucesso.",
      resultado
    });
  }
}
