import { BackupSistemaService } from "../services/backup-sistema.service.js";
const service = new BackupSistemaService();
export class BackupSistemaController {
    async obterPainel(_request, response) {
        return response.json(await service.obterPainel());
    }
    async listarBackups(_request, response) {
        return response.json(await service.listarBackups());
    }
    async gerarBackupBanco(request, response) {
        const usuario = request.authUser?.nomeUsuario ?? "sistema";
        return response.status(201).json(await service.gerarBackupBanco(usuario));
    }
    async gerarBackupImagens(request, response) {
        const usuario = request.authUser?.nomeUsuario ?? "sistema";
        return response.status(201).json(await service.gerarBackupImagens(usuario));
    }
    async restaurarBackupBanco(request, response) {
        const usuario = request.authUser?.nomeUsuario ?? "sistema";
        return response.status(202).json(await service.restaurarBackupBanco(request.body, usuario));
    }
    async restaurarBackupImagens(request, response) {
        const usuario = request.authUser?.nomeUsuario ?? "sistema";
        return response.status(202).json(await service.restaurarBackupImagens(request.body, usuario));
    }
    async baixarBackup(request, response) {
        const resultado = await service.baixarBackup(request.params.backupId);
        return response
            .status(200)
            .setHeader("Content-Disposition", `attachment; filename="${resultado.nomeArquivo}"`)
            .type(resultado.contentType)
            .sendFile(resultado.backup.arquivoCaminho);
    }
}
