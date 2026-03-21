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

type CarenciaDoacaoRealizadaResponse = {
  carencia: {
    tempo_carencia_dias: number;
  };
  atualizado_em: string | null;
};

export type CarenciaDoacaoRealizadaSettings = {
  tempoCarenciaDias: number;
};

type ObrigatoriedadeDocumentosBeneficiarioResponse = {
  obrigatoriedade: {
    documentos: Array<{
      id: string;
      nome: string;
      obrigatorio: boolean;
    }>;
  };
  atualizado_em: string | null;
};

export type DocumentoObrigatoriedadeBeneficiarioSetting = {
  id: string;
  nome: string;
  obrigatorio: boolean;
};

export type ObrigatoriedadeDocumentosBeneficiarioSettings = {
  documentos: DocumentoObrigatoriedadeBeneficiarioSetting[];
};

type AlertasCentralAtendimentosResponse = {
  alertas: {
    dias_sem_atendimento_recente: number;
    valor_custo_elevado_mes: number;
    alertar_cesta_mesmo_mes: boolean;
    alertar_familia_cesta_mes: boolean;
    alertar_cadastro_incompleto: boolean;
    alertar_encaminhamento_em_aberto: boolean;
    alertar_inscricao_ativa: boolean;
  };
  atualizado_em: string | null;
};

export type AlertasCentralAtendimentosSettings = {
  diasSemAtendimentoRecente: number;
  valorCustoElevadoMes: number;
  alertarCestaMesmoMes: boolean;
  alertarFamiliaCestaMes: boolean;
  alertarCadastroIncompleto: boolean;
  alertarEncaminhamentoEmAberto: boolean;
  alertarInscricaoAtiva: boolean;
};

export const documentosObrigatoriedadeBeneficiarioPadrao: DocumentoObrigatoriedadeBeneficiarioSetting[] =
  [
    { id: "cpf", nome: "CPF", obrigatorio: true },
    { id: "comprovante_endereco", nome: "Comprovante de endereço", obrigatorio: true },
    { id: "cnh", nome: "CNH", obrigatorio: false },
    { id: "certidao_nascimento", nome: "Certidão de nascimento", obrigatorio: false },
    { id: "certidao_casamento", nome: "Certidão de casamento", obrigatorio: false },
    { id: "carteira_trabalho", nome: "Carteira de trabalho", obrigatorio: false },
    { id: "titulo_eleitor", nome: "Título de eleitor", obrigatorio: false },
    { id: "cartao_sus", nome: "Cartão do SUS", obrigatorio: false }
  ];

