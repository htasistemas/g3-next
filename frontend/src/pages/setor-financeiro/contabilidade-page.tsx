import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Banknote,
  BookOpenText,
  Landmark,
  List,
  Plus,
  Printer,
  ReceiptText,
  Save,
  Search,
  Trash2,
  Undo2,
  Wallet,
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
  useAtualizarSituacaoLancamento,
  useAtualizarStatusEmendaContabil,
  useContasBancarias,
  useCriarEmendaContabil,
  useEmendasContabeis,
  useLancamentosContabeis,
  useMovimentacoesContabeis,
  usePagarLancamento,
  useRemoverContaBancaria,
  useRemoverLancamentoContabil,
  useRemoverMovimentacaoContabil,
  useSalvarContaBancaria,
  useSalvarLancamentoContabil,
  useSalvarMovimentacaoContabil
} from "@/features/contabilidade/use-contabilidade";
import type {
  ContaBancariaPayload,
  EmendaImpositivaPayload,
  LancamentoFinanceiroPayload,
  MovimentacaoFinanceiraPayload
} from "@/types/contabilidade";

type AbaId = "resumo" | "contas" | "lancamentos" | "movimentacoes" | "emendas";

type ExclusaoTipo = "conta" | "lancamento" | "movimentacao" | null;

const abas: AdminTab[] = [
  { id: "resumo", label: "Resumo", icon: List },
  { id: "contas", label: "Contas Bancárias", icon: Landmark },
  { id: "lancamentos", label: "Lançamentos", icon: ReceiptText },
  { id: "movimentacoes", label: "Movimentações", icon: Wallet },
  { id: "emendas", label: "Emendas", icon: BookOpenText }
];

const tituloTela = "Contabilidade";

const contaVazia: ContaBancariaPayload = {
  banco: "",
  numero: "",
  tipo: "Corrente",
  saldo: 0,
  dataAtualizacao: new Date().toISOString().slice(0, 10)
};

const lancamentoVazio: LancamentoFinanceiroPayload = {
  tipo: "Receita",
  descricao: "",
  contraparte: "",
  vencimento: new Date().toISOString().slice(0, 10),
  valor: 0,
  situacao: "Pendente"
};

const movimentacaoVazia: MovimentacaoFinanceiraPayload = {
  tipo: "Credito",
  descricao: "",
  dataMovimentacao: new Date().toISOString().slice(0, 10),
  valor: 0
};

const emendaVazia: EmendaImpositivaPayload = {
  identificacao: "",
  dataPrevista: new Date().toISOString().slice(0, 10),
  valorPrevisto: 0,
  diasAlerta: 15,
  status: "Pendente"
};

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarData(valor?: string) {
  if (!valor) return "Não informada";
  const partes = valor.split("-");
  if (partes.length === 3) {
    const [ano, mes, dia] = partes;
    return `${dia}/${mes}/${ano}`;
  }
  return valor;
}

