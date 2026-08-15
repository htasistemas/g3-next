import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
export class ReportsRepository {
    async listarTermosParceriaRelatorio(tenantId, filtros = {}) {
        const rows = await prisma.$queryRaw(Prisma.sql `
      SELECT i.id, i.tipo_instrumento, i.numero_instrumento, i.ano, i.titulo, i.objeto,
        i.inicio_vigencia, i.termino_vigencia, i.situacao, i.valor_global, i.valor_repasse,
        i.contrapartida_financeira, i.recursos_proprios, i.fonte_recurso,
        p.nome AS projeto_nome, c.razao_social AS concedente_nome,
        COALESCE((SELECT SUM(valor_recebido) FROM prestacao_contas_receita r WHERE r.instrumento_id = i.id AND r.tenant_id::text = ${tenantId} AND r.excluido_em IS NULL), 0)::float8 AS valor_recebido,
        COALESCE((SELECT SUM(valor_liquido) FROM prestacao_contas_despesa d WHERE d.instrumento_id = i.id AND d.tenant_id::text = ${tenantId} AND d.excluido_em IS NULL), 0)::float8 AS valor_executado,
        (SELECT COUNT(*) FROM prestacao_contas_meta m WHERE m.instrumento_id = i.id AND m.tenant_id::text = ${tenantId} AND m.excluido_em IS NULL)::int AS total_metas,
        (SELECT COUNT(*) FROM prestacao_contas_rubrica rb WHERE rb.instrumento_id = i.id AND rb.tenant_id::text = ${tenantId} AND rb.excluido_em IS NULL)::int AS total_rubricas,
        (SELECT COUNT(*) FROM prestacao_contas_documento doc WHERE doc.instrumento_id = i.id AND doc.tenant_id::text = ${tenantId} AND doc.excluido_em IS NULL)::int AS total_documentos
      FROM prestacao_contas_instrumento i
      LEFT JOIN projetos p ON p.id = i.projeto_id AND p.tenant_id::text = ${tenantId}
      LEFT JOIN prestacao_contas_concedente c ON c.id = i.concedente_id AND c.tenant_id::text = ${tenantId}
      WHERE i.tenant_id::text = ${tenantId} AND i.excluido_em IS NULL
        AND (${filtros.projetoId ?? null}::bigint IS NULL OR i.projeto_id = ${filtros.projetoId ?? null}::bigint)
        AND (${filtros.status ?? null}::text IS NULL OR i.situacao = ${filtros.status ?? null})
        AND (${filtros.busca ? `%${filtros.busca}%` : null}::text IS NULL OR i.numero_instrumento ILIKE ${filtros.busca ? `%${filtros.busca}%` : null} OR i.titulo ILIKE ${filtros.busca ? `%${filtros.busca}%` : null} OR i.objeto ILIKE ${filtros.busca ? `%${filtros.busca}%` : null})
      ORDER BY p.nome NULLS LAST, i.termino_vigencia NULLS LAST, i.numero_instrumento NULLS LAST, i.id
    `);
        return rows;
    }
    async obterTermoParceriaRelatorio(tenantId, termoId) {
        const instrumento = await prisma.$queryRaw(Prisma.sql `
      SELECT i.*, p.nome AS projeto_nome, c.razao_social AS concedente_nome
      FROM prestacao_contas_instrumento i
      LEFT JOIN projetos p ON p.id = i.projeto_id AND p.tenant_id::text = ${tenantId}
      LEFT JOIN prestacao_contas_concedente c ON c.id = i.concedente_id AND c.tenant_id::text = ${tenantId}
      WHERE i.id = ${termoId}::bigint AND i.tenant_id::text = ${tenantId} AND i.excluido_em IS NULL
      LIMIT 1
    `);
        if (!instrumento[0])
            return null;
        const [metas, rubricas, receitas, despesas, unidades, aditivos, documentos, timeline] = await Promise.all([
            prisma.$queryRaw(Prisma.sql `SELECT * FROM prestacao_contas_meta WHERE instrumento_id = ${termoId}::bigint AND tenant_id::text = ${tenantId} AND excluido_em IS NULL ORDER BY id`),
            prisma.$queryRaw(Prisma.sql `SELECT * FROM prestacao_contas_rubrica WHERE instrumento_id = ${termoId}::bigint AND tenant_id::text = ${tenantId} AND excluido_em IS NULL ORDER BY categoria, id`),
            prisma.$queryRaw(Prisma.sql `SELECT * FROM prestacao_contas_receita WHERE instrumento_id = ${termoId}::bigint AND tenant_id::text = ${tenantId} AND excluido_em IS NULL ORDER BY data_prevista, id`),
            prisma.$queryRaw(Prisma.sql `SELECT * FROM prestacao_contas_despesa WHERE instrumento_id = ${termoId}::bigint AND tenant_id::text = ${tenantId} AND excluido_em IS NULL ORDER BY data_pagamento, id`),
            prisma.$queryRaw(Prisma.sql `SELECT u.*, ua.nome_fantasia AS unidade_nome FROM prestacao_contas_instrumento_unidade u LEFT JOIN unidade_assistencial ua ON ua.id = u.unidade_id AND ua.tenant_id::text = ${tenantId} WHERE u.instrumento_id = ${termoId}::bigint AND u.tenant_id::text = ${tenantId} AND u.excluido_em IS NULL ORDER BY u.id`),
            prisma.$queryRaw(Prisma.sql `SELECT * FROM prestacao_contas_aditivo WHERE instrumento_id = ${termoId}::bigint AND tenant_id::text = ${tenantId} AND excluido_em IS NULL ORDER BY data_aditivo, id`),
            prisma.$queryRaw(Prisma.sql `SELECT * FROM prestacao_contas_documento WHERE instrumento_id = ${termoId}::bigint AND tenant_id::text = ${tenantId} AND excluido_em IS NULL ORDER BY categoria, id`),
            prisma.$queryRaw(Prisma.sql `SELECT * FROM prestacao_contas_timeline WHERE instrumento_id = ${termoId}::bigint AND tenant_id::text = ${tenantId} ORDER BY data_evento, id`)
        ]);
        return { instrumento: instrumento[0], metas, rubricas, receitas, despesas, unidades, aditivos, documentos, timeline };
    }
    async obterInstituicaoRelatorio(tenantId) {
        const filtroTenant = tenantId ? Prisma.sql `WHERE ua.tenant_id::text = ${tenantId}` : Prisma.empty;
        const rows = await prisma.$queryRaw(Prisma.sql `
      SELECT
        ua.razao_social,
        ua.nome_fantasia,
        ua.cnpj,
        ua.telefone,
        ua.email,
        ua.site,
        e.logradouro,
        e.numero,
        e.bairro,
        e.cidade,
        e.estado AS uf,
        e.cep,
        iu.logomarca_relatorio,
        iu.logomarca
      FROM unidade_assistencial ua
      LEFT JOIN endereco e ON e.id = ua.endereco_id
      LEFT JOIN imagens_unidade iu ON iu.unidade_id = ua.id
      ${filtroTenant}
      ORDER BY ua.unidade_principal DESC, ua.atualizado_em DESC, ua.criado_em ASC
      LIMIT 1
    `);
        const unidade = rows[0];
        if (!unidade) {
            return {
                razaoSocial: "Instituicao nao cadastrada",
                nomeFantasia: "",
                unidadeNome: "",
                cnpj: "",
                enderecoCompleto: "",
                cep: "",
                cidade: "",
                uf: "",
                telefone: "",
                email: "",
                site: "",
                logoUrl: undefined,
                rodape: {
                    linha1: "Instituicao nao cadastrada",
                    linha2: "",
                    linha3: ""
                }
            };
        }
        const nomeInstituicao = unidade.razao_social || unidade.nome_fantasia || "Instituicao nao cadastrada";
        const nomeUnidade = unidade.nome_fantasia || unidade.razao_social || "";
        const partesEndereco = [unidade.logradouro, unidade.numero, unidade.bairro, unidade.cidade].filter(Boolean);
        const enderecoCompleto = partesEndereco.join(", ");
        const linha2Partes = [];
        if (unidade.cnpj)
            linha2Partes.push(`CNPJ: ${unidade.cnpj}`);
        if (enderecoCompleto)
            linha2Partes.push(enderecoCompleto);
        const linha3Partes = [unidade.telefone, unidade.email, unidade.site].filter(Boolean);
        return {
            razaoSocial: nomeInstituicao,
            nomeFantasia: unidade.nome_fantasia ?? "",
            unidadeNome: nomeUnidade,
            cnpj: unidade.cnpj ?? "",
            enderecoCompleto,
            cep: unidade.cep ?? "",
            cidade: unidade.cidade ?? "",
            uf: unidade.uf ?? "",
            telefone: unidade.telefone ?? "",
            email: unidade.email ?? "",
            site: unidade.site ?? "",
            logoUrl: unidade.logomarca_relatorio ?? unidade.logomarca ?? undefined,
            rodape: {
                linha1: nomeInstituicao,
                linha2: linha2Partes.join(" | "),
                linha3: linha3Partes.join(" | ")
            }
        };
    }
}
