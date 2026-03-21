export type TemaModo = "CLARO" | "ESCURO" | "AUTOMATICO";

export type PaletaTema = {
  cor_primaria: string;
  cor_secundaria: string;
  cor_destaque: string;
  cor_botao_primario: string;
  cor_link: string;
  cor_elemento_ativo: string;
  background: string;
  foreground: string;
  border: string;
  muted: string;
  card: string;
  danger: string;
  warning: string;
  success: string;
  info: string;
};

export type PersonalizacaoSistema = {
  modo: TemaModo;
  preset?: string;
  paleta: PaletaTema;
};

export type CarenciaDoacaoRealizadaSistema = {
  tempo_carencia_dias: number;
};

export type DocumentoObrigatoriedadeBeneficiarioSistema = {
  id: string;
  nome: string;
  obrigatorio: boolean;
};

export type ObrigatoriedadeDocumentosBeneficiarioSistema = {
  documentos: DocumentoObrigatoriedadeBeneficiarioSistema[];
};

export type AlertasCentralAtendimentosSistema = {
  dias_sem_atendimento_recente: number;
  valor_custo_elevado_mes: number;
  alertar_cesta_mesmo_mes: boolean;
  alertar_familia_cesta_mes: boolean;
  alertar_cadastro_incompleto: boolean;
  alertar_encaminhamento_em_aberto: boolean;
  alertar_inscricao_ativa: boolean;
};
