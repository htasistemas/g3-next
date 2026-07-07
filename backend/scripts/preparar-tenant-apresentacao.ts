import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { env } from "../src/config/env.js";

type PgConfig = {
  host: string;
  port: string;
  user: string;
  password: string;
  database: string;
  url: string;
};

type TenantTableRow = {
  table_name: string;
};

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
  database_mode: string | null;
  database_key: string | null;
};

const execFileAsync = promisify(execFile);
const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const storageRoot = path.resolve(backendRoot, env.APP_STORAGE_ROOT);
const targetSchema = (process.env.G3N_PRESENTATION_SCHEMA ?? "g3n_apresentacao").trim().toLowerCase();
const targetEmail = (process.env.G3N_PRESENTATION_EMAIL ?? "g3n@apresentacao.com").trim().toLowerCase();
const targetLogin = (process.env.G3N_PRESENTATION_LOGIN ?? targetEmail).trim().toLowerCase();
const targetNome = (process.env.G3N_PRESENTATION_NAME ?? "Administrador G3N").trim();
const targetSenha = (process.env.G3N_PRESENTATION_PASSWORD ?? "9Tuco12@").trim();
const targetInstituicaoNome = (process.env.G3N_PRESENTATION_INSTITUTION_NAME ?? "G3N Apresentação").trim();
const targetSlug = (process.env.G3N_PRESENTATION_SLUG ?? "g3n-apresentacao").trim().toLowerCase();
const targetCodigo = (process.env.G3N_PRESENTATION_CODIGO ?? "G3N").trim().toUpperCase();
const targetTemaRaw = (process.env.G3N_PRESENTATION_COLOR ?? "2563eb").trim();
const targetTema = targetTemaRaw.startsWith("#") ? targetTemaRaw : `#${targetTemaRaw}`;
const targetTenantId = (process.env.G3N_PRESENTATION_TENANT_ID ?? "c7ad2d88-2b7a-4a74-9d73-1e7c7a9f6c10").trim();
const targetLogoRelativePath = "imagens/instituicoes/g3n-logo.svg";
const logoFilePath = path.resolve(storageRoot, targetLogoRelativePath);
const temaApresentacao = {
  modo: "CLARO",
  preset: "AZUL_CORPORATIVO",
  paleta: {
    cor_primaria: "#1E40AF",
    cor_secundaria: "#0EA5E9",
    cor_destaque: "#38BDF8",
    cor_botao_primario: "#1E40AF",
    cor_link: "#1D4ED8",
    cor_elemento_ativo: "#1E40AF",
    background: "#F1F5FF",
    foreground: "#0F172A",
    border: "#C7D2FE",
    muted: "#64748B",
    card: "#FFFFFF",
    danger: "#DC2626",
    warning: "#D97706",
    success: "#16A34A",
    info: "#0284C7"
  }
};

function criarPgConfig(rawUrl: string): PgConfig {
  const url = new URL(rawUrl);
  url.searchParams.delete("schema");
  const database = url.pathname.replace(/^\/+/, "");
  if (!database) {
    throw new Error("DATABASE_URL nao possui nome de banco.");
  }

  return {
    host: url.hostname,
    port: url.port || "5432",
    user: decodeURIComponent(url.username || "postgres"),
    password: decodeURIComponent(url.password || ""),
    database,
    url: url.toString()
  };
}

function criarUrlPrismaComSchema(rawUrl: string, schema: string) {
  const url = new URL(rawUrl);
  url.searchParams.set("schema", schema);
  return url.toString();
}

function criarEnvPg(config: PgConfig) {
  return {
    ...process.env,
    PGHOST: config.host,
    PGPORT: config.port,
    PGUSER: config.user,
    PGPASSWORD: config.password,
    PGDATABASE: config.database
  };
}

async function executarComando(
  comando: string,
  args: string[],
  config: PgConfig,
  extraEnv: NodeJS.ProcessEnv = {}
) {
  await execFileAsync(comando, args, {
    cwd: backendRoot,
    env: {
      ...criarEnvPg(config),
      ...extraEnv
    },
    maxBuffer: 50 * 1024 * 1024
  });
}

