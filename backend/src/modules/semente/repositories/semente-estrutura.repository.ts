import type { Prisma, PrismaClient } from "@prisma/client";

type DatabaseLike = PrismaClient | Prisma.TransactionClient;

const sqlEstruturaSemente = [
  `
  CREATE TABLE IF NOT EXISTS memorias_semente (
    id BIGSERIAL PRIMARY KEY,
    usuario_id BIGINT NOT NULL,
    conteudo TEXT NOT NULL,
    data_criacao TIMESTAMP NOT NULL DEFAULT NOW()
  )
  `,
  "CREATE INDEX IF NOT EXISTS memorias_semente_usuario_data_idx ON memorias_semente (usuario_id, data_criacao DESC)"
];

let estruturaInicializada = false;

export async function ensureSementeEstrutura(db: DatabaseLike) {
  if (estruturaInicializada) return;

  for (const sql of sqlEstruturaSemente) {
    await db.$executeRawUnsafe(sql);
  }

  estruturaInicializada = true;
}
