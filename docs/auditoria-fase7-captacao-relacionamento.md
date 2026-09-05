# Auditoria — captação e relacionamento com doadores

## Cobertura existente

- cadastro de doadores pessoa física, jurídica, institucionais e anônimos;
- CPF/CNPJ, consentimento LGPD e preferências de comunicação;
- segmentação, retenção, risco e score de relacionamento;
- tarefas de follow-up e responsável;
- campanhas públicas com meta e métricas;
- doações únicas, recorrentes e por campanha;
- PIX, cartão e boleto como contratos de pagamento;
- portal doador com autenticação limitada por rate limit;
- comprovantes, reenvio e histórico;
- permissões específicas por operação;
- isolamento por tenant nas consultas principais.

## Pendência crítica identificada

O repositório contém provider de pagamento mock (`mock-payment-provider.service`)
e contratos preparados para providers externos, mas não há evidência de gateway
produtivo configurado, webhook autenticado e reconciliação idempotente em
produção. Não é seguro considerar o recebimento eletrônico pronto apenas porque
o fluxo visual de cobrança existe.

## Riscos

- marcar doação como paga sem confirmação externa verificável;
- duplicar confirmação em retentativas de webhook;
- divergência entre gateway, banco e recibo;
- armazenar ou expor credenciais de pagamento;
- publicar campanha sem política de consentimento completa.

## Implementação realizada nesta fase

- provider Mercado Pago selecionável por `CAPTACAO_PAYMENT_PROVIDER`;
- cadastro administrativo por tenant em Configurações gerais > Integrações e APIs > Mercado Pago;
- access token e segredo do webhook armazenados cifrados, com valores apenas mascarados na interface;
- URL base da API e URL pública do webhook persistidas por instituição;
- criação real de cobranças via API, com `X-Idempotency-Key`;
- PIX via `/v1/payments` e checkout hospedado para cartão/boleto;
- referência externa persistida na doação e vinculada ao provider;
- webhook público com validação HMAC `x-signature` e janela de replay;
- tabela de eventos recebidos com chave idempotente;
- atualização do status interno somente após consulta do pagamento no gateway;
- emissão automática de comprovante após confirmação;
- provider mock bloqueado em produção pela configuração de ambiente.

## Pendências operacionais para produção

1. configurar `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET` e a
   URL pública do webhook no ambiente seguro;
2. validar o fluxo com credenciais de teste/sandbox do Mercado Pago;
3. executar os testes de assinatura inválida, replay, duplicidade, timeout e
   reconciliação com resposta real do gateway;
4. implementar assinaturas recorrentes do Mercado Pago em fase própria, sem
   tratar recorrência como doação avulsa.

## Classificação

`APROVADO COM RESSALVAS OPERACIONAIS`: o código de integração e o contrato de
segurança foram implementados, mas a habilitação produtiva depende de
credenciais, URL pública e homologação ponta a ponta no ambiente do Mercado
Pago.

Nenhuma doação, credencial ou configuração financeira foi alterada nesta
auditoria.
