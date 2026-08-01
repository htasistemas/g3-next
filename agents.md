# AGENTS.md — G3 Next (Migração)

> Este arquivo foi reiniciado para a fase de migração.
> As regras antigas foram removidas do padrão ativo.

---

## Estado Atual

- Padrão anterior: desativado para a migração.
- Padrão atual: mínimo e evolutivo.
- Objetivo: permitir criação de novas regras sem herdar conflitos legados.

---

## Regras Ativas Temporárias

### Idioma

- Frontend (UI): Português Brasil (pt-BR) com acentuação correta.
- Backend (código e banco): identificadores sem acentos.

### UX e Interação

- Toda ação deve funcionar com 1 clique.
- Não aceitar fluxo com clique duplo para executar ação.
- Exibir feedback visual em ações assíncronas (carregando, sucesso, erro).

### Menus e Navegação

- MUST NOT remover menus, módulos, itens de menu, rotas de navegação ou entradas já criadas no shell do sistema sem autorização explícita, específica e extremamente confirmada pelo usuário.
- MAY adicionar ou alterar menus para corrigir nomenclatura, agrupamento, permissão, ícone ou rota, desde que a tela continue acessível.
- Ao substituir um menu por outro, MUST manter compatibilidade de acesso ou registrar claramente a migração no manual do sistema e na entrega.
- Exclusão definitiva de menu só pode ocorrer quando o usuário solicitar expressamente a remoção e confirmar que entende que o acesso deixará de aparecer na navegação.

### Manual do Sistema

- MUST manter a tela `Configurações gerais > Manual do sistema` atualizada sempre que houver criação, alteração ou remoção relevante de tela, fluxo, regra de negócio ou nomenclatura no G3N.
- MUST revisar o conteúdo do manual na mesma entrega em que a funcionalidade do sistema for alterada, evitando defasagem entre operação real e documentação interna.

### Capitalização UI

- Toda tela criada ou alterada deve seguir obrigatoriamente este padrão de capitalização.
- Usar sentence case em labels, títulos, abas, botões e mensagens.
- Usar maiúsculas apenas para siglas (CPF, CNPJ, LGPD, CEP, UF).

### Listagens

- MUST usar como modelo base a tela `Cadastro de beneficiários > aba Listagem de beneficiários` sempre que criar ou alterar uma aba de listagem no sistema.
- MUST manter nas abas de listagem a mesma lógica visual e estrutural de referência: filtros no topo, botão de limpar filtros, tabela com rolagem, linhas clicáveis, destaque visual do item selecionado e estados claros de carregamento e vazio.

### Banco de Dados

- Antes de alterar estrutura: analisar impacto e registrar diagnóstico.
- Priorizar compatibilidade com estrutura existente.

### Versionamento do sistema

- MUST manter a versão do sistema em sequência crescente, sem reutilizar nem regredir numeração.
- MUST atualizar o arquivo oficial de versão do sistema a cada entrega que exigir bump de versão.

### Armazenamento de Fotos, Imagens e Documentos

#### Regra obrigatória de armazenamento de arquivos

- MUST NOT salvar fotos, imagens, PDFs ou documentos binários diretamente no banco de dados.
- MUST NOT salvar arquivos em base64 no banco de dados.
- MUST armazenar no banco apenas os metadados do arquivo e seu caminho físico ou lógico.
- MUST armazenar os arquivos físicos em pasta estruturada no servidor ou em serviço de storage compatível.
- MUST manter a implementação preparada para futura migração para storage externo sem reescrita da regra de negócio.

#### Estrutura padrão de armazenamento

- MUST usar uma pasta raiz de armazenamento, preferencialmente `/storage`.
- MUST organizar os arquivos por entidade e categoria.
- MUST seguir, como padrão inicial, a estrutura:

```text
/storage/beneficiarios/fotos
/storage/beneficiarios/documentos
/storage/colaboradores/fotos
/storage/colaboradores/documentos
/storage/instituicoes/documentos
/storage/doacoes/comprovantes
/storage/cursos/comprovantes
/storage/almoxarifado/anexos
/storage/geral/outros
```

---

## MÁSCARAS, VALIDAÇÕES E NORMALIZAÇÃO DE CAMPOS

### Regra geral

- MUST aplicar máscara visual apenas no front-end quando necessário.
- MUST validar os campos no front-end e no back-end.
- MUST normalizar os dados antes de salvar no banco.
- MUST salvar no banco sem máscara, salvo quando a natureza do campo exigir formato literal.
- MUST criar funções/utilitários centralizados para máscara, validação e normalização.
- MUST evitar regras duplicadas em telas diferentes.
- MUST padronizar mensagens de erro de forma clara e amigável.
- MUST destacar visualmente campos inválidos.
- MUST revalidar no submit mesmo que já tenha validado no blur.
- MUST impedir persistência de dados inválidos.
- MUST garantir que filtros, buscas, importações e integrações usem o valor normalizado.
- MUST criar testes unitários e de integração para validações críticas.
- MUST manter compatibilidade com a arquitetura existente do sistema.
- MUST seguir o padrão visual e técnico do G3 / G3-Next.

### CPF

