import { randomUUID } from "node:crypto";
import { loadBackendEnvFiles, normalizeRuntimeEnv } from "../src/config/env-runtime.js";
import { prisma } from "../src/database/prisma.js";
import { CipaRepository } from "../src/modules/cipa/repositories/cipa.repository.js";
import { AppError } from "../src/shared/errors/app-error.js";

loadBackendEnvFiles(); Object.assign(process.env, normalizeRuntimeEnv(process.env));
const repository = new CipaRepository(); const tenantId = randomUUID(); let electionId = 0n;
try {
  const rows = await prisma.$queryRaw<Array<{ id: bigint }>>`INSERT INTO cipa_eleicao (tenant_id, instituicao_id, unidade_id, identificador_publico, nome, gestao, status, votacao_inicio, votacao_fim) VALUES (${tenantId}::uuid, ${randomUUID()}::uuid, 1, ${`cipa-schedule-${tenantId}`}, 'Teste de cronograma', 'TESTE', 'ELEICAO_PRONTA', NOW() + INTERVAL '1 day', NOW() + INTERVAL '2 days') RETURNING id`;
  electionId = rows[0].id;
  let bloqueouInicio = false;
  try { await repository.abrirVotacao(tenantId, String(electionId), "1"); } catch (error) { bloqueouInicio = error instanceof AppError && error.statusCode === 409; }
  if (!bloqueouInicio) throw new Error("A abertura antes do início configurado deveria ser bloqueada.");
  await prisma.$executeRaw`UPDATE cipa_eleicao SET votacao_inicio = NOW() - INTERVAL '2 days', votacao_fim = NOW() - INTERVAL '1 day' WHERE id = ${electionId} AND tenant_id = ${tenantId}::uuid`;
  let bloqueouFim = false;
  try { await repository.abrirVotacao(tenantId, String(electionId), "1"); } catch (error) { bloqueouFim = error instanceof AppError && error.statusCode === 409; }
  if (!bloqueouFim) throw new Error("A abertura depois do fim configurado deveria ser bloqueada.");
  console.log(JSON.stringify({ bloqueioAntesDoInicio: bloqueouInicio, bloqueioDepoisDoFim: bloqueouFim }, null, 2));
} finally {
  await prisma.$transaction(async (tx) => { await tx.$executeRaw`DELETE FROM cipa_eleicao_auditoria WHERE tenant_id = ${tenantId}::uuid`; await tx.$executeRaw`DELETE FROM cipa_eleicao WHERE tenant_id = ${tenantId}::uuid`; }); await prisma.$disconnect();
}
