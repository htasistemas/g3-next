-- Fase 2: cadastro oficial de colaboradores e núcleo persistente das eleições CIPA.
-- O voto não possui eleitor_id. A participação é a única fonte de controle de voto realizado.

CREATE TABLE IF NOT EXISTS rh_colaborador (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  instituicao_id UUID NOT NULL,
  unidade_id BIGINT,
  profissional_id BIGINT,
  matricula VARCHAR(80) NOT NULL,
  nome_completo VARCHAR(200) NOT NULL,
  cpf VARCHAR(11) NOT NULL,
  data_nascimento DATE NOT NULL,
  cargo VARCHAR(160),
  setor VARCHAR(160),
  turno VARCHAR(80),
  data_admissao DATE NOT NULL,
  data_desligamento DATE,
  status VARCHAR(30) NOT NULL DEFAULT 'ATIVO',
  email VARCHAR(150),
  telefone VARCHAR(30),
  foto_caminho_logico TEXT,
  origem VARCHAR(40) NOT NULL DEFAULT 'RH',
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT rh_colaborador_status_ck CHECK (status IN ('ATIVO', 'AFASTADO', 'DESLIGADO', 'INATIVO')),
  CONSTRAINT rh_colaborador_cpf_ck CHECK (cpf ~ '^[0-9]{11}$'),
  CONSTRAINT rh_colaborador_datas_ck CHECK (data_desligamento IS NULL OR data_desligamento >= data_admissao),
  CONSTRAINT rh_colaborador_tenant_matricula_unq UNIQUE (tenant_id, matricula),
  CONSTRAINT rh_colaborador_tenant_cpf_unq UNIQUE (tenant_id, cpf)
);

CREATE INDEX IF NOT EXISTS rh_colaborador_tenant_status_idx
  ON rh_colaborador (tenant_id, status, nome_completo);
CREATE INDEX IF NOT EXISTS rh_colaborador_tenant_unidade_idx
  ON rh_colaborador (tenant_id, unidade_id, status);
CREATE INDEX IF NOT EXISTS rh_colaborador_tenant_admissao_idx
  ON rh_colaborador (tenant_id, data_admissao);

CREATE TABLE IF NOT EXISTS cipa_eleicao (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  instituicao_id UUID NOT NULL,
  unidade_id BIGINT NOT NULL,
  identificador_publico VARCHAR(80) NOT NULL,
  nome VARCHAR(200) NOT NULL,
  gestao VARCHAR(80) NOT NULL,
  descricao TEXT,
  observacoes TEXT,
  status VARCHAR(40) NOT NULL DEFAULT 'RASCUNHO',
  inscricoes_inicio TIMESTAMP,
  inscricoes_fim TIMESTAMP,
  divulgacao_candidatos_em TIMESTAMP,
  votacao_inicio TIMESTAMP,
  votacao_fim TIMESTAMP,
  apuracao_em TIMESTAMP,
  publicacao_prevista_em TIMESTAMP,
  posse_em TIMESTAMP,
  publicada_em TIMESTAMP,
  encerrada_em TIMESTAMP,
  cancelada_em TIMESTAMP,
  criado_por BIGINT,
  atualizado_por BIGINT,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT cipa_eleicao_status_ck CHECK (status IN ('RASCUNHO', 'CONFIGURACAO', 'INSCRICOES_ABERTAS', 'INSCRICOES_ENCERRADAS', 'CANDIDATOS_EM_ANALISE', 'ELEICAO_PRONTA', 'VOTACAO_ABERTA', 'VOTACAO_ENCERRADA', 'APURACAO', 'RESULTADO_PUBLICADO', 'ENCERRADA', 'CANCELADA')),
  CONSTRAINT cipa_eleicao_identificador_unq UNIQUE (tenant_id, identificador_publico)
);

