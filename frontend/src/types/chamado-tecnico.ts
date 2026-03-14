export type ChamadoParametro = {
  id: string;
  tipo: string;
  chave: string;
  nome: string;
  cor?: string;
  ordem: number;
  padrao?: boolean;
  slaHoras?: number;
  ativo?: boolean;
};

export type ChamadoParametroInput = {
  tipo: string;
  chave: string;
  nome: string;
  descricao?: string;
  cor?: string;
  ordem?: number;
  padrao?: boolean;
  sla_horas?: number;
  ativo?: boolean;
};

export type ChamadoUsuarioResumo = {
  id: string;
  nome: string;
  email?: string;
  status?: string;
};

export type ChamadoTecnicoListItem = {
  id: string;
  codigo: string;
  resumo: string;
  solicitante: string;
  cliente?: string;
  dataCriacao: string;
  ultimaAtualizacao: string;
  situacao?: ChamadoParametro | null;
  prioridade?: ChamadoParametro | null;
  tipo?: ChamadoParametro | null;
  categoria?: ChamadoParametro | null;
  sistema?: ChamadoParametro | null;
  projeto?: ChamadoParametro | null;
  sprint?: ChamadoParametro | null;
  criador?: ChamadoUsuarioResumo | null;
  responsavel?: ChamadoUsuarioResumo | null;
  urlTela?: string;
  moduloAfetado?: string;
  anexosQuantidade: number;
  comentariosNaoLidos: number;
  slaVencimentoEm?: string;
  resolvidoEm?: string;
  fechadoEm?: string;
};

export type ChamadoTecnicoDetalhe = ChamadoTecnicoListItem & {
  interessado?: string;
  origem?: ChamadoParametro | null;
  motivoReabertura?: ChamadoParametro | null;
  chamadoRelacionadoId?: string;
  fechadoPor?: ChamadoUsuarioResumo | null;
  slaPrazoHoras?: number;
  descricao: string;
  passosReproduzir?: string;
  resultadoEsperado?: string;
  resultadoObtido?: string;
  ambiente?: string;
  navegadorDispositivo?: string;
  menuNome?: string;
  submenuRota?: string;
  urlTela?: string;
  moduloAfetado?: string;
  impactoUso?: string;
  quantidadeUsuariosAfetados?: number;
  versaoSistema?: string;
  numeroRelease?: string;
  resolucao?: string;
  justificativaReabertura?: string;
  tags: string[];
};

export type ChamadoComentario = {
  id: string;
  comentario: string;
  interno: boolean;
  visivelSolicitante: boolean;
  mencaoUsuario?: ChamadoUsuarioResumo | null;
  autor?: ChamadoUsuarioResumo | null;
  criadoEm: string;
  atualizadoEm: string;
};

export type ChamadoHistorico = {
  id: string;
  tipoEvento: string;
  campo?: string;
  descricao: string;
  valorAnterior?: string;
  valorNovo?: string;
  usuario?: ChamadoUsuarioResumo | null;
  criadoEm: string;
};

export type ChamadoVinculo = {
  id: string;
  tipoVinculo: string;
  referenciaId?: string;
  referenciaDescricao: string;
  criadoPor?: ChamadoUsuarioResumo | null;
  criadoEm: string;
};

export type ChamadoAnexo = {
  id: string;
  nomeOriginal: string;
  nomeArquivo: string;
  caminhoArquivo: string;
  thumbnailCaminho?: string;
  mimeType: string;
  tamanhoBytes: number;
  dataUpload: string;
  usuarioUpload?: ChamadoUsuarioResumo | null;
  urlVisualizacao: string;
};

export type ChamadoTecnicoDetalheResponse = {
  chamado: ChamadoTecnicoDetalhe;
  comentarios: ChamadoComentario[];
  historico: ChamadoHistorico[];
  vinculos: ChamadoVinculo[];
  anexos: ChamadoAnexo[];
};

export type ChamadoResumoCards = {
  totalAbertos: number;
  atribuidosAMim: number;
  resolvidosHoje: number;
  emAtraso: number;
  aguardandoMeuRetorno: number;
  criticos: number;
  reabertos: number;
  semAtualizacaoMaisSeteDias: number;
};

export type ChamadoTecnicoListaResponse = {
  pagina: number;
  limite: number;
  total: number;
  resumo: {
    cards: ChamadoResumoCards;
  };
  chamados: ChamadoTecnicoListItem[];
};

export type ChamadoTecnicoCatalogo = {
  parametros: Record<string, ChamadoParametro[]>;
  usuarios: ChamadoUsuarioResumo[];
};

export type ChamadoTecnicoFiltroSalvo = {
  id: string;
  nome: string;
  filtros: Record<string, unknown>;
  padrao: boolean;
  criadoEm: string;
  atualizadoEm: string;
};

export type ChamadoTecnicoInput = {
  solicitante: string;
  interessado?: string;
  cliente?: string;
  sistema_id: string;
  projeto_id?: string;
  sprint_id?: string;
  tipo_id: string;
  categoria_id?: string;
  prioridade_id: string;
  situacao_id?: string;
  responsavel_usuario_id?: string;
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
  chamado_relacionado_id?: string;
  origem_id?: string;
  resolucao?: string;
  justificativa_reabertura?: string;
  motivo_reabertura_id?: string;
};

export type ChamadoTecnicoFiltros = {
  codigo?: string;
  resumo?: string;
  ultima_atualizacao?: string;
  situacao_id?: string;
  tipo_id?: string;
  prioridade_id?: string;
  categoria_id?: string;
  sistema_id?: string;
  projeto_id?: string;
  sprint_id?: string;
  cliente?: string;
  solicitante?: string;
  criador_usuario_id?: string;
  responsavel_usuario_id?: string;
  resolucao?: string;
  data_criacao_inicio?: string;
  data_criacao_fim?: string;
  historico?: string;
  ordenacao?:
    | "ultima_atualizacao"
    | "data_criacao"
    | "prioridade"
    | "situacao"
    | "responsavel"
    | "cliente"
    | "sistema";
  direcao?: "asc" | "desc";
  texto?: string;
  pagina?: number;
  limite?: number;
  inatividade_dias?: number;
};

export type DashboardVulnerabilidadePoint = {
  id: string;
  camada: string;
  titulo: string;
  subtitulo?: string;
  bairro?: string;
  cidade?: string;
  latitude?: number;
  longitude?: number;
  dataReferencia?: string;
};

export type DashboardVulnerabilidadeLayer = {
  total: number;
  geolocalizados: number;
  pendentesGeolocalizacao: number;
  pontos: DashboardVulnerabilidadePoint[];
};

export type DashboardVulnerabilidadeResponse = {
  unidadePrincipal: {
    id: string;
    nome: string;
    cidade?: string;
    estado?: string;
    latitude?: number;
    longitude?: number;
    raioMetros?: number;
  } | null;
  camadas: {
    cestaBasica: DashboardVulnerabilidadeLayer;
    familiasCadastradas: DashboardVulnerabilidadeLayer;
    situacaoViolencia: DashboardVulnerabilidadeLayer;
  };
  sugestoes: Array<{
    id: string;
    titulo: string;
    descricao: string;
  }>;
};
