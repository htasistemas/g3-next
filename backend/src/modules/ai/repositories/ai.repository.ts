import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { ensureAiEstrutura } from "./ai-estrutura.repository.js";

export type AiHistoricoRow = {
  id: bigint;
  usuario_id: bigint;
  pergunta: string;
  resposta: string;
  intent: string | null;
  tipo_consulta: string | null;
  tempo_resposta_ms: number | null;
  fontes_json: unknown;
  parametros_json: unknown;
  resumo_json: unknown;
  exemplos_json: unknown;
  criado_em: Date;
};

type RegistrarHistoricoInput = {
  usuarioId: string;
  pergunta: string;
  resposta: string;
  intent?: string;
  tipoConsulta?: string;
  tempoRespostaMs?: number;
  fontes?: string[];
  parametros?: Record<string, string | number>;
  resumo?: Record<string, number | string | null>;
  exemplos?: Array<Record<string, string | number | null>>;
};

function parseJsonObject<T>(value: unknown, fallback: T): T {
  if (!value || typeof value !== "object") return fallback;
  return value as T;
}

export class AiRepository {
  async listarHistorico(usuarioId: string, limite = 50) {
    await ensureAiEstrutura(prisma);

    const rows = await prisma.$queryRaw<AiHistoricoRow[]>(Prisma.sql`
      SELECT
        id,
        usuario_id,
        pergunta,
        resposta,
        intent,
        tipo_consulta,
        tempo_resposta_ms,
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
      tipoConsulta: row.tipo_consulta ?? undefined,
      tempoRespostaMs: row.tempo_resposta_ms ?? undefined,
      data: {
        origem: "banco_interno" as const,
        fontes: Array.isArray(row.fontes_json) ? (row.fontes_json as string[]) : [],
        parametros: parseJsonObject<Record<string, string | number>>(row.parametros_json, {}),
        resumo: parseJsonObject<Record<string, number | string | null>>(row.resumo_json, {}),
        exemplos: Array.isArray(row.exemplos_json)
          ? (row.exemplos_json as Array<Record<string, string | number | null>>)
          : []
      },
      criadoEm: row.criado_em.toISOString()
    }));
  }

  async registrarHistorico(input: RegistrarHistoricoInput) {
    await ensureAiEstrutura(prisma);

    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO ai_historico (
        usuario_id,
        pergunta,
        resposta,
        intent,
        tipo_consulta,
        tempo_resposta_ms,
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
        ${input.tipoConsulta ?? null},
        ${input.tempoRespostaMs ?? null},
        ${JSON.stringify(input.fontes ?? [])}::jsonb,
        ${JSON.stringify(input.parametros ?? {})}::jsonb,
        ${JSON.stringify(input.resumo ?? {})}::jsonb,
        ${JSON.stringify(input.exemplos ?? [])}::jsonb,
        NOW()
      )
    `);
  }

  async limparHistorico(usuarioId: string) {
    await ensureAiEstrutura(prisma);

    await prisma.$executeRaw(Prisma.sql`
      DELETE FROM ai_historico
      WHERE usuario_id = ${BigInt(usuarioId)}
    `);
  }
}
