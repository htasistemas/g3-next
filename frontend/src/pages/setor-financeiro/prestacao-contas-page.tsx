import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  BadgeDollarSign,
  CheckCircle2,
  ClipboardList,
  FileCheck,
  FileSpreadsheet,
  List,
  Plus,
  Printer,
  ReceiptText,
  Save,
  Search,
  Trash2,
  Undo2,
  Upload,
  X
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminPageLayout, type AdminAction, type AdminTab } from "@/components/admin/admin-page-layout";
import { PopupConfirmacao, PopupMensagem, type PopupMensagemState } from "@/components/admin/admin-popups";
import { imprimirConteudoAtual } from "@/lib/report-utils";
import { formatarMoeda as formatarMoedaBr, formatarMoedaInput, normalizarMoeda } from "@/lib/br-utils";
import { cn } from "@/lib/utils";
import { arquivosService } from "@/services/arquivos.service";
import { useAuth } from "@/hooks/use-auth";
import {
  useExcluirPrestacaoContas,
  useAlterarWorkflowPrestacao,
  usePrestacoesContas,
  useSalvarPrestacaoContas
} from "@/features/prestacao-contas/use-prestacao-contas";
import type {
  PrestacaoChecklist,
  PrestacaoComprovante,
  PrestacaoContas,
  PrestacaoContasPayload,
  PrestacaoDestinacao,
  PrestacaoDespesa,
  PrestacaoRecebimento,
  PrestacaoTimeline,
  StatusPrestacaoContas,
  StatusWorkflowPrestacao
} from "@/types/prestacao-contas";

type AbaId = "listagem" | "visao-geral" | "receitas" | "aplicacao" | "documentos" | "revisao";
type FiltroStatus = "todos" | "pendente" | "andamento" | "concluido";
type MainField = "totalRecebido" | "totalAplicado" | "saldoDisponivel" | "prestadoMes";

type MainErrors = Partial<Record<MainField, string>>;
type RecebimentoErrors = Partial<Record<"fonte" | "valor", string>>;
type DestinacaoErrors = Partial<Record<"titulo" | "percentual", string>>;
type ComprovanteErrors = Partial<Record<"titulo" | "arquivoNome", string>>;
type TimelineErrors = Partial<Record<"titulo", string>>;
type ChecklistErrors = Partial<Record<"titulo", string>>;
type DespesaErrors = Partial<Record<"descricao" | "valor", string>>;

type ResumoPrestacao = {
  status: StatusPrestacaoContas;
  totalRecebimentos: number;
  totalDestinacoesPercentual: number;
  totalChecklistConcluido: number;
  totalChecklistPendente: number;
  totalComprovantes: number;
  totalDespesas: number;
  diferencaConciliacao: number;
  percentualChecklist: number;
  saldoCalculado?: number;
  pendencias: string[];
};

type ApiErrorPayload = {
  message?: string;
  mensagem?: string;
  error?: string;
  erro?: string;
};

const abas: AdminTab[] = [
  { id: "listagem", label: "Listagem", icon: List },
  { id: "visao-geral", label: "Visão geral", icon: BadgeDollarSign },
  { id: "receitas", label: "Receitas", icon: ReceiptText },
  { id: "aplicacao", label: "Aplicação dos recursos", icon: ClipboardList },
  { id: "documentos", label: "Documentos e checklist", icon: FileCheck },
  { id: "revisao", label: "Revisão e envio", icon: FileSpreadsheet }
];

const tituloTela = "Prestação de contas";

const registroVazio: PrestacaoContasPayload = {
  recebimentos: [],
  destinacoes: [],
  comprovantes: [],
  timelines: [],
  checklist: [],
  despesas: []
  ,parecerHistorico: []
};

const recebimentoVazio: PrestacaoRecebimento = { fonte: "" };
const destinacaoVazia: PrestacaoDestinacao = { titulo: "" };
const comprovanteVazio: PrestacaoComprovante = { titulo: "" };
const timelineVazio: PrestacaoTimeline = { titulo: "", status: "pendente" };
const checklistVazio: PrestacaoChecklist = { titulo: "", status: "pendente" };
const despesaVazia: PrestacaoDespesa = { descricao: "", status: "PENDENTE" };
const LIMITE_RESUMO_EXECUTIVO = 200;

