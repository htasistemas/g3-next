export type TipoTermoFomento = "Uniao" | "Estado" | "Municipio";
export type SituacaoTermoFomento = "Ativo" | "Aditivado" | "Encerrado" | "Cancelado";

export type TermoDocumento = {
  id?: string;
  nome: string;
  dataUrl?: string;
  tipo?: string;
};

export type AditivoTermoFomento = {
  id?: string;
  tipoAditivo: string;
  dataAditivo: string;
  novaDataFim?: string;
  novoValor?: number;
  observacoes?: string;
  anexo?: TermoDocumento | null;
};

export type TermoFomentoPayload = {
  id?: string;
  numeroTermo: string;
  tipoTermo: TipoTermoFomento | string;
  referenciaTermo?: string;
  responsavelIndicacao?: string;
  orgaoConcedente?: string;
  dataAssinatura?: string;
  dataInicioVigencia?: string;
  dataFimVigencia?: string;
  situacao: SituacaoTermoFomento | string;
  descricaoObjeto?: string;
  valorGlobal?: number;
  responsavelInterno?: string;
  termoDocumento?: TermoDocumento | null;
  documentosRelacionados?: TermoDocumento[];
  aditivos?: AditivoTermoFomento[];
};

export type TermoFomento = Required<Pick<TermoFomentoPayload, "numeroTermo" | "tipoTermo" | "situacao">> &
  TermoFomentoPayload & {
    id: string;
  };
