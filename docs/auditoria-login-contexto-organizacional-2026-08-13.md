# Auditoria do login e contexto organizacional — 13/08/2026

## Arquitetura encontrada

- A autenticação era feita em `usuarios`, com `tenant_id` e `instituicao_id` no próprio usuário.
- O login aceitava e-mail, senha e CNPJ/código/slug; quando havia mais de um tenant para o mesmo e-mail, o CNPJ era exigido.
- O JWT carregava `tenant_id`, instituição, CNPJ, perfil e permissões.
- O isolamento operacional existente é predominantemente por `tenant_id`, aplicado pelos repositories dos módulos.
- `instituicoes` representa hoje o tenant legado e também concentra o CNPJ principal.
- `unidade_assistencial` pode possuir CNPJ, mas ainda não era uma unidade organizacional independente no modelo de autorização.
- `projetos` possui tenant e unidade assistencial legada, sem escopo de usuário unidade/projeto.

## Alterações desta etapa

- Migration incremental `20260813_login_contexto_organizacional`.
- Novas estruturas: `usuario_identidade`, `usuario_acesso`, `entidades_juridicas`, `unidades_organizacionais` e `locais_execucao`.
- Backfill idempotente dos usuários existentes sem remover nem duplicar registros legados.
- Login por e-mail e senha sem CNPJ.
- Seleção de ambiente com ticket assinado, curto e validado no backend.
- Endpoint de ambientes autorizados e troca de ambiente sem logout.
- Regra unitária de decisão de escopo separada da permissão de operação.
- Registro de login, seleção e troca de ambiente usando a auditoria existente.
- API administrativa para listar catálogo, consultar e substituir vínculos de acesso por usuário, sempre limitada à instituição da sessão.
- Tela administrativa de usuários integrada ao cadastro de escopos e perfis por vínculo.
- Cabeçalho integrado à troca de unidade e projeto com revalidação no backend.
- Contexto ativo propagado do JWT para o request autenticado.
- Listagem, dashboard, detalhe, histórico e operações de projeto passaram a respeitar `projeto_id` do contexto ativo, retornando 403 para ID direto fora do contexto.
- Manual do sistema atualizado pela própria migration, quando a tabela existir.
- Versão atualizada para `1.00.824`.

## Compatibilidade e segurança

As consultas legadas por `tenant_id` foram preservadas. O CNPJ continua disponível para documentos, contratos e relatórios, mas deixou de ser obrigatório no novo fluxo de credenciais. O endpoint de seleção não confia em `instituicao_id` enviado livremente: valida ticket, identidade e vínculo ativo no servidor.

## Pendências obrigatórias antes da ativação definitiva

1. Integrar `exigirEscopo` aos repositories/controllers de todos os módulos com registros por unidade, projeto ou local, incluindo downloads, exportações, relatórios, autocompletes e IDs diretos.
2. Invalidar explicitamente todas as queries/cache dos módulos ao trocar unidade/projeto.
3. Integrar `exigirEscopo` aos repositories/controllers de cada módulo, além do tenant legado.
4. Criar testes de integração com banco para dois tenants, incluindo IDOR, anexos, relatórios e paginação.
5. Validar a migration em cópia do banco de produção e executar smoke tests de login/MFA/Google/passkey.

Esta etapa não deve ser considerada conclusão do isolamento organizacional absoluto enquanto os cinco itens acima não forem executados.
