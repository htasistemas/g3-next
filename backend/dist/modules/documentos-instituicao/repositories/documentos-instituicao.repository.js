import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { toOptionalDate, trimOrUndefined } from "../../../utils/string-utils.js";
function calcularSituacao(input) {
    if (input.emRenovacao)
        return "em_renovacao";
    if (input.semVencimento || input.vencimentoIndeterminado || !input.validade) {
        return "sem_vencimento";
    }
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const validade = new Date(`${input.validade}T00:00:00.000Z`);
    if (Number.isNaN(validade.getTime()))
        return "valido";
    if (validade < hoje)
        return "vencido";
    const alerta = new Date(hoje);
    alerta.setDate(alerta.getDate() + 30);
    if (validade <= alerta)
        return "vence_em_breve";
    return "valido";
}
function montarDataUri(conteudoBase64, tipoMime) {
    if (conteudoBase64.startsWith("data:"))
        return conteudoBase64;
    const mime = trimOrUndefined(tipoMime) ?? "application/octet-stream";
    return `data:${mime};base64,${conteudoBase64}`;
}
export class DocumentosInstituicaoRepository {
    async listar() {
        return prisma.$queryRaw(Prisma.sql `
      SELECT
        id,
        tipo_documento,
        orgao_emissor,
        descricao,
        categoria,
        emissao,
        validade,
        responsavel_interno,
        modo_renovacao,
        observacao_renovacao,
        gerar_alerta,
        dias_antecedencia,
        forma_alerta,
        em_renovacao,
        sem_vencimento,
        vencimento_indeterminado,
        situacao,
        criado_em,
        atualizado_em
      FROM documentos_instituicao
      ORDER BY emissao DESC, id DESC
    `);
    }
    async buscarPorId(id) {
        const rows = await prisma.$queryRaw(Prisma.sql `
      SELECT
        id,
        tipo_documento,
        orgao_emissor,
        descricao,
        categoria,
        emissao,
        validade,
        responsavel_interno,
        modo_renovacao,
        observacao_renovacao,
        gerar_alerta,
        dias_antecedencia,
        forma_alerta,
        em_renovacao,
        sem_vencimento,
        vencimento_indeterminado,
        situacao,
        criado_em,
        atualizado_em
      FROM documentos_instituicao
      WHERE id = ${id}
      LIMIT 1
    `);
        return rows[0] ?? null;
    }
    async buscarPorIdOuFalhar(id) {
        const registro = await this.buscarPorId(id);
        if (!registro) {
            throw new AppError("Documento institucional nao encontrado.", 404);
        }
        return registro;
    }
    async criar(input) {
        const situacao = calcularSituacao(input);
        const inserted = await prisma.$queryRaw(Prisma.sql `
      INSERT INTO documentos_instituicao (
        tipo_documento,
        orgao_emissor,
        descricao,
        categoria,
        emissao,
        validade,
        responsavel_interno,
        modo_renovacao,
        observacao_renovacao,
        gerar_alerta,
        dias_antecedencia,
        forma_alerta,
        em_renovacao,
        sem_vencimento,
        vencimento_indeterminado,
        situacao,
        criado_em,
        atualizado_em
      ) VALUES (
        ${input.tipoDocumento},
        ${input.orgaoEmissor},
        ${trimOrUndefined(input.descricao ?? undefined)},
        ${trimOrUndefined(input.categoria ?? undefined)},
        ${toOptionalDate(input.emissao)},
        ${toOptionalDate(input.validade ?? undefined)},
        ${trimOrUndefined(input.responsavelInterno ?? undefined)},
        ${trimOrUndefined(input.modoRenovacao ?? undefined)},
        ${trimOrUndefined(input.observacaoRenovacao ?? undefined)},
        ${input.gerarAlerta ?? true},
        ${JSON.stringify(input.diasAntecedencia ?? [])},
        ${trimOrUndefined(input.formaAlerta ?? undefined)},
        ${input.emRenovacao ?? false},
        ${input.semVencimento ?? false},
        ${input.vencimentoIndeterminado ?? false},
        ${situacao},
        NOW(),
        NOW()
      )
      RETURNING id
    `);
        const id = inserted[0]?.id;
        if (!id) {
            throw new AppError("Nao foi possivel criar documento institucional.", 500);
        }
        return this.buscarPorIdOuFalhar(id);
    }
    async atualizar(id, input) {
        await this.buscarPorIdOuFalhar(id);
        const situacao = calcularSituacao(input);
        await prisma.$executeRaw(Prisma.sql `
      UPDATE documentos_instituicao
      SET
        tipo_documento = ${input.tipoDocumento},
        orgao_emissor = ${input.orgaoEmissor},
        descricao = ${trimOrUndefined(input.descricao ?? undefined)},
        categoria = ${trimOrUndefined(input.categoria ?? undefined)},
        emissao = ${toOptionalDate(input.emissao)},
        validade = ${toOptionalDate(input.validade ?? undefined)},
        responsavel_interno = ${trimOrUndefined(input.responsavelInterno ?? undefined)},
        modo_renovacao = ${trimOrUndefined(input.modoRenovacao ?? undefined)},
        observacao_renovacao = ${trimOrUndefined(input.observacaoRenovacao ?? undefined)},
        gerar_alerta = ${input.gerarAlerta ?? true},
        dias_antecedencia = ${JSON.stringify(input.diasAntecedencia ?? [])},
        forma_alerta = ${trimOrUndefined(input.formaAlerta ?? undefined)},
        em_renovacao = ${input.emRenovacao ?? false},
        sem_vencimento = ${input.semVencimento ?? false},
        vencimento_indeterminado = ${input.vencimentoIndeterminado ?? false},
        situacao = ${situacao},
        atualizado_em = NOW()
      WHERE id = ${id}
    `);
        return this.buscarPorIdOuFalhar(id);
    }
    async excluir(id) {
        await this.buscarPorIdOuFalhar(id);
        await prisma.$executeRaw(Prisma.sql `
      DELETE FROM documentos_instituicao
      WHERE id = ${id}
    `);
    }
    async listarAnexos(documentoId) {
        await this.buscarPorIdOuFalhar(documentoId);
        return prisma.$queryRaw(Prisma.sql `
      SELECT
        id,
        documento_id,
        nome_arquivo,
        tipo,
        tipo_mime,
        tamanho,
        caminho_arquivo,
        data_upload,
        usuario,
        criado_em
      FROM documentos_instituicao_anexos
      WHERE documento_id = ${documentoId}
      ORDER BY data_upload DESC, id DESC
    `);
    }
    async buscarAnexoPorId(documentoId, anexoId) {
        const rows = await prisma.$queryRaw(Prisma.sql `
      SELECT
        id,
        documento_id,
        nome_arquivo,
        tipo,
        tipo_mime,
        tamanho,
        caminho_arquivo,
        data_upload,
        usuario,
        criado_em
      FROM documentos_instituicao_anexos
      WHERE documento_id = ${documentoId}
        AND id = ${anexoId}
      LIMIT 1
    `);
        return rows[0] ?? null;
    }
    async buscarAnexoPorIdOuFalhar(documentoId, anexoId) {
        const anexo = await this.buscarAnexoPorId(documentoId, anexoId);
        if (!anexo) {
            throw new AppError("Anexo nao encontrado.", 404);
        }
        return anexo;
    }
    async adicionarAnexo(documentoId, input) {
        await this.buscarPorIdOuFalhar(documentoId);
        const inserted = await prisma.$queryRaw(Prisma.sql `
      INSERT INTO documentos_instituicao_anexos (
        documento_id,
        nome_arquivo,
        tipo,
        tipo_mime,
        tamanho,
        caminho_arquivo,
        data_upload,
        usuario,
        criado_em
      ) VALUES (
        ${documentoId},
        ${input.nomeArquivo},
        ${input.tipo},
        ${trimOrUndefined(input.tipoMime ?? undefined)},
        ${trimOrUndefined(input.tamanho ?? undefined)},
        ${montarDataUri(input.conteudoBase64, input.tipoMime)},
        ${toOptionalDate(input.dataUpload ?? undefined) ?? new Date()},
        ${input.usuario},
        NOW()
      )
      RETURNING id
    `);
        const id = inserted[0]?.id;
        if (!id) {
            throw new AppError("Nao foi possivel adicionar anexo.", 500);
        }
        return this.buscarAnexoPorIdOuFalhar(documentoId, id);
    }
    async listarHistorico(documentoId) {
        await this.buscarPorIdOuFalhar(documentoId);
        return prisma.$queryRaw(Prisma.sql `
      SELECT
        id,
        documento_id,
        data_hora,
        usuario,
        tipo_alteracao,
        observacao,
        criado_em
      FROM documentos_instituicao_historico
      WHERE documento_id = ${documentoId}
      ORDER BY data_hora DESC, id DESC
    `);
    }
    async adicionarHistorico(documentoId, input) {
        await this.buscarPorIdOuFalhar(documentoId);
        const dataHora = trimOrUndefined(input.dataHora ?? undefined);
        const data = dataHora ? new Date(dataHora) : new Date();
        if (Number.isNaN(data.getTime())) {
            throw new AppError("Data do historico invalida.", 400);
        }
        const inserted = await prisma.$queryRaw(Prisma.sql `
      INSERT INTO documentos_instituicao_historico (
        documento_id,
        data_hora,
        usuario,
        tipo_alteracao,
        observacao,
        criado_em
      ) VALUES (
        ${documentoId},
        ${data},
        ${input.usuario},
        ${input.tipoAlteracao},
        ${trimOrUndefined(input.observacao ?? undefined)},
        NOW()
      )
      RETURNING id
    `);
        const id = inserted[0]?.id;
        if (!id) {
            throw new AppError("Nao foi possivel registrar historico.", 500);
        }
        const rows = await prisma.$queryRaw(Prisma.sql `
      SELECT
        id,
        documento_id,
        data_hora,
        usuario,
        tipo_alteracao,
        observacao,
        criado_em
      FROM documentos_instituicao_historico
      WHERE id = ${id}
      LIMIT 1
    `);
        const registro = rows[0];
        if (!registro) {
            throw new AppError("Historico nao encontrado apos inclusao.", 500);
        }
        return registro;
    }
}
