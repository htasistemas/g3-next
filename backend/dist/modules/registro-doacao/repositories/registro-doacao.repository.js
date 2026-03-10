import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { normalizeDigits, toOptionalDate, trimOrUndefined } from "../../../utils/string-utils.js";
function toOptionalNumber(value) {
    if (value === null || value === undefined)
        return null;
    return Number.isFinite(value) ? value : null;
}
export class RegistroDoacaoRepository {
    async listar(filters) {
        const where = [];
        const doadorNome = trimOrUndefined(filters.doador_nome);
        if (doadorNome) {
            where.push(Prisma.sql `AND d.nome ILIKE ${`%${doadorNome}%`}`);
        }
        const tipoDoacao = trimOrUndefined(filters.tipo_doacao);
        if (tipoDoacao) {
            where.push(Prisma.sql `AND r.tipo_doacao ILIKE ${`%${tipoDoacao}%`}`);
        }
        const status = trimOrUndefined(filters.status);
        if (status) {
            where.push(Prisma.sql `AND r.status ILIKE ${`%${status}%`}`);
        }
        const dataInicial = toOptionalDate(filters.data_inicial);
        if (dataInicial) {
            where.push(Prisma.sql `AND r.data_recebimento >= ${dataInicial}`);
        }
        const dataFinal = toOptionalDate(filters.data_final);
        if (dataFinal) {
            where.push(Prisma.sql `AND r.data_recebimento <= ${dataFinal}`);
        }
        const whereClause = where.length === 0
            ? Prisma.empty
            : where.length === 1
                ? where[0]
                : Prisma.sql `${Prisma.join(where, " ")}`;
        return prisma.$queryRaw(Prisma.sql `
      SELECT
        r.id,
        r.doador_id,
        d.nome AS doador_nome,
        r.tipo_doacao,
        r.descricao,
        r.quantidade_itens,
        r.valor_medio,
        r.valor_total,
        r.valor,
        r.data_recebimento,
        r.forma_recebimento,
        r.recorrente,
        r.periodicidade,
        r.proxima_cobranca,
        r.status,
        r.observacoes,
        r.conta_recebimento_id,
        r.contabilidade_pendente,
        r.lancamentos_gerados,
        r.criado_em,
        r.atualizado_em
      FROM recebimento_doacao r
      LEFT JOIN doador d ON d.id = r.doador_id
      WHERE 1 = 1
      ${whereClause}
      ORDER BY r.data_recebimento DESC, r.id DESC
    `);
    }
    async buscarPorId(id) {
        const registros = await prisma.$queryRaw(Prisma.sql `
      SELECT
        r.id,
        r.doador_id,
        d.nome AS doador_nome,
        r.tipo_doacao,
        r.descricao,
        r.quantidade_itens,
        r.valor_medio,
        r.valor_total,
        r.valor,
        r.data_recebimento,
        r.forma_recebimento,
        r.recorrente,
        r.periodicidade,
        r.proxima_cobranca,
        r.status,
        r.observacoes,
        r.conta_recebimento_id,
        r.contabilidade_pendente,
        r.lancamentos_gerados,
        r.criado_em,
        r.atualizado_em
      FROM recebimento_doacao r
      LEFT JOIN doador d ON d.id = r.doador_id
      WHERE r.id = ${id}
      LIMIT 1
    `);
        const registro = registros[0];
        if (!registro)
            return null;
        const itens = await prisma.$queryRaw(Prisma.sql `
      SELECT
        id,
        recebimento_doacao_id,
        descricao,
        quantidade,
        unidade,
        valor_unitario,
        valor_total,
        marca,
        modelo,
        conservacao,
        observacoes
      FROM recebimento_doacao_item
      WHERE recebimento_doacao_id = ${id}
      ORDER BY id ASC
    `);
        return { registro, itens };
    }
    async buscarPorIdOuFalhar(id) {
        const item = await this.buscarPorId(id);
        if (!item) {
            throw new AppError("Registro de doacao nao encontrado.", 404);
        }
        return item;
    }
    async criar(input) {
        const registroId = await prisma.$transaction(async (tx) => {
            const inserted = await tx.$queryRaw(Prisma.sql `
        INSERT INTO recebimento_doacao (
          doador_id,
          tipo_doacao,
          descricao,
          quantidade_itens,
          valor_medio,
          valor_total,
          valor,
          data_recebimento,
          forma_recebimento,
          recorrente,
          periodicidade,
          proxima_cobranca,
          status,
          observacoes,
          conta_recebimento_id,
          criado_em,
          atualizado_em
        ) VALUES (
          ${input.doador_id ? BigInt(input.doador_id) : null},
          ${input.tipo_doacao},
          ${trimOrUndefined(input.descricao)},
          ${input.quantidade_itens ?? null},
          ${toOptionalNumber(input.valor_medio)},
          ${toOptionalNumber(input.valor_total)},
          ${toOptionalNumber(input.valor)},
          ${toOptionalDate(input.data_recebimento)},
          ${trimOrUndefined(input.forma_recebimento)},
          ${!!input.recorrente},
          ${trimOrUndefined(input.periodicidade)},
          ${toOptionalDate(input.proxima_cobranca)},
          ${input.status},
          ${trimOrUndefined(input.observacoes)},
          ${input.conta_recebimento_id ? BigInt(input.conta_recebimento_id) : null},
          NOW(),
          NOW()
        )
        RETURNING id
      `);
            const registroId = inserted[0]?.id;
            if (!registroId) {
                throw new AppError("Nao foi possivel criar o registro de doacao.", 500);
            }
            await this.inserirItens(tx, registroId, input.itens ?? []);
            return registroId;
        });
        return this.buscarPorIdOuFalhar(registroId);
    }
    async atualizar(id, input) {
        await this.buscarPorIdOuFalhar(id);
        await prisma.$transaction(async (tx) => {
            await tx.$executeRaw(Prisma.sql `
        UPDATE recebimento_doacao
        SET
          doador_id = ${input.doador_id ? BigInt(input.doador_id) : null},
          tipo_doacao = ${input.tipo_doacao},
          descricao = ${trimOrUndefined(input.descricao)},
          quantidade_itens = ${input.quantidade_itens ?? null},
          valor_medio = ${toOptionalNumber(input.valor_medio)},
          valor_total = ${toOptionalNumber(input.valor_total)},
          valor = ${toOptionalNumber(input.valor)},
          data_recebimento = ${toOptionalDate(input.data_recebimento)},
          forma_recebimento = ${trimOrUndefined(input.forma_recebimento)},
          recorrente = ${!!input.recorrente},
          periodicidade = ${trimOrUndefined(input.periodicidade)},
          proxima_cobranca = ${toOptionalDate(input.proxima_cobranca)},
          status = ${input.status},
          observacoes = ${trimOrUndefined(input.observacoes)},
          conta_recebimento_id = ${input.conta_recebimento_id ? BigInt(input.conta_recebimento_id) : null},
          atualizado_em = NOW()
        WHERE id = ${id}
      `);
            await tx.$executeRaw(Prisma.sql `
        DELETE FROM recebimento_doacao_item
        WHERE recebimento_doacao_id = ${id}
      `);
            await this.inserirItens(tx, id, input.itens ?? []);
        });
        return this.buscarPorIdOuFalhar(id);
    }
    async remover(id) {
        await this.buscarPorIdOuFalhar(id);
        await prisma.$executeRaw(Prisma.sql `
      DELETE FROM recebimento_doacao
      WHERE id = ${id}
    `);
    }
    async listarDoadores(termo) {
        const termoSanitizado = trimOrUndefined(termo);
        const like = termoSanitizado ? `%${termoSanitizado}%` : undefined;
        const filtroBusca = like
            ? Prisma.sql `
        AND (
          nome ILIKE ${like}
          OR documento ILIKE ${like}
          OR email ILIKE ${like}
        )
      `
            : Prisma.empty;
        return prisma.$queryRaw(Prisma.sql `
      SELECT
        id,
        nome,
        tipo_pessoa,
        documento,
        responsavel_empresa,
        email,
        telefone,
        logradouro,
        numero,
        complemento,
        bairro,
        cidade,
        uf,
        cep,
        observacoes,
        criado_em,
        atualizado_em
      FROM doador
      WHERE 1 = 1
      ${filtroBusca}
      ORDER BY nome ASC
    `);
    }
    async criarDoador(input) {
        const inserted = await prisma.$queryRaw(Prisma.sql `
      INSERT INTO doador (
        nome,
        tipo_pessoa,
        documento,
        responsavel_empresa,
        email,
        telefone,
        logradouro,
        numero,
        complemento,
        bairro,
        cidade,
        uf,
        cep,
        observacoes,
        criado_em,
        atualizado_em
      ) VALUES (
        ${input.nome},
        ${trimOrUndefined(input.tipo_pessoa)},
        ${normalizeDigits(input.documento) ?? trimOrUndefined(input.documento)},
        ${trimOrUndefined(input.responsavel_empresa)},
        ${trimOrUndefined(input.email)},
        ${normalizeDigits(input.telefone)},
        ${trimOrUndefined(input.logradouro)},
        ${trimOrUndefined(input.numero)},
        ${trimOrUndefined(input.complemento)},
        ${trimOrUndefined(input.bairro)},
        ${trimOrUndefined(input.cidade)},
        ${trimOrUndefined(input.uf)?.toUpperCase()},
        ${normalizeDigits(input.cep)},
        ${trimOrUndefined(input.observacoes)},
        NOW(),
        NOW()
      )
      RETURNING id
    `);
        const id = inserted[0]?.id;
        if (!id) {
            throw new AppError("Nao foi possivel criar o doador.", 500);
        }
        const doadores = await prisma.$queryRaw(Prisma.sql `
      SELECT
        id,
        nome,
        tipo_pessoa,
        documento,
        responsavel_empresa,
        email,
        telefone,
        logradouro,
        numero,
        complemento,
        bairro,
        cidade,
        uf,
        cep,
        observacoes,
        criado_em,
        atualizado_em
      FROM doador
      WHERE id = ${id}
      LIMIT 1
    `);
        const doador = doadores[0];
        if (!doador) {
            throw new AppError("Doador nao encontrado apos criacao.", 500);
        }
        return doador;
    }
    async removerDoador(id) {
        const existentes = await prisma.$queryRaw(Prisma.sql `
      SELECT id
      FROM doador
      WHERE id = ${id}
      LIMIT 1
    `);
        if (!existentes[0]) {
            throw new AppError("Doador nao encontrado.", 404);
        }
        await prisma.$executeRaw(Prisma.sql `
      DELETE FROM doador
      WHERE id = ${id}
    `);
    }
    async inserirItens(tx, registroId, itens) {
        for (const item of itens) {
            await tx.$executeRaw(Prisma.sql `
        INSERT INTO recebimento_doacao_item (
          recebimento_doacao_id,
          descricao,
          quantidade,
          unidade,
          valor_unitario,
          valor_total,
          marca,
          modelo,
          conservacao,
          observacoes,
          criado_em
        ) VALUES (
          ${registroId},
          ${item.descricao},
          ${item.quantidade},
          ${trimOrUndefined(item.unidade)},
          ${toOptionalNumber(item.valor_unitario)},
          ${toOptionalNumber(item.valor_total)},
          ${trimOrUndefined(item.marca)},
          ${trimOrUndefined(item.modelo)},
          ${trimOrUndefined(item.conservacao)},
          ${trimOrUndefined(item.observacoes)},
          NOW()
        )
      `);
        }
    }
}
