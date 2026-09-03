import { randomUUID } from "node:crypto";
import { loadBackendEnvFiles, normalizeRuntimeEnv } from "../src/config/env-runtime.js";
import { prisma } from "../src/database/prisma.js";
import { CipaRepository } from "../src/modules/cipa/repositories/cipa.repository.js";

loadBackendEnvFiles(); Object.assign(process.env, normalizeRuntimeEnv(process.env));
const tenantId = randomUUID(); const repository = new CipaRepository(); let electionId = 0n; let bloqueou = false;
try {
  const rows = await prisma.$queryRaw<Array<{ id: bigint }>>`INSERT INTO cipa_eleicao (tenant_id, instituicao_id, unidade_id, identificador_publico, nome, gestao, status, votacao_fim) VALUES (${tenantId}::uuid, ${randomUUID()}::uuid, 1, ${`cipa-extension-${tenantId}`}, 'Teste de extensão CIPA', 'TESTE', 'VOTACAO_ABERTA', NOW()) RETURNING id`;
  electionId = rows[0].id; await prisma.$executeRaw`INSERT INTO cipa_eleicao_configuracao (tenant_id, eleicao_id) VALUES (${tenantId}::uuid, ${electionId})`;
  try { await repository.encerrarVotacao(tenantId, String(electionId), "1"); } catch { bloqueou = true; }
  if (!bloqueou) throw new Error("O encerramento deveria ser bloqueado abaixo do mínimo de participação.");
  await repository.estenderVotacao(tenantId, String(electionId), "1", 2);
  await repository.estenderVotacao(tenantId, String(electionId), "1", 2);
  const after = await prisma.$queryRaw<Array<{ extensao_numero: number; votacao_fim: Date }>>`SELECT extensao_numero, votacao_fim FROM cipa_eleicao WHERE tenant_id = ${tenantId}::uuid AND id = ${electionId}`;
  if (Number(after[0]?.extensao_numero) !== 2) throw new Error("As rodadas de extensão não foram persistidas.");
  await repository.encerrarVotacao(tenantId, String(electionId), "1");
  await repository.apurar(tenantId, String(electionId), "1");
  const final = await prisma.$queryRaw<Array<{ status: string }>>`SELECT status FROM cipa_eleicao WHERE tenant_id = ${tenantId}::uuid AND id = ${electionId}`;
  if (final[0]?.status !== "APURACAO") throw new Error("A apuração não foi liberada após a segunda extensão.");
  console.log(JSON.stringify({ bloqueioAbaixoDoMinimo: bloqueou, rodada: Number(after[0].extensao_numero), apuracaoLiberadaNaTerceiraRodada: true, novaDataFim: after[0].votacao_fim }, null, 2));
} finally {
  await prisma.$transaction(async (tx) => { await tx.$executeRaw`DELETE FROM cipa_eleicao_apuracao WHERE tenant_id = ${tenantId}::uuid`; await tx.$executeRaw`DELETE FROM cipa_eleicao_auditoria WHERE tenant_id = ${tenantId}::uuid`; await tx.$executeRaw`DELETE FROM cipa_eleicao_configuracao WHERE tenant_id = ${tenantId}::uuid`; await tx.$executeRaw`DELETE FROM cipa_eleicao WHERE tenant_id = ${tenantId}::uuid`; }); await prisma.$disconnect();
}
