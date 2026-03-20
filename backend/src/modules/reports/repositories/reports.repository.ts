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

export class ReportsRepository {
  async obterInstituicaoRelatorio(): Promise<RelatorioInstituicao> {
    const unidade =
      (await prisma.unidadeAssistencial.findFirst({
        where: { unidadePrincipal: true },
        include: { endereco: true, imagemUnidade: true }
      })) ??
      (await prisma.unidadeAssistencial.findFirst({
        include: { endereco: true, imagemUnidade: true }
      }));

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

    const nomeInstituicao = unidade.razaoSocial || unidade.nomeFantasia;
    const nomeUnidade = unidade.nomeFantasia || unidade.razaoSocial || "";
    const partesEndereco = [
      unidade.endereco?.logradouro,
      unidade.endereco?.numero,
      unidade.endereco?.bairro,
      unidade.endereco?.cidade
    ].filter(Boolean);
    const enderecoCompleto = partesEndereco.join(", ");

    const linha2Partes = [];
    if (unidade.cnpj) linha2Partes.push(`CNPJ: ${unidade.cnpj}`);
    if (enderecoCompleto) linha2Partes.push(enderecoCompleto);

    const linha3Partes = [unidade.telefone, unidade.email, unidade.site].filter(Boolean);

    return {
      razaoSocial: nomeInstituicao,
      nomeFantasia: unidade.nomeFantasia ?? "",
      unidadeNome: nomeUnidade,
      cnpj: unidade.cnpj ?? "",
      enderecoCompleto,
      cep: unidade.endereco?.cep ?? "",
      cidade: unidade.endereco?.cidade ?? "",
      uf: unidade.endereco?.estado ?? "",
      telefone: unidade.telefone ?? "",
      email: unidade.email ?? "",
      site: unidade.site ?? "",
      logoUrl: unidade.imagemUnidade?.logomarcaRelatorio ?? unidade.imagemUnidade?.logomarca ?? undefined,
      rodape: {
        linha1: nomeInstituicao,
        linha2: linha2Partes.join(" | "),
        linha3: linha3Partes.join(" | ")
      }
    };
  }
}
