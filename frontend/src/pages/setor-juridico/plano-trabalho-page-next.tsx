import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarRange,
  FileArchive,
  FileSpreadsheet,
  Link2,
  List,
  Plus,
  Printer,
  Save,
  Search,
  Target,
  Trash2,
  Undo2,
  Users,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  AdminPageLayout,
  type AdminAction,
  type AdminTab
} from "@/components/admin/admin-page-layout";
import {
  PopupConfirmacao,
  PopupMensagem,
  type PopupMensagemState
} from "@/components/admin/admin-popups";
import { imprimirConteudoAtual } from "@/lib/report-utils";
import {
  useExcluirPlanoTrabalho,
  usePlanosTrabalho,
  useSalvarPlanoTrabalho
} from "@/features/planos-trabalho/use-planos-trabalho";
import { useTermosFomento } from "@/features/termos-fomento/use-termos-fomento";
import type {
  PlanoCronograma,
  PlanoEquipe,
  PlanoMeta,
  PlanoTrabalho,
  PlanoTrabalhoPayload
} from "@/types/plano-trabalho";

type AbaId =
  | "listagem"
  | "identificacao"
  | "vinculo"
  | "metas"
  | "cronograma"
  | "equipe"
  | "arquivos";

type OrdenacaoPlano = "maisRecente" | "maisAntigo" | "az";

const abas: AdminTab[] = [
  { id: "listagem", label: "Listagem", icon: List },
  { id: "identificacao", label: "Identificação", icon: FileSpreadsheet },
  { id: "vinculo", label: "Vinculação ao termo", icon: Link2 },
  { id: "metas", label: "Metas e atividades", icon: Target },
  { id: "cronograma", label: "Cronograma", icon: CalendarRange },
  { id: "equipe", label: "Equipe", icon: Users },
  { id: "arquivos", label: "Arquivos e exportação", icon: FileArchive }
];

const ordemAbas: AbaId[] = [
  "identificacao",
  "vinculo",
  "metas",
  "cronograma",
  "equipe",
  "arquivos",
  "listagem"
];

const statusPlano = [
  { value: "EM_ELABORACAO", label: "Em elaboração" },
  { value: "ENVIADO_ANALISE", label: "Enviado para análise" },
  { value: "APROVADO", label: "Aprovado" },
  { value: "EM_EXECUCAO", label: "Em execução" },
  { value: "CONCLUIDO", label: "Concluído" },
  { value: "REPROVADO", label: "Reprovado" }
] as const;

const orgaosConcedentes = ["União", "Estado", "Município", "Outro"] as const;
const fontesRecurso = ["União", "Estado", "Município", "Contrapartida", "Outros"] as const;
const formatosExportacao = ["PDF", "JSON"] as const;

const planoVazio: PlanoTrabalhoPayload = {
  codigoInterno: "",
  titulo: "",
  descricaoGeral: "",
  status: "EM_ELABORACAO",
  orgaoConcedente: "União",
  orgaoOutroDescricao: "",
  areaPrograma: "",
  dataElaboracao: "",
  dataAprovacao: "",
  vigenciaInicio: "",
  vigenciaFim: "",
  termoFomentoId: "",
  modalidade: "",
  numeroProcesso: "",
  observacoesVinculacao: "",
  arquivoFormato: "PDF",
  metas: [],
  cronograma: [],
  equipe: []
};

const metaVazia: PlanoMeta = {
  descricao: "",
  indicador: "",
  unidadeMedida: "",
  quantidadePrevista: undefined,
  resultadoEsperado: "",
  atividades: []
};

const cronogramaVazio: PlanoCronograma = {
  competencia: "",
  descricaoResumida: "",
  valorPrevisto: undefined,
  fonteRecurso: "",
  naturezaDespesa: "",
  observacoes: ""
};

const equipeVazia: PlanoEquipe = {
  nome: "",
  funcao: "",
  cpf: "",
  cargaHoraria: "",
  tipoVinculo: "",
  contato: ""
};

function clonarPlano(plano: PlanoTrabalhoPayload): PlanoTrabalhoPayload {
  return {
    ...plano,
    metas: (plano.metas ?? []).map((meta) => ({
      ...meta,
      atividades: (meta.atividades ?? []).map((atividade) => ({
        ...atividade,
        etapas: [...(atividade.etapas ?? [])]
      }))
    })),
    cronograma: (plano.cronograma ?? []).map((item) => ({ ...item })),
    equipe: (plano.equipe ?? []).map((item) => ({ ...item }))
  };
}

