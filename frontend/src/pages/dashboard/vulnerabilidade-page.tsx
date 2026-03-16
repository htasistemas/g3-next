import "leaflet/dist/leaflet.css";
import { startTransition, useDeferredValue, useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";
import { Circle, CircleMarker, MapContainer, Popup, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import { Download, Eraser, Filter, ImageDown, LocateFixed, MapPinned, Printer, RefreshCw, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
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

function alternarValor(lista: string[], valor: string) {
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

function Observer({ onChange, onReady }: { onChange: (payload: { zoom: number; bbox: GeoBBox }) => void; onReady: () => void }) {
  const map = useMap();
  const publicar = useEffectEvent(() => {
    const bounds = map.getBounds();
    onChange({ zoom: map.getZoom(), bbox: { north: bounds.getNorth(), south: bounds.getSouth(), east: bounds.getEast(), west: bounds.getWest() } });
    onReady();
  });
  useMapEvents({ moveend: publicar, zoomend: publicar });
  useEffect(() => {
    publicar();
  }, [publicar]);
  return null;
}

function ClickCapture({ ativo, onPick }: { ativo: boolean; onPick: (payload: { latitude: number; longitude: number }) => void }) {
  useMapEvents({ click(event) { if (ativo) onPick({ latitude: Number(event.latlng.lat.toFixed(6)), longitude: Number(event.latlng.lng.toFixed(6)) }); } });
  return null;
}

function ResumoCard({ titulo, valor }: { titulo: string; valor: number }) {
  return <Card className="border-[var(--g3-border)] bg-[linear-gradient(180deg,#f6fbf7_0%,#e6f5ea_100%)] shadow-[0_18px_38px_-28px_rgba(22,101,52,0.35)]"><CardContent className="px-3 py-3"><p className="text-xs font-semibold uppercase tracking-wide text-[var(--g3-muted)]">{titulo}</p><p className="mt-1 text-2xl font-semibold text-[var(--g3-foreground)]">{valor.toLocaleString("pt-BR")}</p></CardContent></Card>;
}

function FiltroLista({ titulo, itens, selecionados, onToggle }: { titulo: string; itens: string[]; selecionados: string[]; onToggle: (valor: string) => void }) {
  if (!itens.length) return null;
  return <div><Label>{titulo}</Label><div className="mt-2 max-h-32 space-y-2 overflow-auto rounded-lg border border-[var(--g3-border)] p-2">{itens.slice(0, 24).map((item) => <label key={item} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-[var(--g3-card-soft)]"><Checkbox checked={selecionados.includes(item)} onChange={() => onToggle(item)} /><span className="text-sm">{item}</span></label>)}</div></div>;
}

export function VulnerabilidadePage() {
  const navigate = useNavigate();
  const mapRef = useRef<LeafletMap | null>(null);
  const [filtros, setFiltros] = useState<GeoFilters>(filtrosPadrao);
  const [viewportPronto, setViewportPronto] = useState(false);
  const [modoMarcacao, setModoMarcacao] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [pontoManual, setPontoManual] = useState<{ latitude: number; longitude: number } | null>(null);
  const [pontoSelecionado, setPontoSelecionado] = useState<GeoMapPoint | null>(null);
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

  async function salvarPonto() {
    if (!pontoManual) return;
    try {
      const resposta = await salvarMarcacao.mutateAsync({
        acao: formPonto.acao as "LOCALIZACAO_VINCULADA" | "PONTO_TERRITORIAL",
        categoria: formPonto.acao === "PONTO_TERRITORIAL" ? (formPonto.categoria as any) : undefined,
        titulo: formPonto.acao === "PONTO_TERRITORIAL" ? formPonto.titulo || undefined : undefined,
        descricao: formPonto.descricao || undefined,
        entidadeTipo: formPonto.acao === "LOCALIZACAO_VINCULADA" ? (formPonto.entidadeTipo as any) : undefined,
        entidadeId: formPonto.acao === "LOCALIZACAO_VINCULADA" ? formPonto.entidadeId || undefined : undefined,
        pontoDistribuicao: formPonto.categoria === "DISTRIBUICAO",
        ocorrenciaViolencia: formPonto.categoria === "VIOLENCIA",
        situacaoVulnerabilidade: formPonto.categoria === "VULNERABILIDADE",
        latitude: pontoManual.latitude,
        longitude: pontoManual.longitude
      });
      setMensagem(resposta.mensagem);
      setPontoManual(null);
      setModoMarcacao(false);
      setBuscaVinculo("");
      setFormPonto({ acao: "PONTO_TERRITORIAL", categoria: "DEMANDA", titulo: "", descricao: "", entidadeTipo: "", entidadeId: "" });
    } catch {
      setMensagem("Falha ao salvar a marcação manual.");
    }
  }

  function exportarLista() {
    if (!data) return;
    const linhas = [
      "Camada;Título;Tipo;Bairro;Cidade;Quantidade;Latitude;Longitude",
      ...data.marcadores.map((item) =>
        [rotulosCamada[item.camada], item.titulo, item.tipoLabel, item.bairro ?? "", item.cidade ?? "", item.quantidade ?? 1, item.latitude, item.longitude]
          .map((valor) => `"${String(valor).replace(/"/g, '""')}"`)
          .join(";")
      )
    ];
    baixarArquivo("georreferenciamento-lista.csv", linhas.join("\n"), "text/csv;charset=utf-8");
    setMensagem("Lista territorial exportada.");
  }

  function exportarImagem() {
    if (!data) return;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="780" viewBox="0 0 1200 780"><rect width="1200" height="780" fill="#eef7f0" /><text x="56" y="40" font-size="28" font-family="Arial" fill="#0f172a">Georreferenciamento territorial</text>${data.marcadores.map((item, indice) => `<circle cx="${80 + (indice % 20) * 52}" cy="${100 + Math.floor(indice / 20) * 38}" r="10" fill="${estilosCamada[item.camada]}" fill-opacity="0.8"><title>${item.titulo}</title></circle>`).join("")}</svg>`;
    baixarArquivo("georreferenciamento-mapa.svg", svg, "image/svg+xml;charset=utf-8");
    setMensagem("Imagem temática exportada.");
  }

  function exportarPdf() {
    if (!data) return;
    const popup = window.open("", "_blank", "noopener,noreferrer,width=1200,height=900");
    if (!popup) return;
    popup.document.write(`<html><head><meta charset="utf-8"><title>Relatório territorial</title></head><body style="font-family:Arial;padding:24px"><h1>Relatório territorial</h1><p>Total encontrado: ${data.totalEncontrado.toLocaleString("pt-BR")} | Geolocalizados: ${data.totalGeolocalizado.toLocaleString("pt-BR")}</p></body></html>`);
    popup.document.close();
    popup.print();
    setMensagem("Janela de impressão aberta para PDF.");
  }

  return (
    <main className={classesTelaPadraoBeneficiario.container}>
      <Card className={classesTelaPadraoBeneficiario.cardConteudo}>
        <CardHeader className={classesTelaPadraoBeneficiario.cabecalhoConteudo}>
          <div className={classesTelaPadraoBeneficiario.tituloAba}><MapPinned className="h-4 w-4" /><CardTitle className={classesTelaPadraoBeneficiario.tituloAbaTexto}>Georreferenciamento territorial</CardTitle></div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" className={classesTelaPadraoBeneficiario.botaoAcao} onClick={() => setModoMarcacao((atual) => !atual)}><Target className="mr-1.5 h-3.5 w-3.5" />{modoMarcacao ? "Cancelar marcação" : "Marcação manual"}</Button>
            <Button type="button" size="sm" variant="outline" className={classesTelaPadraoBeneficiario.botaoAcao} onClick={() => void geocodificarPendencias.mutateAsync(20).then((resposta) => setMensagem(`Geocodificação: ${resposta.atualizados} atualizados, ${resposta.naoEncontrados} não encontrados.`)).catch(() => setMensagem("Falha ao geocodificar os registros pendentes."))} disabled={geocodificarPendencias.isPending}><LocateFixed className={`mr-1.5 h-3.5 w-3.5 ${geocodificarPendencias.isPending ? "animate-pulse" : ""}`} />Geocodificar</Button>
            <Button type="button" size="sm" variant="outline" className={classesTelaPadraoBeneficiario.botaoAcao} onClick={exportarLista} disabled={!data}><Download className="mr-1.5 h-3.5 w-3.5" />Exportar lista</Button>
            <Button type="button" size="sm" variant="outline" className={classesTelaPadraoBeneficiario.botaoAcao} onClick={exportarImagem} disabled={!data}><ImageDown className="mr-1.5 h-3.5 w-3.5" />Exportar imagem</Button>
            <Button type="button" size="sm" variant="outline" className={classesTelaPadraoBeneficiario.botaoAcao} onClick={exportarPdf} disabled={!data}><Printer className="mr-1.5 h-3.5 w-3.5" />Exportar PDF</Button>
            <Button type="button" size="sm" variant="outline" className={classesTelaPadraoBeneficiario.botaoAcao} onClick={() => void refetch().then(() => setMensagem("Consulta territorial atualizada."))} disabled={isFetching}><RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />Atualizar</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {mensagem ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-800">{mensagem}</div> : null}
          {isError ? <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700">Falha ao carregar o georreferenciamento.</div> : null}
          <div className="grid gap-4 xl:grid-cols-[350px_minmax(0,1fr)_320px]">
            <section className="space-y-3">
              <Card className="border-[var(--g3-border)] bg-[var(--g3-card)]"><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Filter className="h-4 w-4" />Filtros territoriais</CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><div><Label>Busca</Label><Input value={filtros.termo ?? ""} onChange={(event) => setFiltros((atual) => ({ ...atual, termo: event.target.value || undefined }))} placeholder="Nome, código, bairro ou situação" /></div><div className="grid grid-cols-2 gap-3"><div><Label>Modo</Label><Select value={filtros.modo} onChange={(event) => setFiltros((atual) => ({ ...atual, modo: event.target.value as any }))}><option value="cluster">Cluster</option><option value="marcadores">Marcadores</option><option value="heatmap">Heatmap</option><option value="agregado">Agregado</option></Select></div><div><Label>Idade exata</Label><Input type="number" min={0} max={120} value={filtros.idadeExata ?? ""} onChange={(event) => setFiltros((atual) => ({ ...atual, idadeExata: event.target.value ? Number(event.target.value) : undefined }))} /></div></div><div className="space-y-2 rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card-soft)] p-3"><label className="flex items-center gap-2"><Checkbox checked={Boolean(filtros.receberCestaBasica)} onChange={(event) => setFiltros((atual) => ({ ...atual, receberCestaBasica: event.target.checked ? true : undefined }))} /><span>Recebimento de cesta básica</span></label><label className="flex items-center gap-2"><Checkbox checked={Boolean(filtros.necessidadeCesta)} onChange={(event) => setFiltros((atual) => ({ ...atual, necessidadeCesta: event.target.checked ? true : undefined }))} /><span>Necessidade de distribuição</span></label><label className="flex items-center gap-2"><Checkbox checked={Boolean(filtros.ocorrenciaViolencia)} onChange={(event) => setFiltros((atual) => ({ ...atual, ocorrenciaViolencia: event.target.checked ? true : undefined }))} /><span>Ocorrência de violência</span></label></div><FiltroLista titulo="Bairros" itens={opcoes?.bairros ?? []} selecionados={filtros.bairro} onToggle={(valor) => atualizarLista("bairro", valor)} /><FiltroLista titulo="Microterritórios" itens={opcoes?.microterritorios ?? []} selecionados={filtros.microterritorio} onToggle={(valor) => atualizarLista("microterritorio", valor)} /><FiltroLista titulo="Sexo" itens={opcoes?.sexos ?? []} selecionados={filtros.sexo} onToggle={(valor) => atualizarLista("sexo", valor)} /><FiltroLista titulo="Vulnerabilidade" itens={opcoes?.vulnerabilidades ?? []} selecionados={filtros.situacaoVulnerabilidade} onToggle={(valor) => atualizarLista("situacaoVulnerabilidade", valor)} /><FiltroLista titulo="Unidade de referência" itens={opcoes?.unidadesReferencia ?? []} selecionados={filtros.unidadeReferencia} onToggle={(valor) => atualizarLista("unidadeReferencia", valor)} /><FiltroLista titulo="Status" itens={opcoes?.statuses ?? []} selecionados={filtros.status} onToggle={(valor) => atualizarLista("status", valor)} /><div className="flex gap-2"><Button type="button" variant="outline" className="flex-1" onClick={() => startTransition(() => setFiltros((atual) => ({ ...filtrosPadrao, zoom: atual.zoom, bbox: atual.bbox })))}><Eraser className="mr-1.5 h-3.5 w-3.5" />Limpar</Button><Button type="button" variant="outline" className="flex-1" onClick={() => mapRef.current?.setView(centro, filtros.zoom)}><LocateFixed className="mr-1.5 h-3.5 w-3.5" />Centralizar</Button></div></CardContent></Card>
            </section>
            <section className="space-y-3">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4"><ResumoCard titulo="Encontrados" valor={data?.totalEncontrado ?? 0} /><ResumoCard titulo="Geolocalizados" valor={data?.totalGeolocalizado ?? 0} /><ResumoCard titulo="Violência" valor={data?.indicadores.totalOcorrenciasViolencia ?? 0} /><ResumoCard titulo="Distribuição" valor={data?.indicadores.totalPontosDistribuicao ?? 0} /></div>
              <div className="overflow-hidden rounded-2xl border border-[var(--g3-border)] bg-[var(--g3-card)]"><div className="border-b border-[var(--g3-border)] px-4 py-3"><p className="text-sm font-semibold text-[var(--g3-foreground)]">Mapa territorial</p><p className="text-xs text-[var(--g3-muted)]">{viewportPronto ? data ? `${data.totalGeolocalizado} ponto(s) no recorte visível.` : "Carregando recorte visível..." : "Preparando consulta pela área visível do mapa..."}</p></div><div className="h-[660px]"><MapContainer center={centro} zoom={filtros.zoom} className="h-full w-full" ref={mapRef}><TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" /><Observer onChange={atualizarViewport} onReady={() => setViewportPronto(true)} /><ClickCapture ativo={modoMarcacao} onPick={setPontoManual} />{data?.heatmap.map((item) => <Circle key={item.id} center={[item.latitude, item.longitude]} radius={Math.max(180, item.intensidade * 180)} pathOptions={{ color: "#dc2626", fillColor: "#f87171", fillOpacity: 0.16, weight: 1 }} />)}{data?.agregados.map((item) => <CircleMarker key={item.id} center={[item.latitude, item.longitude]} radius={Math.min(28, 10 + item.quantidade / 3)} pathOptions={{ color: estilosCamada[item.camada], fillColor: estilosCamada[item.camada], fillOpacity: 0.72, weight: 2 }} eventHandlers={{ click: () => mapRef.current?.flyTo([item.latitude, item.longitude], Math.max(filtros.zoom + 2, 13)) }}><Tooltip permanent direction="center" className="!border-0 !bg-transparent !p-0 !shadow-none"><span className="text-xs font-bold text-slate-900">{item.quantidade}</span></Tooltip></CircleMarker>)}{data?.marcadores.map((item) => <CircleMarker key={item.id} center={[item.latitude, item.longitude]} radius={item.quantidade && item.quantidade > 1 ? Math.min(22, 8 + item.quantidade / 3) : 8} pathOptions={{ color: estilosCamada[item.camada], fillColor: estilosCamada[item.camada], fillOpacity: 0.78, weight: 2 }} eventHandlers={{ click: () => ((item.quantidade ?? 1) > 1 ? mapRef.current?.flyTo([item.latitude, item.longitude], Math.max(filtros.zoom + 2, 14)) : setPontoSelecionado(item)) }}><Popup><strong>{item.titulo}</strong><div>{item.tipoLabel}</div><div>{item.bairro ?? "Sem bairro"}</div></Popup>{(item.quantidade ?? 1) > 1 ? <Tooltip permanent direction="center" className="!border-0 !bg-transparent !p-0 !shadow-none"><span className="text-xs font-bold text-slate-900">{item.quantidade}</span></Tooltip> : null}</CircleMarker>)}{pontoManual ? <CircleMarker center={[pontoManual.latitude, pontoManual.longitude]} radius={10} pathOptions={{ color: "#111827", fillColor: "#fde68a", fillOpacity: 0.95, weight: 2 }} /> : null}</MapContainer></div></div>
            </section>
            <section className="space-y-3">
              <Card className="border-[var(--g3-border)] bg-[var(--g3-card)]"><CardHeader className="pb-2"><CardTitle className="text-sm">Resumo territorial</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">{(data?.indicadores.rankingBairros.slice(0, 5) ?? []).map((item) => <div key={item.chave} className="flex items-center justify-between rounded-lg border border-[var(--g3-border)] bg-[var(--g3-card-soft)] px-3 py-2"><span>{item.rotulo}</span><Badge>{item.total}</Badge></div>)}<div className="rounded-xl border border-dashed border-[var(--g3-border)] px-3 py-3 text-xs text-[var(--g3-muted)]">{data?.diagnostico.problemasAtuais.join(" ") ?? "Carregando diagnóstico territorial..."}</div></CardContent></Card>
              {pontoSelecionado ? <Card className="border-[var(--g3-border)] bg-[var(--g3-card)]"><CardHeader className="pb-2"><CardTitle className="text-sm">Identificação do ponto</CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><div className="flex items-center justify-between gap-2"><strong>{detalheAtual?.titulo ?? pontoSelecionado.titulo}</strong><Badge variant="success">{detalheAtual?.tipoLabel ?? pontoSelecionado.tipoLabel}</Badge></div><p>{detalheAtual?.bairro ?? "Sem bairro"}{detalheAtual?.cidade ? `, ${detalheAtual.cidade}` : ""}</p>{detalheAtual?.enderecoResumo ? <p>{detalheAtual.enderecoResumo}</p> : null}{detalheAtual?.telefone ? <p>Telefone: {detalheAtual.telefone}</p> : null}{detalheAtual?.situacaoResumo ? <p>Situação: {detalheAtual.situacaoResumo}</p> : null}{detalheAtual?.programaServico ? <p>Programa: {detalheAtual.programaServico}</p> : null}{detalheAtual?.rotaCadastro ? <Button type="button" variant="outline" className="w-full" onClick={() => navigate(String(detalheAtual.rotaCadastro))}>Abrir cadastro</Button> : null}</CardContent></Card> : null}
              {pontoManual ? <Card className="border-amber-200 bg-amber-50"><CardHeader className="pb-2"><CardTitle className="text-sm">Marcação manual</CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><p className="text-[var(--g3-muted)]">Latitude {pontoManual.latitude} | Longitude {pontoManual.longitude}</p><div><Label>Ação</Label><Select value={formPonto.acao} onChange={(event) => setFormPonto((atual) => ({ ...atual, acao: event.target.value }))}><option value="PONTO_TERRITORIAL">Ponto territorial</option><option value="LOCALIZACAO_VINCULADA">Vincular cadastro</option></Select></div>{formPonto.acao === "PONTO_TERRITORIAL" ? <><div><Label>Categoria</Label><Select value={formPonto.categoria} onChange={(event) => setFormPonto((atual) => ({ ...atual, categoria: event.target.value }))}><option value="DEMANDA">Demanda</option><option value="DISTRIBUICAO">Distribuição</option><option value="VULNERABILIDADE">Vulnerabilidade</option><option value="VIOLENCIA">Violência</option><option value="OUTRO">Outro</option></Select></div><div><Label>Título</Label><Input value={formPonto.titulo} onChange={(event) => setFormPonto((atual) => ({ ...atual, titulo: event.target.value }))} /></div></> : <><div><Label>Buscar vínculo</Label><Input value={buscaVinculo} onChange={(event) => setBuscaVinculo(event.target.value)} placeholder="Digite nome ou código" /></div><div className="max-h-36 space-y-2 overflow-auto">{(vinculos.data ?? []).map((item) => <button key={`${item.entidadeTipo}-${item.id}`} type="button" className="w-full rounded-lg border border-[var(--g3-border)] bg-white px-3 py-2 text-left" onClick={() => setFormPonto((atual) => ({ ...atual, entidadeTipo: item.entidadeTipo, entidadeId: item.id, titulo: item.titulo }))}><strong>{item.titulo}</strong><span className="block text-xs text-[var(--g3-muted)]">{item.subtitulo ?? item.entidadeTipo}</span></button>)}</div></>}<div><Label>Descrição</Label><Input value={formPonto.descricao} onChange={(event) => setFormPonto((atual) => ({ ...atual, descricao: event.target.value }))} /></div><div className="flex gap-2"><Button type="button" className="flex-1" onClick={() => void salvarPonto()} disabled={salvarMarcacao.isPending}>Salvar</Button><Button type="button" variant="outline" className="flex-1" onClick={() => setPontoManual(null)}>Fechar</Button></div></CardContent></Card> : null}
            </section>
          </div>
          {isLoading || !viewportPronto ? <div className="rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card-soft)] px-3 py-4 text-sm text-[var(--g3-muted)]">{viewportPronto ? "Carregando dados territoriais..." : "Preparando a consulta pela área visível do mapa..."}</div> : null}
        </CardContent>
      </Card>
    </main>
  );
}
