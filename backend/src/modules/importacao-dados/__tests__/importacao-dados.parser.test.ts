import assert from "node:assert/strict";
import test from "node:test";
import { gerarRelatorioCsv, lerArquivoImportacao } from "../importacao-dados.parser.js";

test("le arquivo CSV e normaliza cabecalhos e valores", () => {
  const resultado = lerArquivoImportacao(
    Buffer.from(" nome_completo ; cpf\n Maria Silva ; 123 ", "utf8"),
    "beneficiarios.csv"
  );

  assert.deepEqual(resultado.linhas, [{ nome_completo: "Maria Silva", cpf: "123" }]);
  assert.deepEqual(resultado.colunas, ["nome_completo", "cpf"]);
});

test("rejeita arquivo com colunas acima do limite", () => {
  const cabecalho = Array.from({ length: 201 }, (_, indice) => `coluna_${indice}`).join(",");
  assert.throws(
    () => lerArquivoImportacao(Buffer.from(`${cabecalho}\n${Array(201).fill("valor").join(",")}`), "dados.csv"),
    /excede o limite de 200 colunas/
  );
});

test("protege celulas perigosas no relatorio CSV", () => {
  const csv = gerarRelatorioCsv([
    {
      linha: 2,
      status: "ERRO",
      dados: { nome_completo: "=HYPERLINK(\"https://exemplo.test\")", cpf: "123" },
      problemas: [{ mensagem: "+FORMULA" }]
    }
  ]);

  assert.match(csv, /'=HYPERLINK/);
  assert.match(csv, /'\+FORMULA/);
});
