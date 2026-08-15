import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { normalizeDigits, trimOrUndefined } from "../../../utils/string-utils.js";
import { mapAuditoriaRowParaResponse, mapUsuarioRowParaResponse } from "../usuario.mapper.js";
import { ensureUsuariosGestaoEstrutura } from "./usuario-estrutura.repository.js";
export class UsuarioRepository {
    async listar(filters, tenantId) {
        await ensureUsuariosGestaoEstrutura(prisma);
        const where = this.buildWhereClause(filters, tenantId);
        const limite = Math.min(Math.max(filters.tamanho_pagina, 1), 100);
        const offset = (Math.max(filters.pagina, 1) - 1) * limite;
        const rows = await prisma.$queryRaw(Prisma.sql `
      SELECT
        u.id,
        u.nome_usuario,
        u.nome,
        u.nome_exibicao,
        u.email,
        u.telefone,
        u.cpf,
        u.matricula,
        u.setor,
        u.unidade,
        u.cargo,
        u.status,
        u.exigir_troca_senha,
        u.exigir_autenticacao_segura,
        u.permitir_biometria_facial_login,
        u.exigir_biometria_facial_login,
        u.tentativas_login_invalidas,
        u.ultimo_login_invalido_em,
        u.ultimo_acesso_em,
        u.origem_tipo,
        u.origem_id,
        u.origem_nome,
        u.criado_em,
        u.atualizado_em,
        COALESCE(
          ARRAY_REMOVE(ARRAY_AGG(DISTINCT p.nome), NULL),
          ARRAY[]::text[]
        ) AS permissoes
      FROM usuarios u
      LEFT JOIN usuario_permissao up ON up.usuario_id = u.id
      LEFT JOIN permissao p ON p.id = up.permissao_id
      ${where}
      GROUP BY
        u.id,
        u.nome_usuario,
        u.nome,
        u.nome_exibicao,
        u.email,
        u.telefone,
        u.cpf,
        u.matricula,
        u.setor,
        u.unidade,
        u.cargo,
        u.status,
        u.exigir_troca_senha,
        u.exigir_autenticacao_segura,
        u.permitir_biometria_facial_login,
        u.exigir_biometria_facial_login,
        u.tentativas_login_invalidas,
        u.ultimo_login_invalido_em,
        u.ultimo_acesso_em,
        u.origem_tipo,
        u.origem_id,
        u.origem_nome,
        u.criado_em,
        u.atualizado_em
      ORDER BY
        u.nome ASC NULLS LAST,
        u.nome_usuario ASC
      LIMIT ${limite}
      OFFSET ${offset}
    `);
        const totalRows = await prisma.$queryRaw(Prisma.sql `
      SELECT COUNT(*)::bigint AS total
      FROM usuarios u
      ${where}
    `);
        const total = Number(totalRows[0]?.total ?? BigInt(0));
        const usuarios = rows.map(mapUsuarioRowParaResponse);
        return {
            usuarios,
            paginacao: {
                pagina: Math.max(filters.pagina, 1),
                tamanho_pagina: limite,
                total,
                total_paginas: total > 0 ? Math.ceil(total / limite) : 1
            }
        };
    }
    async buscarPorId(id, tenantId) {
        await ensureUsuariosGestaoEstrutura(prisma);
        const usuario = await this.buscarUsuarioRowPorId(id, tenantId);
        if (!usuario) {
            throw new AppError("Usuario nao encontrado.", 404);
        }
        const auditoria = await this.buscarAuditoriaPorUsuarioId(id, tenantId);
        return {
            usuario: mapUsuarioRowParaResponse(usuario),
            auditoria
        };
    }
    async listarPermissoes() {
        await ensureUsuariosGestaoEstrutura(prisma);
        const permissoes = await prisma.permissao.findMany({
            select: { nome: true },
            orderBy: { nome: "asc" }
        });
        return permissoes
            .map((item) => item.nome.trim().toUpperCase())
            .filter(Boolean);
    }
    async buscarFacePorId(id, tenantId) {
        await ensureUsuariosGestaoEstrutura(prisma);
        const usuario = await this.buscarUsuarioFaceRowPorId(id, tenantId);
        if (!usuario) {
            throw new AppError("Usuario nao encontrado.", 404);
        }
        return this.mapFaceStatus(usuario);
    }
    async salvarFacePorId(id, faceHash, caminhoArquivo, ator) {
        await ensureUsuariosGestaoEstrutura(prisma);
        const usuarioAtual = await this.buscarUsuarioFaceRowPorId(id, ator.tenant_id);
        if (!usuarioAtual) {
            throw new AppError("Usuario nao encontrado.", 404);
        }
        await prisma.$transaction(async (tx) => {
            await tx.$executeRaw `
        UPDATE usuarios
           SET face_hash = ${faceHash},
               face_foto_url = ${caminhoArquivo},
               face_cadastrada_em = NOW(),
               atualizado_em = NOW()
         WHERE id = ${id}
           AND tenant_id::text = ${ator.tenant_id}
      `;
            await this.registrarAuditoriaTx(tx, {
                ator_id: ator.id,
                acao: usuarioAtual.face_hash ? "UPDATE_FACE" : "CREATE_FACE",
                entidade_id: id.toString(),
                tenant_id: ator.tenant_id
            }, {
                face_cadastrada: true,
                caminho_arquivo: caminhoArquivo
            });
        });
        return {
            status: await this.buscarFacePorId(id, ator.tenant_id),
            caminhoAnterior: usuarioAtual.face_foto_url
        };
    }
    async removerFacePorId(id, ator) {
        await ensureUsuariosGestaoEstrutura(prisma);
        const usuarioAtual = await this.buscarUsuarioFaceRowPorId(id, ator.tenant_id);
        if (!usuarioAtual) {
            throw new AppError("Usuario nao encontrado.", 404);
        }
        await prisma.$transaction(async (tx) => {
            await tx.$executeRaw `
        UPDATE usuarios
           SET face_hash = NULL,
               face_foto_url = NULL,
               face_cadastrada_em = NULL,
               exigir_biometria_facial_login = FALSE,
               atualizado_em = NOW()
         WHERE id = ${id}
           AND tenant_id::text = ${ator.tenant_id}
      `;
            await this.registrarAuditoriaTx(tx, {
                ator_id: ator.id,
                acao: "DELETE_FACE",
                entidade_id: id.toString(),
                tenant_id: ator.tenant_id
            }, {
                face_cadastrada: false
            });
        });
        return {
            status: await this.buscarFacePorId(id, ator.tenant_id),
            caminhoAnterior: usuarioAtual.face_foto_url
        };
    }
    async criar(input, senhaHash, ator) {
        await ensureUsuariosGestaoEstrutura(prisma);
        const nomeUsuario = input.nome_usuario.trim();
        const email = input.email.trim().toLowerCase();
        const cpf = normalizeDigits(input.cpf);
        await this.validarDuplicidades({
            nome_usuario: nomeUsuario,
            email,
            cpf,
            origem_tipo: input.origem_tipo,
            origem_id: trimOrUndefined(input.origem_id),
            tenant_id: ator.tenant_id
        });
        const permissoesNormalizadas = this.normalizarPermissoes(input.permissoes, input.perfil_acesso);
        const usuarioId = await prisma.$transaction(async (tx) => {
            const now = new Date();
            const usuario = await tx.usuario.create({
                data: {
                    nomeUsuario,
                    nome: input.nome_completo.trim(),
                    email,
                    senhaHash,
                    criadoEm: now,
                    atualizadoEm: now
                }
            });
            await this.atualizarCamposComplementaresTx(tx, usuario.id, {
                ...input,
                email
            }, ator);
            await this.sincronizarPermissoesTx(tx, usuario.id, permissoesNormalizadas);
            await this.registrarAuditoriaTx(tx, {
                ator_id: ator.id,
                acao: "CREATE",
                entidade_id: usuario.id.toString(),
                tenant_id: ator.tenant_id
            }, {
                nome_usuario: nomeUsuario,
                email,
                status: input.status ?? "ATIVO",
                exigir_autenticacao_segura: !!input.exigir_autenticacao_segura,
                permitir_biometria_facial_login: !!input.permitir_biometria_facial_login,
                exigir_biometria_facial_login: !!input.exigir_biometria_facial_login,
                permissoes: permissoesNormalizadas,
                origem_tipo: input.origem_tipo ?? null,
                origem_id: trimOrUndefined(input.origem_id) ?? null
            });
            return usuario.id;
        });
        return this.buscarPorId(usuarioId, ator.tenant_id);
    }
    async atualizar(id, input, ator) {
        await ensureUsuariosGestaoEstrutura(prisma);
        const existente = await this.buscarUsuarioRowPorId(id, ator.tenant_id);
        if (!existente) {
            throw new AppError("Usuario nao encontrado.", 404);
        }
        const nomeUsuario = input.nome_usuario.trim();
        const email = input.email.trim().toLowerCase();
        const cpf = normalizeDigits(input.cpf);
        await this.validarDuplicidades({
            nome_usuario: nomeUsuario,
            email,
            cpf,
            ignorar_id: id,
            origem_tipo: input.origem_tipo,
            origem_id: trimOrUndefined(input.origem_id),
            tenant_id: ator.tenant_id
        });
        await prisma.$transaction(async (tx) => {
            await tx.$executeRawUnsafe(`
          UPDATE usuarios
          SET nome_usuario = $2,
              nome = $3,
              email = $4,
              atualizado_em = NOW()
          WHERE id = $1
            AND tenant_id::text = $5
        `, id, nomeUsuario, input.nome_completo.trim(), email, ator.tenant_id);
            const permissoesAtuais = await this.listarPermissoesUsuarioTx(tx, id);
            const permissoesNormalizadas = this.normalizarPermissoes(input.permissoes, input.perfil_acesso, permissoesAtuais);
            await this.atualizarCamposComplementaresTx(tx, id, {
                ...input,
                email,
                status: input.status ?? this.mapStatusPersistido(existente.status)
            }, ator);
            await this.sincronizarPermissoesTx(tx, id, permissoesNormalizadas);
            await this.registrarAuditoriaTx(tx, {
                ator_id: ator.id,
                acao: "UPDATE",
                entidade_id: id.toString(),
                tenant_id: ator.tenant_id
            }, {
                nome_usuario: nomeUsuario,
                email,
                status: input.status ?? this.mapStatusPersistido(existente.status),
                exigir_autenticacao_segura: !!input.exigir_autenticacao_segura,
                permitir_biometria_facial_login: !!input.permitir_biometria_facial_login,
                exigir_biometria_facial_login: !!input.exigir_biometria_facial_login,
                permissoes: permissoesNormalizadas,
                origem_tipo: input.origem_tipo ?? null,
                origem_id: trimOrUndefined(input.origem_id) ?? null
            });
        });
        return this.buscarPorId(id, ator.tenant_id);
    }
    async atualizarStatus(id, status, ator) {
        await ensureUsuariosGestaoEstrutura(prisma);
        const usuario = await this.buscarUsuarioRowPorId(id, ator.tenant_id);
        if (!usuario) {
            throw new AppError("Usuario nao encontrado.", 404);
        }
        await prisma.$transaction(async (tx) => {
            await tx.$executeRawUnsafe(`
          UPDATE usuarios
          SET status = $2,
              atualizado_em = NOW(),
              atualizado_por = $3
          WHERE id = $1
            AND tenant_id::text = $4
        `, id, status, ator.nome_usuario, ator.tenant_id);
            await this.registrarAuditoriaTx(tx, {
                ator_id: ator.id,
                acao: "STATUS_CHANGE",
                entidade_id: id.toString(),
                tenant_id: ator.tenant_id
            }, {
                status_anterior: this.mapStatusPersistido(usuario.status),
                status_novo: status
            });
        });
        return this.buscarPorId(id, ator.tenant_id);
    }
    async resetarSenha(id, novaSenhaHash, exigirTrocaSenha, ator) {
        await ensureUsuariosGestaoEstrutura(prisma);
        const usuario = await this.buscarUsuarioRowPorId(id, ator.tenant_id);
        if (!usuario) {
            throw new AppError("Usuario nao encontrado.", 404);
        }
        await prisma.$transaction(async (tx) => {
            await tx.$executeRawUnsafe(`
          UPDATE usuarios
          SET senha_hash = $2,
              atualizado_em = NOW()
          WHERE id = $1
            AND tenant_id::text = $3
        `, id, novaSenhaHash, ator.tenant_id);
            await tx.$executeRawUnsafe(`
          UPDATE usuarios
          SET exigir_troca_senha = $2,
              tentativas_login_invalidas = 0,
              ultimo_login_invalido_em = NULL,
              atualizado_em = NOW(),
              atualizado_por = $3
          WHERE id = $1
            AND tenant_id::text = $4
        `, id, exigirTrocaSenha, ator.nome_usuario, ator.tenant_id);
            await this.registrarAuditoriaTx(tx, {
                ator_id: ator.id,
                acao: "RESET_PASSWORD",
                entidade_id: id.toString(),
                tenant_id: ator.tenant_id
            }, {
                exigir_troca_senha: exigirTrocaSenha
            });
        });
        return this.buscarPorId(id, ator.tenant_id);
    }
    async remover(id, ator) {
        await ensureUsuariosGestaoEstrutura(prisma);
        const usuario = await this.buscarUsuarioRowPorId(id, ator.tenant_id);
        if (!usuario) {
            throw new AppError("Usuario nao encontrado.", 404);
        }
        const removidoEm = new Date();
        await prisma.$transaction(async (tx) => {
            await tx.$executeRawUnsafe(`
          UPDATE usuarios
          SET deletado_em = $2,
              deletado_por = $3,
              atualizado_em = NOW(),
              atualizado_por = $3
          WHERE id = $1
            AND tenant_id::text = $4
        `, id, removidoEm, ator.nome_usuario, ator.tenant_id);
            await this.registrarAuditoriaTx(tx, {
                ator_id: ator.id,
                acao: "DELETE",
                entidade_id: id.toString(),
                tenant_id: ator.tenant_id
            }, {
                status_anterior: this.mapStatusPersistido(usuario.status),
                removido_em: removidoEm.toISOString(),
                removido_por: ator.nome_usuario
            });
        });
        return {
            id_usuario: id.toString(),
            removido_em: removidoEm.toISOString()
        };
    }
    async buscarUsuarioRowPorId(id, tenantId) {
        const rows = await prisma.$queryRaw(Prisma.sql `
      SELECT
        u.id,
        u.nome_usuario,
        u.nome,
        u.nome_exibicao,
        u.email,
        u.telefone,
        u.cpf,
        u.matricula,
        u.setor,
        u.unidade,
        u.cargo,
        u.status,
        u.exigir_troca_senha,
        u.exigir_autenticacao_segura,
        u.permitir_biometria_facial_login,
        u.exigir_biometria_facial_login,
        u.tentativas_login_invalidas,
        u.ultimo_login_invalido_em,
        u.ultimo_acesso_em,
        u.origem_tipo,
        u.origem_id,
        u.origem_nome,
        u.criado_em,
        u.atualizado_em,
        COALESCE(
          ARRAY_REMOVE(ARRAY_AGG(DISTINCT p.nome), NULL),
          ARRAY[]::text[]
        ) AS permissoes
      FROM usuarios u
      LEFT JOIN usuario_permissao up ON up.usuario_id = u.id
      LEFT JOIN permissao p ON p.id = up.permissao_id
      WHERE u.id = ${id}
        AND u.tenant_id::text = ${tenantId}
        AND u.deletado_em IS NULL
      GROUP BY
        u.id,
        u.nome_usuario,
        u.nome,
        u.nome_exibicao,
        u.email,
        u.telefone,
        u.cpf,
        u.matricula,
        u.setor,
        u.unidade,
        u.cargo,
        u.status,
        u.exigir_troca_senha,
        u.exigir_autenticacao_segura,
        u.permitir_biometria_facial_login,
        u.exigir_biometria_facial_login,
        u.tentativas_login_invalidas,
        u.ultimo_login_invalido_em,
        u.ultimo_acesso_em,
        u.origem_tipo,
        u.origem_id,
        u.origem_nome,
        u.criado_em,
        u.atualizado_em
      LIMIT 1
    `);
        return rows[0] ?? null;
    }
    async buscarUsuarioFaceRowPorId(id, tenantId) {
        const rows = await prisma.$queryRaw(Prisma.sql `
      SELECT
        id,
        face_hash,
        face_foto_url,
        face_cadastrada_em
      FROM usuarios
      WHERE id = ${id}
        AND tenant_id::text = ${tenantId}
        AND deletado_em IS NULL
      LIMIT 1
    `);
        return rows[0] ?? null;
    }
    mapFaceStatus(usuario) {
        return {
            face_cadastrada: Boolean(usuario.face_hash && usuario.face_foto_url),
            face_url: usuario.face_foto_url ?? undefined,
            face_cadastrada_em: usuario.face_cadastrada_em?.toISOString()
        };
    }
    async buscarAuditoriaPorUsuarioId(id, tenantId, limite = 100) {
        try {
            const rows = await prisma.$queryRaw(Prisma.sql `
        SELECT
          a.id::text,
          a.acao,
          a.usuario_id,
          COALESCE(ator.nome, ator.nome_usuario) AS usuario_nome,
          a.dados_json,
          a.criado_em
        FROM auditoria_evento a
        LEFT JOIN usuarios ator ON ator.id = a.usuario_id
        WHERE a.entidade = 'USUARIO'
          AND a.entidade_id = ${id.toString()}
          AND a.tenant_id::text = ${tenantId}
        ORDER BY a.criado_em DESC
        LIMIT ${limite}
      `);
            return rows.map(mapAuditoriaRowParaResponse);
        }
        catch (error) {
            console.warn("[usuarios] auditoria_evento nao disponivel:", error);
            return [];
        }
    }
    buildWhereClause(filters, tenantId) {
        const conditions = [
            Prisma.sql `u.deletado_em IS NULL`,
            Prisma.sql `u.tenant_id::text = ${tenantId}`
        ];
        if (filters.nome) {
            const termo = `%${filters.nome.trim()}%`;
            conditions.push(Prisma.sql `(
          u.nome ILIKE ${termo}
          OR u.nome_exibicao ILIKE ${termo}
          OR u.nome_usuario ILIKE ${termo}
        )`);
        }
        if (filters.login) {
            const termo = `%${filters.login.trim()}%`;
            conditions.push(Prisma.sql `u.nome_usuario ILIKE ${termo}`);
        }
        if (filters.email) {
            const termo = `%${filters.email.trim()}%`;
            conditions.push(Prisma.sql `u.email ILIKE ${termo}`);
        }
        if (filters.setor) {
            const termo = `%${filters.setor.trim()}%`;
            conditions.push(Prisma.sql `u.setor ILIKE ${termo}`);
        }
        if (filters.unidade) {
            const termo = `%${filters.unidade.trim()}%`;
            conditions.push(Prisma.sql `u.unidade ILIKE ${termo}`);
        }
        if (filters.status) {
            conditions.push(Prisma.sql `u.status = ${filters.status}`);
        }
        if (filters.perfil) {
            const perfil = filters.perfil.trim().toUpperCase();
            conditions.push(Prisma.sql `
        EXISTS (
          SELECT 1
          FROM usuario_permissao upf
          INNER JOIN permissao pf ON pf.id = upf.permissao_id
          WHERE upf.usuario_id = u.id
            AND pf.nome = ${perfil}
        )
      `);
        }
        if (filters.criado_de) {
            conditions.push(Prisma.sql `u.criado_em::date >= ${filters.criado_de}::date`);
        }
        if (filters.criado_ate) {
            conditions.push(Prisma.sql `u.criado_em::date <= ${filters.criado_ate}::date`);
        }
        return Prisma.sql `WHERE ${Prisma.join(conditions, " AND ")}`;
    }
    async atualizarCamposComplementaresTx(tx, usuarioId, input, ator) {
        await tx.$executeRawUnsafe(`
        UPDATE usuarios
        SET
          nome_exibicao = $2,
          telefone = $3,
          cpf = $4,
          matricula = $5,
          setor = $6,
          unidade = $7,
          cargo = $8,
          status = $9,
          exigir_troca_senha = $10,
          exigir_autenticacao_segura = $11,
          permitir_biometria_facial_login = $12,
          exigir_biometria_facial_login = $13,
          origem_tipo = $14,
          origem_id = $15,
          origem_nome = $16,
          tenant_id = $17::uuid,
          instituicao_id = $18::uuid,
          atualizado_em = NOW(),
          atualizado_por = $19
        WHERE id = $1
          AND (tenant_id::text = $20 OR tenant_id IS NULL)
      `, usuarioId, trimOrUndefined(input.nome_exibicao) ?? null, normalizeDigits(input.telefone) ?? null, normalizeDigits(input.cpf) ?? null, trimOrUndefined(input.matricula) ?? null, trimOrUndefined(input.setor) ?? null, trimOrUndefined(input.unidade) ?? null, trimOrUndefined(input.cargo) ?? null, input.status ?? "ATIVO", !!input.exigir_troca_senha, !!input.exigir_autenticacao_segura, !!input.permitir_biometria_facial_login, !!input.permitir_biometria_facial_login && !!input.exigir_biometria_facial_login, trimOrUndefined(input.origem_tipo) ?? null, trimOrUndefined(input.origem_id) ?? null, trimOrUndefined(input.origem_nome) ?? null, ator.tenant_id, ator.instituicao_id, ator.nome_usuario, ator.tenant_id);
    }
    async sincronizarPermissoesTx(tx, usuarioId, permissoes) {
        const nomes = [...new Set(permissoes.map((item) => item.trim().toUpperCase()).filter(Boolean))];
        if (!nomes.length) {
            throw new AppError("Informe ao menos uma permissao de acesso.", 422);
        }
        await tx.permissao.createMany({
            data: nomes.map((nome) => ({ nome })),
            skipDuplicates: true
        });
        const permissoesDb = await tx.permissao.findMany({
            where: { nome: { in: nomes } },
            select: { id: true }
        });
        await tx.usuarioPermissao.deleteMany({ where: { usuarioId } });
        if (!permissoesDb.length) {
            throw new AppError("Nao foi possivel carregar as permissoes informadas.", 500);
        }
        await tx.usuarioPermissao.createMany({
            data: permissoesDb.map((permissao) => ({
                usuarioId,
                permissaoId: permissao.id
            })),
            skipDuplicates: true
        });
    }
    async listarPermissoesUsuarioTx(tx, usuarioId) {
        const rows = await tx.usuarioPermissao.findMany({
            where: { usuarioId },
            include: { permissao: true }
        });
        return rows
            .map((item) => item.permissao.nome.trim().toUpperCase())
            .filter(Boolean);
    }
    async validarDuplicidades(input) {
        const condicoes = [
            Prisma.sql `LOWER(u.nome_usuario) = LOWER(${input.nome_usuario})`,
            Prisma.sql `LOWER(u.email) = LOWER(${input.email})`
        ];
        if (input.cpf) {
            condicoes.push(Prisma.sql `u.cpf = ${input.cpf}`);
        }
        if (input.origem_tipo && input.origem_id) {
            condicoes.push(Prisma.sql `(u.origem_tipo = ${input.origem_tipo} AND u.origem_id = ${input.origem_id})`);
        }
        const ignorarSql = input.ignorar_id
            ? Prisma.sql `AND u.id <> ${input.ignorar_id}`
            : Prisma.empty;
        const duplicidades = await prisma.$queryRaw(Prisma.sql `
      SELECT u.id, u.nome_usuario, u.email, u.cpf, u.origem_tipo, u.origem_id
      FROM usuarios u
      WHERE (${Prisma.join(condicoes, " OR ")})
        AND u.deletado_em IS NULL
        AND u.tenant_id::text = ${input.tenant_id}
      ${ignorarSql}
      LIMIT 10
    `);
        const loginRepetido = duplicidades.some((item) => item.nome_usuario.toLowerCase() === input.nome_usuario.toLowerCase());
        if (loginRepetido) {
            throw new AppError("Ja existe um usuario com este login.", 409);
        }
        const emailRepetido = duplicidades.some((item) => (item.email ?? "").toLowerCase() === input.email.toLowerCase());
        if (emailRepetido) {
            throw new AppError("Ja existe um usuario com este e-mail.", 409);
        }
        if (input.cpf) {
            const cpfRepetido = duplicidades.some((item) => normalizeDigits(item.cpf) === input.cpf);
            if (cpfRepetido) {
                throw new AppError("Ja existe um usuario com este CPF.", 409);
            }
        }
        if (input.origem_tipo && input.origem_id) {
            const origemRepetida = duplicidades.some((item) => trimOrUndefined(item.origem_tipo)?.toUpperCase() === input.origem_tipo?.toUpperCase() &&
                trimOrUndefined(item.origem_id) === input.origem_id);
            if (origemRepetida) {
                throw new AppError("Ja existe um usuario vinculado a esta origem de cadastro.", 409);
            }
        }
    }
    normalizarPermissoes(permissoes, perfilAcesso, fallback) {
        const valores = [
            ...(permissoes ?? []),
            perfilAcesso ?? ""
        ]
            .map((item) => item.trim().toUpperCase())
            .filter(Boolean);
        const unicos = [...new Set(valores)];
        if (unicos.length)
            return unicos;
        if (fallback?.length) {
            return [...new Set(fallback.map((item) => item.trim().toUpperCase()).filter(Boolean))];
        }
        return ["OPERADOR"];
    }
    mapStatusPersistido(rawStatus) {
        const status = (rawStatus ?? "").trim().toUpperCase();
        if (status === "INATIVO")
            return "INATIVO";
        if (status === "BLOQUEADO")
            return "BLOQUEADO";
        return "ATIVO";
    }
    async registrarAuditoriaTx(tx, payload, dados) {
        try {
            await tx.$executeRawUnsafe(`
          INSERT INTO auditoria_evento (usuario_id, acao, entidade, entidade_id, tenant_id, dados_json, criado_em)
          VALUES ($1, $2, 'USUARIO', $3, $4::uuid, $5::jsonb, NOW())
        `, payload.ator_id ?? null, payload.acao, payload.entidade_id, payload.tenant_id, JSON.stringify(dados));
        }
        catch (error) {
            console.warn("[usuarios] nao foi possivel registrar auditoria:", error);
        }
    }
}
