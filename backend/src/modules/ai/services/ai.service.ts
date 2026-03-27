import { Prisma } from "@prisma/client";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "../../../database/prisma.js";
import { env } from "../../../config/env.js";

type AiIntent =
  | "CONVERSA_SOCIAL"
  | "FAMILIAS_DESATUALIZADAS"
  | "BENEFICIARIOS_RESUMO"
  | "BENEFICIARIOS_POR_LOCAL"
  | "BENEFICIARIOS_POR_FAIXA_ETARIA"
  | "ATENDIMENTOS_RESUMO"
  | "RESUMO_DOACOES"
  | "TAREFAS_PENDENTES"
  | "TAREFAS_POR_RESPONSAVEL"
  | "MATRICULAS_RESUMO"
  | "CURSOS_SEM_VAGAS"
  | "DOACOES_PENDENTES_CAPTACAO"
  | "DOADORES_INADIMPLENTES_MES"
  | "RESUMO_SISTEMA"
  | "ORIENTACAO_TECNICA"
  | "RESPOSTA_ASSISTIDA"
  | "AJUDA"
  | "NAO_ENTENDIDO";

type AiResponseData = {
  origem: "banco_interno";
  fontes: string[];
  escopo?: string;
  parametros?: Record<string, string | number>;
  resumo?: Record<string, number | string | null>;
  exemplos?: Array<Record<string, string | number | null>>;
};

type AiResponse = {
  answer: string;
  data?: AiResponseData;
  intent: AiIntent;
};

type AiSuggestionCategory =
  | "familias"
  | "beneficiarios"
  | "beneficios"
  | "atendimentos"
  | "cursos-oficinas"
  | "gestao-indicadores"
  | "doadores-doacoes"
  | "fornecedores-estoque"
  | "territorio"
  | "inconsistencias"
  | "legislacao-orientacao";

type AiContextPayload = {
  pathname?: string;
  pageTitle?: string;
};

type AiSuggestionItem = {
  id: string;
  categoria: AiSuggestionCategory;
  pergunta: string;
  descricao: string;
  contextos?: string[];
};

type AiSuggestionCategoryMeta = {
  id: AiSuggestionCategory;
  label: string;
  descricao: string;
};

type AiSuggestionsResponse = {
  categorias: AiSuggestionCategoryMeta[];
  perguntasFrequentes: AiSuggestionItem[];
  sugestoes: AiSuggestionItem[];
};

type QueryContext = {
  query: string;
  normalizedQuery: string;
  userId?: string;
  context?: AiContextPayload;
};

type DonationSummaryRow = {
  total_registros: bigint | number;
  total_valor: Prisma.Decimal | number | null;
};

type DonationTopDonorRow = {
  nome: string | null;
  total: Prisma.Decimal | number | null;
};

type PendingTaskSummaryRow = {
  total_pendentes: bigint | number;
  total_em_atraso: bigint | number;
};

type PendingTaskItemRow = {
  titulo: string;
  responsavel: string | null;
  prioridade: string | null;
  status: string | null;
  prazo: Date | null;
};

type EnrollmentSummaryRow = {
  cursos_no_catalogo: bigint | number;
  total_vagas: bigint | number;
  vagas_disponiveis: bigint | number;
  inscricoes_ativas: bigint | number;
  total_fila_espera: bigint | number;
};

type EnrollmentSpotlightRow = {
  nome: string;
  vagas_disponiveis: number | null;
  vagas_totais: number | null;
  total_matriculas: bigint | number | null;
  total_fila_espera: bigint | number | null;
};

type CaptacaoPendingSummaryRow = {
  total_pendentes: bigint | number;
  total_valor: number | null;
};

type CaptacaoPendingItemRow = {
  numero_doacao: string | null;
  doador_nome: string | null;
  valor_liquido: number | null;
  situacao: string | null;
  data_hora: Date | null;
};

type AtendimentoResumoRow = {
  total_hoje: bigint | number;
  total_mes: bigint | number;
};

function removeAccents(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function normalizeQuery(value: string) {
  return removeAccents(value).toLowerCase().replace(/\s+/g, " ").trim();
}

function formatDate(value?: Date | null) {
  if (!value) return "sem data";
  return value.toLocaleDateString("pt-BR");
}

function formatCurrency(value?: number | null) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value ?? 0);
}

function decimalToNumber(value?: Prisma.Decimal | number | null) {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return value;
  return Number(value);
}

function bigintToNumber(value?: bigint | number | null) {
  if (value === null || value === undefined) return 0;
  return typeof value === "bigint" ? Number(value) : value;
}

function extractDays(normalizedQuery: string) {
  const match = normalizedQuery.match(/(\d+)\s*dias?/);
  return match ? Number.parseInt(match[1], 10) : 90;
}

function extractLocation(normalizedQuery: string) {
  const patterns = [
    /(?:bairro|regiao|regiao|zona|subzona|cidade|municipio)\s+(.+)$/,
    /(?:beneficiarios|beneficiarios|pessoas|familias)\s+(?:no|na|em)\s+(.+)$/,
    /(?:quantos|quais|listar|liste).*(?:no|na|em)\s+(.+)$/
  ];

  for (const pattern of patterns) {
    const match = normalizedQuery.match(pattern);
    if (match?.[1]) {
      return match[1]
        .replace(/^(bairro|regiao|zona|subzona|cidade|municipio)\s+/i, "")
        .trim();
    }
  }

  return null;
}

function extractResponsible(normalizedQuery: string) {
  const match =
    normalizedQuery.match(/(?:do|da|de)\s+([a-z0-9\s]+)$/i) ??
    normalizedQuery.match(/responsavel\s+([a-z0-9\s]+)$/i);
  return match?.[1]?.trim() || null;
}

function extractAgeRange(normalizedQuery: string) {
  if (/(crianca|criancas)/.test(normalizedQuery)) {
    return { label: "0-12 anos", min: 0, max: 12 };
  }
  if (/(adolescente|adolescentes)/.test(normalizedQuery)) {
    return { label: "13-17 anos", min: 13, max: 17 };
  }
  if (/(jovem|jovens)/.test(normalizedQuery)) {
    return { label: "18-29 anos", min: 18, max: 29 };
  }
  if (/(adulto|adultos)/.test(normalizedQuery)) {
    return { label: "30-59 anos", min: 30, max: 59 };
  }
  if (/(idoso|idosos)/.test(normalizedQuery)) {
    return { label: "60+ anos", min: 60, max: 200 };
  }

  const rangeMatch = normalizedQuery.match(/(\d{1,3})\s*(?:a|-)\s*(\d{1,3})\s*anos?/);
  if (rangeMatch) {
    return {
      label: `${rangeMatch[1]}-${rangeMatch[2]} anos`,
      min: Number.parseInt(rangeMatch[1], 10),
      max: Number.parseInt(rangeMatch[2], 10)
    };
  }

  return null;
}

function resolveReferencePeriod(normalizedQuery: string) {
  if (/\b(hoje|dia atual|neste dia)\b/.test(normalizedQuery)) {
    return "hoje" as const;
  }

  if (/\b(semana|semanal|ultimos 7 dias|ultimos sete dias)\b/.test(normalizedQuery)) {
    return "semana" as const;
  }

  if (/\b(mes|mês|mensal)\b/.test(normalizedQuery)) {
    return "mes" as const;
  }

  return "mes" as const;
}

function prefersStructuredAnswer(normalizedQuery: string) {
  return /(quantos|total|resumo|relatorio|relatório|indicador|compar|lista|listar|quem|quais|atendimentos|beneficiarios|beneficiários|familias|famílias|doacoes|doações)/.test(
    normalizedQuery
  );
}

function buildData(
  fontes: string[],
  resumo?: AiResponseData["resumo"],
  exemplos?: AiResponseData["exemplos"],
  parametros?: AiResponseData["parametros"]
): AiResponseData {
  return {
    origem: "banco_interno",
    fontes,
    resumo,
    exemplos,
    parametros
  };
}

function buildPremiumAnswer(input: {
  respostaDireta: string;
  resumo?: string[];
  detalhes?: string[];
  alertas?: string[];
  sugestoes?: string[];
}) {
  const blocos = [`**Resposta direta**\n${input.respostaDireta}`];

  if (input.resumo?.length) {
    blocos.push(`**Resumo**\n${input.resumo.map((item) => `- ${item}`).join("\n")}`);
  }

  if (input.detalhes?.length) {
    blocos.push(`**Detalhes**\n${input.detalhes.map((item) => `- ${item}`).join("\n")}`);
  }

  if (input.alertas?.length) {
    blocos.push(`**Alertas**\n${input.alertas.map((item) => `- ${item}`).join("\n")}`);
  }

  if (input.sugestoes?.length) {
    blocos.push(`**Sugestões**\n${input.sugestoes.map((item) => `- ${item}`).join("\n")}`);
  }

  return blocos.join("\n\n");
}

function normalizeContextTokens(context?: AiContextPayload) {
  const values = [context?.pathname, context?.pageTitle]
    .filter(Boolean)
    .map((item) => normalizeQuery(String(item)));

  return values.join(" ");
}

