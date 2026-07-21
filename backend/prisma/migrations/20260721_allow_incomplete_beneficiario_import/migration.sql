-- A importação pode criar um cadastro pendente para correção posterior na tela de beneficiários.
ALTER TABLE cadastro_beneficiario
  ALTER COLUMN data_nascimento DROP NOT NULL,
  ALTER COLUMN nome_mae DROP NOT NULL;
