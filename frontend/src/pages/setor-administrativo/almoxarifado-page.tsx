import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Boxes,
  BoxSelect,
  ChartBar,
  ClipboardList,
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
  useItensAlmoxarifado,
  useMovimentacoesAlmoxarifado,
  useProximoCodigoAlmoxarifado,
  useRegistrarMovimentacaoAlmoxarifado,
  useRemoverItemAlmoxarifado,
  useSalvarItemAlmoxarifado
} from "@/features/almoxarifado/use-almoxarifado";
import { imprimirConteudoAtual } from "@/lib/report-utils";
import { almoxarifadoService } from "@/services/almoxarifado.service";
import type { ComposicaoKitItem, ItemAlmoxarifado, MovimentacaoAlmoxarifado } from "@/types/almoxarifado";

type AbaId = "dashboards" | "cadastro" | "kit" | "itens" | "movimentacoes";

const abas: AdminTab[] = [
  { id: "dashboards", label: "Dashboards", icon: ChartBar },
  { id: "cadastro", label: "Cadastros De Itens", icon: BoxSelect },
  { id: "kit", label: "Composição Do Kit", icon: Boxes },
  { id: "itens", label: "Itens Do Almoxarifado", icon: ClipboardList },
  { id: "movimentacoes", label: "Movimentações", icon: ClipboardList }
];

const defaultItem: ItemAlmoxarifado = {
  codigo: "",
  descricao: "",
  categoria: "",
  unidade: "",
  estoque_atual: 0,
  estoque_minimo: 0,
  valor_unitario: 0,
  is_kit: false,
  situacao: "Ativo"
};

const defaultMovimento: MovimentacaoAlmoxarifado = {
  data_movimentacao: new Date().toISOString().slice(0, 10),
  tipo: "Entrada",
  codigo_item: "",
  quantidade: 1
};

