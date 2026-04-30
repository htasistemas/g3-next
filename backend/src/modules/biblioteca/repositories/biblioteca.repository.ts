import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { toOptionalDate } from "../../../utils/string-utils.js";
import type {
  BibliotecaEmprestimoInput,
  BibliotecaEmprestimoRow,
  BibliotecaLivroInput,
  BibliotecaLivroRow
} from "../biblioteca.types.js";

const estruturaSql = [
  `
  CREATE TABLE IF NOT EXISTS biblioteca_livro (
    id BIGSERIAL PRIMARY KEY,
    codigo TEXT NOT NULL UNIQUE,
    titulo TEXT NOT NULL,
    autor TEXT NOT NULL,
    isbn TEXT,
    capa_url TEXT,
    editora TEXT,
    ano_publicacao INTEGER,
    categoria TEXT,
    quantidade_total INTEGER NOT NULL DEFAULT 0,
    quantidade_disponivel INTEGER NOT NULL DEFAULT 0,
    localizacao TEXT,
    status TEXT NOT NULL DEFAULT 'ATIVO',
    estado_livro TEXT,
    observacoes TEXT,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
  )
  `,
  "ALTER TABLE biblioteca_livro ADD COLUMN IF NOT EXISTS capa_url TEXT",
  `
  CREATE TABLE IF NOT EXISTS biblioteca_emprestimo (
    id BIGSERIAL PRIMARY KEY,
    livro_id BIGINT NOT NULL REFERENCES biblioteca_livro(id) ON DELETE RESTRICT,
    beneficiario_id TEXT,
    beneficiario_nome TEXT,
    responsavel_id TEXT,
    responsavel_nome TEXT,
    data_emprestimo DATE NOT NULL,
    data_devolucao_prevista DATE NOT NULL,
    data_devolucao_real DATE,
    status TEXT NOT NULL DEFAULT 'ATIVO',
    observacoes TEXT,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
  )
  `,
  "CREATE INDEX IF NOT EXISTS biblioteca_emprestimo_livro_idx ON biblioteca_emprestimo(livro_id)",
  "CREATE INDEX IF NOT EXISTS biblioteca_emprestimo_status_idx ON biblioteca_emprestimo(status)"
];

let estruturaPromise: Promise<void> | null = null;

export async function ensureBibliotecaEstrutura() {
  if (!estruturaPromise) {
    estruturaPromise = (async () => {
      for (const comando of estruturaSql) {
        await prisma.$executeRawUnsafe(comando);
      }
    })();
  }

  await estruturaPromise;
}

export class BibliotecaRepository {
  private async garantirEstrutura() {
    await ensureBibliotecaEstrutura();
  }

  async listarLivros(tenantId: string) {
    await this.garantirEstrutura();
    return prisma.$queryRaw<BibliotecaLivroRow[]>(Prisma.sql`
      SELECT
        id,
        codigo,
        titulo,
        autor,
        isbn,
        capa_url,
        editora,
        ano_publicacao,
        categoria,
        quantidade_total,
        quantidade_disponivel,
        localizacao,
        status,
        estado_livro,
        observacoes,
        criado_em,
        atualizado_em
      FROM biblioteca_livro
      WHERE tenant_id::text = ${tenantId}
      ORDER BY titulo ASC, codigo ASC
    `);
  }

  async obterLivroPorId(id: bigint, tenantId: string) {
    await this.garantirEstrutura();
    const rows = await prisma.$queryRaw<BibliotecaLivroRow[]>(Prisma.sql`
      SELECT
        id,
        codigo,
        titulo,
        autor,
        isbn,
        capa_url,
        editora,
        ano_publicacao,
        categoria,
        quantidade_total,
        quantidade_disponivel,
        localizacao,
        status,
        estado_livro,
        observacoes,
        criado_em,
        atualizado_em
      FROM biblioteca_livro
      WHERE id = ${id}
        AND tenant_id::text = ${tenantId}
      LIMIT 1
    `);
    return rows[0] ?? null;
  }

