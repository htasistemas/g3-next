import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";

export type RelatorioInstituicao = {
  razaoSocial: string;
  nomeFantasia: string;
  unidadeNome: string;
  cnpj: string;
  enderecoCompleto: string;
  cep: string;
  cidade: string;
  uf: string;
  telefone: string;
  email: string;
  site: string;
  logoUrl?: string;
  rodape: {
    linha1: string;
    linha2: string;
    linha3: string;
  };
};

type UnidadeRelatorioRow = {
  razao_social: string | null;
  nome_fantasia: string | null;
  cnpj: string | null;
  telefone: string | null;
  email: string | null;
  site: string | null;
  logradouro: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  cep: string | null;
  logomarca_relatorio: string | null;
  logomarca: string | null;
};

export class ReportsRepository {
  async obterInstituicaoRelatorio(tenantId?: string): Promise<RelatorioInstituicao> {
    const filtroTenant = tenantId ? Prisma.sql`WHERE ua.tenant_id::text = ${tenantId}` : Prisma.empty;
    const rows = await prisma.$queryRaw<UnidadeRelatorioRow[]>(Prisma.sql`
      SELECT
        ua.razao_social,
        ua.nome_fantasia,
        ua.cnpj,
        ua.telefone,
        ua.email,
        ua.site,
        e.logradouro,
        e.numero,
        e.bairro,
        e.cidade,
        e.estado AS uf,
        e.cep,
        iu.logomarca_relatorio,
        iu.logomarca
      FROM unidade_assistencial ua
      LEFT JOIN endereco e ON e.id = ua.endereco_id
      LEFT JOIN imagens_unidade iu ON iu.unidade_id = ua.id
      ${filtroTenant}
      ORDER BY ua.unidade_principal DESC, ua.atualizado_em DESC, ua.criado_em ASC
      LIMIT 1
    `);

    const unidade = rows[0];
    if (!unidade) {
      return {
        razaoSocial: "Instituicao nao cadastrada",
        nomeFantasia: "",
        unidadeNome: "",
        cnpj: "",
        enderecoCompleto: "",
        cep: "",
        cidade: "",
        uf: "",
        telefone: "",
        email: "",
        site: "",
        logoUrl: undefined,
        rodape: {
          linha1: "Instituicao nao cadastrada",
          linha2: "",
          linha3: ""
        }
      };
    }

    const nomeInstituicao = unidade.razao_social || unidade.nome_fantasia || "Instituicao nao cadastrada";
    const nomeUnidade = unidade.nome_fantasia || unidade.razao_social || "";
    const partesEndereco = [unidade.logradouro, unidade.numero, unidade.bairro, unidade.cidade].filter(Boolean);
    const enderecoCompleto = partesEndereco.join(", ");

    const linha2Partes = [];
    if (unidade.cnpj) linha2Partes.push(`CNPJ: ${unidade.cnpj}`);
    if (enderecoCompleto) linha2Partes.push(enderecoCompleto);

    const linha3Partes = [unidade.telefone, unidade.email, unidade.site].filter(Boolean);

    return {
      razaoSocial: nomeInstituicao,
      nomeFantasia: unidade.nome_fantasia ?? "",
      unidadeNome: nomeUnidade,
      cnpj: unidade.cnpj ?? "",
      enderecoCompleto,
      cep: unidade.cep ?? "",
      cidade: unidade.cidade ?? "",
      uf: unidade.uf ?? "",
      telefone: unidade.telefone ?? "",
      email: unidade.email ?? "",
      site: unidade.site ?? "",
      logoUrl: unidade.logomarca_relatorio ?? unidade.logomarca ?? undefined,
      rodape: {
        linha1: nomeInstituicao,
        linha2: linha2Partes.join(" | "),
        linha3: linha3Partes.join(" | ")
      }
    };
  }
}
