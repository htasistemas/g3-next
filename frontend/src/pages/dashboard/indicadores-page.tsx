import { useMemo, useState } from "react";
import { Bar, BarChart, PolarAngleAxis, RadialBar, RadialBarChart, Tooltip, XAxis, YAxis } from "recharts";
import { ResponsiveChart } from "@/components/charts/responsive-chart";
import { ChartColumn, Eraser, Filter, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDashboardAssistencia } from "@/features/dashboard/use-dashboard";
import { classesTelaPadraoBeneficiario } from "@/lib/tela-padrao-beneficiario";
import type { DashboardFiltros } from "@/types/dashboard";

const FAIXAS_ETARIAS_VIDA = [
  { chave: "0-12", rotulo: "0-12 crianças", idadeMinima: 0, idadeMaxima: 12 },
  { chave: "13-17", rotulo: "13-17 adolescentes", idadeMinima: 13, idadeMaxima: 17 },
  { chave: "18-29", rotulo: "18-29 jovens", idadeMinima: 18, idadeMaxima: 29 },
  { chave: "30-59", rotulo: "30-59 adultos", idadeMinima: 30, idadeMaxima: 59 },
  { chave: "60+", rotulo: "60+ idosos", idadeMinima: 60, idadeMaxima: Number.POSITIVE_INFINITY }
] as const;

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2
  }).format(valor);
}

function formatarData(valor: string | null) {
  if (!valor) return "---";
  const [ano, mes, dia] = valor.split("-");
  if (!ano || !mes || !dia) return valor;
  return `${dia}/${mes}/${ano}`;
}

function formatarPercentual(valor: number) {
  return `${Number.isFinite(valor) ? valor.toFixed(1) : "0.0"}%`;
}

function formatarNumero(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 0
  }).format(valor);
}

function formatarMoedaAbreviada(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: 1
  }).format(valor);
}

function arredondarParaCima(valor: number, base: number) {
  if (!Number.isFinite(valor) || valor <= 0 || !Number.isFinite(base) || base <= 0) {
    return base;
  }
  return Math.ceil(valor / base) * base;
}

function agruparFaixasEtariasPorFaseVida(idades: Record<string, number>, faixasOriginais: Record<string, number>) {
  const totais = new Map<string, number>(FAIXAS_ETARIAS_VIDA.map((faixa) => [faixa.chave, 0]));
  let encontrouIdadeValida = false;

  for (const [idadeTexto, quantidade] of Object.entries(idades)) {
    const idade = Number(idadeTexto);
    if (!Number.isFinite(idade) || idade < 0) {
      continue;
    }

    encontrouIdadeValida = true;

    const faixa = FAIXAS_ETARIAS_VIDA.find(
      (item) => idade >= item.idadeMinima && idade <= item.idadeMaxima
    );
    if (!faixa) {
      continue;
    }

    totais.set(faixa.chave, (totais.get(faixa.chave) ?? 0) + quantidade);
  }

  if (!encontrouIdadeValida) {
    for (const faixa of FAIXAS_ETARIAS_VIDA) {
      totais.set(faixa.chave, faixasOriginais[faixa.chave] ?? 0);
    }
  }

  return FAIXAS_ETARIAS_VIDA.map((faixa) => ({
    faixa: faixa.rotulo,
    quantidade: totais.get(faixa.chave) ?? 0
  }));
}

function KpiIndicatorCard(props: {
  titulo: string;
  valor: string;
  percentual: number;
  apoio: string;
  minRotulo: string;
  maxRotulo: string;
  cor: string;
}) {
  const percentualNormalizado = Math.max(0, Math.min(100, props.percentual));
  const dados = [{ nome: props.titulo, valor: percentualNormalizado }];

  return (
    <div className="rounded-2xl border border-[var(--g3-border)] bg-[linear-gradient(180deg,#ffffff_0%,var(--g3-card-soft)_42%,var(--g3-card)_100%)] px-4 py-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--g3-muted)]">{props.titulo}</p>
        <span className="rounded-full bg-[var(--g3-primary-soft)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--g3-active)]">
          Indicador de desempenho
        </span>
      </div>
      <div className="relative mt-3 h-56">
        <ResponsiveChart minWidth={0} minHeight={220}>
          <RadialBarChart
            cx="50%"
            cy="76%"
            innerRadius="68%"
            outerRadius="100%"
            barSize={16}
            data={dados}
            startAngle={180}
            endAngle={0}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} axisLine={false} />
            <RadialBar
              dataKey="valor"
              fill={props.cor}
              cornerRadius={999}
              background={{ fill: "rgba(148, 163, 184, 0.18)" }}
            />
          </RadialBarChart>
        </ResponsiveChart>

        <div className="pointer-events-none absolute inset-x-0 bottom-2 flex flex-col items-center text-center">
          <span className="text-[9px] font-medium uppercase tracking-[0.18em] text-[var(--g3-muted)]">
            Desempenho atual
          </span>
          <span className="mt-1 text-3xl font-semibold tracking-tight text-[var(--g3-foreground)]">
            {props.valor}
          </span>
          <span className="max-w-[220px] text-[11px] leading-4 text-[var(--g3-muted)]">
            {props.apoio}
          </span>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--g3-muted)]">
        <span>{props.minRotulo}</span>
        <span>{props.maxRotulo}</span>
      </div>
    </div>
  );
}

