import { Prisma } from "@prisma/client";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import type { CipaCandidaturaInput, CipaColaboradorFilters, CipaColaboradorInput, CipaEleicaoInput } from "../cipa.types.js";
import type { CipaImportRow } from "../cipa.import-parser.js";
import { cipaColaboradorInputSchema } from "../cipa.schema.js";
import { emitirCipaAtualizacao } from "../cipa.live.js";

function id(value: string, nome: string) {
  try { return BigInt(value); } catch { throw new AppError(`${nome} inválido.`, 400); }
}

function data(value?: string | null) { return value ? new Date(value) : null; }

function dataNascimento(value: string) { return value.slice(0, 10); }

function hashToken(token: string) { return createHash("sha256").update(token).digest("hex"); }

function erroConcorrencia(error: unknown) { return Boolean(error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "P2002"); }

function mascararCpf(value: unknown) {
  const cpf = String(value ?? "");
  return cpf.length === 11 ? `***.***.***-${cpf.slice(-2)}` : "***";
}

function mapColaborador(row: Record<string, unknown>) {
  return {
    id: String(row.id), tenantId: row.tenant_id, instituicaoId: row.instituicao_id,
    unidadeId: row.unidade_id ? String(row.unidade_id) : undefined,
    profissionalId: row.profissional_id ? String(row.profissional_id) : undefined,
    matricula: row.matricula, nomeCompleto: row.nome_completo, cpfMascarado: mascararCpf(row.cpf),
    dataNascimento: row.data_nascimento, cargo: row.cargo, setor: row.setor, turno: row.turno,
    dataAdmissao: row.data_admissao, dataDesligamento: row.data_desligamento,
    status: row.status, email: row.email, telefone: row.telefone, fotoCaminhoLogico: row.foto_caminho_logico,
    criadoEm: row.criado_em, atualizadoEm: row.atualizado_em
  };
}

function mapEleicao(row: Record<string, unknown>) {
  return {
    id: String(row.id), tenantId: row.tenant_id, instituicaoId: row.instituicao_id,
    unidadeId: String(row.unidade_id), identificadorPublico: row.identificador_publico,
    nome: row.nome, gestao: row.gestao, descricao: row.descricao, observacoes: row.observacoes,
    status: row.status, inscricoesInicio: row.inscricoes_inicio, inscricoesFim: row.inscricoes_fim,
    divulgacaoCandidatosEm: row.divulgacao_candidatos_em, votacaoInicio: row.votacao_inicio,
    votacaoFim: row.votacao_fim, apuracaoEm: row.apuracao_em,
    publicacaoPrevistaEm: row.publicacao_prevista_em, posseEm: row.posse_em,
    configuracao: row.titulares == null ? undefined : {
      titulares: Number(row.titulares), suplentes: Number(row.suplentes),
      votosPorEleitor: Number(row.votos_por_eleitor), permiteVotoBranco: row.permite_voto_branco,
      permiteVotoNulo: row.permite_voto_nulo, permiteVotacaoCelular: row.permite_votacao_celular,
      permiteVotacaoPresencial: row.permite_votacao_presencial, regraDesempate: row.regra_desempate,
      regrasVersao: row.regras_versao
    },
    criadoEm: row.criado_em, atualizadoEm: row.atualizado_em
  };
}

function mapEleitor(row: Record<string, unknown>) {
  return {
    id: String(row.id), eleicaoId: String(row.eleicao_id), colaboradorId: String(row.colaborador_id),
    matricula: row.matricula, nomeCompleto: row.nome_completo, cpfMascarado: mascararCpf(row.cpf),
    unidadeId: String(row.unidade_id), setor: row.setor, turno: row.turno,
    dataAdmissao: row.data_admissao, status: row.status, incluidoEm: row.incluido_em, removidoEm: row.removido_em
  };
}

function mapCandidatura(row: Record<string, unknown>) {
  return {
    id: String(row.id), eleicaoId: String(row.eleicao_id), colaboradorId: String(row.colaborador_id),
    numero: Number(row.numero), nomePublico: row.nome_publico, cargoPublico: row.cargo_publico,
    setorPublico: row.setor_publico, unidadePublico: row.unidade_publico,
    fotoCaminhoLogico: row.foto_caminho_logico, apresentacao: row.apresentacao, proposta: row.proposta,
    status: row.status, protocolo: row.protocolo, candidaturaEm: row.candidatura_em,
    aprovadaEm: row.aprovada_em, motivoDecisao: row.motivo_decisao
  };
}

