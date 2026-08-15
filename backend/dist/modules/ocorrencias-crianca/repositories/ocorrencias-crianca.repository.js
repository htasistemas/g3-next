import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
const estruturaSql = [
    `
  CREATE TABLE IF NOT EXISTS ocorrencias_crianca (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
  )
  `,
    `
  CREATE TABLE IF NOT EXISTS ocorrencias_crianca_anexo (
    id BIGSERIAL PRIMARY KEY,
    ocorrencia_id BIGINT NOT NULL REFERENCES ocorrencias_crianca(id) ON DELETE CASCADE,
    nome_arquivo TEXT NOT NULL,
    tipo_mime TEXT NOT NULL,
    conteudo_base64 TEXT NOT NULL,
    ordem INTEGER NOT NULL DEFAULT 0,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
  )
  `,
    `
  ALTER TABLE ocorrencias_crianca
  ADD COLUMN IF NOT EXISTS tenant_id UUID
  `,
    `
  UPDATE ocorrencias_crianca o
  SET tenant_id = ua.tenant_id
  FROM unidade_assistencial ua
  WHERE o.tenant_id IS NULL
    AND NULLIF(TRIM(COALESCE(o.payload->>'unidadeAssistencialId', '')), '') ~ '^[0-9]+$'
    AND ua.id = (o.payload->>'unidadeAssistencialId')::bigint
    AND ua.tenant_id IS NOT NULL
  `,
    "CREATE INDEX IF NOT EXISTS ocorrencias_crianca_data_idx ON ocorrencias_crianca ((payload->>'dataPreenchimento'))",
    "CREATE INDEX IF NOT EXISTS ocorrencias_crianca_tenant_idx ON ocorrencias_crianca(tenant_id)",
    "CREATE INDEX IF NOT EXISTS ocorrencias_crianca_anexo_ocorrencia_idx ON ocorrencias_crianca_anexo(ocorrencia_id)"
];
let estruturaPromise = null;
export async function ensureOcorrenciasCriancaEstrutura() {
    if (!estruturaPromise) {
        estruturaPromise = (async () => {
            for (const comando of estruturaSql) {
                await prisma.$executeRawUnsafe(comando);
            }
        })();
    }
    await estruturaPromise;
}
export class OcorrenciasCriancaRepository {
    async garantirEstrutura() {
        await ensureOcorrenciasCriancaEstrutura();
    }
    async listar(tenantId) {
        await this.garantirEstrutura();
        return prisma.$queryRaw(Prisma.sql `
      SELECT id, payload, criado_em, atualizado_em
      FROM ocorrencias_crianca
      WHERE tenant_id::text = ${tenantId}
      ORDER BY id DESC
    `);
    }
    async obter(id, tenantId) {
        await this.garantirEstrutura();
        const rows = await prisma.$queryRaw(Prisma.sql `
      SELECT id, payload, criado_em, atualizado_em
      FROM ocorrencias_crianca
      WHERE id = ${id}
        AND tenant_id::text = ${tenantId}
      LIMIT 1
    `);
        return rows[0] ?? null;
    }
    async obterOuFalhar(id, tenantId) {
        const row = await this.obter(id, tenantId);
        if (!row)
            throw new AppError("Ocorrencia nao encontrada.", 404);
        return row;
    }
    async criar(input, tenantId) {
        await this.garantirEstrutura();
        const inserted = await prisma.$queryRaw(Prisma.sql `
      INSERT INTO ocorrencias_crianca (tenant_id, payload, criado_em, atualizado_em)
      VALUES (
        ${tenantId}::uuid,
        ${input},
        NOW(),
        NOW()
      )
      RETURNING id
    `);
        const id = inserted[0]?.id;
        if (!id)
            throw new AppError("Nao foi possivel criar ocorrencia.", 500);
        return this.obterOuFalhar(id, tenantId);
    }
    async atualizar(id, input, tenantId) {
        await this.garantirEstrutura();
        await this.obterOuFalhar(id, tenantId);
        await prisma.$executeRaw(Prisma.sql `
      UPDATE ocorrencias_crianca
      SET payload = ${input}, atualizado_em = NOW()
      WHERE id = ${id}
        AND tenant_id::text = ${tenantId}
    `);
        return this.obterOuFalhar(id, tenantId);
    }
    async remover(id, tenantId) {
        await this.garantirEstrutura();
        await this.obterOuFalhar(id, tenantId);
        await prisma.$executeRaw(Prisma.sql `
      DELETE FROM ocorrencias_crianca
      WHERE id = ${id}
        AND tenant_id::text = ${tenantId}
    `);
    }
    async listarAnexos(ocorrenciaId, tenantId) {
        await this.garantirEstrutura();
        await this.obterOuFalhar(ocorrenciaId, tenantId);
        return prisma.$queryRaw(Prisma.sql `
      SELECT
        id,
        ocorrencia_id,
        nome_arquivo,
        tipo_mime,
        conteudo_base64,
        ordem,
        criado_em,
        atualizado_em
      FROM ocorrencias_crianca_anexo
      WHERE ocorrencia_id = ${ocorrenciaId}
      ORDER BY ordem ASC, id ASC
    `);
    }
    async adicionarAnexo(ocorrenciaId, input, tenantId) {
        await this.garantirEstrutura();
        await this.obterOuFalhar(ocorrenciaId, tenantId);
        const inserted = await prisma.$queryRaw(Prisma.sql `
      INSERT INTO ocorrencias_crianca_anexo (
        ocorrencia_id,
        nome_arquivo,
        tipo_mime,
        conteudo_base64,
        ordem,
        criado_em,
        atualizado_em
      ) VALUES (
        ${ocorrenciaId},
        ${input.nomeArquivo},
        ${input.tipoMime},
        ${input.conteudoBase64},
        ${input.ordem},
        NOW(),
        NOW()
      )
      RETURNING id
    `);
        const id = inserted[0]?.id;
        if (!id)
            throw new AppError("Nao foi possivel adicionar anexo.", 500);
        const rows = await prisma.$queryRaw(Prisma.sql `
      SELECT
        id,
        ocorrencia_id,
        nome_arquivo,
        tipo_mime,
        conteudo_base64,
        ordem,
        criado_em,
        atualizado_em
      FROM ocorrencias_crianca_anexo
      WHERE id = ${id}
      LIMIT 1
    `);
        const registro = rows[0];
        if (!registro)
            throw new AppError("Anexo nao encontrado apos criacao.", 500);
        return registro;
    }
    async removerAnexo(ocorrenciaId, anexoId, tenantId) {
        await this.garantirEstrutura();
        await this.obterOuFalhar(ocorrenciaId, tenantId);
        await prisma.$executeRaw(Prisma.sql `
      DELETE FROM ocorrencias_crianca_anexo
      WHERE id = ${anexoId}
        AND ocorrencia_id = ${ocorrenciaId}
    `);
    }
}
