import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";
import { CentralAtendimentosRepository } from "../../central-atendimentos/repositories/central-atendimentos.repository.js";
import { obterBeneficiarioPortalPorCpf } from "../../beneficiarios/repositories/beneficiario.repository.js";
import { ParametrosSistemaService } from "../../configuracoes-gerais/services/parametros-sistema.service.js";

export type PortalTipo = "voluntario" | "beneficiario" | "transparencia" | "parceiro";

type IndicadorPortal = {
  label: string;
  valor: string;
};

type CardPortal = {
  titulo: string;
  texto: string;
};

type TimelinePortal = {
  titulo: string;
  detalhe: string;
};

type AtendimentoPortal = {
  id: string;
  dataHora: string;
  tipoAtendimento: string;
  setor: string;
  profissionalResponsavel: string;
  status?: string;
  resumo: string;
  observacoes?: string;
  retornoPrevisto?: string;
};

type BeneficioPortal = {
  id: string;
  origem?: string;
  data: string;
  tipo: string;
  item: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  origemRecurso?: string;
  projetoPrograma?: string;
  profissionalResponsavel?: string;
  observacoes?: string;
  cienteAlertas?: boolean;
};

type AgendamentoPortal = {
  id: string;
  data: string;
  horaInicial: string;
  horaFinal?: string;
  tipoAtendimento?: string;
  setor?: string;
  profissionalNome?: string;
  sala?: string;
  status?: string;
  prioridade?: string;
  modalidade?: string;
  observacaoCurta?: string;
  documentosPendentes?: boolean;
};

type DocumentoPendentePortal = {
  id: string;
  nome: string;
  tipo?: string;
  numeroDocumento?: string;
  obrigatorio: boolean;
  caminhoArquivo?: string;
  contentType?: string;
};

type PortalPainel = {
  tipo: PortalTipo;
  token?: string;
  tema?: {
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
      dashboard_card: string;
      dashboard_card_soft: string;
      danger: string;
      warning: string;
      success: string;
      info: string;
    };
  };
  pessoa?: {
    id?: string;
    nome?: string;
    documento?: string;
    email?: string;
    telefone?: string;
    tenantId?: string;
  };
  atendimentos?: AtendimentoPortal[];
  beneficios?: BeneficioPortal[];
  agendamentos?: AgendamentoPortal[];
  documentosPendentes?: DocumentoPendentePortal[];
  movimentacoes?: Array<Record<string, unknown>>;
  indicadores: IndicadorPortal[];
  cards: CardPortal[];
  linhaDoTempo: TimelinePortal[];
  itens: Array<Record<string, unknown>>;
};

const parametrosSistemaService = new ParametrosSistemaService();
const centralAtendimentosRepository = new CentralAtendimentosRepository();

function normalizarTexto(valor: unknown) {
  return String(valor ?? "").trim();
}

function normalizarEmail(valor: unknown) {
  return normalizarTexto(valor).toLowerCase();
}

function somenteDigitos(valor: unknown) {
  return normalizarTexto(valor).replace(/\D/g, "");
}

function bigintToString(valor: unknown) {
  return typeof valor === "bigint" ? valor.toString() : String(valor ?? "");
}

function formatarValor(valor: unknown) {
  const numero = Number(valor ?? 0);
  if (!Number.isFinite(numero)) return "0";
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(numero);
}

function formatarMoeda(valor: unknown) {
  const numero = Number(valor ?? 0);
  if (!Number.isFinite(numero)) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(numero);
}

function filtroTenant(alias: string, tenantId?: string) {
  return tenantId
    ? Prisma.sql`AND ${Prisma.raw(alias)}.tenant_id::text = ${tenantId}`
    : Prisma.empty;
}

function montarToken(tipo: PortalTipo, id: string, tenantId?: string) {
  return Buffer.from(
    JSON.stringify({
      tipo,
      id,
      tenantId,
      nonce: randomUUID(),
      criadoEm: new Date().toISOString()
    })
  ).toString("base64url");
}

