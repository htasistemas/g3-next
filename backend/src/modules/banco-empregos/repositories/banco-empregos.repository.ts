import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import type {
  BancoEmpregosAvaliacaoInput,
  BancoEmpregosAvaliacaoRow,
  BancoEmpregosCandidatoFiltersInput,
  BancoEmpregosCandidatoInput,
  BancoEmpregosCandidatoRow,
  BancoEmpregosDashboardFiltersInput,
  BancoEmpregosDocumentoRow,
  BancoEmpregosHistoricoFiltersInput,
  BancoEmpregosHistoricoRow,
  BancoEmpregosProcessoFiltersInput,
  BancoEmpregosProcessoInput,
  BancoEmpregosProcessoRow,
  BancoEmpregosVagaFiltersInput,
  BancoEmpregosVagaInput,
  BancoEmpregosVagaRow
} from "../banco-empregos.types.js";

type TransactionClient = Prisma.TransactionClient;

const estruturaSql = [
  `
  CREATE TABLE IF NOT EXISTS banco_empregos_candidato (
    id BIGSERIAL PRIMARY KEY,
    beneficiario_id BIGINT REFERENCES cadastro_beneficiario(id) ON DELETE SET NULL,
    nome_completo VARCHAR(200) NOT NULL,
    cpf VARCHAR(20),
    rg VARCHAR(40),
    data_nascimento DATE,
    sexo VARCHAR(40),
    estado_civil VARCHAR(60),
    telefone VARCHAR(20),
    whatsapp VARCHAR(20),
    email VARCHAR(160),
    cep VARCHAR(10),
    endereco VARCHAR(255),
    bairro VARCHAR(120),
    cidade VARCHAR(120),
    uf VARCHAR(2),
    escolaridade VARCHAR(120),
    cursos TEXT,
    formacao_complementar TEXT,
    area_interesse VARCHAR(160),
    cargo_pretendido VARCHAR(160),
    pretensao_salarial NUMERIC(12,2),
    disponibilidade VARCHAR(120),
    possui_experiencia BOOLEAN NOT NULL DEFAULT FALSE,
    ultima_empresa VARCHAR(200),
    funcao_exercida VARCHAR(160),
    tempo_experiencia VARCHAR(120),
    resumo_profissional TEXT,
    observacoes TEXT,
    situacao VARCHAR(40) NOT NULL DEFAULT 'ATIVO',
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    experiencias_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    formacoes_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    habilidades_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    curriculo_extraido_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    curriculo_versao INTEGER NOT NULL DEFAULT 0,
    data_envio_curriculo TIMESTAMP,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
  )
  `,
  `
  CREATE TABLE IF NOT EXISTS banco_empregos_vaga (
    id BIGSERIAL PRIMARY KEY,
    titulo VARCHAR(200) NOT NULL,
    empresa_nome VARCHAR(200) NOT NULL,
    area VARCHAR(160),
    quantidade_vagas INTEGER NOT NULL DEFAULT 1,
    requisitos TEXT,
    escolaridade_minima VARCHAR(120),
    experiencia_minima VARCHAR(120),
    bairro VARCHAR(120),
    cidade VARCHAR(120),
    tipo_contratacao VARCHAR(80),
    jornada VARCHAR(120),
    faixa_salarial VARCHAR(120),
    beneficios TEXT,
    observacoes TEXT,
    data_abertura DATE,
    data_limite DATE,
    situacao VARCHAR(40) NOT NULL DEFAULT 'ABERTA',
    projeto_servico VARCHAR(160),
    unidade_referencia VARCHAR(160),
    criterios_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
  )
  `,
  `
  CREATE TABLE IF NOT EXISTS banco_empregos_processo (
    id BIGSERIAL PRIMARY KEY,
    vaga_id BIGINT NOT NULL REFERENCES banco_empregos_vaga(id) ON DELETE CASCADE,
    candidato_id BIGINT NOT NULL REFERENCES banco_empregos_candidato(id) ON DELETE CASCADE,
    etapa VARCHAR(40) NOT NULL DEFAULT 'TRIAGEM_INICIAL',
    status VARCHAR(40) NOT NULL DEFAULT 'EM_ANALISE',
    observacoes TEXT,
    responsavel_id BIGINT,
    responsavel_nome VARCHAR(200),
    data_movimentacao TIMESTAMP NOT NULL DEFAULT NOW(),
    data_entrevista DATE,
    data_encaminhamento DATE,
    selecionado BOOLEAN NOT NULL DEFAULT FALSE,
    contratado BOOLEAN NOT NULL DEFAULT FALSE,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT banco_empregos_processo_vaga_candidato_uk UNIQUE (vaga_id, candidato_id)
  )
  `,
  `
  CREATE TABLE IF NOT EXISTS banco_empregos_avaliacao (
    id BIGSERIAL PRIMARY KEY,
    processo_id BIGINT NOT NULL UNIQUE REFERENCES banco_empregos_processo(id) ON DELETE CASCADE,
    criterios_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    nota_final NUMERIC(7,2) NOT NULL DEFAULT 0,
    aderencia_percentual NUMERIC(7,2) NOT NULL DEFAULT 0,
    observacao_geral TEXT,
    atualizado_por_id BIGINT,
    atualizado_por_nome VARCHAR(200),
    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
  )
  `,
  `
  CREATE TABLE IF NOT EXISTS banco_empregos_documento (
    id BIGSERIAL PRIMARY KEY,
    candidato_id BIGINT NOT NULL REFERENCES banco_empregos_candidato(id) ON DELETE CASCADE,
    arquivo_id BIGINT NOT NULL REFERENCES arquivos(id) ON DELETE CASCADE,
    categoria VARCHAR(40) NOT NULL,
    descricao VARCHAR(160),
    versao INTEGER NOT NULL DEFAULT 1,
    principal BOOLEAN NOT NULL DEFAULT TRUE,
    extraido_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
  )
  `,
  `
  CREATE TABLE IF NOT EXISTS banco_empregos_historico (
    id BIGSERIAL PRIMARY KEY,
    entidade_tipo VARCHAR(40) NOT NULL,
    entidade_id BIGINT NOT NULL,
    candidato_id BIGINT,
    vaga_id BIGINT,
    processo_id BIGINT,
    usuario_id BIGINT,
    usuario_nome VARCHAR(200),
    acao VARCHAR(60) NOT NULL,
    observacao TEXT,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW()
  )
  `,
  "CREATE INDEX IF NOT EXISTS banco_empregos_candidato_nome_idx ON banco_empregos_candidato (nome_completo)",
  "CREATE INDEX IF NOT EXISTS banco_empregos_candidato_cpf_idx ON banco_empregos_candidato (cpf)",
  "CREATE INDEX IF NOT EXISTS banco_empregos_candidato_bairro_idx ON banco_empregos_candidato (bairro)",
  "CREATE INDEX IF NOT EXISTS banco_empregos_candidato_cidade_idx ON banco_empregos_candidato (cidade)",
  "CREATE INDEX IF NOT EXISTS banco_empregos_candidato_situacao_idx ON banco_empregos_candidato (situacao)",
  "CREATE INDEX IF NOT EXISTS banco_empregos_candidato_area_idx ON banco_empregos_candidato (area_interesse)",
  "CREATE INDEX IF NOT EXISTS banco_empregos_candidato_criado_idx ON banco_empregos_candidato (criado_em DESC)",
  "CREATE INDEX IF NOT EXISTS banco_empregos_vaga_titulo_idx ON banco_empregos_vaga (titulo)",
  "CREATE INDEX IF NOT EXISTS banco_empregos_vaga_empresa_idx ON banco_empregos_vaga (empresa_nome)",
  "CREATE INDEX IF NOT EXISTS banco_empregos_vaga_cidade_idx ON banco_empregos_vaga (cidade)",
  "CREATE INDEX IF NOT EXISTS banco_empregos_vaga_situacao_idx ON banco_empregos_vaga (situacao)",
  "CREATE INDEX IF NOT EXISTS banco_empregos_vaga_data_abertura_idx ON banco_empregos_vaga (data_abertura DESC)",
  "CREATE INDEX IF NOT EXISTS banco_empregos_processo_vaga_idx ON banco_empregos_processo (vaga_id)",
  "CREATE INDEX IF NOT EXISTS banco_empregos_processo_candidato_idx ON banco_empregos_processo (candidato_id)",
  "CREATE INDEX IF NOT EXISTS banco_empregos_processo_etapa_idx ON banco_empregos_processo (etapa)",
  "CREATE INDEX IF NOT EXISTS banco_empregos_processo_status_idx ON banco_empregos_processo (status)",
  "CREATE INDEX IF NOT EXISTS banco_empregos_documento_candidato_idx ON banco_empregos_documento (candidato_id)",
  "CREATE INDEX IF NOT EXISTS banco_empregos_documento_categoria_idx ON banco_empregos_documento (categoria)",
  "CREATE INDEX IF NOT EXISTS banco_empregos_historico_entidade_idx ON banco_empregos_historico (entidade_tipo, entidade_id)",
  "CREATE INDEX IF NOT EXISTS banco_empregos_historico_candidato_idx ON banco_empregos_historico (candidato_id)",
  "CREATE INDEX IF NOT EXISTS banco_empregos_historico_vaga_idx ON banco_empregos_historico (vaga_id)",
  "CREATE INDEX IF NOT EXISTS banco_empregos_historico_processo_idx ON banco_empregos_historico (processo_id)",
  "CREATE INDEX IF NOT EXISTS banco_empregos_historico_criado_idx ON banco_empregos_historico (criado_em DESC)"
] as const;

