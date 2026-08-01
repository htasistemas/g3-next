import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import os from "node:os";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { pipeline } from "node:stream/promises";
import { env } from "../../../config/env.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { storageService } from "../../arquivos/services/storage-instance.js";

const execFileAsync = promisify(execFile);

function normalizarDataHorario(data: Date) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  const hora = String(data.getHours()).padStart(2, "0");
  const minuto = String(data.getMinutes()).padStart(2, "0");
  const segundo = String(data.getSeconds()).padStart(2, "0");
  return `${ano}${mes}${dia}-${hora}${minuto}${segundo}`;
}

function normalizarCaminho(caminho: string) {
  return caminho.replace(/\\/g, "/").replace(/^\/+/, "");
}

async function gravarStreamEmArquivo(stream: NodeJS.ReadableStream, destino: string) {
  await mkdir(dirname(destino), { recursive: true });
  await pipeline(stream, createWriteStream(destino));
}

export class BackupArquivosService {
  private readonly raizStorage = resolve(process.cwd(), env.APP_STORAGE_ROOT);
  private readonly diretorioBackups = resolve(process.cwd(), env.APP_STORAGE_ROOT, "backups", "arquivos");

  private async criarPacoteLocal() {
    await mkdir(this.diretorioBackups, { recursive: true });

    const timestamp = normalizarDataHorario(new Date());
    const pastaTemporaria = await mkdtemp(resolve(os.tmpdir(), "g3n-backup-arquivos-"));
    const pastaEspelho = resolve(pastaTemporaria, "storage");
    const arquivoCompactado = resolve(
      this.diretorioBackups,
      `g3n_arquivos-${timestamp}-${randomUUID().slice(0, 8)}.tar.gz`
    );

    const arquivos = await storageService.listar({ ativo: "true" });
    const caminhos = new Set<string>();

    for (const arquivo of arquivos) {
      const caminho = arquivo.caminho_arquivo?.trim();
      if (!caminho || caminho.startsWith("http://") || caminho.startsWith("https://") || caminho.startsWith("data:")) {
        continue;
      }

      caminhos.add(normalizarCaminho(caminho));

      const thumbnail = arquivo.thumbnail_caminho?.trim();
      if (thumbnail && !thumbnail.startsWith("http://") && !thumbnail.startsWith("https://") && !thumbnail.startsWith("data:")) {
        caminhos.add(normalizarCaminho(thumbnail));
      }
    }

    for (const caminho of caminhos) {
      try {
        const conteudo = await storageService.obterConteudoPorCaminhoBruto(caminho);
        const destino = resolve(pastaEspelho, caminho);
        await gravarStreamEmArquivo(conteudo.stream, destino);
      } catch (error) {
        await rm(pastaTemporaria, { recursive: true, force: true });
        throw new AppError(
          error instanceof Error
            ? `Falha ao preparar backup do arquivo ${caminho}: ${error.message}`
            : `Falha ao preparar backup do arquivo ${caminho}.`,
          500
        );
      }
    }

    await execFileAsync("tar", ["-czf", arquivoCompactado, "-C", pastaTemporaria, "storage"]);
    await rm(pastaTemporaria, { recursive: true, force: true });

    return arquivoCompactado;
  }

  async executar() {
    if (!this.raizStorage.startsWith(resolve(process.cwd(), env.APP_STORAGE_ROOT))) {
      throw new AppError("Diretorio de storage fora da area esperada.", 500);
    }

    const arquivoCompactado = await this.criarPacoteLocal();
    return {
      executado: true,
      arquivoCompactado
    };
  }
}
