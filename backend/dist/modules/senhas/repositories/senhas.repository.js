import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
const estruturaSql = [
    `
  CREATE TABLE IF NOT EXISTS senhas_fila (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID,
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
    tenant_id UUID,
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
    tenant_id UUID,
    frase_fala TEXT NOT NULL DEFAULT 'Beneficiario {beneficiario} dirija-se a {sala} para atendimento.',
    rss_url TEXT NOT NULL DEFAULT 'https://www.gov.br/pt-br/noticias/assistencia-social/RSS',
    velocidade_ticker INTEGER NOT NULL DEFAULT 60,
    modo_noticias TEXT,
    noticias_manuais TEXT,
    quantidade_ultimas_chamadas INTEGER NOT NULL DEFAULT 4,
    unidade_painel_id BIGINT,
    titulo_tela TEXT,
    descricao_tela TEXT,
    avisos_sonoros_json TEXT,
    aviso_sonoro_ativo_id TEXT,
    aviso_sonoro_url TEXT,
    aviso_sonoro_nome TEXT,
    atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
  )
  `
];
const estruturaIndicesSql = [
    "CREATE INDEX IF NOT EXISTS senhas_fila_status_idx ON senhas_fila(status)",
    "CREATE INDEX IF NOT EXISTS senhas_fila_unidade_idx ON senhas_fila(unidade_id)",
    "CREATE INDEX IF NOT EXISTS senhas_fila_tenant_idx ON senhas_fila(tenant_id, status, data_hora_entrada)",
    "CREATE INDEX IF NOT EXISTS senhas_chamadas_unidade_idx ON senhas_chamadas(unidade_id)",
    "CREATE INDEX IF NOT EXISTS senhas_chamadas_data_idx ON senhas_chamadas(data_hora_chamada DESC)",
    "CREATE INDEX IF NOT EXISTS senhas_chamadas_tenant_idx ON senhas_chamadas(tenant_id, data_hora_chamada DESC)",
    "CREATE INDEX IF NOT EXISTS senhas_config_tenant_idx ON senhas_config(tenant_id)"
];
let estruturaPromise = null;
export async function ensureSenhasEstrutura() {
    if (!estruturaPromise) {
        estruturaPromise = (async () => {
            for (const comando of estruturaSql) {
                await prisma.$executeRawUnsafe(comando);
            }
            await prisma.$executeRawUnsafe(`
        ALTER TABLE senhas_fila
        ADD COLUMN IF NOT EXISTS tenant_id UUID
      `);
            await prisma.$executeRawUnsafe(`
        ALTER TABLE senhas_chamadas
        ADD COLUMN IF NOT EXISTS tenant_id UUID
      `);
            await prisma.$executeRawUnsafe(`
        ALTER TABLE senhas_config
        ADD COLUMN IF NOT EXISTS tenant_id UUID
      `);
            await prisma.$executeRawUnsafe(`
        INSERT INTO senhas_config (id)
        SELECT 1
        WHERE NOT EXISTS (SELECT 1 FROM senhas_config WHERE id = 1)
      `);
            await prisma.$executeRawUnsafe(`
        ALTER TABLE senhas_config
        ADD COLUMN IF NOT EXISTS avisos_sonoros_json TEXT
      `);
            await prisma.$executeRawUnsafe(`
        ALTER TABLE senhas_config
        ADD COLUMN IF NOT EXISTS aviso_sonoro_ativo_id TEXT
      `);
            await prisma.$executeRawUnsafe(`
        ALTER TABLE senhas_config
        ADD COLUMN IF NOT EXISTS aviso_sonoro_url TEXT
      `);
            await prisma.$executeRawUnsafe(`
        ALTER TABLE senhas_config
        ADD COLUMN IF NOT EXISTS aviso_sonoro_nome TEXT
      `);
            for (const comando of estruturaIndicesSql) {
                await prisma.$executeRawUnsafe(comando);
            }
            await prisma.$executeRawUnsafe(`
        UPDATE senhas_fila AS fila
        SET tenant_id = beneficiario.tenant_id
        FROM cadastro_beneficiario AS beneficiario
        WHERE fila.tenant_id IS NULL
          AND beneficiario.id = fila.beneficiario_id
          AND beneficiario.tenant_id IS NOT NULL
      `);
            await prisma.$executeRawUnsafe(`
        UPDATE senhas_chamadas AS chamada
        SET tenant_id = fila.tenant_id
        FROM senhas_fila AS fila
        WHERE chamada.tenant_id IS NULL
          AND fila.id = chamada.fila_id
          AND fila.tenant_id IS NOT NULL
      `);
            await prisma.$executeRawUnsafe(`
        UPDATE senhas_chamadas AS chamada
        SET tenant_id = beneficiario.tenant_id
        FROM cadastro_beneficiario AS beneficiario
        WHERE chamada.tenant_id IS NULL
          AND beneficiario.id = chamada.beneficiario_id
          AND beneficiario.tenant_id IS NOT NULL
      `);
        })();
    }
    await estruturaPromise;
}
export class SenhasRepository {
    async garantirEstrutura() {
        await ensureSenhasEstrutura();
    }
    async obterNomeBeneficiario(beneficiarioId, tenantId) {
        const rows = await prisma.$queryRaw(Prisma.sql `
      SELECT nome_completo, nome_social
      FROM cadastro_beneficiario
      WHERE id = ${BigInt(beneficiarioId)}
        AND tenant_id = CAST(${tenantId} AS UUID)
      LIMIT 1
    `);
        const registro = rows[0];
        if (!registro) {
            throw new AppError("Beneficiario nao encontrado.", 404);
        }
        return registro.nome_completo ?? registro.nome_social ?? "Beneficiario";
    }
    async obterFilaPorId(filaId, tenantId) {
        const rows = await prisma.$queryRaw(Prisma.sql `
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
      WHERE id = ${filaId}
        AND tenant_id = CAST(${tenantId} AS UUID)
      LIMIT 1
    `);
        return rows[0] ?? null;
    }
    async obterChamadaPorId(chamadaId, tenantId) {
        const rows = await prisma.$queryRaw(Prisma.sql `
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
        AND tenant_id = CAST(${tenantId} AS UUID)
      LIMIT 1
    `);
        return rows[0] ?? null;
    }
    async garantirConfigTenant(tenantId) {
        await prisma.$executeRaw(Prisma.sql `
      INSERT INTO senhas_config (tenant_id)
      SELECT CAST(${tenantId} AS UUID)
      WHERE NOT EXISTS (
        SELECT 1
        FROM senhas_config
        WHERE tenant_id = CAST(${tenantId} AS UUID)
      )
    `);
    }
    async listarAguardando(unidadeId, tenantId) {
        await this.garantirEstrutura();
        const filtroUnidade = typeof unidadeId === "number" && unidadeId > 0
            ? Prisma.sql `AND unidade_id = ${BigInt(unidadeId)}`
            : Prisma.empty;
        return prisma.$queryRaw(Prisma.sql `
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
        AND tenant_id = CAST(${tenantId} AS UUID)
      ${filtroUnidade}
      ORDER BY prioridade DESC, data_hora_entrada ASC, id ASC
    `);
    }
    async emitir(input, tenantId) {
        await this.garantirEstrutura();
        const nomeBeneficiario = await this.obterNomeBeneficiario(input.beneficiarioId, tenantId);
        const inserted = await prisma.$queryRaw(Prisma.sql `
      INSERT INTO senhas_fila (
        tenant_id,
        beneficiario_id,
        nome_beneficiario,
        status,
        prioridade,
        data_hora_entrada,
        unidade_id,
        sala_atendimento,
        atualizado_em
      ) VALUES (
        CAST(${tenantId} AS UUID),
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
        if (!id) {
            throw new AppError("Nao foi possivel emitir senha.", 500);
        }
        const fila = await this.obterFilaPorId(id, tenantId);
        if (!fila) {
            throw new AppError("Nao foi possivel localizar a senha emitida.", 500);
        }
        return fila;
    }
    async chamar(input, tenantId) {
        await this.garantirEstrutura();
        const fila = await this.obterFilaPorId(BigInt(input.filaId), tenantId);
        if (!fila) {
            throw new AppError("Senha nao encontrada na fila.", 404);
        }
        if (!["AGUARDANDO", "CHAMADO"].includes(fila.status)) {
            throw new AppError("A senha selecionada ja foi concluida ou cancelada.", 400);
        }
        const inserted = await prisma.$queryRaw(Prisma.sql `
      INSERT INTO senhas_chamadas (
        tenant_id,
        fila_id,
        beneficiario_id,
        nome_beneficiario,
        local_atendimento,
        status,
        data_hora_chamada,
        unidade_id,
        chamado_por
      ) VALUES (
        CAST(${tenantId} AS UUID),
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
        await prisma.$executeRaw(Prisma.sql `
      UPDATE senhas_fila
      SET status = 'CHAMADO', atualizado_em = NOW()
      WHERE id = ${fila.id}
        AND tenant_id = CAST(${tenantId} AS UUID)
    `);
        const chamadaId = inserted[0]?.id;
        if (!chamadaId) {
            throw new AppError("Nao foi possivel chamar a senha.", 500);
        }
        const chamada = await this.obterChamadaPorId(chamadaId, tenantId);
        if (!chamada) {
            throw new AppError("Nao foi possivel localizar a chamada gerada.", 500);
        }
        return chamada;
    }
    async finalizarChamada(chamadaId, tenantId) {
        await this.garantirEstrutura();
        const chamada = await this.obterChamadaPorId(chamadaId, tenantId);
        if (!chamada) {
            throw new AppError("Chamada nao encontrada.", 404);
        }
        await prisma.$transaction(async (tx) => {
            await tx.$executeRaw(Prisma.sql `
        UPDATE senhas_chamadas
        SET status = 'FINALIZADO'
        WHERE id = ${chamadaId}
          AND tenant_id = CAST(${tenantId} AS UUID)
      `);
            await tx.$executeRaw(Prisma.sql `
        UPDATE senhas_fila
        SET status = 'FINALIZADO', atualizado_em = NOW()
        WHERE id = ${chamada.fila_id}
          AND tenant_id = CAST(${tenantId} AS UUID)
      `);
        });
    }
    async finalizarFila(filaId, tenantId) {
        await this.garantirEstrutura();
        const fila = await this.obterFilaPorId(filaId, tenantId);
        if (!fila) {
            throw new AppError("Senha nao encontrada na fila.", 404);
        }
        await prisma.$transaction(async (tx) => {
            await tx.$executeRaw(Prisma.sql `
        UPDATE senhas_fila
        SET status = 'FINALIZADO', atualizado_em = NOW()
        WHERE id = ${filaId}
          AND tenant_id = CAST(${tenantId} AS UUID)
      `);
            await tx.$executeRaw(Prisma.sql `
        UPDATE senhas_chamadas
        SET status = 'FINALIZADO'
        WHERE fila_id = ${filaId}
          AND tenant_id = CAST(${tenantId} AS UUID)
      `);
        });
    }
    async painel(unidadeId, limite = 10, tenantId) {
        await this.garantirEstrutura();
        const filtroUnidade = typeof unidadeId === "number" && unidadeId > 0
            ? Prisma.sql `AND c.unidade_id = ${BigInt(unidadeId)}`
            : Prisma.empty;
        return prisma.$queryRaw(Prisma.sql `
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
      WHERE c.tenant_id = CAST(${tenantId} AS UUID)
      ${filtroUnidade}
      ORDER BY c.data_hora_chamada DESC, c.id DESC
      LIMIT ${limite}
    `);
    }
    async atual(unidadeId, tenantId) {
        await this.garantirEstrutura();
        const filtroUnidade = typeof unidadeId === "number" && unidadeId > 0
            ? Prisma.sql `AND c.unidade_id = ${BigInt(unidadeId)}`
            : Prisma.empty;
        const rows = await prisma.$queryRaw(Prisma.sql `
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
        AND c.tenant_id = CAST(${tenantId} AS UUID)
      ${filtroUnidade}
      ORDER BY c.data_hora_chamada DESC, c.id DESC
      LIMIT 1
    `);
        return rows[0] ?? null;
    }
    async obterConfig(tenantId) {
        await this.garantirEstrutura();
        await this.garantirConfigTenant(tenantId);
        const rows = await prisma.$queryRaw(Prisma.sql `
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
        avisos_sonoros_json,
        aviso_sonoro_ativo_id,
        aviso_sonoro_url,
        aviso_sonoro_nome,
        atualizado_em
      FROM senhas_config
      WHERE tenant_id = CAST(${tenantId} AS UUID)
      ORDER BY id ASC
      LIMIT 1
    `);
        return rows[0];
    }
    async atualizarConfig(input, tenantId) {
        await this.garantirEstrutura();
        await this.garantirConfigTenant(tenantId);
        await prisma.$executeRaw(Prisma.sql `
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
        avisos_sonoros_json = ${JSON.stringify(input.avisosSonoros ?? [])},
        aviso_sonoro_ativo_id = ${input.avisoSonoroAtivoId ?? null},
        aviso_sonoro_url = NULL,
        aviso_sonoro_nome = NULL,
        atualizado_em = NOW()
      WHERE tenant_id = CAST(${tenantId} AS UUID)
    `);
        return this.obterConfig(tenantId);
    }
}
