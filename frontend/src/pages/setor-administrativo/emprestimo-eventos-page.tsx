import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarDays, ClipboardList, List, Plus, Printer, Save, Search, Trash2, Undo2, X } from "lucide-react";
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
import { formatarDataPtBr } from "@/lib/br-utils";
import { imprimirConteudoAtual } from "@/lib/report-utils";
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
  dataInicio: string;
  dataFim: string;
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

const abas: AdminTab[] = [
  { id: "listagem", label: "Listagem", icon: List },
  { id: "cadastro", label: "Dados do empréstimo", icon: ClipboardList },
  { id: "itens", label: "Itens vinculados", icon: ClipboardList },
  { id: "agenda", label: "Agenda de empréstimos", icon: CalendarDays },
  { id: "eventos", label: "Eventos", icon: CalendarDays },
  { id: "responsaveis", label: "Responsáveis", icon: ClipboardList }
];

const tituloTela = "Empréstimo para eventos";

const statusOpcoes: Array<{ value: StatusEmprestimoEvento; label: string }> = [
  { value: "RASCUNHO", label: "Rascunho" },
  { value: "AGENDADO", label: "Agendado" },
  { value: "RETIRADO", label: "Retirado" },
  { value: "DEVOLVIDO", label: "Devolvido" },
  { value: "CANCELADO", label: "Cancelado" }
];

const eventoStatusOpcoes = ["PLANEJADO", "EM_ANDAMENTO", "FINALIZADO", "CANCELADO"];

