import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { descriptografarSegredo } from "../../../shared/security/secret-crypto.js";

export type MercadoPagoRuntimeConfig = {
  ativo: boolean;
  accessToken?: string;
  webhookSecret?: string;
  apiUrl: string;
  webhookUrl?: string;
  timeoutMs: number;
};

export class MercadoPagoConfigRepository {
  async obter(tenantId?: string): Promise<MercadoPagoRuntimeConfig | undefined> {
    if (!tenantId?.trim()) return undefined;
    const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT ativo, ambiente, url_base, timeout_ms, credencial_criptografada,
             credencial_secundaria_criptografada, webhook_url
        FROM integracao_configuracao_global
       WHERE tipo = 'MERCADO_PAGO'
         AND (
           COALESCE(escopo, 'TODOS') = 'TODOS'
           OR (COALESCE(escopo, 'TODOS') = 'SELECIONADOS' AND EXISTS (
             SELECT 1 FROM integracao_configuracao_clientes c
              WHERE c.tipo = 'MERCADO_PAGO' AND c.tenant_id::text = ${tenantId.trim()} AND c.habilitada = TRUE
           ))
         )
       LIMIT 1
    `);
    const row = rows[0];
    if (!row) return undefined;
    return {
      ativo: Boolean(row.ativo),
      accessToken: descriptografarSegredo(row.credencial_criptografada),
      webhookSecret: descriptografarSegredo(row.credencial_secundaria_criptografada),
      apiUrl: String(row.url_base ?? "https://api.mercadopago.com"),
      webhookUrl: typeof row.webhook_url === "string" ? row.webhook_url : undefined,
      timeoutMs: Number(row.timeout_ms ?? 15000)
    };
  }
}
