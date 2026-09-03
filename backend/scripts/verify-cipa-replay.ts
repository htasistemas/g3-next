import { randomUUID } from "node:crypto";
import { loadBackendEnvFiles, normalizeRuntimeEnv } from "../src/config/env-runtime.js";
import { prisma } from "../src/database/prisma.js";
import { CipaRepository } from "../src/modules/cipa/repositories/cipa.repository.js";

loadBackendEnvFiles(); Object.assign(process.env, normalizeRuntimeEnv(process.env));
const tenantId = randomUUID(); const identificador = `cipa-replay-${tenantId}`; const repository = new CipaRepository(); let electionId = 0n;
try {
  const collaborator = await prisma.$queryRaw<Array<{ id: bigint }>>`INSERT INTO rh_colaborador (tenant_id, instituicao_id, unidade_id, matricula, nome_completo, cpf, data_nascimento, data_admissao, status) VALUES (${tenantId}::uuid, ${randomUUID()}::uuid, 1, 'REPLAY-1', 'Eleitor de replay', '52998224725', DATE '1980-01-01', DATE '2010-01-01', 'ATIVO') RETURNING id`;
  const election = await prisma.$queryRaw<Array<{ id: bigint }>>`INSERT INTO cipa_eleicao (tenant_id, instituicao_id, unidade_id, identificador_publico, nome, gestao, status, votacao_inicio, votacao_fim) VALUES (${tenantId}::uuid, ${randomUUID()}::uuid, 1, ${identificador}, 'Teste de replay CIPA', 'TESTE', 'VOTACAO_ABERTA', NOW() - INTERVAL '1 day', NOW() + INTERVAL '1 day') RETURNING id`;
  electionId = election[0].id;
  await prisma.$executeRaw`INSERT INTO cipa_eleicao_configuracao (tenant_id, eleicao_id) VALUES (${tenantId}::uuid, ${electionId})`;
  const voter = await prisma.$queryRaw<Array<{ id: bigint }>>`INSERT INTO cipa_eleitor_eleicao (tenant_id, eleicao_id, colaborador_id, matricula, nome_completo, cpf, data_nascimento, unidade_id, data_admissao) VALUES (${tenantId}::uuid, ${electionId}, ${collaborator[0].id}, 'REPLAY-1', 'Eleitor de replay', '52998224725', DATE '1980-01-01', 1, DATE '2010-01-01') RETURNING id`;
  const candidate = await prisma.$queryRaw<Array<{ id: bigint }>>`INSERT INTO cipa_candidatura (tenant_id, eleicao_id, colaborador_id, numero, nome_publico, status, protocolo, data_admissao_estabelecimento) VALUES (${tenantId}::uuid, ${electionId}, ${collaborator[0].id}, 1, 'Candidato de replay', 'APROVADA', 'REPLAY-C-1', DATE '2010-01-01') RETURNING id`;
  const acesso = await repository.autenticarPortal(identificador, '52998224725', '1980-01-01', 'VOTACAO');
  await repository.obterUrna(acesso.token, identificador);
  await repository.registrarVoto(acesso.token, identificador, 'VALIDO', String(candidate[0].id));
  await prisma.$disconnect();
  await prisma.$connect();
  const repositoryAposReconexao = new CipaRepository();
  let bloqueouReplay = false; try { await repositoryAposReconexao.registrarVoto(acesso.token, identificador, 'VALIDO', String(candidate[0].id)); } catch (error) { bloqueouReplay = error instanceof Error && /expirou|registrado/u.test(error.message); }
  const contagens = await prisma.$queryRaw<Array<{ participacoes: bigint; votos: bigint }>>`SELECT (SELECT COUNT(*) FROM cipa_participacao WHERE tenant_id = ${tenantId}::uuid AND eleicao_id = ${electionId}) participacoes, (SELECT COUNT(*) FROM cipa_voto WHERE tenant_id = ${tenantId}::uuid AND eleicao_id = ${electionId}) votos`;
  if (!bloqueouReplay || Number(contagens[0].participacoes) !== 1 || Number(contagens[0].votos) !== 1) throw new Error('O replay alterou a quantidade de participações ou votos.');
  console.log(JSON.stringify({ primeiroVotoRegistrado: true, reconexaoSimulada: true, replayBloqueado: bloqueouReplay, participacoes: Number(contagens[0].participacoes), votos: Number(contagens[0].votos), eleitorIdApenasNoRegistroDeParticipacao: !!voter[0], removidoAoFinal: true }, null, 2));
} finally {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`DELETE FROM cipa_eleicao_auditoria WHERE tenant_id = ${tenantId}::uuid`;
    await tx.$executeRaw`DELETE FROM cipa_voto WHERE tenant_id = ${tenantId}::uuid`;
    await tx.$executeRaw`DELETE FROM cipa_participacao WHERE tenant_id = ${tenantId}::uuid`;
    await tx.$executeRaw`DELETE FROM cipa_portal_sessao WHERE tenant_id = ${tenantId}::uuid`;
    await tx.$executeRaw`DELETE FROM cipa_candidatura WHERE tenant_id = ${tenantId}::uuid`;
    await tx.$executeRaw`DELETE FROM cipa_eleitor_eleicao WHERE tenant_id = ${tenantId}::uuid`;
    await tx.$executeRaw`DELETE FROM cipa_eleicao_configuracao WHERE tenant_id = ${tenantId}::uuid`;
    await tx.$executeRaw`DELETE FROM cipa_eleicao WHERE tenant_id = ${tenantId}::uuid`;
    await tx.$executeRaw`DELETE FROM rh_colaborador WHERE tenant_id = ${tenantId}::uuid`;
  }); await prisma.$disconnect();
}
