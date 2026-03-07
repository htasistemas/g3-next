import { httpClient } from "./http-client";
import type { ThemeSettings } from "@/types/theme";

type PersonalizacaoResponse = {
  personalizacao: {
    modo: "CLARO" | "ESCURO" | "AUTOMATICO";
    preset?: string;
    paleta: {
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
  };
  atualizado_em: string | null;
};

function mapModoApiParaUI(modo: PersonalizacaoResponse["personalizacao"]["modo"]): ThemeSettings["modo"] {
  if (modo === "ESCURO") return "escuro";
  if (modo === "AUTOMATICO") return "automatico";
  return "claro";
}

function mapModoUIParaApi(modo: ThemeSettings["modo"]): "CLARO" | "ESCURO" | "AUTOMATICO" {
  if (modo === "escuro") return "ESCURO";
  if (modo === "automatico") return "AUTOMATICO";
  return "CLARO";
}

function fromApi(response: PersonalizacaoResponse): ThemeSettings {
  return {
    modo: mapModoApiParaUI(response.personalizacao.modo),
    preset: response.personalizacao.preset,
    paleta: {
      corPrimaria: response.personalizacao.paleta.cor_primaria,
      corSecundaria: response.personalizacao.paleta.cor_secundaria,
      corDestaque: response.personalizacao.paleta.cor_destaque,
      corBotaoPrimario: response.personalizacao.paleta.cor_botao_primario,
      corLink: response.personalizacao.paleta.cor_link,
      corElementoAtivo: response.personalizacao.paleta.cor_elemento_ativo,
      background: response.personalizacao.paleta.background,
      foreground: response.personalizacao.paleta.foreground,
      border: response.personalizacao.paleta.border,
      muted: response.personalizacao.paleta.muted,
      card: response.personalizacao.paleta.card,
      danger: response.personalizacao.paleta.danger,
      warning: response.personalizacao.paleta.warning,
      success: response.personalizacao.paleta.success,
      info: response.personalizacao.paleta.info
    }
  };
}

function toApi(settings: ThemeSettings) {
  return {
    personalizacao: {
      modo: mapModoUIParaApi(settings.modo),
      preset: settings.preset,
      paleta: {
        cor_primaria: settings.paleta.corPrimaria,
        cor_secundaria: settings.paleta.corSecundaria,
        cor_destaque: settings.paleta.corDestaque,
        cor_botao_primario: settings.paleta.corBotaoPrimario,
        cor_link: settings.paleta.corLink,
        cor_elemento_ativo: settings.paleta.corElementoAtivo,
        background: settings.paleta.background,
        foreground: settings.paleta.foreground,
        border: settings.paleta.border,
        muted: settings.paleta.muted,
        card: settings.paleta.card,
        danger: settings.paleta.danger,
        warning: settings.paleta.warning,
        success: settings.paleta.success,
        info: settings.paleta.info
      }
    }
  };
}

export const parametrosSistemaService = {
  async obterPersonalizacao(): Promise<ThemeSettings> {
    const { data } = await httpClient.get<PersonalizacaoResponse>(
      "/api/configuracoes/parametros/personalizacao"
    );
    return fromApi(data);
  },

  async salvarPersonalizacao(settings: ThemeSettings): Promise<ThemeSettings> {
    const { data } = await httpClient.put<PersonalizacaoResponse>(
      "/api/configuracoes/parametros/personalizacao",
      toApi(settings)
    );
    return fromApi(data);
  }
};
