import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { normalizeDigits, toOptionalDate, trimOrUndefined } from "../../../utils/string-utils.js";
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
  matricula_id: bigint;
  beneficiario_nome: string;
  cpf: string | null;
  status: string;
};

export class MatriculaRepository {
  async listar(filters: MatriculaFilters) {
    const where: Prisma.Sql[] = [];

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
              AND m.beneficiario_nome ILIKE ${`%${beneficiario}%`}
          )
          OR EXISTS (
            SELECT 1
            FROM cursos_atendimentos_fila_espera f
            WHERE f.curso_id = c.id
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
        c.vagas_totais,
        c.vagas_disponiveis,
        c.carga_horaria,
        c.horario_inicial,
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
        )::BIGINT AS total_matriculas,
        (
          SELECT COUNT(*)
          FROM cursos_atendimentos_fila_espera f
          WHERE f.curso_id = c.id
        )::BIGINT AS total_fila_espera
      FROM cursos_atendimentos c
      LEFT JOIN salas_unidade s ON s.id = c.sala_id
      WHERE 1 = 1
      ${whereClause}
      ORDER BY c.nome ASC
    `);

    return cursos;
  }

  async buscarPorId(id: bigint) {
    const cursos = await prisma.$queryRaw<MatriculaCursoRow[]>(Prisma.sql`
      SELECT
        c.id,
        c.tipo,
        c.nome,
        c.descricao,
        c.imagem,
        c.vagas_totais,
        c.vagas_disponiveis,
        c.carga_horaria,
        c.horario_inicial,
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
        )::BIGINT AS total_matriculas,
        (
          SELECT COUNT(*)
          FROM cursos_atendimentos_fila_espera f
          WHERE f.curso_id = c.id
        )::BIGINT AS total_fila_espera
      FROM cursos_atendimentos c
      LEFT JOIN salas_unidade s ON s.id = c.sala_id
      WHERE c.id = ${id}
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
        SELECT c.telefone_principal, c.email
        FROM cadastro_beneficiario b
        LEFT JOIN contato_beneficiario c ON c.beneficiario_id = b.id
        LEFT JOIN LATERAL (
          SELECT d.numero_documento
          FROM documentos d
          WHERE d.beneficiario_id = b.id
            AND (
              UPPER(COALESCE(d.tipo_documento, '')) = 'CPF'
              OR UPPER(COALESCE(d.nome_documento, '')) LIKE '%CPF%'
            )
          ORDER BY d.id DESC
          LIMIT 1
        ) cpf_doc ON TRUE
        WHERE (
          regexp_replace(COALESCE(m.cpf, ''), '\\D', '', 'g') <> ''
          AND regexp_replace(COALESCE(cpf_doc.numero_documento, ''), '\\D', '', 'g') =
            regexp_replace(COALESCE(m.cpf, ''), '\\D', '', 'g')
        )
        OR (
          regexp_replace(COALESCE(m.cpf, ''), '\\D', '', 'g') = ''
          AND LOWER(TRIM(COALESCE(b.nome_completo, ''))) = LOWER(TRIM(COALESCE(m.beneficiario_nome, '')))
        )
        ORDER BY c.id DESC NULLS LAST
        LIMIT 1
      ) contato ON TRUE
      WHERE m.curso_id = ${id}
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
        LEFT JOIN contato_beneficiario c ON c.beneficiario_id = b.id
        LEFT JOIN LATERAL (
          SELECT d.numero_documento
          FROM documentos d
          WHERE d.beneficiario_id = b.id
            AND (
              UPPER(COALESCE(d.tipo_documento, '')) = 'CPF'
              OR UPPER(COALESCE(d.nome_documento, '')) LIKE '%CPF%'
            )
          ORDER BY d.id DESC
          LIMIT 1
        ) cpf_doc ON TRUE
        WHERE (
          regexp_replace(COALESCE(f.cpf, ''), '\\D', '', 'g') <> ''
          AND regexp_replace(COALESCE(cpf_doc.numero_documento, ''), '\\D', '', 'g') =
            regexp_replace(COALESCE(f.cpf, ''), '\\D', '', 'g')
        )
        OR (
          regexp_replace(COALESCE(f.cpf, ''), '\\D', '', 'g') = ''
          AND LOWER(TRIM(COALESCE(b.nome_completo, ''))) = LOWER(TRIM(COALESCE(f.beneficiario_nome, '')))
        )
        ORDER BY c.id DESC NULLS LAST
        LIMIT 1
      ) contato ON TRUE
      WHERE f.curso_id = ${id}
      ORDER BY f.data_entrada DESC, f.id DESC
    `);

    return { curso, matriculas, filaEspera };
  }

  async buscarPorIdOuFalhar(id: bigint) {
    const record = await this.buscarPorId(id);
    if (!record) {
      throw new AppError("Registro de matricula nao encontrado.", 404);
    }
    return record;
  }

  async criar(input: MatriculaInput) {
    const cursoId = await prisma.$transaction(async (tx) => {
      const diasSemana = joinList(input.dias_semana);
      const faixaEtaria = joinList(input.faixa_etaria);
      const vagasDisponiveis = input.vagas_disponiveis ?? input.vagas_totais;
      const dataTriagem = toOptionalDate(input.data_triagem) ?? null;
      const dataEncaminhamento = toOptionalDate(input.data_encaminhamento) ?? null;
      const dataConclusao = toOptionalDate(input.data_conclusao) ?? null;

      const inserted = await tx.$queryRaw<{ id: bigint }[]>(Prisma.sql`
        INSERT INTO cursos_atendimentos (
          tipo,
          nome,
          descricao,
          imagem,
          vagas_totais,
          vagas_disponiveis,
          carga_horaria,
          horario_inicial,
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
          ${input.tipo},
          ${input.nome},
          ${trimOrUndefined(input.descricao)},
          ${trimOrUndefined(input.imagem)},
          ${input.vagas_totais},
          ${vagasDisponiveis},
          ${input.carga_horaria ?? null},
          CAST(${trimOrUndefined(input.horario_inicial) ?? null} AS TIME),
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

      await this.inserirMatriculas(tx, cursoId, input.matriculas ?? []);
      await this.inserirFilaEspera(tx, cursoId, input.fila_espera ?? []);

      return cursoId;
    });

    return this.buscarPorIdOuFalhar(cursoId);
  }

  async atualizar(id: bigint, input: MatriculaInput) {
    await this.buscarPorIdOuFalhar(id);

    await prisma.$transaction(async (tx) => {
      const diasSemana = joinList(input.dias_semana);
      const faixaEtaria = joinList(input.faixa_etaria);
      const vagasDisponiveis = input.vagas_disponiveis ?? input.vagas_totais;
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
          vagas_totais = ${input.vagas_totais},
          vagas_disponiveis = ${vagasDisponiveis},
          carga_horaria = ${input.carga_horaria ?? null},
          horario_inicial = CAST(${trimOrUndefined(input.horario_inicial) ?? null} AS TIME),
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
      `);

      await tx.$executeRaw(Prisma.sql`
        DELETE FROM cursos_atendimentos_matriculas
        WHERE curso_id = ${id}
      `);

      await tx.$executeRaw(Prisma.sql`
        DELETE FROM cursos_atendimentos_fila_espera
        WHERE curso_id = ${id}
      `);

      await this.inserirMatriculas(tx, id, input.matriculas ?? []);
      await this.inserirFilaEspera(tx, id, input.fila_espera ?? []);
    });

    return this.buscarPorIdOuFalhar(id);
  }

  async remover(id: bigint) {
    await this.buscarPorIdOuFalhar(id);
    await prisma.$executeRaw(Prisma.sql`
      DELETE FROM cursos_atendimentos
      WHERE id = ${id}
    `);
  }

  async listarBeneficiarios(termo?: string) {
    const termoSanitizado = trimOrUndefined(termo);
    const termoLike = termoSanitizado ? `%${termoSanitizado}%` : null;
    const termoDigits = termoSanitizado ? normalizeDigits(termoSanitizado) : undefined;
    const termoCpfLike = termoDigits ? `%${termoDigits}%` : null;
    const filtroCpf = termoCpfLike
      ? Prisma.sql`OR regexp_replace(COALESCE(cpf_doc.numero_documento, ''), '\\D', '', 'g') LIKE ${termoCpfLike}`
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
        ORDER BY c.id DESC
        LIMIT 1
      ) contato ON TRUE
      LEFT JOIN LATERAL (
        SELECT d.numero_documento
        FROM documentos d
        WHERE d.beneficiario_id = b.id
          AND (
            UPPER(COALESCE(d.tipo_documento, '')) = 'CPF'
            OR UPPER(COALESCE(d.nome_documento, '')) LIKE '%CPF%'
          )
        ORDER BY d.id DESC
        LIMIT 1
      ) cpf_doc ON TRUE
      WHERE (
        ${termoLike} IS NULL
        OR b.nome_completo ILIKE ${termoLike}
        OR b.codigo ILIKE ${termoLike}
        ${filtroCpf}
      )
      ORDER BY b.nome_completo ASC
      LIMIT 20
    `);
  }

  async listarProfissionais(termo?: string) {
    const termoSanitizado = trimOrUndefined(termo);

    const profissionais = await prisma.cadastroProfissional.findMany({
      where: termoSanitizado
        ? {
            OR: [
              { nomeCompleto: { contains: termoSanitizado, mode: "insensitive" } },
              { categoria: { contains: termoSanitizado, mode: "insensitive" } }
            ]
          }
        : undefined,
      select: {
        id: true,
        nomeCompleto: true,
        categoria: true
      },
      orderBy: { nomeCompleto: "asc" },
      take: 30
    });

    const voluntarios = await prisma.cadastroVoluntario.findMany({
      where: termoSanitizado
        ? {
            OR: [
              { nomeCompleto: { contains: termoSanitizado, mode: "insensitive" } },
              { profissao: { contains: termoSanitizado, mode: "insensitive" } },
              { areaInteresse: { contains: termoSanitizado, mode: "insensitive" } }
            ]
          }
        : undefined,
      select: {
        id: true,
        nomeCompleto: true,
        profissao: true
      },
      orderBy: { nomeCompleto: "asc" },
      take: 30
    });

    return [...profissionais, ...voluntarios.map((voluntario) => ({
      id: voluntario.id,
      nomeCompleto: voluntario.nomeCompleto,
      categoria: voluntario.profissao?.trim()
        ? `Voluntariado - ${voluntario.profissao.trim()}`
        : "Voluntariado"
    }))]
      .sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto, "pt-BR"))
      .slice(0, 20)
      .map((item) => ({
        id: item.id,
        nome_completo: item.nomeCompleto,
        categoria: item.categoria
      }));
  }

  async listarSalas() {
    return prisma.$queryRaw<Array<{ id: bigint; nome: string; unidade_nome: string | null }>>(Prisma.sql`
      SELECT
        s.id,
        s.nome,
        u.nome_fantasia AS unidade_nome
      FROM salas_unidade s
      LEFT JOIN unidade_assistencial u ON u.id = s.unidade_id
      ORDER BY u.nome_fantasia ASC, s.nome ASC
    `);
  }

  async listarPresencaDatas(cursoId: bigint, somentePendentes = false) {
    await this.buscarPorIdOuFalhar(cursoId);

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
            AND p.data_aula = pd.data_aula
            AND p.status = 'PRESENTE'
        )::BIGINT AS total_presencas,
        (
          SELECT COUNT(*)
          FROM cursos_atendimentos_presenca_anexos a
          WHERE a.presenca_data_id = pd.id
        )::BIGINT AS total_anexos,
        pd.criado_em,
        pd.atualizado_em
      FROM cursos_atendimentos_presenca_datas pd
      WHERE pd.curso_id = ${cursoId}
      ${filtroStatus}
      ORDER BY pd.data_aula DESC
    `);
  }

  async criarPresencaData(cursoId: bigint, input: MatriculaPresencaDataInput) {
    await this.buscarPorIdOuFalhar(cursoId);

    const dataAula = toOptionalDate(input.data_aula);
    if (!dataAula) {
      throw new AppError("Data da aula invalida.", 400);
    }

    const observacoes = trimOrUndefined(input.observacoes);

    const inserted = await prisma.$queryRaw<MatriculaPresencaDataRow[]>(Prisma.sql`
      INSERT INTO cursos_atendimentos_presenca_datas (
        curso_id,
        data_aula,
        status,
        observacoes,
        criado_em,
        atualizado_em
      ) VALUES (
        ${cursoId},
        ${dataAula},
        'GERADA',
        ${observacoes},
        NOW(),
        NOW()
      )
      ON CONFLICT (curso_id, data_aula)
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

  async atualizarPresencaData(cursoId: bigint, presencaDataId: bigint, input: MatriculaPresencaDataUpdateInput) {
    await this.buscarPresencaDataOuFalhar(cursoId, presencaDataId);

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

  async cancelarPresencaData(cursoId: bigint, presencaDataId: bigint) {
    return this.atualizarPresencaData(cursoId, presencaDataId, { status: "CANCELADA" });
  }

  async removerPresencaData(cursoId: bigint, presencaDataId: bigint) {
    await this.buscarPresencaDataOuFalhar(cursoId, presencaDataId);
    await prisma.$executeRaw(Prisma.sql`
      DELETE FROM cursos_atendimentos_presenca_datas
      WHERE id = ${presencaDataId}
        AND curso_id = ${cursoId}
    `);
  }

  async listarPresencasPorData(cursoId: bigint, presencaDataId: bigint) {
    const presencaData = await this.buscarPresencaDataOuFalhar(cursoId, presencaDataId);

    const itens = await prisma.$queryRaw<MatriculaPresencaItemRow[]>(Prisma.sql`
      SELECT
        m.id AS matricula_id,
        m.beneficiario_nome,
        m.cpf,
        COALESCE(p.status, 'AUSENTE') AS status
      FROM cursos_atendimentos_matriculas m
      LEFT JOIN cursos_atendimentos_presencas p
        ON p.curso_id = m.curso_id
       AND p.matricula_id = m.id
       AND p.data_aula = ${presencaData.data_aula}
      WHERE m.curso_id = ${cursoId}
        AND UPPER(COALESCE(m.status, 'ATIVO')) <> 'CANCELADO'
      ORDER BY m.beneficiario_nome ASC
    `);

    return {
      data_aula: presencaData.data_aula,
      itens
    };
  }

  async salvarPresencasPorData(cursoId: bigint, presencaDataId: bigint, input: MatriculaPresencaSalvarInput) {
    const presencaData = await this.buscarPresencaDataOuFalhar(cursoId, presencaDataId);
    const dataAula = toOptionalDate(input.data_aula) ?? presencaData.data_aula;

    await prisma.$transaction(async (tx) => {
      for (const item of input.presencas) {
        const matriculaId = BigInt(item.matricula_id);

        const matriculaExiste = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
          SELECT id
          FROM cursos_atendimentos_matriculas
          WHERE id = ${matriculaId}
            AND curso_id = ${cursoId}
          LIMIT 1
        `);

        if (!matriculaExiste.length) {
          throw new AppError("Matricula de presenca nao encontrada.", 404);
        }

        await tx.$executeRaw(Prisma.sql`
          INSERT INTO cursos_atendimentos_presencas (
            curso_id,
            matricula_id,
            data_aula,
            status,
            criado_em,
            atualizado_em
          ) VALUES (
            ${cursoId},
            ${matriculaId},
            ${dataAula},
            ${item.status},
            NOW(),
            NOW()
          )
          ON CONFLICT (curso_id, matricula_id, data_aula)
          DO UPDATE SET
            status = EXCLUDED.status,
            atualizado_em = NOW()
        `);
      }

      await tx.$executeRaw(Prisma.sql`
        UPDATE cursos_atendimentos_presenca_datas
        SET
          data_aula = ${dataAula},
          status = 'PREENCHIDA',
          atualizado_em = NOW()
        WHERE id = ${presencaDataId}
          AND curso_id = ${cursoId}
      `);
    });

    return this.listarPresencasPorData(cursoId, presencaDataId);
  }

  private async buscarPresencaDataOuFalhar(cursoId: bigint, presencaDataId: bigint) {
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
        LIMIT 1
      `
    );

    const registro = registros[0];
    if (!registro) {
      throw new AppError("Data de presenca nao encontrada.", 404);
    }
    return registro;
  }

  private async inserirMatriculas(
    tx: TransactionClient,
    cursoId: bigint,
    matriculas: MatriculaInscricaoInput[]
  ) {
    for (const matricula of matriculas) {
      const dataMatricula = toOptionalDateTime(matricula.data_matricula);
      const dataAgendada = toOptionalDate(matricula.data_agendada);
      const cpf = normalizeDigits(matricula.cpf);

      await tx.$executeRaw(Prisma.sql`
        INSERT INTO cursos_atendimentos_matriculas (
          curso_id,
          beneficiario_nome,
          cpf,
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
          ${cursoId},
          ${matricula.beneficiario_nome},
          ${cpf},
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
    filaEspera: MatriculaFilaEsperaInput[]
  ) {
    for (const fila of filaEspera) {
      const dataEntrada = toOptionalDateTime(fila.data_entrada);
      const cpf = normalizeDigits(fila.cpf);

      await tx.$executeRaw(Prisma.sql`
        INSERT INTO cursos_atendimentos_fila_espera (
          curso_id,
          beneficiario_nome,
          cpf,
          data_entrada
        ) VALUES (
          ${cursoId},
          ${fila.beneficiario_nome},
          ${cpf},
          COALESCE(${dataEntrada}, NOW())
        )
      `);
    }
  }
}
