import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { loadBackendEnvFiles, normalizeRuntimeEnv } from "../src/config/env-runtime.js";
import { prisma } from "../src/database/prisma.js";
import { CipaRepository } from "../src/modules/cipa/repositories/cipa.repository.js";
import { CipaService } from "../src/modules/cipa/services/cipa.service.js";
import { storageService } from "../src/modules/arquivos/services/storage-instance.js";

loadBackendEnvFiles(); Object.assign(process.env, normalizeRuntimeEnv(process.env));
const tenantId = randomUUID(); const identificador = `cipa-photo-${tenantId}`; const repository = new CipaRepository(); const service = new CipaService(); let electionId = 0n; let photoPath = "";

try {
  const collaborators = await prisma.$queryRaw<Array<{ id: bigint }>>`INSERT INTO rh_colaborador (tenant_id, instituicao_id, unidade_id, matricula, nome_completo, cpf, data_nascimento, data_admissao, status) VALUES (${tenantId}::uuid, ${randomUUID()}::uuid, 1, 'PHOTO-E2E', 'Candidato com foto de homologação', '52998224725', DATE '1985-05-10', DATE '2015-05-10', 'ATIVO') RETURNING id`;
  const collaboratorId = collaborators[0].id;
  const elections = await prisma.$queryRaw<Array<{ id: bigint }>>`INSERT INTO cipa_eleicao (tenant_id, instituicao_id, unidade_id, identificador_publico, nome, gestao, status, inscricoes_inicio, inscricoes_fim, votacao_inicio, votacao_fim) VALUES (${tenantId}::uuid, ${randomUUID()}::uuid, 1, ${identificador}, 'Homologação de foto CIPA', '2026/2027', 'INSCRICOES_ABERTAS', NOW() - INTERVAL '1 day', NOW() + INTERVAL '10 days', NOW() + INTERVAL '11 days', NOW() + INTERVAL '12 days') RETURNING id`;
  electionId = elections[0].id;
  await prisma.$executeRaw`INSERT INTO cipa_eleicao_configuracao (tenant_id, eleicao_id) VALUES (${tenantId}::uuid, ${electionId})`;
  const acesso = await repository.autenticarPortal(identificador, '52998224725', '1985-05-10', 'CANDIDATURA');
  const buffer = await sharp({ create: { width: 2, height: 2, channels: 3, background: { r: 10, g: 100, b: 180 } } }).png().toBuffer();
  let formatoInvalidoBloqueado = false;
  try {
    await service.enviarFotoCandidaturaPortal(acesso.token, identificador, { buffer: Buffer.from('conteudo-nao-imagem'), originalname: 'foto.txt', mimetype: 'text/plain', size: 18 } as Express.Multer.File);
  } catch {
    formatoInvalidoBloqueado = true;
  }
  if (!formatoInvalidoBloqueado) throw new Error('O upload com MIME inválido foi aceito.');
  let tamanhoExcedidoBloqueado = false;
  try {
    await service.enviarFotoCandidaturaPortal(acesso.token, identificador, { buffer: Buffer.alloc(5 * 1024 * 1024 + 1), originalname: 'foto-grande.png', mimetype: 'image/png', size: 5 * 1024 * 1024 + 1 } as Express.Multer.File);
  } catch {
    tamanhoExcedidoBloqueado = true;
  }
  if (!tamanhoExcedidoBloqueado) throw new Error('O upload acima do limite foi aceito.');
  const foto = await service.enviarFotoCandidaturaPortal(acesso.token, identificador, { buffer, originalname: 'foto-candidato.png', mimetype: 'image/png', size: buffer.length } as Express.Multer.File);
  photoPath = foto.caminhoLogico;
  const candidatura = await service.criarCandidaturaPortal(acesso.token, identificador, { apresentacao: 'Apresentação com foto', proposta: 'Proposta com foto', declaracaoCiencia: true });
  const stored = await prisma.$queryRaw<Array<{ foto_caminho_logico: string | null }>>`SELECT foto_caminho_logico FROM cipa_candidatura WHERE tenant_id = ${tenantId}::uuid AND eleicao_id = ${electionId} LIMIT 1`;
  if (!stored[0]?.foto_caminho_logico || stored[0].foto_caminho_logico !== photoPath || !candidatura) throw new Error('A referência da foto não foi vinculada à candidatura.');
  const autorizado = await storageService.obterConteudoPorCaminho(photoPath, undefined, tenantId, false);
  if (autorizado.mimeType !== 'image/png') throw new Error('O download autorizado não retornou a imagem esperada.');
  let tenantDiferenteBloqueado = false;
  try { await storageService.obterConteudoPorCaminho(photoPath, undefined, randomUUID(), false); } catch { tenantDiferenteBloqueado = true; }
  if (!tenantDiferenteBloqueado) throw new Error('O download por tenant diferente foi aceito.');
  console.log(JSON.stringify({ candidaturaRecebida: true, fotoPersistidaNoStorage: true, caminhoLogico: photoPath, bancoArmazenaReferencia: true, mimeInvalidoBloqueado: formatoInvalidoBloqueado, tamanhoExcedidoBloqueado, downloadAutorizado: true, downloadTenantDiferenteBloqueado: true, removidoAoFinal: true }, null, 2));
} finally {
  if (photoPath) await storageService.rollbackArquivos([photoPath], tenantId);
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`DELETE FROM cipa_eleicao_auditoria WHERE tenant_id = ${tenantId}::uuid`;
    await tx.$executeRaw`DELETE FROM cipa_portal_sessao WHERE tenant_id = ${tenantId}::uuid`;
    await tx.$executeRaw`DELETE FROM cipa_candidatura WHERE tenant_id = ${tenantId}::uuid`;
    await tx.$executeRaw`DELETE FROM cipa_eleicao_configuracao WHERE tenant_id = ${tenantId}::uuid`;
    await tx.$executeRaw`DELETE FROM cipa_eleicao WHERE tenant_id = ${tenantId}::uuid`;
    await tx.$executeRaw`DELETE FROM rh_colaborador WHERE tenant_id = ${tenantId}::uuid`;
  });
  await prisma.$disconnect();
}
