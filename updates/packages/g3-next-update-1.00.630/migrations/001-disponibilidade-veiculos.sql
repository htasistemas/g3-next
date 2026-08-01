CREATE TABLE IF NOT EXISTS controle_veiculos_disponibilidade (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  veiculo_id BIGINT NOT NULL,
  tipo_situacao VARCHAR(20) NOT NULL,
  data_hora_inicio TIMESTAMP NOT NULL,
  data_hora_fim TIMESTAMP NOT NULL,
  motivo VARCHAR(120),
  motivo_detalhado TEXT,
  destino VARCHAR(180),
  responsavel_id BIGINT,
  responsavel_nome VARCHAR(160),
  observacoes TEXT,
  status_registro VARCHAR(30) NOT NULL DEFAULT 'ATIVO',
  criado_por_usuario_id BIGINT,
  criado_por_nome VARCHAR(160),
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  alterado_por_usuario_id BIGINT,
  alterado_por_nome VARCHAR(160),
  alterado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  cancelado_por_usuario_id BIGINT,
  cancelado_por_nome VARCHAR(160),
  cancelado_em TIMESTAMP,
  motivo_cancelamento TEXT,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS controle_veiculos_disponibilidade_historico (
  id BIGSERIAL PRIMARY KEY,
  disponibilidade_veiculo_id BIGINT NOT NULL,
  acao VARCHAR(40) NOT NULL,
  antes_json JSONB,
  depois_json JSONB,
  usuario_id BIGINT,
  usuario_nome VARCHAR(160),
  criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS controle_veiculos_disponibilidade_tenant_idx
  ON controle_veiculos_disponibilidade(tenant_id, status_registro, data_hora_inicio DESC, data_hora_fim DESC);

CREATE INDEX IF NOT EXISTS controle_veiculos_disponibilidade_veiculo_idx
  ON controle_veiculos_disponibilidade(tenant_id, veiculo_id, data_hora_inicio DESC);

CREATE INDEX IF NOT EXISTS controle_veiculos_disponibilidade_situacao_idx
  ON controle_veiculos_disponibilidade(tenant_id, tipo_situacao, status_registro);

CREATE INDEX IF NOT EXISTS controle_veiculos_disponibilidade_periodo_idx
  ON controle_veiculos_disponibilidade(tenant_id, data_hora_inicio, data_hora_fim);

CREATE INDEX IF NOT EXISTS controle_veiculos_disponibilidade_hist_idx
  ON controle_veiculos_disponibilidade_historico(disponibilidade_veiculo_id, criado_em DESC);
