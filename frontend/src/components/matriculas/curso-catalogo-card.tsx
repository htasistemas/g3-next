import { CalendarDays, Clock3, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";

export type CursoCatalogoCardProps = {
  nome: string;
  tipo: string;
  descricao?: string;
  imagemSrc?: string;
  primaryColor?: string;
  vagasTotais: number;
  vagasDisponiveis: number;
  inscritos?: number;
  fila?: number;
  horario?: string;
  periodo?: string;
  dias?: string;
  local?: string;
  encerramento?: string;
  situacao?: string;
  fase?: string;
  onInscrever: () => void;
};

const dataBr = (valor?: string) => valor
  ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(valor))
  : "Sem prazo definido";

export function CursoCatalogoCard({
  nome,
  tipo,
  descricao,
  imagemSrc,
  primaryColor = "#1d4ed8",
  vagasTotais,
  vagasDisponiveis,
  inscritos = 0,
  fila = 0,
  horario,
  periodo,
  dias,
  local,
  encerramento,
  situacao = "Inscrições abertas",
  fase = "Andamento",
  onInscrever
}: CursoCatalogoCardProps) {
  const ocupadas = Math.max(0, vagasTotais - vagasDisponiveis);
  const ocupacao = vagasTotais > 0 ? Math.min(100, Math.round((ocupadas / vagasTotais) * 100)) : 0;
  const possuiVagas = vagasDisponiveis > 0;

  return (
    <article className="space-y-3 rounded-xl border border-[var(--g3-border)] bg-gradient-to-br from-[var(--g3-card)] via-[var(--g3-primary-soft)]/45 to-[var(--g3-card)] p-3 text-left shadow-md transition hover:-translate-y-0.5 hover:border-[var(--g3-active)] hover:shadow-xl">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="relative mb-5 flex aspect-[4/3] w-full max-w-[220px] items-center justify-center overflow-hidden rounded-md border border-[var(--g3-border)] bg-[var(--g3-card-soft)] shadow-sm">
          {imagemSrc ? (
            <img
              src={imagemSrc}
              alt={`Foto de ${nome}`}
              className="h-full w-full rounded-md object-cover"
              loading="lazy"
              onError={(event) => {
                event.currentTarget.style.display = "none";
                event.currentTarget.parentElement?.querySelector("[data-sem-foto]")?.removeAttribute("hidden");
              }}
            />
          ) : null}
          <span data-sem-foto hidden={Boolean(imagemSrc)} className="px-2 text-center text-[10px] text-[var(--g3-muted)]">
            Sem foto
          </span>
          <div className="pointer-events-none absolute inset-x-2 bottom-0 flex translate-y-1/2 items-center justify-between gap-2">
            <span style={possuiVagas ? { color: primaryColor, borderColor: `${primaryColor}45`, backgroundColor: `${primaryColor}18` } : undefined} className={`rounded-full border px-2 py-1 text-[11px] font-semibold shadow-md ring-1 ring-black/10 ${possuiVagas ? "" : "border-rose-200 bg-rose-100/95 text-rose-700"}`}>
              {possuiVagas ? situacao : "Esgotado"}
            </span>
            <span className="rounded-full border border-sky-200 bg-sky-100/95 px-2 py-1 text-[11px] font-semibold text-sky-700 shadow-md ring-1 ring-black/10">
              {fase}
            </span>
          </div>
        </div>
        <p className="text-sm font-semibold text-[var(--g3-foreground)]">{tipo}: {nome}</p>
        <p className="text-xs text-[var(--g3-muted)]">{descricao || "Confira os detalhes desta oportunidade."}</p>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        {[['Vagas', `${vagasDisponiveis}/${vagasTotais}`], ['Inscritos', String(inscritos)], ['Fila', String(fila)]].map(([label, valor]) => (
          <div key={label} className="rounded-md border border-emerald-200 bg-gradient-to-br from-emerald-50 via-green-50 to-emerald-100/70 p-2 shadow-sm">
            <p className="text-[11px] font-medium text-emerald-800/80">{label}</p>
            <p className="font-semibold text-[var(--g3-foreground)]">{valor}</p>
          </div>
        ))}
      </div>

      <div className="space-y-1">
        <div className="h-2 overflow-hidden rounded-full bg-[var(--g3-primary-soft)]"><div className="h-full" style={{ width: `${ocupacao}%`, backgroundColor: primaryColor }} /></div>
        <p className="text-[11px] text-[var(--g3-muted)]">Ocupação: {ocupacao}% ({ocupadas} de {vagasTotais})</p>
      </div>

      <div className="space-y-1 text-xs text-[var(--g3-foreground)]">
        <p className="flex gap-1"><Clock3 className="h-3.5 w-3.5 shrink-0 text-[var(--g3-active)]" /><span><span className="text-[var(--g3-muted)]">Horário das aulas:</span> {horario || "---"}</span></p>
        <p className="flex gap-1"><CalendarDays className="h-3.5 w-3.5 shrink-0 text-[var(--g3-active)]" /><span><span className="text-[var(--g3-muted)]">Período do curso:</span> {periodo || "---"}</span></p>
        <p className="flex gap-1"><MapPin className="h-3.5 w-3.5 shrink-0 text-[var(--g3-active)]" /><span><span className="text-[var(--g3-muted)]">Dias:</span> {dias || "---"}</span></p>
        <p><span className="text-[var(--g3-muted)]">Vagas restantes:</span> {vagasDisponiveis}</p>
        <p><span className="text-[var(--g3-muted)]">Local:</span> {local || "---"}</p>
        <p><span className="text-[var(--g3-muted)]">Inscrições até:</span> {dataBr(encerramento)}</p>
      </div>

      <Button type="button" className="w-full shadow-sm" style={{ backgroundColor: primaryColor }} onClick={onInscrever} disabled={!possuiVagas && situacao !== "Lista de espera"}>
        {possuiVagas || situacao === "Lista de espera" ? "Quero me inscrever" : "Inscrições encerradas"}
      </Button>
    </article>
  );
}
