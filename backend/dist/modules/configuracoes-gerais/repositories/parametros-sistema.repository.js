import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
const CHAVE_PERSONALIZACAO = "PERSONALIZACAO_VISUAL";
const CHAVE_CARENCIA_DOACAO_REALIZADA = "DOACAO_REALIZADA_CARENCIA";
const CHAVE_OBRIGATORIEDADE_DOCUMENTOS_BENEFICIARIO = "BENEFICIARIO_DOCUMENTOS_OBRIGATORIEDADE";
const CHAVE_ALERTAS_CENTRAL_ATENDIMENTOS = "CENTRAL_ATENDIMENTOS_ALERTAS";
const estruturaSql = [
    `
    CREATE TABLE IF NOT EXISTS parametros_sistema (
      id BIGSERIAL PRIMARY KEY,
      tenant_id UUID,
      chave VARCHAR(100) NOT NULL,
      valor_json JSONB NOT NULL,
      criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
      atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
      atualizado_por VARCHAR(120)
    )
  `,
    "ALTER TABLE parametros_sistema ADD COLUMN IF NOT EXISTS tenant_id UUID",
    "ALTER TABLE parametros_sistema DROP CONSTRAINT IF EXISTS parametros_sistema_chave_key",
    "DROP INDEX IF EXISTS parametros_sistema_chave_key",
    `
    UPDATE parametros_sistema
    SET tenant_id = ref.tenant_id
    FROM (
      SELECT tenant_id
      FROM instituicoes
      ORDER BY criado_em ASC
      LIMIT 1
    ) ref
    WHERE parametros_sistema.tenant_id IS NULL
  `,
    "CREATE UNIQUE INDEX IF NOT EXISTS parametros_sistema_tenant_chave_uidx ON parametros_sistema (tenant_id, chave)",
    "CREATE INDEX IF NOT EXISTS parametros_sistema_tenant_idx ON parametros_sistema (tenant_id, atualizado_em DESC)",
    "CREATE INDEX IF NOT EXISTS parametros_sistema_chave_idx ON parametros_sistema (chave)"
];
let estruturaPromise = null;
export class ParametrosSistemaRepository {
    async buscarPorChaveGenerica(chave, tenantId) {
        return this.buscarPorChave(chave, tenantId);
    }
    async salvarPorChaveGenerica(chave, valor, usuarioAtualizacao, tenantId) {
        return this.salvarPorChave(chave, valor, usuarioAtualizacao, tenantId);
    }
    async buscarPersonalizacao(tenantId) {
        return this.buscarPorChave(CHAVE_PERSONALIZACAO, tenantId);
    }
    async salvarPersonalizacao(valor, usuarioAtualizacao, tenantId) {
        return this.salvarPorChave(CHAVE_PERSONALIZACAO, valor, usuarioAtualizacao, tenantId);
    }
    async buscarCarenciaDoacaoRealizada(tenantId) {
        return this.buscarPorChave(CHAVE_CARENCIA_DOACAO_REALIZADA, tenantId);
    }
    async salvarCarenciaDoacaoRealizada(valor, usuarioAtualizacao, tenantId) {
        return this.salvarPorChave(CHAVE_CARENCIA_DOACAO_REALIZADA, valor, usuarioAtualizacao, tenantId);
    }
    async buscarObrigatoriedadeDocumentosBeneficiario(tenantId) {
        return this.buscarPorChave(CHAVE_OBRIGATORIEDADE_DOCUMENTOS_BENEFICIARIO, tenantId);
    }
    async salvarObrigatoriedadeDocumentosBeneficiario(valor, usuarioAtualizacao, tenantId) {
        return this.salvarPorChave(CHAVE_OBRIGATORIEDADE_DOCUMENTOS_BENEFICIARIO, valor, usuarioAtualizacao, tenantId);
    }
    async buscarAlertasCentralAtendimentos(tenantId) {
        return this.buscarPorChave(CHAVE_ALERTAS_CENTRAL_ATENDIMENTOS, tenantId);
    }
    async salvarAlertasCentralAtendimentos(valor, usuarioAtualizacao, tenantId) {
        return this.salvarPorChave(CHAVE_ALERTAS_CENTRAL_ATENDIMENTOS, valor, usuarioAtualizacao, tenantId);
    }
    async ensureEstrutura() {
        await ensureParametrosSistemaEstrutura();
    }
    async buscarPorChave(chave, tenantId) {
        await this.ensureEstrutura();
        const tenant = this.parseTenantId(tenantId);
        const rows = await prisma.$queryRawUnsafe(`
        SELECT valor_json, atualizado_em
        FROM parametros_sistema
        WHERE chave = $1
          AND tenant_id::text = $2
        LIMIT 1
      `, chave, tenant);
        if (!rows.length)
            return null;
        return {
            valor: rows[0].valor_json,
            atualizado_em: rows[0].atualizado_em
        };
    }
    async salvarPorChave(chave, valor, usuarioAtualizacao, tenantId) {
        await this.ensureEstrutura();
        const rows = await prisma.$queryRawUnsafe(`
        INSERT INTO parametros_sistema (tenant_id, chave, valor_json, atualizado_por, criado_em, atualizado_em)
        VALUES ($1::uuid, $2, $3::jsonb, $4, NOW(), NOW())
        ON CONFLICT (tenant_id, chave)
        DO UPDATE SET
          valor_json = EXCLUDED.valor_json,
          atualizado_por = EXCLUDED.atualizado_por,
          atualizado_em = NOW()
        RETURNING valor_json, atualizado_em
      `, this.parseTenantId(tenantId), chave, JSON.stringify(valor), usuarioAtualizacao);
        return {
            valor: rows[0].valor_json,
            atualizado_em: rows[0].atualizado_em
        };
    }
    parseTenantId(tenantId) {
        const normalizado = tenantId?.trim();
        if (!normalizado) {
            throw new AppError("Tenant da sessao nao identificado.", 401);
        }
        return normalizado;
    }
}
export async function ensureParametrosSistemaEstrutura() {
    if (!estruturaPromise) {
        estruturaPromise = (async () => {
            for (const comando of estruturaSql) {
                await prisma.$executeRawUnsafe(comando);
            }
        })();
    }
    await estruturaPromise;
}
