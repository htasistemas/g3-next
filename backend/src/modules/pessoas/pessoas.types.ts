import { z } from "zod";

export const listarPessoasQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  tipoVinculo: z.enum([
    "BENEFICIARIO", "COLABORADOR", "PROFISSIONAL", "VOLUNTARIO",
    "DOADOR", "USUARIO", "RESPONSAVEL", "OUTRO"
  ]).optional(),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25)
});

export const criarVinculoSchema = z.object({
  tipoVinculo: z.enum([
    "BENEFICIARIO", "COLABORADOR", "PROFISSIONAL", "VOLUNTARIO",
    "DOADOR", "USUARIO", "RESPONSAVEL", "OUTRO"
  ]),
  entidadeId: z.coerce.number().int().positive().optional(),
  identificadorExterno: z.string().trim().max(120).optional(),
  principal: z.boolean().optional(),
  inicioEm: z.string().date().optional(),
  fimEm: z.string().date().optional(),
  metadados: z.record(z.unknown()).optional()
}).refine((value) => !value.fimEm || !value.inicioEm || value.fimEm >= value.inicioEm, {
  message: "A data final do vínculo não pode ser anterior à data inicial.",
  path: ["fimEm"]
});

export const revisarDuplicidadeSchema = z.object({
  status: z.enum(["DIFERENTES", "CORRIGIDA", "CONSOLIDACAO_AUTORIZADA", "PENDENTE"]),
  observacao: z.string().trim().max(1000).optional()
});

export type ListarPessoasQuery = z.infer<typeof listarPessoasQuerySchema>;
export type CriarVinculoInput = z.infer<typeof criarVinculoSchema>;
export type RevisarDuplicidadeInput = z.infer<typeof revisarDuplicidadeSchema>;
