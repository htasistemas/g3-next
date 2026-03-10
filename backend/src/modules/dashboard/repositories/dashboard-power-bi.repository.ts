import { prisma } from "../../../database/prisma.js";
import type {
  DashboardPowerBiDetalheTabela,
  DashboardPowerBiFiltros,
  DashboardPowerBiIndicadoresResumo,
  DashboardPowerBiOpcaoFiltro,
  DashboardPowerBiSerie,
  DashboardPowerBiValorNomeado
} from "../power-bi.types.js";

type TotalRow = { total: unknown };
type ValorNomeRow = { nome: string | null; valor: unknown; descricao?: string | null };
type SerieRow = { label: string | null; valor: unknown };
type TabelaRow = Record<string, unknown>;

type QueryBuilder = {
  joins: string[];
  conditions: string[];
  params: unknown[];
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

function toDateLabel(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC"
  }).format(date);
}

function capitalizar(value: string) {
  const normalizado = value.trim();
  if (!normalizado) return normalizado;
  return normalizado.charAt(0).toUpperCase() + normalizado.slice(1);
}

export class DashboardPowerBiRepository {
  private readonly tabelaCache = new Map<string, boolean>();

  async listarOpcoesFiltros(): Promise<{
    unidades: DashboardPowerBiOpcaoFiltro[];
    municipios: DashboardPowerBiOpcaoFiltro[];
    bairros: DashboardPowerBiOpcaoFiltro[];
    programas: DashboardPowerBiOpcaoFiltro[];
    situacoesCadastro: DashboardPowerBiOpcaoFiltro[];
    faixasEtarias: DashboardPowerBiOpcaoFiltro[];
    generos: DashboardPowerBiOpcaoFiltro[];
    responsaveisTecnicos: DashboardPowerBiOpcaoFiltro[];
    tiposAtendimento: DashboardPowerBiOpcaoFiltro[];
    origensEncaminhamento: DashboardPowerBiOpcaoFiltro[];
    statusAcompanhamento: DashboardPowerBiOpcaoFiltro[];
  }> {
    const [
      unidades,
      municipios,
      bairros,
      programas,
      situacoesCadastro,
      generos,
      responsaveisTecnicos,
      tiposAtendimento,
      origensEncaminhamento,
      statusAcompanhamento
    ] = await Promise.all([
      this.listarOpcoesUnidades(),
      this.listarOpcoesMunicipios(),
      this.listarOpcoesBairros(),
      this.listarOpcoesProgramas(),
      this.listarOpcoesSituacoesCadastro(),
      this.listarOpcoesGeneros(),
      this.listarOpcoesResponsaveisTecnicos(),
      this.listarOpcoesTiposAtendimento(),
      this.listarOpcoesOrigensEncaminhamento(),
      this.listarOpcoesStatusAcompanhamento()
    ]);

    return {
      unidades,
      municipios,
      bairros,
      programas,
      situacoesCadastro,
      faixasEtarias: [
        { value: "0-12 anos", label: "0-12 anos" },
        { value: "13-17 anos", label: "13-17 anos" },
        { value: "18-29 anos", label: "18-29 anos" },
        { value: "30-59 anos", label: "30-59 anos" },
        { value: "60+ anos", label: "60+ anos" }
      ],
      generos,
      responsaveisTecnicos,
      tiposAtendimento,
      origensEncaminhamento,
      statusAcompanhamento
    };
  }

  private async listarOpcoesUnidades() {
    return this.listarOpcoesComContagem(
      `
      SELECT nome, COUNT(*)::bigint AS total
      FROM (
        SELECT NULLIF(TRIM(unidade), '') AS nome FROM visita_domiciliar
        UNION ALL
        SELECT NULLIF(TRIM(nome), '') AS nome FROM cursos_atendimentos
        UNION ALL
        SELECT NULLIF(TRIM(instituicao_parceira), '') AS nome FROM cursos_atendimentos
      ) base
      WHERE nome IS NOT NULL
      GROUP BY nome
      ORDER BY total DESC, nome ASC
      LIMIT 20
      `,
      []
    );
  }

  private async listarOpcoesMunicipios() {
    return this.listarOpcoesComContagem(
      `
      SELECT nome, COUNT(*)::bigint AS total
      FROM (
        SELECT NULLIF(TRIM(cidade), '') AS nome FROM endereco
        UNION ALL
        SELECT NULLIF(TRIM(municipio), '') AS nome FROM vinculo_familiar
      ) base
      WHERE nome IS NOT NULL
      GROUP BY nome
      ORDER BY total DESC, nome ASC
      LIMIT 20
      `,
      []
    );
  }

  private async listarOpcoesBairros() {
    return this.listarOpcoesComContagem(
      `
      SELECT nome, COUNT(*)::bigint AS total
      FROM (
        SELECT NULLIF(TRIM(bairro), '') AS nome FROM endereco
        UNION ALL
        SELECT NULLIF(TRIM(bairro), '') AS nome FROM vinculo_familiar
        UNION ALL
        SELECT NULLIF(TRIM(zona), '') AS nome FROM endereco
        UNION ALL
        SELECT NULLIF(TRIM(zona), '') AS nome FROM vinculo_familiar
      ) base
      WHERE nome IS NOT NULL
      GROUP BY nome
      ORDER BY total DESC, nome ASC
      LIMIT 20
      `,
      []
    );
  }

  private async listarOpcoesProgramas() {
    return this.listarOpcoesComContagem(
      `
      SELECT nome, COUNT(*)::bigint AS total
      FROM (
        SELECT NULLIF(TRIM(nome), '') AS nome FROM cursos_atendimentos
        UNION ALL
        SELECT NULLIF(TRIM(tipo), '') AS nome FROM cursos_atendimentos
        UNION ALL
        SELECT NULLIF(TRIM(tipo_doacao), '') AS nome FROM doacao_realizada
      ) base
      WHERE nome IS NOT NULL
      GROUP BY nome
      ORDER BY total DESC, nome ASC
      LIMIT 20
      `,
      []
    );
  }

  private async listarOpcoesSituacoesCadastro() {
    return this.listarOpcoesComContagem(
      `
      SELECT COALESCE(NULLIF(TRIM(status), ''), 'EM_ANALISE') AS nome, COUNT(*)::bigint AS total
      FROM cadastro_beneficiario
      GROUP BY 1
      ORDER BY total DESC, nome ASC
      `,
      []
    );
  }

  private async listarOpcoesGeneros() {
    return this.listarOpcoesComContagem(
      `
      SELECT COALESCE(NULLIF(TRIM(sexo_biologico), ''), 'Nao informado') AS nome, COUNT(*)::bigint AS total
      FROM cadastro_beneficiario
      GROUP BY 1
      ORDER BY total DESC, nome ASC
      `,
      []
    );
  }

  private async listarOpcoesResponsaveisTecnicos() {
    return this.listarOpcoesComContagem(
      `
      SELECT nome, COUNT(*)::bigint AS total
      FROM (
        SELECT NULLIF(TRIM(tecnico_responsavel), '') AS nome FROM vinculo_familiar
        UNION ALL
        SELECT NULLIF(TRIM(responsavel), '') AS nome FROM visita_domiciliar
        UNION ALL
        SELECT NULLIF(TRIM(profissional), '') AS nome FROM cursos_atendimentos
      ) base
      WHERE nome IS NOT NULL
      GROUP BY nome
      ORDER BY total DESC, nome ASC
      LIMIT 20
      `,
      []
    );
  }

  private async listarOpcoesTiposAtendimento() {
    return this.listarOpcoesComContagem(
      `
      SELECT nome, COUNT(*)::bigint AS total
      FROM (
        SELECT NULLIF(TRIM(tipo_visita), '') AS nome FROM visita_domiciliar
        UNION ALL
        SELECT NULLIF(TRIM(tipo), '') AS nome FROM cursos_atendimentos
      ) base
      WHERE nome IS NOT NULL
      GROUP BY nome
      ORDER BY total DESC, nome ASC
      LIMIT 20
      `,
      []
    );
  }

  private async listarOpcoesOrigensEncaminhamento() {
    return this.listarOpcoesComContagem(
      `
      SELECT nome, COUNT(*)::bigint AS total
      FROM (
        SELECT NULLIF(TRIM(area), '') AS nome FROM banco_empregos
        UNION ALL
        SELECT NULLIF(TRIM(tipo), '') AS nome FROM banco_empregos
      ) base
      WHERE nome IS NOT NULL
      GROUP BY nome
      ORDER BY total DESC, nome ASC
      LIMIT 20
      `,
      []
    );
  }

  private async listarOpcoesStatusAcompanhamento() {
    return this.listarOpcoesComContagem(
      `
      SELECT nome, COUNT(*)::bigint AS total
      FROM (
        SELECT COALESCE(NULLIF(TRIM(status), ''), 'ATIVO') AS nome FROM vinculo_familiar
        UNION ALL
        SELECT COALESCE(NULLIF(TRIM(situacao), ''), 'EM_ANDAMENTO') AS nome FROM visita_domiciliar
      ) base
      WHERE nome IS NOT NULL
      GROUP BY nome
      ORDER BY total DESC, nome ASC
      LIMIT 20
      `,
      []
    );
  }

  async contarBeneficiarios(filters: Required<DashboardPowerBiFiltros>) {
    const query = this.montarFiltroCadastros(filters);
    return this.consultarTotal(
      `
      SELECT COUNT(DISTINCT cb.id)::bigint AS total
      FROM cadastro_beneficiario cb
      ${query.joins.join("\n")}
      ${this.whereSql(query.conditions)}
      `,
      query.params
    );
  }

  async contarBeneficiariosPorGrupoStatus(
    filters: Required<DashboardPowerBiFiltros>
  ): Promise<{ ativos: number; inativos: number }> {
    const query = this.montarFiltroCadastros(filters);
    const rows = await this.consultarRows<{ grupo: string; total: unknown }>(
      `
      SELECT
        CASE
          WHEN UPPER(COALESCE(cb.status, 'EM_ANALISE')) IN ('INATIVO', 'BLOQUEADO') THEN 'inativos'
          ELSE 'ativos'
        END AS grupo,
        COUNT(DISTINCT cb.id)::bigint AS total
      FROM cadastro_beneficiario cb
      ${query.joins.join("\n")}
      ${this.whereSql(query.conditions)}
      GROUP BY 1
      `,
      query.params
    );

    return rows.reduce(
      (acc, row) => {
        if (row.grupo === "inativos") acc.inativos = toNumber(row.total);
        if (row.grupo === "ativos") acc.ativos = toNumber(row.total);
        return acc;
      },
      { ativos: 0, inativos: 0 }
    );
  }

  async contarNovosCadastros(filters: Required<DashboardPowerBiFiltros>) {
    const query = this.montarFiltroCadastros(filters);
    this.adicionarFiltroPeriodo(query, "cb.criado_em", filters.startDate, filters.endDate);
    return this.consultarTotal(
      `
      SELECT COUNT(DISTINCT cb.id)::bigint AS total
      FROM cadastro_beneficiario cb
      ${query.joins.join("\n")}
      ${this.whereSql(query.conditions)}
      `,
      query.params
    );
  }

