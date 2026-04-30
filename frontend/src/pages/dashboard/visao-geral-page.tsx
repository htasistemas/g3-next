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
  BanknoteArrowUp,
  BriefcaseBusiness,
  Building2,
  FolderHeart,
  HandHeart,
  LayoutDashboard,
  RefreshCw,
  ShieldAlert,
  UsersRound
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useDashboardAssistencia } from "@/features/dashboard/use-dashboard";
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

function encurtarRotuloGrafico(texto: string, limite = 20) {
  if (texto.length <= limite) return texto;
  return `${texto.slice(0, limite - 1)}…`;
}

const coresCadastros = ["#0f766e", "#14b8a6", "#38bdf8", "#3b82f6", "#6366f1", "#f59e0b", "#ef4444"];
const classeCardVerde =
  "rounded-xl border border-emerald-200/80 bg-[linear-gradient(180deg,rgba(247,252,249,0.98)_0%,rgba(229,245,234,0.98)_100%)] shadow-[0_18px_40px_-26px_rgba(22,101,52,0.35)]";
const classeCardVerdeInterativo = `${classeCardVerde} transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-[0_22px_48px_-22px_rgba(22,101,52,0.42)]`;
const classeCardVerdeSuave =
  "rounded-xl border border-emerald-100/90 bg-[rgba(255,255,255,0.72)] shadow-[0_14px_32px_-26px_rgba(22,101,52,0.28)] backdrop-blur-[2px]";

