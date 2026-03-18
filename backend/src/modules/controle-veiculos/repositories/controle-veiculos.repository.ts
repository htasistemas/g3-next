import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { toOptionalDate, trimOrUndefined } from "../../../utils/string-utils.js";
import type {
  DiarioBordoInput,
  DiarioBordoRow,
  LocalDestinoInput,
  LocalDestinoRow,
  MotoristaAutorizadoInput,
  MotoristaAutorizadoRow,
  VeiculoInput,
  VeiculoRow
} from "../controle-veiculos.types.js";

function toOptionalTime(value?: string | null) {
  const texto = trimOrUndefined(value);
  return texto ? `${texto}:00` : null;
}

function calcularKmRodados(kmInicial?: number | null, kmFinal?: number | null) {
  if (kmInicial == null || kmFinal == null) return null;
  const diferenca = Number(kmFinal) - Number(kmInicial);
  return diferenca >= 0 ? diferenca : null;
}

function calcularMediaConsumo(
  kmRodados?: number | null,
  combustivelConsumidoLitros?: number | null
) {
  if (!kmRodados || !combustivelConsumidoLitros) return null;
  if (combustivelConsumidoLitros <= 0) return null;
  return Number((kmRodados / combustivelConsumidoLitros).toFixed(2));
}

const controleVeiculosEstruturaStatements = [
  "ALTER TABLE controle_veiculos ADD COLUMN IF NOT EXISTS cor VARCHAR(80)",
  `
    CREATE TABLE IF NOT EXISTS controle_veiculos_local_destino (
      id BIGSERIAL PRIMARY KEY,
      nome VARCHAR(160) NOT NULL,
      endereco VARCHAR(220),
      telefone VARCHAR(30),
      observacoes TEXT,
      ativo BOOLEAN NOT NULL DEFAULT TRUE,
      criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
      atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `,
  "ALTER TABLE controle_veiculos_local_destino ADD COLUMN IF NOT EXISTS telefone VARCHAR(30)",
  "ALTER TABLE controle_veiculos_diario ADD COLUMN IF NOT EXISTS data_saida DATE",
  "ALTER TABLE controle_veiculos_diario ADD COLUMN IF NOT EXISTS data_chegada DATE",
  "ALTER TABLE controle_veiculos_diario ADD COLUMN IF NOT EXISTS local_destino_id BIGINT",
  `
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'controle_veiculos_diario_local_destino_fk'
          AND table_name = 'controle_veiculos_diario'
      ) THEN
        ALTER TABLE controle_veiculos_diario
        ADD CONSTRAINT controle_veiculos_diario_local_destino_fk
        FOREIGN KEY (local_destino_id) REFERENCES controle_veiculos_local_destino(id);
      END IF;
    END $$;
  `,
  "CREATE INDEX IF NOT EXISTS controle_veiculos_diario_local_destino_idx ON controle_veiculos_diario(local_destino_id)",
  "CREATE INDEX IF NOT EXISTS controle_veiculos_local_destino_nome_idx ON controle_veiculos_local_destino(nome)"
] as const;

let ensureControleVeiculosEstruturaPromise: Promise<void> | null = null;

export async function ensureControleVeiculosEstrutura() {
  if (!ensureControleVeiculosEstruturaPromise) {
    ensureControleVeiculosEstruturaPromise = (async () => {
      for (const statement of controleVeiculosEstruturaStatements) {
        await prisma.$executeRawUnsafe(statement);
      }
    })().catch((error) => {
      ensureControleVeiculosEstruturaPromise = null;
      throw error;
    });
  }

  await ensureControleVeiculosEstruturaPromise;
}

export class ControleVeiculosRepository {
  private fontesMotoristasPromise: Promise<{
    tabelaProfissionais: "cadastro_profissional" | "cadastro_profissionais" | null;
    possuiVoluntarios: boolean;
  }> | null = null;

