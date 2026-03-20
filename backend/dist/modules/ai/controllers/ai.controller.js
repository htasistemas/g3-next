import { AiService } from "../services/ai.service.js";
import { AiRepository } from "../repositories/ai.repository.js";
import { sanitizeAiHistoryValue } from "../services/ai-history-sanitizer.js";
export class AiController {
    service = new AiService();
    repository = new AiRepository();
    async ask(request, response) {
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
        }
        catch (error) {
            console.error("AI Error:", error);
            response.status(500).json({
                answer: "Desculpe, ocorreu um erro ao processar sua solicitação.",
                intent: "ERROR"
            });
        }
    }
    async suggest(request, response) {
        // Placeholder for autocomplete/suggestion logic
        response.json({ suggestions: [] });
    }
    async history(request, response) {
        const userId = request.authUser?.id;
        if (!userId) {
            response.status(401).json({ error: "Nao autenticado." });
            return;
        }
        const historico = await this.repository.listarHistorico(userId);
        response.json({ historico });
    }
    async clearHistory(request, response) {
        const userId = request.authUser?.id;
        if (!userId) {
            response.status(401).json({ error: "Nao autenticado." });
            return;
        }
        await this.repository.limparHistorico(userId);
        response.status(204).send();
    }
}
