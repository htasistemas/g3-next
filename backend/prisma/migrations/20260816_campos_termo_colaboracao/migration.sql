-- Campos específicos do cadastro de Termo de colaboração/parceria.
-- Evolução incremental: não remove colunas nem dados existentes.

ALTER TABLE prestacao_contas_instrumento
  ADD COLUMN IF NOT EXISTS ij VARCHAR(120),
  ADD COLUMN IF NOT EXISTS cnpj VARCHAR(14),
  ADD COLUMN IF NOT EXISTS tipificacao VARCHAR(30),
  ADD COLUMN IF NOT EXISTS numero_voto_comissao VARCHAR(120),
  ADD COLUMN IF NOT EXISTS origem_termo VARCHAR(180),
  ADD COLUMN IF NOT EXISTS nomenclatura_termo VARCHAR(240),
  ADD COLUMN IF NOT EXISTS responsavel_indicacao VARCHAR(180),
  ADD COLUMN IF NOT EXISTS orgao_cedente VARCHAR(240),
  ADD COLUMN IF NOT EXISTS status_cadastro VARCHAR(20) NOT NULL DEFAULT 'ATIVO',
  ADD COLUMN IF NOT EXISTS banco VARCHAR(120),
  ADD COLUMN IF NOT EXISTS agencia VARCHAR(30),
  ADD COLUMN IF NOT EXISTS conta VARCHAR(40),
  ADD COLUMN IF NOT EXISTS operacao VARCHAR(30),
  ADD COLUMN IF NOT EXISTS conta_bancaria_id BIGINT,
  ADD COLUMN IF NOT EXISTS representante_legal VARCHAR(200),
  ADD COLUMN IF NOT EXISTS representante_cpf VARCHAR(11),
  ADD COLUMN IF NOT EXISTS representante_cargo VARCHAR(160),
  ADD COLUMN IF NOT EXISTS representante_profissional_id BIGINT;

ALTER TABLE prestacao_contas_receita
  ADD COLUMN IF NOT EXISTS data_desembolso DATE;

CREATE INDEX IF NOT EXISTS prestacao_instrumento_voto_idx
  ON prestacao_contas_instrumento(tenant_id, numero_voto_comissao, id DESC);