  private tratarErroPersistenciaVeiculo(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      const rawCode =
        typeof error.meta?.code === "string" ? error.meta.code : undefined;
      const rawMessage =
        typeof error.meta?.message === "string" ? error.meta.message : error.message;

      if ((error.code === "P2002" || (error.code === "P2010" && rawCode === "23505")) && /\bplaca\b/i.test(rawMessage)) {
        throw new AppError("Ja existe um veiculo cadastrado com esta placa.", 409);
      }
    }

    throw error;
  }

  private async obterFontesMotoristas() {
    if (!this.fontesMotoristasPromise) {
      this.fontesMotoristasPromise = prisma
        .$queryRaw<Array<{ table_name: string }>>(Prisma.sql`
          SELECT table_name
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_name IN ('cadastro_profissional', 'cadastro_profissionais', 'cadastro_voluntario')
        `)
        .then((rows) => {
          const tabelas = new Set(rows.map((row) => row.table_name));
          return {
            tabelaProfissionais: tabelas.has("cadastro_profissional")
              ? "cadastro_profissional"
              : tabelas.has("cadastro_profissionais")
                ? "cadastro_profissionais"
                : null,
            possuiVoluntarios: tabelas.has("cadastro_voluntario")
          };
        });
    }

    return this.fontesMotoristasPromise;
  }

  private async ensureEstrutura() {
    await ensureControleVeiculosEstrutura();
  }

  async listarVeiculos() {
    await this.ensureEstrutura();
    return prisma.$queryRaw<VeiculoRow[]>(Prisma.sql`
      SELECT
        id,
        placa,
        modelo,
        marca,
        cor,
        ano,
        tipo_combustivel,
        media_consumo_padrao::float8 AS media_consumo_padrao,
        capacidade_tanque_litros::float8 AS capacidade_tanque_litros,
        observacoes,
        ativo,
        foto_frente,
        foto_lateral_esquerda,
        foto_lateral_direita,
        foto_traseira,
        documento_veiculo_pdf
      FROM controle_veiculos
      ORDER BY modelo ASC NULLS LAST, placa ASC NULLS LAST, id DESC
    `);
  }

  async buscarVeiculoPorId(id: bigint) {
    await this.ensureEstrutura();
    const rows = await prisma.$queryRaw<VeiculoRow[]>(Prisma.sql`
      SELECT
        id,
        placa,
        modelo,
        marca,
        cor,
        ano,
        tipo_combustivel,
        media_consumo_padrao::float8 AS media_consumo_padrao,
        capacidade_tanque_litros::float8 AS capacidade_tanque_litros,
        observacoes,
        ativo,
        foto_frente,
        foto_lateral_esquerda,
        foto_lateral_direita,
        foto_traseira,
        documento_veiculo_pdf
      FROM controle_veiculos
      WHERE id = ${id}
      LIMIT 1
    `);
    return rows[0] ?? null;
  }

  async buscarVeiculoPorIdOuFalhar(id: bigint) {
    const registro = await this.buscarVeiculoPorId(id);
    if (!registro) {
      throw new AppError("Veículo não encontrado.", 404);
    }
    return registro;
  }

  async criarVeiculo(input: VeiculoInput) {
    await this.ensureEstrutura();
    let inserted: Array<{ id: bigint }>;
    try {
      inserted = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
        INSERT INTO controle_veiculos (
          placa,
          modelo,
          marca,
          cor,
          ano,
          tipo_combustivel,
          media_consumo_padrao,
          capacidade_tanque_litros,
          observacoes,
          ativo,
          foto_frente,
          foto_lateral_esquerda,
          foto_lateral_direita,
          foto_traseira,
          documento_veiculo_pdf,
          criado_em,
          atualizado_em
        ) VALUES (
          ${trimOrUndefined(input.placa)},
          ${trimOrUndefined(input.modelo)},
          ${trimOrUndefined(input.marca)},
          ${trimOrUndefined(input.cor)},
          ${input.ano ?? null},
          ${trimOrUndefined(input.tipoCombustivel)},
          ${input.mediaConsumoPadrao ?? null},
          ${input.capacidadeTanqueLitros ?? null},
          ${trimOrUndefined(input.observacoes ?? undefined)},
          ${input.ativo ?? true},
          ${trimOrUndefined(input.fotoFrente ?? undefined)},
          ${trimOrUndefined(input.fotoLateralEsquerda ?? undefined)},
          ${trimOrUndefined(input.fotoLateralDireita ?? undefined)},
          ${trimOrUndefined(input.fotoTraseira ?? undefined)},
          ${trimOrUndefined(input.documentoVeiculoPdf ?? undefined)},
          NOW(),
          NOW()
        )
        RETURNING id
      `);
    } catch (error) {
      this.tratarErroPersistenciaVeiculo(error);
    }

    const id = inserted[0]?.id;
    if (!id) {
      throw new AppError("Não foi possível criar o veículo.", 500);
    }
    return this.buscarVeiculoPorIdOuFalhar(id);
  }

  async atualizarVeiculo(id: bigint, input: VeiculoInput) {
    await this.ensureEstrutura();
    await this.buscarVeiculoPorIdOuFalhar(id);
    try {
      await prisma.$executeRaw(Prisma.sql`
        UPDATE controle_veiculos
        SET
          placa = ${trimOrUndefined(input.placa)},
          modelo = ${trimOrUndefined(input.modelo)},
          marca = ${trimOrUndefined(input.marca)},
          cor = ${trimOrUndefined(input.cor)},
          ano = ${input.ano ?? null},
          tipo_combustivel = ${trimOrUndefined(input.tipoCombustivel)},
          media_consumo_padrao = ${input.mediaConsumoPadrao ?? null},
          capacidade_tanque_litros = ${input.capacidadeTanqueLitros ?? null},
          observacoes = ${trimOrUndefined(input.observacoes ?? undefined)},
          ativo = ${input.ativo ?? true},
          foto_frente = ${trimOrUndefined(input.fotoFrente ?? undefined)},
          foto_lateral_esquerda = ${trimOrUndefined(input.fotoLateralEsquerda ?? undefined)},
          foto_lateral_direita = ${trimOrUndefined(input.fotoLateralDireita ?? undefined)},
          foto_traseira = ${trimOrUndefined(input.fotoTraseira ?? undefined)},
          documento_veiculo_pdf = ${trimOrUndefined(input.documentoVeiculoPdf ?? undefined)},
          atualizado_em = NOW()
        WHERE id = ${id}
      `);
    } catch (error) {
      this.tratarErroPersistenciaVeiculo(error);
    }
    return this.buscarVeiculoPorIdOuFalhar(id);
  }

  async removerVeiculo(id: bigint) {
    await this.ensureEstrutura();
    await this.buscarVeiculoPorIdOuFalhar(id);
    await prisma.$executeRaw(Prisma.sql`
      DELETE FROM controle_veiculos
      WHERE id = ${id}
    `);
  }

  async listarDiario() {
    await this.ensureEstrutura();
    return prisma.$queryRaw<DiarioBordoRow[]>(Prisma.sql`
      SELECT
        d.id,
        d.veiculo_id,
        d.data,
        d.data_saida,
        d.data_chegada,
        d.condutor,
        d.horario_saida,
        d.km_inicial::float8 AS km_inicial,
        d.horario_chegada,
        d.km_final::float8 AS km_final,
        d.local_destino_id,
        ld.nome AS local_destino_nome,
        d.destino,
        d.combustivel_consumido_litros::float8 AS combustivel_consumido_litros,
        d.km_rodados::float8 AS km_rodados,
        d.media_consumo::float8 AS media_consumo,
        d.observacoes
      FROM controle_veiculos_diario d
      LEFT JOIN controle_veiculos_local_destino ld ON ld.id = d.local_destino_id
      ORDER BY d.data DESC NULLS LAST, d.id DESC
    `);
  }

  async buscarDiarioPorId(id: bigint) {
    await this.ensureEstrutura();
    const rows = await prisma.$queryRaw<DiarioBordoRow[]>(Prisma.sql`
      SELECT
        d.id,
        d.veiculo_id,
        d.data,
        d.data_saida,
        d.data_chegada,
        d.condutor,
        d.horario_saida,
        d.km_inicial::float8 AS km_inicial,
        d.horario_chegada,
        d.km_final::float8 AS km_final,
        d.local_destino_id,
        ld.nome AS local_destino_nome,
        d.destino,
        d.combustivel_consumido_litros::float8 AS combustivel_consumido_litros,
        d.km_rodados::float8 AS km_rodados,
        d.media_consumo::float8 AS media_consumo,
        d.observacoes
      FROM controle_veiculos_diario d
      LEFT JOIN controle_veiculos_local_destino ld ON ld.id = d.local_destino_id
      WHERE d.id = ${id}
      LIMIT 1
    `);
    return rows[0] ?? null;
  }

  async buscarDiarioPorIdOuFalhar(id: bigint) {
    const registro = await this.buscarDiarioPorId(id);
    if (!registro) {
      throw new AppError("Registro de diário de bordo não encontrado.", 404);
    }
    return registro;
  }

  async criarDiario(input: DiarioBordoInput) {
    await this.ensureEstrutura();
    const kmRodados = calcularKmRodados(input.kmInicial, input.kmFinal);
    const mediaConsumo = calcularMediaConsumo(kmRodados, input.combustivelConsumidoLitros);
    const inserted = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
      INSERT INTO controle_veiculos_diario (
        veiculo_id,
        data,
        data_saida,
        data_chegada,
        condutor,
        horario_saida,
        km_inicial,
        horario_chegada,
        km_final,
        local_destino_id,
        destino,
        combustivel_consumido_litros,
        km_rodados,
        media_consumo,
        observacoes,
        criado_em,
        atualizado_em
      ) VALUES (
        ${input.veiculoId ? BigInt(input.veiculoId) : null},
        ${toOptionalDate(input.data ?? input.dataSaida ?? undefined)},
        ${toOptionalDate(input.dataSaida ?? input.data ?? undefined)},
        ${toOptionalDate(input.dataChegada ?? undefined)},
        ${trimOrUndefined(input.condutor ?? undefined)},
        CAST(${toOptionalTime(input.horarioSaida ?? undefined)} AS TIME),
        ${input.kmInicial ?? null},
        CAST(${toOptionalTime(input.horarioChegada ?? undefined)} AS TIME),
        ${input.kmFinal ?? null},
        ${input.localDestinoId ? BigInt(input.localDestinoId) : null},
        ${trimOrUndefined(input.destino ?? undefined)},
        ${input.combustivelConsumidoLitros ?? null},
        ${kmRodados},
        ${mediaConsumo},
        ${trimOrUndefined(input.observacoes ?? undefined)},
        NOW(),
        NOW()
      )
      RETURNING id
    `);

    const id = inserted[0]?.id;
    if (!id) {
      throw new AppError("Não foi possível criar o registro de diário.", 500);
    }
    return this.buscarDiarioPorIdOuFalhar(id);
  }

  async atualizarDiario(id: bigint, input: DiarioBordoInput) {
    await this.ensureEstrutura();
    await this.buscarDiarioPorIdOuFalhar(id);
    const kmRodados = calcularKmRodados(input.kmInicial, input.kmFinal);
    const mediaConsumo = calcularMediaConsumo(kmRodados, input.combustivelConsumidoLitros);

    await prisma.$executeRaw(Prisma.sql`
      UPDATE controle_veiculos_diario
      SET
        veiculo_id = ${input.veiculoId ? BigInt(input.veiculoId) : null},
        data = ${toOptionalDate(input.data ?? input.dataSaida ?? undefined)},
        data_saida = ${toOptionalDate(input.dataSaida ?? input.data ?? undefined)},
        data_chegada = ${toOptionalDate(input.dataChegada ?? undefined)},
        condutor = ${trimOrUndefined(input.condutor ?? undefined)},
        horario_saida = CAST(${toOptionalTime(input.horarioSaida ?? undefined)} AS TIME),
        km_inicial = ${input.kmInicial ?? null},
        horario_chegada = CAST(${toOptionalTime(input.horarioChegada ?? undefined)} AS TIME),
        km_final = ${input.kmFinal ?? null},
        local_destino_id = ${input.localDestinoId ? BigInt(input.localDestinoId) : null},
        destino = ${trimOrUndefined(input.destino ?? undefined)},
        combustivel_consumido_litros = ${input.combustivelConsumidoLitros ?? null},
        km_rodados = ${kmRodados},
        media_consumo = ${mediaConsumo},
        observacoes = ${trimOrUndefined(input.observacoes ?? undefined)},
        atualizado_em = NOW()
      WHERE id = ${id}
    `);

    return this.buscarDiarioPorIdOuFalhar(id);
  }

  async removerDiario(id: bigint) {
    await this.ensureEstrutura();
    await this.buscarDiarioPorIdOuFalhar(id);
    await prisma.$executeRaw(Prisma.sql`
      DELETE FROM controle_veiculos_diario
      WHERE id = ${id}
    `);
  }

  async listarMotoristasDisponiveis(nome?: string) {
    await this.ensureEstrutura();
    const termo = trimOrUndefined(nome);
    const { tabelaProfissionais, possuiVoluntarios } = await this.obterFontesMotoristas();
    const fontes: string[] = [];

    if (tabelaProfissionais) {
      fontes.push(
        `SELECT id, 'PROFISSIONAL'::text AS tipo_origem, nome_completo AS nome FROM ${tabelaProfissionais}`
      );
    }

    if (possuiVoluntarios) {
      fontes.push(
        "SELECT id, 'VOLUNTARIO'::text AS tipo_origem, nome_completo AS nome FROM cadastro_voluntario"
      );
    }

    if (!fontes.length) {
      return [];
    }

    const sql = `
      SELECT *
      FROM (${fontes.join(" UNION ALL ")}) motoristas
      ${termo ? "WHERE nome ILIKE $1" : ""}
      ORDER BY nome ASC
      LIMIT 30
    `;

    return termo
      ? prisma.$queryRawUnsafe<Array<{ id: bigint; tipo_origem: string; nome: string }>>(
          sql,
          `%${termo}%`
        )
      : prisma.$queryRawUnsafe<Array<{ id: bigint; tipo_origem: string; nome: string }>>(sql);
  }

  async listarMotoristasAutorizados(veiculoId?: number | null) {
    await this.ensureEstrutura();
    const filtroVeiculo = veiculoId
      ? Prisma.sql`AND ma.veiculo_id = ${BigInt(veiculoId)}`
      : Prisma.empty;

    return prisma.$queryRaw<MotoristaAutorizadoRow[]>(Prisma.sql`
      SELECT
        ma.id,
        ma.veiculo_id,
        v.placa AS placa_veiculo,
        v.modelo AS modelo_veiculo,
        ma.tipo_origem,
        ma.profissional_id,
        ma.voluntario_id,
        ma.nome_motorista,
        ma.numero_carteira,
        ma.categoria_carteira,
        ma.vencimento_carteira,
        ma.arquivo_carteira_pdf
      FROM controle_veiculos_motoristas_autorizados ma
      INNER JOIN controle_veiculos v ON v.id = ma.veiculo_id
      WHERE 1 = 1
      ${filtroVeiculo}
      ORDER BY ma.nome_motorista ASC, ma.id DESC
    `);
  }

  async buscarMotoristaAutorizadoPorId(id: bigint) {
    await this.ensureEstrutura();
    const rows = await prisma.$queryRaw<MotoristaAutorizadoRow[]>(Prisma.sql`
      SELECT
        ma.id,
        ma.veiculo_id,
        v.placa AS placa_veiculo,
        v.modelo AS modelo_veiculo,
        ma.tipo_origem,
        ma.profissional_id,
        ma.voluntario_id,
        ma.nome_motorista,
        ma.numero_carteira,
        ma.categoria_carteira,
        ma.vencimento_carteira,
        ma.arquivo_carteira_pdf
      FROM controle_veiculos_motoristas_autorizados ma
      INNER JOIN controle_veiculos v ON v.id = ma.veiculo_id
      WHERE ma.id = ${id}
      LIMIT 1
    `);
    return rows[0] ?? null;
  }

  async buscarMotoristaAutorizadoPorIdOuFalhar(id: bigint) {
    const registro = await this.buscarMotoristaAutorizadoPorId(id);
    if (!registro) {
      throw new AppError("Motorista autorizado não encontrado.", 404);
    }
    return registro;
  }

  async criarMotoristaAutorizado(input: MotoristaAutorizadoInput) {
    await this.ensureEstrutura();
    await this.buscarVeiculoPorIdOuFalhar(BigInt(input.veiculoId));
    const nomeMotorista = await this.buscarNomeMotorista(input.tipoOrigem, input.motoristaId);

    const inserted = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
      INSERT INTO controle_veiculos_motoristas_autorizados (
        veiculo_id,
        tipo_origem,
        profissional_id,
        voluntario_id,
        nome_motorista,
        numero_carteira,
        categoria_carteira,
        vencimento_carteira,
        arquivo_carteira_pdf,
        criado_em,
        atualizado_em
      ) VALUES (
        ${BigInt(input.veiculoId)},
        ${input.tipoOrigem},
        ${input.tipoOrigem === "PROFISSIONAL" ? BigInt(input.motoristaId) : null},
        ${input.tipoOrigem === "VOLUNTARIO" ? BigInt(input.motoristaId) : null},
        ${nomeMotorista},
        ${trimOrUndefined(input.numeroCarteira ?? undefined)},
        ${trimOrUndefined(input.categoriaCarteira ?? undefined)},
        ${toOptionalDate(input.vencimentoCarteira ?? undefined)},
        ${trimOrUndefined(input.arquivoCarteiraPdf ?? undefined)},
        NOW(),
        NOW()
      )
      RETURNING id
    `);

    const id = inserted[0]?.id;
    if (!id) {
      throw new AppError("Não foi possível criar o motorista autorizado.", 500);
    }
    return this.buscarMotoristaAutorizadoPorIdOuFalhar(id);
  }

  async atualizarMotoristaAutorizado(id: bigint, input: MotoristaAutorizadoInput) {
    await this.ensureEstrutura();
    await this.buscarMotoristaAutorizadoPorIdOuFalhar(id);
    await this.buscarVeiculoPorIdOuFalhar(BigInt(input.veiculoId));
    const nomeMotorista = await this.buscarNomeMotorista(input.tipoOrigem, input.motoristaId);

    await prisma.$executeRaw(Prisma.sql`
      UPDATE controle_veiculos_motoristas_autorizados
      SET
        veiculo_id = ${BigInt(input.veiculoId)},
        tipo_origem = ${input.tipoOrigem},
        profissional_id = ${input.tipoOrigem === "PROFISSIONAL" ? BigInt(input.motoristaId) : null},
        voluntario_id = ${input.tipoOrigem === "VOLUNTARIO" ? BigInt(input.motoristaId) : null},
        nome_motorista = ${nomeMotorista},
        numero_carteira = ${trimOrUndefined(input.numeroCarteira ?? undefined)},
        categoria_carteira = ${trimOrUndefined(input.categoriaCarteira ?? undefined)},
        vencimento_carteira = ${toOptionalDate(input.vencimentoCarteira ?? undefined)},
        arquivo_carteira_pdf = ${trimOrUndefined(input.arquivoCarteiraPdf ?? undefined)},
        atualizado_em = NOW()
      WHERE id = ${id}
    `);

    return this.buscarMotoristaAutorizadoPorIdOuFalhar(id);
  }

  async removerMotoristaAutorizado(id: bigint) {
    await this.ensureEstrutura();
    await this.buscarMotoristaAutorizadoPorIdOuFalhar(id);
    await prisma.$executeRaw(Prisma.sql`
      DELETE FROM controle_veiculos_motoristas_autorizados
      WHERE id = ${id}
    `);
  }

  async listarLocaisDestino() {
    await this.ensureEstrutura();
    return prisma.$queryRaw<LocalDestinoRow[]>(Prisma.sql`
      SELECT
        id,
        nome,
        endereco,
        telefone,
        observacoes,
        ativo,
        criado_em,
        atualizado_em
      FROM controle_veiculos_local_destino
      ORDER BY ativo DESC, nome ASC, id DESC
    `);
  }

  async buscarLocalDestinoPorId(id: bigint) {
    await this.ensureEstrutura();
    const rows = await prisma.$queryRaw<LocalDestinoRow[]>(Prisma.sql`
      SELECT
        id,
        nome,
        endereco,
        telefone,
        observacoes,
        ativo,
        criado_em,
        atualizado_em
      FROM controle_veiculos_local_destino
      WHERE id = ${id}
      LIMIT 1
    `);
    return rows[0] ?? null;
  }

  async buscarLocalDestinoPorIdOuFalhar(id: bigint) {
    const registro = await this.buscarLocalDestinoPorId(id);
    if (!registro) {
      throw new AppError("Local de destino nao encontrado.", 404);
    }
    return registro;
  }

  async criarLocalDestino(input: LocalDestinoInput) {
    await this.ensureEstrutura();
    const inserted = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
      INSERT INTO controle_veiculos_local_destino (
        nome,
        endereco,
        telefone,
        observacoes,
        ativo,
        criado_em,
        atualizado_em
      ) VALUES (
        ${trimOrUndefined(input.nome ?? undefined)},
        ${trimOrUndefined(input.endereco ?? undefined)},
        ${trimOrUndefined(input.telefone ?? undefined)},
        ${trimOrUndefined(input.observacoes ?? undefined)},
        ${input.ativo ?? true},
        NOW(),
        NOW()
      )
      RETURNING id
    `);

    const id = inserted[0]?.id;
    if (!id) {
      throw new AppError("Nao foi possivel criar o local de destino.", 500);
    }
    return this.buscarLocalDestinoPorIdOuFalhar(id);
  }

  async atualizarLocalDestino(id: bigint, input: LocalDestinoInput) {
    await this.ensureEstrutura();
    await this.buscarLocalDestinoPorIdOuFalhar(id);
    await prisma.$executeRaw(Prisma.sql`
      UPDATE controle_veiculos_local_destino
      SET
        nome = ${trimOrUndefined(input.nome ?? undefined)},
        endereco = ${trimOrUndefined(input.endereco ?? undefined)},
        telefone = ${trimOrUndefined(input.telefone ?? undefined)},
        observacoes = ${trimOrUndefined(input.observacoes ?? undefined)},
        ativo = ${input.ativo ?? true},
        atualizado_em = NOW()
      WHERE id = ${id}
    `);
    return this.buscarLocalDestinoPorIdOuFalhar(id);
  }

  async removerLocalDestino(id: bigint) {
    await this.ensureEstrutura();
    await this.buscarLocalDestinoPorIdOuFalhar(id);
    await prisma.$executeRaw(Prisma.sql`
      UPDATE controle_veiculos_diario
      SET local_destino_id = NULL
      WHERE local_destino_id = ${id}
    `);
    await prisma.$executeRaw(Prisma.sql`
      DELETE FROM controle_veiculos_local_destino
      WHERE id = ${id}
    `);
  }

  private async buscarNomeMotorista(tipoOrigem: "PROFISSIONAL" | "VOLUNTARIO", motoristaId: number) {
    if (tipoOrigem === "PROFISSIONAL") {
      const rows = await prisma.$queryRaw<Array<{ nome_completo: string }>>(Prisma.sql`
        SELECT nome_completo
        FROM cadastro_profissional
        WHERE id = ${BigInt(motoristaId)}
        LIMIT 1
      `);
      if (!rows.length) {
        throw new AppError("Profissional não encontrado para vínculo.", 404);
      }
      return rows[0].nome_completo;
    }

    const rows = await prisma.$queryRaw<Array<{ nome_completo: string }>>(Prisma.sql`
      SELECT nome_completo
      FROM cadastro_voluntario
      WHERE id = ${BigInt(motoristaId)}
      LIMIT 1
    `);
    if (!rows.length) {
      throw new AppError("Voluntário não encontrado para vínculo.", 404);
    }
    return rows[0].nome_completo;
  }
}
