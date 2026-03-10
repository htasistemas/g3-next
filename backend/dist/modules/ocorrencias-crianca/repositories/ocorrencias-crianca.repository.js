import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
const estruturaSql = [
    `
  CREATE TABLE IF NOT EXISTS ocorrencias_crianca (
    id BIGSERIAL PRIMARY KEY,
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
    "CREATE INDEX IF NOT EXISTS ocorrencias_crianca_data_idx ON ocorrencias_crianca ((payload->>'dataPreenchimento'))",
    "CREATE INDEX IF NOT EXISTS ocorrencias_crianca_anexo_ocorrencia_idx ON ocorrencias_crianca_anexo(ocorrencia_id)"
];
export class OcorrenciasCriancaRepository {
    estruturaGarantida = false;
    async garantirEstrutura() {
        if (this.estruturaGarantida)
            return;
        for (const comando of estruturaSql) {
            await prisma.$executeRawUnsafe(comando);
        }
        this.estruturaGarantida = true;
    }
    async listar() {
        await this.garantirEstrutura();
        return prisma.$queryRaw(Prisma.sql `
      SELECT id, payload, criado_em, atualizado_em
      FROM ocorrencias_crianca
      ORDER BY id DESC
    `);
    }
    async obter(id) {
        await this.garantirEstrutura();
        const rows = await prisma.$queryRaw(Prisma.sql `
      SELECT id, payload, criado_em, atualizado_em
      FROM ocorrencias_crianca
      WHERE id = ${id}
      LIMIT 1
    `);
        return rows[0] ?? null;
    }
    async obterOuFalhar(id) {
        const row = await this.obter(id);
        if (!row)
            throw new AppError("Ocorrencia nao encontrada.", 404);
        return row;
    }
    async criar(input) {
        await this.garantirEstrutura();
        const inserted = await prisma.$queryRaw(Prisma.sql `
      INSERT INTO ocorrencias_crianca (payload, criado_em, atualizado_em)
      VALUES (
        ${input},
        NOW(),
        NOW()
      )
      RETURNING id
    `);
        const id = inserted[0]?.id;
        if (!id)
            throw new AppError("Nao foi possivel criar ocorrencia.", 500);
        return this.obterOuFalhar(id);
    }
    async atualizar(id, input) {
        await this.garantirEstrutura();
        await this.obterOuFalhar(id);
        await prisma.$executeRaw(Prisma.sql `
      UPDATE ocorrencias_crianca
      SET payload = ${input}, atualizado_em = NOW()
      WHERE id = ${id}
    `);
        return this.obterOuFalhar(id);
    }
    async remover(id) {
        await this.garantirEstrutura();
        await this.obterOuFalhar(id);
        await prisma.$executeRaw(Prisma.sql `
      DELETE FROM ocorrencias_crianca
      WHERE id = ${id}
    `);
    }
    async listarAnexos(ocorrenciaId) {
        await this.garantirEstrutura();
        await this.obterOuFalhar(ocorrenciaId);
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
    async adicionarAnexo(ocorrenciaId, input) {
        await this.garantirEstrutura();
        await this.obterOuFalhar(ocorrenciaId);
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
    async removerAnexo(ocorrenciaId, anexoId) {
        await this.garantirEstrutura();
        await this.obterOuFalhar(ocorrenciaId);
        await prisma.$executeRaw(Prisma.sql `
      DELETE FROM ocorrencias_crianca_anexo
      WHERE id = ${anexoId}
        AND ocorrencia_id = ${ocorrenciaId}
    `);
    }
}
