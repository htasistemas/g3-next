# Auditoria da tela Carteira digital do evento

## Escopo

Auditoria funcional, financeira, de segurança, multi-tenant, acessibilidade e impressão da tela existente.

| Elemento | Finalidade e tipo | Obrigatório/origem | Validação e persistência | Permissão/status |
| --- | --- | --- | --- | --- |
| Evento em operação | Seleção do evento, relacionamento | Obrigatório; banco | Deve pertencer ao tenant e carregar os dados reais | Visualização; validado |
| Participante | Proprietário da carteira | Obrigatório; cadastro | Deve pertencer ao evento selecionado | Visualização/edição conforme perfil |
| Nome do participante | Identificação textual | Obrigatório; usuário | 3–200 caracteres; PostgreSQL | Editar carteira |
| Telefone | Contato opcional | Opcional; usuário | DDD e 10/11 dígitos; salva normalizado | Editar carteira |
| CPF | Identificação opcional | Opcional; usuário | Dígitos verificadores; salva sem máscara | Editar carteira |
| Evento da carteira | Vínculo de segurança | Automático; banco | Não pode ser trocado para outro tenant | Backend |
| Número da carteira | Código alternativo | Automático ou informado | Único no evento; nunca substitui validação do saldo | Backend/ajuste |
| Status da carteira | Controle de uso | Obrigatório; sistema | Apenas status permitidos; carteira não ativa é recusada | Ajuste autorizado |
| Saldo atual | Saldo disponível | Somente leitura; movimentações | Não editável diretamente; transação e bloqueio PostgreSQL | Visualização |
| QR Code | Identificação por token | Automático; backend | Token validado no servidor; não contém saldo | Operação/ajuste |
| Validade do crédito | Expiração de uso | Opcional; evento | Recusa consulta e venda após expiração | Edição de evento |
| Recarga | Crédito da carteira | Valor e forma obrigatórios | Valor positivo, histórico e auditoria | Permissão de recarga |
| Ajuste | Correção autorizada | Motivo obrigatório | Não permite saldo negativo sem regra explícita | Permissão de ajuste |
| Transferência | Movimentação entre carteiras | Destino, valor e motivo | Mesmo evento/tenant e saldo suficiente | Permissão de transferência |
| Barraca | Ponto de venda | Obrigatório na venda | Deve ser ativa e pertencer ao evento | Operação |
| Produto/item | Composição da venda | Pelo menos um | Preço vem do banco; estoque é bloqueado e baixado | Edição/operador |
| Total da compra | Cálculo monetário | Automático | Soma dos itens; não editável | Backend |
| Código manual | Alternativa ao QR | Obrigatório quando não houver leitura | Validado pelo backend e evento | Operador |
| Confirmar débito | Finalização financeira | Condicionado a carteira, barraca e itens | Idempotência, saldo, estoque e rollback | Permissão de operação |
| Estornar venda | Reversão financeira | Motivo obrigatório | Não apaga venda; devolve saldo, estoque e audita | Permissão de ajuste |
| Extrato | Histórico da carteira | Somente leitura | Vem do banco, filtrado por tenant | Visualização |
| Fechamento | Consolidação do evento | Somente leitura | Exclui estornos do consumo e exibe divergências | Fechamento/visualização |
| Auditoria | Rastreabilidade | Somente leitura | Registra operação, operador, venda e dados | Relatórios |
| Imprimir cartão/comanda | Identificação física | Carteira selecionada | Formato CR80; impressão auditada | Visualização/reimpressão |

## Critérios confirmados

- O saldo é fonte de verdade do backend e não do QR Code ou do cartão impresso.
- As consultas aplicam o `tenant_id` da sessão e conferem o evento relacionado.
- Venda, débito, estoque, auditoria e livro-caixa operacional ficam na mesma transação.
- Estorno gera nova movimentação e preserva a venda original.
- O cartão impresso não exibe saldo nem token interno.
- A impressão usa `@page { size: 85.60mm 53.98mm }` e registra primeira impressão ou reimpressão.
- A listagem possui busca, filtros operacionais e seleção para impressão em lote; cada cartão é gerado com QR Code individual e auditoria própria.
- O abastecimento possui atalhos de valores, prévia do novo saldo e confirmação explícita antes da persistência.
- O PDV possui leitura por câmera via `BarcodeDetector` quando disponível, com fallback para código manual; a autorização continua sendo feita no backend.

## Pendências para aprovação final

QR temporário, pagamento misto, abertura/fechamento operacional de caixas, PDF dedicado e teste físico com câmera/impressora precisam de validação no ambiente de produção/equipamentos reais.
