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
import { criptografarSegredo, mascararSegredo } from "../../../shared/security/secret-crypto.js";
import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
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
    dashboard_card: "#f3f4f6",
    dashboard_card_soft: "#e5e7eb",
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

const tiposIntegracaoPadrao = [
  "CONSULTA_CEP",
  "VALIDACAO_ENDERECO",
  "MAPAS_GEOLOCALIZACAO",
  "WHATSAPP",
  "EMAIL",
  "OCR",
  "ARMAZENAMENTO_DOCUMENTOS",
  "ASSINATURA_ELETRONICA",
  "INTELIGENCIA_ARTIFICIAL",
  "BIOMETRIA",
  "ANTIVIRUS",
  "NOTIFICACOES",
  "MERCADO_PAGO",
  "OUTROS_PROVEDORES"
] as const;

let integracaoEstruturaPromise: Promise<void> | undefined;

async function garantirColunasIntegracaoMercadoPago() {
  if (!integracaoEstruturaPromise) {
    integracaoEstruturaPromise = prisma.$executeRaw(Prisma.sql`
      ALTER TABLE integracao_configuracao
        ADD COLUMN IF NOT EXISTS credencial_secundaria_mascarada VARCHAR(120),
        ADD COLUMN IF NOT EXISTS credencial_secundaria_criptografada TEXT,
        ADD COLUMN IF NOT EXISTS webhook_url TEXT
    `).then(() => undefined).catch((error) => {
      integracaoEstruturaPromise = undefined;
      throw error;
    });
  }
  await integracaoEstruturaPromise;
}

const configuracaoCadastroBeneficiarioPadrao = {
  prazo_revisao_dias: 365,
  permitir_sem_cpf: true,
  permitir_sem_data_nascimento_completa: false,
  permitir_sem_documento: true,
  exigir_responsavel_menor: true,
  exigir_familia: false,
  ativar_analise_duplicidade: true,
  sensibilidade_duplicidade: "MEDIA",
  bloquear_cpf_duplicado: true,
  ativar_alertas: true,
  campos_obrigatorios_rapido: ["nome_completo", "consentimento_minimo"],
  campos_obrigatorios_completo: [],
  pesos_completude: {
    identificacao: 20,
    contatos: 10,
    endereco: 15,
    familia: 15,
    socioeconomico: 15,
    documentos: 10,
    consentimentos: 10,
    programas: 5
  },
  documentos_obrigatorios: [],
  consentimentos_obrigatorios: ["TRATAMENTO_DADOS"],
  validade_documentos_dias: null as number | null,
  validade_consentimentos_dias: null as number | null
};

function parseTenantId(rawTenantId?: string) {
  const tenantId = rawTenantId?.trim();
  if (!tenantId) throw new AppError("Tenant da sessao nao identificado.", 401);
  return tenantId;
}

