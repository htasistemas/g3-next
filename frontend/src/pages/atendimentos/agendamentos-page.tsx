import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarRange,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileDown,
  PhoneCall,
  Plus,
  Printer,
  Save,
  Search,
  Users,
  X
} from "lucide-react";
import { AdminPageLayout, type AdminAction, type AdminTab } from "@/components/admin/admin-page-layout";
import { PopupConfirmacao, PopupMensagem, type PopupMensagemState } from "@/components/admin/admin-popups";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  useAgendamentos,
  useCancelarAgendamento,
  useConcluirAgendamento,
  useConfirmarAgendamento,
  useConverterListaEsperaAgendamento,
  useCriarListaEsperaAgendamento,
  useIndicadoresAgendamentos,
  useListaEsperaAgendamentos,
  useSalvarAgendamento
} from "@/features/agendamentos/use-agendamentos";
import { imprimirConteudoAtual } from "@/lib/report-utils";
import type { Agendamento, AgendamentoFiltros, AgendamentoListaEspera } from "@/types/agendamento";

type AbaId = "agenda" | "espera" | "indicadores";

const abas: AdminTab[] = [
  { id: "agenda", label: "Agenda operacional", icon: CalendarRange },
  { id: "espera", label: "Lista de espera", icon: Users },
  { id: "indicadores", label: "Painel inteligente", icon: ClipboardList }
];

const filtrosPadrao: AgendamentoFiltros = { busca: "", unidade: "", setor: "", status: "", periodoInicio: "", periodoFim: "", visualizacao: "dia" };
const agendamentoPadrao: Agendamento = {
  beneficiarioNome: "",
  unidade: "",
  setor: "",
  tipoAtendimento: "",
  data: new Date().toISOString().slice(0, 10),
  horaInicial: "",
  modalidade: "Presencial",
  prioridade: "Normal",
  status: "Agendado"
};
const esperaPadrao: AgendamentoListaEspera = {
  beneficiarioNome: "",
  tipoAtendimento: "",
  prioridade: "Normal",
  dataEntrada: new Date().toISOString().slice(0, 10)
};

const formatarData = (data?: string) => {
  if (!data) return "---";
  const [ano, mes, dia] = data.slice(0, 10).split("-");
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : data;
};

const corStatus = (status?: string) =>
  status === "Confirmado"
    ? "bg-emerald-100 text-emerald-800"
    : status === "Em atendimento"
      ? "bg-sky-100 text-sky-800"
      : status === "Atendido"
        ? "bg-slate-200 text-slate-800"
        : status === "Cancelado"
          ? "bg-rose-100 text-rose-800"
          : status === "Encaixe"
            ? "bg-violet-100 text-violet-800"
            : "bg-[var(--g3-primary-soft)] text-[var(--g3-active)]";

