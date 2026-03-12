export function normalizeDigits(value) {
    const digits = (value ?? "").replace(/\D/g, "");
    return digits.length ? digits : undefined;
}
export function trimOrUndefined(value) {
    if (value == null)
        return undefined;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
}
export function splitSemicolonList(value) {
    if (!value)
        return [];
    return value
        .split(";")
        .map((item) => item.trim())
        .filter(Boolean);
}
export function joinSemicolonList(values) {
    if (!values?.length)
        return undefined;
    const sanitized = values.map((item) => item.trim()).filter(Boolean);
    return sanitized.length ? sanitized.join(";") : undefined;
}
export function toOptionalDate(value) {
    if (!value)
        return undefined;
    const normalized = value.trim();
    if (!normalized)
        return undefined;
    if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
        const [year, month, day] = normalized.split("-").map(Number);
        if (!year || !month || !day)
            return undefined;
        return new Date(year, month - 1, day, 0, 0, 0, 0);
    }
    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}
export function toIsoDate(value) {
    if (!value)
        return undefined;
    return value.toISOString().slice(0, 10);
}
export function toStringId(value) {
    return typeof value === "bigint" ? value.toString() : String(value);
}
