import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { aiService } from "../ai.service";
import type { AiContext, AiSuggestionCategoryMeta, AiSuggestionItem, ChatMessage } from "../types";

type UseAiOptions = {
  context?: AiContext;
  autoLoad?: boolean;
};

function mapHistoryToMessages(items: Awaited<ReturnType<typeof aiService.listarHistorico>>): ChatMessage[] {
  return items.flatMap((item) => {
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
}

export function useAI(options: UseAiOptions = {}) {
  const { context, autoLoad = true } = options;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [suggestionsLoaded, setSuggestionsLoaded] = useState(false);
  const [suggestions, setSuggestions] = useState<AiSuggestionItem[]>([]);
  const [frequentQuestions, setFrequentQuestions] = useState<AiSuggestionItem[]>([]);
  const [categories, setCategories] = useState<AiSuggestionCategoryMeta[]>([]);
  const loadingHistoryRef = useRef(false);
  const loadingSuggestionsRef = useRef(false);

  const serializedContext = useMemo(
    () => JSON.stringify(context ?? {}),
    [context]
  );
  const stableContext = useMemo(() => JSON.parse(serializedContext) as AiContext, [serializedContext]);

  const loadHistory = useCallback(async () => {
    if (historyLoaded || loadingHistoryRef.current) return;
    loadingHistoryRef.current = true;

    try {
      const history = await aiService.listarHistorico();
      setMessages(mapHistoryToMessages(history));
      setHistoryLoaded(true);
    } catch (error) {
      console.error("AI History Error:", error);
    } finally {
      loadingHistoryRef.current = false;
    }
  }, [historyLoaded]);

  const loadSuggestions = useCallback(
    async (query?: string) => {
      if (!query && suggestionsLoaded && !loadingSuggestionsRef.current) return;
      if (loadingSuggestionsRef.current) return;
      loadingSuggestionsRef.current = true;

      try {
        const data = await aiService.listarSugestoes(query, stableContext);
        setCategories(data.categorias);
        setFrequentQuestions(data.perguntasFrequentes);
        setSuggestions(data.sugestoes);
        if (!query) {
          setSuggestionsLoaded(true);
        }
      } catch (error) {
        console.error("AI Suggestions Error:", error);
      } finally {
        loadingSuggestionsRef.current = false;
      }
    },
    [stableContext, suggestionsLoaded]
  );

  useEffect(() => {
    loadingSuggestionsRef.current = false;
    setSuggestionsLoaded(false);
    setSuggestions([]);
    setFrequentQuestions([]);
    setCategories([]);
  }, [serializedContext]);

  useEffect(() => {
    if (suggestionsLoaded) return;
    void loadSuggestions();
  }, [loadSuggestions, suggestionsLoaded]);

  useEffect(() => {
    if (autoLoad) {
      void loadHistory();
    }
  }, [autoLoad, loadHistory]);

  const ask = useCallback(
    async (query: string) => {
      if (!query.trim()) return;

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: query,
        timestamp: new Date()
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      try {
        const data = await aiService.perguntar(query, stableContext);
        const assistantMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.answer,
          timestamp: new Date(),
          intent: data.intent,
          data: data.data
        };

        setMessages((prev) => [...prev, assistantMessage]);
        setHistoryLoaded(true);
      } catch (error: any) {
        console.error("AI Error:", error);
        const message =
          error?.response?.data?.answer ??
          error?.response?.data?.error ??
          "Desculpe, ocorreu um erro ao processar sua solicitação. Tente novamente mais tarde.";

        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: message,
            timestamp: new Date(),
            intent: "ERROR"
          }
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [stableContext]
  );

  const clearHistory = useCallback(async () => {
    setMessages([]);
    try {
      await aiService.limparHistorico();
      setHistoryLoaded(true);
    } catch (error) {
      console.error("AI Clear History Error:", error);
    }
  }, []);

  return {
    messages,
    isLoading,
    suggestions,
    frequentQuestions,
    categories,
    loadHistory,
    loadSuggestions,
    ask,
    clearHistory
  };
}

export type { ChatMessage } from "../types";
