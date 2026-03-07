import { normalizeDigits } from "./string-utils.js";
export function isValidCpf(value) {
    const cpf = normalizeDigits(value);
    if (!cpf || cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
        return false;
    }
    const calculateDigit = (base, factor) => {
        const total = [...base].reduce((sum, char, index) => {
            return sum + Number(char) * (factor - index);
        }, 0);
        const remainder = (total * 10) % 11;
        return remainder === 10 ? 0 : remainder;
    };
    const digit1 = calculateDigit(cpf.slice(0, 9), 10);
    const digit2 = calculateDigit(cpf.slice(0, 10), 11);
    return digit1 === Number(cpf[9]) && digit2 === Number(cpf[10]);
}
export function isValidCep(value) {
    const cep = normalizeDigits(value);
    return !!cep && cep.length === 8;
}
export function isValidPhone(value) {
    const digits = normalizeDigits(value);
    return !!digits && (digits.length === 10 || digits.length === 11);
}