function gerarLogoSvg() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="360" viewBox="0 0 1200 360" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="title desc">
  <title id="title">G3N Apresentação</title>
  <desc id="desc">Logomarca para a base G3N de apresentação.</desc>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1200" y2="360" gradientUnits="userSpaceOnUse">
      <stop stop-color="#020617" />
      <stop offset="0.52" stop-color="#1d4ed8" />
      <stop offset="1" stop-color="#0f172a" />
    </linearGradient>
    <linearGradient id="accent" x1="160" y1="72" x2="1040" y2="288" gradientUnits="userSpaceOnUse">
      <stop stop-color="#eff6ff" stop-opacity="0.98" />
      <stop offset="1" stop-color="#bfdbfe" stop-opacity="0.9" />
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="12" flood-color="#020617" flood-opacity="0.5" />
    </filter>
  </defs>
  <rect width="1200" height="360" rx="44" fill="url(#bg)" />
  <circle cx="980" cy="82" r="112" fill="#60a5fa" fill-opacity="0.18" />
  <circle cx="1088" cy="260" r="80" fill="#2563eb" fill-opacity="0.18" />
  <circle cx="160" cy="276" r="100" fill="#93c5fd" fill-opacity="0.14" />
  <path d="M120 226C178 184 232 160 300 146C374 130 444 131 522 148" stroke="#dbeafe" stroke-opacity="0.1" stroke-width="18" stroke-linecap="round" />
  <g filter="url(#shadow)">
    <rect x="92" y="72" width="1016" height="216" rx="40" fill="#0b1220" fill-opacity="0.58" stroke="#93c5fd" stroke-opacity="0.22" />
    <text x="600" y="194" text-anchor="middle" fill="url(#accent)" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="132" font-weight="900" letter-spacing="8">G3N</text>
    <text x="600" y="240" text-anchor="middle" fill="#bfdbfe" font-family="Inter, Segoe UI, Arial, sans-serif" font-size="28" font-weight="700" letter-spacing="6">BASE DE APRESENTAÇÃO</text>
  </g>
