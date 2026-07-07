import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import {
  cp,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  stat,
  writeFile
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { prisma } from "../../../database/prisma.js";
import { env } from "../../../config/env.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { backupSistemaRestaurarSchema } from "../backup-sistema.schema.js";
import type {
  BackupSistemaExecucao,
  BackupSistemaItem,
  BackupSistemaResumo,
  BackupSistemaTipo
} from "../backup-sistema.types.js";
import { obterBackupSistemaPaths } from "./backup-sistema.paths.js";

type ExecFileLike = (
  command: string,
  args: string[],
  options?: import("node:child_process").ExecFileOptions
) => Promise<{ stdout: string; stderr: string }>;

type PrismaLike = {
  $disconnect: () => Promise<void>;
  $connect: () => Promise<void>;
};

type BackupSistemaPaths = ReturnType<typeof obterBackupSistemaPaths>;

type BackupMetadata = Omit<BackupSistemaItem, "tamanhoFormatado"> & {
  arquivoCaminhoRelativo: string;
  arquivoNome: string;
};

const execFileAsyncPadrao = promisify(execFile);

function formatarBytes(bytes: number) {
  const unidades = ["B", "KB", "MB", "GB", "TB"];
  let valor = Math.max(0, bytes);
  let indice = 0;

  while (valor >= 1024 && indice < unidades.length - 1) {
    valor /= 1024;
    indice += 1;
  }

  return `${valor.toLocaleString("pt-BR", {
    maximumFractionDigits: indice === 0 ? 0 : 2
  })} ${unidades[indice]}`;
}

function criarIdBackup(tipo: BackupSistemaTipo) {
  return `${tipo.toLowerCase()}-${new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "")}-${randomUUID().slice(0, 8)}`;
}

function normalizarErroComando(error: unknown, comando: string) {
  if (error instanceof Error) {
    const detalhes = error.message.trim();
    return new AppError(
      detalhes ? `Falha ao executar ${comando}: ${detalhes}` : `Falha ao executar ${comando}.`,
      500
    );
  }

  return new AppError(`Falha ao executar ${comando}.`, 500);
}

function garantirDentroDaRaiz(raiz: string, alvo: string) {
  const raizResolvida = path.resolve(raiz);
  const alvoResolvido = path.resolve(alvo);
  const prefixo = `${raizResolvida}${path.sep}`;

  if (alvoResolvido !== raizResolvida && !alvoResolvido.startsWith(prefixo)) {
    throw new AppError("Caminho de backup fora da área permitida.", 422);
  }
}

function obterNomeBanco() {
  try {
    const url = new URL(env.DATABASE_URL);
    return decodeURIComponent(url.pathname.replace(/^\//, "")) || "database";
  } catch {
    return "database";
  }
}

async function lerMetadata(caminho: string) {
  const conteudo = await readFile(caminho, "utf-8");
  return JSON.parse(conteudo) as BackupMetadata;
}

async function salvarMetadata(caminho: string, metadata: BackupMetadata) {
  await writeFile(caminho, `${JSON.stringify(metadata, null, 2)}\n`, "utf-8");
}

export class BackupSistemaService {
  private readonly paths: BackupSistemaPaths;

  private readonly execFileFn: ExecFileLike;

  private readonly prismaInstance: PrismaLike;

  constructor(
    deps: {
      execFileFn?: ExecFileLike;
      prismaInstance?: PrismaLike;
      paths?: Partial<BackupSistemaPaths>;
    } = {}
  ) {
    this.execFileFn = deps.execFileFn ?? execFileAsyncPadrao;
    this.prismaInstance = deps.prismaInstance ?? prisma;
    this.paths = { ...obterBackupSistemaPaths(), ...deps.paths };
  }

  private async garantirEstrutura() {
    await Promise.all([
      mkdir(this.paths.raizStorage, { recursive: true }),
      mkdir(this.paths.raizBackups, { recursive: true }),
      mkdir(this.paths.diretorioBanco, { recursive: true }),
      mkdir(this.paths.diretorioImagens, { recursive: true }),
      mkdir(this.paths.pastaImagensSistema, { recursive: true })
    ]);
  }

  private async executarComando(comando: string, args: string[], options?: import("node:child_process").ExecFileOptions) {
    try {
      return await this.execFileFn(comando, args, {
        maxBuffer: 20 * 1024 * 1024,
        windowsHide: true,
        ...options
      });
    } catch (error) {
      throw normalizarErroComando(error, comando);
    }
  }

  private async listarDiretorioBackups(tipo: BackupSistemaTipo) {
    await this.garantirEstrutura();
    const raiz = tipo === "BANCO" ? this.paths.diretorioBanco : this.paths.diretorioImagens;
    const itens = await readdir(raiz, { withFileTypes: true });
    const backups: BackupSistemaItem[] = [];

    for (const item of itens) {
      if (!item.isDirectory()) continue;
      const pastaBackup = path.join(raiz, item.name);
      const metadataPath = path.join(pastaBackup, "metadata.json");
      const arquivoMetadataExiste = existsSync(metadataPath);
      if (!arquivoMetadataExiste) continue;

      try {
        const metadata = await lerMetadata(metadataPath);
        const arquivoCompleto = path.join(pastaBackup, metadata.arquivoCaminhoRelativo);
        if (!existsSync(arquivoCompleto)) continue;
        const info = await stat(arquivoCompleto);
        backups.push({
          id: metadata.id,
          tipo: metadata.tipo,
          criadoEm: metadata.criadoEm,
          criadoPor: metadata.criadoPor,
          arquivoNome: metadata.arquivoNome,
          arquivoCaminho: arquivoCompleto,
          tamanhoBytes: info.size,
          tamanhoFormatado: formatarBytes(info.size),
          restauradoEm: metadata.restauradoEm ?? null,
          restauradoPor: metadata.restauradoPor ?? null,
          databaseNome: metadata.databaseNome ?? null,
          storageRaiz: metadata.storageRaiz ?? null
        });
      } catch {
        continue;
      }
    }

    return backups.sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
  }

  private async obterBackupPorId(backupId: string) {
    const [banco, imagens] = await Promise.all([
      this.listarDiretorioBackups("BANCO"),
      this.listarDiretorioBackups("IMAGENS")
    ]);
    return [...banco, ...imagens].find((item) => item.id === backupId) ?? null;
  }

  private async atualizarMetadataRestauracao(backup: BackupSistemaItem, usuario: string) {
    const pastaBackup = path.dirname(backup.arquivoCaminho);
    const metadataPath = path.join(pastaBackup, "metadata.json");
    const metadata = await lerMetadata(metadataPath);
    await salvarMetadata(metadataPath, {
      ...metadata,
      restauradoEm: new Date().toISOString(),
      restauradoPor: usuario
    });
  }

  private async criarBackupBancoEm(
    pastaDestino: string,
    usuarioResponsavel: string
  ): Promise<BackupSistemaItem> {
    const id = criarIdBackup("BANCO");
    const pastaBackup = path.join(pastaDestino, id);
    const arquivoNome = "backup.dump";
    const arquivoCompleto = path.join(pastaBackup, arquivoNome);

    await mkdir(pastaBackup, { recursive: true });
    await this.executarComando("pg_dump", [
      "--format=custom",
      "--no-owner",
      "--no-privileges",
      "--file",
      arquivoCompleto,
      env.DATABASE_URL
    ]);

    const info = await stat(arquivoCompleto);
    const metadata: BackupMetadata = {
      id,
      tipo: "BANCO",
      criadoEm: new Date().toISOString(),
      criadoPor: usuarioResponsavel,
      arquivoNome,
      arquivoCaminhoRelativo: arquivoNome,
      arquivoCaminho: arquivoCompleto,
      tamanhoBytes: info.size,
      restauradoEm: null,
      restauradoPor: null,
      databaseNome: obterNomeBanco(),
      storageRaiz: this.paths.raizStorage
    };

    await salvarMetadata(path.join(pastaBackup, "metadata.json"), metadata);
    return {
      ...metadata,
      tamanhoFormatado: formatarBytes(info.size)
    };
  }

  private async criarBackupImagensEm(
    pastaDestino: string,
    usuarioResponsavel: string
  ): Promise<BackupSistemaItem> {
    const id = criarIdBackup("IMAGENS");
    const pastaBackup = path.join(pastaDestino, id);
    const arquivoNome = "backup.tar.gz";
    const arquivoCompleto = path.join(pastaBackup, arquivoNome);

    await mkdir(this.paths.pastaImagensSistema, { recursive: true });
    await mkdir(pastaBackup, { recursive: true });
    await this.executarComando("tar", [
      "-czf",
      arquivoCompleto,
      "-C",
      this.paths.raizStorage,
      "imagens"
    ]);

    const info = await stat(arquivoCompleto);
    const metadata: BackupMetadata = {
      id,
      tipo: "IMAGENS",
      criadoEm: new Date().toISOString(),
      criadoPor: usuarioResponsavel,
      arquivoNome,
      arquivoCaminhoRelativo: arquivoNome,
      arquivoCaminho: arquivoCompleto,
      tamanhoBytes: info.size,
      restauradoEm: null,
      restauradoPor: null,
      databaseNome: null,
      storageRaiz: this.paths.raizStorage
    };

    await salvarMetadata(path.join(pastaBackup, "metadata.json"), metadata);
    return {
      ...metadata,
      tamanhoFormatado: formatarBytes(info.size)
    };
  }

  async obterPainel() {
    await this.garantirEstrutura();
    const [banco, imagens] = await Promise.all([
      this.listarDiretorioBackups("BANCO"),
      this.listarDiretorioBackups("IMAGENS")
    ]);

    const resumo: BackupSistemaResumo = {
      banco: {
        total: banco.length,
        ultimoBackup: banco[0] ?? null
      },
      imagens: {
        total: imagens.length,
        ultimoBackup: imagens[0] ?? null
      },
      ambiente: {
        databaseNome: obterNomeBanco(),
        storageRaiz: this.paths.raizStorage,
        storageImagens: this.paths.pastaImagensSistema
      }
    };

    return resumo;
  }

  async listarBackups() {
    const [banco, imagens] = await Promise.all([
      this.listarDiretorioBackups("BANCO"),
      this.listarDiretorioBackups("IMAGENS")
    ]);

    return {
      items: [...banco, ...imagens].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
    };
  }

  async gerarBackupBanco(usuarioResponsavel: string) {
    const backup = await this.criarBackupBancoEm(this.paths.diretorioBanco, usuarioResponsavel);
    return {
      accepted: true,
      backup,
      mensagem: "Backup do banco de dados gerado com sucesso."
    } satisfies BackupSistemaExecucao;
  }

  async gerarBackupImagens(usuarioResponsavel: string) {
    const backup = await this.criarBackupImagensEm(this.paths.diretorioImagens, usuarioResponsavel);
    return {
      accepted: true,
      backup,
      mensagem: "Backup das imagens gerado com sucesso."
    } satisfies BackupSistemaExecucao;
  }

  async restaurarBackupBanco(rawPayload: unknown, usuarioResponsavel: string) {
    const payload = backupSistemaRestaurarSchema.parse(rawPayload ?? {});
    const backup = await this.obterBackupPorId(payload.backupId);
    if (!backup || backup.tipo !== "BANCO") {
      throw new AppError("Backup do banco de dados não encontrado.", 404);
    }

    const backupPreventivo = await mkdtemp(path.join(os.tmpdir(), "g3n-backup-banco-"));
    const arquivoPreventivo = path.join(backupPreventivo, "pre-restore.dump");
    let restauracaoConcluida = false;

    try {
      await this.executarComando("pg_dump", [
        "--format=custom",
        "--no-owner",
        "--no-privileges",
        "--file",
        arquivoPreventivo,
        env.DATABASE_URL
      ]);

      await this.prismaInstance.$disconnect();
      await this.executarComando("psql", [
        env.DATABASE_URL,
        "--command",
        "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = current_database() AND pid <> pg_backend_pid();"
      ]);
      await this.executarComando("pg_restore", [
        "--clean",
        "--if-exists",
        "--no-owner",
        "--no-privileges",
        "--dbname",
        env.DATABASE_URL,
        backup.arquivoCaminho
      ]);
      await this.prismaInstance.$connect();
      await this.atualizarMetadataRestauracao(backup, usuarioResponsavel);
      restauracaoConcluida = true;

      return {
        accepted: true,
        backup,
        mensagem: "Restauração do banco de dados executada com sucesso."
      } satisfies BackupSistemaExecucao;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      await this.prismaInstance.$connect().catch(() => undefined);
      throw normalizarErroComando(error, "restauração do banco de dados");
    } finally {
      await this.prismaInstance.$connect().catch(() => undefined);
      if (restauracaoConcluida && existsSync(arquivoPreventivo)) {
        await rm(backupPreventivo, { recursive: true, force: true }).catch(() => undefined);
      }
    }
  }

  async restaurarBackupImagens(rawPayload: unknown, usuarioResponsavel: string) {
    const payload = backupSistemaRestaurarSchema.parse(rawPayload ?? {});
    const backup = await this.obterBackupPorId(payload.backupId);
    if (!backup || backup.tipo !== "IMAGENS") {
      throw new AppError("Backup das imagens não encontrado.", 404);
    }

    const pastaTemporaria = await mkdtemp(path.join(os.tmpdir(), "g3n-restaura-imagens-"));
    const pastaExtracao = path.join(pastaTemporaria, "extracao");
    const pastaRollback = path.join(pastaTemporaria, "rollback");
    const destinoFinal = this.paths.pastaImagensSistema;

    await mkdir(pastaExtracao, { recursive: true });

    try {
      await this.executarComando("tar", [
        "-xzf",
        backup.arquivoCaminho,
        "-C",
        pastaExtracao
      ]);

      const origemRestaurada = path.join(pastaExtracao, "imagens");
      if (!existsSync(origemRestaurada)) {
        throw new AppError("O backup de imagens está corrompido ou sem a pasta esperada.", 422);
      }

      if (existsSync(destinoFinal)) {
        await cp(destinoFinal, pastaRollback, { recursive: true, force: true });
      }

      garantirDentroDaRaiz(this.paths.raizStorage, destinoFinal);
      await rm(destinoFinal, { recursive: true, force: true });
      await cp(origemRestaurada, destinoFinal, { recursive: true, force: true });
      await this.atualizarMetadataRestauracao(backup, usuarioResponsavel);

      return {
        accepted: true,
        backup,
        mensagem: "Restauração das imagens executada com sucesso."
      } satisfies BackupSistemaExecucao;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      if (existsSync(pastaRollback)) {
        await rm(destinoFinal, { recursive: true, force: true }).catch(() => undefined);
        await cp(pastaRollback, destinoFinal, { recursive: true, force: true }).catch(() => undefined);
      }
      throw normalizarErroComando(error, "restauração das imagens");
    } finally {
      await rm(pastaTemporaria, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  async baixarBackup(backupId: string) {
    const backup = await this.obterBackupPorId(backupId);
    if (!backup) {
      throw new AppError("Backup não encontrado.", 404);
    }

    return {
      backup,
      contentType:
        backup.tipo === "BANCO" ? "application/octet-stream" : "application/gzip",
      nomeArquivo: backup.tipo === "BANCO" ? `${backup.id}.dump` : `${backup.id}.tar.gz`
    };
  }
}
