import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/database/prisma.js";

const MASTER_EMAIL = "htasistemas@gmail.com";
const MASTER_SENHA = "_Adm@3c5x9cfg";
const TORRESOFT_EMAIL = "torresoftbrasil@gmail.com";
const TORRESOFT_SENHA = "Admin@123";
const TORRESOFT_CNPJ = "32.004.110/0001-18";
const TORRESOFT_CNPJ_LIMPO = "32004110000118";

type IdRow = { id: bigint };
type InstituicaoRow = { id: string; tenant_id: string };

async function garantirMaster() {
  const senhaHash = await bcrypt.hash(MASTER_SENHA, 10);
  const rows = await prisma.$queryRawUnsafe<IdRow[]>(
    `
    SELECT id
    FROM usuarios
    WHERE lower(coalesce(email, '')) = $1
       OR lower(coalesce(nome_usuario, '')) = $1
    ORDER BY is_superadmin DESC, id ASC
    LIMIT 1
    `,
    MASTER_EMAIL
  );

  if (rows[0]?.id) {
    await prisma.$executeRawUnsafe(
      `
      UPDATE usuarios
      SET nome_usuario = $1,
          email = $1,
          nome = COALESCE(NULLIF(nome, ''), 'Administrador Master'),
          nome_exibicao = COALESCE(NULLIF(nome_exibicao, ''), 'Administrador Master'),
          senha_hash = $2,
          status = 'ATIVO',
          is_superadmin = TRUE,
          perfil_acesso = 'MASTER',
          exigir_troca_senha = FALSE,
          exigir_autenticacao_segura = FALSE,
          permitir_biometria_facial_login = FALSE,
          exigir_biometria_facial_login = FALSE,
          tentativas_login_invalidas = 0,
          ultimo_login_invalido_em = NULL,
          deletado_em = NULL,
          atualizado_em = NOW()
      WHERE id = $3
      `,
      MASTER_EMAIL,
      senhaHash,
      rows[0].id
    );
    return rows[0].id;
  }

  const created = await prisma.$queryRawUnsafe<IdRow[]>(
    `
    INSERT INTO usuarios (
      nome_usuario, nome, nome_exibicao, email, senha_hash, criado_em, atualizado_em,
      status, exigir_troca_senha, tentativas_login_invalidas, perfil_acesso,
      is_superadmin, exigir_autenticacao_segura, permitir_biometria_facial_login,
      exigir_biometria_facial_login
    )
    VALUES (
      $1, 'Administrador Master', 'Administrador Master', $1, $2, NOW(), NOW(),
      'ATIVO', FALSE, 0, 'MASTER', TRUE, FALSE, FALSE, FALSE
    )
    RETURNING id
    `,
    MASTER_EMAIL,
    senhaHash
  );
  return created[0]!.id;
}

async function garantirInstituicaoTorresoft() {
  const existente = await prisma.$queryRawUnsafe<InstituicaoRow[]>(
    `
    SELECT id::text AS id, tenant_id::text AS tenant_id
    FROM instituicoes
    WHERE regexp_replace(cnpj, '\\D', '', 'g') = $1
    LIMIT 1
    `,
    TORRESOFT_CNPJ_LIMPO
  );
  if (existente[0]) {
    await prisma.$executeRawUnsafe(
      `
      UPDATE instituicoes
      SET codigo = COALESCE(NULLIF(codigo, ''), 'TORRESOFT'),
          razao_social = 'TORRESOFT',
          nome_fantasia = 'Torresoft',
          slug = 'torresoft',
          email = COALESCE(NULLIF(email, ''), $2),
          status = 'ATIVO',
          atualizado_em = NOW()
      WHERE id::text = $1
      `,
      existente[0].id,
      TORRESOFT_EMAIL
    );
    return existente[0];
  }

  const id = randomUUID();
  const tenantId = randomUUID();
  await prisma.$executeRawUnsafe(
    `
    INSERT INTO instituicoes (
      id, tenant_id, codigo, cnpj, razao_social, nome_fantasia, slug, email,
      telefone, endereco, plano, status, logo_url, cor_tema, storage_limit_mb,
      usuarios_limit, database_mode, database_key, criado_em, atualizado_em
    )
    VALUES (
      $1::uuid, $2::uuid, 'TORRESOFT', $3, 'TORRESOFT', 'Torresoft', 'torresoft',
      $4, '(34) 3000-0000', 'Endereco ficticio de demonstracao',
      'DEMO', 'ATIVO', NULL, '#0f8b4c', 10240, 50, 'shared', 'torresoft',
      NOW(), NOW()
    )
    `,
    id,
    tenantId,
    TORRESOFT_CNPJ,
    TORRESOFT_EMAIL
  );
  return { id, tenant_id: tenantId };
}

