import {
  alertasCentralAtendimentosSchema,
  atualizarCarenciaDoacaoRealizadaPayloadSchema,
  atualizarAlertasCentralAtendimentosPayloadSchema,
  atualizarObrigatoriedadeDocumentosBeneficiarioPayloadSchema,
  atualizarPersonalizacaoPayloadSchema,
  carenciaDoacaoRealizadaSchema,
  obrigatoriedadeDocumentosBeneficiarioSchema,
  personalizacaoSistemaSchema
} from "../parametros-sistema.schema.js";
import { ParametrosSistemaRepository } from "../repositories/parametros-sistema.repository.js";
import type {
  AlertasCentralAtendimentosSistema,
  CarenciaDoacaoRealizadaSistema,
  ObrigatoriedadeDocumentosBeneficiarioSistema,
  PersonalizacaoSistema
} from "../parametros-sistema.types.js";

const personalizacaoPadrao: PersonalizacaoSistema = {
  modo: "CLARO",
  preset: "PADRAO_VERDE",
  paleta: {
    cor_primaria: "#0f7a43",
    cor_secundaria: "#1d4ed8",
    cor_destaque: "#f59e0b",
    cor_botao_primario: "#0f7a43",
    cor_link: "#0f7a43",
    cor_elemento_ativo: "#0f7a43",
    background: "#f5faf7",
    foreground: "#0f172a",
    border: "#dbe7e0",
    muted: "#64748b",
    card: "#ffffff",
    danger: "#dc2626",
    warning: "#d97706",
    success: "#16a34a",
    info: "#0284c7"
  }
};

const carenciaDoacaoRealizadaPadrao: CarenciaDoacaoRealizadaSistema = {
  tempo_carencia_dias: 0
};

const obrigatoriedadeDocumentosBeneficiarioPadrao: ObrigatoriedadeDocumentosBeneficiarioSistema = {
  documentos: [
    { id: "cpf", nome: "CPF", obrigatorio: true },
    { id: "comprovante_endereco", nome: "Comprovante de endereço", obrigatorio: true },
    { id: "cnh", nome: "CNH", obrigatorio: false },
    { id: "certidao_nascimento", nome: "Certidão de nascimento", obrigatorio: false },
    { id: "certidao_casamento", nome: "Certidão de casamento", obrigatorio: false },
    { id: "carteira_trabalho", nome: "Carteira de trabalho", obrigatorio: false },
    { id: "titulo_eleitor", nome: "Título de eleitor", obrigatorio: false },
    { id: "cartao_sus", nome: "Cartão do SUS", obrigatorio: false }
  ]
};

const alertasCentralAtendimentosPadrao: AlertasCentralAtendimentosSistema = {
  dias_sem_atendimento_recente: 90,
  valor_custo_elevado_mes: 1000,
  alertar_cesta_mesmo_mes: true,
  alertar_familia_cesta_mes: true,
  alertar_cadastro_incompleto: true,
  alertar_encaminhamento_em_aberto: true,
  alertar_inscricao_ativa: true
};

const CHAVE_PREFERENCIA_AGENDAMENTOS_VISUALIZACAO = "AGENDAMENTOS_VISUALIZACAO";

export class ParametrosSistemaService {
  private readonly repository = new ParametrosSistemaRepository();

  async obterPersonalizacao(tenantId?: string) {
    const registro = await this.repository.buscarPersonalizacao(tenantId);
    if (!registro) {
      return {
        personalizacao: personalizacaoPadrao,
        atualizado_em: null as string | null
      };
    }

    const normalizado = personalizacaoSistemaSchema.parse({
      ...personalizacaoPadrao,
      ...registro.valor,
      paleta: {
        ...personalizacaoPadrao.paleta,
        ...(registro.valor?.paleta ?? {})
      }
    });

    return {
      personalizacao: normalizado,
      atualizado_em: registro.atualizado_em.toISOString()
    };
  }

  async atualizarPersonalizacao(rawPayload: unknown, usuarioAtualizacao: string, tenantId: string) {
    const payload = atualizarPersonalizacaoPayloadSchema.parse(rawPayload);

    const normalizado = personalizacaoSistemaSchema.parse({
      ...personalizacaoPadrao,
      ...payload.personalizacao,
      paleta: {
        ...personalizacaoPadrao.paleta,
        ...(payload.personalizacao.paleta ?? {})
      }
    });

    const salvo = await this.repository.salvarPersonalizacao(
      normalizado,
      usuarioAtualizacao,
      tenantId
    );

    return {
      personalizacao: normalizado,
      atualizado_em: salvo.atualizado_em.toISOString()
    };
  }

  getPersonalizacaoPadrao() {
    return personalizacaoPadrao;
  }

  async obterCarenciaDoacaoRealizada(tenantId?: string) {
    const registro = await this.repository.buscarCarenciaDoacaoRealizada(tenantId);
    if (!registro) {
      return {
        carencia: carenciaDoacaoRealizadaPadrao,
        atualizado_em: null as string | null
      };
    }

    const normalizado = carenciaDoacaoRealizadaSchema.parse({
      ...carenciaDoacaoRealizadaPadrao,
      ...registro.valor
    });

    return {
      carencia: normalizado,
      atualizado_em: registro.atualizado_em.toISOString()
    };
  }

  async atualizarCarenciaDoacaoRealizada(
    rawPayload: unknown,
    usuarioAtualizacao: string,
    tenantId: string
  ) {
    const payload = atualizarCarenciaDoacaoRealizadaPayloadSchema.parse(rawPayload);
    const normalizado = carenciaDoacaoRealizadaSchema.parse({
      ...carenciaDoacaoRealizadaPadrao,
      ...payload.carencia
    });

    const salvo = await this.repository.salvarCarenciaDoacaoRealizada(
      normalizado,
      usuarioAtualizacao,
      tenantId
    );

    return {
      carencia: normalizado,
      atualizado_em: salvo.atualizado_em.toISOString()
    };
  }

