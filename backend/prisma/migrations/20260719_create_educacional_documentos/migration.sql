CREATE TABLE IF NOT EXISTS educacional_documento (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  aluno_id BIGINT REFERENCES educacional_aluno(id) ON DELETE SET NULL,
  matricula_id BIGINT REFERENCES educacional_matricula(id) ON DELETE SET NULL,
  tipo VARCHAR(80) NOT NULL,
  titulo VARCHAR(240) NOT NULL,
  data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
  caminho_arquivo TEXT,
  mime_type VARCHAR(120),
  observacoes TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'EMITIDO',
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS educacional_documento_tenant_idx ON educacional_documento(tenant_id, aluno_id, data_emissao DESC);

INSERT INTO permissao (nome)
SELECT nome FROM (VALUES ('EDUCACIONAL_DOCUMENTOS_EDITAR')) AS novas(nome)
WHERE NOT EXISTS (SELECT 1 FROM permissao existente WHERE existente.nome = novas.nome);
