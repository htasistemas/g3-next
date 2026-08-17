import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { PrestacaoContasProfissionalService } from "../../transparencias/services/prestacao-contas-profissional.service.js";
import { normalizarCnpj, normalizarCpf, validarCnpj, validarCpf } from "../../../utils/br-utils.js";

type Actor = {
  id?: string;
  nomeUsuario?: string;
  tenant_id?: string;
};

const profissional = new PrestacaoContasProfissionalService();

const tipos = [
  "TERMO_COLABORACAO", "TERMO_FOMENTO", "TERMO_COOPERACAO", "ACORDO_COOPERACAO",
  "CONVENIO", "CONTRATO_GESTAO", "TERMO_PARCERIA", "INSTRUMENTO_PRIVADO", "OUTRO"
] as const;

const situacoes = ["RASCUNHO", "EM_ANALISE", "AGUARDANDO_ASSINATURA", "VIGENTE", "SUSPENSO", "ENCERRADO", "CANCELADO", "RESCINDIDO"] as const;

const textoOpcional = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const texto = value.trim();
  return texto.length ? texto : undefined;
}, z.string().optional().nullable());

const dataOpcional = z.preprocess((value) => value === "" ? undefined : value, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable());
const dataObrigatoria = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data válida.");
const cnpjObrigatorio = z.string().trim().transform(normalizarCnpj).refine((value) => validarCnpj(value), "Informe um CNPJ válido.");
const cpfObrigatorio = z.string().trim().transform(normalizarCpf).refine((value) => validarCpf(value), "Informe um CPF válido.");

export function numeroBrasileiro(valor: unknown) {
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : Number.NaN;
  if (typeof valor !== "string") return Number.NaN;
  const texto = valor.trim().replace(/^R\$\s*/i, "").replace(/\s/g, "");
  if (!texto) return 0;
  return Number(texto.includes(",") ? texto.replace(/\./g, "").replace(",", ".") : texto);
}

const numeroNaoNegativo = (mensagem: string) => z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) return 0;
  if (typeof value === "string") return numeroBrasileiro(value);
  return value;
}, z.number({ invalid_type_error: mensagem }).finite(mensagem).min(0, mensagem));

export function idBigInt(valor: string, nome = "Identificador") {
  if (!/^\d+$/.test(String(valor ?? ""))) throw new AppError(`${nome} invalido.`, 422);
  try { return BigInt(valor); } catch { throw new AppError(`${nome} invalido.`, 422); }
}

export function validarIntervalo(inicio?: string | null, fim?: string | null, nome = "O periodo") {
  if (inicio && fim && fim < inicio) throw new AppError(`${nome} final nao pode ser anterior ao inicio.`, 422);
}

const instrumentoSchema = z.object({
  tipoInstrumento: z.enum(tipos),
  numeroInstrumento: z.string().trim().min(1, "Informe o número do termo."),
  ij: textoOpcional,
  cnpj: cnpjObrigatorio,
  tipificacao: z.enum(["CERTIFICAVEL", "NAO_CERTIFICAVEL"]),
  numeroVotoComissao: textoOpcional,
  origemTermo: z.string().trim().min(1, "Informe a origem do termo."),
  nomenclaturaTermo: z.string().trim().min(1, "Informe a nomenclatura conforme o termo."),
  responsavelIndicacao: textoOpcional,
  orgaoCedente: z.string().trim().min(1, "Informe o órgão cedente."),
  statusCadastro: z.enum(["ATIVO", "INATIVO"]).default("ATIVO"),
  banco: z.string().trim().min(1, "Informe o banco."),
  agencia: z.string().trim().min(1, "Informe a agência."),
  conta: z.string().trim().min(1, "Informe a conta."),
  operacao: z.string().trim().min(1, "Informe a operação."),
  contaBancariaId: z.string().trim().min(1, "Selecione a conta bancária."),
  representanteLegal: z.string().trim().min(2, "Informe o representante legal."),
  representanteCpf: cpfObrigatorio,
  representanteCargo: z.string().trim().min(2, "Informe o cargo do representante legal."),
  representanteProfissionalId: z.string().trim().min(1, "Selecione o representante legal."),
  ano: z.coerce.number().int().min(1900).max(2200).optional().nullable(),
  numeroProcesso: textoOpcional,
  numeroProposta: textoOpcional,
  numeroPrograma: textoOpcional,
  numeroEdital: textoOpcional,
  unidadeGestora: textoOpcional,
  orgaoResponsavel: textoOpcional,
  gestorParceria: textoOpcional,
  fiscalParceria: textoOpcional,
  responsavelOrganizacao: textoOpcional,
  numeroProcessoAdministrativo: textoOpcional,
  numeroSei: textoOpcional,
  titulo: textoOpcional,
  objeto: z.string().trim().min(5),
  descricao: textoOpcional,
  justificativa: textoOpcional,
  publicoAlvo: textoOpcional,
  territorio: textoOpcional,
  projetoId: z.string().trim().min(1),
  unidadeId: z.string().trim().optional().nullable(),
  planoTrabalhoId: z.string().trim().optional().nullable(),
  termoFomentoId: textoOpcional,
  concedenteId: z.string().trim().optional().nullable(),
  dataAssinatura: dataObrigatoria,
  inicioVigencia: dataObrigatoria,
  terminoVigencia: dataObrigatoria,
  prazoPrestacaoParcial: z.coerce.number().int().min(0).optional().nullable(),
  prazoPrestacaoFinal: z.coerce.number().int().min(0).optional().nullable(),
  permiteProrrogacao: z.boolean().default(false),
  baseLegal: textoOpcional,
  municipio: textoOpcional,
  estado: z.preprocess((value) => value === "" ? undefined : value, z.string().trim().length(2).optional().nullable()),
  valorGlobal: numeroNaoNegativo("O valor global deve ser um numero valido.").default(0),
  valorRepasse: numeroNaoNegativo("O valor do repasse deve ser um numero valido.").default(0),
  contrapartidaFinanceira: numeroNaoNegativo("A contrapartida financeira deve ser um numero valido.").default(0),
  contrapartidaBensServicos: numeroNaoNegativo("A contrapartida em bens e servicos deve ser um numero valido.").default(0),
  recursosProprios: numeroNaoNegativo("Os recursos proprios devem ser um numero valido.").default(0),
  quantidadeParcelas: z.coerce.number().int().min(0).optional().nullable(),
  contaBancariaExclusiva: textoOpcional,
  legislacaoAplicavel: textoOpcional,
  regulamento: textoOpcional,
  fonteRecurso: textoOpcional,
  situacao: z.enum(situacoes).default("RASCUNHO"),
  observacoes: textoOpcional
});

