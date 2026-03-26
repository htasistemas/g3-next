import test from "node:test";
import assert from "node:assert/strict";
import { sanitizarConteudoJson } from "../services/atualizacao-sistema.service.js";

test("sanitizarConteudoJson remove BOM UTF-8 no inicio do arquivo", () => {
  const conteudoComBom = "\ufeff{\"latestVersion\":\"1.00.325\"}";

  assert.equal(sanitizarConteudoJson(conteudoComBom), "{\"latestVersion\":\"1.00.325\"}");
  assert.deepEqual(JSON.parse(sanitizarConteudoJson(conteudoComBom)), {
    latestVersion: "1.00.325"
  });
});

test("sanitizarConteudoJson preserva JSON sem BOM", () => {
  const conteudo = "{\"entries\":[]}";

  assert.equal(sanitizarConteudoJson(conteudo), conteudo);
});
