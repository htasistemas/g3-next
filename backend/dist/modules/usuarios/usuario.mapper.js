const permissaoCatalogoFixo = {
    ADMINISTRADOR: {
        modulo: "Configuracoes gerais",
        tela: "Usuarios",
        acao: "Acesso total"
    },
    OPERADOR: {
        modulo: "Operacao",
        tela: "Cadastros",
        acao: "Operar modulo"
    },
    LEITURA_APENAS: {
        modulo: "Operacao",
        tela: "Consultas",
        acao: "Somente leitura"
    },
    CHAMADO_TECNICO_DESENVOLVIMENTO: {
        modulo: "Configuracoes gerais",
        tela: "Chamado tecnico",
        acao: "Desenvolvimento"
    },
    CONFIG_ATUALIZAR_SISTEMA: {
        modulo: "Configuracoes gerais",
        tela: "Atualizar sistema",
        acao: "Atualizar sistema"
    },
    CONFIG_ALTERAR_MODO_ATUALIZACAO: {
        modulo: "Configuracoes gerais",
        tela: "Atualizar sistema",
        acao: "Alterar modo"
    },
    CONFIG_EXECUTAR_ROLLBACK: {
        modulo: "Configuracoes gerais",
        tela: "Atualizar sistema",
        acao: "Executar rollback"
    }
};
function limparTexto(valor) {
    if (!valor)
        return undefined;
    const trimmed = valor.trim();
    return trimmed.length ? trimmed : undefined;
}
function mapStatus(valor) {
    const status = limparTexto(valor)?.toUpperCase();
    if (status === "BLOQUEADO")
        return "BLOQUEADO";
    if (status === "INATIVO")
        return "INATIVO";
    return "ATIVO";
}
function mapOrigemTipo(valor) {
    const origem = limparTexto(valor)?.toUpperCase();
    if (origem === "BENEFICIARIO" || origem === "PROFISSIONAL" || origem === "VOLUNTARIO") {
        return origem;
    }
    return undefined;
}
function toInteger(valor) {
    if (typeof valor === "bigint")
        return Number(valor);
    if (typeof valor === "number")
        return valor;
    return 0;
}
function toTitleCase(valor) {
    const texto = valor
        .toLowerCase()
        .replaceAll("_", " ")
        .trim();
    if (!texto.length)
        return "";
    return texto.charAt(0).toUpperCase() + texto.slice(1);
}
function mapPermissaoMeta(nomePermissao) {
    const nome = nomePermissao.trim().toUpperCase();
    const fixo = permissaoCatalogoFixo[nome];
    if (fixo) {
        return {
            nome,
            ...fixo
        };
    }
    const partes = nome.split("_").filter(Boolean);
    if (partes.length >= 2) {
        const [modulo, ...resto] = partes;
        return {
            nome,
            modulo: toTitleCase(modulo),
            tela: resto.length > 1 ? toTitleCase(resto.slice(0, -1).join("_")) : toTitleCase(modulo),
            acao: toTitleCase(resto[resto.length - 1] ?? "Acesso")
        };
    }
    return {
        nome,
        modulo: "Sistema",
        tela: "Geral",
        acao: toTitleCase(nome)
    };
}
function resolverPerfilAcesso(permissoes) {
    if (!permissoes.length)
        return undefined;
    if (permissoes.includes("ADMINISTRADOR"))
        return "ADMINISTRADOR";
    if (permissoes.includes("OPERADOR"))
        return "OPERADOR";
    if (permissoes.includes("LEITURA_APENAS"))
        return "LEITURA_APENAS";
    return permissoes[0];
}
export function mapUsuarioRowParaResponse(row) {
    const permissoes = (row.permissoes ?? []).filter(Boolean).map((item) => item.trim()).filter(Boolean);
    return {
        id_usuario: row.id.toString(),
        nome_completo: limparTexto(row.nome),
        nome_exibicao: limparTexto(row.nome_exibicao),
        nome_usuario: row.nome_usuario,
        email: limparTexto(row.email),
        telefone: limparTexto(row.telefone),
        cpf: limparTexto(row.cpf),
        matricula: limparTexto(row.matricula),
        setor: limparTexto(row.setor),
        unidade: limparTexto(row.unidade),
        cargo: limparTexto(row.cargo),
        perfil_acesso: resolverPerfilAcesso(permissoes),
        permissoes,
        status: mapStatus(row.status),
        exigir_troca_senha: !!row.exigir_troca_senha,
        tentativas_login_invalidas: toInteger(row.tentativas_login_invalidas),
        ultimo_login_invalido_em: row.ultimo_login_invalido_em?.toISOString(),
        ultimo_acesso_em: row.ultimo_acesso_em?.toISOString(),
        origem_tipo: mapOrigemTipo(row.origem_tipo),
        origem_id: limparTexto(row.origem_id),
        origem_nome: limparTexto(row.origem_nome),
        criado_em: row.criado_em.toISOString(),
        atualizado_em: row.atualizado_em.toISOString()
    };
}
export function mapAuditoriaRowParaResponse(row) {
    return {
        id: row.id,
        acao: row.acao,
        usuario_id: row.usuario_id ? row.usuario_id.toString() : undefined,
        usuario_nome: limparTexto(row.usuario_nome),
        dados_json: row.dados_json && typeof row.dados_json === "object"
            ? row.dados_json
            : null,
        criado_em: row.criado_em.toISOString()
    };
}
export function mapPermissoesParaCatalogo(permissoes) {
    return permissoes
        .map((item) => item.trim().toUpperCase())
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b))
        .map(mapPermissaoMeta);
}
