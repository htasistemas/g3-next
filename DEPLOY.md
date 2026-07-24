# Deploy G3-Next

Use somente o stack do `g3n`.

Diretorio do deploy:

```bash
cd /home/srv/g3n
```

Comando recomendado:

```bash
bash ./deploy.sh
```

O deploy não executa migrations por padrão. Para aplicar migrations, revise o impacto e execute explicitamente:

```bash
DEPLOY_RUN_MIGRATIONS=1 bash ./deploy.sh
```

O arquivo `.env` de produção deve definir explicitamente as credenciais do PostgreSQL, MinIO, SMTP, CORS e o segredo JWT. O `docker-compose.yml` não fornece credenciais padrão para esses serviços.

Em escala horizontal, mantenha os schedulers em apenas uma instância e defina `APP_RUN_SCHEDULERS=false` nas instâncias de API sem função de worker.

O deploy oficial atualiza o checkout Git com `git pull --ff-only --autostash` antes do build. Se houver conflito real no servidor, o deploy para em vez de publicar uma versão antiga ou misturada.

Modo manutencao:
- O `deploy.sh` ativa automaticamente a pagina de manutencao no inicio do deploy.
- Ao final, com stack saudavel, o modo manutencao e desativado automaticamente.
- Em falha de deploy, a flag de manutencao e mantida para evitar `502` bruto ao usuario.

Checklist rapido:
- `docker compose ps`
- Backend Node exposto apenas localmente em `127.0.0.1:3333`
- Frontend React exposto apenas localmente em `127.0.0.1:3200`
- `curl -fsS http://127.0.0.1:3333/health`
- `curl -fsS http://127.0.0.1:3200/`
- `bash ./scripts/deploy-check.sh`

Cloudflare Tunnel:
- Preencha o `.env` com `TUNNEL_TOKEN`.
- `g3n.htasistemas.com.br` deve apontar para `http://nginx-g3n:80`.

Observacoes:
- Nao use `docker-compose.tunnel.yml` em paralelo com este fluxo.
- O `deploy.sh` incrementa a versao antes do build.
- O frontend e reconstruido sem cache para evitar publicar bundle antigo de login ou rotas publicas.
- O estado local de deploy fica em `~/.g3n-deploy`, incluindo backups do checkout e o ultimo numero de versao aplicado.
- A flag de manutencao usada pelo proxy fica em `docker/runtime/maintenance.enable`.
