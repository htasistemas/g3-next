import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import type {
  GeoDetailResponse,
  GeoEntityType,
  GeoFilterOptionsResponse,
  GeoManualPointInput,
  GeoManualPointResponse
} from "../dashboard-georreferenciamento.types.js";

type AuthUser = {
  id?: string;
  nomeUsuario?: string;
  permissoes?: string[];
};

type DiagnosticoRow = {
  beneficiarios_total: number | bigint;
  beneficiarios_geo: number | bigint;
  familias_total: number | bigint;
  familias_ref_geo: number | bigint;
  familias_endereco_proprio: number | bigint;
  voluntarios_total: number | bigint;
  voluntarios_geo: number | bigint;
  profissionais_total: number | bigint;
  profissionais_geo: number | bigint;
  instituicoes_total: number | bigint;
  instituicoes_geo: number | bigint;
  doadores_total: number | bigint;
  doadores_geo: number | bigint;
};

export type TerritorialLocationRow = {
  id: bigint;
  entidade_tipo: GeoEntityType;
  entidade_id: bigint;
  origem: string;
  latitude: Prisma.Decimal | number;
  longitude: Prisma.Decimal | number;
  logradouro: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  regiao: string | null;
  endereco_referencia: string | null;
  observacoes: string | null;
  ativo: boolean;
};

export type ManualPointRow = {
  id: bigint;
  categoria: string;
  titulo: string;
  descricao: string | null;
  entidade_tipo: GeoEntityType | null;
  entidade_id: bigint | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  regiao: string | null;
  logradouro: string | null;
  numero: string | null;
  telefone: string | null;
  situacao_resumo: string | null;
  programa_servico: string | null;
  unidade_referencia: string | null;
  status: string | null;
  ocorrencia_violencia: boolean;
  situacao_vulnerabilidade: boolean;
  necessidade_cesta: boolean;
  ponto_distribuicao: boolean;
  latitude: Prisma.Decimal | number;
  longitude: Prisma.Decimal | number;
  ativo: boolean;
  criado_em: Date | string;
  atualizado_em: Date | string;
};

export type PendingAddressRow = {
  origem: "ENDERECO" | "TERRITORIAL";
  tipo: string;
  entidade_tipo: GeoEntityType;
  entidade_id: bigint;
  endereco_id: bigint | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
};

const estruturaSql = [
  `
  CREATE TABLE IF NOT EXISTS territorial_localizacao (
    id BIGSERIAL PRIMARY KEY,
    entidade_tipo VARCHAR(40) NOT NULL,
    entidade_id BIGINT NOT NULL,
    origem VARCHAR(20) NOT NULL DEFAULT 'GEOCODIFICADA',
    latitude NUMERIC(10, 6) NOT NULL,
    longitude NUMERIC(10, 6) NOT NULL,
    logradouro VARCHAR(200),
    numero VARCHAR(20),
    bairro VARCHAR(150),
    cidade VARCHAR(150),
    uf VARCHAR(2),
    regiao VARCHAR(150),
    endereco_referencia TEXT,
    observacoes TEXT,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    corrigido_manual BOOLEAN NOT NULL DEFAULT FALSE,
    atualizado_por_usuario_id BIGINT,
    atualizado_por_nome VARCHAR(120),
    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT territorial_localizacao_unique UNIQUE (entidade_tipo, entidade_id)
  )
  `,
  `
  CREATE TABLE IF NOT EXISTS territorial_localizacao_auditoria (
    id BIGSERIAL PRIMARY KEY,
    localizacao_id BIGINT,
    entidade_tipo VARCHAR(40) NOT NULL,
    entidade_id BIGINT NOT NULL,
    acao VARCHAR(40) NOT NULL,
    dados_antes JSONB,
    dados_depois JSONB,
    usuario_id BIGINT,
    usuario_nome VARCHAR(120),
    criado_em TIMESTAMP NOT NULL DEFAULT NOW()
  )
  `,
  `
  CREATE TABLE IF NOT EXISTS territorial_ponto_manual (
    id BIGSERIAL PRIMARY KEY,
    categoria VARCHAR(40) NOT NULL,
    titulo VARCHAR(200) NOT NULL,
    descricao TEXT,
    entidade_tipo VARCHAR(40),
    entidade_id BIGINT,
    bairro VARCHAR(150),
    cidade VARCHAR(150),
    uf VARCHAR(2),
    regiao VARCHAR(150),
    logradouro VARCHAR(200),
    numero VARCHAR(20),
    telefone VARCHAR(30),
    situacao_resumo VARCHAR(200),
    programa_servico VARCHAR(200),
    unidade_referencia VARCHAR(150),
    status VARCHAR(60),
    ocorrencia_violencia BOOLEAN NOT NULL DEFAULT FALSE,
    situacao_vulnerabilidade BOOLEAN NOT NULL DEFAULT FALSE,
    necessidade_cesta BOOLEAN NOT NULL DEFAULT FALSE,
    ponto_distribuicao BOOLEAN NOT NULL DEFAULT FALSE,
    latitude NUMERIC(10, 6) NOT NULL,
    longitude NUMERIC(10, 6) NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_por_usuario_id BIGINT,
    criado_por_nome VARCHAR(120),
    atualizado_por_usuario_id BIGINT,
    atualizado_por_nome VARCHAR(120),
    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
  )
  `,
  `
  CREATE TABLE IF NOT EXISTS territorial_ponto_manual_auditoria (
    id BIGSERIAL PRIMARY KEY,
    ponto_manual_id BIGINT NOT NULL,
    acao VARCHAR(40) NOT NULL,
    dados_antes JSONB,
    dados_depois JSONB,
    usuario_id BIGINT,
    usuario_nome VARCHAR(120),
    criado_em TIMESTAMP NOT NULL DEFAULT NOW()
  )
  `,
  `
  CREATE TABLE IF NOT EXISTS territorial_geocoding_log (
    id BIGSERIAL PRIMARY KEY,
    entidade_tipo VARCHAR(40) NOT NULL,
    entidade_id BIGINT NOT NULL,
    origem VARCHAR(20) NOT NULL,
    endereco_referencia TEXT,
    status VARCHAR(20) NOT NULL,
    mensagem TEXT,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW()
  )
  `,
  "CREATE INDEX IF NOT EXISTS territorial_localizacao_geo_idx ON territorial_localizacao(latitude, longitude)",
  "CREATE INDEX IF NOT EXISTS territorial_localizacao_bairro_idx ON territorial_localizacao(bairro)",
  "CREATE INDEX IF NOT EXISTS territorial_localizacao_regiao_idx ON territorial_localizacao(regiao)",
  "CREATE INDEX IF NOT EXISTS territorial_localizacao_entidade_idx ON territorial_localizacao(entidade_tipo, entidade_id)",
  "CREATE INDEX IF NOT EXISTS territorial_ponto_manual_geo_idx ON territorial_ponto_manual(latitude, longitude)",
  "CREATE INDEX IF NOT EXISTS territorial_ponto_manual_categoria_idx ON territorial_ponto_manual(categoria)",
  "CREATE INDEX IF NOT EXISTS territorial_geocoding_log_entidade_idx ON territorial_geocoding_log(entidade_tipo, entidade_id)",
  "CREATE INDEX IF NOT EXISTS endereco_geo_idx ON endereco(latitude, longitude)",
  "CREATE INDEX IF NOT EXISTS endereco_bairro_idx ON endereco(bairro)",
  "CREATE INDEX IF NOT EXISTS endereco_cidade_idx ON endereco(cidade)",
  "CREATE INDEX IF NOT EXISTS cadastro_beneficiario_status_data_idx ON cadastro_beneficiario(status, data_nascimento)",
  "CREATE INDEX IF NOT EXISTS cadastro_beneficiario_endereco_idx ON cadastro_beneficiario(endereco_id)",
  "CREATE INDEX IF NOT EXISTS situacao_social_beneficiario_idx ON situacao_social(beneficiario_id)",
  "CREATE INDEX IF NOT EXISTS vinculo_familiar_status_bairro_idx ON vinculo_familiar(status, bairro, municipio)",
  "CREATE INDEX IF NOT EXISTS cadastro_profissionais_status_idx ON cadastro_profissionais(status, categoria)",
  "CREATE INDEX IF NOT EXISTS cadastro_profissionais_endereco_idx ON cadastro_profissionais(endereco_id)",
  "CREATE INDEX IF NOT EXISTS cadastro_voluntario_status_idx ON cadastro_voluntario(status)",
  "CREATE INDEX IF NOT EXISTS cadastro_voluntario_endereco_idx ON cadastro_voluntario(endereco_id)",
  "CREATE INDEX IF NOT EXISTS unidade_assistencial_endereco_idx ON unidade_assistencial(endereco_id)",
  "CREATE INDEX IF NOT EXISTS doador_bairro_idx ON doador(bairro)",
  "CREATE INDEX IF NOT EXISTS doador_cidade_idx ON doador(cidade)",
  "CREATE INDEX IF NOT EXISTS doacao_realizada_data_idx ON doacao_realizada(data_doacao)",
  "CREATE INDEX IF NOT EXISTS doacao_realizada_beneficiario_idx ON doacao_realizada(beneficiario_id)",
  "CREATE INDEX IF NOT EXISTS doacao_realizada_familia_idx ON doacao_realizada(vinculo_familiar_id)"
];

