const sqlEstruturaUsuarios = [
    "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS nome_exibicao VARCHAR(150)",
    "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS telefone VARCHAR(30)",
    "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS cpf VARCHAR(20)",
    "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS matricula VARCHAR(60)",
    "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS setor VARCHAR(150)",
    "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS unidade VARCHAR(150)",
    "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS cargo VARCHAR(150)",
    "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'ATIVO'",
    "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS exigir_troca_senha BOOLEAN NOT NULL DEFAULT FALSE",
    "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS tentativas_login_invalidas INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS ultimo_login_invalido_em TIMESTAMP",
    "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS ultimo_acesso_em TIMESTAMP",
    "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS criado_por VARCHAR(120)",
    "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS atualizado_por VARCHAR(120)",
    "UPDATE usuarios SET status = 'ATIVO' WHERE status IS NULL OR trim(status) = ''",
    "CREATE INDEX IF NOT EXISTS usuarios_status_idx ON usuarios(status)",
    "CREATE INDEX IF NOT EXISTS usuarios_setor_idx ON usuarios(setor)",
    "CREATE INDEX IF NOT EXISTS usuarios_unidade_idx ON usuarios(unidade)",
    "CREATE INDEX IF NOT EXISTS usuarios_cpf_idx ON usuarios(cpf)"
];
let estruturaInicializada = false;
export async function ensureUsuariosGestaoEstrutura(db) {
    if (estruturaInicializada)
        return;
    for (const sql of sqlEstruturaUsuarios) {
        await db.$executeRawUnsafe(sql);
    }
    estruturaInicializada = true;
}
