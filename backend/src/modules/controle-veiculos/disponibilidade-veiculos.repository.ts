import { Prisma } from "@prisma/client";
import { prisma } from "../../database/prisma.js";
import { AppError } from "../../shared/errors/app-error.js";
import { ensureControleVeiculosEstrutura } from "./repositories/controle-veiculos.repository.js";
import type {
  DisponibilidadeVeiculoConsultaInput,
  DisponibilidadeVeiculoInput,
  DisponibilidadeVeiculoStatusRegistro,
  DisponibilidadeVeiculoTipoSituacao
} from "./controle-veiculos.types.js";

type VeiculoBaseRow = {
  id: bigint;
  placa: string | null;
  modelo: string | null;
  marca: string | null;
  ativo: boolean | null;
};

type DisponibilidadeBaseRow = {
  id: bigint;
  tenant_id: string;
  veiculo_id: bigint;
  tipo_situacao: DisponibilidadeVeiculoTipoSituacao;
  data_hora_inicio: Date;
  data_hora_fim: Date;
  motivo: string | null;
  motivo_detalhado: string | null;
  destino: string | null;
  responsavel_nome: string | null;
  observacoes: string | null;
  status_registro: DisponibilidadeVeiculoStatusRegistro;
  criado_por_nome: string | null;
  criado_em: Date;
  alterado_por_nome: string | null;
  alterado_em: Date;
  cancelado_por_nome: string | null;
  cancelado_em: Date | null;
  motivo_cancelamento: string | null;
  version: number | bigint;
  placa: string | null;
  modelo: string | null;
  marca: string | null;
  veiculo_ativo: boolean | null;
};

type HistoricoRow = {
  id: bigint;
  disponibilidade_veiculo_id: bigint;
  acao: string;
  antes_json: unknown;
  depois_json: unknown;
  usuario_nome: string | null;
  criado_em: Date;
};

type ConsultaRange = {
  inicio: Date;
  fim: Date;
};

type Intervalo = {
  inicio: Date;
  fim: Date;
  tipoSituacao: DisponibilidadeVeiculoTipoSituacao;
};

const DISPONIBILIDADE_STATEMENTS = [
  `
    CREATE TABLE IF NOT EXISTS controle_veiculos_disponibilidade (
      id BIGSERIAL PRIMARY KEY,
      tenant_id UUID NOT NULL,
      veiculo_id BIGINT NOT NULL,
      tipo_situacao VARCHAR(20) NOT NULL,
      data_hora_inicio TIMESTAMP NOT NULL,
      data_hora_fim TIMESTAMP NOT NULL,
      motivo VARCHAR(120),
      motivo_detalhado TEXT,
      destino VARCHAR(180),
      responsavel_id BIGINT,
      responsavel_nome VARCHAR(160),
      observacoes TEXT,
      status_registro VARCHAR(30) NOT NULL DEFAULT 'ATIVO',
      criado_por_usuario_id BIGINT,
      criado_por_nome VARCHAR(160),
      criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
      alterado_por_usuario_id BIGINT,
      alterado_por_nome VARCHAR(160),
      alterado_em TIMESTAMP NOT NULL DEFAULT NOW(),
      cancelado_por_usuario_id BIGINT,
      cancelado_por_nome VARCHAR(160),
      cancelado_em TIMESTAMP,
      motivo_cancelamento TEXT,
      version INTEGER NOT NULL DEFAULT 1
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS controle_veiculos_disponibilidade_historico (
      id BIGSERIAL PRIMARY KEY,
      disponibilidade_veiculo_id BIGINT NOT NULL,
      acao VARCHAR(40) NOT NULL,
      antes_json JSONB,
      depois_json JSONB,
      usuario_id BIGINT,
      usuario_nome VARCHAR(160),
      criado_em TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `,
  "CREATE INDEX IF NOT EXISTS controle_veiculos_disponibilidade_tenant_idx ON controle_veiculos_disponibilidade(tenant_id, status_registro, data_hora_inicio DESC, data_hora_fim DESC)",
  "CREATE INDEX IF NOT EXISTS controle_veiculos_disponibilidade_veiculo_idx ON controle_veiculos_disponibilidade(tenant_id, veiculo_id, data_hora_inicio DESC)",
  "CREATE INDEX IF NOT EXISTS controle_veiculos_disponibilidade_situacao_idx ON controle_veiculos_disponibilidade(tenant_id, tipo_situacao, status_registro)",
  "CREATE INDEX IF NOT EXISTS controle_veiculos_disponibilidade_periodo_idx ON controle_veiculos_disponibilidade(tenant_id, data_hora_inicio, data_hora_fim)",
  "CREATE INDEX IF NOT EXISTS controle_veiculos_disponibilidade_hist_idx ON controle_veiculos_disponibilidade_historico(disponibilidade_veiculo_id, criado_em DESC)"
];