export function AlmoxarifadoPage() {
  const navigate = useNavigate();
  const [abaAtiva, setAbaAtiva] = useState<AbaId>("dashboards");
  const [busca, setBusca] = useState("");
  const [itemForm, setItemForm] = useState<ItemAlmoxarifado>(defaultItem);
  const [itemSnapshot, setItemSnapshot] = useState<ItemAlmoxarifado>(defaultItem);
  const [movimentoForm, setMovimentoForm] = useState<MovimentacaoAlmoxarifado>(defaultMovimento);
  const [kitComposicao, setKitComposicao] = useState<ComposicaoKitItem[]>([]);
  const [novoKitItemId, setNovoKitItemId] = useState("");
  const [novoKitQuantidade, setNovoKitQuantidade] = useState("1");
  const [popupMensagem, setPopupMensagem] = useState<PopupMensagemState | null>(null);
  const [confirmarExcluir, setConfirmarExcluir] = useState(false);

  const { data: itensData, isLoading: carregandoItens } = useItensAlmoxarifado();
  const { data: movimentacoesData, isLoading: carregandoMovimentacoes } = useMovimentacoesAlmoxarifado();
  const { data: proximoCodigoData } = useProximoCodigoAlmoxarifado();
  const salvarMutation = useSalvarItemAlmoxarifado();
  const removerMutation = useRemoverItemAlmoxarifado();
  const movimentarMutation = useRegistrarMovimentacaoAlmoxarifado();

  const itens = itensData?.itens ?? [];
  const movimentacoes = movimentacoesData?.movimentacoes ?? [];

  const itensFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return itens;
    return itens.filter((item) => {
      const alvo = `${item.codigo} ${item.descricao} ${item.categoria} ${item.situacao}`;
      return alvo.toLowerCase().includes(termo);
    });
  }, [busca, itens]);

  const dashboard = useMemo(() => {
    const total = itens.length;
    const abaixoMinimo = itens.filter((item) => Number(item.estoque_atual) <= Number(item.estoque_minimo)).length;
    const kits = itens.filter((item) => item.is_kit).length;
    const valorTotal = itens.reduce(
      (acc, item) => acc + Number(item.estoque_atual || 0) * Number(item.valor_unitario || 0),
      0
    );
    return { total, abaixoMinimo, kits, valorTotal };
  }, [itens]);

  const carregandoAcoes = salvarMutation.isPending || removerMutation.isPending || movimentarMutation.isPending;

  function novo() {
    const codigo = proximoCodigoData?.codigo ?? "";
    setItemForm({ ...defaultItem, codigo });
    setItemSnapshot({ ...defaultItem, codigo });
    setMovimentoForm({ ...defaultMovimento, codigo_item: codigo });
    setKitComposicao([]);
    setAbaAtiva("cadastro");
  }

  function cancelar() {
    setItemForm(itemSnapshot);
  }

  async function salvar() {
    try {
      if (abaAtiva === "movimentacoes") {
        if (!movimentoForm.codigo_item || !movimentoForm.quantidade) {
          setPopupMensagem({ tipo: "aviso", titulo: "Validação", texto: "Informe item e quantidade." });
          return;
        }
        await movimentarMutation.mutateAsync(movimentoForm);
        setMovimentoForm(defaultMovimento);
        setPopupMensagem({ tipo: "sucesso", titulo: "Confirmação", texto: "Movimentação registrada com sucesso." });
        return;
      }

      if (!itemForm.codigo || !itemForm.descricao || !itemForm.categoria || !itemForm.unidade) {
        setPopupMensagem({ tipo: "aviso", titulo: "Validação", texto: "Preencha código, descrição, categoria e unidade." });
        return;
      }
      const response = await salvarMutation.mutateAsync(itemForm);
      setItemForm(response);
      setItemSnapshot(response);

      if (abaAtiva === "kit" && response.id_item && response.is_kit) {
        await almoxarifadoService.atualizarComposicaoKit(response.id_item, kitComposicao);
      }
      setPopupMensagem({ tipo: "sucesso", titulo: "Confirmação", texto: "Item salvo com sucesso." });
    } catch (error: any) {
      setPopupMensagem({ tipo: "erro", titulo: "Erro", texto: error?.response?.data?.message ?? "Não foi possível salvar." });
    }
  }

  function excluir() {
    if (!itemForm.id_item) {
      setPopupMensagem({ tipo: "aviso", titulo: "Atenção", texto: "Selecione um item para excluir." });
      return;
    }
    setConfirmarExcluir(true);
  }

  async function confirmarExclusao() {
    if (!itemForm.id_item) return;
    try {
      await removerMutation.mutateAsync(itemForm.id_item);
      novo();
      setPopupMensagem({ tipo: "sucesso", titulo: "Confirmação", texto: "Item excluído com sucesso." });
    } catch (error: any) {
      setPopupMensagem({ tipo: "erro", titulo: "Erro", texto: error?.response?.data?.message ?? "Não foi possível excluir." });
    } finally {
      setConfirmarExcluir(false);
    }
  }

  async function selecionarItem(item: ItemAlmoxarifado) {
    setItemForm(item);
    setItemSnapshot(item);
    setMovimentoForm((atual) => ({ ...atual, codigo_item: item.codigo }));
    if (item.id_item && item.is_kit) {
      const composicao = await almoxarifadoService.listarComposicaoKit(item.id_item);
      setKitComposicao(composicao);
    } else {
      setKitComposicao([]);
    }
    setAbaAtiva("cadastro");
  }

  function adicionarItemKit() {
    const id = Number(novoKitItemId);
    const quantidade = Number(novoKitQuantidade);
    if (!id || !quantidade) return;
    const itemSelecionado = itens.find((item) => Number(item.id_item) === id);
    setKitComposicao((atual) => [
      ...atual,
      {
        produto_item_id: id,
        produto_item_codigo: itemSelecionado?.codigo,
        produto_item_descricao: itemSelecionado?.descricao,
        quantidade_item: quantidade
      }
    ]);
    setNovoKitItemId("");
    setNovoKitQuantidade("1");
  }

  function imprimir() {
    try {
      imprimirConteudoAtual({ titulo: "Relatório de almoxarifado" });
    } catch (error: any) {
      setPopupMensagem({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.message ?? "Não foi possível preparar a impressão."
      });
    }
  }

  const acoes: AdminAction[] = [
    { label: "Buscar", icon: Search, onClick: () => setAbaAtiva("itens"), variant: "outline" },
    { label: "Novo", icon: Plus, onClick: novo, variant: "default", disabled: carregandoAcoes },
    { label: "Salvar", icon: Save, onClick: () => void salvar(), variant: "default", disabled: carregandoAcoes },
    { label: "Cancelar", icon: Undo2, onClick: cancelar, variant: "outline", disabled: carregandoAcoes },
    { label: "Excluir", icon: Trash2, onClick: excluir, variant: "danger", disabled: carregandoAcoes },
    { label: "Imprimir", icon: Printer, onClick: imprimir, variant: "outline", disabled: carregandoAcoes },
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
        codeBadge={itemForm.id_item ? `Código: ${itemForm.codigo}` : "Novo"}
      >
        {abaAtiva === "dashboards" ? (
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Card className="border-[var(--g3-border)]"><CardHeader className="pb-2"><CardTitle className="text-sm">Total De Itens</CardTitle></CardHeader><CardContent className="text-3xl font-semibold text-[var(--g3-active)]">{dashboard.total}</CardContent></Card>
            <Card className="border-[var(--g3-border)]"><CardHeader className="pb-2"><CardTitle className="text-sm">Abaixo Do Mínimo</CardTitle></CardHeader><CardContent className="text-3xl font-semibold text-[var(--g3-danger)]">{dashboard.abaixoMinimo}</CardContent></Card>
            <Card className="border-[var(--g3-border)]"><CardHeader className="pb-2"><CardTitle className="text-sm">Kits</CardTitle></CardHeader><CardContent className="text-3xl font-semibold text-[var(--g3-active)]">{dashboard.kits}</CardContent></Card>
            <Card className="border-[var(--g3-border)]"><CardHeader className="pb-2"><CardTitle className="text-sm">Valor Total</CardTitle></CardHeader><CardContent className="text-3xl font-semibold text-[var(--g3-active)]">{dashboard.valorTotal.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</CardContent></Card>
          </section>
        ) : null}

        {abaAtiva === "cadastro" ? (
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-1"><Label>Código *</Label><Input value={itemForm.codigo} onChange={(event) => setItemForm((atual) => ({ ...atual, codigo: event.target.value }))} /></div>
            <div className="space-y-1 xl:col-span-2"><Label>Descrição *</Label><Input value={itemForm.descricao} onChange={(event) => setItemForm((atual) => ({ ...atual, descricao: event.target.value }))} /></div>
            <div className="space-y-1"><Label>Categoria *</Label><Input value={itemForm.categoria} onChange={(event) => setItemForm((atual) => ({ ...atual, categoria: event.target.value }))} /></div>
            <div className="space-y-1"><Label>Unidade *</Label><Input value={itemForm.unidade} onChange={(event) => setItemForm((atual) => ({ ...atual, unidade: event.target.value }))} /></div>
            <div className="space-y-1"><Label>Estoque Atual</Label><Input type="number" min={0} value={itemForm.estoque_atual} onChange={(event) => setItemForm((atual) => ({ ...atual, estoque_atual: Number(event.target.value) || 0 }))} /></div>
            <div className="space-y-1"><Label>Estoque Mínimo</Label><Input type="number" min={0} value={itemForm.estoque_minimo} onChange={(event) => setItemForm((atual) => ({ ...atual, estoque_minimo: Number(event.target.value) || 0 }))} /></div>
            <div className="space-y-1"><Label>Valor Unitário</Label><Input type="number" min={0} step="0.01" value={itemForm.valor_unitario} onChange={(event) => setItemForm((atual) => ({ ...atual, valor_unitario: Number(event.target.value) || 0 }))} /></div>
            <div className="space-y-1"><Label>Situação</Label><Select value={itemForm.situacao} onChange={(event) => setItemForm((atual) => ({ ...atual, situacao: event.target.value }))}><option value="Ativo">Ativo</option><option value="Inativo">Inativo</option><option value="Bloqueado">Bloqueado</option></Select></div>
            <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={!!itemForm.is_kit} onChange={(event) => setItemForm((atual) => ({ ...atual, is_kit: event.target.checked }))} />Item É Kit</label>
            <div className="space-y-1 md:col-span-2 xl:col-span-4"><Label>Observações</Label><Textarea rows={2} value={itemForm.observacoes ?? ""} onChange={(event) => setItemForm((atual) => ({ ...atual, observacoes: event.target.value }))} /></div>
          </section>
        ) : null}

        {abaAtiva === "kit" ? (
          <section className="space-y-3">
            <div className="grid gap-3 rounded-lg border border-[var(--g3-border)] p-3 md:grid-cols-3">
              <div className="space-y-1"><Label>Item Do Almoxarifado</Label><Select value={novoKitItemId} onChange={(event) => setNovoKitItemId(event.target.value)}><option value="">Selecione</option>{itens.filter((item) => !item.is_kit).map((item) => (<option key={item.id_item} value={item.id_item}>{item.codigo} - {item.descricao}</option>))}</Select></div>
              <div className="space-y-1"><Label>Quantidade</Label><Input type="number" min={1} value={novoKitQuantidade} onChange={(event) => setNovoKitQuantidade(event.target.value)} /></div>
              <div className="flex items-end"><Button className="w-full" onClick={adicionarItemKit}>Adicionar Item</Button></div>
            </div>
            <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
              <table className="min-w-full text-sm"><thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]"><tr><th className="px-3 py-2 text-left">Código</th><th className="px-3 py-2 text-left">Descrição</th><th className="px-3 py-2 text-left">Quantidade</th></tr></thead>
                <tbody>{kitComposicao.length ? kitComposicao.map((item, index) => (<tr key={`${item.produto_item_id}-${index}`} className={`border-t border-[var(--g3-border)] ${index % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35"}`}><td className="px-3 py-2">{item.produto_item_codigo ?? item.produto_item_id}</td><td className="px-3 py-2">{item.produto_item_descricao ?? "---"}</td><td className="px-3 py-2">{item.quantidade_item}</td></tr>)) : (<tr><td colSpan={3} className="px-3 py-4 text-center">Nenhum item no kit.</td></tr>)}</tbody>
              </table>
            </div>
          </section>
        ) : null}

        {abaAtiva === "itens" ? (
          <section className="space-y-3">
            <div className="space-y-1"><Label>Buscar Item</Label><Input placeholder="Código, descrição, categoria ou situação" value={busca} onChange={(event) => setBusca(event.target.value)} /></div>
            <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
              <table className="min-w-full text-sm"><thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]"><tr><th className="px-3 py-2 text-left">Código</th><th className="px-3 py-2 text-left">Descrição</th><th className="px-3 py-2 text-left">Categoria</th><th className="px-3 py-2 text-left">Estoque</th><th className="px-3 py-2 text-left">Situação</th></tr></thead>
                <tbody>{carregandoItens ? (<tr><td colSpan={5} className="px-3 py-4 text-center">Carregando itens...</td></tr>) : itensFiltrados.length ? itensFiltrados.map((item, index) => (<tr key={item.id_item ?? `${item.codigo}-${index}`} className={`border-t border-[var(--g3-border)] ${index % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35"}`} onClick={() => void selecionarItem(item)}><td className="px-3 py-2">{item.codigo}</td><td className="px-3 py-2">{item.descricao}</td><td className="px-3 py-2">{item.categoria}</td><td className="px-3 py-2">{item.estoque_atual}</td><td className="px-3 py-2">{item.situacao}</td></tr>)) : (<tr><td colSpan={5} className="px-3 py-4 text-center">Nenhum item encontrado.</td></tr>)}</tbody>
              </table>
            </div>
          </section>
        ) : null}

        {abaAtiva === "movimentacoes" ? (
          <section className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              <div className="space-y-1"><Label>Data</Label><Input type="date" value={movimentoForm.data_movimentacao} onChange={(event) => setMovimentoForm((atual) => ({ ...atual, data_movimentacao: event.target.value }))} /></div>
              <div className="space-y-1"><Label>Tipo</Label><Select value={movimentoForm.tipo} onChange={(event) => setMovimentoForm((atual) => ({ ...atual, tipo: event.target.value as MovimentacaoAlmoxarifado["tipo"] }))}><option value="Entrada">Entrada</option><option value="Saida">Saída</option><option value="Ajuste">Ajuste</option></Select></div>
              <div className="space-y-1"><Label>Item</Label><Select value={movimentoForm.codigo_item} onChange={(event) => setMovimentoForm((atual) => ({ ...atual, codigo_item: event.target.value }))}><option value="">Selecione</option>{itens.map((item) => (<option key={item.id_item} value={item.codigo}>{item.codigo} - {item.descricao}</option>))}</Select></div>
              <div className="space-y-1"><Label>Quantidade</Label><Input type="number" min={1} value={movimentoForm.quantidade} onChange={(event) => setMovimentoForm((atual) => ({ ...atual, quantidade: Number(event.target.value) || 1 }))} /></div>
              <div className="space-y-1"><Label>Responsável</Label><Input value={movimentoForm.responsavel ?? ""} onChange={(event) => setMovimentoForm((atual) => ({ ...atual, responsavel: event.target.value }))} /></div>
              <div className="space-y-1 md:col-span-2 xl:col-span-5"><Label>Observações</Label><Textarea rows={2} value={movimentoForm.observacoes ?? ""} onChange={(event) => setMovimentoForm((atual) => ({ ...atual, observacoes: event.target.value }))} /></div>
            </div>
            <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
              <table className="min-w-full text-sm"><thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]"><tr><th className="px-3 py-2 text-left">Data</th><th className="px-3 py-2 text-left">Tipo</th><th className="px-3 py-2 text-left">Item</th><th className="px-3 py-2 text-left">Quantidade</th><th className="px-3 py-2 text-left">Saldo</th></tr></thead>
                <tbody>{carregandoMovimentacoes ? (<tr><td colSpan={5} className="px-3 py-4 text-center">Carregando movimentações...</td></tr>) : movimentacoes.length ? movimentacoes.map((item, index) => (<tr key={item.id_movimentacao ?? `${item.codigo_item}-${index}`} className={`border-t border-[var(--g3-border)] ${index % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35"}`}><td className="px-3 py-2">{item.data_movimentacao}</td><td className="px-3 py-2">{item.tipo}</td><td className="px-3 py-2">{item.codigo_item}</td><td className="px-3 py-2">{item.quantidade}</td><td className="px-3 py-2">{item.saldo_apos ?? "---"}</td></tr>)) : (<tr><td colSpan={5} className="px-3 py-4 text-center">Nenhuma movimentação registrada.</td></tr>)}</tbody>
              </table>
            </div>
          </section>
        ) : null}
      </AdminPageLayout>

      {popupMensagem ? <PopupMensagem popup={popupMensagem} onClose={() => setPopupMensagem(null)} /> : null}
      <PopupConfirmacao
        aberto={confirmarExcluir}
        titulo="Confirmar Exclusão"
        texto="Esta ação é irreversível. Deseja continuar?"
        processando={carregandoAcoes}
        onCancel={() => setConfirmarExcluir(false)}
        onConfirm={() => void confirmarExclusao()}
        confirmarTexto="Excluir"
      />
    </>
  );
}
