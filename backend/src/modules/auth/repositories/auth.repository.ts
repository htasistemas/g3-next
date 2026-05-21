import { prisma } from "../../../database/prisma.js";
import { ensureMultiTenantStructure } from "../../multi-tenant/tenant-estrutura.service.js";
import { ensureUsuariosGestaoEstrutura } from "../../usuarios/repositories/usuario-estrutura.repository.js";

const EMAIL_ADMIN_PADRAO = "htasistemas@gmail.com";

type UsuarioControleAcesso = {
  status: string | null;
  exigir_troca_senha: boolean | null;
  tentativas_login_invalidas: number | bigint | null;
};

type TenantLookupInput = {
  cnpj?: string;
  slug?: string;
  codigoInstituicao?: string;
};

type AuthUsuarioRow = {
  id: bigint;
  nome_usuario: string;
  nome: string | null;
  email: string | null;
  senha_hash: string;
  google_id: string | null;
  tenant_id: string | null;
  instituicao_id: string | null;
  instituicao_nome: string | null;
  instituicao_slug: string | null;
  instituicao_cnpj: string | null;
  instituicao_plano: string | null;
  instituicao_status: string | null;
  is_superadmin: boolean | null;
  perfil_acesso: string | null;
  permissoes: string[] | null;
};

type UsuarioRecuperacaoSenha = {
  id: bigint;
  nome_usuario: string;
  nome: string | null;
  email: string;
};

export type TenantContextoPublico = {
  id: string;
  tenant_id: string;
  codigo?: string;
  cnpj: string;
  razao_social: string;
  nome_fantasia?: string;
  slug: string;
  email?: string;
  telefone?: string;
  plano: string;
  status: string;
  logo_url?: string;
  cor_tema?: string;
};

function mapAuthUsuarioRow(row: AuthUsuarioRow | null) {
  if (!row) return null;
  const emailAdminPadrao = row.email?.trim().toLowerCase() === "htasistemas@gmail.com";
  const permissoesNormalizadas = Array.from(
    new Set(
      (row.permissoes ?? [])
        .filter(Boolean)
        .concat(row.perfil_acesso ? [row.perfil_acesso] : [])
        .concat(Boolean(row.is_superadmin) || emailAdminPadrao ? ["MASTER_ADMIN"] : [])
    )
  );
  return {
    id: row.id,
    nomeUsuario: row.nome_usuario,
    nome: row.nome,
    email: row.email,
    senhaHash: row.senha_hash,
    googleId: row.google_id,
    tenantId: row.tenant_id,
    instituicaoId: row.instituicao_id,
    instituicaoNome: row.instituicao_nome,
    instituicaoSlug: row.instituicao_slug,
    instituicaoCnpj: row.instituicao_cnpj,
    instituicaoPlano: row.instituicao_plano,
    instituicaoStatus: row.instituicao_status,
    isSuperadmin: Boolean(row.is_superadmin) || emailAdminPadrao,
    perfilAcesso: row.perfil_acesso,
    permissoes: permissoesNormalizadas.map((item) => ({
      permissao: { nome: item }
    }))
  };
}

function mapTenantContexto(row: Record<string, unknown> | null): TenantContextoPublico | null {
  if (!row) return null;
  return {
    id: String(row.id),
    tenant_id: String(row.tenant_id),
    codigo: row.codigo ? String(row.codigo) : undefined,
    cnpj: String(row.cnpj),
    razao_social: String(row.razao_social),
    nome_fantasia: row.nome_fantasia ? String(row.nome_fantasia) : undefined,
    slug: String(row.slug),
    email: row.email ? String(row.email) : undefined,
    telefone: row.telefone ? String(row.telefone) : undefined,
    plano: String(row.plano),
    status: String(row.status),
    logo_url: row.logo_url ? String(row.logo_url) : undefined,
    cor_tema: row.cor_tema ? String(row.cor_tema) : undefined
  };
}

