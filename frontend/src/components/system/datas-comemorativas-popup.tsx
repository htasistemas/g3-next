import { CalendarDays, MapPin, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DataComemorativaPopupPayload } from "@/types/datas-comemorativas";

function badgeClass(destaqueFeriado: boolean) {
  return destaqueFeriado
    ? "bg-rose-100 text-rose-700"
    : "bg-[var(--g3-primary-soft)] text-[var(--g3-active)]";
}

export function DatasComemorativasPopup({
  popup,
  onClose,
  onDismissToday,
  onViewCalendar
}: {
  popup: DataComemorativaPopupPayload | null;
  onClose: () => void;
  onDismissToday: () => void;
  onViewCalendar: () => void;
}) {
  if (!popup?.exibirPopup) return null;

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center bg-slate-950/45 px-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-2xl border border-[var(--g3-border)] bg-[var(--g3-card)] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--g3-border)] px-5 py-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[var(--g3-primary-soft)] px-3 py-1 text-xs font-semibold text-[var(--g3-active)]">
              <PartyPopper className="h-3.5 w-3.5" />
              Comemorações de hoje
            </div>
            <h3 className="mt-3 text-lg font-semibold text-[var(--g3-foreground)]">{popup.titulo}</h3>
            <p className="text-sm text-[var(--g3-muted)]">{popup.subtitulo}</p>
          </div>
          <button
            type="button"
            className="rounded-md px-2 py-1 text-sm text-[var(--g3-muted)] hover:bg-slate-100"
            onClick={onClose}
          >
            Fechar
          </button>
        </div>

        <div className="max-h-[60vh] space-y-3 overflow-y-auto px-5 py-4">
          <p className="text-sm text-[var(--g3-muted)]">
            Não feche esta página se quiser revisar os eventos antes de continuar.
          </p>

          {popup.eventos.map((evento) => (
            <div key={evento.id} className="rounded-xl border border-[var(--g3-border)] px-4 py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${badgeClass(evento.destaqueFeriado)}`}>
                      {evento.destaqueFeriado ? "Feriado" : "Comemorativa"}
                    </span>
                    <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                      {evento.tipoEvento.replaceAll("_", " ")}
                    </span>
                  </div>
                  <h4 className="text-base font-semibold text-[var(--g3-foreground)]">{evento.titulo}</h4>
                  {evento.descricao ? <p className="text-sm text-[var(--g3-muted)]">{evento.descricao}</p> : null}
                  <div className="flex flex-wrap gap-3 text-xs text-[var(--g3-muted)]">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {evento.dataEvento}
                    </span>
                    {evento.uf || evento.municipio ? (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {[evento.municipio, evento.uf].filter(Boolean).join(" • ")}
                      </span>
                    ) : null}
                  </div>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                  Prioridade {evento.prioridadePopup}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--g3-border)] px-5 py-4">
          <Button type="button" variant="outline" onClick={onDismissToday}>
            Não mostrar novamente hoje
          </Button>
          <Button type="button" variant="outline" onClick={onViewCalendar}>
            Ver calendário completo
          </Button>
          <Button type="button" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}
