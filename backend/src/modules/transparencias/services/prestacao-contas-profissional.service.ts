import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";

type Actor = {
  id?: string;
  nomeUsuario?: string;
  tenant_id?: string;
};

const optionalText = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}, z.string().optional());

const optionalNumber = z.preprocess((value) => {
  if (value == null || value === "") return undefined;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value.includes(",") ? value.replace(/\./g, "").replace(",", ".") : value);
    return Number.isFinite(parsed) ? parsed : value;
  }
  return value;
}, z.number().finite().optional());

const optionalDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data valida.")
  .optional()
  .nullable();

const jsonObject = z.record(z.unknown()).default({});
const jsonArray = z.array(z.unknown()).default([]);

const concedenteSchema = z.object({
  razaoSocial: z.string().trim().min(2, "Informe a razao social."),
  nomeFantasia: optionalText.nullable().optional(),
  cpfCnpj: optionalText.nullable().optional(),
  esfera: optionalText.nullable().optional(),
  tipoEntidade: optionalText.nullable().optional(),
  endereco: optionalText.nullable().optional(),
  municipio: optionalText.nullable().optional(),
  estado: optionalText.nullable().optional(),
  cep: optionalText.nullable().optional(),
  telefone: optionalText.nullable().optional(),
  email: optionalText.nullable().optional(),
  site: optionalText.nullable().optional(),
  responsavel: optionalText.nullable().optional(),
  cargo: optionalText.nullable().optional(),
  orgao: optionalText.nullable().optional(),
  unidadeGestora: optionalText.nullable().optional(),
  dadosBancarios: jsonObject.optional(),
  observacoes: optionalText.nullable().optional(),
  situacao: optionalText.default("ATIVO")
});

const instrumentoSchema = z.object({
  ij: optionalText.nullable().optional(),
  cnpj: optionalText.nullable().optional(),
  tipificacao: optionalText.nullable().optional(),
  numeroVotoComissao: optionalText.nullable().optional(),
  origemTermo: optionalText.nullable().optional(),
  nomenclaturaTermo: optionalText.nullable().optional(),
  responsavelIndicacao: optionalText.nullable().optional(),
  orgaoCedente: optionalText.nullable().optional(),
  statusCadastro: optionalText.default("ATIVO"),
  banco: optionalText.nullable().optional(),
  agencia: optionalText.nullable().optional(),
  conta: optionalText.nullable().optional(),
  operacao: optionalText.nullable().optional(),
  contaBancariaId: optionalText.nullable().optional(),
  representanteLegal: optionalText.nullable().optional(),
  representanteCpf: optionalText.nullable().optional(),
  representanteCargo: optionalText.nullable().optional(),
  representanteProfissionalId: optionalText.nullable().optional(),
  concedenteId: optionalText.nullable().optional(),
  transparenciaId: optionalText.nullable().optional(),
  planoTrabalhoId: optionalText.nullable().optional(),
  projetoId: optionalText.nullable().optional(),
  unidadeId: optionalText.nullable().optional(),
  tipoInstrumento: z.string().trim().min(2, "Informe o tipo de instrumento."),
  numeroInstrumento: optionalText.nullable().optional(),
  numeroProcesso: optionalText.nullable().optional(),
  numeroProposta: optionalText.nullable().optional(),
  numeroPrograma: optionalText.nullable().optional(),
  numeroEdital: optionalText.nullable().optional(),
  unidadeGestora: optionalText.nullable().optional(),
  orgaoResponsavel: optionalText.nullable().optional(),
  gestorParceria: optionalText.nullable().optional(),
  fiscalParceria: optionalText.nullable().optional(),
  responsavelOrganizacao: optionalText.nullable().optional(),
  objeto: z.string().trim().min(5, "Informe o objeto."),
  justificativa: optionalText.nullable().optional(),
  publicoAlvo: optionalText.nullable().optional(),
  territorio: optionalText.nullable().optional(),
  dataAssinatura: optionalDate,
  inicioVigencia: optionalDate,
  terminoVigencia: optionalDate,
  prazoPrestacaoParcial: optionalNumber.nullable().optional(),
  prazoPrestacaoFinal: optionalNumber.nullable().optional(),
  valorGlobal: optionalNumber.default(0),
  valorRepasse: optionalNumber.default(0),
  contrapartidaFinanceira: optionalNumber.default(0),
  contrapartidaBensServicos: optionalNumber.default(0),
  recursosProprios: optionalNumber.default(0),
  quantidadeParcelas: optionalNumber.nullable().optional(),
  contaBancariaExclusiva: optionalText.nullable().optional(),
  legislacaoAplicavel: optionalText.nullable().optional(),
  regulamento: optionalText.nullable().optional(),
  fonteRecurso: optionalText.nullable().optional(),
  situacao: optionalText.default("RASCUNHO"),
  observacoes: optionalText.nullable().optional()
});

const modeloSchema = z.object({
  concedenteId: optionalText.nullable().optional(),
  nome: z.string().trim().min(2, "Informe o nome do modelo."),
  esfera: optionalText.nullable().optional(),
  tipoInstrumento: optionalText.nullable().optional(),
  legislacaoAplicavel: optionalText.nullable().optional(),
  configuracao: jsonObject.optional(),
  instrucoesEspecificas: optionalText.nullable().optional(),
  situacao: optionalText.default("ATIVO")
});

const metaSchema = z.object({
  instrumentoId: z.string().trim().min(1),
  codigo: optionalText.nullable().optional(),
  descricao: z.string().trim().min(2, "Informe a descricao da meta."),
  indicador: optionalText.nullable().optional(),
  unidadeMedida: optionalText.nullable().optional(),
  quantidadePrevista: optionalNumber.nullable().optional(),
  quantidadeRealizada: optionalNumber.nullable().optional(),
  dataInicial: optionalDate,
  dataFinal: optionalDate,
  responsavel: optionalText.nullable().optional(),
  publicoEstimado: optionalNumber.nullable().optional(),
  localidade: optionalText.nullable().optional(),
  situacao: optionalText.default("NAO_INICIADA"),
  percentualAlcancado: optionalNumber.default(0),
  justificativa: optionalText.nullable().optional(),
  observacoes: optionalText.nullable().optional()
});