function ehEmailAdminPadrao(email?: string | null) {
  return email?.trim().toLowerCase() === EMAIL_ADMIN_PADRAO;
}

export class AuthRepository {
  async buscarUsuarioPorLogin(input: {
    nomeUsuario?: string;
    email?: string;
    cnpj?: string;
    slug?: string;
    codigoInstituicao?: string;
  }) {
    await this.ensureEstrutura();
    const filtrosTenant = await this.resolverFiltroTenant(input);
    const login = input.nomeUsuario?.trim();
    const email = input.email?.trim().toLowerCase();
    const ignorarFiltrosTenant = ehEmailAdminPadrao(email) || ehEmailAdminPadrao(login);

    const rows = await prisma.$queryRawUnsafe<AuthUsuarioRow[]>(
      `
      SELECT
        u.id,
        u.nome_usuario,
        u.nome,
        u.email,
        u.senha_hash,
        u.google_id,
        u.tenant_id::text AS tenant_id,
        u.instituicao_id::text AS instituicao_id,
        COALESCE(i.nome_fantasia, i.razao_social) AS instituicao_nome,
        i.slug AS instituicao_slug,
        i.cnpj AS instituicao_cnpj,
        i.plano AS instituicao_plano,
        i.status AS instituicao_status,
        u.is_superadmin,
        u.perfil_acesso,
        COALESCE(
          ARRAY_REMOVE(ARRAY_AGG(DISTINCT p.nome), NULL),
          ARRAY[]::text[]
        ) AS permissoes
      FROM usuarios u
      LEFT JOIN instituicoes i ON i.id = u.instituicao_id
      LEFT JOIN usuario_permissao up ON up.usuario_id = u.id
      LEFT JOIN permissao p ON p.id = up.permissao_id
      WHERE
        u.deletado_em IS NULL
        AND (
          ($1::text IS NOT NULL AND lower(coalesce(u.nome_usuario, '')) = lower($1::text))
          OR ($2::text IS NOT NULL AND lower(coalesce(u.email, '')) = lower($2::text))
        )
        AND (
          u.is_superadmin = TRUE
          OR (
            ($3::text IS NULL OR u.tenant_id::text = $3::text)
            AND ($4::text IS NULL OR lower(coalesce(i.cnpj, '')) = lower($4::text))
            AND ($5::text IS NULL OR lower(coalesce(i.slug, '')) = lower($5::text))
            AND ($6::text IS NULL OR lower(coalesce(i.codigo, '')) = lower($6::text))
          )
        )
      GROUP BY
        u.id,
        u.nome_usuario,
        u.nome,
        u.email,
        u.senha_hash,
        u.google_id,
        u.tenant_id,
        u.instituicao_id,
        i.nome_fantasia,
        i.razao_social,
        i.slug,
        i.cnpj,
        i.plano,
        i.status,
        u.is_superadmin,
        u.perfil_acesso
      ORDER BY u.is_superadmin DESC, u.id ASC
      LIMIT 1
      `,
      login ?? null,
      email ?? null,
      ignorarFiltrosTenant ? null : (filtrosTenant.tenant_id ?? null),
      ignorarFiltrosTenant ? null : (filtrosTenant.cnpj ?? null),
      ignorarFiltrosTenant ? null : (filtrosTenant.slug ?? null),
      ignorarFiltrosTenant ? null : (filtrosTenant.codigo ?? null)
    );

    return mapAuthUsuarioRow(rows[0] ?? null);
  }

