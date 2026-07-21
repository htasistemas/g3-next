import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { ResponsiveChart } from "@/components/charts/responsive-chart";
import {
  Archive,
  BanknoteArrowUp,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CarFront,
  BookOpen,
  FolderHeart,
  HandHeart,
  Images,
  LayoutDashboard,
  Package,
  RefreshCw,
  UsersRound
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDocumentosInstituicao } from "@/features/documentos-instituicao/use-documentos-instituicao";
import { useAuth } from "@/hooks/use-auth";
import { useItensAlmoxarifado } from "@/features/almoxarifado/use-almoxarifado";
import { useMotoristasAutorizados } from "@/features/controle-veiculos/use-controle-veiculos";
import { useDashboardAssistencia } from "@/features/dashboard/use-dashboard";
import { useEmprestimosEventos } from "@/features/emprestimos-eventos/use-emprestimos-eventos";
import { fotosEventosService } from "@/services/fotos-eventos.service";
import { usePatrimonios } from "@/features/patrimonios/use-patrimonios";
import { classesTelaPadraoBeneficiario } from "@/lib/tela-padrao-beneficiario";
import { matriculasService } from "@/services/matriculas.service";

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2
  }).format(valor);
}

function formatarPercentual(valor: number) {
  return `${Number.isFinite(valor) ? valor.toFixed(1) : "0.0"}%`;
}

function encurtarRotuloGrafico(texto: string, limite = 32) {
  if (texto.length <= limite) return texto;
  return `${texto.slice(0, limite - 1)}…`;
}

const coresCadastros = [
  "var(--g3-primary)",
  "var(--g3-secondary)",
  "var(--g3-accent)",
  "var(--g3-warning)",
  "var(--g3-success)",
  "var(--g3-info)",
  "var(--g3-muted)"
];
const classeCardVisaoGeral =
  "rounded-xl border border-[var(--g3-border)] bg-[linear-gradient(180deg,var(--g3-dashboard-card)_0%,var(--g3-dashboard-card-soft)_100%)] shadow-[0_18px_40px_-26px_rgba(15,23,42,0.22)]";
const classeCardVisaoGeralInterativo = `${classeCardVisaoGeral} transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--g3-primary)] hover:shadow-[0_22px_48px_-22px_rgba(15,23,42,0.26)]`;
const classeCardVisaoGeralResumo =
  "rounded-xl border border-[var(--g3-primary-soft)] bg-[linear-gradient(180deg,var(--g3-primary-soft)_0%,var(--g3-card)_100%)] shadow-[0_18px_40px_-26px_rgba(15,23,42,0.22)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--g3-primary)] hover:shadow-[0_22px_48px_-22px_rgba(15,23,42,0.26)]";
const classeCardVisaoGeralSuave =
  "rounded-xl border border-[var(--g3-border)] bg-[var(--g3-dashboard-card-soft)] shadow-[0_14px_32px_-26px_rgba(15,23,42,0.16)] backdrop-blur-[2px]";

function obterRotaCadastro(nome: string) {
  switch (nome) {
    case "Almoxarifado":
      return "/setor-administrativo/almoxarifado";
    case "Biblioteca":
      return "/atendimentos/biblioteca";
    case "Veículos":
      return "/setor-administrativo/controle-veiculos";
    case "Profissionais":
      return "/cadastros/profissionais";
    case "Voluntários":
      return "/cadastros/voluntariado";
    case "Famílias":
      return "/cadastros/vinculo-familiar";
    case "Patrimônio":
      return "/setor-administrativo/patrimonio";
    default:
      return "/dashboard/visao-geral";
  }
}

