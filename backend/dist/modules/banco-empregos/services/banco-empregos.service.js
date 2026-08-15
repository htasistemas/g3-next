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
    async listarDashboard(rawFilters, rawTenantId) {
        const filters = bancoEmpregosDashboardFiltersSchema.parse(rawFilters);
        return this.repository.obterDashboard(filters, this.parseTenantId(rawTenantId));
    }
    async listar(rawFilters, rawTenantId) {
        const filters = bancoEmpregosVagaFiltersSchema.parse(rawFilters);
        const tenantId = this.parseTenantId(rawTenantId);
        const resultado = await this.repository.listarVagas(filters, tenantId);
        return {
            ...resultado,
            vagas: resultado.rows.map(mapBancoEmpregosVaga)
        };
    }
    async obter(rawId, rawTenantId) {
        const id = this.parseId(rawId);
        const tenantId = this.parseTenantId(rawTenantId);
        const vaga = await this.repository.buscarVagaOuFalhar(id, tenantId);
        const processos = await this.repository.listarProcessos({ vagaId: rawId, limite: 200, pagina: 1 }, tenantId);
        return {
            vaga: mapBancoEmpregosVaga(vaga),
            processos: await Promise.all(processos.rows.map(async (item) => {
                const avaliacao = await this.repository.buscarAvaliacaoPorProcesso(item.id, tenantId);
                return mapBancoEmpregosProcesso(item, avaliacao);
            }))
        };
    }
    async criar(rawInput, authUser) {
        const input = bancoEmpregosVagaInputSchema.parse(this.normalizarPayload(rawInput));
        this.validarVaga(input);
        const tenantId = this.parseTenantId(authUser?.tenant_id);
        const vagaId = await this.repository.salvarVaga(undefined, input, tenantId);
        await this.repository.registrarHistorico({
            entidadeTipo: "VAGA",
            entidadeId: vagaId,
            vagaId,
            usuarioId: this.parseOptionalId(authUser?.id),
            usuarioNome: authUser?.nomeUsuario ?? null,
            acao: "CRIACAO_VAGA",
            observacao: `Vaga ${input.titulo} cadastrada.`,
            tenantId
        });
        return this.obter(vagaId.toString(), tenantId);
    }
    async atualizar(rawId, rawInput, authUser) {
        const id = this.parseId(rawId);
        const tenantId = this.parseTenantId(authUser?.tenant_id);
        const input = bancoEmpregosVagaInputSchema.parse(this.normalizarPayload(rawInput));
        this.validarVaga(input);
        await this.repository.buscarVagaOuFalhar(id, tenantId);
        const vagaId = await this.repository.salvarVaga(id, input, tenantId);
        await this.repository.registrarHistorico({
            entidadeTipo: "VAGA",
            entidadeId: vagaId,
            vagaId,
            usuarioId: this.parseOptionalId(authUser?.id),
            usuarioNome: authUser?.nomeUsuario ?? null,
            acao: "EDICAO_VAGA",
            observacao: `Vaga ${input.titulo} atualizada.`,
            tenantId
        });
        return this.obter(vagaId.toString(), tenantId);
    }
    async remover(rawId, authUser) {
        const id = this.parseId(rawId);
        const tenantId = this.parseTenantId(authUser?.tenant_id);
        await this.repository.removerVaga(id, tenantId);
        await this.repository.registrarHistorico({
            entidadeTipo: "VAGA",
            entidadeId: id,
            vagaId: id,
            usuarioId: this.parseOptionalId(authUser?.id),
            usuarioNome: authUser?.nomeUsuario ?? null,
            acao: "INATIVACAO_VAGA",
            observacao: "Vaga inativada.",
            tenantId
        });
    }
    async listarCandidatos(rawFilters, rawTenantId) {
        const filters = bancoEmpregosCandidatoFiltersSchema.parse(rawFilters);
        const resultado = await this.repository.listarCandidatos(filters, this.parseTenantId(rawTenantId));
        return {
            ...resultado,
            candidatos: resultado.rows.map(mapBancoEmpregosCandidato)
        };
    }
    async buscarCandidato(rawId, rawTenantId) {
        const id = this.parseId(rawId);
        const tenantId = this.parseTenantId(rawTenantId);
        const candidato = await this.repository.buscarCandidatoOuFalhar(id, tenantId);
        const documentos = await this.repository.listarDocumentos(id, tenantId);
        const processos = await this.repository.listarProcessos({ candidatoId: rawId, limite: 200, pagina: 1 }, tenantId);
        return {
            candidato: mapBancoEmpregosCandidato(candidato),
            documentos: documentos.map(mapBancoEmpregosDocumento),
            processos: await Promise.all(processos.rows.map(async (item) => {
                const avaliacao = await this.repository.buscarAvaliacaoPorProcesso(item.id, tenantId);
                return mapBancoEmpregosProcesso(item, avaliacao);
            }))
        };
    }
    async criarCandidato(rawInput, authUser) {
        const input = bancoEmpregosCandidatoInputSchema.parse(this.normalizarPayload(rawInput));
        this.validarCandidato(input);
        const tenantId = this.parseTenantId(authUser?.tenant_id);
        const candidatoId = await this.repository.salvarCandidato(undefined, input, tenantId);
        await this.repository.registrarHistorico({
            entidadeTipo: "CANDIDATO",
            entidadeId: candidatoId,
            candidatoId,
            usuarioId: this.parseOptionalId(authUser?.id),
            usuarioNome: authUser?.nomeUsuario ?? null,
            acao: "CRIACAO_CANDIDATO",
            observacao: `Candidato ${input.nomeCompleto} cadastrado.`,
            tenantId
        });
        return this.buscarCandidato(candidatoId.toString(), tenantId);
    }
    async atualizarCandidato(rawId, rawInput, authUser) {
        const id = this.parseId(rawId);
        const tenantId = this.parseTenantId(authUser?.tenant_id);
        const input = bancoEmpregosCandidatoInputSchema.parse(this.normalizarPayload(rawInput));
        this.validarCandidato(input);
        await this.repository.buscarCandidatoOuFalhar(id, tenantId);
        const candidatoId = await this.repository.salvarCandidato(id, input, tenantId);
        await this.repository.registrarHistorico({
            entidadeTipo: "CANDIDATO",
            entidadeId: candidatoId,
            candidatoId,
            usuarioId: this.parseOptionalId(authUser?.id),
            usuarioNome: authUser?.nomeUsuario ?? null,
            acao: "EDICAO_CANDIDATO",
            observacao: `Cadastro de ${input.nomeCompleto} atualizado.`,
            tenantId
        });
        return this.buscarCandidato(candidatoId.toString(), tenantId);
    }
    async inativarCandidato(rawId, authUser) {
        const id = this.parseId(rawId);
        const tenantId = this.parseTenantId(authUser?.tenant_id);
        await this.repository.inativarCandidato(id, tenantId);
        await this.repository.registrarHistorico({
            entidadeTipo: "CANDIDATO",
            entidadeId: id,
            candidatoId: id,
            usuarioId: this.parseOptionalId(authUser?.id),
            usuarioNome: authUser?.nomeUsuario ?? null,
            acao: "INATIVACAO_CANDIDATO",
            observacao: "Candidato inativado sem perda de historico.",
            tenantId
        });
    }
    async listarProcessos(rawFilters, rawTenantId) {
        const filters = bancoEmpregosProcessoFiltersSchema.parse(rawFilters);
        const tenantId = this.parseTenantId(rawTenantId);
        const resultado = await this.repository.listarProcessos(filters, tenantId);
        return {
            ...resultado,
            processos: await Promise.all(resultado.rows.map(async (item) => {
                const avaliacao = await this.repository.buscarAvaliacaoPorProcesso(item.id, tenantId);
                return mapBancoEmpregosProcesso(item, avaliacao);
            }))
        };
    }
    async buscarProcesso(rawId, rawTenantId) {
        const id = this.parseId(rawId);
        const tenantId = this.parseTenantId(rawTenantId);
        const processo = await this.repository.buscarProcessoOuFalhar(id, tenantId);
        const avaliacao = await this.repository.buscarAvaliacaoPorProcesso(id, tenantId);
        return mapBancoEmpregosProcesso(processo, avaliacao);
    }
    async vincularCandidato(rawInput, authUser) {
        const tenantId = this.parseTenantId(authUser?.tenant_id);
        const input = bancoEmpregosProcessoInputSchema.parse(this.normalizarPayload(rawInput));
        const processoExistenteId = await this.repository.buscarProcessoPorVagaECandidato(BigInt(input.vagaId), BigInt(input.candidatoId), tenantId);
        if (processoExistenteId) {
            throw new AppError("Este candidato ja esta vinculado a vaga selecionada.", 422);
        }
        const processoId = await this.repository.salvarProcesso(undefined, input, this.parseOptionalId(authUser?.id), tenantId);
        await this.repository.registrarHistorico({
            entidadeTipo: "PROCESSO",
            entidadeId: processoId,
            candidatoId: BigInt(input.candidatoId),
            vagaId: BigInt(input.vagaId),
            processoId,
            usuarioId: this.parseOptionalId(authUser?.id),
            usuarioNome: authUser?.nomeUsuario ?? null,
            acao: "CRIACAO_PROCESSO",
            observacao: "Candidato vinculado a vaga.",
            tenantId
        });
        return this.buscarProcesso(processoId.toString(), tenantId);
    }
    async atualizarProcesso(rawId, rawInput, authUser) {
        const tenantId = this.parseTenantId(authUser?.tenant_id);
        const id = this.parseId(rawId);
        const input = bancoEmpregosProcessoInputSchema.parse(this.normalizarPayload(rawInput));
        const processoId = await this.repository.salvarProcesso(id, input, this.parseOptionalId(authUser?.id), tenantId);
        await this.repository.registrarHistorico({
            entidadeTipo: "PROCESSO",
            entidadeId: processoId,
            candidatoId: BigInt(input.candidatoId),
            vagaId: BigInt(input.vagaId),
            processoId,
            usuarioId: this.parseOptionalId(authUser?.id),
            usuarioNome: authUser?.nomeUsuario ?? null,
            acao: "MOVIMENTACAO_PROCESSO",
            observacao: `Etapa ${input.etapa ?? "TRIAGEM_INICIAL"} e status ${input.status ?? "EM_ANALISE"} atualizados.`,
            tenantId
        });
        return this.buscarProcesso(processoId.toString(), tenantId);
    }
    async salvarAvaliacao(rawProcessoId, rawInput, authUser) {
        const tenantId = this.parseTenantId(authUser?.tenant_id);
        const processoId = this.parseId(rawProcessoId);
        const input = bancoEmpregosAvaliacaoInputSchema.parse(this.normalizarPayload(rawInput));
        const avaliacao = await this.repository.salvarAvaliacao(processoId, input, this.parseOptionalId(authUser?.id), authUser?.nomeUsuario ?? null, tenantId);
        const processo = await this.repository.buscarProcessoOuFalhar(processoId, tenantId);
        await this.repository.registrarHistorico({
            entidadeTipo: "PROCESSO",
            entidadeId: processoId,
            candidatoId: processo.candidato_id,
            vagaId: processo.vaga_id,
            processoId,
            usuarioId: this.parseOptionalId(authUser?.id),
            usuarioNome: authUser?.nomeUsuario ?? null,
            acao: "AVALIACAO_PROCESSO",
            observacao: `Avaliacao registrada com aderencia de ${avaliacao.aderencia_percentual}%.`,
            tenantId
        });
        return mapBancoEmpregosAvaliacao(avaliacao);
    }
    async listarDocumentos(rawCandidatoId, rawTenantId) {
        const candidatoId = this.parseId(rawCandidatoId);
        const documentos = await this.repository.listarDocumentos(candidatoId, this.parseTenantId(rawTenantId));
        return documentos.map(mapBancoEmpregosDocumento);
    }
    async adicionarDocumento(rawCandidatoId, rawInput, file, authUser) {
        if (!file) {
            throw new AppError("Arquivo nao informado.", 400);
        }
        const tenantId = this.parseTenantId(authUser?.tenant_id);
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
            }, tenantId);
            await this.repository.registrarHistorico({
                entidadeTipo: "DOCUMENTO",
                entidadeId: documento.id,
                candidatoId,
                usuarioId: this.parseOptionalId(authUser?.id),
                usuarioNome: authUser?.nomeUsuario ?? null,
                acao: "UPLOAD_DOCUMENTO",
                observacao: `${payload.categoria} enviado: ${file.originalname}.`,
                tenantId
            });
            return mapBancoEmpregosDocumento(documento);
        }
        catch (error) {
            await storageService.rollbackArquivos([upload.caminhoArquivo]);
            throw error;
        }
    }
    async removerDocumento(rawDocumentoId, authUser) {
        const tenantId = this.parseTenantId(authUser?.tenant_id);
        const documentoId = this.parseId(rawDocumentoId);
        const documento = await this.repository.buscarDocumentoOuFalhar(documentoId, tenantId);
        await this.repository.desativarDocumento(documentoId, tenantId);
        await storageService.excluirLogico(documento.arquivo_id.toString(), this.parseOptionalId(authUser?.id));
        await this.repository.registrarHistorico({
            entidadeTipo: "DOCUMENTO",
            entidadeId: documentoId,
            candidatoId: documento.candidato_id,
            usuarioId: this.parseOptionalId(authUser?.id),
            usuarioNome: authUser?.nomeUsuario ?? null,
            acao: "EXCLUSAO_DOCUMENTO",
            observacao: `Documento ${documento.nome_original} removido.`,
            tenantId
        });
    }
    async listarHistorico(rawFilters, rawTenantId) {
        const filters = bancoEmpregosHistoricoFiltersSchema.parse(rawFilters);
        const resultado = await this.repository.listarHistorico(filters, this.parseTenantId(rawTenantId));
        return {
            ...resultado,
            historico: resultado.rows.map(mapBancoEmpregosHistorico)
        };
    }
    async exportar(rawQuery, tipo, formato, rawTenantId) {
        const tenantId = this.parseTenantId(rawTenantId);
        if (tipo === "candidatos") {
            const filtros = bancoEmpregosCandidatoFiltersSchema.parse(rawQuery);
            const resultado = await this.repository.listarCandidatos({ ...filtros, pagina: 1, limite: 2000 }, tenantId);
            const candidatos = resultado.rows.map(mapBancoEmpregosCandidato);
            if (formato === "csv") {
                return this.gerarCsvExportacao("banco-empregos-candidatos", [
                    "Nome",
                    "CPF",
                    "Telefone",
                    "Cidade",
                    "Bairro",
                    "Escolaridade",
                    "Area de interesse",
                    "Cargo pretendido",
                    "Situacao",
                    "Curriculos",
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
            return this.gerarPdfListagem("Relatorio de candidatos", candidatos.map((item) => ({
                titulo: item.nomeCompleto,
                detalhes: [
                    `Situacao: ${item.situacao}`,
                    `Cidade: ${item.cidade ?? "Nao informada"}`,
                    `Area: ${item.areaInteresse ?? "Nao informada"}`,
                    `Cargo pretendido: ${item.cargoPretendido ?? "Nao informado"}`
                ]
            })), tenantId);
        }
        if (tipo === "vagas") {
            const filtros = bancoEmpregosVagaFiltersSchema.parse(rawQuery);
            const resultado = await this.repository.listarVagas({ ...filtros, pagina: 1, limite: 2000 }, tenantId);
            const vagas = resultado.rows.map(mapBancoEmpregosVaga);
            if (formato === "csv") {
                return this.gerarCsvExportacao("banco-empregos-vagas", ["Titulo", "Empresa", "Area", "Cidade", "Situacao", "Abertura", "Total de processos"], vagas.map((item) => [
                    item.titulo,
                    item.empresaNome,
                    item.area ?? "",
                    item.cidade ?? "",
                    item.situacao,
                    item.dataAbertura ?? "",
                    String(item.totalProcessos ?? 0)
                ]));
            }
            return this.gerarPdfListagem("Relatorio de vagas", vagas.map((item) => ({
                titulo: `${item.titulo} - ${item.empresaNome}`,
                detalhes: [
                    `Situacao: ${item.situacao}`,
                    `Cidade: ${item.cidade ?? "Nao informada"}`,
                    `Quantidade: ${item.quantidadeVagas}`,
                    `Processos: ${item.totalProcessos ?? 0}`
                ]
            })), tenantId);
        }
        const filtros = bancoEmpregosProcessoFiltersSchema.parse(rawQuery);
        const resultado = await this.repository.listarProcessos({ ...filtros, pagina: 1, limite: 2000 }, tenantId);
        const processos = await Promise.all(resultado.rows.map(async (item) => {
            const avaliacao = await this.repository.buscarAvaliacaoPorProcesso(item.id, tenantId);
            return mapBancoEmpregosProcesso(item, avaliacao);
        }));
        if (formato === "csv") {
            return this.gerarCsvExportacao("banco-empregos-triagem", ["Vaga", "Empresa", "Candidato", "Etapa", "Status", "Aderencia", "Nota final", "Selecionado"], processos.map((item) => [
                item.vagaTitulo ?? "",
                item.empresaNome ?? "",
                item.candidatoNome ?? "",
                item.etapa,
                item.status,
                String(item.aderenciaPercentual ?? ""),
                String(item.notaFinal ?? ""),
                item.selecionado ? "Sim" : "Nao"
            ]));
        }
        return this.gerarPdfListagem("Relatorio de triagem", processos.map((item) => ({
            titulo: `${item.candidatoNome ?? "Candidato"} - ${item.vagaTitulo ?? "Vaga"}`,
            detalhes: [
                `Status: ${item.status}`,
                `Etapa: ${item.etapa}`,
                `Aderencia: ${item.aderenciaPercentual ?? 0}%`,
                `Nota final: ${item.notaFinal ?? 0}`
            ]
        })), tenantId);
    }
    async gerarCarta(rawProcessoId, tipo, authUser) {
        const tenantId = this.parseTenantId(authUser?.tenant_id);
        const processo = await this.repository.buscarProcessoOuFalhar(this.parseId(rawProcessoId), tenantId);
        const candidato = await this.repository.buscarCandidatoOuFalhar(processo.candidato_id, tenantId);
        const vaga = await this.repository.buscarVagaOuFalhar(processo.vaga_id, tenantId);
        const instituicao = await this.reportsRepository.obterInstituicaoRelatorio(tenantId);
        const titulo = tipo === "encaminhamento"
            ? "Carta de encaminhamento"
            : tipo === "recomendacao"
                ? "Carta de recomendacao"
                : tipo === "comprovante"
                    ? "Comprovante de encaminhamento"
                    : "Ficha resumida do candidato";
        const detalhes = [
            `Candidato: ${candidato.nome_completo}`,
            `Vaga: ${vaga.titulo}`,
            `Empresa: ${vaga.empresa_nome}`,
            `Situacao do processo: ${processo.status}`,
            `Emitido por: ${authUser?.nomeUsuario ?? "Sistema G3N"}`
        ];
        if (tipo !== "ficha") {
            detalhes.push(`Data do encaminhamento: ${processo.data_encaminhamento?.toISOString().slice(0, 10) ?? new Date().toISOString().slice(0, 10)}`);
        }
        const blocoPrincipal = tipo === "ficha"
            ? [
                `CPF: ${candidato.cpf ?? "Nao informado"}`,
                `Telefone: ${candidato.telefone ?? "Nao informado"}`,
                `Cidade/Bairro: ${candidato.cidade ?? "Nao informada"} / ${candidato.bairro ?? "Nao informado"}`,
                `Escolaridade: ${candidato.escolaridade ?? "Nao informada"}`,
                `Area de interesse: ${candidato.area_interesse ?? "Nao informada"}`,
                `Resumo profissional: ${candidato.resumo_profissional ?? "Nao informado"}`
            ]
            : [
                `Encaminhamos ${candidato.nome_completo} para a oportunidade ${vaga.titulo}, vinculada a empresa/instituicao ${vaga.empresa_nome}.`,
                `O candidato apresenta interesse em ${candidato.area_interesse ?? "area nao informada"} e disponibilidade ${candidato.disponibilidade ?? "nao informada"}.`,
                "Solicitamos avaliacao e retorno do processo seletivo para atualizacao do historico institucional."
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
            observacao: `${titulo} gerada para ${candidato.nome_completo}.`,
            tenantId
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
            throw new AppError("CPF invalido para o candidato.", 422);
        }
        if (input.email && !validarEmail(input.email)) {
            throw new AppError("E-mail invalido para o candidato.", 422);
        }
        if (input.cep && input.cep.replace(/\D/g, "").length !== 8) {
            throw new AppError("CEP invalido para o candidato.", 422);
        }
        if (input.telefone && ![10, 11].includes(input.telefone.replace(/\D/g, "").length)) {
            throw new AppError("Telefone do candidato deve ter 10 ou 11 digitos.", 422);
        }
        if (input.whatsapp && ![10, 11].includes(input.whatsapp.replace(/\D/g, "").length)) {
            throw new AppError("WhatsApp do candidato deve ter 10 ou 11 digitos.", 422);
        }
    }
    validarVaga(input) {
        if (input.dataAbertura && input.dataLimite && input.dataLimite < input.dataAbertura) {
            throw new AppError("A data limite nao pode ser anterior a data de abertura.", 422);
        }
    }
    extrairSugestoesCurriculo(textoExtraido, nomeArquivo) {
        const texto = textoExtraido?.trim() || "";
        const email = texto.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
        const telefone = texto.match(/(?:\+55\s?)?(?:\(?\d{2}\)?\s?)?\d{4,5}-?\d{4}/)?.[0];
        const escolaridade = ["superior completo", "superior incompleto", "ensino medio", "ensino fundamental", "tecnico"]
            .find((item) => texto.toLowerCase().includes(item)) ?? undefined;
        const cursos = texto
            .split(/\r?\n/)
            .filter((linha) => /curso|certificado|capacitacao/i.test(linha))
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
    async gerarPdfListagem(titulo, itens, tenantId) {
        const instituicao = await this.reportsRepository.obterInstituicaoRelatorio(tenantId);
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
        doc.text("Assinatura / responsavel", { align: "center" });
        doc.end();
        return finalizado;
    }
    parseId(rawId) {
        const parsed = Number(rawId);
        if (!Number.isInteger(parsed) || parsed <= 0) {
            throw new AppError("Identificador invalido.", 400);
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
    parseTenantId(rawTenantId) {
        const tenantId = rawTenantId?.trim();
        if (!tenantId) {
            throw new AppError("Tenant nao identificado.", 401);
        }
        return tenantId;
    }
}
