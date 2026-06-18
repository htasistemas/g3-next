# Diagnostico - Motoristas autorizados sem cadastro duplicado

Data: 2026-06-18

## Contexto

A tela Controle de veiculos deve vincular motoristas autorizados a partir dos cadastros ja existentes de profissionais e voluntarios, evitando duplicidade de cadastro de condutores no modulo de veiculos.

## Impacto em banco de dados

- Nao sera criada tabela propria de cadastro de motoristas no Controle de veiculos.
- A busca de motoristas disponiveis passa a consultar `cadastro_profissionais` ou `cadastro_profissional`, conforme a tabela existente na base, e `cadastro_voluntario`.
- A tabela `controle_veiculos_motoristas_autorizados` continua sendo usada para armazenar o vinculo com o veiculo, com `tipo_origem`, `profissional_id` ou `voluntario_id`.
- Novos vinculos usam somente `profissional_id` ou `voluntario_id`, conforme a origem selecionada.

## Compatibilidade

- Bases sem `cadastro_profissionais`, mas com `cadastro_profissional`, continuam compativeis.
- A consulta exige `tenant_id` nas tabelas de origem para impedir mistura de dados entre instituicoes.
- Nao ha armazenamento de arquivos ou documentos binarios no banco nesta alteracao.
