import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import os from "node:os";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { pipeline } from "node:stream/promises";
import { OAuth2Client } from "google-auth-library";
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

async function gravarStreamEmArquivo(
  stream: NodeJS.ReadableStream,
  destino: string
) {
  await mkdir(dirname(destino), { recursive: true });
  await pipeline(stream, createWriteStream(destino));
}

export class BackupImagensService {
  private readonly raizStorage = resolve(process.cwd(), env.APP_STORAGE_ROOT);
  private readonly diretorioImagens = resolve(process.cwd(), env.APP_STORAGE_ROOT, "imagens");
  private readonly diretorioBackups = resolve(process.cwd(), env.APP_STORAGE_ROOT, "backups", "imagens");

  private criarClienteOAuth() {
    const clientId = env.APP_BACKUP_IMAGES_GOOGLE_CLIENT_ID?.trim();
    const clientSecret = env.APP_BACKUP_IMAGES_GOOGLE_CLIENT_SECRET?.trim();
    const refreshToken = env.APP_BACKUP_IMAGES_REFRESH_TOKEN?.trim();

    if (!clientId || !clientSecret || !refreshToken) {
      return null;
    }

    const client = new OAuth2Client(clientId, clientSecret);
    client.setCredentials({ refresh_token: refreshToken });
    return client;
  }

  private async criarPacoteLocal() {
    await mkdir(this.diretorioBackups, { recursive: true });

    const timestamp = normalizarDataHorario(new Date());
    const pastaTemporaria = await mkdtemp(resolve(os.tmpdir(), "g3n-backup-imagens-"));
    const pastaEspelho = resolve(pastaTemporaria, "storage");
    const arquivoCompactado = resolve(
      this.diretorioBackups,
      `backup-imagens-${timestamp}-${randomUUID().slice(0, 8)}.tar.gz`
    );

    const arquivos = await storageService.listar({ ativo: "true" });
    const caminhos = new Set<string>();

    for (const arquivo of arquivos) {
      const caminho = normalizarCaminho(arquivo.caminho_arquivo);
      if (!caminho.startsWith("imagens/")) continue;
      caminhos.add(caminho);

      const thumbnail = arquivo.thumbnail_caminho?.trim();
      if (thumbnail?.startsWith("imagens/")) {
        caminhos.add(normalizarCaminho(thumbnail));
      }
    }

    for (const caminho of caminhos) {
      try {
        const conteudo = await storageService.obterConteudoPorCaminho(caminho, undefined, undefined, false);
        const destino = resolve(pastaEspelho, caminho);
        await gravarStreamEmArquivo(conteudo.stream, destino);
      } catch (error) {
        await rm(pastaTemporaria, { recursive: true, force: true });
        throw new AppError(
          error instanceof Error
            ? `Falha ao preparar backup da imagem ${caminho}: ${error.message}`
            : `Falha ao preparar backup da imagem ${caminho}.`,
          500
        );
      }
    }

    await execFileAsync("tar", ["-czf", arquivoCompactado, "-C", pastaTemporaria, "storage"]);
    await rm(pastaTemporaria, { recursive: true, force: true });

    return arquivoCompactado;
  }

  private async enviarParaDrive(arquivoCompactado: string) {
    const folderId = env.APP_BACKUP_IMAGES_GOOGLE_DRIVE_FOLDER_ID?.trim();
    if (!folderId) {
      return { uploaded: false, reason: "Pasta do Google Drive nao configurada." };
    }

    const client = this.criarClienteOAuth();
    if (!client) {
      return { uploaded: false, reason: "Credenciais OAuth do Google Drive nao configuradas." };
    }

    const { token } = await client.getAccessToken();
    if (!token) {
      throw new AppError("Nao foi possivel obter token de acesso do Google Drive.", 500);
    }

    const arquivoBuffer = await readFile(arquivoCompactado);
    const nomeArquivo = arquivoCompactado.split(/[\\/]/).pop() ?? "backup-imagens.tar.gz";
    const boundary = `g3n-${randomUUID()}`;
    const metadata = JSON.stringify({
      name: nomeArquivo,
      parents: [folderId]
    });

    const corpo = Buffer.concat([
      Buffer.from(`--${boundary}\r\n`),
      Buffer.from("Content-Type: application/json; charset=UTF-8\r\n\r\n"),
      Buffer.from(metadata),
      Buffer.from(`\r\n--${boundary}\r\n`),
      Buffer.from("Content-Type: application/gzip\r\n\r\n"),
      arquivoBuffer,
      Buffer.from(`\r\n--${boundary}--`)
    ]);

    const resposta = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,name",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": `multipart/related; boundary=${boundary}`
        },
        body: corpo
      }
    );

    if (!resposta.ok) {
      const texto = await resposta.text().catch(() => "");
      throw new AppError(
        `Falha ao enviar backup das imagens para o Google Drive. ${texto}`.trim(),
        500
      );
    }

    return { uploaded: true };
  }

  async executar() {
    if (!env.APP_BACKUP_IMAGES_HABILITADO) {
      return { executado: false, motivo: "Backup de imagens desabilitado." };
    }

    if (!this.diretorioImagens.startsWith(this.raizStorage)) {
      throw new AppError("Diretorio de imagens fora da area esperada de storage.", 500);
    }

    const arquivoCompactado = await this.criarPacoteLocal();
    try {
      const resultado = await this.enviarParaDrive(arquivoCompactado);
      return {
        executado: true,
        arquivoCompactado,
        uploaded: resultado.uploaded
      };
    } catch (error) {
      throw error;
    }
  }
}
