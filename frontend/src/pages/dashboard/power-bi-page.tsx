import { startTransition, useMemo, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import {
  ChartColumn,
  Download,
  Eraser,
  Expand,
  Filter,
  Maximize2,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ResponsiveChart } from "@/components/charts/responsive-chart";
import { PowerBiActiveFilters } from "@/components/dashboard/power-bi/power-bi-active-filters";
import { PowerBiChartPanel } from "@/components/dashboard/power-bi/power-bi-chart-panel";
import { PowerBiDetailModal } from "@/components/dashboard/power-bi/power-bi-detail-modal";
import { PowerBiKpiCard } from "@/components/dashboard/power-bi/power-bi-kpi-card";
import {
  useDashboardPowerBi,
  useDashboardPowerBiDetalhamento
} from "@/features/dashboard/use-dashboard";
import { useAuth } from "@/hooks/use-auth";
import { imprimirConteudoAtual } from "@/lib/report-utils";
import { classesTelaPadraoBeneficiario } from "@/lib/tela-padrao-beneficiario";
import type {
  PowerBiDetalheTabela,
  PowerBiFiltros,
  PowerBiResponse,
  PowerBiValorNomeado
} from "@/types/power-bi";

type AbaPowerBi =
  | "visaoGeral"
  | "cadastrosSociais"
  | "atendimentos"
  | "beneficiosConcessoes"
  | "acompanhamentoSocial"
  | "encaminhamentosRede"
  | "projetosAcoes"
  | "conveniosParcerias"
  | "pendenciasAlertas";

const abas: Array<{ id: AbaPowerBi; label: string }> = [
  { id: "visaoGeral", label: "Visão geral" },
  { id: "cadastrosSociais", label: "Cadastros sociais" },
  { id: "atendimentos", label: "Atendimentos" },
  { id: "beneficiosConcessoes", label: "Benefícios e concessões" },
  { id: "acompanhamentoSocial", label: "Acompanhamento social" },
  { id: "encaminhamentosRede", label: "Encaminhamentos e rede" },
  { id: "projetosAcoes", label: "Projetos, oficinas e ações coletivas" },
  { id: "conveniosParcerias", label: "Convênios e parcerias" },
  { id: "pendenciasAlertas", label: "Pendências e alertas" }
];

const coresGraficos = ["#16a34a", "#0891b2", "#2563eb", "#f59e0b", "#e11d48", "#7c3aed"];
const permissoesDashboard = ["ADMINISTRADOR", "OPERADOR", "LEITURA_APENAS"];

function formatarDataHora(valor: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(valor));
}

function formatarValorResumo(valor: number) {
  return Number.isInteger(valor) ? valor.toLocaleString("pt-BR") : valor.toFixed(1).replace(".", ",");
}

