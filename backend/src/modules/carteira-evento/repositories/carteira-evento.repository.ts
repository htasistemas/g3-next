import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { normalizeDigits, toOptionalDate, trimOrUndefined } from "../../../utils/string-utils.js";
import type {
  AjusteCarteiraInput,
  AuditoriaCarteiraFilters,
  BarracaEventoFilters,
  BarracaEventoInput,
  CarteiraEventoAtor,
  DashboardCarteiraFilters,
  EstornoVendaInput,
  EventoCarteiraFilters,
  EventoCarteiraInput,
  ExtratoCarteiraFilters,
  FechamentoCarteiraFilters,
  FormaPagamentoCarteira,
  ItemEventoFilters,
  ItemEventoInput,
  OperacaoVendaInput,
  ParticipanteCarteiraFilters,
  ParticipanteCarteiraInput,
  RecargaCarteiraInput,
  RelatorioCarteiraFilters,
  TransferenciaCarteiraInput
} from "../carteira-evento.types.js";
import {
  type BarracaEventoRow,
  type EventoCarteiraRow,
  type ItemEventoRow,
  mapBarracaEvento,
  mapEventoCarteira,
  mapItemEvento,
  mapMovimentacaoCarteira,
  mapParticipanteCarteira,
  mapVendaCarteira,
  type MovimentacaoCarteiraRow,
  type ParticipanteCarteiraRow,
  type VendaCarteiraItemRow,
  type VendaCarteiraRow
} from "../carteira-evento.mapper.js";
import { ensureCarteiraEventoEstrutura } from "./carteira-evento-estrutura.repository.js";

type Tx = Prisma.TransactionClient;

type ParticipanteSaldoRow = {
  id: bigint;
  evento_id: bigint;
  nome: string;
  status: string;
  saldo_atual: number;
  qr_code_token_unico: string;
};

type EventoConfigRow = {
  id: bigint;
  nome_evento: string;
  status: string;
  permite_recarga: boolean;
  permite_transferencia: boolean;
  permite_estorno: boolean;
  validade_credito: Date | null;
  modo_financeiro: string;
  centro_receita: string | null;
  permite_saldo_negativo_adm: boolean | null;
};

type ItemOperacaoRow = {
  id: bigint;
  evento_id: bigint;
  barraca_id: bigint | null;
  nome_item: string;
  categoria: string;
  preco: number;
  estoque: number | null;
  ativo: boolean;
};

type BarracaOperacaoRow = {
  id: bigint;
  evento_id: bigint;
  nome_barraca: string;
  status: string;
};

type TotaisFormaPagamentoRow = {
  forma_pagamento: string | null;
  total: number;
};

function tenantSql(alias: string, tenantId: string) {
  return Prisma.sql`${Prisma.raw(alias)}.tenant_id::text = ${tenantId}`;
}

export class CarteiraEventoRepository {
  async listarEventos(filters: EventoCarteiraFilters, tenantId: string) {
    await ensureCarteiraEventoEstrutura(prisma);
    const where: Prisma.Sql[] = [];

    const status = trimOrUndefined(filters.status);
    if (status) {
      where.push(Prisma.sql`AND e.status = ${status.toUpperCase()}`);
    }

    const busca = trimOrUndefined(filters.busca);
    if (busca) {
      where.push(Prisma.sql`AND unaccent(e.nome_evento) ILIKE unaccent(${`%${busca}%`})`);
    }

    const limite = Number.isInteger(filters.limite) ? Number(filters.limite) : 100;
    const rows = await prisma.$queryRaw<EventoCarteiraRow[]>(Prisma.sql`
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
      WHERE ${tenantSql("e", tenantId)}
      ${where.length ? Prisma.join(where, " ") : Prisma.empty}
      ORDER BY e.data_inicio DESC, e.id DESC
      LIMIT ${limite}
    `);

    return rows.map(mapEventoCarteira);
  }

