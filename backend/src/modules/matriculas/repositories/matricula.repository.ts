import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { normalizeDigits, toIsoDate, toOptionalDate, trimOrUndefined } from "../../../utils/string-utils.js";
import { ensureArquivosEstrutura } from "../../arquivos/repositories/arquivos-estrutura.repository.js";
import type {
  MatriculaFilaEsperaInput,
  MatriculaFilters,
  MatriculaInput,
  MatriculaInscricaoInput,
  MatriculaPresencaDataInput,
  MatriculaPresencaDataUpdateInput,
  MatriculaPresencaSalvarInput
} from "../matricula.types.js";
import type {
  MatriculaCursoRow,
  MatriculaFilaEsperaRow,
  MatriculaInscricaoRow
} from "../matricula.mapper.js";

type TransactionClient = Prisma.TransactionClient;

function joinList(values?: string[]) {
  if (!values?.length) return undefined;
  const sanitized = values.map((item) => item.trim()).filter(Boolean);
  return sanitized.length ? sanitized.join(";") : undefined;
}

function toOptionalDateTime(value?: string | null): Date | null {
  if (!value) return null;
  const texto = value.trim();
  if (!texto) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    const isoDate = new Date(`${texto}T00:00:00.000Z`);
    return Number.isNaN(isoDate.getTime()) ? null : isoDate;
  }

  const parsed = new Date(texto);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

type MatriculaPresencaDataRow = {
  id: bigint;
  data_aula: Date;
  status: string;
  observacoes: string | null;
  total_presencas: bigint | number | null;
  total_anexos: bigint | number | null;
  criado_em: Date;
  atualizado_em: Date;
};

type MatriculaPresencaItemRow = {
  beneficiario_id: bigint | null;
  matricula_id: bigint;
  beneficiario_nome: string;
  cpf: string | null;
  data_nascimento: Date | null;
  status: string;
  observacao: string | null;
};

type UsuarioRegistro = {
  id?: bigint;
  nome?: string;
};

export function montarAuditoriaPresenca(payload: {
  tenantId: string;
  cursoId: bigint;
  presencaDataId: bigint;
  dataAula: Date;
  matriculaId: bigint;
  beneficiarioId?: bigint | null;
  beneficiarioNome: string;
  cpf?: string | null;
  statusAnterior: string | null;
  statusNovo: string;
  observacao?: string | null;
  usuarioId?: bigint;
  usuarioNome?: string;
}) {
  return {
    tenant_id: payload.tenantId,
    beneficiario_id: payload.beneficiarioId ?? null,
    entidade: "PRESENCA_MATRICULA",
    entidade_id: payload.presencaDataId,
    acao: payload.statusAnterior ? "ATUALIZAR" : "CRIAR",
    descricao: payload.statusAnterior
      ? `Presença atualizada de ${payload.statusAnterior} para ${payload.statusNovo}.`
      : `Presença registrada como ${payload.statusNovo}.`,
    dados_novos: {
      tenantId: payload.tenantId,
      cursoId: payload.cursoId.toString(),
      presencaDataId: payload.presencaDataId.toString(),
      dataAula: payload.dataAula.toISOString(),
      matriculaId: payload.matriculaId.toString(),
      beneficiarioId: payload.beneficiarioId?.toString() ?? null,
      beneficiarioNome: payload.beneficiarioNome,
      cpf: payload.cpf ?? null,
      statusAnterior: payload.statusAnterior,
      statusNovo: payload.statusNovo,
      observacao: payload.observacao ?? null,
      usuarioId: payload.usuarioId?.toString() ?? null,
      usuarioNome: payload.usuarioNome ?? null
    },
    usuario_id: payload.usuarioId ?? null,
    usuario_nome: payload.usuarioNome ?? null
  };
}

function calcularVagasPorHorario(input: MatriculaInput) {
  if (!input.controle_horario_atendimento) return input.vagas_totais;
  const inicio = input.horario_inicial ? input.horario_inicial.split(":").map(Number) : [];
  const fim = input.horario_final_atendimento ? input.horario_final_atendimento.split(":").map(Number) : [];
  const intervalo = Number(input.duracao_horas ?? 0);
  const inicioMinutos = (inicio[0] ?? 0) * 60 + (inicio[1] ?? 0);
  const fimMinutos = (fim[0] ?? 0) * 60 + (fim[1] ?? 0);
  if (fimMinutos <= inicioMinutos || intervalo <= 0) return input.vagas_totais;
  return Math.floor((fimMinutos - inicioMinutos) / intervalo);
}

function validarHorariosInscricoes(input: MatriculaInput) {
  if (!input.controle_horario_atendimento) return;

  const inicio = input.horario_inicial ? input.horario_inicial.split(":").map(Number) : [];
  const fim = input.horario_final_atendimento ? input.horario_final_atendimento.split(":").map(Number) : [];
  const intervalo = Number(input.duracao_horas ?? input.intervalo_atendimento_minutos ?? 0);
  const inicioMinutos = (inicio[0] ?? 0) * 60 + (inicio[1] ?? 0);
  const fimMinutos = (fim[0] ?? 0) * 60 + (fim[1] ?? 0);
  const horariosPermitidos = new Set<string>();

  if (fimMinutos > inicioMinutos && intervalo > 0) {
    for (let minuto = inicioMinutos; minuto + intervalo <= fimMinutos; minuto += intervalo) {
      horariosPermitidos.add(`${String(Math.floor(minuto / 60)).padStart(2, "0")}:${String(minuto % 60).padStart(2, "0")}`);
    }
  }

  const utilizados = new Set<string>();
  for (const inscricao of input.matriculas ?? []) {
    if ((inscricao.status ?? "ATIVO").trim().toUpperCase() === "CANCELADO") continue;
    const data = inscricao.data_agendada?.trim();
    const hora = inscricao.hora_agendada?.trim().slice(0, 5);
    if (!data || !hora) {
      throw new AppError("No controle por horário, informe a data e o horário de cada atendimento ativo.", 422);
    }
    if (horariosPermitidos.size === 0 || !horariosPermitidos.has(hora)) {
      throw new AppError(`O horário ${hora} não pertence aos horários disponíveis do atendimento.`, 422);
    }
    const chave = `${data}|${hora}`;
    if (utilizados.has(chave)) {
      throw new AppError(`O horário ${hora} da data ${data} já está utilizado. Escolha outro horário disponível.`, 409);
    }
    utilizados.add(chave);
  }
}

type MatriculaResumoRow = {
  cursos_no_catalogo: bigint | number | null;
  total_vagas: bigint | number | null;
  vagas_disponiveis: bigint | number | null;
  inscricoes_ativas: bigint | number | null;
};