  async buscarUsuarioPorGoogleId(googleId: string, lookup?: TenantLookupInput) {
    await this.ensureEstrutura();
    const filtrosTenant = await this.resolverFiltroTenant(lookup);
    const rows = await prisma.$queryRawUnsafe<AuthUsuarioRow[]>(
      `
      SELECT
        u.id,
        u.nome_usuario,
        u.nome,
        u.email,
        u.senha_hash,
        u.google_id,
        u.tenant_id::text AS tenant_id,
        u.instituicao_id::text AS instituicao_id,
        COALESCE(i.nome_fantasia, i.razao_social) AS instituicao_nome,
        i.slug AS instituicao_slug,
        i.cnpj AS instituicao_cnpj,
        i.plano AS instituicao_plano,
        i.status AS instituicao_status,
        u.is_superadmin,
        u.perfil_acesso,
        COALESCE(
          ARRAY_REMOVE(ARRAY_AGG(DISTINCT p.nome), NULL),
          ARRAY[]::text[]
        ) AS permissoes
      FROM usuarios u
      LEFT JOIN instituicoes i ON i.id = u.instituicao_id
      LEFT JOIN usuario_permissao up ON up.usuario_id = u.id
      LEFT JOIN permissao p ON p.id = up.permissao_id
      WHERE u.google_id = $1
        AND u.deletado_em IS NULL
        AND (
          u.is_superadmin = TRUE
          OR ($2::text IS NULL OR u.tenant_id::text = $2::text)
        )
      GROUP BY
        u.id,
        u.nome_usuario,
        u.nome,
        u.email,
        u.senha_hash,
        u.google_id,
        u.tenant_id,
        u.instituicao_id,
        i.nome_fantasia,
        i.razao_social,
        i.slug,
        i.cnpj,
        i.plano,
        i.status,
        u.is_superadmin,
        u.perfil_acesso
      ORDER BY u.is_superadmin DESC, u.id ASC
      LIMIT 1
      `,
      googleId,
      filtrosTenant.tenant_id ?? null
    );

    return mapAuthUsuarioRow(rows[0] ?? null);
  }

  async buscarUsuarioPorEmail(email: string, lookup?: TenantLookupInput) {
    await this.ensureEstrutura();
    const filtrosTenant = await this.resolverFiltroTenant(lookup);
    const ignorarFiltrosTenant = ehEmailAdminPadrao(email);
    const rows = await prisma.$queryRawUnsafe<AuthUsuarioRow[]>(
      `
      SELECT
        u.id,
        u.nome_usuario,
        u.nome,
        u.email,
        u.senha_hash,
        u.google_id,
        u.tenant_id::text AS tenant_id,
        u.instituicao_id::text AS instituicao_id,
        COALESCE(i.nome_fantasia, i.razao_social) AS instituicao_nome,
        i.slug AS instituicao_slug,
        i.cnpj AS instituicao_cnpj,
        i.plano AS instituicao_plano,
        i.status AS instituicao_status,
        u.is_superadmin,
        u.perfil_acesso,
        COALESCE(
          ARRAY_REMOVE(ARRAY_AGG(DISTINCT p.nome), NULL),
          ARRAY[]::text[]
        ) AS permissoes
      FROM usuarios u
      LEFT JOIN instituicoes i ON i.id = u.instituicao_id
      LEFT JOIN usuario_permissao up ON up.usuario_id = u.id
      LEFT JOIN permissao p ON p.id = up.permissao_id
      WHERE lower(coalesce(u.email, '')) = lower($1)
        AND u.deletado_em IS NULL
        AND (
          u.is_superadmin = TRUE
          OR ($2::text IS NULL OR u.tenant_id::text = $2::text)
        )
      GROUP BY
        u.id,
        u.nome_usuario,
        u.nome,
        u.email,
        u.senha_hash,
        u.google_id,
        u.tenant_id,
        u.instituicao_id,
        i.nome_fantasia,
        i.razao_social,
        i.slug,
        i.cnpj,
        i.plano,
        i.status,
        u.is_superadmin,
        u.perfil_acesso
      ORDER BY u.is_superadmin DESC, u.id ASC
      LIMIT 1
      `,
      email.trim().toLowerCase(),
      ignorarFiltrosTenant ? null : (filtrosTenant.tenant_id ?? null)
    );

    return mapAuthUsuarioRow(rows[0] ?? null);
  }

