import { env } from "../../../config/env.js";
import type { PaymentProviderInterface } from "./payment-provider.interface.js";
import { MercadoPagoPaymentProviderService } from "./mercado-pago-payment-provider.service.js";
import { MockPaymentProviderService } from "./mock-payment-provider.service.js";

export function createPaymentProvider(tenantId?: string): PaymentProviderInterface {
  if (env.CAPTACAO_PAYMENT_PROVIDER === "mercado-pago") return new MercadoPagoPaymentProviderService(tenantId);
  return new MockPaymentProviderService();
}