function normalizarTipoIntegracao(tipo: unknown) {
  const valor = String(tipo ?? "").trim().toUpperCase();
  if (!valor) throw new AppError("Informe o tipo da integracao.", 422);
  return valor;
}

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

  async obterConfiguracaoCadastroBeneficiario(tenantId?: string) {
    const tenant = parseTenantId(tenantId);
    const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT *
      FROM beneficiario_configuracao_cadastro
      WHERE tenant_id::text = ${tenant}
      LIMIT 1
    `);
    if (!rows[0]) {
      await prisma.$executeRaw(Prisma.sql`
        INSERT INTO beneficiario_configuracao_cadastro (tenant_id)
        VALUES (${tenant}::uuid)
        ON CONFLICT (tenant_id) DO NOTHING
      `);
      return { configuracao: configuracaoCadastroBeneficiarioPadrao, atualizado_em: null as string | null };
    }
    return {
      configuracao: {
        ...configuracaoCadastroBeneficiarioPadrao,
        prazo_revisao_dias: Number(rows[0].prazo_revisao_dias ?? 365),
        permitir_sem_cpf: Boolean(rows[0].permitir_sem_cpf),
        permitir_sem_data_nascimento_completa: Boolean(rows[0].permitir_sem_data_nascimento_completa),
        permitir_sem_documento: Boolean(rows[0].permitir_sem_documento),
        exigir_responsavel_menor: Boolean(rows[0].exigir_responsavel_menor),
        exigir_familia: Boolean(rows[0].exigir_familia),
        ativar_analise_duplicidade: Boolean(rows[0].ativar_analise_duplicidade),
        sensibilidade_duplicidade: String(rows[0].sensibilidade_duplicidade ?? "MEDIA"),
        bloquear_cpf_duplicado: Boolean(rows[0].bloquear_cpf_duplicado),
        ativar_alertas: Boolean(rows[0].ativar_alertas),
        campos_obrigatorios_rapido: rows[0].campos_obrigatorios_rapido ?? configuracaoCadastroBeneficiarioPadrao.campos_obrigatorios_rapido,
        campos_obrigatorios_completo: rows[0].campos_obrigatorios_completo ?? [],
        pesos_completude: rows[0].pesos_completude ?? configuracaoCadastroBeneficiarioPadrao.pesos_completude,
        documentos_obrigatorios: rows[0].documentos_obrigatorios ?? [],
        consentimentos_obrigatorios: rows[0].consentimentos_obrigatorios ?? ["TRATAMENTO_DADOS"],
        validade_documentos_dias: rows[0].validade_documentos_dias ? Number(rows[0].validade_documentos_dias) : null,
        validade_consentimentos_dias: rows[0].validade_consentimentos_dias ? Number(rows[0].validade_consentimentos_dias) : null
      },
      atualizado_em: rows[0].atualizado_em instanceof Date ? rows[0].atualizado_em.toISOString() : null
    };
  }

  async atualizarConfiguracaoCadastroBeneficiario(rawPayload: unknown, usuarioAtualizacao: string, tenantId: string) {
    const tenant = parseTenantId(tenantId);
    const payload = (rawPayload && typeof rawPayload === "object" ? rawPayload : {}) as Record<string, unknown>;
    const configuracao = {
      ...configuracaoCadastroBeneficiarioPadrao,
      ...((payload.configuracao && typeof payload.configuracao === "object" ? payload.configuracao : payload) as Record<string, unknown>)
    };
    const prazo = Number(configuracao.prazo_revisao_dias ?? 365);
    if (!Number.isInteger(prazo) || prazo <= 0) {
      throw new AppError("Prazo de revisao cadastral invalido.", 422);
    }
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO beneficiario_configuracao_cadastro (
        tenant_id, prazo_revisao_dias, permitir_sem_cpf, permitir_sem_data_nascimento_completa,
        permitir_sem_documento, exigir_responsavel_menor, exigir_familia, ativar_analise_duplicidade,
        sensibilidade_duplicidade, bloquear_cpf_duplicado, ativar_alertas, campos_obrigatorios_rapido,
        campos_obrigatorios_completo, pesos_completude, documentos_obrigatorios, consentimentos_obrigatorios,
        validade_documentos_dias, validade_consentimentos_dias, criado_em, atualizado_em
      ) VALUES (
        ${tenant}::uuid, ${prazo}, ${Boolean(configuracao.permitir_sem_cpf)},
        ${Boolean(configuracao.permitir_sem_data_nascimento_completa)}, ${Boolean(configuracao.permitir_sem_documento)},
        ${Boolean(configuracao.exigir_responsavel_menor)}, ${Boolean(configuracao.exigir_familia)},
        ${Boolean(configuracao.ativar_analise_duplicidade)}, ${String(configuracao.sensibilidade_duplicidade ?? "MEDIA")},
        ${Boolean(configuracao.bloquear_cpf_duplicado)}, ${Boolean(configuracao.ativar_alertas)},
        ${JSON.stringify(configuracao.campos_obrigatorios_rapido ?? [])}::jsonb,
        ${JSON.stringify(configuracao.campos_obrigatorios_completo ?? [])}::jsonb,
        ${JSON.stringify(configuracao.pesos_completude ?? configuracaoCadastroBeneficiarioPadrao.pesos_completude)}::jsonb,
        ${JSON.stringify(configuracao.documentos_obrigatorios ?? [])}::jsonb,
        ${JSON.stringify(configuracao.consentimentos_obrigatorios ?? [])}::jsonb,
        ${configuracao.validade_documentos_dias ? Number(configuracao.validade_documentos_dias) : null},
        ${configuracao.validade_consentimentos_dias ? Number(configuracao.validade_consentimentos_dias) : null},
        NOW(), NOW()
      )
      ON CONFLICT (tenant_id)
      DO UPDATE SET
        prazo_revisao_dias = EXCLUDED.prazo_revisao_dias,
        permitir_sem_cpf = EXCLUDED.permitir_sem_cpf,
        permitir_sem_data_nascimento_completa = EXCLUDED.permitir_sem_data_nascimento_completa,
        permitir_sem_documento = EXCLUDED.permitir_sem_documento,
        exigir_responsavel_menor = EXCLUDED.exigir_responsavel_menor,
        exigir_familia = EXCLUDED.exigir_familia,
        ativar_analise_duplicidade = EXCLUDED.ativar_analise_duplicidade,
        sensibilidade_duplicidade = EXCLUDED.sensibilidade_duplicidade,
        bloquear_cpf_duplicado = EXCLUDED.bloquear_cpf_duplicado,
        ativar_alertas = EXCLUDED.ativar_alertas,
        campos_obrigatorios_rapido = EXCLUDED.campos_obrigatorios_rapido,
        campos_obrigatorios_completo = EXCLUDED.campos_obrigatorios_completo,
        pesos_completude = EXCLUDED.pesos_completude,
        documentos_obrigatorios = EXCLUDED.documentos_obrigatorios,
        consentimentos_obrigatorios = EXCLUDED.consentimentos_obrigatorios,
        validade_documentos_dias = EXCLUDED.validade_documentos_dias,
        validade_consentimentos_dias = EXCLUDED.validade_consentimentos_dias,
        atualizado_em = NOW()
    `);
    await this.repository.salvarPorChaveGenerica("BENEFICIARIO_CONFIGURACAO_CADASTRO_AUDITORIA", {
      atualizado_por: usuarioAtualizacao,
      atualizado_em: new Date().toISOString()
    }, usuarioAtualizacao, tenant);
    return this.obterConfiguracaoCadastroBeneficiario(tenant);
  }

  async listarIntegracoes(tenantId?: string) {
    await garantirColunasIntegracaoMercadoPago();
    const tenant = parseTenantId(tenantId);
    const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT tipo, ativo, fornecedor, ambiente, url_base, timeout_ms, tentativas,
             credencial_mascarada, credencial_secundaria_mascarada, webhook_url, limite_uso, observacao, ultima_tentativa_em,
             ultimo_sucesso_em, ultimo_erro, atualizado_em
      FROM integracao_configuracao
      WHERE tenant_id::text = ${tenant}
      ORDER BY tipo ASC
    `);
    const porTipo = new Map(rows.map((row) => [String(row.tipo), row]));
    return {
      tipos: tiposIntegracaoPadrao,
      integracoes: tiposIntegracaoPadrao.map((tipo) => {
        const row = porTipo.get(tipo);
        return {
          tipo,
          ativo: Boolean(row?.ativo ?? false),
          fornecedor: row?.fornecedor ? String(row.fornecedor) : "",
          ambiente: row?.ambiente ? String(row.ambiente) : "HOMOLOGACAO",
          url_base: row?.url_base ? String(row.url_base) : "",
          timeout_ms: Number(row?.timeout_ms ?? 5000),
          tentativas: Number(row?.tentativas ?? 1),
          credencial_mascarada: row?.credencial_mascarada ? String(row.credencial_mascarada) : undefined,
          credencial_secundaria_mascarada: row?.credencial_secundaria_mascarada ? String(row.credencial_secundaria_mascarada) : undefined,
          webhook_url: row?.webhook_url ? String(row.webhook_url) : undefined,
          limite_uso: row?.limite_uso ? Number(row.limite_uso) : undefined,
          observacao: row?.observacao ? String(row.observacao) : "",
          ultima_tentativa_em: row?.ultima_tentativa_em instanceof Date ? row.ultima_tentativa_em.toISOString() : undefined,
          ultimo_sucesso_em: row?.ultimo_sucesso_em instanceof Date ? row.ultimo_sucesso_em.toISOString() : undefined,
          ultimo_erro: row?.ultimo_erro ? String(row.ultimo_erro) : undefined,
          atualizado_em: row?.atualizado_em instanceof Date ? row.atualizado_em.toISOString() : undefined
        };
      })
    };
  }

  async listarIntegracaoMercadoPagoGlobal() {
    const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT tipo, ativo, fornecedor, ambiente, url_base, timeout_ms, tentativas,
             credencial_mascarada, credencial_secundaria_mascarada, webhook_url, limite_uso, observacao,
             escopo, atualizado_em
        FROM integracao_configuracao_global
       WHERE tipo = 'MERCADO_PAGO'
       LIMIT 1
    `);
    const row = rows[0];
    const clientes = await prisma.$queryRaw<Array<{ tenant_id: string }>>(Prisma.sql`
      SELECT tenant_id::text
        FROM integracao_configuracao_clientes
       WHERE tipo = 'MERCADO_PAGO' AND habilitada = TRUE
       ORDER BY tenant_id::text
    `);
    return {
      tipos: ["MERCADO_PAGO"],
      integracoes: [{
        tipo: "MERCADO_PAGO",
        ativo: Boolean(row?.ativo ?? false),
        fornecedor: row?.fornecedor ? String(row.fornecedor) : "Mercado Pago",
        ambiente: row?.ambiente ? String(row.ambiente) : "PRODUCAO",
        url_base: row?.url_base ? String(row.url_base) : "https://api.mercadopago.com",
        timeout_ms: Number(row?.timeout_ms ?? 15000),
        tentativas: Number(row?.tentativas ?? 2),
        credencial_mascarada: row?.credencial_mascarada ? String(row.credencial_mascarada) : undefined,
        credencial_secundaria_mascarada: row?.credencial_secundaria_mascarada ? String(row.credencial_secundaria_mascarada) : undefined,
        webhook_url: row?.webhook_url ? String(row.webhook_url) : undefined,
        escopo: (row?.escopo ? String(row.escopo) : "TODOS") as "TODOS" | "SELECIONADOS" | "NENHUM",
        clientes_tenant_ids: clientes.map((item) => item.tenant_id),
        limite_uso: row?.limite_uso ? Number(row.limite_uso) : undefined,
        observacao: row?.observacao ? String(row.observacao) : "Configuração global do G3N",
        atualizado_em: row?.atualizado_em instanceof Date ? row.atualizado_em.toISOString() : undefined
      }]
    };
  }

  async salvarIntegracaoMercadoPagoGlobal(rawPayload: unknown, usuarioId: string | undefined) {
    await garantirColunasIntegracaoMercadoPago();
    const payload = (rawPayload && typeof rawPayload === "object" ? rawPayload : {}) as Record<string, unknown>;
    const segredoCriptografado = criptografarSegredo(payload.credencial);
    const segredoMascarado = mascararSegredo(payload.credencial);
    const segredoSecundarioCriptografado = criptografarSegredo(payload.credencial_secundaria);
    const segredoSecundarioMascarado = mascararSegredo(payload.credencial_secundaria);
    const usuario = Number(usuarioId);
    const escopo = ["TODOS", "SELECIONADOS", "NENHUM"].includes(String(payload.escopo)) ? String(payload.escopo) : "TODOS";
    const clientesTenantIds = Array.isArray(payload.clientes_tenant_ids)
      ? payload.clientes_tenant_ids.filter((item): item is string => typeof item === "string" && /^[0-9a-f-]{36}$/i.test(item))
      : [];
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO integracao_configuracao_global (
        tipo, ativo, fornecedor, ambiente, url_base, timeout_ms, tentativas,
        credencial_mascarada, credencial_criptografada, credencial_secundaria_mascarada,
        credencial_secundaria_criptografada, webhook_url, escopo, limite_uso, observacao, atualizado_por,
        criado_em, atualizado_em
      ) VALUES (
        'MERCADO_PAGO', ${Boolean(payload.ativo)}, ${String(payload.fornecedor ?? "Mercado Pago").trim() || "Mercado Pago"},
        ${String(payload.ambiente ?? "PRODUCAO").trim().toUpperCase()}, ${String(payload.url_base ?? "https://api.mercadopago.com").trim()},
        ${Number(payload.timeout_ms ?? 15000)}, ${Number(payload.tentativas ?? 2)},
        ${segredoMascarado ?? null}, ${segredoCriptografado}, ${segredoSecundarioMascarado ?? null}, ${segredoSecundarioCriptografado},
        ${String(payload.webhook_url ?? "").trim() || null}, ${escopo}, ${payload.limite_uso ? Number(payload.limite_uso) : null},
        ${String(payload.observacao ?? "Configuração global do G3N").trim() || null},
        ${Number.isInteger(usuario) && usuario > 0 ? BigInt(usuario) : null}, NOW(), NOW()
      )
      ON CONFLICT (tipo) DO UPDATE SET
        ativo = EXCLUDED.ativo, fornecedor = EXCLUDED.fornecedor, ambiente = EXCLUDED.ambiente,
        url_base = EXCLUDED.url_base, timeout_ms = EXCLUDED.timeout_ms, tentativas = EXCLUDED.tentativas,
        credencial_mascarada = COALESCE(EXCLUDED.credencial_mascarada, integracao_configuracao_global.credencial_mascarada),
        credencial_criptografada = COALESCE(EXCLUDED.credencial_criptografada, integracao_configuracao_global.credencial_criptografada),
        credencial_secundaria_mascarada = COALESCE(EXCLUDED.credencial_secundaria_mascarada, integracao_configuracao_global.credencial_secundaria_mascarada),
        credencial_secundaria_criptografada = COALESCE(EXCLUDED.credencial_secundaria_criptografada, integracao_configuracao_global.credencial_secundaria_criptografada),
        webhook_url = EXCLUDED.webhook_url, escopo = EXCLUDED.escopo, limite_uso = EXCLUDED.limite_uso, observacao = EXCLUDED.observacao,
        atualizado_por = EXCLUDED.atualizado_por, atualizado_em = NOW()
    `);
    await prisma.$executeRaw(Prisma.sql`DELETE FROM integracao_configuracao_clientes WHERE tipo = 'MERCADO_PAGO'`);
    if (escopo === "SELECIONADOS") {
      for (const tenantId of clientesTenantIds) {
        await prisma.$executeRaw(Prisma.sql`
          INSERT INTO integracao_configuracao_clientes (tipo, tenant_id, habilitada, atualizado_por)
          VALUES ('MERCADO_PAGO', ${tenantId}::uuid, TRUE, ${Number.isInteger(usuario) && usuario > 0 ? BigInt(usuario) : null})
          ON CONFLICT (tipo, tenant_id) DO UPDATE SET habilitada = TRUE, atualizado_por = EXCLUDED.atualizado_por, atualizado_em = NOW()
        `);
      }
    }
    return this.listarIntegracaoMercadoPagoGlobal();
  }

  async listarIntegracoesGlobais() {
    const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      SELECT tipo, ativo, fornecedor, ambiente, url_base, timeout_ms, tentativas,
             credencial_mascarada, credencial_secundaria_mascarada, webhook_url, escopo, limite_uso, observacao, atualizado_em
        FROM integracao_configuracao_global
       ORDER BY tipo ASC
    `);
    const clientes = await prisma.$queryRaw<Array<{ tipo: string; tenant_id: string }>>(Prisma.sql`
      SELECT tipo, tenant_id::text FROM integracao_configuracao_clientes WHERE habilitada = TRUE ORDER BY tipo, tenant_id::text
    `);
    const porTipo = new Map(rows.map((row) => [String(row.tipo), row]));
    return {
      tipos: tiposIntegracaoPadrao,
      integracoes: tiposIntegracaoPadrao.map((tipo) => {
        const row = porTipo.get(tipo);
        return {
          tipo,
          ativo: Boolean(row?.ativo ?? false),
          fornecedor: row?.fornecedor ? String(row.fornecedor) : "",
          ambiente: row?.ambiente ? String(row.ambiente) : "PRODUCAO",
          url_base: row?.url_base ? String(row.url_base) : tipo === "MERCADO_PAGO" ? "https://api.mercadopago.com" : "",
          timeout_ms: Number(row?.timeout_ms ?? 5000),
          tentativas: Number(row?.tentativas ?? 1),
          credencial_mascarada: row?.credencial_mascarada ? String(row.credencial_mascarada) : undefined,
          credencial_secundaria_mascarada: row?.credencial_secundaria_mascarada ? String(row.credencial_secundaria_mascarada) : undefined,
          webhook_url: row?.webhook_url ? String(row.webhook_url) : undefined,
          escopo: (row?.escopo ? String(row.escopo) : "NENHUM") as "TODOS" | "SELECIONADOS" | "NENHUM",
          clientes_tenant_ids: clientes.filter((item) => item.tipo === tipo).map((item) => item.tenant_id),
          limite_uso: row?.limite_uso ? Number(row.limite_uso) : undefined,
          observacao: row?.observacao ? String(row.observacao) : "",
          atualizado_em: row?.atualizado_em instanceof Date ? row.atualizado_em.toISOString() : undefined
        };
      })
    };
  }

  async salvarIntegracaoGlobal(rawPayload: unknown, usuarioId: string | undefined) {
    await garantirColunasIntegracaoMercadoPago();
    const payload = (rawPayload && typeof rawPayload === "object" ? rawPayload : {}) as Record<string, unknown>;
    const tipo = normalizarTipoIntegracao(payload.tipo);
    if (!tiposIntegracaoPadrao.includes(tipo as (typeof tiposIntegracaoPadrao)[number])) throw new AppError("Tipo de integração inválido.", 422);
    const escopo = ["TODOS", "SELECIONADOS", "NENHUM"].includes(String(payload.escopo)) ? String(payload.escopo) : "NENHUM";
    const ids = Array.isArray(payload.clientes_tenant_ids) ? payload.clientes_tenant_ids.filter((id): id is string => typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id)) : [];
    const usuario = Number(usuarioId);
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO integracao_configuracao_global (tipo, ativo, fornecedor, ambiente, url_base, timeout_ms, tentativas, credencial_mascarada, credencial_criptografada, credencial_secundaria_mascarada, credencial_secundaria_criptografada, webhook_url, escopo, limite_uso, observacao, atualizado_por)
      VALUES (${tipo}, ${Boolean(payload.ativo)}, ${String(payload.fornecedor ?? "").trim() || null}, ${String(payload.ambiente ?? "PRODUCAO").trim().toUpperCase()}, ${String(payload.url_base ?? "").trim() || null}, ${Number(payload.timeout_ms ?? 5000)}, ${Number(payload.tentativas ?? 1)}, ${mascararSegredo(payload.credencial) ?? null}, ${criptografarSegredo(payload.credencial)}, ${mascararSegredo(payload.credencial_secundaria) ?? null}, ${criptografarSegredo(payload.credencial_secundaria)}, ${String(payload.webhook_url ?? "").trim() || null}, ${escopo}, ${payload.limite_uso ? Number(payload.limite_uso) : null}, ${String(payload.observacao ?? "").trim() || null}, ${Number.isInteger(usuario) && usuario > 0 ? BigInt(usuario) : null})
      ON CONFLICT (tipo) DO UPDATE SET ativo = EXCLUDED.ativo, fornecedor = EXCLUDED.fornecedor, ambiente = EXCLUDED.ambiente, url_base = EXCLUDED.url_base, timeout_ms = EXCLUDED.timeout_ms, tentativas = EXCLUDED.tentativas, credencial_mascarada = COALESCE(EXCLUDED.credencial_mascarada, integracao_configuracao_global.credencial_mascarada), credencial_criptografada = COALESCE(EXCLUDED.credencial_criptografada, integracao_configuracao_global.credencial_criptografada), credencial_secundaria_mascarada = COALESCE(EXCLUDED.credencial_secundaria_mascarada, integracao_configuracao_global.credencial_secundaria_mascarada), credencial_secundaria_criptografada = COALESCE(EXCLUDED.credencial_secundaria_criptografada, integracao_configuracao_global.credencial_secundaria_criptografada), webhook_url = EXCLUDED.webhook_url, escopo = EXCLUDED.escopo, limite_uso = EXCLUDED.limite_uso, observacao = EXCLUDED.observacao, atualizado_por = EXCLUDED.atualizado_por, atualizado_em = NOW()
    `);
    await prisma.$executeRaw(Prisma.sql`DELETE FROM integracao_configuracao_clientes WHERE tipo = ${tipo}`);
    if (escopo === "SELECIONADOS") for (const tenantId of ids) await prisma.$executeRaw(Prisma.sql`INSERT INTO integracao_configuracao_clientes (tipo, tenant_id, habilitada, atualizado_por) VALUES (${tipo}, ${tenantId}::uuid, TRUE, ${Number.isInteger(usuario) && usuario > 0 ? BigInt(usuario) : null}) ON CONFLICT (tipo, tenant_id) DO UPDATE SET habilitada = TRUE, atualizado_em = NOW()`);
    return this.listarIntegracoesGlobais();
  }

  async salvarIntegracao(rawPayload: unknown, usuarioId: string | undefined, tenantId: string) {
    await garantirColunasIntegracaoMercadoPago();
    const tenant = parseTenantId(tenantId);
    const payload = (rawPayload && typeof rawPayload === "object" ? rawPayload : {}) as Record<string, unknown>;
    const tipo = normalizarTipoIntegracao(payload.tipo);
    if (tipo === "MERCADO_PAGO") {
      throw new AppError("O Mercado Pago é uma integração global e só pode ser configurado pelo Painel master.", 403);
    }
    const segredoCriptografado = criptografarSegredo(payload.credencial);
    const segredoMascarado = mascararSegredo(payload.credencial);
    const segredoSecundarioCriptografado = criptografarSegredo(payload.credencial_secundaria);
    const segredoSecundarioMascarado = mascararSegredo(payload.credencial_secundaria);
    const usuario = Number(usuarioId);
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO integracao_configuracao (
        tenant_id, tipo, ativo, fornecedor, ambiente, url_base, timeout_ms, tentativas,
        credencial_mascarada, credencial_criptografada, credencial_secundaria_mascarada, credencial_secundaria_criptografada, webhook_url, limite_uso, observacao, atualizado_por,
        criado_em, atualizado_em
      ) VALUES (
        ${tenant}::uuid, ${tipo}, ${Boolean(payload.ativo)}, ${String(payload.fornecedor ?? "").trim() || null},
        ${String(payload.ambiente ?? "HOMOLOGACAO").trim().toUpperCase()},
        ${String(payload.url_base ?? "").trim() || null}, ${Number(payload.timeout_ms ?? 5000)},
        ${Number(payload.tentativas ?? 1)}, ${segredoMascarado ?? null}, ${segredoCriptografado}, ${segredoSecundarioMascarado ?? null}, ${segredoSecundarioCriptografado}, ${String(payload.webhook_url ?? "").trim() || null},
        ${payload.limite_uso ? Number(payload.limite_uso) : null}, ${String(payload.observacao ?? "").trim() || null},
        ${Number.isInteger(usuario) && usuario > 0 ? BigInt(usuario) : null}, NOW(), NOW()
      )
      ON CONFLICT (tenant_id, tipo)
      DO UPDATE SET
        ativo = EXCLUDED.ativo,
        fornecedor = EXCLUDED.fornecedor,
        ambiente = EXCLUDED.ambiente,
        url_base = EXCLUDED.url_base,
        timeout_ms = EXCLUDED.timeout_ms,
        tentativas = EXCLUDED.tentativas,
        credencial_mascarada = COALESCE(EXCLUDED.credencial_mascarada, integracao_configuracao.credencial_mascarada),
        credencial_criptografada = COALESCE(EXCLUDED.credencial_criptografada, integracao_configuracao.credencial_criptografada),
        credencial_secundaria_mascarada = COALESCE(EXCLUDED.credencial_secundaria_mascarada, integracao_configuracao.credencial_secundaria_mascarada),
        credencial_secundaria_criptografada = COALESCE(EXCLUDED.credencial_secundaria_criptografada, integracao_configuracao.credencial_secundaria_criptografada),
        webhook_url = EXCLUDED.webhook_url,
        limite_uso = EXCLUDED.limite_uso,
        observacao = EXCLUDED.observacao,
        atualizado_por = EXCLUDED.atualizado_por,
        atualizado_em = NOW()
    `);
    return this.listarIntegracoes(tenant);
  }

  async testarIntegracao(rawPayload: unknown, usuarioId: string | undefined, tenantId: string) {
    await garantirColunasIntegracaoMercadoPago();
    const tenant = parseTenantId(tenantId);
    const payload = (rawPayload && typeof rawPayload === "object" ? rawPayload : {}) as Record<string, unknown>;
    const tipo = normalizarTipoIntegracao(payload.tipo);
    const usuario = Number(usuarioId);
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO integracao_configuracao (
        tenant_id, tipo, ultima_tentativa_em, ultimo_sucesso_em, ultimo_erro, atualizado_por, criado_em, atualizado_em
      ) VALUES (
        ${tenant}::uuid, ${tipo}, NOW(), NOW(), NULL,
        ${Number.isInteger(usuario) && usuario > 0 ? BigInt(usuario) : null}, NOW(), NOW()
      )
      ON CONFLICT (tenant_id, tipo)
      DO UPDATE SET
        ultima_tentativa_em = NOW(),
        ultimo_sucesso_em = NOW(),
        ultimo_erro = NULL,
        atualizado_por = EXCLUDED.atualizado_por,
        atualizado_em = NOW()
    `);
    return { ok: true, mensagem: "Estrutura da integracao validada. Nenhuma chamada externa foi executada nesta etapa." };
  }

  private montarChavePreferenciaUsuario(chaveBase: string, usuarioId: string) {
    return `${chaveBase}:${String(usuarioId).trim()}`;
  }
}
