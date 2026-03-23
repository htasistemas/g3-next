const INFINITEPAY_BASE_URL = "https://api.infinitepay.io/invoices/public/checkout";
async function requestInfinitePay(path, payload) {
    const response = await fetch(`${INFINITEPAY_BASE_URL}/${path}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });
    const contentType = response.headers.get("content-type") ?? "";
    const body = contentType.includes("application/json") ? await response.json() : await response.text();
    if (!response.ok) {
        const errorMessage = typeof body === "string"
            ? body
            : typeof body === "object" && body !== null && "message" in body
                ? String(body.message ?? "")
                : JSON.stringify(body);
        const error = new Error(errorMessage || `InfinitePay respondeu ${response.status}`);
        error.status = response.status;
        throw error;
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
