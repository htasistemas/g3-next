import { AppError } from "../../../shared/errors/app-error.js";
import { detectarMimeTypePorAssinatura, mimeToExt } from "../../arquivos/services/storage-utils.js";
import { storageService } from "../../arquivos/services/storage-instance.js";
import { mapEmprestimoRowToResponse, mapLivroRowToResponse } from "../biblioteca.mapper.js";
import { bibliotecaEmprestimoInputSchema, bibliotecaLivroInputSchema } from "../biblioteca.schema.js";
import { BibliotecaRepository } from "../repositories/biblioteca.repository.js";
export class BibliotecaService {
    repository = new BibliotecaRepository();
    async listarLivros(tenantId) {
        const rows = await this.repository.listarLivros(this.parseTenantId(tenantId));
        return rows.map(mapLivroRowToResponse);
    }
    async obterProximoCodigoLivro(tenantId) {
        const codigo = await this.repository.obterProximoCodigo(this.parseTenantId(tenantId));
        return { codigo };
    }
    async consultarLivroPorIsbn(rawIsbn) {
        const isbn = this.normalizarIsbn(rawIsbn);
        const livro = (await this.consultarOpenLibrary(isbn)) ?? (await this.consultarGoogleBooks(isbn));
        if (!livro) {
            throw new AppError("ISBN nao encontrado nas bases publicas consultadas.", 404);
        }
        if (livro.capaUrl) {
            livro.capaUrl = await this.converterCapaParaDataUrl(livro.capaUrl);
        }
        return livro;
    }
    async criarLivro(rawInput, rawUsuarioId, tenantId) {
        const input = bibliotecaLivroInputSchema.parse(rawInput);
        const usuarioId = this.parseUsuarioId(rawUsuarioId);
        const tenantObrigatorio = this.parseTenantId(tenantId);
        const preparado = await this.prepararLivroPayload(input, usuarioId);
        try {
            const row = await this.repository.criarLivro(preparado.input, tenantObrigatorio);
            await this.vincularArquivos(preparado.novosCaminhos, row.id);
            return mapLivroRowToResponse(row);
        }
        catch (error) {
            await storageService.rollbackArquivos(preparado.novosCaminhos);
            throw error;
        }
    }
    async atualizarLivro(rawId, rawInput, rawUsuarioId, tenantId) {
        const id = this.parseId(rawId);
        const input = bibliotecaLivroInputSchema.parse(rawInput);
        const usuarioId = this.parseUsuarioId(rawUsuarioId);
        const tenantObrigatorio = this.parseTenantId(tenantId);
        const existente = await this.repository.obterLivroOuFalhar(id, tenantObrigatorio);
        const preparado = await this.prepararLivroPayload(input, usuarioId, id);
        try {
            const row = await this.repository.atualizarLivro(id, preparado.input, tenantObrigatorio);
            await this.vincularArquivos(preparado.novosCaminhos, id);
            await this.limparCapaSubstituida(existente.capa_url, row.capa_url, usuarioId);
            return mapLivroRowToResponse(row);
        }
        catch (error) {
            await storageService.rollbackArquivos(preparado.novosCaminhos);
            throw error;
        }
    }
    async excluirLivro(rawId, rawUsuarioId, tenantId) {
        const id = this.parseId(rawId);
        const usuarioId = this.parseUsuarioId(rawUsuarioId);
        const tenantObrigatorio = this.parseTenantId(tenantId);
        const existente = await this.repository.obterLivroOuFalhar(id, tenantObrigatorio);
        await this.repository.removerLivro(id, tenantObrigatorio);
        await this.limparCapaSubstituida(existente.capa_url, undefined, usuarioId);
    }
    async listarEmprestimos(tenantId) {
        const rows = await this.repository.listarEmprestimos(this.parseTenantId(tenantId));
        return rows.map(mapEmprestimoRowToResponse);
    }
    async criarEmprestimo(rawInput, tenantId) {
        const input = bibliotecaEmprestimoInputSchema.parse(rawInput);
        const row = await this.repository.criarEmprestimo(input, this.parseTenantId(tenantId));
        return mapEmprestimoRowToResponse(row);
    }
    async atualizarEmprestimo(rawId, rawInput, tenantId) {
        const id = this.parseId(rawId);
        const input = bibliotecaEmprestimoInputSchema.parse(rawInput);
        const row = await this.repository.atualizarEmprestimo(id, input, this.parseTenantId(tenantId));
        return mapEmprestimoRowToResponse(row);
    }
    async excluirEmprestimo(rawId, tenantId) {
        const id = this.parseId(rawId);
        await this.repository.removerEmprestimo(id, this.parseTenantId(tenantId));
    }
    async registrarDevolucao(rawId, rawInput, tenantId) {
        const id = this.parseId(rawId);
        const input = typeof rawInput === "object" &&
            rawInput &&
            "dataDevolucaoReal" in rawInput
            ? String(rawInput.dataDevolucaoReal ?? "")
            : "";
        if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) {
            throw new AppError("Informe a data de devolucao no formato YYYY-MM-DD.", 400);
        }
        const row = await this.repository.registrarDevolucao(id, input, this.parseTenantId(tenantId));
        return mapEmprestimoRowToResponse(row);
    }
    async listarAlertas(tenantId) {
        const rows = await this.repository.listarAlertas(this.parseTenantId(tenantId));
        return rows.map((item) => ({
            emprestimoId: String(item.emprestimo_id),
            livroTitulo: item.livro_titulo,
            beneficiarioNome: item.beneficiario_nome ?? undefined,
            dataDevolucaoPrevista: item.data_devolucao_prevista.toISOString().slice(0, 10),
            diasParaVencimento: Number(item.dias_para_vencimento),
            status: item.status_alerta
        }));
    }
    async prepararLivroPayload(input, usuarioId, entidadeId) {
        const capa = await this.persistirCapaLivro(input, usuarioId, entidadeId);
        return {
            input: {
                ...input,
                capaUrl: capa.caminhoArquivo ?? null
            },
            novosCaminhos: capa.novoCaminho ? [capa.novoCaminho] : []
        };
    }
    async persistirCapaLivro(input, usuarioId, entidadeId) {
        const capaUrl = input.capaUrl?.trim();
        if (!capaUrl) {
            return { caminhoArquivo: undefined, novoCaminho: undefined };
        }
        if (/^https?:\/\//i.test(capaUrl)) {
            const imagem = await this.baixarImagemRemota(capaUrl);
            const resultado = await storageService.salvarArquivo({
                scope: "biblioteca_capa",
                conteudo: imagem.buffer.toString("base64"),
                nomeOriginal: this.gerarNomeArquivoCapa(input, imagem.mimeType),
                mimeType: imagem.mimeType,
                entidadeId,
                usuarioUploadId: usuarioId,
                observacao: `Capa do livro ${input.titulo}`
            });
            return {
                caminhoArquivo: resultado.caminhoArquivo,
                novoCaminho: resultado.caminhoArquivo
            };
        }
        const arquivo = await storageService.persistirCampo({
            scope: "biblioteca_capa",
            valor: capaUrl,
            nomeOriginal: this.gerarNomeArquivoCapa(input),
            mimeType: "image/jpeg",
            entidadeId,
            usuarioUploadId: usuarioId,
            observacao: `Capa do livro ${input.titulo}`
        });
        return {
            caminhoArquivo: arquivo.caminhoArquivo,
            novoCaminho: arquivo.registro && arquivo.caminhoArquivo ? arquivo.caminhoArquivo : undefined
        };
    }
    async vincularArquivos(caminhos, entidadeId) {
        for (const caminho of caminhos) {
            await storageService.vincularEntidade(caminho, entidadeId);
        }
    }
    async limparCapaSubstituida(caminhoAnterior, caminhoAtual, usuarioId) {
        if (!this.isManagedStoragePath(caminhoAnterior)) {
            return;
        }
        if (caminhoAnterior === caminhoAtual) {
            return;
        }
        await storageService.desativarPorCaminho(caminhoAnterior, usuarioId);
    }
    async consultarOpenLibrary(isbn) {
        const response = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${encodeURIComponent(isbn)}&format=json&jscmd=data`, { signal: AbortSignal.timeout(15000) });
        if (!response.ok) {
            return null;
        }
        const payload = (await response.json());
        const item = payload[`ISBN:${isbn}`];
        if (!item) {
            return null;
        }
        const titulo = item.title?.trim() || "";
        const autores = (item.authors ?? [])
            .map((autor) => autor.name?.trim() || "")
            .filter(Boolean);
        const autoresNormalizados = autores.length
            ? autores
            : item.by_statement?.trim()
                ? [item.by_statement.trim()]
                : [];
        if (!titulo) {
            return null;
        }
        return {
            isbn,
            titulo,
            subtitulo: item.subtitle?.trim() || undefined,
            autor: autoresNormalizados.join("; "),
            autores: autoresNormalizados,
            editora: item.publishers?.map((editora) => editora.name?.trim() || "").find(Boolean),
            anoPublicacao: this.extrairAnoPublicacao(item.publish_date),
            categoria: item.subjects?.map((assunto) => assunto.name?.trim() || "").find(Boolean),
            sinopse: this.extrairTextoDetalhe(item.description) ??
                this.extrairTextoDetalhe(item.excerpt) ??
                this.extrairTextoDetalhe(item.notes),
            capaUrl: item.cover?.large ?? item.cover?.medium ?? item.cover?.small
        };
    }
    async consultarGoogleBooks(isbn) {
        const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${encodeURIComponent(isbn)}`, { signal: AbortSignal.timeout(15000) });
        if (!response.ok) {
            return null;
        }
        const payload = (await response.json());
        const item = payload.items?.[0]?.volumeInfo;
        if (!item?.title?.trim()) {
            return null;
        }
        const autores = (item.authors ?? []).map((autor) => autor.trim()).filter(Boolean);
        return {
            isbn,
            titulo: item.title.trim(),
            subtitulo: item.subtitle?.trim() || undefined,
            autor: autores.join("; "),
            autores,
            editora: item.publisher?.trim() || undefined,
            anoPublicacao: this.extrairAnoPublicacao(item.publishedDate),
            categoria: item.categories?.map((categoria) => categoria.trim()).find(Boolean),
            sinopse: item.description?.trim() || undefined,
            capaUrl: item.imageLinks?.thumbnail ?? item.imageLinks?.smallThumbnail
        };
    }
    async converterCapaParaDataUrl(capaUrl) {
        if (!/^https?:\/\//i.test(capaUrl)) {
            return capaUrl;
        }
        try {
            const imagem = await this.baixarImagemRemota(capaUrl);
            return `data:${imagem.mimeType};base64,${imagem.buffer.toString("base64")}`;
        }
        catch {
            return capaUrl;
        }
    }
    async baixarImagemRemota(url) {
        const response = await fetch(url, {
            signal: AbortSignal.timeout(15000),
            headers: {
                "User-Agent": "G3-Next/1.0"
            }
        });
        if (!response.ok) {
            throw new AppError("Nao foi possivel baixar a capa do livro no momento.", 502);
        }
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        if (!buffer.length) {
            throw new AppError("A capa retornada pelo servico externo esta vazia.", 502);
        }
        const mimeHeader = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
        const mimeType = detectarMimeTypePorAssinatura(buffer) ?? mimeHeader ?? "application/octet-stream";
        if (!mimeType.startsWith("image/")) {
            throw new AppError("A capa retornada pelo servico externo nao e uma imagem valida.", 502);
        }
        return { buffer, mimeType };
    }
    gerarNomeArquivoCapa(input, mimeType = "image/jpeg") {
        const referencia = input.isbn?.trim() || input.codigo?.trim() || input.titulo?.trim() || "livro";
        const extensao = mimeToExt(mimeType) ?? "jpg";
        return `livro-${referencia}-capa.${extensao}`;
    }
    extrairAnoPublicacao(valor) {
        if (!valor)
            return undefined;
        const match = valor.match(/\b(1[0-9]{3}|20[0-9]{2}|2100)\b/);
        return match ? Number(match[1]) : undefined;
    }
    extrairTextoDetalhe(valor) {
        if (!valor)
            return undefined;
        if (typeof valor === "string") {
            const trimmed = valor.trim();
            return trimmed || undefined;
        }
        const trimmed = valor.value?.trim();
        return trimmed || undefined;
    }
    isManagedStoragePath(valor) {
        if (!valor?.trim())
            return false;
        const normalized = valor.trim();
        return !normalized.startsWith("data:") && !/^https?:\/\//i.test(normalized);
    }
    normalizarIsbn(rawIsbn) {
        const isbn = rawIsbn.replace(/[^0-9Xx]/g, "").toUpperCase();
        if (isbn.length !== 10 && isbn.length !== 13) {
            throw new AppError("Informe um ISBN valido com 10 ou 13 caracteres.", 400);
        }
        return isbn;
    }
    parseId(rawId) {
        const parsed = Number(rawId);
        if (!Number.isInteger(parsed) || parsed <= 0) {
            throw new AppError("Identificador invalido.", 400);
        }
        return BigInt(parsed);
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
    parseTenantId(rawTenantId) {
        const tenantId = rawTenantId?.trim();
        if (!tenantId) {
            throw new AppError("Tenant da sessao nao identificado.", 401);
        }
        return tenantId;
    }
}
