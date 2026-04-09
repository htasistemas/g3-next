import { z } from "zod";
import {
  CATEGORIA_FINANCEIRA_TIPOS,
  CONCILIACAO_FINANCEIRA_SITUACOES,
  CONTA_BANCARIA_STATUS,
  CONTA_BANCARIA_TIPOS,
  LANCAMENTO_FINANCEIRO_STATUS,
  LANCAMENTO_FINANCEIRO_TIPOS,
  normalizarDirecaoAjuste,
  normalizarStatusConta
} from "./contabilidade.workflow.js";

const optionalTrimmedString = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}, z.string().optional());

const optionalIsoDate = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional());

const decimal = z.preprocess((value) => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const normalized = Number(value.replace(",", "."));
    return Number.isFinite(normalized) ? normalized : value;
  }
  return value;
}, z.number().finite());

const statusAtivoInativo = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  return normalizarStatusConta(value);
}, z.enum(CONTA_BANCARIA_STATUS).optional());

const direcaoAjusteSchema = z.preprocess((value) => {
  if (value == null || value === "") return undefined;
  if (typeof value !== "string") return value;
  return normalizarDirecaoAjuste(value);
}, z.enum(["AUMENTAR", "DIMINUIR"]).optional());

export const contaBancariaInputSchema = z.object({
  banco: z.string().trim().min(2, "Informe o banco."),
  agencia: optionalTrimmedString.nullable().optional(),
  numero: z.string().trim().min(2, "Informe o número da conta."),
  digito: optionalTrimmedString.nullable().optional(),
  nomeConta: z.string().trim().min(2, "Informe o nome da conta."),
  tipo: z.enum(CONTA_BANCARIA_TIPOS, {
    errorMap: () => ({ message: "Selecione o tipo da conta." })
  }),
  titular: optionalTrimmedString.nullable().optional(),
  projetoVinculado: optionalTrimmedString.nullable().optional(),
  pixVinculado: z.coerce.boolean().optional(),
  tipoChavePix: optionalTrimmedString.nullable().optional(),
  chavePix: optionalTrimmedString.nullable().optional(),
  recebimentoLocal: z.coerce.boolean().optional(),
  saldoInicial: decimal,
  dataSaldoInicial: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  limiteMinimoAlerta: decimal.optional().nullable(),
  status: statusAtivoInativo,
  permiteMovimentacao: z.coerce.boolean().optional(),
  observacao: optionalTrimmedString.nullable().optional()
});

export const categoriaFinanceiraInputSchema = z.object({
  codigo: z.string().trim().min(2, "Informe o código."),
  nome: z.string().trim().min(2, "Informe o nome da categoria."),
  tipo: z.enum(CATEGORIA_FINANCEIRA_TIPOS, {
    errorMap: () => ({ message: "Selecione o tipo da categoria." })
  }),
  grupo: optionalTrimmedString.nullable().optional(),
  subgrupo: optionalTrimmedString.nullable().optional(),
  categoriaPaiId: z.coerce.number().int().positive().optional().nullable(),
  aceitaLancamentoDireto: z.coerce.boolean().optional(),
  status: statusAtivoInativo,
  observacao: optionalTrimmedString.nullable().optional()
});

export const centroCustoInputSchema = z.object({
  codigo: z.string().trim().min(2, "Informe o código."),
  nome: z.string().trim().min(2, "Informe o nome do centro de custo."),
  setorResponsavel: z.string().trim().min(2, "Informe o setor responsável."),
  descricao: optionalTrimmedString.nullable().optional(),
  status: statusAtivoInativo
});

