import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bell, CheckCircle2, Printer, Save, Search, Trash2, Undo2, X, Plus, List } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { AdminPageLayout, type AdminAction, type AdminTab } from "@/components/admin/admin-page-layout";
import { PopupConfirmacao, PopupMensagem, type PopupMensagemState } from "@/components/admin/admin-popups";
import {
  useAdiarLembreteDiario,
  useConcluirLembreteDiario,
  useExcluirLembreteDiario,
  useLembretesDiarios,
  useSalvarLembreteDiario
} from "@/features/lembretes-diarios/use-lembretes-diarios";
import { imprimirConteudoAtual } from "@/lib/report-utils";
import type { LembreteDiarioPayload } from "@/types/lembrete-diario";
import { useAuth } from "@/hooks/use-auth";

type AbaId = "cadastro" | "lembretes";
type FiltroStatus = "todos" | "pendentes" | "concluidos" | "atrasados";

const abas: AdminTab[] = [
  { id: "cadastro", label: "Cadastro De Lembretes", icon: Bell },
  { id: "lembretes", label: "Lembretes Criados", icon: List }
];

const tituloTela = "Lembretes diários";

type FormState = LembreteDiarioPayload & { id?: number };

const defaultForm: FormState = {
  titulo: "",
  descricao: "",
  dataInicial: "",
  horaAviso: "09:00",
  usuarioId: null,
  todosUsuarios: false
};

