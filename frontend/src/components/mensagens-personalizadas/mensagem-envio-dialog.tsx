import { useEffect, useMemo, useState } from "react";
import { Loader2, Mail, MessageCircle, Plus, RefreshCcw, Search, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  useBuscarDestinatariosMensagem,
  useBuscarTodosDestinatariosMensagem,
  useEnviarMensagemPersonalizada,
  useGerarPreviewMensagem,
  useMensagensPersonalizadasModelos
} from "@/features/mensagens-personalizadas/use-mensagens-personalizadas";
import { MensagemPreviewCard } from "@/components/mensagens-personalizadas/mensagem-preview-card";
import type {
  MensagemCanalEnvio,
  MensagemDestinatario,
  MensagemDestinatarioTipo
} from "@/types/mensagens-personalizadas";

type MensagemEnvioFeedback = {
  tipo: "sucesso" | "erro" | "aviso";
  texto: string;
};

type Props = {
  aberto?: boolean;
  inline?: boolean;
  onClose?: () => void;
  onFeedback?: (retorno: MensagemEnvioFeedback) => void;
  tipoDestinatarioInicial?: MensagemDestinatarioTipo;
  canalInicial?: MensagemCanalEnvio;
  destinatariosFixos?: MensagemDestinatario[];
  contextoExtra?: Record<string, unknown>;
};

function deduplicarDestinatarios(destinatarios: MensagemDestinatario[]) {
  const mapa = new Map<string, MensagemDestinatario>();
  destinatarios.forEach((item) => {
    mapa.set(`${item.tipo}:${item.id}`, item);
  });
  return [...mapa.values()];
}

