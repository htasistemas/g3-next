import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Banknote,
  FileCheck,
  List,
  Plus,
  Printer,
  Save,
  Search,
  ShoppingCart,
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
  useAutorizacoesCompras,
  useCotacoesAutorizacao,
  useCriarCotacaoAutorizacao,
  useExcluirAutorizacaoCompra,
  useExcluirCotacaoAutorizacao,
  useGerarAutorizacaoPagamento,
  useRegistrarReservaAutorizacao,
  useRemoverReservaAutorizacao,
  useReservasAutorizacao,
  useSalvarAutorizacaoCompra
} from "@/features/autorizacao-compras/use-autorizacao-compras";
import { useContasBancarias } from "@/features/contabilidade/use-contabilidade";
import type {
  AutorizacaoCompraPayload,
  AutorizacaoCotacaoPayload,
  AutorizacaoPagamentoPayload,
  ReservaBancariaPayload
} from "@/types/autorizacao-compras";

type AbaId = "listagem" | "solicitacao" | "cotacoes" | "reserva";

const abas: AdminTab[] = [
  { id: "listagem", label: "Listagem De Autorizações", icon: List },
  { id: "solicitacao", label: "Solicitação", icon: ShoppingCart },
  { id: "cotacoes", label: "Cotações", icon: FileCheck },
  { id: "reserva", label: "Reserva Bancária", icon: Banknote }
];

const autorizacaoVazia: AutorizacaoCompraPayload = {
  titulo: "",
  tipo: "Compra",
  status: "Pendente",
  prioridade: "normal",
  quantidadeItens: 1,
  registroAlmoxarifado: false,
  registroPatrimonio: false,
  dispensarCotacao: false
};

const cotacaoVazia: AutorizacaoCotacaoPayload = {
  fornecedor: "",
  valor: 0
};

const reservaVazia: ReservaBancariaPayload = {
  contaBancariaId: 0,
  valor: 0
};

const pagamentoVazio: AutorizacaoPagamentoPayload = {
  autor: ""
};

