import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import type {
  InformacaoAdministrativaCategoriaInput,
  InformacaoAdministrativaCategoriaRow,
  InformacaoAdministrativaInput,
  InformacaoAdministrativaRow
} from "../informacoes-administrativas.types.js";

const categoriasPadrao = [
  "Registro institucional",
  "Dados institucionais",
  "Sedes e contatos",
  "Registros e credenciamentos",
  "Internet",
  "Modem e roteador",
  "E-mail",
  "Projetos e programas",
  "Informações bancárias",
  "Doações e Pix",
  "Nuvem e documentos",
  "Certidões e regularidade",
  "Compras web",
  "Cameras",
  "Wi-Fi",
  "Sistema",
  "Portal externo",
  "Acesso externo",
  "Equipamento",
  "Contrato e suporte",
  "Controle interno",
  "Outros"
];

const estruturaSql = [
  `
    CREATE TABLE IF NOT EXISTS informacoes_administrativas (
      id BIGSERIAL PRIMARY KEY,
      tenant_id UUID NOT NULL,
      categoria VARCHAR(80) NOT NULL,
      titulo VARCHAR(160) NOT NULL,
      descricao TEXT,
      usuario_acesso TEXT,
      senha_acesso TEXT,
      link TEXT,
      observacoes TEXT,
      criado_por BIGINT,
      atualizado_por BIGINT,
      criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deletado_em TIMESTAMPTZ
    )
  `,
  "CREATE INDEX IF NOT EXISTS informacoes_administrativas_tenant_idx ON informacoes_administrativas(tenant_id, atualizado_em DESC, id DESC)",
  `
    CREATE TABLE IF NOT EXISTS informacoes_administrativas_categorias (
      id BIGSERIAL PRIMARY KEY,
      tenant_id UUID NOT NULL,
      nome VARCHAR(80) NOT NULL,
      ativo BOOLEAN NOT NULL DEFAULT TRUE,
      criado_por BIGINT,
      atualizado_por BIGINT,
      criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deletado_em TIMESTAMPTZ
    )
  `,
  "CREATE UNIQUE INDEX IF NOT EXISTS informacoes_administrativas_categorias_nome_idx ON informacoes_administrativas_categorias(tenant_id, nome) WHERE deletado_em IS NULL",
  "CREATE INDEX IF NOT EXISTS informacoes_administrativas_categorias_tenant_idx ON informacoes_administrativas_categorias(tenant_id, nome)",
  `
    CREATE TABLE IF NOT EXISTS informacoes_administrativas_auditoria (
      id BIGSERIAL PRIMARY KEY,
      tenant_id UUID NOT NULL,
      informacao_id BIGINT,
      usuario_id BIGINT,
      acao VARCHAR(40) NOT NULL,
      detalhes_json JSONB,
      criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `,
  "CREATE INDEX IF NOT EXISTS informacoes_administrativas_auditoria_tenant_idx ON informacoes_administrativas_auditoria(tenant_id, criado_em DESC, id DESC)"
] as const;

let estruturaPromise: Promise<void> | null = null;

export class InformacoesAdministrativasRepository {
  private async garantirEstrutura() {
    if (!estruturaPromise) {
      estruturaPromise = (async () => {
        for (const sql of estruturaSql) {
          await prisma.$executeRawUnsafe(sql);
        }
      })().catch((error) => {
        estruturaPromise = null;
        throw error;
      });
    }

    await estruturaPromise;
  }

