import test from "node:test";
import assert from "node:assert/strict";
import { planoMinimo } from "../middlewares/plano.middleware.js";

test("classifica rotas conforme o plano mínimo", () => {
  assert.equal(planoMinimo("/beneficiarios"), "essencial");
  assert.equal(planoMinimo("/agendamentos/horarios"), "profissional");
  assert.equal(planoMinimo("/rh/cipa/eleicoes"), "premium");
  assert.equal(planoMinimo("/rota-administrativa-nova"), "enterprise");
});
