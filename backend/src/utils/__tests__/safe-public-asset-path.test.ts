import assert from "node:assert/strict";
import test from "node:test";
import { resolverCaminhoAssetPublico } from "../safe-public-asset-path.js";

test("aceita somente caminhos relativos dentro de public", () => {
  const caminho = resolverCaminhoAssetPublico("/logos/instituicao.png");
  assert.ok(caminho?.endsWith("frontend\\public\\logos\\instituicao.png") || caminho?.endsWith("frontend/public/logos/instituicao.png"));
});

test("rejeita traversal em assets locais", () => {
  assert.equal(resolverCaminhoAssetPublico("../../backend/.env"), undefined);
  assert.equal(resolverCaminhoAssetPublico("file:///etc/passwd"), undefined);
});
