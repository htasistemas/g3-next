import { describe, expect, it, vi } from "vitest";
import { montarPayloadAnexoDocumentoInstituicao } from "../documentos-instituicao-anexo";

describe("documentos-instituicao-anexo", () => {
  it("monta payload com base64 e metadados do arquivo", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-16T15:30:00.000Z"));

    const arquivo = new File(["conteudo teste"], "comprovante.pdf", {
      type: "application/pdf"
    });

    const payload = await montarPayloadAnexoDocumentoInstituicao({
      arquivo,
      usuario: "Adriano"
    });

    expect(payload).toEqual({
      nomeArquivo: "comprovante.pdf",
      tipo: "PDF",
      tipoMime: "application/pdf",
      conteudoBase64: "Y29udGV1ZG8gdGVzdGU=",
      tamanho: "1 KB",
      dataUpload: "2026-04-16",
      usuario: "Adriano"
    });

    vi.useRealTimers();
  });
});
