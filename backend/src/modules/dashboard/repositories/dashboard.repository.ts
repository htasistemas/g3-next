import { prisma } from "../../../database/prisma.js";
import type { DashboardTermoAlerta } from "../dashboard.types.js";

type TotalRow = { total: unknown };
type StatusCountRow = { status: string | null; total: unknown };
type IdadeRow = { data_nascimento: Date | string | null };
type TextoRow = { valor: string | null };
type ChaveValorRow = { chave: string | null; total: unknown };
type TermoAlertaRow = {
  numero: string | null;
  vigencia_fim: Date | string | null;
  status: string | null;
};

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function toIsoDateOrNull(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

export class DashboardRepository {
  private readonly tabelaCache = new Map<string, boolean>();
  private readonly colunaCache = new Map<string, boolean>();

  async contarBeneficiarios() {
    return this.contarTabela("cadastro_beneficiario");
  }

  async contarProfissionais() {
    return this.contarTabela("cadastro_profissionais");
  }

  async contarVoluntarios() {
    return this.contarTabela("cadastro_voluntario");
  }

  async contarFamilias() {
    return this.contarTabela("vinculo_familiar");
  }

  async contarBensPatrimonio() {
    return this.contarTabela("patrimonio_item");
  }

  async contarItensAlmoxarifado() {
    return this.contarTabela("almoxarifado_item");
  }

  async somarLivrosDisponiveis() {
    const tabelaBiblioteca = await this.primeiraTabelaExistente(["biblioteca_livro", "biblioteca_livros"]);
    if (!tabelaBiblioteca) return 0;

    const possuiQuantidadeDisponivel = await this.colunaExiste(tabelaBiblioteca, "quantidade_disponivel");
    if (!possuiQuantidadeDisponivel) return 0;

    const possuiStatus = await this.colunaExiste(tabelaBiblioteca, "status");
    const filtroStatus = possuiStatus
      ? "WHERE COALESCE(UPPER(TRIM(status)), 'ATIVO') <> 'INATIVO'"
      : "";

    return this.consultarTotal(
      `
      SELECT COALESCE(SUM(GREATEST(COALESCE(quantidade_disponivel, 0), 0)), 0) AS total
      FROM ${tabelaBiblioteca}
      ${filtroStatus}
      `,
      []
    );
  }

  async contarVeiculos() {
    return this.contarTabela("controle_veiculos");
  }

  async contarBeneficiariosPorStatus() {
    const possuiTabela = await this.tabelaExiste("cadastro_beneficiario");
    if (!possuiTabela) return {} as Record<string, number>;

    const possuiStatus = await this.colunaExiste("cadastro_beneficiario", "status");
    if (!possuiStatus) {
      return { EM_ANALISE: await this.contarBeneficiarios() };
    }

    const rows = await this.consultarRows<StatusCountRow>(
      `
      SELECT COALESCE(NULLIF(TRIM(status), ''), 'EM_ANALISE') AS status, COUNT(*)::bigint AS total
      FROM cadastro_beneficiario
      GROUP BY COALESCE(NULLIF(TRIM(status), ''), 'EM_ANALISE')
      `,
      []
    );

    const resultado: Record<string, number> = {};
    for (const row of rows) {
      const chave = (row.status ?? "EM_ANALISE").toUpperCase();
      resultado[chave] = toNumber(row.total);
    }
    return resultado;
  }

  async contarBeneficiariosPeriodo(startDate?: string, endDate?: string) {
    const possuiCriadoEm = await this.colunaExiste("cadastro_beneficiario", "criado_em");
    if (!possuiCriadoEm || (!startDate && !endDate)) {
      return this.contarTabela("cadastro_beneficiario");
    }

    const { where, params } = this.montarFiltroPeriodo("criado_em", startDate, endDate);
    return this.contarTabela("cadastro_beneficiario", where, params);
  }

  async contarCadastroCompleto() {
    const possuiTabelaBeneficiario = await this.tabelaExiste("cadastro_beneficiario");
    const possuiTabelaContato = await this.tabelaExiste("contato_beneficiario");
    const possuiEnderecoId = await this.colunaExiste("cadastro_beneficiario", "endereco_id");
    const possuiFkContato = await this.colunaExiste("contato_beneficiario", "beneficiario_id");

    if (!possuiTabelaBeneficiario || !possuiTabelaContato || !possuiEnderecoId || !possuiFkContato) {
      return 0;
    }

    return this.consultarTotal(
      `
      SELECT COUNT(*)::bigint AS total
      FROM cadastro_beneficiario b
      WHERE b.endereco_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM contato_beneficiario c
          WHERE c.beneficiario_id = b.id
        )
      `,
      []
    );
  }

  async listarDatasNascimento() {
    const possuiTabela = await this.tabelaExiste("cadastro_beneficiario");
    const possuiColuna = await this.colunaExiste("cadastro_beneficiario", "data_nascimento");
    if (!possuiTabela || !possuiColuna) return [] as Date[];

    const rows = await this.consultarRows<IdadeRow>(
      `
      SELECT data_nascimento
      FROM cadastro_beneficiario
      WHERE data_nascimento IS NOT NULL
      `,
      []
    );

    return rows
      .map((row) => {
        if (row.data_nascimento instanceof Date) return row.data_nascimento;
        const parsed = row.data_nascimento ? new Date(row.data_nascimento) : null;
        return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
      })
      .filter((data): data is Date => !!data);
  }

  async contarSituacaoSocialTotal() {
    const possuiTabela = await this.tabelaExiste("situacao_social");
    const possuiColuna = await this.colunaExiste("situacao_social", "beneficiario_id");
    if (!possuiTabela || !possuiColuna) return 0;

    return this.consultarTotal(
      "SELECT COUNT(DISTINCT beneficiario_id)::bigint AS total FROM situacao_social",
      []
    );
  }

  async calcularMediaPessoas() {
    const possuiTabela = await this.tabelaExiste("situacao_social");
    const possuiCriancas = await this.colunaExiste("situacao_social", "criancas_adolescentes");
    const possuiIdosos = await this.colunaExiste("situacao_social", "idosos");
    if (!possuiTabela || !possuiCriancas || !possuiIdosos) return 0;

    return this.consultarTotal(
      `
      SELECT COALESCE(AVG(COALESCE(criancas_adolescentes, 0) + COALESCE(idosos, 0)), 0) AS total
      FROM situacao_social
      `,
      []
    );
  }

  async listarRendasFamiliares() {
    const possuiTabela = await this.tabelaExiste("escolaridade_beneficiario");
    const possuiColuna = await this.colunaExiste("escolaridade_beneficiario", "renda_mensal");
    if (!possuiTabela || !possuiColuna) return [] as string[];

    const rows = await this.consultarRows<TextoRow>(
      `
      SELECT renda_mensal AS valor
      FROM escolaridade_beneficiario
      WHERE renda_mensal IS NOT NULL AND TRIM(renda_mensal) <> ''
      `,
      []
    );

    return rows.map((row) => row.valor ?? "").filter((valor) => valor.length > 0);
  }

  async contarVulnerabilidades() {
    return {
      "Acompanhamento CRAS": await this.contarFlag("situacao_social", "acompanhamento_cras"),
      "Acompanhamento Saude": await this.contarFlag("situacao_social", "acompanhamento_saude"),
      "Responsavel legal": await this.contarFlag("situacao_social", "responsavel_legal"),
      "Mora com familia": await this.contarFlag("situacao_social", "mora_com_familia")
    };
  }

  async contarInsegurancaAlimentar() {
    const possuiTabela = await this.tabelaExiste("vinculo_familiar");
    const possuiColuna = await this.colunaExiste("vinculo_familiar", "situacao_inseguranca_alimentar");
    if (!possuiTabela || !possuiColuna) return {} as Record<string, number>;

    const rows = await this.consultarRows<ChaveValorRow>(
      `
      SELECT COALESCE(NULLIF(TRIM(situacao_inseguranca_alimentar), ''), 'Nao informado') AS chave,
             COUNT(*)::bigint AS total
      FROM vinculo_familiar
      GROUP BY COALESCE(NULLIF(TRIM(situacao_inseguranca_alimentar), ''), 'Nao informado')
      ORDER BY total DESC, chave ASC
      `,
      []
    );

    return rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.chave ?? "Nao informado"] = toNumber(row.total);
      return acc;
    }, {});
  }

  async contarBeneficiariosPorBairro(limit = 12) {
    const possuiBeneficiario = await this.tabelaExiste("cadastro_beneficiario");
    const possuiEndereco = await this.tabelaExiste("endereco");
    const possuiEnderecoId = await this.colunaExiste("cadastro_beneficiario", "endereco_id");
    const possuiBairro = await this.colunaExiste("endereco", "bairro");

    if (!possuiBeneficiario || !possuiEndereco || !possuiEnderecoId || !possuiBairro) {
      return {} as Record<string, number>;
    }

    const rows = await this.consultarRows<ChaveValorRow>(
      `
      SELECT
        COALESCE(NULLIF(TRIM(e.bairro), ''), 'Nao informado') AS chave,
        COUNT(*)::bigint AS total
      FROM cadastro_beneficiario b
      LEFT JOIN endereco e ON e.id = b.endereco_id
      GROUP BY COALESCE(NULLIF(TRIM(e.bairro), ''), 'Nao informado')
      ORDER BY total DESC, chave ASC
      LIMIT $1
      `,
      [limit]
    );

    return rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.chave ?? "Nao informado"] = toNumber(row.total);
      return acc;
    }, {});
  }

  async somarValoresAReceber() {
    const possuiTabela = await this.tabelaExiste("lancamento_financeiro");
    const colunas = await this.verificarColunas("lancamento_financeiro", ["tipo", "situacao", "valor"]);
    if (!possuiTabela || !colunas) return 0;

    return this.consultarTotal(
      `
      SELECT COALESCE(SUM(valor), 0) AS total
      FROM lancamento_financeiro
      WHERE LOWER(COALESCE(tipo, '')) = 'receber'
        AND LOWER(COALESCE(situacao, '')) <> 'pago'
      `,
      []
    );
  }

  async somarValoresEmCaixa() {
    const possuiTabela = await this.tabelaExiste("conta_bancaria");
    const colunas = await this.verificarColunas("conta_bancaria", ["tipo", "saldo"]);
    if (!possuiTabela || !colunas) return 0;

    return this.consultarTotal(
      `
      SELECT COALESCE(SUM(saldo), 0) AS total
      FROM conta_bancaria
      WHERE LOWER(COALESCE(tipo, '')) = 'corrente'
      `,
      []
    );
  }

  async somarValoresEmBanco() {
    const possuiTabela = await this.tabelaExiste("conta_bancaria");
    const colunas = await this.verificarColunas("conta_bancaria", ["tipo", "saldo"]);
    if (!possuiTabela || !colunas) return 0;

    return this.consultarTotal(
      `
      SELECT COALESCE(SUM(saldo), 0) AS total
      FROM conta_bancaria
      WHERE LOWER(COALESCE(tipo, '')) <> 'corrente'
      `,
      []
    );
  }

  async contarCursosAtivos() {
    const possuiTabela = await this.tabelaExiste("cursos_atendimentos");
    if (!possuiTabela) return 0;

    const possuiStatus = await this.colunaExiste("cursos_atendimentos", "status");
    if (!possuiStatus) {
      return this.contarTabela("cursos_atendimentos");
    }

    return this.consultarTotal(
      `
      SELECT COUNT(*)::bigint AS total
      FROM cursos_atendimentos
      WHERE UPPER(COALESCE(status, '')) IN ('ATIVO', 'ABERTO', 'EM_ANDAMENTO', 'EM ANDAMENTO')
      `,
      []
    );
  }

  async calcularTaxaMediaOcupacaoCursos() {
    const possuiTabela = await this.tabelaExiste("cursos_atendimentos");
    const colunas = await this.verificarColunas("cursos_atendimentos", ["vagas_totais", "vagas_disponiveis"]);
    if (!possuiTabela || !colunas) return 0;

    return this.consultarTotal(
      `
      SELECT COALESCE(
        AVG(
          CASE
            WHEN COALESCE(vagas_totais, 0) <= 0 THEN 0
            ELSE (
              (COALESCE(vagas_totais, 0) - COALESCE(vagas_disponiveis, 0))::numeric
              / NULLIF(vagas_totais, 0)::numeric
            ) * 100
          END
        ),
        0
      ) AS total
      FROM cursos_atendimentos
      `,
      []
    );
  }

  async contarCertificadosEmitidos() {
    const possuiTabela = await this.tabelaExiste("cursos_atendimentos_matriculas");
    const possuiStatus = await this.colunaExiste("cursos_atendimentos_matriculas", "status");
    if (!possuiTabela || !possuiStatus) return 0;

    return this.consultarTotal(
      `
      SELECT COUNT(*)::bigint AS total
      FROM cursos_atendimentos_matriculas
      WHERE UPPER(COALESCE(status, '')) IN ('CERTIFICADO', 'CONCLUIDO', 'FINALIZADO')
      `,
      []
    );
  }

  async contarDoacoesPeriodo(startDate?: string, endDate?: string) {
    const possuiTabela = await this.tabelaExiste("doacao_realizada");
    if (!possuiTabela) return 0;

    const possuiData = await this.colunaExiste("doacao_realizada", "data_doacao");
    if (!possuiData || (!startDate && !endDate)) {
      return this.contarTabela("doacao_realizada");
    }

    const { where, params } = this.montarFiltroPeriodo("data_doacao", startDate, endDate);
    return this.contarTabela("doacao_realizada", where, params);
  }

  async obterResumoItensDoacao(startDate?: string, endDate?: string) {
    const possuiItens = await this.tabelaExiste("doacao_realizada_item");
    const possuiAlmox = await this.tabelaExiste("almoxarifado_item");
    if (!possuiItens || !possuiAlmox) return {} as Record<string, number>;

    const possuiTabelaDoacao = await this.tabelaExiste("doacao_realizada");
    const possuiDataDoacao = await this.colunaExiste("doacao_realizada", "data_doacao");
    const filtrarPorPeriodo = !!startDate || !!endDate;

    const params: unknown[] = [];
    const filtros: string[] = [];
    if (filtrarPorPeriodo && possuiTabelaDoacao && possuiDataDoacao) {
      if (startDate) {
        params.push(startDate);
        filtros.push(`CAST(dr.data_doacao AS date) >= $${params.length}`);
      }
      if (endDate) {
        params.push(endDate);
        filtros.push(`CAST(dr.data_doacao AS date) <= $${params.length}`);
      }
    }

    const where = filtros.length ? `WHERE ${filtros.join(" AND ")}` : "";
    const rows = await this.consultarRows<ChaveValorRow>(
      `
      SELECT
        COALESCE(NULLIF(TRIM(ai.categoria), ''), 'Sem categoria') AS chave,
        COALESCE(SUM(COALESCE(dri.quantidade, 0)), 0)::bigint AS total
      FROM doacao_realizada_item dri
      LEFT JOIN almoxarifado_item ai ON ai.id = dri.almoxarifado_item_id
      LEFT JOIN doacao_realizada dr ON dr.id = dri.doacao_realizada_id
      ${where}
      GROUP BY COALESCE(NULLIF(TRIM(ai.categoria), ''), 'Sem categoria')
      ORDER BY total DESC, chave ASC
      LIMIT 5
      `,
      params
    );

    return rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.chave ?? "Sem categoria"] = toNumber(row.total);
      return acc;
    }, {});
  }

  async contarVisitasDomiciliares(startDate?: string, endDate?: string) {
    const possuiTabela = await this.tabelaExiste("visita_domiciliar");
    if (!possuiTabela) return 0;

    const possuiData = await this.colunaExiste("visita_domiciliar", "data_visita");
    if (!possuiData || (!startDate && !endDate)) {
      return this.contarTabela("visita_domiciliar");
    }

    const { where, params } = this.montarFiltroPeriodo("data_visita", startDate, endDate);
    return this.contarTabela("visita_domiciliar", where, params);
  }

  async contarTermosVencendo() {
    const possuiTabela = await this.tabelaExiste("termo_fomento");
    const possuiData = await this.colunaExiste("termo_fomento", "data_fim_vigencia");
    if (!possuiTabela || !possuiData) return 0;

    const possuiSituacao = await this.colunaExiste("termo_fomento", "situacao");
    const filtroSituacao = possuiSituacao
      ? "AND COALESCE(UPPER(TRIM(situacao)), 'ATIVO') NOT IN ('CANCELADO', 'ENCERRADO', 'CONCLUIDO', 'INATIVO')"
      : "";

    return this.consultarTotal(
      `
      SELECT COUNT(*)::bigint AS total
      FROM termo_fomento
      WHERE data_fim_vigencia >= CURRENT_DATE
        AND data_fim_vigencia <= (CURRENT_DATE + INTERVAL '60 days')
        ${filtroSituacao}
      `,
      []
    );
  }

  async contarTermosAtivos() {
    const possuiTabela = await this.tabelaExiste("termo_fomento");
    if (!possuiTabela) return 0;

    const possuiSituacao = await this.colunaExiste("termo_fomento", "situacao");
    if (!possuiSituacao) {
      return this.contarTabela("termo_fomento");
    }

    return this.consultarTotal(
      `
      SELECT COUNT(*)::bigint AS total
      FROM termo_fomento
      WHERE COALESCE(UPPER(TRIM(situacao)), 'ATIVO') NOT IN ('CANCELADO', 'ENCERRADO', 'CONCLUIDO', 'INATIVO')
      `,
      []
    );
  }

  async somarValorTotalTermosAtivos() {
    const possuiTabela = await this.tabelaExiste("termo_fomento");
    const possuiValor = await this.colunaExiste("termo_fomento", "valor_global");
    if (!possuiTabela || !possuiValor) return 0;

    const possuiSituacao = await this.colunaExiste("termo_fomento", "situacao");
    const filtroSituacao = possuiSituacao
      ? "WHERE COALESCE(UPPER(TRIM(situacao)), 'ATIVO') NOT IN ('CANCELADO', 'ENCERRADO', 'CONCLUIDO', 'INATIVO')"
      : "";

    return this.consultarTotal(
      `
      SELECT COALESCE(SUM(valor_global), 0) AS total
      FROM termo_fomento
      ${filtroSituacao}
      `,
      []
    );
  }

  async listarAlertasTermos() {
    const possuiTabela = await this.tabelaExiste("termo_fomento");
    const colunasMinimas = await this.verificarColunas("termo_fomento", [
      "id",
      "numero_termo",
      "data_fim_vigencia",
      "situacao"
    ]);

    if (!possuiTabela || !colunasMinimas) return [] as DashboardTermoAlerta[];

    const rows = await this.consultarRows<TermoAlertaRow>(
      `
      SELECT
        COALESCE(NULLIF(TRIM(numero_termo), ''), CONCAT('Termo ', id::text)) AS numero,
        data_fim_vigencia AS vigencia_fim,
        COALESCE(NULLIF(TRIM(situacao), ''), 'ATIVO') AS status
      FROM termo_fomento
      WHERE data_fim_vigencia IS NOT NULL
        AND data_fim_vigencia <= (CURRENT_DATE + INTERVAL '120 days')
        AND COALESCE(UPPER(TRIM(situacao)), 'ATIVO') NOT IN ('CANCELADO', 'ENCERRADO', 'CONCLUIDO', 'INATIVO')
      ORDER BY data_fim_vigencia ASC
      LIMIT 10
      `,
      []
    );

    return rows.map((row) => ({
      numero: row.numero ?? "Termo",
      vigenciaFim: toIsoDateOrNull(row.vigencia_fim),
      status: row.status ?? null
    }));
  }

  async calcularExecucaoFinanceira() {
    const possuiTabela = await this.tabelaExiste("lancamento_financeiro");
    const colunas = await this.verificarColunas("lancamento_financeiro", ["tipo", "situacao", "valor"]);
    if (!possuiTabela || !colunas) return 0;

    return this.consultarTotal(
      `
      SELECT
        CASE
          WHEN total_receber.total = 0 THEN 0
          ELSE (total_pago.total / total_receber.total) * 100
        END AS total
      FROM
        (
          SELECT COALESCE(SUM(valor), 0)::numeric AS total
          FROM lancamento_financeiro
          WHERE LOWER(COALESCE(tipo, '')) = 'receber'
        ) total_receber,
        (
          SELECT COALESCE(SUM(valor), 0)::numeric AS total
          FROM lancamento_financeiro
          WHERE LOWER(COALESCE(tipo, '')) = 'receber'
            AND LOWER(COALESCE(situacao, '')) = 'pago'
        ) total_pago
      `,
      []
    );
  }

  async calcularAbsenteismo() {
    const possuiTabela = await this.tabelaExiste("cursos_atendimentos_presencas");
    const possuiStatus = await this.colunaExiste("cursos_atendimentos_presencas", "status");
    if (!possuiTabela || !possuiStatus) return 0;

    return this.consultarTotal(
      `
      SELECT
        CASE
          WHEN totais.total = 0 THEN 0
          ELSE (faltas.total::numeric / totais.total::numeric) * 100
        END AS total
      FROM
        (SELECT COUNT(*)::bigint AS total FROM cursos_atendimentos_presencas) totais,
        (
          SELECT COUNT(*)::bigint AS total
          FROM cursos_atendimentos_presencas
          WHERE UPPER(COALESCE(status, '')) IN ('FALTA', 'AUSENTE')
        ) faltas
      `,
      []
    );
  }

  private async contarFlag(tabela: string, coluna: string) {
    const possuiTabela = await this.tabelaExiste(tabela);
    const possuiColuna = await this.colunaExiste(tabela, coluna);
    if (!possuiTabela || !possuiColuna) return 0;

    return this.consultarTotal(
      `SELECT COUNT(*)::bigint AS total FROM ${tabela} WHERE ${coluna} = TRUE`,
      []
    );
  }

  private async contarTabela(tabela: string, where?: string, params: unknown[] = []) {
    const existe = await this.tabelaExiste(tabela);
    if (!existe) return 0;

    const whereSql = where ? ` WHERE ${where}` : "";
    return this.consultarTotal(
      `
      SELECT COUNT(*)::bigint AS total
      FROM ${tabela}${whereSql}
      `,
      params
    );
  }

  private montarFiltroPeriodo(coluna: string, startDate?: string, endDate?: string) {
    const params: unknown[] = [];
    const condicoes: string[] = [];

    if (startDate) {
      params.push(startDate);
      condicoes.push(`CAST(${coluna} AS date) >= $${params.length}`);
    }
    if (endDate) {
      params.push(endDate);
      condicoes.push(`CAST(${coluna} AS date) <= $${params.length}`);
    }

    return { where: condicoes.join(" AND "), params };
  }

  private async consultarTotal(sql: string, params: unknown[]) {
    const rows = await this.consultarRows<TotalRow>(sql, params);
    return toNumber(rows[0]?.total);
  }

  private async consultarRows<T>(sql: string, params: unknown[]) {
    try {
      return await prisma.$queryRawUnsafe<T[]>(sql, ...params);
    } catch (error) {
      console.warn("[dashboard] Falha ao executar consulta.", error);
      return [] as T[];
    }
  }

  private async verificarColunas(tabela: string, colunas: string[]) {
    const resultados = await Promise.all(colunas.map((coluna) => this.colunaExiste(tabela, coluna)));
    return resultados.every(Boolean);
  }

  private async primeiraTabelaExistente(tabelas: string[]) {
    for (const tabela of tabelas) {
      if (await this.tabelaExiste(tabela)) {
        return tabela;
      }
    }

    return null;
  }

  private async tabelaExiste(tabela: string) {
    if (this.tabelaCache.has(tabela)) {
      return this.tabelaCache.get(tabela) as boolean;
    }

    const rows = await this.consultarRows<{ existe: boolean }>(
      "SELECT to_regclass($1) IS NOT NULL AS existe",
      [`public.${tabela}`]
    );
    const existe = !!rows[0]?.existe;
    this.tabelaCache.set(tabela, existe);
    return existe;
  }

  private async colunaExiste(tabela: string, coluna: string) {
    const chave = `${tabela}.${coluna}`;
    if (this.colunaCache.has(chave)) {
      return this.colunaCache.get(chave) as boolean;
    }

    const tabelaValida = await this.tabelaExiste(tabela);
    if (!tabelaValida) {
      this.colunaCache.set(chave, false);
      return false;
    }

    const rows = await this.consultarRows<{ existe: boolean }>(
      `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = $1
          AND column_name = $2
      ) AS existe
      `,
      [tabela, coluna]
    );

    const existe = !!rows[0]?.existe;
    this.colunaCache.set(chave, existe);
    return existe;
  }
}
