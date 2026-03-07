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

export function validarCnpj(valor?: string | null): boolean {
  const cnpj = somenteDigitos(valor);
  if (!cnpj || cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) {
    return false;
  }

  const calcularDigito = (base: string, fatores: number[]) => {
    const total = [...base].reduce((soma, caractere, indice) => {
      return soma + Number(caractere) * fatores[indice];
    }, 0);
    const resto = total % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  const digito1 = calcularDigito(cnpj.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const digito2 = calcularDigito(cnpj.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return digito1 === Number(cnpj[12]) && digito2 === Number(cnpj[13]);
}
