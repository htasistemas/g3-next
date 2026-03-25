import { z } from "zod";
import { metodoPagamentoVendaValues } from "./venda.types.js";
export const vendaItemInputSchema = z.object({
    codigo_item: z.string().trim().min(1),
    descricao_item: z.string().trim().max(255).optional(),
    quantidade: z.number().positive(),
    valor_unitario: z.number().nonnegative()
});
export const vendaInputSchema = z.object({
    cliente_nome: z.string().trim().max(255).optional(),
    cliente_documento: z.string().trim().max(32).optional(),
    forma_pagamento: z.enum(metodoPagamentoVendaValues),
    observacoes: z.string().trim().max(1000).optional(),
    itens: z.array(vendaItemInputSchema).min(1)
});
export const vendaFiltersSchema = z.object({
    cliente_nome: z.string().trim().optional(),
    forma_pagamento: z.string().trim().optional(),
    data_inicial: z.string().trim().optional(),
    data_final: z.string().trim().optional(),
    limite: z.coerce.number().int().positive().max(100).optional()
});
