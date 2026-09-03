import { randomUUID } from "node:crypto";
import { loadBackendEnvFiles, normalizeRuntimeEnv } from "../src/config/env-runtime.js";
import { prisma } from "../src/database/prisma.js";
import { CipaRepository } from "../src/modules/cipa/repositories/cipa.repository.js";

loadBackendEnvFiles(); Object.assign(process.env, normalizeRuntimeEnv(process.env));
const tenantId = randomUUID(); const identificador = `cipa-tie-${tenantId}`; const repository = new CipaRepository(); let electionId = 0n;
try {
  const election = await prisma.$queryRaw<Array<{ id: bigint }>>`INSERT INTO cipa_eleicao (tenant_id, instituicao_id, unidade_id, identificador_publico, nome, gestao, status) VALUES (${tenantId}::uuid, ${randomUUID()}::uuid, 1, ${identificador}, 'Teste de desempate CIPA', 'TESTE', 'VOTACAO_ENCERRADA') RETURNING id`;
  electionId = election[0].id;
  await prisma.$executeRaw`INSERT INTO cipa_eleicao_configuracao (tenant_id, eleicao_id, titulares, suplentes, regra_desempate) VALUES (${tenantId}::uuid, ${electionId}, 1, 1, 'SORTEIO_AUDITADO')`;
  const colaboradores: bigint[] = [];
  for (let index = 1; index <= 2; index += 1) {
    const row = await prisma.$queryRaw<Array<{ id: bigint }>>`INSERT INTO rh_colaborador (tenant_id, instituicao_id, unidade_id, matricula, nome_completo, cpf, data_nascimento, data_admissao, status) VALUES (${tenantId}::uuid, ${randomUUID()}::uuid, 1, ${`TIE-${index}`}, ${`Candidato empate ${index}`}, ${String(52998224720 + index)}, DATE '1980-01-01' + ${index}::int, DATE '2010-01-01', 'ATIVO') RETURNING id`;
    colaboradores.push(row[0].id);
    const voter = await prisma.$queryRaw<Array<{ id: bigint }>>`INSERT INTO cipa_eleitor_eleicao (tenant_id, eleicao_id, colaborador_id, matricula, nome_completo, cpf, data_nascimento, unidade_id, data_admissao) VALUES (${tenantId}::uuid, ${electionId}, ${row[0].id}, ${`TIE-${index}`}, ${`Candidato empate ${index}`}, ${String(52998224720 + index)}, DATE '1980-01-01' + ${index}::int, 1, DATE '2010-01-01') RETURNING id`;
    await prisma.$executeRaw`INSERT INTO cipa_participacao (tenant_id, eleicao_id, eleitor_id, protocolo, status, votado_em) VALUES (${tenantId}::uuid, ${electionId}, ${voter[0].id}, ${`TIE-V-${index}`}, 'REGISTRADA', NOW())`;
  }
  for (let index = 1; index <= 2; index += 1) await prisma.$executeRaw`INSERT INTO cipa_candidatura (tenant_id, eleicao_id, colaborador_id, numero, nome_publico, status, protocolo, data_admissao_estabelecimento) VALUES (${tenantId}::uuid, ${electionId}, ${colaboradores[index - 1]}, ${index}, ${`Candidato empate ${index}`}, 'APROVADA', ${`TIE-P-${index}`}, DATE '2010-01-01')`;
  const candidates = await prisma.$queryRaw<Array<{ id: bigint }>>`SELECT id FROM cipa_candidatura WHERE tenant_id = ${tenantId}::uuid AND eleicao_id = ${electionId} ORDER BY numero`;
  for (const candidate of candidates) await prisma.$executeRaw`INSERT INTO cipa_voto (tenant_id, eleicao_id, candidatura_id, tipo) VALUES (${tenantId}::uuid, ${electionId}, ${candidate.id}, 'VALIDO')`;
  let bloqueou = false; try { await repository.apurar(tenantId, String(electionId), '1'); } catch (error) { bloqueou = error instanceof Error && error.message.includes('empate'); }
  if (!bloqueou) throw new Error('A apuração deveria bloquear o empate sem registro.');
  await repository.registrarDesempate(tenantId, String(electionId), candidates.map((candidate, index) => ({ candidaturaId: String(candidate.id), ordem: index + 1, criterio: 'SORTEIO_AUDITADO', justificativa: 'Ata de sorteio auditado da comissão eleitoral.' })), '1');
  const apuracao = await repository.apurar(tenantId, String(electionId), '1');
  console.log(JSON.stringify({ bloqueioSemDesempate: bloqueou, desempateRegistrado: true, apuracaoLiberada: apuracao.resultados.length === 2, removidoAoFinal: true }, null, 2));
} finally {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`DELETE FROM cipa_eleicao_auditoria WHERE tenant_id = ${tenantId}::uuid`;
    await tx.$executeRaw`DELETE FROM cipa_eleicao_desempate WHERE tenant_id = ${tenantId}::uuid`;
    await tx.$executeRaw`DELETE FROM cipa_eleicao_apuracao WHERE tenant_id = ${tenantId}::uuid`;
    await tx.$executeRaw`DELETE FROM cipa_voto WHERE tenant_id = ${tenantId}::uuid`;
    await tx.$executeRaw`DELETE FROM cipa_participacao WHERE tenant_id = ${tenantId}::uuid`;
    await tx.$executeRaw`DELETE FROM cipa_candidatura WHERE tenant_id = ${tenantId}::uuid`;
    await tx.$executeRaw`DELETE FROM cipa_eleitor_eleicao WHERE tenant_id = ${tenantId}::uuid`;
    await tx.$executeRaw`DELETE FROM cipa_eleicao_configuracao WHERE tenant_id = ${tenantId}::uuid`;
    await tx.$executeRaw`DELETE FROM cipa_eleicao WHERE tenant_id = ${tenantId}::uuid`;
    await tx.$executeRaw`DELETE FROM rh_colaborador WHERE tenant_id = ${tenantId}::uuid`;
  }); await prisma.$disconnect();
}
