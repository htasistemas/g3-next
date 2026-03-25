import sharp from "sharp";
const faceHashSize = 16;
const distanciaMaximaReconhecimentoFace = 40;
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
    const amostra = await sharp(buffer)
        .rotate()
        .resize(faceHashSize, faceHashSize, {
        fit: "cover",
        position: "centre"
    })
        .grayscale()
        .normalize()
        .raw()
        .toBuffer();
    const media = amostra.reduce((total, valorAtual) => total + valorAtual, 0) / Math.max(amostra.length, 1);
    const bits = Array.from(amostra, (valorAtual) => (valorAtual >= media ? 1 : 0));
    return bitsParaHex(bits);
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
export function facesConferem(hashCadastrado, hashAtual) {
    return calcularDistanciaHashFace(hashCadastrado, hashAtual) <= distanciaMaximaReconhecimentoFace;
}
export { distanciaMaximaReconhecimentoFace };