const estruturaMatriculasSql = [
  `
    CREATE TABLE IF NOT EXISTS cursos_atendimentos (
      id BIGSERIAL PRIMARY KEY,
      tenant_id UUID,
      tipo VARCHAR(20) NOT NULL,
      nome VARCHAR(200) NOT NULL,
      descricao TEXT,
      imagem TEXT,
      vagas_totais INTEGER NOT NULL DEFAULT 0,
      vagas_disponiveis INTEGER NOT NULL DEFAULT 0,
      carga_horaria INTEGER,
      horario_inicial TIME,
      controle_horario_atendimento BOOLEAN NOT NULL DEFAULT FALSE,
      horario_final_atendimento TIME,
      intervalo_atendimento_minutos INTEGER,
      duracao_horas INTEGER NOT NULL DEFAULT 0,
      dias_semana TEXT,
      faixa_etaria TEXT,
      vaga_preferencial_idosos BOOLEAN NOT NULL DEFAULT FALSE,
      sexo_permitido VARCHAR(20),
      restricoes TEXT,
      profissional VARCHAR(150),
      instituicao_parceira VARCHAR(200),
      sala_id BIGINT REFERENCES salas_unidade(id) ON DELETE SET NULL,
      status VARCHAR(30) NOT NULL,
      data_triagem DATE,
      data_encaminhamento DATE,
      data_conclusao DATE,
      criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
      atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `,
  "ALTER TABLE cursos_atendimentos ADD COLUMN IF NOT EXISTS tenant_id UUID",
  "ALTER TABLE cursos_atendimentos ADD COLUMN IF NOT EXISTS tipo VARCHAR(20)",
  "ALTER TABLE cursos_atendimentos ADD COLUMN IF NOT EXISTS nome VARCHAR(200)",
  "ALTER TABLE cursos_atendimentos ADD COLUMN IF NOT EXISTS descricao TEXT",
  "ALTER TABLE cursos_atendimentos ADD COLUMN IF NOT EXISTS imagem TEXT",
  "ALTER TABLE cursos_atendimentos ADD COLUMN IF NOT EXISTS vagas_totais INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE cursos_atendimentos ADD COLUMN IF NOT EXISTS vagas_disponiveis INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE cursos_atendimentos ADD COLUMN IF NOT EXISTS carga_horaria INTEGER",
  "ALTER TABLE cursos_atendimentos ADD COLUMN IF NOT EXISTS horario_inicial TIME",
  "ALTER TABLE cursos_atendimentos ADD COLUMN IF NOT EXISTS controle_horario_atendimento BOOLEAN NOT NULL DEFAULT FALSE",
  "ALTER TABLE cursos_atendimentos ADD COLUMN IF NOT EXISTS horario_final_atendimento TIME",
  "ALTER TABLE cursos_atendimentos ADD COLUMN IF NOT EXISTS intervalo_atendimento_minutos INTEGER",
  "ALTER TABLE cursos_atendimentos ADD COLUMN IF NOT EXISTS duracao_horas INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE cursos_atendimentos ADD COLUMN IF NOT EXISTS dias_semana TEXT",
  "ALTER TABLE cursos_atendimentos ADD COLUMN IF NOT EXISTS faixa_etaria TEXT",
  "ALTER TABLE cursos_atendimentos ADD COLUMN IF NOT EXISTS vaga_preferencial_idosos BOOLEAN NOT NULL DEFAULT FALSE",
  "ALTER TABLE cursos_atendimentos ADD COLUMN IF NOT EXISTS sexo_permitido VARCHAR(20)",
  "ALTER TABLE cursos_atendimentos ADD COLUMN IF NOT EXISTS restricoes TEXT",
  "ALTER TABLE cursos_atendimentos ADD COLUMN IF NOT EXISTS profissional VARCHAR(150)",
  "ALTER TABLE cursos_atendimentos ADD COLUMN IF NOT EXISTS instituicao_parceira VARCHAR(200)",
  "ALTER TABLE cursos_atendimentos ADD COLUMN IF NOT EXISTS sala_id BIGINT",
  "ALTER TABLE cursos_atendimentos ADD COLUMN IF NOT EXISTS status VARCHAR(30)",
  "ALTER TABLE cursos_atendimentos ADD COLUMN IF NOT EXISTS data_triagem DATE",
  "ALTER TABLE cursos_atendimentos ADD COLUMN IF NOT EXISTS data_encaminhamento DATE",
  "ALTER TABLE cursos_atendimentos ADD COLUMN IF NOT EXISTS data_conclusao DATE",
  "ALTER TABLE cursos_atendimentos ADD COLUMN IF NOT EXISTS criado_em TIMESTAMP NOT NULL DEFAULT NOW()",
  "ALTER TABLE cursos_atendimentos ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()",
  "ALTER TABLE salas_unidade ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT TRUE",
  "CREATE INDEX IF NOT EXISTS cursos_atendimentos_tenant_idx ON cursos_atendimentos (tenant_id, nome)",
  "CREATE INDEX IF NOT EXISTS cursos_atendimentos_status_idx ON cursos_atendimentos (status)",
  "CREATE INDEX IF NOT EXISTS cursos_atendimentos_sala_idx ON cursos_atendimentos (sala_id)",
  `
    CREATE TABLE IF NOT EXISTS cursos_atendimentos_matriculas (
      id BIGSERIAL PRIMARY KEY,
      tenant_id UUID,
      curso_id BIGINT NOT NULL REFERENCES cursos_atendimentos(id) ON DELETE CASCADE,
      beneficiario_nome VARCHAR(200) NOT NULL,
      cpf VARCHAR(20),
      email VARCHAR(150),
      status VARCHAR(20) NOT NULL,
      data_matricula TIMESTAMP NOT NULL DEFAULT NOW(),
      data_agendada DATE,
      hora_agendada TIME,
      status_agendamento VARCHAR(30),
      profissional_id VARCHAR(40),
      profissional_nome VARCHAR(200),
      profissional_tipo VARCHAR(20),
      confirmacao_presenca BOOLEAN NOT NULL DEFAULT FALSE
    )
  `,
  "ALTER TABLE cursos_atendimentos_matriculas ADD COLUMN IF NOT EXISTS tenant_id UUID",
  "ALTER TABLE cursos_atendimentos_matriculas ADD COLUMN IF NOT EXISTS curso_id BIGINT",
  "ALTER TABLE cursos_atendimentos_matriculas ADD COLUMN IF NOT EXISTS beneficiario_nome VARCHAR(200)",
  "ALTER TABLE cursos_atendimentos_matriculas ADD COLUMN IF NOT EXISTS cpf VARCHAR(20)",
  "ALTER TABLE cursos_atendimentos_matriculas ADD COLUMN IF NOT EXISTS email VARCHAR(150)",
  "ALTER TABLE cursos_atendimentos_matriculas ADD COLUMN IF NOT EXISTS status VARCHAR(20)",
  "ALTER TABLE cursos_atendimentos_matriculas ALTER COLUMN status TYPE VARCHAR(80)",
  "ALTER TABLE cursos_atendimentos_matriculas ADD COLUMN IF NOT EXISTS data_matricula TIMESTAMP NOT NULL DEFAULT NOW()",
  "ALTER TABLE cursos_atendimentos_matriculas ADD COLUMN IF NOT EXISTS data_agendada DATE",
  "ALTER TABLE cursos_atendimentos_matriculas ADD COLUMN IF NOT EXISTS hora_agendada TIME",
  "ALTER TABLE cursos_atendimentos_matriculas ADD COLUMN IF NOT EXISTS status_agendamento VARCHAR(30)",
  "ALTER TABLE cursos_atendimentos_matriculas ADD COLUMN IF NOT EXISTS profissional_id VARCHAR(40)",
  "ALTER TABLE cursos_atendimentos_matriculas ADD COLUMN IF NOT EXISTS profissional_nome VARCHAR(200)",
  "ALTER TABLE cursos_atendimentos_matriculas ADD COLUMN IF NOT EXISTS profissional_tipo VARCHAR(20)",
  "ALTER TABLE cursos_atendimentos_matriculas ALTER COLUMN profissional_tipo TYPE VARCHAR(80)",
  "ALTER TABLE cursos_atendimentos_matriculas ADD COLUMN IF NOT EXISTS confirmacao_presenca BOOLEAN NOT NULL DEFAULT FALSE",
  "CREATE INDEX IF NOT EXISTS cursos_atendimentos_matriculas_tenant_curso_idx ON cursos_atendimentos_matriculas (tenant_id, curso_id)",
  "CREATE UNIQUE INDEX IF NOT EXISTS cursos_atendimentos_matriculas_horario_uidx ON cursos_atendimentos_matriculas (tenant_id, curso_id, data_agendada, hora_agendada) WHERE COALESCE(UPPER(status), 'ATIVO') <> 'CANCELADO' AND data_agendada IS NOT NULL AND hora_agendada IS NOT NULL",
  `
    CREATE TABLE IF NOT EXISTS cursos_atendimentos_fila_espera (
      id BIGSERIAL PRIMARY KEY,
      tenant_id UUID,
      curso_id BIGINT NOT NULL REFERENCES cursos_atendimentos(id) ON DELETE CASCADE,
      beneficiario_nome VARCHAR(200) NOT NULL,
      cpf VARCHAR(20),
      data_entrada TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `,
  "ALTER TABLE cursos_atendimentos_fila_espera ADD COLUMN IF NOT EXISTS tenant_id UUID",
  "ALTER TABLE cursos_atendimentos_fila_espera ADD COLUMN IF NOT EXISTS curso_id BIGINT",
  "ALTER TABLE cursos_atendimentos_fila_espera ADD COLUMN IF NOT EXISTS beneficiario_nome VARCHAR(200)",
  "ALTER TABLE cursos_atendimentos_fila_espera ADD COLUMN IF NOT EXISTS cpf VARCHAR(20)",
  "ALTER TABLE cursos_atendimentos_fila_espera ADD COLUMN IF NOT EXISTS data_entrada TIMESTAMP NOT NULL DEFAULT NOW()",
  "CREATE INDEX IF NOT EXISTS cursos_atendimentos_fila_espera_tenant_curso_idx ON cursos_atendimentos_fila_espera (tenant_id, curso_id)",
  `
    CREATE TABLE IF NOT EXISTS cursos_atendimentos_presencas (
      id BIGSERIAL PRIMARY KEY,
      tenant_id UUID,
      curso_id BIGINT NOT NULL REFERENCES cursos_atendimentos(id) ON DELETE CASCADE,
      matricula_id BIGINT NOT NULL REFERENCES cursos_atendimentos_matriculas(id) ON DELETE CASCADE,
      data_aula DATE NOT NULL,
      status VARCHAR(20) NOT NULL,
      observacao TEXT,
      criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
      atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE (curso_id, matricula_id, data_aula)
    )
  `,
  "ALTER TABLE cursos_atendimentos_presencas ADD COLUMN IF NOT EXISTS tenant_id UUID",
  "ALTER TABLE cursos_atendimentos_presencas ADD COLUMN IF NOT EXISTS curso_id BIGINT",
  "ALTER TABLE cursos_atendimentos_presencas ADD COLUMN IF NOT EXISTS matricula_id BIGINT",
  "ALTER TABLE cursos_atendimentos_presencas ADD COLUMN IF NOT EXISTS data_aula DATE",
  "ALTER TABLE cursos_atendimentos_presencas ADD COLUMN IF NOT EXISTS status VARCHAR(20)",
  "ALTER TABLE cursos_atendimentos_presencas ADD COLUMN IF NOT EXISTS observacao TEXT",
  "ALTER TABLE cursos_atendimentos_presencas ALTER COLUMN status TYPE VARCHAR(20)",
  "ALTER TABLE cursos_atendimentos_presencas ADD COLUMN IF NOT EXISTS usuario_registro_id BIGINT",
  "ALTER TABLE cursos_atendimentos_presencas ADD COLUMN IF NOT EXISTS usuario_registro_nome VARCHAR(160)",
  "ALTER TABLE cursos_atendimentos_presencas ADD COLUMN IF NOT EXISTS data_hora_registro TIMESTAMP NOT NULL DEFAULT NOW()",
  "ALTER TABLE cursos_atendimentos_presencas ADD COLUMN IF NOT EXISTS data_hora_atualizacao TIMESTAMP NOT NULL DEFAULT NOW()",
  "ALTER TABLE cursos_atendimentos_presencas ADD COLUMN IF NOT EXISTS criado_em TIMESTAMP NOT NULL DEFAULT NOW()",
  "ALTER TABLE cursos_atendimentos_presencas ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()",
  "ALTER TABLE cursos_atendimentos_presencas DROP CONSTRAINT IF EXISTS cursos_atendimentos_presencas_curso_id_matricula_id_data_aula_key",
  "DROP INDEX IF EXISTS cursos_atendimentos_presencas_curso_id_matricula_id_data_aula_key",
  "CREATE UNIQUE INDEX IF NOT EXISTS cursos_atendimentos_presencas_tenant_curso_matricula_data_uidx ON cursos_atendimentos_presencas (tenant_id, curso_id, matricula_id, data_aula)",
  "CREATE INDEX IF NOT EXISTS cursos_atendimentos_presencas_tenant_curso_data_idx ON cursos_atendimentos_presencas (tenant_id, curso_id, data_aula)",
  `
    CREATE TABLE IF NOT EXISTS cursos_atendimentos_presenca_datas (
      id BIGSERIAL PRIMARY KEY,
      tenant_id UUID,
      curso_id BIGINT NOT NULL REFERENCES cursos_atendimentos(id) ON DELETE CASCADE,
      data_aula DATE NOT NULL,
      status VARCHAR(20) NOT NULL,
      observacoes TEXT,
      criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
      atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE (tenant_id, curso_id, data_aula)
    )
  `,
  "ALTER TABLE cursos_atendimentos_presenca_datas ADD COLUMN IF NOT EXISTS tenant_id UUID",
  "ALTER TABLE cursos_atendimentos_presenca_datas ADD COLUMN IF NOT EXISTS curso_id BIGINT",
  "ALTER TABLE cursos_atendimentos_presenca_datas ADD COLUMN IF NOT EXISTS data_aula DATE",
  "ALTER TABLE cursos_atendimentos_presenca_datas ADD COLUMN IF NOT EXISTS status VARCHAR(20)",
  "ALTER TABLE cursos_atendimentos_presenca_datas ADD COLUMN IF NOT EXISTS observacoes TEXT",
  "ALTER TABLE cursos_atendimentos_presenca_datas ADD COLUMN IF NOT EXISTS criado_em TIMESTAMP NOT NULL DEFAULT NOW()",
  "ALTER TABLE cursos_atendimentos_presenca_datas ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()",
  "ALTER TABLE cursos_atendimentos_presenca_datas DROP CONSTRAINT IF EXISTS cursos_atendimentos_presenca_datas_curso_id_data_aula_key",
  "DROP INDEX IF EXISTS cursos_atendimentos_presenca_datas_curso_id_data_aula_key",
  "CREATE UNIQUE INDEX IF NOT EXISTS cursos_atendimentos_presenca_datas_tenant_curso_data_uidx ON cursos_atendimentos_presenca_datas (tenant_id, curso_id, data_aula)",
  "CREATE INDEX IF NOT EXISTS cursos_atendimentos_presenca_datas_tenant_curso_data_idx ON cursos_atendimentos_presenca_datas (tenant_id, curso_id, data_aula)",
  `
    CREATE TABLE IF NOT EXISTS cursos_atendimentos_presenca_anexos (
      id BIGSERIAL PRIMARY KEY,
      tenant_id UUID,
      presenca_data_id BIGINT NOT NULL REFERENCES cursos_atendimentos_presenca_datas(id) ON DELETE CASCADE,
      nome_arquivo VARCHAR(200) NOT NULL,
      tipo_mime VARCHAR(120) NOT NULL,
      tamanho VARCHAR(40),
      caminho_arquivo TEXT,
      data_upload DATE NOT NULL,
      usuario VARCHAR(120) NOT NULL,
      criado_em TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `,
  "ALTER TABLE cursos_atendimentos_presenca_anexos ADD COLUMN IF NOT EXISTS tenant_id UUID",
  "ALTER TABLE cursos_atendimentos_presenca_anexos ADD COLUMN IF NOT EXISTS presenca_data_id BIGINT",
  "ALTER TABLE cursos_atendimentos_presenca_anexos ADD COLUMN IF NOT EXISTS nome_arquivo VARCHAR(200)",
  "ALTER TABLE cursos_atendimentos_presenca_anexos ADD COLUMN IF NOT EXISTS tipo_mime VARCHAR(120)",
  "ALTER TABLE cursos_atendimentos_presenca_anexos ADD COLUMN IF NOT EXISTS tamanho VARCHAR(40)",
  "ALTER TABLE cursos_atendimentos_presenca_anexos ADD COLUMN IF NOT EXISTS caminho_arquivo TEXT",
  "ALTER TABLE cursos_atendimentos_presenca_anexos ADD COLUMN IF NOT EXISTS data_upload DATE",
  "ALTER TABLE cursos_atendimentos_presenca_anexos ADD COLUMN IF NOT EXISTS usuario VARCHAR(120)",
  "ALTER TABLE cursos_atendimentos_presenca_anexos ADD COLUMN IF NOT EXISTS criado_em TIMESTAMP NOT NULL DEFAULT NOW()",
  "CREATE INDEX IF NOT EXISTS cursos_atendimentos_presenca_anexos_data_idx ON cursos_atendimentos_presenca_anexos (presenca_data_id, data_upload DESC)",
  `
    UPDATE cursos_atendimentos c
    SET tenant_id = ref.tenant_id
    FROM (
      SELECT tenant_id
      FROM instituicoes
      WHERE tenant_id IS NOT NULL
      ORDER BY criado_em ASC
      LIMIT 1
    ) ref
    WHERE c.tenant_id IS NULL
  `,
  `
    UPDATE cursos_atendimentos_matriculas m
    SET tenant_id = c.tenant_id
    FROM cursos_atendimentos c
    WHERE m.tenant_id IS NULL
      AND c.id = m.curso_id
      AND c.tenant_id IS NOT NULL
  `,
  `
    UPDATE cursos_atendimentos_fila_espera f
    SET tenant_id = c.tenant_id
    FROM cursos_atendimentos c
    WHERE f.tenant_id IS NULL
      AND c.id = f.curso_id
      AND c.tenant_id IS NOT NULL
  `,
  `
    UPDATE cursos_atendimentos_presencas p
    SET tenant_id = c.tenant_id
    FROM cursos_atendimentos c
    WHERE p.tenant_id IS NULL
      AND c.id = p.curso_id
      AND c.tenant_id IS NOT NULL
  `,
  `
    UPDATE cursos_atendimentos_presenca_datas pd
    SET tenant_id = c.tenant_id
    FROM cursos_atendimentos c
    WHERE pd.tenant_id IS NULL
      AND c.id = pd.curso_id
      AND c.tenant_id IS NOT NULL
  `,
  `
    UPDATE cursos_atendimentos_presenca_anexos pa
    SET tenant_id = pd.tenant_id
    FROM cursos_atendimentos_presenca_datas pd
    WHERE pa.tenant_id IS NULL
      AND pd.id = pa.presenca_data_id
      AND pd.tenant_id IS NOT NULL
  `
];

