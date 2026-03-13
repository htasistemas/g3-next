# Deploy G3-Next

Use somente o stack do `g3n` para evitar qualquer mistura com o G3 legado.

Diretorio do deploy:

```bash
cd /home/srv/g3n
```

Comando recomendado:

```bash
bash ./deploy.sh
```

Checklist rapido:
- `docker compose ps`
- Backend Node exposto apenas localmente em `127.0.0.1:3333`
- Frontend React exposto apenas localmente em `127.0.0.1:3200`
- `curl -fsS http://127.0.0.1:3333/health`
- `curl -fsS http://127.0.0.1:3200/`

Cloudflare Tunnel:
- Preencha o `.env` com `TUNNEL_TOKEN`.
- `g3n.htasistemas.com.br` deve apontar para `http://nginx-g3n:80`.

Observacoes:
- Nao use `docker-compose.tunnel.yml` em paralelo com este fluxo.
- O `deploy.sh` incrementa a versao antes do build.
- O estado local de deploy fica em `~/.g3n-deploy`, incluindo backups do checkout e o ultimo numero de versao aplicado.
