-- Portal público de inscrições: os dados ficam separados do cadastro oficial até a aprovação.
-- A tabela legada é criada pelo módulo de matrículas em instalações antigas; este bloco
-- mantém a migration segura também em uma base nova antes do primeiro acesso ao módulo.
CREATE TABLE IF NOT EXISTS cursos_atendimentos (
  id BIGSERIAL PRIMARY KEY, tenant_id UUID, tipo VARCHAR(20) NOT NULL DEFAULT 'CURSO',
  nome VARCHAR(200) NOT NULL, descricao TEXT, imagem TEXT, vagas_totais INTEGER NOT NULL DEFAULT 0,
  vagas_disponiveis INTEGER NOT NULL DEFAULT 0, status VARCHAR(30) NOT NULL DEFAULT 'ATIVO',
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(), atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
);
ALTER TABLE cursos_atendimentos ADD COLUMN IF NOT EXISTS inscricao_publica BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE cursos_atendimentos ADD COLUMN IF NOT EXISTS inscricao_abertura TIMESTAMP;
ALTER TABLE cursos_atendimentos ADD COLUMN IF NOT EXISTS inscricao_encerramento TIMESTAMP;
ALTER TABLE cursos_atendimentos ADD COLUMN IF NOT EXISTS permite_lista_espera BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE cursos_atendimentos ADD COLUMN IF NOT EXISTS limite_lista_espera INTEGER;
ALTER TABLE cursos_atendimentos ADD COLUMN IF NOT EXISTS descricao_publica TEXT;
ALTER TABLE cursos_atendimentos ADD COLUMN IF NOT EXISTS publico_alvo TEXT;
ALTER TABLE cursos_atendimentos ADD COLUMN IF NOT EXISTS prerequisitos TEXT;
ALTER TABLE cursos_atendimentos ADD COLUMN IF NOT EXISTS documentos_necessarios JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE cursos_atendimentos ADD COLUMN IF NOT EXISTS perguntas_publicas JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE cursos_atendimentos ADD COLUMN IF NOT EXISTS modalidade VARCHAR(20) NOT NULL DEFAULT 'PRESENCIAL';
ALTER TABLE cursos_atendimentos ADD COLUMN IF NOT EXISTS valor_publico NUMERIC(12,2);
ALTER TABLE cursos_atendimentos ADD COLUMN IF NOT EXISTS unidade_id BIGINT;
CREATE INDEX IF NOT EXISTS cursos_atendimentos_portal_publico_idx ON cursos_atendimentos (tenant_id, inscricao_publica, inscricao_abertura, inscricao_encerramento);

CREATE TABLE IF NOT EXISTS portal_pre_inscricoes (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  curso_id BIGINT NOT NULL REFERENCES cursos_atendimentos(id) ON DELETE RESTRICT,
  protocolo VARCHAR(30) NOT NULL,
  nome_completo VARCHAR(200) NOT NULL,
  cpf VARCHAR(11) NOT NULL,
  data_nascimento DATE NOT NULL,
  telefone VARCHAR(30), whatsapp VARCHAR(30), email VARCHAR(150),
  endereco_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  respostas_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  documentos_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  status VARCHAR(30) NOT NULL DEFAULT 'AGUARDANDO_ANALISE',
  motivo TEXT, beneficiario_id BIGINT, matricula_id BIGINT,
  origem VARCHAR(40), utm_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  termos_versao VARCHAR(40) NOT NULL, termos_aceitos_em TIMESTAMP NOT NULL DEFAULT NOW(),
  termos_ip VARCHAR(80), termos_tenant_id UUID NOT NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(), atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  analisado_em TIMESTAMP, analisado_por BIGINT,
  CONSTRAINT portal_pre_inscricoes_protocolo_unq UNIQUE (tenant_id, protocolo)
);
ALTER TABLE portal_pre_inscricoes ADD COLUMN IF NOT EXISTS documentos_json JSONB NOT NULL DEFAULT '[]'::jsonb;
CREATE INDEX IF NOT EXISTS portal_pre_inscricoes_tenant_status_idx ON portal_pre_inscricoes (tenant_id, status, criado_em DESC);
CREATE INDEX IF NOT EXISTS portal_pre_inscricoes_tenant_cpf_idx ON portal_pre_inscricoes (tenant_id, cpf);
CREATE UNIQUE INDEX IF NOT EXISTS portal_pre_inscricoes_ativa_unq ON portal_pre_inscricoes (tenant_id, curso_id, cpf) WHERE status IN ('AGUARDANDO_ANALISE','EM_ANALISE','DOCUMENTACAO_PENDENTE','LISTA_ESPERA');

CREATE TABLE IF NOT EXISTS portal_pre_inscricoes_historico (
  id BIGSERIAL PRIMARY KEY, tenant_id UUID NOT NULL, pre_inscricao_id BIGINT NOT NULL REFERENCES portal_pre_inscricoes(id) ON DELETE CASCADE,
  acao VARCHAR(50) NOT NULL, status_anterior VARCHAR(30), status_novo VARCHAR(30), descricao TEXT,
  usuario_id BIGINT, usuario_nome VARCHAR(200), ip VARCHAR(80), criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS portal_pre_inscricoes_historico_idx ON portal_pre_inscricoes_historico (tenant_id, pre_inscricao_id, criado_em DESC);
