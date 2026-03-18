import { httpClient } from "./http-client";
import type {
  AtualizacaoSistemaChangelogItem,
  AtualizacaoSistemaConfig,
  AtualizacaoSistemaHistoricoItem,
  AtualizacaoSistemaLogItem,
  AtualizacaoSistemaManifesto,
  AtualizacaoSistemaStatus
} from "@/types/atualizacao-sistema";

type VersaoAtualResponse = {
  versaoInstalada: string;
};

type VersaoPublicadaResponse = {
  versaoInstalada: string;
  versaoPublicada?: string | null;
  atualizacaoDisponivel: boolean;
  manifesto: AtualizacaoSistemaManifesto;
};

type ChangelogResponse = {
  entries: AtualizacaoSistemaChangelogItem[];
};

type HistoricoResponse = {
  items: AtualizacaoSistemaHistoricoItem[];
};

type LogsResponse = {
  items: AtualizacaoSistemaLogItem[];
};

type ExecucaoResponse = {
  accepted: boolean;
  execucaoId: string;
  status: string;
};

type DownloadResponse = {
  packageName: string;
  packagePath: string;
  checksum: string;
  validado: boolean;
};

export const atualizacaoSistemaService = {
  async obterVersaoAtual() {
    const { data } = await httpClient.get<VersaoAtualResponse>(
      "/api/configuracoes/atualizar-sistema/current-version"
    );
    return data;
  },

  async obterVersaoPublicada() {
    const { data } = await httpClient.get<VersaoPublicadaResponse>(
      "/api/configuracoes/atualizar-sistema/latest-version"
    );
    return data;
  },

  async verificarAtualizacao() {
    const { data } = await httpClient.get<{
      modo: AtualizacaoSistemaConfig["modo"];
      versaoInstalada: string;
      versaoPublicada?: string | null;
      atualizacaoDisponivel: boolean;
      manifesto?: AtualizacaoSistemaManifesto | null;
      status: AtualizacaoSistemaStatus;
    }>("/api/configuracoes/atualizar-sistema/check-update");
    return data;
  },

  async obterChangelog() {
    const { data } = await httpClient.get<ChangelogResponse>(
      "/api/configuracoes/atualizar-sistema/changelog"
    );
    return data.entries;
  },

  async obterHistorico() {
    const { data } = await httpClient.get<HistoricoResponse>(
      "/api/configuracoes/atualizar-sistema/history"
    );
    return data.items;
  },

  async obterLogs(execucaoId?: string) {
    const { data } = await httpClient.get<LogsResponse>(
      "/api/configuracoes/atualizar-sistema/logs",
      {
        params: execucaoId ? { execucaoId } : undefined
      }
    );
    return data.items;
  },

  async baixarAtualizacao() {
    const { data } = await httpClient.post<DownloadResponse>(
      "/api/configuracoes/atualizar-sistema/download-update"
    );
    return data;
  },

  async aplicarAtualizacao() {
    const { data } = await httpClient.post<ExecucaoResponse>(
      "/api/configuracoes/atualizar-sistema/apply-update",
      {}
    );
    return data;
  },

  async rollback(historicoId?: string) {
    const { data } = await httpClient.post<ExecucaoResponse>(
      "/api/configuracoes/atualizar-sistema/rollback",
      historicoId ? { historicoId } : {}
    );
    return data;
  },

  async obterStatus() {
    const { data } = await httpClient.get<AtualizacaoSistemaStatus>(
      "/api/configuracoes/atualizar-sistema/status"
    );
    return data;
  },

  async obterConfig() {
    const { data } = await httpClient.get<AtualizacaoSistemaConfig>(
      "/api/configuracoes/atualizar-sistema/config"
    );
    return data;
  },

  async salvarConfig(payload: AtualizacaoSistemaConfig) {
    const { data } = await httpClient.post<AtualizacaoSistemaConfig>(
      "/api/configuracoes/atualizar-sistema/config",
      payload
    );
    return data;
  }
};
