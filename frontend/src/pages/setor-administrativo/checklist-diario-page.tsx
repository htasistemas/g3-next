import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, ClipboardCheck, History, Layers3, RefreshCcw, Save, Settings2, ShieldAlert, Sparkles } from "lucide-react";
import { AdminPageLayout, type AdminAction, type AdminTab } from "@/components/admin/admin-page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PopupMensagem, type PopupMensagemState } from "@/components/admin/admin-popups";
import {
  useAtualizarChecklistConfiguracao,
  useAtualizarChecklistModeloStatus,
  useChecklistConfiguracao,
  useChecklistDiario,
  useChecklistHistorico,
  useChecklistIndicadores,
  useChecklistModelos,
  useChecklistSemanal,
  useClonarChecklistModelo,
  useConcluirChecklistExecucao,
  useDispensarChecklistExecucao,
  useGerarChecklistSemana,
  useNaoSeAplicaChecklistExecucao,
  useReabrirChecklistExecucao,
  useSalvarChecklistModelo
} from "@/features/checklist-diario/use-checklist-diario";
import { useAuth } from "@/hooks/use-auth";
import { toLocalDateISO } from "@/lib/date-utils";
import type { ChecklistExecucao, ChecklistFiltros, ChecklistModeloPayload, ChecklistPrioridade, ChecklistStatus } from "@/types/checklist-diario";

type AbaId = "diario" | "semanal" | "modelos" | "indicadores" | "configuracoes" | "historico";

const abas: AdminTab[] = [
  { id: "diario", label: "Modo diário", icon: ClipboardCheck },
  { id: "semanal", label: "Modo semanal", icon: Layers3 },
  { id: "modelos", label: "Modelos", icon: Sparkles },
  { id: "indicadores", label: "Indicadores", icon: ShieldAlert },
  { id: "configuracoes", label: "Configurações", icon: Settings2 },
  { id: "historico", label: "Histórico", icon: History }
];

const diasSemana = [
  { valor: 1, label: "Segunda-feira" },
  { valor: 2, label: "Terça-feira" },
  { valor: 3, label: "Quarta-feira" },
  { valor: 4, label: "Quinta-feira" },
  { valor: 5, label: "Sexta-feira" },
  { valor: 6, label: "Sábado" },
  { valor: 7, label: "Domingo" }
];

function startOfWeekIso() {
  const date = new Date();
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return toLocalDateISO(date);
}

function endOfWeekIso() {
  const date = new Date(startOfWeekIso());
  date.setDate(date.getDate() + 6);
  return toLocalDateISO(date);
}

function formatarData(data?: string) {
  if (!data) return "Sem data";
  const [ano, mes, dia] = data.slice(0, 10).split("-");
  return `${dia}-${mes}-${ano}`;
}

function formatarDataHora(data?: string) {
  if (!data) return "Sem registro";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(data));
}

function corStatus(status: ChecklistStatus) {
  if (status === "CONCLUIDO") return "success" as const;
  if (status === "ATRASADO") return "danger" as const;
  if (status === "PENDENTE") return "warning" as const;
  return "default" as const;
}

function prioridadeClasse(prioridade: ChecklistPrioridade) {
  if (prioridade === "CRITICA") return "border-red-200 bg-red-50";
  if (prioridade === "ALTA") return "border-amber-200 bg-amber-50";
  if (prioridade === "MEDIA") return "border-blue-200 bg-blue-50";
  return "border-slate-200 bg-slate-50";
}

function prioridadeRotulo(prioridade: ChecklistPrioridade) {
  if (prioridade === "CRITICA") return "Crítica";
  if (prioridade === "ALTA") return "Alta";
  if (prioridade === "MEDIA") return "Média";
  return "Baixa";
}

function statusRotulo(status: ChecklistStatus) {
  if (status === "CONCLUIDO") return "Concluído";
  if (status === "ATRASADO") return "Atrasado";
  if (status === "DISPENSADO") return "Dispensado";
  if (status === "NAO_SE_APLICA") return "Não se aplica";
  return "Pendente";
}

function tipoModeloRotulo(tipo: ChecklistModeloPayload["tipo"]) {
  if (tipo === "INSTITUCIONAL") return "Institucional";
  if (tipo === "SETOR") return "Setor";
  if (tipo === "FUNCAO") return "Função";
  return "Usuário";
}

function modeloVazio(): ChecklistModeloPayload {
  return {
    nome: "",
    descricao: "",
    tipo: "INSTITUCIONAL",
    ativo: true,
    itens: [
      {
        diaSemana: 1,
        titulo: "",
        descricaoDetalhada: "",
        horarioPrevisto: "08:00",
        prioridade: "MEDIA",
        alertaAtivo: false,
        horarioAlerta: null,
        observacaoObrigatoria: false,
        atividadeCritica: false,
        ordem: 0,
        ativo: true
      }
    ]
  };
}

