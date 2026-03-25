import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { normalizeDigits, toOptionalDate, trimOrUndefined } from "../../../utils/string-utils.js";
import { mapBarracaEvento, mapEventoCarteira, mapItemEvento, mapMovimentacaoCarteira, mapParticipanteCarteira, mapVendaCarteira } from "../carteira-evento.mapper.js";
import { ensureCarteiraEventoEstrutura } from "./carteira-evento-estrutura.repository.js";
export class CarteiraEventoRepository {
    async listarEventos(filters) {
        await ensureCarteiraEventoEstrutura(prisma);
        const where = [];
        const status = trimOrUndefined(filters.status);
        if (status) {
            where.push(Prisma.sql `AND e.status = ${status.toUpperCase()}`);
        }
        const busca = trimOrUndefined(filters.busca);
        if (busca) {
            where.push(Prisma.sql `AND unaccent(e.nome_evento) ILIKE unaccent(${`%${busca}%`})`);
        }
        const limite = Number.isInteger(filters.limite) ? Number(filters.limite) : 100;
        const rows = await prisma.$queryRaw(Prisma.sql `
      SELECT
        e.id,
        e.nome_evento,
        e.tipo_evento,
        e.data_inicio,
        e.data_fim,
        e.status,
        e.permite_recarga,
        e.permite_transferencia,
        e.permite_estorno,
        e.validade_credito,
        e.centro_receita,
        e.modo_financeiro,
        e.observacoes,
        e.permite_saldo_negativo_adm,
        e.criado_em,
        e.atualizado_em
      FROM carteira_evento e
      WHERE 1 = 1
      ${where.length ? Prisma.join(where, " ") : Prisma.empty}
      ORDER BY e.data_inicio DESC, e.id DESC
      LIMIT ${limite}
    `);
        return rows.map(mapEventoCarteira);
    }
    async criarEvento(input) {
        await ensureCarteiraEventoEstrutura(prisma);
        const rows = await prisma.$queryRaw(Prisma.sql `
      INSERT INTO carteira_evento (
        nome_evento,
        tipo_evento,
        data_inicio,
        data_fim,
        status,
        permite_recarga,
        permite_transferencia,
        permite_estorno,
        validade_credito,
        centro_receita,
        modo_financeiro,
        observacoes,
        permite_saldo_negativo_adm,
        criado_em,
        atualizado_em
      ) VALUES (
        ${input.nome_evento.trim()},
        ${input.tipo_evento},
        ${toOptionalDate(input.data_inicio)},
        ${toOptionalDate(input.data_fim)},
        ${input.status},
        ${input.permite_recarga},
        ${input.permite_transferencia},
        ${input.permite_estorno},
        ${toOptionalDate(input.validade_credito)},
        ${trimOrUndefined(input.centro_receita)},
        ${input.modo_financeiro},
        ${trimOrUndefined(input.observacoes)},
        ${!!input.permite_saldo_negativo_adm},
        NOW(),
        NOW()
      )
      RETURNING id
    `);
        return this.buscarEventoPorIdOuFalhar(rows[0].id);
    }
    async atualizarEvento(id, input) {
        await ensureCarteiraEventoEstrutura(prisma);
        await this.buscarEventoConfigPorIdOuFalhar(id);
        await prisma.$executeRaw(Prisma.sql `
      UPDATE carteira_evento
      SET
        nome_evento = ${input.nome_evento.trim()},
        tipo_evento = ${input.tipo_evento},
        data_inicio = ${toOptionalDate(input.data_inicio)},
        data_fim = ${toOptionalDate(input.data_fim)},
        status = ${input.status},
        permite_recarga = ${input.permite_recarga},
        permite_transferencia = ${input.permite_transferencia},
        permite_estorno = ${input.permite_estorno},
        validade_credito = ${toOptionalDate(input.validade_credito)},
        centro_receita = ${trimOrUndefined(input.centro_receita)},
        modo_financeiro = ${input.modo_financeiro},
        observacoes = ${trimOrUndefined(input.observacoes)},
        permite_saldo_negativo_adm = ${!!input.permite_saldo_negativo_adm},
        atualizado_em = NOW()
      WHERE id = ${id}
    `);
        return this.buscarEventoPorIdOuFalhar(id);
    }
    async listarParticipantes(filters) {
        await ensureCarteiraEventoEstrutura(prisma);
        const where = [];
        if (filters.evento_id) {
            where.push(Prisma.sql `AND p.evento_id = ${BigInt(filters.evento_id)}`);
        }
        const status = trimOrUndefined(filters.status);
        if (status) {
            where.push(Prisma.sql `AND p.status = ${status.toUpperCase()}`);
        }
        const busca = trimOrUndefined(filters.busca);
        if (busca) {
            const termo = `%${busca}%`;
            where.push(Prisma.sql `
        AND (
          unaccent(p.nome) ILIKE unaccent(${termo})
          OR COALESCE(p.numero_carteira, '') ILIKE ${termo}
          OR COALESCE(p.telefone, '') ILIKE ${termo}
          OR COALESCE(p.cpf, '') ILIKE ${termo}
        )
      `);
        }
        const limite = Number.isInteger(filters.limite) ? Number(filters.limite) : 200;
        const rows = await prisma.$queryRaw(Prisma.sql `
      SELECT
        p.id,
        p.evento_id,
        e.nome_evento,
        p.nome,
        p.telefone,
        p.cpf,
        p.foto_url,
        p.responsavel,
        p.numero_carteira,
        p.status,
        p.qr_code_token_unico,
        p.saldo_atual,
        p.observacoes,
        p.criado_em,
        p.atualizado_em
      FROM carteira_evento_participante p
      INNER JOIN carteira_evento e ON e.id = p.evento_id
      WHERE 1 = 1
      ${where.length ? Prisma.join(where, " ") : Prisma.empty}
      ORDER BY p.nome ASC, p.id DESC
      LIMIT ${limite}
    `);
        return rows.map(mapParticipanteCarteira);
    }
    async buscarParticipantePorIdOuFalhar(id) {
        await ensureCarteiraEventoEstrutura(prisma);
        const rows = await prisma.$queryRaw(Prisma.sql `
      SELECT
        p.id,
        p.evento_id,
        e.nome_evento,
        p.nome,
        p.telefone,
        p.cpf,
        p.foto_url,
        p.responsavel,
        p.numero_carteira,
        p.status,
        p.qr_code_token_unico,
        p.saldo_atual,
        p.observacoes,
        p.criado_em,
        p.atualizado_em
      FROM carteira_evento_participante p
      INNER JOIN carteira_evento e ON e.id = p.evento_id
      WHERE p.id = ${id}
      LIMIT 1
    `);
        const row = rows[0];
        if (!row) {
            throw new AppError("Participante da carteira nao encontrado.", 404);
        }
        return mapParticipanteCarteira(row);
    }
    async criarParticipante(input) {
        await ensureCarteiraEventoEstrutura(prisma);
        const evento = await this.buscarEventoConfigPorIdOuFalhar(BigInt(input.evento_id));
        const numeroCarteira = trimOrUndefined(input.numero_carteira) ?? (await this.gerarNumeroCarteira(BigInt(input.evento_id)));
        const token = this.gerarTokenSeguro();
        const rows = await prisma.$queryRaw(Prisma.sql `
      INSERT INTO carteira_evento_participante (
        evento_id,
        nome,
        telefone,
        cpf,
        foto_url,
        responsavel,
        numero_carteira,
        status,
        qr_code_token_unico,
        saldo_atual,
        observacoes,
        criado_em,
        atualizado_em
      ) VALUES (
        ${evento.id},
        ${input.nome.trim()},
        ${normalizeDigits(input.telefone)},
        ${normalizeDigits(input.cpf)},
        ${trimOrUndefined(input.foto_url)},
        ${trimOrUndefined(input.responsavel)},
        ${numeroCarteira},
        ${input.status},
        ${token},
        0,
        ${trimOrUndefined(input.observacoes)},
        NOW(),
        NOW()
      )
      RETURNING id
    `);
        return this.buscarParticipantePorIdOuFalhar(rows[0].id);
    }
    async atualizarParticipante(id, input) {
        await ensureCarteiraEventoEstrutura(prisma);
        await this.buscarParticipanteSaldoPorIdOuFalhar(id);
        await this.buscarEventoConfigPorIdOuFalhar(BigInt(input.evento_id));
        const numeroCarteira = trimOrUndefined(input.numero_carteira) ?? (await this.gerarNumeroCarteira(BigInt(input.evento_id), id));
        await prisma.$executeRaw(Prisma.sql `
      UPDATE carteira_evento_participante
      SET
        evento_id = ${BigInt(input.evento_id)},
        nome = ${input.nome.trim()},
        telefone = ${normalizeDigits(input.telefone)},
        cpf = ${normalizeDigits(input.cpf)},
        foto_url = ${trimOrUndefined(input.foto_url)},
        responsavel = ${trimOrUndefined(input.responsavel)},
        numero_carteira = ${numeroCarteira},
        status = ${input.status},
        observacoes = ${trimOrUndefined(input.observacoes)},
        atualizado_em = NOW()
      WHERE id = ${id}
    `);
        return this.buscarParticipantePorIdOuFalhar(id);
    }
    async listarBarracas(filters) {
        await ensureCarteiraEventoEstrutura(prisma);
        const where = [];
        if (filters.evento_id) {
            where.push(Prisma.sql `AND b.evento_id = ${BigInt(filters.evento_id)}`);
        }
        const status = trimOrUndefined(filters.status);
        if (status) {
            where.push(Prisma.sql `AND b.status = ${status.toUpperCase()}`);
        }
        const rows = await prisma.$queryRaw(Prisma.sql `
      SELECT
        b.id,
        b.evento_id,
        e.nome_evento,
        b.nome_barraca,
        b.responsavel,
        b.tipo_barraca,
        b.operador,
        b.status,
        b.impressora,
        b.observacoes,
        b.criado_em,
        b.atualizado_em
      FROM carteira_evento_barraca b
      INNER JOIN carteira_evento e ON e.id = b.evento_id
      WHERE 1 = 1
      ${where.length ? Prisma.join(where, " ") : Prisma.empty}
      ORDER BY b.nome_barraca ASC
    `);
        return rows.map(mapBarracaEvento);
    }
    async criarBarraca(input) {
        await ensureCarteiraEventoEstrutura(prisma);
        await this.buscarEventoConfigPorIdOuFalhar(BigInt(input.evento_id));
        const rows = await prisma.$queryRaw(Prisma.sql `
      INSERT INTO carteira_evento_barraca (
        evento_id,
        nome_barraca,
        responsavel,
        tipo_barraca,
        operador,
        status,
        impressora,
        observacoes,
        criado_em,
        atualizado_em
      ) VALUES (
        ${BigInt(input.evento_id)},
        ${input.nome_barraca.trim()},
        ${trimOrUndefined(input.responsavel)},
        ${trimOrUndefined(input.tipo_barraca)},
        ${trimOrUndefined(input.operador)},
        ${input.status},
        ${trimOrUndefined(input.impressora)},
        ${trimOrUndefined(input.observacoes)},
        NOW(),
        NOW()
      )
      RETURNING id
    `);
        return this.buscarBarracaPorIdOuFalhar(rows[0].id);
    }
    async atualizarBarraca(id, input) {
        await ensureCarteiraEventoEstrutura(prisma);
        await this.buscarBarracaPorIdOuFalhar(id);
        await prisma.$executeRaw(Prisma.sql `
      UPDATE carteira_evento_barraca
      SET
        evento_id = ${BigInt(input.evento_id)},
        nome_barraca = ${input.nome_barraca.trim()},
        responsavel = ${trimOrUndefined(input.responsavel)},
        tipo_barraca = ${trimOrUndefined(input.tipo_barraca)},
        operador = ${trimOrUndefined(input.operador)},
        status = ${input.status},
        impressora = ${trimOrUndefined(input.impressora)},
        observacoes = ${trimOrUndefined(input.observacoes)},
        atualizado_em = NOW()
      WHERE id = ${id}
    `);
        return this.buscarBarracaPorIdOuFalhar(id);
    }
    async listarItens(filters) {
        await ensureCarteiraEventoEstrutura(prisma);
        const where = [];
        if (filters.evento_id) {
            where.push(Prisma.sql `AND i.evento_id = ${BigInt(filters.evento_id)}`);
        }
        if (filters.barraca_id) {
            where.push(Prisma.sql `AND i.barraca_id = ${BigInt(filters.barraca_id)}`);
        }
        if (typeof filters.ativo === "boolean") {
            where.push(Prisma.sql `AND i.ativo = ${filters.ativo}`);
        }
        const busca = trimOrUndefined(filters.busca);
        if (busca) {
            where.push(Prisma.sql `AND unaccent(i.nome_item) ILIKE unaccent(${`%${busca}%`})`);
        }
        const rows = await prisma.$queryRaw(Prisma.sql `
      SELECT
        i.id,
        i.evento_id,
        i.barraca_id,
        e.nome_evento,
        b.nome_barraca,
        i.nome_item,
        i.categoria,
        i.preco,
        i.estoque,
        i.ativo,
        i.foto_url,
        i.ordem_exibicao,
        i.criado_em,
        i.atualizado_em
      FROM carteira_evento_item i
      INNER JOIN carteira_evento e ON e.id = i.evento_id
      LEFT JOIN carteira_evento_barraca b ON b.id = i.barraca_id
      WHERE 1 = 1
      ${where.length ? Prisma.join(where, " ") : Prisma.empty}
      ORDER BY i.ordem_exibicao ASC, i.nome_item ASC
    `);
        return rows.map(mapItemEvento);
    }
    async criarItem(input) {
        await ensureCarteiraEventoEstrutura(prisma);
        await this.buscarEventoConfigPorIdOuFalhar(BigInt(input.evento_id));
        if (input.barraca_id) {
            await this.buscarBarracaPorIdOuFalhar(BigInt(input.barraca_id));
        }
        const rows = await prisma.$queryRaw(Prisma.sql `
      INSERT INTO carteira_evento_item (
        evento_id,
        barraca_id,
        nome_item,
        categoria,
        preco,
        estoque,
        ativo,
        foto_url,
        ordem_exibicao,
        criado_em,
        atualizado_em
      ) VALUES (
        ${BigInt(input.evento_id)},
        ${input.barraca_id ? BigInt(input.barraca_id) : null},
        ${input.nome_item.trim()},
        ${input.categoria},
        ${input.preco},
        ${typeof input.estoque === "number" ? input.estoque : null},
        ${input.ativo},
        ${trimOrUndefined(input.foto_url)},
        ${input.ordem_exibicao ?? 0},
        NOW(),
        NOW()
      )
      RETURNING id
    `);
        return this.buscarItemPorIdOuFalhar(rows[0].id);
    }
    async atualizarItem(id, input) {
        await ensureCarteiraEventoEstrutura(prisma);
        await this.buscarItemPorIdOuFalhar(id);
        await prisma.$executeRaw(Prisma.sql `
      UPDATE carteira_evento_item
      SET
        evento_id = ${BigInt(input.evento_id)},
        barraca_id = ${input.barraca_id ? BigInt(input.barraca_id) : null},
        nome_item = ${input.nome_item.trim()},
        categoria = ${input.categoria},
        preco = ${input.preco},
        estoque = ${typeof input.estoque === "number" ? input.estoque : null},
        ativo = ${input.ativo},
        foto_url = ${trimOrUndefined(input.foto_url)},
        ordem_exibicao = ${input.ordem_exibicao ?? 0},
        atualizado_em = NOW()
      WHERE id = ${id}
    `);
        return this.buscarItemPorIdOuFalhar(id);
    }
    async recarregar(input, ator) {
        await ensureCarteiraEventoEstrutura(prisma);
        return prisma.$transaction(async (tx) => {
            const participante = await this.buscarParticipanteSaldoPorIdOuFalhar(BigInt(input.participante_id), tx, true);
            const evento = await this.buscarEventoConfigPorIdOuFalhar(participante.evento_id, tx);
            if (!evento.permite_recarga) {
                throw new AppError("Este evento nao permite recarga no momento.", 409);
            }
            if (participante.status !== "ATIVO") {
                throw new AppError("A carteira informada nao esta ativa para recarga.", 409);
            }
            const saldoAnterior = Number(participante.saldo_atual ?? 0);
            const saldoPosterior = saldoAnterior + input.valor_recarga;
            await tx.$executeRaw(Prisma.sql `
        UPDATE carteira_evento_participante
        SET saldo_atual = ${saldoPosterior}, atualizado_em = NOW()
        WHERE id = ${participante.id}
      `);
            await this.registrarMovimentacaoTx(tx, {
                evento_id: participante.evento_id,
                participante_id: participante.id,
                tipo_movimentacao: "RECARGA",
                forma_pagamento: input.forma_pagamento,
                valor: input.valor_recarga,
                saldo_anterior: saldoAnterior,
                saldo_posterior: saldoPosterior,
                descricao: "Recarga de credito",
                motivo: trimOrUndefined(input.observacao),
                operador: ator
            });
            return this.buscarParticipantePorIdOuFalhar(participante.id);
        });
    }
    async transferir(input, ator) {
        await ensureCarteiraEventoEstrutura(prisma);
        return prisma.$transaction(async (tx) => {
            const evento = await this.buscarEventoConfigPorIdOuFalhar(BigInt(input.evento_id), tx);
            if (!evento.permite_transferencia) {
                throw new AppError("Este evento nao permite transferencia de creditos.", 409);
            }
            const origem = await this.buscarParticipanteSaldoPorIdOuFalhar(BigInt(input.carteira_origem_id), tx, true);
            const destino = await this.buscarParticipanteSaldoPorIdOuFalhar(BigInt(input.carteira_destino_id), tx, true);
            if (origem.evento_id !== evento.id || destino.evento_id !== evento.id) {
                throw new AppError("As carteiras informadas nao pertencem ao evento selecionado.", 409);
            }
            if (origem.id === destino.id) {
                throw new AppError("A carteira de origem deve ser diferente da carteira de destino.", 409);
            }
            if (Number(origem.saldo_atual) < input.valor_transferencia) {
                throw new AppError("Saldo insuficiente na carteira de origem.", 409);
            }
            const referencia = `TRANSFER-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
            const origemSaldoAnterior = Number(origem.saldo_atual);
            const origemSaldoPosterior = origemSaldoAnterior - input.valor_transferencia;
            const destinoSaldoAnterior = Number(destino.saldo_atual);
            const destinoSaldoPosterior = destinoSaldoAnterior + input.valor_transferencia;
            await tx.$executeRaw(Prisma.sql `
        UPDATE carteira_evento_participante
        SET saldo_atual = CASE
          WHEN id = ${origem.id} THEN ${origemSaldoPosterior}
          WHEN id = ${destino.id} THEN ${destinoSaldoPosterior}
          ELSE saldo_atual
        END,
        atualizado_em = NOW()
        WHERE id IN (${origem.id}, ${destino.id})
      `);
            await this.registrarMovimentacaoTx(tx, {
                evento_id: evento.id,
                participante_id: origem.id,
                tipo_movimentacao: "TRANSFERENCIA_ENVIADA",
                valor: input.valor_transferencia,
                saldo_anterior: origemSaldoAnterior,
                saldo_posterior: origemSaldoPosterior,
                descricao: `Transferencia enviada para ${destino.nome}`,
                motivo: input.motivo,
                referencia_externa: referencia,
                operador: ator
            });
            await this.registrarMovimentacaoTx(tx, {
                evento_id: evento.id,
                participante_id: destino.id,
                tipo_movimentacao: "TRANSFERENCIA_RECEBIDA",
                valor: input.valor_transferencia,
                saldo_anterior: destinoSaldoAnterior,
                saldo_posterior: destinoSaldoPosterior,
                descricao: `Transferencia recebida de ${origem.nome}`,
                motivo: input.motivo,
                referencia_externa: referencia,
                operador: ator
            });
            return {
                origem: await this.buscarParticipantePorIdOuFalhar(origem.id),
                destino: await this.buscarParticipantePorIdOuFalhar(destino.id),
                referencia
            };
        });
    }
    async ajustar(input, ator) {
        await ensureCarteiraEventoEstrutura(prisma);
        return prisma.$transaction(async (tx) => {
            const participante = await this.buscarParticipanteSaldoPorIdOuFalhar(BigInt(input.participante_id), tx, true);
            const evento = await this.buscarEventoConfigPorIdOuFalhar(participante.evento_id, tx);
            const saldoAnterior = Number(participante.saldo_atual);
            let delta = input.valor;
            let tipoMovimentacao = "AJUSTE_CREDITO";
            if (input.tipo_ajuste === "DEBITO") {
                delta = input.valor * -1;
                tipoMovimentacao = "AJUSTE_DEBITO";
            }
            else if (input.tipo_ajuste === "ESTORNO") {
                if (!evento.permite_estorno) {
                    throw new AppError("Este evento nao permite estorno.", 409);
                }
                tipoMovimentacao = "ESTORNO";
            }
            const saldoPosterior = saldoAnterior + delta;
            if (saldoPosterior < 0 && !evento.permite_saldo_negativo_adm) {
                throw new AppError("O ajuste informado deixaria a carteira com saldo negativo.", 409);
            }
            await tx.$executeRaw(Prisma.sql `
        UPDATE carteira_evento_participante
        SET saldo_atual = ${saldoPosterior}, atualizado_em = NOW()
        WHERE id = ${participante.id}
      `);
            await this.registrarMovimentacaoTx(tx, {
                evento_id: participante.evento_id,
                participante_id: participante.id,
                tipo_movimentacao: tipoMovimentacao,
                valor: Math.abs(delta),
                saldo_anterior: saldoAnterior,
                saldo_posterior: saldoPosterior,
                descricao: input.tipo_ajuste === "DEBITO"
                    ? "Debito manual"
                    : input.tipo_ajuste === "ESTORNO"
                        ? "Estorno manual"
                        : "Credito manual",
                motivo: input.motivo,
                operador: ator
            });
            return this.buscarParticipantePorIdOuFalhar(participante.id);
        });
    }
    async alterarStatusParticipante(id, status, ator) {
        await ensureCarteiraEventoEstrutura(prisma);
        const participante = await this.buscarParticipanteSaldoPorIdOuFalhar(id);
        await prisma.$executeRaw(Prisma.sql `
      UPDATE carteira_evento_participante
      SET status = ${status}, atualizado_em = NOW()
      WHERE id = ${id}
    `);
        await prisma.$executeRaw(Prisma.sql `
      INSERT INTO carteira_evento_movimentacao (
        evento_id,
        participante_id,
        tipo_movimentacao,
        valor,
        saldo_anterior,
        saldo_posterior,
        descricao,
        motivo,
        operador_usuario_id,
        operador_nome,
        criado_em
      ) VALUES (
        ${participante.evento_id},
        ${participante.id},
        'AJUSTE_CREDITO',
        0,
        ${Number(participante.saldo_atual)},
        ${Number(participante.saldo_atual)},
        'Atualizacao de status da carteira',
        ${`Status alterado para ${status} por ${ator.nome ?? ator.nome_usuario}`},
        ${ator.id ?? null},
        ${ator.nome ?? ator.nome_usuario},
        NOW()
      )
    `);
        return this.buscarParticipantePorIdOuFalhar(id);
    }
    async emitirSegundaVia(id, invalidarAnterior, ator) {
        await ensureCarteiraEventoEstrutura(prisma);
        const participante = await this.buscarParticipanteSaldoPorIdOuFalhar(id);
        const novoToken = invalidarAnterior ? this.gerarTokenSeguro() : participante.qr_code_token_unico;
        await prisma.$executeRaw(Prisma.sql `
      UPDATE carteira_evento_participante
      SET qr_code_token_unico = ${novoToken}, atualizado_em = NOW()
      WHERE id = ${id}
    `);
        await prisma.$executeRaw(Prisma.sql `
      INSERT INTO carteira_evento_movimentacao (
        evento_id,
        participante_id,
        tipo_movimentacao,
        valor,
        saldo_anterior,
        saldo_posterior,
        descricao,
        motivo,
        operador_usuario_id,
        operador_nome,
        referencia_externa,
        criado_em
      ) VALUES (
        ${participante.evento_id},
        ${participante.id},
        'SEGUNDA_VIA',
        0,
        ${Number(participante.saldo_atual)},
        ${Number(participante.saldo_atual)},
        'Emissao de segunda via',
        ${invalidarAnterior ? "Token anterior invalidado." : "Reimpressao sem invalidar token."},
        ${ator.id ?? null},
        ${ator.nome ?? ator.nome_usuario},
        ${novoToken},
        NOW()
      )
    `);
        return this.buscarParticipantePorIdOuFalhar(id);
    }
    async consultarToken(eventoId, token) {
        await ensureCarteiraEventoEstrutura(prisma);
        const identificador = token.trim();
        const rows = await prisma.$queryRaw(Prisma.sql `
      SELECT
        p.id,
        p.evento_id,
        e.nome_evento,
        p.nome,
        p.telefone,
        p.cpf,
        p.foto_url,
        p.responsavel,
        p.numero_carteira,
        p.status,
        p.qr_code_token_unico,
        p.saldo_atual,
        p.observacoes,
        p.criado_em,
        p.atualizado_em
      FROM carteira_evento_participante p
      INNER JOIN carteira_evento e ON e.id = p.evento_id
      WHERE p.evento_id = ${eventoId}
        AND (
          p.qr_code_token_unico = ${identificador}
          OR p.numero_carteira = ${identificador}
        )
      LIMIT 1
    `);
        const row = rows[0];
        if (!row) {
            throw new AppError("Carteira nao encontrada para o identificador informado.", 404);
        }
        return mapParticipanteCarteira(row);
    }
    async realizarVenda(input, ator) {
        await ensureCarteiraEventoEstrutura(prisma);
        return prisma.$transaction(async (tx) => {
            const vendaExistente = await tx.$queryRaw(Prisma.sql `
        SELECT
          v.id,
          v.evento_id,
          v.barraca_id,
          v.participante_id,
          v.chave_operacao,
          v.valor_total,
          v.saldo_antes,
          v.saldo_depois,
          v.observacao,
          v.criado_em,
          v.operador_nome,
          p.nome AS participante_nome,
          b.nome_barraca AS barraca_nome
        FROM carteira_evento_venda v
        INNER JOIN carteira_evento_participante p ON p.id = v.participante_id
        INNER JOIN carteira_evento_barraca b ON b.id = v.barraca_id
        WHERE v.chave_operacao = ${input.chave_operacao}
        LIMIT 1
      `);
            if (vendaExistente[0]) {
                const itens = await this.listarItensVendaTx(tx, vendaExistente[0].id);
                return mapVendaCarteira(vendaExistente[0], itens);
            }
            const evento = await this.buscarEventoConfigPorIdOuFalhar(BigInt(input.evento_id), tx);
            if (evento.status !== "ATIVO") {
                throw new AppError("O evento precisa estar ativo para registrar vendas.", 409);
            }
            const barraca = await this.buscarBarracaOperacaoPorIdOuFalhar(BigInt(input.barraca_id), tx);
            if (barraca.evento_id !== evento.id) {
                throw new AppError("A barraca informada nao pertence ao evento selecionado.", 409);
            }
            if (barraca.status !== "ATIVA") {
                throw new AppError("A barraca informada nao esta ativa.", 409);
            }
            const participante = await this.buscarParticipantePorTokenOuFalhar(evento.id, input.token.trim(), tx, true);
            if (participante.status !== "ATIVO") {
                throw new AppError("A carteira informada nao esta ativa para uso.", 409);
            }
            const idsItens = input.itens.map((item) => BigInt(item.item_id));
            const itensDb = await tx.$queryRaw(Prisma.sql `
        SELECT id, evento_id, barraca_id, nome_item, categoria, preco, estoque, ativo
        FROM carteira_evento_item
        WHERE id IN (${Prisma.join(idsItens)})
      `);
            if (itensDb.length !== input.itens.length) {
                throw new AppError("Um ou mais itens da venda nao foram encontrados.", 404);
            }
            let total = 0;
            const itensVenda = [];
            for (const itemInput of input.itens) {
                const itemDb = itensDb.find((row) => row.id === BigInt(itemInput.item_id));
                if (!itemDb) {
                    throw new AppError("Item da venda nao encontrado.", 404);
                }
                if (itemDb.evento_id !== evento.id) {
                    throw new AppError(`O item ${itemDb.nome_item} nao pertence ao evento informado.`, 409);
                }
                if (!itemDb.ativo) {
                    throw new AppError(`O item ${itemDb.nome_item} esta inativo para venda.`, 409);
                }
                if (itemDb.barraca_id && itemDb.barraca_id !== barraca.id) {
                    throw new AppError(`O item ${itemDb.nome_item} nao pertence a barraca selecionada.`, 409);
                }
                if (itemDb.estoque != null && Number(itemDb.estoque) < itemInput.quantidade) {
                    throw new AppError(`Estoque insuficiente para ${itemDb.nome_item}.`, 409);
                }
                const totalItem = Number(itemDb.preco) * itemInput.quantidade;
                total += totalItem;
                itensVenda.push({ row: itemDb, quantidade: itemInput.quantidade, total: totalItem });
            }
            const saldoAntes = Number(participante.saldo_atual ?? 0);
            const saldoDepois = saldoAntes - total;
            if (saldoDepois < 0 && !evento.permite_saldo_negativo_adm) {
                throw new AppError("Saldo insuficiente para concluir a compra.", 409);
            }
            const vendaRows = await tx.$queryRaw(Prisma.sql `
        INSERT INTO carteira_evento_venda (
          evento_id,
          barraca_id,
          participante_id,
          chave_operacao,
          valor_total,
          saldo_antes,
          saldo_depois,
          observacao,
          operador_usuario_id,
          operador_nome,
          criado_em
        ) VALUES (
          ${evento.id},
          ${barraca.id},
          ${participante.id},
          ${input.chave_operacao.trim()},
          ${total},
          ${saldoAntes},
          ${saldoDepois},
          ${trimOrUndefined(input.observacao)},
          ${ator.id ?? null},
          ${ator.nome ?? ator.nome_usuario},
          NOW()
        )
        RETURNING id
      `);
            const vendaId = vendaRows[0].id;
            for (const item of itensVenda) {
                await tx.$executeRaw(Prisma.sql `
          INSERT INTO carteira_evento_venda_item (
            venda_id,
            item_id,
            nome_item,
            quantidade,
            valor_unitario,
            valor_total
          ) VALUES (
            ${vendaId},
            ${item.row.id},
            ${item.row.nome_item},
            ${item.quantidade},
            ${item.row.preco},
            ${item.total}
          )
        `);
                if (item.row.estoque != null) {
                    await tx.$executeRaw(Prisma.sql `
            UPDATE carteira_evento_item
            SET estoque = estoque - ${item.quantidade}, atualizado_em = NOW()
            WHERE id = ${item.row.id}
          `);
                }
            }
            await tx.$executeRaw(Prisma.sql `
        UPDATE carteira_evento_participante
        SET saldo_atual = ${saldoDepois}, atualizado_em = NOW()
        WHERE id = ${participante.id}
      `);
            await this.registrarMovimentacaoTx(tx, {
                evento_id: evento.id,
                participante_id: participante.id,
                barraca_id: barraca.id,
                venda_id: vendaId,
                tipo_movimentacao: "VENDA",
                valor: total,
                saldo_anterior: saldoAntes,
                saldo_posterior: saldoDepois,
                descricao: `Compra na barraca ${barraca.nome_barraca}`,
                motivo: trimOrUndefined(input.observacao),
                operador: ator
            });
            const venda = (await tx.$queryRaw(Prisma.sql `
          SELECT
            v.id,
            v.evento_id,
            v.barraca_id,
            v.participante_id,
            v.chave_operacao,
            v.valor_total,
            v.saldo_antes,
            v.saldo_depois,
            v.observacao,
            v.criado_em,
            v.operador_nome,
            p.nome AS participante_nome,
            b.nome_barraca AS barraca_nome
          FROM carteira_evento_venda v
          INNER JOIN carteira_evento_participante p ON p.id = v.participante_id
          INNER JOIN carteira_evento_barraca b ON b.id = v.barraca_id
          WHERE v.id = ${vendaId}
          LIMIT 1
        `))[0];
            const itens = await this.listarItensVendaTx(tx, vendaId);
            return mapVendaCarteira(venda, itens);
        });
    }
    async listarExtrato(filters) {
        await ensureCarteiraEventoEstrutura(prisma);
        const participante = await this.buscarParticipantePorIdOuFalhar(BigInt(filters.participante_id));
        const limite = Number.isInteger(filters.limite) ? Number(filters.limite) : 200;
        const rows = await prisma.$queryRaw(Prisma.sql `
      SELECT
        m.id,
        m.evento_id,
        m.participante_id,
        m.barraca_id,
        m.item_id,
        m.venda_id,
        m.tipo_movimentacao,
        m.forma_pagamento,
        m.valor,
        m.saldo_anterior,
        m.saldo_posterior,
        m.descricao,
        m.motivo,
        m.referencia_externa,
        m.criado_em,
        m.operador_nome,
        p.nome AS participante_nome,
        b.nome_barraca AS barraca_nome,
        i.nome_item AS item_nome
      FROM carteira_evento_movimentacao m
      INNER JOIN carteira_evento_participante p ON p.id = m.participante_id
      LEFT JOIN carteira_evento_barraca b ON b.id = m.barraca_id
      LEFT JOIN carteira_evento_item i ON i.id = m.item_id
      WHERE m.participante_id = ${BigInt(filters.participante_id)}
      ORDER BY m.criado_em DESC, m.id DESC
      LIMIT ${limite}
    `);
        return {
            participante,
            saldoAtual: participante.saldoAtual,
            movimentacoes: rows.map(mapMovimentacaoCarteira)
        };
    }
    async obterDashboard(filters) {
        await ensureCarteiraEventoEstrutura(prisma);
        const eventoId = BigInt(filters.evento_id);
        const evento = await this.buscarEventoPorIdOuFalhar(eventoId);
        const totais = await prisma.$queryRaw(Prisma.sql `
      SELECT
        SUM(CASE WHEN tipo_movimentacao = 'RECARGA' THEN valor ELSE 0 END) AS total_carregado,
        SUM(CASE WHEN tipo_movimentacao = 'VENDA' THEN valor ELSE 0 END) AS total_consumido,
        SUM(CASE WHEN tipo_movimentacao IN ('TRANSFERENCIA_ENVIADA', 'TRANSFERENCIA_RECEBIDA') THEN valor ELSE 0 END) / 2 AS total_transferencias,
        SUM(CASE WHEN tipo_movimentacao = 'ESTORNO' THEN valor ELSE 0 END) AS total_estornos
      FROM carteira_evento_movimentacao
      WHERE evento_id = ${eventoId}
    `);
        const saldoRemanescente = await prisma.$queryRaw(Prisma.sql `
      SELECT SUM(saldo_atual) AS total
      FROM carteira_evento_participante
      WHERE evento_id = ${eventoId}
    `);
        const participantes = await prisma.$queryRaw(Prisma.sql `
      SELECT COUNT(*)::bigint AS total
      FROM carteira_evento_participante
      WHERE evento_id = ${eventoId}
    `);
        const totalVendas = await prisma.$queryRaw(Prisma.sql `
      SELECT COUNT(*)::bigint AS total, COALESCE(SUM(valor_total), 0) AS valor
      FROM carteira_evento_venda
      WHERE evento_id = ${eventoId}
    `);
        const rankingBarracas = await prisma.$queryRaw(Prisma.sql `
      SELECT b.nome_barraca AS barraca, COALESCE(SUM(v.valor_total), 0) AS total, COUNT(v.id)::bigint AS quantidade
      FROM carteira_evento_barraca b
      LEFT JOIN carteira_evento_venda v ON v.barraca_id = b.id
      WHERE b.evento_id = ${eventoId}
      GROUP BY b.id, b.nome_barraca
      ORDER BY total DESC, quantidade DESC, b.nome_barraca ASC
    `);
        const itemMaisVendido = await prisma.$queryRaw(Prisma.sql `
      SELECT vi.nome_item, SUM(vi.quantidade) AS quantidade, SUM(vi.valor_total) AS total
      FROM carteira_evento_venda_item vi
      INNER JOIN carteira_evento_venda v ON v.id = vi.venda_id
      WHERE v.evento_id = ${eventoId}
      GROUP BY vi.nome_item
      ORDER BY quantidade DESC, total DESC
      LIMIT 1
    `);
        const formasPagamento = await prisma.$queryRaw(Prisma.sql `
      SELECT forma_pagamento, COALESCE(SUM(valor), 0) AS total
      FROM carteira_evento_movimentacao
      WHERE evento_id = ${eventoId}
        AND tipo_movimentacao = 'RECARGA'
      GROUP BY forma_pagamento
      ORDER BY total DESC
    `);
        const totalVendido = Number(totalVendas[0]?.valor ?? 0);
        const quantidadeVendas = Number(totalVendas[0]?.total ?? BigInt(0));
        return {
            evento,
            totalCarregado: Number(totais[0]?.total_carregado ?? 0),
            totalConsumido: Number(totais[0]?.total_consumido ?? 0),
            saldoRemanescente: Number(saldoRemanescente[0]?.total ?? 0),
            totalTransferencias: Number(totais[0]?.total_transferencias ?? 0),
            totalEstornos: Number(totais[0]?.total_estornos ?? 0),
            quantidadeParticipantes: Number(participantes[0]?.total ?? BigInt(0)),
            ticketMedio: quantidadeVendas ? totalVendido / quantidadeVendas : 0,
            totalPorBarraca: rankingBarracas.map((item) => ({
                barraca: item.barraca,
                total: Number(item.total ?? 0),
                quantidadeVendas: Number(item.quantidade ?? BigInt(0))
            })),
            rankingBarracas: rankingBarracas.map((item, index) => ({
                posicao: index + 1,
                barraca: item.barraca,
                total: Number(item.total ?? 0),
                quantidadeVendas: Number(item.quantidade ?? BigInt(0))
            })),
            itemMaisVendido: itemMaisVendido[0]
                ? {
                    nomeItem: itemMaisVendido[0].nome_item,
                    quantidade: Number(itemMaisVendido[0].quantidade ?? 0),
                    total: Number(itemMaisVendido[0].total ?? 0)
                }
                : null,
            totalPorFormaPagamento: formasPagamento.map((item) => ({
                formaPagamento: item.forma_pagamento ?? "NAO_INFORMADO",
                total: Number(item.total ?? 0)
            }))
        };
    }
    async obterFechamento(filters) {
        const dashboard = await this.obterDashboard({ evento_id: filters.evento_id });
        const eventoId = BigInt(filters.evento_id);
        const vendasPorItem = await prisma.$queryRaw(Prisma.sql `
      SELECT vi.nome_item, SUM(vi.quantidade) AS quantidade, SUM(vi.valor_total) AS total
      FROM carteira_evento_venda_item vi
      INNER JOIN carteira_evento_venda v ON v.id = vi.venda_id
      WHERE v.evento_id = ${eventoId}
      GROUP BY vi.nome_item
      ORDER BY total DESC, quantidade DESC, vi.nome_item ASC
    `);
        const vendasPorOperador = await prisma.$queryRaw(Prisma.sql `
      SELECT COALESCE(v.operador_nome, 'Nao informado') AS operador_nome, COALESCE(SUM(v.valor_total), 0) AS total, COUNT(v.id)::bigint AS quantidade
      FROM carteira_evento_venda v
      WHERE v.evento_id = ${eventoId}
      GROUP BY COALESCE(v.operador_nome, 'Nao informado')
      ORDER BY total DESC
    `);
        return {
            ...dashboard,
            totalCarregadoEmCredito: dashboard.totalCarregado,
            totalConsumidoEmCredito: dashboard.totalConsumido,
            divergencias: Math.max(0, Number((dashboard.totalCarregado - dashboard.totalConsumido - dashboard.saldoRemanescente).toFixed(2))),
            vendasPorItem: vendasPorItem.map((item) => ({
                nomeItem: item.nome_item,
                quantidade: Number(item.quantidade ?? 0),
                total: Number(item.total ?? 0)
            })),
            relatorioPorOperador: vendasPorOperador.map((item) => ({
                operador: item.operador_nome ?? "Nao informado",
                total: Number(item.total ?? 0),
                quantidadeVendas: Number(item.quantidade ?? BigInt(0))
            }))
        };
    }
    async obterRelatorio(filters) {
        const eventoId = BigInt(filters.evento_id);
        if (filters.tipo === "PARTICIPANTES" || filters.tipo === "CREDITOS_NAO_UTILIZADOS") {
            const participantes = await this.listarParticipantes({ evento_id: filters.evento_id, limite: 500 });
            return {
                tipo: filters.tipo,
                dados: filters.tipo === "CREDITOS_NAO_UTILIZADOS"
                    ? participantes.filter((item) => item.saldoAtual > 0)
                    : participantes
            };
        }
        if (filters.tipo === "BARRACAS") {
            return { tipo: filters.tipo, dados: await this.listarBarracas({ evento_id: filters.evento_id }) };
        }
        if (filters.tipo === "ITENS") {
            return { tipo: filters.tipo, dados: await this.listarItens({ evento_id: filters.evento_id }) };
        }
        if (filters.tipo === "EVENTO" || filters.tipo === "RESUMO_FINANCEIRO") {
            return { tipo: filters.tipo, dados: await this.obterDashboard({ evento_id: filters.evento_id }) };
        }
        if (filters.tipo === "RANKING_VENDAS") {
            return {
                tipo: filters.tipo,
                dados: (await this.obterDashboard({ evento_id: filters.evento_id })).rankingBarracas
            };
        }
        if (filters.tipo === "EXTRATO_GERAL") {
            const rows = await prisma.$queryRaw(Prisma.sql `
        SELECT
          m.id,
          m.evento_id,
          m.participante_id,
          m.barraca_id,
          m.item_id,
          m.venda_id,
          m.tipo_movimentacao,
          m.forma_pagamento,
          m.valor,
          m.saldo_anterior,
          m.saldo_posterior,
          m.descricao,
          m.motivo,
          m.referencia_externa,
          m.criado_em,
          m.operador_nome,
          p.nome AS participante_nome,
          b.nome_barraca AS barraca_nome,
          i.nome_item AS item_nome
        FROM carteira_evento_movimentacao m
        INNER JOIN carteira_evento_participante p ON p.id = m.participante_id
        LEFT JOIN carteira_evento_barraca b ON b.id = m.barraca_id
        LEFT JOIN carteira_evento_item i ON i.id = m.item_id
        WHERE m.evento_id = ${eventoId}
        ORDER BY m.criado_em DESC, m.id DESC
      `);
            return { tipo: filters.tipo, dados: rows.map(mapMovimentacaoCarteira) };
        }
        const porHorario = await prisma.$queryRaw(Prisma.sql `
      SELECT TO_CHAR(v.criado_em, 'HH24:00') AS hora, COALESCE(SUM(v.valor_total), 0) AS total, COUNT(v.id)::bigint AS quantidade
      FROM carteira_evento_venda v
      WHERE v.evento_id = ${eventoId}
      GROUP BY TO_CHAR(v.criado_em, 'HH24:00')
      ORDER BY hora ASC
    `);
        return {
            tipo: filters.tipo,
            dados: porHorario.map((item) => ({
                hora: item.hora,
                total: Number(item.total ?? 0),
                quantidadeVendas: Number(item.quantidade ?? BigInt(0))
            }))
        };
    }
    async buscarEventoPorIdOuFalhar(id) {
        const rows = await prisma.$queryRaw(Prisma.sql `
      SELECT
        id,
        nome_evento,
        tipo_evento,
        data_inicio,
        data_fim,
        status,
        permite_recarga,
        permite_transferencia,
        permite_estorno,
        validade_credito,
        centro_receita,
        modo_financeiro,
        observacoes,
        permite_saldo_negativo_adm,
        criado_em,
        atualizado_em
      FROM carteira_evento
      WHERE id = ${id}
      LIMIT 1
    `);
        const row = rows[0];
        if (!row) {
            throw new AppError("Evento da carteira digital nao encontrado.", 404);
        }
        return mapEventoCarteira(row);
    }
    async buscarEventoConfigPorIdOuFalhar(id, tx = prisma) {
        const rows = await tx.$queryRaw(Prisma.sql `
      SELECT
        id,
        nome_evento,
        status,
        permite_recarga,
        permite_transferencia,
        permite_estorno,
        validade_credito,
        modo_financeiro,
        centro_receita,
        permite_saldo_negativo_adm
      FROM carteira_evento
      WHERE id = ${id}
      LIMIT 1
    `);
        const row = rows[0];
        if (!row) {
            throw new AppError("Evento da carteira digital nao encontrado.", 404);
        }
        return row;
    }
    async buscarBarracaPorIdOuFalhar(id) {
        const rows = await prisma.$queryRaw(Prisma.sql `
      SELECT
        b.id,
        b.evento_id,
        e.nome_evento,
        b.nome_barraca,
        b.responsavel,
        b.tipo_barraca,
        b.operador,
        b.status,
        b.impressora,
        b.observacoes,
        b.criado_em,
        b.atualizado_em
      FROM carteira_evento_barraca b
      INNER JOIN carteira_evento e ON e.id = b.evento_id
      WHERE b.id = ${id}
      LIMIT 1
    `);
        const row = rows[0];
        if (!row) {
            throw new AppError("Barraca do evento nao encontrada.", 404);
        }
        return mapBarracaEvento(row);
    }
    async buscarBarracaOperacaoPorIdOuFalhar(id, tx) {
        const rows = await tx.$queryRaw(Prisma.sql `
      SELECT id, evento_id, nome_barraca, status
      FROM carteira_evento_barraca
      WHERE id = ${id}
      LIMIT 1
    `);
        const row = rows[0];
        if (!row) {
            throw new AppError("Barraca do evento nao encontrada.", 404);
        }
        return row;
    }
    async buscarItemPorIdOuFalhar(id) {
        const rows = await prisma.$queryRaw(Prisma.sql `
      SELECT
        i.id,
        i.evento_id,
        i.barraca_id,
        e.nome_evento,
        b.nome_barraca,
        i.nome_item,
        i.categoria,
        i.preco,
        i.estoque,
        i.ativo,
        i.foto_url,
        i.ordem_exibicao,
        i.criado_em,
        i.atualizado_em
      FROM carteira_evento_item i
      INNER JOIN carteira_evento e ON e.id = i.evento_id
      LEFT JOIN carteira_evento_barraca b ON b.id = i.barraca_id
      WHERE i.id = ${id}
      LIMIT 1
    `);
        const row = rows[0];
        if (!row) {
            throw new AppError("Item do evento nao encontrado.", 404);
        }
        return mapItemEvento(row);
    }
    async buscarParticipanteSaldoPorIdOuFalhar(id, tx = prisma, forUpdate = false) {
        const query = Prisma.sql `
      SELECT id, evento_id, nome, status, saldo_atual, qr_code_token_unico
      FROM carteira_evento_participante
      WHERE id = ${id}
      LIMIT 1
      ${forUpdate ? Prisma.sql `FOR UPDATE` : Prisma.empty}
    `;
        const rows = await tx.$queryRaw(query);
        const row = rows[0];
        if (!row) {
            throw new AppError("Participante da carteira nao encontrado.", 404);
        }
        return row;
    }
    async buscarParticipantePorTokenOuFalhar(eventoId, token, tx, forUpdate = false) {
        const identificador = token.trim();
        const rows = await tx.$queryRaw(Prisma.sql `
      SELECT id, evento_id, nome, status, saldo_atual, qr_code_token_unico
      FROM carteira_evento_participante
      WHERE evento_id = ${eventoId}
        AND (
          qr_code_token_unico = ${identificador}
          OR numero_carteira = ${identificador}
        )
      LIMIT 1
      ${forUpdate ? Prisma.sql `FOR UPDATE` : Prisma.empty}
    `);
        const row = rows[0];
        if (!row) {
            throw new AppError("Carteira digital nao encontrada para o identificador informado.", 404);
        }
        return row;
    }
    async gerarNumeroCarteira(eventoId, ignorarId) {
        const rows = await prisma.$queryRaw(Prisma.sql `
      SELECT numero_carteira
      FROM carteira_evento_participante
      WHERE evento_id = ${eventoId}
      ${ignorarId ? Prisma.sql `AND id <> ${ignorarId}` : Prisma.empty}
      ORDER BY id DESC
      LIMIT 1
    `);
        const atual = Number((rows[0]?.numero_carteira ?? "0").replace(/\D/g, "")) || 0;
        return String(atual + 1).padStart(6, "0");
    }
    gerarTokenSeguro() {
        return crypto.randomBytes(24).toString("hex");
    }
    async registrarMovimentacaoTx(tx, input) {
        await tx.$executeRaw(Prisma.sql `
      INSERT INTO carteira_evento_movimentacao (
        evento_id,
        participante_id,
        barraca_id,
        item_id,
        venda_id,
        tipo_movimentacao,
        forma_pagamento,
        valor,
        saldo_anterior,
        saldo_posterior,
        descricao,
        motivo,
        referencia_externa,
        operador_usuario_id,
        operador_nome,
        criado_em
      ) VALUES (
        ${input.evento_id},
        ${input.participante_id},
        ${input.barraca_id ?? null},
        ${input.item_id ?? null},
        ${input.venda_id ?? null},
        ${input.tipo_movimentacao},
        ${input.forma_pagamento ?? null},
        ${input.valor},
        ${input.saldo_anterior},
        ${input.saldo_posterior},
        ${trimOrUndefined(input.descricao)},
        ${trimOrUndefined(input.motivo)},
        ${trimOrUndefined(input.referencia_externa)},
        ${input.operador.id ?? null},
        ${input.operador.nome ?? input.operador.nome_usuario},
        NOW()
      )
    `);
    }
    async listarItensVendaTx(tx, vendaId) {
        return tx.$queryRaw(Prisma.sql `
      SELECT id, venda_id, item_id, nome_item, quantidade, valor_unitario, valor_total
      FROM carteira_evento_venda_item
      WHERE venda_id = ${vendaId}
      ORDER BY id ASC
    `);
    }
}
