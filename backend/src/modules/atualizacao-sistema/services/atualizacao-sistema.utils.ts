import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";

export function compararVersoes(a?: string | null, b?: string | null) {
  const partesA = (a ?? "")
    .split(".")
    .map((item) => Number.parseInt(item, 10))
    .map((item) => (Number.isFinite(item) ? item : 0));
  const partesB = (b ?? "")
    .split(".")
    .map((item) => Number.parseInt(item, 10))
    .map((item) => (Number.isFinite(item) ? item : 0));

  const tamanho = Math.max(partesA.length, partesB.length);
  for (let indice = 0; indice < tamanho; indice += 1) {
    const valorA = partesA[indice] ?? 0;
    const valorB = partesB[indice] ?? 0;
    if (valorA > valorB) return 1;
    if (valorA < valorB) return -1;
  }

  return 0;
}

export function existeNovaVersao(versaoInstalada?: string | null, versaoPublicada?: string | null) {
  return compararVersoes(versaoPublicada, versaoInstalada) > 0;
}

export async function calcularSha256Arquivo(caminhoArquivo: string) {
  const hash = createHash("sha256");

  await new Promise<void>((resolve, reject) => {
    const stream = createReadStream(caminhoArquivo);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve());
  });

  return hash.digest("hex");
}

export function formatarDuracaoHumana(duracaoMs?: number | null) {
  if (!duracaoMs || duracaoMs < 0) return "0s";

  const totalSegundos = Math.floor(duracaoMs / 1000);
  const minutos = Math.floor(totalSegundos / 60);
  const segundos = totalSegundos % 60;

  if (!minutos) return `${segundos}s`;
  return `${minutos}min ${segundos}s`;
}
