import { PrismaClient } from "@prisma/client";
import { EducacionalRepository } from "../src/modules/educacional/repositories/educacional.repository.js";

const prisma = new PrismaClient();
const repo = new EducacionalRepository();
let TENANT_ID = "";
const CNPJ = "32004110000118";
const actor = { id: "488", nome: "Administrador Demonstracao Torresoft", nomeUsuario: "torresoftbrasil@gmail.com" };

async function first<T extends Record<string, unknown>>(sql: string, ...params: unknown[]) {
  const rows = await prisma.$queryRawUnsafe<T[]>(sql, ...params);
  return rows[0];
}

async function ensureBeneficiario(input: { codigo: string; nome: string; nascimento: string; mae: string }) {
  const existente = await first<{ id: bigint }>("SELECT id FROM cadastro_beneficiario WHERE tenant_id::text = $1 AND codigo = $2 LIMIT 1", TENANT_ID, input.codigo);
  if (existente) return Number(existente.id);
  const rows = await prisma.$queryRawUnsafe<Array<{ id: bigint }>>(
    `INSERT INTO cadastro_beneficiario (nome_completo, data_nascimento, nome_mae, codigo, status, tenant_id, criado_em, atualizado_em)
     VALUES ($1, $2::date, $3, $4, 'ATIVO', $5::uuid, NOW(), NOW()) RETURNING id`,
    input.nome, input.nascimento, input.mae, input.codigo, TENANT_ID
  );
  return Number(rows[0].id);
}

async function ensureUnidade(nome: string, tipo: string) {
  const existente = await first<{ id: bigint }>("SELECT id FROM unidade_assistencial WHERE tenant_id::text = $1 AND nome_fantasia = $2 LIMIT 1", TENANT_ID, nome);
  if (existente) return Number(existente.id);
  const rows = await prisma.$queryRawUnsafe<Array<{ id: bigint }>>(
    `INSERT INTO unidade_assistencial (nome_fantasia, razao_social, unidade_principal, tenant_id, tipo_unidade, criado_em, atualizado_em)
     VALUES ($1, $2, FALSE, $3::uuid, $4, NOW(), NOW()) RETURNING id`,
    nome, `${nome} - Instituicao Ficticia`, TENANT_ID, tipo
  );
  return Number(rows[0].id);
}

async function ensureSala(unidadeId: number, nome: string, capacidade: number) {
  const existente = await first<{ id: bigint }>("SELECT id FROM salas_unidade WHERE unidade_id = $1 AND nome = $2 LIMIT 1", unidadeId, nome);
  if (existente) return Number(existente.id);
  const rows = await prisma.$queryRawUnsafe<Array<{ id: bigint }>>(
    `INSERT INTO salas_unidade (unidade_id, nome, capacidade_maxima, ativo, criado_em, atualizado_em)
     VALUES ($1, $2, $3, TRUE, NOW(), NOW()) RETURNING id`,
    unidadeId, nome, capacidade
  );
  return Number(rows[0].id);
}

async function ensureProfissional(input: { codigo: string; nome: string; categoria: string }) {
  const existente = await first<{ id: bigint }>("SELECT id FROM cadastro_profissionais WHERE tenant_id::text = $1 AND registro_conselho = $2 LIMIT 1", TENANT_ID, input.codigo);
  if (existente) return Number(existente.id);
  const rows = await prisma.$queryRawUnsafe<Array<{ id: bigint }>>(
    `INSERT INTO cadastro_profissionais (nome_completo, categoria, registro_conselho, status, tenant_id, criado_em, atualizado_em)
     VALUES ($1, $2, $3, 'ATIVO', $4::uuid, NOW(), NOW()) RETURNING id`,
    input.nome, input.categoria, input.codigo, TENANT_ID
  );
  return Number(rows[0].id);
}

async function ensureAcademic(recurso: any, input: Record<string, unknown>, sql: string, ...params: unknown[]) {
  const existente = await first<{ id: bigint }>(sql, ...params);
  if (existente) return Number(existente.id);
  const criado = await repo.salvar(recurso, undefined, input, TENANT_ID, actor);
  return Number((criado as Record<string, unknown>).id);
}

