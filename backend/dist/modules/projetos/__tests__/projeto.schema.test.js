import test from "node:test";
import assert from "node:assert/strict";
import { projetoInputSchema, projetoTarefaInputSchema } from "../projeto.schema.js";
test("projeto.schema aceita projeto válido", () => {
    const parsed = projetoInputSchema.parse({
        nome: "Projeto Cuidar",
        responsavel: "Maria Souza",
        data_inicio: "2026-05-01",
        prazo_previsto: "2026-06-30",
        prioridade: "ALTA",
        status: "EM_ANDAMENTO",
        area_projeto: "ASSISTENCIA_SOCIAL"
    });
    assert.equal(parsed.nome, "Projeto Cuidar");
});
test("projeto.schema rejeita projeto concluído sem data de conclusão", () => {
    assert.throws(() => projetoInputSchema.parse({
        nome: "Projeto Encerrar",
        responsavel: "Equipe",
        data_inicio: "2026-05-01",
        prazo_previsto: "2026-06-30",
        prioridade: "MEDIA",
        status: "CONCLUIDO",
        area_projeto: "EDUCACAO"
    }));
});
test("projeto.schema rejeita tarefa concluída sem data de conclusão", () => {
    assert.throws(() => projetoTarefaInputSchema.parse({
        titulo: "Entregar relatório",
        tipo_tarefa: "RELATORIO",
        responsavel: "João",
        prioridade: "ALTA",
        status: "CONCLUIDO"
    }));
});
