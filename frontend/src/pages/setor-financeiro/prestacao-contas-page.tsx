import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BadgeDollarSign,
  ClipboardList,
  FileCheck,
  List,
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
import { AdminPageLayout, type AdminAction, type AdminTab } from "@/components/admin/admin-page-layout";
import { PopupConfirmacao, PopupMensagem, type PopupMensagemState } from "@/components/admin/admin-popups";
import { imprimirConteudoAtual } from "@/lib/report-utils";
import {
  useExcluirPrestacaoContas,
  usePrestacoesContas,
  useSalvarPrestacaoContas
} from "@/features/prestacao-contas/use-prestacao-contas";
import type {
  PrestacaoChecklist,
  PrestacaoComprovante,
  PrestacaoContasPayload,
  PrestacaoDestinacao,
  PrestacaoRecebimento,
  PrestacaoTimeline
} from "@/types/prestacao-contas";

type AbaId = "listagem" | "indicadores" | "recebimentos" | "destinacoes" | "comprovantes";

const abas: AdminTab[] = [
  { id: "listagem", label: "Listagem", icon: List },
  { id: "indicadores", label: "Indicadores", icon: BadgeDollarSign },
  { id: "recebimentos", label: "Recebimentos", icon: BadgeDollarSign },
  { id: "destinacoes", label: "Destinações", icon: ClipboardList },
  { id: "comprovantes", label: "Comprovantes E Checklist", icon: FileCheck }
];

const tituloTela = "Prestação de contas";

const registroVazio: PrestacaoContasPayload = {
  recebimentos: [],
  destinacoes: [],
  comprovantes: [],
  timelines: [],
  checklist: []
};

const recebimentoVazio: PrestacaoRecebimento = { fonte: "" };
const destinacaoVazia: PrestacaoDestinacao = { titulo: "" };
const comprovanteVazio: PrestacaoComprovante = { titulo: "" };
const timelineVazio: PrestacaoTimeline = { titulo: "", status: "pendente" };
const checklistVazio: PrestacaoChecklist = { titulo: "", status: "pendente" };

