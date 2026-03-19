type EventoLogico = {
  dataVisual: string;
  titulo: string;
  tipoEvento: string;
  abrangencia: string;
  uf?: string;
  municipio?: string;
};

export function buildDataComemorativaLogicalKey(evento: EventoLogico) {
  return [
    evento.dataVisual,
    evento.titulo.trim().toLowerCase(),
    evento.tipoEvento,
    evento.abrangencia,
    evento.uf?.trim().toUpperCase() ?? "",
    evento.municipio?.trim().toLowerCase() ?? ""
  ].join("|");
}

export function deduplicateDataComemorativaList<T extends EventoLogico>(eventos: T[]) {
  const vistos = new Set<string>();
  return eventos.filter((evento) => {
    const chave = buildDataComemorativaLogicalKey(evento);
    if (vistos.has(chave)) {
      return false;
    }
    vistos.add(chave);
    return true;
  });
}