  getCarenciaDoacaoRealizadaPadrao() {
    return carenciaDoacaoRealizadaPadrao;
  }

  async obterObrigatoriedadeDocumentosBeneficiario(tenantId?: string) {
    const registro = await this.repository.buscarObrigatoriedadeDocumentosBeneficiario(tenantId);
    if (!registro) {
      return {
        obrigatoriedade: obrigatoriedadeDocumentosBeneficiarioPadrao,
        atualizado_em: null as string | null
      };
    }

    const documentosSalvos = Array.isArray(registro.valor?.documentos)
      ? registro.valor.documentos
      : [];

    const porId = new Map(
      documentosSalvos.map((documento) => [String(documento?.id ?? "").trim(), documento])
    );

    const normalizado = obrigatoriedadeDocumentosBeneficiarioSchema.parse({
      documentos: obrigatoriedadeDocumentosBeneficiarioPadrao.documentos.map((documentoPadrao) => {
        const salvo = porId.get(documentoPadrao.id);
        return {
          ...documentoPadrao,
          nome: String(salvo?.nome ?? documentoPadrao.nome).trim() || documentoPadrao.nome,
          obrigatorio: Boolean(salvo?.obrigatorio ?? documentoPadrao.obrigatorio)
        };
      })
    });

    return {
      obrigatoriedade: normalizado,
      atualizado_em: registro.atualizado_em.toISOString()
    };
  }

  async atualizarObrigatoriedadeDocumentosBeneficiario(
    rawPayload: unknown,
    usuarioAtualizacao: string,
    tenantId: string
  ) {
    const payload = atualizarObrigatoriedadeDocumentosBeneficiarioPayloadSchema.parse(rawPayload);
    const documentosRecebidos = Array.isArray(payload.obrigatoriedade?.documentos)
      ? payload.obrigatoriedade.documentos
      : [];
    const porId = new Map(
      documentosRecebidos.map((documento) => [documento.id.trim(), documento])
    );

    const normalizado = obrigatoriedadeDocumentosBeneficiarioSchema.parse({
      documentos: obrigatoriedadeDocumentosBeneficiarioPadrao.documentos.map((documentoPadrao) => {
        const recebido = porId.get(documentoPadrao.id);
        return {
          ...documentoPadrao,
          nome: recebido?.nome?.trim() || documentoPadrao.nome,
          obrigatorio: Boolean(recebido?.obrigatorio ?? documentoPadrao.obrigatorio)
        };
      })
    });

    const salvo = await this.repository.salvarObrigatoriedadeDocumentosBeneficiario(
      normalizado,
      usuarioAtualizacao,
      tenantId
    );

    return {
      obrigatoriedade: normalizado,
      atualizado_em: salvo.atualizado_em.toISOString()
    };
  }

  getObrigatoriedadeDocumentosBeneficiarioPadrao() {
    return obrigatoriedadeDocumentosBeneficiarioPadrao;
  }

  async obterAlertasCentralAtendimentos(tenantId?: string) {
    const registro = await this.repository.buscarAlertasCentralAtendimentos(tenantId);
    if (!registro) {
      return {
        alertas: alertasCentralAtendimentosPadrao,
        atualizado_em: null as string | null
      };
    }

    const normalizado = alertasCentralAtendimentosSchema.parse({
      ...alertasCentralAtendimentosPadrao,
      ...registro.valor
    });

    return {
      alertas: normalizado,
      atualizado_em: registro.atualizado_em.toISOString()
    };
  }

  async atualizarAlertasCentralAtendimentos(
    rawPayload: unknown,
    usuarioAtualizacao: string,
    tenantId: string
  ) {
    const payload = atualizarAlertasCentralAtendimentosPayloadSchema.parse(rawPayload);
    const normalizado = alertasCentralAtendimentosSchema.parse({
      ...alertasCentralAtendimentosPadrao,
      ...payload.alertas
    });

    const salvo = await this.repository.salvarAlertasCentralAtendimentos(
      normalizado,
      usuarioAtualizacao,
      tenantId
    );

    return {
      alertas: normalizado,
      atualizado_em: salvo.atualizado_em.toISOString()
    };
  }

  getAlertasCentralAtendimentosPadrao() {
    return alertasCentralAtendimentosPadrao;
  }

  async obterPreferenciaAgendamentosVisualizacao(usuarioId: string, tenantId: string) {
    const chave = this.montarChavePreferenciaUsuario(
      CHAVE_PREFERENCIA_AGENDAMENTOS_VISUALIZACAO,
      usuarioId
    );
    const registro = await this.repository.buscarPorChaveGenerica<{ data_visualizacao?: string }>(chave, tenantId);
    return registro?.valor?.data_visualizacao?.trim() || null;
  }

  async salvarPreferenciaAgendamentosVisualizacao(
    dataVisualizacao: string,
    usuarioId: string,
    usuarioAtualizacao: string,
    tenantId: string
  ) {
    const chave = this.montarChavePreferenciaUsuario(
      CHAVE_PREFERENCIA_AGENDAMENTOS_VISUALIZACAO,
      usuarioId
    );
    await this.repository.salvarPorChaveGenerica(
      chave,
      { data_visualizacao: dataVisualizacao },
      usuarioAtualizacao,
      tenantId
    );

    return { data_visualizacao: dataVisualizacao };
  }

  private montarChavePreferenciaUsuario(chaveBase: string, usuarioId: string) {
    return `${chaveBase}:${String(usuarioId).trim()}`;
  }
}