const nowLocal = () => agoraLocalInputDateTime();
const fmt = (v?: string | null) => formatarDateTimeLocalPtBr(v);
const dt = (v?: string | null) => normalizarDateTimeLocal(v);

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
  dataInicio: nowLocal(),
  dataFim: nowLocal(),
  status: "PLANEJADO"
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

  const [agendaInicio, setAgendaInicio] = useState("");
  const [agendaFim, setAgendaFim] = useState("");
  const [agendaDia, setAgendaDia] = useState("");

  const [popup, setPopup] = useState<PopupMensagemState | null>(null);
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
  const { data: agendaResumoData } = useAgendaResumoEmprestimos(agendaInicio || undefined, agendaFim || undefined);
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
  const agendaResumo = agendaResumoData ?? [];
  const agendaDetalhe = agendaDiaData ?? [];

  const opcoesItem = useMemo(
    () =>
      itemTipo === "PATRIMONIO"
        ? patrimonios.map((p) => ({ id: String(p.idPatrimonio), label: `${p.numeroPatrimonio} - ${p.nome}` }))
        : almox.map((a) => ({ id: String(a.id_item), label: `${a.codigo} - ${a.descricao}` })),
    [itemTipo, patrimonios, almox]
  );

  const opcoesItemFiltradas = useMemo(() => {
    const termo = itemBusca.trim().toLocaleLowerCase("pt-BR");
    if (!termo) return opcoesItem.slice(0, 30);
    return opcoesItem
      .filter((item) => item.label.toLocaleLowerCase("pt-BR").includes(termo))
      .slice(0, 30);
  }, [itemBusca, opcoesItem]);

  const carregandoAcoes =
    salvarMutation.isPending ||
    removerMutation.isPending ||
    salvarEventoMutation.isPending ||
    removerEventoMutation.isPending ||
    salvarResponsavelMutation.isPending ||
    removerResponsavelMutation.isPending;

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
  }

  function novo() {
    const next = defaultForm();
    setForm(next);
    setSnapshot(next);
    setItemBusca("");
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

  async function confirmarStatus(tipo: "RETIRADA" | "DEVOLUCAO" | "CANCELAR") {
    if (!form.id) return;
    try {
      const usuarioId = usuario?.id ? Number(usuario.id) : undefined;
      const resp =
        tipo === "RETIRADA"
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
    if (!itemId || Number(itemQtd) <= 0) {
      setPopup({ tipo: "aviso", titulo: "Validação", texto: "Informe item e quantidade válidos." });
      return;
    }
    try {
      await emprestimosEventosService.disponibilidade({
        itemId: Number(itemId),
        tipoItem: itemTipo,
        quantidade: Number(itemQtd),
        inicio: form.dataRetiradaPrevista,
        fim: form.dataDevolucaoPrevista,
        emprestimoId: form.id
      });
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
              quantidade: Number(itemQtd),
              statusItem: "RESERVADO",
              observacaoItem: itemObs || undefined,
              nomeItem: nomeItem ?? undefined
            }
          ];
        }

        return atual.itens.map((item, indice) =>
          indice === indiceExistente
            ? {
                ...item,
                quantidade: item.quantidade + Number(itemQtd),
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
  }

  function removerItem(indice: number) {
    setForm((atual) => ({ ...atual, itens: atual.itens.filter((_i, idx) => idx !== indice) }));
  }

  function atualizarResponsavelNome(valor: string) {
    const responsavelEncontrado = responsaveis.find((item) => {
      return item.nome.trim().localeCompare(valor.trim(), "pt-BR", { sensitivity: "base" }) === 0;
    });

    setForm((atual) => ({
      ...atual,
      responsavelNome: valor,
      responsavelId: responsavelEncontrado ? String(responsavelEncontrado.id) : ""
    }));
  }

  function atualizarBuscaItem(valor: string) {
    const itemEncontrado = opcoesItem.find((item) => {
      return item.label.trim().localeCompare(valor.trim(), "pt-BR", { sensitivity: "base" }) === 0;
    });

    setItemBusca(valor);
    setItemId(itemEncontrado?.id ?? "");
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
    if (!eventoForm.titulo.trim() || !eventoForm.dataInicio || !eventoForm.dataFim) {
      setPopup({ tipo: "aviso", titulo: "Validação", texto: "Preencha título e período do evento." });
      return;
    }
    if (eventoForm.dataFim < eventoForm.dataInicio) {
      setPopup({ tipo: "aviso", titulo: "Validação", texto: "O fim do evento não pode ser menor que o início." });
      return;
    }
    try {
      await salvarEventoMutation.mutateAsync({
        id: eventoForm.id ?? 0,
        titulo: eventoForm.titulo.trim(),
        descricao: eventoForm.descricao || undefined,
        local: eventoForm.local || undefined,
        dataInicio: eventoForm.dataInicio,
        dataFim: eventoForm.dataFim,
        status: eventoForm.status
      });
      setEventoForm(defaultEvento);
      setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Evento salvo com sucesso." });
    } catch (error: any) {
      setPopup({ tipo: "erro", titulo: "Erro", texto: error?.response?.data?.message ?? "Falha ao salvar evento." });
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

  function imprimir() {
    try {
      if ((abaAtiva === "cadastro" || abaAtiva === "itens") && form.id) {
        imprimirConteudoAtual({
          titulo: `Termo de empréstimo #${form.id}`,
          seletor: "#emprestimo-eventos-termo"
        });
        return;
      }

      imprimirConteudoAtual({ titulo: "Relatório de empréstimos" });
    } catch {
      window.print();
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

  return (
    <>
      <AdminPageLayout tabs={abas} activeTab={abaAtiva} onChangeTab={(id) => setAbaAtiva(id as AbaId)} actions={acoes} sectionLabel="Setor administrativo" pageTitle={tituloTela} activeTitle={abas.find((a) => a.id === abaAtiva)?.label} codeBadge={form.id ? `Código: ${form.id}` : "Novo"}>
        {abaAtiva === "listagem" ? (
          <section className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <div className="space-y-1"><Label>Período Inicial</Label><Input type="date" value={fInicio} onChange={(e) => setFInicio(e.target.value)} /></div>
              <div className="space-y-1"><Label>Período Final</Label><Input type="date" value={fFim} onChange={(e) => setFFim(e.target.value)} /></div>
              <div className="space-y-1"><Label>Status</Label><Select value={fStatus} onChange={(e) => setFStatus(e.target.value)}><option value="">Todos</option>{statusOpcoes.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</Select></div>
              <div className="space-y-1 xl:col-span-2"><Label>Evento</Label><Select value={fEvento} onChange={(e) => setFEvento(e.target.value)}><option value="">Todos</option>{eventos.map((e) => <option key={e.id} value={e.id}>{e.titulo}</option>)}</Select></div>
            </div>
            <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
              <table className="min-w-full text-sm"><thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]"><tr><th className="px-3 py-2 text-left">Código</th><th className="px-3 py-2 text-left">Evento</th><th className="px-3 py-2 text-left">Retirada</th><th className="px-3 py-2 text-left">Devolução</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2 text-left">Itens</th><th className="px-3 py-2 text-right">Ações</th></tr></thead>
                <tbody>{carregandoEmprestimos ? <tr><td colSpan={7} className="px-3 py-4 text-center">Carregando empréstimos...</td></tr> : emprestimos.length ? emprestimos.map((item, i) => <tr key={item.id} className={`border-t border-[var(--g3-border)] ${i % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35"}`}><td className="px-3 py-2">{item.id}</td><td className="px-3 py-2 font-medium">{item.evento.titulo}</td><td className="px-3 py-2">{fmt(item.dataRetiradaPrevista)}</td><td className="px-3 py-2">{fmt(item.dataDevolucaoPrevista)}</td><td className="px-3 py-2">{item.status}</td><td className="px-3 py-2">{item.itens?.length ?? 0}</td><td className="px-3 py-2 text-right"><Button variant="outline" size="sm" onClick={() => selecionarEmprestimo(item)}>Selecionar</Button></td></tr>) : <tr><td colSpan={7} className="px-3 py-4 text-center">Nenhum empréstimo encontrado.</td></tr>}</tbody>
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
                <Input
                  list="emprestimo-eventos-responsaveis"
                  value={form.responsavelNome}
                  onChange={(e) => atualizarResponsavelNome(e.target.value)}
                  placeholder="Digite o nome do responsável"
                />
                <datalist id="emprestimo-eventos-responsaveis">
                  {responsaveis.map((responsavel) => (
                    <option key={responsavel.id} value={responsavel.nome} />
                  ))}
                </datalist>
              </div>
              <div className="space-y-1"><Label>Retirada Prevista</Label><Input type="datetime-local" value={form.dataRetiradaPrevista} onChange={(e) => setForm((a) => ({ ...a, dataRetiradaPrevista: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Devolução Prevista</Label><Input type="datetime-local" value={form.dataDevolucaoPrevista} onChange={(e) => setForm((a) => ({ ...a, dataDevolucaoPrevista: e.target.value }))} /></div>
              <div className="space-y-1 md:col-span-2 xl:col-span-4"><Label>Observações</Label><Textarea rows={2} value={form.observacoes} onChange={(e) => setForm((a) => ({ ...a, observacoes: e.target.value }))} /></div>
            </div>
            <Card className="border-[var(--g3-border)]"><CardHeader className="pb-2"><CardTitle className="text-sm">Ações Rápidas</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-2"><Button variant="outline" disabled={!form.id || form.status === "RETIRADO" || form.status === "DEVOLVIDO" || form.status === "CANCELADO"} onClick={() => void confirmarStatus("RETIRADA")}>Confirmar Retirada</Button><Button variant="outline" disabled={!form.id || form.status !== "RETIRADO"} onClick={() => void confirmarStatus("DEVOLUCAO")}>Confirmar Devolução</Button><Button variant="danger" disabled={!form.id || form.status === "DEVOLVIDO" || form.status === "CANCELADO"} onClick={() => void confirmarStatus("CANCELAR")}>Cancelar Empréstimo</Button></CardContent></Card>
          </section>
        ) : null}

        {abaAtiva === "itens" ? (
          <section className="space-y-3">
            <div className="grid gap-3 rounded-lg border border-[var(--g3-border)] p-3 md:grid-cols-2 xl:grid-cols-[0.8fr_2.2fr_0.6fr_1.8fr_auto]">
              <div className="space-y-1"><Label>Tipo</Label><Select value={itemTipo} onChange={(e) => { setItemTipo(e.target.value as TipoItemEmprestimo); setItemId(""); setItemBusca(""); }}><option value="PATRIMONIO">Patrimônio</option><option value="ALMOXARIFADO">Almoxarifado</option></Select></div>
              <div className="space-y-1"><Label>Item</Label><Input list="emprestimo-eventos-itens" value={itemBusca} onChange={(e) => atualizarBuscaItem(e.target.value)} placeholder="Digite para buscar o item" /><datalist id="emprestimo-eventos-itens">{opcoesItemFiltradas.map((i) => <option key={i.id} value={i.label} />)}</datalist></div>
              <div className="space-y-1"><Label>Quantidade</Label><Input type="number" min={1} value={itemQtd} onChange={(e) => setItemQtd(e.target.value)} className="max-w-[96px]" /></div>
              <div className="space-y-1"><Label>Observação</Label><Input value={itemObs} onChange={(e) => setItemObs(e.target.value)} placeholder="Observação do item" /></div>
              <div className="flex items-end"><Button className="w-full" onClick={() => void adicionarItem()}>Adicionar Item</Button></div>
            </div>
            <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
              <table className="min-w-full text-sm"><thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]"><tr><th className="px-3 py-2 text-left">Tipo</th><th className="px-3 py-2 text-left">Item</th><th className="px-3 py-2 text-left">Quantidade</th><th className="px-3 py-2 text-left">Observação</th><th className="px-3 py-2 text-right">Ações</th></tr></thead>
                <tbody>{form.itens.length ? form.itens.map((i, idx) => <tr key={`${i.tipoItem}-${i.itemId}-${idx}`} className={`border-t border-[var(--g3-border)] ${idx % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35"}`}><td className="px-3 py-2">{i.tipoItem}</td><td className="px-3 py-2">{i.nomeItem || `#${i.itemId}`}</td><td className="px-3 py-2">{i.quantidade}</td><td className="px-3 py-2">{i.observacaoItem || "---"}</td><td className="px-3 py-2 text-right"><Button variant="danger" size="sm" onClick={() => removerItem(idx)}>Remover</Button></td></tr>) : <tr><td colSpan={5} className="px-3 py-4 text-center">Nenhum item adicionado.</td></tr>}</tbody>
              </table>
            </div>
          </section>
        ) : null}

        {abaAtiva === "agenda" ? (
          <section className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <div className="space-y-1"><Label>Agenda Inicial</Label><Input type="date" value={agendaInicio} onChange={(e) => setAgendaInicio(e.target.value)} /></div>
              <div className="space-y-1"><Label>Agenda Final</Label><Input type="date" value={agendaFim} onChange={(e) => setAgendaFim(e.target.value)} /></div>
              <div className="space-y-1 xl:col-span-2"><Label>Dia</Label><Input type="date" value={agendaDia} onChange={(e) => setAgendaDia(e.target.value)} /></div>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{agendaResumo.map((a) => <Card key={a.data} className="border-[var(--g3-border)]"><CardHeader className="pb-2"><CardTitle className="text-sm">{formatarDataPtBr(a.data)}</CardTitle></CardHeader><CardContent className="text-sm">Empréstimos: {a.qtdEmprestimos}</CardContent></Card>)}</div>
            <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]"><table className="min-w-full text-sm"><thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]"><tr><th className="px-3 py-2 text-left">Empréstimo</th><th className="px-3 py-2 text-left">Evento</th><th className="px-3 py-2 text-left">Período</th><th className="px-3 py-2 text-left">Status</th></tr></thead><tbody>{agendaDetalhe.length ? agendaDetalhe.map((a, i) => <tr key={`${a.emprestimoId}-${i}`} className={`border-t border-[var(--g3-border)] ${i % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35"}`}><td className="px-3 py-2">#{a.emprestimoId}</td><td className="px-3 py-2">{a.evento.titulo}</td><td className="px-3 py-2">{fmt(a.periodo.retiradaPrevista)} a {fmt(a.periodo.devolucaoPrevista)}</td><td className="px-3 py-2">{a.status}</td></tr>) : <tr><td colSpan={4} className="px-3 py-4 text-center">Nenhum empréstimo para a data selecionada.</td></tr>}</tbody></table></div>
          </section>
        ) : null}

        {abaAtiva === "eventos" ? (
          <section className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-1 xl:col-span-2"><Label>Título</Label><Input value={eventoForm.titulo} onChange={(e) => setEventoForm((a) => ({ ...a, titulo: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Início</Label><Input type="datetime-local" value={eventoForm.dataInicio} onChange={(e) => setEventoForm((a) => ({ ...a, dataInicio: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Fim</Label><Input type="datetime-local" value={eventoForm.dataFim} onChange={(e) => setEventoForm((a) => ({ ...a, dataFim: e.target.value }))} /></div>
              <div className="space-y-1 md:col-span-2 xl:col-span-3"><Label>Local</Label><Input value={eventoForm.local} onChange={(e) => setEventoForm((a) => ({ ...a, local: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Status</Label><Select value={eventoForm.status} onChange={(e) => setEventoForm((a) => ({ ...a, status: e.target.value }))}>{eventoStatusOpcoes.map((s) => <option key={s} value={s}>{s}</option>)}</Select></div>
              <div className="space-y-1 md:col-span-2 xl:col-span-4"><Label>Descrição</Label><Textarea rows={2} value={eventoForm.descricao} onChange={(e) => setEventoForm((a) => ({ ...a, descricao: e.target.value }))} /></div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap"><Button onClick={() => void salvarEvento()} disabled={salvarEventoMutation.isPending}>Salvar Evento</Button><Button variant="outline" onClick={() => setEventoForm(defaultEvento)}>Novo Evento</Button><Button variant="danger" onClick={excluirEvento} disabled={!eventoForm.id}>Excluir Evento</Button></div>
            <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]"><table className="min-w-full text-sm"><thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]"><tr><th className="px-3 py-2 text-left">Título</th><th className="px-3 py-2 text-left">Início</th><th className="px-3 py-2 text-left">Fim</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2 text-right">Ações</th></tr></thead><tbody>{eventos.length ? eventos.map((e, i) => <tr key={e.id} className={`border-t border-[var(--g3-border)] ${i % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35"}`}><td className="px-3 py-2">{e.titulo}</td><td className="px-3 py-2">{fmt(e.dataInicio)}</td><td className="px-3 py-2">{fmt(e.dataFim)}</td><td className="px-3 py-2">{e.status}</td><td className="px-3 py-2 text-right"><Button variant="outline" size="sm" onClick={() => setEventoForm({ id: e.id, titulo: e.titulo, descricao: e.descricao ?? "", local: e.local ?? "", dataInicio: dt(e.dataInicio), dataFim: dt(e.dataFim), status: e.status || "PLANEJADO" })}>Selecionar</Button></td></tr>) : <tr><td colSpan={5} className="px-3 py-4 text-center">Nenhum evento cadastrado.</td></tr>}</tbody></table></div>
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
            <Card className="border-[var(--g3-border)]"><CardHeader className="pb-2"><CardTitle className="text-sm">Itens vinculados</CardTitle></CardHeader><CardContent><table className="min-w-full text-sm"><thead><tr><th className="border-b px-2 py-2 text-left">Tipo</th><th className="border-b px-2 py-2 text-left">Item</th><th className="border-b px-2 py-2 text-left">Quantidade</th><th className="border-b px-2 py-2 text-left">Observação</th></tr></thead><tbody>{form.itens.length ? form.itens.map((item, index) => <tr key={`${item.tipoItem}-${item.itemId}-${index}`}><td className="border-b px-2 py-2">{item.tipoItem}</td><td className="border-b px-2 py-2">{item.nomeItem || `#${item.itemId}`}</td><td className="border-b px-2 py-2">{item.quantidade}</td><td className="border-b px-2 py-2">{item.observacaoItem || "---"}</td></tr>) : <tr><td colSpan={4} className="px-2 py-3 text-center">Nenhum item vinculado.</td></tr>}</tbody></table></CardContent></Card>
            <Card className="border-[var(--g3-border)]"><CardHeader className="pb-2"><CardTitle className="text-sm">Condições</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><p>Declaro receber os itens acima para uso no evento informado, comprometendo-me a devolvê-los nas mesmas condições de retirada, respeitando a data prevista de devolução.</p><p>Em caso de dano, perda ou não devolução, o registro deverá ser tratado conforme as regras internas da instituição.</p><p><strong>Observações do empréstimo:</strong> {form.observacoes || "---"}</p></CardContent></Card>
            <div className="grid gap-8 pt-10 md:grid-cols-2">
              <div className="border-t border-[var(--g3-border)] pt-2 text-center">Responsável pela retirada</div>
              <div className="border-t border-[var(--g3-border)] pt-2 text-center">Responsável interno pela entrega</div>
            </div>
          </div>
        </section>
      </AdminPageLayout>

      {popup ? <PopupMensagem popup={popup} onClose={() => setPopup(null)} /> : null}
      <PopupConfirmacao aberto={confirmarExcluir} titulo="Confirmar Exclusão" texto="Esta ação é irreversível. Deseja continuar?" processando={removerMutation.isPending} onCancel={() => setConfirmarExcluir(false)} onConfirm={() => void confirmarExclusao()} confirmarTexto="Excluir" />
      <PopupConfirmacao aberto={confirmarExcluirEvento} titulo="Confirmar Exclusão" texto="Deseja realmente excluir o evento selecionado?" processando={removerEventoMutation.isPending} onCancel={() => setConfirmarExcluirEvento(false)} onConfirm={() => void confirmarExclusaoEvento()} confirmarTexto="Excluir" />
      <PopupConfirmacao aberto={confirmarExcluirResponsavel} titulo="Confirmar Exclusão" texto="Deseja realmente excluir o responsável selecionado?" processando={removerResponsavelMutation.isPending} onCancel={() => setConfirmarExcluirResponsavel(false)} onConfirm={() => void confirmarExclusaoResponsavel()} confirmarTexto="Excluir" />
    </>
  );
}
