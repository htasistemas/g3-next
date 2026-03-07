import { prisma } from "../../../database/prisma.js";
const CHAVE_PERSONALIZACAO = "PERSONALIZACAO_VISUAL";
const criarTabelaSql = `
  CREATE TABLE IF NOT EXISTS parametros_sistema (
    id BIGSERIAL PRIMARY KEY,
    chave VARCHAR(100) NOT NULL UNIQUE,
    valor_json JSONB NOT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_por VARCHAR(120)
  );
`;
export class ParametrosSistemaRepository {
    estruturaInicializada = false;
    async buscarPersonalizacao() {
        await this.ensureEstrutura();
        const rows = await prisma.$queryRawUnsafe(`
        SELECT valor_json, atualizado_em
        FROM parametros_sistema
        WHERE chave = $1
        LIMIT 1
      `, CHAVE_PERSONALIZACAO);
        if (!rows.length)
            return null;
        return {
            valor: rows[0].valor_json,
            atualizado_em: rows[0].atualizado_em
        };
    }
    async salvarPersonalizacao(valor, usuarioAtualizacao) {
        await this.ensureEstrutura();
        const rows = await prisma.$queryRawUnsafe(`
        INSERT INTO parametros_sistema (chave, valor_json, atualizado_por, criado_em, atualizado_em)
        VALUES ($1, $2::jsonb, $3, NOW(), NOW())
        ON CONFLICT (chave)
        DO UPDATE SET
          valor_json = EXCLUDED.valor_json,
          atualizado_por = EXCLUDED.atualizado_por,
          atualizado_em = NOW()
        RETURNING valor_json, atualizado_em
      `, CHAVE_PERSONALIZACAO, JSON.stringify(valor), usuarioAtualizacao);
        return {
            valor: rows[0].valor_json,
            atualizado_em: rows[0].atualizado_em
        };
    }
    async ensureEstrutura() {
        if (this.estruturaInicializada)
            return;
        await prisma.$executeRawUnsafe(criarTabelaSql);
        this.estruturaInicializada = true;
    }
}
