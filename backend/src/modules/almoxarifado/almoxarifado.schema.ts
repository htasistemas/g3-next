import { z } from "zod";

const optionalTrimmedString = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}, z.string().optional());

const optionalNumber = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") return undefined;
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return value;
}, z.number().nonnegative().optional());

export const almoxarifadoItemInputSchema = z.object({
  codigo: optionalTrimmedString,
  codigo_barras: optionalTrimmedString.nullable().optional(),
  descricao: z.string().trim().min(2, "Informe a descrição do item."),
  categoria: z.string().trim().min(2, "Informe a categoria."),
  unidade: z.string().trim().min(1, "Informe a unidade."),
  localizacao: optionalTrimmedString.nullable().optional(),
  localizacao_interna: optionalTrimmedString.nullable().optional(),
  estoque_atual: optionalNumber,
  estoque_minimo: optionalNumber,
  valor_unitario: optionalNumber,
  is_kit: z.boolean().optional(),
  situacao: z.string().trim().min(2, "Informe a situação."),
  validade: z
    .preprocess((value) => {
      if (typeof value !== "string") return value;
      const trimmed = value.trim();
      return trimmed.length ? trimmed : undefined;
    }, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional())
    .nullable()
    .optional(),
  ignorar_validade: z.boolean().optional(),
  observacoes: optionalTrimmedString.nullable().optional()
});

export const almoxarifadoMovimentacaoInputSchema = z.object({
  data_movimentacao: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  tipo: z.string().trim().min(2, "Informe o tipo da movimentação."),
  codigo_item: z.string().trim().min(1, "Informe o código do item."),
  quantidade: z.coerce.number().positive("Informe a quantidade."),
  referencia: optionalTrimmedString.nullable().optional(),
  responsavel: optionalTrimmedString.nullable().optional(),
  observacoes: optionalTrimmedString.nullable().optional(),
  direcao_ajuste: optionalTrimmedString.nullable().optional(),
  gerar_itens_kit: z.boolean().nullable().optional()
});

export const almoxarifadoKitComposicaoInputSchema = z.array(
  z.object({
    produto_item_id: z.coerce.number().int().positive(),
    quantidade_item: z.coerce.number().positive()
  })
);