export function PrestacaoContasPage() {
  const navigate = useNavigate();
  const [abaAtiva, setAbaAtiva] = useState<AbaId>("listagem");
  const [registroSelecionadoId, setRegistroSelecionadoId] = useState<string>();
  const [filtro, setFiltro] = useState("");
  const [form, setForm] = useState<PrestacaoContasPayload>(registroVazio);
  const [snapshot, setSnapshot] = useState<PrestacaoContasPayload>(registroVazio);
  const [novoRecebimento, setNovoRecebimento] = useState<PrestacaoRecebimento>(recebimentoVazio);
  const [novaDestinacao, setNovaDestinacao] = useState<PrestacaoDestinacao>(destinacaoVazia);
  const [novoComprovante, setNovoComprovante] = useState<PrestacaoComprovante>(comprovanteVazio);
  const [novaTimeline, setNovaTimeline] = useState<PrestacaoTimeline>(timelineVazio);
  const [novoChecklist, setNovoChecklist] = useState<PrestacaoChecklist>(checklistVazio);
  const [popup, setPopup] = useState<PopupMensagemState | null>(null);
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);

  const prestacoesQuery = usePrestacoesContas();
  const salvarMutation = useSalvarPrestacaoContas();
  const excluirMutation = useExcluirPrestacaoContas();

  const prestacoes = prestacoesQuery.data ?? [];

  const registrosFiltrados = useMemo(() => {
    const termo = filtro.trim().toLowerCase();
    if (!termo) return prestacoes;
    return prestacoes.filter((item) => {
      const alvo = `${item.id} ${item.totalRecebidoHelper ?? ""} ${item.totalAplicadoHelper ?? ""}`;
      return alvo.toLowerCase().includes(termo);
    });
  }, [filtro, prestacoes]);

  const processando = salvarMutation.isPending || excluirMutation.isPending;

  function novo() {
    setRegistroSelecionadoId(undefined);
    setForm(registroVazio);
    setSnapshot(registroVazio);
    setAbaAtiva("indicadores");
  }

  function selecionarRegistro(id: string) {
    const registro = prestacoes.find((item) => item.id === id);
    if (!registro) return;
    setRegistroSelecionadoId(registro.id);
    setForm(registro);
    setSnapshot(registro);
    setAbaAtiva("indicadores");
  }

  function cancelar() {
    setForm(snapshot);
  }

  async function salvar() {
    try {
      const response = await salvarMutation.mutateAsync({
        id: registroSelecionadoId,
        payload: form
      });
      setRegistroSelecionadoId(response.id);
      setForm(response);
      setSnapshot(response);
      setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Prestação de contas salva com sucesso." });
    } catch (error: any) {
      setPopup({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível salvar a prestação de contas."
      });
    }
  }

  async function confirmarExclusaoRegistro() {
    if (!registroSelecionadoId) return;
    try {
      await excluirMutation.mutateAsync(registroSelecionadoId);
      setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Registro excluído com sucesso." });
      setConfirmarExclusao(false);
      novo();
    } catch (error: any) {
      setPopup({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível excluir o registro."
      });
    }
  }

  function adicionarRecebimento() {
    if (!novoRecebimento.fonte?.trim()) {
      setPopup({ tipo: "aviso", titulo: "Validação", texto: "Informe a fonte do recebimento." });
      return;
    }
    setForm((atual) => ({ ...atual, recebimentos: [...(atual.recebimentos ?? []), novoRecebimento] }));
    setNovoRecebimento(recebimentoVazio);
  }

  function adicionarDestinacao() {
    if (!novaDestinacao.titulo?.trim()) {
      setPopup({ tipo: "aviso", titulo: "Validação", texto: "Informe o título da destinação." });
      return;
    }
    setForm((atual) => ({ ...atual, destinacoes: [...(atual.destinacoes ?? []), novaDestinacao] }));
    setNovaDestinacao(destinacaoVazia);
  }

  function adicionarComprovante() {
    if (!novoComprovante.titulo?.trim()) {
      setPopup({ tipo: "aviso", titulo: "Validação", texto: "Informe o título do comprovante." });
      return;
    }
    setForm((atual) => ({ ...atual, comprovantes: [...(atual.comprovantes ?? []), novoComprovante] }));
    setNovoComprovante(comprovanteVazio);
  }

  function adicionarTimeline() {
    if (!novaTimeline.titulo?.trim()) {
      setPopup({ tipo: "aviso", titulo: "Validação", texto: "Informe o título da timeline." });
      return;
    }
    setForm((atual) => ({ ...atual, timelines: [...(atual.timelines ?? []), novaTimeline] }));
    setNovaTimeline(timelineVazio);
  }

  function adicionarChecklist() {
    if (!novoChecklist.titulo?.trim()) {
      setPopup({ tipo: "aviso", titulo: "Validação", texto: "Informe o item do checklist." });
      return;
    }
    setForm((atual) => ({ ...atual, checklist: [...(atual.checklist ?? []), novoChecklist] }));
    setNovoChecklist(checklistVazio);
  }

  function removerItem(
    tipo: "recebimentos" | "destinacoes" | "comprovantes" | "timelines" | "checklist",
    indice: number
  ) {
    setForm((atual) => ({
      ...atual,
      [tipo]: (atual[tipo] ?? []).filter((_, idx) => idx !== indice)
    }));
  }

  const acoes: AdminAction[] = [
    { label: "Buscar", icon: Search, onClick: () => setAbaAtiva("listagem"), variant: "outline" },
    { label: "Novo", icon: Plus, onClick: novo, variant: "default", disabled: processando },
    { label: "Salvar", icon: Save, onClick: () => void salvar(), variant: "default", disabled: processando },
    { label: "Cancelar", icon: Undo2, onClick: cancelar, variant: "outline", disabled: processando },
    {
      label: "Excluir",
      icon: Trash2,
      onClick: () => setConfirmarExclusao(true),
      variant: "danger",
      disabled: processando || !registroSelecionadoId
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

  return (
    <>
      <AdminPageLayout
        tabs={abas}
        activeTab={abaAtiva}
        onChangeTab={(tabId) => setAbaAtiva(tabId as AbaId)}
        actions={acoes}
        sectionLabel="Setor financeiro"
        pageTitle={tituloTela}
        activeTitle={abas.find((item) => item.id === abaAtiva)?.label}
        codeBadge={registroSelecionadoId ? `Código: ${registroSelecionadoId}` : "Novo"}
      >
        {abaAtiva === "listagem" ? (
          <section className="space-y-3">
            <div className="space-y-1">
              <Label>Pesquisar</Label>
              <Input placeholder="Código ou descrição" value={filtro} onChange={(event) => setFiltro(event.target.value)} />
            </div>
            <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]"><tr><th className="px-3 py-2 text-left">Código</th><th className="px-3 py-2 text-left">Total recebido</th><th className="px-3 py-2 text-left">Total aplicado</th><th className="px-3 py-2 text-left">Saldo</th></tr></thead>
                <tbody>
                  {prestacoesQuery.isLoading ? (
                    <tr><td colSpan={4} className="px-3 py-4 text-center">Carregando registros...</td></tr>
                  ) : registrosFiltrados.length ? (
                    registrosFiltrados.map((item, index) => (
                      <tr key={item.id} className={`cursor-pointer border-t border-[var(--g3-border)] ${index % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35"}`} onClick={() => selecionarRegistro(item.id)}>
                        <td className="px-3 py-2 font-medium">{item.id}</td>
                        <td className="px-3 py-2">{item.totalRecebido?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) ?? "---"}</td>
                        <td className="px-3 py-2">{item.totalAplicado?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) ?? "---"}</td>
                        <td className="px-3 py-2">{item.saldoDisponivel?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) ?? "---"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={4} className="px-3 py-4 text-center">Nenhum registro encontrado.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {abaAtiva === "indicadores" ? (
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-1"><Label>Total recebido</Label><Input type="number" min={0} step="0.01" value={form.totalRecebido ?? ""} onChange={(event) => setForm((atual) => ({ ...atual, totalRecebido: event.target.value ? Number(event.target.value) : undefined }))} /></div>
            <div className="space-y-1"><Label>Total aplicado</Label><Input type="number" min={0} step="0.01" value={form.totalAplicado ?? ""} onChange={(event) => setForm((atual) => ({ ...atual, totalAplicado: event.target.value ? Number(event.target.value) : undefined }))} /></div>
            <div className="space-y-1"><Label>Saldo disponível</Label><Input type="number" min={0} step="0.01" value={form.saldoDisponivel ?? ""} onChange={(event) => setForm((atual) => ({ ...atual, saldoDisponivel: event.target.value ? Number(event.target.value) : undefined }))} /></div>
            <div className="space-y-1"><Label>Prestado no mês</Label><Input type="number" min={0} step="0.01" value={form.prestadoMes ?? ""} onChange={(event) => setForm((atual) => ({ ...atual, prestadoMes: event.target.value ? Number(event.target.value) : undefined }))} /></div>
            <div className="space-y-1 md:col-span-2 xl:col-span-4"><Label>Resumo auxiliar</Label><Textarea rows={2} value={form.totalRecebidoHelper ?? ""} onChange={(event) => setForm((atual) => ({ ...atual, totalRecebidoHelper: event.target.value }))} /></div>
          </section>
        ) : null}

        {abaAtiva === "recebimentos" ? (
          <section className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-1"><Label>Fonte *</Label><Input value={novoRecebimento.fonte} onChange={(event) => setNovoRecebimento((atual) => ({ ...atual, fonte: event.target.value }))} /></div>
              <div className="space-y-1"><Label>Valor</Label><Input type="number" min={0} step="0.01" value={novoRecebimento.valor ?? ""} onChange={(event) => setNovoRecebimento((atual) => ({ ...atual, valor: event.target.value ? Number(event.target.value) : undefined }))} /></div>
              <div className="space-y-1"><Label>Periodicidade</Label><Input value={novoRecebimento.periodicidade ?? ""} onChange={(event) => setNovoRecebimento((atual) => ({ ...atual, periodicidade: event.target.value }))} /></div>
              <div className="space-y-1"><Label>Status</Label><Input value={novoRecebimento.status ?? ""} onChange={(event) => setNovoRecebimento((atual) => ({ ...atual, status: event.target.value }))} /></div>
            </div>
            <Button type="button" size="sm" onClick={adicionarRecebimento}><Plus className="mr-1.5 h-3.5 w-3.5" />Adicionar recebimento</Button>
            <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
              <table className="min-w-full text-sm"><thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]"><tr><th className="px-3 py-2 text-left">Fonte</th><th className="px-3 py-2 text-left">Valor</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2 text-right">Ações</th></tr></thead><tbody>{(form.recebimentos ?? []).length ? (form.recebimentos ?? []).map((item, index) => <tr key={`${item.fonte}-${index}`} className={`border-t border-[var(--g3-border)] ${index % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35"}`}><td className="px-3 py-2">{item.fonte}</td><td className="px-3 py-2">{item.valor?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) ?? "---"}</td><td className="px-3 py-2">{item.status ?? "---"}</td><td className="px-3 py-2 text-right"><Button size="sm" variant="danger" onClick={() => removerItem("recebimentos", index)}>Remover</Button></td></tr>) : <tr><td colSpan={4} className="px-3 py-4 text-center">Nenhum recebimento.</td></tr>}</tbody></table>
            </div>
          </section>
        ) : null}

        {abaAtiva === "destinacoes" ? (
          <section className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-1 xl:col-span-2"><Label>Título *</Label><Input value={novaDestinacao.titulo} onChange={(event) => setNovaDestinacao((atual) => ({ ...atual, titulo: event.target.value }))} /></div>
              <div className="space-y-1"><Label>Percentual</Label><Input type="number" min={0} max={100} step="0.01" value={novaDestinacao.percentual ?? ""} onChange={(event) => setNovaDestinacao((atual) => ({ ...atual, percentual: event.target.value ? Number(event.target.value) : undefined }))} /></div>
              <div className="space-y-1"><Label>Descrição</Label><Input value={novaDestinacao.descricao ?? ""} onChange={(event) => setNovaDestinacao((atual) => ({ ...atual, descricao: event.target.value }))} /></div>
            </div>
            <Button type="button" size="sm" onClick={adicionarDestinacao}><Plus className="mr-1.5 h-3.5 w-3.5" />Adicionar destinação</Button>
            <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
              <table className="min-w-full text-sm"><thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]"><tr><th className="px-3 py-2 text-left">Título</th><th className="px-3 py-2 text-left">Percentual</th><th className="px-3 py-2 text-left">Descrição</th><th className="px-3 py-2 text-right">Ações</th></tr></thead><tbody>{(form.destinacoes ?? []).length ? (form.destinacoes ?? []).map((item, index) => <tr key={`${item.titulo}-${index}`} className={`border-t border-[var(--g3-border)] ${index % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35"}`}><td className="px-3 py-2">{item.titulo}</td><td className="px-3 py-2">{item.percentual != null ? `${item.percentual}%` : "---"}</td><td className="px-3 py-2">{item.descricao ?? "---"}</td><td className="px-3 py-2 text-right"><Button size="sm" variant="danger" onClick={() => removerItem("destinacoes", index)}>Remover</Button></td></tr>) : <tr><td colSpan={4} className="px-3 py-4 text-center">Nenhuma destinação.</td></tr>}</tbody></table>
            </div>
          </section>
        ) : null}

        {abaAtiva === "comprovantes" ? (
          <section className="space-y-4">
            <div className="rounded-lg border border-[var(--g3-border)] p-3">
              <h3 className="text-sm font-semibold text-[var(--g3-active)]">Novo comprovante</h3>
              <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-1"><Label>Título *</Label><Input value={novoComprovante.titulo} onChange={(event) => setNovoComprovante((atual) => ({ ...atual, titulo: event.target.value }))} /></div>
                <div className="space-y-1"><Label>Arquivo</Label><Input value={novoComprovante.arquivoNome ?? ""} onChange={(event) => setNovoComprovante((atual) => ({ ...atual, arquivoNome: event.target.value }))} /></div>
                <div className="space-y-1 xl:col-span-2"><Label>Descrição</Label><Input value={novoComprovante.descricao ?? ""} onChange={(event) => setNovoComprovante((atual) => ({ ...atual, descricao: event.target.value }))} /></div>
              </div>
              <div className="mt-3"><Button size="sm" onClick={adicionarComprovante}><Plus className="mr-1.5 h-3.5 w-3.5" />Adicionar comprovante</Button></div>
            </div>

            <div className="rounded-lg border border-[var(--g3-border)] p-3">
              <h3 className="text-sm font-semibold text-[var(--g3-active)]">Timeline</h3>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <div className="space-y-1"><Label>Título</Label><Input value={novaTimeline.titulo} onChange={(event) => setNovaTimeline((atual) => ({ ...atual, titulo: event.target.value }))} /></div>
                <div className="space-y-1"><Label>Detalhe</Label><Input value={novaTimeline.detalhe ?? ""} onChange={(event) => setNovaTimeline((atual) => ({ ...atual, detalhe: event.target.value }))} /></div>
                <div className="space-y-1"><Label>Status</Label><Select value={novaTimeline.status ?? "pendente"} onChange={(event) => setNovaTimeline((atual) => ({ ...atual, status: event.target.value }))}><option value="pendente">Pendente</option><option value="andamento">Em andamento</option><option value="concluido">Concluído</option></Select></div>
              </div>
              <div className="mt-3"><Button size="sm" onClick={adicionarTimeline}><Plus className="mr-1.5 h-3.5 w-3.5" />Adicionar timeline</Button></div>
            </div>

            <div className="rounded-lg border border-[var(--g3-border)] p-3">
              <h3 className="text-sm font-semibold text-[var(--g3-active)]">Checklist</h3>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <div className="space-y-1"><Label>Item</Label><Input value={novoChecklist.titulo} onChange={(event) => setNovoChecklist((atual) => ({ ...atual, titulo: event.target.value }))} /></div>
                <div className="space-y-1"><Label>Descrição</Label><Input value={novoChecklist.descricao ?? ""} onChange={(event) => setNovoChecklist((atual) => ({ ...atual, descricao: event.target.value }))} /></div>
                <div className="space-y-1"><Label>Status</Label><Select value={novoChecklist.status ?? "pendente"} onChange={(event) => setNovoChecklist((atual) => ({ ...atual, status: event.target.value }))}><option value="pendente">Pendente</option><option value="andamento">Em andamento</option><option value="concluido">Concluído</option></Select></div>
              </div>
              <div className="mt-3"><Button size="sm" onClick={adicionarChecklist}><Plus className="mr-1.5 h-3.5 w-3.5" />Adicionar checklist</Button></div>
            </div>

            <div className="grid gap-3 lg:grid-cols-3">
              <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]"><table className="min-w-full text-sm"><thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]"><tr><th className="px-3 py-2 text-left">Comprovantes</th><th className="px-3 py-2 text-right">Ações</th></tr></thead><tbody>{(form.comprovantes ?? []).length ? (form.comprovantes ?? []).map((item, index) => <tr key={`${item.titulo}-${index}`} className={`border-t border-[var(--g3-border)] ${index % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35"}`}><td className="px-3 py-2">{item.titulo}</td><td className="px-3 py-2 text-right"><Button size="sm" variant="danger" onClick={() => removerItem("comprovantes", index)}>Remover</Button></td></tr>) : <tr><td colSpan={2} className="px-3 py-4 text-center">Sem comprovantes.</td></tr>}</tbody></table></div>
              <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]"><table className="min-w-full text-sm"><thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]"><tr><th className="px-3 py-2 text-left">Timeline</th><th className="px-3 py-2 text-right">Ações</th></tr></thead><tbody>{(form.timelines ?? []).length ? (form.timelines ?? []).map((item, index) => <tr key={`${item.titulo}-${index}`} className={`border-t border-[var(--g3-border)] ${index % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35"}`}><td className="px-3 py-2">{item.titulo}</td><td className="px-3 py-2 text-right"><Button size="sm" variant="danger" onClick={() => removerItem("timelines", index)}>Remover</Button></td></tr>) : <tr><td colSpan={2} className="px-3 py-4 text-center">Sem timeline.</td></tr>}</tbody></table></div>
              <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]"><table className="min-w-full text-sm"><thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]"><tr><th className="px-3 py-2 text-left">Checklist</th><th className="px-3 py-2 text-right">Ações</th></tr></thead><tbody>{(form.checklist ?? []).length ? (form.checklist ?? []).map((item, index) => <tr key={`${item.titulo}-${index}`} className={`border-t border-[var(--g3-border)] ${index % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35"}`}><td className="px-3 py-2">{item.titulo}</td><td className="px-3 py-2 text-right"><Button size="sm" variant="danger" onClick={() => removerItem("checklist", index)}>Remover</Button></td></tr>) : <tr><td colSpan={2} className="px-3 py-4 text-center">Sem checklist.</td></tr>}</tbody></table></div>
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
