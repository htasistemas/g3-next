import { httpClient } from "./http-client";
import type {
  BackupSistemaExecucao,
  BackupSistemaItem,
  BackupSistemaResumo
} from "@/types/backup-sistema";

type ListaResponse = {
  items: BackupSistemaItem[];
};

type DownloadResponse = {
  backup: BackupSistemaItem;
  contentType: string;
  nomeArquivo: string;
};

export const backupSistemaService = {
  async obterPainel() {
    const { data } = await httpClient.get<BackupSistemaResumo>("/api/configuracoes/backup/painel");
    return data;
  },

  async listarBackups() {
    const { data } = await httpClient.get<ListaResponse>("/api/configuracoes/backup/lista");
    return data.items;
  },

  async gerarBackupBanco() {
    const { data } = await httpClient.post<BackupSistemaExecucao>(
      "/api/configuracoes/backup/banco/gerar",
      {}
    );
    return data;
  },

  async gerarBackupImagens() {
    const { data } = await httpClient.post<BackupSistemaExecucao>(
      "/api/configuracoes/backup/imagens/gerar",
      {}
    );
    return data;
  },

  async restaurarBackupBanco(backupId: string) {
    const { data } = await httpClient.post<BackupSistemaExecucao>(
      "/api/configuracoes/backup/banco/restaurar",
      { backupId }
    );
    return data;
  },

  async restaurarBackupImagens(backupId: string) {
    const { data } = await httpClient.post<BackupSistemaExecucao>(
      "/api/configuracoes/backup/imagens/restaurar",
      { backupId }
    );
    return data;
  },

  async baixarBackup(backupId: string) {
    const { data, headers } = await httpClient.get<Blob>(
      `/api/configuracoes/backup/${backupId}/download`,
      { responseType: "blob" }
    );
    return {
      arquivo: data,
      contentType: headers["content-type"] ?? "application/octet-stream"
    };
  }
};