let estruturaInicializada = false;
let estruturaPendente: Promise<void> | null = null;

function toBigInt(value?: string | bigint | null) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "bigint") return value;
  return BigInt(value);
}

function toNumber(value: Prisma.Decimal | number | null | undefined) {
  if (value === null || value === undefined) return undefined;
  const numero = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numero) ? numero : undefined;
}

function toIsoDate(value: Date | string | null | undefined) {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString();
  const data = new Date(value);
  return Number.isNaN(data.getTime()) ? String(value) : data.toISOString();
}

function montarEnderecoResumo(...partes: Array<string | null | undefined>) {
  return partes
    .map((item) => item?.trim())
    .filter(Boolean)
    .join(", ");
}

function serializarAuditoriaRegistro(
  registro:
    | TerritorialLocationRow
    | ManualPointRow
    | {
        id?: bigint | null;
        [key: string]: unknown;
      }
    | null
) {
  if (!registro) return null;

  return Object.entries(registro).reduce<Prisma.JsonObject>((acc, [key, value]) => {
    if (typeof value === "bigint") {
      acc[key] = value.toString();
      return acc;
    }

    if (value instanceof Date) {
      acc[key] = value.toISOString();
      return acc;
    }

    if (value instanceof Prisma.Decimal) {
      acc[key] = Number(value);
      return acc;
    }

    acc[key] = value as Prisma.JsonValue;
    return acc;
  }, {});
}

async function registrarAuditoriaLocalizacao(
  localizacaoId: bigint | null,
  entidadeTipo: GeoEntityType,
  entidadeId: bigint,
  acao: string,
  dadosAntes: Prisma.JsonObject | null,
  dadosDepois: Prisma.JsonObject | null,
  usuario?: AuthUser
) {
  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO territorial_localizacao_auditoria (
      localizacao_id,
      entidade_tipo,
      entidade_id,
      acao,
      dados_antes,
      dados_depois,
      usuario_id,
      usuario_nome,
      criado_em
    ) VALUES (
      ${localizacaoId},
      ${entidadeTipo},
      ${entidadeId},
      ${acao},
      ${dadosAntes as Prisma.JsonObject | null},
      ${dadosDepois as Prisma.JsonObject | null},
      ${usuario?.id ? BigInt(usuario.id) : null},
      ${usuario?.nomeUsuario ?? null},
      NOW()
    )
  `);
}

async function registrarAuditoriaPontoManual(
  pontoManualId: bigint,
  acao: string,
  dadosAntes: Prisma.JsonObject | null,
  dadosDepois: Prisma.JsonObject | null,
  usuario?: AuthUser
) {
  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO territorial_ponto_manual_auditoria (
      ponto_manual_id,
      acao,
      dados_antes,
      dados_depois,
      usuario_id,
      usuario_nome,
      criado_em
    ) VALUES (
      ${pontoManualId},
      ${acao},
      ${dadosAntes as Prisma.JsonObject | null},
      ${dadosDepois as Prisma.JsonObject | null},
      ${usuario?.id ? BigInt(usuario.id) : null},
      ${usuario?.nomeUsuario ?? null},
      NOW()
    )
  `);
}

