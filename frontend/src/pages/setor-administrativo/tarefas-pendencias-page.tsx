import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Activity,
  BarChart3,
  ListTodo,
  Pencil,
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
  useAdicionarHistoricoTarefaAdministrativa,
  useExcluirTarefaAdministrativa,
  useSalvarTarefaAdministrativa,
  useTarefasAdministrativas
} from "@/features/tarefas-administrativas/use-tarefas-administrativas";
import { imprimirConteudoAtual } from "@/lib/report-utils";
import type { TarefaAdministrativaPayload } from "@/types/tarefa-administrativa";

type AbaId = "cadastro" | "acompanhamento" | "listagem" | "dashboard";

const abas: AdminTab[] = [
  { id: "cadastro", label: "Cadastro E Controle", icon: Pencil },
  { id: "acompanhamento", label: "Acompanhamento Das Tarefas", icon: Activity },
  { id: "listagem", label: "Listagem Das Tarefas", icon: ListTodo },
  { id: "dashboard", label: "Dashboard E Alertas", icon: BarChart3 }
];

const tituloTela = "Tarefas e pendências";

type ChecklistDraft = {
  id?: number;
  titulo: string;
  concluido: boolean;
  ordem: number;
};

type FormState = TarefaAdministrativaPayload & { id?: string };

const defaultForm: FormState = {
  titulo: "",
  descricao: "",
  responsavel: "",
  prioridade: "Media",
  prazo: "",
  status: "Aberta",
  checklist: []
};

