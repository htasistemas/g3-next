import { createReadStream } from "node:fs";
import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { env } from "../../../config/env.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { requiredStorageDirectories } from "./storage-policy.js";
import { normalizarCaminhoLogico } from "./storage-utils.js";
export class LocalStorageProvider {
    rootPath = resolve(process.cwd(), env.APP_STORAGE_ROOT);
    initPromise = null;
    async ensureReady() {
        if (!this.initPromise) {
            this.initPromise = (async () => {
                await mkdir(this.rootPath, { recursive: true });
                for (const directory of requiredStorageDirectories) {
                    await mkdir(resolve(this.rootPath, directory), { recursive: true });
                }
            })();
        }
        await this.initPromise;
    }
    resolveAbsolutePath(caminhoArquivo) {
        const caminhoLogico = normalizarCaminhoLogico(caminhoArquivo);
        const absolutePath = resolve(this.rootPath, caminhoLogico);
        const relativeToRoot = relative(this.rootPath, absolutePath).replace(/\\/g, "/");
        if (relativeToRoot.startsWith("..") || relativeToRoot.includes("/../")) {
            throw new AppError("Caminho de arquivo fora da area de storage.", 400);
        }
        return absolutePath;
    }
    normalizePath(caminhoArquivo) {
        const trimmed = caminhoArquivo.trim();
        const absolutePath = resolve(trimmed);
        const relativeToRoot = relative(this.rootPath, absolutePath).replace(/\\/g, "/");
        if (!relativeToRoot.startsWith("..") && relativeToRoot !== "") {
            return normalizarCaminhoLogico(relativeToRoot);
        }
        return normalizarCaminhoLogico(trimmed);
    }
    async salvar(caminhoArquivo, conteudo, _mimeType) {
        await this.ensureReady();
        const absolutePath = this.resolveAbsolutePath(caminhoArquivo);
        try {
            await mkdir(dirname(absolutePath), { recursive: true });
            await writeFile(absolutePath, conteudo);
        }
        catch (error) {
            throw new AppError(`Nao foi possivel gravar o arquivo em storage. Verifique permissoes de escrita em ${this.rootPath}.`, 500);
        }
    }
    async mover(caminhoOrigem, caminhoDestino) {
        await this.ensureReady();
        const origem = this.resolveAbsolutePath(caminhoOrigem);
        const destino = this.resolveAbsolutePath(caminhoDestino);
        await mkdir(dirname(destino), { recursive: true });
        await rm(destino, { force: true });
        await rename(origem, destino);
    }
    async remover(caminhoArquivo) {
        const absolutePath = this.resolveAbsolutePath(caminhoArquivo);
        await rm(absolutePath, { force: true });
    }
    async existe(caminhoArquivo) {
        try {
            const absolutePath = this.resolveAbsolutePath(caminhoArquivo);
            await stat(absolutePath);
            return true;
        }
        catch {
            return false;
        }
    }
    criarLeitura(caminhoArquivo) {
        const absolutePath = this.resolveAbsolutePath(caminhoArquivo);
        return createReadStream(absolutePath);
    }
    async lerBuffer(caminhoArquivo) {
        const absolutePath = this.resolveAbsolutePath(caminhoArquivo);
        try {
            return await readFile(absolutePath);
        }
        catch {
            return undefined;
        }
    }
}
