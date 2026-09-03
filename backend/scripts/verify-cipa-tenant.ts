import { randomUUID } from "node:crypto";
import { loadBackendEnvFiles, normalizeRuntimeEnv } from "../src/config/env-runtime.js";
import { prisma } from "../src/database/prisma.js";
import { CipaRepository } from "../src/modules/cipa/repositories/cipa.repository.js";

loadBackendEnvFiles(); Object.assign(process.env, normalizeRuntimeEnv(process.env));
const tenantA = randomUUID(); const tenantB = randomUUID(); const repository = new CipaRepository(); let electionId = 0n;
try {
  const rows = await prisma.$queryRaw<Array<{ id: bigint }>>`INSERT INTO cipa_eleicao (tenant_id, instituicao_id, unidade_id, identificador_publico, nome, gestao, status) VALUES (${tenantA}::uuid, ${randomUUID()}::uuid, 1, ${`cipa-tenant-${tenantA}`}, 'Eleição tenant A', 'TESTE', 'CONFIGURACAO') RETURNING id`;
  electionId = rows[0].id;
  let negacoes = 0;
  for (const consulta of [
    () => repository.listarEleitores(tenantB, String(electionId)),
    () => repository.listarCandidaturas(tenantB, String(electionId)),
    () => repository.obterDashboard(tenantB, String(electionId)),
    () => repository.listarComissao(tenantB, String(electionId)),
    () => repository.listarAuditoria(tenantB, String(electionId))
  ]) {
    try { await consulta(); } catch (error) { if (error instanceof Error && error.message.includes("Eleição não encontrada")) negacoes += 1; else throw error; }
  }
  if (negacoes !== 5) throw new Error(`Esperadas 5 negativas de tenant, recebidas ${negacoes}.`);
  console.log(JSON.stringify({ eleicaoDoTenantA: true, consultasNegadasNoTenantB: negacoes, isolamentoConfirmado: true, removidoAoFinal: true }, null, 2));
} finally {
  await prisma.$executeRaw`DELETE FROM cipa_eleicao WHERE tenant_id IN (${tenantA}::uuid, ${tenantB}::uuid)`;
  await prisma.$disconnect();
}
