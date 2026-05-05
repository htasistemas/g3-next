import bcrypt from "bcryptjs";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { ensureMultiTenantStructure } from "../../multi-tenant/tenant-estrutura.service.js";
import { ensureUsuariosGestaoEstrutura } from "../../usuarios/repositories/usuario-estrutura.repository.js";
import type { InstituicaoInput, InstituicaoResumo, InstituicaoUpdateInput } from "../instituicoes.types.js";

type InstituicaoRow = {
  id: string;
  tenant_id: string;
  codigo: string | null;
  cnpj: string;
  razao_social: string;
  nome_fantasia: string | null;
  slug: string;
  email: string | null;
  telefone: string | null;
  endereco: string | null;
  plano: string;
  status: string;
  logo_url: string | null;
  cor_tema: string | null;
  quantidade_usuarios: number | bigint;
  ultimo_acesso_em: Date | string | null;
  criado_em: Date | string;
  atualizado_em: Date | string;
};

function mapRow(row: InstituicaoRow): InstituicaoResumo {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    codigo: row.codigo ?? undefined,
    cnpj: row.cnpj,
    razao_social: row.razao_social,
    nome_fantasia: row.nome_fantasia ?? undefined,
    slug: row.slug,
    email: row.email ?? undefined,
    telefone: row.telefone ?? undefined,
    endereco: row.endereco ?? undefined,
    plano: row.plano as InstituicaoResumo["plano"],
    status: row.status as InstituicaoResumo["status"],
    logo_url: row.logo_url ?? undefined,
    cor_tema: row.cor_tema ?? undefined,
    quantidade_usuarios: Number(row.quantidade_usuarios ?? 0),
    ultimo_acesso_em: row.ultimo_acesso_em ? new Date(row.ultimo_acesso_em).toISOString() : undefined,
    criado_em: new Date(row.criado_em).toISOString(),
    atualizado_em: new Date(row.atualizado_em).toISOString()
  };
}

export class InstituicoesRepository {
  private async ensureEstrutura() {
    await ensureUsuariosGestaoEstrutura(prisma);
    await ensureMultiTenantStructure(prisma);
  }

  async listar() {
    await this.ensureEstrutura();
    const rows = await prisma.$queryRawUnsafe<InstituicaoRow[]>(
      `
      SELECT
        i.id::text AS id,
        i.tenant_id::text AS tenant_id,
        i.codigo,
        i.cnpj,
        i.razao_social,
        i.nome_fantasia,
        i.slug,
        i.email,
        i.telefone,
        i.endereco,
        i.plano,
        i.status,
        i.logo_url,
        i.cor_tema,
        COUNT(u.id)::bigint AS quantidade_usuarios,
        MAX(u.ultimo_acesso_em) AS ultimo_acesso_em,
        i.criado_em,
        i.atualizado_em
      FROM instituicoes i
      LEFT JOIN usuarios u
        ON u.instituicao_id = i.id
       AND u.deletado_em IS NULL
      GROUP BY
        i.id,
        i.tenant_id,
        i.codigo,
        i.cnpj,
        i.razao_social,
        i.nome_fantasia,
        i.slug,
        i.email,
        i.telefone,
        i.endereco,
        i.plano,
        i.status,
        i.logo_url,
        i.cor_tema,
        i.criado_em,
        i.atualizado_em
      ORDER BY i.criado_em DESC
      `
    );

    return rows.map(mapRow);
  }

