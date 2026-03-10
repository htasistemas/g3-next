import { useDeferredValue, useMemo, useState } from "react";
import { Download, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PowerBiDetalheTabela } from "@/types/power-bi";

type PowerBiDetailModalProps = {
  aberto: boolean;
  tabela?: PowerBiDetalheTabela | null;
  onClose: () => void;
  onExportCsv?: (tabela: PowerBiDetalheTabela) => void;
};

const tamanhoPagina = 12;

export function PowerBiDetailModal({
  aberto,
  tabela,
  onClose,
  onExportCsv
}: PowerBiDetailModalProps) {
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(1);
  const buscaAdiada = useDeferredValue(busca);

  const linhasFiltradas = useMemo(() => {
    if (!tabela) return [];
    const termo = buscaAdiada.trim().toLocaleLowerCase("pt-BR");
    if (!termo) return tabela.linhas;

    return tabela.linhas.filter((linha) =>
      tabela.colunas.some((coluna) =>
        String(linha[coluna.key] ?? "")
          .toLocaleLowerCase("pt-BR")
          .includes(termo)
      )
    );
  }, [buscaAdiada, tabela]);

  const totalPaginas = Math.max(1, Math.ceil(linhasFiltradas.length / tamanhoPagina));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const linhasPagina = linhasFiltradas.slice(
    (paginaAtual - 1) * tamanhoPagina,
    paginaAtual * tamanhoPagina
  );

  if (!aberto || !tabela) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/55 px-4 py-6"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-[var(--g3-border)] bg-[var(--g3-card)] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex flex-col gap-3 border-b border-[var(--g3-border)] px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-[var(--g3-foreground)]">{tabela.titulo}</h3>
            {tabela.descricao ? <p className="text-sm text-[var(--g3-muted)]">{tabela.descricao}</p> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {onExportCsv ? (
              <Button type="button" size="sm" variant="outline" onClick={() => onExportCsv(tabela)}>
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Exportar CSV
              </Button>
            ) : null}
            <Button type="button" size="sm" variant="outline" onClick={onClose}>
              <X className="mr-1.5 h-3.5 w-3.5" />
              Fechar
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-4 px-5 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--g3-muted)]" />
              <Input
                value={busca}
                onChange={(event) => {
                  setBusca(event.target.value);
                  setPagina(1);
                }}
                placeholder="Buscar no detalhamento"
                className="pl-9"
              />
            </div>
            <p className="text-sm text-[var(--g3-muted)]">
              {linhasFiltradas.length.toLocaleString("pt-BR")} registro(s)
            </p>
          </div>

          <div className="overflow-auto rounded-2xl border border-[var(--g3-border)]">
            <table className="min-w-full text-sm">
              <thead className="bg-[var(--g3-primary-soft)] text-[var(--g3-active)]">
                <tr>
                  {tabela.colunas.map((coluna) => (
                    <th key={coluna.key} className="px-3 py-2 text-left font-semibold">
                      {coluna.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {linhasPagina.length ? (
                  linhasPagina.map((linha, index) => (
                    <tr
                      key={`${paginaAtual}-${index}`}
                      className={`border-t border-[var(--g3-border)] ${
                        index % 2 === 0 ? "bg-[var(--g3-card)]" : "bg-[var(--g3-card-soft)]/60"
                      }`}
                    >
                      {tabela.colunas.map((coluna) => (
                        <td key={coluna.key} className="px-3 py-2 align-top text-[var(--g3-foreground)]">
                          {String(linha[coluna.key] ?? "---")}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={tabela.colunas.length}
                      className="px-3 py-8 text-center text-sm text-[var(--g3-muted)]"
                    >
                      Nenhum registro encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-sm text-[var(--g3-muted)]">
            <span>
              Página {paginaAtual} de {totalPaginas}
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setPagina((atual) => Math.max(1, atual - 1))}
                disabled={paginaAtual <= 1}
              >
                Anterior
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setPagina((atual) => Math.min(totalPaginas, atual + 1))}
                disabled={paginaAtual >= totalPaginas}
              >
                Próxima
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
