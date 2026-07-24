export type BackupSistemaTipo = "BANCO" | "IMAGENS";

export type BackupSistemaItem = {
  id: string;
  tipo: BackupSistemaTipo;
  criadoEm: string;
  criadoPor: string;
  arquivoNome: string;
  arquivoCaminho: string;
  tamanhoBytes: number;
  checksum?: string | null;
  tamanhoFormatado: string;
  restauradoEm?: string | null;
  restauradoPor?: string | null;
  databaseNome?: string | null;
  storageRaiz?: string | null;
};

export type BackupSistemaResumo = {
  banco: {
    total: number;
    ultimoBackup: BackupSistemaItem | null;
  };
  imagens: {
    total: number;
    ultimoBackup: BackupSistemaItem | null;
  };
  ambiente: {
    databaseNome: string;
    storageRaiz: string;
    storageImagens: string;
  };
};

export type BackupSistemaExecucao = {
  accepted: boolean;
  backup: BackupSistemaItem;
  mensagem: string;
};
