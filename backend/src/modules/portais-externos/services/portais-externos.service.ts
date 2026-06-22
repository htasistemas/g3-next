import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../../../database/prisma.js";
import { AppError } from "../../../shared/errors/app-error.js";

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

type PortalPainel = {
  tipo: PortalTipo;
  token?: string;
  pessoa?: {
    id?: string;
    nome?: string;
    documento?: string;
    email?: string;
    telefone?: string;
    tenantId?: string;
  };
  indicadores: IndicadorPortal[];
  cards: CardPortal[];
  linhaDoTempo: TimelinePortal[];
  itens: Array<Record<string, unknown>>;
};

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
    if (tipo === "beneficiario") return this.acessarBeneficiarioFamilia(identificador);
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

  private async acessarBeneficiarioFamilia(identificador: string): Promise<PortalPainel> {
    const documento = somenteDigitos(identificador);
    const termo = normalizarTexto(identificador);
    const rows = await prisma.$queryRaw<
      Array<{
        beneficiario_id: bigint;
        tenant_id: string | null;
        nome_completo: string;
        codigo: string | null;
        cpf: string | null;
        telefone: string | null;
        email: string | null;
        familia_id: bigint | null;
        nome_familia: string | null;
      }>
    >(Prisma.sql`
      SELECT
        b.id AS beneficiario_id,
        b.tenant_id::text AS tenant_id,
        b.nome_completo,
        b.codigo,
        doc.numero_documento AS cpf,
        contato.telefone_principal AS telefone,
        contato.email,
        vf.id AS familia_id,
        vf.nome_familia
      FROM cadastro_beneficiario b
      LEFT JOIN documentos doc ON doc.beneficiario_id = b.id AND UPPER(COALESCE(doc.tipo_documento, '')) = 'CPF'
      LEFT JOIN contato_beneficiario contato ON contato.beneficiario_id = b.id
      LEFT JOIN vinculo_familiar_membro m ON m.beneficiario_id = b.id
      LEFT JOIN vinculo_familiar vf ON vf.id = m.vinculo_familiar_id
      WHERE COALESCE(b.status, 'ATIVO') <> 'INATIVO'
        AND (
          ${documento} <> '' AND REGEXP_REPLACE(COALESCE(doc.numero_documento, ''), '\\D', '', 'g') = ${documento}
          OR LOWER(COALESCE(b.codigo, '')) = LOWER(${termo})
          OR LOWER(COALESCE(vf.nome_familia, '')) = LOWER(${termo})
          OR vf.id::text = ${termo}
        )
      ORDER BY b.atualizado_em DESC, b.id DESC
      LIMIT 1
    `);

    const beneficiario = rows[0];
    if (!beneficiario) throw new AppError("Beneficiario ou familia nao encontrados para os dados informados.", 404);

    const tenantId = beneficiario.tenant_id ?? undefined;
    const [agendamentos, documentosPendentes, atendimentos] = await Promise.all([
      prisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`
        SELECT COUNT(*)::bigint AS total
        FROM agendamento a
        WHERE a.tenant_id::text = ${tenantId}
          AND (
            a.beneficiario_id = ${beneficiario.beneficiario_id}
            OR a.familia_id = ${beneficiario.familia_id}
          )
          AND a.data_agendamento >= CURRENT_DATE
      `).catch(() => [{ total: 0n }]),
      prisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`
        SELECT COUNT(*)::bigint AS total
        FROM documentos d
        WHERE d.beneficiario_id = ${beneficiario.beneficiario_id}
          AND COALESCE(d.obrigatorio, FALSE) = TRUE
          AND (d.caminho_arquivo IS NULL OR TRIM(d.caminho_arquivo) = '')
      `).catch(() => [{ total: 0n }]),
      prisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`
        SELECT COUNT(*)::bigint AS total
        FROM central_atendimento a
        WHERE a.tenant_id::text = ${tenantId}
          AND a.beneficiario_id = ${beneficiario.beneficiario_id}
      `).catch(() => [{ total: 0n }])
    ]);

    return {
      tipo: "beneficiario",
      token: montarToken("beneficiario", bigintToString(beneficiario.beneficiario_id), tenantId),
      pessoa: {
        id: bigintToString(beneficiario.beneficiario_id),
        nome: beneficiario.nome_completo,
        documento: beneficiario.cpf ?? undefined,
        email: beneficiario.email ?? undefined,
        telefone: beneficiario.telefone ?? undefined,
        tenantId
      },
      indicadores: [
        { label: "Atendimentos", valor: formatarValor(atendimentos[0]?.total ?? 0) },
        { label: "Agendamentos", valor: formatarValor(agendamentos[0]?.total ?? 0) },
        { label: "Documentos pendentes", valor: formatarValor(documentosPendentes[0]?.total ?? 0) }
      ],
      cards: [
        { titulo: "Agenda da família", texto: `${formatarValor(agendamentos[0]?.total ?? 0)} compromisso(s) futuro(s) localizado(s).` },
        { titulo: "Histórico de atendimento", texto: `${formatarValor(atendimentos[0]?.total ?? 0)} atendimento(s) registrado(s) na central.` },
        { titulo: "Documentos e avisos", texto: `${formatarValor(documentosPendentes[0]?.total ?? 0)} documento(s) obrigatório(s) pendente(s).` }
      ],
      linhaDoTempo: [
        { titulo: "Cadastro familiar", detalhe: beneficiario.nome_familia ?? "Família ainda não vinculada." },
        { titulo: "Acompanhamento ativo", detalhe: `Beneficiário: ${beneficiario.nome_completo}.` },
        { titulo: "Agenda compartilhada", detalhe: "Compromissos aparecem conforme registros de agendamento." }
      ],
      itens: []
    };
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