async function ensureMatricula(input: Record<string, unknown>, numero: string) {
  const existente = await first<{ id: bigint }>("SELECT id FROM educacional_matricula WHERE tenant_id::text = $1 AND numero_matricula = $2 LIMIT 1", TENANT_ID, numero);
  if (existente) return Number(existente.id);
  const rows = await prisma.$queryRawUnsafe<Array<{ id: bigint }>>(
    `INSERT INTO educacional_matricula (
      tenant_id, aluno_id, ano_letivo_id, unidade_id, sala_id, etapa_id, serie_id, turma_id,
      numero_matricula, data_matricula, data_inicio, turno, origem, escola_anterior,
      transporte_escolar, transporte_descricao, documentacao, informacoes_complementares,
      situacao, observacoes, ativo
    ) VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10::date, $11::date, $12, $13, $14, $15, $16, $17::jsonb, $18, $19, $20, $21)
    RETURNING id`,
    TENANT_ID, input.aluno_id, input.ano_letivo_id, input.unidade_id, input.sala_id, input.etapa_id, input.serie_id,
    input.turma_id ?? null, numero, input.data_matricula, input.data_inicio, input.turno ?? null, input.origem ?? "NOVO",
    input.escola_anterior ?? null, input.transporte_escolar ?? false, input.transporte_descricao ?? null,
    JSON.stringify(input.documentacao ?? {}), input.informacoes_complementares ?? null, input.situacao ?? "ATIVA",
    input.observacoes ?? null, input.ativo ?? true
  );
  return Number(rows[0].id);
}

