import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { toOptionalDate, trimOrUndefined } from "../../../utils/string-utils.js";
const beneficiarioResumoInclude = {
    endereco: true,
    contatos: { orderBy: { atualizadoEm: "desc" }, take: 1 },
    documentos: {
        where: { tipoDocumento: "CPF" },
        orderBy: { atualizadoEm: "desc" },
        take: 1
    }
};
const familiaInclude = {
    referenciaFamiliar: { include: beneficiarioResumoInclude },
    membros: {
        orderBy: { id: "asc" },
        include: {
            beneficiario: { include: beneficiarioResumoInclude }
        }
    }
};
function toBigInt(id) {
    return BigInt(id);
}
function mapFamiliaData(input, now) {
    return {
        nomeFamilia: input.nome_familia,
        idReferenciaFamiliar: input.id_referencia_familiar
            ? toBigInt(input.id_referencia_familiar)
            : null,
        status: input.status ?? "ATIVO",
        cep: trimOrUndefined(input.cep),
        logradouro: trimOrUndefined(input.logradouro),
        numero: trimOrUndefined(input.numero),
        complemento: trimOrUndefined(input.complemento),
        bairro: trimOrUndefined(input.bairro),
        pontoReferencia: trimOrUndefined(input.ponto_referencia),
        municipio: trimOrUndefined(input.municipio),
        uf: trimOrUndefined(input.uf)?.toUpperCase(),
        zona: trimOrUndefined(input.zona),
        situacaoImovel: trimOrUndefined(input.situacao_imovel),
        tipoMoradia: trimOrUndefined(input.tipo_moradia),
        aguaEncanada: input.agua_encanada ?? false,
        esgotoTipo: trimOrUndefined(input.esgoto_tipo),
        coletaLixo: trimOrUndefined(input.coleta_lixo),
        energiaEletrica: input.energia_eletrica ?? false,
        internet: input.internet ?? false,
        arranjoFamiliar: trimOrUndefined(input.arranjo_familiar),
        qtdMembros: input.qtd_membros ?? input.membros?.length ?? null,
        qtdCriancas: input.qtd_criancas,
        qtdAdolescentes: input.qtd_adolescentes,
        qtdIdosos: input.qtd_idosos,
        qtdPessoasDeficiencia: input.qtd_pessoas_deficiencia,
        rendaFamiliarTotal: trimOrUndefined(input.renda_familiar_total),
        rendaPerCapita: trimOrUndefined(input.renda_per_capita),
        faixaRendaPerCapita: trimOrUndefined(input.faixa_renda_per_capita),
        principaisFontesRenda: trimOrUndefined(input.principais_fontes_renda),
        situacaoInsegurancaAlimentar: trimOrUndefined(input.situacao_inseguranca_alimentar),
        possuiDividasRelevantes: input.possui_dividas_relevantes ?? false,
        descricaoDividas: trimOrUndefined(input.descricao_dividas),
        vulnerabilidadesFamilia: trimOrUndefined(input.vulnerabilidades_familia),
        servicosAcompanhamento: trimOrUndefined(input.servicos_acompanhamento),
        tecnicoResponsavel: trimOrUndefined(input.tecnico_responsavel),
        periodicidadeAtendimento: trimOrUndefined(input.periodicidade_atendimento),
        proximaVisitaPrevista: toOptionalDate(input.proxima_visita_prevista),
        observacoes: trimOrUndefined(input.observacoes),
        criadoEm: now,
        atualizadoEm: now
    };
}
function mapMembroData(familiaId, membro, now) {
    return {
        vinculoFamiliarId: familiaId,
        beneficiarioId: toBigInt(membro.id_beneficiario),
        parentesco: trimOrUndefined(membro.parentesco),
        responsavelFamiliar: membro.responsavel_familiar ?? false,
        contribuiRenda: membro.contribui_renda ?? false,
        rendaIndividual: trimOrUndefined(membro.renda_individual),
        participaServicos: membro.participa_servicos ?? false,
        observacoes: trimOrUndefined(membro.observacoes),
        usaEnderecoFamilia: membro.usa_endereco_familia ?? true,
        criadoEm: now,
        atualizadoEm: now
    };
}
async function buscarFamiliaPorIdTransacao(tx, id) {
    const familia = (await tx.vinculoFamiliar.findUnique({
        where: { id },
        include: familiaInclude
    }));
    if (!familia) {
        throw new AppError("Familia nao encontrada.", 404);
    }
    return familia;
}
async function garantirBeneficiariosExistemTransacao(tx, ids) {
    if (!ids.length)
        return;
    const unicos = [...new Set(ids.map((id) => id.toString()))].map((id) => BigInt(id));
    const beneficiarios = (await tx.cadastroBeneficiario.findMany({
        where: { id: { in: unicos } },
        select: { id: true }
    }));
    if (beneficiarios.length !== unicos.length) {
        throw new AppError("Um ou mais beneficiarios informados nao foram encontrados.", 404);
    }
}
export class FamiliaRepository {
    async listar(filters) {
        const db = prisma;
        const where = {};
        const andFilters = [];
        const nome = trimOrUndefined(filters.nome_familia);
        if (nome) {
            andFilters.push({ nomeFamilia: { contains: nome, mode: "insensitive" } });
        }
        const municipio = trimOrUndefined(filters.municipio);
        if (municipio) {
            andFilters.push({ municipio: { contains: municipio, mode: "insensitive" } });
        }
        const status = trimOrUndefined(filters.status);
        if (status) {
            andFilters.push({ status });
        }
        const referencia = trimOrUndefined(filters.referencia);
        if (referencia) {
            andFilters.push({
                OR: [
                    {
                        referenciaFamiliar: {
                            nomeCompleto: { contains: referencia, mode: "insensitive" }
                        }
                    },
                    {
                        referenciaFamiliar: {
                            nomeSocial: { contains: referencia, mode: "insensitive" }
                        }
                    },
                    {
                        referenciaFamiliar: {
                            codigo: { contains: referencia, mode: "insensitive" }
                        }
                    }
                ]
            });
        }
        if (andFilters.length) {
            where.AND = andFilters;
        }
        return (await db.vinculoFamiliar.findMany({
            where,
            include: familiaInclude,
            orderBy: [{ nomeFamilia: "asc" }]
        }));
    }
    async buscarPorId(id) {
        const db = prisma;
        return (await db.vinculoFamiliar.findUnique({
            where: { id },
            include: familiaInclude
        }));
    }
    async buscarPorIdOuFalhar(id) {
        const familia = await this.buscarPorId(id);
        if (!familia) {
            throw new AppError("Familia nao encontrada.", 404);
        }
        return familia;
    }
    async criar(input) {
        const db = prisma;
        return db.$transaction(async (tx) => {
            const now = new Date();
            const referenciaId = input.id_referencia_familiar
                ? toBigInt(input.id_referencia_familiar)
                : undefined;
            const membrosIds = (input.membros ?? []).map((membro) => toBigInt(membro.id_beneficiario));
            const idsValidar = [...(referenciaId ? [referenciaId] : []), ...membrosIds];
            await garantirBeneficiariosExistemTransacao(tx, idsValidar);
            const familia = await tx.vinculoFamiliar.create({
                data: mapFamiliaData(input, now)
            });
            if (input.membros?.length) {
                await tx.vinculoFamiliarMembro.createMany({
                    data: input.membros.map((membro) => mapMembroData(familia.id, membro, now))
                });
            }
            return buscarFamiliaPorIdTransacao(tx, familia.id);
        });
    }
    async atualizar(id, input) {
        const db = prisma;
        return db.$transaction(async (tx) => {
            await buscarFamiliaPorIdTransacao(tx, id);
            const now = new Date();
            const referenciaId = input.id_referencia_familiar
                ? toBigInt(input.id_referencia_familiar)
                : undefined;
            const membrosIds = (input.membros ?? []).map((membro) => toBigInt(membro.id_beneficiario));
            const idsValidar = [...(referenciaId ? [referenciaId] : []), ...membrosIds];
            await garantirBeneficiariosExistemTransacao(tx, idsValidar);
            await tx.vinculoFamiliar.update({
                where: { id },
                data: {
                    ...mapFamiliaData(input, now),
                    criadoEm: undefined,
                    atualizadoEm: now
                }
            });
            if (input.membros) {
                await tx.vinculoFamiliarMembro.deleteMany({
                    where: { vinculoFamiliarId: id }
                });
                if (input.membros.length) {
                    await tx.vinculoFamiliarMembro.createMany({
                        data: input.membros.map((membro) => mapMembroData(id, membro, now))
                    });
                }
            }
            return buscarFamiliaPorIdTransacao(tx, id);
        });
    }
    async adicionarMembro(familiaId, input) {
        const db = prisma;
        return db.$transaction(async (tx) => {
            await buscarFamiliaPorIdTransacao(tx, familiaId);
            await garantirBeneficiariosExistemTransacao(tx, [toBigInt(input.id_beneficiario)]);
            const now = new Date();
            const existente = await tx.vinculoFamiliarMembro.findFirst({
                where: {
                    vinculoFamiliarId: familiaId,
                    beneficiarioId: toBigInt(input.id_beneficiario)
                }
            });
            if (existente) {
                await tx.vinculoFamiliarMembro.update({
                    where: { id: existente.id },
                    data: {
                        parentesco: trimOrUndefined(input.parentesco),
                        responsavelFamiliar: input.responsavel_familiar ?? false,
                        contribuiRenda: input.contribui_renda ?? false,
                        rendaIndividual: trimOrUndefined(input.renda_individual),
                        participaServicos: input.participa_servicos ?? false,
                        observacoes: trimOrUndefined(input.observacoes),
                        usaEnderecoFamilia: input.usa_endereco_familia ?? true,
                        atualizadoEm: now
                    }
                });
            }
            else {
                await tx.vinculoFamiliarMembro.create({
                    data: mapMembroData(familiaId, input, now)
                });
            }
            const totalMembros = await tx.vinculoFamiliarMembro.count({
                where: { vinculoFamiliarId: familiaId }
            });
            await tx.vinculoFamiliar.update({
                where: { id: familiaId },
                data: { qtdMembros: totalMembros, atualizadoEm: now }
            });
            return buscarFamiliaPorIdTransacao(tx, familiaId);
        });
    }
    async atualizarMembro(familiaId, membroId, input) {
        const db = prisma;
        return db.$transaction(async (tx) => {
            await buscarFamiliaPorIdTransacao(tx, familiaId);
            await garantirBeneficiariosExistemTransacao(tx, [toBigInt(input.id_beneficiario)]);
            const now = new Date();
            const membro = await tx.vinculoFamiliarMembro.findUnique({
                where: { id: membroId }
            });
            if (!membro || membro.vinculoFamiliarId !== familiaId) {
                throw new AppError("Membro nao pertence a familia informada.", 400);
            }
            await tx.vinculoFamiliarMembro.update({
                where: { id: membroId },
                data: {
                    beneficiarioId: toBigInt(input.id_beneficiario),
                    parentesco: trimOrUndefined(input.parentesco),
                    responsavelFamiliar: input.responsavel_familiar ?? false,
                    contribuiRenda: input.contribui_renda ?? false,
                    rendaIndividual: trimOrUndefined(input.renda_individual),
                    participaServicos: input.participa_servicos ?? false,
                    observacoes: trimOrUndefined(input.observacoes),
                    usaEnderecoFamilia: input.usa_endereco_familia ?? true,
                    atualizadoEm: now
                }
            });
            await tx.vinculoFamiliar.update({
                where: { id: familiaId },
                data: { atualizadoEm: now }
            });
            return buscarFamiliaPorIdTransacao(tx, familiaId);
        });
    }
    async removerMembro(familiaId, membroId) {
        const db = prisma;
        await db.$transaction(async (tx) => {
            await buscarFamiliaPorIdTransacao(tx, familiaId);
            const membro = await tx.vinculoFamiliarMembro.findUnique({
                where: { id: membroId }
            });
            if (!membro || membro.vinculoFamiliarId !== familiaId) {
                throw new AppError("Membro nao pertence a familia informada.", 400);
            }
            await tx.vinculoFamiliarMembro.delete({
                where: { id: membroId }
            });
            const totalMembros = await tx.vinculoFamiliarMembro.count({
                where: { vinculoFamiliarId: familiaId }
            });
            await tx.vinculoFamiliar.update({
                where: { id: familiaId },
                data: { qtdMembros: totalMembros, atualizadoEm: new Date() }
            });
        });
    }
}