export function VisaoGeralPage() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const { data, isLoading, isFetching, isError, refetch } = useDashboardAssistencia(
    {},
    { autoRefresh: true }
  );
  const { data: matriculasResumoData, isFetching: atualizandoResumoMatriculas } = useQuery({
    queryKey: ["dashboard", "visao-geral", "matriculas-resumo", usuario?.tenant_id ?? "sem-tenant"],
    queryFn: () => matriculasService.obterResumoCatalogo(),
    enabled: !!usuario,
    staleTime: 60_000
  });

  const dadosCadastros = useMemo(() => {
    if (!data) return [];
    return [
      { nome: "Almoxarifado", valor: data.cadastros.itensAlmoxarifado },
      { nome: "Biblioteca", valor: data.cadastros.livrosDisponiveis },
      { nome: "Veículos", valor: data.cadastros.veiculos },
      { nome: "Profissionais", valor: data.cadastros.profissionais },
      { nome: "Voluntários", valor: data.cadastros.voluntarios },
      { nome: "Famílias", valor: data.cadastros.familias },
      { nome: "Patrimônio", valor: data.cadastros.bensPatrimonio }
    ]
      .sort((a, b) => b.valor - a.valor)
      .map((item, index) => ({
        ...item,
        cor: coresCadastros[index % coresCadastros.length]
      }));
  }, [data]);

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

  const cardsResumo = useMemo(() => {
    if (!data) return [];
    return [
      {
        label: "Beneficiários no período",
        valor: String(data.top12.beneficiariosAtendidosPeriodo),
        hint: "Registros no período filtrado",
        icone: UsersRound,
        rota: "/cadastros/beneficiarios"
      },
      {
        label: "Famílias em extrema pobreza",
        valor: String(data.top12.familiasExtremaPobreza),
        hint: "Faixa até R$ 200",
        icone: ShieldAlert,
        rota: "/cadastros/vinculo-familiar"
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
        label: "Termos vencendo",
        valor: String(data.top12.termosVencendo),
        hint: "Próximos 60 dias",
        icone: Building2,
        rota: "/dashboard/indicadores"
      }
    ];
  }, [data]);

  const resumoCatalogoVagas = useMemo(() => {
    return {
      cursosNoCatalogo: matriculasResumoData?.cursosNoCatalogo ?? 0,
      totalVagas: matriculasResumoData?.totalVagas ?? 0,
      vagasDisponiveis: matriculasResumoData?.vagasDisponiveis ?? 0,
      inscricoesAtivas: matriculasResumoData?.inscricoesAtivas ?? 0
    };
  }, [matriculasResumoData]);

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
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {cardsResumo.map((card) => (
                  <button
                    key={card.label}
                    type="button"
                    className={`${classeCardVerdeInterativo} px-3 py-3 text-left`}
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

              <div className={`${classeCardVerde} p-3`}>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--g3-muted)]">
                    Catálogo e vagas de matrículas
                  </p>
                  {atualizandoResumoMatriculas && (
                    <span className="text-[11px] text-[var(--g3-muted)]">Atualizando...</span>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <button
                    type="button"
                    className={`${classeCardVerdeInterativo} rounded-lg p-3 text-left`}
                    onClick={() => navigate("/atendimentos/matriculas")}
                  >
                    <p className="text-xs text-[var(--g3-muted)]">Cursos no catálogo</p>
                    <p className="text-lg font-semibold text-[var(--g3-foreground)]">
                      {resumoCatalogoVagas.cursosNoCatalogo}
                    </p>
                  </button>
                  <button
                    type="button"
                    className={`${classeCardVerdeInterativo} rounded-lg p-3 text-left`}
                    onClick={() => navigate("/atendimentos/matriculas")}
                  >
                    <p className="text-xs text-[var(--g3-muted)]">Total de vagas</p>
                    <p className="text-lg font-semibold text-[var(--g3-foreground)]">
                      {resumoCatalogoVagas.totalVagas}
                    </p>
                  </button>
                  <button
                    type="button"
                    className={`${classeCardVerdeInterativo} rounded-lg p-3 text-left`}
                    onClick={() => navigate("/atendimentos/matriculas")}
                  >
                    <p className="text-xs text-[var(--g3-muted)]">Vagas disponíveis</p>
                    <p className="text-lg font-semibold text-emerald-700">
                      {resumoCatalogoVagas.vagasDisponiveis}
                    </p>
                  </button>
                  <button
                    type="button"
                    className={`${classeCardVerdeInterativo} rounded-lg p-3 text-left`}
                    onClick={() => navigate("/atendimentos/matriculas")}
                  >
                    <p className="text-xs text-[var(--g3-muted)]">Inscrições ativas</p>
                    <p className="text-lg font-semibold text-[var(--g3-foreground)]">
                      {resumoCatalogoVagas.inscricoesAtivas}
                    </p>
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div className={`${classeCardVerde} min-w-0 p-3`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--g3-muted)]">
                        Cadastros por tipo
                      </p>
                      <p className="mt-1 text-xs text-[var(--g3-muted)]">
                        Distribuição dos cadastros monitorados na operação atual.
                      </p>
                    </div>
                    <div className={`${classeCardVerdeSuave} rounded-lg px-3 py-2 text-right`}>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--g3-muted)]">
                        Total
                      </p>
                      <p className="text-lg font-semibold text-[var(--g3-foreground)]">
                        {totalCadastrosMonitorados.toLocaleString("pt-BR")}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
                    <div className={`${classeCardVerdeSuave} relative h-72 p-3`}>
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
                      <div className="pointer-events-none absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/92 shadow-[0_18px_34px_-24px_rgba(22,101,52,0.35)] ring-1 ring-emerald-100">
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
                          <div
                            key={item.nome}
                            className={`${classeCardVerdeSuave} p-3`}
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
                              <div className="min-w-[72px] rounded-xl bg-white/90 px-3 py-2 text-right shadow-[0_16px_28px_-24px_rgba(22,101,52,0.35)]">
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--g3-muted)]">
                                  Total
                                </p>
                                <p className="text-2xl font-bold leading-none text-[var(--g3-active)]">
                                  {item.valor.toLocaleString("pt-BR")}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className={`${classeCardVerde} min-w-0 p-3`}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--g3-muted)]">
                    Composição financeira
                  </p>
                  <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
                    {dadosFinanceiro.map((item) => (
                      <div
                        key={item.nome}
                        className={`${classeCardVerdeSuave} px-3 py-3`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold text-[var(--g3-muted)]">{item.nome}</p>
                            <p className="mt-1 text-2xl font-bold leading-tight text-[var(--g3-foreground)]">
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
                      </div>
                    ))}
                  </div>
                  <div className={`${classeCardVerdeSuave} mt-3 p-3`}>
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-[var(--g3-foreground)]">
                          Saldos por conta
                        </p>
                        <p className="text-xs text-[var(--g3-muted)]">
                          Distribuição atual dos recursos em caixa e banco.
                        </p>
                      </div>
                      <div className="rounded-lg border border-emerald-100/90 bg-white/88 px-3 py-2 text-right shadow-[0_16px_28px_-24px_rgba(22,101,52,0.35)]">
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
                        style={{ height: `${Math.max(260, dadosFinanceiroContas.length * 52)}px` }}
                      >
                        <ResponsiveChart minWidth={0} minHeight={240}>
                          <BarChart
                            data={dadosFinanceiroContas}
                            layout="vertical"
                            margin={{ top: 4, right: 36, bottom: 4, left: 8 }}
                          >
                            <CartesianGrid horizontal={false} stroke="var(--g3-border)" opacity={0.35} />
                            <XAxis type="number" hide />
                            <YAxis
                              type="category"
                              dataKey="nomeCurto"
                              width={118}
                              tick={{ fill: "var(--g3-muted)", fontSize: 12 }}
                              axisLine={false}
                              tickLine={false}
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
                                style={{ fill: "var(--g3-foreground)", fontSize: 12, fontWeight: 600 }}
                              />
                            </Bar>
                          </BarChart>
                        </ResponsiveChart>
                      </div>
                    ) : (
                      <div className="mt-3 rounded-lg border border-dashed border-emerald-200 bg-white/80 px-3 py-4 text-sm text-[var(--g3-muted)]">
                        Nenhuma conta com saldo disponível foi encontrada para montar o gráfico financeiro.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className={`${classeCardVerde} px-3 py-3`}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--g3-muted)]">
                    Execução financeira
                  </p>
                  <p className="mt-1 text-lg font-semibold text-[var(--g3-foreground)]">
                    {formatarPercentual(data.top12.execucaoFinanceira)}
                  </p>
                </div>
                <div className={`${classeCardVerde} px-3 py-3`}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--g3-muted)]">
                    Absenteísmo
                  </p>
                  <p className="mt-1 text-lg font-semibold text-[var(--g3-foreground)]">
                    {formatarPercentual(data.top12.absenteismo)}
                  </p>
                </div>
                <div className={`${classeCardVerde} px-3 py-3`}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--g3-muted)]">
                    Valores a receber
                  </p>
                  <p className="mt-1 flex items-center gap-2 text-lg font-semibold text-[var(--g3-foreground)]">
                    <BanknoteArrowUp className="h-4 w-4 text-[var(--g3-warning)]" />
                    {formatarMoeda(data.financeiro.valoresAReceber)}
                  </p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
