import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import {
  Activity,
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Download,
  Eraser,
  EyeOff,
  FileSpreadsheet,
  Filter,
  LayoutDashboard,
  RefreshCw,
  Settings2,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  UsersRound,
  Wand2
} from "lucide-react";
import { ResponsiveChart } from "@/components/charts/responsive-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useDashboardGerencial } from "@/features/dashboard/use-dashboard";
import { useAuth } from "@/hooks/use-auth";
import { classesTelaPadraoBeneficiario } from "@/lib/tela-padrao-beneficiario";
import type {
  DashboardGerencialBucket,
  DashboardGerencialFiltros,
  DashboardGerencialKpi
} from "@/types/dashboard";

const presetsPeriodo = [
  { id: "hoje", label: "Hoje", dias: 0 },
  { id: "7d", label: "Últimos 7 dias", dias: 6 },
  { id: "30d", label: "Últimos 30 dias", dias: 29 },
  { id: "mes-atual", label: "Mês atual", dias: null },
  { id: "ano-atual", label: "Ano atual", dias: null }
] as const;

const paleta = ["var(--g3-primary)", "#14b8a6", "#0ea5e9", "#84cc16", "#f59e0b", "#ef4444", "#64748b"];

function dataHoje() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

function subtrairDias(data: string, dias: number) {
  const value = new Date(`${data}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() - dias);
  return value.toISOString().slice(0, 10);
}

function resolverPreset(id: string) {
  const hoje = dataHoje();
  if (id === "mes-atual") return { startDate: `${hoje.slice(0, 7)}-01`, endDate: hoje };
  if (id === "ano-atual") return { startDate: `${hoje.slice(0, 4)}-01-01`, endDate: hoje };
  const preset = presetsPeriodo.find((item) => item.id === id);
  return { startDate: subtrairDias(hoje, preset?.dias ?? 29), endDate: hoje };
}

function formatarNumero(valor: number) {
  return new Intl.NumberFormat("pt-BR").format(valor);
}

function formatarPercentual(valor: number) {
  return `${Number.isFinite(valor) ? valor.toFixed(1).replace(".", ",") : "0,0"}%`;
}

function formatarData(valor?: string | null) {
  if (!valor) return "Sem data";
  const [ano, mes, dia] = valor.slice(0, 10).split("-");
  return dia && mes && ano ? `${dia}/${mes}/${ano}` : valor;
}

function formatarDataHora(valor?: string) {
  if (!valor) return "Não informado";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(valor));
}

function baixarArquivo(nome: string, conteudo: string, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([conteudo], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nome;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function contarFiltrosAtivos(filtros: DashboardGerencialFiltros) {
  return Object.entries(filtros).filter(([, valor]) => Boolean(valor)).length;
}

function montarCsvCards(cards: DashboardGerencialKpi[]) {
  return [
    "Indicador;Valor;Periodo anterior;Variacao;Origem",
    ...cards.map((card) =>
      [card.titulo, card.valor, card.comparacaoAnterior, `${card.variacaoPercentual}%`, card.origem]
        .map((valor) => `"${String(valor).replace(/"/g, '""')}"`)
        .join(";")
    )
  ].join("\n");
}

function EstadoVazio({ texto }: { texto: string }) {
  return (
    <div className="flex min-h-[160px] items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white/70 p-5 text-center text-sm text-slate-500">
      {texto}
    </div>
  );
}

function SkeletonPainel() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="h-36 animate-pulse rounded-lg bg-white/70 shadow-sm" />
      ))}
    </div>
  );
}