function normalizarBusca(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function formatarMoeda(valor?: number) {
  if (valor == null || Number.isNaN(valor)) return "—";
  return formatarMoedaBr(valor);
}

function formatarPercentual(valor?: number) {
  if (valor == null || Number.isNaN(valor)) return "—";
  return `${valor.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%`;
}

function parseCurrencyInput(raw: string) {
  const sanitized = raw.replace(/[R$\s]/g, "").trim();
  if (!sanitized) return undefined;
  const parsed = normalizarMoeda(sanitized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function formatCurrencyInput(value?: number) {
  if (value == null || Number.isNaN(value)) return "";
  return formatarMoedaInput(value);
}

function calcularResumo(form: PrestacaoContasPayload): ResumoPrestacao {
  const totalRecebimentos = (form.recebimentos ?? []).reduce((acc, item) => acc + (item.valor ?? 0), 0);
  const totalDestinacoesPercentual = (form.destinacoes ?? []).reduce((acc, item) => acc + (item.percentual ?? 0), 0);
  const totalChecklistConcluido = (form.checklist ?? []).filter((item) => item.status === "concluido").length;
  const totalChecklistPendente = (form.checklist ?? []).filter((item) => item.status !== "concluido").length;
  const totalChecklist = (form.checklist ?? []).length;
  const totalComprovantes = (form.comprovantes ?? []).length;
  const totalDespesas = (form.despesas ?? []).reduce((acc, item) => acc + (item.valor ?? 0), 0);
  const percentualChecklist = totalChecklist ? (totalChecklistConcluido / totalChecklist) * 100 : 0;
  const saldoCalculado =
    form.totalRecebido != null && form.totalAplicado != null ? form.totalRecebido - form.totalAplicado : undefined;
  const diferencaConciliacao = form.totalAplicado != null ? totalDespesas - form.totalAplicado : 0;

  const pendencias: string[] = [];

  if (!form.totalRecebido && totalRecebimentos <= 0) {
    pendencias.push("Informe o total recebido ou cadastre ao menos uma receita.");
  }

  if (!form.totalAplicado && !(form.destinacoes ?? []).length) {
    pendencias.push("Informe o total aplicado ou detalhe a aplicação dos recursos.");
  }

  if (form.totalAplicado != null && form.totalAplicado > 0 && !(form.despesas ?? []).length) {
    pendencias.push("Detalhe as despesas e pagamentos realizados.");
  }

  if (form.despesas?.length && Math.abs(diferencaConciliacao) > 0.01) {
    pendencias.push("A soma das despesas difere do total aplicado.");
  }

  if (!(form.comprovantes ?? []).length) {
    pendencias.push("Adicione ao menos um comprovante para sustentar a prestação.");
  }

  if (!(form.checklist ?? []).length) {
    pendencias.push("Monte o checklist de conferência antes do envio.");
  }

  if ((form.checklist ?? []).length && totalChecklistPendente > 0) {
    pendencias.push("Ainda existem itens pendentes no checklist.");
  }

  if ((form.destinacoes ?? []).length && totalDestinacoesPercentual > 100.01) {
    pendencias.push("A soma dos percentuais da aplicação ultrapassa 100%.");
  }

  if (saldoCalculado != null && saldoCalculado < -0.009) {
    pendencias.push("O total aplicado está maior que o total recebido.");
  }

  if (
    saldoCalculado != null &&
    form.saldoDisponivel != null &&
    Math.abs(saldoCalculado - form.saldoDisponivel) > 0.01
  ) {
    pendencias.push("O saldo informado difere do saldo calculado pela tela.");
  }

  let status: StatusPrestacaoContas = "pendente";
  if (pendencias.length === 0 && totalComprovantes > 0 && totalChecklistPendente === 0) {
    status = "concluido";
  } else if (
    form.totalRecebido != null ||
    form.totalAplicado != null ||
    (form.recebimentos ?? []).length > 0 ||
    (form.destinacoes ?? []).length > 0 ||
    totalComprovantes > 0
  ) {
    status = "andamento";
  }

  return {
    status,
    totalRecebimentos,
    totalDestinacoesPercentual,
    totalChecklistConcluido,
    totalChecklistPendente,
    totalComprovantes,
    totalDespesas,
    diferencaConciliacao,
    percentualChecklist,
    saldoCalculado,
    pendencias
  };
}

function limitarTexto(valor: string | undefined, limite: number) {
  return valor ? valor.trim().slice(0, limite) : undefined;
}

function extrairMensagemErro(error: unknown, fallback: string) {
  const candidate = error as {
    response?: {
      data?: ApiErrorPayload;
    };
    message?: string;
  };

  return (
    candidate?.response?.data?.mensagem ||
    candidate?.response?.data?.message ||
    candidate?.response?.data?.erro ||
    candidate?.response?.data?.error ||
    candidate?.message ||
    fallback
  );
}

function sanitizarPayloadParaSalvar(payload: PrestacaoContasPayload): PrestacaoContasPayload {
  return {
    ...payload,
    totalRecebidoHelper: limitarTexto(payload.totalRecebidoHelper, LIMITE_RESUMO_EXECUTIVO),
    totalAplicadoHelper: limitarTexto(payload.totalAplicadoHelper, LIMITE_RESUMO_EXECUTIVO),
    saldoDisponivelHelper: limitarTexto(payload.saldoDisponivelHelper, LIMITE_RESUMO_EXECUTIVO),
    prestadoMesHelper: limitarTexto(payload.prestadoMesHelper, LIMITE_RESUMO_EXECUTIVO)
  };
}

function getStatusBadgeVariant(status: StatusPrestacaoContas) {
  if (status === "concluido") return "success";
  if (status === "andamento") return "warning";
  return "default";
}

function getStatusLabel(status: StatusPrestacaoContas) {
  if (status === "concluido") return "Concluído";
  if (status === "andamento") return "Em andamento";
  return "Pendente";
}

function getWorkflowLabel(status?: StatusWorkflowPrestacao) {
  const labels: Record<StatusWorkflowPrestacao, string> = {
    RASCUNHO: "Rascunho",
    EM_ANALISE: "Em análise",
    EM_DILIGENCIA: "Em diligência",
    APROVADA: "Aprovada",
    APROVADA_RESSALVAS: "Aprovada com ressalvas",
    REJEITADA: "Rejeitada",
    ENCERRADA: "Encerrada"
  };
  return labels[status ?? "RASCUNHO"];
}

function getListagemBusca(item: PrestacaoContas, resumo: ResumoPrestacao) {
  return normalizarBusca(
    [
      item.id,
      item.totalRecebidoHelper,
      item.totalAplicadoHelper,
      item.saldoDisponivelHelper,
      getStatusLabel(resumo.status),
      ...item.recebimentos.map((recebimento) => recebimento.fonte),
      ...item.destinacoes.map((destinacao) => destinacao.titulo),
      ...item.comprovantes.map((comprovante) => comprovante.titulo)
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function validarCampoPrincipal(field: MainField, form: PrestacaoContasPayload) {
  const value = form[field];
  if (value == null) return undefined;
  if (value < 0) return "Informe um valor igual ou maior que zero.";

  if (field === "saldoDisponivel") {
    const saldoCalculado =
      form.totalRecebido != null && form.totalAplicado != null ? form.totalRecebido - form.totalAplicado : undefined;
    if (saldoCalculado != null && Math.abs(saldoCalculado - value) > 0.01) {
      return "Revise o saldo informado. Ele está diferente do valor calculado.";
    }
  }

  return undefined;
}

function validarRecebimento(recebimento: PrestacaoRecebimento): RecebimentoErrors {
  const erros: RecebimentoErrors = {};
  if (!recebimento.fonte.trim()) erros.fonte = "Informe a fonte da receita.";
  if (recebimento.valor != null && recebimento.valor < 0) erros.valor = "Informe um valor válido.";
  return erros;
}

function validarDestinacao(destinacao: PrestacaoDestinacao): DestinacaoErrors {
  const erros: DestinacaoErrors = {};
  if (!destinacao.titulo.trim()) erros.titulo = "Informe o título da aplicação.";
  if (destinacao.percentual != null && (destinacao.percentual < 0 || destinacao.percentual > 100)) {
    erros.percentual = "O percentual deve ficar entre 0 e 100.";
  }
  return erros;
}

function validarComprovante(comprovante: PrestacaoComprovante): ComprovanteErrors {
  const erros: ComprovanteErrors = {};
  if (!comprovante.titulo.trim()) erros.titulo = "Informe o título do comprovante.";
  if (!comprovante.arquivoNome?.trim() && !comprovante.arquivoUrl?.trim()) {
    erros.arquivoNome = "Informe o nome do arquivo ou o link do comprovante.";
  }
  return erros;
}

function validarTimeline(timeline: PrestacaoTimeline): TimelineErrors {
  const erros: TimelineErrors = {};
  if (!timeline.titulo.trim()) erros.titulo = "Informe o marco da timeline.";
  return erros;
}

function validarChecklist(checklist: PrestacaoChecklist): ChecklistErrors {
  const erros: ChecklistErrors = {};
  if (!checklist.titulo.trim()) erros.titulo = "Informe o item de conferência.";
  return erros;
}

type CurrencyInputProps = {
  value?: number;
  onValueChange: (value?: number) => void;
  placeholder?: string;
  className?: string;
  onBlur?: () => void;
};

function CurrencyInput({ value, onValueChange, placeholder, className, onBlur }: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState(() => formatCurrencyInput(value));
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setDisplayValue(formatCurrencyInput(value));
    }
  }, [isFocused, value]);

  return (
    <Input
      inputMode="decimal"
      placeholder={placeholder}
      value={displayValue}
      className={className}
      onFocus={() => setIsFocused(true)}
      onChange={(event) => {
        const next = event.target.value;
        setDisplayValue(next);
        onValueChange(parseCurrencyInput(next));
      }}
      onBlur={() => {
        const parsed = parseCurrencyInput(displayValue);
        setIsFocused(false);
        setDisplayValue(formatCurrencyInput(parsed));
        onValueChange(parsed);
        onBlur?.();
      }}
    />
  );
}

function ErrorText({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs font-medium text-red-600">{message}</p>;
}

function HintText({ text }: { text: string }) {
  return <p className="text-xs text-[var(--g3-muted)]">{text}</p>;
}

export function PrestacaoContasPage() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const permissoes = usuario?.permissoes ?? [];
  const podeEditar = permissoes.some((item) => ["ADMINISTRADOR", "OPERADOR", "PRESTACAO_CONTAS_ELABORAR"].includes(item));
  const podeRevisar = permissoes.some((item) => ["ADMINISTRADOR", "OPERADOR", "PRESTACAO_CONTAS_REVISAR"].includes(item));
  const podeAprovar = permissoes.some((item) => ["ADMINISTRADOR", "PRESTACAO_CONTAS_APROVAR"].includes(item));
  const [abaAtiva, setAbaAtiva] = useState<AbaId>("listagem");
  const [registroSelecionadoId, setRegistroSelecionadoId] = useState<string>();
  const [filtro, setFiltro] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>("todos");
  const [apenasPendencias, setApenasPendencias] = useState(false);
  const [form, setForm] = useState<PrestacaoContasPayload>(registroVazio);
  const [snapshot, setSnapshot] = useState<PrestacaoContasPayload>(registroVazio);
  const [novoRecebimento, setNovoRecebimento] = useState<PrestacaoRecebimento>(recebimentoVazio);
  const [novaDestinacao, setNovaDestinacao] = useState<PrestacaoDestinacao>(destinacaoVazia);
  const [novoComprovante, setNovoComprovante] = useState<PrestacaoComprovante>(comprovanteVazio);
  const [arquivoComprovante, setArquivoComprovante] = useState<File | null>(null);
  const [enviandoArquivo, setEnviandoArquivo] = useState(false);
  const [novaTimeline, setNovaTimeline] = useState<PrestacaoTimeline>(timelineVazio);
  const [novoChecklist, setNovoChecklist] = useState<PrestacaoChecklist>(checklistVazio);
  const [novaDespesa, setNovaDespesa] = useState<PrestacaoDespesa>(despesaVazia);
  const [mainErrors, setMainErrors] = useState<MainErrors>({});
  const [recebimentoErrors, setRecebimentoErrors] = useState<RecebimentoErrors>({});
  const [destinacaoErrors, setDestinacaoErrors] = useState<DestinacaoErrors>({});
  const [comprovanteErrors, setComprovanteErrors] = useState<ComprovanteErrors>({});
  const [timelineErrors, setTimelineErrors] = useState<TimelineErrors>({});
  const [checklistErrors, setChecklistErrors] = useState<ChecklistErrors>({});
  const [despesaErrors, setDespesaErrors] = useState<DespesaErrors>({});
  const [popup, setPopup] = useState<PopupMensagemState | null>(null);
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);

  const prestacoesQuery = usePrestacoesContas();
  const salvarMutation = useSalvarPrestacaoContas();
  const excluirMutation = useExcluirPrestacaoContas();
  const workflowMutation = useAlterarWorkflowPrestacao();

  const prestacoes = prestacoesQuery.data ?? [];
  const resumoAtual = useMemo(() => calcularResumo(form), [form]);
  const processando = salvarMutation.isPending || excluirMutation.isPending || workflowMutation.isPending || enviandoArquivo;

  const registrosFiltrados = useMemo(() => {
    const termo = normalizarBusca(filtro.trim());

    return prestacoes.filter((item) => {
      const resumo = calcularResumo(item);
      const busca = getListagemBusca(item, resumo);
      const matchBusca = !termo || busca.includes(termo);
      const matchStatus = filtroStatus === "todos" || resumo.status === filtroStatus;
      const matchPendencia = !apenasPendencias || resumo.pendencias.length > 0;
      return matchBusca && matchStatus && matchPendencia;
    });
  }, [apenasPendencias, filtro, filtroStatus, prestacoes]);

  function limparFiltros() {
    setFiltro("");
    setFiltroStatus("todos");
    setApenasPendencias(false);
  }

  function novo() {
    setRegistroSelecionadoId(undefined);
    setForm(registroVazio);
    setSnapshot(registroVazio);
    setMainErrors({});
    setAbaAtiva("visao-geral");
  }

  function selecionarRegistro(id: string) {
    const registro = prestacoes.find((item) => item.id === id);
    if (!registro) return;
    setRegistroSelecionadoId(registro.id);
    setForm(registro);
    setSnapshot(registro);
    setMainErrors({});
    setAbaAtiva("visao-geral");
  }

  function cancelar() {
    setForm(snapshot);
    setMainErrors({});
    setRecebimentoErrors({});
    setDestinacaoErrors({});
    setComprovanteErrors({});
    setTimelineErrors({});
    setChecklistErrors({});
    setDespesaErrors({});
    setArquivoComprovante(null);
  }

  function atualizarCampoPrincipal(field: MainField, value?: number) {
    setForm((atual) => ({ ...atual, [field]: value }));
    setMainErrors((atual) => ({ ...atual, [field]: undefined }));
  }

  function validarPrincipaisAntesDeSalvar() {
    const erros: MainErrors = {};
    (["totalRecebido", "totalAplicado", "saldoDisponivel", "prestadoMes"] as MainField[]).forEach((field) => {
      const erro = validarCampoPrincipal(field, form);
      if (erro) erros[field] = erro;
    });
    setMainErrors(erros);
    return Object.keys(erros).length === 0;
  }

  async function salvar() {
    if (!validarPrincipaisAntesDeSalvar()) {
      setPopup({
        tipo: "aviso",
        titulo: "Revise os valores",
        texto: "A tela identificou campos financeiros que precisam de ajuste antes do salvamento."
      });
      return;
    }

    try {
      const payload = sanitizarPayloadParaSalvar(form);
      const response = await salvarMutation.mutateAsync({
        id: registroSelecionadoId,
        payload
      });
      setRegistroSelecionadoId(response.id);
      setForm(response);
      setSnapshot(response);
      setPopup({
        tipo: "sucesso",
        titulo: "Confirmação",
        texto: "Prestação de contas salva com sucesso."
      });
    } catch (error: any) {
      setPopup({
        tipo: "erro",
        titulo: "Erro",
        texto: extrairMensagemErro(error, "Não foi possível salvar a prestação de contas.")
      });
    }
  }

  async function alterarWorkflow(acao: string) {
    if (!registroSelecionadoId) {
      setPopup({ tipo: "aviso", titulo: "Selecione uma prestação", texto: "Salve ou selecione uma prestação antes de alterar o workflow." });
      return;
    }
    try {
      const registro = await workflowMutation.mutateAsync({ id: registroSelecionadoId, acao });
      setForm(registro);
      setSnapshot(registro);
      setPopup({ tipo: "sucesso", titulo: "Workflow atualizado", texto: `A prestação agora está: ${getWorkflowLabel(registro.statusWorkflow)}.` });
    } catch (error: any) {
      setPopup({ tipo: "erro", titulo: "Não foi possível avançar", texto: extrairMensagemErro(error, "Revise os requisitos da etapa antes de continuar.") });
    }
  }

  async function confirmarExclusaoRegistro() {
    if (!registroSelecionadoId) return;
    try {
      await excluirMutation.mutateAsync(registroSelecionadoId);
      setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Registro excluído com sucesso." });
      setConfirmarExclusao(false);
      novo();
      setAbaAtiva("listagem");
    } catch (error: any) {
      setPopup({
        tipo: "erro",
        titulo: "Erro",
        texto: extrairMensagemErro(error, "Não foi possível excluir o registro.")
      });
    }
  }

  function adicionarRecebimento() {
    const erros = validarRecebimento(novoRecebimento);
    setRecebimentoErrors(erros);
    if (Object.keys(erros).length) return;
    setForm((atual) => ({ ...atual, recebimentos: [...(atual.recebimentos ?? []), novoRecebimento] }));
    setNovoRecebimento(recebimentoVazio);
    setRecebimentoErrors({});
  }

  function adicionarDestinacao() {
    const erros = validarDestinacao(novaDestinacao);
    setDestinacaoErrors(erros);
    if (Object.keys(erros).length) return;
    setForm((atual) => ({ ...atual, destinacoes: [...(atual.destinacoes ?? []), novaDestinacao] }));
    setNovaDestinacao(destinacaoVazia);
    setDestinacaoErrors({});
  }

  function adicionarComprovante() {
    const erros = validarComprovante(novoComprovante);
    setComprovanteErrors(erros);
    if (Object.keys(erros).length) return;
    setForm((atual) => ({ ...atual, comprovantes: [...(atual.comprovantes ?? []), novoComprovante] }));
    setNovoComprovante(comprovanteVazio);
    setArquivoComprovante(null);
    setComprovanteErrors({});
  }

  async function enviarArquivoComprovante() {
    if (!registroSelecionadoId || !arquivoComprovante) return;
    setEnviandoArquivo(true);
    try {
      const arquivo = await arquivosService.uploadParaPrestacaoContas(
        registroSelecionadoId,
        arquivoComprovante,
        novoComprovante.descricao
      );
      setNovoComprovante((atual) => ({
        ...atual,
        titulo: atual.titulo.trim() || arquivo.nomeOriginal,
        arquivoNome: arquivo.nomeOriginal,
        arquivoUrl: `/api/arquivos/${arquivo.id}/conteudo`
      }));
      setArquivoComprovante(null);
      setPopup({ tipo: "sucesso", titulo: "Arquivo enviado", texto: "O arquivo foi anexado. Clique em Adicionar comprovante e depois salve a prestação." });
    } catch (error: any) {
      setPopup({ tipo: "erro", titulo: "Falha no upload", texto: extrairMensagemErro(error, "Não foi possível enviar o arquivo." ) });
    } finally {
      setEnviandoArquivo(false);
    }
  }

  function adicionarTimeline() {
    const erros = validarTimeline(novaTimeline);
    setTimelineErrors(erros);
    if (Object.keys(erros).length) return;
    setForm((atual) => ({ ...atual, timelines: [...(atual.timelines ?? []), novaTimeline] }));
    setNovaTimeline(timelineVazio);
    setTimelineErrors({});
  }

  function adicionarChecklist() {
    const erros = validarChecklist(novoChecklist);
    setChecklistErrors(erros);
    if (Object.keys(erros).length) return;
    setForm((atual) => ({ ...atual, checklist: [...(atual.checklist ?? []), novoChecklist] }));
    setNovoChecklist(checklistVazio);
    setChecklistErrors({});
  }

  function adicionarDespesa() {
    const erros: DespesaErrors = {};
    if (!novaDespesa.descricao?.trim()) erros.descricao = "Informe a descrição da despesa.";
    if (novaDespesa.valor == null || novaDespesa.valor < 0) erros.valor = "Informe um valor válido.";
    setDespesaErrors(erros);
    if (Object.keys(erros).length) return;
    setForm((atual) => ({ ...atual, despesas: [...(atual.despesas ?? []), novaDespesa] }));
    setNovaDespesa(despesaVazia);
    setDespesaErrors({});
  }

  function removerItem(
    tipo: "recebimentos" | "destinacoes" | "comprovantes" | "timelines" | "checklist" | "despesas",
    indice: number
  ) {
    setForm((atual) => ({
      ...atual,
      [tipo]: (atual[tipo] ?? []).filter((_, idx) => idx !== indice)
    }));
  }

  const acoes: AdminAction[] = [
    { label: "Buscar", icon: Search, onClick: () => setAbaAtiva("listagem"), variant: "outline" },
    { label: "Novo", icon: Plus, onClick: novo, variant: "default", disabled: processando || !podeEditar },
    { label: "Salvar", icon: Save, onClick: () => void salvar(), variant: "default", disabled: processando || !podeEditar },
    { label: "Cancelar", icon: Undo2, onClick: cancelar, variant: "outline", disabled: processando || !podeEditar },
    {
      label: "Excluir",
      icon: Trash2,
      onClick: () => setConfirmarExclusao(true),
      variant: "danger",
      disabled: processando || !registroSelecionadoId || !permissoes.includes("ADMINISTRADOR")
    },
    {
      label: "Imprimir",
      icon: Printer,
      onClick: () => {
        try {
          imprimirConteudoAtual({ titulo: "Prestação de contas" });
        } catch (error: any) {
          setPopup({
            tipo: "erro",
            titulo: "Erro",
            texto: error?.message ?? "Não foi possível preparar a impressão."
          });
        }
      },
      variant: "outline"
    },
    { label: "Fechar", icon: X, onClick: () => navigate("/dashboard/visao-geral"), variant: "outline" }
  ];

  const workflowStatus = form.statusWorkflow ?? "RASCUNHO";
  const acoesWorkflow: AdminAction[] = workflowStatus === "RASCUNHO"
    ? [{ label: "Enviar para análise", icon: FileCheck, onClick: () => void alterarWorkflow("ENVIAR_ANALISE"), variant: "default", disabled: processando || !podeEditar }]
    : workflowStatus === "EM_ANALISE"
      ? [
          { label: "Devolver para diligência", icon: AlertTriangle, onClick: () => void alterarWorkflow("DEVOLVER_DILIGENCIA"), variant: "outline", disabled: processando || !podeRevisar },
          { label: "Aprovar", icon: CheckCircle2, onClick: () => void alterarWorkflow("APROVAR"), variant: "default", disabled: processando || !podeAprovar },
          { label: "Aprovar com ressalvas", icon: FileCheck, onClick: () => void alterarWorkflow("APROVAR_RESSALVAS"), variant: "outline", disabled: processando || !podeAprovar },
          { label: "Rejeitar", icon: X, onClick: () => void alterarWorkflow("REJEITAR"), variant: "danger", disabled: processando || !podeAprovar }
        ]
      : workflowStatus === "EM_DILIGENCIA"
        ? [{ label: "Reenviar para análise", icon: FileCheck, onClick: () => void alterarWorkflow("ENVIAR_ANALISE"), variant: "default", disabled: processando || !podeEditar }]
        : workflowStatus === "APROVADA" || workflowStatus === "APROVADA_RESSALVAS"
          ? [{ label: "Encerrar prestação", icon: CheckCircle2, onClick: () => void alterarWorkflow("ENCERRAR"), variant: "default", disabled: processando || !podeAprovar }]
          : [];

  return (
    <>
      <AdminPageLayout
        tabs={abas}
        activeTab={abaAtiva}
        onChangeTab={(tabId) => setAbaAtiva(tabId as AbaId)}
        actions={[...acoes, ...acoesWorkflow]}
        sectionLabel="Contabilidade e finanças"
        pageTitle={tituloTela}
        activeTitle={abas.find((item) => item.id === abaAtiva)?.label}
        codeBadge={registroSelecionadoId ? `Código: ${registroSelecionadoId}` : "Novo"}
      >
        {abaAtiva === "listagem" ? (
          <section className="space-y-3">
            <div className="grid gap-3 lg:grid-cols-[2fr,1fr,auto,auto]">
              <div className="space-y-1">
                <Label>Pesquisar</Label>
                <Input
                  placeholder="Código, resumo, fonte, aplicação ou documento"
                  value={filtro}
                  onChange={(event) => setFiltro(event.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Situação</Label>
                <Select value={filtroStatus} onChange={(event) => setFiltroStatus(event.target.value as FiltroStatus)}>
                  <option value="todos">Todos</option>
                  <option value="pendente">Pendente</option>
                  <option value="andamento">Em andamento</option>
                  <option value="concluido">Concluído</option>
                </Select>
              </div>
              <label className="flex items-end gap-2 text-sm text-[var(--g3-foreground)]">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border border-[var(--g3-border)]"
                  checked={apenasPendencias}
                  onChange={(event) => setApenasPendencias(event.target.checked)}
                />
                Apenas com pendências
              </label>
              <div className="flex items-end">
                <Button type="button" variant="outline" size="sm" onClick={limparFiltros}>
                  Limpar filtros
                </Button>
              </div>
            </div>

            <div className="grid gap-3 xl:grid-cols-[minmax(0,2.2fr),minmax(320px,1fr)]">
              <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
                <table className="min-w-full text-sm">
                  <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
                    <tr>
                      <th className="px-3 py-2 text-left">Código</th>
                      <th className="px-3 py-2 text-left">Situação</th>
                      <th className="px-3 py-2 text-left">Total recebido</th>
                      <th className="px-3 py-2 text-left">Total aplicado</th>
                      <th className="px-3 py-2 text-left">Pendências</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prestacoesQuery.isLoading ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-4 text-center">
                          Carregando registros...
                        </td>
                      </tr>
                    ) : registrosFiltrados.length ? (
                      registrosFiltrados.map((item, index) => {
                        const resumo = calcularResumo(item);
                        const selecionado = item.id === registroSelecionadoId;

                        return (
                          <tr
                            key={item.id}
                            className={cn(
                              "cursor-pointer border-t border-[var(--g3-border)]",
                              selecionado
                                ? "bg-emerald-50"
                                : index % 2 === 0
                                  ? "bg-[var(--g3-card)]"
                                  : "bg-[var(--g3-primary-soft)]/35"
                            )}
                            onClick={() => selecionarRegistro(item.id)}
                          >
                            <td className="px-3 py-2 font-medium">{item.id}</td>
                            <td className="px-3 py-2">
                              <Badge variant={getStatusBadgeVariant(resumo.status)}>
                                {getStatusLabel(resumo.status)}
                              </Badge>
                            </td>
                            <td className="px-3 py-2">{formatarMoeda(item.totalRecebido)}</td>
                            <td className="px-3 py-2">{formatarMoeda(item.totalAplicado)}</td>
                            <td className="px-3 py-2">
                              {resumo.pendencias.length ? (
                                <span className="font-medium text-amber-700">{resumo.pendencias.length}</span>
                              ) : (
                                <span className="font-medium text-emerald-700">0</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-3 py-4 text-center">
                          Nenhum registro encontrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <Card className="border-dashed">
                <CardHeader>
                  <CardTitle>Leitura rápida</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                    <div className="rounded-lg border border-[var(--g3-border)] p-3">
                      <p className="text-xs uppercase tracking-[0.14em] text-[var(--g3-muted)]">Registros filtrados</p>
                      <p className="mt-1 text-2xl font-semibold text-[var(--g3-foreground)]">{registrosFiltrados.length}</p>
                    </div>
                    <div className="rounded-lg border border-[var(--g3-border)] p-3">
                      <p className="text-xs uppercase tracking-[0.14em] text-[var(--g3-muted)]">Com pendências</p>
                      <p className="mt-1 text-2xl font-semibold text-amber-700">
                        {registrosFiltrados.filter((item) => calcularResumo(item).pendencias.length > 0).length}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-primary-soft)]/35 p-3">
                    <p className="text-sm font-semibold text-[var(--g3-active)]">Como usar esta tela</p>
                    <ul className="mt-2 space-y-2 text-sm text-[var(--g3-foreground)]">
                      <li>1. Localize ou crie um registro.</li>
                      <li>2. Preencha visão geral, receitas e aplicação.</li>
                      <li>3. Anexe comprovantes e confira o checklist.</li>
                      <li>4. Abra a revisão final antes de salvar ou imprimir.</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
        ) : null}

        {abaAtiva === "visao-geral" ? (
          <section className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Card>
                <CardContent className="space-y-1 p-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-[var(--g3-muted)]">Situação atual</p>
                  <Badge variant={getStatusBadgeVariant(resumoAtual.status)} className="w-fit">
                    {getStatusLabel(resumoAtual.status)}
                  </Badge>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="space-y-1 p-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-[var(--g3-muted)]">Pendências</p>
                  <p className="text-xl font-semibold text-[var(--g3-foreground)]">{resumoAtual.pendencias.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="space-y-1 p-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-[var(--g3-muted)]">Comprovantes</p>
                  <p className="text-xl font-semibold text-[var(--g3-foreground)]">{resumoAtual.totalComprovantes}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="space-y-1 p-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-[var(--g3-muted)]">Checklist concluído</p>
                  <p className="text-xl font-semibold text-[var(--g3-foreground)]">
                    {formatarPercentual(resumoAtual.percentualChecklist)}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Identificação da prestação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="space-y-1 xl:col-span-2"><Label>Instrumento ou parceria *</Label><Input value={form.instrumento ?? ""} placeholder="Ex.: Termo de fomento nº 12/2026" onChange={(event) => setForm((atual) => ({ ...atual, instrumento: event.target.value }))} /></div>
                  <div className="space-y-1"><Label>Tipo de prestação</Label><Select value={form.tipoPrestacao ?? "FINAL"} onChange={(event) => setForm((atual) => ({ ...atual, tipoPrestacao: event.target.value as any }))}><option value="PARCIAL">Parcial</option><option value="ANUAL">Anual</option><option value="FINAL">Final</option></Select></div>
                  <div className="space-y-1"><Label>Status do workflow</Label><Input value={getWorkflowLabel(form.statusWorkflow)} disabled /></div>
                  <div className="space-y-1"><Label>Início do período *</Label><Input type="date" value={form.periodoInicio ?? ""} onChange={(event) => setForm((atual) => ({ ...atual, periodoInicio: event.target.value }))} /></div>
                  <div className="space-y-1"><Label>Fim do período *</Label><Input type="date" value={form.periodoFim ?? ""} onChange={(event) => setForm((atual) => ({ ...atual, periodoFim: event.target.value }))} /></div>
                  <div className="space-y-1 md:col-span-2"><Label>Objeto da parceria *</Label><Textarea rows={3} value={form.objeto ?? ""} placeholder="Descreva o objeto executado e o resultado esperado." onChange={(event) => setForm((atual) => ({ ...atual, objeto: event.target.value }))} /></div>
                </div>
                <HintText text="Esses dados identificam a prestação formalmente e são obrigatórios para enviá-la à análise." />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resumo financeiro e orientação do processo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="space-y-1">
                    <Label>Total recebido</Label>
                    <CurrencyInput
                      value={form.totalRecebido}
                      onValueChange={(value) => atualizarCampoPrincipal("totalRecebido", value)}
                      onBlur={() =>
                        setMainErrors((atual) => ({
                          ...atual,
                          totalRecebido: validarCampoPrincipal("totalRecebido", form)
                        }))
                      }
                      className={mainErrors.totalRecebido ? "border-red-300 focus:ring-red-500" : undefined}
                    />
                    <HintText text="Valor total captado no período desta prestação." />
                    <ErrorText message={mainErrors.totalRecebido} />
                  </div>

                  <div className="space-y-1">
                    <Label>Total aplicado</Label>
                    <CurrencyInput
                      value={form.totalAplicado}
                      onValueChange={(value) => atualizarCampoPrincipal("totalAplicado", value)}
                      onBlur={() =>
                        setMainErrors((atual) => ({
                          ...atual,
                          totalAplicado: validarCampoPrincipal("totalAplicado", form)
                        }))
                      }
                      className={mainErrors.totalAplicado ? "border-red-300 focus:ring-red-500" : undefined}
                    />
                    <HintText text="Valor efetivamente executado ou utilizado." />
                    <ErrorText message={mainErrors.totalAplicado} />
                  </div>

                  <div className="space-y-1">
                    <Label>Saldo disponível</Label>
                    <CurrencyInput
                      value={form.saldoDisponivel}
                      onValueChange={(value) => atualizarCampoPrincipal("saldoDisponivel", value)}
                      onBlur={() =>
                        setMainErrors((atual) => ({
                          ...atual,
                          saldoDisponivel: validarCampoPrincipal("saldoDisponivel", form)
                        }))
                      }
                      className={mainErrors.saldoDisponivel ? "border-red-300 focus:ring-red-500" : undefined}
                    />
                    <HintText text={`Saldo calculado pela tela: ${formatarMoeda(resumoAtual.saldoCalculado)}`} />
                    <ErrorText message={mainErrors.saldoDisponivel} />
                  </div>

                  <div className="space-y-1">
                    <Label>Prestado no mês</Label>
                    <CurrencyInput
                      value={form.prestadoMes}
                      onValueChange={(value) => atualizarCampoPrincipal("prestadoMes", value)}
                      onBlur={() =>
                        setMainErrors((atual) => ({
                          ...atual,
                          prestadoMes: validarCampoPrincipal("prestadoMes", form)
                        }))
                      }
                      className={mainErrors.prestadoMes ? "border-red-300 focus:ring-red-500" : undefined}
                    />
                    <HintText text="Use quando precisar destacar a execução do período atual." />
                    <ErrorText message={mainErrors.prestadoMes} />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label>Resumo executivo da prestação</Label>
                  <Textarea
                    rows={4}
                    value={form.totalRecebidoHelper ?? ""}
                    maxLength={LIMITE_RESUMO_EXECUTIVO}
                    placeholder="Descreva de forma simples o objeto executado, a origem dos recursos e o resultado esperado."
                    onChange={(event) =>
                      setForm((atual) => ({
                        ...atual,
                        totalRecebidoHelper: event.target.value.slice(0, LIMITE_RESUMO_EXECUTIVO)
                      }))
                    }
                  />
                  <HintText
                    text={`Este texto ajuda o analista a entender o contexto sem precisar abrir todas as abas. ${(
                      form.totalRecebidoHelper?.length ?? 0
                    )}/${LIMITE_RESUMO_EXECUTIVO} caracteres.`}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Despesas e pagamentos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                  <div className="space-y-1 xl:col-span-2">
                    <Label>Descrição *</Label>
                    <Input value={novaDespesa.descricao} className={despesaErrors.descricao ? "border-red-300" : undefined} onChange={(event) => setNovaDespesa((atual) => ({ ...atual, descricao: event.target.value }))} />
                    <ErrorText message={despesaErrors.descricao} />
                  </div>
                  <div className="space-y-1">
                    <Label>Fornecedor</Label>
                    <Input value={novaDespesa.fornecedor ?? ""} onChange={(event) => setNovaDespesa((atual) => ({ ...atual, fornecedor: event.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Documento fiscal</Label>
                    <Input value={novaDespesa.documentoFiscal ?? ""} onChange={(event) => setNovaDespesa((atual) => ({ ...atual, documentoFiscal: event.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Data do pagamento</Label>
                    <Input type="date" value={novaDespesa.dataPagamento ?? ""} onChange={(event) => setNovaDespesa((atual) => ({ ...atual, dataPagamento: event.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Valor *</Label>
                    <Input type="number" min="0" step="0.01" value={novaDespesa.valor ?? ""} className={despesaErrors.valor ? "border-red-300" : undefined} onChange={(event) => setNovaDespesa((atual) => ({ ...atual, valor: event.target.value === "" ? undefined : Number(event.target.value) }))} />
                    <ErrorText message={despesaErrors.valor} />
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <HintText text={`Total detalhado: ${formatarMoeda(resumoAtual.totalDespesas)} · Diferença para o total aplicado: ${formatarMoeda(resumoAtual.diferencaConciliacao)}`} />
                  <Button type="button" size="sm" onClick={adicionarDespesa}><Plus className="mr-1.5 h-3.5 w-3.5" />Adicionar despesa</Button>
                </div>
                <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
                  <table className="min-w-full text-sm">
                    <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]"><tr><th className="px-3 py-2 text-left">Descrição</th><th className="px-3 py-2 text-left">Fornecedor</th><th className="px-3 py-2 text-left">Pagamento</th><th className="px-3 py-2 text-right">Valor</th><th className="px-3 py-2 text-right">Ações</th></tr></thead>
                    <tbody>{(form.despesas ?? []).length ? form.despesas.map((item, index) => <tr key={`${item.descricao}-${index}`} className="border-t border-[var(--g3-border)]"><td className="px-3 py-2">{item.descricao}</td><td className="px-3 py-2">{item.fornecedor || "—"}</td><td className="px-3 py-2">{item.dataPagamento || "—"}</td><td className="px-3 py-2 text-right">{formatarMoeda(item.valor)}</td><td className="px-3 py-2 text-right"><Button size="sm" variant="danger" onClick={() => removerItem("despesas", index)}>Remover</Button></td></tr>) : <tr><td colSpan={5} className="px-3 py-4 text-center text-[var(--g3-muted)]">Nenhuma despesa detalhada.</td></tr>}</tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </section>
        ) : null}

        {abaAtiva === "receitas" ? (
          <section className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Receitas recebidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="space-y-1">
                    <Label>Fonte *</Label>
                    <Input
                      value={novoRecebimento.fonte}
                      className={recebimentoErrors.fonte ? "border-red-300 focus:ring-red-500" : undefined}
                      onBlur={() => setRecebimentoErrors(validarRecebimento(novoRecebimento))}
                      onChange={(event) =>
                        setNovoRecebimento((atual) => ({
                          ...atual,
                          fonte: event.target.value
                        }))
                      }
                    />
                    <ErrorText message={recebimentoErrors.fonte} />
                  </div>

                  <div className="space-y-1">
                    <Label>Valor</Label>
                    <CurrencyInput
                      value={novoRecebimento.valor}
                      onValueChange={(value) =>
                        setNovoRecebimento((atual) => ({
                          ...atual,
                          valor: value
                        }))
                      }
                      onBlur={() => setRecebimentoErrors(validarRecebimento(novoRecebimento))}
                      className={recebimentoErrors.valor ? "border-red-300 focus:ring-red-500" : undefined}
                    />
                    <ErrorText message={recebimentoErrors.valor} />
                  </div>

                  <div className="space-y-1">
                    <Label>Periodicidade</Label>
                    <Input
                      value={novoRecebimento.periodicidade ?? ""}
                      placeholder="Mensal, eventual, anual..."
                      onChange={(event) =>
                        setNovoRecebimento((atual) => ({
                          ...atual,
                          periodicidade: event.target.value
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-1">
                    <Label>Situação</Label>
                    <Input
                      value={novoRecebimento.status ?? ""}
                      placeholder="Recebido, previsto, confirmado..."
                      onChange={(event) =>
                        setNovoRecebimento((atual) => ({
                          ...atual,
                          status: event.target.value
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <HintText text={`Total lançado nas receitas: ${formatarMoeda(resumoAtual.totalRecebimentos)}`} />
                  <Button type="button" size="sm" onClick={adicionarRecebimento}>
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Adicionar receita
                  </Button>
                </div>

                <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
                  <table className="min-w-full text-sm">
                    <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
                      <tr>
                        <th className="px-3 py-2 text-left">Fonte</th>
                        <th className="px-3 py-2 text-left">Valor</th>
                        <th className="px-3 py-2 text-left">Periodicidade</th>
                        <th className="px-3 py-2 text-left">Situação</th>
                        <th className="px-3 py-2 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(form.recebimentos ?? []).length ? (
                        (form.recebimentos ?? []).map((item, index) => (
                          <tr
                            key={`${item.fonte}-${index}`}
                            className={cn(
                              "border-t border-[var(--g3-border)]",
                              index % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35"
                            )}
                          >
                            <td className="px-3 py-2">{item.fonte}</td>
                            <td className="px-3 py-2">{formatarMoeda(item.valor)}</td>
                            <td className="px-3 py-2">{item.periodicidade || "—"}</td>
                            <td className="px-3 py-2">{item.status || "—"}</td>
                            <td className="px-3 py-2 text-right">
                              <Button size="sm" variant="danger" onClick={() => removerItem("recebimentos", index)}>
                                Remover
                              </Button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-3 py-4 text-center">
                            Nenhuma receita lançada.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </section>
        ) : null}

        {abaAtiva === "aplicacao" ? (
          <section className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Aplicação dos recursos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="space-y-1 xl:col-span-2">
                    <Label>Título *</Label>
                    <Input
                      value={novaDestinacao.titulo}
                      className={destinacaoErrors.titulo ? "border-red-300 focus:ring-red-500" : undefined}
                      onBlur={() => setDestinacaoErrors(validarDestinacao(novaDestinacao))}
                      onChange={(event) =>
                        setNovaDestinacao((atual) => ({
                          ...atual,
                          titulo: event.target.value
                        }))
                      }
                    />
                    <ErrorText message={destinacaoErrors.titulo} />
                  </div>

                  <div className="space-y-1">
                    <Label>Percentual</Label>
                    <Input
                      inputMode="decimal"
                      value={novaDestinacao.percentual ?? ""}
                      className={destinacaoErrors.percentual ? "border-red-300 focus:ring-red-500" : undefined}
                      onBlur={() => setDestinacaoErrors(validarDestinacao(novaDestinacao))}
                      onChange={(event) =>
                        setNovaDestinacao((atual) => ({
                          ...atual,
                          percentual: event.target.value ? Number(event.target.value.replace(",", ".")) : undefined
                        }))
                      }
                    />
                    <ErrorText message={destinacaoErrors.percentual} />
                  </div>

                  <div className="space-y-1">
                    <Label>Descrição</Label>
                    <Input
                      value={novaDestinacao.descricao ?? ""}
                      onChange={(event) =>
                        setNovaDestinacao((atual) => ({
                          ...atual,
                          descricao: event.target.value
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <HintText
                    text={`Soma dos percentuais lançados: ${formatarPercentual(resumoAtual.totalDestinacoesPercentual)}`}
                  />
                  <Button type="button" size="sm" onClick={adicionarDestinacao}>
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Adicionar aplicação
                  </Button>
                </div>

                <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
                  <table className="min-w-full text-sm">
                    <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
                      <tr>
                        <th className="px-3 py-2 text-left">Aplicação</th>
                        <th className="px-3 py-2 text-left">Percentual</th>
                        <th className="px-3 py-2 text-left">Valor estimado</th>
                        <th className="px-3 py-2 text-left">Descrição</th>
                        <th className="px-3 py-2 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(form.destinacoes ?? []).length ? (
                        (form.destinacoes ?? []).map((item, index) => {
                          const valorEstimado =
                            form.totalAplicado != null && item.percentual != null
                              ? (form.totalAplicado * item.percentual) / 100
                              : undefined;

                          return (
                            <tr
                              key={`${item.titulo}-${index}`}
                              className={cn(
                                "border-t border-[var(--g3-border)]",
                                index % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35"
                              )}
                            >
                              <td className="px-3 py-2">{item.titulo}</td>
                              <td className="px-3 py-2">{formatarPercentual(item.percentual)}</td>
                              <td className="px-3 py-2">{formatarMoeda(valorEstimado)}</td>
                              <td className="px-3 py-2">{item.descricao || "—"}</td>
                              <td className="px-3 py-2 text-right">
                                <Button size="sm" variant="danger" onClick={() => removerItem("destinacoes", index)}>
                                  Remover
                                </Button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-3 py-4 text-center">
                            Nenhuma aplicação detalhada.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </section>
        ) : null}

        {abaAtiva === "documentos" ? (
          <section className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Comprovantes da prestação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="space-y-1">
                    <Label>Título *</Label>
                    <Input
                      value={novoComprovante.titulo}
                      className={comprovanteErrors.titulo ? "border-red-300 focus:ring-red-500" : undefined}
                      onBlur={() => setComprovanteErrors(validarComprovante(novoComprovante))}
                      onChange={(event) =>
                        setNovoComprovante((atual) => ({
                          ...atual,
                          titulo: event.target.value
                        }))
                      }
                    />
                    <ErrorText message={comprovanteErrors.titulo} />
                  </div>

                  <div className="space-y-1">
                    <Label>Arquivo ou nome do documento *</Label>
                    <Input
                      value={novoComprovante.arquivoNome ?? ""}
                      className={comprovanteErrors.arquivoNome ? "border-red-300 focus:ring-red-500" : undefined}
                      onBlur={() => setComprovanteErrors(validarComprovante(novoComprovante))}
                      onChange={(event) =>
                        setNovoComprovante((atual) => ({
                          ...atual,
                          arquivoNome: event.target.value
                        }))
                      }
                    />
                    <ErrorText message={comprovanteErrors.arquivoNome} />
                  </div>

                  <div className="space-y-1">
                    <Label>Link do arquivo</Label>
                    <Input
                      value={novoComprovante.arquivoUrl ?? ""}
                      placeholder="https://..."
                      onChange={(event) =>
                        setNovoComprovante((atual) => ({
                          ...atual,
                          arquivoUrl: event.target.value
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-1">
                    <Label>Enviar arquivo</Label>
                    <div className="flex gap-2">
                      <Input
                        type="file"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.jpg,.jpeg,.png,.webp"
                        disabled={!registroSelecionadoId || enviandoArquivo}
                        onChange={(event) => setArquivoComprovante(event.target.files?.[0] ?? null)}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={!registroSelecionadoId || !arquivoComprovante || enviandoArquivo}
                        onClick={() => void enviarArquivoComprovante()}
                        title={!registroSelecionadoId ? "Salve a prestação antes de enviar arquivos" : undefined}
                      >
                        <Upload className="mr-1.5 h-3.5 w-3.5" />
                        Enviar
                      </Button>
                    </div>
                    <HintText text={registroSelecionadoId ? "Formatos aceitos: PDF, documentos, planilhas e imagens, até 25 MB." : "Salve a prestação antes de enviar um arquivo."} />
                  </div>

                  <div className="space-y-1">
                    <Label>Descrição</Label>
                    <Input
                      value={novoComprovante.descricao ?? ""}
                      onChange={(event) =>
                        setNovoComprovante((atual) => ({
                          ...atual,
                          descricao: event.target.value
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button size="sm" onClick={adicionarComprovante}>
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Adicionar comprovante
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr),minmax(0,0.85fr)]">
              <Card>
                <CardHeader>
                  <CardTitle>Checklist de conferência</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="space-y-1">
                      <Label>Item *</Label>
                      <Input
                        value={novoChecklist.titulo}
                        className={checklistErrors.titulo ? "border-red-300 focus:ring-red-500" : undefined}
                        onBlur={() => setChecklistErrors(validarChecklist(novoChecklist))}
                        onChange={(event) =>
                          setNovoChecklist((atual) => ({
                            ...atual,
                            titulo: event.target.value
                          }))
                        }
                      />
                      <ErrorText message={checklistErrors.titulo} />
                    </div>
                    <div className="space-y-1">
                      <Label>Descrição</Label>
                      <Input
                        value={novoChecklist.descricao ?? ""}
                        onChange={(event) =>
                          setNovoChecklist((atual) => ({
                            ...atual,
                            descricao: event.target.value
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Situação</Label>
                      <Select
                        value={novoChecklist.status ?? "pendente"}
                        onChange={(event) =>
                          setNovoChecklist((atual) => ({
                            ...atual,
                            status: event.target.value
                          }))
                        }
                      >
                        <option value="pendente">Pendente</option>
                        <option value="andamento">Em andamento</option>
                        <option value="concluido">Concluído</option>
                      </Select>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <HintText
                      text={`${resumoAtual.totalChecklistConcluido} concluídos e ${resumoAtual.totalChecklistPendente} pendentes.`}
                    />
                    <Button size="sm" onClick={adicionarChecklist}>
                      <Plus className="mr-1.5 h-3.5 w-3.5" />
                      Adicionar item
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {(form.checklist ?? []).length ? (
                      form.checklist.map((item, index) => (
                        <div
                          key={`${item.titulo}-${index}`}
                          className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-[var(--g3-border)] p-3"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium text-[var(--g3-foreground)]">{item.titulo}</p>
                              <Badge variant={getStatusBadgeVariant((item.status as StatusPrestacaoContas) ?? "pendente")}>
                                {getStatusLabel((item.status as StatusPrestacaoContas) ?? "pendente")}
                              </Badge>
                            </div>
                            {item.descricao ? (
                              <p className="mt-1 text-sm text-[var(--g3-muted)]">{item.descricao}</p>
                            ) : null}
                          </div>
                          <Button size="sm" variant="danger" onClick={() => removerItem("checklist", index)}>
                            Remover
                          </Button>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-lg border border-dashed border-[var(--g3-border)] p-4 text-center text-sm text-[var(--g3-muted)]">
                        Nenhum item de conferência cadastrado.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Comprovantes lançados</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(form.comprovantes ?? []).length ? (
                    form.comprovantes.map((item, index) => (
                      <div
                        key={`${item.titulo}-${index}`}
                        className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-[var(--g3-border)] p-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-[var(--g3-foreground)]">{item.titulo}</p>
                          {item.arquivoUrl?.startsWith("/api/arquivos/") ? (
                            <a className="text-sm text-[var(--g3-primary)] underline" href={item.arquivoUrl} target="_blank" rel="noreferrer">
                              {item.arquivoNome || "Abrir arquivo"}
                            </a>
                          ) : (
                            <p className="text-sm text-[var(--g3-muted)]">{item.arquivoNome || item.arquivoUrl || "Sem referência"}</p>
                          )}
                          {item.descricao ? <p className="mt-1 text-sm text-[var(--g3-muted)]">{item.descricao}</p> : null}
                        </div>
                        <Button size="sm" variant="danger" onClick={() => removerItem("comprovantes", index)}>
                          Remover
                        </Button>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-lg border border-dashed border-[var(--g3-border)] p-4 text-center text-sm text-[var(--g3-muted)]">
                      Nenhum comprovante lançado.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </section>
        ) : null}

        {abaAtiva === "revisao" ? (
          <section className="space-y-4">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr),minmax(320px,0.8fr)]">
              <Card>
                <CardHeader>
                  <CardTitle>Pendências e prontidão para envio</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={getStatusBadgeVariant(resumoAtual.status)}>{getStatusLabel(resumoAtual.status)}</Badge>
                    <span className="text-sm text-[var(--g3-muted)]">
                      {resumoAtual.pendencias.length
                        ? `${resumoAtual.pendencias.length} ponto(s) ainda exigem revisão.`
                        : "A prestação está organizada e pronta para conferência final."}
                    </span>
                  </div>

                  {resumoAtual.pendencias.length ? (
                    <div className="space-y-2">
                      {resumoAtual.pendencias.map((pendencia) => (
                        <div
                          key={pendencia}
                          className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
                        >
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                          <span>{pendencia}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>Nenhuma pendência crítica identificada nesta revisão visual.</span>
                    </div>
                  )}

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-lg border border-[var(--g3-border)] p-3">
                      <p className="text-xs uppercase tracking-[0.14em] text-[var(--g3-muted)]">Recebido</p>
                      <p className="mt-1 text-lg font-semibold">{formatarMoeda(form.totalRecebido)}</p>
                    </div>
                    <div className="rounded-lg border border-[var(--g3-border)] p-3">
                      <p className="text-xs uppercase tracking-[0.14em] text-[var(--g3-muted)]">Aplicado</p>
                      <p className="mt-1 text-lg font-semibold">{formatarMoeda(form.totalAplicado)}</p>
                    </div>
                    <div className="rounded-lg border border-[var(--g3-border)] p-3">
                      <p className="text-xs uppercase tracking-[0.14em] text-[var(--g3-muted)]">Saldo informado</p>
                      <p className="mt-1 text-lg font-semibold">{formatarMoeda(form.saldoDisponivel)}</p>
                    </div>
                    <div className="rounded-lg border border-[var(--g3-border)] p-3">
                      <p className="text-xs uppercase tracking-[0.14em] text-[var(--g3-muted)]">Saldo calculado</p>
                      <p className="mt-1 text-lg font-semibold">{formatarMoeda(resumoAtual.saldoCalculado)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Passo final</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-primary-soft)]/35 p-3">
                    <p className="text-sm font-semibold text-[var(--g3-active)]">Fluxo recomendado</p>
                    <ul className="mt-2 space-y-2 text-sm text-[var(--g3-foreground)]">
                      <li>1. Revise os totais e a coerência do saldo.</li>
                      <li>2. Confirme se cada aplicação tem sustentação documental.</li>
                      <li>3. Finalize o checklist antes de imprimir ou enviar.</li>
                      <li>4. Salve a prestação após a conferência final.</li>
                    </ul>
                  </div>

                  <div className="rounded-lg border border-[var(--g3-border)] p-3">
                    <p className="text-sm font-semibold text-[var(--g3-foreground)]">Resumo executivo</p>
                    <p className="mt-2 text-sm text-[var(--g3-muted)]">
                      {form.totalRecebidoHelper?.trim() || "Nenhum resumo executivo informado ainda."}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Parecer técnico e decisão</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-1">
                    <Label>Conclusão do parecer</Label>
                    <Select value={form.parecerConclusao ?? ""} onChange={(event) => setForm((atual) => ({ ...atual, parecerConclusao: (event.target.value || undefined) as PrestacaoContasPayload["parecerConclusao"] }))}>
                      <option value="">Selecione</option>
                      <option value="APROVAR">Aprovar</option>
                      <option value="APROVAR_RESSALVAS">Aprovar com ressalvas</option>
                      <option value="REJEITAR">Rejeitar</option>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Responsável pela análise</Label>
                    <Input value={form.parecerResponsavel ?? ""} onChange={(event) => setForm((atual) => ({ ...atual, parecerResponsavel: event.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Data do parecer</Label>
                    <Input type="date" value={form.parecerData ?? ""} onChange={(event) => setForm((atual) => ({ ...atual, parecerData: event.target.value }))} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Parecer técnico *</Label>
                  <Textarea rows={4} value={form.parecerTexto ?? ""} placeholder="Registre a análise da execução financeira, documental e dos resultados." onChange={(event) => setForm((atual) => ({ ...atual, parecerTexto: event.target.value }))} />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Ressalvas</Label>
                    <Textarea rows={3} value={form.parecerRessalvas ?? ""} placeholder="Informe as ressalvas, quando houver." onChange={(event) => setForm((atual) => ({ ...atual, parecerRessalvas: event.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Recomendações</Label>
                    <Textarea rows={3} value={form.parecerRecomendacoes ?? ""} placeholder="Registre recomendações para o próximo período." onChange={(event) => setForm((atual) => ({ ...atual, parecerRecomendacoes: event.target.value }))} />
                  </div>
                </div>
                <HintText text="Salve o parecer antes de aprovar, aprovar com ressalvas ou rejeitar a prestação." />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Histórico de versões do parecer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(form.parecerHistorico ?? []).length ? form.parecerHistorico.map((versao) => (
                  <div key={versao.id} className="rounded-lg border border-[var(--g3-border)] p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="info">Versão {versao.versao}</Badge>
                        <span className="text-sm font-medium">{versao.conclusao === "APROVAR_RESSALVAS" ? "Aprovar com ressalvas" : versao.conclusao === "APROVAR" ? "Aprovar" : versao.conclusao === "REJEITAR" ? "Rejeitar" : "Sem conclusão"}</span>
                      </div>
                      <span className="text-xs text-[var(--g3-muted)]">{versao.usuarioNome || versao.responsavel || "Usuário não informado"} · {versao.criadoEm ? new Date(versao.criadoEm).toLocaleString("pt-BR") : "—"}</span>
                    </div>
                    {versao.parecerTexto ? <p className="mt-2 text-sm text-[var(--g3-foreground)]">{versao.parecerTexto}</p> : null}
                    {versao.ressalvas ? <p className="mt-1 text-sm text-amber-700"><strong>Ressalvas:</strong> {versao.ressalvas}</p> : null}
                  </div>
                )) : <p className="text-sm text-[var(--g3-muted)]">Nenhuma versão de parecer registrada.</p>}
              </CardContent>
            </Card>

            <div className="grid gap-4 xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Timeline da prestação</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="space-y-1">
                      <Label>Marco *</Label>
                      <Input
                        value={novaTimeline.titulo}
                        className={timelineErrors.titulo ? "border-red-300 focus:ring-red-500" : undefined}
                        onBlur={() => setTimelineErrors(validarTimeline(novaTimeline))}
                        onChange={(event) =>
                          setNovaTimeline((atual) => ({
                            ...atual,
                            titulo: event.target.value
                          }))
                        }
                      />
                      <ErrorText message={timelineErrors.titulo} />
                    </div>
                    <div className="space-y-1">
                      <Label>Detalhe</Label>
                      <Input
                        value={novaTimeline.detalhe ?? ""}
                        onChange={(event) =>
                          setNovaTimeline((atual) => ({
                            ...atual,
                            detalhe: event.target.value
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Situação</Label>
                      <Select
                        value={novaTimeline.status ?? "pendente"}
                        onChange={(event) =>
                          setNovaTimeline((atual) => ({
                            ...atual,
                            status: event.target.value
                          }))
                        }
                      >
                        <option value="pendente">Pendente</option>
                        <option value="andamento">Em andamento</option>
                        <option value="concluido">Concluído</option>
                      </Select>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button size="sm" onClick={adicionarTimeline}>
                      <Plus className="mr-1.5 h-3.5 w-3.5" />
                      Adicionar marco
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {(form.timelines ?? []).length ? (
                      form.timelines.map((item, index) => (
                        <div
                          key={`${item.titulo}-${index}`}
                          className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-[var(--g3-border)] p-3"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium text-[var(--g3-foreground)]">{item.titulo}</p>
                              <Badge variant={getStatusBadgeVariant((item.status as StatusPrestacaoContas) ?? "pendente")}>
                                {getStatusLabel((item.status as StatusPrestacaoContas) ?? "pendente")}
                              </Badge>
                            </div>
                            {item.detalhe ? <p className="mt-1 text-sm text-[var(--g3-muted)]">{item.detalhe}</p> : null}
                          </div>
                          <Button size="sm" variant="danger" onClick={() => removerItem("timelines", index)}>
                            Remover
                          </Button>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-lg border border-dashed border-[var(--g3-border)] p-4 text-center text-sm text-[var(--g3-muted)]">
                        Nenhum marco da prestação cadastrado.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Indicadores de conferência</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-lg border border-[var(--g3-border)] p-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-[var(--g3-muted)]">Receitas cadastradas</p>
                    <p className="mt-1 text-2xl font-semibold text-[var(--g3-foreground)]">{form.recebimentos.length}</p>
                  </div>
                  <div className="rounded-lg border border-[var(--g3-border)] p-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-[var(--g3-muted)]">Aplicações detalhadas</p>
                    <p className="mt-1 text-2xl font-semibold text-[var(--g3-foreground)]">{form.destinacoes.length}</p>
                  </div>
                  <div className="rounded-lg border border-[var(--g3-border)] p-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-[var(--g3-muted)]">Comprovantes</p>
                    <p className="mt-1 text-2xl font-semibold text-[var(--g3-foreground)]">{form.comprovantes.length}</p>
                  </div>
                  <div className="rounded-lg border border-[var(--g3-border)] p-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-[var(--g3-muted)]">Checklist pendente</p>
                    <p className="mt-1 text-2xl font-semibold text-[var(--g3-foreground)]">
                      {resumoAtual.totalChecklistPendente}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
        ) : null}
      </AdminPageLayout>

      {popup ? <PopupMensagem popup={popup} onClose={() => setPopup(null)} /> : null}
      <PopupConfirmacao
        aberto={confirmarExclusao}
        titulo="Confirmar exclusão"
        texto="Esta ação é irreversível. Deseja continuar?"
        processando={processando}
        onCancel={() => setConfirmarExclusao(false)}
        onConfirm={() => void confirmarExclusaoRegistro()}
        confirmarTexto="Excluir"
      />
    </>
  );
}
