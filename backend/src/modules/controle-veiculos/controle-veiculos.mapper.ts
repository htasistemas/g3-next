import { toIsoDate, toStringId } from "../../utils/string-utils.js";
import type {
  DiarioBordoRow,
  MotoristaAutorizadoRow,
  VeiculoRow
} from "./controle-veiculos.types.js";

function formatarHora(value?: Date | string | null): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(11, 16);
  const texto = String(value).trim();
  if (!texto) return null;
  return texto.slice(0, 5);
}

export function mapVeiculoToResponse(row: VeiculoRow) {
  return {
    id: Number(row.id),
    idInterno: toStringId(row.id),
    placa: row.placa,
    modelo: row.modelo,
    marca: row.marca,
    ano: row.ano,
    tipoCombustivel: row.tipo_combustivel,
    mediaConsumoPadrao: row.media_consumo_padrao,
    capacidadeTanqueLitros: row.capacidade_tanque_litros,
    observacoes: row.observacoes,
    ativo: row.ativo,
    fotoFrente: row.foto_frente,
    fotoLateralEsquerda: row.foto_lateral_esquerda,
    fotoLateralDireita: row.foto_lateral_direita,
    fotoTraseira: row.foto_traseira,
    documentoVeiculoPdf: row.documento_veiculo_pdf
  };
}

export function mapDiarioBordoToResponse(row: DiarioBordoRow) {
  return {
    id: Number(row.id),
    idInterno: toStringId(row.id),
    veiculoId: row.veiculo_id ? Number(row.veiculo_id) : null,
    data: toIsoDate(row.data),
    condutor: row.condutor,
    horarioSaida: formatarHora(row.horario_saida),
    kmInicial: row.km_inicial,
    horarioChegada: formatarHora(row.horario_chegada),
    kmFinal: row.km_final,
    destino: row.destino,
    combustivelConsumidoLitros: row.combustivel_consumido_litros,
    kmRodados: row.km_rodados,
    mediaConsumo: row.media_consumo,
    observacoes: row.observacoes
  };
}

export function mapMotoristaAutorizadoToResponse(row: MotoristaAutorizadoRow) {
  const motoristaId = row.tipo_origem === "PROFISSIONAL" ? row.profissional_id : row.voluntario_id;

  return {
    id: Number(row.id),
    idInterno: toStringId(row.id),
    veiculoId: Number(row.veiculo_id),
    placaVeiculo: row.placa_veiculo,
    modeloVeiculo: row.modelo_veiculo,
    tipoOrigem: row.tipo_origem,
    motoristaId: motoristaId ? Number(motoristaId) : 0,
    nomeMotorista: row.nome_motorista,
    numeroCarteira: row.numero_carteira,
    categoriaCarteira: row.categoria_carteira,
    vencimentoCarteira: toIsoDate(row.vencimento_carteira),
    arquivoCarteiraPdf: row.arquivo_carteira_pdf
  };
}
