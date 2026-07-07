import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn()
}));

vi.mock("../../services/http-client", () => ({
  httpClient: {
    get: mocks.getMock,
    post: mocks.postMock
  }
}));

import { backupSistemaService } from "../../services/backup-sistema.service";

describe("backupSistemaService", () => {
  beforeEach(() => {
    mocks.getMock.mockReset();
    mocks.postMock.mockReset();
  });

  it("consulta o painel e a listagem de backups", async () => {
    mocks.getMock.mockResolvedValueOnce({ data: { banco: { total: 0 }, imagens: { total: 0 }, ambiente: { databaseNome: "g3n", storageRaiz: "storage", storageImagens: "storage/imagens" } } });
    mocks.getMock.mockResolvedValueOnce({ data: { items: [] } });

    await backupSistemaService.obterPainel();
    await backupSistemaService.listarBackups();

    expect(mocks.getMock).toHaveBeenNthCalledWith(1, "/api/configuracoes/backup/painel");
    expect(mocks.getMock).toHaveBeenNthCalledWith(2, "/api/configuracoes/backup/lista");
  });

  it("envia as ações de gerar e restaurar para os endpoints corretos", async () => {
    mocks.postMock.mockResolvedValueOnce({ data: { accepted: true } });
    mocks.postMock.mockResolvedValueOnce({ data: { accepted: true } });
    mocks.postMock.mockResolvedValueOnce({ data: { accepted: true } });
    mocks.postMock.mockResolvedValueOnce({ data: { accepted: true } });

    await backupSistemaService.gerarBackupBanco();
    await backupSistemaService.gerarBackupImagens();
    await backupSistemaService.restaurarBackupBanco("backup-banco");
    await backupSistemaService.restaurarBackupImagens("backup-imagens");

    expect(mocks.postMock).toHaveBeenNthCalledWith(1, "/api/configuracoes/backup/banco/gerar", {});
    expect(mocks.postMock).toHaveBeenNthCalledWith(2, "/api/configuracoes/backup/imagens/gerar", {});
    expect(mocks.postMock).toHaveBeenNthCalledWith(3, "/api/configuracoes/backup/banco/restaurar", {
      backupId: "backup-banco"
    });
    expect(mocks.postMock).toHaveBeenNthCalledWith(4, "/api/configuracoes/backup/imagens/restaurar", {
      backupId: "backup-imagens"
    });
  });

  it("faz download do arquivo com responseType blob", async () => {
    const blob = new Blob(["conteudo"]);
    mocks.getMock.mockResolvedValueOnce({
      data: blob,
      headers: { "content-type": "application/gzip" }
    });

    const resposta = await backupSistemaService.baixarBackup("abc");

    expect(mocks.getMock).toHaveBeenCalledWith("/api/configuracoes/backup/abc/download", {
      responseType: "blob"
    });
    expect(resposta.contentType).toBe("application/gzip");
    expect(resposta.arquivo).toBe(blob);
  });
});
