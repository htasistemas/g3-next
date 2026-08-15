import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { toOptionalDate, trimOrUndefined } from "../../../utils/string-utils.js";
let estruturaPromise = null;
function tenantSql(alias, tenantId) {
    return Prisma.sql `${Prisma.raw(alias)}.tenant_id::text = ${tenantId}`;
}
async function ensureDoacaoPlanejadaEstrutura() {
    if (!estruturaPromise) {
        estruturaPromise = (async () => {
            const comandos = [
                `
        CREATE TABLE IF NOT EXISTS doacao_planejada (
          id BIGSERIAL PRIMARY KEY,
          beneficiario_id BIGINT REFERENCES cadastro_beneficiario(id) ON DELETE SET NULL,
          vinculo_familiar_id BIGINT REFERENCES vinculo_familiar(id) ON DELETE SET NULL,
          almoxarifado_item_id BIGINT NOT NULL REFERENCES almoxarifado_item(id) ON DELETE RESTRICT,
          quantidade INTEGER NOT NULL,
          data_prevista DATE NOT NULL,
          prioridade VARCHAR(20) NOT NULL,
          status VARCHAR(20) NOT NULL,
          observacoes TEXT,
          motivo_cancelamento TEXT,
          tenant_id UUID,
          criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
          atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
        )
        `,
                `
        ALTER TABLE doacao_planejada
          ADD COLUMN IF NOT EXISTS tenant_id UUID
        `,
                `
        CREATE INDEX IF NOT EXISTS doacao_planejada_tenant_id_idx
          ON doacao_planejada (tenant_id, data_prevista DESC)
        `,
                `
        CREATE INDEX IF NOT EXISTS doacao_planejada_status_data_idx
          ON doacao_planejada (status, data_prevista)
        `,
                `
        CREATE INDEX IF NOT EXISTS doacao_planejada_beneficiario_idx
          ON doacao_planejada (beneficiario_id)
        `,
                `
        UPDATE doacao_planejada AS dp
        SET tenant_id = ref.tenant_id
        FROM (
          SELECT tenant_id
          FROM instituicoes
          ORDER BY criado_em ASC
          LIMIT 1
        ) ref
        WHERE dp.tenant_id IS NULL
        `
            ];
            for (const comando of comandos) {
                await prisma.$executeRawUnsafe(comando);
            }
        })();
    }
    await estruturaPromise;
}
export class DoacaoPlanejadaRepository {
    async listar(filters, tenantId) {
        await ensureDoacaoPlanejadaEstrutura();
        const where = [tenantSql("dp", tenantId)];
        const beneficiarioId = Number(filters.beneficiario_id);
        if (Number.isInteger(beneficiarioId) && beneficiarioId > 0) {
            where.push(Prisma.sql `dp.beneficiario_id = ${BigInt(beneficiarioId)}`);
        }
        const vinculoFamiliarId = Number(filters.vinculo_familiar_id);
        if (Number.isInteger(vinculoFamiliarId) && vinculoFamiliarId > 0) {
            where.push(Prisma.sql `dp.vinculo_familiar_id = ${BigInt(vinculoFamiliarId)}`);
        }
        const status = trimOrUndefined(filters.status);
        if (status) {
            where.push(Prisma.sql `dp.status ILIKE ${`%${status}%`}`);
        }
        const dataInicial = toOptionalDate(filters.data_inicial);
        if (dataInicial) {
            where.push(Prisma.sql `dp.data_prevista >= ${dataInicial}`);
        }
        const dataFinal = toOptionalDate(filters.data_final);
        if (dataFinal) {
            where.push(Prisma.sql `dp.data_prevista <= ${dataFinal}`);
        }
        return prisma.$queryRaw(Prisma.sql `
      SELECT
        dp.id,
        dp.beneficiario_id,
        dp.vinculo_familiar_id,
        b.nome_completo AS beneficiario_nome,
        vf.nome_familia AS familia_nome,
        dp.almoxarifado_item_id,
        ai.codigo AS item_codigo,
        ai.descricao AS item_descricao,
        ai.unidade AS item_unidade,
        dp.quantidade,
        dp.data_prevista,
        dp.prioridade,
        dp.status,
        dp.observacoes,
        dp.motivo_cancelamento,
        dp.criado_em,
        dp.atualizado_em
      FROM doacao_planejada dp
      INNER JOIN almoxarifado_item ai ON ai.id = dp.almoxarifado_item_id
      LEFT JOIN cadastro_beneficiario b ON b.id = dp.beneficiario_id
      LEFT JOIN vinculo_familiar vf ON vf.id = dp.vinculo_familiar_id
      WHERE ${Prisma.join(where, " AND ")}
      ORDER BY dp.data_prevista ASC, dp.id DESC
    `);
    }
    async buscarPorId(id, tenantId) {
        await ensureDoacaoPlanejadaEstrutura();
        const rows = await prisma.$queryRaw(Prisma.sql `
      SELECT
        dp.id,
        dp.beneficiario_id,
        dp.vinculo_familiar_id,
        b.nome_completo AS beneficiario_nome,
        vf.nome_familia AS familia_nome,
        dp.almoxarifado_item_id,
        ai.codigo AS item_codigo,
        ai.descricao AS item_descricao,
        ai.unidade AS item_unidade,
        dp.quantidade,
        dp.data_prevista,
        dp.prioridade,
        dp.status,
        dp.observacoes,
        dp.motivo_cancelamento,
        dp.criado_em,
        dp.atualizado_em
      FROM doacao_planejada dp
      INNER JOIN almoxarifado_item ai ON ai.id = dp.almoxarifado_item_id
      LEFT JOIN cadastro_beneficiario b ON b.id = dp.beneficiario_id
      LEFT JOIN vinculo_familiar vf ON vf.id = dp.vinculo_familiar_id
      WHERE dp.id = ${id}
        AND ${tenantSql("dp", tenantId)}
      LIMIT 1
    `);
        return rows[0] ?? null;
    }
    async buscarPorIdOuFalhar(id, tenantId) {
        const row = await this.buscarPorId(id, tenantId);
        if (!row) {
            throw new AppError("Doacao planejada nao encontrada.", 404);
        }
        return row;
    }
    async criar(input, tenantId) {
        await ensureDoacaoPlanejadaEstrutura();
        const inserted = await prisma.$queryRaw(Prisma.sql `
      INSERT INTO doacao_planejada (
        beneficiario_id,
        vinculo_familiar_id,
        almoxarifado_item_id,
        quantidade,
        data_prevista,
        prioridade,
        status,
        observacoes,
        motivo_cancelamento,
        tenant_id,
        criado_em,
        atualizado_em
      ) VALUES (
        ${input.beneficiario_id ? BigInt(input.beneficiario_id) : null},
        ${input.vinculo_familiar_id ? BigInt(input.vinculo_familiar_id) : null},
        ${BigInt(input.item_id)},
        ${input.quantidade},
        ${toOptionalDate(input.data_prevista)},
        ${input.prioridade},
        ${input.status},
        ${trimOrUndefined(input.observacoes)},
        ${trimOrUndefined(input.motivo_cancelamento)},
        ${tenantId}::uuid,
        NOW(),
        NOW()
      )
      RETURNING id
    `);
        const id = inserted[0]?.id;
        if (!id) {
            throw new AppError("Nao foi possivel criar a doacao planejada.", 500);
        }
        return this.buscarPorIdOuFalhar(id, tenantId);
    }
    async atualizar(id, input, tenantId) {
        await ensureDoacaoPlanejadaEstrutura();
        await this.buscarPorIdOuFalhar(id, tenantId);
        await prisma.$executeRaw(Prisma.sql `
      UPDATE doacao_planejada
      SET
        beneficiario_id = ${input.beneficiario_id ? BigInt(input.beneficiario_id) : null},
        vinculo_familiar_id = ${input.vinculo_familiar_id ? BigInt(input.vinculo_familiar_id) : null},
        almoxarifado_item_id = ${BigInt(input.item_id)},
        quantidade = ${input.quantidade},
        data_prevista = ${toOptionalDate(input.data_prevista)},
        prioridade = ${input.prioridade},
        status = ${input.status},
        observacoes = ${trimOrUndefined(input.observacoes)},
        motivo_cancelamento = ${trimOrUndefined(input.motivo_cancelamento)},
        atualizado_em = NOW()
      WHERE id = ${id}
        AND ${tenantSql("doacao_planejada", tenantId)}
    `);
        return this.buscarPorIdOuFalhar(id, tenantId);
    }
    async remover(id, tenantId) {
        await ensureDoacaoPlanejadaEstrutura();
        await this.buscarPorIdOuFalhar(id, tenantId);
        await prisma.$executeRaw(Prisma.sql `
      DELETE FROM doacao_planejada
      WHERE id = ${id}
        AND ${tenantSql("doacao_planejada", tenantId)}
    `);
    }
}
