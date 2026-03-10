import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import type {
  SenhaChamarInput,
  SenhaChamadaRow,
  SenhaEmitirInput,
  SenhaFilaRow,
  SenhasConfigInput,
  SenhasConfigRow
} from "../senhas.types.js";

const estruturaSql = [
  `
  CREATE TABLE IF NOT EXISTS senhas_fila (
    id BIGSERIAL PRIMARY KEY,
    beneficiario_id BIGINT NOT NULL,
    nome_beneficiario TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'AGUARDANDO',
    prioridade INTEGER NOT NULL DEFAULT 1,
    data_hora_entrada TIMESTAMP NOT NULL DEFAULT NOW(),
    unidade_id BIGINT,
    sala_atendimento TEXT,
    atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
  )
  `,
  `
  CREATE TABLE IF NOT EXISTS senhas_chamadas (
    id BIGSERIAL PRIMARY KEY,
    fila_id BIGINT NOT NULL REFERENCES senhas_fila(id) ON DELETE CASCADE,
    beneficiario_id BIGINT NOT NULL,
    nome_beneficiario TEXT NOT NULL,
    local_atendimento TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'CHAMADO',
    data_hora_chamada TIMESTAMP NOT NULL DEFAULT NOW(),
    unidade_id BIGINT,
    chamado_por TEXT NOT NULL DEFAULT 'Sistema'
  )
  `,
  `
  CREATE TABLE IF NOT EXISTS senhas_config (
    id BIGSERIAL PRIMARY KEY,
    frase_fala TEXT NOT NULL DEFAULT 'Beneficiario {beneficiario} dirija-se a {sala} para atendimento.',
    rss_url TEXT NOT NULL DEFAULT 'https://www.gov.br/pt-br/noticias/assistencia-social/RSS',
    velocidade_ticker INTEGER NOT NULL DEFAULT 60,
    modo_noticias TEXT,
    noticias_manuais TEXT,
    quantidade_ultimas_chamadas INTEGER NOT NULL DEFAULT 4,
    unidade_painel_id BIGINT,
    titulo_tela TEXT,
    descricao_tela TEXT,
    atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
  )
  `,
  "CREATE INDEX IF NOT EXISTS senhas_fila_status_idx ON senhas_fila(status)",
  "CREATE INDEX IF NOT EXISTS senhas_fila_unidade_idx ON senhas_fila(unidade_id)",
  "CREATE INDEX IF NOT EXISTS senhas_chamadas_unidade_idx ON senhas_chamadas(unidade_id)",
  "CREATE INDEX IF NOT EXISTS senhas_chamadas_data_idx ON senhas_chamadas(data_hora_chamada DESC)"
];

export class SenhasRepository {
  private estruturaGarantida = false;

  private async garantirEstrutura() {
    if (this.estruturaGarantida) return;
    for (const comando of estruturaSql) {
      await prisma.$executeRawUnsafe(comando);
    }

    await prisma.$executeRawUnsafe(`
      INSERT INTO senhas_config (id)
      SELECT 1
      WHERE NOT EXISTS (SELECT 1 FROM senhas_config WHERE id = 1)
    `);

    this.estruturaGarantida = true;
  }

  private async obterNomeBeneficiario(beneficiarioId: number) {
    const rows = await prisma.$queryRaw<Array<{ nome_completo: string | null; nome_social: string | null }>>(Prisma.sql`
      SELECT nome_completo, nome_social
      FROM cadastro_beneficiario
      WHERE id = ${BigInt(beneficiarioId)}
      LIMIT 1
    `);

    const registro = rows[0];
    if (!registro) {
      throw new AppError("Beneficiario nao encontrado.", 404);
    }
    return registro.nome_completo ?? registro.nome_social ?? "Beneficiario";
  }

  async listarAguardando(unidadeId?: number | null) {
    await this.garantirEstrutura();
    const filtroUnidade =
      typeof unidadeId === "number" && unidadeId > 0
        ? Prisma.sql`AND unidade_id = ${BigInt(unidadeId)}`
        : Prisma.empty;

    return prisma.$queryRaw<SenhaFilaRow[]>(Prisma.sql`
      SELECT
        id,
        beneficiario_id,
        nome_beneficiario,
        status,
        prioridade,
        data_hora_entrada,
        unidade_id,
        sala_atendimento
      FROM senhas_fila
      WHERE status = 'AGUARDANDO'
      ${filtroUnidade}
      ORDER BY prioridade DESC, data_hora_entrada ASC, id ASC
    `);
  }