let ensureDisponibilidadePromise: Promise<void> | null = null;

export async function ensureControleVeiculosDisponibilidadeEstrutura() {
  await ensureControleVeiculosEstrutura();
  if (!ensureDisponibilidadePromise) {
    ensureDisponibilidadePromise = (async () => {
      for (const statement of DISPONIBILIDADE_STATEMENTS) {
        await prisma.$executeRawUnsafe(statement);
      }
    })().catch((error) => {
      ensureDisponibilidadePromise = null;
      throw error;
    });
  }

  await ensureDisponibilidadePromise;
}

function formatarNomeVeiculo(row: Pick<VeiculoBaseRow, "placa" | "modelo" | "marca">) {
  const partes = [row.placa, row.marca, row.modelo].filter((item) => Boolean(item?.trim()));
  return partes.join(" - ") || "---";
}

function normalizarStatusRegistro(valor?: string | null): DisponibilidadeVeiculoStatusRegistro {
  const texto = String(valor ?? "").trim().toUpperCase();
  if (texto === "CANCELADO" || texto === "ENCERRADO" || texto === "EXCLUIDO_LOGICAMENTE") return texto;
  return "ATIVO";
}

function intervalosSobrepoem(a: Intervalo, b: Intervalo) {
  return a.inicio < b.fim && a.fim > b.inicio;
}

function mesclarIntervalos(intervalos: Intervalo[]) {
  const ordenados = [...intervalos].sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
  const resultado: Intervalo[] = [];
  for (const intervalo of ordenados) {
    const ultimo = resultado[resultado.length - 1];
    if (!ultimo || ultimo.fim.getTime() < intervalo.inicio.getTime()) {
      resultado.push({ ...intervalo });
      continue;
    }

    if (intervalo.fim.getTime() > ultimo.fim.getTime()) {
      ultimo.fim = intervalo.fim;
    }

    if (intervalo.tipoSituacao === "INDISPONIVEL") {
      ultimo.tipoSituacao = "INDISPONIVEL";
    }
  }
  return resultado;
}

function paraIso(value: Date) {
  return value.toISOString();
}

export class ControleVeiculosDisponibilidadeRepository {
  private async garantirEstrutura() {
    await ensureControleVeiculosDisponibilidadeEstrutura();
  }

  private async travarVeiculo(tenantId: string, veiculoId: number) {
    await prisma.$executeRawUnsafe(
      `
      SELECT pg_advisory_xact_lock(hashtext($1), $2::int)
      `,
      tenantId,
      veiculoId
    );
  }

  private async buscarVeiculoAtivoOuFalhar(tenantId: string, veiculoId: number) {
    const rows = await prisma.$queryRawUnsafe<VeiculoBaseRow[]>(
      `
      SELECT id, placa, modelo, marca, ativo
      FROM controle_veiculos
      WHERE tenant_id::text = $1
        AND id = $2
        AND COALESCE(ativo, TRUE) = TRUE
      LIMIT 1
      `,
      tenantId,
      BigInt(veiculoId)
    );

    const veiculo = rows[0];
    if (!veiculo) {
      throw new AppError("Veiculo nao encontrado ou indisponivel para reserva.", 404);
    }
    return veiculo;
  }

