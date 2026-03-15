import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { toOptionalDate } from "../../../utils/string-utils.js";
import type { VisitaDomiciliarInput, VisitaDomiciliarRow } from "../visitas-domiciliares.types.js";
type VisitaSchemaInfo = {
  possuiBeneficiarioNome: boolean;
  possuiAnexos: boolean;
  possuiTabelaAnexos: boolean;
};

const estruturaSql = [
  `
  CREATE TABLE IF NOT EXISTS visita_domiciliar (
    id BIGSERIAL PRIMARY KEY,
    beneficiario_id BIGINT NOT NULL,
    beneficiario_nome TEXT NOT NULL,
    unidade TEXT NOT NULL,
    responsavel TEXT NOT NULL,
    data_visita DATE NOT NULL,
    horario_inicial TEXT NOT NULL,
    horario_final TEXT,
    tipo_visita TEXT,
    situacao TEXT NOT NULL,
    usar_endereco_beneficiario BOOLEAN NOT NULL DEFAULT TRUE,
    endereco JSONB NOT NULL DEFAULT '{}'::jsonb,
    observacoes_iniciais TEXT,
    condicoes JSONB NOT NULL DEFAULT '{}'::jsonb,
    situacao_social JSONB NOT NULL DEFAULT '{}'::jsonb,
    registro JSONB NOT NULL DEFAULT '{}'::jsonb,
    anexos JSONB NOT NULL DEFAULT '[]'::jsonb,
    criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMP NOT NULL DEFAULT NOW()
  )
  `,
  "CREATE INDEX IF NOT EXISTS visita_domiciliar_data_idx ON visita_domiciliar(data_visita)",
  "CREATE INDEX IF NOT EXISTS visita_domiciliar_beneficiario_idx ON visita_domiciliar(beneficiario_id)"
];

let estruturaPromise: Promise<void> | null = null;

export async function ensureVisitasDomiciliaresEstrutura() {
  if (!estruturaPromise) {
    estruturaPromise = (async () => {
      for (const comando of estruturaSql) {
        await prisma.$executeRawUnsafe(comando);
      }
    })();
  }

  await estruturaPromise;
}

export class VisitasDomiciliaresRepository {
  private schemaInfoPromise: Promise<VisitaSchemaInfo> | null = null;

  private async garantirEstrutura() {
    await ensureVisitasDomiciliaresEstrutura();
  }

  private async obterNomeBeneficiario(beneficiarioId: number) {
    const rows = await prisma.$queryRaw<Array<{ nome_completo: string | null; nome_social: string | null }>>(Prisma.sql`
      SELECT nome_completo, nome_social
      FROM cadastro_beneficiario
      WHERE id = ${BigInt(beneficiarioId)}
      LIMIT 1
    `);
    const registro = rows[0];
    if (!registro) {
      throw new AppError("Beneficiario nao encontrado.", 404);
    }
    return registro.nome_completo ?? registro.nome_social ?? "Beneficiario";
  }

  private async obterSchemaInfo() {
    if (!this.schemaInfoPromise) {
      this.schemaInfoPromise = (async () => {
        const [colunas, tabelas] = await Promise.all([
          prisma.$queryRaw<Array<{ column_name: string }>>(Prisma.sql`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'visita_domiciliar'
          `),
          prisma.$queryRaw<Array<{ table_name: string }>>(Prisma.sql`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_name IN ('visita_domiciliar_anexo')
          `)
        ]);

        const colunasSet = new Set(colunas.map((item) => item.column_name));
        const tabelasSet = new Set(tabelas.map((item) => item.table_name));

        return {
          possuiBeneficiarioNome: colunasSet.has("beneficiario_nome"),
          possuiAnexos: colunasSet.has("anexos"),
          possuiTabelaAnexos: tabelasSet.has("visita_domiciliar_anexo")
        };
      })();
    }

    return this.schemaInfoPromise;
  }

