import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { BackupSistemaService } from "../services/backup-sistema.service.js";
function criarRunnerFalso(registros) {
    return async (comando, args) => {
        registros.push({ comando, args });
        if (comando === "pg_dump") {
            const indiceArquivo = args.indexOf("--file");
            const arquivo = indiceArquivo >= 0 ? args[indiceArquivo + 1] : "";
            if (arquivo) {
                await mkdir(path.dirname(arquivo), { recursive: true });
                await writeFile(arquivo, "dump-teste", "utf-8");
            }
        }
        return { stdout: "", stderr: "" };
    };
}
test("gera e restaura backup do banco com metadados e comandos corretos", async () => {
    const raiz = await mkdtemp(path.join(os.tmpdir(), "g3n-backup-banco-teste-"));
    const comandos = [];
    let disconnects = 0;
    let connects = 0;
    const service = new BackupSistemaService({
        paths: {
            raizStorage: raiz,
            raizBackups: path.join(raiz, "backups", "sistema"),
            diretorioBanco: path.join(raiz, "backups", "sistema", "banco"),
            diretorioImagens: path.join(raiz, "backups", "sistema", "imagens"),
            pastaImagensSistema: path.join(raiz, "imagens")
        },
        execFileFn: criarRunnerFalso(comandos),
        prismaInstance: {
            async $disconnect() {
                disconnects += 1;
            },
            async $connect() {
                connects += 1;
            }
        }
    });
    const gerado = await service.gerarBackupBanco("admin");
    assert.equal(gerado.accepted, true);
    assert.equal(gerado.backup.tipo, "BANCO");
    assert.ok(existsSync(gerado.backup.arquivoCaminho));
    assert.equal(comandos[0]?.comando, "pg_dump");
    assert.ok(comandos[0]?.args.includes("--format=custom"));
    const restaurado = await service.restaurarBackupBanco({ backupId: gerado.backup.id }, "admin");
    assert.equal(restaurado.accepted, true);
    assert.ok(comandos.some((item) => item.comando === "psql"));
    assert.ok(comandos.some((item) => item.comando === "pg_restore"));
    assert.equal(disconnects >= 1, true);
    assert.equal(connects >= 2, true);
    const metadataPath = path.join(path.dirname(gerado.backup.arquivoCaminho), "metadata.json");
    const metadata = JSON.parse(await readFile(metadataPath, "utf-8"));
    assert.ok(metadata.restauradoEm);
    await rm(raiz, { recursive: true, force: true });
});
test("gera e restaura backup das imagens preservando o conteúdo original", async () => {
    const raiz = await mkdtemp(path.join(os.tmpdir(), "g3n-backup-imagens-teste-"));
    const imagens = path.join(raiz, "imagens");
    await mkdir(imagens, { recursive: true });
    const arquivoOriginal = path.join(imagens, "foto.txt");
    await writeFile(arquivoOriginal, "conteudo original", "utf-8");
    const service = new BackupSistemaService({
        paths: {
            raizStorage: raiz,
            raizBackups: path.join(raiz, "backups", "sistema"),
            diretorioBanco: path.join(raiz, "backups", "sistema", "banco"),
            diretorioImagens: path.join(raiz, "backups", "sistema", "imagens"),
            pastaImagensSistema: imagens
        }
    });
    const gerado = await service.gerarBackupImagens("admin");
    assert.equal(gerado.accepted, true);
    assert.equal(gerado.backup.tipo, "IMAGENS");
    assert.ok(existsSync(gerado.backup.arquivoCaminho));
    await writeFile(arquivoOriginal, "conteudo alterado", "utf-8");
    const restaurado = await service.restaurarBackupImagens({ backupId: gerado.backup.id }, "admin");
    assert.equal(restaurado.accepted, true);
    assert.equal(await readFile(arquivoOriginal, "utf-8"), "conteudo original");
    await rm(raiz, { recursive: true, force: true });
});
