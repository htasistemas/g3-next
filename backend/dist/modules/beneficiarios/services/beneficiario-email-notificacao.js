const CAMPOS_IGNORADOS = new Set(["id_beneficiario", "data_cadastro", "data_atualizacao"]);
const LABELS = {
    codigo: "Código",
    nome_completo: "Nome completo",
    nome_social: "Nome social",
    apelido: "Apelido",
    data_nascimento: "Data de nascimento",
    foto_3x4: "Foto 3x4",
    sexo_biologico: "Sexo biológico",
    identidade_genero: "Identidade de gênero",
    cor_raca: "Cor ou raça",
    estado_civil: "Estado civil",
    nacionalidade: "Nacionalidade",
    naturalidade_cidade: "Naturalidade cidade",
    naturalidade_uf: "Naturalidade UF",
    nome_mae: "Nome da mãe",
    nome_pai: "Nome do pai",
    status: "Status",
    opta_receber_cesta_basica: "Opta receber cesta básica",
    apto_receber_cesta_basica: "Apto receber cesta básica",
    cep: "CEP",
    logradouro: "Logradouro",
    numero: "Número",
    complemento: "Complemento",
    bairro: "Bairro",
    ponto_referencia: "Ponto de referência",
    municipio: "Município",
    zona: "Zona",
    subzona: "Subzona",
    uf: "UF",
    latitude: "Latitude",
    longitude: "Longitude",
    telefone_principal: "Telefone principal",
    telefone_principal_whatsapp: "Telefone principal WhatsApp",
    telefone_secundario: "Telefone secundário",
    telefone_recado_nome: "Telefone recado nome",
    telefone_recado_numero: "Telefone recado número",
    email: "E-mail",
    permite_contato_tel: "Permite contato por telefone",
    permite_contato_whatsapp: "Permite contato por WhatsApp",
    permite_contato_sms: "Permite contato por SMS",
    permite_contato_email: "Permite contato por e-mail",
    horario_preferencial_contato: "Horário preferencial de contato",
    cpf: "CPF",
    rg_numero: "RG número",
    rg_orgao_emissor: "RG órgão emissor",
    rg_uf: "RG UF",
    rg_data_emissao: "RG data de emissão",
    nis: "NIS",
    certidao_tipo: "Certidão tipo",
    certidao_livro: "Certidão livro",
    certidao_folha: "Certidão folha",
    certidao_termo: "Certidão termo",
    certidao_cartorio: "Certidão cartório",
    certidao_municipio: "Certidão município",
    certidao_uf: "Certidão UF",
    titulo_eleitor: "Título de eleitor",
    cnh: "CNH",
    cartao_sus: "Cartão SUS",
    mora_com_familia: "Mora com família",
    responsavel_legal: "Responsável legal",
    vinculo_familiar: "Vínculo familiar",
    situacao_vulnerabilidade: "Situação de vulnerabilidade",
    composicao_familiar: "Composição familiar",
    criancas_adolescentes: "Crianças e adolescentes",
    idosos: "Idosos",
    acompanhamento_cras: "Acompanhamento CRAS",
    acompanhamento_saude: "Acompanhamento saúde",
    participa_comunidade: "Participa comunidade",
    rede_apoio: "Rede de apoio",
    sabe_ler_escrever: "Sabe ler e escrever",
    nivel_escolaridade: "Nível de escolaridade",
    estuda_atualmente: "Estuda atualmente",
    ocupacao: "Ocupação",
    situacao_trabalho: "Situação de trabalho",
    local_trabalho: "Local de trabalho",
    renda_mensal: "Renda mensal",
    fonte_renda: "Fonte de renda",
    possui_deficiencia: "Possui deficiência",
    tipo_deficiencia: "Tipo de deficiência",
    cid_principal: "CID principal",
    usa_medicacao_continua: "Usa medicação contínua",
    descricao_medicacao: "Descrição da medicação",
    servico_saude_referencia: "Serviço de saúde de referência",
    recebe_beneficio: "Recebe benefício",
    beneficios_descricao: "Benefícios descrição",
    valor_total_beneficios: "Valor total benefícios",
    beneficios_recebidos: "Benefícios recebidos",
    aceite_lgpd: "Aceite LGPD",
    data_aceite_lgpd: "Data aceite LGPD",
    observacoes: "Observações",
    documentos_obrigatorios: "Documentos obrigatórios"
};
function formatarLabel(campo) {
    return LABELS[campo] ?? campo.replace(/_/g, " ").replace(/^\w/, (char) => char.toUpperCase());
}
function formatarDocumento(documento) {
    if (!documento || typeof documento !== "object") {
        return "";
    }
    const item = documento;
    const nome = typeof item.nome === "string" ? item.nome.trim() : "";
    const nomeArquivo = typeof item.nomeArquivo === "string" ? item.nomeArquivo.trim() : "";
    if (!nome && !nomeArquivo) {
        return "";
    }
    if (!nome) {
        return nomeArquivo;
    }
    if (!nomeArquivo) {
        return nome;
    }
    return `${nome} (${nomeArquivo})`;
}
function formatarValor(valor, campo) {
    if (valor == null) {
        return "Não informado";
    }
    if (typeof valor === "string") {
        const normalizado = valor.trim();
        return normalizado || "Não informado";
    }
    if (typeof valor === "boolean") {
        return valor ? "Sim" : "Não";
    }
    if (Array.isArray(valor)) {
        const itens = valor
            .map((item) => campo === "documentos_obrigatorios" ? formatarDocumento(item) : String(item ?? "").trim())
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b));
        return itens.length ? itens.join(", ") : "Não informado";
    }
    return String(valor);
}
export function montarResumoAlteracoesBeneficiario(anterior, atual) {
    const campos = new Set([...Object.keys(anterior), ...Object.keys(atual)]);
    return [...campos]
        .filter((campo) => !CAMPOS_IGNORADOS.has(campo))
        .sort((a, b) => formatarLabel(a).localeCompare(formatarLabel(b)))
        .map((campo) => {
        const valorAnterior = formatarValor(anterior[campo], campo);
        const valorAtual = formatarValor(atual[campo], campo);
        if (valorAnterior === valorAtual) {
            return null;
        }
        return `${formatarLabel(campo)}: de "${valorAnterior}" para "${valorAtual}".`;
    })
        .filter((item) => Boolean(item));
}
export function obterDestinatariosAlteracaoBeneficiario(anterior, atual) {
    const destinatarios = new Set();
    for (const origem of [atual, anterior]) {
        const email = typeof origem.email === "string" ? origem.email.trim().toLowerCase() : "";
        if (email) {
            destinatarios.add(email);
        }
    }
    return [...destinatarios];
}
export function montarMensagemAlteracoesBeneficiario(atual, alteracoes) {
    const nome = formatarValor(atual.nome_completo);
    const codigo = formatarValor(atual.codigo);
    return [
        `Olá, ${nome}.`,
        "",
        "Seu cadastro de beneficiário foi atualizado automaticamente no G3 Next.",
        `Código: ${codigo}`,
        "",
        "Alterações realizadas:",
        ...alteracoes.map((item) => `- ${item}`),
        "",
        "Este e-mail foi gerado automaticamente pelo sistema."
    ].join("\n");
}
