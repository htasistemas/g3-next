import { prisma } from "../../../database/prisma.js";
const CHAVE_PERSONALIZACAO = "PERSONALIZACAO_VISUAL";
const CHAVE_CARENCIA_DOACAO_REALIZADA = "DOACAO_REALIZADA_CARENCIA";
const CHAVE_OBRIGATORIEDADE_DOCUMENTOS_BENEFICIARIO = "BENEFICIARIO_DOCUMENTOS_OBRIGATORIEDADE";
const CHAVE_ALERTAS_CENTRAL_ATENDIMENTOS = "CENTRAL_ATENDIMENTOS_ALERTAS";
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
let estruturaPromise = null;
export class ParametrosSistemaRepository {
    async buscarPersonalizacao() {
        return this.buscarPorChave(CHAVE_PERSONALIZACAO);
    }
    async salvarPersonalizacao(valor, usuarioAtualizacao) {
        return this.salvarPorChave(CHAVE_PERSONALIZACAO, valor, usuarioAtualizacao);
    }
    async buscarCarenciaDoacaoRealizada() {
        return this.buscarPorChave(CHAVE_CARENCIA_DOACAO_REALIZADA);
    }
    async salvarCarenciaDoacaoRealizada(valor, usuarioAtualizacao) {
        return this.salvarPorChave(CHAVE_CARENCIA_DOACAO_REALIZADA, valor, usuarioAtualizacao);
    }
    async buscarObrigatoriedadeDocumentosBeneficiario() {
        return this.buscarPorChave(CHAVE_OBRIGATORIEDADE_DOCUMENTOS_BENEFICIARIO);
    }
    async salvarObrigatoriedadeDocumentosBeneficiario(valor, usuarioAtualizacao) {
        return this.salvarPorChave(CHAVE_OBRIGATORIEDADE_DOCUMENTOS_BENEFICIARIO, valor, usuarioAtualizacao);
    }
    async buscarAlertasCentralAtendimentos() {
        return this.buscarPorChave(CHAVE_ALERTAS_CENTRAL_ATENDIMENTOS);
    }
    async salvarAlertasCentralAtendimentos(valor, usuarioAtualizacao) {
        return this.salvarPorChave(CHAVE_ALERTAS_CENTRAL_ATENDIMENTOS, valor, usuarioAtualizacao);
    }
    async ensureEstrutura() {
        await ensureParametrosSistemaEstrutura();
    }
    async buscarPorChave(chave) {
        await this.ensureEstrutura();
        const rows = await prisma.$queryRawUnsafe(`
        SELECT valor_json, atualizado_em
        FROM parametros_sistema
        WHERE chave = $1
        LIMIT 1
      `, chave);
        if (!rows.length)
            return null;
        return {
            valor: rows[0].valor_json,
            atualizado_em: rows[0].atualizado_em
        };
    }
    async salvarPorChave(chave, valor, usuarioAtualizacao) {
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
      `, chave, JSON.stringify(valor), usuarioAtualizacao);
        return {
            valor: rows[0].valor_json,
            atualizado_em: rows[0].atualizado_em
        };
    }
}
export async function ensureParametrosSistemaEstrutura() {
    if (!estruturaPromise) {
        estruturaPromise = prisma.$executeRawUnsafe(criarTabelaSql).then(() => undefined);
    }
    await estruturaPromise;
}
