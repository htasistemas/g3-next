import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  CircleSlash2,
  Clock3,
  FileDown,
  FileText,
  FolderKanban,
  LayoutGrid,
  ListFilter,
  ListTodo,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  Save,
  Search,
  SquareArrowOutUpRight,
  Trash2,
  X
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis
} from "recharts";
import { AdminPageLayout, type AdminAction, type AdminTab } from "@/components/admin/admin-page-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PopupConfirmacao, PopupMensagem, type PopupMensagemState } from "@/components/admin/admin-popups";
import { ResponsiveChart } from "@/components/charts/responsive-chart";
import { useAuth } from "@/hooks/use-auth";
import { useUnidadesAssistenciais } from "@/features/unidades-assistenciais/use-unidades-assistenciais";
import {
  useHistoricoProjeto,
  useInativarProjeto,
  useMoverTarefaProjeto,
  useProjetos,
  useProjetosDashboard,
  useRelatorioProjeto,
  useSalvarProjeto,
  useSalvarTarefaProjeto,
  useProjeto
} from "@/features/projetos/use-projetos";
import { abrirRelatorioPdf, reservarJanelaRelatorio } from "@/lib/report-utils";
import { cn } from "@/lib/utils";
import { formatarDataPtBr, normalizarEmail } from "@/lib/br-utils";
import type {
  Projeto,
  ProjetoArea,
  ProjetoDashboardItem,
  ProjetoFiltros,
  ProjetoPayload,
  ProjetoPrioridade,
  ProjetoStatus,
  ProjetoTarefa,
  ProjetoTarefaPayload,
  ProjetoTarefaStatus,
  ProjetoTarefaTipo
} from "@/types/projeto";

type AbaId = "visao-geral" | "projetos" | "kanban" | "relatorios";

const abas: AdminTab[] = [
  { id: "visao-geral", label: "Visão geral", icon: BarChart3 },
  { id: "projetos", label: "Projetos", icon: LayoutGrid },
  { id: "kanban", label: "Kanban", icon: FolderKanban },
  { id: "relatorios", label: "Relatórios", icon: FileText }
];

const prioridades: Array<{ value: ProjetoPrioridade; label: string }> = [
  { value: "BAIXA", label: "Baixa" },
  { value: "MEDIA", label: "Média" },
  { value: "ALTA", label: "Alta" },
  { value: "URGENTE", label: "Urgente" }
];

const statusProjeto: Array<{ value: ProjetoStatus; label: string }> = [
  { value: "NAO_INICIADO", label: "Não iniciado" },
  { value: "EM_ANDAMENTO", label: "Em andamento" },
  { value: "PARADO", label: "Parado" },
  { value: "CONCLUIDO", label: "Concluído" },
  { value: "CANCELADO", label: "Cancelado" }
];

const areasProjeto: Array<{ value: ProjetoArea; label: string }> = [
  { value: "ASSISTENCIA_SOCIAL", label: "Assistência social" },
  { value: "EDUCACAO", label: "Educação" },
  { value: "SAUDE", label: "Saúde" },
  { value: "ALIMENTACAO", label: "Alimentação" },
  { value: "CAPACITACAO_PROFISSIONAL", label: "Capacitação profissional" },
  { value: "CULTURA", label: "Cultura" },
  { value: "ESPORTE", label: "Esporte" },
  { value: "HABITACAO", label: "Habitação" },
  { value: "CAPTACAO_RECURSOS", label: "Captação de recursos" },
  { value: "OUTRO", label: "Outro" }
];

const tiposTarefa: Array<{ value: ProjetoTarefaTipo; label: string }> = [
  { value: "PLANEJAMENTO", label: "Planejamento" },
  { value: "EXECUCAO", label: "Execução" },
  { value: "ATENDIMENTO", label: "Atendimento" },
  { value: "COMPRA", label: "Compra" },
  { value: "PRESTACAO_CONTAS", label: "Prestação de contas" },
  { value: "RELATORIO", label: "Relatório" },
  { value: "REUNIAO", label: "Reunião" },
  { value: "MONITORAMENTO", label: "Monitoramento" },
  { value: "DIVULGACAO", label: "Divulgação" },
  { value: "OUTRO", label: "Outro" }
];

const statusTarefa: Array<{ value: ProjetoTarefaStatus; label: string }> = [
  { value: "NAO_INICIADO", label: "Não iniciado" },
  { value: "EM_ANDAMENTO", label: "Em andamento" },
  { value: "PARADO", label: "Parado" },
  { value: "CONCLUIDO", label: "Concluído" }
];

const relatorios = [
  { tipo: "geral", titulo: "Relatório geral de projetos", descricao: "Lista consolidada dos projetos filtrados." },
  { tipo: "status", titulo: "Relatório por status", descricao: "Distribuição dos projetos por status." },
  { tipo: "prioridade", titulo: "Relatório por prioridade", descricao: "Distribuição dos projetos por prioridade." },
  { tipo: "atrasados", titulo: "Relatório de atrasados", descricao: "Projetos com prazo vencido." },
  { tipo: "evolucao", titulo: "Relatório de evolução", descricao: "Evolução percentual dos projetos." },
  {
    tipo: "tarefas-responsavel",
    titulo: "Relatório de tarefas por responsável",
    descricao: "Tarefas distribuídas por responsável."
  },
  {
    tipo: "individual",
    titulo: "Relatório individual",
    descricao: "Relatório completo do projeto selecionado."
  }
] as const;

const emptyProjetoPayload: ProjetoPayload = {
  nome: "",
  descricao_completa: "",
  objetivo_geral: "",
  publico_alvo: "",
  unidade_assistencial_id: "",
  responsavel: "",
  equipe_envolvida: [],
  data_inicio: "",
  prazo_previsto: "",
  data_termino_real: "",
  prioridade: "MEDIA",
  status: "NAO_INICIADO",
  area_projeto: "ASSISTENCIA_SOCIAL",
  fonte_recurso: "",
  observacoes: "",
  ativo: true
};

const emptyTarefaPayload: ProjetoTarefaPayload = {
  titulo: "",
  descricao: "",
  tipo_tarefa: "PLANEJAMENTO",
  responsavel: "",
  prioridade: "MEDIA",
  status: "NAO_INICIADO",
  data_prevista: "",
  data_conclusao: "",
  observacoes: "",
  ordem_kanban: 0,
  ativo: true
};

const emptyFiltros: ProjetoFiltros = {
  nome: "",
  responsavel: "",
  status: undefined,
  prioridade: undefined,
  area_projeto: undefined,
  data_inicio_de: "",
  data_inicio_ate: "",
  prazo_de: "",
  prazo_ate: "",
  atrasados: undefined,
  concluidos: undefined,
  unidade_assistencial_id: "",
  ativo: true
};

const coresStatus: Record<ProjetoStatus | ProjetoTarefaStatus, string> = {
  NAO_INICIADO: "#94a3b8",
  EM_ANDAMENTO: "#2563eb",
  PARADO: "#f59e0b",
  CONCLUIDO: "#16a34a",
  CANCELADO: "#64748b"
};

function formatarPercentual(valor?: number | null) {
  return `${Math.round(Number(valor ?? 0))}%`;
}

