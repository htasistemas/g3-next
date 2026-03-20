import { AppError } from "../../../shared/errors/app-error.js";
import { mapaCamposTextoOficios } from "../../../utils/text-format-config.js";
import { normalizarObjetoTexto } from "../../../utils/text-formatter.js";
import { storageService } from "../../arquivos/services/storage-instance.js";
import { ReportsRepository } from "../../reports/repositories/reports.repository.js";
import { mapOficioImagemToResponse, mapOficioToResponse } from "../oficios.mapper.js";
import { oficioImagemInputSchema, oficioInputSchema, oficioPdfAssinadoInputSchema } from "../oficios.schema.js";
import { OficiosRepository } from "../repositories/oficios.repository.js";
import { OficioDocumentRenderer } from "./oficio-document-renderer.js";
import { OficioImportParser } from "./oficio-import-parser.js";
export class OficiosService {
    repository = new OficiosRepository();
    reportsRepository = new ReportsRepository();
    renderer = new OficioDocumentRenderer();
    importParser = new OficioImportParser();
    dateFormatter = new Intl.DateTimeFormat("pt-BR", {
        timeZone: "America/Sao_Paulo",
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
    dateLongFormatter = new Intl.DateTimeFormat("pt-BR", {
        timeZone: "America/Sao_Paulo",
        day: "2-digit",
        month: "long",
        year: "numeric"
    });
    async listar() {
        const registros = await this.repository.listar();
        return registros.map((item) => mapOficioToResponse(item.oficio, item.tramites));
    }
    async obter(rawId) {
        const id = this.parseId(rawId);
        const registro = await this.repository.buscarPorIdOuFalhar(id);
        return mapOficioToResponse(registro.oficio, registro.tramites);
    }
    async obterProximoNumero(rawData) {
        const dataReferencia = this.parseDataReferencia(rawData);
        return this.repository.obterProximoNumero(dataReferencia);
    }
    async criar(rawInput, rawUsuarioId) {
        const input = oficioInputSchema.parse(await this.prepararPayloadCriacao(rawInput, rawUsuarioId));
        const registro = await this.repository.criar(input);
        return mapOficioToResponse(registro.oficio, registro.tramites);
    }
    async atualizar(rawId, rawInput, rawUsuarioId) {
        const id = this.parseId(rawId);
        const input = oficioInputSchema.parse(await this.prepararPayloadAtualizacao(id, rawInput, rawUsuarioId));
        const registro = await this.repository.atualizar(id, input);
        return mapOficioToResponse(registro.oficio, registro.tramites);
    }
    async remover(rawId, rawUsuarioId) {
        const id = this.parseId(rawId);
        const usuarioId = this.parseUsuarioId(rawUsuarioId);
        const registro = await this.repository.buscarPorIdOuFalhar(id);
        const imagens = await this.repository.listarImagens(id);
        await this.repository.remover(id);
        await this.limparArquivo(registro.oficio.pdf_assinado_conteudo, usuarioId);
        for (const imagem of imagens) {
            await this.limparArquivo(imagem.conteudo_base64, usuarioId);
        }
    }
    async salvarPdfAssinado(rawId, rawInput, rawUsuarioId) {
        const id = this.parseId(rawId);
        const input = oficioPdfAssinadoInputSchema.parse(this.normalizarPayload(rawInput));
        const usuarioId = this.parseUsuarioId(rawUsuarioId);
        const existente = await this.repository.buscarPorIdOuFalhar(id);
        const arquivo = await storageService.salvarArquivo({
            scope: "oficio_documento",
            conteudo: input.conteudoBase64,
            nomeOriginal: input.nomeArquivo,
            mimeType: input.tipoMime,
            entidadeId: id,
            usuarioUploadId: usuarioId,
            observacao: "PDF assinado do oficio"
        });
        try {
            const registro = await this.repository.salvarPdfAssinado(id, {
                ...input,
                conteudoBase64: arquivo.caminhoArquivo,
                tipoMime: arquivo.registro.mime_type
            });
            await storageService.vincularEntidade(arquivo.caminhoArquivo, id);
            await this.limparArquivo(existente.oficio.pdf_assinado_conteudo, usuarioId, arquivo.caminhoArquivo);
            return mapOficioToResponse(registro.oficio, registro.tramites);
        }
        catch (error) {
            await storageService.rollbackArquivos([arquivo.caminhoArquivo]);
            throw error;
        }
    }
    async obterPdfAssinado(rawId) {
        const id = this.parseId(rawId);
        const pdf = await this.repository.obterPdfAssinado(id);
        if (!pdf.nome || !pdf.tipo || !pdf.conteudo) {
            throw new AppError("Oficio nao possui PDF assinado.", 404);
        }
        return pdf;
    }
    async removerPdfAssinado(rawId, rawUsuarioId) {
        const id = this.parseId(rawId);
        const usuarioId = this.parseUsuarioId(rawUsuarioId);
        const pdf = await this.repository.obterPdfAssinado(id);
        await this.repository.removerPdfAssinado(id);
        await this.limparArquivo(pdf.conteudo, usuarioId);
    }
    async listarImagens(rawId) {
        const id = this.parseId(rawId);
        const imagens = await this.repository.listarImagens(id);
        return imagens.map(mapOficioImagemToResponse);
    }
    async adicionarImagem(rawId, rawInput, rawUsuarioId) {
        const id = this.parseId(rawId);
        const input = oficioImagemInputSchema.parse(this.normalizarPayload(rawInput));
        const usuarioId = this.parseUsuarioId(rawUsuarioId);
        const arquivo = await storageService.salvarArquivo({
            scope: "oficio_documento",
            conteudo: input.conteudoBase64,
            nomeOriginal: input.nomeArquivo,
            mimeType: input.tipoMime,
            entidadeId: id,
            usuarioUploadId: usuarioId,
            observacao: "Imagem do oficio"
        });
        try {
            const imagem = await this.repository.adicionarImagem(id, {
                ...input,
                conteudoBase64: arquivo.caminhoArquivo,
                tipoMime: arquivo.registro.mime_type
            });
            await storageService.vincularEntidade(arquivo.caminhoArquivo, id);
            return mapOficioImagemToResponse(imagem);
        }
        catch (error) {
            await storageService.rollbackArquivos([arquivo.caminhoArquivo]);
            throw error;
        }
    }
    async removerImagem(rawId, rawImagemId, rawUsuarioId) {
        const id = this.parseId(rawId);
        const imagemId = this.parseId(rawImagemId);
        const usuarioId = this.parseUsuarioId(rawUsuarioId);
        const imagens = await this.repository.listarImagens(id);
        const imagem = imagens.find((item) => item.id === imagemId);
        await this.repository.removerImagem(id, imagemId);
        await this.limparArquivo(imagem?.conteudo_base64, usuarioId);
    }
    async gerarDocumento(rawId) {
        const id = this.parseId(rawId);
        const registro = await this.repository.buscarPorIdOuFalhar(id);
        const contexto = await this.montarContextoInstitucional();
        const documento = this.montarDocumentoOficio(registro.oficio, contexto);
        const pdf = await this.renderer.render(documento);
        return {
            filename: `oficio-${registro.oficio.numero.replace(/[^\d/]+/g, "").replaceAll("/", "-") || id.toString()}.pdf`,
            pdf
        };
    }
    async obterContextoDocumento() {
        const contexto = await this.montarContextoInstitucional();
        return {
            cidadeUf: this.formatarCidadeUf(contexto),
            instituicao: contexto.instituicao
        };
    }
    async importarConteudoArquivo(arquivo) {
        return this.importParser.importar(arquivo
            ? {
                nomeArquivo: arquivo.originalname,
                tipoMime: arquivo.mimetype,
                buffer: arquivo.buffer
            }
            : undefined);
    }
    parseId(rawId) {
        const parsed = Number(rawId);
        if (!Number.isInteger(parsed) || parsed <= 0) {
            throw new AppError("Identificador invalido.", 400);
        }
        return BigInt(parsed);
    }
    normalizarPayload(rawInput) {
        if (!rawInput || typeof rawInput !== "object")
            return rawInput;
        return normalizarObjetoTexto(rawInput, mapaCamposTextoOficios);
    }
    async prepararPayloadCriacao(rawInput, rawUsuarioId) {
        const payload = this.normalizarPayload(rawInput);
        if (!payload || typeof payload !== "object") {
            return payload;
        }
        const registro = payload;
        const identificacaoBase = registro.identificacao && typeof registro.identificacao === "object"
            ? registro.identificacao
            : {};
        const dataReferencia = this.parseDataReferencia(identificacaoBase.data);
        const numero = await this.repository.obterProximoNumero(dataReferencia);
        const criadoPor = this.parseUsuarioIdNumber(rawUsuarioId);
        return {
            ...registro,
            criadoPor: registro.criadoPor ?? criadoPor ?? undefined,
            identificacao: {
                ...identificacaoBase,
                numero
            }
        };
    }
    async prepararPayloadAtualizacao(id, rawInput, rawUsuarioId) {
        const payload = this.normalizarPayload(rawInput);
        if (!payload || typeof payload !== "object") {
            return payload;
        }
        const existente = await this.repository.buscarPorIdOuFalhar(id);
        const registro = payload;
        const identificacaoBase = registro.identificacao && typeof registro.identificacao === "object"
            ? registro.identificacao
            : {};
        const numeroInformado = typeof identificacaoBase.numero === "string" ? identificacaoBase.numero.trim() : "";
        const criadoPor = this.parseUsuarioIdNumber(rawUsuarioId);
        return {
            ...registro,
            criadoPor: registro.criadoPor ?? criadoPor ?? undefined,
            identificacao: {
                ...identificacaoBase,
                numero: numeroInformado || existente.oficio.numero
            }
        };
    }
    parseDataReferencia(rawValue) {
        if (typeof rawValue !== "string") {
            return undefined;
        }
        const valor = rawValue.trim();
        if (!valor) {
            return undefined;
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
            throw new AppError("Data de referencia invalida. Use o formato AAAA-MM-DD.", 400);
        }
        return valor;
    }
    isManagedStoragePath(valor) {
        if (!valor?.trim())
            return false;
        const normalized = valor.trim();
        return !normalized.startsWith("data:") && !/^https?:\/\//i.test(normalized);
    }
    async limparArquivo(valor, usuarioId, ignorarCaminho) {
        if (!this.isManagedStoragePath(valor)) {
            return;
        }
        if (valor === ignorarCaminho) {
            return;
        }
        await storageService.desativarPorCaminho(valor, usuarioId);
    }
    parseUsuarioId(rawUsuarioId) {
        if (!rawUsuarioId)
            return undefined;
        const parsed = Number(rawUsuarioId);
        if (!Number.isInteger(parsed) || parsed <= 0) {
            return undefined;
        }
        return BigInt(parsed);
    }
    parseUsuarioIdNumber(rawUsuarioId) {
        if (!rawUsuarioId)
            return undefined;
        const parsed = Number(rawUsuarioId);
        if (!Number.isInteger(parsed) || parsed <= 0) {
            return undefined;
        }
        return parsed;
    }
    async montarContextoInstitucional() {
        const instituicao = await this.reportsRepository.obterInstituicaoRelatorio();
        return {
            instituicao: {
                nomeCompleto: this.normalizarTexto(instituicao.razaoSocial) ?? "Instituição não cadastrada",
                unidadeOuNucleo: this.normalizarTexto(instituicao.unidadeNome),
                cnpj: this.normalizarTexto(instituicao.cnpj),
                endereco: this.normalizarTexto(instituicao.enderecoCompleto),
                cep: this.normalizarTexto(instituicao.cep),
                cidade: this.normalizarTexto(instituicao.cidade),
                uf: this.normalizarTexto(instituicao.uf)?.toUpperCase(),
                telefone: this.normalizarTexto(instituicao.telefone),
                site: this.normalizarTexto(instituicao.site),
                email: this.normalizarTexto(instituicao.email),
                logoUrl: this.normalizarTexto(instituicao.logoUrl),
                rodapePadrao: {
                    linha1: this.normalizarTexto(instituicao.rodape.linha1) ?? "Instituição não cadastrada",
                    linha2: this.normalizarTexto(instituicao.rodape.linha2),
                    linha3: this.normalizarTexto(instituicao.rodape.linha3)
                }
            }
        };
    }
    montarDocumentoOficio(oficio, contexto) {
        return {
            numeroOficio: this.normalizarTexto(oficio.numero) ?? "---",
            cidadeUf: this.formatarCidadeUf(contexto),
            dataExtenso: this.formatarDataExtenso(oficio.data),
            destinatarioInstituicao: this.normalizarTexto(oficio.razao_social) ?? this.normalizarTexto(oficio.destinatario),
            destinatarioTratamento: this.normalizarTexto(oficio.saudacao),
            destinatarioNome: this.normalizarTexto(oficio.para) ?? this.normalizarTexto(oficio.destinatario_responsavel),
            destinatarioCargo: this.normalizarTexto(oficio.cargo_para) ?? this.normalizarTexto(oficio.destinatario_cargo),
            assunto: this.normalizarTexto(oficio.assunto),
            corpoTexto: this.normalizarTexto(oficio.corpo),
            informacoesComplementares: this.montarInformacoesComplementares(oficio),
            fechamento: this.normalizarTexto(oficio.finalizacao),
            responsavelNome: this.normalizarTexto(oficio.assinatura_nome) ?? this.normalizarTexto(oficio.responsavel),
            responsavelCargo: this.normalizarTexto(oficio.assinatura_cargo),
            instituicao: contexto.instituicao
        };
    }
    montarInformacoesComplementares(oficio) {
        const itens = [];
        const observacoes = this.normalizarTexto(oficio.observacoes);
        const linhas = (observacoes ?? "")
            .split(/\r?\n/)
            .map((item) => item.trim())
            .filter(Boolean);
        const rotulosMapa = [
            { aliases: ["denominacao do evento"], rotulo: "Denominação do evento" },
            { aliases: ["estimativa de publico"], rotulo: "Estimativa de público" },
            { aliases: ["cronograma"], rotulo: "Cronograma" },
            {
                aliases: ["datas e horarios", "data e horario", "data e horarios", "datas e horario"],
                rotulo: "Datas e horários"
            }
        ];
        const linhasConsumidas = new Set();
        for (const [index, linha] of linhas.entries()) {
            const separador = linha.indexOf(":");
            if (separador <= 0) {
                continue;
            }
            const chave = this.normalizarMarcador(linha.slice(0, separador));
            const valor = this.normalizarTexto(linha.slice(separador + 1));
            if (!valor) {
                continue;
            }
            const configuracao = rotulosMapa.find((item) => item.aliases.includes(chave));
            if (!configuracao || itens.some((item) => item.rotulo === configuracao.rotulo)) {
                continue;
            }
            itens.push({ rotulo: configuracao.rotulo, valor });
            linhasConsumidas.add(index);
        }
        const observacoesLivres = linhas.filter((_, index) => !linhasConsumidas.has(index)).join(" ");
        const observacoesComplementares = this.normalizarTexto(observacoesLivres);
        if (observacoesComplementares) {
            itens.push({ rotulo: "Observações complementares", valor: observacoesComplementares });
        }
        const prazoResposta = this.normalizarTexto(oficio.prazo_resposta);
        if (prazoResposta) {
            itens.push({ rotulo: "Prazo de resposta", valor: prazoResposta });
        }
        const classificacao = this.normalizarTexto(oficio.classificacao);
        if (classificacao) {
            itens.push({ rotulo: "Classificação", valor: classificacao });
        }
        return itens.length ? itens : undefined;
    }
    normalizarMarcador(valor) {
        return (valor ?? "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();
    }
    formatarCidadeUf(contexto) {
        const cidade = this.normalizarTexto(contexto.instituicao.cidade);
        const uf = this.normalizarTexto(contexto.instituicao.uf)?.toUpperCase();
        if (cidade && uf) {
            return `${cidade}-${uf}`;
        }
        return cidade ?? uf ?? "";
    }
    normalizarTexto(valor) {
        if (valor === null || valor === undefined) {
            return undefined;
        }
        if (valor instanceof Date) {
            return this.formatarData(valor);
        }
        const texto = String(valor).trim();
        return texto.length > 0 ? texto : undefined;
    }
    formatarDataExtenso(valor) {
        if (!valor) {
            return "";
        }
        const data = valor instanceof Date ? valor : new Date(valor);
        if (Number.isNaN(data.getTime())) {
            return typeof valor === "string" ? valor : "";
        }
        const texto = this.dateLongFormatter.format(data);
        return texto.replace(/ de ([a-zà-ú])/u, (_match, letra) => ` de ${letra.toUpperCase()}`);
    }
    formatarData(valor) {
        if (!valor) {
            return "---";
        }
        const data = valor instanceof Date ? valor : new Date(valor);
        if (Number.isNaN(data.getTime())) {
            return typeof valor === "string" ? valor : "---";
        }
        return this.dateFormatter.format(data).replaceAll("/", "-");
    }
}
