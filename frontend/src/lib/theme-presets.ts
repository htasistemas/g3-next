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
    id: "azul_sereno",
    nome: "Azul sereno",
    descricao: "Visual leve, confiável e acolhedor para rotinas institucionais.",
    settings: {
      modo: "claro",
      preset: "azul_sereno",
      paleta: {
        ...defaultThemePalette,
        corPrimaria: "#2563A6",
        corSecundaria: "#5B8DB8",
        corDestaque: "#E9A23B",
        corBotaoPrimario: "#2563A6",
        corLink: "#1D5A91",
        corElementoAtivo: "#2563A6",
        background: "#F4F8FC",
        border: "#D6E3EF",
        dashboardCard: "#F0F5FA",
        dashboardCardSoft: "#E2ECF5",
        info: "#3478B8"
      }
    }
  },
  {
    id: "verde_sage",
    nome: "Verde sage",
    descricao: "Tonalidade natural, suave e profissional para uma experiência acolhedora.",
    settings: {
      modo: "claro",
      preset: "verde_sage",
      paleta: {
        ...defaultThemePalette,
        corPrimaria: "#4F8068",
        corSecundaria: "#82A895",
        corDestaque: "#D39B57",
        corBotaoPrimario: "#4F8068",
        corLink: "#3F6F58",
        corElementoAtivo: "#4F8068",
        background: "#F5F9F6",
        border: "#D9E7DE",
        dashboardCard: "#F0F6F2",
        dashboardCardSoft: "#E2EEE6",
        success: "#4F8068"
      }
    }
  },
  {
    id: "turquesa_leve",
    nome: "Turquesa leve",
    descricao: "Paleta atual e luminosa para destacar ações sem pesar na tela.",
    settings: {
      modo: "claro",
      preset: "turquesa_leve",
      paleta: {
        ...defaultThemePalette,
        corPrimaria: "#167D86",
        corSecundaria: "#55B7B5",
        corDestaque: "#E1A84B",
        corBotaoPrimario: "#167D86",
        corLink: "#126B73",
        corElementoAtivo: "#167D86",
        background: "#F1FAFA",
        border: "#CDE8E8",
        dashboardCard: "#EEF8F8",
        dashboardCardSoft: "#DDF0F0",
        info: "#167D86"
      }
    }
  },
  {
    id: "lavanda_suave",
    nome: "Lavanda suave",
    descricao: "Uma alternativa delicada e moderna para equipes que preferem tons tranquilos.",
    settings: {
      modo: "claro",
      preset: "lavanda_suave",
      paleta: {
        ...defaultThemePalette,
        corPrimaria: "#7357A6",
        corSecundaria: "#9B86C4",
        corDestaque: "#D29A54",
        corBotaoPrimario: "#7357A6",
        corLink: "#654A95",
        corElementoAtivo: "#7357A6",
        background: "#F8F6FC",
        border: "#E2DAF0",
        dashboardCard: "#F4F1FA",
        dashboardCardSoft: "#EAE4F5",
        info: "#7357A6"
      }
    }
  },
  {
    id: "areia_premium",
    nome: "Areia premium",
    descricao: "Tons quentes e elegantes para uma identidade comercial discreta.",
    settings: {
      modo: "claro",
      preset: "areia_premium",
      paleta: {
        ...defaultThemePalette,
        corPrimaria: "#8A6845",
        corSecundaria: "#B4936A",
        corDestaque: "#C7864B",
        corBotaoPrimario: "#8A6845",
        corLink: "#735334",
        corElementoAtivo: "#8A6845",
        background: "#FCF9F4",
        border: "#EADFCF",
        dashboardCard: "#FAF6EF",
        dashboardCardSoft: "#F1E8DA",
        warning: "#A96F36"
      }
    }
  },
  {
    id: "coral_acolhedor",
    nome: "Coral acolhedor",
    descricao: "Destaques calorosos e suaves para uma comunicação mais próxima.",
    settings: {
      modo: "claro",
      preset: "coral_acolhedor",
      paleta: {
        ...defaultThemePalette,
        corPrimaria: "#B85F5A",
        corSecundaria: "#D58C83",
        corDestaque: "#D99A45",
        corBotaoPrimario: "#B85F5A",
        corLink: "#9D4D4A",
        corElementoAtivo: "#B85F5A",
        background: "#FFF7F5",
        border: "#F0D8D4",
        dashboardCard: "#FFF3F1",
        dashboardCardSoft: "#F9E6E2",
        danger: "#B85F5A"
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
