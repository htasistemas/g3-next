export type RegistroPontoHorarioPrevisto = {
  entrada_1?: string | null;
  saida_1?: string | null;
  entrada_2?: string | null;
  saida_2?: string | null;
};

export type RegistroPontoHorarioReal = RegistroPontoHorarioPrevisto;

export type RegistroPontoDesvioCampo = {
  campo: "entrada_1" | "saida_1" | "entrada_2" | "saida_2";
  minutos: number;
  tipo: "ATRASO" | "HORA_EXTRA";
};

export type RegistroPontoDesvios = {
  horas_extras_minutos: number;
  atrasos_minutos: number;
  banco_horas_minutos: number;
  detalhes: RegistroPontoDesvioCampo[];
};

function toMinutes(hora?: string | null) {
  if (!hora) return null;
  const partes = hora.slice(0, 5).split(":");
  if (partes.length !== 2) return null;

  const horas = Number(partes[0]);
  const minutos = Number(partes[1]);
  if (!Number.isInteger(horas) || !Number.isInteger(minutos)) return null;

  return horas * 60 + minutos;
}

function registrarDesvio(
  detalhes: RegistroPontoDesvioCampo[],
  campo: RegistroPontoDesvioCampo["campo"],
  minutos: number,
  tipo: RegistroPontoDesvioCampo["tipo"]
) {
  if (minutos <= 0) return;
  detalhes.push({ campo, minutos, tipo });
}

export function calcularDesviosRegistroPonto(
  previsto: RegistroPontoHorarioPrevisto,
  real: RegistroPontoHorarioReal
): RegistroPontoDesvios {
  const detalhes: RegistroPontoDesvioCampo[] = [];
  let horasExtrasMinutos = 0;
  let atrasosMinutos = 0;

  const campos: Array<{
    campo: RegistroPontoDesvioCampo["campo"];
    tipoEntrada: "entrada" | "saida";
  }> = [
    { campo: "entrada_1", tipoEntrada: "entrada" },
    { campo: "saida_1", tipoEntrada: "saida" },
    { campo: "entrada_2", tipoEntrada: "entrada" },
    { campo: "saida_2", tipoEntrada: "saida" }
  ];

  for (const item of campos) {
    const horarioPrevisto = toMinutes(previsto[item.campo]);
    const horarioReal = toMinutes(real[item.campo]);
    if (horarioPrevisto === null || horarioReal === null) continue;

    if (item.tipoEntrada === "entrada") {
      if (horarioReal < horarioPrevisto) {
        const minutos = horarioPrevisto - horarioReal;
        horasExtrasMinutos += minutos;
        registrarDesvio(detalhes, item.campo, minutos, "HORA_EXTRA");
      } else if (horarioReal > horarioPrevisto) {
        const minutos = horarioReal - horarioPrevisto;
        atrasosMinutos += minutos;
        registrarDesvio(detalhes, item.campo, minutos, "ATRASO");
      }
      continue;
    }

    if (horarioReal > horarioPrevisto) {
      const minutos = horarioReal - horarioPrevisto;
      horasExtrasMinutos += minutos;
      registrarDesvio(detalhes, item.campo, minutos, "HORA_EXTRA");
    } else if (horarioReal < horarioPrevisto) {
      const minutos = horarioPrevisto - horarioReal;
      atrasosMinutos += minutos;
      registrarDesvio(detalhes, item.campo, minutos, "ATRASO");
    }
  }

  return {
    horas_extras_minutos: horasExtrasMinutos,
    atrasos_minutos: atrasosMinutos,
    banco_horas_minutos: horasExtrasMinutos - atrasosMinutos,
    detalhes
  };
}
