import { toIsoDate, toStringId } from "../../utils/string-utils.js";
function mapBeneficiarioResumo(beneficiario) {
    if (!beneficiario) {
        return null;
    }
    const cpf = beneficiario.documentos[0]?.numeroDocumento ?? undefined;
    const telefonePrincipal = beneficiario.contatos[0]?.telefonePrincipal ?? undefined;
    const bairro = beneficiario.endereco?.bairro ?? undefined;
    return {
        id_beneficiario: toStringId(beneficiario.id),
        codigo: beneficiario.codigo ?? undefined,
        nome_completo: beneficiario.nomeCompleto,
        nome_social: beneficiario.nomeSocial ?? undefined,
        cpf,
        telefone_principal: telefonePrincipal,
        bairro,
        data_nascimento: toIsoDate(beneficiario.dataNascimento)
    };
}
export function mapFamiliaToResponse(record) {
    return {
        id_familia: toStringId(record.id),
        nome_familia: record.nomeFamilia,
        id_referencia_familiar: record.idReferenciaFamiliar
            ? toStringId(record.idReferenciaFamiliar)
            : undefined,
        referencia_familiar: mapBeneficiarioResumo(record.referenciaFamiliar),
        status: record.status,
        cep: record.cep ?? undefined,
        logradouro: record.logradouro ?? undefined,
        numero: record.numero ?? undefined,
        complemento: record.complemento ?? undefined,
        bairro: record.bairro ?? undefined,
        ponto_referencia: record.pontoReferencia ?? undefined,
        municipio: record.municipio ?? undefined,
        uf: record.uf ?? undefined,
        zona: record.zona ?? undefined,
        situacao_imovel: record.situacaoImovel ?? undefined,
        tipo_moradia: record.tipoMoradia ?? undefined,
        agua_encanada: record.aguaEncanada ?? false,
        esgoto_tipo: record.esgotoTipo ?? undefined,
        coleta_lixo: record.coletaLixo ?? undefined,
        energia_eletrica: record.energiaEletrica ?? false,
        internet: record.internet ?? false,
        arranjo_familiar: record.arranjoFamiliar ?? undefined,
        qtd_membros: record.qtdMembros ?? undefined,
        qtd_criancas: record.qtdCriancas ?? undefined,
        qtd_adolescentes: record.qtdAdolescentes ?? undefined,
        qtd_idosos: record.qtdIdosos ?? undefined,
        qtd_pessoas_deficiencia: record.qtdPessoasDeficiencia ?? undefined,
        renda_familiar_total: record.rendaFamiliarTotal ?? undefined,
        renda_per_capita: record.rendaPerCapita ?? undefined,
        faixa_renda_per_capita: record.faixaRendaPerCapita ?? undefined,
        principais_fontes_renda: record.principaisFontesRenda ?? undefined,
        situacao_inseguranca_alimentar: record.situacaoInsegurancaAlimentar ?? undefined,
        possui_dividas_relevantes: record.possuiDividasRelevantes ?? false,
        descricao_dividas: record.descricaoDividas ?? undefined,
        vulnerabilidades_familia: record.vulnerabilidadesFamilia ?? undefined,
        servicos_acompanhamento: record.servicosAcompanhamento ?? undefined,
        tecnico_responsavel: record.tecnicoResponsavel ?? undefined,
        periodicidade_atendimento: record.periodicidadeAtendimento ?? undefined,
        proxima_visita_prevista: toIsoDate(record.proximaVisitaPrevista),
        observacoes: record.observacoes ?? undefined,
        membros: record.membros.map((membro) => ({
            id_familia_membro: toStringId(membro.id),
            id_beneficiario: toStringId(membro.beneficiarioId),
            parentesco: membro.parentesco ?? undefined,
            responsavel_familiar: membro.responsavelFamiliar ?? false,
            contribui_renda: membro.contribuiRenda ?? false,
            renda_individual: membro.rendaIndividual ?? undefined,
            participa_servicos: membro.participaServicos ?? false,
            observacoes: membro.observacoes ?? undefined,
            usa_endereco_familia: membro.usaEnderecoFamilia ?? true,
            beneficiario: mapBeneficiarioResumo(membro.beneficiario)
        })),
        data_cadastro: record.criadoEm.toISOString(),
        data_atualizacao: record.atualizadoEm.toISOString()
    };
}