export function AutorizacaoComprasPage() {
  const navigate = useNavigate();
  const [abaAtiva, setAbaAtiva] = useState<AbaId>("listagem");
  const [autorizacaoSelecionadaId, setAutorizacaoSelecionadaId] = useState<string>();
  const [filtro, setFiltro] = useState("");
  const [form, setForm] = useState<AutorizacaoCompraPayload>(autorizacaoVazia);
  const [snapshot, setSnapshot] = useState<AutorizacaoCompraPayload>(autorizacaoVazia);
  const [novaCotacao, setNovaCotacao] = useState<AutorizacaoCotacaoPayload>(cotacaoVazia);
  const [novaReserva, setNovaReserva] = useState<ReservaBancariaPayload>(reservaVazia);
  const [pagamentoForm, setPagamentoForm] = useState<AutorizacaoPagamentoPayload>(pagamentoVazio);
  const [popup, setPopup] = useState<PopupMensagemState | null>(null);
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);

  const autorizacoesQuery = useAutorizacoesCompras();
  const contasBancariasQuery = useContasBancarias();
  const cotacoesQuery = useCotacoesAutorizacao(autorizacaoSelecionadaId);
  const reservasQuery = useReservasAutorizacao(autorizacaoSelecionadaId);

  const salvarMutation = useSalvarAutorizacaoCompra();
  const excluirMutation = useExcluirAutorizacaoCompra();
  const criarCotacaoMutation = useCriarCotacaoAutorizacao();
  const excluirCotacaoMutation = useExcluirCotacaoAutorizacao(autorizacaoSelecionadaId);
  const registrarReservaMutation = useRegistrarReservaAutorizacao();
  const removerReservaMutation = useRemoverReservaAutorizacao(autorizacaoSelecionadaId);
  const gerarPagamentoMutation = useGerarAutorizacaoPagamento();

  const autorizacoes = autorizacoesQuery.data ?? [];
  const cotacoes = cotacoesQuery.data ?? [];
  const reservas = reservasQuery.data ?? [];
  const contasBancarias = contasBancariasQuery.data ?? [];

  const autorizacoesFiltradas = useMemo(() => {
    const termo = filtro.trim().toLowerCase();
    if (!termo) return autorizacoes;
    return autorizacoes.filter((item) => {
      const alvo = `${item.titulo} ${item.tipo} ${item.status} ${item.responsavel ?? ""}`;
      return alvo.toLowerCase().includes(termo);
    });
  }, [filtro, autorizacoes]);

  const processando =
    salvarMutation.isPending ||
    excluirMutation.isPending ||
    criarCotacaoMutation.isPending ||
    excluirCotacaoMutation.isPending ||
    registrarReservaMutation.isPending ||
    removerReservaMutation.isPending ||
    gerarPagamentoMutation.isPending;

  function novo() {
    setAutorizacaoSelecionadaId(undefined);
    setForm(autorizacaoVazia);
    setSnapshot(autorizacaoVazia);
    setNovaCotacao(cotacaoVazia);
    setNovaReserva(reservaVazia);
    setPagamentoForm(pagamentoVazio);
    setAbaAtiva("solicitacao");
  }

  function selecionarAutorizacao(id: string) {
    const item = autorizacoes.find((registro) => String(registro.id) === id);
    if (!item) return;
    setAutorizacaoSelecionadaId(String(item.id));
    setForm(item);
    setSnapshot(item);
    setAbaAtiva("solicitacao");
  }

  function cancelar() {
    setForm(snapshot);
  }

  async function salvar() {
    if (!form.titulo?.trim() || !form.tipo?.trim() || !form.status?.trim()) {
      setPopup({
        tipo: "aviso",
        titulo: "Validação",
        texto: "Preencha título, tipo e status."
      });
      return;
    }
    try {
      const response = await salvarMutation.mutateAsync({
        id: autorizacaoSelecionadaId,
        payload: form
      });
      setAutorizacaoSelecionadaId(String(response.id));
      setForm(response);
      setSnapshot(response);
      setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Autorização salva com sucesso." });
    } catch (error: any) {
      setPopup({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível salvar a autorização."
      });
    }
  }

  async function confirmarExclusaoAutorizacao() {
    if (!autorizacaoSelecionadaId) return;
    try {
      await excluirMutation.mutateAsync(autorizacaoSelecionadaId);
      setConfirmarExclusao(false);
      setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Autorização excluída com sucesso." });
      novo();
    } catch (error: any) {
      setPopup({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível excluir a autorização."
      });
    }
  }

  async function adicionarCotacao() {
    if (!autorizacaoSelecionadaId) {
      setPopup({ tipo: "aviso", titulo: "Atenção", texto: "Salve a autorização antes de incluir cotações." });
      return;
    }
    if (!novaCotacao.fornecedor?.trim() || !novaCotacao.valor) {
      setPopup({ tipo: "aviso", titulo: "Validação", texto: "Informe fornecedor e valor da cotação." });
      return;
    }
    try {
      await criarCotacaoMutation.mutateAsync({ id: autorizacaoSelecionadaId, payload: novaCotacao });
      setNovaCotacao(cotacaoVazia);
      setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Cotação adicionada com sucesso." });
    } catch (error: any) {
      setPopup({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível adicionar a cotação."
      });
    }
  }

  async function adicionarReserva() {
    if (!autorizacaoSelecionadaId) {
      setPopup({ tipo: "aviso", titulo: "Atenção", texto: "Salve a autorização antes de registrar reserva." });
      return;
    }
    if (!novaReserva.contaBancariaId || !novaReserva.valor) {
      setPopup({ tipo: "aviso", titulo: "Validação", texto: "Informe conta bancária e valor da reserva." });
      return;
    }
    try {
      await registrarReservaMutation.mutateAsync({ id: autorizacaoSelecionadaId, payload: novaReserva });
      setNovaReserva(reservaVazia);
      setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Reserva registrada com sucesso." });
    } catch (error: any) {
      setPopup({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível registrar a reserva."
      });
    }
  }

  async function gerarAutorizacaoPagamento() {
    if (!autorizacaoSelecionadaId) {
      setPopup({ tipo: "aviso", titulo: "Atenção", texto: "Selecione uma autorização para gerar pagamento." });
      return;
    }
    try {
      const response = await gerarPagamentoMutation.mutateAsync({
        id: autorizacaoSelecionadaId,
        payload: pagamentoForm
      });
      setForm(response);
      setSnapshot(response);
      setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Autorização de pagamento gerada com sucesso." });
    } catch (error: any) {
      setPopup({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível gerar a autorização de pagamento."
      });
    }
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
      disabled: processando || !autorizacaoSelecionadaId
    },
    {
      label: "Imprimir",
      icon: Printer,
      onClick: () => {
        try {
          imprimirConteudoAtual({ titulo: "Autorização de compras" });
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
        activeTitle={abas.find((item) => item.id === abaAtiva)?.label}
        codeBadge={autorizacaoSelecionadaId ? `Código: ${autorizacaoSelecionadaId}` : "Novo"}
      >
        {abaAtiva === "listagem" ? (
          <section className="space-y-3">
            <div className="space-y-1">
              <Label>Pesquisar autorização</Label>
              <Input
                placeholder="Título, tipo, status ou responsável"
                value={filtro}
                onChange={(event) => setFiltro(event.target.value)}
              />
            </div>
            <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
                  <tr>
                    <th className="px-3 py-2 text-left">Título</th>
                    <th className="px-3 py-2 text-left">Tipo</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {autorizacoesQuery.isLoading ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-center">Carregando autorizações...</td>
                    </tr>
                  ) : autorizacoesFiltradas.length ? (
                    autorizacoesFiltradas.map((item, index) => (
                      <tr
                        key={item.id}
                        className={`cursor-pointer border-t border-[var(--g3-border)] ${
                          index % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35"
                        }`}
                        onClick={() => selecionarAutorizacao(String(item.id))}
                      >
                        <td className="px-3 py-2 font-medium">{item.titulo}</td>
                        <td className="px-3 py-2">{item.tipo}</td>
                        <td className="px-3 py-2">{item.status}</td>
                        <td className="px-3 py-2">
                          {item.valor != null
                            ? item.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                            : "---"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-center">Nenhuma autorização encontrada.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {abaAtiva === "solicitacao" ? (
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-1 xl:col-span-2">
              <Label>Título *</Label>
              <Input value={form.titulo} onChange={(event) => setForm((atual) => ({ ...atual, titulo: event.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Tipo *</Label>
              <Input value={form.tipo} onChange={(event) => setForm((atual) => ({ ...atual, tipo: event.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Status *</Label>
              <Select value={form.status} onChange={(event) => setForm((atual) => ({ ...atual, status: event.target.value }))}>
                <option value="Pendente">Pendente</option>
                <option value="Aprovada">Aprovada</option>
                <option value="Reprovada">Reprovada</option>
                <option value="Concluida">Concluída</option>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Área</Label>
              <Input value={form.area ?? ""} onChange={(event) => setForm((atual) => ({ ...atual, area: event.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Responsável</Label>
              <Input value={form.responsavel ?? ""} onChange={(event) => setForm((atual) => ({ ...atual, responsavel: event.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Data prevista</Label>
              <Input type="date" value={form.dataPrevista ?? ""} onChange={(event) => setForm((atual) => ({ ...atual, dataPrevista: event.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Valor</Label>
              <Input type="number" min={0} step="0.01" value={form.valor ?? ""} onChange={(event) => setForm((atual) => ({ ...atual, valor: event.target.value ? Number(event.target.value) : undefined }))} />
            </div>
            <div className="space-y-1">
              <Label>Quantidade de itens</Label>
              <Input type="number" min={1} value={form.quantidadeItens ?? 1} onChange={(event) => setForm((atual) => ({ ...atual, quantidadeItens: Number(event.target.value) || 1 }))} />
            </div>
            <div className="space-y-1">
              <Label>Centro de custo</Label>
              <Input value={form.centroCusto ?? ""} onChange={(event) => setForm((atual) => ({ ...atual, centroCusto: event.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Prioridade</Label>
              <Select value={form.prioridade ?? "normal"} onChange={(event) => setForm((atual) => ({ ...atual, prioridade: event.target.value }))}>
                <option value="urgente">Urgente</option>
                <option value="normal">Normal</option>
                <option value="baixa">Baixa</option>
              </Select>
            </div>
            <div className="space-y-1 md:col-span-2 xl:col-span-4">
              <Label>Justificativa</Label>
              <Textarea rows={3} value={form.justificativa ?? ""} onChange={(event) => setForm((atual) => ({ ...atual, justificativa: event.target.value }))} />
            </div>
          </section>
        ) : null}

        {abaAtiva === "cotacoes" ? (
          <section className="space-y-4">
            <div className="rounded-lg border border-[var(--g3-border)] p-3">
              <h3 className="text-sm font-semibold text-[var(--g3-active)]">Nova cotação</h3>
              <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-1 xl:col-span-2">
                  <Label>Fornecedor *</Label>
                  <Input value={novaCotacao.fornecedor} onChange={(event) => setNovaCotacao((atual) => ({ ...atual, fornecedor: event.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>CNPJ</Label>
                  <Input value={novaCotacao.cnpj ?? ""} onChange={(event) => setNovaCotacao((atual) => ({ ...atual, cnpj: event.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Valor *</Label>
                  <Input type="number" min={0} step="0.01" value={novaCotacao.valor} onChange={(event) => setNovaCotacao((atual) => ({ ...atual, valor: Number(event.target.value) || 0 }))} />
                </div>
              </div>
              <div className="mt-3">
                <Button type="button" size="sm" onClick={() => void adicionarCotacao()} disabled={!autorizacaoSelecionadaId}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Adicionar cotação
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
                  <tr>
                    <th className="px-3 py-2 text-left">Fornecedor</th>
                    <th className="px-3 py-2 text-left">CNPJ</th>
                    <th className="px-3 py-2 text-left">Valor</th>
                    <th className="px-3 py-2 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {cotacoesQuery.isLoading && autorizacaoSelecionadaId ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-center">Carregando cotações...</td>
                    </tr>
                  ) : cotacoes.length ? (
                    cotacoes.map((item, index) => (
                      <tr key={item.id} className={`border-t border-[var(--g3-border)] ${index % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35"}`}>
                        <td className="px-3 py-2">{item.fornecedor}</td>
                        <td className="px-3 py-2">{item.cnpj ?? "---"}</td>
                        <td className="px-3 py-2">{item.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                        <td className="px-3 py-2 text-right">
                          <Button type="button" size="sm" variant="danger" onClick={() => void excluirCotacaoMutation.mutateAsync(String(item.id))}>
                            Remover
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-center">{autorizacaoSelecionadaId ? "Nenhuma cotação cadastrada." : "Selecione uma autorização."}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {abaAtiva === "reserva" ? (
          <section className="space-y-4">
            <div className="rounded-lg border border-[var(--g3-border)] p-3">
              <h3 className="text-sm font-semibold text-[var(--g3-active)]">Registrar reserva bancária</h3>
              <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-1 xl:col-span-2">
                  <Label>Conta bancária</Label>
                  <Select value={novaReserva.contaBancariaId ? String(novaReserva.contaBancariaId) : ""} onChange={(event) => setNovaReserva((atual) => ({ ...atual, contaBancariaId: Number(event.target.value) || 0 }))}>
                    <option value="">Selecione</option>
                    {contasBancarias.map((conta) => (
                      <option key={conta.id} value={conta.id}>{conta.banco} - {conta.numero}</option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Valor</Label>
                  <Input type="number" min={0} step="0.01" value={novaReserva.valor || ""} onChange={(event) => setNovaReserva((atual) => ({ ...atual, valor: Number(event.target.value) || 0 }))} />
                </div>
                <div className="flex items-end">
                  <Button type="button" className="w-full" onClick={() => void adicionarReserva()} disabled={!autorizacaoSelecionadaId}>
                    Adicionar reserva
                  </Button>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-[var(--g3-border)] p-3">
              <h3 className="text-sm font-semibold text-[var(--g3-active)]">Autorização de pagamento</h3>
              <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-1">
                  <Label>Autor</Label>
                  <Input value={pagamentoForm.autor ?? ""} onChange={(event) => setPagamentoForm((atual) => ({ ...atual, autor: event.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Data</Label>
                  <Input type="date" value={pagamentoForm.data ?? ""} onChange={(event) => setPagamentoForm((atual) => ({ ...atual, data: event.target.value }))} />
                </div>
                <div className="space-y-1 xl:col-span-2">
                  <Label>Observações</Label>
                  <Input value={pagamentoForm.observacoes ?? ""} onChange={(event) => setPagamentoForm((atual) => ({ ...atual, observacoes: event.target.value }))} />
                </div>
              </div>
              <div className="mt-3">
                <Button type="button" onClick={() => void gerarAutorizacaoPagamento()} disabled={!autorizacaoSelecionadaId}>
                  Gerar autorização de pagamento
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
                  <tr>
                    <th className="px-3 py-2 text-left">Conta</th>
                    <th className="px-3 py-2 text-left">Valor</th>
                    <th className="px-3 py-2 text-left">Criado em</th>
                    <th className="px-3 py-2 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {reservasQuery.isLoading && autorizacaoSelecionadaId ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-center">Carregando reservas...</td>
                    </tr>
                  ) : reservas.length ? (
                    reservas.map((item, index) => {
                      const conta = contasBancarias.find((registro) => registro.id === item.contaBancariaId);
                      return (
                        <tr key={item.id} className={`border-t border-[var(--g3-border)] ${index % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35"}`}>
                          <td className="px-3 py-2">{conta ? `${conta.banco} - ${conta.numero}` : item.contaBancariaId}</td>
                          <td className="px-3 py-2">{item.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                          <td className="px-3 py-2">{item.criadoEm.slice(0, 10)}</td>
                          <td className="px-3 py-2 text-right">
                            <Button type="button" size="sm" variant="danger" onClick={() => void removerReservaMutation.mutateAsync(item.contaBancariaId)}>
                              Remover
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-center">{autorizacaoSelecionadaId ? "Nenhuma reserva registrada." : "Selecione uma autorização."}</td>
                    </tr>
                  )}
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
        onConfirm={() => void confirmarExclusaoAutorizacao()}
        confirmarTexto="Excluir"
      />
    </>
  );
}
