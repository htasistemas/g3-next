import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { toOptionalDate, trimOrUndefined } from "../../../utils/string-utils.js";
import type {
  DocumentoInstituicaoAnexoInput,
  DocumentoInstituicaoAnexoRow,
  DocumentoInstituicaoHistoricoInput,
  DocumentoInstituicaoHistoricoRow,
  DocumentoInstituicaoInput,
  DocumentoInstituicaoRow,
} from "../documentos-instituicao.types.js";
import { calcularSituacaoDocumentoInstituicao } from "../documentos-instituicao-status.js";

type TransactionClient = Prisma.TransactionClient;

function montarCaminhoOuDataUri(conteudoBase64: string, tipoMime?: string | null) {
  if (conteudoBase64.startsWith("data:")) return conteudoBase64;
  if (!/^[a-zA-Z0-9+/=\r\n]+$/.test(conteudoBase64)) return conteudoBase64;
  const mime = trimOrUndefined(tipoMime) ?? "application/octet-stream";
  return `data:${mime};base64,${conteudoBase64}`;
}

const estruturaSql = [
  "ALTER TABLE documentos_instituicao ADD COLUMN IF NOT EXISTS tenant_id UUID",
  "ALTER TABLE IF EXISTS documentos_instituicao_historico ADD COLUMN IF NOT EXISTS tenant_id UUID",
  `
    CREATE INDEX IF NOT EXISTS documentos_instituicao_tenant_idx
      ON documentos_instituicao (tenant_id, emissao DESC, id DESC)
  `,
  `
    CREATE INDEX IF NOT EXISTS documentos_instituicao_historico_tenant_idx
      ON documentos_instituicao_historico (tenant_id, documento_id, data_hora DESC)
  `,
  `
    UPDATE documentos_instituicao AS d
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
    UPDATE documentos_instituicao_historico AS h
    SET tenant_id = d.tenant_id
    FROM documentos_instituicao d
    WHERE h.tenant_id IS NULL
      AND d.id = h.documento_id
      AND d.tenant_id IS NOT NULL
  `
] as const;

let estruturaPromise: Promise<void> | null = null;

export class DocumentosInstituicaoRepository {
  private anexosSchemaReady?: Promise<void>;

  private async garantirEstrutura() {
    if (!estruturaPromise) {
      estruturaPromise = (async () => {
        for (const sql of estruturaSql) {
          await prisma.$executeRawUnsafe(sql);
        }
      })().catch((error) => {
        estruturaPromise = null;
        throw error;
      });
    }

    await estruturaPromise;
  }

