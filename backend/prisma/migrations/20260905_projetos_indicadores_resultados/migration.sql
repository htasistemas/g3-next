-- Indicadores e resultados de projetos sociais.
-- Estrutura aditiva: preserva projetos e tarefas existentes.

CREATE UNIQUE INDEX IF NOT EXISTS projetos_id_tenant_uidx
  ON projetos (id, tenant_id);

CREATE TABLE IF NOT EXISTS projeto_indicador (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  projeto_id BIGINT NOT NULL,
  nome VARCHAR(200) NOT NULL,
  descricao TEXT,
  tipo VARCHAR(30) NOT NULL DEFAULT 'RESULTADO',
  unidade_medida VARCHAR(80) NOT NULL,
  linha_base NUMERIC(14, 2),
  meta NUMERIC(14, 2) NOT NULL,
  valor_atual NUMERIC(14, 2) NOT NULL DEFAULT 0,
  periodicidade VARCHAR(30) NOT NULL DEFAULT 'MENSAL',
  fonte_dado VARCHAR(200),
  responsavel VARCHAR(200),
  status VARCHAR(30) NOT NULL DEFAULT 'ATIVO',
  criado_por BIGINT,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT projeto_indicador_tipo_ck CHECK (tipo IN ('PROCESSO', 'PRODUTO', 'RESULTADO', 'IMPACTO')),
  CONSTRAINT projeto_indicador_periodicidade_ck CHECK (periodicidade IN ('UNICA', 'MENSAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL')),
  CONSTRAINT projeto_indicador_status_ck CHECK (status IN ('ATIVO', 'INATIVO')),
  CONSTRAINT projeto_indicador_meta_ck CHECK (meta >= 0),
  CONSTRAINT projeto_indicador_valor_ck CHECK (valor_atual >= 0),
  CONSTRAINT projeto_indicador_projeto_fk FOREIGN KEY (projeto_id, tenant_id)
    REFERENCES projetos (id, tenant_id) ON DELETE RESTRICT NOT VALID
);
CREATE INDEX IF NOT EXISTS projeto_indicador_tenant_idx
  ON projeto_indicador (tenant_id, projeto_id, status, id);
CREATE UNIQUE INDEX IF NOT EXISTS projeto_indicador_nome_uidx
  ON projeto_indicador (tenant_id, projeto_id, lower(nome));

CREATE TABLE IF NOT EXISTS projeto_indicador_medicao (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  indicador_id BIGINT NOT NULL REFERENCES projeto_indicador(id) ON DELETE RESTRICT,
  competencia DATE NOT NULL,
  valor NUMERIC(14, 2) NOT NULL,
  observacao TEXT,
  evidencia_id BIGINT,
  registrado_por BIGINT,
  registrado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT projeto_indicador_medicao_valor_ck CHECK (valor >= 0),
  CONSTRAINT projeto_indicador_medicao_unq UNIQUE (tenant_id, indicador_id, competencia)
);
CREATE INDEX IF NOT EXISTS projeto_indicador_medicao_tenant_idx
  ON projeto_indicador_medicao (tenant_id, indicador_id, competencia DESC);

CREATE TABLE IF NOT EXISTS projeto_indicador_evidencia (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  indicador_id BIGINT NOT NULL REFERENCES projeto_indicador(id) ON DELETE RESTRICT,
  nome_arquivo VARCHAR(255) NOT NULL,
  referencia_logica TEXT NOT NULL,
  mime_type VARCHAR(120),
  tamanho_bytes BIGINT,
  checksum VARCHAR(128),
  observacao TEXT,
  enviado_por BIGINT,
  enviado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT projeto_indicador_evidencia_tamanho_ck CHECK (tamanho_bytes IS NULL OR tamanho_bytes >= 0)
);
CREATE INDEX IF NOT EXISTS projeto_indicador_evidencia_tenant_idx
  ON projeto_indicador_evidencia (tenant_id, indicador_id, ativo, enviado_em DESC);
