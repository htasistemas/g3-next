import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { normalizeDigits, trimOrUndefined } from "../../../utils/string-utils.js";
import { mapAuditoriaRowParaResponse, mapUsuarioRowParaResponse } from "../usuario.mapper.js";
import { ensureUsuariosGestaoEstrutura } from "./usuario-estrutura.repository.js";
export class UsuarioRepository {
    async listar(filters) {
        await ensureUsuariosGestaoEstrutura(prisma);
        const where = this.buildWhereClause(filters);
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
        u.tentativas_login_invalidas,
        u.ultimo_login_invalido_em,
        u.ultimo_acesso_em,
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
        u.tentativas_login_invalidas,
        u.ultimo_login_invalido_em,
        u.ultimo_acesso_em,
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
    async buscarPorId(id) {
        await ensureUsuariosGestaoEstrutura(prisma);
        const usuario = await this.buscarUsuarioRowPorId(id);
        if (!usuario) {
            throw new AppError("Usuario nao encontrado.", 404);
        }
        const auditoria = await this.buscarAuditoriaPorUsuarioId(id);
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
    async criar(input, senhaHash, ator) {
        await ensureUsuariosGestaoEstrutura(prisma);
        const nomeUsuario = input.nome_usuario.trim();
        const email = input.email.trim().toLowerCase();
        const cpf = normalizeDigits(input.cpf);
        await this.validarDuplicidades({
            nome_usuario: nomeUsuario,
            email,
            cpf
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
            }, ator.nome_usuario);
            await this.sincronizarPermissoesTx(tx, usuario.id, permissoesNormalizadas);
            await this.registrarAuditoriaTx(tx, {
                ator_id: ator.id,
                acao: "CREATE",
                entidade_id: usuario.id.toString()
            }, {
                nome_usuario: nomeUsuario,
                email,
                status: input.status ?? "ATIVO",
                permissoes: permissoesNormalizadas
            });
            return usuario.id;
        });
        return this.buscarPorId(usuarioId);
    }
    async atualizar(id, input, ator) {
        await ensureUsuariosGestaoEstrutura(prisma);
        const existente = await this.buscarUsuarioRowPorId(id);
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
            ignorar_id: id
        });
        await prisma.$transaction(async (tx) => {
            await tx.usuario.update({
                where: { id },
                data: {
                    nomeUsuario,
                    nome: input.nome_completo.trim(),
                    email,
                    atualizadoEm: new Date()
                }
            });
            const permissoesAtuais = await this.listarPermissoesUsuarioTx(tx, id);
            const permissoesNormalizadas = this.normalizarPermissoes(input.permissoes, input.perfil_acesso, permissoesAtuais);
            await this.atualizarCamposComplementaresTx(tx, id, {
                ...input,
                email,
                status: input.status ?? this.mapStatusPersistido(existente.status)
            }, ator.nome_usuario);
            await this.sincronizarPermissoesTx(tx, id, permissoesNormalizadas);
            await this.registrarAuditoriaTx(tx, {
                ator_id: ator.id,
                acao: "UPDATE",
                entidade_id: id.toString()
            }, {
                nome_usuario: nomeUsuario,
                email,
                status: input.status ?? this.mapStatusPersistido(existente.status),
                permissoes: permissoesNormalizadas
            });
        });
        return this.buscarPorId(id);
    }
    async atualizarStatus(id, status, ator) {
        await ensureUsuariosGestaoEstrutura(prisma);
        const usuario = await this.buscarUsuarioRowPorId(id);
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
        `, id, status, ator.nome_usuario);
            await this.registrarAuditoriaTx(tx, {
                ator_id: ator.id,
                acao: "STATUS_CHANGE",
                entidade_id: id.toString()
            }, {
                status_anterior: this.mapStatusPersistido(usuario.status),
                status_novo: status
            });
        });
        return this.buscarPorId(id);
    }
    async resetarSenha(id, novaSenhaHash, exigirTrocaSenha, ator) {
        await ensureUsuariosGestaoEstrutura(prisma);
        const usuario = await this.buscarUsuarioRowPorId(id);
        if (!usuario) {
            throw new AppError("Usuario nao encontrado.", 404);
        }
        await prisma.$transaction(async (tx) => {
            await tx.usuario.update({
                where: { id },
                data: {
                    senhaHash: novaSenhaHash,
                    atualizadoEm: new Date()
                }
            });
            await tx.$executeRawUnsafe(`
          UPDATE usuarios
          SET exigir_troca_senha = $2,
              tentativas_login_invalidas = 0,
              ultimo_login_invalido_em = NULL,
              atualizado_em = NOW(),
              atualizado_por = $3
          WHERE id = $1
        `, id, exigirTrocaSenha, ator.nome_usuario);
            await this.registrarAuditoriaTx(tx, {
                ator_id: ator.id,
                acao: "RESET_PASSWORD",
                entidade_id: id.toString()
            }, {
                exigir_troca_senha: exigirTrocaSenha
            });
        });
        return this.buscarPorId(id);
    }
    async remover(id, ator) {
        await ensureUsuariosGestaoEstrutura(prisma);
        const usuario = await this.buscarUsuarioRowPorId(id);
        if (!usuario) {
            throw new AppError("Usuario nao encontrado.", 404);
        }
        await prisma.$transaction(async (tx) => {
            await tx.$executeRawUnsafe(`
          UPDATE usuarios
          SET status = 'INATIVO',
              atualizado_em = NOW(),
              atualizado_por = $2
          WHERE id = $1
        `, id, ator.nome_usuario);
            await this.registrarAuditoriaTx(tx, {
                ator_id: ator.id,
                acao: "DELETE",
                entidade_id: id.toString()
            }, {
                status_novo: "INATIVO"
            });
        });
        return this.buscarPorId(id);
    }
    async buscarUsuarioRowPorId(id) {
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
        u.tentativas_login_invalidas,
        u.ultimo_login_invalido_em,
        u.ultimo_acesso_em,
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
        u.tentativas_login_invalidas,
        u.ultimo_login_invalido_em,
        u.ultimo_acesso_em,
        u.criado_em,
        u.atualizado_em
      LIMIT 1
    `);
        return rows[0] ?? null;
    }
    async buscarAuditoriaPorUsuarioId(id, limite = 100) {
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
    buildWhereClause(filters) {
        const conditions = [];
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
        if (!conditions.length) {
            return Prisma.empty;
        }
        return Prisma.sql `WHERE ${Prisma.join(conditions, " AND ")}`;
    }
    async atualizarCamposComplementaresTx(tx, usuarioId, input, usuarioAtualizacao) {
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
          atualizado_em = NOW(),
          atualizado_por = $11
        WHERE id = $1
      `, usuarioId, trimOrUndefined(input.nome_exibicao) ?? null, normalizeDigits(input.telefone) ?? null, normalizeDigits(input.cpf) ?? null, trimOrUndefined(input.matricula) ?? null, trimOrUndefined(input.setor) ?? null, trimOrUndefined(input.unidade) ?? null, trimOrUndefined(input.cargo) ?? null, input.status ?? "ATIVO", !!input.exigir_troca_senha, usuarioAtualizacao);
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
        const ignorarSql = input.ignorar_id
            ? Prisma.sql `AND u.id <> ${input.ignorar_id}`
            : Prisma.empty;
        const duplicidades = await prisma.$queryRaw(Prisma.sql `
      SELECT u.id, u.nome_usuario, u.email, u.cpf
      FROM usuarios u
      WHERE (${Prisma.join(condicoes, " OR ")})
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
          INSERT INTO auditoria_evento (usuario_id, acao, entidade, entidade_id, dados_json, criado_em)
          VALUES ($1, $2, 'USUARIO', $3, $4::jsonb, NOW())
        `, payload.ator_id ?? null, payload.acao, payload.entidade_id, JSON.stringify(dados));
        }
        catch (error) {
            console.warn("[usuarios] nao foi possivel registrar auditoria:", error);
        }
    }
}