let estruturaPromise: Promise<void> | null = null;

export class MatriculaRepository {
  async ensureEstrutura() {
    if (!estruturaPromise) {
      estruturaPromise = (async () => {
        await ensureArquivosEstrutura(prisma);
        for (const [indice, comando] of estruturaMatriculasSql.entries()) {
          try {
            await prisma.$executeRawUnsafe(comando);
          } catch (error) {
            estruturaPromise = null;
            console.error(`[matriculas] falha ao garantir estrutura (comando ${indice + 1}/${estruturaMatriculasSql.length})`);
            console.error(comando.trim());
            throw error;
          }
        }
      })();
    }

    await estruturaPromise;
  }

  async listar(filters: MatriculaFilters, tenantId: string) {
    await this.ensureEstrutura();
    const where: Prisma.Sql[] = [];
    const tenantClause = Prisma.sql`AND c.tenant_id::text = ${tenantId}`;

    const nome = trimOrUndefined(filters.nome);
    if (nome) {
      where.push(Prisma.sql`AND c.nome ILIKE ${`%${nome}%`}`);
    }

    const tipo = trimOrUndefined(filters.tipo);
    if (tipo) {
      where.push(Prisma.sql`AND c.tipo ILIKE ${`%${tipo}%`}`);
    }

    const status = trimOrUndefined(filters.status);
    if (status) {
      where.push(Prisma.sql`AND c.status ILIKE ${`%${status}%`}`);
    }

    const profissional = trimOrUndefined(filters.profissional);
    if (profissional) {
      where.push(Prisma.sql`AND c.profissional ILIKE ${`%${profissional}%`}`);
    }

    const beneficiario = trimOrUndefined(filters.beneficiario);
    if (beneficiario) {
      where.push(
        Prisma.sql`AND (
          EXISTS (
            SELECT 1
            FROM cursos_atendimentos_matriculas m
            WHERE m.curso_id = c.id
              AND m.tenant_id::text = ${tenantId}
              AND m.beneficiario_nome ILIKE ${`%${beneficiario}%`}
          )
          OR EXISTS (
            SELECT 1
            FROM cursos_atendimentos_fila_espera f
            WHERE f.curso_id = c.id
              AND f.tenant_id::text = ${tenantId}
              AND f.beneficiario_nome ILIKE ${`%${beneficiario}%`}
          )
        )`
      );
    }

    const whereClause =
      where.length === 0
        ? Prisma.empty
        : where.length === 1
          ? where[0]
          : Prisma.sql`${Prisma.join(where, " ")}`;

    const cursos = await prisma.$queryRaw<MatriculaCursoRow[]>(Prisma.sql`
      SELECT
        c.id,
        c.tipo,
        c.nome,
        c.descricao,
        c.imagem,
        img.thumbnail_caminho AS imagem_thumbnail,
        c.vagas_totais,
        c.vagas_disponiveis,
        c.carga_horaria,
        c.horario_inicial,
        c.controle_horario_atendimento,
        c.horario_final_atendimento,
        c.intervalo_atendimento_minutos,
        c.duracao_horas,
        c.dias_semana,
        c.faixa_etaria,
        c.vaga_preferencial_idosos,
        c.sexo_permitido,
        c.restricoes,
        c.profissional,
        c.instituicao_parceira,
        c.sala_id,
        s.nome AS sala_nome,
        u.id AS unidade_id,
        u.nome_fantasia AS unidade_nome,
        c.status,
        c.data_triagem,
        c.data_encaminhamento,
        c.data_conclusao,
        c.criado_em,
        c.atualizado_em,
        (
          SELECT COUNT(*)
          FROM cursos_atendimentos_matriculas m
          WHERE m.curso_id = c.id
            AND m.tenant_id::text = ${tenantId}
        )::BIGINT AS total_matriculas,
        (
          SELECT COUNT(*)
          FROM cursos_atendimentos_fila_espera f
          WHERE f.curso_id = c.id
            AND f.tenant_id::text = ${tenantId}
        )::BIGINT AS total_fila_espera
      FROM cursos_atendimentos c
      LEFT JOIN salas_unidade s ON s.id = c.sala_id
      LEFT JOIN unidade_assistencial u ON u.id = s.unidade_id AND u.tenant_id::text = ${tenantId}
      LEFT JOIN LATERAL (
        SELECT a.thumbnail_caminho
        FROM arquivos a
        WHERE a.caminho_arquivo = c.imagem
          AND a.ativo = TRUE
          AND (a.tenant_id::text = ${tenantId} OR a.tenant_id IS NULL)
        LIMIT 1
      ) img ON TRUE
      WHERE 1 = 1
      ${tenantClause}
      ${whereClause}
      ORDER BY c.nome ASC
    `);

    return cursos;
  }