function itemMatchesSearch(item: AiSuggestionItem, search: string) {
  if (!search) return true;
  const searchable = normalizeQuery(`${item.pergunta} ${item.descricao}`);
  return searchable.includes(search);
}

function itemMatchesContext(item: AiSuggestionItem, contextText: string) {
  if (!contextText) return false;
  return (item.contextos ?? []).some((contexto) => contextText.includes(normalizeQuery(contexto)));
}

function findKnowledgeAnswer(normalizedQuery: string) {
  return KNOWLEDGE_BASE.find((item) =>
    item.terms.some((term) => normalizedQuery.includes(normalizeQuery(term)))
  );
}

function isGreetingQuery(normalizedQuery: string) {
  return /^(oi|ola|olá|opa|e ai|e aí|bom dia|boa tarde|boa noite)(\b|!|\?)/.test(normalizedQuery);
}

function isSmallTalkQuery(normalizedQuery: string) {
  return [
    "como vai",
    "tudo bem",
    "quem e voce",
    "quem é você",
    "como perguntar",
    "como posso perguntar",
    "voce pode me ajudar",
    "você pode me ajudar"
  ].some((term) => normalizedQuery.includes(normalizeQuery(term)));
}

function extractFirstName(userName?: string) {
  const trimmed = userName?.trim();
  if (!trimmed) return undefined;
  return trimmed.split(/\s+/u)[0];
}

const AI_SUGGESTION_CATEGORIES: AiSuggestionCategoryMeta[] = [
  { id: "familias", label: "Famílias", descricao: "Consultas sobre núcleo familiar, responsável e atualização cadastral." },
  { id: "beneficiarios", label: "Beneficiários", descricao: "Histórico, situação cadastral, pendências e vínculos." },
  { id: "beneficios", label: "Benefícios", descricao: "Concessões, duplicidades, custos e cestas básicas." },
  { id: "atendimentos", label: "Atendimentos", descricao: "Histórico, pendências, retornos e movimentações técnicas." },
  { id: "cursos-oficinas", label: "Cursos e oficinas", descricao: "Inscrições, vagas, abandono e conclusão." },
  { id: "gestao-indicadores", label: "Gestão e indicadores", descricao: "Resumos executivos, custos e comparação de períodos." },
  { id: "doadores-doacoes", label: "Doadores e doações", descricao: "Arrecadação, inatividade, campanhas e inadimplência." },
  { id: "fornecedores-estoque", label: "Fornecedores e estoque", descricao: "Saída de itens, custos e fornecedores." },
  { id: "territorio", label: "Território", descricao: "Bairros, vulnerabilidade e distribuição por localidade." },
  { id: "inconsistencias", label: "Inconsistências", descricao: "Duplicidades, documentos inválidos e faltas cadastrais." },
  { id: "legislacao-orientacao", label: "Legislação e orientação técnica", descricao: "LOAS, SUAS, CadÚnico, BPC e orientação social." }
];

const AI_SUGGESTION_LIBRARY: AiSuggestionItem[] = [
  { id: "familias-desatualizadas", categoria: "familias", pergunta: "Quais famílias estão sem atualização cadastral?", descricao: "Lista famílias e beneficiários sem atualização recente.", contextos: ["familias", "beneficiarios"] },
  { id: "quem-mora-mesmo-endereco", categoria: "familias", pergunta: "Quem mora no mesmo endereço?", descricao: "Ajuda a localizar vínculos familiares e domicílios compartilhados.", contextos: ["familias", "beneficiarios"] },
  { id: "responsavel-familiar", categoria: "familias", pergunta: "Quem é o responsável familiar?", descricao: "Consulta rápida do responsável do núcleo.", contextos: ["familias"] },
  { id: "familias-vulnerabilidade", categoria: "familias", pergunta: "Existem famílias em maior vulnerabilidade?", descricao: "Resumo para priorização de atendimento.", contextos: ["familias", "dashboard"] },
  { id: "historico-beneficiario", categoria: "beneficiarios", pergunta: "Qual o histórico deste beneficiário?", descricao: "Consulta histórico individual consolidado.", contextos: ["beneficiarios", "central-atendimentos"] },
  { id: "familia-beneficiario", categoria: "beneficiarios", pergunta: "Ele pertence a qual família?", descricao: "Verifica vínculo familiar do beneficiário.", contextos: ["beneficiarios", "familias"] },
  { id: "situacao-beneficiario", categoria: "beneficiarios", pergunta: "Está ativo ou inativo?", descricao: "Consulta situação cadastral do beneficiário.", contextos: ["beneficiarios"] },
  { id: "pendencias-beneficiario", categoria: "beneficiarios", pergunta: "Possui pendências cadastrais?", descricao: "Ajuda a localizar campos e documentos pendentes.", contextos: ["beneficiarios"] },
  { id: "quem-recebeu-cesta", categoria: "beneficios", pergunta: "Quem recebeu cesta básica este mês?", descricao: "Resumo de concessões do mês.", contextos: ["beneficios", "central-atendimentos"] },
  { id: "familia-recebeu-beneficio", categoria: "beneficios", pergunta: "Essa família já recebeu benefício?", descricao: "Ajuda a evitar duplicidade de concessão.", contextos: ["familias", "beneficios", "central-atendimentos"] },
  { id: "duplicidade-entrega", categoria: "beneficios", pergunta: "Existe duplicidade de entrega?", descricao: "Consulta inconsistências em concessões recentes.", contextos: ["beneficios", "familias"] },
  { id: "custo-total-mes", categoria: "beneficios", pergunta: "Qual o custo total no mês?", descricao: "Resumo financeiro de benefícios e concessões.", contextos: ["beneficios", "central-atendimentos", "dashboard"] },
  { id: "atendimentos-realizados", categoria: "atendimentos", pergunta: "Quais atendimentos foram realizados?", descricao: "Resumo de atendimentos registrados.", contextos: ["atendimentos", "central-atendimentos"] },
  { id: "atendimentos-pendentes", categoria: "atendimentos", pergunta: "Quais atendimentos estão pendentes?", descricao: "Ajuda a localizar retornos e pendências.", contextos: ["atendimentos", "central-atendimentos"] },
  { id: "casos-sem-retorno", categoria: "atendimentos", pergunta: "Quais casos estão sem retorno?", descricao: "Acompanha casos abertos sem retorno previsto.", contextos: ["atendimentos", "central-atendimentos"] },
  { id: "historico-familia", categoria: "atendimentos", pergunta: "Qual o histórico da família?", descricao: "Consulta consolidada do núcleo familiar.", contextos: ["familias", "central-atendimentos"] },
  { id: "quem-esta-inscrito", categoria: "cursos-oficinas", pergunta: "Quem está inscrito?", descricao: "Consulta inscritos em cursos e oficinas.", contextos: ["cursos", "atendimentos"] },
  { id: "quem-concluiu", categoria: "cursos-oficinas", pergunta: "Quem concluiu?", descricao: "Lista participantes concluídos.", contextos: ["cursos"] },
  { id: "quem-abandonou", categoria: "cursos-oficinas", pergunta: "Quem abandonou?", descricao: "Ajuda a identificar evasão.", contextos: ["cursos"] },
  { id: "curso-mais-participantes", categoria: "cursos-oficinas", pergunta: "Qual curso tem mais participantes?", descricao: "Resumo comparativo entre cursos.", contextos: ["cursos", "dashboard"] },
  { id: "quantos-atendimentos-mes", categoria: "gestao-indicadores", pergunta: "Quantos atendimentos no mês?", descricao: "Indicador mensal de produção.", contextos: ["central-atendimentos", "dashboard"] },
  { id: "custo-por-familia", categoria: "gestao-indicadores", pergunta: "Qual custo por família?", descricao: "Resumo financeiro por núcleo familiar.", contextos: ["familias", "central-atendimentos", "dashboard"] },
  { id: "resumo-executivo", categoria: "gestao-indicadores", pergunta: "Gere resumo executivo", descricao: "Síntese gerencial do sistema.", contextos: ["dashboard", "configuracoes"] },
  { id: "compare-periodos", categoria: "gestao-indicadores", pergunta: "Compare períodos", descricao: "Ajuda a comparar indicadores e volumes.", contextos: ["dashboard"] },
  { id: "maiores-doadores", categoria: "doadores-doacoes", pergunta: "Quem são os maiores doadores?", descricao: "Resumo dos principais doadores.", contextos: ["captacao", "dashboard"] },
  { id: "quanto-arrecadamos", categoria: "doadores-doacoes", pergunta: "Quanto arrecadamos?", descricao: "Total de doações no período.", contextos: ["captacao", "dashboard"] },
  { id: "doadores-inativos", categoria: "doadores-doacoes", pergunta: "Quais doadores estão inativos?", descricao: "Apoia a gestão de relacionamento.", contextos: ["captacao"] },
  { id: "campanha-melhor-resultado", categoria: "doadores-doacoes", pergunta: "Qual campanha teve melhor resultado?", descricao: "Comparativo entre campanhas de captação.", contextos: ["captacao", "dashboard"] },
  { id: "fornecedor-mais-forneceu", categoria: "fornecedores-estoque", pergunta: "Qual fornecedor mais forneceu?", descricao: "Resumo dos principais fornecedores.", contextos: ["almoxarifado", "fornecedores"] },
  { id: "item-maior-saida", categoria: "fornecedores-estoque", pergunta: "Qual item teve maior saída?", descricao: "Ajuda a acompanhar giro de estoque.", contextos: ["almoxarifado"] },
  { id: "custo-produtos-distribuidos", categoria: "fornecedores-estoque", pergunta: "Qual o custo dos produtos distribuídos?", descricao: "Resumo de custo por produto.", contextos: ["almoxarifado", "beneficios"] },
  { id: "bairros-com-mais-familias", categoria: "territorio", pergunta: "Quais bairros têm mais famílias?", descricao: "Visão territorial do atendimento.", contextos: ["familias", "dashboard"] },
  { id: "maior-vulnerabilidade", categoria: "territorio", pergunta: "Onde há maior vulnerabilidade?", descricao: "Ajuda na priorização territorial.", contextos: ["dashboard", "familias"] },
  { id: "onde-distribuimos-mais", categoria: "territorio", pergunta: "Onde distribuímos mais benefícios?", descricao: "Distribuição geográfica de benefícios.", contextos: ["beneficios", "dashboard"] },
  { id: "cadastros-duplicados", categoria: "inconsistencias", pergunta: "Existem cadastros duplicados?", descricao: "Ajuda a identificar duplicidades cadastrais.", contextos: ["beneficiarios", "familias"] },
  { id: "cpfs-invalidos", categoria: "inconsistencias", pergunta: "Existem CPFs inválidos?", descricao: "Localiza documentos com inconsistência.", contextos: ["beneficiarios"] },
  { id: "familias-sem-responsavel", categoria: "inconsistencias", pergunta: "Existem famílias sem responsável?", descricao: "Valida integridade dos núcleos familiares.", contextos: ["familias"] },
  { id: "beneficiarios-sem-endereco", categoria: "inconsistencias", pergunta: "Existem beneficiários sem endereço?", descricao: "Consulta pendências críticas de cadastro.", contextos: ["beneficiarios"] },
  { id: "o-que-e-loas", categoria: "legislacao-orientacao", pergunta: "O que é a LOAS?", descricao: "Orienta tecnicamente sobre assistência social." },
  { id: "o-que-e-suas", categoria: "legislacao-orientacao", pergunta: "O que é o SUAS?", descricao: "Explica a estrutura do sistema único de assistência social." },
  { id: "diferenca-cras-creas", categoria: "legislacao-orientacao", pergunta: "Qual a diferença entre CRAS e CREAS?", descricao: "Apoio conceitual para atendimento técnico." },
  { id: "o-que-e-cadunico", categoria: "legislacao-orientacao", pergunta: "O que é o CadÚnico?", descricao: "Explica o cadastro único e seu uso." },
  { id: "o-que-e-bpc", categoria: "legislacao-orientacao", pergunta: "O que é o BPC?", descricao: "Resumo sobre benefício de prestação continuada." },
  { id: "quando-conceder-beneficio-eventual", categoria: "legislacao-orientacao", pergunta: "Quando conceder benefício eventual?", descricao: "Orienta sobre concessão assistencial." },
  { id: "como-evitar-duplicidade-ajuda", categoria: "legislacao-orientacao", pergunta: "Como evitar duplicidade de ajuda?", descricao: "Boas práticas para evitar concessão duplicada." }
];