const unidadeSchema = z.object({
  unidadeId: z.string().trim().min(1),
  entidadeJuridicaId: z.string().trim().optional().nullable(),
  responsavel: z.string().trim().optional().nullable(),
  inicioExecucao: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  terminoExecucao: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  percentualParticipacao: z.coerce.number().finite().min(0).max(100).default(0),
  valorDestinado: numeroNaoNegativo("O valor destinado deve ser um numero valido.").default(0),
  metasVinculadas: z.array(z.string()).default([]),
  rubricasVinculadas: z.array(z.string()).default([])
});

const aditivoSchema = z.object({
  numero: z.string().trim().min(1),
  ano: z.coerce.number().int().optional().nullable(),
  tipo: z.string().trim().min(2),
  dataAditivo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  novaVigenciaInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  novaVigenciaFim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  prorrogacaoVigencia: z.boolean().default(false),
  valorTotalPlano: numeroNaoNegativo("O valor total do plano deve ser um numero valido.").default(0),
  parcela: textoOpcional,
  valorNovaParcela: numeroNaoNegativo("O valor da nova parcela deve ser um numero valido.").default(0),
  corrigirAPartirParcela: textoOpcional,
  valorAnterior: numeroNaoNegativo("O valor anterior deve ser um numero valido.").default(0),
  acrescimo: numeroNaoNegativo("O acrescimo deve ser um numero valido.").default(0),
  reducao: numeroNaoNegativo("A reducao deve ser um numero valido.").default(0),
  novoValor: numeroNaoNegativo("O novo valor deve ser um numero valido.").default(0),
  justificativa: z.string().trim().min(5),
  processo: z.string().trim().optional().nullable(),
  documentoId: z.string().trim().optional().nullable()
});

const entidadesFilhas = ["metas", "rubricas", "receitas", "despesas", "documentos"] as const;
type EntidadeFilha = (typeof entidadesFilhas)[number];

function tenant(actor?: Actor) {
  const value = actor?.tenant_id?.trim();
  if (!value) throw new AppError("Tenant da sessao nao identificado.", 401);
  return value;
}

function mapRow(row: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [
    key.replace(/_([a-z])/g, (_m, letter: string) => letter.toUpperCase()),
    typeof value === "bigint" ? value.toString() : value instanceof Date ? value.toISOString() : value
  ]));
}

export class TermosParceriaService {
  async dashboard(actor?: Actor) {
    const tenantId = tenant(actor);
    const [resumo, alertas] = await Promise.all([
      prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
        SELECT COUNT(*)::bigint AS total,
          COUNT(*) FILTER (WHERE situacao = 'VIGENTE')::bigint AS vigentes,
          COUNT(*) FILTER (WHERE situacao = 'RASCUNHO')::bigint AS elaboracao,
          COUNT(*) FILTER (WHERE situacao = 'AGUARDANDO_ASSINATURA')::bigint AS aguardando_assinatura,
          COUNT(*) FILTER (WHERE termino_vigencia BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days')::bigint AS a_vencer,
          COUNT(*) FILTER (WHERE termino_vigencia < CURRENT_DATE)::bigint AS vencidas,
          COALESCE(SUM(valor_global), 0)::float8 AS valor_total
        FROM prestacao_contas_instrumento
        WHERE tenant_id::text = ${tenantId} AND excluido_em IS NULL
      `),
      prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
        SELECT tipo_evento AS tipo, titulo, descricao, data_evento
        FROM prestacao_contas_timeline
        WHERE tenant_id::text = ${tenantId}
        ORDER BY data_evento DESC, id DESC LIMIT 12
      `)
    ]);
    const financeiro = await prisma.$queryRaw<Array<{ recebido: number; executado: number; comprometido: number }>>(Prisma.sql`
      SELECT COALESCE((SELECT SUM(valor_recebido) FROM prestacao_contas_receita WHERE tenant_id::text = ${tenantId} AND excluido_em IS NULL), 0)::float8 AS recebido,
        COALESCE((SELECT SUM(valor_liquido) FROM prestacao_contas_despesa WHERE tenant_id::text = ${tenantId} AND excluido_em IS NULL), 0)::float8 AS executado,
        COALESCE((SELECT SUM(valor_comprometido) FROM prestacao_contas_rubrica WHERE tenant_id::text = ${tenantId} AND excluido_em IS NULL), 0)::float8 AS comprometido
    `);
    const item = resumo[0] ?? {};
    const recebido = financeiro[0]?.recebido ?? 0;
    const executado = financeiro[0]?.executado ?? 0;
    return {
      vigentes: Number(item.vigentes ?? 0), emElaboracao: Number(item.elaboracao ?? 0),
      aguardandoAssinatura: Number(item.aguardando_assinatura ?? 0), aVencer: Number(item.a_vencer ?? 0),
      vencidas: Number(item.vencidas ?? 0), valorTotalContratado: Number(item.valor_total ?? 0),
      valorRecebido: recebido, valorExecutado: executado,
      valorComprometido: financeiro[0]?.comprometido ?? 0, saldoDisponivel: recebido - executado,
      itensAtencao: alertas.map(mapRow)
    };
  }

