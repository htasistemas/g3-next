import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRightLeft,
  BadgeDollarSign,
  Bell,
  ClipboardList,
  FileText,
  Gift,
  History,
  Pencil,
  Printer,
  RefreshCcw,
  Search,
  Trash2,
  UserRound,
  UsersRound
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { useNavigate } from "react-router-dom";
import { AdminPageLayout, type AdminAction, type AdminTab } from "@/components/admin/admin-page-layout";
import { PopupMensagem, type PopupMensagemState } from "@/components/admin/admin-popups";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  useAtualizarAtendimentoCentral,
  useAtualizarBeneficioCentral,
  useAtualizarEncaminhamentoCentral,
  useCentralBuscaBeneficiarios,
  useCentralVisaoGeral,
  useCriarAtendimentoCentral,
  useCriarBeneficioCentral,
  useCriarEncaminhamentoCentral,
  useExcluirAtendimentoCentral,
  useExcluirBeneficioCentral,
  useExcluirEncaminhamentoCentral,
  useGerarRelatorioCentralPdf
} from "@/features/central-atendimentos/use-central-atendimentos";
import { imprimirConteudoAtual, reservarJanelaRelatorio } from "@/lib/report-utils";
import type {
  CentralAtendimento,
  CentralAtendimentoForm,
  CentralBeneficio,
  CentralBeneficioForm,
  CentralBuscaBeneficiarioFiltro,
  CentralEncaminhamento,
  CentralEncaminhamentoForm,
  CentralHistoricoItem,
  CentralRelatorioTipo
} from "@/types/central-atendimentos";

type AbaId =
  | "resumo"
  | "atendimentos"
  | "beneficios"
  | "inscricoes"
  | "encaminhamentos"
  | "historico"
  | "custos"
  | "grupo-familiar";

const abas: AdminTab[] = [
  { id: "resumo", label: "Resumo", icon: ClipboardList },
  { id: "atendimentos", label: "Atendimentos", icon: FileText },
  { id: "beneficios", label: "Benefícios recebidos", icon: Gift },
  { id: "inscricoes", label: "Cursos, oficinas e atividades", icon: ArrowRightLeft },
  { id: "encaminhamentos", label: "Encaminhamentos", icon: Bell },
  { id: "historico", label: "Histórico consolidado", icon: History },
  { id: "custos", label: "Custos", icon: BadgeDollarSign },
  { id: "grupo-familiar", label: "Grupo familiar", icon: UsersRound }
];

const prioridadesAlerta = {
  alta: "border-rose-200 bg-rose-50 text-rose-800",
  media: "border-amber-200 bg-amber-50 text-amber-800",
  baixa: "border-sky-200 bg-sky-50 text-sky-800"
} as const;

const formularioAtendimentoInicial = (): CentralAtendimentoForm => ({
  data_hora: new Date().toISOString().slice(0, 16),
  tipo_atendimento: "Atendimento social",
  setor: "Serviço social",
  profissional_responsavel: "",
  prioridade: "Normal",
  status: "Aberto",
  classificacao: "",
  necessidade_identificada: "",
  resumo: "",
  observacoes: "",
  retorno_previsto: ""
});

const formularioBeneficioInicial = (): CentralBeneficioForm => ({
  data: new Date().toISOString().slice(0, 10),
  tipo: "Benefício eventual",
  item: "",
  quantidade: 1,
  valor_unitario: 0,
  valor_total: 0,
  origem_recurso: "",
  projeto_programa: "",
  profissional_responsavel: "",
  observacoes: "",
  ciente_alertas: false
});

const formularioEncaminhamentoInicial = (): CentralEncaminhamentoForm => ({
  data: new Date().toISOString().slice(0, 10),
  tipo: "Encaminhamento interno",
  destino: "",
  profissional: "",
  motivo: "",
  retorno_esperado: "",
  status: "Pendente",
  observacoes: ""
});

function formatarMoeda(valor?: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor ?? 0);
}

function formatarData(valor?: string) {
  if (!valor) return "—";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return valor;
  return data.toLocaleDateString("pt-BR");
}

function formatarDataHora(valor?: string) {
  if (!valor) return "—";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return valor;
  return data.toLocaleString("pt-BR");
}

function renderCardIndicador(titulo: string, valor: string | number, subtitulo?: string) {
  return (
    <div className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card)] p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--g3-muted)]">{titulo}</p>
      <p className="mt-2 text-2xl font-semibold text-[var(--g3-foreground)]">{valor}</p>
      {subtitulo ? <p className="mt-1 text-xs text-[var(--g3-muted)]">{subtitulo}</p> : null}
    </div>
  );
}

function filtrarHistorico(
  historico: CentralHistoricoItem[],
  filtros: { periodoInicio: string; periodoFim: string; categoria: string; profissional: string }
) {
  return historico.filter((item) => {
    if (filtros.categoria && item.categoria !== filtros.categoria) return false;
    if (filtros.profissional && !String(item.profissional ?? "").toLowerCase().includes(filtros.profissional.toLowerCase())) return false;
    if (filtros.periodoInicio && item.data && item.data.slice(0, 10) < filtros.periodoInicio) return false;
    if (filtros.periodoFim && item.data && item.data.slice(0, 10) > filtros.periodoFim) return false;
    return true;
  });
}

