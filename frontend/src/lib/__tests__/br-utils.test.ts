import { describe, expect, it } from "vitest";
import { formatarMoeda, formatarMoedaInput, normalizarMoeda } from "../br-utils";

describe("br-utils moeda", () => {
  it("normaliza valores monetarios em formatos comuns", () => {
    expect(normalizarMoeda("1000")).toBe(1000);
    expect(normalizarMoeda("1.000,50")).toBe(1000.5);
    expect(normalizarMoeda("1000.50")).toBe(1000.5);
    expect(normalizarMoeda("1.000")).toBe(1000);
  });

  it("formata valores para exibicao monetaria", () => {
    expect(formatarMoeda(1000)).toBe("R$ 1.000,00");
    expect(formatarMoedaInput("1000")).toBe("1.000,00");
    expect(formatarMoedaInput("1.000,5")).toBe("1.000,50");
  });
});
