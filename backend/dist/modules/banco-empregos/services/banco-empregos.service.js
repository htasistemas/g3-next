import PDFDocument from "pdfkit";
import { AppError } from "../../../shared/errors/app-error.js";
import { normalizarCpf, normalizarEmail, normalizarTelefone, normalizarCep, validarCpf, validarEmail } from "../../../utils/br-utils.js";
import { mapaCamposTextoBancoEmpregos } from "../../../utils/text-format-config.js";
import { normalizarObjetoTexto } from "../../../utils/text-formatter.js";
import { ReportsRepository } from "../../reports/repositories/reports.repository.js";
import { storageService } from "../../arquivos/services/storage-instance.js";
import { mapBancoEmpregosAvaliacao, mapBancoEmpregosCandidato, mapBancoEmpregosDocumento, mapBancoEmpregosHistorico, mapBancoEmpregosProcesso, mapBancoEmpregosVaga } from "../banco-empregos.mapper.js";
import { bancoEmpregosAvaliacaoInputSchema, bancoEmpregosCandidatoFiltersSchema, bancoEmpregosCandidatoInputSchema, bancoEmpregosDashboardFiltersSchema, bancoEmpregosDocumentoUploadSchema, bancoEmpregosHistoricoFiltersSchema, bancoEmpregosProcessoFiltersSchema, bancoEmpregosProcessoInputSchema, bancoEmpregosVagaFiltersSchema, bancoEmpregosVagaInputSchema } from "../banco-empregos.schema.js";
import { BancoEmpregosRepository } from "../repositories/banco-empregos.repository.js";
export class BancoEmpregosService {
    repository = new BancoEmpregosRepository();
    reportsRepository = new ReportsRepository();
    async listarDashboard(rawFilters) {
        const filters = bancoEmpregosDashboardFiltersSchema.parse(rawFilters);
        return this.repository.obterDashboard(filters);
    }
    async listar(rawFilters) {
        const filters = bancoEmpregosVagaFiltersSchema.parse(rawFilters);
        const resultado = await this.repository.listarVagas(filters);
        return {
            ...resultado,
            vagas: resultado.rows.map(mapBancoEmpregosVaga)
        };
    }
    async obter(rawId) {
        const id = this.parseId(rawId);
        const vaga = await this.repository.buscarVagaOuFalhar(id);
        const processos = await this.repository.listarProcessos({ vagaId: rawId, limite: 200, pagina: 1 });
        return {
            vaga: mapBancoEmpregosVaga(vaga),
            processos: await Promise.all(processos.rows.map(async (item) => {
                const avaliacao = await this.repository.buscarAvaliacaoPorProcesso(item.id);
                return mapBancoEmpregosProcesso(item, avaliacao);
            }))
        };
    }
    async criar(rawInput, authUser) {
        const input = bancoEmpregosVagaInputSchema.parse(this.normalizarPayload(rawInput));
        this.validarVaga(input);
        const vagaId = await this.repository.salvarVaga(undefined, input);
        await this.repository.registrarHistorico({
            entidadeTipo: "VAGA",
            entidadeId: vagaId,
            vagaId,
            usuarioId: this.parseOptionalId(authUser?.id),
            usuarioNome: authUser?.nomeUsuario ?? null,
            acao: "CRIACAO_VAGA",
            observacao: `Vaga ${input.titulo} cadastrada.`
        });
        return this.obter(vagaId.toString());
    }
    async atualizar(rawId, rawInput, authUser) {
        const id = this.parseId(rawId);
        const input = bancoEmpregosVagaInputSchema.parse(this.normalizarPayload(rawInput));
        this.validarVaga(input);
        await this.repository.buscarVagaOuFalhar(id);
        const vagaId = await this.repository.salvarVaga(id, input);
        await this.repository.registrarHistorico({
            entidadeTipo: "VAGA",
            entidadeId: vagaId,
            vagaId,
            usuarioId: this.parseOptionalId(authUser?.id),
            usuarioNome: authUser?.nomeUsuario ?? null,
            acao: "EDICAO_VAGA",
            observacao: `Vaga ${input.titulo} atualizada.`
        });
        return this.obter(vagaId.toString());
    }
    async remover(rawId, authUser) {
        const id = this.parseId(rawId);
        await this.repository.removerVaga(id);
        await this.repository.registrarHistorico({
            entidadeTipo: "VAGA",
            entidadeId: id,
            vagaId: id,
            usuarioId: this.parseOptionalId(authUser?.id),
            usuarioNome: authUser?.nomeUsuario ?? null,
            acao: "INATIVACAO_VAGA",
            observacao: "Vaga inativada."
        });
    }
    async listarCandidatos(rawFilters) {
        const filters = bancoEmpregosCandidatoFiltersSchema.parse(rawFilters);
        const resultado = await this.repository.listarCandidatos(filters);
        return {
            ...resultado,
            candidatos: resultado.rows.map(mapBancoEmpregosCandidato)
        };
    }
    async buscarCandidato(rawId) {
        const id = this.parseId(rawId);
        const candidato = await this.repository.buscarCandidatoOuFalhar(id);
        const documentos = await this.repository.listarDocumentos(id);
        const processos = await this.repository.listarProcessos({ candidatoId: rawId, limite: 200, pagina: 1 });
        return {
            candidato: mapBancoEmpregosCandidato(candidato),
            documentos: documentos.map(mapBancoEmpregosDocumento),
            processos: await Promise.all(processos.rows.map(async (item) => {
                const avaliacao = await this.repository.buscarAvaliacaoPorProcesso(item.id);
                return mapBancoEmpregosProcesso(item, avaliacao);
            }))
        };
    }
    async criarCandidato(rawInput, authUser) {
        const input = bancoEmpregosCandidatoInputSchema.parse(this.normalizarPayload(rawInput));
        this.validarCandidato(input);
        const candidatoId = await this.repository.salvarCandidato(undefined, input);
        await this.repository.registrarHistorico({
            entidadeTipo: "CANDIDATO",
            entidadeId: candidatoId,
            candidatoId,
            usuarioId: this.parseOptionalId(authUser?.id),
            usuarioNome: authUser?.nomeUsuario ?? null,
            acao: "CRIACAO_CANDIDATO",
            observacao: `Candidato ${input.nomeCompleto} cadastrado.`
        });
        return this.buscarCandidato(candidatoId.toString());
    }
    async atualizarCandidato(rawId, rawInput, authUser) {
        const id = this.parseId(rawId);
        const input = bancoEmpregosCandidatoInputSchema.parse(this.normalizarPayload(rawInput));
        this.validarCandidato(input);
        await this.repository.buscarCandidatoOuFalhar(id);
        const candidatoId = await this.repository.salvarCandidato(id, input);
        await this.repository.registrarHistorico({
            entidadeTipo: "CANDIDATO",
            entidadeId: candidatoId,
            candidatoId,
            usuarioId: this.parseOptionalId(authUser?.id),
            usuarioNome: authUser?.nomeUsuario ?? null,
            acao: "EDICAO_CANDIDATO",
            observacao: `Cadastro de ${input.nomeCompleto} atualizado.`
        });
        return this.buscarCandidato(candidatoId.toString());
    }
    async inativarCandidato(rawId, authUser) {
        const id = this.parseId(rawId);
        await this.repository.inativarCandidato(id);
        await this.repository.registrarHistorico({
            entidadeTipo: "CANDIDATO",
            entidadeId: id,
            candidatoId: id,
            usuarioId: this.parseOptionalId(authUser?.id),
            usuarioNome: authUser?.nomeUsuario ?? null,
            acao: "INATIVACAO_CANDIDATO",
            observacao: "Candidato inativado sem perda de histórico."
        });
    }
    async listarProcessos(rawFilters) {
        const filters = bancoEmpregosProcessoFiltersSchema.parse(rawFilters);
        const resultado = await this.repository.listarProcessos(filters);
        return {
            ...resultado,
            processos: await Promise.all(resultado.rows.map(async (item) => {
                const avaliacao = await this.repository.buscarAvaliacaoPorProcesso(item.id);
                return mapBancoEmpregosProcesso(item, avaliacao);
            }))
        };
    }
    async buscarProcesso(rawId) {
        const id = this.parseId(rawId);
        const processo = await this.repository.buscarProcessoOuFalhar(id);
        const avaliacao = await this.repository.buscarAvaliacaoPorProcesso(id);
        return mapBancoEmpregosProcesso(processo, avaliacao);
    }
    async vincularCandidato(rawInput, authUser) {
        const input = bancoEmpregosProcessoInputSchema.parse(this.normalizarPayload(rawInput));
        const processoExistenteId = await this.repository.buscarProcessoPorVagaECandidato(BigInt(input.vagaId), BigInt(input.candidatoId));
        if (processoExistenteId) {
            throw new AppError("Este candidato já está vinculado à vaga selecionada.", 422);
        }
        const processoId = await this.repository.salvarProcesso(undefined, input, this.parseOptionalId(authUser?.id));
        await this.repository.registrarHistorico({
            entidadeTipo: "PROCESSO",
            entidadeId: processoId,
            candidatoId: BigInt(input.candidatoId),
            vagaId: BigInt(input.vagaId),
            processoId,
            usuarioId: this.parseOptionalId(authUser?.id),
            usuarioNome: authUser?.nomeUsuario ?? null,
            acao: "CRIACAO_PROCESSO",
            observacao: "Candidato vinculado à vaga."
        });
        return this.buscarProcesso(processoId.toString());
    }
    async atualizarProcesso(rawId, rawInput, authUser) {
        const id = this.parseId(rawId);
        const input = bancoEmpregosProcessoInputSchema.parse(this.normalizarPayload(rawInput));
        const processoId = await this.repository.salvarProcesso(id, input, this.parseOptionalId(authUser?.id));
        await this.repository.registrarHistorico({
            entidadeTipo: "PROCESSO",
            entidadeId: processoId,
            candidatoId: BigInt(input.candidatoId),
            vagaId: BigInt(input.vagaId),
            processoId,
            usuarioId: this.parseOptionalId(authUser?.id),
            usuarioNome: authUser?.nomeUsuario ?? null,
            acao: "MOVIMENTACAO_PROCESSO",
            observacao: `Etapa ${input.etapa ?? "TRIAGEM_INICIAL"} e status ${input.status ?? "EM_ANALISE"} atualizados.`
        });
        return this.buscarProcesso(processoId.toString());
    }
    async salvarAvaliacao(rawProcessoId, rawInput, authUser) {
        const processoId = this.parseId(rawProcessoId);
        const input = bancoEmpregosAvaliacaoInputSchema.parse(this.normalizarPayload(rawInput));
        const avaliacao = await this.repository.salvarAvaliacao(processoId, input, this.parseOptionalId(authUser?.id), authUser?.nomeUsuario ?? null);
        const processo = await this.repository.buscarProcessoOuFalhar(processoId);
        await this.repository.registrarHistorico({
            entidadeTipo: "PROCESSO",
            entidadeId: processoId,
            candidatoId: processo.candidato_id,
            vagaId: processo.vaga_id,
            processoId,
            usuarioId: this.parseOptionalId(authUser?.id),
            usuarioNome: authUser?.nomeUsuario ?? null,
            acao: "AVALIACAO_PROCESSO",
            observacao: `Avaliação registrada com aderência de ${avaliacao.aderencia_percentual}%.`
        });
        return mapBancoEmpregosAvaliacao(avaliacao);
    }
    async listarDocumentos(rawCandidatoId) {
        const candidatoId = this.parseId(rawCandidatoId);
        const documentos = await this.repository.listarDocumentos(candidatoId);
        return documentos.map(mapBancoEmpregosDocumento);
    }
    async adicionarDocumento(rawCandidatoId, rawInput, file, authUser) {
        if (!file) {
            throw new AppError("Arquivo não informado.", 400);
        }
        const candidatoId = this.parseId(rawCandidatoId);
        const payload = bancoEmpregosDocumentoUploadSchema.parse(this.normalizarPayload(rawInput));
        const extraido = this.extrairSugestoesCurriculo(payload.textoExtraido, file.originalname);
        const upload = await storageService.salvarUpload(file, {
            scope: "banco_empregos_documento",
            entidadeId: candidatoId,
            entidadeTipo: "banco_empregos_candidato",
            usuarioUploadId: this.parseOptionalId(authUser?.id),
            observacao: payload.categoria
        });
        try {
            const documento = await this.repository.adicionarDocumento(candidatoId, upload.registro.id, {
                categoria: payload.categoria,
                descricao: payload.descricao,
                extraido
            });
            await this.repository.registrarHistorico({
                entidadeTipo: "DOCUMENTO",
                entidadeId: documento.id,
                candidatoId,
                usuarioId: this.parseOptionalId(authUser?.id),
                usuarioNome: authUser?.nomeUsuario ?? null,
                acao: "UPLOAD_DOCUMENTO",
                observacao: `${payload.categoria} enviado: ${file.originalname}.`
            });
            return mapBancoEmpregosDocumento(documento);
        }
        catch (error) {
            await storageService.rollbackArquivos([upload.caminhoArquivo]);
            throw error;
        }
    }
    async removerDocumento(rawDocumentoId, authUser) {
        const documentoId = this.parseId(rawDocumentoId);
        const documento = await this.repository.buscarDocumentoOuFalhar(documentoId);
        await this.repository.desativarDocumento(documentoId);
        await storageService.excluirLogico(documento.arquivo_id.toString(), this.parseOptionalId(authUser?.id));
        await this.repository.registrarHistorico({
            entidadeTipo: "DOCUMENTO",
            entidadeId: documentoId,
            candidatoId: documento.candidato_id,
            usuarioId: this.parseOptionalId(authUser?.id),
            usuarioNome: authUser?.nomeUsuario ?? null,
            acao: "EXCLUSAO_DOCUMENTO",
            observacao: `Documento ${documento.nome_original} removido.`
        });
    }
    async listarHistorico(rawFilters) {
        const filters = bancoEmpregosHistoricoFiltersSchema.parse(rawFilters);
        const resultado = await this.repository.listarHistorico(filters);
        return {
            ...resultado,
            historico: resultado.rows.map(mapBancoEmpregosHistorico)
        };
    }
    async exportar(rawQuery, tipo, formato) {
        if (tipo === "candidatos") {
            const filtros = bancoEmpregosCandidatoFiltersSchema.parse(rawQuery);
            const resultado = await this.repository.listarCandidatos({ ...filtros, pagina: 1, limite: 2000 });
            const candidatos = resultado.rows.map(mapBancoEmpregosCandidato);
            if (formato === "csv") {
                return this.gerarCsvExportacao("banco-empregos-candidatos", [
                    "Nome",
                    "CPF",
                    "Telefone",
                    "Cidade",
                    "Bairro",
                    "Escolaridade",
                    "Área de interesse",
                    "Cargo pretendido",
                    "Situação",
                    "Currículos",
                    "Certificados"
                ], candidatos.map((item) => [
                    item.nomeCompleto,
                    item.cpf ?? "",
                    item.telefone ?? "",
                    item.cidade ?? "",
                    item.bairro ?? "",
                    item.escolaridade ?? "",
                    item.areaInteresse ?? "",
                    item.cargoPretendido ?? "",
                    item.situacao,
                    String(item.totalCurriculos ?? 0),
                    String(item.totalCertificados ?? 0)
                ]));
            }
            return this.gerarPdfListagem("Relatório de candidatos", candidatos.map((item) => ({
                titulo: item.nomeCompleto,
                detalhes: [
                    `Situação: ${item.situacao}`,
                    `Cidade: ${item.cidade ?? "Não informada"}`,
                    `Área: ${item.areaInteresse ?? "Não informada"}`,
                    `Cargo pretendido: ${item.cargoPretendido ?? "Não informado"}`
                ]
            })));
        }
        if (tipo === "vagas") {
            const filtros = bancoEmpregosVagaFiltersSchema.parse(rawQuery);
            const resultado = await this.repository.listarVagas({ ...filtros, pagina: 1, limite: 2000 });
            const vagas = resultado.rows.map(mapBancoEmpregosVaga);
            if (formato === "csv") {
                return this.gerarCsvExportacao("banco-empregos-vagas", ["Título", "Empresa", "Área", "Cidade", "Situação", "Abertura", "Total de processos"], vagas.map((item) => [
                    item.titulo,
                    item.empresaNome,
                    item.area ?? "",
                    item.cidade ?? "",
                    item.situacao,
                    item.dataAbertura ?? "",
                    String(item.totalProcessos ?? 0)
                ]));
            }
            return this.gerarPdfListagem("Relatório de vagas", vagas.map((item) => ({
                titulo: `${item.titulo} - ${item.empresaNome}`,
                detalhes: [
                    `Situação: ${item.situacao}`,
                    `Cidade: ${item.cidade ?? "Não informada"}`,
                    `Quantidade: ${item.quantidadeVagas}`,
                    `Processos: ${item.totalProcessos ?? 0}`
                ]
            })));
        }
        const filtros = bancoEmpregosProcessoFiltersSchema.parse(rawQuery);
        const resultado = await this.repository.listarProcessos({ ...filtros, pagina: 1, limite: 2000 });
        const processos = await Promise.all(resultado.rows.map(async (item) => {
            const avaliacao = await this.repository.buscarAvaliacaoPorProcesso(item.id);
            return mapBancoEmpregosProcesso(item, avaliacao);
        }));
        if (formato === "csv") {
            return this.gerarCsvExportacao("banco-empregos-triagem", ["Vaga", "Empresa", "Candidato", "Etapa", "Status", "Aderência", "Nota final", "Selecionado"], processos.map((item) => [
                item.vagaTitulo ?? "",
                item.empresaNome ?? "",
                item.candidatoNome ?? "",
                item.etapa,
                item.status,
                String(item.aderenciaPercentual ?? ""),
                String(item.notaFinal ?? ""),
                item.selecionado ? "Sim" : "Não"
            ]));
        }
        return this.gerarPdfListagem("Relatório de triagem", processos.map((item) => ({
            titulo: `${item.candidatoNome ?? "Candidato"} - ${item.vagaTitulo ?? "Vaga"}`,
            detalhes: [
                `Status: ${item.status}`,
                `Etapa: ${item.etapa}`,
                `Aderência: ${item.aderenciaPercentual ?? 0}%`,
                `Nota final: ${item.notaFinal ?? 0}`
            ]
        })));
    }
    async gerarCarta(rawProcessoId, tipo, authUser) {
        const processo = await this.repository.buscarProcessoOuFalhar(this.parseId(rawProcessoId));
        const candidato = await this.repository.buscarCandidatoOuFalhar(processo.candidato_id);
        const vaga = await this.repository.buscarVagaOuFalhar(processo.vaga_id);
        const instituicao = await this.reportsRepository.obterInstituicaoRelatorio();
        const titulo = tipo === "encaminhamento"
            ? "Carta de encaminhamento"
            : tipo === "recomendacao"
                ? "Carta de recomendação"
                : tipo === "comprovante"
                    ? "Comprovante de encaminhamento"
                    : "Ficha resumida do candidato";
        const detalhes = [
            `Candidato: ${candidato.nome_completo}`,
            `Vaga: ${vaga.titulo}`,
            `Empresa: ${vaga.empresa_nome}`,
            `Situação do processo: ${processo.status}`,
            `Emitido por: ${authUser?.nomeUsuario ?? "Sistema G3N"}`
        ];
        if (tipo !== "ficha") {
            detalhes.push(`Data do encaminhamento: ${processo.data_encaminhamento?.toISOString().slice(0, 10) ?? new Date().toISOString().slice(0, 10)}`);
        }
        const blocoPrincipal = tipo === "ficha"
            ? [
                `CPF: ${candidato.cpf ?? "Não informado"}`,
                `Telefone: ${candidato.telefone ?? "Não informado"}`,
                `Cidade/Bairro: ${candidato.cidade ?? "Não informada"} / ${candidato.bairro ?? "Não informado"}`,
                `Escolaridade: ${candidato.escolaridade ?? "Não informada"}`,
                `Área de interesse: ${candidato.area_interesse ?? "Não informada"}`,
                `Resumo profissional: ${candidato.resumo_profissional ?? "Não informado"}`
            ]
            : [
                `Encaminhamos ${candidato.nome_completo} para a oportunidade ${vaga.titulo}, vinculada à empresa/instituição ${vaga.empresa_nome}.`,
                `O candidato apresenta interesse em ${candidato.area_interesse ?? "área não informada"} e disponibilidade ${candidato.disponibilidade ?? "não informada"}.`,
                `Solicitamos avaliação e retorno do processo seletivo para atualização do histórico institucional.`
            ];
        const buffer = await this.gerarPdfDocumentoInstitucional({
            titulo,
            instituicao,
            detalhes,
            linhas: blocoPrincipal
        });
        await this.repository.registrarHistorico({
            entidadeTipo: "PROCESSO",
            entidadeId: processo.id,
            candidatoId: processo.candidato_id,
            vagaId: processo.vaga_id,
            processoId: processo.id,
            usuarioId: this.parseOptionalId(authUser?.id),
            usuarioNome: authUser?.nomeUsuario ?? null,
            acao: `CARTA_${tipo.toUpperCase()}`,
            observacao: `${titulo} gerada para ${candidato.nome_completo}.`
        });
        return {
            filename: `banco-empregos-${tipo}-${processo.id.toString()}.pdf`,
            contentType: "application/pdf",
            buffer
        };
    }
    normalizarPayload(rawInput) {
        if (!rawInput || typeof rawInput !== "object") {
            return rawInput;
        }
        const payload = normalizarObjetoTexto(rawInput, mapaCamposTextoBancoEmpregos);
        const resultado = { ...payload };
        if (typeof resultado.cpf === "string")
            resultado.cpf = normalizarCpf(resultado.cpf);
        if (typeof resultado.email === "string")
            resultado.email = normalizarEmail(resultado.email);
        if (typeof resultado.telefone === "string")
            resultado.telefone = normalizarTelefone(resultado.telefone);
        if (typeof resultado.whatsapp === "string")
            resultado.whatsapp = normalizarTelefone(resultado.whatsapp);
        if (typeof resultado.cep === "string")
            resultado.cep = normalizarCep(resultado.cep);
        const normalizarColecao = (campo) => {
            if (!Array.isArray(resultado[campo]))
                return;
            resultado[campo] = resultado[campo].map((item) => item && typeof item === "object"
                ? normalizarObjetoTexto(item, mapaCamposTextoBancoEmpregos)
                : item);
        };
        normalizarColecao("experiencias");
        normalizarColecao("formacoes");
        normalizarColecao("habilidades");
        normalizarColecao("criterios");
        return resultado;
    }
    validarCandidato(input) {
        if (input.cpf && !validarCpf(input.cpf)) {
            throw new AppError("CPF inválido para o candidato.", 422);
        }
        if (input.email && !validarEmail(input.email)) {
            throw new AppError("E-mail inválido para o candidato.", 422);
        }
        if (input.cep && input.cep.replace(/\D/g, "").length !== 8) {
            throw new AppError("CEP inválido para o candidato.", 422);
        }
        if (input.telefone && ![10, 11].includes(input.telefone.replace(/\D/g, "").length)) {
            throw new AppError("Telefone do candidato deve ter 10 ou 11 dígitos.", 422);
        }
        if (input.whatsapp && ![10, 11].includes(input.whatsapp.replace(/\D/g, "").length)) {
            throw new AppError("WhatsApp do candidato deve ter 10 ou 11 dígitos.", 422);
        }
    }
    validarVaga(input) {
        if (input.dataAbertura && input.dataLimite && input.dataLimite < input.dataAbertura) {
            throw new AppError("A data limite não pode ser anterior à data de abertura.", 422);
        }
    }
    extrairSugestoesCurriculo(textoExtraido, nomeArquivo) {
        const texto = textoExtraido?.trim() || "";
        const email = texto.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
        const telefone = texto.match(/(?:\+55\s?)?(?:\(?\d{2}\)?\s?)?\d{4,5}-?\d{4}/)?.[0];
        const escolaridade = ["superior completo", "superior incompleto", "ensino médio", "ensino fundamental", "técnico"]
            .find((item) => texto.toLowerCase().includes(item)) ?? undefined;
        const cursos = texto
            .split(/\r?\n/)
            .filter((linha) => /curso|certificado|capacitação/i.test(linha))
            .slice(0, 5);
        const experiencias = texto
            .split(/\r?\n/)
            .filter((linha) => /empresa|experi[êe]ncia|cargo/i.test(linha))
            .slice(0, 5);
        return {
            nomeArquivo: nomeArquivo ?? undefined,
            email: email ? normalizarEmail(email) : undefined,
            telefone: telefone ? normalizarTelefone(telefone) : undefined,
            escolaridade,
            cursos,
            experiencias
        };
    }
    gerarCsvExportacao(filenameBase, cabecalho, linhas) {
        const csv = [cabecalho, ...linhas]
            .map((linha) => linha.map((coluna) => `"${String(coluna ?? "").replaceAll('"', '""')}"`).join(";"))
            .join("\r\n");
        return {
            filename: `${filenameBase}-${new Date().toISOString().slice(0, 10)}.csv`,
            contentType: "text/csv; charset=utf-8",
            buffer: Buffer.from(`\uFEFF${csv}`, "utf8")
        };
    }
    async gerarPdfListagem(titulo, itens) {
        const instituicao = await this.reportsRepository.obterInstituicaoRelatorio();
        const linhas = itens.flatMap((item) => [item.titulo, ...item.detalhes, ""]);
        const buffer = await this.gerarPdfDocumentoInstitucional({
            titulo,
            instituicao,
            detalhes: [`Total de registros: ${itens.length}`],
            linhas
        });
        return {
            filename: `${titulo.toLowerCase().replace(/\s+/g, "-")}.pdf`,
            contentType: "application/pdf",
            buffer
        };
    }
    async gerarPdfDocumentoInstitucional(input) {
        const doc = new PDFDocument({ size: "A4", margin: 42 });
        const chunks = [];
        const finalizado = new Promise((resolve, reject) => {
            doc.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
            doc.on("end", () => resolve(Buffer.concat(chunks)));
            doc.on("error", reject);
        });
        doc.font("Helvetica-Bold").fontSize(15).text(input.instituicao.razaoSocial || "G3N", { align: "center" });
        doc.moveDown(0.2);
        doc.font("Helvetica").fontSize(9).text(input.instituicao.rodape.linha2 || "", { align: "center" });
        doc.text(input.instituicao.rodape.linha3 || "", { align: "center" });
        doc.moveDown(1);
        doc.font("Helvetica-Bold").fontSize(14).text(input.titulo, { align: "center" });
        doc.moveDown(0.6);
        doc.font("Helvetica").fontSize(10);
        input.detalhes.forEach((linha) => doc.text(linha));
        doc.moveDown(0.8);
        input.linhas.forEach((linha) => {
            if (doc.y > 730) {
                doc.addPage();
            }
            doc.fontSize(10).text(linha || " ");
        });
        doc.moveDown(2);
        doc.text("______________________________________________", { align: "center" });
        doc.text("Assinatura / responsável", { align: "center" });
        doc.end();
        return finalizado;
    }
    parseId(rawId) {
        const parsed = Number(rawId);
        if (!Number.isInteger(parsed) || parsed <= 0) {
            throw new AppError("Identificador inválido.", 400);
        }
        return BigInt(parsed);
    }
    parseOptionalId(rawId) {
        if (!rawId)
            return undefined;
        const parsed = Number(rawId);
        if (!Number.isInteger(parsed) || parsed <= 0) {
            return undefined;
        }
        return BigInt(parsed);
    }
}
