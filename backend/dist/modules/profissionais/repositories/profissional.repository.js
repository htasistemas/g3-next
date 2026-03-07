import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { joinSemicolonList, normalizeDigits, toOptionalDate, trimOrUndefined } from "../../../utils/string-utils.js";
const profissionalInclude = {
    endereco: true
};
function hasAnyAddressData(input) {
    return !!(trimOrUndefined(input.cep) ||
        trimOrUndefined(input.logradouro) ||
        trimOrUndefined(input.numero) ||
        trimOrUndefined(input.complemento) ||
        trimOrUndefined(input.bairro) ||
        trimOrUndefined(input.ponto_referencia) ||
        trimOrUndefined(input.municipio) ||
        trimOrUndefined(input.uf) ||
        trimOrUndefined(input.zona) ||
        trimOrUndefined(input.subzona));
}
export class ProfissionalRepository {
    async listar(filters) {
        const where = {};
        const andFilters = [];
        const nome = trimOrUndefined(filters.nome);
        if (nome) {
            where.OR = [
                { nomeCompleto: { contains: nome, mode: "insensitive" } },
                { nomeSocial: { contains: nome, mode: "insensitive" } },
                { apelido: { contains: nome, mode: "insensitive" } },
                { especialidade: { contains: nome, mode: "insensitive" } }
            ];
        }
        const categoria = trimOrUndefined(filters.categoria);
        if (categoria) {
            andFilters.push({ categoria: { contains: categoria, mode: "insensitive" } });
        }
        const status = trimOrUndefined(filters.status);
        if (status) {
            andFilters.push({ status: status.toUpperCase() });
        }
        const cpf = normalizeDigits(filters.cpf);
        if (cpf) {
            andFilters.push({ cpf: { contains: cpf } });
        }
        const vinculo = trimOrUndefined(filters.vinculo);
        if (vinculo) {
            andFilters.push({ vinculo: { equals: vinculo, mode: "insensitive" } });
        }
        if (andFilters.length) {
            where.AND = andFilters;
        }
        return prisma.cadastroProfissional.findMany({
            where,
            include: profissionalInclude,
            orderBy: [{ nomeCompleto: "asc" }]
        });
    }
    async buscarPorId(id) {
        return prisma.cadastroProfissional.findUnique({
            where: { id },
            include: profissionalInclude
        });
    }
    async buscarPorIdOuFalhar(id) {
        const profissional = await this.buscarPorId(id);
        if (!profissional) {
            throw new AppError("Profissional nao encontrado.", 404);
        }
        return profissional;
    }
    async criar(input) {
        return prisma.$transaction(async (tx) => {
            const now = new Date();
            let enderecoId;
            if (hasAnyAddressData(input)) {
                const endereco = await tx.endereco.create({
                    data: {
                        cep: normalizeDigits(input.cep),
                        logradouro: trimOrUndefined(input.logradouro),
                        numero: trimOrUndefined(input.numero),
                        complemento: trimOrUndefined(input.complemento),
                        bairro: trimOrUndefined(input.bairro),
                        pontoReferencia: trimOrUndefined(input.ponto_referencia),
                        cidade: trimOrUndefined(input.municipio),
                        estado: trimOrUndefined(input.uf),
                        zona: trimOrUndefined(input.zona),
                        subzona: trimOrUndefined(input.subzona),
                        criadoEm: now,
                        atualizadoEm: now
                    }
                });
                enderecoId = endereco.id;
            }
            const profissional = await tx.cadastroProfissional.create({
                data: {
                    nomeCompleto: input.nome_completo,
                    cpf: normalizeDigits(input.cpf),
                    nomeSocial: trimOrUndefined(input.nome_social),
                    apelido: trimOrUndefined(input.apelido),
                    dataNascimento: toOptionalDate(input.data_nascimento),
                    foto3x4: trimOrUndefined(input.foto_3x4),
                    sexoBiologico: trimOrUndefined(input.sexo_biologico),
                    identidadeGenero: trimOrUndefined(input.identidade_genero),
                    corRaca: trimOrUndefined(input.cor_raca),
                    estadoCivil: trimOrUndefined(input.estado_civil),
                    nacionalidade: trimOrUndefined(input.nacionalidade),
                    naturalidadeCidade: trimOrUndefined(input.naturalidade_cidade),
                    naturalidadeUf: trimOrUndefined(input.naturalidade_uf),
                    nomeMae: trimOrUndefined(input.nome_mae),
                    nomePai: trimOrUndefined(input.nome_pai),
                    vinculo: trimOrUndefined(input.vinculo),
                    categoria: input.categoria,
                    registroConselho: trimOrUndefined(input.registro_conselho),
                    especialidade: trimOrUndefined(input.especialidade),
                    email: trimOrUndefined(input.email),
                    telefone: normalizeDigits(input.telefone),
                    unidade: trimOrUndefined(input.unidade),
                    salaAtendimento: trimOrUndefined(input.sala_atendimento),
                    cargaHoraria: input.carga_horaria,
                    disponibilidade: joinSemicolonList(input.disponibilidade),
                    canaisAtendimento: joinSemicolonList(input.canais_atendimento),
                    status: input.status ?? "EM_ANALISE",
                    tags: joinSemicolonList(input.tags),
                    resumo: trimOrUndefined(input.resumo),
                    observacoes: trimOrUndefined(input.observacoes),
                    enderecoId,
                    criadoEm: now,
                    atualizadoEm: now
                }
            });
            return this.buscarPorIdTransacao(tx, profissional.id);
        });
    }
    async atualizar(id, input) {
        return prisma.$transaction(async (tx) => {
            const existing = await tx.cadastroProfissional.findUnique({ where: { id } });
            if (!existing) {
                throw new AppError("Profissional nao encontrado.", 404);
            }
            const now = new Date();
            let enderecoId = existing.enderecoId;
            const possuiEndereco = hasAnyAddressData(input);
            if (possuiEndereco) {
                if (existing.enderecoId) {
                    await tx.endereco.update({
                        where: { id: existing.enderecoId },
                        data: {
                            cep: normalizeDigits(input.cep),
                            logradouro: trimOrUndefined(input.logradouro),
                            numero: trimOrUndefined(input.numero),
                            complemento: trimOrUndefined(input.complemento),
                            bairro: trimOrUndefined(input.bairro),
                            pontoReferencia: trimOrUndefined(input.ponto_referencia),
                            cidade: trimOrUndefined(input.municipio),
                            estado: trimOrUndefined(input.uf),
                            zona: trimOrUndefined(input.zona),
                            subzona: trimOrUndefined(input.subzona),
                            atualizadoEm: now
                        }
                    });
                }
                else {
                    const endereco = await tx.endereco.create({
                        data: {
                            cep: normalizeDigits(input.cep),
                            logradouro: trimOrUndefined(input.logradouro),
                            numero: trimOrUndefined(input.numero),
                            complemento: trimOrUndefined(input.complemento),
                            bairro: trimOrUndefined(input.bairro),
                            pontoReferencia: trimOrUndefined(input.ponto_referencia),
                            cidade: trimOrUndefined(input.municipio),
                            estado: trimOrUndefined(input.uf),
                            zona: trimOrUndefined(input.zona),
                            subzona: trimOrUndefined(input.subzona),
                            criadoEm: now,
                            atualizadoEm: now
                        }
                    });
                    enderecoId = endereco.id;
                }
            }
            else {
                enderecoId = null;
            }
            await tx.cadastroProfissional.update({
                where: { id },
                data: {
                    nomeCompleto: input.nome_completo,
                    cpf: normalizeDigits(input.cpf),
                    nomeSocial: trimOrUndefined(input.nome_social),
                    apelido: trimOrUndefined(input.apelido),
                    dataNascimento: toOptionalDate(input.data_nascimento),
                    foto3x4: trimOrUndefined(input.foto_3x4),
                    sexoBiologico: trimOrUndefined(input.sexo_biologico),
                    identidadeGenero: trimOrUndefined(input.identidade_genero),
                    corRaca: trimOrUndefined(input.cor_raca),
                    estadoCivil: trimOrUndefined(input.estado_civil),
                    nacionalidade: trimOrUndefined(input.nacionalidade),
                    naturalidadeCidade: trimOrUndefined(input.naturalidade_cidade),
                    naturalidadeUf: trimOrUndefined(input.naturalidade_uf),
                    nomeMae: trimOrUndefined(input.nome_mae),
                    nomePai: trimOrUndefined(input.nome_pai),
                    vinculo: trimOrUndefined(input.vinculo),
                    categoria: input.categoria,
                    registroConselho: trimOrUndefined(input.registro_conselho),
                    especialidade: trimOrUndefined(input.especialidade),
                    email: trimOrUndefined(input.email),
                    telefone: normalizeDigits(input.telefone),
                    unidade: trimOrUndefined(input.unidade),
                    salaAtendimento: trimOrUndefined(input.sala_atendimento),
                    cargaHoraria: input.carga_horaria,
                    disponibilidade: joinSemicolonList(input.disponibilidade),
                    canaisAtendimento: joinSemicolonList(input.canais_atendimento),
                    status: input.status ?? existing.status ?? "EM_ANALISE",
                    tags: joinSemicolonList(input.tags),
                    resumo: trimOrUndefined(input.resumo),
                    observacoes: trimOrUndefined(input.observacoes),
                    enderecoId,
                    atualizadoEm: now
                }
            });
            return this.buscarPorIdTransacao(tx, id);
        });
    }
    async remover(id) {
        await this.buscarPorIdOuFalhar(id);
        await prisma.cadastroProfissional.delete({ where: { id } });
    }
    async buscarPorIdTransacao(tx, id) {
        const profissional = await tx.cadastroProfissional.findUnique({
            where: { id },
            include: profissionalInclude
        });
        if (!profissional) {
            throw new AppError("Profissional nao encontrado.", 404);
        }
        return profissional;
    }
}
