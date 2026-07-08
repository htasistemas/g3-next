export type ThemeMode = "claro" | "escuro" | "automatico";

export type ThemePalette = {
  corPrimaria: string;
  corSecundaria: string;
  corDestaque: string;
  corBotaoPrimario: string;
  corLink: string;
  corElementoAtivo: string;
  background: string;
  foreground: string;
  border: string;
  muted: string;
  card: string;
  dashboardCard: string;
  dashboardCardSoft: string;
  danger: string;
  warning: string;
  success: string;
  info: string;
};

export type ThemeSettings = {
  modo: ThemeMode;
  preset?: string;
  paleta: ThemePalette;
};

export type ThemePreset = {
  id: string;
  nome: string;
  descricao: string;
  settings: ThemeSettings;
};
