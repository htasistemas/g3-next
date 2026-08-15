import { z } from "zod";
const id = z.coerce.number().int().positive();
const texto = z.string().trim().min(2);
const data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable();
const decimal = z.coerce.number().finite().optional().nullable();
export const parceriaPublicaSchema = z.object({
    termo_fomento_id: id,
    unidade_id: id,
    nome_programa: texto,
    orgao_gestor: texto,
    vigencia_inicio: data,
    vigencia_fim: data,
    status: z.string().trim().min(3).default("ATIVA"),
    objeto: z.string().trim().optional().nullable(),
    observacoes: z.string().trim().optional().nullable()
});
export const indicadorPublicoSchema = z.object({
    parceria_id: id,
    codigo: texto,
    descricao: texto,
    unidade_medida: texto,
    meta_valor: decimal,
    periodicidade: z.string().trim().min(3).default("MENSAL"),
    status: z.string().trim().min(3).default("ATIVO")
});
export const evidenciaPublicaSchema = z.object({
    indicador_id: id,
    competencia: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    realizado_valor: decimal,
    caminho_arquivo: z.string().trim().optional().nullable(),
    mime_type: z.string().trim().optional().nullable(),
    observacoes: z.string().trim().optional().nullable(),
    status: z.string().trim().min(3).default("RASCUNHO")
});
