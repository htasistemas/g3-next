import React, { useState, useRef, useEffect } from "react";
import { BotMessageSquare, X, Send, Sparkles, User, RefreshCw, Trash2 } from "lucide-react";
import { useAI, ChatMessage } from "../hooks/useAI";
import { MarkdownLite } from "./MarkdownLite";

const SUGGESTIONS = [
  "Famílias sem atualização há 90 dias",
  "Resumo de doações deste mês",
  "Beneficiários no bairro Centro",
  "Tarefas pendentes e em atraso",
  "Resumo de matrículas e fila de espera",
  "Resumo geral do sistema",
];

export const AIChatWidget: React.FC = () => {
  const { messages, isLoading, isOpen, toggleChat, ask, clearHistory } = useAI();
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    ask(inputValue);
    setInputValue("");
  };

  const handleSuggestionClick = (suggestion: string) => {
    ask(suggestion);
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={toggleChat}
        className={`fixed bottom-6 right-6 z-50 p-4 rounded-full shadow-lg transition-all duration-300 transform hover:scale-110 ${
          isOpen
            ? "rotate-90 bg-[var(--g3-active)]"
            : "bg-[var(--g3-active)] hover:brightness-95"
        } text-white flex items-center justify-center`}
        title={isOpen ? "Fechar assistente" : "Pergunte à IA"}
      >
        {isOpen ? <X size={24} /> : <BotMessageSquare size={28} />}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 flex h-[600px] max-h-[80vh] w-96 max-w-[90vw] flex-col overflow-hidden rounded-3xl border border-[var(--g3-border)] bg-[var(--g3-card)] shadow-2xl animate-in slide-in-from-bottom-10 fade-in duration-300">
          {/* Header */}
          <div className="border-b border-[var(--g3-border)] bg-[linear-gradient(180deg,var(--g3-primary-soft)_0%,rgba(255,255,255,0.98)_100%)] px-4 py-3 text-[var(--g3-foreground)]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--g3-active)] text-white shadow-sm">
                    <BotMessageSquare size={18} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--g3-muted)]">
                      Assistente
                    </p>
                    <h3 className="truncate text-sm font-semibold text-[var(--g3-foreground)] sm:text-base">
                      Pergunte à IA
                    </h3>
                  </div>
                </div>
                <p className="mt-2 text-xs text-[var(--g3-muted)]">
                  Respostas rápidas com base no contexto disponível do sistema.
                </p>
              </div>
              <div className="flex items-center gap-1">
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--g3-primary-soft)] px-2 py-1 text-[10px] font-semibold text-[var(--g3-active)]">
                  <Sparkles size={12} />
                  IA
                </span>
                <button
                  onClick={clearHistory}
                  className="rounded-full p-2 text-[var(--g3-muted)] transition-colors hover:bg-white/70 hover:text-[var(--g3-active)]"
                  title="Limpar histórico"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 space-y-4 overflow-y-auto bg-[linear-gradient(180deg,var(--g3-card-soft)_0%,var(--g3-card)_100%)] p-4">
            {messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--g3-border)] bg-[var(--g3-card)]/80 p-6 text-center text-[var(--g3-muted)]">
                <span className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
                  <BotMessageSquare size={30} />
                </span>
                <p className="mb-2 text-sm font-semibold text-[var(--g3-foreground)]">Olá! Como posso ajudar?</p>
                <p className="text-sm">Experimente uma das sugestões abaixo.</p>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    msg.role === "user"
                      ? "bg-gray-200 text-gray-700"
                      : "bg-[var(--g3-primary-soft)] text-[var(--g3-active)]"
                  }`}
                >
                  {msg.role === "user" ? <User size={16} /> : <BotMessageSquare size={16} />}
                </div>
                <div
                  className={`max-w-[80%] rounded-2xl p-3 text-sm shadow-sm ${
                    msg.role === "user"
                      ? "rounded-tr-none bg-[var(--g3-active)] text-white"
                      : "rounded-tl-none border border-[var(--g3-border)] bg-[var(--g3-card)] text-[var(--g3-foreground)]"
                  }`}
                >
                  {msg.role === "user" ? (
                    <p>{msg.content}</p>
                  ) : (
                    <div className="space-y-2">
                      <MarkdownLite content={msg.content} />
                      {msg.data?.origem === "banco_interno" ? (
                        <div className="flex flex-wrap items-center gap-2 border-t border-[var(--g3-border)] pt-2">
                          <span className="rounded-full bg-[var(--g3-primary-soft)] px-2 py-1 text-[10px] font-semibold text-[var(--g3-active)]">
                            Base interna
                          </span>
                          {msg.data.fontes?.slice(0, 3).map((fonte) => (
                            <span
                              key={fonte}
                              className="rounded-full border border-[var(--g3-border)] px-2 py-1 text-[10px] text-[var(--g3-muted)]"
                            >
                              {fonte}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  )}
                  <span className={`text-[10px] block mt-1 opacity-70 ${msg.role === "user" ? "text-blue-100" : "text-gray-400"}`}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-3">
                 <div className="flex h-8 w-8 shrink-0 animate-pulse items-center justify-center rounded-full bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
                    <BotMessageSquare size={16} />
                 </div>
                 <div className="flex items-center gap-2 rounded-2xl rounded-tl-none border border-[var(--g3-border)] bg-[var(--g3-card)] p-4 shadow-sm">
                    <RefreshCw size={16} className="animate-spin text-[var(--g3-active)]" />
                    <span className="text-sm text-[var(--g3-muted)]">Processando...</span>
                 </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions (if empty history) */}
          {messages.length === 0 && !isLoading && (
            <div className="flex shrink-0 gap-2 overflow-x-auto bg-[var(--g3-card-soft)] px-4 pb-3 no-scrollbar">
                {SUGGESTIONS.map((suggestion, idx) => (
                    <button
                        key={idx}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="whitespace-nowrap rounded-full border border-[var(--g3-border)] bg-[var(--g3-card)] px-3 py-1.5 text-xs font-medium text-[var(--g3-active)] shadow-sm transition-colors hover:bg-[var(--g3-primary-soft)]"
                    >
                        {suggestion}
                    </button>
                ))}
            </div>
          )}

          {/* Input Area */}
          <div className="shrink-0 border-t border-[var(--g3-border)] bg-[var(--g3-card)] p-4">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Digite sua pergunta..."
                className="flex-1 rounded-full border border-[var(--g3-border)] bg-[var(--g3-card-soft)] px-4 py-2 text-sm text-[var(--g3-foreground)] placeholder:text-[var(--g3-muted)] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--g3-active)]"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !inputValue.trim()}
                className="rounded-full bg-[var(--g3-active)] p-2 text-white transition-colors hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send size={20} />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