  private async buscarConflito(
    tenantId: string,
    veiculoId: number,
    inicio: Date,
    fim: Date,
    ignorarId?: number
  ) {
    const rows = await prisma.$queryRawUnsafe<DisponibilidadeBaseRow[]>(
      `
      SELECT
        d.*,
        v.placa,
        v.modelo,
        v.marca,
        v.ativo AS veiculo_ativo
      FROM controle_veiculos_disponibilidade d
      INNER JOIN controle_veiculos v ON v.id = d.veiculo_id
      WHERE d.tenant_id::text = $1
        AND d.veiculo_id = $2
        AND d.status_registro = 'ATIVO'
        AND ($5::bigint IS NULL OR d.id <> $5::bigint)
        AND d.data_hora_inicio < $4
        AND d.data_hora_fim > $3
      ORDER BY d.data_hora_inicio ASC, d.id ASC
      LIMIT 1
      `,
      tenantId,
      BigInt(veiculoId),
      inicio,
      fim,
      ignorarId ? BigInt(ignorarId) : null
    );

    return rows[0] ?? null;
  }

  private async registrarHistorico(
    tx: Prisma.TransactionClient,
    id: bigint,
    acao: string,
    antes: unknown,
    depois: unknown,
    usuarioId?: bigint | null,
    usuarioNome?: string | null
  ) {
    await tx.$executeRawUnsafe(
      `
      INSERT INTO controle_veiculos_disponibilidade_historico (
        disponibilidade_veiculo_id,
        acao,
        antes_json,
        depois_json,
        usuario_id,
        usuario_nome,
        criado_em
      ) VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, $6, NOW())
      `,
      id,
      acao,
      antes ? JSON.stringify(antes) : null,
      depois ? JSON.stringify(depois) : null,
      usuarioId ?? null,
      usuarioNome ?? null
    );
  }

  private mapRow(row: DisponibilidadeBaseRow) {
    return {
      id: Number(row.id),
      tenantId: row.tenant_id,
      veiculoId: Number(row.veiculo_id),
      veiculoNome: formatarNomeVeiculo(row),
      placa: row.placa,
      marca: row.marca,
      modelo: row.modelo,
      veiculoAtivo: row.veiculo_ativo,
      tipoSituacao: row.tipo_situacao,
      dataHoraInicio: paraIso(row.data_hora_inicio),
      dataHoraFim: paraIso(row.data_hora_fim),
      motivo: row.motivo,
      motivoDetalhado: row.motivo_detalhado,
      destino: row.destino,
      responsavelNome: row.responsavel_nome,
      observacoes: row.observacoes,
      statusRegistro: row.status_registro,
      criadoPorNome: row.criado_por_nome,
      criadoEm: paraIso(row.criado_em),
      alteradoPorNome: row.alterado_por_nome,
      alteradoEm: paraIso(row.alterado_em),
      canceladoPorNome: row.cancelado_por_nome,
      canceladoEm: row.cancelado_em ? paraIso(row.cancelado_em) : null,
      motivoCancelamento: row.motivo_cancelamento,
      version: Number(row.version)
    };
  }

  private mapHistorico(row: HistoricoRow) {
    return {
      id: Number(row.id),
      disponibilidadeVeiculoId: Number(row.disponibilidade_veiculo_id),
      acao: row.acao,
      antes: row.antes_json ?? null,
      depois: row.depois_json ?? null,
      usuarioNome: row.usuario_nome,
      criadoEm: paraIso(row.criado_em)
    };
  }

  async listarDisponibilidades(tenantId: string) {
    await this.garantirEstrutura();
    const rows = await prisma.$queryRawUnsafe<DisponibilidadeBaseRow[]>(
      `
      SELECT
        d.*,
        v.placa,
        v.modelo,
        v.marca,
        v.ativo AS veiculo_ativo
      FROM controle_veiculos_disponibilidade d
      INNER JOIN controle_veiculos v ON v.id = d.veiculo_id
      WHERE d.tenant_id::text = $1
      ORDER BY d.data_hora_inicio DESC, d.id DESC
      `,
      tenantId
    );
    return rows.map((row) => this.mapRow(row));
  }

