-- Evolucao incremental do modulo de prestacao de contas.
-- Regras de seguranca: nao excluir tabelas, nao excluir colunas e nao apagar dados existentes.

CREATE TABLE IF NOT EXISTS prestacao_contas_concedente (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  razao_social VARCHAR(240) NOT NULL,
  nome_fantasia VARCHAR(240),
  cpf_cnpj VARCHAR(20),
  esfera VARCHAR(40),
  tipo_entidade VARCHAR(80),
  endereco TEXT,
  municipio VARCHAR(120),
  estado VARCHAR(2),
  cep VARCHAR(8),
  telefone VARCHAR(20),
  email VARCHAR(180),
  site VARCHAR(240),
  responsavel VARCHAR(180),
  cargo VARCHAR(120),
  orgao VARCHAR(180),
  unidade_gestora VARCHAR(180),
  dados_bancarios JSONB NOT NULL DEFAULT '{}'::jsonb,
  observacoes TEXT,
  situacao VARCHAR(30) NOT NULL DEFAULT 'ATIVO',
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  criado_por VARCHAR(80),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_por VARCHAR(80),
  excluido_em TIMESTAMP,
  excluido_por VARCHAR(80),
  versao INTEGER NOT NULL DEFAULT 1
);

CREATE UNIQUE INDEX IF NOT EXISTS prestacao_concedente_tenant_documento_uk
  ON prestacao_contas_concedente(tenant_id, cpf_cnpj)
  WHERE cpf_cnpj IS NOT NULL AND cpf_cnpj <> '' AND excluido_em IS NULL;
CREATE INDEX IF NOT EXISTS prestacao_concedente_tenant_idx
  ON prestacao_contas_concedente(tenant_id, situacao, razao_social);

