import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import type { EducacionalActor, EducacionalRecurso } from "../educacional.types.js";

const estruturaPromise = new Map<string, Promise<void>>();
const tabelaPorRecurso: Record<EducacionalRecurso, string> = { "anos-letivos": "educacional_ano_letivo", etapas: "educacional_etapa", series: "educacional_serie", disciplinas: "educacional_disciplina", turmas: "educacional_turma", alunos: "educacional_aluno", matriculas: "educacional_matricula", enturmacoes: "educacional_enturmacao", "grade-curricular": "educacional_grade_curricular", horarios: "educacional_horario", diarios: "educacional_diario_aula", frequencias: "educacional_frequencia", "planos-aula": "educacional_plano_aula", planejamentos: "educacional_planejamento_pedagogico", avaliacoes: "educacional_avaliacao", notas: "educacional_nota", boletins: "educacional_boletim", historicos: "educacional_historico_escolar", ocorrencias: "educacional_ocorrencia", agenda: "educacional_agenda", documentos: "educacional_documento", "rotinas-infantis": "educacional_rotina_infantil", "desenvolvimentos-infantis": "educacional_desenvolvimento_infantil", transferencias: "educacional_transferencia", autorizacoes: "educacional_autorizacao", "lista-espera": "educacional_lista_espera", recuperacoes: "educacional_recuperacao", "resultados-finais": "educacional_resultado_final", calendario: "educacional_calendario" };

export class EducacionalRepository {
  async garantirEstrutura() {
    const chave = "educacional-fase1";
    if (!estruturaPromise.has(chave)) estruturaPromise.set(chave, prisma.$executeRawUnsafe("SELECT 1").then(() => undefined));
    await estruturaPromise.get(chave);
  }

  private tabela(recurso: EducacionalRecurso) { return tabelaPorRecurso[recurso]; }

