import { z } from "zod";
import { voluntarioEscalaDiaValues, voluntarioEscalaStatusValues } from "./voluntario-escala.types.js";
const horaSchema = z
    .string()
    .trim()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Informe um horario valido no formato HH:MM.");
const textoOpcional = z.preprocess((value) => {
    if (typeof value !== "string")
        return value;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
}, z.string().optional());
const cargaHorariaSchema = z.preprocess((value) => {
    if (value === null || value === undefined || value === "")
        return undefined;
    if (typeof value === "number")
        return value;
    if (typeof value === "string") {
        const normalizado = value.replace(",", ".").trim();
        return normalizado ? Number(normalizado) : undefined;
    }
    return value;
}, z.number().positive().max(168).optional());
export const voluntarioEscalaInputSchema = z.object({
    voluntario_id: z.string().trim().min(1, "voluntario_id e obrigatorio."),
    sala_id: z.string().trim().min(1, "sala_id e obrigatorio."),
    atividade_tipo: z.string().trim().min(3, "Informe o tipo de atividade."),
    titulo: textoOpcional,
    dias_semana: z
        .array(z.enum(voluntarioEscalaDiaValues))
        .min(1, "Selecione pelo menos um dia da semana."),
    hora_inicio: horaSchema,
    hora_fim: horaSchema,
    carga_horaria_semanal: cargaHorariaSchema,
    status: z.enum(voluntarioEscalaStatusValues).default("ATIVA"),
    observacoes: textoOpcional
}).refine((value) => {
    const [inicioHora, inicioMinuto] = value.hora_inicio.split(":").map(Number);
    const [fimHora, fimMinuto] = value.hora_fim.split(":").map(Number);
    return fimHora * 60 + fimMinuto > inicioHora * 60 + inicioMinuto;
}, {
    message: "O horario final deve ser maior que o horario inicial.",
    path: ["hora_fim"]
});
export const voluntarioEscalaFiltroSchema = z.object({
    voluntario_id: z.string().trim().optional()
});
