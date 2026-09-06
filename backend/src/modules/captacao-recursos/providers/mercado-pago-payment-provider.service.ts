import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../../../config/env.js";
import { AppError } from "../../../shared/errors/app-error.js";
import type { PaymentChargeInput, PaymentChargeResult } from "../captacao-recursos.types.js";
import type { PaymentProviderInterface } from "./payment-provider.interface.js";
import { MercadoPagoConfigRepository } from "../repositories/mercado-pago-config.repository.js";

type MercadoPagoPayload = Record<string, any>;

export type MercadoPagoLicencaAssinaturaInput = {
  referencia: string;
  descricao: string;
  emailPagador: string;
  valorInicial: number;
  valorRecorrente: number;
  mesesPorCiclo: number;
  urlRetorno: string;
};

function statusOf(value: unknown): PaymentChargeResult["status"] {
  switch (String(value ?? "").toLowerCase()) {
    case "approved": return "confirmado";
    case "refunded":
    case "charged_back": return "estornado";
    case "cancelled":
    case "rejected": return "cancelado";
    default: return "aguardando_pagamento";
  }
}

export function validarAssinaturaMercadoPago(signature: string | undefined, requestId: string | undefined, dataId: string | undefined, secret: string | undefined, maxSkewSeconds: number) {
  if (!secret || !signature || !requestId || !dataId) return false;
  const values = Object.fromEntries(signature.split(",").map((item) => item.split("=") as [string, string]));
  const timestamp = Number(values.ts);
  if (!Number.isFinite(timestamp) || Math.abs(Date.now() - timestamp * 1000) > maxSkewSeconds * 1000) return false;
  const manifest = `id:${dataId};request-id:${requestId};ts:${values.ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");
  const received = values.v1 ?? "";
  return received.length === expected.length && timingSafeEqual(Buffer.from(received), Buffer.from(expected));
}

function requiredEmail(input: PaymentChargeInput) {
  if (!input.payerEmail) throw new AppError("O doador precisa ter um e-mail para gerar a cobrança no Mercado Pago.", 400);
  return input.payerEmail;
}

export class MercadoPagoPaymentProviderService implements PaymentProviderInterface {
  private readonly configRepository = new MercadoPagoConfigRepository();
  private readonly configPromise;

  constructor(private readonly tenantId?: string) {
    this.configPromise = this.configRepository.obter(tenantId);
  }

  getProviderName() { return "mercado-pago"; }

  private async request(path: string, init: RequestInit = {}) {
    const stored = await this.configPromise;
    if (stored && !stored.ativo) throw new AppError("A integração do Mercado Pago está desativada nas Configurações gerais.", 409);
    const accessToken = stored?.accessToken ?? env.MERCADOPAGO_ACCESS_TOKEN;
    if (!accessToken) throw new AppError("Mercado Pago não está configurado no servidor.", 503);
    const apiUrl = stored?.apiUrl || env.MERCADOPAGO_API_URL;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch(`${apiUrl}${path}`, {
        ...init,
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          ...(init.headers ?? {})
        }
      });
      const payload = await response.json().catch(() => ({})) as MercadoPagoPayload;
      if (!response.ok) {
        const message = typeof payload?.message === "string" ? payload.message : "Mercado Pago recusou a operação.";
        throw new AppError(message, response.status >= 500 ? 502 : 400);
      }
      return payload as MercadoPagoPayload;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Não foi possível comunicar com o Mercado Pago. Tente novamente.", 502);
    } finally { clearTimeout(timeout); }
  }

  async createCharge(input: PaymentChargeInput): Promise<PaymentChargeResult> {
    const stored = await this.configPromise;
    const notificationUrl = stored?.webhookUrl ?? env.MERCADOPAGO_WEBHOOK_URL;
    if (input.recurring) throw new AppError("Doações recorrentes no Mercado Pago exigem configuração de assinatura e ainda não foram habilitadas.", 501);
    if (input.paymentMethod === "pix") {
      const payload = await this.request("/v1/payments", {
        method: "POST",
        headers: { "X-Idempotency-Key": `g3n-doacao-${input.donationNumber}` },
        body: JSON.stringify({
          transaction_amount: Number(input.amount.toFixed(2)),
          description: `Doação ${input.donationNumber}${input.campaignName ? ` - ${input.campaignName}` : ""}`,
          payment_method_id: "pix",
          payer: { email: requiredEmail(input) },
          external_reference: input.donationNumber,
          notification_url: notificationUrl
        })
      });
      const transactionData = payload.point_of_interaction?.transaction_data ?? {};
      return {
        provider: this.getProviderName(), externalId: String(payload.id), txid: String(payload.id),
        status: statusOf(payload.status), qrCodeCopiaCola: transactionData.qr_code,
        paymentLink: transactionData.ticket_url, expiresAt: payload.date_of_expiration,
        payloadJson: payload
      };
    }

    const payload = await this.request("/checkout/preferences", {
      method: "POST",
      headers: { "X-Idempotency-Key": `g3n-doacao-${input.donationNumber}` },
      body: JSON.stringify({
        items: [{ title: `Doação ${input.donationNumber}`, quantity: 1, unit_price: Number(input.amount.toFixed(2)), currency_id: "BRL" }],
        payer: { email: requiredEmail(input) },
        external_reference: input.donationNumber,
        notification_url: notificationUrl
      })
    });
    return {
      provider: this.getProviderName(), externalId: String(payload.id), status: "aguardando_pagamento",
      paymentLink: env.NODE_ENV === "production" ? payload.init_point : (payload.sandbox_init_point ?? payload.init_point),
      payloadJson: payload
    };
  }

  async getChargeStatus(reference: string) {
    const payload = await this.request(`/v1/payments/${encodeURIComponent(reference)}`);
    return { status: String(payload.status ?? "pending"), payload };
  }

  async criarAssinaturaLicenca(input: MercadoPagoLicencaAssinaturaInput) {
    const stored = await this.configPromise;
    const notificationUrl = stored?.webhookUrl ?? env.MERCADOPAGO_WEBHOOK_URL;
    if (!input.emailPagador.trim()) throw new AppError("Informe um e-mail para criar a assinatura da licença.", 422);
    const payload = await this.request("/preapproval", {
      method: "POST",
      headers: { "X-Idempotency-Key": `g3n-licenca-${input.referencia}` },
      body: JSON.stringify({
        reason: input.descricao,
        external_reference: input.referencia,
        payer_email: input.emailPagador.trim(),
        back_url: input.urlRetorno,
        notification_url: notificationUrl,
        auto_recurring: {
          frequency: input.mesesPorCiclo,
          frequency_type: "months",
          transaction_amount: Number(input.valorInicial.toFixed(2)),
          currency_id: "BRL"
        },
        status: "pending"
      })
    });
    return {
      id: String(payload.id ?? ""),
      status: String(payload.status ?? "pending"),
      checkoutUrl: env.NODE_ENV === "production" ? String(payload.init_point ?? "") : String(payload.sandbox_init_point ?? payload.init_point ?? ""),
      payload
    };
  }

  async obterAssinaturaLicenca(id: string) {
    return this.request(`/preapproval/${encodeURIComponent(id)}`);
  }

  async atualizarValorRecorrente(id: string, valorRecorrente: number, mesesPorCiclo?: number) {
    return this.request(`/preapproval/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify({ auto_recurring: { ...(mesesPorCiclo ? { frequency: mesesPorCiclo, frequency_type: "months" } : {}), transaction_amount: Number(valorRecorrente.toFixed(2)), currency_id: "BRL" } })
    });
  }

  async cancelCharge(reference: string) {
    const payload = await this.request(`/v1/payments/${encodeURIComponent(reference)}`, { method: "PUT", body: JSON.stringify({ status: "cancelled" }) });
    return { status: statusOf(payload.status) };
  }

  async refundCharge(reference: string) {
    const payload = await this.request(`/v1/payments/${encodeURIComponent(reference)}/refunds`, { method: "POST", headers: { "X-Idempotency-Key": `g3n-refund-${reference}` }, body: JSON.stringify({}) });
    return { status: statusOf(payload.status ?? "refunded") };
  }

  async createRecurring(_input: PaymentChargeInput): Promise<PaymentChargeResult> { throw new AppError("Assinaturas Mercado Pago ainda não foram habilitadas.", 501); }
  async cancelRecurring(_reference: string): Promise<{ status: string }> { throw new AppError("Assinaturas Mercado Pago ainda não foram habilitadas.", 501); }
  async handleWebhook(payload: Record<string, unknown>) { return payload; }

  async validarAssinaturaWebhook(signature: string | undefined, requestId: string | undefined, dataId: string | undefined) {
    const stored = await this.configPromise;
    return validarAssinaturaMercadoPago(signature, requestId, dataId, stored?.webhookSecret ?? env.MERCADOPAGO_WEBHOOK_SECRET, env.MERCADOPAGO_WEBHOOK_MAX_SKEW_SECONDS);
  }
}