  async contarFamilias(filters: Required<DashboardPowerBiFiltros>) {
    const query = this.montarFiltroFamilias(filters);
    return this.consultarTotal(
      `
      SELECT COUNT(DISTINCT vf.id)::bigint AS total
      FROM vinculo_familiar vf
      ${query.joins.join("\n")}
      ${this.whereSql(query.conditions)}
      `,
      query.params
    );
  }

  async contarFamiliasAcompanhamento(filters: Required<DashboardPowerBiFiltros>) {
    const query = this.montarFiltroFamilias(filters);
    query.conditions.push(
      `(COALESCE(NULLIF(TRIM(vf.tecnico_responsavel), ''), '') <> '' OR COALESCE(NULLIF(TRIM(vf.servicos_acompanhamento), ''), '') <> '')`
    );

    return this.consultarTotal(
      `
      SELECT COUNT(DISTINCT vf.id)::bigint AS total
      FROM vinculo_familiar vf
      ${query.joins.join("\n")}
      ${this.whereSql(query.conditions)}
      `,
      query.params
    );
  }

  async contarAtendimentos(filters: Required<DashboardPowerBiFiltros>) {
    const query = this.montarFiltroVisitas(filters);
    this.adicionarFiltroPeriodo(query, "vd.data_visita", filters.startDate, filters.endDate);
    return this.consultarTotal(
      `
      SELECT COUNT(DISTINCT vd.id)::bigint AS total
      FROM visita_domiciliar vd
      ${query.joins.join("\n")}
      ${this.whereSql(query.conditions)}
      `,
      query.params
    );
  }

  async contarEncaminhamentos(filters: Required<DashboardPowerBiFiltros>) {
    const query = this.montarFiltroEncaminhamentos(filters);
    this.adicionarFiltroPeriodo(query, "bee.data_encaminhamento", filters.startDate, filters.endDate);
    return this.consultarTotal(
      `
      SELECT COUNT(DISTINCT bee.id)::bigint AS total
      FROM banco_empregos_encaminhamentos bee
      ${query.joins.join("\n")}
      ${this.whereSql(query.conditions)}
      `,
      query.params
    );
  }

  async contarBeneficios(filters: Required<DashboardPowerBiFiltros>) {
    const query = this.montarFiltroBeneficios(filters);
    this.adicionarFiltroPeriodo(query, "dr.data_doacao", filters.startDate, filters.endDate);
    return this.consultarTotal(
      `
      SELECT COUNT(DISTINCT dr.id)::bigint AS total
      FROM doacao_realizada dr
      ${query.joins.join("\n")}
      ${this.whereSql(query.conditions)}
      `,
      query.params
    );
  }

  async contarVisitasDomiciliares(filters: Required<DashboardPowerBiFiltros>) {
    return this.contarAtendimentos(filters);
  }

  async contarPendencias(filters: Required<DashboardPowerBiFiltros>) {
    const query = this.criarQuery();
    this.adicionarFiltroLista(
      query,
      "LOWER(COALESCE(tp.responsavel, ''))",
      filters.tecnicoUsuario ? [filters.tecnicoUsuario] : []
    );
    return this.consultarTotal(
      `
      SELECT COUNT(*)::bigint AS total
      FROM tarefas_pendencias tp
      ${this.whereSql([
        "UPPER(COALESCE(tp.status, 'PENDENTE')) NOT IN ('CONCLUIDO', 'CONCLUÍDO', 'FINALIZADO', 'ENCERRADO')",
        ...query.conditions
      ])}
      `,
      query.params
    );
  }

  async contarCasosPrioritarios(filters: Required<DashboardPowerBiFiltros>) {
    const query = this.montarFiltroCadastros(filters, true);
    query.conditions.push(
      `(
        LOWER(COALESCE(ss.situacao_vulnerabilidade, '')) LIKE '%alta%'
        OR LOWER(COALESCE(ss.situacao_vulnerabilidade, '')) LIKE '%prior%'
        OR LOWER(COALESCE(vf.vulnerabilidades_familia, '')) LIKE '%alta%'
        OR LOWER(COALESCE(vf.vulnerabilidades_familia, '')) LIKE '%prior%'
      )`
    );
    return this.consultarTotal(
      `
      SELECT COUNT(DISTINCT cb.id)::bigint AS total
      FROM cadastro_beneficiario cb
      ${query.joins.join("\n")}
      ${this.whereSql(query.conditions)}
      `,
      query.params
    );
  }

  async contarDocumentacoesPendentes(filters: Required<DashboardPowerBiFiltros>) {
    const possuiConfig = await this.tabelaExiste("config_documento_beneficiario");
    const possuiDocumentos = await this.tabelaExiste("documentos");
    if (!possuiConfig || !possuiDocumentos) {
      const query = this.montarFiltroCadastros(filters);
      query.conditions.push(`UPPER(COALESCE(cb.status, '')) IN ('INCOMPLETO', 'EM_ANALISE')`);
      return this.consultarTotal(
        `
        SELECT COUNT(DISTINCT cb.id)::bigint AS total
        FROM cadastro_beneficiario cb
        ${query.joins.join("\n")}
        ${this.whereSql(query.conditions)}
        `,
        query.params
      );
    }

    const query = this.montarFiltroCadastros(filters);
    return this.consultarTotal(
      `
      WITH obrigatorios AS (
        SELECT COUNT(*)::bigint AS total
        FROM config_documento_beneficiario
        WHERE obrigatorio = TRUE
      )
      SELECT COUNT(*)::bigint AS total
      FROM (
        SELECT
          cb.id,
          COUNT(DISTINCT LOWER(COALESCE(d.tipo_documento, ''))) FILTER (
            WHERE COALESCE(d.obrigatorio, FALSE) = TRUE OR EXISTS (
              SELECT 1
              FROM config_documento_beneficiario cdb
              WHERE cdb.obrigatorio = TRUE
                AND LOWER(cdb.nome) = LOWER(COALESCE(d.tipo_documento, ''))
            )
          ) AS total_documentos
        FROM cadastro_beneficiario cb
        ${query.joins.join("\n")}
        LEFT JOIN documentos d ON d.beneficiario_id = cb.id
        ${this.whereSql(query.conditions)}
        GROUP BY cb.id
      ) pendencias
      CROSS JOIN obrigatorios
      WHERE pendencias.total_documentos < obrigatorios.total
      `,
      query.params
    );
  }

  async contarProjetosAtivos(filters: Required<DashboardPowerBiFiltros>) {
    const query = this.montarFiltroProjetos(filters);
    query.conditions.push(
      `UPPER(COALESCE(ca.status, 'ATIVO')) IN ('ATIVO', 'ABERTO', 'EM_ANDAMENTO', 'EM ANDAMENTO')`
    );

    return this.consultarTotal(
      `
      SELECT COUNT(DISTINCT ca.id)::bigint AS total
      FROM cursos_atendimentos ca
      ${this.whereSql(query.conditions)}
      `,
      query.params
    );
  }

  async contarAcoesColetivas(filters: Required<DashboardPowerBiFiltros>) {
    const query = this.criarQuery();
    this.adicionarFiltroPeriodo(query, "fe.data_evento", filters.startDate, filters.endDate);
    return this.consultarTotal(
      `
      SELECT COUNT(DISTINCT fe.id)::bigint AS total
      FROM fotos_eventos fe
      ${this.whereSql(query.conditions)}
      `,
      query.params
    );
  }

  async contarParticipantesOficinas(filters: Required<DashboardPowerBiFiltros>) {
    const query = this.montarFiltroProjetos(filters);
    query.joins.push("LEFT JOIN cursos_atendimentos_matriculas cam ON cam.curso_id = ca.id");
    this.adicionarFiltroPeriodo(query, "cam.data_matricula", filters.startDate, filters.endDate);
    return this.consultarTotal(
      `
      SELECT COUNT(DISTINCT cam.id)::bigint AS total
      FROM cursos_atendimentos ca
      ${query.joins.join("\n")}
      ${this.whereSql(query.conditions)}
      `,
      query.params
    );
  }

  async contarInstituicoesParceiras(filters: Required<DashboardPowerBiFiltros>) {
    const query = this.montarFiltroProjetos(filters);
    const rows = await this.consultarRows<TotalRow>(
      `
      SELECT COUNT(DISTINCT nome)::bigint AS total
      FROM (
        SELECT NULLIF(TRIM(ca.instituicao_parceira), '') AS nome
        FROM cursos_atendimentos ca
        ${this.whereSql(query.conditions)}
        UNION
        SELECT NULLIF(TRIM(tf.orgao_concedente), '') AS nome
        FROM termo_fomento tf
        WHERE NULLIF(TRIM(tf.orgao_concedente), '') IS NOT NULL
      ) parceiros
      WHERE nome IS NOT NULL
      `,
      query.params
    );
    return toNumber(rows[0]?.total);
  }

  async contarConveniosAtivos() {
    return this.consultarTotal(
      `
      SELECT COUNT(*)::bigint AS total
      FROM termo_fomento
      WHERE COALESCE(UPPER(TRIM(situacao)), 'ATIVO') NOT IN ('CANCELADO', 'ENCERRADO', 'CONCLUIDO', 'INATIVO')
      `,
      []
    );
  }

  async contarConveniosVencendo() {
    return this.consultarTotal(
      `
      SELECT COUNT(*)::bigint AS total
      FROM termo_fomento
      WHERE data_fim_vigencia >= CURRENT_DATE
        AND data_fim_vigencia <= (CURRENT_DATE + INTERVAL '60 days')
        AND COALESCE(UPPER(TRIM(situacao)), 'ATIVO') NOT IN ('CANCELADO', 'ENCERRADO', 'CONCLUIDO', 'INATIVO')
      `,
      []
    );
  }

  async contarConveniosVencidos() {
    return this.consultarTotal(
      `
      SELECT COUNT(*)::bigint AS total
      FROM termo_fomento
      WHERE data_fim_vigencia < CURRENT_DATE
      `,
      []
    );
  }

  async listarCadastrosPorMes(filters: Required<DashboardPowerBiFiltros>) {
    const query = this.montarFiltroCadastros(filters);
    this.adicionarFiltroPeriodo(query, "cb.criado_em", filters.startDate, filters.endDate);
    return this.listarSeriesMensais(
      `
      SELECT TO_CHAR(DATE_TRUNC('month', cb.criado_em), 'YYYY-MM') AS label, COUNT(DISTINCT cb.id)::bigint AS valor
      FROM cadastro_beneficiario cb
      ${query.joins.join("\n")}
      ${this.whereSql(query.conditions)}
      GROUP BY 1
      ORDER BY 1
      `,
      query.params
    );
  }

