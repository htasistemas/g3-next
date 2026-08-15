-- Gestao de parcerias e recursos publicos.
-- Evolucao incremental: nao remove tabelas, colunas ou dados existentes.

ALTER TABLE prestacao_contas_instrumento
  ADD COLUMN IF NOT EXISTS ano INTEGER,
  ADD COLUMN IF NOT EXISTS numero_processo_administrativo VARCHAR(120),
  ADD COLUMN IF NOT EXISTS numero_sei VARCHAR(120),
  ADD COLUMN IF NOT EXISTS titulo VARCHAR(240),
  ADD COLUMN IF NOT EXISTS descricao TEXT,
  ADD COLUMN IF NOT EXISTS permite_prorrogacao BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS base_legal TEXT,
  ADD COLUMN IF NOT EXISTS municipio VARCHAR(120),
  ADD COLUMN IF NOT EXISTS estado VARCHAR(2);

CREATE INDEX IF NOT EXISTS prestacao_instrumento_tenant_ano_idx
  ON prestacao_contas_instrumento(tenant_id, ano, situacao, id DESC);

CREATE TABLE IF NOT EXISTS prestacao_contas_instrumento_unidade (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  instrumento_id BIGINT NOT NULL REFERENCES prestacao_contas_instrumento(id),
  unidade_id BIGINT NOT NULL,
  entidade_juridica_id BIGINT,
  responsavel VARCHAR(180),
  inicio_execucao DATE,
  termino_execucao DATE,
  percentual_participacao NUMERIC(7,4) NOT NULL DEFAULT 0,
  valor_destinado NUMERIC(14,2) NOT NULL DEFAULT 0,
  metas_vinculadas JSONB NOT NULL DEFAULT '[]'::jsonb,
  rubricas_vinculadas JSONB NOT NULL DEFAULT '[]'::jsonb,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  criado_por VARCHAR(80),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_por VARCHAR(80),
  excluido_em TIMESTAMP,
  excluido_por VARCHAR(80),
  versao INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS prestacao_instrumento_unidade_tenant_idx
  ON prestacao_contas_instrumento_unidade(tenant_id, instrumento_id, ativo, id);
CREATE UNIQUE INDEX IF NOT EXISTS prestacao_instrumento_unidade_uk
  ON prestacao_contas_instrumento_unidade(tenant_id, instrumento_id, unidade_id)
  WHERE excluido_em IS NULL;

CREATE TABLE IF NOT EXISTS prestacao_contas_aditivo (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  instrumento_id BIGINT NOT NULL REFERENCES prestacao_contas_instrumento(id),
  numero VARCHAR(120) NOT NULL,
  ano INTEGER,
  tipo VARCHAR(60) NOT NULL,
  data_aditivo DATE,
  vigencia_anterior_inicio DATE,
  vigencia_anterior_fim DATE,
  nova_vigencia_inicio DATE,
  nova_vigencia_fim DATE,
  valor_anterior NUMERIC(14,2) NOT NULL DEFAULT 0,
  acrescimo NUMERIC(14,2) NOT NULL DEFAULT 0,
  reducao NUMERIC(14,2) NOT NULL DEFAULT 0,
  novo_valor NUMERIC(14,2) NOT NULL DEFAULT 0,
  justificativa TEXT NOT NULL,
  processo VARCHAR(120),
  documento_id BIGINT,
  situacao VARCHAR(30) NOT NULL DEFAULT 'ATIVO',
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  criado_por VARCHAR(80),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_por VARCHAR(80),
  excluido_em TIMESTAMP,
  excluido_por VARCHAR(80),
  versao INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS prestacao_aditivo_tenant_idx
  ON prestacao_contas_aditivo(tenant_id, instrumento_id, data_aditivo DESC, id DESC);

CREATE TABLE IF NOT EXISTS prestacao_contas_conta_bancaria (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  instrumento_id BIGINT NOT NULL REFERENCES prestacao_contas_instrumento(id),
  banco VARCHAR(120) NOT NULL,
  agencia VARCHAR(30),
  conta VARCHAR(40),
  titular VARCHAR(240),
  cnpj VARCHAR(20),
  data_abertura DATE,
  saldo NUMERIC(14,2) NOT NULL DEFAULT 0,
  situacao VARCHAR(30) NOT NULL DEFAULT 'ATIVA',
  observacoes TEXT,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  criado_por VARCHAR(80),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_por VARCHAR(80),
  excluido_em TIMESTAMP,
  excluido_por VARCHAR(80),
  versao INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS prestacao_conta_bancaria_tenant_idx
  ON prestacao_contas_conta_bancaria(tenant_id, instrumento_id, situacao, id DESC);

CREATE TABLE IF NOT EXISTS prestacao_contas_timeline (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  instrumento_id BIGINT NOT NULL REFERENCES prestacao_contas_instrumento(id),
  tipo_evento VARCHAR(60) NOT NULL,
  titulo VARCHAR(240) NOT NULL,
  descricao TEXT,
  data_evento TIMESTAMP NOT NULL DEFAULT NOW(),
  entidade VARCHAR(80),
  entidade_id VARCHAR(80),
  usuario_id VARCHAR(80),
  usuario_nome VARCHAR(180),
  criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS prestacao_timeline_tenant_idx
  ON prestacao_contas_timeline(tenant_id, instrumento_id, data_evento DESC, id DESC);

INSERT INTO permissao (nome) VALUES
  ('PARCERIAS_VISUALIZAR'),
  ('PARCERIAS_CRIAR'),
  ('PARCERIAS_EDITAR'),
  ('PARCERIAS_MOVIMENTAR_FINANCEIRO'),
  ('PARCERIAS_GERENCIAR_RUBRICAS'),
  ('PARCERIAS_REMANEJAR'),
  ('PARCERIAS_GERENCIAR_ADITIVOS'),
  ('PARCERIAS_DOCUMENTOS'),
  ('PARCERIAS_PRESTACAO_CONTAS'),
  ('PARCERIAS_APROVAR'),
  ('PARCERIAS_ENCERRAR')
ON CONFLICT (nome) DO NOTHING;
