import { useMemo, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartColumn, Eraser, Filter, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDashboardAssistencia } from "@/features/dashboard/use-dashboard";
import { classesTelaPadraoBeneficiario } from "@/lib/tela-padrao-beneficiario";
import type { DashboardFiltros } from "@/types/dashboard";

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
    return Object.entries(data.atendimento.faixaEtaria).map(([faixa, quantidade]) => ({
      faixa,
      quantidade
    }));
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
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 12);
  }, [data]);

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
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card)] px-3 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--g3-muted)]">
                    Beneficiários ativos
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-[var(--g3-foreground)]">
                    {data.atendimento.ativos}
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card)] px-3 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--g3-muted)]">
                    Cadastro completo
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-[var(--g3-foreground)]">
                    {formatarPercentual(data.atendimento.cadastroCompletoPercentual)}
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card)] px-3 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--g3-muted)]">
                    Renda média familiar
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-[var(--g3-foreground)]">
                    {formatarMoeda(data.familias.rendaMediaFamiliar)}
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card)] px-3 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--g3-muted)]">
                    Termos ativos
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-[var(--g3-foreground)]">{data.termos.ativos}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <div className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card)] p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--g3-muted)]">
                    Distribuição por idade
                  </p>
                  <div className="mt-3 h-72">
                    <ResponsiveContainer width="100%" height="100%">
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
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card)] p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--g3-muted)]">
                    Faixa etária
                  </p>
                  <div className="mt-3 h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dadosFaixaEtaria} layout="vertical">
                        <XAxis type="number" stroke="var(--g3-muted)" fontSize={11} allowDecimals={false} />
                        <YAxis
                          type="category"
                          dataKey="faixa"
                          stroke="var(--g3-muted)"
                          fontSize={11}
                          width={68}
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
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <div className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card)] p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--g3-muted)]">
                    Vulnerabilidades mapeadas
                  </p>
                  <div className="mt-3 h-72">
                    <ResponsiveContainer width="100%" height="100%">
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
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card)] p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--g3-muted)]">
                    Faixa de renda
                  </p>
                  <div className="mt-3 h-72">
                    <ResponsiveContainer width="100%" height="100%">
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
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <div className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card)] p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--g3-muted)]">
                    Beneficiários por bairro
                  </p>

                  {dadosBairros.length === 0 ? (
                    <p className="mt-3 rounded-md border border-[var(--g3-border)] bg-[var(--g3-card-soft)] px-3 py-2 text-sm text-[var(--g3-muted)]">
                      Sem dados de bairro para exibir.
                    </p>
                  ) : (
                    <div className="mt-3 h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dadosBairros} layout="vertical">
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
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card)] p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--g3-muted)]">
                    Ranking de bairros
                  </p>

                  <div className="mt-3 overflow-auto rounded-md border border-[var(--g3-border)]">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-[var(--g3-card-soft)] text-xs text-[var(--g3-muted)]">
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