export function TarefasPendenciasPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [abaAtiva, setAbaAtiva] = useState<AbaId>("cadastro");
  const [busca, setBusca] = useState("");
  const [form, setForm] = useState<FormState>(defaultForm);
  const [snapshot, setSnapshot] = useState<FormState>(defaultForm);
  const [checklistRascunho, setChecklistRascunho] = useState<ChecklistDraft[]>([]);
  const [novoItemChecklist, setNovoItemChecklist] = useState("");
  const [historicoMensagem, setHistoricoMensagem] = useState("");
  const [popupMensagem, setPopupMensagem] = useState<PopupMensagemState | null>(null);
  const [confirmarExcluir, setConfirmarExcluir] = useState(false);

  const { data, isLoading } = useTarefasAdministrativas();
  const salvarMutation = useSalvarTarefaAdministrativa();
  const excluirMutation = useExcluirTarefaAdministrativa();
  const historicoMutation = useAdicionarHistoricoTarefaAdministrativa();

  const tarefas = data ?? [];

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const aba = params.get("tab");
    if (aba === "listagem") {
      setAbaAtiva("listagem");
    }
  }, [location.search]);

  const tarefasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return tarefas;
    return tarefas.filter((tarefa) => {
      const alvo = `${tarefa.titulo} ${tarefa.responsavel} ${tarefa.status}`.toLowerCase();
      return alvo.includes(termo);
    });
  }, [busca, tarefas]);

  const dashboard = useMemo(() => {
    const abertas = tarefas.filter((item) => item.status === "Aberta").length;
    const andamento = tarefas.filter((item) => item.status === "Em andamento").length;
    const concluidas = tarefas.filter((item) => item.status === "Concluida").length;
    const atrasadas = tarefas.filter((item) => item.status === "Em atraso").length;
    const totalChecklist = tarefas.reduce((acc, item) => acc + (item.checklist?.length ?? 0), 0);
    const concluidosChecklist = tarefas.reduce(
      (acc, item) => acc + (item.checklist?.filter((check) => check.concluido).length ?? 0),
      0
    );
    return {
      total: tarefas.length,
      abertas,
      andamento,
      concluidas,
      atrasadas,
      progressoChecklist:
        totalChecklist > 0 ? `${Math.round((concluidosChecklist / totalChecklist) * 100)}%` : "0%"
    };
  }, [tarefas]);

  const carregandoAcoes =
    salvarMutation.isPending || excluirMutation.isPending || historicoMutation.isPending;

  function novo() {
    setForm(defaultForm);
    setSnapshot(defaultForm);
    setChecklistRascunho([]);
    setNovoItemChecklist("");
    setHistoricoMensagem("");
    setAbaAtiva("cadastro");
  }

  function selecionar(id: string) {
    const tarefa = tarefas.find((item) => item.id === id);
    if (!tarefa) return;

    const proximo: FormState = {
      id: tarefa.id,
      titulo: tarefa.titulo,
      descricao: tarefa.descricao,
      responsavel: tarefa.responsavel,
      prioridade: tarefa.prioridade,
      prazo: tarefa.prazo ?? "",
      status: tarefa.status,
      checklist: tarefa.checklist?.map((item) => ({
        id: Number(item.id),
        titulo: item.titulo,
        concluido: item.concluido,
        concluidoEm: item.concluidoEm,
        ordem: item.ordem
      }))
    };

    setForm(proximo);
    setSnapshot(proximo);
    setChecklistRascunho(
      (tarefa.checklist ?? []).map((item, index) => ({
        id: Number(item.id),
        titulo: item.titulo,
        concluido: item.concluido,
        ordem: item.ordem ?? index
      }))
    );
    setAbaAtiva("cadastro");
  }

  function buscar() {
    setAbaAtiva("listagem");
  }

  function cancelar() {
    setForm(snapshot);
    setChecklistRascunho(
      (snapshot.checklist ?? []).map((item, index) => ({
        id: item.id,
        titulo: item.titulo,
        concluido: item.concluido,
        ordem: item.ordem ?? index
      }))
    );
  }

  async function salvar() {
    if (!form.titulo.trim() || !form.descricao.trim() || !form.responsavel.trim()) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Validação",
        texto: "Preencha título, descrição e responsável."
      });
      return;
    }

    try {
      const payload: TarefaAdministrativaPayload & { id?: string } = {
        id: form.id,
        titulo: form.titulo.trim(),
        descricao: form.descricao.trim(),
        responsavel: form.responsavel.trim(),
        prioridade: form.prioridade,
        prazo: form.prazo || undefined,
        status: form.status,
        checklist: checklistRascunho.map((item, index) => ({
          id: item.id,
          titulo: item.titulo,
          concluido: item.concluido,
          ordem: item.ordem ?? index
        }))
      };

      const response = await salvarMutation.mutateAsync(payload);
      const proximo: FormState = {
        id: response.id,
        titulo: response.titulo,
        descricao: response.descricao,
        responsavel: response.responsavel,
        prioridade: response.prioridade,
        prazo: response.prazo ?? "",
        status: response.status,
        checklist: response.checklist?.map((item) => ({
          id: Number(item.id),
          titulo: item.titulo,
          concluido: item.concluido,
          concluidoEm: item.concluidoEm,
          ordem: item.ordem
        }))
      };
      setForm(proximo);
      setSnapshot(proximo);
      setChecklistRascunho(
        (response.checklist ?? []).map((item, index) => ({
          id: Number(item.id),
          titulo: item.titulo,
          concluido: item.concluido,
          ordem: item.ordem ?? index
        }))
      );
      setPopupMensagem({ tipo: "sucesso", titulo: "Confirmação", texto: "Tarefa salva com sucesso." });
    } catch (error: any) {
      setPopupMensagem({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível salvar a tarefa."
      });
    }
  }

  function excluir() {
    if (!form.id) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Atenção",
        texto: "Selecione uma tarefa para excluir."
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
        texto: "Tarefa excluída com sucesso."
      });
    } catch (error: any) {
      setPopupMensagem({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível excluir a tarefa."
      });
    }
  }

  async function adicionarHistorico() {
    if (!form.id) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Atenção",
        texto: "Selecione uma tarefa para registrar histórico."
      });
      return;
    }
    if (!historicoMensagem.trim()) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Validação",
        texto: "Informe a mensagem do histórico."
      });
      return;
    }
    try {
      const response = await historicoMutation.mutateAsync({
        id: form.id,
        mensagem: historicoMensagem.trim()
      });
      setHistoricoMensagem("");
      setForm((atual) => ({
        ...atual,
        checklist: response.checklist?.map((item) => ({
          id: Number(item.id),
          titulo: item.titulo,
          concluido: item.concluido,
          concluidoEm: item.concluidoEm,
          ordem: item.ordem
        }))
      }));
      setPopupMensagem({
        tipo: "sucesso",
        titulo: "Confirmação",
        texto: "Histórico adicionado com sucesso."
      });
    } catch (error: any) {
      setPopupMensagem({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível adicionar histórico."
      });
    }
  }

  function adicionarChecklist() {
    const titulo = novoItemChecklist.trim();
    if (!titulo) return;
    setChecklistRascunho((atual) => [
      ...atual,
      {
        titulo,
        concluido: false,
        ordem: atual.length
      }
    ]);
    setNovoItemChecklist("");
  }

  function imprimir() {
    try {
      imprimirConteudoAtual({ titulo: "Relatório de tarefas" });
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

  async function alterarStatus(id: string, status: FormState["status"]) {
    const tarefa = tarefas.find((item) => item.id === id);
    if (!tarefa) return;
    await salvarMutation.mutateAsync({
      id: tarefa.id,
      titulo: tarefa.titulo,
      descricao: tarefa.descricao,
      responsavel: tarefa.responsavel,
      prioridade: tarefa.prioridade,
      prazo: tarefa.prazo,
      status,
      checklist: (tarefa.checklist ?? []).map((item) => ({
        id: Number(item.id),
        titulo: item.titulo,
        concluido: item.concluido,
        concluidoEm: item.concluidoEm,
        ordem: item.ordem
      }))
    });
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
        sectionLabel="Setor administrativo"
        pageTitle={tituloTela}
        activeTitle={abaAtiva === "listagem" ? "Listagem" : abas.find((item) => item.id === abaAtiva)?.label}
        codeBadge={form.id ? `Código: ${form.id}` : "Novo"}
      >
        {abaAtiva === "cadastro" ? (
          <div className="space-y-4">
            <section className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1 md:col-span-2">
                <Label>Título *</Label>
                <Input
                  value={form.titulo}
                  onChange={(event) => setForm((atual) => ({ ...atual, titulo: event.target.value }))}
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label>Descrição *</Label>
                <Textarea
                  rows={3}
                  value={form.descricao}
                  onChange={(event) =>
                    setForm((atual) => ({ ...atual, descricao: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Responsável *</Label>
                <Input
                  value={form.responsavel}
                  onChange={(event) =>
                    setForm((atual) => ({ ...atual, responsavel: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Prioridade *</Label>
                <Select
                  value={form.prioridade}
                  onChange={(event) =>
                    setForm((atual) => ({ ...atual, prioridade: event.target.value }))
                  }
                >
                  <option value="Alta">Alta</option>
                  <option value="Media">Média</option>
                  <option value="Baixa">Baixa</option>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Prazo</Label>
                <Input
                  type="date"
                  value={form.prazo ?? ""}
                  onChange={(event) => setForm((atual) => ({ ...atual, prazo: event.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Status *</Label>
                <Select
                  value={form.status}
                  onChange={(event) => setForm((atual) => ({ ...atual, status: event.target.value }))}
                >
                  <option value="Aberta">Aberta</option>
                  <option value="Em andamento">Em Andamento</option>
                  <option value="Concluida">Concluída</option>
                  <option value="Em atraso">Em Atraso</option>
                </Select>
              </div>
            </section>

            <section className="space-y-2 rounded-lg border border-[var(--g3-border)] p-3">
              <h3 className="text-sm font-semibold text-[var(--g3-foreground)]">Checklist</h3>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  placeholder="Adicionar item ao checklist"
                  value={novoItemChecklist}
                  onChange={(event) => setNovoItemChecklist(event.target.value)}
                />
                <Button onClick={adicionarChecklist}>Adicionar</Button>
              </div>
              <div className="space-y-1">
                {checklistRascunho.length ? (
                  checklistRascunho.map((item, index) => (
                    <label key={`${item.titulo}-${index}`} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={item.concluido}
                        onChange={(event) =>
                          setChecklistRascunho((atual) =>
                            atual.map((check, idx) =>
                              idx === index ? { ...check, concluido: event.target.checked } : check
                            )
                          )
                        }
                      />
                      {item.titulo}
                    </label>
                  ))
                ) : (
                  <p className="text-sm text-[var(--g3-muted)]">Nenhum item no checklist.</p>
                )}
              </div>
            </section>
          </div>
        ) : null}

        {abaAtiva === "acompanhamento" ? (
          <section className="space-y-3">
            <div className="grid gap-3 lg:grid-cols-4">
              {["Aberta", "Em andamento", "Em atraso", "Concluida"].map((status) => (
                <Card key={status} className="border-[var(--g3-border)]">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-[var(--g3-foreground)]">{status}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {tarefas
                      .filter((item) => item.status === status)
                      .slice(0, 6)
                      .map((item) => (
                        <article
                          key={item.id}
                          className="rounded-md border border-[var(--g3-border)] bg-[var(--g3-card)] p-2 text-xs"
                        >
                          <p className="font-semibold">{item.titulo}</p>
                          <p className="text-[var(--g3-muted)]">{item.responsavel}</p>
                          <Select
                            value={item.status}
                            className="mt-2 h-7 text-xs"
                            onChange={(event) => void alterarStatus(item.id, event.target.value)}
                          >
                            <option value="Aberta">Aberta</option>
                            <option value="Em andamento">Em Andamento</option>
                            <option value="Concluida">Concluída</option>
                            <option value="Em atraso">Em Atraso</option>
                          </Select>
                        </article>
                      ))}
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="border-[var(--g3-border)]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Histórico Operacional</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    placeholder="Digite a atualização da tarefa selecionada"
                    value={historicoMensagem}
                    onChange={(event) => setHistoricoMensagem(event.target.value)}
                  />
                  <Button onClick={() => void adicionarHistorico()} disabled={historicoMutation.isPending}>
                    Adicionar Histórico
                  </Button>
                </div>
                <p className="text-xs text-[var(--g3-muted)]">
                  Selecione uma tarefa na listagem para registrar histórico.
                </p>
              </CardContent>
            </Card>
          </section>
        ) : null}

        {abaAtiva === "listagem" ? (
          <section className="space-y-3">
            <div className="space-y-1">
              <Label>Buscar Tarefas</Label>
              <Input
                placeholder="Título, responsável ou status"
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
              />
            </div>

            <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
                  <tr>
                    <th className="px-3 py-2 text-left">Título</th>
                    <th className="px-3 py-2 text-left">Responsável</th>
                    <th className="px-3 py-2 text-left">Prioridade</th>
                    <th className="px-3 py-2 text-left">Prazo</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-4 text-center">
                        Carregando tarefas...
                      </td>
                    </tr>
                  ) : tarefasFiltradas.length ? (
                    tarefasFiltradas.map((item, index) => (
                      <tr
                        key={item.id}
                        className={`border-t border-[var(--g3-border)] ${
                          index % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35"
                        }`}
                      >
                        <td className="px-3 py-2 font-medium">{item.titulo}</td>
                        <td className="px-3 py-2">{item.responsavel}</td>
                        <td className="px-3 py-2">{item.prioridade}</td>
                        <td className="px-3 py-2">{item.prazo ?? "---"}</td>
                        <td className="px-3 py-2">{item.status}</td>
                        <td className="px-3 py-2 text-right">
                          <Button variant="outline" size="sm" onClick={() => selecionar(item.id)}>
                            Selecionar
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-3 py-4 text-center">
                        Nenhuma tarefa encontrada.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {abaAtiva === "dashboard" ? (
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <Card className="border-[var(--g3-border)]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Total De Tarefas</CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-semibold text-[var(--g3-active)]">
                {dashboard.total}
              </CardContent>
            </Card>
            <Card className="border-[var(--g3-border)]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Abertas</CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-semibold text-[var(--g3-active)]">
                {dashboard.abertas}
              </CardContent>
            </Card>
            <Card className="border-[var(--g3-border)]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Em Andamento</CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-semibold text-[var(--g3-active)]">
                {dashboard.andamento}
              </CardContent>
            </Card>
            <Card className="border-[var(--g3-border)]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Concluídas</CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-semibold text-[var(--g3-active)]">
                {dashboard.concluidas}
              </CardContent>
            </Card>
            <Card className="border-[var(--g3-border)]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Em Atraso</CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-semibold text-[var(--g3-danger)]">
                {dashboard.atrasadas}
              </CardContent>
            </Card>
            <Card className="border-[var(--g3-border)]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Progresso Do Checklist</CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-semibold text-[var(--g3-active)]">
                {dashboard.progressoChecklist}
              </CardContent>
            </Card>
          </section>
        ) : null}
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
    </>
  );
}