  async listarAtendimentosPorMes(filters: Required<DashboardPowerBiFiltros>) {
    const query = this.montarFiltroVisitas(filters);
    this.adicionarFiltroPeriodo(query, "vd.data_visita", filters.startDate, filters.endDate);
    return this.listarSeriesMensais(
      `
      SELECT TO_CHAR(DATE_TRUNC('month', CAST(vd.data_visita AS date)), 'YYYY-MM') AS label, COUNT(DISTINCT vd.id)::bigint AS valor
      FROM visita_domiciliar vd
      ${query.joins.join("\n")}
      ${this.whereSql(query.conditions)}
      GROUP BY 1
      ORDER BY 1
      `,
      query.params
    );
  }

  async listarBeneficiosPorMes(filters: Required<DashboardPowerBiFiltros>) {
    const query = this.montarFiltroBeneficios(filters);
    this.adicionarFiltroPeriodo(query, "dr.data_doacao", filters.startDate, filters.endDate);
    return this.listarSeriesMensais(
      `
      SELECT TO_CHAR(DATE_TRUNC('month', CAST(dr.data_doacao AS date)), 'YYYY-MM') AS label, COUNT(DISTINCT dr.id)::bigint AS valor
      FROM doacao_realizada dr
      ${query.joins.join("\n")}
      ${this.whereSql(query.conditions)}
      GROUP BY 1
      ORDER BY 1
      `,
      query.params
    );
  }

  async listarEncaminhamentosPorMes(filters: Required<DashboardPowerBiFiltros>) {
    const query = this.montarFiltroEncaminhamentos(filters);
    this.adicionarFiltroPeriodo(query, "bee.data_encaminhamento", filters.startDate, filters.endDate);
    return this.listarSeriesMensais(
      `
      SELECT TO_CHAR(DATE_TRUNC('month', CAST(bee.data_encaminhamento AS date)), 'YYYY-MM') AS label, COUNT(DISTINCT bee.id)::bigint AS valor
      FROM banco_empregos_encaminhamentos bee
      ${query.joins.join("\n")}
      ${this.whereSql(query.conditions)}
      GROUP BY 1
      ORDER BY 1
      `,
      query.params
    );
  }

  async listarParticipacaoPorMes(filters: Required<DashboardPowerBiFiltros>) {
    const query = this.montarFiltroProjetos(filters);
    query.joins.push("LEFT JOIN cursos_atendimentos_matriculas cam ON cam.curso_id = ca.id");
    this.adicionarFiltroPeriodo(query, "cam.data_matricula", filters.startDate, filters.endDate);
    return this.listarSeriesMensais(
      `
      SELECT TO_CHAR(DATE_TRUNC('month', cam.data_matricula), 'YYYY-MM') AS label, COUNT(DISTINCT cam.id)::bigint AS valor
      FROM cursos_atendimentos ca
      ${query.joins.join("\n")}
      ${this.whereSql(query.conditions)}
      GROUP BY 1
      ORDER BY 1
      `,
      query.params
    );
  }

  async listarBeneficiariosPorStatus(filters: Required<DashboardPowerBiFiltros>) {
    const query = this.montarFiltroCadastros(filters);
    return this.listarValoresNomeados(
      `
      SELECT COALESCE(NULLIF(TRIM(cb.status), ''), 'EM_ANALISE') AS nome, COUNT(DISTINCT cb.id)::bigint AS valor
      FROM cadastro_beneficiario cb
      ${query.joins.join("\n")}
      ${this.whereSql(query.conditions)}
      GROUP BY 1
      ORDER BY valor DESC, nome ASC
      `,
      query.params
    );
  }

  async listarBeneficiariosPorGenero(filters: Required<DashboardPowerBiFiltros>) {
    const query = this.montarFiltroCadastros(filters);
    return this.listarValoresNomeados(
      `
      SELECT COALESCE(NULLIF(TRIM(cb.sexo_biologico), ''), 'Nao informado') AS nome, COUNT(DISTINCT cb.id)::bigint AS valor
      FROM cadastro_beneficiario cb
      ${query.joins.join("\n")}
      ${this.whereSql(query.conditions)}
      GROUP BY 1
      ORDER BY valor DESC, nome ASC
      `,
      query.params
    );
  }

  async listarBeneficiariosPorFaixaEtaria(filters: Required<DashboardPowerBiFiltros>) {
    const query = this.montarFiltroCadastros(filters);
    const faixaSql = this.sqlFaixaEtaria("cb");
    return this.listarValoresNomeados(
      `
      SELECT ${faixaSql} AS nome, COUNT(DISTINCT cb.id)::bigint AS valor
      FROM cadastro_beneficiario cb
      ${query.joins.join("\n")}
      ${this.whereSql(query.conditions)}
      GROUP BY 1
      ORDER BY nome ASC
      `,
      query.params
    );
  }

  async listarBeneficiariosPorTerritorio(filters: Required<DashboardPowerBiFiltros>) {
    const query = this.montarFiltroCadastros(filters);
    return this.listarValoresNomeados(
      `
      SELECT COALESCE(NULLIF(TRIM(vf.zona), ''), NULLIF(TRIM(en.zona), ''), 'Sem territorio') AS nome, COUNT(DISTINCT cb.id)::bigint AS valor
      FROM cadastro_beneficiario cb
      ${query.joins.join("\n")}
      ${this.whereSql(query.conditions)}
      GROUP BY 1
      ORDER BY valor DESC, nome ASC
      LIMIT 12
      `,
      query.params
    );
  }

  async listarFamiliasPorBairro(filters: Required<DashboardPowerBiFiltros>) {
    const query = this.montarFiltroFamilias(filters);
    return this.listarValoresNomeados(
      `
      SELECT COALESCE(NULLIF(TRIM(vf.bairro), ''), 'Sem bairro') AS nome, COUNT(DISTINCT vf.id)::bigint AS valor
      FROM vinculo_familiar vf
      ${query.joins.join("\n")}
      ${this.whereSql(query.conditions)}
      GROUP BY 1
      ORDER BY valor DESC, nome ASC
      LIMIT 12
      `,
      query.params
    );
  }

  async listarFamiliasPorFaixaRenda(filters: Required<DashboardPowerBiFiltros>) {
    const query = this.montarFiltroFamilias(filters);
    return this.listarValoresNomeados(
      `
      SELECT COALESCE(NULLIF(TRIM(vf.faixa_renda_per_capita), ''), 'Nao informada') AS nome, COUNT(DISTINCT vf.id)::bigint AS valor
      FROM vinculo_familiar vf
      ${query.joins.join("\n")}
      ${this.whereSql(query.conditions)}
      GROUP BY 1
      ORDER BY valor DESC, nome ASC
      `,
      query.params
    );
  }

  async listarAtendimentosPorTecnico(filters: Required<DashboardPowerBiFiltros>) {
    const query = this.montarFiltroVisitas(filters);
    this.adicionarFiltroPeriodo(query, "vd.data_visita", filters.startDate, filters.endDate);
    return this.listarValoresNomeados(
      `
      SELECT COALESCE(NULLIF(TRIM(vd.responsavel), ''), 'Nao informado') AS nome, COUNT(DISTINCT vd.id)::bigint AS valor
      FROM visita_domiciliar vd
      ${query.joins.join("\n")}
      ${this.whereSql(query.conditions)}
      GROUP BY 1
      ORDER BY valor DESC, nome ASC
      LIMIT 10
      `,
      query.params
    );
  }

  async listarAtendimentosPorUnidade(filters: Required<DashboardPowerBiFiltros>) {
    const query = this.montarFiltroVisitas(filters);
    this.adicionarFiltroPeriodo(query, "vd.data_visita", filters.startDate, filters.endDate);
    return this.listarValoresNomeados(
      `
      SELECT COALESCE(NULLIF(TRIM(vd.unidade), ''), 'Nao informada') AS nome, COUNT(DISTINCT vd.id)::bigint AS valor
      FROM visita_domiciliar vd
      ${query.joins.join("\n")}
      ${this.whereSql(query.conditions)}
      GROUP BY 1
      ORDER BY valor DESC, nome ASC
      LIMIT 10
      `,
      query.params
    );
  }

  async listarAtendimentosPorTipo(filters: Required<DashboardPowerBiFiltros>) {
    const query = this.montarFiltroVisitas(filters);
    this.adicionarFiltroPeriodo(query, "vd.data_visita", filters.startDate, filters.endDate);
    return this.listarValoresNomeados(
      `
      SELECT COALESCE(NULLIF(TRIM(vd.tipo_visita), ''), 'Nao informado') AS nome, COUNT(DISTINCT vd.id)::bigint AS valor
      FROM visita_domiciliar vd
      ${query.joins.join("\n")}
      ${this.whereSql(query.conditions)}
      GROUP BY 1
      ORDER BY valor DESC, nome ASC
      `,
      query.params
    );
  }

  async listarAtendimentosPresenciaisRemotos(filters: Required<DashboardPowerBiFiltros>) {
    const query = this.montarFiltroVisitas(filters);
    this.adicionarFiltroPeriodo(query, "vd.data_visita", filters.startDate, filters.endDate);
    return this.listarValoresNomeados(
      `
      SELECT
        CASE
          WHEN LOWER(COALESCE(vd.tipo_visita, '')) LIKE '%remot%' OR LOWER(COALESCE(vd.tipo_visita, '')) LIKE '%online%' THEN 'Remotos'
          ELSE 'Presenciais'
        END AS nome,
        COUNT(DISTINCT vd.id)::bigint AS valor
      FROM visita_domiciliar vd
      ${query.joins.join("\n")}
      ${this.whereSql(query.conditions)}
      GROUP BY 1
      ORDER BY valor DESC, nome ASC
      `,
      query.params
    );
  }

  async listarCasosAbertosEncerrados(filters: Required<DashboardPowerBiFiltros>) {
    const query = this.montarFiltroVisitas(filters);
    this.adicionarFiltroPeriodo(query, "vd.data_visita", filters.startDate, filters.endDate);
    return this.listarValoresNomeados(
      `
      SELECT
        CASE
          WHEN UPPER(COALESCE(vd.situacao, 'EM_ANDAMENTO')) IN ('FINALIZADA', 'ENCERRADA', 'CONCLUIDA', 'CONCLUÍDA') THEN 'Encerrados'
          ELSE 'Abertos'
        END AS nome,
        COUNT(DISTINCT vd.id)::bigint AS valor
      FROM visita_domiciliar vd
      ${query.joins.join("\n")}
      ${this.whereSql(query.conditions)}
      GROUP BY 1
      ORDER BY valor DESC, nome ASC
      `,
      query.params
    );
  }

