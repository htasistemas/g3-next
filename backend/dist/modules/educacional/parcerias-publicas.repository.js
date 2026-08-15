import { Prisma } from "@prisma/client";
import { prisma } from "../../database/prisma.js";
import { AppError } from "../../shared/errors/app-error.js";
const id = (value) => BigInt(value);
const data = (value) => value ? new Date(`${value}T00:00:00.000Z`) : null;
export class ParceriasPublicasRepository {
    async listar(tenantId) {
        const rows = await prisma.$queryRaw(Prisma.sql `
      SELECT p.*, t.numero_termo, t.tipo_termo, u.nome_fantasia AS unidade_nome
      FROM educacional_parceria_publica p
      INNER JOIN termo_fomento t ON t.id = p.termo_fomento_id AND t.tenant_id::text = ${tenantId}
      INNER JOIN unidade_assistencial u ON u.id = p.unidade_id AND u.tenant_id::text = ${tenantId}
      WHERE p.tenant_id::text = ${tenantId}
      ORDER BY p.id DESC
    `);
        const parcerias = rows.map((row) => this.serializar(row));
        const parceriaIds = rows.map((row) => row.id);
        if (!parceriaIds.length)
            return parcerias;
        const indicadores = await prisma.$queryRaw(Prisma.sql `
      SELECT * FROM educacional_parceria_indicador
      WHERE tenant_id::text = ${tenantId} AND parceria_id IN (${Prisma.join(parceriaIds)})
      ORDER BY parceria_id, id
    `);
        const indicadorIds = indicadores.map((row) => row.id);
        const evidencias = indicadorIds.length ? await prisma.$queryRaw(Prisma.sql `
      SELECT * FROM educacional_parceria_evidencia
      WHERE tenant_id::text = ${tenantId} AND indicador_id IN (${Prisma.join(indicadorIds)})
      ORDER BY competencia DESC, id DESC
    `) : [];
        return parcerias.map((parceria) => ({ ...parceria, indicadores: indicadores.filter((item) => item.parceria_id === BigInt(String(parceria.id))).map((indicador) => ({ ...this.serializar(indicador), evidencias: evidencias.filter((item) => item.indicador_id === indicador.id).map((item) => this.serializar(item)) })) }));
    }
    async criarParceria(input, tenantId) {
        await this.validarTermoUnidade(input.termo_fomento_id, input.unidade_id, tenantId);
        const rows = await prisma.$queryRaw(Prisma.sql `
      INSERT INTO educacional_parceria_publica (tenant_id, termo_fomento_id, unidade_id, nome_programa, orgao_gestor, vigencia_inicio, vigencia_fim, status, objeto, observacoes)
      VALUES (${tenantId}::uuid, ${id(input.termo_fomento_id)}, ${id(input.unidade_id)}, ${input.nome_programa}, ${input.orgao_gestor}, ${data(input.vigencia_inicio)}, ${data(input.vigencia_fim)}, ${input.status ?? "ATIVA"}, ${input.objeto ?? null}, ${input.observacoes ?? null}) RETURNING *
    `);
        return this.serializar(rows[0]);
    }
    async criarIndicador(input, tenantId) {
        await this.validarExistencia("educacional_parceria_publica", input.parceria_id, tenantId, "Parceria pública não encontrada nesta instituição.");
        const rows = await prisma.$queryRaw(Prisma.sql `
      INSERT INTO educacional_parceria_indicador (tenant_id, parceria_id, codigo, descricao, unidade_medida, meta_valor, periodicidade, status)
      VALUES (${tenantId}::uuid, ${id(input.parceria_id)}, ${input.codigo}, ${input.descricao}, ${input.unidade_medida}, ${input.meta_valor ?? null}, ${input.periodicidade ?? "MENSAL"}, ${input.status ?? "ATIVO"}) RETURNING *
    `);
        return this.serializar(rows[0]);
    }
    async criarEvidencia(input, tenantId) {
        await this.validarExistencia("educacional_parceria_indicador", input.indicador_id, tenantId, "Indicador público não encontrado nesta instituição.");
        const rows = await prisma.$queryRaw(Prisma.sql `
      INSERT INTO educacional_parceria_evidencia (tenant_id, indicador_id, competencia, realizado_valor, caminho_arquivo, mime_type, observacoes, status)
      VALUES (${tenantId}::uuid, ${id(input.indicador_id)}, ${data(input.competencia)}, ${input.realizado_valor ?? null}, ${input.caminho_arquivo ?? null}, ${input.mime_type ?? null}, ${input.observacoes ?? null}, ${input.status ?? "RASCUNHO"}) RETURNING *
    `);
        return this.serializar(rows[0]);
    }
    async validarTermoUnidade(termoId, unidadeId, tenantId) {
        const rows = await prisma.$queryRaw(Prisma.sql `
      SELECT t.id FROM termo_fomento t INNER JOIN unidade_assistencial u ON u.tenant_id = t.tenant_id
      WHERE t.id = ${id(termoId)} AND u.id = ${id(unidadeId)} AND t.tenant_id::text = ${tenantId} AND u.tenant_id::text = ${tenantId} LIMIT 1
    `);
        if (!rows[0])
            throw new AppError("Termo de fomento ou unidade de ensino não encontrado nesta instituição.", 404);
    }
    async validarExistencia(tabela, registroId, tenantId, mensagem) {
        const rows = await prisma.$queryRaw(Prisma.sql `SELECT id FROM ${Prisma.raw(tabela)} WHERE id = ${id(registroId)} AND tenant_id::text = ${tenantId} LIMIT 1`);
        if (!rows[0])
            throw new AppError(mensagem, 404);
    }
    serializar(row) { return Object.fromEntries(Object.entries(row ?? {}).map(([key, value]) => [key, typeof value === "bigint" ? String(value) : value instanceof Date ? value.toISOString().slice(0, 10) : value])); }
}
