import { z } from "zod";
const optionalTrimmedString = z.preprocess((value) => {
    if (typeof value !== "string")
        return value;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
}, z.string().optional());
const optionalNumber = z.preprocess((value) => {
    if (value === null || value === undefined || value === "")
        return undefined;
    if (typeof value === "number")
        return value;
    if (typeof value === "string")
        return Number(value);
    return value;
}, z.number().nonnegative().optional());
const optionalInteger = z.preprocess((value) => {
    if (value === null || value === undefined || value === "")
        return undefined;
    if (typeof value === "number")
        return value;
    if (typeof value === "string")
        return Number(value);
    return value;
}, z.number().int().positive().optional());
const optionalIsoDate = z.preprocess((value) => {
    if (typeof value !== "string")
        return value;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
}, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional());
const optionalHour = z.preprocess((value) => {
    if (typeof value !== "string")
        return value;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
}, z.string().regex(/^\d{2}:\d{2}$/).optional());
export const veiculoInputSchema = z.object({
    placa: optionalTrimmedString,
    modelo: optionalTrimmedString,
    marca: optionalTrimmedString,
    ano: optionalInteger.nullable().optional(),
    tipoCombustivel: optionalTrimmedString,
    mediaConsumoPadrao: optionalNumber.nullable().optional(),
    capacidadeTanqueLitros: optionalNumber.nullable().optional(),
    observacoes: optionalTrimmedString.nullable().optional(),
    ativo: z.boolean().nullable().optional(),
    fotoFrente: optionalTrimmedString.nullable().optional(),
    fotoLateralEsquerda: optionalTrimmedString.nullable().optional(),
    fotoLateralDireita: optionalTrimmedString.nullable().optional(),
    fotoTraseira: optionalTrimmedString.nullable().optional(),
    documentoVeiculoPdf: optionalTrimmedString.nullable().optional()
});
export const diarioBordoInputSchema = z.object({
    veiculoId: optionalInteger.nullable().optional(),
    data: optionalIsoDate.nullable().optional(),
    condutor: optionalTrimmedString.nullable().optional(),
    horarioSaida: optionalHour.nullable().optional(),
    kmInicial: optionalNumber.nullable().optional(),
    horarioChegada: optionalHour.nullable().optional(),
    kmFinal: optionalNumber.nullable().optional(),
    destino: optionalTrimmedString.nullable().optional(),
    observacoes: optionalTrimmedString.nullable().optional()
});
export const motoristaAutorizadoInputSchema = z.object({
    veiculoId: z.coerce.number().int().positive(),
    tipoOrigem: z.enum(["PROFISSIONAL", "VOLUNTARIO"]),
    motoristaId: z.coerce.number().int().positive(),
    numeroCarteira: optionalTrimmedString.nullable().optional(),
    categoriaCarteira: optionalTrimmedString.nullable().optional(),
    vencimentoCarteira: optionalIsoDate.nullable().optional(),
    arquivoCarteiraPdf: optionalTrimmedString.nullable().optional()
});
