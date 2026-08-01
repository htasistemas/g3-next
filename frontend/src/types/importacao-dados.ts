import type { InstituicaoResumo } from "./instituicao";

export type ImportacaoLinha = {
  linha: number;
  original: Record<string, string>;
  dados: Record<string, unknown>;
  status: string;
  problemas: Array<{ campo?: string; valor?: string; mensagem: string; orientacao?: string }>;
  beneficiarioId?: string;
};

export type ValidacaoImportacao = {
  id: string;
  instituicao: InstituicaoResumo & { tenant_id: string };
  colunas: string[];
  mapeamento: Record<string, string>;
  linhas: ImportacaoLinha[];
  resumo: { prontos: number; existentes: number; duplicidades: number; erros: number; ignorados: number };
};

export type AcompanhamentoImportacao = {
  id: string;
  status: string;
  linhas: ImportacaoLinha[];
  resumo?: { prontos?: number; existentes?: number; duplicidades?: number; erros?: number; ignorados?: number };
};
