CREATE TABLE IF NOT EXISTS educacional_transferencia (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  aluno_id BIGINT NOT NULL REFERENCES educacional_aluno(id) ON DELETE RESTRICT,
  matricula_id BIGINT REFERENCES educacional_matricula(id) ON DELETE SET NULL,
  unidade_origem_id BIGINT REFERENCES unidade_assistencial(id) ON DELETE SET NULL,
  unidade_destino_id BIGINT REFERENCES unidade_assistencial(id) ON DELETE SET NULL,
  tipo VARCHAR(30) NOT NULL,
  instituicao_externa VARCHAR(240),
  data_transferencia DATE NOT NULL,
  motivo TEXT,
  situacao VARCHAR(30) NOT NULL DEFAULT 'SOLICITADA',
  observacoes TEXT,
  responsavel_id BIGINT,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT educacional_transferencia_tipo_check CHECK (tipo IN ('INTERNA', 'EXTERNA'))
);

CREATE INDEX IF NOT EXISTS educacional_transferencia_tenant_idx ON educacional_transferencia(tenant_id, aluno_id, data_transferencia DESC);

CREATE TABLE IF NOT EXISTS educacional_autorizacao (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  aluno_id BIGINT NOT NULL REFERENCES educacional_aluno(id) ON DELETE CASCADE,
  responsavel_id BIGINT,
  tipo VARCHAR(80) NOT NULL,
  data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
  validade_inicio DATE,
  validade_fim DATE,
  autorizado BOOLEAN NOT NULL DEFAULT FALSE,
  observacoes TEXT,
  caminho_anexo TEXT,
  criado_por BIGINT,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS educacional_autorizacao_tenant_idx ON educacional_autorizacao(tenant_id, aluno_id, validade_fim);

INSERT INTO permissao (nome)
SELECT nome FROM (VALUES ('EDUCACIONAL_TRANSFERENCIAS'), ('EDUCACIONAL_AUTORIZACOES')) AS novas(nome)
WHERE NOT EXISTS (SELECT 1 FROM permissao existente WHERE existente.nome = novas.nome);
