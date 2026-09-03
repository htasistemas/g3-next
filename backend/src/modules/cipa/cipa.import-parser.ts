import XLSX from "xlsx";
import { AppError } from "../../shared/errors/app-error.js";

export type CipaImportRow = {
  linha: number;
  matricula: string;
  nomeCompleto: string;
  cpf: string;
  dataNascimento: string;
  dataAdmissao: string;
  cargo?: string;
  setor?: string;
  turno?: string;
};

function texto(row: Record<string, unknown>, nomes: string[]) {
  const normalizar = (item: string) => item.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/gu, "").replace(/[\s_/-]/gu, "");
  const chave = Object.keys(row).find((item) => nomes.includes(normalizar(item)));
  return chave ? String(row[chave] ?? "").trim() : "";
}

export function lerCipaImportacao(buffer: Buffer, nomeArquivo: string): CipaImportRow[] {
  const ext = nomeArquivo.toLowerCase().split(".").pop();
  if (!ext || !["csv", "xls", "xlsx"].includes(ext)) throw new AppError("Envie uma planilha CSV, XLS ou XLSX.", 422);
  let workbook: XLSX.WorkBook;
  try { workbook = XLSX.read(buffer, { type: "buffer", cellDates: true, raw: false }); } catch { throw new AppError("Não foi possível ler a planilha enviada.", 422); }
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new AppError("A planilha não possui uma aba para importação.", 422);
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  if (rows.length > 10000) throw new AppError("A planilha excede o limite de 10.000 linhas por importação.", 422);
  return rows.map((row, index) => ({
    linha: index + 2,
    matricula: texto(row, ["matricula", "registro", "codigo", "codigointerno"]),
    nomeCompleto: texto(row, ["nome", "nomecompleto", "colaborador"]),
    cpf: texto(row, ["cpf"]),
    dataNascimento: texto(row, ["datanascimento", "nascimento"]),
    dataAdmissao: texto(row, ["dataadmissao", "admissao"]),
    cargo: texto(row, ["cargo", "funcao"]),
    setor: texto(row, ["setor", "departamento"]),
    turno: texto(row, ["turno", "jornada"])
  }));
}
