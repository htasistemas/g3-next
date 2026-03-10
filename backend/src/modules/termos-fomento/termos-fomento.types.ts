export type TermoDocumentoInput = {
  id?: string;
  nome: string;
  dataUrl?: string | null;
  tipo?: "termo" | "aditivo" | "outro" | null;
};

export type TermoAditivoInput = {
  id?: string;
  tipoAditivo: string;
  dataAditivo: string;
  novaDataFim?: string | null;
  novoValor?: number | null;
  observacoes?: string | null;
  anexo?: TermoDocumentoInput | null;
};

export type TermoFomentoInput = {
  id?: string;
  numeroTermo: string;
  tipoTermo: string;
  orgaoConcedente?: string | null;
  dataAssinatura?: string | null;
  dataInicioVigencia?: string | null;
  dataFimVigencia?: string | null;
  situacao: string;
  descricaoObjeto?: string | null;
  valorGlobal?: number | null;
  responsavelInterno?: string | null;
  termoDocumento?: TermoDocumentoInput | null;
  documentosRelacionados?: TermoDocumentoInput[];
  aditivos?: TermoAditivoInput[];
};

export type TermoFomentoRow = {
  id: bigint;
  numero_termo: string;
  tipo_termo: string;
  orgao_concedente: string | null;
  data_assinatura: Date | null;
  data_inicio_vigencia: Date | null;
  data_fim_vigencia: Date | null;
  situacao: string;
  descricao_objeto: string | null;
  valor_global: number | null;
  responsavel_interno: string | null;
  criado_em: Date;
  atualizado_em: Date;
};

export type TermoAditivoRow = {
  id: bigint;
  termo_fomento_id: bigint;
  tipo_aditivo: string;
  data_aditivo: Date;
  nova_data_fim: Date | null;
  novo_valor: number | null;
  observacoes: string | null;
  criado_em: Date;
  atualizado_em: Date;
};

export type TermoDocumentoRow = {
  id: bigint;
  termo_fomento_id: bigint;
  aditivo_id: bigint | null;
  tipo_documento: string;
  nome: string;
  data_url: string | null;
  criado_em: Date;
};
