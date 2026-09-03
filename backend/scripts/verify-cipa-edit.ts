import { randomUUID } from "node:crypto";
import { loadBackendEnvFiles, normalizeRuntimeEnv } from "../src/config/env-runtime.js";
import { prisma } from "../src/database/prisma.js";
import { CipaRepository } from "../src/modules/cipa/repositories/cipa.repository.js";
import { AppError } from "../src/shared/errors/app-error.js";

loadBackendEnvFiles(); Object.assign(process.env, normalizeRuntimeEnv(process.env));
const repository = new CipaRepository();
const identificador = `cipa-edit-${randomUUID()}`;
let electionId = 0n;

try {
  const unidades = await prisma.$queryRaw<Array<{ id: bigint; tenant_id: string }>>`SELECT id, tenant_id FROM unidade_assistencial WHERE tenant_id IS NOT NULL LIMIT 1`;
  if (!unidades[0]) throw new Error("Não há unidade de homologação com tenant disponível para testar edição.");
  const tenantId = unidades[0].tenant_id;
  const elections = await prisma.$queryRaw<Array<{ id: bigint }>>`INSERT INTO cipa_eleicao (tenant_id, instituicao_id, unidade_id, identificador_publico, nome, gestao, status, inscricoes_inicio, inscricoes_fim, votacao_inicio, votacao_fim) VALUES (${tenantId}::uuid, ${randomUUID()}::uuid, ${unidades[0].id}, ${identificador}, 'Eleição antes da edição', 'TESTE', 'CONFIGURACAO', CURRENT_DATE, CURRENT_DATE + 15, CURRENT_DATE + 16, CURRENT_DATE + 17) RETURNING id`;
  electionId = elections[0].id;
  await prisma.$executeRaw`INSERT INTO cipa_eleicao_configuracao (tenant_id, eleicao_id) VALUES (${tenantId}::uuid, ${electionId})`;
  const atualizada = await repository.editarEleicao(tenantId, String(electionId), { unidadeId: String(unidades[0].id), nome: 'Eleição editada com auditoria', gestao: 'TESTE-EDITADO', inscricoesInicio: new Date(Date.now() + 86_400_000).toISOString(), inscricoesFim: new Date(Date.now() + 16 * 86_400_000).toISOString(), votacaoInicio: new Date(Date.now() + 17 * 86_400_000).toISOString(), votacaoFim: new Date(Date.now() + 18 * 86_400_000).toISOString(), titulares: 2, suplentes: 1, votosPorEleitor: 1, permiteVotoBranco: true, permiteVotoNulo: true, permiteVotacaoCelular: true, permiteVotacaoPresencial: false, regraDesempate: 'TEMPO_SERVICO_ESTABELECIMENTO' }, '1');
  if (atualizada?.nome !== 'Eleição editada com auditoria' || atualizada.configuracao?.titulares !== 2) throw new Error('A edição não retornou a configuração persistida.');
  await repository.alterarStatusEleicao(tenantId, String(electionId), 'CONFIGURACAO', 'INSCRICOES_ABERTAS', '1');
  let bloqueada = false;
  try { await repository.editarEleicao(tenantId, String(electionId), { unidadeId: String(unidades[0].id), nome: 'Edição indevida', gestao: 'TESTE', inscricoesInicio: new Date(Date.now() + 86_400_000).toISOString(), inscricoesFim: new Date(Date.now() + 16 * 86_400_000).toISOString(), votacaoInicio: new Date(Date.now() + 17 * 86_400_000).toISOString(), votacaoFim: new Date(Date.now() + 18 * 86_400_000).toISOString(), titulares: 1, suplentes: 1, votosPorEleitor: 1, permiteVotoBranco: true, permiteVotoNulo: true, permiteVotacaoCelular: true, permiteVotacaoPresencial: false, regraDesempate: 'TEMPO_SERVICO_ESTABELECIMENTO' }, '1'); } catch (error) { bloqueada = error instanceof AppError && error.statusCode === 409; }
  const auditoria = await prisma.$queryRaw<Array<{ total: bigint }>>`SELECT COUNT(*)::bigint total FROM cipa_eleicao_auditoria WHERE tenant_id = ${tenantId}::uuid AND eleicao_id = ${electionId} AND acao = 'ELEICAO_EDITADA'`;
  if (!bloqueada || Number(auditoria[0]?.total ?? 0) !== 1) throw new Error('A edição fora da configuração não foi bloqueada ou auditada corretamente.');
  console.log(JSON.stringify({ edicaoPersistida: true, auditoriaRegistrada: true, edicaoAposAberturaBloqueada: true, removidoAoFinal: true }, null, 2));
} finally {
  if (electionId) {
    const tenant = await prisma.$queryRaw<Array<{ tenant_id: string }>>`SELECT tenant_id FROM cipa_eleicao WHERE id = ${electionId} LIMIT 1`;
    if (tenant[0]) await prisma.$transaction(async (tx) => { await tx.$executeRaw`DELETE FROM cipa_eleicao_auditoria WHERE tenant_id = ${tenant[0].tenant_id}::uuid AND eleicao_id = ${electionId}`; await tx.$executeRaw`DELETE FROM cipa_eleicao_configuracao WHERE tenant_id = ${tenant[0].tenant_id}::uuid AND eleicao_id = ${electionId}`; await tx.$executeRaw`DELETE FROM cipa_eleicao WHERE tenant_id = ${tenant[0].tenant_id}::uuid AND id = ${electionId}`; });
  }
  await prisma.$disconnect();
}
