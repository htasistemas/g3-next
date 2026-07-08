import type { ThemePalette, ThemePreset, ThemeSettings } from "@/types/theme";

export const defaultThemePalette: ThemePalette = {
  corPrimaria: "#0F7A43",
  corSecundaria: "#1D4ED8",
  corDestaque: "#F59E0B",
  corBotaoPrimario: "#0F7A43",
  corLink: "#0F7A43",
  corElementoAtivo: "#0F7A43",
  background: "#F5FAF7",
  foreground: "#0F172A",
  border: "#DBE7E0",
  muted: "#64748B",
  card: "#FFFFFF",
  dashboardCard: "#F3F4F6",
  dashboardCardSoft: "#E5E7EB",
  danger: "#DC2626",
  warning: "#D97706",
  success: "#16A34A",
  info: "#0284C7"
};

export const defaultThemeSettings: ThemeSettings = {
  modo: "claro",
  preset: "padrao_verde",
  paleta: defaultThemePalette
};

export const themePresets: ThemePreset[] = [
  {
    id: "padrao_verde",
    nome: "Padrão Verde",
    descricao: "Tema oficial do G3.",
    settings: {
      modo: "claro",
      preset: "padrao_verde",
      paleta: defaultThemePalette
    }
  },
  {
    id: "azul_corporativo",
    nome: "Azul Corporativo",
    descricao: "Visual sóbrio e institucional.",
    settings: {
      modo: "claro",
      preset: "azul_corporativo",
      paleta: {
        ...defaultThemePalette,
        corPrimaria: "#1E40AF",
        corSecundaria: "#0EA5E9",
        corBotaoPrimario: "#1E40AF",
        corLink: "#1D4ED8",
        corElementoAtivo: "#1E40AF",
        background: "#F1F5FF",
        border: "#C7D2FE"
      }
    }
  },
  {
    id: "roxo_moderno",
    nome: "Roxo Moderno",
    descricao: "Paleta contemporânea para ambientes de inovação.",
    settings: {
      modo: "claro",
      preset: "roxo_moderno",
      paleta: {
        ...defaultThemePalette,
        corPrimaria: "#6D28D9",
        corSecundaria: "#7C3AED",
        corBotaoPrimario: "#6D28D9",
        corLink: "#6D28D9",
        corElementoAtivo: "#6D28D9",
        background: "#F7F5FF",
        border: "#DDD6FE",
        info: "#7C3AED"
      }
    }
  },
  {
    id: "laranja_institucional",
    nome: "Laranja Institucional",
    descricao: "Tema quente com foco em destaque.",
    settings: {
      modo: "claro",
      preset: "laranja_institucional",
      paleta: {
        ...defaultThemePalette,
        corPrimaria: "#C2410C",
        corSecundaria: "#EA580C",
        corDestaque: "#F97316",
        corBotaoPrimario: "#C2410C",
        corLink: "#C2410C",
        corElementoAtivo: "#C2410C",
        background: "#FFF7ED",
        border: "#FED7AA",
        warning: "#C2410C"
      }
    }
  },
  {
    id: "escuro_premium",
    nome: "Escuro Premium",
    descricao: "Modo escuro com alto contraste.",
    settings: {
      modo: "escuro",
      preset: "escuro_premium",
      paleta: {
        ...defaultThemePalette,
        corPrimaria: "#10B981",
        corSecundaria: "#38BDF8",
        corBotaoPrimario: "#10B981",
        corLink: "#38BDF8",
        corElementoAtivo: "#10B981",
        background: "#0B1320",
        foreground: "#E2E8F0",
        border: "#23314B",
        muted: "#94A3B8",
        card: "#111827",
        dashboardCard: "#D1D5DB",
        dashboardCardSoft: "#9CA3AF"
      }
    }
  }
];
