import { z } from "zod";
import { chamadoOrdenacaoValues, chamadoParametroTipoValues } from "./chamado-tecnico.types.js";
const optionalTrimmedString = z.preprocess((value) => {
    if (typeof value !== "string")
        return value;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
}, z.string().optional());
const optionalInteger = z.preprocess((value) => {
    if (value === null || value === undefined || value === "")
        return undefined;
    if (typeof value === "number")
        return value;
    if (typeof value === "string")
        return Number(value);
    return value;
}, z.number().int().positive().optional());
const optionalBoolean = z.preprocess((value) => {
    if (value === null || value === undefined || value === "")
        return undefined;
    if (typeof value === "boolean")
        return value;
    if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        if (["true", "1", "sim", "yes"].includes(normalized))
            return true;
        if (["false", "0", "nao", "não", "no"].includes(normalized))
            return false;
    }
    return value;
}, z.boolean().optional());
const optionalDateString = optionalTrimmedString.refine((value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value), "Data invalida.");
export const chamadoTecnicoInputSchema = z.object({
    solicitante: z.string().trim().min(3, "Informe o solicitante."),
    interessado: optionalTrimmedString,
    cliente: optionalTrimmedString,
    sistema_id: z.preprocess((value) => Number(value), z.number().int().positive()),
    projeto_id: optionalInteger,
    sprint_id: optionalInteger,
    tipo_id: z.preprocess((value) => Number(value), z.number().int().positive()),
    categoria_id: optionalInteger,
    prioridade_id: z.preprocess((value) => Number(value), z.number().int().positive()),
    situacao_id: optionalInteger,
    responsavel_usuario_id: optionalInteger,
    sla_prazo_horas: optionalInteger,
    tags: z.array(z.string().trim().min(1)).optional().default([]),
    resumo: z.string().trim().min(5, "Informe o resumo."),
    descricao: z.string().trim().min(10, "Informe a descricao detalhada."),
    passos_reproduzir: optionalTrimmedString,
    resultado_esperado: optionalTrimmedString,
    resultado_obtido: optionalTrimmedString,
    ambiente: optionalTrimmedString,
    navegador_dispositivo: optionalTrimmedString,
    menu_nome: optionalTrimmedString,
    submenu_rota: optionalTrimmedString,
    url_tela: optionalTrimmedString,
    modulo_afetado: optionalTrimmedString,
    impacto_uso: optionalTrimmedString,
    quantidade_usuarios_afetados: optionalInteger,
    versao_sistema: optionalTrimmedString,
    numero_release: optionalTrimmedString,
    chamado_relacionado_id: optionalInteger,
    origem_id: optionalInteger,
    resolucao: optionalTrimmedString,
    justificativa_reabertura: optionalTrimmedString,
    motivo_reabertura_id: optionalInteger
});
export const chamadoTecnicoStatusInputSchema = z.object({
    situacao_id: z.preprocess((value) => Number(value), z.number().int().positive()),
    resolucao: optionalTrimmedString,
    justificativa_reabertura: optionalTrimmedString,
    motivo_reabertura_id: optionalInteger,
    responsavel_usuario_id: optionalInteger
});
export const chamadoTecnicoComentarioInputSchema = z.object({
    comentario: z.string().trim().min(2, "Informe o comentario."),
    interno: optionalBoolean,
    visivel_solicitante: optionalBoolean,
    mencao_usuario_id: optionalInteger
});
export const chamadoTecnicoVinculoInputSchema = z.object({
    tipo_vinculo: z.string().trim().min(2, "Informe o tipo do vinculo."),
    referencia_id: optionalTrimmedString,
    referencia_descricao: z.string().trim().min(2, "Informe a referencia do vinculo.")
});
export const chamadoTecnicoFiltroSalvoInputSchema = z.object({
    nome: z.string().trim().min(2, "Informe o nome do filtro."),
    filtros: z.record(z.unknown()),
    padrao: optionalBoolean
});
export const chamadoTecnicoParametroInputSchema = z.object({
    tipo: z.enum(chamadoParametroTipoValues),
    chave: z.string().trim().min(2, "Informe a chave."),
    nome: z.string().trim().min(2, "Informe o nome."),
    descricao: optionalTrimmedString,
    cor: optionalTrimmedString,
    ordem: optionalInteger,
    padrao: optionalBoolean,
    sla_horas: optionalInteger,
    ativo: optionalBoolean
});
export const chamadoTecnicoListaFiltrosSchema = z.object({
    codigo: optionalTrimmedString,
    resumo: optionalTrimmedString,
    ultima_atualizacao: optionalTrimmedString,
    situacao_id: optionalInteger,
    tipo_id: optionalInteger,
    resolucao: optionalTrimmedString,
    data_criacao_inicio: optionalDateString,
    data_criacao_fim: optionalDateString,
    criador_usuario_id: optionalInteger,
    responsavel_usuario_id: optionalInteger,
    projeto_id: optionalInteger,
    sistema_id: optionalInteger,
    cliente: optionalTrimmedString,
    prioridade_id: optionalInteger,
    categoria_id: optionalInteger,
    solicitante: optionalTrimmedString,
    sprint_id: optionalInteger,
    historico: optionalTrimmedString,
    ordenacao: z.enum(chamadoOrdenacaoValues).optional(),
    direcao: z.enum(["asc", "desc"]).optional(),
    limite: optionalInteger,
    pagina: optionalInteger,
    inatividade_dias: optionalInteger,
    texto: optionalTrimmedString
});
