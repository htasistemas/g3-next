import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
const estruturaSql = [
    `
  CREATE TABLE IF NOT EXISTS mensagens_personalizadas_taxonomia (
    id BIGSERIAL PRIMARY KEY,
    tipo VARCHAR(30) NOT NULL,
    nome VARCHAR(150) NOT NULL,
    descricao VARCHAR(250),
    status VARCHAR(20) NOT NULL DEFAULT 'ATIVA',
    ordem INTEGER NOT NULL DEFAULT 0,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
  )
  `,
    "CREATE UNIQUE INDEX IF NOT EXISTS mensagens_personalizadas_taxonomia_tipo_nome_udx ON mensagens_personalizadas_taxonomia(tipo, nome)",
    `
  CREATE TABLE IF NOT EXISTS mensagens_personalizadas_modelo (
    id BIGSERIAL PRIMARY KEY,
    titulo VARCHAR(200) NOT NULL,
    assunto VARCHAR(200),
    categoria_id BIGINT REFERENCES mensagens_personalizadas_taxonomia(id) ON DELETE SET NULL,
    assunto_id BIGINT REFERENCES mensagens_personalizadas_taxonomia(id) ON DELETE SET NULL,
    tipo_comunicacao_id BIGINT REFERENCES mensagens_personalizadas_taxonomia(id) ON DELETE SET NULL,
    destinatarios_json TEXT NOT NULL DEFAULT '[]',
    canais_json TEXT NOT NULL DEFAULT '[]',
    mensagem_base TEXT NOT NULL,
    variaveis_json TEXT NOT NULL DEFAULT '[]',
    tags_json TEXT NOT NULL DEFAULT '[]',
    status VARCHAR(20) NOT NULL DEFAULT 'ATIVA',
    observacoes_internas TEXT,
    origem VARCHAR(20) NOT NULL DEFAULT 'USUARIO',
    mensagem_padrao_sistema BOOLEAN NOT NULL DEFAULT FALSE,
    mensagem_personalizada_usuario BOOLEAN NOT NULL DEFAULT TRUE,
    mensagem_sugerida_ia BOOLEAN NOT NULL DEFAULT FALSE,
    chave_sistema VARCHAR(120),
    criado_por_id VARCHAR(60),
    criado_por_nome VARCHAR(150),
    atualizado_por_id VARCHAR(60),
    atualizado_por_nome VARCHAR(150),
    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
  )
  `,
    "CREATE UNIQUE INDEX IF NOT EXISTS mensagens_personalizadas_modelo_chave_sistema_udx ON mensagens_personalizadas_modelo(chave_sistema) WHERE chave_sistema IS NOT NULL",
    "CREATE INDEX IF NOT EXISTS mensagens_personalizadas_modelo_status_idx ON mensagens_personalizadas_modelo(status)",
    "CREATE INDEX IF NOT EXISTS mensagens_personalizadas_modelo_titulo_idx ON mensagens_personalizadas_modelo(titulo)",
    `
  CREATE TABLE IF NOT EXISTS mensagens_personalizadas_historico (
    id BIGSERIAL PRIMARY KEY,
    modelo_id BIGINT REFERENCES mensagens_personalizadas_modelo(id) ON DELETE SET NULL,
    nome_mensagem VARCHAR(200) NOT NULL,
    canal VARCHAR(20) NOT NULL,
    destinatario_tipo VARCHAR(30) NOT NULL,
    destinatario_id VARCHAR(60),
    destinatario_nome VARCHAR(200),
    destinatario_contato VARCHAR(200),
    usuario_id VARCHAR(60),
    usuario_nome VARCHAR(150),
    tipo_envio VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,
    assunto_final VARCHAR(200),
    mensagem_final TEXT,
    erro_observacao TEXT,
    url_whatsapp TEXT,
    filtros_json TEXT,
    detalhes_json TEXT,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW()
  )
  `,
    "CREATE INDEX IF NOT EXISTS mensagens_personalizadas_historico_data_idx ON mensagens_personalizadas_historico(criado_em DESC)",
    "CREATE INDEX IF NOT EXISTS mensagens_personalizadas_historico_status_idx ON mensagens_personalizadas_historico(status)",
    `
  CREATE TABLE IF NOT EXISTS mensagens_personalizadas_auditoria (
    id BIGSERIAL PRIMARY KEY,
    acao VARCHAR(80) NOT NULL,
    modelo_id BIGINT REFERENCES mensagens_personalizadas_modelo(id) ON DELETE SET NULL,
    usuario_id VARCHAR(60),
    usuario_nome VARCHAR(150),
    dados_json TEXT,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW()
  )
  `,
    "CREATE INDEX IF NOT EXISTS mensagens_personalizadas_auditoria_data_idx ON mensagens_personalizadas_auditoria(criado_em DESC)"
];
let estruturaGarantida = false;
function toJsonText(value) {
    return JSON.stringify(value ?? []);
}
function parseBigIntId(rawId) {
    if (!rawId)
        return null;
    const numeric = Number(rawId);
    if (!Number.isInteger(numeric) || numeric <= 0) {
        throw new AppError("Identificador invalido.", 400);
    }
    return BigInt(numeric);
}
function actorId(actor) {
    return actor?.id?.trim() || null;
}
function actorName(actor) {
    return actor?.nomeUsuario?.trim() || null;
}
export class MensagensPersonalizadasRepository {
    async garantirEstrutura() {
        if (estruturaGarantida)
            return;
        for (const comando of estruturaSql) {
            await prisma.$executeRawUnsafe(comando);
        }
        estruturaGarantida = true;
    }
    async listarTaxonomias() {
        await this.garantirEstrutura();
        return prisma.$queryRaw(Prisma.sql `
      SELECT
        id,
        tipo,
        nome,
        descricao,
        status,
        ordem,
        criado_em,
        atualizado_em
      FROM mensagens_personalizadas_taxonomia
      ORDER BY tipo ASC, ordem ASC, nome ASC
    `);
    }
    async criarTaxonomia(input) {
        await this.garantirEstrutura();
        const existente = await prisma.$queryRaw(Prisma.sql `
      SELECT id
      FROM mensagens_personalizadas_taxonomia
      WHERE tipo = ${input.tipo}
        AND lower(nome) = lower(${input.nome})
      LIMIT 1
    `);
        if (existente[0]) {
            throw new AppError("Ja existe um cadastro com este nome neste grupo.", 409);
        }
        const rows = await prisma.$queryRaw(Prisma.sql `
      INSERT INTO mensagens_personalizadas_taxonomia (
        tipo,
        nome,
        descricao,
        status,
        ordem
      )
      VALUES (
        ${input.tipo},
        ${input.nome},
        ${input.descricao ?? null},
        ${input.status ?? "ATIVA"},
        COALESCE(
          (
            SELECT MAX(ordem) + 1
            FROM mensagens_personalizadas_taxonomia
            WHERE tipo = ${input.tipo}
          ),
          1
        )
      )
      RETURNING
        id,
        tipo,
        nome,
        descricao,
        status,
        ordem,
        criado_em,
        atualizado_em
    `);
        return rows[0];
    }
    async upsertTaxonomiaSeed(input) {
        await this.garantirEstrutura();
        await prisma.$executeRaw(Prisma.sql `
      INSERT INTO mensagens_personalizadas_taxonomia (
        tipo,
        nome,
        descricao,
        status,
        ordem
      )
      VALUES (
        ${input.tipo},
        ${input.nome},
        ${input.descricao ?? null},
        ${input.status ?? "ATIVA"},
        COALESCE(
          (
            SELECT MAX(ordem) + 1
            FROM mensagens_personalizadas_taxonomia
            WHERE tipo = ${input.tipo}
          ),
          1
        )
      )
      ON CONFLICT (tipo, nome) DO NOTHING
    `);
    }
    async atualizarTaxonomia(id, input) {
        await this.garantirEstrutura();
        const rows = await prisma.$queryRaw(Prisma.sql `
      UPDATE mensagens_personalizadas_taxonomia
      SET
        tipo = ${input.tipo},
        nome = ${input.nome},
        descricao = ${input.descricao ?? null},
        status = ${input.status ?? "ATIVA"},
        atualizado_em = NOW()
      WHERE id = ${id}
      RETURNING
        id,
        tipo,
        nome,
        descricao,
        status,
        ordem,
        criado_em,
        atualizado_em
    `);
        if (!rows[0]) {
            throw new AppError("Cadastro nao encontrado.", 404);
        }
        return rows[0];
    }
    async removerTaxonomia(id) {
        await this.garantirEstrutura();
        const uso = await prisma.$queryRaw(Prisma.sql `
      SELECT COUNT(*)::bigint AS total
      FROM mensagens_personalizadas_modelo
      WHERE categoria_id = ${id}
         OR assunto_id = ${id}
         OR tipo_comunicacao_id = ${id}
    `);
        if (Number(uso[0]?.total ?? 0) > 0) {
            throw new AppError("Este cadastro esta vinculado a mensagens existentes.", 409);
        }
        await prisma.$executeRaw(Prisma.sql `
      DELETE FROM mensagens_personalizadas_taxonomia
      WHERE id = ${id}
    `);
    }
    async listarModelos(filtros) {
        await this.garantirEstrutura();
        const clauses = [Prisma.sql `WHERE 1 = 1`];
        const busca = filtros.busca?.trim();
        if (busca) {
            clauses.push(Prisma.sql `AND (
          m.titulo ILIKE ${`%${busca}%`}
          OR COALESCE(m.assunto, '') ILIKE ${`%${busca}%`}
          OR m.mensagem_base ILIKE ${`%${busca}%`}
        )`);
        }
        if (filtros.status) {
            clauses.push(Prisma.sql `AND m.status = ${filtros.status}`);
        }
        if (filtros.categoriaId) {
            clauses.push(Prisma.sql `AND m.categoria_id = ${parseBigIntId(filtros.categoriaId)}`);
        }
        if (filtros.somenteIa) {
            clauses.push(Prisma.sql `AND m.mensagem_sugerida_ia = TRUE`);
        }
        if (filtros.somenteAtivas) {
            clauses.push(Prisma.sql `AND m.status = 'ATIVA'`);
        }
        return prisma.$queryRaw(Prisma.sql `
      SELECT
        m.id,
        m.titulo,
        m.assunto,
        m.categoria_id,
        categoria.nome AS categoria_nome,
        m.assunto_id,
        assunto.nome AS assunto_nome,
        m.tipo_comunicacao_id,
        tipo.nome AS tipo_comunicacao_nome,
        m.destinatarios_json,
        m.canais_json,
        m.mensagem_base,
        m.variaveis_json,
        m.tags_json,
        m.status,
        m.observacoes_internas,
        m.origem,
        m.mensagem_padrao_sistema,
        m.mensagem_personalizada_usuario,
        m.mensagem_sugerida_ia,
        m.chave_sistema,
        m.criado_por_id,
        m.criado_por_nome,
        m.atualizado_por_id,
        m.atualizado_por_nome,
        m.criado_em,
        m.atualizado_em
      FROM mensagens_personalizadas_modelo m
      LEFT JOIN mensagens_personalizadas_taxonomia categoria
        ON categoria.id = m.categoria_id
      LEFT JOIN mensagens_personalizadas_taxonomia assunto
        ON assunto.id = m.assunto_id
      LEFT JOIN mensagens_personalizadas_taxonomia tipo
        ON tipo.id = m.tipo_comunicacao_id
      ${Prisma.join(clauses, " ")}
      ORDER BY m.mensagem_padrao_sistema DESC, m.atualizado_em DESC, m.titulo ASC
    `);
    }
    async obterModeloPorId(id) {
        await this.garantirEstrutura();
        const rows = await prisma.$queryRaw(Prisma.sql `
      SELECT
        m.id,
        m.titulo,
        m.assunto,
        m.categoria_id,
        categoria.nome AS categoria_nome,
        m.assunto_id,
        assunto.nome AS assunto_nome,
        m.tipo_comunicacao_id,
        tipo.nome AS tipo_comunicacao_nome,
        m.destinatarios_json,
        m.canais_json,
        m.mensagem_base,
        m.variaveis_json,
        m.tags_json,
        m.status,
        m.observacoes_internas,
        m.origem,
        m.mensagem_padrao_sistema,
        m.mensagem_personalizada_usuario,
        m.mensagem_sugerida_ia,
        m.chave_sistema,
        m.criado_por_id,
        m.criado_por_nome,
        m.atualizado_por_id,
        m.atualizado_por_nome,
        m.criado_em,
        m.atualizado_em
      FROM mensagens_personalizadas_modelo m
      LEFT JOIN mensagens_personalizadas_taxonomia categoria
        ON categoria.id = m.categoria_id
      LEFT JOIN mensagens_personalizadas_taxonomia assunto
        ON assunto.id = m.assunto_id
      LEFT JOIN mensagens_personalizadas_taxonomia tipo
        ON tipo.id = m.tipo_comunicacao_id
      WHERE m.id = ${id}
      LIMIT 1
    `);
        return rows[0] ?? null;
    }
    async obterModeloPorChaveSistema(chaveSistema) {
        await this.garantirEstrutura();
        const rows = await prisma.$queryRaw(Prisma.sql `
      SELECT
        m.id,
        m.titulo,
        m.assunto,
        m.categoria_id,
        categoria.nome AS categoria_nome,
        m.assunto_id,
        assunto.nome AS assunto_nome,
        m.tipo_comunicacao_id,
        tipo.nome AS tipo_comunicacao_nome,
        m.destinatarios_json,
        m.canais_json,
        m.mensagem_base,
        m.variaveis_json,
        m.tags_json,
        m.status,
        m.observacoes_internas,
        m.origem,
        m.mensagem_padrao_sistema,
        m.mensagem_personalizada_usuario,
        m.mensagem_sugerida_ia,
        m.chave_sistema,
        m.criado_por_id,
        m.criado_por_nome,
        m.atualizado_por_id,
        m.atualizado_por_nome,
        m.criado_em,
        m.atualizado_em
      FROM mensagens_personalizadas_modelo m
      LEFT JOIN mensagens_personalizadas_taxonomia categoria
        ON categoria.id = m.categoria_id
      LEFT JOIN mensagens_personalizadas_taxonomia assunto
        ON assunto.id = m.assunto_id
      LEFT JOIN mensagens_personalizadas_taxonomia tipo
        ON tipo.id = m.tipo_comunicacao_id
      WHERE m.chave_sistema = ${chaveSistema}
      LIMIT 1
    `);
        return rows[0] ?? null;
    }
    async criarModelo(input, actor) {
        await this.garantirEstrutura();
        const categoriaId = parseBigIntId(input.categoriaId);
        const assuntoId = parseBigIntId(input.assuntoId);
        const tipoComunicacaoId = parseBigIntId(input.tipoComunicacaoId);
        const rows = await prisma.$queryRaw(Prisma.sql `
      INSERT INTO mensagens_personalizadas_modelo (
        titulo,
        assunto,
        categoria_id,
        assunto_id,
        tipo_comunicacao_id,
        destinatarios_json,
        canais_json,
        mensagem_base,
        variaveis_json,
        tags_json,
        status,
        observacoes_internas,
        origem,
        mensagem_padrao_sistema,
        mensagem_personalizada_usuario,
        mensagem_sugerida_ia,
        criado_por_id,
        criado_por_nome,
        atualizado_por_id,
        atualizado_por_nome
      )
      VALUES (
        ${input.titulo},
        ${input.assunto ?? null},
        ${categoriaId},
        ${assuntoId},
        ${tipoComunicacaoId},
        ${toJsonText(input.tiposDestinatario)},
        ${toJsonText(input.canalPermitido === "AMBOS" ? ["WHATSAPP", "EMAIL"] : [input.canalPermitido])},
        ${input.mensagemBase},
        ${toJsonText(input.variaveisPermitidas ?? [])},
        ${toJsonText(input.tags ?? [])},
        ${input.status ?? "ATIVA"},
        ${input.observacoesInternas ?? null},
        'USUARIO',
        ${input.mensagemPadraoSistema ?? false},
        ${input.mensagemPersonalizadaUsuario ?? true},
        ${input.mensagemSugeridaIa ?? false},
        ${actorId(actor)},
        ${actorName(actor)},
        ${actorId(actor)},
        ${actorName(actor)}
      )
      RETURNING id
    `);
        return this.obterModeloOuFalhar(rows[0]?.id);
    }
    async inserirModeloSeedSeAusente(input) {
        await this.garantirEstrutura();
        const existente = await this.obterModeloPorChaveSistema(input.chaveSistema);
        if (existente)
            return existente;
        const categoriaId = parseBigIntId(input.categoriaId);
        const assuntoId = parseBigIntId(input.assuntoId);
        const tipoComunicacaoId = parseBigIntId(input.tipoComunicacaoId);
        const rows = await prisma.$queryRaw(Prisma.sql `
      INSERT INTO mensagens_personalizadas_modelo (
        titulo,
        assunto,
        categoria_id,
        assunto_id,
        tipo_comunicacao_id,
        destinatarios_json,
        canais_json,
        mensagem_base,
        variaveis_json,
        tags_json,
        status,
        observacoes_internas,
        origem,
        mensagem_padrao_sistema,
        mensagem_personalizada_usuario,
        mensagem_sugerida_ia,
        chave_sistema
      )
      VALUES (
        ${input.titulo},
        ${input.assunto ?? null},
        ${categoriaId},
        ${assuntoId},
        ${tipoComunicacaoId},
        ${toJsonText(input.tiposDestinatario)},
        ${toJsonText(input.canalPermitido === "AMBOS" ? ["WHATSAPP", "EMAIL"] : [input.canalPermitido])},
        ${input.mensagemBase},
        ${toJsonText(input.variaveisPermitidas ?? [])},
        ${toJsonText(input.tags ?? [])},
        ${input.status ?? "ATIVA"},
        ${input.observacoesInternas ?? null},
        ${input.origem},
        ${input.mensagemPadraoSistema ?? false},
        ${input.mensagemPersonalizadaUsuario ?? true},
        ${input.mensagemSugeridaIa ?? false},
        ${input.chaveSistema}
      )
      RETURNING id
    `);
        return this.obterModeloOuFalhar(rows[0]?.id);
    }
    async atualizarModelo(id, input, actor) {
        await this.garantirEstrutura();
        const categoriaId = parseBigIntId(input.categoriaId);
        const assuntoId = parseBigIntId(input.assuntoId);
        const tipoComunicacaoId = parseBigIntId(input.tipoComunicacaoId);
        const rows = await prisma.$queryRaw(Prisma.sql `
      UPDATE mensagens_personalizadas_modelo
      SET
        titulo = ${input.titulo},
        assunto = ${input.assunto ?? null},
        categoria_id = ${categoriaId},
        assunto_id = ${assuntoId},
        tipo_comunicacao_id = ${tipoComunicacaoId},
        destinatarios_json = ${toJsonText(input.tiposDestinatario)},
        canais_json = ${toJsonText(input.canalPermitido === "AMBOS" ? ["WHATSAPP", "EMAIL"] : [input.canalPermitido])},
        mensagem_base = ${input.mensagemBase},
        variaveis_json = ${toJsonText(input.variaveisPermitidas ?? [])},
        tags_json = ${toJsonText(input.tags ?? [])},
        status = ${input.status ?? "ATIVA"},
        observacoes_internas = ${input.observacoesInternas ?? null},
        mensagem_padrao_sistema = ${input.mensagemPadraoSistema ?? false},
        mensagem_personalizada_usuario = ${input.mensagemPersonalizadaUsuario ?? true},
        mensagem_sugerida_ia = ${input.mensagemSugeridaIa ?? false},
        atualizado_por_id = ${actorId(actor)},
        atualizado_por_nome = ${actorName(actor)},
        atualizado_em = NOW()
      WHERE id = ${id}
      RETURNING id
    `);
        if (!rows[0]) {
            throw new AppError("Mensagem nao encontrada.", 404);
        }
        return this.obterModeloOuFalhar(id);
    }
    async atualizarStatusModelo(id, status, actor) {
        await this.garantirEstrutura();
        const rows = await prisma.$queryRaw(Prisma.sql `
      UPDATE mensagens_personalizadas_modelo
      SET
        status = ${status},
        atualizado_por_id = ${actorId(actor)},
        atualizado_por_nome = ${actorName(actor)},
        atualizado_em = NOW()
      WHERE id = ${id}
      RETURNING id
    `);
        if (!rows[0]) {
            throw new AppError("Mensagem nao encontrada.", 404);
        }
        return this.obterModeloOuFalhar(id);
    }
    async removerModelo(id) {
        await this.garantirEstrutura();
        await prisma.$executeRaw(Prisma.sql `
      DELETE FROM mensagens_personalizadas_modelo
      WHERE id = ${id}
    `);
    }
    async listarHistorico(filtros) {
        await this.garantirEstrutura();
        const clauses = [Prisma.sql `WHERE 1 = 1`];
        const busca = filtros.busca?.trim();
        if (busca) {
            clauses.push(Prisma.sql `AND (
          nome_mensagem ILIKE ${`%${busca}%`}
          OR COALESCE(destinatario_nome, '') ILIKE ${`%${busca}%`}
          OR COALESCE(usuario_nome, '') ILIKE ${`%${busca}%`}
        )`);
        }
        if (filtros.canal)
            clauses.push(Prisma.sql `AND canal = ${filtros.canal}`);
        if (filtros.destinatarioTipo) {
            clauses.push(Prisma.sql `AND destinatario_tipo = ${filtros.destinatarioTipo}`);
        }
        if (filtros.status)
            clauses.push(Prisma.sql `AND status = ${filtros.status}`);
        if (filtros.usuario) {
            clauses.push(Prisma.sql `AND COALESCE(usuario_nome, '') ILIKE ${`%${filtros.usuario}%`}`);
        }
        if (filtros.dataInicio) {
            clauses.push(Prisma.sql `AND criado_em::date >= ${filtros.dataInicio}::date`);
        }
        if (filtros.dataFim) {
            clauses.push(Prisma.sql `AND criado_em::date <= ${filtros.dataFim}::date`);
        }
        return prisma.$queryRaw(Prisma.sql `
      SELECT
        id,
        modelo_id,
        nome_mensagem,
        canal,
        destinatario_tipo,
        destinatario_id,
        destinatario_nome,
        destinatario_contato,
        usuario_id,
        usuario_nome,
        tipo_envio,
        status,
        assunto_final,
        mensagem_final,
        erro_observacao,
        url_whatsapp,
        filtros_json,
        detalhes_json,
        criado_em
      FROM mensagens_personalizadas_historico
      ${Prisma.join(clauses, " ")}
      ORDER BY criado_em DESC
      LIMIT 500
    `);
    }
    async registrarHistorico(input) {
        await this.garantirEstrutura();
        await prisma.$executeRaw(Prisma.sql `
      INSERT INTO mensagens_personalizadas_historico (
        modelo_id,
        nome_mensagem,
        canal,
        destinatario_tipo,
        destinatario_id,
        destinatario_nome,
        destinatario_contato,
        usuario_id,
        usuario_nome,
        tipo_envio,
        status,
        assunto_final,
        mensagem_final,
        erro_observacao,
        url_whatsapp,
        filtros_json,
        detalhes_json
      )
      VALUES (
        ${input.modeloId ?? null},
        ${input.nomeMensagem},
        ${input.canal},
        ${input.destinatarioTipo},
        ${input.destinatarioId ?? null},
        ${input.destinatarioNome ?? null},
        ${input.destinatarioContato ?? null},
        ${input.usuarioId ?? null},
        ${input.usuarioNome ?? null},
        ${input.tipoEnvio},
        ${input.status},
        ${input.assuntoFinal ?? null},
        ${input.mensagemFinal ?? null},
        ${input.erroObservacao ?? null},
        ${input.urlWhatsapp ?? null},
        ${input.filtrosJson ?? null},
        ${input.detalhesJson ?? null}
      )
    `);
    }
    async registrarAuditoria(input) {
        await this.garantirEstrutura();
        await prisma.$executeRaw(Prisma.sql `
      INSERT INTO mensagens_personalizadas_auditoria (
        acao,
        modelo_id,
        usuario_id,
        usuario_nome,
        dados_json
      )
      VALUES (
        ${input.acao},
        ${input.modeloId ?? null},
        ${input.usuarioId ?? null},
        ${input.usuarioNome ?? null},
        ${input.dadosJson ?? null}
      )
    `);
    }
    async buscarDestinatarios(tipo, termo, somenteAtivos) {
        const rows = await this.consultarDestinatarios(tipo, termo, somenteAtivos);
        return rows.map((item) => ({
            tipo,
            id: item.id,
            nome: item.nome,
            documento: item.documento ?? undefined,
            email: item.email ?? undefined,
            telefone: item.telefone ?? undefined,
            detalhe: item.detalhe ?? undefined
        }));
    }
    async obterDestinatarioPorId(tipo, id) {
        const rows = await this.consultarDestinatarios(tipo, undefined, undefined, id);
        const item = rows[0];
        if (!item)
            return null;
        const nome = item.nome.trim();
        const primeiroNome = nome.split(" ").find(Boolean) ?? nome;
        return {
            tipo,
            id: item.id,
            nome,
            primeiroNome,
            documento: item.documento ?? undefined,
            email: item.email ?? undefined,
            telefone: item.telefone ?? undefined,
            instituicao: item.instituicao ?? undefined,
            setor: item.setor ?? undefined,
            cargo: item.cargo ?? undefined,
            dataRegistro: item.data_registro?.toISOString() ?? undefined,
            observacao: item.observacao ?? undefined
        };
    }
    async consultarDestinatarios(tipo, termo, somenteAtivos, idEspecifico) {
        await this.garantirEstrutura();
        const termoBusca = termo?.trim();
        const idClause = idEspecifico ? Prisma.sql `AND base.id = ${idEspecifico}` : Prisma.empty;
        const likeNome = termoBusca ? `%${termoBusca}%` : undefined;
        const digits = termoBusca ? termoBusca.replace(/\D/g, "") : "";
        if (tipo === "BENEFICIARIO") {
            return prisma.$queryRaw(Prisma.sql `
        SELECT *
        FROM (
          SELECT
            b.id::text AS id,
            b.nome_completo AS nome,
            b.cpf AS documento,
            contato.email AS email,
            COALESCE(
              NULLIF(contato.telefone_principal, ''),
              NULLIF(contato.telefone_secundario, ''),
              NULLIF(contato.telefone_recado_numero, '')
            ) AS telefone,
            COALESCE(b.codigo, 'Beneficiário') AS detalhe,
            NULL::text AS instituicao,
            NULL::text AS setor,
            NULL::text AS cargo,
            b.criado_em AS data_registro,
            NULL::text AS observacao,
            COALESCE(b.status, 'ATIVO') AS status_base
          FROM cadastro_beneficiario b
          LEFT JOIN contato_beneficiario contato ON contato.beneficiario_id = b.id
        ) base
        WHERE 1 = 1
          ${idClause}
          ${likeNome
                ? Prisma.sql `AND (
                  base.nome ILIKE ${likeNome}
                  OR COALESCE(base.documento, '') ILIKE ${`%${digits || termoBusca}%`}
                  OR COALESCE(base.detalhe, '') ILIKE ${likeNome}
                )`
                : Prisma.empty}
          ${somenteAtivos ? Prisma.sql `AND base.status_base = 'ATIVO'` : Prisma.empty}
        ORDER BY base.nome ASC
        LIMIT 30
      `);
        }
        if (tipo === "PROFISSIONAL" || tipo === "COLABORADOR") {
            return prisma.$queryRaw(Prisma.sql `
        SELECT *
        FROM (
          SELECT
            p.id::text AS id,
            p.nome_completo AS nome,
            p.cpf AS documento,
            p.email AS email,
            p.telefone AS telefone,
            COALESCE(NULLIF(p.categoria, ''), 'Profissional') AS detalhe,
            p.unidade AS instituicao,
            NULL::text AS setor,
            p.especialidade AS cargo,
            p.criado_em AS data_registro,
            p.observacoes AS observacao,
            COALESCE(p.status, 'ATIVO') AS status_base
          FROM cadastro_profissionais p
        ) base
        WHERE 1 = 1
          ${idClause}
          ${likeNome
                ? Prisma.sql `AND (
                  base.nome ILIKE ${likeNome}
                  OR COALESCE(base.documento, '') ILIKE ${`%${digits || termoBusca}%`}
                  OR COALESCE(base.detalhe, '') ILIKE ${likeNome}
                )`
                : Prisma.empty}
          ${somenteAtivos ? Prisma.sql `AND base.status_base = 'ATIVO'` : Prisma.empty}
        ORDER BY base.nome ASC
        LIMIT 30
      `);
        }
        if (tipo === "VOLUNTARIO") {
            return prisma.$queryRaw(Prisma.sql `
        SELECT *
        FROM (
          SELECT
            v.id::text AS id,
            v.nome_completo AS nome,
            v.cpf AS documento,
            v.email AS email,
            v.telefone AS telefone,
            COALESCE(NULLIF(v.area_interesse, ''), 'Voluntário') AS detalhe,
            NULL::text AS instituicao,
            NULL::text AS setor,
            v.profissao AS cargo,
            v.criado_em AS data_registro,
            v.observacoes AS observacao,
            COALESCE(v.status, 'ATIVO') AS status_base
          FROM cadastro_voluntario v
        ) base
        WHERE 1 = 1
          ${idClause}
          ${likeNome
                ? Prisma.sql `AND (
                  base.nome ILIKE ${likeNome}
                  OR COALESCE(base.documento, '') ILIKE ${`%${digits || termoBusca}%`}
                  OR COALESCE(base.detalhe, '') ILIKE ${likeNome}
                )`
                : Prisma.empty}
          ${somenteAtivos ? Prisma.sql `AND base.status_base = 'ATIVO'` : Prisma.empty}
        ORDER BY base.nome ASC
        LIMIT 30
      `);
        }
        if (tipo === "INSTITUICAO") {
            return prisma.$queryRaw(Prisma.sql `
        SELECT *
        FROM (
          SELECT
            u.id::text AS id,
            COALESCE(NULLIF(u.nome_fantasia, ''), u.razao_social) AS nome,
            u.cnpj AS documento,
            u.email AS email,
            u.telefone AS telefone,
            COALESCE(NULLIF(u.cidade, ''), 'Instituição') AS detalhe,
            COALESCE(NULLIF(u.nome_fantasia, ''), u.razao_social) AS instituicao,
            NULL::text AS setor,
            NULL::text AS cargo,
            u.criado_em AS data_registro,
            u.observacoes AS observacao,
            'ATIVO'::text AS status_base
          FROM unidade_assistencial u
        ) base
        WHERE 1 = 1
          ${idClause}
          ${likeNome
                ? Prisma.sql `AND (
                  base.nome ILIKE ${likeNome}
                  OR COALESCE(base.documento, '') ILIKE ${`%${digits || termoBusca}%`}
                  OR COALESCE(base.detalhe, '') ILIKE ${likeNome}
                )`
                : Prisma.empty}
        ORDER BY base.nome ASC
        LIMIT 30
      `);
        }
        return prisma.$queryRaw(Prisma.sql `
      SELECT *
      FROM (
        SELECT
          d.id::text AS id,
          d.nome AS nome,
          d.documento AS documento,
          d.email AS email,
          d.telefone AS telefone,
          COALESCE(NULLIF(d.tipo_pessoa, ''), 'Doador') AS detalhe,
          NULL::text AS instituicao,
          NULL::text AS setor,
          d.responsavel_empresa AS cargo,
          d.criado_em AS data_registro,
          d.observacoes AS observacao,
          'ATIVO'::text AS status_base
        FROM doador d
      ) base
      WHERE 1 = 1
        ${idClause}
        ${likeNome
            ? Prisma.sql `AND (
                base.nome ILIKE ${likeNome}
                OR COALESCE(base.documento, '') ILIKE ${`%${digits || termoBusca}%`}
                OR COALESCE(base.detalhe, '') ILIKE ${likeNome}
              )`
            : Prisma.empty}
      ORDER BY base.nome ASC
      LIMIT 30
    `);
    }
    async obterModeloOuFalhar(id) {
        if (!id) {
            throw new AppError("Mensagem nao encontrada.", 404);
        }
        const row = await this.obterModeloPorId(id);
        if (!row) {
            throw new AppError("Mensagem nao encontrada.", 404);
        }
        return row;
    }
}
