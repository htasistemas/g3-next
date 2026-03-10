import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Archive,
  BarChart3,
  Building2,
  Camera,
  ListChecks,
  MapPin,
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
import { PopupMensagem, type PopupMensagemState } from "@/components/admin/admin-popups";
import {
  usePatrimonios,
  useRegistrarMovimentoPatrimonio,
  useSalvarPatrimonio
} from "@/features/patrimonios/use-patrimonios";
import { imprimirConteudoAtual } from "@/lib/report-utils";
import type { Patrimonio, PatrimonioMovimento } from "@/types/patrimonio";

type AbaId = "dados" | "visual" | "localizacao" | "dashboard" | "movimentacao" | "listagem";

const abas: AdminTab[] = [
  { id: "dados", label: "Dados Gerais", icon: Pencil },
  { id: "visual", label: "Identificação Visual", icon: Camera },
  { id: "localizacao", label: "Localização E Responsável", icon: MapPin },
  { id: "dashboard", label: "Dashboard", icon: BarChart3 },
  { id: "movimentacao", label: "Movimentação", icon: Archive },
  { id: "listagem", label: "Listagem", icon: ListChecks }
];

const defaultForm: Patrimonio = {
  numeroPatrimonio: "",
  nome: "",
  categoria: "",
  subcategoria: "",
  conservacao: "Novo",
  status: "Ativo",
  dataAquisicao: "",
  valorAquisicao: 0,
  origem: "Compra",
  responsavel: "",
  unidade: "",
  sala: "",
  taxaDepreciacao: 0,
  observacoes: "",
  movimentos: []
};

const defaultMovimento: PatrimonioMovimento = {
  tipo: "MOVIMENTACAO",
  destino: "",
  responsavel: "",
  observacao: "",
  dataMovimento: new Date().toISOString().slice(0, 10)
};

