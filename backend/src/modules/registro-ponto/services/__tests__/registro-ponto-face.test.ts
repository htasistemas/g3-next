import assert from "node:assert/strict";
import test from "node:test";
import {
  calcularMenorDistanciaFace,
  distanciaMaximaReconhecimentoFace,
  facesConferem
} from "../registro-ponto-face.js";

test("facesConferem aceita hashes identicos", () => {
  const hash = "f".repeat(64);
  assert.equal(facesConferem(hash, hash), true);
  assert.equal(calcularMenorDistanciaFace(hash, hash), 0);
});

test("facesConferem recusa hashes com distancia acima do limite", () => {
  const hashCadastrado = "0".repeat(64);
  const hashAtual = "f".repeat(64);
  const distancia = calcularMenorDistanciaFace(hashCadastrado, hashAtual);

  assert.ok(distancia > distanciaMaximaReconhecimentoFace);
  assert.equal(facesConferem(hashCadastrado, hashAtual), false);
});

test("facesConferem recusa quando a diferenca passa por pouco do limite", () => {
  const hashCadastrado = "0".repeat(64);
  const nibblesDiferentes = Math.ceil((distanciaMaximaReconhecimentoFace + 1) / 4);
  const hashAtual = `${"f".repeat(nibblesDiferentes)}${"0".repeat(64 - nibblesDiferentes)}`;
  const distancia = calcularMenorDistanciaFace(hashCadastrado, hashAtual);

  assert.ok(distancia > distanciaMaximaReconhecimentoFace);
  assert.equal(facesConferem(hashCadastrado, hashAtual), false);
});

test("facesConferem considera a menor distancia entre variacoes da assinatura", () => {
  const hashA = "0".repeat(64);
  const hashB = "f".repeat(64);
  const assinaturaCadastrada = `v2:${hashA}|${hashB}`;
  const assinaturaAtual = `v2:${"a".repeat(64)}|${hashB}`;

  assert.equal(calcularMenorDistanciaFace(assinaturaCadastrada, assinaturaAtual), 0);
  assert.equal(facesConferem(assinaturaCadastrada, assinaturaAtual), true);
});
