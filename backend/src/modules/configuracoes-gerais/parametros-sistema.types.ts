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
