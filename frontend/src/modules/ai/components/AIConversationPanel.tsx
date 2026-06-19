import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, BotMessageSquare, RefreshCw, Send, Sparkles, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MarkdownLite } from "./MarkdownLite";
import { useAI } from "../hooks/useAI";
import type { AiContext, AiSuggestionItem } from "../types";

type AIConversationPanelProps = {
  variant: "compact" | "page";
  context?: AiContext;
  title?: string;
  subtitle?: string;
  showSidebar?: boolean;
  queuedQuestion?: string | null;
  onQueuedQuestionHandled?: () => void;
};

function groupByCategory(items: AiSuggestionItem[]) {
  return items.reduce<Record<string, AiSuggestionItem[]>>((acc, item) => {
    acc[item.categoria] = [...(acc[item.categoria] ?? []), item];
    return acc;
  }, {});
}

export function AIConversationPanel({
  variant,
  context,
  title = "Pergunte à IA",
  subtitle = "Use a mesma inteligência do G3N para consultar dados, indicadores e orientações.",
  showSidebar = variant === "page",
  queuedQuestion,
  onQueuedQuestionHandled
}: AIConversationPanelProps) {
  const { messages, isLoading, suggestions, frequentQuestions, categories, ask, clearHistory, loadSuggestions } =
    useAI({ context, autoLoad: true });
  const [inputValue, setInputValue] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [compactTab, setCompactTab] = useState<"conversa" | "sugestoes">("conversa");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesTopRef = useRef<HTMLDivElement>(null);

  const groupedSuggestions = useMemo(() => groupByCategory(suggestions), [suggestions]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadSuggestions(searchValue);
    }, 200);

    return () => window.clearTimeout(timeout);
  }, [searchValue, loadSuggestions]);

  useEffect(() => {
    if (!queuedQuestion?.trim()) return;
    void ask(queuedQuestion);
    onQueuedQuestionHandled?.();
  }, [ask, onQueuedQuestionHandled, queuedQuestion]);

  function submitForm(event?: React.FormEvent) {
    event?.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    void ask(inputValue);
    setInputValue("");
  }

  function scrollToTop() {
    messagesTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }

  const podeEnviar = !isLoading && inputValue.trim().length > 0;
  const podeLimpar = !isLoading && messages.length > 0;

  function renderSuggestionButtons(items: AiSuggestionItem[], limit?: number) {
    return (limit ? items.slice(0, limit) : items).map((item) => (
      <button
        key={item.id}
        type="button"
        onClick={() => void ask(item.pergunta)}
        className="rounded-full border border-[var(--g3-border)] bg-[var(--g3-card)] px-3 py-1.5 text-left text-xs font-medium text-[var(--g3-active)] shadow-sm transition-colors hover:bg-[var(--g3-primary-soft)]"
      >
        {item.pergunta}
      </button>
    ));
  }

  return (
    <div className={`flex h-full min-h-0 flex-col ${variant === "page" ? "gap-4" : ""}`}>
      <div className={variant === "page" && showSidebar ? "grid h-full min-h-0 gap-4 lg:grid-cols-[1.2fr_0.8fr]" : "h-full min-h-0"}>
        <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border-2 border-emerald-500 bg-emerald-50 shadow-[0_22px_50px_rgba(15,118,110,0.22)]">
          <div className="border-b border-emerald-300 bg-[linear-gradient(180deg,rgba(209,250,229,1)_0%,rgba(236,253,245,0.98)_100%)] px-4 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--g3-active)] text-white shadow-sm">
                    <BotMessageSquare size={18} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--g3-muted)]">
                      Assistente compartilhado
                    </p>
                    <h3 className="truncate text-base font-semibold text-[var(--g3-foreground)]">{title}</h3>
                  </div>
                </div>
                <p className="mt-2 text-sm text-[var(--g3-muted)]">{subtitle}</p>
              </div>
              <div className="flex items-center gap-2 self-start">
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--g3-primary-soft)] px-2 py-1 text-[10px] font-semibold text-[var(--g3-active)]">
                  <Sparkles size={12} />
                  IA
                </span>
              </div>
            </div>
            {variant === "compact" ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={compactTab === "conversa" ? "default" : "outline"}
                  className="h-8 rounded-full px-3 text-xs"
                  onClick={() => setCompactTab("conversa")}
                >
                  Conversa
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={compactTab === "sugestoes" ? "default" : "outline"}
                  className="h-8 rounded-full px-3 text-xs"
                  onClick={() => setCompactTab("sugestoes")}
                >
                  Sugestões
                </Button>
              </div>
            ) : null}
          </div>

          <div
            ref={scrollAreaRef}
            tabIndex={0}
            className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain bg-[linear-gradient(180deg,rgba(220,252,231,0.96)_0%,rgba(236,253,245,0.94)_100%)] p-4 pr-2"
            style={{ overscrollBehavior: "contain", scrollbarGutter: "stable" }}
          >
            <div ref={messagesTopRef} />
            {variant === "compact" && compactTab === "sugestoes" ? (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--g3-muted)]">
                    Perguntas frequentes
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">{renderSuggestionButtons(frequentQuestions, 8)}</div>
                </div>
                <div className="space-y-3">
                  {categories.map((category) => (
                    <div
                      key={category.id}
                      className="rounded-2xl border border-emerald-200 bg-[var(--g3-card)] p-3"
                    >
                      <p className="text-sm font-semibold text-[var(--g3-foreground)]">{category.label}</p>
                      <p className="mt-1 text-xs text-[var(--g3-muted)]">{category.descricao}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {renderSuggestionButtons(groupedSuggestions[category.id] ?? [], 3)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex h-full min-h-[240px] flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--g3-border)] bg-[var(--g3-card)]/80 p-6 text-center text-[var(--g3-muted)]">
                <span className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
                  <BotMessageSquare size={30} />
                </span>
                <p className="mb-2 text-sm font-semibold text-[var(--g3-foreground)]">A mesma IA está disponível aqui e no robô.</p>
                <p className="text-sm">Você pode usar perguntas livres ou escolher uma sugestão abaixo.</p>
              </div>
            ) : null}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    msg.role === "user"
                      ? "bg-gray-200 text-gray-700"
                      : "bg-[var(--g3-primary-soft)] text-[var(--g3-active)]"
                  }`}
                >
                  {msg.role === "user" ? <User size={16} /> : <BotMessageSquare size={16} />}
                </div>
                <div
                  className={`max-w-[88%] rounded-2xl p-3 text-sm shadow-sm ${
                    msg.role === "user"
                      ? "rounded-tr-none bg-[var(--g3-active)] text-white"
                      : "rounded-tl-none border border-emerald-200 bg-[var(--g3-card)] text-[var(--g3-foreground)]"
                  }`}
                >
                  {msg.role === "user" ? (
                    <p>{msg.content}</p>
                  ) : (
                    <div className="space-y-2">
                      <MarkdownLite content={msg.content} />
                      {msg.data?.origem === "banco_interno" ? (
                        <div className="flex flex-wrap items-center gap-2 border-t border-emerald-200 pt-2">
                          <span className="rounded-full bg-[var(--g3-primary-soft)] px-2 py-1 text-[10px] font-semibold text-[var(--g3-active)]">
                            Base interna
                          </span>
                          {msg.data.fontes?.slice(0, 4).map((fonte) => (
                            <span
                              key={fonte}
                              className="rounded-full border border-emerald-200 px-2 py-1 text-[10px] text-[var(--g3-muted)]"
                            >
                              {fonte}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  )}
                  <span className={`mt-1 block text-[10px] opacity-70 ${msg.role === "user" ? "text-blue-100" : "text-gray-400"}`}>
                    {msg.timestamp.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
            ))}

            {isLoading ? (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 animate-pulse items-center justify-center rounded-full bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
                  <BotMessageSquare size={16} />
                </div>
                <div className="flex items-center gap-2 rounded-2xl rounded-tl-none border border-emerald-200 bg-[var(--g3-card)] p-4 shadow-sm">
                  <RefreshCw size={16} className="animate-spin text-[var(--g3-active)]" />
                  <span className="text-sm text-[var(--g3-muted)]">Processando pergunta...</span>
                </div>
              </div>
            ) : null}
            <div ref={messagesEndRef} />
          </div>

          <div className="shrink-0 border-t border-emerald-300 bg-emerald-50 p-4">
            {variant === "compact" ? (
              <div className="mb-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-full px-3 text-xs"
                  onClick={scrollToTop}
                  title="Ir para o início"
                >
                  <ArrowUp className="mr-1 h-3.5 w-3.5" />
                  Início
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-full px-3 text-xs"
                  onClick={() => void clearHistory()}
                  title="Nova conversa"
                >
                  <Trash2 className="mr-1 h-3.5 w-3.5" />
                  Nova conversa
                </Button>
              </div>
            ) : null}
            <form onSubmit={submitForm} className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto_auto]">
              <Input
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                placeholder="Digite sua pergunta..."
                disabled={isLoading}
                className="min-w-0 h-12 text-base"
              />
              <Button
                type="button"
                variant="outline"
                disabled={!podeLimpar}
                onClick={() => void clearHistory()}
                className="w-full whitespace-nowrap md:w-auto"
                title="Limpar a conversa atual e iniciar uma nova"
              >
                <Trash2 className="mr-1.5 h-4 w-4" />
                Nova conversa
              </Button>
              <Button type="submit" disabled={!podeEnviar} className="w-full whitespace-nowrap md:w-auto">
                <Send className="mr-1.5 h-4 w-4" />
                Enviar
              </Button>
            </form>
          </div>
        </section>

        {variant === "page" && showSidebar ? (
          <aside className="space-y-4">
            <section className="rounded-3xl border border-[var(--g3-border)] bg-[var(--g3-card)] p-4 shadow-sm">
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-[var(--g3-foreground)]">Pesquisa inteligente</h4>
                <p className="text-sm text-[var(--g3-muted)]">Use a mesma biblioteca de perguntas do robô para acelerar sua consulta.</p>
              </div>
              <div className="mt-3">
                <Input
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder="Filtrar perguntas e categorias"
                />
              </div>
            </section>

            <section className="rounded-3xl border border-[var(--g3-border)] bg-[var(--g3-card)] p-4 shadow-sm">
              <h4 className="text-sm font-semibold text-[var(--g3-foreground)]">Perguntas frequentes</h4>
              <div className="mt-3 flex flex-wrap gap-2">{renderSuggestionButtons(frequentQuestions, 8)}</div>
            </section>

            <section className="rounded-3xl border border-[var(--g3-border)] bg-[var(--g3-card)] p-4 shadow-sm">
              <h4 className="text-sm font-semibold text-[var(--g3-foreground)]">Categorias</h4>
              <div className="mt-3 space-y-3">
                {categories.map((category) => (
                  <div key={category.id} className="rounded-2xl border border-[var(--g3-border)] bg-[var(--g3-card-soft)] p-3">
                    <p className="text-sm font-semibold text-[var(--g3-foreground)]">{category.label}</p>
                    <p className="mt-1 text-xs text-[var(--g3-muted)]">{category.descricao}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {renderSuggestionButtons(groupedSuggestions[category.id] ?? [], 3)}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        ) : null}
      </div>

    </div>
  );
}
