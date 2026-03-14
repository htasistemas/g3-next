import "leaflet/dist/leaflet.css";
import { useMemo, useState } from "react";
import { Circle, CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import { AlertTriangle, Layers3, MapPinned, RefreshCw, ShieldAlert, UsersRound } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  useDashboardVulnerabilidade,
  useGeocodificarPendenciasVulnerabilidade
} from "@/features/dashboard/use-dashboard";
import { classesTelaPadraoBeneficiario } from "@/lib/tela-padrao-beneficiario";

const coresCamadas = {
  cestaBasica: "#16a34a",
  familiasCadastradas: "#2563eb",
  situacaoViolencia: "#dc2626"
} as const;

export function VulnerabilidadePage() {
  const [retornoGeocodificacao, setRetornoGeocodificacao] = useState<string>();
  const [camadasAtivas, setCamadasAtivas] = useState({
    cestaBasica: true,
    familiasCadastradas: true,
    situacaoViolencia: true
  });
  const { data, isLoading, isFetching, isError, refetch } = useDashboardVulnerabilidade({
    autoRefresh: true
  });
  const geocodificarPendencias = useGeocodificarPendenciasVulnerabilidade();

  const centro = useMemo<[number, number]>(() => {
    if (data?.unidadePrincipal?.latitude && data.unidadePrincipal.longitude) {
      return [data.unidadePrincipal.latitude, data.unidadePrincipal.longitude];
    }

    const primeiroPonto =
      data?.camadas.cestaBasica.pontos.find((item) => item.latitude && item.longitude) ??
      data?.camadas.familiasCadastradas.pontos.find((item) => item.latitude && item.longitude) ??
      data?.camadas.situacaoViolencia.pontos.find((item) => item.latitude && item.longitude);

    return primeiroPonto?.latitude && primeiroPonto?.longitude
      ? [primeiroPonto.latitude, primeiroPonto.longitude]
      : [-18.9186, -48.2772];
  }, [data]);

  const pontosVisiveis = useMemo(() => {
    if (!data) return [];
    return [
      ...(camadasAtivas.cestaBasica ? data.camadas.cestaBasica.pontos.map((item) => ({ ...item, cor: coresCamadas.cestaBasica })) : []),
      ...(camadasAtivas.familiasCadastradas
        ? data.camadas.familiasCadastradas.pontos.map((item) => ({ ...item, cor: coresCamadas.familiasCadastradas }))
        : []),
      ...(camadasAtivas.situacaoViolencia
        ? data.camadas.situacaoViolencia.pontos.map((item) => ({ ...item, cor: coresCamadas.situacaoViolencia }))
        : [])
    ].filter((item) => item.latitude && item.longitude);
  }, [camadasAtivas, data]);

  function alternarCamada(chave: keyof typeof camadasAtivas) {
    setCamadasAtivas((atual) => ({ ...atual, [chave]: !atual[chave] }));
  }

  async function executarGeocodificacao() {
    try {
      const resultado = await geocodificarPendencias.mutateAsync(15);
      setRetornoGeocodificacao(
        `${resultado.atualizados} endereço(s) atualizados, ${resultado.naoEncontrados} não encontrado(s) e ${resultado.restanteEstimado} pendente(s).`
      );
    } catch {
      setRetornoGeocodificacao("Não foi possível geocodificar os endereços pendentes agora.");
    }
  }

  return (
    <main className={classesTelaPadraoBeneficiario.container}>
      <Card className={classesTelaPadraoBeneficiario.cardConteudo}>
        <CardHeader className={classesTelaPadraoBeneficiario.cabecalhoConteudo}>
          <div className={classesTelaPadraoBeneficiario.tituloAba}>
            <MapPinned className="h-4 w-4" />
            <CardTitle className={classesTelaPadraoBeneficiario.tituloAbaTexto}>
              Vulnerabilidade territorial
            </CardTitle>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className={classesTelaPadraoBeneficiario.botaoAcao}
              onClick={() => void executarGeocodificacao()}
              disabled={geocodificarPendencias.isPending}
            >
              <MapPinned className={`mr-1.5 h-3.5 w-3.5 ${geocodificarPendencias.isPending ? "animate-pulse" : ""}`} />
              Geolocalizar pendências
            </Button>
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
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {retornoGeocodificacao ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-700">
              {retornoGeocodificacao}
            </div>
          ) : null}

          {isError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700">
              Não foi possível carregar o mapa de vulnerabilidade.
            </div>
          ) : null}

          {isLoading || !data ? (
            <div className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card-soft)] px-3 py-4 text-sm text-[var(--g3-muted)]">
              Carregando dados territoriais...
            </div>
          ) : (
            <>
              <div className="grid gap-3 xl:grid-cols-[320px_minmax(0,1fr)]">
                <section className="space-y-3">
                  <Card className="border-[var(--g3-border)]">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Unidade principal</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1 text-sm text-[var(--g3-muted)]">
                      <p className="font-semibold text-[var(--g3-foreground)]">
                        {data.unidadePrincipal?.nome ?? "Unidade principal não configurada"}
                      </p>
                      <p>
                        {[data.unidadePrincipal?.cidade, data.unidadePrincipal?.estado]
                          .filter(Boolean)
                          .join(" - ") || "Sem cidade principal definida"}
                      </p>
                      <p>
                        Centro do mapa:{" "}
                        {data.unidadePrincipal?.latitude && data.unidadePrincipal?.longitude
                          ? `${data.unidadePrincipal.latitude.toFixed(5)}, ${data.unidadePrincipal.longitude.toFixed(5)}`
                          : "Coordenadas da unidade não informadas"}
                      </p>
                      <p>
                        Pendências territoriais:{" "}
                        {data.camadas.cestaBasica.pendentesGeolocalizacao +
                          data.camadas.familiasCadastradas.pendentesGeolocalizacao +
                          data.camadas.situacaoViolencia.pendentesGeolocalizacao}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-[var(--g3-border)]">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <Layers3 className="h-4 w-4" />
                        Camadas do mapa
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card)] px-3 py-2">
                        <input
                          type="checkbox"
                          checked={camadasAtivas.cestaBasica}
                          onChange={() => alternarCamada("cestaBasica")}
                        />
                        <span>
                          <strong>Cesta básica</strong>
                          <span className="block text-[var(--g3-muted)]">
                            {data.camadas.cestaBasica.geolocalizados} com ponto no mapa
                          </span>
                        </span>
                      </label>
                      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card)] px-3 py-2">
                        <input
                          type="checkbox"
                          checked={camadasAtivas.familiasCadastradas}
                          onChange={() => alternarCamada("familiasCadastradas")}
                        />
                        <span>
                          <strong>Famílias cadastradas</strong>
                          <span className="block text-[var(--g3-muted)]">
                            {data.camadas.familiasCadastradas.geolocalizados} com ponto no mapa
                          </span>
                        </span>
                      </label>
                      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card)] px-3 py-2">
                        <input
                          type="checkbox"
                          checked={camadasAtivas.situacaoViolencia}
                          onChange={() => alternarCamada("situacaoViolencia")}
                        />
                        <span>
                          <strong>Situação de violência</strong>
                          <span className="block text-[var(--g3-muted)]">
                            {data.camadas.situacaoViolencia.geolocalizados} com ponto no mapa
                          </span>
                        </span>
                      </label>
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-1">
                    <ResumoCard
                      titulo="Cesta básica"
                      total={data.camadas.cestaBasica.total}
                      geolocalizados={data.camadas.cestaBasica.geolocalizados}
                      pendentes={data.camadas.cestaBasica.pendentesGeolocalizacao}
                      icone={ShieldAlert}
                      cor={coresCamadas.cestaBasica}
                    />
                    <ResumoCard
                      titulo="Famílias"
                      total={data.camadas.familiasCadastradas.total}
                      geolocalizados={data.camadas.familiasCadastradas.geolocalizados}
                      pendentes={data.camadas.familiasCadastradas.pendentesGeolocalizacao}
                      icone={UsersRound}
                      cor={coresCamadas.familiasCadastradas}
                    />
                    <ResumoCard
                      titulo="Violência"
                      total={data.camadas.situacaoViolencia.total}
                      geolocalizados={data.camadas.situacaoViolencia.geolocalizados}
                      pendentes={data.camadas.situacaoViolencia.pendentesGeolocalizacao}
                      icone={AlertTriangle}
                      cor={coresCamadas.situacaoViolencia}
                    />
                  </div>

                  <Card className="border-[var(--g3-border)]">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Sugestões de visualização</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm text-[var(--g3-muted)]">
                      {data.sugestoes.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card-soft)] px-3 py-2"
                        >
                          <p className="font-semibold text-[var(--g3-foreground)]">{item.titulo}</p>
                          <p>{item.descricao}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </section>

                <section className="overflow-hidden rounded-2xl border border-[var(--g3-border)] bg-[var(--g3-card)]">
                  <div className="border-b border-[var(--g3-border)] px-4 py-3">
                    <p className="text-sm font-semibold text-[var(--g3-foreground)]">
                      Mapa territorial da unidade principal
                    </p>
                    <p className="text-xs text-[var(--g3-muted)]">
                      {pontosVisiveis.length} ponto(s) visíveis nas camadas selecionadas.
                    </p>
                  </div>
                  <div className="h-[620px]">
                    <MapContainer center={centro} zoom={12} className="h-full w-full">
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />

                      {data.unidadePrincipal?.latitude && data.unidadePrincipal.longitude ? (
                        <>
                          <CircleMarker
                            center={[data.unidadePrincipal.latitude, data.unidadePrincipal.longitude]}
                            radius={10}
                            pathOptions={{ color: "#111827", fillColor: "#111827", fillOpacity: 0.85 }}
                          >
                            <Popup>
                              <strong>{data.unidadePrincipal.nome}</strong>
                              <div>Unidade principal</div>
                            </Popup>
                          </CircleMarker>
                          {data.unidadePrincipal.raioMetros ? (
                            <Circle
                              center={[data.unidadePrincipal.latitude, data.unidadePrincipal.longitude]}
                              radius={data.unidadePrincipal.raioMetros}
                              pathOptions={{ color: "#111827", fillOpacity: 0.04 }}
                            />
                          ) : null}
                        </>
                      ) : null}

                      {pontosVisiveis.map((item) => (
                        <CircleMarker
                          key={`${item.camada}-${item.id}`}
                          center={[item.latitude as number, item.longitude as number]}
                          radius={7}
                          pathOptions={{ color: item.cor, fillColor: item.cor, fillOpacity: 0.7 }}
                        >
                          <Popup>
                            <strong>{item.titulo}</strong>
                            {item.subtitulo ? <div>{item.subtitulo}</div> : null}
                            {item.bairro || item.cidade ? (
                              <div>
                                {[item.bairro, item.cidade].filter(Boolean).join(" - ")}
                              </div>
                            ) : null}
                            {item.dataReferencia ? <div>Data: {formatarData(item.dataReferencia)}</div> : null}
                          </Popup>
                        </CircleMarker>
                      ))}
                    </MapContainer>
                  </div>
                </section>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

function ResumoCard({
  titulo,
  total,
  geolocalizados,
  pendentes,
  icone: Icone,
  cor
}: {
  titulo: string;
  total: number;
  geolocalizados: number;
  pendentes: number;
  icone: typeof ShieldAlert;
  cor: string;
}) {
  return (
    <Card className="border-[var(--g3-border)]">
      <CardContent className="space-y-2 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-[var(--g3-foreground)]">{titulo}</p>
          <span className="rounded-full p-2" style={{ backgroundColor: `${cor}18`, color: cor }}>
            <Icone className="h-4 w-4" />
          </span>
        </div>
        <p className="text-2xl font-semibold text-[var(--g3-foreground)]">{total}</p>
        <p className="text-xs text-[var(--g3-muted)]">
          {geolocalizados} geolocalizados • {pendentes} pendentes
        </p>
      </CardContent>
    </Card>
  );
}

function formatarData(valor: string) {
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return valor;
  return new Intl.DateTimeFormat("pt-BR").format(data);
}