export const alertasCentralAtendimentosPadrao: AlertasCentralAtendimentosSettings = {
  diasSemAtendimentoRecente: 30,
  valorCustoElevadoMes: 500,
  alertarCestaMesmoMes: true,
  alertarFamiliaCestaMes: true,
  alertarCadastroIncompleto: true,
  alertarEncaminhamentoEmAberto: true,
  alertarInscricaoAtiva: true
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
  },

  async obterCarenciaDoacoesRealizadas(): Promise<CarenciaDoacaoRealizadaSettings> {
    const { data } = await httpClient.get<CarenciaDoacaoRealizadaResponse>(
      "/api/configuracoes/parametros/carencia/doacoes-realizadas"
    );

    return {
      tempoCarenciaDias: Number(data.carencia?.tempo_carencia_dias ?? 0)
    };
  },

  async salvarCarenciaDoacoesRealizadas(
    settings: CarenciaDoacaoRealizadaSettings
  ): Promise<CarenciaDoacaoRealizadaSettings> {
    const { data } = await httpClient.put<CarenciaDoacaoRealizadaResponse>(
      "/api/configuracoes/parametros/carencia/doacoes-realizadas",
      {
        carencia: {
          tempo_carencia_dias: Number(settings.tempoCarenciaDias ?? 0)
        }
      }
    );

    return {
      tempoCarenciaDias: Number(data.carencia?.tempo_carencia_dias ?? 0)
    };
  },

  async obterObrigatoriedadeDocumentosBeneficiario(): Promise<ObrigatoriedadeDocumentosBeneficiarioSettings> {
    const { data } = await httpClient.get<ObrigatoriedadeDocumentosBeneficiarioResponse>(
      "/api/configuracoes/parametros/obrigatoriedade/beneficiarios/documentos"
    );

    return {
      documentos: (data.obrigatoriedade?.documentos ?? []).map((documento) => ({
        id: documento.id,
        nome: documento.nome,
        obrigatorio: Boolean(documento.obrigatorio)
      }))
    };
  },

  async salvarObrigatoriedadeDocumentosBeneficiario(
    settings: ObrigatoriedadeDocumentosBeneficiarioSettings
  ): Promise<ObrigatoriedadeDocumentosBeneficiarioSettings> {
    const { data } = await httpClient.put<ObrigatoriedadeDocumentosBeneficiarioResponse>(
      "/api/configuracoes/parametros/obrigatoriedade/beneficiarios/documentos",
      {
        obrigatoriedade: {
          documentos: settings.documentos.map((documento) => ({
            id: documento.id,
            nome: documento.nome,
            obrigatorio: Boolean(documento.obrigatorio)
          }))
        }
      }
    );

    return {
      documentos: (data.obrigatoriedade?.documentos ?? []).map((documento) => ({
        id: documento.id,
        nome: documento.nome,
        obrigatorio: Boolean(documento.obrigatorio)
      }))
    };
  },

  async obterAlertasCentralAtendimentos(): Promise<AlertasCentralAtendimentosSettings> {
    const { data } = await httpClient.get<AlertasCentralAtendimentosResponse>(
      "/api/configuracoes/parametros/central-atendimentos/alertas"
    );

    return {
      diasSemAtendimentoRecente: Number(
        data.alertas?.dias_sem_atendimento_recente ??
          alertasCentralAtendimentosPadrao.diasSemAtendimentoRecente
      ),
      valorCustoElevadoMes: Number(
        data.alertas?.valor_custo_elevado_mes ?? alertasCentralAtendimentosPadrao.valorCustoElevadoMes
      ),
      alertarCestaMesmoMes: Boolean(
        data.alertas?.alertar_cesta_mesmo_mes ?? alertasCentralAtendimentosPadrao.alertarCestaMesmoMes
      ),
      alertarFamiliaCestaMes: Boolean(
        data.alertas?.alertar_familia_cesta_mes ??
          alertasCentralAtendimentosPadrao.alertarFamiliaCestaMes
      ),
      alertarCadastroIncompleto: Boolean(
        data.alertas?.alertar_cadastro_incompleto ??
          alertasCentralAtendimentosPadrao.alertarCadastroIncompleto
      ),
      alertarEncaminhamentoEmAberto: Boolean(
        data.alertas?.alertar_encaminhamento_em_aberto ??
          alertasCentralAtendimentosPadrao.alertarEncaminhamentoEmAberto
      ),
      alertarInscricaoAtiva: Boolean(
        data.alertas?.alertar_inscricao_ativa ?? alertasCentralAtendimentosPadrao.alertarInscricaoAtiva
      )
    };
  },

  async salvarAlertasCentralAtendimentos(
    settings: AlertasCentralAtendimentosSettings
  ): Promise<AlertasCentralAtendimentosSettings> {
    const { data } = await httpClient.put<AlertasCentralAtendimentosResponse>(
      "/api/configuracoes/parametros/central-atendimentos/alertas",
      {
        alertas: {
          dias_sem_atendimento_recente: Number(settings.diasSemAtendimentoRecente ?? 0),
          valor_custo_elevado_mes: Number(settings.valorCustoElevadoMes ?? 0),
          alertar_cesta_mesmo_mes: Boolean(settings.alertarCestaMesmoMes),
          alertar_familia_cesta_mes: Boolean(settings.alertarFamiliaCestaMes),
          alertar_cadastro_incompleto: Boolean(settings.alertarCadastroIncompleto),
          alertar_encaminhamento_em_aberto: Boolean(settings.alertarEncaminhamentoEmAberto),
          alertar_inscricao_ativa: Boolean(settings.alertarInscricaoAtiva)
        }
      }
    );

    return {
      diasSemAtendimentoRecente: Number(data.alertas?.dias_sem_atendimento_recente ?? 0),
      valorCustoElevadoMes: Number(data.alertas?.valor_custo_elevado_mes ?? 0),
      alertarCestaMesmoMes: Boolean(data.alertas?.alertar_cesta_mesmo_mes),
      alertarFamiliaCestaMes: Boolean(data.alertas?.alertar_familia_cesta_mes),
      alertarCadastroIncompleto: Boolean(data.alertas?.alertar_cadastro_incompleto),
      alertarEncaminhamentoEmAberto: Boolean(data.alertas?.alertar_encaminhamento_em_aberto),
      alertarInscricaoAtiva: Boolean(data.alertas?.alertar_inscricao_ativa)
    };
  }
};
