type PowerBiActiveFiltersProps = {
  filtros: Array<{ id: string; label: string; value: string }>;
};

export function PowerBiActiveFilters({ filtros }: PowerBiActiveFiltersProps) {
  if (!filtros.length) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {filtros.map((filtro) => (
        <span
          key={filtro.id}
          className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800"
        >
          {filtro.label}: {filtro.value}
        </span>
      ))}
    </div>
  );
}
