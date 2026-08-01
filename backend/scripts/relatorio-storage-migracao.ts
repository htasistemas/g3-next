import { Prisma } from "@prisma/client";
import { access } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeFile } from "node:fs/promises";
import { prisma } from "../src/database/prisma.js";
import { env } from "../src/config/env.js";

type ArquivoRow = {
  id: bigint;
  tenant_id: string | null;
  entidade_tipo: string;
  entidade_id: bigint | null;
  caminho_arquivo: string;
  thumbnail_caminho: string | null;
};

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const storageRoot = path.resolve(backendRoot, env.APP_STORAGE_ROOT);

function normalize(p: string) {
  return String(p ?? "").replace(/\\/g, "/").replace(/^\/+/, "").trim();
}

function absolutePath(p: string) {
  return path.resolve(storageRoot, normalize(p));
}

async function exists(p: string) {
  try {
    await access(p, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

const rows = await prisma.$queryRaw<ArquivoRow[]>(Prisma.sql`
  SELECT id, tenant_id::text AS tenant_id, entidade_tipo, entidade_id, caminho_arquivo, thumbnail_caminho
  FROM arquivos
  WHERE caminho_arquivo IS NOT NULL
    AND caminho_arquivo NOT LIKE 'tenants/%'
    AND caminho_arquivo NOT LIKE 'backups/%'
  ORDER BY data_upload ASC, id ASC
`);

const missing = [];
const missingByType = new Map<string, number>();
const missingByTenant = new Map<string, number>();

for (const row of rows) {
  const mainExists = await exists(absolutePath(row.caminho_arquivo));
  const thumbExists = row.thumbnail_caminho ? await exists(absolutePath(row.thumbnail_caminho)) : true;

  if (mainExists && thumbExists) {
    continue;
  }

  const tenantKey = row.tenant_id?.trim() || "sem-tenant";
  missing.push({
    id: String(row.id),
    tenantId: row.tenant_id,
    entidadeTipo: row.entidade_tipo,
    entidadeId: row.entidade_id ? String(row.entidade_id) : null,
    caminhoArquivo: row.caminho_arquivo,
    thumbnailCaminho: row.thumbnail_caminho,
    arquivoExiste: mainExists,
    thumbnailExiste: thumbExists
  });

  missingByType.set(row.entidade_tipo, (missingByType.get(row.entidade_tipo) ?? 0) + 1);
  missingByTenant.set(tenantKey, (missingByTenant.get(tenantKey) ?? 0) + 1);
}

const report = {
  storageRoot,
  totalRegistros: rows.length,
  totalSemArquivoFisico: missing.length,
  porEntidade: Object.fromEntries([...missingByType.entries()].sort((a, b) => b[1] - a[1])),
  porTenant: Object.fromEntries([...missingByTenant.entries()].sort((a, b) => b[1] - a[1])),
  exemplos: missing.slice(0, 30)
};

await writeFile(
  path.resolve(backendRoot, "..", "temp", "relatorio-storage-migracao.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8"
);

console.log(JSON.stringify(report, null, 2));
await prisma.$disconnect();