  async obterLivroPorCodigo(codigo: string, tenantId: string) {
    await this.garantirEstrutura();
    const rows = await prisma.$queryRaw<BibliotecaLivroRow[]>(Prisma.sql`
      SELECT
        id,
        codigo,
        titulo,
        autor,
        isbn,
        capa_url,
        editora,
        ano_publicacao,
        categoria,
        quantidade_total,
        quantidade_disponivel,
        localizacao,
        status,
        estado_livro,
        observacoes,
        criado_em,
        atualizado_em
      FROM biblioteca_livro
      WHERE codigo = ${codigo}
        AND tenant_id::text = ${tenantId}
      LIMIT 1
    `);
    return rows[0] ?? null;
  }

  async obterLivroOuFalhar(id: bigint, tenantId: string) {
    const livro = await this.obterLivroPorId(id, tenantId);
    if (!livro) throw new AppError("Livro nao encontrado.", 404);
    return livro;
  }

  async obterProximoCodigo(tenantId: string) {
    await this.garantirEstrutura();
    const rows = await prisma.$queryRaw<Array<{ proximo: number }>>(Prisma.sql`
      SELECT COALESCE(MAX(CAST(codigo AS INTEGER)), 0) + 1 AS proximo
      FROM biblioteca_livro
      WHERE codigo ~ '^[0-9]+$'
        AND tenant_id::text = ${tenantId}
    `);
    const proximo = rows[0]?.proximo ?? 1;
    return String(proximo).padStart(5, "0");
  }

