import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { ensureArquivosEstrutura } from "../../arquivos/repositories/arquivos-estrutura.repository.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { toIsoDate, toOptionalDate, trimOrUndefined } from "../../../utils/string-utils.js";
import { calcularSaldoConta, gerarNumeroRecibo, lancamentoEstaBloqueadoPorOrigem, normalizarDirecaoAjuste, normalizarSituacaoConciliacao, normalizarStatusConta, normalizarStatusLancamento, normalizarTextoEnum, normalizarTipoCategoria, normalizarTipoConta, normalizarTipoLancamento, statusBaixadoPorTipo, tipoMovimentacaoPorLancamento } from "../contabilidade.workflow.js";
let estruturaPromise = null;
function tenantSql(alias, tenantId) {
    if (!tenantId)
        return Prisma.empty;
    return Prisma.sql ` AND ${Prisma.raw(alias)}.tenant_id::text = ${tenantId}`;
}
const LANCAMENTO_SELECT = Prisma.sql `
  SELECT
    l.id,
    l.data_lancamento,
    l.tipo,
    l.direcao_ajuste,
    l.natureza,
    l.conta_bancaria_id,
    l.categoria_financeira_id,
    l.centro_custo_id,
    l.setor,
    l.descricao,
    l.contraparte,
    l.documento,
    l.historico,
    l.vencimento,
    l.valor::float8 AS valor,
    l.forma_pagamento,
    l.situacao,
    l.origem,
    l.observacao,
    l.data_baixa,
    l.responsavel,
    l.projeto,
    l.compra_id,
    l.conciliado,
    l.bloqueado_origem,
    l.ativo,
    cb.nome_conta AS conta_bancaria_nome,
    cb.fonte_pagamento AS conta_bancaria_fonte_pagamento,
    cat.nome AS categoria_nome,
    cc.nome AS centro_custo_nome
  FROM lancamento_financeiro l
  LEFT JOIN conta_bancaria cb ON cb.id = l.conta_bancaria_id
  LEFT JOIN financeiro_categoria cat ON cat.id = l.categoria_financeira_id
  LEFT JOIN financeiro_centro_custo cc ON cc.id = l.centro_custo_id
`;
const MOVIMENTACAO_SELECT = Prisma.sql `
  SELECT
    m.id,
    m.tipo,
    m.descricao,
    m.contraparte,
    m.categoria,
    m.categoria_financeira_id,
    m.centro_custo_id,
    m.conta_bancaria_id,
    m.data_movimentacao,
    m.valor::float8 AS valor,
    m.origem,
    m.observacao,
    m.saldo_anterior::float8 AS saldo_anterior,
    m.saldo_atual::float8 AS saldo_atual,
    m.lancamento_financeiro_id,
    m.transferencia_id,
    c.numero AS conta_bancaria_numero,
    c.banco AS conta_bancaria_banco,
    c.nome_conta AS conta_bancaria_nome,
    cat.nome AS categoria_nome,
    cc.nome AS centro_custo_nome
  FROM movimentacao_financeira m
  LEFT JOIN conta_bancaria c ON c.id = m.conta_bancaria_id
  LEFT JOIN financeiro_categoria cat ON cat.id = m.categoria_financeira_id
  LEFT JOIN financeiro_centro_custo cc ON cc.id = m.centro_custo_id
`;
const CONTA_BANCARIA_SALDO_ATUAL_SELECT = Prisma.sql `
  (
    COALESCE(cb.saldo, 0)::float8
    + COALESCE((
      SELECT
        SUM(
          CASE
            WHEN UPPER(COALESCE(l.tipo, '')) = 'RECEITA' THEN COALESCE(l.valor, 0)
            WHEN UPPER(COALESCE(l.tipo, '')) = 'AJUSTE'
              AND UPPER(COALESCE(l.direcao_ajuste, 'DIMINUIR')) = 'AUMENTAR'
            THEN COALESCE(l.valor, 0)
            ELSE COALESCE(l.valor, 0) * -1
          END
        )::float8
      FROM lancamento_financeiro l
      WHERE l.ativo = TRUE
        AND l.conta_bancaria_id = cb.id
        AND UPPER(COALESCE(l.situacao, '')) IN (
          'PREVISTO',
          'PENDENTE',
          'VENCIDO',
          'ATRASADO',
          'AGUARDANDO_PAGAMENTO',
          'AGUARDANDO_RECEBIMENTO',
          'RENEGOCIADO'
        )
        AND NOT EXISTS (
          SELECT 1
          FROM movimentacao_financeira m
          WHERE m.ativo = TRUE
            AND m.lancamento_financeiro_id = l.id
        )
    ), 0)::float8
  ) AS saldo
`;
export async function ensureContabilidadeEstrutura() {
    if (!estruturaPromise) {
        estruturaPromise = (async () => {
            await ensureArquivosEstrutura(prisma);
            await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS financeiro_categoria (
          id BIGSERIAL PRIMARY KEY,
          codigo VARCHAR(40) NOT NULL,
          nome VARCHAR(160) NOT NULL,
          tipo VARCHAR(20) NOT NULL,
          grupo VARCHAR(120),
          subgrupo VARCHAR(120),
          categoria_pai_id BIGINT REFERENCES financeiro_categoria(id) ON DELETE SET NULL,
          aceita_lancamento_direto BOOLEAN NOT NULL DEFAULT TRUE,
          status VARCHAR(20) NOT NULL DEFAULT 'ATIVA',
          observacao TEXT,
          ativo BOOLEAN NOT NULL DEFAULT TRUE,
          criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
          atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);
            await prisma.$executeRawUnsafe(`
        ALTER TABLE financeiro_categoria
          ADD COLUMN IF NOT EXISTS tenant_id UUID,
          ADD COLUMN IF NOT EXISTS grupo VARCHAR(120),
          ADD COLUMN IF NOT EXISTS subgrupo VARCHAR(120),
          ADD COLUMN IF NOT EXISTS categoria_pai_id BIGINT REFERENCES financeiro_categoria(id) ON DELETE SET NULL,
          ADD COLUMN IF NOT EXISTS aceita_lancamento_direto BOOLEAN NOT NULL DEFAULT TRUE,
          ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'ATIVA',
          ADD COLUMN IF NOT EXISTS observacao TEXT,
          ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT TRUE,
          ADD COLUMN IF NOT EXISTS criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
          ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
      `);
            await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS financeiro_centro_custo (
          id BIGSERIAL PRIMARY KEY,
          codigo VARCHAR(40) NOT NULL,
          nome VARCHAR(160) NOT NULL,
          setor_responsavel VARCHAR(160) NOT NULL,
          descricao TEXT,
          status VARCHAR(20) NOT NULL DEFAULT 'ATIVA',
          ativo BOOLEAN NOT NULL DEFAULT TRUE,
          criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
          atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);
            await prisma.$executeRawUnsafe(`
        ALTER TABLE financeiro_centro_custo
          ADD COLUMN IF NOT EXISTS tenant_id UUID,
          ADD COLUMN IF NOT EXISTS codigo VARCHAR(40),
          ADD COLUMN IF NOT EXISTS nome VARCHAR(160),
          ADD COLUMN IF NOT EXISTS setor_responsavel VARCHAR(160),
          ADD COLUMN IF NOT EXISTS descricao TEXT,
          ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'ATIVA',
          ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT TRUE,
          ADD COLUMN IF NOT EXISTS criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
          ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
      `);
            await prisma.$executeRawUnsafe(`
        UPDATE financeiro_centro_custo
        SET
          codigo = COALESCE(NULLIF(codigo, ''), CONCAT('CC-', id)),
          nome = COALESCE(NULLIF(nome, ''), CONCAT('Centro de custo ', id)),
          setor_responsavel = COALESCE(NULLIF(setor_responsavel, ''), NULLIF(nome, ''), 'Não informado'),
          status = COALESCE(NULLIF(status, ''), 'ATIVA'),
          ativo = COALESCE(ativo, TRUE),
          criado_em = COALESCE(criado_em, NOW()),
          atualizado_em = COALESCE(atualizado_em, NOW())
      `);
            await prisma.$executeRawUnsafe(`
        ALTER TABLE financeiro_centro_custo
          ALTER COLUMN codigo SET NOT NULL,
          ALTER COLUMN nome SET NOT NULL,
          ALTER COLUMN setor_responsavel SET NOT NULL
      `);
            await prisma.$executeRawUnsafe(`
        ALTER TABLE conta_bancaria
          ADD COLUMN IF NOT EXISTS tenant_id UUID,
          ADD COLUMN IF NOT EXISTS digito VARCHAR(10),
          ADD COLUMN IF NOT EXISTS nome_conta VARCHAR(160),
          ADD COLUMN IF NOT EXISTS titular VARCHAR(160),
          ADD COLUMN IF NOT EXISTS fonte_pagamento VARCHAR(160),
          ADD COLUMN IF NOT EXISTS saldo_inicial NUMERIC(14,2) NOT NULL DEFAULT 0,
          ADD COLUMN IF NOT EXISTS data_saldo_inicial DATE,
          ADD COLUMN IF NOT EXISTS limite_minimo_alerta NUMERIC(14,2) NOT NULL DEFAULT 0,
          ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'ATIVA',
          ADD COLUMN IF NOT EXISTS permite_movimentacao BOOLEAN NOT NULL DEFAULT TRUE,
          ADD COLUMN IF NOT EXISTS observacao TEXT,
          ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT TRUE,
          ADD COLUMN IF NOT EXISTS criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
          ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
      `);
            await prisma.$executeRawUnsafe(`
        UPDATE conta_bancaria
        SET
          nome_conta = COALESCE(NULLIF(nome_conta, ''), CONCAT(COALESCE(banco, ''), ' - ', COALESCE(numero, ''))),
          saldo_inicial = COALESCE(saldo_inicial, saldo, 0),
          data_saldo_inicial = COALESCE(data_saldo_inicial, data_atualizacao, CURRENT_DATE),
          status = COALESCE(NULLIF(status, ''), 'ATIVA'),
          atualizado_em = COALESCE(atualizado_em, NOW())
      `);
            await prisma.$executeRawUnsafe(`
        ALTER TABLE lancamento_financeiro
          ADD COLUMN IF NOT EXISTS tenant_id UUID,
          ADD COLUMN IF NOT EXISTS data_lancamento DATE,
          ADD COLUMN IF NOT EXISTS natureza VARCHAR(80),
          ADD COLUMN IF NOT EXISTS conta_bancaria_id BIGINT REFERENCES conta_bancaria(id) ON DELETE SET NULL,
          ADD COLUMN IF NOT EXISTS categoria_financeira_id BIGINT REFERENCES financeiro_categoria(id) ON DELETE SET NULL,
          ADD COLUMN IF NOT EXISTS centro_custo_id BIGINT REFERENCES financeiro_centro_custo(id) ON DELETE SET NULL,
          ADD COLUMN IF NOT EXISTS setor VARCHAR(160),
          ADD COLUMN IF NOT EXISTS documento VARCHAR(120),
          ADD COLUMN IF NOT EXISTS historico TEXT,
          ADD COLUMN IF NOT EXISTS direcao_ajuste VARCHAR(20),
          ADD COLUMN IF NOT EXISTS forma_pagamento VARCHAR(80),
          ADD COLUMN IF NOT EXISTS origem VARCHAR(80) NOT NULL DEFAULT 'MANUAL',
          ADD COLUMN IF NOT EXISTS observacao TEXT,
          ADD COLUMN IF NOT EXISTS data_baixa DATE,
          ADD COLUMN IF NOT EXISTS responsavel VARCHAR(160),
          ADD COLUMN IF NOT EXISTS projeto VARCHAR(120),
          ADD COLUMN IF NOT EXISTS conciliado BOOLEAN NOT NULL DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS bloqueado_origem BOOLEAN NOT NULL DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT TRUE,
          ADD COLUMN IF NOT EXISTS cancelado_em TIMESTAMP
      `);
            await prisma.$executeRawUnsafe(`
        UPDATE lancamento_financeiro
        SET
          data_lancamento = COALESCE(data_lancamento, vencimento, CURRENT_DATE),
          natureza = COALESCE(NULLIF(natureza, ''), tipo),
          historico = COALESCE(NULLIF(historico, ''), descricao),
          direcao_ajuste = CASE
            WHEN UPPER(COALESCE(tipo, '')) = 'AJUSTE' THEN COALESCE(NULLIF(direcao_ajuste, ''), 'DIMINUIR')
            ELSE NULLIF(direcao_ajuste, '')
          END,
          origem = COALESCE(NULLIF(origem, ''), CASE WHEN compra_id IS NULL THEN 'MANUAL' ELSE 'COMPRA' END),
          bloqueado_origem = CASE WHEN compra_id IS NULL THEN bloqueado_origem ELSE TRUE END
      `);
            await prisma.$executeRawUnsafe(`
        ALTER TABLE movimentacao_financeira
          ADD COLUMN IF NOT EXISTS tenant_id UUID,
          ADD COLUMN IF NOT EXISTS categoria_financeira_id BIGINT REFERENCES financeiro_categoria(id) ON DELETE SET NULL,
          ADD COLUMN IF NOT EXISTS centro_custo_id BIGINT REFERENCES financeiro_centro_custo(id) ON DELETE SET NULL,
          ADD COLUMN IF NOT EXISTS origem VARCHAR(80),
          ADD COLUMN IF NOT EXISTS observacao TEXT,
          ADD COLUMN IF NOT EXISTS saldo_anterior NUMERIC(14,2),
          ADD COLUMN IF NOT EXISTS saldo_atual NUMERIC(14,2),
          ADD COLUMN IF NOT EXISTS lancamento_financeiro_id BIGINT REFERENCES lancamento_financeiro(id) ON DELETE SET NULL,
          ADD COLUMN IF NOT EXISTS transferencia_id BIGINT,
          ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT TRUE,
          ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
      `);
            await prisma.$executeRawUnsafe(`
        UPDATE movimentacao_financeira
        SET origem = COALESCE(NULLIF(origem, ''), 'MANUAL'),
            atualizado_em = COALESCE(atualizado_em, NOW())
      `);
            await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS financeiro_transferencia (
          id BIGSERIAL PRIMARY KEY,
          tenant_id UUID,
          conta_origem_id BIGINT NOT NULL REFERENCES conta_bancaria(id) ON DELETE RESTRICT,
          conta_destino_id BIGINT NOT NULL REFERENCES conta_bancaria(id) ON DELETE RESTRICT,
          data_transferencia DATE NOT NULL,
          valor NUMERIC(14,2) NOT NULL,
          descricao VARCHAR(200) NOT NULL,
          responsavel VARCHAR(160),
          observacao TEXT,
          status VARCHAR(20) NOT NULL DEFAULT 'CONCLUIDA',
          movimentacao_saida_id BIGINT REFERENCES movimentacao_financeira(id) ON DELETE SET NULL,
          movimentacao_entrada_id BIGINT REFERENCES movimentacao_financeira(id) ON DELETE SET NULL,
          ativo BOOLEAN NOT NULL DEFAULT TRUE,
          criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
          atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);
            await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS financeiro_conciliacao (
          id BIGSERIAL PRIMARY KEY,
          tenant_id UUID,
          conta_bancaria_id BIGINT NOT NULL REFERENCES conta_bancaria(id) ON DELETE RESTRICT,
          data_movimento DATE NOT NULL,
          descricao_extrato VARCHAR(240) NOT NULL,
          valor_extrato NUMERIC(14,2) NOT NULL,
          lancamento_financeiro_id BIGINT REFERENCES lancamento_financeiro(id) ON DELETE SET NULL,
          movimentacao_financeira_id BIGINT REFERENCES movimentacao_financeira(id) ON DELETE SET NULL,
          situacao VARCHAR(20) NOT NULL DEFAULT 'PENDENTE',
          diferenca NUMERIC(14,2) NOT NULL DEFAULT 0,
          observacao TEXT,
          ativo BOOLEAN NOT NULL DEFAULT TRUE,
          criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
          atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);
            await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS financeiro_historico (
          id BIGSERIAL PRIMARY KEY,
          tenant_id UUID,
          aba VARCHAR(80) NOT NULL,
          acao VARCHAR(160) NOT NULL,
          tipo_registro VARCHAR(80) NOT NULL,
          registro_id VARCHAR(80),
          valor NUMERIC(14,2),
          conta VARCHAR(160),
          status_anterior VARCHAR(60),
          status_novo VARCHAR(60),
          observacao TEXT,
          origem VARCHAR(80),
          usuario_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
          usuario_nome VARCHAR(160),
          perfil VARCHAR(255),
          ip VARCHAR(120),
          maquina VARCHAR(255),
          criado_em TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);
            await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS financeiro_fechamento_mensal (
          id BIGSERIAL PRIMARY KEY,
          tenant_id UUID,
          competencia VARCHAR(7) NOT NULL,
          saldo_total NUMERIC(14,2) NOT NULL DEFAULT 0,
          saldo_bancos NUMERIC(14,2) NOT NULL DEFAULT 0,
          saldo_caixa NUMERIC(14,2) NOT NULL DEFAULT 0,
          contas_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
          observacao TEXT,
          usuario_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
          usuario_nome VARCHAR(160),
          criado_em TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);
            await prisma.$executeRawUnsafe(`
        ALTER TABLE financeiro_historico
          ADD COLUMN IF NOT EXISTS tenant_id UUID,
          ADD COLUMN IF NOT EXISTS aba VARCHAR(80),
          ADD COLUMN IF NOT EXISTS acao VARCHAR(160),
          ADD COLUMN IF NOT EXISTS tipo_registro VARCHAR(80),
          ADD COLUMN IF NOT EXISTS registro_id VARCHAR(80),
          ADD COLUMN IF NOT EXISTS valor NUMERIC(14,2),
          ADD COLUMN IF NOT EXISTS conta VARCHAR(160),
          ADD COLUMN IF NOT EXISTS status_anterior VARCHAR(60),
          ADD COLUMN IF NOT EXISTS status_novo VARCHAR(60),
          ADD COLUMN IF NOT EXISTS observacao TEXT,
          ADD COLUMN IF NOT EXISTS origem VARCHAR(80),
          ADD COLUMN IF NOT EXISTS usuario_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
          ADD COLUMN IF NOT EXISTS usuario_nome VARCHAR(160),
          ADD COLUMN IF NOT EXISTS perfil VARCHAR(255),
          ADD COLUMN IF NOT EXISTS ip VARCHAR(120),
          ADD COLUMN IF NOT EXISTS maquina VARCHAR(255),
          ADD COLUMN IF NOT EXISTS criado_em TIMESTAMP NOT NULL DEFAULT NOW()
      `);
            await prisma.$executeRawUnsafe(`
        ALTER TABLE financeiro_historico
          ALTER COLUMN perfil TYPE TEXT,
          ALTER COLUMN maquina TYPE TEXT
      `);
            await prisma.$executeRawUnsafe(`
        UPDATE financeiro_historico
        SET
          aba = COALESCE(NULLIF(aba, ''), 'Contabilidade'),
          acao = COALESCE(NULLIF(acao, ''), 'Registro ajustado'),
          tipo_registro = COALESCE(NULLIF(tipo_registro, ''), 'LEGADO'),
          criado_em = COALESCE(criado_em, NOW())
      `);
            await prisma.$executeRawUnsafe(`
        ALTER TABLE financeiro_historico
          ALTER COLUMN aba SET NOT NULL,
          ALTER COLUMN acao SET NOT NULL,
          ALTER COLUMN tipo_registro SET NOT NULL
      `);
            const comandosIndices = [
                `CREATE INDEX IF NOT EXISTS conta_bancaria_status_idx ON conta_bancaria(status, ativo)`,
                `CREATE INDEX IF NOT EXISTS financeiro_categoria_tipo_idx ON financeiro_categoria(tipo, status, ativo)`,
                `CREATE INDEX IF NOT EXISTS financeiro_centro_custo_status_idx ON financeiro_centro_custo(status, ativo)`,
                `CREATE INDEX IF NOT EXISTS lancamento_financeiro_status_idx ON lancamento_financeiro(situacao, tipo, ativo)`,
                `CREATE INDEX IF NOT EXISTS lancamento_financeiro_compra_idx ON lancamento_financeiro(compra_id)`,
                `CREATE INDEX IF NOT EXISTS movimentacao_financeira_conta_data_idx ON movimentacao_financeira(conta_bancaria_id, data_movimentacao)`,
                `CREATE INDEX IF NOT EXISTS financeiro_transferencia_status_idx ON financeiro_transferencia(status, data_transferencia)`,
                `CREATE INDEX IF NOT EXISTS financeiro_conciliacao_situacao_idx ON financeiro_conciliacao(situacao, conta_bancaria_id)`,
                `CREATE INDEX IF NOT EXISTS financeiro_historico_aba_idx ON financeiro_historico(aba, criado_em DESC)`,
                `CREATE INDEX IF NOT EXISTS financeiro_fechamento_mensal_competencia_idx ON financeiro_fechamento_mensal(competencia, criado_em DESC)`,
            ];
            for (const comandoIndice of comandosIndices) {
                await prisma.$executeRawUnsafe(comandoIndice);
            }
            await prisma.$executeRawUnsafe(`
        ALTER TABLE financeiro_transferencia
          ADD COLUMN IF NOT EXISTS tenant_id UUID
      `);
            await prisma.$executeRawUnsafe(`
        ALTER TABLE financeiro_conciliacao
          ADD COLUMN IF NOT EXISTS tenant_id UUID
      `);
            await prisma.$executeRawUnsafe(`
        ALTER TABLE IF EXISTS emenda_impositiva
          ADD COLUMN IF NOT EXISTS tenant_id UUID
      `);
            const comandosTenant = [
                `CREATE INDEX IF NOT EXISTS conta_bancaria_tenant_idx ON conta_bancaria(tenant_id, ativo)`,
                `CREATE INDEX IF NOT EXISTS financeiro_categoria_tenant_idx ON financeiro_categoria(tenant_id, ativo)`,
                `CREATE INDEX IF NOT EXISTS financeiro_centro_custo_tenant_idx ON financeiro_centro_custo(tenant_id, ativo)`,
                `CREATE INDEX IF NOT EXISTS lancamento_financeiro_tenant_idx ON lancamento_financeiro(tenant_id, ativo)`,
                `CREATE INDEX IF NOT EXISTS movimentacao_financeira_tenant_idx ON movimentacao_financeira(tenant_id, ativo)`,
                `CREATE INDEX IF NOT EXISTS financeiro_transferencia_tenant_idx ON financeiro_transferencia(tenant_id, ativo)`,
                `CREATE INDEX IF NOT EXISTS financeiro_conciliacao_tenant_idx ON financeiro_conciliacao(tenant_id, ativo)`,
                `CREATE INDEX IF NOT EXISTS financeiro_historico_tenant_idx ON financeiro_historico(tenant_id, criado_em DESC)`,
                `CREATE INDEX IF NOT EXISTS financeiro_fechamento_mensal_tenant_idx ON financeiro_fechamento_mensal(tenant_id, competencia DESC)`
            ];
            for (const comandoTenant of comandosTenant) {
                await prisma.$executeRawUnsafe(comandoTenant);
            }
            await prisma.$executeRawUnsafe(`
        UPDATE conta_bancaria
        SET tenant_id = origem.tenant_id
        FROM (
          SELECT tenant_id
          FROM unidade_assistencial
          WHERE tenant_id IS NOT NULL
          ORDER BY unidade_principal DESC, atualizado_em DESC, criado_em ASC
          LIMIT 1
        ) origem
        WHERE conta_bancaria.tenant_id IS NULL
      `);
            await prisma.$executeRawUnsafe(`
        UPDATE financeiro_categoria
        SET tenant_id = origem.tenant_id
        FROM (
          SELECT tenant_id
          FROM unidade_assistencial
          WHERE tenant_id IS NOT NULL
          ORDER BY unidade_principal DESC, atualizado_em DESC, criado_em ASC
          LIMIT 1
        ) origem
        WHERE financeiro_categoria.tenant_id IS NULL
      `);
            await prisma.$executeRawUnsafe(`
        UPDATE financeiro_centro_custo
        SET tenant_id = origem.tenant_id
        FROM (
          SELECT tenant_id
          FROM unidade_assistencial
          WHERE tenant_id IS NOT NULL
          ORDER BY unidade_principal DESC, atualizado_em DESC, criado_em ASC
          LIMIT 1
        ) origem
        WHERE financeiro_centro_custo.tenant_id IS NULL
      `);
            await prisma.$executeRawUnsafe(`
        UPDATE lancamento_financeiro l
        SET tenant_id = COALESCE(
          (
            SELECT cb.tenant_id
            FROM conta_bancaria cb
            WHERE cb.id IS NOT DISTINCT FROM l.conta_bancaria_id
            LIMIT 1
          ),
          origem.tenant_id
        )
        FROM (
          SELECT tenant_id
          FROM unidade_assistencial
          WHERE tenant_id IS NOT NULL
          ORDER BY unidade_principal DESC, atualizado_em DESC, criado_em ASC
          LIMIT 1
        ) origem
        WHERE l.tenant_id IS NULL
      `);
            await prisma.$executeRawUnsafe(`
        UPDATE movimentacao_financeira m
        SET tenant_id = COALESCE(
          (
            SELECT cb.tenant_id
            FROM conta_bancaria cb
            WHERE cb.id IS NOT DISTINCT FROM m.conta_bancaria_id
            LIMIT 1
          ),
          (
            SELECT l.tenant_id
            FROM lancamento_financeiro l
            WHERE l.id = m.lancamento_financeiro_id
            LIMIT 1
          )
        )
        WHERE m.tenant_id IS NULL
      `);
            await prisma.$executeRawUnsafe(`
        UPDATE financeiro_transferencia t
        SET tenant_id = COALESCE(
          (
            SELECT co.tenant_id
            FROM conta_bancaria co
            WHERE co.id = t.conta_origem_id
            LIMIT 1
          ),
          (
            SELECT cd.tenant_id
            FROM conta_bancaria cd
            WHERE cd.id = t.conta_destino_id
            LIMIT 1
          )
        )
        WHERE t.tenant_id IS NULL
      `);
            await prisma.$executeRawUnsafe(`
        UPDATE financeiro_conciliacao c
        SET tenant_id = COALESCE(
          (
            SELECT cb.tenant_id
            FROM conta_bancaria cb
            WHERE cb.id = c.conta_bancaria_id
            LIMIT 1
          ),
          (
            SELECT l.tenant_id
            FROM lancamento_financeiro l
            WHERE l.id = c.lancamento_financeiro_id
            LIMIT 1
          ),
          (
            SELECT m.tenant_id
            FROM movimentacao_financeira m
            WHERE m.id = c.movimentacao_financeira_id
            LIMIT 1
          )
        )
        WHERE c.tenant_id IS NULL
      `);
            await prisma.$executeRawUnsafe(`
        UPDATE financeiro_historico
        SET tenant_id = origem.tenant_id
        FROM (
          SELECT tenant_id
          FROM unidade_assistencial
          WHERE tenant_id IS NOT NULL
          ORDER BY unidade_principal DESC, atualizado_em DESC, criado_em ASC
          LIMIT 1
        ) origem
        WHERE financeiro_historico.tenant_id IS NULL
      `);
            await prisma.$executeRawUnsafe(`
        DO $$
        BEGIN
          IF to_regclass('public.emenda_impositiva') IS NOT NULL THEN
            EXECUTE 'CREATE INDEX IF NOT EXISTS emenda_impositiva_tenant_idx ON emenda_impositiva(tenant_id, atualizado_em DESC)';
            EXECUTE '
              UPDATE emenda_impositiva
              SET tenant_id = origem.tenant_id
              FROM (
                SELECT tenant_id
                FROM unidade_assistencial
                WHERE tenant_id IS NOT NULL
                ORDER BY unidade_principal DESC, atualizado_em DESC, criado_em ASC
                LIMIT 1
              ) origem
              WHERE emenda_impositiva.tenant_id IS NULL
            ';
          END IF;
        END
        $$;
      `);
            await prisma.$executeRawUnsafe(`
        INSERT INTO financeiro_categoria (codigo, nome, tipo, grupo, subgrupo, status)
        SELECT 'REC-DOA', 'Doações', 'RECEITA', 'Receitas', 'Doações', 'ATIVA'
        WHERE NOT EXISTS (SELECT 1 FROM financeiro_categoria WHERE codigo = 'REC-DOA')
      `);
            await prisma.$executeRawUnsafe(`
        INSERT INTO financeiro_categoria (codigo, nome, tipo, grupo, subgrupo, status)
        SELECT 'REC-CON', 'Convênios', 'RECEITA', 'Receitas', 'Convênios', 'ATIVA'
        WHERE NOT EXISTS (SELECT 1 FROM financeiro_categoria WHERE codigo = 'REC-CON')
      `);
            await prisma.$executeRawUnsafe(`
        INSERT INTO financeiro_categoria (codigo, nome, tipo, grupo, subgrupo, status)
        SELECT 'DES-FOR', 'Fornecedores', 'DESPESA', 'Despesas', 'Fornecedores', 'ATIVA'
        WHERE NOT EXISTS (SELECT 1 FROM financeiro_categoria WHERE codigo = 'DES-FOR')
      `);
            await prisma.$executeRawUnsafe(`
        INSERT INTO financeiro_categoria (codigo, nome, tipo, grupo, subgrupo, status)
        SELECT 'DES-SER', 'Serviços', 'DESPESA', 'Despesas', 'Serviços', 'ATIVA'
        WHERE NOT EXISTS (SELECT 1 FROM financeiro_categoria WHERE codigo = 'DES-SER')
      `);
            await prisma.$executeRawUnsafe(`
        INSERT INTO financeiro_categoria (codigo, nome, tipo, grupo, subgrupo, status)
        SELECT 'DES-MAT', 'Material de consumo', 'DESPESA', 'Despesas', 'Material de consumo', 'ATIVA'
        WHERE NOT EXISTS (SELECT 1 FROM financeiro_categoria WHERE codigo = 'DES-MAT')
      `);
        })();
    }
    return estruturaPromise;
}
export class ContabilidadeRepository {
    async listarContasBancarias(ator) {
        await ensureContabilidadeEstrutura();
        const tenantId = ator?.tenantId;
        return prisma.$queryRaw(Prisma.sql `
      SELECT
        cb.id,
        cb.banco,
        cb.agencia,
        cb.numero,
        cb.digito,
        cb.nome_conta,
        cb.tipo,
        cb.titular,
        cb.projeto_vinculado,
        cb.fonte_pagamento,
        cb.pix_vinculado,
        cb.tipo_chave_pix,
        cb.chave_pix,
        cb.recebimento_local,
        ${CONTA_BANCARIA_SALDO_ATUAL_SELECT},
        cb.saldo_inicial::float8 AS saldo_inicial,
        cb.data_saldo_inicial,
        cb.limite_minimo_alerta::float8 AS limite_minimo_alerta,
        cb.status,
        cb.permite_movimentacao,
        cb.observacao,
        cb.data_atualizacao,
        cb.ativo
      FROM conta_bancaria cb
      WHERE cb.ativo = TRUE
      ${tenantSql("cb", tenantId)}
      ORDER BY cb.nome_conta ASC, cb.banco ASC, cb.numero ASC
    `);
    }
    async buscarContaBancariaPorId(id, tx = prisma, tenantId) {
        await ensureContabilidadeEstrutura();
        const rows = await tx.$queryRaw(Prisma.sql `
      SELECT
        cb.id,
        cb.banco,
        cb.agencia,
        cb.numero,
        cb.digito,
        cb.nome_conta,
        cb.tipo,
        cb.titular,
        cb.projeto_vinculado,
        cb.fonte_pagamento,
        cb.pix_vinculado,
        cb.tipo_chave_pix,
        cb.chave_pix,
        cb.recebimento_local,
        ${CONTA_BANCARIA_SALDO_ATUAL_SELECT},
        cb.saldo_inicial::float8 AS saldo_inicial,
        cb.data_saldo_inicial,
        cb.limite_minimo_alerta::float8 AS limite_minimo_alerta,
        cb.status,
        cb.permite_movimentacao,
        cb.observacao,
        cb.data_atualizacao,
        cb.ativo
      FROM conta_bancaria cb
      WHERE cb.id = ${id}
      LIMIT 1
    `);
        return rows[0] ?? null;
    }
    async buscarContaBancariaPorIdComSaldoReal(id, tx = prisma, tenantId) {
        await ensureContabilidadeEstrutura();
        const rows = await tx.$queryRaw(Prisma.sql `
      SELECT
        cb.id,
        cb.banco,
        cb.agencia,
        cb.numero,
        cb.digito,
        cb.nome_conta,
        cb.tipo,
        cb.titular,
        cb.projeto_vinculado,
        cb.fonte_pagamento,
        cb.pix_vinculado,
        cb.tipo_chave_pix,
        cb.chave_pix,
        cb.recebimento_local,
        COALESCE(cb.saldo, 0)::float8 AS saldo,
        cb.saldo_inicial::float8 AS saldo_inicial,
        cb.data_saldo_inicial,
        cb.limite_minimo_alerta::float8 AS limite_minimo_alerta,
        cb.status,
        cb.permite_movimentacao,
        cb.observacao,
        cb.data_atualizacao,
        cb.ativo
      FROM conta_bancaria cb
      WHERE cb.id = ${id}
      ${tenantSql("cb", tenantId)}
      LIMIT 1
    `);
        return rows[0] ?? null;
    }
    async buscarContaBancariaPorIdOuFalhar(id, tx = prisma, tenantId) {
        const conta = await this.buscarContaBancariaPorId(id, tx, tenantId);
        if (!conta || !conta.ativo) {
            throw new AppError("Conta bancária não encontrada.", 404);
        }
        return conta;
    }
    async buscarContaBancariaPorIdComSaldoRealOuFalhar(id, tx = prisma, tenantId) {
        const conta = await this.buscarContaBancariaPorIdComSaldoReal(id, tx, tenantId);
        if (!conta || !conta.ativo) {
            throw new AppError("Conta bancÃ¡ria nÃ£o encontrada.", 404);
        }
        return conta;
    }
    async criarContaBancaria(input, ator) {
        await ensureContabilidadeEstrutura();
        return prisma.$transaction(async (tx) => {
            const tenantId = ator?.tenantId;
            const status = normalizarStatusConta(input.status);
            const tipo = normalizarTipoConta(input.tipo);
            const rows = await tx.$queryRaw(Prisma.sql `
        INSERT INTO conta_bancaria (
          banco,
          agencia,
          numero,
          digito,
          nome_conta,
          tipo,
          titular,
          projeto_vinculado,
          fonte_pagamento,
          pix_vinculado,
          tipo_chave_pix,
          chave_pix,
          recebimento_local,
          saldo,
          saldo_inicial,
          data_saldo_inicial,
          limite_minimo_alerta,
          status,
          permite_movimentacao,
          observacao,
          data_atualizacao,
          ativo,
          tenant_id,
          criado_em,
          atualizado_em
        ) VALUES (
          ${input.banco},
          ${trimOrUndefined(input.agencia ?? undefined)},
          ${input.numero},
          ${trimOrUndefined(input.digito ?? undefined)},
          ${input.nomeConta},
          ${tipo},
          ${trimOrUndefined(input.titular ?? undefined)},
          ${trimOrUndefined(input.projetoVinculado ?? undefined)},
          ${trimOrUndefined(input.fontePagamento ?? undefined)},
          ${!!input.pixVinculado},
          ${trimOrUndefined(input.tipoChavePix ?? undefined)},
          ${trimOrUndefined(input.chavePix ?? undefined)},
          ${!!input.recebimentoLocal},
          ${input.saldoInicial},
          ${input.saldoInicial},
          ${toOptionalDate(input.dataSaldoInicial)},
          ${Number(input.limiteMinimoAlerta ?? 0)},
          ${status},
          ${input.permiteMovimentacao !== false},
          ${trimOrUndefined(input.observacao ?? undefined)},
          ${toOptionalDate(input.dataSaldoInicial)},
          TRUE,
          ${tenantId ? Prisma.sql `CAST(${tenantId} AS UUID)` : Prisma.sql `NULL`},
          NOW(),
          NOW()
        )
        RETURNING id
      `);
            const id = rows[0]?.id;
            if (!id)
                throw new AppError("Não foi possível criar a conta bancária.", 500);
            const conta = await this.buscarContaBancariaPorIdOuFalhar(id, tx, tenantId);
            await this.registrarHistorico(tx, {
                aba: "Contas bancárias e caixa",
                acao: "Conta criada",
                tipoRegistro: "CONTA_BANCARIA",
                registroId: String(id),
                valor: conta.saldo,
                conta: conta.nome_conta,
                statusAnterior: null,
                statusNovo: conta.status,
                observacao: "Nova conta cadastrada no financeiro.",
                origem: "MANUAL",
                ator
            });
            return conta;
        });
    }
    async atualizarContaBancaria(id, input, ator) {
        await ensureContabilidadeEstrutura();
        return prisma.$transaction(async (tx) => {
            const tenantId = ator?.tenantId;
            const atual = await this.buscarContaBancariaPorIdOuFalhar(id, tx, tenantId);
            const status = normalizarStatusConta(input.status);
            const tipo = normalizarTipoConta(input.tipo);
            await tx.$executeRaw(Prisma.sql `
        UPDATE conta_bancaria
        SET
          banco = ${input.banco},
          agencia = ${trimOrUndefined(input.agencia ?? undefined)},
          numero = ${input.numero},
          digito = ${trimOrUndefined(input.digito ?? undefined)},
          nome_conta = ${input.nomeConta},
          tipo = ${tipo},
          titular = ${trimOrUndefined(input.titular ?? undefined)},
          projeto_vinculado = ${trimOrUndefined(input.projetoVinculado ?? undefined)},
          fonte_pagamento = ${trimOrUndefined(input.fontePagamento ?? undefined)},
          pix_vinculado = ${!!input.pixVinculado},
          tipo_chave_pix = ${trimOrUndefined(input.tipoChavePix ?? undefined)},
          chave_pix = ${trimOrUndefined(input.chavePix ?? undefined)},
          recebimento_local = ${!!input.recebimentoLocal},
          saldo_inicial = ${input.saldoInicial},
          data_saldo_inicial = ${toOptionalDate(input.dataSaldoInicial)},
          limite_minimo_alerta = ${Number(input.limiteMinimoAlerta ?? 0)},
          status = ${status},
          permite_movimentacao = ${input.permiteMovimentacao !== false},
          observacao = ${trimOrUndefined(input.observacao ?? undefined)},
          data_atualizacao = NOW(),
          atualizado_em = NOW()
        WHERE id = ${id}
        ${tenantSql("conta_bancaria", tenantId)}
      `);
            const conta = await this.buscarContaBancariaPorIdOuFalhar(id, tx, tenantId);
            await this.registrarHistorico(tx, {
                aba: "Contas bancárias e caixa",
                acao: "Conta atualizada",
                tipoRegistro: "CONTA_BANCARIA",
                registroId: String(id),
                valor: conta.saldo,
                conta: conta.nome_conta,
                statusAnterior: atual.status,
                statusNovo: conta.status,
                observacao: "Cadastro da conta atualizado.",
                origem: "MANUAL",
                ator
            });
            return conta;
        });
    }
    async removerContaBancaria(id, ator) {
        await ensureContabilidadeEstrutura();
        await prisma.$transaction(async (tx) => {
            const tenantId = ator?.tenantId;
            const atual = await this.buscarContaBancariaPorIdOuFalhar(id, tx, tenantId);
            const vinculacoes = await tx.$queryRaw(Prisma.sql `
        SELECT COUNT(*)::BIGINT AS total
        FROM (
          SELECT id FROM lancamento_financeiro WHERE conta_bancaria_id = ${id} AND ativo = TRUE AND tenant_id::text = ${tenantId ?? ""}
          UNION ALL
          SELECT id FROM movimentacao_financeira WHERE conta_bancaria_id = ${id} AND ativo = TRUE AND tenant_id::text = ${tenantId ?? ""}
        ) base
      `);
            if (Number(vinculacoes[0]?.total ?? 0) > 0) {
                throw new AppError("A conta possui movimentações ou lançamentos vinculados e não pode ser removida.", 409);
            }
            await tx.$executeRaw(Prisma.sql `
        UPDATE conta_bancaria
        SET ativo = FALSE, status = 'INATIVA', atualizado_em = NOW()
        WHERE id = ${id}
        ${tenantSql("conta_bancaria", tenantId)}
      `);
            await this.registrarHistorico(tx, {
                aba: "Contas bancárias e caixa",
                acao: "Conta inativada",
                tipoRegistro: "CONTA_BANCARIA",
                registroId: String(id),
                valor: atual.saldo,
                conta: atual.nome_conta,
                statusAnterior: atual.status,
                statusNovo: "INATIVA",
                observacao: "Conta bancária inativada.",
                origem: "MANUAL",
                ator
            });
        });
    }
    async listarCategorias(ator) {
        await ensureContabilidadeEstrutura();
        const tenantId = ator?.tenantId;
        return prisma.$queryRaw(Prisma.sql `
      SELECT
        id,
        codigo,
        nome,
        tipo,
        grupo,
        subgrupo,
        categoria_pai_id,
        aceita_lancamento_direto,
        status,
        observacao,
        ativo
      FROM financeiro_categoria
      WHERE ativo = TRUE
      ${tenantSql("financeiro_categoria", tenantId)}
      ORDER BY tipo ASC, grupo ASC NULLS LAST, nome ASC
    `);
    }
    async buscarCategoriaPorIdOuFalhar(id, tx = prisma, tenantId) {
        await ensureContabilidadeEstrutura();
        const rows = await tx.$queryRaw(Prisma.sql `
      SELECT
        id,
        codigo,
        nome,
        tipo,
        grupo,
        subgrupo,
        categoria_pai_id,
        aceita_lancamento_direto,
        status,
        observacao,
        ativo
      FROM financeiro_categoria
      WHERE id = ${id}
      ${tenantSql("financeiro_categoria", tenantId)}
      LIMIT 1
    `);
        const categoria = rows[0];
        if (!categoria || !categoria.ativo) {
            throw new AppError("Categoria financeira não encontrada.", 404);
        }
        return categoria;
    }
    async criarCategoria(input, ator) {
        await ensureContabilidadeEstrutura();
        return prisma.$transaction(async (tx) => {
            const tenantId = ator?.tenantId;
            if (input.categoriaPaiId) {
                await this.buscarCategoriaPorIdOuFalhar(BigInt(input.categoriaPaiId), tx, tenantId);
            }
            const rows = await tx.$queryRaw(Prisma.sql `
        INSERT INTO financeiro_categoria (
          codigo,
          nome,
          tipo,
          grupo,
          subgrupo,
          categoria_pai_id,
          aceita_lancamento_direto,
          status,
          observacao,
          ativo,
          tenant_id,
          criado_em,
          atualizado_em
        ) VALUES (
          ${input.codigo},
          ${input.nome},
          ${normalizarTipoCategoria(input.tipo)},
          ${trimOrUndefined(input.grupo ?? undefined)},
          ${trimOrUndefined(input.subgrupo ?? undefined)},
          ${input.categoriaPaiId ? BigInt(input.categoriaPaiId) : null},
          ${input.aceitaLancamentoDireto !== false},
          ${normalizarStatusConta(input.status)},
          ${trimOrUndefined(input.observacao ?? undefined)},
          TRUE,
          ${tenantId ? Prisma.sql `CAST(${tenantId} AS UUID)` : Prisma.sql `NULL`},
          NOW(),
          NOW()
        )
        RETURNING id
      `);
            const id = rows[0]?.id;
            if (!id)
                throw new AppError("Não foi possível criar a categoria financeira.", 500);
            const categoria = await this.buscarCategoriaPorIdOuFalhar(id, tx, tenantId);
            await this.registrarHistorico(tx, {
                aba: "Categorias financeiras / contábeis",
                acao: "Categoria criada",
                tipoRegistro: "CATEGORIA",
                registroId: String(id),
                statusAnterior: null,
                statusNovo: categoria.status,
                observacao: "Categoria financeira cadastrada.",
                origem: "MANUAL",
                ator
            });
            return categoria;
        });
    }
    async atualizarCategoria(id, input, ator) {
        await ensureContabilidadeEstrutura();
        return prisma.$transaction(async (tx) => {
            const atual = await this.buscarCategoriaPorIdOuFalhar(id, tx);
            if (input.categoriaPaiId && BigInt(input.categoriaPaiId) === id) {
                throw new AppError("A categoria pai deve ser diferente da categoria atual.", 400);
            }
            if (input.categoriaPaiId) {
                await this.buscarCategoriaPorIdOuFalhar(BigInt(input.categoriaPaiId), tx);
            }
            await tx.$executeRaw(Prisma.sql `
        UPDATE financeiro_categoria
        SET
          codigo = ${input.codigo},
          nome = ${input.nome},
          tipo = ${normalizarTipoCategoria(input.tipo)},
          grupo = ${trimOrUndefined(input.grupo ?? undefined)},
          subgrupo = ${trimOrUndefined(input.subgrupo ?? undefined)},
          categoria_pai_id = ${input.categoriaPaiId ? BigInt(input.categoriaPaiId) : null},
          aceita_lancamento_direto = ${input.aceitaLancamentoDireto !== false},
          status = ${normalizarStatusConta(input.status)},
          observacao = ${trimOrUndefined(input.observacao ?? undefined)},
          atualizado_em = NOW()
        WHERE id = ${id}
      `);
            const categoria = await this.buscarCategoriaPorIdOuFalhar(id, tx);
            await this.registrarHistorico(tx, {
                aba: "Categorias financeiras / contábeis",
                acao: "Categoria atualizada",
                tipoRegistro: "CATEGORIA",
                registroId: String(id),
                statusAnterior: atual.status,
                statusNovo: categoria.status,
                observacao: "Cadastro da categoria atualizado.",
                origem: "MANUAL",
                ator
            });
            return categoria;
        });
    }
    async removerCategoria(id, ator) {
        await ensureContabilidadeEstrutura();
        await prisma.$transaction(async (tx) => {
            const atual = await this.buscarCategoriaPorIdOuFalhar(id, tx);
            const uso = await tx.$queryRaw(Prisma.sql `
        SELECT COUNT(*)::BIGINT AS total
        FROM lancamento_financeiro
        WHERE categoria_financeira_id = ${id} AND ativo = TRUE
      `);
            if (Number(uso[0]?.total ?? 0) > 0) {
                throw new AppError("A categoria possui lançamentos vinculados e não pode ser removida.", 409);
            }
            await tx.$executeRaw(Prisma.sql `
        UPDATE financeiro_categoria
        SET ativo = FALSE, status = 'INATIVA', atualizado_em = NOW()
        WHERE id = ${id}
      `);
            await this.registrarHistorico(tx, {
                aba: "Categorias financeiras / contábeis",
                acao: "Categoria inativada",
                tipoRegistro: "CATEGORIA",
                registroId: String(id),
                statusAnterior: atual.status,
                statusNovo: "INATIVA",
                observacao: "Categoria inativada.",
                origem: "MANUAL",
                ator
            });
        });
    }
    async listarCentrosCusto(ator) {
        await ensureContabilidadeEstrutura();
        const tenantId = ator?.tenantId;
        return prisma.$queryRaw(Prisma.sql `
      SELECT
        id,
        codigo,
        nome,
        setor_responsavel,
        descricao,
        status,
        ativo
      FROM financeiro_centro_custo
      WHERE ativo = TRUE
      ${tenantSql("financeiro_centro_custo", tenantId)}
      ORDER BY nome ASC
    `);
    }
    async buscarCentroCustoPorIdOuFalhar(id, tx = prisma, tenantId) {
        await ensureContabilidadeEstrutura();
        const rows = await tx.$queryRaw(Prisma.sql `
      SELECT
        id,
        codigo,
        nome,
        setor_responsavel,
        descricao,
        status,
        ativo
      FROM financeiro_centro_custo
      WHERE id = ${id}
      ${tenantSql("financeiro_centro_custo", tenantId)}
      LIMIT 1
    `);
        const centro = rows[0];
        if (!centro || !centro.ativo) {
            throw new AppError("Centro de custo não encontrado.", 404);
        }
        return centro;
    }
    async criarCentroCusto(input, ator) {
        await ensureContabilidadeEstrutura();
        return prisma.$transaction(async (tx) => {
            const rows = await tx.$queryRaw(Prisma.sql `
        INSERT INTO financeiro_centro_custo (
          codigo,
          nome,
          setor_responsavel,
          descricao,
          status,
          ativo,
          criado_em,
          atualizado_em
        ) VALUES (
          ${input.codigo},
          ${input.nome},
          ${input.setorResponsavel},
          ${trimOrUndefined(input.descricao ?? undefined)},
          ${normalizarStatusConta(input.status)},
          TRUE,
          NOW(),
          NOW()
        )
        RETURNING id
      `);
            const id = rows[0]?.id;
            if (!id)
                throw new AppError("Não foi possível criar o centro de custo.", 500);
            const centro = await this.buscarCentroCustoPorIdOuFalhar(id, tx);
            await this.registrarHistorico(tx, {
                aba: "Centro de custo",
                acao: "Centro de custo criado",
                tipoRegistro: "CENTRO_CUSTO",
                registroId: String(id),
                statusAnterior: null,
                statusNovo: centro.status,
                observacao: "Centro de custo cadastrado.",
                origem: "MANUAL",
                ator
            });
            return centro;
        });
    }
    async atualizarCentroCusto(id, input, ator) {
        await ensureContabilidadeEstrutura();
        return prisma.$transaction(async (tx) => {
            const atual = await this.buscarCentroCustoPorIdOuFalhar(id, tx);
            await tx.$executeRaw(Prisma.sql `
        UPDATE financeiro_centro_custo
        SET
          codigo = ${input.codigo},
          nome = ${input.nome},
          setor_responsavel = ${input.setorResponsavel},
          descricao = ${trimOrUndefined(input.descricao ?? undefined)},
          status = ${normalizarStatusConta(input.status)},
          atualizado_em = NOW()
        WHERE id = ${id}
      `);
            const centro = await this.buscarCentroCustoPorIdOuFalhar(id, tx);
            await this.registrarHistorico(tx, {
                aba: "Centro de custo",
                acao: "Centro de custo atualizado",
                tipoRegistro: "CENTRO_CUSTO",
                registroId: String(id),
                statusAnterior: atual.status,
                statusNovo: centro.status,
                observacao: "Cadastro do centro de custo atualizado.",
                origem: "MANUAL",
                ator
            });
            return centro;
        });
    }
    async removerCentroCusto(id, ator) {
        await ensureContabilidadeEstrutura();
        await prisma.$transaction(async (tx) => {
            const atual = await this.buscarCentroCustoPorIdOuFalhar(id, tx);
            const uso = await tx.$queryRaw(Prisma.sql `
        SELECT COUNT(*)::BIGINT AS total
        FROM lancamento_financeiro
        WHERE centro_custo_id = ${id} AND ativo = TRUE
      `);
            if (Number(uso[0]?.total ?? 0) > 0) {
                throw new AppError("O centro de custo possui lançamentos vinculados e não pode ser removido.", 409);
            }
            await tx.$executeRaw(Prisma.sql `
        UPDATE financeiro_centro_custo
        SET ativo = FALSE, status = 'INATIVA', atualizado_em = NOW()
        WHERE id = ${id}
      `);
            await this.registrarHistorico(tx, {
                aba: "Centro de custo",
                acao: "Centro de custo inativado",
                tipoRegistro: "CENTRO_CUSTO",
                registroId: String(id),
                statusAnterior: atual.status,
                statusNovo: "INATIVA",
                observacao: "Centro de custo inativado.",
                origem: "MANUAL",
                ator
            });
        });
    }
    async listarLancamentos(ator) {
        await ensureContabilidadeEstrutura();
        const tenantId = ator?.tenantId;
        return prisma.$queryRaw(Prisma.sql `
      ${LANCAMENTO_SELECT}
      WHERE l.ativo = TRUE
      ${tenantSql("l", tenantId)}
      ORDER BY COALESCE(l.data_lancamento, l.vencimento) DESC, l.id DESC
    `);
    }
    async buscarLancamentoPorId(id, tx = prisma) {
        await ensureContabilidadeEstrutura();
        const rows = await tx.$queryRaw(Prisma.sql `
      ${LANCAMENTO_SELECT}
      WHERE l.id = ${id}
      LIMIT 1
    `);
        return rows[0] ?? null;
    }
    async buscarLancamentoPorIdOuFalhar(id, tx = prisma) {
        const lancamento = await this.buscarLancamentoPorId(id, tx);
        if (!lancamento || !lancamento.ativo) {
            throw new AppError("Lançamento financeiro não encontrado.", 404);
        }
        return lancamento;
    }
    async criarLancamento(input, ator) {
        await ensureContabilidadeEstrutura();
        return prisma.$transaction(async (tx) => {
            const tenantId = ator?.tenantId;
            const tipo = normalizarTipoLancamento(input.tipo);
            const direcaoAjuste = tipo === "AJUSTE" ? input.direcaoAjuste ?? "DIMINUIR" : null;
            const status = normalizarStatusLancamento(input.status, tipo, direcaoAjuste);
            const origem = trimOrUndefined(input.origem ?? undefined) ?? (input.compraId ? "COMPRA" : "MANUAL");
            const contaId = input.contaBancariaId ? BigInt(input.contaBancariaId) : null;
            const categoriaId = input.categoriaId ? BigInt(input.categoriaId) : null;
            const centroId = input.centroCustoId ? BigInt(input.centroCustoId) : null;
            const descricaoLancamento = trimOrUndefined(input.historico ?? undefined) ??
                trimOrUndefined(input.natureza ?? undefined) ??
                input.contraparte;
            if (contaId) {
                await this.validarContaMovimentavel(tx, contaId);
            }
            if (categoriaId) {
                await this.buscarCategoriaPorIdOuFalhar(categoriaId, tx, tenantId);
            }
            if (centroId) {
                await this.buscarCentroCustoPorIdOuFalhar(centroId, tx, tenantId);
            }
            if (["PAGO", "RECEBIDO", "CONCILIADO"].includes(status) && !contaId) {
                throw new AppError("Selecione a conta bancária para salvar um lançamento já pago ou recebido.", 400);
            }
            if (input.compraId) {
                const existente = await tx.$queryRaw(Prisma.sql `
          SELECT id
          FROM lancamento_financeiro
          WHERE compra_id = ${BigInt(input.compraId)}
            AND ativo = TRUE
            ${tenantSql("lancamento_financeiro", tenantId)}
          LIMIT 1
        `);
                if (existente[0]) {
                    throw new AppError("Já existe lançamento financeiro vinculado a esta compra.", 409);
                }
            }
            const rows = await tx.$queryRaw(Prisma.sql `
        INSERT INTO lancamento_financeiro (
          tenant_id,
          data_lancamento,
          tipo,
          direcao_ajuste,
          natureza,
          conta_bancaria_id,
          categoria_financeira_id,
          centro_custo_id,
          setor,
          descricao,
          contraparte,
          documento,
          historico,
          vencimento,
          valor,
          forma_pagamento,
          situacao,
          origem,
          observacao,
          data_baixa,
          responsavel,
          projeto,
          compra_id,
          conciliado,
          bloqueado_origem,
          ativo,
          criado_em,
          atualizado_em
        ) VALUES (
          ${tenantId ? Prisma.sql `CAST(${tenantId} AS UUID)` : Prisma.sql `NULL`},
          ${toOptionalDate(input.dataLancamento)},
          ${tipo},
          ${direcaoAjuste},
          ${input.natureza},
          ${contaId},
          ${categoriaId},
          ${centroId},
          ${trimOrUndefined(input.setor ?? undefined)},
          ${descricaoLancamento},
          ${input.contraparte},
          ${trimOrUndefined(input.documento ?? undefined)},
          ${input.historico},
          ${toOptionalDate(input.vencimento)},
          ${input.valor},
          ${trimOrUndefined(input.formaPagamento ?? undefined)},
          ${status},
          ${origem},
          ${trimOrUndefined(input.observacao ?? undefined)},
          ${toOptionalDate(input.dataBaixa ?? undefined)},
          ${trimOrUndefined(input.responsavel ?? undefined)},
          ${trimOrUndefined(input.projeto ?? undefined)},
          ${input.compraId ? BigInt(input.compraId) : null},
          FALSE,
          ${lancamentoEstaBloqueadoPorOrigem(origem)},
          TRUE,
          NOW(),
          NOW()
        )
        RETURNING id
      `);
            const id = rows[0]?.id;
            if (!id) {
                throw new AppError("Não foi possível criar o lançamento.", 500);
            }
            if (input.compraId) {
                await tx.$executeRaw(Prisma.sql `
          UPDATE autorizacao_compras
          SET lancamento_financeiro_id = ${id}
          WHERE id = ${BigInt(input.compraId)}
        `);
            }
            const lancamento = await this.buscarLancamentoPorIdOuFalhar(id, tx);
            await this.sincronizarSaldoContaPorLancamento(tx, lancamento);
            await this.registrarHistorico(tx, {
                aba: "Lançamentos",
                acao: "Lançamento criado",
                tipoRegistro: "LANCAMENTO",
                registroId: String(id),
                valor: lancamento.valor,
                conta: lancamento.conta_bancaria_nome,
                statusAnterior: null,
                statusNovo: lancamento.situacao,
                observacao: "Novo lançamento financeiro registrado.",
                origem,
                ator
            });
            return lancamento;
        });
    }
    async atualizarLancamento(id, input, ator) {
        await ensureContabilidadeEstrutura();
        return prisma.$transaction(async (tx) => {
            const tenantId = ator?.tenantId;
            const atual = await this.buscarLancamentoPorIdOuFalhar(id, tx);
            const tipo = normalizarTipoLancamento(input.tipo);
            const direcaoAjuste = tipo === "AJUSTE" ? input.direcaoAjuste ?? "DIMINUIR" : null;
            const status = normalizarStatusLancamento(input.status, tipo, direcaoAjuste);
            const contaId = input.contaBancariaId ? BigInt(input.contaBancariaId) : null;
            const categoriaId = input.categoriaId ? BigInt(input.categoriaId) : null;
            const centroId = input.centroCustoId ? BigInt(input.centroCustoId) : null;
            const descricaoLancamento = trimOrUndefined(input.historico ?? undefined) ??
                trimOrUndefined(input.natureza ?? undefined) ??
                input.contraparte;
            if (atual.bloqueado_origem) {
                const camposCriticosAlterados = atual.tipo !== tipo ||
                    atual.valor !== input.valor ||
                    atual.compra_id !== (input.compraId ? BigInt(input.compraId) : null) ||
                    (atual.conta_bancaria_id ?? null) !== contaId;
                if (camposCriticosAlterados) {
                    throw new AppError("Lançamentos integrados de compras não permitem alteração manual dos campos críticos.", 409);
                }
            }
            if (contaId)
                await this.validarContaMovimentavel(tx, contaId);
            if (categoriaId)
                await this.buscarCategoriaPorIdOuFalhar(categoriaId, tx, tenantId);
            if (centroId)
                await this.buscarCentroCustoPorIdOuFalhar(centroId, tx, tenantId);
            if (["PAGO", "RECEBIDO", "CONCILIADO"].includes(status) && !contaId) {
                throw new AppError("Selecione a conta bancária para salvar um lançamento já pago ou recebido.", 400);
            }
            await tx.$executeRaw(Prisma.sql `
        UPDATE lancamento_financeiro
        SET
          data_lancamento = ${toOptionalDate(input.dataLancamento)},
          tipo = ${tipo},
          direcao_ajuste = ${direcaoAjuste},
          natureza = ${input.natureza},
          conta_bancaria_id = ${contaId},
          categoria_financeira_id = ${categoriaId},
          centro_custo_id = ${centroId},
          setor = ${trimOrUndefined(input.setor ?? undefined)},
          descricao = ${descricaoLancamento},
          contraparte = ${input.contraparte},
          documento = ${trimOrUndefined(input.documento ?? undefined)},
          historico = ${input.historico},
          vencimento = ${toOptionalDate(input.vencimento)},
          valor = ${input.valor},
          forma_pagamento = ${trimOrUndefined(input.formaPagamento ?? undefined)},
          situacao = ${status},
          observacao = ${trimOrUndefined(input.observacao ?? undefined)},
          data_baixa = ${toOptionalDate(input.dataBaixa ?? undefined)},
          responsavel = ${trimOrUndefined(input.responsavel ?? undefined)},
          projeto = ${trimOrUndefined(input.projeto ?? undefined)},
          atualizado_em = NOW()
        WHERE id = ${id}
      `);
            const lancamento = await this.buscarLancamentoPorIdOuFalhar(id, tx);
            await this.sincronizarSaldoContaPorLancamento(tx, lancamento);
            await this.registrarHistorico(tx, {
                aba: "Lançamentos",
                acao: "Lançamento atualizado",
                tipoRegistro: "LANCAMENTO",
                registroId: String(id),
                valor: lancamento.valor,
                conta: lancamento.conta_bancaria_nome,
                statusAnterior: atual.situacao,
                statusNovo: lancamento.situacao,
                observacao: "Cadastro do lançamento atualizado.",
                origem: lancamento.origem,
                ator
            });
            return lancamento;
        });
    }
    async atualizarSituacaoLancamento(id, status, ator) {
        await ensureContabilidadeEstrutura();
        return prisma.$transaction(async (tx) => {
            const atual = await this.buscarLancamentoPorIdOuFalhar(id, tx);
            const novoStatus = normalizarStatusLancamento(status, normalizarTipoLancamento(atual.tipo), atual.direcao_ajuste ? normalizarDirecaoAjuste(atual.direcao_ajuste) : undefined);
            if (["PAGO", "RECEBIDO", "CONCILIADO"].includes(novoStatus)) {
                throw new AppError("Use a ação de pagar ou receber para baixar o lançamento.", 409);
            }
            await tx.$executeRaw(Prisma.sql `
        UPDATE lancamento_financeiro
        SET situacao = ${novoStatus}, atualizado_em = NOW()
        WHERE id = ${id}
      `);
            const lancamento = await this.buscarLancamentoPorIdOuFalhar(id, tx);
            await this.registrarHistorico(tx, {
                aba: "Lançamentos",
                acao: "Status atualizado",
                tipoRegistro: "LANCAMENTO",
                registroId: String(id),
                valor: lancamento.valor,
                conta: lancamento.conta_bancaria_nome,
                statusAnterior: atual.situacao,
                statusNovo: lancamento.situacao,
                observacao: "Status do lançamento alterado.",
                origem: lancamento.origem,
                ator
            });
            return lancamento;
        });
    }
    async pagarLancamento(id, input, ator) {
        await ensureContabilidadeEstrutura();
        return prisma.$transaction(async (tx) => this.baixarLancamentoTx(tx, id, input, ator));
    }
    async estornarLancamento(id, ator) {
        await ensureContabilidadeEstrutura();
        return prisma.$transaction(async (tx) => {
            const atual = await this.buscarLancamentoPorIdOuFalhar(id, tx);
            const tipo = normalizarTipoLancamento(atual.tipo);
            if (!["PAGO", "RECEBIDO", "CONCILIADO"].includes(atual.situacao)) {
                throw new AppError("Somente lançamentos baixados podem ser estornados.", 409);
            }
            if (!atual.conta_bancaria_id) {
                throw new AppError("O lançamento não possui conta vinculada para estorno.", 409);
            }
            const conta = await this.buscarContaBancariaPorIdOuFalhar(atual.conta_bancaria_id, tx);
            const tipoEstorno = tipoMovimentacaoPorLancamento(tipo, atual.direcao_ajuste ? normalizarDirecaoAjuste(atual.direcao_ajuste) : undefined) === "ENTRADA"
                ? "SAIDA"
                : "ENTRADA";
            await this.criarMovimentacaoInterna(tx, {
                contaId: atual.conta_bancaria_id,
                tipo: tipoEstorno,
                descricao: `Estorno do lançamento ${String(id)}`,
                contraparte: atual.contraparte,
                categoria: atual.categoria_nome ?? atual.natureza ?? atual.tipo,
                categoriaId: atual.categoria_financeira_id ? Number(atual.categoria_financeira_id) : undefined,
                centroCustoId: atual.centro_custo_id ? Number(atual.centro_custo_id) : undefined,
                dataMovimentacao: new Date().toISOString().slice(0, 10),
                valor: atual.valor,
                origem: atual.origem ? `${atual.origem}_ESTORNO` : "ESTORNO",
                observacao: "Estorno automático do lançamento financeiro.",
                lancamentoId: id
            });
            await tx.$executeRaw(Prisma.sql `
        UPDATE lancamento_financeiro
        SET situacao = 'ESTORNADO', conciliado = FALSE, atualizado_em = NOW()
        WHERE id = ${id}
      `);
            const lancamento = await this.buscarLancamentoPorIdOuFalhar(id, tx);
            await this.registrarHistorico(tx, {
                aba: "Lançamentos",
                acao: "Lançamento estornado",
                tipoRegistro: "LANCAMENTO",
                registroId: String(id),
                valor: lancamento.valor,
                conta: conta.nome_conta,
                statusAnterior: atual.situacao,
                statusNovo: "ESTORNADO",
                observacao: "Estorno financeiro registrado com movimento reverso.",
                origem: lancamento.origem,
                ator
            });
            return lancamento;
        });
    }
    async removerLancamento(id, input) {
        await ensureContabilidadeEstrutura();
        await prisma.$transaction(async (tx) => {
            const atual = await this.buscarLancamentoPorIdOuFalhar(id, tx);
            if (atual.bloqueado_origem) {
                throw new AppError("Lançamentos integrados de compras não podem ser removidos manualmente.", 409);
            }
            const movimentacoesVinculadas = await tx.$queryRaw(Prisma.sql `
        ${MOVIMENTACAO_SELECT}
        WHERE m.ativo = TRUE
          AND m.lancamento_financeiro_id = ${id}
        ORDER BY m.id ASC
      `);
            for (const movimentacao of movimentacoesVinculadas) {
                await this.reverterMovimentacaoConta(tx, movimentacao);
                await tx.$executeRaw(Prisma.sql `
          UPDATE movimentacao_financeira
          SET ativo = FALSE, atualizado_em = NOW()
          WHERE id = ${movimentacao.id}
        `);
            }
            await tx.$executeRaw(Prisma.sql `
        UPDATE lancamento_financeiro
        SET ativo = FALSE, situacao = 'CANCELADO', cancelado_em = NOW(), atualizado_em = NOW()
        WHERE id = ${id}
      `);
            await this.registrarHistorico(tx, {
                aba: "Lançamentos",
                acao: "Lançamento cancelado",
                tipoRegistro: "LANCAMENTO",
                registroId: String(id),
                valor: atual.valor,
                conta: atual.conta_bancaria_nome,
                statusAnterior: atual.situacao,
                statusNovo: "CANCELADO",
                observacao: trimOrUndefined(input?.observacaoAuditoria ?? undefined) ??
                    "Lançamento cancelado e mantido no histórico para auditoria.",
                origem: atual.origem,
                ator: input?.ator
            });
        });
    }
    async listarMovimentacoes(ator) {
        await ensureContabilidadeEstrutura();
        const tenantId = ator?.tenantId;
        return prisma.$queryRaw(Prisma.sql `
      ${MOVIMENTACAO_SELECT}
      WHERE m.ativo = TRUE
      ${tenantSql("m", tenantId)}
      ORDER BY m.data_movimentacao DESC, m.id DESC
    `);
    }
    async buscarMovimentacaoPorId(id, tx = prisma) {
        await ensureContabilidadeEstrutura();
        const rows = await tx.$queryRaw(Prisma.sql `
      ${MOVIMENTACAO_SELECT}
      WHERE m.id = ${id}
      LIMIT 1
    `);
        return rows[0] ?? null;
    }
    async buscarMovimentacaoPorIdOuFalhar(id, tx = prisma) {
        const movimentacao = await this.buscarMovimentacaoPorId(id, tx);
        if (!movimentacao) {
            throw new AppError("Movimentação financeira não encontrada.", 404);
        }
        return movimentacao;
    }
    async criarMovimentacao(input, ator) {
        await ensureContabilidadeEstrutura();
        return prisma.$transaction(async (tx) => {
            if (input.centroCustoId) {
                await this.buscarCentroCustoPorIdOuFalhar(BigInt(input.centroCustoId), tx);
            }
            const movimentacao = await this.criarMovimentacaoInterna(tx, {
                contaId: input.contaBancariaId ? BigInt(input.contaBancariaId) : null,
                tipo: this.normalizarTipoMovimentacao(input.tipo),
                descricao: input.descricao,
                contraparte: trimOrUndefined(input.contraparte ?? undefined),
                categoria: trimOrUndefined(input.categoria ?? undefined),
                centroCustoId: input.centroCustoId ?? undefined,
                dataMovimentacao: input.dataMovimentacao,
                valor: input.valor,
                origem: trimOrUndefined(input.origem ?? undefined) ?? "AJUSTE_MANUAL",
                observacao: trimOrUndefined(input.observacao ?? undefined)
            });
            try {
                await this.registrarHistorico(tx, {
                    aba: "Fluxo de caixa",
                    acao: "Movimentação criada",
                    tipoRegistro: "MOVIMENTACAO",
                    registroId: String(movimentacao.id),
                    valor: movimentacao.valor,
                    conta: movimentacao.conta_bancaria_nome,
                    observacao: "Movimentação manual registrada no fluxo de caixa.",
                    origem: movimentacao.origem,
                    ator
                });
            }
            catch (error) {
                console.warn("[contabilidade] falha ao registrar histórico da movimentação criada:", error);
            }
            return movimentacao;
        });
    }
    async atualizarMovimentacao(id, input, ator) {
        await ensureContabilidadeEstrutura();
        return prisma.$transaction(async (tx) => {
            const atual = await this.buscarMovimentacaoPorIdOuFalhar(id, tx);
            if (atual.lancamento_financeiro_id || atual.transferencia_id) {
                throw new AppError("Movimentações originadas de lançamentos ou transferências não podem ser alteradas manualmente.", 409);
            }
            await this.reverterMovimentacaoConta(tx, atual);
            if (input.centroCustoId) {
                await this.buscarCentroCustoPorIdOuFalhar(BigInt(input.centroCustoId), tx);
            }
            const contaId = input.contaBancariaId ? BigInt(input.contaBancariaId) : null;
            const tipo = this.normalizarTipoMovimentacao(input.tipo);
            let saldoAnterior = null;
            let saldoAtual = null;
            if (contaId) {
                const conta = await this.validarContaMovimentavel(tx, contaId, true, true);
                if (tipo === "SAIDA" && conta.saldo < input.valor) {
                    throw new AppError("Não há saldo suficiente nesta conta para concluir o débito informado.", 409);
                }
                saldoAnterior = conta.saldo;
                saldoAtual = calcularSaldoConta(conta.saldo, input.valor, tipo);
                await tx.$executeRaw(Prisma.sql `
          UPDATE conta_bancaria
          SET saldo = ${saldoAtual}, data_atualizacao = NOW(), atualizado_em = NOW()
          WHERE id = ${contaId}
        `);
            }
            await tx.$executeRaw(Prisma.sql `
        UPDATE movimentacao_financeira
        SET
          tipo = ${tipo},
          descricao = ${input.descricao},
          contraparte = ${trimOrUndefined(input.contraparte ?? undefined)},
          categoria = ${trimOrUndefined(input.categoria ?? undefined)},
          centro_custo_id = ${input.centroCustoId ? BigInt(input.centroCustoId) : null},
          conta_bancaria_id = ${contaId},
          data_movimentacao = ${toOptionalDate(input.dataMovimentacao)},
          valor = ${input.valor},
          origem = ${trimOrUndefined(input.origem ?? undefined) ?? "AJUSTE_MANUAL"},
          observacao = ${trimOrUndefined(input.observacao ?? undefined)},
          saldo_anterior = ${saldoAnterior},
          saldo_atual = ${saldoAtual},
          atualizado_em = NOW()
        WHERE id = ${id}
      `);
            const movimentacao = await this.buscarMovimentacaoPorIdOuFalhar(id, tx);
            try {
                await this.registrarHistorico(tx, {
                    aba: "Fluxo de caixa",
                    acao: "Movimentação atualizada",
                    tipoRegistro: "MOVIMENTACAO",
                    registroId: String(id),
                    valor: movimentacao.valor,
                    conta: movimentacao.conta_bancaria_nome,
                    observacao: "Movimentação manual atualizada.",
                    origem: movimentacao.origem,
                    ator
                });
            }
            catch (error) {
                console.warn("[contabilidade] falha ao registrar histórico da movimentação atualizada:", error);
            }
            return movimentacao;
        });
    }
    async removerMovimentacao(id, ator) {
        await ensureContabilidadeEstrutura();
        await prisma.$transaction(async (tx) => {
            const atual = await this.buscarMovimentacaoPorIdOuFalhar(id, tx);
            if (atual.lancamento_financeiro_id || atual.transferencia_id) {
                throw new AppError("Movimentações integradas não podem ser removidas manualmente.", 409);
            }
            await this.reverterMovimentacaoConta(tx, atual);
            await tx.$executeRaw(Prisma.sql `
        UPDATE movimentacao_financeira
        SET ativo = FALSE, atualizado_em = NOW()
        WHERE id = ${id}
      `);
            try {
                await this.registrarHistorico(tx, {
                    aba: "Fluxo de caixa",
                    acao: "Movimentação cancelada",
                    tipoRegistro: "MOVIMENTACAO",
                    registroId: String(id),
                    valor: atual.valor,
                    conta: atual.conta_bancaria_nome,
                    observacao: "Movimentação manual cancelada.",
                    origem: atual.origem,
                    ator
                });
            }
            catch (error) {
                console.warn("[contabilidade] falha ao registrar histórico da movimentação cancelada:", error);
            }
        });
    }
    async listarTransferencias(ator) {
        await ensureContabilidadeEstrutura();
        const tenantId = ator?.tenantId;
        return prisma.$queryRaw(Prisma.sql `
      SELECT
        t.id,
        t.conta_origem_id,
        t.conta_destino_id,
        t.data_transferencia,
        t.valor::float8 AS valor,
        t.descricao,
        t.responsavel,
        t.observacao,
        t.status,
        t.movimentacao_saida_id,
        t.movimentacao_entrada_id,
        co.nome_conta AS conta_origem_nome,
        cd.nome_conta AS conta_destino_nome
      FROM financeiro_transferencia t
      LEFT JOIN conta_bancaria co ON co.id = t.conta_origem_id
      LEFT JOIN conta_bancaria cd ON cd.id = t.conta_destino_id
      WHERE t.ativo = TRUE
      ${tenantSql("t", tenantId)}
      ORDER BY t.data_transferencia DESC, t.id DESC
    `);
    }
    async buscarTransferenciaPorIdOuFalhar(id, tx = prisma) {
        const rows = await tx.$queryRaw(Prisma.sql `
      SELECT
        t.id,
        t.conta_origem_id,
        t.conta_destino_id,
        t.data_transferencia,
        t.valor::float8 AS valor,
        t.descricao,
        t.responsavel,
        t.observacao,
        t.status,
        t.movimentacao_saida_id,
        t.movimentacao_entrada_id,
        co.nome_conta AS conta_origem_nome,
        cd.nome_conta AS conta_destino_nome
      FROM financeiro_transferencia t
      LEFT JOIN conta_bancaria co ON co.id = t.conta_origem_id
      LEFT JOIN conta_bancaria cd ON cd.id = t.conta_destino_id
      WHERE t.id = ${id}
      LIMIT 1
    `);
        const transferencia = rows[0];
        if (!transferencia)
            throw new AppError("Transferência não encontrada.", 404);
        return transferencia;
    }
    async criarTransferencia(input, ator) {
        await ensureContabilidadeEstrutura();
        return prisma.$transaction(async (tx) => {
            const contaOrigem = await this.validarContaMovimentavel(tx, BigInt(input.contaOrigemId), true, true);
            const contaDestino = await this.validarContaMovimentavel(tx, BigInt(input.contaDestinoId), true, true);
            if (input.contaOrigemId === input.contaDestinoId) {
                throw new AppError("A conta de destino deve ser diferente da conta de origem.", 400);
            }
            if (contaOrigem.saldo < input.valor) {
                throw new AppError("A conta de origem não possui saldo suficiente para a transferência.", 409);
            }
            const rows = await tx.$queryRaw(Prisma.sql `
        INSERT INTO financeiro_transferencia (
          conta_origem_id,
          conta_destino_id,
          data_transferencia,
          valor,
          descricao,
          responsavel,
          observacao,
          status,
          ativo,
          criado_em,
          atualizado_em
        ) VALUES (
          ${BigInt(input.contaOrigemId)},
          ${BigInt(input.contaDestinoId)},
          ${toOptionalDate(input.dataTransferencia)},
          ${input.valor},
          ${input.descricao},
          ${input.responsavel},
          ${trimOrUndefined(input.observacao ?? undefined)},
          'CONCLUIDA',
          TRUE,
          NOW(),
          NOW()
        )
        RETURNING id
      `);
            const transferenciaId = rows[0]?.id;
            if (!transferenciaId)
                throw new AppError("Não foi possível registrar a transferência.", 500);
            const saida = await this.criarMovimentacaoInterna(tx, {
                contaId: BigInt(input.contaOrigemId),
                tipo: "SAIDA",
                descricao: input.descricao,
                dataMovimentacao: input.dataTransferencia,
                valor: input.valor,
                origem: "TRANSFERENCIA",
                observacao: trimOrUndefined(input.observacao ?? undefined),
                transferenciaId
            });
            const entrada = await this.criarMovimentacaoInterna(tx, {
                contaId: BigInt(input.contaDestinoId),
                tipo: "ENTRADA",
                descricao: input.descricao,
                dataMovimentacao: input.dataTransferencia,
                valor: input.valor,
                origem: "TRANSFERENCIA",
                observacao: trimOrUndefined(input.observacao ?? undefined),
                transferenciaId
            });
            await tx.$executeRaw(Prisma.sql `
        UPDATE financeiro_transferencia
        SET movimentacao_saida_id = ${saida.id},
            movimentacao_entrada_id = ${entrada.id},
            atualizado_em = NOW()
        WHERE id = ${transferenciaId}
      `);
            const transferencia = await this.buscarTransferenciaPorIdOuFalhar(transferenciaId, tx);
            await this.registrarHistorico(tx, {
                aba: "Transferências",
                acao: "Transferência concluída",
                tipoRegistro: "TRANSFERENCIA",
                registroId: String(transferenciaId),
                valor: input.valor,
                conta: `${contaOrigem.nome_conta} -> ${contaDestino.nome_conta}`,
                statusAnterior: null,
                statusNovo: "CONCLUIDA",
                observacao: "Transferência interna entre contas registrada.",
                origem: "TRANSFERENCIA",
                ator
            });
            return transferencia;
        });
    }
    async estornarTransferencia(id, ator) {
        await ensureContabilidadeEstrutura();
        return prisma.$transaction(async (tx) => {
            const transferencia = await this.buscarTransferenciaPorIdOuFalhar(id, tx);
            if (transferencia.status === "ESTORNADA") {
                throw new AppError("A transferência já foi estornada.", 409);
            }
            if (transferencia.movimentacao_saida_id) {
                const saida = await this.buscarMovimentacaoPorIdOuFalhar(transferencia.movimentacao_saida_id, tx);
                await this.reverterMovimentacaoConta(tx, saida);
            }
            if (transferencia.movimentacao_entrada_id) {
                const entrada = await this.buscarMovimentacaoPorIdOuFalhar(transferencia.movimentacao_entrada_id, tx);
                await this.reverterMovimentacaoConta(tx, entrada);
            }
            await tx.$executeRaw(Prisma.sql `
        UPDATE financeiro_transferencia
        SET status = 'ESTORNADA', atualizado_em = NOW()
        WHERE id = ${id}
      `);
            const atualizada = await this.buscarTransferenciaPorIdOuFalhar(id, tx);
            await this.registrarHistorico(tx, {
                aba: "Transferências",
                acao: "Transferência estornada",
                tipoRegistro: "TRANSFERENCIA",
                registroId: String(id),
                valor: atualizada.valor,
                conta: `${atualizada.conta_origem_nome ?? ""} -> ${atualizada.conta_destino_nome ?? ""}`,
                statusAnterior: transferencia.status,
                statusNovo: "ESTORNADA",
                observacao: "Transferência revertida com ajuste dos saldos.",
                origem: "TRANSFERENCIA",
                ator
            });
            return atualizada;
        });
    }
    async listarConciliacoes(ator) {
        await ensureContabilidadeEstrutura();
        const tenantId = ator?.tenantId;
        return prisma.$queryRaw(Prisma.sql `
      SELECT
        c.id,
        c.conta_bancaria_id,
        c.data_movimento,
        c.descricao_extrato,
        c.valor_extrato::float8 AS valor_extrato,
        c.lancamento_financeiro_id,
        c.movimentacao_financeira_id,
        c.situacao,
        c.diferenca::float8 AS diferenca,
        c.observacao,
        cb.nome_conta AS conta_bancaria_nome,
        l.descricao AS lancamento_descricao,
        m.descricao AS movimentacao_descricao
      FROM financeiro_conciliacao c
      LEFT JOIN conta_bancaria cb ON cb.id = c.conta_bancaria_id
      LEFT JOIN lancamento_financeiro l ON l.id = c.lancamento_financeiro_id
      LEFT JOIN movimentacao_financeira m ON m.id = c.movimentacao_financeira_id
      WHERE c.ativo = TRUE
      ${tenantSql("c", tenantId)}
      ORDER BY c.data_movimento DESC, c.id DESC
    `);
    }
    async buscarConciliacaoPorIdOuFalhar(id, tx = prisma) {
        const rows = await tx.$queryRaw(Prisma.sql `
      SELECT
        c.id,
        c.conta_bancaria_id,
        c.data_movimento,
        c.descricao_extrato,
        c.valor_extrato::float8 AS valor_extrato,
        c.lancamento_financeiro_id,
        c.movimentacao_financeira_id,
        c.situacao,
        c.diferenca::float8 AS diferenca,
        c.observacao,
        cb.nome_conta AS conta_bancaria_nome,
        l.descricao AS lancamento_descricao,
        m.descricao AS movimentacao_descricao
      FROM financeiro_conciliacao c
      LEFT JOIN conta_bancaria cb ON cb.id = c.conta_bancaria_id
      LEFT JOIN lancamento_financeiro l ON l.id = c.lancamento_financeiro_id
      LEFT JOIN movimentacao_financeira m ON m.id = c.movimentacao_financeira_id
      WHERE c.id = ${id}
      LIMIT 1
    `);
        const conciliacao = rows[0];
        if (!conciliacao)
            throw new AppError("Item de conciliação não encontrado.", 404);
        return conciliacao;
    }
    async criarConciliacao(input, ator) {
        await ensureContabilidadeEstrutura();
        return prisma.$transaction(async (tx) => {
            await this.validarContaMovimentavel(tx, BigInt(input.contaBancariaId), false);
            if (input.lancamentoFinanceiroId) {
                await this.buscarLancamentoPorIdOuFalhar(BigInt(input.lancamentoFinanceiroId), tx);
            }
            if (input.movimentacaoFinanceiraId) {
                await this.buscarMovimentacaoPorIdOuFalhar(BigInt(input.movimentacaoFinanceiraId), tx);
            }
            const diferenca = await this.calcularDiferencaConciliacao(tx, input);
            const rows = await tx.$queryRaw(Prisma.sql `
        INSERT INTO financeiro_conciliacao (
          conta_bancaria_id,
          data_movimento,
          descricao_extrato,
          valor_extrato,
          lancamento_financeiro_id,
          movimentacao_financeira_id,
          situacao,
          diferenca,
          observacao,
          ativo,
          criado_em,
          atualizado_em
        ) VALUES (
          ${BigInt(input.contaBancariaId)},
          ${toOptionalDate(input.dataMovimento)},
          ${input.descricaoExtrato},
          ${input.valorExtrato},
          ${input.lancamentoFinanceiroId ? BigInt(input.lancamentoFinanceiroId) : null},
          ${input.movimentacaoFinanceiraId ? BigInt(input.movimentacaoFinanceiraId) : null},
          ${normalizarSituacaoConciliacao(input.situacao)},
          ${diferenca},
          ${trimOrUndefined(input.observacao ?? undefined)},
          TRUE,
          NOW(),
          NOW()
        )
        RETURNING id
      `);
            const id = rows[0]?.id;
            if (!id)
                throw new AppError("Não foi possível registrar o item de conciliação.", 500);
            const conciliacao = await this.buscarConciliacaoPorIdOuFalhar(id, tx);
            await this.registrarHistorico(tx, {
                aba: "Conciliação bancária",
                acao: "Item de conciliação criado",
                tipoRegistro: "CONCILIACAO",
                registroId: String(id),
                valor: conciliacao.valor_extrato,
                conta: conciliacao.conta_bancaria_nome,
                statusAnterior: null,
                statusNovo: conciliacao.situacao,
                observacao: "Novo item de extrato registrado para conciliação.",
                origem: "CONCILIACAO",
                ator
            });
            return conciliacao;
        });
    }
    async atualizarSituacaoConciliacao(id, situacao, ator) {
        await ensureContabilidadeEstrutura();
        return prisma.$transaction(async (tx) => {
            const atual = await this.buscarConciliacaoPorIdOuFalhar(id, tx);
            const novaSituacao = normalizarSituacaoConciliacao(situacao);
            await tx.$executeRaw(Prisma.sql `
        UPDATE financeiro_conciliacao
        SET situacao = ${novaSituacao}, atualizado_em = NOW()
        WHERE id = ${id}
      `);
            const conciliacao = await this.buscarConciliacaoPorIdOuFalhar(id, tx);
            await this.registrarHistorico(tx, {
                aba: "Conciliação bancária",
                acao: "Situação da conciliação atualizada",
                tipoRegistro: "CONCILIACAO",
                registroId: String(id),
                valor: conciliacao.valor_extrato,
                conta: conciliacao.conta_bancaria_nome,
                statusAnterior: atual.situacao,
                statusNovo: conciliacao.situacao,
                observacao: "Situação da conciliação alterada.",
                origem: "CONCILIACAO",
                ator
            });
            return conciliacao;
        });
    }
    async listarHistorico(ator) {
        await ensureContabilidadeEstrutura();
        const tenantId = ator?.tenantId;
        return prisma.$queryRaw(Prisma.sql `
      SELECT
        id,
        aba,
        acao,
        tipo_registro,
        registro_id,
        valor::float8 AS valor,
        conta,
        status_anterior,
        status_novo,
        observacao,
        origem,
        usuario_id,
        usuario_nome,
        perfil,
        ip,
        maquina,
        criado_em
      FROM financeiro_historico
      WHERE 1 = 1
      ${tenantSql("financeiro_historico", tenantId)}
      ORDER BY criado_em DESC, id DESC
    `);
    }
    async listarFechamentosMensais(ator) {
        await ensureContabilidadeEstrutura();
        const tenantId = ator?.tenantId;
        return prisma.$queryRaw(Prisma.sql `
      SELECT
        id,
        competencia,
        saldo_total::float8 AS saldo_total,
        saldo_bancos::float8 AS saldo_bancos,
        saldo_caixa::float8 AS saldo_caixa,
        observacao,
        usuario_nome,
        contas_snapshot,
        criado_em
      FROM financeiro_fechamento_mensal
      WHERE 1 = 1
      ${tenantSql("financeiro_fechamento_mensal", tenantId)}
      ORDER BY competencia DESC, id DESC
    `);
    }
    async fecharMes(input, ator) {
        await ensureContabilidadeEstrutura();
        return prisma.$transaction(async (tx) => {
            const tenantId = ator?.tenantId;
            const existente = await tx.$queryRaw(Prisma.sql `
        SELECT id
        FROM financeiro_fechamento_mensal
        WHERE competencia = ${input.competencia}
          ${tenantId ? Prisma.sql `AND tenant_id::text = ${tenantId}` : Prisma.empty}
        LIMIT 1
      `);
            if (existente[0]) {
                throw new AppError("Esta competência já foi fechada no financeiro.", 409);
            }
            const contas = await tx.$queryRaw(Prisma.sql `
        SELECT
          cb.id,
          cb.banco,
          cb.nome_conta,
          cb.tipo,
          cb.saldo::float8 AS saldo
        FROM conta_bancaria cb
        WHERE cb.ativo = TRUE
          ${tenantId ? Prisma.sql `AND cb.tenant_id::text = ${tenantId}` : Prisma.empty}
        ORDER BY cb.nome_conta ASC, cb.id ASC
      `);
            const snapshot = contas.map((conta) => ({
                contaId: Number(conta.id),
                banco: conta.banco,
                nomeConta: conta.nome_conta ?? `Conta ${String(conta.id)}`,
                tipo: conta.tipo,
                saldo: Number(conta.saldo ?? 0)
            }));
            const saldoTotal = snapshot.reduce((acc, item) => acc + item.saldo, 0);
            const saldoBancos = snapshot
                .filter((item) => normalizarTipoConta(item.tipo) !== "CAIXA_INTERNO")
                .reduce((acc, item) => acc + item.saldo, 0);
            const saldoCaixa = snapshot
                .filter((item) => normalizarTipoConta(item.tipo) === "CAIXA_INTERNO")
                .reduce((acc, item) => acc + item.saldo, 0);
            const rows = await tx.$queryRaw(Prisma.sql `
        INSERT INTO financeiro_fechamento_mensal (
          tenant_id,
          competencia,
          saldo_total,
          saldo_bancos,
          saldo_caixa,
          contas_snapshot,
          observacao,
          usuario_id,
          usuario_nome,
          criado_em
        ) VALUES (
          ${tenantId ? Prisma.sql `CAST(${tenantId} AS UUID)` : Prisma.sql `NULL`},
          ${input.competencia},
          ${saldoTotal},
          ${saldoBancos},
          ${saldoCaixa},
          ${JSON.stringify(snapshot)}::jsonb,
          ${trimOrUndefined(input.observacao ?? undefined)},
          ${ator?.usuarioId ?? null},
          ${trimOrUndefined(ator?.nomeUsuario ?? undefined)},
          NOW()
        )
        RETURNING id
      `);
            const id = rows[0]?.id;
            if (!id) {
                throw new AppError("Não foi possível fechar a competência informada.", 500);
            }
            await this.registrarHistorico(tx, {
                aba: "Fechamento mensal",
                acao: "Mês fechado",
                tipoRegistro: "FECHAMENTO_MENSAL",
                registroId: String(id),
                valor: saldoTotal,
                conta: "Todas as contas",
                statusNovo: input.competencia,
                observacao: `Fechamento realizado para ${input.competencia} com abertura automática do mês seguinte baseada nos saldos fechados.`,
                origem: "FECHAMENTO_MENSAL",
                ator
            });
            const registros = await tx.$queryRaw(Prisma.sql `
        SELECT
          id,
          competencia,
          saldo_total::float8 AS saldo_total,
          saldo_bancos::float8 AS saldo_bancos,
          saldo_caixa::float8 AS saldo_caixa,
          observacao,
          usuario_nome,
          contas_snapshot,
          criado_em
        FROM financeiro_fechamento_mensal
        WHERE id = ${id}
        LIMIT 1
      `);
            const registro = registros[0];
            if (!registro) {
                throw new AppError("Não foi possível localizar o fechamento recém-criado.", 500);
            }
            return registro;
        });
    }
    async listarComprasIntegradas(ator) {
        await ensureContabilidadeEstrutura();
        const tenantId = ator?.tenantId;
        return prisma.$queryRaw(Prisma.sql `
      SELECT
        ac.id AS compra_id,
        ac.numero_solicitacao,
        COALESCE(ac.vencedor, ac.menor_preco_fornecedor, ac.responsavel, ac.solicitante) AS fornecedor,
        ac.valor_total_itens::float8 AS valor_aprovado,
        rb.valor::float8 AS valor_reservado,
        ac.pagamento_autorizado_valor::float8 AS valor_autorizado,
        ac.conta_pagadora_id AS conta_bancaria_id,
        cb.nome_conta AS conta_nome,
        ac.pagamento_vencimento AS data_prevista_pagamento,
        ac.status AS status_compra,
        lf.situacao AS status_financeiro,
        ac.lancamento_financeiro_id
      FROM autorizacao_compras ac
      LEFT JOIN LATERAL (
        SELECT valor
        FROM autorizacao_compras_reserva_bancaria r
        WHERE r.autorizacao_compra_id = ac.id
          AND COALESCE(r.status, 'RESERVA_EFETUADA') = 'RESERVA_EFETUADA'
          AND r.cancelado_em IS NULL
        ORDER BY r.criado_em DESC
        LIMIT 1
      ) rb ON TRUE
      LEFT JOIN conta_bancaria cb ON cb.id = ac.conta_pagadora_id
      LEFT JOIN lancamento_financeiro lf ON lf.id = ac.lancamento_financeiro_id
      WHERE ac.ativo = TRUE
        AND ac.tenant_id::text = ${tenantId ?? ""}
      ORDER BY ac.atualizado_em DESC NULLS LAST, ac.id DESC
    `);
    }
    async gerarObrigacaoFinanceiraPorCompra(compraId, ator) {
        await ensureContabilidadeEstrutura();
        return prisma.$transaction(async (tx) => {
            const compra = await tx.$queryRaw(Prisma.sql `
        SELECT
          id,
          numero_solicitacao,
          vencedor,
          menor_preco_fornecedor,
          valor_total_itens::float8 AS valor_total_itens,
          pagamento_vencimento,
          conta_pagadora_id,
          centro_custo,
          setor_solicitante,
          natureza_compra,
          lancamento_financeiro_id
        FROM autorizacao_compras
        WHERE id = ${compraId}
        LIMIT 1
      `);
            const registro = compra[0];
            if (!registro)
                throw new AppError("Compra não encontrada para integração financeira.", 404);
            if (registro.lancamento_financeiro_id) {
                return this.buscarLancamentoPorIdOuFalhar(registro.lancamento_financeiro_id, tx);
            }
            const categoria = await tx.$queryRaw(Prisma.sql `
        SELECT id
        FROM financeiro_categoria
        WHERE ativo = TRUE AND tipo = 'DESPESA'
        ORDER BY CASE WHEN LOWER(nome) LIKE '%fornecedor%' THEN 0 ELSE 1 END, nome ASC
        LIMIT 1
      `);
            const vencimentoCompra = registro.pagamento_vencimento?.toISOString().slice(0, 10) ??
                new Date().toISOString().slice(0, 10);
            const lancamento = await this.criarLancamento({
                dataLancamento: new Date().toISOString().slice(0, 10),
                tipo: "DESPESA",
                natureza: registro.natureza_compra ?? "Despesa integrada de compras",
                contaBancariaId: registro.conta_pagadora_id ? Number(registro.conta_pagadora_id) : undefined,
                categoriaId: categoria[0] ? Number(categoria[0].id) : undefined,
                setor: registro.setor_solicitante ?? undefined,
                contraparte: registro.vencedor ?? registro.menor_preco_fornecedor ?? "Fornecedor não definido",
                historico: `Compra ${registro.numero_solicitacao ?? String(registro.id)}`,
                valor: Number(registro.valor_total_itens ?? 0),
                status: "AGUARDANDO_PAGAMENTO",
                origem: "COMPRA",
                vencimento: vencimentoCompra,
                compraId: Number(registro.id)
            }, ator);
            return lancamento;
        });
    }
    async listarEmendas(ator) {
        await ensureContabilidadeEstrutura();
        const tenantId = ator?.tenantId;
        return prisma.$queryRaw(Prisma.sql `
      SELECT
        id,
        identificacao,
        referencia_legal,
        data_prevista,
        valor_previsto::float8 AS valor_previsto,
        dias_alerta,
        status,
        observacoes
      FROM emenda_impositiva
      WHERE 1 = 1
      ${tenantSql("emenda_impositiva", tenantId)}
      ORDER BY data_prevista DESC, id DESC
    `);
    }
    async buscarEmendaPorIdOuFalhar(id, tx = prisma, tenantId) {
        const rows = await tx.$queryRaw(Prisma.sql `
      SELECT
        id,
        identificacao,
        referencia_legal,
        data_prevista,
        valor_previsto::float8 AS valor_previsto,
        dias_alerta,
        status,
        observacoes
      FROM emenda_impositiva
      WHERE id = ${id}
        ${tenantId ? Prisma.sql `AND tenant_id::text = ${tenantId}` : Prisma.empty}
      LIMIT 1
    `);
        const emenda = rows[0];
        if (!emenda)
            throw new AppError("Emenda impositiva não encontrada.", 404);
        return emenda;
    }
    async criarEmenda(input, ator) {
        await ensureContabilidadeEstrutura();
        const tenantId = ator?.tenantId;
        const rows = await prisma.$queryRaw(Prisma.sql `
      INSERT INTO emenda_impositiva (
        tenant_id,
        identificacao,
        referencia_legal,
        data_prevista,
        valor_previsto,
        dias_alerta,
        status,
        observacoes,
        criado_em,
        atualizado_em
      ) VALUES (
        ${tenantId ? Prisma.sql `CAST(${tenantId} AS UUID)` : Prisma.sql `NULL`},
        ${input.identificacao},
        ${trimOrUndefined(input.referenciaLegal ?? undefined)},
        ${toOptionalDate(input.dataPrevista)},
        ${input.valorPrevisto},
        ${input.diasAlerta},
        ${input.status},
        ${trimOrUndefined(input.observacoes ?? undefined)},
        NOW(),
        NOW()
      )
      RETURNING id
    `);
        const id = rows[0]?.id;
        if (!id)
            throw new AppError("Não foi possível criar a emenda.", 500);
        return this.buscarEmendaPorIdOuFalhar(id, prisma, tenantId);
    }
    async atualizarStatusEmenda(id, status, ator) {
        await ensureContabilidadeEstrutura();
        const tenantId = ator?.tenantId;
        await this.buscarEmendaPorIdOuFalhar(id, prisma, tenantId);
        await prisma.$executeRaw(Prisma.sql `
      UPDATE emenda_impositiva
      SET status = ${status}, atualizado_em = NOW()
      WHERE id = ${id}
        AND ${tenantId ? Prisma.sql `tenant_id::text = ${tenantId}` : Prisma.sql `1 = 1`}
    `);
        return this.buscarEmendaPorIdOuFalhar(id, prisma, tenantId);
    }
    async baixarLancamentoTx(tx, id, input, ator) {
        const lancamento = await this.buscarLancamentoPorIdOuFalhar(id, tx);
        if (["PAGO", "RECEBIDO", "CONCILIADO"].includes(lancamento.situacao)) {
            throw new AppError("O lançamento já foi baixado.", 409);
        }
        const tipo = normalizarTipoLancamento(lancamento.tipo);
        const contaId = input.contaBancariaId
            ? BigInt(input.contaBancariaId)
            : lancamento.conta_bancaria_id;
        if (!contaId) {
            throw new AppError("Selecione a conta financeira para efetivar o pagamento ou recebimento.", 400);
        }
        const conta = await this.validarContaMovimentavel(tx, contaId, true, true);
        await this.criarMovimentacaoInterna(tx, {
            contaId,
            tipo: tipoMovimentacaoPorLancamento(tipo, lancamento.direcao_ajuste ? normalizarDirecaoAjuste(lancamento.direcao_ajuste) : undefined),
            descricao: lancamento.historico ?? lancamento.descricao,
            contraparte: lancamento.contraparte,
            categoria: lancamento.categoria_nome ?? lancamento.natureza ?? lancamento.tipo,
            categoriaId: lancamento.categoria_financeira_id ? Number(lancamento.categoria_financeira_id) : undefined,
            centroCustoId: lancamento.centro_custo_id ? Number(lancamento.centro_custo_id) : undefined,
            dataMovimentacao: input.data ?? new Date().toISOString().slice(0, 10),
            valor: lancamento.valor,
            origem: lancamento.origem ? `${lancamento.origem}_BAIXA` : "BAIXA",
            observacao: trimOrUndefined(input.observacao ?? undefined),
            lancamentoId: id
        });
        const statusFinal = statusBaixadoPorTipo(tipo, lancamento.direcao_ajuste ? normalizarDirecaoAjuste(lancamento.direcao_ajuste) : undefined);
        const dataBaixaIso = input.data ?? new Date().toISOString().slice(0, 10);
        await tx.$executeRaw(Prisma.sql `
      UPDATE lancamento_financeiro
      SET
        conta_bancaria_id = ${contaId},
        forma_pagamento = ${trimOrUndefined(input.formaPagamento ?? undefined) ?? lancamento.forma_pagamento},
        observacao = ${trimOrUndefined(input.observacao ?? undefined) ?? lancamento.observacao},
        data_baixa = ${toOptionalDate(dataBaixaIso)},
        responsavel = ${trimOrUndefined(input.responsavel ?? undefined) ?? lancamento.responsavel},
        situacao = ${statusFinal},
        atualizado_em = NOW()
      WHERE id = ${id}
    `);
        await this.registrarHistorico(tx, {
            aba: "Lançamentos",
            acao: tipoMovimentacaoPorLancamento(tipo, lancamento.direcao_ajuste ? normalizarDirecaoAjuste(lancamento.direcao_ajuste) : undefined) === "ENTRADA"
                ? "Recebimento confirmado"
                : "Pagamento confirmado",
            tipoRegistro: "LANCAMENTO",
            registroId: String(id),
            valor: lancamento.valor,
            conta: conta.nome_conta,
            statusAnterior: lancamento.situacao,
            statusNovo: statusFinal,
            observacao: "Baixa financeira registrada e saldo atualizado.",
            origem: lancamento.origem,
            ator
        });
        return {
            numeroRecibo: gerarNumeroRecibo(id),
            dataPagamento: dataBaixaIso,
            valorTotal: lancamento.valor,
            compraId: lancamento.compra_id ? Number(lancamento.compra_id) : undefined,
            descricao: lancamento.descricao,
            responsavel: trimOrUndefined(input.responsavel ?? undefined) ?? undefined
        };
    }
    async validarContaMovimentavel(tx, id, exigirMovimentacao = true, usarSaldoReal = false) {
        const conta = usarSaldoReal
            ? await this.buscarContaBancariaPorIdComSaldoRealOuFalhar(id, tx)
            : await this.buscarContaBancariaPorIdOuFalhar(id, tx);
        if (normalizarStatusConta(conta.status) !== "ATIVA") {
            throw new AppError("A conta selecionada está inativa.", 409);
        }
        if (exigirMovimentacao && !conta.permite_movimentacao) {
            throw new AppError("A conta selecionada não permite novas movimentações.", 409);
        }
        return conta;
    }
    async criarMovimentacaoInterna(tx, input) {
        let saldoAnterior = null;
        let saldoAtual = null;
        if (input.contaId) {
            const conta = await this.validarContaMovimentavel(tx, input.contaId, true, true);
            if (input.tipo === "SAIDA" && conta.saldo < input.valor) {
                throw new AppError("Não há saldo suficiente nesta conta para concluir o débito informado.", 409);
            }
            saldoAnterior = conta.saldo;
            saldoAtual = calcularSaldoConta(conta.saldo, input.valor, input.tipo);
            await tx.$executeRaw(Prisma.sql `
        UPDATE conta_bancaria
        SET saldo = ${saldoAtual}, data_atualizacao = NOW(), atualizado_em = NOW()
        WHERE id = ${input.contaId}
      `);
        }
        const rows = await tx.$queryRaw(Prisma.sql `
      INSERT INTO movimentacao_financeira (
        tipo,
        descricao,
        contraparte,
        categoria,
        categoria_financeira_id,
        centro_custo_id,
        conta_bancaria_id,
        data_movimentacao,
        valor,
        origem,
        observacao,
        saldo_anterior,
        saldo_atual,
        lancamento_financeiro_id,
        transferencia_id,
        ativo,
        criado_em,
        atualizado_em
      ) VALUES (
        ${input.tipo},
        ${input.descricao},
        ${trimOrUndefined(input.contraparte ?? undefined)},
        ${trimOrUndefined(input.categoria ?? undefined)},
        ${input.categoriaId ? BigInt(input.categoriaId) : null},
        ${input.centroCustoId ? BigInt(input.centroCustoId) : null},
        ${input.contaId},
        ${toOptionalDate(input.dataMovimentacao)},
        ${input.valor},
        ${trimOrUndefined(input.origem ?? undefined)},
        ${trimOrUndefined(input.observacao ?? undefined)},
        ${saldoAnterior},
        ${saldoAtual},
        ${input.lancamentoId ?? null},
        ${input.transferenciaId ?? null},
        TRUE,
        NOW(),
        NOW()
      )
      RETURNING id
    `);
        const id = rows[0]?.id;
        if (!id) {
            throw new AppError("Não foi possível criar a movimentação financeira.", 500);
        }
        return this.buscarMovimentacaoPorIdOuFalhar(id, tx);
    }
    async sincronizarSaldoContaPorLancamento(tx, lancamento) {
        const movimentacoesVinculadas = await tx.$queryRaw(Prisma.sql `
      ${MOVIMENTACAO_SELECT}
      WHERE m.ativo = TRUE
        AND m.lancamento_financeiro_id = ${lancamento.id}
      ORDER BY m.id ASC
    `);
        const lancamentoLiquidado = ["PAGO", "RECEBIDO", "CONCILIADO"].includes(normalizarTextoEnum(lancamento.situacao));
        if (!lancamentoLiquidado) {
            for (const movimentacao of movimentacoesVinculadas) {
                await this.reverterMovimentacaoConta(tx, movimentacao);
                await tx.$executeRaw(Prisma.sql `
          UPDATE movimentacao_financeira
          SET ativo = FALSE, atualizado_em = NOW()
          WHERE id = ${movimentacao.id}
        `);
            }
            return;
        }
        if (!lancamento.conta_bancaria_id) {
            throw new AppError("Selecione a conta bancária para atualizar o saldo ao salvar um lançamento liquidado.", 400);
        }
        await this.validarContaMovimentavel(tx, lancamento.conta_bancaria_id);
        const tipoMovimentacao = tipoMovimentacaoPorLancamento(normalizarTipoLancamento(lancamento.tipo), lancamento.direcao_ajuste ? normalizarDirecaoAjuste(lancamento.direcao_ajuste) : undefined);
        const dataEfetivacao = toIsoDate(lancamento.data_baixa) ??
            toIsoDate(lancamento.data_lancamento) ??
            toIsoDate(lancamento.vencimento) ??
            new Date().toISOString().slice(0, 10);
        const movimentacaoAtual = movimentacoesVinculadas[0];
        const movimentacaoJaCorreta = movimentacoesVinculadas.length === 1 &&
            movimentacaoAtual &&
            movimentacaoAtual.conta_bancaria_id === lancamento.conta_bancaria_id &&
            this.normalizarTipoMovimentacao(movimentacaoAtual.tipo) === tipoMovimentacao &&
            movimentacaoAtual.valor === lancamento.valor &&
            toIsoDate(movimentacaoAtual.data_movimentacao) === dataEfetivacao;
        if (movimentacaoJaCorreta) {
            return;
        }
        for (const movimentacao of movimentacoesVinculadas) {
            await this.reverterMovimentacaoConta(tx, movimentacao);
            await tx.$executeRaw(Prisma.sql `
        UPDATE movimentacao_financeira
        SET ativo = FALSE, atualizado_em = NOW()
        WHERE id = ${movimentacao.id}
      `);
        }
        await this.criarMovimentacaoInterna(tx, {
            contaId: lancamento.conta_bancaria_id,
            tipo: tipoMovimentacao,
            descricao: lancamento.historico ?? lancamento.descricao,
            contraparte: lancamento.contraparte,
            categoria: lancamento.categoria_nome ?? lancamento.natureza ?? lancamento.tipo,
            categoriaId: lancamento.categoria_financeira_id
                ? Number(lancamento.categoria_financeira_id)
                : undefined,
            centroCustoId: lancamento.centro_custo_id ? Number(lancamento.centro_custo_id) : undefined,
            dataMovimentacao: dataEfetivacao,
            valor: lancamento.valor,
            origem: lancamento.origem ? `${lancamento.origem}_LANCAMENTO` : "LANCAMENTO",
            observacao: trimOrUndefined(lancamento.observacao ?? undefined),
            lancamentoId: lancamento.id
        });
        if (!lancamento.data_baixa) {
            await tx.$executeRaw(Prisma.sql `
        UPDATE lancamento_financeiro
        SET data_baixa = ${toOptionalDate(dataEfetivacao)}, atualizado_em = NOW()
        WHERE id = ${lancamento.id}
      `);
        }
    }
    async reverterMovimentacaoConta(tx, movimentacao) {
        if (!movimentacao.conta_bancaria_id)
            return;
        const conta = await this.buscarContaBancariaPorIdComSaldoRealOuFalhar(movimentacao.conta_bancaria_id, tx);
        const tipo = this.normalizarTipoMovimentacao(movimentacao.tipo);
        const saldo = tipo === "ENTRADA"
            ? conta.saldo - movimentacao.valor
            : conta.saldo + movimentacao.valor;
        await tx.$executeRaw(Prisma.sql `
      UPDATE conta_bancaria
      SET saldo = ${saldo}, data_atualizacao = NOW(), atualizado_em = NOW()
      WHERE id = ${movimentacao.conta_bancaria_id}
    `);
    }
    normalizarTipoMovimentacao(valor) {
        const normalizado = normalizarTextoEnum(valor);
        return ["ENTRADA", "CREDITO", "RECEITA", "RECEBIMENTO"].includes(normalizado)
            ? "ENTRADA"
            : "SAIDA";
    }
    async calcularDiferencaConciliacao(tx, input) {
        if (input.lancamentoFinanceiroId) {
            const lancamento = await this.buscarLancamentoPorIdOuFalhar(BigInt(input.lancamentoFinanceiroId), tx);
            return Number(input.valorExtrato) - Number(lancamento.valor);
        }
        if (input.movimentacaoFinanceiraId) {
            const movimentacao = await this.buscarMovimentacaoPorIdOuFalhar(BigInt(input.movimentacaoFinanceiraId), tx);
            return Number(input.valorExtrato) - Number(movimentacao.valor);
        }
        return 0;
    }
    async registrarHistorico(tx, input) {
        const usuarioIdValido = await this.resolverUsuarioIdHistorico(tx, input.ator?.usuarioId);
        await tx.$executeRaw(Prisma.sql `
      INSERT INTO financeiro_historico (
        tenant_id,
        aba,
        acao,
        tipo_registro,
        registro_id,
        valor,
        conta,
        status_anterior,
        status_novo,
        observacao,
        origem,
        usuario_id,
        usuario_nome,
        perfil,
        ip,
        maquina,
        criado_em
      ) VALUES (
        ${input.ator?.tenantId ? Prisma.sql `CAST(${input.ator.tenantId} AS UUID)` : Prisma.sql `NULL`},
        ${input.aba},
        ${input.acao},
        ${input.tipoRegistro},
        ${trimOrUndefined(input.registroId ?? undefined)},
        ${input.valor ?? null},
        ${trimOrUndefined(input.conta ?? undefined)},
        ${trimOrUndefined(input.statusAnterior ?? undefined)},
        ${trimOrUndefined(input.statusNovo ?? undefined)},
        ${trimOrUndefined(input.observacao ?? undefined)},
        ${trimOrUndefined(input.origem ?? undefined)},
        ${usuarioIdValido},
        ${trimOrUndefined(input.ator?.nomeUsuario ?? undefined)},
        ${input.ator?.permissoes?.join(", ") ?? null},
        ${trimOrUndefined(input.ator?.ip ?? undefined)},
        ${trimOrUndefined(input.ator?.maquina ?? undefined)},
        NOW()
      )
    `);
    }
    async resolverUsuarioIdHistorico(tx, usuarioId) {
        if (!usuarioId) {
            return null;
        }
        const rows = await tx.$queryRaw(Prisma.sql `
      SELECT id
      FROM usuarios
      WHERE id = ${usuarioId}
      LIMIT 1
    `);
        return rows[0]?.id ?? null;
    }
}