export function ContabilidadePage() {
  const navigate = useNavigate();
  const [abaAtiva, setAbaAtiva] = useState<AbaId>("resumo");
  const [filtro, setFiltro] = useState("");
  const [contaSelecionadaId, setContaSelecionadaId] = useState<number>();
  const [lancamentoSelecionadoId, setLancamentoSelecionadoId] = useState<number>();
  const [movimentacaoSelecionadaId, setMovimentacaoSelecionadaId] = useState<number>();
  const [contaForm, setContaForm] = useState<ContaBancariaPayload>(contaVazia);
  const [lancamentoForm, setLancamentoForm] = useState<LancamentoFinanceiroPayload>(lancamentoVazio);
  const [movimentacaoForm, setMovimentacaoForm] = useState<MovimentacaoFinanceiraPayload>(movimentacaoVazia);
  const [emendaForm, setEmendaForm] = useState<EmendaImpositivaPayload>(emendaVazia);
  const [popup, setPopup] = useState<PopupMensagemState | null>(null);
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);
  const [tipoExclusao, setTipoExclusao] = useState<ExclusaoTipo>(null);

  const contasQuery = useContasBancarias();
  const lancamentosQuery = useLancamentosContabeis();
  const movimentacoesQuery = useMovimentacoesContabeis();
  const emendasQuery = useEmendasContabeis();

  const salvarContaMutation = useSalvarContaBancaria();
  const removerContaMutation = useRemoverContaBancaria();
  const salvarLancamentoMutation = useSalvarLancamentoContabil();
  const removerLancamentoMutation = useRemoverLancamentoContabil();
  const atualizarSituacaoLancamentoMutation = useAtualizarSituacaoLancamento();
  const pagarLancamentoMutation = usePagarLancamento();
  const salvarMovimentacaoMutation = useSalvarMovimentacaoContabil();
  const removerMovimentacaoMutation = useRemoverMovimentacaoContabil();
  const criarEmendaMutation = useCriarEmendaContabil();
  const atualizarStatusEmendaMutation = useAtualizarStatusEmendaContabil();

  const contas = contasQuery.data ?? [];
  const lancamentos = lancamentosQuery.data ?? [];
  const movimentacoes = movimentacoesQuery.data ?? [];
  const emendas = emendasQuery.data ?? [];

  const resumo = useMemo(() => {
    const totalContas = contas.length;
    const saldoTotal = contas.reduce((acc, item) => acc + Number(item.saldo || 0), 0);
    const totalLancamentos = lancamentos.length;
    const pendentes = lancamentos.filter((item) => item.situacao.toLowerCase().includes("pend")).length;
    return { totalContas, saldoTotal, totalLancamentos, pendentes };
  }, [contas, lancamentos]);

  const contasFiltradas = useMemo(() => {
    const termo = filtro.trim().toLowerCase();
    if (!termo) return contas;
    return contas.filter((item) =>
      [
        item.banco,
        item.agencia,
        item.numero,
        item.tipo,
        item.projetoVinculado,
        item.tipoChavePix,
        item.chavePix
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(termo)
    );
  }, [filtro, contas]);

  const processando =
    salvarContaMutation.isPending ||
    removerContaMutation.isPending ||
    salvarLancamentoMutation.isPending ||
    removerLancamentoMutation.isPending ||
    atualizarSituacaoLancamentoMutation.isPending ||
    pagarLancamentoMutation.isPending ||
    salvarMovimentacaoMutation.isPending ||
    removerMovimentacaoMutation.isPending ||
    criarEmendaMutation.isPending ||
    atualizarStatusEmendaMutation.isPending;

  function novo() {
    setContaSelecionadaId(undefined);
    setLancamentoSelecionadoId(undefined);
    setMovimentacaoSelecionadaId(undefined);
    setContaForm(contaVazia);
    setLancamentoForm(lancamentoVazio);
    setMovimentacaoForm(movimentacaoVazia);
    setEmendaForm(emendaVazia);
    setAbaAtiva("contas");
  }

  function cancelar() {
    setContaForm(contaVazia);
    setLancamentoForm(lancamentoVazio);
    setMovimentacaoForm(movimentacaoVazia);
    setEmendaForm(emendaVazia);
  }

  function selecionarConta(item: (typeof contas)[number]) {
    setContaSelecionadaId(item.id);
    setContaForm(item);
  }

  async function salvar() {
    try {
      if (abaAtiva === "contas") {
        if (!contaForm.banco?.trim() || !contaForm.numero?.trim()) {
          setPopup({ tipo: "aviso", titulo: "Validação", texto: "Preencha banco e número da conta." });
          return;
        }
        const conta = await salvarContaMutation.mutateAsync({
          id: contaSelecionadaId,
          payload: contaForm
        });
        setContaSelecionadaId(conta.id);
        setContaForm(conta);
        setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Conta bancária salva com sucesso." });
        return;
      }

      if (abaAtiva === "lancamentos") {
        if (!lancamentoForm.descricao?.trim() || !lancamentoForm.contraparte?.trim()) {
          setPopup({ tipo: "aviso", titulo: "Validação", texto: "Preencha descrição e contraparte." });
          return;
        }
        const lancamento = await salvarLancamentoMutation.mutateAsync({
          id: lancamentoSelecionadoId,
          payload: lancamentoForm
        });
        setLancamentoSelecionadoId(lancamento.id);
        setLancamentoForm(lancamento);
        setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Lançamento salvo com sucesso." });
        return;
      }

      if (abaAtiva === "movimentacoes") {
        if (!movimentacaoForm.descricao?.trim()) {
          setPopup({ tipo: "aviso", titulo: "Validação", texto: "Preencha a descrição da movimentação." });
          return;
        }
        const movimentacao = await salvarMovimentacaoMutation.mutateAsync({
          id: movimentacaoSelecionadaId,
          payload: movimentacaoForm
        });
        setMovimentacaoSelecionadaId(movimentacao.id);
        setMovimentacaoForm(movimentacao);
        setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Movimentação salva com sucesso." });
        return;
      }

      if (abaAtiva === "emendas") {
        if (!emendaForm.identificacao?.trim()) {
          setPopup({ tipo: "aviso", titulo: "Validação", texto: "Preencha a identificação da emenda." });
          return;
        }
        await criarEmendaMutation.mutateAsync(emendaForm);
        setEmendaForm(emendaVazia);
        setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Emenda registrada com sucesso." });
      }
    } catch (error: any) {
      setPopup({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível salvar os dados."
      });
    }
  }

  function excluir() {
    if (abaAtiva === "contas" && contaSelecionadaId) {
      setTipoExclusao("conta");
      setConfirmarExclusao(true);
      return;
    }
    if (abaAtiva === "lancamentos" && lancamentoSelecionadoId) {
      setTipoExclusao("lancamento");
      setConfirmarExclusao(true);
      return;
    }
    if (abaAtiva === "movimentacoes" && movimentacaoSelecionadaId) {
      setTipoExclusao("movimentacao");
      setConfirmarExclusao(true);
      return;
    }

    setPopup({ tipo: "aviso", titulo: "Atenção", texto: "Selecione um registro para excluir." });
  }

  async function confirmarExclusaoRegistro() {
    try {
      if (tipoExclusao === "conta" && contaSelecionadaId) {
        await removerContaMutation.mutateAsync(contaSelecionadaId);
        setContaSelecionadaId(undefined);
        setContaForm(contaVazia);
      }
      if (tipoExclusao === "lancamento" && lancamentoSelecionadoId) {
        await removerLancamentoMutation.mutateAsync(lancamentoSelecionadoId);
        setLancamentoSelecionadoId(undefined);
        setLancamentoForm(lancamentoVazio);
      }
      if (tipoExclusao === "movimentacao" && movimentacaoSelecionadaId) {
        await removerMovimentacaoMutation.mutateAsync(movimentacaoSelecionadaId);
        setMovimentacaoSelecionadaId(undefined);
        setMovimentacaoForm(movimentacaoVazia);
      }
      setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Registro excluído com sucesso." });
    } catch (error: any) {
      setPopup({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível excluir o registro."
      });
    } finally {
      setConfirmarExclusao(false);
      setTipoExclusao(null);
    }
  }

  const acoes: AdminAction[] = [
    { label: "Buscar", icon: Search, onClick: () => setAbaAtiva("resumo"), variant: "outline" },
    { label: "Novo", icon: Plus, onClick: novo, variant: "default", disabled: processando },
    { label: "Salvar", icon: Save, onClick: () => void salvar(), variant: "default", disabled: processando },
    { label: "Cancelar", icon: Undo2, onClick: cancelar, variant: "outline", disabled: processando },
    { label: "Excluir", icon: Trash2, onClick: excluir, variant: "danger", disabled: processando },
    {
      label: "Imprimir",
      icon: Printer,
      onClick: () => {
        try {
          imprimirConteudoAtual({ titulo: "Contabilidade" });
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
        codeBadge={abaAtiva === "contas" && contaSelecionadaId ? `Conta: ${contaSelecionadaId}` : undefined}
      >
        {abaAtiva === "resumo" ? (
          <section className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card)] p-3">
                <p className="text-xs font-semibold text-[var(--g3-muted)]">Contas cadastradas</p>
                <p className="mt-1 text-2xl font-bold text-[var(--g3-active)]">{resumo.totalContas}</p>
              </div>
              <div className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card)] p-3">
                <p className="text-xs font-semibold text-[var(--g3-muted)]">Saldo total</p>
                <p className="mt-1 text-2xl font-bold text-[var(--g3-active)]">{formatarMoeda(resumo.saldoTotal)}</p>
              </div>
              <div className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card)] p-3">
                <p className="text-xs font-semibold text-[var(--g3-muted)]">Lançamentos</p>
                <p className="mt-1 text-2xl font-bold text-[var(--g3-active)]">{resumo.totalLancamentos}</p>
              </div>
              <div className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card)] p-3">
                <p className="text-xs font-semibold text-[var(--g3-muted)]">Pendentes</p>
                <p className="mt-1 text-2xl font-bold text-[var(--g3-danger)]">{resumo.pendentes}</p>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Filtro rápido de contas</Label>
              <Input value={filtro} onChange={(event) => setFiltro(event.target.value)} placeholder="Banco, número ou tipo" />
            </div>
            <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
                  <tr>
                    <th className="px-3 py-2 text-left">Banco</th>
                    <th className="px-3 py-2 text-left">Número</th>
                    <th className="px-3 py-2 text-left">Tipo</th>
                    <th className="px-3 py-2 text-left">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {contasQuery.isLoading ? (
                    <tr><td colSpan={4} className="px-3 py-4 text-center">Carregando contas...</td></tr>
                  ) : contasFiltradas.length ? (
                    contasFiltradas.map((item, index) => (
                      <tr key={item.id} className={`border-t border-[var(--g3-border)] ${index % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35"}`}>
                        <td className="px-3 py-2">{item.banco}</td>
                        <td className="px-3 py-2">{item.numero}</td>
                        <td className="px-3 py-2">{item.tipo}</td>
                        <td className="px-3 py-2">{formatarMoeda(item.saldo)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={4} className="px-3 py-4 text-center">Nenhuma conta encontrada.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {abaAtiva === "contas" ? (
          <section className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-1"><Label>Banco *</Label><Input value={contaForm.banco} onChange={(event) => setContaForm((atual) => ({ ...atual, banco: event.target.value }))} /></div>
              <div className="space-y-1"><Label>Agência</Label><Input value={contaForm.agencia ?? ""} onChange={(event) => setContaForm((atual) => ({ ...atual, agencia: event.target.value }))} /></div>
              <div className="space-y-1"><Label>Número *</Label><Input value={contaForm.numero} onChange={(event) => setContaForm((atual) => ({ ...atual, numero: event.target.value }))} /></div>
              <div className="space-y-1"><Label>Tipo *</Label><Input value={contaForm.tipo} onChange={(event) => setContaForm((atual) => ({ ...atual, tipo: event.target.value }))} /></div>
              <div className="space-y-1"><Label>Saldo</Label><Input type="number" min={0} step="0.01" value={contaForm.saldo} onChange={(event) => setContaForm((atual) => ({ ...atual, saldo: Number(event.target.value) || 0 }))} /></div>
              <div className="space-y-1"><Label>Data atualização</Label><Input type="date" value={contaForm.dataAtualizacao} onChange={(event) => setContaForm((atual) => ({ ...atual, dataAtualizacao: event.target.value }))} /></div>
            </div>
            <div className="space-y-1">
              <Label>Localizar conta</Label>
              <Input
                value={filtro}
                onChange={(event) => setFiltro(event.target.value)}
                placeholder="Banco, agência, número, tipo ou chave Pix"
              />
            </div>
            {contasQuery.isLoading ? (
              <div className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card)] px-4 py-6 text-center text-sm text-[var(--g3-muted)]">
                Carregando contas bancárias...
              </div>
            ) : contasQuery.isError ? (
              <div className="rounded-lg border border-[var(--g3-danger)]/30 bg-[var(--g3-danger)]/10 px-4 py-6 text-center text-sm text-[var(--g3-danger)]">
                Não foi possível carregar as contas bancárias.
              </div>
            ) : contasFiltradas.length ? (
              <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                {contasFiltradas.map((item) => {
                  const selecionada = contaSelecionadaId === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => selecionarConta(item)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          selecionarConta(item);
                        }
                      }}
                      className={`rounded-xl border p-4 text-left transition duration-200 ${
                        selecionada
                          ? "border-emerald-500 bg-emerald-100/95 shadow-[0_18px_38px_-24px_rgba(5,150,105,0.8)]"
                          : "border-emerald-200 bg-emerald-50/85 shadow-[0_14px_30px_-26px_rgba(22,163,74,0.9)] hover:border-emerald-400 hover:bg-emerald-100/80 hover:shadow-[0_20px_36px_-24px_rgba(5,150,105,0.7)]"
                      }`}
                      role="button"
                      tabIndex={0}
                      aria-pressed={selecionada}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-[var(--g3-muted)]">Banco</p>
                          <h3 className="text-base font-semibold text-[var(--g3-foreground)]">{item.banco}</h3>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            selecionada
                              ? "bg-[var(--g3-active)] text-white"
                              : "bg-[var(--g3-card-soft)] text-[var(--g3-muted)]"
                          }`}
                        >
                          {selecionada ? "Selecionada" : item.tipo}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div>
                          <p className="text-xs font-semibold text-[var(--g3-muted)]">Conta</p>
                          <p className="mt-1 text-sm text-[var(--g3-foreground)]">{item.numero}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-[var(--g3-muted)]">Agência</p>
                          <p className="mt-1 text-sm text-[var(--g3-foreground)]">{item.agencia || "Não informada"}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-[var(--g3-muted)]">Saldo atual</p>
                          <p className="mt-1 text-sm font-semibold text-[var(--g3-active)]">{formatarMoeda(item.saldo)}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-[var(--g3-muted)]">Atualização</p>
                          <p className="mt-1 text-sm text-[var(--g3-foreground)]">{formatarData(item.dataAtualizacao)}</p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {item.projetoVinculado ? (
                          <span className="rounded-full bg-[var(--g3-card-soft)] px-2.5 py-1 text-xs text-[var(--g3-muted)]">
                            Projeto: {item.projetoVinculado}
                          </span>
                        ) : null}
                        {item.pixVinculado ? (
                          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs text-emerald-700">
                            Pix {item.tipoChavePix ? `• ${item.tipoChavePix}` : "vinculado"}
                          </span>
                        ) : null}
                        {item.recebimentoLocal ? (
                          <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs text-sky-700">
                            Recebimento local
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-4 flex justify-end">
                        <Button
                          type="button"
                          size="sm"
                          variant={selecionada ? "default" : "outline"}
                          disabled={processando}
                          onClick={(event) => {
                            event.stopPropagation();
                            selecionarConta(item);
                          }}
                        >
                          {selecionada ? "Em edição" : "Selecionar"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card)] px-4 py-6 text-center text-sm text-[var(--g3-muted)]">
                Nenhuma conta bancária encontrada com o filtro informado.
              </div>
            )}
          </section>
        ) : null}

        {abaAtiva === "lancamentos" ? (
          <section className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-1"><Label>Tipo</Label><Input value={lancamentoForm.tipo} onChange={(event) => setLancamentoForm((atual) => ({ ...atual, tipo: event.target.value }))} /></div>
              <div className="space-y-1 xl:col-span-2"><Label>Descrição *</Label><Input value={lancamentoForm.descricao} onChange={(event) => setLancamentoForm((atual) => ({ ...atual, descricao: event.target.value }))} /></div>
              <div className="space-y-1"><Label>Situação</Label><Input value={lancamentoForm.situacao} onChange={(event) => setLancamentoForm((atual) => ({ ...atual, situacao: event.target.value }))} /></div>
              <div className="space-y-1"><Label>Contraparte *</Label><Input value={lancamentoForm.contraparte} onChange={(event) => setLancamentoForm((atual) => ({ ...atual, contraparte: event.target.value }))} /></div>
              <div className="space-y-1"><Label>Vencimento</Label><Input type="date" value={lancamentoForm.vencimento} onChange={(event) => setLancamentoForm((atual) => ({ ...atual, vencimento: event.target.value }))} /></div>
              <div className="space-y-1"><Label>Valor</Label><Input type="number" min={0} step="0.01" value={lancamentoForm.valor} onChange={(event) => setLancamentoForm((atual) => ({ ...atual, valor: Number(event.target.value) || 0 }))} /></div>
            </div>
            <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]"><tr><th className="px-3 py-2 text-left">Descrição</th><th className="px-3 py-2 text-left">Contraparte</th><th className="px-3 py-2 text-left">Situação</th><th className="px-3 py-2 text-left">Valor</th><th className="px-3 py-2 text-right">Ações</th></tr></thead>
                <tbody>
                  {lancamentos.length ? lancamentos.map((item, index) => (
                    <tr key={item.id} className={`border-t border-[var(--g3-border)] ${index % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35"}`}>
                      <td className="px-3 py-2">{item.descricao}</td><td className="px-3 py-2">{item.contraparte}</td><td className="px-3 py-2">{item.situacao}</td><td className="px-3 py-2">{item.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                      <td className="px-3 py-2 text-right space-x-1">
                        <Button size="sm" variant="outline" onClick={() => { setLancamentoSelecionadoId(item.id); setLancamentoForm(item); }}>Selecionar</Button>
                        <Button size="sm" variant="ghost" onClick={() => void atualizarSituacaoLancamentoMutation.mutateAsync({ id: item.id, status: "Pago" })}>Marcar pago</Button>
                        <Button size="sm" variant="ghost" onClick={() => void pagarLancamentoMutation.mutateAsync({ id: item.id })}>Pagar</Button>
                      </td>
                    </tr>
                  )) : <tr><td colSpan={5} className="px-3 py-4 text-center">Nenhum lançamento cadastrado.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {abaAtiva === "movimentacoes" ? (
          <section className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-1"><Label>Tipo</Label><Input value={movimentacaoForm.tipo} onChange={(event) => setMovimentacaoForm((atual) => ({ ...atual, tipo: event.target.value }))} /></div>
              <div className="space-y-1 xl:col-span-2"><Label>Descrição *</Label><Input value={movimentacaoForm.descricao} onChange={(event) => setMovimentacaoForm((atual) => ({ ...atual, descricao: event.target.value }))} /></div>
              <div className="space-y-1"><Label>Data</Label><Input type="date" value={movimentacaoForm.dataMovimentacao} onChange={(event) => setMovimentacaoForm((atual) => ({ ...atual, dataMovimentacao: event.target.value }))} /></div>
              <div className="space-y-1"><Label>Conta bancária</Label><Select value={movimentacaoForm.contaBancariaId ? String(movimentacaoForm.contaBancariaId) : ""} onChange={(event) => setMovimentacaoForm((atual) => ({ ...atual, contaBancariaId: Number(event.target.value) || undefined }))}><option value="">Selecione</option>{contas.map((conta) => <option key={conta.id} value={conta.id}>{conta.banco} - {conta.numero}</option>)}</Select></div>
              <div className="space-y-1"><Label>Valor</Label><Input type="number" min={0} step="0.01" value={movimentacaoForm.valor} onChange={(event) => setMovimentacaoForm((atual) => ({ ...atual, valor: Number(event.target.value) || 0 }))} /></div>
              <div className="space-y-1"><Label>Categoria</Label><Input value={movimentacaoForm.categoria ?? ""} onChange={(event) => setMovimentacaoForm((atual) => ({ ...atual, categoria: event.target.value }))} /></div>
              <div className="space-y-1"><Label>Contraparte</Label><Input value={movimentacaoForm.contraparte ?? ""} onChange={(event) => setMovimentacaoForm((atual) => ({ ...atual, contraparte: event.target.value }))} /></div>
            </div>
            <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]"><tr><th className="px-3 py-2 text-left">Descrição</th><th className="px-3 py-2 text-left">Conta</th><th className="px-3 py-2 text-left">Valor</th><th className="px-3 py-2 text-left">Data</th><th className="px-3 py-2 text-right">Ações</th></tr></thead>
                <tbody>
                  {movimentacoes.length ? movimentacoes.map((item, index) => (
                    <tr key={item.id} className={`border-t border-[var(--g3-border)] ${index % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35"}`}>
                      <td className="px-3 py-2">{item.descricao}</td><td className="px-3 py-2">{item.contaBancariaBanco ? `${item.contaBancariaBanco} - ${item.contaBancariaNumero}` : "---"}</td><td className="px-3 py-2">{item.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td><td className="px-3 py-2">{item.dataMovimentacao}</td>
                      <td className="px-3 py-2 text-right"><Button size="sm" variant="outline" onClick={() => { setMovimentacaoSelecionadaId(item.id); setMovimentacaoForm(item); }}>Selecionar</Button></td>
                    </tr>
                  )) : <tr><td colSpan={5} className="px-3 py-4 text-center">Nenhuma movimentação cadastrada.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {abaAtiva === "emendas" ? (
          <section className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-1"><Label>Identificação *</Label><Input value={emendaForm.identificacao} onChange={(event) => setEmendaForm((atual) => ({ ...atual, identificacao: event.target.value }))} /></div>
              <div className="space-y-1"><Label>Referência legal</Label><Input value={emendaForm.referenciaLegal ?? ""} onChange={(event) => setEmendaForm((atual) => ({ ...atual, referenciaLegal: event.target.value }))} /></div>
              <div className="space-y-1"><Label>Data prevista</Label><Input type="date" value={emendaForm.dataPrevista} onChange={(event) => setEmendaForm((atual) => ({ ...atual, dataPrevista: event.target.value }))} /></div>
              <div className="space-y-1"><Label>Valor previsto</Label><Input type="number" min={0} step="0.01" value={emendaForm.valorPrevisto} onChange={(event) => setEmendaForm((atual) => ({ ...atual, valorPrevisto: Number(event.target.value) || 0 }))} /></div>
              <div className="space-y-1"><Label>Dias de alerta</Label><Input type="number" min={0} value={emendaForm.diasAlerta} onChange={(event) => setEmendaForm((atual) => ({ ...atual, diasAlerta: Number(event.target.value) || 0 }))} /></div>
              <div className="space-y-1"><Label>Status</Label><Select value={emendaForm.status} onChange={(event) => setEmendaForm((atual) => ({ ...atual, status: event.target.value }))}><option value="Pendente">Pendente</option><option value="Em analise">Em análise</option><option value="Aprovada">Aprovada</option><option value="Concluida">Concluída</option></Select></div>
              <div className="space-y-1 md:col-span-2 xl:col-span-4"><Label>Observações</Label><Textarea rows={2} value={emendaForm.observacoes ?? ""} onChange={(event) => setEmendaForm((atual) => ({ ...atual, observacoes: event.target.value }))} /></div>
            </div>
            <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]"><tr><th className="px-3 py-2 text-left">Identificação</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2 text-left">Valor</th><th className="px-3 py-2 text-right">Ações</th></tr></thead>
                <tbody>
                  {emendas.length ? emendas.map((item, index) => (
                    <tr key={item.id} className={`border-t border-[var(--g3-border)] ${index % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35"}`}>
                      <td className="px-3 py-2">{item.identificacao}</td><td className="px-3 py-2">{item.status}</td><td className="px-3 py-2">{item.valorPrevisto.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                      <td className="px-3 py-2 text-right"><Button size="sm" variant="outline" onClick={() => void atualizarStatusEmendaMutation.mutateAsync({ id: item.id, status: "Concluida" })}>Concluir</Button></td>
                    </tr>
                  )) : <tr><td colSpan={4} className="px-3 py-4 text-center">Nenhuma emenda cadastrada.</td></tr>}
                </tbody>
              </table>
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
