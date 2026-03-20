import { Request, Response } from "express";
import { AiService } from "../services/ai.service.js";
import type { AuthenticatedRequest } from "../../auth/middlewares/auth.middleware.js";
import { AiRepository } from "../repositories/ai.repository.js";
import { sanitizeAiHistoryValue } from "../services/ai-history-sanitizer.js";

export class AiController {
  private service = new AiService();
  private repository = new AiRepository();

  async ask(request: AuthenticatedRequest, response: Response): Promise<void> {
    try {
      const { query } = request.body;
      const userId = request.authUser?.id;

      if (typeof query !== "string" || !query.trim()) {
        response.status(400).json({ error: "Informe uma pergunta válida." });
        return;
      }

      const result = await this.service.processQuery(query, userId);
      if (userId) {
        const dadosSanitizados = sanitizeAiHistoryValue(result.data);

        await this.repository.registrarHistorico({
          usuarioId: userId,
          pergunta: sanitizeAiHistoryValue(query.trim()),
          resposta: sanitizeAiHistoryValue(result.answer),
          intent: result.intent,
          fontes: dadosSanitizados?.fontes,
          parametros: dadosSanitizados?.parametros,
          resumo: dadosSanitizados?.resumo,
          exemplos: dadosSanitizados?.exemplos
        });
      }
      response.json(result);
    } catch (error) {
      console.error("AI Error:", error);
      response.status(500).json({ 
        answer: "Desculpe, ocorreu um erro ao processar sua solicitação.", 
        intent: "ERROR" 
      });
    }
  }

  async suggest(request: Request, response: Response): Promise<void> {
    // Placeholder for autocomplete/suggestion logic
    response.json({ suggestions: [] });
  }

  async history(request: AuthenticatedRequest, response: Response): Promise<void> {
    const userId = request.authUser?.id;
    if (!userId) {
      response.status(401).json({ error: "Nao autenticado." });
      return;
    }

    const historico = await this.repository.listarHistorico(userId);
    response.json({ historico });
  }

  async clearHistory(request: AuthenticatedRequest, response: Response): Promise<void> {
    const userId = request.authUser?.id;
    if (!userId) {
      response.status(401).json({ error: "Nao autenticado." });
      return;
    }

    await this.repository.limparHistorico(userId);
    response.status(204).send();
  }
}
