CREATE TABLE IF NOT EXISTS educacional_parceria_publica (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  termo_fomento_id BIGINT NOT NULL REFERENCES termo_fomento(id) ON DELETE RESTRICT,
  unidade_id BIGINT NOT NULL REFERENCES unidade_assistencial(id) ON DELETE RESTRICT,
  nome_programa VARCHAR(240) NOT NULL,
  orgao_gestor VARCHAR(240) NOT NULL,
  vigencia_inicio DATE,
  vigencia_fim DATE,
  status VARCHAR(30) NOT NULL DEFAULT 'ATIVA',
  objeto TEXT,
  observacoes TEXT,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS educacional_parceria_indicador (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  parceria_id BIGINT NOT NULL REFERENCES educacional_parceria_publica(id) ON DELETE CASCADE,
  codigo VARCHAR(60) NOT NULL,
  descricao VARCHAR(240) NOT NULL,
  unidade_medida VARCHAR(80) NOT NULL,
  meta_valor NUMERIC(14, 2),
  periodicidade VARCHAR(40) NOT NULL DEFAULT 'MENSAL',
  status VARCHAR(30) NOT NULL DEFAULT 'ATIVO',
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS educacional_parceria_evidencia (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  indicador_id BIGINT NOT NULL REFERENCES educacional_parceria_indicador(id) ON DELETE CASCADE,
  competencia DATE NOT NULL,
  realizado_valor NUMERIC(14, 2),
  caminho_arquivo TEXT,
  mime_type VARCHAR(120),
  observacoes TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'RASCUNHO',
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS educacional_parceria_termo_unidade_uk ON educacional_parceria_publica(tenant_id, termo_fomento_id, unidade_id);
CREATE INDEX IF NOT EXISTS educacional_parceria_tenant_idx ON educacional_parceria_publica(tenant_id, status, vigencia_fim);
CREATE INDEX IF NOT EXISTS educacional_parceria_indicador_idx ON educacional_parceria_indicador(tenant_id, parceria_id, status);
CREATE INDEX IF NOT EXISTS educacional_parceria_evidencia_idx ON educacional_parceria_evidencia(tenant_id, indicador_id, competencia DESC);

INSERT INTO permissao (nome)
SELECT nome FROM (VALUES
  ('EDUCACIONAL_PARCERIAS_VISUALIZAR'),
  ('EDUCACIONAL_PARCERIAS_EDITAR')
) AS novas(nome)
WHERE NOT EXISTS (SELECT 1 FROM permissao existente WHERE existente.nome = novas.nome);