const KNOWLEDGE_BASE: Array<{ terms: string[]; answer: string }> = [
  {
    terms: ["loas"],
    answer:
      "**Resumo**\nA LOAS é a Lei Orgânica da Assistência Social.\n\n**Detalhamento**\nEla organiza a assistência social como política pública, define proteção social, benefícios e serviços.\n\n**Alertas**\nA concessão de benefícios deve seguir critérios institucionais e registro adequado.\n\n**Ação sugerida**\nUse o G3N para registrar atendimentos, benefícios, histórico e justificativas de decisão."
  },
  {
    terms: ["suas"],
    answer:
      "**Resumo**\nO SUAS é o Sistema Único de Assistência Social.\n\n**Detalhamento**\nEle organiza a oferta de serviços, programas, projetos e benefícios socioassistenciais no Brasil.\n\n**Alertas**\nFluxos e encaminhamentos precisam respeitar proteção básica e especial.\n\n**Ação sugerida**\nRegistre no G3N atendimentos, vínculos familiares, benefícios e encaminhamentos com rastreabilidade."
  },
  {
    terms: ["cras", "creas"],
    answer:
      "**Resumo**\nCRAS atua na proteção social básica e CREAS na proteção social especial.\n\n**Detalhamento**\nO CRAS trabalha prevenção, fortalecimento de vínculos e acompanhamento familiar. O CREAS atende situações de violação de direitos e maior complexidade.\n\n**Alertas**\nNem toda demanda social deve ser encaminhada ao CREAS.\n\n**Ação sugerida**\nUse o histórico da família e os atendimentos no G3N para justificar o encaminhamento correto."
  },
  {
    terms: ["cadunico", "cadunico", "cad único", "cadunico"],
    answer:
      "**Resumo**\nO CadÚnico é o cadastro para programas sociais do governo federal.\n\n**Detalhamento**\nEle identifica famílias de baixa renda e apoia acesso a políticas públicas.\n\n**Alertas**\nCadastro no G3N não substitui atualização oficial do CadÚnico.\n\n**Ação sugerida**\nRegistre no G3N orientações dadas, pendências e necessidade de atualização cadastral."
  },
  {
    terms: ["bpc"],
    answer:
      "**Resumo**\nO BPC é o Benefício de Prestação Continuada.\n\n**Detalhamento**\nGarante um salário mínimo à pessoa idosa ou com deficiência que atenda aos critérios legais.\n\n**Alertas**\nA análise depende de requisitos legais e documentação específica.\n\n**Ação sugerida**\nUse o G3N para registrar demanda, orientação técnica, documentos pendentes e encaminhamentos."
  },
  {
    terms: ["beneficio eventual", "benefício eventual"],
    answer:
      "**Resumo**\nBenefício eventual atende situações temporárias e emergenciais previstas na política local.\n\n**Detalhamento**\nPode envolver auxílio por vulnerabilidade temporária, natalidade, funeral ou situações emergenciais.\n\n**Alertas**\nÉ importante evitar duplicidade e registrar justificativa técnica.\n\n**Ação sugerida**\nConsulte histórico do beneficiário e da família antes da concessão e registre a decisão no G3N."
  }
];

export class AiService {
  suggest(query?: string, context?: AiContextPayload): AiSuggestionsResponse {
    const search = normalizeQuery(query ?? "");
    const contextText = normalizeContextTokens(context);

    const ordered = [...AI_SUGGESTION_LIBRARY].sort((a, b) => {
      const aContext = itemMatchesContext(a, contextText) ? 1 : 0;
      const bContext = itemMatchesContext(b, contextText) ? 1 : 0;
      if (aContext !== bContext) return bContext - aContext;
      return a.pergunta.localeCompare(b.pergunta, "pt-BR");
    });

    const filtered = ordered.filter((item) => itemMatchesSearch(item, search));

    return {
      categorias: AI_SUGGESTION_CATEGORIES,
      perguntasFrequentes: ordered.slice(0, 8),
      sugestoes: filtered.slice(0, 24)
    };
  }

  async processQuery(
    query: string,
    userId?: string,
    context?: AiContextPayload,
    userName?: string
  ): Promise<AiResponse> {
    const ctx: QueryContext = {
      query,
      normalizedQuery: normalizeQuery(query),
      userId,
      context
    };

    if (isGreetingQuery(ctx.normalizedQuery) || isSmallTalkQuery(ctx.normalizedQuery)) {
      return this.getConversationalReply(ctx.query, ctx.normalizedQuery, userName);
    }

    if (this.isHelpIntent(ctx.normalizedQuery)) {
      return this.getHelp();
    }

    if (this.isOutdatedFamiliesIntent(ctx.normalizedQuery)) {
      return this.findOutdatedFamilies(extractDays(ctx.normalizedQuery));
    }

    if (this.isLocationIntent(ctx.normalizedQuery)) {
      return this.countBeneficiariesByLocation(extractLocation(ctx.normalizedQuery));
    }

    if (this.isAgeRangeIntent(ctx.normalizedQuery)) {
      return this.countBeneficiariesByAgeRange(extractAgeRange(ctx.normalizedQuery));
    }

    if (this.isBeneficiarySummaryIntent(ctx.normalizedQuery)) {
      return this.getBeneficiarySummary();
    }

    if (this.isAttendanceSummaryIntent(ctx.normalizedQuery)) {
      return this.getAttendanceSummary(ctx.normalizedQuery);
    }

    if (this.isDonationIntent(ctx.normalizedQuery)) {
      if (this.isInadimplenteIntent(ctx.normalizedQuery)) {
        return this.getMonthlyDelinquentDonors();
      }
      if (this.isCaptacaoPendingIntent(ctx.normalizedQuery)) {
        return this.getCaptacaoPendingDonations();
      }
      return this.getDonationsSummary();
    }

    if (this.isTaskIntent(ctx.normalizedQuery)) {
      if (this.isResponsibleTaskIntent(ctx.normalizedQuery)) {
        return this.getTasksByResponsible(extractResponsible(ctx.normalizedQuery));
      }
      return this.getPendingTasksSummary();
    }

    if (this.isEnrollmentIntent(ctx.normalizedQuery)) {
      if (this.isNoVacancyIntent(ctx.normalizedQuery)) {
        return this.getCoursesWithoutVacancy();
      }
      return this.getEnrollmentSummary();
    }

    if (this.isSystemOverviewIntent(ctx.normalizedQuery)) {
      return this.getSystemOverview();
    }

    const knowledgeAnswer = findKnowledgeAnswer(ctx.normalizedQuery);
    if (knowledgeAnswer) {
      return {
        intent: "ORIENTACAO_TECNICA",
        answer: knowledgeAnswer.answer,
        data: buildData(["base_tecnica_g3n"], { consulta: query, tipoConsulta: "base_tecnica" })
      };
    }

    if (!env.APP_GEMINI_API_KEY || env.IA_PROVIDER !== "gemini") {
      return this.getIaUnavailable(query);
    }

    const assisted = await this.tryAssistedResponse(ctx);
    if (assisted) {
      return assisted;
    }

    return this.getFallbackNotUnderstood(query, context);
  }