  private async consultarVisitas(id?: bigint) {
    const schema = await this.obterSchemaInfo();
    const colunaBeneficiarioNome = schema.possuiBeneficiarioNome
      ? "v.beneficiario_nome"
      : "COALESCE(b.nome_completo, b.nome_social, 'Beneficiario') AS beneficiario_nome";
    const colunaAnexos = schema.possuiAnexos
      ? "v.anexos"
      : schema.possuiTabelaAnexos
        ? "COALESCE((SELECT jsonb_agg(jsonb_build_object('id', a.id, 'nome', a.nome, 'tipo', a.tipo, 'tamanho', a.tamanho, 'criadoEm', a.criado_em) ORDER BY a.id ASC) FROM visita_domiciliar_anexo a WHERE a.visita_id = v.id), '[]'::jsonb) AS anexos"
        : "'[]'::jsonb AS anexos";
    const colunas = [
      "v.id",
      "v.beneficiario_id",
      colunaBeneficiarioNome,
      "v.unidade",
      "v.responsavel",
      "v.data_visita",
      "v.horario_inicial",
      "v.horario_final",
      "v.tipo_visita",
      "v.situacao",
      "v.usar_endereco_beneficiario",
      "v.endereco",
      "v.observacoes_iniciais",
      "v.condicoes",
      "v.situacao_social",
      "v.registro",
      colunaAnexos,
      "v.criado_em",
      "v.atualizado_em"
    ].join(",\n        ");

    if (id) {
      return prisma.$queryRawUnsafe<VisitaDomiciliarRow[]>(
        `
          SELECT
            ${colunas}
          FROM visita_domiciliar v
          LEFT JOIN cadastro_beneficiario b ON b.id = v.beneficiario_id
          WHERE v.id = $1
          LIMIT 1
        `,
        id
      );
    }

    return prisma.$queryRawUnsafe<VisitaDomiciliarRow[]>(`
      SELECT
        ${colunas}
      FROM visita_domiciliar v
      LEFT JOIN cadastro_beneficiario b ON b.id = v.beneficiario_id
      ORDER BY v.data_visita DESC, v.id DESC
    `);
  }

  async listar() {
    await this.garantirEstrutura();
    return this.consultarVisitas();
  }

  async obter(id: bigint) {
    await this.garantirEstrutura();
    const rows = await this.consultarVisitas(id);
    return rows[0] ?? null;
  }

  async obterOuFalhar(id: bigint) {
    const visita = await this.obter(id);
    if (!visita) throw new AppError("Visita domiciliar nao encontrada.", 404);
    return visita;
  }

  async criar(input: VisitaDomiciliarInput) {
    await this.garantirEstrutura();
    const schema = await this.obterSchemaInfo();
    const beneficiarioNome = schema.possuiBeneficiarioNome
      ? await this.obterNomeBeneficiario(input.beneficiarioId)
      : null;
    const campos: Prisma.Sql[] = [
      Prisma.raw("beneficiario_id"),
      ...(schema.possuiBeneficiarioNome ? [Prisma.raw("beneficiario_nome")] : []),
      Prisma.raw("unidade"),
      Prisma.raw("responsavel"),
      Prisma.raw("data_visita"),
      Prisma.raw("horario_inicial"),
      Prisma.raw("horario_final"),
      Prisma.raw("tipo_visita"),
      Prisma.raw("situacao"),
      Prisma.raw("usar_endereco_beneficiario"),
      Prisma.raw("endereco"),
      Prisma.raw("observacoes_iniciais"),
      Prisma.raw("condicoes"),
      Prisma.raw("situacao_social"),
      Prisma.raw("registro"),
      ...(schema.possuiAnexos ? [Prisma.raw("anexos")] : []),
      Prisma.raw("criado_em"),
      Prisma.raw("atualizado_em")
    ];
    const valores: Prisma.Sql[] = [
      Prisma.sql`${BigInt(input.beneficiarioId)}`,
      ...(schema.possuiBeneficiarioNome && beneficiarioNome
        ? [Prisma.sql`${beneficiarioNome}`]
        : []),
      Prisma.sql`${input.unidade}`,
      Prisma.sql`${input.responsavel}`,
      Prisma.sql`${toOptionalDate(input.dataVisita)}`,
      Prisma.sql`${input.horarioInicial}`,
      Prisma.sql`${input.horarioFinal ?? null}`,
      Prisma.sql`${input.tipoVisita ?? null}`,
      Prisma.sql`${input.situacao}`,
      Prisma.sql`${input.usarEnderecoBeneficiario}`,
      Prisma.sql`${((input.endereco ?? {}) as unknown) as Prisma.JsonObject}`,
      Prisma.sql`${input.observacoesIniciais ?? null}`,
      Prisma.sql`${((input.condicoes ?? {}) as unknown) as Prisma.JsonObject}`,
      Prisma.sql`${((input.situacaoSocial ?? {}) as unknown) as Prisma.JsonObject}`,
      Prisma.sql`${((input.registro ?? {}) as unknown) as Prisma.JsonObject}`,
      ...(schema.possuiAnexos
        ? [Prisma.sql`${((input.anexos ?? []) as unknown) as Prisma.JsonArray}`]
        : []),
      Prisma.sql`NOW()`,
      Prisma.sql`NOW()`
    ];

    const inserted = await prisma.$queryRaw<Array<{ id: bigint }>>(Prisma.sql`
      INSERT INTO visita_domiciliar (${Prisma.join(campos, ", ")})
      VALUES (${Prisma.join(valores, ", ")})
      RETURNING id
    `);

    const id = inserted[0]?.id;
    if (!id) throw new AppError("Nao foi possivel registrar visita domiciliar.", 500);
    return this.obterOuFalhar(id);
  }