  private async garantirSchemaAnexos() {
    if (!this.anexosSchemaReady) {
      this.anexosSchemaReady = (async () => {
        await this.garantirEstrutura();

        await prisma.$executeRaw(Prisma.sql`
          CREATE TABLE IF NOT EXISTS documentos_instituicao_anexos (
            id BIGSERIAL PRIMARY KEY,
            arquivo_id BIGINT,
            tenant_id UUID,
            documento_id BIGINT NOT NULL REFERENCES documentos_instituicao(id) ON DELETE CASCADE,
            nome_arquivo VARCHAR(200) NOT NULL,
            tipo VARCHAR(30) NOT NULL,
            tipo_mime VARCHAR(120),
            tamanho VARCHAR(40),
            caminho_arquivo TEXT,
            data_upload DATE NOT NULL,
            usuario VARCHAR(120) NOT NULL,
            criado_em TIMESTAMP NOT NULL DEFAULT NOW()
          )
        `);

        const comandos = [
          "ALTER TABLE IF EXISTS documentos_instituicao_anexos ADD COLUMN IF NOT EXISTS arquivo_id BIGINT",
          "ALTER TABLE IF EXISTS documentos_instituicao_anexos ADD COLUMN IF NOT EXISTS tenant_id UUID",
          "ALTER TABLE IF EXISTS documentos_instituicao_anexos ADD COLUMN IF NOT EXISTS nome_arquivo VARCHAR(200)",
          "ALTER TABLE IF EXISTS documentos_instituicao_anexos ADD COLUMN IF NOT EXISTS tipo VARCHAR(30)",
          "ALTER TABLE IF EXISTS documentos_instituicao_anexos ADD COLUMN IF NOT EXISTS tipo_mime VARCHAR(120)",
          "ALTER TABLE IF EXISTS documentos_instituicao_anexos ADD COLUMN IF NOT EXISTS tamanho VARCHAR(40)",
          "ALTER TABLE IF EXISTS documentos_instituicao_anexos ADD COLUMN IF NOT EXISTS caminho_arquivo TEXT",
          "ALTER TABLE IF EXISTS documentos_instituicao_anexos ADD COLUMN IF NOT EXISTS data_upload DATE DEFAULT CURRENT_DATE",
          "ALTER TABLE IF EXISTS documentos_instituicao_anexos ADD COLUMN IF NOT EXISTS usuario VARCHAR(120) DEFAULT 'Sistema'",
          "ALTER TABLE IF EXISTS documentos_instituicao_anexos ADD COLUMN IF NOT EXISTS criado_em TIMESTAMP NOT NULL DEFAULT NOW()",
          `
            ALTER TABLE IF EXISTS documentos_instituicao_anexos
              ALTER COLUMN nome_arquivo TYPE VARCHAR(200),
              ALTER COLUMN tipo TYPE VARCHAR(30),
              ALTER COLUMN tipo_mime TYPE VARCHAR(120),
              ALTER COLUMN tamanho TYPE VARCHAR(40),
              ALTER COLUMN caminho_arquivo TYPE TEXT,
              ALTER COLUMN usuario TYPE VARCHAR(120)
          `,
          `
            CREATE INDEX IF NOT EXISTS documentos_instituicao_anexos_documento_idx
              ON documentos_instituicao_anexos (documento_id)
          `,
          `
            CREATE INDEX IF NOT EXISTS documentos_instituicao_anexos_tenant_idx
              ON documentos_instituicao_anexos (tenant_id, documento_id, data_upload DESC)
          `,
          `
            UPDATE documentos_instituicao_anexos AS a
            SET arquivo_id = ar.id
            FROM arquivos ar
            WHERE a.arquivo_id IS NULL
              AND ar.caminho_arquivo = a.caminho_arquivo
              AND ar.ativo = TRUE
          `,
          `
            UPDATE documentos_instituicao_anexos AS a
            SET tenant_id = d.tenant_id
            FROM documentos_instituicao d
            WHERE a.tenant_id IS NULL
              AND d.id = a.documento_id
              AND d.tenant_id IS NOT NULL
          `
        ];

        for (const comando of comandos) {
          await prisma.$executeRawUnsafe(comando);
        }
      })().catch((error) => {
        this.anexosSchemaReady = undefined;
        throw error;
      });
    }

    await this.anexosSchemaReady;
  }

  async listar(tenantId: string) {
    await this.garantirEstrutura();
    return prisma.$queryRaw<DocumentoInstituicaoRow[]>(Prisma.sql`
      SELECT
        d.id,
        d.tipo_documento,
        d.orgao_emissor,
        d.descricao,
        d.categoria,
        d.emissao,
        d.validade,
        d.responsavel_interno,
        d.modo_renovacao,
        d.observacao_renovacao,
        d.gerar_alerta,
        d.dias_antecedencia,
        d.forma_alerta,
        d.em_renovacao,
        d.sem_vencimento,
        d.vencimento_indeterminado,
        d.situacao,
        d.criado_em,
        d.atualizado_em,
        COALESCE(anexos.total, 0)::int AS anexo_quantidade
      FROM documentos_instituicao d
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS total
        FROM documentos_instituicao_anexos a
        WHERE a.documento_id = d.id
          AND a.tenant_id::text = ${tenantId}
      ) anexos ON TRUE
      WHERE d.tenant_id::text = ${tenantId}
      ORDER BY emissao DESC, id DESC
    `);
  }

  async buscarPorId(id: bigint, tenantId: string) {
    await this.garantirEstrutura();
    const rows = await prisma.$queryRaw<DocumentoInstituicaoRow[]>(Prisma.sql`
      SELECT
        d.id,
        d.tipo_documento,
        d.orgao_emissor,
        d.descricao,
        d.categoria,
        d.emissao,
        d.validade,
        d.responsavel_interno,
        d.modo_renovacao,
        d.observacao_renovacao,
        d.gerar_alerta,
        d.dias_antecedencia,
        d.forma_alerta,
        d.em_renovacao,
        d.sem_vencimento,
        d.vencimento_indeterminado,
        d.situacao,
        d.criado_em,
        d.atualizado_em,
        COALESCE(anexos.total, 0)::int AS anexo_quantidade
      FROM documentos_instituicao d
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS total
        FROM documentos_instituicao_anexos a
        WHERE a.documento_id = d.id
          AND a.tenant_id::text = ${tenantId}
      ) anexos ON TRUE
      WHERE d.id = ${id}
        AND d.tenant_id::text = ${tenantId}
      LIMIT 1
    `);
    return rows[0] ?? null;
  }