  async obterPorId(id: number, tenantId: string) {
    await this.garantirEstrutura();
    const rows = await prisma.$queryRawUnsafe<DisponibilidadeBaseRow[]>(
      `
      SELECT
        d.*,
        v.placa,
        v.modelo,
        v.marca,
        v.ativo AS veiculo_ativo
      FROM controle_veiculos_disponibilidade d
      INNER JOIN controle_veiculos v ON v.id = d.veiculo_id
      WHERE d.tenant_id::text = $1
        AND d.id = $2
      LIMIT 1
      `,
      tenantId,
      BigInt(id)
    );
    const row = rows[0];
    if (!row) {
      throw new AppError("Registro de disponibilidade nao encontrado.", 404);
    }

    const historico = await prisma.$queryRawUnsafe<HistoricoRow[]>(
      `
      SELECT
        h.id,
        h.disponibilidade_veiculo_id,
        h.acao,
        h.antes_json,
        h.depois_json,
        h.usuario_nome,
        h.criado_em
      FROM controle_veiculos_disponibilidade_historico h
      WHERE h.disponibilidade_veiculo_id = $1
      ORDER BY h.criado_em DESC, h.id DESC
      `,
      BigInt(id)
    );

    return {
      disponibilidade: this.mapRow(row),
      historico: historico.map((item) => this.mapHistorico(item))
    };
  }

  async criar(input: DisponibilidadeVeiculoInput, tenantId: string, usuario?: { id?: bigint; nome?: string | null }) {
    await this.garantirEstrutura();
    return prisma.$transaction(async (tx) => {
      await this.travarVeiculo(tenantId, input.veiculoId);
      await this.buscarVeiculoAtivoOuFalhar(tenantId, input.veiculoId);

      const inicio = new Date(input.dataHoraInicio);
      const fim = new Date(input.dataHoraFim);
      const conflito = await this.buscarConflito(tenantId, input.veiculoId, inicio, fim);
      if (conflito) {
        throw new AppError(
          `Não foi possível concluir o lançamento. Este veículo já possui uma reserva ou indisponibilidade no período informado. Situação existente: ${conflito.tipo_situacao === "INDISPONIVEL" ? "Indisponível" : "Reservado"}.`,
          409
        );
      }

      const rows = await tx.$queryRawUnsafe<DisponibilidadeBaseRow[]>(
        `
        INSERT INTO controle_veiculos_disponibilidade (
          tenant_id,
          veiculo_id,
          tipo_situacao,
          data_hora_inicio,
          data_hora_fim,
          motivo,
          motivo_detalhado,
          destino,
          responsavel_nome,
          observacoes,
          status_registro,
          criado_por_usuario_id,
          criado_por_nome,
          alterado_por_usuario_id,
          alterado_por_nome,
          criado_em,
          alterado_em,
          version
        ) VALUES (
          $1::uuid,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          'ATIVO',
          $11,
          $12,
          $11,
          $12,
          NOW(),
          NOW(),
          1
        )
        RETURNING *
        `,
        tenantId,
        BigInt(input.veiculoId),
        input.tipoSituacao,
        inicio,
        fim,
        input.motivo ?? null,
        input.motivoDetalhado ?? null,
        input.destino ?? null,
        input.responsavelNome ?? null,
        input.observacoes ?? null,
        usuario?.id ?? null,
        usuario?.nome ?? null
      );

      const salvo = rows[0];
      if (!salvo) throw new AppError("Não foi possível salvar a disponibilidade.", 500);
      await this.registrarHistorico(tx, salvo.id, "CRIADO", null, this.mapRow(salvo), usuario?.id, usuario?.nome);
      return this.mapRow(salvo);
    });
  }