export function ChecklistDiarioPage() {
  const { usuario } = useAuth();
  const [abaAtiva, setAbaAtiva] = useState<AbaId>("diario");
  const [popupMensagem, setPopupMensagem] = useState<PopupMensagemState | null>(null);
  const [selecionadoId, setSelecionadoId] = useState<string>();
  const [motivoAcao, setMotivoAcao] = useState("");
  const [observacaoAcao, setObservacaoAcao] = useState("");
  const [modeloSelecionadoId, setModeloSelecionadoId] = useState<string>();
  const [modeloForm, setModeloForm] = useState<ChecklistModeloPayload>(modeloVazio());
  const [filtrosExpandidos, setFiltrosExpandidos] = useState(true);
  const [diasSemanaExpandidos, setDiasSemanaExpandidos] = useState<Record<number, boolean>>({});
  const [filtros, setFiltros] = useState<ChecklistFiltros>({
    periodoInicio: startOfWeekIso(),
    periodoFim: endOfWeekIso()
  });

  const podeVisualizarTodos =
    usuario?.permissoes.includes("ADMINISTRADOR") ||
    usuario?.permissoes.includes("SETOR_ADMINISTRATIVO_CHECKLIST_DIARIO_VISUALIZAR_TODOS");
  const podeGerenciarModelos =
    usuario?.permissoes.includes("ADMINISTRADOR") ||
    usuario?.permissoes.includes("SETOR_ADMINISTRATIVO_CHECKLIST_DIARIO_CADASTRAR_MODELO") ||
    usuario?.permissoes.includes("SETOR_ADMINISTRATIVO_CHECKLIST_DIARIO_EDITAR_MODELO");
  const podeGerenciarConfiguracoes =
    usuario?.permissoes.includes("ADMINISTRADOR") ||
    usuario?.permissoes.includes("SETOR_ADMINISTRATIVO_CHECKLIST_DIARIO_GERENCIAR_CONFIGURACOES");

  const listaQuery = useChecklistDiario(filtros);
  const semanaQuery = useChecklistSemanal(filtros);
  const indicadoresQuery = useChecklistIndicadores(filtros);
  const modelosQuery = useChecklistModelos();
  const historicoQuery = useChecklistHistorico(selecionadoId);
  const configuracaoQuery = useChecklistConfiguracao();
  const concluirMutation = useConcluirChecklistExecucao();
  const dispensarMutation = useDispensarChecklistExecucao();
  const naoSeAplicaMutation = useNaoSeAplicaChecklistExecucao();
  const reabrirMutation = useReabrirChecklistExecucao();
  const salvarModeloMutation = useSalvarChecklistModelo();
  const clonarModeloMutation = useClonarChecklistModelo();
  const statusModeloMutation = useAtualizarChecklistModeloStatus();
  const atualizarConfiguracaoMutation = useAtualizarChecklistConfiguracao();
  const gerarSemanaMutation = useGerarChecklistSemana();

  const execucoes = listaQuery.data ?? [];
  const modelos = modelosQuery.data ?? [];
  const indicadores = indicadoresQuery.data;
  const historico = historicoQuery.data ?? [];

  const acoesEmAndamento =
    concluirMutation.isPending ||
    dispensarMutation.isPending ||
    naoSeAplicaMutation.isPending ||
    reabrirMutation.isPending ||
    salvarModeloMutation.isPending ||
    clonarModeloMutation.isPending ||
    statusModeloMutation.isPending ||
    atualizarConfiguracaoMutation.isPending ||
    gerarSemanaMutation.isPending;

  useEffect(() => {
    if (!modeloSelecionadoId) return;
    const modelo = modelos.find((item) => item.id === modeloSelecionadoId);
    if (!modelo) return;
    setModeloForm({
      nome: modelo.nome,
      descricao: modelo.descricao ?? "",
      tipo: modelo.tipo,
      usuarioId: modelo.usuarioId ?? null,
      unidadeId: modelo.unidadeId ?? null,
      setor: modelo.setor ?? "",
      cargo: modelo.cargo ?? "",
      ativo: modelo.ativo,
      itens: modelo.itens.map((item) => ({
        diaSemana: item.diaSemana,
        titulo: item.titulo,
        descricaoDetalhada: item.descricaoDetalhada ?? "",
        horarioPrevisto: item.horarioPrevisto ?? null,
        prioridade: item.prioridade,
        alertaAtivo: item.alertaAtivo,
        horarioAlerta: item.horarioAlerta ?? null,
        observacaoObrigatoria: item.observacaoObrigatoria,
        atividadeCritica: item.atividadeCritica,
        ordem: item.ordem,
        ativo: item.ativo
      }))
    });
  }, [modeloSelecionadoId, modelos]);

  const opcoesUsuario = useMemo(() => {
    const map = new Map<number, string>();
    execucoes.forEach((item) => {
      if (!map.has(item.usuarioId)) map.set(item.usuarioId, item.usuarioNome ?? `Usuário ${item.usuarioId}`);
    });
    return Array.from(map.entries()).map(([id, nome]) => ({ id, nome }));
  }, [execucoes]);

  const opcoesUnidade = useMemo(() => {
    const map = new Map<number, string>();
    execucoes.forEach((item) => {
      if (item.unidadeId && item.unidadeNome && !map.has(item.unidadeId)) map.set(item.unidadeId, item.unidadeNome);
    });
    return Array.from(map.entries()).map(([id, nome]) => ({ id, nome }));
  }, [execucoes]);

  const actions: AdminAction[] = [
    {
      label: "Atualizar",
      icon: RefreshCcw,
      onClick: () => {
        void Promise.all([listaQuery.refetch(), semanaQuery.refetch(), indicadoresQuery.refetch(), modelosQuery.refetch(), historicoQuery.refetch(), configuracaoQuery.refetch()]);
      },
      variant: "outline",
      disabled: acoesEmAndamento
    },
    {
      label: "Gerar semana",
      icon: ClipboardCheck,
      onClick: async () => {
        try {
          await gerarSemanaMutation.mutateAsync({ dataReferencia: filtros.periodoInicio, forcar: false });
          setPopupMensagem({ tipo: "sucesso", titulo: "Confirmação", texto: "Checklist semanal gerado com sucesso." });
        } catch (error: any) {
          setPopupMensagem({ tipo: "erro", titulo: "Erro", texto: error?.response?.data?.message ?? "Não foi possível gerar a semana." });
        }
      },
      variant: "default",
      disabled: acoesEmAndamento || !podeGerenciarModelos
    },
    {
      label: "Salvar modelo",
      icon: Save,
      onClick: async () => {
        if (abaAtiva !== "modelos") return;
        try {
          await salvarModeloMutation.mutateAsync({ id: modeloSelecionadoId, payload: modeloForm });
          setPopupMensagem({ tipo: "sucesso", titulo: "Confirmação", texto: "Modelo salvo com sucesso." });
        } catch (error: any) {
          setPopupMensagem({ tipo: "erro", titulo: "Erro", texto: error?.response?.data?.message ?? "Não foi possível salvar o modelo." });
        }
      },
      variant: "default",
      disabled: acoesEmAndamento || abaAtiva !== "modelos" || !podeGerenciarModelos
    }
  ];

  async function executarAcao(tipo: "concluir" | "dispensar" | "nao-se-aplica" | "reabrir", execucao: ChecklistExecucao) {
    try {
      if (tipo === "concluir") {
        await concluirMutation.mutateAsync({ id: execucao.id, observacao: observacaoAcao || undefined });
      }
      if (tipo === "dispensar") {
        await dispensarMutation.mutateAsync({ id: execucao.id, motivo: motivoAcao, observacao: observacaoAcao || undefined });
      }
      if (tipo === "nao-se-aplica") {
        await naoSeAplicaMutation.mutateAsync({ id: execucao.id, motivo: motivoAcao, observacao: observacaoAcao || undefined });
      }
      if (tipo === "reabrir") {
        await reabrirMutation.mutateAsync({ id: execucao.id, motivo: motivoAcao || undefined, observacao: observacaoAcao || undefined });
      }
      setPopupMensagem({ tipo: "sucesso", titulo: "Confirmação", texto: "Ação do checklist executada com sucesso." });
      setSelecionadoId(execucao.id);
      setMotivoAcao("");
      setObservacaoAcao("");
    } catch (error: any) {
      setPopupMensagem({ tipo: "erro", titulo: "Erro", texto: error?.response?.data?.message ?? "Não foi possível executar a ação." });
    }
  }

  const conteudoExecucoes = (
    <div className="space-y-3">
      {listaQuery.isLoading ? <div className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card)] p-6 text-sm text-[var(--g3-muted)]">Carregando checklist...</div> : null}
      {!listaQuery.isLoading && execucoes.length === 0 ? <div className="rounded-xl border border-dashed border-[var(--g3-border)] bg-[var(--g3-card)] p-6 text-sm text-[var(--g3-muted)]">Nenhuma atividade encontrada para os filtros informados.</div> : null}
      {execucoes.map((execucao) => (
        <Card key={execucao.id} className={`overflow-hidden border shadow-sm ${prioridadeClasse(execucao.prioridade)}`}>
          <CardContent className="space-y-3 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="min-w-0 flex-1 text-sm font-semibold text-[var(--g3-foreground)]">{execucao.tituloAtividade}</p>
                  <Badge variant={corStatus(execucao.status)} className="shrink-0">{execucao.status.toLowerCase()}</Badge>
                </div>
                <p className="text-xs text-[var(--g3-muted)]">{execucao.usuarioNome} • {execucao.unidadeNome ?? "Sem unidade"} • {formatarData(execucao.referenciaData)}</p>
              </div>
              <div className="shrink-0 text-left text-xs text-[var(--g3-muted)] sm:text-right">
                <p>Previsto: {execucao.horarioPrevisto ?? "Sem horário"}</p>
                <p>Modelo: {execucao.modeloNome ?? "Sem modelo"}</p>
              </div>
            </div>
            {execucao.descricaoDetalhada ? <p className="text-sm text-[var(--g3-muted)]">{execucao.descricaoDetalhada}</p> : null}
            <div className="grid gap-2 md:grid-cols-2">
              <Textarea value={selecionadoId === execucao.id ? observacaoAcao : ""} onChange={(event) => { setSelecionadoId(execucao.id); setObservacaoAcao(event.target.value); }} placeholder={execucao.observacaoObrigatoria ? "Observação obrigatória para concluir." : "Observação opcional."} />
              <Textarea value={selecionadoId === execucao.id ? motivoAcao : ""} onChange={(event) => { setSelecionadoId(execucao.id); setMotivoAcao(event.target.value); }} placeholder="Motivo para dispensa ou não se aplica." />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={() => void executarAcao("concluir", execucao)} disabled={acoesEmAndamento || execucao.status === "CONCLUIDO"}>Concluir</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => void executarAcao("dispensar", execucao)} disabled={acoesEmAndamento}>Dispensar</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => void executarAcao("nao-se-aplica", execucao)} disabled={acoesEmAndamento}>Não se aplica</Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => void executarAcao("reabrir", execucao)} disabled={acoesEmAndamento}>Reabrir</Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setSelecionadoId(execucao.id)} disabled={acoesEmAndamento}>Histórico</Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const conteudoSemanal = (
    <div className="space-y-4">
      <Card className="overflow-hidden border border-[var(--g3-border)] shadow-[0_18px_36px_-28px_rgba(15,23,42,0.45)]">
        <CardHeader className="border-b border-[var(--g3-border)]/70 pb-3">
          <CardTitle className="text-sm">Visão da semana</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Dias com tarefas", valor: diasSemana.filter((dia) => (((semanaQuery.data ?? []).find((item) => item.diaSemana === dia.valor)?.itens ?? []).length > 0)).length, apoio: "Dias úteis e extras ativos no período" },
            { label: "Pendências da semana", valor: (semanaQuery.data ?? []).reduce((total, dia) => total + dia.itens.filter((item) => item.status === "PENDENTE").length, 0), apoio: "Itens ainda dentro do prazo" },
            { label: "Atrasos da semana", valor: (semanaQuery.data ?? []).reduce((total, dia) => total + dia.itens.filter((item) => item.status === "ATRASADO").length, 0), apoio: "Itens com prazo vencido" },
            { label: "Concluídas", valor: (semanaQuery.data ?? []).reduce((total, dia) => total + dia.itens.filter((item) => item.status === "CONCLUIDO").length, 0), apoio: "Execuções já finalizadas" }
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-[var(--g3-border)] bg-[var(--g3-card)] p-4 shadow-[0_10px_24px_-22px_rgba(15,23,42,0.9)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--g3-muted)]">{item.label}</p>
              <p className="mt-2 text-3xl font-black tracking-tight text-[var(--g3-foreground)]">{item.valor}</p>
              <p className="mt-1 text-xs text-[var(--g3-muted)]">{item.apoio}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
        {diasSemana.map((dia) => {
          const itens = (semanaQuery.data ?? []).find((item) => item.diaSemana === dia.valor)?.itens ?? [];
          const concluidas = itens.filter((item) => item.status === "CONCLUIDO").length;
          const atrasadas = itens.filter((item) => item.status === "ATRASADO").length;
          const pendentes = itens.filter((item) => item.status === "PENDENTE").length;
          const destaqueDia =
            atrasadas > 0
              ? "border-red-200/90"
              : pendentes > 0
                ? "border-amber-200/90"
                : "border-emerald-200/80";

          return (
            <Card
              key={dia.valor}
              className={`overflow-hidden rounded-3xl border ${destaqueDia} bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(246,249,247,0.98)_100%)] shadow-[0_20px_40px_-30px_rgba(15,23,42,0.5)]`}
            >
              <CardHeader className="border-b border-[var(--g3-border)]/70 pb-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base font-semibold text-[var(--g3-foreground)]">{dia.label}</CardTitle>
                    <p className="mt-1 text-xs text-[var(--g3-muted)]">
                      {itens.length === 0
                        ? "Sem atividades geradas para este dia."
                        : `${itens.length} atividade(s) planejada(s) para acompanhamento.`}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-[var(--g3-primary-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--g3-active)]">
                      {concluidas} concluída(s)
                    </span>
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                      {pendentes} pendente(s)
                    </span>
                    <span className="rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-semibold text-red-700">
                      {atrasadas} atrasada(s)
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 rounded-full px-2"
                      onClick={() =>
                        setDiasSemanaExpandidos((atual) => ({
                          ...atual,
                          [dia.valor]: !(atual[dia.valor] ?? true)
                        }))
                      }
                    >
                      {(diasSemanaExpandidos[dia.valor] ?? true) ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3 p-4">
                {!(diasSemanaExpandidos[dia.valor] ?? true) ? (
                  <div className="rounded-2xl border border-dashed border-[var(--g3-border)] bg-[var(--g3-card-soft)] px-4 py-5">
                    <p className="text-sm font-medium text-[var(--g3-foreground)]">Dia recolhido</p>
                    <p className="mt-1 text-xs text-[var(--g3-muted)]">
                      Expanda o card para ver as atividades planejadas deste dia.
                    </p>
                  </div>
                ) : itens.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[var(--g3-border)] bg-[var(--g3-card-soft)] px-4 py-8 text-center">
                    <p className="text-sm font-medium text-[var(--g3-foreground)]">Dia sem atividades</p>
                    <p className="mt-1 text-xs text-[var(--g3-muted)]">
                      Quando houver geração para este dia, as tarefas aparecerão aqui com status e prioridade.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {itens.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`w-full rounded-2xl border px-4 py-4 text-left transition hover:-translate-y-0.5 hover:shadow-[0_16px_30px_-24px_rgba(15,23,42,0.65)] ${prioridadeClasse(item.prioridade)}`}
                        onClick={() => setSelecionadoId(item.id)}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold leading-5 text-[var(--g3-foreground)]">
                              {item.tituloAtividade}
                            </p>
                            <p className="mt-1 text-xs text-[var(--g3-muted)]">
                              {item.usuarioNome} • {item.unidadeNome ?? "Sem unidade"}
                            </p>
                          </div>
                          <Badge
                            variant={corStatus(item.status)}
                            className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold normal-case"
                          >
                            {statusRotulo(item.status)}
                          </Badge>
                        </div>

                        <div className="mt-3 grid gap-2 md:grid-cols-3">
                          <div className="rounded-xl bg-white/70 px-3 py-2">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--g3-muted)]">
                              Horário
                            </p>
                            <p className="mt-1 text-sm font-medium text-[var(--g3-foreground)]">
                              {item.horarioPrevisto ?? "Sem horário"}
                            </p>
                          </div>
                          <div className="rounded-xl bg-white/70 px-3 py-2">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--g3-muted)]">
                              Prioridade
                            </p>
                            <p className="mt-1 text-sm font-medium text-[var(--g3-foreground)]">
                              {prioridadeRotulo(item.prioridade)}
                            </p>
                          </div>
                          <div className="rounded-xl bg-white/70 px-3 py-2">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--g3-muted)]">
                              Modelo
                            </p>
                            <p className="mt-1 truncate text-sm font-medium text-[var(--g3-foreground)]">
                              {item.modeloNome ?? "Sem modelo"}
                            </p>
                          </div>
                        </div>

                        {item.descricaoDetalhada ? (
                          <p className="mt-3 line-clamp-2 text-sm leading-5 text-[var(--g3-muted)]">
                            {item.descricaoDetalhada}
                          </p>
                        ) : null}
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );

  const conteudoModelos = (
    <div className="grid gap-3 xl:grid-cols-[340px_minmax(0,1fr)]">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Modelos cadastrados</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Button type="button" variant="outline" className="w-full" onClick={() => { setModeloSelecionadoId(undefined); setModeloForm(modeloVazio()); }} disabled={!podeGerenciarModelos}>Novo modelo</Button>
          {modelos.map((modelo) => (
            <div key={modelo.id} className={`rounded-lg border p-3 ${modeloSelecionadoId === modelo.id ? "border-[var(--g3-active)] bg-[var(--g3-primary-soft)]" : "border-[var(--g3-border)] bg-[var(--g3-card-soft)]"}`}>
              <button type="button" className="text-left" onClick={() => setModeloSelecionadoId(modelo.id)}>
                <p className="text-sm font-semibold text-[var(--g3-foreground)]">{modelo.nome}</p>
                <p className="text-xs text-[var(--g3-muted)]">{modelo.tipo.toLowerCase()} • {modelo.itens.length} atividade(s)</p>
              </button>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => void clonarModeloMutation.mutateAsync(modelo.id)} disabled={acoesEmAndamento || !podeGerenciarModelos}>Clonar</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => void statusModeloMutation.mutateAsync({ id: modelo.id, ativo: !modelo.ativo })} disabled={acoesEmAndamento || !podeGerenciarModelos}>{modelo.ativo ? "Inativar" : "Ativar"}</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Editor de modelo</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <Input value={modeloForm.nome} onChange={(event) => setModeloForm((atual) => ({ ...atual, nome: event.target.value }))} placeholder="Nome do modelo" />
            <Select value={modeloForm.tipo} onChange={(event) => setModeloForm((atual) => ({ ...atual, tipo: event.target.value as any }))}><option value="INSTITUCIONAL">Institucional</option><option value="SETOR">Setor</option><option value="FUNCAO">Função</option><option value="USUARIO">Usuário</option></Select>
            <Input value={modeloForm.setor ?? ""} onChange={(event) => setModeloForm((atual) => ({ ...atual, setor: event.target.value }))} placeholder="Setor" />
            <Input value={modeloForm.cargo ?? ""} onChange={(event) => setModeloForm((atual) => ({ ...atual, cargo: event.target.value }))} placeholder="Cargo" />
          </div>
          <Textarea value={modeloForm.descricao ?? ""} onChange={(event) => setModeloForm((atual) => ({ ...atual, descricao: event.target.value }))} placeholder="Descrição do modelo" />
          {modeloForm.itens.map((item, index) => (
            <div key={`${index}-${item.titulo}`} className="grid gap-2 rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card-soft)] p-3 md:grid-cols-5">
              <Select value={String(item.diaSemana)} onChange={(event) => setModeloForm((atual) => ({ ...atual, itens: atual.itens.map((current, currentIndex) => currentIndex === index ? { ...current, diaSemana: Number(event.target.value) } : current) }))}>{diasSemana.map((dia) => <option key={dia.valor} value={dia.valor}>{dia.label}</option>)}</Select>
              <Input value={item.titulo} onChange={(event) => setModeloForm((atual) => ({ ...atual, itens: atual.itens.map((current, currentIndex) => currentIndex === index ? { ...current, titulo: event.target.value } : current) }))} placeholder="Título" className="md:col-span-2" />
              <Input type="time" value={item.horarioPrevisto ?? ""} onChange={(event) => setModeloForm((atual) => ({ ...atual, itens: atual.itens.map((current, currentIndex) => currentIndex === index ? { ...current, horarioPrevisto: event.target.value || null } : current) }))} />
              <Select value={item.prioridade} onChange={(event) => setModeloForm((atual) => ({ ...atual, itens: atual.itens.map((current, currentIndex) => currentIndex === index ? { ...current, prioridade: event.target.value as ChecklistPrioridade } : current) }))}><option value="BAIXA">Baixa</option><option value="MEDIA">Média</option><option value="ALTA">Alta</option><option value="CRITICA">Crítica</option></Select>
              <Textarea value={item.descricaoDetalhada ?? ""} onChange={(event) => setModeloForm((atual) => ({ ...atual, itens: atual.itens.map((current, currentIndex) => currentIndex === index ? { ...current, descricaoDetalhada: event.target.value } : current) }))} placeholder="Descrição detalhada" className="md:col-span-3" />
              <Input type="time" value={item.horarioAlerta ?? ""} onChange={(event) => setModeloForm((atual) => ({ ...atual, itens: atual.itens.map((current, currentIndex) => currentIndex === index ? { ...current, horarioAlerta: event.target.value || null, alertaAtivo: !!event.target.value } : current) }))} />
              <div className="flex flex-col justify-center gap-1 text-xs text-[var(--g3-muted)]">
                <label className="inline-flex items-center gap-2"><Checkbox checked={item.observacaoObrigatoria} onChange={(event) => setModeloForm((atual) => ({ ...atual, itens: atual.itens.map((current, currentIndex) => currentIndex === index ? { ...current, observacaoObrigatoria: event.target.checked } : current) }))} /> Observação obrigatória</label>
                <label className="inline-flex items-center gap-2"><Checkbox checked={item.atividadeCritica} onChange={(event) => setModeloForm((atual) => ({ ...atual, itens: atual.itens.map((current, currentIndex) => currentIndex === index ? { ...current, atividadeCritica: event.target.checked } : current) }))} /> Crítica</label>
              </div>
              <Button type="button" size="sm" variant="ghost" onClick={() => setModeloForm((atual) => ({ ...atual, itens: atual.itens.filter((_, currentIndex) => currentIndex !== index) }))}>Remover</Button>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={() => setModeloForm((atual) => ({ ...atual, itens: [...atual.itens, { diaSemana: 1, titulo: "", descricaoDetalhada: "", horarioPrevisto: "08:00", prioridade: "MEDIA", alertaAtivo: false, horarioAlerta: null, observacaoObrigatoria: false, atividadeCritica: false, ordem: atual.itens.length, ativo: true }] }))} disabled={!podeGerenciarModelos}>Adicionar atividade</Button>
        </CardContent>
      </Card>
    </div>
  );

  const conteudoModelosPremium = (
    <div className="space-y-4">
      <Card className="overflow-hidden border border-[var(--g3-border)] shadow-[0_18px_36px_-28px_rgba(15,23,42,0.45)]">
        <CardHeader className="border-b border-[var(--g3-border)]/70 pb-3">
          <CardTitle className="text-sm">Resumo dos modelos</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Modelos cadastrados", valor: modelos.length, apoio: "Base total disponível no checklist" },
            { label: "Modelos ativos", valor: modelos.filter((item) => item.ativo).length, apoio: "Usados na geração operacional" },
            { label: "Atividades do modelo", valor: modeloForm.itens.length, apoio: "Itens configurados no editor atual" },
            { label: "Tipo selecionado", valor: tipoModeloRotulo(modeloForm.tipo), apoio: modeloSelecionadoId ? "Modelo em edição" : "Novo modelo em preparação" }
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-[var(--g3-border)] bg-[var(--g3-card)] p-4 shadow-[0_12px_26px_-24px_rgba(15,23,42,0.8)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--g3-muted)]">{item.label}</p>
              <p className="mt-2 text-2xl font-black tracking-tight text-[var(--g3-foreground)]">{item.valor}</p>
              <p className="mt-1 text-xs text-[var(--g3-muted)]">{item.apoio}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="overflow-hidden rounded-3xl border border-[var(--g3-border)] shadow-[0_20px_40px_-30px_rgba(15,23,42,0.45)]">
          <CardHeader className="border-b border-[var(--g3-border)]/70 pb-3">
            <div className="space-y-3">
              <div>
                <CardTitle className="text-sm">Modelos cadastrados</CardTitle>
                <p className="mt-1 text-xs text-[var(--g3-muted)]">
                  Selecione um modelo para editar, clonar ou inativar sem perder rastreabilidade.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  setModeloSelecionadoId(undefined);
                  setModeloForm(modeloVazio());
                }}
                disabled={!podeGerenciarModelos}
              >
                Novo modelo
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 p-4">
            {modelos.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--g3-border)] bg-[var(--g3-card-soft)] px-4 py-8 text-center">
                <p className="text-sm font-medium text-[var(--g3-foreground)]">Nenhum modelo cadastrado</p>
                <p className="mt-1 text-xs text-[var(--g3-muted)]">Crie o primeiro modelo para iniciar a rotina recorrente do checklist.</p>
              </div>
            ) : (
              modelos.map((modelo) => (
                <div
                  key={modelo.id}
                  className={`rounded-2xl border p-4 transition ${
                    modeloSelecionadoId === modelo.id
                      ? "border-[var(--g3-active)] bg-[var(--g3-primary-soft)]/55 shadow-[0_16px_32px_-28px_rgba(15,23,42,0.8)]"
                      : "border-[var(--g3-border)] bg-[var(--g3-card-soft)]"
                  }`}
                >
                  <button type="button" className="w-full text-left" onClick={() => setModeloSelecionadoId(modelo.id)}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[var(--g3-foreground)]">{modelo.nome}</p>
                        <p className="mt-1 text-xs text-[var(--g3-muted)]">{tipoModeloRotulo(modelo.tipo)} • {modelo.itens.length} atividade(s)</p>
                      </div>
                      <Badge variant={modelo.ativo ? "success" : "default"}>{modelo.ativo ? "Ativo" : "Inativo"}</Badge>
                    </div>
                    {modelo.descricao ? <p className="mt-3 line-clamp-2 text-sm leading-5 text-[var(--g3-muted)]">{modelo.descricao}</p> : null}
                  </button>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => void clonarModeloMutation.mutateAsync(modelo.id)} disabled={acoesEmAndamento || !podeGerenciarModelos}>Clonar</Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => void statusModeloMutation.mutateAsync({ id: modelo.id, ativo: !modelo.ativo })} disabled={acoesEmAndamento || !podeGerenciarModelos}>{modelo.ativo ? "Inativar" : "Ativar"}</Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="overflow-hidden rounded-3xl border border-[var(--g3-border)] shadow-[0_20px_40px_-30px_rgba(15,23,42,0.45)]">
            <CardHeader className="border-b border-[var(--g3-border)]/70 pb-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-sm">Editor de modelo</CardTitle>
                  <p className="mt-1 text-xs text-[var(--g3-muted)]">Defina o escopo do modelo e mantenha as atividades organizadas por dia, horário e prioridade.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="default">{tipoModeloRotulo(modeloForm.tipo)}</Badge>
                  <Badge variant={modeloForm.ativo ?? true ? "success" : "default"}>{(modeloForm.ativo ?? true) ? "Pronto para uso" : "Inativo"}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <Label>Nome do modelo</Label>
                  <Input value={modeloForm.nome} onChange={(event) => setModeloForm((atual) => ({ ...atual, nome: event.target.value }))} placeholder="Nome do modelo" />
                </div>
                <div className="space-y-1">
                  <Label>Tipo do modelo</Label>
                  <Select value={modeloForm.tipo} onChange={(event) => setModeloForm((atual) => ({ ...atual, tipo: event.target.value as any }))}><option value="INSTITUCIONAL">Institucional</option><option value="SETOR">Setor</option><option value="FUNCAO">Função</option><option value="USUARIO">Usuário</option></Select>
                </div>
                <div className="space-y-1">
                  <Label>Setor</Label>
                  <Input value={modeloForm.setor ?? ""} onChange={(event) => setModeloForm((atual) => ({ ...atual, setor: event.target.value }))} placeholder="Setor" />
                </div>
                <div className="space-y-1">
                  <Label>Cargo</Label>
                  <Input value={modeloForm.cargo ?? ""} onChange={(event) => setModeloForm((atual) => ({ ...atual, cargo: event.target.value }))} placeholder="Cargo" />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Descrição do modelo</Label>
                <Textarea value={modeloForm.descricao ?? ""} onChange={(event) => setModeloForm((atual) => ({ ...atual, descricao: event.target.value }))} placeholder="Descreva o objetivo operacional deste modelo" />
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-3xl border border-[var(--g3-border)] shadow-[0_20px_40px_-30px_rgba(15,23,42,0.45)]">
            <CardHeader className="border-b border-[var(--g3-border)]/70 pb-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-sm">Atividades do modelo</CardTitle>
                  <p className="mt-1 text-xs text-[var(--g3-muted)]">Organize a rotina semanal com horários, alertas e criticidade em cada item.</p>
                </div>
                <Button type="button" variant="outline" onClick={() => setModeloForm((atual) => ({ ...atual, itens: [...atual.itens, { diaSemana: 1, titulo: "", descricaoDetalhada: "", horarioPrevisto: "08:00", prioridade: "MEDIA", alertaAtivo: false, horarioAlerta: null, observacaoObrigatoria: false, atividadeCritica: false, ordem: atual.itens.length, ativo: true }] }))} disabled={!podeGerenciarModelos}>
                  Adicionar atividade
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              {modeloForm.itens.map((item, index) => (
                <div key={`${index}-${item.titulo}`} className={`rounded-3xl border p-4 shadow-[0_14px_28px_-24px_rgba(15,23,42,0.8)] ${prioridadeClasse(item.prioridade)}`}>
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--g3-foreground)]">Atividade {index + 1}</p>
                      <p className="mt-1 text-xs text-[var(--g3-muted)]">Configure dia, descrição, alerta e critérios obrigatórios deste item.</p>
                    </div>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setModeloForm((atual) => ({ ...atual, itens: atual.itens.filter((_, currentIndex) => currentIndex !== index) }))}>Remover</Button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div className="space-y-1">
                      <Label>Dia da semana</Label>
                      <Select value={String(item.diaSemana)} onChange={(event) => setModeloForm((atual) => ({ ...atual, itens: atual.itens.map((current, currentIndex) => currentIndex === index ? { ...current, diaSemana: Number(event.target.value) } : current) }))}>{diasSemana.map((dia) => <option key={dia.valor} value={dia.valor}>{dia.label}</option>)}</Select>
                    </div>
                    <div className="space-y-1 xl:col-span-2">
                      <Label>Título da atividade</Label>
                      <Input value={item.titulo} onChange={(event) => setModeloForm((atual) => ({ ...atual, itens: atual.itens.map((current, currentIndex) => currentIndex === index ? { ...current, titulo: event.target.value } : current) }))} placeholder="Título" />
                    </div>
                    <div className="space-y-1">
                      <Label>Prioridade</Label>
                      <Select value={item.prioridade} onChange={(event) => setModeloForm((atual) => ({ ...atual, itens: atual.itens.map((current, currentIndex) => currentIndex === index ? { ...current, prioridade: event.target.value as ChecklistPrioridade } : current) }))}><option value="BAIXA">Baixa</option><option value="MEDIA">Média</option><option value="ALTA">Alta</option><option value="CRITICA">Crítica</option></Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Horário previsto</Label>
                      <Input type="time" value={item.horarioPrevisto ?? ""} onChange={(event) => setModeloForm((atual) => ({ ...atual, itens: atual.itens.map((current, currentIndex) => currentIndex === index ? { ...current, horarioPrevisto: event.target.value || null } : current) }))} />
                    </div>
                    <div className="space-y-1">
                      <Label>Horário do alerta</Label>
                      <Input type="time" value={item.horarioAlerta ?? ""} onChange={(event) => setModeloForm((atual) => ({ ...atual, itens: atual.itens.map((current, currentIndex) => currentIndex === index ? { ...current, horarioAlerta: event.target.value || null, alertaAtivo: !!event.target.value } : current) }))} />
                    </div>
                    <div className="space-y-1 xl:col-span-2">
                      <Label>Descrição detalhada</Label>
                      <Textarea value={item.descricaoDetalhada ?? ""} onChange={(event) => setModeloForm((atual) => ({ ...atual, itens: atual.itens.map((current, currentIndex) => currentIndex === index ? { ...current, descricaoDetalhada: event.target.value } : current) }))} placeholder="Descrição detalhada" />
                    </div>
                    <div className="flex flex-col justify-end gap-2 rounded-2xl border border-[var(--g3-border)]/70 bg-white/55 px-3 py-3 text-sm text-[var(--g3-muted)]">
                      <label className="inline-flex items-center gap-2"><Checkbox checked={item.observacaoObrigatoria} onChange={(event) => setModeloForm((atual) => ({ ...atual, itens: atual.itens.map((current, currentIndex) => currentIndex === index ? { ...current, observacaoObrigatoria: event.target.checked } : current) }))} /> Observação obrigatória</label>
                      <label className="inline-flex items-center gap-2"><Checkbox checked={item.atividadeCritica} onChange={(event) => setModeloForm((atual) => ({ ...atual, itens: atual.itens.map((current, currentIndex) => currentIndex === index ? { ...current, atividadeCritica: event.target.checked } : current) }))} /> Atividade crítica</label>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );

  const conteudoIndicadores = (
    <div className="grid gap-3 xl:grid-cols-2">
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Cumprimento por usuário</CardTitle></CardHeader><CardContent className="space-y-2">{(indicadores?.cumprimentoPorUsuario ?? []).map((item) => <div key={item.usuarioId} className="flex items-center justify-between rounded-lg border border-[var(--g3-border)] px-3 py-2"><span className="text-sm">{item.usuarioNome}</span><Badge variant={item.percentual >= 80 ? "success" : item.percentual >= 50 ? "warning" : "danger"}>{item.percentual}%</Badge></div>)}</CardContent></Card>
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Tarefas mais atrasadas</CardTitle></CardHeader><CardContent className="space-y-2">{(indicadores?.tarefasMaisAtrasadas ?? []).map((item) => <div key={item.tituloAtividade} className="flex items-center justify-between rounded-lg border border-[var(--g3-border)] px-3 py-2"><span className="text-sm">{item.tituloAtividade}</span><Badge variant="danger">{item.quantidade}</Badge></div>)}</CardContent></Card>
    </div>
  );

  const conteudoIndicadoresPremium = (
    <div className="space-y-4">
      <Card className="overflow-hidden border border-[var(--g3-border)] shadow-[0_18px_36px_-28px_rgba(15,23,42,0.45)]">
        <CardHeader className="border-b border-[var(--g3-border)]/70 pb-3">
          <CardTitle className="text-sm">Painel gerencial</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Conclusão geral", valor: `${indicadores?.resumo.percentualConclusao ?? 0}%`, apoio: "Taxa agregada do período filtrado" },
            { label: "Críticas não concluídas", valor: indicadores?.resumo.criticasNaoConcluidas ?? 0, apoio: "Itens críticos ainda em aberto" },
            { label: "Não se aplica", valor: indicadores?.resumo.naoAplicaveis ?? 0, apoio: "Execuções encerradas por regra de contexto" },
            { label: "Dispensadas", valor: indicadores?.resumo.dispensadas ?? 0, apoio: "Atividades dispensadas com trilha de auditoria" }
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-[var(--g3-border)] bg-[var(--g3-card)] p-4 shadow-[0_12px_26px_-24px_rgba(15,23,42,0.8)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--g3-muted)]">{item.label}</p>
              <p className="mt-2 text-2xl font-black tracking-tight text-[var(--g3-foreground)]">{item.valor}</p>
              <p className="mt-1 text-xs text-[var(--g3-muted)]">{item.apoio}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="overflow-hidden rounded-3xl border border-[var(--g3-border)] shadow-[0_20px_40px_-30px_rgba(15,23,42,0.45)]">
          <CardHeader className="border-b border-[var(--g3-border)]/70 pb-3">
            <CardTitle className="text-sm">Cumprimento por usuário</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4">
            {(indicadores?.cumprimentoPorUsuario ?? []).map((item) => (
              <div key={item.usuarioId} className="rounded-2xl border border-[var(--g3-border)] bg-[var(--g3-card)] px-4 py-3 shadow-[0_12px_24px_-24px_rgba(15,23,42,0.85)]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-[var(--g3-foreground)]">{item.usuarioNome}</p>
                    <p className="mt-1 text-xs text-[var(--g3-muted)]">{item.concluidas} de {item.total} concluídas</p>
                  </div>
                  <Badge variant={item.percentual >= 80 ? "success" : item.percentual >= 50 ? "warning" : "danger"}>{item.percentual}%</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-3xl border border-[var(--g3-border)] shadow-[0_20px_40px_-30px_rgba(15,23,42,0.45)]">
          <CardHeader className="border-b border-[var(--g3-border)]/70 pb-3">
            <CardTitle className="text-sm">Tarefas mais atrasadas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4">
            {(indicadores?.tarefasMaisAtrasadas ?? []).map((item) => (
              <div key={item.tituloAtividade} className="flex items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50/70 px-4 py-3">
                <p className="text-sm font-medium text-[var(--g3-foreground)]">{item.tituloAtividade}</p>
                <Badge variant="danger">{item.quantidade}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-3xl border border-[var(--g3-border)] shadow-[0_20px_40px_-30px_rgba(15,23,42,0.45)]">
          <CardHeader className="border-b border-[var(--g3-border)]/70 pb-3">
            <CardTitle className="text-sm">Cumprimento por unidade</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4">
            {(indicadores?.cumprimentoPorUnidade ?? []).map((item) => (
              <div key={`${item.unidadeId ?? "sem-unidade"}-${item.unidadeNome}`} className="rounded-2xl border border-[var(--g3-border)] bg-[var(--g3-card)] px-4 py-3 shadow-[0_12px_24px_-24px_rgba(15,23,42,0.85)]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-[var(--g3-foreground)]">{item.unidadeNome}</p>
                    <p className="mt-1 text-xs text-[var(--g3-muted)]">{item.total} atividade(s) no período</p>
                  </div>
                  <Badge variant={item.percentual >= 80 ? "success" : item.percentual >= 50 ? "warning" : "danger"}>{item.percentual}%</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-3xl border border-[var(--g3-border)] shadow-[0_20px_40px_-30px_rgba(15,23,42,0.45)]">
          <CardHeader className="border-b border-[var(--g3-border)]/70 pb-3">
            <CardTitle className="text-sm">Setores e recorrência</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 p-4 md:grid-cols-2">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--g3-muted)]">Cumprimento por setor</p>
              {(indicadores?.cumprimentoPorSetor ?? []).map((item) => (
                <div key={item.setor} className="rounded-2xl border border-[var(--g3-border)] bg-[var(--g3-card)] px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium text-[var(--g3-foreground)]">{item.setor}</span>
                    <Badge variant={item.percentual >= 80 ? "success" : item.percentual >= 50 ? "warning" : "danger"}>{item.percentual}%</Badge>
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--g3-muted)]">Tarefas mais recorrentes</p>
              {(indicadores?.tarefasMaisRecorrentes ?? []).map((item) => (
                <div key={item.tituloAtividade} className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--g3-border)] bg-[var(--g3-card)] px-4 py-3">
                  <p className="text-sm font-medium text-[var(--g3-foreground)]">{item.tituloAtividade}</p>
                  <Badge variant="default">{item.quantidade}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const conteudoConfiguracoes = (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Dias habilitados</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-[var(--g3-muted)]">Segunda a sexta seguem ativas por padrão. Sábado e domingo só devem ser habilitados por perfil autorizado.</p>
        <label className="inline-flex items-center gap-2 text-sm"><Checkbox checked={!!configuracaoQuery.data?.sabadoAtivo} onChange={(event) => void atualizarConfiguracaoMutation.mutateAsync({ sabadoAtivo: event.target.checked, domingoAtivo: !!configuracaoQuery.data?.domingoAtivo })} disabled={!podeGerenciarConfiguracoes || acoesEmAndamento} /> Sábado ativo</label>
        <label className="inline-flex items-center gap-2 text-sm"><Checkbox checked={!!configuracaoQuery.data?.domingoAtivo} onChange={(event) => void atualizarConfiguracaoMutation.mutateAsync({ sabadoAtivo: !!configuracaoQuery.data?.sabadoAtivo, domingoAtivo: event.target.checked })} disabled={!podeGerenciarConfiguracoes || acoesEmAndamento} /> Domingo ativo</label>
      </CardContent>
    </Card>
  );

  const conteudoHistorico = (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Trilha de auditoria</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {historico.length === 0 ? <p className="text-sm text-[var(--g3-muted)]">Selecione uma execução para visualizar o histórico detalhado.</p> : null}
        {historico.map((item) => (
          <div key={item.id} className="rounded-lg border border-[var(--g3-border)] px-3 py-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-[var(--g3-foreground)]">{item.acao}</p>
              <span className="text-xs text-[var(--g3-muted)]">{formatarDataHora(item.criadoEm)}</span>
            </div>
            <p className="mt-1 text-xs text-[var(--g3-muted)]">{item.usuarioResponsavelNome ?? "Sistema"} • {item.statusAnterior ?? "sem status"} → {item.statusNovo ?? "sem status"}</p>
            {item.observacao ? <p className="mt-1 text-sm text-[var(--g3-muted)]">{item.observacao}</p> : null}
            {item.motivo ? <p className="mt-1 text-sm text-[var(--g3-muted)]">Motivo: {item.motivo}</p> : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );

  const conteudoHistoricoPremium = (
    <div className="space-y-4">
      <Card className="overflow-hidden border border-[var(--g3-border)] shadow-[0_18px_36px_-28px_rgba(15,23,42,0.45)]">
        <CardHeader className="border-b border-[var(--g3-border)]/70 pb-3">
          <CardTitle className="text-sm">Resumo da auditoria</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Eventos no histórico", valor: historico.length, apoio: "Ocorrências carregadas no filtro atual" },
            { label: "Ações distintas", valor: new Set(historico.map((item) => item.acao)).size, apoio: "Tipos de alteração registrados" },
            { label: "Com motivo", valor: historico.filter((item) => !!item.motivo).length, apoio: "Eventos com justificativa formal" },
            { label: "Com observação", valor: historico.filter((item) => !!item.observacao).length, apoio: "Eventos com complemento descritivo" }
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-[var(--g3-border)] bg-[var(--g3-card)] p-4 shadow-[0_12px_26px_-24px_rgba(15,23,42,0.8)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--g3-muted)]">{item.label}</p>
              <p className="mt-2 text-2xl font-black tracking-tight text-[var(--g3-foreground)]">{item.valor}</p>
              <p className="mt-1 text-xs text-[var(--g3-muted)]">{item.apoio}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-3xl border border-[var(--g3-border)] shadow-[0_20px_40px_-30px_rgba(15,23,42,0.45)]">
        <CardHeader className="border-b border-[var(--g3-border)]/70 pb-3">
          <CardTitle className="text-sm">Trilha de auditoria</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-4">
          {historico.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--g3-border)] bg-[var(--g3-card-soft)] px-4 py-10 text-center">
              <p className="text-sm font-medium text-[var(--g3-foreground)]">Nenhum evento carregado</p>
              <p className="mt-1 text-xs text-[var(--g3-muted)]">Selecione uma execução para visualizar a trilha detalhada de auditoria.</p>
            </div>
          ) : null}

          {historico.map((item) => (
            <div key={item.id} className="rounded-3xl border border-[var(--g3-border)] bg-[var(--g3-card)] p-4 shadow-[0_14px_28px_-24px_rgba(15,23,42,0.8)]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-[var(--g3-foreground)]">{item.acao}</p>
                    <Badge variant="default">{item.referenciaTipo.toLowerCase()}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-[var(--g3-muted)]">
                    {item.usuarioResponsavelNome ?? "Sistema"} • {item.origem ?? "Origem não informada"}
                  </p>
                </div>
                <span className="text-xs text-[var(--g3-muted)]">{formatarDataHora(item.criadoEm)}</span>
              </div>

              <div className="mt-3 grid gap-2 md:grid-cols-2">
                <div className="rounded-2xl bg-[var(--g3-card-soft)] px-3 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--g3-muted)]">Status anterior</p>
                  <p className="mt-1 text-sm font-medium text-[var(--g3-foreground)]">{item.statusAnterior ?? "Sem status"}</p>
                </div>
                <div className="rounded-2xl bg-[var(--g3-card-soft)] px-3 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--g3-muted)]">Novo status</p>
                  <p className="mt-1 text-sm font-medium text-[var(--g3-foreground)]">{item.statusNovo ?? "Sem status"}</p>
                </div>
              </div>

              {item.observacao ? (
                <div className="mt-3 rounded-2xl border border-[var(--g3-border)]/70 bg-white/70 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--g3-muted)]">Observação</p>
                  <p className="mt-1 text-sm leading-6 text-[var(--g3-foreground)]">{item.observacao}</p>
                </div>
              ) : null}

              {item.motivo ? (
                <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-700">Motivo</p>
                  <p className="mt-1 text-sm leading-6 text-[var(--g3-foreground)]">{item.motivo}</p>
                </div>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <AdminPageLayout
      tabs={abas}
      activeTab={abaAtiva}
      onChangeTab={(tab) => setAbaAtiva(tab as AbaId)}
      actions={actions}
      sectionLabel="Setor administrativo"
      pageTitle="Checklist diário"
      activeTitle={abas.find((item) => item.id === abaAtiva)?.label}
      activeIcon={abaAtiva === "diario" ? ClipboardCheck : abaAtiva === "semanal" ? Layers3 : abaAtiva === "modelos" ? Sparkles : abaAtiva === "indicadores" ? ShieldAlert : abaAtiva === "configuracoes" ? Settings2 : History}
      codeBadge="CHK-DIARIO"
    >
      <div className="space-y-3">
        <Card className="overflow-hidden border border-emerald-200/80 bg-[linear-gradient(180deg,rgba(237,252,242,0.98)_0%,rgba(222,247,232,0.98)_100%)] shadow-[0_20px_40px_-28px_rgba(21,128,61,0.45)]">
          <CardHeader className="border-b border-emerald-200/70 pb-3"><CardTitle className="text-sm">Resumo operacional</CardTitle></CardHeader>
          <CardContent className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-6">
            {[
              { label: "Total", valor: indicadores?.resumo.total ?? 0 },
              { label: "Concluídas", valor: indicadores?.resumo.concluidas ?? 0 },
              { label: "Pendentes", valor: indicadores?.resumo.pendentes ?? 0 },
              { label: "Atrasadas", valor: indicadores?.resumo.atrasadas ?? 0 },
              { label: "Dispensadas", valor: indicadores?.resumo.dispensadas ?? 0 },
              { label: "Conclusão", valor: `${indicadores?.resumo.percentualConclusao ?? 0}%` }
            ].map((item) => (
              <div key={item.label} className="flex min-h-[112px] flex-col items-center justify-center rounded-2xl border border-emerald-200/80 bg-white/78 p-4 text-center shadow-[0_16px_36px_-28px_rgba(21,128,61,0.5)] backdrop-blur">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-800/70">{item.label}</p>
                <p className="mt-2 text-2xl font-black text-emerald-950">{item.valor}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-2xl border border-[var(--g3-border)] shadow-[0_14px_32px_-24px_rgba(15,23,42,0.45)]">
          <CardHeader className="flex flex-row items-center justify-between gap-3 border-b border-[var(--g3-border)]/70 pb-3">
            <CardTitle className="text-sm">Filtros</CardTitle>
            <Button type="button" variant="ghost" size="sm" className="h-8 px-2" onClick={() => setFiltrosExpandidos((atual) => !atual)}>
              {filtrosExpandidos ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              <span className="ml-1">{filtrosExpandidos ? "Recolher" : "Expandir"}</span>
            </Button>
          </CardHeader>
          {filtrosExpandidos ? <CardContent className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="space-y-1"><Label htmlFor="termo">Busca</Label><Input id="termo" value={filtros.termo ?? ""} onChange={(event) => setFiltros((atual) => ({ ...atual, termo: event.target.value || undefined }))} /></div>
            <div className="space-y-1"><Label htmlFor="usuario">Usuário</Label><Select id="usuario" value={String(filtros.usuarioId ?? "")} onChange={(event) => setFiltros((atual) => ({ ...atual, usuarioId: event.target.value ? Number(event.target.value) : undefined }))} disabled={!podeVisualizarTodos}><option value="">Todos</option>{opcoesUsuario.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</Select></div>
            <div className="space-y-1"><Label htmlFor="unidade">Unidade</Label><Select id="unidade" value={String(filtros.unidadeId ?? "")} onChange={(event) => setFiltros((atual) => ({ ...atual, unidadeId: event.target.value ? Number(event.target.value) : undefined }))}><option value="">Todas</option>{opcoesUnidade.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</Select></div>
            <div className="space-y-1"><Label htmlFor="inicio">Início</Label><Input id="inicio" type="date" value={filtros.periodoInicio ?? ""} onChange={(event) => setFiltros((atual) => ({ ...atual, periodoInicio: event.target.value || undefined }))} /></div>
            <div className="space-y-1"><Label htmlFor="fim">Fim</Label><Input id="fim" type="date" value={filtros.periodoFim ?? ""} onChange={(event) => setFiltros((atual) => ({ ...atual, periodoFim: event.target.value || undefined }))} /></div>
            <div className="space-y-1"><Label htmlFor="status">Status</Label><Select id="status" value={filtros.status ?? ""} onChange={(event) => setFiltros((atual) => ({ ...atual, status: (event.target.value || undefined) as ChecklistStatus | undefined }))}><option value="">Todos</option><option value="PENDENTE">Pendente</option><option value="CONCLUIDO">Concluído</option><option value="ATRASADO">Atrasado</option><option value="DISPENSADO">Dispensado</option><option value="NAO_SE_APLICA">Não se aplica</option></Select></div>
            <div className="space-y-1"><Label htmlFor="prioridade">Prioridade</Label><Select id="prioridade" value={filtros.prioridade ?? ""} onChange={(event) => setFiltros((atual) => ({ ...atual, prioridade: (event.target.value || undefined) as ChecklistPrioridade | undefined }))}><option value="">Todas</option><option value="BAIXA">Baixa</option><option value="MEDIA">Média</option><option value="ALTA">Alta</option><option value="CRITICA">Crítica</option></Select></div>
            <div className="space-y-1"><Label htmlFor="dia">Dia</Label><Select id="dia" value={String(filtros.diaSemana ?? "")} onChange={(event) => setFiltros((atual) => ({ ...atual, diaSemana: event.target.value ? Number(event.target.value) : undefined }))}><option value="">Todos</option>{diasSemana.map((dia) => <option key={dia.valor} value={dia.valor}>{dia.label}</option>)}</Select></div>
            <div className="space-y-1"><Label htmlFor="tipoModelo">Tipo de modelo</Label><Select id="tipoModelo" value={filtros.tipoModelo ?? ""} onChange={(event) => setFiltros((atual) => ({ ...atual, tipoModelo: (event.target.value || undefined) as any }))}><option value="">Todos</option><option value="INSTITUCIONAL">Institucional</option><option value="SETOR">Setor</option><option value="FUNCAO">Função</option><option value="USUARIO">Usuário</option></Select></div>
            <div className="flex items-end gap-4 xl:col-span-2">
              <label className="inline-flex items-center gap-2 text-sm"><Checkbox checked={!!filtros.somentePendentes} onChange={(event) => setFiltros((atual) => ({ ...atual, somentePendentes: event.target.checked || undefined }))} /> Somente pendentes</label>
              <label className="inline-flex items-center gap-2 text-sm"><Checkbox checked={!!filtros.somenteAtrasados} onChange={(event) => setFiltros((atual) => ({ ...atual, somenteAtrasados: event.target.checked || undefined }))} /> Somente atrasados</label>
            </div>
          </CardContent> : null}
        </Card>
      </div>

      {abaAtiva === "diario" ? conteudoExecucoes : null}
      {abaAtiva === "semanal" ? conteudoSemanal : null}
      {abaAtiva === "modelos" ? conteudoModelosPremium : null}
      {abaAtiva === "indicadores" ? conteudoIndicadoresPremium : null}
      {abaAtiva === "configuracoes" ? conteudoConfiguracoes : null}
      {abaAtiva === "historico" ? conteudoHistoricoPremium : null}

      {popupMensagem ? <PopupMensagem popup={popupMensagem} onClose={() => setPopupMensagem(null)} /> : null}
    </AdminPageLayout>
  );
}