CREATE INDEX IF NOT EXISTS cipa_eleicao_tenant_status_idx
  ON cipa_eleicao (tenant_id, status, votacao_inicio DESC);
CREATE INDEX IF NOT EXISTS cipa_eleicao_tenant_unidade_idx
  ON cipa_eleicao (tenant_id, unidade_id, criado_em DESC);

CREATE TABLE IF NOT EXISTS cipa_eleicao_configuracao (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  eleicao_id BIGINT NOT NULL REFERENCES cipa_eleicao(id) ON DELETE RESTRICT,
  titulares INTEGER NOT NULL DEFAULT 1,
  suplentes INTEGER NOT NULL DEFAULT 1,
  votos_por_eleitor INTEGER NOT NULL DEFAULT 1,
  permite_voto_branco BOOLEAN NOT NULL DEFAULT TRUE,
  permite_voto_nulo BOOLEAN NOT NULL DEFAULT TRUE,
  permite_votacao_celular BOOLEAN NOT NULL DEFAULT TRUE,
  permite_votacao_presencial BOOLEAN NOT NULL DEFAULT FALSE,
  revelar_resultado_durante_votacao BOOLEAN NOT NULL DEFAULT FALSE,
  regra_desempate VARCHAR(60) NOT NULL DEFAULT 'TEMPO_SERVICO_ESTABELECIMENTO',
  politica_sessao_minutos INTEGER NOT NULL DEFAULT 15,
  regras_versao VARCHAR(60) NOT NULL DEFAULT 'NR5-PORTARIA-MTP-4219-2022',
  regras_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT cipa_config_eleicao_unq UNIQUE (tenant_id, eleicao_id),
  CONSTRAINT cipa_config_quantidades_ck CHECK (titulares > 0 AND suplentes >= 0 AND votos_por_eleitor > 0),
  CONSTRAINT cipa_config_sessao_ck CHECK (politica_sessao_minutos BETWEEN 5 AND 60),
  CONSTRAINT cipa_config_regra_desempate_ck CHECK (regra_desempate IN ('TEMPO_SERVICO_ESTABELECIMENTO', 'SORTEIO_AUDITADO', 'REGRA_CUSTOMIZADA'))
);

CREATE TABLE IF NOT EXISTS cipa_comissao_eleitoral_membro (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  eleicao_id BIGINT NOT NULL REFERENCES cipa_eleicao(id) ON DELETE RESTRICT,
  colaborador_id BIGINT REFERENCES rh_colaborador(id) ON DELETE RESTRICT,
  nome VARCHAR(200) NOT NULL,
  funcao VARCHAR(100) NOT NULL,
  usuario_id BIGINT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT cipa_comissao_membro_unq UNIQUE (tenant_id, eleicao_id, colaborador_id, funcao)
);

CREATE INDEX IF NOT EXISTS cipa_comissao_membro_tenant_eleicao_idx
  ON cipa_comissao_eleitoral_membro (tenant_id, eleicao_id, ativo);

CREATE TABLE IF NOT EXISTS cipa_eleitor_eleicao (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  eleicao_id BIGINT NOT NULL REFERENCES cipa_eleicao(id) ON DELETE RESTRICT,
  colaborador_id BIGINT NOT NULL REFERENCES rh_colaborador(id) ON DELETE RESTRICT,
  matricula VARCHAR(80) NOT NULL,
  nome_completo VARCHAR(200) NOT NULL,
  cpf VARCHAR(11) NOT NULL,
  data_nascimento DATE NOT NULL,
  unidade_id BIGINT NOT NULL,
  setor VARCHAR(160),
  turno VARCHAR(80),
  data_admissao DATE NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'APTO',
  incluido_em TIMESTAMP NOT NULL DEFAULT NOW(),
  removido_em TIMESTAMP,
  CONSTRAINT cipa_eleitor_status_ck CHECK (status IN ('APTO', 'REMOVIDO', 'BLOQUEADO')),
  CONSTRAINT cipa_eleitor_eleicao_colaborador_unq UNIQUE (tenant_id, eleicao_id, colaborador_id),
  CONSTRAINT cipa_eleitor_eleicao_cpf_unq UNIQUE (tenant_id, eleicao_id, cpf)
);