let estruturaPromise: Promise<void> | null = null;

function toJson(value: unknown) {
  if (value == null) {
    return null;
  }
  return value as Prisma.JsonObject | Prisma.JsonArray;
}

function toPage(value?: number | null, fallback = 1) {
  const pagina = Number(value);
  return Number.isInteger(pagina) && pagina > 0 ? pagina : fallback;
}

function toLimit(value?: number | null, fallback = 30, max = 200) {
  const limite = Number(value);
  if (!Number.isInteger(limite) || limite <= 0) return fallback;
  return Math.min(limite, max);
}

function faixaEtariaParaIntervalo(faixa?: string | null) {
  const valor = String(faixa ?? "")
    .trim()
    .toUpperCase();

  if (!valor) return null;
  if (valor === "ADOLESCENTE") return { min: 12, max: 17 };
  if (valor === "JOVEM") return { min: 18, max: 29 };
  if (valor === "ADULTO") return { min: 30, max: 59 };
  if (valor === "IDOSO") return { min: 60, max: 200 };

  const match = valor.match(/^(\d+)\s*-\s*(\d+)$/);
  if (match) {
    return {
      min: Number(match[1]),
      max: Number(match[2])
    };
  }

  return null;
}

function idadeSql() {
  return Prisma.sql`EXTRACT(YEAR FROM age(CURRENT_DATE, c.data_nascimento))::int`;
}

function whereCandidatos(
  filters: BancoEmpregosDashboardFiltersInput & {
    termo?: string | null;
    nome?: string | null;
    cpf?: string | null;
    disponibilidade?: string | null;
  }
) {
  const condicoes: Prisma.Sql[] = [];
  const termo = filters.termo?.trim() || filters.nome?.trim();

  if (termo) {
    const like = `%${termo}%`;
    condicoes.push(
      Prisma.sql`(c.nome_completo ILIKE ${like} OR COALESCE(c.email, '') ILIKE ${like} OR COALESCE(c.cargo_pretendido, '') ILIKE ${like})`
    );
  }

  const cpf = filters.cpf?.trim();
  if (cpf) {
    condicoes.push(Prisma.sql`regexp_replace(COALESCE(c.cpf, ''), '[^0-9]', '', 'g') LIKE ${`%${cpf.replace(/\D/g, "")}%`}`);
  }

  if (filters.bairro?.trim()) condicoes.push(Prisma.sql`c.bairro ILIKE ${`%${filters.bairro.trim()}%`}`);
  if (filters.cidade?.trim()) condicoes.push(Prisma.sql`c.cidade ILIKE ${`%${filters.cidade.trim()}%`}`);
  if (filters.escolaridade?.trim()) condicoes.push(Prisma.sql`c.escolaridade ILIKE ${`%${filters.escolaridade.trim()}%`}`);
  if (filters.areaInteresse?.trim()) condicoes.push(Prisma.sql`c.area_interesse ILIKE ${`%${filters.areaInteresse.trim()}%`}`);
  if (filters.cargoPretendido?.trim()) condicoes.push(Prisma.sql`c.cargo_pretendido ILIKE ${`%${filters.cargoPretendido.trim()}%`}`);
  if (filters.disponibilidade?.trim()) condicoes.push(Prisma.sql`c.disponibilidade ILIKE ${`%${filters.disponibilidade.trim()}%`}`);
  if (filters.sexo?.trim()) condicoes.push(Prisma.sql`c.sexo = ${filters.sexo.trim()}`);
  if (filters.situacao?.trim()) condicoes.push(Prisma.sql`c.situacao = ${filters.situacao.trim()}`);
  if (typeof filters.possuiExperiencia === "boolean") condicoes.push(Prisma.sql`c.possui_experiencia = ${filters.possuiExperiencia}`);
  if (filters.dataCadastroDe) condicoes.push(Prisma.sql`c.criado_em::date >= ${filters.dataCadastroDe}::date`);
  if (filters.dataCadastroAte) condicoes.push(Prisma.sql`c.criado_em::date <= ${filters.dataCadastroAte}::date`);

  if (typeof filters.possuiCurriculo === "boolean") {
    condicoes.push(
      filters.possuiCurriculo
        ? Prisma.sql`EXISTS (SELECT 1 FROM banco_empregos_documento d WHERE d.candidato_id = c.id AND d.ativo = TRUE AND d.categoria = 'CURRICULO')`
        : Prisma.sql`NOT EXISTS (SELECT 1 FROM banco_empregos_documento d WHERE d.candidato_id = c.id AND d.ativo = TRUE AND d.categoria = 'CURRICULO')`
    );
  }

  if (typeof filters.possuiCertificados === "boolean") {
    condicoes.push(
      filters.possuiCertificados
        ? Prisma.sql`EXISTS (SELECT 1 FROM banco_empregos_documento d WHERE d.candidato_id = c.id AND d.ativo = TRUE AND d.categoria = 'CERTIFICADO')`
        : Prisma.sql`NOT EXISTS (SELECT 1 FROM banco_empregos_documento d WHERE d.candidato_id = c.id AND d.ativo = TRUE AND d.categoria = 'CERTIFICADO')`
    );
  }

  if (typeof filters.idadeExata === "number" && filters.idadeExata >= 0) {
    condicoes.push(Prisma.sql`${idadeSql()} = ${filters.idadeExata}`);
  }

  const faixa = faixaEtariaParaIntervalo(filters.faixaEtaria);
  if (faixa) {
    condicoes.push(Prisma.sql`${idadeSql()} BETWEEN ${faixa.min} AND ${faixa.max}`);
  }

  return condicoes.length ? Prisma.sql`WHERE ${Prisma.join(condicoes, " AND ")}` : Prisma.empty;
}

