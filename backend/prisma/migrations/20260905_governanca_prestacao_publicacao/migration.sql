-- Governança aditiva para congelamento e publicação controlada de prestações.
CREATE TABLE IF NOT EXISTS transparencia_prestacao_snapshot (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  transparencia_id BIGINT NOT NULL,
  versao INTEGER NOT NULL,
  payload JSONB NOT NULL,
  checksum VARCHAR(128) NOT NULL,
  criado_por BIGINT,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT transparencia_snapshot_versao_ck CHECK (versao > 0),
  CONSTRAINT transparencia_snapshot_unq UNIQUE (tenant_id, transparencia_id, versao),
  CONSTRAINT transparencia_snapshot_checksum_unq UNIQUE (tenant_id, transparencia_id, checksum),
  CONSTRAINT transparencia_snapshot_transparencia_fk FOREIGN KEY (transparencia_id) REFERENCES transparencia(id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS transparencia_snapshot_tenant_idx ON transparencia_prestacao_snapshot (tenant_id, transparencia_id, versao DESC);

CREATE TABLE IF NOT EXISTS transparencia_publicacao (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  transparencia_id BIGINT NOT NULL,
  snapshot_id BIGINT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PUBLICADA',
  publicado_por BIGINT,
  publicado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  retirada_por BIGINT,
  retirada_em TIMESTAMP,
  motivo TEXT,
  CONSTRAINT transparencia_publicacao_status_ck CHECK (status IN ('PUBLICADA', 'RETIRADA')),
  CONSTRAINT transparencia_publicacao_transparencia_fk FOREIGN KEY (transparencia_id) REFERENCES transparencia(id) ON DELETE RESTRICT,
  CONSTRAINT transparencia_publicacao_snapshot_fk FOREIGN KEY (snapshot_id) REFERENCES transparencia_prestacao_snapshot(id) ON DELETE RESTRICT
);
CREATE UNIQUE INDEX IF NOT EXISTS transparencia_publicacao_ativa_uidx ON transparencia_publicacao (tenant_id, transparencia_id) WHERE status = 'PUBLICADA';
CREATE INDEX IF NOT EXISTS transparencia_publicacao_tenant_idx ON transparencia_publicacao (tenant_id, publicado_em DESC);

CREATE TABLE IF NOT EXISTS transparencia_obrigacao_prazo (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  transparencia_id BIGINT NOT NULL,
  tipo VARCHAR(40) NOT NULL,
  descricao VARCHAR(255) NOT NULL,
  prazo DATE NOT NULL,
  responsavel VARCHAR(180),
  status VARCHAR(20) NOT NULL DEFAULT 'ABERTA',
  concluida_em TIMESTAMP,
  concluida_por BIGINT,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT transparencia_obrigacao_status_ck CHECK (status IN ('ABERTA', 'CONCLUIDA', 'CANCELADA')),
  CONSTRAINT transparencia_obrigacao_transparencia_fk FOREIGN KEY (transparencia_id) REFERENCES transparencia(id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS transparencia_obrigacao_tenant_prazo_idx ON transparencia_obrigacao_prazo (tenant_id, prazo, status);
