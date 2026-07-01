import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Bell,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  ExternalLink,
  List,
  LoaderCircle,
  Mail,
  MessageCircle,
  PackageCheck,
  Plus,
  Printer,
  Save,
  Search,
  Trash2,
  Undo2,
  X
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminPageLayout, type AdminAction, type AdminTab } from "@/components/admin/admin-page-layout";
import { PopupConfirmacao, PopupMensagem, type PopupMensagemState } from "@/components/admin/admin-popups";
import {
  useAgendaDiaEmprestimos,
  useAgendaResumoEmprestimos,
  useEmprestimosEventos,
  useEventosEmprestimo,
  useRemoverResponsavelEmprestimo,
  useRemoverEmprestimoEvento,
  useRemoverEventoEmprestimo,
  useResponsaveisEmprestimo,
  useSalvarResponsavelEmprestimo,
  useSalvarEmprestimoEvento,
  useSalvarEventoEmprestimo
} from "@/features/emprestimos-eventos/use-emprestimos-eventos";
import { useItensAlmoxarifado } from "@/features/almoxarifado/use-almoxarifado";
import { usePatrimonios } from "@/features/patrimonios/use-patrimonios";
import { useUnidadesAssistenciais } from "@/features/unidades-assistenciais/use-unidades-assistenciais";
import { formatarCnpj, formatarDataPtBr, formatarTelefone, normalizarTelefone } from "@/lib/br-utils";
import { obterUrlArquivoAutenticado, resolverUrlArquivo } from "@/lib/arquivos";
import { imprimirConteudoAtual, imprimirHtmlSemJanela } from "@/lib/report-utils";
import {
  agoraLocalInputDateTime,
  formatarDateTimeLocalPtBr,
  normalizarDateTimeLocal
} from "@/lib/emprestimos-eventos-datetime";
import { emprestimosEventosService } from "@/services/emprestimos-eventos.service";
import type {
  EmprestimoEvento,
  EventoEmprestimo,
  ItemEmprestimoEvento,
  ResponsavelEmprestimo,
  StatusEmprestimoEvento,
  TipoItemEmprestimo
} from "@/types/emprestimos-eventos";
import { useAuth } from "@/hooks/use-auth";

type AbaId = "listagem" | "cadastro" | "itens" | "agenda" | "eventos" | "responsaveis";

type FormState = {
  id?: number;
  eventoId: string;
  unidadeId: string;
  responsavelId: string;
  responsavelNome: string;
  dataRetiradaPrevista: string;
  dataDevolucaoPrevista: string;
  status: StatusEmprestimoEvento;
  observacoes: string;
  itens: ItemEmprestimoEvento[];
};

type EventoFormState = {
  id?: number;
  titulo: string;
  descricao: string;
  local: string;
  promovidoPor: string;
  status: string;
};

type ResponsavelFormState = {
  id?: number;
  nome: string;
  documento: string;
  telefone: string;
  email: string;
  observacoes: string;
};

type PreviewConfirmacaoEmailState = {
  emprestimoId: number;
  destinatario: string;
  assunto: string;
  mensagem: string;
};

const abas: AdminTab[] = [
  { id: "listagem", label: "Listagem", icon: List },
  { id: "cadastro", label: "Dados do empréstimo", icon: ClipboardList },
  { id: "itens", label: "Itens vinculados", icon: ClipboardList },
  { id: "agenda", label: "Agenda de empréstimos", icon: CalendarDays },
  { id: "eventos", label: "Eventos", icon: CalendarDays },
  { id: "responsaveis", label: "Responsáveis", icon: ClipboardList }
];

const tituloTela = "Empréstimos para eventos";

const statusOpcoes: Array<{ value: StatusEmprestimoEvento; label: string }> = [
  { value: "RASCUNHO", label: "Rascunho" },
  { value: "AGENDADO", label: "Agendado" },
  { value: "RETIRADO", label: "Retirado" },
  { value: "DEVOLVIDO", label: "Devolvido" },
  { value: "CANCELADO", label: "Cancelado" }
];

const eventoCatalogoStatusOpcoes = [
  { value: "ATIVO", label: "Ativo" },
  { value: "INATIVO", label: "Inativo" }
];

const classesLinhaStatusEmprestimo: Record<StatusEmprestimoEvento, string> = {
  RASCUNHO: "bg-[var(--g3-card)]",
  AGENDADO: "bg-amber-50 text-amber-950",
  RETIRADO: "bg-red-50 text-red-950",
  DEVOLVIDO: "bg-emerald-50 text-emerald-950",
  CANCELADO: "bg-slate-100 text-slate-700"
};

const nowLocal = () => agoraLocalInputDateTime();
const fmt = (v?: string | null) => formatarDateTimeLocalPtBr(v);
const dt = (v?: string | null) => normalizarDateTimeLocal(v);

const nomesMeses = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro"
];
const nomesDiasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function dataLocalIso(data = new Date()) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function parseDataLocal(dataIso: string) {
  const [ano, mes, dia] = dataIso.split("-").map(Number);
  return new Date(ano, (mes || 1) - 1, dia || 1);
}

function inicioMesIso(dataIso = dataLocalIso()) {
  const data = parseDataLocal(dataIso);
  return dataLocalIso(new Date(data.getFullYear(), data.getMonth(), 1));
}

function fimMesIso(dataIso = dataLocalIso()) {
  const data = parseDataLocal(dataIso);
  return dataLocalIso(new Date(data.getFullYear(), data.getMonth() + 1, 0));
}

function alterarMes(dataIso: string, delta: number) {
  const data = parseDataLocal(dataIso);
  return dataLocalIso(new Date(data.getFullYear(), data.getMonth() + delta, 1));
}

function somenteData(valor?: string | null) {
  return dt(valor).slice(0, 10);
}

function compararDataHora(a?: string | null, b?: string | null) {
  return dt(a).localeCompare(dt(b));
}