CREATE INDEX IF NOT EXISTS cipa_eleitor_tenant_eleicao_status_idx
  ON cipa_eleitor_eleicao (tenant_id, eleicao_id, status);
CREATE INDEX IF NOT EXISTS cipa_eleitor_tenant_unidade_idx
  ON cipa_eleitor_eleicao (tenant_id, eleicao_id, unidade_id, status);

CREATE TABLE IF NOT EXISTS cipa_candidatura (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  eleicao_id BIGINT NOT NULL REFERENCES cipa_eleicao(id) ON DELETE RESTRICT,
  colaborador_id BIGINT NOT NULL REFERENCES rh_colaborador(id) ON DELETE RESTRICT,
  numero INTEGER NOT NULL,
  nome_publico VARCHAR(200) NOT NULL,
  cargo_publico VARCHAR(160),
  setor_publico VARCHAR(160),
  unidade_publico VARCHAR(200),
  foto_caminho_logico TEXT,
  apresentacao TEXT,
  proposta TEXT,
  status VARCHAR(40) NOT NULL DEFAULT 'EM_ANALISE',
  protocolo VARCHAR(80) NOT NULL,
  declaracao_ciencia_em TIMESTAMP,
  candidatura_em TIMESTAMP NOT NULL DEFAULT NOW(),
  aprovada_em TIMESTAMP,
  aprovada_por BIGINT,
  motivo_decisao TEXT,
  desistente_em TIMESTAMP,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT cipa_candidatura_status_ck CHECK (status IN ('EM_ANALISE', 'APROVADA', 'REPROVADA', 'CORRECAO_SOLICITADA', 'DESISTENTE')),
  CONSTRAINT cipa_candidatura_numero_unq UNIQUE (tenant_id, eleicao_id, numero),
  CONSTRAINT cipa_candidatura_protocolo_unq UNIQUE (tenant_id, protocolo),
  CONSTRAINT cipa_candidatura_colaborador_unq UNIQUE (tenant_id, eleicao_id, colaborador_id)
);

CREATE INDEX IF NOT EXISTS cipa_candidatura_tenant_eleicao_status_idx
  ON cipa_candidatura (tenant_id, eleicao_id, status, numero);

CREATE TABLE IF NOT EXISTS cipa_participacao (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  eleicao_id BIGINT NOT NULL REFERENCES cipa_eleicao(id) ON DELETE RESTRICT,
  eleitor_id BIGINT NOT NULL REFERENCES cipa_eleitor_eleicao(id) ON DELETE RESTRICT,
  protocolo VARCHAR(80) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'REGISTRADA',
  autenticado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  votado_em TIMESTAMP,
  sessao_encerrada_em TIMESTAMP,
  ip_hash VARCHAR(128),
  dispositivo_hash VARCHAR(128),
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT cipa_participacao_status_ck CHECK (status IN ('AUTORIZADA', 'REGISTRADA', 'CANCELADA')),
  CONSTRAINT cipa_participacao_eleitor_unq UNIQUE (tenant_id, eleicao_id, eleitor_id),
  CONSTRAINT cipa_participacao_protocolo_unq UNIQUE (tenant_id, protocolo)
);

CREATE INDEX IF NOT EXISTS cipa_participacao_tenant_eleicao_status_idx
  ON cipa_participacao (tenant_id, eleicao_id, status, votado_em);

