import { startTransition, useDeferredValue, useEffect, useEffectEvent, useMemo, useState } from "react";
import { Download, Eraser, Filter, ImageDown, LocateFixed, MapPinned, Printer, RefreshCw, Target } from "lucide-react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useNavigate } from "react-router-dom";
import { CircleMarker, MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  useBuscarVinculosGeorreferenciamento,
  useConsultaGeorreferenciamento,
  useDetalheGeorreferenciamento,
  useGeocodificarPendenciasGeorreferenciamento,
  useOpcoesGeorreferenciamento,
  useSalvarMarcacaoGeorreferenciamento
} from "@/features/dashboard/use-dashboard";
import { classesTelaPadraoBeneficiario } from "@/lib/tela-padrao-beneficiario";
import type { GeoBBox, GeoDetailResponse, GeoFilters, GeoLayer, GeoMapPoint, GeoQueryResponse } from "@/types/georreferenciamento";

const estilosCamada: Record<GeoLayer, string> = {
  beneficiarios: "#2563eb",
  familias: "#0f766e",
  voluntarios: "#7c3aed",
  profissionais: "#ea580c",
  instituicoes: "#475569",
  doadores: "#be123c",
  pontos_distribuicao: "#16a34a",
  demandas_territoriais: "#b45309",
  vulnerabilidade: "#dc2626",
  violencia: "#7f1d1d"
};

const rotulosCamada: Record<GeoLayer, string> = {
  beneficiarios: "Beneficiários",
  familias: "Famílias",
  voluntarios: "Voluntários",
  profissionais: "Profissionais",
  instituicoes: "Instituições",
  doadores: "Doadores",
  pontos_distribuicao: "Pontos de distribuição",
  demandas_territoriais: "Demandas territoriais",
  vulnerabilidade: "Vulnerabilidade",
  violencia: "Violência"
};

const filtrosPadrao: GeoFilters = {
  camadas: ["beneficiarios", "familias", "pontos_distribuicao", "vulnerabilidade", "violencia"],
  modo: "cluster",
  zoom: 12,
  bairro: [],
  microterritorio: [],
  faixaEtaria: [],
  sexo: [],
  situacaoVulnerabilidade: [],
  status: [],
  unidadeReferencia: [],
  periodoTipo: "cadastro"
};

function alternarValor<T extends string>(lista: T[], valor: T): T[] {
  return lista.includes(valor) ? lista.filter((item) => item !== valor) : [...lista, valor];
}

