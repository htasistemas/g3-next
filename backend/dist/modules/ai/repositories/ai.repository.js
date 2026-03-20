import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { ensureAiEstrutura } from "./ai-estrutura.repository.js";
function parseJsonObject(value, fallback) {
    if (!value || typeof value !== "object")
        return fallback;
    return value;
}
export class AiRepository {
    async listarHistorico(usuarioId, limite = 50) {
        await ensureAiEstrutura(prisma);
        const rows = await prisma.$queryRaw(Prisma.sql `
      SELECT
        id,
        usuario_id,
        pergunta,
        resposta,
        intent,
        fontes_json,
        parametros_json,
        resumo_json,
        exemplos_json,
        criado_em
      FROM ai_historico
      WHERE usuario_id = ${BigInt(usuarioId)}
      ORDER BY criado_em ASC, id ASC
      LIMIT ${limite}
    `);
        return rows.map((row) => ({
            id: row.id.toString(),
            pergunta: row.pergunta,
            resposta: row.resposta,
            intent: row.intent ?? undefined,
            data: {
                origem: "banco_interno",
                fontes: Array.isArray(row.fontes_json) ? row.fontes_json : [],
                parametros: parseJsonObject(row.parametros_json, {}),
                resumo: parseJsonObject(row.resumo_json, {}),
                exemplos: Array.isArray(row.exemplos_json)
                    ? row.exemplos_json
                    : []
            },
            criadoEm: row.criado_em.toISOString()
        }));
    }
    async registrarHistorico(input) {
        await ensureAiEstrutura(prisma);
        await prisma.$executeRaw(Prisma.sql `
      INSERT INTO ai_historico (
        usuario_id,
        pergunta,
        resposta,
        intent,
        fontes_json,
        parametros_json,
        resumo_json,
        exemplos_json,
        criado_em
      ) VALUES (
        ${BigInt(input.usuarioId)},
        ${input.pergunta},
        ${input.resposta},
        ${input.intent ?? null},
        ${JSON.stringify(input.fontes ?? [])}::jsonb,
        ${JSON.stringify(input.parametros ?? {})}::jsonb,
        ${JSON.stringify(input.resumo ?? {})}::jsonb,
        ${JSON.stringify(input.exemplos ?? [])}::jsonb,
        NOW()
      )
    `);
    }
    async limparHistorico(usuarioId) {
        await ensureAiEstrutura(prisma);
        await prisma.$executeRaw(Prisma.sql `
      DELETE FROM ai_historico
      WHERE usuario_id = ${BigInt(usuarioId)}
    `);
    }
}
