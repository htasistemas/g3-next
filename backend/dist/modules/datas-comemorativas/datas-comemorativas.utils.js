export function buildDataComemorativaLogicalKey(evento) {
    return [
        evento.dataVisual,
        evento.titulo.trim().toLowerCase(),
        evento.tipoEvento,
        evento.abrangencia,
        evento.uf?.trim().toUpperCase() ?? "",
        evento.municipio?.trim().toLowerCase() ?? ""
    ].join("|");
}
export function deduplicateDataComemorativaList(eventos) {
    const vistos = new Set();
    return eventos.filter((evento) => {
        const chave = buildDataComemorativaLogicalKey(evento);
        if (vistos.has(chave)) {
            return false;
        }
        vistos.add(chave);
        return true;
    });
}