  private isHelpIntent(normalizedQuery: string) {
    return ["ajuda", "help", "o que voce faz", "o que você faz", "exemplos"].some((term) =>
      normalizedQuery.includes(normalizeQuery(term))
    );
  }

  private isOutdatedFamiliesIntent(normalizedQuery: string) {
    return (
      /(familias|familia|cadastros|beneficiarios).*(sem|nao).*(atualizacao|atualizado)/.test(
        normalizedQuery
      ) ||
      /(desatualizad)/.test(normalizedQuery)
    );
  }

  private isLocationIntent(normalizedQuery: string) {
    return /(bairro|regiao|zona|subzona|cidade|municipio)/.test(normalizedQuery);
  }

  private isDonationIntent(normalizedQuery: string) {
    return /(doac|arrecad|doador|doadores)/.test(normalizedQuery);
  }

  private isCaptacaoPendingIntent(normalizedQuery: string) {
    return /(pendente|aguardando pagamento|em aberto|cobranca|cobranca)/.test(normalizedQuery);
  }

  private isInadimplenteIntent(normalizedQuery: string) {
    return /(inadimpl|nao pag|não pag|vencid)/.test(normalizedQuery);
  }

  private isTaskIntent(normalizedQuery: string) {
    return /(tarefa|tarefas|pendencia|pendencias)/.test(normalizedQuery);
  }

  private isResponsibleTaskIntent(normalizedQuery: string) {
    return /(tarefa|tarefas|pendencia|pendencias).*(do|da|de|responsavel)/.test(normalizedQuery);
  }

  private isEnrollmentIntent(normalizedQuery: string) {
    return /(matricula|matriculas|vaga|vagas|fila de espera|fila espera|curso|cursos)/.test(
      normalizedQuery
    );
  }

  private isNoVacancyIntent(normalizedQuery: string) {
    return /(sem vagas|sem vaga|lotad|vagas esgotadas)/.test(normalizedQuery);
  }

  private isAgeRangeIntent(normalizedQuery: string) {
    return /(faixa etaria|faixa etária|crianca|criancas|adolescente|adolescentes|jovem|jovens|adulto|adultos|idoso|idosos|\d+\s*(?:a|-)\s*\d+\s*anos)/.test(
      normalizedQuery
    );
  }

  private isBeneficiarySummaryIntent(normalizedQuery: string) {
    return /(quantos|total|resumo|relatorio|relat?rio).*(beneficiarios|benefici?rios)/.test(normalizedQuery);
  }

  private isAttendanceSummaryIntent(normalizedQuery: string) {
    return /(quantos|total|resumo|relatorio|relat?rio).*(atendimentos|atendimento|visitas|agendamentos)/.test(normalizedQuery);
  }

  private isSystemOverviewIntent(normalizedQuery: string) {
    return /(resumo geral|visao geral|visao do sistema|sistema|painel geral|indicadores)/.test(
      normalizedQuery
    );
  }

  private getHelp(): AiResponse {
    return {
      intent: "AJUDA",
      answer:
        "Estou configurado para responder com base no banco interno do G3 Next.\n\n" +
        "Perguntas suportadas nesta primeira versão:\n" +
        "- Famílias sem atualização há 90 dias\n" +
        "- Beneficiários no bairro Centro\n" +
        "- Beneficiários por faixa etária\n" +
        "- Resumo de doações deste mês\n" +
        "- Tarefas pendentes e em atraso\n" +
        "- Tarefas do João\n" +
        "- Resumo de matrículas, vagas e fila de espera\n" +
        "- Cursos sem vagas\n" +
        "- Doações pendentes da captação\n" +
        "- Doadores inadimplentes do mês\n" +
        "- Resumo geral do sistema\n\n" +
        "As respostas usam consultas controladas no banco, sem depender de conhecimento externo.",
      data: buildData([
        "cadastro_beneficiario",
        "vinculo_familiar",
        "recebimento_doacao",
        "tarefas_pendencias",
        "cursos_atendimentos",
        "captacao_doacoes",
        "usuario"
      ])
    };
  }

  private getConversationalReply(query: string, normalizedQuery: string, userName?: string): AiResponse {
    const firstName = extractFirstName(userName);
    const saudacaoPersonalizada = firstName
      ? `Olá, ${firstName}.`
      : "Olá.";

    let answer =
      `${saudacaoPersonalizada} Estou bem e posso te ajudar.\n\n` +
      "Você pode me perguntar de forma natural, por exemplo:\n" +
      "- Qual o histórico deste beneficiário?\n" +
      "- Essa família já recebeu benefício?\n" +
      "- Quantos atendimentos tivemos no mês?\n" +
      "- O que é a LOAS?\n\n" +
      "Se quiser, pode escrever só o assunto e eu tento te guiar.";

    if (normalizedQuery.includes("como perguntar") || normalizedQuery.includes("como posso perguntar")) {
      answer =
        `${saudacaoPersonalizada} Você pode perguntar de forma simples, como se estivesse falando com uma pessoa.\n\n` +
        "Exemplos úteis:\n" +
        "- Me mostre famílias sem atualização cadastral\n" +
        "- Quem recebeu cesta básica este mês?\n" +
        "- Esse beneficiário pertence a qual família?\n" +
        "- Qual o custo total no mês?\n\n" +
        "Se quiser, eu também posso te sugerir perguntas por assunto.";
    } else if (normalizedQuery.includes("quem e voce") || normalizedQuery.includes("quem é você")) {
      answer =
        `${saudacaoPersonalizada} Sou a IA do G3N.\n\n` +
        "Posso te ajudar com consultas sobre beneficiários, famílias, benefícios, atendimentos, indicadores e também com orientações técnicas, como LOAS, SUAS, CadÚnico e BPC.";
    } else if (isGreetingQuery(normalizedQuery)) {
      answer = firstName
        ? `${normalizedQuery.includes("bom dia") ? "Bom dia" : normalizedQuery.includes("boa tarde") ? "Boa tarde" : normalizedQuery.includes("boa noite") ? "Boa noite" : "Olá"}, ${firstName}. Tudo bem?\n\nEm que posso ajudar hoje?`
        : `${normalizedQuery.includes("bom dia") ? "Bom dia" : normalizedQuery.includes("boa tarde") ? "Boa tarde" : normalizedQuery.includes("boa noite") ? "Boa noite" : "Olá"}. Tudo bem?\n\nEm que posso ajudar hoje?`;
    }

    return {
      intent: "CONVERSA_SOCIAL",
      answer,
      data: buildData(["assistente_ia"], { consulta: query, modo: "conversa", tipoConsulta: "conversa" })
    };
  }

  private getIaUnavailable(query: string): AiResponse {
    return {
      intent: "RESPOSTA_ASSISTIDA",
      answer:
        "**Resposta direta**\nO assistente inteligente está indisponível neste momento.\n\n" +
        "**Resumo**\nA chave do Gemini não está configurada no backend ou o provedor não está habilitado.\n\n" +
        "**Detalhes**\nConsultas estruturadas já implementadas no banco continuam funcionando, mas perguntas abertas dependem da configuração da IA generativa.\n\n" +
        "**Alertas**\nDefina `GEMINI_API_KEY`, `IA_PROVIDER=gemini` e `IA_MODEL` no ambiente do backend.\n\n" +
        "**Sugestões**\nTente uma pergunta objetiva das sugestões automáticas ou configure a chave e tente novamente.",
      data: buildData(["assistente_ia"], { consulta: query, tipoConsulta: "ia_indisponivel" })
    };
  }

