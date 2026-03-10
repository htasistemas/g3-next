import { z } from "zod";

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

const optionalIsoDateTime = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}, z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/)).optional());

const checklistInputSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  titulo: z.string().trim().min(1, "Informe o título do item de checklist."),
  concluido: z.boolean().optional(),
  concluidoEm: optionalIsoDateTime,
  ordem: z.coerce.number().int().nonnegative().optional()
});

export const tarefaAdministrativaInputSchema = z.object({
  titulo: z.string().trim().min(3, "Informe o título da tarefa."),
  descricao: z.string().trim().min(3, "Informe a descrição da tarefa."),
  responsavel: z.string().trim().min(2, "Informe o responsável."),
  prioridade: z.string().trim().min(2, "Informe a prioridade."),
  prazo: optionalIsoDate,
  status: z.string().trim().min(2, "Informe o status."),
  checklist: z.array(checklistInputSchema).optional()
});

export const tarefaAdministrativaHistoricoInputSchema = z.object({
  mensagem: z.string().trim().min(3, "Informe a mensagem do histórico.")
});
