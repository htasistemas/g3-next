import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { normalizeDigits, toOptionalDate, trimOrUndefined } from "../../../utils/string-utils.js";
import { ParametrosSistemaRepository } from "../../configuracoes-gerais/repositories/parametros-sistema.repository.js";
import type {
  CentralAtendimentoInput,
  CentralAtendimentosBuscaFilters,
  CentralBeneficioInput,
  CentralEncaminhamentoInput,
  CentralRelatorioTipo
} from "../central-atendimentos.types.js";

const estruturaSql = [
  `
    CREATE TABLE IF NOT EXISTS central_atendimento (
      id BIGSERIAL PRIMARY KEY,
      tenant_id UUID,
      beneficiario_id BIGINT NOT NULL,
      familia_id BIGINT,
      data_hora TIMESTAMP NOT NULL,
      tipo_atendimento VARCHAR(120) NOT NULL,
      setor VARCHAR(120) NOT NULL,
      profissional_responsavel VARCHAR(160) NOT NULL,
      prioridade VARCHAR(60),
      status VARCHAR(60) NOT NULL DEFAULT 'Aberto',
      classificacao VARCHAR(120),
      necessidade_identificada TEXT,
      resumo TEXT NOT NULL,
      observacoes TEXT,
      retorno_previsto DATE,
      criado_por_usuario_id BIGINT,
      criado_por_nome VARCHAR(160),
      criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
      atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `,
  "ALTER TABLE central_atendimento ADD COLUMN IF NOT EXISTS tenant_id UUID",
  "CREATE INDEX IF NOT EXISTS central_atendimento_tenant_beneficiario_idx ON central_atendimento(tenant_id, beneficiario_id)",
  "CREATE INDEX IF NOT EXISTS central_atendimento_beneficiario_idx ON central_atendimento(beneficiario_id)",
  `
    CREATE TABLE IF NOT EXISTS central_beneficio (
      id BIGSERIAL PRIMARY KEY,
      tenant_id UUID,
      beneficiario_id BIGINT NOT NULL,
      familia_id BIGINT,
      data DATE NOT NULL,
      tipo VARCHAR(120) NOT NULL,
      item VARCHAR(160) NOT NULL,
      quantidade NUMERIC(14,2) NOT NULL DEFAULT 1,
      valor_unitario NUMERIC(14,2) NOT NULL DEFAULT 0,
      valor_total NUMERIC(14,2) NOT NULL DEFAULT 0,
      origem_recurso VARCHAR(160),
      projeto_programa VARCHAR(160),
      profissional_responsavel VARCHAR(160) NOT NULL,
      observacoes TEXT,
      ciente_alertas BOOLEAN NOT NULL DEFAULT FALSE,
      criado_por_usuario_id BIGINT,
      criado_por_nome VARCHAR(160),
      criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
      atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `,
  "ALTER TABLE central_beneficio ADD COLUMN IF NOT EXISTS tenant_id UUID",
  "CREATE INDEX IF NOT EXISTS central_beneficio_tenant_beneficiario_idx ON central_beneficio(tenant_id, beneficiario_id)",
  "CREATE INDEX IF NOT EXISTS central_beneficio_beneficiario_idx ON central_beneficio(beneficiario_id)",
  `
    CREATE TABLE IF NOT EXISTS central_encaminhamento (
      id BIGSERIAL PRIMARY KEY,
      tenant_id UUID,
      beneficiario_id BIGINT NOT NULL,
      familia_id BIGINT,
      data DATE NOT NULL,
      tipo VARCHAR(120) NOT NULL,
      destino VARCHAR(200) NOT NULL,
      profissional VARCHAR(160) NOT NULL,
      motivo TEXT NOT NULL,
      retorno_esperado DATE,
      status VARCHAR(60) NOT NULL DEFAULT 'Pendente',
      observacoes TEXT,
      criado_por_usuario_id BIGINT,
      criado_por_nome VARCHAR(160),
      criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
      atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `,
  "ALTER TABLE central_encaminhamento ADD COLUMN IF NOT EXISTS tenant_id UUID",
  "CREATE INDEX IF NOT EXISTS central_encaminhamento_tenant_beneficiario_idx ON central_encaminhamento(tenant_id, beneficiario_id)",
  "CREATE INDEX IF NOT EXISTS central_encaminhamento_beneficiario_idx ON central_encaminhamento(beneficiario_id)",
  `
    CREATE TABLE IF NOT EXISTS central_auditoria (
      id BIGSERIAL PRIMARY KEY,
      tenant_id UUID,
      beneficiario_id BIGINT,
      familia_id BIGINT,
      entidade VARCHAR(80) NOT NULL,
      entidade_id BIGINT,
      acao VARCHAR(80) NOT NULL,
      descricao TEXT NOT NULL,
      dados_novos JSONB,
      usuario_id BIGINT,
      usuario_nome VARCHAR(160),
      criado_em TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `
  ,
  "ALTER TABLE central_auditoria ADD COLUMN IF NOT EXISTS tenant_id UUID",
  "CREATE INDEX IF NOT EXISTS central_auditoria_tenant_beneficiario_idx ON central_auditoria(tenant_id, beneficiario_id, criado_em DESC)"
];

let estruturaPromise: Promise<void> | null = null;
const parametrosSistemaRepository = new ParametrosSistemaRepository();

type UsuarioActor = { id?: string; nome?: string; nomeUsuario?: string; tenant_id?: string; instituicao_id?: string };
type ResumoBeneficiarioRow = {
  id: bigint;
  codigo: string | null;
  nome_completo: string;
  data_nascimento: Date;
  sexo_biologico: string | null;
  status: string | null;
  nome_mae: string | null;
  foto_3x4: string | null;
  telefone_principal: string | null;
  email: string | null;
  cpf: string | null;
  logradouro: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  familia_id: bigint | null;
  familia_nome: string | null;
  responsavel_familiar_nome: string | null;
};

function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") return Number(value);
  return 0;
}

function formatIsoDate(value?: Date | string | null) {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function inicioMesAtual() {
  const hoje = new Date();
  return new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), 1));
}

function inicioAnoAtual() {
  const hoje = new Date();
  return new Date(Date.UTC(hoje.getUTCFullYear(), 0, 1));
}