export class PortaisExternosService {
  async acessar(tipo: PortalTipo, input: Record<string, unknown>): Promise<PortalPainel> {
    if (tipo === "transparencia") {
      return this.obterTransparencia(normalizarTexto(input.tenantId));
    }

    const identificador = normalizarTexto(input.identificador);
    const senha = normalizarTexto(input.senha);

    if (!identificador || !senha) {
      throw new AppError("Informe os dados de acesso para entrar no portal.", 400);
    }

    if (tipo === "voluntario") return this.acessarVoluntario(identificador);
    if (tipo === "beneficiario") return this.acessarBeneficiarioFamilia(identificador, senha);
    if (tipo === "parceiro") return this.acessarParceiro(identificador);

    throw new AppError("Portal externo nao reconhecido.", 404);
  }

  async obterTransparencia(rawTenantId?: string): Promise<PortalPainel> {
    const tenantId = normalizarTexto(rawTenantId) || undefined;
    const [projetos, prestacoes, documentos, campanhas, unidades] = await Promise.all([
      prisma.$queryRaw<Array<{ id: bigint; nome: string; status: string | null; percentual: unknown; publico_alvo: string | null }>>(Prisma.sql`
        SELECT p.id, p.nome, p.status, COALESCE(p.percentual_evolucao, 0) AS percentual, p.publico_alvo
        FROM (
          SELECT
            p.id,
            p.nome,
            p.status,
            p.publico_alvo,
            p.tenant_id,
            CASE
              WHEN COUNT(t.id) = 0 AND p.status = 'CONCLUIDO' THEN 100
              WHEN COUNT(t.id) = 0 THEN 0
              ELSE ROUND((COUNT(t.id) FILTER (WHERE t.status = 'CONCLUIDO')::numeric / NULLIF(COUNT(t.id), 0)::numeric) * 100, 0)
            END AS percentual_evolucao
          FROM projetos p
          LEFT JOIN projeto_tarefas t ON t.projeto_id = p.id AND t.tenant_id = p.tenant_id
          WHERE COALESCE(p.ativo, TRUE) = TRUE
            ${filtroTenant("p", tenantId)}
          GROUP BY p.id, p.nome, p.status, p.publico_alvo, p.tenant_id
          ORDER BY p.updated_at DESC, p.id DESC
          LIMIT 6
        ) p
      `),
      prisma.$queryRaw<Array<{ total_recebido: unknown; total_aplicado: unknown; saldo_disponivel: unknown }>>(Prisma.sql`
        SELECT
          COALESCE(SUM(total_recebido), 0) AS total_recebido,
          COALESCE(SUM(total_aplicado), 0) AS total_aplicado,
          COALESCE(SUM(saldo_disponivel), 0) AS saldo_disponivel
        FROM transparencia t
        WHERE 1 = 1
          ${filtroTenant("t", tenantId)}
      `),
      prisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`
        SELECT COUNT(*)::bigint AS total
        FROM documentos_instituicao d
        WHERE COALESCE(d.status, 'ATIVO') <> 'EXCLUIDO'
          ${filtroTenant("d", tenantId)}
      `).catch(() => [{ total: 0n }]),
      prisma.$queryRaw<Array<{ total: bigint; arrecadado: unknown }>>(Prisma.sql`
        SELECT COUNT(*)::bigint AS total, COALESCE(SUM(valor_arrecadado), 0) AS arrecadado
        FROM captacao_campanhas c
        WHERE COALESCE(c.visivel_ao_publico, FALSE) = TRUE
          AND c.deleted_at IS NULL
          ${filtroTenant("c", tenantId)}
      `),
      prisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`
        SELECT COUNT(*)::bigint AS total
        FROM unidade_assistencial u
        WHERE 1 = 1
          ${filtroTenant("u", tenantId)}
      `)
    ]);

    const prestacao = prestacoes[0] ?? { total_recebido: 0, total_aplicado: 0, saldo_disponivel: 0 };
    const campanhasResumo = campanhas[0] ?? { total: 0n, arrecadado: 0 };

    return {
      tipo: "transparencia",
      indicadores: [
        { label: "Projetos publicados", valor: formatarValor(projetos.length) },
        { label: "Documentos públicos", valor: formatarValor(documentos[0]?.total ?? 0) },
        { label: "Recursos prestados", valor: formatarMoeda(prestacao.total_aplicado) }
      ],
      cards: [
        { titulo: "Projetos e resultados", texto: `${projetos.length} projeto(s) com informações públicas disponíveis.` },
        { titulo: "Prestação de contas pública", texto: `${formatarMoeda(prestacao.total_recebido)} recebidos e ${formatarMoeda(prestacao.total_aplicado)} aplicados.` },
        { titulo: "Mapa de atuação", texto: `${formatarValor(unidades[0]?.total ?? 0)} unidade(s) cadastrada(s) na base institucional.` }
      ],
      linhaDoTempo: [
        { titulo: "Projetos ativos", detalhe: projetos[0]?.nome ?? "Nenhum projeto publicado até o momento." },
        { titulo: "Campanhas públicas", detalhe: `${formatarValor(campanhasResumo.total)} campanha(s), ${formatarMoeda(campanhasResumo.arrecadado)} arrecadados.` },
        { titulo: "Saldo disponível", detalhe: `${formatarMoeda(prestacao.saldo_disponivel)} em saldo informado na prestação.` }
      ],
      itens: projetos.map((projeto) => ({
        id: bigintToString(projeto.id),
        titulo: projeto.nome,
        subtitulo: projeto.publico_alvo ?? "Projeto institucional",
        status: projeto.status ?? "ATIVO",
        percentual: Number(projeto.percentual ?? 0)
      }))
    };
  }

  private async acessarVoluntario(identificador: string): Promise<PortalPainel> {
    const cpf = somenteDigitos(identificador);
    const email = normalizarEmail(identificador);
    const rows = await prisma.$queryRaw<
      Array<{
        id: bigint;
        tenant_id: string | null;
        nome_completo: string;
        cpf: string | null;
        email: string | null;
        telefone: string | null;
        area_interesse: string | null;
        habilidades: string | null;
        status: string | null;
        disponibilidade_dias: string | null;
        carga_horaria_semanal: string | null;
      }>
    >(Prisma.sql`
      SELECT id, tenant_id::text AS tenant_id, nome_completo, cpf, email, telefone, area_interesse, habilidades, status, disponibilidade_dias, carga_horaria_semanal
      FROM cadastro_voluntario v
      WHERE COALESCE(v.status, 'ATIVO') <> 'INATIVO'
        AND (
          ${cpf || ""} <> '' AND REGEXP_REPLACE(COALESCE(v.cpf, ''), '\\D', '', 'g') = ${cpf}
          OR ${email} <> '' AND LOWER(COALESCE(v.email, '')) = ${email}
        )
      ORDER BY atualizado_em DESC, id DESC
      LIMIT 1
    `);

    const voluntario = rows[0];
    if (!voluntario) throw new AppError("Voluntario nao encontrado para os dados informados.", 404);

    return {
      tipo: "voluntario",
      token: montarToken("voluntario", bigintToString(voluntario.id), voluntario.tenant_id ?? undefined),
      pessoa: {
        id: bigintToString(voluntario.id),
        nome: voluntario.nome_completo,
        documento: voluntario.cpf ?? undefined,
        email: voluntario.email ?? undefined,
        telefone: voluntario.telefone ?? undefined,
        tenantId: voluntario.tenant_id ?? undefined
      },
      indicadores: [
        { label: "Horas registradas", valor: voluntario.carga_horaria_semanal ?? "0h" },
        { label: "Escalas futuras", valor: "0" },
        { label: "Certificados", valor: voluntario.status === "ATIVO" ? "1" : "0" }
      ],
      cards: [
        { titulo: "Oportunidades disponíveis", texto: voluntario.area_interesse ?? "Área de interesse ainda não informada." },
        { titulo: "Escalas e check-in", texto: voluntario.disponibilidade_dias ?? "Disponibilidade ainda não informada." },
        { titulo: "Certificados e termos", texto: voluntario.habilidades ?? "Histórico pronto para receber certificados reais." }
      ],
      linhaDoTempo: [
        { titulo: "Cadastro localizado", detalhe: `Status atual: ${voluntario.status ?? "ATIVO"}.` },
        { titulo: "Disponibilidade", detalhe: voluntario.disponibilidade_dias ?? "Sem disponibilidade registrada." },
        { titulo: "Próximo passo", detalhe: "Escalas e certificados serão exibidos conforme registros do módulo de voluntariado." }
      ],
      itens: []
    };
  }

  private async acessarBeneficiarioFamilia(identificador: string, senha: string): Promise<PortalPainel> {
    const documento = somenteDigitos(identificador);
    if (documento.length !== 11) {
      throw new AppError("Informe um CPF valido para acessar o portal.", 400);
    }

    const beneficiario = await obterBeneficiarioPortalPorCpf(documento);
    if (!beneficiario) {
      throw new AppError("Beneficiario nao encontrado para os dados informados.", 404);
    }

    if (!beneficiario.senha_hash) {
      throw new AppError("Senha do portal nao cadastrada para este beneficiario.", 404);
    }

    const senhaValida = await bcrypt.compare(senha, beneficiario.senha_hash);
    if (!senhaValida) {
      throw new AppError("CPF ou senha invalidos para acessar o portal.", 401);
    }

    const tenantId = beneficiario.tenant_id;
    if (!tenantId) {
      throw new AppError("Tenant do beneficiario nao identificado.", 404);
    }
    const visaoGeral = await centralAtendimentosRepository.obterVisaoGeral(
      beneficiario.beneficiario_id,
      tenantId
    );
    const [agendamentos, documentosPendentes] = await Promise.all([
      this.listarAgendamentosPortal(beneficiario.beneficiario_id, beneficiario.familia_id, tenantId),
      this.listarDocumentosPendentesPortal(beneficiario.beneficiario_id, tenantId)
    ]);
    const atendimentos = visaoGeral.atendimentos;
    const beneficios = visaoGeral.beneficios.map((item) => ({
      ...item,
      data: item.data ?? ""
    })) as BeneficioPortal[];
    const movimentacoes = visaoGeral.historico;

    return {
      tipo: "beneficiario",
      token: montarToken("beneficiario", bigintToString(beneficiario.beneficiario_id), tenantId),
      tema: (await parametrosSistemaService.obterPersonalizacao(tenantId)).personalizacao,
      pessoa: {
        id: bigintToString(beneficiario.beneficiario_id),
        nome: beneficiario.nome_completo,
        documento: beneficiario.cpf ?? undefined,
        email: beneficiario.email ?? undefined,
        telefone: beneficiario.telefone ?? undefined,
        tenantId
      },
      indicadores: [
        { label: "Atendimentos", valor: formatarValor(atendimentos.length) },
        { label: "Agendamentos", valor: formatarValor(agendamentos.length) },
        { label: "Documentos pendentes", valor: formatarValor(documentosPendentes.length) }
      ],
      cards: [
        { titulo: "Agenda da família", texto: `${formatarValor(agendamentos.length)} compromisso(s) localizado(s) no histórico completo.` },
        { titulo: "Histórico de atendimento", texto: `${formatarValor(atendimentos.length)} atendimento(s) registrado(s) na central.` },
        { titulo: "Documentos e avisos", texto: `${formatarValor(documentosPendentes.length)} documento(s) obrigatório(s) pendente(s).` }
      ],
      linhaDoTempo: [
        { titulo: "Cadastro familiar", detalhe: beneficiario.nome_familia ?? "Família ainda não vinculada." },
        { titulo: "Acompanhamento ativo", detalhe: `Beneficiário: ${beneficiario.nome_completo}.` },
        { titulo: "Agenda compartilhada", detalhe: "Compromissos aparecem conforme registros de agendamento." }
      ],
      atendimentos,
      beneficios,
      agendamentos,
      documentosPendentes,
      movimentacoes,
      itens: []
    };
  }

  private async listarAgendamentosPortal(
    beneficiarioId: bigint,
    familiaId: bigint | null,
    tenantId: string
  ): Promise<AgendamentoPortal[]> {
    const rows = await prisma.$queryRaw<
      Array<{
        id: bigint;
        data_agendamento: Date | string;
        hora_inicial: string;
        hora_final: string | null;
        tipo_atendimento: string | null;
        setor: string | null;
        profissional_nome: string | null;
        sala: string | null;
        status: string | null;
        prioridade: string | null;
        modalidade: string | null;
        observacao_curta: string | null;
        documentos_pendentes: boolean | null;
      }>
    >(Prisma.sql`
      SELECT
        a.id,
        a.data_agendamento,
        a.hora_inicial,
        a.hora_final,
        a.tipo_atendimento,
        a.setor,
        a.profissional_nome,
        a.sala,
        a.status,
        a.prioridade,
        a.modalidade,
        a.observacao_curta,
        a.documentos_pendentes
      FROM agendamento a
      WHERE a.tenant_id::text = ${tenantId}
        AND (
          a.beneficiario_id = ${beneficiarioId}
          OR (${familiaId ? Prisma.sql`${familiaId}` : Prisma.sql`NULL`} IS NOT NULL AND a.familia_id = ${familiaId})
        )
      ORDER BY a.data_agendamento DESC, a.hora_inicial DESC, a.id DESC
    `);

    return rows.map((row) => ({
      id: bigintToString(row.id),
      data: row.data_agendamento instanceof Date
        ? row.data_agendamento.toISOString().slice(0, 10)
        : String(row.data_agendamento).slice(0, 10),
      horaInicial: String(row.hora_inicial ?? ""),
      horaFinal: row.hora_final ? String(row.hora_final).slice(0, 5) : undefined,
      tipoAtendimento: row.tipo_atendimento ? String(row.tipo_atendimento) : undefined,
      setor: row.setor ? String(row.setor) : undefined,
      profissionalNome: row.profissional_nome ? String(row.profissional_nome) : undefined,
      sala: row.sala ? String(row.sala) : undefined,
      status: row.status ? String(row.status) : undefined,
      prioridade: row.prioridade ? String(row.prioridade) : undefined,
      modalidade: row.modalidade ? String(row.modalidade) : undefined,
      observacaoCurta: row.observacao_curta ? String(row.observacao_curta) : undefined,
      documentosPendentes: row.documentos_pendentes ?? undefined
    }));
  }

  private async listarDocumentosPendentesPortal(
    beneficiarioId: bigint,
    tenantId: string
  ): Promise<DocumentoPendentePortal[]> {
    const rows = await prisma.$queryRaw<
      Array<{
        id: bigint;
        nome_documento: string | null;
        tipo_documento: string | null;
        numero_documento: string | null;
        obrigatorio: boolean | null;
        caminho_arquivo: string | null;
        content_type: string | null;
      }>
    >(Prisma.sql`
      SELECT
        d.id,
        d.nome_documento,
        d.tipo_documento,
        d.numero_documento,
        d.obrigatorio,
        d.caminho_arquivo,
        d.content_type
      FROM documentos d
      WHERE d.beneficiario_id = ${beneficiarioId}
        AND d.tenant_id::text = ${tenantId}
        AND COALESCE(d.obrigatorio, FALSE) = TRUE
        AND COALESCE(d.ignorado, FALSE) = FALSE
        AND (d.caminho_arquivo IS NULL OR TRIM(d.caminho_arquivo) = '')
      ORDER BY d.id DESC
    `);

    return rows.map((row) => ({
      id: bigintToString(row.id),
      nome: row.nome_documento ?? row.tipo_documento ?? "Documento",
      tipo: row.tipo_documento ?? undefined,
      numeroDocumento: row.numero_documento ?? undefined,
      obrigatorio: row.obrigatorio ?? true,
      caminhoArquivo: row.caminho_arquivo ?? undefined,
      contentType: row.content_type ?? undefined
    }));
  }

  private async acessarParceiro(identificador: string): Promise<PortalPainel> {
    const termo = `%${identificador}%`;
    const projetos = await prisma.$queryRaw<
      Array<{ id: bigint; tenant_id: string | null; nome: string; status: string | null; fonte_recurso: string | null; percentual: unknown; responsavel: string | null }>
    >(Prisma.sql`
      SELECT
        p.id,
        p.tenant_id::text AS tenant_id,
        p.nome,
        p.status,
        p.fonte_recurso,
        p.responsavel,
        CASE
          WHEN COUNT(t.id) = 0 AND p.status = 'CONCLUIDO' THEN 100
          WHEN COUNT(t.id) = 0 THEN 0
          ELSE ROUND((COUNT(t.id) FILTER (WHERE t.status = 'CONCLUIDO')::numeric / NULLIF(COUNT(t.id), 0)::numeric) * 100, 0)
        END AS percentual
      FROM projetos p
      LEFT JOIN projeto_tarefas t ON t.projeto_id = p.id AND t.tenant_id = p.tenant_id
      WHERE COALESCE(p.ativo, TRUE) = TRUE
        AND (
          COALESCE(p.fonte_recurso, '') ILIKE ${termo}
          OR COALESCE(p.responsavel, '') ILIKE ${termo}
          OR COALESCE(p.nome, '') ILIKE ${termo}
        )
      GROUP BY p.id, p.tenant_id, p.nome, p.status, p.fonte_recurso, p.responsavel
      ORDER BY p.updated_at DESC, p.id DESC
      LIMIT 12
    `);

    if (!projetos.length) throw new AppError("Nenhum projeto de parceiro encontrado para os dados informados.", 404);

    const tenantId = projetos[0]?.tenant_id ?? undefined;
    const media = projetos.reduce((total, item) => total + Number(item.percentual ?? 0), 0) / projetos.length;

    return {
      tipo: "parceiro",
      token: montarToken("parceiro", identificador, tenantId),
      pessoa: {
        nome: identificador,
        email: identificador.includes("@") ? identificador : undefined,
        tenantId
      },
      indicadores: [
        { label: "Projetos apoiados", valor: formatarValor(projetos.length) },
        { label: "Metas acompanhadas", valor: formatarValor(projetos.length) },
        { label: "Relatórios disponíveis", valor: formatarValor(projetos.filter((item) => item.status === "CONCLUIDO").length) }
      ],
      cards: [
        { titulo: "Projetos financiados", texto: `${projetos.length} projeto(s) relacionado(s) ao parceiro.` },
        { titulo: "Relatórios e documentos", texto: `${formatarValor(media)}% de evolução média dos projetos localizados.` },
        { titulo: "Comunicação com a equipe", texto: `Responsável principal: ${projetos[0]?.responsavel ?? "não informado"}.` }
      ],
      linhaDoTempo: projetos.slice(0, 3).map((projeto) => ({
        titulo: projeto.nome,
        detalhe: `${projeto.status ?? "ATIVO"} • ${formatarValor(projeto.percentual)}% de evolução.`
      })),
      itens: projetos.map((projeto) => ({
        id: bigintToString(projeto.id),
        titulo: projeto.nome,
        subtitulo: projeto.fonte_recurso ?? "Fonte de recurso não informada",
        status: projeto.status ?? "ATIVO",
        percentual: Number(projeto.percentual ?? 0)
      }))
    };
  }
}
