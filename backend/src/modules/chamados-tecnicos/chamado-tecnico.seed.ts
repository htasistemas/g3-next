export const parametrosIniciaisChamadoTecnico = [
  { tipo: "TIPO", chave: "ERRO", nome: "Erro", cor: "#dc2626", ordem: 1 },
  { tipo: "TIPO", chave: "TAREFAS", nome: "Tarefas", cor: "#2563eb", ordem: 2 },
  { tipo: "TIPO", chave: "MELHORIA", nome: "Melhoria", cor: "#0f766e", ordem: 3 },
  {
    tipo: "TIPO",
    chave: "NOVA_IMPLEMENTACAO",
    nome: "Nova implementação",
    cor: "#7c3aed",
    ordem: 4
  },

  {
    tipo: "CATEGORIA",
    chave: "REGRAS_NEGOCIO",
    nome: "Regras de negócio",
    cor: "#0f766e",
    ordem: 1,
    padrao: true
  },
  { tipo: "CATEGORIA", chave: "CADASTROS", nome: "Cadastros", cor: "#2563eb", ordem: 2 },
  { tipo: "CATEGORIA", chave: "RELATORIOS", nome: "Relatórios", cor: "#a16207", ordem: 3 },

  { tipo: "PRIORIDADE", chave: "BAIXA", nome: "Baixa", cor: "#2563eb", ordem: 1, slaHoras: 168 },
  { tipo: "PRIORIDADE", chave: "NORMAL", nome: "Normal", cor: "#16a34a", ordem: 2, slaHoras: 72 },
  {
    tipo: "PRIORIDADE",
    chave: "PRIORIDADE",
    nome: "Prioridade",
    cor: "#eab308",
    ordem: 3,
    slaHoras: 24
  },
  { tipo: "PRIORIDADE", chave: "URGENTE", nome: "Urgente", cor: "#dc2626", ordem: 4, slaHoras: 8 },

  { tipo: "SITUACAO", chave: "ABERTO", nome: "Aberto", cor: "#0ea5e9", ordem: 1, padrao: true },
  { tipo: "SITUACAO", chave: "EM_ANALISE", nome: "Em análise", cor: "#0284c7", ordem: 2 },
  {
    tipo: "SITUACAO",
    chave: "AGUARDANDO_RETORNO_SOLICITANTE",
    nome: "Aguardando retorno do solicitante",
    cor: "#f59e0b",
    ordem: 3
  },
  {
    tipo: "SITUACAO",
    chave: "EM_DESENVOLVIMENTO",
    nome: "Em desenvolvimento",
    cor: "#eab308",
    ordem: 4
  },
  { tipo: "SITUACAO", chave: "EM_TESTES", nome: "Em testes", cor: "#14b8a6", ordem: 5 },
  { tipo: "SITUACAO", chave: "RESOLVIDO", nome: "Resolvido", cor: "#16a34a", ordem: 6 },
  {
    tipo: "SITUACAO",
    chave: "NAO_SERA_IMPLEMENTADO",
    nome: "Não será implementado",
    cor: "#dc2626",
    ordem: 7
  },
  { tipo: "SITUACAO", chave: "FECHADO", nome: "Fechado", cor: "#334155", ordem: 8 },
  { tipo: "SITUACAO", chave: "CANCELADO", nome: "Cancelado", cor: "#6b7280", ordem: 9 },
  { tipo: "SITUACAO", chave: "REABERTO", nome: "Reaberto", cor: "#f97316", ordem: 10 },

  {
    tipo: "SISTEMA",
    chave: "G3_NEXT",
    nome: "G3-Next Terceiro Setor",
    cor: "#0f766e",
    ordem: 1,
    padrao: true
  },

  { tipo: "PROJETO", chave: "OPERACAO_CORRENTE", nome: "Operação corrente", cor: "#475569", ordem: 1, padrao: true },
  { tipo: "PROJETO", chave: "MELHORIAS_CONTINUAS", nome: "Melhorias contínuas", cor: "#0f766e", ordem: 2 },

  { tipo: "SPRINT", chave: "BACKLOG", nome: "Backlog", cor: "#94a3b8", ordem: 1, padrao: true },
  { tipo: "SPRINT", chave: "SPRINT_ATUAL", nome: "Sprint atual", cor: "#2563eb", ordem: 2 },
  { tipo: "SPRINT", chave: "PROXIMA_SPRINT", nome: "Próxima sprint", cor: "#0f766e", ordem: 3 },

  {
    tipo: "MOTIVO_REABERTURA",
    chave: "AJUSTE_INCOMPLETO",
    nome: "Ajuste incompleto",
    cor: "#f59e0b",
    ordem: 1
  },
  {
    tipo: "MOTIVO_REABERTURA",
    chave: "VALIDACAO_REPROVADA",
    nome: "Validação reprovada",
    cor: "#dc2626",
    ordem: 2
  },
  { tipo: "MOTIVO_REABERTURA", chave: "NOVO_CENARIO", nome: "Novo cenário", cor: "#0ea5e9", ordem: 3 },

  { tipo: "ORIGEM", chave: "MANUAL", nome: "Manual", cor: "#475569", ordem: 1, padrao: true },
  { tipo: "ORIGEM", chave: "SUPORTE", nome: "Suporte", cor: "#0284c7", ordem: 2 },
  { tipo: "ORIGEM", chave: "INTERNO", nome: "Interno", cor: "#7c3aed", ordem: 3 }
] as const;
