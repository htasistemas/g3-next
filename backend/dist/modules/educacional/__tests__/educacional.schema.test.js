import test from "node:test";
import assert from "node:assert/strict";
import { alunosAgrupadosFiltrosSchema, chamadaRapidaSchema, configuracaoEducacionalSchema, diarioSchema, documentoSchema, gerarBoletimSchema, gerarHistoricoSchema, matriculaSchema, profissionalVinculoSchema, recuperacaoSugestoesSchema, rematriculaLoteSchema, rematriculaSchema, transferenciaMatriculaSchema } from "../educacional.schema.js";
import { evidenciaPublicaSchema, indicadorPublicoSchema, parceriaPublicaSchema } from "../parcerias-publicas.schema.js";
import { listarIncompatibilidadesEnturmacao } from "../educacional.utils.js";
test("aceita vÃ­nculo educacional de profissional existente", () => {
    const valor = profissionalVinculoSchema.parse({ profissional_id: "12", funcao: "Professor", carga_horaria: "20" });
    assert.equal(valor.profissional_id, 12);
    assert.equal(valor.carga_horaria, 20);
    assert.equal(valor.status, "ATIVO");
});
test("documento educacional aceita somente metadados de storage", () => {
    const valor = documentoSchema.parse({ tipo: "DeclaraÃ§Ã£o", titulo: "DeclaraÃ§Ã£o escolar", caminho_arquivo: "educacional/documentos/tenant/arquivo.pdf", mime_type: "application/pdf" });
    assert.equal(valor.caminho_arquivo, "educacional/documentos/tenant/arquivo.pdf");
    assert.equal(valor.mime_type, "application/pdf");
});
test("vÃ­nculo educacional rejeita funÃ§Ã£o vazia", () => {
    assert.throws(() => profissionalVinculoSchema.parse({ profissional_id: 12, funcao: " " }));
});
test("valida parceria pÃºblica com termo e unidade", () => {
    const valor = parceriaPublicaSchema.parse({ termo_fomento_id: "10", unidade_id: "20", nome_programa: "Atendimento integral", orgao_gestor: "Secretaria Municipal de EducaÃ§Ã£o" });
    assert.equal(valor.termo_fomento_id, 10);
    assert.equal(valor.status, "ATIVA");
});
test("valida indicador e evidÃªncia de prestaÃ§Ã£o", () => {
    const indicador = indicadorPublicoSchema.parse({ parceria_id: 1, codigo: "IND-001", descricao: "Alunos atendidos", unidade_medida: "alunos" });
    const evidencia = evidenciaPublicaSchema.parse({ indicador_id: indicador.parceria_id, competencia: "2026-07-01", realizado_valor: "42" });
    assert.equal(indicador.periodicidade, "MENSAL");
    assert.equal(evidencia.realizado_valor, 42);
});
test("valida matrÃ­cula escolar com perÃ­odo, turno e situaÃ§Ã£o", () => {
    const valor = matriculaSchema.parse({
        aluno_id: "1", ano_letivo_id: "2", unidade_id: "3", sala_id: "4", etapa_id: "5", serie_id: "6",
        numero_matricula: "0001", data_matricula: "2026-02-01", data_inicio: "2026-02-02",
        turno: "MATUTINO", origem: "TRANSFERENCIA", escola_anterior: "Escola Municipal Central",
        responsavel_nome: "Maria ResponsÃƒÂ¡vel", transporte_escolar: true,
        documentacao: { identificacao: true, comprovante_residencia: false },
        informacoes_complementares: "Aluno utiliza rota escolar 2.",
        situacao: "ATIVA", observacoes: "Turma regular"
    });
    assert.equal(valor.aluno_id, 1);
    assert.equal(valor.turno, "MATUTINO");
    assert.equal(valor.origem, "TRANSFERENCIA");
    assert.equal(valor.transporte_escolar, true);
    assert.equal(valor.documentacao.identificacao, true);
});
test("normaliza filtros de alunos agrupados e transferÃªncia", () => {
    const filtros = alunosAgrupadosFiltrosSchema.parse({ instituicao_id: "3", sem_sala: "true", limite: "100" });
    assert.equal(filtros.instituicao_id, 3);
    assert.equal(filtros.sem_sala, true);
    assert.equal(filtros.limite, 100);
    const transferencia = transferenciaMatriculaSchema.parse({ instituicao_destino_id: 3, sala_destino_id: 4, data_transferencia: "2026-08-05", motivo: "MudanÃ§a de unidade" });
    assert.equal(transferencia.instituicao_destino_id, 3);
});
test("valida chamada rÃ¡pida com situaÃ§Ã£o por matrÃ­cula", () => {
    const chamada = chamadaRapidaSchema.parse({
        registros: [
            { matricula_id: "10", situacao: "PRESENTE" },
            { matricula_id: "11", situacao: "JUSTIFICADO", justificativa: "Atestado entregue" }
        ]
    });
    assert.equal(chamada.registros[0].matricula_id, 10);
    assert.equal(chamada.registros[1].situacao, "JUSTIFICADO");
});
test("valida diÃ¡rio de classe com conteÃºdo e planejamento da aula", () => {
    const diario = diarioSchema.parse({
        turma_id: "1",
        disciplina_id: "2",
        data_aula: "2026-08-08",
        conteudo: "Leitura e interpretaÃ§Ã£o de texto",
        objetivos: "Identificar informaÃ§Ãµes explÃ­citas no texto.",
        atividades: "Leitura orientada e produÃ§Ã£o de respostas.",
        observacoes: "Turma participou bem.",
        status: "FINALIZADO"
    });
    assert.equal(diario.turma_id, 1);
    assert.equal(diario.status, "FINALIZADO");
});
test("valida filtros de sugestÃ£o de recuperaÃ§Ã£o por mÃ©dia", () => {
    const filtros = recuperacaoSugestoesSchema.parse({
        ano_letivo_id: "2026",
        disciplina_id: "3",
        periodo: "1Âº bimestre",
        media_minima: "6"
    });
    assert.equal(filtros.ano_letivo_id, 2026);
    assert.equal(filtros.media_minima, 6);
});
test("valida geraÃ§Ã£o automÃ¡tica de boletim por matrÃ­cula e perÃ­odo", () => {
    const boletim = gerarBoletimSchema.parse({ matricula_id: "10", ano_letivo_id: "2", periodo: "1Âº bimestre" });
    assert.equal(boletim.matricula_id, 10);
    assert.equal(boletim.periodo, "1Âº bimestre");
});
test("valida geraÃ§Ã£o automÃ¡tica de histÃ³rico por aluno e ano letivo", () => {
    const historico = gerarHistoricoSchema.parse({ aluno_id: "10", ano_letivo_id: "2" });
    assert.equal(historico.aluno_id, 10);
    assert.equal(historico.ano_letivo_id, 2);
});
test("valida rematrÃ­cula preservando origem", () => {
    const rematricula = rematriculaSchema.parse({
        ano_letivo_id: "2027",
        unidade_id: "3",
        sala_id: "4",
        etapa_id: "5",
        serie_id: "6",
        data_inicio: "2027-02-01",
        motivo: "ProgressÃ£o para o prÃ³ximo ano letivo"
    });
    assert.equal(rematricula.ano_letivo_id, 2027);
    assert.equal(rematricula.motivo, "ProgressÃ£o para o prÃ³ximo ano letivo");
});
test("valida rematrÃ­cula em lote com matrÃ­culas selecionadas", () => {
    const rematricula = rematriculaLoteSchema.parse({
        matriculas_ids: ["10", "11"],
        ano_letivo_id: "2027",
        unidade_id: "3",
        sala_id: "4",
        etapa_id: "5",
        serie_id: "6",
        data_inicio: "2027-02-01",
        motivo: "RematrÃ­cula da turma para o prÃ³ximo ano letivo"
    });
    assert.deepEqual(rematricula.matriculas_ids, [10, 11]);
    assert.equal(rematricula.ano_letivo_id, 2027);
});
test("valida configuraÃ§Ã£o educacional por chave e valor", () => {
    const configuracao = configuracaoEducacionalSchema.parse({
        chave: "media_minima",
        valor: "6",
        descricao: "MÃ©dia mÃ­nima padrÃ£o para aprovaÃ§Ã£o"
    });
    assert.equal(configuracao.chave, "media_minima");
    assert.equal(configuracao.ativo, true);
});
test("bloqueia enturmaÃ§Ã£o incompatÃ­vel com a matrÃ­cula", () => {
    const incompatibilidades = listarIncompatibilidadesEnturmacao({
        matricula: { ano_letivo_id: 2026n, unidade_id: 10n, etapa_id: 20n, serie_id: 30n },
        turma: { ano_letivo_id: 2027n, unidade_id: 11n, etapa_id: 21n, serie_id: 31n }
    });
    assert.deepEqual(incompatibilidades, ["ano letivo", "unidade de ensino", "etapa", "série"]);
});
test("aceita turma sem unidade específica quando os demais vínculos são compatíveis", () => {
    const incompatibilidades = listarIncompatibilidadesEnturmacao({
        matricula: { ano_letivo_id: 2026n, unidade_id: 10n, etapa_id: 20n, serie_id: 30n },
        turma: { ano_letivo_id: 2026n, unidade_id: null, etapa_id: 20n, serie_id: 30n }
    });
    assert.deepEqual(incompatibilidades, []);
});
