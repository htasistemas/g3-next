import { randomUUID } from "node:crypto";
import { loadBackendEnvFiles, normalizeRuntimeEnv } from "../src/config/env-runtime.js";
import { prisma } from "../src/database/prisma.js";
import { CipaRepository } from "../src/modules/cipa/repositories/cipa.repository.js";

loadBackendEnvFiles(); Object.assign(process.env, normalizeRuntimeEnv(process.env));
const repository = new CipaRepository();
const sufixo = randomUUID().replaceAll("-", "").slice(0, 12);
let electionId = 0n; let collaboratorId = 0n;

try {
  const unidades = await prisma.$queryRaw<Array<{ id: bigint; tenant_id: string }>>`SELECT id, tenant_id FROM unidade_assistencial WHERE tenant_id IS NOT NULL LIMIT 1`;
  if (!unidades[0]) throw new Error("Não há unidade de homologação disponível.");
  const tenantId = unidades[0].tenant_id;
  const election = await prisma.$queryRaw<Array<{ id: bigint }>>`INSERT INTO cipa_eleicao (tenant_id, instituicao_id, unidade_id, identificador_publico, nome, gestao, status, inscricoes_inicio, inscricoes_fim, votacao_inicio, votacao_fim) VALUES (${tenantId}::uuid, ${randomUUID()}::uuid, ${unidades[0].id}, ${`cipa-remove-${sufixo}`}, 'Eleição teste de remoção', 'TESTE', 'CONFIGURACAO', CURRENT_DATE, CURRENT_DATE + 15, CURRENT_DATE + 16, CURRENT_DATE + 17) RETURNING id`;
  electionId = election[0].id;
  const collaborator = await prisma.$queryRaw<Array<{ id: bigint }>>`INSERT INTO rh_colaborador (tenant_id, instituicao_id, unidade_id, matricula, nome_completo, cpf, data_nascimento, data_admissao, status) VALUES (${tenantId}::uuid, ${randomUUID()}::uuid, ${unidades[0].id}, ${`MAT-${sufixo}`}, 'Colaborador teste remoção', '52998224725', DATE '1990-01-01', DATE '2020-01-01', 'ATIVO') RETURNING id`;
  collaboratorId = collaborator[0].id;
  const eleitor = await repository.adicionarEleitor(tenantId, String(electionId), String(collaboratorId), "1");
  if (!eleitor?.id) throw new Error("Eleitor não foi incluído.");
  await repository.removerEleitor(tenantId, String(electionId), eleitor.id, "1");
  const removido = await prisma.$queryRaw<Array<{ status: string; removido_em: Date | null }>>`SELECT status, removido_em FROM cipa_eleitor_eleicao WHERE id = ${BigInt(eleitor.id)} AND tenant_id = ${tenantId}::uuid`;
  if (removido[0]?.status !== "REMOVIDO" || !removido[0].removido_em) throw new Error("Remoção lógica não persistida.");
  const reativado = await repository.adicionarEleitor(tenantId, String(electionId), String(collaboratorId), "1");
  if (!reativado || reativado.id !== eleitor.id) throw new Error("Eleitor removido não foi reativado no mesmo registro.");
  const auditoria = await prisma.$queryRaw<Array<{ total: bigint }>>`SELECT COUNT(*)::bigint total FROM cipa_eleicao_auditoria WHERE tenant_id = ${tenantId}::uuid AND eleicao_id = ${electionId} AND acao IN ('ELEITOR_REMOVIDO', 'ELEITOR_REATIVADO')`;
  if (Number(auditoria[0]?.total ?? 0) !== 2) throw new Error("Operações de remoção/reativação não foram auditadas.");
  console.log(JSON.stringify({ removaoLogica: true, reativacaoSemDuplicidade: true, auditoriaRegistrada: true }, null, 2));
} finally {
  if (electionId) {
    const tenant = await prisma.$queryRaw<Array<{ tenant_id: string }>>`SELECT tenant_id FROM cipa_eleicao WHERE id = ${electionId} LIMIT 1`;
    if (tenant[0]) await prisma.$transaction(async (tx) => { await tx.$executeRaw`DELETE FROM cipa_eleicao_auditoria WHERE tenant_id = ${tenant[0].tenant_id}::uuid AND eleicao_id = ${electionId}`; await tx.$executeRaw`DELETE FROM cipa_eleitor_eleicao WHERE tenant_id = ${tenant[0].tenant_id}::uuid AND eleicao_id = ${electionId}`; await tx.$executeRaw`DELETE FROM cipa_eleicao WHERE tenant_id = ${tenant[0].tenant_id}::uuid AND id = ${electionId}`; });
  }
  if (collaboratorId) await prisma.$executeRaw`DELETE FROM rh_colaborador WHERE id = ${collaboratorId}`;
  await prisma.$disconnect();
}
