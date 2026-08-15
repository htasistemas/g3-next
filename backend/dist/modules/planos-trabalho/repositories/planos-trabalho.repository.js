import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { toIsoDate, toOptionalDate, toStringId, trimOrUndefined } from "../../../utils/string-utils.js";
const estruturaSql = [
    `ALTER TABLE IF EXISTS plano_trabalho ALTER COLUMN termo_fomento_id DROP NOT NULL`,
    `ALTER TABLE IF EXISTS plano_trabalho ALTER COLUMN orgao_concedente TYPE VARCHAR(200)`,
    `ALTER TABLE IF EXISTS plano_trabalho ADD COLUMN IF NOT EXISTS tenant_id UUID`,
    `ALTER TABLE IF EXISTS plano_trabalho ADD COLUMN IF NOT EXISTS tipo_parceria VARCHAR(80)`,
    `ALTER TABLE IF EXISTS plano_trabalho ADD COLUMN IF NOT EXISTS orgao_parceiro VARCHAR(200)`,
    `ALTER TABLE IF EXISTS plano_trabalho ADD COLUMN IF NOT EXISTS edital_chamamento VARCHAR(200)`,
    `ALTER TABLE IF EXISTS plano_trabalho ADD COLUMN IF NOT EXISTS periodo_inicio DATE`,
    `ALTER TABLE IF EXISTS plano_trabalho ADD COLUMN IF NOT EXISTS periodo_fim DATE`,
    `ALTER TABLE IF EXISTS plano_trabalho ADD COLUMN IF NOT EXISTS responsavel_tecnico VARCHAR(200)`,
    `ALTER TABLE IF EXISTS plano_trabalho ADD COLUMN IF NOT EXISTS responsavel_legal VARCHAR(200)`,
    `ALTER TABLE IF EXISTS plano_trabalho ADD COLUMN IF NOT EXISTS razao_social VARCHAR(200)`,
    `ALTER TABLE IF EXISTS plano_trabalho ADD COLUMN IF NOT EXISTS nome_fantasia VARCHAR(200)`,
    `ALTER TABLE IF EXISTS plano_trabalho ADD COLUMN IF NOT EXISTS cnpj VARCHAR(20)`,
    `ALTER TABLE IF EXISTS plano_trabalho ADD COLUMN IF NOT EXISTS cep VARCHAR(10)`,
    `ALTER TABLE IF EXISTS plano_trabalho ADD COLUMN IF NOT EXISTS logradouro VARCHAR(200)`,
    `ALTER TABLE IF EXISTS plano_trabalho ADD COLUMN IF NOT EXISTS numero VARCHAR(40)`,
    `ALTER TABLE IF EXISTS plano_trabalho ADD COLUMN IF NOT EXISTS complemento VARCHAR(200)`,
    `ALTER TABLE IF EXISTS plano_trabalho ADD COLUMN IF NOT EXISTS bairro VARCHAR(120)`,
    `ALTER TABLE IF EXISTS plano_trabalho ADD COLUMN IF NOT EXISTS cidade VARCHAR(120)`,
    `ALTER TABLE IF EXISTS plano_trabalho ADD COLUMN IF NOT EXISTS uf VARCHAR(2)`,
    `ALTER TABLE IF EXISTS plano_trabalho ADD COLUMN IF NOT EXISTS telefone VARCHAR(20)`,
    `ALTER TABLE IF EXISTS plano_trabalho ADD COLUMN IF NOT EXISTS email VARCHAR(200)`,
    `ALTER TABLE IF EXISTS plano_trabalho ADD COLUMN IF NOT EXISTS representante_legal VARCHAR(200)`,
    `ALTER TABLE IF EXISTS plano_trabalho ADD COLUMN IF NOT EXISTS representante_cpf VARCHAR(14)`,
    `ALTER TABLE IF EXISTS plano_trabalho ADD COLUMN IF NOT EXISTS representante_cargo VARCHAR(200)`,
    `ALTER TABLE IF EXISTS plano_trabalho ADD COLUMN IF NOT EXISTS banco_nome VARCHAR(120)`,
    `ALTER TABLE IF EXISTS plano_trabalho ADD COLUMN IF NOT EXISTS banco_agencia VARCHAR(40)`,
    `ALTER TABLE IF EXISTS plano_trabalho ADD COLUMN IF NOT EXISTS banco_conta VARCHAR(60)`,
    `ALTER TABLE IF EXISTS plano_trabalho ADD COLUMN IF NOT EXISTS banco_operacao VARCHAR(40)`,
    `ALTER TABLE IF EXISTS plano_trabalho ADD COLUMN IF NOT EXISTS banco_pix VARCHAR(120)`,
    `ALTER TABLE IF EXISTS plano_trabalho ADD COLUMN IF NOT EXISTS banco_observacao TEXT`,
    `ALTER TABLE IF EXISTS plano_trabalho ADD COLUMN IF NOT EXISTS historico_osc TEXT`,
    `ALTER TABLE IF EXISTS plano_trabalho ADD COLUMN IF NOT EXISTS finalidade_institucional TEXT`,
    `ALTER TABLE IF EXISTS plano_trabalho ADD COLUMN IF NOT EXISTS experiencia_anterior TEXT`,
    `ALTER TABLE IF EXISTS plano_trabalho ADD COLUMN IF NOT EXISTS conselhos_certificacoes TEXT`,
    `ALTER TABLE IF EXISTS plano_trabalho ADD COLUMN IF NOT EXISTS publico_atendido_atual TEXT`,
    `ALTER TABLE IF EXISTS plano_trabalho ADD COLUMN IF NOT EXISTS capacidade_tecnica_operacional TEXT`,
    `ALTER TABLE IF EXISTS plano_trabalho ADD COLUMN IF NOT EXISTS descricao_objeto TEXT`,
    `ALTER TABLE IF EXISTS plano_trabalho ADD COLUMN IF NOT EXISTS area_atuacao VARCHAR(120)`,
    `ALTER TABLE IF EXISTS plano_trabalho ADD COLUMN IF NOT EXISTS local_execucao TEXT`,
    `ALTER TABLE IF EXISTS plano_trabalho ADD COLUMN IF NOT EXISTS abrangencia_territorial VARCHAR(160)`,
    `ALTER TABLE IF EXISTS plano_trabalho ADD COLUMN IF NOT EXISTS publico_alvo TEXT`,
    `ALTER TABLE IF EXISTS plano_trabalho ADD COLUMN IF NOT EXISTS quantidade_beneficiarios INTEGER`,
    `ALTER TABLE IF EXISTS plano_trabalho ADD COLUMN IF NOT EXISTS criterios_selecao TEXT`,
    `ALTER TABLE IF EXISTS plano_trabalho ADD COLUMN IF NOT EXISTS problema_social TEXT`,
    `ALTER TABLE IF EXISTS plano_trabalho ADD COLUMN IF NOT EXISTS causas_consequencias TEXT`,
    `ALTER TABLE IF EXISTS plano_trabalho ADD COLUMN IF NOT EXISTS dados_indicadores TEXT`,
    `ALTER TABLE IF EXISTS plano_trabalho ADD COLUMN IF NOT EXISTS capacidade_execucao TEXT`,
    `ALTER TABLE IF EXISTS plano_trabalho ADD COLUMN IF NOT EXISTS impacto_esperado TEXT`,
    `ALTER TABLE IF EXISTS plano_trabalho ADD COLUMN IF NOT EXISTS objetivo_geral TEXT`,
    `ALTER TABLE IF EXISTS plano_trabalho ADD COLUMN IF NOT EXISTS forma_acompanhamento TEXT`,
    `ALTER TABLE IF EXISTS plano_trabalho ADD COLUMN IF NOT EXISTS indicadores_monitoramento TEXT`,
    `ALTER TABLE IF EXISTS plano_trabalho ADD COLUMN IF NOT EXISTS periodicidade_monitoramento VARCHAR(80)`,
    `ALTER TABLE IF EXISTS plano_trabalho ADD COLUMN IF NOT EXISTS responsavel_coleta_dados VARCHAR(200)`,
    `ALTER TABLE IF EXISTS plano_trabalho ADD COLUMN IF NOT EXISTS instrumentos_monitoramento TEXT`,
    `ALTER TABLE IF EXISTS plano_trabalho ADD COLUMN IF NOT EXISTS resultado_esperado_monitoramento TEXT`,
    `ALTER TABLE IF EXISTS plano_trabalho ADD COLUMN IF NOT EXISTS evidencias_obrigatorias TEXT`,
    `ALTER TABLE IF EXISTS plano_trabalho ADD COLUMN IF NOT EXISTS periodicidade_prestacao VARCHAR(60)`,
    `ALTER TABLE IF EXISTS plano_trabalho ADD COLUMN IF NOT EXISTS data_limite_prestacao DATE`,
    `ALTER TABLE IF EXISTS plano_trabalho ADD COLUMN IF NOT EXISTS documentos_exigidos TEXT`,
    `ALTER TABLE IF EXISTS plano_trabalho ADD COLUMN IF NOT EXISTS responsavel_prestacao VARCHAR(200)`,
    `ALTER TABLE IF EXISTS plano_trabalho ADD COLUMN IF NOT EXISTS observacoes_prestacao TEXT`,
    `ALTER TABLE IF EXISTS plano_trabalho ADD COLUMN IF NOT EXISTS local_declaracao VARCHAR(160)`,
    `ALTER TABLE IF EXISTS plano_trabalho ADD COLUMN IF NOT EXISTS data_declaracao DATE`,
    `ALTER TABLE IF EXISTS plano_trabalho ADD COLUMN IF NOT EXISTS nome_representante_declaracao VARCHAR(200)`,
    `ALTER TABLE IF EXISTS plano_trabalho ADD COLUMN IF NOT EXISTS cpf_representante_declaracao VARCHAR(14)`,
    `ALTER TABLE IF EXISTS plano_trabalho ADD COLUMN IF NOT EXISTS cargo_representante_declaracao VARCHAR(200)`,
    `ALTER TABLE IF EXISTS plano_trabalho ADD COLUMN IF NOT EXISTS declaracao_veracidade BOOLEAN NOT NULL DEFAULT FALSE`,
    `ALTER TABLE IF EXISTS plano_trabalho ADD COLUMN IF NOT EXISTS aprovacao_interna VARCHAR(80)`,
    `ALTER TABLE IF EXISTS plano_trabalho ADD COLUMN IF NOT EXISTS situacao_aprovacao VARCHAR(80)`,
    `ALTER TABLE IF EXISTS plano_trabalho ADD COLUMN IF NOT EXISTS observacao_aprovador TEXT`,
    `ALTER TABLE IF EXISTS plano_trabalho_metas ADD COLUMN IF NOT EXISTS numero_meta VARCHAR(30)`,
    `ALTER TABLE IF EXISTS plano_trabalho_metas ADD COLUMN IF NOT EXISTS tenant_id UUID`,
    `ALTER TABLE IF EXISTS plano_trabalho_metas ADD COLUMN IF NOT EXISTS indicador_resultado TEXT`,
    `ALTER TABLE IF EXISTS plano_trabalho_metas ADD COLUMN IF NOT EXISTS meio_verificacao TEXT`,
    `ALTER TABLE IF EXISTS plano_trabalho_metas ADD COLUMN IF NOT EXISTS data_inicio DATE`,
    `ALTER TABLE IF EXISTS plano_trabalho_metas ADD COLUMN IF NOT EXISTS data_fim DATE`,
    `ALTER TABLE IF EXISTS plano_trabalho_metas ADD COLUMN IF NOT EXISTS responsavel VARCHAR(200)`,
    `ALTER TABLE IF EXISTS plano_trabalho_metas ADD COLUMN IF NOT EXISTS situacao VARCHAR(60)`,
    `ALTER TABLE IF EXISTS plano_trabalho_metas ADD COLUMN IF NOT EXISTS ordem INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE IF EXISTS plano_trabalho_atividades ADD COLUMN IF NOT EXISTS nome_etapa VARCHAR(200)`,
    `ALTER TABLE IF EXISTS plano_trabalho_atividades ADD COLUMN IF NOT EXISTS tenant_id UUID`,
    `ALTER TABLE IF EXISTS plano_trabalho_atividades ADD COLUMN IF NOT EXISTS acao_executar TEXT`,
    `ALTER TABLE IF EXISTS plano_trabalho_atividades ADD COLUMN IF NOT EXISTS descricao_detalhada TEXT`,
    `ALTER TABLE IF EXISTS plano_trabalho_atividades ADD COLUMN IF NOT EXISTS publico_atendido TEXT`,
    `ALTER TABLE IF EXISTS plano_trabalho_atividades ADD COLUMN IF NOT EXISTS quantidade NUMERIC(14,2)`,
    `ALTER TABLE IF EXISTS plano_trabalho_atividades ADD COLUMN IF NOT EXISTS unidade VARCHAR(60)`,
    `ALTER TABLE IF EXISTS plano_trabalho_atividades ADD COLUMN IF NOT EXISTS data_inicio DATE`,
    `ALTER TABLE IF EXISTS plano_trabalho_atividades ADD COLUMN IF NOT EXISTS data_fim DATE`,
    `ALTER TABLE IF EXISTS plano_trabalho_atividades ADD COLUMN IF NOT EXISTS valor_estimado NUMERIC(14,2)`,
    `ALTER TABLE IF EXISTS plano_trabalho_atividades ADD COLUMN IF NOT EXISTS documento_comprobatorio TEXT`,
    `ALTER TABLE IF EXISTS plano_trabalho_atividades ADD COLUMN IF NOT EXISTS responsavel VARCHAR(200)`,
    `ALTER TABLE IF EXISTS plano_trabalho_atividades ADD COLUMN IF NOT EXISTS situacao VARCHAR(60)`,
    `ALTER TABLE IF EXISTS plano_trabalho_atividades ADD COLUMN IF NOT EXISTS ordem INTEGER NOT NULL DEFAULT 0`,
    `CREATE TABLE IF NOT EXISTS plano_trabalho_objetivos (
    id BIGSERIAL PRIMARY KEY,
    plano_trabalho_id BIGINT NOT NULL REFERENCES plano_trabalho(id) ON DELETE CASCADE,
    tenant_id UUID,
    descricao TEXT NOT NULL,
    resultado_esperado TEXT,
    metas_vinculadas TEXT,
    ordem INTEGER NOT NULL DEFAULT 0,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
    `CREATE TABLE IF NOT EXISTS plano_trabalho_aplicacao_recursos (
    id BIGSERIAL PRIMARY KEY,
    plano_trabalho_id BIGINT NOT NULL REFERENCES plano_trabalho(id) ON DELETE CASCADE,
    tenant_id UUID,
    categoria_despesa VARCHAR(120) NOT NULL,
    item VARCHAR(160) NOT NULL,
    descricao TEXT,
    quantidade NUMERIC(14,2),
    unidade VARCHAR(60),
    valor_unitario NUMERIC(14,2),
    valor_total NUMERIC(14,2),
    fonte_recurso VARCHAR(120),
    meta_numero VARCHAR(30),
    etapa_nome VARCHAR(200),
    natureza_despesa VARCHAR(120),
    observacao TEXT,
    ordem INTEGER NOT NULL DEFAULT 0,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
    `CREATE TABLE IF NOT EXISTS plano_trabalho_desembolso (
    id BIGSERIAL PRIMARY KEY,
    plano_trabalho_id BIGINT NOT NULL REFERENCES plano_trabalho(id) ON DELETE CASCADE,
    tenant_id UUID,
    mes_ano VARCHAR(7) NOT NULL,
    valor_previsto NUMERIC(14,2),
    fonte_recurso VARCHAR(120),
    meta_numero VARCHAR(30),
    observacao TEXT,
    ordem INTEGER NOT NULL DEFAULT 0,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
    `CREATE TABLE IF NOT EXISTS plano_trabalho_checklist_prestacao (
    id BIGSERIAL PRIMARY KEY,
    plano_trabalho_id BIGINT NOT NULL REFERENCES plano_trabalho(id) ON DELETE CASCADE,
    tenant_id UUID,
    descricao TEXT NOT NULL,
    obrigatorio BOOLEAN NOT NULL DEFAULT TRUE,
    concluido BOOLEAN NOT NULL DEFAULT FALSE,
    ordem INTEGER NOT NULL DEFAULT 0,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
    `ALTER TABLE IF EXISTS plano_trabalho_objetivos ADD COLUMN IF NOT EXISTS tenant_id UUID`,
    `ALTER TABLE IF EXISTS plano_trabalho_aplicacao_recursos ADD COLUMN IF NOT EXISTS tenant_id UUID`,
    `ALTER TABLE IF EXISTS plano_trabalho_desembolso ADD COLUMN IF NOT EXISTS tenant_id UUID`,
    `ALTER TABLE IF EXISTS plano_trabalho_checklist_prestacao ADD COLUMN IF NOT EXISTS tenant_id UUID`,
    `CREATE INDEX IF NOT EXISTS plano_trabalho_tenant_idx ON plano_trabalho(tenant_id, atualizado_em DESC, id DESC)`,
    `CREATE INDEX IF NOT EXISTS plano_trabalho_metas_tenant_idx ON plano_trabalho_metas(tenant_id, plano_trabalho_id, ordem, id)`,
    `CREATE INDEX IF NOT EXISTS plano_trabalho_atividades_tenant_idx ON plano_trabalho_atividades(tenant_id, meta_id, ordem, id)`,
    `CREATE INDEX IF NOT EXISTS plano_trabalho_objetivos_tenant_idx ON plano_trabalho_objetivos(tenant_id, plano_trabalho_id, ordem, id)`,
    `CREATE INDEX IF NOT EXISTS plano_trabalho_aplicacao_tenant_idx ON plano_trabalho_aplicacao_recursos(tenant_id, plano_trabalho_id, ordem, id)`,
    `CREATE INDEX IF NOT EXISTS plano_trabalho_desembolso_tenant_idx ON plano_trabalho_desembolso(tenant_id, plano_trabalho_id, ordem, id)`,
    `CREATE INDEX IF NOT EXISTS plano_trabalho_checklist_tenant_idx ON plano_trabalho_checklist_prestacao(tenant_id, plano_trabalho_id, ordem, id)`,
    `UPDATE plano_trabalho p
    SET tenant_id = ref.tenant_id
    FROM (
      SELECT id AS tenant_id
      FROM instituicoes
      ORDER BY criado_em ASC NULLS LAST, id ASC
      LIMIT 1
    ) ref
    WHERE p.tenant_id IS NULL`,
    `UPDATE plano_trabalho_objetivos o
    SET tenant_id = p.tenant_id
    FROM plano_trabalho p
    WHERE o.tenant_id IS NULL
      AND p.id = o.plano_trabalho_id
      AND p.tenant_id IS NOT NULL`,
    `UPDATE plano_trabalho_metas m
    SET tenant_id = p.tenant_id
    FROM plano_trabalho p
    WHERE m.tenant_id IS NULL
      AND p.id = m.plano_trabalho_id
      AND p.tenant_id IS NOT NULL`,
    `UPDATE plano_trabalho_atividades a
    SET tenant_id = m.tenant_id
    FROM plano_trabalho_metas m
    WHERE a.tenant_id IS NULL
      AND m.id = a.meta_id
      AND m.tenant_id IS NOT NULL`,
    `UPDATE plano_trabalho_aplicacao_recursos a
    SET tenant_id = p.tenant_id
    FROM plano_trabalho p
    WHERE a.tenant_id IS NULL
      AND p.id = a.plano_trabalho_id
      AND p.tenant_id IS NOT NULL`,
    `UPDATE plano_trabalho_desembolso d
    SET tenant_id = p.tenant_id
    FROM plano_trabalho p
    WHERE d.tenant_id IS NULL
      AND p.id = d.plano_trabalho_id
      AND p.tenant_id IS NOT NULL`,
    `UPDATE plano_trabalho_checklist_prestacao c
    SET tenant_id = p.tenant_id
    FROM plano_trabalho p
    WHERE c.tenant_id IS NULL
      AND p.id = c.plano_trabalho_id
      AND p.tenant_id IS NOT NULL`,
    `CREATE INDEX IF NOT EXISTS plano_trabalho_objetivos_plano_idx ON plano_trabalho_objetivos(plano_trabalho_id)`,
    `CREATE INDEX IF NOT EXISTS plano_trabalho_aplicacao_plano_idx ON plano_trabalho_aplicacao_recursos(plano_trabalho_id)`,
    `CREATE INDEX IF NOT EXISTS plano_trabalho_desembolso_plano_idx ON plano_trabalho_desembolso(plano_trabalho_id)`,
    `CREATE INDEX IF NOT EXISTS plano_trabalho_checklist_plano_idx ON plano_trabalho_checklist_prestacao(plano_trabalho_id)`
];
let estruturaPromise = null;
async function ensurePlanosTrabalhoEstrutura() {
    if (!estruturaPromise) {
        estruturaPromise = (async () => {
            for (const comando of estruturaSql) {
                await prisma.$executeRawUnsafe(comando);
            }
        })();
    }
    await estruturaPromise;
}
function parseOptionalBigInt(value) {
    if (!value?.trim())
        return null;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new AppError("Termo de fomento inválido.", 400);
    }
    return BigInt(parsed);
}
function joinMetasVinculadas(values) {
    return values.map((item) => item.trim()).filter(Boolean).join("|") || null;
}
export class PlanosTrabalhoRepository {
    async listar(tenantId) {
        await ensurePlanosTrabalhoEstrutura();
        const planos = await prisma.$queryRaw(Prisma.sql `
      SELECT
        p.id,
        p.codigo_interno,
        p.titulo,
        p.tipo_parceria,
        COALESCE(p.orgao_parceiro, p.orgao_concedente) AS orgao_parceiro,
        p.edital_chamamento,
        COALESCE(p.periodo_inicio, p.vigencia_inicio) AS periodo_inicio,
        COALESCE(p.periodo_fim, p.vigencia_fim) AS periodo_fim,
        p.status,
        p.responsavel_tecnico,
        p.responsavel_legal,
        p.termo_fomento_id,
        p.numero_processo,
        p.razao_social,
        p.nome_fantasia,
        p.cnpj,
        p.cep,
        p.logradouro,
        p.numero,
        p.complemento,
        p.bairro,
        p.cidade,
        p.uf,
        p.telefone,
        p.email,
        p.representante_legal,
        p.representante_cpf,
        p.representante_cargo,
        p.banco_nome,
        p.banco_agencia,
        p.banco_conta,
        p.banco_operacao,
        p.banco_pix,
        p.banco_observacao,
        p.historico_osc,
        p.finalidade_institucional,
        p.experiencia_anterior,
        p.conselhos_certificacoes,
        p.publico_atendido_atual,
        p.capacidade_tecnica_operacional,
        COALESCE(p.descricao_objeto, p.descricao_geral) AS descricao_objeto,
        COALESCE(p.area_atuacao, p.area_programa) AS area_atuacao,
        p.local_execucao,
        p.abrangencia_territorial,
        p.publico_alvo,
        p.quantidade_beneficiarios,
        p.criterios_selecao,
        p.problema_social,
        p.causas_consequencias,
        p.dados_indicadores,
        p.capacidade_execucao,
        p.impacto_esperado,
        p.objetivo_geral,
        p.forma_acompanhamento,
        p.indicadores_monitoramento,
        p.periodicidade_monitoramento,
        p.responsavel_coleta_dados,
        p.instrumentos_monitoramento,
        p.resultado_esperado_monitoramento,
        p.evidencias_obrigatorias,
        p.periodicidade_prestacao,
        p.data_limite_prestacao,
        p.documentos_exigidos,
        p.responsavel_prestacao,
        p.observacoes_prestacao,
        p.local_declaracao,
        p.data_declaracao,
        p.nome_representante_declaracao,
        p.cpf_representante_declaracao,
        p.cargo_representante_declaracao,
        p.declaracao_veracidade,
        p.aprovacao_interna,
        p.situacao_aprovacao,
        p.observacao_aprovador,
        p.arquivo_formato,
        p.criado_em,
        p.atualizado_em,
        t.numero_termo AS termo_numero,
        t.descricao_objeto AS termo_objeto,
        t.responsavel_indicacao AS termo_responsavel_indicacao
      FROM plano_trabalho p
      LEFT JOIN termo_fomento t ON t.id = p.termo_fomento_id
      WHERE p.tenant_id::text = ${tenantId}
      ORDER BY p.id DESC
    `);
        const ids = planos.map((item) => item.id);
        const [objetivosEspecificos, metas, etapas, aplicacaoRecursos, desembolso, checklistPrestacao] = ids.length
            ? await Promise.all([
                this.listarObjetivos(ids, tenantId),
                this.listarMetas(ids, tenantId),
                this.listarEtapasPorPlanos(ids, tenantId),
                this.listarAplicacaoRecursos(ids, tenantId),
                this.listarDesembolso(ids, tenantId),
                this.listarChecklistPrestacao(ids, tenantId)
            ])
            : [[], [], [], [], [], []];
        return planos.map((plano) => ({
            plano,
            objetivosEspecificos,
            metas,
            etapas,
            aplicacaoRecursos,
            desembolso,
            checklistPrestacao
        }));
    }
    async buscarPorId(id, tenantId) {
        await ensurePlanosTrabalhoEstrutura();
        const rows = await prisma.$queryRaw(Prisma.sql `
      SELECT
        p.id,
        p.codigo_interno,
        p.titulo,
        p.tipo_parceria,
        COALESCE(p.orgao_parceiro, p.orgao_concedente) AS orgao_parceiro,
        p.edital_chamamento,
        COALESCE(p.periodo_inicio, p.vigencia_inicio) AS periodo_inicio,
        COALESCE(p.periodo_fim, p.vigencia_fim) AS periodo_fim,
        p.status,
        p.responsavel_tecnico,
        p.responsavel_legal,
        p.termo_fomento_id,
        p.numero_processo,
        p.razao_social,
        p.nome_fantasia,
        p.cnpj,
        p.cep,
        p.logradouro,
        p.numero,
        p.complemento,
        p.bairro,
        p.cidade,
        p.uf,
        p.telefone,
        p.email,
        p.representante_legal,
        p.representante_cpf,
        p.representante_cargo,
        p.banco_nome,
        p.banco_agencia,
        p.banco_conta,
        p.banco_operacao,
        p.banco_pix,
        p.banco_observacao,
        p.historico_osc,
        p.finalidade_institucional,
        p.experiencia_anterior,
        p.conselhos_certificacoes,
        p.publico_atendido_atual,
        p.capacidade_tecnica_operacional,
        COALESCE(p.descricao_objeto, p.descricao_geral) AS descricao_objeto,
        COALESCE(p.area_atuacao, p.area_programa) AS area_atuacao,
        p.local_execucao,
        p.abrangencia_territorial,
        p.publico_alvo,
        p.quantidade_beneficiarios,
        p.criterios_selecao,
        p.problema_social,
        p.causas_consequencias,
        p.dados_indicadores,
        p.capacidade_execucao,
        p.impacto_esperado,
        p.objetivo_geral,
        p.forma_acompanhamento,
        p.indicadores_monitoramento,
        p.periodicidade_monitoramento,
        p.responsavel_coleta_dados,
        p.instrumentos_monitoramento,
        p.resultado_esperado_monitoramento,
        p.evidencias_obrigatorias,
        p.periodicidade_prestacao,
        p.data_limite_prestacao,
        p.documentos_exigidos,
        p.responsavel_prestacao,
        p.observacoes_prestacao,
        p.local_declaracao,
        p.data_declaracao,
        p.nome_representante_declaracao,
        p.cpf_representante_declaracao,
        p.cargo_representante_declaracao,
        p.declaracao_veracidade,
        p.aprovacao_interna,
        p.situacao_aprovacao,
        p.observacao_aprovador,
        p.arquivo_formato,
        p.criado_em,
        p.atualizado_em,
        t.numero_termo AS termo_numero,
        t.descricao_objeto AS termo_objeto,
        t.responsavel_indicacao AS termo_responsavel_indicacao
      FROM plano_trabalho p
      LEFT JOIN termo_fomento t ON t.id = p.termo_fomento_id
      WHERE p.id = ${id}
        AND p.tenant_id::text = ${tenantId}
      LIMIT 1
    `);
        const plano = rows[0] ?? null;
        if (!plano)
            return null;
        const [objetivosEspecificos, metas, etapas, aplicacaoRecursos, desembolso, checklistPrestacao] = await Promise.all([
            this.listarObjetivos([id], tenantId),
            this.listarMetas([id], tenantId),
            this.listarEtapasPorPlanos([id], tenantId),
            this.listarAplicacaoRecursos([id], tenantId),
            this.listarDesembolso([id], tenantId),
            this.listarChecklistPrestacao([id], tenantId)
        ]);
        return { plano, objetivosEspecificos, metas, etapas, aplicacaoRecursos, desembolso, checklistPrestacao };
    }
    async buscarPorIdOuFalhar(id, tenantId) {
        const registro = await this.buscarPorId(id, tenantId);
        if (!registro) {
            throw new AppError("Plano de trabalho não encontrado.", 404);
        }
        return registro;
    }
    async criar(input, tenantId, usuarioId) {
        await ensurePlanosTrabalhoEstrutura();
        const id = await prisma.$transaction(async (tx) => {
            const codigoInterno = trimOrUndefined(input.codigoInterno ?? undefined) ?? (await this.gerarCodigoInterno(tenantId));
            const termoFomentoId = parseOptionalBigInt(input.termoFomentoId);
            const insert = await tx.$queryRaw(Prisma.sql `
        INSERT INTO plano_trabalho (
          tenant_id,
          codigo_interno,
          titulo,
          descricao_geral,
          status,
          orgao_concedente,
          area_programa,
          vigencia_inicio,
          vigencia_fim,
          termo_fomento_id,
          numero_processo,
          modalidade,
          tipo_parceria,
          orgao_parceiro,
          edital_chamamento,
          periodo_inicio,
          periodo_fim,
          responsavel_tecnico,
          responsavel_legal,
          razao_social,
          nome_fantasia,
          cnpj,
          cep,
          logradouro,
          numero,
          complemento,
          bairro,
          cidade,
          uf,
          telefone,
          email,
          representante_legal,
          representante_cpf,
          representante_cargo,
          banco_nome,
          banco_agencia,
          banco_conta,
          banco_operacao,
          banco_pix,
          banco_observacao,
          historico_osc,
          finalidade_institucional,
          experiencia_anterior,
          conselhos_certificacoes,
          publico_atendido_atual,
          capacidade_tecnica_operacional,
          descricao_objeto,
          area_atuacao,
          local_execucao,
          abrangencia_territorial,
          publico_alvo,
          quantidade_beneficiarios,
          criterios_selecao,
          problema_social,
          causas_consequencias,
          dados_indicadores,
          capacidade_execucao,
          impacto_esperado,
          objetivo_geral,
          forma_acompanhamento,
          indicadores_monitoramento,
          periodicidade_monitoramento,
          responsavel_coleta_dados,
          instrumentos_monitoramento,
          resultado_esperado_monitoramento,
          evidencias_obrigatorias,
          periodicidade_prestacao,
          data_limite_prestacao,
          documentos_exigidos,
          responsavel_prestacao,
          observacoes_prestacao,
          local_declaracao,
          data_declaracao,
          nome_representante_declaracao,
          cpf_representante_declaracao,
          cargo_representante_declaracao,
          declaracao_veracidade,
          aprovacao_interna,
          situacao_aprovacao,
          observacao_aprovador,
          arquivo_formato,
          criado_em,
          atualizado_em
        ) VALUES (
          ${tenantId}::uuid,
          ${codigoInterno},
          ${input.titulo},
          ${input.descricaoObjeto},
          ${input.status},
          ${trimOrUndefined(input.orgaoParceiro)},
          ${trimOrUndefined(input.areaAtuacao)},
          ${toOptionalDate(input.periodoInicio)},
          ${toOptionalDate(input.periodoFim)},
          ${termoFomentoId},
          ${trimOrUndefined(input.numeroProcesso ?? undefined)},
          ${trimOrUndefined(input.tipoParceria)},
          ${trimOrUndefined(input.tipoParceria)},
          ${trimOrUndefined(input.orgaoParceiro)},
          ${trimOrUndefined(input.editalChamamento ?? undefined)},
          ${toOptionalDate(input.periodoInicio)},
          ${toOptionalDate(input.periodoFim)},
          ${trimOrUndefined(input.responsavelTecnico)},
          ${trimOrUndefined(input.responsavelLegal)},
          ${trimOrUndefined(input.razaoSocial)},
          ${trimOrUndefined(input.nomeFantasia ?? undefined)},
          ${trimOrUndefined(input.cnpj)},
          ${trimOrUndefined(input.cep ?? undefined)},
          ${trimOrUndefined(input.logradouro ?? undefined)},
          ${trimOrUndefined(input.numero ?? undefined)},
          ${trimOrUndefined(input.complemento ?? undefined)},
          ${trimOrUndefined(input.bairro ?? undefined)},
          ${trimOrUndefined(input.cidade ?? undefined)},
          ${trimOrUndefined(input.uf ?? undefined)},
          ${trimOrUndefined(input.telefone ?? undefined)},
          ${trimOrUndefined(input.email ?? undefined)},
          ${trimOrUndefined(input.representanteLegal)},
          ${trimOrUndefined(input.representanteCpf)},
          ${trimOrUndefined(input.representanteCargo ?? undefined)},
          ${trimOrUndefined(input.bancoNome ?? undefined)},
          ${trimOrUndefined(input.bancoAgencia ?? undefined)},
          ${trimOrUndefined(input.bancoConta ?? undefined)},
          ${trimOrUndefined(input.bancoOperacao ?? undefined)},
          ${trimOrUndefined(input.bancoPix ?? undefined)},
          ${trimOrUndefined(input.bancoObservacao ?? undefined)},
          ${trimOrUndefined(input.historicoOsc ?? undefined)},
          ${trimOrUndefined(input.finalidadeInstitucional ?? undefined)},
          ${trimOrUndefined(input.experienciaAnterior ?? undefined)},
          ${trimOrUndefined(input.conselhosCertificacoes ?? undefined)},
          ${trimOrUndefined(input.publicoAtendidoAtual ?? undefined)},
          ${trimOrUndefined(input.capacidadeTecnicaOperacional ?? undefined)},
          ${trimOrUndefined(input.descricaoObjeto)},
          ${trimOrUndefined(input.areaAtuacao)},
          ${trimOrUndefined(input.localExecucao)},
          ${trimOrUndefined(input.abrangenciaTerritorial ?? undefined)},
          ${trimOrUndefined(input.publicoAlvo)},
          ${input.quantidadeBeneficiarios ?? null},
          ${trimOrUndefined(input.criteriosSelecao ?? undefined)},
          ${trimOrUndefined(input.problemaSocial)},
          ${trimOrUndefined(input.causasConsequencias ?? undefined)},
          ${trimOrUndefined(input.dadosIndicadores ?? undefined)},
          ${trimOrUndefined(input.capacidadeExecucao ?? undefined)},
          ${trimOrUndefined(input.impactoEsperado ?? undefined)},
          ${trimOrUndefined(input.objetivoGeral)},
          ${trimOrUndefined(input.formaAcompanhamento ?? undefined)},
          ${trimOrUndefined(input.indicadoresMonitoramento ?? undefined)},
          ${trimOrUndefined(input.periodicidadeMonitoramento ?? undefined)},
          ${trimOrUndefined(input.responsavelColetaDados ?? undefined)},
          ${trimOrUndefined((input.instrumentosMonitoramento ?? []).join("|"))},
          ${trimOrUndefined(input.resultadoEsperadoMonitoramento ?? undefined)},
          ${trimOrUndefined(input.evidenciasObrigatorias ?? undefined)},
          ${trimOrUndefined(input.periodicidadePrestacao ?? undefined)},
          ${toOptionalDate(input.dataLimitePrestacao ?? undefined)},
          ${trimOrUndefined(input.documentosExigidos ?? undefined)},
          ${trimOrUndefined(input.responsavelPrestacao ?? undefined)},
          ${trimOrUndefined(input.observacoesPrestacao ?? undefined)},
          ${trimOrUndefined(input.localDeclaracao ?? undefined)},
          ${toOptionalDate(input.dataDeclaracao ?? undefined)},
          ${trimOrUndefined(input.nomeRepresentanteDeclaracao ?? undefined)},
          ${trimOrUndefined(input.cpfRepresentanteDeclaracao ?? undefined)},
          ${trimOrUndefined(input.cargoRepresentanteDeclaracao ?? undefined)},
          ${Boolean(input.declaracaoVeracidade)},
          ${trimOrUndefined(input.aprovacaoInterna ?? undefined)},
          ${trimOrUndefined(input.situacaoAprovacao ?? undefined)},
          ${trimOrUndefined(input.observacaoAprovador ?? undefined)},
          ${trimOrUndefined(input.arquivoFormato ?? undefined)},
          NOW(),
          NOW()
        )
        RETURNING id
      `);
            const planoId = insert[0]?.id;
            if (!planoId)
                throw new AppError("Não foi possível criar o plano de trabalho.", 500);
            await this.salvarRelacionamentos(tx, planoId, input, tenantId);
            return planoId;
        });
        await this.registrarAuditoria("CREATE", id, input, usuarioId);
        return this.buscarPorIdOuFalhar(id, tenantId);
    }
    async atualizar(id, input, tenantId, usuarioId) {
        await ensurePlanosTrabalhoEstrutura();
        await this.buscarPorIdOuFalhar(id, tenantId);
        await prisma.$transaction(async (tx) => {
            const termoFomentoId = parseOptionalBigInt(input.termoFomentoId);
            await tx.$executeRaw(Prisma.sql `
        UPDATE plano_trabalho
        SET
          codigo_interno = ${trimOrUndefined(input.codigoInterno ?? undefined) ?? (await this.gerarCodigoInterno(tenantId))},
          titulo = ${input.titulo},
          descricao_geral = ${input.descricaoObjeto},
          status = ${input.status},
          orgao_concedente = ${trimOrUndefined(input.orgaoParceiro)},
          area_programa = ${trimOrUndefined(input.areaAtuacao)},
          vigencia_inicio = ${toOptionalDate(input.periodoInicio)},
          vigencia_fim = ${toOptionalDate(input.periodoFim)},
          termo_fomento_id = ${termoFomentoId},
          numero_processo = ${trimOrUndefined(input.numeroProcesso ?? undefined)},
          modalidade = ${trimOrUndefined(input.tipoParceria)},
          tipo_parceria = ${trimOrUndefined(input.tipoParceria)},
          orgao_parceiro = ${trimOrUndefined(input.orgaoParceiro)},
          edital_chamamento = ${trimOrUndefined(input.editalChamamento ?? undefined)},
          periodo_inicio = ${toOptionalDate(input.periodoInicio)},
          periodo_fim = ${toOptionalDate(input.periodoFim)},
          responsavel_tecnico = ${trimOrUndefined(input.responsavelTecnico)},
          responsavel_legal = ${trimOrUndefined(input.responsavelLegal)},
          razao_social = ${trimOrUndefined(input.razaoSocial)},
          nome_fantasia = ${trimOrUndefined(input.nomeFantasia ?? undefined)},
          cnpj = ${trimOrUndefined(input.cnpj)},
          cep = ${trimOrUndefined(input.cep ?? undefined)},
          logradouro = ${trimOrUndefined(input.logradouro ?? undefined)},
          numero = ${trimOrUndefined(input.numero ?? undefined)},
          complemento = ${trimOrUndefined(input.complemento ?? undefined)},
          bairro = ${trimOrUndefined(input.bairro ?? undefined)},
          cidade = ${trimOrUndefined(input.cidade ?? undefined)},
          uf = ${trimOrUndefined(input.uf ?? undefined)},
          telefone = ${trimOrUndefined(input.telefone ?? undefined)},
          email = ${trimOrUndefined(input.email ?? undefined)},
          representante_legal = ${trimOrUndefined(input.representanteLegal)},
          representante_cpf = ${trimOrUndefined(input.representanteCpf)},
          representante_cargo = ${trimOrUndefined(input.representanteCargo ?? undefined)},
          banco_nome = ${trimOrUndefined(input.bancoNome ?? undefined)},
          banco_agencia = ${trimOrUndefined(input.bancoAgencia ?? undefined)},
          banco_conta = ${trimOrUndefined(input.bancoConta ?? undefined)},
          banco_operacao = ${trimOrUndefined(input.bancoOperacao ?? undefined)},
          banco_pix = ${trimOrUndefined(input.bancoPix ?? undefined)},
          banco_observacao = ${trimOrUndefined(input.bancoObservacao ?? undefined)},
          historico_osc = ${trimOrUndefined(input.historicoOsc ?? undefined)},
          finalidade_institucional = ${trimOrUndefined(input.finalidadeInstitucional ?? undefined)},
          experiencia_anterior = ${trimOrUndefined(input.experienciaAnterior ?? undefined)},
          conselhos_certificacoes = ${trimOrUndefined(input.conselhosCertificacoes ?? undefined)},
          publico_atendido_atual = ${trimOrUndefined(input.publicoAtendidoAtual ?? undefined)},
          capacidade_tecnica_operacional = ${trimOrUndefined(input.capacidadeTecnicaOperacional ?? undefined)},
          descricao_objeto = ${trimOrUndefined(input.descricaoObjeto)},
          area_atuacao = ${trimOrUndefined(input.areaAtuacao)},
          local_execucao = ${trimOrUndefined(input.localExecucao)},
          abrangencia_territorial = ${trimOrUndefined(input.abrangenciaTerritorial ?? undefined)},
          publico_alvo = ${trimOrUndefined(input.publicoAlvo)},
          quantidade_beneficiarios = ${input.quantidadeBeneficiarios ?? null},
          criterios_selecao = ${trimOrUndefined(input.criteriosSelecao ?? undefined)},
          problema_social = ${trimOrUndefined(input.problemaSocial)},
          causas_consequencias = ${trimOrUndefined(input.causasConsequencias ?? undefined)},
          dados_indicadores = ${trimOrUndefined(input.dadosIndicadores ?? undefined)},
          capacidade_execucao = ${trimOrUndefined(input.capacidadeExecucao ?? undefined)},
          impacto_esperado = ${trimOrUndefined(input.impactoEsperado ?? undefined)},
          objetivo_geral = ${trimOrUndefined(input.objetivoGeral)},
          forma_acompanhamento = ${trimOrUndefined(input.formaAcompanhamento ?? undefined)},
          indicadores_monitoramento = ${trimOrUndefined(input.indicadoresMonitoramento ?? undefined)},
          periodicidade_monitoramento = ${trimOrUndefined(input.periodicidadeMonitoramento ?? undefined)},
          responsavel_coleta_dados = ${trimOrUndefined(input.responsavelColetaDados ?? undefined)},
          instrumentos_monitoramento = ${trimOrUndefined((input.instrumentosMonitoramento ?? []).join("|"))},
          resultado_esperado_monitoramento = ${trimOrUndefined(input.resultadoEsperadoMonitoramento ?? undefined)},
          evidencias_obrigatorias = ${trimOrUndefined(input.evidenciasObrigatorias ?? undefined)},
          periodicidade_prestacao = ${trimOrUndefined(input.periodicidadePrestacao ?? undefined)},
          data_limite_prestacao = ${toOptionalDate(input.dataLimitePrestacao ?? undefined)},
          documentos_exigidos = ${trimOrUndefined(input.documentosExigidos ?? undefined)},
          responsavel_prestacao = ${trimOrUndefined(input.responsavelPrestacao ?? undefined)},
          observacoes_prestacao = ${trimOrUndefined(input.observacoesPrestacao ?? undefined)},
          local_declaracao = ${trimOrUndefined(input.localDeclaracao ?? undefined)},
          data_declaracao = ${toOptionalDate(input.dataDeclaracao ?? undefined)},
          nome_representante_declaracao = ${trimOrUndefined(input.nomeRepresentanteDeclaracao ?? undefined)},
          cpf_representante_declaracao = ${trimOrUndefined(input.cpfRepresentanteDeclaracao ?? undefined)},
          cargo_representante_declaracao = ${trimOrUndefined(input.cargoRepresentanteDeclaracao ?? undefined)},
          declaracao_veracidade = ${Boolean(input.declaracaoVeracidade)},
          aprovacao_interna = ${trimOrUndefined(input.aprovacaoInterna ?? undefined)},
          situacao_aprovacao = ${trimOrUndefined(input.situacaoAprovacao ?? undefined)},
          observacao_aprovador = ${trimOrUndefined(input.observacaoAprovador ?? undefined)},
          arquivo_formato = ${trimOrUndefined(input.arquivoFormato ?? undefined)},
          atualizado_em = NOW()
        WHERE id = ${id}
          AND tenant_id::text = ${tenantId}
      `);
            await this.salvarRelacionamentos(tx, id, input, tenantId);
        });
        await this.registrarAuditoria("UPDATE", id, input, usuarioId);
        return this.buscarPorIdOuFalhar(id, tenantId);
    }
    async remover(id, tenantId, usuarioId) {
        await ensurePlanosTrabalhoEstrutura();
        const atual = await this.buscarPorIdOuFalhar(id, tenantId);
        await prisma.$executeRaw(Prisma.sql `
      DELETE FROM plano_trabalho
      WHERE id = ${id}
        AND tenant_id::text = ${tenantId}
    `);
        await this.registrarAuditoria("DELETE", id, { codigoInterno: atual.plano.codigo_interno, titulo: atual.plano.titulo }, usuarioId);
    }
    async gerarCodigoInterno(tenantId) {
        const rows = await prisma.$queryRaw(Prisma.sql `
      SELECT COALESCE(MAX(id), 0) + 1 AS proximo
      FROM plano_trabalho
      WHERE tenant_id::text = ${tenantId}
    `);
        return `PLN-${String(rows[0]?.proximo ?? 1).padStart(4, "0")}`;
    }
    async listarObjetivos(planosIds, tenantId) {
        return prisma.$queryRaw(Prisma.sql `
      SELECT id, plano_trabalho_id, descricao, resultado_esperado, metas_vinculadas, ordem
      FROM plano_trabalho_objetivos
      WHERE plano_trabalho_id IN (${Prisma.join(planosIds)})
        AND tenant_id::text = ${tenantId}
      ORDER BY plano_trabalho_id, ordem, id
    `);
    }
    async listarMetas(planosIds, tenantId) {
        return prisma.$queryRaw(Prisma.sql `
      SELECT
        id,
        plano_trabalho_id,
        numero_meta,
        descricao,
        COALESCE(indicador_resultado, indicador) AS indicador_resultado,
        unidade_medida,
        quantidade_prevista::float8 AS quantidade_prevista,
        meio_verificacao,
        data_inicio,
        data_fim,
        responsavel,
        situacao,
        ordem
      FROM plano_trabalho_metas
      WHERE plano_trabalho_id IN (${Prisma.join(planosIds)})
        AND tenant_id::text = ${tenantId}
      ORDER BY plano_trabalho_id, ordem, id
    `);
    }
    async listarEtapasPorPlanos(planosIds, tenantId) {
        return prisma.$queryRaw(Prisma.sql `
      SELECT
        a.id,
        a.meta_id,
        COALESCE(a.nome_etapa, a.descricao) AS nome_etapa,
        a.acao_executar,
        a.descricao_detalhada,
        COALESCE(a.publico_atendido, a.publico_alvo) AS publico_atendido,
        a.quantidade::float8 AS quantidade,
        a.unidade,
        COALESCE(a.local_execucao, NULL) AS local_execucao,
        a.data_inicio,
        a.data_fim,
        a.valor_estimado::float8 AS valor_estimado,
        a.documento_comprobatorio,
        a.responsavel,
        COALESCE(a.situacao, NULL) AS situacao,
        a.ordem
      FROM plano_trabalho_atividades a
      INNER JOIN plano_trabalho_metas m ON m.id = a.meta_id
      WHERE m.plano_trabalho_id IN (${Prisma.join(planosIds)})
        AND m.tenant_id::text = ${tenantId}
        AND a.tenant_id::text = ${tenantId}
      ORDER BY m.plano_trabalho_id, m.ordem, a.ordem, a.id
    `);
    }
    async listarAplicacaoRecursos(planosIds, tenantId) {
        return prisma.$queryRaw(Prisma.sql `
      SELECT
        id,
        plano_trabalho_id,
        categoria_despesa,
        item,
        descricao,
        quantidade::float8 AS quantidade,
        unidade,
        valor_unitario::float8 AS valor_unitario,
        valor_total::float8 AS valor_total,
        fonte_recurso,
        meta_numero,
        etapa_nome,
        natureza_despesa,
        observacao,
        ordem
      FROM plano_trabalho_aplicacao_recursos
      WHERE plano_trabalho_id IN (${Prisma.join(planosIds)})
        AND tenant_id::text = ${tenantId}
      ORDER BY plano_trabalho_id, ordem, id
    `);
    }
    async listarDesembolso(planosIds, tenantId) {
        return prisma.$queryRaw(Prisma.sql `
      SELECT
        id,
        plano_trabalho_id,
        mes_ano,
        valor_previsto::float8 AS valor_previsto,
        fonte_recurso,
        meta_numero,
        observacao,
        ordem
      FROM plano_trabalho_desembolso
      WHERE plano_trabalho_id IN (${Prisma.join(planosIds)})
        AND tenant_id::text = ${tenantId}
      ORDER BY plano_trabalho_id, ordem, id
    `);
    }
    async listarChecklistPrestacao(planosIds, tenantId) {
        return prisma.$queryRaw(Prisma.sql `
      SELECT
        id,
        plano_trabalho_id,
        descricao,
        obrigatorio,
        concluido,
        ordem
      FROM plano_trabalho_checklist_prestacao
      WHERE plano_trabalho_id IN (${Prisma.join(planosIds)})
        AND tenant_id::text = ${tenantId}
      ORDER BY plano_trabalho_id, ordem, id
    `);
    }
    async salvarRelacionamentos(tx, planoId, input, tenantId) {
        await tx.$executeRaw(Prisma.sql `DELETE FROM plano_trabalho_objetivos WHERE plano_trabalho_id = ${planoId} AND tenant_id::text = ${tenantId}`);
        await tx.$executeRaw(Prisma.sql `DELETE FROM plano_trabalho_aplicacao_recursos WHERE plano_trabalho_id = ${planoId} AND tenant_id::text = ${tenantId}`);
        await tx.$executeRaw(Prisma.sql `DELETE FROM plano_trabalho_desembolso WHERE plano_trabalho_id = ${planoId} AND tenant_id::text = ${tenantId}`);
        await tx.$executeRaw(Prisma.sql `DELETE FROM plano_trabalho_checklist_prestacao WHERE plano_trabalho_id = ${planoId} AND tenant_id::text = ${tenantId}`);
        await tx.$executeRaw(Prisma.sql `DELETE FROM plano_trabalho_cronograma WHERE plano_trabalho_id = ${planoId}`);
        await tx.$executeRaw(Prisma.sql `DELETE FROM plano_trabalho_equipe WHERE plano_trabalho_id = ${planoId}`);
        await tx.$executeRaw(Prisma.sql `DELETE FROM plano_trabalho_metas WHERE plano_trabalho_id = ${planoId} AND tenant_id::text = ${tenantId}`);
        await this.inserirObjetivos(tx, planoId, input.objetivosEspecificos ?? [], tenantId);
        await this.inserirMetas(tx, planoId, input.metas ?? [], tenantId);
        await this.inserirAplicacaoRecursos(tx, planoId, input.aplicacaoRecursos ?? [], tenantId);
        await this.inserirDesembolso(tx, planoId, input.desembolso ?? [], tenantId);
        await this.inserirChecklistPrestacao(tx, planoId, input.checklistPrestacao ?? [], tenantId);
    }
    async inserirObjetivos(tx, planoId, objetivos, tenantId) {
        for (let index = 0; index < objetivos.length; index += 1) {
            const objetivo = objetivos[index];
            await tx.$executeRaw(Prisma.sql `
        INSERT INTO plano_trabalho_objetivos (
          plano_trabalho_id,
          tenant_id,
          descricao,
          resultado_esperado,
          metas_vinculadas,
          ordem
        ) VALUES (
          ${planoId},
          ${tenantId}::uuid,
          ${objetivo.descricao},
          ${trimOrUndefined(objetivo.resultadoEsperado ?? undefined)},
          ${joinMetasVinculadas(objetivo.metasVinculadas ?? [])},
          ${index}
        )
      `);
        }
    }
    async inserirMetas(tx, planoId, metas, tenantId) {
        for (let index = 0; index < metas.length; index += 1) {
            const meta = metas[index];
            const inserted = await tx.$queryRaw(Prisma.sql `
        INSERT INTO plano_trabalho_metas (
          plano_trabalho_id,
          tenant_id,
          codigo,
          numero_meta,
          descricao,
          indicador,
          indicador_resultado,
          unidade_medida,
          quantidade_prevista,
          resultado_esperado,
          meio_verificacao,
          data_inicio,
          data_fim,
          responsavel,
          situacao,
          ordem
        ) VALUES (
          ${planoId},
          ${tenantId}::uuid,
          ${trimOrUndefined(meta.numeroMeta)},
          ${trimOrUndefined(meta.numeroMeta)},
          ${meta.descricao},
          ${trimOrUndefined(meta.indicadorResultado ?? undefined)},
          ${trimOrUndefined(meta.indicadorResultado ?? undefined)},
          ${trimOrUndefined(meta.unidadeMedida ?? undefined)},
          ${meta.quantidadePrevista ?? null},
          ${null},
          ${trimOrUndefined(meta.meioVerificacao ?? undefined)},
          ${toOptionalDate(meta.dataInicio ?? undefined)},
          ${toOptionalDate(meta.dataFim ?? undefined)},
          ${trimOrUndefined(meta.responsavel ?? undefined)},
          ${trimOrUndefined(meta.situacao ?? undefined)},
          ${index}
        )
        RETURNING id
      `);
            const metaId = inserted[0]?.id;
            if (!metaId)
                throw new AppError("Não foi possível salvar uma meta do plano.", 500);
            await this.inserirEtapas(tx, metaId, meta.etapas ?? [], tenantId);
        }
    }
    async inserirEtapas(tx, metaId, etapas, tenantId) {
        for (let index = 0; index < etapas.length; index += 1) {
            const etapa = etapas[index];
            await tx.$executeRaw(Prisma.sql `
        INSERT INTO plano_trabalho_atividades (
          meta_id,
          tenant_id,
          descricao,
          justificativa,
          publico_alvo,
          local_execucao,
          produto_esperado,
          nome_etapa,
          acao_executar,
          descricao_detalhada,
          publico_atendido,
          quantidade,
          unidade,
          data_inicio,
          data_fim,
          valor_estimado,
          documento_comprobatorio,
          responsavel,
          situacao,
          ordem
        ) VALUES (
          ${metaId},
          ${tenantId}::uuid,
          ${etapa.nome},
          ${null},
          ${trimOrUndefined(etapa.publicoAtendido ?? undefined)},
          ${trimOrUndefined(etapa.local ?? undefined)},
          ${null},
          ${trimOrUndefined(etapa.nome)},
          ${trimOrUndefined(etapa.acaoExecutar ?? undefined)},
          ${trimOrUndefined(etapa.descricaoDetalhada ?? undefined)},
          ${trimOrUndefined(etapa.publicoAtendido ?? undefined)},
          ${etapa.quantidade ?? null},
          ${trimOrUndefined(etapa.unidade ?? undefined)},
          ${toOptionalDate(etapa.dataInicio ?? undefined)},
          ${toOptionalDate(etapa.dataFim ?? undefined)},
          ${etapa.valorEstimado ?? null},
          ${trimOrUndefined(etapa.documentoComprobatorioEsperado ?? undefined)},
          ${trimOrUndefined(etapa.responsavel ?? undefined)},
          ${trimOrUndefined(etapa.situacao ?? undefined)},
          ${index}
        )
      `);
        }
    }
    async inserirAplicacaoRecursos(tx, planoId, itens, tenantId) {
        for (let index = 0; index < itens.length; index += 1) {
            const item = itens[index];
            await tx.$executeRaw(Prisma.sql `
        INSERT INTO plano_trabalho_aplicacao_recursos (
          plano_trabalho_id,
          tenant_id,
          categoria_despesa,
          item,
          descricao,
          quantidade,
          unidade,
          valor_unitario,
          valor_total,
          fonte_recurso,
          meta_numero,
          etapa_nome,
          natureza_despesa,
          observacao,
          ordem
        ) VALUES (
          ${planoId},
          ${tenantId}::uuid,
          ${item.categoriaDespesa},
          ${item.item},
          ${trimOrUndefined(item.descricao ?? undefined)},
          ${item.quantidade ?? null},
          ${trimOrUndefined(item.unidade ?? undefined)},
          ${item.valorUnitario ?? null},
          ${item.valorTotal ?? null},
          ${trimOrUndefined(item.fonteRecurso ?? undefined)},
          ${trimOrUndefined(item.metaNumero ?? undefined)},
          ${trimOrUndefined(item.etapaNome ?? undefined)},
          ${trimOrUndefined(item.naturezaDespesa ?? undefined)},
          ${trimOrUndefined(item.observacao ?? undefined)},
          ${index}
        )
      `);
        }
    }
    async inserirDesembolso(tx, planoId, itens, tenantId) {
        for (let index = 0; index < itens.length; index += 1) {
            const item = itens[index];
            await tx.$executeRaw(Prisma.sql `
        INSERT INTO plano_trabalho_desembolso (
          plano_trabalho_id,
          tenant_id,
          mes_ano,
          valor_previsto,
          fonte_recurso,
          meta_numero,
          observacao,
          ordem
        ) VALUES (
          ${planoId},
          ${tenantId}::uuid,
          ${item.mesAno},
          ${item.valorPrevisto ?? null},
          ${trimOrUndefined(item.fonteRecurso ?? undefined)},
          ${trimOrUndefined(item.metaNumero ?? undefined)},
          ${trimOrUndefined(item.observacao ?? undefined)},
          ${index}
        )
      `);
        }
    }
    async inserirChecklistPrestacao(tx, planoId, itens, tenantId) {
        for (let index = 0; index < itens.length; index += 1) {
            const item = itens[index];
            await tx.$executeRaw(Prisma.sql `
        INSERT INTO plano_trabalho_checklist_prestacao (
          plano_trabalho_id,
          tenant_id,
          descricao,
          obrigatorio,
          concluido,
          ordem
        ) VALUES (
          ${planoId},
          ${tenantId}::uuid,
          ${item.descricao},
          ${item.obrigatorio !== false},
          ${Boolean(item.concluido)},
          ${index}
        )
      `);
        }
    }
    async registrarAuditoria(acao, planoId, dados, usuarioId) {
        try {
            await prisma.$executeRaw(Prisma.sql `
        INSERT INTO auditoria_evento (usuario_id, acao, entidade, entidade_id, dados_json, criado_em)
        VALUES (
          ${usuarioId ?? null},
          ${acao},
          'plano_trabalho',
          ${toStringId(planoId)},
          ${JSON.stringify({ planoId: toStringId(planoId), dados, data: toIsoDate(new Date()) })},
          NOW()
        )
      `);
        }
        catch (error) {
            console.warn("[planos-trabalho] falha ao registrar auditoria_evento:", error);
        }
    }
}
