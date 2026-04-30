import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import type {
  AlertasCentralAtendimentosSistema,
  CarenciaDoacaoRealizadaSistema,
  ObrigatoriedadeDocumentosBeneficiarioSistema,
  PersonalizacaoSistema
} from "../parametros-sistema.types.js";

const CHAVE_PERSONALIZACAO = "PERSONALIZACAO_VISUAL";
const CHAVE_CARENCIA_DOACAO_REALIZADA = "DOACAO_REALIZADA_CARENCIA";
const CHAVE_OBRIGATORIEDADE_DOCUMENTOS_BENEFICIARIO =
  "BENEFICIARIO_DOCUMENTOS_OBRIGATORIEDADE";
const CHAVE_ALERTAS_CENTRAL_ATENDIMENTOS = "CENTRAL_ATENDIMENTOS_ALERTAS";

type RegistroParametroSistema = {
  valor_json: unknown;
  atualizado_em: Date;
};

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
] as const;

let estruturaPromise: Promise<void> | null = null;

export class ParametrosSistemaRepository {
  async buscarPersonalizacao(tenantId?: string) {
    return this.buscarPorChave<PersonalizacaoSistema>(CHAVE_PERSONALIZACAO, tenantId);
  }

  async salvarPersonalizacao(valor: PersonalizacaoSistema, usuarioAtualizacao: string, tenantId: string) {
    return this.salvarPorChave(CHAVE_PERSONALIZACAO, valor, usuarioAtualizacao, tenantId);
  }

  async buscarCarenciaDoacaoRealizada(tenantId?: string) {
    return this.buscarPorChave<CarenciaDoacaoRealizadaSistema>(
      CHAVE_CARENCIA_DOACAO_REALIZADA,
      tenantId
    );
  }

  async salvarCarenciaDoacaoRealizada(
    valor: CarenciaDoacaoRealizadaSistema,
    usuarioAtualizacao: string,
    tenantId: string
  ) {
    return this.salvarPorChave(
      CHAVE_CARENCIA_DOACAO_REALIZADA,
      valor,
      usuarioAtualizacao,
      tenantId
    );
  }

  async buscarObrigatoriedadeDocumentosBeneficiario(tenantId?: string) {
    return this.buscarPorChave<ObrigatoriedadeDocumentosBeneficiarioSistema>(
      CHAVE_OBRIGATORIEDADE_DOCUMENTOS_BENEFICIARIO,
      tenantId
    );
  }

  async salvarObrigatoriedadeDocumentosBeneficiario(
    valor: ObrigatoriedadeDocumentosBeneficiarioSistema,
    usuarioAtualizacao: string,
    tenantId: string
  ) {
    return this.salvarPorChave(
      CHAVE_OBRIGATORIEDADE_DOCUMENTOS_BENEFICIARIO,
      valor,
      usuarioAtualizacao,
      tenantId
    );
  }

  async buscarAlertasCentralAtendimentos(tenantId?: string) {
    return this.buscarPorChave<AlertasCentralAtendimentosSistema>(
      CHAVE_ALERTAS_CENTRAL_ATENDIMENTOS,
      tenantId
    );
  }

  async salvarAlertasCentralAtendimentos(
    valor: AlertasCentralAtendimentosSistema,
    usuarioAtualizacao: string,
    tenantId: string
  ) {
    return this.salvarPorChave(
      CHAVE_ALERTAS_CENTRAL_ATENDIMENTOS,
      valor,
      usuarioAtualizacao,
      tenantId
    );
  }

  private async ensureEstrutura() {
    await ensureParametrosSistemaEstrutura();
  }

  private async buscarPorChave<T>(chave: string, tenantId?: string) {
    await this.ensureEstrutura();
    const tenant = this.parseTenantId(tenantId);

    const rows = await prisma.$queryRawUnsafe<RegistroParametroSistema[]>(
      `
        SELECT valor_json, atualizado_em
        FROM parametros_sistema
        WHERE chave = $1
          AND tenant_id::text = $2
        LIMIT 1
      `,
      chave,
      tenant
    );

    if (!rows.length) return null;

    return {
      valor: rows[0].valor_json as T,
      atualizado_em: rows[0].atualizado_em
    };
  }

  private async salvarPorChave<T>(
    chave: string,
    valor: T,
    usuarioAtualizacao: string,
    tenantId: string
  ) {
    await this.ensureEstrutura();

    const rows = await prisma.$queryRawUnsafe<RegistroParametroSistema[]>(
      `
        INSERT INTO parametros_sistema (tenant_id, chave, valor_json, atualizado_por, criado_em, atualizado_em)
        VALUES ($1::uuid, $2, $3::jsonb, $4, NOW(), NOW())
        ON CONFLICT (tenant_id, chave)
        DO UPDATE SET
          valor_json = EXCLUDED.valor_json,
          atualizado_por = EXCLUDED.atualizado_por,
          atualizado_em = NOW()
        RETURNING valor_json, atualizado_em
      `,
      this.parseTenantId(tenantId),
      chave,
      JSON.stringify(valor),
      usuarioAtualizacao
    );

    return {
      valor: rows[0].valor_json as T,
      atualizado_em: rows[0].atualizado_em
    };
  }

  private parseTenantId(tenantId?: string) {
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