function whereVagas(filters: BancoEmpregosVagaFiltersInput) {
  const condicoes: Prisma.Sql[] = [];
  const termo = filters.termo?.trim();

  if (termo) {
    const like = `%${termo}%`;
    condicoes.push(Prisma.sql`(v.titulo ILIKE ${like} OR v.empresa_nome ILIKE ${like} OR COALESCE(v.area, '') ILIKE ${like})`);
  }

  if (filters.titulo?.trim()) condicoes.push(Prisma.sql`v.titulo ILIKE ${`%${filters.titulo.trim()}%`}`);
  if (filters.empresaNome?.trim()) condicoes.push(Prisma.sql`v.empresa_nome ILIKE ${`%${filters.empresaNome.trim()}%`}`);
  if (filters.area?.trim()) condicoes.push(Prisma.sql`v.area ILIKE ${`%${filters.area.trim()}%`}`);
  if (filters.cidade?.trim()) condicoes.push(Prisma.sql`v.cidade ILIKE ${`%${filters.cidade.trim()}%`}`);
  if (filters.situacao?.trim()) condicoes.push(Prisma.sql`v.situacao = ${filters.situacao.trim()}`);
  if (filters.dataAberturaDe) condicoes.push(Prisma.sql`v.data_abertura >= ${filters.dataAberturaDe}::date`);
  if (filters.dataAberturaAte) condicoes.push(Prisma.sql`v.data_abertura <= ${filters.dataAberturaAte}::date`);
  if (filters.semSelecionado === true) {
    condicoes.push(
      Prisma.sql`NOT EXISTS (SELECT 1 FROM banco_empregos_processo p WHERE p.vaga_id = v.id AND p.ativo = TRUE AND p.selecionado = TRUE)`
    );
  }

  return condicoes.length ? Prisma.sql`WHERE ${Prisma.join(condicoes, " AND ")}` : Prisma.empty;
}

export async function ensureBancoEmpregosEstrutura() {
  if (!estruturaPromise) {
    estruturaPromise = (async () => {
      for (const comando of estruturaSql) {
        await prisma.$executeRawUnsafe(comando);
      }
    })();
  }

  await estruturaPromise;
}

export class BancoEmpregosRepository {
  async listarCandidatos(filters: BancoEmpregosCandidatoFiltersInput) {
    await ensureBancoEmpregosEstrutura();
    const pagina = toPage(filters.pagina);
    const limite = toLimit(filters.limite);
    const offset = (pagina - 1) * limite;
    const where = whereCandidatos(filters);

    const rows = await prisma.$queryRaw<BancoEmpregosCandidatoRow[]>(Prisma.sql`
      SELECT
        c.*,
        ${idadeSql()} AS idade,
        COALESCE(d.total_documentos, 0) AS total_documentos,
        COALESCE(d.total_curriculos, 0) AS total_curriculos,
        COALESCE(d.total_certificados, 0) AS total_certificados
      FROM banco_empregos_candidato c
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*)::int AS total_documentos,
          COUNT(*) FILTER (WHERE categoria = 'CURRICULO' AND ativo = TRUE)::int AS total_curriculos,
          COUNT(*) FILTER (WHERE categoria = 'CERTIFICADO' AND ativo = TRUE)::int AS total_certificados
        FROM banco_empregos_documento d
        WHERE d.candidato_id = c.id
      ) d ON TRUE
      ${where}
      ORDER BY c.atualizado_em DESC, c.id DESC
      LIMIT ${limite}
      OFFSET ${offset}
    `);

    const totalRows = await prisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`
      SELECT COUNT(*)::bigint AS total
      FROM banco_empregos_candidato c
      ${where}
    `);

