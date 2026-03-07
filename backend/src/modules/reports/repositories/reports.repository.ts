import { prisma } from "../../../database/prisma.js";

export class ReportsRepository {
  async obterInstituicaoRodape() {
    const unidade =
      (await prisma.unidadeAssistencial.findFirst({
        where: { unidadePrincipal: true },
        include: { endereco: true }
      })) ??
      (await prisma.unidadeAssistencial.findFirst({
        include: { endereco: true }
      }));

    if (!unidade) {
      return {
        linha1: "Instituicao nao cadastrada",
        linha2: "",
        linha3: ""
      };
    }

    const nomeInstituicao = unidade.razaoSocial || unidade.nomeFantasia;
    const partesEndereco = [
      unidade.endereco?.logradouro,
      unidade.endereco?.numero,
      unidade.endereco?.bairro,
      unidade.endereco?.cidade
    ].filter(Boolean);

    const linha2Partes = [];
    if (unidade.cnpj) linha2Partes.push(`CNPJ: ${unidade.cnpj}`);
    if (partesEndereco.length) linha2Partes.push(partesEndereco.join(", "));

    const linha3Partes = [unidade.telefone, unidade.email, unidade.site].filter(Boolean);

    return {
      linha1: nomeInstituicao,
      linha2: linha2Partes.join(" | "),
      linha3: linha3Partes.join(" | ")
    };
  }
}
