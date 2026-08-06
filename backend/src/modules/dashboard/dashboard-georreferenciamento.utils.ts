import type {
  GeoAgeGroup,
  GeoAggregatePoint,
  GeoBBox,
  GeoHeatPoint,
  GeoLayer,
  GeoMapPoint,
  GeoPointRecord,
  GeoSummaryBucket,
  GeoViewMode
} from "./dashboard-georreferenciamento.types.js";

function arredondarCoordenada(valor: number, casas = 6) {
  const fator = 10 ** casas;
  return Math.round(valor * fator) / fator;
}

export function calcularIdade(data?: string | null): number | undefined {
  if (!data) return undefined;
  const referencia = new Date(`${data.slice(0, 10)}T00:00:00.000Z`);
  if (Number.isNaN(referencia.getTime())) return undefined;

  const hoje = new Date();
  let idade = hoje.getUTCFullYear() - referencia.getUTCFullYear();
  const mesAtual = hoje.getUTCMonth();
  const diaAtual = hoje.getUTCDate();

  if (
    mesAtual < referencia.getUTCMonth() ||
    (mesAtual === referencia.getUTCMonth() && diaAtual < referencia.getUTCDate())
  ) {
    idade -= 1;
  }

  return idade >= 0 ? idade : undefined;
}

export function resolverFaixaEtaria(idade?: number): GeoAgeGroup | undefined {
  if (idade === undefined) return undefined;
  if (idade <= 11) return "crianca";
  if (idade <= 17) return "adolescente";
  if (idade <= 24) return "jovem";
  if (idade <= 59) return "adulto";
  return "idoso";
}

export function resolverEstrategiaConsulta(modo: GeoViewMode, zoom: number) {
  void zoom;
  if (modo === "agregado") {
    return "agregada" as const;
  }

  return "individual" as const;
}

export function aplicarBBox<T extends { latitude: number; longitude: number }>(
  itens: T[],
  bbox?: GeoBBox
) {
  if (!bbox) return itens;

  return itens.filter(
    (item) =>
      item.latitude <= bbox.north &&
      item.latitude >= bbox.south &&
      item.longitude <= bbox.east &&
      item.longitude >= bbox.west
  );
}

export function agruparPorBairro(pontos: GeoPointRecord[]): GeoAggregatePoint[] {
  const grupos = new Map<string, GeoAggregatePoint>();

  for (const ponto of pontos) {
    const bairro = ponto.bairro?.trim() || "Sem bairro";
    const chave = `${ponto.camada}:${bairro}:${ponto.regiao ?? ""}`;
    const existente = grupos.get(chave);

    if (existente) {
      existente.quantidade += 1;
      existente.latitude = arredondarCoordenada(
        existente.latitude + (ponto.latitude - existente.latitude) / existente.quantidade
      );
      existente.longitude = arredondarCoordenada(
        existente.longitude + (ponto.longitude - existente.longitude) / existente.quantidade
      );
      const tipoAtual = existente.tipos.find((item) => item.tipo === ponto.camada);
      if (tipoAtual) {
        tipoAtual.total += 1;
      } else {
        existente.tipos.push({ tipo: ponto.camada, total: 1 });
      }
      continue;
    }

    grupos.set(chave, {
      id: chave,
      camada: ponto.camada,
      bairro,
      regiao: ponto.regiao,
      latitude: arredondarCoordenada(ponto.latitude),
      longitude: arredondarCoordenada(ponto.longitude),
      quantidade: 1,
      tipos: [{ tipo: ponto.camada, total: 1 }]
    });
  }

  return [...grupos.values()].sort((a, b) => b.quantidade - a.quantidade);
}

export function gerarHeatmap(pontos: GeoPointRecord[], zoom: number): GeoHeatPoint[] {
  const precisao = zoom >= 15 ? 3 : zoom >= 13 ? 2 : 1;
  const grupos = new Map<string, GeoHeatPoint>();

  for (const ponto of pontos) {
    const lat = arredondarCoordenada(ponto.latitude, precisao);
    const lng = arredondarCoordenada(ponto.longitude, precisao);
    const chave = `${lat}:${lng}`;
    const existente = grupos.get(chave);

    if (existente) {
      existente.quantidade += 1;
      existente.intensidade += 1;
      continue;
    }

    grupos.set(chave, {
      id: chave,
      latitude: lat,
      longitude: lng,
      intensidade: 1,
      quantidade: 1,
      bairro: ponto.bairro
    });
  }

  return [...grupos.values()].sort((a, b) => b.intensidade - a.intensidade);
}

