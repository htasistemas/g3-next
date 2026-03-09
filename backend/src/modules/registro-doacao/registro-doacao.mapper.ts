import { toIsoDate, toStringId } from "../../utils/string-utils.js";

type DecimalValue = number | string | null | undefined;

function toNumber(value: DecimalValue): number | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "number") return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function formatDate(value?: Date | string | null): string | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return toIsoDate(value);
  const texto = String(value).trim();
  if (!texto) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) return texto;
  const data = new Date(texto);
  if (Number.isNaN(data.getTime())) return undefined;
  return toIsoDate(data);
}

export type DoadorRow = {
  id: bigint;
  nome: string;
  tipo_pessoa: string | null;
  documento: string | null;
  responsavel_empresa: string | null;
  email: string | null;
  telefone: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  cep: string | null;
  observacoes: string | null;
  criado_em: Date;
  atualizado_em: Date;
};

export type RegistroDoacaoRow = {
  id: bigint;
  doador_id: bigint | null;
  doador_nome: string | null;
  tipo_doacao: string;
  descricao: string | null;
  quantidade_itens: number | null;
  valor_medio: DecimalValue;
  valor_total: DecimalValue;
  valor: DecimalValue;
  data_recebimento: Date | string;
  forma_recebimento: string | null;
  recorrente: boolean;
  periodicidade: string | null;
  proxima_cobranca: Date | string | null;
  status: string;
  observacoes: string | null;
  conta_recebimento_id: bigint | null;
  contabilidade_pendente: boolean;
  lancamentos_gerados: boolean;
  criado_em: Date;
  atualizado_em: Date;
};

export type RegistroDoacaoItemRow = {
  id: bigint;
  recebimento_doacao_id: bigint;
  descricao: string;
  quantidade: number;
  unidade: string | null;
  valor_unitario: DecimalValue;
  valor_total: DecimalValue;
  marca: string | null;
  modelo: string | null;
  conservacao: string | null;
  observacoes: string | null;
};

export function mapDoadorToResponse(row: DoadorRow) {
  return {
    id_doador: toStringId(row.id),
    nome: row.nome,
    tipo_pessoa: row.tipo_pessoa ?? undefined,
    documento: row.documento ?? undefined,
    responsavel_empresa: row.responsavel_empresa ?? undefined,
    email: row.email ?? undefined,
    telefone: row.telefone ?? undefined,
    logradouro: row.logradouro ?? undefined,
    numero: row.numero ?? undefined,
    complemento: row.complemento ?? undefined,
    bairro: row.bairro ?? undefined,
    cidade: row.cidade ?? undefined,
    uf: row.uf ?? undefined,
    cep: row.cep ?? undefined,
    observacoes: row.observacoes ?? undefined,
    data_cadastro: row.criado_em.toISOString(),
    data_atualizacao: row.atualizado_em.toISOString()
  };
}

export function mapRegistroDoacaoToResponse(row: RegistroDoacaoRow, itens: RegistroDoacaoItemRow[]) {
  return {
    id_registro_doacao: toStringId(row.id),
    doador_id: row.doador_id ? toStringId(row.doador_id) : undefined,
    doador_nome: row.doador_nome ?? undefined,
    tipo_doacao: row.tipo_doacao,
    descricao: row.descricao ?? undefined,
    quantidade_itens: row.quantidade_itens ?? undefined,
    valor_medio: toNumber(row.valor_medio),
    valor_total: toNumber(row.valor_total),
    valor: toNumber(row.valor),
    data_recebimento: formatDate(row.data_recebimento),
    forma_recebimento: row.forma_recebimento ?? undefined,
    recorrente: row.recorrente,
    periodicidade: row.periodicidade ?? undefined,
    proxima_cobranca: formatDate(row.proxima_cobranca),
    status: row.status,
    observacoes: row.observacoes ?? undefined,
    conta_recebimento_id: row.conta_recebimento_id ? toStringId(row.conta_recebimento_id) : undefined,
    contabilidade_pendente: row.contabilidade_pendente,
    lancamentos_gerados: row.lancamentos_gerados,
    itens: itens.map((item) => ({
      id_item: toStringId(item.id),
      descricao: item.descricao,
      quantidade: item.quantidade,
      unidade: item.unidade ?? undefined,
      valor_unitario: toNumber(item.valor_unitario),
      valor_total: toNumber(item.valor_total),
      marca: item.marca ?? undefined,
      modelo: item.modelo ?? undefined,
      conservacao: item.conservacao ?? undefined,
      observacoes: item.observacoes ?? undefined
    })),
    data_cadastro: row.criado_em.toISOString(),
    data_atualizacao: row.atualizado_em.toISOString()
  };
}
