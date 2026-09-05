import { Prisma } from "@prisma/client";
import { prisma } from "../../database/prisma.js";
import type { CriarVinculoInput, ListarPessoasQuery, RevisarDuplicidadeInput } from "./pessoas.types.js";

function mascararCpf(value: unknown) {
  const cpf = String(value ?? "");
  return cpf.length === 11 ? `***.***.***-${cpf.slice(-2)}` : undefined;
}

function mapPessoa(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    nomeCompleto: row.nome_completo,
    nomeSocial: row.nome_social,
    dataNascimento: row.data_nascimento,
    cpfMascarado: mascararCpf(row.cpf_normalizado),
    email: row.email_normalizado,
    status: row.status,
    vinculos: Number(row.total_vinculos ?? 0),
    criadoEm: row.criado_em,
    atualizadoEm: row.atualizado_em
  };
}

export class PessoasRepository {
  async listarDuplicidades(tenantId: string) {
    const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT p.cpf_normalizado, COUNT(*)::int AS quantidade,
             jsonb_agg(jsonb_build_object(
               'id', p.id,
               'nomeCompleto', p.nome_completo,
               'dataNascimento', p.data_nascimento,
               'cpfMascarado', CASE WHEN length(p.cpf_normalizado) = 11 THEN '***.***.***-' || right(p.cpf_normalizado, 2) ELSE NULL END,
               'status', p.status
             ) ORDER BY p.nome_completo, p.id) AS pessoas
      FROM pessoa p
      WHERE p.tenant_id = ${tenantId}::uuid
        AND p.status <> 'ANONIMIZADA'
        AND p.cpf_normalizado IS NOT NULL AND p.cpf_normalizado <> ''
      GROUP BY p.cpf_normalizado
      HAVING COUNT(*) > 1
      ORDER BY quantidade DESC, p.cpf_normalizado
    `);
    return rows.map((row) => ({ quantidade: Number(row.quantidade), pessoas: row.pessoas }));
  }

  async listar(tenantId: string, query: ListarPessoasQuery) {
    const offset = (query.page - 1) * query.pageSize;
    const search = query.search ? `%${query.search.replace(/[%_]/g, "\\$&")}%` : null;
    const tipo = query.tipoVinculo ?? null;
    const [rows, total] = await Promise.all([
      prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
        SELECT p.id, p.nome_completo, p.nome_social, p.data_nascimento,
               p.cpf_normalizado, p.email_normalizado, p.status,
               p.criado_em, p.atualizado_em, COUNT(v.id)::int AS total_vinculos
        FROM pessoa p
        LEFT JOIN pessoa_vinculo v
          ON v.tenant_id = p.tenant_id AND v.pessoa_id = p.id AND v.ativo = TRUE
        WHERE p.tenant_id = ${tenantId}::uuid
          AND p.status <> 'ANONIMIZADA'
          AND (${search}::text IS NULL OR p.nome_completo ILIKE ${search} ESCAPE '\\'
               OR p.nome_social ILIKE ${search} ESCAPE '\\'
               OR p.email_normalizado ILIKE ${search} ESCAPE '\\')
          AND (${tipo}::text IS NULL OR EXISTS (
            SELECT 1 FROM pessoa_vinculo vf
            WHERE vf.tenant_id = p.tenant_id AND vf.pessoa_id = p.id
              AND vf.ativo = TRUE AND vf.tipo_vinculo = ${tipo}
          ))
        GROUP BY p.id
        ORDER BY p.nome_completo ASC, p.id ASC
        LIMIT ${query.pageSize} OFFSET ${offset}
      `),
      prisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`
        SELECT COUNT(*)::bigint AS total
        FROM pessoa p
        WHERE p.tenant_id = ${tenantId}::uuid
          AND p.status <> 'ANONIMIZADA'
          AND (${search}::text IS NULL OR p.nome_completo ILIKE ${search} ESCAPE '\\'
               OR p.nome_social ILIKE ${search} ESCAPE '\\'
               OR p.email_normalizado ILIKE ${search} ESCAPE '\\')
          AND (${tipo}::text IS NULL OR EXISTS (
            SELECT 1 FROM pessoa_vinculo vf
            WHERE vf.tenant_id = p.tenant_id AND vf.pessoa_id = p.id
              AND vf.ativo = TRUE AND vf.tipo_vinculo = ${tipo}
          ))
      `)
    ]);
    return { dados: rows.map(mapPessoa), paginacao: { pagina: query.page, tamanho: query.pageSize, total: Number(total[0]?.total ?? 0) } };
  }

  async buscar(tenantId: string, pessoaId: bigint) {
    const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT p.id, p.nome_completo, p.nome_social, p.data_nascimento,
             p.cpf_normalizado, p.email_normalizado, p.status,
             p.criado_em, p.atualizado_em
      FROM pessoa p
      WHERE p.id = ${pessoaId} AND p.tenant_id = ${tenantId}::uuid
        AND p.status <> 'ANONIMIZADA'
      LIMIT 1
    `);
    return rows[0] ? mapPessoa(rows[0]) : null;
  }

  async listarVinculos(tenantId: string, pessoaId: bigint) {
    return prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT id, tipo_vinculo, entidade_id, identificador_externo, principal,
             ativo, inicio_em, fim_em, metadados, criado_em, atualizado_em
      FROM pessoa_vinculo
      WHERE pessoa_id = ${pessoaId} AND tenant_id = ${tenantId}::uuid
      ORDER BY ativo DESC, principal DESC, tipo_vinculo ASC, id ASC
    `).then((rows) => rows.map((row) => ({
      id: String(row.id), tipoVinculo: row.tipo_vinculo,
      entidadeId: row.entidade_id ? String(row.entidade_id) : undefined,
      identificadorExterno: row.identificador_externo, principal: row.principal,
      ativo: row.ativo, inicioEm: row.inicio_em, fimEm: row.fim_em,
      metadados: row.metadados, criadoEm: row.criado_em, atualizadoEm: row.atualizado_em
    })));
  }

  async listarAuditoria(tenantId: string, pessoaId: bigint) {
    return prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT id, vinculo_id, usuario_id, acao, motivo, detalhes, endereco_ip, criado_em
      FROM pessoa_vinculo_auditoria
      WHERE tenant_id = ${tenantId}::uuid AND pessoa_id = ${pessoaId}
      ORDER BY criado_em DESC, id DESC
      LIMIT 200
    `).then((rows) => rows.map((row) => ({
      id: String(row.id), vinculoId: row.vinculo_id ? String(row.vinculo_id) : undefined,
      usuarioId: row.usuario_id ? String(row.usuario_id) : undefined, acao: row.acao,
      motivo: row.motivo, detalhes: row.detalhes, criadoEm: row.criado_em
    })));
  }

  async criarVinculo(tenantId: string, pessoaId: bigint, input: CriarVinculoInput, usuarioId?: string, ip?: string) {
    const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      INSERT INTO pessoa_vinculo (
        tenant_id, pessoa_id, tipo_vinculo, entidade_id, identificador_externo,
        principal, inicio_em, fim_em, metadados
      )
      SELECT ${tenantId}::uuid, p.id, ${input.tipoVinculo}, ${input.entidadeId ?? null},
             ${input.identificadorExterno ?? null}, ${input.principal ?? false},
             ${input.inicioEm ? new Date(input.inicioEm) : null},
             ${input.fimEm ? new Date(input.fimEm) : null},
             ${JSON.stringify(input.metadados ?? {})}::jsonb
      FROM pessoa p
      WHERE p.id = ${pessoaId} AND p.tenant_id = ${tenantId}::uuid
        AND p.status <> 'ANONIMIZADA'
      RETURNING id, tipo_vinculo, entidade_id, identificador_externo, principal,
                ativo, inicio_em, fim_em, metadados, criado_em, atualizado_em
    `);
    if (rows[0]) await prisma.$executeRaw(Prisma.sql`INSERT INTO pessoa_vinculo_auditoria (tenant_id, pessoa_id, vinculo_id, usuario_id, acao, detalhes, endereco_ip) VALUES (${tenantId}::uuid, ${pessoaId}, ${rows[0].id}, ${usuarioId ? BigInt(usuarioId) : null}, 'CRIADO', ${JSON.stringify({ tipoVinculo: input.tipoVinculo, entidadeId: input.entidadeId ?? null })}::jsonb, ${ip ?? null})`);
    return rows[0] ?? null;
  }

  async desativarVinculo(tenantId: string, vinculoId: bigint, usuarioId?: string, ip?: string, motivo?: string) {
    const rows = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
      UPDATE pessoa_vinculo
      SET ativo = FALSE, principal = FALSE, fim_em = COALESCE(fim_em, CURRENT_DATE), atualizado_em = NOW()
      WHERE id = ${vinculoId} AND tenant_id = ${tenantId}::uuid AND ativo = TRUE
      RETURNING id
    `);
    if (rows[0]) {
      const vinculo = await prisma.$queryRaw<Array<{ pessoa_id: bigint }>>(Prisma.sql`SELECT pessoa_id FROM pessoa_vinculo WHERE id = ${vinculoId} AND tenant_id = ${tenantId}::uuid LIMIT 1`);
      if (vinculo[0]) await prisma.$executeRaw(Prisma.sql`INSERT INTO pessoa_vinculo_auditoria (tenant_id, pessoa_id, vinculo_id, usuario_id, acao, motivo, endereco_ip) VALUES (${tenantId}::uuid, ${vinculo[0].pessoa_id}, ${vinculoId}, ${usuarioId ? BigInt(usuarioId) : null}, 'DESATIVADO', ${motivo ?? null}, ${ip ?? null})`);
    }
    return rows[0] ? String(rows[0].id) : null;
  }

  async revisarDuplicidade(tenantId: string, pessoaId: bigint, input: RevisarDuplicidadeInput, usuarioId?: string) {
    const pessoa = await prisma.$queryRaw<Array<{ cpf_normalizado: string }>>(Prisma.sql`SELECT cpf_normalizado FROM pessoa WHERE id = ${pessoaId} AND tenant_id = ${tenantId}::uuid AND status <> 'ANONIMIZADA' LIMIT 1`);
    const cpf = pessoa[0]?.cpf_normalizado;
    if (!cpf) return null;
    const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`INSERT INTO pessoa_duplicidade_revisao (tenant_id, cpf_normalizado, status, observacao, usuario_id, revisado_em, atualizado_em) VALUES (${tenantId}::uuid, ${cpf}, ${input.status}, ${input.observacao ?? null}, ${usuarioId ? BigInt(usuarioId) : null}, NOW(), NOW()) ON CONFLICT (tenant_id, cpf_normalizado) DO UPDATE SET status = EXCLUDED.status, observacao = EXCLUDED.observacao, usuario_id = EXCLUDED.usuario_id, revisado_em = NOW(), atualizado_em = NOW() RETURNING id, status, observacao, revisado_em`);
    return rows[0] ?? null;
  }
}
