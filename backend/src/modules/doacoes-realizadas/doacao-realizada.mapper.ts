import { toIsoDate, toStringId } from "../../utils/string-utils.js";

function formatDate(value?: Date | string | null) {
  if (!value) return undefined;
  if (value instanceof Date) return toIsoDate(value);
  const texto = String(value).trim();
  if (!texto) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) return texto;
  const data = new Date(texto);
  if (Number.isNaN(data.getTime())) return undefined;
  return toIsoDate(data);
}

export type DoacaoRealizadaRow = {
  id: bigint;
  beneficiario_id: bigint | null;
  vinculo_familiar_id: bigint | null;
  beneficiario_nome: string | null;
  familia_nome: string | null;
  tipo_doacao: string;
  situacao: string;
  responsavel: string | null;
  observacoes: string | null;
  data_doacao: Date | string;
  criado_em: Date;
  atualizado_em: Date;
  total_itens?: bigint | number | null;
  possui_item_fora_carencia?: boolean | null;
};

export type DoacaoRealizadaItemRow = {
  id: bigint;
  doacao_realizada_id: bigint;
  almoxarifado_item_id: bigint;
  codigo_item: string;
  descricao_item: string;
  unidade_item: string;
  quantidade: number;
  observacoes: string | null;
  fora_carencia: boolean | null;
  carencia_dias: number | null;
  autorizado_por_nome: string | null;
  autorizacao_carencia_em: Date | null;
  ultima_entrega_em: Date | string | null;
};

export function mapDoacaoRealizadaToResponse(row: DoacaoRealizadaRow, itens: DoacaoRealizadaItemRow[]) {
  const possuiItemForaCarencia = Boolean(row.possui_item_fora_carencia);

  return {
    id_doacao_realizada: toStringId(row.id),
    beneficiario_id: row.beneficiario_id ? toStringId(row.beneficiario_id) : undefined,
    vinculo_familiar_id: row.vinculo_familiar_id ? toStringId(row.vinculo_familiar_id) : undefined,
    beneficiario_nome: row.beneficiario_nome ?? undefined,
    familia_nome: row.familia_nome ?? undefined,
    tipo_doacao: row.tipo_doacao,
    situacao: possuiItemForaCarencia ? `${row.situacao} | Fora da carencia` : row.situacao,
    responsavel: row.responsavel ?? undefined,
    observacoes: row.observacoes ?? undefined,
    data_doacao: formatDate(row.data_doacao),
    total_itens: typeof row.total_itens === "bigint" ? Number(row.total_itens) : row.total_itens ?? itens.length,
    possui_item_fora_carencia: possuiItemForaCarencia,
    itens: itens.map((item) => ({
      id_item_doacao: toStringId(item.id),
      item_id: toStringId(item.almoxarifado_item_id),
      codigo_item: item.codigo_item,
      descricao_item: item.descricao_item,
      unidade_item: item.unidade_item,
      quantidade: item.quantidade,
      observacoes: item.observacoes ?? undefined,
      fora_carencia: Boolean(item.fora_carencia),
      carencia_dias_aplicada: item.carencia_dias ?? undefined,
      autorizado_por_nome: item.autorizado_por_nome ?? undefined,
      autorizacao_carencia_em: item.autorizacao_carencia_em?.toISOString() ?? undefined,
      ultima_entrega_em: formatDate(item.ultima_entrega_em)
    })),
    data_cadastro: row.criado_em.toISOString(),
    data_atualizacao: row.atualizado_em.toISOString()
  };
}
