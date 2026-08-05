import { Prisma } from "@prisma/client";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import type { EducacionalActor, EducacionalRecurso } from "../educacional.types.js";

const estruturaPromise = new Map<string, Promise<void>>();
const migrationsEducacionais = [
  "20260718_create_educacional_fase1",
  "20260719_create_educacional_academico",
  "20260719_create_educacional_alunos_fluxos",
  "20260719_create_educacional_avaliacoes",
  "20260719_create_educacional_boletim_historico",
  "20260719_create_educacional_creche",
  "20260719_create_educacional_diario",
  "20260719_create_educacional_documentos",
  "20260719_create_educacional_fluxo_academico",
  "20260719_create_educacional_ocorrencias_agenda",
  "20260719_create_educacional_planejamento",
  "20260719_harden_educacional_integridade",
  "20260719_add_educacional_vagas_unidade_sala",
  "20260719_add_tipo_unidade_atendimento",
  "20260720_create_educacional_parcerias_publicas",
  "20260720_create_educacional_profissional_vinculo"
  ,"20260805_create_educacional_matricula_vinculos"
];
const tabelaPorRecurso: Record<EducacionalRecurso, string> = { "anos-letivos": "educacional_ano_letivo", etapas: "educacional_etapa", series: "educacional_serie", disciplinas: "educacional_disciplina", turmas: "educacional_turma", alunos: "educacional_aluno", matriculas: "educacional_matricula", enturmacoes: "educacional_enturmacao", profissionais: "educacional_profissional_vinculo", "grade-curricular": "educacional_grade_curricular", horarios: "educacional_horario", diarios: "educacional_diario_aula", frequencias: "educacional_frequencia", "planos-aula": "educacional_plano_aula", planejamentos: "educacional_planejamento_pedagogico", avaliacoes: "educacional_avaliacao", notas: "educacional_nota", boletins: "educacional_boletim", historicos: "educacional_historico_escolar", ocorrencias: "educacional_ocorrencia", agenda: "educacional_agenda", documentos: "educacional_documento", "rotinas-infantis": "educacional_rotina_infantil", "desenvolvimentos-infantis": "educacional_desenvolvimento_infantil", transferencias: "educacional_transferencia", autorizacoes: "educacional_autorizacao", "lista-espera": "educacional_lista_espera", recuperacoes: "educacional_recuperacao", "resultados-finais": "educacional_resultado_final", calendario: "educacional_calendario" };

function dividirComandosSql(sql: string) {
  return sql.split(/;\s*(?:\r?\n|$)/).map((comando) => comando.trim()).filter(Boolean);
}

const camposData = new Set([
  "data_inicial",
  "data_final",
  "data_matricula",
  "data_aula",
  "data_avaliacao",
  "data_ocorrencia",
  "data_emissao",
  "validade_inicio",
  "validade_fim",
  "data_inscricao",
  "data_transferencia",
  "data_resultado",
  "data_evento",
  "data_rotina"
]);
const camposHorario = new Set(["hora_inicio", "hora_fim", "hora_ocorrencia", "sono_inicio", "sono_fim"]);
const camposJsonb = new Set(["periodos"]);

function valorSql(campo: string, valor: unknown) {
  if (valor === null) return Prisma.sql`NULL`;
  if (valor === undefined) return Prisma.sql`NULL`;
  if (camposJsonb.has(campo)) return Prisma.sql`${JSON.stringify(valor)}::jsonb`;
  if ((campo === "data_inicio" || campo === "data_fim") && typeof valor === "string") {
    return valor.includes("T") ? Prisma.sql`${valor}::timestamp` : Prisma.sql`${valor}::date`;
  }
  if (camposData.has(campo)) return Prisma.sql`${valor}::date`;
  if (camposHorario.has(campo)) return Prisma.sql`${valor}::time`;
  if (campo === "emitido_em") return Prisma.sql`${valor}::timestamp`;
  return Prisma.sql`${valor}`;
}

function jsonSeguro(valor: unknown) {
  if (!valor) return null;
  return JSON.stringify(valor, (_chave, item) => {
    if (typeof item === "bigint") return item.toString();
    if (item instanceof Date) return item.toISOString();
    return item;
  });
}

