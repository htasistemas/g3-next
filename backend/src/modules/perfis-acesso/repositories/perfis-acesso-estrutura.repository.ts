import type { Prisma, PrismaClient } from "@prisma/client";

type DatabaseLike = PrismaClient | Prisma.TransactionClient;

const statements = [
  `INSERT INTO permissao (nome) VALUES ('CONFIGURACOES_PERFIS_ACESSO_ADMINISTRAR') ON CONFLICT (nome) DO NOTHING`,
  `CREATE TABLE IF NOT EXISTS perfil_acesso (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    instituicao_id UUID NOT NULL,
    nome VARCHAR(120) NOT NULL,
    descricao VARCHAR(500),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    administrativo BOOLEAN NOT NULL DEFAULT FALSE,
    observacoes TEXT,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    criado_por BIGINT,
    alterado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    alterado_por BIGINT
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS perfil_acesso_tenant_nome_unq ON perfil_acesso (tenant_id, lower(nome))`,
  `CREATE INDEX IF NOT EXISTS perfil_acesso_tenant_idx ON perfil_acesso (tenant_id, ativo)`,
  `CREATE TABLE IF NOT EXISTS perfil_acesso_permissao (
    perfil_id BIGINT NOT NULL REFERENCES perfil_acesso(id) ON DELETE CASCADE,
    permissao_id BIGINT NOT NULL REFERENCES permissao(id) ON DELETE RESTRICT,
    PRIMARY KEY (perfil_id, permissao_id)
  )`,
  `CREATE TABLE IF NOT EXISTS usuario_perfil_acesso (
    usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    perfil_id BIGINT NOT NULL REFERENCES perfil_acesso(id) ON DELETE RESTRICT,
    tenant_id UUID NOT NULL,
    principal BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (usuario_id, perfil_id)
  )`,
  `CREATE INDEX IF NOT EXISTS usuario_perfil_acesso_tenant_idx ON usuario_perfil_acesso (tenant_id, usuario_id)`,
  `CREATE INDEX IF NOT EXISTS usuario_perfil_acesso_perfil_idx ON usuario_perfil_acesso (perfil_id)`,
  `CREATE TABLE IF NOT EXISTS perfil_acesso_auditoria (
    id BIGSERIAL PRIMARY KEY,
    perfil_id BIGINT,
    tenant_id UUID NOT NULL,
    usuario_id BIGINT,
    acao VARCHAR(30) NOT NULL,
    permissoes_adicionadas JSONB NOT NULL DEFAULT '[]'::jsonb,
    permissoes_removidas JSONB NOT NULL DEFAULT '[]'::jsonb,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS perfil_acesso_id BIGINT`,
  `CREATE INDEX IF NOT EXISTS usuarios_perfil_acesso_idx ON usuarios (perfil_acesso_id, tenant_id)`
];

let ready: Promise<void> | null = null;
export async function ensurePerfisAcessoEstrutura(db: DatabaseLike) {
  if (!ready) {
    ready = (async () => {
      for (const statement of statements) await db.$executeRawUnsafe(statement);
    })().catch((error) => { ready = null; throw error; });
  }
  await ready;
}
