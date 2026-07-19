import { z } from "zod";

const texto = z.string().trim().min(2);
const data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable();
const id = z.coerce.number().int().positive();

export const buscaBeneficiarioSchema = z.object({ busca: texto });
export const anoLetivoSchema = z.object({ ano: z.coerce.number().int().min(2000).max(2200), descricao: texto, data_inicial: data, data_final: data, status: z.string().trim().min(3).default("PLANEJAMENTO"), periodos: z.array(z.record(z.unknown())).optional() });
export const etapaSchema = z.object({ nome: texto, descricao: z.string().trim().optional().nullable(), status: z.string().trim().min(3).default("ATIVA") });
export const serieSchema = z.object({ etapa_id: id, nome: texto, descricao: z.string().trim().optional().nullable(), status: z.string().trim().min(3).default("ATIVA") });
export const disciplinaSchema = z.object({ codigo: z.string().trim().optional().nullable(), nome: texto, area: z.string().trim().optional().nullable(), carga_horaria: z.coerce.number().int().nonnegative().optional().nullable(), status: z.string().trim().min(3).default("ATIVA") });
export const turmaSchema = z.object({ ano_letivo_id: id, unidade_id: id.optional().nullable(), etapa_id: id, serie_id: id, sala_id: id.optional().nullable(), nome: texto, turno: z.string().trim().min(3), capacidade_maxima: z.coerce.number().int().nonnegative(), professor_responsavel_id: id.optional().nullable(), professor_responsavel_nome: z.string().trim().optional().nullable(), status: z.string().trim().min(3).default("ATIVA") });
export const alunoSchema = z.object({ beneficiario_id: id, numero_aluno: z.string().trim().optional().nullable(), observacoes: z.string().trim().optional().nullable() });
export const matriculaSchema = z.object({ aluno_id: id, ano_letivo_id: id, unidade_id: id.optional().nullable(), etapa_id: id, serie_id: id, turma_id: id.optional().nullable(), numero_matricula: texto, data_matricula: data, situacao: z.string().trim().min(3).default("ATIVA") });
export const enturmacaoSchema = z.object({ matricula_id: id, turma_id: id, data_inicio: data, motivo: z.string().trim().optional().nullable() });
