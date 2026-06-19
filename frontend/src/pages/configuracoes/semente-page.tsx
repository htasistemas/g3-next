import { useMemo, useState } from "react";
import { Brain, Lightbulb, RefreshCw, Search } from "lucide-react";
import { useLocation } from "react-router-dom";
import { AdminPageLayout, type AdminAction, type AdminTab } from "@/components/admin/admin-page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AIConversationPanel } from "@/modules/ai/components/AIConversationPanel";
import { useAI } from "@/modules/ai/hooks/useAI";

type AbaId = "conversa" | "sugestoes";

const abas: AdminTab[] = [
  { id: "conversa", label: "Conversa com a IA", icon: Brain },
  { id: "sugestoes", label: "Sugestões de perguntas", icon: Lightbulb }
];

export function SementePage() {
  const [abaAtiva, setAbaAtiva] = useState<AbaId>("conversa");
  const [perguntaSelecionada, setPerguntaSelecionada] = useState<string | null>(null);
  const [buscaSugestao, setBuscaSugestao] = useState("");
  const location = useLocation();

  const contexto = useMemo(
    () => ({
      pathname: location.pathname,
      pageTitle: "Pergunte à IA"
    }),
    [location.pathname]
  );

  const { categories, suggestions, frequentQuestions, loadSuggestions } = useAI({
    context: contexto,
    autoLoad: false
  });

  const groupedSuggestions = useMemo(
    () =>
      suggestions.reduce<Record<string, typeof suggestions>>((acc, item) => {
        acc[item.categoria] = [...(acc[item.categoria] ?? []), item];
        return acc;
      }, {}),
    [suggestions]
  );

  const acoes = useMemo<AdminAction[]>(
    () => [
      {
        label: "Atualizar sugestões",
        icon: RefreshCw,
        onClick: () => {
          void loadSuggestions(buscaSugestao);
        },
        variant: "outline"
      }
    ],
    [buscaSugestao, loadSuggestions]
  );

  return (
    <AdminPageLayout
      tabs={abas}
      activeTab={abaAtiva}
      onChangeTab={(tabId) => setAbaAtiva(tabId as AbaId)}
      actions={acoes}
      sectionLabel="Configurações gerais"
      pageTitle="Pergunte à IA"
      activeTitle={abaAtiva === "conversa" ? "Conversa com a IA" : "Sugestões de perguntas"}
    >
      <section className="space-y-4">
        <div className="rounded-3xl border border-[var(--g3-border)] bg-[var(--g3-card)] px-5 py-4 shadow-sm">
          <p className="text-sm text-[var(--g3-muted)]">
            Esta central usa exatamente a mesma inteligência do robô disponível nas telas do sistema. As perguntas,
            categorias, histórico e respostas são compartilhados.
          </p>
        </div>

        {abaAtiva === "conversa" ? (
          <AIConversationPanel
            variant="page"
            context={contexto}
            showSidebar={false}
            queuedQuestion={perguntaSelecionada}
            onQueuedQuestionHandled={() => setPerguntaSelecionada(null)}
            title="Pergunte à IA"
            subtitle="Central completa de consulta com a mesma base inteligente do robô e opção de reiniciar a conversa quando quiser."
          />
        ) : (
          <div className="space-y-4">
            <Card className="border-[var(--g3-border)]">
              <CardHeader className="rounded-t-3xl bg-[var(--g3-primary-soft)] pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Search className="h-4 w-4 text-[var(--g3-active)]" />
                  Biblioteca de perguntas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-[var(--g3-muted)]">
                  Escolha uma pergunta pronta e envie para a aba de conversa usando a mesma IA do sistema.
                </p>
                <Input
                  value={buscaSugestao}
                  onChange={(event) => {
                    const valor = event.target.value;
                    setBuscaSugestao(valor);
                    void loadSuggestions(valor);
                  }}
                  placeholder="Filtrar perguntas por assunto"
                />
              </CardContent>
            </Card>

            <Card className="border-[var(--g3-border)]">
              <CardHeader className="rounded-t-3xl bg-[var(--g3-primary-soft)] pb-3">
                <CardTitle className="text-sm">Perguntas frequentes</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {frequentQuestions.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="rounded-full border border-[var(--g3-border)] bg-[var(--g3-card-soft)] px-3 py-2 text-xs font-medium text-[var(--g3-active)] transition-colors hover:bg-[var(--g3-primary-soft)]"
                    onClick={() => {
                      setPerguntaSelecionada(item.pergunta);
                      setAbaAtiva("conversa");
                    }}
                  >
                    {item.pergunta}
                  </button>
                ))}
              </CardContent>
            </Card>

            <div className="grid gap-4 xl:grid-cols-2">
              {categories.map((category) => (
                <Card key={category.id} className="border-[var(--g3-border)]">
                  <CardHeader className="rounded-t-3xl bg-[var(--g3-primary-soft)] pb-3">
                    <CardTitle className="text-sm">{category.label}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-[var(--g3-muted)]">{category.descricao}</p>
                    <div className="space-y-2">
                      {(groupedSuggestions[category.id] ?? []).map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className="w-full rounded-2xl border border-[var(--g3-border)] bg-[var(--g3-card-soft)] px-3 py-3 text-left transition-colors hover:bg-[var(--g3-primary-soft)]"
                          onClick={() => {
                            setPerguntaSelecionada(item.pergunta);
                            setAbaAtiva("conversa");
                          }}
                        >
                          <span className="block text-sm font-semibold text-[var(--g3-foreground)]">{item.pergunta}</span>
                          <span className="mt-1 block text-xs text-[var(--g3-muted)]">{item.descricao}</span>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </section>
    </AdminPageLayout>
  );
}