function isAtrasado(prazo?: string | null, status?: string | null) {
  if (!prazo || !status) return false;
  if (status === "CONCLUIDO" || status === "CANCELADO") return false;
  const prazoDate = new Date(`${prazo}T00:00:00`);
  return !Number.isNaN(prazoDate.getTime()) && prazoDate < new Date(new Date().toDateString());
}

function getProjetoPrazoStatus(projeto: Projeto) {
  if (projeto.indicadorPrazo === "CONCLUIDO") {
    return { texto: "Concluído", classe: "bg-emerald-100 text-emerald-800" };
  }
  if (projeto.indicadorPrazo === "ATRASADO") {
    return { texto: "Atrasado", classe: "bg-red-100 text-red-700" };
  }
  return { texto: "No prazo", classe: "bg-blue-100 text-blue-700" };
}

function formatarEvolucao(item: ProjetoDashboardItem) {
  return `${item.total}%`;
}

function extrairEquipeTexto(valor: string[]) {
  return valor.join("\n");
}

function normalizarEquipeTexto(valor: string) {
  return valor
    .split(/\r?\n|;/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function tituloPrazo(projeto: Projeto) {
  if (!projeto.prazoPrevisto) return "Sem prazo informado";
  return formatarDataPtBr(projeto.prazoPrevisto);
}

export function ProjetosPage() {
  const { usuario } = useAuth();
  const queryClient = useQueryClient();
  const unidadesQuery = useUnidadesAssistenciais({});
  const [activeTab, setActiveTab] = useState<AbaId>("visao-geral");
  const [filtrosRascunho, setFiltrosRascunho] = useState<ProjetoFiltros>(emptyFiltros);
  const [filtrosAplicados, setFiltrosAplicados] = useState<ProjetoFiltros>(emptyFiltros);
  const [projetoForm, setProjetoForm] = useState<ProjetoPayload & { id?: string }>(emptyProjetoPayload);
  const [tarefaForm, setTarefaForm] = useState<ProjetoTarefaPayload & { id?: string }>(emptyTarefaPayload);
  const [projetoSelecionadoId, setProjetoSelecionadoId] = useState<string>("");
  const [tarefaArrastadaId, setTarefaArrastadaId] = useState<string>("");
  const [popupMensagem, setPopupMensagem] = useState<PopupMensagemState | null>(null);
  const [confirmarInativacao, setConfirmarInativacao] = useState(false);

  const projetosQuery = useProjetos(filtrosAplicados);
  const dashboardQuery = useProjetosDashboard(filtrosAplicados, activeTab === "visao-geral");
  const projetoSelecionadoQuery = useProjeto(projetoSelecionadoId, !!projetoSelecionadoId);
  const historicoQuery = useHistoricoProjeto(projetoSelecionadoId, activeTab !== "visao-geral");
  const salvarProjetoMutation = useSalvarProjeto();
  const inativarProjetoMutation = useInativarProjeto();
  const salvarTarefaMutation = useSalvarTarefaProjeto();
  const moverTarefaMutation = useMoverTarefaProjeto();
  const relatorioMutation = useRelatorioProjeto();

  const projetos = projetosQuery.data ?? [];
  const projetoDetalhado = projetoSelecionadoQuery.data ?? projetos.find((item) => item.id === projetoSelecionadoId) ?? null;
  const historico = historicoQuery.data ?? projetoDetalhado?.historico ?? [];
  const resumo = dashboardQuery.data?.resumo;
  const graficos = dashboardQuery.data?.graficos;
  const unidades = unidadesQuery.data?.unidades ?? [];
  const projetoPadraoKanban = projetoDetalhado ?? projetos[0] ?? null;

  useEffect(() => {
    if (!projetoSelecionadoId && projetos.length > 0) {
      setProjetoSelecionadoId(projetos[0]!.id);
    }
  }, [projetos, projetoSelecionadoId]);

  useEffect(() => {
    if (projetoDetalhado && !projetoForm.id && activeTab === "projetos") {
      setTarefaForm((atual) => ({ ...atual, responsavel: atual.responsavel || projetoDetalhado.responsavel }));
    }
  }, [activeTab, projetoDetalhado, projetoForm.id]);

  useEffect(() => {
    if (projetoDetalhado) {
      setTarefaForm((atual) => ({
        ...atual,
        responsavel: atual.responsavel || projetoDetalhado.responsavel
      }));
    }
  }, [projetoDetalhado?.id]);

  const acoes = useMemo<AdminAction[]>(
    () => [
      {
        id: "novo",
        label: "Novo projeto",
        icon: Plus,
        variant: "default",
        onClick: novoProjeto
      },
      {
        id: "atualizar",
        label: "Atualizar",
        icon: RefreshCw,
        variant: "outline",
        onClick: atualizarTudo
      },
      {
        id: "salvar",
        label: "Salvar",
        icon: Save,
        variant: "default",
        onClick: salvarProjeto,
        disabled: salvarProjetoMutation.isPending || activeTab !== "projetos" && activeTab !== "kanban"
      },
      {
        id: "imprimir",
        label: "Imprimir",
        icon: Printer,
        variant: "outline",
        onClick: () => void gerarRelatorio("geral")
      }
    ],
    [salvarProjetoMutation.isPending, activeTab, projetoSelecionadoId, filtrosAplicados, projetoDetalhado]
  );

  function novoProjeto() {
    setProjetoForm({ ...emptyProjetoPayload });
    setActiveTab("projetos");
    setPopupMensagem(null);
  }

  function editarProjeto(projeto: Projeto) {
    setProjetoForm({
      id: projeto.id,
      nome: projeto.nome,
      descricao_completa: projeto.descricaoCompleta,
      objetivo_geral: projeto.objetivoGeral,
      publico_alvo: projeto.publicoAlvo,
      unidade_assistencial_id: projeto.unidadeAssistencialId ?? "",
      responsavel: projeto.responsavel,
      equipe_envolvida: projeto.equipeEnvolvida,
      data_inicio: projeto.dataInicio ?? "",
      prazo_previsto: projeto.prazoPrevisto ?? "",
      data_termino_real: projeto.dataTerminoReal ?? "",
      prioridade: projeto.prioridade,
      status: projeto.status,
      area_projeto: projeto.areaProjeto,
      fonte_recurso: projeto.fonteRecurso,
      observacoes: projeto.observacoes,
      ativo: projeto.ativo
    });
    setProjetoSelecionadoId(projeto.id);
    setActiveTab("projetos");
  }

  function limparFormularioProjeto() {
    setProjetoForm({ ...emptyProjetoPayload });
  }

  function limparFormularioTarefa() {
    setTarefaForm({ ...emptyTarefaPayload, responsavel: projetoPadraoKanban?.responsavel ?? "" });
  }

  function aplicarFiltros() {
    setFiltrosAplicados({
      ...filtrosRascunho,
      nome: filtrosRascunho.nome?.trim() || "",
      responsavel: filtrosRascunho.responsavel?.trim() || "",
      unidade_assistencial_id: filtrosRascunho.unidade_assistencial_id?.trim() || "",
      data_inicio_de: filtrosRascunho.data_inicio_de?.trim() || "",
      data_inicio_ate: filtrosRascunho.data_inicio_ate?.trim() || "",
      prazo_de: filtrosRascunho.prazo_de?.trim() || "",
      prazo_ate: filtrosRascunho.prazo_ate?.trim() || ""
    });
  }

  function limparFiltros() {
    setFiltrosRascunho({ ...emptyFiltros });
    setFiltrosAplicados({ ...emptyFiltros });
  }

  async function atualizarTudo() {
    await Promise.all([projetosQuery.refetch(), dashboardQuery.refetch(), historicoQuery.refetch()]);
  }

  async function salvarProjeto() {
    const nome = projetoForm.nome.trim();
    const responsavel = projetoForm.responsavel.trim();
    if (!nome || !responsavel || !projetoForm.data_inicio || !projetoForm.prazo_previsto) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Validação",
        texto: "Preencha nome, responsável, data de início e prazo previsto."
      });
      return;
    }
    if (projetoForm.status === "CONCLUIDO" && !projetoForm.data_termino_real) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Validação",
        texto: "Projeto concluído precisa informar a data de término real."
      });
      return;
    }
    if (projetoForm.data_termino_real && projetoForm.data_inicio && projetoForm.data_termino_real < projetoForm.data_inicio) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Validação",
        texto: "A data de término não pode ser menor que a data de início."
      });
      return;
    }

    const payload: ProjetoPayload = {
      nome,
      descricao_completa: projetoForm.descricao_completa?.trim() || undefined,
      objetivo_geral: projetoForm.objetivo_geral?.trim() || undefined,
      publico_alvo: projetoForm.publico_alvo?.trim() || undefined,
      unidade_assistencial_id: projetoForm.unidade_assistencial_id?.trim() || undefined,
      responsavel,
      equipe_envolvida: projetoForm.equipe_envolvida?.filter(Boolean),
      data_inicio: projetoForm.data_inicio,
      prazo_previsto: projetoForm.prazo_previsto,
      data_termino_real: projetoForm.data_termino_real?.trim() || undefined,
      prioridade: projetoForm.prioridade,
      status: projetoForm.status,
      area_projeto: projetoForm.area_projeto,
      fonte_recurso: projetoForm.fonte_recurso?.trim() || undefined,
      observacoes: projetoForm.observacoes?.trim() || undefined,
      ativo: projetoForm.ativo
    };

    try {
      const projeto = await salvarProjetoMutation.mutateAsync({ id: projetoForm.id, payload });
      setProjetoSelecionadoId(projeto.id);
      setPopupMensagem({
        tipo: "sucesso",
        titulo: "Projeto salvo",
        texto: "O projeto foi salvo com sucesso."
      });
      setProjetoForm({
        id: projeto.id,
        nome: projeto.nome,
        descricao_completa: projeto.descricaoCompleta,
        objetivo_geral: projeto.objetivoGeral,
        publico_alvo: projeto.publicoAlvo,
        unidade_assistencial_id: projeto.unidadeAssistencialId ?? "",
        responsavel: projeto.responsavel,
        equipe_envolvida: projeto.equipeEnvolvida,
        data_inicio: projeto.dataInicio ?? "",
        prazo_previsto: projeto.prazoPrevisto ?? "",
        data_termino_real: projeto.dataTerminoReal ?? "",
        prioridade: projeto.prioridade,
        status: projeto.status,
        area_projeto: projeto.areaProjeto,
        fonte_recurso: projeto.fonteRecurso,
        observacoes: projeto.observacoes,
        ativo: projeto.ativo
      });
      await atualizarTudo();
    } catch (error) {
      setPopupMensagem({
        tipo: "erro",
        titulo: "Erro ao salvar",
        texto: error instanceof Error ? error.message : "Não foi possível salvar o projeto."
      });
    }
  }

  async function confirmarInativacaoProjeto() {
    if (!projetoDetalhado) return;
    try {
      await inativarProjetoMutation.mutateAsync(projetoDetalhado.id);
      setPopupMensagem({
        tipo: "sucesso",
        titulo: "Projeto inativado",
        texto: "O projeto foi inativado com sucesso."
      });
      setConfirmarInativacao(false);
      if (projetoDetalhado.id === projetoSelecionadoId) {
        setProjetoSelecionadoId("");
      }
      await atualizarTudo();
    } catch (error) {
      setPopupMensagem({
        tipo: "erro",
        titulo: "Erro ao inativar",
        texto: error instanceof Error ? error.message : "Não foi possível inativar o projeto."
      });
    }
  }

  async function salvarTarefa() {
    const projetoId = projetoPadraoKanban?.id ?? projetoSelecionadoId;
    if (!projetoId) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Selecione um projeto",
        texto: "Escolha um projeto para criar ou mover tarefas."
      });
      return;
    }
    if (!tarefaForm.titulo.trim() || !tarefaForm.responsavel.trim()) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Validação",
        texto: "Preencha título e responsável da tarefa."
      });
      return;
    }
    if (tarefaForm.status === "CONCLUIDO" && !tarefaForm.data_conclusao) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Validação",
        texto: "Tarefa concluída precisa informar a data de conclusão."
      });
      return;
    }

    try {
      await salvarTarefaMutation.mutateAsync({
        projetoId,
        tarefaId: tarefaForm.id,
        payload: {
          titulo: tarefaForm.titulo.trim(),
          descricao: tarefaForm.descricao?.trim() || undefined,
          tipo_tarefa: tarefaForm.tipo_tarefa,
          responsavel: tarefaForm.responsavel.trim(),
          prioridade: tarefaForm.prioridade,
          status: tarefaForm.status,
          data_prevista: tarefaForm.data_prevista?.trim() || undefined,
          data_conclusao: tarefaForm.data_conclusao?.trim() || undefined,
          observacoes: tarefaForm.observacoes?.trim() || undefined,
          ordem_kanban: tarefaForm.ordem_kanban ?? 0,
          ativo: tarefaForm.ativo
        }
      });
      setPopupMensagem({
        tipo: "sucesso",
        titulo: "Tarefa salva",
        texto: "A tarefa foi salva com sucesso."
      });
      limparFormularioTarefa();
      await atualizarTudo();
    } catch (error) {
      setPopupMensagem({
        tipo: "erro",
        titulo: "Erro ao salvar tarefa",
        texto: error instanceof Error ? error.message : "Não foi possível salvar a tarefa."
      });
    }
  }

  async function moverTarefa(tarefa: ProjetoTarefa, status: ProjetoTarefaStatus) {
    const projetoId = projetoPadraoKanban?.id;
    if (!projetoId || tarefa.status === status) return;
    try {
      setTarefaArrastadaId(tarefa.id);
      await moverTarefaMutation.mutateAsync({ projetoId, tarefaId: tarefa.id, status });
      setPopupMensagem({
        tipo: "sucesso",
        titulo: "Tarefa movida",
        texto: "O status da tarefa foi atualizado no Kanban."
      });
      await atualizarTudo();
    } catch (error) {
      setPopupMensagem({
        tipo: "erro",
        titulo: "Erro ao mover tarefa",
        texto: error instanceof Error ? error.message : "Não foi possível mover a tarefa."
      });
    } finally {
      setTarefaArrastadaId("");
    }
  }

  async function gerarRelatorio(tipo: string, projetoId?: string) {
    const reserva = reservarJanelaRelatorio("Gerando relatório");
    try {
      const payload: Record<string, unknown> = {
        ...filtrosAplicados,
        projeto_id: tipo === "individual" ? projetoId ?? projetoPadraoKanban?.id ?? projetoSelecionadoId : undefined
      };
      const blob = await relatorioMutation.mutateAsync({ tipo, payload });
      reserva.publicar(blob);
    } catch (error) {
      reserva.fechar();
      setPopupMensagem({
        tipo: "erro",
        titulo: "Erro ao gerar relatório",
        texto: error instanceof Error ? error.message : "Não foi possível gerar o PDF."
      });
    }
  }

  const tabActions: AdminAction[] = [
    { id: "novo", label: "Novo projeto", icon: Plus, variant: "default", onClick: novoProjeto },
    { id: "buscar", label: "Buscar", icon: Search, variant: "outline", onClick: aplicarFiltros },
    { id: "atualizar", label: "Atualizar", icon: RefreshCw, variant: "outline", onClick: atualizarTudo },
    { id: "salvar", label: "Salvar", icon: Save, variant: "default", onClick: salvarProjeto },
    {
      id: "imprimir",
      label: "Relatório",
      icon: Printer,
      variant: "outline",
      onClick: () => void gerarRelatorio("geral")
    }
  ];

  const resumoCards = [
    { titulo: "Total de projetos", valor: resumo?.totalProjetos ?? 0, icone: FolderKanban, cor: "text-slate-800" },
    { titulo: "Em andamento", valor: resumo?.projetosEmAndamento ?? 0, icone: SquareArrowOutUpRight, cor: "text-blue-700" },
    { titulo: "Parados", valor: resumo?.projetosParados ?? 0, icone: CircleSlash2, cor: "text-amber-700" },
    { titulo: "Concluídos", valor: resumo?.projetosConcluidos ?? 0, icone: CheckCircle2, cor: "text-emerald-700" },
    { titulo: "Atrasados", valor: resumo?.projetosAtrasados ?? 0, icone: AlertTriangle, cor: "text-red-700" },
    { titulo: "Evolução média", valor: formatarPercentual(resumo?.percentualMedioEvolucao), icone: BarChart3, cor: "text-teal-700" },
    { titulo: "Tarefas abertas", valor: resumo?.tarefasAbertas ?? 0, icone: ListTodo, cor: "text-slate-800" },
    { titulo: "Tarefas concluídas", valor: resumo?.tarefasConcluidas ?? 0, icone: CheckCircle2, cor: "text-emerald-700" }
  ];

  const projetosOrdenados = [...projetos].sort((a, b) => {
    if (a.indicadorPrazo === "ATRASADO" && b.indicadorPrazo !== "ATRASADO") return -1;
    if (a.indicadorPrazo !== "ATRASADO" && b.indicadorPrazo === "ATRASADO") return 1;
    return (b.updatedAt || "").localeCompare(a.updatedAt || "");
  });

  const projetoAtual = projetoPadraoKanban;
  const tarefasKanban = projetoAtual?.tarefas ?? [];
  const historicoAtual = historico ?? [];
  const tareasPorStatus = {
    NAO_INICIADO: tarefasKanban.filter((item) => item.status === "NAO_INICIADO"),
    EM_ANDAMENTO: tarefasKanban.filter((item) => item.status === "EM_ANDAMENTO"),
    PARADO: tarefasKanban.filter((item) => item.status === "PARADO"),
    CONCLUIDO: tarefasKanban.filter((item) => item.status === "CONCLUIDO")
  };

  const indicadoresVencimento = [
    { faixa: "7 dias", total: graficos?.projetosVencendo.find((item) => item.faixa === "7 dias")?.total ?? 0 },
    { faixa: "15 dias", total: graficos?.projetosVencendo.find((item) => item.faixa === "15 dias")?.total ?? 0 },
    { faixa: "30 dias", total: graficos?.projetosVencendo.find((item) => item.faixa === "30 dias")?.total ?? 0 }
  ];

  return (
    <>
      <AdminPageLayout
        tabs={abas}
        activeTab={activeTab}
        onChangeTab={(id) => setActiveTab(id as AbaId)}
        actions={tabActions}
        sectionLabel="Administração e gestão"
        pageTitle="Projetos"
        activeTitle={
          activeTab === "visao-geral"
            ? "Visão geral"
            : activeTab === "projetos"
              ? "Projetos"
              : activeTab === "kanban"
                ? "Kanban"
                : "Relatórios"
        }
        activeIcon={FolderKanban}
      >
        {activeTab === "visao-geral" ? (
          <section className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {resumoCards.map((card) => {
                const Icon = card.icone;
                return (
                  <Card key={card.titulo} className="border-[var(--g3-border)] shadow-sm">
                    <CardContent className="flex items-center justify-between gap-3 p-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--g3-muted)]">
                          {card.titulo}
                        </p>
                        <p className={cn("mt-2 text-2xl font-black", card.cor)}>{card.valor}</p>
                      </div>
                      <Icon className={cn("h-6 w-6", card.cor)} />
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Projetos por status</CardTitle>
                </CardHeader>
                <CardContent className="h-72">
                  <ResponsiveChart>
                    <BarChart data={graficos?.projetosPorStatus ?? []} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="chave" tickFormatter={(valor) => valor?.replaceAll("_", " ")} />
                      <YAxis />
                      <Bar dataKey="total" fill="#0f766e" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveChart>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Projetos por prioridade</CardTitle>
                </CardHeader>
                <CardContent className="h-72">
                  <ResponsiveChart>
                    <PieChart>
                      <Pie
                        data={graficos?.projetosPorPrioridade ?? []}
                        dataKey="total"
                        nameKey="chave"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        label
                      >
                        {(graficos?.projetosPorPrioridade ?? []).map((item, index) => (
                          <Cell key={`${item.chave}-${index}`} fill={["#0f766e", "#2563eb", "#f59e0b", "#ef4444"][index % 4]} />
                        ))}
                      </Pie>
                      <Legend />
                    </PieChart>
                  </ResponsiveChart>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
              <Card>
                <CardHeader>
                  <CardTitle>Evolução dos projetos</CardTitle>
                </CardHeader>
                <CardContent className="h-72">
                  <ResponsiveChart>
                    <LineChart data={graficos?.evolucaoProjetos ?? []} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="chave" hide />
                      <YAxis />
                      <Line type="monotone" dataKey="total" stroke="#0f766e" strokeWidth={3} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveChart>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Tarefas por responsável</CardTitle>
                </CardHeader>
                <CardContent className="h-72">
                  <ResponsiveChart>
                    <BarChart data={graficos?.tarefasPorResponsavel ?? []} layout="vertical" margin={{ top: 8, right: 8, left: 20, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="chave" type="category" width={130} />
                      <Bar dataKey="total" fill="#2563eb" radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveChart>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
              <Card>
                <CardHeader>
                  <CardTitle>Projetos vencendo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {indicadoresVencimento.map((item) => (
                    <div key={item.faixa} className="flex items-center justify-between rounded-lg border border-[var(--g3-border)] px-3 py-2">
                      <span className="text-sm text-[var(--g3-foreground)]">{item.faixa}</span>
                      <Badge variant={item.total > 0 ? "warning" : "success"}>{item.total}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Leitura rápida</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-slate-700">
                  <p>
                    A tela acompanha dados reais do banco, respeitando o tenant da sessão atual.
                  </p>
                  <p>
                    Use a aba <strong>Projetos</strong> para filtrar, editar e acompanhar os cartões.
                  </p>
                  <p>
                    Use <strong>Kanban</strong> para mover tarefas entre as colunas com drag and drop.
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>
        ) : null}

        {activeTab === "projetos" ? (
          <section className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ListFilter className="h-4 w-4" />
                  Filtros
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <CampoTexto label="Nome do projeto" value={filtrosRascunho.nome ?? ""} onChange={(value) => setFiltrosRascunho((atual) => ({ ...atual, nome: value }))} />
                  <CampoTexto label="Responsável" value={filtrosRascunho.responsavel ?? ""} onChange={(value) => setFiltrosRascunho((atual) => ({ ...atual, responsavel: value }))} />
                  <CampoSelect
                    label="Status"
                    value={filtrosRascunho.status ?? ""}
                    onChange={(value) => setFiltrosRascunho((atual) => ({ ...atual, status: value as ProjetoStatus | undefined }))}
                    options={[{ value: "", label: "Todos" }, ...statusProjeto.map((item) => ({ value: item.value, label: item.label }))]}
                  />
                  <CampoSelect
                    label="Prioridade"
                    value={filtrosRascunho.prioridade ?? ""}
                    onChange={(value) => setFiltrosRascunho((atual) => ({ ...atual, prioridade: value as ProjetoPrioridade | undefined }))}
                    options={[{ value: "", label: "Todas" }, ...prioridades.map((item) => ({ value: item.value, label: item.label }))]}
                  />
                  <CampoSelect
                    label="Área do projeto"
                    value={filtrosRascunho.area_projeto ?? ""}
                    onChange={(value) => setFiltrosRascunho((atual) => ({ ...atual, area_projeto: value as ProjetoArea | undefined }))}
                    options={[{ value: "", label: "Todas" }, ...areasProjeto.map((item) => ({ value: item.value, label: item.label }))]}
                  />
                  <CampoTexto label="Início de" value={filtrosRascunho.data_inicio_de ?? ""} onChange={(value) => setFiltrosRascunho((atual) => ({ ...atual, data_inicio_de: value }))} type="date" />
                  <CampoTexto label="Início até" value={filtrosRascunho.data_inicio_ate ?? ""} onChange={(value) => setFiltrosRascunho((atual) => ({ ...atual, data_inicio_ate: value }))} type="date" />
                  <CampoTexto label="Prazo de" value={filtrosRascunho.prazo_de ?? ""} onChange={(value) => setFiltrosRascunho((atual) => ({ ...atual, prazo_de: value }))} type="date" />
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <CampoTexto label="Prazo até" value={filtrosRascunho.prazo_ate ?? ""} onChange={(value) => setFiltrosRascunho((atual) => ({ ...atual, prazo_ate: value }))} type="date" />
                  <CampoSelect
                    label="Unidade assistencial"
                    value={filtrosRascunho.unidade_assistencial_id ?? ""}
                    onChange={(value) => setFiltrosRascunho((atual) => ({ ...atual, unidade_assistencial_id: value }))}
                    options={[{ value: "", label: "Todas" }, ...unidades.map((item) => ({ value: item.id_unidade ?? "", label: item.nome_fantasia }))]}
                  />
                  <CampoCheckbox
                    label="Projetos atrasados"
                    checked={Boolean(filtrosRascunho.atrasados)}
                    onChange={(checked) => setFiltrosRascunho((atual) => ({ ...atual, atrasados: checked, concluidos: checked ? false : atual.concluidos }))}
                  />
                  <CampoCheckbox
                    label="Projetos concluídos"
                    checked={Boolean(filtrosRascunho.concluidos)}
                    onChange={(checked) => setFiltrosRascunho((atual) => ({ ...atual, concluidos: checked, atrasados: checked ? false : atual.atrasados }))}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" onClick={aplicarFiltros} disabled={projetosQuery.isFetching}>
                    <Search className="mr-2 h-4 w-4" />
                    Buscar
                  </Button>
                  <Button type="button" variant="outline" onClick={limparFiltros}>
                    Limpar filtros
                  </Button>
                  <Button type="button" variant="outline" onClick={novoProjeto}>
                    <Plus className="mr-2 h-4 w-4" />
                    Novo projeto
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
              <Card>
                <CardHeader className="flex-row items-center justify-between gap-3">
                  <CardTitle>Projetos cadastrados</CardTitle>
                  <Badge variant="default">{projetos.length}</Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  {projetosQuery.isLoading ? (
                    <EstadoVazio texto="Carregando projetos..." />
                  ) : projetosOrdenados.length === 0 ? (
                    <EstadoVazio texto="Nenhum projeto cadastrado para os filtros atuais." />
                  ) : (
                    projetosOrdenados.map((projeto) => {
                      const prazo = getProjetoPrazoStatus(projeto);
                      return (
                        <div
                          key={projeto.id}
                          onClick={() => setProjetoSelecionadoId(projeto.id)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              setProjetoSelecionadoId(projeto.id);
                            }
                          }}
                          className={cn(
                            "w-full rounded-2xl border p-4 text-left transition hover:-translate-y-0.5",
                            projetoSelecionadoId === projeto.id
                              ? "border-[var(--g3-active)] bg-[var(--g3-primary-soft)] shadow-md"
                              : "border-[var(--g3-border)] bg-white"
                          )}
                        >
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-base font-semibold text-[var(--g3-foreground)]">{projeto.nome}</h3>
                                <Badge variant={projeto.indicadorPrazo === "ATRASADO" ? "danger" : projeto.indicadorPrazo === "CONCLUIDO" ? "success" : "info"}>
                                  {prazo.texto}
                                </Badge>
                                <Badge variant="default">{projeto.areaProjetoLabel}</Badge>
                              </div>
                              <p className="line-clamp-2 text-sm text-[var(--g3-muted)]">{projeto.descricaoCurta}</p>
                              <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                                <span>Início: {formatarDataPtBr(projeto.dataInicio)}</span>
                                <span>Prazo: {tituloPrazo(projeto)}</span>
                                {projeto.dataTerminoReal ? <span>Término: {formatarDataPtBr(projeto.dataTerminoReal)}</span> : null}
                                <span>Responsável: {projeto.responsavel}</span>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant={projeto.prioridade === "URGENTE" ? "danger" : projeto.prioridade === "ALTA" ? "warning" : "default"}>
                                {projeto.prioridadeLabel}
                              </Badge>
                              <Badge variant={projeto.status === "CONCLUIDO" ? "success" : projeto.status === "PARADO" ? "warning" : "default"}>
                                {projeto.statusLabel}
                              </Badge>
                              <Badge variant="default">{projeto.percentualEvolucao}%</Badge>
                            </div>
                          </div>
                          <div className="mt-3 grid gap-2 md:grid-cols-4">
                            <ResumoMini label="Tarefas" valor={projeto.quantidadeTarefas} />
                            <ResumoMini label="Concluídas" valor={projeto.quantidadeTarefasConcluidas} />
                            <ResumoMini label="Evolução" valor={`${projeto.percentualEvolucao}%`} />
                            <ResumoMini label="Unidade" valor={projeto.unidadeAssistencialNome || "Sem unidade"} />
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button type="button" size="sm" variant="outline" onClick={() => setProjetoSelecionadoId(projeto.id)}>
                              <SquareArrowOutUpRight className="mr-1.5 h-3.5 w-3.5" />
                              Ver detalhes
                            </Button>
                            <Button type="button" size="sm" variant="outline" onClick={() => editarProjeto(projeto)}>
                              <Pencil className="mr-1.5 h-3.5 w-3.5" />
                              Editar
                            </Button>
                            <Button type="button" size="sm" variant="outline" onClick={() => void gerarRelatorio("individual", projeto.id)}>
                              <FileDown className="mr-1.5 h-3.5 w-3.5" />
                              Relatório
                            </Button>
                            <Button type="button" size="sm" variant="danger" onClick={() => { setProjetoSelecionadoId(projeto.id); setConfirmarInativacao(true); }}>
                              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                              Inativar
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>

              <div className="space-y-4">
                <Card>
                  <CardHeader className="flex-row items-center justify-between gap-3">
                    <CardTitle>Detalhes do projeto</CardTitle>
                    {projetoDetalhado ? <Badge variant={projetoDetalhado.indicadorPrazo === "ATRASADO" ? "danger" : projetoDetalhado.indicadorPrazo === "CONCLUIDO" ? "success" : "info"}>{projetoDetalhado.statusLabel}</Badge> : null}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {projetoDetalhado ? (
                      <>
                        <div className="space-y-2">
                          <p className="text-base font-semibold text-[var(--g3-foreground)]">{projetoDetalhado.nome}</p>
                          <p className="text-sm text-[var(--g3-muted)]">{projetoDetalhado.descricaoCompleta || "Sem descrição detalhada."}</p>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <InfoLinha label="Objetivo geral" valor={projetoDetalhado.objetivoGeral || "---"} />
                          <InfoLinha label="Público-alvo" valor={projetoDetalhado.publicoAlvo || "---"} />
                          <InfoLinha label="Unidade assistencial" valor={projetoDetalhado.unidadeAssistencialNome || "---"} />
                          <InfoLinha label="Responsável" valor={projetoDetalhado.responsavel} />
                          <InfoLinha label="Início" valor={formatarDataPtBr(projetoDetalhado.dataInicio)} />
                          <InfoLinha label="Prazo previsto" valor={formatarDataPtBr(projetoDetalhado.prazoPrevisto)} />
                        </div>
                        <div className="grid gap-3 sm:grid-cols-3">
                          <InfoLinha label="Prioridade" valor={projetoDetalhado.prioridadeLabel} />
                          <InfoLinha label="Status" valor={projetoDetalhado.statusLabel} />
                          <InfoLinha label="Evolução" valor={`${projetoDetalhado.percentualEvolucao}%`} />
                        </div>
                        {projetoDetalhado.observacoes ? <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{projetoDetalhado.observacoes}</p> : null}
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" variant="outline" onClick={() => editarProjeto(projetoDetalhado)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar projeto
                          </Button>
                          <Button type="button" variant="outline" onClick={() => void gerarRelatorio("individual", projetoDetalhado?.id)}>
                            <FileDown className="mr-2 h-4 w-4" />
                            Relatório individual
                          </Button>
                          <Button type="button" variant="danger" onClick={() => setConfirmarInativacao(true)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Inativar
                          </Button>
                        </div>
                      </>
                    ) : (
                      <EstadoVazio texto="Selecione um projeto para ver os detalhes." />
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>{projetoForm.id ? "Editar projeto" : "Cadastro de projeto"}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      <CampoTexto label="Nome do projeto" value={projetoForm.nome} onChange={(value) => setProjetoForm((atual) => ({ ...atual, nome: value }))} />
                      <CampoTexto label="Responsável" value={projetoForm.responsavel} onChange={(value) => setProjetoForm((atual) => ({ ...atual, responsavel: value }))} />
                      <CampoTexto label="Data de início" value={projetoForm.data_inicio} onChange={(value) => setProjetoForm((atual) => ({ ...atual, data_inicio: value }))} type="date" />
                      <CampoTexto label="Prazo previsto" value={projetoForm.prazo_previsto} onChange={(value) => setProjetoForm((atual) => ({ ...atual, prazo_previsto: value }))} type="date" />
                      <CampoTexto label="Término real" value={projetoForm.data_termino_real ?? ""} onChange={(value) => setProjetoForm((atual) => ({ ...atual, data_termino_real: value }))} type="date" />
                      <CampoSelect label="Unidade assistencial" value={projetoForm.unidade_assistencial_id ?? ""} onChange={(value) => setProjetoForm((atual) => ({ ...atual, unidade_assistencial_id: value }))} options={[{ value: "", label: "Sem vínculo" }, ...unidades.map((item) => ({ value: item.id_unidade ?? "", label: item.nome_fantasia }))]} />
                      <CampoSelect label="Prioridade" value={projetoForm.prioridade} onChange={(value) => setProjetoForm((atual) => ({ ...atual, prioridade: value as ProjetoPrioridade }))} options={prioridades} />
                      <CampoSelect label="Status" value={projetoForm.status} onChange={(value) => setProjetoForm((atual) => ({ ...atual, status: value as ProjetoStatus }))} options={statusProjeto} />
                      <CampoSelect label="Área do projeto" value={projetoForm.area_projeto} onChange={(value) => setProjetoForm((atual) => ({ ...atual, area_projeto: value as ProjetoArea }))} options={areasProjeto} />
                      <CampoTexto label="Fonte de recurso" value={projetoForm.fonte_recurso ?? ""} onChange={(value) => setProjetoForm((atual) => ({ ...atual, fonte_recurso: value }))} />
                    </div>
                    <CampoTextoArea label="Descrição completa" value={projetoForm.descricao_completa ?? ""} onChange={(value) => setProjetoForm((atual) => ({ ...atual, descricao_completa: value }))} />
                    <CampoTextoArea label="Objetivo geral" value={projetoForm.objetivo_geral ?? ""} onChange={(value) => setProjetoForm((atual) => ({ ...atual, objetivo_geral: value }))} />
                    <CampoTextoArea label="Público-alvo" value={projetoForm.publico_alvo ?? ""} onChange={(value) => setProjetoForm((atual) => ({ ...atual, publico_alvo: value }))} />
                    <CampoTextoArea label="Equipe envolvida" helper="Uma linha por pessoa ou função." value={extrairEquipeTexto(projetoForm.equipe_envolvida ?? [])} onChange={(value) => setProjetoForm((atual) => ({ ...atual, equipe_envolvida: normalizarEquipeTexto(value) }))} />
                    <CampoTextoArea label="Observações" value={projetoForm.observacoes ?? ""} onChange={(value) => setProjetoForm((atual) => ({ ...atual, observacoes: value }))} />
                    <div className="flex flex-wrap items-center gap-3">
                      <CampoCheckbox label="Ativo" checked={Boolean(projetoForm.ativo)} onChange={(checked) => setProjetoForm((atual) => ({ ...atual, ativo: checked }))} />
                      {projetoForm.status === "CONCLUIDO" && !projetoForm.data_termino_real ? (
                        <Badge variant="warning">Projeto concluído precisa de data de término</Badge>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" onClick={salvarProjeto} disabled={salvarProjetoMutation.isPending}>
                        <Save className="mr-2 h-4 w-4" />
                        {salvarProjetoMutation.isPending ? "Salvando..." : "Salvar projeto"}
                      </Button>
                      <Button type="button" variant="outline" onClick={limparFormularioProjeto}>
                        Limpar
                      </Button>
                      <Button type="button" variant="outline" onClick={novoProjeto}>
                        Novo
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === "kanban" ? (
          <section className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Projeto do Kanban</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 lg:grid-cols-[1.4fr_0.8fr_0.8fr]">
                  <CampoSelect
                    label="Selecionar projeto"
                    value={projetoSelecionadoId}
                    onChange={(value) => setProjetoSelecionadoId(value)}
                    options={[
                      { value: "", label: "Selecione" },
                      ...projetos.map((item) => ({ value: item.id, label: item.nome }))
                    ]}
                  />
                  <InfoLinha label="Responsável" valor={projetoAtual?.responsavel || "---"} />
                  <InfoLinha label="Evolução" valor={projetoAtual ? `${projetoAtual.percentualEvolucao}%` : "---"} />
                </div>
                {!projetoAtual ? (
                  <EstadoVazio texto="Selecione um projeto para visualizar o Kanban." />
                ) : (
                  <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
                    <Card className="border-[var(--g3-border)]">
                      <CardHeader>
                        <CardTitle>Nova tarefa</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <CampoTexto label="Título" value={tarefaForm.titulo} onChange={(value) => setTarefaForm((atual) => ({ ...atual, titulo: value }))} />
                        <CampoTexto label="Responsável" value={tarefaForm.responsavel || projetoAtual.responsavel} onChange={(value) => setTarefaForm((atual) => ({ ...atual, responsavel: value }))} />
                        <CampoSelect label="Tipo" value={tarefaForm.tipo_tarefa} onChange={(value) => setTarefaForm((atual) => ({ ...atual, tipo_tarefa: value as ProjetoTarefaTipo }))} options={tiposTarefa} />
                        <CampoSelect label="Prioridade" value={tarefaForm.prioridade} onChange={(value) => setTarefaForm((atual) => ({ ...atual, prioridade: value as ProjetoPrioridade }))} options={prioridades} />
                        <CampoSelect label="Status" value={tarefaForm.status} onChange={(value) => setTarefaForm((atual) => ({ ...atual, status: value as ProjetoTarefaStatus }))} options={statusTarefa} />
                        <CampoTexto label="Data prevista" type="date" value={tarefaForm.data_prevista ?? ""} onChange={(value) => setTarefaForm((atual) => ({ ...atual, data_prevista: value }))} />
                        <CampoTexto label="Data de conclusão" type="date" value={tarefaForm.data_conclusao ?? ""} onChange={(value) => setTarefaForm((atual) => ({ ...atual, data_conclusao: value }))} />
                        <CampoTextoArea label="Descrição" value={tarefaForm.descricao ?? ""} onChange={(value) => setTarefaForm((atual) => ({ ...atual, descricao: value }))} />
                        <CampoTextoArea label="Observações" value={tarefaForm.observacoes ?? ""} onChange={(value) => setTarefaForm((atual) => ({ ...atual, observacoes: value }))} />
                        <div className="flex flex-wrap items-center gap-3">
                          <CampoCheckbox label="Ativa" checked={Boolean(tarefaForm.ativo)} onChange={(checked) => setTarefaForm((atual) => ({ ...atual, ativo: checked }))} />
                          <Button type="button" onClick={salvarTarefa} disabled={salvarTarefaMutation.isPending}>
                            <Save className="mr-2 h-4 w-4" />
                            {salvarTarefaMutation.isPending ? "Salvando..." : "Salvar tarefa"}
                          </Button>
                          <Button type="button" variant="outline" onClick={limparFormularioTarefa}>
                            Limpar
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        {([
                          ["NAO_INICIADO", "Não iniciado"],
                          ["EM_ANDAMENTO", "Em andamento"],
                          ["PARADO", "Parado"],
                          ["CONCLUIDO", "Concluído"]
                        ] as const).map(([status, titulo]) => {
                          const tarefasStatus = tareasPorStatus[status];
                          return (
                            <div
                              key={status}
                              className={cn(
                                "rounded-2xl border p-3",
                                status === "NAO_INICIADO" && "border-slate-200 bg-slate-50",
                                status === "EM_ANDAMENTO" && "border-blue-200 bg-blue-50",
                                status === "PARADO" && "border-amber-200 bg-amber-50",
                                status === "CONCLUIDO" && "border-emerald-200 bg-emerald-50"
                              )}
                              onDragOver={(event) => event.preventDefault()}
                              onDrop={() => {
                                const tarefa = tarefasKanban.find((item) => item.id === tarefaArrastadaId);
                                if (tarefa) {
                                  void moverTarefa(tarefa, status);
                                }
                              }}
                            >
                              <div className="mb-3 flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-[var(--g3-foreground)]">{titulo}</h3>
                                <Badge variant="default">{tarefasStatus.length}</Badge>
                              </div>
                              <div className="space-y-2">
                                {tarefasStatus.length === 0 ? (
                                  <EstadoVazio texto="Sem tarefas nesta coluna." compact />
                                ) : (
                                  tarefasStatus.map((tarefa) => (
                                    <button
                                      key={tarefa.id}
                                      type="button"
                                      draggable
                                      onDragStart={() => setTarefaArrastadaId(tarefa.id)}
                                      onDragEnd={() => setTarefaArrastadaId("")}
                                      onClick={() => setTarefaForm({
                                        id: tarefa.id,
                                        titulo: tarefa.titulo,
                                        descricao: tarefa.descricao,
                                        tipo_tarefa: tarefa.tipoTarefa,
                                        responsavel: tarefa.responsavel,
                                        prioridade: tarefa.prioridade,
                                        status: tarefa.status,
                                        data_prevista: tarefa.dataPrevista ?? "",
                                        data_conclusao: tarefa.dataConclusao ?? "",
                                        observacoes: tarefa.observacoes,
                                        ordem_kanban: tarefa.ordemKanban,
                                        ativo: tarefa.ativo
                                      })}
                                      className={cn(
                                        "w-full rounded-xl border p-3 text-left transition",
                                        tarefa.atrasada ? "border-red-200 bg-white" : "border-[var(--g3-border)] bg-white",
                                        tarefaArrastadaId === tarefa.id && "opacity-70"
                                      )}
                                    >
                                      <div className="flex items-start justify-between gap-3">
                                        <div>
                                          <p className="text-sm font-semibold text-[var(--g3-foreground)]">{tarefa.titulo}</p>
                                          <p className="text-xs text-[var(--g3-muted)]">{tarefa.responsavel}</p>
                                        </div>
                                        <Badge variant={tarefa.prioridade === "URGENTE" ? "danger" : tarefa.prioridade === "ALTA" ? "warning" : "default"}>
                                          {tarefa.prioridadeLabel}
                                        </Badge>
                                      </div>
                                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                                        <span>Prazo: {tarefa.dataPrevista ? formatarDataPtBr(tarefa.dataPrevista) : "---"}</span>
                                        {tarefa.atrasada ? <Badge variant="danger">Atrasada</Badge> : null}
                                      </div>
                                    </button>
                                  ))
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {projetoAtual ? (
              <Card>
                <CardHeader>
                  <CardTitle>Linha do tempo e histórico</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-[var(--g3-foreground)]">Linha do tempo do projeto</p>
                    <div className="space-y-2">
                      <LinhaTempo label="Início" valor={formatarDataPtBr(projetoAtual.dataInicio)} />
                      <LinhaTempo label="Prazo previsto" valor={formatarDataPtBr(projetoAtual.prazoPrevisto)} />
                      <LinhaTempo label="Término real" valor={projetoAtual.dataTerminoReal ? formatarDataPtBr(projetoAtual.dataTerminoReal) : "Não concluído"} />
                      <LinhaTempo label="Evolução" valor={`${projetoAtual.percentualEvolucao}%`} />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-[var(--g3-foreground)]">Histórico de movimentações</p>
                    <div className="space-y-2">
                      {historicoAtual.length === 0 ? (
                        <EstadoVazio texto="Nenhum histórico registrado." compact />
                      ) : (
                        historicoAtual.slice(0, 8).map((item) => (
                          <div key={item.id} className="rounded-xl border border-[var(--g3-border)] p-3">
                            <p className="text-sm font-semibold text-[var(--g3-foreground)]">{item.tipoEvento}</p>
                            <p className="text-sm text-slate-700">{item.descricao}</p>
                            <p className="mt-1 text-xs text-[var(--g3-muted)]">
                              {item.usuarioNome} • {formatarDataPtBr(item.createdAt.slice(0, 10))}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </section>
        ) : null}

        {activeTab === "relatorios" ? (
          <section className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Relatórios</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {relatorios.map((relatorio) => (
                    <Card key={relatorio.tipo} className="border-[var(--g3-border)]">
                      <CardHeader>
                        <CardTitle className="text-sm">{relatorio.titulo}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-sm text-[var(--g3-muted)]">{relatorio.descricao}</p>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => void gerarRelatorio(relatorio.tipo)}
                          disabled={relatorioMutation.isPending}
                        >
                          <FileDown className="mr-2 h-4 w-4" />
                          Gerar PDF
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Card className="border-[var(--g3-border)]">
                  <CardHeader>
                    <CardTitle>Filtros aplicados</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <InfoLinha label="Nome" valor={filtrosAplicados.nome || "Todos"} />
                    <InfoLinha label="Responsável" valor={filtrosAplicados.responsavel || "Todos"} />
                    <InfoLinha label="Status" valor={filtrosAplicados.status ? statusProjeto.find((item) => item.value === filtrosAplicados.status)?.label ?? "Todos" : "Todos"} />
                    <InfoLinha label="Prioridade" valor={filtrosAplicados.prioridade ? prioridades.find((item) => item.value === filtrosAplicados.prioridade)?.label ?? "Todas" : "Todas"} />
                    <InfoLinha label="Área" valor={filtrosAplicados.area_projeto ? areasProjeto.find((item) => item.value === filtrosAplicados.area_projeto)?.label ?? "Todas" : "Todas"} />
                    <InfoLinha label="Atrasados" valor={filtrosAplicados.atrasados ? "Sim" : "Não"} />
                    <InfoLinha label="Concluídos" valor={filtrosAplicados.concluidos ? "Sim" : "Não"} />
                    <InfoLinha label="Unidade" valor={unidades.find((item) => item.id_unidade === filtrosAplicados.unidade_assistencial_id)?.nome_fantasia || "Todas"} />
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </section>
        ) : null}
      </AdminPageLayout>

      {popupMensagem ? <PopupMensagem popup={popupMensagem} onClose={() => setPopupMensagem(null)} /> : null}
      <PopupConfirmacao
        aberto={confirmarInativacao}
        titulo="Inativar projeto"
        texto={`Deseja realmente inativar o projeto "${projetoDetalhado?.nome ?? projetoPadraoKanban?.nome ?? ""}"?`}
        processando={inativarProjetoMutation.isPending}
        onCancel={() => setConfirmarInativacao(false)}
        onConfirm={() => void confirmarInativacaoProjeto()}
        confirmarTexto="Inativar"
        confirmarVariant="danger"
      />
    </>
  );
}

function CampoTexto({
  label,
  value,
  onChange,
  type = "text"
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: React.HTMLInputTypeAttribute;
}) {
  return (
    <label className="space-y-1">
      <span className="text-sm font-medium text-[var(--g3-foreground)]">{label}</span>
      <Input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function CampoTextoArea({
  label,
  value,
  onChange,
  helper
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  helper?: string;
}) {
  return (
    <label className="space-y-1">
      <span className="text-sm font-medium text-[var(--g3-foreground)]">{label}</span>
      {helper ? <p className="text-xs text-[var(--g3-muted)]">{helper}</p> : null}
      <Textarea value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function CampoSelect<T extends string>({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: string;
  onChange: (value: T | "") => void;
  options: Array<{ value: T | ""; label: string }>;
}) {
  return (
    <label className="space-y-1">
      <span className="text-sm font-medium text-[var(--g3-foreground)]">{label}</span>
      <Select value={value} onChange={(event) => onChange(event.target.value as T | "")}>
        {options.map((option) => (
          <option key={`${label}-${option.value}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </label>
  );
}

function CampoCheckbox({
  label,
  checked,
  onChange
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 rounded-lg border border-[var(--g3-border)] px-3 py-2 text-sm text-[var(--g3-foreground)]">
      <Checkbox checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

function InfoLinha({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-xl border border-[var(--g3-border)] bg-white p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--g3-muted)]">{label}</p>
      <p className="mt-1 text-sm font-medium text-[var(--g3-foreground)]">{valor}</p>
    </div>
  );
}

function ResumoMini({ label, valor }: { label: string; valor: string | number }) {
  return (
    <div className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card)] p-3">
      <p className="text-xs uppercase tracking-[0.12em] text-[var(--g3-muted)]">{label}</p>
      <p className="mt-1 text-base font-semibold text-[var(--g3-foreground)]">{valor}</p>
    </div>
  );
}

function LinhaTempo({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-[var(--g3-border)] px-3 py-2">
      <span className="text-sm text-[var(--g3-muted)]">{label}</span>
      <span className="text-sm font-semibold text-[var(--g3-foreground)]">{valor}</span>
    </div>
  );
}

function EstadoVazio({ texto, compact = false }: { texto: string; compact?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-dashed border-[var(--g3-border)] bg-slate-50 text-center text-sm text-[var(--g3-muted)]",
        compact ? "px-3 py-2" : "px-4 py-6"
      )}
    >
      {texto}
    </div>
  );
}

export default ProjetosPage;
