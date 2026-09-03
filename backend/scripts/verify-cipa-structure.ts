import { loadBackendEnvFiles, normalizeRuntimeEnv } from "../src/config/env-runtime.js";
import { prisma } from "../src/database/prisma.js";

loadBackendEnvFiles();
Object.assign(process.env, normalizeRuntimeEnv(process.env));

const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name LIKE 'cipa_%'
  ORDER BY table_name
`;
const constraints = await prisma.$queryRaw<Array<{ table_name: string; constraint_name: string }>>`
  SELECT table_name, constraint_name
  FROM information_schema.table_constraints
  WHERE table_schema = 'public' AND table_name IN ('cipa_participacao', 'cipa_voto')
    AND constraint_type IN ('UNIQUE', 'CHECK')
  ORDER BY table_name, constraint_name
`;
const indexes = await prisma.$queryRaw<Array<{ indexname: string }>>`SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'cipa_eleicao_identificador_publico_global_unq'`;
console.log(JSON.stringify({ tables: tables.map((item) => item.table_name), constraints, publicIdentifierGlobalUnique: indexes.length === 1 }, null, 2));
await prisma.$disconnect();
