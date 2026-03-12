# Deploy G3

Use somente o compose principal para evitar instabilidade do tunnel.

Comandos recomendados:

```bash
cd /home/srv/g3n
docker compose up -d --build --remove-orphans
```

Checklist rapido:
- `docker compose ps`
- O backend expõe a porta localmente no host (`127.0.0.1:8081:8080`) apenas para o healthcheck do runner.
- `curl -fsS http://localhost:8081/health`
- `curl -fsS http://localhost:3200/`

Cloudflare Tunnel (obrigatorio para acesso externo):
- Preencha o `.env` com `TUNNEL_TOKEN` e `API_BASE_URL`.
  - Exemplo: `API_BASE_URL=https://g3.seudominio.com.br`
- Confirme os hostnames em `docker/cloudflared/config.yml`.
  - `g3.seudominio.com.br -> http://frontend:80`
  - `apig3.seudominio.com.br -> http://backend:8080`
- No painel do Cloudflare Zero Trust, crie o tunnel e gere o token.
  - Garanta que os DNS dos hostnames estejam apontando para o tunnel (CNAME).

Observacao:
- Nao use `docker-compose.tunnel.yml` (arquivo removido). O tunnel correto esta no `docker-compose.yml`.
