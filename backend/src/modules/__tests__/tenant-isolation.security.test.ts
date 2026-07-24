import assert from "node:assert/strict";
import test from "node:test";
import { AiService } from "../ai/services/ai.service.js";
import { PortaisExternosService } from "../portais-externos/services/portais-externos.service.js";
import { DashboardGeorreferenciamentoService } from "../dashboard/services/dashboard-georreferenciamento.service.js";
import { authLoginRateLimit } from "../auth/middlewares/auth-rate-limit.middleware.js";

test("IA deve falhar fechada quando o tenant não estiver presente", async () => {
  const service = new AiService();

  await assert.rejects(
    service.processQuery("quantos beneficiários existem?", "usuario-a"),
    /Tenant obrigatório/
  );
});

test("georreferenciamento deve rejeitar contexto sem tenant", () => {
  const service = new DashboardGeorreferenciamentoService() as unknown as {
    parseTenant: (authUser?: { tenant_id?: string }) => string;
  };

  assert.throws(() => service.parseTenant({}), /Tenant da sessao nao identificado/);
});

test("portal de voluntário não deve autenticar apenas por CPF ou e-mail", async () => {
  const service = new PortaisExternosService();

  await assert.rejects(
    service.acessar("voluntario", { identificador: "529.982.247-25", senha: "qualquer" }),
    (error: unknown) => error instanceof Error && "statusCode" in error && error.statusCode === 501
  );
});

test("login deve bloquear excesso de tentativas por origem e identificador", () => {
  let statusCode = 0;
  let chamadasSeguintes = 0;
  const request = {
    path: "/login",
    ip: "198.51.100.10",
    body: { email: "teste-rate-limit@example.com" }
  } as never;
  const response = {
    setHeader() {},
    status(status: number) {
      statusCode = status;
      return { json() {} };
    }
  } as never;
  const next = () => {
    chamadasSeguintes += 1;
  };

  for (let tentativa = 0; tentativa < 11; tentativa += 1) {
    authLoginRateLimit(request, response, next);
  }

  assert.equal(statusCode, 429);
  assert.equal(chamadasSeguintes, 10);
});
