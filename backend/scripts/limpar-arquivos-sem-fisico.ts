import { Prisma } from "@prisma/client";
import { access } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "../src/database/prisma.js";
import { env } from "../src/config/env.js";

type ArquivoRow = {
  id: bigint;
  tenant_id: string | null;
  entidade_tipo: string;
  entidade_id: bigint | null;
  caminho_arquivo: string;
  thumbnail_caminho: string | null;
  ativo: boolean;
};

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const storageRoot = path.resolve(backendRoot, env.APP_STORAGE_ROOT);
const dryRun = process.argv.includes("--dry-run");

function normalize(caminho: string) {
  return String(caminho ?? "").replace(/\\/g, "/").replace(/^\/+/, "").trim();
}

function absolute(caminho: string) {
  return path.resolve(storageRoot, normalize(caminho));
}

async function exists(caminho: string) {
  try {
    await access(caminho, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const arquivos = await prisma.$queryRaw<ArquivoRow[]>(Prisma.sql`
    SELECT
      id,
      tenant_id::text AS tenant_id,
      entidade_tipo,
      entidade_id,
      caminho_arquivo,
      thumbnail_caminho,
      ativo
    FROM arquivos
    WHERE ativo = TRUE
      AND caminho_arquivo IS NOT NULL
      AND caminho_arquivo NOT LIKE 'backups/%'
    ORDER BY data_upload ASC, id ASC
  `);

  const semFisico: ArquivoRow[] = [];

  for (const arquivo of arquivos) {
    const arquivoExiste = await exists(absolute(arquivo.caminho_arquivo));
    const thumbnailExiste = arquivo.thumbnail_caminho
      ? await exists(absolute(arquivo.thumbnail_caminho))
      : true;

    if (!arquivoExiste || !thumbnailExiste) {
      semFisico.push(arquivo);
    }
  }

  const ids = semFisico.map((item) => item.id);
  const caminhos = semFisico.map((item) => item.caminho_arquivo);

  const anexosCandidatos = ids.length
    ? await prisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`
        SELECT COUNT(*)::bigint AS total
        FROM documentos_instituicao_anexos
        WHERE arquivo_id IN (${Prisma.join(ids)})
           OR caminho_arquivo IN (${Prisma.join(caminhos)})
      `)
    : [{ total: 0n }];

  const resumo = {
    dryRun,
    storageRoot,
    totalArquivosAtivos: arquivos.length,
    totalSemFisico: semFisico.length,
    totalAnexosDocumentoCandidatos: Number(anexosCandidatos[0]?.total ?? 0n),
    porEntidade: semFisico.reduce<Record<string, number>>((acc, item) => {
      acc[item.entidade_tipo] = (acc[item.entidade_tipo] ?? 0) + 1;
      return acc;
    }, {}),
    porTenant: semFisico.reduce<Record<string, number>>((acc, item) => {
      const key = item.tenant_id?.trim() || "sem-tenant";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {}),
    exemplos: semFisico.slice(0, 20).map((item) => ({
      id: String(item.id),
      tenantId: item.tenant_id,
      entidadeTipo: item.entidade_tipo,
      entidadeId: item.entidade_id ? String(item.entidade_id) : null,
      caminhoArquivo: item.caminho_arquivo,
      thumbnailCaminho: item.thumbnail_caminho
    }))
  };

  if (dryRun) {
    console.log(JSON.stringify(resumo, null, 2));
    await prisma.$disconnect();
    return;
  }

  if (!semFisico.length) {
    console.log(JSON.stringify({ ...resumo, removidosArquivos: 0, removidosAnexosDocumento: 0 }, null, 2));
    await prisma.$disconnect();
    return;
  }

  const resultado = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw(Prisma.sql`
      UPDATE arquivos
      SET ativo = FALSE,
          excluido_em = COALESCE(excluido_em, NOW()),
          atualizado_em = NOW()
      WHERE id IN (${Prisma.join(ids)})
    `);

    const anexosRemovidos = await tx.$executeRaw(Prisma.sql`
      DELETE FROM documentos_instituicao_anexos
      WHERE arquivo_id IN (${Prisma.join(ids)})
         OR caminho_arquivo IN (${Prisma.join(caminhos)})
    `);

    return { anexosRemovidos };
  });

  console.log(
    JSON.stringify(
      {
        ...resumo,
        removidosArquivos: semFisico.length,
        removidosAnexosDocumento: resultado.anexosRemovidos
      },
      null,
      2
    )
  );

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error("[limpeza-storage] erro fatal:", error);
  await prisma.$disconnect().catch(() => undefined);
  process.exitCode = 1;
});
