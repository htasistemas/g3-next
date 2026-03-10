import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { toOptionalDate, trimOrUndefined } from "../../../utils/string-utils.js";
import type {
  DiarioBordoInput,
  DiarioBordoRow,
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

export class ControleVeiculosRepository {
  private fontesMotoristasPromise: Promise<{
    tabelaProfissionais: "cadastro_profissional" | "cadastro_profissionais" | null;
    possuiVoluntarios: boolean;
  }> | null = null;

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

  async listarVeiculos() {
    return prisma.$queryRaw<VeiculoRow[]>(Prisma.sql`
      SELECT
        id,
        placa,
        modelo,
        marca,
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
    const rows = await prisma.$queryRaw<VeiculoRow[]>(Prisma.sql`
      SELECT
        id,
        placa,
        modelo,
        marca,
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
    const inserted = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
      INSERT INTO controle_veiculos (
        placa,
        modelo,
        marca,
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

    const id = inserted[0]?.id;
    if (!id) {
      throw new AppError("Não foi possível criar o veículo.", 500);
    }
    return this.buscarVeiculoPorIdOuFalhar(id);
  }

  async atualizarVeiculo(id: bigint, input: VeiculoInput) {
    await this.buscarVeiculoPorIdOuFalhar(id);
    await prisma.$executeRaw(Prisma.sql`
      UPDATE controle_veiculos
      SET
        placa = ${trimOrUndefined(input.placa)},
        modelo = ${trimOrUndefined(input.modelo)},
        marca = ${trimOrUndefined(input.marca)},
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
    return this.buscarVeiculoPorIdOuFalhar(id);
  }

  async removerVeiculo(id: bigint) {
    await this.buscarVeiculoPorIdOuFalhar(id);
    await prisma.$executeRaw(Prisma.sql`
      DELETE FROM controle_veiculos
      WHERE id = ${id}
    `);
  }

  async listarDiario() {
    return prisma.$queryRaw<DiarioBordoRow[]>(Prisma.sql`
      SELECT
        id,
        veiculo_id,
        data,
        condutor,
        horario_saida,
        km_inicial::float8 AS km_inicial,
        horario_chegada,
        km_final::float8 AS km_final,
        destino,
        combustivel_consumido_litros::float8 AS combustivel_consumido_litros,
        km_rodados::float8 AS km_rodados,
        media_consumo::float8 AS media_consumo,
        observacoes
      FROM controle_veiculos_diario
      ORDER BY data DESC NULLS LAST, id DESC
    `);
  }

  async buscarDiarioPorId(id: bigint) {
    const rows = await prisma.$queryRaw<DiarioBordoRow[]>(Prisma.sql`
      SELECT
        id,
        veiculo_id,
        data,
        condutor,
        horario_saida,
        km_inicial::float8 AS km_inicial,
        horario_chegada,
        km_final::float8 AS km_final,
        destino,
        combustivel_consumido_litros::float8 AS combustivel_consumido_litros,
        km_rodados::float8 AS km_rodados,
        media_consumo::float8 AS media_consumo,
        observacoes
      FROM controle_veiculos_diario
      WHERE id = ${id}
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
    const kmRodados = calcularKmRodados(input.kmInicial, input.kmFinal);
    const mediaConsumo = calcularMediaConsumo(kmRodados, null);
    const inserted = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
      INSERT INTO controle_veiculos_diario (
        veiculo_id,
        data,
        condutor,
        horario_saida,
        km_inicial,
        horario_chegada,
        km_final,
        destino,
        combustivel_consumido_litros,
        km_rodados,
        media_consumo,
        observacoes,
        criado_em,
        atualizado_em
      ) VALUES (
        ${input.veiculoId ? BigInt(input.veiculoId) : null},
        ${toOptionalDate(input.data ?? undefined)},
        ${trimOrUndefined(input.condutor ?? undefined)},
        CAST(${toOptionalTime(input.horarioSaida ?? undefined)} AS TIME),
        ${input.kmInicial ?? null},
        CAST(${toOptionalTime(input.horarioChegada ?? undefined)} AS TIME),
        ${input.kmFinal ?? null},
        ${trimOrUndefined(input.destino ?? undefined)},
        NULL,
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
    await this.buscarDiarioPorIdOuFalhar(id);
    const kmRodados = calcularKmRodados(input.kmInicial, input.kmFinal);
    const mediaConsumo = calcularMediaConsumo(kmRodados, null);

    await prisma.$executeRaw(Prisma.sql`
      UPDATE controle_veiculos_diario
      SET
        veiculo_id = ${input.veiculoId ? BigInt(input.veiculoId) : null},
        data = ${toOptionalDate(input.data ?? undefined)},
        condutor = ${trimOrUndefined(input.condutor ?? undefined)},
        horario_saida = CAST(${toOptionalTime(input.horarioSaida ?? undefined)} AS TIME),
        km_inicial = ${input.kmInicial ?? null},
        horario_chegada = CAST(${toOptionalTime(input.horarioChegada ?? undefined)} AS TIME),
        km_final = ${input.kmFinal ?? null},
        destino = ${trimOrUndefined(input.destino ?? undefined)},
        km_rodados = ${kmRodados},
        media_consumo = ${mediaConsumo},
        observacoes = ${trimOrUndefined(input.observacoes ?? undefined)},
        atualizado_em = NOW()
      WHERE id = ${id}
    `);

    return this.buscarDiarioPorIdOuFalhar(id);
  }

  async removerDiario(id: bigint) {
    await this.buscarDiarioPorIdOuFalhar(id);
    await prisma.$executeRaw(Prisma.sql`
      DELETE FROM controle_veiculos_diario
      WHERE id = ${id}
    `);
  }

  async listarMotoristasDisponiveis(nome?: string) {
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
    await this.buscarMotoristaAutorizadoPorIdOuFalhar(id);
    await prisma.$executeRaw(Prisma.sql`
      DELETE FROM controle_veiculos_motoristas_autorizados
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
