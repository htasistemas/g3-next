import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { toOptionalDate, trimOrUndefined } from "../../../utils/string-utils.js";
function normalizarDestinatarios(input) {
    const destinatario = trimOrUndefined(input.identificacao.destinatario ?? undefined) ??
        trimOrUndefined(input.conteudo.para ?? undefined) ??
        "Nao informado";
    const destinatarioResponsavel = trimOrUndefined(input.identificacao.destinatarioResponsavel ?? undefined) ?? destinatario;
    const destinatarioCargo = trimOrUndefined(input.identificacao.destinatarioCargo ?? undefined) ??
        trimOrUndefined(input.conteudo.cargoPara ?? undefined) ??
        "Nao informado";
    return {
        destinatario,
        destinatarioResponsavel,
        destinatarioCargo
    };
}
export class OficiosRepository {
    schemaInfoPromise = null;
    async obterSchemaInfo() {
        if (!this.schemaInfoPromise) {
            this.schemaInfoPromise = prisma
                .$queryRaw(Prisma.sql `
          SELECT column_name
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'oficios'
        `)
                .then((rows) => {
                const colunas = new Set(rows.map((row) => row.column_name));
                return {
                    possuiDestinatarioResponsavel: colunas.has("destinatario_responsavel"),
                    possuiDestinatarioCargo: colunas.has("destinatario_cargo")
                };
            });
        }
        return this.schemaInfoPromise;
    }
    async consultarOficios(id) {
        const schema = await this.obterSchemaInfo();
        const colunas = [
            "id",
            "tipo",
            "numero",
            "data",
            "setor_origem",
            "responsavel",
            "destinatario",
            schema.possuiDestinatarioResponsavel
                ? "destinatario_responsavel"
                : "destinatario AS destinatario_responsavel",
            schema.possuiDestinatarioCargo
                ? "destinatario_cargo"
                : "COALESCE(cargo_para, destinatario) AS destinatario_cargo",
            "meio_envio",
            "prazo_resposta",
            "classificacao",
            "razao_social",
            "logo_url",
            "titulo",
            "saudacao",
            "para",
            "cargo_para",
            "assunto",
            "corpo",
            "finalizacao",
            "assinatura_nome",
            "assinatura_cargo",
            "rodape",
            "status",
            "protocolo_envio",
            "data_envio",
            "protocolo_recebimento",
            "data_recebimento",
            "proximo_destino",
            "observacoes",
            "unidade_id",
            "criado_por",
            "criado_em",
            "atualizado_em",
            "pdf_assinado_nome",
            "pdf_assinado_tipo",
            "pdf_assinado_conteudo"
        ].join(",\n        ");
        if (id) {
            return prisma.$queryRawUnsafe(`
          SELECT
            ${colunas}
          FROM oficios
          WHERE id = $1
          LIMIT 1
        `, id);
        }
        return prisma.$queryRawUnsafe(`
      SELECT
        ${colunas}
      FROM oficios
      ORDER BY data DESC, id DESC
    `);
    }
    async listar() {
        const oficios = await this.consultarOficios();
        if (!oficios.length) {
            return [];
        }
        const tramites = await this.listarTramitesPorOficios(oficios.map((item) => item.id));
        return oficios.map((oficio) => ({
            oficio,
            tramites: tramites.filter((tramite) => tramite.oficio_id === oficio.id)
        }));
    }
    async buscarPorId(id) {
        const rows = await this.consultarOficios(id);
        const oficio = rows[0];
        if (!oficio)
            return null;
        const tramites = await prisma.$queryRaw(Prisma.sql `
      SELECT
        id,
        oficio_id,
        data,
        origem,
        destino,
        responsavel,
        acao,
        observacoes,
        criado_em,
        atualizado_em
      FROM oficios_tramites
      WHERE oficio_id = ${id}
      ORDER BY data DESC NULLS LAST, id DESC
    `);
        return { oficio, tramites };
    }
    async buscarPorIdOuFalhar(id) {
        const registro = await this.buscarPorId(id);
        if (!registro) {
            throw new AppError("Oficio nao encontrado.", 404);
        }
        return registro;
    }
    async obterProximoNumero(dataReferencia) {
        const ano = this.extrairAnoReferencia(dataReferencia);
        const proximoNumero = await this.consultarProximoNumero(prisma, ano);
        return this.formatarNumeroOficio(proximoNumero, ano);
    }
    async criar(input) {
        const id = await prisma.$transaction(async (tx) => {
            const schema = await this.obterSchemaInfo();
            const destinatarios = normalizarDestinatarios(input);
            const numeroSequencial = await this.gerarNumeroSequencialTx(tx, input.identificacao.data);
            const campos = [
                Prisma.raw("tipo"),
                Prisma.raw("numero"),
                Prisma.raw("data"),
                Prisma.raw("setor_origem"),
                Prisma.raw("responsavel"),
                Prisma.raw("destinatario"),
                ...(schema.possuiDestinatarioResponsavel ? [Prisma.raw("destinatario_responsavel")] : []),
                ...(schema.possuiDestinatarioCargo ? [Prisma.raw("destinatario_cargo")] : []),
                Prisma.raw("meio_envio"),
                Prisma.raw("prazo_resposta"),
                Prisma.raw("classificacao"),
                Prisma.raw("razao_social"),
                Prisma.raw("logo_url"),
                Prisma.raw("titulo"),
                Prisma.raw("saudacao"),
                Prisma.raw("para"),
                Prisma.raw("cargo_para"),
                Prisma.raw("assunto"),
                Prisma.raw("corpo"),
                Prisma.raw("finalizacao"),
                Prisma.raw("assinatura_nome"),
                Prisma.raw("assinatura_cargo"),
                Prisma.raw("rodape"),
                Prisma.raw("status"),
                Prisma.raw("protocolo_envio"),
                Prisma.raw("data_envio"),
                Prisma.raw("protocolo_recebimento"),
                Prisma.raw("data_recebimento"),
                Prisma.raw("proximo_destino"),
                Prisma.raw("observacoes"),
                Prisma.raw("unidade_id"),
                Prisma.raw("criado_por"),
                Prisma.raw("criado_em"),
                Prisma.raw("atualizado_em")
            ];
            const valores = [
                Prisma.sql `${input.identificacao.tipo}`,
                Prisma.sql `${numeroSequencial}`,
                Prisma.sql `${toOptionalDate(input.identificacao.data)}`,
                Prisma.sql `${input.identificacao.setorOrigem}`,
                Prisma.sql `${input.identificacao.responsavel}`,
                Prisma.sql `${destinatarios.destinatario}`,
                ...(schema.possuiDestinatarioResponsavel
                    ? [Prisma.sql `${destinatarios.destinatarioResponsavel}`]
                    : []),
                ...(schema.possuiDestinatarioCargo ? [Prisma.sql `${destinatarios.destinatarioCargo}`] : []),
                Prisma.sql `${input.identificacao.meioEnvio}`,
                Prisma.sql `${trimOrUndefined(input.identificacao.prazoResposta ?? undefined)}`,
                Prisma.sql `${trimOrUndefined(input.identificacao.classificacao ?? undefined)}`,
                Prisma.sql `${input.conteudo.razaoSocial}`,
                Prisma.sql `${trimOrUndefined(input.conteudo.logoUrl ?? undefined)}`,
                Prisma.sql `${trimOrUndefined(input.conteudo.titulo ?? undefined)}`,
                Prisma.sql `${trimOrUndefined(input.conteudo.saudacao ?? undefined)}`,
                Prisma.sql `${trimOrUndefined(input.conteudo.para ?? undefined)}`,
                Prisma.sql `${trimOrUndefined(input.conteudo.cargoPara ?? undefined)}`,
                Prisma.sql `${input.conteudo.assunto}`,
                Prisma.sql `${input.conteudo.corpo}`,
                Prisma.sql `${trimOrUndefined(input.conteudo.finalizacao ?? undefined)}`,
                Prisma.sql `${trimOrUndefined(input.conteudo.assinaturaNome ?? undefined)}`,
                Prisma.sql `${trimOrUndefined(input.conteudo.assinaturaCargo ?? undefined)}`,
                Prisma.sql `${trimOrUndefined(input.conteudo.rodape ?? undefined)}`,
                Prisma.sql `${input.protocolo.status}`,
                Prisma.sql `${trimOrUndefined(input.protocolo.protocoloEnvio ?? undefined)}`,
                Prisma.sql `${toOptionalDate(input.protocolo.dataEnvio ?? undefined)}`,
                Prisma.sql `${trimOrUndefined(input.protocolo.protocoloRecebimento ?? undefined)}`,
                Prisma.sql `${toOptionalDate(input.protocolo.dataRecebimento ?? undefined)}`,
                Prisma.sql `${trimOrUndefined(input.protocolo.proximoDestino ?? undefined)}`,
                Prisma.sql `${trimOrUndefined(input.protocolo.observacoes ?? undefined)}`,
                Prisma.sql `${input.unidadeId ? BigInt(input.unidadeId) : null}`,
                Prisma.sql `${input.criadoPor ? BigInt(input.criadoPor) : null}`,
                Prisma.sql `NOW()`,
                Prisma.sql `NOW()`
            ];
            const inserted = await tx.$queryRaw(Prisma.sql `
        INSERT INTO oficios (${Prisma.join(campos, ", ")})
        VALUES (${Prisma.join(valores, ", ")})
        RETURNING id
      `);
            const oficioId = inserted[0]?.id;
            if (!oficioId) {
                throw new AppError("Nao foi possivel criar oficio.", 500);
            }
            await this.salvarTramites(tx, oficioId, input.tramites ?? []);
            return oficioId;
        });
        return this.buscarPorIdOuFalhar(id);
    }
    async atualizar(id, input) {
        await this.buscarPorIdOuFalhar(id);
        await prisma.$transaction(async (tx) => {
            const schema = await this.obterSchemaInfo();
            const destinatarios = normalizarDestinatarios(input);
            const atribuicoes = [
                Prisma.sql `tipo = ${input.identificacao.tipo}`,
                Prisma.sql `numero = ${input.identificacao.numero}`,
                Prisma.sql `data = ${toOptionalDate(input.identificacao.data)}`,
                Prisma.sql `setor_origem = ${input.identificacao.setorOrigem}`,
                Prisma.sql `responsavel = ${input.identificacao.responsavel}`,
                Prisma.sql `destinatario = ${destinatarios.destinatario}`,
                ...(schema.possuiDestinatarioResponsavel
                    ? [Prisma.sql `destinatario_responsavel = ${destinatarios.destinatarioResponsavel}`]
                    : []),
                ...(schema.possuiDestinatarioCargo
                    ? [Prisma.sql `destinatario_cargo = ${destinatarios.destinatarioCargo}`]
                    : []),
                Prisma.sql `meio_envio = ${input.identificacao.meioEnvio}`,
                Prisma.sql `prazo_resposta = ${trimOrUndefined(input.identificacao.prazoResposta ?? undefined)}`,
                Prisma.sql `classificacao = ${trimOrUndefined(input.identificacao.classificacao ?? undefined)}`,
                Prisma.sql `razao_social = ${input.conteudo.razaoSocial}`,
                Prisma.sql `logo_url = ${trimOrUndefined(input.conteudo.logoUrl ?? undefined)}`,
                Prisma.sql `titulo = ${trimOrUndefined(input.conteudo.titulo ?? undefined)}`,
                Prisma.sql `saudacao = ${trimOrUndefined(input.conteudo.saudacao ?? undefined)}`,
                Prisma.sql `para = ${trimOrUndefined(input.conteudo.para ?? undefined)}`,
                Prisma.sql `cargo_para = ${trimOrUndefined(input.conteudo.cargoPara ?? undefined)}`,
                Prisma.sql `assunto = ${input.conteudo.assunto}`,
                Prisma.sql `corpo = ${input.conteudo.corpo}`,
                Prisma.sql `finalizacao = ${trimOrUndefined(input.conteudo.finalizacao ?? undefined)}`,
                Prisma.sql `assinatura_nome = ${trimOrUndefined(input.conteudo.assinaturaNome ?? undefined)}`,
                Prisma.sql `assinatura_cargo = ${trimOrUndefined(input.conteudo.assinaturaCargo ?? undefined)}`,
                Prisma.sql `rodape = ${trimOrUndefined(input.conteudo.rodape ?? undefined)}`,
                Prisma.sql `status = ${input.protocolo.status}`,
                Prisma.sql `protocolo_envio = ${trimOrUndefined(input.protocolo.protocoloEnvio ?? undefined)}`,
                Prisma.sql `data_envio = ${toOptionalDate(input.protocolo.dataEnvio ?? undefined)}`,
                Prisma.sql `protocolo_recebimento = ${trimOrUndefined(input.protocolo.protocoloRecebimento ?? undefined)}`,
                Prisma.sql `data_recebimento = ${toOptionalDate(input.protocolo.dataRecebimento ?? undefined)}`,
                Prisma.sql `proximo_destino = ${trimOrUndefined(input.protocolo.proximoDestino ?? undefined)}`,
                Prisma.sql `observacoes = ${trimOrUndefined(input.protocolo.observacoes ?? undefined)}`,
                Prisma.sql `unidade_id = ${input.unidadeId ? BigInt(input.unidadeId) : null}`,
                Prisma.sql `atualizado_em = NOW()`
            ];
            await tx.$executeRaw(Prisma.sql `
        UPDATE oficios
        SET ${Prisma.join(atribuicoes, ", ")}
        WHERE id = ${id}
      `);
            await tx.$executeRaw(Prisma.sql `
        DELETE FROM oficios_tramites
        WHERE oficio_id = ${id}
      `);
            await this.salvarTramites(tx, id, input.tramites ?? []);
        });
        return this.buscarPorIdOuFalhar(id);
    }
    async remover(id) {
        await this.buscarPorIdOuFalhar(id);
        await prisma.$executeRaw(Prisma.sql `
      DELETE FROM oficios
      WHERE id = ${id}
    `);
    }
    async salvarPdfAssinado(id, input) {
        await this.buscarPorIdOuFalhar(id);
        await prisma.$executeRaw(Prisma.sql `
      UPDATE oficios
      SET
        pdf_assinado_nome = ${input.nomeArquivo},
        pdf_assinado_tipo = ${input.tipoMime},
        pdf_assinado_conteudo = ${input.conteudoBase64},
        atualizado_em = NOW()
      WHERE id = ${id}
    `);
        return this.buscarPorIdOuFalhar(id);
    }
    async obterPdfAssinado(id) {
        const registro = await this.buscarPorIdOuFalhar(id);
        return {
            nome: registro.oficio.pdf_assinado_nome,
            tipo: registro.oficio.pdf_assinado_tipo,
            conteudo: registro.oficio.pdf_assinado_conteudo
        };
    }
    async removerPdfAssinado(id) {
        await this.buscarPorIdOuFalhar(id);
        await prisma.$executeRaw(Prisma.sql `
      UPDATE oficios
      SET
        pdf_assinado_nome = NULL,
        pdf_assinado_tipo = NULL,
        pdf_assinado_conteudo = NULL,
        atualizado_em = NOW()
      WHERE id = ${id}
    `);
    }
    async listarImagens(oficioId) {
        await this.buscarPorIdOuFalhar(oficioId);
        return prisma.$queryRaw(Prisma.sql `
      SELECT
        id,
        oficio_id,
        nome_arquivo,
        tipo_mime,
        conteudo_base64,
        ordem,
        criado_em,
        atualizado_em
      FROM oficios_imagens
      WHERE oficio_id = ${oficioId}
      ORDER BY ordem ASC, id ASC
    `);
    }
    async adicionarImagem(oficioId, input) {
        await this.buscarPorIdOuFalhar(oficioId);
        const inserted = await prisma.$queryRaw(Prisma.sql `
      INSERT INTO oficios_imagens (
        oficio_id,
        nome_arquivo,
        tipo_mime,
        conteudo_base64,
        ordem,
        criado_em,
        atualizado_em
      ) VALUES (
        ${oficioId},
        ${input.nomeArquivo},
        ${input.tipoMime},
        ${input.conteudoBase64},
        ${input.ordem},
        NOW(),
        NOW()
      )
      RETURNING id
    `);
        const id = inserted[0]?.id;
        if (!id) {
            throw new AppError("Nao foi possivel adicionar imagem.", 500);
        }
        const rows = await prisma.$queryRaw(Prisma.sql `
      SELECT
        id,
        oficio_id,
        nome_arquivo,
        tipo_mime,
        conteudo_base64,
        ordem,
        criado_em,
        atualizado_em
      FROM oficios_imagens
      WHERE id = ${id}
      LIMIT 1
    `);
        const registro = rows[0];
        if (!registro) {
            throw new AppError("Imagem nao encontrada apos inclusao.", 500);
        }
        return registro;
    }
    async removerImagem(oficioId, imagemId) {
        await this.buscarPorIdOuFalhar(oficioId);
        const rows = await prisma.$queryRaw(Prisma.sql `
      SELECT id
      FROM oficios_imagens
      WHERE oficio_id = ${oficioId}
        AND id = ${imagemId}
      LIMIT 1
    `);
        if (!rows.length) {
            throw new AppError("Imagem do oficio nao encontrada.", 404);
        }
        await prisma.$executeRaw(Prisma.sql `
      DELETE FROM oficios_imagens
      WHERE oficio_id = ${oficioId}
        AND id = ${imagemId}
    `);
    }
    extrairAnoReferencia(dataReferencia) {
        if (dataReferencia && /^\d{4}-\d{2}-\d{2}$/.test(dataReferencia)) {
            return Number(dataReferencia.slice(0, 4));
        }
        return new Date().getFullYear();
    }
    formatarNumeroOficio(numero, ano) {
        return `${String(numero).padStart(4, "0")}/${ano}`;
    }
    async consultarProximoNumero(client, ano) {
        const rows = await client.$queryRaw(Prisma.sql `
      SELECT COALESCE(MAX(CAST(split_part(numero, '/', 1) AS INTEGER)), 0) AS maior_numero
      FROM oficios
      WHERE numero ~ ${`^[0-9]+/${ano}$`}
    `);
        return Number(rows[0]?.maior_numero ?? 0) + 1;
    }
    async gerarNumeroSequencialTx(tx, dataReferencia) {
        const ano = this.extrairAnoReferencia(dataReferencia);
        await tx.$executeRawUnsafe("LOCK TABLE oficios IN SHARE ROW EXCLUSIVE MODE");
        const proximoNumero = await this.consultarProximoNumero(tx, ano);
        return this.formatarNumeroOficio(proximoNumero, ano);
    }
    async listarTramitesPorOficios(oficioIds) {
        if (!oficioIds.length)
            return [];
        return prisma.$queryRaw(Prisma.sql `
      SELECT
        id,
        oficio_id,
        data,
        origem,
        destino,
        responsavel,
        acao,
        observacoes,
        criado_em,
        atualizado_em
      FROM oficios_tramites
      WHERE oficio_id IN (${Prisma.join(oficioIds)})
      ORDER BY data DESC NULLS LAST, id DESC
    `);
    }
    async salvarTramites(tx, oficioId, tramites) {
        for (const tramite of tramites) {
            await tx.$executeRaw(Prisma.sql `
        INSERT INTO oficios_tramites (
          oficio_id,
          data,
          origem,
          destino,
          responsavel,
          acao,
          observacoes,
          criado_em,
          atualizado_em
        ) VALUES (
          ${oficioId},
          ${toOptionalDate(tramite.data ?? undefined)},
          ${trimOrUndefined(tramite.origem ?? undefined)},
          ${trimOrUndefined(tramite.destino ?? undefined)},
          ${trimOrUndefined(tramite.responsavel ?? undefined)},
          ${tramite.acao},
          ${trimOrUndefined(tramite.observacoes ?? undefined)},
          NOW(),
          NOW()
        )
      `);
        }
    }
}
