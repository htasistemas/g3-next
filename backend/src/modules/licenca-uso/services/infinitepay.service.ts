type InfinitePayItem = {
  quantity: number;
  price: number;
  description: string;
};

type InfinitePayCheckoutLinkRequest = {
  handle: string;
  order_nsu: string;
  items: InfinitePayItem[];
  redirect_url?: string;
  webhook_url?: string;
  customer?: {
    name?: string;
    email?: string;
  };
};

type InfinitePayCheckoutLinkResponse = {
  url?: string;
  message?: string;
  order_nsu?: string;
  invoice_slug?: string;
};

type InfinitePayPaymentCheckRequest = {
  handle: string;
  order_nsu: string;
  transaction_nsu: string;
  slug: string;
};

type InfinitePayPaymentCheckResponse = {
  success?: boolean;
  paid?: boolean;
  amount?: number;
  paid_amount?: number;
  capture_method?: string;
  installments?: number;
  receipt_url?: string;
  transaction_nsu?: string;
  order_nsu?: string;
  slug?: string;
};

const INFINITEPAY_BASE_URL = "https://api.infinitepay.io/invoices/public/checkout";

async function requestInfinitePay<T>(path: string, payload: Record<string, unknown>): Promise<T> {
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
    const errorMessage =
      typeof body === "string"
        ? body
        : typeof body === "object" && body !== null && "message" in body
          ? String((body as Record<string, unknown>).message ?? "")
          : JSON.stringify(body);
    const error = new Error(errorMessage || `InfinitePay respondeu ${response.status}`);
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }

  return body as T;
}

export class InfinitePayService {
  async createCheckoutLink(payload: InfinitePayCheckoutLinkRequest) {
    return requestInfinitePay<InfinitePayCheckoutLinkResponse>("links", payload);
  }

  async checkPayment(payload: InfinitePayPaymentCheckRequest) {
    return requestInfinitePay<InfinitePayPaymentCheckResponse>("payment_check", payload);
  }
}