export class CentralAtendimentosRepository {
  private async validarBeneficiarioTenant(beneficiarioId: bigint, tenantId: string) {
    const rows = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
      SELECT id
      FROM cadastro_beneficiario
      WHERE id = ${beneficiarioId}
        AND tenant_id::text = ${tenantId}
      LIMIT 1
    `);
    if (!rows[0]) {
      throw new AppError("Beneficiario nao encontrado.", 404);
    }
  }

  private async validarFamiliaTenant(familiaId: bigint, tenantId: string) {
    const rows = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
      SELECT id
      FROM vinculo_familiar
      WHERE id = ${familiaId}
        AND tenant_id::text = ${tenantId}
      LIMIT 1
    `);
    return rows[0]?.id ?? null;
  }

  async ensureEstrutura() {
    if (!estruturaPromise) {
      estruturaPromise = (async () => {
        for (const comando of estruturaSql) {
          await prisma.$executeRawUnsafe(comando);
        }
      })();
    }

    await estruturaPromise;
  }

  async buscarBeneficiarios(filters: CentralAtendimentosBuscaFilters, tenantId: string) {
    await this.ensureEstrutura();
    const busca = trimOrUndefined(filters.busca);
    const bairro = trimOrUndefined(filters.bairro);
    const status = trimOrUndefined(filters.situacao_cadastral);
    const sexo = trimOrUndefined(filters.sexo);
    const somenteComFamilia = filters.familia_vinculada === true;
    const comBeneficioMes = filters.com_beneficio_no_mes === true;
    const semAtendimentoRecente = filters.sem_atendimento_recente === true;
    const inicioMes = inicioMesAtual();
    const limiteRecente = new Date();
    limiteRecente.setDate(limiteRecente.getDate() - 90);

    const where: Prisma.Sql[] = [Prisma.sql`AND b.tenant_id::text = ${tenantId}`];
    if (busca) {
      const like = `%${busca}%`;
      const digits = `%${normalizeDigits(busca)}%`;
      where.push(Prisma.sql`
        AND (
          b.nome_completo ILIKE ${like}
          OR COALESCE(b.codigo, '') ILIKE ${like}
          OR COALESCE(b.nome_mae, '') ILIKE ${like}
          OR COALESCE(c.telefone_principal, '') ILIKE ${like}
          OR COALESCE(f.nome_familia, '') ILIKE ${like}
          OR regexp_replace(COALESCE(cpf_doc.numero_documento, ''), '[^0-9]', '', 'g') LIKE ${digits}
        )
      `);
    }
    if (bairro) where.push(Prisma.sql`AND COALESCE(e.bairro, '') ILIKE ${`%${bairro}%`}`);
    if (status) where.push(Prisma.sql`AND COALESCE(b.status, '') = ${status}`);
    if (sexo) where.push(Prisma.sql`AND COALESCE(b.sexo_biologico, '') ILIKE ${`%${sexo}%`}`);
    if (somenteComFamilia) where.push(Prisma.sql`AND fm.familia_id IS NOT NULL`);
    if (comBeneficioMes) {
      where.push(Prisma.sql`
        AND EXISTS (
          SELECT 1 FROM central_beneficio cb
          WHERE cb.beneficiario_id = b.id
            AND cb.tenant_id::text = ${tenantId}
            AND cb.data >= ${inicioMes}
        )
      `);
    }
    if (semAtendimentoRecente) {
      where.push(Prisma.sql`
        AND COALESCE((
          SELECT MAX(data_ref)
          FROM (
            SELECT MAX(ca.data_hora)::timestamp AS data_ref
            FROM central_atendimento ca
            WHERE ca.beneficiario_id = b.id
              AND ca.tenant_id::text = ${tenantId}
            UNION ALL
            SELECT MAX(v.data_visita)::timestamp AS data_ref
            FROM visita_domiciliar v
            WHERE v.beneficiario_id = b.id
              AND v.tenant_id::text = ${tenantId}
          ) t
        ), TIMESTAMP '1900-01-01') < ${limiteRecente}
      `);
    }

    const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT
        b.id, b.codigo, b.nome_completo, b.data_nascimento, b.sexo_biologico, b.status,
        c.telefone_principal, e.bairro, cpf_doc.numero_documento AS cpf,
        f.id AS familia_id, f.nome_familia,
        (
          SELECT MAX(data_ref)
          FROM (
            SELECT MAX(ca.data_hora)::timestamp AS data_ref
            FROM central_atendimento ca
            WHERE ca.beneficiario_id = b.id
            UNION ALL
            SELECT MAX(v.data_visita)::timestamp AS data_ref
            FROM visita_domiciliar v
            WHERE v.beneficiario_id = b.id
          ) t
        ) AS ultimo_atendimento
      FROM cadastro_beneficiario b
      LEFT JOIN contato_beneficiario c ON c.beneficiario_id = b.id
      LEFT JOIN endereco e ON e.id = b.endereco_id
      LEFT JOIN LATERAL (
        SELECT d.numero_documento
        FROM documentos d
        WHERE d.beneficiario_id = b.id
          AND (UPPER(COALESCE(d.tipo_documento, '')) = 'CPF' OR UPPER(COALESCE(d.nome_documento, '')) LIKE '%CPF%')
        ORDER BY d.id DESC
        LIMIT 1
      ) cpf_doc ON TRUE
      LEFT JOIN LATERAL (
        SELECT m.vinculo_familiar_id AS familia_id
        FROM vinculo_familiar_membro m
        WHERE m.beneficiario_id = b.id
          AND m.tenant_id::text = ${tenantId}
        ORDER BY m.id ASC
        LIMIT 1
      ) fm ON TRUE
      LEFT JOIN vinculo_familiar f ON f.id = fm.familia_id AND f.tenant_id::text = ${tenantId}
      WHERE 1 = 1
      ${Prisma.join(where, "\n")}
      ORDER BY b.nome_completo ASC
      LIMIT 80
    `);

    return rows.map((row) => ({
      id: String(row.id),
      codigo: row.codigo ? String(row.codigo) : undefined,
      nomeCompleto: String(row.nome_completo ?? ""),
      dataNascimento: formatIsoDate(row.data_nascimento as Date),
      idade: this.calcularIdade(row.data_nascimento as Date),
      sexo: row.sexo_biologico ? String(row.sexo_biologico) : undefined,
      telefone: row.telefone_principal ? String(row.telefone_principal) : undefined,
      cpf: row.cpf ? String(row.cpf) : undefined,
      bairro: row.bairro ? String(row.bairro) : undefined,
      familiaId: row.familia_id ? String(row.familia_id) : undefined,
      familiaNome: row.nome_familia ? String(row.nome_familia) : undefined,
      situacaoCadastral: row.status ? String(row.status) : undefined,
      ultimoAtendimento: row.ultimo_atendimento instanceof Date ? row.ultimo_atendimento.toISOString() : undefined
    }));
  }

  async obterVisaoGeral(beneficiarioId: bigint, tenantId: string) {
    await this.ensureEstrutura();
    const beneficiario = await this.buscarResumoBeneficiario(beneficiarioId, tenantId);
    if (!beneficiario) throw new AppError("Beneficiário não encontrado.", 404);

    const [atendimentos, beneficiosCentral, encaminhamentos, familia, inscricoes] = await Promise.all([
      this.listarAtendimentos(beneficiarioId, tenantId),
      this.listarBeneficios(beneficiarioId, tenantId),
      this.listarEncaminhamentos(beneficiarioId, tenantId),
      this.obterGrupoFamiliar(beneficiarioId, tenantId),
      this.listarInscricoes(beneficiario, tenantId)
    ]);
    const doacoes = await this.listarDoacoes(beneficiarioId, tenantId, familia?.id ? BigInt(familia.id) : undefined);
    const beneficios = [...beneficiosCentral, ...doacoes].sort((a, b) => String(b.data).localeCompare(String(a.data)));
    const historico = this.montarHistorico(beneficiario, atendimentos, beneficios, inscricoes, encaminhamentos);
    const custos = this.calcularCustos(beneficios, familia);
    const configAlertas = await this.obterConfiguracaoAlertas();
    const alertas = this.montarAlertas(beneficiario, atendimentos, beneficios, encaminhamentos, inscricoes, familia, custos, configAlertas);
    const ultimoAtendimento = atendimentos[0];
    const proximoAtendimento = atendimentos
      .filter((item) => item.retornoPrevisto)
      .sort((a, b) => String(a.retornoPrevisto).localeCompare(String(b.retornoPrevisto)))[0];

    return {
      beneficiario: {
        id: String(beneficiario.id),
        codigo: beneficiario.codigo ?? undefined,
        nomeCompleto: beneficiario.nome_completo,
        cpf: beneficiario.cpf ?? undefined,
        dataNascimento: formatIsoDate(beneficiario.data_nascimento),
        idade: this.calcularIdade(beneficiario.data_nascimento),
        sexo: beneficiario.sexo_biologico ?? undefined,
        telefone: beneficiario.telefone_principal ?? undefined,
        email: beneficiario.email ?? undefined,
        foto3x4: beneficiario.foto_3x4 ?? undefined,
        endereco: [beneficiario.logradouro, beneficiario.numero, beneficiario.bairro, beneficiario.cidade, beneficiario.uf].filter(Boolean).join(", "),
        bairro: beneficiario.bairro ?? undefined,
        familiaId: beneficiario.familia_id ? String(beneficiario.familia_id) : undefined,
        familiaNome: beneficiario.familia_nome ?? undefined,
        responsavelFamiliar: beneficiario.responsavel_familiar_nome ?? undefined,
        situacaoCadastral: beneficiario.status ?? undefined,
        ultimoAtendimento: ultimoAtendimento?.dataHora
      },
      indicadores: {
        ultimoAtendimento: ultimoAtendimento ? `${ultimoAtendimento.tipoAtendimento} • ${ultimoAtendimento.dataHora.slice(0, 10)}` : undefined,
        proximoAtendimento: proximoAtendimento ? `${proximoAtendimento.tipoAtendimento} • ${proximoAtendimento.retornoPrevisto}` : undefined,
        beneficiosRecebidosMes: beneficios.filter((item) => this.estaNoMesAtual(String(item.data))).length,
        cestaBasicaMes: beneficios.filter((item) => `${String(item.tipo)} ${String(item.item)}`.toLowerCase().includes("cesta") && this.estaNoMesAtual(String(item.data))).length,
        atendimentosMes: atendimentos.filter((item) => this.estaNoMesAtual(String(item.dataHora))).length,
        beneficiosAno: beneficios.filter((item) => this.estaNoAnoAtual(String(item.data))).length,
        cursosAtivos: inscricoes.filter((item) => !["cancelado", "finalizado"].includes(String(item.situacao ?? "").toLowerCase())).length,
        custoMes: custos.beneficiario.mes,
        custoAno: custos.beneficiario.ano,
        custoHistorico: custos.beneficiario.total,
        alertasAtivos: alertas.length
      },
      alertas,
      atendimentos,
      beneficios,
      inscricoes,
      encaminhamentos,
      historico,
      custos,
      grupoFamiliar: familia
    };
  }

  async listarAtendimentos(beneficiarioId: bigint, tenantId: string) {
    await this.ensureEstrutura();
    await this.validarBeneficiarioTenant(beneficiarioId, tenantId);
    const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT id, data_hora, tipo_atendimento, setor, profissional_responsavel, prioridade, status, classificacao, necessidade_identificada, resumo, observacoes, retorno_previsto
      FROM central_atendimento
      WHERE beneficiario_id = ${beneficiarioId}
        AND tenant_id::text = ${tenantId}
      ORDER BY data_hora DESC, id DESC
    `);
    return rows.map((row) => ({
      id: String(row.id),
      dataHora: row.data_hora instanceof Date ? row.data_hora.toISOString() : String(row.data_hora),
      tipoAtendimento: String(row.tipo_atendimento ?? ""),
      setor: String(row.setor ?? ""),
      profissionalResponsavel: String(row.profissional_responsavel ?? ""),
      prioridade: row.prioridade ? String(row.prioridade) : undefined,
      status: row.status ? String(row.status) : undefined,
      classificacao: row.classificacao ? String(row.classificacao) : undefined,
      necessidadeIdentificada: row.necessidade_identificada ? String(row.necessidade_identificada) : undefined,
      resumo: String(row.resumo ?? ""),
      observacoes: row.observacoes ? String(row.observacoes) : undefined,
      retornoPrevisto: formatIsoDate(row.retorno_previsto as Date)
    }));
  }

  async criarAtendimento(beneficiarioId: bigint, input: CentralAtendimentoInput, usuario?: UsuarioActor, tenantId?: string) {
    await this.ensureEstrutura();
    if (!tenantId) throw new AppError("Tenant da sessao nao identificado.", 401);
    await this.validarBeneficiarioTenant(beneficiarioId, tenantId);
    const familiaId = await this.buscarFamiliaId(beneficiarioId, tenantId);
    const inserted = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
      INSERT INTO central_atendimento (
        tenant_id, beneficiario_id, familia_id, data_hora, tipo_atendimento, setor, profissional_responsavel, prioridade, status, classificacao, necessidade_identificada, resumo, observacoes, retorno_previsto, criado_por_usuario_id, criado_por_nome, criado_em, atualizado_em
      ) VALUES (
        ${tenantId}::uuid, ${beneficiarioId}, ${familiaId}, ${new Date(input.data_hora)}, ${input.tipo_atendimento}, ${input.setor}, ${input.profissional_responsavel}, ${trimOrUndefined(input.prioridade)}, ${trimOrUndefined(input.status) ?? "Aberto"}, ${trimOrUndefined(input.classificacao)}, ${trimOrUndefined(input.necessidade_identificada)}, ${input.resumo}, ${trimOrUndefined(input.observacoes)}, ${toOptionalDate(input.retorno_previsto)}, ${usuario?.id ? BigInt(usuario.id) : null}, ${trimOrUndefined(usuario?.nome ?? usuario?.nomeUsuario)}, NOW(), NOW()
      )
      RETURNING id
    `);
    await this.registrarAuditoria(beneficiarioId, familiaId, "central_atendimento", inserted[0]?.id, "criar", `Atendimento ${input.tipo_atendimento} registrado.`, input, usuario, tenantId);
    return this.listarAtendimentos(beneficiarioId, tenantId);
  }

  async atualizarAtendimento(id: bigint, beneficiarioId: bigint, input: CentralAtendimentoInput, usuario?: UsuarioActor, tenantId?: string) {
    await this.ensureEstrutura();
    if (!tenantId) throw new AppError("Tenant da sessao nao identificado.", 401);
    await this.validarBeneficiarioTenant(beneficiarioId, tenantId);
    const familiaId = await this.buscarFamiliaId(beneficiarioId, tenantId);
    await prisma.$executeRaw(Prisma.sql`
      UPDATE central_atendimento
      SET
        data_hora = ${new Date(input.data_hora)},
        tipo_atendimento = ${input.tipo_atendimento},
        setor = ${input.setor},
        profissional_responsavel = ${input.profissional_responsavel},
        prioridade = ${trimOrUndefined(input.prioridade)},
        status = ${trimOrUndefined(input.status) ?? "Aberto"},
        classificacao = ${trimOrUndefined(input.classificacao)},
        necessidade_identificada = ${trimOrUndefined(input.necessidade_identificada)},
        resumo = ${input.resumo},
        observacoes = ${trimOrUndefined(input.observacoes)},
        retorno_previsto = ${toOptionalDate(input.retorno_previsto)},
        atualizado_em = NOW()
      WHERE id = ${id}
        AND beneficiario_id = ${beneficiarioId}
        AND tenant_id::text = ${tenantId}
    `);
    await this.registrarAuditoria(beneficiarioId, familiaId, "central_atendimento", id, "editar", `Atendimento ${input.tipo_atendimento} atualizado.`, input, usuario, tenantId);
    return this.listarAtendimentos(beneficiarioId, tenantId);
  }

  async removerAtendimento(id: bigint, beneficiarioId: bigint, usuario?: UsuarioActor, tenantId?: string) {
    await this.ensureEstrutura();
    if (!tenantId) throw new AppError("Tenant da sessao nao identificado.", 401);
    await this.validarBeneficiarioTenant(beneficiarioId, tenantId);
    const familiaId = await this.buscarFamiliaId(beneficiarioId, tenantId);
    await prisma.$executeRaw(Prisma.sql`
      DELETE FROM central_atendimento
      WHERE id = ${id}
        AND beneficiario_id = ${beneficiarioId}
        AND tenant_id::text = ${tenantId}
    `);
    await this.registrarAuditoria(beneficiarioId, familiaId, "central_atendimento", id, "excluir", "Atendimento removido da Central.", { id: String(id) }, usuario, tenantId);
  }

  async listarBeneficios(beneficiarioId: bigint, tenantId: string) {
    await this.ensureEstrutura();
    await this.validarBeneficiarioTenant(beneficiarioId, tenantId);
    const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT id, data, tipo, item, quantidade::float8 AS quantidade, valor_unitario::float8 AS valor_unitario, valor_total::float8 AS valor_total, origem_recurso, projeto_programa, profissional_responsavel, observacoes, ciente_alertas
      FROM central_beneficio
      WHERE beneficiario_id = ${beneficiarioId}
        AND tenant_id::text = ${tenantId}
      ORDER BY data DESC, id DESC
    `);
    return rows.map((row) => ({
      origem: "central",
      id: String(row.id),
      data: formatIsoDate(row.data as Date),
      tipo: String(row.tipo ?? ""),
      item: String(row.item ?? ""),
      quantidade: toNumber(row.quantidade),
      valorUnitario: toNumber(row.valor_unitario),
      valorTotal: toNumber(row.valor_total),
      origemRecurso: row.origem_recurso ? String(row.origem_recurso) : undefined,
      projetoPrograma: row.projeto_programa ? String(row.projeto_programa) : undefined,
      profissionalResponsavel: row.profissional_responsavel ? String(row.profissional_responsavel) : undefined,
      observacoes: row.observacoes ? String(row.observacoes) : undefined,
      cienteAlertas: Boolean(row.ciente_alertas)
    }));
  }

  async criarBeneficio(beneficiarioId: bigint, input: CentralBeneficioInput, usuario?: UsuarioActor, tenantId?: string) {
    await this.ensureEstrutura();
    if (!tenantId) throw new AppError("Tenant da sessao nao identificado.", 401);
    await this.validarBeneficiarioTenant(beneficiarioId, tenantId);
    const familiaId = await this.buscarFamiliaId(beneficiarioId, tenantId);
    const quantidade = input.quantidade ?? 1;
    const valorUnitario = input.valor_unitario ?? 0;
    const valorTotal = input.valor_total ?? quantidade * valorUnitario;
    const inserted = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
      INSERT INTO central_beneficio (
        tenant_id, beneficiario_id, familia_id, data, tipo, item, quantidade, valor_unitario, valor_total, origem_recurso, projeto_programa, profissional_responsavel, observacoes, ciente_alertas, criado_por_usuario_id, criado_por_nome, criado_em, atualizado_em
      ) VALUES (
        ${tenantId}::uuid, ${beneficiarioId}, ${familiaId}, ${toOptionalDate(input.data)}, ${input.tipo}, ${input.item}, ${quantidade}, ${valorUnitario}, ${valorTotal}, ${trimOrUndefined(input.origem_recurso)}, ${trimOrUndefined(input.projeto_programa)}, ${input.profissional_responsavel}, ${trimOrUndefined(input.observacoes)}, ${Boolean(input.ciente_alertas)}, ${usuario?.id ? BigInt(usuario.id) : null}, ${trimOrUndefined(usuario?.nome ?? usuario?.nomeUsuario)}, NOW(), NOW()
      )
      RETURNING id
    `);
    await this.registrarAuditoria(beneficiarioId, familiaId, "central_beneficio", inserted[0]?.id, "criar", `Benefício ${input.tipo} / ${input.item} registrado.`, { ...input, valor_total: valorTotal }, usuario, tenantId);
    return this.listarBeneficios(beneficiarioId, tenantId);
  }

  async atualizarBeneficio(id: bigint, beneficiarioId: bigint, input: CentralBeneficioInput, usuario?: UsuarioActor, tenantId?: string) {
    await this.ensureEstrutura();
    if (!tenantId) throw new AppError("Tenant da sessao nao identificado.", 401);
    await this.validarBeneficiarioTenant(beneficiarioId, tenantId);
    const familiaId = await this.buscarFamiliaId(beneficiarioId, tenantId);
    const quantidade = input.quantidade ?? 1;
    const valorUnitario = input.valor_unitario ?? 0;
    const valorTotal = input.valor_total ?? quantidade * valorUnitario;
    await prisma.$executeRaw(Prisma.sql`
      UPDATE central_beneficio
      SET
        data = ${toOptionalDate(input.data)},
        tipo = ${input.tipo},
        item = ${input.item},
        quantidade = ${quantidade},
        valor_unitario = ${valorUnitario},
        valor_total = ${valorTotal},
        origem_recurso = ${trimOrUndefined(input.origem_recurso)},
        projeto_programa = ${trimOrUndefined(input.projeto_programa)},
        profissional_responsavel = ${input.profissional_responsavel},
        observacoes = ${trimOrUndefined(input.observacoes)},
        ciente_alertas = ${Boolean(input.ciente_alertas)},
        atualizado_em = NOW()
      WHERE id = ${id}
        AND beneficiario_id = ${beneficiarioId}
        AND tenant_id::text = ${tenantId}
    `);
    await this.registrarAuditoria(beneficiarioId, familiaId, "central_beneficio", id, "editar", `Benefício ${input.tipo} / ${input.item} atualizado.`, { ...input, valor_total: valorTotal }, usuario, tenantId);
    return this.listarBeneficios(beneficiarioId, tenantId);
  }

  async removerBeneficio(id: bigint, beneficiarioId: bigint, usuario?: UsuarioActor, tenantId?: string) {
    await this.ensureEstrutura();
    if (!tenantId) throw new AppError("Tenant da sessao nao identificado.", 401);
    await this.validarBeneficiarioTenant(beneficiarioId, tenantId);
    const familiaId = await this.buscarFamiliaId(beneficiarioId, tenantId);
    await prisma.$executeRaw(Prisma.sql`
      DELETE FROM central_beneficio
      WHERE id = ${id}
        AND beneficiario_id = ${beneficiarioId}
        AND tenant_id::text = ${tenantId}
    `);
    await this.registrarAuditoria(beneficiarioId, familiaId, "central_beneficio", id, "excluir", "Benefício removido da Central.", { id: String(id) }, usuario, tenantId);
  }

  async listarEncaminhamentos(beneficiarioId: bigint, tenantId: string) {
    await this.ensureEstrutura();
    await this.validarBeneficiarioTenant(beneficiarioId, tenantId);
    const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT id, data, tipo, destino, profissional, motivo, retorno_esperado, status, observacoes
      FROM central_encaminhamento
      WHERE beneficiario_id = ${beneficiarioId}
        AND tenant_id::text = ${tenantId}
      ORDER BY data DESC, id DESC
    `);
    return rows.map((row) => ({
      id: String(row.id),
      data: formatIsoDate(row.data as Date),
      tipo: String(row.tipo ?? ""),
      destino: String(row.destino ?? ""),
      profissional: String(row.profissional ?? ""),
      motivo: String(row.motivo ?? ""),
      retornoEsperado: formatIsoDate(row.retorno_esperado as Date),
      status: row.status ? String(row.status) : undefined,
      observacoes: row.observacoes ? String(row.observacoes) : undefined
    }));
  }

  async criarEncaminhamento(beneficiarioId: bigint, input: CentralEncaminhamentoInput, usuario?: UsuarioActor, tenantId?: string) {
    await this.ensureEstrutura();
    if (!tenantId) throw new AppError("Tenant da sessao nao identificado.", 401);
    await this.validarBeneficiarioTenant(beneficiarioId, tenantId);
    const familiaId = await this.buscarFamiliaId(beneficiarioId, tenantId);
    const inserted = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
      INSERT INTO central_encaminhamento (
        tenant_id, beneficiario_id, familia_id, data, tipo, destino, profissional, motivo, retorno_esperado, status, observacoes, criado_por_usuario_id, criado_por_nome, criado_em, atualizado_em
      ) VALUES (
        ${tenantId}::uuid, ${beneficiarioId}, ${familiaId}, ${toOptionalDate(input.data)}, ${input.tipo}, ${input.destino}, ${input.profissional}, ${input.motivo}, ${toOptionalDate(input.retorno_esperado)}, ${trimOrUndefined(input.status) ?? "Pendente"}, ${trimOrUndefined(input.observacoes)}, ${usuario?.id ? BigInt(usuario.id) : null}, ${trimOrUndefined(usuario?.nome ?? usuario?.nomeUsuario)}, NOW(), NOW()
      )
      RETURNING id
    `);
    await this.registrarAuditoria(beneficiarioId, familiaId, "central_encaminhamento", inserted[0]?.id, "criar", `Encaminhamento ${input.tipo} para ${input.destino} registrado.`, input, usuario, tenantId);
    return this.listarEncaminhamentos(beneficiarioId, tenantId);
  }

  async atualizarEncaminhamento(id: bigint, beneficiarioId: bigint, input: CentralEncaminhamentoInput, usuario?: UsuarioActor, tenantId?: string) {
    await this.ensureEstrutura();
    if (!tenantId) throw new AppError("Tenant da sessao nao identificado.", 401);
    await this.validarBeneficiarioTenant(beneficiarioId, tenantId);
    const familiaId = await this.buscarFamiliaId(beneficiarioId, tenantId);
    await prisma.$executeRaw(Prisma.sql`
      UPDATE central_encaminhamento
      SET
        data = ${toOptionalDate(input.data)},
        tipo = ${input.tipo},
        destino = ${input.destino},
        profissional = ${input.profissional},
        motivo = ${input.motivo},
        retorno_esperado = ${toOptionalDate(input.retorno_esperado)},
        status = ${trimOrUndefined(input.status) ?? "Pendente"},
        observacoes = ${trimOrUndefined(input.observacoes)},
        atualizado_em = NOW()
      WHERE id = ${id}
        AND beneficiario_id = ${beneficiarioId}
        AND tenant_id::text = ${tenantId}
    `);
    await this.registrarAuditoria(beneficiarioId, familiaId, "central_encaminhamento", id, "editar", `Encaminhamento ${input.tipo} para ${input.destino} atualizado.`, input, usuario, tenantId);
    return this.listarEncaminhamentos(beneficiarioId, tenantId);
  }

  async removerEncaminhamento(id: bigint, beneficiarioId: bigint, usuario?: UsuarioActor, tenantId?: string) {
    await this.ensureEstrutura();
    if (!tenantId) throw new AppError("Tenant da sessao nao identificado.", 401);
    await this.validarBeneficiarioTenant(beneficiarioId, tenantId);
    const familiaId = await this.buscarFamiliaId(beneficiarioId, tenantId);
    await prisma.$executeRaw(Prisma.sql`
      DELETE FROM central_encaminhamento
      WHERE id = ${id}
        AND beneficiario_id = ${beneficiarioId}
        AND tenant_id::text = ${tenantId}
    `);
    await this.registrarAuditoria(beneficiarioId, familiaId, "central_encaminhamento", id, "excluir", "Encaminhamento removido da Central.", { id: String(id) }, usuario, tenantId);
  }

  async listarHistorico(beneficiarioId: bigint, tenantId: string) {
    const visao = await this.obterVisaoGeral(beneficiarioId, tenantId);
    return visao.historico;
  }

  async listarCustos(beneficiarioId: bigint, tenantId: string) {
    const visao = await this.obterVisaoGeral(beneficiarioId, tenantId);
    return visao.custos;
  }

  async listarGrupoFamiliar(beneficiarioId: bigint, tenantId: string) {
    const visao = await this.obterVisaoGeral(beneficiarioId, tenantId);
    return visao.grupoFamiliar;
  }

  async listarAlertas(beneficiarioId: bigint, tenantId: string) {
    const visao = await this.obterVisaoGeral(beneficiarioId, tenantId);
    return visao.alertas;
  }

  async gerarRelatorio(beneficiarioId: bigint, tipo: CentralRelatorioTipo, tenantId: string) {
    const visao = await this.obterVisaoGeral(beneficiarioId, tenantId);
    if (tipo === "familiar") return { tipo, emitidoEm: new Date().toISOString(), familia: visao.grupoFamiliar, alertas: visao.alertas };
    if (tipo === "social") return { tipo, emitidoEm: new Date().toISOString(), beneficiario: visao.beneficiario, atendimentos: visao.atendimentos, encaminhamentos: visao.encaminhamentos };
    if (tipo === "financeiro-social") return { tipo, emitidoEm: new Date().toISOString(), beneficiario: visao.beneficiario, beneficios: visao.beneficios, custos: visao.custos };
    return { tipo, emitidoEm: new Date().toISOString(), ...visao };
  }

  private async buscarResumoBeneficiario(beneficiarioId: bigint, tenantId: string) {
    const rows = await prisma.$queryRaw<ResumoBeneficiarioRow[]>(Prisma.sql`
      SELECT
        b.id, b.codigo, b.nome_completo, b.data_nascimento, b.sexo_biologico, b.status, b.nome_mae, b.foto_3x4,
        c.telefone_principal, c.email,
        cpf_doc.numero_documento AS cpf,
        e.logradouro, e.numero, e.bairro, e.cidade, e.estado AS uf,
        fm.familia_id, f.nome_familia,
        responsavel.nome_completo AS responsavel_familiar_nome
      FROM cadastro_beneficiario b
      LEFT JOIN contato_beneficiario c ON c.beneficiario_id = b.id
      LEFT JOIN endereco e ON e.id = b.endereco_id
      LEFT JOIN LATERAL (
        SELECT d.numero_documento
        FROM documentos d
        WHERE d.beneficiario_id = b.id
          AND (UPPER(COALESCE(d.tipo_documento, '')) = 'CPF' OR UPPER(COALESCE(d.nome_documento, '')) LIKE '%CPF%')
        ORDER BY d.id DESC
        LIMIT 1
      ) cpf_doc ON TRUE
      LEFT JOIN LATERAL (
        SELECT m.vinculo_familiar_id AS familia_id
        FROM vinculo_familiar_membro m
        WHERE m.beneficiario_id = b.id
          AND m.tenant_id::text = ${tenantId}
        ORDER BY m.id ASC
        LIMIT 1
      ) fm ON TRUE
      LEFT JOIN vinculo_familiar f ON f.id = fm.familia_id AND f.tenant_id::text = ${tenantId}
      LEFT JOIN LATERAL (
        SELECT br.nome_completo
        FROM vinculo_familiar_membro m
        INNER JOIN cadastro_beneficiario br ON br.id = m.beneficiario_id
        WHERE m.vinculo_familiar_id = f.id
          AND COALESCE(m.responsavel_familiar, FALSE) = TRUE
        ORDER BY m.id ASC
        LIMIT 1
      ) responsavel ON TRUE
      WHERE b.id = ${beneficiarioId}
        AND b.tenant_id::text = ${tenantId}
      LIMIT 1
    `);
    return rows[0] ?? null;
  }

  private async buscarFamiliaId(beneficiarioId: bigint, tenantId: string) {
    const rows = await prisma.$queryRaw<Array<{ familia_id: bigint | null }>>(Prisma.sql`
      SELECT vinculo_familiar_id AS familia_id
      FROM vinculo_familiar_membro
      WHERE beneficiario_id = ${beneficiarioId}
        AND tenant_id::text = ${tenantId}
      ORDER BY id ASC
      LIMIT 1
    `);
    return rows[0]?.familia_id ?? null;
  }

  private async obterGrupoFamiliar(beneficiarioId: bigint, tenantId: string) {
    const familiaId = await this.buscarFamiliaId(beneficiarioId, tenantId);
    if (!familiaId) return null;
    await this.validarFamiliaTenant(familiaId, tenantId);
    const [familiaRows, membrosRows, custoRows] = await Promise.all([
      prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
        SELECT id, nome_familia, logradouro, numero, bairro, municipio, uf, status, arranjo_familiar
        FROM vinculo_familiar
        WHERE id = ${familiaId}
          AND tenant_id::text = ${tenantId}
        LIMIT 1
      `),
      prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
        SELECT
          b.id AS beneficiario_id,
          b.codigo,
          b.nome_completo,
          b.status,
          c.telefone_principal,
          m.parentesco,
          COALESCE(m.responsavel_familiar, FALSE) AS responsavel_familiar
        FROM vinculo_familiar_membro m
        INNER JOIN cadastro_beneficiario b ON b.id = m.beneficiario_id
        LEFT JOIN contato_beneficiario c ON c.beneficiario_id = b.id
        WHERE m.vinculo_familiar_id = ${familiaId}
          AND m.tenant_id::text = ${tenantId}
          AND b.tenant_id::text = ${tenantId}
        ORDER BY COALESCE(m.responsavel_familiar, FALSE) DESC, b.nome_completo ASC
      `),
      prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
        SELECT
          COALESCE(SUM(CASE WHEN data >= ${inicioMesAtual()} THEN valor_total ELSE 0 END), 0)::float8 AS custo_mes,
          COALESCE(SUM(CASE WHEN data >= ${inicioAnoAtual()} THEN valor_total ELSE 0 END), 0)::float8 AS custo_ano,
          COALESCE(SUM(valor_total), 0)::float8 AS custo_total
        FROM central_beneficio
        WHERE familia_id = ${familiaId}
          AND tenant_id::text = ${tenantId}
      `)
    ]);
    const familia = familiaRows[0];
    if (!familia) return null;
    const cestasMes = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT COUNT(*)::integer AS total
      FROM central_beneficio
      WHERE familia_id = ${familiaId}
        AND tenant_id::text = ${tenantId}
        AND data >= ${inicioMesAtual()}
        AND (LOWER(COALESCE(tipo, '')) LIKE '%cesta%' OR LOWER(COALESCE(item, '')) LIKE '%cesta%')
    `);

    return {
      id: String(familia.id),
      nome: String(familia.nome_familia ?? ""),
      responsavelFamiliar: membrosRows.find((item) => Boolean(item.responsavel_familiar))?.nome_completo,
      enderecoPrincipal: [familia.logradouro, familia.numero, familia.bairro, familia.municipio, familia.uf].filter(Boolean).join(", "),
      situacaoFamiliar: familia.arranjo_familiar ? String(familia.arranjo_familiar) : undefined,
      status: familia.status ? String(familia.status) : undefined,
      membros: membrosRows.map((row) => ({
        id: String(row.beneficiario_id),
        codigo: row.codigo ? String(row.codigo) : undefined,
        nomeCompleto: String(row.nome_completo ?? ""),
        parentesco: row.parentesco ? String(row.parentesco) : undefined,
        responsavelFamiliar: Boolean(row.responsavel_familiar),
        situacaoCadastral: row.status ? String(row.status) : undefined,
        telefone: row.telefone_principal ? String(row.telefone_principal) : undefined
      })),
      custoMes: toNumber(custoRows[0]?.custo_mes),
      custoAno: toNumber(custoRows[0]?.custo_ano),
      custoHistorico: toNumber(custoRows[0]?.custo_total),
      alertas: toNumber(cestasMes[0]?.total) > 0 ? ["Membro da família já recebeu cesta básica neste mês."] : []
    };
  }

  private async listarInscricoes(beneficiario: ResumoBeneficiarioRow, tenantId: string) {
    const cpf = normalizeDigits(beneficiario.cpf);
    const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT
        c.id AS curso_id, c.nome, c.tipo, c.data_triagem, c.data_conclusao, c.status AS curso_status,
        m.id AS matricula_id, m.status, m.data_matricula, m.data_agendada, m.profissional_nome, c.profissional, s.nome AS local
      FROM cursos_atendimentos_matriculas m
      INNER JOIN cursos_atendimentos c ON c.id = m.curso_id
      LEFT JOIN salas_unidade s ON s.id = c.sala_id
      WHERE c.tenant_id::text = ${tenantId}
        AND m.tenant_id::text = ${tenantId}
        AND (
        ${cpf ? Prisma.sql`regexp_replace(COALESCE(m.cpf, ''), '[^0-9]', '', 'g') = ${cpf}` : Prisma.sql`1 = 0`}
      ) OR (
        c.tenant_id::text = ${tenantId}
        AND m.tenant_id::text = ${tenantId}
        AND LOWER(TRIM(COALESCE(m.beneficiario_nome, ''))) = LOWER(TRIM(${beneficiario.nome_completo}))
      )
      ORDER BY COALESCE(m.data_matricula, m.data_agendada) DESC NULLS LAST, m.id DESC
    `);
    return rows.map((row) => ({
      id: `${row.curso_id}-${row.matricula_id}`,
      nome: String(row.nome ?? ""),
      tipo: row.tipo ? String(row.tipo) : undefined,
      dataInicio: formatIsoDate(row.data_triagem as Date),
      dataFinal: formatIsoDate(row.data_conclusao as Date),
      situacao: row.status ? String(row.status) : String(row.curso_status ?? ""),
      responsavel: row.profissional_nome ? String(row.profissional_nome) : row.profissional ? String(row.profissional) : undefined,
      local: row.local ? String(row.local) : undefined,
      dataInscricao: formatIsoDate((row.data_matricula as Date) ?? (row.data_agendada as Date))
    }));
  }

  private async listarDoacoes(beneficiarioId: bigint, tenantId: string, familiaId?: bigint) {
    const destinatario = familiaId
      ? Prisma.sql`(d.beneficiario_id = ${beneficiarioId} OR d.vinculo_familiar_id = ${familiaId})`
      : Prisma.sql`d.beneficiario_id = ${beneficiarioId}`;
    const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT
        d.id, d.data_doacao, d.tipo_doacao, d.responsavel, d.observacoes,
        di.quantidade::float8 AS quantidade, ai.descricao AS item, ai.valor_unitario::float8 AS valor_unitario
      FROM doacao_realizada d
      INNER JOIN doacao_realizada_item di ON di.doacao_realizada_id = d.id
      INNER JOIN almoxarifado_item ai ON ai.id = di.almoxarifado_item_id
      WHERE d.tenant_id::text = ${tenantId}
        AND ai.tenant_id::text = ${tenantId}
        AND ${destinatario}
      ORDER BY d.data_doacao DESC, d.id DESC
    `);
    return rows.map((row) => {
      const quantidade = toNumber(row.quantidade);
      const valorUnitario = toNumber(row.valor_unitario);
      return {
        origem: "doacao",
        id: String(row.id),
        data: formatIsoDate(row.data_doacao as Date),
        tipo: row.tipo_doacao ? String(row.tipo_doacao) : "Doação",
        item: row.item ? String(row.item) : "Item",
        quantidade,
        valorUnitario,
        valorTotal: quantidade * valorUnitario,
        profissionalResponsavel: row.responsavel ? String(row.responsavel) : undefined,
        observacoes: row.observacoes ? String(row.observacoes) : undefined
      };
    });
  }

  private montarHistorico(beneficiario: ResumoBeneficiarioRow, atendimentos: any[], beneficios: any[], inscricoes: any[], encaminhamentos: any[]) {
    return [
      {
        id: `cadastro-${beneficiario.id.toString()}`,
        data: formatIsoDate(beneficiario.data_nascimento),
        categoria: "Cadastro",
        titulo: "Cadastro disponível",
        descricao: beneficiario.nome_completo
      },
      ...atendimentos.map((item) => ({ id: `at-${item.id}`, data: item.dataHora, categoria: "Atendimento", titulo: item.tipoAtendimento, descricao: item.resumo, profissional: item.profissionalResponsavel })),
      ...beneficios.map((item) => ({ id: `bf-${item.origem}-${item.id}`, data: item.data, categoria: "Benefício", titulo: `${item.tipo} - ${item.item}`, descricao: item.observacoes, profissional: item.profissionalResponsavel })),
      ...inscricoes.map((item) => ({ id: `in-${item.id}`, data: item.dataInscricao ?? item.dataInicio, categoria: "Inscrição", titulo: item.nome, descricao: item.tipo, profissional: item.responsavel })),
      ...encaminhamentos.map((item) => ({ id: `en-${item.id}`, data: item.data, categoria: "Encaminhamento", titulo: `${item.tipo} para ${item.destino}`, descricao: item.motivo, profissional: item.profissional }))
    ]
      .filter((item) => item.data)
      .sort((a, b) => String(b.data).localeCompare(String(a.data)));
  }

  private calcularCustos(beneficios: any[], familia: any) {
    const detalhamento = beneficios.map((item) => ({ data: item.data, tipo: item.tipo, item: item.item, valorTotal: toNumber(item.valorTotal) }));
    const porTipo = new Map<string, number>();
    const porItem = new Map<string, number>();
    const evolucaoMensal = new Map<string, number>();
    let mes = 0;
    let ano = 0;
    let total = 0;
    for (const item of detalhamento) {
      const valor = toNumber(item.valorTotal);
      if (this.estaNoMesAtual(String(item.data))) mes += valor;
      if (this.estaNoAnoAtual(String(item.data))) ano += valor;
      total += valor;
      porTipo.set(item.tipo, (porTipo.get(item.tipo) ?? 0) + valor);
      porItem.set(item.item, (porItem.get(item.item) ?? 0) + valor);
      evolucaoMensal.set(String(item.data).slice(0, 7), (evolucaoMensal.get(String(item.data).slice(0, 7)) ?? 0) + valor);
    }
    return {
      beneficiario: { mes, ano, total },
      familia: { mes: familia?.custoMes ?? mes, ano: familia?.custoAno ?? ano, total: familia?.custoHistorico ?? total },
      porTipo: [...porTipo.entries()].map(([nome, valor]) => ({ nome, valor })).sort((a, b) => b.valor - a.valor),
      porItem: [...porItem.entries()].map(([nome, valor]) => ({ nome, valor })).sort((a, b) => b.valor - a.valor),
      evolucaoMensal: [...evolucaoMensal.entries()].map(([mesRef, valor]) => ({ mes: mesRef, valor })).sort((a, b) => a.mes.localeCompare(b.mes)),
      detalhamento: detalhamento.sort((a, b) => String(b.data).localeCompare(String(a.data)))
    };
  }

  private montarAlertas(beneficiario: ResumoBeneficiarioRow, atendimentos: any[], beneficios: any[], encaminhamentos: any[], inscricoes: any[], familia: any, custos: any, configAlertas: { dias_sem_atendimento_recente: number; valor_custo_elevado_mes: number; alertar_cesta_mesmo_mes: boolean; alertar_familia_cesta_mes: boolean; alertar_cadastro_incompleto: boolean; alertar_encaminhamento_em_aberto: boolean; alertar_inscricao_ativa: boolean }) {
    const alertas: Array<{ prioridade: "alta" | "media" | "baixa"; titulo: string; descricao: string }> = [];
    if (configAlertas.alertar_cadastro_incompleto && (!beneficiario.cpf || !beneficiario.telefone_principal || !beneficiario.bairro)) {
      alertas.push({ prioridade: "alta", titulo: "Cadastro com pendências", descricao: "Há dados essenciais do beneficiário sem preenchimento completo." });
    }
    const cestaMes = beneficios.some((item) => `${String(item.tipo)} ${String(item.item)}`.toLowerCase().includes("cesta") && this.estaNoMesAtual(String(item.data)));
    if (configAlertas.alertar_cesta_mesmo_mes && cestaMes) {
      alertas.push({ prioridade: "alta", titulo: "Cesta básica no mês", descricao: "O beneficiário já possui concessão de cesta básica no mês atual." });
    }
    if (configAlertas.alertar_familia_cesta_mes && (familia?.alertas ?? []).length) {
      alertas.push({ prioridade: "alta", titulo: "Alerta familiar", descricao: String(familia.alertas[0]) });
    }
    if (configAlertas.alertar_encaminhamento_em_aberto && encaminhamentos.some((item) => ["pendente", "em aberto"].includes(String(item.status ?? "").toLowerCase()))) {
      alertas.push({ prioridade: "media", titulo: "Encaminhamento em aberto", descricao: "Existe encaminhamento pendente de retorno." });
    }
    const ultimoAtendimento = atendimentos[0];
    if (!ultimoAtendimento) {
      alertas.push({ prioridade: "media", titulo: "Sem atendimento recente", descricao: "Ainda não há atendimento registrado na Central." });
    } else {
      const diasSemAtendimento = this.calcularDiasEntre(ultimoAtendimento.dataHora);
      if (diasSemAtendimento >= configAlertas.dias_sem_atendimento_recente) {
        alertas.push({
          prioridade: "media",
          titulo: "Beneficiário sem atendimento recente",
          descricao: `O último atendimento ocorreu há ${diasSemAtendimento} dias.`
        });
      }
    }
    if (configAlertas.alertar_inscricao_ativa && inscricoes.some((item) => !["cancelado", "finalizado"].includes(String(item.situacao ?? "").toLowerCase()))) {
      alertas.push({ prioridade: "baixa", titulo: "Inscrição ativa", descricao: "O beneficiário já possui participação ativa em curso, oficina ou atividade." });
    }
    if (custos.beneficiario.mes > configAlertas.valor_custo_elevado_mes) {
      alertas.push({ prioridade: "media", titulo: "Custo elevado no mês", descricao: "O custo acumulado do beneficiário no mês ultrapassou a faixa de atenção." });
    }
    return alertas;
  }

  private async obterConfiguracaoAlertas() {
    const configuracao = await parametrosSistemaRepository.buscarAlertasCentralAtendimentos();
    const valor = configuracao?.valor;
    return {
      dias_sem_atendimento_recente: Number(valor?.dias_sem_atendimento_recente ?? 30),
      valor_custo_elevado_mes: Number(valor?.valor_custo_elevado_mes ?? 500),
      alertar_cesta_mesmo_mes: Boolean(valor?.alertar_cesta_mesmo_mes ?? true),
      alertar_familia_cesta_mes: Boolean(valor?.alertar_familia_cesta_mes ?? true),
      alertar_cadastro_incompleto: Boolean(valor?.alertar_cadastro_incompleto ?? true),
      alertar_encaminhamento_em_aberto: Boolean(valor?.alertar_encaminhamento_em_aberto ?? true),
      alertar_inscricao_ativa: Boolean(valor?.alertar_inscricao_ativa ?? true)
    };
  }

  private async registrarAuditoria(beneficiarioId: bigint, familiaId: bigint | null, entidade: string, entidadeId: bigint | undefined, acao: string, descricao: string, dadosNovos: unknown, usuario?: UsuarioActor, tenantId?: string) {
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO central_auditoria (
        tenant_id, beneficiario_id, familia_id, entidade, entidade_id, acao, descricao, dados_novos, usuario_id, usuario_nome, criado_em
      ) VALUES (
        ${tenantId ? Prisma.sql`${tenantId}::uuid` : Prisma.sql`NULL`}, ${beneficiarioId}, ${familiaId}, ${entidade}, ${entidadeId ?? null}, ${acao}, ${descricao}, ${dadosNovos ? (dadosNovos as Prisma.JsonObject) : null}, ${usuario?.id ? BigInt(usuario.id) : null}, ${trimOrUndefined(usuario?.nome ?? usuario?.nomeUsuario)}, NOW()
      )
    `);
  }

  private calcularIdade(dataNascimento?: Date | null) {
    if (!dataNascimento) return undefined;
    const hoje = new Date();
    let idade = hoje.getUTCFullYear() - dataNascimento.getUTCFullYear();
    const mes = hoje.getUTCMonth() - dataNascimento.getUTCMonth();
    if (mes < 0 || (mes === 0 && hoje.getUTCDate() < dataNascimento.getUTCDate())) idade -= 1;
    return idade;
  }

  private estaNoMesAtual(value: string) {
    return value.slice(0, 7) === new Date().toISOString().slice(0, 7);
  }

  private estaNoAnoAtual(value: string) {
    return value.slice(0, 4) === new Date().toISOString().slice(0, 4);
  }

  private calcularDiasEntre(valor?: string) {
    if (!valor) return Number.MAX_SAFE_INTEGER;
    const data = new Date(valor);
    if (Number.isNaN(data.getTime())) return Number.MAX_SAFE_INTEGER;
    const diferenca = Date.now() - data.getTime();
    return Math.max(0, Math.floor(diferenca / (1000 * 60 * 60 * 24)));
  }
}