export class CipaRepository {
  private async exigirEleicaoNoTenant(tenantId: string, eleicaoId: string) {
    const rows = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`SELECT id FROM cipa_eleicao WHERE id = ${id(eleicaoId, "Eleição")} AND tenant_id = ${tenantId}::uuid LIMIT 1`);
    if (!rows[0]) throw new AppError("Eleição não encontrada no ambiente atual.", 404);
    return rows[0].id;
  }

  async listarColaboradores(tenantId: string, filters: CipaColaboradorFilters) {
    const offset = ((filters.pagina ?? 1) - 1) * (filters.limite ?? 50);
    const termo = filters.termo?.trim() || null;
    const status = filters.status?.trim() || null;
    const unidadeId = filters.unidadeId ? id(filters.unidadeId, "Unidade") : null;
    const where = [Prisma.sql`c.tenant_id = ${tenantId}::uuid`];
    if (termo) where.push(Prisma.sql`(c.nome_completo ILIKE ${`%${termo}%`} OR c.matricula ILIKE ${`%${termo}%`} OR c.cpf = ${termo.replace(/\D/g, "")})`);
    if (status) where.push(Prisma.sql`c.status = ${status}`);
    if (unidadeId) where.push(Prisma.sql`c.unidade_id = ${unidadeId}`);
    const condition = Prisma.join(where, " AND ");
    const [rows, totalRows] = await Promise.all([
      prisma.$queryRaw<Record<string, unknown>[]>(Prisma.sql`SELECT c.* FROM rh_colaborador c WHERE ${condition} ORDER BY c.nome_completo ASC LIMIT ${filters.limite ?? 50} OFFSET ${offset}`),
      prisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`SELECT COUNT(*)::bigint AS total FROM rh_colaborador c WHERE ${condition}`)
    ]);
    return { colaboradores: rows.map(mapColaborador), total: Number(totalRows[0]?.total ?? 0), pagina: filters.pagina ?? 1, limite: filters.limite ?? 50 };
  }

  async buscarColaborador(tenantId: string, colaboradorId: string) {
    const rows = await prisma.$queryRaw<Record<string, unknown>[]>(Prisma.sql`SELECT * FROM rh_colaborador WHERE id = ${id(colaboradorId, "Colaborador")} AND tenant_id = ${tenantId}::uuid LIMIT 1`);
    return rows[0] ? mapColaborador(rows[0]) : null;
  }

  async criarColaborador(tenantId: string, instituicaoId: string, input: CipaColaboradorInput, usuarioId: string) {
    const colaboradorId = await prisma.$transaction(async (tx) => {
      if (input.unidadeId) {
        const unidades = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`SELECT id FROM unidade_assistencial WHERE id = ${id(input.unidadeId, "Unidade")} AND tenant_id = ${tenantId}::uuid LIMIT 1`);
        if (!unidades[0]) throw new AppError("A unidade informada não pertence à instituição atual.", 403);
      }
      const rows = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`INSERT INTO rh_colaborador (tenant_id, instituicao_id, unidade_id, profissional_id, matricula, nome_completo, cpf, data_nascimento, cargo, setor, turno, data_admissao, data_desligamento, status, email, telefone, foto_caminho_logico) VALUES (${tenantId}::uuid, ${instituicaoId}::uuid, ${input.unidadeId ? id(input.unidadeId, "Unidade") : null}, ${input.profissionalId ? id(input.profissionalId, "Profissional") : null}, ${input.matricula.trim()}, ${input.nomeCompleto.trim()}, ${input.cpf}, ${data(input.dataNascimento)}, ${input.cargo ?? null}, ${input.setor ?? null}, ${input.turno ?? null}, ${data(input.dataAdmissao)}, ${data(input.dataDesligamento)}, ${input.status ?? "ATIVO"}, ${input.email ?? null}, ${input.telefone ?? null}, ${input.fotoCaminhoLogico ?? null}) RETURNING id`);
      await tx.$executeRaw(Prisma.sql`INSERT INTO cipa_eleicao_auditoria (tenant_id, usuario_id, acao, detalhes) VALUES (${tenantId}::uuid, ${id(usuarioId, "Usuário")}, 'COLABORADOR_CRIADO', ${JSON.stringify({ colaboradorId: String(rows[0].id), matricula: input.matricula })}::jsonb)`);
      return rows[0].id;
    });
    return this.buscarColaborador(tenantId, String(colaboradorId));
  }

  async listarEleicoes(tenantId: string) {
    const rows = await prisma.$queryRaw<Record<string, unknown>[]>(Prisma.sql`SELECT e.*, c.titulares, c.suplentes, c.votos_por_eleitor, c.permite_voto_branco, c.permite_voto_nulo, c.permite_votacao_celular, c.permite_votacao_presencial, c.regra_desempate, c.regras_versao FROM cipa_eleicao e LEFT JOIN cipa_eleicao_configuracao c ON c.eleicao_id = e.id AND c.tenant_id = e.tenant_id WHERE e.tenant_id = ${tenantId}::uuid ORDER BY e.criado_em DESC`);
    return { eleicoes: rows.map(mapEleicao) };
  }

  async buscarEleicao(tenantId: string, eleicaoId: string) {
    const rows = await prisma.$queryRaw<Record<string, unknown>[]>(Prisma.sql`SELECT e.*, c.titulares, c.suplentes, c.votos_por_eleitor, c.permite_voto_branco, c.permite_voto_nulo, c.permite_votacao_celular, c.permite_votacao_presencial, c.regra_desempate, c.regras_versao FROM cipa_eleicao e LEFT JOIN cipa_eleicao_configuracao c ON c.eleicao_id = e.id AND c.tenant_id = e.tenant_id WHERE e.id = ${id(eleicaoId, "Eleição")} AND e.tenant_id = ${tenantId}::uuid LIMIT 1`);
    return rows[0] ? mapEleicao(rows[0]) : null;
  }

  async criarEleicao(tenantId: string, instituicaoId: string, input: CipaEleicaoInput, usuarioId: string) {
    const electionId = await prisma.$transaction(async (tx) => {
      const unidade = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`SELECT id FROM unidade_assistencial WHERE id = ${id(input.unidadeId, "Unidade")} AND tenant_id = ${tenantId}::uuid LIMIT 1`);
      if (!unidade[0]) throw new AppError("O estabelecimento informado não pertence à instituição atual.", 403);
      const identificador = `cipa-${randomUUID()}`;
      const rows = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`INSERT INTO cipa_eleicao (tenant_id, instituicao_id, unidade_id, identificador_publico, nome, gestao, descricao, observacoes, status, inscricoes_inicio, inscricoes_fim, divulgacao_candidatos_em, votacao_inicio, votacao_fim, apuracao_em, publicacao_prevista_em, posse_em, criado_por, atualizado_por) VALUES (${tenantId}::uuid, ${instituicaoId}::uuid, ${id(input.unidadeId, "Unidade")}, ${identificador}, ${input.nome}, ${input.gestao}, ${input.descricao ?? null}, ${input.observacoes ?? null}, 'CONFIGURACAO', ${data(input.inscricoesInicio)}, ${data(input.inscricoesFim)}, ${data(input.divulgacaoCandidatosEm)}, ${data(input.votacaoInicio)}, ${data(input.votacaoFim)}, ${data(input.apuracaoEm)}, ${data(input.publicacaoPrevistaEm)}, ${data(input.posseEm)}, ${id(usuarioId, "Usuário")}, ${id(usuarioId, "Usuário")}) RETURNING id`);
      const eleicaoId = rows[0].id;
      await tx.$executeRaw(Prisma.sql`INSERT INTO cipa_eleicao_configuracao (tenant_id, eleicao_id, titulares, suplentes, votos_por_eleitor, permite_voto_branco, permite_voto_nulo, permite_votacao_celular, permite_votacao_presencial, regra_desempate, regras_snapshot) VALUES (${tenantId}::uuid, ${eleicaoId}, ${input.titulares ?? 1}, ${input.suplentes ?? 1}, ${input.votosPorEleitor ?? 1}, ${input.permiteVotoBranco ?? true}, ${input.permiteVotoNulo ?? true}, ${input.permiteVotacaoCelular ?? true}, ${input.permiteVotacaoPresencial ?? false}, ${input.regraDesempate ?? "TEMPO_SERVICO_ESTABELECIMENTO"}, ${JSON.stringify({ fonte: "NR-5", versao: "NR5-PORTARIA-MTP-4219-2022", fonteUrl: "https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-paritaria-permanente/normas-regulamentadora/normas-regulamentadoras-vigentes/norma-regulamentadora-no-5-nr-5", aviso: "Processo estruturado para apoiar o atendimento aos requisitos aplicáveis da NR-5." })}::jsonb)`);
      await tx.$executeRaw(Prisma.sql`INSERT INTO cipa_eleicao_auditoria (tenant_id, eleicao_id, usuario_id, acao, detalhes) VALUES (${tenantId}::uuid, ${eleicaoId}, ${id(usuarioId, "Usuário")}, 'ELEICAO_CRIADA', ${JSON.stringify({ identificador, nome: input.nome, gestao: input.gestao })}::jsonb)`);
      return eleicaoId;
    });
    return this.buscarEleicao(tenantId, String(electionId));
  }

  async editarEleicao(tenantId: string, eleicaoId: string, input: CipaEleicaoInput, usuarioId: string) {
    const electionId = id(eleicaoId, "Eleição");
    await prisma.$transaction(async (tx) => {
      const election = await tx.$queryRaw<Array<{ id: bigint; status: string }>>(Prisma.sql`SELECT id, status FROM cipa_eleicao WHERE id = ${electionId} AND tenant_id = ${tenantId}::uuid FOR UPDATE`);
      if (!election[0]) throw new AppError("Eleição não encontrada no ambiente atual.", 404);
      if (election[0].status !== "CONFIGURACAO") throw new AppError("A eleição só pode ser editada enquanto estiver em configuração.", 409);
      const unidade = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`SELECT id FROM unidade_assistencial WHERE id = ${id(input.unidadeId, "Unidade")} AND tenant_id = ${tenantId}::uuid LIMIT 1`);
      if (!unidade[0]) throw new AppError("O estabelecimento informado não pertence à instituição atual.", 403);
      await tx.$executeRaw(Prisma.sql`UPDATE cipa_eleicao SET unidade_id = ${unidade[0].id}, nome = ${input.nome}, gestao = ${input.gestao}, descricao = ${input.descricao ?? null}, observacoes = ${input.observacoes ?? null}, inscricoes_inicio = ${data(input.inscricoesInicio)}, inscricoes_fim = ${data(input.inscricoesFim)}, divulgacao_candidatos_em = ${data(input.divulgacaoCandidatosEm)}, votacao_inicio = ${data(input.votacaoInicio)}, votacao_fim = ${data(input.votacaoFim)}, apuracao_em = ${data(input.apuracaoEm)}, publicacao_prevista_em = ${data(input.publicacaoPrevistaEm)}, posse_em = ${data(input.posseEm)}, atualizado_por = ${id(usuarioId, "Usuário")}, atualizado_em = NOW() WHERE id = ${electionId} AND tenant_id = ${tenantId}::uuid`);
      await tx.$executeRaw(Prisma.sql`UPDATE cipa_eleicao_configuracao SET titulares = ${input.titulares ?? 1}, suplentes = ${input.suplentes ?? 1}, votos_por_eleitor = ${input.votosPorEleitor ?? 1}, permite_voto_branco = ${input.permiteVotoBranco ?? true}, permite_voto_nulo = ${input.permiteVotoNulo ?? true}, permite_votacao_celular = ${input.permiteVotacaoCelular ?? true}, permite_votacao_presencial = ${input.permiteVotacaoPresencial ?? false}, regra_desempate = ${input.regraDesempate ?? "TEMPO_SERVICO_ESTABELECIMENTO"}, regras_snapshot = ${JSON.stringify({ fonte: "NR-5", versao: "NR5-PORTARIA-MTP-4219-2022", fonteUrl: "https://www.gov.br/trabalho-e-emprego/pt-br/acesso-a-informacao/participacao-social/conselhos-e-orgaos-colegiados/comissao-tripartite-paritaria-permanente/normas-regulamentadora/normas-regulamentadoras-vigentes/norma-regulamentadora-no-5-nr-5", aviso: "Processo estruturado para apoiar o atendimento aos requisitos aplicáveis da NR-5.", atualizadoEm: new Date().toISOString() })}::jsonb WHERE eleicao_id = ${electionId} AND tenant_id = ${tenantId}::uuid`);
      await tx.$executeRaw(Prisma.sql`INSERT INTO cipa_eleicao_auditoria (tenant_id, eleicao_id, usuario_id, acao, detalhes) VALUES (${tenantId}::uuid, ${electionId}, ${id(usuarioId, "Usuário")}, 'ELEICAO_EDITADA', ${JSON.stringify({ nome: input.nome, gestao: input.gestao })}::jsonb)`);
    });
    return this.buscarEleicao(tenantId, eleicaoId);
  }

  async listarEleitores(tenantId: string, eleicaoId: string) {
    await this.exigirEleicaoNoTenant(tenantId, eleicaoId);
    const rows = await prisma.$queryRaw<Record<string, unknown>[]>(Prisma.sql`SELECT * FROM cipa_eleitor_eleicao WHERE tenant_id = ${tenantId}::uuid AND eleicao_id = ${id(eleicaoId, "Eleição")} ORDER BY nome_completo ASC`);
    return { eleitores: rows.map(mapEleitor) };
  }

  async adicionarEleitor(tenantId: string, eleicaoId: string, colaboradorId: string, usuarioId: string) {
    const eleitorId = await prisma.$transaction(async (tx) => {
      const election = await tx.$queryRaw<Array<{ id: bigint; unidade_id: bigint; status: string }>>(Prisma.sql`SELECT id, unidade_id, status FROM cipa_eleicao WHERE id = ${id(eleicaoId, "Eleição")} AND tenant_id = ${tenantId}::uuid LIMIT 1`);
      if (!election[0]) throw new AppError("Eleição não encontrada no ambiente atual.", 404);
      if (!["CONFIGURACAO", "INSCRICOES_ABERTAS"].includes(election[0].status)) throw new AppError("Não é possível alterar eleitores nesta etapa da eleição.", 409);
      const colaboradores = await tx.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`SELECT * FROM rh_colaborador WHERE id = ${id(colaboradorId, "Colaborador")} AND tenant_id = ${tenantId}::uuid AND status IN ('ATIVO', 'AFASTADO') AND unidade_id = ${election[0].unidade_id} LIMIT 1`);
      const colaborador = colaboradores[0];
      if (!colaborador) throw new AppError("O colaborador não está ativo ou não pertence ao estabelecimento da eleição.", 422);
      const existing = await tx.$queryRaw<Array<{ id: bigint; status: string }>>(Prisma.sql`SELECT id, status FROM cipa_eleitor_eleicao WHERE tenant_id = ${tenantId}::uuid AND eleicao_id = ${election[0].id} AND colaborador_id = ${id(colaboradorId, "Colaborador")} FOR UPDATE`);
      let eleitorId: bigint;
      let acao = "ELEITOR_INCLUIDO";
      if (existing[0]) {
        if (existing[0].status !== "REMOVIDO") throw new AppError("Este colaborador já está cadastrado como eleitor nesta eleição.", 409);
        const participado = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`SELECT id FROM cipa_participacao WHERE tenant_id = ${tenantId}::uuid AND eleicao_id = ${election[0].id} AND eleitor_id = ${existing[0].id} LIMIT 1`);
        if (participado[0]) throw new AppError("Este eleitor já participou da votação e não pode ser reativado.", 409);
        await tx.$executeRaw(Prisma.sql`UPDATE cipa_eleitor_eleicao SET status = 'APTO', removido_em = NULL WHERE id = ${existing[0].id} AND tenant_id = ${tenantId}::uuid`);
        eleitorId = existing[0].id;
        acao = "ELEITOR_REATIVADO";
      } else {
        const rows = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`INSERT INTO cipa_eleitor_eleicao (tenant_id, eleicao_id, colaborador_id, matricula, nome_completo, cpf, data_nascimento, unidade_id, setor, turno, data_admissao) VALUES (${tenantId}::uuid, ${election[0].id}, ${id(colaboradorId, "Colaborador")}, ${colaborador.matricula}, ${colaborador.nome_completo}, ${colaborador.cpf}, ${colaborador.data_nascimento}, ${colaborador.unidade_id}, ${colaborador.setor}, ${colaborador.turno}, ${colaborador.data_admissao}) RETURNING id`);
        eleitorId = rows[0].id;
      }
      await tx.$executeRaw(Prisma.sql`INSERT INTO cipa_eleicao_auditoria (tenant_id, eleicao_id, usuario_id, acao, detalhes) VALUES (${tenantId}::uuid, ${election[0].id}, ${id(usuarioId, "Usuário")}, ${acao}, ${JSON.stringify({ eleitorId: String(eleitorId), colaboradorId })}::jsonb)`);
      return eleitorId;
    });
    const rows = await prisma.$queryRaw<Record<string, unknown>[]>(Prisma.sql`SELECT * FROM cipa_eleitor_eleicao WHERE id = ${eleitorId} AND tenant_id = ${tenantId}::uuid LIMIT 1`);
    return rows[0] ? mapEleitor(rows[0]) : null;
  }

  async removerEleitor(tenantId: string, eleicaoId: string, eleitorId: string, usuarioId: string) {
    await prisma.$transaction(async (tx) => {
      const eleitores = await tx.$queryRaw<Array<{ id: bigint; eleicao_id: bigint; status: string }>>(Prisma.sql`SELECT id, eleicao_id, status FROM cipa_eleitor_eleicao WHERE id = ${id(eleitorId, "Eleitor")} AND eleicao_id = ${id(eleicaoId, "Eleição")} AND tenant_id = ${tenantId}::uuid FOR UPDATE`);
      const eleitor = eleitores[0];
      if (!eleitor) throw new AppError("Eleitor não encontrado no ambiente atual.", 404);
      const eleicoes = await tx.$queryRaw<Array<{ status: string }>>(Prisma.sql`SELECT status FROM cipa_eleicao WHERE id = ${eleitor.eleicao_id} AND tenant_id = ${tenantId}::uuid LIMIT 1`);
      if (!eleicoes[0] || !["CONFIGURACAO", "INSCRICOES_ABERTAS"].includes(eleicoes[0].status)) throw new AppError("Os eleitores só podem ser removidos antes da votação.", 409);
      if (eleitor.status === "REMOVIDO") return;
      const participacoes = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`SELECT id FROM cipa_participacao WHERE tenant_id = ${tenantId}::uuid AND eleicao_id = ${id(eleicaoId, "Eleição")} AND eleitor_id = ${eleitor.id} LIMIT 1`);
      if (participacoes[0]) throw new AppError("Este eleitor já participou da votação e não pode ser removido.", 409);
      await tx.$executeRaw(Prisma.sql`UPDATE cipa_eleitor_eleicao SET status = 'REMOVIDO', removido_em = NOW() WHERE id = ${eleitor.id} AND tenant_id = ${tenantId}::uuid`);
      await tx.$executeRaw(Prisma.sql`INSERT INTO cipa_eleicao_auditoria (tenant_id, eleicao_id, usuario_id, acao, detalhes) VALUES (${tenantId}::uuid, ${eleitor.eleicao_id}, ${id(usuarioId, "Usuário")}, 'ELEITOR_REMOVIDO', ${JSON.stringify({ eleitorId })}::jsonb)`);
    });
    return { id: eleitorId, removido: true };
  }

  async importarEleitores(tenantId: string, eleicaoId: string, rows: Array<CipaImportRow & { dataNascimento: string; dataAdmissao: string }>, usuarioId: string) {
    const electionId = id(eleicaoId, "Eleição");
    return prisma.$transaction(async (tx) => {
      const elections = await tx.$queryRaw<Array<{ id: bigint; tenant_id: string; instituicao_id: string; unidade_id: bigint; status: string }>>(Prisma.sql`SELECT id, tenant_id, instituicao_id, unidade_id, status FROM cipa_eleicao WHERE id = ${electionId} AND tenant_id = ${tenantId}::uuid LIMIT 1`);
      const election = elections[0];
      if (!election) throw new AppError("Eleição não encontrada no ambiente atual.", 404);
      if (!["CONFIGURACAO", "INSCRICOES_ABERTAS"].includes(election.status)) throw new AppError("Os eleitores só podem ser importados antes da abertura da votação.", 409);
      const cpfVistos = new Set<string>(); const matriculasVistas = new Set<string>(); const inconsistencias: Array<{ linha: number; motivo: string }> = []; let importados = 0; let existentes = 0;
      for (const row of rows) {
        const cpf = row.cpf.replace(/\D/g, ""); const matricula = row.matricula.trim();
        const validacao = cipaColaboradorInputSchema.safeParse({ matricula, nomeCompleto: row.nomeCompleto, cpf, dataNascimento: row.dataNascimento, dataAdmissao: row.dataAdmissao, cargo: row.cargo, setor: row.setor, turno: row.turno });
        if (!validacao.success) { inconsistencias.push({ linha: row.linha, motivo: validacao.error.issues.map((issue) => issue.message).join(" ") }); continue; }
        const dados = validacao.data;
        if (cpfVistos.has(cpf) || matriculasVistas.has(matricula)) { inconsistencias.push({ linha: row.linha, motivo: "CPF ou matrícula repetido na planilha." }); continue; }
        cpfVistos.add(cpf); matriculasVistas.add(matricula);
        let colaborador = (await tx.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`SELECT * FROM rh_colaborador WHERE tenant_id = ${tenantId}::uuid AND cpf = ${cpf} LIMIT 1`))[0];
        if (colaborador && String(colaborador.unidade_id ?? "") !== String(election.unidade_id)) { inconsistencias.push({ linha: row.linha, motivo: "O CPF já está cadastrado em outro estabelecimento." }); continue; }
        if (!colaborador) {
          const inserted = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`INSERT INTO rh_colaborador (tenant_id, instituicao_id, unidade_id, matricula, nome_completo, cpf, data_nascimento, cargo, setor, turno, data_admissao, status) VALUES (${tenantId}::uuid, ${election.instituicao_id}::uuid, ${election.unidade_id}, ${dados.matricula}, ${dados.nomeCompleto}, ${dados.cpf}, ${dados.dataNascimento}::date, ${dados.cargo ?? null}, ${dados.setor ?? null}, ${dados.turno ?? null}, ${dados.dataAdmissao}::date, 'ATIVO') RETURNING id`);
          colaborador = { id: inserted[0].id }; importados += 1;
        } else existentes += 1;
        const incluido = await tx.$executeRaw(Prisma.sql`INSERT INTO cipa_eleitor_eleicao (tenant_id, eleicao_id, colaborador_id, matricula, nome_completo, cpf, data_nascimento, unidade_id, setor, turno, data_admissao) SELECT ${tenantId}::uuid, ${electionId}, c.id, c.matricula, c.nome_completo, c.cpf, c.data_nascimento, c.unidade_id, c.setor, c.turno, c.data_admissao FROM rh_colaborador c WHERE c.id = ${colaborador.id} AND c.tenant_id = ${tenantId}::uuid ON CONFLICT DO NOTHING`);
        if (!incluido) inconsistencias.push({ linha: row.linha, motivo: "Este colaborador já está cadastrado como eleitor nesta eleição." });
      }
      await tx.$executeRaw(Prisma.sql`INSERT INTO cipa_eleicao_auditoria (tenant_id, eleicao_id, usuario_id, acao, detalhes) VALUES (${tenantId}::uuid, ${electionId}, ${id(usuarioId, "Usuário")}, 'ELEITORES_IMPORTADOS', ${JSON.stringify({ totalLinhas: rows.length, importados, existentes, inconsistencias: inconsistencias.length })}::jsonb)`);
      return { totalLinhas: rows.length, colaboradoresCriados: importados, colaboradoresExistentes: existentes, eleitoresIncluidos: importados + existentes - inconsistencias.filter((item) => item.motivo.includes("já está cadastrado como eleitor")).length, inconsistencias };
    });
  }

  async listarCandidaturas(tenantId: string, eleicaoId: string) {
    await this.exigirEleicaoNoTenant(tenantId, eleicaoId);
    const rows = await prisma.$queryRaw<Record<string, unknown>[]>(Prisma.sql`SELECT * FROM cipa_candidatura WHERE tenant_id = ${tenantId}::uuid AND eleicao_id = ${id(eleicaoId, "Eleição")} ORDER BY numero ASC`);
    return { candidaturas: rows.map(mapCandidatura) };
  }

  async criarCandidatura(tenantId: string, eleicaoId: string, input: CipaCandidaturaInput, usuarioId: string) {
    const candidaturaId = await prisma.$transaction(async (tx) => {
      const election = await tx.$queryRaw<Array<{ id: bigint; unidade_id: bigint; status: string }>>(Prisma.sql`SELECT id, unidade_id, status FROM cipa_eleicao WHERE id = ${id(eleicaoId, "Eleição")} AND tenant_id = ${tenantId}::uuid LIMIT 1`);
      if (!election[0]) throw new AppError("Eleição não encontrada no ambiente atual.", 404);
      if (election[0].status !== "INSCRICOES_ABERTAS") throw new AppError("As inscrições não estão abertas nesta eleição.", 409);
      const colaboradores = await tx.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`SELECT * FROM rh_colaborador WHERE id = ${id(input.colaboradorId, "Colaborador")} AND tenant_id = ${tenantId}::uuid AND status IN ('ATIVO', 'AFASTADO') AND unidade_id = ${election[0].unidade_id} LIMIT 1`);
      const colaborador = colaboradores[0];
      if (!colaborador) throw new AppError("O colaborador não está apto ou não pertence ao estabelecimento da eleição.", 422);
      await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${`${tenantId}:${eleicaoId}:candidatura-numero`}, 0))`);
      const numeroRows = await tx.$queryRaw<Array<{ numero: number }>>(Prisma.sql`SELECT COALESCE(MAX(numero), 0) + 1 AS numero FROM cipa_candidatura WHERE tenant_id = ${tenantId}::uuid AND eleicao_id = ${election[0].id}`);
      const protocolo = `CIPA-${new Date().getFullYear()}-${randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;
      const rows = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`INSERT INTO cipa_candidatura (tenant_id, eleicao_id, colaborador_id, numero, nome_publico, cargo_publico, setor_publico, unidade_publico, foto_caminho_logico, apresentacao, proposta, status, protocolo, declaracao_ciencia_em, data_admissao_estabelecimento) VALUES (${tenantId}::uuid, ${election[0].id}, ${id(input.colaboradorId, "Colaborador")}, ${numeroRows[0].numero}, ${colaborador.nome_completo}, ${colaborador.cargo}, ${colaborador.setor}, (SELECT nome_fantasia FROM unidade_assistencial WHERE id = ${election[0].unidade_id} AND tenant_id = ${tenantId}::uuid), ${colaborador.foto_caminho_logico}, ${input.apresentacao ?? null}, ${input.proposta ?? null}, 'EM_ANALISE', ${protocolo}, NOW(), ${colaborador.data_admissao}) RETURNING id`);
      await tx.$executeRaw(Prisma.sql`INSERT INTO cipa_eleicao_auditoria (tenant_id, eleicao_id, usuario_id, acao, detalhes) VALUES (${tenantId}::uuid, ${election[0].id}, ${id(usuarioId, "Usuário")}, 'CANDIDATURA_CRIADA', ${JSON.stringify({ candidaturaId: String(rows[0].id), protocolo })}::jsonb)`);
      return rows[0].id;
    });
    const rows = await prisma.$queryRaw<Record<string, unknown>[]>(Prisma.sql`SELECT * FROM cipa_candidatura WHERE id = ${candidaturaId} AND tenant_id = ${tenantId}::uuid LIMIT 1`);
    return rows[0] ? mapCandidatura(rows[0]) : null;
  }

  async criarCandidaturaPortal(token: string, identificador: string, input: Omit<CipaCandidaturaInput, "colaboradorId">) {
    const hash = hashToken(token);
    try {
      const candidatura = await prisma.$transaction(async (tx) => {
        const sessoes = await tx.$queryRaw<Array<{ tenant_id: string; eleicao_id: bigint; colaborador_id: bigint; unidade_id: bigint }>>(Prisma.sql`SELECT s.tenant_id, s.eleicao_id, s.colaborador_id, e.unidade_id FROM cipa_portal_sessao s INNER JOIN cipa_eleicao e ON e.id = s.eleicao_id AND e.tenant_id = s.tenant_id AND e.identificador_publico = ${identificador.trim()} WHERE s.token_hash = ${hash} AND s.finalidade = 'CANDIDATURA' AND s.usado_em IS NULL AND s.revogado_em IS NULL AND s.expira_em > NOW() FOR UPDATE`);
        const sessao = sessoes[0];
        if (!sessao) throw new AppError("Seu acesso expirou. Inicie a candidatura novamente.", 401);
        const election = await tx.$queryRaw<Array<{ status: string }>>(Prisma.sql`SELECT status FROM cipa_eleicao WHERE id = ${sessao.eleicao_id} AND tenant_id = ${sessao.tenant_id}::uuid LIMIT 1`);
        if (election[0]?.status !== "INSCRICOES_ABERTAS") throw new AppError("O período de candidatura não está aberto nesta eleição.", 409);
        await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${`${sessao.tenant_id}:${sessao.eleicao_id}:candidatura-numero`}, 0))`);
        const colaboradores = await tx.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`SELECT * FROM rh_colaborador WHERE id = ${sessao.colaborador_id} AND tenant_id = ${sessao.tenant_id}::uuid AND unidade_id = ${sessao.unidade_id} AND status IN ('ATIVO', 'AFASTADO') LIMIT 1`);
        const colaborador = colaboradores[0];
        if (!colaborador) throw new AppError("Seu cadastro não está apto para esta candidatura. Procure o RH.", 422);
        const numeroRows = await tx.$queryRaw<Array<{ numero: number }>>(Prisma.sql`SELECT COALESCE(MAX(numero), 0) + 1 AS numero FROM cipa_candidatura WHERE tenant_id = ${sessao.tenant_id}::uuid AND eleicao_id = ${sessao.eleicao_id}`);
        const protocolo = `CIPA-${new Date().getFullYear()}-${randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;
        const rows = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`INSERT INTO cipa_candidatura (tenant_id, eleicao_id, colaborador_id, numero, nome_publico, cargo_publico, setor_publico, unidade_publico, foto_caminho_logico, apresentacao, proposta, status, protocolo, declaracao_ciencia_em, data_admissao_estabelecimento) VALUES (${sessao.tenant_id}::uuid, ${sessao.eleicao_id}, ${sessao.colaborador_id}, ${numeroRows[0].numero}, ${colaborador.nome_completo}, ${colaborador.cargo}, ${colaborador.setor}, (SELECT nome_fantasia FROM unidade_assistencial WHERE id = ${sessao.unidade_id} AND tenant_id = ${sessao.tenant_id}::uuid), ${colaborador.foto_caminho_logico}, ${input.apresentacao ?? null}, ${input.proposta ?? null}, 'EM_ANALISE', ${protocolo}, NOW(), ${colaborador.data_admissao}) RETURNING id`);
        await tx.$executeRaw(Prisma.sql`UPDATE cipa_portal_sessao SET usado_em = NOW() WHERE token_hash = ${hash}`);
        await tx.$executeRaw(Prisma.sql`INSERT INTO cipa_eleicao_auditoria (tenant_id, eleicao_id, acao, detalhes) VALUES (${sessao.tenant_id}::uuid, ${sessao.eleicao_id}, 'CANDIDATURA_PORTAL_ENVIADA', ${JSON.stringify({ candidaturaId: String(rows[0].id), protocolo })}::jsonb)`);
        return { id: rows[0].id, tenantId: sessao.tenant_id };
      });
      const rows = await prisma.$queryRaw<Record<string, unknown>[]>(Prisma.sql`SELECT * FROM cipa_candidatura WHERE id = ${candidatura.id} AND tenant_id = ${candidatura.tenantId}::uuid LIMIT 1`);
      return rows[0] ? mapCandidatura(rows[0]) : null;
    } catch (error) {
      if (erroConcorrencia(error)) throw new AppError("Já existe uma candidatura sua nesta eleição.", 409);
      throw error;
    }
  }

  async buscarContextoFotoCandidaturaPortal(token: string, identificador: string) {
    const hash = hashToken(token);
    const rows = await prisma.$queryRaw<Array<{ tenant_id: string; eleicao_id: bigint; colaborador_id: bigint; status: string }>>(Prisma.sql`SELECT s.tenant_id, s.eleicao_id, s.colaborador_id, e.status FROM cipa_portal_sessao s INNER JOIN cipa_eleicao e ON e.id = s.eleicao_id AND e.tenant_id = s.tenant_id AND e.identificador_publico = ${identificador.trim()} WHERE s.token_hash = ${hash} AND s.finalidade = 'CANDIDATURA' AND s.usado_em IS NULL AND s.revogado_em IS NULL AND s.expira_em > NOW() LIMIT 1`);
    if (!rows[0]) throw new AppError("Seu acesso expirou. Inicie a candidatura novamente.", 401);
    if (rows[0].status !== "INSCRICOES_ABERTAS") throw new AppError("O período de candidatura não está aberto nesta eleição.", 409);
    return { tenantId: rows[0].tenant_id, eleicaoId: String(rows[0].eleicao_id), colaboradorId: String(rows[0].colaborador_id) };
  }

  async atualizarFotoColaborador(tenantId: string, colaboradorId: string, caminho: string) {
    const anteriorRows = await prisma.$queryRaw<Array<{ foto_caminho_logico: string | null }>>(Prisma.sql`SELECT foto_caminho_logico FROM rh_colaborador WHERE tenant_id = ${tenantId}::uuid AND id = ${id(colaboradorId, "Colaborador")} LIMIT 1`);
    const rows = await prisma.$queryRaw<Array<{ foto_caminho_logico: string | null }>>(Prisma.sql`UPDATE rh_colaborador SET foto_caminho_logico = ${caminho}, atualizado_em = NOW() WHERE tenant_id = ${tenantId}::uuid AND id = ${id(colaboradorId, "Colaborador")} RETURNING foto_caminho_logico`);
    if (!rows[0]) throw new AppError("Colaborador não encontrado no ambiente atual.", 404);
    return anteriorRows[0]?.foto_caminho_logico ?? null;
  }

  async alterarStatusCandidatura(tenantId: string, eleicaoId: string, candidaturaId: string, status: string, motivo: string | null, usuarioId: string) {
    const electionId = id(eleicaoId, "Eleição");
    await prisma.$transaction(async (tx) => {
      const election = await tx.$queryRaw<Array<{ status: string }>>(Prisma.sql`SELECT status FROM cipa_eleicao WHERE id = ${electionId} AND tenant_id = ${tenantId}::uuid FOR UPDATE`);
      if (!election[0]) throw new AppError("Eleição não encontrada no ambiente atual.", 404);
      if (!["CONFIGURACAO", "INSCRICOES_ABERTAS", "INSCRICOES_ENCERRADAS"].includes(election[0].status)) throw new AppError("As candidaturas ficam congeladas quando a eleição é publicada para votação.", 409);
      const rows = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`UPDATE cipa_candidatura SET status = ${status}, motivo_decisao = ${motivo}, aprovada_em = CASE WHEN ${status} = 'APROVADA' THEN NOW() ELSE aprovada_em END, aprovada_por = CASE WHEN ${status} IN ('APROVADA', 'REPROVADA', 'CORRECAO_SOLICITADA') THEN ${id(usuarioId, "Usuário")} ELSE aprovada_por END, desistente_em = CASE WHEN ${status} = 'DESISTENTE' THEN NOW() ELSE desistente_em END, atualizado_em = NOW() WHERE id = ${id(candidaturaId, "Candidatura")} AND eleicao_id = ${electionId} AND tenant_id = ${tenantId}::uuid RETURNING id`);
      if (!rows[0]) throw new AppError("Candidatura não encontrada no ambiente atual.", 404);
      await tx.$executeRaw(Prisma.sql`INSERT INTO cipa_eleicao_auditoria (tenant_id, eleicao_id, usuario_id, acao, detalhes) VALUES (${tenantId}::uuid, ${electionId}, ${id(usuarioId, "Usuário")}, 'CANDIDATURA_STATUS_ALTERADO', ${JSON.stringify({ candidaturaId, status, motivo })}::jsonb)`);
    });
    const candidatura = await prisma.$queryRaw<Record<string, unknown>[]>(Prisma.sql`SELECT * FROM cipa_candidatura WHERE id = ${id(candidaturaId, "Candidatura")} AND tenant_id = ${tenantId}::uuid LIMIT 1`);
    return candidatura[0] ? mapCandidatura(candidatura[0]) : null;
  }

  async alterarStatusEleicao(tenantId: string, eleicaoId: string, statusAtual: string, statusNovo: string, usuarioId: string) {
    const rows = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`UPDATE cipa_eleicao SET status = ${statusNovo}, atualizado_por = ${id(usuarioId, "Usuário")}, atualizado_em = NOW() WHERE id = ${id(eleicaoId, "Eleição")} AND tenant_id = ${tenantId}::uuid AND status = ${statusAtual} RETURNING id`);
    if (!rows[0]) throw new AppError("A eleição não está na etapa esperada para esta ação.", 409);
    await prisma.$executeRaw(Prisma.sql`INSERT INTO cipa_eleicao_auditoria (tenant_id, eleicao_id, usuario_id, acao, detalhes) VALUES (${tenantId}::uuid, ${id(eleicaoId, "Eleição")}, ${id(usuarioId, "Usuário")}, 'ELEICAO_STATUS_ALTERADO', ${JSON.stringify({ statusAnterior: statusAtual, statusNovo })}::jsonb)`);
    return this.buscarEleicao(tenantId, eleicaoId);
  }

  async cancelarEleicao(tenantId: string, eleicaoId: string, motivo: string, usuarioId: string) {
    const electionId = id(eleicaoId, "Eleição");
    const rows = await prisma.$transaction(async (tx) => {
      const atual = await tx.$queryRaw<Array<{ status: string }>>(Prisma.sql`SELECT status FROM cipa_eleicao WHERE id = ${electionId} AND tenant_id = ${tenantId}::uuid FOR UPDATE`);
      if (!atual[0]) throw new AppError("Eleição não encontrada no ambiente atual.", 404);
      if (["RESULTADO_PUBLICADO", "ENCERRADA", "CANCELADA"].includes(atual[0].status)) throw new AppError("Esta eleição já foi encerrada e não pode ser cancelada.", 409);
      const updated = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`UPDATE cipa_eleicao SET status = 'CANCELADA', atualizado_por = ${id(usuarioId, "Usuário")}, atualizado_em = NOW() WHERE id = ${electionId} AND tenant_id = ${tenantId}::uuid RETURNING id`);
      await tx.$executeRaw(Prisma.sql`UPDATE cipa_portal_sessao SET revogado_em = NOW() WHERE tenant_id = ${tenantId}::uuid AND eleicao_id = ${electionId} AND usado_em IS NULL AND revogado_em IS NULL`);
      await tx.$executeRaw(Prisma.sql`INSERT INTO cipa_eleicao_auditoria (tenant_id, eleicao_id, usuario_id, acao, detalhes) VALUES (${tenantId}::uuid, ${electionId}, ${id(usuarioId, "Usuário")}, 'ELEICAO_CANCELADA', ${JSON.stringify({ motivo })}::jsonb)`);
      return updated;
    });
    if (!rows[0]) throw new AppError("Não foi possível cancelar a eleição.", 409);
    return this.buscarEleicao(tenantId, eleicaoId);
  }

  async encerrarVotacao(tenantId: string, eleicaoId: string, usuarioId: string) {
    const electionId = id(eleicaoId, "Eleição");
    const rows = await prisma.$queryRaw<Array<{ id: bigint; rodada: number; eleitores: bigint; participantes: bigint }>>(Prisma.sql`SELECT e.id, e.extensao_numero rodada, COUNT(DISTINCT ee.id) FILTER (WHERE ee.status = 'APTO')::bigint eleitores, COUNT(DISTINCT p.eleitor_id)::bigint participantes FROM cipa_eleicao e LEFT JOIN cipa_eleitor_eleicao ee ON ee.tenant_id = e.tenant_id AND ee.eleicao_id = e.id LEFT JOIN cipa_participacao p ON p.tenant_id = e.tenant_id AND p.eleicao_id = e.id AND p.status = 'REGISTRADA' WHERE e.id = ${electionId} AND e.tenant_id = ${tenantId}::uuid AND e.status = 'VOTACAO_ABERTA' GROUP BY e.id`);
    const election = rows[0]; if (!election) throw new AppError("A eleição não está com a votação aberta.", 409);
    const percentual = Number(election.eleitores) ? Number(election.participantes) / Number(election.eleitores) * 100 : 0;
    const minimo = election.rodada === 0 ? 50 : election.rodada === 1 ? 33.3334 : 0;
    if (percentual < minimo) throw new AppError(`A participação foi de ${percentual.toFixed(2)}%. Estenda a votação antes de encerrá-la, conforme a rodada ${election.rodada + 1} da regra configurada.`, 422);
    return this.alterarStatusEleicao(tenantId, eleicaoId, "VOTACAO_ABERTA", "VOTACAO_ENCERRADA", usuarioId);
  }

  async estenderVotacao(tenantId: string, eleicaoId: string, usuarioId: string, dias: number) {
    const electionId = id(eleicaoId, "Eleição");
    if (!Number.isInteger(dias) || dias < 1 || dias > 15) throw new AppError("A extensão deve ter entre 1 e 15 dias.", 422);
    const rows = await prisma.$queryRaw<Array<{ id: bigint; rodada: number }>>(Prisma.sql`UPDATE cipa_eleicao SET votacao_fim = COALESCE(votacao_fim, NOW()) + (${dias} * INTERVAL '1 day'), extensao_numero = extensao_numero + 1, ultima_extensao_em = NOW(), atualizado_por = ${id(usuarioId, "Usuário")}, atualizado_em = NOW() WHERE id = ${electionId} AND tenant_id = ${tenantId}::uuid AND status = 'VOTACAO_ABERTA' RETURNING id, extensao_numero rodada`);
    if (!rows[0]) throw new AppError("A votação não está aberta para extensão.", 409);
    await prisma.$executeRaw(Prisma.sql`INSERT INTO cipa_eleicao_auditoria (tenant_id, eleicao_id, usuario_id, acao, detalhes) VALUES (${tenantId}::uuid, ${electionId}, ${id(usuarioId, "Usuário")}, 'VOTACAO_ESTENDIDA', ${JSON.stringify({ dias, rodada: rows[0].rodada })}::jsonb)`);
    return this.buscarEleicao(tenantId, eleicaoId);
  }

  async obterDashboard(tenantId: string, eleicaoId: string) {
    const electionId = id(eleicaoId, "Eleição");
    await this.exigirEleicaoNoTenant(tenantId, eleicaoId);
    const [e, candidatos, participacao, votosPorHora, porUnidade, porSetor, porTurno] = await Promise.all([
      prisma.$queryRaw<Array<{ total: bigint; votaram: bigint }>>(Prisma.sql`SELECT COUNT(*) FILTER (WHERE status = 'APTO')::bigint total, COUNT(*) FILTER (WHERE status = 'APTO' AND EXISTS (SELECT 1 FROM cipa_participacao p WHERE p.tenant_id = e.tenant_id AND p.eleicao_id = e.eleicao_id AND p.eleitor_id = e.id AND p.status = 'REGISTRADA'))::bigint votaram FROM cipa_eleitor_eleicao e WHERE tenant_id = ${tenantId}::uuid AND eleicao_id = ${electionId}`),
      prisma.$queryRaw<Array<{ status: string; total: bigint }>>(Prisma.sql`SELECT status, COUNT(*)::bigint total FROM cipa_candidatura WHERE tenant_id = ${tenantId}::uuid AND eleicao_id = ${electionId} GROUP BY status`),
      prisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`SELECT COUNT(*)::bigint total FROM cipa_participacao WHERE tenant_id = ${tenantId}::uuid AND eleicao_id = ${electionId} AND status = 'REGISTRADA'`),
      prisma.$queryRaw<Array<{ periodo: string; total: bigint }>>(Prisma.sql`SELECT TO_CHAR(date_trunc('hour', votado_em), 'YYYY-MM-DD HH24:00:00') periodo, COUNT(*)::bigint total FROM cipa_participacao WHERE tenant_id = ${tenantId}::uuid AND eleicao_id = ${electionId} AND status = 'REGISTRADA' AND votado_em IS NOT NULL GROUP BY 1 ORDER BY 1`),
      prisma.$queryRaw<Array<{ dimensao: string; total: bigint; votaram: bigint }>>(Prisma.sql`SELECT COALESCE(NULLIF(TRIM(u.nome_fantasia), ''), 'Unidade ' || e.unidade_id::text) dimensao, COUNT(*) FILTER (WHERE e.status = 'APTO')::bigint total, COUNT(*) FILTER (WHERE e.status = 'APTO' AND EXISTS (SELECT 1 FROM cipa_participacao p WHERE p.tenant_id = e.tenant_id AND p.eleicao_id = e.eleicao_id AND p.eleitor_id = e.id AND p.status = 'REGISTRADA'))::bigint votaram FROM cipa_eleitor_eleicao e LEFT JOIN unidade_assistencial u ON u.id = e.unidade_id AND u.tenant_id = e.tenant_id WHERE e.tenant_id = ${tenantId}::uuid AND e.eleicao_id = ${electionId} GROUP BY COALESCE(NULLIF(TRIM(u.nome_fantasia), ''), 'Unidade ' || e.unidade_id::text) ORDER BY 1`),
      prisma.$queryRaw<Array<{ dimensao: string; total: bigint; votaram: bigint }>>(Prisma.sql`SELECT COALESCE(NULLIF(TRIM(setor), ''), 'Não informado') dimensao, COUNT(*) FILTER (WHERE status = 'APTO')::bigint total, COUNT(*) FILTER (WHERE status = 'APTO' AND EXISTS (SELECT 1 FROM cipa_participacao p WHERE p.tenant_id = e.tenant_id AND p.eleicao_id = e.eleicao_id AND p.eleitor_id = e.id AND p.status = 'REGISTRADA'))::bigint votaram FROM cipa_eleitor_eleicao e WHERE tenant_id = ${tenantId}::uuid AND eleicao_id = ${electionId} GROUP BY COALESCE(NULLIF(TRIM(setor), ''), 'Não informado') ORDER BY 1`),
      prisma.$queryRaw<Array<{ dimensao: string; total: bigint; votaram: bigint }>>(Prisma.sql`SELECT COALESCE(NULLIF(TRIM(turno), ''), 'Não informado') dimensao, COUNT(*) FILTER (WHERE status = 'APTO')::bigint total, COUNT(*) FILTER (WHERE status = 'APTO' AND EXISTS (SELECT 1 FROM cipa_participacao p WHERE p.tenant_id = e.tenant_id AND p.eleicao_id = e.eleicao_id AND p.eleitor_id = e.id AND p.status = 'REGISTRADA'))::bigint votaram FROM cipa_eleitor_eleicao e WHERE tenant_id = ${tenantId}::uuid AND eleicao_id = ${electionId} GROUP BY COALESCE(NULLIF(TRIM(turno), ''), 'Não informado') ORDER BY 1`)
    ]);
    const total = Number(e[0]?.total ?? 0); const votaram = Number(e[0]?.votaram ?? 0);
    const porStatus = Object.fromEntries(candidatos.map((item) => [item.status, Number(item.total)]));
    const agrupar = (rows: Array<{ dimensao: string; total: bigint; votaram: bigint }>) => rows.map((item) => ({ dimensao: item.dimensao, totalAptos: Number(item.total), votosRealizados: Number(item.votaram), aindaNaoVotaram: Number(item.total) - Number(item.votaram), percentualParticipacao: Number(item.total) ? Number(((Number(item.votaram) / Number(item.total)) * 100).toFixed(2)) : 0 }));
    return { eleicaoId, eleitores: { totalAptos: total, votosRealizados: votaram, aindaNaoVotaram: total - votaram, percentualParticipacao: total ? Number(((votaram / total) * 100).toFixed(2)) : 0 }, candidatos: { inscritos: Object.values(porStatus).reduce((a, b) => a + b, 0), aguardandoAnalise: porStatus.EM_ANALISE ?? 0, aprovados: porStatus.APROVADA ?? 0, reprovados: porStatus.REPROVADA ?? 0, desistentes: porStatus.DESISTENTE ?? 0, porStatus }, participacao: { total: Number(participacao[0]?.total ?? 0), porHora: votosPorHora.map((item) => ({ periodo: item.periodo, total: Number(item.total) })), porUnidade: agrupar(porUnidade), porSetor: agrupar(porSetor), porTurno: agrupar(porTurno) } };
  }

  async listarComissao(tenantId: string, eleicaoId: string) {
    await this.exigirEleicaoNoTenant(tenantId, eleicaoId);
    const rows = await prisma.$queryRaw<Record<string, unknown>[]>(Prisma.sql`SELECT id, nome, funcao, colaborador_id, ativo, criado_em FROM cipa_comissao_eleitoral_membro WHERE tenant_id = ${tenantId}::uuid AND eleicao_id = ${id(eleicaoId, "Eleição")} AND ativo = TRUE ORDER BY criado_em`);
    return { membros: rows.map((row) => ({ id: String(row.id), nome: row.nome, funcao: row.funcao, colaboradorId: row.colaborador_id ? String(row.colaborador_id) : undefined, ativo: row.ativo, criadoEm: row.criado_em })) };
  }

  async listarAuditoria(tenantId: string, eleicaoId: string) {
    await this.exigirEleicaoNoTenant(tenantId, eleicaoId);
    const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`SELECT id, acao, resultado, operacao_id, detalhes, usuario_id, criado_em FROM cipa_eleicao_auditoria WHERE tenant_id = ${tenantId}::uuid AND eleicao_id = ${id(eleicaoId, "Eleição")} ORDER BY criado_em DESC LIMIT 500`);
    return { auditoria: rows.map((row) => ({ id: String(row.id), acao: row.acao, resultado: row.resultado, operacaoId: row.operacao_id, detalhes: row.detalhes, usuarioId: row.usuario_id ? String(row.usuario_id) : undefined, criadoEm: row.criado_em })) };
  }

  async obterPortalPublico(identificador: string) {
    const elections = await prisma.$queryRaw<Array<{ id: bigint; nome: string; gestao: string; status: string; votacao_inicio: Date | null; votacao_fim: Date | null }>>(Prisma.sql`SELECT id, nome, gestao, status, votacao_inicio, votacao_fim FROM cipa_eleicao WHERE identificador_publico = ${identificador.trim()} LIMIT 1`);
    const election = elections[0];
    if (!election) throw new AppError("Eleição não encontrada.", 404);
    const candidatosPublicados = ["ELEICAO_PRONTA", "VOTACAO_ABERTA", "VOTACAO_ENCERRADA", "APURACAO", "RESULTADO_PUBLICADO", "ENCERRADA"].includes(election.status);
    const candidates = candidatosPublicados ? await prisma.$queryRaw<Array<{ id: bigint; numero: number; nome_publico: string; cargo_publico: string | null; setor_publico: string | null; apresentacao: string | null; foto_caminho_logico: string | null }>>(Prisma.sql`SELECT id, numero, nome_publico, cargo_publico, setor_publico, apresentacao, foto_caminho_logico FROM cipa_candidatura WHERE eleicao_id = ${election.id} AND status = 'APROVADA' ORDER BY numero ASC`) : [];
    return { eleicao: { nome: election.nome, gestao: election.gestao, status: election.status, votacaoInicio: election.votacao_inicio, votacaoFim: election.votacao_fim }, candidatos: candidates.map((candidate) => ({ id: String(candidate.id), numero: candidate.numero, nomePublico: candidate.nome_publico, cargoPublico: candidate.cargo_publico, setorPublico: candidate.setor_publico, apresentacao: candidate.apresentacao, fotoUrl: candidate.foto_caminho_logico ? `/api/rh/cipa/portal/${encodeURIComponent(identificador.trim())}/candidatos/${String(candidate.id)}/foto` : undefined })) };
  }

  async adicionarComissao(tenantId: string, eleicaoId: string, nome: string, funcao: string, colaboradorId: string | undefined, usuarioId: string) {
    const electionId = id(eleicaoId, "Eleição");
    const memberId = await prisma.$transaction(async (tx) => {
      const election = await tx.$queryRaw<Array<{ status: string }>>(Prisma.sql`SELECT status FROM cipa_eleicao WHERE id = ${electionId} AND tenant_id = ${tenantId}::uuid LIMIT 1`);
      if (!election[0]) throw new AppError("Eleição não encontrada no ambiente atual.", 404);
      if (!["CONFIGURACAO", "INSCRICOES_ABERTAS", "INSCRICOES_ENCERRADAS"].includes(election[0].status)) throw new AppError("A comissão só pode ser alterada antes da abertura da votação.", 409);
      if (colaboradorId) {
        const collaborator = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`SELECT id FROM rh_colaborador WHERE id = ${id(colaboradorId, "Colaborador")} AND tenant_id = ${tenantId}::uuid LIMIT 1`);
        if (!collaborator[0]) throw new AppError("O colaborador informado não pertence à instituição atual.", 403);
      }
      const rows = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`INSERT INTO cipa_comissao_eleitoral_membro (tenant_id, eleicao_id, colaborador_id, nome, funcao, usuario_id) VALUES (${tenantId}::uuid, ${electionId}, ${colaboradorId ? id(colaboradorId, "Colaborador") : null}, ${nome}, ${funcao}, ${id(usuarioId, "Usuário")}) RETURNING id`);
      await tx.$executeRaw(Prisma.sql`INSERT INTO cipa_eleicao_auditoria (tenant_id, eleicao_id, usuario_id, acao, detalhes) VALUES (${tenantId}::uuid, ${electionId}, ${id(usuarioId, "Usuário")}, 'COMISSAO_MEMBRO_ADICIONADO', ${JSON.stringify({ nome, funcao })}::jsonb)`);
      return rows[0].id;
    });
    return { id: String(memberId), nome, funcao, colaboradorId };
  }

  async removerComissao(tenantId: string, eleicaoId: string, membroId: string, usuarioId: string) {
    const electionId = id(eleicaoId, "Eleição");
    const memberId = id(membroId, "Membro da comissão");
    const rows = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`UPDATE cipa_comissao_eleitoral_membro SET ativo = FALSE, atualizado_em = NOW() WHERE id = ${memberId} AND eleicao_id = ${electionId} AND tenant_id = ${tenantId}::uuid AND ativo = TRUE AND EXISTS (SELECT 1 FROM cipa_eleicao WHERE id = ${electionId} AND tenant_id = ${tenantId}::uuid AND status IN ('CONFIGURACAO', 'INSCRICOES_ABERTAS', 'INSCRICOES_ENCERRADAS')) RETURNING id`);
    if (!rows[0]) throw new AppError("O membro não existe ou não pode mais ser removido nesta etapa.", 409);
    await prisma.$executeRaw(Prisma.sql`INSERT INTO cipa_eleicao_auditoria (tenant_id, eleicao_id, usuario_id, acao, detalhes) VALUES (${tenantId}::uuid, ${electionId}, ${id(usuarioId, "Usuário")}, 'COMISSAO_MEMBRO_REMOVIDO', ${JSON.stringify({ membroId })}::jsonb)`);
    return { id: membroId, removido: true };
  }

  async publicarEleicao(tenantId: string, eleicaoId: string, usuarioId: string) {
    const electionId = id(eleicaoId, "Eleição");
    const [eleitores, aprovados, pendentes, comissao] = await Promise.all([
      prisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`SELECT COUNT(*)::bigint total FROM cipa_eleitor_eleicao WHERE tenant_id = ${tenantId}::uuid AND eleicao_id = ${electionId} AND status = 'APTO'`),
      prisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`SELECT COUNT(*)::bigint total FROM cipa_candidatura WHERE tenant_id = ${tenantId}::uuid AND eleicao_id = ${electionId} AND status = 'APROVADA'`),
      prisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`SELECT COUNT(*)::bigint total FROM cipa_candidatura WHERE tenant_id = ${tenantId}::uuid AND eleicao_id = ${electionId} AND status = 'EM_ANALISE'`),
      prisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`SELECT COUNT(*)::bigint total FROM cipa_comissao_eleitoral_membro WHERE tenant_id = ${tenantId}::uuid AND eleicao_id = ${electionId} AND ativo = TRUE`)
    ]);
    const missing: string[] = []; if (!Number(eleitores[0]?.total)) missing.push("eleitores aptos"); if (!Number(aprovados[0]?.total)) missing.push("candidatos aprovados"); if (Number(pendentes[0]?.total)) missing.push("análise das candidaturas"); if (!Number(comissao[0]?.total)) missing.push("comissão eleitoral");
    if (missing.length) throw new AppError(`Não é possível publicar. Conclua: ${missing.join(", ")}.`, 422);
    return this.alterarStatusEleicao(tenantId, eleicaoId, "INSCRICOES_ENCERRADAS", "ELEICAO_PRONTA", usuarioId);
  }

  async gerarZeresima(tenantId: string, eleicaoId: string, usuarioId: string) {
    const electionId = id(eleicaoId, "Eleição");
    const result = await prisma.$transaction(async (tx) => {
      const election = await tx.$queryRaw<Array<{ status: string }>>(Prisma.sql`SELECT status FROM cipa_eleicao WHERE id = ${electionId} AND tenant_id = ${tenantId}::uuid FOR UPDATE`);
      if (election[0]?.status !== "ELEICAO_PRONTA") throw new AppError("Publique a eleição antes de gerar a zerésima.", 409);
      const votes = await tx.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`SELECT COUNT(*)::bigint total FROM cipa_voto WHERE tenant_id = ${tenantId}::uuid AND eleicao_id = ${electionId}`);
      if (Number(votes[0]?.total)) throw new AppError("A urna não está vazia e a zerésima não pode ser gerada.", 409);
      const integrity = hashToken(`${tenantId}:${eleicaoId}:ZERESIMA:0`);
      const rows = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`INSERT INTO cipa_eleicao_zeresima (tenant_id, eleicao_id, votos_iniciais, integridade_hash, gerada_por) VALUES (${tenantId}::uuid, ${electionId}, 0, ${integrity}, ${id(usuarioId, "Usuário")}) RETURNING id`);
      await tx.$executeRaw(Prisma.sql`INSERT INTO cipa_eleicao_auditoria (tenant_id, eleicao_id, usuario_id, acao, detalhes) VALUES (${tenantId}::uuid, ${electionId}, ${id(usuarioId, "Usuário")}, 'ZERESIMA_GERADA', ${JSON.stringify({ integridade: integrity })}::jsonb)`);
      return rows[0].id;
    });
    return { id: String(result), eleicaoId: String(electionId), votosIniciais: 0 };
  }

  async abrirVotacao(tenantId: string, eleicaoId: string, usuarioId: string) {
    const electionId = id(eleicaoId, "Eleição");
    const schedule = await prisma.$queryRaw<Array<{ status: string; votacao_inicio: Date | null; votacao_fim: Date | null }>>(Prisma.sql`SELECT status, votacao_inicio, votacao_fim FROM cipa_eleicao WHERE id = ${electionId} AND tenant_id = ${tenantId}::uuid LIMIT 1`);
    if (!schedule[0]) throw new AppError("Eleição não encontrada no ambiente atual.", 404);
    const agora = Date.now();
    if (schedule[0].votacao_inicio && agora < schedule[0].votacao_inicio.getTime()) throw new AppError("A votação ainda não começou conforme o cronograma configurado.", 409);
    if (schedule[0].votacao_fim && agora > schedule[0].votacao_fim.getTime()) throw new AppError("O período de votação já terminou conforme o cronograma configurado.", 409);
    const zeresis = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`SELECT id FROM cipa_eleicao_zeresima WHERE tenant_id = ${tenantId}::uuid AND eleicao_id = ${electionId} LIMIT 1`);
    if (!zeresis[0]) throw new AppError("Gere a zerésima antes de abrir a votação.", 422);
    return this.alterarStatusEleicao(tenantId, eleicaoId, "ELEICAO_PRONTA", "VOTACAO_ABERTA", usuarioId);
  }

  async registrarDesempate(tenantId: string, eleicaoId: string, itens: Array<{ candidaturaId: string; ordem: number; criterio: string; justificativa: string }>, usuarioId: string) {
    const electionId = id(eleicaoId, "Eleição");
    const ordens = new Set<number>(); if (itens.some((item) => ordens.has(item.ordem) || !ordens.add(item.ordem))) throw new AppError("Cada posição do desempate deve ser única.", 422);
    await prisma.$transaction(async (tx) => {
      const election = await tx.$queryRaw<Array<{ status: string }>>(Prisma.sql`SELECT status FROM cipa_eleicao WHERE id = ${electionId} AND tenant_id = ${tenantId}::uuid FOR UPDATE`);
      if (!election[0]) throw new AppError("Eleição não encontrada no ambiente atual.", 404);
      if (!["VOTACAO_ENCERRADA", "APURACAO"].includes(election[0].status)) throw new AppError("O desempate só pode ser registrado após o encerramento da votação.", 409);
      for (const item of itens) {
        const candidatura = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`SELECT id FROM cipa_candidatura WHERE id = ${id(item.candidaturaId, "Candidatura")} AND tenant_id = ${tenantId}::uuid AND eleicao_id = ${electionId} AND status = 'APROVADA' LIMIT 1`);
        if (!candidatura[0]) throw new AppError("Uma das candidaturas do desempate não pertence a esta eleição.", 422);
        await tx.$executeRaw(Prisma.sql`INSERT INTO cipa_eleicao_desempate (tenant_id, eleicao_id, candidatura_id, ordem, criterio, justificativa, usuario_id) VALUES (${tenantId}::uuid, ${electionId}, ${id(item.candidaturaId, "Candidatura")}, ${item.ordem}, ${item.criterio}, ${item.justificativa}, ${id(usuarioId, "Usuário")})`);
      }
      await tx.$executeRaw(Prisma.sql`INSERT INTO cipa_eleicao_auditoria (tenant_id, eleicao_id, usuario_id, acao, detalhes) VALUES (${tenantId}::uuid, ${electionId}, ${id(usuarioId, "Usuário")}, 'DESEMPATE_REGISTRADO', ${JSON.stringify({ itens: itens.map((item) => ({ candidaturaId: item.candidaturaId, ordem: item.ordem, criterio: item.criterio })) })}::jsonb)`);
    });
    return { eleicaoId, itensRegistrados: itens.length };
  }

  async apurar(tenantId: string, eleicaoId: string, usuarioId: string) {
    const electionId = id(eleicaoId, "Eleição");
    return prisma.$transaction(async (tx) => {
      const election = await tx.$queryRaw<Array<{ status: string; extensao_numero: number; titulares: number; suplentes: number; regra_desempate: string }>>(Prisma.sql`SELECT e.status, e.extensao_numero, c.titulares, c.suplentes, c.regra_desempate FROM cipa_eleicao e INNER JOIN cipa_eleicao_configuracao c ON c.eleicao_id = e.id AND c.tenant_id = e.tenant_id WHERE e.id = ${electionId} AND e.tenant_id = ${tenantId}::uuid FOR UPDATE`);
      if (election[0]?.status !== "VOTACAO_ENCERRADA") throw new AppError("A apuração só pode ocorrer após o encerramento da votação.", 409);
      const totals = await tx.$queryRaw<Array<{ eleitores: bigint; participantes: bigint; votos: bigint; validos: bigint; brancos: bigint; nulos: bigint }>>(Prisma.sql`SELECT (SELECT COUNT(*) FROM cipa_eleitor_eleicao WHERE tenant_id = ${tenantId}::uuid AND eleicao_id = ${electionId} AND status = 'APTO')::bigint eleitores, (SELECT COUNT(*) FROM cipa_participacao WHERE tenant_id = ${tenantId}::uuid AND eleicao_id = ${electionId} AND status = 'REGISTRADA')::bigint participantes, COUNT(*)::bigint votos, COUNT(*) FILTER (WHERE tipo = 'VALIDO')::bigint validos, COUNT(*) FILTER (WHERE tipo = 'BRANCO')::bigint brancos, COUNT(*) FILTER (WHERE tipo = 'NULO')::bigint nulos FROM cipa_voto WHERE tenant_id = ${tenantId}::uuid AND eleicao_id = ${electionId}`);
      const t = totals[0]; const participacao = Number(t.eleitores) ? Number(t.participantes) / Number(t.eleitores) * 100 : 0;
      const minimoParticipacao = election[0].extensao_numero === 0 ? 50 : election[0].extensao_numero === 1 ? 33.3334 : 0;
      if (participacao < minimoParticipacao) throw new AppError(`A participação foi de ${participacao.toFixed(2)}%, abaixo do mínimo de ${minimoParticipacao.toFixed(2)}% para esta rodada. Estenda a votação antes de apurar.`, 422);
      const candidates = await tx.$queryRaw<Array<{ id: bigint; numero: number; nome_publico: string; data_admissao_estabelecimento: Date | null; desempate_ordem: number | null; total: bigint }>>(Prisma.sql`SELECT c.id, c.numero, c.nome_publico, c.data_admissao_estabelecimento, d.ordem AS desempate_ordem, COUNT(v.id)::bigint total FROM cipa_candidatura c LEFT JOIN cipa_voto v ON v.candidatura_id = c.id AND v.tenant_id = c.tenant_id AND v.eleicao_id = c.eleicao_id AND v.tipo = 'VALIDO' LEFT JOIN cipa_eleicao_desempate d ON d.candidatura_id = c.id AND d.tenant_id = c.tenant_id AND d.eleicao_id = c.eleicao_id WHERE c.tenant_id = ${tenantId}::uuid AND c.eleicao_id = ${electionId} AND c.status = 'APROVADA' GROUP BY c.id, d.ordem ORDER BY total DESC, c.data_admissao_estabelecimento ASC NULLS LAST, d.ordem ASC NULLS LAST, c.numero ASC`);
      for (let index = 1; index < candidates.length; index += 1) {
        const anterior = candidates[index - 1]; const atual = candidates[index];
        const mesmaAdmissao = anterior.data_admissao_estabelecimento?.getTime() === atual.data_admissao_estabelecimento?.getTime();
        if (anterior.total === atual.total && mesmaAdmissao && (!anterior.desempate_ordem || !atual.desempate_ordem)) throw new AppError("Há empate que não foi resolvido pelo critério configurado. A comissão eleitoral deve registrar o desempate auditado antes da apuração oficial.", 422);
      }
      const results = candidates.map((c, index) => ({ candidaturaId: String(c.id), numero: c.numero, nome: c.nome_publico, votos: Number(c.total), classificacao: index < election[0].titulares ? "TITULAR" : index < election[0].titulares + election[0].suplentes ? "SUPLENTE" : "NAO_ELEITO" }));
      const hash = hashToken(JSON.stringify({ tenantId, eleicaoId, totals: { eleitores: Number(t.eleitores), participantes: Number(t.participantes), votos: Number(t.votos), validos: Number(t.validos), brancos: Number(t.brancos), nulos: Number(t.nulos) }, results }));
      await tx.$executeRaw(Prisma.sql`INSERT INTO cipa_eleicao_apuracao (tenant_id, eleicao_id, total_eleitores, total_votos, total_participantes, votos_validos, votos_brancos, votos_nulos, participacao_percentual, resultado_json, criterios_json, integridade_hash, apurada_por) VALUES (${tenantId}::uuid, ${electionId}, ${Number(t.eleitores)}, ${Number(t.votos)}, ${Number(t.participantes)}, ${Number(t.validos)}, ${Number(t.brancos)}, ${Number(t.nulos)}, ${participacao.toFixed(4)}::numeric, ${JSON.stringify(results)}::jsonb, ${JSON.stringify({ regraDesempate: election[0].regra_desempate })}::jsonb, ${hash}, ${id(usuarioId, "Usuário")}) ON CONFLICT (tenant_id, eleicao_id) DO UPDATE SET total_eleitores = EXCLUDED.total_eleitores, total_votos = EXCLUDED.total_votos, total_participantes = EXCLUDED.total_participANTES, votos_validos = EXCLUDED.votos_validos, votos_brancos = EXCLUDED.votos_brancos, votos_nulos = EXCLUDED.votos_nulos, participacao_percentual = EXCLUDED.participacao_percentual, resultado_json = EXCLUDED.resultado_json, criterios_json = EXCLUDED.criterios_json, integridade_hash = EXCLUDED.integridade_hash, apurada_por = EXCLUDED.apurada_por, apurada_em = NOW()`);
      await tx.$executeRaw(Prisma.sql`UPDATE cipa_eleicao SET status = 'APURACAO', atualizado_por = ${id(usuarioId, "Usuário")}, atualizado_em = NOW() WHERE id = ${electionId} AND tenant_id = ${tenantId}::uuid`);
      await tx.$executeRaw(Prisma.sql`INSERT INTO cipa_eleicao_auditoria (tenant_id, eleicao_id, usuario_id, acao, detalhes) VALUES (${tenantId}::uuid, ${electionId}, ${id(usuarioId, "Usuário")}, 'ELEICAO_APURADA', ${JSON.stringify({ hash })}::jsonb)`);
      return { totalEleitores: Number(t.eleitores), totalVotos: Number(t.votos), totalParticipantes: Number(t.participantes), votosValidos: Number(t.validos), votosBrancos: Number(t.brancos), votosNulos: Number(t.nulos), participacaoPercentual: Number(participacao.toFixed(2)), resultados: results, integridadeHash: hash };
    });
  }

  async buscarApuracao(tenantId: string, eleicaoId: string) {
    const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`SELECT * FROM cipa_eleicao_apuracao WHERE tenant_id = ${tenantId}::uuid AND eleicao_id = ${id(eleicaoId, "Eleição")} LIMIT 1`);
    if (!rows[0]) throw new AppError("A apuração ainda não foi realizada.", 404);
    const row = rows[0];
    return { eleicaoId: String(row.eleicao_id), totalEleitores: Number(row.total_eleitores), totalVotos: Number(row.total_votos), totalParticipantes: Number(row.total_participantes), votosValidos: Number(row.votos_validos), votosBrancos: Number(row.votos_brancos), votosNulos: Number(row.votos_nulos), participacaoPercentual: Number(row.participacao_percentual), resultados: row.resultado_json, criterios: row.criterios_json, integridadeHash: row.integridade_hash, apuradaEm: row.apurada_em };
  }

  async publicarResultado(tenantId: string, eleicaoId: string, usuarioId: string) {
    const result = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`UPDATE cipa_eleicao SET status = 'RESULTADO_PUBLICADO', atualizado_por = ${id(usuarioId, "Usuário")}, atualizado_em = NOW() WHERE id = ${id(eleicaoId, "Eleição")} AND tenant_id = ${tenantId}::uuid AND status = 'APURACAO' AND EXISTS (SELECT 1 FROM cipa_eleicao_apuracao a WHERE a.eleicao_id = cipa_eleicao.id AND a.tenant_id = cipa_eleicao.tenant_id) RETURNING id`);
      if (!rows[0]) throw new AppError("A eleição precisa estar apurada antes da publicação do resultado.", 409);
      await tx.$executeRaw(Prisma.sql`INSERT INTO cipa_eleicao_auditoria (tenant_id, eleicao_id, usuario_id, acao, detalhes) VALUES (${tenantId}::uuid, ${id(eleicaoId, "Eleição")}, ${id(usuarioId, "Usuário")}, 'RESULTADO_PUBLICADO', '{}'::jsonb)`);
      return rows[0].id;
    });
    return this.buscarEleicao(tenantId, String(result));
  }

  async autenticarPortal(identificador: string, cpf: string, nascimento: string, finalidade: "CANDIDATURA" | "VOTACAO") {
    const eleicoes = await prisma.$queryRaw<Array<{ id: bigint; tenant_id: string; nome: string; gestao: string; status: string; unidade_id: bigint; inscricoes_inicio: Date | null; inscricoes_fim: Date | null; votacao_inicio: Date | null; votacao_fim: Date | null }>>(Prisma.sql`SELECT id, tenant_id, nome, gestao, status, unidade_id, inscricoes_inicio, inscricoes_fim, votacao_inicio, votacao_fim FROM cipa_eleicao WHERE identificador_publico = ${identificador.trim()} LIMIT 1`);
    const eleicao = eleicoes[0];
    if (!eleicao) throw new AppError("Não encontramos essa eleição. Confira o link recebido.", 404);
    const agora = Date.now();
    if (finalidade === "CANDIDATURA" && (eleicao.status !== "INSCRICOES_ABERTAS" || (eleicao.inscricoes_inicio && agora < eleicao.inscricoes_inicio.getTime()) || (eleicao.inscricoes_fim && agora > eleicao.inscricoes_fim.getTime()))) throw new AppError("O período de candidatura não está aberto nesta eleição.", 409);
    if (finalidade === "VOTACAO" && (eleicao.status !== "VOTACAO_ABERTA" || (eleicao.votacao_inicio && agora < eleicao.votacao_inicio.getTime()) || (eleicao.votacao_fim && agora > eleicao.votacao_fim.getTime()))) throw new AppError("A votação não está aberta neste momento.", 409);
    const colaboradores = finalidade === "VOTACAO"
      ? await prisma.$queryRaw<Array<{ id: bigint; nome_completo: string }>>(Prisma.sql`SELECT c.id, c.nome_completo FROM cipa_eleitor_eleicao e INNER JOIN rh_colaborador c ON c.id = e.colaborador_id AND c.tenant_id = e.tenant_id WHERE e.tenant_id = ${eleicao.tenant_id}::uuid AND e.eleicao_id = ${eleicao.id} AND e.cpf = ${cpf} AND e.data_nascimento = ${dataNascimento(nascimento)}::date AND e.status = 'APTO' LIMIT 1`)
      : await prisma.$queryRaw<Array<{ id: bigint; nome_completo: string }>>(Prisma.sql`SELECT id, nome_completo FROM rh_colaborador WHERE tenant_id = ${eleicao.tenant_id}::uuid AND unidade_id = ${eleicao.unidade_id} AND cpf = ${cpf} AND data_nascimento = ${dataNascimento(nascimento)}::date AND status IN ('ATIVO', 'AFASTADO') LIMIT 1`);
    const colaborador = colaboradores[0];
    if (!colaborador) throw new AppError("Não encontramos seu cadastro como participante desta eleição. Confira seu CPF e sua data de nascimento. Se o problema continuar, procure o RH.", 422);
    if (finalidade === "VOTACAO") {
      const participacoes = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`SELECT id FROM cipa_participacao WHERE tenant_id = ${eleicao.tenant_id}::uuid AND eleicao_id = ${eleicao.id} AND eleitor_id = (SELECT id FROM cipa_eleitor_eleicao WHERE tenant_id = ${eleicao.tenant_id}::uuid AND eleicao_id = ${eleicao.id} AND colaborador_id = ${colaborador.id} LIMIT 1) LIMIT 1`);
      if (participacoes[0]) throw new AppError("Seu voto já foi registrado nesta eleição.", 409);
    }
    const token = randomBytes(32).toString("hex");
    const expiraEm = new Date(Date.now() + (finalidade === "VOTACAO" ? 15 : 30) * 60_000);
    await prisma.$executeRaw(Prisma.sql`INSERT INTO cipa_portal_sessao (tenant_id, eleicao_id, colaborador_id, finalidade, token_hash, expira_em) VALUES (${eleicao.tenant_id}::uuid, ${eleicao.id}, ${colaborador.id}, ${finalidade}, ${hashToken(token)}, ${expiraEm})`);
    return { token, colaborador: { nome: colaborador.nome_completo.split(/\s+/u)[0] }, eleicao: { identificadorPublico: identificador, nome: eleicao.nome, gestao: eleicao.gestao }, expiraEm: expiraEm.toISOString() };
  }

  async obterUrna(token: string, identificador: string) {
    const hash = hashToken(token);
    const sessoes = await prisma.$queryRaw<Array<{ tenant_id: string; eleicao_id: bigint; colaborador_id: bigint; expira_em: Date }>>(Prisma.sql`SELECT tenant_id, eleicao_id, colaborador_id, expira_em FROM cipa_portal_sessao WHERE token_hash = ${hash} AND finalidade = 'VOTACAO' AND usado_em IS NULL AND revogado_em IS NULL AND expira_em > NOW() LIMIT 1`);
    const sessao = sessoes[0];
    if (!sessao) throw new AppError("Seu acesso expirou. Inicie a votação novamente.", 401);
    const [elections, candidates] = await Promise.all([
      prisma.$queryRaw<Array<{ identificador_publico: string; nome: string; gestao: string; votacao_inicio: Date | null; votacao_fim: Date | null; votos_por_eleitor: number; permite_voto_branco: boolean; permite_voto_nulo: boolean }>>(Prisma.sql`SELECT e.identificador_publico, e.nome, e.gestao, e.votacao_inicio, e.votacao_fim, c.votos_por_eleitor, c.permite_voto_branco, c.permite_voto_nulo FROM cipa_eleicao e INNER JOIN cipa_eleicao_configuracao c ON c.eleicao_id = e.id AND c.tenant_id = e.tenant_id WHERE e.id = ${sessao.eleicao_id} AND e.tenant_id = ${sessao.tenant_id}::uuid AND e.status = 'VOTACAO_ABERTA' LIMIT 1`),
      prisma.$queryRaw<Array<{ id: bigint; numero: number; nome_publico: string; cargo_publico: string | null; setor_publico: string | null; foto_caminho_logico: string | null; apresentacao: string | null }>>(Prisma.sql`SELECT id, numero, nome_publico, cargo_publico, setor_publico, foto_caminho_logico, apresentacao FROM cipa_candidatura WHERE tenant_id = ${sessao.tenant_id}::uuid AND eleicao_id = ${sessao.eleicao_id} AND status = 'APROVADA' ORDER BY numero ASC`)
    ]);
    if (!elections[0] || elections[0].identificador_publico !== identificador.trim() || (elections[0].votacao_inicio && Date.now() < elections[0].votacao_inicio.getTime()) || (elections[0].votacao_fim && Date.now() > elections[0].votacao_fim.getTime())) throw new AppError("A votação não está aberta neste momento.", 409);
    return { eleicao: elections[0], candidatos: candidates.map((candidate) => ({ id: String(candidate.id), numero: candidate.numero, nome_publico: candidate.nome_publico, cargo_publico: candidate.cargo_publico, setor_publico: candidate.setor_publico, apresentacao: candidate.apresentacao, foto_url: candidate.foto_caminho_logico ? `/api/rh/cipa/portal/${encodeURIComponent(identificador)}/candidatos/${String(candidate.id)}/foto` : undefined })) };
  }

  async obterContextoFotoCandidaturaPortal(identificador: string, candidaturaId: string) {
    const rows = await prisma.$queryRaw<Array<{ tenant_id: string; caminho: string | null }>>(Prisma.sql`SELECT e.tenant_id, c.foto_caminho_logico AS caminho FROM cipa_candidatura c INNER JOIN cipa_eleicao e ON e.id = c.eleicao_id AND e.tenant_id = c.tenant_id AND e.identificador_publico = ${identificador.trim()} WHERE c.id = ${id(candidaturaId, "Candidatura")} AND c.status = 'APROVADA' LIMIT 1`);
    if (!rows[0]?.caminho) throw new AppError("Foto do candidato não encontrada.", 404);
    return { tenantId: rows[0].tenant_id, caminho: rows[0].caminho };
  }

  async registrarVoto(token: string, identificador: string, tipo: "VALIDO" | "BRANCO" | "NULO", candidaturaIds: string[] | string | undefined) {
    const idsSelecionados = candidaturaIds ? (Array.isArray(candidaturaIds) ? candidaturaIds : [candidaturaIds]) : [];
    const hash = hashToken(token);
    try {
      const protocolo = await prisma.$transaction(async (tx) => {
        const sessoes = await tx.$queryRaw<Array<{ tenant_id: string; eleicao_id: bigint; eleitor_id: bigint; colaborador_id: bigint }>>(Prisma.sql`SELECT s.tenant_id, s.eleicao_id, e.id AS eleitor_id, s.colaborador_id FROM cipa_portal_sessao s INNER JOIN cipa_eleicao e0 ON e0.id = s.eleicao_id AND e0.tenant_id = s.tenant_id AND e0.identificador_publico = ${identificador.trim()} INNER JOIN cipa_eleitor_eleicao e ON e.tenant_id = s.tenant_id AND e.eleicao_id = s.eleicao_id AND e.colaborador_id = s.colaborador_id WHERE s.token_hash = ${hash} AND s.finalidade = 'VOTACAO' AND s.usado_em IS NULL AND s.revogado_em IS NULL AND s.expira_em > NOW() FOR UPDATE`);
        const sessao = sessoes[0];
        if (!sessao) throw new AppError("Seu acesso expirou. Inicie a votação novamente.", 401);
        const election = await tx.$queryRaw<Array<{ status: string; votos_por_eleitor: number; permite_voto_branco: boolean; permite_voto_nulo: boolean; votacao_inicio: Date | null; votacao_fim: Date | null }>>(Prisma.sql`SELECT e.status, e.votacao_inicio, e.votacao_fim, c.votos_por_eleitor, c.permite_voto_branco, c.permite_voto_nulo FROM cipa_eleicao e INNER JOIN cipa_eleicao_configuracao c ON c.eleicao_id = e.id AND c.tenant_id = e.tenant_id WHERE e.id = ${sessao.eleicao_id} AND e.tenant_id = ${sessao.tenant_id}::uuid LIMIT 1`);
        if (election[0]?.status !== "VOTACAO_ABERTA" || (election[0].votacao_inicio && Date.now() < election[0].votacao_inicio.getTime()) || (election[0].votacao_fim && Date.now() > election[0].votacao_fim.getTime())) throw new AppError("A votação não está aberta neste momento.", 409);
        if (new Set(idsSelecionados).size !== idsSelecionados.length) throw new AppError("Não repita candidatos no mesmo voto.", 422);
        if (tipo === "VALIDO" && idsSelecionados.length === 0) throw new AppError("Selecione pelo menos um candidato.", 422);
        if (tipo !== "VALIDO" && idsSelecionados.length > 0) throw new AppError("O voto branco ou nulo não possui candidato.", 422);
        if (tipo === "BRANCO" && !election[0]?.permite_voto_branco) throw new AppError("O voto em branco não está habilitado nesta eleição.", 422);
        if (tipo === "NULO" && !election[0]?.permite_voto_nulo) throw new AppError("O voto nulo não está habilitado nesta eleição.", 422);
        if (tipo === "VALIDO") {
          if (idsSelecionados.length > Number(election[0]?.votos_por_eleitor ?? 1)) throw new AppError(`Você pode selecionar no máximo ${Number(election[0]?.votos_por_eleitor ?? 1)} candidato(s).`, 422);
          const candidateIds = idsSelecionados.map((candidateId) => id(candidateId, "Candidatura"));
          const candidates = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`SELECT id FROM cipa_candidatura WHERE id IN (${Prisma.join(candidateIds)}) AND tenant_id = ${sessao.tenant_id}::uuid AND eleicao_id = ${sessao.eleicao_id} AND status = 'APROVADA'`);
          if (candidates.length !== candidateIds.length) throw new AppError("Um dos candidatos selecionados não está disponível nesta eleição.", 422);
        }
        const protocoloGerado = `CIPA-${new Date().getFullYear()}-${randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;
        await tx.$executeRaw(Prisma.sql`INSERT INTO cipa_participacao (tenant_id, eleicao_id, eleitor_id, protocolo, status, votado_em, sessao_encerrada_em) VALUES (${sessao.tenant_id}::uuid, ${sessao.eleicao_id}, ${sessao.eleitor_id}, ${protocoloGerado}, 'REGISTRADA', NOW(), NOW())`);
        if (tipo === "VALIDO") {
          for (const candidaturaId of idsSelecionados.map((value) => id(value, "Candidatura"))) {
            await tx.$executeRaw(Prisma.sql`INSERT INTO cipa_voto (tenant_id, eleicao_id, candidatura_id, tipo, integridade_hash) VALUES (${sessao.tenant_id}::uuid, ${sessao.eleicao_id}, ${candidaturaId}, ${tipo}, ${hashToken(`${sessao.eleicao_id}:${protocoloGerado}:${candidaturaId.toString()}`)})`);
          }
        } else {
          await tx.$executeRaw(Prisma.sql`INSERT INTO cipa_voto (tenant_id, eleicao_id, candidatura_id, tipo, integridade_hash) VALUES (${sessao.tenant_id}::uuid, ${sessao.eleicao_id}, NULL, ${tipo}, ${hashToken(`${sessao.eleicao_id}:${protocoloGerado}:${tipo}`)})`);
        }
        await tx.$executeRaw(Prisma.sql`UPDATE cipa_portal_sessao SET usado_em = NOW() WHERE token_hash = ${hash}`);
        return { protocolo: protocoloGerado, tenantId: sessao.tenant_id, eleicaoId: String(sessao.eleicao_id) };
      });
      emitirCipaAtualizacao({ tenantId: protocolo.tenantId, eleicaoId: protocolo.eleicaoId, motivo: "VOTO_REGISTRADO" });
      return { mensagem: "Voto registrado com sucesso.", protocolo: protocolo.protocolo };
    } catch (error) {
      if (erroConcorrencia(error)) throw new AppError("Seu voto já foi registrado nesta eleição.", 409);
      throw error;
    }
  }
}