  async atualizar(
    id: number,
    input: DisponibilidadeVeiculoInput,
    tenantId: string,
    usuario?: { id?: bigint; nome?: string | null }
  ) {
    await this.garantirEstrutura();
    return prisma.$transaction(async (tx) => {
      await this.travarVeiculo(tenantId, input.veiculoId);
      await this.buscarVeiculoAtivoOuFalhar(tenantId, input.veiculoId);

      const atual = await this.obterPorId(id, tenantId);
      const conflito = await this.buscarConflito(
        tenantId,
        input.veiculoId,
        new Date(input.dataHoraInicio),
        new Date(input.dataHoraFim),
        id
      );
      if (conflito) {
        throw new AppError(
          `Não foi possível concluir o lançamento. Este veículo já possui uma reserva ou indisponibilidade no período informado. Situação existente: ${conflito.tipo_situacao === "INDISPONIVEL" ? "Indisponível" : "Reservado"}.`,
          409
        );
      }

      const rows = await tx.$queryRawUnsafe<DisponibilidadeBaseRow[]>(
        `
        UPDATE controle_veiculos_disponibilidade
        SET
          veiculo_id = $2,
          tipo_situacao = $3,
          data_hora_inicio = $4,
          data_hora_fim = $5,
          motivo = $6,
          motivo_detalhado = $7,
          destino = $8,
          responsavel_nome = $9,
          observacoes = $10,
          status_registro = COALESCE(status_registro, 'ATIVO'),
          alterado_por_usuario_id = $11,
          alterado_por_nome = $12,
          alterado_em = NOW(),
          version = COALESCE(version, 1) + 1
        WHERE tenant_id::text = $1
          AND id = $13
        RETURNING *
        `,
        tenantId,
        BigInt(input.veiculoId),
        input.tipoSituacao,
        new Date(input.dataHoraInicio),
        new Date(input.dataHoraFim),
        input.motivo ?? null,
        input.motivoDetalhado ?? null,
        input.destino ?? null,
        input.responsavelNome ?? null,
        input.observacoes ?? null,
        usuario?.id ?? null,
        usuario?.nome ?? null,
        BigInt(id)
      );

      const salvo = rows[0];
      if (!salvo) throw new AppError("Não foi possível atualizar a disponibilidade.", 500);
      await this.registrarHistorico(tx, salvo.id, "ATUALIZADO", atual, this.mapRow(salvo), usuario?.id, usuario?.nome);
      return this.mapRow(salvo);
    });
  }

  async cancelar(id: number, tenantId: string, motivoCancelamento: string, usuario?: { id?: bigint; nome?: string | null }) {
    await this.garantirEstrutura();
    return prisma.$transaction(async (tx) => {
      const atual = await this.obterPorId(id, tenantId);
      const rows = await tx.$queryRawUnsafe<DisponibilidadeBaseRow[]>(
        `
        UPDATE controle_veiculos_disponibilidade
        SET
          status_registro = 'CANCELADO',
          cancelado_por_usuario_id = $2,
          cancelado_por_nome = $3,
          cancelado_em = NOW(),
          motivo_cancelamento = $4,
          alterado_por_usuario_id = $2,
          alterado_por_nome = $3,
          alterado_em = NOW(),
          version = COALESCE(version, 1) + 1
        WHERE tenant_id::text = $1
          AND id = $5
          AND status_registro = 'ATIVO'
        RETURNING *
        `,
        tenantId,
        usuario?.id ?? null,
        usuario?.nome ?? null,
        motivoCancelamento,
        BigInt(id)
      );
      const salvo = rows[0];
      if (!salvo) throw new AppError("Não foi possível cancelar o registro.", 500);
      await this.registrarHistorico(tx, salvo.id, "CANCELADO", atual, this.mapRow(salvo), usuario?.id, usuario?.nome);
      return this.mapRow(salvo);
    });
  }

  async encerrar(id: number, tenantId: string, usuario?: { id?: bigint; nome?: string | null }) {
    await this.garantirEstrutura();
    return prisma.$transaction(async (tx) => {
      const atual = await this.obterPorId(id, tenantId);
      const rows = await tx.$queryRawUnsafe<DisponibilidadeBaseRow[]>(
        `
        UPDATE controle_veiculos_disponibilidade
        SET
          status_registro = 'ENCERRADO',
          alterado_por_usuario_id = $2,
          alterado_por_nome = $3,
          alterado_em = NOW(),
          version = COALESCE(version, 1) + 1
        WHERE tenant_id::text = $1
          AND id = $4
          AND status_registro = 'ATIVO'
        RETURNING *
        `,
        tenantId,
        usuario?.id ?? null,
        usuario?.nome ?? null,
        BigInt(id)
      );
      const salvo = rows[0];
      if (!salvo) throw new AppError("Não foi possível encerrar o registro.", 500);
      await this.registrarHistorico(tx, salvo.id, "ENCERRADO", atual, this.mapRow(salvo), usuario?.id, usuario?.nome);
      return this.mapRow(salvo);
    });
  }

