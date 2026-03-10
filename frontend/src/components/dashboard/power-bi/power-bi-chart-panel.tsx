import { Expand, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type PowerBiChartPanelProps = {
  titulo: string;
  subtitulo?: string;
  vazio?: boolean;
  onExpand?: () => void;
  onExport?: () => void;
  children: React.ReactNode;
};

export function PowerBiChartPanel({
  titulo,
  subtitulo,
  vazio,
  onExpand,
  onExport,
  children
}: PowerBiChartPanelProps) {
  return (
    <Card className="border-[var(--g3-border)] bg-[var(--g3-card)] shadow-sm">
      <CardHeader className="flex flex-col gap-3 border-b border-[var(--g3-border)] pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold text-[var(--g3-foreground)]">{titulo}</CardTitle>
          {subtitulo ? <p className="text-xs text-[var(--g3-muted)]">{subtitulo}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onExport ? (
            <Button type="button" size="sm" variant="outline" onClick={onExport}>
              <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
              Exportar
            </Button>
          ) : null}
          {onExpand ? (
            <Button type="button" size="sm" variant="outline" onClick={onExpand}>
              <Expand className="mr-1.5 h-3.5 w-3.5" />
              Expandir
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {vazio ? (
          <div className="rounded-2xl border border-dashed border-[var(--g3-border)] bg-[var(--g3-card-soft)] px-4 py-10 text-center text-sm text-[var(--g3-muted)]">
            Sem dados disponíveis para os filtros aplicados.
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
