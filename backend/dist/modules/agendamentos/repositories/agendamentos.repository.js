import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { toOptionalDate, trimOrUndefined } from "../../../utils/string-utils.js";
const estruturaSql = [
    `
    CREATE TABLE IF NOT EXISTS agendamento (
      id BIGSERIAL PRIMARY KEY,
      beneficiario_id BIGINT,
      familia_id BIGINT,
      inscricao_origem_id BIGINT,
      beneficiario_nome VARCHAR(200) NOT NULL,
      familia_nome VARCHAR(200),
      responsavel_nome VARCHAR(200),
      telefone VARCHAR(40),
      email VARCHAR(160),
      forma_contato_preferencial VARCHAR(60),
      observacoes_importantes TEXT,
      restricoes_alerta TEXT,
      necessidade_especial TEXT,
      transporte_apoio TEXT,
      unidade VARCHAR(160) NOT NULL,
      setor VARCHAR(160) NOT NULL,
      tipo_atendimento VARCHAR(160) NOT NULL,
      subcategoria VARCHAR(160),
      profissional_id VARCHAR(60),
      profissional_nome VARCHAR(200),
      equipe_apoio JSONB NOT NULL DEFAULT '[]'::jsonb,
      data_agendamento DATE NOT NULL,
      hora_inicial TIME NOT NULL,
      hora_final TIME,
      duracao_minutos INTEGER,
      sala VARCHAR(160),
      recurso VARCHAR(160),
      modalidade VARCHAR(60) NOT NULL,
      origem_atendimento VARCHAR(120),
      prioridade VARCHAR(40) NOT NULL DEFAULT 'Normal',
      status VARCHAR(80) NOT NULL DEFAULT 'Agendado',
      motivo TEXT,
      objetivo TEXT,
      observacao_interna TEXT,
      observacao_curta VARCHAR(240),
      coletivo BOOLEAN NOT NULL DEFAULT FALSE,
      titulo_coletivo VARCHAR(200),
      capacidade_maxima INTEGER,
      participantes JSONB NOT NULL DEFAULT '[]'::jsonb,
      recorrencia JSONB,
      retorno_programado_para DATE,
      encaminhamento_origem VARCHAR(200),
      primeira_vez BOOLEAN NOT NULL DEFAULT FALSE,
      retorno BOOLEAN NOT NULL DEFAULT FALSE,
      urgencia BOOLEAN NOT NULL DEFAULT FALSE,
      documentos_pendentes BOOLEAN NOT NULL DEFAULT FALSE,
      autorizacao_pendente BOOLEAN NOT NULL DEFAULT FALSE,
      confirmacao_canal VARCHAR(60),
      confirmado_em TIMESTAMP,
      confirmado_por_nome VARCHAR(160),
      observacao_confirmacao TEXT,
      status_chegada VARCHAR(80),
      horario_chegada_real TIME,
      horario_inicio_real TIME,
      horario_fim_real TIME,
      concluido_resumo TEXT,
      desfecho VARCHAR(160),
      comparecimento VARCHAR(40),
      encaminhamento_interno TEXT,
      encaminhamento_externo TEXT,
      custo_atendimento NUMERIC(14,2),
      central_atendimento_id BIGINT,
      criado_por_usuario_id BIGINT,
      criado_por_nome VARCHAR(160),
      criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
      atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `,
    "CREATE INDEX IF NOT EXISTS agendamento_data_idx ON agendamento(data_agendamento, hora_inicial)",
    "CREATE INDEX IF NOT EXISTS agendamento_beneficiario_idx ON agendamento(beneficiario_id)",
    "CREATE INDEX IF NOT EXISTS agendamento_profissional_idx ON agendamento(profissional_nome, data_agendamento)",
    `
    CREATE TABLE IF NOT EXISTS agendamento_lista_espera (
      id BIGSERIAL PRIMARY KEY,
      beneficiario_id BIGINT,
      beneficiario_nome VARCHAR(200) NOT NULL,
      familia_id BIGINT,
      familia_nome VARCHAR(200),
      unidade VARCHAR(160),
      setor VARCHAR(160),
      tipo_atendimento VARCHAR(160) NOT NULL,
      profissional_preferencial VARCHAR(200),
      faixa_horario_preferida VARCHAR(120),
      prioridade VARCHAR(40) DEFAULT 'Normal',
      motivo TEXT,
      observacao TEXT,
      data_entrada DATE NOT NULL DEFAULT CURRENT_DATE,
      encaixe_automatico BOOLEAN NOT NULL DEFAULT FALSE,
      convertido_agendamento_id BIGINT,
      criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
      atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `,
    `
    CREATE TABLE IF NOT EXISTS agendamento_log (
      id BIGSERIAL PRIMARY KEY,
      agendamento_id BIGINT,
      acao VARCHAR(80) NOT NULL,
      usuario_id BIGINT,
      usuario_nome VARCHAR(160),
      valor_anterior JSONB,
      valor_novo JSONB,
      criado_em TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `
];
let estruturaPromise = null;
function formatarHora(value) {
    const texto = String(value ?? "").trim();
    if (!texto)
        return null;
    return texto.length === 5 ? `${texto}:00` : texto;
}
function formatarData(value) {
    return toOptionalDate(value);
}
function serializarJson(value) {
    return JSON.stringify(value ?? null);
}
export async function ensureAgendamentosEstrutura() {
    if (!estruturaPromise) {
        estruturaPromise = (async () => {
            for (const comando of estruturaSql) {
                await prisma.$executeRawUnsafe(comando);
            }
        })();
    }
    await estruturaPromise;
}
export class AgendamentosRepository {
    async ensureEstrutura() {
        await ensureAgendamentosEstrutura();
    }
    async resolverFamiliaDoBeneficiario(beneficiarioId) {
        if (!beneficiarioId) {
            return { familiaId: null, familiaNome: null, responsavelNome: null };
        }
        const rows = await prisma.$queryRaw(Prisma.sql `
      SELECT vf.id AS familia_id, vf.nome_familia AS familia_nome, ref.nome_completo AS responsavel_nome
      FROM vinculo_familiar_membro m
      INNER JOIN vinculo_familiar vf ON vf.id = m.vinculo_familiar_id AND vf.status = 'ATIVO'
      LEFT JOIN cadastro_beneficiario ref ON ref.id = vf.id_referencia_familiar
      WHERE m.beneficiario_id = ${BigInt(beneficiarioId)}
      ORDER BY vf.id DESC
      LIMIT 1
    `);
        return {
            familiaId: rows[0]?.familia_id ?? null,
            familiaNome: rows[0]?.familia_nome ?? null,
            responsavelNome: rows[0]?.responsavel_nome ?? null
        };
    }
    async registrarLog(agendamentoId, acao, usuario, anterior, novo) {
        await prisma.$executeRaw(Prisma.sql `
      INSERT INTO agendamento_log (
        agendamento_id, acao, usuario_id, usuario_nome, valor_anterior, valor_novo
      ) VALUES (
        ${agendamentoId},
        ${acao},
        ${usuario?.id ? BigInt(usuario.id) : null},
        ${trimOrUndefined(usuario?.nome ?? usuario?.nomeUsuario)},
        ${anterior ? Prisma.sql `${serializarJson(anterior)}::jsonb` : Prisma.sql `NULL`},
        ${novo ? Prisma.sql `${serializarJson(novo)}::jsonb` : Prisma.sql `NULL`}
      )
    `);
    }
    async registrarHistoricoFamilia(familiaId, descricao, dadosNovos) {
        if (!familiaId)
            return;
        await prisma.$executeRaw(Prisma.sql `
      INSERT INTO familia_historico (
        familia_id, tipo_evento, descricao, dados_novos, data_evento
      ) VALUES (
        ${familiaId},
        'agendamento',
        ${descricao ?? 'Agendamento vinculado à família.'},
        ${dadosNovos ? Prisma.sql `${serializarJson(dadosNovos)}::jsonb` : Prisma.sql `NULL`},
        NOW()
      )
    `);
    }
    async listarConflitos(payload) {
        const horaInicial = formatarHora(payload.horaInicial);
        const horaFinal = formatarHora(payload.horaFinal) ?? formatarHora(payload.horaInicial);
        if (!horaInicial || !horaFinal)
            return [];
        const condicoes = [
            Prisma.sql `a.data_agendamento = ${formatarData(payload.data)}`,
            Prisma.sql `COALESCE(a.status, '') NOT IN ('Cancelado', 'Faltou', 'Alta')`,
            Prisma.sql `(${horaInicial}::time <= COALESCE(a.hora_final, a.hora_inicial) AND ${horaFinal}::time >= a.hora_inicial)`
        ];
        if (payload.idIgnorar) {
            condicoes.push(Prisma.sql `a.id <> ${payload.idIgnorar}`);
        }
        const escopos = [];
        if (trimOrUndefined(payload.profissionalNome)) {
            escopos.push(Prisma.sql `LOWER(COALESCE(a.profissional_nome, '')) = LOWER(${trimOrUndefined(payload.profissionalNome)})`);
        }
        if (trimOrUndefined(payload.sala)) {
            escopos.push(Prisma.sql `LOWER(COALESCE(a.sala, '')) = LOWER(${trimOrUndefined(payload.sala)})`);
        }
        if (trimOrUndefined(payload.recurso)) {
            escopos.push(Prisma.sql `LOWER(COALESCE(a.recurso, '')) = LOWER(${trimOrUndefined(payload.recurso)})`);
        }
        if (!escopos.length)
            return [];
        return prisma.$queryRaw(Prisma.sql `
      SELECT a.id, a.beneficiario_nome, a.profissional_nome, a.sala, a.recurso, a.hora_inicial, a.hora_final, a.status
      FROM agendamento a
      WHERE ${Prisma.join(condicoes, " AND ")}
        AND (${Prisma.join(escopos, " OR ")})
      ORDER BY a.hora_inicial ASC
    `);
    }
    async listar(filtros) {
        await this.ensureEstrutura();
        const where = [];
        const busca = trimOrUndefined(filtros.busca);
        if (busca) {
            const like = `%${busca}%`;
            where.push(Prisma.sql `
        (
          a.beneficiario_nome ILIKE ${like}
          OR COALESCE(a.familia_nome, '') ILIKE ${like}
          OR COALESCE(a.profissional_nome, '') ILIKE ${like}
          OR COALESCE(a.tipo_atendimento, '') ILIKE ${like}
          OR COALESCE(a.unidade, '') ILIKE ${like}
        )
      `);
        }
        if (trimOrUndefined(filtros.unidade))
            where.push(Prisma.sql `a.unidade = ${trimOrUndefined(filtros.unidade)}`);
        if (trimOrUndefined(filtros.setor))
            where.push(Prisma.sql `a.setor = ${trimOrUndefined(filtros.setor)}`);
        if (trimOrUndefined(filtros.profissional))
            where.push(Prisma.sql `a.profissional_nome ILIKE ${`%${trimOrUndefined(filtros.profissional)}%`}`);
        if (trimOrUndefined(filtros.tipoAtendimento))
            where.push(Prisma.sql `a.tipo_atendimento ILIKE ${`%${trimOrUndefined(filtros.tipoAtendimento)}%`}`);
        if (trimOrUndefined(filtros.beneficiario))
            where.push(Prisma.sql `a.beneficiario_nome ILIKE ${`%${trimOrUndefined(filtros.beneficiario)}%`}`);
        if (trimOrUndefined(filtros.familia))
            where.push(Prisma.sql `COALESCE(a.familia_nome, '') ILIKE ${`%${trimOrUndefined(filtros.familia)}%`}`);
        if (trimOrUndefined(filtros.status))
            where.push(Prisma.sql `a.status = ${trimOrUndefined(filtros.status)}`);
        if (trimOrUndefined(filtros.sala))
            where.push(Prisma.sql `COALESCE(a.sala, '') ILIKE ${`%${trimOrUndefined(filtros.sala)}%`}`);
        if (trimOrUndefined(filtros.recurso))
            where.push(Prisma.sql `COALESCE(a.recurso, '') ILIKE ${`%${trimOrUndefined(filtros.recurso)}%`}`);
        if (trimOrUndefined(filtros.prioridade))
            where.push(Prisma.sql `a.prioridade = ${trimOrUndefined(filtros.prioridade)}`);
        if (trimOrUndefined(filtros.modalidade))
            where.push(Prisma.sql `a.modalidade = ${trimOrUndefined(filtros.modalidade)}`);
        if (trimOrUndefined(filtros.periodoInicio))
            where.push(Prisma.sql `a.data_agendamento >= ${formatarData(filtros.periodoInicio)}`);
        if (trimOrUndefined(filtros.periodoFim))
            where.push(Prisma.sql `a.data_agendamento <= ${formatarData(filtros.periodoFim)}`);
        return prisma.$queryRaw(Prisma.sql `
      SELECT *
      FROM agendamento a
      ${where.length ? Prisma.sql `WHERE ${Prisma.join(where, " AND ")}` : Prisma.empty}
      ORDER BY a.data_agendamento ASC, a.hora_inicial ASC, a.id ASC
    `);
    }
    async obter(id) {
        await this.ensureEstrutura();
        const rows = await prisma.$queryRaw(Prisma.sql `
      SELECT * FROM agendamento WHERE id = ${id} LIMIT 1
    `);
        return rows[0] ?? null;
    }
    async criar(input, usuario) {
        await this.ensureEstrutura();
        const familiaResolvida = await this.resolverFamiliaDoBeneficiario(input.beneficiarioId);
        const conflitos = await this.listarConflitos({
            data: input.data,
            horaInicial: input.horaInicial,
            horaFinal: input.horaFinal,
            profissionalNome: input.profissionalNome,
            sala: input.sala,
            recurso: input.recurso
        });
        if (conflitos.length && !input.permitirConflito) {
            throw new AppError("Conflito de agenda identificado.", 409);
        }
        const inserted = await prisma.$queryRaw(Prisma.sql `
      INSERT INTO agendamento (
        beneficiario_id, familia_id, inscricao_origem_id, beneficiario_nome, familia_nome, responsavel_nome,
        telefone, email, forma_contato_preferencial, observacoes_importantes, restricoes_alerta, necessidade_especial,
        transporte_apoio, unidade, setor, tipo_atendimento, subcategoria, profissional_id, profissional_nome,
        equipe_apoio, data_agendamento, hora_inicial, hora_final, duracao_minutos, sala, recurso, modalidade,
        origem_atendimento, prioridade, status, motivo, objetivo, observacao_interna, observacao_curta, coletivo,
        titulo_coletivo, capacidade_maxima, participantes, recorrencia, retorno_programado_para, encaminhamento_origem,
        primeira_vez, retorno, urgencia, documentos_pendentes, autorizacao_pendente, criado_por_usuario_id, criado_por_nome
      ) VALUES (
        ${input.beneficiarioId ? BigInt(input.beneficiarioId) : null},
        ${input.familiaId ? BigInt(input.familiaId) : familiaResolvida.familiaId},
        ${trimOrUndefined(input.inscricaoOrigemId) ? BigInt(trimOrUndefined(input.inscricaoOrigemId)) : null},
        ${input.beneficiarioNome},
        ${trimOrUndefined(input.familiaNome) ?? familiaResolvida.familiaNome},
        ${trimOrUndefined(input.responsavelNome) ?? familiaResolvida.responsavelNome},
        ${trimOrUndefined(input.telefone)},
        ${trimOrUndefined(input.email)},
        ${trimOrUndefined(input.formaContatoPreferencial)},
        ${trimOrUndefined(input.observacoesImportantes)},
        ${trimOrUndefined(input.restricoesAlerta)},
        ${trimOrUndefined(input.necessidadeEspecial)},
        ${trimOrUndefined(input.transporteApoio)},
        ${input.unidade},
        ${input.setor},
        ${input.tipoAtendimento},
        ${trimOrUndefined(input.subcategoria)},
        ${trimOrUndefined(input.profissionalId)},
        ${trimOrUndefined(input.profissionalNome)},
        ${Prisma.sql `${serializarJson(input.equipeApoio ?? [])}::jsonb`},
        ${formatarData(input.data)},
        ${formatarHora(input.horaInicial)},
        ${formatarHora(input.horaFinal)},
        ${input.duracaoMinutos ?? null},
        ${trimOrUndefined(input.sala)},
        ${trimOrUndefined(input.recurso)},
        ${input.modalidade},
        ${trimOrUndefined(input.origemAtendimento)},
        ${input.prioridade},
        ${input.status ?? (input.coletivo ? "Atendimento coletivo" : input.permitirConflito ? "Encaixe" : "Agendado")},
        ${trimOrUndefined(input.motivo)},
        ${trimOrUndefined(input.objetivo)},
        ${trimOrUndefined(input.observacaoInterna)},
        ${trimOrUndefined(input.observacaoCurta)},
        ${input.coletivo ?? false},
        ${trimOrUndefined(input.tituloColetivo)},
        ${input.capacidadeMaxima ?? null},
        ${Prisma.sql `${serializarJson(input.participantes ?? [])}::jsonb`},
        ${input.recorrencia ? Prisma.sql `${serializarJson(input.recorrencia)}::jsonb` : Prisma.sql `NULL`},
        ${formatarData(input.retornoProgramadoPara)},
        ${trimOrUndefined(input.encaminhamentoOrigem)},
        ${input.primeiraVez ?? false},
        ${input.retorno ?? false},
        ${input.urgencia ?? false},
        ${input.documentosPendentes ?? false},
        ${input.autorizacaoPendente ?? false},
        ${usuario?.id ? BigInt(usuario.id) : null},
        ${trimOrUndefined(usuario?.nome ?? usuario?.nomeUsuario)}
      ) RETURNING id
    `);
        const id = inserted[0]?.id;
        if (!id)
            throw new AppError("Nao foi possivel criar o agendamento.", 500);
        const criado = await this.obter(id);
        await this.registrarLog(id, "criar", usuario, null, criado);
        await this.registrarHistoricoFamilia(criado?.familia_id, "Agendamento criado para a família.", criado);
        return criado;
    }
    async atualizar(id, input, usuario) {
        await this.ensureEstrutura();
        const anterior = await this.obter(id);
        if (!anterior)
            throw new AppError("Agendamento nao encontrado.", 404);
        const conflitos = await this.listarConflitos({
            data: input.data,
            horaInicial: input.horaInicial,
            horaFinal: input.horaFinal,
            profissionalNome: input.profissionalNome,
            sala: input.sala,
            recurso: input.recurso,
            idIgnorar: id
        });
        if (conflitos.length && !input.permitirConflito) {
            throw new AppError("Conflito de agenda identificado.", 409);
        }
        await prisma.$executeRaw(Prisma.sql `
      UPDATE agendamento
      SET
        beneficiario_id = ${input.beneficiarioId ? BigInt(input.beneficiarioId) : null},
        familia_id = ${input.familiaId ? BigInt(input.familiaId) : anterior.familia_id},
        inscricao_origem_id = ${trimOrUndefined(input.inscricaoOrigemId) ? BigInt(trimOrUndefined(input.inscricaoOrigemId)) : null},
        beneficiario_nome = ${input.beneficiarioNome},
        familia_nome = ${trimOrUndefined(input.familiaNome) ?? anterior.familia_nome},
        responsavel_nome = ${trimOrUndefined(input.responsavelNome) ?? anterior.responsavel_nome},
        telefone = ${trimOrUndefined(input.telefone)},
        email = ${trimOrUndefined(input.email)},
        forma_contato_preferencial = ${trimOrUndefined(input.formaContatoPreferencial)},
        observacoes_importantes = ${trimOrUndefined(input.observacoesImportantes)},
        restricoes_alerta = ${trimOrUndefined(input.restricoesAlerta)},
        necessidade_especial = ${trimOrUndefined(input.necessidadeEspecial)},
        transporte_apoio = ${trimOrUndefined(input.transporteApoio)},
        unidade = ${input.unidade},
        setor = ${input.setor},
        tipo_atendimento = ${input.tipoAtendimento},
        subcategoria = ${trimOrUndefined(input.subcategoria)},
        profissional_id = ${trimOrUndefined(input.profissionalId)},
        profissional_nome = ${trimOrUndefined(input.profissionalNome)},
        equipe_apoio = ${Prisma.sql `${serializarJson(input.equipeApoio ?? [])}::jsonb`},
        data_agendamento = ${formatarData(input.data)},
        hora_inicial = ${formatarHora(input.horaInicial)},
        hora_final = ${formatarHora(input.horaFinal)},
        duracao_minutos = ${input.duracaoMinutos ?? null},
        sala = ${trimOrUndefined(input.sala)},
        recurso = ${trimOrUndefined(input.recurso)},
        modalidade = ${input.modalidade},
        origem_atendimento = ${trimOrUndefined(input.origemAtendimento)},
        prioridade = ${input.prioridade},
        status = ${input.status ?? anterior.status},
        motivo = ${trimOrUndefined(input.motivo)},
        objetivo = ${trimOrUndefined(input.objetivo)},
        observacao_interna = ${trimOrUndefined(input.observacaoInterna)},
        observacao_curta = ${trimOrUndefined(input.observacaoCurta)},
        coletivo = ${input.coletivo ?? false},
        titulo_coletivo = ${trimOrUndefined(input.tituloColetivo)},
        capacidade_maxima = ${input.capacidadeMaxima ?? null},
        participantes = ${Prisma.sql `${serializarJson(input.participantes ?? [])}::jsonb`},
        recorrencia = ${input.recorrencia ? Prisma.sql `${serializarJson(input.recorrencia)}::jsonb` : Prisma.sql `NULL`},
        retorno_programado_para = ${formatarData(input.retornoProgramadoPara)},
        encaminhamento_origem = ${trimOrUndefined(input.encaminhamentoOrigem)},
        primeira_vez = ${input.primeiraVez ?? false},
        retorno = ${input.retorno ?? false},
        urgencia = ${input.urgencia ?? false},
        documentos_pendentes = ${input.documentosPendentes ?? false},
        autorizacao_pendente = ${input.autorizacaoPendente ?? false},
        atualizado_em = NOW()
      WHERE id = ${id}
    `);
        const atual = await this.obter(id);
        await this.registrarLog(id, "editar", usuario, anterior, atual);
        return atual;
    }
    async cancelar(id, motivo, usuario) {
        const anterior = await this.obter(id);
        if (!anterior)
            throw new AppError("Agendamento nao encontrado.", 404);
        await prisma.$executeRaw(Prisma.sql `
      UPDATE agendamento
      SET status = 'Cancelado', observacao_interna = ${trimOrUndefined(motivo) ?? anterior.observacao_interna}, atualizado_em = NOW()
      WHERE id = ${id}
    `);
        const atual = await this.obter(id);
        await this.registrarLog(id, "cancelar", usuario, anterior, atual);
        return atual;
    }
    async remarcar(id, input, usuario) {
        const anterior = await this.obter(id);
        if (!anterior)
            throw new AppError("Agendamento nao encontrado.", 404);
        const conflitos = await this.listarConflitos({
            data: input.data,
            horaInicial: input.horaInicial,
            horaFinal: input.horaFinal,
            profissionalNome: input.profissionalNome ?? anterior.profissional_nome,
            sala: input.sala ?? anterior.sala,
            recurso: input.recurso ?? anterior.recurso,
            idIgnorar: id
        });
        if (conflitos.length && !input.permitirConflito) {
            throw new AppError("Conflito de agenda identificado.", 409);
        }
        await prisma.$executeRaw(Prisma.sql `
      UPDATE agendamento
      SET
        data_agendamento = ${formatarData(input.data)},
        hora_inicial = ${formatarHora(input.horaInicial)},
        hora_final = ${formatarHora(input.horaFinal)},
        profissional_nome = ${trimOrUndefined(input.profissionalNome) ?? anterior.profissional_nome},
        sala = ${trimOrUndefined(input.sala) ?? anterior.sala},
        recurso = ${trimOrUndefined(input.recurso) ?? anterior.recurso},
        status = 'Remarcado',
        observacao_interna = ${trimOrUndefined(input.motivo) ?? anterior.observacao_interna},
        atualizado_em = NOW()
      WHERE id = ${id}
    `);
        const atual = await this.obter(id);
        await this.registrarLog(id, "remarcar", usuario, anterior, atual);
        return atual;
    }
    async confirmar(id, canal, observacao, usuario) {
        const anterior = await this.obter(id);
        if (!anterior)
            throw new AppError("Agendamento nao encontrado.", 404);
        await prisma.$executeRaw(Prisma.sql `
      UPDATE agendamento
      SET
        status = 'Confirmado',
        confirmacao_canal = ${trimOrUndefined(canal)},
        observacao_confirmacao = ${trimOrUndefined(observacao)},
        confirmado_em = NOW(),
        confirmado_por_nome = ${trimOrUndefined(usuario?.nome ?? usuario?.nomeUsuario)},
        atualizado_em = NOW()
      WHERE id = ${id}
    `);
        const atual = await this.obter(id);
        await this.registrarLog(id, "confirmar", usuario, anterior, atual);
        return atual;
    }
    async checkIn(id, input, usuario) {
        const anterior = await this.obter(id);
        if (!anterior)
            throw new AppError("Agendamento nao encontrado.", 404);
        const statusFinal = input.statusChegada === "Em atendimento"
            ? "Em atendimento"
            : input.statusChegada === "Finalizado"
                ? "Atendido"
                : input.statusChegada === "Nao compareceu"
                    ? "Faltou"
                    : input.statusChegada === "Reagendado"
                        ? "Remarcado"
                        : anterior.status;
        await prisma.$executeRaw(Prisma.sql `
      UPDATE agendamento
      SET
        status = ${statusFinal},
        status_chegada = ${input.statusChegada},
        horario_chegada_real = ${formatarHora(input.horarioChegada)},
        horario_inicio_real = ${formatarHora(input.horarioInicio)},
        horario_fim_real = ${formatarHora(input.horarioFim)},
        observacao_interna = ${trimOrUndefined(input.observacao) ?? anterior.observacao_interna},
        atualizado_em = NOW()
      WHERE id = ${id}
    `);
        const atual = await this.obter(id);
        await this.registrarLog(id, "check_in", usuario, anterior, atual);
        return atual;
    }
    async inserirCentralAtendimentoSeNecessario(agendamentoId, payload, usuario) {
        const atual = await this.obter(agendamentoId);
        if (!atual)
            throw new AppError("Agendamento nao encontrado.", 404);
        if (atual.central_atendimento_id)
            return atual.central_atendimento_id;
        const inserted = await prisma.$queryRaw(Prisma.sql `
      INSERT INTO central_atendimento (
        beneficiario_id, familia_id, data_hora, tipo_atendimento, setor, profissional_responsavel,
        prioridade, status, classificacao, necessidade_identificada, resumo, observacoes, retorno_previsto,
        criado_por_usuario_id, criado_por_nome, criado_em, atualizado_em
      ) VALUES (
        ${atual.beneficiario_id},
        ${atual.familia_id},
        ${new Date(`${String(atual.data_agendamento).slice(0, 10)}T${String(atual.hora_inicial).slice(0, 8)}`)},
        ${atual.tipo_atendimento},
        ${atual.setor},
        ${atual.profissional_nome ?? atual.responsavel_nome ?? "Equipe institucional"},
        ${atual.prioridade},
        ${payload.comparecimento === "Faltou" ? "Concluído" : "Concluído"},
        ${atual.subcategoria},
        ${atual.motivo},
        ${payload.resumo},
        ${payload.observacaoImportante ?? atual.observacao_interna},
        ${formatarData(payload.retornoGeradoPara)},
        ${usuario?.id ? BigInt(usuario.id) : null},
        ${trimOrUndefined(usuario?.nome ?? usuario?.nomeUsuario)},
        NOW(),
        NOW()
      ) RETURNING id
    `);
        const centralId = inserted[0]?.id;
        if (!centralId)
            throw new AppError("Nao foi possivel gerar o historico do atendimento.", 500);
        await prisma.$executeRaw(Prisma.sql `
      UPDATE agendamento
      SET central_atendimento_id = ${centralId}, atualizado_em = NOW()
      WHERE id = ${agendamentoId}
    `);
        return centralId;
    }
    async concluir(id, input, usuario) {
        const anterior = await this.obter(id);
        if (!anterior)
            throw new AppError("Agendamento nao encontrado.", 404);
        const centralId = await this.inserirCentralAtendimentoSeNecessario(id, input, usuario);
        await prisma.$executeRaw(Prisma.sql `
      UPDATE agendamento
      SET
        status = 'Atendido',
        concluido_resumo = ${input.resumo},
        desfecho = ${trimOrUndefined(input.desfecho)},
        comparecimento = ${trimOrUndefined(input.comparecimento) ?? 'Presente'},
        retorno_programado_para = ${formatarData(input.retornoGeradoPara)},
        encaminhamento_interno = ${trimOrUndefined(input.encaminhamentoInterno)},
        encaminhamento_externo = ${trimOrUndefined(input.encaminhamentoExterno)},
        observacao_interna = ${trimOrUndefined(input.observacaoImportante) ?? anterior.observacao_interna},
        custo_atendimento = ${input.custoAtendimento ?? null},
        central_atendimento_id = ${centralId},
        atualizado_em = NOW()
      WHERE id = ${id}
    `);
        const atual = await this.obter(id);
        await this.registrarLog(id, "concluir", usuario, anterior, atual);
        await this.registrarHistoricoFamilia(atual?.familia_id, "Atendimento concluído para a família.", atual);
        return atual;
    }
    async listarListaEspera() {
        await this.ensureEstrutura();
        return prisma.$queryRaw(Prisma.sql `
      SELECT *
      FROM agendamento_lista_espera
      ORDER BY
        CASE prioridade
          WHEN 'Urgencia' THEN 1
          WHEN 'Alta' THEN 2
          WHEN 'Media' THEN 3
          ELSE 4
        END,
        data_entrada ASC,
        id ASC
    `);
    }
    async criarListaEspera(input) {
        await this.ensureEstrutura();
        const inserted = await prisma.$queryRaw(Prisma.sql `
      INSERT INTO agendamento_lista_espera (
        beneficiario_id, beneficiario_nome, familia_id, familia_nome, unidade, setor, tipo_atendimento,
        profissional_preferencial, faixa_horario_preferida, prioridade, motivo, observacao, data_entrada, encaixe_automatico
      ) VALUES (
        ${input.beneficiarioId ? BigInt(input.beneficiarioId) : null},
        ${input.beneficiarioNome},
        ${input.familiaId ? BigInt(input.familiaId) : null},
        ${trimOrUndefined(input.familiaNome)},
        ${trimOrUndefined(input.unidade)},
        ${trimOrUndefined(input.setor)},
        ${input.tipoAtendimento},
        ${trimOrUndefined(input.profissionalPreferencial)},
        ${trimOrUndefined(input.faixaHorarioPreferida)},
        ${input.prioridade ?? 'Normal'},
        ${trimOrUndefined(input.motivo)},
        ${trimOrUndefined(input.observacao)},
        ${formatarData(input.dataEntrada) ?? formatarData(new Date().toISOString().slice(0, 10))},
        ${input.encaixeAutomatico ?? false}
      ) RETURNING id
    `);
        const id = inserted[0]?.id;
        const rows = await prisma.$queryRaw(Prisma.sql `
      SELECT * FROM agendamento_lista_espera WHERE id = ${id}
    `);
        return rows[0] ?? null;
    }
    async converterListaEspera(id, input, usuario) {
        const created = await this.criar({ ...input, permitirConflito: input.permitirConflito ?? false }, usuario);
        if (!created)
            throw new AppError("Nao foi possivel converter a lista de espera.", 500);
        await prisma.$executeRaw(Prisma.sql `
      UPDATE agendamento_lista_espera
      SET convertido_agendamento_id = ${BigInt(created.id)}, atualizado_em = NOW()
      WHERE id = ${id}
    `);
        return created;
    }
    async indicadores(filtros) {
        const rows = await this.listar(filtros);
        const hoje = new Date().toISOString().slice(0, 10);
        return {
            totalNoPeriodo: rows.length,
            totalHoje: rows.filter((item) => String(item.data_agendamento).slice(0, 10) === hoje).length,
            confirmados: rows.filter((item) => item.status === "Confirmado").length,
            emAtendimento: rows.filter((item) => item.status === "Em atendimento").length,
            concluidos: rows.filter((item) => item.status === "Atendido").length,
            faltas: rows.filter((item) => item.status === "Faltou").length,
            cancelados: rows.filter((item) => item.status === "Cancelado").length,
            retornosPendentes: rows.filter((item) => item.status === "Retorno pendente" || !!item.retorno_programado_para).length,
            encaixes: rows.filter((item) => item.status === "Encaixe").length,
            coletivos: rows.filter((item) => item.coletivo).length
        };
    }
    async catalogos() {
        await this.ensureEstrutura();
        const [unidades, setores, profissionais, tipos, salas, recursos] = await Promise.all([
            prisma.$queryRaw(Prisma.sql `SELECT nome_fantasia FROM unidade_assistencial ORDER BY nome_fantasia ASC`),
            prisma.$queryRaw(Prisma.sql `
        SELECT DISTINCT NULLIF(TRIM(setor), '') AS setor
        FROM usuario
        WHERE NULLIF(TRIM(setor), '') IS NOT NULL
        ORDER BY setor ASC
      `),
            prisma.$queryRaw(Prisma.sql `
        SELECT nome_completo
        FROM cadastro_profissional
        ORDER BY nome_completo ASC
      `),
            prisma.$queryRaw(Prisma.sql `
        SELECT DISTINCT NULLIF(TRIM(tipo_atendimento), '') AS tipo_atendimento
        FROM central_atendimento
        WHERE NULLIF(TRIM(tipo_atendimento), '') IS NOT NULL
        ORDER BY tipo_atendimento ASC
      `),
            prisma.$queryRaw(Prisma.sql `SELECT nome FROM salas ORDER BY nome ASC`),
            prisma.$queryRaw(Prisma.sql `
        SELECT DISTINCT NULLIF(TRIM(descricao), '') AS descricao
        FROM item_almoxarifado
        WHERE NULLIF(TRIM(descricao), '') IS NOT NULL
        ORDER BY descricao ASC
        LIMIT 100
      `)
        ]);
        return {
            unidades: unidades.map((item) => item.nome_fantasia).filter(Boolean),
            setores: setores.map((item) => item.setor).filter(Boolean),
            profissionais: profissionais.map((item) => item.nome_completo).filter(Boolean),
            tiposAtendimento: tipos.map((item) => item.tipo_atendimento).filter(Boolean),
            salas: salas.map((item) => item.nome).filter(Boolean),
            recursos: recursos.map((item) => item.descricao).filter(Boolean)
        };
    }
}