  async obterResumoCatalogo(tenantId: string) {
    await this.ensureEstrutura();
    const rows = await prisma.$queryRaw<MatriculaResumoRow[]>(Prisma.sql`
      SELECT
        COUNT(*)::BIGINT AS cursos_no_catalogo,
        COALESCE(SUM(COALESCE(c.vagas_totais, 0)), 0)::BIGINT AS total_vagas,
        COALESCE(SUM(COALESCE(c.vagas_disponiveis, 0)), 0)::BIGINT AS vagas_disponiveis,
        (
          SELECT COUNT(*)::BIGINT
          FROM cursos_atendimentos_matriculas
          WHERE tenant_id::text = ${tenantId}
        ) AS inscricoes_ativas
      FROM cursos_atendimentos c
      WHERE c.tenant_id::text = ${tenantId}
    `);

    const row = rows[0];
    return {
      cursosNoCatalogo: Number(row?.cursos_no_catalogo ?? 0),
      totalVagas: Number(row?.total_vagas ?? 0),
      vagasDisponiveis: Number(row?.vagas_disponiveis ?? 0),
      inscricoesAtivas: Number(row?.inscricoes_ativas ?? 0)
    };
  }

  async buscarPorId(id: bigint, tenantId: string) {
    await this.ensureEstrutura();
    const cursos = await prisma.$queryRaw<MatriculaCursoRow[]>(Prisma.sql`
      SELECT
        c.id,
        c.tipo,
        c.nome,
        c.descricao,
        c.imagem,
        img.thumbnail_caminho AS imagem_thumbnail,
        c.vagas_totais,
        c.vagas_disponiveis,
        c.carga_horaria,
        c.horario_inicial,
        c.controle_horario_atendimento,
        c.horario_final_atendimento,
        c.intervalo_atendimento_minutos,
        c.duracao_horas,
        c.dias_semana,
        c.faixa_etaria,
        c.vaga_preferencial_idosos,
        c.sexo_permitido,
        c.restricoes,
        c.profissional,
        c.instituicao_parceira,
        c.sala_id,
        s.nome AS sala_nome,
        u.id AS unidade_id,
        u.nome_fantasia AS unidade_nome,
        c.status,
        c.data_triagem,
        c.data_encaminhamento,
        c.data_conclusao,
        c.criado_em,
        c.atualizado_em,
        (
          SELECT COUNT(*)
          FROM cursos_atendimentos_matriculas m
          WHERE m.curso_id = c.id
            AND m.tenant_id::text = ${tenantId}
        )::BIGINT AS total_matriculas,
        (
          SELECT COUNT(*)
          FROM cursos_atendimentos_fila_espera f
          WHERE f.curso_id = c.id
            AND f.tenant_id::text = ${tenantId}
        )::BIGINT AS total_fila_espera
      FROM cursos_atendimentos c
      LEFT JOIN salas_unidade s ON s.id = c.sala_id
      LEFT JOIN unidade_assistencial u ON u.id = s.unidade_id AND u.tenant_id::text = ${tenantId}
      LEFT JOIN LATERAL (
        SELECT a.thumbnail_caminho
        FROM arquivos a
        WHERE a.caminho_arquivo = c.imagem
          AND a.ativo = TRUE
          AND (a.tenant_id::text = ${tenantId} OR a.tenant_id IS NULL)
        LIMIT 1
      ) img ON TRUE
      WHERE c.id = ${id}
        AND c.tenant_id::text = ${tenantId}
      LIMIT 1
    `);

    const curso = cursos[0];
    if (!curso) return null;

    const matriculas = await prisma.$queryRaw<MatriculaInscricaoRow[]>(Prisma.sql`
      SELECT
        m.id,
        m.curso_id,
        m.beneficiario_nome,
        m.cpf,
        contato.data_nascimento AS data_nascimento,
        contato.telefone_principal AS telefone,
        contato.email AS email,
        m.status,
        m.data_matricula,
        m.data_agendada,
        m.hora_agendada,
        m.status_agendamento,
        m.profissional_id,
        m.profissional_nome,
        m.profissional_tipo,
        m.confirmacao_presenca
      FROM cursos_atendimentos_matriculas m
      LEFT JOIN LATERAL (
        SELECT c.telefone_principal, c.email, b.data_nascimento
        FROM cadastro_beneficiario b
        LEFT JOIN contato_beneficiario c ON c.beneficiario_id = b.id AND c.tenant_id::text = ${tenantId}
        LEFT JOIN LATERAL (
          SELECT d.numero_documento
          FROM documentos d
          WHERE d.beneficiario_id = b.id
            AND d.tenant_id::text = ${tenantId}
            AND (
              UPPER(COALESCE(d.tipo_documento, '')) = 'CPF'
              OR UPPER(COALESCE(d.nome_documento, '')) LIKE '%CPF%'
            )
          ORDER BY d.id DESC
          LIMIT 1
        ) cpf_doc ON TRUE
        WHERE b.tenant_id::text = ${tenantId}
          AND (
            (
              regexp_replace(COALESCE(m.cpf, ''), '\\D', '', 'g') <> ''
              AND regexp_replace(COALESCE(cpf_doc.numero_documento, ''), '\\D', '', 'g') =
                regexp_replace(COALESCE(m.cpf, ''), '\\D', '', 'g')
            )
            OR (
              regexp_replace(COALESCE(m.cpf, ''), '\\D', '', 'g') = ''
              AND LOWER(TRIM(COALESCE(b.nome_completo, ''))) = LOWER(TRIM(COALESCE(m.beneficiario_nome, '')))
            )
          )
        ORDER BY c.id DESC NULLS LAST
        LIMIT 1
      ) contato ON TRUE
      WHERE m.curso_id = ${id}
        AND m.tenant_id::text = ${tenantId}
      ORDER BY m.data_matricula DESC, m.id DESC
    `);

    const filaEspera = await prisma.$queryRaw<MatriculaFilaEsperaRow[]>(Prisma.sql`
      SELECT
        f.id,
        f.curso_id,
        f.beneficiario_nome,
        f.cpf,
        contato.telefone_principal AS telefone,
        f.data_entrada
      FROM cursos_atendimentos_fila_espera f
      LEFT JOIN LATERAL (
        SELECT c.telefone_principal
        FROM cadastro_beneficiario b
        LEFT JOIN contato_beneficiario c ON c.beneficiario_id = b.id AND c.tenant_id::text = ${tenantId}
        LEFT JOIN LATERAL (
          SELECT d.numero_documento
          FROM documentos d
          WHERE d.beneficiario_id = b.id
            AND d.tenant_id::text = ${tenantId}
            AND (
              UPPER(COALESCE(d.tipo_documento, '')) = 'CPF'
              OR UPPER(COALESCE(d.nome_documento, '')) LIKE '%CPF%'
            )
          ORDER BY d.id DESC
          LIMIT 1
        ) cpf_doc ON TRUE
        WHERE b.tenant_id::text = ${tenantId}
          AND (
            (
              regexp_replace(COALESCE(f.cpf, ''), '\\D', '', 'g') <> ''
              AND regexp_replace(COALESCE(cpf_doc.numero_documento, ''), '\\D', '', 'g') =
                regexp_replace(COALESCE(f.cpf, ''), '\\D', '', 'g')
            )
            OR (
              regexp_replace(COALESCE(f.cpf, ''), '\\D', '', 'g') = ''
              AND LOWER(TRIM(COALESCE(b.nome_completo, ''))) = LOWER(TRIM(COALESCE(f.beneficiario_nome, '')))
            )
          )
        ORDER BY c.id DESC NULLS LAST
        LIMIT 1
      ) contato ON TRUE
      WHERE f.curso_id = ${id}
        AND f.tenant_id::text = ${tenantId}
      ORDER BY f.data_entrada DESC, f.id DESC
    `);

    return { curso, matriculas, filaEspera };
  }

