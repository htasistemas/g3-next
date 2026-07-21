export type TipoImportacao = "BENEFICIARIOS";
export type StatusImportacao =
  | "EM_VALIDACAO"
  | "AGUARDANDO_CONFIRMACAO"
  | "PROCESSANDO"
  | "CONCLUIDA"
  | "CONCLUIDA_COM_PENDENCIAS"
  | "FALHOU";
export type StatusLinhaImportacao =
  | "PRONTO"
  | "EXISTENTE"
  | "DUPLICIDADE"
  | "INCOMPLETO"
  | "INVALIDO"
  | "ERRO"
  | "IGNORADO"
  | "IMPORTADO"
  | "ATUALIZADO";

export type ImportacaoLinha = {
  linha: number;
  original: Record<string, string>;
  dados: Record<string, unknown>;
  status: StatusLinhaImportacao;
  problemas: Array<{ campo?: string; valor?: string; mensagem: string; orientacao?: string }>;
  beneficiarioId?: string;
  acao?: "IGNORAR" | "ATUALIZAR";
  alteradoManualmente?: boolean;
};

export type ImportacaoInstituicao = {
  id: string;
  tenant_id: string;
  razao_social: string;
  nome_fantasia?: string;
  cnpj: string;
  status: string;
};