  async emitir(input: SenhaEmitirInput) {
    await this.garantirEstrutura();
    const nomeBeneficiario = await this.obterNomeBeneficiario(input.beneficiarioId);

    const inserted = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
      INSERT INTO senhas_fila (
        beneficiario_id,
        nome_beneficiario,
        status,
        prioridade,
        data_hora_entrada,
        unidade_id,
        sala_atendimento,
        atualizado_em
      ) VALUES (
        ${BigInt(input.beneficiarioId)},
        ${nomeBeneficiario},
        'AGUARDANDO',
        ${input.prioridade ?? 1},
        NOW(),
        ${input.unidadeId ? BigInt(input.unidadeId) : null},
        ${input.salaAtendimento ?? null},
        NOW()
      )
      RETURNING id
    `);

    const id = inserted[0]?.id;
    if (!id) throw new AppError("Nao foi possivel emitir senha.", 500);

    const rows = await prisma.$queryRaw<SenhaFilaRow[]>(Prisma.sql`
      SELECT
        id,
        beneficiario_id,
        nome_beneficiario,
        status,
        prioridade,
        data_hora_entrada,
        unidade_id,
        sala_atendimento
      FROM senhas_fila
      WHERE id = ${id}
      LIMIT 1
    `);
    return rows[0] as SenhaFilaRow;
  }

  async chamar(input: SenhaChamarInput) {
    await this.garantirEstrutura();

    const filaRows = await prisma.$queryRaw<SenhaFilaRow[]>(Prisma.sql`
      SELECT
        id,
        beneficiario_id,
        nome_beneficiario,
        status,
        prioridade,
        data_hora_entrada,
        unidade_id,
        sala_atendimento
      FROM senhas_fila
      WHERE id = ${BigInt(input.filaId)}
      LIMIT 1
    `);

    const fila = filaRows[0];
    if (!fila) throw new AppError("Senha nao encontrada na fila.", 404);
    if (!["AGUARDANDO", "CHAMADO"].includes(fila.status)) {
      throw new AppError("A senha selecionada ja foi concluida ou cancelada.", 400);
    }

    const inserted = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
      INSERT INTO senhas_chamadas (
        fila_id,
        beneficiario_id,
        nome_beneficiario,
        local_atendimento,
        status,
        data_hora_chamada,
        unidade_id,
        chamado_por
      ) VALUES (
        ${fila.id},
        ${fila.beneficiario_id},
        ${fila.nome_beneficiario},
        ${input.localAtendimento},
        'CHAMADO',
        NOW(),
        ${input.unidadeId ? BigInt(input.unidadeId) : fila.unidade_id},
        ${input.usuarioId ? `Usuario ${input.usuarioId}` : "Sistema"}
      )
      RETURNING id
    `);

    await prisma.$executeRaw(Prisma.sql`
      UPDATE senhas_fila
      SET status = 'CHAMADO', atualizado_em = NOW()
      WHERE id = ${fila.id}
    `);

    const chamadaId = inserted[0]?.id;
    if (!chamadaId) throw new AppError("Nao foi possivel chamar a senha.", 500);

    const chamadas = await prisma.$queryRaw<SenhaChamadaRow[]>(Prisma.sql`
      SELECT
        id,
        fila_id,
        beneficiario_id,
        nome_beneficiario,
        local_atendimento,
        status,
        data_hora_chamada,
        unidade_id,
        chamado_por
      FROM senhas_chamadas
      WHERE id = ${chamadaId}
      LIMIT 1
    `);

