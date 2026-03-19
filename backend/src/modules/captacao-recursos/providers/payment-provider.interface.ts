import type { PaymentChargeInput, PaymentChargeResult } from "../captacao-recursos.types.js";

export interface PaymentProviderInterface {
  getProviderName(): string;
  createCharge(input: PaymentChargeInput): Promise<PaymentChargeResult>;
  getChargeStatus(reference: string): Promise<{ status: string; payload?: Record<string, unknown> }>;
  cancelCharge(reference: string): Promise<{ status: string }>;
  refundCharge(reference: string): Promise<{ status: string }>;
  createRecurring(input: PaymentChargeInput): Promise<PaymentChargeResult>;
  cancelRecurring(reference: string): Promise<{ status: string }>;
  handleWebhook(payload: Record<string, unknown>): Promise<Record<string, unknown>>;
}
