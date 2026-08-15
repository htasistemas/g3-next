import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { normalizeDigits, toOptionalDate, trimOrUndefined } from "../../../utils/string-utils.js";
import { formatarTextoPadrao } from "../../../utils/text-formatter.js";
let estruturaPromise = null;
function toOptionalNumber(value) {
    if (value === null || value === undefined)
        return null;
    return Number.isFinite(value) ? value : null;
}
function normalizarTextoLivre(value) {
    return value?.trim().replace(/\s+/g, " ") ?? "";
}
function formatarDescricaoProdutoAlmoxarifado(value) {
    const normalizado = normalizarTextoLivre(value);
    if (!normalizado)
        return "";
    return formatarTextoPadrao(normalizado);
}
function normalizarTextoBusca(value) {
    return normalizarTextoLivre(value).toLocaleLowerCase("pt-BR");
}
function normalizarChaveProduto(value) {
    return normalizarTextoBusca(value)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}
function statusPermiteIntegracaoAlmoxarifado(status) {
    const statusNormalizado = normalizarTextoBusca(status);
    if (!statusNormalizado)
        return false;
    return !["aguardando", "cancelado", "cancelada"].includes(statusNormalizado);
}
function tipoDoacaoIntegraAlmoxarifado(tipoDoacao) {
    const tipoNormalizado = normalizarTextoBusca(tipoDoacao);
    return tipoNormalizado === "doaÃ§Ã£o de bens de consumo" || tipoNormalizado === "doacao de bens de consumo";
}
function tenantSql(alias, tenantId) {
    return Prisma.sql `${Prisma.raw(alias)}.tenant_id::text = ${tenantId}`;
}
async function ensureRegistroDoacaoEstrutura() {
    if (!estruturaPromise) {
        const promise = (async () => {
            const comandos = [
                `
        ALTER TABLE recebimento_doacao
          ADD COLUMN IF NOT EXISTS numero_recibo VARCHAR(80)
        `,
                `
        ALTER TABLE recebimento_doacao
          ADD COLUMN IF NOT EXISTS tenant_id UUID
        `,
                `
        ALTER TABLE recebimento_doacao_item
          ADD COLUMN IF NOT EXISTS tenant_id UUID
        `,
                `
        ALTER TABLE doador
          ADD COLUMN IF NOT EXISTS tenant_id UUID
        `,
                `
        CREATE INDEX IF NOT EXISTS recebimento_doacao_tenant_id_idx
          ON recebimento_doacao (tenant_id, data_recebimento DESC)
        `,
                `
        CREATE INDEX IF NOT EXISTS recebimento_doacao_item_tenant_id_idx
          ON recebimento_doacao_item (tenant_id, recebimento_doacao_id)
        `,
                `
        CREATE INDEX IF NOT EXISTS doador_tenant_id_idx
          ON doador (tenant_id, nome)
        `,
                `
        UPDATE doador AS d
        SET tenant_id = ref.tenant_id
        FROM (
          SELECT tenant_id
          FROM instituicoes
          ORDER BY criado_em ASC
          LIMIT 1
        ) ref
        WHERE d.tenant_id IS NULL
        `,
                `
        UPDATE recebimento_doacao AS r
        SET tenant_id = COALESCE(
          (SELECT d.tenant_id FROM doador d WHERE d.id = r.doador_id LIMIT 1),
          ref.tenant_id
        )
        FROM (
          SELECT tenant_id
          FROM instituicoes
          ORDER BY criado_em ASC
          LIMIT 1
        ) ref
        WHERE r.tenant_id IS NULL
        `,
                `
        UPDATE recebimento_doacao_item AS i
        SET tenant_id = r.tenant_id
        FROM recebimento_doacao r
        WHERE i.tenant_id IS NULL
          AND r.id = i.recebimento_doacao_id
          AND r.tenant_id IS NOT NULL
        `
            ];
            for (const comando of comandos) {
                await prisma.$executeRawUnsafe(comando);
            }
        })();
        estruturaPromise = promise;
        try {
            await promise;
            return;
        }
        catch (error) {
            estruturaPromise = null;
            throw error;
        }
    }
    await estruturaPromise;
}
export class RegistroDoacaoRepository {
    async listar(filters, tenantId) {
        await ensureRegistroDoacaoEstrutura();
        const where = [tenantSql("r", tenantId)];
        const doadorNome = trimOrUndefined(filters.doador_nome);
        if (doadorNome) {
            where.push(Prisma.sql `d.nome ILIKE ${`%${doadorNome}%`}`);
        }
        const tipoDoacao = trimOrUndefined(filters.tipo_doacao);
        if (tipoDoacao) {
            where.push(Prisma.sql `r.tipo_doacao ILIKE ${`%${tipoDoacao}%`}`);
        }
        const status = trimOrUndefined(filters.status);
        if (status) {
            where.push(Prisma.sql `r.status ILIKE ${`%${status}%`}`);
        }
        const dataInicial = toOptionalDate(filters.data_inicial);
        if (dataInicial) {
            where.push(Prisma.sql `r.data_recebimento >= ${dataInicial}`);
        }
        const dataFinal = toOptionalDate(filters.data_final);
        if (dataFinal) {
            where.push(Prisma.sql `r.data_recebimento <= ${dataFinal}`);
        }
        return prisma.$queryRaw(Prisma.sql `
      SELECT
        r.id,
        r.doador_id,
        d.nome AS doador_nome,
        r.numero_recibo,
        r.tipo_doacao,
        r.descricao,
        r.quantidade_itens,
        r.valor_medio,
        r.valor_total,
        r.valor,
        r.data_recebimento,
        r.forma_recebimento,
        r.recorrente,
        r.periodicidade,
        r.proxima_cobranca,
        r.status,
        r.observacoes,
        r.conta_recebimento_id,
        r.contabilidade_pendente,
        r.lancamentos_gerados,
        r.criado_em,
        r.atualizado_em
      FROM recebimento_doacao r
      LEFT JOIN doador d ON d.id = r.doador_id AND ${tenantSql("d", tenantId)}
      WHERE ${Prisma.join(where, " AND ")}
      ORDER BY r.data_recebimento DESC, r.id DESC
    `);
    }
    async buscarPorId(id, tenantId) {
        await ensureRegistroDoacaoEstrutura();
        const registros = await prisma.$queryRaw(Prisma.sql `
      SELECT
        r.id,
        r.doador_id,
        d.nome AS doador_nome,
        r.numero_recibo,
        r.tipo_doacao,
        r.descricao,
        r.quantidade_itens,
        r.valor_medio,
        r.valor_total,
        r.valor,
        r.data_recebimento,
        r.forma_recebimento,
        r.recorrente,
        r.periodicidade,
        r.proxima_cobranca,
        r.status,
        r.observacoes,
        r.conta_recebimento_id,
        r.contabilidade_pendente,
        r.lancamentos_gerados,
        r.criado_em,
        r.atualizado_em
      FROM recebimento_doacao r
      LEFT JOIN doador d ON d.id = r.doador_id AND ${tenantSql("d", tenantId)}
      WHERE r.id = ${id}
        AND ${tenantSql("r", tenantId)}
      LIMIT 1
    `);
        const registro = registros[0];
        if (!registro)
            return null;
        const itens = await prisma.$queryRaw(Prisma.sql `
      SELECT
        id,
        recebimento_doacao_id,
        descricao,
        quantidade,
        unidade,
        valor_unitario,
        valor_total,
        marca,
        modelo,
        conservacao,
        observacoes
      FROM recebimento_doacao_item
      WHERE recebimento_doacao_id = ${id}
        AND tenant_id::text = ${tenantId}
      ORDER BY id ASC
    `);
        return { registro, itens };
    }
    async buscarPorIdOuFalhar(id, tenantId) {
        const item = await this.buscarPorId(id, tenantId);
        if (!item) {
            throw new AppError("Registro de doacao nao encontrado.", 404);
        }
        return item;
    }
    async criar(input, tenantId) {
        await ensureRegistroDoacaoEstrutura();
        await this.validarDoador(input.doador_id, tenantId);
        const registroId = await prisma.$transaction(async (tx) => {
            const inserted = await tx.$queryRaw(Prisma.sql `
        INSERT INTO recebimento_doacao (
          tenant_id,
          doador_id,
          numero_recibo,
          tipo_doacao,
          descricao,
          quantidade_itens,
          valor_medio,
          valor_total,
          valor,
          data_recebimento,
          forma_recebimento,
          recorrente,
          periodicidade,
          proxima_cobranca,
          status,
          observacoes,
          conta_recebimento_id,
          criado_em,
          atualizado_em
        ) VALUES (
          ${tenantId}::uuid,
          ${input.doador_id ? BigInt(input.doador_id) : null},
          ${trimOrUndefined(input.numero_recibo)},
          ${input.tipo_doacao},
          ${trimOrUndefined(input.descricao)},
          ${input.quantidade_itens ?? null},
          ${toOptionalNumber(input.valor_medio)},
          ${toOptionalNumber(input.valor_total)},
          ${toOptionalNumber(input.valor)},
          ${toOptionalDate(input.data_recebimento)},
          ${trimOrUndefined(input.forma_recebimento)},
          ${!!input.recorrente},
          ${trimOrUndefined(input.periodicidade)},
          ${toOptionalDate(input.proxima_cobranca)},
          ${input.status},
          ${trimOrUndefined(input.observacoes)},
          ${input.conta_recebimento_id ? BigInt(input.conta_recebimento_id) : null},
          NOW(),
          NOW()
        )
        RETURNING id
      `);
            const id = inserted[0]?.id;
            if (!id) {
                throw new AppError("Nao foi possivel criar o registro de doacao.", 500);
            }
            await this.inserirItens(tx, id, input.itens ?? [], tenantId);
            await this.integrarAoAlmoxarifadoSeAplicavel(tx, id, input, tenantId);
            return id;
        });
        return this.buscarPorIdOuFalhar(registroId, tenantId);
    }
    async atualizar(id, input, tenantId) {
        await ensureRegistroDoacaoEstrutura();
        await this.buscarPorIdOuFalhar(id, tenantId);
        await this.validarDoador(input.doador_id, tenantId);
        await prisma.$transaction(async (tx) => {
            await tx.$executeRaw(Prisma.sql `
        UPDATE recebimento_doacao
        SET
          doador_id = ${input.doador_id ? BigInt(input.doador_id) : null},
          numero_recibo = ${trimOrUndefined(input.numero_recibo)},
          tipo_doacao = ${input.tipo_doacao},
          descricao = ${trimOrUndefined(input.descricao)},
          quantidade_itens = ${input.quantidade_itens ?? null},
          valor_medio = ${toOptionalNumber(input.valor_medio)},
          valor_total = ${toOptionalNumber(input.valor_total)},
          valor = ${toOptionalNumber(input.valor)},
          data_recebimento = ${toOptionalDate(input.data_recebimento)},
          forma_recebimento = ${trimOrUndefined(input.forma_recebimento)},
          recorrente = ${!!input.recorrente},
          periodicidade = ${trimOrUndefined(input.periodicidade)},
          proxima_cobranca = ${toOptionalDate(input.proxima_cobranca)},
          status = ${input.status},
          observacoes = ${trimOrUndefined(input.observacoes)},
          conta_recebimento_id = ${input.conta_recebimento_id ? BigInt(input.conta_recebimento_id) : null},
          atualizado_em = NOW()
        WHERE id = ${id}
          AND tenant_id::text = ${tenantId}
      `);
            await tx.$executeRaw(Prisma.sql `
        DELETE FROM recebimento_doacao_item
        WHERE recebimento_doacao_id = ${id}
          AND tenant_id::text = ${tenantId}
      `);
            await this.inserirItens(tx, id, input.itens ?? [], tenantId);
            await this.integrarAoAlmoxarifadoSeAplicavel(tx, id, input, tenantId);
        });
        return this.buscarPorIdOuFalhar(id, tenantId);
    }
    async remover(id, tenantId) {
        await this.buscarPorIdOuFalhar(id, tenantId);
        await prisma.$executeRaw(Prisma.sql `
      DELETE FROM recebimento_doacao
      WHERE id = ${id}
        AND tenant_id::text = ${tenantId}
    `);
    }
    async listarDoadores(termo, tenantId) {
        await ensureRegistroDoacaoEstrutura();
        const termoSanitizado = trimOrUndefined(termo);
        const like = termoSanitizado ? `%${termoSanitizado}%` : undefined;
        const filtroBusca = like
            ? Prisma.sql `
        AND (
          nome ILIKE ${like}
          OR documento ILIKE ${like}
          OR email ILIKE ${like}
        )
      `
            : Prisma.empty;
        return prisma.$queryRaw(Prisma.sql `
      SELECT
        id,
        nome,
        tipo_pessoa,
        documento,
        responsavel_empresa,
        email,
        telefone,
        logradouro,
        numero,
        complemento,
        bairro,
        cidade,
        uf,
        cep,
        observacoes,
        criado_em,
        atualizado_em
      FROM doador
      WHERE tenant_id::text = ${tenantId}
      ${filtroBusca}
      ORDER BY nome ASC
    `);
    }
    async criarDoador(input, tenantId) {
        await ensureRegistroDoacaoEstrutura();
        const inserted = await prisma.$queryRaw(Prisma.sql `
      INSERT INTO doador (
        tenant_id,
        nome,
        tipo_pessoa,
        documento,
        responsavel_empresa,
        email,
        telefone,
        logradouro,
        numero,
        complemento,
        bairro,
        cidade,
        uf,
        cep,
        observacoes,
        criado_em,
        atualizado_em
      ) VALUES (
        ${tenantId}::uuid,
        ${input.nome},
        ${trimOrUndefined(input.tipo_pessoa)},
        ${normalizeDigits(input.documento) ?? trimOrUndefined(input.documento)},
        ${trimOrUndefined(input.responsavel_empresa)},
        ${trimOrUndefined(input.email)},
        ${normalizeDigits(input.telefone)},
        ${trimOrUndefined(input.logradouro)},
        ${trimOrUndefined(input.numero)},
        ${trimOrUndefined(input.complemento)},
        ${trimOrUndefined(input.bairro)},
        ${trimOrUndefined(input.cidade)},
        ${trimOrUndefined(input.uf)?.toUpperCase()},
        ${normalizeDigits(input.cep)},
        ${trimOrUndefined(input.observacoes)},
        NOW(),
        NOW()
      )
      RETURNING id
    `);
        const id = inserted[0]?.id;
        if (!id) {
            throw new AppError("Nao foi possivel criar o doador.", 500);
        }
        const doador = await this.buscarDoadorPorId(id, tenantId);
        if (!doador) {
            throw new AppError("Doador nao encontrado apos criacao.", 500);
        }
        return doador;
    }
    async removerDoador(id, tenantId) {
        const doador = await this.buscarDoadorPorId(id, tenantId);
        if (!doador) {
            throw new AppError("Doador nao encontrado.", 404);
        }
        await prisma.$executeRaw(Prisma.sql `
      DELETE FROM doador
      WHERE id = ${id}
        AND tenant_id::text = ${tenantId}
    `);
    }
    async buscarDoadorPorId(id, tenantId) {
        const doadores = await prisma.$queryRaw(Prisma.sql `
      SELECT
        id,
        nome,
        tipo_pessoa,
        documento,
        responsavel_empresa,
        email,
        telefone,
        logradouro,
        numero,
        complemento,
        bairro,
        cidade,
        uf,
        cep,
        observacoes,
        criado_em,
        atualizado_em
      FROM doador
      WHERE id = ${id}
        AND tenant_id::text = ${tenantId}
      LIMIT 1
    `);
        return doadores[0] ?? null;
    }
    async validarDoador(doadorId, tenantId) {
        if (!doadorId)
            return;
        const doador = await this.buscarDoadorPorId(BigInt(doadorId), tenantId);
        if (!doador) {
            throw new AppError("Doador nao encontrado para a instituicao autenticada.", 404);
        }
    }
    async inserirItens(tx, registroId, itens, tenantId) {
        for (const item of itens) {
            await tx.$executeRaw(Prisma.sql `
        INSERT INTO recebimento_doacao_item (
          tenant_id,
          recebimento_doacao_id,
          descricao,
          quantidade,
          unidade,
          valor_unitario,
          valor_total,
          marca,
          modelo,
          conservacao,
          observacoes,
          criado_em
        ) VALUES (
          ${tenantId}::uuid,
          ${registroId},
          ${item.descricao},
          ${item.quantidade},
          ${trimOrUndefined(item.unidade)},
          ${toOptionalNumber(item.valor_unitario)},
          ${toOptionalNumber(item.valor_total)},
          ${trimOrUndefined(item.marca)},
          ${trimOrUndefined(item.modelo)},
          ${trimOrUndefined(item.conservacao)},
          ${trimOrUndefined(item.observacoes)},
          NOW()
        )
      `);
        }
    }
    async integrarAoAlmoxarifadoSeAplicavel(tx, registroId, input, tenantId) {
        if (!tipoDoacaoIntegraAlmoxarifado(input.tipo_doacao)) {
            return;
        }
        if (!statusPermiteIntegracaoAlmoxarifado(input.status)) {
            return;
        }
        const itens = (input.itens ?? []).filter((item) => item.quantidade > 0);
        if (!itens.length) {
            return;
        }
        const movimentacoesExistentes = await tx.$queryRaw(Prisma.sql `
      SELECT id
      FROM almoxarifado_movimentacao
      WHERE doacao_id = ${registroId}
        AND tenant_id::text = ${tenantId}
      LIMIT 1
    `);
        if (movimentacoesExistentes[0]) {
            return;
        }
        const doadorRows = input.doador_id
            ? await tx.$queryRaw(Prisma.sql `
          SELECT nome
          FROM doador
          WHERE id = ${BigInt(input.doador_id)}
            AND tenant_id::text = ${tenantId}
          LIMIT 1
        `)
            : [];
        const responsavel = normalizarTextoLivre(doadorRows[0]?.nome) || "Doador nÃ£o informado";
        const categoria = "DoaÃ§Ã£o";
        const referencia = `DoaÃ§Ã£o ${registroId.toString()}`;
        for (const item of itens) {
            const descricao = formatarDescricaoProdutoAlmoxarifado(item.descricao);
            if (!descricao)
                continue;
            const unidade = normalizarTextoLivre(item.unidade) || "UN";
            let almoxItem = await this.buscarItemAlmoxarifadoDuplicado(tx, descricao, categoria, unidade, tenantId);
            if (!almoxItem) {
                almoxItem = await this.criarItemAlmoxarifadoViaDoacao(tx, {
                    descricao,
                    categoria,
                    unidade,
                    valor_unitario: item.valor_unitario,
                    observacoes: `Item criado automaticamente a partir da doaÃ§Ã£o ${registroId.toString()}.`
                }, tenantId);
            }
            if (!almoxItem) {
                throw new AppError("Nao foi possivel localizar ou criar o item de almoxarifado da doacao.", 500);
            }
            const quantidade = Number(item.quantidade ?? 0);
            const saldoApos = Number(almoxItem.estoque_atual ?? 0) + quantidade;
            await tx.$executeRaw(Prisma.sql `
        UPDATE almoxarifado_item
        SET estoque_atual = ${saldoApos}, atualizado_em = NOW()
        WHERE id = ${almoxItem.id}
          AND tenant_id::text = ${tenantId}
      `);
            await tx.$executeRaw(Prisma.sql `
        INSERT INTO almoxarifado_movimentacao (
          tenant_id,
          item_id,
          data_movimentacao,
          tipo,
          quantidade,
          saldo_apos,
          referencia,
          responsavel,
          observacoes,
          doacao_id,
          criado_em
        ) VALUES (
          ${tenantId}::uuid,
          ${almoxItem.id},
          ${toOptionalDate(input.data_recebimento)},
          ${"Entrada"},
          ${quantidade},
          ${saldoApos},
          ${referencia},
          ${responsavel},
          ${normalizarTextoLivre(input.descricao) || "Entrada gerada automaticamente pelo recebimento de doaÃ§Ã£o."},
          ${registroId},
          NOW()
        )
      `);
        }
        await tx.$executeRaw(Prisma.sql `
      UPDATE recebimento_doacao
      SET lancamentos_gerados = TRUE, atualizado_em = NOW()
      WHERE id = ${registroId}
        AND tenant_id::text = ${tenantId}
    `);
    }
    async buscarItemAlmoxarifadoDuplicado(tx, descricao, categoria, unidade, tenantId) {
        const rows = await tx.$queryRaw(Prisma.sql `
      SELECT id, estoque_atual, descricao, categoria, unidade
      FROM almoxarifado_item
      WHERE LOWER(categoria) = ${normalizarTextoBusca(categoria)}
        AND tenant_id::text = ${tenantId}
      ORDER BY id ASC
    `);
        const chaveDescricao = normalizarChaveProduto(descricao);
        const chaveUnidade = normalizarChaveProduto(unidade);
        return (rows.find((item) => {
            const mesmaDescricao = normalizarChaveProduto(item.descricao) === chaveDescricao;
            const mesmaUnidade = normalizarChaveProduto(item.unidade) === chaveUnidade;
            return mesmaDescricao && mesmaUnidade;
        }) ??
            rows.find((item) => normalizarChaveProduto(item.descricao) === chaveDescricao) ??
            null);
    }
    async criarItemAlmoxarifadoViaDoacao(tx, input, tenantId) {
        const proximoCodigoRows = await tx.$queryRaw(Prisma.sql `
      SELECT COALESCE(MAX(CAST(codigo AS INTEGER)), 0) + 1 AS proximo
      FROM almoxarifado_item
      WHERE codigo ~ '^[0-9]+$'
        AND tenant_id::text = ${tenantId}
    `);
        const codigo = String(proximoCodigoRows[0]?.proximo ?? 1).padStart(4, "0");
        const inserted = await tx.$queryRaw(Prisma.sql `
      INSERT INTO almoxarifado_item (
        tenant_id,
        codigo,
        descricao,
        categoria,
        unidade,
        estoque_atual,
        estoque_minimo,
        valor_unitario,
        is_kit,
        situacao,
        ignorar_validade,
        observacoes,
        criado_em,
        atualizado_em
      ) VALUES (
        ${tenantId}::uuid,
        ${codigo},
        ${input.descricao},
        ${input.categoria},
        ${input.unidade},
        0,
        0,
        ${toOptionalNumber(input.valor_unitario) ?? 0},
        FALSE,
        ${"Ativo"},
        TRUE,
        ${trimOrUndefined(input.observacoes)},
        NOW(),
        NOW()
      )
      RETURNING id, estoque_atual, descricao, categoria, unidade
    `);
        const item = inserted[0];
        if (!item) {
            throw new AppError("Nao foi possivel criar o item de almoxarifado para a doacao.", 500);
        }
        return item;
    }
}