  async vincularGooglePorUsuarioId(usuarioId: bigint, googleId: string, fotoUrl?: string | null) {
    await this.ensureEstrutura();
    await prisma.$executeRawUnsafe(
      `
      UPDATE usuarios
      SET google_id = $2,
          foto_url = COALESCE($3, foto_url),
          atualizado_em = NOW()
      WHERE id = $1
      `,
      usuarioId,
      googleId,
      fotoUrl ?? null
    );

    return this.buscarUsuarioPorId(usuarioId);
  }

  async buscarUsuarioPorId(id: bigint) {
    await this.ensureEstrutura();
    const rows = await prisma.$queryRawUnsafe<AuthUsuarioRow[]>(
      `
      SELECT
        u.id,
        u.nome_usuario,
        u.nome,
        u.email,
        u.senha_hash,
        u.google_id,
        u.tenant_id::text AS tenant_id,
        u.instituicao_id::text AS instituicao_id,
        COALESCE(i.nome_fantasia, i.razao_social) AS instituicao_nome,
        i.slug AS instituicao_slug,
        i.cnpj AS instituicao_cnpj,
        i.plano AS instituicao_plano,
        i.status AS instituicao_status,
        u.is_superadmin,
        u.perfil_acesso,
        COALESCE(
          ARRAY_REMOVE(ARRAY_AGG(DISTINCT p.nome), NULL),
          ARRAY[]::text[]
        ) AS permissoes
      FROM usuarios u
      LEFT JOIN instituicoes i ON i.id = u.instituicao_id
      LEFT JOIN usuario_permissao up ON up.usuario_id = u.id
      LEFT JOIN permissao p ON p.id = up.permissao_id
      WHERE u.id = $1
        AND u.deletado_em IS NULL
      GROUP BY
        u.id,
        u.nome_usuario,
        u.nome,
        u.email,
        u.senha_hash,
        u.google_id,
        u.tenant_id,
        u.instituicao_id,
        i.nome_fantasia,
        i.razao_social,
        i.slug,
        i.cnpj,
        i.plano,
        i.status,
        u.is_superadmin,
        u.perfil_acesso
      LIMIT 1
      `,
      id
    );

    return mapAuthUsuarioRow(rows[0] ?? null);
  }

  async buscarControleAcessoPorUsuarioId(id: bigint): Promise<UsuarioControleAcesso | null> {
    await this.ensureEstrutura();
    const rows = await prisma.$queryRawUnsafe<UsuarioControleAcesso[]>(
      `
      SELECT
        status,
        exigir_troca_senha,
        tentativas_login_invalidas
      FROM usuarios
      WHERE id = $1
      LIMIT 1
      `,
      id
    );

    return rows[0] ?? null;
  }

  async registrarFalhaLogin(id: bigint) {
    await this.ensureEstrutura();

    const rows = await prisma.$queryRawUnsafe<UsuarioControleAcesso[]>(
      `
      UPDATE usuarios
      SET
        tentativas_login_invalidas = COALESCE(tentativas_login_invalidas, 0) + 1,
        ultimo_login_invalido_em = NOW(),
        status = CASE
          WHEN lower(coalesce(email, '')) = '${EMAIL_ADMIN_PADRAO}' THEN COALESCE(status, 'ATIVO')
          WHEN COALESCE(tentativas_login_invalidas, 0) + 1 >= 5 THEN 'BLOQUEADO'
          ELSE COALESCE(status, 'ATIVO')
        END,
        atualizado_em = NOW()
      WHERE id = $1
      RETURNING status, exigir_troca_senha, tentativas_login_invalidas
      `,
      id
    );

    return rows[0] ?? null;
  }

  async registrarLoginSucesso(id: bigint) {
    await this.ensureEstrutura();
    await prisma.$executeRawUnsafe(
      `
      UPDATE usuarios
      SET
        ultimo_acesso_em = NOW(),
        tentativas_login_invalidas = 0,
        ultimo_login_invalido_em = NULL,
        status = CASE
          WHEN lower(coalesce(email, '')) = '${EMAIL_ADMIN_PADRAO}' THEN 'ATIVO'
          ELSE status
        END,
        atualizado_em = NOW()
      WHERE id = $1
      `,
      id
    );
  }