export function CentralAtendimentosPage() {
  const navigate = useNavigate();
  const [abaAtiva, setAbaAtiva] = useState<AbaId>("resumo");
  const [popup, setPopup] = useState<PopupMensagemState | null>(null);
  const [filtrosBusca, setFiltrosBusca] = useState<CentralBuscaBeneficiarioFiltro>({});
  const [beneficiarioId, setBeneficiarioId] = useState<string>();
  const [atendimentoForm, setAtendimentoForm] = useState<CentralAtendimentoForm>(formularioAtendimentoInicial);
  const [beneficioForm, setBeneficioForm] = useState<CentralBeneficioForm>(formularioBeneficioInicial);
  const [encaminhamentoForm, setEncaminhamentoForm] = useState<CentralEncaminhamentoForm>(formularioEncaminhamentoInicial);
  const [atendimentoEditandoId, setAtendimentoEditandoId] = useState<string | null>(null);
  const [beneficioEditandoId, setBeneficioEditandoId] = useState<string | null>(null);
  const [encaminhamentoEditandoId, setEncaminhamentoEditandoId] = useState<string | null>(null);
  const [filtrosHistorico, setFiltrosHistorico] = useState({
    periodoInicio: "",
    periodoFim: "",
    categoria: "",
    profissional: ""
  });

  const buscaQuery = useCentralBuscaBeneficiarios(filtrosBusca);
  const visaoQuery = useCentralVisaoGeral(beneficiarioId);
  const criarAtendimento = useCriarAtendimentoCentral(beneficiarioId);
  const atualizarAtendimento = useAtualizarAtendimentoCentral(beneficiarioId);
  const excluirAtendimento = useExcluirAtendimentoCentral(beneficiarioId);
  const criarBeneficio = useCriarBeneficioCentral(beneficiarioId);
  const atualizarBeneficio = useAtualizarBeneficioCentral(beneficiarioId);
  const excluirBeneficio = useExcluirBeneficioCentral(beneficiarioId);
  const criarEncaminhamento = useCriarEncaminhamentoCentral(beneficiarioId);
  const atualizarEncaminhamento = useAtualizarEncaminhamentoCentral(beneficiarioId);
  const excluirEncaminhamento = useExcluirEncaminhamentoCentral(beneficiarioId);
  const gerarRelatorioPdf = useGerarRelatorioCentralPdf(beneficiarioId);
  const visao = visaoQuery.data;

  const cardsResumo = useMemo(() => {
    if (!visao) return [];
    return [
      renderCardIndicador("Último atendimento", visao.indicadores.ultimoAtendimento || "—"),
      renderCardIndicador("Próximo atendimento", visao.indicadores.proximoAtendimento || "—"),
      renderCardIndicador("Benefícios no mês", visao.indicadores.beneficiosRecebidosMes),
      renderCardIndicador("Cesta básica no mês", visao.indicadores.cestaBasicaMes),
      renderCardIndicador("Atendimentos no mês", visao.indicadores.atendimentosMes),
      renderCardIndicador("Benefícios no ano", visao.indicadores.beneficiosAno),
      renderCardIndicador("Cursos ativos", visao.indicadores.cursosAtivos),
      renderCardIndicador("Custo do mês", formatarMoeda(visao.indicadores.custoMes)),
      renderCardIndicador("Custo do ano", formatarMoeda(visao.indicadores.custoAno)),
      renderCardIndicador("Custo histórico", formatarMoeda(visao.indicadores.custoHistorico)),
      renderCardIndicador("Alertas ativos", visao.indicadores.alertasAtivos)
    ];
  }, [visao]);

  const historicoFiltrado = useMemo(
    () => filtrarHistorico(visao?.historico ?? [], filtrosHistorico),
    [filtrosHistorico, visao?.historico]
  );

  function selecionarBeneficiario(id: string) {
    setBeneficiarioId(id);
    setAtendimentoEditandoId(null);
    setBeneficioEditandoId(null);
    setEncaminhamentoEditandoId(null);
    setAtendimentoForm(formularioAtendimentoInicial());
    setBeneficioForm(formularioBeneficioInicial());
    setEncaminhamentoForm(formularioEncaminhamentoInicial());
    setAbaAtiva("resumo");
  }

  function preencherAtendimento(item: CentralAtendimento) {
    setAtendimentoEditandoId(item.id);
    setAtendimentoForm({
      data_hora: item.dataHora.slice(0, 16),
      tipo_atendimento: item.tipoAtendimento,
      setor: item.setor,
      profissional_responsavel: item.profissionalResponsavel,
      prioridade: item.prioridade ?? "",
      status: item.status ?? "",
      classificacao: item.classificacao ?? "",
      necessidade_identificada: item.necessidadeIdentificada ?? "",
      resumo: item.resumo,
      observacoes: item.observacoes ?? "",
      retorno_previsto: item.retornoPrevisto ?? ""
    });
    setAbaAtiva("atendimentos");
  }

  function preencherBeneficio(item: CentralBeneficio) {
    setBeneficioEditandoId(item.id);
    setBeneficioForm({
      data: item.data ?? new Date().toISOString().slice(0, 10),
      tipo: item.tipo,
      item: item.item,
      quantidade: item.quantidade ?? 1,
      valor_unitario: item.valorUnitario ?? 0,
      valor_total: item.valorTotal ?? 0,
      origem_recurso: item.origemRecurso ?? "",
      projeto_programa: item.projetoPrograma ?? "",
      profissional_responsavel: item.profissionalResponsavel ?? "",
      observacoes: item.observacoes ?? "",
      ciente_alertas: item.cienteAlertas ?? false
    });
    setAbaAtiva("beneficios");
  }

  function preencherEncaminhamento(item: CentralEncaminhamento) {
    setEncaminhamentoEditandoId(item.id);
    setEncaminhamentoForm({
      data: item.data ?? new Date().toISOString().slice(0, 10),
      tipo: item.tipo,
      destino: item.destino,
      profissional: item.profissional,
      motivo: item.motivo,
      retorno_esperado: item.retornoEsperado ?? "",
      status: item.status ?? "",
      observacoes: item.observacoes ?? ""
    });
    setAbaAtiva("encaminhamentos");
  }

  function limparFormularioAtendimento() {
    setAtendimentoEditandoId(null);
    setAtendimentoForm(formularioAtendimentoInicial());
  }

  function limparFormularioBeneficio() {
    setBeneficioEditandoId(null);
    setBeneficioForm(formularioBeneficioInicial());
  }

  function limparFormularioEncaminhamento() {
    setEncaminhamentoEditandoId(null);
    setEncaminhamentoForm(formularioEncaminhamentoInicial());
  }

  async function salvarAtendimento() {
    if (!beneficiarioId) return;
    try {
      if (atendimentoEditandoId) {
        await atualizarAtendimento.mutateAsync({ id: atendimentoEditandoId, payload: atendimentoForm });
        setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Atendimento atualizado com sucesso." });
      } else {
        await criarAtendimento.mutateAsync(atendimentoForm);
        setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Atendimento registrado com sucesso." });
      }
      limparFormularioAtendimento();
    } catch (error: any) {
      setPopup({ tipo: "erro", titulo: "Erro", texto: error?.response?.data?.message ?? "Não foi possível salvar o atendimento." });
    }
  }

  async function salvarBeneficio() {
    if (!beneficiarioId) return;
    const payload = {
      ...beneficioForm,
      valor_total: Number(beneficioForm.quantidade ?? 0) * Number(beneficioForm.valor_unitario ?? 0)
    };
    try {
      if (beneficioEditandoId) {
        await atualizarBeneficio.mutateAsync({ id: beneficioEditandoId, payload });
        setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Benefício atualizado com sucesso." });
      } else {
        await criarBeneficio.mutateAsync(payload);
        setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Benefício registrado com sucesso." });
      }
      limparFormularioBeneficio();
    } catch (error: any) {
      setPopup({ tipo: "erro", titulo: "Erro", texto: error?.response?.data?.message ?? "Não foi possível salvar o benefício." });
    }
  }

  async function salvarEncaminhamento() {
    if (!beneficiarioId) return;
    try {
      if (encaminhamentoEditandoId) {
        await atualizarEncaminhamento.mutateAsync({ id: encaminhamentoEditandoId, payload: encaminhamentoForm });
        setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Encaminhamento atualizado com sucesso." });
      } else {
        await criarEncaminhamento.mutateAsync(encaminhamentoForm);
        setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Encaminhamento registrado com sucesso." });
      }
      limparFormularioEncaminhamento();
    } catch (error: any) {
      setPopup({ tipo: "erro", titulo: "Erro", texto: error?.response?.data?.message ?? "Não foi possível salvar o encaminhamento." });
    }
  }

  async function removerAtendimento(id: string) {
    if (!window.confirm("Deseja excluir este atendimento?")) return;
    try {
      await excluirAtendimento.mutateAsync(id);
      if (atendimentoEditandoId === id) limparFormularioAtendimento();
      setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Atendimento excluído com sucesso." });
    } catch (error: any) {
      setPopup({ tipo: "erro", titulo: "Erro", texto: error?.response?.data?.message ?? "Não foi possível excluir o atendimento." });
    }
  }

  async function removerBeneficio(id: string) {
    if (!window.confirm("Deseja excluir este benefício?")) return;
    try {
      await excluirBeneficio.mutateAsync(id);
      if (beneficioEditandoId === id) limparFormularioBeneficio();
      setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Benefício excluído com sucesso." });
    } catch (error: any) {
      setPopup({ tipo: "erro", titulo: "Erro", texto: error?.response?.data?.message ?? "Não foi possível excluir o benefício." });
    }
  }

  async function removerEncaminhamento(id: string) {
    if (!window.confirm("Deseja excluir este encaminhamento?")) return;
    try {
      await excluirEncaminhamento.mutateAsync(id);
      if (encaminhamentoEditandoId === id) limparFormularioEncaminhamento();
      setPopup({ tipo: "sucesso", titulo: "Confirmação", texto: "Encaminhamento excluído com sucesso." });
    } catch (error: any) {
      setPopup({ tipo: "erro", titulo: "Erro", texto: error?.response?.data?.message ?? "Não foi possível excluir o encaminhamento." });
    }
  }

  async function baixarRelatorioPdf(tipo: CentralRelatorioTipo) {
    if (!beneficiarioId) return;
    let janela: ReturnType<typeof reservarJanelaRelatorio> | null = null;
    try {
      janela = reservarJanelaRelatorio("Gerando relatório da Central");
      const blob = await gerarRelatorioPdf.mutateAsync(tipo);
      janela.publicar(blob);
    } catch (error: any) {
      janela?.fechar();
      setPopup({ tipo: "erro", titulo: "Erro", texto: error?.message ?? error?.response?.data?.message ?? "Não foi possível gerar o relatório em PDF." });
    }
  }

  const acoes: AdminAction[] = [
    { label: "Novo atendimento", icon: FileText, onClick: () => setAbaAtiva("atendimentos"), variant: "default", disabled: !beneficiarioId },
    { label: "Conceder benefício", icon: Gift, onClick: () => setAbaAtiva("beneficios"), variant: "outline", disabled: !beneficiarioId },
    { label: "Nova inscrição", icon: ArrowRightLeft, onClick: () => setAbaAtiva("inscricoes"), variant: "outline", disabled: !beneficiarioId },
    { label: "Novo encaminhamento", icon: Bell, onClick: () => setAbaAtiva("encaminhamentos"), variant: "outline", disabled: !beneficiarioId },
    { label: "Atualizar cadastro", icon: UserRound, onClick: () => beneficiarioId && navigate(`/beneficiarios/cadastro/${beneficiarioId}`), variant: "outline", disabled: !beneficiarioId },
    { label: "Ver família", icon: UsersRound, onClick: () => setAbaAtiva("grupo-familiar"), variant: "outline", disabled: !beneficiarioId },
    { label: "Ver custos", icon: BadgeDollarSign, onClick: () => setAbaAtiva("custos"), variant: "outline", disabled: !beneficiarioId },
    { label: "Imprimir resumo", icon: Printer, onClick: () => imprimirConteudoAtual({ titulo: "Central de atendimentos" }), variant: "outline", disabled: !beneficiarioId },
    { label: "Gerar relatório", icon: History, onClick: () => void baixarRelatorioPdf("individual"), variant: "outline", disabled: !beneficiarioId || gerarRelatorioPdf.isPending },
    { label: "Atualizar", icon: RefreshCcw, onClick: () => void visaoQuery.refetch(), variant: "ghost", disabled: !beneficiarioId }
  ];

  return (
    <>
      <AdminPageLayout
        tabs={abas}
        activeTab={abaAtiva}
        onChangeTab={(tabId) => setAbaAtiva(tabId as AbaId)}
        actions={acoes}
        sectionLabel="Atendimentos diários"
        pageTitle="Central de atendimentos"
        activeTitle={abas.find((item) => item.id === abaAtiva)?.label}
        codeBadge={visao?.beneficiario.codigo ? `Código do beneficiário: ${visao.beneficiario.codigo}` : undefined}
      >
        <section className="grid gap-3 xl:grid-cols-[360px,1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Busca inteligente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label>Nome, código, CPF, telefone, mãe, responsável ou família</Label>
                <div className="flex gap-2">
                  <Input value={filtrosBusca.busca ?? ""} onChange={(event) => setFiltrosBusca((atual) => ({ ...atual, busca: event.target.value }))} placeholder="Digite para localizar" />
                  <Button type="button" variant="outline" onClick={() => void buscaQuery.refetch()}>
                    <Search className="mr-1.5 h-3.5 w-3.5" />
                    Buscar
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-2">
                <div className="space-y-1">
                  <Label>Bairro</Label>
                  <Input value={filtrosBusca.bairro ?? ""} onChange={(event) => setFiltrosBusca((atual) => ({ ...atual, bairro: event.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Situação cadastral</Label>
                  <Select value={filtrosBusca.situacao_cadastral ?? ""} onChange={(event) => setFiltrosBusca((atual) => ({ ...atual, situacao_cadastral: event.target.value || undefined }))}>
                    <option value="">Todas</option>
                    <option value="ATIVO">Ativo</option>
                    <option value="INATIVO">Inativo</option>
                    <option value="DESATUALIZADO">Desatualizado</option>
                    <option value="INCOMPLETO">Incompleto</option>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Sexo</Label>
                  <Select value={filtrosBusca.sexo ?? ""} onChange={(event) => setFiltrosBusca((atual) => ({ ...atual, sexo: event.target.value || undefined }))}>
                    <option value="">Todos</option>
                    <option value="MASCULINO">Masculino</option>
                    <option value="FEMININO">Feminino</option>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Faixa etária</Label>
                  <Select value={filtrosBusca.faixa_etaria ?? ""} onChange={(event) => setFiltrosBusca((atual) => ({ ...atual, faixa_etaria: event.target.value || undefined }))}>
                    <option value="">Todas</option>
                    <option value="crianca">Criança</option>
                    <option value="adolescente">Adolescente</option>
                    <option value="adulto">Adulto</option>
                    <option value="idoso">Idoso</option>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <label className="flex items-center gap-2 text-sm text-[var(--g3-foreground)]"><Checkbox checked={Boolean(filtrosBusca.familia_vinculada)} onChange={(event) => setFiltrosBusca((atual) => ({ ...atual, familia_vinculada: event.target.checked || undefined }))} />Somente com família vinculada</label>
                <label className="flex items-center gap-2 text-sm text-[var(--g3-foreground)]"><Checkbox checked={Boolean(filtrosBusca.com_beneficio_no_mes)} onChange={(event) => setFiltrosBusca((atual) => ({ ...atual, com_beneficio_no_mes: event.target.checked || undefined }))} />Com benefício no mês</label>
                <label className="flex items-center gap-2 text-sm text-[var(--g3-foreground)]"><Checkbox checked={Boolean(filtrosBusca.sem_atendimento_recente)} onChange={(event) => setFiltrosBusca((atual) => ({ ...atual, sem_atendimento_recente: event.target.checked || undefined }))} />Sem atendimento recente</label>
              </div>

              <div className="space-y-2">
                <Label>Resultados</Label>
                <div className="max-h-[420px] space-y-2 overflow-auto pr-1">
                  {(buscaQuery.data?.beneficiarios ?? []).map((item) => (
                    <button key={item.id} type="button" className={`w-full rounded-xl border px-3 py-3 text-left ${beneficiarioId === item.id ? "border-[var(--g3-primary)] bg-[var(--g3-primary-soft)]" : "border-[var(--g3-border)] bg-[var(--g3-card)]"}`} onClick={() => selecionarBeneficiario(item.id)}>
                      <p className="text-sm font-semibold text-[var(--g3-foreground)]">{item.nomeCompleto}</p>
                      <p className="mt-1 text-xs text-[var(--g3-muted)]">{item.codigo ? `Código ${item.codigo}` : "Sem código"}{item.bairro ? ` • ${item.bairro}` : ""}</p>
                      <p className="text-xs text-[var(--g3-muted)]">{item.cpf || "CPF não informado"}{item.telefone ? ` • ${item.telefone}` : ""}</p>
                    </button>
                  ))}
                  {!buscaQuery.isLoading && !(buscaQuery.data?.beneficiarios ?? []).length ? <div className="rounded-lg border border-dashed border-[var(--g3-border)] px-4 py-6 text-center text-sm text-[var(--g3-muted)]">Nenhum beneficiário encontrado.</div> : null}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3" data-central-print="true">
            {visao?.beneficiario ? (
              <Card>
                <CardContent className="grid gap-4 p-4 md:grid-cols-[auto,1fr]">
                  <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
                    <UserRound className="h-10 w-10" />
                  </div>
                  <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                    <div><p className="text-xs text-[var(--g3-muted)]">Nome completo</p><p className="font-semibold">{visao.beneficiario.nomeCompleto}</p></div>
                    <div><p className="text-xs text-[var(--g3-muted)]">Código do beneficiário</p><p className="font-semibold">{visao.beneficiario.codigo || "—"}</p></div>
                    <div><p className="text-xs text-[var(--g3-muted)]">CPF</p><p className="font-semibold">{visao.beneficiario.cpf || "—"}</p></div>
                    <div><p className="text-xs text-[var(--g3-muted)]">Nascimento / idade</p><p className="font-semibold">{formatarData(visao.beneficiario.dataNascimento)}{visao.beneficiario.idade ? ` • ${visao.beneficiario.idade} anos` : ""}</p></div>
                    <div><p className="text-xs text-[var(--g3-muted)]">Sexo</p><p className="font-semibold">{visao.beneficiario.sexo || "—"}</p></div>
                    <div><p className="text-xs text-[var(--g3-muted)]">Telefone</p><p className="font-semibold">{visao.beneficiario.telefone || "—"}</p></div>
                    <div className="md:col-span-2 xl:col-span-3"><p className="text-xs text-[var(--g3-muted)]">Endereço</p><p className="font-semibold">{visao.beneficiario.endereco || "—"}</p></div>
                    <div><p className="text-xs text-[var(--g3-muted)]">Família vinculada</p><p className="font-semibold">{visao.beneficiario.familiaNome || "Sem vínculo"}</p></div>
                    <div><p className="text-xs text-[var(--g3-muted)]">Responsável familiar</p><p className="font-semibold">{visao.beneficiario.responsavelFamiliar || "—"}</p></div>
                    <div><p className="text-xs text-[var(--g3-muted)]">Situação cadastral</p><p className="font-semibold">{visao.beneficiario.situacaoCadastral || "—"}</p></div>
                    <div><p className="text-xs text-[var(--g3-muted)]">Último atendimento</p><p className="font-semibold">{formatarDataHora(visao.beneficiario.ultimoAtendimento)}</p></div>
                  </div>
                </CardContent>
              </Card>
            ) : <div className="rounded-xl border border-dashed border-[var(--g3-border)] bg-[var(--g3-card)] px-5 py-10 text-center text-sm text-[var(--g3-muted)]">Selecione um beneficiário para carregar a visão 360º da Central de atendimentos.</div>}

            {abaAtiva === "resumo" && visao ? <section className="space-y-3"><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{cardsResumo}</div><Card><CardHeader><CardTitle className="text-sm">Alertas automáticos</CardTitle></CardHeader><CardContent className="space-y-2">{visao.alertas.length ? visao.alertas.map((item, index) => <div key={`${item.titulo}-${index}`} className={`rounded-xl border px-3 py-3 ${prioridadesAlerta[item.prioridade]}`}><div className="flex items-start gap-2"><AlertTriangle className="mt-0.5 h-4 w-4" /><div><p className="font-semibold">{item.titulo}</p><p className="text-sm">{item.descricao}</p></div></div></div>) : <p className="text-sm text-[var(--g3-muted)]">Nenhum alerta ativo no momento.</p>}</CardContent></Card><Card><CardHeader><CardTitle className="text-sm">Últimas movimentações</CardTitle></CardHeader><CardContent className="space-y-2">{visao.historico.slice(0, 6).map((item) => <div key={item.id} className="rounded-lg border border-[var(--g3-border)] p-3"><p className="text-xs text-[var(--g3-muted)]">{item.categoria} • {formatarDataHora(item.data)}</p><p className="font-semibold">{item.titulo}</p><p className="text-sm text-[var(--g3-muted)]">{item.descricao || "Sem detalhamento adicional."}</p></div>)}</CardContent></Card></section> : null}

            {abaAtiva === "atendimentos" && visao ? <section className="space-y-3"><Card><CardHeader><CardTitle className="text-sm">{atendimentoEditandoId ? "Editar atendimento" : "Novo atendimento"}</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><div className="space-y-1"><Label>Data e hora</Label><Input type="datetime-local" value={atendimentoForm.data_hora} onChange={(event) => setAtendimentoForm((atual) => ({ ...atual, data_hora: event.target.value }))} /></div><div className="space-y-1"><Label>Tipo de atendimento</Label><Input value={atendimentoForm.tipo_atendimento} onChange={(event) => setAtendimentoForm((atual) => ({ ...atual, tipo_atendimento: event.target.value }))} /></div><div className="space-y-1"><Label>Setor</Label><Input value={atendimentoForm.setor} onChange={(event) => setAtendimentoForm((atual) => ({ ...atual, setor: event.target.value }))} /></div><div className="space-y-1"><Label>Profissional responsável</Label><Input value={atendimentoForm.profissional_responsavel} onChange={(event) => setAtendimentoForm((atual) => ({ ...atual, profissional_responsavel: event.target.value }))} /></div><div className="space-y-1"><Label>Prioridade</Label><Select value={atendimentoForm.prioridade ?? ""} onChange={(event) => setAtendimentoForm((atual) => ({ ...atual, prioridade: event.target.value }))}><option>Normal</option><option>Alta</option><option>Urgente</option></Select></div><div className="space-y-1"><Label>Status</Label><Select value={atendimentoForm.status ?? ""} onChange={(event) => setAtendimentoForm((atual) => ({ ...atual, status: event.target.value }))}><option>Aberto</option><option>Em andamento</option><option>Concluído</option></Select></div><div className="space-y-1"><Label>Classificação</Label><Input value={atendimentoForm.classificacao ?? ""} onChange={(event) => setAtendimentoForm((atual) => ({ ...atual, classificacao: event.target.value }))} /></div><div className="space-y-1"><Label>Retorno previsto</Label><Input type="date" value={atendimentoForm.retorno_previsto ?? ""} onChange={(event) => setAtendimentoForm((atual) => ({ ...atual, retorno_previsto: event.target.value }))} /></div><div className="space-y-1 md:col-span-2 xl:col-span-4"><Label>Necessidade identificada</Label><Textarea rows={2} value={atendimentoForm.necessidade_identificada ?? ""} onChange={(event) => setAtendimentoForm((atual) => ({ ...atual, necessidade_identificada: event.target.value }))} /></div><div className="space-y-1 md:col-span-2 xl:col-span-4"><Label>Resumo do atendimento</Label><Textarea rows={3} value={atendimentoForm.resumo} onChange={(event) => setAtendimentoForm((atual) => ({ ...atual, resumo: event.target.value }))} /></div><div className="space-y-1 md:col-span-2 xl:col-span-4"><Label>Observações técnicas</Label><Textarea rows={2} value={atendimentoForm.observacoes ?? ""} onChange={(event) => setAtendimentoForm((atual) => ({ ...atual, observacoes: event.target.value }))} /></div><div className="flex gap-2 md:col-span-2 xl:col-span-4"><Button type="button" onClick={() => void salvarAtendimento()} disabled={criarAtendimento.isPending || atualizarAtendimento.isPending}>{atendimentoEditandoId ? "Atualizar atendimento" : "Salvar atendimento"}</Button>{atendimentoEditandoId ? <Button type="button" variant="outline" onClick={limparFormularioAtendimento}>Cancelar edição</Button> : null}</div></CardContent></Card><Card><CardHeader><CardTitle className="text-sm">Histórico de atendimentos</CardTitle></CardHeader><CardContent className="overflow-auto"><table className="min-w-full text-sm"><thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]"><tr><th className="px-3 py-2 text-left">Data</th><th className="px-3 py-2 text-left">Tipo</th><th className="px-3 py-2 text-left">Setor</th><th className="px-3 py-2 text-left">Responsável</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2 text-left">Resumo</th><th className="px-3 py-2 text-left">Ações</th></tr></thead><tbody>{visao.atendimentos.map((item) => <tr key={item.id} className="border-t border-[var(--g3-border)]"><td className="px-3 py-2">{formatarDataHora(item.dataHora)}</td><td className="px-3 py-2">{item.tipoAtendimento}</td><td className="px-3 py-2">{item.setor}</td><td className="px-3 py-2">{item.profissionalResponsavel}</td><td className="px-3 py-2">{item.status || "—"}</td><td className="px-3 py-2">{item.resumo}</td><td className="px-3 py-2"><div className="flex gap-2"><Button type="button" variant="outline" size="sm" onClick={() => preencherAtendimento(item)}><Pencil className="h-3.5 w-3.5" /></Button><Button type="button" variant="outline" size="sm" onClick={() => void removerAtendimento(item.id)}><Trash2 className="h-3.5 w-3.5" /></Button></div></td></tr>)}</tbody></table></CardContent></Card></section> : null}

            {abaAtiva === "beneficios" && visao ? <section className="space-y-3"><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{renderCardIndicador("Recebeu cesta no mês", visao.indicadores.cestaBasicaMes ? "Sim" : "Não")}{renderCardIndicador("Família recebeu cesta no mês", (visao.grupoFamiliar?.alertas ?? []).length ? "Sim" : "Não")}{renderCardIndicador("Custo acumulado no mês", formatarMoeda(visao.custos.beneficiario.mes))}{renderCardIndicador("Custo acumulado no ano", formatarMoeda(visao.custos.beneficiario.ano))}</div><Card><CardHeader><CardTitle className="text-sm">{beneficioEditandoId ? "Editar benefício" : "Concessão de benefício"}</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><div className="space-y-1"><Label>Data</Label><Input type="date" value={beneficioForm.data} onChange={(event) => setBeneficioForm((atual) => ({ ...atual, data: event.target.value }))} /></div><div className="space-y-1"><Label>Tipo</Label><Input value={beneficioForm.tipo} onChange={(event) => setBeneficioForm((atual) => ({ ...atual, tipo: event.target.value }))} /></div><div className="space-y-1"><Label>Item / produto</Label><Input value={beneficioForm.item} onChange={(event) => setBeneficioForm((atual) => ({ ...atual, item: event.target.value }))} /></div><div className="space-y-1"><Label>Responsável</Label><Input value={beneficioForm.profissional_responsavel} onChange={(event) => setBeneficioForm((atual) => ({ ...atual, profissional_responsavel: event.target.value }))} /></div><div className="space-y-1"><Label>Quantidade</Label><Input type="number" value={beneficioForm.quantidade ?? 0} onChange={(event) => setBeneficioForm((atual) => ({ ...atual, quantidade: Number(event.target.value) }))} /></div><div className="space-y-1"><Label>Valor unitário</Label><Input type="number" value={beneficioForm.valor_unitario ?? 0} onChange={(event) => setBeneficioForm((atual) => ({ ...atual, valor_unitario: Number(event.target.value) }))} /></div><div className="space-y-1"><Label>Origem do recurso</Label><Input value={beneficioForm.origem_recurso ?? ""} onChange={(event) => setBeneficioForm((atual) => ({ ...atual, origem_recurso: event.target.value }))} /></div><div className="space-y-1"><Label>Projeto / programa</Label><Input value={beneficioForm.projeto_programa ?? ""} onChange={(event) => setBeneficioForm((atual) => ({ ...atual, projeto_programa: event.target.value }))} /></div><div className="space-y-1 md:col-span-2 xl:col-span-4"><Label>Observações</Label><Textarea rows={2} value={beneficioForm.observacoes ?? ""} onChange={(event) => setBeneficioForm((atual) => ({ ...atual, observacoes: event.target.value }))} /></div><label className="flex items-center gap-2 text-sm md:col-span-2 xl:col-span-4"><Checkbox checked={Boolean(beneficioForm.ciente_alertas)} onChange={(event) => setBeneficioForm((atual) => ({ ...atual, ciente_alertas: event.target.checked }))} />Confirmo ciência dos alertas apresentados pela Central</label><div className="flex gap-2 md:col-span-2 xl:col-span-4"><Button type="button" onClick={() => void salvarBeneficio()} disabled={criarBeneficio.isPending || atualizarBeneficio.isPending}>{beneficioEditandoId ? "Atualizar benefício" : "Salvar benefício"}</Button>{beneficioEditandoId ? <Button type="button" variant="outline" onClick={limparFormularioBeneficio}>Cancelar edição</Button> : null}</div></CardContent></Card><Card><CardHeader><CardTitle className="text-sm">Benefícios recebidos</CardTitle></CardHeader><CardContent className="overflow-auto"><table className="min-w-full text-sm"><thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]"><tr><th className="px-3 py-2 text-left">Data</th><th className="px-3 py-2 text-left">Tipo</th><th className="px-3 py-2 text-left">Item</th><th className="px-3 py-2 text-left">Qtd.</th><th className="px-3 py-2 text-left">Valor total</th><th className="px-3 py-2 text-left">Projeto</th><th className="px-3 py-2 text-left">Ações</th></tr></thead><tbody>{visao.beneficios.map((item) => <tr key={`${item.origem}-${item.id}`} className="border-t border-[var(--g3-border)]"><td className="px-3 py-2">{formatarData(item.data)}</td><td className="px-3 py-2">{item.tipo}</td><td className="px-3 py-2">{item.item}</td><td className="px-3 py-2">{item.quantidade ?? 0}</td><td className="px-3 py-2">{formatarMoeda(item.valorTotal)}</td><td className="px-3 py-2">{item.projetoPrograma || "—"}</td><td className="px-3 py-2">{item.origem === "central" ? <div className="flex gap-2"><Button type="button" variant="outline" size="sm" onClick={() => preencherBeneficio(item)}><Pencil className="h-3.5 w-3.5" /></Button><Button type="button" variant="outline" size="sm" onClick={() => void removerBeneficio(item.id)}><Trash2 className="h-3.5 w-3.5" /></Button></div> : <span className="text-xs text-[var(--g3-muted)]">Registro integrado</span>}</td></tr>)}</tbody></table></CardContent></Card></section> : null}

            {abaAtiva === "inscricoes" && visao ? <section className="space-y-3"><Card><CardHeader><CardTitle className="text-sm">Cursos, oficinas e atividades</CardTitle></CardHeader><CardContent className="overflow-auto"><table className="min-w-full text-sm"><thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]"><tr><th className="px-3 py-2 text-left">Nome</th><th className="px-3 py-2 text-left">Tipo</th><th className="px-3 py-2 text-left">Data da inscrição</th><th className="px-3 py-2 text-left">Situação</th><th className="px-3 py-2 text-left">Responsável</th><th className="px-3 py-2 text-left">Local</th></tr></thead><tbody>{visao.inscricoes.map((item) => <tr key={item.id} className="border-t border-[var(--g3-border)]"><td className="px-3 py-2">{item.nome}</td><td className="px-3 py-2">{item.tipo || "—"}</td><td className="px-3 py-2">{formatarData(item.dataInscricao)}</td><td className="px-3 py-2">{item.situacao || "—"}</td><td className="px-3 py-2">{item.responsavel || "—"}</td><td className="px-3 py-2">{item.local || "—"}</td></tr>)}</tbody></table><div className="mt-4"><Button type="button" variant="outline" onClick={() => navigate("/atendimentos/matriculas")}>Ir para inscrições</Button></div></CardContent></Card></section> : null}

            {abaAtiva === "encaminhamentos" && visao ? <section className="space-y-3"><Card><CardHeader><CardTitle className="text-sm">{encaminhamentoEditandoId ? "Editar encaminhamento" : "Novo encaminhamento"}</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><div className="space-y-1"><Label>Data</Label><Input type="date" value={encaminhamentoForm.data} onChange={(event) => setEncaminhamentoForm((atual) => ({ ...atual, data: event.target.value }))} /></div><div className="space-y-1"><Label>Tipo</Label><Input value={encaminhamentoForm.tipo} onChange={(event) => setEncaminhamentoForm((atual) => ({ ...atual, tipo: event.target.value }))} /></div><div className="space-y-1"><Label>Destino</Label><Input value={encaminhamentoForm.destino} onChange={(event) => setEncaminhamentoForm((atual) => ({ ...atual, destino: event.target.value }))} /></div><div className="space-y-1"><Label>Profissional</Label><Input value={encaminhamentoForm.profissional} onChange={(event) => setEncaminhamentoForm((atual) => ({ ...atual, profissional: event.target.value }))} /></div><div className="space-y-1"><Label>Retorno esperado</Label><Input type="date" value={encaminhamentoForm.retorno_esperado ?? ""} onChange={(event) => setEncaminhamentoForm((atual) => ({ ...atual, retorno_esperado: event.target.value }))} /></div><div className="space-y-1"><Label>Status</Label><Select value={encaminhamentoForm.status ?? ""} onChange={(event) => setEncaminhamentoForm((atual) => ({ ...atual, status: event.target.value }))}><option>Pendente</option><option>Em andamento</option><option>Concluído</option></Select></div><div className="space-y-1 md:col-span-2 xl:col-span-4"><Label>Motivo</Label><Textarea rows={3} value={encaminhamentoForm.motivo} onChange={(event) => setEncaminhamentoForm((atual) => ({ ...atual, motivo: event.target.value }))} /></div><div className="space-y-1 md:col-span-2 xl:col-span-4"><Label>Observações</Label><Textarea rows={2} value={encaminhamentoForm.observacoes ?? ""} onChange={(event) => setEncaminhamentoForm((atual) => ({ ...atual, observacoes: event.target.value }))} /></div><div className="flex gap-2 md:col-span-2 xl:col-span-4"><Button type="button" onClick={() => void salvarEncaminhamento()} disabled={criarEncaminhamento.isPending || atualizarEncaminhamento.isPending}>{encaminhamentoEditandoId ? "Atualizar encaminhamento" : "Salvar encaminhamento"}</Button>{encaminhamentoEditandoId ? <Button type="button" variant="outline" onClick={limparFormularioEncaminhamento}>Cancelar edição</Button> : null}</div></CardContent></Card><Card><CardHeader><CardTitle className="text-sm">Lista de encaminhamentos</CardTitle></CardHeader><CardContent className="overflow-auto"><table className="min-w-full text-sm"><thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]"><tr><th className="px-3 py-2 text-left">Data</th><th className="px-3 py-2 text-left">Tipo</th><th className="px-3 py-2 text-left">Destino</th><th className="px-3 py-2 text-left">Profissional</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2 text-left">Motivo</th><th className="px-3 py-2 text-left">Ações</th></tr></thead><tbody>{visao.encaminhamentos.map((item) => <tr key={item.id} className="border-t border-[var(--g3-border)]"><td className="px-3 py-2">{formatarData(item.data)}</td><td className="px-3 py-2">{item.tipo}</td><td className="px-3 py-2">{item.destino}</td><td className="px-3 py-2">{item.profissional}</td><td className="px-3 py-2">{item.status || "—"}</td><td className="px-3 py-2">{item.motivo}</td><td className="px-3 py-2"><div className="flex gap-2"><Button type="button" variant="outline" size="sm" onClick={() => preencherEncaminhamento(item)}><Pencil className="h-3.5 w-3.5" /></Button><Button type="button" variant="outline" size="sm" onClick={() => void removerEncaminhamento(item.id)}><Trash2 className="h-3.5 w-3.5" /></Button></div></td></tr>)}</tbody></table></CardContent></Card></section> : null}

            {abaAtiva === "historico" && visao ? <section className="space-y-3"><Card><CardHeader><CardTitle className="text-sm">Filtros do histórico consolidado</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><div className="space-y-1"><Label>Período inicial</Label><Input type="date" value={filtrosHistorico.periodoInicio} onChange={(event) => setFiltrosHistorico((atual) => ({ ...atual, periodoInicio: event.target.value }))} /></div><div className="space-y-1"><Label>Período final</Label><Input type="date" value={filtrosHistorico.periodoFim} onChange={(event) => setFiltrosHistorico((atual) => ({ ...atual, periodoFim: event.target.value }))} /></div><div className="space-y-1"><Label>Categoria</Label><Select value={filtrosHistorico.categoria} onChange={(event) => setFiltrosHistorico((atual) => ({ ...atual, categoria: event.target.value }))}><option value="">Todas</option>{Array.from(new Set(visao.historico.map((item) => item.categoria))).map((categoria) => <option key={categoria} value={categoria}>{categoria}</option>)}</Select></div><div className="space-y-1"><Label>Profissional</Label><Input value={filtrosHistorico.profissional} onChange={(event) => setFiltrosHistorico((atual) => ({ ...atual, profissional: event.target.value }))} /></div></CardContent></Card><section className="space-y-3">{historicoFiltrado.map((item) => <div key={item.id} className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card)] p-4"><p className="text-xs text-[var(--g3-muted)]">{item.categoria} • {formatarDataHora(item.data)}</p><p className="mt-1 font-semibold">{item.titulo}</p><p className="text-sm text-[var(--g3-muted)]">{item.descricao || "Sem descrição adicional."}</p></div>)}{!historicoFiltrado.length ? <div className="rounded-xl border border-dashed border-[var(--g3-border)] px-5 py-8 text-center text-sm text-[var(--g3-muted)]">Nenhum evento encontrado para os filtros informados.</div> : null}</section></section> : null}

            {abaAtiva === "custos" && visao ? <section className="space-y-3"><div className="grid gap-3 md:grid-cols-3">{renderCardIndicador("Custo do mês", formatarMoeda(visao.custos.beneficiario.mes))}{renderCardIndicador("Custo do ano", formatarMoeda(visao.custos.beneficiario.ano))}{renderCardIndicador("Custo histórico", formatarMoeda(visao.custos.beneficiario.total))}</div><div className="grid gap-3 xl:grid-cols-2"><Card><CardHeader><CardTitle className="text-sm">Evolução mensal</CardTitle></CardHeader><CardContent className="h-72"><ResponsiveContainer width="100%" height="100%"><LineChart data={visao.custos.evolucaoMensal}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="mes" /><YAxis /><Tooltip formatter={(valor) => formatarMoeda(Number(valor))} /><Line type="monotone" dataKey="valor" stroke="#0f766e" strokeWidth={2} /></LineChart></ResponsiveContainer></CardContent></Card><Card><CardHeader><CardTitle className="text-sm">Composição por categoria</CardTitle></CardHeader><CardContent className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={visao.custos.porTipo}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="nome" hide /><YAxis /><Tooltip formatter={(valor) => formatarMoeda(Number(valor))} /><Bar dataKey="valor">{visao.custos.porTipo.map((item) => <Cell key={item.nome} fill="#0f766e" />)}</Bar></BarChart></ResponsiveContainer></CardContent></Card></div><Card><CardHeader><CardTitle className="text-sm">Detalhamento de custos</CardTitle></CardHeader><CardContent className="overflow-auto"><table className="min-w-full text-sm"><thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]"><tr><th className="px-3 py-2 text-left">Data</th><th className="px-3 py-2 text-left">Tipo</th><th className="px-3 py-2 text-left">Item</th><th className="px-3 py-2 text-left">Valor</th></tr></thead><tbody>{visao.custos.detalhamento.map((item, index) => <tr key={`${item.data}-${item.item}-${index}`} className="border-t border-[var(--g3-border)]"><td className="px-3 py-2">{formatarData(item.data)}</td><td className="px-3 py-2">{item.tipo}</td><td className="px-3 py-2">{item.item}</td><td className="px-3 py-2">{formatarMoeda(item.valorTotal)}</td></tr>)}</tbody></table></CardContent></Card></section> : null}

            {abaAtiva === "grupo-familiar" && visao?.grupoFamiliar ? <section className="space-y-3"><div className="grid gap-3 md:grid-cols-3">{renderCardIndicador("Custo familiar no mês", formatarMoeda(visao.grupoFamiliar.custoMes))}{renderCardIndicador("Custo familiar no ano", formatarMoeda(visao.grupoFamiliar.custoAno))}{renderCardIndicador("Custo histórico familiar", formatarMoeda(visao.grupoFamiliar.custoHistorico))}</div><Card><CardHeader><CardTitle className="text-sm">Contexto familiar</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><div><p className="text-xs text-[var(--g3-muted)]">Família</p><p className="font-semibold">{visao.grupoFamiliar.nome}</p></div><div><p className="text-xs text-[var(--g3-muted)]">Responsável familiar</p><p className="font-semibold">{visao.grupoFamiliar.responsavelFamiliar || "—"}</p></div><div><p className="text-xs text-[var(--g3-muted)]">Situação familiar</p><p className="font-semibold">{visao.grupoFamiliar.situacaoFamiliar || "—"}</p></div><div><p className="text-xs text-[var(--g3-muted)]">Endereço principal</p><p className="font-semibold">{visao.grupoFamiliar.enderecoPrincipal || "—"}</p></div></CardContent></Card><Card><CardHeader><CardTitle className="text-sm">Membros da família</CardTitle></CardHeader><CardContent className="space-y-2">{visao.grupoFamiliar.membros.map((membro) => <button key={membro.id} type="button" className="flex w-full items-center justify-between rounded-xl border border-[var(--g3-border)] px-3 py-3 text-left hover:bg-[var(--g3-primary-soft)]" onClick={() => selecionarBeneficiario(membro.id)}><div><p className="font-semibold">{membro.nomeCompleto}</p><p className="text-xs text-[var(--g3-muted)]">{membro.parentesco || "Sem parentesco informado"}{membro.responsavelFamiliar ? " • Responsável familiar" : ""}</p></div><span className="text-xs text-[var(--g3-muted)]">{membro.codigo || "—"}</span></button>)}</CardContent></Card></section> : null}
          </div>
        </section>
      </AdminPageLayout>
      {popup ? <PopupMensagem popup={popup} onClose={() => setPopup(null)} /> : null}
    </>
  );
}
