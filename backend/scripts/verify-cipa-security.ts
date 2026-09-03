import { loadBackendEnvFiles, normalizeRuntimeEnv } from "../src/config/env-runtime.js";
import { prisma } from "../src/database/prisma.js";

loadBackendEnvFiles(); Object.assign(process.env, normalizeRuntimeEnv(process.env));
const columns = await prisma.$queryRaw<Array<{ column_name: string }>>`SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'cipa_voto' ORDER BY ordinal_position`;
const forbidden = new Set(["eleitor_id", "colaborador_id", "cpf", "usuario_id"]);
const exposed = columns.map((item) => item.column_name).filter((item) => forbidden.has(item));
const uniqueParticipation = await prisma.$queryRaw<Array<{ constraint_name: string }>>`SELECT constraint_name FROM information_schema.table_constraints WHERE table_schema = 'public' AND table_name = 'cipa_participacao' AND constraint_name = 'cipa_participacao_eleitor_unq' AND constraint_type = 'UNIQUE'`;
if (exposed.length || uniqueParticipation.length !== 1) { console.error(JSON.stringify({ exposed, uniqueParticipation }, null, 2)); process.exitCode = 1; } else console.log(JSON.stringify({ votoColumns: columns.map((item) => item.column_name), directIdentifiersExposed: false, uniqueParticipation: true }, null, 2));
await prisma.$disconnect();
