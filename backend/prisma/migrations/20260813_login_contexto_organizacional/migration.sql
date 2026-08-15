-- Migração incremental do modelo de identidade e acesso.
-- Não remove colunas/tabelas legadas e pode ser executada mais de uma vez.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS entidades_juridicas (
  id BIGSERIAL PRIMARY KEY,
  instituicao_id UUID NOT NULL REFERENCES instituicoes(id) ON DELETE RESTRICT,
  tenant_id UUID NOT NULL,
  cnpj VARCHAR(20) NOT NULL,
  razao_social VARCHAR(200) NOT NULL,
  nome_fantasia VARCHAR(200),
  status VARCHAR(20) NOT NULL DEFAULT 'ATIVO',
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT entidades_juridicas_cnpj_instituicao_unq UNIQUE (instituicao_id, cnpj)
);
CREATE INDEX IF NOT EXISTS entidades_juridicas_tenant_idx ON entidades_juridicas(tenant_id);

CREATE TABLE IF NOT EXISTS unidades_organizacionais (
  id BIGSERIAL PRIMARY KEY,
  instituicao_id UUID NOT NULL REFERENCES instituicoes(id) ON DELETE RESTRICT,
  tenant_id UUID NOT NULL,
  entidade_juridica_id BIGINT REFERENCES entidades_juridicas(id) ON DELETE SET NULL,
  unidade_assistencial_id BIGINT UNIQUE REFERENCES unidade_assistencial(id) ON DELETE SET NULL,
  nome VARCHAR(200) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ATIVO',
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS unidades_organizacionais_escopo_idx ON unidades_organizacionais(instituicao_id, entidade_juridica_id, tenant_id);

CREATE TABLE IF NOT EXISTS locais_execucao (
  id BIGSERIAL PRIMARY KEY,
  instituicao_id UUID NOT NULL REFERENCES instituicoes(id) ON DELETE RESTRICT,
  tenant_id UUID NOT NULL,
  unidade_organizacional_id BIGINT REFERENCES unidades_organizacionais(id) ON DELETE SET NULL,
  nome VARCHAR(200) NOT NULL,
  endereco_id BIGINT REFERENCES endereco(id) ON DELETE SET NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS locais_execucao_escopo_idx ON locais_execucao(instituicao_id, unidade_organizacional_id, tenant_id);

CREATE TABLE IF NOT EXISTS usuario_identidade (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(150) NOT NULL,
  nome VARCHAR(150),
  senha_hash VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ATIVO',
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT usuario_identidade_email_unq UNIQUE (email)
);
CREATE UNIQUE INDEX IF NOT EXISTS usuario_identidade_email_lower_unq ON usuario_identidade(lower(email));

CREATE TABLE IF NOT EXISTS usuario_acesso (
  id BIGSERIAL PRIMARY KEY,
  identidade_id BIGINT NOT NULL REFERENCES usuario_identidade(id) ON DELETE CASCADE,
  usuario_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
  instituicao_id UUID NOT NULL REFERENCES instituicoes(id) ON DELETE RESTRICT,
  tenant_id UUID NOT NULL,
  entidade_juridica_id BIGINT REFERENCES entidades_juridicas(id) ON DELETE SET NULL,
  unidade_organizacional_id BIGINT REFERENCES unidades_organizacionais(id) ON DELETE SET NULL,
  projeto_id BIGINT,
  perfil_id BIGINT,
  perfil_nome VARCHAR(60),
  escopo VARCHAR(30) NOT NULL DEFAULT 'INSTITUICAO',
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT usuario_acesso_unq UNIQUE (identidade_id, instituicao_id, entidade_juridica_id, unidade_organizacional_id, projeto_id)
);
CREATE INDEX IF NOT EXISTS usuario_acesso_identidade_idx ON usuario_acesso(identidade_id, ativo);
CREATE INDEX IF NOT EXISTS usuario_acesso_escopo_idx ON usuario_acesso(instituicao_id, entidade_juridica_id, unidade_organizacional_id, projeto_id);
ALTER TABLE usuario_acesso ADD COLUMN IF NOT EXISTS perfil_nome VARCHAR(60);

ALTER TABLE IF EXISTS unidade_assistencial ADD COLUMN IF NOT EXISTS instituicao_id UUID;
ALTER TABLE IF EXISTS unidade_assistencial ADD COLUMN IF NOT EXISTS entidade_juridica_id BIGINT;
ALTER TABLE IF EXISTS projetos ADD COLUMN IF NOT EXISTS instituicao_id UUID;
ALTER TABLE IF EXISTS projetos ADD COLUMN IF NOT EXISTS entidade_juridica_id BIGINT;
ALTER TABLE IF EXISTS projetos ADD COLUMN IF NOT EXISTS unidade_organizacional_id BIGINT;
ALTER TABLE IF EXISTS projetos ADD COLUMN IF NOT EXISTS local_execucao_id BIGINT;

INSERT INTO entidades_juridicas (instituicao_id, tenant_id, cnpj, razao_social, nome_fantasia)
SELECT i.id, i.tenant_id, regexp_replace(i.cnpj, '\\D', '', 'g'), i.razao_social, i.nome_fantasia
FROM instituicoes i
WHERE COALESCE(regexp_replace(i.cnpj, '\\D', '', 'g'), '') <> ''
  AND NOT EXISTS (
    SELECT 1 FROM entidades_juridicas e
    WHERE e.instituicao_id = i.id AND e.cnpj = regexp_replace(i.cnpj, '\\D', '', 'g')
  );

UPDATE unidade_assistencial u
SET instituicao_id = i.id,
    entidade_juridica_id = e.id
FROM instituicoes i
LEFT JOIN entidades_juridicas e ON e.instituicao_id = i.id
WHERE u.tenant_id = i.tenant_id
  AND u.instituicao_id IS NULL
  AND (e.id IS NULL OR u.cnpj IS NULL OR regexp_replace(u.cnpj, '\\D', '', 'g') = e.cnpj);

INSERT INTO unidades_organizacionais (instituicao_id, tenant_id, entidade_juridica_id, unidade_assistencial_id, nome)
SELECT u.instituicao_id, u.tenant_id, u.entidade_juridica_id, u.id, u.nome_fantasia
FROM unidade_assistencial u
WHERE u.instituicao_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM unidades_organizacionais x WHERE x.unidade_assistencial_id = u.id);

DO $$
BEGIN
  IF to_regclass('public.projetos') IS NOT NULL THEN
    UPDATE projetos p
    SET instituicao_id = i.id,
        entidade_juridica_id = (
          SELECT e.id
          FROM entidades_juridicas e
          WHERE e.instituicao_id = i.id
          ORDER BY e.id
          LIMIT 1
        ),
        unidade_organizacional_id = (
          SELECT uo.id
          FROM unidades_organizacionais uo
          WHERE uo.unidade_assistencial_id = p.unidade_assistencial_id
          LIMIT 1
        )
    FROM instituicoes i
    WHERE p.tenant_id = i.tenant_id
      AND p.instituicao_id IS NULL;
  END IF;
END $$;

INSERT INTO usuario_identidade (email, nome, senha_hash)
SELECT lower(trim(u.email)), max(u.nome), min(u.senha_hash)
FROM usuarios u
WHERE u.email IS NOT NULL
  AND trim(u.email) <> ''
  AND u.deletado_em IS NULL
  AND NOT EXISTS (SELECT 1 FROM usuario_identidade i WHERE lower(i.email) = lower(trim(u.email)))
GROUP BY lower(trim(u.email));

INSERT INTO usuario_acesso (identidade_id, usuario_id, instituicao_id, tenant_id, entidade_juridica_id, unidade_organizacional_id, escopo)
SELECT ui.id, u.id, i.id, u.tenant_id, e.id, uo.id,
       CASE WHEN u.perfil_acesso IN ('ADMINISTRADOR', 'MASTER') OR u.is_superadmin THEN 'INSTITUICAO' ELSE 'INSTITUICAO' END
FROM usuarios u
JOIN usuario_identidade ui ON lower(ui.email) = lower(trim(u.email))
JOIN instituicoes i ON i.id = u.instituicao_id
LEFT JOIN entidades_juridicas e ON e.instituicao_id = i.id
LEFT JOIN unidades_organizacionais uo ON uo.instituicao_id = i.id AND uo.unidade_assistencial_id = NULL
WHERE u.email IS NOT NULL AND u.deletado_em IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM usuario_acesso a
    WHERE a.identidade_id = ui.id AND a.instituicao_id = i.id AND a.usuario_id = u.id
  );

DO $$
BEGIN
  IF to_regclass('public.manual_sistema_secoes') IS NOT NULL THEN
    INSERT INTO manual_sistema_secoes (slug, titulo, conteudo, ordem, tags, atualizado_em, versao)
    VALUES (
      'autenticacao-e-contexto-organizacional',
      'Autenticação e contexto organizacional',
      '<p>O acesso ao G3N é feito com e-mail e senha. Após a autenticação, o sistema mostra apenas os ambientes autorizados para o usuário. O CNPJ identifica uma entidade jurídica e não é uma credencial de login.</p><p>Instituição, entidade jurídica, unidade, projeto e local de execução são níveis distintos. O escopo define onde o usuário pode atuar; as permissões definem o que ele pode fazer. A troca de ambiente valida novamente o vínculo no servidor e renova o contexto da sessão.</p>',
      12,
      ARRAY['login', 'ambiente', 'permissões', 'segurança'],
      NOW(),
      '1.00.826'
    )
    ON CONFLICT (slug) DO UPDATE SET conteudo = EXCLUDED.conteudo, atualizado_em = NOW(), versao = EXCLUDED.versao;
  END IF;
END $$;