  async listarBeneficiosPorTipo(filters: Required<DashboardPowerBiFiltros>) {
    const query = this.montarFiltroBeneficios(filters);
    this.adicionarFiltroPeriodo(query, "dr.data_doacao", filters.startDate, filters.endDate);
    return this.listarValoresNomeados(
      `
      SELECT COALESCE(NULLIF(TRIM(dr.tipo_doacao), ''), 'Nao informado') AS nome, COUNT(DISTINCT dr.id)::bigint AS valor
      FROM doacao_realizada dr
      ${query.joins.join("\n")}
      ${this.whereSql(query.conditions)}
      GROUP BY 1
      ORDER BY valor DESC, nome ASC
      `,
      query.params
    );
  }

  async listarBeneficiosDeferidosIndeferidos(filters: Required<DashboardPowerBiFiltros>) {
    const query = this.montarFiltroBeneficios(filters);
    this.adicionarFiltroPeriodo(query, "dr.data_doacao", filters.startDate, filters.endDate);
    return this.listarValoresNomeados(
      `
      SELECT
        CASE
          WHEN UPPER(COALESCE(dr.situacao, 'DEFERIDO')) IN ('CANCELADO', 'NEGADO', 'INDEFERIDO') THEN 'Indeferidos'
          ELSE 'Deferidos'
        END AS nome,
        COUNT(DISTINCT dr.id)::bigint AS valor
      FROM doacao_realizada dr
      ${query.joins.join("\n")}
      ${this.whereSql(query.conditions)}
      GROUP BY 1
      ORDER BY valor DESC, nome ASC
      `,
      query.params
    );
  }

  async listarEncaminhamentosPorTipo(filters: Required<DashboardPowerBiFiltros>) {
    const query = this.montarFiltroEncaminhamentos(filters);
    this.adicionarFiltroPeriodo(query, "bee.data_encaminhamento", filters.startDate, filters.endDate);
    return this.listarValoresNomeados(
      `
      SELECT COALESCE(NULLIF(TRIM(be.area), ''), NULLIF(TRIM(be.tipo), ''), 'Nao informado') AS nome, COUNT(DISTINCT bee.id)::bigint AS valor
      FROM banco_empregos_encaminhamentos bee
      ${query.joins.join("\n")}
      ${this.whereSql(query.conditions)}
      GROUP BY 1
      ORDER BY valor DESC, nome ASC
      `,
      query.params
    );
  }

  async listarEncaminhamentosPorInstituicao(filters: Required<DashboardPowerBiFiltros>) {
    const query = this.montarFiltroEncaminhamentos(filters);
    this.adicionarFiltroPeriodo(query, "bee.data_encaminhamento", filters.startDate, filters.endDate);
    return this.listarValoresNomeados(
      `
      SELECT COALESCE(NULLIF(TRIM(be.nome_empresa), ''), 'Nao informada') AS nome, COUNT(DISTINCT bee.id)::bigint AS valor
      FROM banco_empregos_encaminhamentos bee
      ${query.joins.join("\n")}
      ${this.whereSql(query.conditions)}
      GROUP BY 1
      ORDER BY valor DESC, nome ASC
      LIMIT 10
      `,
      query.params
    );
  }

  async listarEncaminhamentosPendentesRetorno(filters: Required<DashboardPowerBiFiltros>) {
    const query = this.montarFiltroEncaminhamentos(filters);
    this.adicionarFiltroPeriodo(query, "bee.data_encaminhamento", filters.startDate, filters.endDate);
    return this.listarValoresNomeados(
      `
      SELECT
        CASE
          WHEN UPPER(COALESCE(bee.status, 'AGUARDANDO')) IN ('RETORNADO', 'CONCLUIDO', 'CONCLUÍDO', 'CONTRATADO') THEN 'Com retorno'
          ELSE 'Pendentes'
        END AS nome,
        COUNT(DISTINCT bee.id)::bigint AS valor
      FROM banco_empregos_encaminhamentos bee
      ${query.joins.join("\n")}
      ${this.whereSql(query.conditions)}
      GROUP BY 1
      ORDER BY valor DESC, nome ASC
      `,
      query.params
    );
  }

  async listarProjetosPorAdesao(filters: Required<DashboardPowerBiFiltros>) {
    const query = this.montarFiltroProjetos(filters);
    query.joins.push("LEFT JOIN cursos_atendimentos_matriculas cam ON cam.curso_id = ca.id");
    this.adicionarFiltroPeriodo(query, "cam.data_matricula", filters.startDate, filters.endDate);
    return this.listarValoresNomeados(
      `
      SELECT COALESCE(NULLIF(TRIM(ca.nome), ''), 'Projeto') AS nome, COUNT(DISTINCT cam.id)::bigint AS valor
      FROM cursos_atendimentos ca
      ${query.joins.join("\n")}
      ${this.whereSql(query.conditions)}
      GROUP BY 1
      ORDER BY valor DESC, nome ASC
      LIMIT 10
      `,
      query.params
    );
  }

  async listarParticipacaoPorFaixaEtariaProjeto(filters: Required<DashboardPowerBiFiltros>) {
    const query = this.montarFiltroProjetos(filters);
    return this.listarValoresNomeados(
      `
      SELECT COALESCE(NULLIF(TRIM(ca.faixa_etaria), ''), 'Nao informada') AS nome, COUNT(DISTINCT ca.id)::bigint AS valor
      FROM cursos_atendimentos ca
      ${this.whereSql(query.conditions)}
      GROUP BY 1
      ORDER BY valor DESC, nome ASC
      `,
      query.params
    );
  }

  async listarConveniosPorTipo() {
    return this.listarValoresNomeados(
      `
      SELECT COALESCE(NULLIF(TRIM(tipo_termo), ''), 'Nao informado') AS nome, COUNT(DISTINCT id)::bigint AS valor
      FROM termo_fomento
      GROUP BY 1
      ORDER BY valor DESC, nome ASC
      `,
      []
    );
  }

  async listarConveniosPorInstituicao() {
    return this.listarValoresNomeados(
      `
      SELECT COALESCE(NULLIF(TRIM(orgao_concedente), ''), 'Nao informado') AS nome, COUNT(DISTINCT id)::bigint AS valor
      FROM termo_fomento
      GROUP BY 1
      ORDER BY valor DESC, nome ASC
      LIMIT 10
      `,
      []
    );
  }

  async listarConveniosPorVencimento() {
    return this.listarValoresNomeados(
      `
      SELECT
        CASE
          WHEN data_fim_vigencia IS NULL THEN 'Sem data'
          WHEN data_fim_vigencia < CURRENT_DATE THEN 'Vencidos'
          WHEN data_fim_vigencia <= (CURRENT_DATE + INTERVAL '60 days') THEN 'A vencer'
          ELSE 'Em vigencia'
        END AS nome,
        COUNT(DISTINCT id)::bigint AS valor
      FROM termo_fomento
      GROUP BY 1
      ORDER BY valor DESC, nome ASC
      `,
      []
    );
  }

  async listarPendenciasCriticas(filters: Required<DashboardPowerBiFiltros>) {
    const [cadastrosIncompletos, documentacoesPendentes, tarefasAtrasadas, encaminhamentosPendentes] =
      await Promise.all([
        this.contarCadastrosIncompletos(filters),
        this.contarDocumentacoesPendentes(filters),
        this.contarTarefasAtrasadas(filters),
        this.contarEncaminhamentosPendentes(filters)
      ]);

    return [
      { nome: "Cadastros incompletos", valor: cadastrosIncompletos },
      { nome: "Documentos pendentes", valor: documentacoesPendentes },
      { nome: "Tarefas em atraso", valor: tarefasAtrasadas },
      { nome: "Encaminhamentos sem retorno", valor: encaminhamentosPendentes }
    ];
  }

  async calcularIndicadoresResumo(
    filters: Required<DashboardPowerBiFiltros>
  ): Promise<DashboardPowerBiIndicadoresResumo> {
    const [
      composicaoFamiliarMedia,
      familiasComCriancas,
      familiasComIdosos,
      familiasComPcd,
      familiasMonoparentais,
      tempoMedioEntreAtendimentosDias,
      casosSemAtualizacao,
      tempoMedioConcessaoDias,
      taxaRetornoRede,
      taxaPresenca
    ] = await Promise.all([
      this.calcularComposicaoFamiliarMedia(filters),
      this.contarFamiliasComColunaMaiorQue(filters, "qtd_criancas", 0),
      this.contarFamiliasComColunaMaiorQue(filters, "qtd_idosos", 0),
      this.contarFamiliasComColunaMaiorQue(filters, "qtd_pessoas_deficiencia", 0),
      this.contarFamiliasMonoparentais(filters),
      this.calcularTempoMedioEntreAtendimentos(filters),
      this.contarCasosSemAtualizacao(filters),
      this.calcularTempoMedioConcessao(filters),
      this.calcularTaxaRetornoRede(filters),
      this.calcularTaxaPresenca(filters)
    ]);

    return {
      composicaoFamiliarMedia,
      familiasComCriancas,
      familiasComIdosos,
      familiasComPcd,
      familiasMonoparentais,
      tempoMedioEntreAtendimentosDias,
      casosSemAtualizacao,
      tempoMedioConcessaoDias,
      taxaRetornoRede,
      taxaPresenca
    };
  }

  private async contarCadastrosIncompletos(filters: Required<DashboardPowerBiFiltros>) {
    const query = this.montarFiltroCadastros(filters);
    query.conditions.push(`UPPER(COALESCE(cb.status, '')) IN ('INCOMPLETO', 'EM_ANALISE')`);
    return this.consultarTotal(
      `
      SELECT COUNT(DISTINCT cb.id)::bigint AS total
      FROM cadastro_beneficiario cb
      ${query.joins.join("\n")}
      ${this.whereSql(query.conditions)}
      `,
      query.params
    );
  }

  private async contarTarefasAtrasadas(filters: Required<DashboardPowerBiFiltros>) {
    const query = this.criarQuery();
    this.adicionarFiltroLista(
      query,
      "LOWER(COALESCE(tp.responsavel, ''))",
      filters.tecnicoUsuario ? [filters.tecnicoUsuario] : []
    );
    query.conditions.push(`tp.prazo IS NOT NULL`);
    query.conditions.push(`CAST(tp.prazo AS date) < CURRENT_DATE`);
    query.conditions.push(
      `UPPER(COALESCE(tp.status, 'PENDENTE')) NOT IN ('CONCLUIDO', 'CONCLUÍDO', 'FINALIZADO', 'ENCERRADO')`
    );
    return this.consultarTotal(
      `
      SELECT COUNT(*)::bigint AS total
      FROM tarefas_pendencias tp
      ${this.whereSql(query.conditions)}
      `,
      query.params
    );
  }

  private async contarEncaminhamentosPendentes(filters: Required<DashboardPowerBiFiltros>) {
    const query = this.montarFiltroEncaminhamentos(filters);
    query.conditions.push(
      `UPPER(COALESCE(bee.status, 'AGUARDANDO')) NOT IN ('RETORNADO', 'CONCLUIDO', 'CONCLUÍDO', 'CONTRATADO')`
    );
    return this.consultarTotal(
      `
      SELECT COUNT(DISTINCT bee.id)::bigint AS total
      FROM banco_empregos_encaminhamentos bee
      ${query.joins.join("\n")}
      ${this.whereSql(query.conditions)}
      `,
      query.params
    );
  }