export async function ensureDashboardGeorreferenciamentoEstrutura() {
  if (estruturaInicializada) return;
  if (!estruturaPendente) {
    estruturaPendente = (async () => {
      for (const sql of estruturaSql) {
        await prisma.$executeRawUnsafe(sql);
      }
      estruturaInicializada = true;
    })().catch((error) => {
      estruturaPendente = null;
      throw error;
    });
  }

  await estruturaPendente;
}

export class DashboardGeorreferenciamentoRepository {
  private async garantirEstrutura() {
    await ensureDashboardGeorreferenciamentoEstrutura();
  }

  async buscarDiagnostico() {
    await this.garantirEstrutura();

    const rows = await prisma.$queryRaw<DiagnosticoRow[]>(Prisma.sql`
      SELECT
        (SELECT COUNT(*) FROM cadastro_beneficiario)::BIGINT AS beneficiarios_total,
        (
          SELECT COUNT(*)
          FROM cadastro_beneficiario cb
          LEFT JOIN endereco e ON e.id = cb.endereco_id
          LEFT JOIN territorial_localizacao tl
            ON tl.entidade_tipo = 'BENEFICIARIO'
           AND tl.entidade_id = cb.id
           AND tl.ativo = TRUE
          WHERE COALESCE(tl.latitude, e.latitude) IS NOT NULL
            AND COALESCE(tl.longitude, e.longitude) IS NOT NULL
        )::BIGINT AS beneficiarios_geo,
        (SELECT COUNT(*) FROM vinculo_familiar)::BIGINT AS familias_total,
        (
          SELECT COUNT(*)
          FROM vinculo_familiar vf
          LEFT JOIN cadastro_beneficiario ref_b ON ref_b.id = vf.id_referencia_familiar
          LEFT JOIN endereco re ON re.id = ref_b.endereco_id
          LEFT JOIN territorial_localizacao tl
            ON tl.entidade_tipo = 'FAMILIA'
           AND tl.entidade_id = vf.id
           AND tl.ativo = TRUE
          WHERE COALESCE(tl.latitude, re.latitude) IS NOT NULL
            AND COALESCE(tl.longitude, re.longitude) IS NOT NULL
        )::BIGINT AS familias_ref_geo,
        (
          SELECT COUNT(*)
          FROM vinculo_familiar vf
          WHERE COALESCE(TRIM(vf.logradouro), '') <> ''
             OR COALESCE(TRIM(vf.bairro), '') <> ''
             OR COALESCE(TRIM(vf.municipio), '') <> ''
        )::BIGINT AS familias_endereco_proprio,
        (SELECT COUNT(*) FROM cadastro_voluntario)::BIGINT AS voluntarios_total,
        (
          SELECT COUNT(*)
          FROM cadastro_voluntario v
          LEFT JOIN endereco e ON e.id = v.endereco_id
          LEFT JOIN territorial_localizacao tl
            ON tl.entidade_tipo = 'VOLUNTARIO'
           AND tl.entidade_id = v.id
           AND tl.ativo = TRUE
          WHERE COALESCE(tl.latitude, e.latitude) IS NOT NULL
            AND COALESCE(tl.longitude, e.longitude) IS NOT NULL
        )::BIGINT AS voluntarios_geo,
        (SELECT COUNT(*) FROM cadastro_profissionais)::BIGINT AS profissionais_total,
        (
          SELECT COUNT(*)
          FROM cadastro_profissionais p
          LEFT JOIN endereco e ON e.id = p.endereco_id
          LEFT JOIN territorial_localizacao tl
            ON tl.entidade_tipo = 'PROFISSIONAL'
           AND tl.entidade_id = p.id
           AND tl.ativo = TRUE
          WHERE COALESCE(tl.latitude, e.latitude) IS NOT NULL
            AND COALESCE(tl.longitude, e.longitude) IS NOT NULL
        )::BIGINT AS profissionais_geo,
        (SELECT COUNT(*) FROM unidade_assistencial)::BIGINT AS instituicoes_total,
        (
          SELECT COUNT(*)
          FROM unidade_assistencial u
          LEFT JOIN endereco e ON e.id = u.endereco_id
          LEFT JOIN territorial_localizacao tl
            ON tl.entidade_tipo = 'INSTITUICAO'
           AND tl.entidade_id = u.id
           AND tl.ativo = TRUE
          WHERE COALESCE(tl.latitude, e.latitude) IS NOT NULL
            AND COALESCE(tl.longitude, e.longitude) IS NOT NULL
        )::BIGINT AS instituicoes_geo,
        (SELECT COUNT(*) FROM doador)::BIGINT AS doadores_total,
        (
          SELECT COUNT(*)
          FROM doador d
          LEFT JOIN territorial_localizacao tl
            ON tl.entidade_tipo = 'DOADOR'
           AND tl.entidade_id = d.id
           AND tl.ativo = TRUE
          WHERE tl.latitude IS NOT NULL
            AND tl.longitude IS NOT NULL
        )::BIGINT AS doadores_geo
    `);

    const item = rows[0];
    return {
      beneficiariosTotal: Number(item?.beneficiarios_total ?? 0),
      beneficiariosGeolocalizados: Number(item?.beneficiarios_geo ?? 0),
      familiasTotal: Number(item?.familias_total ?? 0),
      familiasComReferenciaGeolocalizada: Number(item?.familias_ref_geo ?? 0),
      familiasComEnderecoProprio: Number(item?.familias_endereco_proprio ?? 0),
      voluntariosTotal: Number(item?.voluntarios_total ?? 0),
      voluntariosGeolocalizados: Number(item?.voluntarios_geo ?? 0),
      profissionaisTotal: Number(item?.profissionais_total ?? 0),
      profissionaisGeolocalizados: Number(item?.profissionais_geo ?? 0),
      instituicoesTotal: Number(item?.instituicoes_total ?? 0),
      instituicoesGeolocalizadas: Number(item?.instituicoes_geo ?? 0),
      doadoresTotal: Number(item?.doadores_total ?? 0),
      doadoresGeolocalizados: Number(item?.doadores_geo ?? 0)
    };
  }