  async criarEvento(input: EventoCarteiraInput, tenantId: string) {
    await ensureCarteiraEventoEstrutura(prisma);
    const rows = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
      INSERT INTO carteira_evento (
        tenant_id,
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
        ${tenantId}::uuid,
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

    return this.buscarEventoPorIdOuFalhar(rows[0]!.id, tenantId);
  }

  async atualizarEvento(id: bigint, input: EventoCarteiraInput, tenantId: string) {
    await ensureCarteiraEventoEstrutura(prisma);
    await this.buscarEventoConfigPorIdOuFalhar(id, prisma, tenantId);
    await prisma.$executeRaw(Prisma.sql`
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
        AND tenant_id::text = ${tenantId}
    `);
    return this.buscarEventoPorIdOuFalhar(id, tenantId);
  }

  async listarParticipantes(filters: ParticipanteCarteiraFilters, tenantId: string) {
    await ensureCarteiraEventoEstrutura(prisma);
    const where: Prisma.Sql[] = [];
    if (filters.evento_id) {
      where.push(Prisma.sql`AND p.evento_id = ${BigInt(filters.evento_id)}`);
    }
    const status = trimOrUndefined(filters.status);
    if (status) {
      where.push(Prisma.sql`AND p.status = ${status.toUpperCase()}`);
    }
    const busca = trimOrUndefined(filters.busca);
    if (busca) {
      const termo = `%${busca}%`;
      where.push(Prisma.sql`
        AND (
          unaccent(p.nome) ILIKE unaccent(${termo})
          OR COALESCE(p.numero_carteira, '') ILIKE ${termo}
          OR COALESCE(p.telefone, '') ILIKE ${termo}
          OR COALESCE(p.cpf, '') ILIKE ${termo}
        )
      `);
    }
    const limite = Number.isInteger(filters.limite) ? Number(filters.limite) : 200;
    const rows = await prisma.$queryRaw<ParticipanteCarteiraRow[]>(Prisma.sql`
      SELECT
        p.id,
        p.evento_id,
        e.nome_evento,
        e.validade_credito,
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
      WHERE ${tenantSql("e", tenantId)}
      ${where.length ? Prisma.join(where, " ") : Prisma.empty}
      ORDER BY p.nome ASC, p.id DESC
      LIMIT ${limite}
    `);

    return rows.map(mapParticipanteCarteira);
  }

  async buscarParticipantePorIdOuFalhar(id: bigint, tenantId: string, db: Tx | typeof prisma = prisma) {
    await ensureCarteiraEventoEstrutura(prisma);
    const rows = await db.$queryRaw<ParticipanteCarteiraRow[]>(Prisma.sql`
      SELECT
        p.id,
        p.evento_id,
        e.nome_evento,
        e.validade_credito,
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
        AND ${tenantSql("e", tenantId)}
      LIMIT 1
    `);

    const row = rows[0];
    if (!row) {
      throw new AppError("Participante da carteira nao encontrado.", 404);
    }
    return mapParticipanteCarteira(row);
  }

  async criarParticipante(input: ParticipanteCarteiraInput, tenantId: string) {
    await ensureCarteiraEventoEstrutura(prisma);
    const evento = await this.buscarEventoConfigPorIdOuFalhar(BigInt(input.evento_id), prisma, tenantId);
    const numeroCarteira =
      trimOrUndefined(input.numero_carteira) ?? (await this.gerarNumeroCarteira(BigInt(input.evento_id), tenantId));
    const token = this.gerarTokenSeguro();

    const rows = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
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

    return this.buscarParticipantePorIdOuFalhar(rows[0]!.id, tenantId);
  }

  async atualizarParticipante(id: bigint, input: ParticipanteCarteiraInput, tenantId: string) {
    await ensureCarteiraEventoEstrutura(prisma);
    await this.buscarParticipanteSaldoPorIdOuFalhar(id, prisma, tenantId);
    await this.buscarEventoConfigPorIdOuFalhar(BigInt(input.evento_id), prisma, tenantId);
    const numeroCarteira =
      trimOrUndefined(input.numero_carteira) ?? (await this.gerarNumeroCarteira(BigInt(input.evento_id), tenantId, id));
    await prisma.$executeRaw(Prisma.sql`
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
        AND EXISTS (
          SELECT 1
          FROM carteira_evento e
          WHERE e.id = carteira_evento_participante.evento_id
            AND e.tenant_id::text = ${tenantId}
        )
    `);
    return this.buscarParticipantePorIdOuFalhar(id, tenantId);
  }

  async listarBarracas(filters: BarracaEventoFilters, tenantId: string) {
    await ensureCarteiraEventoEstrutura(prisma);
    const where: Prisma.Sql[] = [];
    if (filters.evento_id) {
      where.push(Prisma.sql`AND b.evento_id = ${BigInt(filters.evento_id)}`);
    }
    const status = trimOrUndefined(filters.status);
    if (status) {
      where.push(Prisma.sql`AND b.status = ${status.toUpperCase()}`);
    }
    const rows = await prisma.$queryRaw<BarracaEventoRow[]>(Prisma.sql`
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
      WHERE ${tenantSql("e", tenantId)}
      ${where.length ? Prisma.join(where, " ") : Prisma.empty}
      ORDER BY b.nome_barraca ASC
    `);
    return rows.map(mapBarracaEvento);
  }

  async criarBarraca(input: BarracaEventoInput, tenantId: string) {
    await ensureCarteiraEventoEstrutura(prisma);
    await this.buscarEventoConfigPorIdOuFalhar(BigInt(input.evento_id), prisma, tenantId);
    const rows = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
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
    return this.buscarBarracaPorIdOuFalhar(rows[0]!.id, tenantId);
  }

  async atualizarBarraca(id: bigint, input: BarracaEventoInput, tenantId: string) {
    await ensureCarteiraEventoEstrutura(prisma);
    await this.buscarBarracaPorIdOuFalhar(id, tenantId);
    await prisma.$executeRaw(Prisma.sql`
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
        AND EXISTS (
          SELECT 1
          FROM carteira_evento e
          WHERE e.id = carteira_evento_barraca.evento_id
            AND e.tenant_id::text = ${tenantId}
        )
    `);
    return this.buscarBarracaPorIdOuFalhar(id, tenantId);
  }

  async listarItens(filters: ItemEventoFilters, tenantId: string) {
    await ensureCarteiraEventoEstrutura(prisma);
    const where: Prisma.Sql[] = [];
    if (filters.evento_id) {
      where.push(Prisma.sql`AND i.evento_id = ${BigInt(filters.evento_id)}`);
    }
    if (filters.barraca_id) {
      where.push(Prisma.sql`AND i.barraca_id = ${BigInt(filters.barraca_id)}`);
    }
    if (typeof filters.ativo === "boolean") {
      where.push(Prisma.sql`AND i.ativo = ${filters.ativo}`);
    }
    const busca = trimOrUndefined(filters.busca);
    if (busca) {
      where.push(Prisma.sql`AND unaccent(i.nome_item) ILIKE unaccent(${`%${busca}%`})`);
    }
    const rows = await prisma.$queryRaw<ItemEventoRow[]>(Prisma.sql`
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
      WHERE ${tenantSql("e", tenantId)}
      ${where.length ? Prisma.join(where, " ") : Prisma.empty}
      ORDER BY i.ordem_exibicao ASC, i.nome_item ASC
    `);
    return rows.map(mapItemEvento);
  }

  async criarItem(input: ItemEventoInput, tenantId: string) {
    await ensureCarteiraEventoEstrutura(prisma);
    await this.buscarEventoConfigPorIdOuFalhar(BigInt(input.evento_id), prisma, tenantId);
    if (input.barraca_id) {
      await this.buscarBarracaPorIdOuFalhar(BigInt(input.barraca_id), tenantId);
    }
    const rows = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
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
    return this.buscarItemPorIdOuFalhar(rows[0]!.id, tenantId);
  }

  async atualizarItem(id: bigint, input: ItemEventoInput, tenantId: string) {
    await ensureCarteiraEventoEstrutura(prisma);
    await this.buscarItemPorIdOuFalhar(id, tenantId);
    await this.buscarEventoConfigPorIdOuFalhar(BigInt(input.evento_id), prisma, tenantId);
    if (input.barraca_id) {
      await this.buscarBarracaPorIdOuFalhar(BigInt(input.barraca_id), tenantId);
    }
    await prisma.$executeRaw(Prisma.sql`
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
        AND EXISTS (
          SELECT 1
          FROM carteira_evento e
          WHERE e.id = carteira_evento_item.evento_id
            AND e.tenant_id::text = ${tenantId}
        )
    `);
    return this.buscarItemPorIdOuFalhar(id, tenantId);
  }

  async recarregar(input: RecargaCarteiraInput, ator: CarteiraEventoAtor) {
    await ensureCarteiraEventoEstrutura(prisma);
    return prisma.$transaction(async (tx) => {
      const tenantId = this.requireTenant(ator.tenantId);
      const participante = await this.buscarParticipanteSaldoPorIdOuFalhar(BigInt(input.participante_id), tx, tenantId, true);
      const evento = await this.buscarEventoConfigPorIdOuFalhar(participante.evento_id, tx, tenantId);
      if (!evento.permite_recarga) {
        throw new AppError("Este evento nao permite recarga no momento.", 409);
      }
      if (participante.status !== "ATIVO") {
        throw new AppError("A carteira informada nao esta ativa para recarga.", 409);
      }

      const saldoAnterior = Number(participante.saldo_atual ?? 0);
      const saldoPosterior = saldoAnterior + input.valor_recarga;
      await tx.$executeRaw(Prisma.sql`
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
      return this.buscarParticipantePorIdOuFalhar(participante.id, tenantId, tx);
    });
  }

  async transferir(input: TransferenciaCarteiraInput, ator: CarteiraEventoAtor) {
    await ensureCarteiraEventoEstrutura(prisma);
    return prisma.$transaction(async (tx) => {
      const tenantId = this.requireTenant(ator.tenantId);
      const evento = await this.buscarEventoConfigPorIdOuFalhar(BigInt(input.evento_id), tx, tenantId);
      if (!evento.permite_transferencia) {
        throw new AppError("Este evento nao permite transferencia de creditos.", 409);
      }

      const origem = await this.buscarParticipanteSaldoPorIdOuFalhar(BigInt(input.carteira_origem_id), tx, tenantId, true);
      const destino = await this.buscarParticipanteSaldoPorIdOuFalhar(BigInt(input.carteira_destino_id), tx, tenantId, true);
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

      await tx.$executeRaw(Prisma.sql`
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
        origem: await this.buscarParticipantePorIdOuFalhar(origem.id, tenantId, tx),
        destino: await this.buscarParticipantePorIdOuFalhar(destino.id, tenantId, tx),
        referencia
      };
    });
  }

  async ajustar(input: AjusteCarteiraInput, ator: CarteiraEventoAtor) {
    await ensureCarteiraEventoEstrutura(prisma);
    return prisma.$transaction(async (tx) => {
      const tenantId = this.requireTenant(ator.tenantId);
      const participante = await this.buscarParticipanteSaldoPorIdOuFalhar(BigInt(input.participante_id), tx, tenantId, true);
      const evento = await this.buscarEventoConfigPorIdOuFalhar(participante.evento_id, tx, tenantId);
      const saldoAnterior = Number(participante.saldo_atual);
      let delta = input.valor;
      let tipoMovimentacao = "AJUSTE_CREDITO";

      if (input.tipo_ajuste === "DEBITO") {
        delta = input.valor * -1;
        tipoMovimentacao = "AJUSTE_DEBITO";
      } else if (input.tipo_ajuste === "ESTORNO") {
        if (!evento.permite_estorno) {
          throw new AppError("Este evento nao permite estorno.", 409);
        }
        tipoMovimentacao = "ESTORNO";
      }

      const saldoPosterior = saldoAnterior + delta;
      if (saldoPosterior < 0 && !evento.permite_saldo_negativo_adm) {
        throw new AppError("O ajuste informado deixaria a carteira com saldo negativo.", 409);
      }

      await tx.$executeRaw(Prisma.sql`
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
        descricao:
          input.tipo_ajuste === "DEBITO"
            ? "Debito manual"
            : input.tipo_ajuste === "ESTORNO"
              ? "Estorno manual"
              : "Credito manual",
        motivo: input.motivo,
        operador: ator
      });
      return this.buscarParticipantePorIdOuFalhar(participante.id, tenantId, tx);
    });
  }

  async alterarStatusParticipante(id: bigint, status: string, ator: CarteiraEventoAtor) {
    await ensureCarteiraEventoEstrutura(prisma);
    const tenantId = this.requireTenant(ator.tenantId);
    const participante = await this.buscarParticipanteSaldoPorIdOuFalhar(id, prisma, tenantId);
    await prisma.$executeRaw(Prisma.sql`
      UPDATE carteira_evento_participante
      SET status = ${status}, atualizado_em = NOW()
      WHERE id = ${id}
        AND EXISTS (
          SELECT 1
          FROM carteira_evento e
          WHERE e.id = carteira_evento_participante.evento_id
            AND e.tenant_id::text = ${tenantId}
        )
    `);
    await prisma.$executeRaw(Prisma.sql`
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
    return this.buscarParticipantePorIdOuFalhar(id, tenantId);
  }

  async emitirSegundaVia(id: bigint, invalidarAnterior: boolean, ator: CarteiraEventoAtor) {
    await ensureCarteiraEventoEstrutura(prisma);
    const tenantId = this.requireTenant(ator.tenantId);
    const participante = await this.buscarParticipanteSaldoPorIdOuFalhar(id, prisma, tenantId);
    const novoToken = invalidarAnterior ? this.gerarTokenSeguro() : participante.qr_code_token_unico;
    await prisma.$executeRaw(Prisma.sql`
      UPDATE carteira_evento_participante
      SET qr_code_token_unico = ${novoToken}, atualizado_em = NOW()
      WHERE id = ${id}
        AND EXISTS (
          SELECT 1
          FROM carteira_evento e
          WHERE e.id = carteira_evento_participante.evento_id
            AND e.tenant_id::text = ${tenantId}
        )
    `);
    await prisma.$executeRaw(Prisma.sql`
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
    return this.buscarParticipantePorIdOuFalhar(id, tenantId);
  }

  async consultarToken(eventoId: bigint, token: string, tenantId: string) {
    await ensureCarteiraEventoEstrutura(prisma);
    const identificador = token.trim();
    const rows = await prisma.$queryRaw<ParticipanteCarteiraRow[]>(Prisma.sql`
      SELECT
        p.id,
        p.evento_id,
        e.nome_evento,
        e.validade_credito,
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
        AND ${tenantSql("e", tenantId)}
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
    if (row.validade_credito && new Date(row.validade_credito).getTime() < Date.now()) {
      throw new AppError("A validade dos creditos desta carteira expirou.", 409);
    }
    return mapParticipanteCarteira(row);
  }

  async realizarVenda(input: OperacaoVendaInput, ator: CarteiraEventoAtor) {
    await ensureCarteiraEventoEstrutura(prisma);
    return prisma.$transaction(async (tx) => {
      const tenantId = this.requireTenant(ator.tenantId);
      const vendaExistente = await tx.$queryRaw<VendaCarteiraRow[]>(Prisma.sql`
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
        INNER JOIN carteira_evento e ON e.id = v.evento_id
        WHERE v.chave_operacao = ${input.chave_operacao}
          AND v.evento_id = ${BigInt(input.evento_id)}
          AND e.tenant_id::text = ${tenantId}
        LIMIT 1
      `);
      if (vendaExistente[0]) {
        const itens = await this.listarItensVendaTx(tx, vendaExistente[0].id);
        return mapVendaCarteira(vendaExistente[0], itens);
      }

      const evento = await this.buscarEventoConfigPorIdOuFalhar(BigInt(input.evento_id), tx, tenantId);
      if (evento.status !== "ATIVO") {
        throw new AppError("O evento precisa estar ativo para registrar vendas.", 409);
      }

      const barraca = await this.buscarBarracaOperacaoPorIdOuFalhar(BigInt(input.barraca_id), tx, tenantId);
      if (barraca.evento_id !== evento.id) {
        throw new AppError("A barraca informada nao pertence ao evento selecionado.", 409);
      }
      if (barraca.status !== "ATIVA") {
        throw new AppError("A barraca informada nao esta ativa.", 409);
      }

      const participante = await this.buscarParticipantePorTokenOuFalhar(
        evento.id,
        input.token.trim(),
        tx,
        tenantId,
        true
      );
      if (participante.status !== "ATIVO") {
        throw new AppError("A carteira informada nao esta ativa para uso.", 409);
      }

      const validade = await tx.$queryRaw<Array<{ validade_credito: Date | null }>>(Prisma.sql`
        SELECT validade_credito
        FROM carteira_evento
        WHERE id = ${evento.id}
        LIMIT 1
      `);
      if (validade[0]?.validade_credito && new Date(validade[0].validade_credito).getTime() < Date.now()) {
        throw new AppError("A validade dos creditos desta carteira expirou.", 409);
      }

      const idsItens = input.itens.map((item) => BigInt(item.item_id));
      const itensDb = await tx.$queryRaw<ItemOperacaoRow[]>(Prisma.sql`
        SELECT id, evento_id, barraca_id, nome_item, categoria, preco, estoque, ativo
        FROM carteira_evento_item
        WHERE id IN (${Prisma.join(idsItens)})
        ORDER BY id ASC
        FOR UPDATE
      `);
      if (itensDb.length !== input.itens.length) {
        throw new AppError("Um ou mais itens da venda nao foram encontrados.", 404);
      }

      let total = 0;
      const itensVenda: Array<{ row: ItemOperacaoRow; quantidade: number; total: number }> = [];
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

      const vendaRows = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
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
      const vendaId = vendaRows[0]!.id;

      for (const item of itensVenda) {
        await tx.$executeRaw(Prisma.sql`
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
          await tx.$executeRaw(Prisma.sql`
            UPDATE carteira_evento_item
            SET estoque = estoque - ${item.quantidade}, atualizado_em = NOW()
            WHERE id = ${item.row.id}
          `);
        }
      }

      await tx.$executeRaw(Prisma.sql`
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
      await this.registrarCaixaEventoTx(tx, tenantId, {
        eventoId: evento.id,
        barracaId: barraca.id,
        vendaId,
        tipo: "VENDA_CARTEIRA",
        valor: total,
        descricao: `Consumo da carteira na barraca ${barraca.nome_barraca}`,
        operador: ator
      });

      const venda = (
        await tx.$queryRaw<VendaCarteiraRow[]>(Prisma.sql`
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
        `)
      )[0];
      const itens = await this.listarItensVendaTx(tx, vendaId);
      return mapVendaCarteira(venda, itens);
    });
  }

  async estornarVenda(input: EstornoVendaInput, ator: CarteiraEventoAtor) {
    await ensureCarteiraEventoEstrutura(prisma);
    return prisma.$transaction(async (tx) => {
      const tenantId = this.requireTenant(ator.tenantId);
      const vendas = await tx.$queryRaw<Array<{
        id: bigint;
        evento_id: bigint;
        barraca_id: bigint;
        participante_id: bigint;
        valor_total: number;
        status: string | null;
        participante_nome: string;
        barraca_nome: string;
      }>>(Prisma.sql`
        SELECT v.id, v.evento_id, v.barraca_id, v.participante_id, v.valor_total,
               v.status, p.nome AS participante_nome, b.nome_barraca AS barraca_nome
        FROM carteira_evento_venda v
        INNER JOIN carteira_evento e ON e.id = v.evento_id
        INNER JOIN carteira_evento_participante p ON p.id = v.participante_id
        INNER JOIN carteira_evento_barraca b ON b.id = v.barraca_id
        WHERE v.id = ${BigInt(input.venda_id)}
          AND e.tenant_id::text = ${tenantId}
        FOR UPDATE
      `);
      const venda = vendas[0];
      if (!venda) throw new AppError("Venda nao encontrada.", 404);
      if (venda.status === "ESTORNADA") throw new AppError("Esta venda ja foi estornada.", 409);

      const evento = await this.buscarEventoConfigPorIdOuFalhar(venda.evento_id, tx, tenantId);
      if (!evento.permite_estorno) throw new AppError("Este evento nao permite estorno.", 409);

      const participante = await this.buscarParticipanteSaldoPorIdOuFalhar(venda.participante_id, tx, tenantId, true);
      const saldoAnterior = Number(participante.saldo_atual ?? 0);
      const saldoPosterior = saldoAnterior + Number(venda.valor_total);
      const itens = await this.listarItensVendaTx(tx, venda.id);

      for (const item of itens) {
        await tx.$executeRaw(Prisma.sql`
          UPDATE carteira_evento_item
          SET estoque = estoque + ${item.quantidade}, atualizado_em = NOW()
          WHERE id = ${item.item_id}
            AND estoque IS NOT NULL
        `);
      }

      await tx.$executeRaw(Prisma.sql`
        UPDATE carteira_evento_participante
        SET saldo_atual = ${saldoPosterior}, atualizado_em = NOW()
        WHERE id = ${participante.id}
      `);
      await tx.$executeRaw(Prisma.sql`
        UPDATE carteira_evento_venda
        SET status = 'ESTORNADA', estornada_em = NOW(), estorno_motivo = ${input.motivo.trim()}
        WHERE id = ${venda.id}
      `);
      await this.registrarMovimentacaoTx(tx, {
        evento_id: venda.evento_id,
        participante_id: venda.participante_id,
        barraca_id: venda.barraca_id,
        venda_id: venda.id,
        tipo_movimentacao: "ESTORNO",
        valor: Number(venda.valor_total),
        saldo_anterior: saldoAnterior,
        saldo_posterior: saldoPosterior,
        descricao: `Estorno da venda na barraca ${venda.barraca_nome}`,
        motivo: input.motivo.trim(),
        referencia_externa: `ESTORNO-VENDA-${venda.id}`,
        operador: ator
      });
      await this.registrarCaixaEventoTx(tx, tenantId, {
        eventoId: venda.evento_id,
        barracaId: venda.barraca_id,
        vendaId: venda.id,
        tipo: "ESTORNO_VENDA_CARTEIRA",
        valor: Number(venda.valor_total),
        descricao: `Estorno da venda na barraca ${venda.barraca_nome}`,
        operador: ator
      });

      return {
        id: Number(venda.id),
        eventoId: Number(venda.evento_id),
        barracaId: Number(venda.barraca_id),
        participanteId: Number(venda.participante_id),
        valorTotal: Number(venda.valor_total),
        saldoDepois: saldoPosterior,
        status: "ESTORNADA",
        participanteNome: venda.participante_nome,
        barracaNome: venda.barraca_nome,
        motivo: input.motivo.trim()
      };
    });
  }

  async listarExtrato(filters: ExtratoCarteiraFilters, tenantId: string) {
    await ensureCarteiraEventoEstrutura(prisma);
    const participante = await this.buscarParticipantePorIdOuFalhar(BigInt(filters.participante_id), tenantId);
    const limite = Number.isInteger(filters.limite) ? Number(filters.limite) : 200;
    const rows = await prisma.$queryRaw<MovimentacaoCarteiraRow[]>(Prisma.sql`
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
      INNER JOIN carteira_evento e ON e.id = m.evento_id
      LEFT JOIN carteira_evento_barraca b ON b.id = m.barraca_id
      LEFT JOIN carteira_evento_item i ON i.id = m.item_id
      WHERE m.participante_id = ${BigInt(filters.participante_id)}
        AND ${tenantSql("e", tenantId)}
      ORDER BY m.criado_em DESC, m.id DESC
      LIMIT ${limite}
    `);

    return {
      participante,
      saldoAtual: participante.saldoAtual,
      movimentacoes: rows.map(mapMovimentacaoCarteira)
    };
  }

  async obterDashboard(filters: DashboardCarteiraFilters, tenantId: string) {
    await ensureCarteiraEventoEstrutura(prisma);
    const eventoId = BigInt(filters.evento_id);
    const evento = await this.buscarEventoPorIdOuFalhar(eventoId, tenantId);

    const totais = await prisma.$queryRaw<
      Array<{
        total_carregado: number | null;
        total_consumido: number | null;
        total_transferencias: number | null;
        total_estornos: number | null;
      }>
    >(Prisma.sql`
      SELECT
        SUM(CASE WHEN tipo_movimentacao = 'RECARGA' THEN valor ELSE 0 END) AS total_carregado,
        SUM(CASE WHEN tipo_movimentacao = 'VENDA' AND (venda_id IS NULL OR EXISTS (
          SELECT 1 FROM carteira_evento_venda v2 WHERE v2.id = carteira_evento_movimentacao.venda_id AND v2.status <> 'ESTORNADA'
        )) THEN valor ELSE 0 END) AS total_consumido,
        SUM(CASE WHEN tipo_movimentacao IN ('TRANSFERENCIA_ENVIADA', 'TRANSFERENCIA_RECEBIDA') THEN valor ELSE 0 END) / 2 AS total_transferencias,
        SUM(CASE WHEN tipo_movimentacao = 'ESTORNO' THEN valor ELSE 0 END) AS total_estornos
      FROM carteira_evento_movimentacao
      WHERE evento_id = ${eventoId}
        AND EXISTS (SELECT 1 FROM carteira_evento e WHERE e.id = carteira_evento_movimentacao.evento_id AND e.tenant_id::text = ${tenantId})
    `);

    const saldoRemanescente = await prisma.$queryRaw<Array<{ total: number | null }>>(Prisma.sql`
      SELECT SUM(saldo_atual) AS total
      FROM carteira_evento_participante
      WHERE evento_id = ${eventoId}
        AND EXISTS (SELECT 1 FROM carteira_evento e WHERE e.id = carteira_evento_participante.evento_id AND e.tenant_id::text = ${tenantId})
    `);

    const participantes = await prisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`
      SELECT COUNT(*)::bigint AS total
      FROM carteira_evento_participante
      WHERE evento_id = ${eventoId}
      AND EXISTS (SELECT 1 FROM carteira_evento e WHERE e.id = carteira_evento_participante.evento_id AND e.tenant_id::text = ${tenantId})
    `);

    const statusCarteiras = await prisma.$queryRaw<Array<{ ativas: bigint; bloqueadas: bigint; sem_saldo: bigint; aguardando_impressao: bigint }>>(Prisma.sql`
      SELECT
        COUNT(*) FILTER (WHERE p.status = 'ATIVO')::bigint AS ativas,
        COUNT(*) FILTER (WHERE p.status = 'BLOQUEADO')::bigint AS bloqueadas,
        COUNT(*) FILTER (WHERE COALESCE(p.saldo_atual, 0) = 0)::bigint AS sem_saldo,
        COUNT(*) FILTER (WHERE NOT EXISTS (
          SELECT 1 FROM carteira_evento_auditoria a
          WHERE a.participante_id = p.id
            AND a.tipo_evento IN ('IMPRESSAO_CARTAO', 'REIMPRESSAO_CARTAO')
        ))::bigint AS aguardando_impressao
      FROM carteira_evento_participante p
      WHERE p.evento_id = ${eventoId}
        AND EXISTS (SELECT 1 FROM carteira_evento e WHERE e.id = p.evento_id AND e.tenant_id::text = ${tenantId})
    `);

    const totalVendas = await prisma.$queryRaw<Array<{ total: bigint; valor: number | null }>>(Prisma.sql`
      SELECT COUNT(*)::bigint AS total, COALESCE(SUM(valor_total), 0) AS valor
      FROM carteira_evento_venda
      WHERE evento_id = ${eventoId}
        AND status <> 'ESTORNADA'
        AND EXISTS (SELECT 1 FROM carteira_evento e WHERE e.id = carteira_evento_venda.evento_id AND e.tenant_id::text = ${tenantId})
    `);

    const rankingBarracas = await prisma.$queryRaw<Array<{ barraca: string; total: number; quantidade: bigint }>>(Prisma.sql`
      SELECT b.nome_barraca AS barraca, COALESCE(SUM(v.valor_total), 0) AS total, COUNT(v.id)::bigint AS quantidade
      FROM carteira_evento_barraca b
      LEFT JOIN carteira_evento_venda v ON v.barraca_id = b.id AND v.status <> 'ESTORNADA'
      WHERE b.evento_id = ${eventoId}
        AND EXISTS (SELECT 1 FROM carteira_evento e WHERE e.id = b.evento_id AND e.tenant_id::text = ${tenantId})
      GROUP BY b.id, b.nome_barraca
      ORDER BY total DESC, quantidade DESC, b.nome_barraca ASC
    `);

    const itemMaisVendido = await prisma.$queryRaw<Array<{ nome_item: string; quantidade: number; total: number }>>(Prisma.sql`
      SELECT vi.nome_item, SUM(vi.quantidade) AS quantidade, SUM(vi.valor_total) AS total
      FROM carteira_evento_venda_item vi
      INNER JOIN carteira_evento_venda v ON v.id = vi.venda_id
      WHERE v.evento_id = ${eventoId}
        AND v.status <> 'ESTORNADA'
        AND EXISTS (SELECT 1 FROM carteira_evento e WHERE e.id = v.evento_id AND e.tenant_id::text = ${tenantId})
      GROUP BY vi.nome_item
      ORDER BY quantidade DESC, total DESC
      LIMIT 1
    `);

    const formasPagamento = await prisma.$queryRaw<TotaisFormaPagamentoRow[]>(Prisma.sql`
      SELECT forma_pagamento, COALESCE(SUM(valor), 0) AS total
      FROM carteira_evento_movimentacao
      WHERE evento_id = ${eventoId}
        AND EXISTS (SELECT 1 FROM carteira_evento e WHERE e.id = carteira_evento_movimentacao.evento_id AND e.tenant_id::text = ${tenantId})
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
      quantidadeCarteiras: Number(participantes[0]?.total ?? BigInt(0)),
      carteirasAtivas: Number(statusCarteiras[0]?.ativas ?? BigInt(0)),
      carteirasBloqueadas: Number(statusCarteiras[0]?.bloqueadas ?? BigInt(0)),
      carteirasSemSaldo: Number(statusCarteiras[0]?.sem_saldo ?? BigInt(0)),
      carteirasAguardandoImpressao: Number(statusCarteiras[0]?.aguardando_impressao ?? BigInt(0)),
      quantidadeVendas: quantidadeVendas,
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

  async obterFechamento(filters: FechamentoCarteiraFilters, tenantId: string) {
    const dashboard = await this.obterDashboard({ evento_id: filters.evento_id }, tenantId);
    const eventoId = BigInt(filters.evento_id);

    const vendasPorItem = await prisma.$queryRaw<Array<{ nome_item: string; quantidade: number; total: number }>>(Prisma.sql`
      SELECT vi.nome_item, SUM(vi.quantidade) AS quantidade, SUM(vi.valor_total) AS total
      FROM carteira_evento_venda_item vi
      INNER JOIN carteira_evento_venda v ON v.id = vi.venda_id
      WHERE v.evento_id = ${eventoId}
        AND v.status <> 'ESTORNADA'
        AND EXISTS (SELECT 1 FROM carteira_evento e WHERE e.id = v.evento_id AND e.tenant_id::text = ${tenantId})
      GROUP BY vi.nome_item
      ORDER BY total DESC, quantidade DESC, vi.nome_item ASC
    `);

    const vendasPorOperador = await prisma.$queryRaw<Array<{ operador_nome: string | null; total: number; quantidade: bigint }>>(Prisma.sql`
      SELECT COALESCE(v.operador_nome, 'Nao informado') AS operador_nome, COALESCE(SUM(v.valor_total), 0) AS total, COUNT(v.id)::bigint AS quantidade
      FROM carteira_evento_venda v
      WHERE v.evento_id = ${eventoId}
        AND v.status <> 'ESTORNADA'
        AND EXISTS (SELECT 1 FROM carteira_evento e WHERE e.id = v.evento_id AND e.tenant_id::text = ${tenantId})
      GROUP BY COALESCE(v.operador_nome, 'Nao informado')
      ORDER BY total DESC
    `);

    return {
      ...dashboard,
      totalCarregadoEmCredito: dashboard.totalCarregado,
      totalConsumidoEmCredito: dashboard.totalConsumido,
      divergencias: Math.max(
        0,
        Number(
          (dashboard.totalCarregado - dashboard.totalConsumido - dashboard.saldoRemanescente).toFixed(2)
        )
      ),
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

  async obterAuditoria(filters: AuditoriaCarteiraFilters, tenantId: string) {
    await ensureCarteiraEventoEstrutura(prisma);
    const eventoId = BigInt(filters.evento_id);
    await this.buscarEventoPorIdOuFalhar(eventoId, tenantId);
    const limite = Number.isInteger(filters.limite) ? Number(filters.limite) : 200;
    const rows = await prisma.$queryRaw<Array<{
      id: bigint;
      evento_id: bigint | null;
      participante_id: bigint | null;
      venda_id: bigint | null;
      tipo_evento: string;
      descricao: string;
      dados: unknown;
      usuario_id: bigint | null;
      usuario_nome: string | null;
      criado_em: Date;
    }>>(Prisma.sql`
      SELECT id, evento_id, participante_id, venda_id, tipo_evento, descricao,
             dados, usuario_id, usuario_nome, criado_em
      FROM carteira_evento_auditoria
      WHERE tenant_id::text = ${tenantId}
        AND evento_id = ${eventoId}
      ORDER BY criado_em DESC, id DESC
      LIMIT ${limite}
    `);
    return {
      eventoId: Number(eventoId),
      registros: rows.map((row) => ({
        id: Number(row.id),
        eventoId: row.evento_id == null ? null : Number(row.evento_id),
        participanteId: row.participante_id == null ? null : Number(row.participante_id),
        vendaId: row.venda_id == null ? null : Number(row.venda_id),
        tipoEvento: row.tipo_evento,
        descricao: row.descricao,
        dados: row.dados,
        usuarioId: row.usuario_id == null ? null : Number(row.usuario_id),
        usuarioNome: row.usuario_nome,
        criadoEm: row.criado_em.toISOString()
      }))
    };
  }

  async registrarImpressao(participanteId: number, ator: CarteiraEventoAtor) {
    await ensureCarteiraEventoEstrutura(prisma);
    const tenantId = this.requireTenant(ator.tenantId);
    const participante = await this.buscarParticipantePorIdOuFalhar(BigInt(participanteId), tenantId);
    const anteriores = await prisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`
      SELECT COUNT(*)::bigint AS total
      FROM carteira_evento_auditoria
      WHERE tenant_id::text = ${tenantId}
        AND participante_id = ${BigInt(participanteId)}
        AND tipo_evento IN ('IMPRESSAO_CARTAO', 'REIMPRESSAO_CARTAO')
    `);
    const tipo = Number(anteriores[0]?.total ?? BigInt(0)) > 0 ? "REIMPRESSAO_CARTAO" : "IMPRESSAO_CARTAO";
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO carteira_evento_auditoria (
        tenant_id, evento_id, participante_id, tipo_evento, descricao, dados,
        usuario_id, usuario_nome, criado_em
      ) VALUES (
        ${tenantId}::uuid,
        ${BigInt(participante.eventoId)},
        ${BigInt(participanteId)},
        ${tipo},
        ${tipo === "IMPRESSAO_CARTAO" ? "Primeira impressao do cartao/comanda" : "Reimpressao do cartao/comanda"},
        ${JSON.stringify({ formato: "CR80", larguraMm: 85.6, alturaMm: 53.98 })}::jsonb,
        ${ator.id ?? null},
        ${ator.nome ?? ator.nome_usuario},
        NOW()
      )
    `);
    return { tipo, participanteId, eventoId: participante.eventoId };
  }

  async obterRelatorio(filters: RelatorioCarteiraFilters, tenantId: string) {
    const eventoId = BigInt(filters.evento_id);
    if (filters.tipo === "PARTICIPANTES" || filters.tipo === "CREDITOS_NAO_UTILIZADOS") {
      const participantes = await this.listarParticipantes({ evento_id: filters.evento_id, limite: 500 }, tenantId);
      return {
        tipo: filters.tipo,
        dados:
          filters.tipo === "CREDITOS_NAO_UTILIZADOS"
            ? participantes.filter((item) => item.saldoAtual > 0)
            : participantes
      };
    }
    if (filters.tipo === "BARRACAS") {
      return { tipo: filters.tipo, dados: await this.listarBarracas({ evento_id: filters.evento_id }, tenantId) };
    }
    if (filters.tipo === "ITENS") {
      return { tipo: filters.tipo, dados: await this.listarItens({ evento_id: filters.evento_id }, tenantId) };
    }
    if (filters.tipo === "EVENTO" || filters.tipo === "RESUMO_FINANCEIRO") {
      return { tipo: filters.tipo, dados: await this.obterDashboard({ evento_id: filters.evento_id }, tenantId) };
    }
    if (filters.tipo === "RANKING_VENDAS") {
      return {
        tipo: filters.tipo,
        dados: (await this.obterDashboard({ evento_id: filters.evento_id }, tenantId)).rankingBarracas
      };
    }
    if (filters.tipo === "EXTRATO_GERAL") {
      const rows = await prisma.$queryRaw<MovimentacaoCarteiraRow[]>(Prisma.sql`
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
        INNER JOIN carteira_evento e ON e.id = m.evento_id
        LEFT JOIN carteira_evento_barraca b ON b.id = m.barraca_id
        LEFT JOIN carteira_evento_item i ON i.id = m.item_id
        WHERE m.evento_id = ${eventoId}
          AND ${tenantSql("e", tenantId)}
        ORDER BY m.criado_em DESC, m.id DESC
      `);
      return { tipo: filters.tipo, dados: rows.map(mapMovimentacaoCarteira) };
    }
    const porHorario = await prisma.$queryRaw<Array<{ hora: string; total: number; quantidade: bigint }>>(Prisma.sql`
      SELECT TO_CHAR(v.criado_em, 'HH24:00') AS hora, COALESCE(SUM(v.valor_total), 0) AS total, COUNT(v.id)::bigint AS quantidade
      FROM carteira_evento_venda v
      WHERE v.evento_id = ${eventoId}
        AND v.status <> 'ESTORNADA'
        AND EXISTS (SELECT 1 FROM carteira_evento e WHERE e.id = v.evento_id AND e.tenant_id::text = ${tenantId})
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

  private async buscarEventoPorIdOuFalhar(id: bigint, tenantId: string) {
    const rows = await prisma.$queryRaw<EventoCarteiraRow[]>(Prisma.sql`
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
        AND tenant_id::text = ${tenantId}
      LIMIT 1
    `);
    const row = rows[0];
    if (!row) {
      throw new AppError("Evento da carteira digital nao encontrado.", 404);
    }
    return mapEventoCarteira(row);
  }

  private async buscarEventoConfigPorIdOuFalhar(id: bigint, tx: Tx | typeof prisma = prisma, tenantId: string) {
    const rows = await tx.$queryRaw<EventoConfigRow[]>(Prisma.sql`
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
        AND tenant_id::text = ${tenantId}
      LIMIT 1
    `);
    const row = rows[0];
    if (!row) {
      throw new AppError("Evento da carteira digital nao encontrado.", 404);
    }
    return row;
  }

  private async buscarBarracaPorIdOuFalhar(id: bigint, tenantId: string) {
    const rows = await prisma.$queryRaw<BarracaEventoRow[]>(Prisma.sql`
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
        AND ${tenantSql("e", tenantId)}
      LIMIT 1
    `);
    const row = rows[0];
    if (!row) {
      throw new AppError("Barraca do evento nao encontrada.", 404);
    }
    return mapBarracaEvento(row);
  }

  private async buscarBarracaOperacaoPorIdOuFalhar(id: bigint, tx: Tx, tenantId: string) {
    const rows = await tx.$queryRaw<BarracaOperacaoRow[]>(Prisma.sql`
      SELECT id, evento_id, nome_barraca, status
      FROM carteira_evento_barraca
      WHERE id = ${id}
        AND EXISTS (
          SELECT 1
          FROM carteira_evento e
          WHERE e.id = carteira_evento_barraca.evento_id
            AND e.tenant_id::text = ${tenantId}
        )
      LIMIT 1
    `);
    const row = rows[0];
    if (!row) {
      throw new AppError("Barraca do evento nao encontrada.", 404);
    }
    return row;
  }

  private async buscarItemPorIdOuFalhar(id: bigint, tenantId: string) {
    const rows = await prisma.$queryRaw<ItemEventoRow[]>(Prisma.sql`
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
        AND ${tenantSql("e", tenantId)}
      LIMIT 1
    `);
    const row = rows[0];
    if (!row) {
      throw new AppError("Item do evento nao encontrado.", 404);
    }
    return mapItemEvento(row);
  }

  private async buscarParticipanteSaldoPorIdOuFalhar(
    id: bigint,
    tx: Tx | typeof prisma = prisma,
    tenantId: string,
    forUpdate = false
  ) {
    const query = Prisma.sql`
      SELECT id, evento_id, nome, status, saldo_atual, qr_code_token_unico
      FROM carteira_evento_participante
      WHERE id = ${id}
        AND EXISTS (
          SELECT 1
          FROM carteira_evento e
          WHERE e.id = carteira_evento_participante.evento_id
            AND e.tenant_id::text = ${tenantId}
        )
      LIMIT 1
      ${forUpdate ? Prisma.sql`FOR UPDATE` : Prisma.empty}
    `;
    const rows = await tx.$queryRaw<ParticipanteSaldoRow[]>(query);
    const row = rows[0];
    if (!row) {
      throw new AppError("Participante da carteira nao encontrado.", 404);
    }
    return row;
  }

  private async buscarParticipantePorTokenOuFalhar(
    eventoId: bigint,
    token: string,
    tx: Tx,
    tenantId: string,
    forUpdate = false
  ) {
    const identificador = token.trim();
    const rows = await tx.$queryRaw<ParticipanteSaldoRow[]>(Prisma.sql`
      SELECT id, evento_id, nome, status, saldo_atual, qr_code_token_unico
      FROM carteira_evento_participante
      WHERE evento_id = ${eventoId}
        AND EXISTS (
          SELECT 1
          FROM carteira_evento e
          WHERE e.id = carteira_evento_participante.evento_id
            AND e.tenant_id::text = ${tenantId}
        )
        AND (
          qr_code_token_unico = ${identificador}
          OR numero_carteira = ${identificador}
        )
      LIMIT 1
      ${forUpdate ? Prisma.sql`FOR UPDATE` : Prisma.empty}
    `);
    const row = rows[0];
    if (!row) {
      throw new AppError("Carteira digital nao encontrada para o identificador informado.", 404);
    }
    return row;
  }

  private async gerarNumeroCarteira(eventoId: bigint, tenantId: string, ignorarId?: bigint) {
    const rows = await prisma.$queryRaw<Array<{ numero_carteira: string | null }>>(Prisma.sql`
      SELECT numero_carteira
      FROM carteira_evento_participante
      WHERE evento_id = ${eventoId}
        AND EXISTS (
          SELECT 1
          FROM carteira_evento e
          WHERE e.id = carteira_evento_participante.evento_id
            AND e.tenant_id::text = ${tenantId}
        )
      ${ignorarId ? Prisma.sql`AND id <> ${ignorarId}` : Prisma.empty}
      ORDER BY id DESC
      LIMIT 1
    `);
    const atual = Number((rows[0]?.numero_carteira ?? "0").replace(/\D/g, "")) || 0;
    return String(atual + 1).padStart(6, "0");
  }

  private gerarTokenSeguro() {
    return crypto.randomBytes(24).toString("hex");
  }

  private requireTenant(tenantId?: string) {
    const normalized = tenantId?.trim();
    if (!normalized) {
      throw new AppError("Tenant da sessao nao identificado.", 401);
    }
    return normalized;
  }

  private async registrarCaixaEventoTx(
    tx: Tx,
    tenantId: string,
    input: {
      eventoId: bigint;
      barracaId?: bigint;
      vendaId?: bigint;
      tipo: string;
      valor: number;
      descricao: string;
      operador: CarteiraEventoAtor;
    }
  ) {
    await tx.$executeRaw(Prisma.sql`
      INSERT INTO carteira_evento_caixa_movimentacao (
        tenant_id,
        evento_id,
        barraca_id,
        venda_id,
        tipo,
        valor,
        descricao,
        operador_usuario_id,
        operador_nome,
        criado_em
      ) VALUES (
        ${tenantId}::uuid,
        ${input.eventoId},
        ${input.barracaId ?? null},
        ${input.vendaId ?? null},
        ${input.tipo},
        ${input.valor},
        ${input.descricao},
        ${input.operador.id ?? null},
        ${input.operador.nome ?? input.operador.nome_usuario},
        NOW()
      )
      ON CONFLICT (venda_id, tipo) WHERE venda_id IS NOT NULL DO NOTHING
    `);
  }

  private async registrarMovimentacaoTx(
    tx: Tx,
    input: {
      evento_id: bigint;
      participante_id: bigint;
      barraca_id?: bigint;
      item_id?: bigint;
      venda_id?: bigint;
      tipo_movimentacao: string;
      forma_pagamento?: FormaPagamentoCarteira;
      valor: number;
      saldo_anterior: number;
      saldo_posterior: number;
      descricao?: string;
      motivo?: string;
      referencia_externa?: string;
      operador: CarteiraEventoAtor;
    }
  ) {
    await tx.$executeRaw(Prisma.sql`
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

    const evento = await tx.$queryRaw<Array<{ tenant_id: string | null }>>(Prisma.sql`
      SELECT tenant_id::text
      FROM carteira_evento
      WHERE id = ${input.evento_id}
      LIMIT 1
    `);
    if (evento[0]?.tenant_id) {
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO carteira_evento_auditoria (
          tenant_id,
          evento_id,
          participante_id,
          venda_id,
          tipo_evento,
          descricao,
          dados,
          usuario_id,
          usuario_nome,
          criado_em
        ) VALUES (
          ${evento[0].tenant_id}::uuid,
          ${input.evento_id},
          ${input.participante_id},
          ${input.venda_id ?? null},
          ${input.tipo_movimentacao},
          ${trimOrUndefined(input.descricao) ?? "Movimentacao da carteira"},
          ${JSON.stringify({
            valor: input.valor,
            saldoAnterior: input.saldo_anterior,
            saldoPosterior: input.saldo_posterior,
            formaPagamento: input.forma_pagamento ?? null,
            motivo: input.motivo ?? null,
            referenciaExterna: input.referencia_externa ?? null
          })}::jsonb,
          ${input.operador.id ?? null},
          ${input.operador.nome ?? input.operador.nome_usuario},
          NOW()
        )
      `);
    }
  }

  private async listarItensVendaTx(tx: Tx, vendaId: bigint) {
    return tx.$queryRaw<VendaCarteiraItemRow[]>(Prisma.sql`
      SELECT id, venda_id, item_id, nome_item, quantidade, valor_unitario, valor_total
      FROM carteira_evento_venda_item
      WHERE venda_id = ${vendaId}
      ORDER BY id ASC
    `);
  }
}
