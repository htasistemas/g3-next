# Atualização do sistema

Estrutura suportada:

```text
/updates
  /packages
  /backups
  /logs
  version.json
  changelog.json
```

Pacotes suportados:

- `.zip`
- `.tar`
- `.tar.gz`

Estrutura recomendada do pacote:

```text
payload/
  ...arquivos da aplicação
migrations/
  001-ajuste.sql
rollback/
  001-ajuste-rollback.sql
```

Regras:

- O sistema nunca usa `git pull` para atualizar produção.
- A atualização usa apenas pacote versionado informado em `version.json`.
- O checksum SHA-256 do pacote deve coincidir com o manifesto.
- Se `downloadUrl` não for informado, o pacote precisa já existir em `/updates/packages`.
- O rollback restaura os arquivos do backup e executa SQLs somente se existirem em `rollback/`.

Limitação segura documentada:

- Migrações de banco sem scripts de retorno em `rollback/` não podem ser desfeitas automaticamente.
- Nesses casos, o rollback volta os arquivos versionados e a versão instalada, mas o banco deve ser revertido com script controlado.
