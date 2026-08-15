import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { ensureArquivosEstrutura } from "./arquivos-estrutura.repository.js";
export class ArquivosRepository {
    montarClausulaTenantLegado(tenantId) {
        return Prisma.sql `
      OR (
        tenant_id IS NULL
        AND (
          (
            entidade_tipo = 'beneficiario'
            AND EXISTS (
              SELECT 1
              FROM cadastro_beneficiario b
              WHERE b.id = arquivos.entidade_id
                AND b.tenant_id::text = ${tenantId}
            )
          )
          OR (
            entidade_tipo IN ('instituicao', 'unidade_assistencial')
            AND EXISTS (
              SELECT 1
              FROM unidade_assistencial u
              WHERE u.id = arquivos.entidade_id
                AND u.tenant_id::text = ${tenantId}
            )
          )
          OR (
            entidade_tipo = 'instituicao'
            AND EXISTS (
              SELECT 1
              FROM documentos_instituicao d
              WHERE d.id = arquivos.entidade_id
                AND d.tenant_id::text = ${tenantId}
            )
          )
        )
      )
    `;
    }
    async criar(input) {
        await ensureArquivosEstrutura(prisma);
        const usuarioUploadId = await this.resolverUsuarioUploadId(input.usuarioUploadId ?? undefined);
        const rows = await prisma.$queryRaw(Prisma.sql `
      INSERT INTO arquivos (
        tenant_id,
        entidade_tipo,
        entidade_id,
        categoria,
        nome_original,
        nome_arquivo,
        caminho_arquivo,
        thumbnail_caminho,
        mime_type,
        extensao,
        tamanho_bytes,
        data_upload,
        usuario_upload_id,
        ativo,
        observacao,
        metadados_json,
        criado_em,
        atualizado_em
      ) VALUES (
        ${input.tenantId ? Prisma.sql `${input.tenantId}::uuid` : Prisma.sql `NULL`},
        ${input.entidadeTipo},
        ${input.entidadeId ?? null},
        ${input.categoria},
        ${input.nomeOriginal},
        ${input.nomeArquivo},
        ${input.caminhoArquivo},
        ${input.thumbnailCaminho ?? null},
        ${input.mimeType},
        ${input.extensao ?? null},
        ${BigInt(Math.max(0, input.tamanhoBytes))},
        NOW(),
        ${usuarioUploadId},
        TRUE,
        ${input.observacao ?? null},
        ${input.metadadosJson ? JSON.stringify(input.metadadosJson) : null}::jsonb,
        NOW(),
        NOW()
      )
      RETURNING
        id,
        tenant_id::text AS tenant_id,
        entidade_tipo,
        entidade_id,
        categoria,
        nome_original,
        nome_arquivo,
        caminho_arquivo,
        thumbnail_caminho,
        mime_type,
        extensao,
        tamanho_bytes,
        data_upload,
        usuario_upload_id,
        ativo,
        observacao,
        metadados_json,
        criado_em,
        atualizado_em,
        excluido_em
    `);
        const arquivo = rows[0];
        if (!arquivo) {
            throw new AppError("Nao foi possivel registrar os metadados do arquivo.", 500);
        }
        return arquivo;
    }
    async resolverUsuarioUploadId(usuarioUploadId) {
        if (!usuarioUploadId) {
            return null;
        }
        try {
            const rows = await prisma.$queryRaw(Prisma.sql `
        SELECT id
        FROM usuarios
        WHERE id = ${usuarioUploadId}
        LIMIT 1
      `);
            return rows[0]?.id ?? null;
        }
        catch {
            return null;
        }
    }
    async listar(filters) {
        await ensureArquivosEstrutura(prisma);
        const clauses = [Prisma.sql `1 = 1`];
        if (filters.tenantId) {
            clauses.push(Prisma.sql `
        (
          tenant_id::text = ${filters.tenantId}
          ${this.montarClausulaTenantLegado(filters.tenantId)}
        )
      `);
        }
        if (filters.entidadeTipo) {
            clauses.push(Prisma.sql `entidade_tipo = ${filters.entidadeTipo}`);
        }
        if (typeof filters.entidadeId === "bigint") {
            clauses.push(Prisma.sql `entidade_id = ${filters.entidadeId}`);
        }
        if (filters.categoria) {
            clauses.push(Prisma.sql `categoria = ${filters.categoria}`);
        }
        if (typeof filters.ativo === "boolean") {
            clauses.push(Prisma.sql `ativo = ${filters.ativo}`);
        }
        return prisma.$queryRaw(Prisma.sql `
      SELECT
        id,
        tenant_id::text AS tenant_id,
        entidade_tipo,
        entidade_id,
        categoria,
        nome_original,
        nome_arquivo,
        caminho_arquivo,
        thumbnail_caminho,
        mime_type,
        extensao,
        tamanho_bytes,
        data_upload,
        usuario_upload_id,
        ativo,
        observacao,
        metadados_json,
        criado_em,
        atualizado_em,
        excluido_em
      FROM arquivos
      WHERE ${Prisma.join(clauses, " AND ")}
      ORDER BY data_upload DESC, id DESC
    `);
    }
    async buscarPorId(id, tenantId) {
        await ensureArquivosEstrutura(prisma);
        const tenantClause = tenantId
            ? Prisma.sql `
        AND (
          tenant_id::text = ${tenantId}
          ${this.montarClausulaTenantLegado(tenantId)}
        )
      `
            : Prisma.empty;
        const rows = await prisma.$queryRaw(Prisma.sql `
      SELECT
        id,
        tenant_id::text AS tenant_id,
        entidade_tipo,
        entidade_id,
        categoria,
        nome_original,
        nome_arquivo,
        caminho_arquivo,
        thumbnail_caminho,
        mime_type,
        extensao,
        tamanho_bytes,
        data_upload,
        usuario_upload_id,
        ativo,
        observacao,
        metadados_json,
        criado_em,
        atualizado_em,
        excluido_em
      FROM arquivos
      WHERE id = ${id}
        ${tenantClause}
      LIMIT 1
    `);
        return rows[0] ?? null;
    }
    async buscarPorIdOuFalhar(id, tenantId) {
        const arquivo = await this.buscarPorId(id, tenantId);
        if (!arquivo) {
            throw new AppError("Arquivo nao encontrado.", 404);
        }
        return arquivo;
    }
    async buscarAtivoPorCaminho(caminhoArquivo, tenantId) {
        await ensureArquivosEstrutura(prisma);
        const tenantClause = tenantId
            ? Prisma.sql `
        AND (
          tenant_id::text = ${tenantId}
          ${this.montarClausulaTenantLegado(tenantId)}
        )
      `
            : Prisma.empty;
        const rows = await prisma.$queryRaw(Prisma.sql `
      SELECT
        id,
        tenant_id::text AS tenant_id,
        entidade_tipo,
        entidade_id,
        categoria,
        nome_original,
        nome_arquivo,
        caminho_arquivo,
        thumbnail_caminho,
        mime_type,
        extensao,
        tamanho_bytes,
        data_upload,
        usuario_upload_id,
        ativo,
        observacao,
        metadados_json,
        criado_em,
        atualizado_em,
        excluido_em
      FROM arquivos
      WHERE caminho_arquivo = ${caminhoArquivo}
        AND ativo = TRUE
        ${tenantClause}
      LIMIT 1
    `);
        return rows[0] ?? null;
    }
    async vincularEntidadePorCaminho(caminhoArquivo, entidadeId, tenantId, novoCaminhoArquivo, novoThumbnailCaminho) {
        await ensureArquivosEstrutura(prisma);
        await prisma.$executeRaw(Prisma.sql `
      UPDATE arquivos
      SET entidade_id = ${entidadeId},
          tenant_id = COALESCE(tenant_id, ${tenantId ? Prisma.sql `${tenantId}::uuid` : Prisma.sql `NULL`}),
          ${novoCaminhoArquivo ? Prisma.sql `caminho_arquivo = ${novoCaminhoArquivo},` : Prisma.empty}
          ${novoThumbnailCaminho !== undefined ? Prisma.sql `thumbnail_caminho = ${novoThumbnailCaminho},` : Prisma.empty}
          atualizado_em = NOW()
      WHERE caminho_arquivo = ${caminhoArquivo}
    `);
    }
    async desativarPorId(id) {
        await ensureArquivosEstrutura(prisma);
        await prisma.$executeRaw(Prisma.sql `
      UPDATE arquivos
      SET ativo = FALSE,
          excluido_em = COALESCE(excluido_em, NOW()),
          atualizado_em = NOW()
      WHERE id = ${id}
    `);
    }
    async desativarPorCaminho(caminhoArquivo) {
        await ensureArquivosEstrutura(prisma);
        await prisma.$executeRaw(Prisma.sql `
      UPDATE arquivos
      SET ativo = FALSE,
          excluido_em = COALESCE(excluido_em, NOW()),
          atualizado_em = NOW()
      WHERE caminho_arquivo = ${caminhoArquivo}
    `);
    }
    async registrarAuditoria(payload) {
        try {
            await prisma.$executeRawUnsafe(`
          INSERT INTO auditoria_evento (usuario_id, acao, entidade, entidade_id, dados_json, criado_em)
          VALUES ($1, $2, 'ARQUIVO', $3, $4::jsonb, NOW())
        `, payload.atorId ?? null, payload.acao, payload.entidadeId, JSON.stringify(payload.dados));
        }
        catch (error) {
            console.warn("[arquivos] nao foi possivel registrar auditoria:", error);
        }
    }
}
