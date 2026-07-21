export type EvidenciaPublica = {
  id: string;
  indicador_id: string;
  competencia: string;
  realizado_valor: number | null;
  caminho_arquivo: string | null;
  mime_type: string | null;
  observacoes: string | null;
  status: string;
};

export type IndicadorPublico = {
  id: string;
  parceria_id: string;
  codigo: string;
  descricao: string;
  unidade_medida: string;
  meta_valor: number | null;
  periodicidade: string;
  status: string;
  evidencias: EvidenciaPublica[];
};

export type ParceriaPublica = {
  id: string;
  termo_fomento_id: string;
  unidade_id: string;
  numero_termo: string;
  unidade_nome: string;
  nome_programa: string;
  orgao_gestor: string;
  vigencia_inicio: string | null;
  vigencia_fim: string | null;
  status: string;
  objeto: string | null;
  indicadores: IndicadorPublico[];
};