const rubricaSchema = z.object({
  instrumentoId: z.string().trim().min(1),
  metaId: optionalText.nullable().optional(),
  codigo: optionalText.nullable().optional(),
  grupo: optionalText.nullable().optional(),
  categoria: z.string().trim().min(2, "Informe a categoria."),
  descricao: z.string().trim().min(2, "Informe a descricao."),
  unidadeMedida: optionalText.nullable().optional(),
  quantidade: optionalNumber.nullable().optional(),
  valorUnitario: optionalNumber.nullable().optional(),
  valorTotal: optionalNumber.default(0),
  fonteRecurso: optionalText.nullable().optional(),
  etapa: optionalText.nullable().optional(),
  atividade: optionalText.nullable().optional(),
  periodoPrevisto: optionalText.nullable().optional()
});

const receitaSchema = z.object({
  instrumentoId: z.string().trim().min(1),
  parcela: optionalText.nullable().optional(),
  competencia: optionalText.nullable().optional(),
  dataPrevista: optionalDate,
  dataDesembolso: optionalDate,
  dataRecebida: optionalDate,
  valorPrevisto: optionalNumber.default(0),
  valorRecebido: optionalNumber.default(0),
  contaBancaria: optionalText.nullable().optional(),
  documento: optionalText.nullable().optional(),
  origem: optionalText.nullable().optional(),
  tipoReceita: optionalText.default("REPASSE"),
  comprovanteArquivoId: optionalText.nullable().optional(),
  observacoes: optionalText.nullable().optional(),
  situacao: optionalText.default("PREVISTA")
});

const despesaSchema = z.object({
  instrumentoId: z.string().trim().min(1),
  projetoId: optionalText.nullable().optional(),
  metaId: optionalText.nullable().optional(),
  rubricaId: optionalText.nullable().optional(),
  numeroSequencial: optionalText.nullable().optional(),
  competencia: optionalText.nullable().optional(),
  dataEmissao: optionalDate,
  dataPagamento: optionalDate,
  fornecedor: optionalText.nullable().optional(),
  fornecedorDocumento: optionalText.nullable().optional(),
  tipoDocumento: optionalText.nullable().optional(),
  numeroDocumento: optionalText.nullable().optional(),
  serie: optionalText.nullable().optional(),
  chaveNfe: optionalText.nullable().optional(),
  descricao: z.string().trim().min(2, "Informe a descricao."),
  itens: jsonArray.optional(),
  fonteRecurso: optionalText.nullable().optional(),
  formaPagamento: optionalText.nullable().optional(),
  contaOrigem: optionalText.nullable().optional(),
  banco: optionalText.nullable().optional(),
  valorBruto: optionalNumber.default(0),
  desconto: optionalNumber.default(0),
  retencoes: optionalNumber.default(0),
  tributos: optionalNumber.default(0),
  valorLiquido: optionalNumber.default(0),
  centroCusto: optionalText.nullable().optional(),
  favorecido: optionalText.nullable().optional(),
  responsavelLancamento: optionalText.nullable().optional(),
  observacoes: optionalText.nullable().optional(),
  situacao: optionalText.default("RASCUNHO")
});

const documentoSchema = z.object({
  instrumentoId: optionalText.nullable().optional(),
  despesaId: optionalText.nullable().optional(),
  metaId: optionalText.nullable().optional(),
  categoria: z.string().trim().min(2, "Informe a categoria."),
  tipo: optionalText.nullable().optional(),
  descricao: optionalText.nullable().optional(),
  competencia: optionalText.nullable().optional(),
  arquivoId: optionalText.nullable().optional(),
  nomeOriginal: optionalText.nullable().optional(),
  hashArquivo: optionalText.nullable().optional(),
  validade: optionalDate,
  situacao: optionalText.default("ATIVO"),
  etiquetas: jsonArray.optional(),
  observacoes: optionalText.nullable().optional()
});

const conciliacaoSchema = z.object({
  instrumentoId: z.string().trim().min(1),
  contaBancaria: optionalText.nullable().optional(),
  competencia: optionalText.nullable().optional(),
  transacaoBancaria: jsonObject.optional(),
  despesaId: optionalText.nullable().optional(),
  receitaId: optionalText.nullable().optional(),
  valor: optionalNumber.nullable().optional(),
  dataMovimento: optionalDate,
  descricao: optionalText.nullable().optional(),
  situacao: optionalText.default("PENDENTE"),
  sugestao: jsonObject.optional(),
  observacoes: optionalText.nullable().optional()
});

const diligenciaSchema = z.object({
  instrumentoId: z.string().trim().min(1),
  numero: optionalText.nullable().optional(),
  dataRecebimento: optionalDate,
  prazo: optionalDate,
  descricao: z.string().trim().min(2, "Informe a diligencia."),
  itensSolicitados: jsonArray.optional(),
  responsavel: optionalText.nullable().optional(),
  prioridade: optionalText.default("MEDIA"),
  resposta: optionalText.nullable().optional(),
  protocolo: optionalText.nullable().optional(),
  situacao: optionalText.default("RECEBIDA"),
  dataEnvio: optionalDate,
  parecerRecebido: optionalText.nullable().optional()
});

const aprovacaoSchema = z.object({
  instrumentoId: z.string().trim().min(1),
  etapa: z.string().trim().min(2, "Informe a etapa."),
  cargo: optionalText.nullable().optional(),
  decisao: optionalText.default("AGUARDANDO"),
  parecer: optionalText.nullable().optional(),
  pendencias: jsonArray.optional(),
  assinaturaHash: optionalText.nullable().optional(),
  observacoes: optionalText.nullable().optional()
});

const transparenciaPublicaSchema = z.object({
  instrumentoId: z.string().trim().min(1),
  publicarValor: z.boolean().default(true),
  publicarMetas: z.boolean().default(true),
  publicarDocumentos: z.boolean().default(false),
  dadosPublicos: jsonObject.optional(),
  situacao: optionalText.default("RASCUNHO")
});

const configIaSchema = z.object({
  tipo: z.enum(["IA", "OCR"]),
  provedor: optionalText.nullable().optional(),
  urlApi: optionalText.nullable().optional(),
  modelo: optionalText.nullable().optional(),
  ambiente: optionalText.default("HOMOLOGACAO"),
  limiteUso: optionalNumber.nullable().optional(),
  timeoutMs: optionalNumber.default(30000),
  ativo: z.boolean().default(false),
  credencial: optionalText.nullable().optional(),
  observacoes: optionalText.nullable().optional()
});

function idToBigInt(raw?: string | null) {
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new AppError("Identificador invalido.", 400);
  return BigInt(parsed);
}

function onlyDigits(value?: string | null) {
  return value?.replace(/\D/g, "") || null;
}

function maskSecret(value?: string | null) {
  if (!value) return null;
  const suffix = value.slice(-4);
  return `••••••••••••${suffix}`;
}