  async listarOpcoesFiltros(): Promise<GeoFilterOptionsResponse> {
    await this.garantirEstrutura();
    const [bairrosRows, regioesRows, sexoRows, vulnerabilidadeRows, unidadeRows, statusRows, diagnostico] =
      await Promise.all([
        prisma.$queryRaw<Array<{ valor: string }>>(Prisma.sql`
          SELECT DISTINCT valor
          FROM (
            SELECT TRIM(bairro) AS valor FROM endereco
            UNION
            SELECT TRIM(bairro) AS valor FROM vinculo_familiar
            UNION
            SELECT TRIM(bairro) AS valor FROM doador
            UNION
            SELECT TRIM(bairro) AS valor FROM territorial_localizacao
            UNION
            SELECT TRIM(bairro) AS valor FROM territorial_ponto_manual
          ) base
          WHERE COALESCE(valor, '') <> ''
          ORDER BY valor ASC
        `),
        prisma.$queryRaw<Array<{ valor: string }>>(Prisma.sql`
          SELECT DISTINCT valor
          FROM (
            SELECT NULLIF(TRIM(CONCAT_WS(' / ', zona, subzona)), '') AS valor FROM endereco
            UNION
            SELECT TRIM(zona) AS valor FROM vinculo_familiar
            UNION
            SELECT TRIM(regiao) AS valor FROM territorial_localizacao
            UNION
            SELECT TRIM(regiao) AS valor FROM territorial_ponto_manual
          ) base
          WHERE COALESCE(valor, '') <> ''
          ORDER BY valor ASC
        `),
        prisma.$queryRaw<Array<{ valor: string }>>(Prisma.sql`
          SELECT DISTINCT valor
          FROM (
            SELECT TRIM(sexo_biologico) AS valor FROM cadastro_beneficiario
            UNION
            SELECT TRIM(sexo_biologico) AS valor FROM cadastro_profissionais
            UNION
            SELECT TRIM(genero) AS valor FROM cadastro_voluntario
          ) base
          WHERE COALESCE(valor, '') <> ''
          ORDER BY valor ASC
        `),
        prisma.$queryRaw<Array<{ valor: string }>>(Prisma.sql`
          SELECT DISTINCT valor
          FROM (
            SELECT TRIM(situacao_vulnerabilidade) AS valor FROM situacao_social
            UNION
            SELECT TRIM(vulnerabilidades_familia) AS valor FROM vinculo_familiar
          ) base
          WHERE COALESCE(valor, '') <> ''
          ORDER BY valor ASC
        `),
        prisma.$queryRaw<Array<{ valor: string }>>(Prisma.sql`
          SELECT DISTINCT valor
          FROM (
            SELECT TRIM(nome_fantasia) AS valor FROM unidade_assistencial
            UNION
            SELECT TRIM(unidade_referencia) AS valor FROM territorial_ponto_manual
          ) base
          WHERE COALESCE(valor, '') <> ''
          ORDER BY valor ASC
        `),
        prisma.$queryRaw<Array<{ valor: string }>>(Prisma.sql`
          SELECT DISTINCT valor
          FROM (
            SELECT TRIM(status) AS valor FROM cadastro_beneficiario
            UNION
            SELECT TRIM(status) AS valor FROM vinculo_familiar
            UNION
            SELECT TRIM(status) AS valor FROM cadastro_profissionais
            UNION
            SELECT TRIM(status) AS valor FROM cadastro_voluntario
            UNION
            SELECT TRIM(status) AS valor FROM territorial_ponto_manual
          ) base
          WHERE COALESCE(valor, '') <> ''
          ORDER BY valor ASC
        `),
        this.buscarDiagnostico()
      ]);

    return {
      bairros: bairrosRows.map((item) => item.valor),
      microterritorios: regioesRows.map((item) => item.valor),
      sexos: sexoRows.map((item) => item.valor),
      vulnerabilidades: vulnerabilidadeRows.map((item) => item.valor),
      unidadesReferencia: unidadeRows.map((item) => item.valor),
      statuses: statusRows.map((item) => item.valor),
      camadas: [
        { id: "beneficiarios", label: "Beneficiários", descricao: "Cadastros individuais geolocalizados." },
        { id: "familias", label: "Famílias", descricao: "Famílias e seus territórios de referência." },
        { id: "voluntarios", label: "Voluntários", descricao: "Base de voluntariado por território." },
        { id: "profissionais", label: "Profissionais", descricao: "Equipes e áreas de atuação no território." },
        { id: "instituicoes", label: "Instituições", descricao: "Unidades e parceiros institucionais." },
        { id: "doadores", label: "Doadores", descricao: "Doadores com localização validada." },
        { id: "pontos_distribuicao", label: "Pontos de distribuição", descricao: "Entrega e distribuição territorial." },
        { id: "demandas_territoriais", label: "Demandas territoriais", descricao: "Pontos manuais e demandas cadastradas." },
        { id: "vulnerabilidade", label: "Vulnerabilidade", descricao: "Casos e territórios com maior vulnerabilidade." },
        { id: "violencia", label: "Violência", descricao: "Ocorrências e registros sensíveis territorializados." }
      ],
      diagnostico: {
        ...diagnostico,
        problemasAtuais: [
          "A tela antiga não consultava beneficiários como camada própria.",
          "A tela antiga dependia do endereço do beneficiário de referência para posicionar famílias.",
          "A tela antiga carregava listas completas sem bbox, zoom ou agregação."
        ]
      }
    };
  }

