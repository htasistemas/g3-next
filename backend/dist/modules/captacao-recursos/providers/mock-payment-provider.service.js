import { createHash, randomUUID } from "node:crypto";
function hashSeed(seed) {
    return createHash("sha256").update(seed).digest("hex");
}
function gerarQrCodeSvg(seed) {
    const hash = hashSeed(seed);
    const moduleSize = 8;
    const margin = 6;
    const grid = 21;
    const total = (grid + margin * 2) * moduleSize;
    const rects = [];
    const isFinder = (x, y) => (x < 7 && y < 7) || (x >= grid - 7 && y < 7) || (x < 7 && y >= grid - 7);
    for (let y = 0; y < grid; y += 1) {
        for (let x = 0; x < grid; x += 1) {
            let fill = false;
            if (isFinder(x, y)) {
                const innerX = x % 7;
                const innerY = y % 7;
                fill =
                    innerX === 0 ||
                        innerX === 6 ||
                        innerY === 0 ||
                        innerY === 6 ||
                        ((innerX >= 2 && innerX <= 4) && (innerY >= 2 && innerY <= 4));
            }
            else {
                const idx = (y * grid + x) % hash.length;
                fill = Number.parseInt(hash[idx], 16) % 2 === 0;
            }
            if (fill) {
                rects.push(`<rect x="${(x + margin) * moduleSize}" y="${(y + margin) * moduleSize}" width="${moduleSize}" height="${moduleSize}" rx="1" ry="1" />`);
            }
        }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" role="img" aria-label="QR Code mock"><rect width="${total}" height="${total}" fill="#ffffff" rx="18" ry="18" /><g fill="#0f172a">${rects.join("")}</g></svg>`;
}
export class MockPaymentProviderService {
    getProviderName() {
        return "mock-g3n";
    }
    async createCharge(input) {
        const externalId = `mock_${randomUUID().replace(/-/g, "")}`;
        const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
        const payloadBase = {
            donationNumber: input.donationNumber,
            amount: input.amount,
            donorName: input.donorName,
            campaignName: input.campaignName ?? null,
            recurring: input.recurring ?? false
        };
        if (input.paymentMethod === "pix") {
            const txid = `G3N${Date.now()}`;
            const qrCodeCopiaCola = `00020126580014BR.GOV.BCB.PIX0114+550000000000520400005303986540${input.amount.toFixed(2).replace(".", "")}5802BR5913G3N CAPTACAO6009SAO PAULO62070503***6304${hashSeed(txid).slice(0, 4).toUpperCase()}`;
            return {
                provider: this.getProviderName(),
                externalId,
                status: "aguardando_pagamento",
                txid,
                paymentLink: `https://g3n.local/mock/pix/${externalId}`,
                qrCodeCopiaCola,
                qrCodeSvg: gerarQrCodeSvg(`${txid}:${qrCodeCopiaCola}`),
                expiresAt,
                payloadJson: { ...payloadBase, txid, qrCodeCopiaCola, expiresAt }
            };
        }
        if (input.paymentMethod === "boleto") {
            const nossoNumero = hashSeed(externalId).slice(0, 12);
            const linhaDigitavel = `34191.79001 01043.510047 91020.150008 6 96040000${String(Math.round(input.amount * 100)).padStart(10, "0")}`;
            return {
                provider: this.getProviderName(),
                externalId,
                status: "aguardando_pagamento",
                paymentLink: `https://g3n.local/mock/boleto/${externalId}`,
                linhaDigitavel,
                codigoBarras: linhaDigitavel.replace(/\D/g, ""),
                nossoNumero,
                dueDate: input.dueDate,
                expiresAt,
                payloadJson: { ...payloadBase, linhaDigitavel, nossoNumero, dueDate: input.dueDate }
            };
        }
        return {
            provider: this.getProviderName(),
            externalId,
            status: "aguardando_pagamento",
            paymentLink: `https://g3n.local/mock/cartao/${externalId}`,
            cardReference: hashSeed(externalId).slice(0, 16).toUpperCase(),
            expiresAt,
            payloadJson: { ...payloadBase, cardReference: hashSeed(externalId).slice(0, 16).toUpperCase() }
        };
    }
    async getChargeStatus(reference) {
        return { status: "aguardando_pagamento", payload: { reference } };
    }
    async cancelCharge(_reference) {
        return { status: "cancelado" };
    }
    async refundCharge(_reference) {
        return { status: "estornado" };
    }
    async createRecurring(input) {
        return this.createCharge({ ...input, recurring: true });
    }
    async cancelRecurring(_reference) {
        return { status: "cancelada" };
    }
    async handleWebhook(payload) {
        return { acknowledged: true, payload };
    }
}
