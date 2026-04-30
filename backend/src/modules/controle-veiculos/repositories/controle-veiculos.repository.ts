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

function tenantSql(alias: string, tenantId: string) {
  return Prisma.sql`${Prisma.raw(alias)}.tenant_id::text = ${tenantId}`;
}

type FonteMotorista = {
  nomeTabela: "cadastro_profissional" | "cadastro_profissionais" | "cadastro_voluntario";
  possuiTenant: boolean;
};

const controleVeiculosEstruturaStatements = [
  "ALTER TABLE controle_veiculos ADD COLUMN IF NOT EXISTS cor VARCHAR(80)",
  "ALTER TABLE controle_veiculos ADD COLUMN IF NOT EXISTS tenant_id UUID",
  `
    CREATE TABLE IF NOT EXISTS controle_veiculos_local_destino (
      id BIGSERIAL PRIMARY KEY,
      tenant_id UUID,
      nome VARCHAR(160) NOT NULL,
      endereco VARCHAR(220),
      telefone VARCHAR(30),
      observacoes TEXT,
      ativo BOOLEAN NOT NULL DEFAULT TRUE,
      criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
      atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS controle_veiculos_motoristas_autorizados (
      id BIGSERIAL PRIMARY KEY,
      tenant_id UUID,
      veiculo_id BIGINT NOT NULL,
      tipo_origem VARCHAR(20) NOT NULL,
      profissional_id BIGINT,
      voluntario_id BIGINT,
      nome_motorista VARCHAR(200) NOT NULL,
      numero_carteira VARCHAR(60),
      categoria_carteira VARCHAR(20),
      vencimento_carteira DATE,
      arquivo_carteira_pdf TEXT,
      criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
      atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `,
  "ALTER TABLE controle_veiculos_local_destino ADD COLUMN IF NOT EXISTS telefone VARCHAR(30)",
  "ALTER TABLE controle_veiculos_local_destino ADD COLUMN IF NOT EXISTS tenant_id UUID",
  "ALTER TABLE controle_veiculos_diario ADD COLUMN IF NOT EXISTS data_saida DATE",
  "ALTER TABLE controle_veiculos_diario ADD COLUMN IF NOT EXISTS data_chegada DATE",
  "ALTER TABLE controle_veiculos_diario ADD COLUMN IF NOT EXISTS local_destino_id BIGINT",
  "ALTER TABLE controle_veiculos_diario ADD COLUMN IF NOT EXISTS tenant_id UUID",
  "ALTER TABLE controle_veiculos_motoristas_autorizados ADD COLUMN IF NOT EXISTS tenant_id UUID",
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
  "CREATE INDEX IF NOT EXISTS controle_veiculos_tenant_idx ON controle_veiculos(tenant_id, modelo, placa)",
  "CREATE INDEX IF NOT EXISTS controle_veiculos_diario_tenant_idx ON controle_veiculos_diario(tenant_id, data DESC, id DESC)",
  "CREATE INDEX IF NOT EXISTS controle_veiculos_local_destino_tenant_idx ON controle_veiculos_local_destino(tenant_id, ativo, nome)",
  "CREATE INDEX IF NOT EXISTS controle_veiculos_motoristas_tenant_idx ON controle_veiculos_motoristas_autorizados(tenant_id, veiculo_id, nome_motorista)",
  "CREATE INDEX IF NOT EXISTS controle_veiculos_diario_local_destino_idx ON controle_veiculos_diario(local_destino_id)",
  "CREATE INDEX IF NOT EXISTS controle_veiculos_local_destino_nome_idx ON controle_veiculos_local_destino(nome)",
  `
    UPDATE controle_veiculos AS v
    SET tenant_id = ref.tenant_id
    FROM (
      SELECT tenant_id
      FROM instituicoes
      ORDER BY criado_em ASC
      LIMIT 1
    ) ref
    WHERE v.tenant_id IS NULL
  `,
  `
    UPDATE controle_veiculos_local_destino AS ld
    SET tenant_id = ref.tenant_id
    FROM (
      SELECT tenant_id
      FROM instituicoes
      ORDER BY criado_em ASC
      LIMIT 1
    ) ref
    WHERE ld.tenant_id IS NULL
  `,
  `
    UPDATE controle_veiculos_diario AS d
    SET tenant_id = v.tenant_id
    FROM controle_veiculos v
    WHERE d.tenant_id IS NULL
      AND v.id = d.veiculo_id
      AND v.tenant_id IS NOT NULL
  `,
  `
    UPDATE controle_veiculos_diario AS d
    SET tenant_id = ld.tenant_id
    FROM controle_veiculos_local_destino ld
    WHERE d.tenant_id IS NULL
      AND ld.id = d.local_destino_id
      AND ld.tenant_id IS NOT NULL
  `,
  `
    UPDATE controle_veiculos_diario AS d
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
    UPDATE controle_veiculos_motoristas_autorizados AS ma
    SET tenant_id = v.tenant_id
    FROM controle_veiculos v
    WHERE ma.tenant_id IS NULL
      AND v.id = ma.veiculo_id
      AND v.tenant_id IS NOT NULL
  `
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
    profissionais: FonteMotorista | null;
    voluntarios: FonteMotorista | null;
  }> | null = null;

  private tratarErroPersistenciaVeiculo(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      const rawCode =
        typeof error.meta?.code === "string" ? error.meta.code : undefined;
      const rawMessage =
        typeof error.meta?.message === "string" ? error.meta.message : error.message;

      if (
        (error.code === "P2002" || (error.code === "P2010" && rawCode === "23505")) &&
        /\bplaca\b/i.test(rawMessage)
      ) {
        throw new AppError("Ja existe um veiculo cadastrado com esta placa.", 409);
      }
    }

    throw error;
  }

  private async obterFontesMotoristas() {
    if (!this.fontesMotoristasPromise) {
      this.fontesMotoristasPromise = prisma
        .$queryRaw<Array<{ table_name: string; column_name: string }>>(Prisma.sql`
          SELECT table_name, column_name
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name IN ('cadastro_profissional', 'cadastro_profissionais', 'cadastro_voluntario')
        `)
        .then((rows) => {
          const colunasPorTabela = new Map<string, Set<string>>();

          for (const row of rows) {
            const colunas = colunasPorTabela.get(row.table_name) ?? new Set<string>();
            colunas.add(row.column_name);
            colunasPorTabela.set(row.table_name, colunas);
          }

          const montarFonte = (
            nomeTabela: FonteMotorista["nomeTabela"]
          ): FonteMotorista | null => {
            const colunas = colunasPorTabela.get(nomeTabela);
            if (!colunas?.size) return null;
            return {
              nomeTabela,
              possuiTenant: colunas.has("tenant_id")
            };
          };

          return {
            profissionais:
              montarFonte("cadastro_profissionais") ?? montarFonte("cadastro_profissional"),
            voluntarios: montarFonte("cadastro_voluntario")
          };
        });
    }

    return this.fontesMotoristasPromise;
  }

  private async ensureEstrutura() {
    await ensureControleVeiculosEstrutura();
  }

  async listarVeiculos(tenantId: string) {
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
      WHERE ${tenantSql("controle_veiculos", tenantId)}
      ORDER BY modelo ASC NULLS LAST, placa ASC NULLS LAST, id DESC
    `);
  }

  async buscarVeiculoPorId(id: bigint, tenantId: string) {
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
        AND tenant_id::text = ${tenantId}
      LIMIT 1
    `);
    return rows[0] ?? null;
  }

  async buscarVeiculoPorIdOuFalhar(id: bigint, tenantId: string) {
    const registro = await this.buscarVeiculoPorId(id, tenantId);
    if (!registro) {
      throw new AppError("Veiculo nao encontrado.", 404);
    }
    return registro;
  }

  async criarVeiculo(input: VeiculoInput, tenantId: string) {
    await this.ensureEstrutura();
    let inserted: Array<{ id: bigint }>;
    try {
      inserted = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
        INSERT INTO controle_veiculos (
          tenant_id,
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
          CAST(${tenantId} AS UUID),
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
      throw new AppError("Nao foi possivel criar o veiculo.", 500);
    }
    return this.buscarVeiculoPorIdOuFalhar(id, tenantId);
  }

  async atualizarVeiculo(id: bigint, input: VeiculoInput, tenantId: string) {
    await this.ensureEstrutura();
    await this.buscarVeiculoPorIdOuFalhar(id, tenantId);
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
          AND tenant_id::text = ${tenantId}
      `);
    } catch (error) {
      this.tratarErroPersistenciaVeiculo(error);
    }
    return this.buscarVeiculoPorIdOuFalhar(id, tenantId);
  }

  async removerVeiculo(id: bigint, tenantId: string) {
    await this.ensureEstrutura();
    await this.buscarVeiculoPorIdOuFalhar(id, tenantId);
    await prisma.$executeRaw(Prisma.sql`
      DELETE FROM controle_veiculos
      WHERE id = ${id}
        AND tenant_id::text = ${tenantId}
    `);
  }

  async listarDiario(tenantId: string) {
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
      LEFT JOIN controle_veiculos_local_destino ld
        ON ld.id = d.local_destino_id
       AND ld.tenant_id::text = ${tenantId}
      WHERE d.tenant_id::text = ${tenantId}
      ORDER BY d.data DESC NULLS LAST, d.id DESC
    `);
  }

  async buscarDiarioPorId(id: bigint, tenantId: string) {
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
      LEFT JOIN controle_veiculos_local_destino ld
        ON ld.id = d.local_destino_id
       AND ld.tenant_id::text = ${tenantId}
      WHERE d.id = ${id}
        AND d.tenant_id::text = ${tenantId}
      LIMIT 1
    `);
    return rows[0] ?? null;
  }

  async buscarDiarioPorIdOuFalhar(id: bigint, tenantId: string) {
    const registro = await this.buscarDiarioPorId(id, tenantId);
    if (!registro) {
      throw new AppError("Registro de diario de bordo nao encontrado.", 404);
    }
    return registro;
  }

  async criarDiario(input: DiarioBordoInput, tenantId: string) {
    await this.ensureEstrutura();
    if (input.veiculoId) {
      await this.buscarVeiculoPorIdOuFalhar(BigInt(input.veiculoId), tenantId);
    }
    if (input.localDestinoId) {
      await this.buscarLocalDestinoPorIdOuFalhar(BigInt(input.localDestinoId), tenantId);
    }

    const kmRodados = calcularKmRodados(input.kmInicial, input.kmFinal);
    const mediaConsumo = calcularMediaConsumo(kmRodados, input.combustivelConsumidoLitros);
    const inserted = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
      INSERT INTO controle_veiculos_diario (
        tenant_id,
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
        CAST(${tenantId} AS UUID),
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
      throw new AppError("Nao foi possivel criar o registro de diario.", 500);
    }
    return this.buscarDiarioPorIdOuFalhar(id, tenantId);
  }

  async atualizarDiario(id: bigint, input: DiarioBordoInput, tenantId: string) {
    await this.ensureEstrutura();
    await this.buscarDiarioPorIdOuFalhar(id, tenantId);
    if (input.veiculoId) {
      await this.buscarVeiculoPorIdOuFalhar(BigInt(input.veiculoId), tenantId);
    }
    if (input.localDestinoId) {
      await this.buscarLocalDestinoPorIdOuFalhar(BigInt(input.localDestinoId), tenantId);
    }

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
        AND tenant_id::text = ${tenantId}
    `);

    return this.buscarDiarioPorIdOuFalhar(id, tenantId);
  }

  async removerDiario(id: bigint, tenantId: string) {
    await this.ensureEstrutura();
    await this.buscarDiarioPorIdOuFalhar(id, tenantId);
    await prisma.$executeRaw(Prisma.sql`
      DELETE FROM controle_veiculos_diario
      WHERE id = ${id}
        AND tenant_id::text = ${tenantId}
    `);
  }

  async listarMotoristasDisponiveis(nome: string | undefined, tenantId: string) {
    await this.ensureEstrutura();
    const termo = trimOrUndefined(nome);
    const { profissionais, voluntarios } = await this.obterFontesMotoristas();
    const fontes: string[] = [];

    if (profissionais?.possuiTenant) {
      fontes.push(
        `SELECT id, 'PROFISSIONAL'::text AS tipo_origem, nome_completo AS nome FROM ${profissionais.nomeTabela} WHERE tenant_id::text = $1`
      );
    }

    if (voluntarios?.possuiTenant) {
      fontes.push(
        `SELECT id, 'VOLUNTARIO'::text AS tipo_origem, nome_completo AS nome FROM ${voluntarios.nomeTabela} WHERE tenant_id::text = $1`
      );
    }

    if (!fontes.length) {
      return [];
    }

    const filtroTermo = termo ? "WHERE nome ILIKE $2" : "";
    const sql = `
      SELECT *
      FROM (${fontes.join(" UNION ALL ")}) motoristas
      ${filtroTermo}
      ORDER BY nome ASC
      LIMIT 30
    `;

    return termo
      ? prisma.$queryRawUnsafe<Array<{ id: bigint; tipo_origem: string; nome: string }>>(
          sql,
          tenantId,
          `%${termo}%`
        )
      : prisma.$queryRawUnsafe<Array<{ id: bigint; tipo_origem: string; nome: string }>>(
          sql,
          tenantId
        );
  }

  async listarMotoristasAutorizados(veiculoId: number | undefined, tenantId: string) {
    await this.ensureEstrutura();
    if (veiculoId) {
      await this.buscarVeiculoPorIdOuFalhar(BigInt(veiculoId), tenantId);
    }

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
      INNER JOIN controle_veiculos v
        ON v.id = ma.veiculo_id
       AND v.tenant_id::text = ${tenantId}
      WHERE ma.tenant_id::text = ${tenantId}
      ${filtroVeiculo}
      ORDER BY ma.nome_motorista ASC, ma.id DESC
    `);
  }

  async buscarMotoristaAutorizadoPorId(id: bigint, tenantId: string) {
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
      INNER JOIN controle_veiculos v
        ON v.id = ma.veiculo_id
       AND v.tenant_id::text = ${tenantId}
      WHERE ma.id = ${id}
        AND ma.tenant_id::text = ${tenantId}
      LIMIT 1
    `);
    return rows[0] ?? null;
  }

  async buscarMotoristaAutorizadoPorIdOuFalhar(id: bigint, tenantId: string) {
    const registro = await this.buscarMotoristaAutorizadoPorId(id, tenantId);
    if (!registro) {
      throw new AppError("Motorista autorizado nao encontrado.", 404);
    }
    return registro;
  }

  async criarMotoristaAutorizado(input: MotoristaAutorizadoInput, tenantId: string) {
    await this.ensureEstrutura();
    await this.buscarVeiculoPorIdOuFalhar(BigInt(input.veiculoId), tenantId);
    const nomeMotorista = await this.buscarNomeMotorista(input.tipoOrigem, input.motoristaId, tenantId);

    const inserted = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
      INSERT INTO controle_veiculos_motoristas_autorizados (
        tenant_id,
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
        CAST(${tenantId} AS UUID),
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
      throw new AppError("Nao foi possivel criar o motorista autorizado.", 500);
    }
    return this.buscarMotoristaAutorizadoPorIdOuFalhar(id, tenantId);
  }

  async atualizarMotoristaAutorizado(
    id: bigint,
    input: MotoristaAutorizadoInput,
    tenantId: string
  ) {
    await this.ensureEstrutura();
    await this.buscarMotoristaAutorizadoPorIdOuFalhar(id, tenantId);
    await this.buscarVeiculoPorIdOuFalhar(BigInt(input.veiculoId), tenantId);
    const nomeMotorista = await this.buscarNomeMotorista(input.tipoOrigem, input.motoristaId, tenantId);

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
        AND tenant_id::text = ${tenantId}
    `);

    return this.buscarMotoristaAutorizadoPorIdOuFalhar(id, tenantId);
  }

  async removerMotoristaAutorizado(id: bigint, tenantId: string) {
    await this.ensureEstrutura();
    await this.buscarMotoristaAutorizadoPorIdOuFalhar(id, tenantId);
    await prisma.$executeRaw(Prisma.sql`
      DELETE FROM controle_veiculos_motoristas_autorizados
      WHERE id = ${id}
        AND tenant_id::text = ${tenantId}
    `);
  }

  async listarLocaisDestino(tenantId: string) {
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
      WHERE tenant_id::text = ${tenantId}
      ORDER BY ativo DESC, nome ASC, id DESC
    `);
  }

  async buscarLocalDestinoPorId(id: bigint, tenantId: string) {
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
        AND tenant_id::text = ${tenantId}
      LIMIT 1
    `);
    return rows[0] ?? null;
  }

  async buscarLocalDestinoPorIdOuFalhar(id: bigint, tenantId: string) {
    const registro = await this.buscarLocalDestinoPorId(id, tenantId);
    if (!registro) {
      throw new AppError("Local de destino nao encontrado.", 404);
    }
    return registro;
  }

  async criarLocalDestino(input: LocalDestinoInput, tenantId: string) {
    await this.ensureEstrutura();
    const inserted = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
      INSERT INTO controle_veiculos_local_destino (
        tenant_id,
        nome,
        endereco,
        telefone,
        observacoes,
        ativo,
        criado_em,
        atualizado_em
      ) VALUES (
        CAST(${tenantId} AS UUID),
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
    return this.buscarLocalDestinoPorIdOuFalhar(id, tenantId);
  }

  async atualizarLocalDestino(id: bigint, input: LocalDestinoInput, tenantId: string) {
    await this.ensureEstrutura();
    await this.buscarLocalDestinoPorIdOuFalhar(id, tenantId);
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
        AND tenant_id::text = ${tenantId}
    `);
    return this.buscarLocalDestinoPorIdOuFalhar(id, tenantId);
  }

  async removerLocalDestino(id: bigint, tenantId: string) {
    await this.ensureEstrutura();
    await this.buscarLocalDestinoPorIdOuFalhar(id, tenantId);
    await prisma.$executeRaw(Prisma.sql`
      UPDATE controle_veiculos_diario
      SET local_destino_id = NULL
      WHERE local_destino_id = ${id}
        AND tenant_id::text = ${tenantId}
    `);
    await prisma.$executeRaw(Prisma.sql`
      DELETE FROM controle_veiculos_local_destino
      WHERE id = ${id}
        AND tenant_id::text = ${tenantId}
    `);
  }

  private async buscarNomeMotorista(
    tipoOrigem: "PROFISSIONAL" | "VOLUNTARIO",
    motoristaId: number,
    tenantId: string
  ) {
    const fontes = await this.obterFontesMotoristas();

    if (tipoOrigem === "PROFISSIONAL") {
      const tabelaProfissionais = fontes.profissionais;
      if (!tabelaProfissionais) {
        throw new AppError("Tabela de profissionais nao encontrada para vinculo.", 500);
      }
      if (!tabelaProfissionais.possuiTenant) {
        throw new AppError("Tabela de profissionais sem suporte a tenant.", 500);
      }

      const rows = await prisma.$queryRawUnsafe<Array<{ nome_completo: string }>>(
        `
          SELECT nome_completo
          FROM ${tabelaProfissionais.nomeTabela}
          WHERE id = $1
            AND tenant_id::text = $2
          LIMIT 1
        `,
        BigInt(motoristaId),
        tenantId
      );

      if (!rows.length) {
        throw new AppError("Profissional nao encontrado para vinculo.", 404);
      }

      return rows[0].nome_completo;
    }

    const tabelaVoluntarios = fontes.voluntarios;
    if (!tabelaVoluntarios) {
      throw new AppError("Tabela de voluntarios nao encontrada para vinculo.", 500);
    }
    if (!tabelaVoluntarios.possuiTenant) {
      throw new AppError("Tabela de voluntarios sem suporte a tenant.", 500);
    }

    const rows = await prisma.$queryRawUnsafe<Array<{ nome_completo: string }>>(
      `
        SELECT nome_completo
        FROM ${tabelaVoluntarios.nomeTabela}
        WHERE id = $1
          AND tenant_id::text = $2
        LIMIT 1
      `,
      BigInt(motoristaId),
      tenantId
    );

    if (!rows.length) {
      throw new AppError("Voluntario nao encontrado para vinculo.", 404);
    }

    return rows[0].nome_completo;
  }
}
