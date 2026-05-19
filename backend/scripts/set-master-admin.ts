import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { env } from "../src/config/env.js";

const prisma = new PrismaClient({
  datasourceUrl: env.DATABASE_URL
});

const TARGET_EMAIL = (process.env.MASTER_ADMIN_EMAIL ?? "htasistemas@gmail.com").trim().toLowerCase();
const TARGET_PASSWORD = (process.env.MASTER_ADMIN_PASSWORD ?? "").trim();
const TARGET_NAME = (process.env.MASTER_ADMIN_NAME ?? "HTA Sistemas").trim();
const REQUIRED_PERMISSIONS = ["ADMINISTRADOR", "OPERADOR", "LEITURA_APENAS", "MASTER_ADMIN"] as const;

if (!TARGET_EMAIL) {
  throw new Error("MASTER_ADMIN_EMAIL nao informado.");
}

if (!TARGET_PASSWORD) {
  throw new Error("MASTER_ADMIN_PASSWORD nao informado.");
}

async function ensurePermissions() {
  for (const nome of REQUIRED_PERMISSIONS) {
    await prisma.$executeRawUnsafe(
      `
      INSERT INTO permissao (nome)
      VALUES ($1)
      ON CONFLICT (nome) DO NOTHING
      `,
      nome
    );
  }
}

async function localizarUsuario() {
  const rows = await prisma.$queryRawUnsafe<
    Array<{
      id: bigint;
      nome_usuario: string | null;
      email: string | null;
    }>
  >(
    `
    SELECT id, nome_usuario, email
    FROM usuarios
    WHERE deletado_em IS NULL
      AND (
        lower(coalesce(email, '')) = $1
        OR lower(coalesce(nome_usuario, '')) = $1
      )
    ORDER BY is_superadmin DESC, id ASC
    LIMIT 1
    `,
    TARGET_EMAIL
  );

  return rows[0] ?? null;
}

async function criarUsuario(senhaHash: string) {
  const rows = await prisma.$queryRawUnsafe<Array<{ id: bigint }>>(
    `
    INSERT INTO usuarios (
      nome_usuario,
      nome,
      email,
      senha_hash,
      status,
      perfil_acesso,
      is_superadmin,
      tenant_id,
      instituicao_id,
      ultimo_tenant_id,
      exigir_troca_senha,
      tentativas_login_invalidas,
      ultimo_login_invalido_em,
      criado_em,
      atualizado_em
    )
    VALUES (
      $1,
      $2,
      $1,
      $3,
      'ATIVO',
      'ADMINISTRADOR',
      TRUE,
      NULL,
      NULL,
      NULL,
      FALSE,
      0,
      NULL,
      NOW(),
      NOW()
    )
    RETURNING id
    `,
    TARGET_EMAIL,
    TARGET_NAME,
    senhaHash
  );

  return rows[0]?.id ?? null;
}

async function atualizarUsuario(usuarioId: bigint, senhaHash: string) {
  await prisma.$executeRawUnsafe(
    `
    UPDATE usuarios
    SET
      nome_usuario = $2,
      nome = $3,
      email = $2,
      senha_hash = $4,
      status = 'ATIVO',
      perfil_acesso = 'ADMINISTRADOR',
      is_superadmin = TRUE,
      tenant_id = NULL,
      instituicao_id = NULL,
      ultimo_tenant_id = NULL,
      exigir_troca_senha = FALSE,
      tentativas_login_invalidas = 0,
      ultimo_login_invalido_em = NULL,
      deletado_em = NULL,
      atualizado_em = NOW()
    WHERE id = $1
    `,
    usuarioId,
    TARGET_EMAIL,
    TARGET_NAME,
    senhaHash
  );
}

async function vincularPermissoes(usuarioId: bigint) {
  await prisma.$executeRawUnsafe(
    `
    INSERT INTO usuario_permissao (usuario_id, permissao_id)
    SELECT $1, p.id
    FROM permissao p
    WHERE p.nome IN ('ADMINISTRADOR', 'OPERADOR', 'LEITURA_APENAS', 'MASTER_ADMIN')
      AND NOT EXISTS (
        SELECT 1
        FROM usuario_permissao up
        WHERE up.usuario_id = $1
          AND up.permissao_id = p.id
      )
    `,
    usuarioId
  );
}

async function main() {
  await ensurePermissions();

  const senhaHash = await bcrypt.hash(TARGET_PASSWORD, 10);
  const usuarioExistente = await localizarUsuario();

  const usuarioId = usuarioExistente
    ? usuarioExistente.id
    : await criarUsuario(senhaHash);

  if (!usuarioId) {
    throw new Error("Nao foi possivel localizar nem criar o usuario master.");
  }

  await atualizarUsuario(usuarioId, senhaHash);
  await vincularPermissoes(usuarioId);

  console.log("[set-master-admin] Usuario master atualizado com sucesso.");
  console.log(`- id: ${usuarioId.toString()}`);
  console.log(`- email/login: ${TARGET_EMAIL}`);
  console.log("- perfil_acesso: ADMINISTRADOR");
  console.log("- is_superadmin: true");
  console.log("- tenant_id/instituicao_id: null");
}

main()
  .catch((error) => {
    console.error("[set-master-admin] Falha ao configurar usuario master.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
