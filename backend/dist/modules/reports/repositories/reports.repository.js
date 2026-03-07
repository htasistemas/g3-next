import { prisma } from "../../../database/prisma.js";
export class ReportsRepository {
    async obterInstituicaoRelatorio() {
        const unidade = (await prisma.unidadeAssistencial.findFirst({
            where: { unidadePrincipal: true },
            include: { endereco: true, imagemUnidade: true }
        })) ??
            (await prisma.unidadeAssistencial.findFirst({
                include: { endereco: true, imagemUnidade: true }
            }));
        if (!unidade) {
            return {
                razaoSocial: "Instituicao nao cadastrada",
                cnpj: "",
                enderecoCompleto: "",
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
        const partesEndereco = [
            unidade.endereco?.logradouro,
            unidade.endereco?.numero,
            unidade.endereco?.bairro,
            unidade.endereco?.cidade
        ].filter(Boolean);
        const enderecoCompleto = partesEndereco.join(", ");
        const linha2Partes = [];
        if (unidade.cnpj)
            linha2Partes.push(`CNPJ: ${unidade.cnpj}`);
        if (enderecoCompleto)
            linha2Partes.push(enderecoCompleto);
        const linha3Partes = [unidade.telefone, unidade.email, unidade.site].filter(Boolean);
        return {
            razaoSocial: nomeInstituicao,
            cnpj: unidade.cnpj ?? "",
            enderecoCompleto,
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