  async criarLivro(input: BibliotecaLivroInput, tenantId: string) {
    await this.garantirEstrutura();

    const inserted = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
      INSERT INTO biblioteca_livro (
        tenant_id,
        codigo,
        titulo,
        autor,
        isbn,
        capa_url,
        editora,
        ano_publicacao,
        categoria,
        quantidade_total,
        quantidade_disponivel,
        localizacao,
        status,
        estado_livro,
        observacoes,
        criado_em,
        atualizado_em
      ) VALUES (
        ${tenantId}::uuid,
        ${input.codigo},
        ${input.titulo},
        ${input.autor},
        ${input.isbn ?? null},
        ${input.capaUrl ?? null},
        ${input.editora ?? null},
        ${input.anoPublicacao ?? null},
        ${input.categoria ?? null},
        ${input.quantidadeTotal},
        ${input.quantidadeDisponivel},
        ${input.localizacao ?? null},
        ${input.status},
        ${input.estadoLivro ?? null},
        ${input.observacoes ?? null},
        NOW(),
        NOW()
      )
      RETURNING id
    `);

    const id = inserted[0]?.id;
    if (!id) throw new AppError("Nao foi possivel criar livro.", 500);
    return this.obterLivroOuFalhar(id, tenantId);
  }

  async atualizarLivro(id: bigint, input: BibliotecaLivroInput, tenantId: string) {
    await this.garantirEstrutura();
    await this.obterLivroOuFalhar(id, tenantId);

    await prisma.$executeRaw(Prisma.sql`
      UPDATE biblioteca_livro
      SET
        codigo = ${input.codigo},
        titulo = ${input.titulo},
        autor = ${input.autor},
        isbn = ${input.isbn ?? null},
        capa_url = ${input.capaUrl ?? null},
        editora = ${input.editora ?? null},
        ano_publicacao = ${input.anoPublicacao ?? null},
        categoria = ${input.categoria ?? null},
        quantidade_total = ${input.quantidadeTotal},
        quantidade_disponivel = ${input.quantidadeDisponivel},
        localizacao = ${input.localizacao ?? null},
        status = ${input.status},
        estado_livro = ${input.estadoLivro ?? null},
        observacoes = ${input.observacoes ?? null},
        atualizado_em = NOW()
      WHERE id = ${id}
        AND tenant_id::text = ${tenantId}
    `);

    return this.obterLivroOuFalhar(id, tenantId);
  }

  async removerLivro(id: bigint, tenantId: string) {
    await this.garantirEstrutura();
    await this.obterLivroOuFalhar(id, tenantId);

    const emprestimosAtivos = await prisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`
      SELECT COUNT(*)::bigint AS total
      FROM biblioteca_emprestimo
      WHERE livro_id = ${id}
        AND tenant_id::text = ${tenantId}
        AND status IN ('ATIVO', 'ATRASADO')
    `);

    if (Number(emprestimosAtivos[0]?.total ?? 0) > 0) {
      throw new AppError("Nao e possivel excluir livro com emprestimos ativos.", 400);
    }

    await prisma.$executeRaw(Prisma.sql`
      DELETE FROM biblioteca_livro
      WHERE id = ${id}
        AND tenant_id::text = ${tenantId}
    `);
  }

  async listarEmprestimos(tenantId: string) {
    await this.garantirEstrutura();
    return prisma.$queryRaw<BibliotecaEmprestimoRow[]>(Prisma.sql`
      SELECT
        e.id,
        e.livro_id,
        l.titulo AS livro_titulo,
        l.codigo AS livro_codigo,
        e.beneficiario_id,
        e.beneficiario_nome,
        e.responsavel_id,
        e.responsavel_nome,
        e.data_emprestimo,
        e.data_devolucao_prevista,
        e.data_devolucao_real,
        e.status,
        e.observacoes
      FROM biblioteca_emprestimo e
      INNER JOIN biblioteca_livro l ON l.id = e.livro_id
      WHERE e.tenant_id::text = ${tenantId}
      ORDER BY e.data_emprestimo DESC, e.id DESC
    `);
  }

  async obterEmprestimoPorId(id: bigint, tenantId: string) {
    await this.garantirEstrutura();
    const rows = await prisma.$queryRaw<BibliotecaEmprestimoRow[]>(Prisma.sql`
      SELECT
        e.id,
        e.livro_id,
        l.titulo AS livro_titulo,
        l.codigo AS livro_codigo,
        e.beneficiario_id,
        e.beneficiario_nome,
        e.responsavel_id,
        e.responsavel_nome,
        e.data_emprestimo,
        e.data_devolucao_prevista,
        e.data_devolucao_real,
        e.status,
        e.observacoes
      FROM biblioteca_emprestimo e
      INNER JOIN biblioteca_livro l ON l.id = e.livro_id
      WHERE e.id = ${id}
        AND e.tenant_id::text = ${tenantId}
      LIMIT 1
    `);
    return rows[0] ?? null;
  }

  async obterEmprestimoOuFalhar(id: bigint, tenantId: string) {
    const emprestimo = await this.obterEmprestimoPorId(id, tenantId);
    if (!emprestimo) throw new AppError("Emprestimo nao encontrado.", 404);
    return emprestimo;
  }

  async criarEmprestimo(input: BibliotecaEmprestimoInput, tenantId: string) {
    await this.garantirEstrutura();
    return prisma.$transaction(async (tx) => {
      const livroId = BigInt(Number(input.livroId));
      const livroRows = await tx.$queryRaw<BibliotecaLivroRow[]>(Prisma.sql`
        SELECT
          id,
          codigo,
          titulo,
          autor,
          isbn,
          capa_url,
          editora,
          ano_publicacao,
          categoria,
          quantidade_total,
          quantidade_disponivel,
          localizacao,
          status,
          estado_livro,
          observacoes,
          criado_em,
          atualizado_em
        FROM biblioteca_livro
        WHERE id = ${livroId}
          AND tenant_id::text = ${tenantId}
        LIMIT 1
      `);
      const livro = livroRows[0];
      if (!livro) throw new AppError("Livro nao encontrado.", 404);
      if (Number(livro.quantidade_disponivel) <= 0) {
        throw new AppError("Nao ha exemplares disponiveis para emprestimo.", 400);
      }

      const inserted = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
        INSERT INTO biblioteca_emprestimo (
          tenant_id,
          livro_id,
          beneficiario_id,
          beneficiario_nome,
          responsavel_id,
          responsavel_nome,
          data_emprestimo,
          data_devolucao_prevista,
          data_devolucao_real,
          status,
          observacoes,
          criado_em,
          atualizado_em
        ) VALUES (
          ${tenantId}::uuid,
          ${livroId},
          ${input.beneficiarioId ?? null},
          ${input.beneficiarioNome ?? null},
          ${input.responsavelId ?? null},
          ${input.responsavelNome ?? null},
          ${toOptionalDate(input.dataEmprestimo)},
          ${toOptionalDate(input.dataDevolucaoPrevista)},
          ${toOptionalDate(input.dataDevolucaoReal ?? undefined)},
          ${input.status ?? "ATIVO"},
          ${input.observacoes ?? null},
          NOW(),
          NOW()
        )
        RETURNING id
      `);