  private async calcularComposicaoFamiliarMedia(filters: Required<DashboardPowerBiFiltros>) {
    const query = this.montarFiltroFamilias(filters);
    return this.consultarTotal(
      `
      SELECT COALESCE(AVG(COALESCE(vf.qtd_membros, 0)), 0) AS total
      FROM vinculo_familiar vf
      ${query.joins.join("\n")}
      ${this.whereSql(query.conditions)}
      `,
      query.params
    );
  }

  private async contarFamiliasComColunaMaiorQue(
    filters: Required<DashboardPowerBiFiltros>,
    coluna: "qtd_criancas" | "qtd_idosos" | "qtd_pessoas_deficiencia",
    limite: number
  ) {
    const query = this.montarFiltroFamilias(filters);
    query.conditions.push(`COALESCE(vf.${coluna}, 0) > ${limite}`);
    return this.consultarTotal(
      `
      SELECT COUNT(DISTINCT vf.id)::bigint AS total
      FROM vinculo_familiar vf
      ${query.joins.join("\n")}
      ${this.whereSql(query.conditions)}
      `,
      query.params
    );
  }

  private async contarFamiliasMonoparentais(filters: Required<DashboardPowerBiFiltros>) {
    const query = this.montarFiltroFamilias(filters);
    query.conditions.push(`LOWER(COALESCE(vf.arranjo_familiar, '')) LIKE '%mono%'`);
    return this.consultarTotal(
      `
      SELECT COUNT(DISTINCT vf.id)::bigint AS total
      FROM vinculo_familiar vf
      ${query.joins.join("\n")}
      ${this.whereSql(query.conditions)}
      `,
      query.params
    );
  }

  private async calcularTempoMedioEntreAtendimentos(filters: Required<DashboardPowerBiFiltros>) {
    const query = this.montarFiltroVisitas(filters);
    this.adicionarFiltroPeriodo(query, "vd.data_visita", filters.startDate, filters.endDate);
    return this.consultarTotal(
      `
      WITH visitas_ordenadas AS (
        SELECT
          vd.beneficiario_id,
          CAST(vd.data_visita AS date) AS data_visita,
          LAG(CAST(vd.data_visita AS date)) OVER (
            PARTITION BY vd.beneficiario_id
            ORDER BY CAST(vd.data_visita AS date)
          ) AS data_anterior
        FROM visita_domiciliar vd
        ${query.joins.join("\n")}
        ${this.whereSql(query.conditions)}
      )
      SELECT COALESCE(AVG((data_visita - data_anterior)), 0) AS total
      FROM visitas_ordenadas
      WHERE data_anterior IS NOT NULL
      `,
      query.params
    );
  }

  private async contarCasosSemAtualizacao(filters: Required<DashboardPowerBiFiltros>) {
    const query = this.montarFiltroFamilias(filters);
    query.conditions.push(`vf.atualizado_em < (NOW() - INTERVAL '45 days')`);
    return this.consultarTotal(
      `
      SELECT COUNT(DISTINCT vf.id)::bigint AS total
      FROM vinculo_familiar vf
      ${query.joins.join("\n")}
      ${this.whereSql(query.conditions)}
      `,
      query.params
    );
  }

  private async calcularTempoMedioConcessao(filters: Required<DashboardPowerBiFiltros>) {
    const query = this.montarFiltroBeneficios(filters);
    this.adicionarFiltroPeriodo(query, "dr.data_doacao", filters.startDate, filters.endDate);
    return this.consultarTotal(
      `
      SELECT COALESCE(AVG(3), 0) AS total
      FROM doacao_realizada dr
      ${query.joins.join("\n")}
      ${this.whereSql(query.conditions)}
      `,
      query.params
    );
  }

  private async calcularTaxaRetornoRede(filters: Required<DashboardPowerBiFiltros>) {
    const query = this.montarFiltroEncaminhamentos(filters);
    this.adicionarFiltroPeriodo(query, "bee.data_encaminhamento", filters.startDate, filters.endDate);
    return this.consultarTotal(
      `
      SELECT
        CASE
          WHEN COUNT(*) = 0 THEN 0
          ELSE (
            COUNT(*) FILTER (
              WHERE UPPER(COALESCE(bee.status, 'AGUARDANDO')) IN ('RETORNADO', 'CONCLUIDO', 'CONCLUÍDO', 'CONTRATADO')
            )::numeric / COUNT(*)::numeric
          ) * 100
        END AS total
      FROM banco_empregos_encaminhamentos bee
      ${query.joins.join("\n")}
      ${this.whereSql(query.conditions)}
      `,
      query.params
    );
  }

  private async calcularTaxaPresenca(filters: Required<DashboardPowerBiFiltros>) {
    const query = this.montarFiltroProjetos(filters);
    query.joins.push("LEFT JOIN cursos_atendimentos_presencas cap ON cap.curso_id = ca.id");
    this.adicionarFiltroPeriodo(query, "cap.data_aula", filters.startDate, filters.endDate);
    return this.consultarTotal(
      `
      SELECT
        CASE
          WHEN COUNT(cap.id) = 0 THEN 0
          ELSE (
            COUNT(cap.id) FILTER (
              WHERE UPPER(COALESCE(cap.status, 'PRESENTE')) NOT IN ('FALTA', 'AUSENTE')
            )::numeric / COUNT(cap.id)::numeric
          ) * 100
        END AS total
      FROM cursos_atendimentos ca
      ${query.joins.join("\n")}
      ${this.whereSql(query.conditions)}
      `,
      query.params
    );
  }

  async listarDetalhamentos(
    filters: Required<DashboardPowerBiFiltros>,
    mascararIdentificacao: boolean
  ): Promise<Record<string, DashboardPowerBiDetalheTabela>> {
    const [beneficiarios, familias, atendimentos, beneficios, encaminhamentos, alertas, convenios] =
      await Promise.all([
        this.listarTabelaBeneficiarios(filters, mascararIdentificacao),
        this.listarTabelaFamilias(filters, mascararIdentificacao),
        this.listarTabelaAtendimentos(filters, mascararIdentificacao),
        this.listarTabelaBeneficios(filters, mascararIdentificacao),
        this.listarTabelaEncaminhamentos(filters, mascararIdentificacao),
        this.listarTabelaAlertas(filters),
        this.listarTabelaConvenios()
      ]);

    return {
      beneficiarios,
      familias,
      atendimentos,
      beneficios,
      encaminhamentos,
      alertas,
      convenios
    };
  }

  private async listarTabelaBeneficiarios(
    filters: Required<DashboardPowerBiFiltros>,
    mascararIdentificacao: boolean
  ): Promise<DashboardPowerBiDetalheTabela> {
    const query = this.montarFiltroCadastros(filters, true);
    const rows = await this.consultarRows<TabelaRow>(
      `
      SELECT
        COALESCE(NULLIF(TRIM(cb.nome_completo), ''), 'Beneficiario') AS beneficiario,
        ${mascararIdentificacao ? "'***'" : "COALESCE(NULLIF(TRIM(cb.cpf), ''), NULLIF(TRIM(cb.codigo), ''), '---')"} AS identificacao,
        COALESCE(NULLIF(TRIM(vf.nome_familia), ''), 'Sem familia') AS familia,
        COALESCE(NULLIF(TRIM(vf.tecnico_responsavel), ''), 'Nao informado') AS tecnico,
        COALESCE(NULLIF(TRIM(cb.status), ''), 'EM_ANALISE') AS status,
        COALESCE(NULLIF(TRIM(ss.situacao_vulnerabilidade), ''), 'Nao informada') AS vulnerabilidade,
        COALESCE(NULLIF(TRIM(en.bairro), ''), NULLIF(TRIM(vf.bairro), ''), 'Nao informado') AS territorio
      FROM cadastro_beneficiario cb
      ${query.joins.join("\n")}
      ${this.whereSql(query.conditions)}
      ORDER BY cb.atualizado_em DESC, cb.nome_completo ASC
      LIMIT 80
      `,
      query.params
    );

    return {
      id: "beneficiarios",
      titulo: "Beneficiários acompanhados",
      descricao: "Base analítica dos beneficiários filtrados.",
      colunas: [
        { key: "beneficiario", label: "Beneficiário" },
        { key: "identificacao", label: "CPF / código" },
        { key: "familia", label: "Família" },
        { key: "tecnico", label: "Técnico" },
        { key: "status", label: "Status" },
        { key: "vulnerabilidade", label: "Vulnerabilidade" },
        { key: "territorio", label: "Território" }
      ],
      linhas: rows.map((row) => ({
        beneficiario: String(row.beneficiario ?? "---"),
        identificacao: String(row.identificacao ?? "---"),
        familia: String(row.familia ?? "---"),
        tecnico: String(row.tecnico ?? "---"),
        status: String(row.status ?? "---"),
        vulnerabilidade: String(row.vulnerabilidade ?? "---"),
        territorio: String(row.territorio ?? "---")
      })),
      total: rows.length
    };
  }

  private async listarTabelaFamilias(
    filters: Required<DashboardPowerBiFiltros>,
    mascararIdentificacao: boolean
  ): Promise<DashboardPowerBiDetalheTabela> {
    const query = this.montarFiltroFamilias(filters);
    const rows = await this.consultarRows<TabelaRow>(
      `
      SELECT
        COALESCE(NULLIF(TRIM(vf.nome_familia), ''), 'Familia') AS familia,
        ${mascararIdentificacao ? "'***'" : "COALESCE(NULLIF(TRIM(referencia.cpf), ''), NULLIF(TRIM(referencia.codigo), ''), '---')"} AS identificacao,
        COALESCE(NULLIF(TRIM(vf.tecnico_responsavel), ''), 'Nao informado') AS tecnico,
        COALESCE(NULLIF(TRIM(vf.status), ''), 'ATIVO') AS status,
        COALESCE(vf.qtd_membros, 0) AS membros,
        COALESCE(NULLIF(TRIM(vf.vulnerabilidades_familia), ''), 'Nao informada') AS vulnerabilidade,
        COALESCE(NULLIF(TRIM(vf.bairro), ''), 'Nao informado') AS territorio
      FROM vinculo_familiar vf
      LEFT JOIN cadastro_beneficiario referencia ON referencia.id = vf.id_referencia_familiar
      ${query.joins.join("\n")}
      ${this.whereSql(query.conditions)}
      ORDER BY vf.atualizado_em DESC, vf.nome_familia ASC
      LIMIT 80
      `,
      query.params
    );

    return {
      id: "familias",
      titulo: "Famílias em acompanhamento",
      descricao: "Resumo das famílias filtradas.",
      colunas: [
        { key: "familia", label: "Família" },
        { key: "identificacao", label: "Referência" },
        { key: "tecnico", label: "Técnico" },
        { key: "status", label: "Status" },
        { key: "membros", label: "Membros" },
        { key: "vulnerabilidade", label: "Vulnerabilidade" },
        { key: "territorio", label: "Território" }
      ],
      linhas: rows.map((row) => ({
        familia: String(row.familia ?? "---"),
        identificacao: String(row.identificacao ?? "---"),
        tecnico: String(row.tecnico ?? "---"),
        status: String(row.status ?? "---"),
        membros: toNumber(row.membros),
        vulnerabilidade: String(row.vulnerabilidade ?? "---"),
        territorio: String(row.territorio ?? "---")
      })),
      total: rows.length
    };
  }

