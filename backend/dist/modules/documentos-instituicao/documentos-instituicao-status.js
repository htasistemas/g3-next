export function parseDiasAntecedenciaDocumentoInstituicao(value) {
    if (!value)
        return [];
    if (Array.isArray(value)) {
        return value.map((item) => Number(item)).filter((item) => Number.isFinite(item));
    }
    if (typeof value === "string") {
        try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
                return parsed.map((item) => Number(item)).filter((item) => Number.isFinite(item));
            }
        }
        catch {
            return [];
        }
    }
    return [];
}
function parseIsoDateOnly(value) {
    if (!value)
        return null;
    if (value instanceof Date) {
        if (Number.isNaN(value.getTime()))
            return null;
        return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 0, 0, 0, 0);
    }
    const normalized = value.trim();
    const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match)
        return null;
    const [, year, month, day] = match;
    return new Date(Number(year), Number(month) - 1, Number(day), 0, 0, 0, 0);
}
function isInputSource(source) {
    return "emRenovacao" in source;
}
function isRowSource(source) {
    return "em_renovacao" in source;
}
export function calcularSituacaoDocumentoInstituicao(source, dataReferencia = new Date()) {
    const emRenovacao = isInputSource(source)
        ? source.emRenovacao
        : isRowSource(source)
            ? source.em_renovacao
            : false;
    if (emRenovacao)
        return "em_renovacao";
    const semVencimento = isInputSource(source)
        ? source.semVencimento
        : isRowSource(source)
            ? source.sem_vencimento
            : false;
    const vencimentoIndeterminado = isInputSource(source)
        ? source.vencimentoIndeterminado
        : isRowSource(source)
            ? source.vencimento_indeterminado
            : false;
    const validade = source.validade;
    if (semVencimento || vencimentoIndeterminado || !validade) {
        return "sem_vencimento";
    }
    const diasAntecedencia = isInputSource(source)
        ? source.diasAntecedencia
        : isRowSource(source)
            ? source.dias_antecedencia
            : undefined;
    const diasAlerta = Math.max(0, ...parseDiasAntecedenciaDocumentoInstituicao(diasAntecedencia).filter((item) => item >= 0));
    const hoje = new Date(dataReferencia);
    hoje.setHours(0, 0, 0, 0);
    const dataValidade = parseIsoDateOnly(validade);
    if (!dataValidade)
        return "valido";
    if (dataValidade < hoje)
        return "vencido";
    const alerta = new Date(hoje);
    alerta.setDate(alerta.getDate() + (diasAlerta || 30));
    if (dataValidade <= alerta)
        return "vence_em_breve";
    return "valido";
}