async function garantirPermissaoAdministrador(usuarioId: bigint) {
  const permissao = await prisma.$queryRawUnsafe<IdRow[]>(
    `
    INSERT INTO permissao (nome)
    SELECT 'ADMINISTRADOR'
    WHERE NOT EXISTS (SELECT 1 FROM permissao WHERE nome = 'ADMINISTRADOR')
    RETURNING id
    `
  );
  const permissaoId =
    permissao[0]?.id ??
    (
      await prisma.$queryRawUnsafe<IdRow[]>(
        "SELECT id FROM permissao WHERE nome = 'ADMINISTRADOR' LIMIT 1"
      )
    )[0]!.id;

  await prisma.$executeRawUnsafe(
    `
    INSERT INTO usuario_permissao (usuario_id, permissao_id)
    SELECT $1, $2
    WHERE NOT EXISTS (
      SELECT 1
      FROM usuario_permissao
      WHERE usuario_id = $1
        AND permissao_id = $2
    )
    `,
    usuarioId,
    permissaoId
  );
}

async function garantirUsuarioTorresoft(instituicao: InstituicaoRow) {
  const senhaHash = await bcrypt.hash(TORRESOFT_SENHA, 10);
  const rows = await prisma.$queryRawUnsafe<IdRow[]>(
    `
    SELECT id
    FROM usuarios
    WHERE tenant_id::text = $1
      AND lower(coalesce(email, '')) = $2
    LIMIT 1
    `,
    instituicao.tenant_id,
    TORRESOFT_EMAIL
  );

  if (rows[0]?.id) {
    await prisma.$executeRawUnsafe(
      `
      UPDATE usuarios
      SET nome_usuario = $2,
          nome = 'Administrador Demonstracao Torresoft',
          nome_exibicao = 'Administrador Demonstracao Torresoft',
          email = $2,
          senha_hash = $3,
          status = 'ATIVO',
          perfil_acesso = 'ADMINISTRADOR',
          is_superadmin = FALSE,
          exigir_troca_senha = FALSE,
          exigir_autenticacao_segura = FALSE,
          permitir_biometria_facial_login = FALSE,
          exigir_biometria_facial_login = FALSE,
          tentativas_login_invalidas = 0,
          ultimo_login_invalido_em = NULL,
          deletado_em = NULL,
          instituicao_id = $4::uuid,
          ultimo_tenant_id = $1::uuid,
          atualizado_em = NOW()
      WHERE id = $5
        AND tenant_id::text = $1
      `,
      instituicao.tenant_id,
      TORRESOFT_EMAIL,
      senhaHash,
      instituicao.id,
      rows[0].id
    );
    await garantirPermissaoAdministrador(rows[0].id);
    return rows[0].id;
  }

  const created = await prisma.$queryRawUnsafe<IdRow[]>(
    `
    INSERT INTO usuarios (
      nome_usuario, nome, nome_exibicao, email, senha_hash, criado_em, atualizado_em,
      status, exigir_troca_senha, tentativas_login_invalidas, tenant_id, instituicao_id,
      perfil_acesso, is_superadmin, ultimo_tenant_id, exigir_autenticacao_segura,
      permitir_biometria_facial_login, exigir_biometria_facial_login
    )
    VALUES (
      $1, 'Administrador Demonstracao Torresoft', 'Administrador Demonstracao Torresoft',
      $1, $2, NOW(), NOW(), 'ATIVO', FALSE, 0, $3::uuid, $4::uuid,
      'ADMINISTRADOR', FALSE, $3::uuid, FALSE, FALSE, FALSE
    )
    RETURNING id
    `,
    TORRESOFT_EMAIL,
    senhaHash,
    instituicao.tenant_id,
    instituicao.id
  );
  await garantirPermissaoAdministrador(created[0]!.id);
  return created[0]!.id;
}

async function main() {
  const masterId = await garantirMaster();
  const instituicao = await garantirInstituicaoTorresoft();
  const torresoftUsuarioId = await garantirUsuarioTorresoft(instituicao);

  const resumo = await prisma.$queryRawUnsafe(
    `
    SELECT
      (SELECT COUNT(*)::int FROM usuarios WHERE lower(coalesce(email, '')) = $1 AND status = 'ATIVO' AND is_superadmin = TRUE) AS master_ativo,
      (SELECT COUNT(*)::int FROM instituicoes WHERE regexp_replace(cnpj, '\\D', '', 'g') = $2 AND upper(status) = 'ATIVO') AS torresoft_ativa,
      (SELECT COUNT(*)::int FROM usuarios WHERE tenant_id::text = $3 AND lower(coalesce(email, '')) = $4 AND status = 'ATIVO') AS usuario_torresoft_ativo
    `,
    MASTER_EMAIL,
    TORRESOFT_CNPJ_LIMPO,
    instituicao.tenant_id,
    TORRESOFT_EMAIL
  );

  console.log(JSON.stringify({
    master: { email: MASTER_EMAIL, usuario_id: String(masterId), status: "ATIVO" },
    torresoft: {
      cnpj: TORRESOFT_CNPJ,
      tenant_id: instituicao.tenant_id,
      instituicao_id: instituicao.id,
      usuario: TORRESOFT_EMAIL,
      usuario_id: String(torresoftUsuarioId),
      status: "ATIVO"
    },
    resumo
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
