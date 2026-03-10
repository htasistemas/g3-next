import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { normalizeDigits, toOptionalDate, trimOrUndefined } from "../../../utils/string-utils.js";
function joinList(values) {
    if (!values?.length)
        return undefined;
    const sanitized = values.map((item) => item.trim()).filter(Boolean);
    return sanitized.length ? sanitized.join(";") : undefined;
}
function toOptionalDateTime(value) {
    if (!value)
        return null;
    const texto = value.trim();
    if (!texto)
        return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
        const isoDate = new Date(`${texto}T00:00:00.000Z`);
        return Number.isNaN(isoDate.getTime()) ? null : isoDate;
    }
    const parsed = new Date(texto);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}
export class MatriculaRepository {
    async listar(filters) {
        const where = [];
        const nome = trimOrUndefined(filters.nome);
        if (nome) {
            where.push(Prisma.sql `AND c.nome ILIKE ${`%${nome}%`}`);
        }
        const tipo = trimOrUndefined(filters.tipo);
        if (tipo) {
            where.push(Prisma.sql `AND c.tipo ILIKE ${`%${tipo}%`}`);
        }
        const status = trimOrUndefined(filters.status);
        if (status) {
            where.push(Prisma.sql `AND c.status ILIKE ${`%${status}%`}`);
        }
        const profissional = trimOrUndefined(filters.profissional);
        if (profissional) {
            where.push(Prisma.sql `AND c.profissional ILIKE ${`%${profissional}%`}`);
        }
        const beneficiario = trimOrUndefined(filters.beneficiario);
        if (beneficiario) {
            where.push(Prisma.sql `AND (
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
        )`);
        }
        const whereClause = where.length === 0
            ? Prisma.empty
            : where.length === 1
                ? where[0]
                : Prisma.sql `${Prisma.join(where, " ")}`;
        const cursos = await prisma.$queryRaw(Prisma.sql `
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
    async buscarPorId(id) {
        const cursos = await prisma.$queryRaw(Prisma.sql `
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
        if (!curso)
            return null;
        const matriculas = await prisma.$queryRaw(Prisma.sql `
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
        const filaEspera = await prisma.$queryRaw(Prisma.sql `
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
    async buscarPorIdOuFalhar(id) {
        const record = await this.buscarPorId(id);
        if (!record) {
            throw new AppError("Registro de matricula nao encontrado.", 404);
        }
        return record;
    }
    async criar(input) {
        const cursoId = await prisma.$transaction(async (tx) => {
            const diasSemana = joinList(input.dias_semana);
            const faixaEtaria = joinList(input.faixa_etaria);
            const vagasDisponiveis = input.vagas_disponiveis ?? input.vagas_totais;
            const dataTriagem = toOptionalDate(input.data_triagem) ?? null;
            const dataEncaminhamento = toOptionalDate(input.data_encaminhamento) ?? null;
            const dataConclusao = toOptionalDate(input.data_conclusao) ?? null;
            const inserted = await tx.$queryRaw(Prisma.sql `
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
    async atualizar(id, input) {
        await this.buscarPorIdOuFalhar(id);
        await prisma.$transaction(async (tx) => {
            const diasSemana = joinList(input.dias_semana);
            const faixaEtaria = joinList(input.faixa_etaria);
            const vagasDisponiveis = input.vagas_disponiveis ?? input.vagas_totais;
            const dataTriagem = toOptionalDate(input.data_triagem) ?? null;
            const dataEncaminhamento = toOptionalDate(input.data_encaminhamento) ?? null;
            const dataConclusao = toOptionalDate(input.data_conclusao) ?? null;
            await tx.$executeRaw(Prisma.sql `
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
            await tx.$executeRaw(Prisma.sql `
        DELETE FROM cursos_atendimentos_matriculas
        WHERE curso_id = ${id}
      `);
            await tx.$executeRaw(Prisma.sql `
        DELETE FROM cursos_atendimentos_fila_espera
        WHERE curso_id = ${id}
      `);
            await this.inserirMatriculas(tx, id, input.matriculas ?? []);
            await this.inserirFilaEspera(tx, id, input.fila_espera ?? []);
        });
        return this.buscarPorIdOuFalhar(id);
    }
    async remover(id) {
        await this.buscarPorIdOuFalhar(id);
        await prisma.$executeRaw(Prisma.sql `
      DELETE FROM cursos_atendimentos
      WHERE id = ${id}
    `);
    }
    async listarBeneficiarios(termo) {
        const termoSanitizado = trimOrUndefined(termo);
        const termoLike = termoSanitizado ? `%${termoSanitizado}%` : undefined;
        const termoDigits = termoSanitizado ? normalizeDigits(termoSanitizado) : undefined;
        const termoCpfLike = termoDigits ? `%${termoDigits}%` : undefined;
        const filtroCpf = termoCpfLike
            ? Prisma.sql `OR regexp_replace(COALESCE(cpf_doc.numero_documento, ''), '\\D', '', 'g') LIKE ${termoCpfLike}`
            : Prisma.empty;
        const filtroBusca = termoLike
            ? Prisma.sql `
        AND (
          b.nome_completo ILIKE ${termoLike}
          OR b.codigo ILIKE ${termoLike}
          ${filtroCpf}
        )
      `
            : Prisma.empty;
        return prisma.$queryRaw(Prisma.sql `
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
      WHERE 1 = 1
      ${filtroBusca}
      ORDER BY b.nome_completo ASC
      LIMIT 20
    `);
    }
    async listarProfissionais(termo) {
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
        return prisma.$queryRaw(Prisma.sql `
      SELECT
        s.id,
        s.nome,
        u.nome_fantasia AS unidade_nome
      FROM salas_unidade s
      LEFT JOIN unidade_assistencial u ON u.id = s.unidade_id
      ORDER BY u.nome_fantasia ASC, s.nome ASC
    `);
    }
    async listarPresencaDatas(cursoId, somentePendentes = false) {
        await this.buscarPorIdOuFalhar(cursoId);
        const filtroStatus = somentePendentes
            ? Prisma.sql `AND pd.status = 'GERADA'`
            : Prisma.empty;
        return prisma.$queryRaw(Prisma.sql `
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
    async criarPresencaData(cursoId, input) {
        await this.buscarPorIdOuFalhar(cursoId);
        const dataAula = toOptionalDate(input.data_aula);
        if (!dataAula) {
            throw new AppError("Data da aula invalida.", 400);
        }
        const observacoes = trimOrUndefined(input.observacoes);
        const inserted = await prisma.$queryRaw(Prisma.sql `
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
    async atualizarPresencaData(cursoId, presencaDataId, input) {
        await this.buscarPresencaDataOuFalhar(cursoId, presencaDataId);
        const observacoes = trimOrUndefined(input.observacoes);
        const status = trimOrUndefined(input.status);
        const updated = await prisma.$queryRaw(Prisma.sql `
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
    async cancelarPresencaData(cursoId, presencaDataId) {
        return this.atualizarPresencaData(cursoId, presencaDataId, { status: "CANCELADA" });
    }
    async removerPresencaData(cursoId, presencaDataId) {
        await this.buscarPresencaDataOuFalhar(cursoId, presencaDataId);
        await prisma.$executeRaw(Prisma.sql `
      DELETE FROM cursos_atendimentos_presenca_datas
      WHERE id = ${presencaDataId}
        AND curso_id = ${cursoId}
    `);
    }
    async listarPresencasPorData(cursoId, presencaDataId) {
        const presencaData = await this.buscarPresencaDataOuFalhar(cursoId, presencaDataId);
        const itens = await prisma.$queryRaw(Prisma.sql `
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
    async salvarPresencasPorData(cursoId, presencaDataId, input) {
        const presencaData = await this.buscarPresencaDataOuFalhar(cursoId, presencaDataId);
        const dataAula = toOptionalDate(input.data_aula) ?? presencaData.data_aula;
        await prisma.$transaction(async (tx) => {
            for (const item of input.presencas) {
                const matriculaId = BigInt(item.matricula_id);
                const matriculaExiste = await tx.$queryRaw(Prisma.sql `
          SELECT id
          FROM cursos_atendimentos_matriculas
          WHERE id = ${matriculaId}
            AND curso_id = ${cursoId}
          LIMIT 1
        `);
                if (!matriculaExiste.length) {
                    throw new AppError("Matricula de presenca nao encontrada.", 404);
                }
                await tx.$executeRaw(Prisma.sql `
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
            await tx.$executeRaw(Prisma.sql `
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
    async buscarPresencaDataOuFalhar(cursoId, presencaDataId) {
        const registros = await prisma.$queryRaw(Prisma.sql `
        SELECT
          id,
          data_aula,
          status,
          observacoes
        FROM cursos_atendimentos_presenca_datas
        WHERE id = ${presencaDataId}
          AND curso_id = ${cursoId}
        LIMIT 1
      `);
        const registro = registros[0];
        if (!registro) {
            throw new AppError("Data de presenca nao encontrada.", 404);
        }
        return registro;
    }
    async inserirMatriculas(tx, cursoId, matriculas) {
        for (const matricula of matriculas) {
            const dataMatricula = toOptionalDateTime(matricula.data_matricula);
            const dataAgendada = toOptionalDate(matricula.data_agendada);
            const cpf = normalizeDigits(matricula.cpf);
            await tx.$executeRaw(Prisma.sql `
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
    async inserirFilaEspera(tx, cursoId, filaEspera) {
        for (const fila of filaEspera) {
            const dataEntrada = toOptionalDateTime(fila.data_entrada);
            const cpf = normalizeDigits(fila.cpf);
            await tx.$executeRaw(Prisma.sql `
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
