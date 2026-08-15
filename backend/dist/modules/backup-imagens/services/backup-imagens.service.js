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
function normalizarDataHorario(data) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");
    const hora = String(data.getHours()).padStart(2, "0");
    const minuto = String(data.getMinutes()).padStart(2, "0");
    const segundo = String(data.getSeconds()).padStart(2, "0");
    return `${ano}${mes}${dia}-${hora}${minuto}${segundo}`;
}
function normalizarCaminho(caminho) {
    return caminho.replace(/\\/g, "/").replace(/^\/+/, "");
}
async function gravarStreamEmArquivo(stream, destino) {
    await mkdir(dirname(destino), { recursive: true });
    await pipeline(stream, createWriteStream(destino));
}
function nomePastaData(data) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
}
export class BackupImagensService {
    raizStorage = resolve(process.cwd(), env.APP_STORAGE_ROOT);
    diretorioImagens = resolve(process.cwd(), env.APP_STORAGE_ROOT, "imagens");
    diretorioBackups = resolve(process.cwd(), env.APP_STORAGE_ROOT, "backups", "imagens");
    criarClienteOAuth() {
        const clientId = env.APP_BACKUP_IMAGES_GOOGLE_CLIENT_ID?.trim() ||
            env.APP_GOOGLE_CLIENT_ID?.trim() ||
            env.GOOGLE_CLIENT_ID?.trim();
        const clientSecret = env.APP_BACKUP_IMAGES_GOOGLE_CLIENT_SECRET?.trim() ||
            env.APP_GOOGLE_CLIENT_SECRET?.trim() ||
            env.GOOGLE_CLIENT_SECRET?.trim();
        const refreshToken = env.APP_BACKUP_IMAGES_REFRESH_TOKEN?.trim() ||
            env.APP_GOOGLE_REFRESH_TOKEN?.trim() ||
            env.GOOGLE_REFRESH_TOKEN?.trim();
        if (!clientId || !clientSecret || !refreshToken) {
            return null;
        }
        const client = new OAuth2Client(clientId, clientSecret);
        client.setCredentials({ refresh_token: refreshToken });
        return client;
    }
    async autenticarDrive() {
        const client = this.criarClienteOAuth();
        if (!client) {
            throw new AppError("Credenciais OAuth do Google Drive nao configuradas.", 500);
        }
        const { token } = await client.getAccessToken();
        if (!token) {
            throw new AppError("Nao foi possivel obter token de acesso do Google Drive.", 500);
        }
        return token;
    }
    async driveFetchJson(token, url, init) {
        const resposta = await fetch(url, {
            ...init,
            headers: {
                Authorization: `Bearer ${token}`,
                ...(init?.headers ?? {})
            }
        });
        if (!resposta.ok) {
            const texto = await resposta.text().catch(() => "");
            throw new AppError(`Falha na comunicacao com o Google Drive. ${texto}`.trim(), 500);
        }
        return (await resposta.json());
    }
    async listarPastasDrive(token, parentId, nome) {
        const url = new URL("https://www.googleapis.com/drive/v3/files");
        url.searchParams.set("q", `mimeType='application/vnd.google-apps.folder' and name='${nome.replace(/'/g, "\\'")}' and '${parentId}' in parents and trashed=false`);
        url.searchParams.set("supportsAllDrives", "true");
        url.searchParams.set("includeItemsFromAllDrives", "true");
        url.searchParams.set("fields", "files(id,name)");
        url.searchParams.set("pageSize", "10");
        return this.driveFetchJson(token, url.toString());
    }
    async criarPastaDrive(token, parentId, nome) {
        const resposta = await fetch("https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&fields=id,name", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                name: nome,
                mimeType: "application/vnd.google-apps.folder",
                parents: [parentId]
            })
        });
        if (!resposta.ok) {
            const texto = await resposta.text().catch(() => "");
            throw new AppError(`Falha ao criar pasta no Google Drive. ${texto}`.trim(), 500);
        }
        return (await resposta.json());
    }
    async obterOuCriarPastaDrive(token, parentId, nome) {
        const existentes = await this.listarPastasDrive(token, parentId, nome);
        const pasta = existentes.files?.[0];
        if (pasta?.id) {
            return pasta;
        }
        return this.criarPastaDrive(token, parentId, nome);
    }
    async resolverDestinoDrive(token) {
        const pastaRaiz = env.APP_BACKUP_IMAGES_GOOGLE_DRIVE_FOLDER_ID?.trim();
        if (!pastaRaiz) {
            throw new AppError("Pasta do Google Drive nao configurada.", 500);
        }
        const pastaServidor = await this.obterOuCriarPastaDrive(token, pastaRaiz, "g3n");
        const pastaData = await this.obterOuCriarPastaDrive(token, pastaServidor.id, nomePastaData(new Date()));
        return { pastaRaiz, pastaServidor, pastaData };
    }
    async criarPacoteLocal() {
        await mkdir(this.diretorioBackups, { recursive: true });
        const timestamp = normalizarDataHorario(new Date());
        const pastaTemporaria = await mkdtemp(resolve(os.tmpdir(), "g3n-backup-imagens-"));
        const pastaEspelho = resolve(pastaTemporaria, "storage");
        const arquivoCompactado = resolve(this.diretorioBackups, `g3n_imagens-${timestamp}-${randomUUID().slice(0, 8)}.tar.gz`);
        const arquivos = await storageService.listar({ ativo: "true" });
        const caminhos = new Set();
        for (const arquivo of arquivos) {
            const caminho = normalizarCaminho(arquivo.caminho_arquivo);
            if (!caminho.startsWith("imagens/") && !caminho.includes("/imagens/"))
                continue;
            caminhos.add(caminho);
            const thumbnail = arquivo.thumbnail_caminho?.trim();
            if (thumbnail && (thumbnail.startsWith("imagens/") || thumbnail.includes("/imagens/"))) {
                caminhos.add(normalizarCaminho(thumbnail));
            }
        }
        for (const caminho of caminhos) {
            try {
                const conteudo = await storageService.obterConteudoPorCaminho(caminho, undefined, undefined, false);
                const destino = resolve(pastaEspelho, caminho);
                await gravarStreamEmArquivo(conteudo.stream, destino);
            }
            catch (error) {
                await rm(pastaTemporaria, { recursive: true, force: true });
                throw new AppError(error instanceof Error
                    ? `Falha ao preparar backup da imagem ${caminho}: ${error.message}`
                    : `Falha ao preparar backup da imagem ${caminho}.`, 500);
            }
        }
        await execFileAsync("tar", ["-czf", arquivoCompactado, "-C", pastaTemporaria, "storage"]);
        await rm(pastaTemporaria, { recursive: true, force: true });
        return arquivoCompactado;
    }
    async enviarParaDrive(arquivoCompactado) {
        const token = await this.autenticarDrive();
        const destino = await this.resolverDestinoDrive(token);
        const arquivoBuffer = await readFile(arquivoCompactado);
        const nomeArquivo = arquivoCompactado.split(/[\\/]/).pop() ?? "g3n_imagens.tar.gz";
        const boundary = `g3n-${randomUUID()}`;
        const metadata = JSON.stringify({
            name: nomeArquivo,
            parents: [destino.pastaData.id]
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
        const resposta = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,name", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": `multipart/related; boundary=${boundary}`
            },
            body: corpo
        });
        if (!resposta.ok) {
            const texto = await resposta.text().catch(() => "");
            throw new AppError(`Falha ao enviar backup das imagens para o Google Drive. ${texto}`.trim(), 500);
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
        }
        catch (error) {
            throw error;
        }
    }
}
