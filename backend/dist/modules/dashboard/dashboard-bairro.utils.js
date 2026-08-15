import { formatarTextoPadrao } from "../../utils/text-formatter.js";
const caracteresAcentuadosNormalizacao = "\u00E1\u00E0\u00E3\u00E2\u00E4\u00E9\u00E8\u00EA\u00EB\u00ED\u00EC\u00EE\u00EF\u00F3\u00F2\u00F5\u00F4\u00F6\u00FA\u00F9\u00FB\u00FC\u00E7";
export function normalizarBairro(valor) {
    return String(valor ?? "")
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase("pt-BR");
}
export function formatarBairro(valor) {
    const texto = String(valor ?? "").trim();
    return texto ? formatarTextoPadrao(texto) : "Nao informado";
}
export function sqlNormalizarBairro(coluna) {
    return `translate(lower(trim(coalesce(${coluna}, ''))), '${caracteresAcentuadosNormalizacao}', 'aaaaaeeeeiiiiooooouuuuc')`;
}
