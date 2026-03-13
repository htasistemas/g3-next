import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, Cell, Pie, PieChart, Tooltip, XAxis, YAxis } from "recharts";
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
import { useDashboardAssistencia } from "@/features/dashboard/use-dashboard";
import { matriculasService } from "@/services/matriculas.service";
import { classesTelaPadraoBeneficiario } from "@/lib/tela-padrao-beneficiario";

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

export function VisaoGeralPage() {
  const navigate = useNavigate();
  const { data, isLoading, isFetching, isError, refetch } = useDashboardAssistencia({}, { autoRefresh: true });
  const { data: matriculasCatalogoData, isFetching: atualizandoResumoMatriculas } = useQuery({
    queryKey: ["dashboard", "visao-geral", "matriculas-resumo"],
    queryFn: () =>
      matriculasService.listar({
        nome: "",
        tipo: "",
        status: "",
        profissional: "",
        beneficiario: ""
      }),
    staleTime: 60_000
  });

  const dadosCadastros = useMemo(() => {
    if (!data) return [];
    return [
      { nome: "Almoxarifado", valor: data.cadastros.itensAlmoxarifado },
      { nome: "Biblioteca", valor: data.cadastros.livrosDisponiveis },
      { nome: "Veículos", valor: data.cadastros.veiculos },
      { nome: "Beneficiários", valor: data.cadastros.beneficiarios },
      { nome: "Profissionais", valor: data.cadastros.profissionais },
      { nome: "Voluntários", valor: data.cadastros.voluntarios },
      { nome: "Famílias", valor: data.cadastros.familias },
      { nome: "Patrimônio", valor: data.cadastros.bensPatrimonio }
    ];
  }, [data]);

  const dadosFinanceiro = useMemo(() => {
    if (!data) return [];
    return [
      { nome: "A Receber", valor: data.financeiro.valoresAReceber, cor: "var(--g3-warning)" },
      { nome: "Em Caixa", valor: data.financeiro.valoresEmCaixa, cor: "var(--g3-success)" },
      { nome: "Em Banco", valor: data.financeiro.valoresEmBanco, cor: "var(--g3-info)" }
    ];
  }, [data]);

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
    const lista = matriculasCatalogoData?.matriculas ?? [];
    const cursosNoCatalogo = lista.length;
    const totalVagas = lista.reduce((total, item) => total + (item.vagas_totais ?? 0), 0);
    const vagasDisponiveis = lista.reduce((total, item) => total + (item.vagas_disponiveis ?? 0), 0);
    const inscricoesAtivas = lista.reduce((total, item) => total + (item.total_matriculas ?? 0), 0);

    return {
      cursosNoCatalogo,
      totalVagas,
      vagasDisponiveis,
      inscricoesAtivas
    };
  }, [matriculasCatalogoData]);

  return (
    <main className={classesTelaPadraoBeneficiario.container}>
      <Card className={classesTelaPadraoBeneficiario.cardConteudo}>
        <CardHeader className={classesTelaPadraoBeneficiario.cabecalhoConteudo}>
          <div className={classesTelaPadraoBeneficiario.tituloAba}>
            <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
            <CardTitle className={classesTelaPadraoBeneficiario.tituloAbaTexto}>Visão geral</CardTitle>
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
                    className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card)] px-3 py-3 text-left shadow-sm transition hover:border-[var(--g3-active)] hover:bg-[var(--g3-primary-soft)]"
                    onClick={() => navigate(card.rota)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--g3-muted)]">
                          {card.label}
                        </p>
                        <p className="mt-1 text-2xl font-semibold text-[var(--g3-foreground)]">{card.valor}</p>
                        <p className="mt-1 text-xs text-[var(--g3-muted)]">{card.hint}</p>
                      </div>
                      <span className="rounded-md bg-[var(--g3-primary-soft)] p-2 text-[var(--g3-active)]">
                        <card.icone className="h-4 w-4" />
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card)] p-3">
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
                    className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card-soft)] p-3 text-left transition hover:border-[var(--g3-active)] hover:bg-[var(--g3-primary-soft)]"
                    onClick={() => navigate("/atendimentos/matriculas")}
                  >
                    <p className="text-xs text-[var(--g3-muted)]">Cursos no catálogo</p>
                    <p className="text-lg font-semibold text-[var(--g3-foreground)]">
                      {resumoCatalogoVagas.cursosNoCatalogo}
                    </p>
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card-soft)] p-3 text-left transition hover:border-[var(--g3-active)] hover:bg-[var(--g3-primary-soft)]"
                    onClick={() => navigate("/atendimentos/matriculas")}
                  >
                    <p className="text-xs text-[var(--g3-muted)]">Total de vagas</p>
                    <p className="text-lg font-semibold text-[var(--g3-foreground)]">{resumoCatalogoVagas.totalVagas}</p>
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card-soft)] p-3 text-left transition hover:border-[var(--g3-active)] hover:bg-[var(--g3-primary-soft)]"
                    onClick={() => navigate("/atendimentos/matriculas")}
                  >
                    <p className="text-xs text-[var(--g3-muted)]">Vagas disponíveis</p>
                    <p className="text-lg font-semibold text-emerald-700">{resumoCatalogoVagas.vagasDisponiveis}</p>
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card-soft)] p-3 text-left transition hover:border-[var(--g3-active)] hover:bg-[var(--g3-primary-soft)]"
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
                <div className="min-w-0 rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card)] p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--g3-muted)]">
                    Cadastros por tipo
                  </p>
                  <div className="mt-3 h-[28rem]">
                    <ResponsiveChart minWidth={0} minHeight={320}>
                      <BarChart data={dadosCadastros} layout="vertical" margin={{ left: 12, right: 16 }}>
                        <XAxis type="number" stroke="var(--g3-muted)" fontSize={11} allowDecimals={false} />
                        <YAxis
                          dataKey="nome"
                          type="category"
                          width={120}
                          stroke="var(--g3-muted)"
                          fontSize={12}
                        />
                        <Tooltip
                          formatter={(value) => Number(value ?? 0).toLocaleString("pt-BR")}
                          cursor={{ fill: "var(--g3-primary-soft)" }}
                          contentStyle={{
                            borderRadius: 10,
                            borderColor: "var(--g3-border)",
                            backgroundColor: "var(--g3-card)"
                          }}
                        />
                        <Bar dataKey="valor" fill="var(--g3-primary)" radius={[0, 6, 6, 0]} maxBarSize={26} />
                      </BarChart>
                    </ResponsiveChart>
                  </div>
                </div>

                <div className="min-w-0 rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card)] p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--g3-muted)]">
                    Composição financeira
                  </p>
                  <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                    <div className="h-56">
                      <ResponsiveChart minWidth={0} minHeight={180}>
                        <PieChart>
                          <Pie
                            data={dadosFinanceiro}
                            dataKey="valor"
                            nameKey="nome"
                            cx="50%"
                            cy="50%"
                            innerRadius={42}
                            outerRadius={75}
                            paddingAngle={2}
                          >
                            {dadosFinanceiro.map((entry) => (
                              <Cell key={entry.nome} fill={entry.cor} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value) => formatarMoeda(Number(value ?? 0))}
                            contentStyle={{
                              borderRadius: 10,
                              borderColor: "var(--g3-border)",
                              backgroundColor: "var(--g3-card)"
                            }}
                          />
                        </PieChart>
                      </ResponsiveChart>
                    </div>
                    <div className="space-y-2">
                      {dadosFinanceiro.map((item) => (
                        <div
                          key={item.nome}
                          className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card-soft)] px-3 py-2"
                        >
                          <p className="text-xs font-semibold text-[var(--g3-muted)]">{item.nome}</p>
                          <p className="text-sm font-semibold text-[var(--g3-foreground)]">
                            {formatarMoeda(item.valor)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card)] px-3 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--g3-muted)]">
                    Execução Financeira
                  </p>
                  <p className="mt-1 text-lg font-semibold text-[var(--g3-foreground)]">
                    {formatarPercentual(data.top12.execucaoFinanceira)}
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card)] px-3 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--g3-muted)]">
                    Absenteísmo
                  </p>
                  <p className="mt-1 text-lg font-semibold text-[var(--g3-foreground)]">
                    {formatarPercentual(data.top12.absenteismo)}
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card)] px-3 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--g3-muted)]">
                    Valores A Receber
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
