import test from "node:test";
import assert from "node:assert/strict";
import { voluntarioEscalaInputSchema } from "../voluntario-escala.schema.js";
test("voluntarioEscalaInputSchema aceita escala valida", () => {
    const parsed = voluntarioEscalaInputSchema.parse({
        voluntario_id: "12",
        sala_id: "8",
        atividade_tipo: "Apoio administrativo",
        titulo: "Escala da manhã",
        dias_semana: ["SEGUNDA", "QUARTA"],
        hora_inicio: "08:00",
        hora_fim: "12:00",
        status: "ATIVA"
    });
    assert.equal(parsed.voluntario_id, "12");
    assert.equal(parsed.dias_semana.length, 2);
});
test("voluntarioEscalaInputSchema rejeita horario final menor que o inicial", () => {
    assert.throws(() => voluntarioEscalaInputSchema.parse({
        voluntario_id: "12",
        sala_id: "8",
        atividade_tipo: "Apoio",
        dias_semana: ["SEGUNDA"],
        hora_inicio: "12:00",
        hora_fim: "08:00",
        status: "ATIVA"
    }), /horario final deve ser maior/i);
});
