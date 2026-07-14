export type VeiculoInput = {
  placa?: string | null;
  modelo?: string | null;
  marca?: string | null;
  cor?: string | null;
  ano?: number | null;
  tipoCombustivel?: string | null;
  mediaConsumoPadrao?: number | null;
  capacidadeTanqueLitros?: number | null;
  observacoes?: string | null;
  ativo?: boolean | null;
  fotoFrente?: string | null;
  fotoLateralEsquerda?: string | null;
  fotoLateralDireita?: string | null;
  fotoTraseira?: string | null;
  documentoVeiculoPdf?: string | null;
};

export type DiarioBordoInput = {
  veiculoId?: number | null;
  data?: string | null;
  dataSaida?: string | null;
  dataChegada?: string | null;
  condutor?: string | null;
  horarioSaida?: string | null;
  kmInicial?: number | null;
  horarioChegada?: string | null;
  kmFinal?: number | null;
  localDestinoId?: number | null;
  destino?: string | null;
  combustivelConsumidoLitros?: number | null;
  observacoes?: string | null;
};

export type LocalDestinoInput = {
  nome?: string | null;
  endereco?: string | null;
  telefone?: string | null;
  observacoes?: string | null;
  ativo?: boolean | null;
};

export type MotoristaAutorizadoInput = {
  veiculoId: number;
  tipoOrigem: "PROFISSIONAL" | "VOLUNTARIO";
  motoristaId: number;
  numeroCarteira?: string | null;
  categoriaCarteira?: string | null;
  vencimentoCarteira?: string | null;
  arquivoCarteiraPdf?: string | null;
};

export type DisponibilidadeVeiculoTipoSituacao = "RESERVADO" | "INDISPONIVEL";
export type DisponibilidadeVeiculoStatusRegistro =
  | "ATIVO"
  | "CANCELADO"
  | "ENCERRADO"
  | "EXCLUIDO_LOGICAMENTE";

export type DisponibilidadeVeiculoInput = {
  veiculoId: number;
  dataHoraInicio: string;
  dataHoraFim: string;
  tipoSituacao: DisponibilidadeVeiculoTipoSituacao;
  motivo?: string | null;
  motivoDetalhado?: string | null;
  destino?: string | null;
  responsavelNome?: string | null;
  observacoes?: string | null;
  statusRegistro?: DisponibilidadeVeiculoStatusRegistro;
};

export type DisponibilidadeVeiculoConsultaInput = {
  dataHoraInicio: string;
  dataHoraFim: string;
  veiculoId?: number | null;
  situacao?: DisponibilidadeVeiculoTipoSituacao | "DISPONIVEL" | null;
  unidade?: string | null;
  responsavel?: string | null;
  motivo?: string | null;
};

export type DisponibilidadeVeiculoRow = {
  id: bigint;
  tenant_id: string;
  veiculo_id: bigint;
  tipo_situacao: DisponibilidadeVeiculoTipoSituacao;
  data_hora_inicio: Date;
  data_hora_fim: Date;
  motivo: string | null;
  motivo_detalhado: string | null;
  destino: string | null;
  responsavel_id: bigint | null;
  responsavel_nome: string | null;
  observacoes: string | null;
  status_registro: DisponibilidadeVeiculoStatusRegistro;
  criado_por_usuario_id: bigint | null;
  criado_por_nome: string | null;
  criado_em: Date;
  alterado_por_usuario_id: bigint | null;
  alterado_por_nome: string | null;
  alterado_em: Date;
  cancelado_por_usuario_id: bigint | null;
  cancelado_por_nome: string | null;
  cancelado_em: Date | null;
  motivo_cancelamento: string | null;
  version: number | bigint;
};

export type DisponibilidadeVeiculoHistoricoRow = {
  id: bigint;
  disponibilidade_veiculo_id: bigint;
  acao: string;
  antes_json: unknown;
  depois_json: unknown;
  usuario_id: bigint | null;
  usuario_nome: string | null;
  criado_em: Date;
};

export type VeiculoRow = {
  id: bigint;
  placa: string | null;
  modelo: string | null;
  marca: string | null;
  cor: string | null;
  ano: number | null;
  tipo_combustivel: string | null;
  media_consumo_padrao: number | null;
  capacidade_tanque_litros: number | null;
  observacoes: string | null;
  ativo: boolean | null;
  foto_frente: string | null;
  foto_lateral_esquerda: string | null;
  foto_lateral_direita: string | null;
  foto_traseira: string | null;
  documento_veiculo_pdf: string | null;
};

export type DiarioBordoRow = {
  id: bigint;
  veiculo_id: bigint | null;
  data: Date | null;
  data_saida: Date | null;
  data_chegada: Date | null;
  condutor: string | null;
  horario_saida: Date | string | null;
  km_inicial: number | null;
  horario_chegada: Date | string | null;
  km_final: number | null;
  local_destino_id: bigint | null;
  local_destino_nome: string | null;
  destino: string | null;
  combustivel_consumido_litros: number | null;
  km_rodados: number | null;
  media_consumo: number | null;
  observacoes: string | null;
};

export type LocalDestinoRow = {
  id: bigint;
  nome: string | null;
  endereco: string | null;
  telefone: string | null;
  observacoes: string | null;
  ativo: boolean | null;
  criado_em: Date;
  atualizado_em: Date;
};

export type MotoristaAutorizadoRow = {
  id: bigint;
  veiculo_id: bigint;
  placa_veiculo: string | null;
  modelo_veiculo: string | null;
  tipo_origem: string;
  profissional_id: bigint | null;
  voluntario_id: bigint | null;
  nome_motorista: string;
  numero_carteira: string | null;
  categoria_carteira: string | null;
  vencimento_carteira: Date | null;
  arquivo_carteira_pdf: string | null;
};