  async redefinirSenhaPorEmail(
    email: string,
    senhaHash: string,
    lookup?: TenantLookupInput
  ): Promise<UsuarioRecuperacaoSenha | null> {
    await this.ensureEstrutura();

    const usuario = await this.buscarUsuarioPorEmail(email, lookup);
    if (!usuario?.email) {
      return null;
    }

    await prisma.$executeRawUnsafe(
      `
      UPDATE usuarios
      SET senha_hash = $2,
          exigir_troca_senha = TRUE,
          tentativas_login_invalidas = 0,
          ultimo_login_invalido_em = NULL,
          atualizado_em = NOW()
      WHERE id = $1
      `,
      usuario.id,
      senhaHash
    );

    return {
      id: usuario.id,
      nome_usuario: usuario.nomeUsuario,
      nome: usuario.nome ?? null,
      email: usuario.email
    };
  }

  async buscarTenantContextoPublico(input: TenantLookupInput & { host?: string }) {
    await this.ensureEstrutura();
    const slugPorHost = this.extrairSlugPorHost(input.host);
    const slug = input.slug?.trim().toLowerCase() || slugPorHost || null;
    const cnpj = input.cnpj?.trim() || null;
    const codigo = input.codigoInstituicao?.trim().toUpperCase() || null;

    const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `
      SELECT
        id::text AS id,
        tenant_id::text AS tenant_id,
        codigo,
        cnpj,
        razao_social,
        nome_fantasia,
        slug,
        email,
        telefone,
        plano,
        status,
        logo_url,
        cor_tema
      FROM instituicoes
      WHERE
        ($1::text IS NOT NULL AND cnpj = $1::text)
        OR ($2::text IS NOT NULL AND lower(slug) = lower($2::text))
        OR ($3::text IS NOT NULL AND upper(coalesce(codigo, '')) = upper($3::text))
      ORDER BY atualizado_em DESC
      LIMIT 1
      `,
      cnpj,
      slug,
      codigo
    );

    return mapTenantContexto(rows[0] ?? null);
  }

  async registrarEventoAcesso(input: {
    tenant_id?: string | null;
    instituicao_id?: string | null;
    usuario_id?: bigint | null;
    evento: string;
    identificador?: string | null;
    ip?: string | null;
    user_agent?: string | null;
    detalhes_json?: Record<string, unknown> | null;
  }) {
    await this.ensureEstrutura();
    await prisma.$executeRawUnsafe(
      `
      INSERT INTO tenant_auditoria_acesso (
        tenant_id,
        instituicao_id,
        usuario_id,
        evento,
        identificador,
        ip,
        user_agent,
        detalhes_json
      )
      VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8::jsonb)
      `,
      input.tenant_id ?? null,
      input.instituicao_id ?? null,
      input.usuario_id ?? null,
      input.evento,
      input.identificador ?? null,
      input.ip ?? null,
      input.user_agent ?? null,
      input.detalhes_json ? JSON.stringify(input.detalhes_json) : null
    );
  }

  private async resolverFiltroTenant(input?: TenantLookupInput) {
    const tenant = await this.buscarTenantContextoPublico(input ?? {});
    return {
      tenant_id: tenant?.tenant_id,
      codigo: tenant?.codigo,
      cnpj: tenant?.cnpj,
      slug: tenant?.slug
    };
  }

  private extrairSlugPorHost(host?: string) {
    const valor = host?.trim().toLowerCase();
    if (!valor) return null;
    const semPorta = valor.split(":")[0];
    if (
      semPorta.endsWith(".g3n.htasistemas.com.br") &&
      semPorta.split(".").length > 4
    ) {
      return semPorta.split(".")[0] ?? null;
    }
    return null;
  }

  private async ensureEstrutura() {
    await ensureUsuariosGestaoEstrutura(prisma);
    await ensureMultiTenantStructure(prisma);
  }
}