function GraficoBarras({ dados, cor = "#2563eb" }: { dados: DashboardGerencialBucket[]; cor?: string }) {
  if (!dados.length) return <EstadoVazio texto="Ainda não existem dados suficientes para calcular este indicador." />;
  return (
    <ResponsiveChart minHeight={260}>
      <BarChart data={dados} margin={{ top: 10, right: 10, left: -20, bottom: 8 }}>
        <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} />
        <XAxis dataKey="rotulo" tick={{ fontSize: 11, fill: "#475569" }} interval={0} angle={-18} textAnchor="end" height={64} />
        <YAxis tick={{ fontSize: 11, fill: "#475569" }} />
        <Tooltip formatter={(value) => formatarNumero(Number(value))} />
        <Bar dataKey="total" fill={cor} radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveChart>
  );
}

function TituloBloco({ icon: Icon, titulo, subtitulo }: { icon: typeof Activity; titulo: string; subtitulo?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <CardTitle className="text-base text-[var(--g3-foreground)]">{titulo}</CardTitle>
          {subtitulo ? <p className="mt-0.5 text-xs text-[var(--g3-muted)]">{subtitulo}</p> : null}
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  card,
  indice,
  onOpen,
  hidden,
  onHide
}: {
  card: DashboardGerencialKpi;
  indice: number;
  onOpen: () => void;
  hidden: boolean;
  onHide: () => void;
}) {
  if (hidden) return null;

  const tendenciaPositiva = card.interpretacao === "positiva" ? card.tendencia === "alta" : card.tendencia === "baixa";
  const tendenciaNegativa = card.interpretacao === "negativa" ? card.tendencia === "alta" : false;
  const TrendIcon = card.tendencia === "baixa" ? TrendingDown : TrendingUp;
  const cor = paleta[indice % paleta.length];

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative min-h-[154px] overflow-hidden rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card)] p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--g3-active)] hover:shadow-[0_14px_34px_rgba(15,122,67,0.14)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--g3-active)]"
      title={`${card.tooltip} Origem: ${card.origem}`}
      style={{ borderTopColor: cor, borderTopWidth: 4 }}
    >
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg text-white shadow-sm" style={{ backgroundColor: cor }}>
          <Activity className="h-5 w-5" />
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
            tendenciaNegativa ? "bg-red-50 text-red-700" : tendenciaPositiva ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
          }`}
        >
          <TrendIcon className="h-3.5 w-3.5" />
          {formatarPercentual(card.variacaoPercentual)}
        </span>
      </div>
      <div className="relative mt-4">
        <p className="line-clamp-2 min-h-[32px] text-xs font-semibold uppercase text-[var(--g3-muted)]">{card.titulo}</p>
        <strong className="mt-1 block text-3xl font-black text-[var(--g3-foreground)]">{formatarNumero(card.valor)}</strong>
        <p className="mt-1 text-xs text-[var(--g3-muted)]">Anterior: {formatarNumero(card.comparacaoAnterior)}</p>
      </div>
      {card.percentualMeta !== null && card.percentualMeta !== undefined ? (
        <div className="relative mt-4">
          <div className="h-2 overflow-hidden rounded-full bg-[var(--g3-primary-soft)]">
            <div className="h-full rounded-full" style={{ width: `${Math.min(100, card.percentualMeta)}%`, backgroundColor: cor }} />
          </div>
          <p className="mt-1 text-[11px] text-[var(--g3-muted)]">{formatarPercentual(card.percentualMeta)} da meta</p>
        </div>
      ) : null}
      <div className="relative mt-4 flex items-center justify-between gap-2">
        <span className="max-w-[75%] truncate text-[11px] text-[var(--g3-muted)]">Origem: {card.origem}</span>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--g3-active)] opacity-0 transition group-hover:opacity-100">
          Abrir <ChevronRight className="h-3.5 w-3.5" />
        </span>
      </div>
      <span
        role="button"
        tabIndex={0}
        title="Ocultar indicador"
        onClick={(event) => {
          event.stopPropagation();
          onHide();
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            event.stopPropagation();
            onHide();
          }
        }}
        className="absolute right-2 top-2 rounded-md p-1 text-slate-400 opacity-0 transition hover:bg-slate-100 hover:text-slate-700 group-hover:opacity-100"
      >
        <EyeOff className="h-4 w-4" />
      </span>
    </button>
  );
}

export function DashboardGerencialPage() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const [filtrosDraft, setFiltrosDraft] = useState<DashboardGerencialFiltros>(() => ({ periodoPreset: "30d", ...resolverPreset("30d") }));
  const [filtros, setFiltros] = useState<DashboardGerencialFiltros>(() => ({ periodoPreset: "30d", ...resolverPreset("30d") }));
  const [filtrosAbertos, setFiltrosAbertos] = useState(true);
  const [personalizar, setPersonalizar] = useState(false);
  const [cardsOcultos, setCardsOcultos] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(`g3n-dashboard-cards:${usuario?.id ?? "anonimo"}`) ?? "[]");
    } catch {
      return [];
    }
  });

  const { data, isLoading, isFetching, isError, refetch } = useDashboardGerencial(filtros, { autoRefresh: false });
  const periodoTexto = data ? `${formatarData(data.filtros.startDate)} a ${formatarData(data.filtros.endDate)}` : "Período não carregado";
  const filtrosAtivos = contarFiltrosAtivos(filtros);
  const podePersonalizar = data?.permissoes.podePersonalizar ?? false;
  const cards = data?.cards ?? [];
  const pendencias = data?.pendencias ?? [];
  const evolucao = data?.evolucaoBeneficiarios ?? [];
  const atendimentos = data?.atendimentos;

  const destaque = useMemo(() => {
    const beneficiarios = cards.find((card) => card.id === "beneficiarios-ativos")?.valor ?? 0;
    const acoes = cards.find((card) => card.id === "itens-acao")?.valor ?? 0;
    const projetos = cards.find((card) => card.id === "projetos-ativos")?.valor ?? 0;
    return { beneficiarios, acoes, projetos };
  }, [cards]);
  const maiorImpacto = useMemo(() => Math.max(1, ...(data?.impactoSocial.map((item) => item.total) ?? [1])), [data?.impactoSocial]);

  function atualizarFiltro(campo: keyof DashboardGerencialFiltros, valor: string) {
    setFiltrosDraft((atual) => ({ ...atual, [campo]: valor || undefined }));
  }

  function selecionarPreset(valor: string) {
    setFiltrosDraft((atual) => ({ ...atual, periodoPreset: valor, ...resolverPreset(valor) }));
  }

  function aplicarFiltros() {
    setFiltros({ ...filtrosDraft });
  }

  function limparFiltros() {
    const padrao = { periodoPreset: "30d", ...resolverPreset("30d") };
    setFiltrosDraft(padrao);
    setFiltros(padrao);
  }

  function ocultarCard(id: string) {
    const proximos = cardsOcultos.includes(id) ? cardsOcultos.filter((item) => item !== id) : [...cardsOcultos, id];
    setCardsOcultos(proximos);
    localStorage.setItem(`g3n-dashboard-cards:${usuario?.id ?? "anonimo"}`, JSON.stringify(proximos));
  }

  function exportarCsv() {
    if (!data) return;
    baixarArquivo("dashboard-gerencial.csv", montarCsvCards(data.cards), "text/csv;charset=utf-8");
  }

  function exportarPdf() {
    window.print();
  }

  const prioridadeVariant = {
    critica: "danger",
    alta: "danger",
    media: "warning",
    baixa: "info",
    informativa: "default"
  } as const;

  return (
    <main className={`${classesTelaPadraoBeneficiario.container} bg-[var(--g3-card-soft)] print:bg-white`}>
      <section className="relative overflow-hidden rounded-lg border border-[var(--g3-border)] bg-[linear-gradient(135deg,var(--g3-primary-soft)_0%,var(--g3-card)_45%,var(--g3-primary-soft-hover)_100%)] p-5 text-[var(--g3-foreground)] shadow-[0_20px_55px_rgba(15,122,67,0.16)] print:bg-white print:shadow-none">
        <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-[linear-gradient(135deg,transparent_0%,rgba(15,122,67,0.12)_50%,rgba(15,122,67,0.22)_100%)] lg:block" />
        <div className="relative">
          <div>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                {data?.instituicao.logoUrl ? (
                  <img src={data.instituicao.logoUrl} alt="" className="h-14 w-14 rounded-lg bg-white object-contain p-2" />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-[var(--g3-card)] ring-1 ring-[var(--g3-border)]">
                    <LayoutDashboard className="h-7 w-7 text-[var(--g3-active)]" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase text-[var(--g3-active)]">{data?.instituicao.nome ?? "Instituição"}</p>
                  <h1 className="text-3xl font-black text-[var(--g3-foreground)] md:text-4xl">Dashboard gerencial</h1>
                  <p className="mt-1 text-sm text-[var(--g3-muted)]">Período analisado: {periodoTexto}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 print:hidden">
                <Button type="button" variant="outline" size="sm" className="border-[var(--g3-active)] bg-[var(--g3-card)] text-[var(--g3-active)] hover:bg-[var(--g3-primary-soft)]" onClick={() => setFiltrosAbertos((valor) => !valor)}>
                  <Filter className="mr-2 h-4 w-4" />Filtros ({filtrosAtivos})
                </Button>
                <Button type="button" variant="outline" size="sm" className="border-[var(--g3-active)] bg-[var(--g3-card)] text-[var(--g3-active)] hover:bg-[var(--g3-primary-soft)]" onClick={() => void refetch()} disabled={isFetching}>
                  <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />Atualizar
                </Button>
                <Button type="button" variant="outline" size="sm" className="border-[var(--g3-active)] bg-[var(--g3-card)] text-[var(--g3-active)] hover:bg-[var(--g3-primary-soft)]" onClick={exportarCsv} disabled={!data?.permissoes.podeExportar}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />Exportar
                </Button>
                <Button type="button" variant="outline" size="sm" className="border-[var(--g3-active)] bg-[var(--g3-card)] text-[var(--g3-active)] hover:bg-[var(--g3-primary-soft)]" onClick={exportarPdf} disabled={!data?.permissoes.podeExportar}>
                  <Download className="mr-2 h-4 w-4" />PDF
                </Button>
                <Button type="button" variant="outline" size="sm" className="border-[var(--g3-active)] bg-[var(--g3-card)] text-[var(--g3-active)] hover:bg-[var(--g3-primary-soft)]" onClick={() => setPersonalizar((valor) => !valor)} disabled={!podePersonalizar}>
                  <Settings2 className="mr-2 h-4 w-4" />Personalizar dashboard
                </Button>
              </div>
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card)]/90 p-4 shadow-sm">
                <p className="text-xs uppercase text-[var(--g3-muted)]">Beneficiários ativos</p>
                <strong className="mt-1 block text-3xl font-black text-[var(--g3-active)]">{formatarNumero(destaque.beneficiarios)}</strong>
              </div>
              <div className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card)]/90 p-4 shadow-sm">
                <p className="text-xs uppercase text-[var(--g3-muted)]">Projetos ativos</p>
                <strong className="mt-1 block text-3xl font-black text-[var(--g3-active)]">{formatarNumero(destaque.projetos)}</strong>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 shadow-sm">
                <p className="text-xs uppercase text-amber-700">Itens que pedem ação</p>
                <strong className="mt-1 block text-3xl font-black text-amber-800">{formatarNumero(destaque.acoes)}</strong>
              </div>
              <div className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card)]/90 p-4 shadow-sm">
                <p className="text-xs uppercase text-[var(--g3-muted)]">Comparecimento</p>
                <strong className="mt-1 block text-3xl font-black text-[var(--g3-active)]">{formatarPercentual(atendimentos?.taxaComparecimento ?? 0)}</strong>
              </div>
              <div className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card)]/90 p-4 shadow-sm">
                <p className="text-xs uppercase text-[var(--g3-muted)]">Ausência</p>
                <strong className="mt-1 block text-3xl font-black text-red-700">{formatarPercentual(atendimentos?.taxaAusencia ?? 0)}</strong>
              </div>
            </div>
            <p className="mt-4 text-xs text-[var(--g3-muted)]">Última atualização: {formatarDataHora(data?.ultimaAtualizacao)}</p>
          </div>
        </div>
      </section>

      {filtrosAbertos ? (
        <section className="rounded-lg border border-white/80 bg-white/90 p-4 shadow-[0_12px_40px_rgba(15,23,42,0.08)] print:hidden">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-950">Filtros globais</h2>
              <p className="text-xs text-slate-500">{filtrosAtivos} filtro(s) ativo(s) atualizando todos os blocos compatíveis.</p>
            </div>
            <Badge variant="info">Visão salva por usuário</Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-4 xl:grid-cols-6">
            <div>
              <Label>Período</Label>
              <Select value={filtrosDraft.periodoPreset ?? "30d"} onChange={(event) => selecionarPreset(event.target.value)}>
                {presetsPeriodo.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}
                <option value="personalizado">Personalizado</option>
              </Select>
            </div>
            <div><Label>Data inicial</Label><Input type="date" value={filtrosDraft.startDate ?? ""} onChange={(event) => atualizarFiltro("startDate", event.target.value)} /></div>
            <div><Label>Data final</Label><Input type="date" value={filtrosDraft.endDate ?? ""} onChange={(event) => atualizarFiltro("endDate", event.target.value)} /></div>
            <div><Label>Unidade</Label><Select value={filtrosDraft.unidade ?? ""} onChange={(event) => atualizarFiltro("unidade", event.target.value)}><option value="">Todas</option>{data?.opcoes.unidades.map((item) => <option key={item}>{item}</option>)}</Select></div>
            <div><Label>Projeto</Label><Select value={filtrosDraft.projeto ?? ""} onChange={(event) => atualizarFiltro("projeto", event.target.value)}><option value="">Todos</option>{data?.opcoes.projetos.map((item) => <option key={item}>{item}</option>)}</Select></div>
            <div><Label>Bairro</Label><Select value={filtrosDraft.bairro ?? ""} onChange={(event) => atualizarFiltro("bairro", event.target.value)}><option value="">Todos</option>{data?.opcoes.bairros.map((item) => <option key={item}>{item}</option>)}</Select></div>
            <div><Label>Serviço</Label><Select value={filtrosDraft.servico ?? ""} onChange={(event) => atualizarFiltro("servico", event.target.value)}><option value="">Todos</option>{data?.opcoes.servicos.map((item) => <option key={item}>{item}</option>)}</Select></div>
            <div><Label>Situação do beneficiário</Label><Select value={filtrosDraft.statusBeneficiario ?? ""} onChange={(event) => atualizarFiltro("statusBeneficiario", event.target.value)}><option value="">Todas</option>{data?.opcoes.statusBeneficiario.map((item) => <option key={item}>{item}</option>)}</Select></div>
            <div className="flex items-end gap-2 md:col-span-2">
              <Button type="button" onClick={aplicarFiltros}>Aplicar filtros</Button>
              <Button type="button" variant="outline" onClick={limparFiltros}><Eraser className="mr-2 h-4 w-4" />Limpar filtros</Button>
            </div>
          </div>
        </section>
      ) : null}

      {isError ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 text-sm text-red-700">Não foi possível carregar o dashboard gerencial.</CardContent>
        </Card>
      ) : null}
      {isLoading ? <SkeletonPainel /> : null}

      {personalizar ? (
        <Card className="border-blue-100 bg-blue-50/70 print:hidden">
          <CardHeader><CardTitle className="text-sm">Indicadores visíveis</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {cards.map((card) => (
              <Button key={card.id} type="button" size="sm" variant={cardsOcultos.includes(card.id) ? "outline" : "default"} onClick={() => ocultarCard(card.id)}>
                {card.titulo}
              </Button>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card, indice) => (
          <KpiCard
            key={card.id}
            card={card}
            indice={indice}
            hidden={cardsOcultos.includes(card.id)}
            onHide={() => ocultarCard(card.id)}
            onOpen={() => card.rotaDetalhe && navigate(card.rotaDetalhe)}
          />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="overflow-hidden border-[var(--g3-border)] bg-[var(--g3-card)] shadow-sm">
          <CardHeader className="border-b border-[var(--g3-border)] bg-[var(--g3-card)]">
            <TituloBloco icon={UsersRound} titulo="Evolução e crescimento de beneficiários" subtitulo="Novos, ativos e acumulado no período" />
          </CardHeader>
          <CardContent className="p-4">
            {evolucao.length ? (
              <ResponsiveChart minHeight={340}>
                <AreaChart data={evolucao} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="novosGradient" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="ativosGradient" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor="var(--g3-primary)" stopOpacity={0.42} />
                      <stop offset="95%" stopColor="var(--g3-primary)" stopOpacity={0.04} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} />
                  <XAxis dataKey="periodo" tick={{ fontSize: 11, fill: "#475569" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#475569" }} />
                  <Tooltip formatter={(value) => formatarNumero(Number(value))} />
                  <Legend />
                  <Area type="monotone" dataKey="ativos" name="Ativos no período" stroke="var(--g3-primary)" strokeWidth={3} fill="url(#ativosGradient)" />
                  <Area type="monotone" dataKey="novos" name="Novos" stroke="#0ea5e9" strokeWidth={3} fill="url(#novosGradient)" />
                  <Line type="monotone" dataKey="acumulado" name="Acumulado" stroke="#f59e0b" strokeWidth={3} dot={{ r: 3 }} />
                </AreaChart>
              </ResponsiveChart>
            ) : <EstadoVazio texto="Ainda não existem dados suficientes para calcular este indicador." />}
          </CardContent>
        </Card>

        <Card id="itens-acao" className="overflow-hidden border-[var(--g3-border)] bg-[var(--g3-card)] shadow-sm">
          <CardHeader className="border-b border-amber-200 bg-amber-50 text-amber-800">
            <CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="h-5 w-5" />Itens que pedem ação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4">
            {!pendencias.length ? <EstadoVazio texto="Nenhum item crítico foi encontrado nos módulos monitorados." /> : pendencias.map((item) => (
              <div key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 transition hover:border-amber-300 hover:bg-amber-50">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">{item.titulo}</p>
                    <p className="text-sm text-slate-600">{item.descricao}</p>
                  </div>
                  <Badge variant={prioridadeVariant[item.prioridade]}>{item.prioridade}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>{item.modulo}</span>
                  <strong className="text-slate-900">{formatarNumero(item.quantidade)} registro(s)</strong>
                  <Button type="button" size="sm" variant="outline" onClick={() => item.rotaDetalhe && navigate(item.rotaDetalhe)}>Ver detalhes</Button>
                  <Button type="button" size="sm" variant="outline">Marcar como tratado</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="border-[var(--g3-border)] bg-[var(--g3-card)] shadow-sm">
          <CardHeader><TituloBloco icon={Activity} titulo="Gestão de atendimentos" subtitulo="Volume, pessoas únicas e status" /></CardHeader>
          <CardContent>
            <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-[var(--g3-primary-soft)] p-3"><p className="text-[var(--g3-active)]">Atendimentos</p><strong className="text-2xl text-[var(--g3-foreground)]">{formatarNumero(atendimentos?.total ?? 0)}</strong></div>
              <div className="rounded-lg bg-teal-50 p-3"><p className="text-teal-700">Pessoas únicas</p><strong className="text-2xl text-teal-950">{formatarNumero(atendimentos?.pessoasUnicas ?? 0)}</strong></div>
              <div className="rounded-lg bg-sky-50 p-3"><p className="text-sky-700">Comparecimento</p><strong className="text-2xl text-sky-950">{formatarPercentual(atendimentos?.taxaComparecimento ?? 0)}</strong></div>
              <div className="rounded-lg bg-amber-50 p-3"><p className="text-amber-700">Ausência</p><strong className="text-2xl text-amber-950">{formatarPercentual(atendimentos?.taxaAusencia ?? 0)}</strong></div>
            </div>
            <GraficoBarras dados={atendimentos?.porStatus ?? []} cor="var(--g3-primary)" />
          </CardContent>
        </Card>

        <Card className="border-[var(--g3-border)] bg-[var(--g3-card)] shadow-sm">
          <CardHeader><TituloBloco icon={Sparkles} titulo="Engajamento por frente" subtitulo="Participação por área de atuação" /></CardHeader>
          <CardContent>
            {data?.engajamento.length ? (
              <ResponsiveChart minHeight={330}>
                <PieChart>
                  <Pie data={data.engajamento} dataKey="atendimentos" nameKey="frente" innerRadius={60} outerRadius={105} paddingAngle={3} label>
                    {data.engajamento.map((_, index) => <Cell key={index} fill={paleta[index % paleta.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value) => formatarNumero(Number(value))} />
                  <Legend />
                </PieChart>
              </ResponsiveChart>
            ) : <EstadoVazio texto="Ainda não existem dados suficientes para calcular este indicador." />}
          </CardContent>
        </Card>

        <Card className="border-[var(--g3-border)] bg-[var(--g3-card)] shadow-sm">
          <CardHeader><TituloBloco icon={CalendarClock} titulo="Agenda, eventos e ações sociais" subtitulo="Próximos compromissos" /></CardHeader>
          <CardContent className="space-y-3">
            {data?.eventos.length ? data.eventos.map((evento) => (
              <button key={evento.id} type="button" onClick={() => evento.rotaDetalhe && navigate(evento.rotaDetalhe)} className="block w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-blue-300 hover:bg-blue-50">
                <p className="font-semibold text-slate-950">{evento.titulo}</p>
                <p className="text-sm text-slate-600">{formatarData(evento.data)} {evento.horario ? `· ${evento.horario}` : ""}</p>
                <p className="text-xs text-slate-500">{evento.unidade ?? evento.local ?? "Local não informado"} · {evento.situacao ?? "Sem status"}</p>
              </button>
            )) : <EstadoVazio texto="Nenhum compromisso futuro foi encontrado." />}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="border-[var(--g3-border)] bg-[var(--g3-card)] shadow-sm xl:col-span-2">
          <CardHeader><TituloBloco icon={Target} titulo="Desempenho dos projetos e programas" subtitulo="Metas, prazo e pendências" /></CardHeader>
          <CardContent className="overflow-auto">
            {data?.projetos.length ? (
              <table className="w-full min-w-[720px] text-sm">
                <thead className="text-left text-xs uppercase text-slate-500"><tr><th className="py-2">Projeto</th><th>Status</th><th>Prazo</th><th>Meta</th><th>Pendências</th><th></th></tr></thead>
                <tbody>
                  {data.projetos.map((projeto) => (
                    <tr key={projeto.id} className="border-t border-slate-200 hover:bg-slate-50">
                      <td className="py-3"><p className="font-semibold text-slate-950">{projeto.projeto}</p><p className="text-xs text-slate-500">{projeto.programa ?? projeto.unidade ?? "Sem programa"}</p></td>
                      <td><Badge variant={projeto.situacao === "critico" || projeto.situacao === "atrasado" ? "danger" : projeto.situacao === "atencao" ? "warning" : "success"}>{projeto.situacao.replaceAll("_", " ")}</Badge></td>
                      <td>{formatarPercentual(projeto.prazoConsumidoPercentual)}</td>
                      <td>{formatarPercentual(projeto.metaAtingidaPercentual)}</td>
                      <td>{formatarNumero(projeto.pendencias)}</td>
                      <td><Button type="button" size="sm" variant="outline" onClick={() => projeto.rotaDetalhe && navigate(projeto.rotaDetalhe)}>Abrir</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <EstadoVazio texto="Ainda não existem dados suficientes para calcular este indicador." />}
          </CardContent>
        </Card>

        <Card className="border-[var(--g3-border)] bg-[var(--g3-primary-soft)] text-[var(--g3-foreground)] shadow-[0_16px_45px_rgba(15,122,67,0.10)]">
          <CardHeader><CardTitle className="text-base text-[var(--g3-active)]">Impacto social</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {data?.impactoSocial.map((item, index) => (
              <div key={item.chave} className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card)] p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-[var(--g3-muted)]">{item.rotulo}</span>
                  <strong className="text-xl text-[var(--g3-active)]">{formatarNumero(item.total)}</strong>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--g3-primary-soft)]">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, (item.total / maiorImpacto) * 100)}%`, backgroundColor: paleta[index % paleta.length] }} />
                </div>
              </div>
            ))}
            {!data?.impactoSocial.length ? <EstadoVazio texto="Ainda não existem dados suficientes para calcular este indicador." /> : null}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="border-[var(--g3-border)] bg-[var(--g3-card)] shadow-sm">
          <CardHeader><TituloBloco icon={UsersRound} titulo="Perfil por faixa etária" /></CardHeader>
          <CardContent><GraficoBarras dados={data?.perfilBeneficiarios.faixaEtaria ?? []} cor="#14b8a6" /></CardContent>
        </Card>
        <Card className="border-[var(--g3-border)] bg-[var(--g3-card)] shadow-sm">
          <CardHeader><TituloBloco icon={LayoutDashboard} titulo="Perfil territorial" /></CardHeader>
          <CardContent><GraficoBarras dados={data?.perfilBeneficiarios.bairros ?? []} cor="var(--g3-primary)" /></CardContent>
        </Card>
        <Card className="border-[var(--g3-border)] bg-[var(--g3-card)] shadow-sm">
          <CardHeader><TituloBloco icon={CheckCircle2} titulo="Status cadastral" /></CardHeader>
          <CardContent><GraficoBarras dados={data?.perfilBeneficiarios.status ?? []} cor="#f59e0b" /></CardContent>
        </Card>
      </section>

      <Card className="overflow-hidden border-[var(--g3-border)] bg-[var(--g3-card)] shadow-sm">
        <CardHeader className="border-b border-[var(--g3-border)] bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
          <CardTitle className="flex items-center gap-2 text-base"><Wand2 className="h-5 w-5" />Análise inteligente do G3N</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 p-4 md:grid-cols-2">
          {data?.analiseInteligente.map((analise) => (
            <button key={analise.id} type="button" onClick={() => analise.rotaDetalhe && navigate(analise.rotaDetalhe)} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-indigo-300 hover:bg-indigo-50">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-indigo-600" />
                <div><p className="font-semibold text-slate-950">{analise.titulo}</p><p className="text-sm text-slate-600">{analise.descricao}</p></div>
              </div>
              <p className="mt-2 text-xs text-slate-500">Indicador: {analise.indicador} · Regra: {analise.regra} · Origem: {analise.origem}</p>
            </button>
          ))}
        </CardContent>
      </Card>

      {data?.avisos.length ? (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="space-y-1 p-4 text-sm text-amber-900">
            {data.avisos.map((aviso) => <p key={aviso}>{aviso}</p>)}
          </CardContent>
        </Card>
      ) : null}
    </main>
  );
}
