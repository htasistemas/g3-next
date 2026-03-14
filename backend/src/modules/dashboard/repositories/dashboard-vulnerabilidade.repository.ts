import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";

const acentos =
  "áàãâäéèêëíìîïóòõôöúùûüçÁÀÃÂÄÉÈÊËÍÌÎÏÓÒÕÔÖÚÙÛÜÇ";
const semAcentos =
  "aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC";
const normalizarSql = (expressao: string) =>
  Prisma.raw(`translate(lower(trim(coalesce(${expressao}, ''))), '${acentos}', '${semAcentos}')`);

export class DashboardVulnerabilidadeRepository {
  async contarEnderecosPendentes() {
    const rows = await prisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`
      SELECT COUNT(*)::BIGINT AS total
      FROM endereco e
      WHERE (e.latitude IS NULL OR e.longitude IS NULL)
        AND COALESCE(TRIM(e.cidade), '') <> ''
        AND (
          COALESCE(TRIM(e.logradouro), '') <> ''
          OR COALESCE(TRIM(e.bairro), '') <> ''
          OR COALESCE(TRIM(e.cep), '') <> ''
        )
    `);

    return Number(rows[0]?.total ?? 0n);
  }

  async listarEnderecosPendentes(limit = 20) {
    return prisma.$queryRaw<
      Array<{
        id: bigint;
        cep: string | null;
        logradouro: string | null;
        numero: string | null;
        bairro: string | null;
        cidade: string | null;
        estado: string | null;
      }>
    >(Prisma.sql`
      SELECT
        e.id,
        e.cep,
        e.logradouro,
        e.numero,
        e.bairro,
        e.cidade,
        e.estado
      FROM endereco e
      WHERE (e.latitude IS NULL OR e.longitude IS NULL)
        AND COALESCE(TRIM(e.cidade), '') <> ''
        AND (
          COALESCE(TRIM(e.logradouro), '') <> ''
          OR COALESCE(TRIM(e.bairro), '') <> ''
          OR COALESCE(TRIM(e.cep), '') <> ''
        )
      ORDER BY e.id ASC
      LIMIT ${Math.max(1, Math.min(limit, 50))}
    `);
  }

  async atualizarCoordenadasEndereco(id: bigint, latitude: number, longitude: number) {
    await prisma.endereco.update({
      where: { id },
      data: {
        latitude: new Prisma.Decimal(latitude),
        longitude: new Prisma.Decimal(longitude)
      }
    });
  }

  async listarCestaBasica() {
    return prisma.$queryRaw<
      Array<{
        id: bigint;
        nome: string | null;
        referencia: string | null;
        bairro: string | null;
        cidade: string | null;
        latitude: Prisma.Decimal | null;
        longitude: Prisma.Decimal | null;
        data_referencia: Date | null;
      }>
    >(Prisma.sql`
      SELECT
        d.id,
        COALESCE(b.nome_completo, vf.nome_familia) AS nome,
        COALESCE(vf.nome_familia, b.nome_completo) AS referencia,
        COALESCE(be.bairro, re.bairro) AS bairro,
        COALESCE(be.cidade, re.cidade) AS cidade,
        COALESCE(be.latitude, re.latitude) AS latitude,
        COALESCE(be.longitude, re.longitude) AS longitude,
        d.data_doacao AS data_referencia
      FROM doacao_realizada d
      LEFT JOIN cadastro_beneficiario b ON b.id = d.beneficiario_id
      LEFT JOIN endereco be ON be.id = b.endereco_id
      LEFT JOIN vinculo_familiar vf ON vf.id = d.vinculo_familiar_id
      LEFT JOIN cadastro_beneficiario ref_b ON ref_b.id = vf.id_referencia_familiar
      LEFT JOIN endereco re ON re.id = ref_b.endereco_id
      WHERE (
        d.tipo_doacao ILIKE '%cesta%'
        OR EXISTS (
          SELECT 1
          FROM doacao_realizada_item di
          INNER JOIN almoxarifado_item ai ON ai.id = di.almoxarifado_item_id
          WHERE di.doacao_realizada_id = d.id
            AND ai.descricao ILIKE '%cesta%'
        )
      )
      ORDER BY d.data_doacao DESC, d.id DESC
      LIMIT 500
    `);
  }

  async listarFamiliasCadastradas() {
    return prisma.$queryRaw<
      Array<{
        id: bigint;
        nome_familia: string;
        referencia_nome: string | null;
        bairro: string | null;
        cidade: string | null;
        latitude: Prisma.Decimal | null;
        longitude: Prisma.Decimal | null;
        vulnerabilidades: string | null;
      }>
    >(Prisma.sql`
      SELECT
        vf.id,
        vf.nome_familia,
        ref_b.nome_completo AS referencia_nome,
        COALESCE(re.bairro, vf.bairro) AS bairro,
        COALESCE(re.cidade, vf.municipio) AS cidade,
        re.latitude AS latitude,
        re.longitude AS longitude,
        vf.vulnerabilidades_familia AS vulnerabilidades
      FROM vinculo_familiar vf
      LEFT JOIN cadastro_beneficiario ref_b ON ref_b.id = vf.id_referencia_familiar
      LEFT JOIN endereco re ON re.id = ref_b.endereco_id
      ORDER BY vf.atualizado_em DESC, vf.id DESC
      LIMIT 500
    `);
  }

  async listarSituacoesViolencia() {
    return prisma.$queryRaw<
      Array<{
        id: bigint;
        vitima_nome: string | null;
        resumo: string | null;
        bairro: string | null;
        cidade: string | null;
        latitude: Prisma.Decimal | null;
        longitude: Prisma.Decimal | null;
        data_referencia: string | null;
      }>
    >(Prisma.sql`
      SELECT
        o.id,
        o.payload->>'vitimaNome' AS vitima_nome,
        o.payload->>'resumoViolencia' AS resumo,
        COALESCE(end_b.bairro, o.payload->>'vitimaEnderecoBairro') AS bairro,
        COALESCE(end_b.cidade, o.payload->>'vitimaEnderecoMunicipio') AS cidade,
        end_b.latitude AS latitude,
        end_b.longitude AS longitude,
        o.payload->>'dataPreenchimento' AS data_referencia
      FROM ocorrencias_crianca o
      LEFT JOIN LATERAL (
        SELECT b.id, e.bairro, e.cidade, e.latitude, e.longitude
        FROM cadastro_beneficiario b
        LEFT JOIN endereco e ON e.id = b.endereco_id
        WHERE ${normalizarSql("b.nome_completo")} = ${normalizarSql("o.payload->>'vitimaNome'")}
           OR ${normalizarSql("b.nome_social")} = ${normalizarSql("o.payload->>'vitimaNome'")}
        ORDER BY b.atualizado_em DESC
        LIMIT 1
      ) end_b ON TRUE
      ORDER BY o.atualizado_em DESC, o.id DESC
      LIMIT 500
    `);
  }
}
