import { LoaderCircle } from "lucide-react";

type MaintenanceScreenProps = {
  titulo?: string;
  mensagemPrincipal?: string;
  mensagemSecundaria?: string;
  rodape?: string;
  statusLabel?: string;
  mostrarMensagemNaoFechar?: boolean;
  previsao?: string | null;
  changelogResumido?: string | null;
};

export function MaintenanceScreen({
  titulo = "Sistema em atualização",
  mensagemPrincipal = "Estamos aplicando melhorias no G3N para oferecer mais estabilidade e desempenho.",
  mensagemSecundaria = "Em instantes o sistema estará disponível novamente. Aguarde um momento.",
  rodape = "HTA Sistemas • G3N – Sistema de gestão do terceiro setor",
  statusLabel = "Atualização em andamento",
  mostrarMensagemNaoFechar = true,
  previsao,
  changelogResumido
}: MaintenanceScreenProps) {
  const possuiExtras = Boolean(previsao?.trim() || changelogResumido?.trim());

  return (
    <main
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8 text-[var(--g3-foreground)]"
      style={{
        background:
          "radial-gradient(circle at top left, rgba(187,247,208,0.82), transparent 34%), radial-gradient(circle at bottom right, rgba(219,234,254,0.72), transparent 30%), linear-gradient(180deg, #f4fbf7 0%, #eef7f1 48%, #e6f3ea 100%)"
      }}
    >
      <div className="pointer-events-none absolute left-[-6rem] top-[-3rem] h-80 w-80 rounded-full bg-emerald-300/30 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-4rem] right-[-5rem] h-80 w-80 rounded-full bg-blue-200/40 blur-3xl" />

      <section className="relative z-10 w-full max-w-[720px] rounded-[28px] border border-[rgba(15,122,67,0.12)] bg-white/90 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.12)] backdrop-blur md:p-7">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,#0c5c34,#0f7a43)] text-base font-extrabold tracking-[0.08em] text-white shadow-[0_16px_30px_rgba(12,92,52,0.28)]">
              G3N
            </div>
            <div>
              <p className="m-0 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--g3-active)]">
                HTA Sistemas
              </p>
              <p className="m-0 text-sm text-[var(--g3-muted)]">Sistema de gestão do terceiro setor</p>
            </div>
          </div>

          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-emerald-200/80 bg-emerald-50/80 text-[var(--g3-active)]">
            <LoaderCircle className="h-7 w-7 animate-spin" style={{ animationDuration: "2.2s" }} />
          </div>
        </header>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <button
            type="button"
            disabled
            className="inline-flex cursor-not-allowed items-center justify-center rounded-full bg-[linear-gradient(135deg,rgba(15,122,67,0.12),rgba(187,247,208,0.8))] px-4 py-2.5 text-sm font-bold text-[var(--g3-primary-button-hover)] shadow-[inset_0_0_0_1px_rgba(15,122,67,0.1)]"
          >
            {statusLabel}
          </button>
          {mostrarMensagemNaoFechar ? (
            <span className="text-sm font-semibold text-[var(--g3-muted)]">Não feche esta página.</span>
          ) : null}
        </div>

        <div className="mt-7 space-y-3">
          <h1 className="text-[clamp(2rem,4vw,2.8rem)] font-bold leading-[1.05] tracking-[-0.03em] text-[var(--g3-foreground)]">
            {titulo}
          </h1>
          <p className="max-w-[58ch] text-base leading-7 text-slate-900/90">{mensagemPrincipal}</p>
          <p className="max-w-[58ch] text-base leading-7 text-[var(--g3-muted)]">{mensagemSecundaria}</p>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <article className="min-h-[112px] rounded-[20px] border border-emerald-100 bg-white/90 p-4">
            <span className="mb-2.5 inline-block text-[11px] font-bold uppercase tracking-[0.12em] text-blue-700">
              Status
            </span>
            <p className="m-0 text-sm leading-6 text-slate-900/90">
              Atualização controlada em andamento com retorno automático ao fim do deploy.
            </p>
          </article>
          <article className="min-h-[112px] rounded-[20px] border border-emerald-100 bg-white/90 p-4">
            <span className="mb-2.5 inline-block text-[11px] font-bold uppercase tracking-[0.12em] text-blue-700">
              Orientação
            </span>
            <p className="m-0 text-sm leading-6 text-slate-900/90">
              Aguarde nesta página enquanto concluímos a atualização em segurança.
            </p>
          </article>
          {possuiExtras ? (
            <>
              <article className="min-h-[112px] rounded-[20px] border border-emerald-100 bg-white/90 p-4">
                <span className="mb-2.5 inline-block text-[11px] font-bold uppercase tracking-[0.12em] text-blue-700">
                  Previsão
                </span>
                <p className="m-0 text-sm leading-6 text-slate-900/90">{previsao || "Em breve"}</p>
              </article>
              <article className="min-h-[112px] rounded-[20px] border border-emerald-100 bg-white/90 p-4">
                <span className="mb-2.5 inline-block text-[11px] font-bold uppercase tracking-[0.12em] text-blue-700">
                  Resumo da atualização
                </span>
                <p className="m-0 text-sm leading-6 text-slate-900/90">
                  {changelogResumido || "Espaço reservado para changelog resumido e status detalhado."}
                </p>
              </article>
            </>
          ) : null}
        </div>

        <footer className="mt-6 border-t border-emerald-100 pt-4 text-sm text-[var(--g3-muted)]">
          {rodape}
        </footer>
      </section>
    </main>
  );
}
