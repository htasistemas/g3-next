import sharp from "sharp";
const faceHashSize = 16;
const distanciaMaximaReconhecimentoFace = 56;
const assinaturaFaceV2Prefixo = "v2:";
const variacoesAssinaturaFace = [
    { cropRatio: 1, espelhar: false },
    { cropRatio: 0.9, espelhar: false },
    { cropRatio: 0.82, espelhar: false },
    { cropRatio: 1, espelhar: true },
    { cropRatio: 0.9, espelhar: true },
    { cropRatio: 0.82, espelhar: true }
];
function bitsParaHex(bits) {
    let hex = "";
    for (let index = 0; index < bits.length; index += 4) {
        const nibble = ((bits[index] ?? 0) << 3) |
            ((bits[index + 1] ?? 0) << 2) |
            ((bits[index + 2] ?? 0) << 1) |
            (bits[index + 3] ?? 0);
        hex += nibble.toString(16);
    }
    return hex;
}
export async function gerarHashFace(buffer) {
    const amostra = await gerarAmostraFace(buffer, { cropRatio: 1, espelhar: false });
    const media = amostra.reduce((total, valorAtual) => total + valorAtual, 0) / Math.max(amostra.length, 1);
    const bits = Array.from(amostra, (valorAtual) => (valorAtual >= media ? 1 : 0));
    return bitsParaHex(bits);
}
export async function gerarAssinaturaFace(buffer) {
    const hashes = await Promise.all(variacoesAssinaturaFace.map((variacao) => gerarHashFaceVariacao(buffer, variacao)));
    return `${assinaturaFaceV2Prefixo}${hashes.join("|")}`;
}
export function calcularDistanciaHashFace(hashA, hashB) {
    const tamanho = Math.min(hashA.length, hashB.length);
    let distancia = Math.abs(hashA.length - hashB.length) * 4;
    for (let index = 0; index < tamanho; index += 1) {
        const nibbleA = Number.parseInt(hashA[index] ?? "0", 16);
        const nibbleB = Number.parseInt(hashB[index] ?? "0", 16);
        const diferenca = (nibbleA ^ nibbleB) >>> 0;
        distancia +=
            ((diferenca >> 3) & 1) +
                ((diferenca >> 2) & 1) +
                ((diferenca >> 1) & 1) +
                (diferenca & 1);
    }
    return distancia;
}
export function calcularMenorDistanciaFace(hashCadastrado, hashAtual) {
    const hashesCadastrados = extrairHashesAssinatura(hashCadastrado);
    const hashesAtuais = extrairHashesAssinatura(hashAtual);
    let menorDistancia = Number.POSITIVE_INFINITY;
    for (const hashBase of hashesCadastrados) {
        for (const hashComparacao of hashesAtuais) {
            const distanciaAtual = calcularDistanciaHashFace(hashBase, hashComparacao);
            if (distanciaAtual < menorDistancia) {
                menorDistancia = distanciaAtual;
            }
        }
    }
    return Number.isFinite(menorDistancia) ? menorDistancia : Number.MAX_SAFE_INTEGER;
}
export function facesConferem(hashCadastrado, hashAtual) {
    return calcularMenorDistanciaFace(hashCadastrado, hashAtual) <= distanciaMaximaReconhecimentoFace;
}
function extrairHashesAssinatura(assinatura) {
    const valorNormalizado = assinatura.trim();
    if (!valorNormalizado) {
        return [];
    }
    if (!valorNormalizado.startsWith(assinaturaFaceV2Prefixo)) {
        return [valorNormalizado];
    }
    return valorNormalizado
        .slice(assinaturaFaceV2Prefixo.length)
        .split("|")
        .map((item) => item.trim())
        .filter(Boolean);
}
async function gerarHashFaceVariacao(buffer, variacao) {
    const amostra = await gerarAmostraFace(buffer, variacao);
    const media = amostra.reduce((total, valorAtual) => total + valorAtual, 0) / Math.max(amostra.length, 1);
    const bits = Array.from(amostra, (valorAtual) => (valorAtual >= media ? 1 : 0));
    return bitsParaHex(bits);
}
async function gerarAmostraFace(buffer, variacao) {
    const metadata = await sharp(buffer).rotate().metadata();
    let pipeline = sharp(buffer).rotate();
    if (variacao.cropRatio < 1 &&
        metadata.width &&
        metadata.height &&
        metadata.width > faceHashSize &&
        metadata.height > faceHashSize) {
        const width = Math.max(Math.round(metadata.width * variacao.cropRatio), faceHashSize);
        const height = Math.max(Math.round(metadata.height * variacao.cropRatio), faceHashSize);
        const left = Math.max(Math.floor((metadata.width - width) / 2), 0);
        const top = Math.max(Math.floor((metadata.height - height) / 2), 0);
        pipeline = pipeline.extract({ left, top, width, height });
    }
    if (variacao.espelhar) {
        pipeline = pipeline.flop();
    }
    return pipeline
        .resize(faceHashSize, faceHashSize, {
        fit: "cover",
        position: "centre"
    })
        .grayscale()
        .normalize()
        .raw()
        .toBuffer();
}
export { distanciaMaximaReconhecimentoFace };
