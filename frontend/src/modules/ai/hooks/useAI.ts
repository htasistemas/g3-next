import { useState, useCallback, useRef } from "react";
import { httpClient } from "../../../services/http-client";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  intent?: string;
  data?: {
    origem?: "banco_interno";
    fontes?: string[];
    escopo?: string;
    parametros?: Record<string, string | number>;
    resumo?: Record<string, string | number | null>;
    exemplos?: Array<Record<string, string | number | null>>;
  };
}

interface AiResponse {
  answer: string;
  data?: ChatMessage["data"];
  intent?: string;
}

interface AiHistoryItem {
  id: string;
  pergunta: string;
  resposta: string;
  intent?: string;
  criadoEm: string;
  data?: ChatMessage["data"];
}

export function useAI() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const loadingHistoryRef = useRef(false);

  const carregarHistorico = useCallback(async () => {
    if (historyLoaded || loadingHistoryRef.current) return;
    loadingHistoryRef.current = true;

    try {
      const { data } = await httpClient.get<{ historico: AiHistoryItem[] }>("/api/ai/history");

      const historicoMensagens: ChatMessage[] = data.historico.flatMap((item) => {
        const timestamp = new Date(item.criadoEm);
        return [
          {
            id: `${item.id}-user`,
            role: "user" as const,
            content: item.pergunta,
            timestamp
          },
          {
            id: `${item.id}-assistant`,
            role: "assistant" as const,
            content: item.resposta,
            timestamp,
            intent: item.intent,
            data: item.data
          }
        ];
      });

      setMessages(historicoMensagens);
      setHistoryLoaded(true);
    } catch (error) {
      console.error("AI History Error:", error);
    } finally {
      loadingHistoryRef.current = false;
    }
  }, [historyLoaded]);

  const toggleChat = useCallback(() => {
    setIsOpen((prev) => {
      const next = !prev;
      if (next) {
        void carregarHistorico();
      }
      return next;
    });
  }, [carregarHistorico]);

  const ask = useCallback(async (query: string) => {
    if (!query.trim()) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: query,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const { data } = await httpClient.post<AiResponse>("/api/ai/ask", { query });

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.answer,
        timestamp: new Date(),
        intent: data.intent,
        data: data.data,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("AI Error:", error);
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Desculpe, ocorreu um erro ao processar sua solicitação. Tente novamente mais tarde.",
        timestamp: new Date(),
        intent: "ERROR",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearHistory = useCallback(() => {
    setMessages([]);
    void httpClient.delete("/api/ai/history").catch((error) => {
      console.error("AI Clear History Error:", error);
    });
  }, []);

  return {
    messages,
    isLoading,
    isOpen,
    toggleChat,
    ask,
    clearHistory
  };
}
