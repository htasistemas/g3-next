export function somenteDigitos(valor?: string | null): string {
  return (valor ?? "").replace(/\D/g, "");
}

export function validarCpf(valor?: string | null): boolean {
  const cpf = somenteDigitos(valor);
  if (!cpf || cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
    return false;
  }

  const calcularDigito = (base: string, fator: number): number => {
    const total = [...base].reduce((soma, caractere, indice) => {
      return soma + Number(caractere) * (fator - indice);
    }, 0);
    const resto = (total * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  const digito1 = calcularDigito(cpf.slice(0, 9), 10);
  const digito2 = calcularDigito(cpf.slice(0, 10), 11);
  return digito1 === Number(cpf[9]) && digito2 === Number(cpf[10]);
}

export function validarCep(valor?: string | null): boolean {
  return somenteDigitos(valor).length === 8;
}