  private async garantirCategoriasPadrao(tenantId: string, usuarioId?: bigint) {
    await this.garantirEstrutura();

    for (const nome of categoriasPadrao) {
      await prisma.$executeRaw(Prisma.sql`
        INSERT INTO informacoes_administrativas_categorias (
          tenant_id,
          nome,
          ativo,
          criado_por,
          atualizado_por,
          criado_em,
          atualizado_em
        ) VALUES (
          CAST(${tenantId} AS UUID),
          ${nome},
          TRUE,
          ${usuarioId ?? null},
          ${usuarioId ?? null},
          NOW(),
          NOW()
        )
        ON CONFLICT DO NOTHING
      `);
    }

    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO informacoes_administrativas_categorias (
        tenant_id,
        nome,
        ativo,
        criado_por,
        atualizado_por,
        criado_em,
        atualizado_em
      )
      SELECT DISTINCT
        CAST(${tenantId} AS UUID),
        TRIM(categoria),
        TRUE,
        ${usuarioId ?? null},
        ${usuarioId ?? null},
        NOW(),
        NOW()
      FROM informacoes_administrativas
      WHERE tenant_id::text = ${tenantId}
        AND deletado_em IS NULL
        AND COALESCE(TRIM(categoria), '') <> ''
      ON CONFLICT DO NOTHING
    `);
  }

  async listarCategorias(tenantId: string, usuarioId?: bigint) {
    await this.garantirCategoriasPadrao(tenantId, usuarioId);
    return prisma.$queryRaw<InformacaoAdministrativaCategoriaRow[]>(Prisma.sql`
      SELECT
        id,
        tenant_id::text AS tenant_id,
        nome,
        ativo,
        criado_em,
        atualizado_em
      FROM informacoes_administrativas_categorias
      WHERE tenant_id::text = ${tenantId}
        AND deletado_em IS NULL
      ORDER BY nome ASC
    `);
  }

  async buscarCategoriaPorId(id: bigint, tenantId: string) {
    await this.garantirEstrutura();
    const rows = await prisma.$queryRaw<InformacaoAdministrativaCategoriaRow[]>(Prisma.sql`
      SELECT
        id,
        tenant_id::text AS tenant_id,
        nome,
        ativo,
        criado_em,
        atualizado_em
      FROM informacoes_administrativas_categorias
      WHERE id = ${id}
        AND tenant_id::text = ${tenantId}
        AND deletado_em IS NULL
      LIMIT 1
    `);

    return rows[0] ?? null;
  }

  async buscarCategoriaPorIdOuFalhar(id: bigint, tenantId: string) {
    const categoria = await this.buscarCategoriaPorId(id, tenantId);
    if (!categoria) {
      throw new AppError("Categoria administrativa nao encontrada.", 404);
    }
    return categoria;
  }

  async criarCategoria(input: InformacaoAdministrativaCategoriaInput, tenantId: string, usuarioId: bigint) {
    await this.garantirCategoriasPadrao(tenantId, usuarioId);
    await this.validarNomeCategoriaDisponivel(input.nome, tenantId);

    const rows = await prisma.$queryRaw<{ id: bigint }[]>(Prisma.sql`
      INSERT INTO informacoes_administrativas_categorias (
        tenant_id,
        nome,
        ativo,
        criado_por,
        atualizado_por,
        criado_em,
        atualizado_em
      ) VALUES (
        CAST(${tenantId} AS UUID),
        ${input.nome},
        ${input.ativo ?? true},
        ${usuarioId},
        ${usuarioId},
        NOW(),
        NOW()
      )
      RETURNING id
    `);

    const id = rows[0]?.id;
    if (!id) {
      throw new AppError("Nao foi possivel criar a categoria administrativa.", 500);
    }

    await this.registrarAuditoria(tenantId, null, usuarioId, "CRIACAO_CATEGORIA", { categoriaId: id.toString() });
    return this.buscarCategoriaPorIdOuFalhar(id, tenantId);
  }

  async atualizarCategoria(
    id: bigint,
    input: InformacaoAdministrativaCategoriaInput,
    tenantId: string,
    usuarioId: bigint
  ) {
    await this.garantirCategoriasPadrao(tenantId, usuarioId);
    const atual = await this.buscarCategoriaPorIdOuFalhar(id, tenantId);
    await this.validarNomeCategoriaDisponivel(input.nome, tenantId, id);

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`
        UPDATE informacoes_administrativas_categorias
        SET nome = ${input.nome},
            ativo = ${input.ativo ?? true},
            atualizado_por = ${usuarioId},
            atualizado_em = NOW()
        WHERE id = ${id}
          AND tenant_id::text = ${tenantId}
          AND deletado_em IS NULL
      `);

      if (atual.nome !== input.nome) {
        await tx.$executeRaw(Prisma.sql`
          UPDATE informacoes_administrativas
          SET categoria = ${input.nome},
              atualizado_por = ${usuarioId},
              atualizado_em = NOW()
          WHERE tenant_id::text = ${tenantId}
            AND categoria = ${atual.nome}
            AND deletado_em IS NULL
        `);
      }
    });

    await this.registrarAuditoria(tenantId, null, usuarioId, "ATUALIZACAO_CATEGORIA", {
      categoriaId: id.toString(),
      nomeAnterior: atual.nome,
      nomeAtual: input.nome
    });
    return this.buscarCategoriaPorIdOuFalhar(id, tenantId);
  }

  async removerCategoria(id: bigint, tenantId: string, usuarioId: bigint) {
    await this.garantirCategoriasPadrao(tenantId, usuarioId);
    const categoria = await this.buscarCategoriaPorIdOuFalhar(id, tenantId);
    const uso = await prisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`
      SELECT COUNT(*)::BIGINT AS total
      FROM informacoes_administrativas
      WHERE tenant_id::text = ${tenantId}
        AND categoria = ${categoria.nome}
        AND deletado_em IS NULL
    `);

    if (Number(uso[0]?.total ?? 0) > 0) {
      throw new AppError("Categoria em uso. Altere ou exclua as informacoes vinculadas antes de remover a categoria.", 409);
    }

    await prisma.$executeRaw(Prisma.sql`
      UPDATE informacoes_administrativas_categorias
      SET deletado_em = NOW(),
          atualizado_por = ${usuarioId},
          atualizado_em = NOW()
      WHERE id = ${id}
        AND tenant_id::text = ${tenantId}
        AND deletado_em IS NULL
    `);

    await this.registrarAuditoria(tenantId, null, usuarioId, "EXCLUSAO_CATEGORIA", {
      categoriaId: id.toString(),
      nome: categoria.nome
    });
  }

  private async validarNomeCategoriaDisponivel(nome: string, tenantId: string, idIgnorado?: bigint) {
    const filtroId = idIgnorado ? Prisma.sql`AND id <> ${idIgnorado}` : Prisma.empty;
    const rows = await prisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`
      SELECT COUNT(*)::BIGINT AS total
      FROM informacoes_administrativas_categorias
      WHERE tenant_id::text = ${tenantId}
        AND LOWER(TRIM(nome)) = LOWER(TRIM(${nome}))
        AND deletado_em IS NULL
        ${filtroId}
    `);

    if (Number(rows[0]?.total ?? 0) > 0) {
      throw new AppError("Ja existe uma categoria administrativa com este nome.", 409);
    }
  }

  async listar(tenantId: string) {
    await this.garantirEstrutura();
    return prisma.$queryRaw<InformacaoAdministrativaRow[]>(Prisma.sql`
      SELECT
        id,
        tenant_id::text AS tenant_id,
        categoria,
        titulo,
        descricao,
        usuario_acesso,
        senha_acesso,
        link,
        observacoes,
        criado_em,
        atualizado_em
      FROM informacoes_administrativas
      WHERE tenant_id::text = ${tenantId}
        AND deletado_em IS NULL
      ORDER BY atualizado_em DESC, id DESC
    `);
  }

  async buscarPorId(id: bigint, tenantId: string) {
    await this.garantirEstrutura();
    const rows = await prisma.$queryRaw<InformacaoAdministrativaRow[]>(Prisma.sql`
      SELECT
        id,
        tenant_id::text AS tenant_id,
        categoria,
        titulo,
        descricao,
        usuario_acesso,
        senha_acesso,
        link,
        observacoes,
        criado_em,
        atualizado_em
      FROM informacoes_administrativas
      WHERE id = ${id}
        AND tenant_id::text = ${tenantId}
        AND deletado_em IS NULL
      LIMIT 1
    `);

    return rows[0] ?? null;
  }

  async buscarPorIdOuFalhar(id: bigint, tenantId: string) {
    const registro = await this.buscarPorId(id, tenantId);
    if (!registro) {
      throw new AppError("Informacao administrativa nao encontrada.", 404);
    }
    return registro;
  }

  async criar(input: InformacaoAdministrativaInput, tenantId: string, usuarioId: bigint) {
    await this.garantirEstrutura();
    const rows = await prisma.$queryRaw<{ id: bigint }[]>(Prisma.sql`
      INSERT INTO informacoes_administrativas (
        tenant_id,
        categoria,
        titulo,
        descricao,
        usuario_acesso,
        senha_acesso,
        link,
        observacoes,
        criado_por,
        atualizado_por,
        criado_em,
        atualizado_em
      ) VALUES (
        CAST(${tenantId} AS UUID),
        ${input.categoria},
        ${input.titulo},
        ${input.descricao ?? null},
        ${input.usuarioAcesso ?? null},
        ${input.senhaAcesso ?? null},
        ${input.link ?? null},
        ${input.observacoes ?? null},
        ${usuarioId},
        ${usuarioId},
        NOW(),
        NOW()
      )
      RETURNING id
    `);

    const id = rows[0]?.id;
    if (!id) {
      throw new AppError("Nao foi possivel criar a informacao administrativa.", 500);
    }

    await this.registrarAuditoria(tenantId, id, usuarioId, "CRIACAO");
    return this.buscarPorIdOuFalhar(id, tenantId);
  }

  async atualizar(id: bigint, input: InformacaoAdministrativaInput, tenantId: string, usuarioId: bigint) {
    await this.garantirEstrutura();
    await this.buscarPorIdOuFalhar(id, tenantId);

    await prisma.$executeRaw(Prisma.sql`
      UPDATE informacoes_administrativas
      SET
        categoria = ${input.categoria},
        titulo = ${input.titulo},
        descricao = ${input.descricao ?? null},
        usuario_acesso = ${input.usuarioAcesso ?? null},
        senha_acesso = ${input.senhaAcesso ?? null},
        link = ${input.link ?? null},
        observacoes = ${input.observacoes ?? null},
        atualizado_por = ${usuarioId},
        atualizado_em = NOW()
      WHERE id = ${id}
        AND tenant_id::text = ${tenantId}
        AND deletado_em IS NULL
    `);

    await this.registrarAuditoria(tenantId, id, usuarioId, "ATUALIZACAO");
    return this.buscarPorIdOuFalhar(id, tenantId);
  }

  async remover(id: bigint, tenantId: string, usuarioId: bigint) {
    await this.garantirEstrutura();
    await this.buscarPorIdOuFalhar(id, tenantId);

    await prisma.$executeRaw(Prisma.sql`
      UPDATE informacoes_administrativas
      SET deletado_em = NOW(),
          atualizado_por = ${usuarioId},
          atualizado_em = NOW()
      WHERE id = ${id}
        AND tenant_id::text = ${tenantId}
        AND deletado_em IS NULL
    `);

    await this.registrarAuditoria(tenantId, id, usuarioId, "EXCLUSAO");
  }

  async registrarAuditoria(
    tenantId: string,
    informacaoId: bigint | null,
    usuarioId: bigint,
    acao: string,
    detalhes?: Record<string, unknown>
  ) {
    await this.garantirEstrutura();
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO informacoes_administrativas_auditoria (
        tenant_id,
        informacao_id,
        usuario_id,
        acao,
        detalhes_json,
        criado_em
      ) VALUES (
        CAST(${tenantId} AS UUID),
        ${informacaoId},
        ${usuarioId},
        ${acao},
        ${detalhes ? JSON.stringify(detalhes) : null}::jsonb,
        NOW()
      )
    `);
  }
}
