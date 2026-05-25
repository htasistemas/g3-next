import { describe, expect, it } from "vitest";
import {
  agoraLocalInputDateTime,
  formatarDateTimeLocalPtBr,
  normalizarDateTimeLocal
} from "../emprestimos-eventos-datetime";

describe("emprestimos-eventos-datetime", () => {
  it("monta datetime-local sem usar UTC", () => {
    const data = new Date(2026, 4, 25, 14, 30, 0, 0);
    expect(agoraLocalInputDateTime(data)).toBe("2026-05-25T14:30");
  });

  it("normaliza resposta ISO para manter a hora esperada no input", () => {
    expect(normalizarDateTimeLocal("2026-05-25T14:30:00.000Z")).toBe("2026-05-25T14:30");
  });

  it("formata datetime para leitura na interface", () => {
    expect(formatarDateTimeLocalPtBr("2026-05-25T14:30")).toBe("25-05-2026 14:30");
  });
});
