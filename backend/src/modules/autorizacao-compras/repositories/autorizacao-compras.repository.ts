import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { ensureArquivosEstrutura } from "../../arquivos/repositories/arquivos-estrutura.repository.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { toOptionalDate, trimOrUndefined } from "../../../utils/string-utils.js";
import {
  AUTORIZACAO_COMPRA_STATUS_ATIVOS,
  DEFAULT_APPROVAL_LEVELS,
  calcularResumoCotacoes,
  determinarNiveisObrigatorios,
  determinarValorSolicitacao,
  gerarNumeroAutorizacaoPagamento,
  gerarNumeroReserva,
  gerarNumeroSolicitacao,
  normalizarTipoCompra,
  normalizarStatusAutorizacao,
  resumirOrcamento,
  tipoCompraParaTipoItem,
  validarPermissaoNivel
} from "../autorizacao-compras.workflow.js";
import type {
  AutorizacaoCompraAprovacaoInput,
  AutorizacaoCompraAprovacaoRow,
  AutorizacaoCompraAtor,
  AutorizacaoCompraCotacaoInput,
  AutorizacaoCompraCotacaoRow,
  AutorizacaoCompraEscolhaFornecedorInput,
  AutorizacaoCompraHistoricoRow,
  AutorizacaoCompraInput,
  AutorizacaoCompraIntegracaoRow,
  AutorizacaoCompraItemInput,
  AutorizacaoCompraItemRow,
  AutorizacaoCompraNivelAprovacaoRow,
  AutorizacaoCompraPainelRow,
  AutorizacaoCompraReservaRow,
  AutorizacaoCompraRow,
  AutorizacaoCompraSetorSolicitanteRow,
  AutorizacaoPagamentoInput,
  FornecedorIndicadoresCompraAnteriorRow,
  ReservaBancariaInput
} from "../autorizacao-compras.types.js";

type DbClient = typeof prisma | Prisma.TransactionClient;

type ArquivoResumoRow = {
  id: bigint;
  entidade_tipo: string;
  entidade_id: bigint | null;
  categoria: string;
  nome_original: string;
  nome_arquivo: string;
  caminho_arquivo: string;
  mime_type: string;
  observacao: string | null;
  data_upload: Date;
};

type LancamentoCompraRow = {
  id: bigint;
  valor: number;
  situacao: string;
};

const COMPRA_SELECT = Prisma.sql`
  SELECT
    id,
    numero_solicitacao,
    titulo,
    tipo,
    area,
    responsavel,
    data_prevista,
    data_solicitacao,
    valor::float8 AS valor,
    valor_total_itens::float8 AS valor_total_itens,
    quantidade_itens,
    justificativa,
    observacoes,
    centro_custo,
    prioridade,
    status,
    solicitante,
    setor_solicitante,
    natureza_compra,
    dispensar_cotacao,
    motivo_dispensa,
    vencedor,
    cotacao_vencedora_id,
    menor_preco_cotacao_id,
    menor_preco_fornecedor,
    menor_preco_valor::float8 AS menor_preco_valor,
    justificativa_excecao_menor_preco,
    flag_excecao_menor_preco,
    registro_patrimonio,
    registro_almoxarifado,
    numero_reserva,
    numero_termo,
    autorizacao_pagamento_numero,
    autorizacao_pagamento_autor,
    autorizacao_pagamento_data,
    autorizacao_pagamento_observacoes,
    pagamento_autorizado_valor::float8 AS pagamento_autorizado_valor,
    pagamento_vencimento,
    pagamento_forma,
    conta_pagadora_id,
    documento_referencia,
    documento_fiscal,
    lancamento_financeiro_id,
    orcamento_previsto::float8 AS orcamento_previsto,
    orcamento_utilizado::float8 AS orcamento_utilizado,
    orcamento_saldo::float8 AS orcamento_saldo,
    valor_solicitacao::float8 AS valor_solicitacao,
    extrapola_orcamento,
    autorizacao_especial_orcamento,
    justificativa_orcamento,
    ativo,
    cancelado_em,
    finalizado_em,
    criado_em,
    atualizado_em
  FROM autorizacao_compras
`;

let estruturaPromise: Promise<void> | null = null;

