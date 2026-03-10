export type MensagemDestinatarioTipo =
  | "COLABORADOR"
  | "PROFISSIONAL"
  | "VOLUNTARIO"
  | "DOADOR"
  | "INSTITUICAO"
  | "BENEFICIARIO";

export type MensagemCanalPermitido = "WHATSAPP" | "EMAIL" | "AMBOS";
export type MensagemCanalEnvio = "WHATSAPP" | "EMAIL";
export type MensagemStatus = "ATIVA" | "INATIVA";
export type MensagemTaxonomiaTipo = "CATEGORIA" | "ASSUNTO" | "TIPO_COMUNICACAO" | "TAG";

export type MensagemPlaceholder = {
  chave: string;
  rotulo: string;
  descricao: string;
  exemplo: string;
};

export type MensagemSuporte = {
  placeholders: MensagemPlaceholder[];
  canais: Array<{ id: MensagemCanalPermitido; label: string }>;
  canaisEnvio: Array<{ id: MensagemCanalEnvio; label: string }>;
  destinatarios: Array<{ id: MensagemDestinatarioTipo; label: string }>;
  integracoes: {
    emailHabilitado: boolean;
    whatsappProviderHabilitado: boolean;
    whatsappModo: string;
  };
};

export type MensagemTaxonomia = {
  id: string;
  tipo: MensagemTaxonomiaTipo;
  nome: string;
  descricao?: string;
  status: MensagemStatus;
  ordem: number;
  criado_em: string;
  atualizado_em: string;
};

export type MensagemModelo = {
  id: string;
  titulo: string;
  assunto?: string;
  categoriaId?: string;
  categoria?: string;
  assuntoId?: string;
  assuntoNome?: string;
  tipoComunicacaoId?: string;
  tipoComunicacao?: string;
  tiposDestinatario: MensagemDestinatarioTipo[];
  canalPermitido: MensagemCanalPermitido;
  canaisPermitidos: MensagemCanalEnvio[];
  mensagemBase: string;
  variaveisPermitidas: string[];
  tags: string[];
  status: MensagemStatus;
  observacoesInternas?: string;
  origem: string;
  mensagemPadraoSistema: boolean;
  mensagemPersonalizadaUsuario: boolean;
  mensagemSugeridaIa: boolean;
  chaveSistema?: string;
  criadoPor?: string;
  atualizadoPor?: string;
  criado_em: string;
  atualizado_em: string;
};

export type MensagemModeloForm = {
  titulo: string;
  assunto?: string;
  categoriaId?: string;
  assuntoId?: string;
  tipoComunicacaoId?: string;
  tags: string[];
  tiposDestinatario: MensagemDestinatarioTipo[];
  canalPermitido: MensagemCanalPermitido;
  mensagemBase: string;
  variaveisPermitidas: string[];
  status: MensagemStatus;
  observacoesInternas?: string;
  mensagemPadraoSistema: boolean;
  mensagemPersonalizadaUsuario: boolean;
  mensagemSugeridaIa: boolean;
};

export type MensagemModeloFiltros = {
  busca?: string;
  status?: MensagemStatus;
  destinatario?: MensagemDestinatarioTipo;
  canal?: MensagemCanalEnvio;
  categoriaId?: string;
  somenteIa?: boolean;
  somenteAtivas?: boolean;
};

export type MensagemDestinatario = {
  tipo: MensagemDestinatarioTipo;
  id: string;
  nome: string;
  documento?: string;
  email?: string;
  telefone?: string;
  detalhe?: string;
};

export type MensagemPreview = {
  modelo: MensagemModelo;
  destinatario: {
    tipo: MensagemDestinatarioTipo;
    id: string;
    nome: string;
    primeiroNome: string;
    documento?: string;
    email?: string;
    telefone?: string;
    instituicao?: string;
    setor?: string;
    cargo?: string;
    dataRegistro?: string;
    observacao?: string;
  };
  canal: MensagemCanalEnvio;
  variaveisResolvidas: Record<string, string>;
  whatsapp: {
    titulo: string;
    corpo: string;
    textoCompleto: string;
  };
  email: {
    assunto: string;
    saudacao: string;
    corpo: string;
    assinatura: string;
    textoCompleto: string;
  };
};

export type MensagemHistorico = {
  id: string;
  modeloId?: string;
  nomeMensagem: string;
  canal: MensagemCanalEnvio;
  destinatarioTipo: MensagemDestinatarioTipo;
  destinatarioId?: string;
  destinatarioNome?: string;
  destinatarioContato?: string;
  usuarioId?: string;
  usuarioNome?: string;
  tipoEnvio: "INDIVIDUAL" | "LOTE";
  status: "ENVIADO" | "PREPARADO" | "ERRO";
  assuntoFinal?: string;
  mensagemFinal?: string;
  erroObservacao?: string;
  urlWhatsapp?: string;
  filtrosJson?: Record<string, unknown>;
  detalhesJson?: Record<string, unknown>;
  criado_em: string;
};

export type MensagemHistoricoFiltros = {
  busca?: string;
  canal?: MensagemCanalEnvio;
  destinatarioTipo?: MensagemDestinatarioTipo;
  usuario?: string;
  status?: "ENVIADO" | "PREPARADO" | "ERRO";
  dataInicio?: string;
  dataFim?: string;
};

export type MensagemEnvioPayload = {
  modeloId?: string;
  canal: MensagemCanalEnvio;
  destinatarioTipo: MensagemDestinatarioTipo;
  destinatarioIds: string[];
  tipoEnvio: "INDIVIDUAL" | "LOTE";
  assuntoEditado?: string;
  mensagemEditada?: string;
  contextoExtra?: Record<string, unknown>;
};

export type MensagemEnvioResultado = {
  modelo: MensagemModelo;
  resumo: {
    total: number;
    enviados: number;
    preparados: number;
    erros: number;
  };
  itens: Array<{
    destinatarioId: string;
    destinatarioNome: string;
    canal: MensagemCanalEnvio;
    status: "ENVIADO" | "PREPARADO" | "ERRO";
    contato?: string;
    urlWhatsapp?: string;
    erro?: string;
  }>;
};
