export const classesTelaPadraoBeneficiario = {
  container:
    "g3-container space-y-4 rounded-2xl border border-[var(--g3-border)] bg-[linear-gradient(180deg,var(--g3-page-gradient-start)_0%,var(--g3-page-gradient-end)_100%)] p-3 sm:p-4",
  barraAcoes: "rounded-xl border border-[var(--g3-border)] bg-[var(--g3-card)] p-2",
  gradeAcoes: "grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end",
  botaoAcao:
    "w-full shadow-md shadow-[var(--g3-primary-soft)] transition-shadow hover:shadow-lg hover:shadow-[var(--g3-primary-soft)] sm:w-auto",
  gradePrincipal: "grid gap-4 xl:grid-cols-[240px_minmax(0,1fr)]",
  cardAbas: "h-fit min-w-0",
  conteudoAbas: "space-y-1.5 p-3",
  cardConteudo: "min-w-0",
  cabecalhoConteudo:
    "flex flex-row items-center justify-between gap-2 border-b-2 border-[var(--g3-active)] px-3 py-2",
  tituloAba:
    "inline-flex items-center gap-2 rounded-md bg-[var(--g3-primary-soft)] px-2 py-1 text-[var(--g3-active)]",
  tituloAbaTexto: "text-xs sm:text-sm",
  badgeCodigo: "default"
} as const;

export const ordemAcoesCrudPadrao = [
  "Buscar",
  "Novo",
  "Salvar",
  "Cancelar",
  "Excluir",
  "Imprimir",
  "Fechar"
] as const;

export function classeBotaoAbaLateral(ativa: boolean) {
  return `flex w-full items-center rounded-md border px-2.5 py-1.5 text-left text-[11px] font-semibold whitespace-nowrap ${
    ativa
      ? "border-[var(--g3-active)] bg-[var(--g3-primary-soft)] text-[var(--g3-active)]"
      : "border-[var(--g3-border)] bg-[var(--g3-primary-soft)] text-[var(--g3-active)] hover:bg-[var(--g3-primary-soft-hover)]"
  }`;
}

export function classeNumeroAbaLateral(ativa: boolean) {
  return `mr-2 inline-flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-xs font-bold ${
    ativa
      ? "bg-[var(--g3-primary-button)] text-white"
      : "border border-[var(--g3-border)] bg-white text-black"
  }`;
}
