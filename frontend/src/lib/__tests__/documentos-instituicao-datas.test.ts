import { describe, expect, it } from "vitest";
import { calcularDiasParaVencerDocumento } from "../documentos-instituicao-datas";

describe("documentos-instituicao-datas", () => {
  it("considera validade igual ao dia atual como zero dias para vencer", () => {
    const referencia = new Date(2026, 4, 25, 15, 0, 0, 0);
    expect(calcularDiasParaVencerDocumento("2026-05-25", referencia)).toBe(0);
  });

  it("retorna valor negativo quando o documento ja venceu", () => {
    const referencia = new Date(2026, 4, 25, 15, 0, 0, 0);
    expect(calcularDiasParaVencerDocumento("2026-05-24", referencia)).toBe(-1);
  });
});