export function MensagemEnvioDialog({
  aberto = true,
  inline = false,
  onClose,
  onFeedback,
  tipoDestinatarioInicial = "BENEFICIARIO",
  canalInicial = "WHATSAPP",
  destinatariosFixos,
  contextoExtra
}: Props) {
  // Mantém a referência estável. Antes, o array era recriado em cada render e o
  // efeito de inicialização limpava o campo de busca a cada tecla/clique.
  const destinatariosFixosChave = (destinatariosFixos ?? []).map((item) => `${item.tipo}:${item.id}`).join("|");
  const destinatariosTravados = useMemo(
    () => (destinatariosFixos?.length ? deduplicarDestinatarios(destinatariosFixos) : []),
    [destinatariosFixosChave]
  );
  const [tipoDestinatario, setTipoDestinatario] = useState<MensagemDestinatarioTipo>(tipoDestinatarioInicial);
  const [canal, setCanal] = useState<MensagemCanalEnvio>(canalInicial);
  const [buscaDestinatario, setBuscaDestinatario] = useState("");
  const [destinatariosSelecionados, setDestinatariosSelecionados] = useState<MensagemDestinatario[]>(
    destinatariosTravados
  );
  const [modeloId, setModeloId] = useState("");
  const [assuntoEditado, setAssuntoEditado] = useState("");
  const [mensagemEditada, setMensagemEditada] = useState("");
  const [previewConferida, setPreviewConferida] = useState(false);
  const [modoDestinatarios, setModoDestinatarios] = useState<"TODOS" | "INDIVIDUAIS">("INDIVIDUAIS");
  const [todosDestinatarios, setTodosDestinatarios] = useState<MensagemDestinatario[]>([]);

  const modelosQuery = useMensagensPersonalizadasModelos({
    somenteAtivas: true,
    destinatario: tipoDestinatario,
    canal
  });
  const buscarDestinatariosMutation = useBuscarDestinatariosMensagem();
  const buscarTodosMutation = useBuscarTodosDestinatariosMensagem();
  const previewMutation = useGerarPreviewMensagem();
  const enviarMutation = useEnviarMensagemPersonalizada();

  const sugestoesDestinatarios = buscarDestinatariosMutation.data ?? [];
  const modelos = modelosQuery.data ?? [];
  const modeloSelecionado = modelos.find((item) => item.id === modeloId);
  const possuiDestinatarioFixo = destinatariosTravados.length > 0;

  useEffect(() => {
    if (!aberto) return;
    setTipoDestinatario(tipoDestinatarioInicial);
    setCanal(canalInicial);
    setBuscaDestinatario("");
    setDestinatariosSelecionados(destinatariosTravados);
    setModeloId("");
    setAssuntoEditado("");
    setMensagemEditada("");
    setPreviewConferida(false);
    setModoDestinatarios("INDIVIDUAIS");
    setTodosDestinatarios([]);
  }, [aberto, tipoDestinatarioInicial, canalInicial, destinatariosTravados]);

  useEffect(() => {
    if (!aberto || modoDestinatarios !== "TODOS" || possuiDestinatarioFixo) return;
    void buscarTodosMutation.mutateAsync(tipoDestinatario).then(setTodosDestinatarios).catch(() => setTodosDestinatarios([]));
  }, [aberto, modoDestinatarios, tipoDestinatario, possuiDestinatarioFixo]);

  useEffect(() => {
    if (!modeloSelecionado) return;
    setAssuntoEditado(modeloSelecionado.assunto ?? modeloSelecionado.titulo);
    setMensagemEditada(modeloSelecionado.mensagemBase);
    setPreviewConferida(false);
  }, [modeloSelecionado]);

  useEffect(() => {
    if (!aberto || possuiDestinatarioFixo) return;
    const termo = buscaDestinatario.trim();
    if (termo.length < 2) {
      buscarDestinatariosMutation.reset();
      return;
    }

    const handle = window.setTimeout(() => {
      void buscarDestinatariosMutation.mutateAsync({
        tipo: tipoDestinatario,
        termo,
        somenteAtivos: true
      });
    }, 250);

    return () => window.clearTimeout(handle);
    // A mutação não entra nas dependências: seu estado muda durante a busca e
    // não pode cancelar/reiniciar o debounce enquanto o usuário digita.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, buscaDestinatario, tipoDestinatario, possuiDestinatarioFixo]);

  function buscarDestinatariosAgora() {
    const termo = buscaDestinatario.trim();
    if (termo.length < 2) {
      onFeedback?.({ tipo: "aviso", texto: "Digite pelo menos 2 caracteres para buscar." });
      return;
    }
    void buscarDestinatariosMutation.mutateAsync({ tipo: tipoDestinatario, termo, somenteAtivos: true });
  }

  useEffect(() => {
    const primeiroDestinatario = modoDestinatarios === "TODOS" ? todosDestinatarios[0] : destinatariosSelecionados[0];
    if (!aberto || !modeloId || !primeiroDestinatario) return;

    const handle = window.setTimeout(() => {
      void previewMutation.mutateAsync({
        modeloId,
        canal,
        destinatarioTipo: tipoDestinatario,
        destinatarioId: primeiroDestinatario.id,
        assuntoEditado,
        mensagemEditada,
        contextoExtra
      });
    }, 250);

    return () => window.clearTimeout(handle);
  }, [
    aberto,
    modeloId,
    canal,
    tipoDestinatario,
    destinatariosSelecionados,
    modoDestinatarios,
    todosDestinatarios,
    assuntoEditado,
    mensagemEditada,
    contextoExtra,
    previewMutation
  ]);

  const preview = previewMutation.data ?? null;
  const resumoEnvio = useMemo(() => {
    if (destinatariosSelecionados.length > 1) {
      return `${destinatariosSelecionados.length} destinatários selecionados`;
    }
    if (destinatariosSelecionados.length === 1) {
      return "1 destinatário selecionado";
    }
    return "Nenhum destinatário selecionado";
  }, [destinatariosSelecionados]);

  function adicionarDestinatario(item: MensagemDestinatario) {
    setDestinatariosSelecionados((atual) => deduplicarDestinatarios([...atual, item]));
    setBuscaDestinatario("");
  }

  function marcarTodos() {
    if (sugestoesDestinatarios.length) {
      setDestinatariosSelecionados((atual) => deduplicarDestinatarios([...atual, ...sugestoesDestinatarios]));
    }
  }

  function desmarcarTodos() {
    if (!possuiDestinatarioFixo) {
      setDestinatariosSelecionados([]);
    }
  }

  function removerDestinatario(id: string) {
    if (possuiDestinatarioFixo) return;
    setDestinatariosSelecionados((atual) => atual.filter((item) => item.id !== id));
  }

  async function confirmarEnvio() {
    if (!modeloId) {
      onFeedback?.({ tipo: "aviso", texto: "Selecione uma mensagem antes de enviar." });
      return;
    }

    if (!preview) {
      onFeedback?.({ tipo: "aviso", texto: "Gere a prévia antes de enviar." });
      return;
    }

    if (!previewConferida) {
      onFeedback?.({ tipo: "aviso", texto: "Confira a prévia e confirme antes de disparar." });
      return;
    }

    const quantidadeDestinatarios = modoDestinatarios === "TODOS" ? todosDestinatarios.length : destinatariosSelecionados.length;
    if (!quantidadeDestinatarios) {
      onFeedback?.({ tipo: "aviso", texto: "Selecione ao menos um destinatário." });
      return;
    }

    try {
      const resultado = await enviarMutation.mutateAsync({
        modeloId,
        canal,
        destinatarioTipo: tipoDestinatario,
        destinatarioIds: modoDestinatarios === "TODOS" ? [] : destinatariosSelecionados.map((item) => item.id),
        destinatariosTodos: modoDestinatarios === "TODOS",
        tipoEnvio: quantidadeDestinatarios > 1 ? "LOTE" : "INDIVIDUAL",
        assuntoEditado,
        mensagemEditada,
        contextoExtra
      });

      const urlWhatsapp = resultado.itens.find((item) => item.urlWhatsapp)?.urlWhatsapp;
      if (urlWhatsapp && canal === "WHATSAPP") {
        window.open(urlWhatsapp, "_blank", "noopener,noreferrer");
      }

      onFeedback?.({
        tipo: "sucesso",
        texto: `Envio concluído: ${resultado.resumo.enviados} enviados, ${resultado.resumo.preparados} preparados e ${resultado.resumo.erros} com erro.`
      });
      onClose?.();
    } catch (error: any) {
      onFeedback?.({
        tipo: "erro",
        texto: error?.response?.data?.message ?? "Não foi possível concluir o envio da mensagem."
      });
    }
  }

  if (!aberto) return null;

  const content = (
    <div className={`min-h-0 grid gap-5 xl:grid-cols-[1.2fr_0.8fr] ${inline ? "" : "flex-1 overflow-y-auto p-5"}`}>
      <section className="min-w-0 space-y-4 xl:min-w-0">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-1">
            <Label>Canal</Label>
            <Select value={canal} onChange={(event) => setCanal(event.target.value as MensagemCanalEnvio)}>
              <option value="WHATSAPP">WhatsApp</option>
              <option value="EMAIL">E-mail</option>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Tipo de destinatário</Label>
            <Select
              value={tipoDestinatario}
              onChange={(event) => {
                const novoTipo = event.target.value as MensagemDestinatarioTipo;
                setTipoDestinatario(novoTipo);
                if (!possuiDestinatarioFixo) {
                  setDestinatariosSelecionados([]);
                }
                setModeloId("");
              }}
              disabled={possuiDestinatarioFixo}
            >
              <option value="BENEFICIARIO">Beneficiários</option>
              <option value="PROFISSIONAL">Profissionais</option>
              <option value="COLABORADOR">Colaboradores / Equipe</option>
              <option value="VOLUNTARIO">Voluntários</option>
              <option value="DOADOR">Doadores</option>
              <option value="INSTITUICAO">Instituições / Parceiros</option>
            </Select>
          </div>

          <div className="space-y-1 md:col-span-2">
            <Label>Mensagem base</Label>
            <Select value={modeloId} onChange={(event) => setModeloId(event.target.value)}>
              <option value="">Selecione uma mensagem pré-pronta</option>
              {modelos.map((modelo) => (
                <option key={modelo.id} value={modelo.id}>
                  {modelo.titulo}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="space-y-2 rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card)] p-4">
          <div className="flex items-center justify-between gap-3">
              <Label className="text-sm font-semibold text-slate-900 tracking-wider">
              Destinatários
            </Label>
            <span className="text-xs font-medium text-[var(--g3-active)] bg-[var(--g3-primary-soft)] px-2 py-0.5 rounded-full">
              {modoDestinatarios === "TODOS" ? (buscarTodosMutation.isPending ? "Consultando ativos..." : `${todosDestinatarios.length} ativos elegíveis`) : resumoEnvio}
              </span>
            </div>

          {!possuiDestinatarioFixo ? <div className="grid gap-2 sm:grid-cols-2"><button type="button" onClick={() => { setModoDestinatarios("TODOS"); setDestinatariosSelecionados([]); setPreviewConferida(false); }} className={`rounded-lg border p-3 text-left ${modoDestinatarios === "TODOS" ? "border-[var(--g3-active)] bg-[var(--g3-primary-soft)]" : "border-[var(--g3-border)]"}`}><span className="block text-sm font-semibold">Enviar para todos os ativos</span><span className="text-xs text-[var(--g3-muted)]">Inclui todos que aceitam comunicação.</span></button><button type="button" onClick={() => { setModoDestinatarios("INDIVIDUAIS"); setTodosDestinatarios([]); setPreviewConferida(false); }} className={`rounded-lg border p-3 text-left ${modoDestinatarios === "INDIVIDUAIS" ? "border-[var(--g3-active)] bg-[var(--g3-primary-soft)]" : "border-[var(--g3-border)]"}`}><span className="block text-sm font-semibold">Selecionar individualmente</span><span className="text-xs text-[var(--g3-muted)]">Escolha uma ou várias pessoas.</span></button></div> : null}

          {!possuiDestinatarioFixo && modoDestinatarios === "INDIVIDUAIS" ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={buscaDestinatario}
                  onChange={(event) => setBuscaDestinatario(event.target.value)}
                  onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); buscarDestinatariosAgora(); } }}
                  placeholder={`Buscar ${tipoDestinatario.toLowerCase()} por nome, documento ou código...`}
                  className="flex-1"
                />
                <Button type="button" variant="outline" size="sm" onClick={buscarDestinatariosAgora} disabled={buscarDestinatariosMutation.isPending} title="Buscar destinatários">
                  <Search className="h-4 w-4" />
                  <span className="ml-1 hidden sm:inline">Buscar</span>
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={marcarTodos} disabled={!sugestoesDestinatarios.length}>
                  Marcar todos
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={desmarcarTodos} disabled={!destinatariosSelecionados.length}>
                  Limpar
                </Button>
              </div>

              <div className="max-h-36 overflow-y-auto rounded-lg border border-[var(--g3-border)] bg-white shadow-inner">
                {buscarDestinatariosMutation.isPending ? (
                  <div className="flex items-center gap-2 px-3 py-3 text-sm text-[var(--g3-muted)]">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Buscando na base de dados...
                  </div>
                ) : sugestoesDestinatarios.length ? (
                  sugestoesDestinatarios.map((item) => (
                    <button
                      key={`${item.tipo}-${item.id}`}
                      type="button"
                      className="flex w-full items-center justify-between border-b border-slate-100 px-3 py-2 text-left last:border-b-0 hover:bg-[var(--g3-primary-soft)] transition-colors"
                      onClick={() => adicionarDestinatario(item)}
                    >
                      <span>
                        <span className="block text-sm font-medium text-slate-900">{item.nome}</span>
                        <span className="block text-xs text-[var(--g3-muted)]">
                          {[item.detalhe, item.documento].filter(Boolean).join(" • ")}
                        </span>
                        {item.aceitaComunicacao === false ? <span className="block text-xs font-medium text-amber-700">Sem autorização para receber mensagens</span> : null}
                      </span>
                      <Plus className="h-4 w-4 text-[var(--g3-active)]" />
                    </button>
                  ))
                ) : (
                  <p className="px-3 py-3 text-sm text-[var(--g3-muted)] italic">
                    {buscaDestinatario.trim().length >= 2 
                      ? "Nenhum resultado encontrado para esta busca." 
                      : "Digite o nome ou documento para buscar destinatários."}
                  </p>
                )}
              </div>
            </div>
          ) : null}

          {modoDestinatarios === "TODOS" ? <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">O envio será realizado para todos os destinatários ativos e autorizados do tipo selecionado.</div> : destinatariosSelecionados.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {destinatariosSelecionados.map((item) => (
                <span
                  key={`${item.tipo}-${item.id}`}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--g3-border)] bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm"
                >
                  {item.nome}
                  {!possuiDestinatarioFixo ? (
                    <button
                      type="button"
                      onClick={() => removerDestinatario(item.id)}
                      className="text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  ) : null}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="grid gap-4">
          <div className="space-y-1">
            <Label>Assunto (exclusivo para e-mail)</Label>
            <Input 
              value={assuntoEditado} 
              onChange={(event) => { setAssuntoEditado(event.target.value); setPreviewConferida(false); }}
              placeholder="Digite o assunto da mensagem..."
              disabled={canal === "WHATSAPP"}
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label>Conteúdo da mensagem</Label>
              <span className="text-[10px] text-[var(--g3-muted)]">Placeholders serão substituídos automaticamente</span>
            </div>
            <Textarea
              rows={8}
              value={mensagemEditada}
              onChange={(event) => { setMensagemEditada(event.target.value); setPreviewConferida(false); }}
              placeholder="Escreva sua mensagem aqui ou selecione um modelo acima..."
              className="resize-none"
            />
          </div>
        </div>
      </section>

      <section className="min-w-0 space-y-4 xl:min-w-0">
        <div className="sticky top-0 space-y-4">
          <MensagemPreviewCard canal={canal} preview={preview} />

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const primeiro = destinatariosSelecionados[0];
                if (!modeloId || !primeiro) return;
                void previewMutation.mutateAsync({
                  modeloId,
                  canal,
                  destinatarioTipo: tipoDestinatario,
                  destinatarioId: primeiro.id,
                  assuntoEditado,
                  mensagemEditada,
                  contextoExtra
                });
              }}
              disabled={!modeloId || (modoDestinatarios === "TODOS" ? !todosDestinatarios.length : !destinatariosSelecionados.length) || previewMutation.isPending}
            >
              <RefreshCcw className={`mr-1.5 h-3.5 w-3.5 ${previewMutation.isPending ? "animate-spin" : ""}`} />
              Atualizar prévia
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewConferida(true)}
              disabled={!preview || previewMutation.isPending}
            >
              Confirmar prévia
            </Button>

            <Button
              size="sm"
              className="bg-[var(--g3-primary-button)] hover:bg-[var(--g3-primary-button-hover)]"
              onClick={() => void confirmarEnvio()}
              disabled={!modeloId || (modoDestinatarios === "TODOS" ? !todosDestinatarios.length : !destinatariosSelecionados.length) || !previewConferida || enviarMutation.isPending}
            >
              {enviarMutation.isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  {canal === "WHATSAPP" ? (
                    <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
                  ) : (
                    <Mail className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  {canal === "WHATSAPP" ? "Preparar envio WhatsApp" : "Enviar E-mail agora"}
                </>
              )}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );

  if (inline) {
    return <div className="space-y-4">{content}</div>;
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-slate-950/55 px-3 py-3 sm:px-4 sm:py-6">
      <div className="my-auto flex max-h-[calc(100vh-1.5rem)] w-full max-w-[min(920px,100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl sm:max-h-[calc(100vh-3rem)] sm:max-w-[min(920px,100vw-3rem)]">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Central de Envio de Mensagens</h3>
            <p className="text-sm text-[var(--g3-muted)]">
              Selecione público, canal e modelo para realizar comunicações em massa ou individuais.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        {content}
      </div>
    </div>
  );
}
