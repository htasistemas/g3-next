import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  CreditCard,
  HelpCircle,
  MonitorCog,
  Printer,
  QrCode,
  ReceiptText,
  ScanBarcode,
  ShoppingBasket,
  Store,
  Trash2,
  UserRound,
  Wallet
} from "lucide-react";
import { useItensAlmoxarifado } from "@/features/almoxarifado/use-almoxarifado";
import { useUnidadeAssistencialAtual } from "@/features/unidades-assistenciais/use-unidades-assistenciais";
import { resolverUrlArquivo } from "@/lib/arquivos";
import { vendasService } from "@/services/vendas.service";
import type { ItemAlmoxarifado } from "@/types/almoxarifado";
import type { Venda } from "@/types/vendas";

type MetodoPagamento = "DINHEIRO" | "DEBITO" | "CREDITO" | "PIX";

type ItemVenda = {
  key: string;
  codigo: string;
  nome: string;
  preco: number;
  quantidade: number;
  estoqueDisponivel: number;
};

const metodosPagamento: Array<{
  id: MetodoPagamento;
  label: string;
  icon: typeof Wallet;
  className: string;
}> = [
  { id: "DINHEIRO", label: "Dinheiro", icon: Wallet, className: "border-[var(--g3-warning)]/35 bg-[color:color-mix(in_srgb,var(--g3-warning)_14%,white)] text-[var(--g3-foreground)]" },
  { id: "DEBITO", label: "Debito", icon: CreditCard, className: "border-[var(--g3-info)]/35 bg-[color:color-mix(in_srgb,var(--g3-info)_14%,white)] text-[var(--g3-foreground)]" },
  { id: "CREDITO", label: "Credito", icon: CreditCard, className: "border-[var(--g3-primary)]/35 bg-[color:color-mix(in_srgb,var(--g3-primary)_12%,white)] text-[var(--g3-foreground)]" },
  { id: "PIX", label: "Pix", icon: QrCode, className: "border-[var(--g3-success)]/35 bg-[color:color-mix(in_srgb,var(--g3-success)_14%,white)] text-[var(--g3-foreground)]" }
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

function textoBuscaItem(item: ItemAlmoxarifado) {
  return `${item.codigo} ${item.codigo_barras ?? ""} ${item.descricao}`.toLowerCase();
}

export function FrenteCaixaPage() {
  const [agora, setAgora] = useState(() => new Date());
  const [busca, setBusca] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const [clienteNome, setClienteNome] = useState("");
  const [clienteDocumento, setClienteDocumento] = useState("");
  const [itensVenda, setItensVenda] = useState<ItemVenda[]>([]);
  const [status, setStatus] = useState("Caixa livre");
  const [ajudaAberta, setAjudaAberta] = useState(false);
  const [pagamentoAberto, setPagamentoAberto] = useState(false);
  const [cancelamentoAberto, setCancelamentoAberto] = useState(false);
  const [linhaCancelamento, setLinhaCancelamento] = useState("");
  const [vendaFinalizada, setVendaFinalizada] = useState<Venda | null>(null);
  const [historico, setHistorico] = useState<Venda[]>([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);
  const [salvandoVenda, setSalvandoVenda] = useState(false);
  const buscaRef = useRef<HTMLInputElement | null>(null);
  const qtdRef = useRef<HTMLInputElement | null>(null);

  const itensQuery = useItensAlmoxarifado();
  const { data: unidadeAtualData } = useUnidadeAssistencialAtual();
  const catalogo = itensQuery.data?.itens ?? [];
  const logomarcaInstituicao = unidadeAtualData?.unidade?.logomarca?.trim();
  const nomeInstituicao = unidadeAtualData?.unidade?.nome_fantasia?.trim() || "Instituicao";

  useEffect(() => {
    const timer = window.setInterval(() => setAgora(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    void carregarHistorico();
  }, []);

  async function carregarHistorico() {
    setCarregandoHistorico(true);
    try {
      const resposta = await vendasService.listar({ limite: 8 });
      setHistorico(resposta.vendas);
    } catch {
      setHistorico([]);
    } finally {
      setCarregandoHistorico(false);
    }
  }

  const itensDisponiveis = useMemo(
    () =>
      catalogo.filter(
        (item) => item.situacao?.toLowerCase() === "ativo" && Number(item.estoque_atual || 0) > 0 && !item.is_kit
      ),
    [catalogo]
  );

  const sugestoes = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return [];
    return itensDisponiveis.filter((item) => textoBuscaItem(item).includes(termo)).slice(0, 6);
  }, [busca, itensDisponiveis]);

  const itemAtual = sugestoes[0] ?? null;
  const quantidadeNumero = Number(quantidade.replace(",", "."));
  const quantidadeValida = Number.isFinite(quantidadeNumero) && quantidadeNumero > 0 ? quantidadeNumero : 1;
  const subtotal = itensVenda.reduce((acc, item) => acc + item.preco * item.quantidade, 0);
  const totalItens = itensVenda.reduce((acc, item) => acc + item.quantidade, 0);

  function quantidadeNoCarrinho(codigo: string) {
    return itensVenda.filter((item) => item.codigo === codigo).reduce((acc, item) => acc + item.quantidade, 0);
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "F1") {
        event.preventDefault();
        setAjudaAberta(true);
      }
      if (event.key === "F2") {
        event.preventDefault();
        buscaRef.current?.focus();
      }
      if (event.key === "F3") {
        event.preventDefault();
        qtdRef.current?.focus();
      }
      if (event.key === "F8") {
        event.preventDefault();
        if (itensVenda.length) setPagamentoAberto(true);
      }
      if (event.key === "F11") {
        event.preventDefault();
        if (itensVenda.length) setCancelamentoAberto(true);
      }
      if (event.key === "Escape") {
        setAjudaAberta(false);
        setPagamentoAberto(false);
        setCancelamentoAberto(false);
      }
      if (event.key === "Enter" && document.activeElement === buscaRef.current) {
        event.preventDefault();
        adicionarItem();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [itensVenda.length]);

  function adicionarItem(item = itemAtual) {
    if (!item) {
      setStatus("Produto nao encontrado");
      return;
    }

    const reservado = quantidadeNoCarrinho(item.codigo);
    const disponivel = Number(item.estoque_atual || 0) - reservado;
    if (quantidadeValida > disponivel) {
      setStatus(`Estoque insuficiente para ${item.descricao}`);
      return;
    }

    setItensVenda((atual) => [
      ...atual,
      {
        key: `${Date.now()}-${item.codigo}`,
        codigo: item.codigo,
        nome: item.descricao,
        preco: Number(item.valor_unitario || 0),
        quantidade: quantidadeValida,
        estoqueDisponivel: Number(item.estoque_atual || 0)
      }
    ]);
    setBusca("");
    setQuantidade("1");
    setStatus(`Item adicionado: ${item.descricao}`);
    buscaRef.current?.focus();
  }

  function cancelarItem() {
    const indice = Number(linhaCancelamento) - 1;
    if (!Number.isInteger(indice) || indice < 0 || indice >= itensVenda.length) {
      setStatus("Informe um item valido para cancelar");
      return;
    }
    setItensVenda((atual) => atual.filter((_, posicao) => posicao !== indice));
    setLinhaCancelamento("");
    setCancelamentoAberto(false);
    setStatus(`Item ${indice + 1} cancelado`);
  }

  function imprimirNotinha(venda = vendaFinalizada) {
    if (!venda) return;

    const popup = window.open("", "_blank", "width=420,height=720");
    if (!popup) {
      setStatus("Nao foi possivel abrir a impressao da notinha");
      return;
    }

    const linhas = venda.itens
      .map(
        (item) => `<tr><td>${item.descricaoItem}</td><td style="text-align:center">${item.quantidade}</td><td style="text-align:right">${formatarMoeda(item.valorTotal)}</td></tr>`
      )
      .join("");

    popup.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Notinha de venda</title><style>body{font-family:monospace;padding:24px;color:#111827}h1,p{margin:0}table{width:100%;border-collapse:collapse;margin-top:16px}td,th{padding:6px 0;border-bottom:1px dashed #cbd5e1;font-size:12px}th{text-align:left}.topo,.rodape{text-align:center}.total{margin-top:16px;padding-top:12px;border-top:2px solid #111827;font-size:18px;font-weight:700;text-align:right}</style></head><body><div class="topo"><h1>Instituicao - frente de caixa</h1><p>Comprovante simples de venda</p><p>${new Date(venda.criadoEm).toLocaleString("pt-BR")}</p></div><table><thead><tr><th>Produto</th><th>Qtd</th><th style="text-align:right">Total</th></tr></thead><tbody>${linhas}</tbody></table><p class="total">Total: ${formatarMoeda(venda.valorTotal)}</p><p>Pagamento: ${formatarMetodo(venda.formaPagamento)}</p><p>Cliente: ${venda.clienteNome || "Consumidor final"}</p><div class="rodape"><p>Documento sem valor fiscal</p><p>Obrigado pela compra</p></div><script>window.onload = () => window.print();</script></body></html>`);
    popup.document.close();
  }

  async function concluirVenda(metodo: MetodoPagamento) {
    setSalvandoVenda(true);
    try {
      const venda = await vendasService.criar({
        cliente_nome: clienteNome.trim() || undefined,
        cliente_documento: clienteDocumento.trim() || undefined,
        forma_pagamento: metodo,
        observacoes: "Venda registrada pela frente de caixa",
        itens: itensVenda.map((item) => ({
          codigo_item: item.codigo,
          descricao_item: item.nome,
          quantidade: item.quantidade,
          valor_unitario: item.preco
        }))
      });

      setVendaFinalizada(venda);
      setItensVenda([]);
      setPagamentoAberto(false);
      setStatus(`Venda concluida em ${formatarMetodo(metodo).toLowerCase()}`);
      setClienteNome("");
      setClienteDocumento("");
      await itensQuery.refetch();
      await carregarHistorico();
      buscaRef.current?.focus();
    } catch (error: any) {
      setStatus(error?.response?.data?.message ?? "Nao foi possivel concluir a venda");
    } finally {
      setSalvandoVenda(false);
    }
  }

  return (
    <main className="h-screen overflow-hidden bg-[radial-gradient(circle_at_top,var(--g3-primary-soft)_0%,var(--g3-bg)_62%,var(--g3-card-soft)_100%)] text-[var(--g3-foreground)]">
      <div className="mx-auto flex h-screen max-w-[1920px] flex-col gap-4 px-4 py-4 lg:px-5">
        <header className="grid shrink-0 gap-4 rounded-[28px] border border-[color:color-mix(in_srgb,var(--g3-primary)_40%,white)] bg-[linear-gradient(135deg,var(--g3-primary)_0%,var(--g3-primary-hover)_68%,var(--g3-sidebar-bg-alt)_100%)] px-5 py-4 text-white shadow-[0_28px_60px_rgba(0,0,0,0.16)] lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15"><Store className="h-6 w-6" /></div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/80">Frente de caixa</p>
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Frente de caixa</h1>
              <p className="text-sm text-white/80">{status}</p>
            </div>
          </div>
          <div className="flex justify-center">
            <div className="flex h-16 min-w-[160px] items-center justify-center rounded-[24px] border border-white/15 bg-white/10 px-5 py-3 backdrop-blur-sm">
              {logomarcaInstituicao ? (
                <img
                  src={resolverUrlArquivo(logomarcaInstituicao)}
                  alt={`Logomarca da instituicao ${nomeInstituicao}`}
                  className="max-h-10 w-auto max-w-[200px] object-contain"
                />
              ) : (
                <p className="text-center text-xs font-bold uppercase tracking-[0.22em] text-white/85">{nomeInstituicao}</p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-start gap-2 lg:justify-end">
            <button type="button" onClick={() => setAjudaAberta(true)} className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/15"><HelpCircle className="mr-2 inline h-4 w-4" />Ajuda</button>
            <Link to="/setor-vendas/carteira-digital-evento" className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold text-white"><QrCode className="mr-2 inline h-4 w-4" />Carteira do evento</Link>
            <Link to="/dashboard/visao-geral" className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-[var(--g3-primary)]"><MonitorCog className="mr-2 inline h-4 w-4" />Voltar ao sistema</Link>
          </div>
        </header>

        <section className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[0.92fr_1.28fr]">
          <div className="flex min-h-0 flex-col gap-4 overflow-hidden">
            <div className="shrink-0 rounded-[28px] border border-[var(--g3-border)] bg-[var(--g3-card)] p-5 shadow-sm">
              <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-[var(--g3-muted)]">Codigo de barras ou nome <span className="ml-2 rounded-md border border-[var(--g3-border)] bg-[var(--g3-primary-soft)] px-2 py-0.5 text-[10px] text-[var(--g3-active)]">F2</span></label>
              <div className="relative">
                <ScanBarcode className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--g3-muted)]" />
                <input ref={buscaRef} value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Ler codigo ou pesquisar produto" className="h-16 w-full rounded-2xl border-2 border-[var(--g3-border)] bg-[var(--g3-card-soft)] pl-12 pr-4 text-xl font-bold text-[var(--g3-foreground)] outline-none transition focus:border-[var(--g3-primary)] focus:bg-[var(--g3-card)] focus:ring-4 focus:ring-[color:color-mix(in_srgb,var(--g3-primary)_18%,transparent)]" />
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_160px]">
                <div className="rounded-2xl border border-[var(--g3-border)] bg-[var(--g3-card-soft)] px-4 py-3"><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--g3-muted)]">Valor unitario</p><p className="mt-1 text-2xl font-black">{itemAtual ? formatarMoeda(Number(itemAtual.valor_unitario || 0)) : "R$ 0,00"}</p></div>
                <div className="rounded-2xl border border-[var(--g3-border)] bg-[var(--g3-card)] px-4 py-3"><label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--g3-muted)]">Quantidade <span className="ml-2 rounded-md border border-[var(--g3-border)] bg-[var(--g3-primary-soft)] px-2 py-0.5 text-[10px] text-[var(--g3-active)]">F3</span></label><input ref={qtdRef} value={quantidade} onChange={(event) => setQuantidade(event.target.value)} className="w-full rounded-xl border-2 border-[var(--g3-border)] px-3 py-2 text-center text-2xl font-black outline-none focus:border-[var(--g3-primary)] focus:ring-4 focus:ring-[color:color-mix(in_srgb,var(--g3-primary)_18%,transparent)]" /></div>
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                <div className="rounded-2xl border border-[var(--g3-border)] bg-[var(--g3-card)] px-4 py-3"><label className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--g3-muted)]"><UserRound className="h-4 w-4" />Cliente opcional</label><input value={clienteNome} onChange={(event) => setClienteNome(event.target.value)} placeholder="Nome do cliente" className="w-full rounded-xl border border-[var(--g3-border)] px-3 py-2 text-sm outline-none focus:border-[var(--g3-primary)]" /></div>
                <div className="rounded-2xl border border-[var(--g3-border)] bg-[var(--g3-card)] px-4 py-3"><label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--g3-muted)]">Documento opcional</label><input value={clienteDocumento} onChange={(event) => setClienteDocumento(event.target.value)} placeholder="CPF, CNPJ ou identificacao" className="w-full rounded-xl border border-[var(--g3-border)] px-3 py-2 text-sm outline-none focus:border-[var(--g3-primary)]" /></div>
              </div>
              <div className="mt-3 rounded-2xl border border-[color:color-mix(in_srgb,var(--g3-primary)_32%,white)] bg-[var(--g3-primary-soft)] px-4 py-4"><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--g3-active)]">Total do item</p><p className="mt-1 text-4xl font-black text-[var(--g3-active)]">{itemAtual ? formatarMoeda(Number(itemAtual.valor_unitario || 0) * quantidadeValida) : "R$ 0,00"}</p></div>
            </div>
            <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
              <div className="flex min-h-0 flex-col overflow-hidden rounded-[28px] border border-[var(--g3-border)] bg-[var(--g3-card)] p-2.5 shadow-sm">
                <p className="mb-2 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--g3-muted)]">Funcoes</p>
                <div className="grid flex-1 auto-rows-max grid-cols-2 content-start gap-1.5 overflow-y-auto pr-1">
                  <button type="button" onClick={() => setAjudaAberta(true)} className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-primary-soft)] px-2.5 py-2 text-left"><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[var(--g3-active)]">F1</p><p className="mt-0.5 text-[13px] font-semibold leading-tight">Ajuda</p></button>
                  <button type="button" onClick={() => buscaRef.current?.focus()} className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-primary-soft)] px-2.5 py-2 text-left"><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[var(--g3-active)]">F2</p><p className="mt-0.5 text-[13px] font-semibold leading-tight">Buscar</p></button>
                  <button type="button" onClick={() => qtdRef.current?.focus()} className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-primary-soft)] px-2.5 py-2 text-left"><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[var(--g3-active)]">F3</p><p className="mt-0.5 text-[13px] font-semibold leading-tight">Qtd</p></button>
                  <button type="button" onClick={() => adicionarItem()} className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-primary-soft)] px-2.5 py-2 text-left"><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[var(--g3-active)]">Enter</p><p className="mt-0.5 text-[13px] font-semibold leading-tight">Adicionar</p></button>
                  <button type="button" onClick={() => itensVenda.length && setPagamentoAberto(true)} className="col-span-2 rounded-xl border border-[color:color-mix(in_srgb,var(--g3-success)_32%,white)] bg-[color:color-mix(in_srgb,var(--g3-success)_14%,white)] px-2.5 py-2 text-left"><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[var(--g3-success)]">F8</p><p className="mt-0.5 text-[13px] font-semibold leading-tight">Pagamento</p></button>
                  <button type="button" onClick={() => itensVenda.length && setCancelamentoAberto(true)} className="col-span-2 rounded-xl border border-[color:color-mix(in_srgb,var(--g3-danger)_28%,white)] bg-[color:color-mix(in_srgb,var(--g3-danger)_10%,white)] px-2.5 py-2 text-left"><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[var(--g3-danger)]">F11</p><p className="mt-0.5 text-[13px] font-semibold leading-tight">Cancelar item</p></button>
                </div>
              </div>
              <div className="flex min-h-0 flex-col overflow-hidden rounded-[28px] border border-[var(--g3-border)] bg-[var(--g3-card)] p-5 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--g3-muted)]">Sugestoes rapidas</p>
                <div className="mt-4 flex-1 space-y-2 overflow-auto pr-1">
                  {itensQuery.isLoading ? <div className="rounded-2xl border border-dashed border-[var(--g3-border)] bg-[var(--g3-card-soft)] px-4 py-6 text-center text-sm text-[var(--g3-muted)]">Carregando produtos do almoxarifado...</div> : sugestoes.length ? sugestoes.map((item) => (
                    <button key={item.id_item ?? item.codigo} type="button" onClick={() => adicionarItem(item)} className="flex w-full items-center justify-between rounded-2xl border border-[var(--g3-border)] px-4 py-3 text-left hover:border-[var(--g3-primary)]/35 hover:bg-[var(--g3-card-soft)]">
                      <span><span className="block font-semibold">{item.descricao}</span><span className="text-sm text-[var(--g3-muted)]">Codigo {item.codigo} - estoque {item.estoque_atual}</span></span>
                      <span className="font-black text-[var(--g3-active)]">{formatarMoeda(Number(item.valor_unitario || 0))}</span>
                    </button>
                  )) : <div className="rounded-2xl border border-dashed border-[var(--g3-border)] bg-[var(--g3-card-soft)] px-4 py-6 text-center text-sm text-[var(--g3-muted)]">Pesquise um produto real do almoxarifado para montar a venda.</div>}
                </div>
              </div>
            </div>
          </div>

          <div className="grid min-h-0 gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
            <div className="overflow-hidden rounded-[28px] border border-[var(--g3-border)] bg-[var(--g3-card)] shadow-sm">
              <div className="flex items-center justify-between border-b border-[var(--g3-border)] bg-[var(--g3-primary-soft)] px-5 py-4"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--g3-active)]">Lista de itens</p><h3 className="mt-1 text-lg font-black">Venda atual</h3></div><div className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card)] px-3 py-2 text-sm font-bold">{totalItens} item(ns)</div></div>
              <div className="h-full overflow-auto px-2 pb-2 pt-1">{itensVenda.length ? <table className="min-w-full"><thead className="sticky top-0 bg-[var(--g3-card)] text-left text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--g3-muted)]"><tr><th className="px-3 py-3">#</th><th className="px-3 py-3">Produto</th><th className="px-3 py-3 text-right">Qtd</th><th className="px-3 py-3 text-right">Total</th></tr></thead><tbody className="divide-y divide-[var(--g3-border)]">{itensVenda.map((item, index) => <tr key={item.key}><td className="px-3 py-3 font-bold text-[var(--g3-muted)]">{index + 1}</td><td className="px-3 py-3"><p className="font-semibold">{item.nome}</p><p className="text-sm text-[var(--g3-muted)]">Codigo {item.codigo} - estoque {item.estoqueDisponivel}</p></td><td className="px-3 py-3 text-right font-semibold">{item.quantidade}</td><td className="px-3 py-3 text-right font-black">{formatarMoeda(item.preco * item.quantidade)}</td></tr>)}</tbody></table> : <div className="flex h-full min-h-[460px] flex-col items-center justify-center text-center text-[var(--g3-muted)]"><ShoppingBasket className="h-16 w-16 opacity-30" /><p className="mt-4 text-xl font-black text-[var(--g3-foreground)]">Cupom vazio</p><p className="mt-1 text-sm">Aguardando leitura ou selecao de produto.</p></div>}</div>
            </div>
            <aside className="overflow-hidden rounded-[28px] border border-[color:color-mix(in_srgb,var(--g3-primary)_42%,white)] bg-[linear-gradient(180deg,var(--g3-primary)_0%,var(--g3-primary-hover)_58%,var(--g3-sidebar-bg-alt)_100%)] p-5 text-white shadow-[0_22px_55px_rgba(0,0,0,0.18)]">
              <div className="flex h-full flex-col overflow-hidden"><div className="text-center"><div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-4 border-white/15 bg-white/10"><Store className="h-12 w-12" /></div><h3 className="mt-4 text-lg font-black uppercase">Caixa aberto</h3><p className="mt-1 text-sm text-white/80">Integrado ao almoxarifado</p></div><div className="mt-6 rounded-[24px] border border-white/15 bg-white/10 px-4 py-5"><p className="text-sm font-bold uppercase tracking-[0.18em] text-white/80">Subtotal</p><p className="mt-2 break-words text-4xl font-black">{formatarMoeda(subtotal)}</p></div>{vendaFinalizada ? <button type="button" onClick={() => imprimirNotinha()} className="mt-4 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-bold uppercase tracking-[0.08em] text-white"><Printer className="mr-2 inline h-4 w-4" />Imprimir notinha</button> : null}<div className="mt-4 min-h-0 flex-1 overflow-hidden rounded-[24px] border border-white/15 bg-white/10 px-3 py-3"><p className="text-xs font-bold uppercase tracking-[0.16em] text-white/75">Historico recente</p><div className="mt-3 space-y-2 overflow-auto pr-1">{carregandoHistorico ? <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-4 text-sm text-white/75">Carregando vendas...</div> : historico.length ? historico.map((venda) => <div key={venda.id} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-sm"><p className="font-semibold">Venda #{venda.id}</p><p className="text-white/75">{venda.clienteNome || "Consumidor final"}</p><p className="text-white/75">{formatarMetodo(venda.formaPagamento)} - {formatarMoeda(venda.valorTotal)}</p></div>) : <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-4 text-sm text-white/75">Sem vendas registradas.</div>}</div></div><button type="button" onClick={() => itensVenda.length && setPagamentoAberto(true)} className="mt-4 rounded-2xl bg-white px-4 py-4 text-base font-black uppercase tracking-[0.08em] text-[var(--g3-primary)] disabled:opacity-70">Pagamento [F8]</button></div>
            </aside>
          </div>
        </section>
      </div>
      {(ajudaAberta || cancelamentoAberto || pagamentoAberto) && <div className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm" />}

      {ajudaAberta && <div className="fixed inset-0 z-50 flex items-center justify-center px-4"><div className="w-full max-w-xl rounded-[28px] border border-[var(--g3-border)] bg-[var(--g3-card)] p-6 shadow-2xl"><h3 className="text-xl font-black">Atalhos do caixa</h3><div className="mt-4 grid gap-3 sm:grid-cols-2">{[["F1","Ajuda"],["F2","Busca"],["F3","Quantidade"],["Enter","Adicionar item"],["F8","Pagamento"],["F11","Cancelar item"],["Esc","Fechar modal"]].map(([tecla, acao]) => <div key={tecla} className="rounded-2xl border border-[var(--g3-border)] bg-[var(--g3-card-soft)] px-4 py-3"><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--g3-active)]">{tecla}</p><p className="mt-1 font-semibold">{acao}</p></div>)}</div><button type="button" onClick={() => setAjudaAberta(false)} className="mt-6 w-full rounded-2xl border border-[var(--g3-border)] bg-[var(--g3-card-soft)] px-4 py-3 text-sm font-bold">Fechar</button></div></div>}

      {cancelamentoAberto && <div className="fixed inset-0 z-50 flex items-center justify-center px-4"><div className="w-full max-w-md rounded-[28px] border border-[var(--g3-border)] bg-[var(--g3-card)] p-6 shadow-2xl"><h3 className="text-xl font-black">Cancelar item</h3><p className="mt-1 text-sm text-[var(--g3-muted)]">Informe o numero da linha para remover da venda.</p><input value={linhaCancelamento} onChange={(event) => setLinhaCancelamento(event.target.value)} placeholder="Ex: 1" className="mt-5 w-full rounded-2xl border-2 border-[var(--g3-border)] px-4 py-3 text-xl font-black outline-none focus:border-[var(--g3-danger)] focus:ring-4 focus:ring-[color:color-mix(in_srgb,var(--g3-danger)_18%,transparent)]" /><div className="mt-6 flex gap-3"><button type="button" onClick={() => setCancelamentoAberto(false)} className="flex-1 rounded-2xl border border-[var(--g3-border)] px-4 py-3 text-sm font-bold">Voltar</button><button type="button" onClick={cancelarItem} className="flex-1 rounded-2xl bg-[var(--g3-danger)] px-4 py-3 text-sm font-bold text-white"><Trash2 className="mr-2 inline h-4 w-4" />Confirmar</button></div></div></div>}

      {pagamentoAberto && <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6"><div className="grid h-full max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-[32px] border border-[var(--g3-border)] bg-[var(--g3-card)] shadow-2xl lg:grid-cols-[1.25fr_0.9fr]"><section className="border-b border-[var(--g3-border)] p-6 lg:border-b-0 lg:border-r"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--g3-active)]">Pagamento</p><h3 className="mt-1 text-2xl font-black">Escolha a forma de recebimento</h3></div><button type="button" onClick={() => setPagamentoAberto(false)} className="rounded-2xl border border-[var(--g3-border)] px-4 py-2 text-sm font-semibold">Fechar</button></div><div className="mt-5 grid gap-3 md:grid-cols-2">{metodosPagamento.map((item) => <button key={item.id} type="button" disabled={salvandoVenda} onClick={() => void concluirVenda(item.id)} className={`rounded-[24px] border px-4 py-4 text-left ${item.className} disabled:cursor-wait disabled:opacity-70`}><item.icon className="h-5 w-5" /><p className="mt-3 text-lg font-black">{item.label}</p><p className="mt-1 text-sm">{salvandoVenda ? "Processando..." : `Receber ${formatarMoeda(subtotal)}`}</p></button>)}</div><div className="mt-5 rounded-[24px] border border-[var(--g3-border)] bg-[var(--g3-primary-soft)] px-4 py-4 text-sm font-semibold text-[var(--g3-foreground)]">Fluxo sem nota fiscal. O fechamento gera uma notinha simples, grava o cliente opcional e persiste a venda no historico.</div></section><aside className="bg-[var(--g3-card-soft)] p-6"><h4 className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--g3-muted)]">Resumo da venda</h4><div className="mt-4 rounded-[24px] border border-[var(--g3-border)] bg-[var(--g3-card)] p-5"><div className="flex items-end justify-between"><span className="text-sm font-semibold text-[var(--g3-muted)]">Total da venda</span><span className="text-3xl font-black">{formatarMoeda(subtotal)}</span></div><div className="mt-4 text-sm text-[var(--g3-muted)]">Itens no cupom: <span className="font-semibold text-[var(--g3-foreground)]">{totalItens}</span></div><div className="mt-2 text-sm text-[var(--g3-muted)]">Cliente: <span className="font-semibold text-[var(--g3-foreground)]">{clienteNome || "Consumidor final"}</span></div></div></aside></div></div>}
    </main>
  );
}