function baixarArquivo(nome: string, conteudo: string, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([conteudo], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nome;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function rotaCadastro(entidadeTipo: string) {
  switch (entidadeTipo) {
    case "BENEFICIARIO":
      return "/cadastros/beneficiarios";
    case "FAMILIA":
      return "/cadastros/vinculo-familiar";
    case "PROFISSIONAL":
      return "/cadastros/profissionais";
    case "VOLUNTARIO":
      return "/cadastros/voluntariado";
    case "INSTITUICAO":
      return "/cadastros/unidades-assistenciais";
    default:
      return undefined;
  }
}

function detalheBasico(ponto: GeoMapPoint | null): GeoDetailResponse | null {
  if (!ponto) return null;
  return {
    id: ponto.id,
    camada: ponto.camada,
    entidadeTipo: ponto.entidadeTipo,
    titulo: ponto.titulo,
    codigo: ponto.codigo,
    tipoLabel: ponto.tipoLabel,
    bairro: ponto.bairro,
    cidade: ponto.cidade,
    uf: ponto.uf,
    regiao: ponto.regiao,
    enderecoResumo: ponto.enderecoResumo,
    telefone: ponto.telefone,
    situacaoResumo: ponto.situacaoResumo,
    programaServico: ponto.programaServico,
    unidadeReferencia: ponto.unidadeReferencia,
    status: ponto.status,
    dataReferencia: ponto.dataReferencia,
    latitude: ponto.latitude,
    longitude: ponto.longitude,
    rotaCadastro: rotaCadastro(ponto.entidadeTipo)
  };
}

function ResumoCard({ titulo, valor }: { titulo: string; valor: number }) {
  return <Card className="border-[var(--g3-border)] bg-[linear-gradient(180deg,#f6fbf7_0%,#e6f5ea_100%)] shadow-[0_18px_38px_-28px_rgba(22,101,52,0.35)]"><CardContent className="px-3 py-3"><p className="text-xs font-semibold uppercase tracking-wide text-[var(--g3-muted)]">{titulo}</p><p className="mt-1 text-2xl font-semibold text-[var(--g3-foreground)]">{valor.toLocaleString("pt-BR")}</p></CardContent></Card>;
}

function FiltroLista({ titulo, itens, selecionados, onToggle }: { titulo: string; itens: string[]; selecionados: string[]; onToggle: (valor: string) => void }) {
  if (!itens.length) return null;
  return <div><Label className="text-[10px] font-bold uppercase text-[var(--g3-muted)] tracking-wider">{titulo}</Label><div className="mt-2 max-h-32 space-y-1 overflow-auto rounded-lg border border-[var(--g3-border)] p-1.5 bg-white shadow-inner">{itens.slice(0, 24).map((item) => <label key={item} className="flex items-center gap-2 rounded px-1.5 py-1 hover:bg-[var(--g3-card-soft)] transition-colors cursor-pointer"><Checkbox checked={selecionados.includes(item)} onChange={() => onToggle(item)} /><span className="text-xs">{item}</span></label>)}</div></div>;
}

function mesmasCamadas(atuais: GeoLayer[], esperadas: GeoLayer[]) {
  return atuais.length === esperadas.length && esperadas.every((item) => atuais.includes(item));
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function criarSvgPin(cor: string) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`<svg width="24" height="32" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 0C5.37 0 0 5.37 0 12C0 21 12 32 12 32C12 32 24 21 24 12C24 5.37 18.63 0 12 0ZM12 16C9.79 16 8 14.21 8 12C8 9.79 9.79 8 12 8C14.21 8 16 9.79 16 12C16 14.21 14.21 16 12 16Z" fill="${cor}"/><path d="M12 14C13.1046 14 14 13.1046 14 12C14 10.8954 13.1046 10 12 10C10.8954 10 10 10.8954 10 12C10 13.1046 10.8954 14 12 14Z" fill="white"/></svg>`)}`;
}

function criarIconePin(cor: string) {
  return L.icon({
    iconUrl: criarSvgPin(cor),
    iconSize: [24, 32],
    iconAnchor: [12, 32],
    popupAnchor: [0, -28]
  });
}

function Observer({
  center,
  zoom,
  onReady,
  onViewportChange
}: {
  center: [number, number];
  zoom: number;
  onReady: () => void;
  onViewportChange: (payload: { zoom: number; bbox: GeoBBox }) => void;
}) {
  const map = useMap();

  useEffect(() => {
    map.setView(center, zoom, { animate: false });
  }, [center, map, zoom]);

  useEffect(() => {
    const atualizar = () => {
      const bounds = map.getBounds();
      onViewportChange({
        zoom: map.getZoom(),
        bbox: {
          north: bounds.getNorth(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          west: bounds.getWest()
        }
      });
      onReady();
    };

    atualizar();
    map.on("moveend zoomend", atualizar);
    return () => {
      map.off("moveend zoomend", atualizar);
    };
  }, [map, onReady, onViewportChange]);

  return null;
}

function ClickCapture({
  modoMarcacao,
  onPick
}: {
  modoMarcacao: boolean;
  onPick: (payload: { latitude: number; longitude: number }) => void;
}) {
  useMapEvents({
    click(event) {
      if (!modoMarcacao) return;
      onPick({
        latitude: Number(event.latlng.lat.toFixed(6)),
        longitude: Number(event.latlng.lng.toFixed(6))
      });
    }
  });

  return null;
}

function GoogleGeoMap({
  center,
  zoom,
  agregados,
  marcadores,
  pontoManual,
  modoMarcacao,
  onPick,
  onReady,
  onViewportChange,
  onSelecionar
}: {
  center: [number, number];
  zoom: number;
  agregados: GeoQueryResponse["agregados"];
  marcadores: GeoQueryResponse["marcadores"];
  pontoManual: { latitude: number; longitude: number } | null;
  modoMarcacao: boolean;
  onPick: (payload: { latitude: number; longitude: number }) => void;
  onReady: () => void;
  onViewportChange: (payload: { zoom: number; bbox: GeoBBox }) => void;
  onSelecionar: (ponto: GeoMapPoint) => void;
}) {
  return (
    <MapContainer center={center} zoom={zoom} className="h-full w-full" zoomControl attributionControl>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        subdomains={["a", "b", "c", "d"]}
      />
      <Observer center={center} zoom={zoom} onReady={onReady} onViewportChange={onViewportChange} />
      <ClickCapture modoMarcacao={modoMarcacao} onPick={onPick} />
      {agregados.map((item) => (
        <CircleMarker
          key={
            "agregado-" + item.camada + "-" + item.latitude + "-" + item.longitude
          }
          center={[item.latitude, item.longitude]}
          pathOptions={{
            color: estilosCamada[item.camada],
            fillColor: estilosCamada[item.camada],
            fillOpacity: 0.34,
            weight: 2
          }}
          radius={Math.min(30, 10 + item.quantidade / 2)}
        >
          <Popup>
            <div className="min-w-[180px]">
              <div className="text-[11px] font-bold text-slate-900">{rotulosCamada[item.camada]}</div>
              <div className="mt-1 text-xs text-slate-700">{item.bairro || "Ponto agregado"}</div>
              <div className="mt-2 text-xs text-slate-600">Quantidade: {item.quantidade}</div>
            </div>
          </Popup>
        </CircleMarker>
      ))}
      {marcadores.map((item) => {
        const isGrupo = (item.quantidade ?? 1) > 1;
        return (
          <Marker
            key={item.id}
            position={[item.latitude, item.longitude]}
            icon={
              isGrupo
                ? L.divIcon({
                    className: "geo-cluster-marker",
                    html:
                      '<div style="background:' +
                      estilosCamada[item.camada] +
                      ';color:#fff;border:2px solid #fff;width:34px;height:34px;border-radius:999px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;box-shadow:0 10px 24px -12px rgba(15,23,42,.65)">' +
                      escapeHtml(String(item.quantidade ?? 1)) +
                      "</div>",
                    iconSize: [34, 34],
                    iconAnchor: [17, 17]
                  })
                : criarIconePin(estilosCamada[item.camada])
            }
            eventHandlers={{ click: () => onSelecionar(item) }}
          >
            <Popup>
              <div className="min-w-[190px]">
                <div className="text-[10px] font-bold uppercase text-slate-500">{item.tipoLabel}</div>
                <div className="mt-1 text-sm font-extrabold text-slate-900">{item.titulo}</div>
                <div className="mt-2 text-xs text-slate-600">{item.bairro || "Bairro nao informado"}</div>
              </div>
            </Popup>
          </Marker>
        );
      })}
      {pontoManual ? (
        <Marker position={[pontoManual.latitude, pontoManual.longitude]} icon={criarIconePin("#f59e0b")}>
          <Popup>Ponto manual selecionado</Popup>
        </Marker>
      ) : null}
    </MapContainer>
  );
}

export function VulnerabilidadePage() {
  const navigate = useNavigate();
  const [filtros, setFiltros] = useState<GeoFilters>(filtrosPadrao);
  const [viewportPronto, setViewportPronto] = useState(false);
  const [modoMarcacao, setModoMarcacao] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [pontoManual, setPontoManual] = useState<{ latitude: number; longitude: number } | null>(null);
  const [pontoSelecionado, setPontoSelecionado] = useState<GeoMapPoint | null>(null);
  const [expandirFiltros, setExpandirFiltros] = useState(true);
  const [formPonto, setFormPonto] = useState({ acao: "PONTO_TERRITORIAL", categoria: "DEMANDA", titulo: "", descricao: "", entidadeTipo: "", entidadeId: "" });
  const [buscaVinculo, setBuscaVinculo] = useState("");
  const buscaVinculoAdiada = useDeferredValue(buscaVinculo);
  const { data: opcoes } = useOpcoesGeorreferenciamento();
  const { data, isLoading, isFetching, isError, refetch } = useConsultaGeorreferenciamento(filtros, { enabled: Boolean(opcoes) && viewportPronto });
  const detalhe = useDetalheGeorreferenciamento(pontoSelecionado && (pontoSelecionado.quantidade ?? 1) === 1 ? pontoSelecionado.id : null);
  const vinculos = useBuscarVinculosGeorreferenciamento(buscaVinculoAdiada, ["BENEFICIARIO", "FAMILIA", "VOLUNTARIO", "PROFISSIONAL", "INSTITUICAO", "DOADOR"], Boolean(pontoManual) && formPonto.acao === "LOCALIZACAO_VINCULADA");
  const salvarMarcacao = useSalvarMarcacaoGeorreferenciamento();
  const geocodificarPendencias = useGeocodificarPendenciasGeorreferenciamento();

  const atualizarViewport = useEffectEvent((payload: { zoom: number; bbox: GeoBBox }) => {
    setFiltros((atual) =>
      atual.zoom === payload.zoom &&
      atual.bbox &&
      atual.bbox.north.toFixed(6) === payload.bbox.north.toFixed(6) &&
      atual.bbox.south.toFixed(6) === payload.bbox.south.toFixed(6) &&
      atual.bbox.east.toFixed(6) === payload.bbox.east.toFixed(6) &&
      atual.bbox.west.toFixed(6) === payload.bbox.west.toFixed(6)
        ? atual
        : { ...atual, zoom: payload.zoom, bbox: payload.bbox }
    );
  });

  const centro = useMemo<[number, number]>(() => {
    if (pontoManual) return [pontoManual.latitude, pontoManual.longitude];
    if (pontoSelecionado) return [pontoSelecionado.latitude, pontoSelecionado.longitude];
    if (data?.unidadePrincipal?.latitude && data?.unidadePrincipal?.longitude) return [data.unidadePrincipal.latitude, data.unidadePrincipal.longitude];
    const marcador = data?.marcadores[0];
    return marcador ? [marcador.latitude, marcador.longitude] : [-18.9186, -48.2772];
  }, [data, pontoManual, pontoSelecionado]);

  const detalheAtual = detalhe.data ?? detalheBasico(pontoSelecionado);

  function atualizarLista(campo: "camadas" | "bairro" | "microterritorio" | "sexo" | "status" | "faixaEtaria" | "situacaoVulnerabilidade" | "unidadeReferencia", valor: string) {
    setFiltros((atual) => ({ ...atual, [campo]: alternarValor(atual[campo], valor) }));
  }

  function ativarModoCesta() {
    setFiltros((atual) => ({
      ...atual,
      camadas: ["beneficiarios", "pontos_distribuicao"],
      modo: "cluster",
      receberCestaBasica: true,
      necessidadeCesta: undefined,
      ocorrenciaViolencia: undefined,
      faixaEtaria: [],
      situacaoVulnerabilidade: []
    }));
    setMensagem("Filtro de cestas entregues ativado.");
  }

  function ativarModoBeneficiarios() {
    setFiltros((atual) => ({
      ...atual,
      camadas: ["beneficiarios"],
      modo: "cluster",
      receberCestaBasica: undefined,
      necessidadeCesta: undefined,
      ocorrenciaViolencia: undefined,
      faixaEtaria: [],
      status: [],
      situacaoVulnerabilidade: []
    }));
    setMensagem("Foco em beneficiários cadastrados ativado.");
  }

  function ativarFocoIdososSozinhos() {
    setFiltros((atual) => ({
      ...atual,
      camadas: ["beneficiarios", "familias", "vulnerabilidade"],
      modo: "cluster",
      faixaEtaria: ["idoso"],
      receberCestaBasica: undefined,
      necessidadeCesta: true,
      ocorrenciaViolencia: undefined
    }));
    setMensagem("Filtro de idosos sozinhos ativado.");
  }

  function ativarAguardandoCestas() {
    setFiltros((atual) => ({
      ...atual,
      camadas: ["beneficiarios", "familias", "pontos_distribuicao", "vulnerabilidade"],
      modo: "cluster",
      necessidadeCesta: true,
      receberCestaBasica: undefined,
      ocorrenciaViolencia: undefined
    }));
    setMensagem("Filtro de famílias aguardando cestas ativado.");
  }

  function ativarMapaApoioERisco() {
    setFiltros((atual) => ({
      ...atual,
      camadas: ["violencia", "pontos_distribuicao", "instituicoes", "doadores"] as GeoLayer[],
      modo: "agregado",
      receberCestaBasica: undefined,
      necessidadeCesta: undefined,
      ocorrenciaViolencia: undefined,
      faixaEtaria: [],
      situacaoVulnerabilidade: []
    }));
    setMensagem("Mapa de apoio e risco ativado.");
  }

  function alternarCamada(camada: GeoLayer) {
    setFiltros((atual) => ({ ...atual, camadas: alternarValor(atual.camadas, camada) }));
  }

  function alternarFaixa(faixa: any) {
    setFiltros((atual) => ({ ...atual, faixaEtaria: alternarValor(atual.faixaEtaria || [], faixa) as any }));
  }

  function exportarLista() {
    if (!data) return;
    const linhas = [
      "Camada;Titulo;Tipo;Bairro;Cidade;Quantidade;Latitude;Longitude",
      ...data.marcadores.map((item) =>
        [rotulosCamada[item.camada], item.titulo, item.tipoLabel, item.bairro ?? "", item.cidade ?? "", item.quantidade ?? 1, item.latitude, item.longitude]
          .map((valor) => `"${String(valor).replace(/"/g, '""')}"`)
          .join(";")
      )
    ];
    baixarArquivo("georreferenciamento-lista.csv", linhas.join("\n"), "text/csv;charset=utf-8");
    setMensagem("Lista territorial exportada.");
  }

  function exportarPdf() {
    if (!data) return;
    const popup = window.open("", "_blank", "noopener,noreferrer,width=1200,height=900");
    if (!popup) return;
    popup.document.write(`<html><head><meta charset="utf-8"><title>Relatorio territorial</title></head><body style="font-family:Arial;padding:24px"><h1>Relatorio territorial</h1><p>Total encontrado: ${data.totalEncontrado.toLocaleString("pt-BR")} | Geolocalizados: ${data.totalGeolocalizado.toLocaleString("pt-BR")}</p></body></html>`);
    popup.document.close();
    popup.print();
    setMensagem("Janela de impressao aberta para PDF.");
  }

  const camadasDisponiveis: GeoLayer[] = opcoes?.camadas?.map((item) => item.id as GeoLayer) ?? ([
    "beneficiarios",
    "familias",
    "voluntarios",
    "profissionais",
    "instituicoes",
    "doadores",
    "pontos_distribuicao",
    "vulnerabilidade",
    "violencia"
  ] as GeoLayer[]);

  const idososSozinhosAtivo =
    mesmasCamadas(filtros.camadas, ["beneficiarios", "familias", "vulnerabilidade"]) &&
    filtros.modo === "cluster" &&
    filtros.faixaEtaria.includes("idoso") &&
    filtros.necessidadeCesta === true;
  const aguardandoCestasAtivo =
    mesmasCamadas(filtros.camadas, ["beneficiarios", "familias", "pontos_distribuicao", "vulnerabilidade"]) &&
    filtros.modo === "cluster" &&
    filtros.necessidadeCesta === true;
  const mapaApoioERiscoAtivo =
    mesmasCamadas(filtros.camadas, ["violencia", "pontos_distribuicao", "instituicoes", "doadores"]) &&
    filtros.modo === "agregado";

  return (
    <main className="flex h-[calc(100vh-64px)] w-full overflow-hidden bg-slate-50">
      {/* BARRA LATERAL DE FILTROS */}
      <aside className={`relative z-20 flex flex-col border-r bg-white shadow-xl transition-all duration-300 ${expandirFiltros ? "w-80" : "w-0"}`}>
        <div className="flex h-full flex-col overflow-y-auto overflow-x-hidden p-4 space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <h2 className="flex items-center gap-2 font-bold text-slate-800"><Filter className="h-4 w-4" /> Filtros</h2>
            <Button variant="ghost" size="sm" onClick={() => setExpandirFiltros(false)}>recolher</Button>
          </div>

          <div className="space-y-6">
            {/* O QUE VER? (CAMADAS) */}
            <div className="space-y-3">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">O que ver no mapa?</Label>
              <div className="grid grid-cols-1 gap-1.5">
                {camadasDisponiveis.map(c => (
                  <label key={c} className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-xs cursor-pointer transition-all ${filtros.camadas.includes(c) ? "border-blue-200 bg-blue-50 text-blue-700 font-bold" : "bg-white border-slate-100 text-slate-500 hover:border-slate-300"}`}>
                    <div className="flex items-center gap-2">
                      <Checkbox checked={filtros.camadas.includes(c)} onChange={() => alternarCamada(c)} />
                      <span>{rotulosCamada[c]}</span>
                    </div>
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: estilosCamada[c] }} />
                  </label>
                ))}
              </div>
            </div>

            {/* ONDE? (LOCALIZACAO) */}
            <div className="space-y-3 border-t pt-4">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Onde? (Bairros e Regioes)</Label>
              <Input value={filtros.termo ?? ""} onChange={(e) => setFiltros(a => ({ ...a, termo: e.target.value || undefined }))} placeholder="Buscar bairro ou endereco..." className="h-9" />
              <FiltroLista titulo="Selecionar Bairros" itens={opcoes?.bairros ?? []} selecionados={filtros.bairro} onToggle={(v) => atualizarLista("bairro", v)} />
            </div>

            {/* FILTROS ESTRATEGICOS */}
            <div className="space-y-3 border-t pt-4">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Visoes Estrategicas</Label>
              <div className="grid grid-cols-1 gap-2">
                <Button variant="outline" size="sm" className={`justify-start h-10 border-emerald-200 text-emerald-700 hover:bg-emerald-50 ${filtros.receberCestaBasica ? "bg-emerald-100 ring-2 ring-emerald-500 ring-offset-1" : ""}`} onClick={ativarModoCesta}>
                  <MapPinned className="mr-2 h-4 w-4" /> Cestas entregues
                </Button>
                <Button variant="outline" size="sm" className="justify-start h-10 border-blue-200 text-blue-700 hover:bg-blue-50" onClick={ativarModoBeneficiarios}>
                  <Target className="mr-2 h-4 w-4" /> Todos os cadastrados
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className={`justify-start h-10 border-amber-200 text-amber-700 hover:bg-amber-50 ${idososSozinhosAtivo ? "bg-amber-100 ring-2 ring-amber-500 ring-offset-1" : ""}`}
                  onClick={ativarFocoIdososSozinhos}
                >
                  <Target className="mr-2 h-4 w-4" /> Idosos sozinhos
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className={`justify-start h-10 border-rose-200 text-rose-700 hover:bg-rose-50 ${aguardandoCestasAtivo ? "bg-rose-100 ring-2 ring-rose-500 ring-offset-1" : ""}`}
                  onClick={ativarAguardandoCestas}
                >
                  <MapPinned className="mr-2 h-4 w-4" /> Aguardando cestas
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className={`justify-start h-auto min-h-10 border-slate-300 text-slate-700 hover:bg-slate-50 ${mapaApoioERiscoAtivo ? "bg-slate-100 ring-2 ring-slate-500 ring-offset-1" : ""}`}
                  onClick={ativarMapaApoioERisco}
                >
                  <MapPinned className="mr-2 h-4 w-4" /> Mapa de apoio e risco
                </Button>
                <div className="rounded-xl bg-slate-50 p-3 space-y-2 border border-dashed border-slate-200">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Leitura rápida</span>
                  <p className="text-[10px] text-slate-600">Idosos sozinhos prioriza beneficiários e famílias com faixa etária idoso e sinais de vulnerabilidade alimentar.</p>
                  <p className="text-[10px] text-slate-600">Aguardando cestas concentra famílias e beneficiários com necessidade urgente de cesta.</p>
                  <p className="text-[10px] text-slate-600">Mapa de apoio e risco cruza violência, cestas entregues, instituições e doadores em visão agregada.</p>
                </div>
              </div>
            </div>

            {/* QUANDO? (PERIODO) */}
            <div className="space-y-3 border-t pt-4">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Quando? (Periodo)</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input type="date" value={filtros.periodoInicio ?? ""} onChange={(e) => setFiltros(a => ({ ...a, periodoInicio: e.target.value || undefined }))} className="h-8 text-[10px]" />
                <Input type="date" value={filtros.periodoFim ?? ""} onChange={(e) => setFiltros(a => ({ ...a, periodoFim: e.target.value || undefined }))} className="h-8 text-[10px]" />
              </div>
            </div>
          </div>

          <div className="mt-auto border-t pt-4 flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={() => setFiltros(filtrosPadrao)}>Limpar</Button>
            <Button variant="outline" size="sm" className="flex-1" onClick={() => refetch()}>Atualizar</Button>
          </div>
        </div>
      </aside>

      {/* AREA DO MAPA */}
      <section className="relative flex-1 overflow-hidden">
        {/* BOTAO PARA ABRIR FILTROS SE ESTIVEREM FECHADOS */}
        {!expandirFiltros && (
          <button onClick={() => setExpandirFiltros(true)} className="absolute left-4 top-4 z-30 rounded-full bg-white p-3 shadow-lg hover:bg-slate-50 border transition-all text-slate-700">
            <Filter className="h-5 w-5" />
          </button>
        )}

        {/* INDICADORES FLUTUANTES NO TOPO */}
        <div className="absolute left-1/2 top-4 z-30 -translate-x-1/2 flex gap-3 pointer-events-none">
          <div className="flex items-center gap-4 rounded-full bg-white/90 px-6 py-2 shadow-xl backdrop-blur-md border pointer-events-auto">
            <div className="flex flex-col"><span className="text-[9px] font-bold uppercase text-slate-400 leading-none">Pessoas</span><span className="text-sm font-black text-slate-800">{(data?.totalEncontrado ?? 0).toLocaleString()}</span></div>
            <div className="h-6 w-px bg-slate-200" />
            <div className="flex flex-col"><span className="text-[9px] font-bold uppercase text-slate-400 leading-none">Cestas</span><span className="text-sm font-black text-emerald-600">{(data?.indicadores.totalPontosDistribuicao ?? 0).toLocaleString()}</span></div>
            <div className="h-6 w-px bg-slate-200" />
            <div className="flex flex-col"><span className="text-[9px] font-bold uppercase text-slate-400 leading-none">Alertas</span><span className="text-sm font-black text-red-600">{(data?.indicadores.totalOcorrenciasViolencia ?? 0).toLocaleString()}</span></div>
          </div>
        </div>

        {/* ACOES RAPIDAS NO TOPO DIREITO */}
        <div className="absolute right-4 top-4 z-30 flex flex-col gap-2">
          <button title="Marcacao Manual" onClick={() => setModoMarcacao(!modoMarcacao)} className={`rounded-lg p-2.5 shadow-lg border transition-all ${modoMarcacao ? "bg-amber-500 text-white border-amber-600" : "bg-white text-slate-600 hover:bg-slate-50"}`}><Target className="h-5 w-5" /></button>
          <button title="Exportar Dados" onClick={exportarLista} className="rounded-lg bg-white p-2.5 text-slate-600 shadow-lg border hover:bg-slate-50 transition-all"><Download className="h-5 w-5" /></button>
          <button title="Gerar PDF" onClick={exportarPdf} className="rounded-lg bg-white p-2.5 text-slate-600 shadow-lg border hover:bg-slate-50 transition-all"><Printer className="h-5 w-5" /></button>
        </div>

        {/* MAPA EM SI */}
        <div className="h-full w-full bg-slate-100">
          <GoogleGeoMap
            center={centro}
            zoom={filtros.zoom}
            agregados={data?.agregados ?? []}
            marcadores={data?.marcadores ?? []}
            pontoManual={pontoManual}
            modoMarcacao={modoMarcacao}
            onPick={setPontoManual}
            onReady={() => setViewportPronto(true)}
            onViewportChange={atualizarViewport}
            onSelecionar={setPontoSelecionado}
          />
        </div>

        <div className="absolute bottom-6 left-6 z-30 max-w-sm rounded-2xl border border-white/60 bg-white/95 px-4 py-3 shadow-xl backdrop-blur-md">
          <p className="text-xs font-semibold text-slate-900">Mapa gratuito ativo</p>
          <p className="mt-1 text-xs text-slate-600">A tela usa base CARTO Voyager com Leaflet, sem depender de chave ou faturamento.</p>
        </div>

        {/* CARD DE DETALHES FLUTUANTE NO CANTO INFERIOR DIREITO */}
        {pontoSelecionado && (
          <div className="absolute bottom-6 right-6 z-30 w-80 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <Card className="shadow-2xl border-2 border-white/50 bg-white/95 backdrop-blur-md">
              <CardHeader className="p-4 flex flex-row items-center justify-between border-b bg-slate-50/50">
                <div className="flex flex-col"><span className="text-[9px] font-bold uppercase text-slate-400 tracking-tight">{pontoSelecionado.tipoLabel}</span><CardTitle className="text-sm font-black text-slate-800">{pontoSelecionado.titulo}</CardTitle></div>
                <button onClick={() => setPontoSelecionado(null)} className="text-slate-400 hover:text-slate-600">×</button>
              </CardHeader>
              <CardContent className="p-4 text-xs space-y-3">
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex items-center gap-2"><div className="h-5 w-5 rounded bg-blue-50 flex items-center justify-center"><MapPinned className="h-3 w-3 text-blue-500" /></div> <span>{pontoSelecionado.bairro ?? "Bairro não informado"}</span></div>
                  {detalheAtual?.enderecoResumo && <div className="text-slate-500 pl-7">{detalheAtual.enderecoResumo}</div>}
                  {detalheAtual?.telefone && <div className="text-slate-600 pl-7">📞 {detalheAtual.telefone}</div>}
                  {detalheAtual?.situacaoResumo && <div className="rounded-lg bg-amber-50 p-2 border border-amber-100 text-amber-800 mt-2">{detalheAtual.situacaoResumo}</div>}
                </div>
                {detalheAtual?.rotaCadastro && (
                  <Button className="w-full h-8 text-xs font-bold" onClick={() => navigate(String(detalheAtual.rotaCadastro))}>Abrir Ficha de Cadastro</Button>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* CARD DE MENSAGEM FLUTUANTE */}
        {mensagem && (
          <div className="absolute bottom-6 left-1/2 z-40 -translate-x-1/2 animate-bounce">
            <div className="rounded-full bg-slate-900 px-6 py-2 text-xs font-bold text-white shadow-2xl flex items-center gap-3">
              <span>{mensagem}</span>
              <button onClick={() => setMensagem(null)} className="text-slate-400 hover:text-white font-black text-sm">×</button>
            </div>
          </div>
        )}

        {/* LOADING INDICATOR */}
        {(isLoading || isFetching) && (
          <div className="absolute bottom-6 left-6 z-30 flex items-center gap-3 rounded-full bg-white/90 px-4 py-2 text-[10px] font-bold text-slate-500 shadow-xl border">
            <RefreshCw className="h-3 w-3 animate-spin text-blue-500" /> Atualizando mapa...
          </div>
        )}
      </section>
    </main>
  );
}

