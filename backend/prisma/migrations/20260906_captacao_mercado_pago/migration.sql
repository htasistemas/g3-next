CREATE TABLE IF NOT EXISTS captacao_pagamento_webhook_eventos (
  id BIGSERIAL PRIMARY KEY,
  provider VARCHAR(60) NOT NULL,
  external_id VARCHAR(160) NOT NULL,
  request_id VARCHAR(160),
  payload_json JSONB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (provider, external_id, request_id)
);

CREATE INDEX IF NOT EXISTS captacao_pagamento_webhook_external_idx
  ON captacao_pagamento_webhook_eventos (provider, external_id);

CREATE INDEX IF NOT EXISTS captacao_doacoes_identificador_externo_idx
  ON captacao_doacoes (identificador_externo)
  WHERE deleted_at IS NULL AND identificador_externo IS NOT NULL;
