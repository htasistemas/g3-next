import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { normalizeDigits, toOptionalDate, trimOrUndefined } from "../../../utils/string-utils.js";
import { BeneficiarioRepository } from "../repositories/beneficiario.repository.js";
import { mapBeneficiarioToResponse } from "../beneficiario.mapper.js";
const pesosPadrao = {
    identificacao: 20,
    contatos: 10,
    endereco: 15,
    familia: 15,
    socioeconomico: 15,
    documentos: 10,
    consentimentos: 10,
    programas: 5
};
const gruposAtualizacao = [
    "IDENTIFICACAO",
    "CONTATOS",
    "ENDERECO",
    "FAMILIA",
    "SOCIOECONOMICO",
    "SAUDE_BASICA",
    "PROGRAMAS",
    "DOCUMENTOS",
    "CONSENTIMENTOS"
];
const tiposConsentimentoPadrao = [
    "TRATAMENTO_DADOS",
    "COMUNICACAO_TELEFONE",
    "COMUNICACAO_WHATSAPP",
    "COMUNICACAO_EMAIL",
    "USO_IMAGEM",
    "PARTICIPACAO_PROJETOS",
    "COMPARTILHAMENTO_AUTORIZADO",
    "CONTATO_RESPONSAVEL",
    "RECEBIMENTO_INFORMACOES",
    "OUTROS"
];
function parseId(rawId) {
    const id = Number(rawId);
    if (!Number.isInteger(id) || id <= 0) {
        throw new AppError("Identificador de beneficiario invalido.", 400);
    }
    return BigInt(id);
}
function parseTenantId(rawTenantId) {
    const tenantId = rawTenantId?.trim();
    if (!tenantId) {
        throw new AppError("Tenant da sessao nao identificado.", 401);
    }
    return tenantId;
}
function normalizarTextoBusca(value) {
    const texto = trimOrUndefined(value);
    if (!texto)
        return undefined;
    return texto
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}
function usuarioIdBigInt(rawUsuarioId) {
    const parsed = Number(rawUsuarioId);
    return Number.isInteger(parsed) && parsed > 0 ? BigInt(parsed) : null;
}
function valorPresente(value) {
    if (value === null || value === undefined)
        return false;
    if (typeof value === "string")
        return value.trim().length > 0;
    if (Array.isArray(value))
        return value.length > 0;
    return true;
}
function mascararCpf(cpf) {
    const digits = normalizeDigits(cpf) ?? "";
    if (digits.length !== 11)
        return cpf ?? undefined;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}
