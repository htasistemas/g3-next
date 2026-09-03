import { randomUUID } from "node:crypto";
import { loadBackendEnvFiles, normalizeRuntimeEnv } from "../src/config/env-runtime.js";
import { prisma } from "../src/database/prisma.js";

loadBackendEnvFiles(); Object.assign(process.env, normalizeRuntimeEnv(process.env));
const tenantId = randomUUID(); let electionId = 0n; let collaboratorId = 0n; let voterId = 0n; let candidateId = 0n;
try {
  const setup = await prisma.$transaction(async (tx) => {
    const collaborator = await tx.$queryRaw<Array<{ id: bigint }>>`INSERT INTO rh_colaborador (tenant_id, instituicao_id, unidade_id, matricula, nome_completo, cpf, data_nascimento, data_admissao) VALUES (${tenantId}::uuid, ${randomUUID()}::uuid, 1, ${`CONC-${tenantId.slice(0, 8)}`}, 'Teste Concorrência CIPA', '52998224725', '1990-01-01', '2020-01-01') RETURNING id`;
    const election = await tx.$queryRaw<Array<{ id: bigint }>>`INSERT INTO cipa_eleicao (tenant_id, instituicao_id, unidade_id, identificador_publico, nome, gestao, status) VALUES (${tenantId}::uuid, ${randomUUID()}::uuid, 1, ${`cipa-test-${tenantId}`}, 'Teste Concorrência', 'TESTE', 'VOTACAO_ABERTA') RETURNING id`;
    await tx.$executeRaw`INSERT INTO cipa_eleicao_configuracao (tenant_id, eleicao_id) VALUES (${tenantId}::uuid, ${election[0].id})`;
    const voter = await tx.$queryRaw<Array<{ id: bigint }>>`INSERT INTO cipa_eleitor_eleicao (tenant_id, eleicao_id, colaborador_id, matricula, nome_completo, cpf, data_nascimento, unidade_id, data_admissao) SELECT ${tenantId}::uuid, ${election[0].id}, id, matricula, nome_completo, cpf, data_nascimento, unidade_id, data_admissao FROM rh_colaborador WHERE id = ${collaborator[0].id} RETURNING id`;
    const candidate = await tx.$queryRaw<Array<{ id: bigint }>>`INSERT INTO cipa_candidatura (tenant_id, eleicao_id, colaborador_id, numero, nome_publico, status, protocolo) VALUES (${tenantId}::uuid, ${election[0].id}, ${collaborator[0].id}, 1, 'Candidato Teste', 'APROVADA', ${`TESTE-${tenantId}`}) RETURNING id`;
    return { electionId: election[0].id, collaboratorId: collaborator[0].id, voterId: voter[0].id, candidateId: candidate[0].id };
  }); electionId = setup.electionId; collaboratorId = setup.collaboratorId; voterId = setup.voterId; candidateId = setup.candidateId;
  const resultados = await Promise.allSettled([1, 2].map((indice) => prisma.$transaction((tx) => tx.$executeRaw`INSERT INTO cipa_participacao (tenant_id, eleicao_id, eleitor_id, protocolo, status, votado_em) VALUES (${tenantId}::uuid, ${electionId}, ${voterId}, ${`TESTE-${tenantId}-${indice}`}, 'REGISTRADA', NOW())`)));
  const aceitas = resultados.filter((item) => item.status === "fulfilled").length;
  if (aceitas !== 1) throw new Error(`Concorrência inválida: ${aceitas} participações aceitas.`);
  console.log(JSON.stringify({ tenantId, electionId: String(electionId), candidateId: String(candidateId), aceitas, rejeitadas: resultados.length - aceitas, invariant: "um eleitor = uma participação" }, null, 2));
} finally {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`DELETE FROM cipa_voto WHERE tenant_id = ${tenantId}::uuid`;
    await tx.$executeRaw`DELETE FROM cipa_participacao WHERE tenant_id = ${tenantId}::uuid`;
    await tx.$executeRaw`DELETE FROM cipa_candidatura WHERE tenant_id = ${tenantId}::uuid`;
    await tx.$executeRaw`DELETE FROM cipa_eleitor_eleicao WHERE tenant_id = ${tenantId}::uuid`;
    await tx.$executeRaw`DELETE FROM cipa_eleicao_configuracao WHERE tenant_id = ${tenantId}::uuid`;
    await tx.$executeRaw`DELETE FROM cipa_eleicao WHERE tenant_id = ${tenantId}::uuid`;
    await tx.$executeRaw`DELETE FROM rh_colaborador WHERE tenant_id = ${tenantId}::uuid`;
  }); await prisma.$disconnect();
}