function normalizarPlano(plano?: Partial<PlanoTrabalho> | null): PlanoTrabalhoPayload {
  if (!plano) return clonarPlano(planoVazio);
  return clonarPlano({
    ...planoVazio,
    ...plano,
    metas: plano.metas ?? [],
    cronograma: plano.cronograma ?? [],
    equipe: plano.equipe ?? []
  });
}

function parseDate(value?: string): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [ano, mes, dia] = value.split("-").map(Number);
  const data = new Date(ano, mes - 1, dia);
  return Number.isNaN(data.getTime()) ? null : data;
}

function formatarData(value?: string): string {
  const data = parseDate(value);
  return data ? data.toLocaleDateString("pt-BR") : "---";
}

function isVencido(vigenciaFim?: string, status?: string): boolean {
  if (!vigenciaFim || status === "CONCLUIDO" || status === "REPROVADO") return false;
  const fim = parseDate(vigenciaFim);
  if (!fim) return false;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return fim < hoje;
}

function statusLabel(status?: string): string {
  return statusPlano.find((item) => item.value === status)?.label ?? status ?? "---";
}

function isCampoPeriodoValido(form: PlanoTrabalhoPayload): boolean {
  if (!form.vigenciaInicio || !form.vigenciaFim) return true;
  const inicio = parseDate(form.vigenciaInicio);
  const fim = parseDate(form.vigenciaFim);
  if (!inicio || !fim) return true;
  return fim >= inicio;
}

