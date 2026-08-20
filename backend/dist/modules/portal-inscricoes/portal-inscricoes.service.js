import { Prisma } from "@prisma/client";
import { prisma } from "../../database/prisma.js";
import { AppError } from "../../shared/errors/app-error.js";
import { preInscricaoSchema } from "./portal-inscricoes.schema.js";
import { storageService } from "../arquivos/services/storage-instance.js";
const digits = (v) => String(v ?? "").replace(/\D/g, "");
const text = (v) => String(v ?? "").trim();
const iso = (v) => (v instanceof Date ? v.toISOString() : v ? new Date(String(v)).toISOString() : null);
const time = (v) => { if (!v)
    return undefined; if (v instanceof Date)
    return v.toISOString().slice(11, 16); const value = String(v); const match = value.match(/(\d{2}:\d{2})/); return match?.[1] ?? value.slice(0, 5); };
const publicStatus = (row) => {
    const now = Date.now();
    const start = row.inscricao_abertura ? new Date(row.inscricao_abertura).getTime() : 0;
    const end = row.inscricao_encerramento ? new Date(row.inscricao_encerramento).getTime() : Number.MAX_SAFE_INTEGER;
    if (now < start)
        return "EM_BREVE";
    if (now > end)
        return "ENCERRADAS";
    if (Number(row.vagas_disponiveis ?? 0) > 0)
        return Number(row.vagas_disponiveis) <= 3 ? "ULTIMAS_VAGAS" : "ABERTAS";
    return row.permite_lista_espera ? "LISTA_ESPERA" : "ENCERRADAS";
};
const mapOpportunity = (r) => ({
    id: String(r.id), nome: r.nome, tipo: r.tipo, descricao: r.descricao_publica || r.descricao || "",
    imagem: r.imagem || undefined, modalidade: r.modalidade, local: [r.unidade_nome || "Local a definir", r.dias_semana ? `Dias: ${r.dias_semana}` : null, time(r.horario_inicial) ? `Horário: ${time(r.horario_inicial)}` : null, r.modalidade ? `Modalidade: ${r.modalidade.toLowerCase()}` : null].filter(Boolean).join(" • "),
    periodo: r.dias_semana || undefined, horario: time(r.horario_inicial),
    cargaHoraria: r.carga_horaria, vagasDisponiveis: Number(r.vagas_disponiveis ?? 0), vagasTotais: Number(r.vagas_totais ?? 0),
    publicoAlvo: r.publico_alvo, prerequisitos: r.prerequisitos, documentos: r.documentos_necessarios || [],
    perguntas: r.perguntas_publicas || [], abertura: iso(r.inscricao_abertura), encerramento: iso(r.inscricao_encerramento), status: publicStatus(r), permiteListaEspera: r.permite_lista_espera
});
export class PortalInscricoesService {
    async listarInstituicoes() {
        return prisma.$queryRaw(Prisma.sql `SELECT slug, COALESCE(nome_fantasia, razao_social) AS nome FROM instituicoes WHERE status = 'ativo' ORDER BY COALESCE(nome_fantasia, razao_social)`);
    }
    async tenant(slug, tenantId) {
        const rows = await prisma.$queryRaw(Prisma.sql `SELECT id::text, tenant_id::text, COALESCE(nome_fantasia, razao_social) nome, razao_social, slug, email, telefone, endereco, logo_url, cor_tema FROM instituicoes WHERE status = 'ativo' AND (${slug ? Prisma.sql `LOWER(slug) = ${slug.toLowerCase()}` : Prisma.sql `tenant_id::text = ${tenantId ?? ""}`}) LIMIT 1`);
        if (!rows[0])
            throw new AppError("Instituição não encontrada ou indisponível.", 404);
        return rows[0];
    }
    async opportunity(id, tenantId) {
        const rows = await prisma.$queryRaw(Prisma.sql `SELECT c.*, u.nome_fantasia unidade_nome FROM cursos_atendimentos c LEFT JOIN unidade_assistencial u ON u.id = c.unidade_id AND u.tenant_id = c.tenant_id WHERE c.id = ${id}::bigint AND c.tenant_id::text = ${tenantId} AND c.inscricao_publica = TRUE LIMIT 1`);
        if (!rows[0])
            throw new AppError("Oportunidade não encontrada ou não está disponível.", 404);
        return rows[0];
    }
    async listar(slug, tenantId, busca) {
        const t = await this.tenant(slug, tenantId);
        const q = text(busca);
        const rows = await prisma.$queryRaw(Prisma.sql `SELECT c.*, u.nome_fantasia unidade_nome FROM cursos_atendimentos c LEFT JOIN unidade_assistencial u ON u.id = c.unidade_id AND u.tenant_id = c.tenant_id WHERE c.tenant_id::text = ${t.tenant_id} AND c.inscricao_publica = TRUE AND (${q} = '' OR c.nome ILIKE ${`%${q}%`} OR COALESCE(c.descricao_publica,c.descricao,'') ILIKE ${`%${q}%`}) ORDER BY c.inscricao_encerramento NULLS LAST, c.nome LIMIT 100`);
        return { instituicao: { nome: t.nome, razaoSocial: t.razao_social, slug: t.slug, email: t.email, telefone: t.telefone, endereco: t.endereco, logoUrl: t.logo_url, corPrincipal: t.cor_tema }, oportunidades: rows.map(mapOpportunity) };
    }
    async detalhes(id, slug, tenantId) { const t = await this.tenant(slug, tenantId); return mapOpportunity(await this.opportunity(id, t.tenant_id)); }
    async obterImagemOportunidade(id, slug) { const t = await this.tenant(slug); const rows = await prisma.$queryRaw(Prisma.sql `SELECT imagem FROM cursos_atendimentos WHERE id=${id}::bigint AND tenant_id::text=${t.tenant_id} AND inscricao_publica=TRUE LIMIT 1`); const caminho = rows[0]?.imagem?.trim(); if (caminho) {
        try {
            return await storageService.obterConteudoPorCaminhoBruto(caminho);
        }
        catch {
            try {
                return await storageService.obterConteudoPorCaminhoBruto(`tenants/${t.tenant_id}/${caminho}`);
            }
            catch { /* usa a identidade visual da unidade como fallback */ }
        }
    } const logos = await prisma.$queryRaw(Prisma.sql `SELECT COALESCE(im.logomarca_relatorio, im.logomarca) AS logo FROM unidade_assistencial ua LEFT JOIN imagens_unidade im ON im.unidade_id=ua.id WHERE ua.tenant_id::text=${t.tenant_id} AND COALESCE(im.logomarca_relatorio, im.logomarca) IS NOT NULL ORDER BY ua.unidade_principal DESC NULLS LAST, ua.id LIMIT 1`); const logo = logos[0]?.logo?.trim(); if (logo) {
        try {
            return await storageService.obterConteudoPorCaminhoBruto(logo);
        }
        catch {
            return storageService.obterConteudoPorCaminhoBruto(`tenants/${t.tenant_id}/${logo}`);
        }
    } throw new AppError("Imagem não encontrada.", 404); }
    async cpfExistente(cpfRaw, slug) { const t = await this.tenant(slug); const cpf = digits(cpfRaw); const rows = await prisma.$queryRaw(Prisma.sql `SELECT b.id::text, b.nome_completo, b.data_nascimento FROM cadastro_beneficiario b WHERE b.tenant_id = ${t.tenant_id} AND regexp_replace(COALESCE((SELECT d.numero_documento FROM documentos d WHERE d.beneficiario_id=b.id AND upper(COALESCE(d.tipo_documento,'')) IN ('CPF','CADASTRO DE PESSOA FISICA') ORDER BY d.id LIMIT 1),''),'\\D','','g') = ${cpf} LIMIT 1`); return rows[0] ? { encontrado: true, nome: rows[0].nome_completo, dataNascimento: iso(rows[0].data_nascimento)?.slice(0, 10) } : { encontrado: false }; }
    async criar(input, ctx) {
        const data = preInscricaoSchema.parse(input);
        const t = await this.tenant(ctx.slug);
        const c = await this.opportunity(String(data.cursoId), t.tenant_id);
        const status = publicStatus(c);
        if (!["ABERTAS", "ULTIMAS_VAGAS", "LISTA_ESPERA"].includes(status))
            throw new AppError("As inscrições para esta oportunidade não estão abertas.", 409);
        const cpf = digits(data.cpf);
        const existing = await prisma.$queryRaw(Prisma.sql `SELECT id FROM portal_pre_inscricoes WHERE tenant_id=${t.tenant_id} AND curso_id=${data.cursoId} AND cpf=${cpf} AND status IN ('AGUARDANDO_ANALISE','EM_ANALISE','DOCUMENTACAO_PENDENTE','LISTA_ESPERA') LIMIT 1`);
        if (existing[0])
            throw new AppError("Já existe uma pré-inscrição ativa para este CPF nesta oportunidade.", 409);
        const row = await prisma.$transaction(async (tx) => { const n = await tx.$queryRaw(Prisma.sql `SELECT COALESCE(MAX(id),0)+1 seq FROM portal_pre_inscricoes WHERE tenant_id=${t.tenant_id}`); const protocolo = `PRE-${new Date().getFullYear()}-${String(Number(n[0]?.seq ?? 1)).padStart(6, "0")}`; const inserted = await tx.$queryRaw(Prisma.sql `INSERT INTO portal_pre_inscricoes (tenant_id,curso_id,protocolo,nome_completo,cpf,data_nascimento,telefone,whatsapp,email,endereco_json,respostas_json,status,origem,utm_json,termos_versao,termos_ip,termos_tenant_id) VALUES (${t.tenant_id},${data.cursoId},${protocolo},${data.nomeCompleto},${cpf},${data.dataNascimento}::date,${data.telefone || null},${data.whatsapp || null},${data.email || null},${JSON.stringify(data.endereco ?? {})}::jsonb,${JSON.stringify(data.respostas ?? {})}::jsonb,${status === "LISTA_ESPERA" ? "LISTA_ESPERA" : "AGUARDANDO_ANALISE"},${data.origem || "acesso direto"},${JSON.stringify(data.utm ?? {})}::jsonb,${data.termosVersao},${ctx.ip || null},${t.tenant_id}) RETURNING id::text, protocolo, status`); await tx.$executeRaw(Prisma.sql `INSERT INTO portal_pre_inscricoes_historico (tenant_id,pre_inscricao_id,acao,status_novo,descricao,ip) VALUES (${t.tenant_id},${inserted[0].id},'CRIADA',${inserted[0].status},'Pré-inscrição recebida pelo portal público.',${ctx.ip || null})`); return inserted[0]; });
        return { protocolo: row.protocolo, status: row.status };
    }
    async acompanhar(protocolo, cpfRaw, slug) { const t = await this.tenant(slug); const rows = await prisma.$queryRaw(Prisma.sql `SELECT p.protocolo,p.status,p.criado_em,p.atualizado_em,c.nome atividade FROM portal_pre_inscricoes p JOIN cursos_atendimentos c ON c.id=p.curso_id AND c.tenant_id=p.tenant_id WHERE p.tenant_id=${t.tenant_id} AND p.protocolo=${text(protocolo).toUpperCase()} AND p.cpf=${digits(cpfRaw)} LIMIT 1`); if (!rows[0])
        throw new AppError("Não encontramos uma inscrição com esses dados.", 404); return { protocolo: rows[0].protocolo, status: rows[0].status, atividade: rows[0].atividade, criadoEm: iso(rows[0].criado_em), atualizadoEm: iso(rows[0].atualizado_em) }; }
    async anexarDocumento(slug, protocolo, cpfRaw, file) { const t = await this.tenant(slug); const rows = await prisma.$queryRaw(Prisma.sql `SELECT id,documentos_json FROM portal_pre_inscricoes WHERE tenant_id=${t.tenant_id} AND protocolo=${text(protocolo).toUpperCase()} AND cpf=${digits(cpfRaw)} LIMIT 1`); if (!rows[0])
        throw new AppError("Pré-inscrição não encontrada.", 404); const arquivo = await storageService.salvarUpload(file, { scope: "educacional_documento", entidadeId: BigInt(rows[0].id), entidadeTipo: "PORTAL_PRE_INSCRICAO", tenantId: t.tenant_id, observacao: "Documento enviado pelo Portal Público" }); const docs = Array.isArray(rows[0].documentos_json) ? rows[0].documentos_json : []; docs.push({ nome: file.originalname, caminho: arquivo.caminhoArquivo, mimeType: file.mimetype, tamanho: file.size }); await prisma.$executeRaw(Prisma.sql `UPDATE portal_pre_inscricoes SET documentos_json=${JSON.stringify(docs)}::jsonb, atualizado_em=NOW() WHERE id=${rows[0].id}`); return { nome: file.originalname, documentoAnexado: true }; }
    async adminResumo(tenantId) { const rows = await prisma.$queryRaw(Prisma.sql `SELECT status,COUNT(*)::int total FROM portal_pre_inscricoes WHERE tenant_id=${tenantId} GROUP BY status`); return Object.fromEntries(rows.map((r) => [r.status, r.total])); }
    async adminList(tenantId, query) { const status = text(query.status); return prisma.$queryRaw(Prisma.sql `SELECT p.id::text,p.protocolo,p.nome_completo,p.cpf,p.status,p.criado_em,c.nome atividade FROM portal_pre_inscricoes p JOIN cursos_atendimentos c ON c.id=p.curso_id AND c.tenant_id=p.tenant_id WHERE p.tenant_id=${tenantId} AND (${status}='' OR p.status=${status}) ORDER BY p.criado_em DESC LIMIT 200`); }
    async adminDetalhe(id, tenantId) { const r = await prisma.$queryRaw(Prisma.sql `SELECT p.*,c.nome atividade FROM portal_pre_inscricoes p JOIN cursos_atendimentos c ON c.id=p.curso_id AND c.tenant_id=p.tenant_id WHERE p.id=${id}::bigint AND p.tenant_id=${tenantId} LIMIT 1`); if (!r[0])
        throw new AppError("Pré-inscrição não encontrada.", 404); const h = await prisma.$queryRaw(Prisma.sql `SELECT acao,status_anterior,status_novo,descricao,usuario_nome,criado_em FROM portal_pre_inscricoes_historico WHERE pre_inscricao_id=${id}::bigint AND tenant_id=${tenantId} ORDER BY criado_em`); return { ...r[0], cpf: `${String(r[0].cpf).slice(0, 3)}.***.***-${String(r[0].cpf).slice(-2)}`, historico: h }; }
    async configurarPublicacao(id, input, tenantId) { const r = await prisma.$queryRaw(Prisma.sql `UPDATE cursos_atendimentos SET inscricao_publica=${input.inscricaoPublica}, inscricao_abertura=${input.inscricaoAbertura || null}, inscricao_encerramento=${input.inscricaoEncerramento || null}, permite_lista_espera=${input.permiteListaEspera ?? false}, limite_lista_espera=${input.limiteListaEspera ?? null}, descricao_publica=${input.descricaoPublica ?? null}, publico_alvo=${input.publicoAlvo ?? null}, prerequisitos=${input.prerequisitos ?? null}, modalidade=${input.modalidade ?? "PRESENCIAL"}, atualizado_em=NOW() WHERE id=${id}::bigint AND tenant_id=${tenantId} RETURNING id::text, inscricao_publica`); if (!r[0])
        throw new AppError("Curso ou atendimento não encontrado.", 404); return r[0]; }
    async acao(id, acao, motivo, ctx) {
        const statusMap = { aprovar: "APROVADA", rejeitar: "NAO_APROVADA", espera: "LISTA_ESPERA", complementar: "DOCUMENTACAO_PENDENTE", cancelar: "CANCELADA" };
        const novo = statusMap[acao];
        if (!novo)
            throw new AppError("Ação não reconhecida.", 400);
        if ((novo === "NAO_APROVADA" || novo === "DOCUMENTACAO_PENDENTE") && !text(motivo))
            throw new AppError("Informe o motivo desta decisão.", 400);
        return prisma.$transaction(async (tx) => { const p = (await tx.$queryRaw(Prisma.sql `SELECT p.*,c.vagas_disponiveis FROM portal_pre_inscricoes p JOIN cursos_atendimentos c ON c.id=p.curso_id AND c.tenant_id=p.tenant_id WHERE p.id=${id}::bigint AND p.tenant_id=${ctx.tenantId} FOR UPDATE`))[0]; if (!p)
            throw new AppError("Pré-inscrição não encontrada.", 404); if (!["AGUARDANDO_ANALISE", "EM_ANALISE", "LISTA_ESPERA", "DOCUMENTACAO_PENDENTE"].includes(p.status))
            throw new AppError("Esta pré-inscrição já foi finalizada.", 409); if (novo === "APROVADA") {
            const c = (await tx.$queryRaw(Prisma.sql `SELECT * FROM cursos_atendimentos WHERE id=${p.curso_id} AND tenant_id=${ctx.tenantId} FOR UPDATE`))[0];
            if (Number(c.vagas_disponiveis ?? 0) <= 0)
                throw new AppError("Não há mais vagas disponíveis para aprovar esta inscrição.", 409);
            const m = (await tx.$queryRaw(Prisma.sql `INSERT INTO cursos_atendimentos_matriculas (tenant_id,curso_id,beneficiario_nome,cpf,email,status) VALUES (${ctx.tenantId},${p.curso_id},${p.nome_completo},${p.cpf},${p.email},'ATIVA') RETURNING id`))[0];
            await tx.$executeRaw(Prisma.sql `UPDATE cursos_atendimentos SET vagas_disponiveis=vagas_disponiveis-1, atualizado_em=NOW() WHERE id=${p.curso_id} AND tenant_id=${ctx.tenantId}`);
            await tx.$executeRaw(Prisma.sql `UPDATE portal_pre_inscricoes SET matricula_id=${m.id}, status=${novo}, motivo=${motivo || null}, analisado_em=NOW(), analisado_por=${ctx.usuarioId || null}, atualizado_em=NOW() WHERE id=${id}::bigint AND tenant_id=${ctx.tenantId}`);
        }
        else
            await tx.$executeRaw(Prisma.sql `UPDATE portal_pre_inscricoes SET status=${novo}, motivo=${motivo || null}, analisado_em=NOW(), analisado_por=${ctx.usuarioId || null}, atualizado_em=NOW() WHERE id=${id}::bigint AND tenant_id=${ctx.tenantId}`); await tx.$executeRaw(Prisma.sql `INSERT INTO portal_pre_inscricoes_historico (tenant_id,pre_inscricao_id,acao,status_anterior,status_novo,descricao,usuario_id,usuario_nome,ip) VALUES (${ctx.tenantId},${id}::bigint,${acao.toUpperCase()},${p.status},${novo},${motivo || null},${ctx.usuarioId || null},${ctx.usuarioNome || null},${ctx.ip || null})`); return { id, status: novo }; });
    }
}
