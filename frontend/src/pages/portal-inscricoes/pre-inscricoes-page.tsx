import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, ClipboardList, Clock3, Eye, FileWarning, ListChecks, Loader2, RefreshCw, Search, UserRound, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { portalInscricoesService } from "@/services/portal-inscricoes.service";

const statusLabels: Record<string, string> = {
  AGUARDANDO_ANALISE: "Aguardando análise",
  DOCUMENTACAO_PENDENTE: "Documentação pendente",
  LISTA_ESPERA: "Lista de espera",
  APROVADA: "Aprovada",
  NAO_APROVADA: "Não aprovada",
  CANCELADA: "Cancelada"
};

function mascararCpf(valor?: string) {
  const cpf = String(valor ?? "").replace(/\D/g, "");
  return cpf.length === 11 ? `${cpf.slice(0, 3)}.***.***-${cpf.slice(-2)}` : "Não informado";
}

function formatarData(valor?: string) {
  if (!valor) return "—";
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? "—" : data.toLocaleDateString("pt-BR");
}

export function PreInscricoesPage({ embutida = false }: { embutida?: boolean }) {
  const [status, setStatus] = useState("");
  const [busca, setBusca] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [selecionada, setSelecionada] = useState<any>();
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [processando, setProcessando] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setMensagem("");
    try {
      const resposta = await portalInscricoesService.adminListar(status);
      setItems(resposta.preInscricoes ?? []);
    } catch {
      setMensagem("Não foi possível carregar as pré-inscrições.");
    } finally {
      setCarregando(false);
    }
  }, [status]);

  useEffect(() => { void carregar(); }, [carregar]);

  const abrir = async (id: string) => {
    try {
      setProcessando(true);
      setSelecionada((await portalInscricoesService.adminDetalhe(id)).preInscricao);
    } catch {
      setMensagem("Não foi possível abrir os dados da pré-inscrição.");
    } finally {
      setProcessando(false);
    }
  };

  const acao = async (nome: string, motivo?: string) => {
    if (!selecionada) return;
    try {
      setProcessando(true);
      await portalInscricoesService.acao(selecionada.id, nome, motivo);
      setSelecionada(undefined);
      await carregar();
    } catch (error: any) {
      setMensagem(error?.response?.data?.message || "Não foi possível concluir a ação.");
    } finally {
      setProcessando(false);
    }
  };

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return items;
    return items.filter((item) => [item.protocolo, item.nome_completo, item.atividade].some((valor) => String(valor ?? "").toLowerCase().includes(termo)));
  }, [busca, items]);

  const indicadores = [
    { label: "Aguardando análise", status: "AGUARDANDO_ANALISE", icon: Clock3 },
    { label: "Documentação pendente", status: "DOCUMENTACAO_PENDENTE", icon: FileWarning },
    { label: "Lista de espera", status: "LISTA_ESPERA", icon: ListChecks }
  ];

  return (
    <div className="space-y-6">
      {!embutida && <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--g3-muted)]">Portal público</p>
          <h1 className="mt-1 text-2xl font-bold text-[var(--g3-foreground)]">Pré-inscrições</h1>
          <p className="mt-1 text-sm text-[var(--g3-muted)]">Analise e acompanhe as solicitações recebidas pela instituição.</p>
        </div>
        <Button variant="outline" onClick={() => void carregar()} disabled={carregando}><RefreshCw className={`mr-2 h-4 w-4 ${carregando ? "animate-spin" : ""}`} /> Atualizar</Button>
      </div>}

      <div className="grid gap-4 md:grid-cols-3">
        {indicadores.map((item) => <Card key={item.status} className="shadow-sm"><CardContent className="flex items-center gap-3 p-4"><span className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--g3-card-soft)] text-[var(--g3-active)]"><item.icon className="h-5 w-5" /></span><div><p className="text-sm text-[var(--g3-muted)]">{item.label}</p><strong className="text-2xl text-[var(--g3-foreground)]">{items.filter((registro) => registro.status === item.status).length}</strong></div></CardContent></Card>)}
      </div>

      <Card>
        <CardHeader><CardTitle>Filtros da listagem</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto] md:items-end">
          <label className="text-sm font-medium text-[var(--g3-foreground)]">Pesquisar<input value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Protocolo, nome ou atividade" className="mt-1 h-9 w-full rounded-md border border-slate-300 bg-slate-50 px-3 text-sm outline-none focus:border-[var(--g3-active)] focus:bg-white focus:ring-2 focus:ring-[var(--g3-active)]" /></label>
          <label className="text-sm font-medium text-[var(--g3-foreground)]">Situação<select value={status} onChange={(event) => setStatus(event.target.value)} className="mt-1 h-9 w-full rounded-md border border-slate-300 bg-slate-50 px-3 text-sm outline-none focus:border-[var(--g3-active)] focus:bg-white focus:ring-2 focus:ring-[var(--g3-active)]"><option value="">Todas</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <Button variant="outline" onClick={() => { setBusca(""); setStatus(""); }}><X className="mr-2 h-4 w-4" /> Limpar filtros</Button>
        </CardContent>
      </Card>

      {mensagem && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{mensagem}</div>}

      <Card>
        <CardHeader><div className="flex items-center justify-between gap-3"><CardTitle>Solicitações recebidas</CardTitle><span className="text-sm text-[var(--g3-muted)]">{filtrados.length} registro(s)</span></div></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="border-b border-[var(--g3-border)] bg-[var(--g3-card-soft)] text-xs font-semibold uppercase tracking-wide text-[var(--g3-muted)]"><tr><th className="px-4 py-3">Protocolo</th><th className="px-4 py-3">Participante</th><th className="px-4 py-3">Atividade</th><th className="px-4 py-3">Solicitação</th><th className="px-4 py-3">Situação</th><th className="px-4 py-3 text-right">Ação</th></tr></thead>
              <tbody>{carregando ? <tr><td colSpan={6} className="p-10 text-center text-[var(--g3-muted)]"><Loader2 className="mx-auto h-5 w-5 animate-spin" /><p className="mt-2">Carregando pré-inscrições...</p></td></tr> : filtrados.map((item) => <tr key={item.id} onClick={() => void abrir(item.id)} className="cursor-pointer border-b border-[var(--g3-border)] transition hover:bg-[var(--g3-card-soft)]"><td className="px-4 py-3 font-semibold text-[var(--g3-foreground)]">{item.protocolo}</td><td className="px-4 py-3"><div className="font-medium">{item.nome_completo}</div><div className="text-xs text-[var(--g3-muted)]">CPF {mascararCpf(item.cpf)}</div></td><td className="px-4 py-3">{item.atividade || "—"}</td><td className="px-4 py-3">{formatarData(item.criado_em)}</td><td className="px-4 py-3"><span className="inline-flex rounded-full bg-[var(--g3-card-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--g3-foreground)]">{statusLabels[item.status] || item.status}</span></td><td className="px-4 py-3 text-right"><Button size="sm" variant="ghost" onClick={(event) => { event.stopPropagation(); void abrir(item.id); }}><Eye className="mr-2 h-4 w-4" /> Ver</Button></td></tr>)}{!carregando && !filtrados.length && <tr><td colSpan={6} className="p-12 text-center text-[var(--g3-muted)]"><ClipboardList className="mx-auto h-8 w-8 opacity-50" /><p className="mt-2 font-medium">Nenhuma pré-inscrição encontrada.</p><p className="mt-1 text-xs">Ajuste os filtros ou aguarde novas solicitações.</p></td></tr>}</tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {selecionada && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true"><div className="max-h-[92vh] w-full max-w-3xl overflow-auto rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card)] shadow-2xl"><div className="flex items-start justify-between border-b border-[var(--g3-border)] px-6 py-5"><div><p className="text-xs font-semibold uppercase tracking-wide text-[var(--g3-muted)]">Detalhes da pré-inscrição</p><h2 className="mt-1 text-xl font-bold">{selecionada.protocolo}</h2></div><button type="button" aria-label="Fechar detalhes" onClick={() => setSelecionada(undefined)} className="rounded-md p-2 text-[var(--g3-muted)] hover:bg-[var(--g3-card-soft)]"><X className="h-5 w-5" /></button></div><div className="space-y-6 p-6"><div><h3 className="flex items-center gap-2 font-semibold"><UserRound className="h-4 w-4 text-[var(--g3-active)]" /> Participante</h3><div className="mt-3 grid gap-3 rounded-lg border border-[var(--g3-border)] p-4 text-sm md:grid-cols-2"><p><b>Nome:</b> {selecionada.nome_completo}</p><p><b>CPF:</b> {selecionada.cpf}</p><p><b>Telefone:</b> {selecionada.telefone || "Não informado"}</p><p><b>E-mail:</b> {selecionada.email || "Não informado"}</p></div></div><div><h3 className="flex items-center gap-2 font-semibold"><CalendarDays className="h-4 w-4 text-[var(--g3-active)]" /> Atividade solicitada</h3><div className="mt-3 rounded-lg border border-[var(--g3-border)] p-4 text-sm"><p><b>Atividade:</b> {selecionada.atividade}</p><p className="mt-2"><b>Solicitação:</b> {formatarData(selecionada.criado_em)}</p><p className="mt-2"><b>Situação:</b> {statusLabels[selecionada.status] || selecionada.status}</p></div></div><div><h3 className="font-semibold">Histórico</h3><div className="mt-3 space-y-2">{(selecionada.historico ?? []).map((item: any, index: number) => <div key={`${item.criado_em ?? "hist"}-${index}`} className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card-soft)] p-3 text-sm"><b>{statusLabels[item.status_novo] || item.acao}</b><span className="ml-2 text-[var(--g3-muted)]">{item.descricao || "Atualização registrada"}</span></div>)}</div></div></div><div className="flex flex-wrap gap-2 border-t border-[var(--g3-border)] px-6 py-4">{selecionada.status !== "APROVADA" && selecionada.status !== "NAO_APROVADA" && <><Button disabled={processando} onClick={() => void acao("aprovar")}><Check className="mr-2 h-4 w-4" /> Aprovar inscrição</Button><Button disabled={processando} variant="outline" onClick={() => void acao("espera")}>Lista de espera</Button><Button disabled={processando} variant="outline" onClick={() => { const motivo = window.prompt("Informe os dados ou documentos necessários:"); if (motivo) void acao("complementar", motivo); }}>Solicitar complementação</Button><Button disabled={processando} variant="destructive" onClick={() => { const motivo = window.prompt("Informe o motivo da não aprovação:"); if (motivo) void acao("rejeitar", motivo); }}>Não aprovar</Button></>}{processando && <Loader2 className="ml-auto h-5 w-5 animate-spin text-[var(--g3-active)]" />}</div></div></div>}
    </div>
  );
}