export function clusterizarMarcadores(pontos: GeoPointRecord[], zoom: number): GeoMapPoint[] {
  const precisao = zoom >= 17 ? 4 : zoom >= 15 ? 3 : zoom >= 13 ? 2 : 1;
  const grupos = new Map<
    string,
    {
      quantidade: number;
      latitude: number;
      longitude: number;
      pontoBase: GeoPointRecord;
    }
  >();

  for (const ponto of pontos) {
    const lat = arredondarCoordenada(ponto.latitude, precisao);
    const lng = arredondarCoordenada(ponto.longitude, precisao);
    const chave = `${ponto.camada}:${lat}:${lng}`;
    const existente = grupos.get(chave);

    if (existente) {
      existente.quantidade += 1;
      existente.latitude = arredondarCoordenada(
        existente.latitude + (ponto.latitude - existente.latitude) / existente.quantidade,
        6
      );
      existente.longitude = arredondarCoordenada(
        existente.longitude + (ponto.longitude - existente.longitude) / existente.quantidade,
        6
      );
      continue;
    }

    grupos.set(chave, {
      quantidade: 1,
      latitude: ponto.latitude,
      longitude: ponto.longitude,
      pontoBase: ponto
    });
  }

  return [...grupos.values()]
    .sort((a, b) => b.quantidade - a.quantidade)
    .map((grupo) => ({
      ...grupo.pontoBase,
      latitude: arredondarCoordenada(grupo.latitude, 6),
      longitude: arredondarCoordenada(grupo.longitude, 6),
      quantidade: grupo.quantidade,
      titulo:
        grupo.quantidade > 1
          ? `${grupo.quantidade.toLocaleString("pt-BR")} registros`
          : grupo.pontoBase.titulo,
      subtitulo:
        grupo.quantidade > 1
          ? `${grupo.pontoBase.tipoLabel} agrupados nesta área`
          : grupo.pontoBase.subtitulo
    }));
}

function contabilizarBuckets(valores: Array<string | undefined>, fallback: string) {
  const mapa = new Map<string, number>();
  for (const valor of valores) {
    const chave = valor?.trim() || fallback;
    mapa.set(chave, (mapa.get(chave) ?? 0) + 1);
  }
  return [...mapa.entries()]
    .map(([rotulo, total]) => ({ chave: rotulo, rotulo, total }))
    .sort((a, b) => b.total - a.total || a.rotulo.localeCompare(b.rotulo, "pt-BR"));
}

export function resumirIndicadores(pontos: GeoPointRecord[]) {
  const totalPorTipo = contabilizarBuckets(pontos.map((item) => item.camada), "Sem tipo");
  const totalPorBairro = contabilizarBuckets(pontos.map((item) => item.bairro), "Sem bairro");
  const totalPorSexo = contabilizarBuckets(pontos.map((item) => item.sexo), "Não informado");
  const totalPorFaixaEtaria = contabilizarBuckets(
    pontos.map((item) => item.faixaEtaria),
    "Não informada"
  );

  return {
    totalPorTipo,
    totalPorBairro,
    totalPorSexo,
    totalPorFaixaEtaria,
    rankingBairros: totalPorBairro.slice(0, 10),
    totalOcorrenciasViolencia: pontos.filter((item) => item.ocorrenciaViolencia).length,
    totalPontosDistribuicao: pontos.filter((item) => item.camada === "pontos_distribuicao").length
  };
}

export function montarResumoCamadas(
  camadas: GeoLayer[],
  pontosPorCamada: Record<string, GeoPointRecord[]>
) {
  return camadas.map((camada) => {
    const pontos = pontosPorCamada[camada] ?? [];
    return {
      camada,
      total: pontos.length,
      geolocalizados: pontos.length,
      visiveis: pontos.length
    };
  });
}

export function limitarMarcadores(pontos: GeoPointRecord[], limite = 500): {
  limiteAtingido: boolean;
  marcadores: GeoMapPoint[];
} {
  const marcadores = pontos
    .slice(0, limite)
    .map((item) => ({ ...item, quantidade: 1 }));

  return {
    limiteAtingido: pontos.length > limite,
    marcadores
  };
}

export function criarBucketSummary(
  buckets: Array<{ rotulo: string; total: number }>
): GeoSummaryBucket[] {
  return buckets.map((item) => ({
    chave: item.rotulo,
    rotulo: item.rotulo,
    total: item.total
  }));
}
