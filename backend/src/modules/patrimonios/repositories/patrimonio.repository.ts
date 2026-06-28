import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { toOptionalDate, trimOrUndefined } from "../../../utils/string-utils.js";
import type {
  PatrimonioCategoriaInput,
  PatrimonioCategoriaRow,
  PatrimonioInput,
  PatrimonioMovimentoInput,
  PatrimonioMovimentoRow,
  PatrimonioRow
} from "../patrimonio.types.js";

type TransactionClient = Prisma.TransactionClient;

const estruturaSql = [
  "ALTER TABLE patrimonio_item ADD COLUMN IF NOT EXISTS tenant_id UUID",
  "ALTER TABLE IF EXISTS patrimonio_movimentacao ADD COLUMN IF NOT EXISTS tenant_id UUID",
  "ALTER TABLE patrimonio_item ADD COLUMN IF NOT EXISTS unidade_id BIGINT",
  "CREATE INDEX IF NOT EXISTS patrimonio_item_tenant_idx ON patrimonio_item(tenant_id, nome, id DESC)",
  "CREATE INDEX IF NOT EXISTS patrimonio_item_numero_tenant_idx ON patrimonio_item(tenant_id, numero_patrimonio)",
  "CREATE INDEX IF NOT EXISTS patrimonio_item_unidade_tenant_idx ON patrimonio_item(tenant_id, unidade_id, numero_patrimonio)",
  "CREATE UNIQUE INDEX IF NOT EXISTS patrimonio_item_numero_unidade_uidx ON patrimonio_item(tenant_id, unidade_id, numero_patrimonio) WHERE unidade_id IS NOT NULL",
  "CREATE INDEX IF NOT EXISTS patrimonio_movimentacao_tenant_idx ON patrimonio_movimentacao(tenant_id, patrimonio_id, data_movimento DESC)",
  `CREATE TABLE IF NOT EXISTS patrimonio_categoria (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    nome VARCHAR(160) NOT NULL,
    taxa_depreciacao NUMERIC(5,2),
    subcategorias JSONB NOT NULL DEFAULT '[]'::jsonb,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
  "CREATE UNIQUE INDEX IF NOT EXISTS patrimonio_categoria_nome_tenant_idx ON patrimonio_categoria(tenant_id, lower(trim(nome)))",
  `
    UPDATE patrimonio_item AS p
    SET tenant_id = ref.tenant_id
    FROM (
      SELECT tenant_id
      FROM instituicoes
      ORDER BY criado_em ASC
      LIMIT 1
    ) ref
    WHERE p.tenant_id IS NULL
  `,
  `
    UPDATE patrimonio_item AS p
    SET unidade_id = u.id
    FROM unidade_assistencial u
    WHERE p.unidade_id IS NULL
      AND p.tenant_id::text = u.tenant_id::text
      AND (
        LOWER(TRIM(COALESCE(p.unidade, ''))) = LOWER(TRIM(COALESCE(u.nome_fantasia, '')))
        OR LOWER(TRIM(COALESCE(p.unidade, ''))) = LOWER(TRIM(COALESCE(u.razao_social, '')))
      )
  `,
  `
    UPDATE patrimonio_movimentacao AS m
    SET tenant_id = p.tenant_id
    FROM patrimonio_item p
    WHERE m.tenant_id IS NULL
      AND p.id = m.patrimonio_id
      AND p.tenant_id IS NOT NULL
  `
] as const;

let estruturaPromise: Promise<void> | null = null;

export class PatrimonioRepository {
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

  async listar(tenantId: string) {
    await this.garantirEstrutura();
    const patrimonios = await prisma.$queryRaw<PatrimonioRow[]>(Prisma.sql`
      SELECT
        p.id,
        p.numero_patrimonio,
        p.nome,
        p.categoria,
        p.subcategoria,
        p.conservacao,
        p.status,
        p.data_aquisicao,
        p.valor_aquisicao::float8 AS valor_aquisicao,
        p.origem,
        p.responsavel,
        p.unidade_id,
        COALESCE(u.nome_fantasia, p.unidade) AS unidade,
        p.sala,
        p.taxa_depreciacao::float8 AS taxa_depreciacao,
        p.observacoes,
        p.criado_em,
        p.atualizado_em
      FROM patrimonio_item p
      LEFT JOIN unidade_assistencial u
        ON u.id = p.unidade_id
       AND (p.tenant_id IS NULL OR u.tenant_id::text = p.tenant_id)
      WHERE COALESCE(p.tenant_id::text, u.tenant_id::text) = ${tenantId}
      ORDER BY p.nome ASC, p.id DESC
    `);

    const movimentos = await prisma.$queryRaw<PatrimonioMovimentoRow[]>(Prisma.sql`
      SELECT
        id,
        patrimonio_id,
        tipo,
        destino,
        responsavel,
        observacao,
        data_movimento
      FROM patrimonio_movimentacao
      WHERE tenant_id::text = ${tenantId}
      ORDER BY data_movimento DESC, id DESC
    `);

    return patrimonios.map((patrimonio) => ({
      patrimonio,
      movimentos: movimentos.filter((movimento) => movimento.patrimonio_id === patrimonio.id)
    }));
  }

  async listarCategorias(tenantId: string) {
    await this.garantirEstrutura();
    await this.semearCategoriasPadrao(tenantId);

    return prisma.$queryRaw<PatrimonioCategoriaRow[]>(Prisma.sql`
      SELECT
        id,
        tenant_id::text AS tenant_id,
        nome,
        taxa_depreciacao::float8 AS taxa_depreciacao,
        subcategorias,
        ativo,
        criado_em,
        atualizado_em
      FROM patrimonio_categoria
      WHERE tenant_id::text = ${tenantId}
      ORDER BY nome ASC
    `);
  }

  async criarCategoria(input: PatrimonioCategoriaInput, tenantId: string) {
    await this.garantirEstrutura();
    await this.validarCategoriaUnica(input.nome, tenantId);

    const rows = await prisma.$queryRaw<PatrimonioCategoriaRow[]>(Prisma.sql`
      INSERT INTO patrimonio_categoria (
        tenant_id,
        nome,
        taxa_depreciacao,
        subcategorias,
        ativo,
        criado_em,
        atualizado_em
      ) VALUES (
        CAST(${tenantId} AS UUID),
        ${input.nome.trim()},
        ${input.taxaDepreciacao ?? null},
        ${JSON.stringify(this.normalizarSubcategorias(input.subcategorias))}::jsonb,
        ${input.ativo ?? true},
        NOW(),
        NOW()
      )
      RETURNING
        id,
        tenant_id::text AS tenant_id,
        nome,
        taxa_depreciacao::float8 AS taxa_depreciacao,
        subcategorias,
        ativo,
        criado_em,
        atualizado_em
    `);

    return rows[0];
  }

  async atualizarCategoria(id: bigint, input: PatrimonioCategoriaInput, tenantId: string) {
    await this.garantirEstrutura();
    await this.buscarCategoriaOuFalhar(id, tenantId);
    await this.validarCategoriaUnica(input.nome, tenantId, id);

    const rows = await prisma.$queryRaw<PatrimonioCategoriaRow[]>(Prisma.sql`
      UPDATE patrimonio_categoria
      SET
        nome = ${input.nome.trim()},
        taxa_depreciacao = ${input.taxaDepreciacao ?? null},
        subcategorias = ${JSON.stringify(this.normalizarSubcategorias(input.subcategorias))}::jsonb,
        ativo = ${input.ativo ?? true},
        atualizado_em = NOW()
      WHERE id = ${id}
        AND tenant_id::text = ${tenantId}
      RETURNING
        id,
        tenant_id::text AS tenant_id,
        nome,
        taxa_depreciacao::float8 AS taxa_depreciacao,
        subcategorias,
        ativo,
        criado_em,
        atualizado_em
    `);

    return rows[0];
  }

  async removerCategoria(id: bigint, tenantId: string) {
    await this.garantirEstrutura();
    const categoria = await this.buscarCategoriaOuFalhar(id, tenantId);
    const usos = await prisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`
      SELECT COUNT(*)::bigint AS total
      FROM patrimonio_item
      WHERE tenant_id::text = ${tenantId}
        AND lower(trim(coalesce(categoria, ''))) = lower(trim(${categoria.nome}))
    `);

    if (Number(usos[0]?.total ?? 0) > 0) {
      throw new AppError("Categoria possui bens vinculados. Inative ou edite a categoria em vez de excluir.", 409);
    }

    await prisma.$executeRaw(Prisma.sql`
      DELETE FROM patrimonio_categoria
      WHERE id = ${id}
        AND tenant_id::text = ${tenantId}
    `);
  }

  async buscarPorId(id: bigint, tenantId: string) {
    await this.garantirEstrutura();
    const rows = await prisma.$queryRaw<PatrimonioRow[]>(Prisma.sql`
      SELECT
        p.id,
        p.numero_patrimonio,
        p.nome,
        p.categoria,
        p.subcategoria,
        p.conservacao,
        p.status,
        p.data_aquisicao,
        p.valor_aquisicao::float8 AS valor_aquisicao,
        p.origem,
        p.responsavel,
        p.unidade_id,
        COALESCE(u.nome_fantasia, p.unidade) AS unidade,
        p.sala,
        p.taxa_depreciacao::float8 AS taxa_depreciacao,
        p.observacoes,
        p.criado_em,
        p.atualizado_em
      FROM patrimonio_item p
      LEFT JOIN unidade_assistencial u
        ON u.id = p.unidade_id
       AND (p.tenant_id IS NULL OR u.tenant_id::text = p.tenant_id)
      WHERE p.id = ${id}
        AND COALESCE(p.tenant_id::text, u.tenant_id::text) = ${tenantId}
      LIMIT 1
    `);

    const patrimonio = rows[0];
    if (!patrimonio) return null;

    const movimentos = await prisma.$queryRaw<PatrimonioMovimentoRow[]>(Prisma.sql`
      SELECT
        id,
        patrimonio_id,
        tipo,
        destino,
        responsavel,
        observacao,
        data_movimento
      FROM patrimonio_movimentacao
      WHERE patrimonio_id = ${id}
        AND tenant_id::text = ${tenantId}
      ORDER BY data_movimento DESC, id DESC
    `);

    return { patrimonio, movimentos };
  }

  async buscarPorIdOuFalhar(id: bigint, tenantId: string) {
    const registro = await this.buscarPorId(id, tenantId);
    if (!registro) {
      throw new AppError("Patrimonio nao encontrado.", 404);
    }
    return registro;
  }

  async criar(input: PatrimonioInput, tenantId: string) {
    await this.garantirEstrutura();
    const id = await prisma.$transaction(async (tx) => {
      const unidade = await this.resolverUnidade(tx, input, tenantId);
      await this.validarNumeroUnico(tx, input.numeroPatrimonio, unidade, tenantId);
      const inserted = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
        INSERT INTO patrimonio_item (
          tenant_id,
          unidade_id,
          numero_patrimonio,
          nome,
          categoria,
          subcategoria,
          conservacao,
          status,
          data_aquisicao,
          valor_aquisicao,
          origem,
          responsavel,
          unidade,
          sala,
          taxa_depreciacao,
          observacoes,
          criado_em,
          atualizado_em
        ) VALUES (
          CAST(${tenantId} AS UUID),
          ${unidade.id},
          ${input.numeroPatrimonio},
          ${input.nome},
          ${trimOrUndefined(input.categoria)},
          ${trimOrUndefined(input.subcategoria)},
          ${trimOrUndefined(input.conservacao)},
          ${trimOrUndefined(input.status)},
          ${toOptionalDate(input.dataAquisicao)},
          ${input.valorAquisicao ?? null},
          ${trimOrUndefined(input.origem)},
          ${trimOrUndefined(input.responsavel)},
          ${unidade.nome},
          ${trimOrUndefined(input.sala)},
          ${input.taxaDepreciacao ?? null},
          ${trimOrUndefined(input.observacoes)},
          NOW(),
          NOW()
        )
        RETURNING id
      `);

      const patrimonioId = inserted[0]?.id;
      if (!patrimonioId) {
        throw new AppError("Nao foi possivel criar o patrimonio.", 500);
      }

      return patrimonioId;
    });

    return this.buscarPorIdOuFalhar(id, tenantId);
  }

  async atualizar(id: bigint, input: PatrimonioInput, tenantId: string) {
    await this.garantirEstrutura();
    await this.buscarPorIdOuFalhar(id, tenantId);

    await prisma.$transaction(async (tx) => {
      const unidade = await this.resolverUnidade(tx, input, tenantId);
      await this.validarNumeroUnico(tx, input.numeroPatrimonio, unidade, tenantId, id);
      await tx.$executeRaw(Prisma.sql`
        UPDATE patrimonio_item
        SET
          unidade_id = ${unidade.id},
          numero_patrimonio = ${input.numeroPatrimonio},
          nome = ${input.nome},
          categoria = ${trimOrUndefined(input.categoria)},
          subcategoria = ${trimOrUndefined(input.subcategoria)},
          conservacao = ${trimOrUndefined(input.conservacao)},
          status = ${trimOrUndefined(input.status)},
          data_aquisicao = ${toOptionalDate(input.dataAquisicao)},
          valor_aquisicao = ${input.valorAquisicao ?? null},
          origem = ${trimOrUndefined(input.origem)},
          responsavel = ${trimOrUndefined(input.responsavel)},
          unidade = ${unidade.nome},
          sala = ${trimOrUndefined(input.sala)},
          taxa_depreciacao = ${input.taxaDepreciacao ?? null},
          observacoes = ${trimOrUndefined(input.observacoes)},
          atualizado_em = NOW()
        WHERE id = ${id}
          AND tenant_id::text = ${tenantId}
      `);
    });

    return this.buscarPorIdOuFalhar(id, tenantId);
  }

  async registrarMovimento(id: bigint, input: PatrimonioMovimentoInput, tenantId: string) {
    await this.garantirEstrutura();
    await this.buscarPorIdOuFalhar(id, tenantId);

    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO patrimonio_movimentacao (
        tenant_id,
        patrimonio_id,
        tipo,
        destino,
        responsavel,
        observacao,
        data_movimento,
        criado_em
      ) VALUES (
        CAST(${tenantId} AS UUID),
        ${id},
        ${input.tipo},
        ${trimOrUndefined(input.destino)},
        ${trimOrUndefined(input.responsavel)},
        ${trimOrUndefined(input.observacao)},
        ${toOptionalDate(input.dataMovimento) ?? new Date()},
        NOW()
      )
    `);

    await prisma.$executeRaw(Prisma.sql`
      UPDATE patrimonio_item
      SET
        status = CASE
          WHEN ${input.tipo} = 'BAIXA' THEN 'Baixado'
          ELSE status
        END,
        atualizado_em = NOW()
      WHERE id = ${id}
        AND tenant_id::text = ${tenantId}
    `);

    return this.buscarPorIdOuFalhar(id, tenantId);
  }

  private async validarNumeroUnico(
    tx: TransactionClient,
    numeroPatrimonio: string,
    unidade: { id: bigint; nome: string },
    tenantId: string,
    idAtual?: bigint
  ) {
    const rows = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
      SELECT id
      FROM patrimonio_item
      WHERE tenant_id::text = ${tenantId}
        AND numero_patrimonio = ${numeroPatrimonio}
        AND (
          unidade_id = ${unidade.id}
          OR (
            unidade_id IS NULL
            AND lower(trim(coalesce(unidade, ''))) = lower(trim(${unidade.nome}))
          )
        )
      ${idAtual ? Prisma.sql`AND id <> ${idAtual}` : Prisma.empty}
      LIMIT 1
    `);

    if (rows.length) {
      throw new AppError("Ja existe patrimonio com este numero nesta unidade.", 409);
    }
  }

  private async resolverUnidade(
    tx: TransactionClient,
    input: PatrimonioInput,
    tenantId: string
  ): Promise<{ id: bigint; nome: string }> {
    const unidadeId = this.parseOptionalBigInt(input.unidadeId);

    if (unidadeId) {
      const rows = await tx.$queryRaw<Array<{ id: bigint; nome_fantasia: string | null; razao_social: string | null }>>(Prisma.sql`
        SELECT id, nome_fantasia, razao_social
        FROM unidade_assistencial
        WHERE id = ${unidadeId}
          AND tenant_id::text = ${tenantId}
        LIMIT 1
      `);

      const unidade = rows[0];
      if (!unidade) {
        throw new AppError("A unidade informada não pertence à instituição autenticada.", 400);
      }

      return {
        id: unidade.id,
        nome: unidade.nome_fantasia ?? unidade.razao_social ?? trimOrUndefined(input.unidade) ?? ""
      };
    }

    const nome = trimOrUndefined(input.unidade);
    if (!nome) {
      throw new AppError("Selecione a unidade do patrimônio.", 400);
    }

    const rows = await tx.$queryRaw<Array<{ id: bigint; nome_fantasia: string | null; razao_social: string | null }>>(Prisma.sql`
      SELECT id, nome_fantasia, razao_social
      FROM unidade_assistencial
      WHERE tenant_id::text = ${tenantId}
        AND (
          lower(trim(coalesce(nome_fantasia, ''))) = lower(trim(${nome}))
          OR lower(trim(coalesce(razao_social, ''))) = lower(trim(${nome}))
        )
      ORDER BY unidade_principal DESC, atualizado_em DESC, criado_em ASC
      LIMIT 1
    `);

    const unidade = rows[0];
    if (!unidade) {
      throw new AppError("Selecione uma unidade válida para o patrimônio.", 400);
    }

    return {
      id: unidade.id,
      nome: unidade.nome_fantasia ?? unidade.razao_social ?? nome
    };
  }

  private parseOptionalBigInt(value?: string) {
    const texto = trimOrUndefined(value);
    if (!texto) return undefined;
    try {
      return BigInt(texto);
    } catch {
      return undefined;
    }
  }

  private normalizarSubcategorias(subcategorias?: string[]) {
    const nomes = new Set<string>();
    const resultado: string[] = [];
    for (const subcategoria of subcategorias ?? []) {
      const nome = trimOrUndefined(subcategoria);
      if (!nome) continue;
      const chave = nome.toLocaleLowerCase("pt-BR");
      if (nomes.has(chave)) continue;
      nomes.add(chave);
      resultado.push(nome);
    }
    return resultado;
  }

  private async buscarCategoriaOuFalhar(id: bigint, tenantId: string) {
    const rows = await prisma.$queryRaw<PatrimonioCategoriaRow[]>(Prisma.sql`
      SELECT
        id,
        tenant_id::text AS tenant_id,
        nome,
        taxa_depreciacao::float8 AS taxa_depreciacao,
        subcategorias,
        ativo,
        criado_em,
        atualizado_em
      FROM patrimonio_categoria
      WHERE id = ${id}
        AND tenant_id::text = ${tenantId}
      LIMIT 1
    `);

    if (!rows[0]) {
      throw new AppError("Categoria patrimonial nao encontrada.", 404);
    }
    return rows[0];
  }

  private async validarCategoriaUnica(nome: string, tenantId: string, idAtual?: bigint) {
    const rows = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
      SELECT id
      FROM patrimonio_categoria
      WHERE tenant_id::text = ${tenantId}
        AND lower(trim(nome)) = lower(trim(${nome}))
        ${idAtual ? Prisma.sql`AND id <> ${idAtual}` : Prisma.empty}
      LIMIT 1
    `);

    if (rows[0]) {
      throw new AppError("Categoria ja cadastrada. Edite a categoria existente para evitar duplicidade.", 409);
    }
  }

  private async semearCategoriasPadrao(tenantId: string) {
    const rows = await prisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`
      SELECT COUNT(*)::bigint AS total
      FROM patrimonio_categoria
      WHERE tenant_id::text = ${tenantId}
    `);

    if (Number(rows[0]?.total ?? 0) > 0) return;

    const categorias = [
      { nome: "Equipamentos de informática", taxa: 10, subcategorias: ["Computadores", "Notebooks", "Impressoras", "Periféricos"] },
      { nome: "Mobiliário", taxa: 10, subcategorias: ["Mesas", "Cadeiras", "Armários", "Estantes"] },
      { nome: "Eletrodomésticos", taxa: 10, subcategorias: ["Refrigeradores", "Fogões", "Bebedouros", "Micro-ondas"] },
      { nome: "Telefonia", taxa: 20, subcategorias: ["Celulares", "Telefones fixos", "Centrais telefônicas"] },
      { nome: "Veículos", taxa: 20, subcategorias: ["Carros", "Motos", "Utilitários"] },
      { nome: "Instrumentos", taxa: 10, subcategorias: ["Musicais", "Técnicos", "Medição"] },
      { nome: "Máquinas", taxa: 10, subcategorias: ["Máquinas operacionais", "Equipamentos elétricos"] },
      { nome: "Material permanente", taxa: 10, subcategorias: ["Utensílios", "Equipamentos permanentes"] },
      { nome: "Imóveis e construções", taxa: 4, subcategorias: ["Edificações", "Benfeitorias"] },
      { nome: "Outros", taxa: 10, subcategorias: ["Diversos"] }
    ];

    for (const categoria of categorias) {
      await prisma.$executeRaw(Prisma.sql`
        INSERT INTO patrimonio_categoria (
          tenant_id,
          nome,
          taxa_depreciacao,
          subcategorias,
          ativo,
          criado_em,
          atualizado_em
        ) VALUES (
          CAST(${tenantId} AS UUID),
          ${categoria.nome},
          ${categoria.taxa},
          ${JSON.stringify(categoria.subcategorias)}::jsonb,
          TRUE,
          NOW(),
          NOW()
        )
        ON CONFLICT DO NOTHING
      `);
    }
  }
}
