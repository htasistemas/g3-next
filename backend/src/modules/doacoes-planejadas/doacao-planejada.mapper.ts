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

export type DoacaoPlanejadaRow = {
  id: bigint;
  beneficiario_id: bigint | null;
  vinculo_familiar_id: bigint | null;
  beneficiario_nome: string | null;
  familia_nome: string | null;
  almoxarifado_item_id: bigint;
  item_codigo: string;
  item_descricao: string;
  item_unidade: string;
  quantidade: number;
  data_prevista: Date | string;
  prioridade: string;
  status: string;
  observacoes: string | null;
  motivo_cancelamento: string | null;
  criado_em: Date;
  atualizado_em: Date;
};

export function mapDoacaoPlanejadaToResponse(row: DoacaoPlanejadaRow) {
  return {
    id_doacao_planejada: toStringId(row.id),
    beneficiario_id: row.beneficiario_id ? toStringId(row.beneficiario_id) : undefined,
    vinculo_familiar_id: row.vinculo_familiar_id ? toStringId(row.vinculo_familiar_id) : undefined,
    beneficiario_nome: row.beneficiario_nome ?? undefined,
    familia_nome: row.familia_nome ?? undefined,
    item_id: toStringId(row.almoxarifado_item_id),
    item_codigo: row.item_codigo,
    item_descricao: row.item_descricao,
    item_unidade: row.item_unidade,
    quantidade: row.quantidade,
    data_prevista: formatDate(row.data_prevista),
    prioridade: row.prioridade,
    status: row.status,
    observacoes: row.observacoes ?? undefined,
    motivo_cancelamento: row.motivo_cancelamento ?? undefined,
    data_cadastro: row.criado_em.toISOString(),
    data_atualizacao: row.atualizado_em.toISOString()
  };
}

