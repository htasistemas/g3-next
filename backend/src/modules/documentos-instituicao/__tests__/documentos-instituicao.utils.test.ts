import test from "node:test";
import assert from "node:assert/strict";
import { normalizarTipoAnexoDocumento } from "../documentos-instituicao.utils.js";

test("normalizarTipoAnexoDocumento prioriza a extensao do arquivo", () => {
  assert.equal(
    normalizarTipoAnexoDocumento({
      nomeArquivo: "ata-da-diretoria.docx",
      tipo: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      tipoMime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    }),
    "DOCX"
  );
});

test("normalizarTipoAnexoDocumento usa o mime type quando nao houver extensao", () => {
  assert.equal(
    normalizarTipoAnexoDocumento({
      nomeArquivo: "comprovante",
      tipo: "application/pdf",
      tipoMime: "application/pdf"
    }),
    "PDF"
  );
});

test("normalizarTipoAnexoDocumento limita o valor final a 30 caracteres", () => {
  assert.equal(
    normalizarTipoAnexoDocumento({
      tipo: "tipo-super-personalizado-com-mais-de-trinta-caracteres"
    }),
    "tipo super personalizado com m"
  );
});
