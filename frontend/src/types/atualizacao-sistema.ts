export type AtualizacaoSistemaModo = "MANUAL" | "AUTOMATICO";

export type AtualizacaoSistemaManifesto = {
  latestVersion: string;
  releaseDate: string;
  description: string;
  packageName: string;
  checksum: string;
  minCompatibleVersion?: string;
  releaseType: "stable" | "hotfix" | "beta" | "custom";
  downloadUrl?: string | null;
};

export type AtualizacaoSistemaStatus = {
  modo: AtualizacaoSistemaModo;
  versaoInstalada: string;
  versaoPublicada?: string | null;
  atualizacaoDisponivel: boolean;
  emExecucao: boolean;
  status: string;
  mensagem?: string | null;
  progresso: number;
  execucaoId?: string | null;
  ultimaVerificacaoEm?: string | null;
  ultimaAtualizacaoEm?: string | null;
  responsavelUltimaAtualizacao?: string | null;
  usuarioExecucao?: string | null;
  iniciadoEm?: string | null;
  finalizadoEm?: string | null;
};

export type AtualizacaoSistemaConfig = {
  modo: AtualizacaoSistemaModo;
};

export type AtualizacaoSistemaHistoricoItem = {
  id: string;
  execucaoId: string;
  versaoAnterior?: string | null;
  versaoNova?: string | null;
  modo: AtualizacaoSistemaModo;
  usuarioResponsavel?: string | null;
  dataHora: string;
  duracaoMs?: number | null;
  status: string;
  detalhes?: Record<string, unknown> | null;
  backupDiretorio?: string | null;
  rollbackDisponivel: boolean;
  rollbackExecutadoEm?: string | null;
};

export type AtualizacaoSistemaLogItem = {
  id: string;
  execucaoId: string;
  nivel: "INFO" | "WARN" | "ERROR";
  etapa: string;
  mensagem: string;
  detalhes?: Record<string, unknown> | null;
  criadoEm: string;
};

export type AtualizacaoSistemaChangelogItem = {
  version: string;
  releaseDate?: string;
  title?: string;
  description?: string;
  changes?: string[];
  releaseType?: "stable" | "hotfix" | "beta" | "custom";
};
