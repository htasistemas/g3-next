# Georreferenciamento territorial

## Diagnóstico aplicado

- A tela antiga não expunha beneficiários como camada territorial própria.
- Famílias dependiam do endereço do beneficiário de referência para aparecer, então sumiam quando a referência não tinha latitude/longitude.
- A consulta anterior era orientada para mapa estático, sem recorte por área visível, sem agregação territorial e sem fluxo claro para correção manual.

## Evidências encontradas na base

- Beneficiários: 1446 no total, 20 com geolocalização disponível.
- Famílias: 2 no total, 1 com referência geolocalizada e 2 com endereço próprio textual.
- Profissionais: 3 no total, sem geolocalização.
- Voluntários: 2 no total, sem geolocalização.
- Instituições: 2 no total, 2 geolocalizadas.
- Doações/distribuições: 21 registros.

## Arquitetura nova

- Backend novo em `dashboard-georreferenciamento.service.ts` com filtros cruzados, clusters, heatmap, agregação e recorte por `bbox`.
- Estruturas novas de apoio:
  - `territorial_localizacao`
  - `territorial_localizacao_auditoria`
  - `territorial_ponto_manual`
  - `territorial_ponto_manual_auditoria`
  - `territorial_geocoding_log`
- Consulta orientada por camadas selecionadas, evitando carregar datasets não usados.
- Tela React refeita para trabalhar com:
  - filtros antes da renderização
  - atualização por área visível do mapa
  - clusterização
  - heatmap
  - card lateral de identificação
  - marcação manual no mapa
  - exportação de lista, imagem SVG e visão para PDF

## Endpoints novos

- `GET /api/dashboard/georreferenciamento/opcoes`
- `POST /api/dashboard/georreferenciamento/consulta`
- `GET /api/dashboard/georreferenciamento/detalhe/:id`
- `GET /api/dashboard/georreferenciamento/vinculos`
- `POST /api/dashboard/georreferenciamento/marcacoes`
- `POST /api/dashboard/georreferenciamento/geocodificar-pendentes`

## Estratégia de coordenadas

- Latitude e longitude persistidas e reaproveitadas.
- Geocodificação somente para pendências.
- Log de sucesso, falha e não encontrado.
- Correção manual auditada por usuário.
