import { createHmac } from "node:crypto";
import test from "node:test";
import assert from "node:assert/strict";
import { validarAssinaturaMercadoPago } from "../mercado-pago-payment-provider.service.js";

test("valida assinatura x-signature do Mercado Pago", () => {
  const secret = "segredo-de-teste";
  const dataId = "123456";
  const requestId = "request-123";
  const ts = Math.floor(Date.now() / 1000);
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const digest = createHmac("sha256", secret).update(manifest).digest("hex");
  assert.equal(validarAssinaturaMercadoPago(`ts=${ts},v1=${digest}`, requestId, dataId, secret, 300), true);
  assert.equal(validarAssinaturaMercadoPago(`ts=${ts},v1=${digest}`, requestId, dataId, "outro-segredo", 300), false);
});

test("rejeita assinatura expirada do Mercado Pago", () => {
  const secret = "segredo-de-teste";
  const dataId = "123456";
  const requestId = "request-123";
  const ts = Math.floor(Date.now() / 1000) - 301;
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const digest = createHmac("sha256", secret).update(manifest).digest("hex");
  assert.equal(validarAssinaturaMercadoPago(`ts=${ts},v1=${digest}`, requestId, dataId, secret, 300), false);
});