  private async tryAssistedResponse(context: QueryContext): Promise<AiResponse | null> {
    if (!env.APP_GEMINI_API_KEY || env.IA_PROVIDER !== "gemini") {
      return null;
    }

    try {
      const client = new GoogleGenerativeAI(env.APP_GEMINI_API_KEY);
      const respostaEstruturada = prefersStructuredAnswer(context.normalizedQuery);
      const model = client.getGenerativeModel({
        model: env.IA_MODEL,
        systemInstruction:
          "Você é o Assistente Inteligente do sistema G3N para assistência social e terceiro setor. " +
          "Responda em português do Brasil, de forma clara, profissional e objetiva. " +
          (respostaEstruturada
            ? "Quando a pergunta pedir análise, resumo, lista, comparação, indicador ou dado operacional, use este formato: Resposta direta, Resumo, Detalhes, Alertas, Sugestões. "
            : "Quando a pergunta for geral, conceitual ou orientativa, responda em texto natural, fluido e bem organizado, sem forçar blocos com títulos. ") +
          "Você pode responder perguntas gerais, técnicas, institucionais e operacionais, mesmo quando não forem sobre uma tela específica do sistema. " +
          "Nunca invente dados internos da instituição. Quando a pergunta depender de números, cadastros, históricos ou fatos do banco que não foram consultados, deixe explícito que se trata apenas de orientação geral."
      });

      const contextoTela = normalizeContextTokens(context.context);
      const prompt =
        `Pergunta do usuário: ${context.query}\n` +
        `Contexto atual da tela: ${contextoTela || "não informado"}\n` +
        `Estilo esperado: ${respostaEstruturada ? "resposta estruturada em blocos curtos" : "resposta natural em prosa clara"}\n` +
        "Se a pergunta for geral, responda normalmente com base em conhecimento útil e seguro. " +
        "Se a pergunta depender de dados específicos da instituição que não foram consultados aqui, informe isso com clareza e sugira uma consulta adequada dentro do sistema.";

      const result = await model.generateContent(prompt);
      const answer = result.response.text().trim();

      if (!answer) {
        return null;
      }

      return {
        intent: "RESPOSTA_ASSISTIDA",
        answer,
        data: buildData(["assistente_ia"], { consulta: context.query, modo: "assistido", tipoConsulta: "gemini" })
      };
    } catch {
      return null;
    }
  }

  private getFallbackNotUnderstood(query: string, context?: AiContextPayload): AiResponse {
    const sugestoes = this.suggest(query, context).perguntasFrequentes.slice(0, 4);
    const lista = sugestoes.map((item) => `- ${item.pergunta}`).join("\n");

    return {
      intent: "NAO_ENTENDIDO",
      answer:
        "**Resposta direta**\nAinda não consegui responder essa pergunta com segurança usando os dados internos disponíveis.\n\n" +
        "**Resumo**\nA consulta precisa de mais contexto ou de uma formulação mais objetiva.\n\n" +
        "**Detalhes**\nTente reformular a pergunta de forma mais objetiva ou usar uma das consultas abaixo.\n\n" +
        "**Alertas**\nPerguntas muito amplas ou sem referência de contexto podem exigir consulta orientativa.\n\n" +
        "**Sugestões**\nVocê pode tentar:\n" +
        `${lista || "- Resumo geral do sistema"}`,
      data: buildData(["banco_interno"], undefined, undefined, { consulta: query })
    };
  }

  private async findOutdatedFamilies(days: number): Promise<AiResponse> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const [beneficiariosCount, familiasCount, oldestBeneficiarios, oldestFamilias] = await Promise.all([
      prisma.cadastroBeneficiario.count({
        where: {
          atualizadoEm: {
            lt: cutoffDate
          }
        }
      }),
      prisma.vinculoFamiliar.count({
        where: {
          atualizadoEm: {
            lt: cutoffDate
          }
        }
      }),
      prisma.cadastroBeneficiario.findMany({
        where: {
          atualizadoEm: {
            lt: cutoffDate
          }
        },
        select: {
          nomeCompleto: true,
          atualizadoEm: true,
          endereco: {
            select: {
              bairro: true
            }
          }
        },
        take: 3,
        orderBy: {
          atualizadoEm: "asc"
        }
      }),
      prisma.vinculoFamiliar.findMany({
        where: {
          atualizadoEm: {
            lt: cutoffDate
          }
        },
        select: {
          nomeFamilia: true,
          bairro: true,
          atualizadoEm: true
        },
        take: 3,
        orderBy: {
          atualizadoEm: "asc"
        }
      })
    ]);

    const exemplosBeneficiarios = oldestBeneficiarios.map((item) => ({
      nome: item.nomeCompleto,
      bairro: item.endereco?.bairro ?? "-",
      ultimaAtualizacao: formatDate(item.atualizadoEm)
    }));

    const exemplosFamilias = oldestFamilias.map((item) => ({
      nome: item.nomeFamilia,
      bairro: item.bairro ?? "-",
      ultimaAtualizacao: formatDate(item.atualizadoEm)
    }));

    let answer =
      `Encontrei **${familiasCount} famílias** e **${beneficiariosCount} beneficiários** sem atualização há mais de **${days} dias**.\n\n`;

    if (exemplosFamilias.length > 0) {
      answer += "**Famílias mais antigas:**\n";
      for (const item of exemplosFamilias) {
        answer += `- ${item.nome} | bairro: ${item.bairro} | última atualização: ${item.ultimaAtualizacao}\n`;
      }
      answer += "\n";
    }

    if (exemplosBeneficiarios.length > 0) {
      answer += "**Beneficiários mais antigos:**\n";
      for (const item of exemplosBeneficiarios) {
        answer += `- ${item.nome} | bairro: ${item.bairro} | última atualização: ${item.ultimaAtualizacao}\n`;
      }
    }

