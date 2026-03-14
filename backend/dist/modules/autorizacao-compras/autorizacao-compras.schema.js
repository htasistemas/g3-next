import { z } from "zod";
import { AUTORIZACAO_COMPRA_TIPOS_COMPRA } from "./autorizacao-compras.workflow.js";
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
const normalizedDocument = z.preprocess((value) => {
    if (typeof value !== "string")
        return value;
    return value.replace(/\D/g, "");
}, z.string());
const itemSchema = z.object({
    descricao: z.string().trim().min(2, "Informe a descrição do item."),
    quantidade: z.coerce.number().positive("A quantidade deve ser maior que zero."),
    unidade: z.string().trim().min(1, "Informe a unidade do item."),
    valorEstimado: z.coerce.number().nonnegative("Informe o valor estimado do item."),
    categoria: optionalTrimmedString.nullable().optional(),
    tipoItem: z.enum(["material", "bem", "servico"], {
        errorMap: () => ({ message: "Informe o tipo do item." })
    })
});
export const autorizacaoCompraInputSchema = z.object({
    numeroSolicitacao: optionalTrimmedString.nullable().optional(),
    titulo: optionalTrimmedString.nullable().optional(),
    solicitante: z.string().trim().min(2, "Informe o solicitante."),
    setorSolicitante: z.string().trim().min(2, "Informe o setor solicitante."),
    centroCusto: z.string().trim().min(2, "Informe o centro de custo."),
    dataSolicitacao: optionalIsoDate.nullable().optional(),
    prioridade: optionalTrimmedString.nullable().optional(),
    justificativa: optionalTrimmedString.nullable().optional(),
    observacoes: optionalTrimmedString.nullable().optional(),
    tipoCompra: z.enum(AUTORIZACAO_COMPRA_TIPOS_COMPRA, {
        errorMap: () => ({ message: "Selecione o tipo da compra." })
    }),
    naturezaCompra: optionalTrimmedString.nullable().optional(),
    dataPrevista: optionalIsoDate.nullable().optional(),
    status: optionalTrimmedString.nullable().optional(),
    dispensarCotacao: z.coerce.boolean().optional(),
    motivoDispensa: optionalTrimmedString.nullable().optional(),
    autorizacaoEspecialOrcamento: z.coerce.boolean().optional(),
    justificativaOrcamento: optionalTrimmedString.nullable().optional(),
    orcamentoPrevisto: optionalDecimal.nullable().optional(),
    registroPatrimonio: z.coerce.boolean().optional(),
    registroAlmoxarifado: z.coerce.boolean().optional(),
    itens: z.array(itemSchema).min(1, "Informe ao menos um item.")
}).superRefine((input, ctx) => {
    if (!input.itens.length) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["itens"],
            message: "Informe ao menos um item."
        });
    }
    input.itens.forEach((item, index) => {
        if (item.quantidade <= 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["itens", index, "quantidade"],
                message: "A quantidade do item deve ser maior que zero."
            });
        }
    });
});
export const autorizacaoCompraCotacaoInputSchema = z.object({
    fornecedor: z.string().trim().min(2, "Informe o fornecedor."),
    razaoSocial: optionalTrimmedString.nullable().optional(),
    cnpj: normalizedDocument.refine((value) => value.length >= 11, "Informe um CPF/CNPJ válido."),
    contato: z.string().trim().min(2, "Informe o contato."),
    telefone: optionalTrimmedString.nullable().optional(),
    email: optionalTrimmedString.nullable().optional(),
    valor: z.coerce.number().positive("Informe o valor da cotação."),
    prazoEntrega: optionalIsoDate.nullable().optional(),
    formaPagamento: z.string().trim().min(2, "Informe a forma de pagamento."),
    validadeProposta: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a validade da proposta."),
    observacoes: optionalTrimmedString.nullable().optional(),
    dataCotacao: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data da cotação."),
    orcamentoArquivoId: z.coerce.number().int().positive().optional().nullable(),
    cartaoCnpjArquivoId: z.coerce.number().int().positive().optional().nullable()
}).superRefine((input, ctx) => {
    if (!input.telefone?.trim() && !input.email?.trim()) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["telefone"],
            message: "Informe telefone ou e-mail do fornecedor."
        });
    }
});
export const autorizacaoCompraEscolhaFornecedorSchema = z.object({
    cotacaoId: z.coerce.number().int().positive(),
    justificativaDivergencia: optionalTrimmedString.nullable().optional()
});
export const autorizacaoCompraAprovacaoInputSchema = z.object({
    acao: z.enum(["APROVAR", "REPROVAR", "DEVOLVER_AJUSTE"]),
    parecer: z.string().trim().min(2, "Informe o parecer."),
    observacao: optionalTrimmedString.nullable().optional(),
    motivo: optionalTrimmedString.nullable().optional()
}).superRefine((input, ctx) => {
    if (input.acao !== "APROVAR" && !input.motivo?.trim()) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["motivo"],
            message: "Informe o motivo da reprovação ou devolução."
        });
    }
});
export const reservaBancariaInputSchema = z.object({
    contaBancariaId: z.coerce.number().int().positive("Informe a conta pagadora."),
    valor: z.coerce.number().positive("Informe o valor da reserva."),
    observacao: optionalTrimmedString.nullable().optional()
});
export const autorizacaoPagamentoInputSchema = z.object({
    valorAutorizado: z.coerce.number().positive("Informe o valor autorizado."),
    vencimento: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe o vencimento."),
    formaPagamento: z.string().trim().min(2, "Informe a forma de pagamento."),
    contaPagadoraId: z.coerce.number().int().positive("Informe a conta pagadora."),
    documentoReferencia: optionalTrimmedString.nullable().optional(),
    documentoFiscal: optionalTrimmedString.nullable().optional(),
    observacoes: optionalTrimmedString.nullable().optional(),
    justificativaDivergencia: optionalTrimmedString.nullable().optional()
});