    return {
      pagina,
      limite,
      total: Number(totalRows[0]?.total ?? 0),
      rows
    };
  }

  async buscarCandidato(id: bigint) {
    await ensureBancoEmpregosEstrutura();
    const rows = await prisma.$queryRaw<BancoEmpregosCandidatoRow[]>(Prisma.sql`
      SELECT
        c.*,
        ${idadeSql()} AS idade,
        COALESCE(d.total_documentos, 0) AS total_documentos,
        COALESCE(d.total_curriculos, 0) AS total_curriculos,
        COALESCE(d.total_certificados, 0) AS total_certificados
      FROM banco_empregos_candidato c
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*)::int AS total_documentos,
          COUNT(*) FILTER (WHERE categoria = 'CURRICULO' AND ativo = TRUE)::int AS total_curriculos,
          COUNT(*) FILTER (WHERE categoria = 'CERTIFICADO' AND ativo = TRUE)::int AS total_certificados
        FROM banco_empregos_documento d
        WHERE d.candidato_id = c.id
      ) d ON TRUE
      WHERE c.id = ${id}
      LIMIT 1
    `);

    return rows[0] ?? null;
  }

  async buscarCandidatoOuFalhar(id: bigint) {
    const candidato = await this.buscarCandidato(id);
    if (!candidato) {
      throw new AppError("Candidato não encontrado.", 404);
    }
    return candidato;
  }

  async salvarCandidato(id: bigint | undefined, input: BancoEmpregosCandidatoInput) {
    await ensureBancoEmpregosEstrutura();
    return prisma.$transaction(async (tx) => {
      const beneficiarioId = input.beneficiarioId ? BigInt(input.beneficiarioId) : null;
      const situacao = input.situacao ?? "ATIVO";
      const ativo = situacao !== "INATIVO";
      const experiencias = input.experiencias ?? [];
      const formacoes = input.formacoes ?? [];
      const habilidades = input.habilidades ?? [];
      let savedId = id;

      if (!id) {
        const rows = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
          INSERT INTO banco_empregos_candidato (
            beneficiario_id,
            nome_completo,
            cpf,
            rg,
            data_nascimento,
            sexo,
            estado_civil,
            telefone,
            whatsapp,
            email,
            cep,
            endereco,
            bairro,
            cidade,
            uf,
            escolaridade,
            cursos,
            formacao_complementar,
            area_interesse,
            cargo_pretendido,
            pretensao_salarial,
            disponibilidade,
            possui_experiencia,
            ultima_empresa,
            funcao_exercida,
            tempo_experiencia,
            resumo_profissional,
            observacoes,
            situacao,
            ativo,
            experiencias_json,
            formacoes_json,
            habilidades_json,
            curriculo_extraido_json,
            criado_em,
            atualizado_em
          ) VALUES (
            ${beneficiarioId},
            ${input.nomeCompleto},
            ${input.cpf ?? null},
            ${input.rg ?? null},
            ${input.dataNascimento ? new Date(`${input.dataNascimento}T00:00:00`) : null},
            ${input.sexo ?? null},
            ${input.estadoCivil ?? null},
            ${input.telefone ?? null},
            ${input.whatsapp ?? null},
            ${input.email ?? null},
            ${input.cep ?? null},
            ${input.endereco ?? null},
            ${input.bairro ?? null},
            ${input.cidade ?? null},
            ${input.uf ?? null},
            ${input.escolaridade ?? null},
            ${input.cursos ?? null},
            ${input.formacaoComplementar ?? null},
            ${input.areaInteresse ?? null},
            ${input.cargoPretendido ?? null},
            ${input.pretensaoSalarial ?? null},
            ${input.disponibilidade ?? null},
            ${input.possuiExperiencia ?? false},
            ${input.ultimaEmpresa ?? null},
            ${input.funcaoExercida ?? null},
            ${input.tempoExperiencia ?? null},
            ${input.resumoProfissional ?? null},
            ${input.observacoes ?? null},
            ${situacao},
            ${ativo},
            ${(toJson(experiencias) ?? []) as unknown as Prisma.JsonArray},
            ${(toJson(formacoes) ?? []) as unknown as Prisma.JsonArray},
            ${(toJson(habilidades) ?? []) as unknown as Prisma.JsonArray},
            ${(toJson(input.curriculoExtraido ?? {}) ?? {}) as unknown as Prisma.JsonObject},
            NOW(),
            NOW()
          )
          RETURNING id
        `);
        savedId = rows[0]?.id;
      } else {
        await tx.$executeRaw(Prisma.sql`
          UPDATE banco_empregos_candidato
          SET
            beneficiario_id = ${beneficiarioId},
            nome_completo = ${input.nomeCompleto},
            cpf = ${input.cpf ?? null},
            rg = ${input.rg ?? null},
            data_nascimento = ${input.dataNascimento ? new Date(`${input.dataNascimento}T00:00:00`) : null},
            sexo = ${input.sexo ?? null},
            estado_civil = ${input.estadoCivil ?? null},
            telefone = ${input.telefone ?? null},
            whatsapp = ${input.whatsapp ?? null},
            email = ${input.email ?? null},
            cep = ${input.cep ?? null},
            endereco = ${input.endereco ?? null},
            bairro = ${input.bairro ?? null},
            cidade = ${input.cidade ?? null},
            uf = ${input.uf ?? null},
            escolaridade = ${input.escolaridade ?? null},
            cursos = ${input.cursos ?? null},
            formacao_complementar = ${input.formacaoComplementar ?? null},
            area_interesse = ${input.areaInteresse ?? null},
            cargo_pretendido = ${input.cargoPretendido ?? null},
            pretensao_salarial = ${input.pretensaoSalarial ?? null},
            disponibilidade = ${input.disponibilidade ?? null},
            possui_experiencia = ${input.possuiExperiencia ?? false},
            ultima_empresa = ${input.ultimaEmpresa ?? null},
            funcao_exercida = ${input.funcaoExercida ?? null},
            tempo_experiencia = ${input.tempoExperiencia ?? null},
            resumo_profissional = ${input.resumoProfissional ?? null},
            observacoes = ${input.observacoes ?? null},
            situacao = ${situacao},
            ativo = ${ativo},
            experiencias_json = ${(toJson(experiencias) ?? []) as unknown as Prisma.JsonArray},
            formacoes_json = ${(toJson(formacoes) ?? []) as unknown as Prisma.JsonArray},
            habilidades_json = ${(toJson(habilidades) ?? []) as unknown as Prisma.JsonArray},
            curriculo_extraido_json = ${(toJson(input.curriculoExtraido ?? {}) ?? {}) as unknown as Prisma.JsonObject},
            atualizado_em = NOW()
          WHERE id = ${id}
        `);
      }

      if (!savedId) {
        throw new AppError("Não foi possível salvar o candidato.", 500);
      }

      return savedId;
    });
  }

  async inativarCandidato(id: bigint) {
    await ensureBancoEmpregosEstrutura();
    await prisma.$executeRaw(Prisma.sql`
      UPDATE banco_empregos_candidato
      SET situacao = 'INATIVO',
          ativo = FALSE,
          atualizado_em = NOW()
      WHERE id = ${id}
    `);
  }

  async listarDocumentos(candidatoId: bigint) {
    await ensureBancoEmpregosEstrutura();
    return prisma.$queryRaw<BancoEmpregosDocumentoRow[]>(Prisma.sql`
      SELECT
        d.*,
        a.nome_original,
        a.nome_arquivo,
        a.caminho_arquivo,
        a.mime_type,
        a.tamanho_bytes,
        a.data_upload
      FROM banco_empregos_documento d
      INNER JOIN arquivos a ON a.id = d.arquivo_id
      WHERE d.candidato_id = ${candidatoId}
      ORDER BY d.categoria ASC, d.versao DESC, d.id DESC
    `);
  }

  async buscarDocumentoOuFalhar(documentoId: bigint) {
    await ensureBancoEmpregosEstrutura();
    const rows = await prisma.$queryRaw<BancoEmpregosDocumentoRow[]>(Prisma.sql`
      SELECT
        d.*,
        a.nome_original,
        a.nome_arquivo,
        a.caminho_arquivo,
        a.mime_type,
        a.tamanho_bytes,
        a.data_upload
      FROM banco_empregos_documento d
      INNER JOIN arquivos a ON a.id = d.arquivo_id
      WHERE d.id = ${documentoId}
      LIMIT 1
    `);
    const documento = rows[0];
    if (!documento) {
      throw new AppError("Documento não encontrado.", 404);
    }
    return documento;
  }

  async adicionarDocumento(
    candidatoId: bigint,
    arquivoId: bigint,
    payload: { categoria: string; descricao?: string | null; extraido?: Record<string, unknown> | null }
  ) {
    await ensureBancoEmpregosEstrutura();
    return prisma.$transaction(async (tx) => {
      const versaoRows = await tx.$queryRaw<Array<{ versao: number | null }>>(Prisma.sql`
        SELECT MAX(versao) AS versao
        FROM banco_empregos_documento
        WHERE candidato_id = ${candidatoId}
          AND categoria = ${payload.categoria}
      `);
      const versao = Number(versaoRows[0]?.versao ?? 0) + 1;

      await tx.$executeRaw(Prisma.sql`
        UPDATE banco_empregos_documento
        SET principal = FALSE,
            atualizado_em = NOW()
        WHERE candidato_id = ${candidatoId}
          AND categoria = ${payload.categoria}
      `);

      const rows = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
        INSERT INTO banco_empregos_documento (
          candidato_id,
          arquivo_id,
          categoria,
          descricao,
          versao,
          principal,
          extraido_json,
          ativo,
          criado_em,
          atualizado_em
        ) VALUES (
          ${candidatoId},
          ${arquivoId},
          ${payload.categoria},
          ${payload.descricao ?? null},
          ${versao},
          TRUE,
          ${(toJson(payload.extraido ?? {}) ?? {}) as unknown as Prisma.JsonObject},
          TRUE,
          NOW(),
          NOW()
        )
        RETURNING id
      `);

      if (payload.categoria === "CURRICULO") {
        await tx.$executeRaw(Prisma.sql`
          UPDATE banco_empregos_candidato
          SET curriculo_versao = ${versao},
              data_envio_curriculo = NOW(),
              curriculo_extraido_json = ${(toJson(payload.extraido ?? {}) ?? {}) as unknown as Prisma.JsonObject},
              atualizado_em = NOW()
          WHERE id = ${candidatoId}
        `);
      }

      const documentoId = rows[0]?.id;
      if (!documentoId) {
        throw new AppError("Não foi possível registrar o documento.", 500);
      }
      return this.buscarDocumentoOuFalhar(documentoId);
    });
  }

  async desativarDocumento(documentoId: bigint) {
    await ensureBancoEmpregosEstrutura();
    await prisma.$executeRaw(Prisma.sql`
      UPDATE banco_empregos_documento
      SET ativo = FALSE,
          principal = FALSE,
          atualizado_em = NOW()
      WHERE id = ${documentoId}
    `);
  }

  async listarVagas(filters: BancoEmpregosVagaFiltersInput) {
    await ensureBancoEmpregosEstrutura();
    const pagina = toPage(filters.pagina);
    const limite = toLimit(filters.limite);
    const offset = (pagina - 1) * limite;
    const where = whereVagas(filters);

    const rows = await prisma.$queryRaw<BancoEmpregosVagaRow[]>(Prisma.sql`
      SELECT
        v.*,
        COALESCE(p.total_processos, 0) AS total_processos,
        COALESCE(p.total_selecionados, 0) AS total_selecionados,
        COALESCE(p.total_contratados, 0) AS total_contratados
      FROM banco_empregos_vaga v
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*)::int AS total_processos,
          COUNT(*) FILTER (WHERE selecionado = TRUE)::int AS total_selecionados,
          COUNT(*) FILTER (WHERE contratado = TRUE)::int AS total_contratados
        FROM banco_empregos_processo p
        WHERE p.vaga_id = v.id
          AND p.ativo = TRUE
      ) p ON TRUE
      ${where}
      ORDER BY v.data_abertura DESC NULLS LAST, v.id DESC
      LIMIT ${limite}
      OFFSET ${offset}
    `);

    const totalRows = await prisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`
      SELECT COUNT(*)::bigint AS total
      FROM banco_empregos_vaga v
      ${where}
    `);

    return {
      pagina,
      limite,
      total: Number(totalRows[0]?.total ?? 0),
      rows
    };
  }

  async buscarVaga(id: bigint) {
    await ensureBancoEmpregosEstrutura();
    const rows = await prisma.$queryRaw<BancoEmpregosVagaRow[]>(Prisma.sql`
      SELECT
        v.*,
        COALESCE(p.total_processos, 0) AS total_processos,
        COALESCE(p.total_selecionados, 0) AS total_selecionados,
        COALESCE(p.total_contratados, 0) AS total_contratados
      FROM banco_empregos_vaga v
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*)::int AS total_processos,
          COUNT(*) FILTER (WHERE selecionado = TRUE)::int AS total_selecionados,
          COUNT(*) FILTER (WHERE contratado = TRUE)::int AS total_contratados
        FROM banco_empregos_processo p
        WHERE p.vaga_id = v.id
          AND p.ativo = TRUE
      ) p ON TRUE
      WHERE v.id = ${id}
      LIMIT 1
    `);

    return rows[0] ?? null;
  }

  async buscarVagaOuFalhar(id: bigint) {
    const vaga = await this.buscarVaga(id);
    if (!vaga) {
      throw new AppError("Vaga não encontrada.", 404);
    }
    return vaga;
  }

  async salvarVaga(id: bigint | undefined, input: BancoEmpregosVagaInput) {
    await ensureBancoEmpregosEstrutura();
    return prisma.$transaction(async (tx) => {
      const situacao = input.situacao ?? "ABERTA";
      const quantidadeVagas = Math.max(1, Number(input.quantidadeVagas ?? 1));
      let savedId = id;

      if (!id) {
        const rows = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
          INSERT INTO banco_empregos_vaga (
            titulo,
            empresa_nome,
            area,
            quantidade_vagas,
            requisitos,
            escolaridade_minima,
            experiencia_minima,
            bairro,
            cidade,
            tipo_contratacao,
            jornada,
            faixa_salarial,
            beneficios,
            observacoes,
            data_abertura,
            data_limite,
            situacao,
            projeto_servico,
            unidade_referencia,
            criterios_json,
            ativo,
            criado_em,
            atualizado_em
          ) VALUES (
            ${input.titulo},
            ${input.empresaNome},
            ${input.area ?? null},
            ${quantidadeVagas},
            ${input.requisitos ?? null},
            ${input.escolaridadeMinima ?? null},
            ${input.experienciaMinima ?? null},
            ${input.bairro ?? null},
            ${input.cidade ?? null},
            ${input.tipoContratacao ?? null},
            ${input.jornada ?? null},
            ${input.faixaSalarial ?? null},
            ${input.beneficios ?? null},
            ${input.observacoes ?? null},
            ${input.dataAbertura ? new Date(`${input.dataAbertura}T00:00:00`) : null},
            ${input.dataLimite ? new Date(`${input.dataLimite}T00:00:00`) : null},
            ${situacao},
            ${input.projetoServico ?? null},
            ${input.unidadeReferencia ?? null},
            ${(toJson(input.criterios ?? []) ?? []) as unknown as Prisma.JsonArray},
            TRUE,
            NOW(),
            NOW()
          )
          RETURNING id
        `);
        savedId = rows[0]?.id;
      } else {
        await tx.$executeRaw(Prisma.sql`
          UPDATE banco_empregos_vaga
          SET
            titulo = ${input.titulo},
            empresa_nome = ${input.empresaNome},
            area = ${input.area ?? null},
            quantidade_vagas = ${quantidadeVagas},
            requisitos = ${input.requisitos ?? null},
            escolaridade_minima = ${input.escolaridadeMinima ?? null},
            experiencia_minima = ${input.experienciaMinima ?? null},
            bairro = ${input.bairro ?? null},
            cidade = ${input.cidade ?? null},
            tipo_contratacao = ${input.tipoContratacao ?? null},
            jornada = ${input.jornada ?? null},
            faixa_salarial = ${input.faixaSalarial ?? null},
            beneficios = ${input.beneficios ?? null},
            observacoes = ${input.observacoes ?? null},
            data_abertura = ${input.dataAbertura ? new Date(`${input.dataAbertura}T00:00:00`) : null},
            data_limite = ${input.dataLimite ? new Date(`${input.dataLimite}T00:00:00`) : null},
            situacao = ${situacao},
            projeto_servico = ${input.projetoServico ?? null},
            unidade_referencia = ${input.unidadeReferencia ?? null},
            criterios_json = ${(toJson(input.criterios ?? []) ?? []) as unknown as Prisma.JsonArray},
            atualizado_em = NOW()
          WHERE id = ${id}
        `);
      }

      if (!savedId) {
        throw new AppError("Não foi possível salvar a vaga.", 500);
      }

      return savedId;
    });
  }

  async removerVaga(id: bigint) {
    await ensureBancoEmpregosEstrutura();
    await prisma.$executeRaw(Prisma.sql`
      UPDATE banco_empregos_vaga
      SET ativo = FALSE,
          situacao = 'CANCELADA',
          atualizado_em = NOW()
      WHERE id = ${id}
    `);
  }

  async listarProcessos(filters: BancoEmpregosProcessoFiltersInput) {
    await ensureBancoEmpregosEstrutura();
    const pagina = toPage(filters.pagina);
    const limite = toLimit(filters.limite, 40);
    const offset = (pagina - 1) * limite;
    const where = whereProcessos(filters);

    const rows = await prisma.$queryRaw<BancoEmpregosProcessoRow[]>(Prisma.sql`
      SELECT
        p.*,
        v.titulo AS vaga_titulo,
        v.empresa_nome,
        c.nome_completo AS candidato_nome,
        c.bairro AS candidato_bairro,
        c.cidade AS candidato_cidade,
        c.situacao AS candidato_situacao,
        a.nota_final,
        a.aderencia_percentual,
        a.observacao_geral AS avaliacao_observacao
      FROM banco_empregos_processo p
      INNER JOIN banco_empregos_vaga v ON v.id = p.vaga_id
      INNER JOIN banco_empregos_candidato c ON c.id = p.candidato_id
      LEFT JOIN banco_empregos_avaliacao a ON a.processo_id = p.id
      ${where}
      ORDER BY COALESCE(a.aderencia_percentual, 0) DESC, COALESCE(a.nota_final, 0) DESC, p.atualizado_em DESC
      LIMIT ${limite}
      OFFSET ${offset}
    `);

    const totalRows = await prisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`
      SELECT COUNT(*)::bigint AS total
      FROM banco_empregos_processo p
      ${where}
    `);

    return {
      pagina,
      limite,
      total: Number(totalRows[0]?.total ?? 0),
      rows
    };
  }

  async buscarProcesso(id: bigint) {
    await ensureBancoEmpregosEstrutura();
    const rows = await prisma.$queryRaw<BancoEmpregosProcessoRow[]>(Prisma.sql`
      SELECT
        p.*,
        v.titulo AS vaga_titulo,
        v.empresa_nome,
        c.nome_completo AS candidato_nome,
        c.bairro AS candidato_bairro,
        c.cidade AS candidato_cidade,
        c.situacao AS candidato_situacao,
        a.nota_final,
        a.aderencia_percentual,
        a.observacao_geral AS avaliacao_observacao
      FROM banco_empregos_processo p
      INNER JOIN banco_empregos_vaga v ON v.id = p.vaga_id
      INNER JOIN banco_empregos_candidato c ON c.id = p.candidato_id
      LEFT JOIN banco_empregos_avaliacao a ON a.processo_id = p.id
      WHERE p.id = ${id}
      LIMIT 1
    `);

    return rows[0] ?? null;
  }

  async buscarProcessoOuFalhar(id: bigint) {
    const processo = await this.buscarProcesso(id);
    if (!processo) {
      throw new AppError("Processo seletivo não encontrado.", 404);
    }
    return processo;
  }

  async buscarProcessoPorVagaECandidato(vagaId: bigint, candidatoId: bigint) {
    await ensureBancoEmpregosEstrutura();
    const rows = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
      SELECT id
      FROM banco_empregos_processo
      WHERE vaga_id = ${vagaId}
        AND candidato_id = ${candidatoId}
      LIMIT 1
    `);
    return rows[0]?.id ?? null;
  }

  async salvarProcesso(
    id: bigint | undefined,
    input: BancoEmpregosProcessoInput,
    usuarioId?: bigint | null
  ) {
    await ensureBancoEmpregosEstrutura();
    return prisma.$transaction(async (tx) => {
      const vagaId = BigInt(input.vagaId);
      const candidatoId = BigInt(input.candidatoId);
      const vaga = await this.buscarVagaOuFalhar(vagaId);
      await this.buscarCandidatoOuFalhar(candidatoId);

      const etapa = input.etapa ?? "TRIAGEM_INICIAL";
      const status = input.status ?? "EM_ANALISE";
      const selecionado = input.selecionado ?? false;
      const contratado = input.contratado ?? false;

      if (selecionado) {
        const totalSelecionados = await obterQuantidadeSelecionados(tx, vagaId, id);
        if (totalSelecionados >= vaga.quantidade_vagas) {
          throw new AppError("A vaga já atingiu a quantidade máxima de candidatos selecionados.", 422);
        }
      }

      let savedId = id;

      if (!id) {
        const rows = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
          INSERT INTO banco_empregos_processo (
            vaga_id,
            candidato_id,
            etapa,
            status,
            observacoes,
            responsavel_id,
            responsavel_nome,
            data_movimentacao,
            data_entrevista,
            data_encaminhamento,
            selecionado,
            contratado,
            ativo,
            criado_em,
            atualizado_em
          ) VALUES (
            ${vagaId},
            ${candidatoId},
            ${etapa},
            ${status},
            ${input.observacoes ?? null},
            ${usuarioId ?? null},
            ${input.responsavelNome ?? null},
            NOW(),
            ${input.dataEntrevista ? new Date(`${input.dataEntrevista}T00:00:00`) : null},
            ${input.dataEncaminhamento ? new Date(`${input.dataEncaminhamento}T00:00:00`) : null},
            ${selecionado},
            ${contratado},
            TRUE,
            NOW(),
            NOW()
          )
          RETURNING id
        `);
        savedId = rows[0]?.id;
      } else {
        await tx.$executeRaw(Prisma.sql`
          UPDATE banco_empregos_processo
          SET
            vaga_id = ${vagaId},
            candidato_id = ${candidatoId},
            etapa = ${etapa},
            status = ${status},
            observacoes = ${input.observacoes ?? null},
            responsavel_id = ${usuarioId ?? null},
            responsavel_nome = ${input.responsavelNome ?? null},
            data_movimentacao = NOW(),
            data_entrevista = ${input.dataEntrevista ? new Date(`${input.dataEntrevista}T00:00:00`) : null},
            data_encaminhamento = ${input.dataEncaminhamento ? new Date(`${input.dataEncaminhamento}T00:00:00`) : null},
            selecionado = ${selecionado},
            contratado = ${contratado},
            atualizado_em = NOW()
          WHERE id = ${id}
        `);
      }

      if (!savedId) {
        throw new AppError("Não foi possível salvar o processo seletivo.", 500);
      }

      await tx.$executeRaw(Prisma.sql`
        UPDATE banco_empregos_candidato
        SET situacao = ${mapSituacaoCandidatoPorProcesso(status, contratado, selecionado)},
            ativo = TRUE,
            atualizado_em = NOW()
        WHERE id = ${candidatoId}
      `);

      await atualizarSituacaoVaga(tx, vagaId);
      return savedId;
    });
  }

  async salvarAvaliacao(
    processoId: bigint,
    input: BancoEmpregosAvaliacaoInput,
    usuarioId?: bigint | null,
    usuarioNome?: string | null
  ) {
    await ensureBancoEmpregosEstrutura();
    return prisma.$transaction(async (tx) => {
      const totalPesos = input.criterios.reduce((acc, item) => acc + Number(item.peso ?? 1), 0) || 1;
      const somaPonderada = input.criterios.reduce(
        (acc, item) => acc + Number(item.nota ?? 0) * Number(item.peso ?? 1),
        0
      );
      const notaFinal = Number((somaPonderada / totalPesos).toFixed(2));
      const aderenciaPercentual = Number(((notaFinal / 10) * 100).toFixed(2));

      const existenteRows = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
        SELECT id
        FROM banco_empregos_avaliacao
        WHERE processo_id = ${processoId}
        LIMIT 1
      `);

      if (existenteRows[0]?.id) {
        await tx.$executeRaw(Prisma.sql`
          UPDATE banco_empregos_avaliacao
          SET
            criterios_json = ${(toJson(input.criterios) ?? []) as unknown as Prisma.JsonArray},
            nota_final = ${notaFinal},
            aderencia_percentual = ${aderenciaPercentual},
            observacao_geral = ${input.observacaoGeral ?? null},
            atualizado_por_id = ${usuarioId ?? null},
            atualizado_por_nome = ${usuarioNome ?? null},
            atualizado_em = NOW()
          WHERE processo_id = ${processoId}
        `);
      } else {
        await tx.$executeRaw(Prisma.sql`
          INSERT INTO banco_empregos_avaliacao (
            processo_id,
            criterios_json,
            nota_final,
            aderencia_percentual,
            observacao_geral,
            atualizado_por_id,
            atualizado_por_nome,
            criado_em,
            atualizado_em
          ) VALUES (
            ${processoId},
            ${(toJson(input.criterios) ?? []) as unknown as Prisma.JsonArray},
            ${notaFinal},
            ${aderenciaPercentual},
            ${input.observacaoGeral ?? null},
            ${usuarioId ?? null},
            ${usuarioNome ?? null},
            NOW(),
            NOW()
          )
        `);
      }

      const rows = await tx.$queryRaw<BancoEmpregosAvaliacaoRow[]>(Prisma.sql`
        SELECT *
        FROM banco_empregos_avaliacao
        WHERE processo_id = ${processoId}
        LIMIT 1
      `);

      const avaliacao = rows[0];
      if (!avaliacao) {
        throw new AppError("Não foi possível salvar a avaliação.", 500);
      }
      return avaliacao;
    });
  }

  async buscarAvaliacaoPorProcesso(processoId: bigint) {
    await ensureBancoEmpregosEstrutura();
    const rows = await prisma.$queryRaw<BancoEmpregosAvaliacaoRow[]>(Prisma.sql`
      SELECT *
      FROM banco_empregos_avaliacao
      WHERE processo_id = ${processoId}
      LIMIT 1
    `);
    return rows[0] ?? null;
  }

  async listarHistorico(filters: BancoEmpregosHistoricoFiltersInput) {
    await ensureBancoEmpregosEstrutura();
    const pagina = toPage(filters.pagina);
    const limite = toLimit(filters.limite, 60);
    const offset = (pagina - 1) * limite;
    const where = whereHistorico(filters);

    const rows = await prisma.$queryRaw<BancoEmpregosHistoricoRow[]>(Prisma.sql`
      SELECT *
      FROM banco_empregos_historico h
      ${where}
      ORDER BY h.criado_em DESC, h.id DESC
      LIMIT ${limite}
      OFFSET ${offset}
    `);

    const totalRows = await prisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`
      SELECT COUNT(*)::bigint AS total
      FROM banco_empregos_historico h
      ${where}
    `);

    return {
      pagina,
      limite,
      total: Number(totalRows[0]?.total ?? 0),
      rows
    };
  }

  async registrarHistorico(input: {
    entidadeTipo: string;
    entidadeId: bigint;
    candidatoId?: bigint | null;
    vagaId?: bigint | null;
    processoId?: bigint | null;
    usuarioId?: bigint | null;
    usuarioNome?: string | null;
    acao: string;
    observacao?: string | null;
  }) {
    await ensureBancoEmpregosEstrutura();
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO banco_empregos_historico (
        entidade_tipo,
        entidade_id,
        candidato_id,
        vaga_id,
        processo_id,
        usuario_id,
        usuario_nome,
        acao,
        observacao,
        criado_em
      ) VALUES (
        ${input.entidadeTipo},
        ${input.entidadeId},
        ${input.candidatoId ?? null},
        ${input.vagaId ?? null},
        ${input.processoId ?? null},
        ${input.usuarioId ?? null},
        ${input.usuarioNome ?? null},
        ${input.acao},
        ${input.observacao ?? null},
        NOW()
      )
    `);
  }

  async obterDashboard(filters: BancoEmpregosDashboardFiltersInput) {
    await ensureBancoEmpregosEstrutura();
    const where = whereCandidatos(filters);
    const vagaWhere = filters.statusVaga?.trim()
      ? Prisma.sql`WHERE v.situacao = ${filters.statusVaga.trim()}`
      : Prisma.empty;

    const [resumoCandidatos, resumoVagas, entrevistas, bairros, cidades, areas] = await Promise.all([
      prisma.$queryRaw<
        Array<{
          total: bigint;
          ativos: bigint;
          em_analise: bigint;
          pre_selecionados: bigint;
          em_entrevista: bigint;
          encaminhados: bigint;
          aprovados: bigint;
          contratados: bigint;
          curriculos_anexados: bigint;
        }>
      >(Prisma.sql`
        SELECT
          COUNT(*)::bigint AS total,
          COUNT(*) FILTER (WHERE c.situacao = 'ATIVO')::bigint AS ativos,
          COUNT(*) FILTER (WHERE c.situacao = 'EM_ANALISE')::bigint AS em_analise,
          COUNT(*) FILTER (WHERE c.situacao = 'PRE_SELECIONADO')::bigint AS pre_selecionados,
          COUNT(*) FILTER (WHERE c.situacao = 'EM_ENTREVISTA')::bigint AS em_entrevista,
          COUNT(*) FILTER (WHERE c.situacao = 'ENCAMINHADO')::bigint AS encaminhados,
          COUNT(*) FILTER (WHERE c.situacao = 'APROVADO')::bigint AS aprovados,
          COUNT(*) FILTER (WHERE c.situacao = 'CONTRATADO')::bigint AS contratados,
          COUNT(*) FILTER (
            WHERE EXISTS (
              SELECT 1
              FROM banco_empregos_documento d
              WHERE d.candidato_id = c.id
                AND d.ativo = TRUE
                AND d.categoria = 'CURRICULO'
            )
          )::bigint AS curriculos_anexados
        FROM banco_empregos_candidato c
        ${where}
      `),
      prisma.$queryRaw<Array<{ total: bigint; abertas: bigint; preenchidas: bigint }>>(Prisma.sql`
        SELECT
          COUNT(*)::bigint AS total,
          COUNT(*) FILTER (WHERE v.situacao = 'ABERTA')::bigint AS abertas,
          COUNT(*) FILTER (WHERE v.situacao = 'PREENCHIDA')::bigint AS preenchidas
        FROM banco_empregos_vaga v
        ${vagaWhere}
      `),
      prisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`
        SELECT COUNT(*)::bigint AS total
        FROM banco_empregos_processo p
        WHERE p.ativo = TRUE
          AND p.data_entrevista IS NOT NULL
      `),
      prisma.$queryRaw<Array<{ nome: string | null; total: bigint }>>(Prisma.sql`
        SELECT NULLIF(TRIM(COALESCE(c.bairro, '')), '') AS nome, COUNT(*)::bigint AS total
        FROM banco_empregos_candidato c
        ${where}
        GROUP BY 1
        ORDER BY COUNT(*) DESC, nome ASC NULLS LAST
        LIMIT 8
      `),
      prisma.$queryRaw<Array<{ nome: string | null; total: bigint }>>(Prisma.sql`
        SELECT NULLIF(TRIM(COALESCE(c.cidade, '')), '') AS nome, COUNT(*)::bigint AS total
        FROM banco_empregos_candidato c
        ${where}
        GROUP BY 1
        ORDER BY COUNT(*) DESC, nome ASC NULLS LAST
        LIMIT 8
      `),
      prisma.$queryRaw<Array<{ nome: string | null; total: bigint }>>(Prisma.sql`
        SELECT NULLIF(TRIM(COALESCE(c.area_interesse, '')), '') AS nome, COUNT(*)::bigint AS total
        FROM banco_empregos_candidato c
        ${where}
        GROUP BY 1
        ORDER BY COUNT(*) DESC, nome ASC NULLS LAST
        LIMIT 8
      `)
    ]);

    return {
      cards: {
        totalCandidatos: Number(resumoCandidatos[0]?.total ?? 0),
        candidatosAtivos: Number(resumoCandidatos[0]?.ativos ?? 0),
        emAnalise: Number(resumoCandidatos[0]?.em_analise ?? 0),
        preSelecionados: Number(resumoCandidatos[0]?.pre_selecionados ?? 0),
        emEntrevista: Number(resumoCandidatos[0]?.em_entrevista ?? 0),
        encaminhados: Number(resumoCandidatos[0]?.encaminhados ?? 0),
        aprovados: Number(resumoCandidatos[0]?.aprovados ?? 0),
        contratados: Number(resumoCandidatos[0]?.contratados ?? 0),
        vagasAbertas: Number(resumoVagas[0]?.abertas ?? 0),
        vagasPreenchidas: Number(resumoVagas[0]?.preenchidas ?? 0),
        entrevistasAgendadas: Number(entrevistas[0]?.total ?? 0),
        curriculosAnexados: Number(resumoCandidatos[0]?.curriculos_anexados ?? 0)
      },
      rankingBairros: bairros.map((item) => ({
        nome: item.nome ?? "Não informado",
        total: Number(item.total)
      })),
      rankingCidades: cidades.map((item) => ({
        nome: item.nome ?? "Não informado",
        total: Number(item.total)
      })),
      rankingAreas: areas.map((item) => ({
        nome: item.nome ?? "Não informado",
        total: Number(item.total)
      }))
    };
  }
}

function whereProcessos(filters: BancoEmpregosProcessoFiltersInput) {
  const condicoes: Prisma.Sql[] = [];
  if (filters.vagaId?.trim()) condicoes.push(Prisma.sql`p.vaga_id = ${BigInt(filters.vagaId.trim())}`);
  if (filters.candidatoId?.trim()) condicoes.push(Prisma.sql`p.candidato_id = ${BigInt(filters.candidatoId.trim())}`);
  if (filters.etapa?.trim()) condicoes.push(Prisma.sql`p.etapa = ${filters.etapa.trim()}`);
  if (filters.status?.trim()) condicoes.push(Prisma.sql`p.status = ${filters.status.trim()}`);
  if (typeof filters.selecionado === "boolean") condicoes.push(Prisma.sql`p.selecionado = ${filters.selecionado}`);
  if (typeof filters.contratado === "boolean") condicoes.push(Prisma.sql`p.contratado = ${filters.contratado}`);
  return condicoes.length ? Prisma.sql`WHERE ${Prisma.join(condicoes, " AND ")}` : Prisma.empty;
}

function whereHistorico(filters: BancoEmpregosHistoricoFiltersInput) {
  const condicoes: Prisma.Sql[] = [];
  if (filters.entidadeTipo?.trim()) condicoes.push(Prisma.sql`h.entidade_tipo = ${filters.entidadeTipo.trim()}`);
  if (filters.candidatoId?.trim()) condicoes.push(Prisma.sql`h.candidato_id = ${BigInt(filters.candidatoId.trim())}`);
  if (filters.vagaId?.trim()) condicoes.push(Prisma.sql`h.vaga_id = ${BigInt(filters.vagaId.trim())}`);
  if (filters.processoId?.trim()) condicoes.push(Prisma.sql`h.processo_id = ${BigInt(filters.processoId.trim())}`);
  return condicoes.length ? Prisma.sql`WHERE ${Prisma.join(condicoes, " AND ")}` : Prisma.empty;
}

async function obterQuantidadeSelecionados(tx: TransactionClient, vagaId: bigint, processoIgnorado?: bigint) {
  const filtroIgnorado =
    typeof processoIgnorado === "bigint" ? Prisma.sql`AND id <> ${processoIgnorado}` : Prisma.empty;
  const rows = await tx.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`
    SELECT COUNT(*)::bigint AS total
    FROM banco_empregos_processo
    WHERE vaga_id = ${vagaId}
      AND ativo = TRUE
      AND selecionado = TRUE
      ${filtroIgnorado}
  `);
  return Number(rows[0]?.total ?? 0);
}

async function atualizarSituacaoVaga(tx: TransactionClient, vagaId: bigint) {
  const vagaRows = await tx.$queryRaw<Array<{ quantidade_vagas: number; situacao: string }>>(Prisma.sql`
    SELECT quantidade_vagas, situacao
    FROM banco_empregos_vaga
    WHERE id = ${vagaId}
    LIMIT 1
  `);
  const vaga = vagaRows[0];
  if (!vaga || vaga.situacao === "CANCELADA") {
    return;
  }

  const rows = await tx.$queryRaw<
    Array<{
      total_processos: bigint;
      total_entrevistas: bigint;
      total_selecionados: bigint;
      total_contratados: bigint;
    }>
  >(Prisma.sql`
    SELECT
      COUNT(*)::bigint AS total_processos,
      COUNT(*) FILTER (WHERE data_entrevista IS NOT NULL)::bigint AS total_entrevistas,
      COUNT(*) FILTER (WHERE selecionado = TRUE)::bigint AS total_selecionados,
      COUNT(*) FILTER (WHERE contratado = TRUE)::bigint AS total_contratados
    FROM banco_empregos_processo
    WHERE vaga_id = ${vagaId}
      AND ativo = TRUE
  `);

  const resumo = rows[0];
  const selecionados = Number(resumo?.total_selecionados ?? 0);
  const entrevistas = Number(resumo?.total_entrevistas ?? 0);
  const processos = Number(resumo?.total_processos ?? 0);
  const contratados = Number(resumo?.total_contratados ?? 0);

  let situacao = "ABERTA";
  if (contratados >= vaga.quantidade_vagas || selecionados >= vaga.quantidade_vagas) {
    situacao = "PREENCHIDA";
  } else if (entrevistas > 0) {
    situacao = "EM_ENTREVISTA";
  } else if (processos > 0) {
    situacao = "EM_TRIAGEM";
  }

  await tx.$executeRaw(Prisma.sql`
    UPDATE banco_empregos_vaga
    SET situacao = ${situacao},
        atualizado_em = NOW()
    WHERE id = ${vagaId}
  `);
}

function mapSituacaoCandidatoPorProcesso(status?: string | null, contratado?: boolean | null, selecionado?: boolean | null) {
  if (contratado || status === "CONTRATADO") return "CONTRATADO";
  if (status === "APROVADO") return "APROVADO";
  if (status === "REPROVADO") return "REPROVADO";
  if (status === "ENCAMINHADO") return "ENCAMINHADO";
  if (status === "ENTREVISTA_MARCADA") return "EM_ENTREVISTA";
  if (selecionado) return "PRE_SELECIONADO";
  return "EM_ANALISE";
}
