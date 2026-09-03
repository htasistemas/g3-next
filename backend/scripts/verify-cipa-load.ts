import { randomUUID } from "node:crypto";
import { loadBackendEnvFiles, normalizeRuntimeEnv } from "../src/config/env-runtime.js";
import { prisma } from "../src/database/prisma.js";

loadBackendEnvFiles(); Object.assign(process.env, normalizeRuntimeEnv(process.env));
const target = Math.max(1, Math.min(10000, Number(process.argv[2] ?? 100))); const tenantId = randomUUID(); let electionId = 0n;
const inicio = Date.now();
try {
  const setup = await prisma.$transaction(async (tx) => {
    const election = await tx.$queryRaw<Array<{ id: bigint }>>`INSERT INTO cipa_eleicao (tenant_id, instituicao_id, unidade_id, identificador_publico, nome, gestao, status) VALUES (${tenantId}::uuid, ${randomUUID()}::uuid, 1, ${`cipa-load-${tenantId}`}, 'Teste de carga CIPA', 'TESTE', 'VOTACAO_ABERTA') RETURNING id`;
    electionId = election[0].id;
    await tx.$executeRaw`INSERT INTO cipa_eleicao_configuracao (tenant_id, eleicao_id) VALUES (${tenantId}::uuid, ${electionId})`;
    await tx.$executeRaw`INSERT INTO rh_colaborador (tenant_id, instituicao_id, unidade_id, matricula, nome_completo, cpf, data_nascimento, data_admissao) SELECT ${tenantId}::uuid, ${randomUUID()}::uuid, 1, ${`LOAD-${tenantId.slice(0, 8)}-`} || gs::text, 'Eleitor de carga ' || gs::text, lpad((10000000000 + gs)::text, 11, '0'), '1990-01-01', '2020-01-01' FROM generate_series(1, ${target}) gs`;
    await tx.$executeRaw`INSERT INTO cipa_eleitor_eleicao (tenant_id, eleicao_id, colaborador_id, matricula, nome_completo, cpf, data_nascimento, unidade_id, data_admissao) SELECT ${tenantId}::uuid, ${electionId}, c.id, c.matricula, c.nome_completo, c.cpf, c.data_nascimento, c.unidade_id, c.data_admissao FROM rh_colaborador c WHERE c.tenant_id = ${tenantId}::uuid`;
    const candidate = await tx.$queryRaw<Array<{ id: bigint }>>`INSERT INTO cipa_candidatura (tenant_id, eleicao_id, colaborador_id, numero, nome_publico, status, protocolo) SELECT ${tenantId}::uuid, ${electionId}, id, 1, 'Candidato de carga', 'APROVADA', ${`LOAD-${tenantId}`} FROM rh_colaborador WHERE tenant_id = ${tenantId}::uuid LIMIT 1 RETURNING id`;
    return { candidateId: candidate[0].id };
  });
  const voters = await prisma.$queryRaw<Array<{ eleitor_id: bigint }>>`SELECT id eleitor_id FROM cipa_eleitor_eleicao WHERE tenant_id = ${tenantId}::uuid AND eleicao_id = ${electionId} ORDER BY id`;
  for (let offset = 0; offset < voters.length; offset += 250) {
    const lote = voters.slice(offset, offset + 250);
    await Promise.all(lote.map((voter, index) => prisma.$transaction(async (tx) => { const protocolo = `LOAD-${tenantId}-${offset + index}`; await tx.$executeRaw`INSERT INTO cipa_participacao (tenant_id, eleicao_id, eleitor_id, protocolo, status, votado_em) VALUES (${tenantId}::uuid, ${electionId}, ${voter.eleitor_id}, ${protocolo}, 'REGISTRADA', NOW())`; await tx.$executeRaw`INSERT INTO cipa_voto (tenant_id, eleicao_id, candidatura_id, tipo) VALUES (${tenantId}::uuid, ${electionId}, ${setup.candidateId}, 'VALIDO')`; })));
  }
  const [participacoes, votos] = await Promise.all([prisma.$queryRaw<Array<{ total: bigint }>>`SELECT COUNT(*)::bigint total FROM cipa_participacao WHERE tenant_id = ${tenantId}::uuid AND eleicao_id = ${electionId}`, prisma.$queryRaw<Array<{ total: bigint }>>`SELECT COUNT(*)::bigint total FROM cipa_voto WHERE tenant_id = ${tenantId}::uuid AND eleicao_id = ${electionId}`]);
  if (Number(participacoes[0].total) !== target || Number(votos[0].total) !== target) throw new Error(`Contagem divergente: participações=${participacoes[0].total}, votos=${votos[0].total}`);
  console.log(JSON.stringify({ target, participacoes: Number(participacoes[0].total), votos: Number(votos[0].total), duracaoMs: Date.now() - inicio, invariant: "nenhuma participação ou voto perdido" }, null, 2));
} finally {
  await prisma.$transaction(async (tx) => { await tx.$executeRaw`DELETE FROM cipa_voto WHERE tenant_id = ${tenantId}::uuid`; await tx.$executeRaw`DELETE FROM cipa_participacao WHERE tenant_id = ${tenantId}::uuid`; await tx.$executeRaw`DELETE FROM cipa_candidatura WHERE tenant_id = ${tenantId}::uuid`; await tx.$executeRaw`DELETE FROM cipa_eleitor_eleicao WHERE tenant_id = ${tenantId}::uuid`; await tx.$executeRaw`DELETE FROM cipa_eleicao_configuracao WHERE tenant_id = ${tenantId}::uuid`; await tx.$executeRaw`DELETE FROM cipa_eleicao WHERE tenant_id = ${tenantId}::uuid`; await tx.$executeRaw`DELETE FROM rh_colaborador WHERE tenant_id = ${tenantId}::uuid`; }); await prisma.$disconnect();
}
