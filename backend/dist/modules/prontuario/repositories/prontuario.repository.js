import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { normalizeDigits, toOptionalDate, trimOrUndefined } from "../../../utils/string-utils.js";
const estruturaSql = [
    `
    CREATE TABLE IF NOT EXISTS prontuario (
      id BIGSERIAL PRIMARY KEY,
      tenant_id UUID NOT NULL,
      beneficiario_id BIGINT NOT NULL,
      numero_prontuario VARCHAR(40) NOT NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'ATIVO',
      criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
      atualizado_em TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE (tenant_id, beneficiario_id),
      UNIQUE (tenant_id, numero_prontuario)
    )
  `,
    `
    CREATE TABLE IF NOT EXISTS prontuario_atendimento (
      id BIGSERIAL PRIMARY KEY,
      tenant_id UUID NOT NULL,
      prontuario_id BIGINT NOT NULL REFERENCES prontuario(id) ON DELETE CASCADE,
      beneficiario_id BIGINT NOT NULL,
      profissional_id BIGINT,
      usuario_id BIGINT,
      unidade_id BIGINT,
      profissional_nome VARCHAR(200) NOT NULL,
      profissional_categoria VARCHAR(160),
      unidade_nome VARCHAR(200),
      especialidade VARCHAR(160) NOT NULL,
      tipo_atendimento VARCHAR(160) NOT NULL,
      data_atendimento DATE NOT NULL DEFAULT CURRENT_DATE,
      hora_inicio TIMESTAMP,
      hora_fim TIMESTAMP,
      duracao_minutos INTEGER,
      status VARCHAR(30) NOT NULL DEFAULT 'RASCUNHO',
      motivo TEXT,
      demanda_principal TEXT,
      avaliacao TEXT,
      evolucao TEXT,
      intervencoes JSONB NOT NULL DEFAULT '[]'::jsonb,
      conduta TEXT,
      retorno_data DATE,
      observacoes TEXT,
      campos_especificos JSONB NOT NULL DEFAULT '{}'::jsonb,
      restrito BOOLEAN NOT NULL DEFAULT FALSE,
      finalizado_em TIMESTAMP,
      criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
      atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `,
    `
    CREATE TABLE IF NOT EXISTS prontuario_adendo (
      id BIGSERIAL PRIMARY KEY,
      tenant_id UUID NOT NULL,
      atendimento_id BIGINT NOT NULL REFERENCES prontuario_atendimento(id) ON DELETE CASCADE,
      conteudo TEXT NOT NULL,
      motivo TEXT,
      usuario_id BIGINT,
      usuario_nome VARCHAR(200) NOT NULL,
      criado_em TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `,
    `
    CREATE TABLE IF NOT EXISTS prontuario_auditoria (
      id BIGSERIAL PRIMARY KEY,
      tenant_id UUID NOT NULL,
      prontuario_id BIGINT,
      atendimento_id BIGINT,
      acao VARCHAR(60) NOT NULL,
      descricao TEXT NOT NULL,
      usuario_id BIGINT,
      usuario_nome VARCHAR(200),
      criado_em TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `,
    "CREATE INDEX IF NOT EXISTS prontuario_tenant_beneficiario_idx ON prontuario(tenant_id, beneficiario_id)",
    "CREATE INDEX IF NOT EXISTS prontuario_atendimento_tenant_beneficiario_idx ON prontuario_atendimento(tenant_id, beneficiario_id, data_atendimento DESC)",
    "CREATE INDEX IF NOT EXISTS prontuario_atendimento_status_idx ON prontuario_atendimento(tenant_id, status)",
    "CREATE INDEX IF NOT EXISTS prontuario_adendo_atendimento_idx ON prontuario_adendo(tenant_id, atendimento_id, criado_em DESC)",
    "CREATE INDEX IF NOT EXISTS prontuario_auditoria_atendimento_idx ON prontuario_auditoria(tenant_id, atendimento_id, criado_em DESC)"
];
function toOptionalDateTime(value, baseDate) {
    if (!value)
        return undefined;
    const normalized = value.trim();
    if (/^\d{2}:\d{2}$/.test(normalized)) {
        const base = toOptionalDate(baseDate) ?? new Date();
        const [hours, minutes] = normalized.split(":").map(Number);
        base.setHours(hours, minutes, 0, 0);
        return base;
    }
    return toOptionalDate(normalized);
}
let estruturaPromise = null;
export class ProntuarioRepository {
    async ensureEstrutura() {
        if (!estruturaPromise) {
            estruturaPromise = (async () => {
                for (const comando of estruturaSql)
                    await prisma.$executeRawUnsafe(comando);
            })().catch((error) => {
                estruturaPromise = null;
                throw error;
            });
        }
        await estruturaPromise;
    }
    async buscarBeneficiarios(busca, tenantId) {
        await this.ensureEstrutura();
        const termo = trimOrUndefined(busca);
        const like = termo ? `%${termo}%` : "%";
        const digits = `%${normalizeDigits(termo ?? "")}%`;
        return prisma.$queryRaw(Prisma.sql `
      SELECT b.id, b.codigo, b.nome_completo, b.nome_social, b.nome_mae, b.data_nascimento, b.foto_3x4,
             e.bairro,
             c.telefone_principal,
             cpf_doc.numero_documento AS cpf,
             COALESCE((SELECT MAX(pa.hora_fim) FROM prontuario_atendimento pa WHERE pa.beneficiario_id = b.id AND pa.tenant_id::text = ${tenantId}), NULL) AS ultimo_atendimento
      FROM cadastro_beneficiario b
      LEFT JOIN endereco e ON e.id = b.endereco_id
      LEFT JOIN LATERAL (SELECT c.telefone_principal FROM contato_beneficiario c WHERE c.beneficiario_id = b.id ORDER BY c.id DESC LIMIT 1) c ON TRUE
      LEFT JOIN LATERAL (
        SELECT d.numero_documento FROM documentos d
        WHERE d.beneficiario_id = b.id
          AND (UPPER(COALESCE(d.tipo_documento, '')) = 'CPF' OR UPPER(COALESCE(d.nome_documento, '')) LIKE '%CPF%')
        ORDER BY d.id DESC LIMIT 1
      ) cpf_doc ON TRUE
      WHERE b.tenant_id::text = ${tenantId}
        AND (b.nome_completo ILIKE ${like} OR COALESCE(b.codigo, '') ILIKE ${like} OR regexp_replace(COALESCE(cpf_doc.numero_documento, ''), '[^0-9]', '', 'g') LIKE ${digits})
      ORDER BY b.nome_completo ASC
      LIMIT 60
    `);
    }
    async obterContexto(beneficiarioId, tenantId) {
        await this.ensureEstrutura();
        const beneficiarios = await prisma.$queryRaw(Prisma.sql `
      SELECT b.id, b.codigo, b.nome_completo, b.nome_social, b.nome_mae, b.data_nascimento, b.foto_3x4,
             e.bairro,
             c.telefone_principal,
             cpf_doc.numero_documento AS cpf,
             sb.descricao_medicacao AS medicacao_continua,
             sb.cid_principal AS condicoes_relevantes,
             NULL::text AS alergias,
             (SELECT MAX(pa.hora_fim) FROM prontuario_atendimento pa WHERE pa.beneficiario_id = b.id AND pa.tenant_id::text = ${tenantId}) AS ultimo_atendimento
      FROM cadastro_beneficiario b
      LEFT JOIN endereco e ON e.id = b.endereco_id
      LEFT JOIN LATERAL (SELECT c.telefone_principal FROM contato_beneficiario c WHERE c.beneficiario_id = b.id ORDER BY c.id DESC LIMIT 1) c ON TRUE
      LEFT JOIN LATERAL (SELECT d.numero_documento FROM documentos d WHERE d.beneficiario_id = b.id AND (UPPER(COALESCE(d.tipo_documento, '')) = 'CPF' OR UPPER(COALESCE(d.nome_documento, '')) LIKE '%CPF%') ORDER BY d.id DESC LIMIT 1) cpf_doc ON TRUE
      LEFT JOIN LATERAL (SELECT s.descricao_medicacao, s.cid_principal FROM saude_beneficiario s WHERE s.beneficiario_id = b.id ORDER BY s.id DESC LIMIT 1) sb ON TRUE
      WHERE b.id = ${beneficiarioId} AND b.tenant_id::text = ${tenantId}
      LIMIT 1
    `);
        const beneficiario = beneficiarios[0];
        if (!beneficiario)
            throw new AppError("Beneficiário não encontrado.", 404);
        const [atendimentos, rascunhos] = await Promise.all([
            this.listarAtendimentos(beneficiarioId, tenantId),
            this.listarAtendimentos(beneficiarioId, tenantId, ["RASCUNHO", "EM_ATENDIMENTO"])
        ]);
        return { beneficiario, atendimentos, rascunho: rascunhos[0] ?? null };
    }
    async listarAtendimentos(beneficiarioId, tenantId, status) {
        await this.ensureEstrutura();
        const filtroStatus = status?.length ? Prisma.sql `AND pa.status IN (${Prisma.join(status)})` : Prisma.empty;
        return prisma.$queryRaw(Prisma.sql `
      SELECT pa.*, p.nome_completo AS profissional_nome_cadastro, p.categoria AS profissional_categoria_cadastro,
             u.nome_fantasia AS unidade_nome_cadastro,
             COALESCE(pa.profissional_nome, '') AS profissional_nome,
             COALESCE(pa.profissional_categoria, p.categoria) AS profissional_categoria,
             COALESCE(pa.unidade_nome, u.nome_fantasia) AS unidade_nome,
             COALESCE((SELECT json_agg(json_build_object('id', ad.id, 'conteudo', ad.conteudo, 'motivo', ad.motivo, 'usuario_nome', ad.usuario_nome, 'criado_em', ad.criado_em) ORDER BY ad.criado_em DESC) FROM prontuario_adendo ad WHERE ad.atendimento_id = pa.id AND ad.tenant_id::text = ${tenantId}), '[]'::json) AS adendos
      FROM prontuario_atendimento pa
      LEFT JOIN cadastro_profissionais p ON p.id = pa.profissional_id
      LEFT JOIN unidade_assistencial u ON u.id = pa.unidade_id
      WHERE pa.beneficiario_id = ${beneficiarioId} AND pa.tenant_id::text = ${tenantId}
      ${filtroStatus}
      ORDER BY COALESCE(pa.hora_inicio, pa.criado_em) DESC, pa.id DESC
    `);
    }
    async criarAtendimento(beneficiarioId, input, tenantId, usuario) {
        await this.ensureEstrutura();
        await this.validarBeneficiario(beneficiarioId, tenantId);
        const prontuarioId = await this.obterOuCriarProntuario(beneficiarioId, tenantId);
        const existente = await this.listarAtendimentos(beneficiarioId, tenantId, ["RASCUNHO", "EM_ATENDIMENTO"]);
        if (existente.some((item) => String(item.usuario_id ?? "") === String(usuario.id ?? ""))) {
            return existente[0];
        }
        const inserted = await prisma.$queryRaw(Prisma.sql `
      INSERT INTO prontuario_atendimento (
        tenant_id, prontuario_id, beneficiario_id, usuario_id, profissional_id, unidade_id,
        profissional_nome, profissional_categoria, especialidade, tipo_atendimento,
        data_atendimento, hora_inicio, status, motivo, demanda_principal, avaliacao, evolucao,
        intervencoes, conduta, retorno_data, observacoes, campos_especificos, restrito
      ) VALUES (
        ${tenantId}::uuid, ${prontuarioId}, ${beneficiarioId}, ${usuario.id ? BigInt(usuario.id) : null},
        ${input.profissional_id ? BigInt(input.profissional_id) : null}, ${input.unidade_id ? BigInt(input.unidade_id) : null},
        ${usuario.nome ?? usuario.nomeUsuario ?? "Usuário autenticado"}, ${input.especialidade}, ${input.especialidade}, ${input.tipo_atendimento},
      COALESCE(${toOptionalDate(input.data_atendimento) ?? new Date()}, CURRENT_DATE), ${toOptionalDateTime(input.hora_inicio, input.data_atendimento) ?? new Date()},
        ${input.status ?? "EM_ATENDIMENTO"}, ${trimOrUndefined(input.motivo)}, ${trimOrUndefined(input.demanda_principal)}, ${trimOrUndefined(input.avaliacao)}, ${trimOrUndefined(input.evolucao)},
        ${JSON.stringify(input.intervencoes ?? [])}::jsonb, ${trimOrUndefined(input.conduta)}, ${toOptionalDate(input.retorno_data)}, ${trimOrUndefined(input.observacoes)},
        ${JSON.stringify(input.campos_especificos ?? {})}::jsonb, ${!!input.restrito}
      ) RETURNING id
    `);
        const id = inserted[0]?.id;
        if (!id)
            throw new AppError("Não foi possível iniciar o atendimento.", 500);
        await this.registrarAuditoria(prontuarioId, id, "CRIAR", "Prontuário iniciado.", tenantId, usuario);
        return (await this.listarAtendimentos(beneficiarioId, tenantId)).find((item) => item.id === id) ?? null;
    }
    async atualizarAtendimento(id, input, tenantId, usuario) {
        await this.ensureEstrutura();
        const atual = await this.buscarAtendimento(id, tenantId);
        if (!atual)
            throw new AppError("Prontuário não encontrado.", 404);
        if (atual.status === "FINALIZADO" || atual.status === "CANCELADO")
            throw new AppError("Atendimentos finalizados não podem ser editados. Use um adendo.", 409);
        const inicio = input.hora_inicio ? toOptionalDateTime(input.hora_inicio, input.data_atendimento) : atual.hora_inicio;
        const fim = input.hora_fim ? toOptionalDateTime(input.hora_fim, input.data_atendimento) : null;
        const duracao = inicio && fim ? Math.max(0, Math.round((fim.getTime() - new Date(inicio).getTime()) / 60000)) : null;
        await prisma.$executeRaw(Prisma.sql `
      UPDATE prontuario_atendimento SET
        especialidade = ${input.especialidade}, tipo_atendimento = ${input.tipo_atendimento}, data_atendimento = COALESCE(${toOptionalDate(input.data_atendimento)}, data_atendimento),
      hora_inicio = COALESCE(${inicio ?? null}, hora_inicio), hora_fim = ${fim}, duracao_minutos = ${duracao},
        status = COALESCE(${input.status ?? null}, status), motivo = ${trimOrUndefined(input.motivo)}, demanda_principal = ${trimOrUndefined(input.demanda_principal)},
        avaliacao = ${trimOrUndefined(input.avaliacao)}, evolucao = ${trimOrUndefined(input.evolucao)}, intervencoes = ${JSON.stringify(input.intervencoes ?? [])}::jsonb,
        conduta = ${trimOrUndefined(input.conduta)}, retorno_data = ${toOptionalDate(input.retorno_data)}, observacoes = ${trimOrUndefined(input.observacoes)},
        campos_especificos = ${JSON.stringify(input.campos_especificos ?? {})}::jsonb, restrito = ${!!input.restrito}, atualizado_em = NOW()
      WHERE id = ${id} AND tenant_id::text = ${tenantId}
    `);
        await this.registrarAuditoria(atual.prontuario_id, id, "ATUALIZAR", "Rascunho do atendimento atualizado.", tenantId, usuario);
        return this.buscarAtendimento(id, tenantId);
    }
    async finalizarAtendimento(id, tenantId, usuario) {
        await this.ensureEstrutura();
        const atual = await this.buscarAtendimento(id, tenantId);
        if (!atual)
            throw new AppError("Prontuário não encontrado.", 404);
        if (atual.status === "FINALIZADO")
            return atual;
        if (!String(atual.evolucao ?? atual.avaliacao ?? atual.motivo ?? "").trim())
            throw new AppError("Informe ao menos a evolução, avaliação ou motivo antes de finalizar.", 422);
        const fim = new Date();
        const inicio = atual.hora_inicio ? new Date(atual.hora_inicio) : fim;
        const duracao = Math.max(0, Math.round((fim.getTime() - inicio.getTime()) / 60000));
        await prisma.$executeRaw(Prisma.sql `UPDATE prontuario_atendimento SET status = 'FINALIZADO', hora_inicio = COALESCE(hora_inicio, ${fim}), hora_fim = ${fim}, duracao_minutos = ${duracao}, finalizado_em = NOW(), atualizado_em = NOW() WHERE id = ${id} AND tenant_id::text = ${tenantId}`);
        await this.registrarAuditoria(atual.prontuario_id, id, "FINALIZAR", "Prontuário finalizado.", tenantId, usuario);
        return this.buscarAtendimento(id, tenantId);
    }
    async criarAdendo(id, input, tenantId, usuario) {
        await this.ensureEstrutura();
        const atual = await this.buscarAtendimento(id, tenantId);
        if (!atual)
            throw new AppError("Prontuário não encontrado.", 404);
        if (atual.status !== "FINALIZADO")
            throw new AppError("Adendos só podem ser incluídos em atendimentos finalizados.", 409);
        await prisma.$executeRaw(Prisma.sql `INSERT INTO prontuario_adendo (tenant_id, atendimento_id, conteudo, motivo, usuario_id, usuario_nome) VALUES (${tenantId}::uuid, ${id}, ${input.conteudo}, ${trimOrUndefined(input.motivo)}, ${usuario.id ? BigInt(usuario.id) : null}, ${usuario.nome ?? usuario.nomeUsuario ?? "Usuário autenticado"})`);
        await this.registrarAuditoria(atual.prontuario_id, id, "ADENDO", "Adendo incluído no atendimento finalizado.", tenantId, usuario);
        return this.buscarAtendimento(id, tenantId);
    }
    async buscarAtendimento(id, tenantId) {
        const rows = await prisma.$queryRaw(Prisma.sql `SELECT pa.*, COALESCE((SELECT json_agg(json_build_object('id', ad.id, 'conteudo', ad.conteudo, 'motivo', ad.motivo, 'usuario_nome', ad.usuario_nome, 'criado_em', ad.criado_em) ORDER BY ad.criado_em DESC) FROM prontuario_adendo ad WHERE ad.atendimento_id = pa.id AND ad.tenant_id::text = ${tenantId}), '[]'::json) AS adendos FROM prontuario_atendimento pa WHERE pa.id = ${id} AND pa.tenant_id::text = ${tenantId} LIMIT 1`);
        return rows[0] ?? null;
    }
    async validarBeneficiario(id, tenantId) {
        const rows = await prisma.$queryRaw(Prisma.sql `SELECT id FROM cadastro_beneficiario WHERE id = ${id} AND tenant_id::text = ${tenantId} LIMIT 1`);
        if (!rows[0])
            throw new AppError("Beneficiário não encontrado nesta instituição.", 404);
    }
    async obterOuCriarProntuario(beneficiarioId, tenantId) {
        const existente = await prisma.$queryRaw(Prisma.sql `SELECT id FROM prontuario WHERE beneficiario_id = ${beneficiarioId} AND tenant_id::text = ${tenantId} LIMIT 1`);
        if (existente[0])
            return existente[0].id;
        const codigo = `P-${beneficiarioId.toString().padStart(8, "0")}`;
        const criado = await prisma.$queryRaw(Prisma.sql `INSERT INTO prontuario (tenant_id, beneficiario_id, numero_prontuario) VALUES (${tenantId}::uuid, ${beneficiarioId}, ${codigo}) ON CONFLICT (tenant_id, beneficiario_id) DO UPDATE SET atualizado_em = NOW() RETURNING id`);
        if (!criado[0])
            throw new AppError("Não foi possível criar o prontuário.", 500);
        return criado[0].id;
    }
    async registrarAuditoria(prontuarioId, atendimentoId, acao, descricao, tenantId, usuario) {
        await prisma.$executeRaw(Prisma.sql `INSERT INTO prontuario_auditoria (tenant_id, prontuario_id, atendimento_id, acao, descricao, usuario_id, usuario_nome) VALUES (${tenantId}::uuid, ${prontuarioId}, ${atendimentoId}, ${acao}, ${descricao}, ${usuario.id ? BigInt(usuario.id) : null}, ${usuario.nome ?? usuario.nomeUsuario ?? "Usuário autenticado"})`);
    }
}