function baixarArquivo(nome: string, conteudo: string, mimeType: string) {
  const blob = new Blob([conteudo], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nome;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function serializarValoresCsv(titulo: string, linhas: PowerBiValorNomeado[]) {
  return [titulo, "Nome;Valor", ...linhas.map((item) => `"${item.nome}";${item.valor}`)].join("\n");
}

function construirResumoExcel(dados: PowerBiResponse, abaAtiva: AbaPowerBi) {
  const linhas = [
    ["Power BI", "Valor"],
    ...dados.cardsGerenciais.map((card) => [card.titulo, String(card.valor)]),
    [],
    ["Aba ativa", abaAtiva],
    ["Última atualização", formatarDataHora(dados.atualizadoEm)]
  ];

  return linhas.map((linha) => linha.join("\t")).join("\n");
}

function renderResumoSecao(resumo?: PowerBiValorNomeado[]) {
  if (!resumo?.length) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {resumo.map((item) => (
        <Card key={item.nome} className="border-emerald-200/60 bg-gradient-to-br from-white via-emerald-50 to-cyan-50 shadow-sm">
          <CardContent className="space-y-2 p-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700/80">{item.nome}</p>
            <p className="text-2xl font-semibold text-slate-950">{formatarValorResumo(item.valor)}</p>
            {item.descricao ? <p className="text-xs text-slate-500">{item.descricao}</p> : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function GraficoBarras({ dados, layout = "horizontal" as const }: { dados: PowerBiValorNomeado[]; layout?: "horizontal" | "vertical" }) {
  return (
    <div className="h-80">
      <ResponsiveChart minWidth={0} minHeight={240}>
        <BarChart data={dados} layout={layout === "vertical" ? "vertical" : "horizontal"} margin={{ left: layout === "vertical" ? 16 : 0, right: 12, top: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
          {layout === "vertical" ? (
            <>
              <XAxis type="number" stroke="var(--g3-muted)" fontSize={11} allowDecimals={false} />
              <YAxis type="category" dataKey="nome" stroke="var(--g3-muted)" fontSize={11} width={130} />
            </>
          ) : (
            <>
              <XAxis dataKey="nome" stroke="var(--g3-muted)" fontSize={11} angle={-18} textAnchor="end" height={70} />
              <YAxis stroke="var(--g3-muted)" fontSize={11} allowDecimals={false} />
            </>
          )}
          <Tooltip />
          <Bar dataKey="valor" fill="#16a34a" radius={layout === "vertical" ? [0, 8, 8, 0] : [8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveChart>
    </div>
  );
}

function GraficoLinha({ dados }: { dados: Array<{ label: string; valor: number }> }) {
  return (
    <div className="h-80">
      <ResponsiveChart minWidth={0} minHeight={240}>
        <LineChart data={dados}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
          <XAxis dataKey="label" stroke="var(--g3-muted)" fontSize={11} />
          <YAxis stroke="var(--g3-muted)" fontSize={11} allowDecimals={false} />
          <Tooltip />
          <Line type="monotone" dataKey="valor" stroke="#0891b2" strokeWidth={3} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveChart>
    </div>
  );
}

function GraficoArea({ dados }: { dados: Array<{ label: string; valor: number }> }) {
  return (
    <div className="h-80">
      <ResponsiveChart minWidth={0} minHeight={240}>
        <AreaChart data={dados}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
          <XAxis dataKey="label" stroke="var(--g3-muted)" fontSize={11} />
          <YAxis stroke="var(--g3-muted)" fontSize={11} allowDecimals={false} />
          <Tooltip />
          <Area type="monotone" dataKey="valor" stroke="#16a34a" fill="#bbf7d0" strokeWidth={2.5} />
        </AreaChart>
      </ResponsiveChart>
    </div>
  );
}

function GraficoRosca({ dados }: { dados: PowerBiValorNomeado[] }) {
  return (
    <div className="h-80">
      <ResponsiveChart minWidth={0} minHeight={240}>
        <PieChart>
          <Pie data={dados} dataKey="valor" nameKey="nome" innerRadius={70} outerRadius={100} paddingAngle={2}>
            {dados.map((item, index) => (
              <Cell key={item.nome} fill={coresGraficos[index % coresGraficos.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveChart>
    </div>
  );
}

export function PowerBiPage() {
  const { usuario } = useAuth();
  const painelRef = useRef<HTMLElement | null>(null);
  const filtrosRef = useRef<HTMLDivElement | null>(null);
  const autorizado = (usuario?.permissoes ?? []).some((permissao) => permissoesDashboard.includes(permissao));
  const [abaAtiva, setAbaAtiva] = useState<AbaPowerBi>("visaoGeral");
  const [filtrosForm, setFiltrosForm] = useState<PowerBiFiltros>({ periodPreset: "ultimos30dias" });
  const [filtrosAplicados, setFiltrosAplicados] = useState<PowerBiFiltros>({ periodPreset: "ultimos30dias" });
  const [mostrarFiltros, setMostrarFiltros] = useState(true);
  const [detalheAbertoId, setDetalheAbertoId] = useState<string | null>(null);

  const { data, isLoading, isFetching, isError, error, refetch } = useDashboardPowerBi(filtrosAplicados, {
    autoRefresh: true,
    refreshIntervalMs: 180_000
  });
  const {
    data: detalheAberto,
    isLoading: isLoadingDetalhe,
    isFetching: isFetchingDetalhe,
    isError: isErrorDetalhe
  } = useDashboardPowerBiDetalhamento(detalheAbertoId, filtrosAplicados);

  const filtrosAtivos = useMemo(() => {
    if (!data) return [];
    const chips: Array<{ id: string; label: string; value: string }> = [];
    const filtros = data.filtrosAplicados;
    const adicionar = (id: string, label: string, value?: string | string[]) => {
      if (!value || (Array.isArray(value) && !value.length)) return;
      chips.push({ id, label, value: Array.isArray(value) ? value.join(", ") : value });
    };
    adicionar("periodo", "Período", `${filtros.startDate} até ${filtros.endDate}`);
    adicionar("unidades", "Unidades", filtros.unidades);
    adicionar("municipios", "Municípios", filtros.municipios);
    adicionar("bairros", "Bairros / território", filtros.bairros);
    adicionar("programas", "Programas", filtros.programas);
    adicionar("situacoes", "Situação", filtros.situacoesCadastro);
    adicionar("faixas", "Faixa etária", filtros.faixasEtarias);
    adicionar("generos", "Gênero", filtros.generos);
    adicionar("tecnicos", "Responsáveis", filtros.responsaveisTecnicos);
    adicionar("tipos", "Tipo atendimento", filtros.tiposAtendimento);
    adicionar("origens", "Origem", filtros.origensEncaminhamento);
    adicionar("statusAcompanhamento", "Status acompanhamento", filtros.statusAcompanhamento);
    adicionar("familia", "Família / beneficiário", filtros.familiaBeneficiario);
    adicionar("usuario", "Técnico / usuário", filtros.tecnicoUsuario);
    return chips;
  }, [data]);

  const semPermissao = autorizado === false || (isError && (error as any)?.response?.status === 403);

  function atualizarLista(campo: keyof PowerBiFiltros, values: string[]) {
    setFiltrosForm((atual) => ({ ...atual, [campo]: values }));
  }

  function aplicarFiltros() {
    startTransition(() => setFiltrosAplicados(filtrosForm));
  }

  function limparFiltros() {
    const limpo: PowerBiFiltros = { periodPreset: "ultimos30dias" };
    setFiltrosForm(limpo);
    startTransition(() => setFiltrosAplicados(limpo));
  }

  function exportarCsvTabela(tabela: PowerBiDetalheTabela) {
    const linhas = [
      tabela.colunas.map((coluna) => coluna.label).join(";"),
      ...tabela.linhas.map((linha) =>
        tabela.colunas.map((coluna) => `"${String(linha[coluna.key] ?? "").replaceAll('"', '""')}"`).join(";")
      )
    ];
    baixarArquivo(`${tabela.id}.csv`, linhas.join("\n"), "text/csv;charset=utf-8");
  }

  function exportarAbaAtualExcel() {
    if (!data) return;
    baixarArquivo("power-bi.xls", construirResumoExcel(data, abaAtiva), "application/vnd.ms-excel;charset=utf-8");
  }

  function exportarPdf() {
    imprimirConteudoAtual({ titulo: "Power BI", seletor: "[data-power-bi-root]" });
  }

  function abrirDetalhamentoPorId(id?: string) {
    if (!id) return;
    setDetalheAbertoId(id);
  }

  async function alternarTelaCheia() {
    const element = painelRef.current;
    if (!element) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    await element.requestFullscreen();
  }

  if (semPermissao) {
    return (
      <main className={classesTelaPadraoBeneficiario.container}>
        <Card className={classesTelaPadraoBeneficiario.cardConteudo}>
          <CardContent className="p-8 text-center text-sm text-[var(--g3-muted)]">
            Você não possui permissão para visualizar o Power BI.
          </CardContent>
        </Card>
      </main>
    );
  }

  const secao =
    abaAtiva === "visaoGeral"
      ? data?.visaoGeral
      : abaAtiva === "cadastrosSociais"
        ? data?.cadastrosSociais
        : abaAtiva === "atendimentos"
          ? data?.atendimentos
          : abaAtiva === "beneficiosConcessoes"
            ? data?.beneficiosConcessoes
            : abaAtiva === "acompanhamentoSocial"
              ? data?.acompanhamentoSocial
              : abaAtiva === "encaminhamentosRede"
                ? data?.encaminhamentosRede
                : abaAtiva === "projetosAcoes"
                  ? data?.projetosAcoes
                  : abaAtiva === "conveniosParcerias"
                    ? data?.conveniosParcerias
                    : data?.pendenciasAlertas;

  return (
    <>
      <main ref={painelRef} className={classesTelaPadraoBeneficiario.container} data-power-bi-root="true">
        <section className="overflow-hidden rounded-[28px] border border-emerald-200/70 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 p-5 text-white shadow-[0_32px_80px_-42px_rgba(15,118,110,0.9)]">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]">
                <ChartColumn className="h-3.5 w-3.5" />
                Dashboard
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Power BI</h1>
                <p className="max-w-3xl text-sm text-white/85 sm:text-base">
                  Painel analítico e gerencial da assistência social voltada ao terceiro setor.
                </p>
              </div>
              <p className="text-xs text-white/75">
                Última atualização: {data ? formatarDataHora(data.atualizadoEm) : "carregando..."}
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:min-w-[240px] xl:grid-cols-1">
              <Button
                type="button"
                size="sm"
                className="justify-start bg-white text-emerald-800 hover:bg-emerald-50"
                onClick={() => void refetch()}
                disabled={isFetching}
              >
                <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
                Atualizar indicadores
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="justify-start border-white/30 bg-white/10 text-white hover:bg-white/20"
                onClick={exportarPdf}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Exportar PDF
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="justify-start border-white/30 bg-white/10 text-white hover:bg-white/20"
                onClick={exportarAbaAtualExcel}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Exportar Excel
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="justify-start border-white/30 bg-white/10 text-white hover:bg-white/20"
                onClick={() => void alternarTelaCheia()}
              >
                <Maximize2 className="mr-1.5 h-3.5 w-3.5" />
                Modo tela cheia
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="justify-start border-white/30 bg-white/10 text-white hover:bg-white/20"
                onClick={() => {
                  setMostrarFiltros((atual) => !atual);
                  filtrosRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              >
                <Filter className="mr-1.5 h-3.5 w-3.5" />
                {mostrarFiltros ? "Recolher filtros" : "Expandir filtros"}
              </Button>
            </div>
          </div>
        </section>

        <div ref={filtrosRef}>
          <Card className="border-[var(--g3-border)] bg-[var(--g3-card)] shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--g3-border)] px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Filtros gerais</p>
                <p className="text-xs text-[var(--g3-muted)]">
                  Expanda para ajustar o recorte analítico e recolha quando quiser focar nos gráficos.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setMostrarFiltros((atual) => !atual)}
              >
                <Filter className="mr-1.5 h-3.5 w-3.5" />
                {mostrarFiltros ? "Recolher filtros" : "Expandir filtros"}
              </Button>
            </div>
            <CardContent className={`space-y-4 p-4 ${mostrarFiltros ? "" : "hidden"}`}>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-1">
                <Label>Período</Label>
                <Select value={filtrosForm.periodPreset ?? "ultimos30dias"} onChange={(event) => setFiltrosForm((atual) => ({ ...atual, periodPreset: event.target.value as PowerBiFiltros["periodPreset"] }))}>
                  <option value="hoje">Hoje</option>
                  <option value="ultimos7dias">Últimos 7 dias</option>
                  <option value="ultimos30dias">Últimos 30 dias</option>
                  <option value="mesAtual">Mês atual</option>
                  <option value="anoAtual">Ano atual</option>
                  <option value="personalizado">Personalizado</option>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Data inicial</Label>
                <Input type="date" value={filtrosForm.startDate ?? ""} onChange={(event) => setFiltrosForm((atual) => ({ ...atual, startDate: event.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Data final</Label>
                <Input type="date" value={filtrosForm.endDate ?? ""} onChange={(event) => setFiltrosForm((atual) => ({ ...atual, endDate: event.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Família / beneficiário</Label>
                <Input value={filtrosForm.familiaBeneficiario ?? ""} onChange={(event) => setFiltrosForm((atual) => ({ ...atual, familiaBeneficiario: event.target.value }))} />
              </div>
              {data ? (
                <>
                  <MultiSelect label="Unidade / projeto" options={data.filtrosDisponiveis.unidades} value={filtrosForm.unidades ?? []} onChange={(values) => atualizarLista("unidades", values)} />
                  <MultiSelect label="Município" options={data.filtrosDisponiveis.municipios} value={filtrosForm.municipios ?? []} onChange={(values) => atualizarLista("municipios", values)} />
                  <MultiSelect label="Bairro / território" options={data.filtrosDisponiveis.bairros} value={filtrosForm.bairros ?? []} onChange={(values) => atualizarLista("bairros", values)} />
                  <MultiSelect label="Programa / serviço / benefício" options={data.filtrosDisponiveis.programas} value={filtrosForm.programas ?? []} onChange={(values) => atualizarLista("programas", values)} />
                  <MultiSelect label="Situação do cadastro" options={data.filtrosDisponiveis.situacoesCadastro} value={filtrosForm.situacoesCadastro ?? []} onChange={(values) => atualizarLista("situacoesCadastro", values)} />
                  <MultiSelect label="Faixa etária" options={data.filtrosDisponiveis.faixasEtarias} value={filtrosForm.faixasEtarias ?? []} onChange={(values) => atualizarLista("faixasEtarias", values)} />
                  <MultiSelect label="Gênero" options={data.filtrosDisponiveis.generos} value={filtrosForm.generos ?? []} onChange={(values) => atualizarLista("generos", values)} />
                  <MultiSelect label="Responsável técnico" options={data.filtrosDisponiveis.responsaveisTecnicos} value={filtrosForm.responsaveisTecnicos ?? []} onChange={(values) => atualizarLista("responsaveisTecnicos", values)} />
                  <MultiSelect label="Tipo de atendimento" options={data.filtrosDisponiveis.tiposAtendimento} value={filtrosForm.tiposAtendimento ?? []} onChange={(values) => atualizarLista("tiposAtendimento", values)} />
                  <MultiSelect label="Origem do encaminhamento" options={data.filtrosDisponiveis.origensEncaminhamento} value={filtrosForm.origensEncaminhamento ?? []} onChange={(values) => atualizarLista("origensEncaminhamento", values)} />
                  <MultiSelect label="Status do acompanhamento" options={data.filtrosDisponiveis.statusAcompanhamento} value={filtrosForm.statusAcompanhamento ?? []} onChange={(values) => atualizarLista("statusAcompanhamento", values)} />
                </>
              ) : null}
              <div className="space-y-1">
                <Label>Técnico / usuário lançador</Label>
                <Input value={filtrosForm.tecnicoUsuario ?? ""} onChange={(event) => setFiltrosForm((atual) => ({ ...atual, tecnicoUsuario: event.target.value }))} />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" size="sm" onClick={aplicarFiltros}>
                <Filter className="mr-1.5 h-3.5 w-3.5" />
                Aplicar filtros
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={limparFiltros}>
                <Eraser className="mr-1.5 h-3.5 w-3.5" />
                Limpar filtros
              </Button>
            </div>
              <PowerBiActiveFilters filtros={filtrosAtivos} />
            </CardContent>
          </Card>
        </div>

        {isError && !semPermissao ? (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4 text-sm text-red-700">
              Falha ao carregar o Power BI. Revise os filtros ou atualize o painel.
            </CardContent>
          </Card>
        ) : null}

        {isLoading || !data ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="h-40 animate-pulse rounded-3xl border border-[var(--g3-border)] bg-[var(--g3-card-soft)]" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {data.cardsGerenciais.map((card) => (
                <PowerBiKpiCard key={card.id} card={card} onClick={card.detalheDatasetId ? () => abrirDetalhamentoPorId(card.detalheDatasetId) : undefined} />
              ))}
            </div>

            <div className="flex gap-2 overflow-x-auto rounded-3xl border border-[var(--g3-border)] bg-[var(--g3-card)] p-2">
              {abas.map((aba) => (
                <Button
                  key={aba.id}
                  type="button"
                  size="sm"
                  variant={abaAtiva === aba.id ? "default" : "outline"}
                  className="shrink-0"
                  onClick={() => startTransition(() => setAbaAtiva(aba.id))}
                >
                  {aba.label}
                </Button>
              ))}
            </div>

            {renderResumoSecao(secao?.resumo)}

            <div className="grid gap-4 xl:grid-cols-2">
              <PowerBiChartPanel titulo="Evolução do período" subtitulo="Leitura temporal consolidada" vazio={!secao?.series?.length} onExpand={() => abrirDetalhamentoPorId(secao?.tabelaId)} onExport={() => baixarArquivo(`${abaAtiva}-serie.csv`, serializarValoresCsv("Série", (secao?.series ?? []).map((item) => ({ nome: item.label, valor: item.valor }))), "text/csv;charset=utf-8")}>
                {abaAtiva === "visaoGeral" || abaAtiva === "projetosAcoes" ? <GraficoArea dados={secao?.series ?? []} /> : <GraficoLinha dados={secao?.series ?? []} />}
              </PowerBiChartPanel>
              <PowerBiChartPanel titulo="Distribuição principal" subtitulo="Comportamento agregado para leitura executiva" vazio={!secao?.distribuicoes?.length} onExpand={() => abrirDetalhamentoPorId(secao?.tabelaId)} onExport={() => baixarArquivo(`${abaAtiva}-distribuicao.csv`, serializarValoresCsv("Distribuição", secao?.distribuicoes ?? []), "text/csv;charset=utf-8")}>
                {abaAtiva === "visaoGeral" || abaAtiva === "beneficiosConcessoes" || abaAtiva === "conveniosParcerias" ? <GraficoRosca dados={secao?.distribuicoes ?? []} /> : <GraficoBarras dados={secao?.distribuicoes ?? []} layout="vertical" />}
              </PowerBiChartPanel>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <PowerBiChartPanel titulo="Ranking analítico" subtitulo="Maiores volumes para priorização gerencial" vazio={!secao?.rankings?.length} onExpand={() => abrirDetalhamentoPorId(secao?.tabelaId)} onExport={() => baixarArquivo(`${abaAtiva}-ranking.csv`, serializarValoresCsv("Ranking", secao?.rankings ?? []), "text/csv;charset=utf-8")}>
                <GraficoBarras dados={secao?.rankings ?? []} layout="vertical" />
              </PowerBiChartPanel>
              <PowerBiChartPanel titulo="Detalhamento rápido" subtitulo="Clique para abrir a tabela analítica completa" vazio={false} onExpand={() => abrirDetalhamentoPorId(secao?.tabelaId)}>
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {(abaAtiva === "cadastrosSociais" ? data.cadastrosSociais.faixasEtarias : abaAtiva === "atendimentos" ? data.atendimentos.porTipo : abaAtiva === "beneficiosConcessoes" ? data.beneficiosConcessoes.deferidosIndeferidos : abaAtiva === "encaminhamentosRede" ? data.encaminhamentosRede.pendentesRetorno : abaAtiva === "projetosAcoes" ? data.projetosAcoes.participacaoFaixaEtaria : abaAtiva === "conveniosParcerias" ? data.conveniosParcerias.vencimentos : abaAtiva === "pendenciasAlertas" ? data.pendenciasAlertas.criticos : data.visaoGeral.statusDistribuicao).slice(0, 6).map((item) => (
                      <div key={item.nome} className="rounded-2xl border border-[var(--g3-border)] bg-[var(--g3-card-soft)] px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--g3-muted)]">{item.nome}</p>
                        <p className="mt-2 text-2xl font-semibold text-[var(--g3-foreground)]">{item.valor.toLocaleString("pt-BR")}</p>
                      </div>
                    ))}
                  </div>
                  <Button type="button" variant="outline" onClick={() => abrirDetalhamentoPorId(secao?.tabelaId)}>
                    <Expand className="mr-1.5 h-3.5 w-3.5" />
                    Abrir tabela analítica
                  </Button>
                </div>
              </PowerBiChartPanel>
            </div>
          </>
        )}
      </main>

      <PowerBiDetailModal
        aberto={!!detalheAbertoId}
        tabela={detalheAberto}
        carregando={isLoadingDetalhe || isFetchingDetalhe}
        erro={isErrorDetalhe ? "Não foi possível carregar o detalhamento agora." : undefined}
        onClose={() => setDetalheAbertoId(null)}
        onExportCsv={exportarCsvTabela}
      />
    </>
  );
}

function MultiSelect({
  label,
  options,
  value,
  onChange
}: {
  label: string;
  options: Array<{ value: string; label: string }>;
  value: string[];
  onChange: (values: string[]) => void;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Select
        multiple
        size={4}
        value={value}
        className="h-auto min-h-[108px] py-2"
        onChange={(event) =>
          onChange(Array.from(event.currentTarget.selectedOptions).map((item) => item.value))
        }
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </div>
  );
}
