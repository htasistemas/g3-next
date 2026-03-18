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

Cloudflare Tunnel:
- Preencha o `.env` com `TUNNEL_TOKEN`.
- `g3n.htasistemas.com.br` deve apontar para `http://nginx-g3n:80`.

Observacoes:
- Nao use `docker-compose.tunnel.yml` em paralelo com este fluxo.
- O `deploy.sh` incrementa a versao antes do build.
- O estado local de deploy fica em `~/.g3n-deploy`, incluindo backups do checkout e o ultimo numero de versao aplicado.
- A flag de manutencao usada pelo proxy fica em `docker/runtime/maintenance.enable`.