  async excluir(id: number, tenantId: string, usuario?: { id?: bigint; nome?: string | null }) {
    await this.garantirEstrutura();
    return prisma.$transaction(async (tx) => {
      const atual = await this.obterPorId(id, tenantId);
      const rows = await tx.$queryRawUnsafe<DisponibilidadeBaseRow[]>(
        `
        UPDATE controle_veiculos_disponibilidade
        SET
          status_registro = 'EXCLUIDO_LOGICAMENTE',
          alterado_por_usuario_id = $2,
          alterado_por_nome = $3,
          alterado_em = NOW(),
          version = COALESCE(version, 1) + 1
        WHERE tenant_id::text = $1
          AND id = $4
          AND status_registro <> 'EXCLUIDO_LOGICAMENTE'
        RETURNING *
        `,
        tenantId,
        usuario?.id ?? null,
        usuario?.nome ?? null,
        BigInt(id)
      );
      const salvo = rows[0];
      if (!salvo) throw new AppError("Não foi possível excluir o registro.", 500);
      await this.registrarHistorico(tx, salvo.id, "EXCLUIDO_LOGICAMENTE", atual, this.mapRow(salvo), usuario?.id, usuario?.nome);
      return this.mapRow(salvo);
    });
  }

  async consultarDisponibilidade(tenantId: string, consulta: DisponibilidadeVeiculoConsultaInput) {
    await this.garantirEstrutura();
    const inicio = new Date(consulta.dataHoraInicio);
    const fim = new Date(consulta.dataHoraFim);

    const veiculos = await prisma.$queryRawUnsafe<VeiculoBaseRow[]>(
      `
      SELECT id, placa, modelo, marca, ativo
      FROM controle_veiculos
      WHERE tenant_id::text = $1
        AND COALESCE(ativo, TRUE) = TRUE
      ORDER BY placa ASC NULLS LAST, modelo ASC NULLS LAST, id ASC
      `,
      tenantId
    );

    const registros = await prisma.$queryRawUnsafe<DisponibilidadeBaseRow[]>(
      `
      SELECT
        d.*,
        v.placa,
        v.modelo,
        v.marca,
        v.ativo AS veiculo_ativo
      FROM controle_veiculos_disponibilidade d
      INNER JOIN controle_veiculos v ON v.id = d.veiculo_id
      WHERE d.tenant_id::text = $1
        AND d.status_registro = 'ATIVO'
        AND d.data_hora_inicio < $3
        AND d.data_hora_fim > $2
      ORDER BY d.data_hora_inicio ASC, d.id ASC
      `,
      tenantId,
      inicio,
      fim
    );

    const porVeiculo = new Map<number, DisponibilidadeBaseRow[]>();
    for (const registro of registros) {
      const veiculoId = Number(registro.veiculo_id);
      const grupo = porVeiculo.get(veiculoId) ?? [];
      grupo.push(registro);
      porVeiculo.set(veiculoId, grupo);
    }

    return veiculos.map((veiculo) => {
      const bloqueios = porVeiculo.get(Number(veiculo.id)) ?? [];
      const intervalos = bloqueios.map((item) => ({
        inicio: new Date(item.data_hora_inicio),
        fim: new Date(item.data_hora_fim),
        tipoSituacao: item.tipo_situacao
      }));
      const mesclados = mesclarIntervalos(intervalos);
      const bloqueioAtual = bloqueios[0] ?? null;
      const ativo = veiculo.ativo !== false;
      const temIndisponivel = bloqueios.some((item) => item.tipo_situacao === "INDISPONIVEL");
      const temReservado = bloqueios.some((item) => item.tipo_situacao === "RESERVADO");
      const situacao = temIndisponivel ? "INDISPONIVEL" : temReservado ? "RESERVADO" : "DISPONIVEL";
      const status = !ativo
        ? "INDISPONIVEL"
        : bloqueios.length
          ? situacao
          : "DISPONIVEL";
      const proximaLiberacao = mesclados.length ? mesclados[mesclados.length - 1].fim : null;

      return {
        veiculoId: Number(veiculo.id),
        placa: veiculo.placa,
        modelo: veiculo.modelo,
        marca: veiculo.marca,
        situacao: status,
        ativo,
        bloqueios: bloqueios.map((item) => this.mapRow(item)),
        proximaLiberacao: proximaLiberacao ? paraIso(proximaLiberacao) : null
      };
    });
  }

