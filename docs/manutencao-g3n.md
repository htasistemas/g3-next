# Modo manutenção do G3N

## Visão geral

O modo manutenção do G3N foi desenhado para evitar que o usuário veja erros técnicos como `502 Bad Gateway`, tela padrão do Cloudflare ou mensagens de proxy durante atualização do sistema.

Quando a flag `maintenance.enable` existe:

- o `nginx-g3n` responde `503 Service Unavailable`
- a origem serve a página estática de manutenção do G3N
- o backend responde `503` amigável para chamadas de API que ainda cheguem até a aplicação
- o deploy automático mantém essa flag ativa do início ao fim da atualização

## Arquivos principais

- Página estática: `frontend/public/maintenance.html`
- Estilo estático: `frontend/public/maintenance.css`
- Componente React: `frontend/src/components/system/maintenance-screen.tsx`
- Preview React: `frontend/src/pages/maintenance-preview-page.tsx`
- Proxy de origem: `nginx/default.conf`
- Middleware do backend: `backend/src/middlewares/maintenance-mode.ts`
- Automação do deploy: `deploy.sh`

## Ativação manual

Modo manutenção ligado:

```bash
mkdir -p docker/runtime
printf 'enabled_at=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > docker/runtime/maintenance.enable
```

Modo manutenção desligado:

```bash
rm -f docker/runtime/maintenance.enable
```

Status:

```bash
test -f docker/runtime/maintenance.enable && echo "ativo" || echo "inativo"
```

## Fluxo automático no deploy

O `deploy.sh` agora:

1. incrementa a versão
2. ativa a flag de manutenção
3. mantém o `nginx-g3n` no ar para servir a página estática
4. recria backend e frontend
5. valida healthchecks
6. remove a flag somente quando o deploy termina com sucesso

Se o deploy falhar, a flag permanece ativa para impedir que o visitante veja erro bruto de gateway.

## Integração do Nginx

O proxy usa o arquivo:

```text
/var/run/g3n/maintenance.enable
```

Com a flag ativa:

- `/`
- `/assets/*`
- `/api/*`

retornam `503` e são redirecionados internamente para `maintenance.html`.

O endpoint `/healthz` do Nginx permanece `200`, para o container não ficar unhealthy durante a manutenção.

## Integração do backend

O backend usa a variável:

```text
APP_MAINTENANCE_FLAG_PATH=/var/run/g3n/maintenance.enable
```

Quando a flag existe, as APIs retornam `503` com mensagem amigável. O endpoint `/health` continua liberado para healthcheck e orquestração.

## Cloudflare

A solução principal está na origem, que é o cenário prioritário para evitar a tela padrão do Cloudflare.

Se quiser configurar `Custom Errors` no Cloudflare:

- use `frontend/public/maintenance.html` como base visual
- incorpore o conteúdo de `frontend/public/maintenance.css` inline na versão final enviada ao Cloudflare, caso o painel exija HTML autocontido

## Observações operacionais

- A página de manutenção não depende da API principal.
- Os assets críticos são locais e leves.
- A estrutura já está pronta para, no futuro, mostrar previsão, changelog resumido e status detalhado.
