import assert from "node:assert/strict";
import test from "node:test";
import { registroPontoHoraExtraConfiguracaoSchema, registroPontoHoraExtraCienciaSchema, registroPontoHoraExtraDecisaoSchema, registroPontoHoraExtraFiltroSchema } from "../registro-ponto.schema.js";
test("configuracao de hora extra aplica valores padrao", () => {
    const parsed = registroPontoHoraExtraConfiguracaoSchema.parse({});
    assert.equal(parsed.tolerancia_entrada_antecipada_minutos, 10);
    assert.equal(parsed.exigir_autorizacao_hora_extra_antecipada, true);
    assert.equal(parsed.limite_hora_extra_diaria_minutos, 120);
    assert.equal(parsed.permitir_solicitacao_hora_extra_pelo_funcionario, false);
    assert.ok(parsed.mensagem_ciencia_hora_extra.length > 0);
});
test("ciencia de hora extra exige justificativa e confirmacao", () => {
    assert.throws(() => registroPontoHoraExtraCienciaSchema.parse({ justificativa_funcionario: "ok", ciencia_registrada: false }));
    const parsed = registroPontoHoraExtraCienciaSchema.parse({
        justificativa_funcionario: "Entrada antecipada por demanda operacional.",
        ciencia_registrada: true
    });
    assert.equal(parsed.ciencia_registrada, true);
});
test("decisao de hora extra rejeita justificativa vazia", () => {
    assert.throws(() => registroPontoHoraExtraDecisaoSchema.parse({ justificativa: " " }));
    const parsed = registroPontoHoraExtraDecisaoSchema.parse({ justificativa: "Aprovado pelo gestor." });
    assert.equal(parsed.justificativa, "Aprovado pelo gestor.");
});
test("filtro de hora extra aceita status todos", () => {
    const parsed = registroPontoHoraExtraFiltroSchema.parse({ status: "TODOS" });
    assert.equal(parsed.status, "TODOS");
});
