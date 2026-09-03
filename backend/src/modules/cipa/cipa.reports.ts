import { Prisma } from "@prisma/client";
import { prisma } from "../../database/prisma.js";
import { AppError } from "../../shared/errors/app-error.js";

export type CipaRelatorioTipo = "ELEITORES_APTOS" | "ELEITORES_VOTARAM" | "ELEITORES_PENDENTES" | "CANDIDATOS" | "PARTICIPACAO" | "APURACAO" | "RESULTADO_FINAL" | "AUDITORIA" | "HISTORICO";

function escapar(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function csv(cabecalho: string[], linhas: unknown[][]) {
  return `\uFEFF${[cabecalho, ...linhas].map((linha) => linha.map(escapar).join(";")).join("\r\n")}\r\n`;
}

function mascararCpf(cpf: unknown) {
  const valor = String(cpf ?? "").replace(/\D/gu, "");
  return valor.length === 11 ? `***.***.***-${valor.slice(-2)}` : "***";
}

export async function gerarRelatorioCipa(tenantId: string, eleicaoId: string, tipo: CipaRelatorioTipo) {
  if (!/^\d+$/u.test(eleicaoId)) throw new AppError("Identificador de eleição inválido.", 400);
  const electionId = BigInt(eleicaoId);
  const election = (await prisma.$queryRaw<Array<{ id: bigint; nome: string; gestao: string }>>(Prisma.sql`SELECT id, nome, gestao FROM cipa_eleicao WHERE id = ${electionId} AND tenant_id = ${tenantId}::uuid LIMIT 1`))[0];
  if (!election) throw new AppError("Eleição não encontrada no ambiente atual.", 404);

  if (["ELEITORES_APTOS", "ELEITORES_VOTARAM", "ELEITORES_PENDENTES"].includes(tipo)) {
    const rows = await prisma.$queryRaw<Array<{ matricula: string; nome_completo: string; cpf: string; unidade_id: bigint; setor: string | null; turno: string | null; votado_em: Date | null }>>(Prisma.sql`SELECT e.matricula, e.nome_completo, e.cpf, e.unidade_id, e.setor, e.turno, p.votado_em FROM cipa_eleitor_eleicao e LEFT JOIN cipa_participacao p ON p.tenant_id = e.tenant_id AND p.eleicao_id = e.eleicao_id AND p.eleitor_id = e.id WHERE e.tenant_id = ${tenantId}::uuid AND e.eleicao_id = ${electionId} AND e.status = 'APTO' ${tipo === "ELEITORES_VOTARAM" ? Prisma.sql`AND p.id IS NOT NULL` : tipo === "ELEITORES_PENDENTES" ? Prisma.sql`AND p.id IS NULL` : Prisma.empty} ORDER BY e.nome_completo`);
    return { filename: `cipa-${tipo.toLowerCase()}-${eleicaoId}.csv`, contentType: "text/csv; charset=utf-8", content: csv(["Eleição", "Gestão", "Matrícula", "Nome", "CPF", "Unidade", "Setor", "Turno", "Participação"], rows.map((row) => [election.nome, election.gestao, row.matricula, row.nome_completo, mascararCpf(row.cpf), String(row.unidade_id), row.setor, row.turno, row.votado_em ? "Votou" : "Pendente"])) };
  }

  if (tipo === "CANDIDATOS") {
    const rows = await prisma.$queryRaw<Array<{ numero: number; nome_publico: string; cargo_publico: string | null; setor_publico: string | null; status: string; protocolo: string }>>(Prisma.sql`SELECT numero, nome_publico, cargo_publico, setor_publico, status, protocolo FROM cipa_candidatura WHERE tenant_id = ${tenantId}::uuid AND eleicao_id = ${electionId} ORDER BY numero`);
    return { filename: `cipa-candidatos-${eleicaoId}.csv`, contentType: "text/csv; charset=utf-8", content: csv(["Eleição", "Gestão", "Número", "Nome", "Cargo", "Setor", "Status", "Protocolo"], rows.map((row) => [election.nome, election.gestao, row.numero, row.nome_publico, row.cargo_publico, row.setor_publico, row.status, row.protocolo])) };
  }

  if (tipo === "PARTICIPACAO") {
    const rows = await prisma.$queryRaw<Array<{ votado_em: Date; unidade_id: bigint; setor: string | null; turno: string | null }>>(Prisma.sql`SELECT p.votado_em, e.unidade_id, e.setor, e.turno FROM cipa_participacao p INNER JOIN cipa_eleitor_eleicao e ON e.id = p.eleitor_id AND e.tenant_id = p.tenant_id AND e.eleicao_id = p.eleicao_id WHERE p.tenant_id = ${tenantId}::uuid AND p.eleicao_id = ${electionId} ORDER BY p.votado_em`);
    return { filename: `cipa-participacao-${eleicaoId}.csv`, contentType: "text/csv; charset=utf-8", content: csv(["Eleição", "Gestão", "Data/hora", "Unidade", "Setor", "Turno"], rows.map((row) => [election.nome, election.gestao, row.votado_em.toISOString(), String(row.unidade_id), row.setor, row.turno])) };
  }

  if (tipo === "AUDITORIA" || tipo === "HISTORICO") {
    const rows = await prisma.$queryRaw<Array<{ acao: string; usuario_id: bigint | null; resultado: string; criado_em: Date; detalhes: unknown }>>(Prisma.sql`SELECT acao, usuario_id, resultado, criado_em, detalhes FROM cipa_eleicao_auditoria WHERE tenant_id = ${tenantId}::uuid AND eleicao_id = ${electionId} ORDER BY criado_em ASC`);
    return { filename: `cipa-${tipo.toLowerCase()}-${eleicaoId}.csv`, contentType: "text/csv; charset=utf-8", content: csv(["Eleição", "Gestão", "Ação", "Usuário", "Resultado", "Data/hora", "Detalhes"], rows.map((row) => [election.nome, election.gestao, row.acao, row.usuario_id ? String(row.usuario_id) : "Portal", row.resultado, row.criado_em.toISOString(), JSON.stringify(row.detalhes ?? {})])) };
  }

  const rows = await prisma.$queryRaw<Array<{ total_eleitores: number; total_votos: number; total_participantes: number; votos_validos: number; votos_brancos: number; votos_nulos: number; resultado_json: unknown; apurada_em: Date }>>(Prisma.sql`SELECT total_eleitores, total_votos, total_participantes, votos_validos, votos_brancos, votos_nulos, resultado_json, apurada_em FROM cipa_eleicao_apuracao WHERE tenant_id = ${tenantId}::uuid AND eleicao_id = ${electionId} LIMIT 1`);
  const result = rows[0];
  if (!result) throw new AppError("A apuração ainda não foi realizada.", 409);
  const resultados = Array.isArray(result.resultado_json) ? result.resultado_json as Array<Record<string, unknown>> : [];
  const cabecalho = ["Eleição", "Gestão", "Eleitores aptos", "Participantes", "Votos totais", "Votos válidos", "Votos brancos", "Votos nulos", "Apuração"];
  const linhas = [[election.nome, election.gestao, result.total_eleitores, result.total_participantes, result.total_votos, result.votos_validos, result.votos_brancos, result.votos_nulos, result.apurada_em.toISOString()]];
  if (tipo === "APURACAO") return { filename: `cipa-apuracao-${eleicaoId}.csv`, contentType: "text/csv; charset=utf-8", content: csv([...cabecalho, "Número", "Candidato", "Votos", "Classificação"], resultados.map((item) => [...linhas[0], item.numero, item.nome, item.votos, item.classificacao])) };
  return { filename: `cipa-resultado-final-${eleicaoId}.csv`, contentType: "text/csv; charset=utf-8", content: csv([...cabecalho, "Número", "Candidato", "Votos", "Classificação"], resultados.map((item) => [...linhas[0], item.numero, item.nome, item.votos, item.classificacao])) };
}
