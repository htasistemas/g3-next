export type ParceriaPublicaInput = {
  termo_fomento_id: number;
  unidade_id: number;
  nome_programa: string;
  orgao_gestor: string;
  vigencia_inicio?: string | null;
  vigencia_fim?: string | null;
  status?: string;
  objeto?: string | null;
  observacoes?: string | null;
};

export type IndicadorPublicoInput = {
  parceria_id: number;
  codigo: string;
  descricao: string;
  unidade_medida: string;
  meta_valor?: number | null;
  periodicidade?: string;
  status?: string;
};

export type EvidenciaPublicaInput = {
  indicador_id: number;
  competencia: string;
  realizado_valor?: number | null;
  caminho_arquivo?: string | null;
  mime_type?: string | null;
  observacoes?: string | null;
  status?: string;
};
