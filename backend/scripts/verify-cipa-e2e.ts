import { randomUUID } from "node:crypto";
import { loadBackendEnvFiles, normalizeRuntimeEnv } from "../src/config/env-runtime.js";
import { prisma } from "../src/database/prisma.js";
import { CipaRepository } from "../src/modules/cipa/repositories/cipa.repository.js";
import { gerarDocumentoCipa, listarDocumentosCipa } from "../src/modules/cipa/cipa.documents.js";
import { gerarRelatorioCipa } from "../src/modules/cipa/cipa.reports.js";
import { storageService } from "../src/modules/arquivos/services/storage-instance.js";
import { AppError } from "../src/shared/errors/app-error.js";

loadBackendEnvFiles(); Object.assign(process.env, normalizeRuntimeEnv(process.env));

const tenantId = randomUUID();
const identificador = `cipa-e2e-${tenantId}`;
const repository = new CipaRepository();
let electionId = 0n;
const documentosTemporarios: string[] = [];

try {
  const elections = await prisma.$queryRaw<Array<{ id: bigint }>>`INSERT INTO cipa_eleicao (tenant_id, instituicao_id, unidade_id, identificador_publico, nome, gestao, status, inscricoes_inicio, inscricoes_fim, votacao_inicio, votacao_fim) VALUES (${tenantId}::uuid, ${randomUUID()}::uuid, 1, ${identificador}, 'Homologação Eleição CIPA', '2026/2027', 'INSCRICOES_ENCERRADAS', NOW() - INTERVAL '20 days', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', NOW() + INTERVAL '1 day') RETURNING id`;
  electionId = elections[0].id;
  await prisma.$executeRaw`INSERT INTO cipa_eleicao_configuracao (tenant_id, eleicao_id, titulares, suplentes, votos_por_eleitor, permite_voto_branco, permite_voto_nulo, regra_desempate) VALUES (${tenantId}::uuid, ${electionId}, 3, 2, 2, TRUE, TRUE, 'TEMPO_SERVICO_ESTABELECIMENTO')`;

  const colaboradores: bigint[] = [];
  for (let index = 1; index <= 20; index += 1) {
    const rows = await prisma.$queryRaw<Array<{ id: bigint }>>`INSERT INTO rh_colaborador (tenant_id, instituicao_id, unidade_id, matricula, nome_completo, cpf, data_nascimento, cargo, setor, turno, data_admissao, status) VALUES (${tenantId}::uuid, ${randomUUID()}::uuid, 1, ${`E2E-${index}`}, ${`Colaborador de homologação ${index}`}, ${String(10000000000 + index)}, DATE '1980-01-01' + ${index}::int, 'Colaborador', 'Setor de homologação', 'Diurno', DATE '2010-01-01' + ${index}::int, 'ATIVO') RETURNING id`;
    colaboradores.push(rows[0].id);
    await prisma.$executeRaw`INSERT INTO cipa_eleitor_eleicao (tenant_id, eleicao_id, colaborador_id, matricula, nome_completo, cpf, data_nascimento, unidade_id, setor, turno, data_admissao) VALUES (${tenantId}::uuid, ${electionId}, ${rows[0].id}, ${`E2E-${index}`}, ${`Colaborador de homologação ${index}`}, ${String(10000000000 + index)}, DATE '1980-01-01' + ${index}::int, 1, 'Setor de homologação', 'Diurno', DATE '2010-01-01' + ${index}::int)`;
  }

  for (let index = 1; index <= 8; index += 1) {
    await prisma.$executeRaw`INSERT INTO cipa_candidatura (tenant_id, eleicao_id, colaborador_id, numero, nome_publico, cargo_publico, setor_publico, unidade_publico, apresentacao, proposta, status, protocolo, declaracao_ciencia_em, data_admissao_estabelecimento) VALUES (${tenantId}::uuid, ${electionId}, ${colaboradores[index - 1]}, ${index}, ${`Candidato de homologação ${index}`}, 'Colaborador', 'Setor de homologação', 'Estabelecimento de homologação', 'Apresentação de teste descartável', 'Proposta de teste descartável', 'APROVADA', ${`E2E-P-${index}`}, NOW(), DATE '2010-01-01' + ${index}::int)`;
  }
  await prisma.$executeRaw`INSERT INTO cipa_comissao_eleitoral_membro (tenant_id, eleicao_id, nome, funcao) VALUES (${tenantId}::uuid, ${electionId}, 'Comissão de homologação', 'Responsável pelo teste')`;

  const portalAntesDaPublicacao = await repository.obterPortalPublico(identificador);
  if (portalAntesDaPublicacao.candidatos.length !== 0) throw new Error("Candidatos foram expostos antes da publicação da eleição.");
  await repository.publicarEleicao(tenantId, String(electionId), "1");
  let candidaturasCongeladas = false;
  try { await repository.alterarStatusCandidatura(tenantId, String(electionId), "1", "REPROVADA", "tentativa de alteração após publicação", "1"); } catch (error) { candidaturasCongeladas = error instanceof AppError && error.statusCode === 409; }
  if (!candidaturasCongeladas) throw new Error("A alteração de candidatura deveria ser bloqueada após a publicação.");
  const portalPublico = await repository.obterPortalPublico(identificador);
  if (portalPublico.candidatos.length !== 8 || "tenantId" in portalPublico.eleicao || portalPublico.eleicao.nome !== "Homologação Eleição CIPA") throw new Error("O portal público não retornou somente os dados de divulgação esperados.");
  await repository.gerarZeresima(tenantId, String(electionId), "1");
  await repository.abrirVotacao(tenantId, String(electionId), "1");

  const candidatos = await prisma.$queryRaw<Array<{ id: bigint; numero: number }>>`SELECT id, numero FROM cipa_candidatura WHERE tenant_id = ${tenantId}::uuid AND eleicao_id = ${electionId} ORDER BY numero`;
  for (let index = 0; index < colaboradores.length; index += 1) {
    const tipo = index >= 18 ? "BRANCO" : "VALIDO";
    const candidaturaId = tipo === "VALIDO" ? candidatos[index % candidatos.length].id : null;
    const candidaturaIds = index === 0 ? [String(candidatos[0].id), String(candidatos[1].id)] : candidaturaId === null ? undefined : String(candidaturaId);
    const acesso = await repository.autenticarPortal(identificador, String(10000000000 + index + 1), `1980-01-${String(index + 2).padStart(2, "0")}`, "VOTACAO");
    await repository.obterUrna(acesso.token, identificador);
    await repository.registrarVoto(acesso.token, identificador, tipo, candidaturaIds);
  }

  const dashboard = await repository.obterDashboard(tenantId, String(electionId));
  if (dashboard.eleitores.votosRealizados !== 20 || dashboard.participacao.porUnidade.length !== 1 || dashboard.participacao.porSetor.length !== 1 || dashboard.participacao.porTurno.length !== 1) throw new Error("Os recortes de participação do dashboard não conferem.");
  const relatorios = ["ELEITORES_APTOS", "ELEITORES_VOTARAM", "ELEITORES_PENDENTES", "CANDIDATOS", "PARTICIPACAO"] as const;
  const relatoriosGerados = await Promise.all(relatorios.map((tipo) => gerarRelatorioCipa(tenantId, String(electionId), tipo)));
  if (relatoriosGerados.some((relatorio) => !relatorio.content.includes("Eleição") || relatorio.content.includes("10000000001") || !relatorio.contentType.startsWith("text/csv"))) throw new Error("Relatório sem dados esperados ou com CPF completo.");
  await repository.encerrarVotacao(tenantId, String(electionId), "1");
  const apuracao = await repository.apurar(tenantId, String(electionId), "1");
  await repository.publicarResultado(tenantId, String(electionId), "1");
  for (const tipo of ["COMUNICADO", "ATA_ELEICAO", "ATA_POSSE"] as const) documentosTemporarios.push((await gerarDocumentoCipa(tenantId, String(electionId), tipo, "1")).caminhoLogico);
  const documentos = await listarDocumentosCipa(tenantId, String(electionId));
  if (documentos.length !== 3 || documentos.some((documento) => documento.versao !== 1 || !documento.checksum)) throw new Error("Os documentos formais não foram persistidos com versão e checksum.");
  if (apuracao.totalEleitores !== 20 || apuracao.totalParticipantes !== 20 || apuracao.totalVotos !== 21 || apuracao.votosBrancos !== 2) throw new Error("As totalizações da homologação não conferem.");
  console.log(JSON.stringify({ eleitores: apuracao.totalEleitores, candidatos: candidatos.length, portalAntesDaPublicacao: portalAntesDaPublicacao.candidatos.length, portalPublicoCandidatos: portalPublico.candidatos.length, candidaturasCongeladas, participantes: apuracao.totalParticipantes, votos: apuracao.totalVotos, brancos: apuracao.votosBrancos, gruposParticipacao: { unidades: dashboard.participacao.porUnidade.length, setores: dashboard.participacao.porSetor.length, turnos: dashboard.participacao.porTurno.length }, relatorios: relatoriosGerados.length, documentosFormais: documentos.length, statusFinal: "RESULTADO_PUBLICADO", removidoAoFinal: true }, null, 2));
} finally {
  if (documentosTemporarios.length) await storageService.rollbackArquivos(documentosTemporarios, tenantId);
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`DELETE FROM cipa_eleicao_auditoria WHERE tenant_id = ${tenantId}::uuid`;
    await tx.$executeRaw`DELETE FROM cipa_eleicao_documento WHERE tenant_id = ${tenantId}::uuid`;
    await tx.$executeRaw`DELETE FROM cipa_eleicao_apuracao WHERE tenant_id = ${tenantId}::uuid`;
    await tx.$executeRaw`DELETE FROM cipa_eleicao_zeresima WHERE tenant_id = ${tenantId}::uuid`;
    await tx.$executeRaw`DELETE FROM cipa_voto WHERE tenant_id = ${tenantId}::uuid`;
    await tx.$executeRaw`DELETE FROM cipa_participacao WHERE tenant_id = ${tenantId}::uuid`;
    await tx.$executeRaw`DELETE FROM cipa_portal_sessao WHERE tenant_id = ${tenantId}::uuid`;
    await tx.$executeRaw`DELETE FROM cipa_candidatura WHERE tenant_id = ${tenantId}::uuid`;
    await tx.$executeRaw`DELETE FROM cipa_comissao_eleitoral_membro WHERE tenant_id = ${tenantId}::uuid`;
    await tx.$executeRaw`DELETE FROM cipa_eleitor_eleicao WHERE tenant_id = ${tenantId}::uuid`;
    await tx.$executeRaw`DELETE FROM cipa_eleicao_configuracao WHERE tenant_id = ${tenantId}::uuid`;
    await tx.$executeRaw`DELETE FROM cipa_eleicao WHERE tenant_id = ${tenantId}::uuid`;
    await tx.$executeRaw`DELETE FROM rh_colaborador WHERE tenant_id = ${tenantId}::uuid`;
  });
  await prisma.$disconnect();
}
