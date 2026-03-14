import { AppError } from "../../../shared/errors/app-error.js";
const dangerousExtensions = new Set([
    "exe",
    "bat",
    "cmd",
    "com",
    "dll",
    "msi",
    "sh",
    "ps1",
    "js",
    "jar",
    "scr"
]);
const mimeByExtension = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    pdf: "application/pdf",
    txt: "text/plain",
    csv: "text/csv",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
};
const extensionByMime = Object.fromEntries(Object.entries(mimeByExtension).map(([extension, mimeType]) => [mimeType, extension]));
export function normalizarNomeArquivo(nomeArquivo) {
    const nomeBase = (nomeArquivo ?? "arquivo")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9.\-_ ]+/g, " ")
        .trim()
        .replace(/\s+/g, "-")
        .toLowerCase();
    return nomeBase || "arquivo";
}
export function extrairExtensao(nomeArquivo) {
    const nome = normalizarNomeArquivo(nomeArquivo);
    const index = nome.lastIndexOf(".");
    if (index < 0 || index === nome.length - 1)
        return undefined;
    return nome.slice(index + 1).toLowerCase();
}
export function extToMime(extensao) {
    if (!extensao)
        return undefined;
    return mimeByExtension[extensao.toLowerCase()];
}
export function mimeToExt(mimeType) {
    if (!mimeType)
        return undefined;
    return extensionByMime[mimeType.toLowerCase()];
}
export function detectarMimeTypePorAssinatura(buffer) {
    if (buffer.length >= 4 && buffer.subarray(0, 4).toString("ascii") === "%PDF") {
        return "application/pdf";
    }
    if (buffer.length >= 8 &&
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47) {
        return "image/png";
    }
    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        return "image/jpeg";
    }
    if (buffer.length >= 12 &&
        buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
        buffer.subarray(8, 12).toString("ascii") === "WEBP") {
        return "image/webp";
    }
    return undefined;
}
export function parseBase64Payload(conteudo, fallbackMimeType) {
    const raw = conteudo.trim();
    if (!raw) {
        throw new AppError("Conteudo do arquivo nao informado.", 400);
    }
    const match = raw.match(/^data:([^;,]+);base64,(.+)$/i);
    if (match) {
        return {
            mimeType: match[1]?.trim().toLowerCase(),
            buffer: Buffer.from(match[2] ?? "", "base64")
        };
    }
    return {
        mimeType: fallbackMimeType?.trim().toLowerCase() || undefined,
        buffer: Buffer.from(raw, "base64")
    };
}
export function ehValorInlineDeArquivo(valor) {
    if (!valor)
        return false;
    const normalized = valor.trim();
    return normalized.startsWith("data:") || /^[a-zA-Z0-9+/=\r\n]+$/.test(normalized);
}
export function ehUrlExterna(valor) {
    if (!valor)
        return false;
    return /^https?:\/\//i.test(valor.trim());
}
export function normalizarCaminhoLogico(caminhoArquivo) {
    const normalized = caminhoArquivo.replace(/\\/g, "/").trim().replace(/^\/+/, "");
    if (!normalized || normalized.includes("..")) {
        throw new AppError("Caminho de arquivo invalido.", 400);
    }
    return normalized;
}
export function garantirExtensaoPermitida(extensao, permitidas) {
    const normalized = extensao.toLowerCase();
    if (dangerousExtensions.has(normalized)) {
        throw new AppError("Tipo de arquivo nao permitido.", 400);
    }
    if (!permitidas.includes(normalized)) {
        throw new AppError("Extensao de arquivo nao permitida.", 400);
    }
}
export function garantirMimeTypePermitido(mimeType, permitidos) {
    const normalized = mimeType.toLowerCase();
    if (!permitidos.includes(normalized)) {
        throw new AppError("Tipo MIME do arquivo nao permitido.", 400);
    }
}
export function formatarTamanhoBytes(tamanhoBytes) {
    const tamanho = typeof tamanhoBytes === "bigint" ? Number(tamanhoBytes) : tamanhoBytes;
    if (tamanho >= 1024 * 1024) {
        return `${(tamanho / (1024 * 1024)).toFixed(2)} MB`;
    }
    if (tamanho >= 1024) {
        return `${Math.round(tamanho / 1024)} KB`;
    }
    return `${tamanho} B`;
}
