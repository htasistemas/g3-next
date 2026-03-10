export type OficioTramiteInput = {
  data?: string | null;
  origem?: string | null;
  destino?: string | null;
  responsavel?: string | null;
  acao: string;
  observacoes?: string | null;
};

export type OficioInput = {
  identificacao: {
    tipo: "emissao" | "recebimento";
    numero: string;
    data: string;
    setorOrigem: string;
    responsavel: string;
    destinatario?: string | null;
    destinatarioResponsavel?: string | null;
    destinatarioCargo?: string | null;
    meioEnvio: string;
    prazoResposta?: string | null;
    classificacao?: string | null;
  };
  conteudo: {
    razaoSocial: string;
    logoUrl?: string | null;
    titulo?: string | null;
    saudacao?: string | null;
    para?: string | null;
    cargoPara?: string | null;
    assunto: string;
    corpo: string;
    finalizacao?: string | null;
    assinaturaNome?: string | null;
    assinaturaCargo?: string | null;
    rodape?: string | null;
  };
  protocolo: {
    status: string;
    protocoloEnvio?: string | null;
    dataEnvio?: string | null;
    protocoloRecebimento?: string | null;
    dataRecebimento?: string | null;
    proximoDestino?: string | null;
    observacoes?: string | null;
  };
  tramites?: OficioTramiteInput[];
  unidadeId?: number | null;
  criadoPor?: number | null;
};

export type OficioPdfAssinadoInput = {
  nomeArquivo: string;
  tipoMime: string;
  conteudoBase64: string;
};

export type OficioImagemInput = {
  nomeArquivo: string;
  tipoMime: string;
  conteudoBase64: string;
  ordem: number;
};

export type OficioRow = {
  id: bigint;
  tipo: string;
  numero: string;
  data: Date;
  setor_origem: string;
  responsavel: string;
  destinatario: string;
  destinatario_responsavel: string;
  destinatario_cargo: string;
  meio_envio: string;
  prazo_resposta: string | null;
  classificacao: string | null;
  razao_social: string;
  logo_url: string | null;
  titulo: string | null;
  saudacao: string | null;
  para: string | null;
  cargo_para: string | null;
  assunto: string;
  corpo: string;
  finalizacao: string | null;
  assinatura_nome: string | null;
  assinatura_cargo: string | null;
  rodape: string | null;
  status: string;
  protocolo_envio: string | null;
  data_envio: Date | null;
  protocolo_recebimento: string | null;
  data_recebimento: Date | null;
  proximo_destino: string | null;
  observacoes: string | null;
  unidade_id: bigint | null;
  criado_por: bigint | null;
  criado_em: Date;
  atualizado_em: Date;
  pdf_assinado_nome: string | null;
  pdf_assinado_tipo: string | null;
  pdf_assinado_conteudo: string | null;
};

export type OficioTramiteRow = {
  id: bigint;
  oficio_id: bigint;
  data: Date | null;
  origem: string | null;
  destino: string | null;
  responsavel: string | null;
  acao: string;
  observacoes: string | null;
  criado_em: Date;
  atualizado_em: Date;
};

export type OficioImagemRow = {
  id: bigint;
  oficio_id: bigint;
  nome_arquivo: string;
  tipo_mime: string;
  conteudo_base64: string;
  ordem: number;
  criado_em: Date;
  atualizado_em: Date;
};
