import { createReadStream } from "node:fs";
import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { env } from "../../../config/env.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { requiredStorageDirectories } from "./storage-policy.js";
import { normalizarCaminhoLogico } from "./storage-utils.js";

export class LocalStorageProvider {
  private readonly rootPath = resolve(process.cwd(), env.APP_STORAGE_ROOT);
  private initPromise: Promise<void> | null = null;

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

  resolveAbsolutePath(caminhoArquivo: string) {
    const caminhoLogico = normalizarCaminhoLogico(caminhoArquivo);
    const absolutePath = resolve(this.rootPath, caminhoLogico);
    const relativeToRoot = relative(this.rootPath, absolutePath).replace(/\\/g, "/");
    if (relativeToRoot.startsWith("..") || relativeToRoot.includes("/../")) {
      throw new AppError("Caminho de arquivo fora da area de storage.", 400);
    }
    return absolutePath;
  }

  normalizePath(caminhoArquivo: string) {
    const trimmed = caminhoArquivo.trim();
    const absolutePath = resolve(trimmed);
    const relativeToRoot = relative(this.rootPath, absolutePath).replace(/\\/g, "/");
    if (!relativeToRoot.startsWith("..") && relativeToRoot !== "") {
      return normalizarCaminhoLogico(relativeToRoot);
    }

    return normalizarCaminhoLogico(trimmed);
  }

  async salvar(caminhoArquivo: string, conteudo: Buffer) {
    await this.ensureReady();
    const absolutePath = this.resolveAbsolutePath(caminhoArquivo);
    try {
      await mkdir(dirname(absolutePath), { recursive: true });
      await writeFile(absolutePath, conteudo);
    } catch (error) {
      throw new AppError(
        `Nao foi possivel gravar o arquivo em storage. Verifique permissoes de escrita em ${this.rootPath}.`,
        500
      );
    }
    return absolutePath;
  }

  async remover(caminhoArquivo: string) {
    const absolutePath = this.resolveAbsolutePath(caminhoArquivo);
    await rm(absolutePath, { force: true });
  }

  async existe(caminhoArquivo: string) {
    try {
      const absolutePath = this.resolveAbsolutePath(caminhoArquivo);
      await stat(absolutePath);
      return true;
    } catch {
      return false;
    }
  }

  criarLeitura(caminhoArquivo: string) {
    const absolutePath = this.resolveAbsolutePath(caminhoArquivo);
    return createReadStream(absolutePath);
  }
}
