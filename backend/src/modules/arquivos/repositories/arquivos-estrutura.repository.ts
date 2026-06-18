import type { Prisma, PrismaClient } from "@prisma/client";

type DatabaseLike = PrismaClient | Prisma.TransactionClient;

const sqlEstruturaArquivos: string[] = [
  `
  CREATE TABLE IF NOT EXISTS arquivos (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID,
    entidade_tipo VARCHAR(120) NOT NULL,
    entidade_id BIGINT,
    categoria VARCHAR(80) NOT NULL,
    nome_original VARCHAR(255) NOT NULL,
    nome_arquivo VARCHAR(255) NOT NULL,
    caminho_arquivo TEXT NOT NULL,
    thumbnail_caminho TEXT,
    mime_type VARCHAR(150) NOT NULL,
    extensao VARCHAR(30),
    tamanho_bytes BIGINT NOT NULL,
    data_upload TIMESTAMP NOT NULL DEFAULT NOW(),
    usuario_upload_id BIGINT,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    observacao TEXT,
    metadados_json JSONB,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    excluido_em TIMESTAMP
  )
  `,
  "ALTER TABLE arquivos ADD COLUMN IF NOT EXISTS tenant_id UUID",
  `
  UPDATE arquivos a
  SET tenant_id = b.tenant_id
  FROM cadastro_beneficiario b
  WHERE a.tenant_id IS NULL
    AND a.entidade_tipo = 'beneficiario'
    AND a.entidade_id = b.id
    AND b.tenant_id IS NOT NULL
  `,
  "ALTER TABLE arquivos ADD COLUMN IF NOT EXISTS thumbnail_caminho TEXT",
  "ALTER TABLE arquivos ADD COLUMN IF NOT EXISTS usuario_upload_id BIGINT",
  "ALTER TABLE arquivos ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT TRUE",
  "ALTER TABLE arquivos ADD COLUMN IF NOT EXISTS observacao TEXT",
  "ALTER TABLE arquivos ADD COLUMN IF NOT EXISTS metadados_json JSONB",
  "ALTER TABLE arquivos ADD COLUMN IF NOT EXISTS criado_em TIMESTAMP NOT NULL DEFAULT NOW()",
  "ALTER TABLE arquivos ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()",
  "ALTER TABLE arquivos ADD COLUMN IF NOT EXISTS excluido_em TIMESTAMP",
  "CREATE UNIQUE INDEX IF NOT EXISTS arquivos_caminho_arquivo_uidx ON arquivos(caminho_arquivo)",
  "CREATE INDEX IF NOT EXISTS arquivos_tenant_idx ON arquivos(tenant_id, entidade_tipo, entidade_id)",
  "CREATE INDEX IF NOT EXISTS arquivos_entidade_idx ON arquivos(entidade_tipo, entidade_id, categoria)",
  "CREATE INDEX IF NOT EXISTS arquivos_ativo_idx ON arquivos(ativo)",
  "CREATE INDEX IF NOT EXISTS arquivos_data_upload_idx ON arquivos(data_upload DESC)"
];

let estruturaInicializada = false;

export async function ensureArquivosEstrutura(db: DatabaseLike) {
  if (estruturaInicializada) return;

  for (const sql of sqlEstruturaArquivos) {
    await db.$executeRawUnsafe(sql);
  }

  estruturaInicializada = true;
}