function credentialKey() {
  return crypto
    .createHash("sha256")
    .update(process.env.G3N_CREDENTIAL_KEY || process.env.JWT_SECRET || "g3n-dev-credential-key")
    .digest();
}

function encryptSecret(value?: string | null) {
  if (!value) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", credentialKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

function toIsoDate(value: Date | null) {
  return value?.toISOString().slice(0, 10) ?? null;
}

function mapRow(row: Record<string, unknown>) {
  const mapped: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    const camelKey = key.replace(/_([a-z])/g, (_match, letter: string) => letter.toUpperCase());
    if (typeof value === "bigint") mapped[camelKey] = value.toString();
    else if (value instanceof Date) mapped[camelKey] = value.toISOString();
    else mapped[camelKey] = value;
  }
  return mapped;
}

export class PrestacaoContasProfissionalService {
  private parseTenant(actor?: Actor) {
    const tenantId = actor?.tenant_id?.trim();
    if (!tenantId) throw new AppError("Tenant da sessao nao identificado.", 401);
    return tenantId;
  }

  async visaoGeral(actor?: Actor) {
    const tenantId = this.parseTenant(actor);
    const [instrumentos, receitas, despesas, metas, documentos, conciliacoes, diligencias, aprovacoes] =
      await Promise.all([
        prisma.$queryRaw<Array<{ total: bigint; valor_global: number | null; valor_repasse: number | null; vencendo: bigint }>>(Prisma.sql`
          SELECT COUNT(*) AS total,
                 COALESCE(SUM(valor_global), 0)::float8 AS valor_global,
                 COALESCE(SUM(valor_repasse), 0)::float8 AS valor_repasse,
                 COUNT(*) FILTER (WHERE termino_vigencia BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days') AS vencendo
          FROM prestacao_contas_instrumento
          WHERE tenant_id::text = ${tenantId} AND excluido_em IS NULL
        `),
        prisma.$queryRaw<Array<{ valor: number | null }>>(Prisma.sql`
          SELECT COALESCE(SUM(valor_recebido), 0)::float8 AS valor
          FROM prestacao_contas_receita
          WHERE tenant_id::text = ${tenantId} AND excluido_em IS NULL
        `),
        prisma.$queryRaw<Array<{ valor: number | null; pendentes: bigint; inconsistentes: bigint }>>(Prisma.sql`
          SELECT COALESCE(SUM(valor_liquido), 0)::float8 AS valor,
                 COUNT(*) FILTER (WHERE situacao IN ('RASCUNHO','PENDENTE')) AS pendentes,
                 COUNT(*) FILTER (WHERE jsonb_array_length(inconsistencias) > 0 OR situacao = 'INCONSISTENTE') AS inconsistentes
          FROM prestacao_contas_despesa
          WHERE tenant_id::text = ${tenantId} AND excluido_em IS NULL
        `),
        prisma.$queryRaw<Array<{ concluidas: bigint; andamento: bigint; atrasadas: bigint }>>(Prisma.sql`
          SELECT COUNT(*) FILTER (WHERE situacao = 'CONCLUIDA') AS concluidas,
                 COUNT(*) FILTER (WHERE situacao = 'EM_ANDAMENTO') AS andamento,
                 COUNT(*) FILTER (WHERE data_final < CURRENT_DATE AND situacao NOT IN ('CONCLUIDA','CANCELADA')) AS atrasadas
          FROM prestacao_contas_meta
          WHERE tenant_id::text = ${tenantId} AND excluido_em IS NULL
        `),
        prisma.$queryRaw<Array<{ pendentes: bigint; vencidos: bigint }>>(Prisma.sql`
          SELECT COUNT(*) FILTER (WHERE situacao <> 'ATIVO') AS pendentes,
                 COUNT(*) FILTER (WHERE validade IS NOT NULL AND validade < CURRENT_DATE) AS vencidos
          FROM prestacao_contas_documento
          WHERE tenant_id::text = ${tenantId} AND excluido_em IS NULL
        `),
        prisma.$queryRaw<Array<{ pendentes: bigint }>>(Prisma.sql`
          SELECT COUNT(*) FILTER (WHERE situacao NOT IN ('CONCILIADO_AUTOMATICAMENTE','CONCILIADO_MANUALMENTE')) AS pendentes
          FROM prestacao_contas_conciliacao
          WHERE tenant_id::text = ${tenantId} AND excluido_em IS NULL
        `),
        prisma.$queryRaw<Array<{ abertas: bigint; vencidas: bigint }>>(Prisma.sql`
          SELECT COUNT(*) FILTER (WHERE situacao NOT IN ('ACEITA','PARCIALMENTE_ACEITA','REJEITADA')) AS abertas,
                 COUNT(*) FILTER (WHERE prazo < CURRENT_DATE AND situacao NOT IN ('ACEITA','PARCIALMENTE_ACEITA','REJEITADA')) AS vencidas
          FROM prestacao_contas_diligencia
          WHERE tenant_id::text = ${tenantId} AND excluido_em IS NULL
        `),
        prisma.$queryRaw<Array<{ pendentes: bigint; aprovadas: bigint; ressalvas: bigint; rejeitadas: bigint }>>(Prisma.sql`
          SELECT COUNT(*) FILTER (WHERE decisao IN ('AGUARDANDO','EM_REVISAO')) AS pendentes,
                 COUNT(*) FILTER (WHERE decisao = 'APROVADO') AS aprovadas,
                 COUNT(*) FILTER (WHERE decisao = 'APROVADO_RESSALVAS') AS ressalvas,
                 COUNT(*) FILTER (WHERE decisao = 'REJEITADO') AS rejeitadas
          FROM prestacao_contas_aprovacao
          WHERE tenant_id::text = ${tenantId} AND excluido_em IS NULL
        `)
      ]);

    const inst = instrumentos[0];
    const valorRecebido = receitas[0]?.valor ?? 0;
    const valorExecutado = despesas[0]?.valor ?? 0;
    const valorGlobal = inst?.valor_global ?? 0;
    const percentualFinanceiro = valorGlobal > 0 ? Math.min(100, (valorExecutado / valorGlobal) * 100) : 0;
    return {
      valorGlobal,
      valorPrevisto: inst?.valor_repasse ?? 0,
      valorRecebido,
      valorExecutado,
      saldoDisponivel: valorRecebido - valorExecutado,
      percentualFinanceiroExecutado: percentualFinanceiro,
      parcerias: Number(inst?.total ?? 0),
      vigenciasVencendo: Number(inst?.vencendo ?? 0),
      metasConcluidas: Number(metas[0]?.concluidas ?? 0),
      metasEmAndamento: Number(metas[0]?.andamento ?? 0),
      metasAtrasadas: Number(metas[0]?.atrasadas ?? 0),
      documentosPendentes: Number(documentos[0]?.pendentes ?? 0),
      documentosVencidos: Number(documentos[0]?.vencidos ?? 0),
      despesasPendentes: Number(despesas[0]?.pendentes ?? 0),
      despesasInconsistentes: Number(despesas[0]?.inconsistentes ?? 0),
      conciliacoesPendentes: Number(conciliacoes[0]?.pendentes ?? 0),
      diligenciasAbertas: Number(diligencias[0]?.abertas ?? 0),
      diligenciasVencidas: Number(diligencias[0]?.vencidas ?? 0),
      aprovacoesPendentes: Number(aprovacoes[0]?.pendentes ?? 0),
      prestacoesAprovadas: Number(aprovacoes[0]?.aprovadas ?? 0),
      aprovadasComRessalvas: Number(aprovacoes[0]?.ressalvas ?? 0),
      rejeitadas: Number(aprovacoes[0]?.rejeitadas ?? 0)
    };
  }

