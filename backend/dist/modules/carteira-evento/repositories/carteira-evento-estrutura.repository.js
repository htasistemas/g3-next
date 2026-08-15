const sqlEstruturaCarteiraEvento = [
    `
  CREATE TABLE IF NOT EXISTS carteira_evento (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID,
    nome_evento VARCHAR(200) NOT NULL,
    tipo_evento VARCHAR(40) NOT NULL,
    data_inicio DATE NOT NULL,
    data_fim DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'PLANEJADO',
    permite_recarga BOOLEAN NOT NULL DEFAULT TRUE,
    permite_transferencia BOOLEAN NOT NULL DEFAULT FALSE,
    permite_estorno BOOLEAN NOT NULL DEFAULT FALSE,
    validade_credito DATE,
    centro_receita VARCHAR(160),
    modo_financeiro VARCHAR(30) NOT NULL DEFAULT 'SIMPLES',
    observacoes TEXT,
    permite_saldo_negativo_adm BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
  )
  `,
    `
  CREATE TABLE IF NOT EXISTS carteira_evento_participante (
    id BIGSERIAL PRIMARY KEY,
    evento_id BIGINT NOT NULL REFERENCES carteira_evento(id) ON DELETE CASCADE,
    nome VARCHAR(200) NOT NULL,
    telefone VARCHAR(30),
    cpf VARCHAR(20),
    foto_url VARCHAR(400),
    responsavel VARCHAR(200),
    numero_carteira VARCHAR(60) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ATIVO',
    qr_code_token_unico VARCHAR(120) NOT NULL,
    saldo_atual NUMERIC(14,2) NOT NULL DEFAULT 0,
    observacoes TEXT,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT carteira_evento_participante_numero_unique UNIQUE (evento_id, numero_carteira),
    CONSTRAINT carteira_evento_participante_token_unique UNIQUE (qr_code_token_unico)
  )
  `,
    `
  CREATE TABLE IF NOT EXISTS carteira_evento_barraca (
    id BIGSERIAL PRIMARY KEY,
    evento_id BIGINT NOT NULL REFERENCES carteira_evento(id) ON DELETE CASCADE,
    nome_barraca VARCHAR(180) NOT NULL,
    responsavel VARCHAR(180),
    tipo_barraca VARCHAR(120),
    operador VARCHAR(180),
    status VARCHAR(20) NOT NULL DEFAULT 'ATIVA',
    impressora VARCHAR(180),
    observacoes TEXT,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
  )
  `,
    `
  CREATE TABLE IF NOT EXISTS carteira_evento_item (
    id BIGSERIAL PRIMARY KEY,
    evento_id BIGINT NOT NULL REFERENCES carteira_evento(id) ON DELETE CASCADE,
    barraca_id BIGINT REFERENCES carteira_evento_barraca(id) ON DELETE SET NULL,
    nome_item VARCHAR(180) NOT NULL,
    categoria VARCHAR(40) NOT NULL,
    preco NUMERIC(14,2) NOT NULL DEFAULT 0,
    estoque NUMERIC(14,3),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    foto_url VARCHAR(400),
    ordem_exibicao INTEGER NOT NULL DEFAULT 0,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
  )
  `,
    `
  CREATE TABLE IF NOT EXISTS carteira_evento_venda (
    id BIGSERIAL PRIMARY KEY,
    evento_id BIGINT NOT NULL REFERENCES carteira_evento(id) ON DELETE RESTRICT,
    barraca_id BIGINT NOT NULL REFERENCES carteira_evento_barraca(id) ON DELETE RESTRICT,
    participante_id BIGINT NOT NULL REFERENCES carteira_evento_participante(id) ON DELETE RESTRICT,
    chave_operacao VARCHAR(120) NOT NULL UNIQUE,
    valor_total NUMERIC(14,2) NOT NULL,
    saldo_antes NUMERIC(14,2) NOT NULL,
    saldo_depois NUMERIC(14,2) NOT NULL,
    observacao TEXT,
    operador_usuario_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    operador_nome VARCHAR(180),
    criado_em TIMESTAMP NOT NULL DEFAULT NOW()
  )
  `,
    `
  CREATE TABLE IF NOT EXISTS carteira_evento_venda_item (
    id BIGSERIAL PRIMARY KEY,
    venda_id BIGINT NOT NULL REFERENCES carteira_evento_venda(id) ON DELETE CASCADE,
    item_id BIGINT NOT NULL REFERENCES carteira_evento_item(id) ON DELETE RESTRICT,
    nome_item VARCHAR(180) NOT NULL,
    quantidade NUMERIC(14,3) NOT NULL,
    valor_unitario NUMERIC(14,2) NOT NULL,
    valor_total NUMERIC(14,2) NOT NULL
  )
  `,
    `
  CREATE TABLE IF NOT EXISTS carteira_evento_movimentacao (
    id BIGSERIAL PRIMARY KEY,
    evento_id BIGINT NOT NULL REFERENCES carteira_evento(id) ON DELETE RESTRICT,
    participante_id BIGINT NOT NULL REFERENCES carteira_evento_participante(id) ON DELETE RESTRICT,
    barraca_id BIGINT REFERENCES carteira_evento_barraca(id) ON DELETE SET NULL,
    item_id BIGINT REFERENCES carteira_evento_item(id) ON DELETE SET NULL,
    venda_id BIGINT REFERENCES carteira_evento_venda(id) ON DELETE SET NULL,
    tipo_movimentacao VARCHAR(30) NOT NULL,
    forma_pagamento VARCHAR(40),
    valor NUMERIC(14,2) NOT NULL,
    saldo_anterior NUMERIC(14,2) NOT NULL,
    saldo_posterior NUMERIC(14,2) NOT NULL,
    descricao VARCHAR(255),
    motivo TEXT,
    referencia_externa VARCHAR(120),
    operador_usuario_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    operador_nome VARCHAR(180),
    criado_em TIMESTAMP NOT NULL DEFAULT NOW()
  )
  `,
    "ALTER TABLE IF EXISTS carteira_evento ADD COLUMN IF NOT EXISTS tenant_id UUID",
    "CREATE INDEX IF NOT EXISTS carteira_evento_status_idx ON carteira_evento(status)",
    "CREATE INDEX IF NOT EXISTS carteira_evento_tenant_idx ON carteira_evento(tenant_id, data_inicio DESC, id DESC)",
    "CREATE INDEX IF NOT EXISTS carteira_evento_participante_evento_idx ON carteira_evento_participante(evento_id)",
    "CREATE INDEX IF NOT EXISTS carteira_evento_participante_status_idx ON carteira_evento_participante(status)",
    "CREATE INDEX IF NOT EXISTS carteira_evento_barraca_evento_idx ON carteira_evento_barraca(evento_id)",
    "CREATE INDEX IF NOT EXISTS carteira_evento_item_evento_idx ON carteira_evento_item(evento_id)",
    "CREATE INDEX IF NOT EXISTS carteira_evento_venda_evento_idx ON carteira_evento_venda(evento_id, criado_em DESC)",
    "CREATE INDEX IF NOT EXISTS carteira_evento_movimentacao_participante_idx ON carteira_evento_movimentacao(participante_id, criado_em DESC)",
    `
  INSERT INTO permissao (nome)
  VALUES
    ('SETOR_VENDAS_CARTEIRA_EVENTO_VISUALIZAR'),
    ('SETOR_VENDAS_CARTEIRA_EVENTO_EDITAR'),
    ('SETOR_VENDAS_CARTEIRA_EVENTO_RECARGA'),
    ('SETOR_VENDAS_CARTEIRA_EVENTO_TRANSFERIR'),
    ('SETOR_VENDAS_CARTEIRA_EVENTO_AJUSTAR'),
    ('SETOR_VENDAS_CARTEIRA_EVENTO_OPERAR'),
    ('SETOR_VENDAS_CARTEIRA_EVENTO_FECHAR'),
    ('SETOR_VENDAS_CARTEIRA_EVENTO_RELATORIOS')
  ON CONFLICT (nome) DO NOTHING
  `
];
let estruturaInicializada = false;
let estruturaInicializando = null;
export async function ensureCarteiraEventoEstrutura(db) {
    if (estruturaInicializada)
        return;
    if (!estruturaInicializando) {
        estruturaInicializando = (async () => {
            for (const sql of sqlEstruturaCarteiraEvento) {
                await db.$executeRawUnsafe(sql);
            }
            await db.$executeRawUnsafe(`
        UPDATE carteira_evento
        SET tenant_id = origem.tenant_id
        FROM (
          SELECT tenant_id
          FROM unidade_assistencial
          WHERE tenant_id IS NOT NULL
          ORDER BY unidade_principal DESC, atualizado_em DESC, criado_em ASC
          LIMIT 1
        ) origem
        WHERE carteira_evento.tenant_id IS NULL
      `);
            estruturaInicializada = true;
        })().catch((error) => {
            estruturaInicializando = null;
            throw error;
        });
    }
    await estruturaInicializando;
}
