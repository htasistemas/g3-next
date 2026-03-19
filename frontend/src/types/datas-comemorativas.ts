export type TipoEventoDataComemorativa =
  | "comemorativa"
  | "feriado_nacional"
  | "feriado_estadual"
  | "feriado_municipal"
  | "institucional"
  | "personalizado";

export type AbrangenciaDataComemorativa =
  | "nacional"
  | "estadual"
  | "municipal"
  | "interna";

export type FrequenciaSyncDataComemorativa =
  | "diaria"
  | "semanal"
  | "mensal"
  | "manual";

export type DataComemorativaEvento = {
  id: string;
  titulo: string;
  descricao?: string;
  dia: number;
  mes: number;
  ano?: number;
  dataEvento?: string;
  dataVisual: string;
  tipoEvento: TipoEventoDataComemorativa;
  abrangencia: AbrangenciaDataComemorativa;
  uf?: string;
  municipio?: string;
  recorrenteAnual: boolean;
  fonteOrigem?: string;
  origemReferencia?: string;
  corExibicao?: string;
  icone?: string;
  prioridadePopup: number;
  exibirNoPopup: boolean;
  ativo: boolean;
  excluidoLogico?: boolean;
  criadoPor?: string;
  atualizadoPor?: string;
  criadoEm?: string;
  atualizadoEm?: string;
};

export type DataComemorativaPayload = {
  titulo: string;
  descricao?: string | null;
  dia?: number | null;
  mes?: number | null;
  ano?: number | null;
  dataEvento?: string | null;
  tipoEvento: TipoEventoDataComemorativa;
  abrangencia: AbrangenciaDataComemorativa;
  uf?: string | null;
  municipio?: string | null;
  recorrenteAnual?: boolean;
  fonteOrigem?: string | null;
  origemReferencia?: string | null;
  corExibicao?: string | null;
  icone?: string | null;
  prioridadePopup?: number | null;
  exibirNoPopup?: boolean;
  ativo?: boolean;
};

export type DataComemorativaListaResponse = {
  pagina: number;
  limite: number;
  total: number;
  eventos: DataComemorativaEvento[];
};

export type DataComemorativaCalendarioDia = {
  vazio: boolean;
  dia?: number;
  data?: string;
  eventos?: DataComemorativaEvento[];
};

export type DataComemorativaCalendarioResponse = {
  ano: number;
  mes: number;
  mesLabel: string;
  semanaLabels: string[];
  legenda: Array<{
    tipo: string;
    label: string;
    cor: string;
  }>;
  weeks: DataComemorativaCalendarioDia[][];
};

export type DataComemorativaConfiguracoes = {
  popupHabilitado: boolean;
  popupUmaVezPorDia: boolean;
  popupMostrarFeriados: boolean;
  popupMostrarComemorativas: boolean;
  popupMostrarEventosInternos: boolean;
  popupLimiteItens: number;
  popupOrdenarPorPrioridade: boolean;
  sincronizacaoAutomatica: boolean;
  frequenciaSincronizacao: FrequenciaSyncDataComemorativa;
  providerFeriadoPrincipal: string;
  providerFeriadoFallback: string;
  cacheDias: number;
  ativo: boolean;
};

export type DataComemorativaSyncLog = {
  id: string;
  providerNome: string;
  tipoSync: string;
  parametrosExecucao?: unknown;
  quantidadeLidos: number;
  quantidadeInseridos: number;
  quantidadeAtualizados: number;
  quantidadeIgnorados: number;
  quantidadeErros: number;
  statusExecucao: string;
  detalhesErro?: string;
  iniciadoEm: string;
  finalizadoEm?: string;
};

export type DataComemorativaLogItem = {
  id: string;
  origem: "auditoria" | "sincronizacao" | "popup";
  titulo: string;
  descricao: string;
  usuarioId?: string;
  criadoEm: string;
  status?: string;
};

export type DataComemorativaPopupPayload = {
  exibirPopup: boolean;
  dataReferencia: string;
  titulo: string;
  subtitulo: string;
  limiteItens: number;
  eventos: Array<{
    id: string;
    dataEvento: string;
    titulo: string;
    descricao?: string;
    tipoEvento: TipoEventoDataComemorativa;
    abrangencia: AbrangenciaDataComemorativa;
    uf?: string;
    municipio?: string;
    corExibicao?: string;
    icone?: string;
    origem: string;
    prioridadePopup: number;
    destaqueFeriado: boolean;
  }>;
};

export type DataComemorativaFiltros = {
  termo?: string;
  tipoEvento?: string;
  abrangencia?: string;
  uf?: string;
  municipio?: string;
  ativo?: string;
  exibirNoPopup?: string;
  origem?: string;
  ano?: string;
  mes?: string;
  pagina?: string;
  limite?: string;
  ordenarPor?: string;
  ordem?: string;
};

export type DataComemorativaImportPayload = {
  formato: "seed" | "json" | "csv" | "provider";
  conteudo?: string;
  provider?: string;
  ano?: number;
  mes?: number;
};