      await tx.$executeRaw(Prisma.sql`
        UPDATE biblioteca_livro
        SET
          quantidade_disponivel = GREATEST(quantidade_disponivel - 1, 0),
          atualizado_em = NOW()
        WHERE id = ${livroId}
      `);

      const emprestimoId = inserted[0]?.id;
      if (!emprestimoId) throw new AppError("Nao foi possivel criar emprestimo.", 500);

      const rows = await tx.$queryRaw<BibliotecaEmprestimoRow[]>(Prisma.sql`
        SELECT
          e.id,
          e.livro_id,
          l.titulo AS livro_titulo,
          l.codigo AS livro_codigo,
          e.beneficiario_id,
          e.beneficiario_nome,
          e.responsavel_id,
          e.responsavel_nome,
          e.data_emprestimo,
          e.data_devolucao_prevista,
          e.data_devolucao_real,
          e.status,
          e.observacoes
        FROM biblioteca_emprestimo e
        INNER JOIN biblioteca_livro l ON l.id = e.livro_id
        WHERE e.id = ${emprestimoId}
          AND e.tenant_id::text = ${tenantId}
        LIMIT 1
      `);
      return rows[0] as BibliotecaEmprestimoRow;
    });
  }

  async atualizarEmprestimo(id: bigint, input: BibliotecaEmprestimoInput, tenantId: string) {
    await this.garantirEstrutura();
    const atual = await this.obterEmprestimoOuFalhar(id, tenantId);
    const novoLivroId = BigInt(Number(input.livroId));

    return prisma.$transaction(async (tx) => {
      if (novoLivroId !== atual.livro_id) {
        await tx.$executeRaw(Prisma.sql`
          UPDATE biblioteca_livro
          SET quantidade_disponivel = quantidade_disponivel + 1, atualizado_em = NOW()
          WHERE id = ${atual.livro_id}
        `);
        await tx.$executeRaw(Prisma.sql`
          UPDATE biblioteca_livro
          SET quantidade_disponivel = GREATEST(quantidade_disponivel - 1, 0), atualizado_em = NOW()
          WHERE id = ${novoLivroId}
        `);
      }

      await tx.$executeRaw(Prisma.sql`
        UPDATE biblioteca_emprestimo
        SET
          livro_id = ${novoLivroId},
          beneficiario_id = ${input.beneficiarioId ?? null},
          beneficiario_nome = ${input.beneficiarioNome ?? null},
          responsavel_id = ${input.responsavelId ?? null},
          responsavel_nome = ${input.responsavelNome ?? null},
          data_emprestimo = ${toOptionalDate(input.dataEmprestimo)},
          data_devolucao_prevista = ${toOptionalDate(input.dataDevolucaoPrevista)},
          data_devolucao_real = ${toOptionalDate(input.dataDevolucaoReal ?? undefined)},
          status = ${input.status ?? "ATIVO"},
          observacoes = ${input.observacoes ?? null},
          atualizado_em = NOW()
        WHERE id = ${id}
          AND tenant_id::text = ${tenantId}
      `);

      const rows = await tx.$queryRaw<BibliotecaEmprestimoRow[]>(Prisma.sql`
        SELECT
          e.id,
          e.livro_id,
          l.titulo AS livro_titulo,
          l.codigo AS livro_codigo,
          e.beneficiario_id,
          e.beneficiario_nome,
          e.responsavel_id,
          e.responsavel_nome,
          e.data_emprestimo,
          e.data_devolucao_prevista,
          e.data_devolucao_real,
          e.status,
          e.observacoes
        FROM biblioteca_emprestimo e
        INNER JOIN biblioteca_livro l ON l.id = e.livro_id
        WHERE e.id = ${id}
          AND e.tenant_id::text = ${tenantId}
        LIMIT 1
      `);
      return rows[0] as BibliotecaEmprestimoRow;
    });
  }

  async removerEmprestimo(id: bigint, tenantId: string) {
    await this.garantirEstrutura();
    const emprestimo = await this.obterEmprestimoOuFalhar(id, tenantId);

    await prisma.$transaction(async (tx) => {
      if (emprestimo.status !== "DEVOLVIDO") {
        await tx.$executeRaw(Prisma.sql`
          UPDATE biblioteca_livro
          SET quantidade_disponivel = quantidade_disponivel + 1, atualizado_em = NOW()
          WHERE id = ${emprestimo.livro_id}
        `);
      }

      await tx.$executeRaw(Prisma.sql`
        DELETE FROM biblioteca_emprestimo
        WHERE id = ${id}
          AND tenant_id::text = ${tenantId}
      `);
    });
  }

  async registrarDevolucao(id: bigint, dataDevolucaoReal: string, tenantId: string) {
    await this.garantirEstrutura();
    const emprestimo = await this.obterEmprestimoOuFalhar(id, tenantId);

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`
        UPDATE biblioteca_emprestimo
        SET
          data_devolucao_real = ${toOptionalDate(dataDevolucaoReal)},
          status = 'DEVOLVIDO',
          atualizado_em = NOW()
        WHERE id = ${id}
          AND tenant_id::text = ${tenantId}
      `);

      if (emprestimo.status !== "DEVOLVIDO") {
        await tx.$executeRaw(Prisma.sql`
          UPDATE biblioteca_livro
          SET quantidade_disponivel = quantidade_disponivel + 1, atualizado_em = NOW()
          WHERE id = ${emprestimo.livro_id}
        `);
      }
    });

    return this.obterEmprestimoOuFalhar(id, tenantId);
  }

  async listarAlertas(tenantId: string) {
    await this.garantirEstrutura();
    return prisma.$queryRaw<Array<{
      emprestimo_id: bigint;
      livro_titulo: string;
      beneficiario_nome: string | null;
      data_devolucao_prevista: Date;
      dias_para_vencimento: number;
      status_alerta: string;
    }>>(Prisma.sql`
      SELECT
        e.id AS emprestimo_id,
        l.titulo AS livro_titulo,
        e.beneficiario_nome,
        e.data_devolucao_prevista,
        (e.data_devolucao_prevista - CURRENT_DATE) AS dias_para_vencimento,
        CASE
          WHEN e.data_devolucao_prevista < CURRENT_DATE THEN 'ATRASADO'
          WHEN e.data_devolucao_prevista <= (CURRENT_DATE + INTERVAL '3 days') THEN 'VENCENDO'
          ELSE 'EM_DIA'
        END AS status_alerta
      FROM biblioteca_emprestimo e
      INNER JOIN biblioteca_livro l ON l.id = e.livro_id
      WHERE e.status IN ('ATIVO', 'ATRASADO')
        AND e.tenant_id::text = ${tenantId}
      ORDER BY e.data_devolucao_prevista ASC
    `);
  }
}