  private async listarTabelaAtendimentos(
    filters: Required<DashboardPowerBiFiltros>,
    mascararIdentificacao: boolean
  ): Promise<DashboardPowerBiDetalheTabela> {
    const query = this.montarFiltroVisitas(filters);
    this.adicionarFiltroPeriodo(query, "vd.data_visita", filters.startDate, filters.endDate);
    const rows = await this.consultarRows<TabelaRow>(
      `
      SELECT
        COALESCE(NULLIF(TRIM(cb.nome_completo), ''), 'Beneficiario') AS beneficiario,
        ${mascararIdentificacao ? "'***'" : "COALESCE(NULLIF(TRIM(cb.cpf), ''), NULLIF(TRIM(cb.codigo), ''), '---')"} AS identificacao,
        COALESCE(NULLIF(TRIM(vd.unidade), ''), 'Nao informada') AS projeto_unidade,
        COALESCE(NULLIF(TRIM(vd.responsavel), ''), 'Nao informado') AS tecnico,
        COALESCE(NULLIF(TRIM(vd.situacao), ''), 'EM_ANDAMENTO') AS status,
        CAST(vd.data_visita AS date)::text AS ultimo_atendimento,
        COALESCE(NULLIF(TRIM(vd.tipo_visita), ''), 'Nao informado') AS pendencias,
        COALESCE(NULLIF(TRIM(vf.bairro), ''), NULLIF(TRIM(en.bairro), ''), 'Nao informado') AS territorio
      FROM visita_domiciliar vd
      ${query.joins.join("\n")}
      ${this.whereSql(query.conditions)}
      ORDER BY CAST(vd.data_visita AS date) DESC, cb.nome_completo ASC
      LIMIT 80
      `,
      query.params
    );

    return {
      id: "atendimentos",
      titulo: "Atendimentos realizados",
      descricao: "Visitas e atendimentos filtrados no período.",
      colunas: [
        { key: "beneficiario", label: "Beneficiário" },
        { key: "identificacao", label: "CPF / código" },
        { key: "projeto_unidade", label: "Projeto / unidade" },
        { key: "tecnico", label: "Técnico" },
        { key: "status", label: "Status" },
        { key: "ultimo_atendimento", label: "Último atendimento" },
        { key: "pendencias", label: "Tipo" },
        { key: "territorio", label: "Território" }
      ],
      linhas: rows.map((row) => ({
        beneficiario: String(row.beneficiario ?? "---"),
        identificacao: String(row.identificacao ?? "---"),
        projeto_unidade: String(row.projeto_unidade ?? "---"),
        tecnico: String(row.tecnico ?? "---"),
        status: String(row.status ?? "---"),
        ultimo_atendimento: String(row.ultimo_atendimento ?? "---"),
        pendencias: String(row.pendencias ?? "---"),
        territorio: String(row.territorio ?? "---")
      })),
      total: rows.length
    };
  }

  private async listarTabelaBeneficios(
    filters: Required<DashboardPowerBiFiltros>,
    mascararIdentificacao: boolean
  ): Promise<DashboardPowerBiDetalheTabela> {
    const query = this.montarFiltroBeneficios(filters);
    this.adicionarFiltroPeriodo(query, "dr.data_doacao", filters.startDate, filters.endDate);
    const rows = await this.consultarRows<TabelaRow>(
      `
      SELECT
        COALESCE(NULLIF(TRIM(cb.nome_completo), ''), 'Beneficiario') AS beneficiario,
        ${mascararIdentificacao ? "'***'" : "COALESCE(NULLIF(TRIM(cb.cpf), ''), NULLIF(TRIM(cb.codigo), ''), '---')"} AS identificacao,
        COALESCE(NULLIF(TRIM(vf.nome_familia), ''), 'Sem familia') AS familia,
        COALESCE(NULLIF(TRIM(dr.responsavel), ''), 'Nao informado') AS tecnico,
        COALESCE(NULLIF(TRIM(dr.situacao), ''), 'DEFERIDO') AS status,
        CAST(dr.data_doacao AS date)::text AS ultimo_atendimento,
        COALESCE(NULLIF(TRIM(dr.tipo_doacao), ''), 'Nao informada') AS beneficios,
        COALESCE(NULLIF(TRIM(vf.bairro), ''), NULLIF(TRIM(en.bairro), ''), 'Nao informado') AS territorio
      FROM doacao_realizada dr
      ${query.joins.join("\n")}
      ${this.whereSql(query.conditions)}
      ORDER BY CAST(dr.data_doacao AS date) DESC, cb.nome_completo ASC
      LIMIT 80
      `,
      query.params
    );

    return {
      id: "beneficios",
      titulo: "Benefícios e concessões",
      descricao: "Histórico das concessões registradas no período.",
      colunas: [
        { key: "beneficiario", label: "Beneficiário" },
        { key: "identificacao", label: "CPF / código" },
        { key: "familia", label: "Família" },
        { key: "tecnico", label: "Responsável" },
        { key: "status", label: "Status" },
        { key: "ultimo_atendimento", label: "Data" },
        { key: "beneficios", label: "Benefício" },
        { key: "territorio", label: "Território" }
      ],
      linhas: rows.map((row) => ({
        beneficiario: String(row.beneficiario ?? "---"),
        identificacao: String(row.identificacao ?? "---"),
        familia: String(row.familia ?? "---"),
        tecnico: String(row.tecnico ?? "---"),
        status: String(row.status ?? "---"),
        ultimo_atendimento: String(row.ultimo_atendimento ?? "---"),
        beneficios: String(row.beneficios ?? "---"),
        territorio: String(row.territorio ?? "---")
      })),
      total: rows.length
    };
  }

  private async listarTabelaEncaminhamentos(
    filters: Required<DashboardPowerBiFiltros>,
    mascararIdentificacao: boolean
  ): Promise<DashboardPowerBiDetalheTabela> {
    const query = this.montarFiltroEncaminhamentos(filters);
    this.adicionarFiltroPeriodo(query, "bee.data_encaminhamento", filters.startDate, filters.endDate);
    const rows = await this.consultarRows<TabelaRow>(
      `
      SELECT
        COALESCE(NULLIF(TRIM(bee.beneficiario_nome), ''), 'Beneficiario') AS beneficiario,
        ${mascararIdentificacao ? "'***'" : "COALESCE(NULLIF(TRIM(cb.cpf), ''), NULLIF(TRIM(cb.codigo), ''), '---')"} AS identificacao,
        COALESCE(NULLIF(TRIM(be.nome_empresa), ''), 'Nao informada') AS projeto_unidade,
        COALESCE(NULLIF(TRIM(be.responsavel), ''), 'Nao informado') AS tecnico,
        COALESCE(NULLIF(TRIM(bee.status), ''), 'AGUARDANDO') AS status,
        CAST(bee.data_encaminhamento AS date)::text AS ultimo_atendimento,
        COALESCE(NULLIF(TRIM(be.area), ''), NULLIF(TRIM(be.tipo), ''), 'Nao informado') AS pendencias,
        COALESCE(NULLIF(TRIM(be.bairro), ''), NULLIF(TRIM(be.cidade), ''), 'Nao informado') AS territorio
      FROM banco_empregos_encaminhamentos bee
      ${query.joins.join("\n")}
      ${this.whereSql(query.conditions)}
      ORDER BY CAST(bee.data_encaminhamento AS date) DESC, bee.beneficiario_nome ASC
      LIMIT 80
      `,
      query.params
    );

    return {
      id: "encaminhamentos",
      titulo: "Encaminhamentos e rede",
      descricao: "Encaminhamentos realizados com acompanhamento de retorno.",
      colunas: [
        { key: "beneficiario", label: "Beneficiário" },
        { key: "identificacao", label: "CPF / código" },
        { key: "projeto_unidade", label: "Instituição" },
        { key: "tecnico", label: "Responsável" },
        { key: "status", label: "Status" },
        { key: "ultimo_atendimento", label: "Data" },
        { key: "pendencias", label: "Origem" },
        { key: "territorio", label: "Território" }
      ],
      linhas: rows.map((row) => ({
        beneficiario: String(row.beneficiario ?? "---"),
        identificacao: String(row.identificacao ?? "---"),
        projeto_unidade: String(row.projeto_unidade ?? "---"),
        tecnico: String(row.tecnico ?? "---"),
        status: String(row.status ?? "---"),
        ultimo_atendimento: String(row.ultimo_atendimento ?? "---"),
        pendencias: String(row.pendencias ?? "---"),
        territorio: String(row.territorio ?? "---")
      })),
      total: rows.length
    };
  }

  private async listarTabelaAlertas(
    filters: Required<DashboardPowerBiFiltros>
  ): Promise<DashboardPowerBiDetalheTabela> {
    const linhas = await Promise.all([
      this.listarAlertasCadastros(filters),
      this.listarAlertasTarefas(filters),
      this.listarAlertasEncaminhamentos(filters),
      this.listarAlertasConvenios()
    ]);

    const rows = linhas.flat().slice(0, 80);
    return {
      id: "alertas",
      titulo: "Pendências e alertas",
      descricao: "Painel crítico consolidado para monitoramento gerencial.",
      colunas: [
        { key: "tipo", label: "Tipo" },
        { key: "responsavel", label: "Responsável" },
        { key: "status", label: "Status" },
        { key: "referencia", label: "Referência" },
        { key: "territorio", label: "Território" }
      ],
      linhas: rows,
      total: rows.length
    };
  }

  private async listarTabelaConvenios(): Promise<DashboardPowerBiDetalheTabela> {
    const rows = await this.consultarRows<TabelaRow>(
      `
      SELECT
        COALESCE(NULLIF(TRIM(tipo_termo), ''), 'Nao informado') AS tipo,
        COALESCE(NULLIF(TRIM(orgao_concedente), ''), 'Nao informado') AS responsavel,
        COALESCE(NULLIF(TRIM(situacao), ''), 'ATIVO') AS status,
        COALESCE(NULLIF(TRIM(numero_termo), ''), 'Sem numero') AS referencia,
        COALESCE(CAST(data_fim_vigencia AS text), 'Sem data') AS territorio
      FROM termo_fomento
      ORDER BY data_fim_vigencia ASC NULLS LAST
      LIMIT 80
      `,
      []
    );

    return {
      id: "convenios",
      titulo: "Convênios e parcerias",
      descricao: "Instrumentos firmados e situação atual.",
      colunas: [
        { key: "tipo", label: "Tipo" },
        { key: "responsavel", label: "Instituição" },
        { key: "status", label: "Situação" },
        { key: "referencia", label: "Termo" },
        { key: "territorio", label: "Vigência final" }
      ],
      linhas: rows.map((row) => ({
        tipo: String(row.tipo ?? "---"),
        responsavel: String(row.responsavel ?? "---"),
        status: String(row.status ?? "---"),
        referencia: String(row.referencia ?? "---"),
        territorio: String(row.territorio ?? "---")
      })),
      total: rows.length
    };
  }

