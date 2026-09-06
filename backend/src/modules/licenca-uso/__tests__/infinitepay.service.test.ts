import assert from "node:assert/strict";
import test from "node:test";
import { AppError } from "../../../shared/errors/app-error.js";
import { InfinitePayService } from "../services/infinitepay.service.js";

test("createCheckoutLink converte erro da InfinitePay em AppError", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ message: "handle invalido" }), {
      status: 400,
      headers: { "content-type": "application/json" }
    })) as typeof fetch;

  try {
    const service = new InfinitePayService();
    await assert.rejects(
      () =>
        service.createCheckoutLink({
          handle: "Torresoft",
          order_nsu: "LIC-TESTE",
          items: [{ quantity: 1, price: 1000, description: "Teste" }],
          redirect_url: "https://exemplo.com/retorno",
          webhook_url: "https://exemplo.com/webhook",
          customer: { name: "Cliente G3N", email: "cliente@g3n.com" }
        }),
      (error) => {
        assert.ok(error instanceof AppError);
        assert.equal((error as AppError).statusCode, 400);
        assert.match((error as Error).message, /handle invalido/i);
        return true;
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("createCheckoutLink orienta quando checkout externo está desativado", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ message: "External checkout is not enabled for this merchant" }), {
      status: 400,
      headers: { "content-type": "application/json" }
    })) as typeof fetch;

  try {
    const service = new InfinitePayService();
    await assert.rejects(
      () => service.createCheckoutLink({ handle: "Torresoft", order_nsu: "LIC-EXTERNO", items: [{ quantity: 1, price: 1000, description: "Teste" }] }),
      (error) => {
        assert.ok(error instanceof AppError);
        assert.equal((error as AppError).statusCode, 422);
        assert.match((error as Error).message, /checkout externo está desativado/i);
        return true;
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