CREATE TABLE IF NOT EXISTS cipa_voto (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  eleicao_id BIGINT NOT NULL REFERENCES cipa_eleicao(id) ON DELETE RESTRICT,
  candidatura_id BIGINT REFERENCES cipa_candidatura(id) ON DELETE RESTRICT,
  tipo VARCHAR(20) NOT NULL DEFAULT 'VALIDO',
  identificador_tecnico UUID NOT NULL DEFAULT gen_random_uuid(),
  integridade_hash VARCHAR(128),
  registrado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT cipa_voto_tipo_ck CHECK (tipo IN ('VALIDO', 'BRANCO', 'NULO')),
  CONSTRAINT cipa_voto_identificador_unq UNIQUE (tenant_id, identificador_tecnico),
  CONSTRAINT cipa_voto_opcao_ck CHECK ((tipo = 'VALIDO' AND candidatura_id IS NOT NULL) OR (tipo IN ('BRANCO', 'NULO') AND candidatura_id IS NULL))
);

CREATE INDEX IF NOT EXISTS cipa_voto_tenant_eleicao_idx
  ON cipa_voto (tenant_id, eleicao_id, registrado_em);
CREATE INDEX IF NOT EXISTS cipa_voto_tenant_candidatura_idx
  ON cipa_voto (tenant_id, eleicao_id, candidatura_id);

CREATE TABLE IF NOT EXISTS cipa_eleicao_documento (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  eleicao_id BIGINT NOT NULL REFERENCES cipa_eleicao(id) ON DELETE RESTRICT,
  categoria VARCHAR(50) NOT NULL,
  tipo VARCHAR(100) NOT NULL,
  versao INTEGER NOT NULL DEFAULT 1,
  nome_arquivo VARCHAR(255) NOT NULL,
  content_type VARCHAR(120) NOT NULL,
  tamanho_bytes BIGINT,
  checksum VARCHAR(128),
  caminho_logico TEXT NOT NULL,
  usuario_id BIGINT,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT cipa_documento_categoria_ck CHECK (categoria IN ('CONVOCACAO', 'CANDIDATURAS', 'ELEICAO', 'RESULTADO', 'POSSE', 'AUDITORIA')),
  CONSTRAINT cipa_documento_versao_ck CHECK (versao > 0)
);

CREATE INDEX IF NOT EXISTS cipa_documento_tenant_eleicao_idx
  ON cipa_eleicao_documento (tenant_id, eleicao_id, categoria, versao DESC);

CREATE TABLE IF NOT EXISTS cipa_eleicao_auditoria (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  eleicao_id BIGINT REFERENCES cipa_eleicao(id) ON DELETE RESTRICT,
  usuario_id BIGINT,
  acao VARCHAR(80) NOT NULL,
  resultado VARCHAR(30) NOT NULL DEFAULT 'SUCESSO',
  operacao_id UUID NOT NULL DEFAULT gen_random_uuid(),
  detalhes JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip VARCHAR(80),
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT cipa_auditoria_resultado_ck CHECK (resultado IN ('SUCESSO', 'NEGADO', 'FALHA')),
  CONSTRAINT cipa_auditoria_operacao_unq UNIQUE (tenant_id, operacao_id)
);

CREATE INDEX IF NOT EXISTS cipa_auditoria_tenant_eleicao_idx
  ON cipa_eleicao_auditoria (tenant_id, eleicao_id, criado_em DESC, id DESC);

INSERT INTO permissao (nome) VALUES
  ('CIPA_VISUALIZAR'),
  ('CIPA_CRIAR_ELEICAO'),
  ('CIPA_EDITAR_ELEICAO'),
  ('CIPA_GERENCIAR_CANDIDATOS'),
  ('CIPA_GERENCIAR_ELEITORES'),
  ('CIPA_ABRIR_VOTACAO'),
  ('CIPA_ENCERRAR_VOTACAO'),
  ('CIPA_APURAR'),
  ('CIPA_PUBLICAR_RESULTADO'),
  ('CIPA_DOCUMENTOS'),
  ('CIPA_AUDITORIA')
ON CONFLICT (nome) DO NOTHING;
