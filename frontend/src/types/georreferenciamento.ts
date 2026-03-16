export type GeoLayer =
  | "beneficiarios"
  | "familias"
  | "voluntarios"
  | "profissionais"
  | "instituicoes"
  | "doadores"
  | "pontos_distribuicao"
  | "demandas_territoriais"
  | "vulnerabilidade"
  | "violencia";

export type GeoViewMode = "marcadores" | "cluster" | "heatmap" | "agregado";

export type GeoAgeGroup = "crianca" | "adolescente" | "jovem" | "adulto" | "idoso";

export type GeoEntityType =
  | "BENEFICIARIO"
  | "FAMILIA"
  | "VOLUNTARIO"
  | "PROFISSIONAL"
  | "INSTITUICAO"
  | "DOADOR"
  | "DISTRIBUICAO"
  | "PONTO_MANUAL"
  | "OCORRENCIA_VIOLENCIA";

export type GeoBBox = {
  north: number;
  south: number;
  east: number;
  west: number;
};

export type GeoFilters = {
  camadas: GeoLayer[];
  modo: GeoViewMode;
  zoom: number;
  bbox?: GeoBBox;
  bairro: string[];
  microterritorio: string[];
  idadeExata?: number;
  faixaEtaria: GeoAgeGroup[];
  sexo: string[];
  situacaoVulnerabilidade: string[];
  status: string[];
  projetoServico?: string;
  unidadeReferencia: string[];
  periodoTipo: "cadastro" | "atendimento";
  periodoInicio?: string;
  periodoFim?: string;
  receberCestaBasica?: boolean;
  necessidadeCesta?: boolean;
  ocorrenciaViolencia?: boolean;
  termo?: string;
};

export type GeoMapPoint = {
  id: string;
  camada: GeoLayer;
  entidadeTipo: GeoEntityType;
  titulo: string;
  codigo?: string;
  subtitulo?: string;
  tipoLabel: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  regiao?: string;
  enderecoResumo?: string;
  telefone?: string;
  situacaoResumo?: string;
  programaServico?: string;
  unidadeReferencia?: string;
  status?: string;
  sexo?: string;
  idade?: number;
  faixaEtaria?: GeoAgeGroup;
  dataCadastro?: string;
  dataAtendimento?: string;
  dataReferencia?: string;
  receberCestaBasica?: boolean;
  necessidadeCesta?: boolean;
  ocorrenciaViolencia?: boolean;
  latitude: number;
  longitude: number;
  quantidade?: number;
};

export type GeoAggregatePoint = {
  id: string;
  camada: GeoLayer;
  bairro: string;
  regiao?: string;
  latitude: number;
  longitude: number;
  quantidade: number;
  tipos: Array<{ tipo: GeoLayer; total: number }>;
};

export type GeoHeatPoint = {
  id: string;
  latitude: number;
  longitude: number;
  intensidade: number;
  quantidade: number;
  bairro?: string;
};

export type GeoSummaryBucket = {
  chave: string;
  rotulo: string;
  total: number;
};

export type GeoLayerSummary = {
  camada: GeoLayer;
  total: number;
  geolocalizados: number;
  visiveis: number;
};

export type GeoQueryResponse = {
  estrategia: "individual" | "agregada";
  modo: GeoViewMode;
  bboxAplicada?: GeoBBox;
  totalEncontrado: number;
  totalGeolocalizado: number;
  limiteIndividualAtingido: boolean;
  unidadePrincipal: {
    id: string;
    nome: string;
    latitude?: number;
    longitude?: number;
    cidade?: string;
    uf?: string;
  } | null;
  diagnostico: {
    beneficiariosTotal: number;
    beneficiariosGeolocalizados: number;
    familiasTotal: number;
    familiasComReferenciaGeolocalizada: number;
    familiasComEnderecoProprio: number;
    voluntariosTotal: number;
    voluntariosGeolocalizados: number;
    profissionaisTotal: number;
    profissionaisGeolocalizados: number;
    instituicoesTotal: number;
    instituicoesGeolocalizadas: number;
    doadoresTotal: number;
    doadoresGeolocalizados: number;
    problemasAtuais: string[];
  };
  camadasResumo: GeoLayerSummary[];
  marcadores: GeoMapPoint[];
  agregados: GeoAggregatePoint[];
  heatmap: GeoHeatPoint[];
  indicadores: {
    totalPorTipo: GeoSummaryBucket[];
    totalPorBairro: GeoSummaryBucket[];
    totalPorSexo: GeoSummaryBucket[];
    totalPorFaixaEtaria: GeoSummaryBucket[];
    rankingBairros: GeoSummaryBucket[];
    totalOcorrenciasViolencia: number;
    totalPontosDistribuicao: number;
  };
};

export type GeoFilterOptionsResponse = {
  bairros: string[];
  microterritorios: string[];
  sexos: string[];
  vulnerabilidades: string[];
  unidadesReferencia: string[];
  statuses: string[];
  camadas: Array<{
    id: GeoLayer;
    label: string;
    descricao: string;
  }>;
  diagnostico: GeoQueryResponse["diagnostico"];
};

export type GeoDetailResponse = {
  id: string;
  camada: GeoLayer;
  entidadeTipo: GeoEntityType;
  titulo: string;
  codigo?: string;
  tipoLabel: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  regiao?: string;
  enderecoResumo?: string;
  telefone?: string;
  situacaoResumo?: string;
  programaServico?: string;
  unidadeReferencia?: string;
  historicoResumo?: string;
  status?: string;
  dataReferencia?: string;
  latitude?: number;
  longitude?: number;
  rotaCadastro?: string;
};

export type GeoLinkSearchItem = {
  entidadeTipo: GeoEntityType;
  id: string;
  titulo: string;
  subtitulo?: string;
};

export type GeoManualPointInput = {
  acao: "LOCALIZACAO_VINCULADA" | "PONTO_TERRITORIAL";
  entidadeTipo?: GeoEntityType;
  entidadeId?: string;
  categoria?: "DISTRIBUICAO" | "DEMANDA" | "VULNERABILIDADE" | "VIOLENCIA" | "OUTRO";
  titulo?: string;
  descricao?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  regiao?: string;
  logradouro?: string;
  numero?: string;
  telefone?: string;
  situacaoResumo?: string;
  programaServico?: string;
  unidadeReferencia?: string;
  status?: string;
  ocorrenciaViolencia?: boolean;
  situacaoVulnerabilidade?: boolean;
  necessidadeCesta?: boolean;
  pontoDistribuicao?: boolean;
  latitude: number;
  longitude: number;
};

export type GeoManualPointResponse = {
  id: string;
  mensagem: string;
};

export type GeoPendingGeocodingResponse = {
  processados: number;
  atualizados: number;
  naoEncontrados: number;
  falhas: number;
  restanteEstimado: number;
  detalhesPorTipo: Array<{
    tipo: string;
    processados: number;
    atualizados: number;
    naoEncontrados: number;
  }>;
};