  async buscarPorIdOuFalhar(id: bigint, tenantId: string) {
    const registro = await this.buscarPorId(id, tenantId);
    if (!registro) {
      throw new AppError("Documento institucional nao encontrado.", 404);
    }
    return registro;
  }

  async criar(input: DocumentoInstituicaoInput, tenantId: string) {
    await this.garantirEstrutura();
    const situacao = calcularSituacaoDocumentoInstituicao(input);
    const diasAntecedencia = JSON.stringify(input.diasAntecedencia ?? []);
    const inserted = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
      INSERT INTO documentos_instituicao (
        tenant_id,
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
        CAST(${tenantId} AS UUID),
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
        CAST(${diasAntecedencia} AS JSONB),
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
    return this.buscarPorIdOuFalhar(id, tenantId);
  }

  async atualizar(id: bigint, input: DocumentoInstituicaoInput, tenantId: string) {
    await this.garantirEstrutura();
    await this.buscarPorIdOuFalhar(id, tenantId);
    const situacao = calcularSituacaoDocumentoInstituicao(input);
    const diasAntecedencia = JSON.stringify(input.diasAntecedencia ?? []);

    await prisma.$executeRaw(Prisma.sql`
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
        dias_antecedencia = CAST(${diasAntecedencia} AS JSONB),
        forma_alerta = ${trimOrUndefined(input.formaAlerta ?? undefined)},
        em_renovacao = ${input.emRenovacao ?? false},
        sem_vencimento = ${input.semVencimento ?? false},
        vencimento_indeterminado = ${input.vencimentoIndeterminado ?? false},
        situacao = ${situacao},
        atualizado_em = NOW()
      WHERE id = ${id}
        AND tenant_id::text = ${tenantId}
    `);

    return this.buscarPorIdOuFalhar(id, tenantId);
  }

  async excluir(id: bigint, tenantId: string) {
    await this.garantirEstrutura();
    await this.buscarPorIdOuFalhar(id, tenantId);
    await prisma.$executeRaw(Prisma.sql`
      DELETE FROM documentos_instituicao
      WHERE id = ${id}
        AND tenant_id::text = ${tenantId}
    `);
  }

  async listarAnexos(documentoId: bigint, tenantId: string) {
    await this.garantirSchemaAnexos();
    await this.buscarPorIdOuFalhar(documentoId, tenantId);
    return prisma.$queryRaw<DocumentoInstituicaoAnexoRow[]>(Prisma.sql`
      SELECT
        id,
        arquivo_id,
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
        AND tenant_id::text = ${tenantId}
      ORDER BY data_upload DESC, id DESC
    `);
  }

  async buscarAnexoPorId(documentoId: bigint, anexoId: bigint, tenantId: string) {
    await this.garantirSchemaAnexos();
    const rows = await prisma.$queryRaw<DocumentoInstituicaoAnexoRow[]>(Prisma.sql`
      SELECT
        id,
        arquivo_id,
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
        AND tenant_id::text = ${tenantId}
      LIMIT 1
    `);
    return rows[0] ?? null;
  }

  async buscarAnexoPorIdOuFalhar(documentoId: bigint, anexoId: bigint, tenantId: string) {
    const anexo = await this.buscarAnexoPorId(documentoId, anexoId, tenantId);
    if (!anexo) {
      throw new AppError("Anexo nao encontrado.", 404);
    }
    return anexo;
  }

  async adicionarAnexo(
    documentoId: bigint,
    input: DocumentoInstituicaoAnexoInput,
    tenantId: string
  ) {
    await this.garantirSchemaAnexos();
    await this.buscarPorIdOuFalhar(documentoId, tenantId);

    const inserted = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
      INSERT INTO documentos_instituicao_anexos (
        arquivo_id,
        tenant_id,
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
        ${input.arquivoId ?? null},
        CAST(${tenantId} AS UUID),
        ${documentoId},
        ${input.nomeArquivo},
        ${input.tipo},
        ${trimOrUndefined(input.tipoMime ?? undefined)},
        ${trimOrUndefined(input.tamanho ?? undefined)},
        ${montarCaminhoOuDataUri(input.conteudoBase64, input.tipoMime)},
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
    return this.buscarAnexoPorIdOuFalhar(documentoId, id, tenantId);
  }

  async atualizarAnexo(
    documentoId: bigint,
    anexoId: bigint,
    input: DocumentoInstituicaoAnexoInput,
    tenantId: string
  ) {
    await this.garantirSchemaAnexos();
    await this.buscarAnexoPorIdOuFalhar(documentoId, anexoId, tenantId);

    await prisma.$executeRaw(Prisma.sql`
      UPDATE documentos_instituicao_anexos
      SET
        arquivo_id = ${input.arquivoId ?? null},
        nome_arquivo = ${input.nomeArquivo},
        tipo = ${input.tipo},
        tipo_mime = ${trimOrUndefined(input.tipoMime ?? undefined)},
        tamanho = ${trimOrUndefined(input.tamanho ?? undefined)},
        caminho_arquivo = ${montarCaminhoOuDataUri(input.conteudoBase64, input.tipoMime)},
        data_upload = ${toOptionalDate(input.dataUpload ?? undefined) ?? new Date()},
        usuario = ${input.usuario}
      WHERE documento_id = ${documentoId}
        AND id = ${anexoId}
        AND tenant_id::text = ${tenantId}
    `);

    return this.buscarAnexoPorIdOuFalhar(documentoId, anexoId, tenantId);
  }

  async excluirAnexo(documentoId: bigint, anexoId: bigint, tenantId: string) {
    await this.garantirSchemaAnexos();
    const anexo = await this.buscarAnexoPorIdOuFalhar(documentoId, anexoId, tenantId);

    await prisma.$executeRaw(Prisma.sql`
      DELETE FROM documentos_instituicao_anexos
      WHERE documento_id = ${documentoId}
        AND id = ${anexoId}
        AND tenant_id::text = ${tenantId}
    `);

    return anexo;
  }

  async existeHistoricoAlertaEmail(documentoId: bigint, observacao: string, tenantId: string) {
    await this.garantirEstrutura();
    const rows = await prisma.$queryRaw<Array<{ existe: boolean }>>(Prisma.sql`
      SELECT EXISTS (
        SELECT 1
        FROM documentos_instituicao_historico
        WHERE documento_id = ${documentoId}
          AND tenant_id::text = ${tenantId}
          AND tipo_alteracao = 'Alerta por e-mail'
          AND observacao = ${observacao}
      ) AS existe
    `);

    return Boolean(rows[0]?.existe);
  }

  async listarHistorico(documentoId: bigint, tenantId: string) {
    await this.garantirEstrutura();
    await this.buscarPorIdOuFalhar(documentoId, tenantId);
    return prisma.$queryRaw<DocumentoInstituicaoHistoricoRow[]>(Prisma.sql`
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
        AND tenant_id::text = ${tenantId}
      ORDER BY data_hora DESC, id DESC
    `);
  }

  async adicionarHistorico(
    documentoId: bigint,
    input: DocumentoInstituicaoHistoricoInput,
    tenantId: string
  ) {
    await this.garantirEstrutura();
    await this.buscarPorIdOuFalhar(documentoId, tenantId);
    const dataHora = trimOrUndefined(input.dataHora ?? undefined);
    const data = dataHora ? new Date(dataHora) : new Date();
    if (Number.isNaN(data.getTime())) {
      throw new AppError("Data do historico invalida.", 400);
    }

    const inserted = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
      INSERT INTO documentos_instituicao_historico (
        tenant_id,
        documento_id,
        data_hora,
        usuario,
        tipo_alteracao,
        observacao,
        criado_em
      ) VALUES (
        CAST(${tenantId} AS UUID),
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

    const rows = await prisma.$queryRaw<DocumentoInstituicaoHistoricoRow[]>(Prisma.sql`
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
        AND tenant_id::text = ${tenantId}
      LIMIT 1
    `);

    const registro = rows[0];
    if (!registro) {
      throw new AppError("Historico nao encontrado apos inclusao.", 500);
    }
    return registro;
  }
}
