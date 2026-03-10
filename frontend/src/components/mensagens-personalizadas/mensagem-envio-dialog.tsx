import { useEffect, useMemo, useState } from "react";
import { Loader2, Mail, MessageCircle, Plus, RefreshCcw, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  useBuscarDestinatariosMensagem,
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
  aberto: boolean;
  onClose: () => void;
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
  aberto,
  onClose,
  onFeedback,
  tipoDestinatarioInicial = "BENEFICIARIO",
  canalInicial = "WHATSAPP",
  destinatariosFixos,
  contextoExtra
}: Props) {
  const destinatariosTravados = destinatariosFixos?.length ? deduplicarDestinatarios(destinatariosFixos) : [];
  const [tipoDestinatario, setTipoDestinatario] = useState<MensagemDestinatarioTipo>(tipoDestinatarioInicial);
  const [canal, setCanal] = useState<MensagemCanalEnvio>("WHATSAPP");
  const [buscaDestinatario, setBuscaDestinatario] = useState("");
  const [destinatariosSelecionados, setDestinatariosSelecionados] = useState<MensagemDestinatario[]>(
    destinatariosTravados
  );
  const [modeloId, setModeloId] = useState("");
  const [assuntoEditado, setAssuntoEditado] = useState("");
  const [mensagemEditada, setMensagemEditada] = useState("");

  const modelosQuery = useMensagensPersonalizadasModelos({
    somenteAtivas: true,
    destinatario: tipoDestinatario,
    canal
  });
  const buscarDestinatariosMutation = useBuscarDestinatariosMensagem();
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
  }, [aberto, tipoDestinatarioInicial, canalInicial, destinatariosTravados]);

  useEffect(() => {
    if (!modeloSelecionado) return;
    setAssuntoEditado(modeloSelecionado.assunto ?? modeloSelecionado.titulo);
    setMensagemEditada(modeloSelecionado.mensagemBase);
  }, [modeloSelecionado]);

  useEffect(() => {
    if (!aberto || possuiDestinatarioFixo) return;
    const termo = buscaDestinatario.trim();
    if (termo.length < 2) return;

    const handle = window.setTimeout(() => {
      void buscarDestinatariosMutation.mutateAsync({
        tipo: tipoDestinatario,
        termo,
        somenteAtivos: true
      });
    }, 250);

    return () => window.clearTimeout(handle);
  }, [aberto, buscaDestinatario, tipoDestinatario, possuiDestinatarioFixo, buscarDestinatariosMutation]);

  useEffect(() => {
    const primeiroDestinatario = destinatariosSelecionados[0];
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

  function removerDestinatario(id: string) {
    if (possuiDestinatarioFixo) return;
    setDestinatariosSelecionados((atual) => atual.filter((item) => item.id !== id));
  }

  async function confirmarEnvio() {
    if (!modeloId) {
      onFeedback?.({ tipo: "aviso", texto: "Selecione uma mensagem antes de enviar." });
      return;
    }

    if (!destinatariosSelecionados.length) {
      onFeedback?.({ tipo: "aviso", texto: "Selecione ao menos um destinatário." });
      return;
    }

    try {
      const resultado = await enviarMutation.mutateAsync({
        modeloId,
        canal,
        destinatarioTipo: tipoDestinatario,
        destinatarioIds: destinatariosSelecionados.map((item) => item.id),
        tipoEnvio: destinatariosSelecionados.length > 1 ? "LOTE" : "INDIVIDUAL",
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
      onClose();
    } catch (error: any) {
      onFeedback?.({
        tipo: "erro",
        texto: error?.response?.data?.message ?? "Não foi possível concluir o envio da mensagem."
      });
    }
  }

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 px-4 py-6">
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Enviar mensagem</h3>
            <p className="text-sm text-[var(--g3-muted)]">
              Selecione destinatário, canal, modelo e revise a mensagem final antes do envio.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid flex-1 gap-5 overflow-y-auto p-5 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="space-y-4 xl:min-w-0">
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
                  onChange={(event) => setTipoDestinatario(event.target.value as MensagemDestinatarioTipo)}
                  disabled={possuiDestinatarioFixo}
                >
                  <option value="BENEFICIARIO">Beneficiário</option>
                  <option value="PROFISSIONAL">Profissional</option>
                  <option value="COLABORADOR">Colaborador</option>
                  <option value="VOLUNTARIO">Voluntário</option>
                  <option value="DOADOR">Doador</option>
                  <option value="INSTITUICAO">Instituição</option>
                </Select>
              </div>

              <div className="space-y-1 md:col-span-2">
                <Label>Mensagem</Label>
                <Select value={modeloId} onChange={(event) => setModeloId(event.target.value)}>
                  <option value="">Selecione</option>
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
                <Label className="text-sm font-semibold text-slate-900">Destinatários</Label>
                <span className="text-xs text-[var(--g3-muted)]">{resumoEnvio}</span>
              </div>

              {!possuiDestinatarioFixo ? (
                <>
                  <Input
                    value={buscaDestinatario}
                    onChange={(event) => setBuscaDestinatario(event.target.value)}
                    placeholder="Digite nome, documento, código ou referência"
                  />

                  <div className="max-h-36 overflow-y-auto rounded-lg border border-[var(--g3-border)] bg-white">
                    {buscarDestinatariosMutation.isPending ? (
                      <div className="flex items-center gap-2 px-3 py-3 text-sm text-[var(--g3-muted)]">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Buscando destinatários...
                      </div>
                    ) : sugestoesDestinatarios.length ? (
                      sugestoesDestinatarios.map((item) => (
                        <button
                          key={`${item.tipo}-${item.id}`}
                          type="button"
                          className="flex w-full items-center justify-between border-b border-slate-100 px-3 py-2 text-left last:border-b-0 hover:bg-[var(--g3-primary-soft)]"
                          onClick={() => adicionarDestinatario(item)}
                        >
                          <span>
                            <span className="block text-sm font-medium text-slate-900">{item.nome}</span>
                            <span className="block text-xs text-[var(--g3-muted)]">
                              {[item.detalhe, item.documento].filter(Boolean).join(" • ")}
                            </span>
                          </span>
                          <Plus className="h-4 w-4 text-[var(--g3-active)]" />
                        </button>
                      ))
                    ) : (
                      <p className="px-3 py-3 text-sm text-[var(--g3-muted)]">
                        Digite ao menos 2 caracteres para buscar.
                      </p>
                    )}
                  </div>
                </>
              ) : null}

              <div className="flex flex-wrap gap-2">
                {destinatariosSelecionados.map((item) => (
                  <span
                    key={`${item.tipo}-${item.id}`}
                    className="inline-flex items-center gap-2 rounded-full bg-[var(--g3-primary-soft)] px-3 py-1 text-xs font-medium text-[var(--g3-active)]"
                  >
                    {item.nome}
                    {!possuiDestinatarioFixo ? (
                      <button
                        type="button"
                        onClick={() => removerDestinatario(item.id)}
                        className="text-[var(--g3-muted)]"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid gap-3">
              <div className="space-y-1">
                <Label>Assunto final</Label>
                <Input value={assuntoEditado} onChange={(event) => setAssuntoEditado(event.target.value)} />
              </div>

              <div className="space-y-1">
                <Label>Mensagem final</Label>
                <Textarea
                  rows={8}
                  value={mensagemEditada}
                  onChange={(event) => setMensagemEditada(event.target.value)}
                />
              </div>
            </div>
          </section>

          <section className="space-y-4 xl:min-w-0">
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
                disabled={!modeloId || !destinatariosSelecionados.length || previewMutation.isPending}
              >
                <RefreshCcw className="mr-1.5 h-3.5 w-3.5" />
                Atualizar prévia
              </Button>

              <Button
                size="sm"
                onClick={() => void confirmarEnvio()}
                disabled={!modeloId || !destinatariosSelecionados.length || enviarMutation.isPending}
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
                    <Send className="mr-1.5 h-3.5 w-3.5" />
                    {canal === "WHATSAPP" ? "Preparar envio" : "Enviar"}
                  </>
                )}
              </Button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
