import { z } from "zod";
import { isValidCpf } from "../../utils/validators.js";

const cpf = z.string().transform((v) => v.replace(/\D/g, "")).refine((v) => isValidCpf(v), "Informe um CPF válido.");
const email = z.string().trim().toLowerCase().email("Informe um e-mail válido.").optional().or(z.literal(""));

export const preInscricaoSchema = z.object({
  cursoId: z.coerce.number().int().positive(), nomeCompleto: z.string().trim().min(3), cpf,
  dataNascimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data de nascimento."),
  telefone: z.string().trim().optional(), whatsapp: z.string().trim().optional(), email,
  endereco: z.record(z.string()).optional(), respostas: z.record(z.unknown()).optional(),
  termosVersao: z.string().trim().min(1), termosAceitos: z.literal(true), origem: z.string().trim().max(40).optional(), utm: z.record(z.string()).optional()
});

export const acaoPreInscricaoSchema = z.object({ motivo: z.string().trim().max(2000).optional() });
export const publicacaoSchema = z.object({
  inscricaoPublica: z.boolean(), inscricaoAbertura: z.string().datetime().optional().nullable(), inscricaoEncerramento: z.string().datetime().optional().nullable(),
  permiteListaEspera: z.boolean().optional(), limiteListaEspera: z.number().int().nonnegative().optional().nullable(), descricaoPublica: z.string().max(10000).optional().nullable(),
  publicoAlvo: z.string().max(3000).optional().nullable(), prerequisitos: z.string().max(5000).optional().nullable(), modalidade: z.enum(["PRESENCIAL", "ONLINE", "HIBRIDO"]).optional()
});