export function IndicadoresPage() {
  const [filtroForm, setFiltroForm] = useState({ startDate: "", endDate: "" });
  const [filtrosAplicados, setFiltrosAplicados] = useState<DashboardFiltros>({});

  const { data, isLoading, isFetching, isError, refetch } = useDashboardAssistencia(filtrosAplicados);

  const dadosIdade = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.atendimento.idades)
      .map(([idade, quantidade]) => ({ idade: Number(idade), quantidade }))
      .filter((item) => Number.isFinite(item.idade))
      .sort((a, b) => a.idade - b.idade);
  }, [data]);

  const dadosFaixaEtaria = useMemo(() => {
    if (!data) return [];
    return agruparFaixasEtariasPorFaseVida(data.atendimento.idades, data.atendimento.faixaEtaria);
  }, [data]);

  const dadosVulnerabilidade = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.atendimento.vulnerabilidades).map(([nome, quantidade]) => ({
      nome,
      quantidade
    }));
  }, [data]);

  const dadosFaixaRenda = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.familias.faixaRenda).map(([faixa, quantidade]) => ({
      faixa,
      quantidade
    }));
  }, [data]);

  const dadosBairros = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.atendimento.bairros)
      .map(([bairro, quantidade]) => ({ bairro, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade);
  }, [data]);

  const dadosBairrosTop12 = useMemo(() => dadosBairros.slice(0, 12), [dadosBairros]);
  const totalBeneficiarios = data?.atendimento.totalBeneficiarios ?? 0;
  const beneficiariosAtivos = data?.atendimento.ativos ?? 0;
  const cadastroCompletoPercentual = data?.atendimento.cadastroCompletoPercentual ?? 0;
  const rendaMediaFamiliar = data?.familias.rendaMediaFamiliar ?? 0;
  const rendaReferencial = arredondarParaCima(Math.max(rendaMediaFamiliar * 1.25, 1500), 500);
  const rankingBairrosTopo = dadosBairros[0];

  function aplicarFiltros() {
    setFiltrosAplicados({
      startDate: filtroForm.startDate || undefined,
      endDate: filtroForm.endDate || undefined
    });
  }

  function limparFiltros() {
    setFiltroForm({ startDate: "", endDate: "" });
    setFiltrosAplicados({});
  }

  return (
    <main className={classesTelaPadraoBeneficiario.container}>
      <Card className={classesTelaPadraoBeneficiario.cardConteudo}>
        <CardHeader className={classesTelaPadraoBeneficiario.cabecalhoConteudo}>
          <div className={classesTelaPadraoBeneficiario.tituloAba}>
            <ChartColumn className="h-4 w-4" aria-hidden="true" />
            <CardTitle className={classesTelaPadraoBeneficiario.tituloAbaTexto}>Indicadores</CardTitle>
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
          <div className="grid grid-cols-1 gap-2 rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card-soft)] p-3 md:grid-cols-5">
            <div className="md:col-span-2">
              <Label>Data inicial</Label>
              <Input
                type="date"
                value={filtroForm.startDate}
                onChange={(event) =>
                  setFiltroForm((anterior) => ({ ...anterior, startDate: event.target.value }))
                }
              />
            </div>
            <div className="md:col-span-2">
              <Label>Data final</Label>
              <Input
                type="date"
                value={filtroForm.endDate}
                onChange={(event) =>
                  setFiltroForm((anterior) => ({ ...anterior, endDate: event.target.value }))
                }
              />
            </div>
            <div className="flex items-end gap-2">
              <Button type="button" size="sm" className="flex-1" onClick={aplicarFiltros}>
                <Filter className="mr-1.5 h-3.5 w-3.5" />
                Visualizar
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={limparFiltros}>
                <Eraser className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {isError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              Falha ao carregar os indicadores.
            </div>
          )}

          {isLoading || !data ? (
            <div className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card-soft)] px-3 py-4 text-sm text-[var(--g3-muted)]">
              Carregando indicadores...
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 xl:grid-cols-4">
                <KpiIndicatorCard
                  titulo="Beneficiários ativos"
                  valor={formatarNumero(beneficiariosAtivos)}
                  percentual={totalBeneficiarios > 0 ? (beneficiariosAtivos / totalBeneficiarios) * 100 : 0}
                  apoio={`${formatarPercentual(totalBeneficiarios > 0 ? (beneficiariosAtivos / totalBeneficiarios) * 100 : 0)} do total de beneficiários cadastrados`}
                  minRotulo="0"
                  maxRotulo={`${formatarNumero(totalBeneficiarios)} total`}
                  cor="var(--g3-primary)"
                />
                <KpiIndicatorCard
                  titulo="Cadastro completo"
                  valor={formatarPercentual(cadastroCompletoPercentual)}
                  percentual={cadastroCompletoPercentual}
                  apoio="Percentual de cadastros completos no período filtrado"
                  minRotulo="0%"
                  maxRotulo="100%"
                  cor="var(--g3-secondary)"
                />
                <KpiIndicatorCard
                  titulo="Renda média familiar"
                  valor={formatarMoeda(rendaMediaFamiliar)}
                  percentual={rendaReferencial > 0 ? (rendaMediaFamiliar / rendaReferencial) * 100 : 0}
                  apoio={`Escala visual até ${formatarMoedaAbreviada(rendaReferencial)}`}
                  minRotulo="R$ 0"
                  maxRotulo={formatarMoedaAbreviada(rendaReferencial)}
                  cor="var(--g3-accent)"
                />
                <div className="rounded-2xl border border-[var(--g3-border)] bg-[var(--g3-card)] px-3 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--g3-muted)]">
                    Termos ativos
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-[var(--g3-foreground)]">{data.termos.ativos}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <div className="min-w-0 rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card)] p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--g3-muted)]">
                    Distribuição por idade
                  </p>
                  <div className="mt-3 h-72">
                    <ResponsiveChart minWidth={0} minHeight={220}>
                      <BarChart data={dadosIdade}>
                        <XAxis dataKey="idade" stroke="var(--g3-muted)" fontSize={11} />
                        <YAxis stroke="var(--g3-muted)" fontSize={11} allowDecimals={false} />
                        <Tooltip
                          cursor={{ fill: "var(--g3-primary-soft)" }}
                          contentStyle={{
                            borderRadius: 10,
                            borderColor: "var(--g3-border)",
                            backgroundColor: "var(--g3-card)"
                          }}
                        />
                        <Bar dataKey="quantidade" fill="var(--g3-primary)" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveChart>
                  </div>
                </div>

                <div className="min-w-0 rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card)] p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--g3-muted)]">
                    Faixa etária
                  </p>
                  <div className="mt-3 h-72">
                    <ResponsiveChart minWidth={0} minHeight={220}>
                      <BarChart data={dadosFaixaEtaria} layout="vertical">
                        <XAxis type="number" stroke="var(--g3-muted)" fontSize={11} allowDecimals={false} />
                        <YAxis
                          type="category"
                          dataKey="faixa"
                          stroke="var(--g3-muted)"
                          fontSize={11}
                          width={126}
                        />
                        <Tooltip
                          cursor={{ fill: "var(--g3-primary-soft)" }}
                          contentStyle={{
                            borderRadius: 10,
                            borderColor: "var(--g3-border)",
                            backgroundColor: "var(--g3-card)"
                          }}
                        />
                        <Bar dataKey="quantidade" fill="var(--g3-secondary)" radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveChart>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <div className="min-w-0 rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card)] p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--g3-muted)]">
                    Vulnerabilidades mapeadas
                  </p>
                  <div className="mt-3 h-72">
                    <ResponsiveChart minWidth={0} minHeight={220}>
                      <BarChart data={dadosVulnerabilidade}>
                        <XAxis dataKey="nome" stroke="var(--g3-muted)" fontSize={10} />
                        <YAxis stroke="var(--g3-muted)" fontSize={11} allowDecimals={false} />
                        <Tooltip
                          cursor={{ fill: "var(--g3-primary-soft)" }}
                          contentStyle={{
                            borderRadius: 10,
                            borderColor: "var(--g3-border)",
                            backgroundColor: "var(--g3-card)"
                          }}
                        />
                        <Bar dataKey="quantidade" fill="var(--g3-accent)" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveChart>
                  </div>
                </div>

                <div className="min-w-0 rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card)] p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--g3-muted)]">
                    Faixa de renda
                  </p>
                  <div className="mt-3 h-72">
                    <ResponsiveChart minWidth={0} minHeight={220}>
                      <BarChart data={dadosFaixaRenda}>
                        <XAxis dataKey="faixa" stroke="var(--g3-muted)" fontSize={10} />
                        <YAxis stroke="var(--g3-muted)" fontSize={11} allowDecimals={false} />
                        <Tooltip
                          cursor={{ fill: "var(--g3-primary-soft)" }}
                          contentStyle={{
                            borderRadius: 10,
                            borderColor: "var(--g3-border)",
                            backgroundColor: "var(--g3-card)"
                          }}
                        />
                        <Bar dataKey="quantidade" fill="var(--g3-info)" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveChart>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <div className="min-w-0 rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card)] p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--g3-muted)]">
                    Beneficiários por bairro
                  </p>

                  {dadosBairros.length === 0 ? (
                    <p className="mt-3 rounded-md border border-[var(--g3-border)] bg-[var(--g3-card-soft)] px-3 py-2 text-sm text-[var(--g3-muted)]">
                      Sem dados de bairro para exibir.
                    </p>
                  ) : (
                    <div className="mt-3 h-72">
                      <ResponsiveChart minWidth={0} minHeight={220}>
                        <BarChart data={dadosBairrosTop12} layout="vertical">
                          <XAxis type="number" stroke="var(--g3-muted)" fontSize={11} allowDecimals={false} />
                          <YAxis
                            type="category"
                            dataKey="bairro"
                            stroke="var(--g3-muted)"
                            fontSize={11}
                            width={130}
                          />
                          <Tooltip
                            cursor={{ fill: "var(--g3-primary-soft)" }}
                            contentStyle={{
                              borderRadius: 10,
                              borderColor: "var(--g3-border)",
                              backgroundColor: "var(--g3-card)"
                            }}
                          />
                          <Bar dataKey="quantidade" fill="var(--g3-primary)" radius={[0, 6, 6, 0]} />
                        </BarChart>
                      </ResponsiveChart>
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-[var(--g3-border)] bg-[linear-gradient(180deg,var(--g3-card)_0%,var(--g3-card-soft)_100%)] p-3 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--g3-muted)]">
                    Ranking de bairros
                  </p>

                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-[var(--g3-muted)]">
                    <span className="rounded-full bg-[var(--g3-primary-soft)] px-2.5 py-1 font-semibold text-[var(--g3-active)]">
                      {formatarNumero(dadosBairros.length)} bairros
                    </span>
                    {rankingBairrosTopo ? (
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">
                        Líder: {rankingBairrosTopo.bairro}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-3 max-h-[22rem] overflow-auto rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card)]">
                    <table className="w-full text-left text-sm">
                      <thead className="sticky top-0 z-10 bg-[var(--g3-card-soft)] text-xs text-[var(--g3-muted)]">
                        <tr>
                          <th className="px-2 py-2">Posição</th>
                          <th className="px-2 py-2">Bairro</th>
                          <th className="px-2 py-2">Quantidade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dadosBairros.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="px-2 py-3 text-center text-xs text-[var(--g3-muted)]">
                              Sem dados para o período atual.
                            </td>
                          </tr>
                        ) : (
                          dadosBairros.map((item, index) => (
                            <tr
                              key={`${item.bairro}-${index}`}
                              className={
                                index % 2 === 0
                                  ? "border-t border-[var(--g3-border)] bg-[var(--g3-card)]"
                                  : "border-t border-[var(--g3-border)] bg-[var(--g3-card-soft)]"
                              }
                            >
                              <td className="px-2 py-2">{index + 1}</td>
                              <td className="px-2 py-2">{item.bairro}</td>
                              <td className="px-2 py-2">{item.quantidade}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card)] p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--g3-muted)]">
                    Alertas de termos de fomento
                  </p>
                  <p className="text-xs text-[var(--g3-muted)]">
                    Valor total: <strong>{formatarMoeda(data.termos.valorTotal)}</strong>
                  </p>
                </div>

                <div className="mt-3 overflow-auto rounded-md border border-[var(--g3-border)]">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[var(--g3-card-soft)] text-xs text-[var(--g3-muted)]">
                      <tr>
                        <th className="px-2 py-2">Número</th>
                        <th className="px-2 py-2">Status</th>
                        <th className="px-2 py-2">Fim da vigência</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.termos.alertas.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-2 py-3 text-center text-xs text-[var(--g3-muted)]">
                            Sem alertas no período atual.
                          </td>
                        </tr>
                      ) : (
                        data.termos.alertas.map((alerta, index) => (
                          <tr
                            key={`${alerta.numero}-${index}`}
                            className={
                              index % 2 === 0
                                ? "border-t border-[var(--g3-border)] bg-[var(--g3-card)]"
                                : "border-t border-[var(--g3-border)] bg-[var(--g3-card-soft)]"
                            }
                          >
                            <td className="px-2 py-2">{alerta.numero}</td>
                            <td className="px-2 py-2">{alerta.status ?? "---"}</td>
                            <td className="px-2 py-2">{formatarData(alerta.vigenciaFim)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