export class EducacionalRepository {
  async garantirEstrutura() {
    const chave = "educacional-fase1";
    if (!estruturaPromise.has(chave)) {
      estruturaPromise.set(chave, (async () => {
        for (const migration of migrationsEducacionais) {
          const arquivo = join(process.cwd(), "prisma", "migrations", migration, "migration.sql");
          if (!existsSync(arquivo)) continue;
          const comandos = dividirComandosSql(readFileSync(arquivo, "utf-8"));
          for (const comando of comandos) await prisma.$executeRawUnsafe(comando);
        }
      })());
    }
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
        ? await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`SELECT m.*, a.beneficiario_id, b.nome_completo AS aluno_nome, t.nome AS turma_nome, u.nome_fantasia AS unidade_nome, s.nome AS sala_nome FROM educacional_matricula m INNER JOIN educacional_aluno a ON a.id = m.aluno_id AND a.tenant_id::text = ${tenantId} INNER JOIN cadastro_beneficiario b ON b.id = a.beneficiario_id AND b.tenant_id::text = ${tenantId} LEFT JOIN educacional_turma t ON t.id = m.turma_id AND t.tenant_id::text = ${tenantId} LEFT JOIN unidade_assistencial u ON u.id = m.unidade_id AND u.tenant_id::text = ${tenantId} LEFT JOIN salas_unidade s ON s.id = m.sala_id AND s.unidade_id = m.unidade_id WHERE m.tenant_id::text = ${tenantId} ORDER BY m.id DESC LIMIT 500`)
      : recurso === "profissionais"
        ? await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`SELECT v.*, p.nome_completo AS profissional_nome, p.categoria AS profissional_categoria FROM educacional_profissional_vinculo v INNER JOIN cadastro_profissionais p ON p.id = v.profissional_id AND p.tenant_id::text = ${tenantId} WHERE v.tenant_id::text = ${tenantId} ORDER BY v.id DESC LIMIT 500`)
        : await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`SELECT * FROM ${Prisma.raw(tabela)} WHERE tenant_id::text = ${tenantId} ORDER BY id DESC LIMIT 500`);
    return rows.map((row) => this.serializar(row));
  }

  async buscarBeneficiarios(termo: string, tenantId: string) {
    const busca = `%${termo.trim()}%`;
    return prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT b.id, b.codigo, b.nome_completo, b.data_nascimento, b.nome_mae
      FROM cadastro_beneficiario b
      WHERE b.tenant_id::text = ${tenantId}
        AND (b.nome_completo ILIKE ${busca} OR COALESCE(b.codigo, '') ILIKE ${busca} OR regexp_replace(COALESCE(b.cpf, ''), '[^0-9]', '', 'g') LIKE regexp_replace(${busca}, '[^0-9]', '', 'g'))
      ORDER BY b.nome_completo ASC LIMIT 50
    `).then((rows) => rows.map((row) => this.serializar(row)));
  }

  async listarUnidadesEnsino(tenantId: string) {
    const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT u.id AS unidade_id, u.nome_fantasia AS unidade_nome,
             s.id AS sala_id, s.nome AS sala_nome,
             COALESCE(s.capacidade_maxima, 0) AS capacidade_maxima,
             COUNT(m.id) FILTER (WHERE m.situacao IN ('ATIVA', 'PENDENTE'))::bigint AS ocupadas
      FROM unidade_assistencial u
      LEFT JOIN salas_unidade s ON s.unidade_id = u.id AND COALESCE(s.ativo, TRUE) = TRUE
      LEFT JOIN educacional_matricula m
        ON m.unidade_id = u.id AND m.sala_id = s.id AND m.tenant_id::text = ${tenantId}
      WHERE u.tenant_id::text = ${tenantId} AND u.tipo_unidade = 'ENSINO'
      GROUP BY u.id, u.nome_fantasia, s.id, s.nome, s.capacidade_maxima
      ORDER BY u.nome_fantasia ASC, s.nome ASC
    `);
    const unidades = new Map<string, { id: string; nome: string; salas: Array<Record<string, unknown>> }>();
    for (const row of rows) {
      const unidadeId = String(row.unidade_id);
      if (!unidades.has(unidadeId)) unidades.set(unidadeId, { id: unidadeId, nome: String(row.unidade_nome ?? ""), salas: [] });
      if (row.sala_id !== null && row.sala_id !== undefined) {
        const capacidade = Number(row.capacidade_maxima ?? 0);
        const ocupadas = Number(row.ocupadas ?? 0);
        unidades.get(unidadeId)?.salas.push({
          id: String(row.sala_id),
          nome: String(row.sala_nome ?? ""),
          capacidade_maxima: capacidade,
          ocupadas,
          disponiveis: capacidade > 0 ? Math.max(capacidade - ocupadas, 0) : null,
          lotada: capacidade > 0 && ocupadas >= capacidade
        });
      }
    }
    return [...unidades.values()];
  }

  async listarAlunosAgrupados(
    filtros: {
      instituicao_id?: number; unidade_id?: number; ano_letivo_id?: number; sala_id?: number;
      turma_id?: number; etapa_id?: number; serie_id?: number; turno?: string; situacao?: string;
      busca?: string; sem_sala?: boolean; sem_instituicao?: boolean; matricula_pendente?: boolean;
      aluno_ativo?: boolean; pagina: number; limite: number;
    },
    tenantId: string
  ) {
    await this.garantirEstrutura();
    const condicoes = [
      Prisma.sql`a.tenant_id::text = ${tenantId}`,
      Prisma.sql`b.tenant_id::text = ${tenantId}`
    ];
    if (filtros.aluno_ativo !== undefined) condicoes.push(Prisma.sql`a.status = ${filtros.aluno_ativo ? "ATIVO" : "INATIVO"}`);
    if (filtros.instituicao_id || filtros.unidade_id) condicoes.push(Prisma.sql`m.unidade_id = ${filtros.instituicao_id ?? filtros.unidade_id}`);
    if (filtros.ano_letivo_id) condicoes.push(Prisma.sql`m.ano_letivo_id = ${filtros.ano_letivo_id}`);
    if (filtros.sala_id) condicoes.push(Prisma.sql`m.sala_id = ${filtros.sala_id}`);
    if (filtros.turma_id) condicoes.push(Prisma.sql`m.turma_id = ${filtros.turma_id}`);
    if (filtros.etapa_id) condicoes.push(Prisma.sql`m.etapa_id = ${filtros.etapa_id}`);
    if (filtros.serie_id) condicoes.push(Prisma.sql`m.serie_id = ${filtros.serie_id}`);
    if (filtros.turno) condicoes.push(Prisma.sql`COALESCE(m.turno, t.turno, '') = ${filtros.turno}`);
    if (filtros.situacao) condicoes.push(Prisma.sql`COALESCE(m.situacao, 'PENDENTE') = ${filtros.situacao}`);
    if (filtros.sem_sala) condicoes.push(Prisma.sql`m.sala_id IS NULL`);
    if (filtros.sem_instituicao) condicoes.push(Prisma.sql`m.unidade_id IS NULL`);
    if (filtros.matricula_pendente) condicoes.push(Prisma.sql`COALESCE(m.situacao, 'PENDENTE') = 'PENDENTE'`);
    if (filtros.busca) {
      const busca = `%${filtros.busca}%`;
      condicoes.push(Prisma.sql`(
        b.nome_completo ILIKE ${busca}
        OR COALESCE(b.codigo, '') ILIKE ${busca}
        OR regexp_replace(COALESCE(b.cpf, ''), '[^0-9]', '', 'g') LIKE regexp_replace(${busca}, '[^0-9]', '', 'g')
        OR COALESCE(m.numero_matricula, '') ILIKE ${busca}
        OR COALESCE(b.nome_mae, '') ILIKE ${busca}
        OR EXISTS (SELECT 1 FROM contato_beneficiario cb WHERE cb.beneficiario_id = b.id AND COALESCE(cb.telefone_principal, '') ILIKE ${busca})
      )`);
    }
    const where = Prisma.join(condicoes, " AND ");
    const from = Prisma.sql`
      FROM educacional_aluno a
      INNER JOIN cadastro_beneficiario b ON b.id = a.beneficiario_id AND b.tenant_id::text = ${tenantId}
      LEFT JOIN LATERAL (
        SELECT m0.*
        FROM educacional_matricula m0
        WHERE m0.aluno_id = a.id AND m0.tenant_id::text = ${tenantId}
        ORDER BY m0.ativo DESC NULLS LAST, m0.id DESC
        LIMIT 1
      ) m ON TRUE
      LEFT JOIN unidade_assistencial u ON u.id = m.unidade_id AND u.tenant_id::text = ${tenantId}
      LEFT JOIN salas_unidade s ON s.id = m.sala_id AND s.unidade_id = m.unidade_id
      LEFT JOIN educacional_turma t ON t.id = m.turma_id AND t.tenant_id::text = ${tenantId}
      LEFT JOIN educacional_ano_letivo al ON al.id = m.ano_letivo_id AND al.tenant_id::text = ${tenantId}
      LEFT JOIN educacional_etapa e ON e.id = m.etapa_id AND e.tenant_id::text = ${tenantId}
      LEFT JOIN educacional_serie se ON se.id = m.serie_id AND se.tenant_id::text = ${tenantId}
      LEFT JOIN LATERAL (SELECT cb.telefone_principal FROM contato_beneficiario cb WHERE cb.beneficiario_id = b.id ORDER BY cb.id LIMIT 1) c ON TRUE
      WHERE ${where}
    `;
    const base = Prisma.sql`SELECT a.id AS aluno_id, a.status AS aluno_status, a.beneficiario_id,
      b.nome_completo, b.codigo AS codigo_beneficiario, b.data_nascimento, b.nome_mae,
      b.foto_3x4, c.telefone_principal,
      m.id AS matricula_id, m.numero_matricula, m.data_matricula, m.data_inicio, m.data_encerramento,
      m.situacao, m.turno AS matricula_turno, m.observacoes AS matricula_observacoes,
      u.id AS unidade_id, u.nome_fantasia AS unidade_nome, u.cnpj AS unidade_cnpj,
      s.id AS sala_id, s.nome AS sala_nome, s.capacidade_maxima,
      t.id AS turma_id, t.nome AS turma_nome, t.turno AS turma_turno, t.capacidade_maxima AS turma_capacidade,
      al.id AS ano_letivo_id, al.ano AS ano_letivo, e.nome AS etapa_nome, se.nome AS serie_nome ${from}`;
    const offset = (filtros.pagina - 1) * filtros.limite;
    const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`${base} ORDER BY COALESCE(u.nome_fantasia, 'Sem instituição'), COALESCE(s.nome, 'Sem sala'), b.nome_completo LIMIT ${filtros.limite} OFFSET ${offset}`);
    const totalRows = await prisma.$queryRaw<Array<{ total: bigint; instituicoes: bigint; salas: bigint; alunos_ativos: bigint; alunos_sem_sala: bigint; alunos_sem_instituicao: bigint }>>(Prisma.sql`SELECT COUNT(*)::bigint AS total, COUNT(DISTINCT unidade_id)::bigint AS instituicoes, COUNT(DISTINCT sala_id)::bigint AS salas, COUNT(*) FILTER (WHERE aluno_status = 'ATIVO')::bigint AS alunos_ativos, COUNT(*) FILTER (WHERE sala_id IS NULL)::bigint AS alunos_sem_sala, COUNT(*) FILTER (WHERE unidade_id IS NULL)::bigint AS alunos_sem_instituicao FROM (${base}) agrupados`);
    const rowsSerializadas = rows.map((row) => this.serializar(row)).filter((row): row is Record<string, unknown> => !!row);
    const grupos = new Map<string, { instituicao: Record<string, unknown>; salas: Array<Record<string, unknown>> }>();
    for (const row of rowsSerializadas) {
      const instituicaoId = String(row.unidade_id ?? "sem-instituicao");
      const salaId = String(row.sala_id ?? "sem-sala");
      if (!grupos.has(instituicaoId)) grupos.set(instituicaoId, { instituicao: { id: row.unidade_id, nome: row.unidade_nome ?? "Sem instituição", cnpj: row.unidade_cnpj, alunos_ativos: 0, alunos_inativos: 0, salas: 0 }, salas: [] });
      const grupo = grupos.get(instituicaoId)!;
      let sala = grupo.salas.find((item) => String(item.id) === salaId);
      if (!sala) { sala = { id: row.sala_id, nome: row.sala_nome ?? "Sem sala", turma_nome: row.turma_nome, etapa_nome: row.etapa_nome, serie_nome: row.serie_nome, turno: row.matricula_turno ?? row.turma_turno, capacidade: row.sala_id ? Number(row.capacidade_maxima ?? row.turma_capacidade ?? 0) : 0, alunos: [], vagas_disponiveis: null }; grupo.salas.push(sala); grupo.instituicao.salas = Number(grupo.instituicao.salas ?? 0) + 1; }
      (sala.alunos as Array<Record<string, unknown>>).push(row);
      if (row.aluno_status === "ATIVO") grupo.instituicao.alunos_ativos = Number(grupo.instituicao.alunos_ativos ?? 0) + 1;
      else grupo.instituicao.alunos_inativos = Number(grupo.instituicao.alunos_inativos ?? 0) + 1;
    }
    for (const grupo of grupos.values()) for (const sala of grupo.salas) sala.vagas_disponiveis = Number(sala.capacidade) > 0 ? Math.max(Number(sala.capacidade) - (sala.alunos as unknown[]).filter((item) => ["ATIVA", "PENDENTE"].includes(String((item as Record<string, unknown>).situacao))).length, 0) : null;
    return { grupos: [...grupos.values()], total: Number(totalRows[0]?.total ?? 0), pagina: filtros.pagina, limite: filtros.limite, indicadores: { instituicoes: Number(totalRows[0]?.instituicoes ?? 0), salas: Number(totalRows[0]?.salas ?? 0), alunos: Number(totalRows[0]?.total ?? 0), alunos_ativos: Number(totalRows[0]?.alunos_ativos ?? 0), alunos_sem_sala: Number(totalRows[0]?.alunos_sem_sala ?? 0), alunos_sem_instituicao: Number(totalRows[0]?.alunos_sem_instituicao ?? 0) } };
  }

  async transferirMatricula(
    matriculaId: string,
    input: { instituicao_destino_id: number; sala_destino_id: number; turma_destino_id?: number | null; data_transferencia: string; motivo: string; observacoes?: string | null },
    tenantId: string,
    actor: EducacionalActor
  ) {
    await this.garantirEstrutura();
    const origem = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`SELECT * FROM educacional_matricula WHERE id = ${BigInt(matriculaId)} AND tenant_id::text = ${tenantId} LIMIT 1`);
    if (!origem[0]) throw new AppError("Matrícula não encontrada nesta instituição.", 404);
    if (origem[0].situacao !== "ATIVA" || origem[0].ativo === false) throw new AppError("Somente matrículas ativas podem ser transferidas.", 409);
    await this.validarDestinoTransferencia(input, tenantId, BigInt(matriculaId));
    const destinoNumero = `${String(origem[0].numero_matricula)}-T${Date.now().toString().slice(-6)}`;
    const resultado = await prisma.$transaction(async (tx) => {
      const encerrada = await tx.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`UPDATE educacional_matricula SET situacao = 'TRANSFERIDA', ativo = FALSE, data_encerramento = ${input.data_transferencia}::date, atualizado_em = NOW() WHERE id = ${BigInt(matriculaId)} AND tenant_id::text = ${tenantId} RETURNING *`);
      const nova = await tx.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`INSERT INTO educacional_matricula (tenant_id, aluno_id, ano_letivo_id, unidade_id, sala_id, etapa_id, serie_id, turma_id, numero_matricula, data_matricula, data_inicio, turno, situacao, observacoes, usuario_responsavel_id, usuario_responsavel_nome, ativo) VALUES (${tenantId}::uuid, ${origem[0].aluno_id}, ${origem[0].ano_letivo_id}, ${input.instituicao_destino_id}, ${input.sala_destino_id}, ${origem[0].etapa_id}, ${origem[0].serie_id}, ${input.turma_destino_id ?? null}, ${destinoNumero}, ${input.data_transferencia}::date, ${input.data_transferencia}::date, ${origem[0].turno ?? null}, 'ATIVA', ${input.observacoes ?? null}, ${actor.id ? BigInt(actor.id) : null}, ${actor.nome ?? actor.nomeUsuario ?? null}, TRUE) RETURNING *`);
      await tx.$executeRaw(Prisma.sql`INSERT INTO educacional_matricula_movimentacao (tenant_id, matricula_origem_id, matricula_destino_id, tipo, data_movimentacao, motivo, observacoes, dados_anteriores, dados_novos, usuario_responsavel_id, usuario_responsavel_nome) VALUES (${tenantId}::uuid, ${BigInt(matriculaId)}, ${nova[0]?.id}, 'TRANSFERENCIA', ${input.data_transferencia}::date, ${input.motivo}, ${input.observacoes ?? null}, ${jsonSeguro(origem[0])}::jsonb, ${jsonSeguro(nova[0])}::jsonb, ${actor.id ? BigInt(actor.id) : null}, ${actor.nome ?? actor.nomeUsuario ?? null})`);
      return { origem: encerrada[0], destino: nova[0] };
    });
    await this.auditar("educacional_matricula", BigInt(matriculaId), "TRANSFERIR", origem[0], resultado.destino, tenantId, actor);
    return { origem: this.serializar(resultado.origem), destino: this.serializar(resultado.destino) };
  }

  async editarVinculoMatricula(
    matriculaId: string,
    input: { instituicao_id: number; sala_id: number; turma_id?: number | null; data_alteracao: string; motivo: string; observacoes?: string | null },
    tenantId: string,
    actor: EducacionalActor
  ) {
    await this.garantirEstrutura();
    const id = BigInt(matriculaId);
    const origem = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`SELECT * FROM educacional_matricula WHERE id = ${id} AND tenant_id::text = ${tenantId} LIMIT 1`);
    if (!origem[0]) throw new AppError("Matrícula não encontrada nesta instituição.", 404);
    if (origem[0].situacao !== "ATIVA" || origem[0].ativo === false) throw new AppError("Somente matrículas ativas podem ter o vínculo alterado.", 409);
    await this.validarDestinoTransferencia({ instituicao_destino_id: input.instituicao_id, sala_destino_id: input.sala_id, turma_destino_id: input.turma_id }, tenantId, id);
    const atualizado = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`UPDATE educacional_matricula SET unidade_id = ${BigInt(input.instituicao_id)}, sala_id = ${BigInt(input.sala_id)}, turma_id = ${input.turma_id ?? null}, atualizado_em = NOW() WHERE id = ${id} AND tenant_id::text = ${tenantId} RETURNING *`);
      await tx.$executeRaw(Prisma.sql`INSERT INTO educacional_matricula_movimentacao (tenant_id, matricula_origem_id, matricula_destino_id, tipo, data_movimentacao, motivo, observacoes, dados_anteriores, dados_novos, usuario_responsavel_id, usuario_responsavel_nome) VALUES (${tenantId}::uuid, ${id}, ${id}, 'ALTERACAO_VINCULO', ${input.data_alteracao}::date, ${input.motivo}, ${input.observacoes ?? null}, ${jsonSeguro(origem[0])}::jsonb, ${jsonSeguro(rows[0])}::jsonb, ${actor.id ? BigInt(actor.id) : null}, ${actor.nome ?? actor.nomeUsuario ?? null})`);
      return rows[0];
    });
    await this.auditar("educacional_matricula", id, "ALTERAR_VINCULO", origem[0], atualizado, tenantId, actor);
    return this.serializar(atualizado);
  }

  async criarVinculoAluno(
    alunoId: string,
    input: { instituicao_id: number; sala_id: number; ano_letivo_id: number; etapa_id: number; serie_id: number; turma_id?: number | null; numero_matricula?: string | null; data_inicio: string; motivo: string; observacoes?: string | null },
    tenantId: string,
    actor: EducacionalActor
  ) {
    await this.garantirEstrutura();
    const aluno = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`SELECT * FROM educacional_aluno WHERE id = ${BigInt(alunoId)} AND tenant_id::text = ${tenantId} LIMIT 1`);
    if (!aluno[0]) throw new AppError("Aluno não encontrado nesta instituição.", 404);
    const ativa = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`SELECT id FROM educacional_matricula WHERE aluno_id = ${BigInt(alunoId)} AND tenant_id::text = ${tenantId} AND situacao IN ('ATIVA', 'PENDENTE') AND COALESCE(ativo, TRUE) = TRUE LIMIT 1`);
    if (ativa[0]) throw new AppError("Este aluno já possui matrícula ativa.", 409);
    await this.validarDestinoTransferencia({ instituicao_destino_id: input.instituicao_id, sala_destino_id: input.sala_id, turma_destino_id: input.turma_id }, tenantId, 0n);
    const referencias = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`SELECT id FROM educacional_ano_letivo WHERE id = ${BigInt(input.ano_letivo_id)} AND tenant_id::text = ${tenantId} LIMIT 1`);
    const etapa = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`SELECT id FROM educacional_etapa WHERE id = ${BigInt(input.etapa_id)} AND tenant_id::text = ${tenantId} LIMIT 1`);
    const serie = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`SELECT id FROM educacional_serie WHERE id = ${BigInt(input.serie_id)} AND tenant_id::text = ${tenantId} LIMIT 1`);
    if (!referencias[0] || !etapa[0] || !serie[0]) throw new AppError("Ano letivo, etapa ou série não pertence à instituição atual.", 400);
    const numero = input.numero_matricula?.trim() || `PROV-${alunoId}-${Date.now().toString().slice(-8)}`;
    const nova = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`INSERT INTO educacional_matricula (tenant_id, aluno_id, ano_letivo_id, unidade_id, sala_id, etapa_id, serie_id, turma_id, numero_matricula, data_matricula, data_inicio, situacao, observacoes, usuario_responsavel_id, usuario_responsavel_nome, ativo) VALUES (${tenantId}::uuid, ${BigInt(alunoId)}, ${BigInt(input.ano_letivo_id)}, ${BigInt(input.instituicao_id)}, ${BigInt(input.sala_id)}, ${BigInt(input.etapa_id)}, ${BigInt(input.serie_id)}, ${input.turma_id ?? null}, ${numero}, ${input.data_inicio}::date, ${input.data_inicio}::date, 'ATIVA', ${input.observacoes ?? null}, ${actor.id ? BigInt(actor.id) : null}, ${actor.nome ?? actor.nomeUsuario ?? null}, TRUE) RETURNING *`);
    await prisma.$executeRaw(Prisma.sql`INSERT INTO educacional_matricula_movimentacao (tenant_id, matricula_origem_id, matricula_destino_id, tipo, data_movimentacao, motivo, observacoes, dados_anteriores, dados_novos, usuario_responsavel_id, usuario_responsavel_nome) VALUES (${tenantId}::uuid, ${nova[0]?.id}, ${nova[0]?.id}, 'CRIACAO_VINCULO', ${input.data_inicio}::date, ${input.motivo}, ${input.observacoes ?? null}, NULL, ${jsonSeguro(nova[0])}::jsonb, ${actor.id ? BigInt(actor.id) : null}, ${actor.nome ?? actor.nomeUsuario ?? null})`);
    await this.auditar("educacional_matricula", nova[0]?.id as bigint, "CRIAR_VINCULO", null, nova[0], tenantId, actor);
    return this.serializar(nova[0]);
  }

  async listarHistoricoMatricula(matriculaId: string, tenantId: string) {
    await this.garantirEstrutura();
    const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT mv.*, mo.numero_matricula AS matricula_origem_numero, md.numero_matricula AS matricula_destino_numero,
        uo.nome_fantasia AS unidade_origem_nome, ud.nome_fantasia AS unidade_destino_nome,
        so.nome AS sala_origem_nome, sd.nome AS sala_destino_nome
      FROM educacional_matricula_movimentacao mv
      INNER JOIN educacional_matricula mo ON mo.id = mv.matricula_origem_id AND mo.tenant_id::text = ${tenantId}
      LEFT JOIN educacional_matricula md ON md.id = mv.matricula_destino_id AND md.tenant_id::text = ${tenantId}
      LEFT JOIN unidade_assistencial uo ON uo.id = mo.unidade_id AND uo.tenant_id::text = ${tenantId}
      LEFT JOIN unidade_assistencial ud ON ud.id = md.unidade_id AND ud.tenant_id::text = ${tenantId}
      LEFT JOIN salas_unidade so ON so.id = mo.sala_id
      LEFT JOIN salas_unidade sd ON sd.id = md.sala_id
      WHERE mv.tenant_id::text = ${tenantId} AND (mv.matricula_origem_id = ${BigInt(matriculaId)} OR mv.matricula_destino_id = ${BigInt(matriculaId)})
      ORDER BY mv.data_movimentacao DESC, mv.id DESC
    `);
    return rows.map((row) => this.serializar(row));
  }

  private async validarDestinoTransferencia(input: { instituicao_destino_id: number; sala_destino_id: number; turma_destino_id?: number | null }, tenantId: string, matriculaId: bigint) {
    const sala = await prisma.$queryRaw<Array<{ capacidade_maxima: number }>>(Prisma.sql`SELECT s.capacidade_maxima FROM salas_unidade s INNER JOIN unidade_assistencial u ON u.id = s.unidade_id WHERE s.id = ${BigInt(input.sala_destino_id)} AND s.unidade_id = ${BigInt(input.instituicao_destino_id)} AND u.tenant_id::text = ${tenantId} AND u.tipo_unidade = 'ENSINO' AND COALESCE(s.ativo, TRUE) = TRUE LIMIT 1`);
    if (!sala[0]) throw new AppError("A sala de destino não pertence a uma unidade escolar desta instituição.", 400);
    if (input.turma_destino_id) {
      const turma = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`SELECT id FROM educacional_turma WHERE id = ${BigInt(input.turma_destino_id)} AND tenant_id::text = ${tenantId} AND unidade_id = ${BigInt(input.instituicao_destino_id)} AND (sala_id IS NULL OR sala_id = ${BigInt(input.sala_destino_id)}) AND status = 'ATIVA' LIMIT 1`);
      if (!turma[0]) throw new AppError("A turma de destino não pertence à instituição e à sala selecionadas.", 400);
    }
    const ocupacao = await prisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`SELECT COUNT(*)::bigint AS total FROM educacional_matricula WHERE tenant_id::text = ${tenantId} AND unidade_id = ${BigInt(input.instituicao_destino_id)} AND sala_id = ${BigInt(input.sala_destino_id)} AND situacao IN ('ATIVA', 'PENDENTE') AND id <> ${matriculaId}`);
    if (Number(sala[0].capacidade_maxima ?? 0) > 0 && Number(ocupacao[0]?.total ?? 0) >= Number(sala[0].capacidade_maxima)) throw new AppError("A sala de destino atingiu sua capacidade máxima.", 409);
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
    await this.validarReferencias(recurso, input, tenantId, rawId);
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
      const sets = permitido.map(([key, value]) => Prisma.sql`${Prisma.raw(key)} = ${valorSql(key, value)}`);
      const query = sets.reduce((acc, item, index) => index === 0 ? item : Prisma.sql`${acc}, ${item}`, Prisma.empty);
      const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`UPDATE ${Prisma.raw(tabela)} SET ${query}, atualizado_em = NOW() WHERE id = ${id} AND tenant_id::text = ${tenantId} RETURNING *`);
      await this.auditar(tabela, id, "ATUALIZAR", anterior[0], rows[0], tenantId, actor);
      return this.serializar(rows[0]);
    }
    const colunas = permitido.map(([key]) => Prisma.raw(key));
    const valores = permitido.map(([key, value]) => valorSql(key, value));
    const colunasSql = colunas.reduce((acc, item, index) => index === 0 ? item : Prisma.sql`${acc}, ${item}`, Prisma.empty);
    const valoresSql = valores.reduce((acc, item, index) => index === 0 ? item : Prisma.sql`${acc}, ${item}`, Prisma.empty);
    const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`INSERT INTO ${Prisma.raw(tabela)} (tenant_id, ${colunasSql}) VALUES (${tenantId}::uuid, ${valoresSql}) RETURNING *`);
    await this.auditar(tabela, rows[0]?.id as bigint, "CRIAR", null, rows[0], tenantId, actor);
    return this.serializar(rows[0]);
  }

  private async validarReferencias(recurso: EducacionalRecurso, input: Record<string, unknown>, tenantId: string, rawId?: string) {
    const referencias: Array<[string, string]> = [];
    if (recurso === "profissionais") {
      const profissional = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`SELECT id FROM cadastro_profissionais WHERE id = ${BigInt(String(input.profissional_id))} AND tenant_id::text = ${tenantId} LIMIT 1`);
      if (!profissional[0]) throw new AppError("Profissional não encontrado nesta instituição.", 404);
      if (input.unidade_id) referencias.push(["unidade_assistencial", "unidade_id"]);
      if (input.disciplina_id) referencias.push(["educacional_disciplina", "disciplina_id"]);
      if (input.turma_id) referencias.push(["educacional_turma", "turma_id"]);
    }
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
      const unidade = await prisma.$queryRaw<Array<{ tipo_unidade: string }>>(Prisma.sql`SELECT tipo_unidade FROM unidade_assistencial WHERE id = ${BigInt(String(input.unidade_id))} AND tenant_id::text = ${tenantId} LIMIT 1`);
      if (!unidade[0]) throw new AppError("Unidade de ensino não encontrada nesta instituição.", 400);
      if (unidade[0].tipo_unidade !== "ENSINO") throw new AppError("Selecione uma unidade classificada como unidade de ensino.", 400);
    }
    if (recurso === "matriculas") await this.validarVagaSala(input, tenantId, rawId);
    for (const [tabelaReferencia, campo] of referencias) {
      const valor = BigInt(String(input[campo]));
      const encontrado = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`SELECT id FROM ${Prisma.raw(tabelaReferencia)} WHERE id = ${valor} AND tenant_id::text = ${tenantId} LIMIT 1`);
      if (!encontrado[0]) throw new AppError("A referência informada não pertence à instituição atual.", 400);
    }
  }

  private async validarVagaSala(input: Record<string, unknown>, tenantId: string, rawId?: string) {
    const unidadeId = BigInt(String(input.unidade_id));
    const salaId = BigInt(String(input.sala_id));
    const sala = await prisma.$queryRaw<Array<{ capacidade_maxima: number }>>(Prisma.sql`
      SELECT s.capacidade_maxima
      FROM salas_unidade s
      INNER JOIN unidade_assistencial u ON u.id = s.unidade_id
      WHERE s.id = ${salaId} AND s.unidade_id = ${unidadeId}
        AND u.tenant_id::text = ${tenantId} AND u.tipo_unidade = 'ENSINO'
        AND COALESCE(s.ativo, TRUE) = TRUE
      LIMIT 1
    `);
    if (!sala[0]) throw new AppError("A sala selecionada não pertence à unidade de ensino ou está inativa.", 400);
    const capacidade = Number(sala[0].capacidade_maxima ?? 0);
    if (capacidade < 1) throw new AppError("Configure a capacidade da sala antes de matricular alunos.", 400);
    const matriculaId = rawId ? BigInt(rawId) : null;
    const ocupacao = await prisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`
      SELECT COUNT(*)::bigint AS total FROM educacional_matricula
      WHERE tenant_id::text = ${tenantId} AND unidade_id = ${unidadeId} AND sala_id = ${salaId}
        AND situacao IN ('ATIVA', 'PENDENTE')
        AND (${matriculaId}::bigint IS NULL OR id <> ${matriculaId})
    `);
    const total = Number(ocupacao[0]?.total ?? 0);
    if (total >= capacidade) throw new AppError(`A sala está lotada. Capacidade: ${capacidade}; ocupadas: ${total}.`, 409);
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
  private async auditar(entidade: string, id: bigint, acao: string, anterior: unknown, novo: unknown, tenantId: string, actor: EducacionalActor) { await prisma.$executeRaw(Prisma.sql`INSERT INTO educacional_auditoria (tenant_id, entidade, entidade_id, acao, dados_anteriores, dados_novos, usuario_id, usuario_nome) VALUES (${tenantId}::uuid, ${entidade}, ${id}, ${acao}, ${jsonSeguro(anterior)}::jsonb, ${jsonSeguro(novo)}::jsonb, ${actor.id ? BigInt(actor.id) : null}, ${actor.nome ?? actor.nomeUsuario ?? "Usuário autenticado"})`); }
}
