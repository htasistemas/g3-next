export type VeiculoCadastro = {
  id?: number;
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

export type RegistroDiarioBordo = {
  id?: number;
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
  localDestinoNome?: string | null;
  destino?: string | null;
  combustivelConsumidoLitros?: number | null;
  kmRodados?: number | null;
  mediaConsumo?: number | null;
  observacoes?: string | null;
};

export type LocalDestinoVeiculo = {
  id?: number;
  nome?: string | null;
  endereco?: string | null;
  telefone?: string | null;
  observacoes?: string | null;
  ativo?: boolean | null;
  criadoEm?: string | null;
  atualizadoEm?: string | null;
};

export type MotoristaDisponivel = {
  id: number;
  tipoOrigem: "PROFISSIONAL" | "VOLUNTARIO";
  nome: string;
};

export type MotoristaAutorizado = {
  id?: number;
  veiculoId: number;
  placaVeiculo?: string | null;
  modeloVeiculo?: string | null;
  tipoOrigem: "PROFISSIONAL" | "VOLUNTARIO";
  motoristaId: number;
  nomeMotorista?: string;
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
export type DisponibilidadeVeiculoSituacaoCalculada = "DISPONIVEL" | "RESERVADO" | "INDISPONIVEL";

export type DisponibilidadeVeiculoRegistro = {
  id?: number;
  tenantId?: string;
  veiculoId: number;
  veiculoNome?: string;
  placa?: string | null;
  marca?: string | null;
  modelo?: string | null;
  veiculoAtivo?: boolean | null;
  tipoSituacao: DisponibilidadeVeiculoTipoSituacao;
  dataHoraInicio: string;
  dataHoraFim: string;
  motivo?: string | null;
  motivoDetalhado?: string | null;
  destino?: string | null;
  responsavelNome?: string | null;
  observacoes?: string | null;
  statusRegistro?: DisponibilidadeVeiculoStatusRegistro;
  criadoPorNome?: string | null;
  criadoEm?: string;
  alteradoPorNome?: string | null;
  alteradoEm?: string;
  canceladoPorNome?: string | null;
  canceladoEm?: string | null;
  motivoCancelamento?: string | null;
  version?: number;
  bloqueios?: DisponibilidadeVeiculoRegistro[];
  proximaLiberacao?: string | null;
  situacao?: DisponibilidadeVeiculoSituacaoCalculada;
  ativo?: boolean;
};

export type DisponibilidadeVeiculoConsulta = {
  dataHoraInicio: string;
  dataHoraFim: string;
  veiculoId?: number | null;
  situacao?: DisponibilidadeVeiculoSituacaoCalculada | null;
  unidade?: string | null;
  responsavel?: string | null;
  motivo?: string | null;
};

export type DisponibilidadeVeiculoResumo = {
  total: number;
  disponiveis: number;
  reservados: number;
  indisponiveis: number;
  itens: DisponibilidadeVeiculoRegistro[];
};

export type DisponibilidadeVeiculoDetalhe = {
  disponibilidade: DisponibilidadeVeiculoRegistro;
  historico: Array<{
    id: number;
    disponibilidadeVeiculoId: number;
    acao: string;
    antes: unknown;
    depois: unknown;
    usuarioNome?: string | null;
    criadoEm: string;
  }>;
};
