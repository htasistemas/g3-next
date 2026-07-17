import { Prisma } from "@prisma/client";
import { access, mkdir, rename, rm, stat } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "../src/database/prisma.js";
import { env } from "../src/config/env.js";
import { normalizarCaminhoLogico } from "../src/modules/arquivos/services/storage-utils.js";

type ArquivoRow = {
  id: bigint;
  tenant_id: string | null;
  entidade_tipo: string;
  entidade_id: bigint | null;
  caminho_arquivo: string;
  thumbnail_caminho: string | null;
};

type MapeamentoArquivo = {
  id: bigint;
  tenantId: string;
  caminhoAntigo: string;
  caminhoNovo: string;
  thumbnailAntigo?: string;
  thumbnailNovo?: string;
  origem: string;
};

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const storageRoot = path.resolve(backendRoot, env.APP_STORAGE_ROOT);
const dryRun = process.argv.includes("--dry-run");

function isManagedPath(caminho: string) {
  const normalizado = caminho.replace(/\\/g, "/").replace(/^\/+/, "");
  return (
    normalizado.length > 0 &&
    !normalizado.startsWith("tenants/") &&
    !normalizado.startsWith("backups/")
  );
}

function tenantRoot(tenantId?: string | null) {
  return normalizarCaminhoLogico(`tenants/${tenantId?.trim() || "sem-tenant"}`);
}

function caminhoNovoParaTenant(caminho: string, tenantId?: string | null) {
  const base = normalizarCaminhoLogico(caminho);
  if (!isManagedPath(base)) {
    return base;
  }

  return normalizarCaminhoLogico(`${tenantRoot(tenantId)}/${base}`);
}

function absoluto(caminho: string) {
  return path.resolve(storageRoot, normalizarCaminhoLogico(caminho));
}

async function existeArquivo(caminhoAbs: string) {
  try {
    await access(caminhoAbs, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function inferirTenantId(row: ArquivoRow) {
  if (row.tenant_id?.trim()) {
    return row.tenant_id.trim();
  }

  if (row.entidade_tipo === "beneficiario" && row.entidade_id) {
    const registros = await prisma.$queryRaw<Array<{ tenant_id: string | null }>>(Prisma.sql`
      SELECT tenant_id::text AS tenant_id
      FROM cadastro_beneficiario
      WHERE id = ${row.entidade_id}
      LIMIT 1
    `);
    return registros[0]?.tenant_id?.trim() || null;
  }

  if (row.entidade_tipo === "instituicao" || row.entidade_tipo === "unidade_assistencial") {
    if (row.entidade_id) {
      const registros = await prisma.$queryRaw<Array<{ tenant_id: string | null }>>(Prisma.sql`
        SELECT tenant_id::text AS tenant_id
        FROM unidade_assistencial
        WHERE id = ${row.entidade_id}
        LIMIT 1
      `);
      return registros[0]?.tenant_id?.trim() || null;
    }
  }

  return null;
}

async function moverArquivo(antigo: string, novo: string) {
  const absAntigo = absoluto(antigo);
  const absNovo = absoluto(novo);

  if (absAntigo === absNovo) {
    return { movido: false, existeNovo: await existeArquivo(absNovo) };
  }

  await mkdir(path.dirname(absNovo), { recursive: true });

  const existeAntigo = await existeArquivo(absAntigo);
  const existeNovo = await existeArquivo(absNovo);

  if (!existeAntigo && existeNovo) {
    return { movido: false, existeNovo: true };
  }

  if (existeAntigo && existeNovo) {
    await rm(absAntigo, { force: true });
    return { movido: true, existeNovo: true, removidoAntigo: true };
  }

  if (existeAntigo) {
    await rename(absAntigo, absNovo);
    return { movido: true, existeNovo: true };
  }

  return { movido: false, existeNovo: false };
}

async function executar() {
  const arquivos = await prisma.$queryRaw<ArquivoRow[]>(Prisma.sql`
    SELECT
      id,
      tenant_id::text AS tenant_id,
      entidade_tipo,
      entidade_id,
      caminho_arquivo,
      thumbnail_caminho
    FROM arquivos
    WHERE caminho_arquivo IS NOT NULL
      AND caminho_arquivo NOT LIKE 'tenants/%'
      AND caminho_arquivo NOT LIKE 'backups/%'
    ORDER BY data_upload ASC, id ASC
  `);

  const total = arquivos.length;
  let movidos = 0;
  let ignorados = 0;
  let semTenant = 0;
  const pendentes: string[] = [];

  for (const row of arquivos) {
    const tenantId = await inferirTenantId(row);
    const origem = row.tenant_id?.trim() ? "tenant" : row.entidade_tipo;
    const caminhoNovo = caminhoNovoParaTenant(row.caminho_arquivo, tenantId);
    const thumbnailNovo = row.thumbnail_caminho ? caminhoNovoParaTenant(row.thumbnail_caminho, tenantId) : null;

    if (!isManagedPath(row.caminho_arquivo) || caminhoNovo === row.caminho_arquivo) {
      ignorados += 1;
      continue;
    }

    if (!tenantId) {
      semTenant += 1;
    }

    if (dryRun) {
      console.log(
        JSON.stringify(
          {
            id: String(row.id),
            tenantId: tenantId || null,
            origem,
            caminhoAntigo: row.caminho_arquivo,
            caminhoNovo,
            thumbnailAntigo: row.thumbnail_caminho,
            thumbnailNovo
          },
          null,
          2
        )
      );
      movidos += 1;
      continue;
    }

    const resultadoArquivo = await moverArquivo(row.caminho_arquivo, caminhoNovo);
    if (row.thumbnail_caminho) {
      await moverArquivo(row.thumbnail_caminho, thumbnailNovo ?? row.thumbnail_caminho);
    }

    if (!resultadoArquivo.existeNovo) {
      pendentes.push(row.caminho_arquivo);
      continue;
    }

    try {
      await prisma.$transaction(async (tx) => {
        await tx.$executeRaw(Prisma.sql`
          UPDATE arquivos
          SET
            tenant_id = COALESCE(tenant_id, ${tenantId ? Prisma.sql`${tenantId}::uuid` : Prisma.sql`NULL`}),
            caminho_arquivo = ${caminhoNovo},
            thumbnail_caminho = ${thumbnailNovo}
          WHERE id = ${row.id}
        `);

        await tx.$executeRaw(Prisma.sql`
          UPDATE documentos_instituicao_anexos
          SET caminho_arquivo = ${caminhoNovo}
          WHERE arquivo_id = ${row.id}
        `);

        await tx.$executeRaw(Prisma.sql`
          UPDATE documentos_instituicao_anexos
          SET caminho_arquivo = ${caminhoNovo}
          WHERE arquivo_id IS NULL
            AND caminho_arquivo = ${row.caminho_arquivo}
        `);
      });

      movidos += 1;
      console.log(
        JSON.stringify(
          {
            id: String(row.id),
            tenantId: tenantId || null,
            caminhoAntigo: row.caminho_arquivo,
            caminhoNovo
          },
          null,
          0
        )
      );
    } catch (error) {
      pendentes.push(row.caminho_arquivo);
      console.error(
        `[migração-storage] falha ao atualizar banco para arquivo ${row.id}:`,
        error instanceof Error ? error.message : error
      );
    }
  }

  console.log(
    JSON.stringify(
        {
          dryRun,
          storageRoot,
          total,
          movidos,
          ignorados,
          semTenant,
        pendentes
      },
      null,
      2
    )
  );
}

executar()
  .catch((error) => {
    console.error("[migração-storage] erro fatal:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => undefined);
  });