    return {
      intent: "FAMILIAS_DESATUALIZADAS",
      answer: answer.trim(),
      data: buildData(
        ["cadastro_beneficiario", "vinculo_familiar"],
        {
          diasSemAtualizacao: days,
          familias: familiasCount,
          beneficiarios: beneficiariosCount
        },
        [...exemplosFamilias, ...exemplosBeneficiarios],
        { dias: days }
      )
    };
  }

  private async countBeneficiariesByLocation(location: string | null): Promise<AiResponse> {
    if (!location) {
      return {
        intent: "BENEFICIARIOS_POR_LOCAL",
        answer:
          "Não consegui identificar a localização desejada. Tente algo como `Beneficiários no bairro Centro`.",
        data: buildData(["cadastro_beneficiario", "endereco"])
      };
    }

    const count = await prisma.cadastroBeneficiario.count({
      where: {
        OR: [
          { endereco: { bairro: { contains: location, mode: "insensitive" } } },
          { endereco: { cidade: { contains: location, mode: "insensitive" } } },
          { endereco: { zona: { contains: location, mode: "insensitive" } } },
          { endereco: { subzona: { contains: location, mode: "insensitive" } } }
        ]
      }
    });

    const exemplos = await prisma.cadastroBeneficiario.findMany({
      where: {
        OR: [
          { endereco: { bairro: { contains: location, mode: "insensitive" } } },
          { endereco: { cidade: { contains: location, mode: "insensitive" } } },
          { endereco: { zona: { contains: location, mode: "insensitive" } } },
          { endereco: { subzona: { contains: location, mode: "insensitive" } } }
        ]
      },
      select: {
        nomeCompleto: true,
        endereco: {
          select: {
            bairro: true,
            cidade: true,
            zona: true
          }
        }
      },
      take: 5,
      orderBy: {
        nomeCompleto: "asc"
      }
    });

    let answer = `Encontrei **${count} beneficiários** associados à localização **${location}**.\n\n`;

    if (exemplos.length > 0) {
      answer += "**Exemplos:**\n";
      for (const item of exemplos) {
        answer += `- ${item.nomeCompleto} | bairro: ${item.endereco?.bairro ?? "-"} | cidade: ${item.endereco?.cidade ?? "-"}\n`;
      }
    }

    return {
      intent: "BENEFICIARIOS_POR_LOCAL",
      answer: answer.trim(),
      data: buildData(
        ["cadastro_beneficiario", "endereco"],
        { totalBeneficiarios: count, local: location },
        exemplos.map((item) => ({
          nome: item.nomeCompleto,
          bairro: item.endereco?.bairro ?? "-",
          cidade: item.endereco?.cidade ?? "-",
          zona: item.endereco?.zona ?? "-"
        })),
        { local: location }
      )
    };
  }

  private async countBeneficiariesByAgeRange(
    faixa: { label: string; min: number; max: number } | null
  ): Promise<AiResponse> {
    if (!faixa) {
      return {
        intent: "BENEFICIARIOS_POR_FAIXA_ETARIA",
        answer:
          "Não consegui identificar a faixa etária. Tente algo como `beneficiários idosos` ou `beneficiários de 18 a 29 anos`.",
        data: buildData(["cadastro_beneficiario"])
      };
    }

    const countRows = await prisma.$queryRaw<Array<{ total: bigint | number }>>(Prisma.sql`
      SELECT COUNT(*)::BIGINT AS total
      FROM cadastro_beneficiario
      WHERE data_nascimento IS NOT NULL
        AND DATE_PART('year', AGE(CURRENT_DATE, data_nascimento)) BETWEEN ${faixa.min} AND ${faixa.max}
    `);

    const exemplos = await prisma.$queryRaw<
      Array<{ nome_completo: string; idade: number; bairro: string | null }>
    >(Prisma.sql`
      SELECT
        b.nome_completo,
        DATE_PART('year', AGE(CURRENT_DATE, b.data_nascimento))::INT AS idade,
        e.bairro
      FROM cadastro_beneficiario b
      LEFT JOIN endereco e ON e.id = b.endereco_id
      WHERE b.data_nascimento IS NOT NULL
        AND DATE_PART('year', AGE(CURRENT_DATE, b.data_nascimento)) BETWEEN ${faixa.min} AND ${faixa.max}
      ORDER BY b.nome_completo ASC
      LIMIT 5
    `);

    const total = bigintToNumber(countRows[0]?.total);
    let answer = `Encontrei **${total} beneficiários** na faixa etária **${faixa.label}**.\n\n`;

    if (exemplos.length > 0) {
      answer += "**Exemplos:**\n";
      for (const item of exemplos) {
        answer += `- ${item.nome_completo} | idade: ${item.idade} | bairro: ${item.bairro ?? "-"}\n`;
      }
    }

    return {
      intent: "BENEFICIARIOS_POR_FAIXA_ETARIA",
      answer: answer.trim(),
      data: buildData(
        ["cadastro_beneficiario", "endereco"],
        { totalBeneficiarios: total, faixaEtaria: faixa.label },
        exemplos.map((item) => ({
          nome: item.nome_completo,
          idade: item.idade,
          bairro: item.bairro ?? "-"
        })),
        { faixaEtaria: faixa.label }
      )
    };
  }

  private async getBeneficiarySummary(): Promise<AiResponse> {
    const [totalBeneficiarios, ativos, semEndereco, comFamilia, exemplosPendentes] = await Promise.all([
      prisma.cadastroBeneficiario.count(),
      prisma.cadastroBeneficiario.count({
        where: {
          status: {
            equals: "ATIVO",
            mode: "insensitive"
          }
        }
      }),
      prisma.cadastroBeneficiario.count({
        where: {
          enderecoId: null
        }
      }),
      prisma.$queryRaw<Array<{ total: bigint | number }>>(Prisma.sql`
        SELECT COUNT(DISTINCT m.beneficiario_id)::BIGINT AS total
        FROM vinculo_familiar_membro m
      `),
      prisma.cadastroBeneficiario.findMany({
        where: {
          OR: [{ enderecoId: null }, { status: null }, { status: "" }]
        },
        select: {
          nomeCompleto: true,
          status: true,
          codigo: true
        },
        take: 5,
        orderBy: {
          nomeCompleto: "asc"
        }
      })
    ]);

    const totalComFamilia = bigintToNumber(comFamilia[0]?.total);
    const totalInativos = Math.max(totalBeneficiarios - ativos, 0);

    return {
      intent: "BENEFICIARIOS_RESUMO",
      answer: buildPremiumAnswer({
        respostaDireta: `Hoje o G3N possui ${totalBeneficiarios} beneficiários cadastrados.`,
        resumo: [
          `${ativos} com status ativo`,
          `${totalInativos} sem status ativo`,
          `${totalComFamilia} vinculados a núcleo familiar`
        ],
        detalhes: [
          `${semEndereco} sem endereço vinculado`,
          `${exemplosPendentes.length} exemplos de cadastro com pendência listados para conferência`
        ],
        alertas:
          semEndereco > 0 || exemplosPendentes.length > 0
            ? [
                `${semEndereco} beneficiários ainda estão sem endereço`,
                "Cadastros sem status definido ou sem endereço podem afetar filtros, relatórios e atendimentos"
              ]
            : undefined,
        sugestoes: [
          "Pergunte quais beneficiários estão sem endereço",
          "Peça um resumo de atendimentos do mês",
          "Consulte famílias sem atualização cadastral"
        ]
      }),
      data: buildData(
        ["cadastro_beneficiario", "vinculo_familiar_membro"],
        {
          totalBeneficiarios,
          ativos,
          inativos: totalInativos,
          semEndereco,
          comFamilia: totalComFamilia
        },
        exemplosPendentes.map((item) => ({
          nome: item.nomeCompleto,
          codigo: item.codigo ?? "-",
          status: item.status ?? "Sem status"
        })),
        { tipoConsulta: "beneficiarios_resumo" }
      )
    };
  }

  private async getAttendanceSummary(normalizedQuery: string): Promise<AiResponse> {
    const periodo = resolveReferencePeriod(normalizedQuery);
    const hoje = new Date();
    const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    const inicioAmanha = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1);
    const inicioSemana = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 6);
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

    const intervaloInicio =
      periodo === "hoje" ? inicioHoje : periodo === "semana" ? inicioSemana : inicioMes;
    const intervaloFim = periodo === "hoje" ? inicioAmanha : inicioAmanha;

    const [centralRows, visitaRows, agendaRows, statusAgenda, topTipos] = await Promise.all([
      prisma.$queryRaw<AtendimentoResumoRow[]>(Prisma.sql`
        SELECT
          COUNT(*) FILTER (WHERE data_hora >= ${inicioHoje} AND data_hora < ${inicioAmanha})::BIGINT AS total_hoje,
          COUNT(*) FILTER (WHERE data_hora >= ${inicioMes})::BIGINT AS total_mes
        FROM central_atendimento
      `),
      prisma.$queryRaw<AtendimentoResumoRow[]>(Prisma.sql`
        SELECT
          COUNT(*) FILTER (WHERE data_visita >= ${inicioHoje} AND data_visita < ${inicioAmanha})::BIGINT AS total_hoje,
          COUNT(*) FILTER (WHERE data_visita >= ${inicioMes})::BIGINT AS total_mes
        FROM visita_domiciliar
      `),
      prisma.$queryRaw<AtendimentoResumoRow[]>(Prisma.sql`
        SELECT
          COUNT(*) FILTER (
            WHERE data_agendamento >= ${inicioHoje}
              AND data_agendamento < ${inicioAmanha}
              AND COALESCE(status, '') <> 'Cancelado'
          )::BIGINT AS total_hoje,
          COUNT(*) FILTER (
            WHERE data_agendamento >= ${inicioMes}
              AND COALESCE(status, '') <> 'Cancelado'
          )::BIGINT AS total_mes
        FROM agendamento
      `),
      prisma.$queryRaw<
        Array<{ status: string | null; total: bigint | number }>
      >(Prisma.sql`
        SELECT COALESCE(NULLIF(TRIM(status), ''), 'Sem status') AS status, COUNT(*)::BIGINT AS total
        FROM agendamento
        WHERE data_agendamento >= ${intervaloInicio}
          AND data_agendamento < ${intervaloFim}
        GROUP BY COALESCE(NULLIF(TRIM(status), ''), 'Sem status')
        ORDER BY total DESC, status ASC
        LIMIT 5
      `),
      prisma.$queryRaw<
        Array<{ tipo: string | null; total: bigint | number }>
      >(Prisma.sql`
        SELECT COALESCE(NULLIF(TRIM(tipo_atendimento), ''), 'Sem tipo definido') AS tipo, COUNT(*)::BIGINT AS total
        FROM agendamento
        WHERE data_agendamento >= ${intervaloInicio}
          AND data_agendamento < ${intervaloFim}
        GROUP BY COALESCE(NULLIF(TRIM(tipo_atendimento), ''), 'Sem tipo definido')
        ORDER BY total DESC, tipo ASC
        LIMIT 5
      `)
    ]);

    const centralHoje = bigintToNumber(centralRows[0]?.total_hoje);
    const centralMes = bigintToNumber(centralRows[0]?.total_mes);
    const visitasHoje = bigintToNumber(visitaRows[0]?.total_hoje);
    const visitasMes = bigintToNumber(visitaRows[0]?.total_mes);
    const agendaHoje = bigintToNumber(agendaRows[0]?.total_hoje);
    const agendaMes = bigintToNumber(agendaRows[0]?.total_mes);

    const totalPeriodo =
      periodo === "hoje"
        ? centralHoje + visitasHoje + agendaHoje
        : periodo === "semana"
          ? statusAgenda.reduce((acc, item) => acc + bigintToNumber(item.total), 0)
          : centralMes + visitasMes + agendaMes;

    const respostaDireta =
      periodo === "hoje"
        ? `Hoje foram localizados ${totalPeriodo} registros entre atendimentos, visitas e agendamentos ativos.`
        : periodo === "semana"
          ? `Nos últimos 7 dias foram localizados ${totalPeriodo} agendamentos ativos na agenda institucional.`
          : `No mês atual foram localizados ${totalPeriodo} registros entre atendimentos, visitas e agendamentos ativos.`;

    return {
      intent: "ATENDIMENTOS_RESUMO",
      answer: buildPremiumAnswer({
        respostaDireta,
        resumo: [
          `${centralHoje} atendimentos na central hoje`,
          `${visitasHoje} visitas domiciliares hoje`,
          `${agendaHoje} agendamentos ativos hoje`
        ],
        detalhes: [
          `${centralMes} atendimentos registrados no mês`,
          `${visitasMes} visitas registradas no mês`,
          `${agendaMes} agendamentos ativos registrados no mês`
        ],
        alertas:
          statusAgenda.length > 0
            ? statusAgenda.map(
                (item) => `${item.status ?? "Sem status"}: ${bigintToNumber(item.total)} no período consultado`
              )
            : undefined,
        sugestoes:
          topTipos.length > 0
            ? topTipos.map(
                (item) => `Tipo ${item.tipo ?? "Sem tipo definido"} com ${bigintToNumber(item.total)} registro(s)`
              )
            : ["Pergunte pelos atendimentos do mês", "Consulte retornos pendentes"]
      }),
      data: buildData(
        ["central_atendimento", "visita_domiciliar", "agendamento"],
        {
          periodo,
          centralHoje,
          centralMes,
          visitasHoje,
          visitasMes,
          agendamentosHoje: agendaHoje,
          agendamentosMes: agendaMes,
          totalPeriodo
        },
        [
          ...statusAgenda.map((item) => ({
            tipo: "status",
            nome: item.status ?? "Sem status",
            total: bigintToNumber(item.total)
          })),
          ...topTipos.map((item) => ({
            tipo: "tipo_atendimento",
            nome: item.tipo ?? "Sem tipo definido",
            total: bigintToNumber(item.total)
          }))
        ],
        { tipoConsulta: "atendimentos_resumo", periodo }
      )
    };
  }

  private async getDonationsSummary(): Promise<AiResponse> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [summaryRows, topDonors] = await Promise.all([
      prisma.$queryRaw<DonationSummaryRow[]>(Prisma.sql`
        SELECT
          COUNT(*)::bigint AS total_registros,
          COALESCE(SUM(COALESCE(valor_total, valor, 0)), 0) AS total_valor
        FROM recebimento_doacao
        WHERE data_recebimento >= ${startOfMonth}
      `),
      prisma.$queryRaw<DonationTopDonorRow[]>(Prisma.sql`
        SELECT
          COALESCE(d.nome, 'Doador nao identificado') AS nome,
          COALESCE(SUM(COALESCE(r.valor_total, r.valor, 0)), 0) AS total
        FROM recebimento_doacao r
        LEFT JOIN doador d ON d.id = r.doador_id
        WHERE r.data_recebimento >= ${startOfMonth}
        GROUP BY d.nome
        ORDER BY total DESC, nome ASC
        LIMIT 3
      `)
    ]);

    const summary = summaryRows[0];
    const totalRegistros = bigintToNumber(summary?.total_registros);
    const totalValor = decimalToNumber(summary?.total_valor) ?? 0;

    let answer =
      `No mês atual, o sistema registrou **${totalRegistros} doações** com total de **${formatCurrency(totalValor)}**.\n\n`;

    if (topDonors.length > 0) {
      answer += "**Maiores doadores do mês:**\n";
      for (const item of topDonors) {
        answer += `- ${item.nome ?? "Doador não identificado"} | ${formatCurrency(decimalToNumber(item.total) ?? 0)}\n`;
      }
    }

    return {
      intent: "RESUMO_DOACOES",
      answer: answer.trim(),
      data: buildData(
        ["recebimento_doacao", "doador"],
        {
          totalDoacoes: totalRegistros,
          totalArrecadado: totalValor,
          mesReferencia: `${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`
        },
        topDonors.map((item) => ({
          doador: item.nome ?? "Doador não identificado",
          total: formatCurrency(decimalToNumber(item.total) ?? 0)
        }))
      )
    };
  }

  private async getPendingTasksSummary(): Promise<AiResponse> {
    const [summaryRows, tasks] = await Promise.all([
      prisma.$queryRaw<PendingTaskSummaryRow[]>(Prisma.sql`
        SELECT
          COUNT(*) FILTER (WHERE status IS DISTINCT FROM 'Concluida')::BIGINT AS total_pendentes,
          COUNT(*) FILTER (WHERE COALESCE(status, '') = 'Em atraso')::BIGINT AS total_em_atraso
        FROM tarefas_pendencias
      `),
      prisma.$queryRaw<PendingTaskItemRow[]>(Prisma.sql`
        SELECT
          titulo,
          responsavel,
          prioridade,
          status,
          prazo
        FROM tarefas_pendencias
        WHERE status IS DISTINCT FROM 'Concluida'
        ORDER BY
          CASE WHEN COALESCE(status, '') = 'Em atraso' THEN 0 ELSE 1 END,
          prazo ASC NULLS LAST,
          atualizado_em DESC
        LIMIT 5
      `)
    ]);

    const summary = summaryRows[0];
    const totalPendentes = bigintToNumber(summary?.total_pendentes);
    const totalEmAtraso = bigintToNumber(summary?.total_em_atraso);

    let answer =
      `Existem **${totalPendentes} tarefas pendentes**, sendo **${totalEmAtraso} em atraso**.\n\n`;

    if (tasks.length > 0) {
      answer += "**Pendências prioritárias:**\n";
      for (const task of tasks) {
        answer += `- ${task.titulo} | responsável: ${task.responsavel ?? "-"} | status: ${task.status ?? "-"} | prazo: ${formatDate(task.prazo)}\n`;
      }
    }

    return {
      intent: "TAREFAS_PENDENTES",
      answer: answer.trim(),
      data: buildData(
        ["tarefas_pendencias"],
        {
          totalPendentes,
          totalEmAtraso
        },
        tasks.map((task) => ({
          titulo: task.titulo,
          responsavel: task.responsavel ?? "-",
          prioridade: task.prioridade ?? "-",
          status: task.status ?? "-",
          prazo: formatDate(task.prazo)
        }))
      )
    };
  }

  private async getTasksByResponsible(responsavel: string | null): Promise<AiResponse> {
    if (!responsavel) {
      return {
        intent: "TAREFAS_POR_RESPONSAVEL",
        answer: "Não consegui identificar o responsável. Tente algo como `tarefas do João`.",
        data: buildData(["tarefas_pendencias"])
      };
    }

    const tasks = await prisma.$queryRaw<PendingTaskItemRow[]>(Prisma.sql`
      SELECT
        titulo,
        responsavel,
        prioridade,
        status,
        prazo
      FROM tarefas_pendencias
      WHERE status IS DISTINCT FROM 'Concluida'
        AND COALESCE(responsavel, '') ILIKE ${`%${responsavel}%`}
      ORDER BY
        CASE WHEN COALESCE(status, '') = 'Em atraso' THEN 0 ELSE 1 END,
        prazo ASC NULLS LAST,
        atualizado_em DESC
      LIMIT 10
    `);

    let answer = `Encontrei **${tasks.length} tarefas pendentes** para **${responsavel}**.\n\n`;

    if (tasks.length > 0) {
      answer += "**Itens:**\n";
      for (const task of tasks) {
        answer += `- ${task.titulo} | prioridade: ${task.prioridade ?? "-"} | status: ${task.status ?? "-"} | prazo: ${formatDate(task.prazo)}\n`;
      }
    }

    return {
      intent: "TAREFAS_POR_RESPONSAVEL",
      answer: answer.trim(),
      data: buildData(
        ["tarefas_pendencias"],
        { totalTarefas: tasks.length, responsavel },
        tasks.map((task) => ({
          titulo: task.titulo,
          prioridade: task.prioridade ?? "-",
          status: task.status ?? "-",
          prazo: formatDate(task.prazo)
        })),
        { responsavel }
      )
    };
  }

  private async getEnrollmentSummary(): Promise<AiResponse> {
    const [summaryRows, spotlightRows] = await Promise.all([
      prisma.$queryRaw<EnrollmentSummaryRow[]>(Prisma.sql`
        SELECT
          COUNT(*)::BIGINT AS cursos_no_catalogo,
          COALESCE(SUM(COALESCE(c.vagas_totais, 0)), 0)::BIGINT AS total_vagas,
          COALESCE(SUM(COALESCE(c.vagas_disponiveis, 0)), 0)::BIGINT AS vagas_disponiveis,
          (SELECT COUNT(*)::BIGINT FROM cursos_atendimentos_matriculas) AS inscricoes_ativas,
          (SELECT COUNT(*)::BIGINT FROM cursos_atendimentos_fila_espera) AS total_fila_espera
        FROM cursos_atendimentos c
      `),
      prisma.$queryRaw<EnrollmentSpotlightRow[]>(Prisma.sql`
        SELECT
          c.nome,
          c.vagas_disponiveis,
          c.vagas_totais,
          (SELECT COUNT(*)::BIGINT FROM cursos_atendimentos_matriculas m WHERE m.curso_id = c.id) AS total_matriculas,
          (SELECT COUNT(*)::BIGINT FROM cursos_atendimentos_fila_espera f WHERE f.curso_id = c.id) AS total_fila_espera
        FROM cursos_atendimentos c
        ORDER BY
          (SELECT COUNT(*) FROM cursos_atendimentos_fila_espera f WHERE f.curso_id = c.id) DESC,
          c.nome ASC
        LIMIT 5
      `)
    ]);

    const summary = summaryRows[0];
    const cursosNoCatalogo = bigintToNumber(summary?.cursos_no_catalogo);
    const totalVagas = bigintToNumber(summary?.total_vagas);
    const vagasDisponiveis = bigintToNumber(summary?.vagas_disponiveis);
    const inscricoesAtivas = bigintToNumber(summary?.inscricoes_ativas);
    const totalFilaEspera = bigintToNumber(summary?.total_fila_espera);

    let answer =
      "Resumo atual de matrículas e vagas:\n\n" +
      `- Cursos no catálogo: **${cursosNoCatalogo}**\n` +
      `- Vagas totais: **${totalVagas}**\n` +
      `- Vagas disponíveis: **${vagasDisponiveis}**\n` +
      `- Inscrições ativas: **${inscricoesAtivas}**\n` +
      `- Fila de espera: **${totalFilaEspera}**\n\n`;

    if (spotlightRows.length > 0) {
      answer += "**Cursos com maior fila de espera:**\n";
      for (const item of spotlightRows) {
        answer += `- ${item.nome} | fila: ${bigintToNumber(item.total_fila_espera)} | matrículas: ${bigintToNumber(item.total_matriculas)} | vagas: ${item.vagas_disponiveis ?? 0}/${item.vagas_totais ?? 0}\n`;
      }
    }

    return {
      intent: "MATRICULAS_RESUMO",
      answer: answer.trim(),
      data: buildData(
        ["cursos_atendimentos", "cursos_atendimentos_matriculas", "cursos_atendimentos_fila_espera"],
        {
          cursosNoCatalogo,
          totalVagas,
          vagasDisponiveis,
          inscricoesAtivas,
          totalFilaEspera
        },
        spotlightRows.map((item) => ({
          curso: item.nome,
          filaEspera: bigintToNumber(item.total_fila_espera),
          matriculas: bigintToNumber(item.total_matriculas),
          vagasDisponiveis: item.vagas_disponiveis ?? 0,
          vagasTotais: item.vagas_totais ?? 0
        }))
      )
    };
  }

  private async getCoursesWithoutVacancy(): Promise<AiResponse> {
    const rows = await prisma.$queryRaw<EnrollmentSpotlightRow[]>(Prisma.sql`
      SELECT
        c.nome,
        c.vagas_disponiveis,
        c.vagas_totais,
        (SELECT COUNT(*)::BIGINT FROM cursos_atendimentos_matriculas m WHERE m.curso_id = c.id) AS total_matriculas,
        (SELECT COUNT(*)::BIGINT FROM cursos_atendimentos_fila_espera f WHERE f.curso_id = c.id) AS total_fila_espera
      FROM cursos_atendimentos c
      WHERE COALESCE(c.vagas_disponiveis, 0) <= 0
      ORDER BY
        (SELECT COUNT(*) FROM cursos_atendimentos_fila_espera f WHERE f.curso_id = c.id) DESC,
        c.nome ASC
      LIMIT 10
    `);

    let answer = `Encontrei **${rows.length} cursos sem vagas disponíveis**.\n\n`;

    if (rows.length > 0) {
      answer += "**Cursos lotados:**\n";
      for (const item of rows) {
        answer += `- ${item.nome} | fila: ${bigintToNumber(item.total_fila_espera)} | matrículas: ${bigintToNumber(item.total_matriculas)}\n`;
      }
    }

    return {
      intent: "CURSOS_SEM_VAGAS",
      answer: answer.trim(),
      data: buildData(
        ["cursos_atendimentos", "cursos_atendimentos_matriculas", "cursos_atendimentos_fila_espera"],
        { totalCursosSemVaga: rows.length },
        rows.map((item) => ({
          curso: item.nome,
          filaEspera: bigintToNumber(item.total_fila_espera),
          matriculas: bigintToNumber(item.total_matriculas)
        }))
      )
    };
  }

  private async getCaptacaoPendingDonations(): Promise<AiResponse> {
    const [summaryRows, items] = await Promise.all([
      prisma.$queryRaw<CaptacaoPendingSummaryRow[]>(Prisma.sql`
        SELECT
          COUNT(*)::BIGINT AS total_pendentes,
          COALESCE(SUM(COALESCE(valor_liquido, valor, 0)), 0)::DOUBLE PRECISION AS total_valor
        FROM captacao_doacoes
        WHERE deleted_at IS NULL
          AND situacao IN ('pendente', 'aguardando_pagamento')
      `),
      prisma.$queryRaw<CaptacaoPendingItemRow[]>(Prisma.sql`
        SELECT
          d.numero_doacao,
          doadores.nome AS doador_nome,
          COALESCE(d.valor_liquido, d.valor, 0)::DOUBLE PRECISION AS valor_liquido,
          d.situacao,
          d.data_hora
        FROM captacao_doacoes d
        LEFT JOIN captacao_doadores doadores ON doadores.id = d.doador_id
        WHERE d.deleted_at IS NULL
          AND d.situacao IN ('pendente', 'aguardando_pagamento')
        ORDER BY d.data_hora DESC NULLS LAST, d.id DESC
        LIMIT 5
      `)
    ]);

    const summary = summaryRows[0];
    const totalPendentes = bigintToNumber(summary?.total_pendentes);
    const totalValor = summary?.total_valor ?? 0;

    let answer =
      `Existem **${totalPendentes} doações pendentes na captação**, somando **${formatCurrency(totalValor)}**.\n\n`;

    if (items.length > 0) {
      answer += "**Pendências recentes:**\n";
      for (const item of items) {
        answer += `- ${item.numero_doacao ?? "-"} | doador: ${item.doador_nome ?? "Não informado"} | valor: ${formatCurrency(item.valor_liquido ?? 0)} | situação: ${item.situacao ?? "-"}\n`;
      }
    }

    return {
      intent: "DOACOES_PENDENTES_CAPTACAO",
      answer: answer.trim(),
      data: buildData(
        ["captacao_doacoes", "captacao_doadores"],
        {
          totalPendentes,
          totalValor
        },
        items.map((item) => ({
          numeroDoacao: item.numero_doacao ?? "-",
          doador: item.doador_nome ?? "Não informado",
          valor: formatCurrency(item.valor_liquido ?? 0),
          situacao: item.situacao ?? "-",
          data: formatDate(item.data_hora)
        }))
      )
    };
  }

  private async getMonthlyDelinquentDonors(): Promise<AiResponse> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const rows = await prisma.$queryRaw<
      Array<{
        doador_nome: string | null;
        total_pendente: number | null;
        quantidade: bigint | number;
      }>
    >(Prisma.sql`
      SELECT
        doadores.nome AS doador_nome,
        COALESCE(SUM(COALESCE(d.valor_liquido, d.valor, 0)), 0)::DOUBLE PRECISION AS total_pendente,
        COUNT(*)::BIGINT AS quantidade
      FROM captacao_doacoes d
      LEFT JOIN captacao_doadores doadores ON doadores.id = d.doador_id
      WHERE d.deleted_at IS NULL
        AND d.data_hora >= ${startOfMonth}
        AND d.data_hora < ${endOfMonth}
        AND (
          d.situacao IN ('pendente', 'aguardando_pagamento', 'vencido')
          OR (d.data_vencimento IS NOT NULL AND d.data_vencimento < CURRENT_DATE AND d.situacao NOT IN ('pago', 'confirmado', 'cancelado', 'estornado'))
        )
      GROUP BY doadores.nome
      ORDER BY total_pendente DESC, doadores.nome ASC
      LIMIT 10
    `);

    let answer = `Doador(es) com pendências no mês atual: **${rows.length}**.\n\n`;

    if (rows.length > 0) {
      answer += "**Maiores inadimplências do mês:**\n";
      for (const item of rows) {
        answer += `- ${item.doador_nome ?? "Não informado"} | pendências: ${bigintToNumber(item.quantidade)} | total: ${formatCurrency(item.total_pendente ?? 0)}\n`;
      }
    }

    return {
      intent: "DOADORES_INADIMPLENTES_MES",
      answer: answer.trim(),
      data: buildData(
        ["captacao_doacoes", "captacao_doadores"],
        { totalDoadores: rows.length, mesReferencia: `${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}` },
        rows.map((item) => ({
          doador: item.doador_nome ?? "Não informado",
          pendencias: bigintToNumber(item.quantidade),
          total: formatCurrency(item.total_pendente ?? 0)
        }))
      )
    };
  }

  private async getSystemOverview(): Promise<AiResponse> {
    const [beneficiarios, familias, usuarios, doadores] = await Promise.all([
      prisma.cadastroBeneficiario.count(),
      prisma.vinculoFamiliar.count(),
      prisma.usuario.count(),
      prisma.$queryRaw<Array<{ total: bigint | number }>>(Prisma.sql`
        SELECT COUNT(*)::bigint AS total
        FROM doador
      `)
    ]);

    const totalDoadores = bigintToNumber(doadores[0]?.total);

    return {
      intent: "RESUMO_SISTEMA",
      answer:
        "Resumo atual do G3 Next com base no banco interno:\n\n" +
        `- Beneficiários: **${beneficiarios}**\n` +
        `- Famílias: **${familias}**\n` +
        `- Usuários do sistema: **${usuarios}**\n` +
        `- Doadores: **${totalDoadores}**`,
      data: buildData(["cadastro_beneficiario", "vinculo_familiar", "usuario", "doador"], {
        beneficiarios,
        familias,
        usuarios,
        doadores: totalDoadores
      })
    };
  }
}
