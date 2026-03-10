import { toIsoDate, toStringId } from "../../utils/string-utils.js";
import type {
  AlmoxarifadoItemRow,
  AlmoxarifadoKitComposicaoRow,
  AlmoxarifadoMovimentacaoRow
} from "./almoxarifado.types.js";

export function mapAlmoxarifadoItemToResponse(row: AlmoxarifadoItemRow) {
  return {
    id_item: toStringId(row.id),
    codigo: row.codigo,
    codigo_barras: row.codigo_barras ?? undefined,
    descricao: row.descricao,
    categoria: row.categoria,
    unidade: row.unidade,
    localizacao: row.localizacao ?? undefined,
    localizacao_interna: row.localizacao_interna ?? undefined,
    estoque_atual: row.estoque_atual,
    estoque_minimo: row.estoque_minimo,
    valor_unitario: row.valor_unitario,
    is_kit: row.is_kit,
    situacao: row.situacao,
    validade: toIsoDate(row.validade),
    ignorar_validade: row.ignorar_validade,
    observacoes: row.observacoes ?? undefined
  };
}

export function mapAlmoxarifadoMovimentacaoToResponse(row: AlmoxarifadoMovimentacaoRow) {
  return {
    id_movimentacao: toStringId(row.id),
    data_movimentacao: toIsoDate(row.data_movimentacao) ?? "",
    tipo: row.tipo,
    codigo_item: row.codigo_item,
    descricao_item: row.descricao_item,
    quantidade: row.quantidade,
    saldo_apos: row.saldo_apos,
    referencia: row.referencia ?? undefined,
    responsavel: row.responsavel ?? undefined,
    observacoes: row.observacoes ?? undefined,
    direcao_ajuste: row.direcao_ajuste ?? undefined
  };
}

export function mapAlmoxarifadoKitComposicaoToResponse(row: AlmoxarifadoKitComposicaoRow) {
  return {
    id: Number(row.id),
    produto_item_id: Number(row.produto_item_id),
    produto_item_codigo: row.produto_item_codigo,
    produto_item_descricao: row.produto_item_descricao,
    quantidade_item: row.quantidade_item
  };
}
