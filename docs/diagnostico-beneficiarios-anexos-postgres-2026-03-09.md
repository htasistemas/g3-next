# Diagnóstico - Anexos de beneficiários no Postgres

Data: 9 de março de 2026

## Problema identificado

- O cadastro React de beneficiários mantém anexos de documentos como `data:` URL até o momento do salvar.
- O backend Node/Prisma persiste esse valor na coluna `documentos.caminho_arquivo`.
- A coluna estava modelada como `VARCHAR(400)`, o que é incompatível com anexos em base64 e provoca erro `500` ao salvar quando há documento anexado.

## Impacto analisado

- O erro afeta diretamente `POST /api/beneficiarios` e `PUT /api/beneficiarios/:id`.
- O problema também interfere na visualização, porque o frontend depende do conteúdo salvo para abrir o documento.
- A alteração é compatível com a estrutura existente: `TEXT` em PostgreSQL aceita os valores atuais e futuros sem quebrar leituras já gravadas.

## Decisão aplicada

- Alterar `documentos.caminho_arquivo` para `TEXT`.
- Manter `nome_arquivo`, `content_type` e a tabela `documentos` sem mudança de relacionamento.
- Preservar compatibilidade com payloads antigos que enviam `conteudo` em vez de `caminhoArquivo`.

## Compatibilidade

- Leituras existentes continuam funcionando.
- Registros já persistidos não exigem conversão de dados.
- A alteração é aditiva do ponto de vista funcional e evita salvamento local temporário como destino final do anexo.
