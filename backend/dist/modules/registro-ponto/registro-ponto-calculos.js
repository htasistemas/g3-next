const HORARIO_PADRAO_PREVISTO = {
    entrada_1: "08:00",
    saida_1: "12:00",
    entrada_2: "13:00",
    saida_2: "17:00"
};
function toMinutes(hora) {
    if (!hora)
        return null;
    const partes = hora.slice(0, 5).split(":");
    if (partes.length !== 2)
        return null;
    const horas = Number(partes[0]);
    const minutos = Number(partes[1]);
    if (!Number.isInteger(horas) || !Number.isInteger(minutos))
        return null;
    return horas * 60 + minutos;
}
function registrarDesvio(detalhes, campo, minutos, tipo, horarioPrevisto, horarioReal) {
    if (minutos <= 0)
        return;
    detalhes.push({ campo, minutos, tipo, horario_previsto: horarioPrevisto, horario_real: horarioReal });
}
export function calcularDesviosRegistroPonto(previsto, real) {
    const detalhes = [];
    let horasExtrasMinutos = 0;
    let atrasosMinutos = 0;
    const campos = [
        { campo: "entrada_1", tipoEntrada: "entrada" },
        { campo: "saida_1", tipoEntrada: "saida" },
        { campo: "entrada_2", tipoEntrada: "entrada" },
        { campo: "saida_2", tipoEntrada: "saida" }
    ];
    for (const item of campos) {
        const horarioPrevistoTexto = String(previsto[item.campo] ?? HORARIO_PADRAO_PREVISTO[item.campo] ?? "");
        const horarioRealTexto = String(real[item.campo] ?? "");
        const horarioPrevisto = toMinutes(horarioPrevistoTexto);
        const horarioReal = toMinutes(horarioRealTexto);
        if (horarioPrevisto === null || horarioReal === null)
            continue;
        if (item.tipoEntrada === "entrada") {
            if (horarioReal < horarioPrevisto) {
                const minutos = horarioPrevisto - horarioReal;
                horasExtrasMinutos += minutos;
                registrarDesvio(detalhes, item.campo, minutos, "HORA_EXTRA", horarioPrevistoTexto, horarioRealTexto);
            }
            else if (horarioReal > horarioPrevisto) {
                const minutos = horarioReal - horarioPrevisto;
                atrasosMinutos += minutos;
                registrarDesvio(detalhes, item.campo, minutos, "ATRASO", horarioPrevistoTexto, horarioRealTexto);
            }
            continue;
        }
        if (horarioReal > horarioPrevisto) {
            const minutos = horarioReal - horarioPrevisto;
            horasExtrasMinutos += minutos;
            registrarDesvio(detalhes, item.campo, minutos, "HORA_EXTRA", horarioPrevistoTexto, horarioRealTexto);
        }
        else if (horarioReal < horarioPrevisto) {
            const minutos = horarioPrevisto - horarioReal;
            atrasosMinutos += minutos;
            registrarDesvio(detalhes, item.campo, minutos, "ATRASO", horarioPrevistoTexto, horarioRealTexto);
        }
    }
    return {
        horas_extras_minutos: horasExtrasMinutos,
        atrasos_minutos: atrasosMinutos,
        banco_horas_minutos: horasExtrasMinutos - atrasosMinutos,
        detalhes
    };
}
export function calcularResumoExibicaoRegistroPonto(args) {
    const desvios = calcularDesviosRegistroPonto(args.previsto, args.real);
    const totalTrabalhado = Math.max(0, (toMinutes(args.real.entrada_1) ?? 0) <= (toMinutes(args.real.saida_1) ?? 0)
        ? (toMinutes(args.real.saida_1) ?? 0) - (toMinutes(args.real.entrada_1) ?? 0)
        : 0) +
        Math.max(0, (toMinutes(args.real.entrada_2) ?? 0) <= (toMinutes(args.real.saida_2) ?? 0)
            ? (toMinutes(args.real.saida_2) ?? 0) - (toMinutes(args.real.entrada_2) ?? 0)
            : 0);
    const hojeIso = args.hoje.toISOString().slice(0, 10);
    const dataIso = args.dataReferencia.toISOString().slice(0, 10);
    const diaFechado = dataIso < hojeIso;
    const faltasMinutos = diaFechado ? Math.max(0, 8 * 60 - totalTrabalhado) : 0;
    return {
        horas_extras_minutos: desvios.horas_extras_minutos,
        atrasos_minutos: desvios.atrasos_minutos,
        banco_horas_minutos: desvios.banco_horas_minutos,
        faltas_minutos: faltasMinutos,
        total_trabalhado_minutos: totalTrabalhado
    };
}
