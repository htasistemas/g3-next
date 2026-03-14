export function parseGoogleClientIds(...sources) {
    const ids = sources
        .flatMap((source) => (source ?? "").split(","))
        .map((value) => value.trim())
        .filter((value) => value.length > 0);
    return Array.from(new Set(ids));
}
