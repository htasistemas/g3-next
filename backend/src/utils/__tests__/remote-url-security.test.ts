import assert from "node:assert/strict";
import test from "node:test";
import { ehDestinoIpPrivado, validarUrlRemotaPublica } from "../remote-url-security.js";

test("identifica destinos IP privados e locais", () => {
  assert.equal(ehDestinoIpPrivado("127.0.0.1"), true);
  assert.equal(ehDestinoIpPrivado("10.0.0.8"), true);
  assert.equal(ehDestinoIpPrivado("192.168.1.20"), true);
  assert.equal(ehDestinoIpPrivado("8.8.8.8"), false);
});

test("bloqueia esquemas e destinos internos", async () => {
  await assert.rejects(() => validarUrlRemotaPublica("file:///etc/passwd"));
  await assert.rejects(() => validarUrlRemotaPublica("http://127.0.0.1:8080/metadata"));
  await assert.rejects(() => validarUrlRemotaPublica("http://localhost/admin"));
});
