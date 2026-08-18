import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, BarChart3, CalendarCheck2, Check, ClipboardCheck, Eye, EyeOff, GraduationCap, RotateCcw, Settings2, SlidersHorizontal, UsersRound, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Bar, BarChart, Cell, Line, LineChart, Pie, PieChart, PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { educacionalService } from "@/services/educacional.service";
import { unidadesAssistenciaisService } from "@/services/unidades-assistenciais.service";
import type { EducacionalItem } from "@/types/educacional";
import type { UnidadeAssistencial } from "@/types/unidade-assistencial";

type Props = { resumo: Record<string, unknown>; carregando: boolean };
type Filtros = { unidade_id?: string; ano_letivo_id?: string; etapa_id?: string; turma_id?: string; turno?: string };
type PendenciaEducacional = { chave: string; prioridade: string; descricao: string; total: number; destino: string };
type WidgetId = "alunos" | "matriculas" | "turmas" | "frequencia" | "risco" | "evasao" | "ocorrencias" | "media";
const WIDGETS: Array<{ id: WidgetId; label: string }> = [
  { id: "alunos", label: "Alunos ativos" },
  { id: "matriculas", label: "Matrículas" },
  { id: "turmas", label: "Turmas ativas" },
  { id: "frequencia", label: "Frequência geral" },
  { id: "risco", label: "Alunos em risco" },
  { id: "evasao", label: "Risco de evasão" },
  { id: "ocorrencias", label: "Ocorrências" },
  { id: "media", label: "Média geral" }
];
const WIDGET_DESCRIPTIONS: Record<WidgetId, string> = {
  alunos: "Total de alunos ativos e situação de acompanhamento.",
  matriculas: "Matrículas ativas e registros pendentes.",
  turmas: "Turmas em funcionamento na instituição.",
  frequencia: "Frequência média registrada no período.",
  risco: "Alunos classificados com algum nível de risco.",
  evasao: "Alunos com sinais de risco de evasão.",
  ocorrencias: "Ocorrências registradas no mês.",
  media: "Média geral das avaliações lançadas."
};
const WIDGET_STORAGE_KEY = "g3n.educacional.dashboard.widgets";
const numero = (valor: unknown) => Number(valor ?? 0);
const textoItem = (item: EducacionalItem) => String(item.nome ?? item.descricao ?? item.ano ?? item.id);
const percentual = (valor: number) => `${valor.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

export function EducacionalVisaoGeralPage({ resumo: inicial, carregando }: Props) {
  const navigate = useNavigate();
  const [resumo, setResumo] = useState<Record<string, unknown>>(inicial);
  const [filtros, setFiltros] = useState<Filtros>({});
  const [opcoes, setOpcoes] = useState<{ unidades: UnidadeAssistencial[]; anos: EducacionalItem[]; etapas: EducacionalItem[]; turmas: EducacionalItem[] }>({ unidades: [], anos: [], etapas: [], turmas: [] });
  const [erro, setErro] = useState("");
  const [configuracaoAberta, setConfiguracaoAberta] = useState(false);
  const [widgetsVisiveis, setWidgetsVisiveis] = useState<Record<WidgetId, boolean>>(() => {
    const padrao = Object.fromEntries(WIDGETS.map((item) => [item.id, true])) as Record<WidgetId, boolean>;
    if (typeof window === "undefined") return padrao;
    try {
      const salvo = JSON.parse(window.localStorage.getItem(WIDGET_STORAGE_KEY) ?? "null") as Partial<Record<WidgetId, boolean>> | null;
      return { ...padrao, ...(salvo ?? {}) };
    } catch {
      return padrao;
    }
  });
  useEffect(() => setResumo(inicial), [inicial]);
  useEffect(() => { void Promise.all([unidadesAssistenciaisService.listar({ tipo_unidade: "ENSINO" }), educacionalService.listar("anos-letivos"), educacionalService.listar("etapas"), educacionalService.listar("turmas")]).then(([unidades, anos, etapas, turmas]) => setOpcoes({ unidades: unidades.unidades, anos, etapas, turmas })).catch(() => undefined); }, []);
  async function atualizarIndicadores() {
    try { setErro(""); setResumo(await educacionalService.resumo(Object.fromEntries(Object.entries(filtros).filter(([, valor]) => valor)))); }
    catch (error) { setErro(error instanceof Error ? error.message : "Não foi possível atualizar os indicadores."); }
  }
  const frequencia = numero(resumo.frequencia_geral);
  const risco = numero(resumo.alunos_risco);
  const criticos = numero(resumo.alunos_risco_critico);
  const matriculas = (resumo.matriculas ?? {}) as Record<string, number>;
  const atencoes = useMemo(() => [
    ["Crítica", "Frequência abaixo de 75%", criticos, "?grupo=professores&aba=frequencias"],
    ["Crítica", "Cinco ou mais faltas", numero(resumo.risco_evasao), "?grupo=professores&aba=frequencias"],
    ["Atenção", "Alunos em risco educacional", risco, "?grupo=alunos&aba=alunos"],
    ["Acompanhar", "Chamadas não realizadas", numero(resumo.chamadas_pendentes), "?grupo=professores&aba=frequencias"]
  ] as const, [criticos, risco, resumo.chamadas_pendentes, resumo.risco_evasao]);
  const atencoesGrafico = atencoes.map(([prioridade, descricao, total]) => ({
    nome: descricao.replace("Frequência abaixo de 75%", "Frequência").replace("Cinco ou mais faltas", "Faltas").replace("Alunos em risco educacional", "Risco").replace("Chamadas não realizadas", "Chamadas"),
    total,
    cor: prioridade === "Crítica" ? "#dc2626" : "#f59e0b"
  }));
  const pendencias = Array.isArray(resumo.pendencias) ? resumo.pendencias as PendenciaEducacional[] : [];
  const pendenciasGrafico = pendencias.map((item) => ({
    nome: item.descricao.length > 22 ? `${item.descricao.slice(0, 22)}…` : item.descricao,
    total: item.total,
    cor: item.prioridade === "Crítica" ? "#dc2626" : item.prioridade === "Atenção" ? "#f59e0b" : "#059669"
  }));
  const matriculasData = [
    { nome: "Ativas", total: numero(resumo.matriculas_ativas), cor: "#047857" },
    { nome: "Pendentes", total: numero(matriculas.pendente), cor: "#f59e0b" }
  ];
  const riscoData = [
    { nome: "Críticos", total: criticos, cor: "#dc2626" },
    { nome: "Atenção", total: Math.max(0, risco - criticos), cor: "#f59e0b" },
    { nome: "Sem alerta", total: Math.max(0, numero(resumo.alunos_ativos) - risco), cor: "#059669" }
  ];
  const atualizarWidgets = (id: WidgetId) => {
    setWidgetsVisiveis((atual) => {
      const proximo = { ...atual, [id]: !atual[id] };
      window.localStorage.setItem(WIDGET_STORAGE_KEY, JSON.stringify(proximo));
      return proximo;
    });
  };
  const exibirWidget = (id: WidgetId) => widgetsVisiveis[id];
  const totalWidgetsVisiveis = WIDGETS.filter((item) => exibirWidget(item.id)).length;
  const restaurarWidgets = () => {
    const padrao = Object.fromEntries(WIDGETS.map((item) => [item.id, true])) as Record<WidgetId, boolean>;
    setWidgetsVisiveis(padrao);
    window.localStorage.setItem(WIDGET_STORAGE_KEY, JSON.stringify(padrao));
  };
  const destinoPendencia = (destino: string) => {
    const parametros = new URLSearchParams(destino.startsWith("?") ? destino.slice(1) : destino);
    Object.entries(filtros).forEach(([chave, valor]) => { if (valor) parametros.set(chave, valor); });
    return `/educacional?${parametros.toString()}`;
  };
  const card = (titulo: string, valor: string, detalhe: string, icone: React.ReactNode, grafico: React.ReactNode, destino?: string, destaque = false) => <button type="button" className="h-full text-left" onClick={() => destino && navigate(`/educacional${destino}`)}><Card className={`h-full overflow-hidden border-slate-200/80 shadow-[0_10px_28px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(15,23,42,0.14)] ${destaque ? "border-amber-300 bg-amber-50/60" : "bg-[var(--g3-card)]"}`}><CardContent className="p-4"><div className="flex items-start justify-between gap-2"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--g3-muted)]">{titulo}</p><p className="mt-2 text-3xl font-bold text-[var(--g3-foreground)]">{valor}</p></div><span className="rounded-lg bg-emerald-50 p-2 text-emerald-700">{icone}</span></div><div className="mt-3 h-20 w-full">{grafico}</div><p className="mt-2 text-xs text-[var(--g3-muted)]">{detalhe}</p></CardContent></Card></button>;
  const graficoBarras = (data: Array<{ nome: string; total: number; cor?: string }>, cor = "#059669") => <ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{ top: 5, right: 4, left: -24, bottom: 0 }}><XAxis dataKey="nome" hide /><YAxis hide /><Tooltip cursor={{ fill: "rgba(5,150,105,0.08)" }} contentStyle={{ borderRadius: 10, border: "1px solid #d1fae5", fontSize: 12 }} /><Bar dataKey="total" radius={[5, 5, 0, 0]} fill={cor}>{data.map((item) => <Cell key={item.nome} fill={item.cor ?? cor} />)}</Bar></BarChart></ResponsiveContainer>;
  const graficoRosca = (data: Array<{ nome: string; total: number; cor: string }>) => <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} dataKey="total" nameKey="nome" innerRadius={24} outerRadius={38} paddingAngle={3} stroke="none">{data.map((item) => <Cell key={item.nome} fill={item.cor} />)}</Pie><Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #d1fae5", fontSize: 12 }} /></PieChart></ResponsiveContainer>;
  const graficoPizza = (data: Array<{ nome: string; total: number; cor: string }>) => <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} dataKey="total" nameKey="nome" outerRadius={38} paddingAngle={2} stroke="none">{data.map((item) => <Cell key={item.nome} fill={item.cor} />)}</Pie><Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #d1fae5", fontSize: 12 }} /></PieChart></ResponsiveContainer>;
  const graficoColunas = (data: Array<{ nome: string; total: number; cor?: string }>) => <ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{ top: 5, right: 4, left: -24, bottom: 0 }}><XAxis dataKey="nome" hide /><YAxis hide /><Tooltip cursor={{ fill: "rgba(5,150,105,0.08)" }} contentStyle={{ borderRadius: 10, border: "1px solid #d1fae5", fontSize: 12 }} /><Bar dataKey="total" radius={[5, 5, 0, 0]}>{data.map((item) => <Cell key={item.nome} fill={item.cor ?? "#059669"} />)}</Bar></BarChart></ResponsiveContainer>;
  const graficoBarrasHorizontais = (data: Array<{ nome: string; total: number; cor?: string }>) => <ResponsiveContainer width="100%" height="100%"><BarChart layout="vertical" data={data} margin={{ top: 3, right: 8, left: 0, bottom: 0 }}><XAxis type="number" hide /><YAxis type="category" dataKey="nome" hide /><Tooltip cursor={{ fill: "rgba(220,38,38,0.08)" }} contentStyle={{ borderRadius: 10, border: "1px solid #fee2e2", fontSize: 12 }} /><Bar dataKey="total" radius={[0, 5, 5, 0]}>{data.map((item) => <Cell key={item.nome} fill={item.cor ?? "#dc2626"} />)}</Bar></BarChart></ResponsiveContainer>;
  const graficoLinha = (data: Array<{ nome: string; total: number }>, cor = "#2563eb") => <ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 5, right: 6, left: -24, bottom: 0 }}><XAxis dataKey="nome" hide /><YAxis hide /><Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #dbeafe", fontSize: 12 }} /><Line type="monotone" dataKey="total" stroke={cor} strokeWidth={3} dot={{ r: 3, fill: cor }} activeDot={{ r: 5 }} /></LineChart></ResponsiveContainer>;
  const graficoFrequencia = <ResponsiveContainer width="100%" height="100%"><RadialBarChart innerRadius="72%" outerRadius="100%" barSize={10} data={[{ nome: "Frequência", valor: Math.min(100, Math.max(0, frequencia)), fill: frequencia >= 90 ? "#059669" : frequencia >= 80 ? "#f59e0b" : "#dc2626" }]} startAngle={90} endAngle={-270}><PolarAngleAxis type="number" domain={[0, 100]} tick={false} /><RadialBar dataKey="valor" cornerRadius={8} background={{ fill: "#e2e8f0" }} /></RadialBarChart></ResponsiveContainer>;
  return <div className="space-y-4">
      <div className="space-y-3 rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card-soft)] p-3 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div className="min-w-0 xl:col-span-2"><label className="text-[11px] font-semibold uppercase text-[var(--g3-muted)]">Unidade</label><Select value={filtros.unidade_id ?? ""} onChange={(event) => setFiltros((atual) => ({ ...atual, unidade_id: event.target.value }))}><option value="">Todas</option>{opcoes.unidades.map((item) => <option key={item.id_unidade} value={item.id_unidade}>{item.nome_fantasia}</option>)}</Select></div>
          <div className="min-w-0"><label className="text-[11px] font-semibold uppercase text-[var(--g3-muted)]">Ano letivo</label><Select value={filtros.ano_letivo_id ?? ""} onChange={(event) => setFiltros((atual) => ({ ...atual, ano_letivo_id: event.target.value }))}><option value="">Todos</option>{opcoes.anos.map((item) => <option key={item.id} value={item.id}>{textoItem(item)}</option>)}</Select></div>
          <div className="min-w-0"><label className="text-[11px] font-semibold uppercase text-[var(--g3-muted)]">Etapa</label><Select value={filtros.etapa_id ?? ""} onChange={(event) => setFiltros((atual) => ({ ...atual, etapa_id: event.target.value }))}><option value="">Todas</option>{opcoes.etapas.map((item) => <option key={item.id} value={item.id}>{textoItem(item)}</option>)}</Select></div>
          <div className="min-w-0"><label className="text-[11px] font-semibold uppercase text-[var(--g3-muted)]">Turma</label><Select value={filtros.turma_id ?? ""} onChange={(event) => setFiltros((atual) => ({ ...atual, turma_id: event.target.value }))}><option value="">Todas</option>{opcoes.turmas.map((item) => <option key={item.id} value={item.id}>{textoItem(item)}</option>)}</Select></div>
          <div className="min-w-0"><label className="text-[11px] font-semibold uppercase text-[var(--g3-muted)]">Turno</label><Select value={filtros.turno ?? ""} onChange={(event) => setFiltros((atual) => ({ ...atual, turno: event.target.value }))}><option value="">Todos</option><option value="MATUTINO">Matutino</option><option value="VESPERTINO">Vespertino</option><option value="INTEGRAL">Integral</option><option value="NOTURNO">Noturno</option></Select></div>
          <div className="flex items-end"><Button className="w-full" type="button" onClick={() => void atualizarIndicadores()} disabled={carregando}>Atualizar indicadores</Button></div>
        </div>
        <div className="flex flex-col gap-2 border-t border-[var(--g3-border)] pt-3 sm:flex-row sm:items-center sm:justify-between"><div className="text-xs text-[var(--g3-muted)]"><span className="font-semibold text-[var(--g3-foreground)]">{totalWidgetsVisiveis} de {WIDGETS.length}</span> indicadores visíveis</div><Button type="button" variant={configuracaoAberta ? "default" : "outline"} onClick={() => setConfiguracaoAberta((atual) => !atual)}><Settings2 className="mr-2 h-4 w-4" />Configurar painel</Button></div>
      </div>
    {configuracaoAberta ? <Card className="overflow-hidden border-emerald-200 shadow-[0_10px_28px_rgba(15,23,42,0.08)]"><CardHeader className="border-b border-emerald-100 bg-gradient-to-r from-emerald-50 to-white pb-3"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex items-center gap-2"><span className="rounded-lg bg-emerald-100 p-2 text-emerald-700"><SlidersHorizontal className="h-4 w-4" /></span><div><CardTitle className="text-base">Personalizar painel</CardTitle><p className="mt-1 text-sm font-normal text-[var(--g3-muted)]">Escolha quais indicadores aparecem na visão geral. A configuração fica salva neste navegador.</p></div></div></div><Button type="button" variant="ghost" size="sm" className="self-end sm:self-start" onClick={() => setConfiguracaoAberta(false)} aria-label="Fechar configuração do painel"><X className="mr-1.5 h-4 w-4" />Fechar</Button></div></CardHeader><CardContent className="space-y-4 p-4"><div className="flex flex-col gap-3 rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card-soft)] p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-[var(--g3-foreground)]">Exibição dos indicadores</p><p className="text-xs text-[var(--g3-muted)]">{totalWidgetsVisiveis} de {WIDGETS.length} indicadores selecionados</p></div><div className="flex flex-wrap gap-2"><Button type="button" size="sm" variant="outline" onClick={() => { const todos = Object.fromEntries(WIDGETS.map((item) => [item.id, true])) as Record<WidgetId, boolean>; setWidgetsVisiveis(todos); window.localStorage.setItem(WIDGET_STORAGE_KEY, JSON.stringify(todos)); }}>Mostrar todos</Button><Button type="button" size="sm" variant="outline" onClick={() => { const nenhum = Object.fromEntries(WIDGETS.map((item) => [item.id, false])) as Record<WidgetId, boolean>; setWidgetsVisiveis(nenhum); window.localStorage.setItem(WIDGET_STORAGE_KEY, JSON.stringify(nenhum)); }}>Ocultar todos</Button><Button type="button" size="sm" variant="ghost" onClick={restaurarWidgets}><RotateCcw className="mr-1.5 h-3.5 w-3.5" />Restaurar padrão</Button></div></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{WIDGETS.map((item) => { const visivel = exibirWidget(item.id); return <label key={item.id} className={`group flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${visivel ? "border-emerald-300 bg-emerald-50/70" : "border-[var(--g3-border)] bg-white hover:border-emerald-200 hover:bg-emerald-50/30"}`}><input type="checkbox" checked={visivel} onChange={() => atualizarWidgets(item.id)} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600" /><span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2 text-sm font-semibold text-[var(--g3-foreground)]"><span>{item.label}</span>{visivel ? <Eye className="h-4 w-4 shrink-0 text-emerald-700" aria-label="Indicador visível" /> : <EyeOff className="h-4 w-4 shrink-0 text-slate-400" aria-label="Indicador oculto" />}</span><span className="mt-1 block text-xs leading-relaxed text-[var(--g3-muted)]">{WIDGET_DESCRIPTIONS[item.id]}</span><span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${visivel ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"}`}>{visivel ? "Visível no painel" : "Oculto no painel"}</span></span></label>; })}</div><div className="flex items-center gap-2 border-t border-[var(--g3-border)] pt-3 text-xs text-[var(--g3-muted)]"><Check className="h-4 w-4 text-emerald-700" />As alterações são aplicadas imediatamente aos indicadores abaixo.</div></CardContent></Card> : null}
    {erro ? <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{erro}</p> : null}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {exibirWidget("alunos") ? card("Alunos ativos", String(numero(resumo.alunos_ativos)), "pizza por situação de acompanhamento", <UsersRound className="h-5 w-5" />, graficoPizza([{ nome: "Em risco", total: risco, cor: "#f59e0b" }, { nome: "Sem alerta", total: Math.max(0, numero(resumo.alunos_ativos) - risco), cor: "#059669" }]), "?grupo=alunos&aba=alunos") : null}
      {exibirWidget("matriculas") ? card("Matrículas ativas", String(numero(resumo.matriculas_ativas)), `${numero(matriculas.pendente)} pendentes`, <ClipboardCheck className="h-5 w-5" />, graficoRosca(matriculasData), "?grupo=alunos&aba=alunos") : null}
      {exibirWidget("turmas") ? card("Turmas ativas", String(numero(resumo.turmas_ativas)), "coluna por quantidade de turmas em funcionamento", <GraduationCap className="h-5 w-5" />, graficoColunas([{ nome: "Ativas", total: numero(resumo.turmas_ativas), cor: "#059669" }]), "?aba=estrutura&recurso=turmas") : null}
      {exibirWidget("frequencia") ? card("Frequência geral", percentual(frequencia), frequencia >= 90 ? "Dentro do indicador esperado" : frequencia >= 80 ? "Faixa de atenção" : "Abaixo do indicador esperado", frequencia >= 90 ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />, graficoFrequencia) : null}
      {exibirWidget("risco") ? card("Alunos em risco", String(risco), `${criticos} críticos · ${Math.max(0, risco - criticos)} em atenção`, <AlertTriangle className="h-5 w-5" />, graficoRosca(riscoData), "?grupo=alunos&aba=alunos", true) : null}
      {exibirWidget("evasao") ? card("Risco de evasão", String(numero(resumo.risco_evasao)), "barra horizontal de alunos em risco", <AlertTriangle className="h-5 w-5" />, graficoBarrasHorizontais([{ nome: "Risco", total: numero(resumo.risco_evasao), cor: "#dc2626" }]), "?grupo=alunos&aba=alunos", true) : null}
      {exibirWidget("ocorrencias") ? card("Ocorrências no mês", String(numero(resumo.ocorrencias_mes)), `${numero(resumo.ocorrencias_recorrentes)} alunos necessitam acompanhamento`, <CalendarCheck2 className="h-5 w-5" />, graficoLinha([{ nome: "Atual", total: numero(resumo.ocorrencias_mes) }, { nome: "Recorrentes", total: numero(resumo.ocorrencias_recorrentes) }]), "?aba=ocorrencias") : null}
      {exibirWidget("media") ? card("Média geral", numero(resumo.media_geral).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }), "coluna com a média numérica registrada", <GraduationCap className="h-5 w-5" />, graficoColunas([{ nome: "Média", total: numero(resumo.media_geral), cor: "#7c3aed" }]), "?aba=avaliacoes") : null}
    </div>
    <Card className="shadow-[0_10px_28px_rgba(15,23,42,0.08)]"><CardHeader><div className="flex items-center justify-between gap-3"><CardTitle>Central de pendências</CardTitle><span className="rounded-lg bg-red-50 p-2 text-red-700"><AlertTriangle className="h-4 w-4" /></span></div></CardHeader><CardContent className="space-y-3">{pendencias.map((item) => <button type="button" key={item.chave} onClick={() => navigate(destinoPendencia(item.destino))} className="grid w-full grid-cols-[110px_1fr_60px] items-center gap-2 rounded-md border border-[var(--g3-border)] bg-[var(--g3-card-soft)] p-3 text-left text-sm hover:border-emerald-600"><span className={item.prioridade === "Crítica" ? "font-semibold text-red-700" : item.prioridade === "Atenção" ? "font-semibold text-amber-700" : "font-semibold text-emerald-700"}>{item.prioridade}</span><span>{item.descricao}</span><strong className="text-right">{item.total}</strong></button>)}{!pendencias.length ? <p className="text-sm text-[var(--g3-muted)]">Nenhuma pendência educacional calculada para os filtros atuais.</p> : null}{pendencias.length ? <div className="rounded-xl border border-red-100 bg-red-50/50 p-2"><p className="mb-1 text-xs font-semibold text-red-800">Distribuição das pendências</p><div className="h-40">{graficoColunas(pendenciasGrafico)}</div></div> : null}</CardContent></Card>
    <div className="grid gap-4 lg:grid-cols-2"><Card className="shadow-[0_10px_28px_rgba(15,23,42,0.08)]"><CardHeader><div className="flex items-center justify-between gap-3"><CardTitle>Atenção da gestão</CardTitle><span className="rounded-lg bg-amber-50 p-2 text-amber-700"><AlertTriangle className="h-4 w-4" /></span></div></CardHeader><CardContent className="space-y-2">{atencoes.map(([prioridade, descricao, total, destino]) => <button type="button" key={descricao} onClick={() => navigate(`/educacional${destino}`)} className="grid w-full grid-cols-[90px_1fr_50px] items-center gap-2 rounded-md border border-[var(--g3-border)] bg-[var(--g3-card-soft)] p-3 text-left text-sm hover:border-emerald-600"><span className="font-semibold text-amber-700">{prioridade}</span><span>{descricao}</span><strong className="text-right">{total}</strong></button>)}<div className="rounded-xl border border-amber-100 bg-amber-50/60 p-2"><p className="mb-1 text-xs font-semibold text-amber-800">Distribuição dos alertas</p><div className="h-28">{graficoBarrasHorizontais(atencoesGrafico)}</div></div></CardContent></Card><Card className="shadow-[0_10px_28px_rgba(15,23,42,0.08)]"><CardHeader><CardTitle>Resumo operacional</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3"><div className="flex items-start justify-between gap-2"><div><p className="text-xs text-[var(--g3-muted)]">Frequência geral</p><p className="text-xl font-bold">{frequencia >= 90 ? "Regular" : frequencia >= 80 ? "Em atenção" : "Crítica"}</p><p className="text-xs text-[var(--g3-muted)]">Meta: ≥ 90%</p></div><span className="rounded-lg bg-white/80 p-1.5 text-emerald-700"><BarChart3 className="h-4 w-4" /></span></div><div className="mt-2 h-24">{graficoFrequencia}</div></div><div className="rounded-xl border border-amber-100 bg-amber-50 p-3"><div className="flex items-start justify-between gap-2"><div><p className="text-xs text-[var(--g3-muted)]">Chamadas pendentes</p><p className="text-xl font-bold">{numero(resumo.chamadas_pendentes)}</p><p className="text-xs text-[var(--g3-muted)]">Aulas sem frequência lançada</p></div><span className="rounded-lg bg-white/80 p-1.5 text-amber-700"><ClipboardCheck className="h-4 w-4" /></span></div><div className="mt-2 h-24">{graficoBarrasHorizontais([{ nome: "Pendentes", total: numero(resumo.chamadas_pendentes), cor: "#f59e0b" }])}</div></div></CardContent></Card></div>
    <Card><CardHeader><CardTitle>Índice de Atenção Educacional</CardTitle></CardHeader><CardContent><p className="text-sm text-[var(--g3-muted)]">Classificação baseada nos registros reais de frequência, faltas, avaliações e ocorrências disponíveis no banco.</p><div className="mt-3 grid gap-2 sm:grid-cols-4"><div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm"><strong>Regular</strong><p className="text-xs text-[var(--g3-muted)]">Sem sinal crítico</p></div><div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm"><strong>Atenção</strong><p className="text-xs text-[var(--g3-muted)]">Queda ou frequência reduzida</p></div><div className="rounded-md border border-orange-200 bg-orange-50 p-3 text-sm"><strong>Alerta</strong><p className="text-xs text-[var(--g3-muted)]">Múltiplos indicadores</p></div><div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm"><strong>Intervenção prioritária</strong><p className="text-xs text-[var(--g3-muted)]">Frequência crítica ou evasão</p></div></div></CardContent></Card>
  </div>;
}
