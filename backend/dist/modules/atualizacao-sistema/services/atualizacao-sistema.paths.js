import { existsSync } from "node:fs";
import path from "node:path";
function localizarRaizRepositorio() {
    const candidatos = [
        path.resolve(process.cwd()),
        path.resolve(process.cwd(), ".."),
        path.resolve(process.cwd(), "../..")
    ];
    for (const candidato of candidatos) {
        if (existsSync(path.join(candidato, "backend")) &&
            existsSync(path.join(candidato, "frontend"))) {
            return candidato;
        }
    }
    return path.resolve(process.cwd(), "..");
}
export function obterAtualizacaoSistemaPaths() {
    const raizRepositorio = localizarRaizRepositorio();
    const diretorioUpdates = path.join(raizRepositorio, "updates");
    return {
        raizRepositorio,
        diretorioUpdates,
        diretorioPackages: path.join(diretorioUpdates, "packages"),
        diretorioBackups: path.join(diretorioUpdates, "backups"),
        diretorioLogs: path.join(diretorioUpdates, "logs"),
        arquivoManifesto: path.join(diretorioUpdates, "version.json"),
        arquivoChangelog: path.join(diretorioUpdates, "changelog.json"),
        arquivoVersaoInstalada: path.join(diretorioUpdates, "version.txt")
    };
}
