export function parseGoogleClientIds(...sources: Array<string | undefined>) {
  const ids = sources
    .flatMap((source) => (source ?? "").split(","))
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  return Array.from(new Set(ids));
}