  async listarLocalizacoesAtivas() {
    await this.garantirEstrutura();
    return prisma.$queryRaw<TerritorialLocationRow[]>(Prisma.sql`
      SELECT
        id,
        entidade_tipo,
        entidade_id,
        origem,
        latitude,
        longitude,
        logradouro,
        numero,
        bairro,
        cidade,
        uf,
        regiao,
        endereco_referencia,
        observacoes,
        ativo
      FROM territorial_localizacao
      WHERE ativo = TRUE
    `);
  }

  async listarPontosManuaisAtivos() {
    await this.garantirEstrutura();
    return prisma.$queryRaw<ManualPointRow[]>(Prisma.sql`
      SELECT
        id,
        categoria,
        titulo,
        descricao,
        entidade_tipo,
        entidade_id,
        bairro,
        cidade,
        uf,
        regiao,
        logradouro,
        numero,
        telefone,
        situacao_resumo,
        programa_servico,
        unidade_referencia,
        status,
        ocorrencia_violencia,
        situacao_vulnerabilidade,
        necessidade_cesta,
        ponto_distribuicao,
        latitude,
        longitude,
        ativo,
        criado_em,
        atualizado_em
      FROM territorial_ponto_manual
      WHERE ativo = TRUE
      ORDER BY atualizado_em DESC, id DESC
    `);
  }

  async buscarPontoManualDetalhe(id: bigint) {
    const rows = await prisma.$queryRaw<ManualPointRow[]>(Prisma.sql`
      SELECT
        id,
        categoria,
        titulo,
        descricao,
        entidade_tipo,
        entidade_id,
        bairro,
        cidade,
        uf,
        regiao,
        logradouro,
        numero,
        telefone,
        situacao_resumo,
        programa_servico,
        unidade_referencia,
        status,
        ocorrencia_violencia,
        situacao_vulnerabilidade,
        necessidade_cesta,
        ponto_distribuicao,
        latitude,
        longitude,
        ativo,
        criado_em,
        atualizado_em
      FROM territorial_ponto_manual
      WHERE id = ${id}
      LIMIT 1
    `);

    return rows[0] ?? null;
  }

  async contarPendenciasGeocodificacao() {
    await this.garantirEstrutura();
    const rows = await prisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`
      SELECT COUNT(*)::BIGINT AS total
      FROM (
        SELECT e.id
        FROM endereco e
        WHERE (e.latitude IS NULL OR e.longitude IS NULL)
          AND COALESCE(TRIM(e.cidade), '') <> ''
          AND (
            COALESCE(TRIM(e.logradouro), '') <> ''
            OR COALESCE(TRIM(e.bairro), '') <> ''
            OR COALESCE(TRIM(e.cep), '') <> ''
          )
          AND EXISTS (
            SELECT 1
            FROM cadastro_beneficiario cb
            WHERE cb.endereco_id = e.id
            UNION ALL
            SELECT 1
            FROM cadastro_profissionais cp
            WHERE cp.endereco_id = e.id
            UNION ALL
            SELECT 1
            FROM cadastro_voluntario cv
            WHERE cv.endereco_id = e.id
            UNION ALL
            SELECT 1
            FROM unidade_assistencial ua
            WHERE ua.endereco_id = e.id
          )
        UNION ALL
        SELECT vf.id
        FROM vinculo_familiar vf
        LEFT JOIN territorial_localizacao tl
          ON tl.entidade_tipo = 'FAMILIA'
         AND tl.entidade_id = vf.id
         AND tl.ativo = TRUE
        WHERE tl.id IS NULL
          AND COALESCE(TRIM(vf.municipio), '') <> ''
          AND (
            COALESCE(TRIM(vf.logradouro), '') <> ''
            OR COALESCE(TRIM(vf.bairro), '') <> ''
            OR COALESCE(TRIM(vf.cep), '') <> ''
          )
        UNION ALL
        SELECT d.id
        FROM doador d
        LEFT JOIN territorial_localizacao tl
          ON tl.entidade_tipo = 'DOADOR'
         AND tl.entidade_id = d.id
         AND tl.ativo = TRUE
        WHERE tl.id IS NULL
          AND COALESCE(TRIM(d.cidade), '') <> ''
          AND (
            COALESCE(TRIM(d.logradouro), '') <> ''
            OR COALESCE(TRIM(d.bairro), '') <> ''
            OR COALESCE(TRIM(d.cep), '') <> ''
          )
      ) pendencias
    `);

