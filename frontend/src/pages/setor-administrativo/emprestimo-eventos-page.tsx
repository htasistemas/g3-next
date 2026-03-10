import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  useRemoverEmprestimoEvento,
  useRemoverEventoEmprestimo,
  useSalvarEmprestimoEvento,
  useSalvarEventoEmprestimo
} from "@/features/emprestimos-eventos/use-emprestimos-eventos";
import { useItensAlmoxarifado } from "@/features/almoxarifado/use-almoxarifado";
import { usePatrimonios } from "@/features/patrimonios/use-patrimonios";
import { useUnidadesAssistenciais } from "@/features/unidades-assistenciais/use-unidades-assistenciais";
import { useUsuarios } from "@/features/usuarios/use-usuarios";
import { imprimirConteudoAtual } from "@/lib/report-utils";
import { emprestimosEventosService } from "@/services/emprestimos-eventos.service";
import type {
  EmprestimoEvento,
  EventoEmprestimo,
  ItemEmprestimoEvento,
  StatusEmprestimoEvento,
  TipoItemEmprestimo
} from "@/types/emprestimos-eventos";
import { useAuth } from "@/hooks/use-auth";

type AbaId = "listagem" | "cadastro" | "itens" | "agenda" | "eventos";

type FormState = {
  id?: number;
  eventoId: string;
  unidadeId: string;
  responsavelId: string;
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

const abas: AdminTab[] = [
  { id: "listagem", label: "Listagem", icon: List },
  { id: "cadastro", label: "Dados Do Empréstimo", icon: ClipboardList },
  { id: "itens", label: "Itens Vinculados", icon: ClipboardList },
  { id: "agenda", label: "Agenda De Empréstimos", icon: CalendarDays },
  { id: "eventos", label: "Eventos", icon: CalendarDays }
];

const statusOpcoes: Array<{ value: StatusEmprestimoEvento; label: string }> = [
  { value: "RASCUNHO", label: "Rascunho" },
  { value: "AGENDADO", label: "Agendado" },
  { value: "RETIRADO", label: "Retirado" },
  { value: "DEVOLVIDO", label: "Devolvido" },
  { value: "CANCELADO", label: "Cancelado" }
];

const eventoStatusOpcoes = ["PLANEJADO", "EM_ANDAMENTO", "FINALIZADO", "CANCELADO"];

const nowLocal = () => new Date().toISOString().slice(0, 16);
const fmt = (v?: string | null) => (v ? v.replace("T", " ").slice(0, 16) : "---");
const dt = (v?: string | null) => (v ? String(v).slice(0, 16) : "");

const defaultForm = (): FormState => ({
  eventoId: "",
  unidadeId: "",
  responsavelId: "",
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

export function EmprestimoEventosPage() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const [abaAtiva, setAbaAtiva] = useState<AbaId>("listagem");

  const [fInicio, setFInicio] = useState("");
  const [fFim, setFFim] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fEvento, setFEvento] = useState("");

  const [form, setForm] = useState<FormState>(defaultForm());
  const [snapshot, setSnapshot] = useState<FormState>(defaultForm());
  const [eventoForm, setEventoForm] = useState<EventoFormState>(defaultEvento);
  const [itemTipo, setItemTipo] = useState<TipoItemEmprestimo>("PATRIMONIO");
  const [itemId, setItemId] = useState("");
  const [itemQtd, setItemQtd] = useState("1");
  const [itemObs, setItemObs] = useState("");

  const [agendaInicio, setAgendaInicio] = useState("");
  const [agendaFim, setAgendaFim] = useState("");
  const [agendaDia, setAgendaDia] = useState("");

  const [popup, setPopup] = useState<PopupMensagemState | null>(null);
  const [confirmarExcluir, setConfirmarExcluir] = useState(false);
  const [confirmarExcluirEvento, setConfirmarExcluirEvento] = useState(false);

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
  const { data: agendaResumoData } = useAgendaResumoEmprestimos(agendaInicio || undefined, agendaFim || undefined);
  const { data: agendaDiaData } = useAgendaDiaEmprestimos(agendaDia || undefined);
  const { data: unidadesData } = useUnidadesAssistenciais({});
  const { data: usuariosData } = useUsuarios({ pagina: 1, tamanho_pagina: 200, status: "ATIVO" });
  const { data: patrimoniosData } = usePatrimonios();
  const { data: almoxData } = useItensAlmoxarifado();

  const salvarMutation = useSalvarEmprestimoEvento();
  const removerMutation = useRemoverEmprestimoEvento();
  const salvarEventoMutation = useSalvarEventoEmprestimo();
  const removerEventoMutation = useRemoverEventoEmprestimo();

  const emprestimos = emprestimosData?.emprestimos ?? [];
  const eventos = eventosData ?? [];
  const unidades = unidadesData?.unidades ?? [];
  const usuarios = usuariosData?.usuarios ?? [];
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

  const carregandoAcoes =
    salvarMutation.isPending ||
    removerMutation.isPending ||
    salvarEventoMutation.isPending ||
    removerEventoMutation.isPending;

  function selecionarEmprestimo(item: EmprestimoEvento) {
    const next: FormState = {
      id: item.id,
      eventoId: String(item.evento.id),
      unidadeId: item.unidadeId ? String(item.unidadeId) : "",
      responsavelId: item.responsavel?.id ? String(item.responsavel.id) : "",
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
    setAbaAtiva("cadastro");
  }

  async function salvar() {
    if (!form.eventoId || !form.dataRetiradaPrevista || !form.dataDevolucaoPrevista) {
      setPopup({ tipo: "aviso", titulo: "Validação", texto: "Preencha evento e período do empréstimo." });
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
      itens: [
        ...atual.itens,
        {
          itemId: Number(itemId),
          tipoItem: itemTipo,
          quantidade: Number(itemQtd),
          statusItem: "RESERVADO",
          observacaoItem: itemObs || undefined,
          nomeItem: nomeItem ?? undefined
        }
      ]
    }));
    setItemId("");
    setItemQtd("1");
    setItemObs("");
  }

  function removerItem(indice: number) {
    setForm((atual) => ({ ...atual, itens: atual.itens.filter((_i, idx) => idx !== indice) }));
  }

  async function salvarEvento() {
    if (!eventoForm.titulo.trim() || !eventoForm.dataInicio || !eventoForm.dataFim) {
      setPopup({ tipo: "aviso", titulo: "Validação", texto: "Preencha título e período do evento." });
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
      imprimirConteudoAtual({ titulo: "Relatório de empréstimos" });
    } catch (error: any) {
      setPopup({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.message ?? "Não foi possível preparar a impressão."
      });
    }
  }

  const acoes: AdminAction[] = [
    { label: "Buscar", icon: Search, onClick: () => setAbaAtiva("listagem"), variant: "outline" },
    { label: "Novo", icon: Plus, onClick: novo, variant: "default", disabled: carregandoAcoes },
    { label: "Salvar", icon: Save, onClick: () => void salvar(), variant: "default", disabled: carregandoAcoes },
    { label: "Cancelar", icon: Undo2, onClick: () => setForm(snapshot), variant: "outline", disabled: carregandoAcoes },
    { label: "Excluir", icon: Trash2, onClick: excluir, variant: "danger", disabled: carregandoAcoes },
    { label: "Imprimir", icon: Printer, onClick: imprimir, variant: "outline", disabled: carregandoAcoes },
    { label: "Fechar", icon: X, onClick: () => navigate("/dashboard/visao-geral"), variant: "outline" }
  ];

  return (
    <>
      <AdminPageLayout tabs={abas} activeTab={abaAtiva} onChangeTab={(id) => setAbaAtiva(id as AbaId)} actions={acoes} activeTitle={abas.find((a) => a.id === abaAtiva)?.label} codeBadge={form.id ? `Código: ${form.id}` : "Novo"}>
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
              <div className="space-y-1 xl:col-span-2"><Label>Responsável</Label><Select value={form.responsavelId} onChange={(e) => setForm((a) => ({ ...a, responsavelId: e.target.value }))}><option value="">Selecione</option>{usuarios.map((u) => <option key={u.id_usuario} value={u.id_usuario}>{u.nome_completo || u.nome_usuario}</option>)}</Select></div>
              <div className="space-y-1"><Label>Retirada Prevista</Label><Input type="datetime-local" value={form.dataRetiradaPrevista} onChange={(e) => setForm((a) => ({ ...a, dataRetiradaPrevista: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Devolução Prevista</Label><Input type="datetime-local" value={form.dataDevolucaoPrevista} onChange={(e) => setForm((a) => ({ ...a, dataDevolucaoPrevista: e.target.value }))} /></div>
              <div className="space-y-1 md:col-span-2 xl:col-span-4"><Label>Observações</Label><Textarea rows={2} value={form.observacoes} onChange={(e) => setForm((a) => ({ ...a, observacoes: e.target.value }))} /></div>
            </div>
            <Card className="border-[var(--g3-border)]"><CardHeader className="pb-2"><CardTitle className="text-sm">Ações Rápidas</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-2"><Button variant="outline" disabled={!form.id} onClick={() => void confirmarStatus("RETIRADA")}>Confirmar Retirada</Button><Button variant="outline" disabled={!form.id} onClick={() => void confirmarStatus("DEVOLUCAO")}>Confirmar Devolução</Button><Button variant="danger" disabled={!form.id} onClick={() => void confirmarStatus("CANCELAR")}>Cancelar Empréstimo</Button></CardContent></Card>
          </section>
        ) : null}

        {abaAtiva === "itens" ? (
          <section className="space-y-3">
            <div className="grid gap-3 rounded-lg border border-[var(--g3-border)] p-3 md:grid-cols-2 xl:grid-cols-5">
              <div className="space-y-1"><Label>Tipo</Label><Select value={itemTipo} onChange={(e) => { setItemTipo(e.target.value as TipoItemEmprestimo); setItemId(""); }}><option value="PATRIMONIO">Patrimônio</option><option value="ALMOXARIFADO">Almoxarifado</option></Select></div>
              <div className="space-y-1 xl:col-span-2"><Label>Item</Label><Select value={itemId} onChange={(e) => setItemId(e.target.value)}><option value="">Selecione</option>{opcoesItem.map((i) => <option key={i.id} value={i.id}>{i.label}</option>)}</Select></div>
              <div className="space-y-1"><Label>Quantidade</Label><Input type="number" min={1} value={itemQtd} onChange={(e) => setItemQtd(e.target.value)} /></div>
              <div className="space-y-1"><Label>Observação</Label><Input value={itemObs} onChange={(e) => setItemObs(e.target.value)} /></div>
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
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{agendaResumo.map((a) => <Card key={a.data} className="border-[var(--g3-border)]"><CardHeader className="pb-2"><CardTitle className="text-sm">{a.data}</CardTitle></CardHeader><CardContent className="text-sm">Empréstimos: {a.qtdEmprestimos}</CardContent></Card>)}</div>
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
      </AdminPageLayout>

      {popup ? <PopupMensagem popup={popup} onClose={() => setPopup(null)} /> : null}
      <PopupConfirmacao aberto={confirmarExcluir} titulo="Confirmar Exclusão" texto="Esta ação é irreversível. Deseja continuar?" processando={removerMutation.isPending} onCancel={() => setConfirmarExcluir(false)} onConfirm={() => void confirmarExclusao()} confirmarTexto="Excluir" />
      <PopupConfirmacao aberto={confirmarExcluirEvento} titulo="Confirmar Exclusão" texto="Deseja realmente excluir o evento selecionado?" processando={removerEventoMutation.isPending} onCancel={() => setConfirmarExcluirEvento(false)} onConfirm={() => void confirmarExclusaoEvento()} confirmarTexto="Excluir" />
    </>
  );
}
