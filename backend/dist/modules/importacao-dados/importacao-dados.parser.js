import XLSX from "xlsx";
import { AppError } from "../../shared/errors/app-error.js";
const LIMITE_BYTES = 25 * 1024 * 1024;
const LIMITE_LINHAS = 100_000;
function csvEscape(value) {
    return `"${value.replace(/"/g, '""')}"`;
}
function parseCsv(texto) {
    const normalizado = texto.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
    const primeiraLinha = normalizado.split("\n", 1)[0] ?? "";
    const separador = (primeiraLinha.match(/;/g)?.length ?? 0) > (primeiraLinha.match(/,/g)?.length ?? 0) ? ";" : ",";
    const linhas = [];
    let atual = "";
    let linha = [];
    let aspas = false;
    for (const caractere of normalizado) {
        if (caractere === '"') {
            if (aspas && atual.endsWith('"'))
                atual = atual.slice(0, -1);
            else
                aspas = !aspas;
            atual += caractere;
        }
        else if (caractere === separador && !aspas) {
            linha.push(atual.replace(/^"|"$/g, ""));
            atual = "";
        }
        else if (caractere === "\n" && !aspas) {
            linha.push(atual.replace(/^"|"$/g, ""));
            linhas.push(linha);
            linha = [];
            atual = "";
        }
        else
            atual += caractere;
    }
    if (atual || linha.length) {
        linha.push(atual.replace(/^"|"$/g, ""));
        linhas.push(linha);
    }
    const cabecalho = (linhas.shift() ?? []).map((item) => item.trim());
    return linhas.filter((item) => item.some((valor) => valor.trim())).map((item) => Object.fromEntries(cabecalho.map((chave, index) => [chave, (item[index] ?? "").trim()])));
}
export function lerArquivoImportacao(buffer, nomeArquivo) {
    if (buffer.length > LIMITE_BYTES)
        throw new AppError("O arquivo excede o limite de 25 MB.", 413);
    const extensao = nomeArquivo.toLowerCase().split(".").pop();
    if (!extensao || !["csv", "xlsx", "xls"].includes(extensao)) {
        throw new AppError("Envie um arquivo CSV, XLSX ou XLS.", 400);
    }
    let linhas;
    if (extensao === "csv") {
        linhas = parseCsv(buffer.toString("utf8"));
    }
    else {
        try {
            const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false, raw: false });
            const primeiraAba = workbook.SheetNames[0];
            if (!primeiraAba)
                throw new Error("Planilha sem abas.");
            linhas = XLSX.utils.sheet_to_json(workbook.Sheets[primeiraAba], { defval: "" });
        }
        catch {
            throw new AppError("Não foi possível ler a planilha. Verifique se o arquivo não está corrompido.", 422);
        }
    }
    if (!linhas.length)
        throw new AppError("O arquivo não possui registros após o cabeçalho.", 422);
    if (linhas.length > LIMITE_LINHAS)
        throw new AppError("O arquivo excede o limite de 100.000 linhas.", 413);
    return { linhas, colunas: Object.keys(linhas[0] ?? []), tamanhoBytes: buffer.length };
}
export function gerarRelatorioCsv(linhas) {
    const cabecalho = ["linha", "status", "nome_completo", "cpf", "data_nascimento", "motivo"];
    const registros = linhas.map((item) => [
        String(item.linha), item.status, String(item.dados.nome_completo ?? ""), String(item.dados.cpf ?? ""),
        String(item.dados.data_nascimento ?? ""), item.problemas.map((problema) => problema.mensagem).join(" | ")
    ]);
    return `\uFEFF${[cabecalho, ...registros].map((linha) => linha.map(csvEscape).join(";")).join("\n")}`;
}
