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
const optionalDecimal = z.preprocess((value) => {
    if (value == null || value === "")
        return undefined;
    if (typeof value === "number")
        return value;
    if (typeof value === "string") {
        const normalized = Number(value.replace(",", "."));
        return Number.isFinite(normalized) ? normalized : value;
    }
    return value;
}, z.number().finite().optional());
export const autorizacaoCompraInputSchema = z.object({
    titulo: z.string().trim().min(2, "Informe o titulo."),
    tipo: z.string().trim().min(2, "Informe o tipo."),
    area: optionalTrimmedString.nullable().optional(),
    responsavel: optionalTrimmedString.nullable().optional(),
    dataPrevista: optionalIsoDate.nullable().optional(),
    valor: optionalDecimal.nullable().optional(),
    justificativa: optionalTrimmedString.nullable().optional(),
    centroCusto: optionalTrimmedString.nullable().optional(),
    status: z.string().trim().min(2, "Informe o status."),
    aprovador: optionalTrimmedString.nullable().optional(),
    decisao: optionalTrimmedString.nullable().optional(),
    observacoesAprovacao: optionalTrimmedString.nullable().optional(),
    dataAprovacao: optionalIsoDate.nullable().optional(),
    dispensarCotacao: z.coerce.boolean().optional(),
    motivoDispensa: optionalTrimmedString.nullable().optional(),
    vencedor: optionalTrimmedString.nullable().optional(),
    registroPatrimonio: z.coerce.boolean().optional(),
    registroAlmoxarifado: z.coerce.boolean().optional(),
    numeroReserva: optionalTrimmedString.nullable().optional(),
    numeroTermo: optionalTrimmedString.nullable().optional(),
    autorizacaoPagamentoNumero: optionalTrimmedString.nullable().optional(),
    autorizacaoPagamentoAutor: optionalTrimmedString.nullable().optional(),
    autorizacaoPagamentoData: optionalIsoDate.nullable().optional(),
    autorizacaoPagamentoObservacoes: optionalTrimmedString.nullable().optional(),
    prioridade: optionalTrimmedString.nullable().optional(),
    quantidadeItens: z.coerce.number().int().positive().optional()
});
export const autorizacaoCompraCotacaoInputSchema = z.object({
    fornecedor: z.string().trim().min(2, "Informe o fornecedor."),
    razaoSocial: optionalTrimmedString.nullable().optional(),
    cnpj: optionalTrimmedString.nullable().optional(),
    valor: z.coerce.number().positive("Informe o valor da cotacao."),
    prazoEntrega: optionalIsoDate.nullable().optional(),
    validade: optionalIsoDate.nullable().optional(),
    conformidade: optionalTrimmedString.nullable().optional(),
    observacoes: optionalTrimmedString.nullable().optional(),
    orcamentoFisicoNome: optionalTrimmedString.nullable().optional(),
    orcamentoFisicoTipo: optionalTrimmedString.nullable().optional(),
    orcamentoFisicoConteudo: optionalTrimmedString.nullable().optional(),
    cartaoCnpjUrl: optionalTrimmedString.nullable().optional(),
    cartaoCnpjNome: optionalTrimmedString.nullable().optional(),
    cartaoCnpjTipo: optionalTrimmedString.nullable().optional(),
    cartaoCnpjConteudo: optionalTrimmedString.nullable().optional()
});
export const reservaBancariaInputSchema = z.object({
    contaBancariaId: z.coerce.number().int().positive(),
    valor: z.coerce.number().positive()
});
export const autorizacaoPagamentoInputSchema = z.object({
    autor: optionalTrimmedString.nullable().optional(),
    data: optionalIsoDate.nullable().optional(),
    observacoes: optionalTrimmedString.nullable().optional()
});
