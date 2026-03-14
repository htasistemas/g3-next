export const chamadoParametroTipoValues = [
  "TIPO",
  "CATEGORIA",
  "PRIORIDADE",
  "SITUACAO",
  "SISTEMA",
  "PROJETO",
  "SPRINT",
  "MOTIVO_REABERTURA",
  "ORIGEM"
] as const;

export type ChamadoParametroTipo = (typeof chamadoParametroTipoValues)[number];

export const chamadoOrdenacaoValues = [
  "ultima_atualizacao",
  "data_criacao",
  "prioridade",
  "situacao",
  "responsavel",
  "cliente",
  "sistema"
] as const;

export type ChamadoOrdenacao = (typeof chamadoOrdenacaoValues)[number];

export type ChamadoTecnicoInput = {
  solicitante: string;
  interessado?: string;
  cliente?: string;
  sistema_id: number;
  projeto_id?: number;
  sprint_id?: number;
  tipo_id: number;
  categoria_id?: number;
  prioridade_id: number;
  situacao_id?: number;
  responsavel_usuario_id?: number;
  sla_prazo_horas?: number;
  tags?: string[];
  resumo: string;
  descricao: string;
  passos_reproduzir?: string;
  resultado_esperado?: string;
  resultado_obtido?: string;
  ambiente?: string;
  navegador_dispositivo?: string;
  menu_nome?: string;
  submenu_rota?: string;
  url_tela?: string;
  modulo_afetado?: string;
  impacto_uso?: string;
  quantidade_usuarios_afetados?: number;
  versao_sistema?: string;
  numero_release?: string;
  chamado_relacionado_id?: number;
  origem_id?: number;
  resolucao?: string;
  justificativa_reabertura?: string;
  motivo_reabertura_id?: number;
};

export type ChamadoTecnicoStatusInput = {
  situacao_id: number;
  resolucao?: string;
  justificativa_reabertura?: string;
  motivo_reabertura_id?: number;
  responsavel_usuario_id?: number;
};

export type ChamadoTecnicoComentarioInput = {
  comentario: string;
  interno?: boolean;
  visivel_solicitante?: boolean;
  mencao_usuario_id?: number;
};

export type ChamadoTecnicoVinculoInput = {
  tipo_vinculo: string;
  referencia_id?: string;
  referencia_descricao: string;
};

export type ChamadoTecnicoFiltroSalvoInput = {
  nome: string;
  filtros: Record<string, unknown>;
  padrao?: boolean;
};

export type ChamadoTecnicoParametroInput = {
  tipo: ChamadoParametroTipo;
  chave: string;
  nome: string;
  descricao?: string;
  cor?: string;
  ordem?: number;
  padrao?: boolean;
  sla_horas?: number;
  ativo?: boolean;
};

export type ChamadoTecnicoListaFiltros = {
  codigo?: string;
  resumo?: string;
  ultima_atualizacao?: string;
  situacao_id?: number;
  tipo_id?: number;
  resolucao?: string;
  data_criacao_inicio?: string;
  data_criacao_fim?: string;
  criador_usuario_id?: number;
  responsavel_usuario_id?: number;
  projeto_id?: number;
  sistema_id?: number;
  cliente?: string;
  prioridade_id?: number;
  categoria_id?: number;
  solicitante?: string;
  sprint_id?: number;
  historico?: string;
  ordenacao?: ChamadoOrdenacao;
  direcao?: "asc" | "desc";
  limite?: number;
  pagina?: number;
  inatividade_dias?: number;
  texto?: string;
};

export type ChamadoParametroRow = {
  id: bigint;
  tipo: string;
  chave: string;
  nome: string;
  descricao: string | null;
  cor: string | null;
  ordem: number;
  padrao: boolean;
  sla_horas: number | null;
  ativo: boolean;
  metadados_json: unknown;
  criado_em: Date;
  atualizado_em: Date;
};

export type ChamadoUsuarioRow = {
  id: bigint;
  nome_usuario: string;
  nome_completo: string | null;
  nome_exibicao: string | null;
  email: string | null;
  status: string | null;
};

export type ChamadoTecnicoRow = {
  id: bigint;
  codigo: string;
  solicitante: string;
  interessado: string | null;
  cliente: string | null;
  sistema_id: bigint | null;
  projeto_id: bigint | null;
  sprint_id: bigint | null;
  tipo_id: bigint | null;
  categoria_id: bigint | null;
  prioridade_id: bigint | null;
  situacao_id: bigint | null;
  criador_usuario_id: bigint | null;
  responsavel_usuario_id: bigint | null;
  origem_id: bigint | null;
  motivo_reabertura_id: bigint | null;
  chamado_relacionado_id: bigint | null;
  fechado_por_usuario_id: bigint | null;
  sla_prazo_horas: number | null;
  sla_vencimento_em: Date | null;
  resumo: string;
  descricao: string;
  passos_reproduzir: string | null;
  resultado_esperado: string | null;
  resultado_obtido: string | null;
  ambiente: string | null;
  navegador_dispositivo: string | null;
  url_tela: string | null;
  modulo_afetado: string | null;
  impacto_uso: string | null;
  quantidade_usuarios_afetados: number | null;
  versao_sistema: string | null;
  numero_release: string | null;
  resolucao: string | null;
  justificativa_reabertura: string | null;
  tags_texto: string | null;
  data_criacao: Date;
  ultima_atualizacao: Date;
  resolvido_em: Date | null;
  fechado_em: Date | null;
  criado_em: Date;
  atualizado_em: Date;
  ativo: boolean;
};

export type ChamadoTecnicoListRow = ChamadoTecnicoRow & {
  anexos_quantidade: bigint;
  comentarios_nao_lidos: bigint;
};

export type ChamadoTecnicoComentarioRow = {
  id: bigint;
  chamado_id: bigint;
  comentario: string;
  interno: boolean;
  visivel_solicitante: boolean;
  mencao_usuario_id: bigint | null;
  criado_por_usuario_id: bigint | null;
  criado_em: Date;
  atualizado_em: Date;
};

export type ChamadoTecnicoHistoricoRow = {
  id: bigint;
  chamado_id: bigint;
  tipo_evento: string;
  campo: string | null;
  descricao: string;
  valor_anterior: string | null;
  valor_novo: string | null;
  usuario_id: bigint | null;
  criado_em: Date;
};

export type ChamadoTecnicoVinculoRow = {
  id: bigint;
  chamado_id: bigint;
  tipo_vinculo: string;
  referencia_id: string | null;
  referencia_descricao: string;
  criado_por_usuario_id: bigint | null;
  criado_em: Date;
};

export type ChamadoTecnicoFiltroSalvoRow = {
  id: bigint;
  usuario_id: bigint;
  nome: string;
  filtro_json: unknown;
  padrao: boolean;
  criado_em: Date;
  atualizado_em: Date;
};