</svg>`;
}

async function garantirLogoEmStorage() {
  await mkdir(path.dirname(logoFilePath), { recursive: true });
  await writeFile(logoFilePath, gerarLogoSvg(), "utf8");
}

async function prepararCloneSchema(config: PgConfig) {
  const existe = await prismaBase.$queryRawUnsafe<Array<{ exists: boolean }>>(
    `
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.schemata
      WHERE schema_name = $1
    ) AS exists
    `,
    targetSchema
  );

  const deveRecriar = (process.env.G3N_PRESENTATION_REFRESH ?? "").trim().toLowerCase() === "true";
  if (existe[0]?.exists && !deveRecriar) {
    throw new Error(
      `O schema de apresentacao "${targetSchema}" ja existe. Defina G3N_PRESENTATION_REFRESH=true para recriar.`
    );
  }

  if (existe[0]?.exists && deveRecriar) {
    await executarComando(
      "psql",
      ["--set", "ON_ERROR_STOP=1", "--dbname", config.url, "-c", `DROP SCHEMA IF EXISTS ${targetSchema} CASCADE;`],
      config
    );
  }

  const pastaTemporaria = await mkdtemp(path.join(os.tmpdir(), "g3n-apresentacao-clone-"));
  const arquivoDump = path.join(pastaTemporaria, "schema-public.sql");
  const arquivoClone = path.join(pastaTemporaria, "schema-g3n.sql");

  try {
    // A reconstrução sempre parte do schema public original.
    // Nenhuma operação deste script altera os dados da ADRA no schema de origem.
    await executarComando(
      "pg_dump",
      ["--format=plain", "--no-owner", "--no-acl", "--schema=public", "--file", arquivoDump, config.url],
      config
    );

    const dumpOriginal = await readFile(arquivoDump, "utf8");
    const dumpClone = dumpOriginal
      .replaceAll("CREATE SCHEMA public;", `CREATE SCHEMA IF NOT EXISTS ${targetSchema};`)
      .replaceAll("public.", `${targetSchema}.`)
      .replaceAll(`${targetSchema}.gen_random_uuid()`, "public.gen_random_uuid()")
      .replaceAll(`${targetSchema}.uuid_generate_v4()`, "public.uuid_generate_v4()");

    await writeFile(arquivoClone, dumpClone, "utf8");
    await executarComando(
      "psql",
      ["--set", "ON_ERROR_STOP=1", "--dbname", config.url, "-f", arquivoClone],
      config
    );
  } finally {
    await rm(pastaTemporaria, { recursive: true, force: true }).catch(() => undefined);
  }
}

async function ajustarTenantApresentacao(targetUrl: string) {
  const prisma = new PrismaClient({
    datasourceUrl: targetUrl
  });

  try {
    const instituicaoRows = await prisma.$queryRawUnsafe<InstituicaoRow[]>(
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
        endereco,
        plano,
        status,
        logo_url,
        cor_tema,
        database_mode,
        database_key
      FROM instituicoes
      WHERE lower(coalesce(slug, '')) = 'adra-uberlandia'
         OR upper(coalesce(codigo, '')) = 'PADRAO'
      ORDER BY CASE
        WHEN lower(coalesce(slug, '')) = 'adra-uberlandia' THEN 0
        WHEN upper(coalesce(codigo, '')) = 'PADRAO' THEN 1
        ELSE 2
      END
      LIMIT 1
      `
    );

    const instituicaoBase = instituicaoRows[0];
    if (!instituicaoBase) {
      throw new Error("Nao foi possivel localizar a instituicao ADRA no schema clonado.");
    }

    const sourceTenantId = instituicaoBase.tenant_id;
    const sourceInstituicaoId = instituicaoBase.id;
    const cnpjDemo = "12345678000109";

    const tablesTenantRows = await prisma.$queryRawUnsafe<TenantTableRow[]>(
      `
      SELECT table_name
      FROM information_schema.columns
      WHERE table_schema = $1
        AND column_name = 'tenant_id'
      ORDER BY table_name
      `,
      targetSchema
    );

    const tableNames = tablesTenantRows.map((row) => row.table_name);

    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SET session_replication_role = replica`);

      try {
        for (const tableName of tableNames) {
          await tx.$executeRawUnsafe(
            `DELETE FROM "${targetSchema}"."${tableName}" WHERE tenant_id::text <> $1`,
            sourceTenantId
          );
        }

        const instituicaoAtualizada = await tx.$queryRawUnsafe<InstituicaoRow[]>(
          `
          UPDATE "${targetSchema}"."instituicoes"
          SET
            tenant_id = $2::uuid,
            codigo = $3,
            cnpj = $4,
            razao_social = $5,
            nome_fantasia = $6,
            slug = $7,
            email = $8,
            logo_url = $9,
            cor_tema = $10,
            database_mode = 'shared',
            database_key = $11,
            atualizado_em = NOW()
          WHERE id::text = $1
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
            database_mode,
            database_key
          `,
          sourceInstituicaoId,
          targetTenantId,
          targetCodigo,
          cnpjDemo,
          targetInstituicaoNome,
          targetInstituicaoNome,
          targetSlug,
          targetEmail,
          targetLogoRelativePath,
          targetTema,
          targetSchema
        );

        const instituicaoId = instituicaoAtualizada[0]?.id ?? sourceInstituicaoId;

        for (const tableName of tableNames) {
          if (tableName === "instituicoes") {
            continue;
          }

          // O ajuste de tenant acontece apenas dentro do schema de apresentação.
          // A base original permanece íntegra no schema public.
          await tx.$executeRawUnsafe(
            `UPDATE "${targetSchema}"."${tableName}" SET tenant_id = $2::uuid WHERE tenant_id::text = $1`,
            sourceTenantId,
            targetTenantId
          );
        }

        await tx.$executeRawUnsafe(
          `
          UPDATE "${targetSchema}"."unidade_assistencial"
          SET tenant_id = $2::uuid,
              nome_fantasia = $3,
              razao_social = $4,
              cnpj = $5,
              atualizado_em = NOW()
          WHERE tenant_id::text = $1
          `,
          sourceTenantId,
          targetTenantId,
          targetInstituicaoNome,
          targetInstituicaoNome,
          cnpjDemo
        );

        await tx.$executeRawUnsafe(
          `
          UPDATE "${targetSchema}"."imagens_unidade"
          SET logomarca = $2,
              logomarca_relatorio = $2,
              atualizado_em = NOW()
          WHERE unidade_id IN (
            SELECT id
            FROM "${targetSchema}"."unidade_assistencial"
            WHERE tenant_id::text = $1
          )
          `,
          targetTenantId,
          targetLogoRelativePath
        );

        await tx.$executeRawUnsafe(
          `
          UPDATE "${targetSchema}"."usuarios"
          SET tenant_id = $2::uuid,
              instituicao_id = $3::uuid,
              status = 'ATIVO',
              perfil_acesso = COALESCE(NULLIF(perfil_acesso, ''), 'ADMINISTRADOR'),
              is_superadmin = FALSE,
              atualizado_em = NOW()
          WHERE tenant_id::text = $1
          `,
          sourceTenantId,
          targetTenantId,
          instituicaoId
        );

        await tx.$executeRawUnsafe(
          `
          INSERT INTO "${targetSchema}"."parametros_sistema" (
            tenant_id,
            chave,
            valor_json,
            atualizado_por,
            criado_em,
            atualizado_em
          )
          VALUES ($1::uuid, 'PERSONALIZACAO_VISUAL', $2::jsonb, $3, NOW(), NOW())
          ON CONFLICT (tenant_id, chave)
          DO UPDATE SET
            valor_json = EXCLUDED.valor_json,
            atualizado_por = EXCLUDED.atualizado_por,
            atualizado_em = NOW()
          `,
          targetTenantId,
          JSON.stringify(temaApresentacao),
          targetLogin
        );

        const usuarioAdminRows = await tx.$queryRawUnsafe<Array<{ id: bigint }>>(
          `
          SELECT u.id
          FROM "${targetSchema}"."usuarios" u
          WHERE u.tenant_id::text = $1
            AND (
              COALESCE(perfil_acesso, '') = 'ADMINISTRADOR'
              OR EXISTS (
                SELECT 1
                FROM "${targetSchema}"."usuario_permissao" up
                JOIN "${targetSchema}"."permissao" p ON p.id = up.permissao_id
                WHERE up.usuario_id = u.id
                  AND p.nome = 'ADMINISTRADOR'
              )
            )
          ORDER BY id ASC
          LIMIT 1
          `,
          targetTenantId
        );

        const usuarioAdminId = usuarioAdminRows[0]?.id;
        const senhaHash = await bcrypt.hash(targetSenha, 10);

        if (usuarioAdminId) {
          await tx.$executeRawUnsafe(
            `
            UPDATE "${targetSchema}"."usuarios"
            SET nome_usuario = $2,
                nome = $3,
                email = $4,
                senha_hash = $5,
                perfil_acesso = 'ADMINISTRADOR',
                status = 'ATIVO',
                is_superadmin = FALSE,
                tenant_id = $6::uuid,
                instituicao_id = $7::uuid,
                ultimo_tenant_id = $6::uuid,
                exigir_troca_senha = FALSE,
                tentativas_login_invalidas = 0,
                ultimo_login_invalido_em = NULL,
                deletado_em = NULL,
                atualizado_em = NOW()
            WHERE id = $1
            `,
            usuarioAdminId,
            targetLogin,
            targetNome,
            targetEmail,
            senhaHash,
            targetTenantId,
            instituicaoId
          );
        } else {
          const novoUsuario = await tx.$queryRawUnsafe<Array<{ id: bigint }>>(
            `
            INSERT INTO "${targetSchema}"."usuarios" (
              nome_usuario,
              nome,
              email,
              senha_hash,
              perfil_acesso,
              status,
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
              $3,
              $4,
              'ADMINISTRADOR',
              'ATIVO',
              FALSE,
              $5::uuid,
              $6::uuid,
              $5::uuid,
              FALSE,
              0,
              NULL,
              NOW(),
              NOW()
            )
            RETURNING id
            `,
            targetLogin,
            targetNome,
            targetEmail,
            senhaHash,
            targetTenantId,
            instituicaoId
          );

          const novoUsuarioId = novoUsuario[0]?.id;
          if (novoUsuarioId) {
            await tx.$executeRawUnsafe(
              `
              INSERT INTO "${targetSchema}"."usuario_permissao" (usuario_id, permissao_id)
              SELECT $1, p.id
              FROM "${targetSchema}"."permissao" p
              WHERE p.nome IN ('ADMINISTRADOR', 'OPERADOR', 'LEITURA_APENAS')
              ON CONFLICT (usuario_id, permissao_id) DO NOTHING
              `,
              novoUsuarioId
            );
          }
        }

        await tx.$executeRawUnsafe(
          `
          INSERT INTO "${targetSchema}"."permissao" (nome)
          VALUES ('ADMINISTRADOR'), ('OPERADOR'), ('LEITURA_APENAS')
          ON CONFLICT (nome) DO NOTHING
          `
        );

        const usuarioPrincipalRows = await tx.$queryRawUnsafe<Array<{ id: bigint }>>(
          `
          SELECT id
          FROM "${targetSchema}"."usuarios"
          WHERE lower(coalesce(email, '')) = lower($1)
          ORDER BY id ASC
          LIMIT 1
          `,
          targetEmail
        );

        const usuarioPrincipalId = usuarioPrincipalRows[0]?.id;
        if (usuarioPrincipalId) {
          await tx.$executeRawUnsafe(
            `
            INSERT INTO "${targetSchema}"."usuario_permissao" (usuario_id, permissao_id)
            SELECT $1, p.id
            FROM "${targetSchema}"."permissao" p
            WHERE p.nome IN ('ADMINISTRADOR', 'OPERADOR', 'LEITURA_APENAS')
            ON CONFLICT (usuario_id, permissao_id) DO NOTHING
            `,
            usuarioPrincipalId
          );
        }
      } finally {
        await tx.$executeRawUnsafe(`SET session_replication_role = origin`);
      }
    });

    return {
      instituicaoId: sourceInstituicaoId,
      tenantId: targetTenantId,
      schema: targetSchema,
      url: targetUrl
    };
  } finally {
    await prisma.$disconnect();
  }
}

function gravarEnvAcesso(targetUrl: string) {
  const conteudo = [
    `DATABASE_URL=${targetUrl}`,
    "APP_AUTH_COOKIE_NAME=g3n_auth_token_demo",
    "APP_EMAIL_HABILITADO=false",
    `G3N_PRESENTATION_TENANT_ID=${targetTenantId}`,
    "G3N_PRESENTATION_CNPJ_BASE=123456780001",
    "G3N_PRESENTATION_EMAIL=g3n@apresentacao.com",
    "G3N_PRESENTATION_PASSWORD=9Tuco12@",
    "G3N_PRESENTATION_COLOR=2563eb"
  ].join(os.EOL);

  return writeFile(path.resolve(backendRoot, ".env.g3n-apresentacao"), conteudo, "utf8");
}

const sourceConfig = criarPgConfig(env.DATABASE_URL);
const targetUrl = criarUrlPrismaComSchema(env.DATABASE_URL, targetSchema);
const prismaBase = new PrismaClient({ datasourceUrl: env.DATABASE_URL });

async function main() {
  await garantirLogoEmStorage();
  await prepararCloneSchema(sourceConfig);
  const resultado = await ajustarTenantApresentacao(targetUrl);
  await gravarEnvAcesso(targetUrl);

  console.log("[g3n-base] Tenant de apresentacao preparado com sucesso.");
  console.log(`- schema: ${resultado.schema}`);
  console.log(`- tenant: ${resultado.tenantId}`);
  console.log(`- instituicao base: ${resultado.instituicaoId}`);
  console.log(`- login: ${targetLogin}`);
  console.log(`- senha: ${targetSenha}`);
  console.log(`- email: ${targetEmail}`);
  console.log(`- cnpj demo: 12.345.678/0001-09`);
  console.log(`- logo: ${targetLogoRelativePath}`);
  console.log(`- arquivo de ambiente: .env.g3n-apresentacao`);
  console.log(`- DATABASE_URL: ${resultado.url}`);
}

main()
  .catch((error) => {
    console.error("[g3n-base] Falha ao preparar o tenant de apresentacao.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prismaBase.$disconnect();
  });
