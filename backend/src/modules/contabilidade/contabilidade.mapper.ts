import { toIsoDate } from "../../utils/string-utils.js";
import type {
  ContaBancariaRow,
  EmendaImpositivaRow,
  LancamentoFinanceiroRow,
  MovimentacaoFinanceiraRow
} from "./contabilidade.types.js";

export function mapContaBancariaToResponse(row: ContaBancariaRow) {
  return {
    id: Number(row.id),
    banco: row.banco,
    agencia: row.agencia ?? undefined,
    numero: row.numero,
    tipo: row.tipo,
    projetoVinculado: row.projeto_vinculado ?? undefined,
    pixVinculado: row.pix_vinculado,
    tipoChavePix: row.tipo_chave_pix ?? undefined,
    chavePix: row.chave_pix ?? undefined,
    recebimentoLocal: row.recebimento_local,
    saldo: row.saldo,
    dataAtualizacao: toIsoDate(row.data_atualizacao) ?? ""
  };
}

export function mapLancamentoToResponse(row: LancamentoFinanceiroRow) {
  return {
    id: Number(row.id),
    tipo: row.tipo,
    descricao: row.descricao,
    contraparte: row.contraparte,
    vencimento: toIsoDate(row.vencimento) ?? "",
    valor: row.valor,
    situacao: row.situacao,
    compraId: row.compra_id ? Number(row.compra_id) : undefined
  };
}

export function mapMovimentacaoToResponse(row: MovimentacaoFinanceiraRow) {
  return {
    id: Number(row.id),
    tipo: row.tipo,
    descricao: row.descricao,
    contraparte: row.contraparte ?? undefined,
    categoria: row.categoria ?? undefined,
    contaBancariaId: row.conta_bancaria_id ? Number(row.conta_bancaria_id) : undefined,
    dataMovimentacao: toIsoDate(row.data_movimentacao) ?? "",
    valor: row.valor,
    contaBancariaNumero: row.conta_bancaria_numero ?? undefined,
    contaBancariaBanco: row.conta_bancaria_banco ?? undefined
  };
}

export function mapEmendaToResponse(row: EmendaImpositivaRow) {
  return {
    id: Number(row.id),
    identificacao: row.identificacao,
    referenciaLegal: row.referencia_legal ?? undefined,
    dataPrevista: toIsoDate(row.data_prevista) ?? "",
    valorPrevisto: row.valor_previsto,
    diasAlerta: row.dias_alerta,
    status: row.status,
    observacoes: row.observacoes ?? undefined
  };
}
