import { httpClient } from "@/services/http-client";
import type { AiContext, AiSuggestionCategoryMeta, AiSuggestionItem, ChatMessage } from "./types";

type AiResponse = {
  answer: string;
  data?: ChatMessage["data"];
  intent?: string;
};

type AiHistoryItem = {
  id: string;
  pergunta: string;
  resposta: string;
  intent?: string;
  criadoEm: string;
  data?: ChatMessage["data"];
};

type AiSuggestionsResponse = {
  categorias: AiSuggestionCategoryMeta[];
  perguntasFrequentes: AiSuggestionItem[];
  sugestoes: AiSuggestionItem[];
};

export const aiService = {
  async perguntar(query: string, context?: AiContext) {
    const { data } = await httpClient.post<AiResponse>("/api/ai/ask", {
      query,
      context
    });
    return data;
  },

  async listarHistorico() {
    const { data } = await httpClient.get<{ historico: AiHistoryItem[] }>("/api/ai/history");
    return data.historico;
  },

  async limparHistorico() {
    await httpClient.delete("/api/ai/history");
  },

  async listarSugestoes(query?: string, context?: AiContext) {
    const { data } = await httpClient.post<AiSuggestionsResponse>("/api/ai/suggest", {
      query,
      context
    });
    return data;
  }
};