  async criar(input: InstituicaoInput) {
    await this.ensureEstrutura();
    const senhaHash = input.admin_inicial?.senha ? await bcrypt.hash(input.admin_inicial.senha, 10) : null;

    const rows = await prisma.$transaction(async (tx): Promise<InstituicaoRow[]> => {
      const created = await tx.$queryRawUnsafe<InstituicaoRow[]>(
        `
        INSERT INTO instituicoes (
          cnpj, razao_social, nome_fantasia, slug, codigo, email, telefone, endereco, plano, status, logo_url, cor_tema
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING
          id::text AS id,
          tenant_id::text AS tenant_id,
          codigo,
          cnpj,
          razao_social,
          nome_fantasia,
          slug,
          email,
          telefone,
          endereco,
          plano,
          status,
          logo_url,
          cor_tema,
          0::bigint AS quantidade_usuarios,
          NULL::timestamp AS ultimo_acesso_em,
          criado_em,
          atualizado_em
        `,
        input.cnpj,
        input.razao_social,
        input.nome_fantasia ?? null,
        input.slug,
        input.codigo ?? null,
        input.email ?? null,
        input.telefone ?? null,
        input.endereco ?? null,
        input.plano,
        input.status,
        input.logo_url ?? null,
        input.cor_tema ?? null
      );

      const instituicao = created[0];
      if (!instituicao) {
        throw new AppError("Não foi possível criar a instituição.", 500);
      }

      if (input.admin_inicial && senhaHash) {
        const usuarioRows = await tx.$queryRawUnsafe<{ id: bigint }[]>(
          `
          INSERT INTO usuarios (
            tenant_id,
            instituicao_id,
            nome_usuario,
            nome,
            email,
            senha_hash,
            perfil_acesso,
            status,
            criado_em,
            atualizado_em
          )
          VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, 'ADMINISTRADOR', 'ATIVO', NOW(), NOW())
          RETURNING id
          `,
          instituicao.tenant_id,
          instituicao.id,
          input.admin_inicial.nome_usuario.trim(),
          input.admin_inicial.nome.trim(),
          input.admin_inicial.email.trim().toLowerCase(),
          senhaHash
        );

        const usuarioId = usuarioRows[0]?.id;
        if (!usuarioId) {
          throw new AppError("Nao foi possivel criar o administrador inicial da instituicao.", 500);
        }

        await tx.$executeRawUnsafe(
          `
          INSERT INTO permissao (nome)
          VALUES ('ADMINISTRADOR')
          ON CONFLICT (nome) DO NOTHING
          `
        );

        await tx.$executeRawUnsafe(
          `
          INSERT INTO usuario_permissao (usuario_id, permissao_id)
          SELECT $1, p.id
          FROM permissao p
          WHERE p.nome = 'ADMINISTRADOR'
          ON CONFLICT (usuario_id, permissao_id) DO NOTHING
          `,
          usuarioId
        );
      }

      return created;
    });

    return mapRow(rows[0]);
  }