  async listar(actor?: Actor, filtros: { status?: string; projetoId?: string; busca?: string; pagina?: number; limite?: number; ordem?: string; direcao?: string } = {}) {
    const tenantId = tenant(actor);
    const pagina = Math.max(1, Math.floor(filtros.pagina ?? 1));
    const limite = Math.min(100, Math.max(1, Math.floor(filtros.limite ?? 20)));
    const ordem = ({ numero: "i.numero_instrumento", inicio: "i.inicio_vigencia", termino: "i.termino_vigencia", valor: "i.valor_global", situacao: "i.situacao", cadastro: "i.criado_em" } as Record<string, string>)[filtros.ordem ?? "cadastro"] ?? "i.criado_em";
    const direcao = String(filtros.direcao).toLowerCase() === "asc" ? "ASC" : "DESC";
    const totalRows = await prisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`SELECT COUNT(*)::bigint AS total FROM prestacao_contas_instrumento i WHERE i.tenant_id::text = ${tenantId} AND i.excluido_em IS NULL AND (${filtros.status ?? null}::text IS NULL OR i.situacao = ${filtros.status ?? null}) AND (${filtros.projetoId ?? null}::bigint IS NULL OR i.projeto_id = ${filtros.projetoId ?? null}::bigint) AND (${filtros.busca ? `%${filtros.busca}%` : null}::text IS NULL OR i.numero_instrumento ILIKE ${filtros.busca ? `%${filtros.busca}%` : null} OR i.titulo ILIKE ${filtros.busca ? `%${filtros.busca}%` : null})`);
    const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT i.*, p.nome AS projeto_nome, c.razao_social AS concedente_nome,
        COALESCE(r.recebido, 0)::float8 AS valor_recebido,
        COALESCE(d.executado, 0)::float8 AS valor_executado,
        COALESCE(rb.comprometido, 0)::float8 AS valor_comprometido
      FROM prestacao_contas_instrumento i
      LEFT JOIN projetos p ON p.id = i.projeto_id AND p.tenant_id::text = ${tenantId}
      LEFT JOIN prestacao_contas_concedente c ON c.id = i.concedente_id AND c.tenant_id::text = ${tenantId}
      LEFT JOIN LATERAL (SELECT SUM(valor_recebido) AS recebido FROM prestacao_contas_receita WHERE instrumento_id = i.id AND tenant_id::text = ${tenantId} AND excluido_em IS NULL) r ON TRUE
      LEFT JOIN LATERAL (SELECT SUM(valor_liquido) AS executado FROM prestacao_contas_despesa WHERE instrumento_id = i.id AND tenant_id::text = ${tenantId} AND excluido_em IS NULL) d ON TRUE
      LEFT JOIN LATERAL (SELECT SUM(valor_comprometido) AS comprometido FROM prestacao_contas_rubrica WHERE instrumento_id = i.id AND tenant_id::text = ${tenantId} AND excluido_em IS NULL) rb ON TRUE
      WHERE i.tenant_id::text = ${tenantId} AND i.excluido_em IS NULL
        AND (${filtros.status ?? null}::text IS NULL OR i.situacao = ${filtros.status ?? null})
        AND (${filtros.projetoId ?? null}::bigint IS NULL OR i.projeto_id = ${filtros.projetoId ?? null}::bigint)
        AND (${filtros.busca ? `%${filtros.busca}%` : null}::text IS NULL OR i.numero_instrumento ILIKE ${filtros.busca ? `%${filtros.busca}%` : null} OR i.titulo ILIKE ${filtros.busca ? `%${filtros.busca}%` : null})
      ORDER BY ${Prisma.raw(ordem)} ${Prisma.raw(direcao)}, i.id DESC LIMIT ${limite} OFFSET ${(pagina - 1) * limite}
    `);
    return { registros: rows.map(mapRow), total: Number(totalRows[0]?.total ?? 0), pagina, limite, totalPaginas: Math.ceil(Number(totalRows[0]?.total ?? 0) / limite) };
  }

  async obter(id: string, actor?: Actor) {
    const tenantId = tenant(actor);
    const instrumentoId = idBigInt(id, "Termo");
    const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT i.*, p.nome AS projeto_nome, c.razao_social AS concedente_nome
      FROM prestacao_contas_instrumento i
      LEFT JOIN projetos p ON p.id = i.projeto_id AND p.tenant_id::text = ${tenantId}
      LEFT JOIN prestacao_contas_concedente c ON c.id = i.concedente_id AND c.tenant_id::text = ${tenantId}
      WHERE i.id = ${instrumentoId} AND i.tenant_id::text = ${tenantId} AND i.excluido_em IS NULL LIMIT 1
    `);
    if (!rows[0]) throw new AppError("Parceria nao encontrada no ambiente atual.", 404);
    const [metas, rubricas, receitas, despesas, unidades, aditivos, documentos, timeline] = await Promise.all([
      this.filhos("prestacao_contas_meta", instrumentoId, tenantId), this.filhos("prestacao_contas_rubrica", instrumentoId, tenantId),
      this.filhos("prestacao_contas_receita", instrumentoId, tenantId), this.filhos("prestacao_contas_despesa", instrumentoId, tenantId),
      this.filhos("prestacao_contas_instrumento_unidade", instrumentoId, tenantId), this.filhos("prestacao_contas_aditivo", instrumentoId, tenantId),
      this.filhos("prestacao_contas_documento", instrumentoId, tenantId), this.filhos("prestacao_contas_timeline", instrumentoId, tenantId)
    ]);
    return { ...mapRow(rows[0]), metas, rubricas, receitas, despesas, unidadesExecutoras: unidades, aditivos, documentos, timeline };
  }

  async criar(raw: unknown, actor?: Actor, ip?: string) {
    const tenantId = tenant(actor);
    const input = instrumentoSchema.parse(raw);
    validarIntervalo(input.inicioVigencia, input.terminoVigencia, "A vigencia");
    const fontes = input.valorRepasse + input.contrapartidaFinanceira + input.contrapartidaBensServicos + input.recursosProprios;
    if (input.valorGlobal > 0 && fontes > input.valorGlobal) throw new AppError("A soma dos recursos nao pode ultrapassar o valor global da parceria.", 422);
    await this.validarNumeroUnico(input.numeroInstrumento, tenantId);
    await this.validarProjeto(input.projetoId, tenantId);
    if (input.unidadeId) await this.validarUnidade(input.unidadeId, tenantId);
    if (input.planoTrabalhoId) await this.validarPlanoTrabalho(input.planoTrabalhoId, tenantId);
    if (input.termoFomentoId) await this.validarTermoFomento(input.termoFomentoId, tenantId);
    if (input.concedenteId) await this.validarConcedente(input.concedenteId, tenantId);
    await this.validarContaBancaria(input.contaBancariaId, tenantId);
    await this.validarProfissional(input.representanteProfissionalId, tenantId);
    const registro = await profissional.criar("instrumentos", input, actor, ip);
    await prisma.$executeRaw(Prisma.sql`
      UPDATE prestacao_contas_instrumento SET ano = ${input.ano ?? null}, numero_processo_administrativo = ${input.numeroProcessoAdministrativo ?? null},
        ij = ${input.ij ?? null}, cnpj = ${input.cnpj ?? null}, tipificacao = ${input.tipificacao ?? null}, numero_voto_comissao = ${input.numeroVotoComissao ?? null}, origem_termo = ${input.origemTermo ?? null}, nomenclatura_termo = ${input.nomenclaturaTermo ?? null}, responsavel_indicacao = ${input.responsavelIndicacao ?? null}, orgao_cedente = ${input.orgaoCedente ?? null}, status_cadastro = ${input.statusCadastro ?? "ATIVO"}, banco = ${input.banco ?? null}, agencia = ${input.agencia ?? null}, conta = ${input.conta ?? null}, operacao = ${input.operacao ?? null}, conta_bancaria_id = ${BigInt(input.contaBancariaId)}, representante_legal = ${input.representanteLegal ?? null}, representante_cpf = ${input.representanteCpf ?? null}, representante_cargo = ${input.representanteCargo ?? null}, representante_profissional_id = ${BigInt(input.representanteProfissionalId)},
        numero_sei = ${input.numeroSei ?? null}, titulo = ${input.titulo ?? null}, descricao = ${input.descricao ?? null}, permite_prorrogacao = ${input.permiteProrrogacao},
        numero_proposta = ${input.numeroProposta ?? null}, numero_programa = ${input.numeroPrograma ?? null}, numero_edital = ${input.numeroEdital ?? null},
        unidade_gestora = ${input.unidadeGestora ?? null}, orgao_responsavel = ${input.orgaoResponsavel ?? null}, gestor_parceria = ${input.gestorParceria ?? null}, fiscal_parceria = ${input.fiscalParceria ?? null}, responsavel_organizacao = ${input.responsavelOrganizacao ?? null},
        justificativa = ${input.justificativa ?? null}, publico_alvo = ${input.publicoAlvo ?? null}, territorio = ${input.territorio ?? null}, prazo_prestacao_parcial = ${input.prazoPrestacaoParcial ?? null}, prazo_prestacao_final = ${input.prazoPrestacaoFinal ?? null}, quantidade_parcelas = ${input.quantidadeParcelas ?? null}, conta_bancaria_exclusiva = ${input.contaBancariaExclusiva ?? null}, legislacao_aplicavel = ${input.legislacaoAplicavel ?? null}, regulamento = ${input.regulamento ?? null},
        base_legal = ${input.baseLegal ?? null}, municipio = ${input.municipio ?? null}, estado = ${input.estado ?? null}, termo_fomento_id = ${input.termoFomentoId ? BigInt(input.termoFomentoId) : null}
      WHERE id = ${BigInt(String((registro as Record<string, unknown>).id))} AND tenant_id::text = ${tenantId}
    `);
    await this.timeline(BigInt(String((registro as Record<string, unknown>).id)), tenantId, "CRIACAO", "Parceria criada", actor, ip);
    return this.obter(String((registro as Record<string, unknown>).id), actor);
  }

  async atualizar(id: string, raw: unknown, actor?: Actor, ip?: string) {
    const tenantId = tenant(actor);
    const instrumentoId = idBigInt(id, "Termo");
    const atual = await this.instrumento(instrumentoId, tenantId);
    const input = instrumentoSchema.partial().parse(raw);
    validarIntervalo(input.inicioVigencia ?? (String(atual.inicio_vigencia ?? "").slice(0, 10) || null), input.terminoVigencia ?? (String(atual.termino_vigencia ?? "").slice(0, 10) || null), "A vigencia");
    const valorGlobal = input.valorGlobal ?? Number(atual.valor_global ?? 0);
    const fontes = (input.valorRepasse ?? Number(atual.valor_repasse ?? 0)) + (input.contrapartidaFinanceira ?? Number(atual.contrapartida_financeira ?? 0)) + (input.contrapartidaBensServicos ?? Number(atual.contrapartida_bens_servicos ?? 0)) + (input.recursosProprios ?? Number(atual.recursos_proprios ?? 0));
    if (valorGlobal > 0 && fontes > valorGlobal) throw new AppError("A soma dos recursos nao pode ultrapassar o valor global da parceria.", 422);
    if (input.numeroInstrumento) await this.validarNumeroUnico(input.numeroInstrumento, tenantId, instrumentoId);
    if (input.projetoId) await this.validarProjeto(input.projetoId, tenantId);
    if (input.unidadeId) await this.validarUnidade(input.unidadeId, tenantId);
    if (input.planoTrabalhoId) await this.validarPlanoTrabalho(input.planoTrabalhoId, tenantId);
    if (input.termoFomentoId) await this.validarTermoFomento(input.termoFomentoId, tenantId);
    if (input.concedenteId) await this.validarConcedente(input.concedenteId, tenantId);
    if (input.contaBancariaId) await this.validarContaBancaria(input.contaBancariaId, tenantId);
    if (input.representanteProfissionalId) await this.validarProfissional(input.representanteProfissionalId, tenantId);
    const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      UPDATE prestacao_contas_instrumento SET
        tipo_instrumento = COALESCE(${input.tipoInstrumento ?? null}, tipo_instrumento),
        numero_instrumento = COALESCE(${input.numeroInstrumento ?? null}, numero_instrumento),
        ij = COALESCE(${input.ij ?? null}, ij), cnpj = COALESCE(${input.cnpj ?? null}, cnpj), tipificacao = COALESCE(${input.tipificacao ?? null}, tipificacao), numero_voto_comissao = COALESCE(${input.numeroVotoComissao ?? null}, numero_voto_comissao), origem_termo = COALESCE(${input.origemTermo ?? null}, origem_termo), nomenclatura_termo = COALESCE(${input.nomenclaturaTermo ?? null}, nomenclatura_termo), responsavel_indicacao = COALESCE(${input.responsavelIndicacao ?? null}, responsavel_indicacao), orgao_cedente = COALESCE(${input.orgaoCedente ?? null}, orgao_cedente), status_cadastro = COALESCE(${input.statusCadastro ?? null}, status_cadastro), banco = COALESCE(${input.banco ?? null}, banco), agencia = COALESCE(${input.agencia ?? null}, agencia), conta = COALESCE(${input.conta ?? null}, conta), operacao = COALESCE(${input.operacao ?? null}, operacao), conta_bancaria_id = COALESCE(${input.contaBancariaId ? BigInt(input.contaBancariaId) : null}, conta_bancaria_id), representante_legal = COALESCE(${input.representanteLegal ?? null}, representante_legal), representante_cpf = COALESCE(${input.representanteCpf ?? null}, representante_cpf), representante_cargo = COALESCE(${input.representanteCargo ?? null}, representante_cargo), representante_profissional_id = COALESCE(${input.representanteProfissionalId ? BigInt(input.representanteProfissionalId) : null}, representante_profissional_id),
        numero_processo = COALESCE(${input.numeroProcesso ?? null}, numero_processo),
        numero_processo_administrativo = COALESCE(${input.numeroProcessoAdministrativo ?? null}, numero_processo_administrativo),
        numero_proposta = COALESCE(${input.numeroProposta ?? null}, numero_proposta), numero_programa = COALESCE(${input.numeroPrograma ?? null}, numero_programa), numero_edital = COALESCE(${input.numeroEdital ?? null}, numero_edital),
        unidade_gestora = COALESCE(${input.unidadeGestora ?? null}, unidade_gestora), orgao_responsavel = COALESCE(${input.orgaoResponsavel ?? null}, orgao_responsavel), gestor_parceria = COALESCE(${input.gestorParceria ?? null}, gestor_parceria), fiscal_parceria = COALESCE(${input.fiscalParceria ?? null}, fiscal_parceria), responsavel_organizacao = COALESCE(${input.responsavelOrganizacao ?? null}, responsavel_organizacao),
        numero_sei = COALESCE(${input.numeroSei ?? null}, numero_sei),
        ano = COALESCE(${input.ano ?? null}, ano),
        projeto_id = COALESCE(${input.projetoId ? BigInt(input.projetoId) : null}, projeto_id),
        unidade_id = COALESCE(${input.unidadeId ? BigInt(input.unidadeId) : null}, unidade_id),
        plano_trabalho_id = COALESCE(${input.planoTrabalhoId ? BigInt(input.planoTrabalhoId) : null}, plano_trabalho_id),
        termo_fomento_id = COALESCE(${input.termoFomentoId ? BigInt(input.termoFomentoId) : null}, termo_fomento_id),
        concedente_id = COALESCE(${input.concedenteId ? BigInt(input.concedenteId) : null}, concedente_id),
        titulo = COALESCE(${input.titulo ?? null}, titulo), objeto = COALESCE(${input.objeto ?? null}, objeto), descricao = COALESCE(${input.descricao ?? null}, descricao), justificativa = COALESCE(${input.justificativa ?? null}, justificativa), publico_alvo = COALESCE(${input.publicoAlvo ?? null}, publico_alvo), territorio = COALESCE(${input.territorio ?? null}, territorio),
        data_assinatura = COALESCE(${input.dataAssinatura ?? null}::date, data_assinatura),
        inicio_vigencia = COALESCE(${input.inicioVigencia ?? null}::date, inicio_vigencia), termino_vigencia = COALESCE(${input.terminoVigencia ?? null}::date, termino_vigencia),
        valor_global = COALESCE(${input.valorGlobal ?? null}, valor_global), valor_repasse = COALESCE(${input.valorRepasse ?? null}, valor_repasse),
        contrapartida_financeira = COALESCE(${input.contrapartidaFinanceira ?? null}, contrapartida_financeira), contrapartida_bens_servicos = COALESCE(${input.contrapartidaBensServicos ?? null}, contrapartida_bens_servicos), recursos_proprios = COALESCE(${input.recursosProprios ?? null}, recursos_proprios), prazo_prestacao_parcial = COALESCE(${input.prazoPrestacaoParcial ?? null}, prazo_prestacao_parcial), prazo_prestacao_final = COALESCE(${input.prazoPrestacaoFinal ?? null}, prazo_prestacao_final), quantidade_parcelas = COALESCE(${input.quantidadeParcelas ?? null}, quantidade_parcelas), conta_bancaria_exclusiva = COALESCE(${input.contaBancariaExclusiva ?? null}, conta_bancaria_exclusiva), legislacao_aplicavel = COALESCE(${input.legislacaoAplicavel ?? null}, legislacao_aplicavel), regulamento = COALESCE(${input.regulamento ?? null}, regulamento), fonte_recurso = COALESCE(${input.fonteRecurso ?? null}, fonte_recurso),
        permite_prorrogacao = COALESCE(${input.permiteProrrogacao ?? null}, permite_prorrogacao), base_legal = COALESCE(${input.baseLegal ?? null}, base_legal), municipio = COALESCE(${input.municipio ?? null}, municipio), estado = COALESCE(${input.estado ?? null}, estado), situacao = COALESCE(${input.situacao ?? null}, situacao), atualizado_em = NOW(), atualizado_por = ${actor?.id ?? null}, versao = versao + 1
      WHERE id = ${instrumentoId} AND tenant_id::text = ${tenantId} AND excluido_em IS NULL RETURNING *
    `);
    if (!rows[0]) throw new AppError("Parceria nao encontrada no ambiente atual.", 404);
    await this.timeline(instrumentoId, tenantId, "ALTERACAO", "Parceria atualizada", actor, ip);
    return this.obter(id, actor);
  }

  async criarFilho(id: string, entidade: string, raw: unknown, actor?: Actor, ip?: string) {
    const tenantId = tenant(actor);
    if (!entidadesFilhas.includes(entidade as EntidadeFilha)) throw new AppError("Entidade operacional nao suportada.", 404);
    const instrumentoId = idBigInt(id, "Termo");
    const instrumento = await this.instrumento(instrumentoId, tenantId);
    const input = { ...(raw as Record<string, unknown>), instrumentoId: id };
    await this.validarFilho(entidade as EntidadeFilha, input, instrumento, instrumentoId, tenantId);
    const registro = await profissional.criar(entidade, input, actor, ip);
    await this.timeline(instrumentoId, tenantId, entidade.toUpperCase(), `Registro de ${entidade} criado`, actor, ip);
    return registro;
  }

  async criarUnidade(id: string, raw: unknown, actor?: Actor) {
    const tenantId = tenant(actor); const input = unidadeSchema.parse(raw); const instrumentoId = idBigInt(id, "Termo");
    const instrumento = await this.instrumento(instrumentoId, tenantId);
    validarIntervalo(input.inicioExecucao, input.terminoExecucao, "O periodo de execucao");
    await this.validarUnidade(input.unidadeId, tenantId);
    const soma = await prisma.$queryRaw<Array<{ total: number }>>(Prisma.sql`SELECT COALESCE(SUM(valor_destinado),0)::float8 AS total FROM prestacao_contas_instrumento_unidade WHERE instrumento_id = ${instrumentoId} AND tenant_id::text = ${tenantId} AND excluido_em IS NULL`);
    if ((soma[0]?.total ?? 0) + input.valorDestinado > Number(instrumento.valor_global ?? 0)) throw new AppError("A soma das unidades executoras nao pode ultrapassar o valor da parceria.", 422);
    const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`INSERT INTO prestacao_contas_instrumento_unidade (tenant_id, instrumento_id, unidade_id, entidade_juridica_id, responsavel, inicio_execucao, termino_execucao, percentual_participacao, valor_destinado, metas_vinculadas, rubricas_vinculadas, criado_por, atualizado_por) VALUES (${tenantId}::uuid, ${instrumentoId}, ${BigInt(input.unidadeId)}, ${input.entidadeJuridicaId ? BigInt(input.entidadeJuridicaId) : null}, ${input.responsavel ?? null}, ${input.inicioExecucao ?? null}::date, ${input.terminoExecucao ?? null}::date, ${input.percentualParticipacao}, ${input.valorDestinado}, ${JSON.stringify(input.metasVinculadas)}::jsonb, ${JSON.stringify(input.rubricasVinculadas)}::jsonb, ${actor?.id ?? null}, ${actor?.id ?? null}) RETURNING *`);
    return mapRow(rows[0] ?? {});
  }

  async criarAditivo(id: string, raw: unknown, actor?: Actor) {
    const tenantId = tenant(actor); const input = aditivoSchema.parse(raw); const instrumentoId = idBigInt(id, "Termo");
    await this.instrumento(instrumentoId, tenantId);
    validarIntervalo(input.novaVigenciaInicio, input.novaVigenciaFim, "A vigencia do aditivo");
    if (input.acrescimo > 0 && !input.corrigirAPartirParcela) throw new AppError("Informe a parcela a partir da qual o acrescimo sera corrigido.", 422);
    const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`INSERT INTO prestacao_contas_aditivo (tenant_id, instrumento_id, numero, ano, tipo, data_aditivo, nova_vigencia_inicio, nova_vigencia_fim, prorrogacao_vigencia, valor_total_plano, parcela, valor_nova_parcela, corrigir_a_partir_parcela, valor_anterior, acrescimo, reducao, novo_valor, justificativa, processo, documento_id, criado_por, atualizado_por) VALUES (${tenantId}::uuid, ${instrumentoId}, ${input.numero}, ${input.ano ?? null}, ${input.tipo}, ${input.dataAditivo ?? null}::date, ${input.novaVigenciaInicio ?? null}::date, ${input.novaVigenciaFim ?? null}::date, ${input.prorrogacaoVigencia}, ${input.valorTotalPlano}, ${input.parcela ?? null}, ${input.valorNovaParcela}, ${input.corrigirAPartirParcela ?? null}, ${input.valorAnterior}, ${input.acrescimo}, ${input.reducao}, ${input.novoValor}, ${input.justificativa}, ${input.processo ?? null}, ${input.documentoId ? BigInt(input.documentoId) : null}, ${actor?.id ?? null}, ${actor?.id ?? null}) RETURNING *`);
    return mapRow(rows[0] ?? {});
  }

  async excluir(id: string, actor?: Actor, ip?: string) {
    const tenantId = tenant(actor);
    const instrumentoId = idBigInt(id, "Termo");
    await this.instrumento(instrumentoId, tenantId);
    const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      UPDATE prestacao_contas_instrumento SET excluido_em = NOW(), excluido_por = ${actor?.id ?? null}, ativo = FALSE, atualizado_em = NOW(), atualizado_por = ${actor?.id ?? null}, versao = versao + 1
      WHERE id = ${instrumentoId} AND tenant_id::text = ${tenantId} AND excluido_em IS NULL RETURNING id
    `);
    if (!rows[0]) throw new AppError("Termo nao encontrado no ambiente atual.", 404);
    await this.timeline(instrumentoId, tenantId, "EXCLUSAO", "Parceria excluida logicamente", actor, ip);
  }

  async excluirFilho(id: string, entidade: string, itemId: string, actor?: Actor, ip?: string) {
    const tenantId = tenant(actor);
    if (!entidadesFilhas.includes(entidade as EntidadeFilha)) throw new AppError("Entidade operacional nao suportada.", 404);
    const instrumentoId = idBigInt(id, "Termo");
    const registroId = idBigInt(itemId, "Registro");
    await this.instrumento(instrumentoId, tenantId);
    const tabela = { metas: "prestacao_contas_meta", rubricas: "prestacao_contas_rubrica", receitas: "prestacao_contas_receita", despesas: "prestacao_contas_despesa", documentos: "prestacao_contas_documento" }[entidade as EntidadeFilha];
    if (entidade === "rubricas") {
      const movimento = await prisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`SELECT COUNT(*)::bigint AS total FROM prestacao_contas_despesa WHERE rubrica_id = ${registroId} AND instrumento_id = ${instrumentoId} AND tenant_id::text = ${tenantId} AND excluido_em IS NULL`);
      if (Number(movimento[0]?.total ?? 0) > 0) throw new AppError("A rubrica possui despesas vinculadas e nao pode ser excluida.", 409);
    }
    const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`UPDATE ${Prisma.raw(tabela)} SET excluido_em = NOW(), excluido_por = ${actor?.id ?? null}, ativo = FALSE, atualizado_em = NOW(), atualizado_por = ${actor?.id ?? null}, versao = versao + 1 WHERE id = ${registroId} AND instrumento_id = ${instrumentoId} AND tenant_id::text = ${tenantId} AND excluido_em IS NULL RETURNING id`);
    if (!rows[0]) throw new AppError("Registro nao encontrado no ambiente atual.", 404);
    await this.timeline(instrumentoId, tenantId, "EXCLUSAO", `Registro de ${entidade} excluido logicamente`, actor, ip);
  }

  async atualizarFilho(id: string, entidade: string, itemId: string, raw: unknown, actor?: Actor, ip?: string) {
    const tenantId = tenant(actor);
    if (!entidadesFilhas.includes(entidade as EntidadeFilha)) throw new AppError("Entidade operacional nao suportada.", 404);
    const instrumentoId = idBigInt(id, "Termo");
    const registroId = idBigInt(itemId, "Registro");
    await this.instrumento(instrumentoId, tenantId);
    const tabelas: Record<EntidadeFilha, { tabela: string; campos: Record<string, string> }> = {
      metas: { tabela: "prestacao_contas_meta", campos: { descricao: "descricao", quantidadePrevista: "quantidade_prevista", situacao: "situacao" } },
      rubricas: { tabela: "prestacao_contas_rubrica", campos: { categoria: "categoria", descricao: "descricao", valorTotal: "valor_total" } },
      receitas: { tabela: "prestacao_contas_receita", campos: { parcela: "parcela", dataDesembolso: "data_desembolso", valorPrevisto: "valor_previsto", valorRecebido: "valor_recebido", situacao: "situacao", observacao: "observacao" } },
      despesas: { tabela: "prestacao_contas_despesa", campos: { descricao: "descricao", valorBruto: "valor_bruto", valorLiquido: "valor_liquido", observacao: "observacao" } },
      documentos: { tabela: "prestacao_contas_documento", campos: { categoria: "categoria", tipo: "tipo", descricao: "descricao" } }
    };
    const configuracao = tabelas[entidade as EntidadeFilha];
    const payload = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
    const valores: unknown[] = [];
    const sets: string[] = [];
    for (const [entrada, coluna] of Object.entries(configuracao.campos)) {
      if (!(entrada in payload)) continue;
      let valor = payload[entrada];
      if (["quantidadePrevista", "valorTotal", "valorPrevisto", "valorRecebido", "valorBruto", "valorLiquido"].includes(entrada)) {
        valor = numeroBrasileiro(valor);
        if (!Number.isFinite(valor) || Number(valor) < 0) throw new AppError("O valor informado deve ser valido e nao negativo.", 422);
      }
      valores.push(valor); sets.push(`${coluna} = $${valores.length}`);
    }
    if (!sets.length) throw new AppError("Nenhum campo valido foi informado para atualizacao.", 422);
    valores.push(actor?.id ?? null, registroId, instrumentoId, tenantId);
    const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(`UPDATE ${configuracao.tabela} SET ${sets.join(", ")}, atualizado_em = NOW(), atualizado_por = $${valores.length - 3}, versao = versao + 1 WHERE id = $${valores.length - 2} AND instrumento_id = $${valores.length - 1} AND tenant_id::text = $${valores.length} AND excluido_em IS NULL RETURNING *`, ...valores);
    if (!rows[0]) throw new AppError("Registro nao encontrado no ambiente atual.", 404);
    await this.timeline(instrumentoId, tenantId, "ALTERACAO", `Registro de ${entidade} atualizado`, actor, ip);
    return mapRow(rows[0]);
  }

  private async instrumento(id: bigint, tenantId: string) {
    const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`SELECT * FROM prestacao_contas_instrumento WHERE id = ${id} AND tenant_id::text = ${tenantId} AND excluido_em IS NULL LIMIT 1`);
    if (!rows[0]) throw new AppError("Parceria nao encontrada no ambiente atual.", 404); return rows[0];
  }
  private async validarProjeto(id: string, tenantId: string) { const rows = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`SELECT id FROM projetos WHERE id = ${idBigInt(id, "Projeto")} AND tenant_id::text = ${tenantId} AND ativo = TRUE LIMIT 1`); if (!rows[0]) throw new AppError("O projeto nao pertence ao ambiente atual.", 403); }
  private async validarPlanoTrabalho(id: string, tenantId: string) { const rows = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`SELECT id FROM plano_trabalho WHERE id = ${idBigInt(id, "Plano de trabalho")} AND tenant_id::text = ${tenantId} AND COALESCE(ativo, TRUE) = TRUE LIMIT 1`); if (!rows[0]) throw new AppError("O plano de trabalho nao pertence ao ambiente atual.", 403); }
  private async validarConcedente(id: string, tenantId: string) { const rows = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`SELECT id FROM prestacao_contas_concedente WHERE id = ${idBigInt(id, "Concedente")} AND tenant_id::text = ${tenantId} AND excluido_em IS NULL LIMIT 1`); if (!rows[0]) throw new AppError("O concedente nao pertence ao ambiente atual.", 403); }
  private async validarContaBancaria(id: string, tenantId: string) { const rows = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`SELECT id FROM conta_bancaria WHERE id = ${idBigInt(id, "Conta bancaria")} AND tenant_id::text = ${tenantId} AND ativo = TRUE LIMIT 1`); if (!rows[0]) throw new AppError("A conta bancaria selecionada nao pertence ao ambiente atual ou esta inativa.", 403); }
  private async validarProfissional(id: string, tenantId: string) { const rows = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`SELECT id FROM cadastro_profissionais WHERE id = ${idBigInt(id, "Profissional")} AND tenant_id::text = ${tenantId} AND status = 'ATIVO' LIMIT 1`); if (!rows[0]) throw new AppError("O representante selecionado nao pertence ao ambiente atual ou nao esta ativo.", 403); }
  private async validarTermoFomento(id: string, tenantId: string) { const rows = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`SELECT id FROM termo_fomento WHERE id = ${idBigInt(id, "Termo de fomento")} AND tenant_id::text = ${tenantId} LIMIT 1`); if (!rows[0]) throw new AppError("O termo de fomento nao pertence ao ambiente atual.", 403); }
  private async validarNumeroUnico(numero: string | null | undefined, tenantId: string, ignorarId?: bigint) {
    const valor = numero?.trim();
    if (!valor) return;
    const rows = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`SELECT id FROM prestacao_contas_instrumento WHERE tenant_id::text = ${tenantId} AND numero_instrumento = ${valor} AND excluido_em IS NULL AND (${ignorarId ?? null}::bigint IS NULL OR id <> ${ignorarId ?? null}::bigint) LIMIT 1`);
    if (rows[0]) throw new AppError("Ja existe um termo com este numero no ambiente atual.", 409);
  }
  private async validarUnidade(id: string, tenantId: string) { const rows = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`SELECT id FROM unidade_assistencial WHERE id = ${idBigInt(id, "Unidade executora")} AND tenant_id::text = ${tenantId} LIMIT 1`); if (!rows[0]) throw new AppError("A unidade nao pertence ao ambiente atual.", 403); }
  private async validarFilho(entidade: EntidadeFilha, input: Record<string, unknown>, instrumento: Record<string, unknown>, instrumentoId: bigint, tenantId: string) {
    if (entidade === "despesas") await this.validarDespesa(input, instrumentoId, tenantId);
    if (entidade === "rubricas" && input.metaId) await this.validarMeta(String(input.metaId), instrumentoId, tenantId);
    if (entidade === "despesas" && input.metaId) await this.validarMeta(String(input.metaId), instrumentoId, tenantId);
    if (entidade === "despesas" && input.projetoId) {
      await this.validarProjeto(String(input.projetoId), tenantId);
      if (instrumento.projeto_id && String(input.projetoId) !== String(instrumento.projeto_id)) throw new AppError("A despesa deve pertencer ao mesmo projeto do termo.", 422);
    }
    if (entidade === "rubricas") {
      const valor = numeroBrasileiro(input.valorTotal ?? 0);
      if (!Number.isFinite(valor) || valor < 0) throw new AppError("O valor da rubrica deve ser valido e nao negativo.", 422);
      const soma = await prisma.$queryRaw<Array<{ total: number }>>(Prisma.sql`SELECT COALESCE(SUM(valor_total), 0)::float8 AS total FROM prestacao_contas_rubrica WHERE instrumento_id = ${instrumentoId} AND tenant_id::text = ${tenantId} AND excluido_em IS NULL`);
      if (Number(soma[0]?.total ?? 0) + valor > Number(instrumento.valor_global ?? 0)) throw new AppError("A soma das rubricas nao pode ultrapassar o valor global da parceria.", 422);
    }
  }
  private async validarMeta(id: string, instrumentoId: bigint, tenantId: string) { const rows = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`SELECT id FROM prestacao_contas_meta WHERE id = ${idBigInt(id, "Meta")} AND instrumento_id = ${instrumentoId} AND tenant_id::text = ${tenantId} AND excluido_em IS NULL LIMIT 1`); if (!rows[0]) throw new AppError("A meta nao pertence a esta parceria.", 403); }
  private async validarDespesa(input: Record<string, unknown>, instrumentoId: bigint, tenantId: string) {
    const data = typeof input.dataEmissao === "string" ? input.dataEmissao : null;
    const rows = await prisma.$queryRaw<Array<{ inicio_vigencia: string | null; termino_vigencia: string | null }>>(Prisma.sql`SELECT inicio_vigencia, termino_vigencia FROM prestacao_contas_instrumento WHERE id = ${instrumentoId} AND tenant_id::text = ${tenantId} LIMIT 1`);
    const vigencia = rows[0];
    if (data && ((vigencia?.inicio_vigencia && data < String(vigencia.inicio_vigencia).slice(0, 10)) || (vigencia?.termino_vigencia && data > String(vigencia.termino_vigencia).slice(0, 10)))) throw new AppError("A despesa esta fora do periodo de vigencia da parceria.", 422);
    if (input.rubricaId) {
      const rubrica = await prisma.$queryRaw<Array<{ id: bigint; valor_total: number }>>(Prisma.sql`SELECT id, valor_total FROM prestacao_contas_rubrica WHERE id = ${idBigInt(String(input.rubricaId), "Rubrica")} AND instrumento_id = ${instrumentoId} AND tenant_id::text = ${tenantId} AND excluido_em IS NULL LIMIT 1`);
      if (!rubrica[0]) throw new AppError("A rubrica nao pertence a esta parceria.", 403);
      const valor = numeroBrasileiro(input.valorLiquido ?? input.valorBruto ?? 0);
      const executado = await prisma.$queryRaw<Array<{ total: number }>>(Prisma.sql`SELECT COALESCE(SUM(valor_liquido), 0)::float8 AS total FROM prestacao_contas_despesa WHERE rubrica_id = ${rubrica[0].id} AND instrumento_id = ${instrumentoId} AND tenant_id::text = ${tenantId} AND excluido_em IS NULL`);
      if (Number(executado[0]?.total ?? 0) + valor > Number(rubrica[0].valor_total ?? 0)) throw new AppError("A despesa ultrapassa o saldo disponível da rubrica.", 422);
    }
  }
  private async filhos(tabela: string, instrumentoId: bigint, tenantId: string) { const permitidas = ["prestacao_contas_meta", "prestacao_contas_rubrica", "prestacao_contas_receita", "prestacao_contas_despesa", "prestacao_contas_instrumento_unidade", "prestacao_contas_aditivo", "prestacao_contas_documento", "prestacao_contas_timeline"]; if (!permitidas.includes(tabela)) throw new AppError("Tabela nao autorizada.", 500); const filtroExclusao = tabela === "prestacao_contas_timeline" ? "" : " AND excluido_em IS NULL"; const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(`SELECT * FROM ${tabela} WHERE instrumento_id = $1 AND tenant_id::text = $2${filtroExclusao} ORDER BY id DESC LIMIT 500`, instrumentoId, tenantId); return rows.map(mapRow); }
  private async timeline(instrumentoId: bigint, tenantId: string, tipo: string, titulo: string, actor?: Actor, _ip?: string) { await prisma.$executeRaw(Prisma.sql`INSERT INTO prestacao_contas_timeline (tenant_id, instrumento_id, tipo_evento, titulo, usuario_id, usuario_nome) VALUES (${tenantId}::uuid, ${instrumentoId}, ${tipo}, ${titulo}, ${actor?.id ?? null}, ${actor?.nomeUsuario ?? null})`); }
}