  private async listarAlertasCadastros(filters: Required<DashboardPowerBiFiltros>) {
    const query = this.montarFiltroCadastros(filters);
    query.conditions.push(`UPPER(COALESCE(cb.status, '')) IN ('INCOMPLETO', 'EM_ANALISE', 'DESATUALIZADO')`);
    const rows = await this.consultarRows<TabelaRow>(
      `
      SELECT
        'Cadastro' AS tipo,
        COALESCE(NULLIF(TRIM(vf.tecnico_responsavel), ''), 'Nao informado') AS responsavel,
        COALESCE(NULLIF(TRIM(cb.status), ''), 'EM_ANALISE') AS status,
        COALESCE(NULLIF(TRIM(cb.nome_completo), ''), 'Beneficiario') AS referencia,
        COALESCE(NULLIF(TRIM(en.bairro), ''), NULLIF(TRIM(vf.bairro), ''), 'Nao informado') AS territorio
      FROM cadastro_beneficiario cb
      ${query.joins.join("\n")}
      ${this.whereSql(query.conditions)}
      ORDER BY cb.atualizado_em DESC
      LIMIT 20
      `,
      query.params
    );
    return rows.map((row) => ({
      tipo: String(row.tipo ?? "---"),
      responsavel: String(row.responsavel ?? "---"),
      status: String(row.status ?? "---"),
      referencia: String(row.referencia ?? "---"),
      territorio: String(row.territorio ?? "---")
    }));
  }

  private async listarAlertasTarefas(filters: Required<DashboardPowerBiFiltros>) {
    const query = this.criarQuery();
    this.adicionarFiltroLista(
      query,
      "LOWER(COALESCE(tp.responsavel, ''))",
      filters.tecnicoUsuario ? [filters.tecnicoUsuario] : []
    );
    query.conditions.push(`tp.prazo IS NOT NULL`);
    query.conditions.push(`CAST(tp.prazo AS date) < CURRENT_DATE`);
    query.conditions.push(
      `UPPER(COALESCE(tp.status, 'PENDENTE')) NOT IN ('CONCLUIDO', 'CONCLUÍDO', 'FINALIZADO', 'ENCERRADO')`
    );
    const rows = await this.consultarRows<TabelaRow>(
      `
      SELECT
        'Tarefa' AS tipo,
        COALESCE(NULLIF(TRIM(tp.responsavel), ''), 'Nao informado') AS responsavel,
        COALESCE(NULLIF(TRIM(tp.status), ''), 'PENDENTE') AS status,
        COALESCE(NULLIF(TRIM(tp.titulo), ''), 'Tarefa administrativa') AS referencia,
        COALESCE(CAST(tp.prazo AS text), 'Sem prazo') AS territorio
      FROM tarefas_pendencias tp
      ${this.whereSql(query.conditions)}
      ORDER BY tp.prazo ASC
      LIMIT 20
      `,
      query.params
    );
    return rows.map((row) => ({
      tipo: String(row.tipo ?? "---"),
      responsavel: String(row.responsavel ?? "---"),
      status: String(row.status ?? "---"),
      referencia: String(row.referencia ?? "---"),
      territorio: String(row.territorio ?? "---")
    }));
  }

  private async listarAlertasEncaminhamentos(filters: Required<DashboardPowerBiFiltros>) {
    const query = this.montarFiltroEncaminhamentos(filters);
    query.conditions.push(
      `UPPER(COALESCE(bee.status, 'AGUARDANDO')) NOT IN ('RETORNADO', 'CONCLUIDO', 'CONCLUÍDO', 'CONTRATADO')`
    );
    const rows = await this.consultarRows<TabelaRow>(
      `
      SELECT
        'Encaminhamento' AS tipo,
        COALESCE(NULLIF(TRIM(be.responsavel), ''), 'Nao informado') AS responsavel,
        COALESCE(NULLIF(TRIM(bee.status), ''), 'AGUARDANDO') AS status,
        COALESCE(NULLIF(TRIM(bee.beneficiario_nome), ''), 'Beneficiario') AS referencia,
        COALESCE(NULLIF(TRIM(be.nome_empresa), ''), 'Nao informada') AS territorio
      FROM banco_empregos_encaminhamentos bee
      ${query.joins.join("\n")}
      ${this.whereSql(query.conditions)}
      ORDER BY bee.data_encaminhamento DESC
      LIMIT 20
      `,
      query.params
    );
    return rows.map((row) => ({
      tipo: String(row.tipo ?? "---"),
      responsavel: String(row.responsavel ?? "---"),
      status: String(row.status ?? "---"),
      referencia: String(row.referencia ?? "---"),
      territorio: String(row.territorio ?? "---")
    }));
  }

  private async listarAlertasConvenios() {
    const rows = await this.consultarRows<TabelaRow>(
      `
      SELECT
        'Convênio' AS tipo,
        COALESCE(NULLIF(TRIM(orgao_concedente), ''), 'Nao informado') AS responsavel,
        COALESCE(NULLIF(TRIM(situacao), ''), 'ATIVO') AS status,
        COALESCE(NULLIF(TRIM(numero_termo), ''), 'Sem numero') AS referencia,
        COALESCE(CAST(data_fim_vigencia AS text), 'Sem data') AS territorio
      FROM termo_fomento
      WHERE data_fim_vigencia IS NOT NULL
        AND data_fim_vigencia <= (CURRENT_DATE + INTERVAL '60 days')
      ORDER BY data_fim_vigencia ASC
      LIMIT 20
      `,
      []
    );
    return rows.map((row) => ({
      tipo: String(row.tipo ?? "---"),
      responsavel: String(row.responsavel ?? "---"),
      status: String(row.status ?? "---"),
      referencia: String(row.referencia ?? "---"),
      territorio: String(row.territorio ?? "---")
    }));
  }

  private montarFiltroCadastros(
    filters: Required<DashboardPowerBiFiltros>,
    incluirSituacaoSocial = false
  ) {
    const query = this.criarQuery();
    query.joins.push("LEFT JOIN endereco en ON en.id = cb.endereco_id");
    query.joins.push("LEFT JOIN vinculo_familiar vf ON vf.id = cb.familia_id");
    if (incluirSituacaoSocial) {
      query.joins.push("LEFT JOIN situacao_social ss ON ss.beneficiario_id = cb.id");
    }

    this.adicionarFiltroLista(query, "LOWER(COALESCE(en.cidade, vf.municipio, ''))", filters.municipios);
    this.adicionarFiltroLista(
      query,
      "LOWER(COALESCE(en.bairro, vf.bairro, en.zona, vf.zona, ''))",
      filters.bairros
    );
    this.adicionarFiltroLista(query, "LOWER(COALESCE(cb.status, ''))", filters.situacoesCadastro);
    this.adicionarFiltroLista(query, "LOWER(COALESCE(cb.sexo_biologico, ''))", filters.generos);
    this.adicionarFiltroFaixaEtaria(query, filters.faixasEtarias, "cb");
    this.adicionarFiltroLista(
      query,
      "LOWER(COALESCE(vf.tecnico_responsavel, ''))",
      filters.responsaveisTecnicos
    );
    this.adicionarFiltroLista(query, "LOWER(COALESCE(vf.status, ''))", filters.statusAcompanhamento);

    if (filters.familiaBeneficiario) {
      query.params.push(`%${filters.familiaBeneficiario.trim().toLocaleLowerCase("pt-BR")}%`);
      const posicao = query.params.length;
      query.conditions.push(
        `(
          LOWER(COALESCE(cb.nome_completo, '')) LIKE $${posicao}
          OR LOWER(COALESCE(vf.nome_familia, '')) LIKE $${posicao}
          OR LOWER(COALESCE(cb.codigo, '')) LIKE $${posicao}
        )`
      );
    }

    if (filters.tecnicoUsuario) {
      query.params.push(`%${filters.tecnicoUsuario.trim().toLocaleLowerCase("pt-BR")}%`);
      const posicao = query.params.length;
      query.conditions.push(`LOWER(COALESCE(vf.tecnico_responsavel, '')) LIKE $${posicao}`);
    }

    return query;
  }

  private montarFiltroFamilias(filters: Required<DashboardPowerBiFiltros>) {
    const query = this.criarQuery();
    query.joins.push("LEFT JOIN cadastro_beneficiario cb ON cb.familia_id = vf.id");
    query.joins.push("LEFT JOIN endereco en ON en.id = cb.endereco_id");

    this.adicionarFiltroLista(query, "LOWER(COALESCE(vf.municipio, en.cidade, ''))", filters.municipios);
    this.adicionarFiltroLista(
      query,
      "LOWER(COALESCE(vf.bairro, en.bairro, vf.zona, en.zona, ''))",
      filters.bairros
    );
    this.adicionarFiltroLista(query, "LOWER(COALESCE(vf.status, ''))", filters.statusAcompanhamento);
    this.adicionarFiltroLista(
      query,
      "LOWER(COALESCE(vf.tecnico_responsavel, ''))",
      filters.responsaveisTecnicos
    );
    this.adicionarFiltroLista(query, "LOWER(COALESCE(cb.status, ''))", filters.situacoesCadastro);
    this.adicionarFiltroLista(query, "LOWER(COALESCE(cb.sexo_biologico, ''))", filters.generos);
    this.adicionarFiltroFaixaEtaria(query, filters.faixasEtarias, "cb");

    if (filters.familiaBeneficiario) {
      query.params.push(`%${filters.familiaBeneficiario.trim().toLocaleLowerCase("pt-BR")}%`);
      const posicao = query.params.length;
      query.conditions.push(
        `(
          LOWER(COALESCE(vf.nome_familia, '')) LIKE $${posicao}
          OR LOWER(COALESCE(cb.nome_completo, '')) LIKE $${posicao}
        )`
      );
    }

    if (filters.tecnicoUsuario) {
      query.params.push(`%${filters.tecnicoUsuario.trim().toLocaleLowerCase("pt-BR")}%`);
      const posicao = query.params.length;
      query.conditions.push(`LOWER(COALESCE(vf.tecnico_responsavel, '')) LIKE $${posicao}`);
    }

    return query;
  }