  async resumo(filtros: { ano_letivo_id?: number; unidade_id?: number; etapa_id?: number; turma_id?: number; turno?: string }, tenantId: string) {
    await this.garantirEstrutura();
    const condicoes = [Prisma.sql`m.tenant_id::text = ${tenantId}`, Prisma.sql`m.situacao = 'ATIVA'`];
    if (filtros.ano_letivo_id) condicoes.push(Prisma.sql`m.ano_letivo_id = ${filtros.ano_letivo_id}`);
    if (filtros.unidade_id) condicoes.push(Prisma.sql`m.unidade_id = ${filtros.unidade_id}`);
    if (filtros.etapa_id) condicoes.push(Prisma.sql`m.etapa_id = ${filtros.etapa_id}`);
    if (filtros.turma_id) condicoes.push(Prisma.sql`m.turma_id = ${filtros.turma_id}`);
    if (filtros.turno) condicoes.push(Prisma.sql`COALESCE(t.turno, '') = ${filtros.turno}`);
    const matriculasWhere = Prisma.join(condicoes, " AND ");
    const alunosWhere = [Prisma.sql`a.tenant_id::text = ${tenantId}`, Prisma.sql`a.status = 'ATIVO'`];
    if (filtros.ano_letivo_id || filtros.unidade_id || filtros.etapa_id || filtros.turma_id || filtros.turno) {
      const alunoMatriculaCondicoes = [Prisma.sql`mx.aluno_id = a.id`, Prisma.sql`mx.tenant_id::text = ${tenantId}`, Prisma.sql`mx.situacao = 'ATIVA'`];
      if (filtros.ano_letivo_id) alunoMatriculaCondicoes.push(Prisma.sql`mx.ano_letivo_id = ${filtros.ano_letivo_id}`);
      if (filtros.unidade_id) alunoMatriculaCondicoes.push(Prisma.sql`mx.unidade_id = ${filtros.unidade_id}`);
      if (filtros.etapa_id) alunoMatriculaCondicoes.push(Prisma.sql`mx.etapa_id = ${filtros.etapa_id}`);
      if (filtros.turma_id) alunoMatriculaCondicoes.push(Prisma.sql`mx.turma_id = ${filtros.turma_id}`);
      if (filtros.turno) alunoMatriculaCondicoes.push(Prisma.sql`tx.turno = ${filtros.turno}`);
      alunosWhere.push(Prisma.sql`EXISTS (SELECT 1 FROM educacional_matricula mx LEFT JOIN educacional_turma tx ON tx.id = mx.turma_id WHERE ${Prisma.join(alunoMatriculaCondicoes, " AND ")})`);
    }
    const alunosAtivos = await prisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`SELECT COUNT(*)::bigint AS total FROM educacional_aluno a WHERE ${Prisma.join(alunosWhere, " AND ")}`);
    const matriculas = await prisma.$queryRaw<Array<{ situacao: string; total: bigint }>>(Prisma.sql`SELECT m.situacao, COUNT(*)::bigint AS total FROM educacional_matricula m LEFT JOIN educacional_turma t ON t.id = m.turma_id WHERE m.tenant_id::text = ${tenantId} ${filtros.ano_letivo_id ? Prisma.sql`AND m.ano_letivo_id = ${filtros.ano_letivo_id}` : Prisma.empty} ${filtros.unidade_id ? Prisma.sql`AND m.unidade_id = ${filtros.unidade_id}` : Prisma.empty} ${filtros.etapa_id ? Prisma.sql`AND m.etapa_id = ${filtros.etapa_id}` : Prisma.empty} ${filtros.turma_id ? Prisma.sql`AND m.turma_id = ${filtros.turma_id}` : Prisma.empty} ${filtros.turno ? Prisma.sql`AND t.turno = ${filtros.turno}` : Prisma.empty} GROUP BY m.situacao`);
    const turmas = await prisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`SELECT COUNT(*)::bigint AS total FROM educacional_turma t WHERE t.tenant_id::text = ${tenantId} AND t.status = 'ATIVA' ${filtros.ano_letivo_id ? Prisma.sql`AND t.ano_letivo_id = ${filtros.ano_letivo_id}` : Prisma.empty} ${filtros.unidade_id ? Prisma.sql`AND t.unidade_id = ${filtros.unidade_id}` : Prisma.empty} ${filtros.etapa_id ? Prisma.sql`AND t.etapa_id = ${filtros.etapa_id}` : Prisma.empty} ${filtros.turma_id ? Prisma.sql`AND t.id = ${filtros.turma_id}` : Prisma.empty} ${filtros.turno ? Prisma.sql`AND t.turno = ${filtros.turno}` : Prisma.empty}`);
    const frequencia = await prisma.$queryRaw<Array<{ presentes: bigint; total: bigint }>>(Prisma.sql`SELECT COUNT(*) FILTER (WHERE f.situacao IN ('PRESENTE','ATRASO','SAIDA_ANTECIPADA'))::bigint AS presentes, COUNT(*)::bigint AS total FROM educacional_frequencia f INNER JOIN educacional_matricula m ON m.id = f.matricula_id LEFT JOIN educacional_turma t ON t.id = m.turma_id WHERE ${matriculasWhere}`);
    const risco = await prisma.$queryRaw<Array<{ total: bigint; criticos: bigint }>>(Prisma.sql`SELECT COUNT(*) FILTER (WHERE total_aulas > 0 AND faltas::numeric / total_aulas >= 0.25)::bigint AS total, COUNT(*) FILTER (WHERE total_aulas > 0 AND faltas::numeric / total_aulas >= 0.5)::bigint AS criticos FROM (SELECT m.aluno_id, COUNT(f.id)::int AS total_aulas, COUNT(f.id) FILTER (WHERE f.situacao = 'AUSENTE')::int AS faltas FROM educacional_matricula m LEFT JOIN educacional_turma t ON t.id = m.turma_id LEFT JOIN educacional_frequencia f ON f.matricula_id = m.id AND f.tenant_id::text = ${tenantId} WHERE ${matriculasWhere} GROUP BY m.aluno_id) dados`);
    const evasao = await prisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`SELECT COUNT(*)::bigint AS total FROM (SELECT m.aluno_id FROM educacional_matricula m LEFT JOIN educacional_turma t ON t.id = m.turma_id INNER JOIN educacional_frequencia f ON f.matricula_id = m.id AND f.situacao = 'AUSENTE' WHERE ${matriculasWhere} GROUP BY m.aluno_id HAVING COUNT(f.id) >= 5) dados`);
    const ocorrencias = await prisma.$queryRaw<Array<{ total: bigint; recorrentes: bigint }>>(Prisma.sql`SELECT COUNT(*)::bigint AS total, COUNT(*) FILTER (WHERE quantidade >= 3)::bigint AS recorrentes FROM (SELECT o.aluno_id, COUNT(*)::int AS quantidade FROM educacional_ocorrencia o INNER JOIN educacional_matricula m ON m.aluno_id = o.aluno_id LEFT JOIN educacional_turma t ON t.id = m.turma_id WHERE o.tenant_id::text = ${tenantId} AND date_trunc('month', o.data_ocorrencia::timestamp) = date_trunc('month', CURRENT_DATE) AND ${matriculasWhere} GROUP BY o.aluno_id) dados`);
    const pendencias = await prisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`SELECT COUNT(*)::bigint AS total FROM educacional_diario_aula d INNER JOIN educacional_turma t ON t.id = d.turma_id WHERE d.tenant_id::text = ${tenantId} AND NOT EXISTS (SELECT 1 FROM educacional_frequencia f WHERE f.diario_aula_id = d.id AND f.tenant_id::text = ${tenantId}) ${filtros.turma_id ? Prisma.sql`AND d.turma_id = ${filtros.turma_id}` : Prisma.empty}`);
    const desempenho = await prisma.$queryRaw<Array<{ media: number | null }>>(Prisma.sql`SELECT AVG(n.valor / NULLIF(av.valor_maximo, 0) * 10)::float AS media FROM educacional_nota n INNER JOIN educacional_avaliacao av ON av.id = n.avaliacao_id INNER JOIN educacional_matricula m ON m.id = n.matricula_id LEFT JOIN educacional_turma t ON t.id = m.turma_id WHERE ${matriculasWhere} AND n.valor IS NOT NULL`);
    const disciplinas = await prisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`SELECT COUNT(*)::bigint AS total FROM educacional_disciplina d WHERE d.tenant_id::text = ${tenantId} AND d.status = 'ATIVA'`);
    const anosAbertos = await prisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`SELECT COUNT(*)::bigint AS total FROM educacional_ano_letivo a WHERE a.tenant_id::text = ${tenantId} AND a.status IN ('PLANEJAMENTO', 'ABERTO', 'EM_ANDAMENTO')`);
    const resultadoFrequencia = frequencia[0] ?? { presentes: 0n, total: 0n };
    const totalFrequencia = Number(resultadoFrequencia.total);
    const percentualFrequencia = totalFrequencia ? Number(resultadoFrequencia.presentes) / totalFrequencia * 100 : 0;
    const matriculasPorSituacao = Object.fromEntries(matriculas.map((item) => [item.situacao.toLowerCase(), Number(item.total)]));
    return {
      alunos_ativos: Number(alunosAtivos[0]?.total ?? 0), matriculas_ativas: matriculasPorSituacao.ativa ?? 0, turmas_ativas: Number(turmas[0]?.total ?? 0), disciplinas_ativas: Number(disciplinas[0]?.total ?? 0), anos_abertos: Number(anosAbertos[0]?.total ?? 0),
      matriculas: matriculasPorSituacao, frequencia_geral: percentualFrequencia, alunos_risco: Number(risco[0]?.total ?? 0), alunos_risco_critico: Number(risco[0]?.criticos ?? 0), risco_evasao: Number(evasao[0]?.total ?? 0), ocorrencias_mes: Number(ocorrencias[0]?.total ?? 0), ocorrencias_recorrentes: Number(ocorrencias[0]?.recorrentes ?? 0), chamadas_pendentes: Number(pendencias[0]?.total ?? 0), media_geral: Number(desempenho[0]?.media ?? 0), filtros
    };
  }

  async listar(recurso: EducacionalRecurso, tenantId: string) {
    await this.garantirEstrutura();
    const tabela = this.tabela(recurso);
    const rows = recurso === "alunos"
      ? await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`SELECT a.*, b.nome_completo, b.codigo AS codigo_beneficiario, b.data_nascimento, b.nome_mae FROM educacional_aluno a INNER JOIN cadastro_beneficiario b ON b.id = a.beneficiario_id AND b.tenant_id::text = ${tenantId} WHERE a.tenant_id::text = ${tenantId} ORDER BY a.id DESC LIMIT 500`)
      : recurso === "matriculas"
        ? await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`SELECT m.*, a.beneficiario_id, b.nome_completo AS aluno_nome, t.nome AS turma_nome FROM educacional_matricula m INNER JOIN educacional_aluno a ON a.id = m.aluno_id AND a.tenant_id::text = ${tenantId} INNER JOIN cadastro_beneficiario b ON b.id = a.beneficiario_id AND b.tenant_id::text = ${tenantId} LEFT JOIN educacional_turma t ON t.id = m.turma_id AND t.tenant_id::text = ${tenantId} WHERE m.tenant_id::text = ${tenantId} ORDER BY m.id DESC LIMIT 500`)
        : await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`SELECT * FROM ${Prisma.raw(tabela)} WHERE tenant_id::text = ${tenantId} ORDER BY id DESC LIMIT 500`);
    return rows.map((row) => this.serializar(row));
  }

  async buscarBeneficiarios(termo: string, tenantId: string) {
    const busca = `%${termo.trim()}%`;
    return prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT b.id, b.codigo, b.nome_completo, b.data_nascimento, b.nome_mae
      FROM cadastro_beneficiario b
      WHERE b.tenant_id::text = ${tenantId}
        AND (b.nome_completo ILIKE ${busca} OR COALESCE(b.codigo, '') ILIKE ${busca})
      ORDER BY b.nome_completo ASC LIMIT 50
    `).then((rows) => rows.map((row) => this.serializar(row)));
  }

  async criarAluno(input: { beneficiario_id: number; numero_aluno?: string | null; observacoes?: string | null }, tenantId: string, actor: EducacionalActor) {
    const beneficiario = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`SELECT id FROM cadastro_beneficiario WHERE id = ${BigInt(input.beneficiario_id)} AND tenant_id::text = ${tenantId} LIMIT 1`);
    if (!beneficiario[0]) throw new AppError("Beneficiário não encontrado nesta instituição.", 404);
    const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`INSERT INTO educacional_aluno (tenant_id, beneficiario_id, numero_aluno, observacoes) VALUES (${tenantId}::uuid, ${BigInt(input.beneficiario_id)}, ${input.numero_aluno ?? null}, ${input.observacoes ?? null}) ON CONFLICT (tenant_id, beneficiario_id) DO UPDATE SET observacoes = EXCLUDED.observacoes, atualizado_em = NOW() RETURNING *`);
    await this.auditar("educacional_aluno", rows[0]?.id as bigint, "CRIAR", null, rows[0], tenantId, actor);
    return this.serializar(rows[0]);
  }

  async salvar(recurso: EducacionalRecurso, rawId: string | undefined, input: Record<string, unknown>, tenantId: string, actor: EducacionalActor) {
    const tabela = this.tabela(recurso);
    await this.validarReferencias(recurso, input, tenantId);
    if (recurso === "lista-espera" && input.beneficiario_id) await this.validarBeneficiario(String(input.beneficiario_id), tenantId);
    if (recurso === "recuperacoes" && input.valor !== null && input.valor !== undefined && Number(input.valor) > Number(input.valor_maximo)) throw new AppError("A nota da recuperação não pode ser maior que o valor máximo.", 400);
    if (recurso === "horarios") await this.validarConflitoHorario(input, rawId, tenantId);
    if (recurso === "enturmacoes") await this.validarEnturmacao(input, rawId, tenantId);
    if (recurso === "notas") await this.validarNota(input, tenantId);
    const id = rawId ? BigInt(rawId) : undefined;
    const permitido = Object.entries(input).filter(([key, value]) => key !== "id" && value !== undefined).map(([key, value]) => [key, value] as const);
    if (!permitido.length) throw new AppError("Informe dados para salvar.", 400);
    if (id) {
      const anterior = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`SELECT * FROM ${Prisma.raw(tabela)} WHERE id = ${id} AND tenant_id::text = ${tenantId} LIMIT 1`);
      if (!anterior[0]) throw new AppError("Registro educacional não encontrado.", 404);
      if (recurso === "anos-letivos" && anterior[0].status === "ENCERRADO") throw new AppError("Ano letivo encerrado não pode ser alterado sem reabertura autorizada.", 409);
      const sets = permitido.map(([key, value]) => Prisma.sql`${Prisma.raw(key)} = ${value}`);
      const query = sets.reduce((acc, item, index) => index === 0 ? item : Prisma.sql`${acc}, ${item}`, Prisma.empty);
      const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`UPDATE ${Prisma.raw(tabela)} SET ${query}, atualizado_em = NOW() WHERE id = ${id} AND tenant_id::text = ${tenantId} RETURNING *`);
      await this.auditar(tabela, id, "ATUALIZAR", anterior[0], rows[0], tenantId, actor);
      return this.serializar(rows[0]);
    }
    const colunas = permitido.map(([key]) => Prisma.raw(key));
    const valores = permitido.map(([, value]) => value);
    const colunasSql = colunas.reduce((acc, item, index) => index === 0 ? item : Prisma.sql`${acc}, ${item}`, Prisma.empty);
    const valoresSql = valores.reduce((acc, item, index) => index === 0 ? Prisma.sql`${item}` : Prisma.sql`${acc}, ${item}`, Prisma.empty);
    const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`INSERT INTO ${Prisma.raw(tabela)} (tenant_id, ${colunasSql}) VALUES (${tenantId}::uuid, ${valoresSql}) RETURNING *`);
    await this.auditar(tabela, rows[0]?.id as bigint, "CRIAR", null, rows[0], tenantId, actor);
    return this.serializar(rows[0]);
  }

  private async validarReferencias(recurso: EducacionalRecurso, input: Record<string, unknown>, tenantId: string) {
    const referencias: Array<[string, string]> = [];
    if (recurso === "series" && input.etapa_id) referencias.push(["educacional_etapa", "etapa_id"]);
    if (recurso === "turmas") {
      if (input.ano_letivo_id) referencias.push(["educacional_ano_letivo", "ano_letivo_id"]);
      if (input.etapa_id) referencias.push(["educacional_etapa", "etapa_id"]);
      if (input.serie_id) referencias.push(["educacional_serie", "serie_id"]);
    }
    if (recurso === "matriculas") {
      if (input.aluno_id) referencias.push(["educacional_aluno", "aluno_id"]);
      if (input.ano_letivo_id) referencias.push(["educacional_ano_letivo", "ano_letivo_id"]);
      if (input.etapa_id) referencias.push(["educacional_etapa", "etapa_id"]);
      if (input.serie_id) referencias.push(["educacional_serie", "serie_id"]);
      if (input.turma_id) referencias.push(["educacional_turma", "turma_id"]);
    }
    if (recurso === "enturmacoes") {
      if (input.matricula_id) referencias.push(["educacional_matricula", "matricula_id"]);
      if (input.turma_id) referencias.push(["educacional_turma", "turma_id"]);
    }
    if (recurso === "grade-curricular") {
      if (input.ano_letivo_id) referencias.push(["educacional_ano_letivo", "ano_letivo_id"]);
      if (input.etapa_id) referencias.push(["educacional_etapa", "etapa_id"]);
      if (input.serie_id) referencias.push(["educacional_serie", "serie_id"]);
      if (input.disciplina_id) referencias.push(["educacional_disciplina", "disciplina_id"]);
    }
    if (recurso === "horarios") {
      if (input.turma_id) referencias.push(["educacional_turma", "turma_id"]);
      if (input.disciplina_id) referencias.push(["educacional_disciplina", "disciplina_id"]);
    }
    if (recurso === "diarios") {
      if (input.turma_id) referencias.push(["educacional_turma", "turma_id"]);
      if (input.disciplina_id) referencias.push(["educacional_disciplina", "disciplina_id"]);
    }
    if (recurso === "frequencias") {
      if (input.diario_aula_id) referencias.push(["educacional_diario_aula", "diario_aula_id"]);
      if (input.matricula_id) referencias.push(["educacional_matricula", "matricula_id"]);
    }
    if (recurso === "planos-aula") {
      if (input.turma_id) referencias.push(["educacional_turma", "turma_id"]);
      if (input.disciplina_id) referencias.push(["educacional_disciplina", "disciplina_id"]);
    }
    if (recurso === "planejamentos") {
      if (input.ano_letivo_id) referencias.push(["educacional_ano_letivo", "ano_letivo_id"]);
      if (input.etapa_id) referencias.push(["educacional_etapa", "etapa_id"]);
      if (input.turma_id) referencias.push(["educacional_turma", "turma_id"]);
    }
    if (recurso === "avaliacoes") {
      if (input.turma_id) referencias.push(["educacional_turma", "turma_id"]);
      if (input.disciplina_id) referencias.push(["educacional_disciplina", "disciplina_id"]);
    }
    if (recurso === "notas") {
      if (input.avaliacao_id) referencias.push(["educacional_avaliacao", "avaliacao_id"]);
      if (input.matricula_id) referencias.push(["educacional_matricula", "matricula_id"]);
    }
    if (recurso === "boletins") {
      if (input.matricula_id) referencias.push(["educacional_matricula", "matricula_id"]);
      if (input.ano_letivo_id) referencias.push(["educacional_ano_letivo", "ano_letivo_id"]);
    }
    if (recurso === "historicos") {
      if (input.aluno_id) referencias.push(["educacional_aluno", "aluno_id"]);
      if (input.ano_letivo_id) referencias.push(["educacional_ano_letivo", "ano_letivo_id"]);
    }
    if (recurso === "ocorrencias") {
      if (input.aluno_id) referencias.push(["educacional_aluno", "aluno_id"]);
      if (input.matricula_id) referencias.push(["educacional_matricula", "matricula_id"]);
    }
    if (recurso === "agenda") {
      if (input.turma_id) referencias.push(["educacional_turma", "turma_id"]);
      if (input.aluno_id) referencias.push(["educacional_aluno", "aluno_id"]);
    }
    if (recurso === "documentos") {
      if (input.aluno_id) referencias.push(["educacional_aluno", "aluno_id"]);
      if (input.matricula_id) referencias.push(["educacional_matricula", "matricula_id"]);
    }
    if (recurso === "rotinas-infantis" || recurso === "desenvolvimentos-infantis") {
      if (input.aluno_id) referencias.push(["educacional_aluno", "aluno_id"]);
    }
    if (recurso === "transferencias") {
      if (input.aluno_id) referencias.push(["educacional_aluno", "aluno_id"]);
      if (input.matricula_id) referencias.push(["educacional_matricula", "matricula_id"]);
    }
    if (recurso === "autorizacoes" && input.aluno_id) {
      referencias.push(["educacional_aluno", "aluno_id"]);
    }
    if (recurso === "lista-espera") {
      if (input.aluno_id) referencias.push(["educacional_aluno", "aluno_id"]);
      if (input.ano_letivo_id) referencias.push(["educacional_ano_letivo", "ano_letivo_id"]);
      if (input.etapa_id) referencias.push(["educacional_etapa", "etapa_id"]);
      if (input.serie_id) referencias.push(["educacional_serie", "serie_id"]);
    }
    if (recurso === "recuperacoes") {
      if (input.matricula_id) referencias.push(["educacional_matricula", "matricula_id"]);
      if (input.disciplina_id) referencias.push(["educacional_disciplina", "disciplina_id"]);
    }
    if (recurso === "resultados-finais") {
      if (input.matricula_id) referencias.push(["educacional_matricula", "matricula_id"]);
      if (input.ano_letivo_id) referencias.push(["educacional_ano_letivo", "ano_letivo_id"]);
    }
    if (recurso === "calendario" && input.ano_letivo_id) referencias.push(["educacional_ano_letivo", "ano_letivo_id"]);
    if ((recurso === "turmas" || recurso === "matriculas" || recurso === "lista-espera" || recurso === "calendario") && input.unidade_id) {
      const unidade = await prisma.$queryRaw<Array<{ tipo_unidade: string }>>(Prisma.sql`SELECT tipo_unidade FROM unidade_assistencial WHERE id_unidade = ${BigInt(String(input.unidade_id))} AND tenant_id::text = ${tenantId} LIMIT 1`);
      if (!unidade[0]) throw new AppError("Unidade de ensino não encontrada nesta instituição.", 400);
      if (unidade[0].tipo_unidade !== "ENSINO") throw new AppError("Selecione uma unidade classificada como unidade de ensino.", 400);
    }
    for (const [tabelaReferencia, campo] of referencias) {
      const valor = BigInt(String(input[campo]));
      const encontrado = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`SELECT id FROM ${Prisma.raw(tabelaReferencia)} WHERE id = ${valor} AND tenant_id::text = ${tenantId} LIMIT 1`);
      if (!encontrado[0]) throw new AppError("A referência informada não pertence à instituição atual.", 400);
    }
  }

  private async validarEnturmacao(input: Record<string, unknown>, rawId: string | undefined, tenantId: string) {
    const matriculaId = BigInt(String(input.matricula_id));
    const turmaId = BigInt(String(input.turma_id));
    const id = rawId ? BigInt(rawId) : null;
    const matricula = await prisma.$queryRaw<Array<{ aluno_id: bigint; situacao: string }>>(Prisma.sql`SELECT aluno_id, situacao FROM educacional_matricula WHERE id = ${matriculaId} AND tenant_id::text = ${tenantId} LIMIT 1`);
    if (!matricula[0] || matricula[0].situacao !== "ATIVA") throw new AppError("A matrícula precisa estar ativa para ser alocada em uma turma.", 400);
    const atual = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`SELECT id FROM educacional_enturmacao WHERE tenant_id::text = ${tenantId} AND matricula_id = ${matriculaId} AND data_fim IS NULL AND (${id}::bigint IS NULL OR id <> ${id}) LIMIT 1`);
    if (atual[0]) throw new AppError("Este aluno já está alocado em uma turma ativa.", 409);
    const turma = await prisma.$queryRaw<Array<{ capacidade_maxima: number }>>(Prisma.sql`SELECT capacidade_maxima FROM educacional_turma WHERE id = ${turmaId} AND tenant_id::text = ${tenantId} AND status = 'ATIVA' LIMIT 1`);
    if (!turma[0]) throw new AppError("Turma ativa não encontrada nesta instituição.", 404);
    if (Number(turma[0].capacidade_maxima) > 0) {
      const ocupacao = await prisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`SELECT COUNT(*)::bigint AS total FROM educacional_enturmacao e INNER JOIN educacional_matricula m ON m.id = e.matricula_id WHERE e.tenant_id::text = ${tenantId} AND e.turma_id = ${turmaId} AND e.data_fim IS NULL AND m.situacao = 'ATIVA' AND (${id}::bigint IS NULL OR e.id <> ${id})`);
      if (Number(ocupacao[0]?.total ?? 0) >= Number(turma[0].capacidade_maxima)) throw new AppError("A capacidade máxima da turma foi atingida.", 409);
    }
  }

  private async validarNota(input: Record<string, unknown>, tenantId: string) {
    if (input.valor === null || input.valor === undefined) return;
    const avaliacao = await prisma.$queryRaw<Array<{ valor_maximo: number }>>(Prisma.sql`SELECT valor_maximo FROM educacional_avaliacao WHERE id = ${BigInt(String(input.avaliacao_id))} AND tenant_id::text = ${tenantId} LIMIT 1`);
    if (!avaliacao[0]) throw new AppError("Avaliação não encontrada nesta instituição.", 404);
    if (Number(input.valor) > Number(avaliacao[0].valor_maximo)) throw new AppError(`A nota não pode ser maior que ${avaliacao[0].valor_maximo}.`, 400);
  }

  private async validarBeneficiario(rawId: string, tenantId: string) {
    const encontrado = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`SELECT id FROM cadastro_beneficiario WHERE id = ${BigInt(rawId)} AND tenant_id::text = ${tenantId} LIMIT 1`);
    if (!encontrado[0]) throw new AppError("Beneficiário não encontrado nesta instituição.", 404);
  }

  private async validarConflitoHorario(input: Record<string, unknown>, rawId: string | undefined, tenantId: string) {
    const turmaId = BigInt(String(input.turma_id));
    const professorId = input.professor_id ? BigInt(String(input.professor_id)) : null;
    const salaId = input.sala_id ? BigInt(String(input.sala_id)) : null;
    const id = rawId ? BigInt(rawId) : null;
    const conflito = await prisma.$queryRaw<Array<{ id: bigint; tipo: string }>>(Prisma.sql`
      SELECT h.id,
        CASE
          WHEN h.turma_id = ${turmaId} THEN 'turma'
          WHEN ${professorId} IS NOT NULL AND h.professor_id = ${professorId} THEN 'professor'
          WHEN ${salaId} IS NOT NULL AND h.sala_id = ${salaId} THEN 'sala'
        END AS tipo
      FROM educacional_horario h
      WHERE h.tenant_id::text = ${tenantId}
        AND h.dia_semana = ${Number(input.dia_semana)}
        AND h.status = 'ATIVO'
        AND (${id}::bigint IS NULL OR h.id <> ${id})
        AND (h.turma_id = ${turmaId} OR (${professorId} IS NOT NULL AND h.professor_id = ${professorId}) OR (${salaId} IS NOT NULL AND h.sala_id = ${salaId}))
        AND h.hora_inicio < ${String(input.hora_fim)}::time
        AND h.hora_fim > ${String(input.hora_inicio)}::time
      LIMIT 1
    `);
    if (conflito[0]) throw new AppError(`Conflito de horário: ${conflito[0].tipo}.`, 409);
  }

  private serializar(row?: Record<string, unknown>) { if (!row) return null; return Object.fromEntries(Object.entries(row).map(([key, value]) => [key, typeof value === "bigint" ? value.toString() : value instanceof Date ? value.toISOString().slice(0, 10) : value])); }
  private async auditar(entidade: string, id: bigint, acao: string, anterior: unknown, novo: unknown, tenantId: string, actor: EducacionalActor) { await prisma.$executeRaw(Prisma.sql`INSERT INTO educacional_auditoria (tenant_id, entidade, entidade_id, acao, dados_anteriores, dados_novos, usuario_id, usuario_nome) VALUES (${tenantId}::uuid, ${entidade}, ${id}, ${acao}, ${anterior ? JSON.stringify(anterior) : null}::jsonb, ${novo ? JSON.stringify(novo) : null}::jsonb, ${actor.id ? BigInt(actor.id) : null}, ${actor.nome ?? actor.nomeUsuario ?? "Usuário autenticado"})`); }
}