- MUST usar máscara visual `000.000.000-00`.
- MUST aceitar apenas números na regra atual.
- MUST remover máscara antes de salvar.
- MUST validar CPF com 11 dígitos.
- MUST validar os dígitos verificadores.
- MUST rejeitar sequências repetidas como `00000000000`, `11111111111` e equivalentes.
- MUST impedir gravação de CPF inválido quando informado.
- MUST impedir gravação quando o campo for obrigatório e estiver vazio.
- MUST padronizar buscas e comparações com CPF sem máscara.

### CNPJ

- MUST usar máscara visual `00.000.000/0000-00`.
- MUST remover máscara antes de salvar.
- MUST validar CNPJ com 14 posições na regra vigente.
- MUST validar os dígitos verificadores.
- MUST rejeitar sequências repetidas inválidas.
- MUST impedir gravação de CNPJ inválido quando informado.
- MUST impedir gravação quando o campo for obrigatório e estiver vazio.
- MUST padronizar buscas e comparações com CNPJ sem máscara.
- MUST deixar a arquitetura preparada para futura evolução do CNPJ alfanumérico sem retrabalho estrutural.

### E-mail

- MUST não usar máscara visual.
- MUST remover espaços em branco desnecessários no início e no fim.
- MUST converter para minúsculo antes de salvar, salvo exceção tecnicamente justificada.
- MUST validar estrutura mínima de e-mail.
- MUST rejeitar e-mails sem `@`, sem domínio ou com espaços inválidos.
- MUST impedir persistência de e-mail inválido quando o campo for obrigatório.
- MUST padronizar busca e comparação com e-mail normalizado.

### Telefone fixo

- MUST usar máscara visual `(00) 0000-0000` quando o número possuir 10 dígitos.
- MUST salvar apenas números.
- MUST validar DDD e quantidade de dígitos.
- MUST normalizar antes de persistir.

### Celular

- MUST usar máscara visual `(00) 00000-0000` quando o número possuir 11 dígitos.
- MUST salvar apenas números.
- MUST validar DDD e quantidade de dígitos.
- MUST normalizar antes de persistir.

### WhatsApp

- MUST seguir a regra de celular quando nacional.
- MUST permitir arquitetura preparada para formato internacional com DDI.
- MUST salvar apenas números no formato normalizado.
- MUST padronizar integrações usando número limpo.

### CEP

- MUST usar máscara visual `00000-000`.
- MUST salvar apenas números.
- MUST validar quantidade de 8 dígitos.
- MUST normalizar antes de persistir.

### Data

- MUST usar máscara visual `00/00/0000` quando houver digitação manual.
- MUST validar datas inexistentes, como dia 31 em mês incompatível.
- MUST exibir datas em `dd-mm-aaaa` na interface e nos relatórios, salvo exigência técnica explícita de integração.
- MUST armazenar no formato de data adequado no banco.
- MUST padronizar uso de formato ISO em integrações e APIs sempre que aplicável.

### Valores monetários

- MUST usar máscara visual compatível com moeda brasileira no front-end.
- MUST armazenar valor sem símbolo monetário e sem formatação visual.
- MUST usar tipo numérico apropriado no banco.
- MUST evitar salvar valores monetários como texto.
- MUST padronizar arredondamento e precisão decimal.

### Percentuais

- MUST usar máscara visual apenas para facilitar digitação.
- MUST salvar valor numérico limpo.
- MUST padronizar regra de casas decimais.

### Normalização obrigatória

- MUST centralizar funções como:
  - `normalizarCpf`
  - `validarCpf`
  - `formatarCpf`
  - `normalizarCnpj`
  - `validarCnpj`
  - `formatarCnpj`
  - `normalizarEmail`
  - `validarEmail`
  - `normalizarTelefone`
  - `formatarTelefone`
  - `normalizarCep`
  - `formatarCep`
- MUST usar essas funções em todas as telas e endpoints relacionados.
- MUST evitar implementação isolada por componente quando já existir utilitário central.

### UX obrigatória

- MUST validar no blur e no submit.
- MUST exibir mensagem clara abaixo do campo com erro.
- MUST marcar visualmente o campo inválido.
- MUST impedir que o usuário finalize cadastros com dados críticos inválidos.
- MUST manter comportamento consistente em todas as telas.

### Banco de dados e integridade

- MUST revisar tamanho de colunas para suportar os formatos corretos.
- MUST evitar duplicidade causada por diferença de máscara.
- MUST comparar documentos e telefones sempre na forma normalizada.
- MUST garantir consistência entre front-end, back-end e banco.

### Testes obrigatórios

- MUST criar testes para casos válidos e inválidos.
- MUST testar campos com máscara e sem máscara.
- MUST testar campos obrigatórios e opcionais.
- MUST testar normalização antes da persistência.
- MUST testar compatibilidade com filtros, buscas e integrações.

---

## Novas Regras (Em Construção)

> Preencher nesta seção os novos padrões oficiais da migração.

- [ ] Arquitetura frontend
- [ ] Arquitetura backend
- [ ] Padrão de componentes
- [ ] Padrão de API e erros
- [ ] Padrão de testes
- [ ] Padrão de versionamento
- [ ] Padrão visual global
