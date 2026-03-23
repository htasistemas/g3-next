import { Prisma } from "@prisma/client";
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
const estruturaSql = [
    `
    CREATE TABLE IF NOT EXISTS familia_historico (
      id BIGSERIAL PRIMARY KEY,
      familia_id BIGINT NOT NULL,
      tipo_evento VARCHAR(80) NOT NULL,
      descricao TEXT NOT NULL,
      dados_anteriores JSONB,
      dados_novos JSONB,
      justificativa TEXT,
      usuario_nome VARCHAR(150),
      data_evento TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `,
    "CREATE INDEX IF NOT EXISTS familia_historico_familia_idx ON familia_historico(familia_id, data_evento DESC)",
    `
    CREATE TABLE IF NOT EXISTS beneficios_parametros (
      id BIGSERIAL PRIMARY KEY,
      beneficio_nome VARCHAR(180) NOT NULL UNIQUE,
      controla_por_familia BOOLEAN NOT NULL DEFAULT FALSE,
      carencia_em_dias INTEGER NOT NULL DEFAULT 0,
      bloquear_duplicidade BOOLEAN NOT NULL DEFAULT FALSE,
      permitir_excecao_com_justificativa BOOLEAN NOT NULL DEFAULT FALSE,
      status VARCHAR(30) NOT NULL DEFAULT 'ATIVO',
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `,
    `
    INSERT INTO beneficios_parametros (
      beneficio_nome,
      controla_por_familia,
      carencia_em_dias,
      bloquear_duplicidade,
      permitir_excecao_com_justificativa,
      status
    )
    SELECT 'Cesta básica', TRUE, 30, TRUE, TRUE, 'ATIVO'
    WHERE NOT EXISTS (
      SELECT 1 FROM beneficios_parametros WHERE LOWER(beneficio_nome) = LOWER('Cesta básica')
    )
  `
];
let estruturaPromise = null;
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
function normalizarEnderecoFamiliaOrigem(origem) {
    if (!origem)
        return null;
    const endereco = {
        cep: trimOrUndefined(origem.cep),
        logradouro: trimOrUndefined(origem.logradouro),
        numero: trimOrUndefined(origem.numero),
        complemento: trimOrUndefined(origem.complemento),
        bairro: trimOrUndefined(origem.bairro),
        ponto_referencia: trimOrUndefined(origem.ponto_referencia),
        municipio: trimOrUndefined(origem.municipio),
        uf: trimOrUndefined(origem.uf)?.toUpperCase(),
        zona: trimOrUndefined(origem.zona)
    };
    return Object.values(endereco).some(Boolean) ? endereco : null;
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
async function garantirEstrutura() {
    if (!estruturaPromise) {
        estruturaPromise = (async () => {
            for (const comando of estruturaSql) {
                await prisma.$executeRawUnsafe(comando);
            }
        })();
    }
    await estruturaPromise;
}
async function obterEnderecoResponsavelTransacao(tx, beneficiarioId) {
    if (!beneficiarioId)
        return null;
    const beneficiario = await tx.cadastroBeneficiario.findUnique({
        where: { id: beneficiarioId },
        include: { endereco: true }
    });
    return normalizarEnderecoFamiliaOrigem(beneficiario?.endereco
        ? {
            cep: beneficiario.endereco.cep,
            logradouro: beneficiario.endereco.logradouro,
            numero: beneficiario.endereco.numero,
            complemento: beneficiario.endereco.complemento,
            bairro: beneficiario.endereco.bairro,
            ponto_referencia: beneficiario.endereco.pontoReferencia,
            municipio: beneficiario.endereco.cidade,
            uf: beneficiario.endereco.estado,
            zona: beneficiario.endereco.zona
        }
        : null);
}
export class FamiliaRepository {
    async sincronizarEnderecoBeneficiario(tx, beneficiarioId, endereco) {
        const beneficiario = await tx.cadastroBeneficiario.findUnique({
            where: { id: beneficiarioId },
            select: { enderecoId: true }
        });
        if (!beneficiario) {
            return;
        }
        const now = new Date();
        if (beneficiario.enderecoId) {
            await tx.endereco.update({
                where: { id: beneficiario.enderecoId },
                data: {
                    cep: endereco.cep ?? null,
                    logradouro: endereco.logradouro ?? null,
                    numero: endereco.numero ?? null,
                    complemento: endereco.complemento ?? null,
                    bairro: endereco.bairro ?? null,
                    pontoReferencia: endereco.ponto_referencia ?? null,
                    cidade: endereco.municipio ?? null,
                    estado: endereco.uf ?? null,
                    zona: endereco.zona ?? null,
                    atualizadoEm: now
                }
            });
            return;
        }
        const created = await tx.endereco.create({
            data: {
                cep: endereco.cep ?? null,
                logradouro: endereco.logradouro ?? null,
                numero: endereco.numero ?? null,
                complemento: endereco.complemento ?? null,
                bairro: endereco.bairro ?? null,
                pontoReferencia: endereco.ponto_referencia ?? null,
                cidade: endereco.municipio ?? null,
                estado: endereco.uf ?? null,
                zona: endereco.zona ?? null,
                criadoEm: now,
                atualizadoEm: now
            }
        });
        await tx.cadastroBeneficiario.update({
            where: { id: beneficiarioId },
            data: { enderecoId: created.id, atualizadoEm: now }
        });
    }
    async resolverEnderecoPrincipal(tx, input, referenciaId) {
        const enderecoInformado = normalizarEnderecoFamiliaOrigem({
            cep: input.cep,
            logradouro: input.logradouro,
            numero: input.numero,
            complemento: input.complemento,
            bairro: input.bairro,
            ponto_referencia: input.ponto_referencia,
            municipio: input.municipio,
            uf: input.uf,
            zona: input.zona
        });
        if (enderecoInformado) {
            return enderecoInformado;
        }
        return obterEnderecoResponsavelTransacao(tx, referenciaId);
    }
    async sincronizarEnderecoFamiliarNosMembros(tx, membros, endereco) {
        if (!endereco)
            return;
        for (const membro of membros) {
            if (membro.usa_endereco_familia === false) {
                continue;
            }
            await this.sincronizarEnderecoBeneficiario(tx, toBigInt(membro.id_beneficiario), endereco);
        }
    }
    async listar(filters) {
        await garantirEstrutura();
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
        await garantirEstrutura();
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
        await garantirEstrutura();
        const db = prisma;
        return db.$transaction(async (tx) => {
            const now = new Date();
            const referenciaId = input.id_referencia_familiar
                ? toBigInt(input.id_referencia_familiar)
                : undefined;
            const enderecoPrincipal = await this.resolverEnderecoPrincipal(tx, input, referenciaId);
            const membrosIds = (input.membros ?? []).map((membro) => toBigInt(membro.id_beneficiario));
            const idsValidar = [...(referenciaId ? [referenciaId] : []), ...membrosIds];
            await garantirBeneficiariosExistemTransacao(tx, idsValidar);
            await this.validarMembrosFamiliaAtiva(tx, idsValidar);
            const familia = await tx.vinculoFamiliar.create({
                data: {
                    ...mapFamiliaData(input, now),
                    ...(enderecoPrincipal
                        ? {
                            cep: enderecoPrincipal.cep ?? null,
                            logradouro: enderecoPrincipal.logradouro ?? null,
                            numero: enderecoPrincipal.numero ?? null,
                            complemento: enderecoPrincipal.complemento ?? null,
                            bairro: enderecoPrincipal.bairro ?? null,
                            pontoReferencia: enderecoPrincipal.ponto_referencia ?? null,
                            municipio: enderecoPrincipal.municipio ?? null,
                            uf: enderecoPrincipal.uf ?? null,
                            zona: enderecoPrincipal.zona ?? null
                        }
                        : {})
                }
            });
            if (input.membros?.length) {
                await tx.vinculoFamiliarMembro.createMany({
                    data: input.membros.map((membro) => mapMembroData(familia.id, membro, now))
                });
                await this.sincronizarEnderecoFamiliarNosMembros(tx, input.membros, enderecoPrincipal);
            }
            await this.registrarHistorico(tx, familia.id, "familia_criada", "Família criada.", null, input);
            return buscarFamiliaPorIdTransacao(tx, familia.id);
        });
    }
    async atualizar(id, input) {
        await garantirEstrutura();
        const db = prisma;
        return db.$transaction(async (tx) => {
            const anterior = await buscarFamiliaPorIdTransacao(tx, id);
            const now = new Date();
            const referenciaId = input.id_referencia_familiar
                ? toBigInt(input.id_referencia_familiar)
                : undefined;
            const enderecoPrincipal = await this.resolverEnderecoPrincipal(tx, input, referenciaId);
            const membrosIds = (input.membros ?? []).map((membro) => toBigInt(membro.id_beneficiario));
            const idsValidar = [...(referenciaId ? [referenciaId] : []), ...membrosIds];
            await garantirBeneficiariosExistemTransacao(tx, idsValidar);
            await this.validarMembrosFamiliaAtiva(tx, idsValidar, id);
            await tx.vinculoFamiliar.update({
                where: { id },
                data: {
                    ...mapFamiliaData(input, now),
                    ...(enderecoPrincipal
                        ? {
                            cep: enderecoPrincipal.cep ?? null,
                            logradouro: enderecoPrincipal.logradouro ?? null,
                            numero: enderecoPrincipal.numero ?? null,
                            complemento: enderecoPrincipal.complemento ?? null,
                            bairro: enderecoPrincipal.bairro ?? null,
                            pontoReferencia: enderecoPrincipal.ponto_referencia ?? null,
                            municipio: enderecoPrincipal.municipio ?? null,
                            uf: enderecoPrincipal.uf ?? null,
                            zona: enderecoPrincipal.zona ?? null
                        }
                        : {}),
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
                    await this.sincronizarEnderecoFamiliarNosMembros(tx, input.membros, enderecoPrincipal);
                }
            }
            await this.registrarHistorico(tx, id, "familia_atualizada", "Dados da família atualizados.", anterior, input);
            return buscarFamiliaPorIdTransacao(tx, id);
        });
    }
    async adicionarMembro(familiaId, input) {
        await garantirEstrutura();
        const db = prisma;
        return db.$transaction(async (tx) => {
            await buscarFamiliaPorIdTransacao(tx, familiaId);
            await garantirBeneficiariosExistemTransacao(tx, [toBigInt(input.id_beneficiario)]);
            await this.validarMembrosFamiliaAtiva(tx, [toBigInt(input.id_beneficiario)], familiaId);
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
            if (input.usa_endereco_familia !== false) {
                const familiaAtualizada = await buscarFamiliaPorIdTransacao(tx, familiaId);
                const enderecoPrincipal = normalizarEnderecoFamiliaOrigem({
                    cep: familiaAtualizada.cep ?? undefined,
                    logradouro: familiaAtualizada.logradouro ?? undefined,
                    numero: familiaAtualizada.numero ?? undefined,
                    complemento: familiaAtualizada.complemento ?? undefined,
                    bairro: familiaAtualizada.bairro ?? undefined,
                    ponto_referencia: familiaAtualizada.pontoReferencia ?? undefined,
                    municipio: familiaAtualizada.municipio ?? undefined,
                    uf: familiaAtualizada.uf ?? undefined,
                    zona: familiaAtualizada.zona ?? undefined
                });
                if (enderecoPrincipal) {
                    await this.sincronizarEnderecoBeneficiario(tx, toBigInt(input.id_beneficiario), enderecoPrincipal);
                }
            }
            const totalMembros = await tx.vinculoFamiliarMembro.count({
                where: { vinculoFamiliarId: familiaId }
            });
            await tx.vinculoFamiliar.update({
                where: { id: familiaId },
                data: { qtdMembros: totalMembros, atualizadoEm: now }
            });
            await this.registrarHistorico(tx, familiaId, "membro_adicionado", "Membro adicionado à família.", null, input);
            return buscarFamiliaPorIdTransacao(tx, familiaId);
        });
    }
    async atualizarMembro(familiaId, membroId, input) {
        await garantirEstrutura();
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
            await this.validarMembrosFamiliaAtiva(tx, [toBigInt(input.id_beneficiario)], familiaId);
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
            if (input.usa_endereco_familia !== false) {
                const familiaAtualizada = await buscarFamiliaPorIdTransacao(tx, familiaId);
                const enderecoPrincipal = normalizarEnderecoFamiliaOrigem({
                    cep: familiaAtualizada.cep ?? undefined,
                    logradouro: familiaAtualizada.logradouro ?? undefined,
                    numero: familiaAtualizada.numero ?? undefined,
                    complemento: familiaAtualizada.complemento ?? undefined,
                    bairro: familiaAtualizada.bairro ?? undefined,
                    ponto_referencia: familiaAtualizada.pontoReferencia ?? undefined,
                    municipio: familiaAtualizada.municipio ?? undefined,
                    uf: familiaAtualizada.uf ?? undefined,
                    zona: familiaAtualizada.zona ?? undefined
                });
                if (enderecoPrincipal) {
                    await this.sincronizarEnderecoBeneficiario(tx, toBigInt(input.id_beneficiario), enderecoPrincipal);
                }
            }
            await tx.vinculoFamiliar.update({
                where: { id: familiaId },
                data: { atualizadoEm: now }
            });
            await this.registrarHistorico(tx, familiaId, "membro_atualizado", "Membro da família atualizado.", membro, input);
            return buscarFamiliaPorIdTransacao(tx, familiaId);
        });
    }
    async removerMembro(familiaId, membroId) {
        await garantirEstrutura();
        const db = prisma;
        await db.$transaction(async (tx) => {
            const familia = await buscarFamiliaPorIdTransacao(tx, familiaId);
            const membro = await tx.vinculoFamiliarMembro.findUnique({
                where: { id: membroId }
            });
            if (!membro || membro.vinculoFamiliarId !== familiaId) {
                throw new AppError("Membro nao pertence a familia informada.", 400);
            }
            if (familia.membros.length <= 1) {
                throw new AppError("Nao e permitido remover o ultimo membro da familia.", 400);
            }
            if (membro.responsavelFamiliar) {
                throw new AppError("Defina outro responsavel antes de remover o responsavel familiar.", 400);
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
            await this.registrarHistorico(tx, familiaId, "membro_removido", "Membro removido da família.", membro, null);
        });
    }
    async remover(familiaId) {
        await garantirEstrutura();
        await prisma.$transaction(async (tx) => {
            const familia = await buscarFamiliaPorIdTransacao(tx, familiaId);
            await tx.vinculoFamiliar.update({
                where: { id: familiaId },
                data: { status: "INATIVO", atualizadoEm: new Date() }
            });
            await this.registrarHistorico(tx, familiaId, "familia_inativada", "Família inativada.", familia, { status: "INATIVO" });
        });
    }
    async listarHistorico(familiaId) {
        await garantirEstrutura();
        await this.buscarPorIdOuFalhar(familiaId);
        const rows = await prisma.$queryRaw(Prisma.sql `
      SELECT id, tipo_evento, descricao, justificativa, usuario_nome, data_evento
      FROM familia_historico
      WHERE familia_id = ${familiaId}
      ORDER BY data_evento DESC, id DESC
    `);
        return rows.map((row) => ({
            id: String(row.id ?? ""),
            tipo_evento: String(row.tipo_evento ?? ""),
            descricao: String(row.descricao ?? ""),
            justificativa: row.justificativa ? String(row.justificativa) : undefined,
            usuario_nome: row.usuario_nome ? String(row.usuario_nome) : undefined,
            data_evento: row.data_evento instanceof Date ? row.data_evento.toISOString() : String(row.data_evento ?? "")
        }));
    }
    async listarAlertas(familiaId) {
        await garantirEstrutura();
        const familia = await this.buscarPorIdOuFalhar(familiaId);
        const alertas = [];
        const responsaveis = familia.membros.filter((membro) => Boolean(membro.responsavelFamiliar));
        if (responsaveis.length !== 1) {
            alertas.push({
                prioridade: "alta",
                titulo: "Responsável inconsistente",
                descricao: "A família deve possuir exatamente um responsável familiar ativo."
            });
        }
        if ((familia.qtdMembros ?? familia.membros.length) !== familia.membros.length) {
            alertas.push({
                prioridade: "media",
                titulo: "Quantidade de membros divergente",
                descricao: "A quantidade registrada não confere com os vínculos ativos da família."
            });
        }
        if (familia.membros.some((membro) => !trimOrUndefined(membro.parentesco))) {
            alertas.push({
                prioridade: "media",
                titulo: "Parentesco pendente",
                descricao: "Existe membro sem parentesco informado."
            });
        }
        if (familia.membros.some((membro) => !(membro.usaEnderecoFamilia ?? true))) {
            alertas.push({
                prioridade: "baixa",
                titulo: "Endereço divergente",
                descricao: "Existe pelo menos um membro com endereço próprio."
            });
        }
        return alertas;
    }
    async definirResponsavel(familiaId, beneficiarioId) {
        await garantirEstrutura();
        return prisma.$transaction(async (tx) => {
            const familia = await buscarFamiliaPorIdTransacao(tx, familiaId);
            const alvo = familia.membros.find((membro) => membro.beneficiarioId === beneficiarioId);
            if (!alvo) {
                throw new AppError("O responsável deve pertencer à família.", 400);
            }
            await tx.vinculoFamiliarMembro.updateMany({
                where: { vinculoFamiliarId: familiaId },
                data: { responsavelFamiliar: false, atualizadoEm: new Date() }
            });
            await tx.vinculoFamiliarMembro.update({
                where: { id: alvo.id },
                data: { responsavelFamiliar: true, parentesco: "Responsável familiar", atualizadoEm: new Date() }
            });
            await tx.vinculoFamiliar.update({
                where: { id: familiaId },
                data: { idReferenciaFamiliar: beneficiarioId, atualizadoEm: new Date() }
            });
            const familiaSemEndereco = !normalizarEnderecoFamiliaOrigem({
                cep: familia.cep ?? undefined,
                logradouro: familia.logradouro ?? undefined,
                numero: familia.numero ?? undefined,
                complemento: familia.complemento ?? undefined,
                bairro: familia.bairro ?? undefined,
                ponto_referencia: familia.pontoReferencia ?? undefined,
                municipio: familia.municipio ?? undefined,
                uf: familia.uf ?? undefined,
                zona: familia.zona ?? undefined
            });
            if (familiaSemEndereco) {
                const enderecoResponsavel = await obterEnderecoResponsavelTransacao(tx, beneficiarioId);
                if (enderecoResponsavel) {
                    await tx.vinculoFamiliar.update({
                        where: { id: familiaId },
                        data: {
                            cep: enderecoResponsavel.cep ?? null,
                            logradouro: enderecoResponsavel.logradouro ?? null,
                            numero: enderecoResponsavel.numero ?? null,
                            complemento: enderecoResponsavel.complemento ?? null,
                            bairro: enderecoResponsavel.bairro ?? null,
                            pontoReferencia: enderecoResponsavel.ponto_referencia ?? null,
                            municipio: enderecoResponsavel.municipio ?? null,
                            uf: enderecoResponsavel.uf ?? null,
                            zona: enderecoResponsavel.zona ?? null,
                            atualizadoEm: new Date()
                        }
                    });
                    await this.sincronizarEnderecoFamiliarNosMembros(tx, familia.membros.map((membro) => ({
                        id_beneficiario: Number(membro.beneficiarioId),
                        usa_endereco_familia: membro.usaEnderecoFamilia ?? true
                    })), enderecoResponsavel);
                }
            }
            await this.registrarHistorico(tx, familiaId, "responsavel_alterado", "Responsável familiar alterado.", null, { beneficiario_id: String(beneficiarioId) });
            return buscarFamiliaPorIdTransacao(tx, familiaId);
        });
    }
    async atualizarEndereco(familiaId, input) {
        await garantirEstrutura();
        return prisma.$transaction(async (tx) => {
            const familia = await buscarFamiliaPorIdTransacao(tx, familiaId);
            await tx.vinculoFamiliar.update({
                where: { id: familiaId },
                data: {
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
                    observacoes: trimOrUndefined(input.observacoes) ?? familia.observacoes,
                    atualizadoEm: new Date()
                }
            });
            const enderecoPrincipal = normalizarEnderecoFamiliaOrigem(input);
            if (enderecoPrincipal) {
                await this.sincronizarEnderecoFamiliarNosMembros(tx, familia.membros.map((membro) => ({
                    id_beneficiario: Number(membro.beneficiarioId),
                    usa_endereco_familia: membro.usaEnderecoFamilia ?? true
                })), enderecoPrincipal);
            }
            await this.registrarHistorico(tx, familiaId, "endereco_alterado", "Endereço familiar alterado.", familia, input);
            return buscarFamiliaPorIdTransacao(tx, familiaId);
        });
    }
    async validarBeneficioFamiliar(familiaId, beneficioNome, carenciaDias) {
        await garantirEstrutura();
        const rows = await prisma.$queryRaw(Prisma.sql `
      SELECT d.data_doacao, b.nome_completo
      FROM doacao_realizada d
      LEFT JOIN cadastro_beneficiario b ON b.id = d.beneficiario_id
      LEFT JOIN doacao_realizada_item di ON di.doacao_realizada_id = d.id
      WHERE d.vinculo_familiar_id = ${familiaId}
        AND (
          LOWER(COALESCE(d.tipo_doacao, '')) LIKE LOWER(${`%${beneficioNome}%`})
          OR LOWER(COALESCE(di.descricao_item, '')) LIKE LOWER(${`%${beneficioNome}%`})
        )
      ORDER BY d.data_doacao DESC
      LIMIT 1
    `);
        const ultima = rows[0];
        const data = ultima?.data_doacao ? new Date(String(ultima.data_doacao)) : null;
        const dias = data ? Math.floor((Date.now() - data.getTime()) / 86400000) : null;
        const parametroRows = await prisma.$queryRaw(Prisma.sql `
      SELECT *
      FROM beneficios_parametros
      WHERE LOWER(beneficio_nome) = LOWER(${beneficioNome})
      LIMIT 1
    `);
        const parametro = parametroRows[0];
        const carencia = Number(parametro?.carencia_em_dias ?? carenciaDias ?? (/cesta/i.test(beneficioNome) ? 30 : 0));
        const controlaPorFamilia = Boolean(parametro?.controla_por_familia ?? /cesta/i.test(beneficioNome));
        const bloquear = Boolean(parametro?.bloquear_duplicidade ?? /cesta/i.test(beneficioNome));
        const permitirExcecao = Boolean(parametro?.permitir_excecao_com_justificativa ?? /cesta/i.test(beneficioNome));
        const emCarencia = dias !== null && dias < carencia;
        return {
            controla_por_familia: controlaPorFamilia,
            carencia_em_dias: carencia,
            bloquear_duplicidade: bloquear,
            permitir_excecao_com_justificativa: permitirExcecao,
            bloqueado: controlaPorFamilia && bloquear && emCarencia,
            alerta: Boolean(ultima),
            mensagem: ultima
                ? `Já existe ${beneficioNome} registrado para esta família em ${data?.toLocaleDateString("pt-BR")}, vinculado a ${String(ultima.nome_completo ?? "membro não identificado")}.`
                : undefined
        };
    }
    async transferirMembro(familiaOrigemId, input) {
        await garantirEstrutura();
        return prisma.$transaction(async (tx) => {
            const familiaOrigem = await buscarFamiliaPorIdTransacao(tx, familiaOrigemId);
            const membro = familiaOrigem.membros.find((item) => item.id === BigInt(input.id_membro));
            if (!membro) {
                throw new AppError("Membro não encontrado na família de origem.", 404);
            }
            if (membro.responsavelFamiliar) {
                throw new AppError("Defina outro responsável antes de transferir o responsável familiar.", 400);
            }
            const familiaDestinoId = BigInt(input.familia_destino_id);
            await buscarFamiliaPorIdTransacao(tx, familiaDestinoId);
            await this.validarMembrosFamiliaAtiva(tx, [membro.beneficiarioId], familiaDestinoId);
            await tx.vinculoFamiliarMembro.delete({ where: { id: membro.id } });
            await tx.vinculoFamiliarMembro.create({
                data: {
                    vinculoFamiliarId: familiaDestinoId,
                    beneficiarioId: membro.beneficiarioId,
                    parentesco: trimOrUndefined(input.parentesco) ?? membro.parentesco,
                    responsavelFamiliar: input.responsavel_familiar ?? false,
                    contribuiRenda: membro.contribuiRenda ?? false,
                    rendaIndividual: membro.rendaIndividual,
                    participaServicos: membro.participaServicos ?? false,
                    observacoes: membro.observacoes,
                    usaEnderecoFamilia: membro.usaEnderecoFamilia ?? true,
                    criadoEm: new Date(),
                    atualizadoEm: new Date()
                }
            });
            const totalOrigem = await tx.vinculoFamiliarMembro.count({ where: { vinculoFamiliarId: familiaOrigemId } });
            const totalDestino = await tx.vinculoFamiliarMembro.count({ where: { vinculoFamiliarId: familiaDestinoId } });
            await tx.vinculoFamiliar.update({ where: { id: familiaOrigemId }, data: { qtdMembros: totalOrigem, atualizadoEm: new Date() } });
            await tx.vinculoFamiliar.update({ where: { id: familiaDestinoId }, data: { qtdMembros: totalDestino, atualizadoEm: new Date() } });
            await this.registrarHistorico(tx, familiaOrigemId, "transferencia_de_membro", "Membro transferido para outra família.", membro, input);
            await this.registrarHistorico(tx, familiaDestinoId, "membro_adicionado", "Membro recebido por transferência.", null, input);
            return {
                familia_origem: await buscarFamiliaPorIdTransacao(tx, familiaOrigemId),
                familia_destino: await buscarFamiliaPorIdTransacao(tx, familiaDestinoId)
            };
        });
    }
    async desmembrarFamilia(familiaOrigemId, input) {
        await garantirEstrutura();
        return prisma.$transaction(async (tx) => {
            const familiaOrigem = await buscarFamiliaPorIdTransacao(tx, familiaOrigemId);
            const idsSelecionados = new Set(input.membro_ids.map((id) => String(id)));
            const membrosSelecionados = familiaOrigem.membros.filter((item) => idsSelecionados.has(String(item.id)));
            if (!membrosSelecionados.length) {
                throw new AppError("Selecione pelo menos um membro para desmembrar.", 400);
            }
            if (!membrosSelecionados.some((item) => item.beneficiarioId === BigInt(input.novo_responsavel_id))) {
                throw new AppError("O novo responsável deve estar entre os membros selecionados.", 400);
            }
            if (membrosSelecionados.some((item) => item.responsavelFamiliar)) {
                throw new AppError("Defina outro responsável na família original antes do desmembramento.", 400);
            }
            const endereco = (input.copiar_endereco_familiar ?? true)
                ? {
                    cep: familiaOrigem.cep,
                    logradouro: familiaOrigem.logradouro,
                    numero: familiaOrigem.numero,
                    complemento: familiaOrigem.complemento,
                    bairro: familiaOrigem.bairro,
                    ponto_referencia: familiaOrigem.pontoReferencia,
                    municipio: familiaOrigem.municipio,
                    uf: familiaOrigem.uf,
                    zona: familiaOrigem.zona
                }
                : input.endereco ?? {};
            const novaFamilia = await tx.vinculoFamiliar.create({
                data: {
                    nomeFamilia: input.nome_familia,
                    idReferenciaFamiliar: BigInt(input.novo_responsavel_id),
                    status: "ATIVO",
                    cep: trimOrUndefined(String(endereco.cep ?? "")),
                    logradouro: trimOrUndefined(String(endereco.logradouro ?? "")),
                    numero: trimOrUndefined(String(endereco.numero ?? "")),
                    complemento: trimOrUndefined(String(endereco.complemento ?? "")),
                    bairro: trimOrUndefined(String(endereco.bairro ?? "")),
                    pontoReferencia: trimOrUndefined(String(endereco.ponto_referencia ?? "")),
                    municipio: trimOrUndefined(String(endereco.municipio ?? "")),
                    uf: trimOrUndefined(String(endereco.uf ?? "")),
                    zona: trimOrUndefined(String(endereco.zona ?? "")),
                    criadoEm: new Date(),
                    atualizadoEm: new Date(),
                    qtdMembros: membrosSelecionados.length,
                    observacoes: trimOrUndefined(input.observacoes)
                }
            });
            for (const membro of membrosSelecionados) {
                await tx.vinculoFamiliarMembro.delete({ where: { id: membro.id } });
                await tx.vinculoFamiliarMembro.create({
                    data: {
                        vinculoFamiliarId: novaFamilia.id,
                        beneficiarioId: membro.beneficiarioId,
                        parentesco: membro.beneficiarioId === BigInt(input.novo_responsavel_id) ? "Responsável familiar" : membro.parentesco,
                        responsavelFamiliar: membro.beneficiarioId === BigInt(input.novo_responsavel_id),
                        contribuiRenda: membro.contribuiRenda ?? false,
                        rendaIndividual: membro.rendaIndividual,
                        participaServicos: membro.participaServicos ?? false,
                        observacoes: membro.observacoes,
                        usaEnderecoFamilia: membro.usaEnderecoFamilia ?? true,
                        criadoEm: new Date(),
                        atualizadoEm: new Date()
                    }
                });
            }
            const totalOrigem = await tx.vinculoFamiliarMembro.count({ where: { vinculoFamiliarId: familiaOrigemId } });
            await tx.vinculoFamiliar.update({ where: { id: familiaOrigemId }, data: { qtdMembros: totalOrigem, atualizadoEm: new Date() } });
            await this.registrarHistorico(tx, familiaOrigemId, "familia_desmembrada", "Família desmembrada.", null, input);
            await this.registrarHistorico(tx, novaFamilia.id, "familia_criada", "Nova família criada por desmembramento.", null, input);
            return {
                familia_origem: await buscarFamiliaPorIdTransacao(tx, familiaOrigemId),
                familia_nova: await buscarFamiliaPorIdTransacao(tx, novaFamilia.id)
            };
        });
    }
    async validarMembrosFamiliaAtiva(tx, ids, familiaAtualId) {
        for (const beneficiarioId of ids) {
            const rows = await tx.$queryRaw(Prisma.sql `
        SELECT vf.id, vf.nome_familia
        FROM vinculo_familiar_membro m
        INNER JOIN vinculo_familiar vf ON vf.id = m.vinculo_familiar_id
        WHERE m.beneficiario_id = ${beneficiarioId}
          AND vf.status = 'ATIVO'
          ${familiaAtualId ? Prisma.sql `AND vf.id <> ${familiaAtualId}` : Prisma.empty}
        LIMIT 1
      `);
            if (rows[0]) {
                throw new AppError(`O beneficiário já pertence à família ativa ${String(rows[0].nome_familia ?? "")}.`, 400);
            }
        }
    }
    async registrarHistorico(tx, familiaId, tipoEvento, descricao, dadosAnteriores, dadosNovos) {
        await tx.$executeRaw(Prisma.sql `
      INSERT INTO familia_historico (
        familia_id, tipo_evento, descricao, dados_anteriores, dados_novos, data_evento
      ) VALUES (
        ${familiaId},
        ${tipoEvento},
        ${descricao},
        ${dadosAnteriores ? JSON.stringify(dadosAnteriores) : null}::jsonb,
        ${dadosNovos ? JSON.stringify(dadosNovos) : null}::jsonb,
        NOW()
      )
    `);
    }
}