export function AgendamentosPage() {
  const navigate = useNavigate();
  const [abaAtiva, setAbaAtiva] = useState<AbaId>("agenda");
  const [filtroDraft, setFiltroDraft] = useState(filtrosPadrao);
  const [filtros, setFiltros] = useState(filtrosPadrao);
  const [form, setForm] = useState<Agendamento>(agendamentoPadrao);
  const [esperaForm, setEsperaForm] = useState<AgendamentoListaEspera>(esperaPadrao);
  const [selecionadoId, setSelecionadoId] = useState<number | null>(null);
  const [popup, setPopup] = useState<PopupMensagemState | null>(null);
  const [confirmarCancelar, setConfirmarCancelar] = useState(false);

  const agendamentosQuery = useAgendamentos(filtros);
  const listaEsperaQuery = useListaEsperaAgendamentos();
  const indicadoresQuery = useIndicadoresAgendamentos(filtros);
  const salvarMutation = useSalvarAgendamento();
  const cancelarMutation = useCancelarAgendamento();
  const concluirMutation = useConcluirAgendamento();
  const confirmarMutation = useConfirmarAgendamento();
  const criarEsperaMutation = useCriarListaEsperaAgendamento();
  const converterMutation = useConverterListaEsperaAgendamento();

  const agendamentos = agendamentosQuery.data ?? [];
  const listaEspera = listaEsperaQuery.data ?? [];
  const indicadores = indicadoresQuery.data ?? {};
  const selecionado = agendamentos.find((item) => item.id === selecionadoId) ?? null;
  const agendaPorProfissional = useMemo(
    () =>
      agendamentos.reduce<Record<string, number>>((acc, item) => {
        const chave = item.profissionalNome?.trim() || "Sem profissional definido";
        acc[chave] = (acc[chave] ?? 0) + 1;
        return acc;
      }, {}),
    [agendamentos]
  );
  const agendaAgrupadaPorDia = useMemo(
    () =>
      Object.entries(
        agendamentos.reduce<Record<string, Agendamento[]>>((acc, item) => {
          const chave = item.data || "Sem data";
          if (!acc[chave]) acc[chave] = [];
          acc[chave].push(item);
          return acc;
        }, {})
      )
        .sort(([dataA], [dataB]) => dataA.localeCompare(dataB))
        .map(([data, itens]) => [
          data,
          [...itens].sort((a, b) => (a.horaInicial || "").localeCompare(b.horaInicial || ""))
        ] as const),
    [agendamentos]
  );

  const exportar = () => {
    const linhas = ["Data;Hora;Beneficiário;Tipo;Profissional;Unidade;Setor;Status"];
    agendamentos.forEach((item) => linhas.push([item.data, item.horaInicial, item.beneficiarioNome, item.tipoAtendimento, item.profissionalNome, item.unidade, item.setor, item.status].join(";")));
    const blob = new Blob([linhas.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "agendamentos.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const novo = (encaixe = false) => {
    setSelecionadoId(null);
    setForm({ ...agendamentoPadrao, permitirConflito: encaixe, status: encaixe ? "Encaixe" : "Agendado" });
    setAbaAtiva("agenda");
  };

  const acoes: AdminAction[] = [
    { label: "Buscar", icon: Search, onClick: () => setFiltros(filtroDraft), variant: "outline" },
    { label: "Novo", icon: Plus, onClick: () => novo(false), variant: "default" },
    { label: "Encaixe", icon: Clock3, onClick: () => novo(true), variant: "outline" },
    { label: "Espera", icon: Users, onClick: () => setAbaAtiva("espera"), variant: "outline" },
    { label: "Imprimir", icon: Printer, onClick: () => imprimirConteudoAtual({ titulo: "Agendamentos" }), variant: "outline" },
    { label: "Exportar", icon: FileDown, onClick: exportar, variant: "outline" },
    { label: "Salvar", icon: Save, onClick: () => void 0, variant: "default" },
    { label: "Confirmar", icon: CheckCircle2, onClick: () => void 0, variant: "outline", disabled: !selecionado?.id },
    { label: "Concluir", icon: PhoneCall, onClick: () => void 0, variant: "outline", disabled: !selecionado?.id },
    { label: "Cancelar", icon: X, onClick: () => setConfirmarCancelar(true), variant: "danger", disabled: !selecionado?.id },
    { label: "Fechar", icon: X, onClick: () => navigate("/dashboard/visao-geral"), variant: "outline" }
  ];

  async function executarSalvar() {
    try {
      const salvo = await salvarMutation.mutateAsync(form);
      if (salvo?.id) setSelecionadoId(salvo.id);
      setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: form.id ? "Agendamento atualizado com sucesso." : "Agendamento realizado com sucesso." });
    } catch (error: any) {
      setPopup({ tipo: "erro", titulo: "Erro", texto: error?.response?.data?.message ?? "Não foi possível salvar o agendamento." });
    }
  }

  async function executarSalvarEspera() {
    try {
      await criarEsperaMutation.mutateAsync(esperaForm);
      setEsperaForm(esperaPadrao);
      setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Lista de espera registrada com sucesso." });
    } catch (error: any) {
      setPopup({ tipo: "erro", titulo: "Erro", texto: error?.response?.data?.message ?? "Não foi possível salvar a lista de espera." });
    }
  }

  async function executarConfirmacao() {
    if (!selecionado?.id) return;
    try {
      await confirmarMutation.mutateAsync({ id: selecionado.id, payload: { canal: "Manual" } });
      setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Agendamento confirmado com sucesso." });
    } catch (error: any) {
      setPopup({ tipo: "erro", titulo: "Erro", texto: error?.response?.data?.message ?? "Não foi possível confirmar o agendamento." });
    }
  }

  async function executarConclusao() {
    if (!selecionado?.id) return;
    try {
      await concluirMutation.mutateAsync({ id: selecionado.id, payload: { resumo: form.concluidoResumo || form.observacaoInterna || "Atendimento concluído.", comparecimento: "Presente" } });
      setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Atendimento concluído com sucesso." });
    } catch (error: any) {
      setPopup({ tipo: "erro", titulo: "Erro", texto: error?.response?.data?.message ?? "Não foi possível concluir o atendimento." });
    }
  }

  acoes[6].onClick = () => void (abaAtiva === "espera" ? executarSalvarEspera() : executarSalvar());
  acoes[6].disabled = salvarMutation.isPending || criarEsperaMutation.isPending || converterMutation.isPending;
  acoes[7].onClick = () => void executarConfirmacao();
  acoes[8].onClick = () => void executarConclusao();

  return (
    <>
      <AdminPageLayout tabs={abas} activeTab={abaAtiva} onChangeTab={(tabId) => setAbaAtiva(tabId as AbaId)} actions={acoes} sectionLabel="Atendimentos" pageTitle="Agendamentos" activeTitle={abas.find((item) => item.id === abaAtiva)?.label} codeBadge={selecionado?.id ? `Código: ${selecionado.id}` : "Novo"}>
        <section className="space-y-4">
          <Card className="border-[var(--g3-border)]">
            <CardHeader><CardTitle className="text-sm">Filtros superiores</CardTitle></CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
              <div className="space-y-1 xl:col-span-2"><Label>Busca rápida</Label><Input value={filtroDraft.busca ?? ""} onChange={(event) => setFiltroDraft((atual) => ({ ...atual, busca: event.target.value }))} placeholder="Beneficiário, profissional, unidade ou tipo" /></div>
              <div className="space-y-1"><Label>Unidade</Label><Input value={filtroDraft.unidade ?? ""} onChange={(event) => setFiltroDraft((atual) => ({ ...atual, unidade: event.target.value }))} /></div>
              <div className="space-y-1"><Label>Setor</Label><Input value={filtroDraft.setor ?? ""} onChange={(event) => setFiltroDraft((atual) => ({ ...atual, setor: event.target.value }))} /></div>
              <div className="space-y-1"><Label>Status</Label><Select value={filtroDraft.status ?? ""} onChange={(event) => setFiltroDraft((atual) => ({ ...atual, status: event.target.value }))}><option value="">Todos</option><option value="Agendado">Agendado</option><option value="Confirmado">Confirmado</option><option value="Encaixe">Encaixe</option><option value="Em atendimento">Em atendimento</option><option value="Atendido">Atendido</option><option value="Cancelado">Cancelado</option></Select></div>
              <div className="space-y-1"><Label>Período inicial</Label><Input type="date" value={filtroDraft.periodoInicio ?? ""} onChange={(event) => setFiltroDraft((atual) => ({ ...atual, periodoInicio: event.target.value }))} /></div>
              <div className="space-y-1"><Label>Período final</Label><Input type="date" value={filtroDraft.periodoFim ?? ""} onChange={(event) => setFiltroDraft((atual) => ({ ...atual, periodoFim: event.target.value }))} /></div>
              <div className="flex items-end"><Button type="button" variant="outline" className="w-full" onClick={() => { setFiltroDraft(filtrosPadrao); setFiltros(filtrosPadrao); }}>Limpar filtros</Button></div>
            </CardContent>
          </Card>
          {abaAtiva === "agenda" ? (
            <div className="grid gap-4 xl:grid-cols-[1fr_0.95fr]">
              <Card className="border-[var(--g3-border)]">
                <CardHeader><CardTitle className="text-sm">Novo agendamento</CardTitle></CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                  <div className="space-y-1 xl:col-span-3"><Label>Beneficiário</Label><Input value={form.beneficiarioNome} onChange={(event) => setForm((atual) => ({ ...atual, beneficiarioNome: event.target.value }))} /></div>
                  <div className="space-y-1"><Label>Família</Label><Input value={form.familiaNome ?? ""} onChange={(event) => setForm((atual) => ({ ...atual, familiaNome: event.target.value }))} /></div>
                  <div className="space-y-1"><Label>Telefone</Label><Input value={form.telefone ?? ""} onChange={(event) => setForm((atual) => ({ ...atual, telefone: event.target.value }))} /></div>
                  <div className="space-y-1"><Label>Unidade</Label><Input value={form.unidade} onChange={(event) => setForm((atual) => ({ ...atual, unidade: event.target.value }))} /></div>
                  <div className="space-y-1"><Label>Setor</Label><Input value={form.setor} onChange={(event) => setForm((atual) => ({ ...atual, setor: event.target.value }))} /></div>
                  <div className="space-y-1 xl:col-span-2"><Label>Tipo de atendimento</Label><Input value={form.tipoAtendimento} onChange={(event) => setForm((atual) => ({ ...atual, tipoAtendimento: event.target.value }))} /></div>
                  <div className="space-y-1"><Label>Profissional</Label><Input value={form.profissionalNome ?? ""} onChange={(event) => setForm((atual) => ({ ...atual, profissionalNome: event.target.value }))} /></div>
                  <div className="space-y-1"><Label>Data</Label><Input type="date" value={form.data} onChange={(event) => setForm((atual) => ({ ...atual, data: event.target.value }))} /></div>
                  <div className="space-y-1"><Label>Hora inicial</Label><Input type="time" value={form.horaInicial} onChange={(event) => setForm((atual) => ({ ...atual, horaInicial: event.target.value }))} /></div>
                  <div className="space-y-1"><Label>Hora final</Label><Input type="time" value={form.horaFinal ?? ""} onChange={(event) => setForm((atual) => ({ ...atual, horaFinal: event.target.value }))} /></div>
                  <div className="space-y-1"><Label>Sala</Label><Input value={form.sala ?? ""} onChange={(event) => setForm((atual) => ({ ...atual, sala: event.target.value }))} /></div>
                  <div className="space-y-1"><Label>Recurso</Label><Input value={form.recurso ?? ""} onChange={(event) => setForm((atual) => ({ ...atual, recurso: event.target.value }))} /></div>
                  <div className="space-y-1"><Label>Modalidade</Label><Select value={form.modalidade} onChange={(event) => setForm((atual) => ({ ...atual, modalidade: event.target.value as Agendamento["modalidade"] }))}><option value="Presencial">Presencial</option><option value="Remoto">Remoto</option><option value="Domiciliar">Domiciliar</option><option value="Externo">Externo</option><option value="Coletivo">Coletivo</option></Select></div>
                  <div className="space-y-1"><Label>Prioridade</Label><Select value={form.prioridade} onChange={(event) => setForm((atual) => ({ ...atual, prioridade: event.target.value as Agendamento["prioridade"] }))}><option value="Normal">Normal</option><option value="Media">Média</option><option value="Alta">Alta</option><option value="Urgencia">Urgência</option></Select></div>
                  <div className="space-y-1"><Label>Status</Label><Select value={form.status ?? "Agendado"} onChange={(event) => setForm((atual) => ({ ...atual, status: event.target.value as Agendamento["status"] }))}><option value="Agendado">Agendado</option><option value="Confirmado">Confirmado</option><option value="Encaixe">Encaixe</option><option value="Em atendimento">Em atendimento</option><option value="Atendido">Atendido</option><option value="Retorno pendente">Retorno pendente</option></Select></div>
                  <div className="space-y-1 xl:col-span-3"><Label>Motivo</Label><Textarea rows={3} value={form.motivo ?? ""} onChange={(event) => setForm((atual) => ({ ...atual, motivo: event.target.value }))} /></div>
                  <div className="space-y-1 xl:col-span-3"><Label>Observação interna</Label><Textarea rows={3} value={form.observacaoInterna ?? ""} onChange={(event) => setForm((atual) => ({ ...atual, observacaoInterna: event.target.value }))} /></div>
                  <div className="space-y-1 xl:col-span-3"><Label>Resumo pós-atendimento</Label><Textarea rows={3} value={form.concluidoResumo ?? ""} onChange={(event) => setForm((atual) => ({ ...atual, concluidoResumo: event.target.value }))} /></div>
                  <div className="space-y-1"><Label>Retorno programado</Label><Input type="date" value={form.retornoProgramadoPara ?? ""} onChange={(event) => setForm((atual) => ({ ...atual, retornoProgramadoPara: event.target.value }))} /></div>
                  <div className="space-y-1"><Label>Desfecho</Label><Input value={form.desfecho ?? ""} onChange={(event) => setForm((atual) => ({ ...atual, desfecho: event.target.value }))} /></div>
                </CardContent>
              </Card>
              <div className="space-y-4">
                <Card className="border-[var(--g3-border)]">
                  <CardHeader><CardTitle className="text-sm">Painel do período</CardTitle></CardHeader>
                  <CardContent className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card)] p-3"><p className="text-xs font-semibold uppercase tracking-wide text-[var(--g3-muted)]">Total agendado</p><p className="mt-1 text-2xl font-bold text-[var(--g3-foreground)]">{agendamentos.length}</p></div>
                    <div className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card)] p-3"><p className="text-xs font-semibold uppercase tracking-wide text-[var(--g3-muted)]">Confirmados</p><p className="mt-1 text-2xl font-bold text-[var(--g3-foreground)]">{indicadores.confirmados ?? 0}</p></div>
                    <div className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card)] p-3"><p className="text-xs font-semibold uppercase tracking-wide text-[var(--g3-muted)]">Em atendimento</p><p className="mt-1 text-2xl font-bold text-[var(--g3-foreground)]">{indicadores.emAtendimento ?? 0}</p></div>
                    <div className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card)] p-3"><p className="text-xs font-semibold uppercase tracking-wide text-[var(--g3-muted)]">Lista de espera</p><p className="mt-1 text-2xl font-bold text-[var(--g3-foreground)]">{listaEspera.length}</p></div>
                  </CardContent>
                </Card>
                <Card className="border-[var(--g3-border)]">
                  <CardHeader><CardTitle className="text-sm">Agenda por dia</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {agendamentosQuery.isLoading ? (
                      <div className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card)] px-4 py-6 text-sm text-[var(--g3-muted)]">
                        Carregando agendamentos...
                      </div>
                    ) : agendaAgrupadaPorDia.length ? (
                      agendaAgrupadaPorDia.map(([data, itens]) => (
                        <div key={data} className="overflow-hidden rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card)]">
                          <div className="flex items-center justify-between border-b border-[var(--g3-border)] bg-[var(--g3-primary-soft)] px-3 py-2">
                            <div>
                              <p className="text-sm font-semibold text-[var(--g3-active)]">{formatarData(data)}</p>
                              <p className="text-[11px] text-[var(--g3-muted)]">{itens.length} agendamento(s) no dia</p>
                            </div>
                            <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-[var(--g3-active)]">Dia</span>
                          </div>
                          <div className="space-y-2 p-3">
                            {itens.map((item) => (
                              <button
                                key={item.id ?? `${item.data}-${item.horaInicial}-${item.beneficiarioNome}`}
                                type="button"
                                onClick={() => {
                                  setSelecionadoId(item.id ?? null);
                                  setForm({ ...agendamentoPadrao, ...item });
                                }}
                                className={`w-full rounded-lg border px-3 py-3 text-left transition-colors ${
                                  selecionadoId === item.id
                                    ? "border-[var(--g3-active)] bg-[var(--g3-primary-soft)]"
                                    : "border-[var(--g3-border)] bg-white hover:bg-[var(--g3-primary-soft)]/45"
                                }`}
                              >
                                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                  <div className="min-w-0 space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="rounded-full bg-[var(--g3-card)] px-2 py-1 text-xs font-semibold text-[var(--g3-active)]">
                                        {item.horaInicial || "---"}
                                      </span>
                                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${corStatus(item.status)}`}>
                                        {item.status || "Agendado"}
                                      </span>
                                    </div>
                                    <p className="truncate text-sm font-semibold text-[var(--g3-foreground)]">{item.beneficiarioNome}</p>
                                    <p className="text-xs text-[var(--g3-muted)]">
                                      {item.tipoAtendimento} - {item.profissionalNome || "Sem profissional definido"}
                                    </p>
                                    <p className="text-xs text-[var(--g3-muted)]">
                                      {item.unidade || "Sem unidade"} - {item.setor || "Sem setor"}
                                      {item.sala ? ` - Sala ${item.sala}` : ""}
                                    </p>
                                  </div>
                                  <div className="max-w-[280px] text-xs text-[var(--g3-muted)]">
                                    {item.motivo || item.observacaoInterna || "Sem observa--o operacional."}
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card)] px-4 py-6 text-sm text-[var(--g3-muted)]">
                        Nenhum agendamento encontrado para os filtros informados.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : null}
          {abaAtiva === "espera" ? (
            <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
              <Card className="border-[var(--g3-border)]">
                <CardHeader><CardTitle className="text-sm">Novo item da lista de espera</CardTitle></CardHeader>
                <CardContent className="grid gap-3">
                  <div className="space-y-1"><Label>Beneficiário</Label><Input value={esperaForm.beneficiarioNome} onChange={(event) => setEsperaForm((atual) => ({ ...atual, beneficiarioNome: event.target.value }))} /></div>
                  <div className="space-y-1"><Label>Tipo de atendimento desejado</Label><Input value={esperaForm.tipoAtendimento} onChange={(event) => setEsperaForm((atual) => ({ ...atual, tipoAtendimento: event.target.value }))} /></div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1"><Label>Unidade</Label><Input value={esperaForm.unidade ?? ""} onChange={(event) => setEsperaForm((atual) => ({ ...atual, unidade: event.target.value }))} /></div>
                    <div className="space-y-1"><Label>Setor</Label><Input value={esperaForm.setor ?? ""} onChange={(event) => setEsperaForm((atual) => ({ ...atual, setor: event.target.value }))} /></div>
                    <div className="space-y-1"><Label>Profissional preferencial</Label><Input value={esperaForm.profissionalPreferencial ?? ""} onChange={(event) => setEsperaForm((atual) => ({ ...atual, profissionalPreferencial: event.target.value }))} /></div>
                    <div className="space-y-1"><Label>Prioridade</Label><Select value={esperaForm.prioridade ?? "Normal"} onChange={(event) => setEsperaForm((atual) => ({ ...atual, prioridade: event.target.value as AgendamentoListaEspera["prioridade"] }))}><option value="Normal">Normal</option><option value="Media">Média</option><option value="Alta">Alta</option><option value="Urgencia">Urgência</option></Select></div>
                  </div>
                  <div className="space-y-1"><Label>Motivo</Label><Textarea rows={3} value={esperaForm.motivo ?? ""} onChange={(event) => setEsperaForm((atual) => ({ ...atual, motivo: event.target.value }))} /></div>
                </CardContent>
              </Card>
              <Card className="border-[var(--g3-border)]">
                <CardHeader><CardTitle className="text-sm">Fila ativa de espera</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {listaEsperaQuery.isLoading ? <div className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card)] px-4 py-6 text-sm text-[var(--g3-muted)]">Carregando lista de espera...</div> : listaEspera.length ? listaEspera.map((item) => <div key={item.id} className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card)] p-3"><div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div className="space-y-1"><p className="text-sm font-semibold text-[var(--g3-foreground)]">{item.beneficiarioNome}</p><p className="text-xs text-[var(--g3-muted)]">{item.tipoAtendimento} • {item.unidade || "Sem unidade"} • {item.setor || "Sem setor"}</p><p className="text-xs text-[var(--g3-muted)]">Entrada em {formatarData(item.dataEntrada)} • Prioridade {item.prioridade || "Normal"}</p></div><Button type="button" variant="outline" onClick={() => void converterMutation.mutateAsync({ id: item.id as number, payload: { ...agendamentoPadrao, beneficiarioId: item.beneficiarioId, beneficiarioNome: item.beneficiarioNome, familiaId: item.familiaId, familiaNome: item.familiaNome, unidade: item.unidade || "", setor: item.setor || "", tipoAtendimento: item.tipoAtendimento, profissionalNome: item.profissionalPreferencial, prioridade: item.prioridade ?? "Normal" } }).then((convertido) => { if (convertido?.id) { setSelecionadoId(convertido.id); setForm({ ...agendamentoPadrao, ...convertido }); setAbaAtiva("agenda"); } setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Item convertido em agendamento com sucesso." }); }).catch((error: any) => setPopup({ tipo: "erro", titulo: "Erro", texto: error?.response?.data?.message ?? "Não foi possível converter a lista de espera." }))}>Converter em agendamento</Button></div></div>) : <div className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card)] px-4 py-6 text-sm text-[var(--g3-muted)]">Nenhum item na fila de espera.</div>}
                </CardContent>
              </Card>
            </div>
          ) : null}
          {abaAtiva === "indicadores" ? (
            <div className="grid gap-4 xl:grid-cols-2">
              <Card className="border-[var(--g3-border)]"><CardHeader><CardTitle className="text-sm">Indicadores principais</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-2">{[{ label: "Total no período", value: indicadores.totalNoPeriodo ?? agendamentos.length }, { label: "Total do dia", value: indicadores.totalHoje ?? 0 }, { label: "Concluídos", value: indicadores.concluidos ?? 0 }, { label: "Faltas", value: indicadores.faltas ?? 0 }, { label: "Retornos pendentes", value: indicadores.retornosPendentes ?? 0 }, { label: "Encaixes", value: indicadores.encaixes ?? 0 }].map((card) => <div key={card.label} className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card)] p-3"><p className="text-xs font-semibold uppercase tracking-wide text-[var(--g3-muted)]">{card.label}</p><p className="mt-1 text-2xl font-bold text-[var(--g3-foreground)]">{card.value}</p></div>)}</CardContent></Card>
              <Card className="border-[var(--g3-border)]"><CardHeader><CardTitle className="text-sm">Agenda por profissional</CardTitle></CardHeader><CardContent className="space-y-2">{Object.entries(agendaPorProfissional).length ? Object.entries(agendaPorProfissional).map(([profissional, total]) => <div key={profissional} className="flex items-center justify-between rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card)] px-3 py-2"><span className="text-sm text-[var(--g3-foreground)]">{profissional}</span><span className="rounded-full bg-[var(--g3-primary-soft)] px-2 py-1 text-xs font-semibold text-[var(--g3-active)]">{total}</span></div>) : <p className="text-sm text-[var(--g3-muted)]">Sem dados para o período filtrado.</p>}</CardContent></Card>
            </div>
          ) : null}
        </section>
      </AdminPageLayout>
      {popup ? <PopupMensagem popup={popup} onClose={() => setPopup(null)} /> : null}
      <PopupConfirmacao aberto={confirmarCancelar} titulo="Cancelar agendamento" texto="Deseja realmente cancelar o agendamento selecionado?" processando={cancelarMutation.isPending} onCancel={() => setConfirmarCancelar(false)} onConfirm={() => { if (!selecionado?.id) return; void cancelarMutation.mutateAsync({ id: selecionado.id, motivo: "Cancelado pela central de agendamentos." }).then(() => { setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Agendamento cancelado com sucesso." }); setConfirmarCancelar(false); }).catch((error: any) => setPopup({ tipo: "erro", titulo: "Erro", texto: error?.response?.data?.message ?? "Não foi possível cancelar o agendamento." })); }} confirmarTexto="Cancelar agendamento" />
    </>
  );
}

