import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import type { EducacionalActor, EducacionalRecurso } from "../educacional.types.js";

const estruturaPromise = new Map<string, Promise<void>>();
const tabelaPorRecurso: Record<EducacionalRecurso, string> = { "anos-letivos": "educacional_ano_letivo", etapas: "educacional_etapa", series: "educacional_serie", disciplinas: "educacional_disciplina", turmas: "educacional_turma", alunos: "educacional_aluno", matriculas: "educacional_matricula", enturmacoes: "educacional_enturmacao" };

export class EducacionalRepository {
  async garantirEstrutura() {
    const chave = "educacional-fase1";
    if (!estruturaPromise.has(chave)) estruturaPromise.set(chave, prisma.$executeRawUnsafe("SELECT 1").then(() => undefined));
    await estruturaPromise.get(chave);
  }

  private tabela(recurso: EducacionalRecurso) { return tabelaPorRecurso[recurso]; }

  async resumo(tenantId: string) {
    await this.garantirEstrutura();
    const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT
        (SELECT COUNT(*) FROM educacional_aluno WHERE tenant_id::text = ${tenantId} AND status = 'ATIVO') AS alunos_ativos,
        (SELECT COUNT(*) FROM educacional_matricula WHERE tenant_id::text = ${tenantId} AND situacao = 'ATIVA') AS matriculas_ativas,
        (SELECT COUNT(*) FROM educacional_turma WHERE tenant_id::text = ${tenantId} AND status = 'ATIVA') AS turmas_ativas,
        (SELECT COUNT(*) FROM educacional_disciplina WHERE tenant_id::text = ${tenantId} AND status = 'ATIVA') AS disciplinas_ativas,
        (SELECT COUNT(*) FROM educacional_ano_letivo WHERE tenant_id::text = ${tenantId} AND status IN ('ABERTO','EM_ANDAMENTO')) AS anos_abertos
    `);
    return Object.fromEntries(Object.entries(rows[0] ?? {}).map(([key, value]) => [key, Number(value ?? 0)]));
  }

  async listar(recurso: EducacionalRecurso, tenantId: string) {
    await this.garantirEstrutura();
    const tabela = this.tabela(recurso);
    const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`SELECT * FROM ${Prisma.raw(tabela)} WHERE tenant_id::text = ${tenantId} ORDER BY id DESC LIMIT 500`);
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
    const id = rawId ? BigInt(rawId) : undefined;
    const permitido = Object.entries(input).filter(([key, value]) => key !== "id" && value !== undefined).map(([key, value]) => [key, value] as const);
    if (!permitido.length) throw new AppError("Informe dados para salvar.", 400);
    if (id) {
      const anterior = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`SELECT * FROM ${Prisma.raw(tabela)} WHERE id = ${id} AND tenant_id::text = ${tenantId} LIMIT 1`);
      if (!anterior[0]) throw new AppError("Registro educacional não encontrado.", 404);
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
    for (const [tabelaReferencia, campo] of referencias) {
      const valor = BigInt(String(input[campo]));
      const encontrado = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`SELECT id FROM ${Prisma.raw(tabelaReferencia)} WHERE id = ${valor} AND tenant_id::text = ${tenantId} LIMIT 1`);
      if (!encontrado[0]) throw new AppError("A referência informada não pertence à instituição atual.", 400);
    }
  }

  private serializar(row?: Record<string, unknown>) { if (!row) return null; return Object.fromEntries(Object.entries(row).map(([key, value]) => [key, typeof value === "bigint" ? value.toString() : value instanceof Date ? value.toISOString().slice(0, 10) : value])); }
  private async auditar(entidade: string, id: bigint, acao: string, anterior: unknown, novo: unknown, tenantId: string, actor: EducacionalActor) { await prisma.$executeRaw(Prisma.sql`INSERT INTO educacional_auditoria (tenant_id, entidade, entidade_id, acao, dados_anteriores, dados_novos, usuario_id, usuario_nome) VALUES (${tenantId}::uuid, ${entidade}, ${id}, ${acao}, ${anterior ? JSON.stringify(anterior) : null}::jsonb, ${novo ? JSON.stringify(novo) : null}::jsonb, ${actor.id ? BigInt(actor.id) : null}, ${actor.nome ?? actor.nomeUsuario ?? "Usuário autenticado"})`); }
}
