import type { Prisma } from "@prisma/client";
import { splitSemicolonList, toIsoDate, toStringId } from "../../utils/string-utils.js";

type BeneficiarioContatoRecord = {
  telefonePrincipal: string | null;
  telefonePrincipalWhatsapp: boolean | null;
  telefoneSecundario: string | null;
  telefoneRecadoNome: string | null;
  telefoneRecadoNumero: string | null;
  email: string | null;
  permiteContatoTel: boolean | null;
  permiteContatoWhatsapp: boolean | null;
  permiteContatoSms: boolean | null;
  permiteContatoEmail: boolean | null;
  horarioPreferencial: string | null;
};

export type BeneficiarioDbRecord = Prisma.CadastroBeneficiarioGetPayload<{
  include: {
    endereco: true;
    documentos: true;
    situacoesSociais: true;
    escolaridades: true;
    saudes: true;
    beneficios: true;
    observacoes: true;
  };
}> & { contatos: BeneficiarioContatoRecord[] };

function findDocByType(docs: BeneficiarioDbRecord["documentos"], type: string) {
  return docs.find((doc) => doc.tipoDocumento === type);
}

export function mapBeneficiarioToResponse(record: BeneficiarioDbRecord) {
  const contato = record.contatos[0];
  const situacao = record.situacoesSociais[0];
  const escolaridade = record.escolaridades[0];
  const saude = record.saudes[0];
  const beneficio = record.beneficios[0];
  const observacao = record.observacoes[0];
  const endereco = record.endereco;

  const docCpf = findDocByType(record.documentos, "CPF");
  const docRg = findDocByType(record.documentos, "RG");
  const docNis = findDocByType(record.documentos, "NIS");
  const docCertidao = findDocByType(record.documentos, "CERTIDAO");
  const docTitulo = findDocByType(record.documentos, "TITULO_ELEITOR");
  const docCnh = findDocByType(record.documentos, "CNH");
  const docCartaoSus = findDocByType(record.documentos, "CARTAO_SUS");

  const documentosObrigatorios = record.documentos
    .filter((doc) => doc.tipoDocumento === "ANEXO")
    .map((doc) => ({
      id: toStringId(doc.id),
      nome: doc.nomeDocumento ?? doc.tipoDocumento ?? "Documento",
      numeroDocumento: doc.numeroDocumento ?? undefined,
      nomeArquivo: doc.nomeArquivo ?? undefined,
      caminhoArquivo: doc.caminhoArquivo ?? undefined,
      contentType: doc.contentType ?? undefined,
      obrigatorio: doc.obrigatorio ?? true,
      ignorado:
        (doc.obrigatorio ?? true) === false &&
        !doc.nomeArquivo &&
        !doc.caminhoArquivo
    }));

  return {
    id_beneficiario: toStringId(record.id),
    codigo: record.codigo ?? undefined,
    nome_completo: record.nomeCompleto,
    nome_social: record.nomeSocial ?? undefined,
    apelido: record.apelido ?? undefined,
    data_nascimento: toIsoDate(record.dataNascimento),
    foto_3x4: record.foto3x4 ?? undefined,
    sexo_biologico: record.sexoBiologico ?? undefined,
    identidade_genero: record.identidadeGenero ?? undefined,
    cor_raca: record.corRaca ?? undefined,
    estado_civil: record.estadoCivil ?? undefined,
    nacionalidade: record.nacionalidade ?? undefined,
    naturalidade_cidade: record.naturalidadeCidade ?? undefined,
    naturalidade_uf: record.naturalidadeUf ?? undefined,
    nome_mae: record.nomeMae,
    nome_pai: record.nomePai ?? undefined,
    status: record.status ?? "EM_ANALISE",
    opta_receber_cesta_basica: record.optaReceberCestaBasica ?? undefined,
    apto_receber_cesta_basica: record.aptoReceberCestaBasica ?? undefined,
    cep: endereco?.cep ?? undefined,
    logradouro: endereco?.logradouro ?? undefined,
    numero: endereco?.numero ?? undefined,
    complemento: endereco?.complemento ?? undefined,
    bairro: endereco?.bairro ?? undefined,
    ponto_referencia: endereco?.pontoReferencia ?? undefined,
    municipio: endereco?.cidade ?? undefined,
    zona: endereco?.zona ?? undefined,
    subzona: endereco?.subzona ?? undefined,
    uf: endereco?.estado ?? undefined,
    latitude: endereco?.latitude?.toString() ?? undefined,
    longitude: endereco?.longitude?.toString() ?? undefined,
    telefone_principal: contato?.telefonePrincipal ?? undefined,
    telefone_principal_whatsapp: contato?.telefonePrincipalWhatsapp ?? undefined,
    telefone_secundario: contato?.telefoneSecundario ?? undefined,
    telefone_recado_nome: contato?.telefoneRecadoNome ?? undefined,
    telefone_recado_numero: contato?.telefoneRecadoNumero ?? undefined,
    email: contato?.email ?? undefined,
    permite_contato_tel: contato?.permiteContatoTel ?? undefined,
    permite_contato_whatsapp: contato?.permiteContatoWhatsapp ?? undefined,
    permite_contato_sms: contato?.permiteContatoSms ?? undefined,
    permite_contato_email: contato?.permiteContatoEmail ?? undefined,
    horario_preferencial_contato: contato?.horarioPreferencial ?? undefined,
    cpf: docCpf?.numeroDocumento ?? undefined,
    rg_numero: docRg?.numeroDocumento ?? undefined,
    rg_orgao_emissor: docRg?.orgaoEmissor ?? undefined,
    rg_uf: docRg?.ufEmissor ?? undefined,
    rg_data_emissao: toIsoDate(docRg?.dataEmissao),
    nis: docNis?.numeroDocumento ?? undefined,
    certidao_tipo: docCertidao?.nomeDocumento ?? undefined,
    certidao_livro: docCertidao?.livro ?? undefined,
    certidao_folha: docCertidao?.folha ?? undefined,
    certidao_termo: docCertidao?.termo ?? undefined,
    certidao_cartorio: docCertidao?.cartorio ?? undefined,
    certidao_municipio: docCertidao?.municipio ?? undefined,
    certidao_uf: docCertidao?.uf ?? undefined,
    titulo_eleitor: docTitulo?.numeroDocumento ?? undefined,
    cnh: docCnh?.numeroDocumento ?? undefined,
    cartao_sus: docCartaoSus?.numeroDocumento ?? undefined,
    mora_com_familia: situacao?.moraComFamilia ?? undefined,
    responsavel_legal: situacao?.responsavelLegal ?? undefined,
    vinculo_familiar: situacao?.vinculoFamiliar ?? undefined,
    situacao_vulnerabilidade: situacao?.situacaoVulnerabilidade ?? undefined,
    composicao_familiar: situacao?.composicaoFamiliar ?? undefined,
    criancas_adolescentes: situacao?.criancasAdolescentes ?? undefined,
    idosos: situacao?.idosos ?? undefined,
    acompanhamento_cras: situacao?.acompanhamentoCras ?? undefined,
    acompanhamento_saude: situacao?.acompanhamentoSaude ?? undefined,
    participa_comunidade: situacao?.participaComunidade ?? undefined,
    rede_apoio: situacao?.redeApoio ?? undefined,
    sabe_ler_escrever: escolaridade?.sabeLerEscrever ?? undefined,
    nivel_escolaridade: escolaridade?.nivelEscolaridade ?? undefined,
    estuda_atualmente: escolaridade?.estudaAtualmente ?? undefined,
    ocupacao: escolaridade?.ocupacao ?? undefined,
    situacao_trabalho: escolaridade?.situacaoTrabalho ?? undefined,
    local_trabalho: escolaridade?.localTrabalho ?? undefined,
    renda_mensal: escolaridade?.rendaMensal ?? undefined,
    fonte_renda: escolaridade?.fonteRenda ?? undefined,
    possui_deficiencia: saude?.possuiDeficiencia ?? undefined,
    tipo_deficiencia: saude?.tipoDeficiencia ?? undefined,
    cid_principal: saude?.cidPrincipal ?? undefined,
    usa_medicacao_continua: saude?.usaMedicacaoContinua ?? undefined,
    descricao_medicacao: saude?.descricaoMedicacao ?? undefined,
    servico_saude_referencia: saude?.servicoSaudeReferencia ?? undefined,
    recebe_beneficio: beneficio?.recebeBeneficio ?? undefined,
    beneficios_descricao: beneficio?.beneficiosDescricao ?? undefined,
    valor_total_beneficios: beneficio?.valorTotalBeneficios ?? undefined,
    beneficios_recebidos: splitSemicolonList(beneficio?.beneficiosRecebidos),
    aceite_lgpd: observacao?.aceiteLgpd ?? false,
    data_aceite_lgpd: toIsoDate(observacao?.dataAceiteLgpd),
    observacoes: observacao?.observacoes ?? undefined,
    documentos_obrigatorios: documentosObrigatorios,
    data_cadastro: record.criadoEm.toISOString(),
    data_atualizacao: record.atualizadoEm.toISOString()
  };
}
