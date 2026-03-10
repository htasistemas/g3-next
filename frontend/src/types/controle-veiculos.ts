export type VeiculoCadastro = {
  id?: number;
  placa?: string | null;
  modelo?: string | null;
  marca?: string | null;
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
  condutor?: string | null;
  horarioSaida?: string | null;
  kmInicial?: number | null;
  horarioChegada?: string | null;
  kmFinal?: number | null;
  destino?: string | null;
  combustivelConsumidoLitros?: number | null;
  kmRodados?: number | null;
  mediaConsumo?: number | null;
  observacoes?: string | null;
};

export type MotoristaDisponivel = {
  id: number;
  tipoOrigem: string;
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
