import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeAiHistoryText, sanitizeAiHistoryValue } from "../ai-history-sanitizer.js";
test("deve mascarar cpf, cnpj, email e telefone no historico da IA", () => {
    const texto = "CPF 529.982.247-25, CNPJ 11.222.333/0001-81, email maria.silva@exemplo.com.br e telefone (34) 99999-1234.";
    const sanitizado = sanitizeAiHistoryText(texto);
    assert.equal(sanitizado, "CPF ***.982.247-**, CNPJ **.222.333/0001-**, email ma*********@exemplo.com.br e telefone (34) *****-1234.");
});
test("deve sanitizar estruturas aninhadas mantendo campos nao sensiveis", () => {
    const valor = {
        resumo: "Contato joao@empresa.com e CPF 52998224725",
        exemplos: [
            { nome: "Maria", telefone: "34999991234" },
            { observacao: "Sem dado sensivel" }
        ],
        total: 2
    };
    const sanitizado = sanitizeAiHistoryValue(valor);
    assert.deepEqual(sanitizado, {
        resumo: "Contato jo***@empresa.com e CPF ***.982.247-**",
        exemplos: [
            { nome: "Maria", telefone: "(34) *****-1234" },
            { observacao: "Sem dado sensivel" }
        ],
        total: 2
    });
});
