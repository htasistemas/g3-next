export type OficioTramite = {
  id?: string;
  data?: string;
  origem?: string;
  destino?: string;
  responsavel?: string;
  acao: string;
  observacoes?: string;
};

export type OficioPayload = {
  id?: string;
  pdfAssinadoNome?: string;
  pdfAssinadoUrl?: string;
  identificacao: {
    tipo: "emissao" | "recebimento";
    numero: string;
    data: string;
    setorOrigem: string;
    responsavel: string;
    destinatario?: string;
    destinatarioResponsavel?: string;
    destinatarioCargo?: string;
    meioEnvio: string;
    prazoResposta?: string;
    classificacao?: string;
  };
  conteudo: {
    razaoSocial: string;
    logoUrl?: string;
    titulo?: string;
    saudacao?: string;
    para?: string;
    cargoPara?: string;
    assunto: string;
    corpo: string;
    finalizacao?: string;
    assinaturaNome?: string;
    assinaturaCargo?: string;
    rodape?: string;
  };
  protocolo: {
    status: string;
    protocoloEnvio?: string;
    dataEnvio?: string;
    protocoloRecebimento?: string;
    dataRecebimento?: string;
    proximoDestino?: string;
    observacoes?: string;
  };
  tramites: OficioTramite[];
  unidadeId?: number | null;
  criadoPor?: number | null;
};

export type OficioPdfAssinadoPayload = {
  nomeArquivo: string;
  tipoMime: string;
  conteudoBase64: string;
};

export type OficioImagemPayload = {
  id?: string;
  oficioId?: string;
  nomeArquivo: string;
  tipoMime: string;
  conteudoBase64: string;
  ordem: number;
};