export function PatrimonioPage() {
  const navigate = useNavigate();
  const [abaAtiva, setAbaAtiva] = useState<AbaId>("dados");
  const [busca, setBusca] = useState("");
  const [form, setForm] = useState<Patrimonio>(defaultForm);
  const [snapshot, setSnapshot] = useState<Patrimonio>(defaultForm);
  const [movimento, setMovimento] = useState<PatrimonioMovimento>(defaultMovimento);
  const [popupMensagem, setPopupMensagem] = useState<PopupMensagemState | null>(null);

  const { data, isLoading } = usePatrimonios();
  const salvarMutation = useSalvarPatrimonio();
  const movimentoMutation = useRegistrarMovimentoPatrimonio();

  const patrimonios = data?.patrimonios ?? [];

  const patrimoniosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return patrimonios;
    return patrimonios.filter((item) => {
      const alvo = `${item.numeroPatrimonio} ${item.nome} ${item.categoria ?? ""} ${item.responsavel ?? ""}`;
      return alvo.toLowerCase().includes(termo);
    });
  }, [busca, patrimonios]);

  const dashboard = useMemo(() => {
    const ativos = patrimonios.filter((item) =>
      String(item.status ?? "").toLowerCase().includes("ativo")
    ).length;
    const manutencao = patrimonios.filter((item) =>
      String(item.status ?? "").toLowerCase().includes("manuten")
    ).length;
    const baixados = patrimonios.filter((item) =>
      String(item.status ?? "").toLowerCase().includes("baix")
    ).length;
    const valorTotal = patrimonios.reduce((acc, item) => acc + Number(item.valorAquisicao ?? 0), 0);
    return { total: patrimonios.length, ativos, manutencao, baixados, valorTotal };
  }, [patrimonios]);

  const carregandoAcoes = salvarMutation.isPending || movimentoMutation.isPending;

  function novo() {
    setForm(defaultForm);
    setSnapshot(defaultForm);
    setMovimento(defaultMovimento);
    setAbaAtiva("dados");
  }

  function selecionar(item: Patrimonio) {
    const proximo = {
      ...defaultForm,
      ...item,
      movimentos: item.movimentos ?? []
    };
    setForm(proximo);
    setSnapshot(proximo);
    setAbaAtiva("dados");
  }

  function buscar() {
    setAbaAtiva("listagem");
  }

  function cancelar() {
    setForm(snapshot);
  }

  async function salvar() {
    if (!form.numeroPatrimonio.trim() || !form.nome.trim()) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Validação",
        texto: "Informe número e nome do patrimônio."
      });
      return;
    }

    try {
      const payload: Patrimonio = {
        ...form,
        numeroPatrimonio: form.numeroPatrimonio.trim(),
        nome: form.nome.trim(),
        categoria: form.categoria?.trim() || undefined,
        subcategoria: form.subcategoria?.trim() || undefined,
        origem: form.origem?.trim() || undefined,
        responsavel: form.responsavel?.trim() || undefined,
        unidade: form.unidade?.trim() || undefined,
        sala: form.sala?.trim() || undefined,
        observacoes: form.observacoes?.trim() || undefined,
        movimentos: undefined
      };

      const response = await salvarMutation.mutateAsync(payload);
      const patrimonio = response.patrimonio;
      setForm(patrimonio);
      setSnapshot(patrimonio);
      setPopupMensagem({
        tipo: "sucesso",
        titulo: "Confirmação",
        texto: "Patrimônio salvo com sucesso."
      });
    } catch (error: any) {
      setPopupMensagem({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível salvar o patrimônio."
      });
    }
  }

  async function registrarMovimento() {
    if (!form.idPatrimonio) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Atenção",
        texto: "Selecione um patrimônio antes de registrar movimentação."
      });
      return;
    }
    if (!movimento.dataMovimento) {
      setPopupMensagem({
        tipo: "aviso",
        titulo: "Validação",
        texto: "Informe a data da movimentação."
      });
      return;
    }

    try {
      const response = await movimentoMutation.mutateAsync({
        id: form.idPatrimonio,
        payload: movimento
      });
      setForm(response.patrimonio);
      setSnapshot(response.patrimonio);
      setMovimento(defaultMovimento);
      setPopupMensagem({
        tipo: "sucesso",
        titulo: "Confirmação",
        texto: "Movimentação registrada com sucesso."
      });
    } catch (error: any) {
      setPopupMensagem({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível registrar a movimentação."
      });
    }
  }

  function excluir() {
    setPopupMensagem({
      tipo: "aviso",
      titulo: "Aão Controlada",
      texto: "A exclusão de patrimônio permanece bloqueada nesta fase para evitar perda de histórico."
    });
  }

  function imprimir() {
    try {
      imprimirConteudoAtual({ titulo: "Relatório de patrimônio" });
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

  const acoes: AdminAction[] = [
    { label: "Buscar", icon: Search, onClick: buscar, variant: "outline" },
    { label: "Novo", icon: Plus, onClick: novo, variant: "default", disabled: carregandoAcoes },
    { label: "Salvar", icon: Save, onClick: () => void salvar(), variant: "default", disabled: carregandoAcoes },
    { label: "Cancelar", icon: Undo2, onClick: cancelar, variant: "outline", disabled: carregandoAcoes },
    { label: "Excluir", icon: Trash2, onClick: excluir, variant: "danger", disabled: carregandoAcoes },
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
        activeTitle={abas.find((aba) => aba.id === abaAtiva)?.label}
        codeBadge={form.idPatrimonio ? `Código: ${form.idPatrimonio}` : "Novo"}
      >
        {abaAtiva === "dados" ? (
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-1">
              <Label>Número Do Patrimônio *</Label>
              <Input
                value={form.numeroPatrimonio}
                onChange={(event) =>
                  setForm((atual) => ({ ...atual, numeroPatrimonio: event.target.value }))
                }
              />
            </div>
            <div className="space-y-1 xl:col-span-2">
              <Label>Nome *</Label>
              <Input
                value={form.nome}
                onChange={(event) => setForm((atual) => ({ ...atual, nome: event.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Categoria</Label>
              <Input
                value={form.categoria ?? ""}
                onChange={(event) => setForm((atual) => ({ ...atual, categoria: event.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Subcategoria</Label>
              <Input
                value={form.subcategoria ?? ""}
                onChange={(event) =>
                  setForm((atual) => ({ ...atual, subcategoria: event.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Conservação</Label>
              <Select
                value={form.conservacao ?? "Novo"}
                onChange={(event) =>
                  setForm((atual) => ({ ...atual, conservacao: event.target.value }))
                }
              >
                <option value="Novo">Novo</option>
                <option value="Bom">Bom</option>
                <option value="Regular">Regular</option>
                <option value="Ruim">Ruim</option>
                <option value="Inservível">Inservível</option>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select
                value={form.status ?? "Ativo"}
                onChange={(event) => setForm((atual) => ({ ...atual, status: event.target.value }))}
              >
                <option value="Ativo">Ativo</option>
                <option value="Em manutenção">Em manutenção</option>
                <option value="Em empréstimo">Em empréstimo</option>
                <option value="Baixado / Inativo">Baixado / Inativo</option>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Data De Aquisição</Label>
              <Input
                type="date"
                value={form.dataAquisicao ?? ""}
                onChange={(event) =>
                  setForm((atual) => ({ ...atual, dataAquisicao: event.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Valor De Aquisição</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={Number(form.valorAquisicao ?? 0)}
                onChange={(event) =>
                  setForm((atual) => ({ ...atual, valorAquisicao: Number(event.target.value) || 0 }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Origem</Label>
              <Input
                value={form.origem ?? ""}
                onChange={(event) => setForm((atual) => ({ ...atual, origem: event.target.value }))}
              />
            </div>
          </section>
        ) : null}

        {abaAtiva === "visual" ? (
          <section className="grid gap-3 md:grid-cols-2">
            <Card className="border-[var(--g3-border)]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Identificação Visual</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="rounded-lg border border-dashed border-[var(--g3-border)] bg-[var(--g3-primary-soft)]/35 p-4 text-center text-sm text-[var(--g3-muted)]">
                  Upload de foto/etiqueta QR será mantido no próximo incremento.
                </div>
                <p className="text-xs text-[var(--g3-muted)]">
                  Estrutura preparada para anexos visuais por patrimônio.
                </p>
              </CardContent>
            </Card>

            <div className="space-y-1">
              <Label>Observações Visuais</Label>
              <Textarea
                rows={6}
                value={form.observacoes ?? ""}
                onChange={(event) =>
                  setForm((atual) => ({ ...atual, observacoes: event.target.value }))
                }
              />
            </div>
          </section>
        ) : null}

        {abaAtiva === "localizacao" ? (
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-1 xl:col-span-2">
              <Label>Unidade</Label>
              <Input
                value={form.unidade ?? ""}
                onChange={(event) => setForm((atual) => ({ ...atual, unidade: event.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Sala</Label>
              <Input
                value={form.sala ?? ""}
                onChange={(event) => setForm((atual) => ({ ...atual, sala: event.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Responsável</Label>
              <Input
                value={form.responsavel ?? ""}
                onChange={(event) =>
                  setForm((atual) => ({ ...atual, responsavel: event.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Taxa De Depreciação (%)</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={Number(form.taxaDepreciacao ?? 0)}
                onChange={(event) =>
                  setForm((atual) => ({
                    ...atual,
                    taxaDepreciacao: Number(event.target.value) || 0
                  }))
                }
              />
            </div>
          </section>
        ) : null}

        {abaAtiva === "movimentacao" ? (
          <section className="space-y-3">
            <div className="grid gap-3 rounded-lg border border-[var(--g3-border)] p-3 md:grid-cols-2 xl:grid-cols-5">
              <div className="space-y-1">
                <Label>Tipo</Label>
                <Select
                  value={movimento.tipo}
                  onChange={(event) =>
                    setMovimento((atual) => ({
                      ...atual,
                      tipo: event.target.value as PatrimonioMovimento["tipo"]
                    }))
                  }
                >
                  <option value="MOVIMENTACAO">Movimentação</option>
                  <option value="MANUTENCAO">Manutenção</option>
                  <option value="BAIXA">Baixa</option>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Data</Label>
                <Input
                  type="date"
                  value={movimento.dataMovimento ?? ""}
                  onChange={(event) =>
                    setMovimento((atual) => ({ ...atual, dataMovimento: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Destino</Label>
                <Input
                  value={movimento.destino ?? ""}
                  onChange={(event) =>
                    setMovimento((atual) => ({ ...atual, destino: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Responsável</Label>
                <Input
                  value={movimento.responsavel ?? ""}
                  onChange={(event) =>
                    setMovimento((atual) => ({ ...atual, responsavel: event.target.value }))
                  }
                />
              </div>
              <div className="flex items-end">
                <Button className="w-full" onClick={() => void registrarMovimento()}>
                  Registrar
                </Button>
              </div>
              <div className="space-y-1 md:col-span-2 xl:col-span-5">
                <Label>Observação</Label>
                <Textarea
                  rows={2}
                  value={movimento.observacao ?? ""}
                  onChange={(event) =>
                    setMovimento((atual) => ({ ...atual, observacao: event.target.value }))
                  }
                />
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
                  <tr>
                    <th className="px-3 py-2 text-left">Data</th>
                    <th className="px-3 py-2 text-left">Tipo</th>
                    <th className="px-3 py-2 text-left">Destino</th>
                    <th className="px-3 py-2 text-left">Responsável</th>
                    <th className="px-3 py-2 text-left">Observação</th>
                  </tr>
                </thead>
                <tbody>
                  {(form.movimentos ?? []).length ? (
                    (form.movimentos ?? []).map((item, index) => (
                      <tr
                        key={`${item.idMovimento ?? index}-${item.dataMovimento ?? ""}`}
                        className={`border-t border-[var(--g3-border)] ${
                          index % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35"
                        }`}
                      >
                        <td className="px-3 py-2">{item.dataMovimento ?? "---"}</td>
                        <td className="px-3 py-2">{item.tipo}</td>
                        <td className="px-3 py-2">{item.destino ?? "---"}</td>
                        <td className="px-3 py-2">{item.responsavel ?? "---"}</td>
                        <td className="px-3 py-2">{item.observacao ?? "---"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-3 py-4 text-center">
                        Nenhuma movimentação registrada.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {abaAtiva === "listagem" ? (
          <section className="space-y-3">
            <div className="space-y-1">
              <Label>Busca</Label>
              <Input
                placeholder="Número, nome, categoria ou responsável"
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
              />
            </div>
            <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
                  <tr>
                    <th className="px-3 py-2 text-left">Número</th>
                    <th className="px-3 py-2 text-left">Nome</th>
                    <th className="px-3 py-2 text-left">Categoria</th>
                    <th className="px-3 py-2 text-left">Unidade</th>
                    <th className="px-3 py-2 text-left">Responsável</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-4 text-center">
                        Carregando patrimônios...
                      </td>
                    </tr>
                  ) : patrimoniosFiltrados.length ? (
                    patrimoniosFiltrados.map((item, index) => (
                      <tr
                        key={item.idPatrimonio ?? `${item.numeroPatrimonio}-${index}`}
                        className={`border-t border-[var(--g3-border)] ${
                          index % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35"
                        }`}
                      >
                        <td className="px-3 py-2">{item.numeroPatrimonio}</td>
                        <td className="px-3 py-2 font-medium">{item.nome}</td>
                        <td className="px-3 py-2">{item.categoria ?? "---"}</td>
                        <td className="px-3 py-2">{item.unidade ?? "---"}</td>
                        <td className="px-3 py-2">{item.responsavel ?? "---"}</td>
                        <td className="px-3 py-2">{item.status ?? "---"}</td>
                        <td className="px-3 py-2 text-right">
                          <Button variant="outline" size="sm" onClick={() => selecionar(item)}>
                            Selecionar
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-3 py-4 text-center">
                        Nenhum patrimônio encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {abaAtiva === "dashboard" ? (
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Card className="border-[var(--g3-border)]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Total De Bens</CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-semibold text-[var(--g3-active)]">
                {dashboard.total}
              </CardContent>
            </Card>
            <Card className="border-[var(--g3-border)]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Ativos</CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-semibold text-[var(--g3-active)]">
                {dashboard.ativos}
              </CardContent>
            </Card>
            <Card className="border-[var(--g3-border)]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Em Manutenção</CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-semibold text-amber-600">
                {dashboard.manutencao}
              </CardContent>
            </Card>
            <Card className="border-[var(--g3-border)]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Baixados</CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-semibold text-[var(--g3-danger)]">
                {dashboard.baixados}
              </CardContent>
            </Card>
            <Card className="border-[var(--g3-border)] md:col-span-2 xl:col-span-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Valor Total Dos Patrimônios</CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-semibold text-[var(--g3-active)]">
                {dashboard.valorTotal.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL"
                })}
              </CardContent>
            </Card>
          </section>
        ) : null}

        {abaAtiva === "localizacao" ? (
          <Card className="border-[var(--g3-border)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Resumo De Vínculo Institucional</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm text-[var(--g3-foreground)] md:grid-cols-3">
              <p className="inline-flex items-center gap-2">
                <Building2 className="h-4 w-4 text-[var(--g3-active)]" />
                Unidade: {form.unidade || "---"}
              </p>
              <p className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[var(--g3-active)]" />
                Sala: {form.sala || "---"}
              </p>
              <p className="inline-flex items-center gap-2">
                <Archive className="h-4 w-4 text-[var(--g3-active)]" />
                Responsável: {form.responsavel || "---"}
              </p>
            </CardContent>
          </Card>
        ) : null}
      </AdminPageLayout>

      {popupMensagem ? <PopupMensagem popup={popupMensagem} onClose={() => setPopupMensagem(null)} /> : null}
    </>
  );
}
