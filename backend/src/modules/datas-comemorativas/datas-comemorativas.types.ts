export const tipoEventoValues = [
  "comemorativa",
  "feriado_nacional",
  "feriado_estadual",
  "feriado_municipal",
  "institucional",
  "personalizado"
] as const;

export const abrangenciaEventoValues = ["nacional", "estadual", "municipal", "interna"] as const;

export const syncTipoValues = ["feriados", "datas_comemorativas", "geral"] as const;

export const syncStatusValues = ["sucesso", "parcial", "erro"] as const;

export const frequenciaSyncValues = ["diaria", "semanal", "mensal", "manual"] as const;

export type TipoEvento = (typeof tipoEventoValues)[number];
export type AbrangenciaEvento = (typeof abrangenciaEventoValues)[number];
export type SyncTipo = (typeof syncTipoValues)[number];
export type SyncStatus = (typeof syncStatusValues)[number];
export type FrequenciaSync = (typeof frequenciaSyncValues)[number];

export type DataComemorativaInput = {
  titulo: string;
  descricao?: string | null;
  dia?: number | null;
  mes?: number | null;
  ano?: number | null;
  dataEvento?: string | null;
  tipoEvento: TipoEvento;
  abrangencia: AbrangenciaEvento;
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

export type DataComemorativaFilters = {
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

export type DataComemorativaContexto = {
  uf?: string;
  municipio?: string;
};

export type DataComemorativaConfig = {
  popupHabilitado: boolean;
  popupUmaVezPorDia: boolean;
  popupMostrarFeriados: boolean;
  popupMostrarComemorativas: boolean;
  popupMostrarEventosInternos: boolean;
  popupLimiteItens: number;
  popupOrdenarPorPrioridade: boolean;
  sincronizacaoAutomatica: boolean;
  frequenciaSincronizacao: FrequenciaSync;
  providerFeriadoPrincipal: string;
  providerFeriadoFallback: string;
  cacheDias: number;
  ativo: boolean;
};

export type DataComemorativaConfigInput = Partial<DataComemorativaConfig>;

export type DataComemorativaRow = {
  id: bigint;
  titulo: string;
  descricao: string | null;
  dia: number;
  mes: number;
  ano: number | null;
  data_evento: Date | null;
  tipo_evento: TipoEvento;
  abrangencia: AbrangenciaEvento;
  uf: string | null;
  municipio: string | null;
  recorrente_anual: boolean;
  fonte_origem: string | null;
  origem_referencia: string | null;
  cor_exibicao: string | null;
  icone: string | null;
  prioridade_popup: number | null;
  exibir_no_popup: boolean;
  ativo: boolean;
  excluido_logico: boolean;
  criado_por: bigint | null;
  atualizado_por: bigint | null;
  criado_em: Date;
  atualizado_em: Date;
};

export type DataComemorativaSyncLogRow = {
  id: bigint;
  provider_nome: string;
  tipo_sync: SyncTipo;
  parametros_execucao: unknown;
  quantidade_lidos: number | bigint | null;
  quantidade_inseridos: number | bigint | null;
  quantidade_atualizados: number | bigint | null;
  quantidade_ignorados: number | bigint | null;
  quantidade_erros: number | bigint | null;
  status_execucao: SyncStatus;
  detalhes_erro: string | null;
  iniciado_em: Date;
  finalizado_em: Date | null;
  executado_por: bigint | null;
};

export type DataComemorativaPopupLogRow = {
  id: bigint;
  usuario_id: bigint | null;
  data_referencia: Date;
  evento_id: bigint | null;
  exibido_em: Date;
  dispensado: boolean;
  acao_usuario: string | null;
  criado_em: Date;
};

export type DataComemorativaAuditoriaRow = {
  id: bigint;
  evento_id: bigint | null;
  acao: string;
  detalhes_json: unknown;
  usuario_id: bigint | null;
  criado_em: Date;
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

export type DataComemorativaSyncStartInput = {
  providerNome: string;
  tipoSync: SyncTipo;
  parametrosExecucao?: Record<string, unknown> | null;
  executadoPor?: bigint | null;
};

export type DataComemorativaSyncFinishInput = {
  logId: bigint;
  quantidadeLidos: number;
  quantidadeInseridos: number;
  quantidadeAtualizados: number;
  quantidadeIgnorados: number;
  quantidadeErros: number;
  statusExecucao: SyncStatus;
  detalhesErro?: string | null;
};

export type DataComemorativaImportItem = DataComemorativaInput & {
  providerNome?: string;
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
    tipoEvento: TipoEvento;
    abrangencia: AbrangenciaEvento;
    uf?: string;
    municipio?: string;
    corExibicao?: string;
    icone?: string;
    origem: string;
    prioridadePopup: number;
    destaqueFeriado: boolean;
  }>;
};