  async listar(entidade: string, actor?: Actor) {
    const tenantId = this.parseTenant(actor);
    const table = this.table(entidade);
    const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT * FROM ${table} WHERE tenant_id::text = $1 AND excluido_em IS NULL ORDER BY id DESC LIMIT 200`,
      tenantId
    );
    return rows.map(mapRow);
  }

  async criar(entidade: string, rawInput: unknown, actor?: Actor, ip?: string) {
    const tenantId = this.parseTenant(actor);
    switch (entidade) {
      case "concedentes":
        return this.criarConcedente(concedenteSchema.parse(rawInput), tenantId, actor, ip);
      case "instrumentos":
        return this.criarInstrumento(instrumentoSchema.parse(rawInput), tenantId, actor, ip);
      case "modelos":
        return this.criarModelo(modeloSchema.parse(rawInput), tenantId, actor, ip);
      case "metas":
        return this.criarMeta(metaSchema.parse(rawInput), tenantId, actor, ip);
      case "rubricas":
        return this.criarRubrica(rubricaSchema.parse(rawInput), tenantId, actor, ip);
      case "receitas":
        return this.criarReceita(receitaSchema.parse(rawInput), tenantId, actor, ip);
      case "despesas":
        return this.criarDespesa(despesaSchema.parse(rawInput), tenantId, actor, ip);
      case "documentos":
        return this.criarDocumento(documentoSchema.parse(rawInput), tenantId, actor, ip);
      case "conciliacoes":
        return this.criarConciliacao(conciliacaoSchema.parse(rawInput), tenantId, actor, ip);
      case "diligencias":
        return this.criarDiligencia(diligenciaSchema.parse(rawInput), tenantId, actor, ip);
      case "aprovacoes":
        return this.criarAprovacao(aprovacaoSchema.parse(rawInput), tenantId, actor, ip);
      case "transparencia":
        return this.criarTransparenciaPublica(transparenciaPublicaSchema.parse(rawInput), tenantId, actor, ip);
      default:
        throw new AppError("Entidade de prestacao de contas nao suportada.", 404);
    }
  }

  async listarAuditoria(actor?: Actor) {
    const tenantId = this.parseTenant(actor);
    const rows = await prisma.$queryRaw<Record<string, unknown>[]>(Prisma.sql`
      SELECT * FROM prestacao_contas_auditoria
      WHERE tenant_id::text = ${tenantId}
      ORDER BY criado_em DESC
      LIMIT 200
    `);
    return rows.map(mapRow);
  }

  async obterConfiguracoesIa(actor?: Actor) {
    const tenantId = this.parseTenant(actor);
    const rows = await prisma.$queryRaw<Record<string, unknown>[]>(Prisma.sql`
      SELECT id, tipo, provedor, url_api, modelo, ambiente, limite_uso, timeout_ms, ativo,
             credencial_mascarada, ultimo_teste_em, ultimo_sucesso_em, ultimo_erro, observacoes,
             atualizado_em, atualizado_por
      FROM prestacao_contas_configuracao_ia
      WHERE tenant_id::text = ${tenantId} AND excluido_em IS NULL
      ORDER BY tipo
    `);
    return rows.map(mapRow);
  }

  async salvarConfiguracaoIa(rawInput: unknown, actor?: Actor, ip?: string) {
    const tenantId = this.parseTenant(actor);
    const input = configIaSchema.parse(rawInput);
    const credencialCriptografada = input.credencial ? encryptSecret(input.credencial) : null;
    const credencialMascarada = input.credencial ? maskSecret(input.credencial) : undefined;
    const rows = await prisma.$queryRaw<Record<string, unknown>[]>(Prisma.sql`
      INSERT INTO prestacao_contas_configuracao_ia (
        tenant_id, tipo, provedor, url_api, modelo, ambiente, limite_uso, timeout_ms, ativo,
        credencial_criptografada, credencial_mascarada, observacoes, criado_por, atualizado_por
      ) VALUES (
        ${tenantId}::uuid, ${input.tipo}, ${input.provedor ?? null}, ${input.urlApi ?? null}, ${input.modelo ?? null},
        ${input.ambiente}, ${input.limiteUso ?? null}, ${input.timeoutMs ?? 30000}, ${input.ativo},
        ${credencialCriptografada}, ${credencialMascarada ?? null}, ${input.observacoes ?? null},
        ${actor?.id ?? null}, ${actor?.id ?? null}
      )
      ON CONFLICT (tenant_id, tipo) WHERE excluido_em IS NULL DO UPDATE SET
        provedor = EXCLUDED.provedor,
        url_api = EXCLUDED.url_api,
        modelo = EXCLUDED.modelo,
        ambiente = EXCLUDED.ambiente,
        limite_uso = EXCLUDED.limite_uso,
        timeout_ms = EXCLUDED.timeout_ms,
        ativo = EXCLUDED.ativo,
        credencial_criptografada = COALESCE(EXCLUDED.credencial_criptografada, prestacao_contas_configuracao_ia.credencial_criptografada),
        credencial_mascarada = COALESCE(EXCLUDED.credencial_mascarada, prestacao_contas_configuracao_ia.credencial_mascarada),
        observacoes = EXCLUDED.observacoes,
        atualizado_em = NOW(),
        atualizado_por = EXCLUDED.atualizado_por,
        versao = prestacao_contas_configuracao_ia.versao + 1
      RETURNING id, tipo, provedor, url_api, modelo, ambiente, limite_uso, timeout_ms, ativo,
        credencial_mascarada, ultimo_teste_em, ultimo_sucesso_em, ultimo_erro, observacoes, atualizado_em, atualizado_por
    `);
    await this.audit(tenantId, null, "configuracao_ia", String(rows[0]?.id ?? input.tipo), "SALVAR_CONFIGURACAO", actor, ip);
    return mapRow(rows[0] ?? {});
  }

  async testarConfiguracaoIa(rawInput: unknown, actor?: Actor, ip?: string) {
    const tenantId = this.parseTenant(actor);
    const input = z.object({ tipo: z.enum(["IA", "OCR"]) }).parse(rawInput);
    const rows = await prisma.$queryRaw<Array<{ id: bigint; ativo: boolean; provedor: string | null; url_api: string | null }>>(Prisma.sql`
      SELECT id, ativo, provedor, url_api
      FROM prestacao_contas_configuracao_ia
      WHERE tenant_id::text = ${tenantId} AND tipo = ${input.tipo} AND excluido_em IS NULL
      LIMIT 1
    `);
    const config = rows[0];
    const ok = Boolean(config?.ativo && config?.provedor);
    await prisma.$executeRaw(Prisma.sql`
      UPDATE prestacao_contas_configuracao_ia
      SET ultimo_teste_em = NOW(),
          ultimo_sucesso_em = CASE WHEN ${ok} THEN NOW() ELSE ultimo_sucesso_em END,
          ultimo_erro = CASE WHEN ${ok} THEN NULL ELSE 'Configuracao incompleta ou inativa.' END
      WHERE tenant_id::text = ${tenantId} AND tipo = ${input.tipo}
    `);
    await this.audit(tenantId, null, "configuracao_ia", input.tipo, "TESTAR_CONFIGURACAO", actor, ip);
    return {
      sucesso: ok,
      mensagem: ok ? "Configuração validada localmente. Integração externa ainda não executada nesta etapa." : "Configure provedor e ative a integração antes do uso."
    };
  }

  async analisarDocumento(rawInput: unknown, actor?: Actor, ip?: string) {
    const tenantId = this.parseTenant(actor);
    const input = z.object({ documentoId: z.string().min(1) }).parse(rawInput);
    await this.audit(tenantId, null, "documento", input.documentoId, "ANALISAR_DOCUMENTO", actor, ip);
    return {
      documentoId: input.documentoId,
      situacao: "AGUARDANDO_CONFIRMACAO_HUMANA",
      confianca: 0,
      sugestoes: [],
      divergencias: [],
      mensagem: "A estrutura de OCR está preparada. Nenhum campo foi preenchido automaticamente nesta etapa."
    };
  }

  async assistente(rawInput: unknown, actor?: Actor, ip?: string) {
    const tenantId = this.parseTenant(actor);
    const input = z.object({
      comando: z.string().trim().min(2),
      contexto: z.record(z.unknown()).default({})
    }).parse(rawInput);
    await this.audit(tenantId, null, "assistente_ia", null, "GERAR_RASCUNHO", actor, ip);
    return {
      tipo: "RASCUNHO",
      origemDados: Object.keys(input.contexto),
      resposta:
        "Sugestão gerada sem consultar provedor externo nesta etapa. Revise os dados reais do G3N, confira documentos e registre a validação humana antes de usar em relatório, diligência ou parecer."
    };
  }

  private table(entidade: string) {
    const tables: Record<string, string> = {
      concedentes: "prestacao_contas_concedente",
      instrumentos: "prestacao_contas_instrumento",
      modelos: "prestacao_contas_modelo",
      metas: "prestacao_contas_meta",
      rubricas: "prestacao_contas_rubrica",
      receitas: "prestacao_contas_receita",
      despesas: "prestacao_contas_despesa",
      documentos: "prestacao_contas_documento",
      conciliacoes: "prestacao_contas_conciliacao",
      diligencias: "prestacao_contas_diligencia",
      aprovacoes: "prestacao_contas_aprovacao",
      transparencia: "prestacao_contas_transparencia_publica"
    };
    const table = tables[entidade];
    if (!table) throw new AppError("Entidade de prestacao de contas nao suportada.", 404);
    return table;
  }

  private async audit(tenantId: string, instrumentoId: bigint | null, entidade: string, entidadeId: string | null, acao: string, actor?: Actor, ip?: string) {
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO prestacao_contas_auditoria (
        tenant_id, instrumento_id, entidade, entidade_id, acao, usuario_id, usuario_nome, ip
      ) VALUES (
        ${tenantId}::uuid, ${instrumentoId}, ${entidade}, ${entidadeId}, ${acao}, ${actor?.id ?? null}, ${actor?.nomeUsuario ?? null}, ${ip ?? null}
      )
    `);
  }

  private async criarConcedente(input: z.infer<typeof concedenteSchema>, tenantId: string, actor?: Actor, ip?: string) {
    const documento = onlyDigits(input.cpfCnpj ?? null);
    const rows = await prisma.$queryRaw<Record<string, unknown>[]>(Prisma.sql`
      INSERT INTO prestacao_contas_concedente (
        tenant_id, razao_social, nome_fantasia, cpf_cnpj, esfera, tipo_entidade, endereco, municipio,
        estado, cep, telefone, email, site, responsavel, cargo, orgao, unidade_gestora,
        dados_bancarios, observacoes, situacao, criado_por, atualizado_por
      ) VALUES (
        ${tenantId}::uuid, ${input.razaoSocial}, ${input.nomeFantasia ?? null}, ${documento}, ${input.esfera ?? null},
        ${input.tipoEntidade ?? null}, ${input.endereco ?? null}, ${input.municipio ?? null}, ${input.estado ?? null},
        ${onlyDigits(input.cep ?? null)}, ${onlyDigits(input.telefone ?? null)}, ${input.email?.toLowerCase() ?? null},
        ${input.site ?? null}, ${input.responsavel ?? null}, ${input.cargo ?? null}, ${input.orgao ?? null},
        ${input.unidadeGestora ?? null}, ${JSON.stringify(input.dadosBancarios ?? {})}::jsonb,
        ${input.observacoes ?? null}, ${input.situacao ?? "ATIVO"}, ${actor?.id ?? null}, ${actor?.id ?? null}
      ) RETURNING *
    `);
    await this.audit(tenantId, null, "concedente", String(rows[0]?.id), "CRIAR", actor, ip);
    return mapRow(rows[0] ?? {});
  }

  private async criarInstrumento(input: z.infer<typeof instrumentoSchema>, tenantId: string, actor?: Actor, ip?: string) {
    const rows = await prisma.$queryRaw<Record<string, unknown>[]>(Prisma.sql`
      INSERT INTO prestacao_contas_instrumento (
        tenant_id, concedente_id, transparencia_id, plano_trabalho_id, projeto_id, unidade_id, tipo_instrumento,
        numero_instrumento, ij, cnpj, tipificacao, numero_voto_comissao, origem_termo, nomenclatura_termo, responsavel_indicacao, orgao_cedente, status_cadastro,
        banco, agencia, conta, operacao, conta_bancaria_id, representante_legal, representante_cpf, representante_cargo, representante_profissional_id,
        numero_processo, numero_proposta, numero_programa, numero_edital,
        unidade_gestora, orgao_responsavel, gestor_parceria, fiscal_parceria, responsavel_organizacao,
        objeto, justificativa, publico_alvo, territorio, data_assinatura, inicio_vigencia, termino_vigencia,
        prazo_prestacao_parcial, prazo_prestacao_final, valor_global, valor_repasse,
        contrapartida_financeira, contrapartida_bens_servicos, recursos_proprios, quantidade_parcelas,
        conta_bancaria_exclusiva, legislacao_aplicavel, regulamento, fonte_recurso, situacao,
        observacoes, criado_por, atualizado_por
      ) VALUES (
        ${tenantId}::uuid, ${idToBigInt(input.concedenteId)}, ${idToBigInt(input.transparenciaId)},
        ${idToBigInt(input.planoTrabalhoId)}, ${idToBigInt(input.projetoId)}, ${idToBigInt(input.unidadeId)},
        ${input.tipoInstrumento}, ${input.numeroInstrumento ?? null}, ${input.ij ?? null}, ${input.cnpj ?? null}, ${input.tipificacao ?? null}, ${input.numeroVotoComissao ?? null}, ${input.origemTermo ?? null}, ${input.nomenclaturaTermo ?? null}, ${input.responsavelIndicacao ?? null}, ${input.orgaoCedente ?? null}, ${input.statusCadastro ?? "ATIVO"},
        ${input.banco ?? null}, ${input.agencia ?? null}, ${input.conta ?? null}, ${input.operacao ?? null}, ${idToBigInt(input.contaBancariaId)}, ${input.representanteLegal ?? null}, ${input.representanteCpf ?? null}, ${input.representanteCargo ?? null}, ${idToBigInt(input.representanteProfissionalId)},
        ${input.numeroProcesso ?? null}, ${input.numeroProposta ?? null}, ${input.numeroPrograma ?? null}, ${input.numeroEdital ?? null},
        ${input.unidadeGestora ?? null}, ${input.orgaoResponsavel ?? null}, ${input.gestorParceria ?? null},
        ${input.fiscalParceria ?? null}, ${input.responsavelOrganizacao ?? null}, ${input.objeto},
        ${input.justificativa ?? null}, ${input.publicoAlvo ?? null}, ${input.territorio ?? null},
        ${input.dataAssinatura ?? null}::date, ${input.inicioVigencia ?? null}::date, ${input.terminoVigencia ?? null}::date,
        ${input.prazoPrestacaoParcial ?? null}, ${input.prazoPrestacaoFinal ?? null}, ${input.valorGlobal ?? 0},
        ${input.valorRepasse ?? 0}, ${input.contrapartidaFinanceira ?? 0}, ${input.contrapartidaBensServicos ?? 0},
        ${input.recursosProprios ?? 0}, ${input.quantidadeParcelas ?? null}, ${input.contaBancariaExclusiva ?? null},
        ${input.legislacaoAplicavel ?? null}, ${input.regulamento ?? null}, ${input.fonteRecurso ?? null},
        ${input.situacao ?? "RASCUNHO"}, ${input.observacoes ?? null}, ${actor?.id ?? null}, ${actor?.id ?? null}
      ) RETURNING *
    `);
    await this.audit(tenantId, BigInt(String(rows[0]?.id)), "instrumento", String(rows[0]?.id), "CRIAR", actor, ip);
    return mapRow(rows[0] ?? {});
  }

  private async criarModelo(input: z.infer<typeof modeloSchema>, tenantId: string, actor?: Actor, ip?: string) {
    const rows = await prisma.$queryRaw<Record<string, unknown>[]>(Prisma.sql`
      INSERT INTO prestacao_contas_modelo (
        tenant_id, concedente_id, nome, esfera, tipo_instrumento, legislacao_aplicavel,
        configuracao, instrucoes_especificas, situacao, criado_por, atualizado_por
      ) VALUES (
        ${tenantId}::uuid, ${idToBigInt(input.concedenteId)}, ${input.nome}, ${input.esfera ?? null},
        ${input.tipoInstrumento ?? null}, ${input.legislacaoAplicavel ?? null},
        ${JSON.stringify(input.configuracao ?? {})}::jsonb, ${input.instrucoesEspecificas ?? null},
        ${input.situacao ?? "ATIVO"}, ${actor?.id ?? null}, ${actor?.id ?? null}
      ) RETURNING *
    `);
    await this.audit(tenantId, null, "modelo", String(rows[0]?.id), "CRIAR", actor, ip);
    return mapRow(rows[0] ?? {});
  }

  private async criarMeta(input: z.infer<typeof metaSchema>, tenantId: string, actor?: Actor, ip?: string) {
    const instrumentoId = idToBigInt(input.instrumentoId);
    const rows = await prisma.$queryRaw<Record<string, unknown>[]>(Prisma.sql`
      INSERT INTO prestacao_contas_meta (
        tenant_id, instrumento_id, codigo, descricao, indicador, unidade_medida, quantidade_prevista,
        quantidade_realizada, data_inicial, data_final, responsavel, publico_estimado, localidade,
        situacao, percentual_alcancado, justificativa, observacoes, criado_por, atualizado_por
      ) VALUES (
        ${tenantId}::uuid, ${instrumentoId}, ${input.codigo ?? null}, ${input.descricao}, ${input.indicador ?? null},
        ${input.unidadeMedida ?? null}, ${input.quantidadePrevista ?? null}, ${input.quantidadeRealizada ?? null},
        ${input.dataInicial ?? null}::date, ${input.dataFinal ?? null}::date, ${input.responsavel ?? null},
        ${input.publicoEstimado ?? null}, ${input.localidade ?? null}, ${input.situacao ?? "NAO_INICIADA"},
        ${input.percentualAlcancado ?? 0}, ${input.justificativa ?? null}, ${input.observacoes ?? null},
        ${actor?.id ?? null}, ${actor?.id ?? null}
      ) RETURNING *
    `);
    await this.audit(tenantId, instrumentoId, "meta", String(rows[0]?.id), "CRIAR", actor, ip);
    return mapRow(rows[0] ?? {});
  }

  private async criarRubrica(input: z.infer<typeof rubricaSchema>, tenantId: string, actor?: Actor, ip?: string) {
    const instrumentoId = idToBigInt(input.instrumentoId);
    const rows = await prisma.$queryRaw<Record<string, unknown>[]>(Prisma.sql`
      INSERT INTO prestacao_contas_rubrica (
        tenant_id, instrumento_id, meta_id, codigo, grupo, categoria, descricao, unidade_medida,
        quantidade, valor_unitario, valor_total, fonte_recurso, etapa, atividade, periodo_previsto,
        criado_por, atualizado_por
      ) VALUES (
        ${tenantId}::uuid, ${instrumentoId}, ${idToBigInt(input.metaId)}, ${input.codigo ?? null},
        ${input.grupo ?? null}, ${input.categoria}, ${input.descricao}, ${input.unidadeMedida ?? null},
        ${input.quantidade ?? null}, ${input.valorUnitario ?? null}, ${input.valorTotal ?? 0},
        ${input.fonteRecurso ?? null}, ${input.etapa ?? null}, ${input.atividade ?? null},
        ${input.periodoPrevisto ?? null}, ${actor?.id ?? null}, ${actor?.id ?? null}
      ) RETURNING *
    `);
    await this.audit(tenantId, instrumentoId, "rubrica", String(rows[0]?.id), "CRIAR", actor, ip);
    return mapRow(rows[0] ?? {});
  }

  private async criarReceita(input: z.infer<typeof receitaSchema>, tenantId: string, actor?: Actor, ip?: string) {
    const instrumentoId = idToBigInt(input.instrumentoId);
    const rows = await prisma.$queryRaw<Record<string, unknown>[]>(Prisma.sql`
      INSERT INTO prestacao_contas_receita (
        tenant_id, instrumento_id, parcela, competencia, data_prevista, data_desembolso, data_recebida, valor_previsto,
        valor_recebido, conta_bancaria, documento, origem, tipo_receita, comprovante_arquivo_id,
        observacoes, situacao, criado_por, atualizado_por
      ) VALUES (
        ${tenantId}::uuid, ${instrumentoId}, ${input.parcela ?? null}, ${input.competencia ?? null},
        ${input.dataPrevista ?? null}::date, ${input.dataDesembolso ?? input.dataPrevista ?? null}::date, ${input.dataRecebida ?? null}::date, ${input.valorPrevisto ?? 0},
        ${input.valorRecebido ?? 0}, ${input.contaBancaria ?? null}, ${input.documento ?? null},
        ${input.origem ?? null}, ${input.tipoReceita ?? "REPASSE"}, ${idToBigInt(input.comprovanteArquivoId)},
        ${input.observacoes ?? null}, ${input.situacao ?? "PREVISTA"}, ${actor?.id ?? null}, ${actor?.id ?? null}
      ) RETURNING *
    `);
    await this.audit(tenantId, instrumentoId, "receita", String(rows[0]?.id), "CRIAR", actor, ip);
    return mapRow(rows[0] ?? {});
  }

  private async criarDespesa(input: z.infer<typeof despesaSchema>, tenantId: string, actor?: Actor, ip?: string) {
    const instrumentoId = idToBigInt(input.instrumentoId);
    const inconsistencias: string[] = [];
    if (input.dataEmissao && input.dataPagamento && input.dataPagamento < input.dataEmissao) {
      inconsistencias.push("Pagamento anterior a emissao do documento.");
    }
    if (input.valorLiquido === 0 && input.valorBruto > 0) {
      input.valorLiquido = input.valorBruto - (input.desconto ?? 0) - (input.retencoes ?? 0) - (input.tributos ?? 0);
    }
    if (input.fornecedorDocumento && ![11, 14].includes(onlyDigits(input.fornecedorDocumento)?.length ?? 0)) {
      inconsistencias.push("CPF ou CNPJ do fornecedor possui quantidade de digitos invalida.");
    }
    const rows = await prisma.$queryRaw<Record<string, unknown>[]>(Prisma.sql`
      INSERT INTO prestacao_contas_despesa (
        tenant_id, instrumento_id, projeto_id, meta_id, rubrica_id, numero_sequencial, competencia,
        data_emissao, data_pagamento, fornecedor, fornecedor_documento, tipo_documento, numero_documento,
        serie, chave_nfe, descricao, itens, fonte_recurso, forma_pagamento, conta_origem, banco,
        valor_bruto, desconto, retencoes, tributos, valor_liquido, centro_custo, favorecido,
        responsavel_lancamento, observacoes, situacao, inconsistencias, criado_por, atualizado_por
      ) VALUES (
        ${tenantId}::uuid, ${instrumentoId}, ${idToBigInt(input.projetoId)}, ${idToBigInt(input.metaId)},
        ${idToBigInt(input.rubricaId)}, ${input.numeroSequencial ?? null}, ${input.competencia ?? null},
        ${input.dataEmissao ?? null}::date, ${input.dataPagamento ?? null}::date, ${input.fornecedor ?? null},
        ${onlyDigits(input.fornecedorDocumento ?? null)}, ${input.tipoDocumento ?? null}, ${input.numeroDocumento ?? null},
        ${input.serie ?? null}, ${input.chaveNfe ?? null}, ${input.descricao}, ${JSON.stringify(input.itens ?? [])}::jsonb,
        ${input.fonteRecurso ?? null}, ${input.formaPagamento ?? null}, ${input.contaOrigem ?? null}, ${input.banco ?? null},
        ${input.valorBruto ?? 0}, ${input.desconto ?? 0}, ${input.retencoes ?? 0}, ${input.tributos ?? 0},
        ${input.valorLiquido ?? 0}, ${input.centroCusto ?? null}, ${input.favorecido ?? null},
        ${input.responsavelLancamento ?? actor?.nomeUsuario ?? null}, ${input.observacoes ?? null},
        ${inconsistencias.length ? "INCONSISTENTE" : input.situacao ?? "RASCUNHO"},
        ${JSON.stringify(inconsistencias)}::jsonb, ${actor?.id ?? null}, ${actor?.id ?? null}
      ) RETURNING *
    `);
    await this.audit(tenantId, instrumentoId, "despesa", String(rows[0]?.id), "CRIAR", actor, ip);
    return mapRow(rows[0] ?? {});
  }

  private async criarDocumento(input: z.infer<typeof documentoSchema>, tenantId: string, actor?: Actor, ip?: string) {
    const instrumentoId = idToBigInt(input.instrumentoId);
    const rows = await prisma.$queryRaw<Record<string, unknown>[]>(Prisma.sql`
      INSERT INTO prestacao_contas_documento (
        tenant_id, instrumento_id, despesa_id, meta_id, categoria, tipo, descricao, competencia,
        arquivo_id, nome_original, hash_arquivo, validade, situacao, etiquetas, observacoes,
        criado_por, atualizado_por
      ) VALUES (
        ${tenantId}::uuid, ${instrumentoId}, ${idToBigInt(input.despesaId)}, ${idToBigInt(input.metaId)},
        ${input.categoria}, ${input.tipo ?? null}, ${input.descricao ?? null}, ${input.competencia ?? null},
        ${idToBigInt(input.arquivoId)}, ${input.nomeOriginal ?? null}, ${input.hashArquivo ?? null},
        ${input.validade ?? null}::date, ${input.situacao ?? "ATIVO"}, ${JSON.stringify(input.etiquetas ?? [])}::jsonb,
        ${input.observacoes ?? null}, ${actor?.id ?? null}, ${actor?.id ?? null}
      ) RETURNING *
    `);
    await this.audit(tenantId, instrumentoId, "documento", String(rows[0]?.id), "CRIAR", actor, ip);
    return mapRow(rows[0] ?? {});
  }

  private async criarConciliacao(input: z.infer<typeof conciliacaoSchema>, tenantId: string, actor?: Actor, ip?: string) {
    const instrumentoId = idToBigInt(input.instrumentoId);
    const rows = await prisma.$queryRaw<Record<string, unknown>[]>(Prisma.sql`
      INSERT INTO prestacao_contas_conciliacao (
        tenant_id, instrumento_id, conta_bancaria, competencia, transacao_bancaria, despesa_id, receita_id,
        valor, data_movimento, descricao, situacao, sugestao, observacoes, criado_por, atualizado_por
      ) VALUES (
        ${tenantId}::uuid, ${instrumentoId}, ${input.contaBancaria ?? null}, ${input.competencia ?? null},
        ${JSON.stringify(input.transacaoBancaria ?? {})}::jsonb, ${idToBigInt(input.despesaId)},
        ${idToBigInt(input.receitaId)}, ${input.valor ?? null}, ${input.dataMovimento ?? null}::date,
        ${input.descricao ?? null}, ${input.situacao ?? "PENDENTE"}, ${JSON.stringify(input.sugestao ?? {})}::jsonb,
        ${input.observacoes ?? null}, ${actor?.id ?? null}, ${actor?.id ?? null}
      ) RETURNING *
    `);
    await this.audit(tenantId, instrumentoId, "conciliacao", String(rows[0]?.id), "CRIAR", actor, ip);
    return mapRow(rows[0] ?? {});
  }

  private async criarDiligencia(input: z.infer<typeof diligenciaSchema>, tenantId: string, actor?: Actor, ip?: string) {
    const instrumentoId = idToBigInt(input.instrumentoId);
    const rows = await prisma.$queryRaw<Record<string, unknown>[]>(Prisma.sql`
      INSERT INTO prestacao_contas_diligencia (
        tenant_id, instrumento_id, numero, data_recebimento, prazo, descricao, itens_solicitados,
        responsavel, prioridade, resposta, protocolo, situacao, data_envio, parecer_recebido,
        criado_por, atualizado_por
      ) VALUES (
        ${tenantId}::uuid, ${instrumentoId}, ${input.numero ?? null}, ${input.dataRecebimento ?? null}::date,
        ${input.prazo ?? null}::date, ${input.descricao}, ${JSON.stringify(input.itensSolicitados ?? [])}::jsonb,
        ${input.responsavel ?? null}, ${input.prioridade ?? "MEDIA"}, ${input.resposta ?? null},
        ${input.protocolo ?? null}, ${input.situacao ?? "RECEBIDA"}, ${input.dataEnvio ?? null}::date,
        ${input.parecerRecebido ?? null}, ${actor?.id ?? null}, ${actor?.id ?? null}
      ) RETURNING *
    `);
    await this.audit(tenantId, instrumentoId, "diligencia", String(rows[0]?.id), "CRIAR", actor, ip);
    return mapRow(rows[0] ?? {});
  }

  private async criarAprovacao(input: z.infer<typeof aprovacaoSchema>, tenantId: string, actor?: Actor, ip?: string) {
    const instrumentoId = idToBigInt(input.instrumentoId);
    const rows = await prisma.$queryRaw<Record<string, unknown>[]>(Prisma.sql`
      INSERT INTO prestacao_contas_aprovacao (
        tenant_id, instrumento_id, etapa, usuario_id, usuario_nome, cargo, decisao, parecer,
        pendencias, assinatura_hash, ip, observacoes, criado_por, atualizado_por
      ) VALUES (
        ${tenantId}::uuid, ${instrumentoId}, ${input.etapa}, ${actor?.id ?? null}, ${actor?.nomeUsuario ?? null},
        ${input.cargo ?? null}, ${input.decisao ?? "AGUARDANDO"}, ${input.parecer ?? null},
        ${JSON.stringify(input.pendencias ?? [])}::jsonb, ${input.assinaturaHash ?? null}, ${ip ?? null},
        ${input.observacoes ?? null}, ${actor?.id ?? null}, ${actor?.id ?? null}
      ) RETURNING *
    `);
    await this.audit(tenantId, instrumentoId, "aprovacao", String(rows[0]?.id), "CRIAR", actor, ip);
    return mapRow(rows[0] ?? {});
  }

  private async criarTransparenciaPublica(input: z.infer<typeof transparenciaPublicaSchema>, tenantId: string, actor?: Actor, ip?: string) {
    const instrumentoId = idToBigInt(input.instrumentoId);
    const rows = await prisma.$queryRaw<Record<string, unknown>[]>(Prisma.sql`
      INSERT INTO prestacao_contas_transparencia_publica (
        tenant_id, instrumento_id, publicar_valor, publicar_metas, publicar_documentos,
        dados_publicos, situacao, criado_por, atualizado_por
      ) VALUES (
        ${tenantId}::uuid, ${instrumentoId}, ${input.publicarValor}, ${input.publicarMetas},
        ${input.publicarDocumentos}, ${JSON.stringify(input.dadosPublicos ?? {})}::jsonb,
        ${input.situacao ?? "RASCUNHO"}, ${actor?.id ?? null}, ${actor?.id ?? null}
      ) RETURNING *
    `);
    await this.audit(tenantId, instrumentoId, "transparencia", String(rows[0]?.id), "CRIAR", actor, ip);
    return mapRow(rows[0] ?? {});
  }
}