function formatarValorMonetario(valor?: number): string {
  if (valor == null || Number.isNaN(valor)) return "---";
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function PlanoTrabalhoPage() {
  const navigate = useNavigate();

  const [abaAtiva, setAbaAtiva] = useState<AbaId>("listagem");
  const [planoSelecionadoId, setPlanoSelecionadoId] = useState<string>();
  const [filtroPesquisa, setFiltroPesquisa] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroOrdenacao, setFiltroOrdenacao] = useState<OrdenacaoPlano>("maisRecente");
  const [somenteVencidos, setSomenteVencidos] = useState(false);

  const [form, setForm] = useState<PlanoTrabalhoPayload>(clonarPlano(planoVazio));
  const [snapshot, setSnapshot] = useState<PlanoTrabalhoPayload>(clonarPlano(planoVazio));
  const [novaMeta, setNovaMeta] = useState<PlanoMeta>({ ...metaVazia });
  const [novoCronograma, setNovoCronograma] = useState<PlanoCronograma>({ ...cronogramaVazio });
  const [novaEquipe, setNovaEquipe] = useState<PlanoEquipe>({ ...equipeVazia });
  const [popup, setPopup] = useState<PopupMensagemState | null>(null);
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);

  const planosQuery = usePlanosTrabalho();
  const termosQuery = useTermosFomento();
  const salvarMutation = useSalvarPlanoTrabalho();
  const excluirMutation = useExcluirPlanoTrabalho();

  const planos = planosQuery.data ?? [];
  const termos = termosQuery.data ?? [];
  const processando = salvarMutation.isPending || excluirMutation.isPending;
  const edicaoRestrita = useMemo(
    () => ["APROVADO", "EM_EXECUCAO", "CONCLUIDO"].includes(String(form.status)),
    [form.status]
  );

  const termoSelecionado = useMemo(
    () => termos.find((termo) => termo.id === form.termoFomentoId) ?? null,
    [termos, form.termoFomentoId]
  );

  const planosFiltrados = useMemo(() => {
    const termo = filtroPesquisa.trim().toLowerCase();
    const filtrados = planos.filter((plano) => {
      const alvo = [
        plano.codigoInterno,
        plano.titulo,
        plano.status,
        plano.termoFomento?.numero ?? "",
        plano.numeroProcesso ?? ""
      ]
        .join(" ")
        .toLowerCase();
      if (termo && !alvo.includes(termo)) return false;
      if (filtroStatus && plano.status !== filtroStatus) return false;
      if (somenteVencidos && !isVencido(plano.vigenciaFim, plano.status)) return false;
      return true;
    });
    return filtrados.sort((a, b) => {
      if (filtroOrdenacao === "az") return a.titulo.localeCompare(b.titulo, "pt-BR");
      const idA = Number(String(a.id).replace(/\D/g, "")) || 0;
      const idB = Number(String(b.id).replace(/\D/g, "")) || 0;
      return filtroOrdenacao === "maisAntigo" ? idA - idB : idB - idA;
    });
  }, [planos, filtroPesquisa, filtroStatus, filtroOrdenacao, somenteVencidos]);

  const resumoStatus = useMemo(() => {
    const contagem = new Map<string, number>();
    planos.forEach((plano) => {
      contagem.set(plano.status, (contagem.get(plano.status) ?? 0) + 1);
    });
    return statusPlano
      .map((status) => ({ ...status, total: contagem.get(status.value) ?? 0 }))
      .filter((status) => status.total > 0);
  }, [planos]);

  const indiceAba = ordemAbas.indexOf(abaAtiva);
  const temAbaAnterior = indiceAba > 0;
  const temProximaAba = indiceAba >= 0 && indiceAba < ordemAbas.length - 1;
  const nomeProximaAba = temProximaAba
    ? abas.find((aba) => aba.id === ordemAbas[indiceAba + 1])?.label ?? ""
    : "";

  function novo() {
    const vazio = clonarPlano(planoVazio);
    setPlanoSelecionadoId(undefined);
    setForm(vazio);
    setSnapshot(vazio);
    setNovaMeta({ ...metaVazia });
    setNovoCronograma({ ...cronogramaVazio });
    setNovaEquipe({ ...equipeVazia });
    setAbaAtiva("identificacao");
  }

  function selecionarPlano(id: string) {
    const selecionado = planos.find((item) => item.id === id);
    if (!selecionado) return;
    const normalizado = normalizarPlano(selecionado);
    setPlanoSelecionadoId(selecionado.id);
    setForm(normalizado);
    setSnapshot(normalizado);
    setAbaAtiva("identificacao");
  }

  function cancelar() {
    setForm(clonarPlano(snapshot));
  }

  function navegarParaAbaAnterior() {
    if (!temAbaAnterior) return;
    setAbaAtiva(ordemAbas[indiceAba - 1]);
  }

  function navegarParaProximaAba() {
    if (!temProximaAba) return;
    setAbaAtiva(ordemAbas[indiceAba + 1]);
  }

  function limparFiltros() {
    setFiltroPesquisa("");
    setFiltroStatus("");
    setFiltroOrdenacao("maisRecente");
    setSomenteVencidos(false);
  }

  async function salvar() {
    if (!form.titulo.trim() || !form.descricaoGeral.trim() || !form.termoFomentoId) {
      setPopup({
        tipo: "aviso",
        titulo: "Validação",
        texto: "Preencha título, descrição geral e vínculo com termo de fomento."
      });
      return;
    }
    if (!isCampoPeriodoValido(form)) {
      setPopup({
        tipo: "aviso",
        titulo: "Validação",
        texto: "A data final da vigência não pode ser menor que a data inicial."
      });
      return;
    }
    try {
      const salvo = await salvarMutation.mutateAsync({
        id: planoSelecionadoId,
        payload: clonarPlano(form)
      });
      const normalizado = normalizarPlano(salvo);
      setPlanoSelecionadoId(salvo.id);
      setForm(normalizado);
      setSnapshot(normalizado);
      setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Plano salvo com sucesso." });
    } catch (error: any) {
      setPopup({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível salvar o plano."
      });
    }
  }

  async function excluirAtual() {
    if (!planoSelecionadoId) return;
    try {
      await excluirMutation.mutateAsync(planoSelecionadoId);
      setConfirmarExclusao(false);
      setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Plano excluído com sucesso." });
      novo();
    } catch (error: any) {
      setPopup({
        tipo: "erro",
        titulo: "Erro",
        texto: error?.response?.data?.message ?? "Não foi possível excluir o plano."
      });
    }
  }

  function adicionarMeta() {
    if (!novaMeta.descricao.trim()) {
      setPopup({ tipo: "aviso", titulo: "Validação", texto: "Informe a descrição da meta." });
      return;
    }
    setForm((atual) => ({
      ...atual,
      metas: [...(atual.metas ?? []), { ...novaMeta, atividades: novaMeta.atividades ?? [] }]
    }));
    setNovaMeta({ ...metaVazia });
  }

  function removerMeta(indice: number) {
    setForm((atual) => ({
      ...atual,
      metas: (atual.metas ?? []).filter((_, idx) => idx !== indice)
    }));
  }

  function adicionarCronograma() {
    if (!novoCronograma.competencia?.trim()) {
      setPopup({ tipo: "aviso", titulo: "Validação", texto: "Informe a competência." });
      return;
    }
    setForm((atual) => ({
      ...atual,
      cronograma: [...(atual.cronograma ?? []), { ...novoCronograma }]
    }));
    setNovoCronograma({ ...cronogramaVazio });
  }

  function removerCronograma(indice: number) {
    setForm((atual) => ({
      ...atual,
      cronograma: (atual.cronograma ?? []).filter((_, idx) => idx !== indice)
    }));
  }

  function adicionarEquipe() {
    if (!novaEquipe.nome?.trim()) {
      setPopup({ tipo: "aviso", titulo: "Validação", texto: "Informe o nome do responsável." });
      return;
    }
    setForm((atual) => ({
      ...atual,
      equipe: [...(atual.equipe ?? []), { ...novaEquipe }]
    }));
    setNovaEquipe({ ...equipeVazia });
  }

  function removerEquipe(indice: number) {
    setForm((atual) => ({
      ...atual,
      equipe: (atual.equipe ?? []).filter((_, idx) => idx !== indice)
    }));
  }

  function exportarPlano(formato: string) {
    setPopup({
      tipo: "sucesso",
      titulo: "Exportação",
      texto: `Preparando exportação do plano em ${formato}.`
    });
  }

  function renderNavegacaoAba() {
    if (abaAtiva === "listagem") return null;
    return (
      <div className="flex flex-wrap items-center justify-end gap-2 rounded-lg border border-[var(--g3-border)] bg-[var(--g3-primary-soft)]/35 p-3">
        {temAbaAnterior ? (
          <Button type="button" size="sm" variant="outline" onClick={navegarParaAbaAnterior}>
            Voltar
          </Button>
        ) : null}
        {temProximaAba ? (
          <Button type="button" size="sm" onClick={navegarParaProximaAba}>
            Próximo: {nomeProximaAba}
          </Button>
        ) : (
          <Button type="button" size="sm" onClick={() => void salvar()} disabled={processando}>
            {processando ? "Salvando..." : "Salvar plano"}
          </Button>
        )}
      </div>
    );
  }

  const acoes: AdminAction[] = [
    { label: "Buscar", icon: Search, onClick: () => setAbaAtiva("listagem"), variant: "outline" },
    { label: "Novo", icon: Plus, onClick: novo, variant: "default", disabled: processando },
    {
      label: "Salvar",
      icon: Save,
      onClick: () => void salvar(),
      variant: "default",
      disabled: processando || edicaoRestrita
    },
    { label: "Cancelar", icon: Undo2, onClick: cancelar, variant: "outline", disabled: processando },
    {
      label: "Excluir",
      icon: Trash2,
      onClick: () => setConfirmarExclusao(true),
      variant: "danger",
      disabled: processando || !planoSelecionadoId
    },
    {
      label: "Imprimir",
      icon: Printer,
      onClick: () => {
        try {
          imprimirConteudoAtual({ titulo: "Plano de trabalho" });
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
    {
      label: "Fechar",
      icon: X,
      onClick: () => navigate("/dashboard/visao-geral"),
      variant: "outline"
    }
  ];

  return (
    <>
      <AdminPageLayout
        tabs={abas}
        activeTab={abaAtiva}
        onChangeTab={(tabId) => setAbaAtiva(tabId as AbaId)}
        actions={acoes}
        activeTitle={abas.find((aba) => aba.id === abaAtiva)?.label}
        codeBadge={planoSelecionadoId ? `Código: ${form.codigoInterno || planoSelecionadoId}` : "Novo"}
      >
        {abaAtiva === "listagem" ? (
          <section className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-1 md:col-span-2">
                <Label>Pesquisa</Label>
                <Input
                  placeholder="Código, título, status, processo ou termo"
                  value={filtroPesquisa}
                  onChange={(event) => setFiltroPesquisa(event.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={filtroStatus} onChange={(event) => setFiltroStatus(event.target.value)}>
                  <option value="">Todos</option>
                  {statusPlano.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Ordenação</Label>
                <Select
                  value={filtroOrdenacao}
                  onChange={(event) => setFiltroOrdenacao(event.target.value as OrdenacaoPlano)}
                >
                  <option value="maisRecente">Mais recente</option>
                  <option value="maisAntigo">Mais antigo</option>
                  <option value="az">A-Z</option>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--g3-border)] p-3">
              <label className="inline-flex items-center gap-2 text-sm text-[var(--g3-muted)]">
                <input
                  type="checkbox"
                  checked={somenteVencidos}
                  onChange={(event) => setSomenteVencidos(event.target.checked)}
                />
                Mostrar apenas vencidos
              </label>
              <Button type="button" size="sm" variant="outline" onClick={limparFiltros}>
                Limpar filtros
              </Button>
            </div>

            {resumoStatus.length ? (
              <div className="flex flex-wrap gap-2">
                {resumoStatus.map((item) => (
                  <span
                    key={item.value}
                    className="inline-flex rounded-full border border-[var(--g3-border)] bg-[var(--g3-primary-soft)] px-3 py-1 text-xs font-semibold text-[var(--g3-active)]"
                  >
                    {item.label}: {item.total}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
                  <tr>
                    <th className="px-3 py-2 text-left">Código</th>
                    <th className="px-3 py-2 text-left">Título</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">Termo</th>
                    <th className="px-3 py-2 text-left">Vigência</th>
                    <th className="px-3 py-2 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {planosFiltrados.length ? (
                    planosFiltrados.map((item, index) => (
                      <tr
                        key={item.id}
                        onClick={() => selecionarPlano(item.id)}
                        className={`cursor-pointer border-t border-[var(--g3-border)] transition hover:bg-[var(--g3-primary-soft)]/60 ${
                          index % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35"
                        }`}
                      >
                        <td className="px-3 py-2 font-medium">{item.codigoInterno || item.id}</td>
                        <td className="px-3 py-2">{item.titulo}</td>
                        <td className="px-3 py-2">
                          <span className="inline-flex rounded-full bg-[var(--g3-primary-soft)] px-2 py-1 text-xs font-semibold text-[var(--g3-active)]">
                            {statusLabel(item.status)}
                          </span>
                        </td>
                        <td className="px-3 py-2">{item.termoFomento?.numero ?? "---"}</td>
                        <td className="px-3 py-2">
                          {formatarData(item.vigenciaInicio)} - {formatarData(item.vigenciaFim)}
                          {isVencido(item.vigenciaFim, item.status) ? (
                            <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
                              Vencido
                            </span>
                          ) : null}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className="inline-flex items-center gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={(event) => {
                                event.stopPropagation();
                                selecionarPlano(item.id);
                              }}
                            >
                              Editar
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={(event) => {
                                event.stopPropagation();
                                exportarPlano("PDF");
                              }}
                            >
                              Exportar
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-3 py-6 text-center text-sm text-[var(--g3-muted)]">
                        Nenhum plano encontrado com os filtros informados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
        {abaAtiva === "identificacao" ? (
          <section className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <div className="space-y-1">
                <Label>Código interno</Label>
                <Input value={form.codigoInterno ?? ""} readOnly placeholder="Gerado automaticamente" />
              </div>
              <div className="space-y-1">
                <Label>Status *</Label>
                <Select
                  value={String(form.status)}
                  onChange={(event) => setForm((atual) => ({ ...atual, status: event.target.value }))}
                >
                  {statusPlano.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Data de elaboração</Label>
                <Input
                  type="date"
                  value={form.dataElaboracao ?? ""}
                  onChange={(event) =>
                    setForm((atual) => ({
                      ...atual,
                      dataElaboracao: event.target.value
                    }))
                  }
                />
              </div>
              <div className="space-y-1 md:col-span-2 xl:col-span-2">
                <Label>Título do plano *</Label>
                <Input
                  value={form.titulo}
                  onChange={(event) => setForm((atual) => ({ ...atual, titulo: event.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Órgão concedente</Label>
                <Select
                  value={form.orgaoConcedente ?? "União"}
                  onChange={(event) =>
                    setForm((atual) => ({
                      ...atual,
                      orgaoConcedente: event.target.value
                    }))
                  }
                >
                  {orgaosConcedentes.map((orgao) => (
                    <option key={orgao} value={orgao}>
                      {orgao}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1 md:col-span-2 xl:col-span-3">
                <Label>Descrição geral *</Label>
                <Textarea
                  rows={3}
                  value={form.descricaoGeral}
                  onChange={(event) =>
                    setForm((atual) => ({
                      ...atual,
                      descricaoGeral: event.target.value
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Área / programa</Label>
                <Input
                  value={form.areaPrograma ?? ""}
                  onChange={(event) =>
                    setForm((atual) => ({
                      ...atual,
                      areaPrograma: event.target.value
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Órgão concedente (outro)</Label>
                <Input
                  value={form.orgaoOutroDescricao ?? ""}
                  onChange={(event) =>
                    setForm((atual) => ({
                      ...atual,
                      orgaoOutroDescricao: event.target.value
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Data de aprovação</Label>
                <Input
                  type="date"
                  value={form.dataAprovacao ?? ""}
                  onChange={(event) =>
                    setForm((atual) => ({
                      ...atual,
                      dataAprovacao: event.target.value
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Vigência início</Label>
                <Input
                  type="date"
                  value={form.vigenciaInicio ?? ""}
                  onChange={(event) =>
                    setForm((atual) => ({
                      ...atual,
                      vigenciaInicio: event.target.value
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Vigência fim</Label>
                <Input
                  type="date"
                  value={form.vigenciaFim ?? ""}
                  onChange={(event) =>
                    setForm((atual) => ({
                      ...atual,
                      vigenciaFim: event.target.value
                    }))
                  }
                />
              </div>
            </div>
            {renderNavegacaoAba()}
          </section>
        ) : null}

        {abaAtiva === "vinculo" ? (
          <section className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <div className="space-y-1 md:col-span-2 xl:col-span-2">
                <Label>Termo de fomento *</Label>
                <Select
                  value={form.termoFomentoId}
                  onChange={(event) =>
                    setForm((atual) => ({
                      ...atual,
                      termoFomentoId: event.target.value
                    }))
                  }
                >
                  <option value="">Selecione</option>
                  {termos.map((termo) => (
                    <option key={termo.id} value={termo.id}>
                      {termo.numeroTermo} - {termo.descricaoObjeto || "Objeto não informado"}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Modalidade</Label>
                <Input
                  value={form.modalidade ?? ""}
                  onChange={(event) => setForm((atual) => ({ ...atual, modalidade: event.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Número do processo</Label>
                <Input
                  value={form.numeroProcesso ?? ""}
                  onChange={(event) =>
                    setForm((atual) => ({ ...atual, numeroProcesso: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-1 md:col-span-2 xl:col-span-3">
                <Label>Observações de vinculação</Label>
                <Textarea
                  rows={3}
                  value={form.observacoesVinculacao ?? ""}
                  onChange={(event) =>
                    setForm((atual) => ({ ...atual, observacoesVinculacao: event.target.value }))
                  }
                />
              </div>
            </div>

            {termoSelecionado ? (
              <div className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-primary-soft)]/35 p-3 text-sm">
                <p className="font-semibold text-[var(--g3-active)]">Resumo do termo selecionado</p>
                <div className="mt-2 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                  <p>
                    <span className="font-medium">Número:</span> {termoSelecionado.numeroTermo}
                  </p>
                  <p>
                    <span className="font-medium">Situação:</span> {termoSelecionado.situacao}
                  </p>
                  <p>
                    <span className="font-medium">Vigência:</span>{" "}
                    {formatarData(termoSelecionado.dataInicioVigencia)} até{" "}
                    {formatarData(termoSelecionado.dataFimVigencia)}
                  </p>
                  <p>
                    <span className="font-medium">Valor global:</span>{" "}
                    {formatarValorMonetario(termoSelecionado.valorGlobal)}
                  </p>
                </div>
              </div>
            ) : null}

            {renderNavegacaoAba()}
          </section>
        ) : null}
        {abaAtiva === "metas" ? (
          <section className="space-y-4">
            <div className="rounded-lg border border-[var(--g3-border)] p-3">
              <h3 className="text-sm font-semibold text-[var(--g3-active)]">Nova meta</h3>
              <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <div className="space-y-1 xl:col-span-2">
                  <Label>Descrição *</Label>
                  <Input
                    value={novaMeta.descricao}
                    onChange={(event) =>
                      setNovaMeta((atual) => ({
                        ...atual,
                        descricao: event.target.value
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Indicador</Label>
                  <Input
                    value={novaMeta.indicador ?? ""}
                    onChange={(event) =>
                      setNovaMeta((atual) => ({
                        ...atual,
                        indicador: event.target.value
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Unidade de medida</Label>
                  <Input
                    value={novaMeta.unidadeMedida ?? ""}
                    onChange={(event) =>
                      setNovaMeta((atual) => ({
                        ...atual,
                        unidadeMedida: event.target.value
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Quantidade prevista</Label>
                  <Input
                    type="number"
                    min={0}
                    value={novaMeta.quantidadePrevista ?? ""}
                    onChange={(event) =>
                      setNovaMeta((atual) => ({
                        ...atual,
                        quantidadePrevista: event.target.value ? Number(event.target.value) : undefined
                      }))
                    }
                  />
                </div>
                <div className="space-y-1 md:col-span-2 xl:col-span-5">
                  <Label>Resultado esperado</Label>
                  <Textarea
                    rows={2}
                    value={novaMeta.resultadoEsperado ?? ""}
                    onChange={(event) =>
                      setNovaMeta((atual) => ({
                        ...atual,
                        resultadoEsperado: event.target.value
                      }))
                    }
                  />
                </div>
              </div>
              <div className="mt-3">
                <Button type="button" size="sm" onClick={adicionarMeta} disabled={edicaoRestrita}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Adicionar meta
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
                  <tr>
                    <th className="px-3 py-2 text-left">Descrição</th>
                    <th className="px-3 py-2 text-left">Indicador</th>
                    <th className="px-3 py-2 text-left">Unidade</th>
                    <th className="px-3 py-2 text-left">Quantidade</th>
                    <th className="px-3 py-2 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {(form.metas ?? []).length ? (
                    (form.metas ?? []).map((meta, index) => (
                      <tr
                        key={`${meta.descricao}-${index}`}
                        className={`border-t border-[var(--g3-border)] ${
                          index % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35"
                        }`}
                      >
                        <td className="px-3 py-2">{meta.descricao}</td>
                        <td className="px-3 py-2">{meta.indicador ?? "---"}</td>
                        <td className="px-3 py-2">{meta.unidadeMedida ?? "---"}</td>
                        <td className="px-3 py-2">{meta.quantidadePrevista ?? "---"}</td>
                        <td className="px-3 py-2 text-right">
                          <Button
                            type="button"
                            size="sm"
                            variant="danger"
                            onClick={() => removerMeta(index)}
                            disabled={edicaoRestrita}
                          >
                            Remover
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-3 py-4 text-center text-[var(--g3-muted)]">
                        Nenhuma meta adicionada.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {renderNavegacaoAba()}
          </section>
        ) : null}

        {abaAtiva === "cronograma" ? (
          <section className="space-y-4">
            <div className="rounded-lg border border-[var(--g3-border)] p-3">
              <h3 className="text-sm font-semibold text-[var(--g3-active)]">Novo período</h3>
              <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-1">
                  <Label>Competência *</Label>
                  <Input
                    placeholder="MM/AAAA"
                    value={novoCronograma.competencia}
                    onChange={(event) =>
                      setNovoCronograma((atual) => ({
                        ...atual,
                        competencia: event.target.value
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Fonte de recurso</Label>
                  <Select
                    value={novoCronograma.fonteRecurso ?? ""}
                    onChange={(event) =>
                      setNovoCronograma((atual) => ({
                        ...atual,
                        fonteRecurso: event.target.value
                      }))
                    }
                  >
                    <option value="">Selecione</option>
                    {fontesRecurso.map((fonte) => (
                      <option key={fonte} value={fonte}>
                        {fonte}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Valor previsto</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={novoCronograma.valorPrevisto ?? ""}
                    onChange={(event) =>
                      setNovoCronograma((atual) => ({
                        ...atual,
                        valorPrevisto: event.target.value ? Number(event.target.value) : undefined
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Natureza da despesa</Label>
                  <Input
                    value={novoCronograma.naturezaDespesa ?? ""}
                    onChange={(event) =>
                      setNovoCronograma((atual) => ({
                        ...atual,
                        naturezaDespesa: event.target.value
                      }))
                    }
                  />
                </div>
                <div className="space-y-1 md:col-span-2 xl:col-span-4">
                  <Label>Descrição</Label>
                  <Input
                    value={novoCronograma.descricaoResumida ?? ""}
                    onChange={(event) =>
                      setNovoCronograma((atual) => ({
                        ...atual,
                        descricaoResumida: event.target.value
                      }))
                    }
                  />
                </div>
                <div className="space-y-1 md:col-span-2 xl:col-span-4">
                  <Label>Observações</Label>
                  <Textarea
                    rows={2}
                    value={novoCronograma.observacoes ?? ""}
                    onChange={(event) =>
                      setNovoCronograma((atual) => ({
                        ...atual,
                        observacoes: event.target.value
                      }))
                    }
                  />
                </div>
              </div>
              <div className="mt-3">
                <Button type="button" size="sm" onClick={adicionarCronograma} disabled={edicaoRestrita}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Adicionar período
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
                  <tr>
                    <th className="px-3 py-2 text-left">Competência</th>
                    <th className="px-3 py-2 text-left">Descrição</th>
                    <th className="px-3 py-2 text-left">Fonte</th>
                    <th className="px-3 py-2 text-left">Valor</th>
                    <th className="px-3 py-2 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {(form.cronograma ?? []).length ? (
                    (form.cronograma ?? []).map((item, index) => (
                      <tr
                        key={`${item.competencia}-${index}`}
                        className={`border-t border-[var(--g3-border)] ${
                          index % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35"
                        }`}
                      >
                        <td className="px-3 py-2">{item.competencia}</td>
                        <td className="px-3 py-2">{item.descricaoResumida ?? "---"}</td>
                        <td className="px-3 py-2">{item.fonteRecurso ?? "---"}</td>
                        <td className="px-3 py-2">{formatarValorMonetario(item.valorPrevisto)}</td>
                        <td className="px-3 py-2 text-right">
                          <Button
                            type="button"
                            size="sm"
                            variant="danger"
                            onClick={() => removerCronograma(index)}
                            disabled={edicaoRestrita}
                          >
                            Remover
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-3 py-4 text-center text-[var(--g3-muted)]">
                        Nenhum item de cronograma adicionado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {renderNavegacaoAba()}
          </section>
        ) : null}
        {abaAtiva === "equipe" ? (
          <section className="space-y-4">
            <div className="rounded-lg border border-[var(--g3-border)] p-3">
              <h3 className="text-sm font-semibold text-[var(--g3-active)]">Novo responsável</h3>
              <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <div className="space-y-1">
                  <Label>Nome *</Label>
                  <Input
                    value={novaEquipe.nome}
                    onChange={(event) =>
                      setNovaEquipe((atual) => ({
                        ...atual,
                        nome: event.target.value
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Função / cargo</Label>
                  <Input
                    value={novaEquipe.funcao ?? ""}
                    onChange={(event) =>
                      setNovaEquipe((atual) => ({
                        ...atual,
                        funcao: event.target.value
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Tipo de vínculo</Label>
                  <Input
                    value={novaEquipe.tipoVinculo ?? ""}
                    onChange={(event) =>
                      setNovaEquipe((atual) => ({
                        ...atual,
                        tipoVinculo: event.target.value
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>CPF</Label>
                  <Input
                    value={novaEquipe.cpf ?? ""}
                    onChange={(event) =>
                      setNovaEquipe((atual) => ({
                        ...atual,
                        cpf: event.target.value
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Carga horária</Label>
                  <Input
                    value={novaEquipe.cargaHoraria ?? ""}
                    onChange={(event) =>
                      setNovaEquipe((atual) => ({
                        ...atual,
                        cargaHoraria: event.target.value
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Contato</Label>
                  <Input
                    value={novaEquipe.contato ?? ""}
                    onChange={(event) =>
                      setNovaEquipe((atual) => ({
                        ...atual,
                        contato: event.target.value
                      }))
                    }
                  />
                </div>
              </div>
              <div className="mt-3">
                <Button type="button" size="sm" onClick={adicionarEquipe} disabled={edicaoRestrita}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Adicionar responsável
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-[var(--g3-border)]">
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
                  <tr>
                    <th className="px-3 py-2 text-left">Nome</th>
                    <th className="px-3 py-2 text-left">Função</th>
                    <th className="px-3 py-2 text-left">CPF</th>
                    <th className="px-3 py-2 text-left">Contato</th>
                    <th className="px-3 py-2 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {(form.equipe ?? []).length ? (
                    (form.equipe ?? []).map((item, index) => (
                      <tr
                        key={`${item.nome}-${index}`}
                        className={`border-t border-[var(--g3-border)] ${
                          index % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-primary-soft)]/35"
                        }`}
                      >
                        <td className="px-3 py-2">{item.nome}</td>
                        <td className="px-3 py-2">{item.funcao ?? "---"}</td>
                        <td className="px-3 py-2">{item.cpf ?? "---"}</td>
                        <td className="px-3 py-2">{item.contato ?? "---"}</td>
                        <td className="px-3 py-2 text-right">
                          <Button
                            type="button"
                            size="sm"
                            variant="danger"
                            onClick={() => removerEquipe(index)}
                            disabled={edicaoRestrita}
                          >
                            Remover
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-3 py-4 text-center text-[var(--g3-muted)]">
                        Nenhum responsável adicionado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {renderNavegacaoAba()}
          </section>
        ) : null}

        {abaAtiva === "arquivos" ? (
          <section className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <div className="space-y-1">
                <Label>Formato de exportação</Label>
                <Select
                  value={form.arquivoFormato ?? "PDF"}
                  onChange={(event) =>
                    setForm((atual) => ({
                      ...atual,
                      arquivoFormato: event.target.value
                    }))
                  }
                >
                  {formatosExportacao.map((formato) => (
                    <option key={formato} value={formato}>
                      {formato}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex items-end gap-2 md:col-span-1 xl:col-span-2">
                <Button type="button" size="sm" onClick={() => exportarPlano(form.arquivoFormato ?? "PDF")}>
                  <FileArchive className="mr-1.5 h-3.5 w-3.5" />
                  Gerar arquivo
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => exportarPlano("PDF")}>
                  Exportar PDF
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => exportarPlano("JSON")}>
                  Exportar JSON
                </Button>
              </div>
            </div>

            <div className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-primary-soft)]/30 p-3 text-sm text-[var(--g3-muted)]">
              O arquivo consolida identificação, vínculo, metas, cronograma e equipe. Após aprovação,
              mantenha as alterações rastreadas para preservar auditoria.
            </div>
            {renderNavegacaoAba()}
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
        onConfirm={() => void excluirAtual()}
        confirmarTexto="Excluir"
      />
    </>
  );
}
