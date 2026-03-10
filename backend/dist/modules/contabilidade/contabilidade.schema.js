import { z } from "zod";
const optionalTrimmedString = z.preprocess((value) => {
    if (typeof value !== "string")
        return value;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
}, z.string().optional());
const optionalIsoDate = z.preprocess((value) => {
    if (typeof value !== "string")
        return value;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
}, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional());
const decimal = z.preprocess((value) => {
    if (typeof value === "number")
        return value;
    if (typeof value === "string") {
        const normalized = Number(value.replace(",", "."));
        return Number.isFinite(normalized) ? normalized : value;
    }
    return value;
}, z.number().finite());
export const contaBancariaInputSchema = z.object({
    banco: z.string().trim().min(2, "Informe o banco."),
    agencia: optionalTrimmedString.nullable().optional(),
    numero: z.string().trim().min(2, "Informe o número da conta."),
    tipo: z.string().trim().min(2, "Informe o tipo da conta."),
    projetoVinculado: optionalTrimmedString.nullable().optional(),
    pixVinculado: z.coerce.boolean().optional(),
    tipoChavePix: optionalTrimmedString.nullable().optional(),
    chavePix: optionalTrimmedString.nullable().optional(),
    recebimentoLocal: z.coerce.boolean().optional(),
    saldo: decimal,
    dataAtualizacao: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/)
});
export const lancamentoFinanceiroInputSchema = z.object({
    tipo: z.string().trim().min(2, "Informe o tipo."),
    descricao: z.string().trim().min(2, "Informe a descrição."),
    contraparte: z.string().trim().min(2, "Informe a contraparte."),
    vencimento: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
    valor: decimal,
    situacao: z.string().trim().min(2, "Informe a situação."),
    compraId: z.coerce.number().int().positive().optional().nullable()
});
export const movimentacaoFinanceiraInputSchema = z.object({
    tipo: z.string().trim().min(2, "Informe o tipo."),
    descricao: z.string().trim().min(2, "Informe a descrição."),
    contraparte: optionalTrimmedString.nullable().optional(),
    categoria: optionalTrimmedString.nullable().optional(),
    contaBancariaId: z.coerce.number().int().positive().optional().nullable(),
    dataMovimentacao: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
    valor: decimal
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
    status: z.string().trim().min(2, "Informe o status.")
});
export const pagamentoInputSchema = z.object({
    responsavel: optionalTrimmedString.nullable().optional(),
    data: optionalIsoDate.nullable().optional()
});