    return chamadas[0] as SenhaChamadaRow;
  }

  async finalizarChamada(chamadaId: bigint) {
    await this.garantirEstrutura();

    const chamadas = await prisma.$queryRaw<SenhaChamadaRow[]>(Prisma.sql`
      SELECT
        id,
        fila_id,
        beneficiario_id,
        nome_beneficiario,
        local_atendimento,
        status,
        data_hora_chamada,
        unidade_id,
        chamado_por
      FROM senhas_chamadas
      WHERE id = ${chamadaId}
      LIMIT 1
    `);

    const chamada = chamadas[0];
    if (!chamada) throw new AppError("Chamada nao encontrada.", 404);

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`
        UPDATE senhas_chamadas
        SET status = 'FINALIZADO'
        WHERE id = ${chamadaId}
      `);

      await tx.$executeRaw(Prisma.sql`
        UPDATE senhas_fila
        SET status = 'FINALIZADO', atualizado_em = NOW()
        WHERE id = ${chamada.fila_id}
      `);
    });
  }

  async finalizarFila(filaId: bigint) {
    await this.garantirEstrutura();

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`
        UPDATE senhas_fila
        SET status = 'FINALIZADO', atualizado_em = NOW()
        WHERE id = ${filaId}
      `);

      await tx.$executeRaw(Prisma.sql`
        UPDATE senhas_chamadas
        SET status = 'FINALIZADO'
        WHERE fila_id = ${filaId}
      `);
    });
  }

  async painel(unidadeId?: number | null, limite = 10) {
    await this.garantirEstrutura();

    const filtroUnidade =
      typeof unidadeId === "number" && unidadeId > 0
        ? Prisma.sql`WHERE c.unidade_id = ${BigInt(unidadeId)}`
        : Prisma.empty;

    return prisma.$queryRaw<SenhaChamadaRow[]>(Prisma.sql`
      SELECT
        c.id,
        c.fila_id,
        c.beneficiario_id,
        c.nome_beneficiario,
        c.local_atendimento,
        c.status,
        c.data_hora_chamada,
        c.unidade_id,
        c.chamado_por
      FROM senhas_chamadas c
      ${filtroUnidade}
      ORDER BY c.data_hora_chamada DESC, c.id DESC
      LIMIT ${limite}
    `);
  }

  async atual(unidadeId?: number | null) {
    await this.garantirEstrutura();

    const filtroUnidade =
      typeof unidadeId === "number" && unidadeId > 0
        ? Prisma.sql`AND c.unidade_id = ${BigInt(unidadeId)}`
        : Prisma.empty;

    const rows = await prisma.$queryRaw<SenhaChamadaRow[]>(Prisma.sql`
      SELECT
        c.id,
        c.fila_id,
        c.beneficiario_id,
        c.nome_beneficiario,
        c.local_atendimento,
        c.status,
        c.data_hora_chamada,
        c.unidade_id,
        c.chamado_por
      FROM senhas_chamadas c
      WHERE c.status = 'CHAMADO'
      ${filtroUnidade}
      ORDER BY c.data_hora_chamada DESC, c.id DESC
      LIMIT 1
    `);

    return rows[0] ?? null;
  }

  async obterConfig() {
    await this.garantirEstrutura();
    const rows = await prisma.$queryRaw<SenhasConfigRow[]>(Prisma.sql`
      SELECT
        id,
        frase_fala,
        rss_url,
        velocidade_ticker,
        modo_noticias,
        noticias_manuais,
        quantidade_ultimas_chamadas,
        unidade_painel_id,
        titulo_tela,
        descricao_tela,
        atualizado_em
      FROM senhas_config
      ORDER BY id ASC
      LIMIT 1
    `);
    return rows[0] as SenhasConfigRow;
  }

  async atualizarConfig(input: SenhasConfigInput) {
    await this.garantirEstrutura();

    await prisma.$executeRaw(Prisma.sql`
      UPDATE senhas_config
      SET
        frase_fala = ${input.fraseFala},
        rss_url = ${input.rssUrl},
        velocidade_ticker = ${input.velocidadeTicker},
        modo_noticias = ${input.modoNoticias ?? null},
        noticias_manuais = ${input.noticiasManuais ?? null},
        quantidade_ultimas_chamadas = ${input.quantidadeUltimasChamadas},
        unidade_painel_id = ${input.unidadePainelId ? BigInt(input.unidadePainelId) : null},
        titulo_tela = ${input.tituloTela ?? null},
        descricao_tela = ${input.descricaoTela ?? null},
        atualizado_em = NOW()
      WHERE id = 1
    `);

    return this.obterConfig();
  }
}