function mascararTelefone(telefone) {
    const digits = normalizeDigits(telefone) ?? "";
    if (digits.length === 10)
        return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    if (digits.length === 11)
        return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    return telefone ?? undefined;
}
export class BeneficiarioEvolucaoService {
    repository = new BeneficiarioRepository();
    async analisarDuplicidade(rawPayload, ator) {
        const tenantId = parseTenantId(ator.tenantId);
        const payload = (rawPayload && typeof rawPayload === "object" ? rawPayload : {});
        const cpf = normalizeDigits(String(payload.cpf ?? ""));
        const telefone = normalizeDigits(String(payload.telefone_principal ?? payload.telefone ?? ""));
        const nome = String(payload.nome_completo ?? "").trim();
        const nomeSocial = String(payload.nome_social ?? "").trim();
        const nomeMae = String(payload.nome_mae ?? "").trim();
        const nomePai = String(payload.nome_pai ?? "").trim();
        const rg = normalizeDigits(String(payload.rg_numero ?? payload.rg ?? ""));
        const dataNascimento = String(payload.data_nascimento ?? "").trim();
        const endereco = String(payload.endereco_resumido ??
            [payload.logradouro, payload.numero, payload.bairro, payload.municipio, payload.uf]
                .filter(Boolean)
                .join(" ")).trim();
        const idIgnorado = payload.id_beneficiario ? parseId(String(payload.id_beneficiario)) : undefined;
        const conditions = [Prisma.sql `b.tenant_id::text = ${tenantId}`];
        if (idIgnorado)
            conditions.push(Prisma.sql `b.id <> ${idIgnorado}`);
        const filtros = [];
        if (cpf) {
            filtros.push(Prisma.sql `EXISTS (
        SELECT 1 FROM documentos d
        WHERE d.beneficiario_id = b.id
          AND upper(coalesce(d.tipo_documento, '')) = 'CPF'
          AND regexp_replace(coalesce(d.numero_documento, ''), '[^0-9]', '', 'g') = ${cpf}
      )`);
        }
        if (rg) {
            filtros.push(Prisma.sql `EXISTS (
        SELECT 1 FROM documentos d
        WHERE d.beneficiario_id = b.id
          AND upper(coalesce(d.tipo_documento, '')) = 'RG'
          AND regexp_replace(coalesce(d.numero_documento, ''), '[^0-9A-Za-z]', '', 'g') = ${rg}
      )`);
        }
        if (telefone) {
            filtros.push(Prisma.sql `EXISTS (
        SELECT 1 FROM contato_beneficiario c
        WHERE c.beneficiario_id = b.id
          AND regexp_replace(coalesce(c.telefone_principal, ''), '[^0-9]', '', 'g') = ${telefone}
      )`);
        }
        if (nome) {
            filtros.push(Prisma.sql `b.nome_completo ILIKE ${`%${nome}%`}`);
        }
        if (nomeSocial) {
            filtros.push(Prisma.sql `coalesce(b.nome_social, '') ILIKE ${`%${nomeSocial}%`}`);
        }
        if (nomeMae) {
            filtros.push(Prisma.sql `coalesce(b.nome_mae, '') ILIKE ${`%${nomeMae}%`}`);
        }
        if (nomePai) {
            filtros.push(Prisma.sql `coalesce(b.nome_pai, '') ILIKE ${`%${nomePai}%`}`);
        }
        if (dataNascimento) {
            const data = toOptionalDate(dataNascimento);
            if (data)
                filtros.push(Prisma.sql `b.data_nascimento = ${data}`);
        }
        if (endereco) {
            filtros.push(Prisma.sql `EXISTS (
        SELECT 1 FROM endereco e
        WHERE e.id = b.endereco_id
          AND concat_ws(' ', e.logradouro, e.numero, e.bairro, e.cidade, e.estado) ILIKE ${`%${endereco}%`}
      )`);
        }
        if (!filtros.length) {
            return { duplicidades: [], total: 0 };
        }
        const rows = await prisma.$queryRaw(Prisma.sql `
      SELECT
        b.id,
        b.codigo,
        b.nome_completo,
        b.nome_social,
        b.data_nascimento,
        b.nome_mae,
        b.status,
        b.foto_3x4,
        doc_cpf.numero_documento AS cpf,
        contato.telefone_principal,
        concat_ws(', ', e.logradouro, e.numero, e.bairro, e.cidade, e.estado) AS endereco_resumido
      FROM cadastro_beneficiario b
      LEFT JOIN endereco e ON e.id = b.endereco_id
      LEFT JOIN LATERAL (
        SELECT d.numero_documento
        FROM documentos d
        WHERE d.beneficiario_id = b.id
          AND upper(coalesce(d.tipo_documento, '')) = 'CPF'
        ORDER BY d.id DESC
        LIMIT 1
      ) doc_cpf ON TRUE
      LEFT JOIN LATERAL (
        SELECT c.telefone_principal
        FROM contato_beneficiario c
        WHERE c.beneficiario_id = b.id
        ORDER BY c.atualizado_em DESC, c.id DESC
        LIMIT 1
      ) contato ON TRUE
      WHERE ${Prisma.join(conditions, " AND ")}
        AND (${Prisma.join(filtros, " OR ")})
      ORDER BY b.atualizado_em DESC, b.id DESC
      LIMIT 10
    `);
        const nomeBusca = normalizarTextoBusca(nome);
        const maeBusca = normalizarTextoBusca(nomeMae);
        const duplicidades = rows.map((row) => {
            let score = 0;
            if (cpf && normalizeDigits(String(row.cpf ?? "")) === cpf)
                score += 45;
            if (telefone && normalizeDigits(String(row.telefone_principal ?? "")) === telefone)
                score += 10;
            if (dataNascimento && String(row.data_nascimento ?? "").startsWith(dataNascimento))
                score += 10;
            if (nomeBusca && normalizarTextoBusca(String(row.nome_completo ?? "")) === nomeBusca)
                score += 20;
            if (maeBusca && normalizarTextoBusca(String(row.nome_mae ?? "")) === maeBusca)
                score += 10;
            if (score === 0)
                score = 35;
            return {
                id_beneficiario: String(row.id ?? ""),
                codigo: row.codigo ? String(row.codigo) : undefined,
                foto_3x4: row.foto_3x4 ? String(row.foto_3x4) : undefined,
                nome: String(row.nome_completo ?? ""),
                nome_social: row.nome_social ? String(row.nome_social) : undefined,
                cpf_mascarado: mascararCpf(String(row.cpf ?? "")),
                data_nascimento: row.data_nascimento instanceof Date ? row.data_nascimento.toISOString().slice(0, 10) : undefined,
                nome_mae: row.nome_mae ? String(row.nome_mae) : undefined,
                telefone_mascarado: mascararTelefone(String(row.telefone_principal ?? "")),
                endereco_resumido: row.endereco_resumido ? String(row.endereco_resumido) : undefined,
                status: row.status ? String(row.status) : undefined,
                similaridade: Math.min(100, score)
            };
        });
        return { duplicidades, total: duplicidades.length };
    }
    async criarRapido(rawPayload, ator) {
        const tenantId = parseTenantId(ator.tenantId);
        const payload = (rawPayload && typeof rawPayload === "object" ? rawPayload : {});
        const nomeCompleto = String(payload.nome_completo ?? "").trim();
        if (nomeCompleto.length < 3) {
            throw new AppError("Informe o nome completo.", 422);
        }
        const cpf = normalizeDigits(String(payload.cpf ?? ""));
        const telefone = normalizeDigits(String(payload.telefone_principal ?? payload.telefone ?? ""));
        const email = trimOrUndefined(String(payload.email ?? ""))?.toLowerCase();
        const dataNascimento = toOptionalDate(String(payload.data_nascimento ?? ""));
        const nomeMae = trimOrUndefined(String(payload.nome_mae ?? ""));
        const observacao = trimOrUndefined(String(payload.observacao ?? payload.observacoes ?? ""));
        const usuarioId = usuarioIdBigInt(ator.usuarioId);
        const duplicidades = await this.analisarDuplicidade(payload, ator);
        if (cpf && duplicidades.duplicidades.some((item) => item.cpf_mascarado === mascararCpf(cpf))) {
            throw new AppError("Ja existe cadastro com este CPF neste tenant.", 409);
        }
        const codigoRows = await prisma.$queryRaw(Prisma.sql `
      SELECT MAX(CAST(codigo AS INTEGER)) AS max_code
      FROM cadastro_beneficiario
      WHERE codigo IS NOT NULL
        AND codigo ~ '^[0-9]+$'
        AND tenant_id::text = ${tenantId}
    `);
        const codigo = String((codigoRows[0]?.max_code ?? 0) + 1).padStart(4, "0");
        const criado = await prisma.$transaction(async (tx) => {
            const pessoaRows = await tx.$queryRaw(Prisma.sql `
        INSERT INTO pessoa (
          tenant_id, nome_completo, data_nascimento, nome_mae, cpf_normalizado,
          telefone_normalizado, email_normalizado, origem_cadastro, criado_em, atualizado_em
        ) VALUES (
          ${tenantId}::uuid, ${nomeCompleto}, ${dataNascimento}, ${nomeMae ?? null}, ${cpf || null},
          ${telefone || null}, ${email ?? null}, 'BENEFICIARIO_RAPIDO', NOW(), NOW()
        )
        RETURNING id
      `);
            const pessoaId = pessoaRows[0].id;
            const beneficiarioRows = await tx.$queryRaw(Prisma.sql `
        INSERT INTO cadastro_beneficiario (
          tenant_id, pessoa_id, codigo, nome_completo, data_nascimento, nome_mae,
          status, status_cadastral, modo_cadastro, criado_em, atualizado_em
        ) VALUES (
          ${tenantId}::uuid, ${pessoaId}, ${codigo}, ${nomeCompleto}, ${dataNascimento},
          ${nomeMae ?? null}, 'INCOMPLETO', 'INCOMPLETO', 'RAPIDO', NOW(), NOW()
        )
        RETURNING id
      `);
            const beneficiarioId = beneficiarioRows[0].id;
            if (telefone || email) {
                await tx.$executeRaw(Prisma.sql `
          INSERT INTO contato_beneficiario (
            tenant_id, beneficiario_id, telefone_principal, email, permite_contato_tel,
            permite_contato_sms, criado_em, atualizado_em
          ) VALUES (
            ${tenantId}::uuid, ${beneficiarioId}, ${telefone || null}, ${email ?? null}, TRUE,
            FALSE, NOW(), NOW()
          )
        `);
            }
            if (cpf) {
                await tx.$executeRaw(Prisma.sql `
          INSERT INTO documentos (
            tenant_id, beneficiario_id, tipo_documento, numero_documento, categoria,
            documento_principal, criado_em, atualizado_em
          ) VALUES (
            ${tenantId}::uuid, ${beneficiarioId}, 'CPF', ${cpf}, 'CPF', TRUE, NOW(), NOW()
          )
        `);
            }
            await tx.$executeRaw(Prisma.sql `
        INSERT INTO observacoes_beneficiario (
          tenant_id, beneficiario_id, aceite_lgpd, data_aceite_lgpd, observacoes, criado_em, atualizado_em
        ) VALUES (
          ${tenantId}::uuid, ${beneficiarioId}, ${Boolean(payload.consentimento_minimo ?? payload.aceite_lgpd)},
          ${Boolean(payload.consentimento_minimo ?? payload.aceite_lgpd) ? new Date() : null}, ${observacao ?? null}, NOW(), NOW()
        )
      `);
            if (Boolean(payload.consentimento_minimo ?? payload.aceite_lgpd)) {
                await tx.$executeRaw(Prisma.sql `
          INSERT INTO beneficiario_consentimento (
            tenant_id, beneficiario_id, tipo, situacao, data_aceite, versao_termo,
            finalidade, canal_coleta, usuario_responsavel_id, observacao
          ) VALUES (
            ${tenantId}::uuid, ${beneficiarioId}, 'TRATAMENTO_DADOS', 'ACEITO', NOW(), '1',
            'Cadastro rapido de beneficiario', 'PRESENCIAL', ${usuarioId}, ${observacao ?? null}
          )
        `);
            }
            await this.registrarAuditoriaTx(tx, beneficiarioId, pessoaId, "CRIACAO_RAPIDA", "cadastro", null, null, ator);
            return beneficiarioId;
        });
        await this.recalcularCompletude(String(criado), ator);
        const beneficiario = await this.repository.buscarPorIdOuFalhar(criado, tenantId);
        return { beneficiario: mapBeneficiarioToResponse(beneficiario), duplicidades: duplicidades.duplicidades };
    }
    async recalcularCompletude(rawId, ator) {
        const tenantId = parseTenantId(ator.tenantId);
        const id = parseId(rawId);
        const record = await this.repository.buscarPorIdOuFalhar(id, tenantId);
        const beneficiario = mapBeneficiarioToResponse(record);
        const familiaRows = await prisma.$queryRaw(Prisma.sql `
      SELECT vf.id, vf.nome_familia
      FROM vinculo_familiar_membro m
      INNER JOIN vinculo_familiar vf ON vf.id = m.vinculo_familiar_id
      WHERE m.beneficiario_id = ${id}
        AND vf.tenant_id::text = ${tenantId}
        AND vf.status <> 'INATIVO'
      LIMIT 1
    `);
        const consentimentosRows = await prisma.$queryRaw(Prisma.sql `
      SELECT COUNT(*)::integer AS total
      FROM beneficiario_consentimento
      WHERE beneficiario_id = ${id}
        AND tenant_id::text = ${tenantId}
        AND situacao = 'ACEITO'
    `);
        const grupos = {
            identificacao: this.calcularGrupo(beneficiario, [
                ["nome_completo", "Nome completo"],
                ["data_nascimento", "Data de nascimento"],
                ["cpf", "CPF"],
                ["nome_mae", "Nome da mae"]
            ]),
            contatos: this.calcularGrupo(beneficiario, [["telefone_principal", "Telefone principal"], ["email", "E-mail"]]),
            endereco: this.calcularGrupo(beneficiario, [["cep", "CEP"], ["logradouro", "Logradouro"], ["bairro", "Bairro"], ["municipio", "Municipio"], ["uf", "UF"]]),
            familia: { percentual: familiaRows.length ? 100 : 0, pendencias: familiaRows.length ? [] : [{ grupo: "familia", campo: "familia", label: "Familia vinculada" }] },
            socioeconomico: this.calcularGrupo(beneficiario, [["renda_mensal", "Renda individual"], ["fonte_renda", "Origem da renda"], ["nivel_escolaridade", "Escolaridade"]]),
            documentos: { percentual: (beneficiario.documentos_obrigatorios?.length || beneficiario.cpf) ? 100 : 0, pendencias: beneficiario.documentos_obrigatorios?.length || beneficiario.cpf ? [] : [{ grupo: "documentos", campo: "documentos", label: "Documentos anexados ou informados" }] },
            consentimentos: { percentual: Number(consentimentosRows[0]?.total ?? 0) > 0 || beneficiario.aceite_lgpd ? 100 : 0, pendencias: Number(consentimentosRows[0]?.total ?? 0) > 0 || beneficiario.aceite_lgpd ? [] : [{ grupo: "consentimentos", campo: "consentimento", label: "Consentimento minimo" }] },
            programas: this.calcularGrupo(beneficiario, [["status", "Situacao do beneficiario"]])
        };
        for (const [nomeGrupo, grupo] of Object.entries(grupos)) {
            grupo.pendencias = grupo.pendencias.map((pendencia) => ({ ...pendencia, grupo: nomeGrupo }));
        }
        const pendencias = Object.values(grupos).flatMap((grupo) => grupo.pendencias);
        const percentual = Math.min(100, Math.round(Object.entries(pesosPadrao).reduce((total, [grupo, peso]) => {
            const item = grupos[grupo];
            return total + (item.percentual / 100) * peso;
        }, 0)));
        const statusCadastral = percentual >= 95 ? "COMPLETO" : percentual >= 50 ? "BASICO" : "INCOMPLETO";
        const recomendacao = pendencias[0]
            ? `Preencher ${pendencias[0].label.toLowerCase()} na etapa ${pendencias[0].grupo}.`
            : "Cadastro completo para os pesos atuais.";
        await prisma.$executeRaw(Prisma.sql `
      INSERT INTO beneficiario_completude (
        tenant_id, beneficiario_id, percentual, status_cadastral, pendencias, grupos, recomendacao,
        calculado_em, criado_em, atualizado_em
      ) VALUES (
        ${tenantId}::uuid, ${id}, ${percentual}, ${statusCadastral}, ${JSON.stringify(pendencias)}::jsonb,
        ${JSON.stringify(grupos)}::jsonb, ${recomendacao}, NOW(), NOW(), NOW()
      )
      ON CONFLICT (beneficiario_id)
      DO UPDATE SET
        percentual = EXCLUDED.percentual,
        status_cadastral = EXCLUDED.status_cadastral,
        pendencias = EXCLUDED.pendencias,
        grupos = EXCLUDED.grupos,
        recomendacao = EXCLUDED.recomendacao,
        calculado_em = NOW(),
        atualizado_em = NOW()
    `);
        await prisma.$executeRaw(Prisma.sql `
      UPDATE cadastro_beneficiario
      SET percentual_completude = ${percentual},
          status_cadastral = ${statusCadastral},
          completude_calculada_em = NOW()
      WHERE id = ${id}
        AND tenant_id::text = ${tenantId}
    `);
        return {
            percentual,
            status_cadastral: statusCadastral,
            pendencias,
            grupos,
            calculado_em: new Date().toISOString(),
            recomendacao
        };
    }
    async obterCompletude(rawId, ator) {
        const tenantId = parseTenantId(ator.tenantId);
        const id = parseId(rawId);
        const rows = await prisma.$queryRaw(Prisma.sql `
      SELECT percentual, status_cadastral, pendencias, grupos, recomendacao, calculado_em
      FROM beneficiario_completude
      WHERE beneficiario_id = ${id}
        AND tenant_id::text = ${tenantId}
      LIMIT 1
    `);
        if (!rows[0]) {
            return this.recalcularCompletude(rawId, ator);
        }
        return {
            percentual: Number(rows[0].percentual ?? 0),
            status_cadastral: String(rows[0].status_cadastral ?? "INCOMPLETO"),
            pendencias: rows[0].pendencias ?? [],
            grupos: rows[0].grupos ?? {},
            recomendacao: rows[0].recomendacao ? String(rows[0].recomendacao) : undefined,
            calculado_em: rows[0].calculado_em instanceof Date ? rows[0].calculado_em.toISOString() : String(rows[0].calculado_em ?? "")
        };
    }
    async listarConsentimentos(rawId, ator) {
        const tenantId = parseTenantId(ator.tenantId);
        const id = parseId(rawId);
        await this.repository.buscarPorIdOuFalhar(id, tenantId);
        const rows = await prisma.$queryRaw(Prisma.sql `
      SELECT id, tipo, situacao, data_aceite, data_revogacao, validade, versao_termo,
             finalidade, canal_coleta, responsavel_legal_nome, observacao, evidencia, criado_em, atualizado_em
      FROM beneficiario_consentimento
      WHERE beneficiario_id = ${id}
        AND tenant_id::text = ${tenantId}
      ORDER BY atualizado_em DESC, id DESC
    `);
        return {
            tipos: tiposConsentimentoPadrao,
            consentimentos: rows.map((row) => ({
                id: String(row.id ?? ""),
                tipo: String(row.tipo ?? ""),
                situacao: String(row.situacao ?? ""),
                data_aceite: row.data_aceite instanceof Date ? row.data_aceite.toISOString() : undefined,
                data_revogacao: row.data_revogacao instanceof Date ? row.data_revogacao.toISOString() : undefined,
                validade: row.validade instanceof Date ? row.validade.toISOString().slice(0, 10) : undefined,
                versao_termo: row.versao_termo ? String(row.versao_termo) : undefined,
                finalidade: row.finalidade ? String(row.finalidade) : undefined,
                canal_coleta: row.canal_coleta ? String(row.canal_coleta) : undefined,
                responsavel_legal_nome: row.responsavel_legal_nome ? String(row.responsavel_legal_nome) : undefined,
                observacao: row.observacao ? String(row.observacao) : undefined,
                evidencia: row.evidencia ? "Evidencia registrada" : undefined,
                criado_em: row.criado_em instanceof Date ? row.criado_em.toISOString() : undefined,
                atualizado_em: row.atualizado_em instanceof Date ? row.atualizado_em.toISOString() : undefined
            }))
        };
    }
    async registrarConsentimento(rawId, rawPayload, ator) {
        const tenantId = parseTenantId(ator.tenantId);
        const id = parseId(rawId);
        await this.repository.buscarPorIdOuFalhar(id, tenantId);
        const payload = (rawPayload && typeof rawPayload === "object" ? rawPayload : {});
        const tipo = String(payload.tipo ?? "").trim().toUpperCase();
        if (!tipo)
            throw new AppError("Informe o tipo do consentimento.", 422);
        const situacao = String(payload.situacao ?? "ACEITO").trim().toUpperCase();
        const usuarioId = usuarioIdBigInt(ator.usuarioId);
        await prisma.$executeRaw(Prisma.sql `
      INSERT INTO beneficiario_consentimento (
        tenant_id, beneficiario_id, tipo, situacao, data_aceite, data_revogacao, validade,
        versao_termo, finalidade, canal_coleta, usuario_responsavel_id, responsavel_legal_nome,
        observacao, evidencia, criado_em, atualizado_em
      ) VALUES (
        ${tenantId}::uuid, ${id}, ${tipo}, ${situacao},
        ${situacao === "ACEITO" ? new Date() : null},
        ${situacao === "REVOGADO" ? new Date() : null},
        ${toOptionalDate(String(payload.validade ?? ""))},
        ${trimOrUndefined(String(payload.versao_termo ?? "1"))},
        ${trimOrUndefined(String(payload.finalidade ?? ""))},
        ${trimOrUndefined(String(payload.canal_coleta ?? "PRESENCIAL"))},
        ${usuarioId},
        ${trimOrUndefined(String(payload.responsavel_legal_nome ?? ""))},
        ${trimOrUndefined(String(payload.observacao ?? ""))},
        ${trimOrUndefined(String(payload.evidencia ?? ""))},
        NOW(),
        NOW()
      )
    `);
        await this.registrarAuditoria(id, "ALTERACAO_CONSENTIMENTO", "consentimento", null, situacao, ator);
        await this.recalcularCompletude(rawId, ator);
        return this.listarConsentimentos(rawId, ator);
    }
    async listarAuditoria(rawId, ator, completa = false) {
        const tenantId = parseTenantId(ator.tenantId);
        const id = parseId(rawId);
        await this.repository.buscarPorIdOuFalhar(id, tenantId);
        const rows = await prisma.$queryRaw(Prisma.sql `
      SELECT id, criado_em, usuario_nome, acao, modulo, campo_alterado, valor_anterior,
             valor_posterior, origem_alteracao, tenant_id::text AS tenant_id, endereco_ip, request_id, visibilidade
      FROM beneficiario_auditoria
      WHERE beneficiario_id = ${id}
        AND tenant_id::text = ${tenantId}
        ${completa ? Prisma.empty : Prisma.sql `AND visibilidade = 'OPERACIONAL'`}
      ORDER BY criado_em DESC, id DESC
      LIMIT 200
    `);
        return {
            auditoria: rows.map((row) => ({
                id: String(row.id ?? ""),
                data_hora: row.criado_em instanceof Date ? row.criado_em.toISOString() : String(row.criado_em ?? ""),
                usuario: row.usuario_nome ? String(row.usuario_nome) : "Sistema",
                acao: String(row.acao ?? ""),
                modulo: String(row.modulo ?? ""),
                campo_alterado: row.campo_alterado ? String(row.campo_alterado) : undefined,
                valor_anterior: completa && row.valor_anterior ? String(row.valor_anterior) : undefined,
                valor_posterior: completa && row.valor_posterior ? String(row.valor_posterior) : undefined,
                origem_alteracao: String(row.origem_alteracao ?? ""),
                tenant: completa ? String(row.tenant_id ?? "") : undefined,
                endereco_ip: completa && row.endereco_ip ? String(row.endereco_ip) : undefined,
                request_id: completa && row.request_id ? String(row.request_id) : undefined
            }))
        };
    }
    async obterResumoFamilia(rawId, ator) {
        const tenantId = parseTenantId(ator.tenantId);
        const id = parseId(rawId);
        await this.repository.buscarPorIdOuFalhar(id, tenantId);
        const rows = await prisma.$queryRaw(Prisma.sql `
      SELECT
        vf.id,
        vf.nome_familia,
        vf.status,
        vf.renda_familiar_total,
        vf.renda_per_capita,
        vf.id_referencia_familiar,
        m.parentesco,
        m.responsavel_familiar,
        m.usa_endereco_familia,
        (
          SELECT jsonb_agg(jsonb_build_object(
            'id_beneficiario', bm.beneficiario_id::text,
            'nome', cb.nome_completo,
            'codigo', cb.codigo,
            'parentesco', bm.parentesco,
            'responsavel_familiar', bm.responsavel_familiar
          ) ORDER BY cb.nome_completo)
          FROM vinculo_familiar_membro bm
          INNER JOIN cadastro_beneficiario cb ON cb.id = bm.beneficiario_id
          WHERE bm.vinculo_familiar_id = vf.id
            AND bm.tenant_id::text = ${tenantId}
        ) AS integrantes
      FROM vinculo_familiar_membro m
      INNER JOIN vinculo_familiar vf ON vf.id = m.vinculo_familiar_id
      WHERE m.beneficiario_id = ${id}
        AND m.tenant_id::text = ${tenantId}
        AND vf.tenant_id::text = ${tenantId}
        AND vf.status <> 'INATIVO'
      ORDER BY vf.atualizado_em DESC
      LIMIT 1
    `);
        const familia = rows[0];
        return {
            familia: familia
                ? {
                    id_familia: String(familia.id ?? ""),
                    nome_familia: String(familia.nome_familia ?? ""),
                    status: String(familia.status ?? ""),
                    renda_familiar_total: familia.renda_familiar_total ? String(familia.renda_familiar_total) : undefined,
                    renda_per_capita: familia.renda_per_capita ? String(familia.renda_per_capita) : undefined,
                    id_referencia_familiar: familia.id_referencia_familiar ? String(familia.id_referencia_familiar) : undefined,
                    parentesco: familia.parentesco ? String(familia.parentesco) : undefined,
                    responsavel_familiar: Boolean(familia.responsavel_familiar),
                    reside_mesmo_endereco: Boolean(familia.usa_endereco_familia ?? true),
                    integrantes: familia.integrantes ?? []
                }
                : null
        };
    }
    async listarPendencias(ator, rawQuery) {
        const tenantId = parseTenantId(ator.tenantId);
        const query = (rawQuery && typeof rawQuery === "object" ? rawQuery : {});
        const tipo = trimOrUndefined(String(query.tipo_pendencia ?? ""));
        const rows = await prisma.$queryRaw(Prisma.sql `
      SELECT b.id, b.codigo, b.nome_completo, b.status, c.percentual, c.status_cadastral, c.pendencias, c.calculado_em
      FROM cadastro_beneficiario b
      LEFT JOIN beneficiario_completude c ON c.beneficiario_id = b.id
      WHERE b.tenant_id::text = ${tenantId}
        AND (
          ${tipo ? Prisma.sql `c.pendencias::text ILIKE ${`%${tipo}%`}` : Prisma.sql `TRUE`}
        )
        AND (
          c.percentual IS NULL
          OR c.percentual < 95
          OR b.status IN ('INCOMPLETO', 'DESATUALIZADO', 'EM_ANALISE')
        )
      ORDER BY COALESCE(c.percentual, 0) ASC, b.atualizado_em DESC
      LIMIT 200
    `);
        return {
            pendencias: rows.map((row) => ({
                id_beneficiario: String(row.id ?? ""),
                codigo: row.codigo ? String(row.codigo) : undefined,
                nome_completo: String(row.nome_completo ?? ""),
                status: row.status ? String(row.status) : undefined,
                percentual: Number(row.percentual ?? 0),
                status_cadastral: row.status_cadastral ? String(row.status_cadastral) : "INCOMPLETO",
                pendencias: row.pendencias ?? [],
                calculado_em: row.calculado_em instanceof Date ? row.calculado_em.toISOString() : undefined
            }))
        };
    }
    async registrarAtualizacaoGrupos(rawId, ator, origemInformacao = "ATUALIZACAO_ADMINISTRATIVA") {
        const tenantId = parseTenantId(ator.tenantId);
        const id = parseId(rawId);
        const usuarioId = usuarioIdBigInt(ator.usuarioId);
        for (const grupo of gruposAtualizacao) {
            await prisma.$executeRaw(Prisma.sql `
        INSERT INTO beneficiario_atualizacao_grupo (
          tenant_id, beneficiario_id, grupo, atualizado_em, atualizado_por, origem_informacao, nivel_confirmacao
        ) VALUES (
          ${tenantId}::uuid, ${id}, ${grupo}, NOW(), ${usuarioId}, ${origemInformacao}, 'INFORMADO'
        )
        ON CONFLICT (beneficiario_id, grupo)
        DO UPDATE SET
          atualizado_em = NOW(),
          atualizado_por = EXCLUDED.atualizado_por,
          origem_informacao = EXCLUDED.origem_informacao
      `);
        }
    }
    async garantirPessoaBeneficiario(rawId, ator) {
        const tenantId = parseTenantId(ator.tenantId);
        const id = parseId(rawId);
        const existente = await prisma.$queryRaw(Prisma.sql `
      SELECT pessoa_id
      FROM cadastro_beneficiario
      WHERE id = ${id}
        AND tenant_id::text = ${tenantId}
      LIMIT 1
    `);
        if (!existente[0]) {
            throw new AppError("Beneficiario nao encontrado.", 404);
        }
        if (existente[0].pessoa_id) {
            return existente[0].pessoa_id;
        }
        const rows = await prisma.$queryRaw(Prisma.sql `
      INSERT INTO pessoa (
        tenant_id,
        nome_completo,
        nome_social,
        data_nascimento,
        nome_mae,
        nome_pai,
        cpf_normalizado,
        telefone_normalizado,
        email_normalizado,
        rg_normalizado,
        origem_cadastro,
        criado_em,
        atualizado_em
      )
      SELECT
        b.tenant_id,
        b.nome_completo,
        b.nome_social,
        b.data_nascimento,
        b.nome_mae,
        b.nome_pai,
        cpf.numero_documento,
        contato.telefone_principal,
        lower(nullif(trim(contato.email), '')),
        rg.numero_documento,
        'BENEFICIARIO',
        b.criado_em,
        NOW()
      FROM cadastro_beneficiario b
      LEFT JOIN LATERAL (
        SELECT regexp_replace(coalesce(d.numero_documento, ''), '[^0-9]', '', 'g') AS numero_documento
        FROM documentos d
        WHERE d.beneficiario_id = b.id
          AND upper(coalesce(d.tipo_documento, '')) = 'CPF'
        ORDER BY d.id DESC
        LIMIT 1
      ) cpf ON TRUE
      LEFT JOIN LATERAL (
        SELECT regexp_replace(coalesce(d.numero_documento, ''), '[^0-9A-Za-z]', '', 'g') AS numero_documento
        FROM documentos d
        WHERE d.beneficiario_id = b.id
          AND upper(coalesce(d.tipo_documento, '')) = 'RG'
        ORDER BY d.id DESC
        LIMIT 1
      ) rg ON TRUE
      LEFT JOIN LATERAL (
        SELECT
          regexp_replace(coalesce(c.telefone_principal, ''), '[^0-9]', '', 'g') AS telefone_principal,
          c.email
        FROM contato_beneficiario c
        WHERE c.beneficiario_id = b.id
        ORDER BY c.atualizado_em DESC, c.id DESC
        LIMIT 1
      ) contato ON TRUE
      WHERE b.id = ${id}
        AND b.tenant_id::text = ${tenantId}
      RETURNING id
    `);
        const pessoaId = rows[0]?.id;
        if (!pessoaId) {
            throw new AppError("Nao foi possivel vincular a pessoa ao beneficiario.", 500);
        }
        await prisma.$executeRaw(Prisma.sql `
      UPDATE cadastro_beneficiario
      SET pessoa_id = ${pessoaId}
      WHERE id = ${id}
        AND tenant_id::text = ${tenantId}
    `);
        return pessoaId;
    }
    async registrarAuditoria(rawId, acao, campo, anterior, posterior, ator) {
        const tenantId = parseTenantId(ator.tenantId);
        await prisma.$executeRaw(Prisma.sql `
      INSERT INTO beneficiario_auditoria (
        tenant_id, beneficiario_id, usuario_id, usuario_nome, acao, campo_alterado,
        valor_anterior, valor_posterior, origem_alteracao, endereco_ip, request_id
      ) VALUES (
        ${tenantId}::uuid, ${rawId}, ${usuarioIdBigInt(ator.usuarioId)}, ${ator.usuarioNome ?? null},
        ${acao}, ${campo}, ${anterior === null || anterior === undefined ? null : String(anterior)},
        ${posterior === null || posterior === undefined ? null : String(posterior)}, 'SISTEMA',
        ${ator.ip ?? null}, ${ator.requestId ?? null}
      )
    `);
    }
    async registrarAuditoriaTx(tx, beneficiarioId, pessoaId, acao, campo, anterior, posterior, ator) {
        const tenantId = parseTenantId(ator.tenantId);
        await tx.$executeRaw(Prisma.sql `
      INSERT INTO beneficiario_auditoria (
        tenant_id, beneficiario_id, pessoa_id, usuario_id, usuario_nome, acao, campo_alterado,
        valor_anterior, valor_posterior, origem_alteracao, endereco_ip, request_id
      ) VALUES (
        ${tenantId}::uuid, ${beneficiarioId}, ${pessoaId}, ${usuarioIdBigInt(ator.usuarioId)}, ${ator.usuarioNome ?? null},
        ${acao}, ${campo}, ${anterior === null || anterior === undefined ? null : String(anterior)},
        ${posterior === null || posterior === undefined ? null : String(posterior)}, 'SISTEMA',
        ${ator.ip ?? null}, ${ator.requestId ?? null}
      )
    `);
    }
    calcularGrupo(beneficiario, campos) {
        const pendencias = [];
        let preenchidos = 0;
        for (const [campo, label] of campos) {
            if (valorPresente(beneficiario[campo])) {
                preenchidos += 1;
            }
            else {
                pendencias.push({ grupo: "", campo, label });
            }
        }
        const percentual = campos.length ? Math.round((preenchidos / campos.length) * 100) : 100;
        return {
            percentual,
            pendencias
        };
    }
}