CREATE TABLE IF NOT EXISTS prestacao_contas_instrumento (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  concedente_id BIGINT REFERENCES prestacao_contas_concedente(id),
  transparencia_id BIGINT,
  plano_trabalho_id BIGINT,
  projeto_id BIGINT,
  unidade_id BIGINT,
  tipo_instrumento VARCHAR(80) NOT NULL,
  numero_instrumento VARCHAR(120),
  numero_processo VARCHAR(120),
  numero_proposta VARCHAR(120),
  numero_programa VARCHAR(120),
  numero_edital VARCHAR(120),
  unidade_gestora VARCHAR(180),
  orgao_responsavel VARCHAR(180),
  gestor_parceria VARCHAR(180),
  fiscal_parceria VARCHAR(180),
  responsavel_organizacao VARCHAR(180),
  objeto TEXT NOT NULL,
  justificativa TEXT,
  publico_alvo TEXT,
  territorio TEXT,
  data_assinatura DATE,
  inicio_vigencia DATE,
  termino_vigencia DATE,
  prazo_prestacao_parcial INTEGER,
  prazo_prestacao_final INTEGER,
  valor_global NUMERIC(14,2) NOT NULL DEFAULT 0,
  valor_repasse NUMERIC(14,2) NOT NULL DEFAULT 0,
  contrapartida_financeira NUMERIC(14,2) NOT NULL DEFAULT 0,
  contrapartida_bens_servicos NUMERIC(14,2) NOT NULL DEFAULT 0,
  recursos_proprios NUMERIC(14,2) NOT NULL DEFAULT 0,
  quantidade_parcelas INTEGER,
  conta_bancaria_exclusiva TEXT,
  legislacao_aplicavel TEXT,
  regulamento TEXT,
  fonte_recurso VARCHAR(180),
  situacao VARCHAR(40) NOT NULL DEFAULT 'RASCUNHO',
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  criado_por VARCHAR(80),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_por VARCHAR(80),
  excluido_em TIMESTAMP,
  excluido_por VARCHAR(80),
  versao INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS prestacao_instrumento_tenant_idx
  ON prestacao_contas_instrumento(tenant_id, situacao, termino_vigencia, id DESC);
CREATE INDEX IF NOT EXISTS prestacao_instrumento_concedente_idx
  ON prestacao_contas_instrumento(tenant_id, concedente_id, id DESC);
CREATE INDEX IF NOT EXISTS prestacao_instrumento_projeto_idx
  ON prestacao_contas_instrumento(tenant_id, projeto_id, id DESC);

CREATE TABLE IF NOT EXISTS prestacao_contas_modelo (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  concedente_id BIGINT REFERENCES prestacao_contas_concedente(id),
  nome VARCHAR(180) NOT NULL,
  esfera VARCHAR(40),
  tipo_instrumento VARCHAR(80),
  legislacao_aplicavel TEXT,
  configuracao JSONB NOT NULL DEFAULT '{}'::jsonb,
  instrucoes_especificas TEXT,
  situacao VARCHAR(30) NOT NULL DEFAULT 'ATIVO',
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  criado_por VARCHAR(80),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_por VARCHAR(80),
  excluido_em TIMESTAMP,
  excluido_por VARCHAR(80),
  versao INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS prestacao_modelo_tenant_idx
  ON prestacao_contas_modelo(tenant_id, concedente_id, situacao, id DESC);

CREATE TABLE IF NOT EXISTS prestacao_contas_meta (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  instrumento_id BIGINT NOT NULL REFERENCES prestacao_contas_instrumento(id),
  codigo VARCHAR(40),
  descricao TEXT NOT NULL,
  indicador TEXT,
  unidade_medida VARCHAR(80),
  quantidade_prevista NUMERIC(14,2),
  quantidade_realizada NUMERIC(14,2),
  data_inicial DATE,
  data_final DATE,
  responsavel VARCHAR(180),
  publico_estimado INTEGER,
  localidade VARCHAR(180),
  situacao VARCHAR(40) NOT NULL DEFAULT 'NAO_INICIADA',
  percentual_alcancado NUMERIC(5,2) NOT NULL DEFAULT 0,
  justificativa TEXT,
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  criado_por VARCHAR(80),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_por VARCHAR(80),
  excluido_em TIMESTAMP,
  excluido_por VARCHAR(80),
  versao INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS prestacao_meta_tenant_idx
  ON prestacao_contas_meta(tenant_id, instrumento_id, situacao, data_final);

CREATE TABLE IF NOT EXISTS prestacao_contas_rubrica (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  instrumento_id BIGINT NOT NULL REFERENCES prestacao_contas_instrumento(id),
  meta_id BIGINT REFERENCES prestacao_contas_meta(id),
  codigo VARCHAR(60),
  grupo VARCHAR(120),
  categoria VARCHAR(120) NOT NULL,
  descricao TEXT NOT NULL,
  unidade_medida VARCHAR(60),
  quantidade NUMERIC(14,2),
  valor_unitario NUMERIC(14,2),
  valor_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  fonte_recurso VARCHAR(120),
  etapa VARCHAR(180),
  atividade VARCHAR(180),
  periodo_previsto VARCHAR(80),
  valor_reservado NUMERIC(14,2) NOT NULL DEFAULT 0,
  valor_comprometido NUMERIC(14,2) NOT NULL DEFAULT 0,
  valor_pago NUMERIC(14,2) NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  criado_por VARCHAR(80),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_por VARCHAR(80),
  excluido_em TIMESTAMP,
  excluido_por VARCHAR(80),
  versao INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS prestacao_rubrica_tenant_idx
  ON prestacao_contas_rubrica(tenant_id, instrumento_id, categoria, id DESC);

CREATE TABLE IF NOT EXISTS prestacao_contas_receita (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  instrumento_id BIGINT NOT NULL REFERENCES prestacao_contas_instrumento(id),
  parcela VARCHAR(60),
  competencia VARCHAR(20),
  data_prevista DATE,
  data_recebida DATE,
  valor_previsto NUMERIC(14,2) NOT NULL DEFAULT 0,
  valor_recebido NUMERIC(14,2) NOT NULL DEFAULT 0,
  conta_bancaria TEXT,
  documento VARCHAR(120),
  origem VARCHAR(120),
  tipo_receita VARCHAR(60) NOT NULL DEFAULT 'REPASSE',
  comprovante_arquivo_id BIGINT,
  observacoes TEXT,
  situacao VARCHAR(40) NOT NULL DEFAULT 'PREVISTA',
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  criado_por VARCHAR(80),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_por VARCHAR(80),
  excluido_em TIMESTAMP,
  excluido_por VARCHAR(80),
  versao INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS prestacao_receita_tenant_idx
  ON prestacao_contas_receita(tenant_id, instrumento_id, competencia, data_recebida, situacao);

CREATE TABLE IF NOT EXISTS prestacao_contas_despesa (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  instrumento_id BIGINT NOT NULL REFERENCES prestacao_contas_instrumento(id),
  projeto_id BIGINT,
  meta_id BIGINT REFERENCES prestacao_contas_meta(id),
  rubrica_id BIGINT REFERENCES prestacao_contas_rubrica(id),
  numero_sequencial VARCHAR(60),
  competencia VARCHAR(20),
  data_emissao DATE,
  data_pagamento DATE,
  fornecedor VARCHAR(220),
  fornecedor_documento VARCHAR(20),
  tipo_documento VARCHAR(80),
  numero_documento VARCHAR(120),
  serie VARCHAR(40),
  chave_nfe VARCHAR(80),
  descricao TEXT NOT NULL,
  itens JSONB NOT NULL DEFAULT '[]'::jsonb,
  fonte_recurso VARCHAR(120),
  forma_pagamento VARCHAR(80),
  conta_origem TEXT,
  banco VARCHAR(120),
  valor_bruto NUMERIC(14,2) NOT NULL DEFAULT 0,
  desconto NUMERIC(14,2) NOT NULL DEFAULT 0,
  retencoes NUMERIC(14,2) NOT NULL DEFAULT 0,
  tributos NUMERIC(14,2) NOT NULL DEFAULT 0,
  valor_liquido NUMERIC(14,2) NOT NULL DEFAULT 0,
  centro_custo VARCHAR(120),
  favorecido VARCHAR(220),
  responsavel_lancamento VARCHAR(180),
  observacoes TEXT,
  situacao VARCHAR(40) NOT NULL DEFAULT 'RASCUNHO',
  inconsistencias JSONB NOT NULL DEFAULT '[]'::jsonb,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  criado_por VARCHAR(80),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_por VARCHAR(80),
  excluido_em TIMESTAMP,
  excluido_por VARCHAR(80),
  versao INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS prestacao_despesa_tenant_idx
  ON prestacao_contas_despesa(tenant_id, instrumento_id, situacao, data_pagamento, id DESC);
CREATE INDEX IF NOT EXISTS prestacao_despesa_documento_idx
  ON prestacao_contas_despesa(tenant_id, fornecedor_documento, numero_documento, chave_nfe);
CREATE INDEX IF NOT EXISTS prestacao_despesa_meta_rubrica_idx
  ON prestacao_contas_despesa(tenant_id, meta_id, rubrica_id);

CREATE TABLE IF NOT EXISTS prestacao_contas_documento (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  instrumento_id BIGINT REFERENCES prestacao_contas_instrumento(id),
  despesa_id BIGINT REFERENCES prestacao_contas_despesa(id),
  meta_id BIGINT REFERENCES prestacao_contas_meta(id),
  categoria VARCHAR(120) NOT NULL,
  tipo VARCHAR(120),
  descricao TEXT,
  competencia VARCHAR(20),
  arquivo_id BIGINT,
  nome_original VARCHAR(240),
  hash_arquivo VARCHAR(128),
  validade DATE,
  versao_documento INTEGER NOT NULL DEFAULT 1,
  situacao VARCHAR(40) NOT NULL DEFAULT 'ATIVO',
  etiquetas JSONB NOT NULL DEFAULT '[]'::jsonb,
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  criado_por VARCHAR(80),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_por VARCHAR(80),
  excluido_em TIMESTAMP,
  excluido_por VARCHAR(80),
  versao INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS prestacao_documento_tenant_idx
  ON prestacao_contas_documento(tenant_id, instrumento_id, categoria, situacao, id DESC);

CREATE TABLE IF NOT EXISTS prestacao_contas_conciliacao (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  instrumento_id BIGINT NOT NULL REFERENCES prestacao_contas_instrumento(id),
  conta_bancaria TEXT,
  competencia VARCHAR(20),
  transacao_bancaria JSONB NOT NULL DEFAULT '{}'::jsonb,
  despesa_id BIGINT REFERENCES prestacao_contas_despesa(id),
  receita_id BIGINT REFERENCES prestacao_contas_receita(id),
  valor NUMERIC(14,2),
  data_movimento DATE,
  descricao TEXT,
  situacao VARCHAR(50) NOT NULL DEFAULT 'PENDENTE',
  sugestao JSONB NOT NULL DEFAULT '{}'::jsonb,
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  criado_por VARCHAR(80),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_por VARCHAR(80),
  excluido_em TIMESTAMP,
  excluido_por VARCHAR(80),
  versao INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS prestacao_conciliacao_tenant_idx
  ON prestacao_contas_conciliacao(tenant_id, instrumento_id, situacao, data_movimento);

CREATE TABLE IF NOT EXISTS prestacao_contas_diligencia (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  instrumento_id BIGINT NOT NULL REFERENCES prestacao_contas_instrumento(id),
  numero VARCHAR(80),
  data_recebimento DATE,
  prazo DATE,
  descricao TEXT NOT NULL,
  itens_solicitados JSONB NOT NULL DEFAULT '[]'::jsonb,
  responsavel VARCHAR(180),
  prioridade VARCHAR(30) NOT NULL DEFAULT 'MEDIA',
  resposta TEXT,
  protocolo VARCHAR(120),
  situacao VARCHAR(50) NOT NULL DEFAULT 'RECEBIDA',
  data_envio DATE,
  parecer_recebido TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  criado_por VARCHAR(80),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_por VARCHAR(80),
  excluido_em TIMESTAMP,
  excluido_por VARCHAR(80),
  versao INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS prestacao_diligencia_tenant_idx
  ON prestacao_contas_diligencia(tenant_id, instrumento_id, situacao, prazo);

CREATE TABLE IF NOT EXISTS prestacao_contas_aprovacao (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  instrumento_id BIGINT NOT NULL REFERENCES prestacao_contas_instrumento(id),
  etapa VARCHAR(120) NOT NULL,
  usuario_id VARCHAR(80),
  usuario_nome VARCHAR(180),
  cargo VARCHAR(120),
  decisao VARCHAR(50) NOT NULL DEFAULT 'AGUARDANDO',
  parecer TEXT,
  pendencias JSONB NOT NULL DEFAULT '[]'::jsonb,
  assinatura_hash VARCHAR(128),
  ip VARCHAR(80),
  observacoes TEXT,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  criado_por VARCHAR(80),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_por VARCHAR(80),
  excluido_em TIMESTAMP,
  excluido_por VARCHAR(80),
  versao INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS prestacao_aprovacao_tenant_idx
  ON prestacao_contas_aprovacao(tenant_id, instrumento_id, decisao, id DESC);

CREATE TABLE IF NOT EXISTS prestacao_contas_transparencia_publica (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  instrumento_id BIGINT NOT NULL REFERENCES prestacao_contas_instrumento(id),
  publicar_valor BOOLEAN NOT NULL DEFAULT TRUE,
  publicar_metas BOOLEAN NOT NULL DEFAULT TRUE,
  publicar_documentos BOOLEAN NOT NULL DEFAULT FALSE,
  dados_publicos JSONB NOT NULL DEFAULT '{}'::jsonb,
  situacao VARCHAR(40) NOT NULL DEFAULT 'RASCUNHO',
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_por VARCHAR(80),
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  criado_por VARCHAR(80),
  excluido_em TIMESTAMP,
  excluido_por VARCHAR(80),
  versao INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS prestacao_transparencia_publica_tenant_idx
  ON prestacao_contas_transparencia_publica(tenant_id, instrumento_id, situacao);

CREATE TABLE IF NOT EXISTS prestacao_contas_configuracao_ia (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  tipo VARCHAR(40) NOT NULL,
  provedor VARCHAR(120),
  url_api TEXT,
  modelo VARCHAR(120),
  ambiente VARCHAR(30) NOT NULL DEFAULT 'HOMOLOGACAO',
  limite_uso INTEGER,
  timeout_ms INTEGER NOT NULL DEFAULT 30000,
  ativo BOOLEAN NOT NULL DEFAULT FALSE,
  credencial_criptografada TEXT,
  credencial_mascarada VARCHAR(80),
  ultimo_teste_em TIMESTAMP,
  ultimo_sucesso_em TIMESTAMP,
  ultimo_erro TEXT,
  observacoes TEXT,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  criado_por VARCHAR(80),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_por VARCHAR(80),
  excluido_em TIMESTAMP,
  excluido_por VARCHAR(80),
  versao INTEGER NOT NULL DEFAULT 1
);
CREATE UNIQUE INDEX IF NOT EXISTS prestacao_config_ia_tenant_tipo_uk
  ON prestacao_contas_configuracao_ia(tenant_id, tipo)
  WHERE excluido_em IS NULL;

CREATE TABLE IF NOT EXISTS prestacao_contas_auditoria (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  instrumento_id BIGINT,
  entidade VARCHAR(80) NOT NULL,
  entidade_id VARCHAR(80),
  acao VARCHAR(80) NOT NULL,
  campo VARCHAR(120),
  valor_anterior TEXT,
  valor_novo TEXT,
  justificativa TEXT,
  usuario_id VARCHAR(80),
  usuario_nome VARCHAR(180),
  ip VARCHAR(80),
  request_id VARCHAR(120),
  criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS prestacao_auditoria_tenant_idx
  ON prestacao_contas_auditoria(tenant_id, instrumento_id, criado_em DESC);

ALTER TABLE IF EXISTS transparencia ADD COLUMN IF NOT EXISTS prestacao_instrumento_id BIGINT;
ALTER TABLE IF EXISTS transparencia ADD COLUMN IF NOT EXISTS percentual_preenchimento NUMERIC(5,2) NOT NULL DEFAULT 0;
ALTER TABLE IF EXISTS transparencia ADD COLUMN IF NOT EXISTS proxima_prestacao_em DATE;

COMMENT ON TABLE prestacao_contas_concedente IS 'Cadastro de concedentes da prestacao de contas.';
COMMENT ON TABLE prestacao_contas_instrumento IS 'Instrumentos juridicos, parcerias e convenios vinculados ao ciclo de prestacao de contas.';
COMMENT ON TABLE prestacao_contas_configuracao_ia IS 'Configuracoes por tenant para OCR e assistente de IA de prestacao de contas; credenciais nao devem ser retornadas integralmente.';