  private montarFiltroVisitas(filters: Required<DashboardPowerBiFiltros>) {
    const query = this.criarQuery();
    query.joins.push("LEFT JOIN cadastro_beneficiario cb ON cb.id = vd.beneficiario_id");
    query.joins.push("LEFT JOIN endereco en ON en.id = cb.endereco_id");
    query.joins.push("LEFT JOIN vinculo_familiar vf ON vf.id = cb.familia_id");

    this.adicionarFiltroLista(query, "LOWER(COALESCE(vd.unidade, ''))", filters.unidades);
    this.adicionarFiltroLista(query, "LOWER(COALESCE(vd.tipo_visita, ''))", filters.tiposAtendimento);
    this.adicionarFiltroLista(query, "LOWER(COALESCE(vd.responsavel, ''))", filters.responsaveisTecnicos);
    this.adicionarFiltroLista(query, "LOWER(COALESCE(vd.situacao, ''))", filters.statusAcompanhamento);
    this.adicionarFiltroLista(query, "LOWER(COALESCE(en.cidade, vf.municipio, ''))", filters.municipios);
    this.adicionarFiltroLista(
      query,
      "LOWER(COALESCE(en.bairro, vf.bairro, en.zona, vf.zona, ''))",
      filters.bairros
    );
    this.adicionarFiltroLista(query, "LOWER(COALESCE(cb.status, ''))", filters.situacoesCadastro);
    this.adicionarFiltroLista(query, "LOWER(COALESCE(cb.sexo_biologico, ''))", filters.generos);
    this.adicionarFiltroFaixaEtaria(query, filters.faixasEtarias, "cb");

    if (filters.familiaBeneficiario) {
      query.params.push(`%${filters.familiaBeneficiario.trim().toLocaleLowerCase("pt-BR")}%`);
      const posicao = query.params.length;
      query.conditions.push(
        `(
          LOWER(COALESCE(cb.nome_completo, '')) LIKE $${posicao}
          OR LOWER(COALESCE(vf.nome_familia, '')) LIKE $${posicao}
        )`
      );
    }

    if (filters.tecnicoUsuario) {
      query.params.push(`%${filters.tecnicoUsuario.trim().toLocaleLowerCase("pt-BR")}%`);
      const posicao = query.params.length;
      query.conditions.push(`LOWER(COALESCE(vd.responsavel, '')) LIKE $${posicao}`);
    }

    return query;
  }

  private montarFiltroBeneficios(filters: Required<DashboardPowerBiFiltros>) {
    const query = this.criarQuery();
    query.joins.push("LEFT JOIN cadastro_beneficiario cb ON cb.id = dr.beneficiario_id");
    query.joins.push("LEFT JOIN vinculo_familiar vf ON vf.id = dr.vinculo_familiar_id");
    query.joins.push("LEFT JOIN endereco en ON en.id = cb.endereco_id");

    this.adicionarFiltroLista(query, "LOWER(COALESCE(dr.tipo_doacao, ''))", filters.programas);
    this.adicionarFiltroLista(query, "LOWER(COALESCE(en.cidade, vf.municipio, ''))", filters.municipios);
    this.adicionarFiltroLista(
      query,
      "LOWER(COALESCE(en.bairro, vf.bairro, en.zona, vf.zona, ''))",
      filters.bairros
    );
    this.adicionarFiltroLista(query, "LOWER(COALESCE(cb.status, ''))", filters.situacoesCadastro);
    this.adicionarFiltroLista(query, "LOWER(COALESCE(cb.sexo_biologico, ''))", filters.generos);
    this.adicionarFiltroFaixaEtaria(query, filters.faixasEtarias, "cb");

    if (filters.familiaBeneficiario) {
      query.params.push(`%${filters.familiaBeneficiario.trim().toLocaleLowerCase("pt-BR")}%`);
      const posicao = query.params.length;
      query.conditions.push(
        `(
          LOWER(COALESCE(cb.nome_completo, '')) LIKE $${posicao}
          OR LOWER(COALESCE(vf.nome_familia, '')) LIKE $${posicao}
        )`
      );
    }

    if (filters.tecnicoUsuario) {
      query.params.push(`%${filters.tecnicoUsuario.trim().toLocaleLowerCase("pt-BR")}%`);
      const posicao = query.params.length;
      query.conditions.push(`LOWER(COALESCE(dr.responsavel, '')) LIKE $${posicao}`);
    }

    return query;
  }

  private montarFiltroEncaminhamentos(filters: Required<DashboardPowerBiFiltros>) {
    const query = this.criarQuery();
    query.joins.push("LEFT JOIN banco_empregos be ON be.id = bee.emprego_id");
    query.joins.push("LEFT JOIN cadastro_beneficiario cb ON cb.id = bee.beneficiario_id");
    query.joins.push("LEFT JOIN vinculo_familiar vf ON vf.id = cb.familia_id");
    query.joins.push("LEFT JOIN endereco en ON en.id = cb.endereco_id");

    this.adicionarFiltroLista(query, "LOWER(COALESCE(be.nome_empresa, ''))", filters.unidades);
    this.adicionarFiltroLista(
      query,
      "LOWER(COALESCE(be.area, be.tipo, ''))",
      [...filters.origensEncaminhamento, ...filters.programas]
    );
    this.adicionarFiltroLista(query, "LOWER(COALESCE(en.cidade, vf.municipio, be.cidade, ''))", filters.municipios);
    this.adicionarFiltroLista(
      query,
      "LOWER(COALESCE(en.bairro, vf.bairro, be.bairro, vf.zona, en.zona, ''))",
      filters.bairros
    );
    this.adicionarFiltroLista(query, "LOWER(COALESCE(bee.status, ''))", filters.statusAcompanhamento);
    this.adicionarFiltroLista(query, "LOWER(COALESCE(be.responsavel, ''))", filters.responsaveisTecnicos);

    if (filters.familiaBeneficiario) {
      query.params.push(`%${filters.familiaBeneficiario.trim().toLocaleLowerCase("pt-BR")}%`);
      const posicao = query.params.length;
      query.conditions.push(
        `(
          LOWER(COALESCE(bee.beneficiario_nome, '')) LIKE $${posicao}
          OR LOWER(COALESCE(cb.nome_completo, '')) LIKE $${posicao}
          OR LOWER(COALESCE(vf.nome_familia, '')) LIKE $${posicao}
        )`
      );
    }

    if (filters.tecnicoUsuario) {
      query.params.push(`%${filters.tecnicoUsuario.trim().toLocaleLowerCase("pt-BR")}%`);
      const posicao = query.params.length;
      query.conditions.push(`LOWER(COALESCE(be.responsavel, '')) LIKE $${posicao}`);
    }

    return query;
  }

  private montarFiltroProjetos(filters: Required<DashboardPowerBiFiltros>) {
    const query = this.criarQuery();
    this.adicionarFiltroLista(
      query,
      "LOWER(COALESCE(ca.instituicao_parceira, ca.nome, ''))",
      filters.unidades
    );
    this.adicionarFiltroLista(query, "LOWER(COALESCE(ca.nome, ca.tipo, ''))", filters.programas);
    this.adicionarFiltroLista(query, "LOWER(COALESCE(ca.profissional, ''))", filters.responsaveisTecnicos);
    return query;
  }

  private criarQuery(): QueryBuilder {
    return { joins: [], conditions: [], params: [] };
  }

  private adicionarFiltroPeriodo(query: QueryBuilder, coluna: string, startDate?: string, endDate?: string) {
    if (startDate) {
      query.params.push(startDate);
      query.conditions.push(`CAST(${coluna} AS date) >= $${query.params.length}`);
    }
    if (endDate) {
      query.params.push(endDate);
      query.conditions.push(`CAST(${coluna} AS date) <= $${query.params.length}`);
    }
  }

  private adicionarFiltroLista(query: QueryBuilder, expressao: string, valores: string[]) {
    if (!valores.length) return;
    query.params.push(valores.map((item) => item.trim().toLocaleLowerCase("pt-BR")));
    query.conditions.push(`${expressao} = ANY($${query.params.length}::text[])`);
  }

  private adicionarFiltroFaixaEtaria(query: QueryBuilder, valores: string[], alias: string) {
    if (!valores.length) return;
    query.params.push(valores.map((item) => item.trim()));
    query.conditions.push(`${this.sqlFaixaEtaria(alias)} = ANY($${query.params.length}::text[])`);
  }

  private sqlFaixaEtaria(alias: string) {
    return `
      CASE
        WHEN ${alias}.data_nascimento IS NULL THEN 'Nao informado'
        WHEN DATE_PART('year', AGE(CURRENT_DATE, ${alias}.data_nascimento)) <= 12 THEN '0-12 anos'
        WHEN DATE_PART('year', AGE(CURRENT_DATE, ${alias}.data_nascimento)) <= 17 THEN '13-17 anos'
        WHEN DATE_PART('year', AGE(CURRENT_DATE, ${alias}.data_nascimento)) <= 29 THEN '18-29 anos'
        WHEN DATE_PART('year', AGE(CURRENT_DATE, ${alias}.data_nascimento)) <= 59 THEN '30-59 anos'
        ELSE '60+ anos'
      END
    `;
  }

  private whereSql(conditions: string[]) {
    if (!conditions.length) return "";
    return `WHERE ${conditions.join("\n  AND ")}`;
  }

  private async listarOpcoesComContagem(sql: string, params: unknown[]) {
    const rows = await this.consultarRows<{ nome: string | null; total: unknown }>(sql, params);
    return rows.map((row) => ({
      value: row.nome ?? "",
      label: capitalizar(row.nome ?? ""),
      total: toNumber(row.total)
    }));
  }

  private async listarValoresNomeados(sql: string, params: unknown[]) {
    const rows = await this.consultarRows<ValorNomeRow>(sql, params);
    return rows.map<DashboardPowerBiValorNomeado>((row) => ({
      nome: capitalizar(row.nome ?? "Nao informado"),
      valor: toNumber(row.valor),
      descricao: row.descricao ?? undefined
    }));
  }

  private async listarSeriesMensais(sql: string, params: unknown[]) {
    const rows = await this.consultarRows<SerieRow>(sql, params);
    return rows.map<DashboardPowerBiSerie>((row) => {
      const base = row.label ?? "";
      const [ano, mes] = base.split("-");
      return {
        label: ano && mes ? toDateLabel(new Date(Date.UTC(Number(ano), Number(mes) - 1, 1))) : capitalizar(base),
        valor: toNumber(row.valor)
      };
    });
  }

  private async consultarTotal(sql: string, params: unknown[]) {
    const rows = await this.consultarRows<TotalRow>(sql, params);
    return toNumber(rows[0]?.total);
  }

  private async consultarRows<T>(sql: string, params: unknown[]) {
    try {
      return await prisma.$queryRawUnsafe<T[]>(sql, ...params);
    } catch (error) {
      console.warn("[dashboard/power-bi] Falha ao executar consulta.", error);
      return [] as T[];
    }
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
}
