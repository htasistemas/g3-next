import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, CalendarCheck2, ClipboardCheck, GraduationCap, UsersRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { educacionalService } from "@/services/educacional.service";
import { unidadesAssistenciaisService } from "@/services/unidades-assistenciais.service";
import type { EducacionalItem } from "@/types/educacional";
import type { UnidadeAssistencial } from "@/types/unidade-assistencial";

type Props = { resumo: Record<string, unknown>; carregando: boolean };
type Filtros = { unidade_id?: string; ano_letivo_id?: string; etapa_id?: string; turma_id?: string; turno?: string };
const numero = (valor: unknown) => Number(valor ?? 0);
const textoItem = (item: EducacionalItem) => String(item.nome ?? item.descricao ?? item.ano ?? item.id);
const percentual = (valor: number) => `${valor.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

export function EducacionalVisaoGeralPage({ resumo: inicial, carregando }: Props) {
  const navigate = useNavigate();
  const [resumo, setResumo] = useState<Record<string, unknown>>(inicial);
  const [filtros, setFiltros] = useState<Filtros>({});
  const [opcoes, setOpcoes] = useState<{ unidades: UnidadeAssistencial[]; anos: EducacionalItem[]; etapas: EducacionalItem[]; turmas: EducacionalItem[] }>({ unidades: [], anos: [], etapas: [], turmas: [] });
  const [erro, setErro] = useState("");
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
    ["Crítica", "Frequência abaixo de 75%", criticos, "?aba=frequencias"],
    ["Crítica", "Cinco ou mais faltas", numero(resumo.risco_evasao), "?aba=frequencias"],
    ["Atenção", "Alunos em risco educacional", risco, "?aba=matriculas"],
    ["Acompanhar", "Chamadas não realizadas", numero(resumo.chamadas_pendentes), "?grupo=diario&aba=frequencias"]
  ] as const, [criticos, risco, resumo.chamadas_pendentes, resumo.risco_evasao]);
  const card = (titulo: string, valor: string, detalhe: string, icone: React.ReactNode, destino?: string, destaque = false) => <button type="button" className="text-left" onClick={() => destino && navigate(`/educacional${destino}`)}><Card className={destaque ? "border-amber-400 bg-amber-50/70" : "h-full"}><CardContent className="p-4"><div className="flex justify-between"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--g3-muted)]">{titulo}</p><span className="text-emerald-700">{icone}</span></div><p className="mt-2 text-3xl font-bold">{valor}</p><p className="mt-1 text-xs text-[var(--g3-muted)]">{detalhe}</p></CardContent></Card></button>;
  return <div className="space-y-4">
    <div className="flex flex-wrap items-end gap-2 rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card-soft)] p-3">
      <div><label className="text-[11px] font-semibold uppercase text-[var(--g3-muted)]">Unidade</label><Select value={filtros.unidade_id ?? ""} onChange={(event) => setFiltros((atual) => ({ ...atual, unidade_id: event.target.value }))}><option value="">Todas</option>{opcoes.unidades.map((item) => <option key={item.id_unidade} value={item.id_unidade}>{item.nome_fantasia}</option>)}</Select></div>
      <div><label className="text-[11px] font-semibold uppercase text-[var(--g3-muted)]">Ano letivo</label><Select value={filtros.ano_letivo_id ?? ""} onChange={(event) => setFiltros((atual) => ({ ...atual, ano_letivo_id: event.target.value }))}><option value="">Todos</option>{opcoes.anos.map((item) => <option key={item.id} value={item.id}>{textoItem(item)}</option>)}</Select></div>
      <div><label className="text-[11px] font-semibold uppercase text-[var(--g3-muted)]">Etapa</label><Select value={filtros.etapa_id ?? ""} onChange={(event) => setFiltros((atual) => ({ ...atual, etapa_id: event.target.value }))}><option value="">Todas</option>{opcoes.etapas.map((item) => <option key={item.id} value={item.id}>{textoItem(item)}</option>)}</Select></div>
      <div><label className="text-[11px] font-semibold uppercase text-[var(--g3-muted)]">Turma</label><Select value={filtros.turma_id ?? ""} onChange={(event) => setFiltros((atual) => ({ ...atual, turma_id: event.target.value }))}><option value="">Todas</option>{opcoes.turmas.map((item) => <option key={item.id} value={item.id}>{textoItem(item)}</option>)}</Select></div>
      <div><label className="text-[11px] font-semibold uppercase text-[var(--g3-muted)]">Turno</label><Select value={filtros.turno ?? ""} onChange={(event) => setFiltros((atual) => ({ ...atual, turno: event.target.value }))}><option value="">Todos</option><option value="MATUTINO">Matutino</option><option value="VESPERTINO">Vespertino</option><option value="INTEGRAL">Integral</option><option value="NOTURNO">Noturno</option></Select></div>
      <Button type="button" onClick={() => void atualizarIndicadores()} disabled={carregando}>Atualizar indicadores</Button>
    </div>
    {erro ? <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{erro}</p> : null}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {card("Alunos ativos", String(numero(resumo.alunos_ativos)), "cadastros educacionais ativos", <UsersRound className="h-5 w-5" />, "?aba=matriculas")}
      {card("Matrículas ativas", String(numero(resumo.matriculas_ativas)), `${numero(matriculas.pendente)} pendentes`, <ClipboardCheck className="h-5 w-5" />, "?aba=matriculas")}
      {card("Turmas ativas", String(numero(resumo.turmas_ativas)), "turmas em funcionamento", <GraduationCap className="h-5 w-5" />, "?aba=estrutura&recurso=turmas")}
      {card("Frequência geral", percentual(frequencia), frequencia >= 90 ? "Dentro do indicador esperado" : frequencia >= 80 ? "Faixa de atenção" : "Abaixo do indicador esperado", frequencia >= 90 ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />)}
      {card("Alunos em risco", String(risco), `${criticos} críticos · ${Math.max(0, risco - criticos)} em atenção`, <AlertTriangle className="h-5 w-5" />, "?aba=matriculas", true)}
      {card("Risco de evasão", String(numero(resumo.risco_evasao)), "cinco ou mais faltas registradas", <AlertTriangle className="h-5 w-5" />, "?aba=matriculas", true)}
      {card("Ocorrências no mês", String(numero(resumo.ocorrencias_mes)), `${numero(resumo.ocorrencias_recorrentes)} alunos necessitam acompanhamento`, <CalendarCheck2 className="h-5 w-5" />, "?aba=ocorrencias")}
      {card("Média geral", numero(resumo.media_geral).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }), "notas numéricas registradas", <GraduationCap className="h-5 w-5" />, "?aba=avaliacoes")}
    </div>
    <div className="grid gap-4 lg:grid-cols-2"><Card><CardHeader><CardTitle>Atenção da gestão</CardTitle></CardHeader><CardContent className="space-y-2">{atencoes.map(([prioridade, descricao, total, destino]) => <button type="button" key={descricao} onClick={() => navigate(`/educacional${destino}`)} className="grid w-full grid-cols-[90px_1fr_50px] items-center gap-2 rounded-md border border-[var(--g3-border)] bg-[var(--g3-card-soft)] p-3 text-left text-sm hover:border-emerald-600"><span className="font-semibold text-amber-700">{prioridade}</span><span>{descricao}</span><strong className="text-right">{total}</strong></button>)}</CardContent></Card><Card><CardHeader><CardTitle>Resumo operacional</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2"><div className="rounded-md bg-emerald-50 p-3"><p className="text-xs text-[var(--g3-muted)]">Frequência geral</p><p className="text-xl font-bold">{frequencia >= 90 ? "Regular" : frequencia >= 80 ? "Em atenção" : "Crítica"}</p><p className="text-xs text-[var(--g3-muted)]">Meta: ≥ 90%</p></div><div className="rounded-md bg-emerald-50 p-3"><p className="text-xs text-[var(--g3-muted)]">Chamadas pendentes</p><p className="text-xl font-bold">{numero(resumo.chamadas_pendentes)}</p><p className="text-xs text-[var(--g3-muted)]">Aulas sem frequência lançada</p></div></CardContent></Card></div>
    <Card><CardHeader><CardTitle>Índice de Atenção Educacional</CardTitle></CardHeader><CardContent><p className="text-sm text-[var(--g3-muted)]">Classificação baseada nos registros reais de frequência, faltas, avaliações e ocorrências disponíveis no banco.</p><div className="mt-3 grid gap-2 sm:grid-cols-4"><div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm"><strong>Regular</strong><p className="text-xs text-[var(--g3-muted)]">Sem sinal crítico</p></div><div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm"><strong>Atenção</strong><p className="text-xs text-[var(--g3-muted)]">Queda ou frequência reduzida</p></div><div className="rounded-md border border-orange-200 bg-orange-50 p-3 text-sm"><strong>Alerta</strong><p className="text-xs text-[var(--g3-muted)]">Múltiplos indicadores</p></div><div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm"><strong>Intervenção prioritária</strong><p className="text-xs text-[var(--g3-muted)]">Frequência crítica ou evasão</p></div></div></CardContent></Card>
  </div>;
}
