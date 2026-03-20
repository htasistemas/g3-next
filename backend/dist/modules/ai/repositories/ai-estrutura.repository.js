const sqlEstruturaAi = [
    `
  CREATE TABLE IF NOT EXISTS ai_historico (
    id BIGSERIAL PRIMARY KEY,
    usuario_id BIGINT NOT NULL,
    pergunta TEXT NOT NULL,
    resposta TEXT NOT NULL,
    intent VARCHAR(120),
    fontes_json JSONB,
    parametros_json JSONB,
    resumo_json JSONB,
    exemplos_json JSONB,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW()
  )
  `,
    "CREATE INDEX IF NOT EXISTS ai_historico_usuario_data_idx ON ai_historico(usuario_id, criado_em DESC)"
];
let estruturaInicializada = false;
export async function ensureAiEstrutura(db) {
    if (estruturaInicializada)
        return;
    for (const sql of sqlEstruturaAi) {
        await db.$executeRawUnsafe(sql);
    }
    estruturaInicializada = true;
}