export function LembretesDiariosPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { usuario } = useAuth();
  const [abaAtiva, setAbaAtiva] = useState<AbaId>("cadastro");
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>("pendentes");
  const [busca, setBusca] = useState("");
  const [form, setForm] = useState<FormState>(defaultForm);
  const [snapshot, setSnapshot] = useState<FormState>(defaultForm);
  const [popupMensagem, setPopupMensagem] = useState<PopupMensagemState | null>(null);
  const [confirmarExcluir, setConfirmarExcluir] = useState(false);
  const [adiarId, setAdiarId] = useState<number | null>(null);
  const [adiarDataHora, setAdiarDataHora] = useState("");

  const { data, isLoading } = useLembretesDiarios();
  const salvarMutation = useSalvarLembreteDiario();
  const excluirMutation = useExcluirLembreteDiario();
  const concluirMutation = useConcluirLembreteDiario();
  const adiarMutation = useAdiarLembreteDiario();

  const lembretes = data ?? [];

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const aba = params.get("tab");
    if (aba === "lembretes") {
      setAbaAtiva("lembretes");
    }
  }, [location.search]);

  const lembretesFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const agora = new Date();
    const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());

    return lembretes.filter((item) => {
      if (termo) {
        const alvo = `${item.titulo} ${item.descricao ?? ""}`.toLowerCase();
        if (!alvo.includes(termo)) return false;
      }

      const status = String(item.status ?? "").toUpperCase();
      const proximaExecucao = item.proximaExecucaoEm ? new Date(item.proximaExecucaoEm) : null;

      if (filtroStatus === "pendentes") return status !== "CONCLUIDO";
      if (filtroStatus === "concluidos") return status === "CONCLUIDO";
      if (filtroStatus === "atrasados") {
        return status !== "CONCLUIDO" && !!proximaExecucao && proximaExecucao < hoje;
      }
      return true;
    });
  }, [busca, filtroStatus, lembretes]);

  const carregandoAcoes =
    salvarMutation.isPending ||
    excluirMutation.isPending ||
    concluirMutation.isPending ||
    adiarMutation.isPending;

  async function salvar() {
    if (!form.titulo.trim() || !form.dataInicial) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Validação",
        texto: "Informe título e data inicial para salvar o lembrete."
      });
      return;
    }

    try {
      const criandoNovo = !form.id;
      const payload: LembreteDiarioPayload = {
        titulo: form.titulo.trim(),
        descricao: form.descricao?.trim() || undefined,
        dataInicial: form.dataInicial,
        horaAviso: form.horaAviso?.trim() || undefined,
        usuarioId: form.todosUsuarios ? null : ((form.usuarioId ?? Number(usuario?.id)) || null),
        todosUsuarios: !!form.todosUsuarios
      };

      const response = await salvarMutation.mutateAsync({
        id: form.id,
        payload
      });

      const proximo: FormState = {
        id: response.id,
        titulo: response.titulo,
        descricao: response.descricao ?? "",
        dataInicial: response.dataInicial,
        horaAviso: response.horaAviso ?? "09:00",
        usuarioId: response.usuarioId ?? null,
        todosUsuarios: !!response.todosUsuarios
      };

      setForm(proximo);
      setSnapshot(proximo);
      setPopupMensagem({ tipo: "sucesso", titulo: "Confirmação", texto: "Lembrete salvo com sucesso." });
      setAbaAtiva("lembretes");

      if (criandoNovo) {
        localStorage.setItem("g3_lembrete_alerta", "1");
        window.dispatchEvent(new Event("g3-lembrete-alerta"));
      }
    } catch (error: any) {
      setPopupMensagem({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível salvar o lembrete."
      });
    }
  }

  async function excluir() {
    if (!form.id) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Atenção",
        texto: "Selecione um lembrete para excluir."
      });
      return;
    }
    setConfirmarExcluir(true);
  }

  async function confirmarExclusao() {
    if (!form.id) return;
    try {
      await excluirMutation.mutateAsync(form.id);
      setConfirmarExcluir(false);
      novo();
      setPopupMensagem({
        tipo: "sucesso",
        titulo: "Confirmação",
        texto: "Lembrete excluído com sucesso."
      });
    } catch (error: any) {
      setPopupMensagem({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível excluir o lembrete."
      });
    }
  }

  function novo() {
    const proximo = {
      ...defaultForm,
      usuarioId: Number(usuario?.id) || null
    };
    setForm(proximo);
    setSnapshot(proximo);
    setAbaAtiva("cadastro");
  }

  function cancelar() {
    setForm(snapshot);
  }

  function buscar() {
    setAbaAtiva("lembretes");
  }

  async function concluir(id: number) {
    try {
      await concluirMutation.mutateAsync(id);
      setPopupMensagem({
        tipo: "sucesso",
        titulo: "Confirmação",
        texto: "Lembrete concluído com sucesso."
      });
    } catch (error: any) {
      setPopupMensagem({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível concluir o lembrete."
      });
    }
  }

  async function confirmarAdiamento() {
    if (!adiarId || !adiarDataHora) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Validação",
        texto: "Informe a nova data e hora para adiar o lembrete."
      });
      return;
    }

    try {
      await adiarMutation.mutateAsync({ id: adiarId, novaDataHora: adiarDataHora });
      setAdiarId(null);
      setAdiarDataHora("");
      setPopupMensagem({
        tipo: "sucesso",
        titulo: "Confirmação",
        texto: "Lembrete adiado com sucesso."
      });
    } catch (error: any) {
      setPopupMensagem({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível adiar o lembrete."
      });
    }
  }

  function imprimir() {
    try {
      imprimirConteudoAtual({ titulo: "Relatório de lembretes" });
    } catch (error: any) {
      setPopupMensagem({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.message ?? "Não foi possível preparar a impressão."
      });
    }
  }

  function fechar() {
    navigate("/dashboard/visao-geral");
  }

  function selecionar(item: (typeof lembretes)[number]) {
    const proximo: FormState = {
      id: item.id,
      titulo: item.titulo ?? "",
      descricao: item.descricao ?? "",
      dataInicial: item.dataInicial ?? "",
      horaAviso: item.horaAviso ?? "09:00",
      usuarioId: item.usuarioId ?? null,
      todosUsuarios: !!item.todosUsuarios
    };
    setForm(proximo);
    setSnapshot(proximo);
    setAbaAtiva("cadastro");
  }

  const acoes: AdminAction[] = [
    { label: "Buscar", icon: Search, onClick: buscar, variant: "outline" },
    { label: "Novo", icon: Plus, onClick: novo, variant: "default", disabled: carregandoAcoes },
    { label: "Salvar", icon: Save, onClick: () => void salvar(), variant: "default", disabled: carregandoAcoes },
    { label: "Cancelar", icon: Undo2, onClick: cancelar, variant: "outline", disabled: carregandoAcoes },
    { label: "Excluir", icon: Trash2, onClick: () => void excluir(), variant: "danger", disabled: carregandoAcoes },
    { label: "Imprimir", icon: Printer, onClick: imprimir, variant: "outline", disabled: carregandoAcoes },
    { label: "Fechar", icon: X, onClick: fechar, variant: "outline" }
  ];

  return (
    <>
      <AdminPageLayout
        tabs={abas}
        activeTab={abaAtiva}
        onChangeTab={(tabId) => setAbaAtiva(tabId as AbaId)}
        actions={acoes}
        sectionLabel="Administração e gestão"
        pageTitle={tituloTela}
        activeIcon={abaAtiva === "cadastro" ? Bell : List}
        activeTitle={abaAtiva === "cadastro" ? "Cadastro De Lembretes" : "Lembretes Criados"}
        codeBadge={form.id ? `Código: ${form.id}` : "Novo"}
      >
        {abaAtiva === "cadastro" ? (
          <section className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1 md:col-span-2">
              <Label>Título *</Label>
              <Input
                value={form.titulo}
                onChange={(event) => setForm((atual) => ({ ...atual, titulo: event.target.value }))}
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Descrição</Label>
              <Textarea
                rows={3}
                value={form.descricao ?? ""}
                onChange={(event) => setForm((atual) => ({ ...atual, descricao: event.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Data Inicial *</Label>
              <Input
                type="date"
                value={form.dataInicial}
                onChange={(event) => setForm((atual) => ({ ...atual, dataInicial: event.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Hora Do Aviso</Label>
              <Input
                type="time"
                value={form.horaAviso ?? "09:00"}
                onChange={(event) => setForm((atual) => ({ ...atual, horaAviso: event.target.value }))}
              />
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-[var(--g3-foreground)] md:col-span-2">
              <input
                type="checkbox"
                checked={!!form.todosUsuarios}
                onChange={(event) =>
                  setForm((atual) => ({
                    ...atual,
                    todosUsuarios: event.target.checked,
                    usuarioId: event.target.checked ? null : atual.usuarioId
                  }))
                }
              />
              Lembrete Para Todos Os Usuários
            </label>
          </section>
        ) : (
          <section className="space-y-3">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1 md:col-span-2">
                <Label>Busca</Label>
                <Input
                  placeholder="Título ou descrição"
                  value={busca}
                  onChange={(event) => setBusca(event.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select
                  value={filtroStatus}
                  onChange={(event) => setFiltroStatus(event.target.value as FiltroStatus)}
                >
                  <option value="todos">Todos</option>
                  <option value="pendentes">Pendentes</option>
                  <option value="concluidos">Concluídos</option>
                  <option value="atrasados">Atrasados</option>
                </Select>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
                  <tr>
                    <th className="px-3 py-2 text-left">Título</th>
                    <th className="px-3 py-2 text-left">Data Inicial</th>
                    <th className="px-3 py-2 text-left">Hora</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-4 text-center">
                        Carregando lembretes...
                      </td>
                    </tr>
                  ) : lembretesFiltrados.length ? (
                    lembretesFiltrados.map((item, index) => (
                      <tr
                        key={item.id}
                        className={`border-t border-[var(--g3-border)] ${
                          index % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35"
                        }`}
                      >
                        <td className="px-3 py-2 font-medium">{item.titulo}</td>
                        <td className="px-3 py-2">{item.dataInicial || "---"}</td>
                        <td className="px-3 py-2">{item.horaAviso || "---"}</td>
                        <td className="px-3 py-2">{item.status || "---"}</td>
                        <td className="px-3 py-2">
                          <div className="flex justify-end gap-1">
                            <Button variant="outline" size="sm" onClick={() => selecionar(item)}>
                              Selecionar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={String(item.status).toUpperCase() === "CONCLUIDO"}
                              onClick={() => void concluir(item.id)}
                            >
                              <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                              Concluir
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setAdiarId(item.id);
                                setAdiarDataHora("");
                              }}
                            >
                              Adiar
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-3 py-4 text-center">
                        Nenhum lembrete encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </AdminPageLayout>

      {popupMensagem ? <PopupMensagem popup={popupMensagem} onClose={() => setPopupMensagem(null)} /> : null}

      <PopupConfirmacao
        aberto={confirmarExcluir}
        titulo="Confirmar Exclusão"
        texto="Esta ação é irreversível. Deseja continuar?"
        processando={excluirMutation.isPending}
        onCancel={() => setConfirmarExcluir(false)}
        onConfirm={() => void confirmarExclusao()}
        confirmarTexto="Excluir"
      />

      {adiarId ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 px-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-2xl">
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="text-base font-semibold text-slate-900">Adiar Lembrete</h3>
            </div>
            <div className="space-y-2 px-5 py-4">
              <Label>Nova Data E Hora *</Label>
              <Input
                type="datetime-local"
                value={adiarDataHora}
                onChange={(event) => setAdiarDataHora(event.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
              <Button
                variant="outline"
                onClick={() => {
                  setAdiarId(null);
                  setAdiarDataHora("");
                }}
              >
                Cancelar
              </Button>
              <Button onClick={() => void confirmarAdiamento()} disabled={adiarMutation.isPending}>
                {adiarMutation.isPending ? "Adiando..." : "Confirmar"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

