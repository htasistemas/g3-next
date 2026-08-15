import { AppError } from "../../../shared/errors/app-error.js";
const INFINITEPAY_BASE_URL = "https://api.checkout.infinitepay.io";
async function requestInfinitePay(path, payload) {
    let response;
    try {
        response = await fetch(`${INFINITEPAY_BASE_URL}/${path}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });
    }
    catch (error) {
        const mensagem = error instanceof Error ? error.message : "Falha de rede ao comunicar com a InfinitePay.";
        throw new AppError(`Nao foi possivel comunicar com a InfinitePay. ${mensagem}`.trim(), 502);
    }
    const contentType = response.headers.get("content-type") ?? "";
    const body = contentType.includes("application/json") ? await response.json() : await response.text();
    if (!response.ok) {
        const errorMessage = typeof body === "string"
            ? body
            : typeof body === "object" && body !== null && "message" in body
                ? String(body.message ?? "")
                : JSON.stringify(body);
        throw new AppError(`InfinitePay recusou a requisicao de checkout${errorMessage ? `: ${errorMessage}` : ""}`.trim(), response.status >= 500 ? 502 : 400);
    }
    return body;
}
export class InfinitePayService {
    async createCheckoutLink(payload) {
        return requestInfinitePay("links", payload);
    }
    async checkPayment(payload) {
        return requestInfinitePay("payment_check", payload);
    }
}