async function main() {
  const instituicao = await first<{ tenant_id: string; id: string }>(
    "SELECT tenant_id::text, id::text FROM instituicoes WHERE regexp_replace(coalesce(cnpj, ''), '\\D', '', 'g') = $1 LIMIT 1",
    CNPJ
  );
  if (!instituicao) throw new Error("A instituição da base de apresentação não foi encontrada pelo CNPJ informado.");
  TENANT_ID = instituicao.tenant_id;

  console.log("Preparando estrutura educacional...");
  await repo.garantirEstrutura();
  console.log("Estrutura educacional pronta.");

  const unidades = {
    centro: await ensureUnidade("Centro Educacional Fictício", "ENSINO"),
    infantil: await ensureUnidade("Unidade Infantil Fictícia", "ENSINO")
  };
  console.log("Unidades e salas prontas.");
  const salas = {
    centroA: await ensureSala(unidades.centro, "Sala 5º ano A", 30),
    centroB: await ensureSala(unidades.centro, "Sala 8º ano B", 30),
    infantilA: await ensureSala(unidades.infantil, "Sala Infantil Grupo 4", 20)
  };

  const beneficiarios = await Promise.all([
    ["EDU-DEMO-001", "Ana Beatriz Fictícia", "2015-03-12", "Marina Fictícia"],
    ["EDU-DEMO-002", "Bruno Henrique Fictício", "2015-07-22", "Patrícia Fictícia"],
    ["EDU-DEMO-003", "Camila Vitória Fictícia", "2014-11-08", "Renata Fictícia"],
    ["EDU-DEMO-004", "Diego Lucas Fictício", "2018-02-14", "Luciana Fictícia"],
    ["EDU-DEMO-005", "Elisa Manuela Fictícia", "2019-05-30", "Carolina Fictícia"],
    ["EDU-DEMO-006", "Felipe Augusto Fictício", "2012-09-19", "Sílvia Fictícia"],
    ["EDU-DEMO-007", "Gabriela Sofia Fictícia", "2013-01-27", "Mônica Fictícia"],
    ["EDU-DEMO-008", "Heitor Rafael Fictício", "2016-10-05", "Juliana Fictícia"]
  ].map(([codigo, nome, nascimento, mae]) => ensureBeneficiario({ codigo, nome, nascimento, mae })));

  const professores = {
    professoraAna: await ensureProfissional({ codigo: "REG-DEMO-001", nome: "Professora Fictícia Ana Martins", categoria: "Professor" }),
    professorBruno: await ensureProfissional({ codigo: "REG-DEMO-002", nome: "Professor Fictício Bruno Lima", categoria: "Professor" }),
    professoraClara: await ensureProfissional({ codigo: "REG-DEMO-003", nome: "Professora Fictícia Clara Souza", categoria: "Professor" })
  };
  console.log("Profissionais fictícios prontos.");

  const anos = {
    anterior: await ensureAcademic("anos-letivos", { ano: 2025, descricao: "Ano letivo demonstrativo encerrado", status: "ENCERRADO", data_inicial: "2025-02-03", data_final: "2025-12-12" }, "SELECT id FROM educacional_ano_letivo WHERE tenant_id::text = $1 AND ano = $2 LIMIT 1", TENANT_ID, 2025),
    atual: await ensureAcademic("anos-letivos", { ano: 2026, descricao: "Ano letivo demonstrativo em andamento", status: "EM_ANDAMENTO", data_inicial: "2026-02-02", data_final: "2026-12-18", periodos: [{ nome: "1º bimestre", inicio: "2026-02-02", fim: "2026-04-30" }, { nome: "2º bimestre", inicio: "2026-05-04", fim: "2026-07-10" }, { nome: "3º bimestre", inicio: "2026-07-27", fim: "2026-09-30" }, { nome: "4º bimestre", inicio: "2026-10-01", fim: "2026-12-18" }] }, "SELECT id FROM educacional_ano_letivo WHERE tenant_id::text = $1 AND ano = $2 LIMIT 1", TENANT_ID, 2026),
    proximo: await ensureAcademic("anos-letivos", { ano: 2027, descricao: "Ano letivo demonstrativo em planejamento", status: "PLANEJAMENTO", data_inicial: "2027-02-01", data_final: "2027-12-17" }, "SELECT id FROM educacional_ano_letivo WHERE tenant_id::text = $1 AND ano = $2 LIMIT 1", TENANT_ID, 2027)
  };
  console.log("Anos letivos prontos.");
  const etapas = {
    infantil: await ensureAcademic("etapas", { nome: "Educação infantil demonstrativa", descricao: "Creche e pré-escola fictícias", status: "ATIVA" }, "SELECT id FROM educacional_etapa WHERE tenant_id::text = $1 AND nome = $2 LIMIT 1", TENANT_ID, "Educação infantil demonstrativa"),
    fundamental: await ensureAcademic("etapas", { nome: "Ensino fundamental demonstrativo", status: "ATIVA" }, "SELECT id FROM educacional_etapa WHERE tenant_id::text = $1 AND nome = $2 LIMIT 1", TENANT_ID, "Ensino fundamental demonstrativo")
  };
  console.log("Etapas prontas.");
  const series = {
    grupo4: await ensureAcademic("series", { etapa_id: etapas.infantil, nome: "Grupo 4", status: "ATIVA" }, "SELECT id FROM educacional_serie WHERE tenant_id::text = $1 AND nome = $2 LIMIT 1", TENANT_ID, "Grupo 4"),
    quinto: await ensureAcademic("series", { etapa_id: etapas.fundamental, nome: "5º ano", status: "ATIVA" }, "SELECT id FROM educacional_serie WHERE tenant_id::text = $1 AND nome = $2 LIMIT 1", TENANT_ID, "5º ano"),
    oitavo: await ensureAcademic("series", { etapa_id: etapas.fundamental, nome: "8º ano", status: "ATIVA" }, "SELECT id FROM educacional_serie WHERE tenant_id::text = $1 AND nome = $2 LIMIT 1", TENANT_ID, "8º ano")
  };
  console.log("Series prontas.");
  const disciplinas = {
    lingua: await ensureAcademic("disciplinas", { codigo: "LP-DEMO", nome: "Língua Portuguesa", area: "Linguagens", carga_horaria: 160, status: "ATIVA" }, "SELECT id FROM educacional_disciplina WHERE tenant_id::text = $1 AND codigo = $2 LIMIT 1", TENANT_ID, "LP-DEMO"),
    matematica: await ensureAcademic("disciplinas", { codigo: "MAT-DEMO", nome: "Matemática", area: "Matemática", carga_horaria: 160, status: "ATIVA" }, "SELECT id FROM educacional_disciplina WHERE tenant_id::text = $1 AND codigo = $2 LIMIT 1", TENANT_ID, "MAT-DEMO"),
    ciencias: await ensureAcademic("disciplinas", { codigo: "CIE-DEMO", nome: "Ciências", area: "Ciências da natureza", carga_horaria: 120, status: "ATIVA" }, "SELECT id FROM educacional_disciplina WHERE tenant_id::text = $1 AND codigo = $2 LIMIT 1", TENANT_ID, "CIE-DEMO"),
    experiencias: await ensureAcademic("disciplinas", { codigo: "EXP-DEMO", nome: "Campos de experiência", area: "Educação infantil", carga_horaria: 200, status: "ATIVA" }, "SELECT id FROM educacional_disciplina WHERE tenant_id::text = $1 AND codigo = $2 LIMIT 1", TENANT_ID, "EXP-DEMO")
  };
  console.log("Disciplinas prontas.");

  const turmas = {
    quinto: await ensureAcademic("turmas", { ano_letivo_id: anos.atual, unidade_id: unidades.centro, etapa_id: etapas.fundamental, serie_id: series.quinto, sala_id: salas.centroA, nome: "5º ano A - Demonstrativo", turno: "MATUTINO", capacidade_maxima: 30, professor_responsavel_id: professores.professoraAna, status: "ATIVA" }, "SELECT id FROM educacional_turma WHERE tenant_id::text = $1 AND ano_letivo_id = $2 AND nome = $3 LIMIT 1", TENANT_ID, anos.atual, "5º ano A - Demonstrativo"),
    oitavo: await ensureAcademic("turmas", { ano_letivo_id: anos.atual, unidade_id: unidades.centro, etapa_id: etapas.fundamental, serie_id: series.oitavo, sala_id: salas.centroB, nome: "8º ano B - Demonstrativo", turno: "VESPERTINO", capacidade_maxima: 30, professor_responsavel_id: professores.professorBruno, status: "ATIVA" }, "SELECT id FROM educacional_turma WHERE tenant_id::text = $1 AND ano_letivo_id = $2 AND nome = $3 LIMIT 1", TENANT_ID, anos.atual, "8º ano B - Demonstrativo"),
    infantil: await ensureAcademic("turmas", { ano_letivo_id: anos.atual, unidade_id: unidades.infantil, etapa_id: etapas.infantil, serie_id: series.grupo4, sala_id: salas.infantilA, nome: "Grupo 4 - Demonstrativo", turno: "INTEGRAL", capacidade_maxima: 20, professor_responsavel_id: professores.professoraClara, status: "ATIVA" }, "SELECT id FROM educacional_turma WHERE tenant_id::text = $1 AND ano_letivo_id = $2 AND nome = $3 LIMIT 1", TENANT_ID, anos.atual, "Grupo 4 - Demonstrativo")
  };
  console.log("Turmas prontas.");

  const alunos: number[] = [];
  for (const beneficiarioId of beneficiarios) {
    const existente = await first<{ id: bigint }>("SELECT id FROM educacional_aluno WHERE tenant_id::text = $1 AND beneficiario_id = $2 LIMIT 1", TENANT_ID, beneficiarioId);
    alunos.push(existente ? Number(existente.id) : Number((await repo.criarAluno({ beneficiario_id: beneficiarioId }, TENANT_ID, actor) as Record<string, unknown>).id));
  }
  console.log("Alunos prontos.");
  const matriculas = [
    await ensureMatricula({ aluno_id: alunos[0], ano_letivo_id: anos.atual, unidade_id: unidades.centro, sala_id: salas.centroA, etapa_id: etapas.fundamental, serie_id: series.quinto, turma_id: turmas.quinto, data_matricula: "2026-02-02", data_inicio: "2026-02-02", turno: "MATUTINO", origem: "NOVO", transporte_escolar: false, documentacao: { identificacao: true, comprovante_residencia: true }, situacao: "ATIVA", ativo: true }, "MAT-DEMO-0001"),
    await ensureMatricula({ aluno_id: alunos[1], ano_letivo_id: anos.atual, unidade_id: unidades.centro, sala_id: salas.centroA, etapa_id: etapas.fundamental, serie_id: series.quinto, turma_id: turmas.quinto, data_matricula: "2026-02-02", data_inicio: "2026-02-02", turno: "MATUTINO", origem: "TRANSFERENCIA", escola_anterior: "Escola Fictícia de Origem", transporte_escolar: true, transporte_descricao: "Rota demonstrativa 01", documentacao: { identificacao: true, comprovante_residencia: false }, situacao: "ATIVA", ativo: true }, "MAT-DEMO-0002"),
    await ensureMatricula({ aluno_id: alunos[2], ano_letivo_id: anos.atual, unidade_id: unidades.centro, sala_id: salas.centroB, etapa_id: etapas.fundamental, serie_id: series.oitavo, turma_id: turmas.oitavo, data_matricula: "2026-02-02", data_inicio: "2026-02-02", turno: "VESPERTINO", origem: "REMATRICULA", transporte_escolar: false, documentacao: { identificacao: true, comprovante_residencia: true }, situacao: "ATIVA", ativo: true }, "MAT-DEMO-0003"),
    await ensureMatricula({ aluno_id: alunos[3], ano_letivo_id: anos.atual, unidade_id: unidades.infantil, sala_id: salas.infantilA, etapa_id: etapas.infantil, serie_id: series.grupo4, turma_id: turmas.infantil, data_matricula: "2026-02-02", data_inicio: "2026-02-02", turno: "INTEGRAL", origem: "NOVO", transporte_escolar: false, documentacao: { identificacao: true, comprovante_residencia: true }, situacao: "ATIVA", ativo: true }, "MAT-DEMO-0004"),
    await ensureMatricula({ aluno_id: alunos[4], ano_letivo_id: anos.atual, unidade_id: unidades.infantil, sala_id: salas.infantilA, etapa_id: etapas.infantil, serie_id: series.grupo4, turma_id: turmas.infantil, data_matricula: "2026-02-02", data_inicio: "2026-02-02", turno: "INTEGRAL", origem: "NOVO", transporte_escolar: false, documentacao: { identificacao: false, comprovante_residencia: false }, situacao: "PENDENTE", ativo: true }, "MAT-DEMO-0005")
  ];
  console.log("Matrículas prontas.");
  for (const matriculaId of matriculas) {
    const vinculo = await first<{ turma_id: bigint }>("SELECT turma_id FROM educacional_matricula WHERE id = $1 AND tenant_id::text = $2 AND turma_id IS NOT NULL LIMIT 1", matriculaId, TENANT_ID);
    if (vinculo) await prisma.$queryRawUnsafe(
      `INSERT INTO educacional_enturmacao (tenant_id, matricula_id, turma_id, data_inicio, motivo, usuario_id, usuario_nome, criado_em)
       SELECT $1::uuid, $2, $3, DATE '2026-02-02', 'Enturmação fictícia de demonstração', $4::bigint, $5, NOW()
       WHERE NOT EXISTS (SELECT 1 FROM educacional_enturmacao WHERE tenant_id::text = $1 AND matricula_id = $2 AND data_fim IS NULL)`,
      TENANT_ID, matriculaId, Number(vinculo.turma_id), actor.id, actor.nome
    );
  }
  console.log("Enturmações prontas.");

  const vinculos = [[professores.professoraAna, turmas.quinto, disciplinas.matematica], [professores.professorBruno, turmas.oitavo, disciplinas.lingua], [professores.professoraClara, turmas.infantil, disciplinas.experiencias]];
  for (const [profissionalId, turmaId, disciplinaId] of vinculos) {
    const existente = await first<{ id: bigint }>("SELECT id FROM educacional_profissional_vinculo WHERE tenant_id::text = $1 AND profissional_id = $2 AND turma_id = $3 AND disciplina_id = $4 LIMIT 1", TENANT_ID, profissionalId, turmaId, disciplinaId);
    if (!existente) await prisma.$queryRawUnsafe(
      `INSERT INTO educacional_profissional_vinculo (tenant_id, profissional_id, funcao, unidade_id, turma_id, disciplina_id, carga_horaria, status, criado_em, atualizado_em)
       VALUES ($1::uuid, $2, 'Professor', $3, $4, $5, 20, 'ATIVO', NOW(), NOW())`,
      TENANT_ID, profissionalId, unidades.centro, turmaId, disciplinaId
    );
  }
  console.log("Vínculos de professores prontos.");
  for (const [serieId, disciplinaId] of [[series.quinto, disciplinas.lingua], [series.quinto, disciplinas.matematica], [series.quinto, disciplinas.ciencias], [series.oitavo, disciplinas.lingua], [series.oitavo, disciplinas.matematica], [series.oitavo, disciplinas.ciencias], [series.grupo4, disciplinas.experiencias]]) {
    await ensureAcademic("grade-curricular", { ano_letivo_id: anos.atual, etapa_id: serieId === series.grupo4 ? etapas.infantil : etapas.fundamental, serie_id: serieId, disciplina_id: disciplinaId, aulas_semanais: serieId === series.grupo4 ? 5 : 4, carga_horaria: 80, status: "ATIVA" }, "SELECT id FROM educacional_grade_curricular WHERE tenant_id::text = $1 AND ano_letivo_id = $2 AND serie_id = $3 AND disciplina_id = $4 LIMIT 1", TENANT_ID, anos.atual, serieId, disciplinaId);
  }
  console.log("Grades curriculares prontas.");
  await ensureAcademic("horarios", { turma_id: turmas.quinto, disciplina_id: disciplinas.matematica, professor_id: professores.professoraAna, sala_id: salas.centroA, dia_semana: 2, hora_inicio: "08:00", hora_fim: "08:50", status: "ATIVO" }, "SELECT id FROM educacional_horario WHERE tenant_id::text = $1 AND turma_id = $2 AND disciplina_id = $3 AND dia_semana = 2 LIMIT 1", TENANT_ID, turmas.quinto, disciplinas.matematica);
  await ensureAcademic("horarios", { turma_id: turmas.oitavo, disciplina_id: disciplinas.lingua, professor_id: professores.professorBruno, sala_id: salas.centroB, dia_semana: 3, hora_inicio: "13:30", hora_fim: "14:20", status: "ATIVO" }, "SELECT id FROM educacional_horario WHERE tenant_id::text = $1 AND turma_id = $2 AND disciplina_id = $3 AND dia_semana = 3 LIMIT 1", TENANT_ID, turmas.oitavo, disciplinas.lingua);
  console.log("Horários prontos.");

  for (const [turmaId, disciplinaId, professorId, data] of [[turmas.quinto, disciplinas.matematica, professores.professoraAna, "2026-03-03"], [turmas.quinto, disciplinas.matematica, professores.professoraAna, "2026-03-10"], [turmas.oitavo, disciplinas.lingua, professores.professorBruno, "2026-03-04"], [turmas.infantil, disciplinas.experiencias, professores.professoraClara, "2026-03-05"]]) {
    const diarioExistente = await first<{ id: bigint }>("SELECT id FROM educacional_diario_aula WHERE tenant_id::text = $1 AND turma_id = $2 AND disciplina_id = $3 AND data_aula = $4::date LIMIT 1", TENANT_ID, turmaId, disciplinaId, data);
    const diarioId = diarioExistente ? Number(diarioExistente.id) : Number((await prisma.$queryRawUnsafe<Array<{ id: bigint }>>(`INSERT INTO educacional_diario_aula (tenant_id, turma_id, disciplina_id, professor_id, data_aula, conteudo, objetivos, metodologia, atividades, status, criado_em, atualizado_em) VALUES ($1::uuid, $2, $3, $4, $5::date, 'Aula demonstrativa com atividade prática', 'Desenvolver aprendizagem e participação', 'Roda de conversa, atividade orientada e registro', 'Atividade fictícia para demonstração', 'FINALIZADO', NOW(), NOW()) RETURNING id`, TENANT_ID, turmaId, disciplinaId, professorId, data))[0].id);
    const matriculasDaTurma = await prisma.$queryRawUnsafe<Array<{ id: bigint }>>("SELECT id FROM educacional_matricula WHERE tenant_id::text = $1 AND turma_id = $2 AND situacao IN ('ATIVA','PENDENTE') ORDER BY id", TENANT_ID, turmaId);
    for (const [indice, matricula] of matriculasDaTurma.entries()) {
      const situacao = indice % 4 === 1 ? "AUSENTE" : indice % 5 === 2 ? "ATRASO" : "PRESENTE";
      await prisma.$queryRawUnsafe(`INSERT INTO educacional_frequencia (tenant_id, diario_aula_id, matricula_id, situacao, justificativa, observacao, criado_em, atualizado_em) VALUES ($1::uuid, $2, $3, $4, $5, 'Registro de demonstração', NOW(), NOW()) ON CONFLICT (tenant_id, diario_aula_id, matricula_id) DO UPDATE SET situacao = EXCLUDED.situacao, justificativa = EXCLUDED.justificativa, atualizado_em = NOW()`, TENANT_ID, diarioId, Number(matricula.id), situacao, situacao === "AUSENTE" ? "Justificativa fictícia pendente" : null);
    }
  }
  console.log("Diários e frequências prontos.");

  const avaliacaoId = await ensureAcademic("avaliacoes", { turma_id: turmas.quinto, disciplina_id: disciplinas.matematica, periodo: "1º bimestre", tipo: "Avaliação diagnóstica", data_avaliacao: "2026-04-10", valor_maximo: 10, peso: 1, status: "ENCERRADA" }, "SELECT id FROM educacional_avaliacao WHERE tenant_id::text = $1 AND turma_id = $2 AND disciplina_id = $3 AND periodo = $4 LIMIT 1", TENANT_ID, turmas.quinto, disciplinas.matematica, "1º bimestre");
  for (const [indice, matriculaId] of matriculas.slice(0, 2).entries()) await ensureAcademic("notas", { avaliacao_id: avaliacaoId, matricula_id: matriculaId, valor: indice === 0 ? 8.5 : 6.5, conceito: null, observacao: "Nota fictícia de demonstração" }, "SELECT id FROM educacional_nota WHERE tenant_id::text = $1 AND avaliacao_id = $2 AND matricula_id = $3 LIMIT 1", TENANT_ID, avaliacaoId, matriculaId);

  await ensureAcademic("planos-aula", { turma_id: turmas.quinto, disciplina_id: disciplinas.matematica, professor_id: professores.professoraAna, data_aula: "2026-03-17", tema: "Frações no cotidiano", objetivos: "Reconhecer frações em situações reais", habilidades: "Resolver e comunicar estratégias", conteudo: "Frações próprias e impróprias", metodologia: "Exploração de materiais e registro", recursos: "Material dourado fictício", avaliacao: "Participação e atividade", status: "APROVADO" }, "SELECT id FROM educacional_plano_aula WHERE tenant_id::text = $1 AND turma_id = $2 AND disciplina_id = $3 AND data_aula = $4::date LIMIT 1", TENANT_ID, turmas.quinto, disciplinas.matematica, "2026-03-17");
  await ensureAcademic("planejamentos", { ano_letivo_id: anos.atual, etapa_id: etapas.fundamental, turma_id: turmas.quinto, periodo: "1º bimestre", titulo: "Planejamento demonstrativo do 5º ano", objetivos: "Consolidar aprendizagens essenciais", estrategias: "Aprendizagem ativa e acompanhamento formativo", metas: "Alcançar participação de toda a turma", status: "APROVADO" }, "SELECT id FROM educacional_planejamento_pedagogico WHERE tenant_id::text = $1 AND ano_letivo_id = $2 AND turma_id = $3 AND periodo = $4 LIMIT 1", TENANT_ID, anos.atual, turmas.quinto, "1º bimestre");

  await repo.gerarBoletimAutomatico({ matricula_id: matriculas[0], ano_letivo_id: anos.atual, periodo: "1º bimestre" }, TENANT_ID, actor);
  await repo.gerarHistoricoAutomatico({ aluno_id: alunos[0], ano_letivo_id: anos.atual }, TENANT_ID, actor);
  await ensureAcademic("ocorrencias", { aluno_id: alunos[1], matricula_id: matriculas[1], data_ocorrencia: "2026-03-12", hora_ocorrencia: "10:20", tipo: "Acompanhamento pedagógico", descricao: "Registro fictício de acompanhamento de aprendizagem.", providencias: "Contato demonstrativo com responsável.", responsavel_comunicado: true, status: "RESOLVIDA" }, "SELECT id FROM educacional_ocorrencia WHERE tenant_id::text = $1 AND aluno_id = $2 AND data_ocorrencia = $3::date LIMIT 1", TENANT_ID, alunos[1], "2026-03-12");
  await ensureAcademic("agenda", { unidade_id: unidades.centro, turma_id: turmas.quinto, data_inicio: "2026-04-15T18:00:00.000Z", data_fim: "2026-04-15T19:30:00.000Z", tipo: "REUNIAO", titulo: "Reunião fictícia com responsáveis", descricao: "Evento de demonstração do calendário escolar.", status: "ATIVO" }, "SELECT id FROM educacional_agenda WHERE tenant_id::text = $1 AND titulo = $2 LIMIT 1", TENANT_ID, "Reunião fictícia com responsáveis");
  await ensureAcademic("documentos", { aluno_id: alunos[0], matricula_id: matriculas[0], tipo: "Declaração", titulo: "Declaração escolar fictícia", data_emissao: "2026-03-20", caminho_arquivo: "educacional/documentos/apresentacao/declaração-escolar-ficticia.pdf", mime_type: "application/pdf", observacoes: "Metadados de demonstração; arquivo físico não incluído.", status: "EMITIDO" }, "SELECT id FROM educacional_documento WHERE tenant_id::text = $1 AND aluno_id = $2 AND titulo = $3 LIMIT 1", TENANT_ID, alunos[0], "Declaração escolar fictícia");
  await ensureAcademic("rotinas-infantis", { aluno_id: alunos[3], data_rotina: "2026-03-05", alimentacao: "Lanche e almoço aceitos", sono_inicio: "13:00", sono_fim: "14:10", higiene: "Rotina acompanhada", trocas: 2, medicacao_autorizada: "Nenhuma", humor: "Participativo", atividades: "Pintura e exploração de cores", observacoes: "Registro fictício da rotina infantil." }, "SELECT id FROM educacional_rotina_infantil WHERE tenant_id::text = $1 AND aluno_id = $2 AND data_rotina = $3::date LIMIT 1", TENANT_ID, alunos[3], "2026-03-05");
  await ensureAcademic("desenvolvimentos-infantis", { aluno_id: alunos[3], periodo: "1º trimestre", area: "Campos de experiência", avaliacao: "Em desenvolvimento", observacoes: "Acompanha propostas com interesse e interação." }, "SELECT id FROM educacional_desenvolvimento_infantil WHERE tenant_id::text = $1 AND aluno_id = $2 AND periodo = $3 LIMIT 1", TENANT_ID, alunos[3], "1º trimestre");
  await ensureAcademic("autorizacoes", { aluno_id: alunos[3], tipo: "Retirada por pessoa autorizada", data_emissao: "2026-02-02", validade_inicio: "2026-02-02", validade_fim: "2026-12-18", autorizado: true, observacoes: "Pessoa fictícia autorizada para demonstração." }, "SELECT id FROM educacional_autorizacao WHERE tenant_id::text = $1 AND aluno_id = $2 AND tipo = $3 LIMIT 1", TENANT_ID, alunos[3], "Retirada por pessoa autorizada");
  await ensureAcademic("calendario", { ano_letivo_id: anos.atual, unidade_id: unidades.centro, data_evento: "2026-06-19", tipo: "RECESSO", titulo: "Recesso escolar demonstrativo", descricao: "Evento fictício para visualização do calendário.", dia_letivo: false, status: "ATIVO" }, "SELECT id FROM educacional_calendario WHERE tenant_id::text = $1 AND ano_letivo_id = $2 AND data_evento = $3::date AND titulo = $4 LIMIT 1", TENANT_ID, anos.atual, "2026-06-19", "Recesso escolar demonstrativo");
  await ensureAcademic("lista-espera", { beneficiario_id: beneficiarios[7], ano_letivo_id: anos.proximo, unidade_id: unidades.centro, etapa_id: etapas.fundamental, serie_id: series.quinto, turno: "MATUTINO", prioridade: 1, data_inscricao: "2026-08-01", situacao: "AGUARDANDO", observacoes: "Inscrição fictícia para demonstração." }, "SELECT id FROM educacional_lista_espera WHERE tenant_id::text = $1 AND beneficiario_id = $2 AND ano_letivo_id = $3 LIMIT 1", TENANT_ID, beneficiarios[7], anos.proximo);

  const resumo = await repo.resumo({ ano_letivo_id: anos.atual }, TENANT_ID);
  console.log(JSON.stringify({ tenant_id: TENANT_ID, cnpj: CNPJ, unidades: Object.keys(unidades).length, salas: Object.keys(salas).length, beneficiarios: beneficiarios.length, alunos: alunos.length, professores: Object.keys(professores).length, turmas: Object.keys(turmas).length, matriculas: matriculas.length, resumo }));
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
