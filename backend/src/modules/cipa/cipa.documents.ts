import PDFDocument from "pdfkit";
import { AppError } from "../../shared/errors/app-error.js";
import { storageService } from "../arquivos/services/storage-instance.js";
import { prisma } from "../../database/prisma.js";
import { Prisma } from "@prisma/client";
import { createHash } from "node:crypto";

export type CipaDocumentoTipo = "EDITAL" | "COMUNICADO" | "RELACAO_CANDIDATOS" | "ZERESIMA" | "APURACAO" | "RESULTADO_OFICIAL" | "ATA_ELEICAO" | "ATA_POSSE";

function pdf(linhas: string[]) {
  return new Promise<Buffer>((resolve, reject) => {
    const documento = new PDFDocument({ size: "A4", margin: 48 }); const partes: Buffer[] = [];
    documento.on("data", (parte: Buffer) => partes.push(parte)); documento.on("end", () => resolve(Buffer.concat(partes))); documento.on("error", reject);
    documento.fontSize(16).text("G3N — Gestão de Eleições da CIPA", { align: "center" }).moveDown();
    linhas.forEach((linha) => documento.fontSize(linha.startsWith("#") ? 13 : 10).text(linha.replace(/^#\s?/u, ""), { paragraphGap: 5 }));
    documento.moveDown().fontSize(8).fillColor("#555").text("Processo estruturado para apoiar o atendimento aos requisitos aplicáveis da NR-5. A condução formal permanece sob responsabilidade da organização e da comissão eleitoral.");
    documento.end();
  });
}

export async function gerarDocumentoCipa(tenantId: string, eleicaoId: string, tipo: CipaDocumentoTipo, usuarioId: string) {
  const electionId = BigInt(eleicaoId); const election = (await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`SELECT id, nome, gestao, status, inscricoes_inicio, inscricoes_fim, votacao_inicio, votacao_fim FROM cipa_eleicao WHERE id = ${electionId} AND tenant_id = ${tenantId}::uuid LIMIT 1`))[0];
  if (!election) throw new AppError("Eleição não encontrada no ambiente atual.", 404);
  if (["APURACAO", "RESULTADO_OFICIAL", "ATA_ELEICAO", "ATA_POSSE"].includes(tipo) && !["APURACAO", "RESULTADO_PUBLICADO", "ENCERRADA"].includes(String(election.status))) throw new AppError("Este documento só pode ser emitido após o encerramento e a apuração do processo.", 409);
  if (tipo === "ZERESIMA" && !["ELEICAO_PRONTA", "VOTACAO_ABERTA", "VOTACAO_ENCERRADA", "APURACAO", "RESULTADO_PUBLICADO", "ENCERRADA"].includes(String(election.status))) throw new AppError("Gere a zerésima antes de emitir este documento.", 409);
  const linhas = [`# ${tipo.replaceAll("_", " ")}`, `Eleição: ${election.nome}`, `Gestão: ${election.gestao}`, `Situação: ${election.status}`, `Inscrições: ${String(election.inscricoes_inicio).slice(0, 10)} a ${String(election.inscricoes_fim).slice(0, 10)}`, `Votação: ${String(election.votacao_inicio).slice(0, 10)} a ${String(election.votacao_fim).slice(0, 10)}`];
  if (tipo === "RELACAO_CANDIDATOS") {
    const candidates = await prisma.$queryRaw<Array<{ numero: number; nome_publico: string; cargo_publico: string | null; setor_publico: string | null }>>(Prisma.sql`SELECT numero, nome_publico, cargo_publico, setor_publico FROM cipa_candidatura WHERE tenant_id = ${tenantId}::uuid AND eleicao_id = ${electionId} AND status = 'APROVADA' ORDER BY numero`);
    linhas.push("# Candidatos aprovados", ...candidates.map((candidate) => `${candidate.numero} — ${candidate.nome_publico}${candidate.cargo_publico ? ` — ${candidate.cargo_publico}` : ""}${candidate.setor_publico ? ` — ${candidate.setor_publico}` : ""}`));
  }
  if (tipo === "ZERESIMA") linhas.push("Urna sem votos antes da abertura: 0", "Documento emitido com integridade técnica registrada no banco.");
  if (tipo === "COMUNICADO") linhas.push("Divulgue este comunicado pelos canais oficiais da organização.", "Link do portal: disponibilizado na área Divulgação da Eleição.");
  if (["APURACAO", "RESULTADO_OFICIAL", "ATA_ELEICAO", "ATA_POSSE"].includes(tipo)) {
    const result = (await prisma.$queryRaw<Array<{ total_eleitores: number; total_votos: number; total_participantes: number; votos_validos: number; votos_brancos: number; votos_nulos: number; resultado_json: unknown; integridade_hash: string }>>(Prisma.sql`SELECT total_eleitores, total_votos, total_participantes, votos_validos, votos_brancos, votos_nulos, resultado_json, integridade_hash FROM cipa_eleicao_apuracao WHERE tenant_id = ${tenantId}::uuid AND eleicao_id = ${electionId} LIMIT 1`))[0];
    if (!result) throw new AppError("A apuração ainda não foi realizada.", 404);
    linhas.push(`# Totais`, `Eleitores aptos: ${result.total_eleitores}`, `Participantes: ${result.total_participantes}`, `Votos totais: ${result.total_votos}`, `Votos válidos: ${result.votos_validos}`, `Votos brancos: ${result.votos_brancos}`, `Votos nulos: ${result.votos_nulos}`, "# Classificação", ...((Array.isArray(result.resultado_json) ? result.resultado_json : []) as Array<Record<string, unknown>>).map((item) => `${item.classificacao} — ${item.numero} — ${item.nome} — ${item.votos} voto(s)`), `Integridade: ${result.integridade_hash}`);
  }
  if (tipo === "ATA_ELEICAO") linhas.push("Ata de eleição: registre os presentes e as deliberações da comissão eleitoral conforme o procedimento interno.");
  if (tipo === "ATA_POSSE") linhas.push("Ata de posse: registre a composição empossada e as assinaturas conforme o procedimento interno.");
  const buffer = await pdf(linhas); const nomeArquivo = `cipa-${tipo.toLowerCase()}-${eleicaoId}.pdf`; const arquivo = await storageService.salvarArquivo({ scope: "cipa_documento", conteudo: `data:application/pdf;base64,${buffer.toString("base64")}`, nomeOriginal: nomeArquivo, tenantId, entidadeId: electionId, entidadeTipo: "cipa_eleicao", usuarioUploadId: BigInt(usuarioId), observacao: `Documento ${tipo} da eleição ${eleicaoId}` });
  const checksum = createHash("sha256").update(buffer).digest("hex"); const versaoRows = await prisma.$queryRaw<Array<{ versao: number }>>(Prisma.sql`SELECT COALESCE(MAX(versao), 0) + 1 AS versao FROM cipa_eleicao_documento WHERE tenant_id = ${tenantId}::uuid AND eleicao_id = ${electionId} AND tipo = ${tipo}`); const versao = Number(versaoRows[0]?.versao ?? 1);
  const categoria = tipo === "EDITAL" || tipo === "COMUNICADO" ? "CONVOCACAO" : tipo === "RELACAO_CANDIDATOS" ? "CANDIDATURAS" : tipo === "RESULTADO_OFICIAL" || tipo === "APURACAO" ? "RESULTADO" : tipo === "ATA_POSSE" ? "POSSE" : "ELEICAO";
  const rows = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`INSERT INTO cipa_eleicao_documento (tenant_id, eleicao_id, categoria, tipo, versao, nome_arquivo, content_type, tamanho_bytes, checksum, caminho_logico, usuario_id) VALUES (${tenantId}::uuid, ${electionId}, ${categoria}, ${tipo}, ${versao}, ${nomeArquivo}, 'application/pdf', ${buffer.length}, ${checksum}, ${arquivo.caminhoArquivo}, ${BigInt(usuarioId)}) RETURNING id`);
  await prisma.$executeRaw(Prisma.sql`INSERT INTO cipa_eleicao_auditoria (tenant_id, eleicao_id, usuario_id, acao, detalhes) VALUES (${tenantId}::uuid, ${electionId}, ${BigInt(usuarioId)}, 'DOCUMENTO_GERADO', ${JSON.stringify({ documentoId: String(rows[0].id), tipo, versao, checksum })}::jsonb)`);
  return { id: String(rows[0].id), tipo, versao, nomeArquivo, contentType: "application/pdf", tamanhoBytes: buffer.length, checksum, caminhoLogico: arquivo.caminhoArquivo };
}

export async function listarDocumentosCipa(tenantId: string, eleicaoId: string) {
  const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`SELECT id, categoria, tipo, versao, nome_arquivo, content_type, tamanho_bytes, checksum, caminho_logico, usuario_id, criado_em FROM cipa_eleicao_documento WHERE tenant_id = ${tenantId}::uuid AND eleicao_id = ${BigInt(eleicaoId)} ORDER BY criado_em DESC`);
  return rows.map((row) => ({ id: String(row.id), categoria: row.categoria, tipo: row.tipo, versao: Number(row.versao), nomeArquivo: row.nome_arquivo, contentType: row.content_type, tamanhoBytes: Number(row.tamanho_bytes), checksum: row.checksum, caminhoLogico: row.caminho_logico, usuarioId: row.usuario_id ? String(row.usuario_id) : undefined, criadoEm: row.criado_em }));
}

export async function obterConteudoDocumentoCipa(tenantId: string, eleicaoId: string, documentoId: string, usuarioId: string) {
  const rows = await prisma.$queryRaw<Array<{ caminho_logico: string; nome_arquivo: string; content_type: string }>>(Prisma.sql`SELECT caminho_logico, nome_arquivo, content_type FROM cipa_eleicao_documento WHERE id = ${BigInt(documentoId)} AND tenant_id = ${tenantId}::uuid AND eleicao_id = ${BigInt(eleicaoId)} LIMIT 1`);
  const row = rows[0]; if (!row) throw new AppError("Documento não encontrado no ambiente atual.", 404);
  return storageService.obterConteudoPorCaminho(row.caminho_logico, BigInt(usuarioId), tenantId);
}
