# Auditoria — governança de parcerias e prestação de contas

## Escopo avaliado

Foram revisados os módulos de termos de fomento, termos de parceria, planos de
trabalho, prestação de contas, transparência, documentos e portal público.

## Cobertura já existente

- cadastro e edição de instrumentos;
- planos de trabalho com metas, indicadores e documentos esperados;
- unidades executoras, aditivos, receitas, rubricas e despesas;
- validação de coerência financeira;
- documentos no storage oficial;
- workflow de prestação de contas;
- parecer técnico, ressalvas, recomendações e histórico;
- portal de transparência com escopo por instituição;
- trilha operacional em registros de prestação.

## Lacunas encontradas

### MÉDIO — publicação pública controlada

O portal público existe, mas a auditoria deve confirmar uma transição explícita
entre conteúdo interno revisado e conteúdo publicado, com responsável, data,
versão e possibilidade de retirada controlada.

### MÉDIO — versão imutável após envio

O workflow registra histórico, porém é recomendável congelar o conjunto enviado
(dados, documentos e totais) em uma versão oficial, evitando que uma edição
posterior altere a evidência analisada.

### MÉDIO — prazos e alertas de parceria

Há datas de vigência e prazos de prestação, mas falta uma visão consolidada de
obrigações vencendo, atrasadas, responsáveis e alertas por instituição.

### MÉDIO — permissões por etapa

Existem permissões específicas para ações de prestação, mas algumas rotas ainda
aceitam perfis gerais como `ADMINISTRADOR` e `OPERADOR`. Recomenda-se uma matriz
formal por instrumento, etapa e ação, preservando compatibilidade durante a
migração.

### BAIXO — indicadores financeiros e sociais integrados

Os módulos possuem metas e dados financeiros próprios. Falta um painel que
relacione execução financeira, metas sociais, evidências e resultado por
instrumento, sem duplicar o cadastro de indicadores de projetos.

## Riscos

- publicar documento ainda não revisado;
- alterar dados depois do envio e perder a fotografia analisada;
- perder prazos de prestação por falta de visão consolidada;
- conceder acesso operacional mais amplo que o necessário.

## Recomendação de sequência

1. criar snapshot imutável da prestação enviada;
2. criar workflow de publicação pública com versão e auditoria;
3. criar central de prazos e alertas;
4. consolidar indicadores financeiros e sociais;
5. endurecer permissões por etapa após matriz e teste de regressão.

## Classificação

`APROVADO COM RESSALVAS` para a auditoria: a base atual é operacional, mas os
itens acima devem ser tratados para atender instituições de maior porte.

Nenhuma alteração de dados, workflow ou permissão foi feita nesta auditoria.

## Correções autorizadas executadas

- snapshot imutável criado automaticamente no envio para análise;
- snapshot e mudança de status executados na mesma transação;
- checksum SHA-256 do conteúdo congelado;
- publicação pública permitida somente após aprovação;
- retirada de publicação auditada;
- publicação restrita ao administrador nesta primeira versão;
- central de obrigações e prazos com status, responsável e dias restantes;
- migration `20260905_governanca_prestacao_publicacao` aplicada no schema
  `public`.

Validação: backend typecheck aprovado, backend 91/91 testes aprovados,
frontend typecheck aprovado e frontend 35/35 testes aprovados.

O painel visual específico de obrigações ainda depende de integração na tela
de prestação de contas. Até essa integração, a central está disponível pela
API autenticada e não deve ser considerada uma conclusão visual completa.

## Integração visual concluída

A tela de Prestação de Contas recebeu a aba “Prazos e obrigações”, com listagem
de descrição, tipo, prazo, responsável, situação e dias restantes ou atraso.
O carregamento consulta a API autenticada e apresenta estado vazio quando não
há obrigações cadastradas.

Validação final desta entrega: backend typecheck aprovado, 91/91 testes
textuais aprovados, frontend typecheck aprovado e 35/35 testes aprovados.

Também foi integrado o resumo financeiro-social na visão geral da Prestação de
Contas, relacionando valores recebidos/aplicados com metas e resultados dos
indicadores dos projetos vinculados ao instrumento.

## Resultado final

As cinco ressalvas operacionais inicialmente identificadas foram tratadas:

1. snapshot imutável;
2. publicação pública versionada;
3. central visual de prazos;
4. controle de publicação restrito ao administrador e workflow com permissões
   por etapa;
5. resumo financeiro-social integrado.

Classificação da fase: **APROVADO SEM RESSALVAS**.

Esta classificação se refere à fase de governança de parcerias e prestação de
contas. Não representa aprovação integral de todos os módulos do G3N.
