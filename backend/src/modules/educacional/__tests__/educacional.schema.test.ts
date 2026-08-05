import test from "node:test";
import assert from "node:assert/strict";
import { alunosAgrupadosFiltrosSchema, documentoSchema, matriculaSchema, profissionalVinculoSchema, transferenciaMatriculaSchema } from "../educacional.schema.js";
import { evidenciaPublicaSchema, indicadorPublicoSchema, parceriaPublicaSchema } from "../parcerias-publicas.schema.js";

test("aceita vínculo educacional de profissional existente", () => {
  const valor = profissionalVinculoSchema.parse({ profissional_id: "12", funcao: "Professor", carga_horaria: "20" });
  assert.equal(valor.profissional_id, 12);
  assert.equal(valor.carga_horaria, 20);
  assert.equal(valor.status, "ATIVO");
});

test("documento educacional aceita somente metadados de storage", () => {
  const valor = documentoSchema.parse({ tipo: "Declaração", titulo: "Declaração escolar", caminho_arquivo: "educacional/documentos/tenant/arquivo.pdf", mime_type: "application/pdf" });
  assert.equal(valor.caminho_arquivo, "educacional/documentos/tenant/arquivo.pdf");
  assert.equal(valor.mime_type, "application/pdf");
});

test("vínculo educacional rejeita função vazia", () => {
  assert.throws(() => profissionalVinculoSchema.parse({ profissional_id: 12, funcao: " " }));
});

test("valida parceria pública com termo e unidade", () => {
  const valor = parceriaPublicaSchema.parse({ termo_fomento_id: "10", unidade_id: "20", nome_programa: "Atendimento integral", orgao_gestor: "Secretaria Municipal de Educação" });
  assert.equal(valor.termo_fomento_id, 10);
  assert.equal(valor.status, "ATIVA");
});

test("valida indicador e evidência de prestação", () => {
  const indicador = indicadorPublicoSchema.parse({ parceria_id: 1, codigo: "IND-001", descricao: "Alunos atendidos", unidade_medida: "alunos" });
  const evidencia = evidenciaPublicaSchema.parse({ indicador_id: indicador.parceria_id, competencia: "2026-07-01", realizado_valor: "42" });
  assert.equal(indicador.periodicidade, "MENSAL");
  assert.equal(evidencia.realizado_valor, 42);
});

test("valida matrícula escolar com período, turno e situação", () => {
  const valor = matriculaSchema.parse({
    aluno_id: "1", ano_letivo_id: "2", unidade_id: "3", sala_id: "4", etapa_id: "5", serie_id: "6",
    numero_matricula: "0001", data_matricula: "2026-02-01", data_inicio: "2026-02-02",
    turno: "MATUTINO", situacao: "ATIVA", observacoes: "Turma regular"
  });
  assert.equal(valor.aluno_id, 1);
  assert.equal(valor.turno, "MATUTINO");
});

test("normaliza filtros de alunos agrupados e transferência", () => {
  const filtros = alunosAgrupadosFiltrosSchema.parse({ instituicao_id: "3", sem_sala: "true", limite: "100" });
  assert.equal(filtros.instituicao_id, 3);
  assert.equal(filtros.sem_sala, true);
  assert.equal(filtros.limite, 100);
  const transferencia = transferenciaMatriculaSchema.parse({ instituicao_destino_id: 3, sala_destino_id: 4, data_transferencia: "2026-08-05", motivo: "Mudança de unidade" });
  assert.equal(transferencia.instituicao_destino_id, 3);
});