  async atualizar(id: string, input: InstituicaoUpdateInput) {
    await this.ensureEstrutura();

    await this.buscarPorId(id);

    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(
        `
        UPDATE instituicoes
        SET
          cnpj = COALESCE($2, cnpj),
          razao_social = COALESCE($3, razao_social),
          nome_fantasia = COALESCE($4, nome_fantasia),
          slug = COALESCE($5, slug),
          codigo = COALESCE($6, codigo),
          email = COALESCE($7, email),
          telefone = COALESCE($8, telefone),
          endereco = COALESCE($9, endereco),
          plano = COALESCE($10, plano),
          status = COALESCE($11, status),
          logo_url = COALESCE($12, logo_url),
          cor_tema = COALESCE($13, cor_tema),
          atualizado_em = NOW()
        WHERE id::text = $1
        `,
        id,
        input.cnpj ?? null,
        input.razao_social ?? null,
        input.nome_fantasia ?? null,
        input.slug ?? null,
        input.codigo ?? null,
        input.email ?? null,
        input.telefone ?? null,
        input.endereco ?? null,
        input.plano ?? null,
        input.status ?? null,
        input.logo_url ?? null,
        input.cor_tema ?? null
      );

      if (typeof input.email === "string" && input.email.trim()) {
        const adminRows = await tx.$queryRawUnsafe<{ id: bigint }[]>(
          `
          SELECT u.id
          FROM usuarios u
          WHERE u.instituicao_id::text = $1
            AND u.deletado_em IS NULL
            AND (
              COALESCE(u.perfil_acesso, '') = 'ADMINISTRADOR'
              OR EXISTS (
                SELECT 1
                FROM usuario_permissao up
                JOIN permissao p ON p.id = up.permissao_id
                WHERE up.usuario_id = u.id
                  AND p.nome = 'ADMINISTRADOR'
              )
            )
          ORDER BY u.id ASC
          LIMIT 1
          `,
          id
        );

        const adminPrincipalId = adminRows[0]?.id;
        if (adminPrincipalId) {
          await tx.$executeRawUnsafe(
            `
            UPDATE usuarios
            SET email = $2,
                atualizado_em = NOW()
            WHERE id = $1
            `,
            adminPrincipalId,
            input.email.trim().toLowerCase()
          );
        }
      }
    });

    return this.buscarPorId(id);
  }

  async resetarSenhaAdmin(id: string, email: string | undefined, novaSenha: string) {
    await this.ensureEstrutura();
    const senhaHash = await bcrypt.hash(novaSenha, 10);
    const rows = await prisma.$queryRawUnsafe<{ id: bigint }[]>(
      `
      SELECT u.id
      FROM usuarios u
      WHERE u.instituicao_id::text = $1
        AND u.deletado_em IS NULL
        AND (
          COALESCE(u.perfil_acesso, '') = 'ADMINISTRADOR'
          OR EXISTS (
            SELECT 1
            FROM usuario_permissao up
            JOIN permissao p ON p.id = up.permissao_id
            WHERE up.usuario_id = u.id
              AND p.nome = 'ADMINISTRADOR'
          )
        )
        AND ($2::text IS NULL OR lower(coalesce(u.email, '')) = lower($2::text))
      ORDER BY u.id ASC
      LIMIT 1
      `,
      id,
      email?.trim().toLowerCase() ?? null
    );

    const usuario = rows[0];
    if (!usuario) {
      throw new AppError("Administrador da instituição não encontrado.", 404);
    }

    await prisma.$executeRawUnsafe(
      `
      UPDATE usuarios
      SET senha_hash = $2,
          exigir_troca_senha = TRUE,
          atualizado_em = NOW()
      WHERE id = $1
      `,
      usuario.id,
      senhaHash
    );

    return { sucesso: true };
  }

  async buscarPorId(id: string) {
    await this.ensureEstrutura();
    const rows = await prisma.$queryRawUnsafe<InstituicaoRow[]>(
      `
      SELECT
        i.id::text AS id,
        i.tenant_id::text AS tenant_id,
        i.codigo,
        i.cnpj,
        i.razao_social,
        i.nome_fantasia,
        i.slug,
        i.email,
        i.telefone,
        i.endereco,
        i.plano,
        i.status,
        i.logo_url,
        i.cor_tema,
        COUNT(u.id)::bigint AS quantidade_usuarios,
        MAX(u.ultimo_acesso_em) AS ultimo_acesso_em,
        i.criado_em,
        i.atualizado_em
      FROM instituicoes i
      LEFT JOIN usuarios u
        ON u.instituicao_id = i.id
       AND u.deletado_em IS NULL
      WHERE i.id::text = $1
      GROUP BY
        i.id,
        i.tenant_id,
        i.codigo,
        i.cnpj,
        i.razao_social,
        i.nome_fantasia,
        i.slug,
        i.email,
        i.telefone,
        i.endereco,
        i.plano,
        i.status,
        i.logo_url,
        i.cor_tema,
        i.criado_em,
        i.atualizado_em
      LIMIT 1
      `,
      id
    );

    const row = rows[0];
    if (!row) {
      throw new AppError("Instituição não encontrada.", 404);
    }
    return mapRow(row);
  }
}