export function VisaoGeralPage() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const { data, isLoading, isFetching, isError, refetch } = useDashboardAssistencia(
    {},
    { autoRefresh: true }
  );
  const { data: matriculasResumoData } = useQuery({
    queryKey: ["dashboard", "visao-geral", "matriculas-resumo", usuario?.tenant_id ?? "sem-tenant"],
    queryFn: () => matriculasService.obterResumoCatalogo(),
    enabled: !!usuario,
    staleTime: 60_000
  });
  const { data: fotosEventosResumoData } = useQuery({
    queryKey: ["dashboard", "visao-geral", "fotos-eventos-resumo", usuario?.tenant_id ?? "sem-tenant"],
    queryFn: () => fotosEventosService.resumo(),
    enabled: !!usuario,
    staleTime: 60_000
  });
  const { data: itensAlmoxarifadoData } = useItensAlmoxarifado();
  const { data: patrimoniosData } = usePatrimonios();
  const { data: motoristasAutorizadosData } = useMotoristasAutorizados();
  const { data: documentosInstituicaoData } = useDocumentosInstituicao();
  const { data: emprestimosEventosData } = useEmprestimosEventos({});

  const itensAlmoxarifado = itensAlmoxarifadoData?.itens ?? [];
  const patrimonios = patrimoniosData?.patrimonios ?? [];
  const motoristasAutorizados = motoristasAutorizadosData ?? [];
  const documentosInstituicao = documentosInstituicaoData ?? [];
  const emprestimosEventos = emprestimosEventosData?.emprestimos ?? [];

  const termosVencidos = useMemo(() => {
    const hoje = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "America/Sao_Paulo"
    }).format(new Date());

    return (data?.termos.alertas ?? []).filter((alerta) => {
      const vigenciaFim = alerta.vigenciaFim?.slice(0, 10);
      return Boolean(vigenciaFim && vigenciaFim < hoje);
    }).length;
  }, [data?.termos.alertas]);

  const totalMotoristasAutorizados = useMemo(() => {
    const grupos = new Set<string>();
    for (const item of motoristasAutorizados) {
      grupos.add(`${item.tipoOrigem}-${item.motoristaId}`);
    }
    return grupos.size;
  }, [motoristasAutorizados]);

  const documentosVencidos = useMemo(
    () => documentosInstituicao.filter((item) => item.situacao === "vencido").length,
    [documentosInstituicao]
  );

  const documentosAVencer = useMemo(
    () => documentosInstituicao.filter((item) => item.situacao === "vence_em_breve").length,
    [documentosInstituicao]
  );

  const resumoEventosEmprestimos = useMemo(() => {
    const agora = Date.now();
    const abertos = emprestimosEventos.filter((item) => !["DEVOLVIDO", "CANCELADO"].includes(item.status));
    return {
      ativos: abertos.length,
      futuros: abertos.filter((item) => new Date(item.dataRetiradaPrevista).getTime() > agora).length,
      atraso: abertos.filter((item) => new Date(item.dataDevolucaoPrevista).getTime() < agora).length
    };
  }, [emprestimosEventos]);

  const dadosCadastros = useMemo(() => {
    if (!data) return [];
    return [
      { nome: "Almoxarifado", valor: itensAlmoxarifado.length || data.cadastros.itensAlmoxarifado },
      { nome: "Profissionais", valor: data.cadastros.profissionais },
      { nome: "Voluntários", valor: data.cadastros.voluntarios },
      { nome: "Famílias", valor: data.cadastros.familias },
      { nome: "Patrimônio", valor: patrimonios.length || data.cadastros.bensPatrimonio }
    ]
      .sort((a, b) => b.valor - a.valor)
      .map((item, index) => ({
        ...item,
        cor: coresCadastros[index % coresCadastros.length]
      }));
  }, [data, itensAlmoxarifado.length, patrimonios.length]);

  const dadosFinanceiro = useMemo(() => {
    if (!data) return [];
    return [
      { nome: "A receber", valor: data.financeiro.valoresAReceber, cor: "var(--g3-warning)" },
      { nome: "Em caixa", valor: data.financeiro.valoresEmCaixa, cor: "var(--g3-success)" },
      { nome: "Em banco", valor: data.financeiro.valoresEmBanco, cor: "var(--g3-info)" }
    ];
  }, [data]);

  const dadosFinanceiroContas = useMemo(() => {
    if (!data?.financeiro.contas?.length) return [];
    return data.financeiro.contas.map((conta) => ({
      ...conta,
      nomeCurto: encurtarRotuloGrafico(conta.nome),
      saldoFormatado: formatarMoeda(conta.saldo),
      cor: conta.categoria === "Caixa" ? "var(--g3-success)" : "var(--g3-active)"
    }));
  }, [data]);

  const totalCadastrosMonitorados = useMemo(
    () => dadosCadastros.reduce((total, item) => total + item.valor, 0),
    [dadosCadastros]
  );

  const totalFinanceiroMonitorado = useMemo(
    () => dadosFinanceiro.reduce((total, item) => total + item.valor, 0),
    [dadosFinanceiro]
  );

  const resumoFotosEventos = useMemo(() => {
    return {
      totalAlbuns: fotosEventosResumoData?.totalAlbuns ?? 0,
      totalFotos: fotosEventosResumoData?.totalFotos ?? 0
    };
  }, [fotosEventosResumoData]);

  const resumoCatalogoVagas = useMemo(() => {
    return {
      cursosNoCatalogo: matriculasResumoData?.cursosNoCatalogo ?? 0,
      totalVagas: matriculasResumoData?.totalVagas ?? 0,
      vagasDisponiveis: matriculasResumoData?.vagasDisponiveis ?? 0,
      inscricoesAtivas: matriculasResumoData?.inscricoesAtivas ?? 0
    };
  }, [matriculasResumoData]);

  const cardsResumo = useMemo(() => {
    if (!data) return [];
    return [
      {
        label: "Total de beneficiários",
        valor: String(data.cadastros.beneficiarios),
        hint: "Total de registros na instituição",
        icone: UsersRound,
        rota: "/cadastros/beneficiarios"
      },
      {
        label: "Álbuns e fotos",
        valor: `${resumoFotosEventos.totalAlbuns} / ${resumoFotosEventos.totalFotos}`,
        hint: "Álbuns cadastrados / fotos registradas",
        icone: Images,
        rota: "/setor-administrativo/fotos-eventos"
      },
      {
        label: "Cursos ativos",
        valor: String(data.top12.cursosAtivos),
        hint: `Ocupação média ${formatarPercentual(data.top12.taxaMediaOcupacaoCursos)}`,
        icone: BriefcaseBusiness,
        rota: "/cadastros/unidades-assistenciais"
      },
      {
        label: "Doações no período",
        valor: String(data.top12.doacoesPeriodo),
        hint: "Total de doações registradas",
        icone: HandHeart,
        rota: "/cadastros/beneficiarios"
      },
      {
        label: "Visitas domiciliares",
        valor: String(data.top12.visitasDomiciliares),
        hint: "Atendimentos em campo",
        icone: FolderHeart,
        rota: "/cadastros/beneficiarios"
      },
      {
        label: "Termos vencidos",
        valor: String(termosVencidos),
        hint: "Alertas com vigência encerrada",
        icone: Building2,
        rota: "/setor-juridico/termo-fomento"
      },
      {
        label: "Documentos vencidos",
        valor: String(documentosVencidos),
        hint: "Registros com validade expirada",
        icone: Archive,
        rota: "/setor-administrativo/gestao-documentos"
      },
      {
        label: "Documentos a vencer",
        valor: String(documentosAVencer),
        hint: "Registros em alerta de renovação",
        icone: Archive,
        rota: "/setor-administrativo/gestao-documentos"
      },
      {
        label: "Motoristas autorizados",
        valor: String(totalMotoristasAutorizados),
        hint: "Quantidade única de condutores",
        icone: CarFront,
        rota: "/setor-administrativo/controle-veiculos"
      },
      {
        label: "Itens no almoxarifado",
        valor: String(itensAlmoxarifado.length || data.cadastros.itensAlmoxarifado),
        hint: "Total de itens cadastrados",
        icone: Package,
        rota: "/setor-administrativo/almoxarifado"
      },
      {
        label: "Livros da biblioteca",
        valor: String(data.cadastros.livrosDisponiveis),
        hint: "Acervo disponível para empréstimo",
        icone: BookOpen,
        rota: "/atendimentos/biblioteca"
      },
      {
        label: "Quantidade de veículos",
        valor: String(data.cadastros.veiculos),
        hint: "Veículos cadastrados no sistema",
        icone: CarFront,
        rota: "/setor-administrativo/controle-veiculos"
      },
      {
        label: "Itens no patrimônio",
        valor: String(patrimonios.length || data.cadastros.bensPatrimonio),
        hint: "Bens patrimoniais cadastrados",
        icone: Archive,
        rota: "/setor-administrativo/patrimonio"
      },
      {
        label: "Empréstimos para eventos",
        valor: String(resumoEventosEmprestimos.ativos),
        hint: "Eventos ativos no momento",
        icone: CalendarDays,
        rota: "/setor-administrativo/emprestimo-eventos"
      },
      {
        label: "Catálogo e vagas de matrículas",
        valor: `${resumoCatalogoVagas.cursosNoCatalogo} / ${resumoCatalogoVagas.vagasDisponiveis}`,
        hint: "Cursos no catálogo / vagas disponíveis",
        icone: BriefcaseBusiness,
        rota: "/atendimentos/matriculas"
      }
    ];
  }, [
    data,
    documentosAVencer,
    documentosVencidos,
    itensAlmoxarifado.length,
    patrimonios.length,
    resumoFotosEventos.totalAlbuns,
    resumoFotosEventos.totalFotos,
    termosVencidos,
    totalMotoristasAutorizados,
    resumoEventosEmprestimos.ativos,
    data?.cadastros.livrosDisponiveis,
    data?.cadastros.veiculos,
    resumoCatalogoVagas.cursosNoCatalogo,
    resumoCatalogoVagas.vagasDisponiveis
  ]);

  return (
    <main className={classesTelaPadraoBeneficiario.container}>
      <Card className={classesTelaPadraoBeneficiario.cardConteudo}>
        <CardHeader className={classesTelaPadraoBeneficiario.cabecalhoConteudo}>
          <div className={classesTelaPadraoBeneficiario.tituloAba}>
            <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
            <CardTitle className={classesTelaPadraoBeneficiario.tituloAbaTexto}>
              Visão geral
            </CardTitle>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className={classesTelaPadraoBeneficiario.botaoAcao}
            onClick={() => void refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          {isError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              Falha ao carregar os dados da visão geral.
            </div>
          )}

          {isLoading || !data ? (
            <div className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card-soft)] px-3 py-4 text-sm text-[var(--g3-muted)]">
              Carregando dados da visão geral...
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                {cardsResumo.map((card) => (
                  <button
                    key={card.label}
                    type="button"
                    className={`${classeCardVisaoGeralResumo} px-3 py-3 text-left`}
                    onClick={() => navigate(card.rota)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--g3-muted)]">
                          {card.label}
                        </p>
                        <p className="mt-1 text-2xl font-semibold text-[var(--g3-foreground)]">
                          {card.valor}
                        </p>
                        <p className="mt-1 text-xs text-[var(--g3-muted)]">{card.hint}</p>
                      </div>
                      <span className="rounded-md bg-[var(--g3-primary-soft)] p-2 text-[var(--g3-active)]">
                        <card.icone className="h-4 w-4" />
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                <div className={`${classeCardVisaoGeral} min-w-0 p-3`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--g3-muted)]">
                        Cadastros por tipo
                      </p>
                      <p className="mt-1 text-xs text-[var(--g3-muted)]">
                        Distribuição dos cadastros monitorados na operação atual.
                      </p>
                    </div>
                    <div className={`${classeCardVisaoGeralResumo} rounded-lg px-3 py-2 text-right`}>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--g3-muted)]">
                        Total
                      </p>
                      <p className="text-lg font-semibold text-[var(--g3-foreground)]">
                        {totalCadastrosMonitorados.toLocaleString("pt-BR")}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
                    <div className={`${classeCardVisaoGeralSuave} relative h-72 p-3`}>
                      <ResponsiveChart minWidth={0} minHeight={220}>
                        <PieChart>
                          <Pie
                            data={dadosCadastros}
                            dataKey="valor"
                            nameKey="nome"
                            cx="50%"
                            cy="50%"
                            innerRadius={64}
                            outerRadius={96}
                            paddingAngle={2}
                            stroke="var(--g3-card)"
                            strokeWidth={3}
                          >
                            {dadosCadastros.map((item) => (
                              <Cell key={item.nome} fill={item.cor} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value, _name, payload) => {
                              const percentual =
                                totalCadastrosMonitorados > 0
                                  ? (Number(value ?? 0) / totalCadastrosMonitorados) * 100
                                  : 0;
                              return [
                                `${Number(value ?? 0).toLocaleString("pt-BR")} (${formatarPercentual(percentual)})`,
                                String(payload?.payload?.nome ?? "Cadastro")
                              ];
                            }}
                            contentStyle={{
                              borderRadius: 10,
                              borderColor: "var(--g3-border)",
                              backgroundColor: "var(--g3-card)"
                            }}
                          />
                        </PieChart>
                      </ResponsiveChart>
                      <div className="pointer-events-none absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--g3-border)] bg-[var(--g3-dashboard-card)] shadow-[0_18px_34px_-24px_rgba(15,23,42,0.18)]">
                        <div className="flex h-full w-full flex-col items-center justify-center text-center">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--g3-muted)]">
                            Tipos
                          </p>
                          <p className="mt-1 text-2xl font-semibold leading-none text-[var(--g3-foreground)]">
                            {dadosCadastros.length}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {dadosCadastros.map((item) => {
                        const percentualTotal =
                          totalCadastrosMonitorados > 0
                            ? (item.valor / totalCadastrosMonitorados) * 100
                            : 0;

                        return (
                          <button
                            key={item.nome}
                            type="button"
                            className={`${classeCardVisaoGeralSuave} p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--g3-primary)] hover:shadow-[0_22px_48px_-22px_rgba(15,23,42,0.22)]`}
                            onClick={() => navigate(obterRotaCadastro(item.nome))}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <span
                                  className="mt-0.5 inline-flex h-3 w-3 rounded-full"
                                  style={{ backgroundColor: item.cor }}
                                />
                                <div>
                                  <p className="text-sm font-semibold text-[var(--g3-foreground)]">
                                    {item.nome}
                                  </p>
                                  <p className="text-xs text-[var(--g3-muted)]">
                                    {formatarPercentual(percentualTotal)} do total
                                  </p>
                                </div>
                              </div>
                              <div className="min-w-[72px] rounded-xl bg-[var(--g3-dashboard-card)] px-3 py-2 text-right shadow-[0_16px_28px_-24px_rgba(15,23,42,0.18)]">
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--g3-muted)]">
                                  Total
                                </p>
                                <p className="text-2xl font-bold leading-none text-[var(--g3-active)]">
                                  {item.valor.toLocaleString("pt-BR")}
                                </p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className={`${classeCardVisaoGeral} min-w-0 p-3`}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--g3-muted)]">
                    Composição financeira
                  </p>
                  <div className="mt-3 grid grid-cols-1 gap-2 xl:grid-cols-3">
                    {dadosFinanceiro.map((item) => (
                      <button
                        key={item.nome}
                        type="button"
                        className={`${classeCardVisaoGeralSuave} min-h-[110px] px-4 py-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--g3-primary)] hover:shadow-[0_22px_48px_-22px_rgba(15,23,42,0.22)]`}
                        onClick={() => navigate("/setor-financeiro/contabilidade")}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <p className="break-words text-sm font-semibold leading-5 text-[var(--g3-muted)]">
                              {item.nome}
                            </p>
                            <p className="mt-2 text-2xl font-bold leading-none tracking-tight text-[var(--g3-foreground)]">
                              {formatarMoeda(item.valor)}
                            </p>
                          </div>
                          <span
                            className="mt-1 inline-flex h-3.5 w-3.5 rounded-full"
                            style={{ backgroundColor: item.cor }}
                            aria-hidden="true"
                          />
                        </div>
                        <p className="mt-2 text-[11px] text-[var(--g3-muted)]">
                          {totalFinanceiroMonitorado > 0
                            ? `${formatarPercentual((item.valor / totalFinanceiroMonitorado) * 100)} do total monitorado`
                            : "Sem valores registrados"}
                        </p>
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    className={`${classeCardVisaoGeralSuave} mt-3 w-full p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--g3-primary)] hover:shadow-[0_22px_48px_-22px_rgba(15,23,42,0.22)]`}
                    onClick={() => navigate("/setor-financeiro/contabilidade")}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-[var(--g3-foreground)]">
                          Saldos por conta
                        </p>
                        <p className="text-xs text-[var(--g3-muted)]">
                          Distribuição atual dos recursos em caixa e banco.
                        </p>
                      </div>
                      <div className="rounded-lg border border-[var(--g3-primary-soft)] bg-[var(--g3-primary-soft)] px-3 py-2 text-right shadow-[0_16px_28px_-24px_rgba(15,23,42,0.18)]">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--g3-muted)]">
                          Total em contas
                        </p>
                        <p className="text-lg font-semibold text-[var(--g3-foreground)]">
                          {formatarMoeda(
                            dadosFinanceiroContas.reduce((total, item) => total + item.saldo, 0)
                          )}
                        </p>
                      </div>
                    </div>
                    {dadosFinanceiroContas.length ? (
                      <div
                        className="mt-3"
                        style={{ height: `${Math.max(280, dadosFinanceiroContas.length * 60)}px` }}
                      >
                        <ResponsiveChart minWidth={0} minHeight={240}>
                          <BarChart
                            data={dadosFinanceiroContas}
                            layout="vertical"
                            margin={{ top: 4, right: 84, bottom: 4, left: 12 }}
                          >
                            <CartesianGrid horizontal={false} stroke="var(--g3-border)" opacity={0.35} />
                            <XAxis type="number" hide />
                            <YAxis
                              type="category"
                              dataKey="nomeCurto"
                              width={220}
                              tick={{ fill: "var(--g3-muted)", fontSize: 12 }}
                              axisLine={false}
                              tickLine={false}
                              tickMargin={10}
                            />
                            <Tooltip
                              formatter={(value, _name, payload) => [
                                formatarMoeda(Number(value ?? 0)),
                                String(payload?.payload?.nome ?? "Conta")
                              ]}
                              contentStyle={{
                                borderRadius: 10,
                                borderColor: "var(--g3-border)",
                                backgroundColor: "var(--g3-card)"
                              }}
                            />
                            <Bar dataKey="saldo" radius={[0, 10, 10, 0]}>
                              {dadosFinanceiroContas.map((item) => (
                                <Cell key={item.id} fill={item.cor} />
                              ))}
                              <LabelList
                                dataKey="saldoFormatado"
                                position="right"
                                offset={12}
                                style={{ fill: "var(--g3-foreground)", fontSize: 12, fontWeight: 600 }}
                              />
                            </Bar>
                          </BarChart>
                        </ResponsiveChart>
                      </div>
                    ) : (
                      <div className="mt-3 rounded-lg border border-dashed border-[var(--g3-border)] bg-[var(--g3-dashboard-card-soft)] px-3 py-4 text-sm text-[var(--g3-muted)]">
                        Nenhuma conta com saldo disponível foi encontrada para montar o gráfico financeiro.
                      </div>
                    )}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <button
                  type="button"
                  className={`${classeCardVisaoGeralInterativo} px-3 py-3 text-left`}
                  onClick={() => navigate("/setor-financeiro/prestacao-contas")}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--g3-muted)]">
                    Execução financeira
                  </p>
                  <p className="mt-1 text-lg font-semibold text-[var(--g3-foreground)]">
                    {formatarPercentual(data.top12.execucaoFinanceira)}
                  </p>
                </button>
                <button
                  type="button"
                  className={`${classeCardVisaoGeralInterativo} px-3 py-3 text-left`}
                  onClick={() => navigate("/setor-rh/registro-ponto")}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--g3-muted)]">
                    Absenteísmo
                  </p>
                  <p className="mt-1 text-lg font-semibold text-[var(--g3-foreground)]">
                    {formatarPercentual(data.top12.absenteismo)}
                  </p>
                </button>
                <button
                  type="button"
                  className={`${classeCardVisaoGeralInterativo} px-3 py-3 text-left`}
                  onClick={() => navigate("/setor-financeiro/contabilidade")}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--g3-muted)]">
                    Valores a receber
                  </p>
                  <p className="mt-1 flex items-center gap-2 text-lg font-semibold text-[var(--g3-foreground)]">
                    <BanknoteArrowUp className="h-4 w-4 text-[var(--g3-warning)]" />
                    {formatarMoeda(data.financeiro.valoresAReceber)}
                  </p>
                </button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
