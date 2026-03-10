export type VeiculoInput = {
  placa?: string;
  modelo?: string;
  marca?: string;
  ano?: number | null;
  tipoCombustivel?: string;
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
  condutor?: string | null;
  horarioSaida?: string | null;
  kmInicial?: number | null;
  horarioChegada?: string | null;
  kmFinal?: number | null;
  destino?: string | null;
  observacoes?: string | null;
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

export type VeiculoRow = {
  id: bigint;
  placa: string | null;
  modelo: string | null;
  marca: string | null;
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
  condutor: string | null;
  horario_saida: Date | string | null;
  km_inicial: number | null;
  horario_chegada: Date | string | null;
  km_final: number | null;
  destino: string | null;
  combustivel_consumido_litros: number | null;
  km_rodados: number | null;
  media_consumo: number | null;
  observacoes: string | null;
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
