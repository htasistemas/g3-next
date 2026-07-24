import path from "node:path";

export function resolverCaminhoAssetPublico(valor: string) {
  const ehFileUrl = /^file:\/\//i.test(valor);
  const semEsquema = valor.replace(/^file:\/\//i, "");
  if (ehFileUrl && path.isAbsolute(semEsquema)) return undefined;
  const relativo = semEsquema.replace(/^[/\\]+/, "");
  if (!relativo || relativo.split(/[\\/]+/).includes("..")) return undefined;

  const raizPublica = path.resolve(process.cwd(), "..", "frontend", "public");
  const candidato = path.resolve(raizPublica, relativo);
  const relativoRaiz = path.relative(raizPublica, candidato);
  if (relativoRaiz.startsWith("..") || path.isAbsolute(relativoRaiz)) return undefined;
  return candidato;
}