    return Number(rows[0]?.total ?? 0n);
  }

  async listarPendenciasGeocodificacao(limit = 20): Promise<PendingAddressRow[]> {
    await this.garantirEstrutura();
    return prisma.$queryRaw<PendingAddressRow[]>(Prisma.sql`
      SELECT *
      FROM (
        SELECT
          'ENDERECO'::text AS origem,
          'BENEFICIARIO'::text AS tipo,
          'BENEFICIARIO'::varchar(40) AS entidade_tipo,
          cb.id AS entidade_id,
          e.id AS endereco_id,
          e.cep,
          e.logradouro,
          e.numero,
          e.bairro,
          e.cidade,
          e.estado AS uf
        FROM endereco e
        INNER JOIN cadastro_beneficiario cb ON cb.endereco_id = e.id
        WHERE (e.latitude IS NULL OR e.longitude IS NULL)
          AND COALESCE(TRIM(e.cidade), '') <> ''
          AND (
            COALESCE(TRIM(e.logradouro), '') <> ''
            OR COALESCE(TRIM(e.bairro), '') <> ''
            OR COALESCE(TRIM(e.cep), '') <> ''
          )

        UNION ALL

        SELECT
          'ENDERECO'::text AS origem,
          'PROFISSIONAL'::text AS tipo,
          'PROFISSIONAL'::varchar(40) AS entidade_tipo,
          cp.id AS entidade_id,
          e.id AS endereco_id,
          e.cep,
          e.logradouro,
          e.numero,
          e.bairro,
          e.cidade,
          e.estado AS uf
        FROM endereco e
        INNER JOIN cadastro_profissionais cp ON cp.endereco_id = e.id
        WHERE (e.latitude IS NULL OR e.longitude IS NULL)
          AND COALESCE(TRIM(e.cidade), '') <> ''
          AND (
            COALESCE(TRIM(e.logradouro), '') <> ''
            OR COALESCE(TRIM(e.bairro), '') <> ''
            OR COALESCE(TRIM(e.cep), '') <> ''
          )

        UNION ALL

        SELECT
          'ENDERECO'::text AS origem,
          'VOLUNTARIO'::text AS tipo,
          'VOLUNTARIO'::varchar(40) AS entidade_tipo,
          cv.id AS entidade_id,
          e.id AS endereco_id,
          e.cep,
          e.logradouro,
          e.numero,
          e.bairro,
          e.cidade,
          e.estado AS uf
        FROM endereco e
        INNER JOIN cadastro_voluntario cv ON cv.endereco_id = e.id
        WHERE (e.latitude IS NULL OR e.longitude IS NULL)
          AND COALESCE(TRIM(e.cidade), '') <> ''
          AND (
            COALESCE(TRIM(e.logradouro), '') <> ''
            OR COALESCE(TRIM(e.bairro), '') <> ''
            OR COALESCE(TRIM(e.cep), '') <> ''
          )

        UNION ALL

        SELECT
          'ENDERECO'::text AS origem,
          'INSTITUICAO'::text AS tipo,
          'INSTITUICAO'::varchar(40) AS entidade_tipo,
          ua.id AS entidade_id,
          e.id AS endereco_id,
          e.cep,
          e.logradouro,
          e.numero,
          e.bairro,
          e.cidade,
          e.estado AS uf
        FROM endereco e
        INNER JOIN unidade_assistencial ua ON ua.endereco_id = e.id
        WHERE (e.latitude IS NULL OR e.longitude IS NULL)
          AND COALESCE(TRIM(e.cidade), '') <> ''
          AND (
            COALESCE(TRIM(e.logradouro), '') <> ''
            OR COALESCE(TRIM(e.bairro), '') <> ''
            OR COALESCE(TRIM(e.cep), '') <> ''
          )

        UNION ALL

        SELECT
          'TERRITORIAL'::text AS origem,
          'FAMILIA'::text AS tipo,
          'FAMILIA'::varchar(40) AS entidade_tipo,
          vf.id AS entidade_id,
          NULL::bigint AS endereco_id,
          vf.cep,
          vf.logradouro,
          vf.numero,
          vf.bairro,
          vf.municipio AS cidade,
          vf.uf
        FROM vinculo_familiar vf
        LEFT JOIN territorial_localizacao tl
          ON tl.entidade_tipo = 'FAMILIA'
         AND tl.entidade_id = vf.id
         AND tl.ativo = TRUE
        WHERE tl.id IS NULL
          AND COALESCE(TRIM(vf.municipio), '') <> ''
          AND (
            COALESCE(TRIM(vf.logradouro), '') <> ''
            OR COALESCE(TRIM(vf.bairro), '') <> ''
            OR COALESCE(TRIM(vf.cep), '') <> ''
          )

        UNION ALL

        SELECT
          'TERRITORIAL'::text AS origem,
          'DOADOR'::text AS tipo,
          'DOADOR'::varchar(40) AS entidade_tipo,
          d.id AS entidade_id,
          NULL::bigint AS endereco_id,
          d.cep,
          d.logradouro,
          d.numero,
          d.bairro,
          d.cidade,
          d.uf
        FROM doador d
        LEFT JOIN territorial_localizacao tl
          ON tl.entidade_tipo = 'DOADOR'
         AND tl.entidade_id = d.id
         AND tl.ativo = TRUE
        WHERE tl.id IS NULL
          AND COALESCE(TRIM(d.cidade), '') <> ''
          AND (
            COALESCE(TRIM(d.logradouro), '') <> ''
            OR COALESCE(TRIM(d.bairro), '') <> ''
            OR COALESCE(TRIM(d.cep), '') <> ''
          )
      ) pendencias
      ORDER BY tipo ASC, entidade_id ASC
      LIMIT ${Math.max(1, Math.min(limit, 100))}
    `);
  }

  async registrarLogGeocoding(
    entidadeTipo: GeoEntityType,
    entidadeId: bigint,
    origem: string,
    enderecoReferencia: string,
    status: "SUCESSO" | "NAO_ENCONTRADO" | "FALHA",
    mensagem?: string
  ) {
    await this.garantirEstrutura();
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO territorial_geocoding_log (
        entidade_tipo,
        entidade_id,
        origem,
        endereco_referencia,
        status,
        mensagem,
        criado_em
      ) VALUES (
        ${entidadeTipo},
        ${entidadeId},
        ${origem},
        ${enderecoReferencia},
        ${status},
        ${mensagem ?? null},
        NOW()
      )
    `);
  }

  async aplicarCoordenadasGeocodificadas(
    pendencia: PendingAddressRow,
    latitude: number,
    longitude: number,
    usuario?: AuthUser
  ) {
    await this.garantirEstrutura();

    if (pendencia.origem === "ENDERECO" && pendencia.endereco_id) {
      await prisma.endereco.update({
        where: { id: pendencia.endereco_id },
        data: {
          latitude: new Prisma.Decimal(latitude),
          longitude: new Prisma.Decimal(longitude)
        }
      });
      return;
    }

    const existente = await prisma.$queryRaw<TerritorialLocationRow[]>(Prisma.sql`
      SELECT
        id,
        entidade_tipo,
        entidade_id,
        origem,
        latitude,
        longitude,
        logradouro,
        numero,
        bairro,
        cidade,
        uf,
        regiao,
        endereco_referencia,
        observacoes,
        ativo
      FROM territorial_localizacao
      WHERE entidade_tipo = ${pendencia.entidade_tipo}
        AND entidade_id = ${pendencia.entidade_id}
      LIMIT 1
    `);

    const enderecoReferencia = montarEnderecoResumo(
      pendencia.logradouro,
      pendencia.numero,
      pendencia.bairro,
      pendencia.cidade,
      pendencia.uf
    );

    if (existente[0]) {
      await prisma.$executeRaw(Prisma.sql`
        UPDATE territorial_localizacao
        SET
          origem = 'GEOCODIFICADA',
          latitude = ${new Prisma.Decimal(latitude)},
          longitude = ${new Prisma.Decimal(longitude)},
          logradouro = ${pendencia.logradouro ?? null},
          numero = ${pendencia.numero ?? null},
          bairro = ${pendencia.bairro ?? null},
          cidade = ${pendencia.cidade ?? null},
          uf = ${pendencia.uf ?? null},
          endereco_referencia = ${enderecoReferencia || null},
          ativo = TRUE,
          atualizado_por_usuario_id = ${usuario?.id ? BigInt(usuario.id) : null},
          atualizado_por_nome = ${usuario?.nomeUsuario ?? null},
          atualizado_em = NOW()
        WHERE id = ${existente[0].id}
      `);

      await registrarAuditoriaLocalizacao(
        existente[0].id,
        pendencia.entidade_tipo,
        pendencia.entidade_id,
        "GEOCODIFICACAO_ATUALIZADA",
        serializarAuditoriaRegistro(existente[0]),
        {
          origem: "GEOCODIFICADA",
          latitude,
          longitude,
          logradouro: pendencia.logradouro,
          numero: pendencia.numero,
          bairro: pendencia.bairro,
          cidade: pendencia.cidade,
          uf: pendencia.uf,
          endereco_referencia: enderecoReferencia
        },
        usuario
      );
      return;
    }

    const inserted = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
      INSERT INTO territorial_localizacao (
        entidade_tipo,
        entidade_id,
        origem,
        latitude,
        longitude,
        logradouro,
        numero,
        bairro,
        cidade,
        uf,
        endereco_referencia,
        ativo,
        corrigido_manual,
        atualizado_por_usuario_id,
        atualizado_por_nome,
        criado_em,
        atualizado_em
      ) VALUES (
        ${pendencia.entidade_tipo},
        ${pendencia.entidade_id},
        'GEOCODIFICADA',
        ${new Prisma.Decimal(latitude)},
        ${new Prisma.Decimal(longitude)},
        ${pendencia.logradouro ?? null},
        ${pendencia.numero ?? null},
        ${pendencia.bairro ?? null},
        ${pendencia.cidade ?? null},
        ${pendencia.uf ?? null},
        ${enderecoReferencia || null},
        TRUE,
        FALSE,
        ${usuario?.id ? BigInt(usuario.id) : null},
        ${usuario?.nomeUsuario ?? null},
        NOW(),
        NOW()
      )
      RETURNING id
    `);

    await registrarAuditoriaLocalizacao(
      inserted[0]?.id ?? null,
      pendencia.entidade_tipo,
      pendencia.entidade_id,
      "GEOCODIFICACAO_CRIADA",
      null,
      {
        origem: "GEOCODIFICADA",
        latitude,
        longitude,
        logradouro: pendencia.logradouro,
        numero: pendencia.numero,
        bairro: pendencia.bairro,
        cidade: pendencia.cidade,
        uf: pendencia.uf,
        endereco_referencia: enderecoReferencia
      },
      usuario
    );
  }

  async salvarMarcacaoVinculada(
    input: GeoManualPointInput,
    usuario?: AuthUser
  ): Promise<GeoManualPointResponse> {
    await this.garantirEstrutura();

    if (!input.entidadeTipo || !input.entidadeId) {
      throw new AppError("Entidade vinculada não informada.", 400);
    }

    const entidadeId = toBigInt(input.entidadeId);
    if (!entidadeId) {
      throw new AppError("Entidade vinculada inválida.", 400);
    }

    const existente = await prisma.$queryRaw<TerritorialLocationRow[]>(Prisma.sql`
      SELECT
        id,
        entidade_tipo,
        entidade_id,
        origem,
        latitude,
        longitude,
        logradouro,
        numero,
        bairro,
        cidade,
        uf,
        regiao,
        endereco_referencia,
        observacoes,
        ativo
      FROM territorial_localizacao
      WHERE entidade_tipo = ${input.entidadeTipo}
        AND entidade_id = ${entidadeId}
      LIMIT 1
    `);

    const enderecoReferencia = montarEnderecoResumo(
      input.logradouro,
      input.numero,
      input.bairro,
      input.cidade,
      input.uf
    );

    if (existente[0]) {
      await prisma.$executeRaw(Prisma.sql`
        UPDATE territorial_localizacao
        SET
          origem = 'MANUAL',
          latitude = ${new Prisma.Decimal(input.latitude)},
          longitude = ${new Prisma.Decimal(input.longitude)},
          logradouro = ${input.logradouro ?? null},
          numero = ${input.numero ?? null},
          bairro = ${input.bairro ?? null},
          cidade = ${input.cidade ?? null},
          uf = ${input.uf ?? null},
          regiao = ${input.regiao ?? null},
          endereco_referencia = ${enderecoReferencia || null},
          observacoes = ${input.descricao ?? null},
          ativo = TRUE,
          corrigido_manual = TRUE,
          atualizado_por_usuario_id = ${usuario?.id ? BigInt(usuario.id) : null},
          atualizado_por_nome = ${usuario?.nomeUsuario ?? null},
          atualizado_em = NOW()
        WHERE id = ${existente[0].id}
      `);

      await registrarAuditoriaLocalizacao(
        existente[0].id,
        input.entidadeTipo,
        entidadeId,
        "ATUALIZACAO_MANUAL",
        serializarAuditoriaRegistro(existente[0]),
        {
          origem: "MANUAL",
          latitude: input.latitude,
          longitude: input.longitude,
          logradouro: input.logradouro,
          numero: input.numero,
          bairro: input.bairro,
          cidade: input.cidade,
          uf: input.uf,
          regiao: input.regiao,
          endereco_referencia: enderecoReferencia,
          observacoes: input.descricao
        },
        usuario
      );

      return {
        id: existente[0].id.toString(),
        mensagem: "Localização vinculada atualizada com sucesso."
      };
    }

    const inserted = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
      INSERT INTO territorial_localizacao (
        entidade_tipo,
        entidade_id,
        origem,
        latitude,
        longitude,
        logradouro,
        numero,
        bairro,
        cidade,
        uf,
        regiao,
        endereco_referencia,
        observacoes,
        ativo,
        corrigido_manual,
        atualizado_por_usuario_id,
        atualizado_por_nome,
        criado_em,
        atualizado_em
      ) VALUES (
        ${input.entidadeTipo},
        ${entidadeId},
        'MANUAL',
        ${new Prisma.Decimal(input.latitude)},
        ${new Prisma.Decimal(input.longitude)},
        ${input.logradouro ?? null},
        ${input.numero ?? null},
        ${input.bairro ?? null},
        ${input.cidade ?? null},
        ${input.uf ?? null},
        ${input.regiao ?? null},
        ${enderecoReferencia || null},
        ${input.descricao ?? null},
        TRUE,
        TRUE,
        ${usuario?.id ? BigInt(usuario.id) : null},
        ${usuario?.nomeUsuario ?? null},
        NOW(),
        NOW()
      )
      RETURNING id
    `);

    await registrarAuditoriaLocalizacao(
      inserted[0]?.id ?? null,
      input.entidadeTipo,
      entidadeId,
      "CRIACAO_MANUAL",
      null,
      {
        origem: "MANUAL",
        latitude: input.latitude,
        longitude: input.longitude,
        logradouro: input.logradouro,
        numero: input.numero,
        bairro: input.bairro,
        cidade: input.cidade,
        uf: input.uf,
        regiao: input.regiao,
        endereco_referencia: enderecoReferencia,
        observacoes: input.descricao
      },
      usuario
    );

    return {
      id: inserted[0]?.id?.toString() ?? "",
      mensagem: "Localização vinculada salva com sucesso."
    };
  }

  async criarPontoManual(
    input: GeoManualPointInput,
    usuario?: AuthUser
  ): Promise<GeoManualPointResponse> {
    await this.garantirEstrutura();

    const inserted = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
      INSERT INTO territorial_ponto_manual (
        categoria,
        titulo,
        descricao,
        entidade_tipo,
        entidade_id,
        bairro,
        cidade,
        uf,
        regiao,
        logradouro,
        numero,
        telefone,
        situacao_resumo,
        programa_servico,
        unidade_referencia,
        status,
        ocorrencia_violencia,
        situacao_vulnerabilidade,
        necessidade_cesta,
        ponto_distribuicao,
        latitude,
        longitude,
        ativo,
        criado_por_usuario_id,
        criado_por_nome,
        atualizado_por_usuario_id,
        atualizado_por_nome,
        criado_em,
        atualizado_em
      ) VALUES (
        ${input.categoria ?? "OUTRO"},
        ${input.titulo ?? "Ponto territorial"},
        ${input.descricao ?? null},
        ${input.entidadeTipo ?? null},
        ${toBigInt(input.entidadeId)},
        ${input.bairro ?? null},
        ${input.cidade ?? null},
        ${input.uf ?? null},
        ${input.regiao ?? null},
        ${input.logradouro ?? null},
        ${input.numero ?? null},
        ${input.telefone ?? null},
        ${input.situacaoResumo ?? null},
        ${input.programaServico ?? null},
        ${input.unidadeReferencia ?? null},
        ${input.status ?? null},
        ${Boolean(input.ocorrenciaViolencia)},
        ${Boolean(input.situacaoVulnerabilidade)},
        ${Boolean(input.necessidadeCesta)},
        ${Boolean(input.pontoDistribuicao)},
        ${new Prisma.Decimal(input.latitude)},
        ${new Prisma.Decimal(input.longitude)},
        TRUE,
        ${usuario?.id ? BigInt(usuario.id) : null},
        ${usuario?.nomeUsuario ?? null},
        ${usuario?.id ? BigInt(usuario.id) : null},
        ${usuario?.nomeUsuario ?? null},
        NOW(),
        NOW()
      )
      RETURNING id
    `);

    const pontoManualId = inserted[0]?.id;
    if (!pontoManualId) {
      throw new AppError("Não foi possível criar o ponto territorial.", 500);
    }

    await registrarAuditoriaPontoManual(
      pontoManualId,
      "CRIACAO",
      null,
      {
        categoria: input.categoria ?? "OUTRO",
        titulo: input.titulo ?? "Ponto territorial",
        descricao: input.descricao ?? null,
        entidade_tipo: input.entidadeTipo ?? null,
        entidade_id: input.entidadeId ?? null,
        latitude: input.latitude,
        longitude: input.longitude
      },
      usuario
    );

    return {
      id: pontoManualId.toString(),
      mensagem: "Ponto territorial salvo com sucesso."
    };
  }

  async montarDetalhePontoManual(id: bigint): Promise<GeoDetailResponse | null> {
    const ponto = await this.buscarPontoManualDetalhe(id);
    if (!ponto) return null;

    return {
      id: `PONTO_MANUAL:${ponto.id.toString()}`,
      camada: ponto.ocorrencia_violencia
        ? "violencia"
        : ponto.ponto_distribuicao
          ? "pontos_distribuicao"
          : ponto.situacao_vulnerabilidade
            ? "vulnerabilidade"
            : "demandas_territoriais",
      entidadeTipo: ponto.entidade_tipo ?? "PONTO_MANUAL",
      titulo: ponto.titulo,
      tipoLabel: "Ponto territorial",
      bairro: ponto.bairro ?? undefined,
      cidade: ponto.cidade ?? undefined,
      uf: ponto.uf ?? undefined,
      regiao: ponto.regiao ?? undefined,
      enderecoResumo:
        montarEnderecoResumo(ponto.logradouro, ponto.bairro, ponto.cidade, ponto.uf) || undefined,
      telefone: ponto.telefone ?? undefined,
      situacaoResumo: ponto.situacao_resumo ?? undefined,
      programaServico: ponto.programa_servico ?? undefined,
      unidadeReferencia: ponto.unidade_referencia ?? undefined,
      historicoResumo: ponto.descricao ?? undefined,
      status: ponto.status ?? undefined,
      dataReferencia: toIsoDate(ponto.atualizado_em),
      latitude: toNumber(ponto.latitude),
      longitude: toNumber(ponto.longitude)
    };
  }
}
