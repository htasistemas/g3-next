CREATE TABLE IF NOT EXISTS venda_setor_pagamento (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  venda_id BIGINT NOT NULL REFERENCES venda_setor(id) ON DELETE RESTRICT,
  forma_pagamento VARCHAR(40) NOT NULL,
  valor NUMERIC(14,2) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'CONFIRMADO',
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, venda_id, forma_pagamento)
);

CREATE TABLE IF NOT EXISTS venda_setor_caixa_movimentacao (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  venda_id BIGINT NOT NULL REFERENCES venda_setor(id) ON DELETE RESTRICT,
  pagamento_id BIGINT REFERENCES venda_setor_pagamento(id) ON DELETE RESTRICT,
  tipo VARCHAR(30) NOT NULL DEFAULT 'ENTRADA',
  forma_pagamento VARCHAR(40) NOT NULL,
  valor NUMERIC(14,2) NOT NULL,
  descricao VARCHAR(255) NOT NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, venda_id, tipo, forma_pagamento)
);

CREATE INDEX IF NOT EXISTS venda_setor_pagamento_tenant_idx
  ON venda_setor_pagamento(tenant_id, venda_id);

CREATE INDEX IF NOT EXISTS venda_setor_caixa_tenant_idx
  ON venda_setor_caixa_movimentacao(tenant_id, criado_em DESC);
