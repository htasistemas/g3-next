# Política de Segurança

## Regras obrigatórias

- Todas as dependências devem usar versões fixas (sem ^ ou latest)
- É proibido instalar pacotes via git ou URL
- Toda nova dependência deve ser justificada
- Scripts de instalação são bloqueados por padrão
- Toda alteração deve passar por auditoria (npm audit)

## Processo de instalação

1. npm install --ignore-scripts
2. npm audit
3. Revisão manual da dependência

## Incidentes

Em caso de suspeita:
- Remover node_modules
- Limpar cache
- Reinstalar dependências
- Rotacionar credenciais