  async atualizar(id: bigint, input: VisitaDomiciliarInput) {
    await this.garantirEstrutura();
    await this.obterOuFalhar(id);
    const schema = await this.obterSchemaInfo();
    const beneficiarioNome = schema.possuiBeneficiarioNome
      ? await this.obterNomeBeneficiario(input.beneficiarioId)
      : null;
    const atribuicoes: Prisma.Sql[] = [
      Prisma.sql`beneficiario_id = ${BigInt(input.beneficiarioId)}`,
      ...(schema.possuiBeneficiarioNome && beneficiarioNome
        ? [Prisma.sql`beneficiario_nome = ${beneficiarioNome}`]
        : []),
      Prisma.sql`unidade = ${input.unidade}`,
      Prisma.sql`responsavel = ${input.responsavel}`,
      Prisma.sql`data_visita = ${toOptionalDate(input.dataVisita)}`,
      Prisma.sql`horario_inicial = ${input.horarioInicial}`,
      Prisma.sql`horario_final = ${input.horarioFinal ?? null}`,
      Prisma.sql`tipo_visita = ${input.tipoVisita ?? null}`,
      Prisma.sql`situacao = ${input.situacao}`,
      Prisma.sql`usar_endereco_beneficiario = ${input.usarEnderecoBeneficiario}`,
      Prisma.sql`endereco = ${((input.endereco ?? {}) as unknown) as Prisma.JsonObject}`,
      Prisma.sql`observacoes_iniciais = ${input.observacoesIniciais ?? null}`,
      Prisma.sql`condicoes = ${((input.condicoes ?? {}) as unknown) as Prisma.JsonObject}`,
      Prisma.sql`situacao_social = ${((input.situacaoSocial ?? {}) as unknown) as Prisma.JsonObject}`,
      Prisma.sql`registro = ${((input.registro ?? {}) as unknown) as Prisma.JsonObject}`,
      ...(schema.possuiAnexos
        ? [Prisma.sql`anexos = ${((input.anexos ?? []) as unknown) as Prisma.JsonArray}`]
        : []),
      Prisma.sql`atualizado_em = NOW()`
    ];

    await prisma.$executeRaw(Prisma.sql`
      UPDATE visita_domiciliar
      SET ${Prisma.join(atribuicoes, ", ")}
      WHERE id = ${id}
    `);

    return this.obterOuFalhar(id);
  }

  async remover(id: bigint) {
    await this.garantirEstrutura();
    await this.obterOuFalhar(id);

    await prisma.$executeRaw(Prisma.sql`
      DELETE FROM visita_domiciliar
      WHERE id = ${id}
    `);
  }
}
