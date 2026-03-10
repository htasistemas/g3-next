import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { trimOrUndefined } from "../../../utils/string-utils.js";
export class TransparenciasRepository {
    async listar() {
        const transparencias = await prisma.$queryRaw(Prisma.sql `
      SELECT
        id,
        unidade_id,
        total_recebido::float8 AS total_recebido,
        total_recebido_helper,
        total_aplicado::float8 AS total_aplicado,
        total_aplicado_helper,
        saldo_disponivel::float8 AS saldo_disponivel,
        saldo_disponivel_helper,
        prestado_mes::float8 AS prestado_mes,
        prestado_mes_helper
      FROM transparencia
      ORDER BY id DESC
    `);
        const ids = transparencias.map((item) => item.id);
        const recebimentos = ids.length ? await this.listarRecebimentos(ids) : [];
        const destinacoes = ids.length ? await this.listarDestinacoes(ids) : [];
        const comprovantes = ids.length ? await this.listarComprovantes(ids) : [];
        const timelines = ids.length ? await this.listarTimelines(ids) : [];
        const checklist = ids.length ? await this.listarChecklist(ids) : [];
        return transparencias.map((transparencia) => ({
            transparencia,
            recebimentos,
            destinacoes,
            comprovantes,
            timelines,
            checklist
        }));
    }
    async buscarPorId(id) {
        const rows = await prisma.$queryRaw(Prisma.sql `
      SELECT
        id,
        unidade_id,
        total_recebido::float8 AS total_recebido,
        total_recebido_helper,
        total_aplicado::float8 AS total_aplicado,
        total_aplicado_helper,
        saldo_disponivel::float8 AS saldo_disponivel,
        saldo_disponivel_helper,
        prestado_mes::float8 AS prestado_mes,
        prestado_mes_helper
      FROM transparencia
      WHERE id = ${id}
      LIMIT 1
    `);
        const transparencia = rows[0] ?? null;
        if (!transparencia)
            return null;
        const recebimentos = await this.listarRecebimentos([id]);
        const destinacoes = await this.listarDestinacoes([id]);
        const comprovantes = await this.listarComprovantes([id]);
        const timelines = await this.listarTimelines([id]);
        const checklist = await this.listarChecklist([id]);
        return {
            transparencia,
            recebimentos,
            destinacoes,
            comprovantes,
            timelines,
            checklist
        };
    }
    async buscarPorIdOuFalhar(id) {
        const registro = await this.buscarPorId(id);
        if (!registro)
            throw new AppError("Registro de prestacao de contas nao encontrado.", 404);
        return registro;
    }
    async criar(input) {
        const id = await prisma.$transaction(async (tx) => {
            const rows = await tx.$queryRaw(Prisma.sql `
        INSERT INTO transparencia (
          unidade_id,
          total_recebido,
          total_recebido_helper,
          total_aplicado,
          total_aplicado_helper,
          saldo_disponivel,
          saldo_disponivel_helper,
          prestado_mes,
          prestado_mes_helper,
          criado_em,
          atualizado_em
        ) VALUES (
          ${input.unidadeId ? BigInt(input.unidadeId) : null},
          ${input.totalRecebido ?? null},
          ${trimOrUndefined(input.totalRecebidoHelper ?? undefined)},
          ${input.totalAplicado ?? null},
          ${trimOrUndefined(input.totalAplicadoHelper ?? undefined)},
          ${input.saldoDisponivel ?? null},
          ${trimOrUndefined(input.saldoDisponivelHelper ?? undefined)},
          ${input.prestadoMes ?? null},
          ${trimOrUndefined(input.prestadoMesHelper ?? undefined)},
          NOW(),
          NOW()
        )
        RETURNING id
      `);
            const transparenciaId = rows[0]?.id;
            if (!transparenciaId)
                throw new AppError("Nao foi possivel criar registro de transparência.", 500);
            await this.salvarRelacionamentos(tx, transparenciaId, input);
            return transparenciaId;
        });
        return this.buscarPorIdOuFalhar(id);
    }
    async atualizar(id, input) {
        await this.buscarPorIdOuFalhar(id);
        await prisma.$transaction(async (tx) => {
            await tx.$executeRaw(Prisma.sql `
        UPDATE transparencia
        SET
          unidade_id = ${input.unidadeId ? BigInt(input.unidadeId) : null},
          total_recebido = ${input.totalRecebido ?? null},
          total_recebido_helper = ${trimOrUndefined(input.totalRecebidoHelper ?? undefined)},
          total_aplicado = ${input.totalAplicado ?? null},
          total_aplicado_helper = ${trimOrUndefined(input.totalAplicadoHelper ?? undefined)},
          saldo_disponivel = ${input.saldoDisponivel ?? null},
          saldo_disponivel_helper = ${trimOrUndefined(input.saldoDisponivelHelper ?? undefined)},
          prestado_mes = ${input.prestadoMes ?? null},
          prestado_mes_helper = ${trimOrUndefined(input.prestadoMesHelper ?? undefined)},
          atualizado_em = NOW()
        WHERE id = ${id}
      `);
            await this.salvarRelacionamentos(tx, id, input);
        });
        return this.buscarPorIdOuFalhar(id);
    }
    async remover(id) {
        await this.buscarPorIdOuFalhar(id);
        await prisma.$executeRaw(Prisma.sql `
      DELETE FROM transparencia
      WHERE id = ${id}
    `);
    }
    async listarRecebimentos(ids) {
        return prisma.$queryRaw(Prisma.sql `
      SELECT
        id,
        transparencia_id,
        fonte,
        valor::float8 AS valor,
        periodicidade,
        status,
        ordem
      FROM transparencia_recebimentos
      WHERE transparencia_id IN (${Prisma.join(ids)})
      ORDER BY transparencia_id, ordem, id
    `);
    }
    async listarDestinacoes(ids) {
        return prisma.$queryRaw(Prisma.sql `
      SELECT
        id,
        transparencia_id,
        titulo,
        descricao,
        percentual::float8 AS percentual,
        ordem
      FROM transparencia_destinacoes
      WHERE transparencia_id IN (${Prisma.join(ids)})
      ORDER BY transparencia_id, ordem, id
    `);
    }
    async listarComprovantes(ids) {
        return prisma.$queryRaw(Prisma.sql `
      SELECT
        id,
        transparencia_id,
        titulo,
        descricao,
        arquivo_nome,
        arquivo_url,
        ordem
      FROM transparencia_comprovantes
      WHERE transparencia_id IN (${Prisma.join(ids)})
      ORDER BY transparencia_id, ordem, id
    `);
    }
    async listarTimelines(ids) {
        return prisma.$queryRaw(Prisma.sql `
      SELECT
        id,
        transparencia_id,
        titulo,
        detalhe,
        status,
        ordem
      FROM transparencia_timelines
      WHERE transparencia_id IN (${Prisma.join(ids)})
      ORDER BY transparencia_id, ordem, id
    `);
    }
    async listarChecklist(ids) {
        return prisma.$queryRaw(Prisma.sql `
      SELECT
        id,
        transparencia_id,
        titulo,
        descricao,
        status,
        ordem
      FROM transparencia_checklist
      WHERE transparencia_id IN (${Prisma.join(ids)})
      ORDER BY transparencia_id, ordem, id
    `);
    }
    async salvarRelacionamentos(tx, transparenciaId, input) {
        await tx.$executeRaw(Prisma.sql `
      DELETE FROM transparencia_recebimentos
      WHERE transparencia_id = ${transparenciaId}
    `);
        await tx.$executeRaw(Prisma.sql `
      DELETE FROM transparencia_destinacoes
      WHERE transparencia_id = ${transparenciaId}
    `);
        await tx.$executeRaw(Prisma.sql `
      DELETE FROM transparencia_comprovantes
      WHERE transparencia_id = ${transparenciaId}
    `);
        await tx.$executeRaw(Prisma.sql `
      DELETE FROM transparencia_timelines
      WHERE transparencia_id = ${transparenciaId}
    `);
        await tx.$executeRaw(Prisma.sql `
      DELETE FROM transparencia_checklist
      WHERE transparencia_id = ${transparenciaId}
    `);
        await this.inserirRecebimentos(tx, transparenciaId, input.recebimentos ?? []);
        await this.inserirDestinacoes(tx, transparenciaId, input.destinacoes ?? []);
        await this.inserirComprovantes(tx, transparenciaId, input.comprovantes ?? []);
        await this.inserirTimelines(tx, transparenciaId, input.timelines ?? []);
        await this.inserirChecklist(tx, transparenciaId, input.checklist ?? []);
    }
    async inserirRecebimentos(tx, transparenciaId, lista) {
        for (let index = 0; index < lista.length; index += 1) {
            const item = lista[index];
            await tx.$executeRaw(Prisma.sql `
        INSERT INTO transparencia_recebimentos (
          transparencia_id,
          fonte,
          valor,
          periodicidade,
          status,
          ordem
        ) VALUES (
          ${transparenciaId},
          ${item.fonte},
          ${item.valor ?? null},
          ${trimOrUndefined(item.periodicidade ?? undefined)},
          ${trimOrUndefined(item.status ?? undefined)},
          ${index}
        )
      `);
        }
    }
    async inserirDestinacoes(tx, transparenciaId, lista) {
        for (let index = 0; index < lista.length; index += 1) {
            const item = lista[index];
            await tx.$executeRaw(Prisma.sql `
        INSERT INTO transparencia_destinacoes (
          transparencia_id,
          titulo,
          descricao,
          percentual,
          ordem
        ) VALUES (
          ${transparenciaId},
          ${item.titulo},
          ${trimOrUndefined(item.descricao ?? undefined)},
          ${item.percentual ?? null},
          ${index}
        )
      `);
        }
    }
    async inserirComprovantes(tx, transparenciaId, lista) {
        for (let index = 0; index < lista.length; index += 1) {
            const item = lista[index];
            await tx.$executeRaw(Prisma.sql `
        INSERT INTO transparencia_comprovantes (
          transparencia_id,
          titulo,
          descricao,
          arquivo_nome,
          arquivo_url,
          ordem
        ) VALUES (
          ${transparenciaId},
          ${item.titulo},
          ${trimOrUndefined(item.descricao ?? undefined)},
          ${trimOrUndefined(item.arquivoNome ?? undefined)},
          ${trimOrUndefined(item.arquivoUrl ?? undefined)},
          ${index}
        )
      `);
        }
    }
    async inserirTimelines(tx, transparenciaId, lista) {
        for (let index = 0; index < lista.length; index += 1) {
            const item = lista[index];
            await tx.$executeRaw(Prisma.sql `
        INSERT INTO transparencia_timelines (
          transparencia_id,
          titulo,
          detalhe,
          status,
          ordem
        ) VALUES (
          ${transparenciaId},
          ${item.titulo},
          ${trimOrUndefined(item.detalhe ?? undefined)},
          ${trimOrUndefined(item.status ?? undefined)},
          ${index}
        )
      `);
        }
    }
    async inserirChecklist(tx, transparenciaId, lista) {
        for (let index = 0; index < lista.length; index += 1) {
            const item = lista[index];
            await tx.$executeRaw(Prisma.sql `
        INSERT INTO transparencia_checklist (
          transparencia_id,
          titulo,
          descricao,
          status,
          ordem
        ) VALUES (
          ${transparenciaId},
          ${item.titulo},
          ${trimOrUndefined(item.descricao ?? undefined)},
          ${trimOrUndefined(item.status ?? undefined)},
          ${index}
        )
      `);
        }
    }
}
