import fs from "node:fs/promises";
import path from "node:path";
import Tesseract from "tesseract.js";
import sharp from "sharp";
import { AppError } from "../../../shared/errors/app-error.js";
let workerPromise;
async function obterWorker() {
    if (!workerPromise) {
        workerPromise = (async () => {
            const cachePath = path.resolve(process.cwd(), "storage", "geral", "outros", "ocr-cache-beneficiarios");
            await fs.mkdir(cachePath, { recursive: true });
            const worker = await Tesseract.createWorker("por+eng", 1, { cachePath });
            await worker.setParameters({ preserve_interword_spaces: "1" });
            return worker;
        })();
    }
    return workerPromise;
}
function formatarCpf(cpf) {
    return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
}
function extrairCpf(texto) {
    const candidatos = texto.match(/\d[\d.\s-]{9,16}\d/g) ?? [];
    for (const candidato of candidatos) {
        const digitos = candidato.replace(/\D/g, "");
        if (digitos.length === 11)
            return formatarCpf(digitos);
    }
    return "";
}
export class BeneficiarioOcrService {
    async lerCpf(file) {
        if (!file)
            throw new AppError("Selecione uma imagem do CPF.", 400);
        if (!file.mimetype.startsWith("image/")) {
            throw new AppError("Para ler o CPF, envie uma imagem JPG, PNG ou similar.", 415);
        }
        if (file.size > 10 * 1024 * 1024) {
            throw new AppError("A imagem do CPF deve ter no máximo 10 MB.", 413);
        }
        const imagem = await sharp(file.buffer).grayscale().normalize().sharpen().png().toBuffer();
        const worker = await obterWorker();
        const resultado = await worker.recognize(imagem, { rotateAuto: true });
        const texto = String(resultado.data.text ?? "").trim();
        const cpf = extrairCpf(texto);
        return {
            tipoDocumento: "CPF",
            cpf,
            texto,
            confianca: Number(resultado.data.confidence ?? 0),
            mensagem: cpf
                ? "CPF identificado. Confira o número antes de aplicar ao cadastro."
                : "Não foi possível identificar um CPF com segurança. Digite o número manualmente."
        };
    }
}
