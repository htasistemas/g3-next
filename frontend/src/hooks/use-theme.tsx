import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren
} from "react";
import { darken, lighten, sanitizeHex } from "@/lib/color-utils";
import { useAuth } from "@/hooks/use-auth";
import { defaultThemeSettings } from "@/lib/theme-presets";
import { parametrosSistemaService } from "@/services/parametros-sistema.service";
import type { ThemeSettings } from "@/types/theme";

type ThemeContextValue = {
  settings: ThemeSettings;
  carregando: boolean;
  applyPreview: (settings: ThemeSettings) => void;
  clearPreview: () => void;
  saveSettings: (settings: ThemeSettings) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = "g3_theme_settings";
const STORAGE_KEY_LEGADO = "g3_theme_settings";

function getSistemaEscuroPreferido() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function normalizarSettings(input: ThemeSettings): ThemeSettings {
  return {
    modo: input.modo,
    preset: input.preset,
    paleta: {
      corPrimaria: sanitizeHex(input.paleta.corPrimaria, defaultThemeSettings.paleta.corPrimaria),
      corSecundaria: sanitizeHex(input.paleta.corSecundaria, defaultThemeSettings.paleta.corSecundaria),
      corDestaque: sanitizeHex(input.paleta.corDestaque, defaultThemeSettings.paleta.corDestaque),
      corBotaoPrimario: sanitizeHex(
        input.paleta.corBotaoPrimario,
        defaultThemeSettings.paleta.corBotaoPrimario
      ),
      corLink: sanitizeHex(input.paleta.corLink, defaultThemeSettings.paleta.corLink),
      corElementoAtivo: sanitizeHex(
        input.paleta.corElementoAtivo,
        defaultThemeSettings.paleta.corElementoAtivo
      ),
      background: sanitizeHex(input.paleta.background, defaultThemeSettings.paleta.background),
      foreground: sanitizeHex(input.paleta.foreground, defaultThemeSettings.paleta.foreground),
      border: sanitizeHex(input.paleta.border, defaultThemeSettings.paleta.border),
      muted: sanitizeHex(input.paleta.muted, defaultThemeSettings.paleta.muted),
      card: sanitizeHex(input.paleta.card, defaultThemeSettings.paleta.card),
      danger: sanitizeHex(input.paleta.danger, defaultThemeSettings.paleta.danger),
      warning: sanitizeHex(input.paleta.warning, defaultThemeSettings.paleta.warning),
      success: sanitizeHex(input.paleta.success, defaultThemeSettings.paleta.success),
      info: sanitizeHex(input.paleta.info, defaultThemeSettings.paleta.info)
    }
  };
}

function aplicarVariaveisCss(settings: ThemeSettings) {
  const root = document.documentElement;
  const temaEscuro =
    settings.modo === "escuro" || (settings.modo === "automatico" && getSistemaEscuroPreferido());

  const paleta = normalizarSettings(settings).paleta;
  const background = temaEscuro ? "#0B1320" : paleta.background;
  const card = temaEscuro ? "#111827" : paleta.card;
  const foreground = temaEscuro ? "#E2E8F0" : paleta.foreground;
  const border = temaEscuro ? "#23314B" : paleta.border;
  const muted = temaEscuro ? "#94A3B8" : paleta.muted;

  root.setAttribute("data-g3-color-scheme", temaEscuro ? "dark" : "light");

  root.style.setProperty("--g3-primary", paleta.corPrimaria);
  root.style.setProperty("--g3-primary-hover", darken(paleta.corPrimaria, 0.15));
  root.style.setProperty("--g3-primary-soft", lighten(paleta.corPrimaria, 0.82));
  root.style.setProperty("--g3-primary-soft-hover", lighten(paleta.corPrimaria, 0.7));
  root.style.setProperty("--g3-secondary", paleta.corSecundaria);
  root.style.setProperty("--g3-accent", paleta.corDestaque);
  root.style.setProperty("--g3-primary-button", paleta.corBotaoPrimario);
  root.style.setProperty("--g3-primary-button-hover", darken(paleta.corBotaoPrimario, 0.16));
  root.style.setProperty("--g3-link", paleta.corLink);
  root.style.setProperty("--g3-active", paleta.corElementoAtivo);
  root.style.setProperty("--g3-bg", background);
  root.style.setProperty("--g3-page-gradient-start", lighten(background, temaEscuro ? 0.05 : 0.12));
  root.style.setProperty("--g3-page-gradient-end", lighten(background, temaEscuro ? 0.02 : 0.04));
  root.style.setProperty("--g3-card", card);
  root.style.setProperty("--g3-card-soft", temaEscuro ? "#0F172A" : lighten(card, 0.02));
  root.style.setProperty("--g3-foreground", foreground);
  root.style.setProperty("--g3-muted", muted);
  root.style.setProperty("--g3-border", border);
  root.style.setProperty("--g3-danger", paleta.danger);
  root.style.setProperty("--g3-warning", paleta.warning);
  root.style.setProperty("--g3-success", paleta.success);
  root.style.setProperty("--g3-info", paleta.info);

  const sidebarBase = temaEscuro ? "#020617" : darken(paleta.corPrimaria, 0.42);
  const sidebarAlt = temaEscuro ? "#0B1320" : darken(paleta.corPrimaria, 0.28);
  root.style.setProperty("--g3-sidebar-bg", sidebarBase);
  root.style.setProperty("--g3-sidebar-bg-alt", sidebarAlt);
  root.style.setProperty("--g3-sidebar-border", lighten(sidebarAlt, 0.2));
  root.style.setProperty("--g3-sidebar-text", temaEscuro ? "#E2E8F0" : "#ECFDF5");
  root.style.setProperty("--g3-sidebar-shadow", darken(sidebarBase, 0.25));

  root.style.setProperty("--g3-header-bg", temaEscuro ? "#0F172A" : lighten(paleta.corPrimaria, 0.8));
  root.style.setProperty("--g3-header-border", temaEscuro ? "#1F2937" : lighten(paleta.corPrimaria, 0.55));
}

function chaveStoragePorTenant(tenantId?: string | null) {
  const normalizado = tenantId?.trim();
  return normalizado ? `${STORAGE_KEY}:${normalizado}` : STORAGE_KEY;
}

function carregarLocalStorage(tenantId?: string | null): ThemeSettings {
  const bruto = localStorage.getItem(chaveStoragePorTenant(tenantId));
  if (!bruto) return defaultThemeSettings;
  try {
    const parsed = JSON.parse(bruto) as ThemeSettings;
    return normalizarSettings({
      ...defaultThemeSettings,
      ...parsed,
      paleta: {
        ...defaultThemeSettings.paleta,
        ...(parsed?.paleta ?? {})
      }
    });
  } catch {
    return defaultThemeSettings;
  }
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const { autenticado, usuario } = useAuth();
  const tenantId = usuario?.tenant_id ?? null;
  const [settings, setSettings] = useState<ThemeSettings>(() => carregarLocalStorage());
  const [carregando, setCarregando] = useState(true);
  const [previewAtivo, setPreviewAtivo] = useState<ThemeSettings | null>(null);

  useEffect(() => {
    aplicarVariaveisCss(previewAtivo ?? settings);
  }, [previewAtivo, settings]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const temaAplicado = previewAtivo ?? settings;
      if (temaAplicado.modo === "automatico") {
        aplicarVariaveisCss(temaAplicado);
      }
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [previewAtivo, settings]);

  useEffect(() => {
    let ativo = true;

    if (!autenticado) {
      setPreviewAtivo(null);
      setSettings(defaultThemeSettings);
      setCarregando(false);
      return () => {
        ativo = false;
      };
    }

    setCarregando(true);

    void (async () => {
      try {
        const remoto = await parametrosSistemaService.obterPersonalizacao();
        if (!ativo) return;
        const normalizado = normalizarSettings(remoto);
        setSettings(normalizado);
        localStorage.setItem(chaveStoragePorTenant(tenantId), JSON.stringify(normalizado));
        if (tenantId) {
          localStorage.removeItem(STORAGE_KEY_LEGADO);
        }
      } catch {
        if (!ativo) return;
        setSettings(carregarLocalStorage(tenantId));
      } finally {
        if (ativo) {
          setCarregando(false);
        }
      }
    })();

    return () => {
      ativo = false;
    };
  }, [autenticado, tenantId]);

  const applyPreview = useCallback((draft: ThemeSettings) => {
    setPreviewAtivo(normalizarSettings(draft));
  }, []);

  const clearPreview = useCallback(() => {
    setPreviewAtivo(null);
  }, []);

  const saveSettings = useCallback(async (novo: ThemeSettings) => {
    const normalizado = normalizarSettings(novo);
    const remoto = await parametrosSistemaService.salvarPersonalizacao(normalizado);
    const remotoNormalizado = normalizarSettings(remoto);

    setPreviewAtivo(null);
    setSettings(remotoNormalizado);
    localStorage.setItem(chaveStoragePorTenant(tenantId), JSON.stringify(remotoNormalizado));
    if (tenantId) {
      localStorage.removeItem(STORAGE_KEY_LEGADO);
    }
  }, [tenantId]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      settings,
      carregando,
      applyPreview,
      clearPreview,
      saveSettings
    }),
    [settings, carregando, applyPreview, clearPreview, saveSettings]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme deve ser usado dentro de ThemeProvider.");
  }
  return context;
}
