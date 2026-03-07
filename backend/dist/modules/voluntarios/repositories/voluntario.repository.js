import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { joinSemicolonList, normalizeDigits, toOptionalDate, trimOrUndefined } from "../../../utils/string-utils.js";
const voluntarioInclude = {
    endereco: true,
    profissional: {
        select: {
            id: true,
            nomeCompleto: true,
            categoria: true
        }
    }
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
function toBigIntOrUndefined(value) {
    if (!value || !Number.isInteger(value) || value <= 0)
        return undefined;
    return BigInt(value);
}
async function validarProfissional(tx, profissionalId) {
    if (!profissionalId)
        return;
    const profissional = await tx.cadastroProfissional.findUnique({
        where: { id: profissionalId },
        select: { id: true }
    });
    if (!profissional) {
        throw new AppError("Profissional vinculado nao encontrado.", 404);
    }
}
export class VoluntarioRepository {
    async listar(filters) {
        const where = {};
        const andFilters = [];
        const nome = trimOrUndefined(filters.nome);
        if (nome) {
            where.OR = [
                { nomeCompleto: { contains: nome, mode: "insensitive" } },
                {
                    profissional: {
                        is: {
                            nomeCompleto: { contains: nome, mode: "insensitive" }
                        }
                    }
                }
            ];
        }
        const status = trimOrUndefined(filters.status);
        if (status) {
            andFilters.push({ status: status.toUpperCase() });
        }
        const cpf = normalizeDigits(filters.cpf);
        if (cpf) {
            andFilters.push({ cpf: { contains: cpf } });
        }
        const email = trimOrUndefined(filters.email);
        if (email) {
            andFilters.push({ email: { contains: email, mode: "insensitive" } });
        }
        if (andFilters.length) {
            where.AND = andFilters;
        }
        return prisma.cadastroVoluntario.findMany({
            where,
            include: voluntarioInclude,
            orderBy: [{ nomeCompleto: "asc" }]
        });
    }
    async buscarPorId(id) {
        return prisma.cadastroVoluntario.findUnique({
            where: { id },
            include: voluntarioInclude
        });
    }
    async buscarPorIdOuFalhar(id) {
        const voluntario = await this.buscarPorId(id);
        if (!voluntario) {
            throw new AppError("Voluntario nao encontrado.", 404);
        }
        return voluntario;
    }
    async criar(input) {
        return prisma.$transaction(async (tx) => {
            const now = new Date();
            let enderecoId;
            const profissionalId = toBigIntOrUndefined(input.profissional_id);
            await validarProfissional(tx, profissionalId);
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
            const voluntario = await tx.cadastroVoluntario.create({
                data: {
                    profissionalId,
                    nomeCompleto: input.nome_completo,
                    cpf: normalizeDigits(input.cpf) ?? "",
                    rg: trimOrUndefined(input.rg),
                    foto3x4: trimOrUndefined(input.foto_3x4),
                    enderecoId,
                    dataNascimento: toOptionalDate(input.data_nascimento),
                    genero: trimOrUndefined(input.genero),
                    profissao: trimOrUndefined(input.profissao),
                    motivacao: trimOrUndefined(input.motivacao),
                    telefone: normalizeDigits(input.telefone),
                    email: input.email,
                    cidade: trimOrUndefined(input.cidade),
                    estado: trimOrUndefined(input.estado),
                    areaInteresse: trimOrUndefined(input.area_interesse),
                    habilidades: trimOrUndefined(input.habilidades),
                    idiomas: trimOrUndefined(input.idiomas),
                    linkedin: trimOrUndefined(input.linkedin),
                    status: input.status ?? "ATIVO",
                    disponibilidadeDias: joinSemicolonList(input.disponibilidade_dias),
                    disponibilidadePeriodos: joinSemicolonList(input.disponibilidade_periodos),
                    cargaHorariaSemanal: trimOrUndefined(input.carga_horaria_semanal),
                    presencial: input.presencial ?? false,
                    remoto: input.remoto ?? false,
                    inicioPrevisto: toOptionalDate(input.inicio_previsto),
                    observacoes: trimOrUndefined(input.observacoes),
                    documentoIdentificacao: trimOrUndefined(input.documento_identificacao),
                    comprovanteEndereco: trimOrUndefined(input.comprovante_endereco),
                    aceiteVoluntariado: input.aceite_voluntariado ?? false,
                    aceiteImagem: input.aceite_imagem ?? false,
                    assinaturaDigital: trimOrUndefined(input.assinatura_digital),
                    criadoEm: now,
                    atualizadoEm: now
                }
            });
            return this.buscarPorIdTransacao(tx, voluntario.id);
        });
    }
    async atualizar(id, input) {
        return prisma.$transaction(async (tx) => {
            const existing = await tx.cadastroVoluntario.findUnique({
                where: { id }
            });
            if (!existing) {
                throw new AppError("Voluntario nao encontrado.", 404);
            }
            const now = new Date();
            let enderecoId = existing.enderecoId;
            const possuiEndereco = hasAnyAddressData(input);
            const profissionalId = toBigIntOrUndefined(input.profissional_id);
            await validarProfissional(tx, profissionalId);
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
            await tx.cadastroVoluntario.update({
                where: { id },
                data: {
                    profissionalId,
                    nomeCompleto: input.nome_completo,
                    cpf: normalizeDigits(input.cpf) ?? existing.cpf,
                    rg: trimOrUndefined(input.rg),
                    foto3x4: trimOrUndefined(input.foto_3x4),
                    enderecoId,
                    dataNascimento: toOptionalDate(input.data_nascimento),
                    genero: trimOrUndefined(input.genero),
                    profissao: trimOrUndefined(input.profissao),
                    motivacao: trimOrUndefined(input.motivacao),
                    telefone: normalizeDigits(input.telefone),
                    email: input.email,
                    cidade: trimOrUndefined(input.cidade),
                    estado: trimOrUndefined(input.estado),
                    areaInteresse: trimOrUndefined(input.area_interesse),
                    habilidades: trimOrUndefined(input.habilidades),
                    idiomas: trimOrUndefined(input.idiomas),
                    linkedin: trimOrUndefined(input.linkedin),
                    status: input.status ?? existing.status ?? "ATIVO",
                    disponibilidadeDias: joinSemicolonList(input.disponibilidade_dias),
                    disponibilidadePeriodos: joinSemicolonList(input.disponibilidade_periodos),
                    cargaHorariaSemanal: trimOrUndefined(input.carga_horaria_semanal),
                    presencial: input.presencial ?? false,
                    remoto: input.remoto ?? false,
                    inicioPrevisto: toOptionalDate(input.inicio_previsto),
                    observacoes: trimOrUndefined(input.observacoes),
                    documentoIdentificacao: trimOrUndefined(input.documento_identificacao),
                    comprovanteEndereco: trimOrUndefined(input.comprovante_endereco),
                    aceiteVoluntariado: input.aceite_voluntariado ?? false,
                    aceiteImagem: input.aceite_imagem ?? false,
                    assinaturaDigital: trimOrUndefined(input.assinatura_digital),
                    atualizadoEm: now
                }
            });
            return this.buscarPorIdTransacao(tx, id);
        });
    }
    async remover(id) {
        await this.buscarPorIdOuFalhar(id);
        await prisma.cadastroVoluntario.delete({ where: { id } });
    }
    async buscarPorIdTransacao(tx, id) {
        const voluntario = await tx.cadastroVoluntario.findUnique({
            where: { id },
            include: voluntarioInclude
        });
        if (!voluntario) {
            throw new AppError("Voluntario nao encontrado.", 404);
        }
        return voluntario;
    }
}
