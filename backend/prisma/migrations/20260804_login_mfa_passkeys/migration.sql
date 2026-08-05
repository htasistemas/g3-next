CREATE TABLE IF NOT EXISTS auth_challenge (
  id UUID PRIMARY KEY,
  tipo VARCHAR(40) NOT NULL,
  usuario_id BIGINT REFERENCES usuarios(id) ON DELETE CASCADE,
  tenant_id UUID,
  challenge TEXT NOT NULL,
  codigo_hash VARCHAR(255),
  contexto_json JSONB,
  expira_em TIMESTAMP NOT NULL,
  usado_em TIMESTAMP,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS auth_challenge_usuario_idx
  ON auth_challenge(usuario_id, tipo, expira_em);

CREATE TABLE IF NOT EXISTS usuario_passkey (
  id UUID PRIMARY KEY,
  usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  credential_id TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  counter BIGINT NOT NULL DEFAULT 0,
  transports TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  device_type VARCHAR(30),
  backed_up BOOLEAN NOT NULL DEFAULT FALSE,
  nome VARCHAR(120),
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  ultimo_uso_em TIMESTAMP
);

CREATE INDEX IF NOT EXISTS usuario_passkey_usuario_idx
  ON usuario_passkey(usuario_id);
