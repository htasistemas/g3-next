export function abrirRelatorioPdf(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const novaAba = window.open(url, "_blank", "noopener,noreferrer");

  if (!novaAba) {
    URL.revokeObjectURL(url);
    throw new Error("O navegador bloqueou a abertura do relatório em nova guia.");
  }

  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
