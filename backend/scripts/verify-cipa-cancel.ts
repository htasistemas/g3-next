import { randomUUID } from "node:crypto";
import { loadBackendEnvFiles, normalizeRuntimeEnv } from "../src/config/env-runtime.js";
import { prisma } from "../src/database/prisma.js";
import { CipaRepository } from "../src/modules/cipa/repositories/cipa.repository.js";
import { AppError } from "../src/shared/errors/app-error.js";

loadBackendEnvFiles(); Object.assign(process.env, normalizeRuntimeEnv(process.env));
const tenantId = randomUUID(); const identificador = `cipa-cancel-${tenantId}`; let electionId = 0n;
try {
  const rows = await prisma.$queryRaw<Array<{ id: bigint }>>`INSERT INTO cipa_eleicao (tenant_id, instituicao_id, unidade_id, identificador_publico, nome, gestao, status, inscricoes_inicio, inscricoes_fim, votacao_inicio, votacao_fim) VALUES (${tenantId}::uuid, ${randomUUID()}::uuid, 1, ${identificador}, 'Teste de cancelamento CIPA', 'TESTE', 'INSCRICOES_ABERTAS', NOW() - INTERVAL '1 day', NOW() + INTERVAL '1 day', NOW() + INTERVAL '2 days', NOW() + INTERVAL '3 days') RETURNING id`;
  electionId = rows[0].id;
  const repository = new CipaRepository();
  await repository.cancelarEleicao(tenantId, String(electionId), "Cancelamento preventivo homologado", "1");
  const status = await prisma.$queryRaw<Array<{ status: string }>>`SELECT status FROM cipa_eleicao WHERE id = ${electionId} AND tenant_id = ${tenantId}::uuid`;
  const auditoria = await prisma.$queryRaw<Array<{ total: bigint }>>`SELECT COUNT(*)::bigint total FROM cipa_eleicao_auditoria WHERE eleicao_id = ${electionId} AND tenant_id = ${tenantId}::uuid AND acao = 'ELEICAO_CANCELADA'`;
  let bloqueouSegundoCancelamento = false;
  try { await repository.cancelarEleicao(tenantId, String(electionId), "Segundo cancelamento indevido", "1"); } catch (error) { bloqueouSegundoCancelamento = error instanceof AppError && error.statusCode === 409; }
  if (status[0]?.status !== "CANCELADA" || Number(auditoria[0]?.total) !== 1 || !bloqueouSegundoCancelamento) throw new Error("O cancelamento não preservou estado, auditoria ou bloqueio de repetição.");
  console.log(JSON.stringify({ status: status[0].status, auditoriaCancelamento: Number(auditoria[0].total), segundoCancelamentoBloqueado: bloqueouSegundoCancelamento }, null, 2));
} finally {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`DELETE FROM cipa_eleicao_auditoria WHERE tenant_id = ${tenantId}::uuid`;
    await tx.$executeRaw`DELETE FROM cipa_eleicao WHERE tenant_id = ${tenantId}::uuid AND id = ${electionId}`;
  }); await prisma.$disconnect();
}
