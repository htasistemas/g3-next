import { prisma } from "../../../database/prisma.js";
import { ensureMultiTenantStructure } from "../../multi-tenant/tenant-estrutura.service.js";
import { ensureUsuariosGestaoEstrutura } from "../../usuarios/repositories/usuario-estrutura.repository.js";
const EMAIL_ADMIN_PADRAO = "htasistemas@gmail.com";
const EMAIL_DEMO_TORRESOFT = "torresoftbrasil@gmail.com";
const CNPJ_TORRESOFT = "32004110000118";
function mapAuthUsuarioRow(row) {
    if (!row)
        return null;
    const emailAdminPadrao = row.email?.trim().toLowerCase() === "htasistemas@gmail.com";
    const permissoesNormalizadas = Array.from(new Set((row.permissoes ?? [])
        .filter(Boolean)
        .concat(row.perfil_acesso ? [row.perfil_acesso] : [])
        .concat(Boolean(row.is_superadmin) || emailAdminPadrao ? ["MASTER_ADMIN"] : [])));
    return {
        id: row.id,
        nomeUsuario: row.nome_usuario,
        nome: row.nome,
        email: row.email,
        senhaHash: row.senha_hash,
        googleId: row.google_id,
        tenantId: row.tenant_id,
        instituicaoId: row.instituicao_id,
        instituicaoNome: row.instituicao_nome,
        instituicaoSlug: row.instituicao_slug,
        instituicaoCnpj: row.instituicao_cnpj,
        instituicaoPlano: row.instituicao_plano,
        instituicaoStatus: row.instituicao_status,
        instituicaoLogoUrl: row.instituicao_logo_url,
        isSuperadmin: Boolean(row.is_superadmin) || emailAdminPadrao,
        perfilAcesso: row.perfil_acesso,
        exigirAutenticacaoSegura: Boolean(row.exigir_autenticacao_segura),
        permitirBiometriaFacialLogin: Boolean(row.permitir_biometria_facial_login),
        exigirBiometriaFacialLogin: Boolean(row.exigir_biometria_facial_login),
        faceHash: row.face_hash,
        permissoes: permissoesNormalizadas.map((item) => ({
            permissao: { nome: item }
        }))
    };
}
function mapTenantContexto(row) {
    if (!row)
        return null;
    return {
        id: String(row.id),
        tenant_id: String(row.tenant_id),
        codigo: row.codigo ? String(row.codigo) : undefined,
        cnpj: String(row.cnpj),
        razao_social: String(row.razao_social),
        nome_fantasia: row.nome_fantasia ? String(row.nome_fantasia) : undefined,
        slug: String(row.slug),
        email: row.email ? String(row.email) : undefined,
        telefone: row.telefone ? String(row.telefone) : undefined,
        plano: String(row.plano),
        status: String(row.status),
        logo_url: row.logo_url ? String(row.logo_url) : undefined,
        cor_tema: row.cor_tema ? String(row.cor_tema) : undefined
    };
}
function ehEmailAdminPadrao(email) {
    return email?.trim().toLowerCase() === EMAIL_ADMIN_PADRAO;
}
export class AuthRepository {
    async buscarCandidatosGlobaisPorEmail(email) {
        await this.ensureEstrutura();
        return prisma.$queryRawUnsafe(`
      SELECT a.id AS acesso_id, a.identidade_id, a.usuario_id, u.senha_hash,
             i.id::text AS instituicao_id, i.tenant_id::text AS tenant_id,
             COALESCE(i.nome_fantasia, i.razao_social) AS instituicao_nome,
             i.cnpj, uo.nome AS unidade_nome, u.perfil_acesso AS perfil, a.escopo
      FROM usuario_acesso a
      JOIN usuario_identidade ui ON ui.id = a.identidade_id AND lower(ui.email) = lower($1)
      JOIN usuarios u ON u.id = a.usuario_id AND u.deletado_em IS NULL
      JOIN instituicoes i ON i.id = a.instituicao_id
      LEFT JOIN unidades_organizacionais uo ON uo.id = a.unidade_organizacional_id
      WHERE a.ativo = TRUE AND upper(coalesce(ui.status, 'ATIVO')) = 'ATIVO'
        AND upper(coalesce(i.status, 'ATIVO')) = 'ATIVO'
      ORDER BY i.nome_fantasia NULLS LAST, i.razao_social, a.id
    `, email.trim().toLowerCase());
    }
    async buscarAcessoGlobal(acessoId, identidadeId) {
        await this.ensureEstrutura();
        const rows = await prisma.$queryRawUnsafe(`
      SELECT usuario_id, tenant_id::text FROM usuario_acesso
      WHERE id = $1::bigint AND identidade_id = $2::bigint AND ativo = TRUE
      LIMIT 1
    `, acessoId, identidadeId);
        return rows[0] ?? null;
    }
    async listarAcessosPorUsuario(usuarioId) {
        await this.ensureEstrutura();
        return prisma.$queryRawUnsafe(`
      SELECT a.id::text AS acesso_id, i.id::text AS instituicao_id, i.tenant_id::text AS tenant_id,
             COALESCE(i.nome_fantasia, i.razao_social) AS nome_instituicao, i.cnpj,
             uo.nome AS unidade_nome, u.perfil_acesso AS perfil, a.ativo
      FROM usuario_acesso a JOIN instituicoes i ON i.id = a.instituicao_id
      LEFT JOIN usuarios u ON u.id = a.usuario_id
      LEFT JOIN unidades_organizacionais uo ON uo.id = a.unidade_organizacional_id
      WHERE a.usuario_id = $1::bigint AND a.ativo = TRUE ORDER BY nome_instituicao
    `, usuarioId);
    }
    async buscarAcessoPorUsuario(acessoId, usuarioId) {
        await this.ensureEstrutura();
        const rows = await prisma.$queryRawUnsafe(`
      SELECT usuario_id, tenant_id::text FROM usuario_acesso WHERE id = $1::bigint AND usuario_id = $2::bigint AND ativo = TRUE LIMIT 1
    `, acessoId, usuarioId);
        return rows[0] ?? null;
    }
    async listarOpcoesContexto(usuarioId, tenantId) {
        await this.ensureEstrutura();
        const unidades = await prisma.$queryRawUnsafe(`
      SELECT DISTINCT uo.id::text AS id, uo.nome
      FROM usuario_acesso a JOIN unidades_organizacionais uo ON uo.instituicao_id = a.instituicao_id
      WHERE a.usuario_id = $1::bigint AND a.tenant_id::text = $2 AND a.ativo = TRUE
        AND (a.escopo = 'INSTITUICAO' OR a.unidade_organizacional_id = uo.id OR a.entidade_juridica_id = uo.entidade_juridica_id)
      ORDER BY uo.nome
    `, usuarioId, tenantId);
        const projetos = await prisma.$queryRawUnsafe(`
      SELECT DISTINCT p.id::text AS id, p.nome, p.unidade_organizacional_id::text AS unidade_id
      FROM usuario_acesso a JOIN projetos p ON p.instituicao_id = a.instituicao_id
      WHERE a.usuario_id = $1::bigint AND a.tenant_id::text = $2 AND a.ativo = TRUE
        AND (a.escopo = 'INSTITUICAO' OR a.projeto_id = p.id OR a.unidade_organizacional_id = p.unidade_organizacional_id OR a.entidade_juridica_id = p.entidade_juridica_id)
      ORDER BY p.nome
    `, usuarioId, tenantId).catch(() => []);
        return { unidades, projetos };
    }
    async contextoPermitido(usuarioId, tenantId, unidadeId, projetoId) {
        await this.ensureEstrutura();
        const rows = await prisma.$queryRawUnsafe(`
      SELECT EXISTS (
        SELECT 1 FROM usuario_acesso a
        WHERE a.usuario_id = $1::bigint AND a.tenant_id::text = $2 AND a.ativo = TRUE
          AND (a.escopo = 'INSTITUICAO'
            OR (a.escopo = 'UNIDADE' AND a.unidade_organizacional_id = NULLIF($3, '')::bigint)
            OR (a.escopo = 'PROJETO' AND a.projeto_id = NULLIF($4, '')::bigint)
            OR (a.escopo = 'ENTIDADE_JURIDICA' AND (a.entidade_juridica_id = (SELECT entidade_juridica_id FROM unidades_organizacionais WHERE id = NULLIF($3, '')::bigint) OR a.entidade_juridica_id = (SELECT entidade_juridica_id FROM projetos WHERE id = NULLIF($4, '')::bigint)))
          )
      ) AS ok
    `, usuarioId, tenantId, unidadeId ?? "", projetoId ?? "");
        return Boolean(rows[0]?.ok);
    }
    async restaurarAcessoMaster(senhaHash) {
        await this.ensureEstrutura();
        const rows = await prisma.$queryRawUnsafe(`
      SELECT id
      FROM usuarios
      WHERE lower(coalesce(email, '')) = $1
         OR lower(coalesce(nome_usuario, '')) = $1
      ORDER BY is_superadmin DESC, id ASC
      LIMIT 1
      `, EMAIL_ADMIN_PADRAO);
        if (rows[0]?.id) {
            await prisma.$executeRawUnsafe(`
        UPDATE usuarios
        SET nome_usuario = $1,
            email = $1,
            nome = COALESCE(NULLIF(nome, ''), 'Administrador Master'),
            nome_exibicao = COALESCE(NULLIF(nome_exibicao, ''), 'Administrador Master'),
            senha_hash = $2,
            status = 'ATIVO',
            is_superadmin = TRUE,
            perfil_acesso = 'MASTER',
            exigir_troca_senha = FALSE,
            exigir_autenticacao_segura = FALSE,
            permitir_biometria_facial_login = FALSE,
            exigir_biometria_facial_login = FALSE,
            tentativas_login_invalidas = 0,
            ultimo_login_invalido_em = NULL,
            deletado_em = NULL,
            atualizado_em = NOW()
        WHERE id = $3
        `, EMAIL_ADMIN_PADRAO, senhaHash, rows[0].id);
            return rows[0].id;
        }
        const created = await prisma.$queryRawUnsafe(`
      INSERT INTO usuarios (
        nome_usuario, nome, nome_exibicao, email, senha_hash, criado_em, atualizado_em,
        status, exigir_troca_senha, tentativas_login_invalidas, perfil_acesso,
        is_superadmin, exigir_autenticacao_segura, permitir_biometria_facial_login,
        exigir_biometria_facial_login
      )
      VALUES (
        $1, 'Administrador Master', 'Administrador Master', $1, $2, NOW(), NOW(),
        'ATIVO', FALSE, 0, 'MASTER', TRUE, FALSE, FALSE, FALSE
      )
      RETURNING id
      `, EMAIL_ADMIN_PADRAO, senhaHash);
        return created[0].id;
    }
    async restaurarAcessoDemoTorresoft(senhaHash) {
        await this.ensureEstrutura();
        const instituicoes = await prisma.$queryRawUnsafe(`
      SELECT id::text AS id, tenant_id::text AS tenant_id
      FROM instituicoes
      WHERE regexp_replace(cnpj, '\\D', '', 'g') = $1
      LIMIT 1
      `, CNPJ_TORRESOFT);
        const instituicao = instituicoes[0];
        if (!instituicao)
            return null;
        await prisma.$executeRawUnsafe(`
      UPDATE instituicoes
      SET status = 'ATIVO',
          codigo = COALESCE(NULLIF(codigo, ''), 'TORRESOFT'),
          razao_social = COALESCE(NULLIF(razao_social, ''), 'TORRESOFT'),
          nome_fantasia = COALESCE(NULLIF(nome_fantasia, ''), 'Torresoft'),
          slug = COALESCE(NULLIF(slug, ''), 'torresoft'),
          atualizado_em = NOW()
      WHERE id::text = $1
      `, instituicao.id);
        const rows = await prisma.$queryRawUnsafe(`
      SELECT id
      FROM usuarios
      WHERE tenant_id::text = $1
        AND (
          lower(coalesce(email, '')) = $2
          OR lower(coalesce(nome_usuario, '')) = $2
        )
      ORDER BY id ASC
      LIMIT 1
      `, instituicao.tenant_id, EMAIL_DEMO_TORRESOFT);
        const usuarioId = rows[0]?.id;
        if (usuarioId) {
            await prisma.$executeRawUnsafe(`
        UPDATE usuarios
        SET nome_usuario = $2,
            nome = 'Administrador Demonstracao Torresoft',
            nome_exibicao = 'Administrador Demonstracao Torresoft',
            email = $2,
            senha_hash = $3,
            status = 'ATIVO',
            perfil_acesso = 'ADMINISTRADOR',
            is_superadmin = FALSE,
            exigir_troca_senha = FALSE,
            exigir_autenticacao_segura = FALSE,
            permitir_biometria_facial_login = FALSE,
            exigir_biometria_facial_login = FALSE,
            tentativas_login_invalidas = 0,
            ultimo_login_invalido_em = NULL,
            deletado_em = NULL,
            instituicao_id = $4::uuid,
            ultimo_tenant_id = $1::uuid,
            atualizado_em = NOW()
        WHERE id = $5
          AND tenant_id::text = $1
        `, instituicao.tenant_id, EMAIL_DEMO_TORRESOFT, senhaHash, instituicao.id, usuarioId);
            await this.garantirPermissaoUsuario(usuarioId, "ADMINISTRADOR");
            await this.garantirDadosMinimosDemoTorresoft(instituicao);
            return usuarioId;
        }
        const created = await prisma.$queryRawUnsafe(`
      INSERT INTO usuarios (
        nome_usuario, nome, nome_exibicao, email, senha_hash, criado_em, atualizado_em,
        status, exigir_troca_senha, tentativas_login_invalidas, tenant_id, instituicao_id,
        perfil_acesso, is_superadmin, ultimo_tenant_id, exigir_autenticacao_segura,
        permitir_biometria_facial_login, exigir_biometria_facial_login
      )
      VALUES (
        $1, 'Administrador Demonstracao Torresoft', 'Administrador Demonstracao Torresoft',
        $1, $2, NOW(), NOW(), 'ATIVO', FALSE, 0, $3::uuid, $4::uuid,
        'ADMINISTRADOR', FALSE, $3::uuid, FALSE, FALSE, FALSE
      )
      RETURNING id
      `, EMAIL_DEMO_TORRESOFT, senhaHash, instituicao.tenant_id, instituicao.id);
        await this.garantirPermissaoUsuario(created[0].id, "ADMINISTRADOR");
        await this.garantirDadosMinimosDemoTorresoft(instituicao);
        return created[0].id;
    }
    async garantirDadosMinimosDemoTorresoft(instituicao) {
        const tenantId = instituicao.tenant_id;
        await this.executarDemoSeguro("beneficiarios", async () => {
            await prisma.$executeRawUnsafe("ALTER TABLE IF EXISTS cadastro_beneficiario ADD COLUMN IF NOT EXISTS status_cadastral VARCHAR(40)");
            await prisma.$executeRawUnsafe("ALTER TABLE IF EXISTS cadastro_beneficiario ADD COLUMN IF NOT EXISTS modo_cadastro VARCHAR(40)");
            const count = await this.contarTabelaTenant("cadastro_beneficiario", tenantId);
            if (count > 0)
                return;
            for (let i = 0; i < 30; i += 1) {
                await prisma.$executeRawUnsafe(`
          INSERT INTO cadastro_beneficiario (
            codigo, nome_completo, data_nascimento, sexo_biologico, cor_raca,
            estado_civil, nacionalidade, naturalidade_cidade, naturalidade_uf,
            nome_mae, nome_pai, criado_em, atualizado_em, status,
            opta_receber_cesta_basica, apto_receber_cesta_basica, tenant_id,
            status_cadastral, modo_cadastro
          )
          VALUES (
            $1, $2, $3::date, $4, $5, 'Solteiro(a)', 'Brasileira',
            'Uberlandia', 'MG', $6, $7, NOW(), NOW(), 'ATIVO',
            $8, $9, $10::uuid, 'COMPLETO', 'DEMONSTRACAO'
          )
          `, `DEMO-TS-AUTO-BEN-${String(i + 1).padStart(4, "0")}`, `Beneficiario Demo Torresoft ${String(i + 1).padStart(2, "0")}`, `20${String(10 + (i % 12)).padStart(2, "0")}-${String((i % 12) + 1).padStart(2, "0")}-15`, i % 2 === 0 ? "FEMININO" : "MASCULINO", ["Parda", "Branca", "Preta"][i % 3], `Mae Demo Torresoft ${i + 1}`, `Pai Demo Torresoft ${i + 1}`, i % 3 === 0, i % 4 === 0, tenantId);
            }
        });
        await this.executarDemoSeguro("profissionais", async () => {
            const count = await this.contarTabelaTenant("cadastro_profissionais", tenantId);
            if (count > 0)
                return;
            const categorias = ["Assistente social", "Psicologo", "Pedagogo", "Professor", "Administrativo", "Coordenador"];
            for (let i = 0; i < 8; i += 1) {
                await prisma.$executeRawUnsafe(`
          INSERT INTO cadastro_profissionais (
            nome_completo, categoria, email, telefone, unidade, carga_horaria,
            status, resumo, observacoes, criado_em, atualizado_em, tenant_id
          )
          VALUES ($1, $2, $3, $4, 'Unidade Torresoft', 40, 'ATIVO', $5, $6, NOW(), NOW(), $7::uuid)
          `, `Profissional Demo Torresoft ${String(i + 1).padStart(2, "0")}`, categorias[i % categorias.length], `profissional.demo${i + 1}@exemplo.com.br`, `34988${String(100000 + i).slice(0, 6)}`, "Registro ficticio para apresentacao comercial.", "DEMO_TORRESOFT - profissional ficticio.", tenantId);
            }
        });
        await this.executarDemoSeguro("familias", async () => {
            const count = await this.contarTabelaTenant("vinculo_familiar", tenantId);
            if (count > 0)
                return;
            for (let i = 0; i < 10; i += 1) {
                await prisma.$executeRawUnsafe(`
          INSERT INTO vinculo_familiar (
            nome_familia, status, cep, logradouro, numero, bairro, municipio, uf,
            situacao_imovel, tipo_moradia, agua_encanada, esgoto_tipo, coleta_lixo,
            energia_eletrica, internet, arranjo_familiar, qtd_membros,
            renda_familiar_total, renda_per_capita, tecnico_responsavel,
            observacoes, criado_em, atualizado_em, tenant_id
          )
          VALUES (
            $1, 'ATIVO', '38400000', 'Rua Demonstracao Torresoft', $2, $3,
            'Uberlandia', 'MG', 'Alugado', 'Casa', TRUE, 'Rede publica',
            'Regular', TRUE, TRUE, 'Nuclear', $4, $5, $6,
            'Equipe social Torresoft', $7, NOW(), NOW(), $8::uuid
          )
          `, `Familia Demo Torresoft ${String(i + 1).padStart(2, "0")}`, String(100 + i), ["Centro", "Jardim Aurora", "Nova Esperanca"][i % 3], 3 + (i % 4), String(1800 + i * 140).replace(".", ","), String(450 + i * 35).replace(".", ","), "DEMO_TORRESOFT - familia ficticia para painel de apresentacao.", tenantId);
            }
        });
        await this.executarDemoSeguro("almoxarifado", async () => {
            const count = await this.contarTabelaTenant("almoxarifado_item", tenantId);
            if (count > 0)
                return;
            const itens = [
                ["DEMO-TS-AUTO-ALM-001", "Cesta basica demonstrativa", "Alimentos", "un", 120, 85.5],
                ["DEMO-TS-AUTO-ALM-002", "Kit higiene familiar", "Higiene", "kit", 95, 42.9],
                ["DEMO-TS-AUTO-ALM-003", "Material escolar completo", "Educacao", "kit", 80, 68.4],
                ["DEMO-TS-AUTO-ALM-004", "Cobertor social", "Vestuário", "un", 60, 74.2],
                ["DEMO-TS-AUTO-ALM-005", "Livro paradidatico", "Educacao", "un", 140, 29.9],
                ["DEMO-TS-AUTO-ALM-006", "Kit oficina de artes", "Oficinas", "kit", 45, 119.9]
            ];
            for (const item of itens) {
                await prisma.$executeRawUnsafe(`
          INSERT INTO almoxarifado_item (
            tenant_id, codigo, descricao, categoria, unidade, localizacao,
            localizacao_interna, estoque_atual, estoque_minimo, valor_unitario,
            situacao, observacoes, criado_em, atualizado_em
          )
          VALUES ($1::uuid, $2, $3, $4, $5, 'Almoxarifado Torresoft',
                  'Prateleira demonstracao', $6, 10, $7, 'ATIVO', $8, NOW(), NOW())
          `, tenantId, item[0], item[1], item[2], item[3], item[4], item[5], "DEMO_TORRESOFT - item ficticio.");
            }
        });
        await this.executarDemoSeguro("biblioteca", async () => {
            const count = await this.contarTabelaTenant("biblioteca_livro", tenantId);
            if (count > 0)
                return;
            for (let i = 0; i < 12; i += 1) {
                await prisma.$executeRawUnsafe(`
          INSERT INTO biblioteca_livro (
            tenant_id, codigo, titulo, autor, editora, ano_publicacao, categoria,
            quantidade_total, quantidade_disponivel, localizacao, status,
            estado_livro, observacoes, criado_em, atualizado_em
          )
          VALUES ($1::uuid, $2, $3, $4, 'Editora Demonstracao', $5, $6, $7, $8,
                  'Estante demo', 'ATIVO', 'Bom', $9, NOW(), NOW())
          `, tenantId, `TS-LIV-AUTO-${String(i + 1).padStart(4, "0")}`, `Livro Demo Torresoft ${String(i + 1).padStart(2, "0")}`, `Autor Ficticio ${i + 1}`, 2014 + (i % 10), ["Literatura", "Educacao", "Cidadania"][i % 3], 3 + (i % 4), 2 + (i % 3), "DEMO_TORRESOFT - livro ficticio.");
            }
        });
        await this.executarDemoSeguro("patrimonio", async () => {
            const count = await this.contarTabelaTenant("patrimonio_item", tenantId);
            if (count > 0)
                return;
            for (let i = 0; i < 10; i += 1) {
                await prisma.$executeRawUnsafe(`
          INSERT INTO patrimonio_item (
            tenant_id, numero_patrimonio, nome, categoria, conservacao, status,
            data_aquisicao, valor_aquisicao, origem, responsavel, unidade,
            sala, observacoes, criado_em, atualizado_em
          )
          VALUES ($1::uuid, $2, $3, $4, 'Bom', 'ATIVO', $5::date, $6,
                  'Demonstracao', 'Equipe Torresoft', 'Unidade Torresoft',
                  'Sala demo', $7, NOW(), NOW())
          `, tenantId, `TS-PAT-AUTO-${String(i + 1).padStart(4, "0")}`, ["Notebook", "Projetor", "Mesa", "Cadeira", "Impressora"][i % 5] + ` Demo ${i + 1}`, ["Informatica", "Mobiliario", "Equipamentos"][i % 3], `2025-${String((i % 12) + 1).padStart(2, "0")}-10`, 900 + i * 180, "DEMO_TORRESOFT - patrimonio ficticio.");
            }
        });
        await this.executarDemoSeguro("documentos", async () => {
            const count = await this.contarTabelaTenant("documentos_instituicao", tenantId);
            if (count > 0)
                return;
            const documentos = [
                ["Alvara de funcionamento", "Prefeitura Municipal", "vencido", "2026-07-01"],
                ["Certidao negativa municipal", "Prefeitura Municipal", "vence_em_breve", "2026-08-20"],
                ["Ata de diretoria", "Cartorio", "regular", "2027-02-10"],
                ["Plano de trabalho demonstrativo", "Diretoria", "regular", "2027-05-30"]
            ];
            for (let i = 0; i < documentos.length; i += 1) {
                const doc = documentos[i];
                await prisma.$executeRawUnsafe(`
          INSERT INTO documentos_instituicao (
            tenant_id, tipo_documento, orgao_emissor, descricao, categoria,
            emissao, validade, responsavel_interno, modo_renovacao,
            gerar_alerta, situacao, criado_em, atualizado_em
          )
          VALUES ($1::uuid, $2, $3, $4, 'Institucional', '2025-01-10'::date,
                  $5::date, 'Administrador Demonstracao Torresoft', 'Manual',
                  TRUE, $6, NOW(), NOW())
          `, tenantId, doc[0], doc[1], "DEMO_TORRESOFT - documento ficticio para apresentacao.", doc[3], doc[2]);
            }
        });
        await this.executarDemoSeguro("fotos_eventos", async () => {
            const count = await this.contarTabelaTenant("fotos_eventos", tenantId);
            if (count > 0)
                return;
            for (let i = 0; i < 3; i += 1) {
                await prisma.$executeRawUnsafe(`
          INSERT INTO fotos_eventos (
            tenant_id, titulo, descricao, data_evento, local, tags,
            status, criado_em, atualizado_em
          )
          VALUES ($1::uuid, $2, $3, $4::date, 'Unidade Torresoft',
                  'demo,apresentacao,eventos', 'PUBLICADO', NOW(), NOW())
          `, tenantId, `Album Demo Torresoft ${i + 1}`, "DEMO_TORRESOFT - album ficticio para apresentacao.", `2026-0${i + 1}-15`);
            }
        });
        await this.executarDemoSeguro("emprestimos_eventos", async () => {
            const count = await this.contarTabelaTenant("emprestimos_eventos", tenantId);
            if (count > 0)
                return;
            const evento = await prisma.$queryRawUnsafe(`
        INSERT INTO eventos_emprestimos (
          tenant_id, titulo, descricao, local, data_inicio, data_fim,
          status, promovido_por, criado_em, atualizado_em
        )
        VALUES ($1::uuid, 'Evento Demo Torresoft', $2, 'Unidade Torresoft',
                NOW() + INTERVAL '5 days', NOW() + INTERVAL '5 days 4 hours',
                'PLANEJADO', 'Equipe Torresoft', NOW(), NOW())
        RETURNING id
        `, tenantId, "DEMO_TORRESOFT - evento ficticio para emprestimos.");
            if (!evento[0]?.id)
                return;
            await prisma.$executeRawUnsafe(`
        INSERT INTO emprestimos_eventos (
          tenant_id, evento_id, data_retirada_prevista, data_devolucao_prevista,
          status, responsavel_nome, observacoes, criado_em, atualizado_em
        )
        VALUES ($1::uuid, $2, NOW() + INTERVAL '4 days',
                NOW() + INTERVAL '6 days', 'RESERVADO',
                'Administrador Demonstracao Torresoft',
                'DEMO_TORRESOFT - emprestimo ficticio para evento.', NOW(), NOW())
        `, tenantId, evento[0].id);
        });
    }
    async executarDemoSeguro(nome, operacao) {
        try {
            await operacao();
        }
        catch (error) {
            console.warn(`[auth/demo-torresoft] bloco ${nome} ignorado.`, error);
        }
    }
    async contarTabelaTenant(tabela, tenantId) {
        const existe = await prisma.$queryRawUnsafe("SELECT to_regclass($1) IS NOT NULL AS exists", `public.${tabela}`);
        if (!existe[0]?.exists)
            return 1;
        const tenantColumn = await prisma.$queryRawUnsafe(`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = $1
          AND column_name = 'tenant_id'
      ) AS exists
      `, tabela);
        const rows = tenantColumn[0]?.exists
            ? await prisma.$queryRawUnsafe(`SELECT COUNT(*)::bigint AS total FROM "${tabela}" WHERE tenant_id::text = $1`, tenantId)
            : await prisma.$queryRawUnsafe(`SELECT COUNT(*)::bigint AS total FROM "${tabela}"`);
        return Number(rows[0]?.total ?? 0n);
    }
    async garantirPermissaoUsuario(usuarioId, nomePermissao) {
        const permissao = await prisma.$queryRawUnsafe(`
      INSERT INTO permissao (nome)
      SELECT $1
      WHERE NOT EXISTS (SELECT 1 FROM permissao WHERE nome = $1)
      RETURNING id
      `, nomePermissao);
        const permissaoId = permissao[0]?.id ??
            (await prisma.$queryRawUnsafe("SELECT id FROM permissao WHERE nome = $1 LIMIT 1", nomePermissao))[0].id;
        await prisma.$executeRawUnsafe(`
      INSERT INTO usuario_permissao (usuario_id, permissao_id)
      SELECT $1, $2
      WHERE NOT EXISTS (
        SELECT 1
        FROM usuario_permissao
        WHERE usuario_id = $1
          AND permissao_id = $2
      )
      `, usuarioId, permissaoId);
    }
    async buscarUsuarioPorLogin(input) {
        await this.ensureEstrutura();
        const filtrosTenant = await this.resolverFiltroTenant(input);
        const login = input.nomeUsuario?.trim();
        const email = input.email?.trim().toLowerCase();
        const ignorarFiltrosTenant = ehEmailAdminPadrao(email) || ehEmailAdminPadrao(login);
        const rows = await prisma.$queryRawUnsafe(`
      SELECT
        u.id,
        u.nome_usuario,
        u.nome,
        u.email,
        u.senha_hash,
        u.google_id,
        u.tenant_id::text AS tenant_id,
        u.instituicao_id::text AS instituicao_id,
        COALESCE(i.nome_fantasia, i.razao_social) AS instituicao_nome,
        i.slug AS instituicao_slug,
        i.cnpj AS instituicao_cnpj,
        i.plano AS instituicao_plano,
        i.status AS instituicao_status,
        i.logo_url AS instituicao_logo_url,
        u.is_superadmin,
        u.perfil_acesso,
        u.exigir_autenticacao_segura,
        u.permitir_biometria_facial_login,
        u.exigir_biometria_facial_login,
        u.face_hash,
        COALESCE(
          ARRAY_REMOVE(ARRAY_AGG(DISTINCT p.nome), NULL),
          ARRAY[]::text[]
        ) AS permissoes
      FROM usuarios u
      LEFT JOIN instituicoes i ON i.id = u.instituicao_id
      LEFT JOIN usuario_permissao up ON up.usuario_id = u.id
      LEFT JOIN permissao p ON p.id = up.permissao_id
      WHERE
        u.deletado_em IS NULL
        AND (
          ($1::text IS NOT NULL AND lower(coalesce(u.nome_usuario, '')) = lower($1::text))
          OR ($2::text IS NOT NULL AND lower(coalesce(u.email, '')) = lower($2::text))
        )
        AND (
          u.is_superadmin = TRUE
          OR (
            ($3::text IS NULL OR u.tenant_id::text = $3::text)
            AND ($4::text IS NULL OR lower(coalesce(i.cnpj, '')) = lower($4::text))
            AND ($5::text IS NULL OR lower(coalesce(i.slug, '')) = lower($5::text))
            AND ($6::text IS NULL OR lower(coalesce(i.codigo, '')) = lower($6::text))
          )
        )
      GROUP BY
        u.id,
        u.nome_usuario,
        u.nome,
        u.email,
        u.senha_hash,
        u.google_id,
        u.tenant_id,
        u.instituicao_id,
        i.nome_fantasia,
        i.razao_social,
        i.slug,
        i.cnpj,
        i.plano,
        i.status,
        i.logo_url,
        u.is_superadmin,
        u.perfil_acesso,
        u.exigir_autenticacao_segura,
        u.permitir_biometria_facial_login,
        u.exigir_biometria_facial_login,
        u.face_hash
      ORDER BY u.is_superadmin DESC, u.id ASC
      LIMIT 1
      `, login ?? null, email ?? null, ignorarFiltrosTenant ? null : (filtrosTenant.tenant_id ?? null), ignorarFiltrosTenant ? null : (filtrosTenant.cnpj ?? null), ignorarFiltrosTenant ? null : (filtrosTenant.slug ?? null), ignorarFiltrosTenant ? null : (filtrosTenant.codigo ?? null));
        return mapAuthUsuarioRow(rows[0] ?? null);
    }
    async buscarTenantsPorEmail(email) {
        await this.ensureEstrutura();
        const rows = await prisma.$queryRawUnsafe(`
      SELECT DISTINCT ON (u.tenant_id)
        u.tenant_id::text AS tenant_id,
        i.cnpj AS cnpj,
        i.slug AS slug,
        i.codigo AS codigo,
        u.id AS usuario_id,
        u.email AS email
      FROM usuarios u
      INNER JOIN instituicoes i ON i.id = u.instituicao_id
      WHERE lower(coalesce(u.email, '')) = lower($1)
        AND u.deletado_em IS NULL
      ORDER BY u.tenant_id, u.is_superadmin DESC, u.id ASC
      `, email.trim().toLowerCase());
        return rows;
    }
    async buscarUsuarioPorGoogleId(googleId, lookup) {
        await this.ensureEstrutura();
        const filtrosTenant = await this.resolverFiltroTenant(lookup);
        const rows = await prisma.$queryRawUnsafe(`
      SELECT
        u.id,
        u.nome_usuario,
        u.nome,
        u.email,
        u.senha_hash,
        u.google_id,
        u.tenant_id::text AS tenant_id,
        u.instituicao_id::text AS instituicao_id,
        COALESCE(i.nome_fantasia, i.razao_social) AS instituicao_nome,
        i.slug AS instituicao_slug,
        i.cnpj AS instituicao_cnpj,
        i.plano AS instituicao_plano,
        i.status AS instituicao_status,
        i.logo_url AS instituicao_logo_url,
        u.is_superadmin,
        u.perfil_acesso,
        u.exigir_autenticacao_segura,
        u.permitir_biometria_facial_login,
        u.exigir_biometria_facial_login,
        u.face_hash,
        COALESCE(
          ARRAY_REMOVE(ARRAY_AGG(DISTINCT p.nome), NULL),
          ARRAY[]::text[]
        ) AS permissoes
      FROM usuarios u
      LEFT JOIN instituicoes i ON i.id = u.instituicao_id
      LEFT JOIN usuario_permissao up ON up.usuario_id = u.id
      LEFT JOIN permissao p ON p.id = up.permissao_id
      WHERE u.google_id = $1
        AND u.deletado_em IS NULL
        AND (
          u.is_superadmin = TRUE
          OR ($2::text IS NULL OR u.tenant_id::text = $2::text)
        )
      GROUP BY
        u.id,
        u.nome_usuario,
        u.nome,
        u.email,
        u.senha_hash,
        u.google_id,
        u.tenant_id,
        u.instituicao_id,
        i.nome_fantasia,
        i.razao_social,
        i.slug,
        i.cnpj,
        i.plano,
        i.status,
        i.logo_url,
        u.is_superadmin,
        u.perfil_acesso,
        u.exigir_autenticacao_segura,
        u.permitir_biometria_facial_login,
        u.exigir_biometria_facial_login,
        u.face_hash
      ORDER BY u.is_superadmin DESC, u.id ASC
      LIMIT 1
      `, googleId, filtrosTenant.tenant_id ?? null);
        return mapAuthUsuarioRow(rows[0] ?? null);
    }
    async buscarUsuarioPorEmail(email, lookup) {
        await this.ensureEstrutura();
        const filtrosTenant = await this.resolverFiltroTenant(lookup);
        const ignorarFiltrosTenant = ehEmailAdminPadrao(email);
        const rows = await prisma.$queryRawUnsafe(`
      SELECT
        u.id,
        u.nome_usuario,
        u.nome,
        u.email,
        u.senha_hash,
        u.google_id,
        u.tenant_id::text AS tenant_id,
        u.instituicao_id::text AS instituicao_id,
        COALESCE(i.nome_fantasia, i.razao_social) AS instituicao_nome,
        i.slug AS instituicao_slug,
        i.cnpj AS instituicao_cnpj,
        i.plano AS instituicao_plano,
        i.status AS instituicao_status,
        i.logo_url AS instituicao_logo_url,
        u.is_superadmin,
        u.perfil_acesso,
        u.exigir_autenticacao_segura,
        u.permitir_biometria_facial_login,
        u.exigir_biometria_facial_login,
        u.face_hash,
        COALESCE(
          ARRAY_REMOVE(ARRAY_AGG(DISTINCT p.nome), NULL),
          ARRAY[]::text[]
        ) AS permissoes
      FROM usuarios u
      LEFT JOIN instituicoes i ON i.id = u.instituicao_id
      LEFT JOIN usuario_permissao up ON up.usuario_id = u.id
      LEFT JOIN permissao p ON p.id = up.permissao_id
      WHERE lower(coalesce(u.email, '')) = lower($1)
        AND u.deletado_em IS NULL
        AND (
          u.is_superadmin = TRUE
          OR ($2::text IS NULL OR u.tenant_id::text = $2::text)
        )
      GROUP BY
        u.id,
        u.nome_usuario,
        u.nome,
        u.email,
        u.senha_hash,
        u.google_id,
        u.tenant_id,
        u.instituicao_id,
        i.nome_fantasia,
        i.razao_social,
        i.slug,
        i.cnpj,
        i.plano,
        i.status,
        i.logo_url,
        u.is_superadmin,
        u.perfil_acesso,
        u.exigir_autenticacao_segura,
        u.permitir_biometria_facial_login,
        u.exigir_biometria_facial_login,
        u.face_hash
      ORDER BY u.is_superadmin DESC, u.id ASC
      LIMIT 1
      `, email.trim().toLowerCase(), ignorarFiltrosTenant ? null : (filtrosTenant.tenant_id ?? null));
        return mapAuthUsuarioRow(rows[0] ?? null);
    }
    async vincularGooglePorUsuarioId(usuarioId, googleId, fotoUrl) {
        await this.ensureEstrutura();
        await prisma.$executeRawUnsafe(`
      UPDATE usuarios
      SET google_id = $2,
          foto_url = COALESCE($3, foto_url),
          atualizado_em = NOW()
      WHERE id = $1
      `, usuarioId, googleId, fotoUrl ?? null);
        return this.buscarUsuarioPorId(usuarioId);
    }
    async buscarUsuarioPorId(id, tenantId) {
        await this.ensureEstrutura();
        const rows = await prisma.$queryRawUnsafe(`
      SELECT
        u.id,
        u.nome_usuario,
        u.nome,
        u.email,
        u.senha_hash,
        u.google_id,
        u.tenant_id::text AS tenant_id,
        u.instituicao_id::text AS instituicao_id,
        COALESCE(i.nome_fantasia, i.razao_social) AS instituicao_nome,
        i.slug AS instituicao_slug,
        i.cnpj AS instituicao_cnpj,
        i.plano AS instituicao_plano,
        i.status AS instituicao_status,
        i.logo_url AS instituicao_logo_url,
        u.is_superadmin,
        u.perfil_acesso,
        u.exigir_autenticacao_segura,
        u.permitir_biometria_facial_login,
        u.exigir_biometria_facial_login,
        u.face_hash,
        COALESCE(
          ARRAY_REMOVE(ARRAY_AGG(DISTINCT p.nome), NULL),
          ARRAY[]::text[]
        ) AS permissoes
      FROM usuarios u
      LEFT JOIN instituicoes i ON i.id = u.instituicao_id
      LEFT JOIN usuario_permissao up ON up.usuario_id = u.id
      LEFT JOIN permissao p ON p.id = up.permissao_id
      WHERE u.id = $1
        AND u.deletado_em IS NULL
        AND ($2::text IS NULL OR u.tenant_id::text = $2::text)
      GROUP BY
        u.id,
        u.nome_usuario,
        u.nome,
        u.email,
        u.senha_hash,
        u.google_id,
        u.tenant_id,
        u.instituicao_id,
        i.nome_fantasia,
        i.razao_social,
        i.slug,
        i.cnpj,
        i.plano,
        i.status,
        i.logo_url,
        u.is_superadmin,
        u.perfil_acesso,
        u.exigir_autenticacao_segura,
        u.permitir_biometria_facial_login,
        u.exigir_biometria_facial_login,
        u.face_hash
      LIMIT 1
      `, id, tenantId ?? null);
        return mapAuthUsuarioRow(rows[0] ?? null);
    }
    async buscarControleAcessoPorUsuarioId(id) {
        await this.ensureEstrutura();
        const rows = await prisma.$queryRawUnsafe(`
      SELECT
        status,
        exigir_troca_senha,
        tentativas_login_invalidas,
        ultimo_login_invalido_em
      FROM usuarios
      WHERE id = $1
      LIMIT 1
      `, id);
        return rows[0] ?? null;
    }
    async registrarFalhaLogin(id) {
        await this.ensureEstrutura();
        const rows = await prisma.$queryRawUnsafe(`
      UPDATE usuarios
      SET
        tentativas_login_invalidas = COALESCE(tentativas_login_invalidas, 0) + 1,
        ultimo_login_invalido_em = NOW(),
        atualizado_em = NOW()
      WHERE id = $1
      RETURNING status, exigir_troca_senha, tentativas_login_invalidas, ultimo_login_invalido_em
      `, id);
        return rows[0] ?? null;
    }
    async registrarLoginSucesso(id) {
        await this.ensureEstrutura();
        await prisma.$executeRawUnsafe(`
      UPDATE usuarios
      SET
        ultimo_acesso_em = NOW(),
        tentativas_login_invalidas = 0,
        ultimo_login_invalido_em = NULL,
        status = CASE
          WHEN lower(coalesce(email, '')) = '${EMAIL_ADMIN_PADRAO}' THEN 'ATIVO'
          ELSE status
        END,
        atualizado_em = NOW()
      WHERE id = $1
      `, id);
    }
    async redefinirSenhaPorEmail(email, senhaHash, lookup) {
        await this.ensureEstrutura();
        const usuario = await this.buscarUsuarioPorEmail(email, lookup);
        if (!usuario?.email) {
            return null;
        }
        await prisma.$executeRawUnsafe(`
      UPDATE usuarios
      SET senha_hash = $2,
          exigir_troca_senha = TRUE,
          tentativas_login_invalidas = 0,
          ultimo_login_invalido_em = NULL,
          atualizado_em = NOW()
      WHERE id = $1
      `, usuario.id, senhaHash);
        return {
            id: usuario.id,
            nome_usuario: usuario.nomeUsuario,
            nome: usuario.nome ?? null,
            email: usuario.email
        };
    }
    async buscarTenantContextoPublico(input) {
        await this.ensureEstrutura();
        const slugPorHost = this.extrairSlugPorHost(input.host);
        const slug = input.slug?.trim().toLowerCase() || slugPorHost || null;
        const cnpj = input.cnpj?.trim() || null;
        const codigo = input.codigoInstituicao?.trim().toUpperCase() || null;
        const rows = await prisma.$queryRawUnsafe(`
      SELECT
        id::text AS id,
        tenant_id::text AS tenant_id,
        codigo,
        cnpj,
        razao_social,
        nome_fantasia,
        slug,
        email,
        telefone,
        plano,
        status,
        logo_url,
        cor_tema
      FROM instituicoes
      WHERE
        ($1::text IS NOT NULL AND cnpj = $1::text)
        OR ($2::text IS NOT NULL AND lower(slug) = lower($2::text))
        OR ($3::text IS NOT NULL AND upper(coalesce(codigo, '')) = upper($3::text))
      ORDER BY atualizado_em DESC
      LIMIT 1
      `, cnpj, slug, codigo);
        return mapTenantContexto(rows[0] ?? null);
    }
    async registrarEventoAcesso(input) {
        await this.ensureEstrutura();
        await prisma.$executeRawUnsafe(`
      INSERT INTO tenant_auditoria_acesso (
        tenant_id,
        instituicao_id,
        usuario_id,
        evento,
        identificador,
        ip,
        user_agent,
        detalhes_json
      )
      VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8::jsonb)
      `, input.tenant_id ?? null, input.instituicao_id ?? null, input.usuario_id ?? null, input.evento, input.identificador ?? null, input.ip ?? null, input.user_agent ?? null, input.detalhes_json ? JSON.stringify(input.detalhes_json) : null);
    }
    async criarChallenge(input) {
        await this.ensureEstrutura();
        await prisma.$executeRawUnsafe(`
      INSERT INTO auth_challenge (
        id,
        tipo,
        usuario_id,
        tenant_id,
        challenge,
        codigo_hash,
        contexto_json,
        expira_em
      )
      VALUES ($1::uuid, $2, $3, $4::uuid, $5, $6, $7::jsonb, $8)
      `, input.id, input.tipo, input.usuarioId ?? null, input.tenantId ?? null, input.challenge, input.codigoHash ?? null, input.contexto ? JSON.stringify(input.contexto) : null, input.expiraEm);
    }
    async buscarChallenge(id, tipo) {
        await this.ensureEstrutura();
        const rows = await prisma.$queryRawUnsafe(`
      SELECT
        id::text AS id,
        tipo,
        usuario_id,
        tenant_id::text AS tenant_id,
        challenge,
        codigo_hash,
        contexto_json,
        expira_em,
        usado_em,
        expira_em <= NOW()::timestamp AS expirado
      FROM auth_challenge
      WHERE id = $1::uuid
        AND ($2::text IS NULL OR tipo = $2::text)
      LIMIT 1
      `, id, tipo ?? null);
        return rows[0] ?? null;
    }
    async marcarChallengeUsado(id) {
        await this.ensureEstrutura();
        await prisma.$executeRawUnsafe(`
      UPDATE auth_challenge
      SET usado_em = NOW()
      WHERE id = $1::uuid
      `, id);
    }
    async listarPasskeysUsuario(usuarioId) {
        await this.ensureEstrutura();
        return prisma.$queryRawUnsafe(`
      SELECT
        id::text AS id,
        usuario_id,
        credential_id,
        public_key,
        counter,
        transports,
        device_type,
        backed_up,
        nome
      FROM usuario_passkey
      WHERE usuario_id = $1
      ORDER BY criado_em DESC
      `, usuarioId);
    }
    async buscarPasskeyPorCredentialId(credentialId) {
        await this.ensureEstrutura();
        const rows = await prisma.$queryRawUnsafe(`
      SELECT
        id::text AS id,
        usuario_id,
        credential_id,
        public_key,
        counter,
        transports,
        device_type,
        backed_up,
        nome
      FROM usuario_passkey
      WHERE credential_id = $1
      LIMIT 1
      `, credentialId);
        return rows[0] ?? null;
    }
    async salvarPasskey(input) {
        await this.ensureEstrutura();
        await prisma.$executeRawUnsafe(`
      INSERT INTO usuario_passkey (
        id,
        usuario_id,
        credential_id,
        public_key,
        counter,
        transports,
        device_type,
        backed_up,
        nome
      )
      VALUES ($1::uuid, $2, $3, $4, $5, $6::text[], $7, $8, $9)
      ON CONFLICT (credential_id) DO UPDATE
      SET public_key = EXCLUDED.public_key,
          counter = EXCLUDED.counter,
          transports = EXCLUDED.transports,
          device_type = EXCLUDED.device_type,
          backed_up = EXCLUDED.backed_up,
          nome = EXCLUDED.nome
      `, input.id, input.usuarioId, input.credentialId, input.publicKey, input.counter, input.transports ?? [], input.deviceType ?? null, input.backedUp ?? false, input.nome ?? null);
    }
    async atualizarPasskeyCounter(credentialId, counter) {
        await this.ensureEstrutura();
        await prisma.$executeRawUnsafe(`
      UPDATE usuario_passkey
      SET counter = $2,
          ultimo_uso_em = NOW()
      WHERE credential_id = $1
      `, credentialId, counter);
    }
    async resolverFiltroTenant(input) {
        const tenant = await this.buscarTenantContextoPublico(input ?? {});
        return {
            tenant_id: tenant?.tenant_id,
            codigo: tenant?.codigo,
            cnpj: tenant?.cnpj,
            slug: tenant?.slug
        };
    }
    extrairSlugPorHost(host) {
        const valor = host?.trim().toLowerCase();
        if (!valor)
            return null;
        const semPorta = valor.split(":")[0];
        if (semPorta.endsWith(".g3n.htasistemas.com.br") &&
            semPorta.split(".").length > 4) {
            return semPorta.split(".")[0] ?? null;
        }
        return null;
    }
    async ensureEstrutura() {
        await ensureUsuariosGestaoEstrutura(prisma);
        await ensureMultiTenantStructure(prisma);
        await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS auth_challenge (
        id UUID PRIMARY KEY,
        tipo VARCHAR(40) NOT NULL,
        usuario_id BIGINT REFERENCES usuarios(id) ON DELETE CASCADE,
        tenant_id UUID,
        challenge TEXT NOT NULL,
        codigo_hash VARCHAR(255),
        contexto_json JSONB,
        expira_em TIMESTAMP NOT NULL,
        usado_em TIMESTAMP,
        criado_em TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
        await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS auth_challenge_usuario_idx
      ON auth_challenge(usuario_id, tipo, expira_em)
    `);
        await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS usuario_passkey (
        id UUID PRIMARY KEY,
        usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        credential_id TEXT NOT NULL UNIQUE,
        public_key TEXT NOT NULL,
        counter BIGINT NOT NULL DEFAULT 0,
        transports TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
        device_type VARCHAR(30),
        backed_up BOOLEAN NOT NULL DEFAULT FALSE,
        nome VARCHAR(120),
        criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
        ultimo_uso_em TIMESTAMP
      )
    `);
        await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS usuario_passkey_usuario_idx
      ON usuario_passkey(usuario_id)
    `);
    }
}
