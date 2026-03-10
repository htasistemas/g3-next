import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { toOptionalDate, trimOrUndefined } from "../../../utils/string-utils.js";
import type {
  RhArquivoInput,
  RhCandidatoInput,
  RhCartaBancoInput,
  RhDocumentoInput,
  RhEntrevistaInput,
  RhFichaInput,
  RhPpdInput,
  RhTermoInput
} from "../rh-contratacao.types.js";

type TransactionClient = Prisma.TransactionClient;

const documentosPadrao = [
  "RG",
  "CPF",
  "Comprovante de endereço",
  "Carteira de trabalho",
  "Cartão de benefício"
];

function toJsonString(value: unknown) {
  if (value == null) return null;
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

export class RhContratacaoRepository {
  async listarCandidatos(termo?: string | null) {
    const filtro = trimOrUndefined(termo ?? undefined);
    if (filtro) {
      return prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT
          c.id AS candidato_id,
          c.nome_completo,
          c.cpf,
          c.telefone,
          c.vaga_pretendida,
          c.ativo,
          p.id AS processo_id,
          p.status AS processo_status,
          p.atualizado_em AS processo_atualizado_em
        FROM rh_candidato c
        LEFT JOIN rh_processo_contratacao p ON p.candidato_id = c.id
        WHERE c.nome_completo ILIKE ${`%${filtro}%`}
           OR c.cpf ILIKE ${`%${filtro}%`}
        ORDER BY c.nome_completo ASC
      `);
    }
    return prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        c.id AS candidato_id,
        c.nome_completo,
        c.cpf,
        c.telefone,
        c.vaga_pretendida,
        c.ativo,
        p.id AS processo_id,
        p.status AS processo_status,
        p.atualizado_em AS processo_atualizado_em
      FROM rh_candidato c
      LEFT JOIN rh_processo_contratacao p ON p.candidato_id = c.id
      ORDER BY c.nome_completo ASC
    `);
  }

  async buscarCandidato(candidatoId: bigint) {
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        id,
        nome_completo,
        cpf,
        rg,
        pis,
        data_nascimento,
        naturalidade,
        estado_civil,
        nome_mae,
        nome_conjuge,
        vaga_pretendida,
        data_preenchimento,
        filhos_possui,
        filhos_json,
        deficiencia_possui,
        deficiencia_tipo,
        deficiencia_descricao,
        endereco_json,
        telefone,
        whatsapp,
        anexos_json,
        ativo,
        criado_em,
        atualizado_em
      FROM rh_candidato
      WHERE id = ${candidatoId}
      LIMIT 1
    `);
    return rows[0] ?? null;
  }

  async buscarCandidatoOuFalhar(candidatoId: bigint) {
    const candidato = await this.buscarCandidato(candidatoId);
    if (!candidato) {
      throw new AppError("Candidato nao encontrado.", 404);
    }
    return candidato;
  }

  async criarCandidato(input: RhCandidatoInput, usuarioId?: bigint | null) {
    const resultado = await prisma.$transaction(async (tx) => {
      const candidatoRows = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
        INSERT INTO rh_candidato (
          nome_completo,
          cpf,
          rg,
          pis,
          data_nascimento,
          naturalidade,
          estado_civil,
          nome_mae,
          nome_conjuge,
          vaga_pretendida,
          data_preenchimento,
          filhos_possui,
          filhos_json,
          deficiencia_possui,
          deficiencia_tipo,
          deficiencia_descricao,
          endereco_json,
          telefone,
          whatsapp,
          anexos_json,
          ativo,
          criado_em,
          atualizado_em
        ) VALUES (
          ${input.nomeCompleto},
          ${trimOrUndefined(input.cpf ?? undefined)},
          ${trimOrUndefined(input.rg ?? undefined)},
          ${trimOrUndefined(input.pis ?? undefined)},
          ${toOptionalDate(input.dataNascimento ?? undefined)},
          ${trimOrUndefined(input.naturalidade ?? undefined)},
          ${trimOrUndefined(input.estadoCivil ?? undefined)},
          ${trimOrUndefined(input.nomeMae ?? undefined)},
          ${trimOrUndefined(input.nomeConjuge ?? undefined)},
          ${trimOrUndefined(input.vagaPretendida ?? undefined)},
          ${toOptionalDate(input.dataPreenchimento ?? undefined)},
          ${!!input.filhosPossui},
          ${toJsonString(input.filhos)},
          ${!!input.deficienciaPossui},
          ${trimOrUndefined(input.deficienciaTipo ?? undefined)},
          ${trimOrUndefined(input.deficienciaDescricao ?? undefined)},
          ${toJsonString(input.endereco)},
          ${trimOrUndefined(input.telefone ?? undefined)},
          ${trimOrUndefined(input.whatsapp ?? undefined)},
          ${toJsonString(input.anexos)},
          TRUE,
          NOW(),
          NOW()
        )
        RETURNING id
      `);
      const candidatoId = candidatoRows[0]?.id;
      if (!candidatoId) {
        throw new AppError("Nao foi possivel criar candidato.", 500);
      }

      const processoRows = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
        INSERT INTO rh_processo_contratacao (
          candidato_id,
          status,
          responsavel_id,
          gestor_id,
          criado_em,
          atualizado_em,
          ultima_movimentacao_em
        ) VALUES (
          ${candidatoId},
          ${trimOrUndefined(input.statusProcesso ?? undefined) ?? "TRIAGEM"},
          ${usuarioId ?? null},
          NULL,
          NOW(),
          NOW(),
          NOW()
        )
        RETURNING id
      `);
      const processoId = processoRows[0]?.id;
      if (!processoId) {
        throw new AppError("Nao foi possivel criar processo de contratacao.", 500);
      }

      for (const tipoDocumento of documentosPadrao) {
        await tx.$executeRaw(Prisma.sql`
          INSERT INTO rh_documento_item (
            processo_id,
            tipo_documento,
            obrigatorio,
            status,
            observacao,
            atualizado_por,
            criado_em,
            atualizado_em
          ) VALUES (
            ${processoId},
            ${tipoDocumento},
            TRUE,
            'pendente',
            NULL,
            ${usuarioId ?? null},
            NOW(),
            NOW()
          )
          ON CONFLICT (processo_id, tipo_documento)
          DO NOTHING
        `);
      }

      await this.registrarAuditoria(
        tx,
        processoId,
        usuarioId ?? null,
        "CANDIDATO_CRIADO",
        `Candidato ${input.nomeCompleto} criado.`
      );

      return { candidatoId, processoId };
    });

    return this.buscarProcessoPorCandidato(resultado.candidatoId);
  }

  async atualizarCandidato(candidatoId: bigint, input: RhCandidatoInput, usuarioId?: bigint | null) {
    await this.buscarCandidatoOuFalhar(candidatoId);

    await prisma.$executeRaw(Prisma.sql`
      UPDATE rh_candidato
      SET
        nome_completo = ${input.nomeCompleto},
        cpf = ${trimOrUndefined(input.cpf ?? undefined)},
        rg = ${trimOrUndefined(input.rg ?? undefined)},
        pis = ${trimOrUndefined(input.pis ?? undefined)},
        data_nascimento = ${toOptionalDate(input.dataNascimento ?? undefined)},
        naturalidade = ${trimOrUndefined(input.naturalidade ?? undefined)},
        estado_civil = ${trimOrUndefined(input.estadoCivil ?? undefined)},
        nome_mae = ${trimOrUndefined(input.nomeMae ?? undefined)},
        nome_conjuge = ${trimOrUndefined(input.nomeConjuge ?? undefined)},
        vaga_pretendida = ${trimOrUndefined(input.vagaPretendida ?? undefined)},
        data_preenchimento = ${toOptionalDate(input.dataPreenchimento ?? undefined)},
        filhos_possui = ${!!input.filhosPossui},
        filhos_json = ${toJsonString(input.filhos)},
        deficiencia_possui = ${!!input.deficienciaPossui},
        deficiencia_tipo = ${trimOrUndefined(input.deficienciaTipo ?? undefined)},
        deficiencia_descricao = ${trimOrUndefined(input.deficienciaDescricao ?? undefined)},
        endereco_json = ${toJsonString(input.endereco)},
        telefone = ${trimOrUndefined(input.telefone ?? undefined)},
        whatsapp = ${trimOrUndefined(input.whatsapp ?? undefined)},
        anexos_json = ${toJsonString(input.anexos)},
        atualizado_em = NOW()
      WHERE id = ${candidatoId}
    `);

    const processo = await this.buscarProcessoPorCandidato(candidatoId);
    if (processo?.id) {
      await prisma.$transaction(async (tx) => {
        await tx.$executeRaw(Prisma.sql`
          UPDATE rh_processo_contratacao
          SET
            atualizado_em = NOW(),
            ultima_movimentacao_em = NOW()
          WHERE id = ${BigInt(processo.id)}
        `);
        await this.registrarAuditoria(
          tx,
          BigInt(processo.id),
          usuarioId ?? null,
          "CANDIDATO_ATUALIZADO",
          `Candidato ${input.nomeCompleto} atualizado.`
        );
      });
    }

    return this.buscarProcessoPorCandidato(candidatoId);
  }

  async inativarCandidato(candidatoId: bigint, usuarioId?: bigint | null) {
    await this.buscarCandidatoOuFalhar(candidatoId);
    const processo = await this.buscarProcessoPorCandidato(candidatoId);
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`
        UPDATE rh_candidato
        SET ativo = FALSE, atualizado_em = NOW()
        WHERE id = ${candidatoId}
      `);
      if (processo?.id) {
        await tx.$executeRaw(Prisma.sql`
          UPDATE rh_processo_contratacao
          SET
            status = 'INATIVO',
            atualizado_em = NOW(),
            ultima_movimentacao_em = NOW()
          WHERE id = ${BigInt(processo.id)}
        `);
        await this.registrarAuditoria(
          tx,
          BigInt(processo.id),
          usuarioId ?? null,
          "CANDIDATO_INATIVADO",
          `Candidato ${processo.nomeCompleto} inativado.`
        );
      }
    });
  }

  async buscarProcessoPorCandidato(candidatoId: bigint) {
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        p.id,
        p.candidato_id,
        p.status,
        p.responsavel_id,
        p.gestor_id,
        p.criado_em,
        p.atualizado_em,
        p.ultima_movimentacao_em,
        c.nome_completo,
        c.cpf,
        c.telefone,
        c.vaga_pretendida,
        c.ativo
      FROM rh_processo_contratacao p
      INNER JOIN rh_candidato c ON c.id = p.candidato_id
      WHERE p.candidato_id = ${candidatoId}
      LIMIT 1
    `);
    return rows[0] ?? null;
  }

  async buscarProcessoOuFalhar(processoId: bigint) {
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        p.id,
        p.candidato_id,
        p.status,
        p.responsavel_id,
        p.gestor_id,
        p.criado_em,
        p.atualizado_em,
        p.ultima_movimentacao_em,
        c.nome_completo,
        c.cpf,
        c.telefone,
        c.vaga_pretendida,
        c.ativo
      FROM rh_processo_contratacao p
      INNER JOIN rh_candidato c ON c.id = p.candidato_id
      WHERE p.id = ${processoId}
      LIMIT 1
    `);
    const processo = rows[0] ?? null;
    if (!processo) throw new AppError("Processo de contratacao nao encontrado.", 404);
    return processo;
  }

  async atualizarStatusProcesso(processoId: bigint, status: string, usuarioId?: bigint | null) {
    const processo = await this.buscarProcessoOuFalhar(processoId);
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`
        UPDATE rh_processo_contratacao
        SET
          status = ${status},
          atualizado_em = NOW(),
          ultima_movimentacao_em = NOW()
        WHERE id = ${processoId}
      `);
      await this.registrarAuditoria(
        tx,
        processoId,
        usuarioId ?? null,
        "STATUS_ATUALIZADO",
        `Status alterado de ${processo.status} para ${status}.`
      );
    });
    return this.buscarProcessoOuFalhar(processoId);
  }

  async listarEntrevistas(processoId: bigint) {
    await this.buscarProcessoOuFalhar(processoId);
    return prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        id,
        processo_id,
        tipo_roteiro,
        perguntas_json,
        respostas_json,
        parecer,
        observacoes,
        data_entrevista,
        criado_por,
        criado_em
      FROM rh_entrevista
      WHERE processo_id = ${processoId}
      ORDER BY criado_em DESC, id DESC
    `);
  }

  async salvarEntrevista(processoId: bigint, input: RhEntrevistaInput, usuarioId?: bigint | null) {
    await this.buscarProcessoOuFalhar(processoId);
    const rows = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
      INSERT INTO rh_entrevista (
        processo_id,
        tipo_roteiro,
        perguntas_json,
        respostas_json,
        parecer,
        observacoes,
        data_entrevista,
        criado_por,
        criado_em
      ) VALUES (
        ${processoId},
        ${trimOrUndefined(input.tipoRoteiro ?? undefined) ?? "PADRAO"},
        ${toJsonString(input.perguntas)},
        ${toJsonString(input.respostas)},
        ${trimOrUndefined(input.parecer ?? undefined)},
        ${trimOrUndefined(input.observacoes ?? undefined)},
        ${input.dataEntrevista ? new Date(`${input.dataEntrevista}T00:00:00.000Z`) : null},
        ${usuarioId ?? null},
        NOW()
      )
      RETURNING id
    `);
    const id = rows[0]?.id;
    if (!id) throw new AppError("Nao foi possivel salvar entrevista.", 500);
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`
        UPDATE rh_processo_contratacao
        SET atualizado_em = NOW(), ultima_movimentacao_em = NOW()
        WHERE id = ${processoId}
      `);
      await this.registrarAuditoria(
        tx,
        processoId,
        usuarioId ?? null,
        "ENTREVISTA_ADICIONADA",
        "Entrevista registrada no processo."
      );
    });
    const entrevistas = await this.listarEntrevistas(processoId);
    return entrevistas.find((item) => Number(item.id) === Number(id)) ?? entrevistas[0];
  }

  async buscarFicha(processoId: bigint) {
    await this.buscarProcessoOuFalhar(processoId);
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        id,
        processo_id,
        dados_pessoais_json,
        dependentes_json,
        dados_internos_json,
        criado_em,
        atualizado_em
      FROM rh_ficha_admissao
      WHERE processo_id = ${processoId}
      LIMIT 1
    `);
    return rows[0] ?? null;
  }

  async salvarFicha(processoId: bigint, input: RhFichaInput, usuarioId?: bigint | null) {
    await this.buscarProcessoOuFalhar(processoId);
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO rh_ficha_admissao (
          processo_id,
          dados_pessoais_json,
          dependentes_json,
          dados_internos_json,
          criado_em,
          atualizado_em
        ) VALUES (
          ${processoId},
          ${toJsonString(input.dadosPessoais)},
          ${toJsonString(input.dependentes)},
          ${toJsonString(input.dadosInternos)},
          NOW(),
          NOW()
        )
        ON CONFLICT (processo_id)
        DO UPDATE SET
          dados_pessoais_json = EXCLUDED.dados_pessoais_json,
          dependentes_json = EXCLUDED.dependentes_json,
          dados_internos_json = EXCLUDED.dados_internos_json,
          atualizado_em = NOW()
      `);
      await this.registrarAuditoria(
        tx,
        processoId,
        usuarioId ?? null,
        "FICHA_ADMISSAO_SALVA",
        "Ficha de admissao atualizada."
      );
    });
    return this.buscarFicha(processoId);
  }

  async listarDocumentos(processoId: bigint) {
    await this.buscarProcessoOuFalhar(processoId);
    return prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        id,
        processo_id,
        tipo_documento,
        obrigatorio,
        status,
        observacao,
        atualizado_por,
        criado_em,
        atualizado_em
      FROM rh_documento_item
      WHERE processo_id = ${processoId}
      ORDER BY id ASC
    `);
  }

  async atualizarDocumento(documentoId: bigint, input: RhDocumentoInput, usuarioId?: bigint | null) {
    const rows = await prisma.$queryRaw<Array<{ processo_id: bigint }>>(Prisma.sql`
      SELECT processo_id
      FROM rh_documento_item
      WHERE id = ${documentoId}
      LIMIT 1
    `);
    const processoId = rows[0]?.processo_id;
    if (!processoId) throw new AppError("Documento do processo nao encontrado.", 404);

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`
        UPDATE rh_documento_item
        SET
          tipo_documento = COALESCE(${trimOrUndefined(input.tipoDocumento ?? undefined)}, tipo_documento),
          obrigatorio = COALESCE(${input.obrigatorio ?? null}, obrigatorio),
          status = COALESCE(${trimOrUndefined(input.status ?? undefined)}, status),
          observacao = ${trimOrUndefined(input.observacao ?? undefined)},
          atualizado_por = ${usuarioId ?? null},
          atualizado_em = NOW()
        WHERE id = ${documentoId}
      `);
      await this.registrarAuditoria(
        tx,
        processoId,
        usuarioId ?? null,
        "DOCUMENTO_ATUALIZADO",
        `Documento ${documentoId.toString()} atualizado.`
      );
    });

    const documentos = await this.listarDocumentos(processoId);
    return documentos.find((item) => Number(item.id) === Number(documentoId)) ?? null;
  }

  async listarArquivos(processoId: bigint) {
    await this.buscarProcessoOuFalhar(processoId);
    return prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        id,
        processo_id,
        categoria,
        tipo_documento,
        nome_arquivo,
        mime_type,
        tamanho_bytes,
        caminho_arquivo,
        versao,
        criado_por,
        criado_em
      FROM rh_arquivo
      WHERE processo_id = ${processoId}
      ORDER BY criado_em DESC, id DESC
    `);
  }

  async adicionarArquivo(processoId: bigint, input: RhArquivoInput, usuarioId?: bigint | null) {
    await this.buscarProcessoOuFalhar(processoId);
    const rows = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
      INSERT INTO rh_arquivo (
        processo_id,
        categoria,
        tipo_documento,
        nome_arquivo,
        mime_type,
        tamanho_bytes,
        caminho_arquivo,
        versao,
        criado_por,
        criado_em
      ) VALUES (
        ${processoId},
        ${input.categoria},
        ${trimOrUndefined(input.tipoDocumento ?? undefined)},
        ${input.nomeArquivo},
        ${input.mimeType},
        ${BigInt(input.tamanhoBytes ?? (input.conteudoBase64?.length ?? 0))},
        ${trimOrUndefined(input.caminhoArquivo ?? undefined) ?? trimOrUndefined(input.conteudoBase64 ?? undefined)},
        1,
        ${usuarioId ?? null},
        NOW()
      )
      RETURNING id
    `);
    const id = rows[0]?.id;
    if (!id) throw new AppError("Nao foi possivel adicionar arquivo.", 500);

    await prisma.$transaction(async (tx) => {
      await this.registrarAuditoria(
        tx,
        processoId,
        usuarioId ?? null,
        "ARQUIVO_ADICIONADO",
        `Arquivo ${input.nomeArquivo} adicionado.`
      );
    });

    const arquivos = await this.listarArquivos(processoId);
    return arquivos.find((item) => Number(item.id) === Number(id)) ?? arquivos[0];
  }

  async listarTermos(processoId: bigint) {
    await this.buscarProcessoOuFalhar(processoId);
    return prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        id,
        processo_id,
        tipo,
        dados_json,
        status_assinatura,
        data_assinatura,
        responsavel,
        criado_em,
        atualizado_em
      FROM rh_termo
      WHERE processo_id = ${processoId}
      ORDER BY atualizado_em DESC, id DESC
    `);
  }

  async salvarTermo(processoId: bigint, input: RhTermoInput, usuarioId?: bigint | null) {
    await this.buscarProcessoOuFalhar(processoId);
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO rh_termo (
          processo_id,
          tipo,
          dados_json,
          status_assinatura,
          data_assinatura,
          responsavel,
          criado_em,
          atualizado_em
        ) VALUES (
          ${processoId},
          ${input.tipo},
          ${toJsonString(input.dados)},
          ${trimOrUndefined(input.statusAssinatura ?? undefined)},
          ${toOptionalDate(input.dataAssinatura ?? undefined)},
          ${trimOrUndefined(input.responsavel ?? undefined)},
          NOW(),
          NOW()
        )
        ON CONFLICT (processo_id, tipo)
        DO UPDATE SET
          dados_json = EXCLUDED.dados_json,
          status_assinatura = EXCLUDED.status_assinatura,
          data_assinatura = EXCLUDED.data_assinatura,
          responsavel = EXCLUDED.responsavel,
          atualizado_em = NOW()
      `);
      await this.registrarAuditoria(
        tx,
        processoId,
        usuarioId ?? null,
        "TERMO_SALVO",
        `Termo ${input.tipo} atualizado.`
      );
    });
    const termos = await this.listarTermos(processoId);
    return termos.find((item) => String(item.tipo) === input.tipo) ?? termos[0];
  }

  async buscarPpd(processoId: bigint) {
    await this.buscarProcessoOuFalhar(processoId);
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        id,
        processo_id,
        cabecalho_json,
        lado_a_json,
        lado_b_json,
        criado_em,
        atualizado_em
      FROM rh_ppd
      WHERE processo_id = ${processoId}
      LIMIT 1
    `);
    return rows[0] ?? null;
  }

  async salvarPpd(processoId: bigint, input: RhPpdInput, usuarioId?: bigint | null) {
    await this.buscarProcessoOuFalhar(processoId);
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO rh_ppd (
          processo_id,
          cabecalho_json,
          lado_a_json,
          lado_b_json,
          criado_em,
          atualizado_em
        ) VALUES (
          ${processoId},
          ${toJsonString(input.cabecalho)},
          ${toJsonString(input.ladoA)},
          ${toJsonString(input.ladoB)},
          NOW(),
          NOW()
        )
        ON CONFLICT (processo_id)
        DO UPDATE SET
          cabecalho_json = EXCLUDED.cabecalho_json,
          lado_a_json = EXCLUDED.lado_a_json,
          lado_b_json = EXCLUDED.lado_b_json,
          atualizado_em = NOW()
      `);
      await this.registrarAuditoria(
        tx,
        processoId,
        usuarioId ?? null,
        "PPD_SALVO",
        "Informacoes do PPD atualizadas."
      );
    });
    return this.buscarPpd(processoId);
  }

  async buscarCartaBanco(processoId: bigint) {
    await this.buscarProcessoOuFalhar(processoId);
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        id,
        processo_id,
        dados_json,
        criado_em,
        atualizado_em
      FROM rh_carta_banco
      WHERE processo_id = ${processoId}
      LIMIT 1
    `);
    return rows[0] ?? null;
  }

  async salvarCartaBanco(processoId: bigint, input: RhCartaBancoInput, usuarioId?: bigint | null) {
    await this.buscarProcessoOuFalhar(processoId);
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO rh_carta_banco (
          processo_id,
          dados_json,
          criado_em,
          atualizado_em
        ) VALUES (
          ${processoId},
          ${toJsonString(input.dados)},
          NOW(),
          NOW()
        )
        ON CONFLICT (processo_id)
        DO UPDATE SET
          dados_json = EXCLUDED.dados_json,
          atualizado_em = NOW()
      `);
      await this.registrarAuditoria(
        tx,
        processoId,
        usuarioId ?? null,
        "CARTA_BANCO_SALVA",
        "Carta ao banco atualizada."
      );
    });
    return this.buscarCartaBanco(processoId);
  }

  async listarAuditoria(processoId: bigint) {
    await this.buscarProcessoOuFalhar(processoId);
    return prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        a.id,
        a.processo_id,
        a.ator_id,
        u.nome_usuario AS ator_nome,
        a.acao,
        a.detalhes,
        a.criado_em
      FROM rh_auditoria_contratacao a
      LEFT JOIN usuarios u ON u.id = a.ator_id
      WHERE a.processo_id = ${processoId}
      ORDER BY a.criado_em DESC, a.id DESC
    `);
  }

  private async registrarAuditoria(
    tx: TransactionClient,
    processoId: bigint,
    usuarioId: bigint | null,
    acao: string,
    detalhes?: string | null
  ) {
    await tx.$executeRaw(Prisma.sql`
      INSERT INTO rh_auditoria_contratacao (
        processo_id,
        ator_id,
        acao,
        detalhes,
        criado_em
      ) VALUES (
        ${processoId},
        ${usuarioId},
        ${acao},
        ${trimOrUndefined(detalhes ?? undefined)},
        NOW()
      )
    `);
  }
}