function normalizarBuscaTexto(valor?: string | null) {
  return (valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

function escaparHtmlRelatorio(valor?: string | number | null) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function montarRodapeInstitucional(unidade?: {
  razao_social?: string;
  nome_fantasia?: string;
  cnpj?: string;
  telefone?: string;
  email?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
}) {
  const linha1 = unidade?.razao_social?.trim() || unidade?.nome_fantasia?.trim() || "Instituição não cadastrada";
  const detalhes = [formatarCnpj(unidade?.cnpj), formatarTelefone(unidade?.telefone), unidade?.email?.trim()]
    .filter(Boolean)
    .join(" • ");
  const endereco = [
    unidade?.logradouro?.trim(),
    unidade?.numero?.trim(),
    unidade?.complemento?.trim(),
    unidade?.bairro?.trim(),
    unidade?.cidade?.trim(),
    unidade?.estado?.trim()
  ]
    .filter(Boolean)
    .join(" • ");

  return { linha1, linha2: detalhes, linha3: endereco };
}

function formatarHora(valor?: string | null) {
  const normalizado = dt(valor);
  return normalizado.length >= 16 ? normalizado.slice(11, 16) : "--:--";
}

function dataHoraVencida(valor?: string | null) {
  const normalizado = dt(valor);
  if (!normalizado) return false;
  return new Date(normalizado).getTime() < Date.now();
}

function formatarGoogleDateTime(valor?: string | null) {
  const normalizado = dt(valor);
  if (!normalizado) return "";
  return normalizado.replace(/[-:]/g, "").replace("T", "T").slice(0, 15);
}

const defaultForm = (): FormState => ({
  eventoId: "",
  unidadeId: "",
  responsavelId: "",
  responsavelNome: "",
  dataRetiradaPrevista: nowLocal(),
  dataDevolucaoPrevista: nowLocal(),
  status: "RASCUNHO",
  observacoes: "",
  itens: []
});

const defaultEvento: EventoFormState = {
  titulo: "",
  descricao: "",
  local: "",
  promovidoPor: "",
  status: "ATIVO"
};

const defaultResponsavel: ResponsavelFormState = {
  nome: "",
  documento: "",
  telefone: "",
  email: "",
  observacoes: ""
};

export function EmprestimoEventosPage() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const queryClient = useQueryClient();
  const [abaAtiva, setAbaAtiva] = useState<AbaId>("listagem");

  const [fInicio, setFInicio] = useState("");
  const [fFim, setFFim] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fEvento, setFEvento] = useState("");

  const [form, setForm] = useState<FormState>(defaultForm());
  const [snapshot, setSnapshot] = useState<FormState>(defaultForm());
  const [eventoForm, setEventoForm] = useState<EventoFormState>(defaultEvento);
  const [responsavelForm, setResponsavelForm] = useState<ResponsavelFormState>(defaultResponsavel);
  const [itemTipo, setItemTipo] = useState<TipoItemEmprestimo>("PATRIMONIO");
  const [itemId, setItemId] = useState("");
  const [itemBusca, setItemBusca] = useState("");
  const [itemQtd, setItemQtd] = useState("1");
  const [itemObs, setItemObs] = useState("");
  const [itemUnidadeFiltro, setItemUnidadeFiltro] = useState("");
  const [patrimoniosAlmoxSelecionados, setPatrimoniosAlmoxSelecionados] = useState<string[]>([]);

  const [agendaMes, setAgendaMes] = useState(inicioMesIso());
  const [agendaDia, setAgendaDia] = useState(dataLocalIso());

  const [popup, setPopup] = useState<PopupMensagemState | null>(null);
  const [alertaEmailEmEnvio, setAlertaEmailEmEnvio] = useState<number | null>(null);
  const [confirmacaoEmailEmEnvio, setConfirmacaoEmailEmEnvio] = useState<number | null>(null);
  const [previewConfirmacaoEmail, setPreviewConfirmacaoEmail] = useState<PreviewConfirmacaoEmailState | null>(null);
  const [confirmarExcluir, setConfirmarExcluir] = useState(false);
  const [confirmarExcluirEvento, setConfirmarExcluirEvento] = useState(false);
  const [confirmarExcluirResponsavel, setConfirmarExcluirResponsavel] = useState(false);

  const filtros = useMemo(
    () => ({
      inicio: fInicio ? `${fInicio}T00:00` : undefined,
      fim: fFim ? `${fFim}T23:59` : undefined,
      status: fStatus || undefined,
      evento: fEvento ? Number(fEvento) : undefined
    }),
    [fInicio, fFim, fStatus, fEvento]
  );

  const { data: emprestimosData, isLoading: carregandoEmprestimos } = useEmprestimosEventos(filtros);
  const { data: eventosData } = useEventosEmprestimo();
  const { data: responsaveisData } = useResponsaveisEmprestimo();
  const agendaInicio = useMemo(() => inicioMesIso(agendaMes), [agendaMes]);
  const agendaFim = useMemo(() => fimMesIso(agendaMes), [agendaMes]);
  const { data: agendaResumoData } = useAgendaResumoEmprestimos(agendaInicio, agendaFim);
  const { data: agendaDiaData } = useAgendaDiaEmprestimos(agendaDia || undefined);
  const { data: unidadesData } = useUnidadesAssistenciais({});
  const { data: patrimoniosData } = usePatrimonios();
  const { data: almoxData } = useItensAlmoxarifado();

  const salvarMutation = useSalvarEmprestimoEvento();
  const removerMutation = useRemoverEmprestimoEvento();
  const salvarEventoMutation = useSalvarEventoEmprestimo();
  const removerEventoMutation = useRemoverEventoEmprestimo();
  const salvarResponsavelMutation = useSalvarResponsavelEmprestimo();
  const removerResponsavelMutation = useRemoverResponsavelEmprestimo();

  const emprestimos = emprestimosData?.emprestimos ?? [];
  const eventos = eventosData ?? [];
  const responsaveis = responsaveisData ?? [];
  const unidades = unidadesData?.unidades ?? [];
  const patrimonios = patrimoniosData?.patrimonios ?? [];
  const almox = almoxData?.itens ?? [];
  const unidadeRelatorio =
    unidades.find((unidade) => String(unidade.id_unidade) === form.unidadeId) ??
    unidades.find((unidade) => unidade.unidade_principal) ??
    unidades[0];
  const nomeInstituicao =
    usuario?.instituicao_nome?.trim() ||
    unidadeRelatorio?.razao_social?.trim() ||
    unidadeRelatorio?.nome_fantasia?.trim() ||
    "Instituição";
  const caminhoLogomarcaRelatorio = unidadeRelatorio?.logomarca_relatorio || unidadeRelatorio?.logomarca;
  const logomarcaRelatorio = resolverUrlArquivo(caminhoLogomarcaRelatorio);
  const rodapeInstitucional = montarRodapeInstitucional(unidadeRelatorio);
  const agendaResumo = agendaResumoData ?? [];
  const agendaDetalhe = agendaDiaData ?? [];
  const agendaResumoPorData = useMemo(
    () => new Map(agendaResumo.map((item) => [item.data, item])),
    [agendaResumo]
  );
  const diasAgenda = useMemo(() => {
    const inicio = parseDataLocal(agendaInicio);
    const primeiroDiaGrade = new Date(inicio);
    primeiroDiaGrade.setDate(inicio.getDate() - inicio.getDay());

    return Array.from({ length: 42 }, (_item, indice) => {
      const data = new Date(primeiroDiaGrade);
      data.setDate(primeiroDiaGrade.getDate() + indice);
      const dataIso = dataLocalIso(data);
      const resumo = agendaResumoPorData.get(dataIso);
      const dentroDoMes = dataIso >= agendaInicio && dataIso <= agendaFim;
      const selecionado = dataIso === agendaDia;
      const hoje = dataIso === dataLocalIso();

      return {
        dataIso,
        dia: data.getDate(),
        dentroDoMes,
        selecionado,
        hoje,
        qtdEmprestimos: resumo?.qtdEmprestimos ?? 0,
        qtdApoios: resumo?.qtdApoios ?? 0,
        temApoio: resumo?.temApoio ?? false,
        temBloqueio: resumo?.temBloqueio ?? false
      };
    });
  }, [agendaDia, agendaFim, agendaInicio, agendaResumoPorData]);
  const agendaDetalheOrdenada = useMemo(
    () => [...agendaDetalhe].sort((a, b) => compararDataHora(a.periodo.retiradaPrevista, b.periodo.retiradaPrevista)),
    [agendaDetalhe]
  );
  const emprestimosDoMes = useMemo(
    () =>
      emprestimos.filter((item) => {
        const inicio = somenteData(item.dataRetiradaPrevista);
        const fim = somenteData(item.dataDevolucaoPrevista);
        return inicio <= agendaFim && fim >= agendaInicio;
      }),
    [agendaFim, agendaInicio, emprestimos]
  );
  const compromissosAtivos = emprestimosDoMes.filter((item) => !["DEVOLVIDO", "CANCELADO"].includes(item.status));
  const compromissosLiberados = emprestimosDoMes.filter((item) => ["DEVOLVIDO", "CANCELADO"].includes(item.status));
  const diasOcupados = new Set(agendaResumo.filter((item) => item.qtdEmprestimos > 0).map((item) => item.data)).size;
  const diasApoio = new Set(agendaResumo.filter((item) => (item.qtdApoios ?? 0) > 0).map((item) => item.data)).size;
  const diasLivres = diasAgenda.filter((dia) => dia.dentroDoMes && !dia.qtdEmprestimos && !dia.qtdApoios).length;
  const tituloMesAgenda = `${nomesMeses[parseDataLocal(agendaMes).getMonth()]} de ${parseDataLocal(agendaMes).getFullYear()}`;
  const emprestimosVencidosSemDevolucao = useMemo(
    () =>
      emprestimos.filter(
        (item) =>
          item.status !== "DEVOLVIDO" &&
          item.status !== "CANCELADO" &&
          dataHoraVencida(item.dataDevolucaoPrevista)
      ),
    [emprestimos]
  );

  const patrimoniosFiltradosPorUnidade = useMemo(() => {
    if (itemTipo !== "PATRIMONIO" || !itemUnidadeFiltro) {
      return patrimonios;
    }

    const unidadeSelecionada = unidades.find((unidade) => String(unidade.id_unidade) === itemUnidadeFiltro);
    const nomeUnidadeSelecionada = normalizarBuscaTexto(
      unidadeSelecionada?.nome_fantasia ?? unidadeSelecionada?.razao_social ?? ""
    );

    return patrimonios.filter((patrimonio) => {
      const unidadePatrimonio = normalizarBuscaTexto(patrimonio.unidade);
      return (
        String(patrimonio.unidadeId ?? "") === itemUnidadeFiltro ||
        (!!nomeUnidadeSelecionada && unidadePatrimonio === nomeUnidadeSelecionada)
      );
    });
  }, [itemTipo, itemUnidadeFiltro, patrimonios, unidades]);

  const opcoesItem = useMemo(
    () =>
      itemTipo === "PATRIMONIO"
        ? patrimoniosFiltradosPorUnidade.map((p) => ({
            id: String(p.idPatrimonio),
            label: `${p.numeroPatrimonio} - ${p.nome}${p.unidade ? ` (${p.unidade})` : ""}`
          }))
        : almox.map((a) => ({ id: String(a.id_item), label: `${a.codigo} - ${a.descricao}` })),
    [itemTipo, patrimoniosFiltradosPorUnidade, almox]
  );

  const opcoesItemFiltradas = useMemo(() => {
    const termo = normalizarBuscaTexto(itemBusca);
    if (!termo) return opcoesItem.slice(0, 30);
    return opcoesItem
      .filter((item) => normalizarBuscaTexto(item.label).includes(termo))
      .slice(0, 30);
  }, [itemBusca, opcoesItem]);

  const itemAlmoxSelecionado = useMemo(
    () => almox.find((item) => String(item.id_item) === itemId) ?? null,
    [almox, itemId]
  );

  const patrimoniosDoItemAlmox = useMemo(() => {
    if (itemTipo !== "ALMOXARIFADO" || !itemAlmoxSelecionado) return [];
    const descricao = normalizarBuscaTexto(itemAlmoxSelecionado.descricao);
    const categoria = normalizarBuscaTexto(itemAlmoxSelecionado.categoria);
    const termos = descricao.split(/\s+/).filter((termo) => termo.length >= 3);
    const encontrados = patrimonios.filter((patrimonio) => {
      const nome = normalizarBuscaTexto(patrimonio.nome);
      const patrimonioCategoria = normalizarBuscaTexto(patrimonio.categoria);
      return (
        (descricao && (nome.includes(descricao) || descricao.includes(nome))) ||
        (categoria && patrimonioCategoria === categoria) ||
        termos.some((termo) => nome.includes(termo))
      );
    });

    return (encontrados.length ? encontrados : patrimonios).slice(0, 80);
  }, [itemAlmoxSelecionado, itemTipo, patrimonios]);

  const patrimoniosFiltradosBusca = useMemo(() => {
    if (itemTipo !== "PATRIMONIO") return [];
    const termo = normalizarBuscaTexto(itemBusca);
    const lista = termo
      ? patrimoniosFiltradosPorUnidade.filter((patrimonio) => {
          const texto = normalizarBuscaTexto([
            patrimonio.numeroPatrimonio,
            patrimonio.nome,
            patrimonio.categoria,
            patrimonio.subcategoria
          ].filter(Boolean).join(" "));
          return texto.includes(termo);
        })
      : patrimoniosFiltradosPorUnidade;
    return lista.slice(0, 80);
  }, [itemBusca, itemTipo, patrimoniosFiltradosPorUnidade]);

  const patrimoniosParaSelecao = itemTipo === "ALMOXARIFADO"
    ? patrimoniosDoItemAlmox
    : patrimoniosFiltradosBusca;
  const exibirSelecaoPatrimonios =
    (itemTipo === "ALMOXARIFADO" && !!itemAlmoxSelecionado) ||
    (itemTipo === "PATRIMONIO" && (Number(itemQtd) > 1 || itemBusca.trim().length > 0));

  const carregandoAcoes =
    salvarMutation.isPending ||
    removerMutation.isPending ||
    salvarEventoMutation.isPending ||
    removerEventoMutation.isPending ||
    salvarResponsavelMutation.isPending ||
    removerResponsavelMutation.isPending ||
    alertaEmailEmEnvio !== null ||
    confirmacaoEmailEmEnvio !== null;

  function selecionarEmprestimo(item: EmprestimoEvento) {
    const next: FormState = {
      id: item.id,
      eventoId: String(item.evento.id),
      unidadeId: item.unidadeId ? String(item.unidadeId) : "",
      responsavelId: item.responsavel?.id ? String(item.responsavel.id) : "",
      responsavelNome: item.responsavel?.nome ?? "",
      dataRetiradaPrevista: dt(item.dataRetiradaPrevista),
      dataDevolucaoPrevista: dt(item.dataDevolucaoPrevista),
      status: item.status,
      observacoes: item.observacoes ?? "",
      itens: [...(item.itens ?? [])]
    };
    setForm(next);
    setSnapshot(next);
    setAbaAtiva("cadastro");
    setItemUnidadeFiltro(item.unidadeId ? String(item.unidadeId) : "");
  }

  function novo() {
    const next = defaultForm();
    setForm(next);
    setSnapshot(next);
    setItemBusca("");
    setItemId("");
    setItemUnidadeFiltro("");
    setPatrimoniosAlmoxSelecionados([]);
    setAbaAtiva("cadastro");
  }

  async function salvar() {
    if (!form.eventoId || !form.dataRetiradaPrevista || !form.dataDevolucaoPrevista) {
      setPopup({ tipo: "aviso", titulo: "Validação", texto: "Preencha evento e período do empréstimo." });
      return;
    }
    if (form.dataDevolucaoPrevista < form.dataRetiradaPrevista) {
      setPopup({ tipo: "aviso", titulo: "Validação", texto: "A devolução prevista não pode ser menor que a retirada." });
      return;
    }
    if (!form.itens.length) {
      setPopup({ tipo: "aviso", titulo: "Validação", texto: "Adicione ao menos um item no empréstimo." });
      return;
    }

    try {
      const response = await salvarMutation.mutateAsync({
        id: form.id,
        eventoId: Number(form.eventoId),
        unidadeId: form.unidadeId ? Number(form.unidadeId) : null,
        responsavelId: form.responsavelId ? Number(form.responsavelId) : null,
        responsavelNome: form.responsavelNome || null,
        dataRetiradaPrevista: form.dataRetiradaPrevista,
        dataDevolucaoPrevista: form.dataDevolucaoPrevista,
        status: form.status,
        observacoes: form.observacoes || undefined,
        itens: form.itens.map((i) => ({
          itemId: Number(i.itemId),
          tipoItem: i.tipoItem,
          quantidade: Number(i.quantidade),
          statusItem: i.statusItem,
          observacaoItem: i.observacaoItem ?? undefined
        }))
      });
      selecionarEmprestimo(response);
      setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Empréstimo salvo com sucesso." });
    } catch (error: any) {
      setPopup({ tipo: "erro", titulo: "Erro", texto: error?.response?.data?.message ?? "Falha ao salvar empréstimo." });
    }
  }

  function excluir() {
    if (!form.id) {
      setPopup({ tipo: "aviso", titulo: "Atenção", texto: "Selecione um empréstimo para excluir." });
      return;
    }
    setConfirmarExcluir(true);
  }

  async function confirmarExclusao() {
    if (!form.id) return;
    try {
      await removerMutation.mutateAsync(form.id);
      setConfirmarExcluir(false);
      novo();
      setAbaAtiva("listagem");
      setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Empréstimo excluído com sucesso." });
    } catch (error: any) {
      setPopup({ tipo: "erro", titulo: "Erro", texto: error?.response?.data?.message ?? "Falha ao excluir empréstimo." });
    }
  }

  async function confirmarStatus(tipo: "RESERVA" | "RETIRADA" | "DEVOLUCAO" | "CANCELAR") {
    if (!form.id) return;
    try {
      const usuarioId = usuario?.id ? Number(usuario.id) : undefined;
      const resp =
        tipo === "RESERVA"
          ? await emprestimosEventosService.confirmarReserva(form.id, usuarioId)
          : tipo === "RETIRADA"
          ? await emprestimosEventosService.confirmarRetirada(form.id, usuarioId)
          : tipo === "DEVOLUCAO"
            ? await emprestimosEventosService.confirmarDevolucao(form.id, usuarioId)
            : await emprestimosEventosService.cancelar(form.id, usuarioId);
      await queryClient.invalidateQueries({ queryKey: ["emprestimos-eventos"] });
      selecionarEmprestimo(resp);
      setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Status atualizado com sucesso." });
    } catch (error: any) {
      setPopup({ tipo: "erro", titulo: "Erro", texto: error?.response?.data?.message ?? "Falha ao atualizar status." });
    }
  }

  async function adicionarItem() {
    if (Number(itemQtd) <= 0 || (itemTipo === "ALMOXARIFADO" && !itemId)) {
      setPopup({ tipo: "aviso", titulo: "Validação", texto: "Informe item e quantidade válidos." });
      return;
    }

    const quantidade = Number(itemQtd);

    if (itemTipo === "ALMOXARIFADO" || quantidade > 1 || patrimoniosAlmoxSelecionados.length > 0) {
      const idsSelecionados =
        patrimoniosAlmoxSelecionados.length > 0
          ? patrimoniosAlmoxSelecionados
          : itemTipo === "PATRIMONIO" && itemId
            ? [itemId]
            : [];

      if (idsSelecionados.length !== quantidade) {
        setPopup({
          tipo: "aviso",
          titulo: "Validação",
          texto: "Marque exatamente a quantidade solicitada na lista de patrimônios."
        });
        return;
      }

      const selecionados = idsSelecionados
        .map((id) => patrimonios.find((patrimonio) => String(patrimonio.idPatrimonio) === id))
        .filter(Boolean);

      const patrimonioJaVinculado = selecionados.find((patrimonio) =>
        form.itens.some((item) => item.tipoItem === "PATRIMONIO" && String(item.itemId) === String(patrimonio?.idPatrimonio))
      );
      if (patrimonioJaVinculado) {
        setPopup({
          tipo: "aviso",
          titulo: "Patrimônio já reservado",
          texto: `O patrimônio ${patrimonioJaVinculado.numeroPatrimonio} já está reservado neste empréstimo.`
        });
        return;
      }

      try {
        for (const patrimonio of selecionados) {
          const disponibilidade = await emprestimosEventosService.disponibilidade({
            itemId: Number(patrimonio?.idPatrimonio),
            tipoItem: "PATRIMONIO",
            quantidade: 1,
            inicio: form.dataRetiradaPrevista,
            fim: form.dataDevolucaoPrevista,
            emprestimoId: form.id
          });
          if (!disponibilidade.disponivel) {
            const conflito = disponibilidade.conflitos?.[0];
            throw new Error(
              conflito
                ? `${patrimonio?.numeroPatrimonio ?? "Patrimônio"} já está reservado para ${conflito.eventoTitulo}.`
                : `${patrimonio?.numeroPatrimonio ?? "Patrimônio"} já está reservado no período.`
            );
          }
        }
      } catch (error: any) {
        setPopup({
          tipo: "erro",
          titulo: "Erro",
          texto: error?.response?.data?.message ?? error?.message ?? "Um dos patrimônios selecionados já está reservado para o período."
        });
        return;
      }

      setForm((atual) => ({
        ...atual,
        itens: [
          ...atual.itens,
          ...selecionados.map((patrimonio) => ({
            itemId: Number(patrimonio?.idPatrimonio),
            tipoItem: "PATRIMONIO" as const,
            quantidade: 1,
            statusItem: "RESERVADO",
            observacaoItem:
              itemObs ||
              (itemTipo === "ALMOXARIFADO"
                ? `Origem: almoxarifado ${itemAlmoxSelecionado?.codigo ?? ""}`.trim()
                : undefined),
            nomeItem: patrimonio?.nome,
            numeroPatrimonio: patrimonio?.numeroPatrimonio
          }))
        ]
      }));
      setItemId("");
      setItemBusca("");
      setItemQtd("1");
      setItemObs("");
      setPatrimoniosAlmoxSelecionados([]);
      return;
    }

    if (!itemId) {
      setPopup({ tipo: "aviso", titulo: "Validação", texto: "Selecione um patrimônio válido." });
      return;
    }

    if (itemTipo === "PATRIMONIO") {
      const patrimonio = patrimonios.find((item) => String(item.idPatrimonio) === itemId);
      const jaVinculado = form.itens.some((item) => item.tipoItem === "PATRIMONIO" && String(item.itemId) === itemId);
      if (jaVinculado) {
        setPopup({
          tipo: "aviso",
          titulo: "Patrimônio já reservado",
          texto: `O patrimônio ${patrimonio?.numeroPatrimonio ?? itemId} já está reservado neste empréstimo.`
        });
        return;
      }
    }

    try {
      const disponibilidade = await emprestimosEventosService.disponibilidade({
        itemId: Number(itemId),
        tipoItem: itemTipo,
        quantidade,
        inicio: form.dataRetiradaPrevista,
        fim: form.dataDevolucaoPrevista,
        emprestimoId: form.id
      });
      if (!disponibilidade.disponivel) {
        const conflito = disponibilidade.conflitos?.[0];
        setPopup({
          tipo: "aviso",
          titulo: "Item reservado",
          texto: conflito
            ? `Este item já está reservado para ${conflito.eventoTitulo} no período informado.`
            : "Este item já está reservado no período informado."
        });
        return;
      }
    } catch (error: any) {
      setPopup({ tipo: "erro", titulo: "Erro", texto: error?.response?.data?.message ?? "Falha ao validar disponibilidade." });
      return;
    }

    const nomeItem =
      itemTipo === "PATRIMONIO"
        ? patrimonios.find((i) => String(i.idPatrimonio) === itemId)?.nome
        : almox.find((i) => String(i.id_item) === itemId)?.descricao;

    setForm((atual) => ({
      ...atual,
      itens: (() => {
        const indiceExistente = atual.itens.findIndex(
          (item) => item.tipoItem === itemTipo && item.itemId === Number(itemId)
        );

        if (indiceExistente < 0) {
          return [
            ...atual.itens,
            {
              itemId: Number(itemId),
              tipoItem: itemTipo,
              quantidade,
              statusItem: "RESERVADO",
              observacaoItem: itemObs || undefined,
              nomeItem: nomeItem ?? undefined,
              numeroPatrimonio: patrimonios.find((i) => String(i.idPatrimonio) === itemId)?.numeroPatrimonio
            }
          ];
        }

        return atual.itens.map((item, indice) =>
          indice === indiceExistente
            ? {
                ...item,
                quantidade: item.quantidade + quantidade,
                observacaoItem: [item.observacaoItem, itemObs].filter(Boolean).join(" | ") || undefined,
                nomeItem: item.nomeItem ?? nomeItem ?? undefined
              }
            : item
        );
      })()
    }));
    setItemId("");
    setItemBusca("");
    setItemQtd("1");
    setItemObs("");
    setPatrimoniosAlmoxSelecionados([]);
  }

  function removerItem(indice: number) {
    setForm((atual) => ({ ...atual, itens: atual.itens.filter((_i, idx) => idx !== indice) }));
  }

  function atualizarBuscaItem(valor: string) {
    const itemEncontrado = opcoesItem.find((item) => {
      return item.label.trim().localeCompare(valor.trim(), "pt-BR", { sensitivity: "base" }) === 0;
    });

    setItemBusca(valor);
    setItemId(itemEncontrado?.id ?? "");
    setPatrimoniosAlmoxSelecionados([]);
  }

  function selecionarResponsavel(item: ResponsavelEmprestimo) {
    setResponsavelForm({
      id: item.id,
      nome: item.nome,
      documento: item.documento ?? "",
      telefone: item.telefone ?? "",
      email: item.email ?? "",
      observacoes: item.observacoes ?? ""
    });
    setAbaAtiva("responsaveis");
  }

  async function salvarResponsavel() {
    if (!responsavelForm.nome.trim()) {
      setPopup({ tipo: "aviso", titulo: "Validação", texto: "Informe o nome do responsável." });
      return;
    }

    try {
      const responsavel = await salvarResponsavelMutation.mutateAsync({
        id: responsavelForm.id,
        nome: responsavelForm.nome.trim(),
        documento: responsavelForm.documento || undefined,
        telefone: responsavelForm.telefone || undefined,
        email: responsavelForm.email || undefined,
        observacoes: responsavelForm.observacoes || undefined
      });
      setResponsavelForm({
        id: responsavel.id,
        nome: responsavel.nome,
        documento: responsavel.documento ?? "",
        telefone: responsavel.telefone ?? "",
        email: responsavel.email ?? "",
        observacoes: responsavel.observacoes ?? ""
      });
      setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Responsável salvo com sucesso." });
    } catch (error: any) {
      setPopup({ tipo: "erro", titulo: "Erro", texto: error?.response?.data?.message ?? "Falha ao salvar responsável." });
    }
  }

  function excluirResponsavel() {
    if (!responsavelForm.id) {
      setPopup({ tipo: "aviso", titulo: "Atenção", texto: "Selecione um responsável para excluir." });
      return;
    }
    setConfirmarExcluirResponsavel(true);
  }

  async function confirmarExclusaoResponsavel() {
    if (!responsavelForm.id) return;
    try {
      await removerResponsavelMutation.mutateAsync(responsavelForm.id);
      setConfirmarExcluirResponsavel(false);
      setResponsavelForm(defaultResponsavel);
      setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Responsável excluído com sucesso." });
    } catch (error: any) {
      setPopup({ tipo: "erro", titulo: "Erro", texto: error?.response?.data?.message ?? "Falha ao excluir responsável." });
    }
  }

  async function salvarEvento() {
    if (!eventoForm.titulo.trim()) {
      setPopup({ tipo: "aviso", titulo: "Validação", texto: "Informe o título do evento." });
      return;
    }
    try {
      await salvarEventoMutation.mutateAsync({
        id: eventoForm.id ?? 0,
        titulo: eventoForm.titulo.trim(),
        descricao: eventoForm.descricao || undefined,
        local: eventoForm.local || undefined,
        promovidoPor: eventoForm.promovidoPor || undefined,
        status: eventoForm.status
      });
      setEventoForm(defaultEvento);
      setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Evento salvo com sucesso." });
    } catch (error: any) {
      setPopup({
        tipo: "erro",
        titulo: "Erro",
        texto:
          error?.response?.data?.message ??
          error?.response?.data?.erro ??
          error?.response?.data?.error ??
          "Falha ao salvar evento."
      });
    }
  }

  async function abrirPreviewConfirmacaoEmail(item: EmprestimoEvento) {
    if (!item.id || confirmacaoEmailEmEnvio !== null) {
      return;
    }

    try {
      setConfirmacaoEmailEmEnvio(item.id);
      const preview = await emprestimosEventosService.obterPreviewConfirmacaoReservaEmail(item.id);
      setPreviewConfirmacaoEmail({
        emprestimoId: item.id,
        destinatario: preview.destinatario,
        assunto: preview.assunto,
        mensagem: preview.mensagem
      });
    } catch (error: any) {
      setPopup({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Falha ao preparar a pré-visualização do e-mail."
      });
    } finally {
      setConfirmacaoEmailEmEnvio(null);
    }
  }

  function excluirEvento() {
    if (!eventoForm.id) {
      setPopup({ tipo: "aviso", titulo: "Atenção", texto: "Selecione um evento para excluir." });
      return;
    }
    setConfirmarExcluirEvento(true);
  }

  async function confirmarExclusaoEvento() {
    if (!eventoForm.id) return;
    try {
      await removerEventoMutation.mutateAsync(eventoForm.id);
      setConfirmarExcluirEvento(false);
      setEventoForm(defaultEvento);
      setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Evento excluído com sucesso." });
    } catch (error: any) {
      setPopup({ tipo: "erro", titulo: "Erro", texto: error?.response?.data?.message ?? "Falha ao excluir evento." });
    }
  }

  function montarHtmlTermoEmprestimo(logomarcaTermo = logomarcaRelatorio) {
    const evento = eventos.find((item) => String(item.id) === form.eventoId);
    const responsavel = responsaveis.find((item) => String(item.id) === form.responsavelId);
    const unidadeNome = unidadeRelatorio?.nome_fantasia || unidadeRelatorio?.razao_social || "---";
    const emitidoEm = formatarDataPtBr(dataLocalIso());
    const statusLabel = statusOpcoes.find((status) => status.value === form.status)?.label ?? form.status;
    const linhasItens = form.itens
      .map(
        (item, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${escaparHtmlRelatorio(item.nomeItem || `Item #${item.itemId}`)}</td>
            <td>${escaparHtmlRelatorio(item.numeroPatrimonio || "---")}</td>
            <td>${escaparHtmlRelatorio(item.tipoItem === "PATRIMONIO" ? "Patrimônio" : "Almoxarifado")}</td>
            <td>${escaparHtmlRelatorio(item.quantidade)}</td>
            <td>${escaparHtmlRelatorio(item.observacaoItem || "---")}</td>
          </tr>
        `
      )
      .join("");

    return `
      <section class="folha">
        <header class="topo">
          <div class="g3-topo-faixa">
            <span class="g3-topo-marca">G3N</span>
            <span class="g3-topo-selo">Empréstimos para eventos</span>
          </div>
          <div class="g3-topo-corpo">
            ${logomarcaTermo ? `<img src="${escaparHtmlRelatorio(logomarcaTermo)}" alt="Logomarca da instituição" class="g3-topo-logo" />` : ""}
            <div class="g3-topo-texto">
              <h1>${escaparHtmlRelatorio(nomeInstituicao)}</h1>
              <h2>Termo de empréstimo</h2>
              <p class="subtitulo">Controle institucional de reserva, retirada e devolução de itens para eventos.</p>
            </div>
          </div>
          <div class="meta-grid">
            <div class="meta-item"><strong>Código</strong><span>${escaparHtmlRelatorio(form.id ?? "---")}</span></div>
            <div class="meta-item"><strong>Status</strong><span>${escaparHtmlRelatorio(statusLabel)}</span></div>
            <div class="meta-item"><strong>Emitido em</strong><span>${escaparHtmlRelatorio(emitidoEm)}</span></div>
            <div class="meta-item"><strong>Unidade</strong><span>${escaparHtmlRelatorio(unidadeNome)}</span></div>
          </div>
        </header>

        <main class="corpo">
          <section class="bloco">
            <h3>Dados do evento</h3>
            <div class="info-grid">
              <div><strong>Evento</strong><span>${escaparHtmlRelatorio(evento?.titulo || "---")}</span></div>
              <div><strong>Local</strong><span>${escaparHtmlRelatorio(evento?.local || "---")}</span></div>
              <div><strong>Promovido por</strong><span>${escaparHtmlRelatorio(evento?.promovidoPor || "---")}</span></div>
              <div><strong>Período do evento</strong><span>${escaparHtmlRelatorio(`${fmt(form.dataRetiradaPrevista)} até ${fmt(form.dataDevolucaoPrevista)}`)}</span></div>
            </div>
          </section>

          <section class="bloco">
            <h3>Responsável pela retirada</h3>
            <div class="info-grid">
              <div><strong>Nome</strong><span>${escaparHtmlRelatorio(form.responsavelNome || responsavel?.nome || "---")}</span></div>
              <div><strong>Documento</strong><span>${escaparHtmlRelatorio(responsavel?.documento || "---")}</span></div>
              <div><strong>Telefone</strong><span>${escaparHtmlRelatorio(formatarTelefone(responsavel?.telefone) || responsavel?.telefone || "---")}</span></div>
              <div><strong>E-mail</strong><span>${escaparHtmlRelatorio(responsavel?.email || "---")}</span></div>
            </div>
          </section>

          <section class="bloco">
            <h3>Itens emprestados</h3>
            <div class="tabela-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Item</th>
                    <th>Número do patrimônio</th>
                    <th>Origem</th>
                    <th>Qtd.</th>
                    <th>Observação</th>
                  </tr>
                </thead>
                <tbody>
                  ${linhasItens || '<tr><td colspan="6" class="vazio">Nenhum item vinculado.</td></tr>'}
                </tbody>
              </table>
            </div>
          </section>

          <section class="bloco texto">
            <h3>Declaração e condições</h3>
            <p>Declaro receber os itens listados para uso exclusivo no evento informado, responsabilizando-me pela guarda, conservação e devolução no prazo combinado.</p>
            <p><strong>Observações do empréstimo:</strong> ${escaparHtmlRelatorio(form.observacoes || "---")}</p>
          </section>

          <section class="assinaturas">
            <div><span></span><strong>Responsável pela retirada</strong></div>
            <div><span></span><strong>Responsável interno pela entrega</strong></div>
          </section>
        </main>

        <footer class="rodape">
          <div>${escaparHtmlRelatorio(rodapeInstitucional.linha1)}</div>
          ${rodapeInstitucional.linha2 ? `<div>${escaparHtmlRelatorio(rodapeInstitucional.linha2)}</div>` : ""}
          ${rodapeInstitucional.linha3 ? `<div>${escaparHtmlRelatorio(rodapeInstitucional.linha3)}</div>` : ""}
          <div>Emitido em ${escaparHtmlRelatorio(emitidoEm)}</div>
        </footer>
      </section>
    `;
  }

  async function imprimirTermoEmprestimo() {
    let arquivoLogomarca: { url: string; revoke?: () => void } | null = null;
    let logomarcaTermo = logomarcaRelatorio;

    try {
      if (caminhoLogomarcaRelatorio) {
        try {
          arquivoLogomarca = await obterUrlArquivoAutenticado(caminhoLogomarcaRelatorio, { cache: false, auditar: false });
          logomarcaTermo = arquivoLogomarca.url || logomarcaRelatorio;
        } catch {
          logomarcaTermo = logomarcaRelatorio;
        }
      }

      imprimirHtmlSemJanela({
        titulo: `Termo de empréstimo #${form.id ?? ""}`,
        html: montarHtmlTermoEmprestimo(logomarcaTermo),
        tamanhoPagina: "A4 portrait",
        margemPagina: "7mm",
        paddingRaiz: "4px",
        estilosExtras: `
          * { box-sizing: border-box; }
          body { font-family: Arial, sans-serif; margin: 0; color: #0f172a; background: #fff; }
          .folha { padding: 0; }
          .topo { border: 1px solid #bbf7d0; border-radius: 8px; background: #ffffff; margin-bottom: 8px; overflow: hidden; }
          .g3-topo-faixa { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 6px 10px; background: #0f8a57; color: #ffffff; }
          .g3-topo-marca { font-size: 11px; font-weight: 700; letter-spacing: 0.06em; }
          .g3-topo-selo { border: 1px solid rgba(255,255,255,0.35); border-radius: 999px; padding: 2px 7px; font-size: 11px; font-weight: 600; background: rgba(255,255,255,0.12); }
          .g3-topo-corpo { display: grid; grid-template-columns: auto 1fr; align-items: center; gap: 10px; padding: 8px 10px; }
          .g3-topo-logo { width: 52px; height: 52px; object-fit: contain; border-radius: 8px; background: #ffffff; border: 1px solid #dbe7df; padding: 4px; }
          .g3-topo-texto { text-align: center; }
          h1 { margin: 0; font-size: 15px; font-weight: 700; color: #14532d; }
          h2 { margin: 2px 0 2px; font-size: 19px; line-height: 1; letter-spacing: 0.04em; text-transform: uppercase; color: #1f2937; font-weight: 800; }
          .subtitulo { margin: 0; font-size: 11px; color: #475569; }
          .meta-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 4px; padding: 0 10px 8px; }
          .meta-item, .info-grid > div { border: 1px solid #dbe7df; border-radius: 5px; background: #ffffff; padding: 4px 5px; min-height: 0; }
          .meta-item strong, .info-grid strong { display: block; margin-bottom: 1px; font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.03em; }
          .meta-item span, .info-grid span { font-size: 12px; color: #0f172a; line-height: 1.2; }
          .corpo { display: grid; gap: 6px; }
          .bloco { border: 1px solid #e2e8f0; border-radius: 7px; padding: 7px; background: #ffffff; break-inside: avoid; }
          h3 { margin: 0 0 5px; font-size: 12px; color: #14532d; text-transform: uppercase; letter-spacing: 0.04em; }
          .info-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px; }
          .tabela-wrap { overflow: hidden; border: 1px solid #dbe7df; border-radius: 6px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; line-height: 1.2; }
          th { background: #dcfce7; color: #14532d; text-align: left; padding: 3px 4px; border-bottom: 1px solid #bbf7d0; }
          td { padding: 2px 4px; border-bottom: 1px solid #e2e8f0; }
          tr:last-child td { border-bottom: 0; }
          .vazio { text-align: center; color: #64748b; padding: 8px; }
          .texto p { margin: 0 0 4px; font-size: 11px; line-height: 1.25; color: #334155; }
          .assinaturas { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 28px; padding: 22px 10px 2px; }
          .assinaturas span { display: block; border-top: 1px solid #0f172a; margin-bottom: 4px; }
          .assinaturas strong { display: block; text-align: center; font-size: 11px; color: #334155; }
          .rodape { margin-top: 7px; border-top: 1px solid #cbd5e1; padding-top: 5px; text-align: center; font-size: 9px; color: #475569; line-height: 1.2; }
          @media print { .folha { padding: 0; } .topo, .bloco { break-inside: avoid; } }
        `
      });
    } catch {
      window.print();
    }

    window.setTimeout(() => arquivoLogomarca?.revoke?.(), 60_000);
  }

  function imprimir() {
    try {
      if ((abaAtiva === "cadastro" || abaAtiva === "itens") && form.id) {
        void imprimirTermoEmprestimo();
        return;
      }

      imprimirConteudoAtual({ titulo: "Relatório de empréstimos" });
    } catch {
      window.print();
    }
  }

  function selecionarDiaAgenda(dataIso: string) {
    setAgendaDia(dataIso);
    if (dataIso < agendaInicio || dataIso > agendaFim) {
      setAgendaMes(inicioMesIso(dataIso));
    }
  }

  function abrirGoogleAgenda() {
    window.open("https://calendar.google.com/calendar/u/0/r", "_blank", "noopener,noreferrer");
  }

  function montarGoogleAgendaUrl(item: (typeof agendaDetalheOrdenada)[number]) {
    const inicio = formatarGoogleDateTime(item.periodo.retiradaPrevista);
    const fim = formatarGoogleDateTime(item.periodo.devolucaoPrevista || item.periodo.retiradaPrevista);
    const itens = item.itens
      .map((vinculo) => `${vinculo.quantidade}x ${vinculo.nomeItem || vinculo.numeroPatrimonio || `Item #${vinculo.itemId}`}`)
      .join("; ");
    const detalhes = [
      `Empréstimo #${item.emprestimoId}`,
      `Status: ${statusOpcoes.find((status) => status.value === item.status)?.label ?? item.status}`,
      item.responsavel?.nome ? `Responsável: ${item.responsavel.nome}` : undefined,
      itens ? `Itens: ${itens}` : undefined,
      "Registro gerado pelo G3-Next."
    ]
      .filter(Boolean)
      .join("\n");

    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: `Empréstimo para evento - ${item.evento.titulo}`,
      dates: `${inicio}/${fim}`,
      details: detalhes,
      location: item.evento.local ?? ""
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }

  function adicionarAoGoogleAgenda(item: (typeof agendaDetalheOrdenada)[number]) {
    window.open(montarGoogleAgendaUrl(item), "_blank", "noopener,noreferrer");
  }

  function buscarResponsavelDoEmprestimo(item: EmprestimoEvento) {
    const responsavelId = item.responsavel?.id ? String(item.responsavel.id) : "";
    if (!responsavelId) return null;
    return responsaveis.find((responsavel) => String(responsavel.id) === responsavelId) ?? null;
  }

  function montarEmprestimoAtual() {
    const evento = eventos.find((item) => String(item.id) === form.eventoId);
    if (!form.id || !evento) return null;
    return {
      id: form.id,
      evento,
      unidadeId: form.unidadeId ? Number(form.unidadeId) : null,
      responsavel: form.responsavelId || form.responsavelNome
        ? {
            id: form.responsavelId ? Number(form.responsavelId) : null,
            nome: form.responsavelNome || "Responsável"
          }
        : null,
      dataRetiradaPrevista: form.dataRetiradaPrevista,
      dataDevolucaoPrevista: form.dataDevolucaoPrevista,
      status: form.status,
      observacoes: form.observacoes,
      itens: form.itens
    } satisfies EmprestimoEvento;
  }

  function formatarItensMensagem(item: EmprestimoEvento) {
    return (item.itens ?? [])
      .map((vinculo) => {
        const nome = vinculo.nomeItem || `Item #${vinculo.itemId}`;
        const patrimonio = vinculo.numeroPatrimonio ? ` - patrimônio ${vinculo.numeroPatrimonio}` : "";
        return `- ${vinculo.quantidade}x ${nome}${patrimonio}`;
      })
      .join("\n");
  }

  function montarMensagemConfirmacao(item: EmprestimoEvento) {
    const itens = formatarItensMensagem(item);
    const observacoes = item.observacoes?.trim();
    return [
      `Olá, ${item.responsavel?.nome ?? "responsável"}.`,
      "",
      `${nomeInstituicao} confirma a reserva dos itens para o evento ${item.evento.titulo}.`,
      `Período do evento: ${fmt(item.dataRetiradaPrevista)} até ${fmt(item.dataDevolucaoPrevista)}.`,
      `Status da reserva: ${statusOpcoes.find((status) => status.value === item.status)?.label ?? item.status}.`,
      "",
      itens ? "Itens reservados:" : undefined,
      itens || undefined,
      observacoes ? "" : undefined,
      observacoes ? `Observações do empréstimo:\n${observacoes}` : undefined,
      "",
      "Os itens ficam reservados para a data informada. Em caso de alteração, entre em contato com a instituição."
    ]
      .filter((linha) => linha !== undefined)
      .join("\n");
  }

  function montarMensagemAtraso(item: EmprestimoEvento) {
    const itens = formatarItensMensagem(item);
    const observacoes = item.observacoes?.trim();
    return [
      `Olá, ${item.responsavel?.nome ?? "responsável"}.`,
      "",
      `${nomeInstituicao} informa que consta em aberto a devolução do empréstimo #${item.id ?? ""} do evento ${item.evento.titulo}.`,
      `A devolução prevista era ${fmt(item.dataDevolucaoPrevista)}.`,
      "",
      itens ? "Itens pendentes:" : undefined,
      itens || undefined,
      observacoes ? "" : undefined,
      observacoes ? `Observações do empréstimo:\n${observacoes}` : undefined,
      "",
      "Solicitamos confirmar a devolução dos itens ou entrar em contato com a instituição."
    ]
      .filter((linha) => linha !== undefined)
      .join("\n");
  }

  function enviarWhatsAppResponsavel(item: EmprestimoEvento, mensagem: string) {
    const responsavel = buscarResponsavelDoEmprestimo(item);
    const telefone = normalizarTelefone(responsavel?.telefone);
    if (telefone.length < 10) {
      setPopup({ tipo: "aviso", titulo: "Atenção", texto: "O responsável não possui telefone válido para WhatsApp." });
      return;
    }
    window.open(`https://wa.me/55${telefone}?text=${encodeURIComponent(mensagem)}`, "_blank", "noopener,noreferrer");
  }

  function enviarConfirmacaoWhatsApp(item: EmprestimoEvento) {
    enviarWhatsAppResponsavel(item, montarMensagemConfirmacao(item));
  }

  function enviarAlertaWhatsApp(item: EmprestimoEvento) {
    enviarWhatsAppResponsavel(item, montarMensagemAtraso(item));
  }

  async function enviarConfirmacaoEmail(item: EmprestimoEvento) {
    if (!item.id || confirmacaoEmailEmEnvio !== null) {
      return;
    }

    try {
      setConfirmacaoEmailEmEnvio(item.id);
      const envio = await emprestimosEventosService.enviarConfirmacaoReservaEmail(item.id);
      setPopup({
        tipo: "sucesso",
        titulo: "E-mail enviado",
        texto: `Confirmação de reserva enviada para ${envio.destinatario}.`
      });
    } catch (error: any) {
      setPopup({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Falha ao enviar e-mail pelo servidor do G3N."
      });
    } finally {
      setConfirmacaoEmailEmEnvio(null);
    }
  }

  async function confirmarEnvioConfirmacaoEmail() {
    if (!previewConfirmacaoEmail) return;
    const item = emprestimos.find((emprestimo) => emprestimo.id === previewConfirmacaoEmail.emprestimoId);
    if (!item) {
      setPopup({
        tipo: "erro",
        titulo: "Erro",
        texto: "Não foi possível localizar o empréstimo para envio."
      });
      return;
    }

    await enviarConfirmacaoEmail(item);
    setPreviewConfirmacaoEmail(null);
  }

  async function enviarAlertaEmail(item: EmprestimoEvento) {
    if (!item.id || alertaEmailEmEnvio !== null) {
      return;
    }

    try {
      setAlertaEmailEmEnvio(item.id);
      const envio = await emprestimosEventosService.enviarAlertaDevolucaoEmail(item.id);
      setPopup({
        tipo: "sucesso",
        titulo: "E-mail enviado",
        texto: `Alerta de devolução enviado para ${envio.destinatario}.`
      });
    } catch (error: any) {
      setPopup({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Falha ao enviar e-mail pelo servidor do G3N."
      });
    } finally {
      setAlertaEmailEmEnvio(null);
    }
  }

  const acoesPorAba: Record<AbaId, AdminAction[]> = {
    listagem: [
      { label: "Buscar empréstimos", icon: Search, onClick: () => setAbaAtiva("listagem"), variant: "outline" },
      { label: "Novo empréstimo", icon: Plus, onClick: novo, variant: "default", disabled: carregandoAcoes },
      { label: "Imprimir empréstimos", icon: Printer, onClick: imprimir, variant: "outline", disabled: carregandoAcoes },
      { label: "Fechar", icon: X, onClick: () => navigate("/dashboard/visao-geral"), variant: "outline" }
    ],
    cadastro: [
      { label: "Novo empréstimo", icon: Plus, onClick: novo, variant: "default", disabled: carregandoAcoes },
      { label: "Salvar dados do empréstimo", icon: Save, onClick: () => void salvar(), variant: "default", disabled: carregandoAcoes },
      { label: "Cancelar edição", icon: Undo2, onClick: () => setForm(snapshot), variant: "outline", disabled: carregandoAcoes },
      { label: "Excluir empréstimo", icon: Trash2, onClick: excluir, variant: "danger", disabled: carregandoAcoes },
      { label: "Imprimir termo de empréstimo", icon: Printer, onClick: imprimir, variant: "outline", disabled: carregandoAcoes },
      { label: "Fechar", icon: X, onClick: () => navigate("/dashboard/visao-geral"), variant: "outline" }
    ],
    itens: [
      { label: "Novo empréstimo", icon: Plus, onClick: novo, variant: "default", disabled: carregandoAcoes },
      { label: "Salvar empréstimo com itens", icon: Save, onClick: () => void salvar(), variant: "default", disabled: carregandoAcoes },
      { label: "Cancelar edição", icon: Undo2, onClick: () => setForm(snapshot), variant: "outline", disabled: carregandoAcoes },
      { label: "Excluir empréstimo", icon: Trash2, onClick: excluir, variant: "danger", disabled: carregandoAcoes },
      { label: "Imprimir termo de empréstimo", icon: Printer, onClick: imprimir, variant: "outline", disabled: carregandoAcoes },
      { label: "Fechar", icon: X, onClick: () => navigate("/dashboard/visao-geral"), variant: "outline" }
    ],
    agenda: [
      { label: "Buscar agenda de empréstimos", icon: Search, onClick: () => setAbaAtiva("agenda"), variant: "outline" },
      { label: "Imprimir agenda de empréstimos", icon: Printer, onClick: imprimir, variant: "outline", disabled: carregandoAcoes },
      { label: "Fechar", icon: X, onClick: () => navigate("/dashboard/visao-geral"), variant: "outline" }
    ],
    eventos: [
      { label: "Novo evento", icon: Plus, onClick: () => setEventoForm(defaultEvento), variant: "default", disabled: carregandoAcoes },
      { label: "Salvar evento", icon: Save, onClick: () => void salvarEvento(), variant: "default", disabled: carregandoAcoes },
      { label: "Cancelar evento", icon: Undo2, onClick: () => setEventoForm(defaultEvento), variant: "outline", disabled: carregandoAcoes },
      { label: "Excluir evento", icon: Trash2, onClick: excluirEvento, variant: "danger", disabled: carregandoAcoes },
      { label: "Imprimir eventos", icon: Printer, onClick: imprimir, variant: "outline", disabled: carregandoAcoes },
      { label: "Fechar", icon: X, onClick: () => navigate("/dashboard/visao-geral"), variant: "outline" }
    ],
    responsaveis: [
      { label: "Novo responsável", icon: Plus, onClick: () => setResponsavelForm(defaultResponsavel), variant: "default", disabled: carregandoAcoes },
      { label: "Salvar responsável", icon: Save, onClick: () => void salvarResponsavel(), variant: "default", disabled: carregandoAcoes },
      { label: "Cancelar responsável", icon: Undo2, onClick: () => setResponsavelForm(defaultResponsavel), variant: "outline", disabled: carregandoAcoes },
      { label: "Excluir responsável", icon: Trash2, onClick: excluirResponsavel, variant: "danger", disabled: carregandoAcoes },
      { label: "Imprimir responsáveis", icon: Printer, onClick: imprimir, variant: "outline", disabled: carregandoAcoes },
      { label: "Fechar", icon: X, onClick: () => navigate("/dashboard/visao-geral"), variant: "outline" }
    ]
  };

  const acoes = acoesPorAba[abaAtiva];
  const emprestimoAtual = montarEmprestimoAtual();
  const enviandoPreviewConfirmacaoEmail =
    previewConfirmacaoEmail ? confirmacaoEmailEmEnvio === previewConfirmacaoEmail.emprestimoId : false;

  return (
    <>
      <AdminPageLayout tabs={abas} activeTab={abaAtiva} onChangeTab={(id) => setAbaAtiva(id as AbaId)} actions={acoes} sectionLabel="Administração e gestão" pageTitle={tituloTela} activeTitle={abas.find((a) => a.id === abaAtiva)?.label} codeBadge={form.id ? `Código: ${form.id}` : "Novo"}>
        {emprestimosVencidosSemDevolucao.length ? (
          <section className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-950">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Bell className="h-4 w-4" />
              Alerta de devolução vencida
            </div>
            <div className="mt-3 space-y-2">
              {emprestimosVencidosSemDevolucao.map((item) => {
                const responsavel = buscarResponsavelDoEmprestimo(item);
                return (
                  <div key={item.id} className="grid gap-2 rounded-md border border-red-200 bg-white/70 p-2 text-xs md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                    <div>
                      <p className="font-semibold">Empréstimo #{item.id} - {item.evento.titulo}</p>
                      <p>Responsável: {item.responsavel?.nome ?? "Não informado"} | Devolução prevista: {fmt(item.dataDevolucaoPrevista)}</p>
                      <p className="text-red-700">Status: devolução não confirmada{responsavel ? "" : " | responsável sem cadastro vinculado"}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => enviarAlertaWhatsApp(item)}>
                        <MessageCircle className="mr-1.5 h-4 w-4" />
                        WhatsApp
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={alertaEmailEmEnvio !== null}
                        onClick={() => void enviarAlertaEmail(item)}
                      >
                        {alertaEmailEmEnvio === item.id ? (
                          <LoaderCircle className="mr-1.5 h-4 w-4 animate-spin" />
                        ) : (
                          <Mail className="mr-1.5 h-4 w-4" />
                        )}
                        {alertaEmailEmEnvio === item.id ? "Enviando..." : "E-mail"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        {abaAtiva === "listagem" ? (
          <section className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <div className="space-y-1"><Label>Período inicial</Label><Input type="date" value={fInicio} onChange={(e) => setFInicio(e.target.value)} /></div>
              <div className="space-y-1"><Label>Período final</Label><Input type="date" value={fFim} onChange={(e) => setFFim(e.target.value)} /></div>
              <div className="space-y-1"><Label>Status</Label><Select value={fStatus} onChange={(e) => setFStatus(e.target.value)}><option value="">Todos</option>{statusOpcoes.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</Select></div>
              <div className="space-y-1 xl:col-span-2"><Label>Evento</Label><Select value={fEvento} onChange={(e) => setFEvento(e.target.value)}><option value="">Todos</option>{eventos.map((e) => <option key={e.id} value={e.id}>{e.titulo}</option>)}</Select></div>
            </div>
            <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
              <table className="min-w-full text-sm"><thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]"><tr><th className="px-3 py-2 text-left">Código</th><th className="px-3 py-2 text-left">Evento</th><th className="px-3 py-2 text-left">Retirada</th><th className="px-3 py-2 text-left">Devolução</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2 text-left">Itens</th><th className="px-3 py-2 text-right">Ações</th></tr></thead>
                <tbody>{carregandoEmprestimos ? <tr><td colSpan={7} className="px-3 py-4 text-center">Carregando empréstimos...</td></tr> : emprestimos.length ? emprestimos.map((item) => <tr key={item.id} className={`border-t border-[var(--g3-border)] transition hover:brightness-[0.98] ${classesLinhaStatusEmprestimo[item.status] ?? "bg-[var(--g3-card)]"}`}><td className="px-3 py-2">{item.id}</td><td className="px-3 py-2 font-medium">{item.evento.titulo}</td><td className="px-3 py-2">{fmt(item.dataRetiradaPrevista)}</td><td className="px-3 py-2">{fmt(item.dataDevolucaoPrevista)}</td><td className="px-3 py-2">{item.status}</td><td className="px-3 py-2">{item.itens?.length ?? 0}</td><td className="px-3 py-2 text-right"><Button variant="outline" size="sm" onClick={() => selecionarEmprestimo(item)}>Selecionar</Button></td></tr>) : <tr><td colSpan={7} className="px-3 py-4 text-center">Nenhum empréstimo encontrado.</td></tr>}</tbody>
              </table>
            </div>
          </section>
        ) : null}

        {abaAtiva === "cadastro" ? (
          <section className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-1 xl:col-span-2"><Label>Evento *</Label><Select value={form.eventoId} onChange={(e) => setForm((a) => ({ ...a, eventoId: e.target.value }))}><option value="">Selecione</option>{eventos.map((e) => <option key={e.id} value={e.id}>{e.titulo}</option>)}</Select></div>
              <div className="space-y-1"><Label>Status</Label><Select value={form.status} onChange={(e) => setForm((a) => ({ ...a, status: e.target.value as StatusEmprestimoEvento }))}>{statusOpcoes.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</Select></div>
              <div className="space-y-1"><Label>Unidade</Label><Select value={form.unidadeId} onChange={(e) => setForm((a) => ({ ...a, unidadeId: e.target.value }))}><option value="">Selecione</option>{unidades.map((u) => <option key={u.id_unidade} value={u.id_unidade}>{u.nome_fantasia}</option>)}</Select></div>
              <div className="space-y-1 xl:col-span-2">
                <Label>Responsável</Label>
                <Select
                  value={form.responsavelId}
                  onChange={(e) => {
                    const responsavel = responsaveis.find((item) => String(item.id) === e.target.value);
                    setForm((atual) => ({
                      ...atual,
                      responsavelId: e.target.value,
                      responsavelNome: responsavel?.nome ?? ""
                    }));
                  }}
                >
                  <option value="">Selecione</option>
                  {responsaveis.map((responsavel) => (
                    <option key={responsavel.id} value={responsavel.id}>{responsavel.nome}</option>
                  ))}
                </Select>
                <p className="text-xs text-[var(--g3-muted)]">Cadastre ou edite nomes na aba Responsáveis.</p>
              </div>
              <div className="space-y-1"><Label>Início do evento</Label><Input type="datetime-local" value={form.dataRetiradaPrevista} onChange={(e) => setForm((a) => ({ ...a, dataRetiradaPrevista: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Fim do evento</Label><Input type="datetime-local" value={form.dataDevolucaoPrevista} onChange={(e) => setForm((a) => ({ ...a, dataDevolucaoPrevista: e.target.value }))} /></div>
              <div className="space-y-1 md:col-span-2 xl:col-span-4"><Label>Observações</Label><Textarea rows={2} value={form.observacoes} onChange={(e) => setForm((a) => ({ ...a, observacoes: e.target.value }))} /></div>
            </div>
            <Card className="border-[var(--g3-border)]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Ações rápidas</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  disabled={!form.id || form.status !== "RASCUNHO"}
                  onClick={() => void confirmarStatus("RESERVA")}
                >
                  Confirmar reserva
                </Button>
                <Button
                  variant="outline"
                  disabled={!form.id || form.status !== "AGENDADO"}
                  onClick={() => void confirmarStatus("RETIRADA")}
                >
                  Itens retirados
                </Button>
                <Button
                  variant="outline"
                  disabled={!form.id || form.status !== "RETIRADO"}
                  onClick={() => void confirmarStatus("DEVOLUCAO")}
                >
                  Itens devolvidos
                </Button>
                <Button
                  variant="outline"
                  disabled={!emprestimoAtual || form.status !== "AGENDADO" || confirmacaoEmailEmEnvio !== null}
                  onClick={() => emprestimoAtual && enviarConfirmacaoWhatsApp(emprestimoAtual)}
                >
                  <MessageCircle className="mr-1.5 h-4 w-4" />
                  Confirmar por WhatsApp
                </Button>
                <Button
                  variant="outline"
                  disabled={!emprestimoAtual || form.status !== "AGENDADO" || confirmacaoEmailEmEnvio !== null}
                  onClick={() => emprestimoAtual && void abrirPreviewConfirmacaoEmail(emprestimoAtual)}
                >
                  {confirmacaoEmailEmEnvio === form.id ? (
                    <LoaderCircle className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="mr-1.5 h-4 w-4" />
                  )}
                  Confirmar por e-mail
                </Button>
                <Button
                  variant="danger"
                  disabled={!form.id || form.status === "DEVOLVIDO" || form.status === "CANCELADO"}
                  onClick={() => void confirmarStatus("CANCELAR")}
                >
                  Cancelar empréstimo
                </Button>
              </CardContent>
            </Card>
          </section>
        ) : null}

        {abaAtiva === "itens" ? (
          <section className="space-y-3">
            <div className="grid gap-3 rounded-lg border border-[var(--g3-border)] p-3 md:grid-cols-2 xl:grid-cols-[0.8fr_1.2fr_2.2fr_0.6fr_1.8fr_auto]">
              <div className="space-y-1"><Label>Tipo</Label><Select value={itemTipo} onChange={(e) => { setItemTipo(e.target.value as TipoItemEmprestimo); setItemId(""); setItemBusca(""); setPatrimoniosAlmoxSelecionados([]); }}><option value="PATRIMONIO">Patrimônio</option><option value="ALMOXARIFADO">Almoxarifado</option></Select></div>
              <div className="space-y-1">
                <Label>Unidade</Label>
                <Select
                  value={itemUnidadeFiltro}
                  onChange={(e) => {
                    setItemUnidadeFiltro(e.target.value);
                    setItemId("");
                    setItemBusca("");
                  }}
                  disabled={itemTipo !== "PATRIMONIO"}
                >
                  <option value="">Todas as unidades</option>
                  {unidades.map((unidade) => (
                    <option key={unidade.id_unidade} value={String(unidade.id_unidade)}>
                      {unidade.nome_fantasia ?? unidade.razao_social ?? String(unidade.id_unidade)}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1"><Label>Item ou patrimônio</Label><Input list="emprestimo-eventos-itens" value={itemBusca} onChange={(e) => atualizarBuscaItem(e.target.value)} placeholder="Digite o item ou o número do patrimônio" /><datalist id="emprestimo-eventos-itens">{opcoesItemFiltradas.map((i) => <option key={i.id} value={i.label} />)}</datalist></div>
              <div className="space-y-1"><Label>Quantidade</Label><Input type="number" min={1} value={itemQtd} onChange={(e) => setItemQtd(e.target.value)} className="max-w-[96px]" /></div>
              <div className="space-y-1"><Label>Observação</Label><Input value={itemObs} onChange={(e) => setItemObs(e.target.value)} placeholder="Observação do item" /></div>
              <div className="flex items-end"><Button className="w-full" onClick={() => void adicionarItem()}>Adicionar item</Button></div>
            </div>
            {exibirSelecaoPatrimonios ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold">
                      {itemTipo === "ALMOXARIFADO" && itemAlmoxSelecionado
                        ? `Selecione os patrimônios de ${itemAlmoxSelecionado.descricao}`
                        : "Selecione os patrimônios"}
                    </p>
                    <p className="text-xs text-amber-800">Marcados: {patrimoniosAlmoxSelecionados.length} de {Number(itemQtd) || 0}. Cada patrimônio será lançado como uma linha no termo.</p>
                  </div>
                </div>
                <div className="mt-3 max-h-72 overflow-auto rounded-md border border-amber-200 bg-white">
                  <table className="min-w-full text-xs">
                    <thead className="bg-amber-100 text-amber-950">
                      <tr>
                        <th className="w-12 px-2 py-2 text-left">Sel.</th>
                        <th className="px-2 py-2 text-left">Patrimônio</th>
                        <th className="px-2 py-2 text-left">Unidade</th>
                        <th className="px-2 py-2 text-left">Item</th>
                        <th className="px-2 py-2 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {patrimoniosParaSelecao.length ? patrimoniosParaSelecao.map((patrimonio) => {
                        const id = String(patrimonio.idPatrimonio);
                        const jaVinculado = form.itens.some((item) => item.tipoItem === "PATRIMONIO" && String(item.itemId) === id);
                        const indisponivel = jaVinculado || normalizarBuscaTexto(patrimonio.status).includes("emprest");
                        const marcado = patrimoniosAlmoxSelecionados.includes(id);
                        return (
                          <tr key={id} className="border-t border-amber-100">
                            <td className="px-2 py-2">
                              <input
                                type="checkbox"
                                checked={marcado}
                                disabled={indisponivel}
                                onChange={(event) => {
                                  setPatrimoniosAlmoxSelecionados((atual) =>
                                    event.target.checked
                                      ? [...atual, id]
                                      : atual.filter((item) => item !== id)
                                  );
                                }}
                                aria-label={`Selecionar patrimônio ${patrimonio.numeroPatrimonio}`}
                              />
                            </td>
                            <td className="px-2 py-2 font-semibold">{patrimonio.numeroPatrimonio}</td>
                            <td className="px-2 py-2">{patrimonio.unidade || "---"}</td>
                            <td className="px-2 py-2">{patrimonio.nome}</td>
                            <td className="px-2 py-2">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                  indisponivel
                                    ? "bg-slate-100 text-slate-700"
                                    : "bg-emerald-100 text-emerald-800"
                                }`}
                              >
                                {indisponivel ? "Indisponível para empréstimo" : "Disponível para empréstimo"}
                              </span>
                            </td>
                          </tr>
                        );
                      }) : (
                        <tr><td colSpan={5} className="px-3 py-4 text-center">Nenhum patrimônio encontrado para selecionar.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
            <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
              <table className="min-w-full text-sm"><thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]"><tr><th className="px-3 py-2 text-left">Tipo</th><th className="px-3 py-2 text-left">Item</th><th className="px-3 py-2 text-left">Patrimônio</th><th className="px-3 py-2 text-left">Quantidade</th><th className="px-3 py-2 text-left">Observação</th><th className="px-3 py-2 text-right">Ações</th></tr></thead>
                <tbody>{form.itens.length ? form.itens.map((i, idx) => <tr key={`${i.tipoItem}-${i.itemId}-${idx}`} className={`border-t border-[var(--g3-border)] ${idx % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35"}`}><td className="px-3 py-2">{i.tipoItem}</td><td className="px-3 py-2">{i.nomeItem || `#${i.itemId}`}</td><td className="px-3 py-2">{i.numeroPatrimonio || "---"}</td><td className="px-3 py-2">{i.quantidade}</td><td className="px-3 py-2">{i.observacaoItem || "---"}</td><td className="px-3 py-2 text-right"><Button variant="danger" size="sm" onClick={() => removerItem(idx)}>Remover</Button></td></tr>) : <tr><td colSpan={6} className="px-3 py-4 text-center">Nenhum item adicionado.</td></tr>}</tbody>
              </table>
            </div>
          </section>
        ) : null}

        {abaAtiva === "agenda" ? (
          <section className="space-y-4">
            <div className="flex flex-col gap-3 rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card)] p-3 md:flex-row md:items-end md:justify-between">
              <div className="space-y-1">
                <Label>Mês da agenda</Label>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setAgendaMes((atual) => alterarMes(atual, -1))} title="Mês anterior" aria-label="Mês anterior">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="min-w-[190px] rounded-md border border-[var(--g3-border)] bg-white px-3 py-2 text-center text-sm font-semibold text-[var(--g3-foreground)]">
                    {tituloMesAgenda}
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => setAgendaMes((atual) => alterarMes(atual, 1))} title="Próximo mês" aria-label="Próximo mês">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto] md:min-w-[520px]">
                <div className="space-y-1">
                  <Label>Dia selecionado</Label>
                  <Input type="date" value={agendaDia} onChange={(e) => selecionarDiaAgenda(e.target.value)} />
                </div>
                <div className="flex items-end">
                  <Button type="button" variant="outline" className="w-full" onClick={() => selecionarDiaAgenda(dataLocalIso())}>
                    Hoje
                  </Button>
                </div>
                <div className="flex items-end">
                  <Button type="button" variant="outline" className="w-full" onClick={abrirGoogleAgenda}>
                    <ExternalLink className="mr-1.5 h-4 w-4" />
                    Google Agenda
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-950">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase text-emerald-700"><CheckCircle2 className="h-4 w-4" />Dias livres</div>
                <p className="mt-2 text-2xl font-semibold">{diasLivres}</p>
                <p className="text-xs text-emerald-700">Sem compromisso no mês exibido</p>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-950">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase text-amber-700"><Clock className="h-4 w-4" />Dias de apoio</div>
                <p className="mt-2 text-2xl font-semibold">{diasApoio}</p>
                <p className="text-xs text-amber-700">Retirada ou devolução sugerida</p>
              </div>
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-950">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase text-red-700"><AlertTriangle className="h-4 w-4" />Dias ocupados</div>
                <p className="mt-2 text-2xl font-semibold">{diasOcupados}</p>
                <p className="text-xs text-red-700">Dias do evento com item reservado</p>
              </div>
              <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sky-950">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase text-sky-700"><PackageCheck className="h-4 w-4" />Compromissos</div>
                <p className="mt-2 text-2xl font-semibold">{compromissosAtivos.length}</p>
                <p className="text-xs text-sky-700">Rascunhos, agendados ou retirados</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-950">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-600"><CalendarPlus className="h-4 w-4" />Liberados</div>
                <p className="mt-2 text-2xl font-semibold">{compromissosLiberados.length}</p>
                <p className="text-xs text-slate-600">Devolvidos ou cancelados no mês</p>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.85fr)]">
              <div className="overflow-hidden rounded-lg border border-[var(--g3-border)] bg-white">
                <div className="grid grid-cols-7 border-b border-[var(--g3-border)] bg-[var(--g3-primary-soft)] text-center text-xs font-semibold text-[var(--g3-active)]">
                  {nomesDiasSemana.map((dia) => <div key={dia} className="px-2 py-2">{dia}</div>)}
                </div>
                <div className="grid grid-cols-7">
                  {diasAgenda.map((dia) => {
                    const classeStatus = dia.qtdEmprestimos
                      ? "border-red-300 bg-red-50 text-red-950"
                      : dia.qtdApoios
                        ? "border-amber-300 bg-amber-50 text-amber-950"
                      : "border-emerald-100 bg-emerald-50/55 text-emerald-900";
                    return (
                      <button
                        key={dia.dataIso}
                        type="button"
                        onClick={() => selecionarDiaAgenda(dia.dataIso)}
                        className={`min-h-[108px] border-b border-r p-2 text-left transition hover:bg-[var(--g3-primary-soft)] ${dia.dentroDoMes ? classeStatus : "bg-slate-50 text-slate-400"} ${dia.selecionado ? "ring-2 ring-inset ring-[var(--g3-primary)]" : ""}`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${dia.hoje ? "bg-[var(--g3-primary)] text-white" : ""}`}>
                            {dia.dia}
                          </span>
                          {dia.qtdEmprestimos || dia.qtdApoios ? (
                            <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-semibold shadow-sm">
                              {dia.qtdEmprestimos || dia.qtdApoios}
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-3 space-y-1 text-xs">
                          {dia.qtdEmprestimos ? (
                            <>
                              <div className="flex items-center gap-1 font-semibold"><Clock className="h-3.5 w-3.5" />(X) ocupado</div>
                              <div>Evento com item reservado</div>
                            </>
                          ) : dia.qtdApoios ? (
                            <>
                              <div className="flex items-center gap-1 font-semibold"><Clock className="h-3.5 w-3.5" />Apoio</div>
                              <div>Retirada ou devolução</div>
                            </>
                          ) : dia.dentroDoMes ? (
                            <div className="flex items-center gap-1 font-medium"><CheckCircle2 className="h-3.5 w-3.5" />Liberado</div>
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-lg border border-[var(--g3-border)] bg-white p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase text-[var(--g3-muted)]">Dia selecionado</p>
                      <h3 className="text-base font-semibold text-[var(--g3-foreground)]">{formatarDataPtBr(agendaDia)}</h3>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${agendaResumoPorData.get(agendaDia)?.qtdEmprestimos ? "bg-red-100 text-red-800" : agendaResumoPorData.get(agendaDia)?.qtdApoios ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
                      {agendaResumoPorData.get(agendaDia)?.qtdEmprestimos ? "(X) ocupado" : agendaResumoPorData.get(agendaDia)?.qtdApoios ? "Apoio" : "Liberado"}
                    </span>
                  </div>
                </div>

                {agendaDetalheOrdenada.length ? agendaDetalheOrdenada.map((item) => {
                  const bloqueado = !["DEVOLVIDO", "CANCELADO"].includes(item.status);
                  const tipoDia = item.tipoDia ?? "EVENTO";
                  const rotuloTipoDia = tipoDia === "RETIRADA" ? "Retirada" : tipoDia === "DEVOLUCAO" ? "Devolução" : "Evento";
                  return (
                    <div key={`${item.emprestimoId}-${tipoDia}`} className={`rounded-lg border p-3 ${tipoDia === "EVENTO" && bloqueado ? "border-red-200 bg-red-50" : tipoDia !== "EVENTO" ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase text-slate-600">Empréstimo #{item.emprestimoId}</p>
                          <h4 className="text-sm font-semibold text-slate-950">{item.evento.titulo}</h4>
                          <p className="mt-1 text-xs text-slate-600">{item.evento.local || "Local não informado"}</p>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tipoDia === "EVENTO" && bloqueado ? "bg-red-200 text-red-900" : tipoDia !== "EVENTO" ? "bg-amber-200 text-amber-900" : "bg-emerald-200 text-emerald-900"}`}>
                          {rotuloTipoDia}
                        </span>
                      </div>
                      <div className="mt-3 grid gap-2 text-xs text-slate-700 sm:grid-cols-3">
                        <div className="rounded-md bg-white/70 p-2"><strong>Retirada:</strong><br />{fmt(item.periodo.retiradaApoio || item.periodo.retiradaPrevista)}</div>
                        <div className="rounded-md bg-white/70 p-2"><strong>Evento:</strong><br />{fmt(item.periodo.eventoInicio || item.periodo.retiradaPrevista)} até {fmt(item.periodo.eventoFim || item.periodo.devolucaoPrevista)}</div>
                        <div className="rounded-md bg-white/70 p-2"><strong>Devolução:</strong><br />{fmt(item.periodo.devolucaoApoio || item.periodo.devolucaoPrevista)}</div>
                      </div>
                      <div className="mt-3 space-y-1 text-xs text-slate-700">
                        <p><strong>Status:</strong> {statusOpcoes.find((status) => status.value === item.status)?.label ?? item.status}</p>
                        <p><strong>Responsável:</strong> {item.responsavel?.nome ?? "Não informado"}</p>
                        <p><strong>Itens:</strong> {item.itens.length ? item.itens.map((vinculo) => `${vinculo.quantidade}x ${vinculo.nomeItem || `#${vinculo.itemId}`}${vinculo.numeroPatrimonio ? ` (${vinculo.numeroPatrimonio})` : ""}`).join("; ") : "Nenhum item vinculado"}</p>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => adicionarAoGoogleAgenda(item)}>
                          <CalendarPlus className="mr-1.5 h-4 w-4" />
                          Adicionar ao Google Agenda
                        </Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => {
                          const emprestimo = emprestimos.find((registro) => registro.id === item.emprestimoId);
                          if (emprestimo) selecionarEmprestimo(emprestimo);
                        }}>
                          Abrir empréstimo
                        </Button>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                    <div className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-4 w-4" />Dia liberado</div>
                    <p className="mt-1 text-xs">Não há retirada ou devolução prevista para esta data.</p>
                  </div>
                )}

                {agendaResumoPorData.get(agendaDia)?.temBloqueio ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                    <div className="flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4" />Atenção à disponibilidade</div>
                    <p className="mt-1">Este dia possui itens comprometidos por empréstimos ativos. Revise os itens antes de criar novo compromisso.</p>
                  </div>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}

        {abaAtiva === "eventos" ? (
          <section className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-1 xl:col-span-2"><Label>Título</Label><Input value={eventoForm.titulo} onChange={(e) => setEventoForm((a) => ({ ...a, titulo: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Status</Label><Select value={eventoForm.status} onChange={(e) => setEventoForm((a) => ({ ...a, status: e.target.value }))}>{eventoCatalogoStatusOpcoes.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</Select></div>
              <div className="space-y-1 md:col-span-2 xl:col-span-2"><Label>Local padrão</Label><Input value={eventoForm.local} onChange={(e) => setEventoForm((a) => ({ ...a, local: e.target.value }))} /></div>
              <div className="space-y-1 md:col-span-2 xl:col-span-2"><Label>Promovido por</Label><Input value={eventoForm.promovidoPor} onChange={(e) => setEventoForm((a) => ({ ...a, promovidoPor: e.target.value }))} /></div>
              <div className="space-y-1 md:col-span-2 xl:col-span-4"><p className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900">Este cadastro é um catálogo fixo de eventos para reutilizar nos empréstimos. Informe as datas somente em Dados do empréstimo.</p></div>
              <div className="space-y-1 md:col-span-2 xl:col-span-4"><Label>Descrição</Label><Textarea rows={2} value={eventoForm.descricao} onChange={(e) => setEventoForm((a) => ({ ...a, descricao: e.target.value }))} /></div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap"><Button onClick={() => void salvarEvento()} disabled={salvarEventoMutation.isPending}>Salvar evento</Button><Button variant="outline" onClick={() => setEventoForm(defaultEvento)}>Novo evento</Button><Button variant="danger" onClick={excluirEvento} disabled={!eventoForm.id}>Excluir evento</Button></div>
            <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]"><table className="min-w-full text-sm"><thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]"><tr><th className="px-3 py-2 text-left">Título</th><th className="px-3 py-2 text-left">Promovido por</th><th className="px-3 py-2 text-left">Local padrão</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2 text-left">Descrição</th><th className="px-3 py-2 text-right">Ações</th></tr></thead><tbody>{eventos.length ? eventos.map((e, i) => { const eventoAtivo = e.status !== "INATIVO"; return <tr key={e.id} className={`border-t border-[var(--g3-border)] ${i % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35"}`}><td className={`px-3 py-2 font-medium ${eventoAtivo ? "bg-emerald-50 text-emerald-950" : "bg-red-50 text-red-950"}`}>{e.titulo}</td><td className="px-3 py-2">{e.promovidoPor || "---"}</td><td className="px-3 py-2">{e.local || "---"}</td><td className="px-3 py-2">{eventoAtivo ? "Ativo" : "Inativo"}</td><td className="px-3 py-2">{e.descricao || "---"}</td><td className="px-3 py-2 text-right"><Button variant="outline" size="sm" onClick={() => setEventoForm({ id: e.id, titulo: e.titulo, descricao: e.descricao ?? "", local: e.local ?? "", promovidoPor: e.promovidoPor ?? "", status: e.status || "ATIVO" })}>Selecionar</Button></td></tr>; }) : <tr><td colSpan={6} className="px-3 py-4 text-center">Nenhum evento cadastrado.</td></tr>}</tbody></table></div>
          </section>
        ) : null}

        {abaAtiva === "responsaveis" ? (
          <section className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-1 xl:col-span-2"><Label>Nome do responsável</Label><Input value={responsavelForm.nome} onChange={(e) => setResponsavelForm((a) => ({ ...a, nome: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Documento</Label><Input value={responsavelForm.documento} onChange={(e) => setResponsavelForm((a) => ({ ...a, documento: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Telefone</Label><Input value={responsavelForm.telefone} onChange={(e) => setResponsavelForm((a) => ({ ...a, telefone: e.target.value }))} /></div>
              <div className="space-y-1 xl:col-span-2"><Label>E-mail</Label><Input value={responsavelForm.email} onChange={(e) => setResponsavelForm((a) => ({ ...a, email: e.target.value }))} /></div>
              <div className="space-y-1 md:col-span-2 xl:col-span-4"><Label>Observações</Label><Textarea rows={3} value={responsavelForm.observacoes} onChange={(e) => setResponsavelForm((a) => ({ ...a, observacoes: e.target.value }))} /></div>
            </div>
            <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
              <table className="min-w-full text-sm"><thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]"><tr><th className="px-3 py-2 text-left">Nome</th><th className="px-3 py-2 text-left">Documento</th><th className="px-3 py-2 text-left">Telefone</th><th className="px-3 py-2 text-left">E-mail</th><th className="px-3 py-2 text-right">Ações</th></tr></thead>
                <tbody>{responsaveis.length ? responsaveis.map((item, i) => <tr key={item.id} className={`border-t border-[var(--g3-border)] ${i % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35"}`}><td className="px-3 py-2 font-medium">{item.nome}</td><td className="px-3 py-2">{item.documento || "---"}</td><td className="px-3 py-2">{item.telefone || "---"}</td><td className="px-3 py-2">{item.email || "---"}</td><td className="px-3 py-2 text-right"><Button variant="outline" size="sm" onClick={() => selecionarResponsavel(item)}>Selecionar</Button></td></tr>) : <tr><td colSpan={5} className="px-3 py-4 text-center">Nenhum responsável cadastrado.</td></tr>}</tbody>
              </table>
            </div>
          </section>
        ) : null}

        <section id="emprestimo-eventos-termo" className="pointer-events-none absolute -left-[99999px] top-0 w-[210mm] bg-white p-6">
          <div className="space-y-6 text-sm text-[var(--g3-foreground)]">
            <div className="space-y-1 text-center">
              <h1 className="text-xl font-semibold">Termo de empréstimo para eventos</h1>
              <p>Controle institucional de empréstimo de itens</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="border-[var(--g3-border)]"><CardHeader className="pb-2"><CardTitle className="text-sm">Dados do empréstimo</CardTitle></CardHeader><CardContent className="space-y-1 text-sm"><p><strong>Código:</strong> {form.id ?? "---"}</p><p><strong>Evento:</strong> {eventos.find((e) => String(e.id) === form.eventoId)?.titulo || "---"}</p><p><strong>Unidade:</strong> {unidades.find((u) => String(u.id_unidade) === form.unidadeId)?.nome_fantasia || "---"}</p><p><strong>Status:</strong> {statusOpcoes.find((s) => s.value === form.status)?.label || form.status}</p><p><strong>Retirada prevista:</strong> {fmt(form.dataRetiradaPrevista)}</p><p><strong>Devolução prevista:</strong> {fmt(form.dataDevolucaoPrevista)}</p></CardContent></Card>
              <Card className="border-[var(--g3-border)]"><CardHeader className="pb-2"><CardTitle className="text-sm">Responsável pela retirada</CardTitle></CardHeader><CardContent className="space-y-1 text-sm"><p><strong>Nome:</strong> {form.responsavelNome || "---"}</p><p><strong>Documento:</strong> {responsaveis.find((item) => String(item.id) === form.responsavelId)?.documento || "---"}</p><p><strong>Telefone:</strong> {responsaveis.find((item) => String(item.id) === form.responsavelId)?.telefone || "---"}</p><p><strong>E-mail:</strong> {responsaveis.find((item) => String(item.id) === form.responsavelId)?.email || "---"}</p></CardContent></Card>
            </div>
            <Card className="border-[var(--g3-border)]"><CardHeader className="pb-2"><CardTitle className="text-sm">Itens vinculados</CardTitle></CardHeader><CardContent><table className="min-w-full text-sm"><thead><tr><th className="border-b px-2 py-2 text-left">Tipo</th><th className="border-b px-2 py-2 text-left">Item</th><th className="border-b px-2 py-2 text-left">Patrimônio</th><th className="border-b px-2 py-2 text-left">Quantidade</th><th className="border-b px-2 py-2 text-left">Observação</th></tr></thead><tbody>{form.itens.length ? form.itens.map((item, index) => <tr key={`${item.tipoItem}-${item.itemId}-${index}`}><td className="border-b px-2 py-2">{item.tipoItem}</td><td className="border-b px-2 py-2">{item.nomeItem || `#${item.itemId}`}</td><td className="border-b px-2 py-2">{item.numeroPatrimonio || "---"}</td><td className="border-b px-2 py-2">{item.quantidade}</td><td className="border-b px-2 py-2">{item.observacaoItem || "---"}</td></tr>) : <tr><td colSpan={5} className="px-2 py-3 text-center">Nenhum item vinculado.</td></tr>}</tbody></table></CardContent></Card>
            <Card className="border-[var(--g3-border)]"><CardHeader className="pb-2"><CardTitle className="text-sm">Condições</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><p>Declaro receber os itens acima para uso no evento informado, comprometendo-me a devolvê-los nas mesmas condições de retirada, respeitando a data prevista de devolução.</p><p>Em caso de dano, perda ou não devolução, o registro deverá ser tratado conforme as regras internas da instituição.</p><p><strong>Observações do empréstimo:</strong> {form.observacoes || "---"}</p></CardContent></Card>
            <div className="grid gap-8 pt-10 md:grid-cols-2">
              <div className="border-t border-[var(--g3-border)] pt-2 text-center">Responsável pela retirada</div>
              <div className="border-t border-[var(--g3-border)] pt-2 text-center">Responsável interno pela entrega</div>
            </div>
          </div>
      </section>
    </AdminPageLayout>

      {previewConfirmacaoEmail ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 px-4"
          onClick={() => {
            if (!enviandoPreviewConfirmacaoEmail) setPreviewConfirmacaoEmail(null);
          }}
        >
          <div
            className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="text-base font-semibold text-slate-900">Pré-visualização do e-mail</h3>
              <p className="mt-1 text-sm text-slate-600">
                Revise a mensagem antes de enviar para o responsável.
              </p>
            </div>
            <div className="space-y-4 px-5 py-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase text-slate-500">Destinatário</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">{previewConfirmacaoEmail.destinatario}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase text-slate-500">Assunto</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">{previewConfirmacaoEmail.assunto}</p>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white">
                <div className="border-b border-slate-100 px-4 py-2 text-xs font-semibold uppercase text-slate-500">
                  Mensagem
                </div>
                <pre className="max-h-[50vh] overflow-auto whitespace-pre-wrap px-4 py-3 text-sm leading-6 text-slate-800">{previewConfirmacaoEmail.mensagem}</pre>
              </div>
            </div>
            <div className="flex flex-col gap-2 border-t border-slate-100 px-5 py-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPreviewConfirmacaoEmail(null)}
                disabled={enviandoPreviewConfirmacaoEmail}
              >
                Cancelar
              </Button>
              <Button type="button" onClick={() => void confirmarEnvioConfirmacaoEmail()} disabled={enviandoPreviewConfirmacaoEmail}>
                {enviandoPreviewConfirmacaoEmail ? (
                  <LoaderCircle className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="mr-1.5 h-4 w-4" />
                )}
                {enviandoPreviewConfirmacaoEmail ? "Enviando..." : "Enviar e-mail"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {popup ? <PopupMensagem popup={popup} onClose={() => setPopup(null)} /> : null}
      <PopupConfirmacao aberto={confirmarExcluir} titulo="Confirmar exclusão" texto="Esta ação é irreversível. Deseja continuar?" processando={removerMutation.isPending} onCancel={() => setConfirmarExcluir(false)} onConfirm={() => void confirmarExclusao()} confirmarTexto="Excluir" />
      <PopupConfirmacao aberto={confirmarExcluirEvento} titulo="Confirmar exclusão" texto="Deseja realmente excluir o evento selecionado?" processando={removerEventoMutation.isPending} onCancel={() => setConfirmarExcluirEvento(false)} onConfirm={() => void confirmarExclusaoEvento()} confirmarTexto="Excluir" />
      <PopupConfirmacao aberto={confirmarExcluirResponsavel} titulo="Confirmar exclusão" texto="Deseja realmente excluir o responsável selecionado?" processando={removerResponsavelMutation.isPending} onCancel={() => setConfirmarExcluirResponsavel(false)} onConfirm={() => void confirmarExclusaoResponsavel()} confirmarTexto="Excluir" />
    </>
  );
}
