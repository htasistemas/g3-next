import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";

type AiIntent =
  | "FAMILIAS_DESATUALIZADAS"
  | "BENEFICIARIOS_POR_LOCAL"
  | "BENEFICIARIOS_POR_FAIXA_ETARIA"
  | "RESUMO_DOACOES"
  | "TAREFAS_PENDENTES"
  | "TAREFAS_POR_RESPONSAVEL"
  | "MATRICULAS_RESUMO"
  | "CURSOS_SEM_VAGAS"
  | "DOACOES_PENDENTES_CAPTACAO"
  | "DOADORES_INADIMPLENTES_MES"
  | "RESUMO_SISTEMA"
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

type QueryContext = {
  query: string;
  normalizedQuery: string;
  userId?: string;
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

export class AiService {
  async processQuery(query: string, userId?: string): Promise<AiResponse> {
    const context: QueryContext = {
      query,
      normalizedQuery: normalizeQuery(query),
      userId
    };

    if (this.isHelpIntent(context.normalizedQuery)) {
      return this.getHelp();
    }

    if (this.isOutdatedFamiliesIntent(context.normalizedQuery)) {
      return this.findOutdatedFamilies(extractDays(context.normalizedQuery));
    }

    if (this.isLocationIntent(context.normalizedQuery)) {
      return this.countBeneficiariesByLocation(extractLocation(context.normalizedQuery));
    }

    if (this.isAgeRangeIntent(context.normalizedQuery)) {
      return this.countBeneficiariesByAgeRange(extractAgeRange(context.normalizedQuery));
    }

    if (this.isDonationIntent(context.normalizedQuery)) {
      if (this.isInadimplenteIntent(context.normalizedQuery)) {
        return this.getMonthlyDelinquentDonors();
      }
      if (this.isCaptacaoPendingIntent(context.normalizedQuery)) {
        return this.getCaptacaoPendingDonations();
      }
      return this.getDonationsSummary();
    }

    if (this.isTaskIntent(context.normalizedQuery)) {
      if (this.isResponsibleTaskIntent(context.normalizedQuery)) {
        return this.getTasksByResponsible(extractResponsible(context.normalizedQuery));
      }
      return this.getPendingTasksSummary();
    }

    if (this.isEnrollmentIntent(context.normalizedQuery)) {
      if (this.isNoVacancyIntent(context.normalizedQuery)) {
        return this.getCoursesWithoutVacancy();
      }
      return this.getEnrollmentSummary();
    }

    if (this.isSystemOverviewIntent(context.normalizedQuery)) {
      return this.getSystemOverview();
    }

    return {
      intent: "NAO_ENTENDIDO",
      answer:
        "Ainda não consegui interpretar essa pergunta com segurança usando apenas os dados internos do G3 Next.\n\n" +
        "Você pode tentar algo como:\n" +
        "- Famílias sem atualização há 90 dias\n" +
        "- Beneficiários no bairro Centro\n" +
        "- Resumo de doações deste mês\n" +
        "- Resumo geral do sistema",
      data: buildData(["banco_interno"], undefined, undefined, { consulta: query })
    };
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