  async resumoDisponibilidade(tenantId: string, consulta: DisponibilidadeVeiculoConsultaInput) {
    const itens = await this.consultarDisponibilidade(tenantId, consulta);
    const total = itens.length;
    const disponiveis = itens.filter((item) => item.situacao === "DISPONIVEL").length;
    const reservados = itens.filter((item) => item.situacao === "RESERVADO").length;
    const indisponiveis = itens.filter((item) => item.situacao === "INDISPONIVEL").length;
    return { total, disponiveis, reservados, indisponiveis, itens };
  }

  async agendaVeiculo(tenantId: string, veiculoId: number, inicio: Date, fim: Date) {
    await this.garantirEstrutura();
    await this.buscarVeiculoAtivoOuFalhar(tenantId, veiculoId);
    const rows = await prisma.$queryRawUnsafe<DisponibilidadeBaseRow[]>(
      `
      SELECT
        d.*,
        v.placa,
        v.modelo,
        v.marca,
        v.ativo AS veiculo_ativo
      FROM controle_veiculos_disponibilidade d
      INNER JOIN controle_veiculos v ON v.id = d.veiculo_id
      WHERE d.tenant_id::text = $1
        AND d.veiculo_id = $2
        AND d.status_registro <> 'EXCLUIDO_LOGICAMENTE'
        AND d.data_hora_inicio < $4
        AND d.data_hora_fim > $3
      ORDER BY d.data_hora_inicio ASC, d.id ASC
      `,
      tenantId,
      BigInt(veiculoId),
      inicio,
      fim
    );
    return rows.map((row) => this.mapRow(row));
  }

  async proximaDisponibilidade(tenantId: string, veiculoId: number, referencia: Date) {
    await this.garantirEstrutura();
    await this.buscarVeiculoAtivoOuFalhar(tenantId, veiculoId);
    const rows = await prisma.$queryRawUnsafe<DisponibilidadeBaseRow[]>(
      `
      SELECT
        d.*,
        v.placa,
        v.modelo,
        v.marca,
        v.ativo AS veiculo_ativo
      FROM controle_veiculos_disponibilidade d
      INNER JOIN controle_veiculos v ON v.id = d.veiculo_id
      WHERE d.tenant_id::text = $1
        AND d.veiculo_id = $2
        AND d.status_registro = 'ATIVO'
        AND d.data_hora_fim > $3
      ORDER BY d.data_hora_inicio ASC, d.data_hora_fim ASC
      `,
      tenantId,
      BigInt(veiculoId),
      referencia
    );

    const intervalos = rows
      .filter((row) => row.data_hora_inicio < referencia || row.data_hora_inicio >= referencia)
      .map((row) => ({
        inicio: new Date(row.data_hora_inicio),
        fim: new Date(row.data_hora_fim),
        tipoSituacao: row.tipo_situacao
      }));
    const mesclados = mesclarIntervalos(intervalos).filter((item) => item.fim > referencia);
    const bloqueioAtual = mesclados[0] ?? null;

    return {
      disponivelEm: bloqueioAtual ? paraIso(bloqueioAtual.fim) : paraIso(referencia),
      situacaoAtual: bloqueioAtual?.tipoSituacao ?? "RESERVADO",
      bloqueios: rows.map((row) => this.mapRow(row))
    };
  }

  async listarVeiculosAtivos(tenantId: string) {
    await this.garantirEstrutura();
    const rows = await prisma.$queryRawUnsafe<VeiculoBaseRow[]>(
      `
      SELECT id, placa, modelo, marca, ativo
      FROM controle_veiculos
      WHERE tenant_id::text = $1
        AND COALESCE(ativo, TRUE) = TRUE
      ORDER BY placa ASC NULLS LAST, modelo ASC NULLS LAST, id ASC
      `,
      tenantId
    );

    return rows.map((row) => ({
      id: Number(row.id),
      placa: row.placa,
      modelo: row.modelo,
      marca: row.marca,
      ativo: row.ativo !== false,
      rotulo: formatarNomeVeiculo(row)
    }));
  }
}
