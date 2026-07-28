export const mensagemDestinatarioValues = [
  "COLABORADOR",
  "PROFISSIONAL",
  "VOLUNTARIO",
  "DOADOR",
  "INSTITUICAO",
  "BENEFICIARIO"
] as const;

export const mensagemCanalPermitidoValues = ["WHATSAPP", "EMAIL", "AMBOS"] as const;
export const mensagemCanalEnvioValues = ["WHATSAPP", "EMAIL"] as const;
export const mensagemStatusValues = ["ATIVA", "INATIVA"] as const;
export const mensagemOrigemValues = ["SISTEMA", "USUARIO", "IA"] as const;
export const mensagemTaxonomiaTipoValues = [
  "CATEGORIA",
  "ASSUNTO",
  "TIPO_COMUNICACAO",
  "TAG"
] as const;
export const mensagemTipoEnvioValues = ["INDIVIDUAL", "LOTE"] as const;
export const mensagemHistoricoStatusValues = ["ENVIADO", "PREPARADO", "ERRO"] as const;

export type MensagemDestinatarioTipo = (typeof mensagemDestinatarioValues)[number];
export type MensagemCanalPermitido = (typeof mensagemCanalPermitidoValues)[number];
export type MensagemCanalEnvio = (typeof mensagemCanalEnvioValues)[number];
export type MensagemStatus = (typeof mensagemStatusValues)[number];
export type MensagemOrigem = (typeof mensagemOrigemValues)[number];
export type MensagemTaxonomiaTipo = (typeof mensagemTaxonomiaTipoValues)[number];
export type MensagemTipoEnvio = (typeof mensagemTipoEnvioValues)[number];
export type MensagemHistoricoStatus = (typeof mensagemHistoricoStatusValues)[number];

export type MensagemAtor = {
  id?: string;
  nomeUsuario?: string;
  tenant_id?: string;
};

export type MensagemTaxonomiaInput = {
  tipo: MensagemTaxonomiaTipo;
  nome: string;
  descricao?: string | null;
  status?: MensagemStatus;
};

export type MensagemTaxonomiaRow = {
  id: bigint;
  tipo: string;
  nome: string;
  descricao: string | null;
  status: string;
  ordem: number;
  criado_em: Date;
  atualizado_em: Date;
};

export type MensagemModeloInput = {
  titulo: string;
  assunto?: string | null;
  categoriaId?: string | null;
  assuntoId?: string | null;
  tipoComunicacaoId?: string | null;
  tags?: string[];
  tiposDestinatario: MensagemDestinatarioTipo[];
  canalPermitido: MensagemCanalPermitido;
  mensagemBase: string;
  variaveisPermitidas?: string[];
  status?: MensagemStatus;
  observacoesInternas?: string | null;
  mensagemPadraoSistema?: boolean;
  mensagemPersonalizadaUsuario?: boolean;
  mensagemSugeridaIa?: boolean;
};

export type MensagemModeloSeedInput = MensagemModeloInput & {
  chaveSistema: string;
  origem: MensagemOrigem;
};

export type MensagemModeloRow = {
  id: bigint;
  titulo: string;
  assunto: string | null;
  categoria_id: bigint | null;
  categoria_nome: string | null;
  assunto_id: bigint | null;
  assunto_nome: string | null;
  tipo_comunicacao_id: bigint | null;
  tipo_comunicacao_nome: string | null;
  destinatarios_json: string;
  canais_json: string;
  mensagem_base: string;
  variaveis_json: string;
  tags_json: string;
  status: string;
  observacoes_internas: string | null;
  origem: string;
  mensagem_padrao_sistema: boolean;
  mensagem_personalizada_usuario: boolean;
  mensagem_sugerida_ia: boolean;
  chave_sistema: string | null;
  criado_por_id: string | null;
  criado_por_nome: string | null;
  atualizado_por_id: string | null;
  atualizado_por_nome: string | null;
  criado_em: Date;
  atualizado_em: Date;
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

export type MensagemDestinatarioCatalogo = {
  tipo: MensagemDestinatarioTipo;
  id: string;
  nome: string;
  documento?: string;
  email?: string;
  telefone?: string;
  detalhe?: string;
  aceitaComunicacao?: boolean;
};

export type MensagemPreviewInput = {
  modeloId?: string | null;
  canal: MensagemCanalEnvio;
  destinatarioTipo: MensagemDestinatarioTipo;
  destinatarioId: string;
  assuntoEditado?: string | null;
  mensagemEditada?: string | null;
  contextoExtra?: Record<string, unknown>;
};

export type MensagemEnvioInput = {
  modeloId?: string | null;
  canal: MensagemCanalEnvio;
  destinatarioTipo: MensagemDestinatarioTipo;
  destinatarioIds: string[];
  destinatariosTodos?: boolean;
  tipoEnvio: MensagemTipoEnvio;
  assuntoEditado?: string | null;
  mensagemEditada?: string | null;
  contextoExtra?: Record<string, unknown>;
};

export type MensagemHistoricoRow = {
  id: bigint;
  modelo_id: bigint | null;
  nome_mensagem: string;
  canal: string;
  destinatario_tipo: string;
  destinatario_id: string | null;
  destinatario_nome: string | null;
  destinatario_contato: string | null;
  usuario_id: string | null;
  usuario_nome: string | null;
  tipo_envio: string;
  status: string;
  assunto_final: string | null;
  mensagem_final: string | null;
  erro_observacao: string | null;
  url_whatsapp: string | null;
  filtros_json: string | null;
  detalhes_json: string | null;
  criado_em: Date;
};

export type MensagemHistoricoFiltros = {
  busca?: string;
  canal?: MensagemCanalEnvio;
  destinatarioTipo?: MensagemDestinatarioTipo;
  usuario?: string;
  status?: MensagemHistoricoStatus;
  dataInicio?: string;
  dataFim?: string;
};

export type MensagemHistoricoRegistroInput = {
  modeloId?: bigint | null;
  nomeMensagem: string;
  canal: MensagemCanalEnvio;
  destinatarioTipo: MensagemDestinatarioTipo;
  destinatarioId?: string | null;
  destinatarioNome?: string | null;
  destinatarioContato?: string | null;
  usuarioId?: string | null;
  usuarioNome?: string | null;
  tipoEnvio: MensagemTipoEnvio;
  status: MensagemHistoricoStatus;
  assuntoFinal?: string | null;
  mensagemFinal?: string | null;
  erroObservacao?: string | null;
  urlWhatsapp?: string | null;
  filtrosJson?: string | null;
  detalhesJson?: string | null;
};

export type MensagemAuditoriaInput = {
  acao: string;
  modeloId?: bigint | null;
  usuarioId?: string | null;
  usuarioNome?: string | null;
  tenantId?: string | null;
  dadosJson?: string | null;
};

export type MensagemDestinatarioDetalhe = {
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
  aceitaComunicacao?: boolean;
};

export type MensagemVariavelDisponivel = {
  chave: string;
  rotulo: string;
  descricao: string;
  exemplo: string;
};
