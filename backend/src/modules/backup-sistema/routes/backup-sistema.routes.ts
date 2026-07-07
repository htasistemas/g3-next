import { Router } from "express";
import { asyncHandler } from "../../../shared/http/async-handler.js";
import {
  ensureAuthenticated,
  ensurePermissions
} from "../../auth/middlewares/auth.middleware.js";
import { BackupSistemaController } from "../controllers/backup-sistema.controller.js";

const controller = new BackupSistemaController();
const permissoesBackup = ["ADMINISTRADOR"];

export const backupSistemaRoutes = Router();

backupSistemaRoutes.get(
  "/painel",
  ensureAuthenticated,
  ensurePermissions(permissoesBackup),
  asyncHandler(controller.obterPainel.bind(controller))
);

backupSistemaRoutes.get(
  "/lista",
  ensureAuthenticated,
  ensurePermissions(permissoesBackup),
  asyncHandler(controller.listarBackups.bind(controller))
);

backupSistemaRoutes.post(
  "/banco/gerar",
  ensureAuthenticated,
  ensurePermissions(permissoesBackup),
  asyncHandler(controller.gerarBackupBanco.bind(controller))
);

backupSistemaRoutes.post(
  "/imagens/gerar",
  ensureAuthenticated,
  ensurePermissions(permissoesBackup),
  asyncHandler(controller.gerarBackupImagens.bind(controller))
);

backupSistemaRoutes.post(
  "/banco/restaurar",
  ensureAuthenticated,
  ensurePermissions(permissoesBackup),
  asyncHandler(controller.restaurarBackupBanco.bind(controller))
);

backupSistemaRoutes.post(
  "/imagens/restaurar",
  ensureAuthenticated,
  ensurePermissions(permissoesBackup),
  asyncHandler(controller.restaurarBackupImagens.bind(controller))
);

backupSistemaRoutes.get(
  "/:backupId/download",
  ensureAuthenticated,
  ensurePermissions(permissoesBackup),
  asyncHandler(controller.baixarBackup.bind(controller))
);
