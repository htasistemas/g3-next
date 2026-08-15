import path from "node:path";
import { env } from "../../../config/env.js";
export function obterBackupSistemaPaths() {
    const raizStorage = path.resolve(process.cwd(), env.APP_STORAGE_ROOT);
    const raizBackups = path.join(raizStorage, "backups", "sistema");
    return {
        raizStorage,
        raizBackups,
        diretorioBanco: path.join(raizBackups, "banco"),
        diretorioImagens: path.join(raizBackups, "imagens"),
        pastaImagensSistema: path.join(raizStorage, "imagens")
    };
}