  async buscarPorIdOuFalhar(id: bigint, tenantId: string) {
    const record = await this.buscarPorId(id, tenantId);
    if (!record) {
      throw new AppError("Registro de matricula nao encontrado.", 404);
    }
    return record;
  }

  async criar(input: MatriculaInput, tenantId: string) {
    await this.ensureEstrutura();
    validarHorariosInscricoes(input);
    const cursoId = await prisma.$transaction(async (tx) => {
      const diasSemana = joinList(input.dias_semana);
      const faixaEtaria = joinList(input.faixa_etaria);
      const vagasTotais = calcularVagasPorHorario(input);
      const totalInscritosAtivos = (input.matriculas ?? []).filter((item) => (item.status ?? "ATIVO").trim().toUpperCase() === "ATIVO").length;
      const vagasDisponiveis = input.controle_horario_atendimento
        ? Math.max(vagasTotais - totalInscritosAtivos, 0)
        : input.vagas_disponiveis ?? vagasTotais;
      const dataTriagem = toOptionalDate(input.data_triagem) ?? null;
      const dataEncaminhamento = toOptionalDate(input.data_encaminhamento) ?? null;
      const dataConclusao = toOptionalDate(input.data_conclusao) ?? null;

      const inserted = await tx.$queryRaw<{ id: bigint }[]>(Prisma.sql`
        INSERT INTO cursos_atendimentos (
          tenant_id,
          tipo,
          nome,
          descricao,
          imagem,
          vagas_totais,
          vagas_disponiveis,
          carga_horaria,
          horario_inicial,
          controle_horario_atendimento,
          horario_final_atendimento,
          intervalo_atendimento_minutos,
          duracao_horas,
          dias_semana,
          faixa_etaria,
          vaga_preferencial_idosos,
          sexo_permitido,
          restricoes,
          profissional,
          instituicao_parceira,
          sala_id,
          status,
          data_triagem,
          data_encaminhamento,
          data_conclusao,
          criado_em,
          atualizado_em
        ) VALUES (
          ${tenantId}::uuid,
          ${input.tipo},
          ${input.nome},
          ${trimOrUndefined(input.descricao)},
          ${trimOrUndefined(input.imagem)},
          ${vagasTotais},
          ${vagasDisponiveis},
          ${input.carga_horaria ?? null},
          CAST(${trimOrUndefined(input.horario_inicial) ?? null} AS TIME),
          ${!!input.controle_horario_atendimento},
          CAST(${trimOrUndefined(input.horario_final_atendimento) ?? null} AS TIME),
          ${input.intervalo_atendimento_minutos ?? null},
          ${input.duracao_horas},
          ${diasSemana},
          ${faixaEtaria},
          ${!!input.vaga_preferencial_idosos},
          ${trimOrUndefined(input.sexo_permitido)},
          ${trimOrUndefined(input.restricoes)},
          ${trimOrUndefined(input.profissional)},
          ${trimOrUndefined(input.instituicao_parceira)},
          ${input.sala_id ? BigInt(input.sala_id) : null},
          ${input.status},
          ${dataTriagem},
          ${dataEncaminhamento},
          ${dataConclusao},
          NOW(),
          NOW()
        )
        RETURNING id
      `);

      const cursoId = inserted[0]?.id;
      if (!cursoId) {
        throw new AppError("Nao foi possivel criar a matricula.", 500);
      }

      await this.inserirMatriculas(tx, cursoId, input.matriculas ?? [], tenantId);
      await this.inserirFilaEspera(tx, cursoId, input.fila_espera ?? [], tenantId);

      return cursoId;
    });

    return this.buscarPorIdOuFalhar(cursoId, tenantId);
  }

  async atualizar(id: bigint, input: MatriculaInput, tenantId: string) {
    await this.ensureEstrutura();
    validarHorariosInscricoes(input);
    await this.buscarPorIdOuFalhar(id, tenantId);

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`
        SELECT id FROM cursos_atendimentos
        WHERE id = ${id} AND tenant_id::text = ${tenantId}
        FOR UPDATE
      `);
      const diasSemana = joinList(input.dias_semana);
      const faixaEtaria = joinList(input.faixa_etaria);
      const vagasTotais = calcularVagasPorHorario(input);
      const totalInscritosAtivos = (input.matriculas ?? []).filter((item) => (item.status ?? "ATIVO").trim().toUpperCase() === "ATIVO").length;
      const vagasDisponiveis = input.controle_horario_atendimento
        ? Math.max(vagasTotais - totalInscritosAtivos, 0)
        : input.vagas_disponiveis ?? vagasTotais;
      const dataTriagem = toOptionalDate(input.data_triagem) ?? null;
      const dataEncaminhamento = toOptionalDate(input.data_encaminhamento) ?? null;
      const dataConclusao = toOptionalDate(input.data_conclusao) ?? null;

      await tx.$executeRaw(Prisma.sql`
        UPDATE cursos_atendimentos
        SET
          tipo = ${input.tipo},
          nome = ${input.nome},
          descricao = ${trimOrUndefined(input.descricao)},
          imagem = ${trimOrUndefined(input.imagem)},
          vagas_totais = ${vagasTotais},
          vagas_disponiveis = ${vagasDisponiveis},
          carga_horaria = ${input.carga_horaria ?? null},
          horario_inicial = CAST(${trimOrUndefined(input.horario_inicial) ?? null} AS TIME),
          controle_horario_atendimento = ${!!input.controle_horario_atendimento},
          horario_final_atendimento = CAST(${trimOrUndefined(input.horario_final_atendimento) ?? null} AS TIME),
          intervalo_atendimento_minutos = ${input.intervalo_atendimento_minutos ?? null},
          duracao_horas = ${input.duracao_horas},
          dias_semana = ${diasSemana},
          faixa_etaria = ${faixaEtaria},
          vaga_preferencial_idosos = ${!!input.vaga_preferencial_idosos},
          sexo_permitido = ${trimOrUndefined(input.sexo_permitido)},
          restricoes = ${trimOrUndefined(input.restricoes)},
          profissional = ${trimOrUndefined(input.profissional)},
          instituicao_parceira = ${trimOrUndefined(input.instituicao_parceira)},
          sala_id = ${input.sala_id ? BigInt(input.sala_id) : null},
          status = ${input.status},
          data_triagem = ${dataTriagem},
          data_encaminhamento = ${dataEncaminhamento},
          data_conclusao = ${dataConclusao},
          atualizado_em = NOW()
        WHERE id = ${id}
          AND tenant_id::text = ${tenantId}
      `);

      await tx.$executeRaw(Prisma.sql`
        DELETE FROM cursos_atendimentos_matriculas
        WHERE curso_id = ${id}
          AND tenant_id::text = ${tenantId}
      `);

