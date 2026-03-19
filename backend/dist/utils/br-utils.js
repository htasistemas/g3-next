import { normalizeDigits, trimOrUndefined } from "./string-utils.js";
export function normalizarCpf(valor) {
    return normalizeDigits(valor);
}
export function normalizarCnpj(valor) {
    return normalizeDigits(valor);
}
export function validarCpf(valor) {
    const cpf = normalizarCpf(valor);
    if (!cpf || cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
        return false;
    }
    const calcularDigito = (base, fator) => {
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
export function validarCnpj(valor) {
    const cnpj = normalizarCnpj(valor);
    if (!cnpj || cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) {
        return false;
    }
    const calcularDigito = (base, pesos) => {
        const total = [...base].reduce((soma, caractere, indice) => {
            return soma + Number(caractere) * pesos[indice];
        }, 0);
        const resto = total % 11;
        return resto < 2 ? 0 : 11 - resto;
    };
    const digito1 = calcularDigito(cnpj.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    const digito2 = calcularDigito(cnpj.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    return digito1 === Number(cnpj[12]) && digito2 === Number(cnpj[13]);
}
export function normalizarEmail(valor) {
    const texto = trimOrUndefined(valor);
    return texto ? texto.toLowerCase() : undefined;
}
export function validarEmail(valor) {
    const email = normalizarEmail(valor);
    if (!email)
        return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
export function normalizarTelefone(valor) {
    return normalizeDigits(valor);
}
export function normalizarCep(valor) {
    return normalizeDigits(valor);
}
export function calcularIdade(dataIso) {
    if (!dataIso)
        return undefined;
    const data = new Date(`${dataIso}T00:00:00`);
    if (Number.isNaN(data.getTime()))
        return undefined;
    const hoje = new Date();
    let idade = hoje.getFullYear() - data.getFullYear();
    const aniversarioAindaNaoPassou = hoje.getMonth() < data.getMonth() ||
        (hoje.getMonth() === data.getMonth() && hoje.getDate() < data.getDate());
    if (aniversarioAindaNaoPassou) {
        idade -= 1;
    }
    return idade >= 0 ? idade : undefined;
}