export async function ensureAutorizacaoComprasEstrutura() {
  if (!estruturaPromise) {
    estruturaPromise = (async () => {
      await ensureArquivosEstrutura(prisma);

      await prisma.$executeRawUnsafe(`
        ALTER TABLE autorizacao_compras
          ADD COLUMN IF NOT EXISTS tenant_id UUID,
          ADD COLUMN IF NOT EXISTS numero_solicitacao VARCHAR(40),
          ADD COLUMN IF NOT EXISTS data_solicitacao DATE,
          ADD COLUMN IF NOT EXISTS solicitante VARCHAR(150),
          ADD COLUMN IF NOT EXISTS setor_solicitante VARCHAR(150),
          ADD COLUMN IF NOT EXISTS observacoes TEXT,
          ADD COLUMN IF NOT EXISTS natureza_compra VARCHAR(120),
          ADD COLUMN IF NOT EXISTS valor_total_itens NUMERIC(14,2),
          ADD COLUMN IF NOT EXISTS cotacao_vencedora_id BIGINT,
          ADD COLUMN IF NOT EXISTS menor_preco_cotacao_id BIGINT,
          ADD COLUMN IF NOT EXISTS menor_preco_fornecedor VARCHAR(200),
          ADD COLUMN IF NOT EXISTS menor_preco_valor NUMERIC(14,2),
          ADD COLUMN IF NOT EXISTS justificativa_excecao_menor_preco TEXT,
          ADD COLUMN IF NOT EXISTS flag_excecao_menor_preco BOOLEAN NOT NULL DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS pagamento_autorizado_valor NUMERIC(14,2),
          ADD COLUMN IF NOT EXISTS pagamento_vencimento DATE,
          ADD COLUMN IF NOT EXISTS pagamento_forma VARCHAR(100),
          ADD COLUMN IF NOT EXISTS conta_pagadora_id BIGINT REFERENCES conta_bancaria(id) ON DELETE SET NULL,
          ADD COLUMN IF NOT EXISTS documento_referencia VARCHAR(120),
          ADD COLUMN IF NOT EXISTS documento_fiscal VARCHAR(120),
          ADD COLUMN IF NOT EXISTS lancamento_financeiro_id BIGINT REFERENCES lancamento_financeiro(id) ON DELETE SET NULL,
          ADD COLUMN IF NOT EXISTS orcamento_previsto NUMERIC(14,2),
          ADD COLUMN IF NOT EXISTS orcamento_utilizado NUMERIC(14,2),
          ADD COLUMN IF NOT EXISTS orcamento_saldo NUMERIC(14,2),
          ADD COLUMN IF NOT EXISTS valor_solicitacao NUMERIC(14,2),
          ADD COLUMN IF NOT EXISTS extrapola_orcamento BOOLEAN NOT NULL DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS autorizacao_especial_orcamento BOOLEAN NOT NULL DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS justificativa_orcamento TEXT,
          ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT TRUE,
          ADD COLUMN IF NOT EXISTS cancelado_em TIMESTAMP,
          ADD COLUMN IF NOT EXISTS finalizado_em TIMESTAMP
      `);

      await prisma.$executeRawUnsafe(`
        ALTER TABLE autorizacao_compras_cotacoes
          ADD COLUMN IF NOT EXISTS contato VARCHAR(150),
          ADD COLUMN IF NOT EXISTS telefone VARCHAR(30),
          ADD COLUMN IF NOT EXISTS email VARCHAR(150),
          ADD COLUMN IF NOT EXISTS forma_pagamento VARCHAR(120),
          ADD COLUMN IF NOT EXISTS data_cotacao DATE,
          ADD COLUMN IF NOT EXISTS orcamento_arquivo_id BIGINT REFERENCES arquivos(id) ON DELETE SET NULL,
          ADD COLUMN IF NOT EXISTS cartao_cnpj_arquivo_id BIGINT REFERENCES arquivos(id) ON DELETE SET NULL,
          ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT TRUE,
          ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
      `);

      await prisma.$executeRawUnsafe(`
        ALTER TABLE autorizacao_compras_reserva_bancaria
          ADD COLUMN IF NOT EXISTS status VARCHAR(40) NOT NULL DEFAULT 'RESERVA_EFETUADA',
          ADD COLUMN IF NOT EXISTS observacao TEXT,
          ADD COLUMN IF NOT EXISTS usuario_responsavel VARCHAR(150),
          ADD COLUMN IF NOT EXISTS cancelado_em TIMESTAMP
      `);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS autorizacao_compras_item (
          id BIGSERIAL PRIMARY KEY,
          autorizacao_compra_id BIGINT NOT NULL REFERENCES autorizacao_compras(id) ON DELETE CASCADE,
          descricao VARCHAR(255) NOT NULL,
          quantidade NUMERIC(14,3) NOT NULL,
          unidade VARCHAR(20) NOT NULL,
          valor_estimado NUMERIC(14,2) NOT NULL,
          categoria VARCHAR(120),
          tipo_item VARCHAR(20) NOT NULL,
          ordem INTEGER NOT NULL DEFAULT 1,
          ativo BOOLEAN NOT NULL DEFAULT TRUE,
          criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
          atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS autorizacao_compras_aprovacao_nivel (
          id BIGSERIAL PRIMARY KEY,
          tenant_id UUID,
          codigo VARCHAR(60) NOT NULL,
          nome VARCHAR(120) NOT NULL,
          ordem INTEGER NOT NULL,
          valor_minimo NUMERIC(14,2) NOT NULL DEFAULT 0,
          valor_maximo NUMERIC(14,2),
          permissao_requerida VARCHAR(120) NOT NULL,
          ativo BOOLEAN NOT NULL DEFAULT TRUE,
          criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
          atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS autorizacao_compras_aprovacao (
          id BIGSERIAL PRIMARY KEY,
          autorizacao_compra_id BIGINT NOT NULL REFERENCES autorizacao_compras(id) ON DELETE CASCADE,
          nivel_id BIGINT NOT NULL REFERENCES autorizacao_compras_aprovacao_nivel(id) ON DELETE RESTRICT,
          decisao VARCHAR(30) NOT NULL,
          parecer TEXT NOT NULL,
          observacao TEXT,
          motivo TEXT,
          usuario_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
          usuario_nome VARCHAR(150),
          permissoes_json TEXT,
          ip VARCHAR(120),
          maquina VARCHAR(255),
          criado_em TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS autorizacao_compras_historico (
          id BIGSERIAL PRIMARY KEY,
          autorizacao_compra_id BIGINT NOT NULL REFERENCES autorizacao_compras(id) ON DELETE CASCADE,
          acao VARCHAR(160) NOT NULL,
          aba VARCHAR(80),
          status_anterior VARCHAR(40),
          status_novo VARCHAR(40),
          observacao TEXT,
          justificativa TEXT,
          usuario_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
          usuario_nome VARCHAR(150),
          perfil VARCHAR(255),
          ip VARCHAR(120),
          maquina VARCHAR(255),
          criado_em TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS autorizacao_compras_integracao (
          id BIGSERIAL PRIMARY KEY,
          autorizacao_compra_id BIGINT NOT NULL REFERENCES autorizacao_compras(id) ON DELETE CASCADE,
          tipo VARCHAR(40) NOT NULL,
          referencia_id VARCHAR(120),
          status VARCHAR(40) NOT NULL,
          detalhe TEXT,
          usuario_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
          usuario_nome VARCHAR(150),
          criado_em TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS autorizacao_compras_orcamento (
          id BIGSERIAL PRIMARY KEY,
          tenant_id UUID,
          setor_solicitante VARCHAR(150) NOT NULL,
          centro_custo VARCHAR(150) NOT NULL,
          orcamento_previsto NUMERIC(14,2) NOT NULL,
          ativo BOOLEAN NOT NULL DEFAULT TRUE,
          criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
          atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);

      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS autorizacao_compras_numero_idx
          ON autorizacao_compras (numero_solicitacao)
      `);
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS autorizacao_compras_tenant_idx
          ON autorizacao_compras (tenant_id, criado_em DESC, id DESC)
      `);
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS autorizacao_compras_setor_centro_idx
          ON autorizacao_compras (setor_solicitante, centro_custo)
      `);
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS autorizacao_compras_item_compra_idx
          ON autorizacao_compras_item (autorizacao_compra_id, ativo, ordem)
      `);
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS autorizacao_compras_cotacoes_compra_ativo_idx
          ON autorizacao_compras_cotacoes (autorizacao_compra_id, ativo, valor)
      `);
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS autorizacao_compras_reserva_compra_status_idx
          ON autorizacao_compras_reserva_bancaria (autorizacao_compra_id, status)
      `);
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS autorizacao_compras_aprovacao_compra_idx
          ON autorizacao_compras_aprovacao (autorizacao_compra_id, nivel_id, criado_em DESC)
      `);
      await prisma.$executeRawUnsafe(`
        ALTER TABLE autorizacao_compras_aprovacao_nivel
          ADD COLUMN IF NOT EXISTS tenant_id UUID
      `);
      await prisma.$executeRawUnsafe(`
        ALTER TABLE autorizacao_compras_orcamento
          ADD COLUMN IF NOT EXISTS tenant_id UUID
      `);
      await prisma.$executeRawUnsafe(`
        DROP INDEX IF EXISTS autorizacao_compras_aprovacao_nivel_codigo_uidx
      `);
      await prisma.$executeRawUnsafe(`
        DROP INDEX IF EXISTS autorizacao_compras_orcamento_uidx
      `);
      await prisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS autorizacao_compras_aprovacao_nivel_tenant_codigo_uidx
          ON autorizacao_compras_aprovacao_nivel (tenant_id, codigo)
      `);
      await prisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS autorizacao_compras_orcamento_tenant_uidx
          ON autorizacao_compras_orcamento (tenant_id, LOWER(setor_solicitante), LOWER(centro_custo))
      `);
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS autorizacao_compras_aprovacao_nivel_tenant_idx
          ON autorizacao_compras_aprovacao_nivel (tenant_id, ativo, ordem)
      `);
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS autorizacao_compras_orcamento_tenant_idx
          ON autorizacao_compras_orcamento (tenant_id, ativo, setor_solicitante, centro_custo)
      `);
      await prisma.$executeRawUnsafe(`
        UPDATE autorizacao_compras ac
        SET tenant_id = ref.tenant_id
        FROM (
          SELECT id AS tenant_id
          FROM instituicoes
          ORDER BY criado_em ASC NULLS LAST, id ASC
          LIMIT 1
        ) ref
        WHERE ac.tenant_id IS NULL
      `);
      await prisma.$executeRawUnsafe(`
        UPDATE autorizacao_compras_aprovacao_nivel an
        SET tenant_id = ref.tenant_id
        FROM (
          SELECT id AS tenant_id
          FROM instituicoes
          ORDER BY criado_em ASC NULLS LAST, id ASC
          LIMIT 1
        ) ref
        WHERE an.tenant_id IS NULL
      `);
      await prisma.$executeRawUnsafe(`
        UPDATE autorizacao_compras_orcamento ao
        SET tenant_id = ref.tenant_id
        FROM (
          SELECT id AS tenant_id
          FROM instituicoes
          ORDER BY criado_em ASC NULLS LAST, id ASC
          LIMIT 1
        ) ref
        WHERE ao.tenant_id IS NULL
      `);
    })();
  }

  await estruturaPromise;
}

export class AutorizacaoComprasRepository {
  async listar(tenantId: string) {
    await ensureAutorizacaoComprasEstrutura();
    return prisma.$queryRaw<AutorizacaoCompraRow[]>(Prisma.sql`
      ${COMPRA_SELECT}
      WHERE ativo = TRUE
        AND tenant_id::text = ${tenantId}
      ORDER BY criado_em DESC, id DESC
    `);
  }

  async listarIndicadores(tenantId: string) {
    await ensureAutorizacaoComprasEstrutura();
    const rows = await prisma.$queryRaw<AutorizacaoCompraPainelRow[]>(Prisma.sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'AGUARDANDO_APROVACAO')::int AS aguardando_aprovacao,
        COUNT(*) FILTER (WHERE status IN ('APROVADO', 'EM_COTACAO'))::int AS cotacoes_pendentes,
        COUNT(*) FILTER (WHERE status = 'FORA_DO_ORCAMENTO')::int AS fora_orcamento,
        COUNT(*) FILTER (WHERE flag_excecao_menor_preco = TRUE)::int AS excecao_menor_preco,
        COUNT(*) FILTER (WHERE status IN ('FORNECEDOR_DEFINIDO', 'RESERVA_CANCELADA'))::int AS sem_reserva,
        COUNT(*) FILTER (WHERE status = 'RESERVA_EFETUADA')::int AS aguardando_pagamento,
        COUNT(*) FILTER (WHERE finalizado_em >= NOW() - INTERVAL '30 days')::int AS concluidas_periodo,
        COUNT(*) FILTER (WHERE status = 'DESPESA_LANCADA' AND registro_almoxarifado = TRUE)::int AS aguardando_almoxarifado,
        COUNT(*) FILTER (WHERE status = 'DESPESA_LANCADA' AND registro_patrimonio = TRUE)::int AS aguardando_patrimonio
      FROM autorizacao_compras
      WHERE ativo = TRUE
        AND tenant_id::text = ${tenantId}
    `);
    return rows[0];
  }

  async buscarPorId(id: bigint, tenantId: string) {
    await ensureAutorizacaoComprasEstrutura();
    const rows = await prisma.$queryRaw<AutorizacaoCompraRow[]>(Prisma.sql`
      ${COMPRA_SELECT}
      WHERE id = ${id}
        AND tenant_id::text = ${tenantId}
      LIMIT 1
    `);
    return rows[0] ?? null;
  }

  async buscarPorIdOuFalhar(id: bigint, tenantId: string) {
    const registro = await this.buscarPorId(id, tenantId);
    if (!registro) {
      throw new AppError("Processo de compra não encontrado.", 404);
    }
    return registro;
  }

  async buscarDetalhePorId(id: bigint, tenantId: string) {
    await ensureAutorizacaoComprasEstrutura();
    await this.buscarPorIdOuFalhar(id, tenantId);
    return this.obterDetalhe(prisma, id, tenantId);
  }

  async listarSetoresSolicitantes(tenantId: string) {
    await ensureAutorizacaoComprasEstrutura();

    return prisma.$queryRaw<AutorizacaoCompraSetorSolicitanteRow[]>(Prisma.sql`
      SELECT DISTINCT
        TRIM(s.nome) AS nome,
        NULLIF(TRIM(u.nome_fantasia), '') AS unidade_nome
      FROM salas_unidade s
      LEFT JOIN unidade_assistencial u ON u.id = s.unidade_id
      WHERE u.tenant_id::text = ${tenantId}
        AND NULLIF(TRIM(s.nome), '') IS NOT NULL
      ORDER BY unidade_nome ASC NULLS LAST, nome ASC
    `);
  }

  async criar(input: AutorizacaoCompraInput, tenantId: string, ator: AutorizacaoCompraAtor) {
    await ensureAutorizacaoComprasEstrutura();

    return prisma.$transaction(async (tx) => {
      const dados = await this.prepararDadosSolicitacao(tx, input, tenantId);
      const status = dados.extrapolaOrcamento && !dados.autorizacaoEspecialOrcamento
        ? "FORA_DO_ORCAMENTO"
        : normalizarStatusAutorizacao(input.status);

      const rows = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
        INSERT INTO autorizacao_compras (
          tenant_id,
          titulo,
          tipo,
          area,
          responsavel,
          data_prevista,
          data_solicitacao,
          valor,
          valor_total_itens,
          quantidade_itens,
          justificativa,
          observacoes,
          centro_custo,
          prioridade,
          status,
          solicitante,
          setor_solicitante,
          natureza_compra,
          dispensar_cotacao,
          motivo_dispensa,
          registro_patrimonio,
          registro_almoxarifado,
          orcamento_previsto,
          orcamento_utilizado,
          orcamento_saldo,
          valor_solicitacao,
          extrapola_orcamento,
          autorizacao_especial_orcamento,
          justificativa_orcamento,
          ativo,
          criado_em,
          atualizado_em
        ) VALUES (
          ${tenantId}::uuid,
          ${dados.titulo},
          ${dados.tipoCompra},
          ${dados.setorSolicitante},
          ${dados.solicitante},
          ${toOptionalDate(input.dataPrevista ?? undefined)},
          ${toOptionalDate(dados.dataSolicitacao ?? undefined)},
          ${dados.valorSolicitacao},
          ${dados.valorTotalItens},
          ${dados.itens.length},
          ${trimOrUndefined(input.justificativa ?? undefined)},
          ${trimOrUndefined(input.observacoes ?? undefined)},
          ${dados.centroCusto},
          ${dados.prioridade},
          ${status},
          ${dados.solicitante},
          ${dados.setorSolicitante},
          ${trimOrUndefined(input.naturezaCompra ?? undefined)},
          ${!!input.dispensarCotacao},
          ${trimOrUndefined(input.motivoDispensa ?? undefined)},
          ${dados.registroPatrimonio},
          ${dados.registroAlmoxarifado},
          ${dados.orcamentoPrevisto},
          ${dados.orcamentoUtilizado},
          ${dados.orcamentoSaldo},
          ${dados.valorSolicitacao},
          ${dados.extrapolaOrcamento},
          ${dados.autorizacaoEspecialOrcamento},
          ${trimOrUndefined(input.justificativaOrcamento ?? undefined)},
          TRUE,
          NOW(),
          NOW()
        )
        RETURNING id
      `);

      const id = rows[0]?.id;
      if (!id) {
        throw new AppError("Não foi possível criar a solicitação de compra.", 500);
      }

      await this.sincronizarItens(tx, id, dados.itens);
      await this.persistirOrcamentoSetorial(
        tx,
        dados.setorSolicitante,
        dados.centroCusto,
        dados.orcamentoPrevisto,
        tenantId
      );

      const numeroSolicitacao = gerarNumeroSolicitacao(id);

      await tx.$executeRaw(Prisma.sql`
        UPDATE autorizacao_compras
        SET numero_solicitacao = ${numeroSolicitacao}
        WHERE id = ${id}
      `);

      await this.registrarHistorico(tx, {
        autorizacaoCompraId: id,
        acao: "Solicitação criada",
        aba: "Solicitação",
        statusAnterior: null,
        statusNovo: status,
        observacao: `Solicitação ${numeroSolicitacao} criada com ${dados.itens.length} item(ns).`,
        justificativa: trimOrUndefined(input.justificativa ?? undefined),
        ator
      });

      return this.obterDetalhe(tx, id, tenantId);
    });
  }

  async atualizar(id: bigint, input: AutorizacaoCompraInput, tenantId: string, ator: AutorizacaoCompraAtor) {
    await ensureAutorizacaoComprasEstrutura();

    return prisma.$transaction(async (tx) => {
      const atual = await this.buscarPorIdTxOuFalhar(tx, id, tenantId);
      const dados = await this.prepararDadosSolicitacao(tx, input, tenantId, id);
      const statusAtual = normalizarStatusAutorizacao(atual.status);

      if (["PAGAMENTO_AUTORIZADO", "DESPESA_LANCADA", "FINALIZADO"].includes(statusAtual)) {
        throw new AppError("Não é possível alterar uma compra após a autorização de pagamento.", 409);
      }

      const status = dados.extrapolaOrcamento && !dados.autorizacaoEspecialOrcamento
        ? "FORA_DO_ORCAMENTO"
        : statusAtual;

      await tx.$executeRaw(Prisma.sql`
        UPDATE autorizacao_compras
        SET
          titulo = ${dados.titulo},
          tipo = ${dados.tipoCompra},
          area = ${dados.setorSolicitante},
          responsavel = ${dados.solicitante},
          data_prevista = ${toOptionalDate(input.dataPrevista ?? undefined)},
          data_solicitacao = ${toOptionalDate(dados.dataSolicitacao ?? undefined)},
          valor = ${dados.valorSolicitacao},
          valor_total_itens = ${dados.valorTotalItens},
          quantidade_itens = ${dados.itens.length},
          justificativa = ${trimOrUndefined(input.justificativa ?? undefined)},
          observacoes = ${trimOrUndefined(input.observacoes ?? undefined)},
          centro_custo = ${dados.centroCusto},
          prioridade = ${dados.prioridade},
          status = ${status},
          solicitante = ${dados.solicitante},
          setor_solicitante = ${dados.setorSolicitante},
          natureza_compra = ${trimOrUndefined(input.naturezaCompra ?? undefined)},
          dispensar_cotacao = ${!!input.dispensarCotacao},
          motivo_dispensa = ${trimOrUndefined(input.motivoDispensa ?? undefined)},
          registro_patrimonio = ${dados.registroPatrimonio},
          registro_almoxarifado = ${dados.registroAlmoxarifado},
          orcamento_previsto = ${dados.orcamentoPrevisto},
          orcamento_utilizado = ${dados.orcamentoUtilizado},
          orcamento_saldo = ${dados.orcamentoSaldo},
          valor_solicitacao = ${dados.valorSolicitacao},
          extrapola_orcamento = ${dados.extrapolaOrcamento},
          autorizacao_especial_orcamento = ${dados.autorizacaoEspecialOrcamento},
          justificativa_orcamento = ${trimOrUndefined(input.justificativaOrcamento ?? undefined)},
          atualizado_em = NOW()
        WHERE id = ${id}
          AND tenant_id::text = ${tenantId}
      `);

      await this.sincronizarItens(tx, id, dados.itens);
      await this.persistirOrcamentoSetorial(
        tx,
        dados.setorSolicitante,
        dados.centroCusto,
        dados.orcamentoPrevisto,
        tenantId
      );

      await this.registrarHistorico(tx, {
        autorizacaoCompraId: id,
        acao: "Solicitação atualizada",
        aba: "Solicitação",
        statusAnterior: atual.status,
        statusNovo: status,
        observacao: "Dados da solicitação e itens atualizados.",
        justificativa: trimOrUndefined(input.justificativa ?? undefined),
        ator
      });

      return this.obterDetalhe(tx, id, tenantId);
    });
  }

  async remover(id: bigint, tenantId: string, ator: AutorizacaoCompraAtor) {
    await ensureAutorizacaoComprasEstrutura();

    await prisma.$transaction(async (tx) => {
      const atual = await this.buscarPorIdTxOuFalhar(tx, id, tenantId);
      if (atual.finalizado_em) {
        throw new AppError("Não é possível cancelar uma compra finalizada.", 409);
      }

      await tx.$executeRaw(Prisma.sql`
        UPDATE autorizacao_compras
        SET
          status = 'CANCELADO',
          ativo = FALSE,
          cancelado_em = NOW(),
          atualizado_em = NOW()
        WHERE id = ${id}
          AND tenant_id::text = ${tenantId}
      `);

      await this.registrarHistorico(tx, {
        autorizacaoCompraId: id,
        acao: "Processo cancelado",
        aba: "Solicitação",
        statusAnterior: atual.status,
        statusNovo: "CANCELADO",
        observacao: "O processo foi cancelado logicamente para preservar a auditoria.",
        justificativa: null,
        ator
      });
    });
  }

  async enviarParaAprovacao(id: bigint, tenantId: string, ator: AutorizacaoCompraAtor) {
    await ensureAutorizacaoComprasEstrutura();

    return prisma.$transaction(async (tx) => {
      const compra = await this.buscarPorIdTxOuFalhar(tx, id, tenantId);
      const itens = await this.listarItensTx(tx, id);

      if (!compra.solicitante || !compra.setor_solicitante || !compra.centro_custo) {
        throw new AppError("Preencha solicitante, setor solicitante e centro de custo antes de enviar para aprovação.", 409);
      }

      if (!itens.length) {
        throw new AppError("A solicitação precisa ter ao menos um item.", 409);
      }

      if (compra.extrapola_orcamento && !compra.autorizacao_especial_orcamento) {
        throw new AppError("A compra excede o orçamento do setor. Informe autorização especial para continuar.", 409);
      }

      const niveis = await this.listarNiveisAprovacaoTx(tx, tenantId);
      const obrigatorios = determinarNiveisObrigatorios(
        compra.valor_solicitacao ?? compra.valor_total_itens ?? compra.valor ?? 0,
        niveis
      );
      if (!obrigatorios.length) {
        throw new AppError("Não há níveis de aprovação configurados para esta compra.", 409);
      }

      await tx.$executeRaw(Prisma.sql`
        UPDATE autorizacao_compras
        SET status = 'AGUARDANDO_APROVACAO',
            atualizado_em = NOW()
        WHERE id = ${id}
          AND tenant_id::text = ${tenantId}
      `);

      await this.registrarHistorico(tx, {
        autorizacaoCompraId: id,
        acao: "Solicitação enviada para aprovação",
        aba: "Aprovações",
        statusAnterior: compra.status,
        statusNovo: "AGUARDANDO_APROVACAO",
        observacao: `Fluxo enviado com ${obrigatorios.length} nível(is) obrigatório(s).`,
        justificativa: compra.justificativa ?? null,
        ator
      });

      return this.obterDetalhe(tx, id, tenantId);
    });
  }

  async registrarAprovacao(
    autorizacaoId: bigint,
    input: AutorizacaoCompraAprovacaoInput,
    tenantId: string,
    ator: AutorizacaoCompraAtor
  ) {
    await ensureAutorizacaoComprasEstrutura();

    return prisma.$transaction(async (tx) => {
      const compra = await this.buscarPorIdTxOuFalhar(tx, autorizacaoId, tenantId);
      if (compra.status !== "AGUARDANDO_APROVACAO") {
        throw new AppError("O processo não está aguardando aprovação.", 409);
      }

      const niveis = await this.listarNiveisAprovacaoTx(tx, tenantId);
      const obrigatorios = determinarNiveisObrigatorios(
        compra.valor_solicitacao ?? compra.valor_total_itens ?? compra.valor ?? 0,
        niveis
      );
      const aprovacoes = await this.listarAprovacoesTx(tx, autorizacaoId);
      const proximoNivel = obrigatorios.find((nivel) => {
        const ultima = aprovacoes
          .filter((aprovacao) => aprovacao.nivel_id === nivel.id)
          .sort((a, b) => b.criado_em.getTime() - a.criado_em.getTime())[0];
        return ultima?.decisao !== "APROVAR";
      });

      if (!proximoNivel) {
        throw new AppError("Todos os níveis obrigatórios já foram aprovados.", 409);
      }

      if (!validarPermissaoNivel(ator.permissoes ?? [], proximoNivel.permissao_requerida)) {
        throw new AppError("O usuário não possui alçada para aprovar este nível.", 403);
      }

      await tx.$executeRawUnsafe(
        `
          INSERT INTO autorizacao_compras_aprovacao (
            autorizacao_compra_id,
            nivel_id,
            decisao,
            parecer,
            observacao,
            motivo,
            usuario_id,
            usuario_nome,
            permissoes_json,
            ip,
            maquina,
            criado_em
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
        `,
        Number(autorizacaoId),
        Number(proximoNivel.id),
        input.acao,
        input.parecer,
        trimOrUndefined(input.observacao ?? undefined) ?? null,
        trimOrUndefined(input.motivo ?? undefined) ?? null,
        ator.usuarioId ? Number(ator.usuarioId) : null,
        ator.nomeUsuario ?? null,
        JSON.stringify(ator.permissoes ?? []),
        ator.ip ?? null,
        ator.maquina ?? null
      );

      const novasAprovacoes = await this.listarAprovacoesTx(tx, autorizacaoId);
      const faltantes = obrigatorios.filter((nivel) => {
        const ultima = novasAprovacoes
          .filter((aprovacao) => aprovacao.nivel_id === nivel.id)
          .sort((a, b) => b.criado_em.getTime() - a.criado_em.getTime())[0];
        return ultima?.decisao !== "APROVAR";
      });

      const novoStatus =
        input.acao === "REPROVAR"
          ? "REPROVADO"
          : input.acao === "DEVOLVER_AJUSTE"
            ? "DEVOLVIDO_PARA_AJUSTE"
            : faltantes.length
              ? "AGUARDANDO_APROVACAO"
              : "APROVADO";

      await tx.$executeRaw(Prisma.sql`
        UPDATE autorizacao_compras
        SET
          status = ${novoStatus},
          aprovador = ${ator.nomeUsuario ?? null},
          decisao = ${input.acao},
          observacoes_aprovacao = ${trimOrUndefined(input.observacao ?? undefined)},
          data_aprovacao = CURRENT_DATE,
          atualizado_em = NOW()
        WHERE id = ${autorizacaoId}
          AND tenant_id::text = ${tenantId}
      `);

      await this.registrarHistorico(tx, {
        autorizacaoCompraId: autorizacaoId,
        acao:
          input.acao === "APROVAR"
            ? `Aprovação registrada em ${proximoNivel.nome}`
            : input.acao === "REPROVAR"
              ? "Solicitação reprovada"
              : "Solicitação devolvida para ajuste",
        aba: "Aprovações",
        statusAnterior: compra.status,
        statusNovo: novoStatus,
        observacao: input.observacao ?? input.parecer,
        justificativa: input.motivo ?? null,
        ator
      });

      return this.obterDetalhe(tx, autorizacaoId, tenantId);
    });
  }

  async listarCotacoes(autorizacaoId: bigint, tenantId: string) {
    await ensureAutorizacaoComprasEstrutura();
    await this.buscarPorIdOuFalhar(autorizacaoId, tenantId);
    return this.listarCotacoesTx(prisma, autorizacaoId);
  }

  async criarCotacao(
    autorizacaoId: bigint,
    input: AutorizacaoCompraCotacaoInput,
    tenantId: string,
    ator: AutorizacaoCompraAtor
  ) {
    await ensureAutorizacaoComprasEstrutura();

    return prisma.$transaction(async (tx) => {
      const compra = await this.buscarPorIdTxOuFalhar(tx, autorizacaoId, tenantId);
      if (!["APROVADO", "EM_COTACAO", "COTACAO_CONCLUIDA", "FORNECEDOR_DEFINIDO"].includes(compra.status)) {
        throw new AppError("A cotação só pode ser registrada após a solicitação estar aprovada.", 409);
      }

      await this.validarArquivoCompra(tx, autorizacaoId, input.orcamentoArquivoId);
      await this.validarArquivoCompra(tx, autorizacaoId, input.cartaoCnpjArquivoId);

      const rows = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
        INSERT INTO autorizacao_compras_cotacoes (
          autorizacao_compra_id,
          fornecedor,
          razao_social,
          cnpj,
          contato,
          telefone,
          email,
          valor,
          prazo_entrega,
          forma_pagamento,
          validade,
          observacoes,
          data_cotacao,
          orcamento_arquivo_id,
          cartao_cnpj_arquivo_id,
          ativo,
          criado_em,
          atualizado_em
        ) VALUES (
          ${autorizacaoId},
          ${input.fornecedor},
          ${trimOrUndefined(input.razaoSocial ?? undefined)},
          ${trimOrUndefined(input.cnpj ?? undefined)},
          ${trimOrUndefined(input.contato ?? undefined)},
          ${trimOrUndefined(input.telefone ?? undefined)},
          ${trimOrUndefined(input.email ?? undefined)},
          ${input.valor},
          ${toOptionalDate(input.prazoEntrega ?? undefined)},
          ${trimOrUndefined(input.formaPagamento ?? undefined)},
          ${toOptionalDate(input.validadeProposta)},
          ${trimOrUndefined(input.observacoes ?? undefined)},
          ${toOptionalDate(input.dataCotacao)},
          ${input.orcamentoArquivoId ? BigInt(input.orcamentoArquivoId) : null},
          ${input.cartaoCnpjArquivoId ? BigInt(input.cartaoCnpjArquivoId) : null},
          TRUE,
          NOW(),
          NOW()
        )
        RETURNING id
      `);

      if (!rows[0]?.id) {
        throw new AppError("Não foi possível registrar a cotação.", 500);
      }

      const resumoCotacoes = await this.atualizarResumoCotacoesTx(
        tx,
        autorizacaoId,
        compra.cotacao_vencedora_id
      );
      const novoStatus = resumoCotacoes.possuiMinimoObrigatorio || compra.dispensar_cotacao
        ? "COTACAO_CONCLUIDA"
        : "EM_COTACAO";

      await tx.$executeRaw(Prisma.sql`
        UPDATE autorizacao_compras
        SET status = ${novoStatus},
            atualizado_em = NOW()
        WHERE id = ${autorizacaoId}
          AND tenant_id::text = ${tenantId}
      `);

      await this.registrarHistorico(tx, {
        autorizacaoCompraId: autorizacaoId,
        acao: "Cotação registrada",
        aba: "Cotações",
        statusAnterior: compra.status,
        statusNovo: novoStatus,
        observacao: `Cotação do fornecedor ${input.fornecedor} registrada.`,
        justificativa: null,
        ator
      });

      return this.listarCotacoesTx(tx, autorizacaoId);
    });
  }

  async removerCotacao(autorizacaoId: bigint, cotacaoId: bigint, tenantId: string, ator: AutorizacaoCompraAtor) {
    await ensureAutorizacaoComprasEstrutura();

    await prisma.$transaction(async (tx) => {
      const compra = await this.buscarPorIdTxOuFalhar(tx, autorizacaoId, tenantId);
      const cotacao = await this.buscarCotacaoTxOuFalhar(tx, autorizacaoId, cotacaoId);
      if (compra.cotacao_vencedora_id === cotacao.id) {
        throw new AppError("Não é possível remover a cotação do fornecedor vencedor.", 409);
      }

      await tx.$executeRaw(Prisma.sql`
        UPDATE autorizacao_compras_cotacoes
        SET ativo = FALSE,
            atualizado_em = NOW()
        WHERE id = ${cotacaoId}
      `);

      const resumoCotacoes = await this.atualizarResumoCotacoesTx(
        tx,
        autorizacaoId,
        compra.cotacao_vencedora_id
      );
      const novoStatus = resumoCotacoes.possuiMinimoObrigatorio || compra.dispensar_cotacao
        ? "COTACAO_CONCLUIDA"
        : "EM_COTACAO";

      await tx.$executeRaw(Prisma.sql`
        UPDATE autorizacao_compras
        SET status = CASE
              WHEN cotacao_vencedora_id IS NOT NULL THEN status
              ELSE ${novoStatus}
            END,
            atualizado_em = NOW()
        WHERE id = ${autorizacaoId}
          AND tenant_id::text = ${tenantId}
      `);

      await this.registrarHistorico(tx, {
        autorizacaoCompraId: autorizacaoId,
        acao: "Cotação removida",
        aba: "Cotações",
        statusAnterior: compra.status,
        statusNovo: compra.cotacao_vencedora_id ? compra.status : novoStatus,
        observacao: `Cotação do fornecedor ${cotacao.fornecedor} removida.`,
        justificativa: null,
        ator
      });
    });
  }

  async definirFornecedor(
    autorizacaoId: bigint,
    input: AutorizacaoCompraEscolhaFornecedorInput,
    tenantId: string,
    ator: AutorizacaoCompraAtor
  ) {
    await ensureAutorizacaoComprasEstrutura();

    return prisma.$transaction(async (tx) => {
      const compra = await this.buscarPorIdTxOuFalhar(tx, autorizacaoId, tenantId);
      const cotacoes = await this.listarCotacoesTx(tx, autorizacaoId);
      const resumo = calcularResumoCotacoes(cotacoes, BigInt(input.cotacaoId));
      const escolhida = cotacoes.find((cotacao) => Number(cotacao.id) === input.cotacaoId && cotacao.ativo);

      if (!escolhida) {
        throw new AppError("Cotação escolhida não encontrada.", 404);
      }

      const possuiExcecaoQuantidade = cotacoes.filter((cotacao) => cotacao.ativo).length < 3;
      if (possuiExcecaoQuantidade && !compra.dispensar_cotacao) {
        throw new AppError("É obrigatório registrar no mínimo 3 cotações para definir o fornecedor vencedor.", 409);
      }

      if (possuiExcecaoQuantidade && !ator.permissoes?.includes("ADMINISTRADOR")) {
        throw new AppError("A exceção de cotação com menos de 3 orçamentos exige permissão administrativa.", 403);
      }

      const fugiuDoMenorPreco = resumo.menor && resumo.menor.id !== escolhida.id;
      if (fugiuDoMenorPreco && !trimOrUndefined(input.justificativaDivergencia ?? undefined)) {
        throw new AppError("Informe a justificativa obrigatória para escolher um fornecedor diferente do menor preço.", 409);
      }

      await tx.$executeRaw(Prisma.sql`
        UPDATE autorizacao_compras
        SET
          status = 'FORNECEDOR_DEFINIDO',
          cotacao_vencedora_id = ${escolhida.id},
          vencedor = ${escolhida.fornecedor},
          flag_excecao_menor_preco = ${!!fugiuDoMenorPreco},
          justificativa_excecao_menor_preco = ${trimOrUndefined(input.justificativaDivergencia ?? undefined)},
          atualizado_em = NOW()
        WHERE id = ${autorizacaoId}
          AND tenant_id::text = ${tenantId}
      `);

      await this.atualizarResumoCotacoesTx(tx, autorizacaoId, escolhida.id);

      await this.registrarHistorico(tx, {
        autorizacaoCompraId: autorizacaoId,
        acao: "Fornecedor vencedor definido",
        aba: "Fornecedor vencedor",
        statusAnterior: compra.status,
        statusNovo: "FORNECEDOR_DEFINIDO",
        observacao: `Fornecedor escolhido: ${escolhida.fornecedor}.`,
        justificativa: trimOrUndefined(input.justificativaDivergencia ?? undefined),
        ator
      });

      return this.obterDetalhe(tx, autorizacaoId, tenantId);
    });
  }

  async listarReservas(autorizacaoId: bigint, tenantId: string) {
    await ensureAutorizacaoComprasEstrutura();
    await this.buscarPorIdOuFalhar(autorizacaoId, tenantId);
    return this.listarReservasTx(prisma, autorizacaoId);
  }

  async registrarReservaBancaria(
    autorizacaoId: bigint,
    input: ReservaBancariaInput,
    tenantId: string,
    ator: AutorizacaoCompraAtor
  ) {
    await ensureAutorizacaoComprasEstrutura();

    return prisma.$transaction(async (tx) => {
      const compra = await this.buscarPorIdTxOuFalhar(tx, autorizacaoId, tenantId);
      if (compra.status !== "FORNECEDOR_DEFINIDO" && compra.status !== "RESERVA_CANCELADA") {
        throw new AppError("A reserva financeira só pode ser feita após definir o fornecedor vencedor.", 409);
      }

      const reservas = await this.listarReservasTx(tx, autorizacaoId);
      if (reservas.some((reserva) => reserva.status === "RESERVA_EFETUADA" && !reserva.cancelado_em)) {
        throw new AppError("Já existe uma reserva ativa para esta solicitação.", 409);
      }

      const cotacaoVencedora = compra.cotacao_vencedora_id
        ? await this.buscarCotacaoTxOuFalhar(tx, autorizacaoId, compra.cotacao_vencedora_id)
        : null;
      if (!cotacaoVencedora) {
        throw new AppError("Defina o fornecedor vencedor antes da reserva financeira.", 409);
      }
      if (input.valor > cotacaoVencedora.valor) {
        throw new AppError("A reserva não pode ser maior que o valor aprovado da compra.", 409);
      }

      const rows = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
        INSERT INTO autorizacao_compras_reserva_bancaria (
          autorizacao_compra_id,
          conta_bancaria_id,
          valor,
          status,
          observacao,
          usuario_responsavel,
          criado_em
        ) VALUES (
          ${autorizacaoId},
          ${BigInt(input.contaBancariaId)},
          ${input.valor},
          'RESERVA_EFETUADA',
          ${trimOrUndefined(input.observacao ?? undefined)},
          ${ator.nomeUsuario ?? null},
          NOW()
        )
        RETURNING id
      `);

      if (!rows[0]?.id) {
        throw new AppError("Não foi possível registrar a reserva.", 500);
      }

      const numeroReserva = compra.numero_reserva ?? gerarNumeroReserva(autorizacaoId);
      await tx.$executeRaw(Prisma.sql`
        UPDATE autorizacao_compras
        SET
          status = 'RESERVA_EFETUADA',
          numero_reserva = ${numeroReserva},
          atualizado_em = NOW()
        WHERE id = ${autorizacaoId}
          AND tenant_id::text = ${tenantId}
      `);

      await this.registrarHistorico(tx, {
        autorizacaoCompraId: autorizacaoId,
        acao: "Reserva financeira efetuada",
        aba: "Reserva financeira",
        statusAnterior: compra.status,
        statusNovo: "RESERVA_EFETUADA",
        observacao: `Reserva ${numeroReserva} registrada no valor de ${input.valor.toFixed(2)}.`,
        justificativa: trimOrUndefined(input.observacao ?? undefined),
        ator
      });

      return this.listarReservasTx(tx, autorizacaoId);
    });
  }

  async removerReservaBancaria(
    autorizacaoId: bigint,
    reservaId: bigint,
    tenantId: string,
    ator: AutorizacaoCompraAtor
  ) {
    await ensureAutorizacaoComprasEstrutura();

    await prisma.$transaction(async (tx) => {
      const compra = await this.buscarPorIdTxOuFalhar(tx, autorizacaoId, tenantId);
      await this.buscarReservaTxOuFalhar(tx, autorizacaoId, reservaId);

      await tx.$executeRaw(Prisma.sql`
        UPDATE autorizacao_compras_reserva_bancaria
        SET
          status = 'RESERVA_CANCELADA',
          cancelado_em = NOW(),
          usuario_responsavel = ${ator.nomeUsuario ?? null}
        WHERE id = ${reservaId}
      `);

      await tx.$executeRaw(Prisma.sql`
        UPDATE autorizacao_compras
        SET status = 'RESERVA_CANCELADA',
            atualizado_em = NOW()
        WHERE id = ${autorizacaoId}
          AND tenant_id::text = ${tenantId}
      `);

      await this.registrarHistorico(tx, {
        autorizacaoCompraId: autorizacaoId,
        acao: "Reserva financeira cancelada",
        aba: "Reserva financeira",
        statusAnterior: compra.status,
        statusNovo: "RESERVA_CANCELADA",
        observacao: "Reserva cancelada para novo ajuste financeiro.",
        justificativa: null,
        ator
      });
    });
  }

  async gerarAutorizacaoPagamento(
    autorizacaoId: bigint,
    input: AutorizacaoPagamentoInput,
    tenantId: string,
    ator: AutorizacaoCompraAtor
  ) {
    await ensureAutorizacaoComprasEstrutura();

    return prisma.$transaction(async (tx) => {
      const compra = await this.buscarPorIdTxOuFalhar(tx, autorizacaoId, tenantId);
      const reservaAtiva = (await this.listarReservasTx(tx, autorizacaoId)).find(
        (reserva) => reserva.status === "RESERVA_EFETUADA" && !reserva.cancelado_em
      );
      const cotacaoVencedora = compra.cotacao_vencedora_id
        ? await this.buscarCotacaoTxOuFalhar(tx, autorizacaoId, compra.cotacao_vencedora_id)
        : null;
      const itens = await this.listarItensTx(tx, autorizacaoId);

      if (!cotacaoVencedora) {
        throw new AppError("Defina o fornecedor vencedor antes de autorizar o pagamento.", 409);
      }
      if (!reservaAtiva) {
        throw new AppError("É necessário registrar uma reserva financeira antes da autorização de pagamento.", 409);
      }
      if (input.valorAutorizado !== reservaAtiva.valor && !trimOrUndefined(input.justificativaDivergencia ?? undefined)) {
        throw new AppError("Informe a justificativa para autorizar pagamento com valor diferente da reserva.", 409);
      }

      const numeroPagamento =
        compra.autorizacao_pagamento_numero ?? gerarNumeroAutorizacaoPagamento(autorizacaoId);

      await tx.$executeRaw(Prisma.sql`
        UPDATE autorizacao_compras
        SET
          status = 'PAGAMENTO_AUTORIZADO',
          autorizacao_pagamento_numero = ${numeroPagamento},
          autorizacao_pagamento_autor = ${ator.nomeUsuario ?? null},
          autorizacao_pagamento_data = CURRENT_DATE,
          autorizacao_pagamento_observacoes = ${trimOrUndefined(input.observacoes ?? undefined)},
          pagamento_autorizado_valor = ${input.valorAutorizado},
          pagamento_vencimento = ${toOptionalDate(input.vencimento)},
          pagamento_forma = ${input.formaPagamento},
          conta_pagadora_id = ${BigInt(input.contaPagadoraId)},
          documento_referencia = ${trimOrUndefined(input.documentoReferencia ?? undefined)},
          documento_fiscal = ${trimOrUndefined(input.documentoFiscal ?? undefined)},
          atualizado_em = NOW()
        WHERE id = ${autorizacaoId}
      `);

      await this.registrarHistorico(tx, {
        autorizacaoCompraId: autorizacaoId,
        acao: "Pagamento autorizado",
        aba: "Autorização de pagamento",
        statusAnterior: compra.status,
        statusNovo: "PAGAMENTO_AUTORIZADO",
        observacao: `Autorização ${numeroPagamento} emitida para ${cotacaoVencedora.fornecedor}.`,
        justificativa: trimOrUndefined(input.justificativaDivergencia ?? undefined),
        ator
      });

      const lancamento = await this.criarOuAtualizarLancamentoFinanceiro(tx, {
        compraId: autorizacaoId,
        fornecedor: cotacaoVencedora.fornecedor,
        valor: input.valorAutorizado,
        vencimento: input.vencimento,
        descricao: compra.titulo
      });

      await tx.$executeRaw(Prisma.sql`
        UPDATE autorizacao_compras
        SET
          status = 'DESPESA_LANCADA',
          lancamento_financeiro_id = ${lancamento.id},
          atualizado_em = NOW()
        WHERE id = ${autorizacaoId}
      `);

      await this.registrarHistorico(tx, {
        autorizacaoCompraId: autorizacaoId,
        acao: "Despesa lançada",
        aba: "Lançamentos",
        statusAnterior: "PAGAMENTO_AUTORIZADO",
        statusNovo: "DESPESA_LANCADA",
        observacao: `Lançamento financeiro ${String(lancamento.id)} vinculado à compra.`,
        justificativa: trimOrUndefined(input.justificativaDivergencia ?? undefined),
        ator
      });

      const possuiMaterial = itens.some((item) => item.tipo_item === "material");
      const possuiBem = itens.some((item) => item.tipo_item === "bem");
      const possuiServico = itens.some((item) => item.tipo_item === "servico");

      if (possuiMaterial) {
        await this.integrarAoAlmoxarifado(tx, autorizacaoId, itens, cotacaoVencedora, input, ator);
      }
      if (possuiBem) {
        await this.integrarAoPatrimonio(tx, autorizacaoId, itens, cotacaoVencedora, input, ator);
      }
      if (possuiServico && !possuiMaterial && !possuiBem) {
        await this.registrarIntegracao(tx, {
          autorizacaoCompraId: autorizacaoId,
          tipo: "SERVICO",
          referenciaId: "SERVICO",
          status: "CONCLUIDO",
          detalhe: "Compra classificada somente como serviço. Sem integração física adicional.",
          ator
        });
      }

      const statusFinal =
        possuiMaterial && !possuiBem && !possuiServico
          ? "INTEGRADO_AO_ALMOXARIFADO"
          : possuiBem && !possuiMaterial && !possuiServico
            ? "INTEGRADO_AO_PATRIMONIO"
            : "FINALIZADO";

      await tx.$executeRaw(Prisma.sql`
        UPDATE autorizacao_compras
        SET
          status = ${statusFinal},
          finalizado_em = CASE
            WHEN ${statusFinal} = 'FINALIZADO' THEN NOW()
            ELSE finalizado_em
          END,
          atualizado_em = NOW()
        WHERE id = ${autorizacaoId}
      `);

      await this.registrarHistorico(tx, {
        autorizacaoCompraId: autorizacaoId,
        acao:
          statusFinal === "FINALIZADO"
            ? "Processo finalizado"
            : statusFinal === "INTEGRADO_AO_ALMOXARIFADO"
              ? "Entrada gerada no almoxarifado"
              : "Incorporação gerada no patrimônio",
        aba: "Integrações",
        statusAnterior: "DESPESA_LANCADA",
        statusNovo: statusFinal,
        observacao: "Integrações automáticas concluídas conforme o tipo dos itens.",
        justificativa: null,
        ator
      });

      return this.obterDetalhe(tx, autorizacaoId, tenantId);
    });
  }

  async buscarFornecedorPorCnpj(cnpj: string, tenantId: string) {
    await ensureAutorizacaoComprasEstrutura();

    const rows = await prisma.$queryRaw<Array<{ cnpj: string | null; razao_social: string | null }>>(Prisma.sql`
      SELECT
        REGEXP_REPLACE(COALESCE(cnpj, ''), '[^0-9]', '', 'g') AS cnpj,
        razao_social
      FROM unidade_assistencial
      WHERE REGEXP_REPLACE(COALESCE(cnpj, ''), '[^0-9]', '', 'g') = ${cnpj}
        AND tenant_id::text = ${tenantId}
      LIMIT 1
    `);

    return rows[0];
  }

  private async prepararDadosSolicitacao(
    tx: DbClient,
    input: AutorizacaoCompraInput,
    tenantId: string,
    idAtual?: bigint
  ) {
    const tipoCompra = normalizarTipoCompra(input.tipoCompra);
    const tipoItemPadrao = tipoCompraParaTipoItem(tipoCompra);
    const itens = input.itens.map((item) => ({
      ...item,
      descricao: item.descricao.trim(),
      unidade: item.unidade.trim(),
      categoria: trimOrUndefined(item.categoria ?? undefined),
      tipoItem: tipoItemPadrao
    }));

    const valorTotalItens = determinarValorSolicitacao(itens, null);
    const setorSolicitante = input.setorSolicitante.trim();
    const centroCusto = input.centroCusto.trim();
    const orcamentoPrevistoConfig = await this.obterOrcamentoPrevisto(
      tx,
      setorSolicitante,
      centroCusto,
      tenantId
    );
    const orcamentoPrevisto = Number(input.orcamentoPrevisto ?? orcamentoPrevistoConfig ?? 0);
    const orcamentoUtilizado = await this.calcularOrcamentoUtilizado(
      tx,
      setorSolicitante,
      centroCusto,
      tenantId,
      idAtual
    );
    const resumo = resumirOrcamento(orcamentoPrevisto, orcamentoUtilizado, valorTotalItens);

    return {
      titulo:
        trimOrUndefined(input.titulo ?? undefined) ??
        trimOrUndefined(itens[0]?.descricao ?? undefined) ??
        "Solicitação de compra",
      solicitante: input.solicitante.trim(),
      setorSolicitante,
      centroCusto,
      dataSolicitacao: input.dataSolicitacao ?? new Date().toISOString().slice(0, 10),
      prioridade: trimOrUndefined(input.prioridade ?? undefined) ?? "normal",
      tipoCompra,
      valorSolicitacao: valorTotalItens,
      valorTotalItens,
      itens,
      orcamentoPrevisto: resumo.previsto,
      orcamentoUtilizado: resumo.utilizado,
      orcamentoSaldo: resumo.saldoDisponivel,
      extrapolaOrcamento: resumo.extrapola,
      autorizacaoEspecialOrcamento: !!input.autorizacaoEspecialOrcamento,
      registroPatrimonio:
        !!input.registroPatrimonio || itens.some((item) => item.tipoItem === "bem"),
      registroAlmoxarifado:
        !!input.registroAlmoxarifado || itens.some((item) => item.tipoItem === "material")
    };
  }

  private async obterDetalhe(tx: DbClient, id: bigint, tenantId: string) {
    const compra = await this.buscarPorIdTxOuFalhar(tx, id, tenantId);
    const [itens, niveis, aprovacoes, cotacoes, reservas, historico, integracoes, anexos] =
      await Promise.all([
        this.listarItensTx(tx, id),
        this.listarNiveisAprovacaoTx(tx, tenantId),
        this.listarAprovacoesTx(tx, id),
        this.listarCotacoesTx(tx, id),
        this.listarReservasTx(tx, id),
        this.listarHistoricoTx(tx, id),
        this.listarIntegracoesTx(tx, id),
        this.listarArquivosCompraTx(tx, id)
      ]);

    const indicadoresFornecedor = await this.calcularIndicadoresFornecedoresTx(
      tx,
      id,
      cotacoes,
      tenantId
    );

    return {
      compra,
      itens,
      niveis,
      aprovacoes,
      cotacoes,
      reservas,
      historico,
      integracoes,
      anexos,
      indicadoresFornecedor
    };
  }

  private async listarItensTx(tx: DbClient, autorizacaoId: bigint) {
    return tx.$queryRaw<AutorizacaoCompraItemRow[]>(Prisma.sql`
      SELECT
        id,
        autorizacao_compra_id,
        descricao,
        quantidade::float8 AS quantidade,
        unidade,
        valor_estimado::float8 AS valor_estimado,
        categoria,
        tipo_item,
        ordem,
        ativo,
        criado_em,
        atualizado_em
      FROM autorizacao_compras_item
      WHERE autorizacao_compra_id = ${autorizacaoId}
        AND ativo = TRUE
      ORDER BY ordem ASC, id ASC
    `);
  }

  private async listarCotacoesTx(tx: DbClient, autorizacaoId: bigint) {
    return tx.$queryRaw<AutorizacaoCompraCotacaoRow[]>(Prisma.sql`
      SELECT
        id,
        autorizacao_compra_id,
        fornecedor,
        razao_social,
        cnpj,
        contato,
        telefone,
        email,
        valor::float8 AS valor,
        prazo_entrega,
        forma_pagamento,
        validade,
        observacoes,
        data_cotacao,
        orcamento_arquivo_id,
        cartao_cnpj_arquivo_id,
        ativo,
        criado_em,
        atualizado_em
      FROM autorizacao_compras_cotacoes
      WHERE autorizacao_compra_id = ${autorizacaoId}
      ORDER BY ativo DESC, valor ASC, id ASC
    `);
  }

  private async listarReservasTx(tx: DbClient, autorizacaoId: bigint) {
    return tx.$queryRaw<AutorizacaoCompraReservaRow[]>(Prisma.sql`
      SELECT
        id,
        autorizacao_compra_id,
        conta_bancaria_id,
        valor::float8 AS valor,
        status,
        observacao,
        usuario_responsavel,
        cancelado_em,
        criado_em
      FROM autorizacao_compras_reserva_bancaria
      WHERE autorizacao_compra_id = ${autorizacaoId}
      ORDER BY criado_em DESC, id DESC
    `);
  }

  private async listarNiveisAprovacaoTx(tx: DbClient, tenantId: string) {
    await this.assegurarNiveisAprovacaoPadraoTx(tx, tenantId);
    return tx.$queryRaw<AutorizacaoCompraNivelAprovacaoRow[]>(Prisma.sql`
      SELECT
        id,
        codigo,
        nome,
        ordem,
        valor_minimo::float8 AS valor_minimo,
        valor_maximo::float8 AS valor_maximo,
        permissao_requerida,
        ativo,
        criado_em,
        atualizado_em
      FROM autorizacao_compras_aprovacao_nivel
      WHERE ativo = TRUE
        AND tenant_id::text = ${tenantId}
      ORDER BY ordem ASC, id ASC
    `);
  }

  private async listarAprovacoesTx(tx: DbClient, autorizacaoId: bigint) {
    return tx.$queryRaw<AutorizacaoCompraAprovacaoRow[]>(Prisma.sql`
      SELECT
        id,
        autorizacao_compra_id,
        nivel_id,
        decisao,
        parecer,
        observacao,
        motivo,
        usuario_id,
        usuario_nome,
        permissoes_json,
        ip,
        maquina,
        criado_em
      FROM autorizacao_compras_aprovacao
      WHERE autorizacao_compra_id = ${autorizacaoId}
      ORDER BY criado_em DESC, id DESC
    `);
  }

  private async listarHistoricoTx(tx: DbClient, autorizacaoId: bigint) {
    return tx.$queryRaw<AutorizacaoCompraHistoricoRow[]>(Prisma.sql`
      SELECT
        id,
        autorizacao_compra_id,
        acao,
        aba,
        status_anterior,
        status_novo,
        observacao,
        justificativa,
        usuario_id,
        usuario_nome,
        perfil,
        ip,
        maquina,
        criado_em
      FROM autorizacao_compras_historico
      WHERE autorizacao_compra_id = ${autorizacaoId}
      ORDER BY criado_em DESC, id DESC
    `);
  }

  private async listarIntegracoesTx(tx: DbClient, autorizacaoId: bigint) {
    return tx.$queryRaw<AutorizacaoCompraIntegracaoRow[]>(Prisma.sql`
      SELECT
        id,
        autorizacao_compra_id,
        tipo,
        referencia_id,
        status,
        detalhe,
        usuario_id,
        usuario_nome,
        criado_em
      FROM autorizacao_compras_integracao
      WHERE autorizacao_compra_id = ${autorizacaoId}
      ORDER BY criado_em DESC, id DESC
    `);
  }

  private async listarArquivosCompraTx(tx: DbClient, autorizacaoId: bigint) {
    await ensureArquivosEstrutura(prisma);
    return tx.$queryRaw<ArquivoResumoRow[]>(Prisma.sql`
      SELECT
        id,
        entidade_tipo,
        entidade_id,
        categoria,
        nome_original,
        nome_arquivo,
        caminho_arquivo,
        mime_type,
        observacao,
        data_upload
      FROM arquivos
      WHERE entidade_tipo = 'autorizacao_compra'
        AND entidade_id = ${autorizacaoId}
        AND ativo = TRUE
      ORDER BY data_upload DESC, id DESC
    `);
  }

  private async buscarPorIdTxOuFalhar(tx: DbClient, id: bigint, tenantId: string) {
    const rows = await tx.$queryRaw<AutorizacaoCompraRow[]>(Prisma.sql`
      ${COMPRA_SELECT}
      WHERE id = ${id}
        AND tenant_id::text = ${tenantId}
      LIMIT 1
    `);
    const registro = rows[0];
    if (!registro) {
      throw new AppError("Processo de compra não encontrado.", 404);
    }
    return registro;
  }

  private async buscarCotacaoTxOuFalhar(tx: DbClient, autorizacaoId: bigint, cotacaoId: bigint) {
    const rows = await tx.$queryRaw<AutorizacaoCompraCotacaoRow[]>(Prisma.sql`
      SELECT
        id,
        autorizacao_compra_id,
        fornecedor,
        razao_social,
        cnpj,
        contato,
        telefone,
        email,
        valor::float8 AS valor,
        prazo_entrega,
        forma_pagamento,
        validade,
        observacoes,
        data_cotacao,
        orcamento_arquivo_id,
        cartao_cnpj_arquivo_id,
        ativo,
        criado_em,
        atualizado_em
      FROM autorizacao_compras_cotacoes
      WHERE autorizacao_compra_id = ${autorizacaoId}
        AND id = ${cotacaoId}
      LIMIT 1
    `);

    const cotacao = rows[0];
    if (!cotacao) {
      throw new AppError("Cotação não encontrada.", 404);
    }
    return cotacao;
  }

  private async buscarReservaTxOuFalhar(tx: DbClient, autorizacaoId: bigint, reservaId: bigint) {
    const rows = await tx.$queryRaw<AutorizacaoCompraReservaRow[]>(Prisma.sql`
      SELECT
        id,
        autorizacao_compra_id,
        conta_bancaria_id,
        valor::float8 AS valor,
        status,
        observacao,
        usuario_responsavel,
        cancelado_em,
        criado_em
      FROM autorizacao_compras_reserva_bancaria
      WHERE autorizacao_compra_id = ${autorizacaoId}
        AND id = ${reservaId}
      LIMIT 1
    `);

    const reserva = rows[0];
    if (!reserva) {
      throw new AppError("Reserva bancária não encontrada.", 404);
    }
    return reserva;
  }

  private async sincronizarItens(tx: DbClient, autorizacaoId: bigint, itens: AutorizacaoCompraItemInput[]) {
    await tx.$executeRaw(Prisma.sql`
      UPDATE autorizacao_compras_item
      SET ativo = FALSE,
          atualizado_em = NOW()
      WHERE autorizacao_compra_id = ${autorizacaoId}
        AND ativo = TRUE
    `);

    for (const [index, item] of itens.entries()) {
      await tx.$executeRaw(Prisma.sql`
        INSERT INTO autorizacao_compras_item (
          autorizacao_compra_id,
          descricao,
          quantidade,
          unidade,
          valor_estimado,
          categoria,
          tipo_item,
          ordem,
          ativo,
          criado_em,
          atualizado_em
        ) VALUES (
          ${autorizacaoId},
          ${item.descricao},
          ${item.quantidade},
          ${item.unidade},
          ${item.valorEstimado},
          ${trimOrUndefined(item.categoria ?? undefined)},
          ${item.tipoItem},
          ${index + 1},
          TRUE,
          NOW(),
          NOW()
        )
      `);
    }
  }

  private async atualizarResumoCotacoesTx(
    tx: DbClient,
    autorizacaoId: bigint,
    cotacaoVencedoraId?: bigint | null
  ) {
    const cotacoes = await this.listarCotacoesTx(tx, autorizacaoId);
    const resumo = calcularResumoCotacoes(cotacoes, cotacaoVencedoraId);

    await tx.$executeRaw(Prisma.sql`
      UPDATE autorizacao_compras
      SET
        menor_preco_cotacao_id = ${resumo.menor?.id ?? null},
        menor_preco_fornecedor = ${resumo.menor?.fornecedor ?? null},
        menor_preco_valor = ${resumo.menor?.valor ?? null},
        atualizado_em = NOW()
      WHERE id = ${autorizacaoId}
    `);

    return resumo;
  }

  private async registrarHistorico(
    tx: DbClient,
    payload: {
      autorizacaoCompraId: bigint;
      acao: string;
      aba?: string | null;
      statusAnterior?: string | null;
      statusNovo?: string | null;
      observacao?: string | null;
      justificativa?: string | null;
      ator: AutorizacaoCompraAtor;
    }
  ) {
    await tx.$executeRaw(Prisma.sql`
      INSERT INTO autorizacao_compras_historico (
        autorizacao_compra_id,
        acao,
        aba,
        status_anterior,
        status_novo,
        observacao,
        justificativa,
        usuario_id,
        usuario_nome,
        perfil,
        ip,
        maquina,
        criado_em
      ) VALUES (
        ${payload.autorizacaoCompraId},
        ${payload.acao},
        ${trimOrUndefined(payload.aba ?? undefined)},
        ${trimOrUndefined(payload.statusAnterior ?? undefined)},
        ${trimOrUndefined(payload.statusNovo ?? undefined)},
        ${trimOrUndefined(payload.observacao ?? undefined)},
        ${trimOrUndefined(payload.justificativa ?? undefined)},
        ${payload.ator.usuarioId ?? null},
        ${payload.ator.nomeUsuario ?? null},
        ${(payload.ator.permissoes ?? []).join(", ") || null},
        ${payload.ator.ip ?? null},
        ${payload.ator.maquina ?? null},
        NOW()
      )
    `);

    await this.registrarAuditoriaGeral(payload);
  }

  private async registrarAuditoriaGeral(payload: {
    autorizacaoCompraId: bigint;
    acao: string;
    statusAnterior?: string | null;
    statusNovo?: string | null;
    observacao?: string | null;
    ator: AutorizacaoCompraAtor;
  }) {
    try {
      await prisma.$executeRawUnsafe(
        `
          INSERT INTO auditoria_evento (usuario_id, acao, entidade, entidade_id, dados_json, criado_em)
          VALUES ($1, $2, 'AUTORIZACAO_COMPRA', $3, $4::jsonb, NOW())
        `,
        payload.ator.usuarioId ? Number(payload.ator.usuarioId) : null,
        payload.acao,
        String(payload.autorizacaoCompraId),
        JSON.stringify({
          statusAnterior: payload.statusAnterior ?? null,
          statusNovo: payload.statusNovo ?? null,
          observacao: payload.observacao ?? null,
          ip: payload.ator.ip ?? null,
          maquina: payload.ator.maquina ?? null
        })
      );
    } catch (error) {
      console.warn("[autorizacao-compras] falha ao registrar auditoria_evento:", error);
    }
  }

  private async assegurarNiveisAprovacaoPadraoTx(tx: DbClient, tenantId: string) {
    for (const nivel of DEFAULT_APPROVAL_LEVELS) {
      await tx.$executeRawUnsafe(
        `
          INSERT INTO autorizacao_compras_aprovacao_nivel (
            tenant_id,
            codigo,
            nome,
            ordem,
            valor_minimo,
            valor_maximo,
            permissao_requerida,
            ativo,
            criado_em,
            atualizado_em
          )
          SELECT $1::uuid, $2, $3, $4, $5, $6, $7, TRUE, NOW(), NOW()
          WHERE NOT EXISTS (
            SELECT 1
            FROM autorizacao_compras_aprovacao_nivel
            WHERE tenant_id::text = $8
              AND codigo = $2
          )
        `,
        tenantId,
        nivel.codigo,
        nivel.nome,
        nivel.ordem,
        nivel.valorMinimo,
        nivel.valorMaximo,
        nivel.permissaoRequerida,
        tenantId
      );
    }
  }

  private async persistirOrcamentoSetorial(
    tx: DbClient,
    setorSolicitante: string,
    centroCusto: string,
    orcamentoPrevisto: number,
    tenantId: string
  ) {
    if (!Number.isFinite(orcamentoPrevisto) || orcamentoPrevisto <= 0) {
      return;
    }

    const rows = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
      SELECT id
      FROM autorizacao_compras_orcamento
      WHERE tenant_id::text = ${tenantId}
        AND LOWER(setor_solicitante) = LOWER(${setorSolicitante})
        AND LOWER(centro_custo) = LOWER(${centroCusto})
      LIMIT 1
    `);

    const existente = rows[0]?.id;
    if (existente) {
      await tx.$executeRaw(Prisma.sql`
        UPDATE autorizacao_compras_orcamento
        SET
          orcamento_previsto = ${orcamentoPrevisto},
          ativo = TRUE,
          atualizado_em = NOW()
        WHERE id = ${existente}
          AND tenant_id::text = ${tenantId}
      `);
      return;
    }

    await tx.$executeRaw(Prisma.sql`
      INSERT INTO autorizacao_compras_orcamento (
        tenant_id,
        setor_solicitante,
        centro_custo,
        orcamento_previsto,
        ativo,
        criado_em,
        atualizado_em
      ) VALUES (
        ${tenantId}::uuid,
        ${setorSolicitante},
        ${centroCusto},
        ${orcamentoPrevisto},
        TRUE,
        NOW(),
        NOW()
      )
    `);
  }

  private async obterOrcamentoPrevisto(
    tx: DbClient,
    setorSolicitante: string,
    centroCusto: string,
    tenantId: string
  ) {
    const rows = await tx.$queryRaw<Array<{ orcamento_previsto: number }>>(Prisma.sql`
      SELECT orcamento_previsto::float8 AS orcamento_previsto
      FROM autorizacao_compras_orcamento
      WHERE tenant_id::text = ${tenantId}
        AND LOWER(setor_solicitante) = LOWER(${setorSolicitante})
        AND LOWER(centro_custo) = LOWER(${centroCusto})
        AND ativo = TRUE
      LIMIT 1
    `);
    return rows[0]?.orcamento_previsto ?? 0;
  }

  private async calcularOrcamentoUtilizado(
    tx: DbClient,
    setorSolicitante: string,
    centroCusto: string,
    tenantId: string,
    idAtual?: bigint
  ) {
    const ativos = [...AUTORIZACAO_COMPRA_STATUS_ATIVOS];
    const rows = await tx.$queryRaw<Array<{ total: number }>>(Prisma.sql`
      SELECT
        COALESCE(SUM(COALESCE(valor_solicitacao, valor_total_itens, valor, 0)), 0)::float8 AS total
      FROM autorizacao_compras
      WHERE ativo = TRUE
        AND tenant_id::text = ${tenantId}
        AND LOWER(COALESCE(setor_solicitante, area, '')) = LOWER(${setorSolicitante})
        AND LOWER(COALESCE(centro_custo, '')) = LOWER(${centroCusto})
        AND status IN (${Prisma.join(ativos.map((status) => Prisma.sql`${status}`))})
        ${idAtual ? Prisma.sql`AND id <> ${idAtual}` : Prisma.empty}
    `);
    return rows[0]?.total ?? 0;
  }

  private async validarArquivoCompra(tx: DbClient, autorizacaoId: bigint, arquivoId?: number | null) {
    if (!arquivoId) return;

    const rows = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
      SELECT id
      FROM arquivos
      WHERE id = ${BigInt(arquivoId)}
        AND entidade_tipo = 'autorizacao_compra'
        AND entidade_id = ${autorizacaoId}
        AND ativo = TRUE
      LIMIT 1
    `);

    if (!rows.length) {
      throw new AppError("O arquivo informado não pertence a este processo de compra.", 409);
    }
  }

  private async criarOuAtualizarLancamentoFinanceiro(
    tx: DbClient,
    payload: {
      compraId: bigint;
      fornecedor: string;
      valor: number;
      vencimento: string;
      descricao: string;
    }
  ) {
    const rows = await tx.$queryRaw<LancamentoCompraRow[]>(Prisma.sql`
      SELECT
        id,
        valor::float8 AS valor,
        situacao
      FROM lancamento_financeiro
      WHERE compra_id = ${payload.compraId}
      LIMIT 1
    `);

    const existente = rows[0];
    if (existente) {
      await tx.$executeRaw(Prisma.sql`
        UPDATE lancamento_financeiro
        SET
          tipo = 'Despesa',
          descricao = ${payload.descricao},
          contraparte = ${payload.fornecedor},
          vencimento = ${toOptionalDate(payload.vencimento)},
          valor = ${payload.valor},
          situacao = 'Autorizado',
          atualizado_em = NOW()
        WHERE id = ${existente.id}
      `);
      return { id: existente.id };
    }

    const inserted = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
      INSERT INTO lancamento_financeiro (
        tipo,
        descricao,
        contraparte,
        vencimento,
        valor,
        situacao,
        compra_id,
        criado_em,
        atualizado_em
      ) VALUES (
        'Despesa',
        ${payload.descricao},
        ${payload.fornecedor},
        ${toOptionalDate(payload.vencimento)},
        ${payload.valor},
        'Autorizado',
        ${payload.compraId},
        NOW(),
        NOW()
      )
      RETURNING id
    `);

    const id = inserted[0]?.id;
    if (!id) {
      throw new AppError("Não foi possível gerar o lançamento financeiro da compra.", 500);
    }
    return { id };
  }

  private async integrarAoAlmoxarifado(
    tx: DbClient,
    autorizacaoId: bigint,
    itens: AutorizacaoCompraItemRow[],
    cotacaoVencedora: AutorizacaoCompraCotacaoRow,
    pagamento: AutorizacaoPagamentoInput,
    ator: AutorizacaoCompraAtor
  ) {
    const tenantId = ator.tenantId?.trim();
    if (!tenantId) {
      throw new AppError("Tenant da sessao nao identificado.", 401);
    }
    const materiais = itens.filter((item) => item.tipo_item === "material");
    for (const item of materiais) {
      const referenciaId = `ITEM:${item.ordem}`;
      const jaIntegrado = await this.existeIntegracaoTx(tx, autorizacaoId, "ALMOXARIFADO", referenciaId);
      if (jaIntegrado) continue;

      const almoxItem = await this.buscarOuCriarItemAlmoxarifadoTx(tx, item, cotacaoVencedora, tenantId);
      await this.registrarMovimentacaoAlmoxarifadoTx(tx, {
        tenantId,
        itemId: almoxItem.id,
        quantidade: item.quantidade,
        referencia: `${await this.buscarNumeroSolicitacaoTx(tx, autorizacaoId)} / ${pagamento.documentoFiscal ?? "Sem NF"}`,
        responsavel: ator.nomeUsuario ?? cotacaoVencedora.contato ?? "Sistema",
        observacoes: `Entrada automática gerada pela compra ${await this.buscarNumeroSolicitacaoTx(tx, autorizacaoId)}.`,
        dataMovimentacao: pagamento.vencimento
      });

      await this.registrarIntegracao(tx, {
        autorizacaoCompraId: autorizacaoId,
        tipo: "ALMOXARIFADO",
        referenciaId,
        status: "CONCLUIDO",
        detalhe: `Item ${item.descricao} integrado ao almoxarifado.`,
        ator
      });
    }
  }

  private async integrarAoPatrimonio(
    tx: DbClient,
    autorizacaoId: bigint,
    itens: AutorizacaoCompraItemRow[],
    cotacaoVencedora: AutorizacaoCompraCotacaoRow,
    pagamento: AutorizacaoPagamentoInput,
    ator: AutorizacaoCompraAtor
  ) {
    const tenantId = ator.tenantId?.trim();
    if (!tenantId) {
      throw new AppError("Tenant da sessao nao identificado.", 401);
    }
    const bens = itens.filter((item) => item.tipo_item === "bem");
    for (const item of bens) {
      const quantidade = Math.max(1, Math.round(item.quantidade));
      for (let indice = 1; indice <= quantidade; indice += 1) {
        const referenciaId = `ITEM:${item.ordem}:${indice}`;
        const jaIntegrado = await this.existeIntegracaoTx(tx, autorizacaoId, "PATRIMONIO", referenciaId);
        if (jaIntegrado) continue;

        const numeroPatrimonio = `PAT-${new Date().getFullYear()}-${String(Number(autorizacaoId)).padStart(6, "0")}-${String(item.ordem).padStart(2, "0")}-${String(indice).padStart(2, "0")}`;
        const inserted = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
          INSERT INTO patrimonio_item (
            tenant_id,
            numero_patrimonio,
            nome,
            categoria,
            status,
            data_aquisicao,
            valor_aquisicao,
            origem,
            responsavel,
            unidade,
            observacoes,
            criado_em,
            atualizado_em
          ) VALUES (
            ${tenantId}::uuid,
            ${numeroPatrimonio},
            ${item.descricao},
            ${trimOrUndefined(item.categoria ?? undefined)},
            'Ativo',
            ${toOptionalDate(pagamento.vencimento)},
            ${item.valor_estimado},
            ${cotacaoVencedora.fornecedor},
            ${ator.nomeUsuario ?? cotacaoVencedora.contato ?? null},
            ${'Contabilidade e finanças'},
            ${`Gerado automaticamente pela compra ${await this.buscarNumeroSolicitacaoTx(tx, autorizacaoId)}.`},
            NOW(),
            NOW()
          )
          RETURNING id
        `);

        const patrimonioId = inserted[0]?.id;
        if (!patrimonioId) {
          throw new AppError("Não foi possível gerar o patrimônio da compra.", 500);
        }

        await tx.$executeRaw(Prisma.sql`
          INSERT INTO patrimonio_movimentacao (
            tenant_id,
            patrimonio_id,
            tipo,
            destino,
            responsavel,
            observacao,
            data_movimento,
            criado_em
          ) VALUES (
            ${tenantId}::uuid,
            ${patrimonioId},
            'MOVIMENTACAO',
            ${'Incorporação inicial'},
            ${ator.nomeUsuario ?? cotacaoVencedora.contato ?? null},
            ${`Incorporação automática da compra ${await this.buscarNumeroSolicitacaoTx(tx, autorizacaoId)}.`},
            ${toOptionalDate(pagamento.vencimento) ?? new Date()},
            NOW()
          )
        `);

        await this.registrarIntegracao(tx, {
          autorizacaoCompraId: autorizacaoId,
          tipo: "PATRIMONIO",
          referenciaId,
          status: "CONCLUIDO",
          detalhe: `Bem ${item.descricao} incorporado com número patrimonial ${numeroPatrimonio}.`,
          ator
        });
      }
    }
  }

  private async existeIntegracaoTx(
    tx: DbClient,
    autorizacaoId: bigint,
    tipo: string,
    referenciaId: string
  ) {
    const rows = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
      SELECT id
      FROM autorizacao_compras_integracao
      WHERE autorizacao_compra_id = ${autorizacaoId}
        AND tipo = ${tipo}
        AND referencia_id = ${referenciaId}
      LIMIT 1
    `);
    return rows.length > 0;
  }

  private async registrarIntegracao(
    tx: DbClient,
    payload: {
      autorizacaoCompraId: bigint;
      tipo: string;
      referenciaId: string;
      status: string;
      detalhe: string;
      ator: AutorizacaoCompraAtor;
    }
  ) {
    await tx.$executeRaw(Prisma.sql`
      INSERT INTO autorizacao_compras_integracao (
        autorizacao_compra_id,
        tipo,
        referencia_id,
        status,
        detalhe,
        usuario_id,
        usuario_nome,
        criado_em
      ) VALUES (
        ${payload.autorizacaoCompraId},
        ${payload.tipo},
        ${payload.referenciaId},
        ${payload.status},
        ${payload.detalhe},
        ${payload.ator.usuarioId ?? null},
        ${payload.ator.nomeUsuario ?? null},
        NOW()
      )
    `);
  }

  private async buscarOuCriarItemAlmoxarifadoTx(
    tx: DbClient,
    item: AutorizacaoCompraItemRow,
    cotacaoVencedora: AutorizacaoCompraCotacaoRow,
    tenantId: string
  ) {
    const existentes = await tx.$queryRaw<Array<{ id: bigint; estoque_atual: number }>>(Prisma.sql`
      SELECT
        id,
        estoque_atual::float8 AS estoque_atual
      FROM almoxarifado_item
      WHERE tenant_id::text = ${tenantId}
        AND LOWER(descricao) = LOWER(${item.descricao})
        AND LOWER(categoria) = LOWER(${trimOrUndefined(item.categoria ?? undefined) ?? item.tipo_item})
        AND LOWER(unidade) = LOWER(${item.unidade})
      LIMIT 1
    `);

    const existente = existentes[0];
    if (existente) {
      return { id: existente.id, estoqueAtual: existente.estoque_atual };
    }

    const codigoRows = await tx.$queryRaw<Array<{ proximo: number }>>(Prisma.sql`
      SELECT COALESCE(MAX(CAST(codigo AS INTEGER)), 0) + 1 AS proximo
      FROM almoxarifado_item
      WHERE tenant_id::text = ${tenantId}
        AND codigo ~ '^[0-9]+$'
    `);
    const codigo = String(codigoRows[0]?.proximo ?? 1).padStart(4, "0");

    const inserted = await tx.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
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
        observacoes,
        criado_em,
        atualizado_em
      ) VALUES (
        ${tenantId}::uuid,
        ${codigo},
        ${item.descricao},
        ${trimOrUndefined(item.categoria ?? undefined) ?? item.tipo_item},
        ${item.unidade},
        0,
        0,
        ${item.valor_estimado},
        FALSE,
        'Ativo',
        ${`Fornecedor inicial: ${cotacaoVencedora.fornecedor}`},
        NOW(),
        NOW()
      )
      RETURNING id
    `);

    const id = inserted[0]?.id;
    if (!id) {
      throw new AppError("Não foi possível criar o item de almoxarifado.", 500);
    }

    return { id, estoqueAtual: 0 };
  }

  private async registrarMovimentacaoAlmoxarifadoTx(
    tx: DbClient,
    payload: {
      tenantId: string;
      itemId: bigint;
      quantidade: number;
      referencia: string;
      responsavel: string;
      observacoes: string;
      dataMovimentacao: string;
    }
  ) {
    const itemRows = await tx.$queryRaw<Array<{ estoque_atual: number }>>(Prisma.sql`
      SELECT estoque_atual::float8 AS estoque_atual
      FROM almoxarifado_item
      WHERE id = ${payload.itemId}
        AND tenant_id::text = ${payload.tenantId}
      LIMIT 1
    `);
    const estoqueAtual = itemRows[0]?.estoque_atual ?? 0;
    const saldoApos = estoqueAtual + payload.quantidade;

    await tx.$executeRaw(Prisma.sql`
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
        criado_em
      ) VALUES (
        ${payload.tenantId}::uuid,
        ${payload.itemId},
        ${toOptionalDate(payload.dataMovimentacao)},
        'Entrada',
        ${payload.quantidade},
        ${saldoApos},
        ${payload.referencia},
        ${payload.responsavel},
        ${payload.observacoes},
        NOW()
      )
    `);

    await tx.$executeRaw(Prisma.sql`
      UPDATE almoxarifado_item
      SET
        estoque_atual = ${saldoApos},
        atualizado_em = NOW()
      WHERE id = ${payload.itemId}
        AND tenant_id::text = ${payload.tenantId}
    `);
  }

  private async buscarNumeroSolicitacaoTx(tx: DbClient, autorizacaoId: bigint) {
    const rows = await tx.$queryRaw<Array<{ numero_solicitacao: string | null }>>(Prisma.sql`
      SELECT numero_solicitacao
      FROM autorizacao_compras
      WHERE id = ${autorizacaoId}
      LIMIT 1
    `);
    return rows[0]?.numero_solicitacao ?? gerarNumeroSolicitacao(autorizacaoId);
  }

  private async calcularIndicadoresFornecedoresTx(
    tx: DbClient,
    autorizacaoId: bigint,
    cotacoes: AutorizacaoCompraCotacaoRow[],
    tenantId: string
  ) {
    const resultado: Record<number, unknown> = {};

    for (const cotacao of cotacoes.filter((item) => item.ativo)) {
      const historico = await this.buscarHistoricoFornecedorTx(tx, autorizacaoId, cotacao, tenantId);
      const mediaFornecedor =
        historico.reduce(
          (total, item) =>
            total + (item.pagamento_autorizado_valor ?? item.valor_total_itens ?? 0),
          0
        ) / (historico.length || 1);
      const concorrentesAtuais = cotacoes.filter((item) => item.ativo && item.id !== cotacao.id);
      const mediaConcorrentesAtual =
        concorrentesAtuais.reduce((total, item) => total + item.valor, 0) /
        Math.max(1, concorrentesAtuais.length);

      resultado[Number(cotacao.id)] = {
        quantidadeComprasAnteriores: historico.length,
        valorTotalContratado: historico.reduce(
          (total, item) =>
            total + (item.pagamento_autorizado_valor ?? item.valor_total_itens ?? 0),
          0
        ),
        historicoAtrasos: 0,
        indiceAtendimento: historico.length ? 100 : 0,
        ultimasComprasRealizadas: historico.slice(0, 3).map((item) => ({
          id: Number(item.id),
          numeroSolicitacao: item.numero_solicitacao ?? undefined,
          titulo: item.titulo,
          valor: item.pagamento_autorizado_valor ?? item.valor_total_itens ?? 0,
          status: item.status,
          data: item.finalizado_em?.toISOString() ?? item.data_solicitacao?.toISOString()
        })),
        mediaPrecoComparada: Number.isFinite(mediaFornecedor - mediaConcorrentesAtual)
          ? mediaFornecedor - mediaConcorrentesAtual
          : 0
      };
    }

    return resultado;
  }

  private async buscarHistoricoFornecedorTx(
    tx: DbClient,
    autorizacaoId: bigint,
    cotacao: AutorizacaoCompraCotacaoRow,
    tenantId: string
  ) {
    return tx.$queryRaw<FornecedorIndicadoresCompraAnteriorRow[]>(Prisma.sql`
      SELECT
        ac.id,
        ac.numero_solicitacao,
        ac.titulo,
        ac.valor_total_itens::float8 AS valor_total_itens,
        ac.pagamento_autorizado_valor::float8 AS pagamento_autorizado_valor,
        ac.data_solicitacao,
        ac.finalizado_em,
        ac.status
      FROM autorizacao_compras ac
      INNER JOIN autorizacao_compras_cotacoes cc
        ON cc.id = ac.cotacao_vencedora_id
      WHERE ac.id <> ${autorizacaoId}
        AND ac.tenant_id::text = ${tenantId}
        AND cc.ativo = TRUE
        AND (
          (${trimOrUndefined(cotacao.cnpj ?? undefined)} IS NOT NULL
            AND REGEXP_REPLACE(COALESCE(cc.cnpj, ''), '[^0-9]', '', 'g') =
                REGEXP_REPLACE(COALESCE(${trimOrUndefined(cotacao.cnpj ?? undefined)}, ''), '[^0-9]', '', 'g'))
          OR LOWER(COALESCE(cc.fornecedor, '')) = LOWER(${cotacao.fornecedor})
        )
      ORDER BY COALESCE(ac.finalizado_em, ac.data_solicitacao, ac.criado_em) DESC
      LIMIT 10
    `);
  }
}
