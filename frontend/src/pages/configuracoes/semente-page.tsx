import { useMemo, useState } from "react";
import { Bot, Brain, RefreshCw, Save, SendHorizonal } from "lucide-react";
import { AdminPageLayout, type AdminAction, type AdminTab } from "@/components/admin/admin-page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PopupMensagem, type PopupMensagemState } from "@/components/admin/admin-popups";
import { useAuth } from "@/hooks/use-auth";
import { httpClient } from "@/services/http-client";

type AbaId = "conversa";

type ChatItem = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  tipo?: "aprendizado" | "resposta";
};

type SementeResponse = {
  tipo: "aprendizado" | "resposta";
  answer: string;
  memorias?: string[];
};

const abas: AdminTab[] = [{ id: "conversa", label: "Pesquise na IA", icon: Brain }];

export function SementePage() {
  const { usuario } = useAuth();
  const [abaAtiva, setAbaAtiva] = useState<AbaId>("conversa");
  const [mensagens, setMensagens] = useState<ChatItem[]>([]);
  const [texto, setTexto] = useState("");
  const [loading, setLoading] = useState(false);
  const [popup, setPopup] = useState<PopupMensagemState | null>(null);

  const usuarioId = usuario?.id ? Number(usuario.id) : 1;

  const acoes = useMemo<AdminAction[]>(
    () => [
      {
        label: "Limpar conversa",
        icon: RefreshCw,
        onClick: () => setMensagens([]),
        variant: "outline",
        disabled: loading || mensagens.length === 0
      }
    ],
    [loading, mensagens.length]
  );

  async function enviarMensagem() {
    const mensagem = texto.trim();
    if (!mensagem || loading) return;

    const mensagemUsuario: ChatItem = {
      id: crypto.randomUUID(),
      role: "user",
      content: mensagem,
      timestamp: new Date().toISOString()
    };

    setMensagens((atual) => [...atual, mensagemUsuario]);
    setTexto("");
    setLoading(true);

    try {
      const { data } = await httpClient.post<SementeResponse>("/api/semente/chat", {
        usuario_id: usuarioId,
        mensagem
      });

      const mensagemAssistente: ChatItem = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.answer,
        timestamp: new Date().toISOString(),
        tipo: data.tipo
      };

      setMensagens((atual) => [...atual, mensagemAssistente]);

      if (data.tipo === "aprendizado") {
        setPopup({
          tipo: "sucesso",
          titulo: "Memória registrada",
          texto: "A Semente salvou a nova memória do usuário."
        });
      }
    } catch (error: any) {
      const textoErro =
        error?.response?.data?.message ?? "Nao foi possivel enviar a mensagem para a Semente.";

      setMensagens((atual) => [
        ...atual,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: textoErro,
          timestamp: new Date().toISOString()
        }
      ]);
      setPopup({
        tipo: "erro",
        titulo: "Erro",
        texto: textoErro
      });
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    void enviarMensagem();
  }

  return (
    <>
      <AdminPageLayout
        tabs={abas}
        activeTab={abaAtiva}
        onChangeTab={(tabId) => setAbaAtiva(tabId as AbaId)}
        actions={acoes}
        sectionLabel="Configurações gerais"
        pageTitle="Pesquise na IA"
        activeTitle="Pesquise na IA"
      >
        <section className="space-y-3">
          <Card className="border-[var(--g3-border)]">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Bot className="h-4 w-4 text-[var(--g3-active)]" />
                Semente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-md border border-[var(--g3-border)] bg-[var(--g3-card-soft)] p-3 text-sm text-[var(--g3-muted)]">
                Use perguntas normais para conversar com a Semente. Para ensinar uma preferência, envie uma mensagem iniciando com <strong>/aprender</strong>.
              </div>

              <div className="max-h-[420px] min-h-[320px] space-y-3 overflow-y-auto rounded-md border border-[var(--g3-border)] bg-[var(--g3-card-soft)] p-3">
                {mensagens.length === 0 ? (
                  <div className="flex h-full min-h-[280px] items-center justify-center text-center text-sm text-[var(--g3-muted)]">
                    Nenhuma mensagem enviada ainda. Experimente: <strong className="ml-1">/aprender Gosto de respostas curtas</strong>
                  </div>
                ) : (
                  mensagens.map((mensagem) => (
                    <div
                      key={mensagem.id}
                      className={`flex ${mensagem.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                          mensagem.role === "user"
                            ? "bg-[var(--g3-active)] text-white"
                            : "border border-[var(--g3-border)] bg-[var(--g3-card)] text-[var(--g3-foreground)]"
                        }`}
                      >
                        <p>{mensagem.content}</p>
                        <p
                          className={`mt-2 text-[10px] ${
                            mensagem.role === "user" ? "text-white/80" : "text-[var(--g3-muted)]"
                          }`}
                        >
                          {new Date(mensagem.timestamp).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                          {mensagem.tipo === "aprendizado" ? " • memória" : ""}
                        </p>
                      </div>
                    </div>
                  ))
                )}

                {loading ? (
                  <div className="flex justify-start">
                    <div className="inline-flex items-center gap-2 rounded-2xl border border-[var(--g3-border)] bg-[var(--g3-card)] px-4 py-3 text-sm text-[var(--g3-muted)]">
                      <RefreshCw className="h-4 w-4 animate-spin text-[var(--g3-active)]" />
                      Processando mensagem...
                    </div>
                  </div>
                ) : null}
              </div>

              <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row">
                <Input
                  value={texto}
                  onChange={(event) => setTexto(event.target.value)}
                  placeholder="Digite sua pergunta ou use /aprender ..."
                  disabled={loading}
                />
                <div className="flex gap-2">
                  <Button type="submit" disabled={loading || !texto.trim()}>
                    <SendHorizonal className="mr-1.5 h-4 w-4" />
                    Enviar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={loading}
                    onClick={() => setTexto("/aprender ")}
                  >
                    <Save className="mr-1.5 h-4 w-4" />
                    Aprender
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </section>
      </AdminPageLayout>

      {popup ? <PopupMensagem popup={popup} onClose={() => setPopup(null)} /> : null}
    </>
  );
}