      await tx.$executeRaw(Prisma.sql`
        DELETE FROM cursos_atendimentos_fila_espera
        WHERE curso_id = ${id}
          AND tenant_id::text = ${tenantId}
      `);

      await this.inserirMatriculas(tx, id, input.matriculas ?? [], tenantId);
      await this.inserirFilaEspera(tx, id, input.fila_espera ?? [], tenantId);
    });

    return this.buscarPorIdOuFalhar(id, tenantId);
  }

  async remover(id: bigint, tenantId: string) {
    await this.ensureEstrutura();
    await this.buscarPorIdOuFalhar(id, tenantId);
    await prisma.$executeRaw(Prisma.sql`
      DELETE FROM cursos_atendimentos
      WHERE id = ${id}
        AND tenant_id::text = ${tenantId}
    `);
  }

  async listarBeneficiarios(termo: string | undefined, tenantId: string) {
    await this.ensureEstrutura();
    const termoSanitizado = trimOrUndefined(termo);
    const termoLike = termoSanitizado ? `%${termoSanitizado}%` : undefined;
    const termoDigits = termoSanitizado ? normalizeDigits(termoSanitizado) : undefined;
    const termoCpfLike = termoDigits ? `%${termoDigits}%` : undefined;
    const filtroCpf = termoCpfLike
      ? Prisma.sql`OR regexp_replace(COALESCE(cpf_doc.numero_documento, ''), '\\D', '', 'g') LIKE ${termoCpfLike}`
      : Prisma.empty;
    const filtroBusca = termoLike
      ? Prisma.sql`
        AND (
          b.nome_completo ILIKE ${termoLike}
          OR b.codigo ILIKE ${termoLike}
          ${filtroCpf}
        )
      `
      : Prisma.empty;

    return prisma.$queryRaw<
      Array<{ id: bigint; nome_completo: string; cpf: string | null; codigo: string | null; telefone: string | null; email: string | null }>
    >(Prisma.sql`
      SELECT
        b.id,
        b.nome_completo,
        b.codigo,
        cpf_doc.numero_documento AS cpf,
        contato.telefone_principal AS telefone,
        contato.email AS email
      FROM cadastro_beneficiario b
      LEFT JOIN LATERAL (
        SELECT c.telefone_principal, c.email
        FROM contato_beneficiario c
        WHERE c.beneficiario_id = b.id
          AND c.tenant_id::text = ${tenantId}
        ORDER BY c.id DESC
        LIMIT 1
      ) contato ON TRUE
      LEFT JOIN LATERAL (
        SELECT d.numero_documento
        FROM documentos d
        WHERE d.beneficiario_id = b.id
          AND d.tenant_id::text = ${tenantId}
          AND (
            UPPER(COALESCE(d.tipo_documento, '')) = 'CPF'
            OR UPPER(COALESCE(d.nome_documento, '')) LIKE '%CPF%'
          )
        ORDER BY d.id DESC
        LIMIT 1
      ) cpf_doc ON TRUE
      WHERE 1 = 1
        AND b.tenant_id::text = ${tenantId}
      ${filtroBusca}
      ORDER BY b.nome_completo ASC
      LIMIT 20
    `);
  }

  async listarProfissionais(termo: string | undefined, tenantId: string) {
    await this.ensureEstrutura();
    const termoSanitizado = trimOrUndefined(termo);

    const termoLike = termoSanitizado ? `%${termoSanitizado}%` : undefined;
    const filtroProfissional = termoLike
      ? Prisma.sql`AND (nome_completo ILIKE ${termoLike} OR categoria ILIKE ${termoLike})`
      : Prisma.empty;
    const filtroVoluntario = termoLike
      ? Prisma.sql`AND (nome_completo ILIKE ${termoLike} OR profissao ILIKE ${termoLike} OR area_interesse ILIKE ${termoLike})`
      : Prisma.empty;

    return prisma.$queryRaw<Array<{ id: bigint; nome_completo: string; categoria: string }>>(Prisma.sql`
      SELECT id, nome_completo, categoria
      FROM (
        SELECT
          id,
          nome_completo,
          COALESCE(categoria, 'Profissional') AS categoria
        FROM cadastro_profissionais
        WHERE 1 = 1
        ${filtroProfissional}

        UNION ALL

        SELECT
          id,
          nome_completo,
          CASE
            WHEN COALESCE(TRIM(profissao), '') <> '' THEN 'Voluntariado - ' || TRIM(profissao)
            ELSE 'Voluntariado'
          END AS categoria
        FROM cadastro_voluntario
        WHERE 1 = 1
        ${filtroVoluntario}
      ) profissionais
      ORDER BY nome_completo ASC
      LIMIT 20
    `);
  }

  async listarSalas(tenantId: string) {
    await this.ensureEstrutura();
    return prisma.$queryRaw<Array<{ id: bigint; nome: string; unidade_id: bigint | null; unidade_nome: string | null }>>(Prisma.sql`
      SELECT
        s.id,
        s.nome,
        u.id AS unidade_id,
        u.nome_fantasia AS unidade_nome
      FROM salas_unidade s
      INNER JOIN unidade_assistencial u ON u.id = s.unidade_id
      WHERE u.tenant_id::text = ${tenantId}
        AND s.ativo = TRUE
      ORDER BY u.nome_fantasia ASC, s.nome ASC
    `);
  }

  async listarPresencaDatas(cursoId: bigint, tenantId: string, somentePendentes = false) {
    await this.ensureEstrutura();
    const curso = await this.buscarPorIdOuFalhar(cursoId, tenantId);
    await this.sincronizarPresencaDatasRealizadas(cursoId, tenantId, curso.curso.tipo);

    const filtroStatus = somentePendentes
      ? Prisma.sql`AND pd.status = 'GERADA'`
      : Prisma.empty;

    return prisma.$queryRaw<MatriculaPresencaDataRow[]>(Prisma.sql`
      SELECT
        pd.id,
        pd.data_aula,
        pd.status,
        pd.observacoes,
        (
          SELECT COUNT(*)
          FROM cursos_atendimentos_presencas p
          WHERE p.curso_id = pd.curso_id
            AND p.tenant_id::text = ${tenantId}
            AND p.data_aula = pd.data_aula
            AND p.status = 'PRESENTE'
        )::BIGINT AS total_presencas,
        (
          SELECT COUNT(*)
          FROM cursos_atendimentos_presenca_anexos a
          WHERE a.presenca_data_id = pd.id
            AND a.tenant_id::text = ${tenantId}
        )::BIGINT AS total_anexos,
        pd.criado_em,
        pd.atualizado_em
      FROM cursos_atendimentos_presenca_datas pd
      WHERE pd.curso_id = ${cursoId}
        AND pd.tenant_id::text = ${tenantId}
      ${filtroStatus}
      ORDER BY pd.data_aula DESC
    `);
  }

  private async sincronizarPresencaDatasRealizadas(cursoId: bigint, tenantId: string, tipoCurso: string) {
    const tipoNormalizado = trimOrUndefined(tipoCurso)?.toUpperCase();
    if (!tipoNormalizado) return;

    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO cursos_atendimentos_presenca_datas (
        tenant_id,
        curso_id,
        data_aula,
        status,
        criado_em,
        atualizado_em
      )
      SELECT DISTINCT
        ${tenantId}::uuid,
        ${cursoId},
        a.data_agendamento,
        'GERADA',
        NOW(),
        NOW()
      FROM agendamento a
      WHERE a.tenant_id::text = ${tenantId}
        AND a.item_origem_id = ${cursoId}
        AND LOWER(COALESCE(a.item_tipo, '')) = LOWER(${tipoNormalizado})
        AND a.data_agendamento IS NOT NULL
        AND LOWER(COALESCE(a.status, '')) <> 'cancelado'
      ON CONFLICT (tenant_id, curso_id, data_aula)
      DO NOTHING
    `);
  }

  async criarPresencaData(cursoId: bigint, input: MatriculaPresencaDataInput, tenantId: string) {
    await this.ensureEstrutura();
    await this.buscarPorIdOuFalhar(cursoId, tenantId);

    const dataAula = toOptionalDate(input.data_aula);
    if (!dataAula) {
      throw new AppError("Data da aula invalida.", 400);
    }

    const observacoes = trimOrUndefined(input.observacoes);

    const inserted = await prisma.$queryRaw<MatriculaPresencaDataRow[]>(Prisma.sql`
      INSERT INTO cursos_atendimentos_presenca_datas (
        tenant_id,
        curso_id,
        data_aula,
        status,
        observacoes,
        criado_em,
        atualizado_em
      ) VALUES (
        ${tenantId}::uuid,
        ${cursoId},
        ${dataAula},
        'GERADA',
        ${observacoes},
        NOW(),
        NOW()
      )
      ON CONFLICT (tenant_id, curso_id, data_aula)
      DO UPDATE SET
        observacoes = COALESCE(EXCLUDED.observacoes, cursos_atendimentos_presenca_datas.observacoes),
        atualizado_em = NOW()
      RETURNING
        id,
        data_aula,
        status,
        observacoes,
        0::BIGINT AS total_presencas,
        0::BIGINT AS total_anexos,
        criado_em,
        atualizado_em
    `);

    const presencaData = inserted[0];
    if (!presencaData) {
      throw new AppError("Nao foi possivel criar a data de presenca.", 500);
    }

    return presencaData;
  }

  async atualizarPresencaData(cursoId: bigint, presencaDataId: bigint, input: MatriculaPresencaDataUpdateInput, tenantId: string) {
    await this.ensureEstrutura();
    await this.buscarPresencaDataOuFalhar(cursoId, presencaDataId, tenantId);

    const observacoes = trimOrUndefined(input.observacoes);
    const status = trimOrUndefined(input.status);

    const updated = await prisma.$queryRaw<MatriculaPresencaDataRow[]>(Prisma.sql`
      UPDATE cursos_atendimentos_presenca_datas
      SET
        observacoes = COALESCE(${observacoes}, observacoes),
        status = COALESCE(${status}, status),
        atualizado_em = NOW()
      WHERE id = ${presencaDataId}
        AND curso_id = ${cursoId}
        AND tenant_id::text = ${tenantId}
      RETURNING
        id,
        data_aula,
        status,
        observacoes,
        0::BIGINT AS total_presencas,
        0::BIGINT AS total_anexos,
        criado_em,
        atualizado_em
    `);

    const presencaData = updated[0];
    if (!presencaData) {
      throw new AppError("Data de presenca nao encontrada.", 404);
    }

    return presencaData;
  }

  async cancelarPresencaData(cursoId: bigint, presencaDataId: bigint, tenantId: string) {
    return this.atualizarPresencaData(cursoId, presencaDataId, { status: "CANCELADA" }, tenantId);
  }

  async removerPresencaData(cursoId: bigint, presencaDataId: bigint, tenantId: string, usuario?: UsuarioRegistro) {
    await this.ensureEstrutura();
    const presencaData = await this.buscarPresencaDataOuFalhar(cursoId, presencaDataId, tenantId);

    await prisma.$transaction(async (tx) => {
      const excluidos = await tx.$queryRaw<Array<{ total: bigint | number | null }>>(Prisma.sql`
        SELECT COUNT(*)::BIGINT AS total
        FROM cursos_atendimentos_presencas
        WHERE curso_id = ${cursoId}
          AND tenant_id::text = ${tenantId}
          AND data_aula = ${presencaData.data_aula}
      `);

      const totalExcluidos = Number(excluidos[0]?.total ?? 0);

      await tx.$executeRaw(Prisma.sql`
        DELETE FROM cursos_atendimentos_presencas
        WHERE curso_id = ${cursoId}
          AND tenant_id::text = ${tenantId}
          AND data_aula = ${presencaData.data_aula}
      `);
      await tx.$executeRaw(Prisma.sql`
        DELETE FROM cursos_atendimentos_presenca_datas
        WHERE id = ${presencaDataId}
          AND curso_id = ${cursoId}
          AND tenant_id::text = ${tenantId}
      `);

      await this.registrarAuditoriaExclusaoPresencaDataTx(tx, {
        tenantId,
        cursoId,
        presencaDataId,
        dataAula: presencaData.data_aula,
        totalExcluidos,
        usuarioId: usuario?.id,
        usuarioNome: usuario?.nome
      });
    });
  }

  async listarPresencasPorData(cursoId: bigint, presencaDataId: bigint, tenantId: string) {
    await this.ensureEstrutura();
    const presencaData = await this.buscarPresencaDataOuFalhar(cursoId, presencaDataId, tenantId);
    const dataAulaIso = toIsoDate(presencaData.data_aula);
    if (!dataAulaIso) {
      throw new AppError("Data da aula invalida.", 500);
    }

    const itens = await prisma.$queryRaw<MatriculaPresencaItemRow[]>(Prisma.sql`
      SELECT
        b.id AS beneficiario_id,
        m.id AS matricula_id,
        m.beneficiario_nome,
        m.cpf,
        b.data_nascimento,
        COALESCE(p.status, 'NAO_INFORMADO') AS status,
        p.observacao
      FROM cursos_atendimentos_matriculas m
      LEFT JOIN cursos_atendimentos_presencas p
        ON p.curso_id = m.curso_id
       AND p.matricula_id = m.id
       AND p.tenant_id::text = ${tenantId}
       AND p.data_aula = ${dataAulaIso}::date
      LEFT JOIN cadastro_beneficiario b
        ON b.tenant_id::text = ${tenantId}
       AND (
         (
           regexp_replace(COALESCE(m.cpf, ''), '\\D', '', 'g') <> ''
           AND EXISTS (
             SELECT 1
             FROM documentos d
             WHERE d.beneficiario_id = b.id
               AND d.tenant_id::text = ${tenantId}
               AND (
                 UPPER(COALESCE(d.tipo_documento, '')) = 'CPF'
                 OR UPPER(COALESCE(d.nome_documento, '')) LIKE '%CPF%'
               )
               AND regexp_replace(COALESCE(d.numero_documento, ''), '\\D', '', 'g') =
                 regexp_replace(COALESCE(m.cpf, ''), '\\D', '', 'g')
           )
         )
         OR (
           regexp_replace(COALESCE(m.cpf, ''), '\\D', '', 'g') = ''
           AND LOWER(TRIM(COALESCE(b.nome_completo, ''))) = LOWER(TRIM(COALESCE(m.beneficiario_nome, '')))
         )
       )
      WHERE m.curso_id = ${cursoId}
        AND m.tenant_id::text = ${tenantId}
        AND UPPER(COALESCE(m.status, 'ATIVO')) <> 'CANCELADO'
      ORDER BY m.beneficiario_nome ASC
    `);

    return {
      data_aula: presencaData.data_aula,
      itens
    };
  }

  async salvarPresencasPorData(
    cursoId: bigint,
    presencaDataId: bigint,
    input: MatriculaPresencaSalvarInput,
    tenantId: string,
    usuario?: UsuarioRegistro
  ) {
    await this.ensureEstrutura();
    const presencaData = await this.buscarPresencaDataOuFalhar(cursoId, presencaDataId, tenantId);
    const dataAula = toOptionalDate(input.data_aula) ?? presencaData.data_aula;
    const dataAulaIso = toIsoDate(dataAula);
    if (!dataAulaIso) {
      throw new AppError("Data da aula invalida.", 400);
    }
    const observacoesGerais = trimOrUndefined(input.observacoes);

    await prisma.$transaction(async (tx) => {
      for (const item of input.presencas) {
        const matriculaId = BigInt(item.matricula_id);

        const matriculaExiste = await tx.$queryRaw<Array<{
          id: bigint;
          beneficiario_id: bigint | null;
          beneficiario_nome: string;
          cpf: string | null;
          status: string | null;
          observacao: string | null;
        }>>(Prisma.sql`
          SELECT
            m.id,
            b.id AS beneficiario_id,
            m.beneficiario_nome,
            m.cpf,
            p.status,
            p.observacao
          FROM cursos_atendimentos_matriculas m
          LEFT JOIN cursos_atendimentos_presencas p
            ON p.tenant_id::text = ${tenantId}
           AND p.curso_id = ${cursoId}
           AND p.matricula_id = m.id
           AND p.data_aula = ${dataAulaIso}::date
          LEFT JOIN cadastro_beneficiario b
            ON b.tenant_id::text = ${tenantId}
           AND (
             (
               regexp_replace(COALESCE(m.cpf, ''), '\\D', '', 'g') <> ''
               AND EXISTS (
                 SELECT 1
                 FROM documentos d
                 WHERE d.beneficiario_id = b.id
                   AND d.tenant_id::text = ${tenantId}
                   AND (
                     UPPER(COALESCE(d.tipo_documento, '')) = 'CPF'
                     OR UPPER(COALESCE(d.nome_documento, '')) LIKE '%CPF%'
                   )
                   AND regexp_replace(COALESCE(d.numero_documento, ''), '\\D', '', 'g') =
                     regexp_replace(COALESCE(m.cpf, ''), '\\D', '', 'g')
               )
             )
             OR (
               regexp_replace(COALESCE(m.cpf, ''), '\\D', '', 'g') = ''
               AND LOWER(TRIM(COALESCE(b.nome_completo, ''))) = LOWER(TRIM(COALESCE(m.beneficiario_nome, '')))
             )
           )
          WHERE m.id = ${matriculaId}
            AND m.curso_id = ${cursoId}
            AND m.tenant_id::text = ${tenantId}
          LIMIT 1
        `);

        const matriculaAtual = matriculaExiste[0];
        if (!matriculaAtual) {
          throw new AppError("Matricula de presenca nao encontrada.", 404);
        }

        const usuarioAnterior = await tx.$queryRaw<Array<{
          status: string;
          usuario_registro_id: bigint | null;
          usuario_registro_nome: string | null;
          data_hora_atualizacao: Date | null;
        }>>(Prisma.sql`
          SELECT
            status,
            usuario_registro_id,
            usuario_registro_nome,
            data_hora_atualizacao
          FROM cursos_atendimentos_presencas
          WHERE tenant_id::text = ${tenantId}
            AND curso_id = ${cursoId}
            AND matricula_id = ${matriculaId}
            AND data_aula = ${dataAulaIso}::date
          LIMIT 1
        `);

        const statusAnterior = usuarioAnterior[0]?.status;
        const presencaJaConfirmada = statusAnterior === "PRESENTE" || statusAnterior === "AUSENTE" || statusAnterior === "JUSTIFICADO";
        if (presencaJaConfirmada && statusAnterior !== item.status && !input.senha_confirmacao) {
          throw new AppError(
            "A presença ou ausência deste beneficiário já foi salva. Confirme a alteração informando a senha do usuário logado.",
            409
          );
        }

        await tx.$executeRaw(Prisma.sql`
          INSERT INTO cursos_atendimentos_presencas (
            tenant_id,
            curso_id,
            matricula_id,
            data_aula,
            status,
            observacao,
            usuario_registro_id,
            usuario_registro_nome,
            data_hora_registro,
            data_hora_atualizacao,
            criado_em,
            atualizado_em
          ) VALUES (
            ${tenantId}::uuid,
            ${cursoId},
            ${matriculaId},
            ${dataAulaIso}::date,
            ${item.status},
            ${trimOrUndefined(item.observacao) ?? null},
            ${usuario?.id ?? null},
            ${usuario?.nome ?? null},
            NOW(),
            NOW(),
            NOW(),
            NOW()
          )
          ON CONFLICT (tenant_id, curso_id, matricula_id, data_aula)
          DO UPDATE SET
            status = EXCLUDED.status,
            observacao = EXCLUDED.observacao,
            usuario_registro_id = EXCLUDED.usuario_registro_id,
            usuario_registro_nome = EXCLUDED.usuario_registro_nome,
            data_hora_atualizacao = NOW(),
            atualizado_em = NOW()
        `);

        await this.registrarAuditoriaPresencaTx(tx, {
          tenantId,
          cursoId,
          presencaDataId,
          dataAula,
          matriculaId,
          beneficiarioId: matriculaAtual.beneficiario_id ?? undefined,
          beneficiarioNome: matriculaAtual.beneficiario_nome,
          cpf: matriculaAtual.cpf ?? undefined,
          statusAnterior: usuarioAnterior[0]?.status ?? null,
          statusNovo: item.status,
          observacao: trimOrUndefined(item.observacao) ?? matriculaAtual.observacao ?? undefined,
          usuarioId: usuario?.id,
          usuarioNome: usuario?.nome
        });
      }

      await tx.$executeRaw(Prisma.sql`
        UPDATE cursos_atendimentos_presenca_datas
        SET
          data_aula = ${dataAulaIso}::date,
          observacoes = COALESCE(${observacoesGerais}, observacoes),
          status = 'PREENCHIDA',
          atualizado_em = NOW()
        WHERE id = ${presencaDataId}
          AND curso_id = ${cursoId}
          AND tenant_id::text = ${tenantId}
      `);
    });

    return this.listarPresencasPorData(cursoId, presencaDataId, tenantId);
  }

  private async buscarPresencaDataOuFalhar(cursoId: bigint, presencaDataId: bigint, tenantId: string) {
    const registros = await prisma.$queryRaw<Array<{ id: bigint; data_aula: Date; status: string; observacoes: string | null }>>(
      Prisma.sql`
        SELECT
          id,
          data_aula,
          status,
          observacoes
        FROM cursos_atendimentos_presenca_datas
        WHERE id = ${presencaDataId}
          AND curso_id = ${cursoId}
          AND tenant_id::text = ${tenantId}
        LIMIT 1
      `
    );

    const registro = registros[0];
    if (!registro) {
      throw new AppError("Data de presenca nao encontrada.", 404);
    }
    return registro;
  }

  private async registrarAuditoriaPresencaTx(
    tx: TransactionClient,
    payload: {
      tenantId: string;
      cursoId: bigint;
      presencaDataId: bigint;
      dataAula: Date;
      matriculaId: bigint;
      beneficiarioId?: bigint | null;
      beneficiarioNome: string;
      cpf?: string | null;
      statusAnterior: string | null;
      statusNovo: string;
      observacao?: string | null;
      usuarioId?: bigint;
      usuarioNome?: string;
    }
  ) {
    try {
      const auditoria = montarAuditoriaPresenca(payload);
      await tx.$executeRawUnsafe(
        `
          INSERT INTO central_auditoria (
            tenant_id,
            beneficiario_id,
            entidade,
            entidade_id,
            acao,
            descricao,
            dados_novos,
            usuario_id,
            usuario_nome,
            criado_em
          ) VALUES (
            $1::uuid,
            $2,
            'PRESENCA_MATRICULA',
            $3,
            $4,
            $5,
            $6::jsonb,
            $7,
            $8,
            NOW()
          )
        `,
        auditoria.tenant_id,
        auditoria.beneficiario_id,
        auditoria.entidade_id,
        auditoria.acao,
        auditoria.descricao,
        JSON.stringify(auditoria.dados_novos),
        auditoria.usuario_id,
        auditoria.usuario_nome
      );
    } catch (error) {
      console.warn("[matriculas] falha ao registrar auditoria de presenca:", error);
    }
  }

  private async registrarAuditoriaExclusaoPresencaDataTx(
    tx: TransactionClient,
    payload: {
      tenantId: string;
      cursoId: bigint;
      presencaDataId: bigint;
      dataAula: Date;
      totalExcluidos: number;
      usuarioId?: bigint;
      usuarioNome?: string;
    }
  ) {
    try {
      await tx.$executeRawUnsafe(
        `
          INSERT INTO central_auditoria (
            tenant_id,
            entidade,
            entidade_id,
            acao,
            descricao,
            dados_novos,
            usuario_id,
            usuario_nome,
            criado_em
          ) VALUES (
            $1::uuid,
            'PRESENCA_DATA',
            $2,
            'EXCLUIR',
            $3,
            $4::jsonb,
            $5,
            $6,
            NOW()
          )
        `,
        payload.tenantId,
        payload.presencaDataId,
        `Data de presença excluída em ${payload.dataAula.toISOString().slice(0, 10)} com ${payload.totalExcluidos} registro(s) removido(s).`,
        JSON.stringify({
          tenantId: payload.tenantId,
          cursoId: payload.cursoId.toString(),
          presencaDataId: payload.presencaDataId.toString(),
          dataAula: payload.dataAula.toISOString(),
          totalExcluidos: payload.totalExcluidos
        }),
        payload.usuarioId ?? null,
        payload.usuarioNome ?? null
      );
    } catch (error) {
      console.warn("[matriculas] falha ao registrar auditoria de exclusao de presenca:", error);
    }
  }

  private async inserirMatriculas(
    tx: TransactionClient,
    cursoId: bigint,
    matriculas: MatriculaInscricaoInput[],
    tenantId: string
  ) {
    for (const matricula of matriculas) {
      const dataMatricula = toOptionalDateTime(matricula.data_matricula);
      const dataAgendada = toOptionalDate(matricula.data_agendada);
      const cpf = normalizeDigits(matricula.cpf);

      await tx.$executeRaw(Prisma.sql`
        INSERT INTO cursos_atendimentos_matriculas (
          tenant_id,
          curso_id,
          beneficiario_nome,
          cpf,
          email,
          status,
          data_matricula,
          data_agendada,
          hora_agendada,
          status_agendamento,
          profissional_id,
          profissional_nome,
          profissional_tipo,
          confirmacao_presenca
        ) VALUES (
          ${tenantId}::uuid,
          ${cursoId},
          ${matricula.beneficiario_nome},
          ${cpf},
          ${trimOrUndefined(matricula.email)},
          ${trimOrUndefined(matricula.status) ?? "ATIVO"},
          COALESCE(${dataMatricula}, NOW()),
          ${dataAgendada},
          CAST(${trimOrUndefined(matricula.hora_agendada) ?? null} AS TIME),
          ${trimOrUndefined(matricula.status_agendamento)},
          ${trimOrUndefined(matricula.profissional_id)},
          ${trimOrUndefined(matricula.profissional_nome)},
          ${trimOrUndefined(matricula.profissional_tipo)},
          ${!!matricula.confirmacao_presenca}
        )
      `);
    }
  }

  private async inserirFilaEspera(
    tx: TransactionClient,
    cursoId: bigint,
    filaEspera: MatriculaFilaEsperaInput[],
    tenantId: string
  ) {
    for (const fila of filaEspera) {
      const dataEntrada = toOptionalDateTime(fila.data_entrada);
      const cpf = normalizeDigits(fila.cpf);

      await tx.$executeRaw(Prisma.sql`
        INSERT INTO cursos_atendimentos_fila_espera (
          tenant_id,
          curso_id,
          beneficiario_nome,
          cpf,
          data_entrada
        ) VALUES (
          ${tenantId}::uuid,
          ${cursoId},
          ${fila.beneficiario_nome},
          ${cpf},
          COALESCE(${dataEntrada}, NOW())
        )
      `);
    }
  }
}
