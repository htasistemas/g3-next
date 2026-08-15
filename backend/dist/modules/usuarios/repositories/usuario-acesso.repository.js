import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { ensureMultiTenantStructure } from "../../multi-tenant/tenant-estrutura.service.js";
import { ensureUsuariosGestaoEstrutura } from "./usuario-estrutura.repository.js";
export class UsuarioAcessoRepository {
    async ensure() {
        await ensureMultiTenantStructure(prisma);
        await ensureUsuariosGestaoEstrutura(prisma);
    }
    async listar(usuarioId, instituicaoId) {
        await this.ensure();
        return prisma.$queryRawUnsafe(`
      SELECT a.id::text AS acesso_id, a.instituicao_id::text, a.tenant_id::text,
             a.entidade_juridica_id::text, a.unidade_organizacional_id::text AS unidade_id,
             a.projeto_id::text, a.perfil_nome, a.escopo, a.ativo,
             e.nome_fantasia AS entidade_nome, uo.nome AS unidade_nome, p.nome AS projeto_nome
      FROM usuario_acesso a
      LEFT JOIN entidades_juridicas e ON e.id = a.entidade_juridica_id
      LEFT JOIN unidades_organizacionais uo ON uo.id = a.unidade_organizacional_id
      LEFT JOIN projetos p ON p.id = a.projeto_id
      WHERE a.usuario_id = $1::bigint AND a.instituicao_id = $2::uuid
      ORDER BY a.escopo, entidade_nome NULLS FIRST, unidade_nome NULLS FIRST, projeto_nome NULLS FIRST
    `, usuarioId, instituicaoId);
    }
    async listarCatalogo(instituicaoId) {
        await this.ensure();
        const entidades = await prisma.$queryRawUnsafe(`SELECT id::text, COALESCE(nome_fantasia, razao_social) AS nome, cnpj FROM entidades_juridicas WHERE instituicao_id = $1::uuid AND upper(status) = 'ATIVO' ORDER BY nome`, instituicaoId);
        const unidades = await prisma.$queryRawUnsafe(`SELECT id::text, nome, entidade_juridica_id::text FROM unidades_organizacionais WHERE instituicao_id = $1::uuid AND upper(status) = 'ATIVO' ORDER BY nome`, instituicaoId);
        const projetos = await prisma.$queryRawUnsafe(`SELECT id::text, nome, unidade_organizacional_id::text FROM projetos WHERE instituicao_id = $1::uuid AND ativo = TRUE ORDER BY nome`, instituicaoId).catch(() => []);
        return { entidades, unidades, projetos };
    }
    async substituir(usuarioId, instituicaoId, acessos) {
        await this.ensure();
        if (!acessos.length)
            throw new AppError("Informe ao menos um escopo de acesso.", 422);
        for (const acesso of acessos) {
            if ((acesso.instituicao_id ?? instituicaoId) !== instituicaoId) {
                throw new AppError("O escopo deve pertencer à instituição da sessão.", 403);
            }
            const escopo = acesso.escopo ?? "INSTITUICAO";
            if (escopo === "ENTIDADE_JURIDICA" && !acesso.entidade_juridica_id)
                throw new AppError("Informe a entidade jurídica do escopo.", 422);
            if (escopo === "UNIDADE" && !acesso.unidade_id)
                throw new AppError("Informe a unidade do escopo.", 422);
            if (escopo === "PROJETO" && !acesso.projeto_id)
                throw new AppError("Informe o projeto do escopo.", 422);
            await this.validarPertencimento(instituicaoId, acesso);
        }
        const identidade = await prisma.$queryRawUnsafe(`
      SELECT ui.id FROM usuario_identidade ui JOIN usuarios u ON lower(ui.email) = lower(u.email)
      WHERE u.id = $1::bigint LIMIT 1
    `, usuarioId);
        if (!identidade[0])
            throw new AppError("Identidade global do usuário não encontrada. Execute a migração.", 409);
        await prisma.$transaction(async (tx) => {
            await tx.$executeRawUnsafe(`DELETE FROM usuario_acesso WHERE usuario_id = $1::bigint AND instituicao_id = $2::uuid`, usuarioId, instituicaoId);
            for (const acesso of acessos) {
                const tenant = await tx.$queryRawUnsafe(`SELECT tenant_id::text FROM instituicoes WHERE id = $1::uuid`, instituicaoId);
                await tx.$executeRawUnsafe(`
          INSERT INTO usuario_acesso (identidade_id, usuario_id, instituicao_id, tenant_id, entidade_juridica_id, unidade_organizacional_id, projeto_id, perfil_nome, escopo, ativo)
          VALUES ($1::bigint, $2::bigint, $3::uuid, $4::uuid, $5::bigint, $6::bigint, $7::bigint, $8, $9, $10)
        `, identidade[0].id, usuarioId, instituicaoId, tenant[0].tenant_id, acesso.entidade_juridica_id ?? null, acesso.unidade_id ?? null, acesso.projeto_id ?? null, acesso.perfil_nome?.trim() || null, acesso.escopo ?? "INSTITUICAO", acesso.ativo !== false);
            }
        });
        return this.listar(usuarioId, instituicaoId);
    }
    async validarPertencimento(instituicaoId, acesso) {
        if (acesso.entidade_juridica_id) {
            const rows = await prisma.$queryRawUnsafe(`SELECT EXISTS(SELECT 1 FROM entidades_juridicas WHERE id = $1::bigint AND instituicao_id = $2::uuid) AS ok`, acesso.entidade_juridica_id, instituicaoId);
            if (!rows[0]?.ok)
                throw new AppError("Entidade jurídica fora da instituição autorizada.", 403);
        }
        if (acesso.unidade_id) {
            const rows = await prisma.$queryRawUnsafe(`SELECT EXISTS(SELECT 1 FROM unidades_organizacionais WHERE id = $1::bigint AND instituicao_id = $2::uuid) AS ok`, acesso.unidade_id, instituicaoId);
            if (!rows[0]?.ok)
                throw new AppError("Unidade fora da instituição autorizada.", 403);
        }
        if (acesso.projeto_id) {
            const rows = await prisma.$queryRawUnsafe(`SELECT EXISTS(SELECT 1 FROM projetos WHERE id = $1::bigint AND instituicao_id = $2::uuid) AS ok`, acesso.projeto_id, instituicaoId);
            if (!rows[0]?.ok)
                throw new AppError("Projeto fora da instituição autorizada.", 403);
        }
    }
}