export const lancamentoFinanceiroInputSchema = z.object({
  dataLancamento: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  tipo: z.enum(LANCAMENTO_FINANCEIRO_TIPOS, {
    errorMap: () => ({ message: "Selecione o tipo do lançamento." })
  }),
  direcaoAjuste: direcaoAjusteSchema.nullable().optional(),
  natureza: z.string().trim().min(2, "Informe a natureza."),
  contaBancariaId: z.coerce.number().int().positive().optional().nullable(),
  categoriaId: z.coerce.number().int().positive().optional().nullable(),
  centroCustoId: z.coerce.number().int().positive().optional().nullable(),
  setor: optionalTrimmedString.nullable().optional(),
  contraparte: z.string().trim().min(2, "Informe o favorecido ou pagador."),
  documento: optionalTrimmedString.nullable().optional(),
  historico: z.string().trim().min(2, "Informe o histórico."),
  valor: decimal.refine((value) => value > 0, "Informe um valor maior que zero."),
  formaPagamento: optionalTrimmedString.nullable().optional(),
  status: z.enum(LANCAMENTO_FINANCEIRO_STATUS, {
    errorMap: () => ({ message: "Selecione o status." })
  }),
  origem: optionalTrimmedString.nullable().optional(),
  observacao: optionalTrimmedString.nullable().optional(),
  vencimento: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  dataBaixa: optionalIsoDate.nullable().optional(),
  responsavel: optionalTrimmedString.nullable().optional(),
  compraId: z.coerce.number().int().positive().optional().nullable(),
  projeto: optionalTrimmedString.nullable().optional()
}).superRefine((input, ctx) => {
  if (input.tipo === "AJUSTE" && !input.direcaoAjuste) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["direcaoAjuste"],
      message: "Selecione se o ajuste deve aumentar ou diminuir o valor."
    });
  }
});

export const movimentacaoFinanceiraInputSchema = z.object({
  tipo: z.string().trim().min(2, "Informe o tipo."),
  descricao: z.string().trim().min(2, "Informe a descrição."),
  contraparte: optionalTrimmedString.nullable().optional(),
  categoria: optionalTrimmedString.nullable().optional(),
  contaBancariaId: z.coerce.number().int().positive().optional().nullable(),
  centroCustoId: z.coerce.number().int().positive().optional().nullable(),
  dataMovimentacao: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  valor: decimal.refine((value) => value > 0, "Informe um valor maior que zero."),
  origem: optionalTrimmedString.nullable().optional(),
  observacao: optionalTrimmedString.nullable().optional()
});

export const transferenciaFinanceiraInputSchema = z.object({
  contaOrigemId: z.coerce.number().int().positive("Selecione a conta de origem."),
  contaDestinoId: z.coerce.number().int().positive("Selecione a conta de destino."),
  dataTransferencia: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  valor: decimal.refine((value) => value > 0, "Informe um valor maior que zero."),
  descricao: z.string().trim().min(2, "Informe a descrição."),
  responsavel: z.string().trim().min(2, "Informe o responsável."),
  observacao: optionalTrimmedString.nullable().optional()
}).superRefine((input, ctx) => {
  if (input.contaOrigemId === input.contaDestinoId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["contaDestinoId"],
      message: "A conta de destino deve ser diferente da conta de origem."
    });
  }
});

export const conciliacaoFinanceiraInputSchema = z.object({
  contaBancariaId: z.coerce.number().int().positive("Selecione a conta bancária."),
  dataMovimento: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  descricaoExtrato: z.string().trim().min(2, "Informe a descrição do extrato."),
  valorExtrato: decimal.refine((value) => value !== 0, "Informe um valor diferente de zero."),
  lancamentoFinanceiroId: z.coerce.number().int().positive().optional().nullable(),
  movimentacaoFinanceiraId: z.coerce.number().int().positive().optional().nullable(),
  situacao: z.enum(CONCILIACAO_FINANCEIRA_SITUACOES).optional(),
  observacao: optionalTrimmedString.nullable().optional()
});

export const emendaImpositivaInputSchema = z.object({
  identificacao: z.string().trim().min(2, "Informe a identificação."),
  referenciaLegal: optionalTrimmedString.nullable().optional(),
  dataPrevista: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  valorPrevisto: decimal,
  diasAlerta: z.coerce.number().int().min(0),
  status: z.string().trim().min(2, "Informe o status."),
  observacoes: optionalTrimmedString.nullable().optional()
});

export const statusInputSchema = z.object({
  status: z.enum(LANCAMENTO_FINANCEIRO_STATUS, {
    errorMap: () => ({ message: "Selecione o status." })
  })
});

export const statusLivreInputSchema = z.object({
  status: z.string().trim().min(2, "Informe o status.")
});

export const situacaoConciliacaoInputSchema = z.object({
  situacao: z.enum(CONCILIACAO_FINANCEIRA_SITUACOES, {
    errorMap: () => ({ message: "Selecione a situação." })
  })
});

export const pagamentoInputSchema = z.object({
  responsavel: optionalTrimmedString.nullable().optional(),
  data: optionalIsoDate.nullable().optional(),
  contaBancariaId: z.coerce.number().int().positive().optional().nullable(),
  formaPagamento: optionalTrimmedString.nullable().optional(),
  observacao: optionalTrimmedString.nullable().optional()
});
