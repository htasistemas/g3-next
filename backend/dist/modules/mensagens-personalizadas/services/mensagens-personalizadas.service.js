import { env } from "../../../config/env.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { EmailService } from "../../email/services/email.service.js";
import { mensagemDestinatarioBuscaSchema, mensagemEnvioInputSchema, mensagemHistoricoFiltrosSchema, mensagemModeloFiltrosSchema, mensagemModeloInputSchema, mensagemPreviewInputSchema, mensagemTaxonomiaInputSchema } from "../mensagens-personalizadas.schema.js";
import { MensagensPersonalizadasRepository, ensureMensagensPersonalizadasEstrutura } from "../repositories/mensagens-personalizadas.repository.js";
const placeholdersDisponiveis = [
    { chave: "nome", rotulo: "Nome", descricao: "Primeiro nome do destinatário.", exemplo: "Maria" },
    {
        chave: "nome_completo",
        rotulo: "Nome completo",
        descricao: "Nome completo do destinatário.",
        exemplo: "Maria da Silva"
    },
    {
        chave: "primeiro_nome",
        rotulo: "Primeiro nome",
        descricao: "Primeira palavra do nome do destinatário.",
        exemplo: "Maria"
    },
    { chave: "cpf", rotulo: "CPF", descricao: "Documento principal do destinatário.", exemplo: "000.000.000-00" },
    { chave: "email", rotulo: "E-mail", descricao: "E-mail do destinatário.", exemplo: "contato@dominio.com" },
    { chave: "telefone", rotulo: "Telefone", descricao: "Telefone principal do destinatário.", exemplo: "(34) 99999-0000" },
    { chave: "data", rotulo: "Data", descricao: "Data atual formatada em pt-BR.", exemplo: "10/03/2026" },
    { chave: "hora", rotulo: "Hora", descricao: "Hora atual.", exemplo: "14:35" },
    { chave: "instituicao", rotulo: "Instituição", descricao: "Instituição ou unidade relacionada.", exemplo: "Projeto Vida" },
    { chave: "curso", rotulo: "Curso", descricao: "Curso vinculado ao contexto do envio.", exemplo: "Informática básica" },
    { chave: "atendimento", rotulo: "Atendimento", descricao: "Descrição resumida do atendimento.", exemplo: "Atendimento social" },
    { chave: "setor", rotulo: "Setor", descricao: "Setor vinculado ao destinatário ou ao envio.", exemplo: "RH" },
    { chave: "cargo", rotulo: "Cargo", descricao: "Cargo ou função do destinatário.", exemplo: "Assistente social" },
    {
        chave: "data_registro",
        rotulo: "Data do registro",
        descricao: "Data de criação do cadastro relacionado.",
        exemplo: "05/03/2026"
    },
    {
        chave: "usuario_responsavel",
        rotulo: "Usuário responsável",
        descricao: "Usuário autenticado que preparou o envio.",
        exemplo: "admin"
    },
    {
        chave: "valor_doacao",
        rotulo: "Valor da doação",
        descricao: "Valor informado no contexto do envio.",
        exemplo: "R$ 120,00"
    },
    {
        chave: "descricao_doacao",
        rotulo: "Descrição da doação",
        descricao: "Texto descritivo de doação ou item.",
        exemplo: "Cesta básica"
    },
    { chave: "livro", rotulo: "Livro", descricao: "Livro relacionado ao contexto.", exemplo: "Dom Casmurro" },
    {
        chave: "emprestimo",
        rotulo: "Empréstimo",
        descricao: "Resumo do empréstimo relacionado.",
        exemplo: "Empréstimo 00012"
    },
    {
        chave: "observacao",
        rotulo: "Observação",
        descricao: "Observação adicional do contexto ou do cadastro.",
        exemplo: "Favor comparecer com documento."
    }
];
const taxonomiasBase = [
    { tipo: "CATEGORIA", nome: "Boas-vindas", descricao: "Mensagens de recepção.", status: "ATIVA" },
    { tipo: "CATEGORIA", nome: "Lembretes", descricao: "Mensagens de lembrete.", status: "ATIVA" },
    { tipo: "CATEGORIA", nome: "Agradecimentos", descricao: "Mensagens de agradecimento.", status: "ATIVA" },
    { tipo: "CATEGORIA", nome: "Comprovantes", descricao: "Mensagens comprobatórias.", status: "ATIVA" },
    { tipo: "CATEGORIA", nome: "Comunicados gerais", descricao: "Mensagens administrativas.", status: "ATIVA" },
    { tipo: "CATEGORIA", nome: "Avisos internos", descricao: "Mensagens internas.", status: "ATIVA" },
    { tipo: "ASSUNTO", nome: "Boas-vindas", descricao: "Assuntos de boas-vindas.", status: "ATIVA" },
    { tipo: "ASSUNTO", nome: "Lembrete de atendimento", descricao: "Assuntos de lembrete.", status: "ATIVA" },
    { tipo: "ASSUNTO", nome: "Agradecimento por doação", descricao: "Assuntos de doação.", status: "ATIVA" },
    { tipo: "ASSUNTO", nome: "Comprovante", descricao: "Assuntos de comprovante.", status: "ATIVA" },
    { tipo: "ASSUNTO", nome: "Comunicado geral", descricao: "Assuntos gerais.", status: "ATIVA" },
    { tipo: "ASSUNTO", nome: "Confirmação de agendamento", descricao: "Assuntos de agenda.", status: "ATIVA" },
    { tipo: "ASSUNTO", nome: "Cancelamento", descricao: "Assuntos de cancelamento.", status: "ATIVA" },
    { tipo: "TIPO_COMUNICACAO", nome: "Atendimento", descricao: "Fluxos de atendimento.", status: "ATIVA" },
    { tipo: "TIPO_COMUNICACAO", nome: "Cadastro", descricao: "Fluxos cadastrais.", status: "ATIVA" },
    { tipo: "TIPO_COMUNICACAO", nome: "Doação", descricao: "Fluxos de doação.", status: "ATIVA" },
    { tipo: "TIPO_COMUNICACAO", nome: "Biblioteca", descricao: "Fluxos da biblioteca.", status: "ATIVA" },
    { tipo: "TIPO_COMUNICACAO", nome: "RH", descricao: "Fluxos de RH.", status: "ATIVA" },
    { tipo: "TIPO_COMUNICACAO", nome: "Projetos", descricao: "Fluxos de projetos e oficinas.", status: "ATIVA" },
    { tipo: "TIPO_COMUNICACAO", nome: "Geral", descricao: "Fluxos gerais.", status: "ATIVA" },
    { tipo: "TAG", nome: "Atendimento", descricao: "Tag geral de atendimento.", status: "ATIVA" },
    { tipo: "TAG", nome: "Doação", descricao: "Tag geral de doação.", status: "ATIVA" },
    { tipo: "TAG", nome: "Biblioteca", descricao: "Tag geral de biblioteca.", status: "ATIVA" },
    { tipo: "TAG", nome: "Cadastro", descricao: "Tag geral de cadastro.", status: "ATIVA" },
    { tipo: "TAG", nome: "RH", descricao: "Tag geral de RH.", status: "ATIVA" }
];
function parseJsonArray(value) {
    if (!value)
        return [];
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
    }
    catch {
        return [];
    }
}
function formatarDataPtBr(valor) {
    if (!valor)
        return "";
    const date = valor instanceof Date ? valor : new Date(valor);
    if (Number.isNaN(date.getTime()))
        return "";
    return date.toLocaleDateString("pt-BR");
}
function limparTelefoneWhatsapp(telefone) {
    if (!telefone)
        return "";
    const digits = telefone.replace(/\D/g, "");
    if (!digits)
        return "";
    if (digits.startsWith("55"))
        return digits;
    if (digits.length === 10 || digits.length === 11)
        return `55${digits}`;
    return digits;
}
function mapTaxonomia(row) {
    return {
        id: row.id.toString(),
        tipo: row.tipo,
        nome: row.nome,
        descricao: row.descricao ?? undefined,
        status: row.status,
        ordem: row.ordem,
        criado_em: row.criado_em.toISOString(),
        atualizado_em: row.atualizado_em.toISOString()
    };
}
function deduplicarStrings(valores) {
    return Array.from(new Set(valores.map((item) => item.trim()).filter(Boolean)));
}
function mapModelo(row) {
    const canais = deduplicarStrings(parseJsonArray(row.canais_json));
    const destinatarios = deduplicarStrings(parseJsonArray(row.destinatarios_json));
    const canalPermitido = canais.includes("WHATSAPP") && canais.includes("EMAIL")
        ? "AMBOS"
        : canais[0] ?? "WHATSAPP";
    return {
        id: row.id.toString(),
        titulo: row.titulo,
        assunto: row.assunto ?? undefined,
        categoriaId: row.categoria_id ? row.categoria_id.toString() : undefined,
        categoria: row.categoria_nome ?? undefined,
        assuntoId: row.assunto_id ? row.assunto_id.toString() : undefined,
        assuntoNome: row.assunto_nome ?? undefined,
        tipoComunicacaoId: row.tipo_comunicacao_id ? row.tipo_comunicacao_id.toString() : undefined,
        tipoComunicacao: row.tipo_comunicacao_nome ?? undefined,
        tiposDestinatario: destinatarios,
        canalPermitido,
        canaisPermitidos: canais,
        mensagemBase: row.mensagem_base,
        variaveisPermitidas: deduplicarStrings(parseJsonArray(row.variaveis_json)),
        tags: deduplicarStrings(parseJsonArray(row.tags_json)),
        status: row.status,
        observacoesInternas: row.observacoes_internas ?? undefined,
        origem: row.origem,
        mensagemPadraoSistema: row.mensagem_padrao_sistema,
        mensagemPersonalizadaUsuario: row.mensagem_personalizada_usuario,
        mensagemSugeridaIa: row.mensagem_sugerida_ia,
        chaveSistema: row.chave_sistema ?? undefined,
        criadoPor: row.criado_por_nome ?? undefined,
        atualizadoPor: row.atualizado_por_nome ?? undefined,
        criado_em: row.criado_em.toISOString(),
        atualizado_em: row.atualizado_em.toISOString()
    };
}
function mapHistorico(row) {
    return {
        id: row.id.toString(),
        modeloId: row.modelo_id ? row.modelo_id.toString() : undefined,
        nomeMensagem: row.nome_mensagem,
        canal: row.canal,
        destinatarioTipo: row.destinatario_tipo,
        destinatarioId: row.destinatario_id ?? undefined,
        destinatarioNome: row.destinatario_nome ?? undefined,
        destinatarioContato: row.destinatario_contato ?? undefined,
        usuarioId: row.usuario_id ?? undefined,
        usuarioNome: row.usuario_nome ?? undefined,
        tipoEnvio: row.tipo_envio,
        status: row.status,
        assuntoFinal: row.assunto_final ?? undefined,
        mensagemFinal: row.mensagem_final ?? undefined,
        erroObservacao: row.erro_observacao ?? undefined,
        urlWhatsapp: row.url_whatsapp ?? undefined,
        filtrosJson: row.filtros_json ? JSON.parse(row.filtros_json) : undefined,
        detalhesJson: row.detalhes_json ? JSON.parse(row.detalhes_json) : undefined,
        criado_em: row.criado_em.toISOString()
    };
}
function destinatarioPermiteCanal(modelo, destinatario, canal) {
    const atendeDestinatario = modelo.tiposDestinatario.includes(destinatario);
    const atendeCanal = !canal || modelo.canaisPermitidos.includes(canal);
    return atendeDestinatario && atendeCanal;
}
function montarSaudacao(destinatario) {
    return `Olá, ${destinatario.primeiroNome || destinatario.nome}.`;
}
function montarAssinatura(contexto) {
    return contexto.instituicao || "Equipe G3 Next";
}
function substituirPlaceholders(texto, contexto) {
    return texto.replace(/\{([a-z0-9_]+)\}/gi, (_match, key) => contexto[key] ?? "");
}
function serializarSeguro(value) {
    try {
        return JSON.stringify(value ?? null);
    }
    catch {
        return JSON.stringify(null);
    }
}
let basePromise = null;
export class MensagensPersonalizadasService {
    repository = new MensagensPersonalizadasRepository();
    emailService = new EmailService();
    async obterSuporte() {
        await this.garantirBase();
        return {
            placeholders: placeholdersDisponiveis,
            canais: [
                { id: "WHATSAPP", label: "WhatsApp" },
                { id: "EMAIL", label: "E-mail" },
                { id: "AMBOS", label: "Ambos" }
            ],
            canaisEnvio: [
                { id: "WHATSAPP", label: "WhatsApp" },
                { id: "EMAIL", label: "E-mail" }
            ],
            destinatarios: [
                { id: "COLABORADOR", label: "Colaborador" },
                { id: "PROFISSIONAL", label: "Profissional" },
                { id: "VOLUNTARIO", label: "Voluntário" },
                { id: "DOADOR", label: "Doador" },
                { id: "INSTITUICAO", label: "Instituição" },
                { id: "BENEFICIARIO", label: "Beneficiário" }
            ],
            integracoes: {
                emailHabilitado: env.APP_EMAIL_HABILITADO,
                whatsappProviderHabilitado: false,
                whatsappModo: "LINK_PREPARADO"
            }
        };
    }
    async listarTaxonomias() {
        await this.garantirBase();
        const rows = await this.repository.listarTaxonomias();
        return rows.map(mapTaxonomia);
    }
    async criarTaxonomia(rawInput, actor) {
        await this.garantirBase();
        const input = mensagemTaxonomiaInputSchema.parse(rawInput);
        const row = await this.repository.criarTaxonomia(input);
        await this.repository.registrarAuditoria({
            acao: "CRIAR_TAXONOMIA",
            usuarioId: actor?.id ?? null,
            usuarioNome: actor?.nomeUsuario ?? null,
            dadosJson: serializarSeguro(input)
        });
        return mapTaxonomia(row);
    }
    async atualizarTaxonomia(rawId, rawInput, actor) {
        await this.garantirBase();
        const input = mensagemTaxonomiaInputSchema.parse(rawInput);
        const row = await this.repository.atualizarTaxonomia(this.parseId(rawId), input);
        await this.repository.registrarAuditoria({
            acao: "ATUALIZAR_TAXONOMIA",
            usuarioId: actor?.id ?? null,
            usuarioNome: actor?.nomeUsuario ?? null,
            dadosJson: serializarSeguro({ id: rawId, ...input })
        });
        return mapTaxonomia(row);
    }
    async excluirTaxonomia(rawId, actor) {
        await this.garantirBase();
        await this.repository.removerTaxonomia(this.parseId(rawId));
        await this.repository.registrarAuditoria({
            acao: "EXCLUIR_TAXONOMIA",
            usuarioId: actor?.id ?? null,
            usuarioNome: actor?.nomeUsuario ?? null,
            dadosJson: serializarSeguro({ id: rawId })
        });
    }
    async listarModelos(rawFiltros) {
        await this.garantirBase();
        const filtros = mensagemModeloFiltrosSchema.parse(rawFiltros);
        const rows = await this.repository.listarModelos(filtros);
        return rows
            .map(mapModelo)
            .filter((modelo) => {
            if (filtros.destinatario && !modelo.tiposDestinatario.includes(filtros.destinatario)) {
                return false;
            }
            if (filtros.canal && !modelo.canaisPermitidos.includes(filtros.canal)) {
                return false;
            }
            return true;
        });
    }
    async obterModelo(rawId) {
        await this.garantirBase();
        const row = await this.repository.obterModeloPorId(this.parseId(rawId));
        if (!row) {
            throw new AppError("Mensagem nao encontrada.", 404);
        }
        return mapModelo(row);
    }
    async criarModelo(rawInput, actor) {
        await this.garantirBase();
        const input = mensagemModeloInputSchema.parse(rawInput);
        const row = await this.repository.criarModelo(input, actor);
        await this.repository.registrarAuditoria({
            acao: "CRIAR_MODELO",
            modeloId: row.id,
            usuarioId: actor?.id ?? null,
            usuarioNome: actor?.nomeUsuario ?? null,
            dadosJson: serializarSeguro(input)
        });
        return mapModelo(row);
    }
    async atualizarModelo(rawId, rawInput, actor) {
        await this.garantirBase();
        const input = mensagemModeloInputSchema.parse(rawInput);
        const row = await this.repository.atualizarModelo(this.parseId(rawId), input, actor);
        await this.repository.registrarAuditoria({
            acao: "ATUALIZAR_MODELO",
            modeloId: row.id,
            usuarioId: actor?.id ?? null,
            usuarioNome: actor?.nomeUsuario ?? null,
            dadosJson: serializarSeguro(input)
        });
        return mapModelo(row);
    }
    async duplicarModelo(rawId, actor) {
        await this.garantirBase();
        const original = await this.obterModelo(rawId);
        const input = {
            titulo: `${original.titulo} (cópia)`,
            assunto: original.assunto,
            categoriaId: original.categoriaId,
            assuntoId: original.assuntoId,
            tipoComunicacaoId: original.tipoComunicacaoId,
            tags: original.tags,
            tiposDestinatario: original.tiposDestinatario,
            canalPermitido: original.canalPermitido,
            mensagemBase: original.mensagemBase,
            variaveisPermitidas: original.variaveisPermitidas,
            status: original.status,
            observacoesInternas: original.observacoesInternas,
            mensagemPadraoSistema: false,
            mensagemPersonalizadaUsuario: true,
            mensagemSugeridaIa: false
        };
        const row = await this.repository.criarModelo(input, actor);
        await this.repository.registrarAuditoria({
            acao: "DUPLICAR_MODELO",
            modeloId: row.id,
            usuarioId: actor?.id ?? null,
            usuarioNome: actor?.nomeUsuario ?? null,
            dadosJson: serializarSeguro({ origem: rawId })
        });
        return mapModelo(row);
    }
    async atualizarStatusModelo(rawId, rawStatus, actor) {
        await this.garantirBase();
        const status = typeof rawStatus === "string" ? rawStatus.trim().toUpperCase() : "";
        if (status !== "ATIVA" && status !== "INATIVA") {
            throw new AppError("Informe um status valido.", 422);
        }
        const row = await this.repository.atualizarStatusModelo(this.parseId(rawId), status, actor);
        await this.repository.registrarAuditoria({
            acao: "ATUALIZAR_STATUS_MODELO",
            modeloId: row.id,
            usuarioId: actor?.id ?? null,
            usuarioNome: actor?.nomeUsuario ?? null,
            dadosJson: serializarSeguro({ status })
        });
        return mapModelo(row);
    }
    async excluirModelo(rawId, actor) {
        await this.garantirBase();
        const modelo = await this.obterModelo(rawId);
        if (modelo.mensagemPadraoSistema) {
            throw new AppError("Mensagens padrao do sistema devem ser inativadas, nao excluidas.", 409);
        }
        await this.repository.removerModelo(this.parseId(rawId));
        await this.repository.registrarAuditoria({
            acao: "EXCLUIR_MODELO",
            modeloId: BigInt(rawId),
            usuarioId: actor?.id ?? null,
            usuarioNome: actor?.nomeUsuario ?? null,
            dadosJson: serializarSeguro({ id: rawId, titulo: modelo.titulo })
        });
    }
    async listarHistorico(rawFiltros) {
        await this.garantirBase();
        const filtros = mensagemHistoricoFiltrosSchema.parse(rawFiltros);
        const rows = await this.repository.listarHistorico(filtros);
        return rows.map(mapHistorico);
    }
    async buscarDestinatarios(rawQuery) {
        await this.garantirBase();
        const query = mensagemDestinatarioBuscaSchema.parse(rawQuery);
        return this.repository.buscarDestinatarios(query.tipo, query.termo, query.somenteAtivos);
    }
    async gerarPreview(rawInput, actor) {
        await this.garantirBase();
        const input = mensagemPreviewInputSchema.parse(rawInput);
        const modelo = await this.resolverModeloPreview(input.modeloId, input);
        const destinatario = await this.resolverDestinatario(input.destinatarioTipo, input.destinatarioId);
        const contexto = this.montarContexto(destinatario, actor, input.contextoExtra);
        const assuntoBase = input.assuntoEditado?.trim() || modelo.assunto || modelo.titulo;
        const corpoBase = input.mensagemEditada?.trim() || modelo.mensagemBase;
        const assuntoFinal = substituirPlaceholders(assuntoBase, contexto);
        const corpoFinal = substituirPlaceholders(corpoBase, contexto);
        const saudacao = montarSaudacao(destinatario);
        const assinatura = montarAssinatura(contexto);
        return {
            modelo,
            destinatario,
            canal: input.canal,
            variaveisResolvidas: contexto,
            whatsapp: {
                titulo: assuntoFinal,
                corpo: corpoFinal,
                textoCompleto: `${corpoFinal}`.trim()
            },
            email: {
                assunto: assuntoFinal,
                saudacao,
                corpo: corpoFinal,
                assinatura,
                textoCompleto: [saudacao, "", corpoFinal, "", "Atenciosamente,", assinatura].join("\n")
            }
        };
    }
    async enviarMensagem(rawInput, actor) {
        await this.garantirBase();
        const input = mensagemEnvioInputSchema.parse(rawInput);
        const modelo = await this.resolverModeloPreview(input.modeloId, input);
        if (input.tipoEnvio === "LOTE" && input.destinatarioIds.length < 2) {
            throw new AppError("Envio em lote requer ao menos dois destinatarios.", 422);
        }
        const idsUnicos = deduplicarStrings(input.destinatarioIds);
        const itens = [];
        for (const destinatarioId of idsUnicos) {
            const destinatario = await this.resolverDestinatario(input.destinatarioTipo, destinatarioId);
            const contexto = this.montarContexto(destinatario, actor, input.contextoExtra);
            const assuntoBase = input.assuntoEditado?.trim() || modelo.assunto || modelo.titulo;
            const corpoBase = input.mensagemEditada?.trim() || modelo.mensagemBase;
            const assuntoFinal = substituirPlaceholders(assuntoBase, contexto);
            const corpoFinal = substituirPlaceholders(corpoBase, contexto);
            const saudacao = montarSaudacao(destinatario);
            const assinatura = montarAssinatura(contexto);
            if (input.canal === "EMAIL") {
                const email = destinatario.email?.trim();
                if (!email) {
                    const erro = "Destinatario sem e-mail informado.";
                    await this.repository.registrarHistorico({
                        modeloId: BigInt(modelo.id),
                        nomeMensagem: modelo.titulo,
                        canal: "EMAIL",
                        destinatarioTipo: input.destinatarioTipo,
                        destinatarioId,
                        destinatarioNome: destinatario.nome,
                        usuarioId: actor?.id ?? null,
                        usuarioNome: actor?.nomeUsuario ?? null,
                        tipoEnvio: input.tipoEnvio,
                        status: "ERRO",
                        assuntoFinal,
                        mensagemFinal: corpoFinal,
                        erroObservacao: erro,
                        detalhesJson: serializarSeguro({ saudacao, assinatura })
                    });
                    itens.push({
                        destinatarioId,
                        destinatarioNome: destinatario.nome,
                        canal: "EMAIL",
                        status: "ERRO",
                        erro
                    });
                    continue;
                }
                const mensagemFinal = [saudacao, "", corpoFinal, "", "Atenciosamente,", assinatura].join("\n");
                try {
                    await this.emailService.enviarEmailSimples({
                        destinatario: email,
                        assunto: assuntoFinal,
                        mensagem: mensagemFinal
                    });
                    await this.repository.registrarHistorico({
                        modeloId: BigInt(modelo.id),
                        nomeMensagem: modelo.titulo,
                        canal: "EMAIL",
                        destinatarioTipo: input.destinatarioTipo,
                        destinatarioId,
                        destinatarioNome: destinatario.nome,
                        destinatarioContato: email,
                        usuarioId: actor?.id ?? null,
                        usuarioNome: actor?.nomeUsuario ?? null,
                        tipoEnvio: input.tipoEnvio,
                        status: "ENVIADO",
                        assuntoFinal,
                        mensagemFinal,
                        detalhesJson: serializarSeguro({ saudacao, assinatura })
                    });
                    itens.push({
                        destinatarioId,
                        destinatarioNome: destinatario.nome,
                        canal: "EMAIL",
                        status: "ENVIADO",
                        contato: email
                    });
                }
                catch (error) {
                    const erro = error?.message ?? "Falha ao enviar e-mail.";
                    await this.repository.registrarHistorico({
                        modeloId: BigInt(modelo.id),
                        nomeMensagem: modelo.titulo,
                        canal: "EMAIL",
                        destinatarioTipo: input.destinatarioTipo,
                        destinatarioId,
                        destinatarioNome: destinatario.nome,
                        destinatarioContato: email,
                        usuarioId: actor?.id ?? null,
                        usuarioNome: actor?.nomeUsuario ?? null,
                        tipoEnvio: input.tipoEnvio,
                        status: "ERRO",
                        assuntoFinal,
                        mensagemFinal,
                        erroObservacao: erro,
                        detalhesJson: serializarSeguro({ saudacao, assinatura })
                    });
                    itens.push({
                        destinatarioId,
                        destinatarioNome: destinatario.nome,
                        canal: "EMAIL",
                        status: "ERRO",
                        contato: email,
                        erro
                    });
                }
                continue;
            }
            const telefone = limparTelefoneWhatsapp(destinatario.telefone);
            if (!telefone) {
                const erro = "Destinatario sem telefone informado.";
                await this.repository.registrarHistorico({
                    modeloId: BigInt(modelo.id),
                    nomeMensagem: modelo.titulo,
                    canal: "WHATSAPP",
                    destinatarioTipo: input.destinatarioTipo,
                    destinatarioId,
                    destinatarioNome: destinatario.nome,
                    usuarioId: actor?.id ?? null,
                    usuarioNome: actor?.nomeUsuario ?? null,
                    tipoEnvio: input.tipoEnvio,
                    status: "ERRO",
                    assuntoFinal,
                    mensagemFinal: corpoFinal,
                    erroObservacao: erro
                });
                itens.push({
                    destinatarioId,
                    destinatarioNome: destinatario.nome,
                    canal: "WHATSAPP",
                    status: "ERRO",
                    erro
                });
                continue;
            }
            const urlWhatsapp = `https://wa.me/${telefone}?text=${encodeURIComponent(corpoFinal)}`;
            await this.repository.registrarHistorico({
                modeloId: BigInt(modelo.id),
                nomeMensagem: modelo.titulo,
                canal: "WHATSAPP",
                destinatarioTipo: input.destinatarioTipo,
                destinatarioId,
                destinatarioNome: destinatario.nome,
                destinatarioContato: telefone,
                usuarioId: actor?.id ?? null,
                usuarioNome: actor?.nomeUsuario ?? null,
                tipoEnvio: input.tipoEnvio,
                status: "PREPARADO",
                assuntoFinal,
                mensagemFinal: corpoFinal,
                urlWhatsapp,
                detalhesJson: serializarSeguro({ modo: "LINK_PREPARADO" })
            });
            itens.push({
                destinatarioId,
                destinatarioNome: destinatario.nome,
                canal: "WHATSAPP",
                status: "PREPARADO",
                contato: telefone,
                urlWhatsapp
            });
        }
        await this.repository.registrarAuditoria({
            acao: "ENVIAR_MENSAGEM",
            modeloId: BigInt(modelo.id),
            usuarioId: actor?.id ?? null,
            usuarioNome: actor?.nomeUsuario ?? null,
            dadosJson: serializarSeguro({
                canal: input.canal,
                destinatarioTipo: input.destinatarioTipo,
                quantidade: idsUnicos.length,
                tipoEnvio: input.tipoEnvio
            })
        });
        return {
            modelo,
            resumo: {
                total: itens.length,
                enviados: itens.filter((item) => item.status === "ENVIADO").length,
                preparados: itens.filter((item) => item.status === "PREPARADO").length,
                erros: itens.filter((item) => item.status === "ERRO").length
            },
            itens
        };
    }
    async garantirBase() {
        await ensureMensagensPersonalizadasBase();
    }
    async resolverModeloPreview(modeloId, input) {
        if (!modeloId) {
            const candidatos = await this.repository.listarModelos({
                somenteAtivas: true,
                destinatario: input.destinatarioTipo,
                canal: input.canal
            });
            const primeiroCompativel = candidatos.map(mapModelo).find((modelo) => destinatarioPermiteCanal(modelo, input.destinatarioTipo, input.canal));
            if (!primeiroCompativel) {
                throw new AppError("Nao existe mensagem ativa compatível para o canal e destinatário informados.", 404);
            }
            return primeiroCompativel;
        }
        const modelo = await this.obterModelo(modeloId);
        if (!destinatarioPermiteCanal(modelo, input.destinatarioTipo, input.canal)) {
            throw new AppError("A mensagem selecionada nao e compativel com o canal ou destinatario.", 422);
        }
        if (modelo.status !== "ATIVA") {
            throw new AppError("A mensagem selecionada esta inativa.", 422);
        }
        return modelo;
    }
    async resolverDestinatario(tipo, id) {
        const destinatario = await this.repository.obterDestinatarioPorId(tipo, id);
        if (!destinatario) {
            throw new AppError("Destinatario nao encontrado.", 404);
        }
        return destinatario;
    }
    montarContexto(destinatario, actor, contextoExtra) {
        const extra = contextoExtra ?? {};
        const agora = new Date();
        const nome = destinatario.primeiroNome || destinatario.nome;
        return {
            nome,
            nome_completo: destinatario.nome,
            primeiro_nome: destinatario.primeiroNome,
            cpf: String(extra.cpf ?? destinatario.documento ?? ""),
            email: String(extra.email ?? destinatario.email ?? ""),
            telefone: String(extra.telefone ?? destinatario.telefone ?? ""),
            data: formatarDataPtBr(extra.data) || formatarDataPtBr(agora),
            hora: typeof extra.hora === "string" && extra.hora.trim().length
                ? extra.hora.trim()
                : agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
            instituicao: String(extra.instituicao ?? destinatario.instituicao ?? "G3 Next"),
            curso: String(extra.curso ?? ""),
            atendimento: String(extra.atendimento ?? ""),
            setor: String(extra.setor ?? destinatario.setor ?? ""),
            cargo: String(extra.cargo ?? destinatario.cargo ?? ""),
            data_registro: formatarDataPtBr(extra.data_registro ?? destinatario.dataRegistro) ||
                formatarDataPtBr(agora),
            usuario_responsavel: String(extra.usuario_responsavel ?? actor?.nomeUsuario ?? ""),
            valor_doacao: String(extra.valor_doacao ?? ""),
            descricao_doacao: String(extra.descricao_doacao ?? ""),
            livro: String(extra.livro ?? ""),
            emprestimo: String(extra.emprestimo ?? ""),
            observacao: String(extra.observacao ?? destinatario.observacao ?? "")
        };
    }
    parseId(rawId) {
        const parsed = Number(rawId);
        if (!Number.isInteger(parsed) || parsed <= 0) {
            throw new AppError("Identificador invalido.", 400);
        }
        return BigInt(parsed);
    }
}
export async function ensureMensagensPersonalizadasBase() {
    await ensureMensagensPersonalizadasEstrutura();
    if (!basePromise) {
        basePromise = (async () => {
            const repository = new MensagensPersonalizadasRepository();
            for (const taxonomia of taxonomiasBase) {
                await repository.upsertTaxonomiaSeed(taxonomia);
            }
            const taxonomias = await repository.listarTaxonomias();
            const resolverId = (tipo, nome) => {
                const item = taxonomias.find((taxonomia) => taxonomia.tipo === tipo && taxonomia.nome === nome);
                return item?.id.toString() ?? null;
            };
            for (const modelo of modelosBase(resolverId)) {
                await repository.inserirModeloSeedSeAusente(modelo);
            }
        })();
    }
    await basePromise;
}
const modelosBaseParte1 = (taxonomiaId) => [
    {
        chaveSistema: "SISTEMA_BOAS_VINDAS_BENEFICIARIO",
        titulo: "Boas-vindas para beneficiário",
        assunto: "Boas-vindas",
        categoriaId: taxonomiaId("CATEGORIA", "Boas-vindas"),
        assuntoId: taxonomiaId("ASSUNTO", "Boas-vindas"),
        tipoComunicacaoId: taxonomiaId("TIPO_COMUNICACAO", "Cadastro"),
        tags: ["Cadastro"],
        tiposDestinatario: ["BENEFICIARIO"],
        canalPermitido: "AMBOS",
        mensagemBase: "Olá, {primeiro_nome}. Seu cadastro foi recebido com sucesso. Sempre que precisarmos, entraremos em contato pelos canais informados.",
        variaveisPermitidas: ["{primeiro_nome}", "{usuario_responsavel}"],
        mensagemPadraoSistema: true,
        mensagemPersonalizadaUsuario: false,
        mensagemSugeridaIa: true,
        origem: "IA",
        status: "ATIVA"
    },
    {
        chaveSistema: "SISTEMA_BOAS_VINDAS_COLABORADOR",
        titulo: "Boas-vindas para colaborador",
        assunto: "Boas-vindas",
        categoriaId: taxonomiaId("CATEGORIA", "Boas-vindas"),
        assuntoId: taxonomiaId("ASSUNTO", "Boas-vindas"),
        tipoComunicacaoId: taxonomiaId("TIPO_COMUNICACAO", "RH"),
        tags: ["RH"],
        tiposDestinatario: ["COLABORADOR", "PROFISSIONAL"],
        canalPermitido: "AMBOS",
        mensagemBase: "Olá, {primeiro_nome}. Seja bem-vindo(a) à equipe. Qualquer necessidade, procure o setor {setor}.",
        variaveisPermitidas: ["{primeiro_nome}", "{setor}"],
        mensagemPadraoSistema: true,
        mensagemPersonalizadaUsuario: false,
        mensagemSugeridaIa: true,
        origem: "IA",
        status: "ATIVA"
    },
    {
        chaveSistema: "SISTEMA_BOAS_VINDAS_VOLUNTARIO",
        titulo: "Boas-vindas para voluntário",
        assunto: "Boas-vindas",
        categoriaId: taxonomiaId("CATEGORIA", "Boas-vindas"),
        assuntoId: taxonomiaId("ASSUNTO", "Boas-vindas"),
        tipoComunicacaoId: taxonomiaId("TIPO_COMUNICACAO", "Projetos"),
        tags: ["Cadastro"],
        tiposDestinatario: ["VOLUNTARIO"],
        canalPermitido: "AMBOS",
        mensagemBase: "Olá, {primeiro_nome}. Agradecemos por aceitar contribuir conosco. Em breve você receberá as próximas orientações.",
        variaveisPermitidas: ["{primeiro_nome}"],
        mensagemPadraoSistema: true,
        mensagemPersonalizadaUsuario: false,
        mensagemSugeridaIa: true,
        origem: "IA",
        status: "ATIVA"
    },
    {
        chaveSistema: "SISTEMA_BOAS_VINDAS_INSTITUICAO",
        titulo: "Boas-vindas para instituição parceira",
        assunto: "Boas-vindas",
        categoriaId: taxonomiaId("CATEGORIA", "Boas-vindas"),
        assuntoId: taxonomiaId("ASSUNTO", "Boas-vindas"),
        tipoComunicacaoId: taxonomiaId("TIPO_COMUNICACAO", "Geral"),
        tags: ["Cadastro"],
        tiposDestinatario: ["INSTITUICAO"],
        canalPermitido: "AMBOS",
        mensagemBase: "Olá. Registramos sua parceria com a instituição {instituicao}. Conte conosco para os próximos passos.",
        variaveisPermitidas: ["{instituicao}"],
        mensagemPadraoSistema: true,
        mensagemPersonalizadaUsuario: false,
        mensagemSugeridaIa: true,
        origem: "IA",
        status: "ATIVA"
    },
    {
        chaveSistema: "SISTEMA_BOAS_VINDAS_DOADOR",
        titulo: "Boas-vindas para doador",
        assunto: "Boas-vindas",
        categoriaId: taxonomiaId("CATEGORIA", "Boas-vindas"),
        assuntoId: taxonomiaId("ASSUNTO", "Boas-vindas"),
        tipoComunicacaoId: taxonomiaId("TIPO_COMUNICACAO", "Doação"),
        tags: ["Doação"],
        tiposDestinatario: ["DOADOR"],
        canalPermitido: "AMBOS",
        mensagemBase: "Olá, {primeiro_nome}. Obrigado por apoiar nossa instituição. Sua participação fortalece nossas ações sociais.",
        variaveisPermitidas: ["{primeiro_nome}"],
        mensagemPadraoSistema: true,
        mensagemPersonalizadaUsuario: false,
        mensagemSugeridaIa: true,
        origem: "IA",
        status: "ATIVA"
    },
    {
        chaveSistema: "SISTEMA_LEMBRETE_ATENDIMENTO",
        titulo: "Lembrete de atendimento",
        assunto: "Lembrete de atendimento",
        categoriaId: taxonomiaId("CATEGORIA", "Lembretes"),
        assuntoId: taxonomiaId("ASSUNTO", "Lembrete de atendimento"),
        tipoComunicacaoId: taxonomiaId("TIPO_COMUNICACAO", "Atendimento"),
        tags: ["Atendimento"],
        tiposDestinatario: ["BENEFICIARIO"],
        canalPermitido: "AMBOS",
        mensagemBase: "Olá, {primeiro_nome}. Este é um lembrete do seu {atendimento} em {data}. Caso precise, responda esta mensagem.",
        variaveisPermitidas: ["{primeiro_nome}", "{atendimento}", "{data}"],
        mensagemPadraoSistema: true,
        mensagemPersonalizadaUsuario: false,
        mensagemSugeridaIa: true,
        origem: "IA",
        status: "ATIVA"
    },
    {
        chaveSistema: "SISTEMA_AGRADECIMENTO_DOACAO",
        titulo: "Agradecimento por doação recebida",
        assunto: "Agradecimento por doação",
        categoriaId: taxonomiaId("CATEGORIA", "Agradecimentos"),
        assuntoId: taxonomiaId("ASSUNTO", "Agradecimento por doação"),
        tipoComunicacaoId: taxonomiaId("TIPO_COMUNICACAO", "Doação"),
        tags: ["Doação"],
        tiposDestinatario: ["DOADOR"],
        canalPermitido: "AMBOS",
        mensagemBase: "Olá, {primeiro_nome}. Confirmamos o recebimento da doação {descricao_doacao}. Muito obrigado pelo apoio.",
        variaveisPermitidas: ["{primeiro_nome}", "{descricao_doacao}"],
        mensagemPadraoSistema: true,
        mensagemPersonalizadaUsuario: false,
        mensagemSugeridaIa: true,
        origem: "IA",
        status: "ATIVA"
    },
    {
        chaveSistema: "SISTEMA_COMPROVANTE_DOACAO",
        titulo: "Comprovante de doação recebida",
        assunto: "Comprovante",
        categoriaId: taxonomiaId("CATEGORIA", "Comprovantes"),
        assuntoId: taxonomiaId("ASSUNTO", "Comprovante"),
        tipoComunicacaoId: taxonomiaId("TIPO_COMUNICACAO", "Doação"),
        tags: ["Doação"],
        tiposDestinatario: ["DOADOR"],
        canalPermitido: "AMBOS",
        mensagemBase: "Registramos a doação {descricao_doacao} no valor de {valor_doacao} em {data}. Este texto pode ser usado como comprovante informativo.",
        variaveisPermitidas: ["{descricao_doacao}", "{valor_doacao}", "{data}"],
        mensagemPadraoSistema: true,
        mensagemPersonalizadaUsuario: false,
        mensagemSugeridaIa: true,
        origem: "IA",
        status: "ATIVA"
    }
];
const modelosBaseParte2 = (taxonomiaId) => [
    {
        chaveSistema: "SISTEMA_COMPROVANTE_INSCRICAO_CURSO",
        titulo: "Comprovante de inscrição em cursos",
        assunto: "Comprovante",
        categoriaId: taxonomiaId("CATEGORIA", "Comprovantes"),
        assuntoId: taxonomiaId("ASSUNTO", "Comprovante"),
        tipoComunicacaoId: taxonomiaId("TIPO_COMUNICACAO", "Projetos"),
        tags: ["Cadastro"],
        tiposDestinatario: ["BENEFICIARIO"],
        canalPermitido: "AMBOS",
        mensagemBase: "Sua inscrição no curso {curso} foi registrada em {data}. Guarde esta mensagem como comprovante informativo.",
        variaveisPermitidas: ["{curso}", "{data}"],
        mensagemPadraoSistema: true,
        mensagemPersonalizadaUsuario: false,
        mensagemSugeridaIa: true,
        origem: "IA",
        status: "ATIVA"
    },
    {
        chaveSistema: "SISTEMA_COMPROVANTE_ATENDIMENTO",
        titulo: "Comprovante de atendimento",
        assunto: "Comprovante",
        categoriaId: taxonomiaId("CATEGORIA", "Comprovantes"),
        assuntoId: taxonomiaId("ASSUNTO", "Comprovante"),
        tipoComunicacaoId: taxonomiaId("TIPO_COMUNICACAO", "Atendimento"),
        tags: ["Atendimento"],
        tiposDestinatario: ["BENEFICIARIO"],
        canalPermitido: "AMBOS",
        mensagemBase: "Confirmamos a realização do {atendimento} em {data}, às {hora}.",
        variaveisPermitidas: ["{atendimento}", "{data}", "{hora}"],
        mensagemPadraoSistema: true,
        mensagemPersonalizadaUsuario: false,
        mensagemSugeridaIa: true,
        origem: "IA",
        status: "ATIVA"
    },
    {
        chaveSistema: "SISTEMA_ALTERACAO_CADASTRO",
        titulo: "Alteração de cadastro",
        assunto: "Comunicado geral",
        categoriaId: taxonomiaId("CATEGORIA", "Comunicados gerais"),
        assuntoId: taxonomiaId("ASSUNTO", "Comunicado geral"),
        tipoComunicacaoId: taxonomiaId("TIPO_COMUNICACAO", "Cadastro"),
        tags: ["Cadastro"],
        tiposDestinatario: ["BENEFICIARIO", "VOLUNTARIO", "PROFISSIONAL", "INSTITUICAO", "DOADOR"],
        canalPermitido: "AMBOS",
        mensagemBase: "Seu cadastro foi atualizado em {data}. Se houver alguma divergência, entre em contato conosco.",
        variaveisPermitidas: ["{data}"],
        mensagemPadraoSistema: true,
        mensagemPersonalizadaUsuario: false,
        mensagemSugeridaIa: true,
        origem: "IA",
        status: "ATIVA"
    },
    {
        chaveSistema: "SISTEMA_COMPROVANTE_ENTREGA_LIVROS",
        titulo: "Comprovante de entrega de livros",
        assunto: "Comprovante",
        categoriaId: taxonomiaId("CATEGORIA", "Comprovantes"),
        assuntoId: taxonomiaId("ASSUNTO", "Comprovante"),
        tipoComunicacaoId: taxonomiaId("TIPO_COMUNICACAO", "Biblioteca"),
        tags: ["Biblioteca"],
        tiposDestinatario: ["BENEFICIARIO"],
        canalPermitido: "AMBOS",
        mensagemBase: "Confirmamos a entrega do livro {livro} em {data}.",
        variaveisPermitidas: ["{livro}", "{data}"],
        mensagemPadraoSistema: true,
        mensagemPersonalizadaUsuario: false,
        mensagemSugeridaIa: true,
        origem: "IA",
        status: "ATIVA"
    },
    {
        chaveSistema: "SISTEMA_COMPROVANTE_EMPRESTIMO",
        titulo: "Comprovante de empréstimos",
        assunto: "Comprovante",
        categoriaId: taxonomiaId("CATEGORIA", "Comprovantes"),
        assuntoId: taxonomiaId("ASSUNTO", "Comprovante"),
        tipoComunicacaoId: taxonomiaId("TIPO_COMUNICACAO", "Biblioteca"),
        tags: ["Biblioteca"],
        tiposDestinatario: ["BENEFICIARIO"],
        canalPermitido: "AMBOS",
        mensagemBase: "O empréstimo {emprestimo} foi registrado com sucesso em {data}.",
        variaveisPermitidas: ["{emprestimo}", "{data}"],
        mensagemPadraoSistema: true,
        mensagemPersonalizadaUsuario: false,
        mensagemSugeridaIa: true,
        origem: "IA",
        status: "ATIVA"
    },
    {
        chaveSistema: "SISTEMA_REGISTRO_PONTO",
        titulo: "Registro de ponto",
        assunto: "Comunicado geral",
        categoriaId: taxonomiaId("CATEGORIA", "Comunicados gerais"),
        assuntoId: taxonomiaId("ASSUNTO", "Comunicado geral"),
        tipoComunicacaoId: taxonomiaId("TIPO_COMUNICACAO", "RH"),
        tags: ["RH"],
        tiposDestinatario: ["COLABORADOR", "PROFISSIONAL"],
        canalPermitido: "AMBOS",
        mensagemBase: "Registramos sua marcação de ponto em {data}, às {hora}.",
        variaveisPermitidas: ["{data}", "{hora}"],
        mensagemPadraoSistema: true,
        mensagemPersonalizadaUsuario: false,
        mensagemSugeridaIa: true,
        origem: "IA",
        status: "ATIVA"
    },
    {
        chaveSistema: "SISTEMA_COMUNICADO_GERAL",
        titulo: "Comunicado geral",
        assunto: "Comunicado geral",
        categoriaId: taxonomiaId("CATEGORIA", "Comunicados gerais"),
        assuntoId: taxonomiaId("ASSUNTO", "Comunicado geral"),
        tipoComunicacaoId: taxonomiaId("TIPO_COMUNICACAO", "Geral"),
        tags: ["Cadastro"],
        tiposDestinatario: ["BENEFICIARIO", "PROFISSIONAL", "VOLUNTARIO", "INSTITUICAO", "DOADOR"],
        canalPermitido: "AMBOS",
        mensagemBase: "Informamos uma atualização importante referente às atividades da instituição em {data}.",
        variaveisPermitidas: ["{data}"],
        mensagemPadraoSistema: true,
        mensagemPersonalizadaUsuario: false,
        mensagemSugeridaIa: true,
        origem: "IA",
        status: "ATIVA"
    },
    {
        chaveSistema: "SISTEMA_AVISO_INTERNO",
        titulo: "Aviso interno",
        assunto: "Comunicado geral",
        categoriaId: taxonomiaId("CATEGORIA", "Avisos internos"),
        assuntoId: taxonomiaId("ASSUNTO", "Comunicado geral"),
        tipoComunicacaoId: taxonomiaId("TIPO_COMUNICACAO", "Geral"),
        tags: ["RH"],
        tiposDestinatario: ["COLABORADOR", "PROFISSIONAL"],
        canalPermitido: "AMBOS",
        mensagemBase: "Aviso interno: verifique a atualização sobre {setor} e confirme ciência quando necessário.",
        variaveisPermitidas: ["{setor}"],
        mensagemPadraoSistema: true,
        mensagemPersonalizadaUsuario: false,
        mensagemSugeridaIa: true,
        origem: "IA",
        status: "ATIVA"
    },
    {
        chaveSistema: "SISTEMA_LEMBRETE_COMPARECIMENTO",
        titulo: "Lembrete de comparecimento",
        assunto: "Lembrete de atendimento",
        categoriaId: taxonomiaId("CATEGORIA", "Lembretes"),
        assuntoId: taxonomiaId("ASSUNTO", "Lembrete de atendimento"),
        tipoComunicacaoId: taxonomiaId("TIPO_COMUNICACAO", "Atendimento"),
        tags: ["Atendimento"],
        tiposDestinatario: ["BENEFICIARIO"],
        canalPermitido: "AMBOS",
        mensagemBase: "Lembramos seu comparecimento em {data}, às {hora}. Leve os documentos necessários, se houver.",
        variaveisPermitidas: ["{data}", "{hora}"],
        mensagemPadraoSistema: true,
        mensagemPersonalizadaUsuario: false,
        mensagemSugeridaIa: true,
        origem: "IA",
        status: "ATIVA"
    },
    {
        chaveSistema: "SISTEMA_CONFIRMACAO_AGENDAMENTO",
        titulo: "Confirmação de agendamento",
        assunto: "Confirmação de agendamento",
        categoriaId: taxonomiaId("CATEGORIA", "Comunicados gerais"),
        assuntoId: taxonomiaId("ASSUNTO", "Confirmação de agendamento"),
        tipoComunicacaoId: taxonomiaId("TIPO_COMUNICACAO", "Atendimento"),
        tags: ["Atendimento"],
        tiposDestinatario: ["BENEFICIARIO", "PROFISSIONAL"],
        canalPermitido: "AMBOS",
        mensagemBase: "Seu agendamento foi confirmado para {data}, às {hora}.",
        variaveisPermitidas: ["{data}", "{hora}"],
        mensagemPadraoSistema: true,
        mensagemPersonalizadaUsuario: false,
        mensagemSugeridaIa: true,
        origem: "IA",
        status: "ATIVA"
    },
    {
        chaveSistema: "SISTEMA_CANCELAMENTO_ATENDIMENTO",
        titulo: "Cancelamento de atendimento",
        assunto: "Cancelamento",
        categoriaId: taxonomiaId("CATEGORIA", "Comunicados gerais"),
        assuntoId: taxonomiaId("ASSUNTO", "Cancelamento"),
        tipoComunicacaoId: taxonomiaId("TIPO_COMUNICACAO", "Atendimento"),
        tags: ["Atendimento"],
        tiposDestinatario: ["BENEFICIARIO"],
        canalPermitido: "AMBOS",
        mensagemBase: "Informamos o cancelamento do atendimento previsto para {data}. Assim que possível, entraremos em contato para novo alinhamento.",
        variaveisPermitidas: ["{data}"],
        mensagemPadraoSistema: true,
        mensagemPersonalizadaUsuario: false,
        mensagemSugeridaIa: true,
        origem: "IA",
        status: "ATIVA"
    }
];
function modelosBase(taxonomiaId) {
    return [...modelosBaseParte1(taxonomiaId), ...modelosBaseParte2(taxonomiaId)];
}
