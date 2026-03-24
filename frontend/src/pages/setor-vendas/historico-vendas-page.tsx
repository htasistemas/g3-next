import { useEffect, useMemo, useState } from "react";
import { CalendarRange, Printer, RefreshCcw, Search, ShoppingBasket, UserRound } from "lucide-react";
import { AdminPageLayout, type AdminTab } from "@/components/admin/admin-page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { vendasService } from "@/services/vendas.service";
import type { Venda } from "@/types/vendas";

const abas: AdminTab[] = [
  { id: "historico", label: "Historico de vendas", icon: ShoppingBasket }
];

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarMetodo(metodo: string) {
  if (metodo === "DEBITO") return "Debito";
  if (metodo === "CREDITO") return "Credito";
  if (metodo === "DINHEIRO") return "Dinheiro";
  return "Pix";
}

export function HistoricoVendasPage() {
  const [abaAtiva, setAbaAtiva] = useState("historico");
  const [clienteNome, setClienteNome] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("");
  const [dataInicial, setDataInicial] = useState("");
  const [dataFinal, setDataFinal] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [vendaSelecionada, setVendaSelecionada] = useState<Venda | null>(null);

  async function carregar() {
    setCarregando(true);
    try {
      const resposta = await vendasService.listar({
        cliente_nome: clienteNome || undefined,
        forma_pagamento: formaPagamento || undefined,
        data_inicial: dataInicial || undefined,
        data_final: dataFinal || undefined,
        limite: 50
      });
      setVendas(resposta.vendas);
      setVendaSelecionada((atual) => resposta.vendas.find((item) => item.id === atual?.id) ?? resposta.vendas[0] ?? null);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    void carregar();
  }, []);

  const resumo = useMemo(() => {
    const total = vendas.reduce((acc, item) => acc + item.valorTotal, 0);
    const quantidade = vendas.length;
    const ticketMedio = quantidade ? total / quantidade : 0;
    return { total, quantidade, ticketMedio };
  }, [vendas]);

  function imprimirVenda(venda: Venda | null) {
    if (!venda) return;
    const popup = window.open("", "_blank", "width=420,height=720");
    if (!popup) return;
    const linhas = venda.itens
      .map((item) => `<tr><td>${item.descricaoItem}</td><td style="text-align:center">${item.quantidade}</td><td style="text-align:right">${formatarMoeda(item.valorTotal)}</td></tr>`)
      .join("");
    popup.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Notinha de venda</title><style>body{font-family:monospace;padding:24px;color:#111827}table{width:100%;border-collapse:collapse;margin-top:16px}td,th{padding:6px 0;border-bottom:1px dashed #cbd5e1;font-size:12px}.total{margin-top:16px;padding-top:12px;border-top:2px solid #111827;font-size:18px;font-weight:700;text-align:right}</style></head><body><h1>Instituicao - setor vendas</h1><p>Comprovante simples de venda</p><p>${new Date(venda.criadoEm).toLocaleString("pt-BR")}</p><table><thead><tr><th>Produto</th><th>Qtd</th><th style="text-align:right">Total</th></tr></thead><tbody>${linhas}</tbody></table><p class="total">Total: ${formatarMoeda(venda.valorTotal)}</p><p>Pagamento: ${formatarMetodo(venda.formaPagamento)}</p><p>Cliente: ${venda.clienteNome || "Consumidor final"}</p><p>Documento sem valor fiscal</p><script>window.onload = () => window.print();</script></body></html>`);
    popup.document.close();
  }

  return (
    <AdminPageLayout
      tabs={abas}
      activeTab={abaAtiva}
      onChangeTab={setAbaAtiva}
      sectionLabel="Setor vendas"
      pageTitle="Historico de vendas"
      activeTitle="Historico de vendas"
      actions={[{ label: "Atualizar", icon: RefreshCcw, onClick: () => void carregar(), variant: "outline" }]}
    >
      <section className="space-y-4">
        <div className="grid gap-3 xl:grid-cols-4">
          <Card><CardContent className="p-4"><p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--g3-muted)]">Total vendido</p><p className="mt-2 text-2xl font-black text-[var(--g3-foreground)]">{formatarMoeda(resumo.total)}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--g3-muted)]">Vendas</p><p className="mt-2 text-2xl font-black text-[var(--g3-foreground)]">{resumo.quantidade}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--g3-muted)]">Ticket medio</p><p className="mt-2 text-2xl font-black text-[var(--g3-foreground)]">{formatarMoeda(resumo.ticketMedio)}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--g3-muted)]">Ultima atualizacao</p><p className="mt-2 text-sm font-semibold text-[var(--g3-foreground)]">{new Date().toLocaleString("pt-BR")}</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Filtros</CardTitle></CardHeader>
          <CardContent className="grid gap-3 xl:grid-cols-[1.3fr_0.8fr_0.7fr_0.7fr_auto]">
            <div className="space-y-1"><label className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--g3-muted)]">Cliente</label><div className="relative"><UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--g3-muted)]" /><Input value={clienteNome} onChange={(event) => setClienteNome(event.target.value)} className="pl-9" placeholder="Nome do cliente" /></div></div>
            <div className="space-y-1"><label className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--g3-muted)]">Pagamento</label><select value={formaPagamento} onChange={(event) => setFormaPagamento(event.target.value)} className="h-9 w-full rounded-md border border-[var(--g3-border)] bg-[var(--g3-card)] px-3 text-sm"><option value="">Todos</option><option value="DINHEIRO">Dinheiro</option><option value="DEBITO">Debito</option><option value="CREDITO">Credito</option><option value="PIX">Pix</option></select></div>
            <div className="space-y-1"><label className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--g3-muted)]">Data inicial</label><div className="relative"><CalendarRange className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--g3-muted)]" /><Input type="date" value={dataInicial} onChange={(event) => setDataInicial(event.target.value)} className="pl-9" /></div></div>
            <div className="space-y-1"><label className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--g3-muted)]">Data final</label><div className="relative"><CalendarRange className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--g3-muted)]" /><Input type="date" value={dataFinal} onChange={(event) => setDataFinal(event.target.value)} className="pl-9" /></div></div>
            <div className="flex items-end"><Button onClick={() => void carregar()} className="w-full xl:w-auto"><Search className="mr-1.5 h-4 w-4" />Filtrar</Button></div>
          </CardContent>
        </Card>

        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader><CardTitle>Lista de vendas</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {carregando ? <div className="rounded-xl border border-dashed border-[var(--g3-border)] bg-[var(--g3-card-soft)] px-4 py-6 text-center text-sm text-[var(--g3-muted)]">Carregando vendas...</div> : vendas.length ? vendas.map((venda) => (
                <button key={venda.id} type="button" onClick={() => setVendaSelecionada(venda)} className={`w-full rounded-xl border px-4 py-3 text-left transition ${vendaSelecionada?.id === venda.id ? "border-[var(--g3-active)] bg-[var(--g3-primary-soft)]" : "border-[var(--g3-border)] bg-[var(--g3-card)] hover:bg-[var(--g3-card-soft)]"}`}>
                  <div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-[var(--g3-foreground)]">Venda #{venda.id}</p><p className="text-sm text-[var(--g3-muted)]">{venda.clienteNome || "Consumidor final"}</p><p className="text-sm text-[var(--g3-muted)]">{new Date(venda.criadoEm).toLocaleString("pt-BR")}</p></div><div className="text-right"><p className="text-sm font-semibold text-[var(--g3-muted)]">{formatarMetodo(venda.formaPagamento)}</p><p className="text-lg font-black text-[var(--g3-foreground)]">{formatarMoeda(venda.valorTotal)}</p></div></div>
                </button>
              )) : <div className="rounded-xl border border-dashed border-[var(--g3-border)] bg-[var(--g3-card-soft)] px-4 py-6 text-center text-sm text-[var(--g3-muted)]">Nenhuma venda encontrada para os filtros informados.</div>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between"><CardTitle>Detalhes da venda</CardTitle><Button variant="outline" disabled={!vendaSelecionada} onClick={() => imprimirVenda(vendaSelecionada)}><Printer className="mr-1.5 h-4 w-4" />Imprimir notinha</Button></CardHeader>
            <CardContent className="space-y-4">
              {vendaSelecionada ? <>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card-soft)] px-4 py-3"><p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--g3-muted)]">Cliente</p><p className="mt-1 font-semibold text-[var(--g3-foreground)]">{vendaSelecionada.clienteNome || "Consumidor final"}</p></div>
                  <div className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card-soft)] px-4 py-3"><p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--g3-muted)]">Documento</p><p className="mt-1 font-semibold text-[var(--g3-foreground)]">{vendaSelecionada.clienteDocumento || "---"}</p></div>
                  <div className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card-soft)] px-4 py-3"><p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--g3-muted)]">Pagamento</p><p className="mt-1 font-semibold text-[var(--g3-foreground)]">{formatarMetodo(vendaSelecionada.formaPagamento)}</p></div>
                  <div className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card-soft)] px-4 py-3"><p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--g3-muted)]">Total</p><p className="mt-1 text-xl font-black text-[var(--g3-foreground)]">{formatarMoeda(vendaSelecionada.valorTotal)}</p></div>
                </div>
                <div className="rounded-xl border border-[var(--g3-border)]"><div className="border-b border-[var(--g3-border)] bg-[var(--g3-primary-soft)] px-4 py-3"><p className="text-sm font-semibold text-[var(--g3-active)]">Itens da venda</p></div><div className="overflow-auto"><table className="min-w-full"><thead className="text-left text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--g3-muted)]"><tr><th className="px-4 py-3">Codigo</th><th className="px-4 py-3">Produto</th><th className="px-4 py-3 text-right">Qtd</th><th className="px-4 py-3 text-right">Unitario</th><th className="px-4 py-3 text-right">Total</th></tr></thead><tbody className="divide-y divide-[var(--g3-border)]">{vendaSelecionada.itens.map((item) => <tr key={item.id}><td className="px-4 py-3 text-sm text-[var(--g3-muted)]">{item.codigoItem}</td><td className="px-4 py-3 font-semibold text-[var(--g3-foreground)]">{item.descricaoItem}</td><td className="px-4 py-3 text-right">{item.quantidade}</td><td className="px-4 py-3 text-right">{formatarMoeda(item.valorUnitario)}</td><td className="px-4 py-3 text-right font-black">{formatarMoeda(item.valorTotal)}</td></tr>)}</tbody></table></div></div>
              </> : <div className="rounded-xl border border-dashed border-[var(--g3-border)] bg-[var(--g3-card-soft)] px-4 py-8 text-center text-sm text-[var(--g3-muted)]">Selecione uma venda para visualizar os detalhes.</div>}
            </CardContent>
          </Card>
        </div>
      </section>
    </AdminPageLayout>
  );
}
